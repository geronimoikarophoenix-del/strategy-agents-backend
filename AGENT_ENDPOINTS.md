# Agent Endpoints

All agent endpoints require JWT authentication via `Authorization: Bearer {token}` header.
Agents are nested under portfolios: `/api/portfolios/:portfolio_id/agents`

## POST /api/portfolios/:portfolio_id/agents
Configure new agent for portfolio.

**Valid Agent Types:**
- `momentum_scalp` - High-risk, volume-driven
- `mean_reversion` - Medium-risk, defensive
- `volume_surge` - Medium-high risk, opportunistic
- `ai_narrative` - Medium risk, theme-driven
- `new_launch` - High risk, token launches
- `sports_scout` - Prediction markets (SCOUT mode)
- `social_events_scout` - Social events (SCOUT mode)
- `crypto_markets_scout` - Crypto macro (SCOUT mode)

**Request:**
```json
{
  "agent_type": "momentum_scalp"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "agent": {
      "id": "agent-uuid",
      "portfolio_id": "portfolio-uuid",
      "agent_type": "momentum_scalp",
      "agent_name": "Momentum Scalp",
      "mode": "auto",
      "is_enabled": true,
      "max_trade_size_usd": null,
      "max_daily_budget_usd": null,
      "max_daily_trades": null,
      "stop_loss_pct": null,
      "take_profit_pct": null,
      "max_concurrent_positions": 1,
      "use_staged_exits": true,
      "staged_exit_1_pct": 5,
      "staged_exit_1_sell_pct": 0.5,
      "staged_exit_2_pct": 10,
      "staged_exit_2_sell_pct": 0.25,
      "total_trades": 0,
      "winning_trades": 0,
      "losing_trades": 0,
      "win_rate": null,
      "total_pnl": 0,
      "created_at": "2026-03-16T15:07:00Z",
      "updated_at": "2026-03-16T15:07:00Z"
    }
  }
}
```

## GET /api/portfolios/:portfolio_id/agents
Get all agents for portfolio.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "agents": [
      {
        "id": "agent-uuid",
        "agent_type": "momentum_scalp",
        "agent_name": "Momentum Scalp",
        "mode": "auto",
        "is_enabled": true,
        "win_rate": 0.68,
        "total_trades": 7,
        "total_pnl": 125.50
      }
    ]
  }
}
```

## GET /api/portfolios/:portfolio_id/agents/:agent_id
Get single agent details.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "agent": {
      "id": "agent-uuid",
      "portfolio_id": "portfolio-uuid",
      "agent_type": "momentum_scalp",
      "agent_name": "Momentum Scalp",
      "mode": "auto",
      "is_enabled": true,
      "max_trade_size_usd": 50,
      "max_daily_budget_usd": 100,
      "max_daily_trades": 5,
      "stop_loss_pct": -10,
      "take_profit_pct": null,
      "max_concurrent_positions": 1,
      "use_staged_exits": true,
      "staged_exit_1_pct": 5,
      "staged_exit_1_sell_pct": 0.5,
      "staged_exit_2_pct": 10,
      "staged_exit_2_sell_pct": 0.25,
      "total_trades": 7,
      "winning_trades": 5,
      "losing_trades": 2,
      "win_rate": 0.714,
      "total_pnl": 125.50,
      "last_scan_at": "2026-03-16T15:05:00Z",
      "last_trade_at": "2026-03-16T14:30:00Z"
    }
  }
}
```

## PUT /api/portfolios/:portfolio_id/agents/:agent_id/mode
Change agent mode between AUTO and SCOUT.

**Request:**
```json
{
  "mode": "scout"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "agent": {
      "id": "agent-uuid",
      "mode": "scout",
      "updated_at": "2026-03-16T15:10:00Z"
    }
  }
}
```

## PUT /api/portfolios/:portfolio_id/agents/:agent_id/toggle
Enable or disable agent.

**Request:**
```json
{
  "enabled": false
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "agent": {
      "id": "agent-uuid",
      "is_enabled": false,
      "updated_at": "2026-03-16T15:10:00Z"
    }
  }
}
```

## PUT /api/portfolios/:portfolio_id/agents/:agent_id/settings
Update agent customizable settings.

**Request:**
```json
{
  "max_trade_size_usd": 75,
  "max_daily_budget_usd": 250,
  "stop_loss_pct": -8,
  "max_concurrent_positions": 2,
  "staged_exit_1_pct": 7,
  "staged_exit_1_sell_pct": 0.6
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "agent": {
      "id": "agent-uuid",
      "max_trade_size_usd": 75,
      "max_daily_budget_usd": 250,
      "stop_loss_pct": -8,
      "max_concurrent_positions": 2,
      "staged_exit_1_pct": 7,
      "staged_exit_1_sell_pct": 0.6,
      "updated_at": "2026-03-16T15:10:00Z"
    }
  }
}
```

## Error Responses

**400 - Bad Request:**
```json
{
  "error": {
    "message": "Invalid agent type: unknown_agent",
    "statusCode": 400
  }
}
```

**404 - Not Found:**
```json
{
  "error": {
    "message": "Agent not found",
    "statusCode": 404
  }
}
```

## Agent Modes

- **AUTO**: Agent automatically executes trades when signals are found
- **SCOUT**: Agent sends alerts to user, waits for approval before executing

## Default Configurations

Each agent type has default settings that are applied on creation:

- **Token agents (1-5):** AUTO mode, staged exits enabled
- **Prediction scouts (6-8):** SCOUT mode, no staged exits
- **Customization:** Users can override any setting per agent

## Performance Tracking

Each agent tracks:
- `total_trades`: Total number of trades executed by this agent
- `winning_trades`: Number of profitable trades
- `losing_trades`: Number of losing trades
- `win_rate`: Percentage of profitable trades
- `total_pnl`: Total profit/loss from this agent
- `last_scan_at`: When the agent last scanned for signals
- `last_trade_at`: When the agent last executed a trade
