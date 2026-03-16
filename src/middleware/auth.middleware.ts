import { Request, Response, NextFunction } from 'express';
import AuthService from '../services/auth.service';
import { AppError } from './errorHandler';
import { logger } from '../utils/logger';

/**
 * Auth Middleware
 * Verifies JWT token and attaches user ID to request
 */

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Missing or invalid authorization header', 401);
    }

    const token = authHeader.slice(7); // Remove "Bearer " prefix

    // Verify token
    const decoded = AuthService.verifyToken(token);

    // Attach user ID to request
    (req as any).userId = decoded.id;
    (req as any).userEmail = decoded.email;

    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      logger.error('Auth middleware error', error);
      next(new AppError('Invalid token', 401));
    }
  }
};

/**
 * Optional Auth Middleware
 * Doesn't fail if token is missing, just attaches user ID if present
 */
export const optionalAuthMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const decoded = AuthService.verifyToken(token);
      (req as any).userId = decoded.id;
      (req as any).userEmail = decoded.email;
    }

    next();
  } catch (error) {
    // Ignore auth errors, just continue without user
    next();
  }
};

export default authMiddleware;
