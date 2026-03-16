import { Router, Request, Response, NextFunction } from 'express';
import CronService from '../services/cron.service';
import { logger } from '../utils/logger';

const router = Router();

/**
 * ADMIN/DEVELOPMENT ENDPOINTS
 * These are for testing and manual triggering during development
 * Should be protected by admin auth in production
 */

// @route   POST /dev/cron/scan-now
// @desc    Manually trigger signal scanner (testing only)
// @access  Development/Admin
router.post('/scan-now', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // TODO: Add admin auth check in production
    const result = await CronService.scanNow();

    res.status(200).json({
      success: result.success,
      data: result
    });
  } catch (error) {
    logger.error('Error in scan-now endpoint', error);
    next(error);
  }
});

// @route   GET /dev/cron/status
// @desc    Get cron job status
// @access  Development/Admin
router.get('/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        message: 'Cron jobs are running',
        jobs: [
          { name: 'signal-scanner', interval: '5 minutes' },
          { name: 'daily-metrics-reset', interval: '24 hours (at midnight UTC)' },
          { name: 'performance-update', interval: '1 hour' }
        ]
      }
    });
  } catch (error) {
    logger.error('Error in cron status endpoint', error);
    next(error);
  }
});

export default router;
