import { Request, Response, NextFunction } from 'express';
import AuthService from '../services/auth.service';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

/**
 * Authentication Controller
 * Handles HTTP requests for auth endpoints
 */

export class AuthController {
  /**
   * POST /api/auth/register
   * Register new user
   */
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, username, password } = req.body;

      const authToken = await AuthService.register(
        email,
        username,
        password
      );

      res.status(201).json({
        success: true,
        data: {
          user: authToken.user,
          token: authToken.token,
          expiresIn: authToken.expiresIn
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/login
   * Login user
   */
  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        throw new AppError('Email and password are required', 400);
      }

      const authToken = await AuthService.login(email, password);

      res.status(200).json({
        success: true,
        data: {
          user: authToken.user,
          token: authToken.token,
          expiresIn: authToken.expiresIn
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/auth/me
   * Get current user (requires JWT)
   */
  static async getCurrentUser(req: Request, res: Response, next: NextFunction) {
    try {
      // User ID is set by auth middleware
      const userId = (req as any).userId;

      if (!userId) {
        throw new AppError('Unauthorized', 401);
      }

      const user = await AuthService.getUserById(userId);

      res.status(200).json({
        success: true,
        data: { user }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/logout
   * Logout user (frontend deletes token)
   */
  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      // Token is managed by frontend (localStorage, etc)
      // Backend just confirms logout
      res.status(200).json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}

export default AuthController;
