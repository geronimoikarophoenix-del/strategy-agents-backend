import { Router } from 'express';
import NotificationController from '../controllers/notification.controller';
import authMiddleware from '../middleware/auth.middleware';

const router = Router();

// All notification routes require authentication
router.use(authMiddleware);

// @route   GET /api/notifications/preferences
// @desc    Get user notification preferences
// @access  Private
router.get('/preferences', NotificationController.getPreferences);

// @route   PUT /api/notifications/preferences
// @desc    Update notification preferences
// @access  Private
router.put('/preferences', NotificationController.updatePreferences);

// @route   GET /api/notifications
// @desc    Get user notifications (inbox)
// @access  Private
router.get('/', NotificationController.getNotifications);

// @route   PUT /api/notifications/:notification_id/read
// @desc    Mark notification as read
// @access  Private
router.put('/:notification_id/read', NotificationController.markAsRead);

// @route   POST /api/notifications/test
// @desc    Send test notification
// @access  Private
router.post('/test', NotificationController.sendTest);

// @route   PUT /api/notifications/telegram/connect
// @desc    Connect Telegram
// @access  Private
router.put('/telegram/connect', NotificationController.connectTelegram);

// @route   PUT /api/notifications/telegram/disconnect
// @desc    Disconnect Telegram
// @access  Private
router.put('/telegram/disconnect', NotificationController.disconnectTelegram);

export default router;
