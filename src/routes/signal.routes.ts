import { Router } from 'express';
import SignalController from '../controllers/signal.controller';
import authMiddleware from '../middleware/auth.middleware';

const router = Router();

// All signal routes require authentication
router.use(authMiddleware);

// @route   POST /api/portfolios/:portfolio_id/signals
// @desc    Generate new signal (internal or scanner service)
// @access  Private
router.post('/:portfolio_id/signals', SignalController.generateSignal);

// @route   GET /api/portfolios/:portfolio_id/signals
// @desc    Get all pending signals for portfolio
// @access  Private
router.get('/:portfolio_id/signals', SignalController.getPendingSignals);

// @route   GET /api/portfolios/:portfolio_id/signals/:signal_id
// @desc    Get single signal details
// @access  Private
router.get('/:portfolio_id/signals/:signal_id', SignalController.getSignal);

// @route   GET /api/agents/:agent_id/signals
// @desc    Get signals by specific agent
// @access  Private
router.get('/:agent_id/signals', SignalController.getAgentSignals);

// @route   PUT /api/portfolios/:portfolio_id/signals/:signal_id/approve
// @desc    User approves signal (SCOUT mode)
// @access  Private
router.put('/:portfolio_id/signals/:signal_id/approve', SignalController.approveSignal);

// @route   PUT /api/portfolios/:portfolio_id/signals/:signal_id/reject
// @desc    User rejects signal (SCOUT mode)
// @access  Private
router.put('/:portfolio_id/signals/:signal_id/reject', SignalController.rejectSignal);

// @route   PUT /api/portfolios/:portfolio_id/signals/:signal_id/executed
// @desc    Mark signal as executed (user confirms trade execution)
// @access  Private
router.put('/:portfolio_id/signals/:signal_id/executed', SignalController.markExecuted);

export default router;
