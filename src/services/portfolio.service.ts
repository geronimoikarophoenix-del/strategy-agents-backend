import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

/**
 * Portfolio Service
 * Handles portfolio CRUD operations, signal tracking, performance metrics
 */

export interface Portfolio {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  tier: string;
  overall_risk_level?: string;
  signals_sent_today: number;
  signals_sent_lifetime: number;
  signal_accuracy: number;
  daily_pnl: number;
  weekly_pnl: number;
  monthly_pnl: number;
  lifetime_pnl: number;
  win_rate: number;
  total_user_trades: number;
  is_active: boolean;
  is_trading: boolean;
  created_at: Date;
  updated_at: Date;
}

export class PortfolioService {
  /**
   * Create new portfolio
   */
  static async createPortfolio(
    userId: string,
    name: string,
    description?: string,
    riskLevel?: string,
    tier: string = 'free'
  ): Promise<Portfolio> {
    if (!userId || !name) {
      throw new AppError('User ID and portfolio name are required', 400);
    }

    try {
      // Check if portfolio name already exists for this user
      const existing = await query(
        'SELECT id FROM portfolios WHERE user_id = $1 AND name = $2',
        [userId, name]
      );

      if (existing.rows.length > 0) {
        throw new AppError('Portfolio with this name already exists', 409);
      }

      const result = await query(
        `INSERT INTO portfolios (
          user_id, name, description, tier, overall_risk_level,
          signals_sent_today, signals_sent_lifetime, signal_accuracy,
          daily_pnl, weekly_pnl, monthly_pnl, lifetime_pnl,
          win_rate, total_user_trades, is_active, is_trading
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *`,
        [
          userId, name, description || null, tier, riskLevel || null,
          0, 0, 0, // signals_sent_today, signals_sent_lifetime, signal_accuracy
          0, 0, 0, 0, // daily_pnl, weekly_pnl, monthly_pnl, lifetime_pnl
          0, 0, // win_rate, total_user_trades
          true, true // is_active, is_trading
        ]
      );

      logger.info(`Portfolio created: ${name} (${userId})`);
      return result.rows[0];
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error creating portfolio', error);
      throw new AppError('Failed to create portfolio', 500);
    }
  }

  /**
   * Get portfolio by ID
   */
  static async getPortfolioById(portfolioId: string, userId: string): Promise<Portfolio> {
    try {
      const result = await query(
        'SELECT * FROM portfolios WHERE id = $1 AND user_id = $2',
        [portfolioId, userId]
      );

      if (result.rows.length === 0) {
        throw new AppError('Portfolio not found', 404);
      }

      return result.rows[0];
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error fetching portfolio', error);
      throw new AppError('Failed to fetch portfolio', 500);
    }
  }

  /**
   * Get all portfolios for user
   */
  static async getPortfoliosByUser(userId: string): Promise<Portfolio[]> {
    try {
      const result = await query(
        'SELECT * FROM portfolios WHERE user_id = $1 ORDER BY created_at DESC',
        [userId]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error fetching user portfolios', error);
      throw new AppError('Failed to fetch portfolios', 500);
    }
  }

  /**
   * Update portfolio
   */
  static async updatePortfolio(
    portfolioId: string,
    userId: string,
    updates: Partial<Portfolio>
  ): Promise<Portfolio> {
    // Build dynamic UPDATE query
    const allowedFields = [
      'name', 'description', 'tier', 'overall_risk_level',
      'daily_pnl', 'weekly_pnl', 'monthly_pnl', 'lifetime_pnl',
      'win_rate', 'total_user_trades', 'is_active', 'is_trading'
    ];

    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = $${paramIndex}`);
        updateValues.push(value);
        paramIndex++;
      }
    }

    if (updateFields.length === 0) {
      throw new AppError('No valid fields to update', 400);
    }

    updateValues.push(portfolioId, userId);

    try {
      const query_str = `
        UPDATE portfolios
        SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
        RETURNING *
      `;

      const result = await query(query_str, updateValues);

      if (result.rows.length === 0) {
        throw new AppError('Portfolio not found', 404);
      }

      logger.info(`Portfolio updated: ${portfolioId}`);
      return result.rows[0];
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error updating portfolio', error);
      throw new AppError('Failed to update portfolio', 500);
    }
  }

  /**
   * Delete portfolio
   */
  static async deletePortfolio(portfolioId: string, userId: string): Promise<void> {
    try {
      const result = await query(
        'DELETE FROM portfolios WHERE id = $1 AND user_id = $2',
        [portfolioId, userId]
      );

      if (result.rowCount === 0) {
        throw new AppError('Portfolio not found', 404);
      }

      logger.info(`Portfolio deleted: ${portfolioId}`);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error deleting portfolio', error);
      throw new AppError('Failed to delete portfolio', 500);
    }
  }

  /**
   * Update portfolio P&L and performance metrics
   * Called after trades are executed
   */
  static async updatePerformanceMetrics(
    portfolioId: string,
    dailyPnL: number,
    weeklyPnL: number,
    monthlyPnL: number,
    lifetimePnL: number,
    winRate: number,
    totalTrades: number
  ): Promise<Portfolio> {
    try {
      const result = await query(
        `UPDATE portfolios
         SET daily_pnl = $1,
             weekly_pnl = $2,
             monthly_pnl = $3,
             lifetime_pnl = $4,
             win_rate = $5,
             total_user_trades = $6,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $7
         RETURNING *`,
        [dailyPnL, weeklyPnL, monthlyPnL, lifetimePnL, winRate, totalTrades, portfolioId]
      );

      if (result.rows.length === 0) {
        throw new AppError('Portfolio not found', 404);
      }

      return result.rows[0];
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error updating performance metrics', error);
      throw new AppError('Failed to update metrics', 500);
    }
  }

  /**
   * Increment signal metrics
   */
  static async recordSignal(
    portfolioId: string,
    accuracy: number | null = null
  ): Promise<void> {
    try {
      let updateQuery = `
        UPDATE portfolios
        SET signals_sent_today = signals_sent_today + 1,
            signals_sent_lifetime = signals_sent_lifetime + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `;

      const values = [portfolioId];

      if (accuracy !== null) {
        updateQuery = `
          UPDATE portfolios
          SET signals_sent_today = signals_sent_today + 1,
              signals_sent_lifetime = signals_sent_lifetime + 1,
              signal_accuracy = COALESCE(signal_accuracy, 0),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `;
      }

      await query(updateQuery, values);
      logger.info(`Signal recorded for portfolio: ${portfolioId}`);
    } catch (error) {
      logger.error('Error recording signal', error);
      throw new AppError('Failed to record signal', 500);
    }
  }

  /**
   * Reset daily metrics (called at midnight or manually)
   */
  static async resetDailyMetrics(portfolioId: string): Promise<void> {
    try {
      await query(
        `UPDATE portfolios
         SET signals_sent_today = 0,
             daily_pnl = 0,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [portfolioId]
      );

      logger.info(`Daily metrics reset for portfolio: ${portfolioId}`);
    } catch (error) {
      logger.error('Error resetting daily metrics', error);
      throw new AppError('Failed to reset metrics', 500);
    }
  }
}

export default PortfolioService;
