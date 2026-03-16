import axios from 'axios';
import { logger } from '../utils/logger';

/**
 * Telegram Delivery Service
 * Sends signal notifications via Telegram bot
 */

export class TelegramService {
  private static botToken = process.env.TELEGRAM_BOT_TOKEN || '';
  private static apiUrl = `https://api.telegram.org/bot${TelegramService.botToken}`;

  /**
   * Send message to Telegram chat
   */
  static async sendMessage(
    chatId: string,
    message: string,
    parseMode: 'HTML' | 'Markdown' | 'MarkdownV2' = 'Markdown'
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.botToken) {
      logger.warn('Telegram bot token not configured');
      return { success: false, error: 'Telegram not configured' };
    }

    try {
      const response = await axios.post(`${this.apiUrl}/sendMessage`, {
        chat_id: chatId,
        text: message,
        parse_mode: parseMode,
        disable_web_page_preview: true
      });

      if (response.data.ok) {
        logger.info(`Telegram message sent to ${chatId} (message_id: ${response.data.result.message_id})`);
        return {
          success: true,
          messageId: response.data.result.message_id.toString()
        };
      } else {
        logger.error(`Telegram API error: ${response.data.description}`);
        return { success: false, error: response.data.description };
      }
    } catch (error: any) {
      logger.error('Error sending Telegram message', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Format signal as Telegram message
   */
  static formatSignalMessage(data: {
    agentType: string;
    tokenSymbol: string;
    signalType: 'buy' | 'sell' | 'close';
    confidence: number;
    reasoning: string;
    entryPrice?: number;
    stopLoss?: number;
    takeProfit?: number;
    positionSizeUsd?: number;
  }): string {
    const { agentType, tokenSymbol, signalType, confidence, reasoning, entryPrice, stopLoss, takeProfit, positionSizeUsd } = data;

    const signalEmoji = signalType === 'buy' ? '🟢' : signalType === 'sell' ? '🔴' : '⚠️';
    const actionText = signalType === 'buy' ? '*BUY*' : signalType === 'sell' ? '*SELL*' : '*CLOSE*';
    const confidenceEmoji = confidence > 0.8 ? '🔥' : confidence > 0.6 ? '✅' : '⚠️';

    let message = `${signalEmoji} *Signal Alert*\n\n`;
    message += `*Action:* ${actionText} $${tokenSymbol}\n`;
    message += `*Agent:* ${agentType.replace(/_/g, ' ')}\n`;
    message += `*Confidence:* ${confidenceEmoji} ${(confidence * 100).toFixed(0)}%\n\n`;

    if (entryPrice) {
      message += `*Entry:* $${entryPrice.toFixed(2)}\n`;
    }
    if (stopLoss) {
      message += `*Stop Loss:* ${stopLoss.toFixed(2)}\n`;
    }
    if (takeProfit) {
      message += `*Take Profit:* ${takeProfit.toFixed(2)}\n`;
    }
    if (positionSizeUsd) {
      message += `*Position Size:* $${positionSizeUsd.toFixed(2)}\n`;
    }

    message += `\n*Reasoning:*\n${reasoning}\n\n`;
    message += `💡 Review and execute on your connected wallet\n(Phantom • MetaMask • Solflare)`;

    return message;
  }

  /**
   * Test Telegram connection
   */
  static async testConnection(chatId: string): Promise<boolean> {
    try {
      const result = await this.sendMessage(
        chatId,
        '✅ Strategy Agents connection successful!\n\nYou will receive signal alerts here.',
        'Markdown'
      );
      return result.success;
    } catch (error) {
      logger.error('Telegram test connection failed', error);
      return false;
    }
  }

  /**
   * Send batch messages (rate-limited)
   */
  static async sendBatch(
    messages: Array<{ chatId: string; text: string }>
  ): Promise<Array<{ chatId: string; success: boolean; messageId?: string }>> {
    const results = [];

    for (const msg of messages) {
      const result = await this.sendMessage(msg.chatId, msg.text);
      results.push({
        chatId: msg.chatId,
        success: result.success,
        messageId: result.messageId
      });

      // Rate limiting: 30 messages/second is Telegram's limit, but be conservative
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return results;
  }

  /**
   * Send message with inline buttons (for signal approval in SCOUT mode)
   */
  static async sendSignalWithButtons(
    chatId: string,
    messageText: string,
    buttons: Array<{ text: string; callback_data: string }>
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.botToken) {
      logger.warn('Telegram bot token not configured');
      return { success: false, error: 'Telegram not configured' };
    }

    try {
      const response = await axios.post(`${this.apiUrl}/sendMessage`, {
        chat_id: chatId,
        text: messageText,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            buttons.map(btn => ({ text: btn.text, callback_data: btn.callback_data }))
          ]
        }
      });

      if (response.data.ok) {
        logger.info(`Telegram message with buttons sent to ${chatId}`);
        return {
          success: true,
          messageId: response.data.result.message_id.toString()
        };
      } else {
        return { success: false, error: response.data.description };
      }
    } catch (error: any) {
      logger.error('Error sending Telegram message with buttons', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete message (useful for cleaning up old alerts)
   */
  static async deleteMessage(chatId: string, messageId: string): Promise<boolean> {
    if (!this.botToken) return false;

    try {
      const response = await axios.post(`${this.apiUrl}/deleteMessage`, {
        chat_id: chatId,
        message_id: messageId
      });

      return response.data.ok;
    } catch (error) {
      logger.error('Error deleting Telegram message', error);
      return false;
    }
  }
}

export default TelegramService;
