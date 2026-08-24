from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class EntryZone(BaseModel):
    low: float
    high: float

class IndicatorValues(BaseModel):
    vwap: Optional[float] = None
    vwapSlope: Optional[str] = "FLAT" # RISING, FALLING, FLAT
    ema9: Optional[float] = None
    ema20: Optional[float] = None
    ema50: Optional[float] = None
    ema200: Optional[float] = None
    sma20: Optional[float] = None
    sma50: Optional[float] = None
    sma200: Optional[float] = None
    rsi: Optional[float] = 50.0
    rsiStatus: Optional[str] = "NEUTRAL"
    macd: Optional[float] = 0.0
    macdSignal: Optional[float] = 0.0
    macdHist: Optional[float] = 0.0
    atr: Optional[float] = 0.0
    adx: Optional[float] = 20.0
    rvol: Optional[float] = 1.0 # Relative Volume
    roc: Optional[float] = 0.0 # Rate of change
    relativeStrengthVsIndex: Optional[float] = 0.0

class PatternEvidence(BaseModel):
    patternName: str
    confidence: float # 0-100
    evidence: List[str]
    confirmation: List[str]
    invalidation: str
    risk: str

class RiskRewardPlan(BaseModel):
    entryZone: EntryZone
    stopLoss: float
    target1: float
    target2: float
    target3: Optional[float] = None
    riskPerShare: float
    rewardPerShare: float
    riskRewardRatio: float # e.g. 2.8
    suggestedAllocation: str
    invalidationCondition: str

class FundamentalMetrics(BaseModel):
    revenueCagr3Y: Optional[float] = None
    revenueCagr5Y: Optional[float] = None
    ebitdaCagr3Y: Optional[float] = None
    patCagr3Y: Optional[float] = None
    epsCagr3Y: Optional[float] = None
    fcfCagr3Y: Optional[float] = None
    debtToEquity: Optional[float] = None
    netDebt: Optional[float] = None
    interestCoverage: Optional[float] = None
    operatingCashFlow: Optional[float] = None
    freeCashFlow: Optional[float] = None
    roe: Optional[float] = None
    roce: Optional[float] = None
    grossMargin: Optional[float] = None
    ebitdaMargin: Optional[float] = None
    netMargin: Optional[float] = None
    peRatio: Optional[float] = None
    pbRatio: Optional[float] = None
    evToEbitda: Optional[float] = None
    pegRatio: Optional[float] = None
    priceToSales: Optional[float] = None
    fcfYield: Optional[float] = None
    isDataSufficient: bool = True
    missingMetrics: List[str] = []

class HorizonAnalysisResult(BaseModel):
    symbol: str
    name: str
    analysisType: str # INTRADAY, SWING, LONG_TERM
    marketRegime: str # STRONG_UPTREND, UPTREND, RANGE_BOUND, DOWNTREND, STRONG_DOWNTREND, HIGH_VOLATILITY, LOW_VOLATILITY, UNCERTAIN
    trend: str # BULLISH, BEARISH, SIDEWAYS
    signal: str # STRONG_LONG, LONG, WATCH, NEUTRAL, SHORT, STRONG_SHORT, NO_SETUP, INSUFFICIENT_DATA or STRONG_ACCUMULATE, ACCUMULATE, WATCH, HOLD, REDUCE, AVOID
    setup: str # e.g. ORB_BREAKOUT, BREAKOUT_RETEST, VOLATILITY_CONTRACTION, VALUE_COMPOUNDER
    score: int # 0-100
    confidence: float # 0.0 - 1.0
    entryZone: EntryZone
    suggestedEntryPoint: Optional[Dict[str, Any]] = None
    suggestedExitPoints: Optional[Dict[str, Any]] = None
    stopLoss: float
    targets: List[float]
    targetTimeframes: Optional[List[str]] = None
    riskReward: float
    bullishEvidence: List[str]
    bearishEvidence: List[str]
    neutralEvidence: List[str]
    patterns: List[PatternEvidence]
    indicators: IndicatorValues
    timeframeAlignment: str # ALIGNED_BULLISH, MOSTLY_BULLISH, MIXED, MOSTLY_BEARISH, ALIGNED_BEARISH
    invalidation: str
    risks: List[str]
    missingData: List[str]
    explanation: str
    fundamentals: Optional[FundamentalMetrics] = None
    dataQualityStatus: str = "VALID" # VALID, INSUFFICIENT_DATA
