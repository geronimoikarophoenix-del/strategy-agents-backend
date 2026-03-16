import { Request, Response, NextFunction } from 'express';
import NotificationService from '../services/notification.service';
import DeliveryService from '../services/delivery.service';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

/**
 * Notification Controller
 * Handles HTTP requests for notification endpoints
 */

export class NotificationController {
  /**
   * GET /api/notifications/preferences
   * Get user notification preferences
   */
  static async getPreferences(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;

      const preferences = await NotificationService.getPreferences(userId);

      res.status(200).json({
        success: true,
        data: { preferences }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/notifications/preferences
   * Update notification preferences
   */
  static async updatePreferences(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;

      const preferences = await NotificationService.updatePreferences(userId, req.body);

      res.status(200).json({
        success: true,
        data: { preferences }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/notifications
   * Get user notifications (inbox)
   */
  static async getNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
      const unreadOnly = req.query.unread === 'true';

      const notifications = await NotificationService.getNotifications(
        userId,
        limit,
        unreadOnly
      );

      res.status(200).json({
        success: true,
        data: { notifications, count: notifications.length }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/notifications/:notification_id/read
   * Mark notification as read
   */
  static async markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const { notification_id } = req.params;

      const notification = await NotificationService.markAsRead(notification_id, userId);

      res.status(200).json({
        success: true,
        data: { notification }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/notifications/test
   * Send test notification to verify settings
   */
  static async sendTest(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const { channel } = req.body;

      if (!channel || !['telegram', 'email', 'all'].includes(channel)) {
        throw new AppError('Channel must be "telegram", "email", or "all"', 400);
      }

      const result = await DeliveryService.sendTest(userId, channel);

      res.status(200).json({
        success: result.success,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/notifications/telegram/connect
   * Connect Telegram chat ID (callback from Telegram bot)
   */
  static async connectTelegram(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const { chat_id } = req.body;

      if (!chat_id) {
        throw new AppError('chat_id is required', 400);
      }

      const preferences = await NotificationService.updatePreferences(userId, {
        telegram_chat_id: chat_id.toString(),
        telegram_enabled: true
      } as any);

      // Send confirmation
      logger.info(`Telegram connected for user ${userId}`);

      res.status(200).json({
        success: true,
        data: { preferences }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/notifications/telegram/disconnect
   * Disconnect Telegram
   */
  static async disconnectTelegram(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;

      const preferences = await NotificationService.updatePreferences(userId, {
        telegram_enabled: false
      } as any);

      logger.info(`Telegram disconnected for user ${userId}`);

      res.status(200).json({
        success: true,
        data: { preferences }
      });
    } catch (error) {
      next(error);
    }
  }
}

export default NotificationController;
