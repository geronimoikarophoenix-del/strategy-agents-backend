# Signal Scanner - Automated Generation Guide

Automated signal generation via background cron jobs. The scanner runs periodically, fetches market data, runs signal algorithms, and broadcasts alerts in real-time.

---

## How It Works

### Flow Diagram

```
Server Startup
  ↓
CronService.startAll()
  ├── Signal Scanner (every 5 min)
  ├── Daily Metrics Reset (at midnight)
  └── Performance Update (every 1 hour)
  ↓
Signal Scanner Loop (every 5 min):
  ├── Query all active portfolios with enabled agents
  ├── For each agent:
  │   ├── Fetch market data (token price, volume, RSI, etc.)
  │   ├── Run signal algorithm (Momentum Scalp, Mean Reversion, etc.)
  │   ├── If signal generated:
  │   │   ├── Store signal in database
  │   │   ├── Deliver via notification (Telegram, Email, Dashboard)
  │   │   └── Broadcast via WebSocket
  │   └── Update agent performance metrics
  └── Log results
```

---

## Cron Jobs

### 1. Signal Scanner (Every 5 Minutes)

**What:** Generate trading signals from market data
**When:** Every 5 minutes (configurable)
**Capacity:** Up to 100 portfolios per run
**Latency:** < 10 seconds (should complete in 5 sec)

```
Input:  Market data (price, volume, RSI, etc.)
Process: Run 5 signal algorithms
Output: Signals → Database + Notifications + WebSocket
```

### 2. Daily Metrics Reset (At Midnight UTC)

**What:** Reset daily counters for all portfolios
**When:** 00:00 UTC every day
**Affected Fields:**
- `signals_sent_today` → 0
- `daily_pnl` → 0

### 3. Performance Update (Every 1 Hour)

**What:** Recalculate portfolio performance metrics
**When:** Every hour
**Affected Fields:**
- `win_rate`
- `total_pnl`
- `total_trades`
- Agent performance stats

---

## Market Data

### Current Implementation (Mock)

The scanner currently uses **mock market data** for development. 

```javascript
// Mock data in scanner.service.ts
const marketData = {
  tokenAddress: 'So11111...',
  tokenSymbol: 'SOL',
  currentPrice: 150 + Math.random() * 50,
  volumeSurge: 1.2 + Math.random() * 2,
  priceChange: -2 + Math.random() * 5,
  rsi: 20 + Math.random() * 60,
  macd: -0.5 + Math.random() * 1,
  volatility: 0.1 + Math.random() * 0.3,
  liquidityRatio: 0.5 + Math.random() * 0.5,
  holdersCount: 1000 + Math.random() * 9000,
  daysOld: Math.random() * 30
};
```

### Production Implementation (TODO)

Replace mock data with real APIs:

```javascript
// TODO: Real market data from Raydium/Orca
async getMarketData(agentType) {
  // 1. Fetch from Raydium API
  const raydium = await fetch('https://api.raydium.io/...');
  const price = raydium.data.price;
  const volume = raydium.data.volume24h;
  
  // 2. Calculate technical indicators
  const rsi = calculateRSI(prices);
  const macd = calculateMACD(prices);
  
  // 3. Fetch on-chain data
  const holders = await fetchHolderCount(tokenAddress);
  const liquidity = await fetchLiquidity(tokenAddress);
  
  // 4. Fetch social metrics (if AI Narrative agent)
  const sentiment = await fetchTwitterSentiment(tokenSymbol);
  
  return {
    currentPrice: price,
    volumeSurge: volume / avgVolume,
    rsi,
    macd,
    liquidityRatio,
    holdersCount: holders,
    narrativeSentiment: sentiment
  };
}
```

---

## Signal Generation Flow

### For Each Enabled Agent

```javascript
// 1. Fetch market data for relevant tokens
const marketData = await getMarketData(agent.agentType);

// 2. Run signal algorithm
const signal = generateSignalForAgent(agent.agentType, marketData);

if (signal && signal.confidence > MIN_THRESHOLD) {
  // 3. Store in database
  const savedSignal = await SignalService.generateSignal(...);
  
  // 4. Deliver to user
  await DeliveryService.sendSignal(
    userId,
    savedSignal.id,
    agent.agentType,
    marketData.tokenSymbol,
    signal.signalType,
    signal.confidence,
    signal.reasoning,
    signal.metadata
  );
  
  // 5. Broadcast via WebSocket
  WebSocketService.broadcastSignal(userId, portfolioId, {
    ...savedSignal,
    timestamp: new Date()
  });
}
```

---

## Configuration

### Environment Variables

```bash
# Scanner intervals (optional, defaults to hardcoded)
SCANNER_INTERVAL_MINUTES=5          # How often scanner runs
METRICS_RESET_HOUR=0                # UTC hour for daily reset
PERFORMANCE_UPDATE_INTERVAL=60      # Minutes between updates

# Market data
RAYDIUM_API_URL=https://api.raydium.io
ORCA_API_URL=https://orca.so/api
TWITTER_API_KEY=...

# Rate limiting
MAX_PORTFOLIOS_PER_RUN=100
MAX_SIGNALS_PER_AGENT_PER_RUN=1
SCANNER_TIMEOUT_SECONDS=30
```

### Code Configuration

Edit `scanner.service.ts`:

```typescript
// Lines 20-30: Intervals
const SCANNER_INTERVAL = 5 * 60 * 1000; // 5 minutes
const DAILY_RESET_HOUR = 0;             // Midnight UTC
const PERFORMANCE_INTERVAL = 60 * 60 * 1000; // 1 hour

// Lines 50-70: Market data tokens
const tokens = [
  { symbol: 'SOL', address: 'So11111...' },
  { symbol: 'BONK', address: 'DezXAZ8...' },
  // Add more tokens here
];

// Lines 100-150: Signal thresholds
const MIN_CONFIDENCE = 0.50;  // Skip signals below 50%
const MAX_SIGNALS_PER_AGENT = 1; // Max 1 signal per agent per run
```

---

## Testing

### Manual Scanner Trigger

Manually run scanner for immediate testing:

```bash
curl -X POST http://localhost:3000/dev/cron/scan-now \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "signalsGenerated": 5,
    "elapsedMs": 234
  }
}
```

### Check Cron Status

Verify that cron jobs are running:

```bash
curl -X GET http://localhost:3000/dev/cron/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Cron jobs are running",
    "jobs": [
      { "name": "signal-scanner", "interval": "5 minutes" },
      { "name": "daily-metrics-reset", "interval": "24 hours (at midnight UTC)" },
      { "name": "performance-update", "interval": "1 hour" }
    ]
  }
}
```

### Local Testing

```typescript
// In your test file
import CronService from './services/cron.service';

// Test single scan
const result = await CronService.scanNow();
console.log('Signals generated:', result.signalsGenerated);

// Test all cron jobs
CronService.startAll();
// ... wait for crons to run ...
CronService.stopAll();
```

---

## Database Schema

### Signals Table

```sql
CREATE TABLE signals (
  id UUID PRIMARY KEY,
  portfolio_id UUID NOT NULL REFERENCES portfolios(id),
  agent_id UUID NOT NULL REFERENCES agents(id),
  agent_type VARCHAR NOT NULL,
  token_address VARCHAR NOT NULL,
  token_symbol VARCHAR NOT NULL,
  signal_type VARCHAR NOT NULL, -- 'buy', 'sell', 'close'
  confidence FLOAT NOT NULL,    -- 0-1
  entry_price FLOAT,
  stop_loss FLOAT,
  take_profit FLOAT,
  position_size_usd FLOAT,
  reasoning TEXT NOT NULL,
  market_data JSONB,            -- Raw market data
  signal_status VARCHAR,        -- 'pending', 'approved', 'rejected', 'executed'
  created_at TIMESTAMP,
  expires_at TIMESTAMP,         -- Signal expires after 30 min
  INDEX(portfolio_id),
  INDEX(agent_id),
  INDEX(created_at),
  INDEX(signal_status)
);
```

### Scanning Optimization

```sql
-- Index for scanner queries
CREATE INDEX idx_enabled_agents 
  ON agents(portfolio_id, is_enabled, mode)
  WHERE is_enabled = true;

-- Index for signal lookups
CREATE INDEX idx_pending_signals 
  ON signals(portfolio_id, signal_status)
  WHERE signal_status = 'pending';
```

---

## Performance Notes

### Scan Time Breakdown

```
500 active portfolios × 5 enabled agents = 2,500 agent scans per run
├── Fetch market data: 1 sec
├── Run algorithms: 0.5 sec (5 algorithms × 100ms each)
├── Database writes: 1 sec
├── Notification delivery: 2 sec (Telegram, Email, Dashboard)
└── WebSocket broadcast: 0.5 sec
= ~5 seconds per scan (OK for 5 min interval)
```

### Optimization Tips

1. **Batch market data fetches** - Query multiple tokens at once from Raydium
2. **Cache technical indicators** - Store RSI, MACD for 1 minute
3. **Filter inactive portfolios** - Skip if user hasn't logged in 7 days
4. **Prioritize by activity** - Scan active portfolios first
5. **Queue signals** - Process notifications asynchronously

---

## Deployment

### Development (Local)

```bash
npm run dev
# Cron jobs start automatically
# Manual trigger: curl POST /dev/cron/scan-now
```

### Staging/Production

```bash
npm run build
npm start
# Cron jobs start on server startup
# Development endpoints (/dev/cron) should be protected by admin auth
```

### Monitoring

Set up alerts for:
- ⚠️ Scanner takes > 10 seconds
- ⚠️ Scanner fails (error rate > 5%)
- ⚠️ Signal delivery fails for > 10 users
- ⚠️ Metrics reset didn't run (detected via timestamps)

---

## Known Limitations

🔲 **Mock data only** - Currently uses random data, not real market data
🔲 **Single server** - Cron only runs on main server (no distribution)
🔲 **No signal deduplication** - Could generate same signal twice
🔲 **No backtesting** - Signals not tested against historical data
🔲 **No ML feedback** - Algorithms don't learn from outcomes

---

## Future Enhancements

📋 **Real market data** - Connect to Raydium, Orca, Magic Eden APIs
📋 **Distributed scanning** - Run scanner on multiple workers (Bull queue)
📋 **Advanced filtering** - Skip low-liquidity/new tokens
📋 **Backtesting** - Test signals against 1-year historical data
📋 **ML model** - Improve algorithms based on user execution outcomes
📋 **Customizable intervals** - Per-portfolio or per-agent scan frequency
📋 **Signal pipeline** - Queue, validation, enrichment stages

---

## Support

**Development testing:**
- Manual trigger: `POST /dev/cron/scan-now`
- Check status: `GET /dev/cron/status`

**Debugging:**
- Check logs: `tail -f logs/scanner.log`
- Verify database: `SELECT COUNT(*) FROM signals WHERE created_at > NOW() - interval '5 min'`
- Monitor WebSocket: Browser DevTools → Network → WS

**Troubleshooting:**
- Scanner not running? Check server logs for startup errors
- No signals generated? Check if agents are enabled + portfolios active
- Signals not delivered? Check user preferences + notification config
- WebSocket events not received? Verify token + room subscription

---

**Status:** ✅ Implemented (mock data)
**Next:** Production market data integration
