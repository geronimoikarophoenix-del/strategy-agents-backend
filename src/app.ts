import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import portfolioRoutes from './routes/portfolio.routes';
import agentRoutes from './routes/agent.routes';
import signalRoutes from './routes/signal.routes';
import notificationRoutes from './routes/notification.routes';
import tradeRoutes from './routes/trade.routes';
import approvalRoutes from './routes/approval.routes';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';
import WebSocketService from './services/websocket.service';
import { authenticateWebSocket, handleWebSocketConnection } from './middleware/websocket.middleware';
import CronService from './services/cron.service';
import cronRoutes from './routes/cron.routes';
import { initializeDatabase } from './config/db-init';

dotenv.config();

const app: Express = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Database health check
app.get('/api/health/db', async (req: Request, res: Response) => {
  try {
    const result = await require('./config/database').query('SELECT NOW()');
    res.json({ 
      status: 'ok', 
      database: 'connected',
      timestamp: new Date().toISOString(),
      dbTime: result.rows[0] 
    });
  } catch (error) {
    logger.error('Database health check failed:', error);
    res.status(500).json({ 
      status: 'error', 
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Debug endpoint: Check if test user exists
app.get('/api/debug/user/:email', async (req: Request, res: Response) => {
  try {
    const email = req.params.email;
    const result = await require('./config/database').query(
      'SELECT id, email, username, created_at FROM users WHERE email = $1',
      [email]
    );
    res.json({ 
      found: result.rows.length > 0,
      user: result.rows[0] || null,
      totalUsers: result.rows.length 
    });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Database error'
    });
  }
});

// Debug endpoint: Get all users (for testing)
app.get('/api/debug/users', async (req: Request, res: Response) => {
  try {
    const result = await require('./config/database').query(
      'SELECT id, email, username, created_at FROM users LIMIT 10'
    );
    res.json({ 
      total: result.rows.length,
      users: result.rows
    });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Database error'
    });
  }
});

// Debug endpoint: Test password hash
app.post('/api/debug/password-test', async (req: Request, res: Response) => {
  try {
    const bcrypt = require('bcrypt');
    const testPassword = 'TestPass123';
    const knownHash = '$2b$10$YOW8iv4lSsG0YXN8/V.eOO.V8hRrfKB7bz8KJ6.7xVb5X9cO5XFaa';
    
    const match = await bcrypt.compare(testPassword, knownHash);
    res.json({ 
      testPassword,
      knownHash,
      passwordMatchesHash: match,
      bcryptVersion: bcrypt.version
    });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Bcrypt test failed'
    });
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/portfolios', portfolioRoutes);
app.use('/api/portfolios', agentRoutes); // Agents are nested under portfolios
app.use('/api/portfolios', signalRoutes); // Signals are nested under portfolios
app.use('/api/portfolios', tradeRoutes); // Trades are nested under portfolios
app.use('/api/agents', signalRoutes); // Signals also accessible by agent
app.use('/api/agents', tradeRoutes); // Trades also accessible by agent (for stats)
app.use('/api/notifications', notificationRoutes);
app.use('/api/approvals', approvalRoutes);

// Development/Admin routes
app.use('/dev/cron', cronRoutes);

// Error handler
app.use(errorHandler);

// Initialize WebSocket service
WebSocketService.initialize(io);

// WebSocket middleware
io.use(authenticateWebSocket);

// WebSocket event handlers
io.on('connection', (socket) => {
  handleWebSocketConnection(socket);
});

// Make io available globally
(global as any).io = io;

const PORT = process.env.PORT || 3000;

// Initialize database and start server
async function startServer() {
  try {
    // Initialize database schema (creates tables if they don't exist)
    // Returns true/false — doesn't crash server if init fails
    const dbInitSuccess = await initializeDatabase();
    
    httpServer.listen(PORT, () => {
      logger.info(`✅ Server running on port ${PORT}`);
      
      if (!dbInitSuccess) {
        logger.warn('⚠️  Database auto-init failed. If login doesn\'t work, manually run SQL from Railway PostgreSQL UI.');
        logger.info('📄 SQL file location: /sql/001_init_schema_manual.sql');
      } else {
        logger.info('✅ Database schema initialized successfully');
      }

      // Cron jobs disabled temporarily (scanner needs real market data)
      // Will be enabled once market data integration is complete
      logger.info('ℹ️  Cron jobs disabled (scanner requires market data integration)');
      
      // Start cron jobs in production (not in test mode) - DISABLED FOR NOW
      // if (process.env.NODE_ENV !== 'test') {
      //   CronService.startAll();
      // }
    });
  } catch (error) {
    logger.error('Fatal error starting server:', error);
    process.exit(1);
  }
}

startServer();

export { httpServer, io };
