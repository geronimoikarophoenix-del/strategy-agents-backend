# Strategy Agents Backend

Multi-Agent Trading Strategy SaaS Backend (Node.js + Express + PostgreSQL)

## Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Installation

1. Clone and navigate to backend directory
```bash
cd backend
npm install
```

2. Configure environment
```bash
cp .env.example .env
# Edit .env with your database credentials
```

3. Initialize database
```bash
# Create database
createdb strategy_agents

# Run migrations
npm run migrate
```

4. Start development server
```bash
npm run dev
```

Server will run on `http://localhost:3000`

## Project Structure

```
src/
├── controllers/    # Request handlers
├── services/       # Business logic
├── models/         # Database models
├── routes/         # API routes
├── middleware/     # Express middleware
├── agents/         # Trading agent implementations
├── websocket/      # Real-time updates
├── config/         # Configuration
├── utils/          # Utility functions
└── app.ts          # Express app setup

sql/
├── 001_init_schema.sql
├── 002_seed_data.sql
└── migrations/

tests/
├── unit/
└── integration/
```

## Architecture

- **Frontend:** React 18 (Vercel)
- **Backend:** Node.js + Express (Railway)
- **Database:** PostgreSQL (Supabase)
- **Real-time:** Socket.io
- **Auth:** JWT + bcrypt
- **Trading:** Solana Web3.js

## API Endpoints (41 Total)

### Authentication (4)
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`

### Development/Admin (2)
- `POST /dev/cron/scan-now` - Manually trigger signal scanner
- `GET /dev/cron/status` - Check cron job status

### Portfolios (5)
- `POST /api/portfolios`
- `GET /api/portfolios`
- `GET /api/portfolios/:id`
- `PUT /api/portfolios/:id`
- `DELETE /api/portfolios/:id`

### Agents (6)
- `POST /api/portfolios/:portfolio_id/agents`
- `GET /api/portfolios/:portfolio_id/agents`
- `GET /api/portfolios/:portfolio_id/agents/:agent_id`
- `PUT /api/portfolios/:portfolio_id/agents/:agent_id/mode`
- `PUT /api/portfolios/:portfolio_id/agents/:agent_id/toggle`
- `PUT /api/portfolios/:portfolio_id/agents/:agent_id/settings`

### Signals (8)
- `POST /api/portfolios/:portfolio_id/signals`
- `GET /api/portfolios/:portfolio_id/signals`
- `GET /api/portfolios/:portfolio_id/signals/:signal_id`
- `GET /api/agents/:agent_id/signals`
- `PUT /api/portfolios/:portfolio_id/signals/:signal_id/approve`
- `PUT /api/portfolios/:portfolio_id/signals/:signal_id/reject`
- `PUT /api/portfolios/:portfolio_id/signals/:signal_id/executed`

### Trades (9)
- `POST /api/portfolios/:portfolio_id/trades` - Create trade
- `GET /api/portfolios/:portfolio_id/trades` - List trades (with status filter)
- `GET /api/portfolios/:portfolio_id/trades/:trade_id` - Get trade details
- `PUT /api/portfolios/:portfolio_id/trades/:trade_id/close` - Close trade
- `PUT /api/portfolios/:portfolio_id/trades/:trade_id/abandon` - Abandon trade
- `PUT /api/portfolios/:portfolio_id/trades/:trade_id/notes` - Update notes
- `GET /api/portfolios/:portfolio_id/performance` - Portfolio summary
- `GET /api/agents/:agent_id/stats` - Agent statistics
- `POST /api/portfolios/:portfolio_id/trades/:trade_id/check-triggers` - Check stop/TP

### Notifications (7)
- `GET /api/notifications/preferences` - Get preferences
- `PUT /api/notifications/preferences` - Update preferences
- `GET /api/notifications` - Get notification inbox
- `PUT /api/notifications/:id/read` - Mark as read
- `POST /api/notifications/test` - Send test alert
- `PUT /api/notifications/telegram/connect` - Connect Telegram
- `PUT /api/notifications/telegram/disconnect` - Disconnect Telegram

### Approvals (SCOUT mode) - Coming Next
- `GET /api/approvals/:portfolio_id/pending`
- `POST /api/approvals/:approval_id/approve`
- `POST /api/approvals/:approval_id/reject`

## Development

### Running Tests
```bash
npm test
```

### Building for Production
```bash
npm run build
npm start
```

### Database Migrations
```bash
npm run migrate
```

## Deployment

### Railway.app Setup
1. Connect GitHub repository
2. Set environment variables
3. Railway auto-deploys on push
4. Database provisioned automatically

## Environment Variables

See `.env.example` for full list. Key variables:

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `SOLANA_RPC_URL` - Solana RPC endpoint
- `FRONTEND_URL` - Frontend URL for CORS

## Architecture Model

**USER-CUSTODIED, SIGNAL-ONLY (2026-03-16)**

- Users connect own wallet (Phantom, MetaMask, etc)
- Users sign all transactions directly (no platform keys)
- Platform provides **signals only** (recommendations)
- Trades execute on DEX (Raydium, Orca) — user controls everything
- **Zero fund custody** — users own/control all funds
- **User liability** — responsible for losses, wallet security
- **Platform liability** — signal accuracy only
- No money transmitter license needed
- No custodial liability

## Status

### Week 2 (CORE BACKEND COMPLETE)
- [x] Project initialization
- [x] Database schema (USER-CUSTODIED model)
- [x] Environment setup
- [x] Architecture revision & approval
- [x] Auth system (JWT + bcrypt) ✅
  - [x] Auth service (register, login, token generation)
  - [x] Auth controller (HTTP handlers)
  - [x] Auth middleware (JWT verification)
  - [x] Auth routes (POST /register, POST /login, GET /me, POST /logout)
- [x] Portfolio CRUD (Create, Read, Update, Delete) ✅
  - [x] Portfolio service (all CRUD + metrics)
  - [x] Portfolio controller (HTTP handlers)
  - [x] Portfolio routes (5 endpoints)
  - [x] Documentation (PORTFOLIO_ENDPOINTS.md)
- [x] Agent configuration & management ✅
  - [x] Agent service (8 default configs, configure, toggle, mode, settings, performance)
  - [x] Agent controller (HTTP handlers)
  - [x] Agent routes (6 endpoints)
  - [x] Documentation (AGENT_ENDPOINTS.md)
- [x] Signal generation engine ✅
  - [x] Signal service (5 algorithms: Momentum Scalp, Mean Reversion, Volume Surge, AI Narrative, New Launch)
  - [x] Signal controller (HTTP handlers)
  - [x] Signal routes (8 endpoints)
  - [x] Documentation (SIGNAL_ENDPOINTS.md, SIGNAL_ALGORITHMS.md)
- [x] Signal delivery service ✅
  - [x] Notification service (preferences, inbox management)
  - [x] Telegram delivery service
  - [x] Email delivery service (SendGrid/SMTP)
  - [x] Delivery orchestration service
  - [x] Notification controller (HTTP handlers)
  - [x] Notification routes (7 endpoints)
  - [x] Documentation (DELIVERY_SYSTEM.md)
- [x] Trade tracking & profit fee calculation ✅
  - [x] Trade service (create, close, abandon, P&L calculation)
  - [x] Trade controller (HTTP handlers)
  - [x] Trade routes (9 endpoints)
  - [x] Portfolio performance summary
  - [x] Agent statistics
  - [x] Stop loss/take profit checking
  - [x] Documentation (TRADE_ENDPOINTS.md)
- [x] Real-time WebSocket events ✅
  - [x] WebSocket service (event broadcasting)
  - [x] Socket.io authentication middleware
  - [x] Event handlers (connect/disconnect/subscribe)
  - [x] 7 real-time event types (signals, trades, notifications, etc.)
  - [x] Documentation (WEBSOCKET_GUIDE.md)
- [x] Signal scanner cron ✅
  - [x] Scanner service (automated signal generation)
  - [x] Cron service (job scheduling)
  - [x] Cron routes (manual triggers for testing)
  - [x] 3 cron jobs (scanner, daily reset, hourly update)
  - [x] Documentation (SCANNER_GUIDE.md)

## Notes

- All API endpoints require JWT authentication
- Database operations use connection pooling
- Error handling via AppError class
- Real-time updates via Socket.io
- **NO wallet/fund management** — user controls funds
- **NO transaction execution** — platform provides signals only
- **NO private key storage** — user manages own keys
- Rate limiting on auth endpoints (planned)

---

**Build Authorization:** 
- ✅ Build & test freely (local/staging)
- ✅ Request input on optimizations
- ❌ NO spending without explicit approval
- ❌ NO live deployment without explicit approval
