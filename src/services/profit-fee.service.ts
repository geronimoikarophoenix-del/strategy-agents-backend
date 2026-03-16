import { query } from '../config/database';
import { WALLETS } from '../config/wallets';
import { logger } from '../utils/logger';

/**
 * Profit Fee Service
 * 
 * Handles 1% profit sharing for FREE tier users
 * Only charges on profitable trades, no fee on losses
 */

export class ProfitFeeService {
  /**
   * Calculate and record profit fee for a trade
   * Only applies to FREE tier users
   */
  static async recordProfitFee(
    portfolioId: string,
    tradeId: string,
    userId: string,
    tier: string,
    tradeProfit: number
  ) {
    // Only charge 1% on free tier, only on profits
    if (tier !== 'free' || tradeProfit <= 0) {
      return null;
    }

    const feePercent = WALLETS.MONETIZATION[tier as keyof typeof WALLETS.MONETIZATION]?.profit_fee_percent || 0;
    const feeAmount = tradeProfit * (feePercent / 100);
    const userNetProfit = tradeProfit - feeAmount;

    try {
      const result = await query(
        `INSERT INTO profit_fees (
          portfolio_id, trade_id, user_id, tier,
          trade_profit, fee_percent, fee_amount, user_net_profit,
          fee_wallet_address, payment_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          portfolioId, tradeId, userId, tier,
          tradeProfit, feePercent, feeAmount, userNetProfit,
          WALLETS.IKARO_PROFIT_WALLET, 'pending'
        ]
      );

      logger.info(`Profit fee recorded: ${feeAmount} SOL from trade ${tradeId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error recording profit fee', error);
      throw error;
    }
  }

  /**
   * Get pending profit fees (not yet paid)
   */
  static async getPendingFees(limit: number = 100) {
    try {
      const result = await query(
        `SELECT * FROM profit_fees 
         WHERE payment_status = 'pending'
         ORDER BY created_at ASC
         LIMIT $1`,
        [limit]
      );
      return result.rows;
    } catch (error) {
      logger.error('Error fetching pending fees', error);
      throw error;
    }
  }

  /**
   * Mark fee as paid (after Solana confirmation)
   */
  static async markFeeAsPaid(feeId: string, txnHash: string) {
    try {
      const result = await query(
        `UPDATE profit_fees 
         SET payment_status = 'paid',
             payment_txn_hash = $1,
             paid_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING *`,
        [txnHash, feeId]
      );

      logger.info(`Profit fee marked as paid: ${feeId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error marking fee as paid', error);
      throw error;
    }
  }

  /**
   * Get total fees earned (for dashboard)
   */
  static async getTotalFeesEarned() {
    try {
      const result = await query(
        `SELECT 
          COUNT(*) as total_fees,
          SUM(fee_amount) as total_earned,
          SUM(CASE WHEN payment_status = 'paid' THEN fee_amount ELSE 0 END) as total_paid,
          SUM(CASE WHEN payment_status = 'pending' THEN fee_amount ELSE 0 END) as total_pending
         FROM profit_fees`
      );
      return result.rows[0];
    } catch (error) {
      logger.error('Error fetching total fees', error);
      throw error;
    }
  }
}

export default ProfitFeeService;
