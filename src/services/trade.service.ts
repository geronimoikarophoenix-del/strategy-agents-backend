import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import PortfolioService from './portfolio.service';
import ProfitFeeService from './profit-fee.service';

/**
 * Trade Service
 * Handles trade execution, status tracking, P&L calculation
 * Note: Platform does NOT execute trades - users do. This tracks outcomes.
 */

export interface Trade {
  id: string;
  portfolio_id: string;
  signal_id: string;
  agent_id: string;
  position_id?: string;
  token_address: string;
  token_symbol: string;
  entry_price: number;
  entry_amount_usd: number;
  entry_at: Date;
  exit_price?: number;
  exit_amount_usd?: number;
  exit_at?: Date;
  status: 'open' | 'closed' | 'abandoned';
  pnl?: number;
  pnl_percent?: number;
  stop_loss_price?: number;
  take_profit_price?: number;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export class TradeService {
  /**
   * Record trade execution (user executed trade from signal)
   */
  static async createTrade(
    portfolioId: string,
    signalId: string,
    agentId: string,
    tokenAddress: string,
    tokenSymbol: string,
    entryPrice: number,
    entryAmountUsd: number,
    stopLossPrice?: number,
    takeProfitPrice?: number,
    notes?: string
  ): Promise<Trade> {
    if (!portfolioId || !signalId || !agentId || !tokenAddress || !tokenSymbol) {
      throw new AppError('Missing required trade fields', 400);
    }

    if (entryPrice <= 0 || entryAmountUsd <= 0) {
      throw new AppError('Entry price and amount must be positive', 400);
    }

    try {
      const result = await query(
        `INSERT INTO trades (
          portfolio_id, signal_id, agent_id, token_address, token_symbol,
          entry_price, entry_amount_usd, entry_at, status,
          stop_loss_price, take_profit_price, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, $8, $9, $10, $11)
        RETURNING *`,
        [
          portfolioId, signalId, agentId, tokenAddress, tokenSymbol,
          entryPrice, entryAmountUsd, 'open',
          stopLossPrice || null, takeProfitPrice || null, notes || null
        ]
      );

      const trade = result.rows[0];
      logger.info(`Trade created: ${tokenSymbol} at $${entryPrice} (${entryAmountUsd})`);

      return trade;
    } catch (error) {
      logger.error('Error creating trade', error);
      throw new AppError('Failed to create trade', 500);
    }
  }

  /**
   * Get trade by ID
   */
  static async getTrade(tradeId: string, portfolioId: string): Promise<Trade> {
    try {
      const result = await query(
        'SELECT * FROM trades WHERE id = $1 AND portfolio_id = $2',
        [tradeId, portfolioId]
      );

      if (result.rows.length === 0) {
        throw new AppError('Trade not found', 404);
      }

      return result.rows[0];
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error fetching trade', error);
      throw new AppError('Failed to fetch trade', 500);
    }
  }

  /**
   * Get all trades for portfolio
   */
  static async getPortfolioTrades(
    portfolioId: string,
    status?: 'open' | 'closed' | 'abandoned',
    limit: number = 100
  ): Promise<Trade[]> {
    try {
      let query_str = 'SELECT * FROM trades WHERE portfolio_id = $1';
      const values: any[] = [portfolioId];
      let paramIndex = 2;

      if (status) {
        query_str += ` AND status = $${paramIndex}`;
        values.push(status);
        paramIndex++;
      }

      query_str += ' ORDER BY entry_at DESC LIMIT $' + paramIndex;
      values.push(Math.min(limit, 500));

      const result = await query(query_str, values);
      return result.rows;
    } catch (error) {
      logger.error('Error fetching portfolio trades', error);
      throw new AppError('Failed to fetch trades', 500);
    }
  }

  /**
   * Close trade with exit price (user closed position)
   */
  static async closeTrade(
    tradeId: string,
    portfolioId: string,
    exitPrice: number,
    exitAmountUsd?: number
  ): Promise<Trade> {
    if (exitPrice <= 0) {
      throw new AppError('Exit price must be positive', 400);
    }

    try {
      // Get the trade
      const trade = await this.getTrade(tradeId, portfolioId);

      if (trade.status === 'closed') {
        throw new AppError('Trade already closed', 409);
      }

      // Calculate P&L
      const finalExitAmountUsd = exitAmountUsd || trade.entry_amount_usd;
      const pnl = finalExitAmountUsd - trade.entry_amount_usd;
      const pnlPercent = (pnl / trade.entry_amount_usd) * 100;

      const result = await query(
        `UPDATE trades
         SET exit_price = $1, exit_amount_usd = $2, exit_at = CURRENT_TIMESTAMP,
             status = 'closed', pnl = $3, pnl_percent = $4, updated_at = CURRENT_TIMESTAMP
         WHERE id = $5 AND portfolio_id = $6
         RETURNING *`,
        [exitPrice, finalExitAmountUsd, pnl, pnlPercent, tradeId, portfolioId]
      );

      const closedTrade = result.rows[0];

      // Calculate profit fee if applicable (for free tier)
      if (pnl > 0) {
        // Note: In production, fetch actual user tier and userId from database
        // For now, we'll skip this as it requires additional context
        // await ProfitFeeService.recordProfitFee(portfolioId, tradeId, userId, tier, pnl);
      }

      logger.info(`Trade closed: ${trade.token_symbol} P&L: ${pnl.toFixed(2)} (${pnlPercent.toFixed(2)}%)`);

      return closedTrade;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error closing trade', error);
      throw new AppError('Failed to close trade', 500);
    }
  }

  /**
   * Abandon trade (user gave up, closing without recording exit)
   */
  static async abandonTrade(tradeId: string, portfolioId: string): Promise<Trade> {
    try {
      const result = await query(
        `UPDATE trades
         SET status = 'abandoned', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND portfolio_id = $2
         RETURNING *`,
        [tradeId, portfolioId]
      );

      if (result.rows.length === 0) {
        throw new AppError('Trade not found', 404);
      }

      logger.info(`Trade abandoned: ${tradeId}`);
      return result.rows[0];
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error abandoning trade', error);
      throw new AppError('Failed to abandon trade', 500);
    }
  }

  /**
   * Update trade notes
   */
  static async updateNotes(tradeId: string, portfolioId: string, notes: string): Promise<Trade> {
    try {
      const result = await query(
        `UPDATE trades
         SET notes = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 AND portfolio_id = $3
         RETURNING *`,
        [notes, tradeId, portfolioId]
      );

      if (result.rows.length === 0) {
        throw new AppError('Trade not found', 404);
      }

      return result.rows[0];
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error updating trade notes', error);
      throw new AppError('Failed to update notes', 500);
    }
  }

  /**
   * Get portfolio performance summary
   */
  static async getPerformanceSummary(portfolioId: string): Promise<{
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    abandonedTrades: number;
    winRate: number;
    totalPnL: number;
    averagePnLPercent: number;
    largestWin: number;
    largestLoss: number;
    avgWinSize: number;
    avgLossSize: number;
  }> {
    try {
      const result = await query(
        `SELECT
          COUNT(*) as total_trades,
          SUM(CASE WHEN status = 'closed' AND pnl > 0 THEN 1 ELSE 0 END) as winning_trades,
          SUM(CASE WHEN status = 'closed' AND pnl < 0 THEN 1 ELSE 0 END) as losing_trades,
          SUM(CASE WHEN status = 'abandoned' THEN 1 ELSE 0 END) as abandoned_trades,
          COALESCE(SUM(pnl), 0) as total_pnl,
          COALESCE(AVG(CASE WHEN status = 'closed' THEN pnl_percent ELSE NULL END), 0) as avg_pnl_percent,
          COALESCE(MAX(CASE WHEN pnl > 0 THEN pnl ELSE NULL END), 0) as largest_win,
          COALESCE(MIN(CASE WHEN pnl < 0 THEN pnl ELSE NULL END), 0) as largest_loss,
          COALESCE(AVG(CASE WHEN pnl > 0 THEN pnl ELSE NULL END), 0) as avg_win_size,
          COALESCE(AVG(CASE WHEN pnl < 0 THEN pnl ELSE NULL END), 0) as avg_loss_size
        FROM trades
        WHERE portfolio_id = $1 AND status = 'closed'`,
        [portfolioId]
      );

      const row = result.rows[0];
      const totalClosed = parseInt(row.total_trades) - parseInt(row.abandoned_trades);
      const winRate = totalClosed > 0 ? (parseInt(row.winning_trades) / totalClosed) * 100 : 0;

      return {
        totalTrades: parseInt(row.total_trades),
        winningTrades: parseInt(row.winning_trades) || 0,
        losingTrades: parseInt(row.losing_trades) || 0,
        abandonedTrades: parseInt(row.abandoned_trades) || 0,
        winRate: parseFloat(winRate.toFixed(2)),
        totalPnL: parseFloat(row.total_pnl),
        averagePnLPercent: parseFloat(row.avg_pnl_percent),
        largestWin: parseFloat(row.largest_win),
        largestLoss: parseFloat(row.largest_loss),
        avgWinSize: parseFloat(row.avg_win_size),
        avgLossSize: parseFloat(row.avg_loss_size)
      };
    } catch (error) {
      logger.error('Error calculating performance summary', error);
      throw new AppError('Failed to calculate performance', 500);
    }
  }

  /**
   * Get agent performance stats
   */
  static async getAgentStats(agentId: string): Promise<{
    totalSignals: number;
    executedTrades: number;
    winRate: number;
    totalPnL: number;
    avgPnLPercent: number;
    profitFactor: number;
  }> {
    try {
      const result = await query(
        `SELECT
          COUNT(DISTINCT s.id) as total_signals,
          COUNT(DISTINCT t.id) as executed_trades,
          SUM(CASE WHEN t.pnl > 0 THEN 1 ELSE 0 END) as winning_trades,
          COUNT(DISTINCT CASE WHEN t.status = 'closed' THEN t.id ELSE NULL END) as closed_trades,
          COALESCE(SUM(CASE WHEN t.pnl > 0 THEN t.pnl ELSE 0 END), 0) as gross_profit,
          COALESCE(SUM(CASE WHEN t.pnl < 0 THEN ABS(t.pnl) ELSE 0 END), 0) as gross_loss,
          COALESCE(AVG(t.pnl_percent), 0) as avg_pnl_percent,
          COALESCE(SUM(t.pnl), 0) as total_pnl
        FROM signals s
        LEFT JOIN trades t ON s.id = t.signal_id
        WHERE s.agent_id = $1`,
        [agentId]
      );

      const row = result.rows[0];
      const closedTrades = parseInt(row.closed_trades) || 0;
      const winningTrades = parseInt(row.winning_trades) || 0;
      const winRate = closedTrades > 0 ? (winningTrades / closedTrades) * 100 : 0;

      const grossProfit = parseFloat(row.gross_profit);
      const grossLoss = parseFloat(row.gross_loss);
      const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0;

      return {
        totalSignals: parseInt(row.total_signals) || 0,
        executedTrades: parseInt(row.executed_trades) || 0,
        winRate: parseFloat(winRate.toFixed(2)),
        totalPnL: parseFloat(row.total_pnl),
        avgPnLPercent: parseFloat(row.avg_pnl_percent),
        profitFactor: parseFloat(profitFactor.toFixed(2))
      };
    } catch (error) {
      logger.error('Error calculating agent stats', error);
      throw new AppError('Failed to calculate agent stats', 500);
    }
  }

  /**
   * Mark trade status by stop loss or take profit
   */
  static async checkStopLossOrTakeProfit(
    tradeId: string,
    currentPrice: number
  ): Promise<{ triggered: boolean; type?: 'stop_loss' | 'take_profit' }> {
    try {
      const result = await query(
        'SELECT stop_loss_price, take_profit_price FROM trades WHERE id = $1',
        [tradeId]
      );

      if (result.rows.length === 0) {
        return { triggered: false };
      }

      const trade = result.rows[0];

      if (trade.stop_loss_price && currentPrice <= trade.stop_loss_price) {
        return { triggered: true, type: 'stop_loss' };
      }

      if (trade.take_profit_price && currentPrice >= trade.take_profit_price) {
        return { triggered: true, type: 'take_profit' };
      }

      return { triggered: false };
    } catch (error) {
      logger.error('Error checking stop loss/take profit', error);
      return { triggered: false };
    }
  }
}

export default TradeService;
