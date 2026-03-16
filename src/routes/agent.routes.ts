import { Router } from 'express';
import AgentController from '../controllers/agent.controller';
import authMiddleware from '../middleware/auth.middleware';

const router = Router();

// All agent routes require authentication
router.use(authMiddleware);

// @route   POST /api/portfolios/:portfolio_id/agents
// @desc    Configure new agent for portfolio
// @access  Private
router.post('/:portfolio_id/agents', AgentController.configureAgent);

// @route   GET /api/portfolios/:portfolio_id/agents
// @desc    Get all agents for portfolio
// @access  Private
router.get('/:portfolio_id/agents', AgentController.getPortfolioAgents);

// @route   GET /api/portfolios/:portfolio_id/agents/:agent_id
// @desc    Get single agent
// @access  Private
router.get('/:portfolio_id/agents/:agent_id', AgentController.getAgent);

// @route   PUT /api/portfolios/:portfolio_id/agents/:agent_id/mode
// @desc    Change agent mode (auto <-> scout)
// @access  Private
router.put('/:portfolio_id/agents/:agent_id/mode', AgentController.changeMode);

// @route   PUT /api/portfolios/:portfolio_id/agents/:agent_id/toggle
// @desc    Enable/disable agent
// @access  Private
router.put('/:portfolio_id/agents/:agent_id/toggle', AgentController.toggleAgent);

// @route   PUT /api/portfolios/:portfolio_id/agents/:agent_id/settings
// @desc    Update agent settings
// @access  Private
router.put('/:portfolio_id/agents/:agent_id/settings', AgentController.updateSettings);

export default router;
