import { Request, Response, NextFunction } from 'express';
import SignalService from '../services/signal.service';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

/**
 * Signal Controller
 * Handles HTTP requests for signal endpoints
 * No trade execution - signal-only, user-custodied model
 */

export class SignalController {
  /**
   * POST /api/portfolios/:portfolio_id/signals
   * Generate new signal (typically called by scanner cron/monitoring service)
   */
  static async generateSignal(req: Request, res: Response, next: NextFunction) {
    try {
      const { portfolio_id } = req.params;
      const {
        agent_id,
        agent_type,
        token_address,
        token_symbol,
        signal_type,
        confidence,
        entry_price,
        stop_loss,
        take_profit,
        position_size_usd,
        reasoning,
        market_data,
        expires_at
      } = req.body;

      // Validate required fields
      if (!agent_id || !agent_type || !token_address || !token_symbol) {
        throw new AppError('Missing required fields: agent_id, agent_type, token_address, token_symbol', 400);
      }

      if (!['buy', 'sell', 'close'].includes(signal_type)) {
        throw new AppError('Invalid signal_type. Must be "buy", "sell", or "close"', 400);
      }

      const signal = await SignalService.generateSignal(
        portfolio_id,
        agent_id,
        agent_type,
        token_address,
        token_symbol,
        {
          signalType: signal_type,
          confidence,
          entryPrice: entry_price,
          stopLoss: stop_loss,
          takeProfit: take_profit,
          positionSizeUsd: position_size_usd,
          reasoning,
          marketData: market_data,
          expiresAt: expires_at ? new Date(expires_at) : undefined
        }
      );

      res.status(201).json({
        success: true,
        data: { signal }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/portfolios/:portfolio_id/signals
   * Get all pending signals for portfolio
   */
  static async getPendingSignals(req: Request, res: Response, next: NextFunction) {
    try {
      const { portfolio_id } = req.params;

      const signals = await SignalService.getPendingSignals(portfolio_id);

      res.status(200).json({
        success: true,
        data: { signals, count: signals.length }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/portfolios/:portfolio_id/signals/:signal_id
   * Get single signal
   */
  static async getSignal(req: Request, res: Response, next: NextFunction) {
    try {
      const { portfolio_id, signal_id } = req.params;

      const signal = await SignalService.getSignal(signal_id, portfolio_id);

      res.status(200).json({
        success: true,
        data: { signal }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/agents/:agent_id/signals
   * Get signals by agent (can query with limit)
   */
  static async getAgentSignals(req: Request, res: Response, next: NextFunction) {
    try {
      const { agent_id } = req.params;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);

      const signals = await SignalService.getAgentSignals(agent_id, limit);

      res.status(200).json({
        success: true,
        data: { signals, count: signals.length }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/portfolios/:portfolio_id/signals/:signal_id/approve
   * User approves signal (for SCOUT mode)
   */
  static async approveSignal(req: Request, res: Response, next: NextFunction) {
    try {
      const { portfolio_id, signal_id } = req.params;

      const signal = await SignalService.approveSignal(signal_id, portfolio_id);

      res.status(200).json({
        success: true,
        data: { signal }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/portfolios/:portfolio_id/signals/:signal_id/reject
   * User rejects signal (for SCOUT mode)
   */
  static async rejectSignal(req: Request, res: Response, next: NextFunction) {
    try {
      const { portfolio_id, signal_id } = req.params;

      const signal = await SignalService.rejectSignal(signal_id, portfolio_id);

      res.status(200).json({
        success: true,
        data: { signal }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/portfolios/:portfolio_id/signals/:signal_id/executed
   * Mark signal as executed (user confirms they executed the trade)
   */
  static async markExecuted(req: Request, res: Response, next: NextFunction) {
    try {
      const { portfolio_id, signal_id } = req.params;
      const { trade_id } = req.body;

      const signal = await SignalService.markExecuted(signal_id, portfolio_id, trade_id);

      res.status(200).json({
        success: true,
        data: { signal }
      });
    } catch (error) {
      next(error);
    }
  }
}

export default SignalController;
