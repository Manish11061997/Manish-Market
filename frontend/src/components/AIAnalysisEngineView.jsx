import React, { useState, useEffect, useCallback } from 'react';
import { 
  Zap, TrendingUp, Landmark, Search, ShieldAlert, CheckCircle2, 
  AlertTriangle, Info, ArrowUpRight, BarChart3, Sliders, Target
} from 'lucide-react';
import { wsClient } from '../utils/WebSocketClient';
import { apiFetch } from '../utils/api';
import LiveTickChart from './LiveTickChart';
import { findTick } from '../utils/symbolMatcher';

export default function AIAnalysisEngineView({ selectedSymbol, currentMarket }) {
  const [activeHorizon, setActiveHorizon] = useState('INTRADAY'); // INTRADAY, SWING, LONG_TERM
  const [symbol, setSymbol] = useState(selectedSymbol || (currentMarket === 'US' ? 'NVDA' : 'RELIANCE.NS'));
  const [searchInput, setSearchInput] = useState('');
  const [orbPeriod, setOrbPeriod] = useState(15);
  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [liveTick, setLiveTick] = useState(null);

  const fetchAnalysis = useCallback(async (sym, horizon, orb) => {
    setLoading(true);
    setError(null);
    try {
      let endpoint = '';
      if (horizon === 'INTRADAY') {
        endpoint = `/api/analysis/intraday?symbol=${encodeURIComponent(sym)}&orbPeriod=${orb}&market=${currentMarket}`;
      } else if (horizon === 'SWING') {
        endpoint = `/api/analysis/swing?symbol=${encodeURIComponent(sym)}&market=${currentMarket}`;
      } else {
        endpoint = `/api/analysis/longterm?symbol=${encodeURIComponent(sym)}&market=${currentMarket}`;
      }

      const res = await apiFetch(endpoint);
      if (!res.ok) throw new Error(`HTTP ${res.status} - Analysis engine error`);
      const data = await res.json();
      setAnalysisData(data);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentMarket]);

  useEffect(() => {
    if (selectedSymbol) {
      setSymbol(selectedSymbol);
      setSearchInput(selectedSymbol);
    } else {
      const defaultSym = currentMarket === 'US' ? 'NVDA' : 'RELIANCE.NS';
      setSymbol(defaultSym);
      setSearchInput(defaultSym);
    }
  }, [selectedSymbol, currentMarket]);

  useEffect(() => {
    fetchAnalysis(symbol, activeHorizon, orbPeriod);

    // Dynamic WebSocket subscription for active symbol
    const subscribedSymbols = [symbol, symbol.replace('.NS', ''), `${symbol.replace('.NS', '')}.NS`];
    wsClient.subscribe(subscribedSymbols);

    const unsubscribe = wsClient.onTick((payload) => {
      if (payload.type === 'TICK_STREAM' && payload.ticks) {
        const tick = findTick(payload.ticks, symbol);
        if (tick) {
          setLiveTick(tick);
        }
      }
    });

    return () => {
      wsClient.unsubscribe(subscribedSymbols);
      unsubscribe();
    };
  }, [symbol, activeHorizon, orbPeriod, fetchAnalysis]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setSymbol(searchInput.trim().toUpperCase());
    }
  };

  const getSignalBadgeColor = (sig) => {
    if (['STRONG_LONG', 'STRONG_ACCUMULATE'].includes(sig)) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
    if (['LONG', 'ACCUMULATE'].includes(sig)) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    if (['SHORT', 'REDUCE', 'AVOID'].includes(sig)) return 'bg-rose-500/20 text-rose-400 border-rose-500/40';
    if (['WATCH', 'HOLD'].includes(sig)) return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
    return 'bg-slate-700/50 text-slate-300 border-slate-600';
  };

  const getRegimeColor = (regime) => {
    if (regime?.includes('UPTREND')) return 'text-emerald-400 bg-emerald-950/60 border-emerald-500/30';
    if (regime?.includes('DOWNTREND')) return 'text-rose-400 bg-rose-950/60 border-rose-500/30';
    if (regime?.includes('VOLATILITY')) return 'text-amber-400 bg-amber-950/60 border-amber-500/30';
    return 'text-slate-300 bg-slate-800/60 border-slate-700';
  };

  const currencySymbol = currentMarket === 'US' ? '$' : '₹';

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Header Banner */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-xl relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <BarChart3 className="w-4 h-4" /> Multi-Horizon Quantitative Engine
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
                Quantitative Market Analysis & Pattern Inspector: <span className="text-emerald-400 font-mono">{symbol}</span>
              </h1>
              {liveTick && (
                <div className="flex items-center gap-2 px-3 py-1 bg-slate-950/80 border border-slate-700/80 rounded-xl font-mono text-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-slate-400">LTP:</span>
                  <span className="text-emerald-400 font-bold">{currencySymbol}{liveTick.price?.toLocaleString()}</span>
                  <span className={liveTick.change >= 0 ? "text-emerald-400" : "text-rose-400"}>
                    {liveTick.change >= 0 ? '+' : ''}{liveTick.changePercent}%
                  </span>
                </div>
              )}
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Deterministic technical & fundamental scoring with regime-aware risk management and quantitative decision support.
            </p>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search Symbol (e.g. NVDA, RELIANCE)..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9 pr-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50 w-64"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-medium text-sm rounded-xl transition-all shadow-lg shadow-emerald-500/20"
            >
              Analyze
            </button>
          </form>
        </div>

        {/* Quick Ticker Chips */}
        <div className="mobile-tab-scroll flex items-center gap-2 mt-4 pt-4 border-t border-slate-800/60 overflow-x-auto text-xs">
          <span className="text-slate-400 font-medium whitespace-nowrap">Quick Tickers:</span>
          {(currentMarket === 'US' ? ['NVDA', 'AAPL', 'MSFT', 'TSLA', 'AMZN', 'GOOGL'] : ['HAL.NS', 'RELIANCE.NS', 'LT.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'SBIN.NS']).map((tk) => (
            <button
              key={tk}
              onClick={() => setSymbol(tk)}
              className={`px-2.5 py-1 rounded-lg border transition-all ${
                symbol === tk 
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 font-semibold' 
                  : 'bg-slate-800/40 text-slate-400 border-slate-700/50 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {tk}
            </button>
          ))}
        </div>
      </div>

      {/* ── Live Tick Stream Chart ─────────────────────────────────────────── */}
      <LiveTickChart
        symbol={symbol}
        height={148}
        currentMarket={currentMarket}
      />

      {/* Horizon Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <button
          onClick={() => setActiveHorizon('INTRADAY')}
          className={`p-4 rounded-xl border text-left transition-all flex items-center gap-3 ${
            activeHorizon === 'INTRADAY'
              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-lg shadow-emerald-500/10'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
          }`}
        >
          <div className={`p-2.5 rounded-lg ${activeHorizon === 'INTRADAY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="font-semibold text-sm text-slate-200">1. Intraday Horizon</div>
            <div className="text-xs text-slate-400">VWAP, ORB, Volume & Support/Resistance</div>
          </div>
        </button>

        <button
          onClick={() => setActiveHorizon('SWING')}
          className={`p-4 rounded-xl border text-left transition-all flex items-center gap-3 ${
            activeHorizon === 'SWING'
              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-lg shadow-emerald-500/10'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
          }`}
        >
          <div className={`p-2.5 rounded-lg ${activeHorizon === 'SWING' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="font-semibold text-sm text-slate-200">2. Swing Trading Horizon</div>
            <div className="text-xs text-slate-400">DMA Alignment, VCP Base & Rel Strength</div>
          </div>
        </button>

        <button
          onClick={() => setActiveHorizon('LONG_TERM')}
          className={`p-4 rounded-xl border text-left transition-all flex items-center gap-3 ${
            activeHorizon === 'LONG_TERM'
              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-lg shadow-emerald-500/10'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
          }`}
        >
          <div className={`p-2.5 rounded-lg ${activeHorizon === 'LONG_TERM' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <div className="font-semibold text-sm text-slate-200">3. Long-Term Investment</div>
            <div className="text-xs text-slate-400">Growth CAGR, Margins, Valuation & Moats</div>
          </div>
        </button>
      </div>

      {/* Intraday Config Bar */}
      {activeHorizon === 'INTRADAY' && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 border border-slate-800/80 text-xs">
          <span className="text-slate-400 font-medium flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-emerald-400" /> Opening Range Period (ORB):
          </span>
          <div className="flex items-center gap-2">
            {[5, 15, 30].map((period) => (
              <button
                key={period}
                onClick={() => setOrbPeriod(period)}
                className={`px-3 py-1 rounded-lg border transition-all ${
                  orbPeriod === period
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 font-semibold'
                    : 'bg-slate-800/50 text-slate-400 border-slate-700/60 hover:text-slate-200'
                }`}
              >
                {period} Minutes
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Analysis Display */}
      {loading ? (
        <div className="glass-panel p-12 rounded-2xl border border-slate-800 text-center space-y-4">
          <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-400 text-sm animate-pulse">Running {activeHorizon} Multi-Factor Engine for {symbol}...</p>
        </div>
      ) : error ? (
        <div className="glass-panel p-8 rounded-2xl border border-rose-800/50 bg-rose-950/10 text-center space-y-3">
          <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto" />
          <h3 className="text-lg font-semibold text-rose-200">Analysis Engine Error</h3>
          <p className="text-sm text-slate-400">{error}</p>
        </div>
      ) : analysisData && (
        <div className="space-y-6">
          {/* Top Overview Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Setup Signal & Score */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3 relative overflow-hidden">
              <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Engine Signal & Score</div>
              <div className="flex items-baseline justify-between">
                <span className={`px-3 py-1 text-sm font-bold rounded-lg border ${getSignalBadgeColor(analysisData.signal)}`}>
                  {analysisData.signal}
                </span>
                <div className="text-right">
                  <span className="text-2xl font-extrabold text-slate-100">{analysisData.score}</span>
                  <span className="text-xs text-slate-400">/100</span>
                </div>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-700" 
                  style={{ width: `${analysisData.score}%` }} 
                />
              </div>
            </div>

            {/* Market Regime */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
              <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Market Regime</div>
              <div className={`px-3 py-1.5 text-xs font-semibold rounded-xl border inline-block ${getRegimeColor(analysisData.marketRegime)}`}>
                {analysisData.marketRegime}
              </div>
              <div className="text-xs text-slate-400">
                Structure: <span className="font-semibold text-slate-200">{analysisData.trend}</span>
              </div>
            </div>

            {/* Risk / Reward Plan */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
              <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Risk / Reward Ratio</div>
              <div className="text-2xl font-bold text-emerald-400">1 : {analysisData.riskReward}</div>
              <div className="text-xs text-slate-400">
                Stop Loss: <span className="text-rose-400 font-semibold">{currencySymbol}{analysisData.stopLoss}</span>
              </div>
            </div>

            {/* Timeframe Alignment */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
              <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Timeframe Alignment</div>
              <div className="text-sm font-semibold text-slate-200">{analysisData.timeframeAlignment}</div>
              <div className="text-xs text-emerald-400">Multi-Timeframe Verified</div>
            </div>
          </div>

          {/* Evidence Matrix & Risk Plan Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bullish & Bearish Evidence Breakdown */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
              <h3 className="text-base font-semibold text-slate-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Evidence & Signal Breakdown
              </h3>

              {/* Bullish Confirmations */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Bullish Confirmations ({analysisData.bullishEvidence?.length || 0})</div>
                <div className="space-y-1.5">
                  {analysisData.bullishEvidence?.map((ev, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-slate-300 p-2 rounded-lg bg-emerald-950/20 border border-emerald-500/20">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>{ev}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bearish Risks & Conflicts */}
              {analysisData.bearishEvidence?.length > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="text-xs font-semibold text-rose-400 uppercase tracking-wider">Bearish Signals & Risks ({analysisData.bearishEvidence.length})</div>
                  <div className="space-y-1.5">
                    {analysisData.bearishEvidence.map((ev, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-slate-300 p-2 rounded-lg bg-rose-950/20 border border-rose-500/20">
                        <span className="text-rose-400 font-bold">⚠</span>
                        <span>{ev}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Trade Execution Plan: Suggested Entry & Exit Points */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
              <h3 className="text-base font-semibold text-slate-200 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-emerald-400" /> Suggested Entry & Exit Execution Plan
                </span>
              </h3>

              {/* Target Waiting Period Banner */}
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[11px] text-amber-300 font-bold uppercase tracking-wider">
                      Target Duration to Wait
                    </div>
                    <div className="text-xs font-semibold text-slate-200 font-mono mt-0.5">
                      {activeHorizon === 'INTRADAY' && '⏱ Intraday: T1 (1-2 Hours) • T2 (3-4 Hours) • T3 (Session Close)'}
                      {activeHorizon === 'SWING' && '⏱ Swing Trade: T1 (3-5 Days) • T2 (1-2 Weeks) • T3 (3-4 Weeks)'}
                      {activeHorizon === 'LONG_TERM' && '⏱ Investment: T1 (6-12 Months) • T2 (18-24 Months) • T3 (3-5 Years)'}
                    </div>
                  </div>
                </div>
                <span className="px-3 py-1 text-xs font-extrabold rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono whitespace-nowrap">
                  {activeHorizon === 'INTRADAY' ? '1 – 4 Hours' : (activeHorizon === 'SWING' ? '3 Days – 4 Weeks' : '6 Months – 3 Years')}
                </span>
              </div>

              {/* Suggested Entry Point Box */}
              <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ArrowUpRight className="w-4 h-4" /> SUGGESTED ENTRY POINT
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[11px]">
                    {analysisData.suggestedEntryPoint?.orderType || 'LIMIT / RETEST BUY'}
                  </span>
                </div>
                <div className="text-lg font-extrabold text-slate-100 font-mono">
                  {currencySymbol}{analysisData.entryZone?.low} – {currencySymbol}{analysisData.entryZone?.high}
                </div>
                <div className="text-[11px] text-slate-400">
                  <strong className="text-slate-300">Trigger Condition:</strong> {analysisData.suggestedEntryPoint?.triggerCondition || 'Pullback or retest of support level'}
                </div>
              </div>

              {/* Suggested Exit Points Grid */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                  <Target className="w-3.5 h-3.5 text-amber-400" /> SUGGESTED EXIT POINTS MATRIX
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  {/* Exit Target 1 */}
                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-emerald-500/30 space-y-1.5">
                    <div className="text-[11px] font-semibold text-emerald-400 flex items-center justify-between">
                      <span>Exit Target 1 (Partial)</span>
                      <span className="font-mono text-emerald-300 font-bold">{currencySymbol}{analysisData.targets?.[0]}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded w-fit font-mono font-medium">
                      ⏱ Est: {analysisData.suggestedExitPoints?.exitTarget1?.timeframe || analysisData.targetTimeframes?.[0] || (activeHorizon === 'SWING' ? '3-5 Days' : (activeHorizon === 'LONG_TERM' ? '6-12 Months' : '1-2 Hours'))}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {analysisData.suggestedExitPoints?.exitTarget1?.action || 'Book 50% profits'}
                    </div>
                  </div>

                  {/* Exit Target 2 */}
                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-emerald-500/30 space-y-1.5">
                    <div className="text-[11px] font-semibold text-emerald-400 flex items-center justify-between">
                      <span>Exit Target 2 (Full)</span>
                      <span className="font-mono text-emerald-300 font-bold">{currencySymbol}{analysisData.targets?.[1]}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded w-fit font-mono font-medium">
                      ⏱ Est: {analysisData.suggestedExitPoints?.exitTarget2?.timeframe || analysisData.targetTimeframes?.[1] || (activeHorizon === 'SWING' ? '1-2 Weeks' : (activeHorizon === 'LONG_TERM' ? '18-24 Months' : '3-4 Hours'))}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {analysisData.suggestedExitPoints?.exitTarget2?.action || 'Book 35% & trail remaining'}
                    </div>
                  </div>

                  {/* Exit Target 3 */}
                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-emerald-500/30 space-y-1.5">
                    <div className="text-[11px] font-semibold text-emerald-400 flex items-center justify-between">
                      <span>Exit Target 3 (Runner)</span>
                      <span className="font-mono text-emerald-300 font-bold">{currencySymbol}{analysisData.targets?.[2]}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded w-fit font-mono font-medium">
                      ⏱ Est: {analysisData.suggestedExitPoints?.exitTarget3?.timeframe || analysisData.targetTimeframes?.[2] || (activeHorizon === 'SWING' ? '3-4 Weeks' : (activeHorizon === 'LONG_TERM' ? '3-5 Years' : 'Session Close'))}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {analysisData.suggestedExitPoints?.exitTarget3?.action || 'Trail stop loss via EMA'}
                    </div>
                  </div>

                  {/* Stop Loss Exit */}
                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-rose-500/40 space-y-1.5">
                    <div className="text-[11px] font-semibold text-rose-400 flex items-center justify-between">
                      <span>Stop Loss Exit (Risk Cut)</span>
                      <span className="font-mono text-rose-300 font-bold">{currencySymbol}{analysisData.stopLoss}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-rose-300 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded w-fit font-mono font-medium">
                      ⏱ Risk Cut: Immediate
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {analysisData.suggestedExitPoints?.stopLossExit?.action || 'Hard Stop Exit on Close'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Invalidation Rule Box */}
              <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 space-y-1">
                <div className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> Invalidation Threshold:
                </div>
                <div className="text-xs text-slate-300 font-mono">{analysisData.invalidation}</div>
              </div>
            </div>
          </div>

          {/* Quantitative Explanation Drawer */}
          {analysisData.explanation && (
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3">
              <h3 className="text-base font-semibold text-slate-200 flex items-center gap-2">
                <Info className="w-4 h-4 text-emerald-400" /> Quantitative Strategy & Pattern Rationale
              </h3>
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs text-slate-300 font-mono leading-relaxed whitespace-pre-wrap">
                {analysisData.explanation}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
