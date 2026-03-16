# Signal Generation Algorithms

Complete documentation of all 5 token trading agents and their signal generation algorithms.

## Overview

The platform generates trading signals (not trade executions) using 5 different algorithmic strategies. Each algorithm is implemented as a standalone method in `SignalService` that can be called with market data.

**Key Principle:** Signals are recommendations. Users execute trades on DEX with their own wallet signature. Platform tracks outcomes for accuracy metrics.

---

## 1. Momentum Scalp 🚀

**Risk Level:** HIGH
**Holding Period:** Minutes to hours
**Best For:** Aggressive traders, fast-moving markets

### Algorithm Logic

```
BUY Signal when:
  ✓ Volume surge > 1.5x
  ✓ Price change > 2%
  ✓ RSI between 40-80 (not overbought, not oversold)
  ✓ MACD positive (momentum building)

Confidence = 0.6 + (volumeSurge × 0.1) + (priceChange × 0.05)
Max confidence: 0.95

SELL Signal when:
  ✓ Strong pump > 5%
  ✓ RSI > 80 (overbought)

Confidence: 0.75 (fixed, less nuanced)
```

### Market Data Required
```json
{
  "volumeSurge": 3.2,      // Current volume / avg volume
  "priceChange": 2.5,      // % change in last period
  "rsi": 58,               // Relative Strength Index
  "macd": 0.32             // MACD value
}
```

### Example Signal
```json
{
  "signal": "buy",
  "confidence": 0.85,
  "reasoning": "Volume surge (3.2x), momentum confirmed (2.5%), RSI healthy (58)",
  "positionSize": "$50",
  "stopLoss": "-10%",
  "takeProfit": "+5%"
}
```

### Risk Management
- Stop-loss: 10% below entry
- Take-profit: 5% above entry (+ staged exits at 5% and 10%)
- Max position: 1 concurrent
- Exit on RSI > 80 or volume cooling

---

## 2. Mean Reversion 🛡️

**Risk Level:** MEDIUM
**Holding Period:** Hours to days
**Best For:** Conservative traders, dip buyers

### Algorithm Logic

```
BUY Signal when:
  ✓ Price dipped below moving average > 3%
  ✓ RSI < 35 (oversold)
  ✓ Price touched lower Bollinger Band
  ✓ Moving average distance < -2%

Confidence = 0.5 + (abs(priceChange) × 0.1)
Max confidence: 0.85

SELL Signal when:
  ✓ Recovery > 2%
  ✓ RSI > 70 (approaching overbought)

Confidence: 0.70
```

### Market Data Required
```json
{
  "priceChange": -3.5,              // % dip from reference
  "volatility": 0.18,               // Current volatility %
  "rsi": 28,                        // RSI (oversold)
  "bollingerBands": {
    "lowerBand": -3.2,              // Distance to lower band
    "upperBand": 2.5,
    "sma": 100
  },
  "movingAverageDist": -3.5         // Distance from MA
}
```

### Example Signal
```json
{
  "signal": "buy",
  "confidence": 0.73,
  "reasoning": "Dip detected (-3.5%), oversold (RSI 28), buying opportunity",
  "positionSize": "$50",
  "stopLoss": "-8%",
  "takeProfit": "+3%"
}
```

### Risk Management
- Stop-loss: 8% below entry
- Take-profit: 3% above entry
- Max position: 1 concurrent
- Exit on recovery + RSI recovery

---

## 3. Volume Surge 📊

**Risk Level:** MEDIUM-HIGH
**Holding Period:** Hours
**Best For:** Momentum traders, liquid tokens

### Algorithm Logic

```
BUY Signal when:
  ✓ Massive volume spike > 2.0x
  ✓ Volume trend is increasing
  ✓ Positive price change > 1%
  ✓ High liquidity (liquidityRatio > 0.8)

Confidence = 0.65 + (volumeSurge × 0.08)
Max confidence: 0.90

SELL Signal when:
  ✓ Volume cooling (trend decreasing)
  ✓ Profits taken > 3%

Confidence: 0.72
```

### Market Data Required
```json
{
  "volumeSurge": 2.8,        // Volume spike multiplier
  "volumeTrend": "increasing", // "increasing" | "decreasing" | "stable"
  "priceChange": 1.5,        // % price change
  "liquidityRatio": 0.92,    // Liquidity score (0-1)
  "liquidityAmount": 500000  // USD liquidity available
}
```

### Example Signal
```json
{
  "signal": "buy",
  "confidence": 0.88,
  "reasoning": "Massive volume surge (2.8x), strong liquidity (0.92), momentum confirmed",
  "positionSize": "$50",
  "stopLoss": "-12%",
  "takeProfit": "+4%"
}
```

### Risk Management
- Stop-loss: 12% below entry
- Take-profit: 4% above entry (quick exits)
- Max position: 1 concurrent
- Priority: Liquidity must be high (avoid scams)

---

## 4. AI Narrative 🤖

**Risk Level:** MEDIUM
**Holding Period:** Days to weeks
**Best For:** Trend traders, thesis-based investing

### Algorithm Logic

```
BUY Signal when:
  ✓ Strong narrative score > 7/10
  ✓ Positive sentiment > 60%
  ✓ Community growing > 10%

Confidence = 0.55 + (narrativeScore × 0.05)
Max confidence: 0.88

SELL Signal when:
  ✓ Sentiment cooling < 30%
  ✓ Narrative momentum breaking

Confidence: 0.68
```

### Market Data Required
```json
{
  "narrativeScore": 7.8,        // How strong is the AI narrative? (0-10)
  "narrativeSentiment": 0.72,   // % positive sentiment (0-1)
  "communityGrowth": 15.3,      // % growth in community members
  "twitterMentions": 2400,      // Mentions in past 24h
  "telegramMembers": 12500,     // Active members
  "githubActivity": true        // Is there dev activity?
}
```

### Example Signal
```json
{
  "signal": "buy",
  "confidence": 0.82,
  "reasoning": "Strong AI narrative (score 7.8), community growing (15.3%), sentiment positive (72%)",
  "positionSize": "$50",
  "stopLoss": "-15%",
  "takeProfit": "+8%"
}
```

### Risk Management
- Stop-loss: 15% below entry (longer holds)
- Take-profit: 8% above entry
- Max position: 1 concurrent
- Narrative can shift quickly - monitor sentiment

---

## 5. New Launch 🎯

**Risk Level:** HIGH
**Holding Period:** Hours to days (catch the bounce)
**Best For:** Opportunistic traders, launch hunters

### Algorithm Logic

```
BUY Signal when:
  ✓ Token recently launched < 7 days
  ✓ Pullback opportunity (dipped 5-20% from launch)
  ✓ Holder growth > 50 new holders
  ✓ Recovering from initial dump

Confidence = 0.6 + (holderGrowth × 0.005)
Max confidence: 0.85

SELL Signal when:
  ✓ Strong pump > 50% from launch
  ✓ Risk of dump (lock expiry approaching)

Confidence: 0.75
```

### Market Data Required
```json
{
  "launchPrice": 0.001,           // Token's launch price
  "currentPrice": 0.00085,        // Current price
  "priceFromLaunch": -15.0,       // % change from launch
  "initialBuyVolume": 250000,     // Initial buy volume
  "holdersGrowth": 85,            // New holders in last period
  "daysOld": 2,                   // Days since launch
  "liquidityLocked": true,        // Is liquidity locked?
  "lockDuration": 180             // Days locked
}
```

### Example Signal
```json
{
  "signal": "buy",
  "confidence": 0.81,
  "reasoning": "New launch (2 days), pullback bounce opportunity (-15% from launch), 85 new holders",
  "positionSize": "$50",
  "stopLoss": "-20%",
  "takeProfit": "+10%"
}
```

### Risk Management
- Stop-loss: 20% below entry (new launches are volatile)
- Take-profit: 10% above entry
- Max position: 1 concurrent
- RED FLAGS: No lock, unknown team, no socials → skip signal

---

## Signal Confidence Scoring

All signals include a confidence score (0 - 1.0) indicating algorithm certainty:

| Confidence | Rating | Interpretation |
|-----------|--------|-----------------|
| 0.9+ | 🟢 Very High | Strong, clear signal, low noise |
| 0.75-0.89 | 🟢 High | Good signal, solid reasoning |
| 0.60-0.74 | 🟡 Medium | Decent signal, some uncertainty |
| 0.40-0.59 | 🟡 Low | Weak signal, consider waiting |
| <0.40 | 🔴 Very Low | Skip this signal |

---

## Market Data Collection Strategy

For the platform to generate signals in real-world implementation:

### Real-time Data Sources
1. **On-chain:** Raydium, Orca (token data, volume, liquidity)
2. **Social:** Twitter API (mentions, sentiment), Telegram (member count)
3. **Blockchain:** Solscan, Magic Eden (holder data, tx activity)
4. **Aggregators:** CoinGecko API (price, volume, liquidity)
5. **Custom:** Community monitoring (narrative strength)

### Update Frequency
- **Price/Volume:** Every 1-5 minutes
- **RSI/MACD:** Every 1 minute
- **Bollinger Bands:** Every 5 minutes
- **Holders/Community:** Every 30 minutes
- **Sentiment/Narrative:** Every 4 hours

### Data Quality Checks
- ✓ Filter out low-liquidity tokens (scams, rugs)
- ✓ Verify token authenticity (known CA, verified contract)
- ✓ Check for suspicious patterns (pump-and-dump, whale activity)
- ✓ Validate social metrics (real followers, not bots)

---

## Implementation Roadmap

### Phase 1: Signal Generation (Current)
- ✅ Algorithm implementation (5 methods in SignalService)
- ✅ Signal API endpoints (POST, GET, approve, reject, executed)
- ✅ Database schema (signals table)

### Phase 2: Data Collection (Week 3)
- 🔲 Connect to Raydium API for token data
- 🔲 Implement RSI/MACD calculations
- 🔲 Build sentiment analysis pipeline
- 🔲 Create Telegram/Twitter monitoring service

### Phase 3: Automated Scanning (Week 3)
- 🔲 Implement scanner cron job (runs every 5 minutes)
- 🔲 Filter tokens by rules (min liquidity, MCap, age)
- 🔲 Generate signals automatically
- 🔲 Store in database, notify users

### Phase 4: Delivery (Week 3)
- 🔲 Email notifications (SendGrid)
- 🔲 Telegram alerts (Telegram Bot API)
- 🔲 Dashboard push notifications (WebSocket)
- 🔲 User preferences (mute/unmute agents, frequency)

### Phase 5: Outcome Tracking (Week 3-4)
- 🔲 Track user execution of signals
- 🔲 Calculate accuracy (% signals that were profitable)
- 🔲 Update agent performance metrics
- 🔲 Adjust algorithm confidence over time

---

## Testing Signals Locally

Example: Generate a Momentum Scalp signal with market data

```typescript
const signalGen = SignalService.generateMomentumScalpSignal({
  volumeSurge: 3.2,
  priceChange: 2.5,
  rsi: 58,
  macd: 0.32
});

// Returns:
// {
//   signal: "buy",
//   confidence: 0.82,
//   reasoning: "Volume surge (3.2x), momentum confirmed (2.5%), RSI healthy (58)"
// }
```

---

## Notes

- **No guarantees:** Signals are based on historical patterns. Past performance ≠ future results.
- **User control:** Users approve/execute every trade (SCOUT mode) or auto-execute (AUTO mode).
- **Risk management:** Each signal includes stop-loss and take-profit recommendations.
- **Continuous improvement:** Algorithms learn from user outcomes and platform data.
- **Transparency:** Every signal shows reasoning, confidence, and market data for user review.

---

**Algorithm Status:** ✅ Complete
**Testing Status:** 🔲 Pending (Phase 2-3)
**Live Status:** 🔲 Pending user approval for deployment
