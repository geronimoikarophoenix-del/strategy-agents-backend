import { Request, Response, NextFunction } from 'express';
import AgentService from '../services/agent.service';
import PortfolioService from '../services/portfolio.service';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

/**
 * Agent Controller
 * Handles HTTP requests for agent endpoints
 */

export class AgentController {
  /**
   * POST /api/portfolios/:portfolio_id/agents
   * Configure new agent for portfolio
   */
  static async configureAgent(req: Request, res: Response, next: NextFunction) {
    try {
      const { portfolio_id } = req.params;
      const { agent_type } = req.body;

      if (!agent_type) {
        throw new AppError('Agent type is required', 400);
      }

      const agent = await AgentService.configureAgent(portfolio_id, agent_type);

      // Record signal for portfolio
      await PortfolioService.recordSignal(portfolio_id);

      res.status(201).json({
        success: true,
        data: { agent }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/portfolios/:portfolio_id/agents
   * Get all agents for portfolio
   */
  static async getPortfolioAgents(req: Request, res: Response, next: NextFunction) {
    try {
      const { portfolio_id } = req.params;

      const agents = await AgentService.getPortfolioAgents(portfolio_id);

      res.status(200).json({
        success: true,
        data: { agents }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/portfolios/:portfolio_id/agents/:agent_id
   * Get single agent
   */
  static async getAgent(req: Request, res: Response, next: NextFunction) {
    try {
      const { portfolio_id, agent_id } = req.params;

      const agent = await AgentService.getAgent(agent_id, portfolio_id);

      res.status(200).json({
        success: true,
        data: { agent }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/portfolios/:portfolio_id/agents/:agent_id/mode
   * Change agent mode (auto <-> scout)
   */
  static async changeMode(req: Request, res: Response, next: NextFunction) {
    try {
      const { portfolio_id, agent_id } = req.params;
      const { mode } = req.body;

      if (!mode) {
        throw new AppError('Mode is required', 400);
      }

      const agent = await AgentService.changeMode(agent_id, portfolio_id, mode);

      res.status(200).json({
        success: true,
        data: { agent }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/portfolios/:portfolio_id/agents/:agent_id/toggle
   * Enable/disable agent
   */
  static async toggleAgent(req: Request, res: Response, next: NextFunction) {
    try {
      const { portfolio_id, agent_id } = req.params;
      const { enabled } = req.body;

      if (typeof enabled !== 'boolean') {
        throw new AppError('Enabled flag is required and must be boolean', 400);
      }

      const agent = await AgentService.toggleAgent(agent_id, portfolio_id, enabled);

      res.status(200).json({
        success: true,
        data: { agent }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/portfolios/:portfolio_id/agents/:agent_id/settings
   * Update agent settings
   */
  static async updateSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const { portfolio_id, agent_id } = req.params;

      const agent = await AgentService.updateSettings(agent_id, portfolio_id, req.body);

      res.status(200).json({
        success: true,
        data: { agent }
      });
    } catch (error) {
      next(error);
    }
  }
}

export default AgentController;
