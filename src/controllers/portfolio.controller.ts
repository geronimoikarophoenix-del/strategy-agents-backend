import { Request, Response, NextFunction } from 'express';
import PortfolioService from '../services/portfolio.service';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

/**
 * Portfolio Controller
 * Handles HTTP requests for portfolio endpoints
 */

export class PortfolioController {
  /**
   * POST /api/portfolios
   * Create new portfolio
   */
  static async createPortfolio(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const { name, description, overall_risk_level, tier } = req.body;

      if (!name) {
        throw new AppError('Portfolio name is required', 400);
      }

      const portfolio = await PortfolioService.createPortfolio(
        userId,
        name,
        description,
        overall_risk_level,
        tier || 'free'
      );

      res.status(201).json({
        success: true,
        data: { portfolio }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/portfolios
   * Get all portfolios for user
   */
  static async getUserPortfolios(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;

      const portfolios = await PortfolioService.getPortfoliosByUser(userId);

      res.status(200).json({
        success: true,
        data: { portfolios }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/portfolios/:id
   * Get single portfolio
   */
  static async getPortfolio(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const { id } = req.params;

      const portfolio = await PortfolioService.getPortfolioById(id, userId);

      res.status(200).json({
        success: true,
        data: { portfolio }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/portfolios/:id
   * Update portfolio
   */
  static async updatePortfolio(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const { id } = req.params;

      const portfolio = await PortfolioService.updatePortfolio(id, userId, req.body);

      res.status(200).json({
        success: true,
        data: { portfolio }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/portfolios/:id
   * Delete portfolio
   */
  static async deletePortfolio(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const { id } = req.params;

      await PortfolioService.deletePortfolio(id, userId);

      res.status(200).json({
        success: true,
        message: 'Portfolio deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}

export default PortfolioController;
