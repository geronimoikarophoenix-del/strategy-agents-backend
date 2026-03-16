# Portfolio Endpoints

All portfolio endpoints require JWT authentication via `Authorization: Bearer {token}` header.

## POST /api/portfolios
Create new portfolio.

**Request:**
```json
{
  "name": "My Trading Portfolio",
  "description": "Conservative strategy mix",
  "overall_risk_level": "moderate",
  "tier": "free"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "portfolio": {
      "id": "uuid-here",
      "user_id": "user-uuid",
      "name": "My Trading Portfolio",
      "description": "Conservative strategy mix",
      "tier": "free",
      "overall_risk_level": "moderate",
      "signals_sent_today": 0,
      "signals_sent_lifetime": 0,
      "signal_accuracy": 0,
      "daily_pnl": 0,
      "weekly_pnl": 0,
      "monthly_pnl": 0,
      "lifetime_pnl": 0,
      "win_rate": 0,
      "total_user_trades": 0,
      "is_active": true,
      "is_trading": true,
      "created_at": "2026-03-16T15:07:00Z",
      "updated_at": "2026-03-16T15:07:00Z"
    }
  }
}
```

## GET /api/portfolios
Get all portfolios for authenticated user.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "portfolios": [
      {
        "id": "uuid-here",
        "user_id": "user-uuid",
        "name": "My Trading Portfolio",
        "tier": "free",
        "daily_pnl": 0,
        "lifetime_pnl": 0,
        "win_rate": 0,
        "total_user_trades": 0,
        "created_at": "2026-03-16T15:07:00Z"
      }
    ]
  }
}
```

## GET /api/portfolios/:id
Get single portfolio details.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "portfolio": {
      "id": "uuid-here",
      "user_id": "user-uuid",
      "name": "My Trading Portfolio",
      "description": "Conservative strategy mix",
      "tier": "free",
      "overall_risk_level": "moderate",
      "signals_sent_today": 5,
      "signals_sent_lifetime": 45,
      "signal_accuracy": 0.62,
      "daily_pnl": 45.23,
      "weekly_pnl": 120.50,
      "monthly_pnl": 250.75,
      "lifetime_pnl": 1250.50,
      "win_rate": 0.62,
      "total_user_trades": 21,
      "is_active": true,
      "is_trading": true,
      "created_at": "2026-03-16T15:07:00Z",
      "updated_at": "2026-03-16T16:07:00Z"
    }
  }
}
```

## PUT /api/portfolios/:id
Update portfolio settings.

**Request:**
```json
{
  "name": "Updated Portfolio Name",
  "overall_risk_level": "aggressive",
  "is_trading": false
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "portfolio": {
      "id": "uuid-here",
      "name": "Updated Portfolio Name",
      "overall_risk_level": "aggressive",
      "is_trading": false,
      "updated_at": "2026-03-16T16:10:00Z"
    }
  }
}
```

## DELETE /api/portfolios/:id
Delete portfolio (removes all associated agents, positions, trades, and signals).

**Response (200):**
```json
{
  "success": true,
  "message": "Portfolio deleted successfully"
}
```

## Error Responses

**400 - Bad Request:**
```json
{
  "error": {
    "message": "Portfolio name is required",
    "statusCode": 400
  }
}
```

**404 - Not Found:**
```json
{
  "error": {
    "message": "Portfolio not found",
    "statusCode": 404
  }
}
```

**409 - Conflict:**
```json
{
  "error": {
    "message": "Portfolio with this name already exists",
    "statusCode": 409
  }
}
```

## Portfolio Metrics Explained

- **signals_sent_today**: Signals generated today (resets at midnight)
- **signals_sent_lifetime**: Total signals generated ever
- **signal_accuracy**: % of signals that users executed profitably
- **daily_pnl**: User's total P&L today
- **lifetime_pnl**: User's total P&L since portfolio creation
- **win_rate**: % of user's executed trades that were profitable
- **total_user_trades**: Total number of trades user executed
