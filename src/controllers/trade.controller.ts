import { Request, Response, NextFunction } from 'express';
import TradeService from '../services/trade.service';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

/**
 * Trade Controller
 * Handles HTTP requests for trade endpoints
 */

export class TradeController {
  /**
   * POST /api/portfolios/:portfolio_id/trades
   * Record trade execution (user executed from signal)
   */
  static async createTrade(req: Request, res: Response, next: NextFunction) {
    try {
      const { portfolio_id } = req.params;
      const {
        signal_id,
        agent_id,
        token_address,
        token_symbol,
        entry_price,
        entry_amount_usd,
        stop_loss_price,
        take_profit_price,
        notes
      } = req.body;

      // Validate required fields
      if (!signal_id || !agent_id || !token_address || !token_symbol || !entry_price || !entry_amount_usd) {
        throw new AppError(
          'Missing required fields: signal_id, agent_id, token_address, token_symbol, entry_price, entry_amount_usd',
          400
        );
      }

      const trade = await TradeService.createTrade(
        portfolio_id,
        signal_id,
        agent_id,
        token_address,
        token_symbol,
        entry_price,
        entry_amount_usd,
        stop_loss_price,
        take_profit_price,
        notes
      );

      res.status(201).json({
        success: true,
        data: { trade }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/portfolios/:portfolio_id/trades
   * Get all trades for portfolio
   */
  static async getPortfolioTrades(req: Request, res: Response, next: NextFunction) {
    try {
      const { portfolio_id } = req.params;
      const status = req.query.status as 'open' | 'closed' | 'abandoned' | undefined;
      const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);

      const trades = await TradeService.getPortfolioTrades(portfolio_id, status, limit);

      res.status(200).json({
        success: true,
        data: { trades, count: trades.length }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/portfolios/:portfolio_id/trades/:trade_id
   * Get single trade details
   */
  static async getTrade(req: Request, res: Response, next: NextFunction) {
    try {
      const { portfolio_id, trade_id } = req.params;

      const trade = await TradeService.getTrade(trade_id, portfolio_id);

      res.status(200).json({
        success: true,
        data: { trade }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/portfolios/:portfolio_id/trades/:trade_id/close
   * Close trade with exit price
   */
  static async closeTrade(req: Request, res: Response, next: NextFunction) {
    try {
      const { portfolio_id, trade_id } = req.params;
      const { exit_price, exit_amount_usd } = req.body;

      if (!exit_price) {
        throw new AppError('exit_price is required', 400);
      }

      const trade = await TradeService.closeTrade(
        trade_id,
        portfolio_id,
        exit_price,
        exit_amount_usd
      );

      res.status(200).json({
        success: true,
        data: { trade }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/portfolios/:portfolio_id/trades/:trade_id/abandon
   * Abandon trade without recording exit
   */
  static async abandonTrade(req: Request, res: Response, next: NextFunction) {
    try {
      const { portfolio_id, trade_id } = req.params;

      const trade = await TradeService.abandonTrade(trade_id, portfolio_id);

      res.status(200).json({
        success: true,
        data: { trade }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/portfolios/:portfolio_id/trades/:trade_id/notes
   * Update trade notes
   */
  static async updateNotes(req: Request, res: Response, next: NextFunction) {
    try {
      const { portfolio_id, trade_id } = req.params;
      const { notes } = req.body;

      if (!notes) {
        throw new AppError('notes field is required', 400);
      }

      const trade = await TradeService.updateNotes(trade_id, portfolio_id, notes);

      res.status(200).json({
        success: true,
        data: { trade }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/portfolios/:portfolio_id/performance
   * Get portfolio performance summary
   */
  static async getPerformance(req: Request, res: Response, next: NextFunction) {
    try {
      const { portfolio_id } = req.params;

      const summary = await TradeService.getPerformanceSummary(portfolio_id);

      res.status(200).json({
        success: true,
        data: { summary }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/agents/:agent_id/stats
   * Get agent performance statistics
   */
  static async getAgentStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { agent_id } = req.params;

      const stats = await TradeService.getAgentStats(agent_id);

      res.status(200).json({
        success: true,
        data: { stats }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/portfolios/:portfolio_id/trades/:trade_id/check-triggers
   * Check if stop loss or take profit triggered
   */
  static async checkTriggers(req: Request, res: Response, next: NextFunction) {
    try {
      const { portfolio_id, trade_id } = req.params;
      const { current_price } = req.body;

      if (!current_price) {
        throw new AppError('current_price is required', 400);
      }

      const result = await TradeService.checkStopLossOrTakeProfit(trade_id, current_price);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}

export default TradeController;
