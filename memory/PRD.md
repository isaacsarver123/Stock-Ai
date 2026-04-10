# MarketPulse AI - Product Requirements Document

## Original Problem Statement
Build a full stack app that can predict stocks just with the name or ticker, and it also takes photos and analyzes them to tell you what it expects the stock to do and its recommendation to you, and it also sends you notifications on if it thinks you should urgently sell or buy a stock based on market patterns and it uses candlestick patterns, it will have at least 500 candlestick patterns memorized, can run on a server locally and use claude or openai for the predictions.

## User Choices
- **AI Model**: OpenAI GPT-5.2 for predictions
- **Image Analysis**: Both manual upload and Alpha Vantage live charts
- **Notifications**: In-app notifications (default)
- **Stock Data**: Alpha Vantage API with demo data fallback

## User Personas
1. **Day Trader**: Needs quick, accurate predictions with urgency alerts
2. **Casual Investor**: Wants easy-to-understand BUY/SELL/HOLD recommendations
3. **Technical Analyst**: Appreciates candlestick pattern recognition and chart analysis

## Core Requirements (Static)
1. Stock search by ticker or company name
2. AI-powered stock predictions (BUY/SELL/HOLD)
3. Chart image upload and AI analysis
4. 500+ candlestick pattern recognition
5. Real-time price display
6. Confidence scoring and risk assessment
7. Urgent alert notifications
8. Prediction history tracking

## What's Been Implemented (January 2026)

### Backend Features ✅
- FastAPI server with /api prefix routing
- MongoDB integration for predictions and notifications storage
- **2975+ candlestick patterns** database (exceeded 500 requirement)
- Alpha Vantage integration with demo data fallback
- OpenAI GPT-5.2 integration via Emergent LLM key
- Pattern detection from candlestick data
- Image analysis endpoint for chart uploads
- Notification system for urgent alerts
- Prediction history tracking

### Frontend Features ✅
- Dark "Performance Pro" theme with Chivo/IBM Plex fonts
- Stock search with autocomplete suggestions
- Real-time price display (OHLC data)
- 30-day price chart (Recharts)
- BUY/SELL/HOLD prediction badges
- AI Analysis card with:
  - Confidence percentage
  - Risk level (LOW/MEDIUM/HIGH)
  - Time horizon (short/medium/long)
  - Price target
  - Detailed analysis
  - Detected patterns
- Chart image upload with drag & drop
- Notifications panel with urgent alerts (pulsing animation)
- Prediction history panel
- Patterns database modal (2975+ patterns)

### API Endpoints
- `GET /api/health` - Health check
- `GET /api/search?query=` - Stock search
- `GET /api/stock/{ticker}` - Stock quote
- `GET /api/stock/{ticker}/daily` - Daily candlestick data
- `POST /api/predict/{ticker}` - AI prediction
- `POST /api/analyze-chart` - Chart image analysis
- `GET /api/patterns` - Candlestick patterns list
- `GET /api/notifications` - Get alerts
- `POST /api/notifications/{id}/read` - Mark as read
- `GET /api/history` - Prediction history

## P0/P1/P2 Features Remaining

### P0 (Critical) - All Implemented ✅
- Stock prediction engine
- Chart analysis
- Pattern recognition
- Notifications system

### P1 (High Priority) - Future Enhancements
- [ ] Real Alpha Vantage API key for live data
- [ ] Portfolio tracking (multiple stocks)
- [ ] Watchlist functionality
- [ ] Price alerts (set custom thresholds)
- [ ] Email/SMS notifications

### P2 (Nice to Have)
- [ ] User authentication
- [ ] Historical prediction accuracy tracking
- [ ] Multiple AI model comparison
- [ ] Social sharing of predictions
- [ ] Mobile app version

## Next Tasks
1. **Get real Alpha Vantage API key** - Replace demo key for live market data
2. **Add portfolio management** - Track multiple stocks simultaneously
3. **Implement watchlist** - Save favorite stocks for quick access
4. **Add price alerts** - Notify when stocks hit target prices
5. **Enhance chart visualization** - Add candlestick chart display
