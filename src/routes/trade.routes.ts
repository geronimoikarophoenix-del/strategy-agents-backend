import { Router } from 'express';
import TradeController from '../controllers/trade.controller';
import authMiddleware from '../middleware/auth.middleware';

const router = Router();

// All trade routes require authentication
router.use(authMiddleware);

// @route   POST /api/portfolios/:portfolio_id/trades
// @desc    Record trade execution (user executed from signal)
// @access  Private
router.post('/:portfolio_id/trades', TradeController.createTrade);

// @route   GET /api/portfolios/:portfolio_id/trades
// @desc    Get all trades for portfolio (with optional status filter)
// @access  Private
router.get('/:portfolio_id/trades', TradeController.getPortfolioTrades);

// @route   GET /api/portfolios/:portfolio_id/trades/:trade_id
// @desc    Get single trade details
// @access  Private
router.get('/:portfolio_id/trades/:trade_id', TradeController.getTrade);

// @route   PUT /api/portfolios/:portfolio_id/trades/:trade_id/close
// @desc    Close trade with exit price (user closed position)
// @access  Private
router.put('/:portfolio_id/trades/:trade_id/close', TradeController.closeTrade);

// @route   PUT /api/portfolios/:portfolio_id/trades/:trade_id/abandon
// @desc    Abandon trade without recording exit
// @access  Private
router.put('/:portfolio_id/trades/:trade_id/abandon', TradeController.abandonTrade);

// @route   PUT /api/portfolios/:portfolio_id/trades/:trade_id/notes
// @desc    Update trade notes
// @access  Private
router.put('/:portfolio_id/trades/:trade_id/notes', TradeController.updateNotes);

// @route   GET /api/portfolios/:portfolio_id/performance
// @desc    Get portfolio performance summary
// @access  Private
router.get('/:portfolio_id/performance', TradeController.getPerformance);

// @route   GET /api/agents/:agent_id/stats
// @desc    Get agent performance statistics
// @access  Private
router.get('/:agent_id/stats', TradeController.getAgentStats);

// @route   POST /api/portfolios/:portfolio_id/trades/:trade_id/check-triggers
// @desc    Check if stop loss or take profit triggered
// @access  Private
router.post('/:portfolio_id/trades/:trade_id/check-triggers', TradeController.checkTriggers);

export default router;
