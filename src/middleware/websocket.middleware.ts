import { Socket } from 'socket.io';
import AuthService from '../services/auth.service';
import WebSocketService from '../services/websocket.service';
import { logger } from '../utils/logger';

/**
 * WebSocket Middleware
 * Authenticates WebSocket connections using JWT tokens
 */

/**
 * Authenticate WebSocket connection
 */
export const authenticateWebSocket = async (socket: Socket, next: any) => {
  try {
    // Get token from query params or auth header
    const token = socket.handshake.auth.token || socket.handshake.query.token;

    if (!token) {
      logger.warn(`WebSocket connection rejected: No token provided`);
      return next(new Error('Authentication error: No token provided'));
    }

    // Verify token
    const decoded = AuthService.verifyToken(token);

    if (!decoded || !decoded.id) {
      logger.warn(`WebSocket connection rejected: Invalid token`);
      return next(new Error('Authentication error: Invalid token'));
    }

    // Attach user ID to socket
    (socket as any).userId = decoded.id;
    (socket as any).userEmail = decoded.email;

    logger.info(`WebSocket authenticated for user ${decoded.id}`);
    next();
  } catch (error: any) {
    logger.error('WebSocket authentication error', error.message);
    next(new Error('Authentication error: ' + error.message));
  }
};

/**
 * Handle WebSocket connection
 */
export const handleWebSocketConnection = (socket: Socket) => {
  const userId = (socket as any).userId;

  // Register user connection
  WebSocketService.handleUserConnection(socket, userId);

  // Handle portfolio subscriptions
  socket.on('subscribe:portfolio', (portfolioId: string) => {
    WebSocketService.joinPortfolioRoom(socket, userId, portfolioId);
    socket.emit('subscribed:portfolio', { portfolioId });
  });

  // Handle portfolio unsubscriptions
  socket.on('unsubscribe:portfolio', (portfolioId: string) => {
    WebSocketService.leavePortfolioRoom(socket, portfolioId);
    socket.emit('unsubscribed:portfolio', { portfolioId });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    WebSocketService.handleUserDisconnection(userId);
  });

  // Handle errors
  socket.on('error', (error: any) => {
    logger.error(`WebSocket error for user ${userId}`, error);
  });
};

/**
 * Handle WebSocket disconnection
 */
export const handleWebSocketDisconnection = (socket: Socket) => {
  const userId = (socket as any).userId;
  logger.info(`WebSocket disconnected for user ${userId}`);
};
