# Candlestick Patterns Reference

## Overview
MarketPulse AI recognizes **1,323 candlestick patterns** including base patterns and their variations across different timeframes and confirmation levels.

---

## Bullish Reversal Patterns

These patterns signal a potential upward price movement.

### Very High Reliability (15%+ Expected Move)

#### Abandoned Baby (Bullish)
- **Expected Move**: +18%
- **Description**: Bearish candle, followed by a gapped-down doji, followed by a gapped-up bullish candle
- **Signal**: Strong reversal after downtrend
- **Best Used**: At major support levels

#### Bullish Kicker
- **Expected Move**: +15%
- **Description**: Bearish candle followed by a gap-up bullish candle that opens above the previous candle's open
- **Signal**: Extremely strong reversal signal
- **Best Used**: After extended downtrend

### High Reliability (7-12% Expected Move)

#### Three White Soldiers
- **Expected Move**: +12%
- **Description**: Three consecutive long bullish candles with progressively higher closes
- **Signal**: Strong bullish momentum
- **Best Used**: After consolidation or downtrend

#### Morning Doji Star
- **Expected Move**: +9%
- **Description**: Bearish candle, small doji gapped down, bullish candle gapped up
- **Signal**: Reversal with indecision confirmation
- **Best Used**: At support levels

#### Morning Star
- **Expected Move**: +8%
- **Description**: Bearish candle, small body (can be bullish or bearish), bullish candle
- **Signal**: Classic reversal pattern
- **Best Used**: End of downtrend

#### Bullish Marubozu
- **Expected Move**: +8%
- **Description**: Long bullish candle with no upper or lower shadows
- **Signal**: Strong buying pressure
- **Best Used**: Breakout confirmation

#### Bullish Engulfing
- **Expected Move**: +7%
- **Description**: Small bearish candle followed by larger bullish candle that engulfs it
- **Signal**: Buyers overwhelming sellers
- **Best Used**: At support or after pullback

#### Hammer
- **Expected Move**: +5%
- **Description**: Small body at top, long lower shadow (2x+ body length), minimal upper shadow
- **Signal**: Rejection of lower prices
- **Best Used**: At support levels

### Moderate Reliability (3-5% Expected Move)

#### Bullish Harami Cross
- **Expected Move**: +5%
- **Description**: Large bearish candle containing a small doji
- **Signal**: Potential reversal with indecision

#### Bullish Harami
- **Expected Move**: +4%
- **Description**: Large bearish candle containing a small bullish candle
- **Signal**: Potential trend weakening

#### Piercing Line
- **Expected Move**: +4%
- **Description**: Bearish candle followed by bullish candle that opens below and closes above midpoint
- **Signal**: Bulls fighting back

#### Tweezer Bottom
- **Expected Move**: +4%
- **Description**: Two candles with matching lows at support level
- **Signal**: Double test of support holding

#### Dragonfly Doji
- **Expected Move**: +4%
- **Description**: Doji with long lower shadow, no upper shadow
- **Signal**: Rejection of lower prices

#### Inverted Hammer
- **Expected Move**: +3%
- **Description**: Small body at bottom, long upper shadow, minimal lower shadow
- **Signal**: Potential reversal (needs confirmation)

---

## Bearish Reversal Patterns

These patterns signal a potential downward price movement.

### Very High Reliability (15%+ Expected Move)

#### Abandoned Baby (Bearish)
- **Expected Move**: -18%
- **Description**: Bullish candle, followed by a gapped-up doji, followed by a gapped-down bearish candle
- **Signal**: Strong reversal after uptrend
- **Best Used**: At major resistance levels

#### Bearish Kicker
- **Expected Move**: -15%
- **Description**: Bullish candle followed by a gap-down bearish candle that opens below the previous candle's open
- **Signal**: Extremely strong reversal signal
- **Best Used**: After extended uptrend

### High Reliability (7-12% Expected Move)

#### Three Black Crows
- **Expected Move**: -12%
- **Description**: Three consecutive long bearish candles with progressively lower closes
- **Signal**: Strong bearish momentum
- **Best Used**: After uptrend or at resistance

#### Evening Doji Star
- **Expected Move**: -9%
- **Description**: Bullish candle, small doji gapped up, bearish candle gapped down
- **Signal**: Reversal with indecision confirmation
- **Best Used**: At resistance levels

#### Evening Star
- **Expected Move**: -8%
- **Description**: Bullish candle, small body, bearish candle
- **Signal**: Classic reversal pattern
- **Best Used**: End of uptrend

#### Bearish Marubozu
- **Expected Move**: -8%
- **Description**: Long bearish candle with no upper or lower shadows
- **Signal**: Strong selling pressure
- **Best Used**: Breakdown confirmation

#### Bearish Engulfing
- **Expected Move**: -7%
- **Description**: Small bullish candle followed by larger bearish candle that engulfs it
- **Signal**: Sellers overwhelming buyers
- **Best Used**: At resistance or after rally

### Moderate Reliability (4-5% Expected Move)

#### Dark Cloud Cover
- **Expected Move**: -5%
- **Description**: Bullish candle followed by bearish candle that opens above and closes below midpoint
- **Signal**: Bears fighting back

#### Shooting Star
- **Expected Move**: -5%
- **Description**: Small body at bottom, long upper shadow, minimal lower shadow
- **Signal**: Rejection of higher prices
- **Best Used**: At resistance levels

#### Hanging Man
- **Expected Move**: -5%
- **Description**: Same shape as hammer but appears at top of uptrend
- **Signal**: Potential exhaustion

#### Bearish Harami
- **Expected Move**: -4%
- **Description**: Large bullish candle containing a small bearish candle
- **Signal**: Potential trend weakening

#### Gravestone Doji
- **Expected Move**: -4%
- **Description**: Doji with long upper shadow, no lower shadow
- **Signal**: Rejection of higher prices

---

## Neutral/Indecision Patterns

#### Doji
- **Expected Move**: 0% (direction depends on context)
- **Description**: Open and close are nearly equal
- **Signal**: Market indecision, potential reversal
- **Best Used**: After strong trend, needs confirmation

---

## Pattern Variations

Each base pattern has **48 variations** created by combining:

### Strength Levels
| Variation | Description | Move Multiplier |
|-----------|-------------|-----------------|
| Strong | High volume, clean formation | 1.5x |
| Confirmed | Follow-through in expected direction | 1.2x |
| Unconfirmed | Pattern present, awaiting confirmation | 1.0x |
| With Volume | Above-average volume | 1.2x |
| Low Volume | Below-average volume | 0.8x |
| Weak | Poor formation or contradicting signals | 0.7x |

### Timeframes
| Timeframe | Best For |
|-----------|----------|
| 1min | Scalping |
| 5min | Day trading |
| 15min | Intraday swings |
| 30min | Short-term trades |
| 1hour | Swing trading |
| 4hour | Position trading |
| Daily | Swing/Position trading |
| Weekly | Long-term investing |

---

## How Patterns Are Detected

The system analyzes candlestick data by examining:

1. **Body Size**: Distance between open and close
2. **Shadow Length**: Upper and lower wicks
3. **Body-to-Shadow Ratio**: Relative proportions
4. **Previous Candle Relationship**: Engulfing, harami, etc.
5. **Gap Analysis**: For star patterns and kickers

### Detection Criteria Example: Hammer
```
body = abs(close - open)
lower_shadow = min(open, close) - low
upper_shadow = high - max(open, close)

is_hammer = (
    lower_shadow >= body * 2 AND
    upper_shadow < body * 0.5 AND
    close > open  # bullish
)
```

---

## Alert Thresholds

| Expected Move | Alert Level | Notification Channels |
|---------------|-------------|----------------------|
| ≥30% | Critical | Email + Discord + SMS |
| 15-29% | High | Email + Discord |
| 5-14% | Medium | Discord only |
| <5% | Low | Email (batched) |

Patterns with **"very_high"** or **"high"** reliability and expected moves ≥15% trigger automatic alerts during scans.

---

## Best Practices

1. **Never trade on patterns alone** - Use with other technical analysis
2. **Confirm with volume** - Higher volume = more reliable signal
3. **Check the trend** - Reversal patterns need a trend to reverse
4. **Wait for confirmation** - Next candle should confirm the pattern
5. **Use proper risk management** - Set stop losses based on pattern invalidation

---

## Pattern Success Rates

Based on historical analysis:

| Reliability Level | Approximate Success Rate |
|-------------------|-------------------------|
| Very High | 70-80% |
| High | 60-70% |
| Moderate | 50-60% |
| Low | 40-50% |

*Note: Success rates vary by market conditions, timeframe, and asset class.*
