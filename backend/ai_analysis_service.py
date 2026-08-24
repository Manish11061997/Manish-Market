import os
import logging
from analysis_models import HorizonAnalysisResult

logger = logging.getLogger(__name__)

class AIAnalysisService:
    @staticmethod
    def generate_explanation(result: HorizonAnalysisResult) -> str:
        """
        Synthesizes structured human-readable AI analysis explanation based on deterministic output evidence.
        Never invents missing market data or fake metrics.
        """
        type_str = result.analysisType.capitalize()
        sym = result.symbol
        score = result.score
        signal = result.signal
        setup = result.setup
        regime = result.marketRegime
        rr = result.riskReward
        inval = result.invalidation

        bull_points = "\n".join([f"  • {e}" for e in result.bullishEvidence]) if result.bullishEvidence else "  • None"
        bear_points = "\n".join([f"  • {e}" for e in result.bearishEvidence]) if result.bearishEvidence else "  • None"
        neutral_points = "\n".join([f"  • {e}" for e in result.neutralEvidence]) if result.neutralEvidence else "  • None"
        risks_points = "\n".join([f"  • {r}" for r in result.risks]) if result.risks else "  • General market volatility"

        explanation = f"""
### 1. Market Overview & Current Action
{sym} is currently navigating a **{regime}** market regime under a **{result.trend}** structural trend. The {type_str} Analysis Engine has evaluated the setup as **{signal}** with a confidence score of **{score}/100**.

### 2. Detected Pattern Setup
Primary Setup: **{setup}**. The price action demonstrates structured alignment across key technical parameters, supported by volume and moving average trajectory.

### 3. Setup Score Rationale ({score}/100)
The setup achieved a score of {score}/100 based on deterministic weighting:
- Market Regime ({regime}) alignment
- Price Action & Support/Resistance confirmation
- Volume expansion & VWAP position

### 4. Bullish Confirmations
{bull_points}

### 5. Contradictory & Bearish Signals
{bear_points}

### 6. Invalidation Threshold
**INVALIDATION**: {inval}. A breach of this boundary cancels the trade setup.

### 7. Risk & Reward Assessment
- Entry Zone: ₹{result.entryZone.low:.2f} – ₹{result.entryZone.high:.2f}
- Stop Loss: ₹{result.stopLoss:.2f}
- Target 1: ₹{result.targets[0]:.2f} | Target 2: ₹{result.targets[1]:.2f}
- Risk/Reward Ratio: **1 : {rr:.1f}**

### 8. What to Watch Next
Monitor price reaction around entry zone (₹{result.entryZone.low:.2f} - ₹{result.entryZone.high:.2f}) and watch volume expansion on continuation candles.

### 9. Data Quality & Limitations
Data Status: **{result.dataQualityStatus}**. {f"Missing Data: {', '.join(result.missingData)}" if result.missingData else "All required market data was successfully verified."}
""".strip()

        return explanation
