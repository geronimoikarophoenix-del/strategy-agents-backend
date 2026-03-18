# Database Initialization Guide

**Status:** ✅ **Ready to Deploy**

---

## What Changed (Fixed)

### **Previous Approach (Crashed)**
- Used manual client connection management
- Complex async/await with error handling
- Silent failures (couldn't see actual error)
- Server would crash on startup

### **New Approach (Bulletproof)**
- Uses existing `query()` pool (already works)
- Executes statements sequentially
- Logs each step for debugging
- **Server starts even if init fails** → Manual fallback available
- Graceful error handling

---

## How It Works Now

### **On Server Startup**

```
1. App starts
2. initializeDatabase() runs
3. For each SQL statement:
   ✅ Execute it
   ✅ Log success
   OR
   ⚠️  Already exists? Skip (idempotent)
   OR
   ❌ Real error? Log it, continue anyway
4. Return success/failure flag
5. Server listens on port 3000
6. If init failed: Log warning + instructions
```

**Key:** Server doesn't crash. If tables don't exist, user can manually create them.

---

## Deployment Steps

### **Step 1: Push Updated Code to Railway**

```bash
cd /data/.openclaw/workspace/products/backend
git push origin master
```

Railway will auto-detect the commit and redeploy (~2-3 min).

### **Step 2: Check Railway Logs**

1. Go to: https://railway.app/dashboard
2. Click `strategy-agents-backend` service
3. Go to **"Deploy Logs"**
4. Look for one of these messages:

**✅ Success:**
```
✅ Server running on port 3000
✅ Database schema initialized successfully
```

**⚠️ Warning (fallback needed):**
```
✅ Server running on port 3000
⚠️  Database auto-init failed. If login doesn't work, manually run SQL...
```

### **Step 3A: If Init Succeeded ✅**

1. Go to frontend: https://strategy-agents-frontend.vercel.app
2. Login with:
   ```
   Email: ikaro@test.com
   Password: TestPass123
   ```
3. ✅ **DONE** — all 8 tabs should work

### **Step 3B: If Init Failed ⚠️ (Manual Fallback)**

The server still runs, but login will fail (no tables). Use Railway's SQL editor to create tables manually:

1. Go to: https://railway.app/dashboard
2. Click your `strategy-agents-backend` project
3. Go to the **PostgreSQL service** (separate from backend service)
4. Click **"Connect"** → Choose **"PostgreSQL GUI"** or **"Editor"**
5. A SQL editor should open
6. Copy the entire SQL from this file and paste it:
   - Location: `/data/.openclaw/workspace/products/backend/sql/001_init_schema_manual.sql`
   - **OR** use the full SQL below (Section: "Raw SQL for Manual Setup")
7. Click **"Execute"** or **"Run"**
8. Tables are created instantly ✅
9. Go to frontend and test login — should work now!

---

## Raw SQL for Manual Setup

If you need to manually create the tables, copy this entire block and paste into Railway's PostgreSQL editor:

```sql
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Portfolios table
CREATE TABLE IF NOT EXISTS portfolios (
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
);

-- Agents table
CREATE TABLE IF NOT EXISTS agents (
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
);

-- Signals table
CREATE TABLE IF NOT EXISTS signals (
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
);

-- Trades table
CREATE TABLE IF NOT EXISTS trades (
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
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255),
  message TEXT,
  type VARCHAR(50),
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Profit fees table
CREATE TABLE IF NOT EXISTS profit_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trade_id UUID REFERENCES trades(id),
  profit_usd DECIMAL(15,2),
  fee_usd DECIMAL(15,2),
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_portfolios_user_id ON portfolios(user_id);
CREATE INDEX IF NOT EXISTS idx_agents_portfolio_id ON agents(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_signals_portfolio_id ON signals(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_signals_agent_id ON signals(agent_id);
CREATE INDEX IF NOT EXISTS idx_trades_portfolio_id ON trades(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_profit_fees_user_id ON profit_fees(user_id);
```

---

## Troubleshooting

### **Problem: "Request failed with status code 500"**

**Cause:** Database tables don't exist

**Solution:**
1. Check Railway logs (see Step 2 above)
2. If "Database auto-init failed" warning → use manual SQL (Step 3B)
3. Paste SQL into Railway PostgreSQL editor
4. Test login again

### **Problem: "Cannot find table 'users'"**

**Cause:** Manual SQL didn't run or failed

**Solution:**
1. Check Railway PostgreSQL editor for errors
2. Verify all 7 CREATE TABLE statements executed
3. Try executing one statement at a time (easier to debug)

### **Problem: "Email already exists"**

**Cause:** Test user already created from previous test

**Solution:** Use different email for next test:
```
Email: ikaro2@test.com (or any different email)
Password: TestPass123
```

---

## Verification

After deployment, confirm everything works:

1. ✅ Backend responds: `https://strategy-agents-backend-production.up.railway.app/health`
2. ✅ Frontend loads: `https://strategy-agents-frontend.vercel.app`
3. ✅ Login works: ikaro@test.com / TestPass123
4. ✅ All 8 tabs load (Portfolio, Signal, Trade, Agent, Performance, Notification, Wallet, Settings)

---

## Summary

✅ **Code is ready to deploy**
✅ **Server will start even if init fails**
✅ **Manual fallback SQL provided**
✅ **Clear error messages if problems occur**

**Next Step:** Generate a new GitHub token, push the code to GitHub, and Railway will auto-deploy! 🚀
