import { Router } from 'express';
import AuthController from '../controllers/auth.controller';
import authMiddleware from '../middleware/auth.middleware';

const router = Router();

// @route   POST /api/auth/register
// @desc    Register new user
// @access  Public
router.post('/register', AuthController.register);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', AuthController.login);

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', authMiddleware, AuthController.getCurrentUser);

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', authMiddleware, AuthController.logout);

export default router;
