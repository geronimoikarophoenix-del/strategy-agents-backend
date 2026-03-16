import { Router } from 'express';
import PortfolioController from '../controllers/portfolio.controller';
import authMiddleware from '../middleware/auth.middleware';

const router = Router();

// All portfolio routes require authentication
router.use(authMiddleware);

// @route   POST /api/portfolios
// @desc    Create new portfolio
// @access  Private
router.post('/', PortfolioController.createPortfolio);

// @route   GET /api/portfolios
// @desc    Get all user portfolios
// @access  Private
router.get('/', PortfolioController.getUserPortfolios);

// @route   GET /api/portfolios/:id
// @desc    Get single portfolio
// @access  Private
router.get('/:id', PortfolioController.getPortfolio);

// @route   PUT /api/portfolios/:id
// @desc    Update portfolio
// @access  Private
router.put('/:id', PortfolioController.updatePortfolio);

// @route   DELETE /api/portfolios/:id
// @desc    Delete portfolio
// @access  Private
router.delete('/:id', PortfolioController.deletePortfolio);

export default router;
