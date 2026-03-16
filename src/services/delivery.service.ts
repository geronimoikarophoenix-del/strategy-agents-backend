import NotificationService from './notification.service';
import TelegramService from './telegram.service';
import EmailService from './email.service';
import { logger } from '../utils/logger';

/**
 * Signal Delivery Service
 * Orchestrates multi-channel notification delivery
 */

export class DeliveryService {
  /**
   * Send signal to user via configured channels
   */
  static async sendSignal(
    userId: string,
    signalId: string,
    agentType: string,
    tokenSymbol: string,
    signalType: 'buy' | 'sell' | 'close',
    confidence: number,
    reasoning: string,
    signalData?: {
      entryPrice?: number;
      stopLoss?: number;
      takeProfit?: number;
      positionSizeUsd?: number;
    }
  ): Promise<{ success: boolean; channels: string[] }> {
    try {
      // Get user preferences
      const preferences = await NotificationService.getPreferences(userId);

      // Check if user wants this notification
      const currentHour = new Date().getHours();
      if (!NotificationService.shouldNotify(preferences, signalType, confidence, currentHour)) {
        logger.info(`Signal skipped for user ${userId}: preferences or quiet hours`);
        return { success: false, channels: [] };
      }

      // Build message
      const { subject, body } = NotificationService.buildMessage(
        agentType,
        tokenSymbol,
        signalType,
        confidence,
        reasoning
      );

      const channelsSent: string[] = [];

      // Send via Telegram
      if (preferences.telegram_enabled && preferences.telegram_chat_id) {
        const telegramResult = await this.sendViaTelegram(
          preferences.telegram_chat_id,
          agentType,
          tokenSymbol,
          signalType,
          confidence,
          reasoning,
          signalData
        );

        if (telegramResult.success) {
          channelsSent.push('telegram');
        }
      }

      // Send via Email
      if (preferences.email_enabled && preferences.email_address) {
        const emailResult = await this.sendViaEmail(
          preferences.email_address,
          agentType,
          tokenSymbol,
          signalType,
          confidence,
          reasoning,
          signalData
        );

        if (emailResult.success) {
          channelsSent.push('email');
        }
      }

      // Create notification record (always do this, even if channels fail)
      if (channelsSent.length > 0) {
        await NotificationService.createNotification(
          userId,
          signalId,
          signalType,
          subject,
          body,
          channelsSent as any
        );
      }

      // Dashboard notifications always succeed (stored in DB)
      if (preferences.dashboard_enabled) {
        await NotificationService.createNotification(
          userId,
          signalId,
          signalType,
          subject,
          body,
          ['dashboard']
        );
        channelsSent.push('dashboard');
      }

      logger.info(`Signal delivered to user ${userId} via ${channelsSent.join(', ')}`);
      return { success: channelsSent.length > 0, channels: channelsSent };
    } catch (error) {
      logger.error('Error sending signal', error);
      return { success: false, channels: [] };
    }
  }

  /**
   * Send via Telegram
   */
  private static async sendViaTelegram(
    chatId: string,
    agentType: string,
    tokenSymbol: string,
    signalType: 'buy' | 'sell' | 'close',
    confidence: number,
    reasoning: string,
    signalData?: any
  ): Promise<{ success: boolean }> {
    try {
      const message = TelegramService.formatSignalMessage({
        agentType,
        tokenSymbol,
        signalType,
        confidence,
        reasoning,
        entryPrice: signalData?.entryPrice,
        stopLoss: signalData?.stopLoss,
        takeProfit: signalData?.takeProfit,
        positionSizeUsd: signalData?.positionSizeUsd
      });

      const result = await TelegramService.sendMessage(chatId, message);
      return { success: result.success };
    } catch (error) {
      logger.error('Error sending Telegram message', error);
      return { success: false };
    }
  }

  /**
   * Send via Email
   */
  private static async sendViaEmail(
    email: string,
    agentType: string,
    tokenSymbol: string,
    signalType: 'buy' | 'sell' | 'close',
    confidence: number,
    reasoning: string,
    signalData?: any
  ): Promise<{ success: boolean }> {
    try {
      const result = await EmailService.sendSignalEmail(email, {
        agentType,
        tokenSymbol,
        signalType,
        confidence,
        reasoning,
        entryPrice: signalData?.entryPrice,
        stopLoss: signalData?.stopLoss,
        takeProfit: signalData?.takeProfit,
        positionSizeUsd: signalData?.positionSizeUsd
      });

      return result;
    } catch (error) {
      logger.error('Error sending email', error);
      return { success: false };
    }
  }

  /**
   * Send batch signals efficiently
   */
  static async sendBatch(
    signals: Array<{
      userId: string;
      signalId: string;
      agentType: string;
      tokenSymbol: string;
      signalType: 'buy' | 'sell' | 'close';
      confidence: number;
      reasoning: string;
      signalData?: any;
    }>
  ): Promise<void> {
    for (const signal of signals) {
      await this.sendSignal(
        signal.userId,
        signal.signalId,
        signal.agentType,
        signal.tokenSymbol,
        signal.signalType,
        signal.confidence,
        signal.reasoning,
        signal.signalData
      );

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    logger.info(`Batch delivery complete: ${signals.length} signals sent`);
  }

  /**
   * Send test notification to verify user settings
   */
  static async sendTest(
    userId: string,
    channelType: 'telegram' | 'email' | 'all'
  ): Promise<{ success: boolean; message: string }> {
    try {
      const preferences = await NotificationService.getPreferences(userId);

      if (channelType === 'telegram' || channelType === 'all') {
        if (preferences.telegram_enabled && preferences.telegram_chat_id) {
          const result = await TelegramService.sendMessage(
            preferences.telegram_chat_id,
            '✅ *Strategy Agents Test*\n\nYour Telegram notifications are working!',
            'Markdown'
          );

          if (!result.success) {
            return { success: false, message: `Telegram error: ${result.error}` };
          }
        }
      }

      if (channelType === 'email' || channelType === 'all') {
        if (preferences.email_enabled && preferences.email_address) {
          const result = await EmailService.sendSignalEmail(preferences.email_address, {
            agentType: 'Test Signal',
            tokenSymbol: 'TEST',
            signalType: 'buy',
            confidence: 1.0,
            reasoning: 'This is a test notification to verify your email delivery is working correctly.'
          });

          if (!result.success) {
            return { success: false, message: `Email error: ${result.error}` };
          }
        }
      }

      return { success: true, message: 'Test notification sent successfully' };
    } catch (error: any) {
      logger.error('Error sending test notification', error);
      return { success: false, message: error.message };
    }
  }
}

export default DeliveryService;
