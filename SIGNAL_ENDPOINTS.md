# Signal Endpoints

All signal endpoints require JWT authentication via `Authorization: Bearer {token}` header.
Signals are recommendations/alerts only - **NO TRADE EXECUTION on platform**.
Users execute trades directly on DEX with their own wallet signature.

## Signal Types

- **BUY**: Buy recommendation for token
- **SELL**: Sell recommendation (take profits, close position)
- **CLOSE**: Close position immediately (risk mitigation)

## Signal Status Flow

```
pending → (user reviews) → approved/rejected
approved → (user executes trade) → executed
```

## POST /api/portfolios/:portfolio_id/signals
Generate new signal (typically called by scanner service, not user-facing).

**Request:**
```json
{
  "agent_id": "agent-uuid",
  "agent_type": "momentum_scalp",
  "token_address": "So11111111111111111111111111111111111111112",
  "token_symbol": "SOL",
  "signal_type": "buy",
  "confidence": 0.82,
  "entry_price": 150.25,
  "stop_loss": 142.50,
  "take_profit": 165.00,
  "position_size_usd": 50,
  "reasoning": "Volume surge 3.2x, RSI healthy, momentum confirmed",
  "market_data": {
    "volumeSurge": 3.2,
    "priceChange": 2.5,
    "rsi": 58,
    "macd": 0.32
  },
  "expires_at": "2026-03-16T16:20:00Z"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "signal": {
      "id": "signal-uuid",
      "portfolio_id": "portfolio-uuid",
      "agent_id": "agent-uuid",
      "agent_type": "momentum_scalp",
      "token_address": "So11111111111111111111111111111111111111112",
      "token_symbol": "SOL",
      "signal_type": "buy",
      "confidence": 0.82,
      "entry_price": 150.25,
      "stop_loss": 142.50,
      "take_profit": 165.00,
      "position_size_usd": 50,
      "reasoning": "Volume surge 3.2x, RSI healthy, momentum confirmed",
      "market_data": {
        "volumeSurge": 3.2,
        "priceChange": 2.5,
        "rsi": 58,
        "macd": 0.32
      },
      "signal_status": "pending",
      "created_at": "2026-03-16T15:20:00Z",
      "expires_at": "2026-03-16T16:20:00Z"
    }
  }
}
```

## GET /api/portfolios/:portfolio_id/signals
Get all pending signals for portfolio (user dashboard view).

**Response (200):**
```json
{
  "success": true,
  "data": {
    "signals": [
      {
        "id": "signal-uuid",
        "agent_type": "momentum_scalp",
        "token_symbol": "SOL",
        "signal_type": "buy",
        "confidence": 0.82,
        "entry_price": 150.25,
        "stop_loss": 142.50,
        "take_profit": 165.00,
        "position_size_usd": 50,
        "reasoning": "Volume surge 3.2x, RSI healthy, momentum confirmed",
        "signal_status": "pending",
        "created_at": "2026-03-16T15:20:00Z"
      }
    ],
    "count": 1
  }
}
```

## GET /api/portfolios/:portfolio_id/signals/:signal_id
Get single signal details.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "signal": {
      "id": "signal-uuid",
      "portfolio_id": "portfolio-uuid",
      "agent_id": "agent-uuid",
      "agent_type": "momentum_scalp",
      "token_address": "So11111111111111111111111111111111111111112",
      "token_symbol": "SOL",
      "signal_type": "buy",
      "confidence": 0.82,
      "entry_price": 150.25,
      "stop_loss": 142.50,
      "take_profit": 165.00,
      "position_size_usd": 50,
      "reasoning": "Volume surge 3.2x, RSI healthy, momentum confirmed",
      "market_data": {
        "volumeSurge": 3.2,
        "priceChange": 2.5,
        "rsi": 58,
        "macd": 0.32
      },
      "signal_status": "pending",
      "created_at": "2026-03-16T15:20:00Z",
      "expires_at": "2026-03-16T16:20:00Z"
    }
  }
}
```

## GET /api/agents/:agent_id/signals
Get all signals by specific agent.

**Query Parameters:**
- `limit` (optional): Number of signals to return (default: 50, max: 200)

**Example:**
```
GET /api/agents/agent-uuid/signals?limit=20
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "signals": [
      {
        "id": "signal-uuid-1",
        "token_symbol": "SOL",
        "signal_type": "buy",
        "confidence": 0.82,
        "signal_status": "executed"
      }
    ],
    "count": 1
  }
}
```

## PUT /api/portfolios/:portfolio_id/signals/:signal_id/approve
User approves signal for execution (SCOUT mode).

**Request:**
```json
{}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "signal": {
      "id": "signal-uuid",
      "signal_status": "approved"
    }
  }
}
```

## PUT /api/portfolios/:portfolio_id/signals/:signal_id/reject
User rejects signal (SCOUT mode).

**Request:**
```json
{}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "signal": {
      "id": "signal-uuid",
      "signal_status": "rejected"
    }
  }
}
```

## PUT /api/portfolios/:portfolio_id/signals/:signal_id/executed
User confirms they executed the trade (signal → trade mapping).

**Request:**
```json
{
  "trade_id": "trade-uuid"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "signal": {
      "id": "signal-uuid",
      "signal_status": "executed"
    }
  }
}
```

## Error Responses

**400 - Bad Request:**
```json
{
  "error": {
    "message": "Invalid signal_type. Must be 'buy', 'sell', or 'close'",
    "statusCode": 400
  }
}
```

**404 - Not Found:**
```json
{
  "error": {
    "message": "Signal not found",
    "statusCode": 404
  }
}
```

## Signal Generation Algorithms

The platform generates signals using 5 different algorithms (one per token agent):

### 1. Momentum Scalp
**High-risk, short-term, volume-driven**
- Triggers on: Volume spike (>1.5x) + positive momentum (>2%) + healthy RSI (40-80)
- Exits on: Strong pump (>5%) + overbought RSI (>80)
- Confidence: 0.60 - 0.95
- Best for: Aggressive traders, fast markets

### 2. Mean Reversion
**Medium-risk, defensive, dip-buying**
- Triggers on: Dip below MA (>3%) + oversold RSI (<35) + lower Bollinger Band touch
- Exits on: Recovery (>2%) + overbought RSI (>70)
- Confidence: 0.50 - 0.85
- Best for: Conservative traders, dip buyers

### 3. Volume Surge
**Medium-high risk, opportunistic, quick exits**
- Triggers on: Massive volume (>2.0x) + increasing trend + positive price + high liquidity (>0.8)
- Exits on: Volume cooling + profits taken (>3%)
- Confidence: 0.65 - 0.90
- Best for: Momentum traders, liquid tokens

### 4. AI Narrative
**Medium risk, theme-driven, growth tokens**
- Triggers on: Strong narrative score (>7/10) + positive sentiment (>60%) + community growth (>10%)
- Exits on: Sentiment cooling (<30%)
- Confidence: 0.55 - 0.88
- Best for: Trend traders, thesis-based investing

### 5. New Launch
**High risk, token launches, pullback bounces**
- Triggers on: Recent launch (<7 days) + pullback opportunity (5-20% down) + holder growth (>50)
- Exits on: Strong pump (>50% from launch)
- Confidence: 0.60 - 0.85
- Best for: Opportunistic traders, launch hunters

## Key Principles

✅ **No Trade Execution:** Platform generates signals, users execute trades on DEX
✅ **User Control:** Users approve/reject every signal (SCOUT mode) or auto-execute (AUTO mode)
✅ **Wallet Integration:** Users connect Phantom/MetaMask, sign all transactions
✅ **Performance Tracking:** Platform tracks outcomes vs signals (for accuracy metrics)
✅ **Transparent Algorithms:** Each signal includes reasoning, market data, confidence score
✅ **Risk Controls:** Each agent respects user-configured position sizing and daily limits
