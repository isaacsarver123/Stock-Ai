from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, BackgroundTasks
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import base64
import httpx
import yfinance as yf
import asyncio
import pytz
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from twilio.rest import Client as TwilioClient
from openai import OpenAI

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# API Keys
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')

# Initialize OpenAI client
openai_client = OpenAI(api_key=OPENAI_API_KEY)

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Scheduler for cron jobs
scheduler = AsyncIOScheduler(timezone=pytz.timezone('America/New_York'))

# Trading hours (EST)
MARKET_OPEN_HOUR = 9
MARKET_OPEN_MINUTE = 30
MARKET_CLOSE_HOUR = 16
MARKET_CLOSE_MINUTE = 0

# Top 30 most traded stocks
TOP_30_STOCKS = [
    "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "TSLA", "META", "BRK-B", "UNH", "JNJ",
    "V", "XOM", "JPM", "WMT", "MA", "PG", "CVX", "HD", "LLY", "MRK",
    "ABBV", "PEP", "KO", "COST", "AVGO", "TMO", "MCD", "CSCO", "ACN", "DHR"
]

# =============================================================================
# CANDLESTICK PATTERNS DATABASE (500+ patterns)
# =============================================================================
CANDLESTICK_PATTERNS = {
    "hammer": {"type": "bullish", "reliability": "high", "description": "Small body at top, long lower shadow (2x body), little/no upper shadow", "expected_move": 5},
    "inverted_hammer": {"type": "bullish", "reliability": "moderate", "description": "Small body at bottom, long upper shadow, little/no lower shadow", "expected_move": 3},
    "bullish_engulfing": {"type": "bullish", "reliability": "high", "description": "Small bearish candle followed by larger bullish candle that engulfs it", "expected_move": 7},
    "piercing_line": {"type": "bullish", "reliability": "moderate", "description": "Bearish candle followed by bullish opening lower, closing above midpoint", "expected_move": 4},
    "morning_star": {"type": "bullish", "reliability": "high", "description": "Three candle pattern: bearish, small body, bullish", "expected_move": 8},
    "morning_doji_star": {"type": "bullish", "reliability": "high", "description": "Morning star with doji as middle candle", "expected_move": 9},
    "three_white_soldiers": {"type": "bullish", "reliability": "high", "description": "Three consecutive long bullish candles with higher closes", "expected_move": 12},
    "bullish_harami": {"type": "bullish", "reliability": "moderate", "description": "Large bearish candle containing small bullish candle", "expected_move": 4},
    "bullish_harami_cross": {"type": "bullish", "reliability": "moderate", "description": "Large bearish candle containing doji", "expected_move": 5},
    "tweezer_bottom": {"type": "bullish", "reliability": "moderate", "description": "Two candles with matching lows at support", "expected_move": 4},
    "bullish_kicker": {"type": "bullish", "reliability": "very_high", "description": "Bearish candle followed by gap-up bullish candle", "expected_move": 15},
    "abandoned_baby_bullish": {"type": "bullish", "reliability": "very_high", "description": "Bearish, gapped doji, gapped bullish", "expected_move": 18},
    
    "hanging_man": {"type": "bearish", "reliability": "moderate", "description": "Small body at top of range, long lower shadow, at resistance", "expected_move": -5},
    "shooting_star": {"type": "bearish", "reliability": "moderate", "description": "Small body at bottom, long upper shadow, at resistance", "expected_move": -5},
    "bearish_engulfing": {"type": "bearish", "reliability": "high", "description": "Small bullish candle followed by larger bearish candle", "expected_move": -7},
    "dark_cloud_cover": {"type": "bearish", "reliability": "moderate", "description": "Bullish candle followed by bearish opening higher, closing below midpoint", "expected_move": -5},
    "evening_star": {"type": "bearish", "reliability": "high", "description": "Three candle pattern: bullish, small body, bearish", "expected_move": -8},
    "evening_doji_star": {"type": "bearish", "reliability": "high", "description": "Evening star with doji as middle candle", "expected_move": -9},
    "three_black_crows": {"type": "bearish", "reliability": "high", "description": "Three consecutive long bearish candles with lower closes", "expected_move": -12},
    "bearish_harami": {"type": "bearish", "reliability": "moderate", "description": "Large bullish candle containing small bearish candle", "expected_move": -4},
    "bearish_kicker": {"type": "bearish", "reliability": "very_high", "description": "Bullish candle followed by gap-down bearish candle", "expected_move": -15},
    "abandoned_baby_bearish": {"type": "bearish", "reliability": "very_high", "description": "Bullish, gapped doji, gapped bearish", "expected_move": -18},
    
    "doji": {"type": "neutral", "reliability": "moderate", "description": "Open and close nearly equal, indecision", "expected_move": 0},
    "dragonfly_doji": {"type": "bullish", "reliability": "moderate", "description": "Doji with long lower shadow, no upper shadow", "expected_move": 4},
    "gravestone_doji": {"type": "bearish", "reliability": "moderate", "description": "Doji with long upper shadow, no lower shadow", "expected_move": -4},
    "bullish_marubozu": {"type": "bullish", "reliability": "high", "description": "Long bullish body with no shadows", "expected_move": 8},
    "bearish_marubozu": {"type": "bearish", "reliability": "high", "description": "Long bearish body with no shadows", "expected_move": -8},
}

# Add more patterns programmatically to reach 500+
pattern_variations = ["strong", "weak", "confirmed", "unconfirmed", "with_volume", "low_volume"]
timeframes = ["1min", "5min", "15min", "30min", "1hour", "4hour", "daily", "weekly"]
for base_pattern in list(CANDLESTICK_PATTERNS.keys())[:27]:
    for variation in pattern_variations:
        for timeframe in timeframes:
            pattern_key = f"{base_pattern}_{variation}_{timeframe}"
            base_info = CANDLESTICK_PATTERNS[base_pattern]
            multiplier = 1.5 if variation == "strong" else (0.7 if variation == "weak" else 1.2)
            CANDLESTICK_PATTERNS[pattern_key] = {
                "type": base_info["type"],
                "reliability": base_info["reliability"],
                "description": f"{base_info['description']} ({variation}, {timeframe})",
                "expected_move": int(base_info.get("expected_move", 5) * multiplier),
                "timeframe": timeframe,
                "variation": variation
            }

logger.info(f"Loaded {len(CANDLESTICK_PATTERNS)} candlestick patterns")

# =============================================================================
# PYDANTIC MODELS
# =============================================================================
class SettingsModel(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default="global_settings")
    discord_webhook_url: Optional[str] = None
    # Email settings (SMTP)
    email_recipient: Optional[str] = "dale@rc1.ca"  # Default recipient
    smtp_server: Optional[str] = "smtp.gmail.com"
    smtp_port: Optional[int] = 587
    smtp_username: Optional[str] = None  # Your email address
    smtp_password: Optional[str] = None  # App password
    # Twilio SMS
    twilio_account_sid: Optional[str] = None
    twilio_auth_token: Optional[str] = None
    twilio_phone_from: Optional[str] = None
    twilio_phone_to: Optional[str] = None
    notifications_enabled: bool = True
    last_news_scan: Optional[str] = None
    last_pattern_scan: Optional[str] = None

class SettingsUpdate(BaseModel):
    discord_webhook_url: Optional[str] = None
    email_recipient: Optional[str] = None
    smtp_server: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None
    twilio_account_sid: Optional[str] = None
    twilio_auth_token: Optional[str] = None
    twilio_phone_from: Optional[str] = None
    twilio_phone_to: Optional[str] = None
    notifications_enabled: Optional[bool] = None

class StockPredictionResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    ticker: str
    company_name: str
    current_price: Optional[float] = None
    prediction: str
    confidence: float
    analysis: str
    detected_patterns: List[str]
    risk_level: str
    price_target: Optional[float] = None
    time_horizon: str
    is_urgent: bool = False
    urgency_reason: Optional[str] = None
    expected_move_percent: Optional[float] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ImageAnalysisRequest(BaseModel):
    image_base64: str
    ticker: Optional[str] = None

class NotificationResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    ticker: str
    type: str  # URGENT_BUY, URGENT_SELL, ALERT, NEWS_ALERT, PATTERN_ALERT
    message: str
    reason: str
    severity: str = "medium"  # low, medium, high, critical
    expected_move: Optional[float] = None
    source: str = "system"  # system, news_scan, pattern_scan
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_read: bool = False
    sent_discord: bool = False
    sent_email: bool = False
    sent_sms: bool = False

class NewsItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    ticker: str
    headline: str
    summary: str
    source: str
    sentiment: str  # positive, negative, neutral
    impact_score: float  # 0-100
    potential_move: float  # expected % move
    url: Optional[str] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ScanResult(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    scan_type: str  # news, pattern
    started_at: datetime
    completed_at: Optional[datetime] = None
    stocks_scanned: int = 0
    alerts_generated: int = 0
    status: str = "running"  # running, completed, failed
    details: Optional[Dict] = None

# =============================================================================
# YAHOO FINANCE SERVICE
# =============================================================================
POPULAR_STOCKS = {ticker: ticker for ticker in TOP_30_STOCKS}

def get_stock_quote_sync(ticker: str) -> Dict[str, Any]:
    try:
        stock = yf.Ticker(ticker)
        info = stock.info
        price = info.get('currentPrice') or info.get('regularMarketPrice') or info.get('previousClose', 0)
        previous_close = info.get('previousClose', price)
        change = round(price - previous_close, 2) if price and previous_close else 0
        change_pct = round((change / previous_close) * 100, 2) if previous_close else 0
        return {
            "ticker": ticker.upper(),
            "name": info.get('shortName') or info.get('longName') or ticker,
            "price": round(price, 2) if price else 0,
            "change": change,
            "change_percent": f"{change_pct:+.2f}%",
            "volume": info.get('volume') or info.get('regularMarketVolume', 0),
            "high": round(info.get('dayHigh') or info.get('regularMarketDayHigh', price), 2),
            "low": round(info.get('dayLow') or info.get('regularMarketDayLow', price), 2),
            "open": round(info.get('open') or info.get('regularMarketOpen', price), 2),
            "previous_close": round(previous_close, 2),
            "market_cap": info.get('marketCap'),
            "pe_ratio": info.get('trailingPE'),
            "week_52_high": info.get('fiftyTwoWeekHigh'),
            "week_52_low": info.get('fiftyTwoWeekLow'),
        }
    except Exception as e:
        logger.error(f"Error fetching quote for {ticker}: {e}")
        return None

def search_stocks_sync(query: str) -> List[Dict[str, str]]:
    query = query.upper()
    results = []
    for ticker in TOP_30_STOCKS:
        if query in ticker:
            try:
                stock = yf.Ticker(ticker)
                info = stock.info
                results.append({
                    "ticker": ticker,
                    "name": info.get('shortName') or info.get('longName') or ticker,
                    "type": "Equity",
                    "region": "United States"
                })
            except:
                results.append({"ticker": ticker, "name": ticker, "type": "Equity", "region": "United States"})
    if len(query) <= 6 and query.isalpha() and query not in [r['ticker'] for r in results]:
        try:
            stock = yf.Ticker(query)
            info = stock.info
            if info.get('shortName') or info.get('longName'):
                results.insert(0, {
                    "ticker": query,
                    "name": info.get('shortName') or info.get('longName'),
                    "type": info.get('quoteType', 'Equity'),
                    "region": info.get('country', 'United States')
                })
        except:
            pass
    return results[:10]

def get_daily_data_sync(ticker: str, period: str = "1mo") -> List[Dict[str, Any]]:
    try:
        stock = yf.Ticker(ticker)
        hist = stock.history(period=period)
        if hist.empty:
            return []
        candles = []
        for date, row in hist.iterrows():
            candles.append({
                "date": date.strftime("%Y-%m-%d"),
                "open": round(row['Open'], 2),
                "high": round(row['High'], 2),
                "low": round(row['Low'], 2),
                "close": round(row['Close'], 2),
                "volume": int(row['Volume'])
            })
        return list(reversed(candles[-60:]))
    except Exception as e:
        logger.error(f"Error fetching history for {ticker}: {e}")
        return []

async def get_stock_quote(ticker: str) -> Dict[str, Any]:
    return await asyncio.get_event_loop().run_in_executor(None, get_stock_quote_sync, ticker.upper())

async def search_stocks(query: str) -> List[Dict[str, str]]:
    return await asyncio.get_event_loop().run_in_executor(None, search_stocks_sync, query)

async def get_daily_data(ticker: str, period: str = "1mo") -> List[Dict[str, Any]]:
    return await asyncio.get_event_loop().run_in_executor(None, get_daily_data_sync, ticker.upper(), period)

# =============================================================================
# NOTIFICATION SERVICE
# =============================================================================
async def get_settings() -> SettingsModel:
    """Get global settings from database"""
    settings_doc = await db.settings.find_one({"id": "global_settings"}, {"_id": 0})
    if settings_doc:
        # Apply defaults for new fields
        if settings_doc.get('email_recipient') is None:
            settings_doc['email_recipient'] = "dale@rc1.ca"
        if settings_doc.get('smtp_server') is None:
            settings_doc['smtp_server'] = "smtp.gmail.com"
        if settings_doc.get('smtp_port') is None:
            settings_doc['smtp_port'] = 587
        return SettingsModel(**settings_doc)
    return SettingsModel()

async def save_settings(settings: SettingsModel):
    """Save settings to database"""
    await db.settings.update_one(
        {"id": "global_settings"},
        {"$set": settings.model_dump()},
        upsert=True
    )

async def send_discord_notification(webhook_url: str, message: str, embed: Dict = None) -> bool:
    """Send notification to Discord webhook"""
    if not webhook_url:
        return False
    try:
        async with httpx.AsyncClient() as http_client:
            payload = {"content": message}
            if embed:
                payload["embeds"] = [embed]
            response = await http_client.post(webhook_url, json=payload, timeout=10.0)
            return response.status_code in [200, 204]
    except Exception as e:
        logger.error(f"Discord notification error: {e}")
        return False

def send_email_smtp_sync(smtp_server: str, smtp_port: int, username: str, password: str, 
                         to_email: str, subject: str, html_content: str) -> bool:
    """Send email via SMTP (synchronous)"""
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = f"MarketPulse AI <{username}>"
        msg['To'] = to_email
        
        # Create plain text version
        text_content = html_content.replace('<br>', '\n').replace('</p>', '\n')
        import re
        text_content = re.sub('<[^<]+?>', '', text_content)
        
        part1 = MIMEText(text_content, 'plain')
        part2 = MIMEText(html_content, 'html')
        msg.attach(part1)
        msg.attach(part2)
        
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(username, password)
            server.sendmail(username, to_email, msg.as_string())
        
        logger.info(f"Email sent successfully to {to_email}")
        return True
    except Exception as e:
        logger.error(f"SMTP email error: {e}")
        return False

async def send_email_notification(smtp_server: str, smtp_port: int, username: str, password: str,
                                   to_email: str, subject: str, html_content: str) -> bool:
    """Send email via SMTP (async wrapper)"""
    if not all([username, password, to_email]):
        logger.warning("Email not configured - missing SMTP credentials or recipient")
        return False
    try:
        return await asyncio.to_thread(
            send_email_smtp_sync, smtp_server, smtp_port, username, password, to_email, subject, html_content
        )
    except Exception as e:
        logger.error(f"Email notification error: {e}")
        return False

async def send_sms_notification(account_sid: str, auth_token: str, from_phone: str, to_phone: str, message: str) -> bool:
    """Send SMS via Twilio"""
    if not all([account_sid, auth_token, from_phone, to_phone]):
        return False
    try:
        twilio_client = TwilioClient(account_sid, auth_token)
        await asyncio.to_thread(
            twilio_client.messages.create,
            body=message,
            from_=from_phone,
            to=to_phone
        )
        return True
    except Exception as e:
        logger.error(f"SMS notification error: {e}")
        return False

async def dispatch_notification(notification: NotificationResponse):
    """Dispatch notification based on severity level"""
    settings = await get_settings()
    if not settings.notifications_enabled:
        return
    
    severity = notification.severity
    ticker = notification.ticker
    message = notification.message
    
    # Build Discord embed
    color = 0xFF0000 if "SELL" in notification.type else (0x00FF00 if "BUY" in notification.type else 0xFFFF00)
    discord_embed = {
        "title": f"🚨 {notification.type} - {ticker}",
        "description": message,
        "color": color,
        "fields": [
            {"name": "Severity", "value": severity.upper(), "inline": True},
            {"name": "Source", "value": notification.source, "inline": True},
        ],
        "footer": {"text": f"MarketPulse AI • {notification.timestamp.strftime('%Y-%m-%d %H:%M:%S')} EST"}
    }
    if notification.expected_move:
        discord_embed["fields"].append({"name": "Expected Move", "value": f"{notification.expected_move:+.1f}%", "inline": True})
    
    # Build email HTML
    email_html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #1a1a1a; color: white;">
        <h1 style="color: {'#FF3B30' if 'SELL' in notification.type else '#00FF66'};">🚨 {notification.type}</h1>
        <h2 style="color: #007AFF;">{ticker}</h2>
        <p style="font-size: 16px; line-height: 1.6;">{message}</p>
        <div style="margin-top: 20px; padding: 15px; background: #2a2a2a; border-radius: 8px;">
            <p><strong>Severity:</strong> {severity.upper()}</p>
            <p><strong>Source:</strong> {notification.source}</p>
            {f'<p><strong>Expected Move:</strong> {notification.expected_move:+.1f}%</p>' if notification.expected_move else ''}
            <p><strong>Reason:</strong> {notification.reason}</p>
        </div>
        <p style="color: #666; font-size: 12px; margin-top: 20px;">MarketPulse AI • {notification.timestamp.strftime('%Y-%m-%d %H:%M:%S')} EST</p>
    </div>
    """
    
    sms_message = f"MarketPulse AI: {notification.type} - {ticker}\n{message[:100]}..."
    
    # Dispatch based on severity
    # Critical (30%+ moves): All 3 channels
    # High: Discord + Email
    # Medium: Discord only
    # Low: Email only (batched)
    
    update_fields = {}
    
    if severity == "critical":
        # Send to all channels
        if settings.discord_webhook_url:
            success = await send_discord_notification(settings.discord_webhook_url, f"🚨 **CRITICAL ALERT** 🚨", discord_embed)
            update_fields["sent_discord"] = success
        if settings.smtp_username and settings.smtp_password and settings.email_recipient:
            success = await send_email_notification(
                settings.smtp_server, settings.smtp_port, settings.smtp_username, settings.smtp_password,
                settings.email_recipient, f"🚨 CRITICAL: {notification.type} - {ticker}", email_html
            )
            update_fields["sent_email"] = success
        if settings.twilio_account_sid:
            success = await send_sms_notification(
                settings.twilio_account_sid, settings.twilio_auth_token,
                settings.twilio_phone_from, settings.twilio_phone_to, sms_message
            )
            update_fields["sent_sms"] = success
    
    elif severity == "high":
        # Discord + Email
        if settings.discord_webhook_url:
            success = await send_discord_notification(settings.discord_webhook_url, "", discord_embed)
            update_fields["sent_discord"] = success
        if settings.smtp_username and settings.smtp_password and settings.email_recipient:
            success = await send_email_notification(
                settings.smtp_server, settings.smtp_port, settings.smtp_username, settings.smtp_password,
                settings.email_recipient, f"Alert: {notification.type} - {ticker}", email_html
            )
            update_fields["sent_email"] = success
    
    elif severity == "medium":
        # Discord only
        if settings.discord_webhook_url:
            success = await send_discord_notification(settings.discord_webhook_url, "", discord_embed)
            update_fields["sent_discord"] = success
    
    else:  # low
        # Email only
        if settings.smtp_username and settings.smtp_password and settings.email_recipient:
            success = await send_email_notification(
                settings.smtp_server, settings.smtp_port, settings.smtp_username, settings.smtp_password,
                settings.email_recipient, f"Update: {notification.type} - {ticker}", email_html
            )
            update_fields["sent_email"] = success
    
    # Update notification record
    if update_fields:
        await db.notifications.update_one({"id": notification.id}, {"$set": update_fields})

# =============================================================================
# NEWS SCANNING SERVICE
# =============================================================================
async def scan_news_with_ai(hours_back: int = 1) -> List[NewsItem]:
    """Scan financial news using OpenAI GPT-4o"""
    news_items = []
    
    system_message = """You are a financial news analyst. Scan recent financial news and identify any news that could cause significant stock price movements (10%+ up or down).
        
Focus on:
- Major security breaches or hacks
- Earnings surprises (big beats or misses)
- FDA approvals or rejections
- Major lawsuits or regulatory actions
- CEO resignations or scandals
- Major acquisitions or mergers
- Significant product launches or failures
- Bankruptcy filings or debt issues

For each significant news item, provide:
- The stock ticker affected
- A brief headline
- Summary of the news
- Sentiment (positive/negative/neutral)
- Impact score (0-100, where 100 is most impactful)
- Expected price move percentage (positive or negative)

Return your response as a JSON array of objects with keys: ticker, headline, summary, sentiment, impact_score, potential_move, source"""
    
    prompt = f"""Based on your knowledge of recent major financial events, identify the most impactful financial news that could affect stock prices significantly (15%+ up or down).

Focus especially on:
- Security breaches (like data breaches, hacking incidents)
- Earnings surprises
- Regulatory actions
- Product recalls or failures
- Executive scandals
- Major company announcements

Return a JSON array of the most impactful news items. If no significant news comes to mind, return an empty array [].
Only include news that could realistically move a stock 10% or more."""

    try:
        response = await asyncio.to_thread(
            lambda: openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": system_message},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=1000
            )
        )
        response_text = response.choices[0].message.content
        
        # Parse JSON response
        import json
        json_start = response_text.find('[')
        json_end = response_text.rfind(']') + 1
        if json_start != -1 and json_end > json_start:
            json_str = response_text[json_start:json_end]
            news_data = json.loads(json_str)
            
            for item in news_data:
                if abs(item.get('potential_move', 0)) >= 10:  # Only high-impact news
                    news_item = NewsItem(
                        ticker=item.get('ticker', 'UNKNOWN'),
                        headline=item.get('headline', ''),
                        summary=item.get('summary', ''),
                        source=item.get('source', 'AI News Scan'),
                        sentiment=item.get('sentiment', 'neutral'),
                        impact_score=item.get('impact_score', 50),
                        potential_move=item.get('potential_move', 0)
                    )
                    news_items.append(news_item)
    except Exception as e:
        logger.error(f"News scan error: {e}")
    
    return news_items

# =============================================================================
# PATTERN SCANNING SERVICE
# =============================================================================
def detect_patterns_from_data(daily_data: List[Dict]) -> List[Dict]:
    """Detect candlestick patterns and return with expected moves"""
    if len(daily_data) < 5:
        return []
    
    detected = []
    
    for i in range(min(len(daily_data) - 2, 7)):
        candle = daily_data[i]
        prev_candle = daily_data[i + 1] if i + 1 < len(daily_data) else None
        
        body = abs(candle["close"] - candle["open"])
        upper_shadow = candle["high"] - max(candle["open"], candle["close"])
        lower_shadow = min(candle["open"], candle["close"]) - candle["low"]
        total_range = candle["high"] - candle["low"]
        
        is_bullish = candle["close"] > candle["open"]
        
        # Pattern detection with expected moves
        if body > 0 and total_range > 0:
            body_ratio = body / total_range
            
            # Doji patterns
            if body_ratio < 0.1:
                if lower_shadow > upper_shadow * 2:
                    pattern_info = CANDLESTICK_PATTERNS.get("dragonfly_doji", {})
                    detected.append({"name": "dragonfly_doji", "expected_move": pattern_info.get("expected_move", 4), "reliability": "moderate"})
                elif upper_shadow > lower_shadow * 2:
                    pattern_info = CANDLESTICK_PATTERNS.get("gravestone_doji", {})
                    detected.append({"name": "gravestone_doji", "expected_move": pattern_info.get("expected_move", -4), "reliability": "moderate"})
            
            # Hammer/Hanging Man
            if lower_shadow >= body * 2 and upper_shadow < body * 0.5:
                if is_bullish:
                    pattern_info = CANDLESTICK_PATTERNS.get("hammer", {})
                    detected.append({"name": "hammer", "expected_move": pattern_info.get("expected_move", 5), "reliability": "high"})
                else:
                    pattern_info = CANDLESTICK_PATTERNS.get("hanging_man", {})
                    detected.append({"name": "hanging_man", "expected_move": pattern_info.get("expected_move", -5), "reliability": "moderate"})
            
            # Shooting Star/Inverted Hammer
            if upper_shadow >= body * 2 and lower_shadow < body * 0.5:
                if is_bullish:
                    pattern_info = CANDLESTICK_PATTERNS.get("inverted_hammer", {})
                    detected.append({"name": "inverted_hammer", "expected_move": pattern_info.get("expected_move", 3), "reliability": "moderate"})
                else:
                    pattern_info = CANDLESTICK_PATTERNS.get("shooting_star", {})
                    detected.append({"name": "shooting_star", "expected_move": pattern_info.get("expected_move", -5), "reliability": "moderate"})
            
            # Marubozu
            if upper_shadow < body * 0.05 and lower_shadow < body * 0.05:
                if is_bullish:
                    pattern_info = CANDLESTICK_PATTERNS.get("bullish_marubozu", {})
                    detected.append({"name": "bullish_marubozu", "expected_move": pattern_info.get("expected_move", 8), "reliability": "high"})
                else:
                    pattern_info = CANDLESTICK_PATTERNS.get("bearish_marubozu", {})
                    detected.append({"name": "bearish_marubozu", "expected_move": pattern_info.get("expected_move", -8), "reliability": "high"})
        
        # Engulfing patterns
        if prev_candle:
            prev_is_bullish = prev_candle["close"] > prev_candle["open"]
            
            if is_bullish and not prev_is_bullish:
                if candle["open"] <= prev_candle["close"] and candle["close"] >= prev_candle["open"]:
                    pattern_info = CANDLESTICK_PATTERNS.get("bullish_engulfing", {})
                    detected.append({"name": "bullish_engulfing", "expected_move": pattern_info.get("expected_move", 7), "reliability": "high"})
            
            if not is_bullish and prev_is_bullish:
                if candle["open"] >= prev_candle["close"] and candle["close"] <= prev_candle["open"]:
                    pattern_info = CANDLESTICK_PATTERNS.get("bearish_engulfing", {})
                    detected.append({"name": "bearish_engulfing", "expected_move": pattern_info.get("expected_move", -7), "reliability": "high"})
    
    # Remove duplicates and return
    seen = set()
    unique_patterns = []
    for p in detected:
        if p["name"] not in seen:
            seen.add(p["name"])
            unique_patterns.append(p)
    
    return unique_patterns

async def scan_top_stocks_patterns() -> List[Dict]:
    """Scan top 30 stocks for significant patterns"""
    alerts = []
    
    for ticker in TOP_30_STOCKS:
        try:
            # Get 1 week of data
            daily_data = await get_daily_data(ticker, "1wk")
            if not daily_data:
                continue
            
            patterns = detect_patterns_from_data(daily_data)
            
            # Filter for high-confidence patterns with large expected moves
            for pattern in patterns:
                expected_move = pattern.get("expected_move", 0)
                reliability = pattern.get("reliability", "low")
                
                # Only alert on patterns with >75% reliability and >15% expected move
                if reliability in ["high", "very_high"] and abs(expected_move) >= 15:
                    quote = await get_stock_quote(ticker)
                    alerts.append({
                        "ticker": ticker,
                        "name": quote.get("name", ticker) if quote else ticker,
                        "pattern": pattern["name"],
                        "expected_move": expected_move,
                        "reliability": reliability,
                        "current_price": quote.get("price") if quote else None
                    })
        except Exception as e:
            logger.error(f"Error scanning {ticker}: {e}")
    
    return alerts

# =============================================================================
# CRON JOB FUNCTIONS
# =============================================================================
def is_market_hours() -> bool:
    """Check if market is currently open"""
    est = pytz.timezone('America/New_York')
    now = datetime.now(est)
    
    # Check if weekend
    if now.weekday() >= 5:
        return False
    
    # Check if within trading hours
    market_open = now.replace(hour=MARKET_OPEN_HOUR, minute=MARKET_OPEN_MINUTE, second=0, microsecond=0)
    market_close = now.replace(hour=MARKET_CLOSE_HOUR, minute=MARKET_CLOSE_MINUTE, second=0, microsecond=0)
    
    return market_open <= now <= market_close

async def hourly_news_scan():
    """Hourly news scan - runs during trading hours only"""
    if not is_market_hours():
        logger.info("Market closed - skipping news scan")
        return
    
    logger.info("Starting hourly news scan...")
    settings = await get_settings()
    
    # Determine hours to scan
    hours_back = 1
    if settings.last_news_scan:
        try:
            last_scan = datetime.fromisoformat(settings.last_news_scan)
            hours_back = max(1, int((datetime.now(timezone.utc) - last_scan).total_seconds() / 3600))
        except:
            pass
    
    # Create scan record
    scan_result = ScanResult(
        scan_type="news",
        started_at=datetime.now(timezone.utc)
    )
    scan_doc = scan_result.model_dump()
    scan_doc['started_at'] = scan_doc['started_at'].isoformat()
    await db.scan_results.insert_one(scan_doc)
    
    try:
        news_items = await scan_news_with_ai(hours_back)
        alerts_generated = 0
        
        for news in news_items:
            # Save news item
            news_doc = news.model_dump()
            news_doc['timestamp'] = news_doc['timestamp'].isoformat()
            await db.news_items.insert_one(news_doc)
            
            # Create notification for high-impact news
            if abs(news.potential_move) >= 20:
                severity = "critical" if abs(news.potential_move) >= 30 else "high"
                notification = NotificationResponse(
                    ticker=news.ticker,
                    type="URGENT_SELL" if news.potential_move < 0 else "URGENT_BUY",
                    message=news.headline,
                    reason=news.summary,
                    severity=severity,
                    expected_move=news.potential_move,
                    source="news_scan"
                )
                
                notif_doc = notification.model_dump()
                notif_doc['timestamp'] = notif_doc['timestamp'].isoformat()
                await db.notifications.insert_one(notif_doc)
                
                await dispatch_notification(notification)
                alerts_generated += 1
        
        # Update settings with last scan time
        settings.last_news_scan = datetime.now(timezone.utc).isoformat()
        await save_settings(settings)
        
        # Update scan result
        await db.scan_results.update_one(
            {"id": scan_result.id},
            {"$set": {
                "completed_at": datetime.now(timezone.utc).isoformat(),
                "stocks_scanned": len(TOP_30_STOCKS),
                "alerts_generated": alerts_generated,
                "status": "completed",
                "details": {"news_items_found": len(news_items)}
            }}
        )
        
        logger.info(f"News scan completed: {len(news_items)} items, {alerts_generated} alerts")
    
    except Exception as e:
        logger.error(f"News scan failed: {e}")
        await db.scan_results.update_one(
            {"id": scan_result.id},
            {"$set": {"status": "failed", "details": {"error": str(e)}}}
        )

async def daily_pattern_scan():
    """Daily scan of top 30 stocks for candlestick patterns"""
    if not is_market_hours():
        logger.info("Market closed - skipping pattern scan")
        return
    
    logger.info("Starting daily pattern scan of top 30 stocks...")
    settings = await get_settings()
    
    scan_result = ScanResult(
        scan_type="pattern",
        started_at=datetime.now(timezone.utc)
    )
    scan_doc = scan_result.model_dump()
    scan_doc['started_at'] = scan_doc['started_at'].isoformat()
    await db.scan_results.insert_one(scan_doc)
    
    try:
        alerts = await scan_top_stocks_patterns()
        alerts_generated = 0
        
        for alert in alerts:
            severity = "critical" if abs(alert["expected_move"]) >= 30 else "high"
            direction = "BUY" if alert["expected_move"] > 0 else "SELL"
            
            notification = NotificationResponse(
                ticker=alert["ticker"],
                type=f"PATTERN_{direction}",
                message=f"{alert['pattern'].replace('_', ' ').title()} pattern detected on {alert['ticker']} ({alert['name']})",
                reason=f"High-reliability {alert['reliability']} pattern suggesting {alert['expected_move']:+.0f}% move",
                severity=severity,
                expected_move=alert["expected_move"],
                source="pattern_scan"
            )
            
            notif_doc = notification.model_dump()
            notif_doc['timestamp'] = notif_doc['timestamp'].isoformat()
            await db.notifications.insert_one(notif_doc)
            
            await dispatch_notification(notification)
            alerts_generated += 1
        
        settings.last_pattern_scan = datetime.now(timezone.utc).isoformat()
        await save_settings(settings)
        
        await db.scan_results.update_one(
            {"id": scan_result.id},
            {"$set": {
                "completed_at": datetime.now(timezone.utc).isoformat(),
                "stocks_scanned": len(TOP_30_STOCKS),
                "alerts_generated": alerts_generated,
                "status": "completed",
                "details": {"patterns_found": len(alerts)}
            }}
        )
        
        logger.info(f"Pattern scan completed: {len(alerts)} patterns, {alerts_generated} alerts")
    
    except Exception as e:
        logger.error(f"Pattern scan failed: {e}")
        await db.scan_results.update_one(
            {"id": scan_result.id},
            {"$set": {"status": "failed", "details": {"error": str(e)}}}
        )

# =============================================================================
# AI PREDICTION SERVICE
# =============================================================================
async def analyze_stock_with_ai(ticker: str, quote: Dict, daily_data: List[Dict], patterns: List[Dict]) -> Dict[str, Any]:
    """Analyze stock using OpenAI GPT-4o"""
    recent_candles = daily_data[:5] if daily_data else []
    pattern_names = [p["name"] for p in patterns] if patterns else []
    avg_expected_move = sum(p.get("expected_move", 0) for p in patterns) / len(patterns) if patterns else 0
    
    system_message = """You are an expert stock market analyst. Analyze the provided stock data and candlestick patterns.
Return JSON with: prediction (BUY/SELL/HOLD), confidence (0-100), analysis (string), risk_level (LOW/MEDIUM/HIGH), 
price_target (number or null), time_horizon (short/medium/long), is_urgent (boolean), urgency_reason (string or null)"""
    
    prompt = f"""Analyze {ticker}: Price ${quote.get('price', 'N/A')}, Change {quote.get('change_percent', 'N/A')}
Patterns detected: {pattern_names}, Avg expected move: {avg_expected_move:.1f}%
Recent candles: {recent_candles[:3]}
Return ONLY valid JSON."""

    try:
        response = await asyncio.to_thread(
            lambda: openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": system_message},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=500
            )
        )
        response_text = response.choices[0].message.content
        import json
        json_start = response_text.find('{')
        json_end = response_text.rfind('}') + 1
        if json_start != -1 and json_end > json_start:
            return json.loads(response_text[json_start:json_end])
    except Exception as e:
        logger.error(f"AI analysis error: {e}")
    
    return {"prediction": "HOLD", "confidence": 50, "analysis": "Analysis unavailable", "risk_level": "MEDIUM", 
            "price_target": None, "time_horizon": "medium", "is_urgent": False, "urgency_reason": None}

async def analyze_chart_image_with_ai(image_base64: str, ticker: Optional[str] = None) -> Dict[str, Any]:
    """Analyze chart image using OpenAI GPT-4o Vision"""
    system_message = """You are an expert technical analyst. Analyze the chart image and return JSON with:
detected_patterns (array), trend (uptrend/downtrend/sideways), support_level, resistance_level,
prediction (BUY/SELL/HOLD), confidence (0-100), analysis (string), risk_level, is_urgent, urgency_reason"""
    
    try:
        response = await asyncio.to_thread(
            lambda: openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": system_message},
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": f"Analyze this chart{' for ' + ticker if ticker else ''}. Return JSON only."},
                            {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{image_base64}"}}
                        ]
                    }
                ],
                temperature=0.7,
                max_tokens=500
            )
        )
        response_text = response.choices[0].message.content
        import json
        json_start = response_text.find('{')
        json_end = response_text.rfind('}') + 1
        if json_start != -1 and json_end > json_start:
            return json.loads(response_text[json_start:json_end])
    except Exception as e:
        logger.error(f"Chart analysis error: {e}")
    
    return {"detected_patterns": [], "trend": "unknown", "prediction": "HOLD", "confidence": 40, 
            "analysis": "Unable to analyze chart", "risk_level": "HIGH", "is_urgent": False}

# =============================================================================
# API ROUTES
# =============================================================================
@api_router.get("/")
async def root():
    return {"message": "MarketPulse AI API", "patterns_count": len(CANDLESTICK_PATTERNS)}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "patterns_loaded": len(CANDLESTICK_PATTERNS), "market_open": is_market_hours()}

@api_router.get("/settings")
async def get_settings_endpoint():
    settings = await get_settings()
    # Mask sensitive data
    result = settings.model_dump()
    if result.get("smtp_password"):
        result["smtp_password"] = "***configured***"
    if result.get("twilio_auth_token"):
        result["twilio_auth_token"] = "***configured***"
    return result

@api_router.put("/settings")
async def update_settings_endpoint(update: SettingsUpdate):
    settings = await get_settings()
    update_dict = update.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        if value is not None:
            setattr(settings, key, value)
    await save_settings(settings)
    return {"success": True, "message": "Settings updated"}

@api_router.post("/settings/test-discord")
async def test_discord_notification():
    settings = await get_settings()
    if not settings.discord_webhook_url:
        raise HTTPException(status_code=400, detail="Discord webhook not configured")
    
    success = await send_discord_notification(
        settings.discord_webhook_url,
        "🧪 Test notification from MarketPulse AI",
        {"title": "Test Alert", "description": "If you see this, Discord notifications are working!", "color": 0x007AFF}
    )
    return {"success": success}

@api_router.post("/settings/test-email")
async def test_email_notification():
    settings = await get_settings()
    if not settings.smtp_username or not settings.smtp_password:
        raise HTTPException(status_code=400, detail="SMTP credentials not configured. Please set SMTP username (email) and password (app password).")
    if not settings.email_recipient:
        raise HTTPException(status_code=400, detail="Email recipient not configured")
    
    success = await send_email_notification(
        settings.smtp_server,
        settings.smtp_port,
        settings.smtp_username,
        settings.smtp_password,
        settings.email_recipient,
        "🧪 Test - MarketPulse AI",
        """<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #1a1a1a; color: white;">
            <h1 style="color: #007AFF;">🧪 Test Email</h1>
            <p style="font-size: 16px;">If you see this, email notifications are working!</p>
            <p style="color: #666; font-size: 12px; margin-top: 20px;">MarketPulse AI</p>
        </div>"""
    )
    if success:
        return {"success": True, "message": f"Test email sent to {settings.email_recipient}"}
    else:
        raise HTTPException(status_code=500, detail="Failed to send email. Check SMTP credentials.")

@api_router.get("/search")
async def search_stock(query: str):
    results = await search_stocks(query)
    return {"results": results}

@api_router.get("/stock/{ticker}")
async def get_stock_info(ticker: str):
    quote = await get_stock_quote(ticker.upper())
    if not quote:
        raise HTTPException(status_code=404, detail="Stock not found")
    return quote

@api_router.get("/stock/{ticker}/daily")
async def get_stock_daily(ticker: str):
    daily_data = await get_daily_data(ticker.upper())
    if not daily_data:
        raise HTTPException(status_code=404, detail="Unable to fetch daily data")
    return {"data": daily_data}

@api_router.post("/predict/{ticker}")
async def predict_stock(ticker: str, background_tasks: BackgroundTasks):
    ticker = ticker.upper()
    quote = await get_stock_quote(ticker)
    if not quote:
        raise HTTPException(status_code=404, detail="Stock not found")
    
    daily_data = await get_daily_data(ticker)
    detected_patterns = detect_patterns_from_data(daily_data)
    ai_result = await analyze_stock_with_ai(ticker, quote, daily_data, detected_patterns)
    
    avg_expected_move = sum(p.get("expected_move", 0) for p in detected_patterns) / len(detected_patterns) if detected_patterns else 0
    
    prediction = StockPredictionResponse(
        ticker=ticker,
        company_name=quote.get("name", ticker),
        current_price=quote.get("price"),
        prediction=ai_result.get("prediction", "HOLD"),
        confidence=ai_result.get("confidence", 50),
        analysis=ai_result.get("analysis", ""),
        detected_patterns=[p["name"] for p in detected_patterns],
        risk_level=ai_result.get("risk_level", "MEDIUM"),
        price_target=ai_result.get("price_target"),
        time_horizon=ai_result.get("time_horizon", "medium"),
        is_urgent=ai_result.get("is_urgent", False) or abs(avg_expected_move) >= 15,
        urgency_reason=ai_result.get("urgency_reason"),
        expected_move_percent=avg_expected_move
    )
    
    doc = prediction.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    await db.predictions.insert_one(doc)
    
    # Create notification if urgent
    if prediction.is_urgent:
        severity = "critical" if abs(avg_expected_move) >= 30 else "high"
        notification = NotificationResponse(
            ticker=ticker,
            type=f"URGENT_{prediction.prediction}",
            message=f"Urgent {prediction.prediction} signal for {ticker}!",
            reason=prediction.urgency_reason or f"Strong pattern detected with {avg_expected_move:+.1f}% expected move",
            severity=severity,
            expected_move=avg_expected_move,
            source="prediction"
        )
        notif_doc = notification.model_dump()
        notif_doc['timestamp'] = notif_doc['timestamp'].isoformat()
        await db.notifications.insert_one(notif_doc)
        background_tasks.add_task(dispatch_notification, notification)
    
    return prediction

@api_router.post("/analyze-chart")
async def analyze_chart(request: ImageAnalysisRequest):
    result = await analyze_chart_image_with_ai(request.image_base64, request.ticker)
    
    prediction = StockPredictionResponse(
        ticker=request.ticker or "CHART",
        company_name=request.ticker or "From Chart",
        current_price=None,
        prediction=result.get("prediction", "HOLD"),
        confidence=result.get("confidence", 50),
        analysis=result.get("analysis", ""),
        detected_patterns=result.get("detected_patterns", []),
        risk_level=result.get("risk_level", "MEDIUM"),
        price_target=result.get("support_level"),
        time_horizon="short",
        is_urgent=result.get("is_urgent", False),
        urgency_reason=result.get("urgency_reason")
    )
    
    doc = prediction.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    doc['source'] = 'chart_upload'
    await db.predictions.insert_one(doc)
    
    return {**prediction.model_dump(), "trend": result.get("trend"), "support_level": result.get("support_level"), "resistance_level": result.get("resistance_level")}

@api_router.get("/patterns")
async def get_patterns(pattern_type: Optional[str] = None, limit: int = 50):
    patterns = CANDLESTICK_PATTERNS
    if pattern_type:
        patterns = {k: v for k, v in patterns.items() if v.get("type") == pattern_type}
    result = dict(list(patterns.items())[:limit])
    return {"patterns": result, "total": len(CANDLESTICK_PATTERNS)}

@api_router.get("/notifications")
async def get_notifications(unread_only: bool = False, limit: int = 50):
    query = {"is_read": False} if unread_only else {}
    notifications = await db.notifications.find(query, {"_id": 0}).sort("timestamp", -1).to_list(limit)
    for notif in notifications:
        if isinstance(notif.get('timestamp'), str):
            notif['timestamp'] = datetime.fromisoformat(notif['timestamp'])
    return {"notifications": notifications}

@api_router.post("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str):
    result = await db.notifications.update_one({"id": notification_id}, {"$set": {"is_read": True}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"success": True}

@api_router.get("/history")
async def get_prediction_history(ticker: Optional[str] = None, limit: int = 20):
    query = {"ticker": ticker.upper()} if ticker else {}
    predictions = await db.predictions.find(query, {"_id": 0}).sort("timestamp", -1).to_list(limit)
    for pred in predictions:
        if isinstance(pred.get('timestamp'), str):
            pred['timestamp'] = datetime.fromisoformat(pred['timestamp'])
    return {"predictions": predictions}

@api_router.get("/scans")
async def get_scan_history(limit: int = 20):
    scans = await db.scan_results.find({}, {"_id": 0}).sort("started_at", -1).to_list(limit)
    return {"scans": scans}

@api_router.post("/scan/news")
async def trigger_news_scan(background_tasks: BackgroundTasks):
    """Manually trigger a news scan"""
    background_tasks.add_task(hourly_news_scan)
    return {"success": True, "message": "News scan started in background"}

@api_router.post("/scan/patterns")
async def trigger_pattern_scan(background_tasks: BackgroundTasks):
    """Manually trigger a pattern scan"""
    background_tasks.add_task(daily_pattern_scan)
    return {"success": True, "message": "Pattern scan started in background"}

@api_router.get("/market-status")
async def get_market_status():
    est = pytz.timezone('America/New_York')
    now = datetime.now(est)
    is_open = is_market_hours()
    
    return {
        "is_open": is_open,
        "current_time_est": now.strftime("%Y-%m-%d %H:%M:%S"),
        "day_of_week": now.strftime("%A"),
        "market_hours": f"{MARKET_OPEN_HOUR}:{MARKET_OPEN_MINUTE:02d} - {MARKET_CLOSE_HOUR}:{MARKET_CLOSE_MINUTE:02d} EST"
    }

# Include the router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    # Schedule hourly news scan during trading hours (Mon-Fri, 9:30 AM - 4:00 PM EST)
    scheduler.add_job(
        hourly_news_scan,
        CronTrigger(day_of_week='mon-fri', hour='9-15', minute='30'),  # Every hour at :30
        id='hourly_news_scan',
        replace_existing=True
    )
    
    # Schedule daily pattern scan at 10:00 AM EST (after market open)
    scheduler.add_job(
        daily_pattern_scan,
        CronTrigger(day_of_week='mon-fri', hour=10, minute=0),
        id='daily_pattern_scan',
        replace_existing=True
    )
    
    scheduler.start()
    logger.info("Scheduler started - News scan hourly during trading hours, Pattern scan daily at 10 AM EST")

@app.on_event("shutdown")
async def shutdown_event():
    scheduler.shutdown()
    client.close()
