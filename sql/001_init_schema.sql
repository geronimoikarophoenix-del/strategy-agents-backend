-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  avatar_url TEXT,
  
  timezone VARCHAR(50) DEFAULT 'America/New_York',
  notification_email BOOLEAN DEFAULT true,
  notification_telegram BOOLEAN DEFAULT true,
  telegram_chat_id VARCHAR(255),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);

-- Connected Wallets (User-Custodied, No Keys Stored)
CREATE TABLE IF NOT EXISTS connected_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  wallet_address VARCHAR(255) NOT NULL,
  wallet_type VARCHAR(50), -- 'phantom', 'metamask', etc
  
  connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_activity_at TIMESTAMP,
  
  UNIQUE(user_id, wallet_address)
);

CREATE INDEX idx_connected_wallets_user ON connected_wallets(user_id);
CREATE INDEX idx_connected_wallets_address ON connected_wallets(wallet_address);

-- Portfolios Table (Signal Tracking, No Fund Custody)
CREATE TABLE IF NOT EXISTS portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  connected_wallet_id UUID REFERENCES connected_wallets(id),
  
  name VARCHAR(255) NOT NULL,
  description TEXT,
  tier VARCHAR(50) DEFAULT 'free', -- 'free', 'explorer', 'starter', 'pro', 'pro+'
  overall_risk_level VARCHAR(50),
  
  -- Performance Metrics (Read-Only, from blockchain)
  signals_sent_today INTEGER DEFAULT 0,
  signals_sent_lifetime INTEGER DEFAULT 0,
  signal_accuracy FLOAT DEFAULT 0, -- % of signals that were profitable
  
  -- User Decisions
  signals_approved_today INTEGER DEFAULT 0,
  signals_rejected_today INTEGER DEFAULT 0,
  
  -- Profit/Loss Tracking (From User's Executed Trades)
  daily_pnl DECIMAL(15, 2) DEFAULT 0,
  weekly_pnl DECIMAL(15, 2) DEFAULT 0,
  monthly_pnl DECIMAL(15, 2) DEFAULT 0,
  lifetime_pnl DECIMAL(15, 2) DEFAULT 0,
  
  win_rate FLOAT DEFAULT 0, -- % of user's trades that were profitable
  total_user_trades INTEGER DEFAULT 0, -- Trades user actually executed
  
  is_active BOOLEAN DEFAULT true,
  is_trading BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(user_id, name)
);

CREATE INDEX idx_portfolios_user ON portfolios(user_id);
CREATE INDEX idx_portfolios_tier ON portfolios(tier);
CREATE INDEX idx_portfolios_wallet ON portfolios(connected_wallet_id);

-- Agents Table
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  
  agent_type VARCHAR(50) NOT NULL,
  agent_name VARCHAR(100) NOT NULL,
  
  mode VARCHAR(20) DEFAULT 'scout', -- 'auto' or 'scout'
  is_enabled BOOLEAN DEFAULT true,
  
  max_trade_size_usd INTEGER,
  max_daily_budget_usd INTEGER,
  max_daily_trades INTEGER,
  stop_loss_pct FLOAT,
  take_profit_pct FLOAT,
  
  max_concurrent_positions INTEGER DEFAULT 1,
  max_hold_time_hours INTEGER,
  
  use_staged_exits BOOLEAN DEFAULT true,
  staged_exit_1_pct FLOAT DEFAULT 5,
  staged_exit_1_sell_pct FLOAT DEFAULT 0.5,
  staged_exit_2_pct FLOAT DEFAULT 10,
  staged_exit_2_sell_pct FLOAT DEFAULT 0.25,
  
  total_trades INTEGER DEFAULT 0,
  winning_trades INTEGER DEFAULT 0,
  losing_trades INTEGER DEFAULT 0,
  win_rate FLOAT,
  total_pnl DECIMAL(15, 2) DEFAULT 0,
  
  last_scan_at TIMESTAMP,
  last_trade_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_agents_portfolio ON agents(portfolio_id);
CREATE INDEX idx_agents_type ON agents(agent_type);
CREATE INDEX idx_agents_enabled ON agents(is_enabled);

-- Positions Table
CREATE TABLE IF NOT EXISTS positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES portfolios(id),
  agent_id UUID NOT NULL REFERENCES agents(id),
  
  token_symbol VARCHAR(20) NOT NULL,
  token_address VARCHAR(255),
  
  entry_price DECIMAL(15, 8) NOT NULL,
  entry_time TIMESTAMP NOT NULL,
  entry_amount_usd DECIMAL(15, 2) NOT NULL,
  token_quantity DECIMAL(20, 8),
  
  current_price DECIMAL(15, 8),
  current_value_usd DECIMAL(15, 2),
  unrealized_pnl DECIMAL(15, 2),
  unrealized_pnl_pct FLOAT,
  
  target_price DECIMAL(15, 8),
  stop_loss_price DECIMAL(15, 8),
  
  staged_exit_1_executed BOOLEAN DEFAULT false,
  staged_exit_1_amount DECIMAL(15, 2),
  staged_exit_2_executed BOOLEAN DEFAULT false,
  staged_exit_2_amount DECIMAL(15, 2),
  
  status VARCHAR(50) DEFAULT 'open',
  closed_at TIMESTAMP,
  
  strategy_name VARCHAR(100),
  strategy_params JSONB,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_positions_portfolio ON positions(portfolio_id);
CREATE INDEX idx_positions_agent ON positions(agent_id);
CREATE INDEX idx_positions_status ON positions(status);

-- Trades Table
CREATE TABLE IF NOT EXISTS trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES portfolios(id),
  agent_id UUID NOT NULL REFERENCES agents(id),
  position_id UUID REFERENCES positions(id),
  
  trade_type VARCHAR(50),
  token_symbol VARCHAR(20),
  token_address VARCHAR(255),
  
  entry_price DECIMAL(15, 8),
  exit_price DECIMAL(15, 8),
  quantity DECIMAL(20, 8),
  amount_usd DECIMAL(15, 2),
  
  realized_pnl DECIMAL(15, 2),
  realized_pnl_pct FLOAT,
  
  entry_time TIMESTAMP,
  exit_time TIMESTAMP,
  hold_time_minutes INTEGER,
  
  status VARCHAR(50),
  
  txn_hash VARCHAR(255),
  txn_status VARCHAR(50),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_trades_portfolio ON trades(portfolio_id);
CREATE INDEX idx_trades_agent ON trades(agent_id);
CREATE INDEX idx_trades_status ON trades(status);

-- Approvals Table (for SCOUT mode)
CREATE TABLE IF NOT EXISTS approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES portfolios(id),
  agent_id UUID NOT NULL REFERENCES agents(id),
  
  alert_type VARCHAR(50),
  asset VARCHAR(50),
  token_symbol VARCHAR(20),
  
  signal_data JSONB,
  recommended_action VARCHAR(255),
  
  status VARCHAR(50) DEFAULT 'pending',
  user_decision_at TIMESTAMP,
  decision_notes TEXT,
  
  expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '4 hours'),
  
  executed_trade_id UUID REFERENCES trades(id),
  executed_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_approvals_portfolio ON approvals(portfolio_id);
CREATE INDEX idx_approvals_status ON approvals(status);

-- Signals Table (Track All Signals Sent to Users)
CREATE TABLE IF NOT EXISTS signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES portfolios(id),
  agent_id UUID NOT NULL REFERENCES agents(id),
  
  token_symbol VARCHAR(20) NOT NULL,
  recommended_action VARCHAR(255), -- "BUY PUMP at $0.0045"
  entry_price DECIMAL(15, 8),
  target_price DECIMAL(15, 8),
  stop_loss_price DECIMAL(15, 8),
  confidence FLOAT,
  
  signal_data JSONB, -- Full signal details
  
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sent_to_user_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_signals_portfolio ON signals(portfolio_id);
CREATE INDEX idx_signals_agent ON signals(agent_id);

-- Signal Actions (Track User Approval/Rejection Decisions)
CREATE TABLE IF NOT EXISTS signal_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id UUID NOT NULL REFERENCES signals(id),
  portfolio_id UUID NOT NULL REFERENCES portfolios(id),
  user_id UUID NOT NULL REFERENCES users(id),
  
  action VARCHAR(50), -- 'approved', 'rejected', 'ignored'
  user_decision_at TIMESTAMP,
  decision_notes TEXT,
  
  -- If approved, track outcome
  executed_trade_id UUID REFERENCES trades(id),
  executed_at TIMESTAMP,
  outcome VARCHAR(50), -- 'profit', 'loss', 'pending'
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_signal_actions_signal ON signal_actions(signal_id);
CREATE INDEX idx_signal_actions_portfolio ON signal_actions(portfolio_id);
CREATE INDEX idx_signal_actions_user ON signal_actions(user_id);
CREATE INDEX idx_signal_actions_action ON signal_actions(action);

-- Alerts/Notifications Table
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  portfolio_id UUID REFERENCES portfolios(id),
  
  alert_type VARCHAR(50), -- 'signal_sent', 'trade_executed', 'price_alert'
  title VARCHAR(255),
  message TEXT,
  
  signal_id UUID REFERENCES signals(id),
  trade_id UUID REFERENCES trades(id),
  
  sent_to_email BOOLEAN DEFAULT false,
  sent_to_telegram BOOLEAN DEFAULT false,
  sent_to_dashboard BOOLEAN DEFAULT false,
  
  is_read BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_alerts_user ON alerts(user_id);
CREATE INDEX idx_alerts_is_read ON alerts(is_read);

-- Profit Fees Table (1% of profits on FREE tier only)
CREATE TABLE IF NOT EXISTS profit_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES portfolios(id),
  trade_id UUID NOT NULL REFERENCES trades(id),
  user_id UUID NOT NULL REFERENCES users(id),
  
  tier VARCHAR(50) NOT NULL, -- Which tier this fee applies to
  
  -- Trade P&L
  trade_profit DECIMAL(15, 2) NOT NULL, -- Total profit on trade
  fee_percent FLOAT DEFAULT 1.0, -- 1% for free tier
  fee_amount DECIMAL(15, 2) NOT NULL, -- 1% of profit
  user_net_profit DECIMAL(15, 2) NOT NULL, -- profit - fee
  
  -- Payment Details
  fee_wallet_address VARCHAR(255), -- Ikaro's wallet: 4oqT7AvFRrmjyHbMsLBPcYEAYv41CWZab8dovD5Jxkqs
  payment_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'paid', 'failed'
  payment_txn_hash VARCHAR(255),
  paid_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_profit_fees_portfolio ON profit_fees(portfolio_id);
CREATE INDEX idx_profit_fees_trade ON profit_fees(trade_id);
CREATE INDEX idx_profit_fees_user ON profit_fees(user_id);
CREATE INDEX idx_profit_fees_status ON profit_fees(payment_status);
