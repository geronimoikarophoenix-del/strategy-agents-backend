import ScannerService from './scanner.service';
import { logger } from '../utils/logger';

/**
 * Cron Service
 * Manages scheduled jobs (signal scanning, metrics updates, etc.)
 */

export class CronService {
  private static intervals: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Start all cron jobs
   */
  static startAll() {
    logger.info('Starting cron jobs...');

    // Signal scanner: run every 5 minutes
    this.startSignalScanner();

    // Daily metrics reset: run at midnight
    this.startDailyMetricsReset();

    // Performance update: run every 1 hour
    this.startPerformanceUpdate();

    logger.info('All cron jobs started');
  }

  /**
   * Stop all cron jobs
   */
  static stopAll() {
    this.intervals.forEach((interval, name) => {
      clearInterval(interval);
      logger.info(`Cron job stopped: ${name}`);
    });
    this.intervals.clear();
  }

  /**
   * Signal scanner cron (every 5 minutes)
   */
  private static startSignalScanner() {
    const interval = setInterval(async () => {
      try {
        const result = await ScannerService.scanAllAgents();
        if (result.success) {
          logger.info(
            `Signal scanner: ${result.signalsGenerated} signals in ${result.elapsedMs}ms`
          );
        } else {
          logger.error(`Signal scanner error: ${result.error}`);
        }
      } catch (error) {
        logger.error('Signal scanner cron error', error);
      }
    }, 5 * 60 * 1000); // 5 minutes

    this.intervals.set('signal-scanner', interval);
    logger.info('Signal scanner cron started (every 5 minutes)');
  }

  /**
   * Daily metrics reset cron (at midnight UTC)
   */
  private static startDailyMetricsReset() {
    // Calculate time until next midnight UTC
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);

    const msUntilMidnight = tomorrow.getTime() - now.getTime();

    // Run once at midnight, then every 24 hours
    const timeout = setTimeout(() => {
      this.resetDailyMetrics();

      const interval = setInterval(() => {
        this.resetDailyMetrics();
      }, 24 * 60 * 60 * 1000); // 24 hours

      this.intervals.set('daily-metrics-reset', interval);
    }, msUntilMidnight);

    logger.info(
      `Daily metrics reset scheduled for ${tomorrow.toISOString()} (in ${msUntilMidnight}ms)`
    );
  }

  /**
   * Performance update cron (every 1 hour)
   */
  private static startPerformanceUpdate() {
    const interval = setInterval(async () => {
      try {
        // TODO: Calculate and update portfolio performance metrics
        logger.info('Performance metrics updated');
      } catch (error) {
        logger.error('Performance update cron error', error);
      }
    }, 60 * 60 * 1000); // 1 hour

    this.intervals.set('performance-update', interval);
    logger.info('Performance update cron started (every 1 hour)');
  }

  /**
   * Reset daily metrics (called at midnight)
   */
  private static async resetDailyMetrics() {
    try {
      // TODO: Reset signals_sent_today and daily_pnl for all portfolios
      logger.info('Daily metrics reset completed');
    } catch (error) {
      logger.error('Error resetting daily metrics', error);
    }
  }

  /**
   * Manual trigger for signal scanner (for testing)
   */
  static async scanNow() {
    logger.info('Manually triggering signal scanner...');
    return await ScannerService.scanAllAgents();
  }
}

export default CronService;
