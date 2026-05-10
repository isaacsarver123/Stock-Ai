# MarketPulse AI - Stock Prediction Platform

An AI-powered stock prediction platform that analyzes candlestick patterns, scans financial news, and sends multi-channel notifications for potential trading opportunities.

## Features

### Core Features
- **Real-time Stock Data** - Free data from Yahoo Finance (no API key required)
- **AI-Powered Predictions** - Uses OpenAI GPT-4o for stock analysis
- **1,323+ Candlestick Patterns** - Comprehensive pattern recognition database
- **Chart Image Analysis** - Upload chart screenshots for AI analysis
- **Multi-Channel Notifications** - Email (SMTP), Discord, and SMS alerts

### Automated Scanning
- **Hourly News Scan** - Runs during market hours (Mon-Fri 9:30 AM - 4:00 PM EST)
- **Daily Pattern Scan** - Scans top 30 stocks at 10:00 AM EST
- **Smart Alerting** - Only alerts on 15%+ potential moves with high confidence

### Notification Priority System
| Severity | Channels | Trigger |
|----------|----------|---------|
| Critical | Email + Discord + SMS | 30%+ potential moves |
| High | Email + Discord | 15-30% potential moves |
| Medium | Discord only | Pattern alerts |
| Low | Email only | Regular updates |

---

## Candlestick Patterns (1,323 Total)

### Base Patterns (27 Core Patterns)

#### Bullish Reversal Patterns
| Pattern | Reliability | Expected Move |
|---------|-------------|---------------|
| Abandoned Baby (Bullish) | Very High | +18% |
| Bullish Kicker | Very High | +15% |
| Three White Soldiers | High | +12% |
| Morning Doji Star | High | +9% |
| Morning Star | High | +8% |
| Bullish Marubozu | High | +8% |
| Bullish Engulfing | High | +7% |
| Hammer | High | +5% |
| Bullish Harami Cross | Moderate | +5% |
| Bullish Harami | Moderate | +4% |
| Piercing Line | Moderate | +4% |
| Tweezer Bottom | Moderate | +4% |
| Dragonfly Doji | Moderate | +4% |
| Inverted Hammer | Moderate | +3% |

#### Bearish Reversal Patterns
| Pattern | Reliability | Expected Move |
|---------|-------------|---------------|
| Abandoned Baby (Bearish) | Very High | -18% |
| Bearish Kicker | Very High | -15% |
| Three Black Crows | High | -12% |
| Evening Doji Star | High | -9% |
| Evening Star | High | -8% |
| Bearish Marubozu | High | -8% |
| Bearish Engulfing | High | -7% |
| Dark Cloud Cover | Moderate | -5% |
| Shooting Star | Moderate | -5% |
| Hanging Man | Moderate | -5% |
| Bearish Harami | Moderate | -4% |
| Gravestone Doji | Moderate | -4% |

#### Neutral/Indecision Patterns
| Pattern | Reliability | Description |
|---------|-------------|-------------|
| Doji | Moderate | Indecision, potential reversal |

### Pattern Variations
Each base pattern has 48 variations across:
- **Strength**: Strong, Weak, Confirmed, Unconfirmed, With Volume, Low Volume
- **Timeframes**: 1min, 5min, 15min, 30min, 1hour, 4hour, Daily, Weekly

---

## Local Installation

### Prerequisites
- Python 3.11+
- Node.js 18+
- MongoDB (local or cloud)
- OpenAI API key

### 1. Clone the Repository
```bash
git clone <repository-url>
cd marketpulse-ai
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cat > .env << EOF
MONGO_URL="mongodb://localhost:27017"
DB_NAME="marketpulse"
CORS_ORIGINS="http://localhost:3000"
OPENAI_API_KEY="sk-your-openai-api-key"
EOF

# Start the backend
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
yarn install

# Create .env file
cat > .env << EOF
REACT_APP_BACKEND_URL="http://localhost:8001"
EOF

# Start the frontend
yarn start
```

### 4. MongoDB Setup (if not using cloud)

```bash
# Install MongoDB (Ubuntu/Debian)
sudo apt-get install -y mongodb

# Start MongoDB
sudo systemctl start mongodb
sudo systemctl enable mongodb

# Or using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

---

## Configuration

### Email Notifications (SMTP)

1. Open the app and click **Settings**
2. Under "Email Notifications (SMTP)":
   - **SMTP Server**: `smtp.gmail.com` (default)
   - **Port**: `587` (default)
   - **Your Email**: Your Gmail address
   - **App Password**: Gmail App Password (see below)
   - **Recipient**: Email to receive alerts (default: `dale@rc1.ca`)

#### Getting a Gmail App Password
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable 2-Step Verification if not already enabled
3. Go to "App passwords"
4. Generate a new app password for "Mail"
5. Use the 16-character password in the app

### Discord Notifications

1. In Discord, go to Server Settings → Integrations → Webhooks
2. Create a new webhook and copy the URL
3. Paste the URL in Settings → Discord Webhook

### SMS Notifications (Twilio)

1. Create a [Twilio account](https://www.twilio.com/)
2. Get your Account SID and Auth Token
3. Get a Twilio phone number
4. Enter all details in Settings → SMS section

---

## API Endpoints

### Stock Data
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/search?query=AAPL` | GET | Search stocks |
| `/api/stock/{ticker}` | GET | Get stock quote |
| `/api/stock/{ticker}/daily` | GET | Get daily candles |
| `/api/predict/{ticker}` | POST | Get AI prediction |
| `/api/analyze-chart` | POST | Analyze chart image |

### Settings & Notifications
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/settings` | GET | Get settings |
| `/api/settings` | PUT | Update settings |
| `/api/settings/test-discord` | POST | Test Discord webhook |
| `/api/settings/test-email` | POST | Test email |
| `/api/notifications` | GET | Get notifications |
| `/api/history` | GET | Get prediction history |

### Scanning
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/scan/news` | POST | Trigger news scan |
| `/api/scan/patterns` | POST | Trigger pattern scan |
| `/api/scans` | GET | Get scan history |
| `/api/market-status` | GET | Get market hours status |

---

## Top 30 Stocks Scanned Daily

The following stocks are automatically scanned for candlestick patterns:

```
AAPL  MSFT  GOOGL  AMZN  NVDA  TSLA  META  BRK-B  UNH  JNJ
V     XOM   JPM    WMT   MA    PG    CVX   HD     LLY  MRK
ABBV  PEP   KO     COST  AVGO  TMO   MCD   CSCO   ACN  DHR
```

---

## Automated Scan Schedule

| Scan Type | Schedule | Description |
|-----------|----------|-------------|
| News Scan | Hourly at :30 | During market hours only |
| Pattern Scan | Daily at 10:00 AM EST | Top 30 stocks, weekly candles |

**Market Hours**: Monday-Friday, 9:30 AM - 4:00 PM EST

Scans automatically skip when the market is closed.

---

## Tech Stack

### Backend
- **FastAPI** - Python web framework
- **MongoDB** - Database
- **APScheduler** - Cron job scheduling
- **yfinance** - Yahoo Finance data
- **OpenAI GPT-4o** - AI predictions
- **SMTP** - Email notifications
- **Twilio** - SMS notifications

### Frontend
- **React** - UI framework
- **Tailwind CSS** - Styling
- **Shadcn/UI** - Component library
- **Recharts** - Charts
- **Axios** - HTTP client

---

## Environment Variables

### Backend (`/backend/.env`)
```env
MONGO_URL="mongodb://localhost:27017"
DB_NAME="marketpulse"
CORS_ORIGINS="http://localhost:3000"
OPENAI_API_KEY="sk-your-openai-api-key"
```

### Frontend (`/frontend/.env`)
```env
REACT_APP_BACKEND_URL="http://localhost:8001"
```

---

## Troubleshooting

### Backend won't start
- Check MongoDB is running: `sudo systemctl status mongodb`
- Check port 8001 is available: `lsof -i :8001`
- Check logs for errors

### Email not sending
- Verify SMTP credentials in Settings
- For Gmail, ensure you're using an App Password, not your regular password
- Check firewall allows outbound port 587

### Scans not running
- Scans only run during market hours (Mon-Fri 9:30 AM - 4:00 PM EST)
- Check market status: `curl http://localhost:8001/api/market-status`
- Trigger manual scan: `curl -X POST http://localhost:8001/api/scan/news`

---

## License

MIT License - See LICENSE file for details.
