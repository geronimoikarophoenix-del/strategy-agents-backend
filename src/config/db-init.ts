import { query } from './database';
import { logger } from '../utils/logger';

/**
 * Initialize database schema on startup
 * Creates all tables if they don't exist
 * Uses the existing query() pool instead of managing clients manually
 */

const STATEMENTS = [
  // Users table
  `CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  // Portfolios table
  `CREATE TABLE IF NOT EXISTS portfolios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    total_pnl_usd DECIMAL(15,2) DEFAULT 0,
    win_rate DECIMAL(5,2) DEFAULT 0,
    total_trades INTEGER DEFAULT 0,
    winning_trades INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  // Agents table
  `CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    agent_type VARCHAR(255) NOT NULL,
    mode VARCHAR(50) DEFAULT 'scout',
    is_enabled BOOLEAN DEFAULT false,
    total_signals INTEGER DEFAULT 0,
    executed_trades INTEGER DEFAULT 0,
    total_pnl_usd DECIMAL(15,2) DEFAULT 0,
    win_rate DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  // Signals table
  `CREATE TABLE IF NOT EXISTS signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    token_symbol VARCHAR(255) NOT NULL,
    signal_type VARCHAR(50) NOT NULL,
    confidence DECIMAL(5,2),
    entry_price DECIMAL(15,8),
    stop_loss DECIMAL(15,8),
    take_profit DECIMAL(15,8),
    status VARCHAR(50) DEFAULT 'pending',
    reasoning TEXT,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  // Trades table
  `CREATE TABLE IF NOT EXISTS trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    signal_id UUID REFERENCES signals(id),
    token_symbol VARCHAR(255) NOT NULL,
    entry_price DECIMAL(15,8) NOT NULL,
    exit_price DECIMAL(15,8),
    position_size_usd DECIMAL(15,2),
    pnl_usd DECIMAL(15,2),
    pnl_percent DECIMAL(7,4),
    status VARCHAR(50) DEFAULT 'open',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  // Notifications table
  `CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255),
    message TEXT,
    type VARCHAR(50),
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  // Profit fees table
  `CREATE TABLE IF NOT EXISTS profit_fees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    trade_id UUID REFERENCES trades(id),
    profit_usd DECIMAL(15,2),
    fee_usd DECIMAL(15,2),
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  // Indexes
  'CREATE INDEX IF NOT EXISTS idx_portfolios_user_id ON portfolios(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_agents_portfolio_id ON agents(portfolio_id)',
  'CREATE INDEX IF NOT EXISTS idx_signals_portfolio_id ON signals(portfolio_id)',
  'CREATE INDEX IF NOT EXISTS idx_signals_agent_id ON signals(agent_id)',
  'CREATE INDEX IF NOT EXISTS idx_trades_portfolio_id ON trades(portfolio_id)',
  'CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_profit_fees_user_id ON profit_fees(user_id)',
];

export async function initializeDatabase() {
  try {
    logger.info('🔄 Starting database schema initialization...');
    
    let completed = 0;
    for (const statement of STATEMENTS) {
      try {
        await query(statement);
        completed++;
        logger.debug(`✅ Executed statement ${completed}/${STATEMENTS.length}`);
      } catch (error: any) {
        // Ignore "already exists" errors (idempotent)
        if (error.message && error.message.includes('already exists')) {
          completed++;
          logger.debug(`✅ Table already exists (statement ${completed}/${STATEMENTS.length})`);
        } else {
          logger.error(`❌ Statement ${completed + 1} failed:`, error);
          throw error;
        }
      }
    }
    
    logger.info(`✅ Database schema initialized successfully! (${completed}/${STATEMENTS.length} statements executed)`);
    return true;
  } catch (error) {
    logger.error('❌ Database initialization failed:', error);
    // Don't exit — log the error but let server start anyway
    // User can manually run SQL from Railway UI as fallback
    logger.info('⚠️  Server starting anyway. If tables are missing, manually run SQL from Railway PostgreSQL UI.');
    return false;
  }
}
