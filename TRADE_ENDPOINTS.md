# Trade Endpoints

All trade endpoints require JWT authentication via `Authorization: Bearer {token}` header.
Trades are nested under portfolios: `/api/portfolios/:portfolio_id/trades`

**Important:** Platform does NOT execute trades. Users execute trades on DEX with their wallet. These endpoints track outcomes and calculate P&L.

---

## POST /api/portfolios/:portfolio_id/trades
Record trade execution (user executed from signal).

**Request:**
```json
{
  "signal_id": "signal-uuid",
  "agent_id": "agent-uuid",
  "token_address": "So11111111111111111111111111111111111111112",
  "token_symbol": "SOL",
  "entry_price": 150.25,
  "entry_amount_usd": 50,
  "stop_loss_price": 142.50,
  "take_profit_price": 165.00,
  "notes": "Bought on volume surge signal"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "trade": {
      "id": "trade-uuid",
      "portfolio_id": "portfolio-uuid",
      "signal_id": "signal-uuid",
      "agent_id": "agent-uuid",
      "token_address": "So11111111111111111111111111111111111111112",
      "token_symbol": "SOL",
      "entry_price": 150.25,
      "entry_amount_usd": 50,
      "entry_at": "2026-03-16T15:20:00Z",
      "exit_price": null,
      "exit_amount_usd": null,
      "exit_at": null,
      "status": "open",
      "pnl": null,
      "pnl_percent": null,
      "stop_loss_price": 142.50,
      "take_profit_price": 165.00,
      "notes": "Bought on volume surge signal",
      "created_at": "2026-03-16T15:20:00Z",
      "updated_at": "2026-03-16T15:20:00Z"
    }
  }
}
```

---

## GET /api/portfolios/:portfolio_id/trades
Get all trades for portfolio.

**Query Parameters:**
- `status` (optional): `"open"` | `"closed"` | `"abandoned"`
- `limit` (optional): Number of trades (default: 100, max: 500)

**Example:**
```
GET /api/portfolios/portfolio-uuid/trades?status=closed&limit=50
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "trades": [
      {
        "id": "trade-uuid",
        "token_symbol": "SOL",
        "entry_price": 150.25,
        "entry_amount_usd": 50,
        "exit_price": 158.50,
        "exit_amount_usd": 52.80,
        "status": "closed",
        "pnl": 2.80,
        "pnl_percent": 5.6,
        "entry_at": "2026-03-16T15:20:00Z",
        "exit_at": "2026-03-16T16:30:00Z"
      }
    ],
    "count": 1
  }
}
```

---

## GET /api/portfolios/:portfolio_id/trades/:trade_id
Get single trade details.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "trade": {
      "id": "trade-uuid",
      "portfolio_id": "portfolio-uuid",
      "signal_id": "signal-uuid",
      "agent_id": "agent-uuid",
      "agent_type": "momentum_scalp",
      "token_symbol": "SOL",
      "entry_price": 150.25,
      "entry_amount_usd": 50,
      "entry_at": "2026-03-16T15:20:00Z",
      "exit_price": 158.50,
      "exit_amount_usd": 52.80,
      "exit_at": "2026-03-16T16:30:00Z",
      "status": "closed",
      "pnl": 2.80,
      "pnl_percent": 5.6,
      "stop_loss_price": 142.50,
      "take_profit_price": 165.00,
      "notes": "Bought on volume surge signal, sold at resistance",
      "created_at": "2026-03-16T15:20:00Z",
      "updated_at": "2026-03-16T16:30:00Z"
    }
  }
}
```

---

## PUT /api/portfolios/:portfolio_id/trades/:trade_id/close
Close trade with exit price (user closed position).

**Request:**
```json
{
  "exit_price": 158.50,
  "exit_amount_usd": 52.80
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "trade": {
      "id": "trade-uuid",
      "status": "closed",
      "exit_price": 158.50,
      "exit_amount_usd": 52.80,
      "exit_at": "2026-03-16T16:30:00Z",
      "pnl": 2.80,
      "pnl_percent": 5.6
    }
  }
}
```

---

## PUT /api/portfolios/:portfolio_id/trades/:trade_id/abandon
Abandon trade without recording exit (give up on the trade).

**Request:**
```json
{}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "trade": {
      "id": "trade-uuid",
      "status": "abandoned",
      "notes": "Abandoned due to stop loss trigger"
    }
  }
}
```

---

## PUT /api/portfolios/:portfolio_id/trades/:trade_id/notes
Update trade notes/comments.

**Request:**
```json
{
  "notes": "Sold at resistance after pump. Good signal confirmation."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "trade": {
      "id": "trade-uuid",
      "notes": "Sold at resistance after pump. Good signal confirmation."
    }
  }
}
```

---

## GET /api/portfolios/:portfolio_id/performance
Get portfolio performance summary (across all closed trades).

**Response (200):**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalTrades": 15,
      "winningTrades": 10,
      "losingTrades": 4,
      "abandonedTrades": 1,
      "winRate": 71.4,
      "totalPnL": 145.50,
      "averagePnLPercent": 3.85,
      "largestWin": 28.50,
      "largestLoss": -12.30,
      "avgWinSize": 18.45,
      "avgLossSize": -6.08
    }
  }
}
```

**Metrics Explained:**
- **totalTrades**: All trades (open + closed + abandoned)
- **winningTrades**: Trades with profit
- **losingTrades**: Trades with loss
- **abandonedTrades**: Trades given up on
- **winRate**: % of closed trades that were profitable
- **totalPnL**: Total profit/loss in USD
- **averagePnLPercent**: Average % gain/loss per trade
- **largestWin**: Biggest single profit
- **largestLoss**: Biggest single loss
- **avgWinSize**: Average profit per winning trade
- **avgLossSize**: Average loss per losing trade

---

## GET /api/agents/:agent_id/stats
Get agent performance statistics (signal accuracy, execution rate).

**Response (200):**
```json
{
  "success": true,
  "data": {
    "stats": {
      "totalSignals": 45,
      "executedTrades": 28,
      "winRate": 68.5,
      "totalPnL": 245.75,
      "avgPnLPercent": 4.2,
      "profitFactor": 2.15
    }
  }
}
```

**Metrics Explained:**
- **totalSignals**: All signals sent by agent
- **executedTrades**: Signals user actually traded on
- **winRate**: % of executed trades that were profitable
- **totalPnL**: Total profit/loss from agent trades
- **avgPnLPercent**: Average % gain/loss per trade
- **profitFactor**: Ratio of gross profit / gross loss
  - > 2.0: Very profitable
  - 1.5 - 2.0: Good
  - 1.0 - 1.5: Acceptable
  - < 1.0: Unprofitable

---

## POST /api/portfolios/:portfolio_id/trades/:trade_id/check-triggers
Check if stop loss or take profit triggered at current price.

**Request:**
```json
{
  "current_price": 142.30
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "triggered": true,
    "type": "stop_loss"
  }
}
```

or

```json
{
  "success": true,
  "data": {
    "triggered": false
  }
}
```

---

## Error Responses

**400 - Bad Request:**
```json
{
  "error": {
    "message": "Missing required fields: signal_id, agent_id, token_address, token_symbol, entry_price, entry_amount_usd",
    "statusCode": 400
  }
}
```

**404 - Not Found:**
```json
{
  "error": {
    "message": "Trade not found",
    "statusCode": 404
  }
}
```

**409 - Conflict:**
```json
{
  "error": {
    "message": "Trade already closed",
    "statusCode": 409
  }
}
```

---

## Trade Status Flow

```
User gets signal
  ↓
User executes trade on DEX (with wallet signature)
  ↓
POST /api/trades (create, status = "open")
  ↓
User monitors position
  ↓
[Either]
  ├─ User closes position on DEX
  │  ├─ PUT /api/trades/:id/close (status = "closed", calculates P&L)
  │  └─ 1% profit fee recorded (if FREE tier + profitable)
  │
  ├─ Stop loss triggers
  │  ├─ PUT /api/trades/:id/close (with stop loss price)
  │  └─ Status = "closed"
  │
  ├─ Take profit triggers
  │  ├─ PUT /api/trades/:id/close (with take profit price)
  │  └─ Status = "closed"
  │
  └─ User gives up
     └─ PUT /api/trades/:id/abandon (status = "abandoned", no P&L)
```

---

## Integration Example

**Complete workflow:**

```bash
# 1. User sees signal
curl -X GET http://localhost:3000/api/portfolios/{id}/signals?status=pending \
  -H "Authorization: Bearer {token}"

# 2. User approves signal
curl -X PUT http://localhost:3000/api/portfolios/{id}/signals/{signal_id}/approve \
  -H "Authorization: Bearer {token}"

# 3. User executes trade on DEX with their wallet (off-platform)

# 4. User records trade in platform
curl -X POST http://localhost:3000/api/portfolios/{id}/trades \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "signal_id": "{signal_id}",
    "agent_id": "{agent_id}",
    "token_address": "...",
    "token_symbol": "SOL",
    "entry_price": 150.25,
    "entry_amount_usd": 50,
    "stop_loss_price": 142.50,
    "take_profit_price": 165.00
  }'

# 5. User closes position on DEX

# 6. User records exit in platform
curl -X PUT http://localhost:3000/api/portfolios/{id}/trades/{trade_id}/close \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "exit_price": 158.50,
    "exit_amount_usd": 52.80
  }'

# 7. Platform calculates P&L and records profit fee (if applicable)
# 8. Check portfolio performance
curl -X GET http://localhost:3000/api/portfolios/{id}/performance \
  -H "Authorization: Bearer {token}"
```

---

## P&L Calculation

```
P&L = Exit Amount - Entry Amount
P&L % = (P&L / Entry Amount) * 100

Example:
  Entry: $50 at $150.25
  Exit: $52.80 at $158.50
  
  P&L = $52.80 - $50.00 = $2.80
  P&L % = ($2.80 / $50.00) * 100 = 5.6%
```

---

## Profit Fee Calculation (FREE Tier Only)

```
If Portfolio Tier = "free" AND P&L > 0:
  Fee = P&L * 1%
  User Keeps = P&L - Fee
  Fee Wallet = ikaro_sol_address

Example:
  Trade P&L: $100
  Fee (1%): $1.00
  User Keeps: $99.00
```

No fee on losses or for paid tiers.

---

## Note on Trade Execution

**Key Principle:** Platform provides signals and tracking only.

✅ User connects Phantom/MetaMask wallet
✅ User sees signal in dashboard
✅ User approves signal (SCOUT mode) or auto-executes (AUTO mode)
✅ User signs transaction on DEX with their wallet
✅ User controls all funds - never held by platform
✅ User records trade outcome in platform
✅ Platform calculates P&L and metrics

❌ Platform never controls funds
❌ Platform never signs transactions
❌ Platform never executes trades
❌ Platform never holds private keys

---

**Total Trade Endpoints:** 8
- POST (create)
- GET (list)
- GET (single)
- PUT (close)
- PUT (abandon)
- PUT (notes)
- GET (portfolio performance)
- GET (agent stats)
- POST (check triggers)
