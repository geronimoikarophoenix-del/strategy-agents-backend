import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

/**
 * Email Delivery Service
 * Sends signal notifications via email (SendGrid, Gmail, etc.)
 */

export class EmailService {
  private static transporter: any = null;

  /**
   * Initialize email transporter
   */
  static initializeTransporter() {
    if (this.transporter) return;

    const emailProvider = process.env.EMAIL_PROVIDER || 'smtp';

    if (emailProvider === 'sendgrid') {
      // SendGrid via SMTP
      this.transporter = nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false,
        auth: {
          user: 'apikey',
          pass: process.env.SENDGRID_API_KEY || ''
        }
      });
    } else {
      // Default SMTP (Gmail, custom server, etc.)
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASSWORD || ''
        }
      });
    }

    logger.info('Email transporter initialized');
  }

  /**
   * Send signal notification email
   */
  static async sendSignalEmail(
    recipientEmail: string,
    data: {
      agentType: string;
      tokenSymbol: string;
      signalType: 'buy' | 'sell' | 'close';
      confidence: number;
      reasoning: string;
      entryPrice?: number;
      stopLoss?: number;
      takeProfit?: number;
      positionSizeUsd?: number;
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      this.initializeTransporter();

      if (!this.transporter) {
        logger.warn('Email not configured');
        return { success: false, error: 'Email not configured' };
      }

      const { agentType, tokenSymbol, signalType, confidence, reasoning, entryPrice, stopLoss, takeProfit, positionSizeUsd } = data;

      const signalEmoji = signalType === 'buy' ? '🟢' : signalType === 'sell' ? '🔴' : '⚠️';
      const actionText = signalType === 'buy' ? 'BUY' : signalType === 'sell' ? 'SELL' : 'CLOSE';

      const htmlBody = `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #f0f4f8; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
              .signal-box { border-left: 4px solid ${signalType === 'buy' ? '#10b981' : '#ef4444'}; padding: 15px; background: #f9fafb; margin: 15px 0; }
              .details { margin: 15px 0; }
              .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
              .button { background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 20px; }
              .footer { color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2>${signalEmoji} Signal Alert from Strategy Agents</h2>
                <p>You have a new trading signal</p>
              </div>

              <div class="signal-box">
                <strong>Action:</strong> ${actionText} $${tokenSymbol}<br>
                <strong>Agent:</strong> ${agentType.replace(/_/g, ' ')}<br>
                <strong>Confidence:</strong> ${(confidence * 100).toFixed(0)}%
              </div>

              <div class="details">
                <h3>Signal Details</h3>
                <div class="detail-row">
                  <span>Signal Type:</span>
                  <strong>${actionText}</strong>
                </div>
                <div class="detail-row">
                  <span>Token:</span>
                  <strong>$${tokenSymbol}</strong>
                </div>
                <div class="detail-row">
                  <span>Confidence:</span>
                  <strong>${(confidence * 100).toFixed(0)}%</strong>
                </div>
                ${entryPrice ? `<div class="detail-row"><span>Entry Price:</span><strong>$${entryPrice.toFixed(2)}</strong></div>` : ''}
                ${stopLoss ? `<div class="detail-row"><span>Stop Loss:</span><strong>$${stopLoss.toFixed(2)}</strong></div>` : ''}
                ${takeProfit ? `<div class="detail-row"><span>Take Profit:</span><strong>$${takeProfit.toFixed(2)}</strong></div>` : ''}
                ${positionSizeUsd ? `<div class="detail-row"><span>Position Size:</span><strong>$${positionSizeUsd.toFixed(2)}</strong></div>` : ''}
              </div>

              <div>
                <h3>Reasoning</h3>
                <p>${reasoning}</p>
              </div>

              <a href="${process.env.FRONTEND_URL}/dashboard" class="button">View in Dashboard</a>

              <div class="footer">
                <p>This is an automated signal from Strategy Agents. Review and execute trades on your connected wallet (Phantom, MetaMask, Solflare).</p>
                <p>Strategy Agents never executes trades on your behalf. You maintain full control of your wallet and funds.</p>
              </div>
            </div>
          </body>
        </html>
      `;

      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@strategyagents.io',
        to: recipientEmail,
        subject: `${signalEmoji} Signal Alert: ${actionText} $${tokenSymbol}`,
        html: htmlBody
      };

      const result = await this.transporter.sendMail(mailOptions);

      logger.info(`Email sent to ${recipientEmail} (message_id: ${result.messageId})`);
      return { success: true };
    } catch (error: any) {
      logger.error('Error sending email', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send welcome email
   */
  static async sendWelcomeEmail(
    email: string,
    userName: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      this.initializeTransporter();

      if (!this.transporter) {
        return { success: false, error: 'Email not configured' };
      }

      const htmlBody = `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #3b82f6; color: white; padding: 30px; border-radius: 8px; text-align: center; margin-bottom: 20px; }
              .content { line-height: 1.6; }
              .button { background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 20px; }
              .footer { color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Welcome to Strategy Agents!</h1>
              </div>

              <div class="content">
                <p>Hi ${userName},</p>

                <p>Welcome to Strategy Agents, your personal AI-powered trading agent platform on Solana.</p>

                <h2>What you can do:</h2>
                <ul>
                  <li>Create multiple trading portfolios</li>
                  <li>Configure 8 different trading agents (5 token trading + 3 prediction scouts)</li>
                  <li>Switch between AUTO (automatic execution) and SCOUT (approval required) modes</li>
                  <li>Connect your Phantom/MetaMask wallet for signal execution</li>
                  <li>Track performance and accuracy</li>
                </ul>

                <h2>Getting Started:</h2>
                <ol>
                  <li>Create your first portfolio</li>
                  <li>Enable the agents you want to use</li>
                  <li>Connect your wallet (you maintain full control)</li>
                  <li>Set your risk parameters (position size, daily limit, stop loss)</li>
                  <li>Receive signals and execute trades on your terms</li>
                </ol>

                <p><strong>Important:</strong> Strategy Agents provides signal recommendations only. You always maintain full control of your wallet and funds. You sign every transaction.</p>

                <a href="${process.env.FRONTEND_URL}/dashboard" class="button">Go to Dashboard</a>
              </div>

              <div class="footer">
                <p>Need help? Check our docs or contact support.</p>
              </div>
            </div>
          </body>
        </html>
      `;

      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@strategyagents.io',
        to: email,
        subject: '🎉 Welcome to Strategy Agents!',
        html: htmlBody
      };

      await this.transporter.sendMail(mailOptions);
      logger.info(`Welcome email sent to ${email}`);
      return { success: true };
    } catch (error: any) {
      logger.error('Error sending welcome email', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Test email connection
   */
  static async testConnection(testEmail: string): Promise<{ success: boolean; error?: string }> {
    try {
      this.initializeTransporter();

      if (!this.transporter) {
        return { success: false, error: 'Email not configured' };
      }

      await this.transporter.verify();
      logger.info('Email connection verified');
      return { success: true };
    } catch (error: any) {
      logger.error('Email connection test failed', error.message);
      return { success: false, error: error.message };
    }
  }
}

export default EmailService;
