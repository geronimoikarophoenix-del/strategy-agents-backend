# WebSocket Guide - Real-Time Events

Real-time event broadcasting via Socket.io for live signal alerts, trade updates, and portfolio changes.

---

## Connection

### Connect to WebSocket

```javascript
import io from 'socket.io-client';

const token = localStorage.getItem('authToken'); // JWT from login

const socket = io('http://localhost:3000', {
  auth: {
    token: token
  }
});

socket.on('connect', () => {
  console.log('Connected to server');
});

socket.on('error', (error) => {
  console.error('Connection error:', error);
});
```

### Authentication

WebSocket connections require JWT token:

```javascript
// Option 1: Via auth param
const socket = io('http://localhost:3000', {
  auth: { token: 'your_jwt_token' }
});

// Option 2: Via query param
const socket = io('http://localhost:3000', {
  query: { token: 'your_jwt_token' }
});
```

---

## Rooms & Subscriptions

### Subscribe to Portfolio

```javascript
// Join portfolio-specific room
socket.emit('subscribe:portfolio', 'portfolio-uuid');

// Listen for portfolio subscription confirmation
socket.on('subscribed:portfolio', (data) => {
  console.log('Subscribed to portfolio:', data.portfolioId);
});
```

### Unsubscribe from Portfolio

```javascript
socket.emit('unsubscribe:portfolio', 'portfolio-uuid');

socket.on('unsubscribed:portfolio', (data) => {
  console.log('Unsubscribed from portfolio:', data.portfolioId);
});
```

---

## Events

### Signal Generated

Real-time alert when a new signal is generated.

```javascript
socket.on('signal:generated', (data) => {
  console.log('New signal:', {
    signal: data.signal,
    portfolioId: data.portfolioId,
    timestamp: data.timestamp
  });

  // Signal object:
  // {
  //   id: 'signal-uuid',
  //   agentType: 'momentum_scalp',
  //   tokenSymbol: 'SOL',
  //   signalType: 'buy' | 'sell' | 'close',
  //   confidence: 0.82,
  //   reasoning: '...',
  //   entryPrice: 150.25,
  //   stopLoss: 142.50,
  //   takeProfit: 165.00
  // }
});
```

**When:** Agent generates buy/sell/close signal
**Frequency:** Every 5 minutes (scanner runs)
**Include:** Full signal details for immediate action

---

### Trade Created

Alert when user creates a new trade from signal.

```javascript
socket.on('trade:created', (data) => {
  console.log('Trade created:', {
    trade: data.trade,
    portfolioId: data.portfolioId
  });

  // Trade object:
  // {
  //   id: 'trade-uuid',
  //   tokenSymbol: 'SOL',
  //   entryPrice: 150.25,
  //   entryAmountUsd: 50,
  //   status: 'open',
  //   pnl: null,
  //   pnlPercent: null
  // }
});
```

**When:** User executes trade from dashboard
**Frequency:** On-demand (user action)
**Include:** Entry details, initial status

---

### Trade Closed

Alert when trade is closed with P&L calculated.

```javascript
socket.on('trade:closed', (data) => {
  console.log('Trade closed:', {
    trade: data.trade,
    portfolioId: data.portfolioId
  });

  // Trade object:
  // {
  //   id: 'trade-uuid',
  //   tokenSymbol: 'SOL',
  //   exitPrice: 158.50,
  //   pnl: 2.80,
  //   pnlPercent: 5.6
  // }
});
```

**When:** User closes position
**Frequency:** On-demand (user action)
**Include:** Exit price, P&L, percentage return

---

### Trade Abandoned

Alert when user abandons a trade.

```javascript
socket.on('trade:abandoned', (data) => {
  console.log('Trade abandoned:', {
    trade: data.trade,
    portfolioId: data.portfolioId
  });
});
```

**When:** User gives up on a trade
**Frequency:** On-demand (user action)
**Include:** Trade ID, reason (optional)

---

### Notification Received

Real-time in-app notification alert.

```javascript
socket.on('notification:received', (data) => {
  console.log('New notification:', {
    notification: data.notification,
    timestamp: data.timestamp
  });

  // Notification object:
  // {
  //   id: 'notif-uuid',
  //   type: 'buy' | 'sell' | 'close',
  //   subject: '🟢 Momentum Scalp - BUY $SOL',
  //   message: 'Full notification text...'
  // }
});
```

**When:** User receives signal alert (Telegram, Email, Dashboard)
**Frequency:** Every signal
**Include:** Notification metadata, full message

---

### Portfolio Updated

Portfolio performance metrics updated.

```javascript
socket.on('portfolio:updated', (data) => {
  console.log('Portfolio updated:', {
    portfolioId: data.portfolioId,
    metrics: data.metrics,
    timestamp: data.timestamp
  });

  // Metrics object:
  // {
  //   totalTrades: 15,
  //   winRate: 71.4,
  //   totalPnL: 145.50,
  //   dailyPnL: 28.75
  // }
});
```

**When:** Trade closes, daily reset, hourly update
**Frequency:** Every trade close, hourly
**Include:** Win rate, total P&L, daily P&L

---

### Agent Updated

Agent performance/status changed.

```javascript
socket.on('agent:updated', (data) => {
  console.log('Agent updated:', {
    agent: data.agent,
    portfolioId: data.portfolioId,
    timestamp: data.timestamp
  });

  // Agent object:
  // {
  //   id: 'agent-uuid',
  //   agentType: 'momentum_scalp',
  //   mode: 'auto' | 'scout',
  //   isEnabled: true,
  //   totalTrades: 7,
  //   winRate: 68.5
  // }
});
```

**When:** Agent enabled/disabled, mode changed, stats updated
**Frequency:** On-demand or hourly
**Include:** Agent type, mode, stats

---

## Example: Complete Real-Time Flow

```javascript
import io from 'socket.io-client';

class TradingDashboard {
  constructor(token, portfolioId) {
    this.socket = io('http://localhost:3000', { auth: { token } });
    this.portfolioId = portfolioId;
    this.setupListeners();
  }

  setupListeners() {
    // Connection
    this.socket.on('connect', () => {
      console.log('Connected, subscribing to portfolio...');
      this.socket.emit('subscribe:portfolio', this.portfolioId);
    });

    // Signals
    this.socket.on('signal:generated', (data) => {
      console.log('🔔 New signal:', data.signal.signalType, data.signal.tokenSymbol);
      this.showAlert(data.signal);
      this.updateUI();
    });

    // Trades
    this.socket.on('trade:created', (data) => {
      console.log('📍 Trade opened:', data.trade.tokenSymbol);
      this.updateTradeList();
    });

    this.socket.on('trade:closed', (data) => {
      console.log('📊 Trade closed:', data.trade.pnl > 0 ? '✅ WIN' : '❌ LOSS');
      this.updateTradeList();
      this.updateMetrics();
    });

    // Portfolio
    this.socket.on('portfolio:updated', (data) => {
      console.log('📈 Portfolio: ', data.metrics.totalPnL);
      this.updatePerformance(data.metrics);
    });

    // Notifications
    this.socket.on('notification:received', (data) => {
      console.log('💬', data.notification.subject);
      this.addToInbox(data.notification);
    });

    // Errors
    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });
  }

  showAlert(signal) {
    // Show visual alert to user
  }

  updateUI() {
    // Refresh signals list
  }

  updateTradeList() {
    // Refresh open/closed trades
  }

  updateMetrics() {
    // Update win rate, P&L
  }

  updatePerformance(metrics) {
    // Update performance dashboard
  }

  addToInbox(notification) {
    // Add to notification inbox
  }

  disconnect() {
    this.socket.disconnect();
  }
}

// Usage
const dashboard = new TradingDashboard(token, portfolioId);
```

---

## Development Testing

### Manual Signal Generation

```bash
# Trigger signal scanner manually (for testing)
curl -X POST http://localhost:3000/dev/cron/scan-now

# Response:
# {
#   "success": true,
#   "data": {
#     "signalsGenerated": 5,
#     "elapsedMs": 234
#   }
# }
```

### Check Cron Status

```bash
curl -X GET http://localhost:3000/dev/cron/status

# Response:
# {
#   "success": true,
#   "data": {
#     "message": "Cron jobs are running",
#     "jobs": [
#       { "name": "signal-scanner", "interval": "5 minutes" },
#       { "name": "daily-metrics-reset", "interval": "24 hours (at midnight UTC)" },
#       { "name": "performance-update", "interval": "1 hour" }
#     ]
#   }
# }
```

---

## Event Frequency Guide

| Event | Trigger | Frequency |
|-------|---------|-----------|
| signal:generated | Scanner runs | Every 5 minutes |
| trade:created | User action | On-demand |
| trade:closed | User action | On-demand |
| trade:abandoned | User action | On-demand |
| notification:received | Signal sent | Every signal (per channel) |
| portfolio:updated | Trade closed, hourly | Every trade + hourly |
| agent:updated | Settings change, hourly | On-demand + hourly |

---

## Connection Best Practices

✅ **DO:**
- Store token securely (localStorage for web, secure storage for mobile)
- Subscribe to relevant portfolio rooms
- Handle reconnection gracefully
- Implement exponential backoff on reconnect failures
- Unsubscribe from rooms when not needed

❌ **DON'T:**
- Send tokens in URL query params (use auth object)
- Leave subscriptions active for closed portfolios
- Store sensitive data in browser console
- Ignore WebSocket errors
- Make blocking operations on event handlers

---

## Error Handling

```javascript
socket.on('error', (error) => {
  if (error.includes('Authentication')) {
    // JWT expired or invalid
    // Redirect to login, refresh token
  } else if (error.includes('Connection')) {
    // Network error, will retry automatically
  }
});

socket.on('disconnect', (reason) => {
  if (reason === 'io server disconnect') {
    // Server disconnected client
  } else if (reason === 'io client namespace disconnect') {
    // Client manually disconnected
  } else {
    // Network failure, will auto-reconnect
  }
});
```

---

## Performance Considerations

- Socket.io has built-in reconnection (with exponential backoff)
- Events are batched when possible
- Dashboard update debouncing recommended (50-100ms)
- Real-time updates are complementary to REST API polling
- WebSocket connection is persistent (vs HTTP's request/response)

---

## Future Enhancements

🔲 Private messaging between users
🔲 Leaderboards (real-time rankings)
🔲 Group portfolio sharing
🔲 Alert customization (sound, vibration, desktop notify)
🔲 Trading chat/collaboration
🔲 Analytics streaming

---

**Status:** ✅ Ready for integration
**Tested:** Manual + integration tests
**Next:** Frontend WebSocket client integration
