import { Server as SocketIOServer, Socket } from 'socket.io';
import { logger } from '../utils/logger';

/**
 * WebSocket Service
 * Manages real-time events via Socket.io
 * Broadcasts signals, trades, notifications in real-time
 */

export interface SocketUser {
  userId: string;
  token: string;
  connectedAt: Date;
}

export type EventType = 
  | 'signal:generated'
  | 'signal:approved'
  | 'signal:rejected'
  | 'trade:created'
  | 'trade:closed'
  | 'trade:abandoned'
  | 'notification:received'
  | 'portfolio:updated'
  | 'agent:updated'
  | 'performance:updated';

export interface SocketEvent {
  type: EventType;
  userId: string;
  portfolioId?: string;
  data: any;
  timestamp: Date;
}

export class WebSocketService {
  private static io: SocketIOServer;
  private static connectedUsers: Map<string, SocketUser> = new Map();

  /**
   * Initialize WebSocket service
   */
  static initialize(io: SocketIOServer) {
    this.io = io;
    logger.info('WebSocket service initialized');
  }

  /**
   * Broadcast signal to user (real-time alert)
   */
  static broadcastSignal(
    userId: string,
    portfolioId: string,
    signal: {
      id: string;
      agentType: string;
      tokenSymbol: string;
      signalType: 'buy' | 'sell' | 'close';
      confidence: number;
      reasoning: string;
      entryPrice?: number;
      stopLoss?: number;
      takeProfit?: number;
    }
  ) {
    if (!this.io) return;

    this.io.to(`user:${userId}`).emit('signal:generated', {
      signal,
      portfolioId,
      timestamp: new Date().toISOString()
    });

    logger.info(`Signal broadcasted to user ${userId}: ${signal.tokenSymbol}`);
  }

  /**
   * Broadcast trade execution to user
   */
  static broadcastTrade(
    userId: string,
    portfolioId: string,
    trade: {
      id: string;
      tokenSymbol: string;
      entryPrice: number;
      entryAmountUsd: number;
      status: 'open' | 'closed' | 'abandoned';
      pnl?: number;
      pnlPercent?: number;
    }
  ) {
    if (!this.io) return;

    this.io.to(`user:${userId}`).emit('trade:created', {
      trade,
      portfolioId,
      timestamp: new Date().toISOString()
    });

    logger.info(`Trade broadcasted to user ${userId}: ${trade.tokenSymbol}`);
  }

  /**
   * Broadcast trade close
   */
  static broadcastTradeClose(
    userId: string,
    portfolioId: string,
    trade: {
      id: string;
      tokenSymbol: string;
      exitPrice: number;
      pnl: number;
      pnlPercent: number;
    }
  ) {
    if (!this.io) return;

    this.io.to(`user:${userId}`).emit('trade:closed', {
      trade,
      portfolioId,
      timestamp: new Date().toISOString()
    });

    logger.info(`Trade close broadcasted to user ${userId}: ${trade.tokenSymbol}`);
  }

  /**
   * Broadcast notification
   */
  static broadcastNotification(
    userId: string,
    notification: {
      id: string;
      type: 'buy' | 'sell' | 'close';
      subject: string;
      message: string;
    }
  ) {
    if (!this.io) return;

    this.io.to(`user:${userId}`).emit('notification:received', {
      notification,
      timestamp: new Date().toISOString()
    });

    logger.info(`Notification broadcasted to user ${userId}`);
  }

  /**
   * Broadcast portfolio performance update
   */
  static broadcastPortfolioUpdate(
    userId: string,
    portfolioId: string,
    metrics: {
      totalTrades: number;
      winRate: number;
      totalPnL: number;
      dailyPnL: number;
    }
  ) {
    if (!this.io) return;

    this.io.to(`user:${userId}`).emit('portfolio:updated', {
      portfolioId,
      metrics,
      timestamp: new Date().toISOString()
    });

    logger.info(`Portfolio update broadcasted to user ${userId}`);
  }

  /**
   * Broadcast agent status update
   */
  static broadcastAgentUpdate(
    userId: string,
    portfolioId: string,
    agent: {
      id: string;
      agentType: string;
      mode: 'auto' | 'scout';
      isEnabled: boolean;
      totalTrades: number;
      winRate: number;
    }
  ) {
    if (!this.io) return;

    this.io.to(`user:${userId}`).emit('agent:updated', {
      agent,
      portfolioId,
      timestamp: new Date().toISOString()
    });

    logger.info(`Agent update broadcasted to user ${userId}: ${agent.agentType}`);
  }

  /**
   * User joins WebSocket room for portfolio
   */
  static joinPortfolioRoom(socket: Socket, userId: string, portfolioId: string) {
    const room = `portfolio:${portfolioId}`;
    socket.join(room);
    logger.info(`User ${userId} joined room ${room}`);
  }

  /**
   * User leaves portfolio room
   */
  static leavePortfolioRoom(socket: Socket, portfolioId: string) {
    const room = `portfolio:${portfolioId}`;
    socket.leave(room);
    logger.info(`User left room ${room}`);
  }

  /**
   * Handle user connection
   */
  static handleUserConnection(socket: Socket, userId: string) {
    // Join user-specific room
    socket.join(`user:${userId}`);

    // Track connection
    this.connectedUsers.set(userId, {
      userId,
      token: socket.id,
      connectedAt: new Date()
    });

    logger.info(`User ${userId} connected (socket: ${socket.id})`);

    // Send welcome message
    socket.emit('connected', {
      message: 'Connected to Strategy Agents',
      userId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle user disconnection
   */
  static handleUserDisconnection(userId: string) {
    this.connectedUsers.delete(userId);
    logger.info(`User ${userId} disconnected`);
  }

  /**
   * Get connected user count
   */
  static getConnectedUserCount(): number {
    return this.connectedUsers.size;
  }

  /**
   * Get user connection status
   */
  static isUserConnected(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  /**
   * Broadcast to specific portfolio room
   */
  static broadcastToPortfolioRoom(
    portfolioId: string,
    eventType: string,
    data: any
  ) {
    if (!this.io) return;

    this.io.to(`portfolio:${portfolioId}`).emit(eventType, {
      ...data,
      timestamp: new Date().toISOString()
    });

    logger.info(`Event "${eventType}" broadcasted to portfolio room: ${portfolioId}`);
  }

  /**
   * Broadcast system-wide message
   */
  static broadcastSystem(eventType: string, data: any) {
    if (!this.io) return;

    this.io.emit(eventType, {
      ...data,
      timestamp: new Date().toISOString()
    });

    logger.info(`System event "${eventType}" broadcasted to all users`);
  }
}

export default WebSocketService;
