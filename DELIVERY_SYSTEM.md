# Signal Delivery System

Complete documentation of how signals are delivered to users across multiple channels.

## Architecture Overview

The delivery system consists of 4 layers:

1. **Notification Service** - User preferences, notification storage
2. **Channel Services** - Telegram, Email (pluggable)
3. **Delivery Service** - Orchestrates multi-channel delivery
4. **API Endpoints** - User-facing HTTP endpoints

## Delivery Channels

### 1. Telegram 📱

**What:** Real-time push notifications via Telegram bot
**Best for:** Immediate alerts while on-the-go
**Setup:** User connects Telegram chat ID to platform

#### Format
```
🟢 Signal Alert
Action: BUY $SOL
Agent: Momentum Scalp
Confidence: 🔥 82%

Entry: $150.25
Stop Loss: $142.50
Take Profit: $165.00
Position Size: $50

Reasoning:
Volume surge (3.2x), RSI healthy, momentum confirmed

💡 Review and execute on your connected wallet
(Phantom • MetaMask • Solflare)
```

#### Features
- ✅ Real-time delivery (sub-second)
- ✅ Formatted with emojis and prices
- ✅ Optional inline buttons (for SCOUT mode approval)
- ✅ Rate-limited (Telegram's 30 msg/sec limit)
- ✅ Fallback if delivery fails

### 2. Email 📧

**What:** Formatted HTML email with full details
**Best for:** Record-keeping, detailed review
**Setup:** User's email address (collected at signup)

#### Format
Rich HTML email with:
- Signal details (action, token, confidence)
- Market data (entry, stop loss, take profit)
- Reasoning explanation
- Dashboard link
- Disclaimer about user control

#### Features
- ✅ SMTP/SendGrid integration
- ✅ Beautiful HTML templates
- ✅ Searchable record in inbox
- ✅ Works offline
- ✅ Can include attachments (future)

### 3. Dashboard 📊

**What:** In-app notification inbox
**Best for:** Reviewing all signals in one place
**Setup:** Automatic for all users

#### Features
- ✅ Persistent storage
- ✅ Read/unread tracking
- ✅ Filtering by agent, status
- ✅ Search functionality
- ✅ Real-time updates via WebSocket (future)

---

## Notification Preferences API

### GET /api/notifications/preferences
Get user's notification settings.

**Response:**
```json
{
  "success": true,
  "data": {
    "preferences": {
      "id": "pref-uuid",
      "user_id": "user-uuid",
      "telegram_enabled": true,
      "telegram_chat_id": "123456789",
      "email_enabled": true,
      "email_address": "trader@example.com",
      "dashboard_enabled": true,
      "notify_buy_signals": true,
      "notify_sell_signals": true,
      "notify_close_signals": true,
      "min_confidence_threshold": 0.5,
      "quiet_hours_enabled": true,
      "quiet_hours_start": "23:00",
      "quiet_hours_end": "08:00"
    }
  }
}
```

### PUT /api/notifications/preferences
Update notification preferences.

**Request:**
```json
{
  "min_confidence_threshold": 0.7,
  "quiet_hours_enabled": false,
  "notify_sell_signals": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "preferences": { ... }
  }
}
```

### POST /api/notifications/test
Send test notification to verify settings.

**Request:**
```json
{
  "channel": "telegram"
}
```

**Channels:** `"telegram"` | `"email"` | `"all"`

**Response:**
```json
{
  "success": true,
  "message": "Test notification sent successfully"
}
```

---

## Notification Inbox API

### GET /api/notifications
Get user's notification inbox.

**Query Parameters:**
- `limit` (optional): Number of notifications (default: 50, max: 200)
- `unread` (optional): Show only unread (`true` | `false`)

**Response:**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "notif-uuid",
        "signal_id": "signal-uuid",
        "notification_type": "buy",
        "channels_sent": ["telegram", "email"],
        "message_subject": "🟢 Momentum Scalp - BUY $SOL",
        "message_body": "Signal details...",
        "is_read": false,
        "created_at": "2026-03-16T15:20:00Z"
      }
    ],
    "count": 1
  }
}
```

### PUT /api/notifications/:notification_id/read
Mark notification as read.

**Response:**
```json
{
  "success": true,
  "data": {
    "notification": {
      "id": "notif-uuid",
      "is_read": true,
      "read_at": "2026-03-16T15:25:00Z"
    }
  }
}
```

---

## Telegram Integration

### Connecting Telegram

1. **User starts bot:** `/start` in Telegram bot
2. **Bot sends link:** Platform generates unique connect token
3. **User approves:** User clicks link in browser (logged in)
4. **Bot receives callback:** Chat ID sent to platform
5. **Notifications enabled:** All future signals → Telegram

### Disconnecting Telegram

**Endpoint:**
```
PUT /api/notifications/telegram/disconnect
```

Removes chat ID, stops sending Telegram messages.

### Telegram Bot Setup

**Required environment variables:**
```
TELEGRAM_BOT_TOKEN=your_bot_token_here
```

**Bot commands:**
```
/start    - Start receiving notifications
/stop     - Stop notifications
/test     - Send test notification
/prefs    - Show notification preferences
```

---

## Email Integration

### Supported Providers

**1. SendGrid (Recommended)**
```env
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=sg-xxxxxxxxxxxx
EMAIL_FROM=noreply@strategyagents.io
```

**2. Gmail/SMTP**
```env
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=noreply@strategyagents.io
```

**3. Custom SMTP**
```env
SMTP_HOST=mail.example.com
SMTP_PORT=587
SMTP_USER=user@example.com
SMTP_PASSWORD=password
```

### Email Templates

All emails include:
- ✅ Signal details (action, token, confidence)
- ✅ Technical info (entry, stop loss, take profit)
- ✅ Formatted HTML with branding
- ✅ Dashboard link
- ✅ User control disclaimer
- ✅ Footer with support info

---

## Notification Preferences

### Signal Type Filtering

Users can selectively disable:
- `notify_buy_signals` - Don't send BUY recommendations
- `notify_sell_signals` - Don't send SELL/take profit alerts
- `notify_close_signals` - Don't send CLOSE/risk alerts

### Confidence Threshold

`min_confidence_threshold` (0 - 1.0)

Only send signals with confidence ≥ threshold

Examples:
- `0.0` - All signals
- `0.5` - Medium+ confidence only
- `0.7` - High confidence only
- `0.9` - Very high confidence only

### Quiet Hours

Set time range to suppress notifications:
- `quiet_hours_enabled` - Turn quiet hours on/off
- `quiet_hours_start` - Start time (HH:MM, 24-hour)
- `quiet_hours_end` - End time (HH:MM, 24-hour)

Examples:
- 23:00 - 08:00 (sleep hours)
- 22:00 - 09:00 (extended sleep)
- 18:00 - 09:00 (work-day only)

### Channel Preferences

Each channel can be independently enabled/disabled:
- `telegram_enabled` - Receive Telegram alerts
- `email_enabled` - Receive email alerts
- `dashboard_enabled` - In-app notifications

---

## Delivery Flow

### For Each Signal Generated

```
1. SignalService.generateSignal()
   ↓
2. DeliveryService.sendSignal()
   ↓
3. NotificationService.getPreferences()
   ↓
4. Check if should notify:
   - Signal type enabled?
   - Confidence ≥ threshold?
   - Not in quiet hours?
   ↓
5. Send to each enabled channel:
   - TelegramService.sendMessage()
   - EmailService.sendSignalEmail()
   - NotificationService.createNotification() [dashboard]
   ↓
6. NotificationService.updateDeliveryStatus()
   ↓
7. Log delivery result
```

---

## Rate Limiting & Safeguards

### Per-User Rate Limiting
- Max 100 notifications per day (configurable)
- Burst limit: 10 per minute
- Prevents notification spam

### Channel-Specific Limits
- **Telegram:** 30 messages/second (Telegram API limit)
- **Email:** 100 emails/minute (SendGrid limit, varies)
- **Dashboard:** Unlimited (local DB)

### Delivery Retries
- Failed deliveries logged
- Automatic retry (exponential backoff)
- After 3 failures, mark as failed

---

## Notification History & Analytics

### Storage
- All notifications stored in `notifications` table
- Retained for 90 days
- Searchable, filterable

### Metrics
- Signals sent per agent
- Delivery success rate per channel
- Notification open rate
- User engagement tracking

---

## Development & Testing

### Local Testing

**Test Telegram:**
```bash
# Send test notification
curl -X POST http://localhost:3000/api/notifications/test \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"channel": "telegram"}'
```

**Test Email:**
```bash
# Send test email
curl -X POST http://localhost:3000/api/notifications/test \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"channel": "email"}'
```

### Mock Services
- For development: Mock Telegram/Email responses
- Notifications always stored to dashboard (for testing)
- Set `DISABLE_TELEGRAM=true` to skip real Telegram calls

---

## Deployment

### Production Checklist

- [ ] Set `TELEGRAM_BOT_TOKEN` environment variable
- [ ] Configure email provider (SendGrid or SMTP)
- [ ] Set `EMAIL_FROM` address
- [ ] Configure `FRONTEND_URL` for links
- [ ] Set up email templates
- [ ] Test Telegram bot
- [ ] Test email delivery
- [ ] Monitor delivery logs
- [ ] Set up alerts for failed deliveries

### Monitoring

**Key metrics to track:**
- Delivery success rate per channel
- Average delivery time
- Failed deliveries
- User preferences adoption

---

## Future Enhancements

- [ ] SMS notifications (Twilio)
- [ ] Push notifications (native app)
- [ ] Slack/Discord integration
- [ ] Webhook support (custom integrations)
- [ ] Email digest (daily summary)
- [ ] Notification templates customization
- [ ] Multi-language support
- [ ] Do-not-disturb scheduling (smarter than quiet hours)

---

## Status

**Implemented:** ✅ Complete
- Notification preferences management
- Telegram delivery service
- Email delivery service
- Multi-channel orchestration
- Notification inbox

**Testing:** 🔲 Pending (Phase 3)
**Live:** 🔲 Pending user approval

---

**Total Endpoints Added:** 7
- GET /api/notifications/preferences
- PUT /api/notifications/preferences
- GET /api/notifications
- PUT /api/notifications/:notification_id/read
- POST /api/notifications/test
- PUT /api/notifications/telegram/connect
- PUT /api/notifications/telegram/disconnect
