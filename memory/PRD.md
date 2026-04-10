# MarketPulse AI - Product Requirements Document

## Original Problem Statement
Build a full stack app that can predict stocks just with the name or ticker, and it also takes photos and analyzes them to tell you what it expects the stock to do and its recommendation to you, and it also sends you notifications on if it thinks you should urgently sell or buy a stock based on market patterns and it uses candlestick patterns, it will have at least 500 candlestick patterns memorized, can run on a server locally and use claude or openai for the predictions.

**Additional Requirements (Phase 2):**
- Cron to scan news hourly DURING TRADING HOURS ONLY (9:30 AM - 4:00 PM EST, Mon-Fri)
- First run of day scans news from hours since last run, subsequent scans look at last hour
- Recommendations for 30%+ potential moves with notifications
- Email, Discord, SMS notifications (very urgent: all 3, mildly urgent: discord, regular: email)
- Daily scan of top 30 stocks' candlestick patterns with >75% confidence alerts

## User Choices
- **AI Model**: OpenAI GPT-5.2 for predictions
- **Image Analysis**: Both manual upload and live charts
- **Stock Data**: Yahoo Finance (FREE, no API key required)
- **Notifications**: Discord webhook, Email (Resend), SMS (Twilio) - configurable in settings

## What's Been Implemented (January 2026)

### Backend Features ✅
- FastAPI server with /api prefix routing
- MongoDB integration for predictions, notifications, settings
- **1323+ candlestick patterns** database (exceeded 500 requirement)
- Yahoo Finance integration (FREE real-time data)
- OpenAI GPT-5.2 integration via Emergent LLM key
- Pattern detection from candlestick data
- Image analysis endpoint for chart uploads
- **Automated Cron Jobs**:
  - Hourly news scan during trading hours (Mon-Fri 9:30 AM - 4:00 PM EST)
  - Daily pattern scan of top 30 stocks at 10 AM EST
- **Multi-channel Notification System**:
  - Critical (30%+ moves): Email + Discord + SMS
  - High: Email + Discord
  - Medium: Discord only
  - Low: Email only
- Settings API for configuring notification channels

### Frontend Features ✅
- Dark theme professional trading dashboard
- Stock search with Yahoo Finance autocomplete
- Real-time price display (OHLC, volume, market cap)
- 30-day price chart (Recharts)
- AI Analysis panel with confidence, risk level, expected move
- Chart image upload with AI analysis
- **Settings Modal**:
  - Market status display (open/closed)
  - Discord webhook configuration
  - Email (Resend) configuration
  - SMS (Twilio) configuration
  - Enable/disable notifications toggle
  - Manual scan triggers (News, Pattern)
  - Last scan timestamps
- Notifications panel with severity indicators

### API Endpoints
- `GET /api/health` - Health check with market status
- `GET /api/market-status` - Trading hours info
- `GET /api/settings` - Get notification settings
- `PUT /api/settings` - Update notification settings
- `POST /api/settings/test-discord` - Test Discord webhook
- `POST /api/settings/test-email` - Test email notification
- `POST /api/scan/news` - Trigger manual news scan
- `POST /api/scan/patterns` - Trigger manual pattern scan
- `GET /api/scans` - Get scan history
- `GET /api/search` - Stock search
- `GET /api/stock/{ticker}` - Stock quote
- `POST /api/predict/{ticker}` - AI prediction
- `POST /api/analyze-chart` - Chart image analysis
- `GET /api/notifications` - Get alerts
- `GET /api/history` - Prediction history

## Automated Scan Schedule
- **News Scan**: Every hour at :30 during market hours (Mon-Fri 9:30 AM - 4:00 PM EST)
- **Pattern Scan**: Daily at 10:00 AM EST (Mon-Fri)
- Scans skip automatically when market is closed

## Next Tasks
1. Configure Discord webhook in settings for real-time alerts
2. Add Resend API key for email notifications
3. Add Twilio credentials for SMS alerts
4. Monitor automated scans during market hours
