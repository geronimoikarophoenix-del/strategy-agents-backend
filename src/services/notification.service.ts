import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

/**
 * Notification Service
 * Manages user notification preferences and delivery channels
 */

export interface NotificationPreference {
  id: string;
  user_id: string;
  telegram_enabled: boolean;
  telegram_chat_id?: string;
  email_enabled: boolean;
  email_address: string;
  dashboard_enabled: boolean;
  notify_buy_signals: boolean;
  notify_sell_signals: boolean;
  notify_close_signals: boolean;
  min_confidence_threshold: number; // 0-1 (don't notify for low confidence)
  quiet_hours_enabled: boolean;
  quiet_hours_start?: string; // HH:MM format
  quiet_hours_end?: string;   // HH:MM format
  created_at: Date;
  updated_at: Date;
}

export interface Notification {
  id: string;
  user_id: string;
  signal_id: string;
  notification_type: 'buy' | 'sell' | 'close';
  channels_sent: ('telegram' | 'email' | 'dashboard')[];
  message_subject: string;
  message_body: string;
  telegram_message_id?: string;
  email_sent_at?: Date;
  telegram_sent_at?: Date;
  dashboard_sent_at?: Date;
  is_read: boolean;
  read_at?: Date;
  created_at: Date;
}

export class NotificationService {
  /**
   * Get user notification preferences
   */
  static async getPreferences(userId: string): Promise<NotificationPreference> {
    try {
      const result = await query(
        'SELECT * FROM notification_preferences WHERE user_id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        // Create default preferences if none exist
        return await this.createDefaultPreferences(userId);
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Error fetching notification preferences', error);
      throw new AppError('Failed to fetch preferences', 500);
    }
  }

  /**
   * Create default notification preferences
   */
  static async createDefaultPreferences(userId: string): Promise<NotificationPreference> {
    try {
      const result = await query(
        `INSERT INTO notification_preferences (
          user_id, telegram_enabled, email_enabled, dashboard_enabled,
          notify_buy_signals, notify_sell_signals, notify_close_signals,
          min_confidence_threshold, quiet_hours_enabled, email_address
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          userId,
          false, // telegram_enabled (user must connect first)
          true,  // email_enabled (default on)
          true,  // dashboard_enabled (default on)
          true,  // notify_buy_signals
          true,  // notify_sell_signals
          true,  // notify_close_signals
          0.5,   // min_confidence_threshold (only high confidence)
          false, // quiet_hours_enabled
          null   // email_address (set later by user)
        ]
      );

      logger.info(`Default notification preferences created for user ${userId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating notification preferences', error);
      throw new AppError('Failed to create preferences', 500);
    }
  }

  /**
   * Update notification preferences
   */
  static async updatePreferences(
    userId: string,
    updates: Partial<NotificationPreference>
  ): Promise<NotificationPreference> {
    const allowedFields = [
      'telegram_enabled', 'telegram_chat_id', 'email_enabled', 'email_address',
      'dashboard_enabled', 'notify_buy_signals', 'notify_sell_signals',
      'notify_close_signals', 'min_confidence_threshold',
      'quiet_hours_enabled', 'quiet_hours_start', 'quiet_hours_end'
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

    updateValues.push(userId);

    try {
      const query_str = `
        UPDATE notification_preferences
        SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $${paramIndex}
        RETURNING *
      `;

      const result = await query(query_str, updateValues);

      if (result.rows.length === 0) {
        throw new AppError('Preferences not found', 404);
      }

      logger.info(`Notification preferences updated for user ${userId}`);
      return result.rows[0];
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error updating notification preferences', error);
      throw new AppError('Failed to update preferences', 500);
    }
  }

  /**
   * Create notification record
   */
  static async createNotification(
    userId: string,
    signalId: string,
    notificationType: 'buy' | 'sell' | 'close',
    subject: string,
    body: string,
    channelsSent: ('telegram' | 'email' | 'dashboard')[] = []
  ): Promise<Notification> {
    try {
      const result = await query(
        `INSERT INTO notifications (
          user_id, signal_id, notification_type, channels_sent,
          message_subject, message_body, is_read
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [
          userId, signalId, notificationType,
          JSON.stringify(channelsSent),
          subject, body, false
        ]
      );

      logger.info(`Notification created: ${notificationType} for user ${userId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating notification', error);
      throw new AppError('Failed to create notification', 500);
    }
  }

  /**
   * Get user notifications
   */
  static async getNotifications(
    userId: string,
    limit: number = 50,
    unreadOnly: boolean = false
  ): Promise<Notification[]> {
    try {
      let query_str = 'SELECT * FROM notifications WHERE user_id = $1';
      const values: any[] = [userId];

      if (unreadOnly) {
        query_str += ' AND is_read = false';
      }

      query_str += ' ORDER BY created_at DESC LIMIT $2';
      values.push(Math.min(limit, 200));

      const result = await query(query_str, values);
      return result.rows;
    } catch (error) {
      logger.error('Error fetching notifications', error);
      throw new AppError('Failed to fetch notifications', 500);
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string, userId: string): Promise<Notification> {
    try {
      const result = await query(
        `UPDATE notifications
         SET is_read = true, read_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND user_id = $2
         RETURNING *`,
        [notificationId, userId]
      );

      if (result.rows.length === 0) {
        throw new AppError('Notification not found', 404);
      }

      return result.rows[0];
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error marking notification as read', error);
      throw new AppError('Failed to mark as read', 500);
    }
  }

  /**
   * Mark notification sent status (after delivery attempt)
   */
  static async updateDeliveryStatus(
    notificationId: string,
    channel: 'telegram' | 'email' | 'dashboard',
    success: boolean,
    messageId?: string
  ): Promise<void> {
    try {
      const columnMap = {
        telegram: 'telegram_sent_at',
        email: 'email_sent_at',
        dashboard: 'dashboard_sent_at'
      };

      const column = columnMap[channel];
      const updateQuery = success
        ? `UPDATE notifications SET ${column} = CURRENT_TIMESTAMP${messageId ? `, telegram_message_id = $2` : ''} WHERE id = $1`
        : `UPDATE notifications SET channels_sent = array_remove(channels_sent, $2) WHERE id = $1`;

      const params = messageId ? [notificationId, messageId] : [notificationId, channel];

      await query(updateQuery, params);
      logger.info(`Notification ${notificationId} delivery status updated (${channel})`);
    } catch (error) {
      logger.error('Error updating delivery status', error);
      throw new AppError('Failed to update delivery status', 500);
    }
  }

  /**
   * Check if notification should be sent based on preferences
   */
  static shouldNotify(
    preferences: NotificationPreference,
    signalType: 'buy' | 'sell' | 'close',
    confidence: number,
    currentHour?: number
  ): boolean {
    // Check signal type preference
    if (signalType === 'buy' && !preferences.notify_buy_signals) return false;
    if (signalType === 'sell' && !preferences.notify_sell_signals) return false;
    if (signalType === 'close' && !preferences.notify_close_signals) return false;

    // Check confidence threshold
    if (confidence < preferences.min_confidence_threshold) return false;

    // Check quiet hours
    if (preferences.quiet_hours_enabled && currentHour !== undefined) {
      const start = parseInt(preferences.quiet_hours_start?.split(':')[0] || '22');
      const end = parseInt(preferences.quiet_hours_end?.split(':')[0] || '8');

      if (start < end) {
        // Normal case (e.g., 10-17)
        if (currentHour >= start && currentHour < end) return false;
      } else {
        // Overnight case (e.g., 22-8)
        if (currentHour >= start || currentHour < end) return false;
      }
    }

    return true;
  }

  /**
   * Build notification message
   */
  static buildMessage(
    agentType: string,
    tokenSymbol: string,
    signalType: 'buy' | 'sell' | 'close',
    confidence: number,
    reasoning: string
  ): { subject: string; body: string } {
    const signalEmoji = signalType === 'buy' ? '🟢' : signalType === 'sell' ? '🔴' : '⚠️';
    const actionText = signalType === 'buy' ? 'BUY' : signalType === 'sell' ? 'SELL' : 'CLOSE';

    const subject = `${signalEmoji} ${agentType.replace(/_/g, ' ')} - ${actionText} $${tokenSymbol}`;

    const body = `
**Signal:** ${actionText} $${tokenSymbol}
**Agent:** ${agentType.replace(/_/g, ' ')}
**Confidence:** ${(confidence * 100).toFixed(0)}%

**Reasoning:**
${reasoning}

Review and execute on your connected wallet (Phantom, MetaMask, etc).
`.trim();

    return { subject, body };
  }
}

export default NotificationService;
