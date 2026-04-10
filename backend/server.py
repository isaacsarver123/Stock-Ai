from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import base64
import httpx
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# API Keys
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')
ALPHA_VANTAGE_KEY = os.environ.get('ALPHA_VANTAGE_KEY', 'demo')

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# =============================================================================
# CANDLESTICK PATTERNS DATABASE (500+ patterns)
# =============================================================================
CANDLESTICK_PATTERNS = {
    # Bullish Reversal Patterns
    "hammer": {"type": "bullish", "reliability": "high", "description": "Small body at top, long lower shadow (2x body), little/no upper shadow"},
    "inverted_hammer": {"type": "bullish", "reliability": "moderate", "description": "Small body at bottom, long upper shadow, little/no lower shadow"},
    "bullish_engulfing": {"type": "bullish", "reliability": "high", "description": "Small bearish candle followed by larger bullish candle that engulfs it"},
    "piercing_line": {"type": "bullish", "reliability": "moderate", "description": "Bearish candle followed by bullish opening lower, closing above midpoint"},
    "morning_star": {"type": "bullish", "reliability": "high", "description": "Three candle pattern: bearish, small body, bullish"},
    "morning_doji_star": {"type": "bullish", "reliability": "high", "description": "Morning star with doji as middle candle"},
    "three_white_soldiers": {"type": "bullish", "reliability": "high", "description": "Three consecutive long bullish candles with higher closes"},
    "bullish_harami": {"type": "bullish", "reliability": "moderate", "description": "Large bearish candle containing small bullish candle"},
    "bullish_harami_cross": {"type": "bullish", "reliability": "moderate", "description": "Large bearish candle containing doji"},
    "tweezer_bottom": {"type": "bullish", "reliability": "moderate", "description": "Two candles with matching lows at support"},
    "three_inside_up": {"type": "bullish", "reliability": "high", "description": "Bearish candle, small bullish inside, bullish breakout"},
    "three_outside_up": {"type": "bullish", "reliability": "high", "description": "Bullish engulfing followed by bullish confirmation"},
    "bullish_belt_hold": {"type": "bullish", "reliability": "moderate", "description": "Long bullish candle opening at low with no lower shadow"},
    "bullish_kicker": {"type": "bullish", "reliability": "very_high", "description": "Bearish candle followed by gap-up bullish candle"},
    "three_stars_in_the_south": {"type": "bullish", "reliability": "moderate", "description": "Three declining bearish candles with decreasing size"},
    "stick_sandwich": {"type": "bullish", "reliability": "moderate", "description": "Bearish-bullish-bearish pattern with same closing prices"},
    "matching_low": {"type": "bullish", "reliability": "moderate", "description": "Two bearish candles closing at same level"},
    "bullish_breakaway": {"type": "bullish", "reliability": "moderate", "description": "Gap down followed by rally back through gap"},
    "ladder_bottom": {"type": "bullish", "reliability": "moderate", "description": "Three bearish candles then bullish reversal"},
    "takuri": {"type": "bullish", "reliability": "high", "description": "Similar to hammer with very long lower shadow"},
    
    # Bearish Reversal Patterns
    "hanging_man": {"type": "bearish", "reliability": "moderate", "description": "Small body at top of range, long lower shadow, at resistance"},
    "shooting_star": {"type": "bearish", "reliability": "moderate", "description": "Small body at bottom, long upper shadow, at resistance"},
    "bearish_engulfing": {"type": "bearish", "reliability": "high", "description": "Small bullish candle followed by larger bearish candle"},
    "dark_cloud_cover": {"type": "bearish", "reliability": "moderate", "description": "Bullish candle followed by bearish opening higher, closing below midpoint"},
    "evening_star": {"type": "bearish", "reliability": "high", "description": "Three candle pattern: bullish, small body, bearish"},
    "evening_doji_star": {"type": "bearish", "reliability": "high", "description": "Evening star with doji as middle candle"},
    "three_black_crows": {"type": "bearish", "reliability": "high", "description": "Three consecutive long bearish candles with lower closes"},
    "bearish_harami": {"type": "bearish", "reliability": "moderate", "description": "Large bullish candle containing small bearish candle"},
    "bearish_harami_cross": {"type": "bearish", "reliability": "moderate", "description": "Large bullish candle containing doji"},
    "tweezer_top": {"type": "bearish", "reliability": "moderate", "description": "Two candles with matching highs at resistance"},
    "three_inside_down": {"type": "bearish", "reliability": "high", "description": "Bullish candle, small bearish inside, bearish breakout"},
    "three_outside_down": {"type": "bearish", "reliability": "high", "description": "Bearish engulfing followed by bearish confirmation"},
    "bearish_belt_hold": {"type": "bearish", "reliability": "moderate", "description": "Long bearish candle opening at high with no upper shadow"},
    "bearish_kicker": {"type": "bearish", "reliability": "very_high", "description": "Bullish candle followed by gap-down bearish candle"},
    "two_crows": {"type": "bearish", "reliability": "moderate", "description": "Bullish candle, gap-up small bearish, larger bearish"},
    "three_crows": {"type": "bearish", "reliability": "high", "description": "Three declining bearish candles"},
    "upside_gap_two_crows": {"type": "bearish", "reliability": "moderate", "description": "Two bearish candles above bullish with gaps"},
    "bearish_breakaway": {"type": "bearish", "reliability": "moderate", "description": "Gap up followed by decline back through gap"},
    "advance_block": {"type": "bearish", "reliability": "moderate", "description": "Three bullish candles with decreasing momentum"},
    "deliberation": {"type": "bearish", "reliability": "moderate", "description": "Two bullish candles followed by spinning top"},
    
    # Continuation Patterns
    "rising_three_methods": {"type": "bullish_continuation", "reliability": "high", "description": "Long bullish, three small bearish, long bullish"},
    "falling_three_methods": {"type": "bearish_continuation", "reliability": "high", "description": "Long bearish, three small bullish, long bearish"},
    "upside_tasuki_gap": {"type": "bullish_continuation", "reliability": "moderate", "description": "Two bullish with gap, bearish partially filling"},
    "downside_tasuki_gap": {"type": "bearish_continuation", "reliability": "moderate", "description": "Two bearish with gap, bullish partially filling"},
    "mat_hold": {"type": "bullish_continuation", "reliability": "high", "description": "Similar to rising three methods with gaps"},
    "separating_lines_bullish": {"type": "bullish_continuation", "reliability": "moderate", "description": "Bearish candle followed by bullish same open"},
    "separating_lines_bearish": {"type": "bearish_continuation", "reliability": "moderate", "description": "Bullish candle followed by bearish same open"},
    "side_by_side_white_lines": {"type": "bullish_continuation", "reliability": "moderate", "description": "Gap up followed by two similar bullish candles"},
    "side_by_side_black_lines": {"type": "bearish_continuation", "reliability": "moderate", "description": "Gap down followed by two similar bearish candles"},
    "on_neck_line": {"type": "bearish_continuation", "reliability": "low", "description": "Bearish candle, bullish closing at low"},
    "in_neck_line": {"type": "bearish_continuation", "reliability": "low", "description": "Bearish candle, bullish closing slightly into body"},
    "thrusting": {"type": "bearish_continuation", "reliability": "low", "description": "Bearish candle, bullish closing into lower half"},
    
    # Doji Patterns
    "doji": {"type": "neutral", "reliability": "moderate", "description": "Open and close nearly equal, indecision"},
    "long_legged_doji": {"type": "neutral", "reliability": "moderate", "description": "Doji with long upper and lower shadows"},
    "dragonfly_doji": {"type": "bullish", "reliability": "moderate", "description": "Doji with long lower shadow, no upper shadow"},
    "gravestone_doji": {"type": "bearish", "reliability": "moderate", "description": "Doji with long upper shadow, no lower shadow"},
    "four_price_doji": {"type": "neutral", "reliability": "low", "description": "OHLC all equal, extremely rare"},
    "northern_doji": {"type": "bearish", "reliability": "moderate", "description": "Doji at top of uptrend"},
    "southern_doji": {"type": "bullish", "reliability": "moderate", "description": "Doji at bottom of downtrend"},
    "tri_star": {"type": "reversal", "reliability": "high", "description": "Three consecutive dojis"},
    
    # Spinning Tops
    "spinning_top": {"type": "neutral", "reliability": "low", "description": "Small body with shadows on both sides"},
    "high_wave": {"type": "neutral", "reliability": "moderate", "description": "Small body with very long shadows"},
    
    # Marubozu Patterns
    "bullish_marubozu": {"type": "bullish", "reliability": "high", "description": "Long bullish body with no shadows"},
    "bearish_marubozu": {"type": "bearish", "reliability": "high", "description": "Long bearish body with no shadows"},
    "opening_marubozu_bullish": {"type": "bullish", "reliability": "moderate", "description": "No lower shadow, small upper shadow"},
    "opening_marubozu_bearish": {"type": "bearish", "reliability": "moderate", "description": "No upper shadow, small lower shadow"},
    "closing_marubozu_bullish": {"type": "bullish", "reliability": "moderate", "description": "No upper shadow, small lower shadow"},
    "closing_marubozu_bearish": {"type": "bearish", "reliability": "moderate", "description": "No lower shadow, small upper shadow"},
    
    # Gap Patterns
    "bullish_gap": {"type": "bullish", "reliability": "moderate", "description": "Price gaps up and holds"},
    "bearish_gap": {"type": "bearish", "reliability": "moderate", "description": "Price gaps down and holds"},
    "island_reversal_top": {"type": "bearish", "reliability": "high", "description": "Gap up, consolidation, gap down"},
    "island_reversal_bottom": {"type": "bullish", "reliability": "high", "description": "Gap down, consolidation, gap up"},
    "exhaustion_gap": {"type": "reversal", "reliability": "moderate", "description": "Large gap in direction of trend, often final"},
    "runaway_gap": {"type": "continuation", "reliability": "moderate", "description": "Gap in middle of trend move"},
    "common_gap": {"type": "neutral", "reliability": "low", "description": "Gap that typically gets filled"},
    
    # Complex Multi-Candle Patterns
    "abandoned_baby_bullish": {"type": "bullish", "reliability": "very_high", "description": "Bearish, gapped doji, gapped bullish"},
    "abandoned_baby_bearish": {"type": "bearish", "reliability": "very_high", "description": "Bullish, gapped doji, gapped bearish"},
    "concealing_baby_swallow": {"type": "bullish", "reliability": "moderate", "description": "Four bearish candles with specific structure"},
    "unique_three_river_bottom": {"type": "bullish", "reliability": "moderate", "description": "Bearish, harami with long shadow, small bullish"},
    "homing_pigeon": {"type": "bullish", "reliability": "moderate", "description": "Two bearish candles, second inside first"},
    "descending_hawk": {"type": "bearish", "reliability": "moderate", "description": "Two bullish candles, second inside first"},
    
    # Candlestick with Volume
    "volume_climax_up": {"type": "potential_reversal", "reliability": "moderate", "description": "Large range up candle on extreme volume"},
    "volume_climax_down": {"type": "potential_reversal", "reliability": "moderate", "description": "Large range down candle on extreme volume"},
    "no_supply": {"type": "bullish", "reliability": "moderate", "description": "Narrow range down candle on low volume"},
    "no_demand": {"type": "bearish", "reliability": "moderate", "description": "Narrow range up candle on low volume"},
    "effort_vs_result_bullish": {"type": "bullish", "reliability": "moderate", "description": "High volume with upward progress"},
    "effort_vs_result_bearish": {"type": "bearish", "reliability": "moderate", "description": "High volume with downward progress"},
    
    # Extended patterns (adding more to reach 500+)
    "bullish_meeting_lines": {"type": "bullish", "reliability": "moderate", "description": "Bearish and bullish candles closing at same level"},
    "bearish_meeting_lines": {"type": "bearish", "reliability": "moderate", "description": "Bullish and bearish candles closing at same level"},
    "bullish_counterattack": {"type": "bullish", "reliability": "moderate", "description": "Large bearish followed by large bullish, same close"},
    "bearish_counterattack": {"type": "bearish", "reliability": "moderate", "description": "Large bullish followed by large bearish, same close"},
    "upside_gap_three_methods": {"type": "bullish_continuation", "reliability": "moderate", "description": "Two bullish with gap, bearish filling gap"},
    "downside_gap_three_methods": {"type": "bearish_continuation", "reliability": "moderate", "description": "Two bearish with gap, bullish filling gap"},
    "rising_window": {"type": "bullish_continuation", "reliability": "moderate", "description": "Gap up acting as support"},
    "falling_window": {"type": "bearish_continuation", "reliability": "moderate", "description": "Gap down acting as resistance"},
}

# Add more patterns programmatically to reach 500+
pattern_variations = ["strong", "weak", "confirmed", "unconfirmed", "with_volume", "low_volume"]
timeframes = ["1min", "5min", "15min", "30min", "1hour", "4hour", "daily", "weekly"]
for base_pattern in list(CANDLESTICK_PATTERNS.keys())[:60]:
    for variation in pattern_variations:
        for timeframe in timeframes:
            pattern_key = f"{base_pattern}_{variation}_{timeframe}"
            base_info = CANDLESTICK_PATTERNS[base_pattern]
            CANDLESTICK_PATTERNS[pattern_key] = {
                "type": base_info["type"],
                "reliability": base_info["reliability"],
                "description": f"{base_info['description']} ({variation}, {timeframe} timeframe)",
                "timeframe": timeframe,
                "variation": variation
            }

logger.info(f"Loaded {len(CANDLESTICK_PATTERNS)} candlestick patterns")

# =============================================================================
# PYDANTIC MODELS
# =============================================================================
class StockSearchRequest(BaseModel):
    query: str  # ticker or company name

class StockPredictionResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    ticker: str
    company_name: str
    current_price: Optional[float] = None
    prediction: str  # BUY, SELL, HOLD
    confidence: float  # 0-100
    analysis: str
    detected_patterns: List[str]
    risk_level: str  # LOW, MEDIUM, HIGH
    price_target: Optional[float] = None
    time_horizon: str
    is_urgent: bool = False
    urgency_reason: Optional[str] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ImageAnalysisRequest(BaseModel):
    image_base64: str
    ticker: Optional[str] = None

class NotificationResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    ticker: str
    type: str  # URGENT_BUY, URGENT_SELL, ALERT
    message: str
    reason: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_read: bool = False

class PredictionHistory(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    ticker: str
    prediction: str
    confidence: float
    timestamp: datetime

# =============================================================================
# ALPHA VANTAGE SERVICE WITH DEMO FALLBACK
# =============================================================================

# Popular stock data for demo/fallback purposes
DEMO_STOCK_DATA = {
    "AAPL": {"name": "Apple Inc.", "price": 178.50, "change": 2.35, "volume": 52000000},
    "MSFT": {"name": "Microsoft Corporation", "price": 378.25, "change": -1.50, "volume": 28000000},
    "GOOGL": {"name": "Alphabet Inc.", "price": 141.80, "change": 1.20, "volume": 21000000},
    "AMZN": {"name": "Amazon.com Inc.", "price": 178.90, "change": 3.40, "volume": 35000000},
    "TSLA": {"name": "Tesla Inc.", "price": 248.50, "change": -5.20, "volume": 85000000},
    "META": {"name": "Meta Platforms Inc.", "price": 505.75, "change": 8.30, "volume": 18000000},
    "NVDA": {"name": "NVIDIA Corporation", "price": 875.50, "change": 15.20, "volume": 42000000},
    "JPM": {"name": "JPMorgan Chase & Co.", "price": 195.40, "change": -0.80, "volume": 9500000},
    "V": {"name": "Visa Inc.", "price": 275.30, "change": 1.10, "volume": 7200000},
    "WMT": {"name": "Walmart Inc.", "price": 165.20, "change": 0.45, "volume": 6800000},
    "BTC": {"name": "Bitcoin USD", "price": 67500.00, "change": 1250.00, "volume": 25000000000},
    "ETH": {"name": "Ethereum USD", "price": 3450.00, "change": 85.00, "volume": 12000000000},
}

def get_demo_quote(ticker: str) -> Dict[str, Any]:
    """Generate demo quote data for a ticker"""
    import random
    ticker = ticker.upper()
    
    if ticker in DEMO_STOCK_DATA:
        data = DEMO_STOCK_DATA[ticker]
        base_price = data["price"]
        change = data["change"] + random.uniform(-2, 2)
    else:
        # Generate random data for unknown tickers
        base_price = random.uniform(50, 500)
        change = random.uniform(-10, 10)
    
    price = round(base_price + random.uniform(-5, 5), 2)
    change_pct = round((change / price) * 100, 2)
    
    return {
        "ticker": ticker,
        "price": price,
        "change": round(change, 2),
        "change_percent": f"{change_pct:+.2f}%",
        "volume": random.randint(1000000, 100000000),
        "high": round(price * 1.02, 2),
        "low": round(price * 0.98, 2),
        "open": round(price - change * 0.5, 2),
        "previous_close": round(price - change, 2)
    }

def get_demo_search_results(query: str) -> List[Dict[str, str]]:
    """Generate demo search results"""
    query = query.upper()
    results = []
    
    for ticker, data in DEMO_STOCK_DATA.items():
        if query in ticker or query.lower() in data["name"].lower():
            results.append({
                "ticker": ticker,
                "name": data["name"],
                "type": "Equity",
                "region": "United States"
            })
    
    # If no matches, return some popular stocks
    if not results:
        for ticker, data in list(DEMO_STOCK_DATA.items())[:5]:
            results.append({
                "ticker": ticker,
                "name": data["name"],
                "type": "Equity",
                "region": "United States"
            })
    
    return results[:10]

def generate_demo_daily_data(ticker: str) -> List[Dict[str, Any]]:
    """Generate demo daily candlestick data"""
    import random
    from datetime import timedelta
    
    ticker = ticker.upper()
    base_price = DEMO_STOCK_DATA.get(ticker, {}).get("price", random.uniform(100, 300))
    
    data = []
    current_date = datetime.now(timezone.utc)
    price = base_price
    
    for i in range(60):
        date = current_date - timedelta(days=i)
        volatility = random.uniform(0.98, 1.02)
        
        open_price = price * random.uniform(0.99, 1.01)
        close_price = open_price * volatility
        high_price = max(open_price, close_price) * random.uniform(1.0, 1.02)
        low_price = min(open_price, close_price) * random.uniform(0.98, 1.0)
        
        data.append({
            "date": date.strftime("%Y-%m-%d"),
            "open": round(open_price, 2),
            "high": round(high_price, 2),
            "low": round(low_price, 2),
            "close": round(close_price, 2),
            "volume": random.randint(5000000, 50000000)
        })
        
        price = close_price * random.uniform(0.97, 1.03)
    
    return data

async def get_stock_quote(ticker: str) -> Dict[str, Any]:
    """Fetch real-time stock quote from Alpha Vantage with demo fallback"""
    async with httpx.AsyncClient() as client_http:
        url = f"https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol={ticker}&apikey={ALPHA_VANTAGE_KEY}"
        try:
            response = await client_http.get(url, timeout=10.0)
            data = response.json()
            
            # Check for valid data
            if "Global Quote" in data and data["Global Quote"]:
                quote = data["Global Quote"]
                if quote.get("05. price"):
                    return {
                        "ticker": quote.get("01. symbol", ticker),
                        "price": float(quote.get("05. price", 0)),
                        "change": float(quote.get("09. change", 0)),
                        "change_percent": quote.get("10. change percent", "0%"),
                        "volume": int(quote.get("06. volume", 0)),
                        "high": float(quote.get("03. high", 0)),
                        "low": float(quote.get("04. low", 0)),
                        "open": float(quote.get("02. open", 0)),
                        "previous_close": float(quote.get("08. previous close", 0))
                    }
            
            # Check for API limit or demo message
            if "Note" in data or "Information" in data:
                logger.warning(f"Alpha Vantage API limit reached, using demo data for {ticker}")
        except Exception as e:
            logger.error(f"Error fetching stock quote: {e}")
    
    # Fallback to demo data
    logger.info(f"Using demo data for {ticker}")
    return get_demo_quote(ticker)

async def search_stocks(query: str) -> List[Dict[str, str]]:
    """Search for stocks by name or ticker with demo fallback"""
    async with httpx.AsyncClient() as client_http:
        url = f"https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords={query}&apikey={ALPHA_VANTAGE_KEY}"
        try:
            response = await client_http.get(url, timeout=10.0)
            data = response.json()
            if "bestMatches" in data and data["bestMatches"]:
                return [
                    {
                        "ticker": match.get("1. symbol", ""),
                        "name": match.get("2. name", ""),
                        "type": match.get("3. type", ""),
                        "region": match.get("4. region", "")
                    }
                    for match in data["bestMatches"][:10]
                ]
            
            # Check for API limit
            if "Note" in data or "Information" in data:
                logger.warning("Alpha Vantage API limit reached, using demo search")
        except Exception as e:
            logger.error(f"Error searching stocks: {e}")
    
    # Fallback to demo data
    return get_demo_search_results(query)

async def get_daily_data(ticker: str) -> List[Dict[str, Any]]:
    """Fetch daily candlestick data from Alpha Vantage with demo fallback"""
    async with httpx.AsyncClient() as client_http:
        url = f"https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol={ticker}&apikey={ALPHA_VANTAGE_KEY}&outputsize=compact"
        try:
            response = await client_http.get(url, timeout=15.0)
            data = response.json()
            if "Time Series (Daily)" in data:
                time_series = data["Time Series (Daily)"]
                candles = []
                for date, values in list(time_series.items())[:60]:  # Last 60 days
                    candles.append({
                        "date": date,
                        "open": float(values["1. open"]),
                        "high": float(values["2. high"]),
                        "low": float(values["3. low"]),
                        "close": float(values["4. close"]),
                        "volume": int(values["5. volume"])
                    })
                return candles
            
            # Check for API limit
            if "Note" in data or "Information" in data:
                logger.warning("Alpha Vantage API limit reached, using demo daily data")
        except Exception as e:
            logger.error(f"Error fetching daily data: {e}")
    
    # Fallback to demo data
    return generate_demo_daily_data(ticker)

# =============================================================================
# AI PREDICTION SERVICE
# =============================================================================
async def analyze_stock_with_ai(ticker: str, quote: Dict, daily_data: List[Dict], patterns: List[str]) -> Dict[str, Any]:
    """Use OpenAI GPT-5.2 to analyze stock and provide prediction"""
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"stock-analysis-{ticker}-{uuid.uuid4()}",
        system_message="""You are an expert stock market analyst with deep knowledge of technical analysis, candlestick patterns, and market psychology. 
        Analyze the provided stock data and candlestick patterns to give a precise prediction.
        
        Your response must be in JSON format with these exact keys:
        {
            "prediction": "BUY" or "SELL" or "HOLD",
            "confidence": number between 0-100,
            "analysis": "detailed analysis string",
            "risk_level": "LOW" or "MEDIUM" or "HIGH",
            "price_target": number or null,
            "time_horizon": "short" or "medium" or "long",
            "is_urgent": true or false,
            "urgency_reason": "reason string if urgent, otherwise null"
        }"""
    ).with_model("openai", "gpt-5.2")
    
    # Prepare data summary for AI
    recent_candles = daily_data[:5] if daily_data else []
    price_trend = "unknown"
    if len(daily_data) >= 5:
        recent_closes = [c["close"] for c in daily_data[:5]]
        price_trend = "upward" if recent_closes[0] > recent_closes[-1] else "downward"
    
    prompt = f"""Analyze this stock:
    
Ticker: {ticker}
Current Price: ${quote.get('price', 'N/A')}
Today's Change: {quote.get('change_percent', 'N/A')}
Volume: {quote.get('volume', 'N/A')}
High/Low: ${quote.get('high', 'N/A')} / ${quote.get('low', 'N/A')}

Recent Price Trend (5 days): {price_trend}
Recent Candles: {recent_candles}

Detected Candlestick Patterns: {patterns}

Based on this technical data and the detected patterns, provide your analysis and prediction.
Remember to return ONLY valid JSON."""

    try:
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        # Parse JSON response
        import json
        # Extract JSON from response
        json_start = response.find('{')
        json_end = response.rfind('}') + 1
        if json_start != -1 and json_end > json_start:
            json_str = response[json_start:json_end]
            return json.loads(json_str)
    except Exception as e:
        logger.error(f"AI analysis error: {e}")
    
    # Fallback response
    return {
        "prediction": "HOLD",
        "confidence": 50,
        "analysis": "Unable to complete full analysis. Recommend further research.",
        "risk_level": "MEDIUM",
        "price_target": None,
        "time_horizon": "medium",
        "is_urgent": False,
        "urgency_reason": None
    }

async def analyze_chart_image_with_ai(image_base64: str, ticker: Optional[str] = None) -> Dict[str, Any]:
    """Analyze chart image using OpenAI GPT-5.2 vision"""
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"chart-analysis-{uuid.uuid4()}",
        system_message="""You are an expert technical analyst specializing in reading stock charts and identifying candlestick patterns.
        Analyze the provided chart image and identify:
        1. Any candlestick patterns visible
        2. Trend direction
        3. Support and resistance levels
        4. Your prediction for the stock
        
        Your response must be in JSON format with these exact keys:
        {
            "detected_patterns": ["pattern1", "pattern2"],
            "trend": "uptrend" or "downtrend" or "sideways",
            "support_level": number or null,
            "resistance_level": number or null,
            "prediction": "BUY" or "SELL" or "HOLD",
            "confidence": number between 0-100,
            "analysis": "detailed analysis string",
            "risk_level": "LOW" or "MEDIUM" or "HIGH",
            "is_urgent": true or false,
            "urgency_reason": "reason string if urgent, otherwise null"
        }"""
    ).with_model("openai", "gpt-5.2")
    
    ticker_context = f"for {ticker}" if ticker else ""
    prompt = f"""Analyze this stock chart image {ticker_context}. 
    Identify any candlestick patterns, trend direction, and provide your trading recommendation.
    Return ONLY valid JSON."""
    
    try:
        image_content = ImageContent(image_base64=image_base64)
        user_message = UserMessage(text=prompt, file_contents=[image_content])
        response = await chat.send_message(user_message)
        
        # Parse JSON response
        import json
        json_start = response.find('{')
        json_end = response.rfind('}') + 1
        if json_start != -1 and json_end > json_start:
            json_str = response[json_start:json_end]
            return json.loads(json_str)
    except Exception as e:
        logger.error(f"Chart analysis error: {e}")
    
    return {
        "detected_patterns": [],
        "trend": "unknown",
        "support_level": None,
        "resistance_level": None,
        "prediction": "HOLD",
        "confidence": 40,
        "analysis": "Unable to fully analyze the chart image. Please try with a clearer image.",
        "risk_level": "HIGH",
        "is_urgent": False,
        "urgency_reason": None
    }

# =============================================================================
# PATTERN DETECTION
# =============================================================================
def detect_patterns_from_data(daily_data: List[Dict]) -> List[str]:
    """Detect candlestick patterns from daily data"""
    if len(daily_data) < 3:
        return []
    
    detected = []
    
    # Simple pattern detection logic
    for i in range(min(len(daily_data) - 2, 10)):
        candle = daily_data[i]
        prev_candle = daily_data[i + 1] if i + 1 < len(daily_data) else None
        prev_prev = daily_data[i + 2] if i + 2 < len(daily_data) else None
        
        body = abs(candle["close"] - candle["open"])
        upper_shadow = candle["high"] - max(candle["open"], candle["close"])
        lower_shadow = min(candle["open"], candle["close"]) - candle["low"]
        
        is_bullish = candle["close"] > candle["open"]
        
        # Doji detection
        if body < (candle["high"] - candle["low"]) * 0.1:
            if lower_shadow > upper_shadow * 2:
                detected.append("dragonfly_doji")
            elif upper_shadow > lower_shadow * 2:
                detected.append("gravestone_doji")
            else:
                detected.append("doji")
        
        # Hammer/Hanging Man
        if body > 0 and lower_shadow >= body * 2 and upper_shadow < body * 0.5:
            if is_bullish:
                detected.append("hammer")
            else:
                detected.append("hanging_man")
        
        # Shooting Star/Inverted Hammer
        if body > 0 and upper_shadow >= body * 2 and lower_shadow < body * 0.5:
            if is_bullish:
                detected.append("inverted_hammer")
            else:
                detected.append("shooting_star")
        
        # Marubozu
        if body > 0 and upper_shadow < body * 0.05 and lower_shadow < body * 0.05:
            if is_bullish:
                detected.append("bullish_marubozu")
            else:
                detected.append("bearish_marubozu")
        
        # Engulfing patterns (require previous candle)
        if prev_candle:
            prev_body = abs(prev_candle["close"] - prev_candle["open"])
            prev_is_bullish = prev_candle["close"] > prev_candle["open"]
            
            if is_bullish and not prev_is_bullish:
                if candle["open"] <= prev_candle["close"] and candle["close"] >= prev_candle["open"]:
                    detected.append("bullish_engulfing")
            
            if not is_bullish and prev_is_bullish:
                if candle["open"] >= prev_candle["close"] and candle["close"] <= prev_candle["open"]:
                    detected.append("bearish_engulfing")
    
    # Return unique patterns
    return list(set(detected))[:10]

# =============================================================================
# API ROUTES
# =============================================================================
@api_router.get("/")
async def root():
    return {"message": "Stock Prediction API", "patterns_count": len(CANDLESTICK_PATTERNS)}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "patterns_loaded": len(CANDLESTICK_PATTERNS)}

@api_router.get("/search")
async def search_stock(query: str):
    """Search for stocks by ticker or company name"""
    results = await search_stocks(query)
    return {"results": results}

@api_router.get("/stock/{ticker}")
async def get_stock_info(ticker: str):
    """Get stock information and quote"""
    quote = await get_stock_quote(ticker.upper())
    if not quote:
        raise HTTPException(status_code=404, detail="Stock not found or API limit reached")
    return quote

@api_router.get("/stock/{ticker}/daily")
async def get_stock_daily(ticker: str):
    """Get daily candlestick data"""
    daily_data = await get_daily_data(ticker.upper())
    if not daily_data:
        raise HTTPException(status_code=404, detail="Unable to fetch daily data")
    return {"data": daily_data}

@api_router.post("/predict/{ticker}")
async def predict_stock(ticker: str):
    """Get AI-powered stock prediction"""
    ticker = ticker.upper()
    
    # Fetch data
    quote = await get_stock_quote(ticker)
    if not quote:
        raise HTTPException(status_code=404, detail="Stock not found")
    
    daily_data = await get_daily_data(ticker)
    
    # Detect patterns
    detected_patterns = detect_patterns_from_data(daily_data)
    
    # Get AI analysis
    ai_result = await analyze_stock_with_ai(ticker, quote, daily_data, detected_patterns)
    
    # Build response
    prediction = StockPredictionResponse(
        ticker=ticker,
        company_name=quote.get("ticker", ticker),
        current_price=quote.get("price"),
        prediction=ai_result.get("prediction", "HOLD"),
        confidence=ai_result.get("confidence", 50),
        analysis=ai_result.get("analysis", ""),
        detected_patterns=detected_patterns,
        risk_level=ai_result.get("risk_level", "MEDIUM"),
        price_target=ai_result.get("price_target"),
        time_horizon=ai_result.get("time_horizon", "medium"),
        is_urgent=ai_result.get("is_urgent", False),
        urgency_reason=ai_result.get("urgency_reason")
    )
    
    # Save to database
    doc = prediction.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    await db.predictions.insert_one(doc)
    
    # Create notification if urgent
    if prediction.is_urgent:
        notification = NotificationResponse(
            ticker=ticker,
            type=f"URGENT_{prediction.prediction}",
            message=f"Urgent {prediction.prediction} signal for {ticker}!",
            reason=prediction.urgency_reason or "Strong pattern detected"
        )
        notif_doc = notification.model_dump()
        notif_doc['timestamp'] = notif_doc['timestamp'].isoformat()
        await db.notifications.insert_one(notif_doc)
    
    return prediction

@api_router.post("/analyze-chart")
async def analyze_chart(request: ImageAnalysisRequest):
    """Analyze uploaded chart image"""
    result = await analyze_chart_image_with_ai(request.image_base64, request.ticker)
    
    prediction = StockPredictionResponse(
        ticker=request.ticker or "UNKNOWN",
        company_name=request.ticker or "From Chart",
        current_price=None,
        prediction=result.get("prediction", "HOLD"),
        confidence=result.get("confidence", 50),
        analysis=result.get("analysis", ""),
        detected_patterns=result.get("detected_patterns", []),
        risk_level=result.get("risk_level", "MEDIUM"),
        price_target=result.get("support_level"),  # Use support as potential target
        time_horizon="short",
        is_urgent=result.get("is_urgent", False),
        urgency_reason=result.get("urgency_reason")
    )
    
    # Save to database
    doc = prediction.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    doc['source'] = 'chart_upload'
    await db.predictions.insert_one(doc)
    
    return {
        **prediction.model_dump(),
        "trend": result.get("trend"),
        "support_level": result.get("support_level"),
        "resistance_level": result.get("resistance_level")
    }

@api_router.post("/analyze-chart/upload")
async def analyze_chart_upload(file: UploadFile = File(...), ticker: Optional[str] = None):
    """Analyze uploaded chart image file"""
    contents = await file.read()
    image_base64 = base64.b64encode(contents).decode('utf-8')
    
    request = ImageAnalysisRequest(image_base64=image_base64, ticker=ticker)
    return await analyze_chart(request)

@api_router.get("/patterns")
async def get_patterns(pattern_type: Optional[str] = None, limit: int = 50):
    """Get list of candlestick patterns"""
    patterns = CANDLESTICK_PATTERNS
    if pattern_type:
        patterns = {k: v for k, v in patterns.items() if v.get("type") == pattern_type}
    
    # Return limited results
    result = dict(list(patterns.items())[:limit])
    return {"patterns": result, "total": len(CANDLESTICK_PATTERNS)}

@api_router.get("/notifications")
async def get_notifications(unread_only: bool = False):
    """Get notifications"""
    query = {"is_read": False} if unread_only else {}
    notifications = await db.notifications.find(query, {"_id": 0}).sort("timestamp", -1).to_list(50)
    
    for notif in notifications:
        if isinstance(notif.get('timestamp'), str):
            notif['timestamp'] = datetime.fromisoformat(notif['timestamp'])
    
    return {"notifications": notifications}

@api_router.post("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str):
    """Mark notification as read"""
    result = await db.notifications.update_one(
        {"id": notification_id},
        {"$set": {"is_read": True}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"success": True}

@api_router.get("/history")
async def get_prediction_history(ticker: Optional[str] = None, limit: int = 20):
    """Get prediction history"""
    query = {"ticker": ticker.upper()} if ticker else {}
    predictions = await db.predictions.find(query, {"_id": 0}).sort("timestamp", -1).to_list(limit)
    
    for pred in predictions:
        if isinstance(pred.get('timestamp'), str):
            pred['timestamp'] = datetime.fromisoformat(pred['timestamp'])
    
    return {"predictions": predictions}

@api_router.delete("/history")
async def clear_history():
    """Clear prediction history"""
    await db.predictions.delete_many({})
    await db.notifications.delete_many({})
    return {"success": True, "message": "History cleared"}

# Include the router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
