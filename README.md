# MarketPulse AI - Stock Prediction Platform

AI-powered stock prediction platform with candlestick pattern recognition, automated news scanning, and multi-channel notifications.

## Features

- **Real-time Stock Data** - Yahoo Finance (FREE, no API key)
- **AI-Powered Predictions** - OpenAI GPT-4o for analysis
- **1,323+ Candlestick Patterns** - Comprehensive pattern database
- **Chart Image Analysis** - Upload screenshots for AI analysis
- **Automated Scanning** - Hourly news + daily pattern scans during market hours
- **Multi-Channel Alerts** - Email (SMTP), Discord webhooks, SMS (Twilio)

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+ & Yarn
- MongoDB
- OpenAI API key with credits

### 1. Clone & Setup

```bash
git clone <your-repo-url>
cd marketpulse-ai
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create environment file
cat > .env << 'EOF'
MONGO_URL="mongodb://localhost:27017"
DB_NAME="marketpulse"
CORS_ORIGINS="http://localhost:3003"
OPENAI_API_KEY="sk-your-openai-api-key-here"
EOF

# Start backend on port 8003 (avoid conflicts with existing services)
uvicorn server:app --host 0.0.0.0 --port 8003 --reload
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
yarn install

# Create environment file
cat > .env << 'EOF'
REACT_APP_BACKEND_URL="http://localhost:8003"
EOF

# Start frontend on port 3003 (avoid conflicts)
PORT=3003 yarn start
```

### 4. Access the App

Open http://localhost:3003 in your browser.

---

## Port Configuration

Default ports are **8003** (backend) and **3003** (frontend) to avoid conflicts with common services.

### If you have port conflicts:

**Change backend port:**
```bash
uvicorn server:app --host 0.0.0.0 --port YOUR_PORT --reload
```

**Change frontend port:**
```bash
PORT=YOUR_PORT yarn start
```

**Update frontend .env to match:**
```env
REACT_APP_BACKEND_URL="http://localhost:YOUR_BACKEND_PORT"
```

### Common ports to avoid on your server:
- 3000, 3001, 3002 (existing frontends)
- 8001, 8002, 8847 (existing backends)
- 27017 (MongoDB)
- 11434 (Ollama)
- 80, 443 (nginx)

---

## Configuration

### OpenAI API Key

1. Get an API key from https://platform.openai.com/api-keys
2. Ensure you have billing set up with credits
3. Add to `/backend/.env`:
   ```env
   OPENAI_API_KEY="sk-your-key-here"
   ```

### Email Notifications (SMTP)

Configure in the app's Settings page:
- **SMTP Server**: `smtp.gmail.com`
- **Port**: `587`
- **Username**: Your email address
- **Password**: Gmail App Password (not regular password)

**Getting Gmail App Password:**
1. Enable 2-Step Verification at https://myaccount.google.com/security
2. Go to App passwords → Generate for "Mail"
3. Use the 16-character code

### Discord Notifications

1. In Discord: Server Settings → Integrations → Webhooks
2. Create webhook and copy URL
3. Paste in Settings → Discord Webhook

### SMS Notifications (Twilio)

1. Create account at https://www.twilio.com
2. Get Account SID, Auth Token, and phone number
3. Configure in Settings → SMS section

---

## Running as a Service (Linux)

### Using systemd

**Backend service** (`/etc/systemd/system/marketpulse-backend.service`):
```ini
[Unit]
Description=MarketPulse AI Backend
After=network.target mongodb.service

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/marketpulse-ai/backend
Environment=PATH=/path/to/marketpulse-ai/backend/venv/bin
ExecStart=/path/to/marketpulse-ai/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8003
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Frontend service** (`/etc/systemd/system/marketpulse-frontend.service`):
```ini
[Unit]
Description=MarketPulse AI Frontend
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/marketpulse-ai/frontend
Environment=PORT=3003
ExecStart=/usr/bin/yarn start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Enable services:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable marketpulse-backend marketpulse-frontend
sudo systemctl start marketpulse-backend marketpulse-frontend
```

### Using PM2 (Node.js process manager)

```bash
# Install PM2
npm install -g pm2

# Backend
cd backend
pm2 start "uvicorn server:app --host 0.0.0.0 --port 8003" --name marketpulse-backend

# Frontend
cd frontend
pm2 start "PORT=3003 yarn start" --name marketpulse-frontend

# Save and enable startup
pm2 save
pm2 startup
```

---

## Nginx Reverse Proxy (Optional)

If you want to access via domain name:

```nginx
# /etc/nginx/sites-available/marketpulse
server {
    listen 80;
    server_name marketpulse.yourdomain.com;

    location / {
        proxy_pass http://localhost:3003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:8003;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/marketpulse /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

## API Reference

### Stock Data
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/search?query=AAPL` | GET | Search stocks |
| `/api/stock/{ticker}` | GET | Get quote |
| `/api/stock/{ticker}/daily` | GET | Get candles |
| `/api/predict/{ticker}` | POST | AI prediction |
| `/api/analyze-chart` | POST | Analyze image |

### Settings & Alerts
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/settings` | GET/PUT | Get/update settings |
| `/api/notifications` | GET | Get alerts |
| `/api/market-status` | GET | Market hours |

### Scanning
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/scan/news` | POST | Trigger news scan |
| `/api/scan/patterns` | POST | Trigger pattern scan |

---

## Candlestick Patterns

### High-Reliability Patterns (15%+ expected moves)
| Pattern | Type | Expected Move |
|---------|------|---------------|
| Abandoned Baby | Reversal | ±18% |
| Bullish/Bearish Kicker | Reversal | ±15% |
| Three White Soldiers | Bullish | +12% |
| Three Black Crows | Bearish | -12% |

### Moderate Patterns
| Pattern | Type | Expected Move |
|---------|------|---------------|
| Morning/Evening Star | Reversal | ±8% |
| Engulfing | Reversal | ±7% |
| Hammer/Hanging Man | Reversal | ±5% |
| Doji variants | Indecision | ±4% |

Total: **1,323 patterns** including variations across timeframes.

---

## Automated Scan Schedule

| Scan | Schedule | Description |
|------|----------|-------------|
| News | Hourly at :30 | During market hours only |
| Patterns | Daily 10 AM EST | Top 30 stocks |

**Market Hours**: Mon-Fri, 9:30 AM - 4:00 PM EST

---

## Troubleshooting

### "Analysis unavailable"
- Check OpenAI API key is valid
- Verify billing/credits at https://platform.openai.com/account/billing

### Port already in use
```bash
# Find what's using a port
lsof -i :8003
# or
netstat -tlnp | grep 8003
```

### MongoDB connection issues
```bash
# Check MongoDB status
sudo systemctl status mongodb
# or
mongosh --eval "db.runCommand({ping:1})"
```

### Backend not starting
```bash
# Check logs
tail -f /path/to/backend/logs/error.log
# or if using systemd
journalctl -u marketpulse-backend -f
```

---

## Tech Stack

- **Backend**: FastAPI, MongoDB, APScheduler, yfinance, OpenAI
- **Frontend**: React, Tailwind CSS, Shadcn/UI, Recharts
- **Notifications**: SMTP, Discord webhooks, Twilio SMS

---

## License

MIT License
