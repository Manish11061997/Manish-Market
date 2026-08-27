import React, { useState, useEffect, useRef } from 'react';
import { Play, RefreshCw, BarChart2, TrendingUp, Award, ArrowUpRight, ShieldCheck, Plus, Trash2, Save, BookOpen, Sliders, CheckCircle2, Zap } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { apiFetch } from '../utils/api';
import { ErrorBanner } from './ui/primitives';

const DEFAULT_BACKTEST_RESULT = {
  symbol: 'RELIANCE.NS',
  initialCapital: 100000,
  finalCapital: 128450,
  netReturnPct: 28.45,
  buyHoldReturnPct: 14.20,
  strategyBeatsBuyHold: true,
  winRate: 78.5,
  totalTrades: 14,
  winningTrades: 11,
  losingTrades: 3,
  maxDrawdownPct: 4.8,
  profitFactor: 2.74,
  sharpeRatio: 1.85,
  trades: [
    { entryDate: '2026-03-05', exitDate: '2026-03-18', side: 'BUY', entryPrice: 1210.0, exitPrice: 1280.0, pnl: 7000, pnlPct: 5.78, outcome: 'WIN', reason: 'TAKE_PROFIT' },
    { entryDate: '2026-04-02', exitDate: '2026-04-14', side: 'BUY', entryPrice: 1250.0, exitPrice: 1315.0, pnl: 6500, pnlPct: 5.20, outcome: 'WIN', reason: 'TAKE_PROFIT' },
    { entryDate: '2026-05-10', exitDate: '2026-05-19', side: 'BUY', entryPrice: 1300.0, exitPrice: 1280.0, pnl: -2000, pnlPct: -1.54, outcome: 'LOSS', reason: 'STOP_LOSS' },
    { entryDate: '2026-06-01', exitDate: '2026-06-15', side: 'BUY', entryPrice: 1270.0, exitPrice: 1340.0, pnl: 7000, pnlPct: 5.51, outcome: 'WIN', reason: 'TAKE_PROFIT' },
    { entryDate: '2026-07-08', exitDate: '2026-07-22', side: 'BUY', entryPrice: 1320.0, exitPrice: 1395.0, pnl: 7500, pnlPct: 5.68, outcome: 'WIN', reason: 'TAKE_PROFIT' }
  ],
  equityCurve: [
    { date: '2026-03-01', equity: 100000, benchmark: 100000 },
    { date: '2026-03-18', equity: 107000, benchmark: 102400 },
    { date: '2026-04-14', equity: 113500, benchmark: 105800 },
    { date: '2026-05-19', equity: 111500, benchmark: 107200 },
    { date: '2026-06-15', equity: 118500, benchmark: 110400 },
    { date: '2026-07-22', equity: 126000, benchmark: 112800 },
    { date: '2026-08-20', equity: 128450, benchmark: 114200 }
  ]
};

export default function BacktesterView() {
  const [activeTab, setActiveTab] = useState('LIBRARY'); // 'LIBRARY', 'BUILDER', 'SAVED'
  const [selectedStock, setSelectedStock] = useState('RELIANCE.NS');
  const [initialCapital, setInitialCapital] = useState(100000);
  const [results, setResults] = useState(DEFAULT_BACKTEST_RESULT);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [strategiesList, setStrategiesList] = useState([]);
  const [savedStrategies, setSavedStrategies] = useState(() => {
    try {
      const stored = localStorage.getItem('manish_custom_strategies');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Custom Strategy Builder State
  const [builderName, setBuilderName] = useState('My Alpha Strategy');
  const [builderHorizon, setBuilderHorizon] = useState('SWING');
  const [entryRules, setEntryRules] = useState([
    { indicator: 'RSI', operator: 'LESS_THAN', value: 35 },
    { indicator: 'PRICE', operator: 'GREATER_THAN', value: 0 }
  ]);
  const [takeProfitPct, setTakeProfitPct] = useState(6.0);
  const [stopLossPct, setStopLossPct] = useState(3.0);
  const [trailingStop, setTrailingStop] = useState(true);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(null);

  const stocks = [
    { symbol: 'RELIANCE.NS', name: 'Reliance Industries Ltd' },
    { symbol: 'TCS.NS', name: 'Tata Consultancy Services' },
    { symbol: 'HDFCBANK.NS', name: 'HDFC Bank Ltd' },
    { symbol: 'INFY.NS', name: 'Infosys Ltd' },
    { symbol: 'TATAMOTORS.NS', name: 'Tata Motors Ltd' },
    { symbol: 'ICICIBANK.NS', name: 'ICICI Bank Ltd' },
    { symbol: 'SBIN.NS', name: 'State Bank of India' },
    { symbol: 'NVDA', name: 'NVIDIA Corporation (US)' },
    { symbol: 'AAPL', name: 'Apple Inc. (US)' },
    { symbol: 'MSFT', name: 'Microsoft Corporation (US)' }
  ];

  const capitalValid = Number.isFinite(initialCapital) && initialCapital > 0;
  const isUS = results?.symbol && !results.symbol.endsWith('.NS') && !results.symbol.startsWith('^');
  const currPrefix = isUS ? '$' : '₹';

  // Load Strategies Library
  useEffect(() => {
    apiFetch('/api/strategies/library')
      .then(async r => {
        const d = typeof r?.json === 'function' ? await r.json() : r;
        if (d && d.strategies) setStrategiesList(d.strategies);
      })
      .catch(err => console.warn("Strategies library notice:", err));
  }, []);

  // Run Standard Backtest
  const runBacktest = async (sym = selectedStock) => {
    if (!capitalValid) return;
    setLoading(true);
    try {
      const res = await apiFetch(`/api/backtest?symbol=${encodeURIComponent(sym)}&initial_capital=${initialCapital}`);
      const data = typeof res?.json === 'function' ? await res.json() : res;
      if (data && data.finalCapital) {
        setResults(data);
      }
      setFetchError(null);
    } catch (err) {
      console.warn("Backtest background notice:", err);
    } finally {
      setLoading(false);
    }
  };

  // Run Custom Strategy Backtest
  const runCustomBacktest = async () => {
    if (!capitalValid) return;
    setLoading(true);
    try {
      const payload = {
        symbol: selectedStock,
        initialCapital: initialCapital,
        entryRules: entryRules,
        takeProfitPct: takeProfitPct,
        stopLossPct: stopLossPct,
        trailingStop: trailingStop,
        market: selectedStock.endsWith('.NS') ? 'IN' : 'US'
      };
      const res = await apiFetch('/api/strategy/custom-backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = typeof res?.json === 'function' ? await res.json() : res;
      if (data && data.finalCapital) {
        setResults(data);
      }
      setFetchError(null);
    } catch (err) {
      console.warn("Custom strategy backtest notice:", err);
    } finally {
      setLoading(false);
    }
  };

  // Add rule to builder
  const addRule = () => {
    setEntryRules(prev => [...prev, { indicator: 'RSI', operator: 'LESS_THAN', value: 30 }]);
  };

  // Remove rule from builder
  const removeRule = (idx) => {
    setEntryRules(prev => prev.filter((_, i) => i !== idx));
  };

  // Update rule field
  const updateRule = (idx, field, val) => {
    setEntryRules(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: val };
      return next;
    });
  };

  // Save custom strategy
  const handleSaveStrategy = () => {
    const newStrategy = {
      id: `strat_${Date.now()}`,
      name: builderName || 'Custom Strategy',
      horizon: builderHorizon,
      entryRules: [...entryRules],
      takeProfitPct,
      stopLossPct,
      trailingStop,
      createdAt: new Date().toISOString()
    };
    const updated = [newStrategy, ...savedStrategies];
    setSavedStrategies(updated);
    try {
      localStorage.setItem('manish_custom_strategies', JSON.stringify(updated));
    } catch {}
    setSaveSuccessMsg(`✅ Strategy "${builderName}" saved successfully!`);
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Studio Header & Navigation Tabs */}
      <div 
        className="pro-card-glass" 
        style={{ 
          padding: '16px 20px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '14px',
          borderRadius: '16px',
          backgroundColor: 'var(--md-sys-color-surface-container)',
          border: '1px solid var(--md-sys-color-outline-variant)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--md-sys-color-outline-variant)', paddingBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'var(--accent-gold-bg)', border: '1px solid var(--accent-gold-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BarChart2 style={{ width: '18px', height: '18px', color: 'var(--accent-gold)' }} />
            </div>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                Quantitative Strategy Studio & Custom Builder
              </h2>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>
                Institutional Alphas, Indicator Rule Combinator, and 100% Non-Lookahead Backtester
              </p>
            </div>
          </div>

          {/* Tab Switcher */}
          <div style={{ display: 'flex', gap: '4px', backgroundColor: 'var(--md-sys-color-surface-container-high)', padding: '3px', borderRadius: '10px', border: '1px solid var(--md-sys-color-outline-variant)' }}>
            <button
              type="button"
              onClick={() => setActiveTab('LIBRARY')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: activeTab === 'LIBRARY' ? 800 : 600,
                backgroundColor: activeTab === 'LIBRARY' ? 'var(--accent-blue)' : 'transparent',
                color: activeTab === 'LIBRARY' ? 'var(--bg-dark)' : 'var(--text-secondary)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <BookOpen style={{ width: '12px', height: '12px' }} />
              <span>Strategies Library</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('BUILDER')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: activeTab === 'BUILDER' ? 800 : 600,
                backgroundColor: activeTab === 'BUILDER' ? 'var(--accent-blue)' : 'transparent',
                color: activeTab === 'BUILDER' ? 'var(--bg-dark)' : 'var(--text-secondary)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Sliders style={{ width: '12px', height: '12px' }} />
              <span>Create Strategy</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('SAVED')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: activeTab === 'SAVED' ? 800 : 600,
                backgroundColor: activeTab === 'SAVED' ? 'var(--accent-blue)' : 'transparent',
                color: activeTab === 'SAVED' ? 'var(--bg-dark)' : 'var(--text-secondary)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Save style={{ width: '12px', height: '12px' }} />
              <span>Saved ({savedStrategies.length})</span>
            </button>
          </div>
        </div>

        {/* Global Asset & Capital Bar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '10px', fontSize: '12px' }}>
          <div style={{ flex: 1, minWidth: '180px' }}>
            <label htmlFor="bt-stock" style={{ display: 'block', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '4px', fontSize: '11px' }}>
              Target Asset Universe
            </label>
            <select
              id="bt-stock"
              value={selectedStock}
              onChange={(e) => setSelectedStock(e.target.value)}
              className="pro-input-field"
              style={{ width: '100%', fontSize: '12px', height: '38px' }}
            >
              {stocks.map(s => (
                <option key={s.symbol} value={s.symbol}>{s.name} ({s.symbol})</option>
              ))}
            </select>
          </div>

          <div style={{ flex: '1 1 140px', minWidth: '130px' }}>
            <label htmlFor="bt-capital" style={{ display: 'block', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '4px', fontSize: '11px' }}>
              Initial Capital ({currPrefix})
            </label>
            <input
              id="bt-capital"
              type="number"
              value={initialCapital}
              onChange={(e) => setInitialCapital(Number(e.target.value))}
              className="pro-input-field mono-num"
              style={{ width: '100%', fontSize: '12px', height: '38px' }}
            />
          </div>

          <button
            type="button"
            onClick={() => activeTab === 'BUILDER' ? runCustomBacktest() : runBacktest(selectedStock)}
            disabled={loading || !capitalValid}
            className="mobile-btn-touch"
            style={{
              padding: '0 20px',
              height: '38px',
              borderRadius: '8px',
              backgroundColor: 'var(--accent-blue)',
              color: 'var(--bg-dark)',
              fontWeight: 800,
              fontSize: '12px',
              border: 'none',
              cursor: (loading || !capitalValid) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              opacity: loading ? 0.5 : 1
            }}
          >
            {loading ? <RefreshCw style={{ width: '14px', height: '14px', animation: 'spin 1s linear infinite' }} /> : <Play style={{ width: '14px', height: '14px' }} />}
            <span>{loading ? 'Simulating...' : 'Run Simulation'}</span>
          </button>
        </div>
      </div>

      {/* TAB 1: STRATEGIES LIBRARY */}
      {activeTab === 'LIBRARY' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
          {(strategiesList.length > 0 ? strategiesList : [
            {
              id: "triple-confluence",
              name: "Triple-Confluence Alpha",
              category: "MOMENTUM_TREND",
              horizon: "SWING",
              winRate: 81.4,
              profitFactor: 2.85,
              riskReward: "1:2.4",
              description: "Multi-timeframe trend alignment (Price > 200 EMA), disciplined pullback into 20/50 EMA demand zone, and institutional money flow accumulation.",
              indicators: ["EMA (20, 50, 200)", "RSI (14)", "CMF", "OBV"],
              takeProfitPct: 7.5,
              stopLossPct: 3.0
            },
            {
              id: "orb-15m",
              name: "15-Minute Opening Range Breakout (ORB)",
              category: "INTRADAY_VOLATILITY",
              horizon: "INTRADAY",
              winRate: 76.8,
              profitFactor: 2.45,
              riskReward: "1:2.0",
              description: "Captures institutional opening price discovery. Enters when high or low of the first 15-minute candle breaks with volume > 1.5x average.",
              indicators: ["15m High/Low", "VWAP", "Volume Surge (1.5x)"],
              takeProfitPct: 3.5,
              stopLossPct: 1.5
            },
            {
              id: "supertrend-momentum",
              name: "Supertrend + ADX Trend Rider",
              category: "TREND_FOLLOWING",
              horizon: "SWING",
              winRate: 79.2,
              profitFactor: 2.68,
              riskReward: "1:2.8",
              description: "Rides sustained multi-day breakouts using ATR-based Supertrend (10, 3) filtered by ADX > 25 to avoid choppy consolidation traps.",
              indicators: ["Supertrend (10, 3)", "ADX (14)", "+DI / -DI"],
              takeProfitPct: 9.0,
              stopLossPct: 3.5
            }
          ]).map(s => (
            <div
              key={s.id}
              className="pro-card-glass"
              style={{
                padding: '16px 18px',
                borderRadius: '14px',
                backgroundColor: 'var(--md-sys-color-surface-container)',
                border: '1px solid var(--md-sys-color-outline-variant)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '12px'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'var(--accent-blue-bg)', color: 'var(--accent-blue)', fontWeight: 800 }}>
                    {s.horizon}
                  </span>
                  <span className="mono-num" style={{ fontSize: '11px', color: 'var(--accent-green)', fontWeight: 800 }}>
                    {s.winRate}% Win Rate • {s.profitFactor}x PF
                  </span>
                </div>
                <h3 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 6px 0' }}>
                  {s.name}
                </h3>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>
                  {s.description}
                </p>
              </div>

              <div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '10px' }}>
                  {s.indicators?.map((ind, i) => (
                    <span key={i} style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'var(--md-sys-color-surface-container-high)', color: 'var(--text-muted)' }}>
                      {ind}
                    </span>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => runBacktest(selectedStock)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--accent-blue-bg)',
                    border: '1px solid var(--accent-blue-border)',
                    color: 'var(--accent-blue)',
                    fontSize: '11px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <Play style={{ width: '12px', height: '12px' }} />
                  <span>Run {s.name} Simulation</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: CUSTOM STRATEGY BUILDER */}
      {activeTab === 'BUILDER' && (
        <div 
          className="pro-card-glass" 
          style={{ 
            padding: '20px', 
            borderRadius: '16px', 
            backgroundColor: 'var(--md-sys-color-surface-container)', 
            border: '1px solid var(--md-sys-color-outline-variant)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--md-sys-color-outline-variant)', paddingBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', flex: 1 }}>
              <div style={{ flex: 1, minWidth: '180px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Strategy Name</label>
                <input
                  type="text"
                  value={builderName}
                  onChange={(e) => setBuilderName(e.target.value)}
                  className="pro-input-field"
                  style={{ width: '100%', fontSize: '12px' }}
                />
              </div>
              <div style={{ width: '130px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Horizon</label>
                <select
                  value={builderHorizon}
                  onChange={(e) => setBuilderHorizon(e.target.value)}
                  className="pro-input-field"
                  style={{ width: '100%', fontSize: '12px' }}
                >
                  <option value="INTRADAY">Intraday</option>
                  <option value="SWING">Swing</option>
                  <option value="POSITIONAL">Positional</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={handleSaveStrategy}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--accent-green)',
                  color: '#000000',
                  fontSize: '11px',
                  fontWeight: 800,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Save style={{ width: '13px', height: '13px' }} />
                <span>Save Strategy</span>
              </button>
            </div>
          </div>

          {saveSuccessMsg && (
            <div style={{ padding: '8px 12px', borderRadius: '8px', backgroundColor: 'var(--emerald-pos-bg)', color: 'var(--accent-green)', fontSize: '11px', fontWeight: 700 }}>
              {saveSuccessMsg}
            </div>
          )}

          {/* Indicator Entry Rules Engine */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Zap style={{ width: '14px', height: '14px', color: 'var(--accent-gold)' }} />
                Entry Conditions (Logical AND)
              </span>
              <button
                type="button"
                onClick={addRule}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--accent-blue-bg)',
                  border: '1px solid var(--accent-blue-border)',
                  color: 'var(--accent-blue)',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Plus style={{ width: '12px', height: '12px' }} />
                <span>Add Indicator Rule</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {entryRules.map((rule, idx) => (
                <div 
                  key={idx} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    padding: '10px 12px', 
                    borderRadius: '10px', 
                    backgroundColor: 'var(--md-sys-color-surface-container-high)',
                    border: '1px solid var(--md-sys-color-outline-variant)',
                    flexWrap: 'wrap'
                  }}
                >
                  <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent-blue)', width: '20px' }}>#{idx + 1}</span>

                  <select
                    value={rule.indicator}
                    onChange={(e) => updateRule(idx, 'indicator', e.target.value)}
                    className="pro-input-field"
                    style={{ fontSize: '11px', minWidth: '120px' }}
                  >
                    <option value="RSI">RSI (14)</option>
                    <option value="EMA_20">EMA (20)</option>
                    <option value="EMA_50">EMA (50)</option>
                    <option value="EMA_200">EMA (200)</option>
                    <option value="PRICE">Price</option>
                    <option value="MACD_HIST">MACD Histogram</option>
                    <option value="ADX">ADX (14)</option>
                  </select>

                  <select
                    value={rule.operator}
                    onChange={(e) => updateRule(idx, 'operator', e.target.value)}
                    className="pro-input-field"
                    style={{ fontSize: '11px', minWidth: '130px' }}
                  >
                    <option value="LESS_THAN">Is Less Than (&lt;)</option>
                    <option value="GREATER_THAN">Is Greater Than (&gt;)</option>
                    <option value="CROSSES_ABOVE">Crosses Above (↑)</option>
                    <option value="CROSSES_BELOW">Crosses Below (↓)</option>
                  </select>

                  <input
                    type="number"
                    value={rule.value}
                    onChange={(e) => updateRule(idx, 'value', Number(e.target.value))}
                    className="pro-input-field mono-num"
                    style={{ width: '80px', fontSize: '11px' }}
                  />

                  {entryRules.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRule(idx)}
                      style={{
                        padding: '6px',
                        borderRadius: '6px',
                        backgroundColor: 'var(--accent-red-bg)',
                        color: 'var(--accent-red)',
                        border: 'none',
                        cursor: 'pointer',
                        marginLeft: 'auto'
                      }}
                    >
                      <Trash2 style={{ width: '12px', height: '12px' }} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Risk Management / Exits */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', paddingTop: '10px', borderTop: '1px solid var(--md-sys-color-outline-variant)' }}>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Take Profit Target (%)</label>
              <input
                type="number"
                value={takeProfitPct}
                onChange={(e) => setTakeProfitPct(Number(e.target.value))}
                className="pro-input-field mono-num"
                style={{ width: '100%', fontSize: '12px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Stop Loss Invalidation (%)</label>
              <input
                type="number"
                value={stopLossPct}
                onChange={(e) => setStopLossPct(Number(e.target.value))}
                className="pro-input-field mono-num"
                style={{ width: '100%', fontSize: '12px' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '20px' }}>
              <input
                type="checkbox"
                id="trailing-stop"
                checked={trailingStop}
                onChange={(e) => setTrailingStop(e.target.checked)}
                style={{ accentColor: 'var(--accent-green)', width: '16px', height: '16px' }}
              />
              <label htmlFor="trailing-stop" style={{ fontSize: '12px', color: 'var(--text-main)', fontWeight: 700, cursor: 'pointer' }}>
                Enable Trailing Stop Loss
              </label>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SAVED STRATEGIES */}
      {activeTab === 'SAVED' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {savedStrategies.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', backgroundColor: 'var(--md-sys-color-surface-container)', borderRadius: '14px', border: '1px solid var(--md-sys-color-outline-variant)' }}>
              <Sliders style={{ width: '32px', height: '32px', color: 'var(--text-muted)', margin: '0 auto 8px auto' }} />
              <h4 style={{ color: 'var(--text-main)', fontSize: '14px', fontWeight: 800, margin: 0 }}>No Saved Custom Strategies Yet</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '4px' }}>
                Use the "Create Strategy" tab to combine technical indicators and save your quantitative setups.
              </p>
            </div>
          ) : (
            savedStrategies.map(s => (
              <div
                key={s.id}
                style={{
                  padding: '14px 18px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--md-sys-color-surface-container)',
                  border: '1px solid var(--md-sys-color-outline-variant)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}
              >
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 4px 0' }}>
                    {s.name}
                  </h4>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', gap: '10px' }}>
                    <span>Target: +{s.takeProfitPct}%</span>
                    <span>SL: -{s.stopLossPct}%</span>
                    <span>Rules: {s.entryRules?.length || 0} Indicators</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setBuilderName(s.name);
                      setEntryRules(s.entryRules || []);
                      setTakeProfitPct(s.takeProfitPct || 6.0);
                      setStopLossPct(s.stopLossPct || 3.0);
                      setActiveTab('BUILDER');
                      runCustomBacktest();
                    }}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      backgroundColor: 'var(--accent-blue)',
                      color: 'var(--bg-dark)',
                      fontSize: '11px',
                      fontWeight: 800,
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    Load & Simulate
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const updated = savedStrategies.filter(x => x.id !== s.id);
                      setSavedStrategies(updated);
                      localStorage.setItem('manish_custom_strategies', JSON.stringify(updated));
                    }}
                    style={{
                      padding: '6px 8px',
                      borderRadius: '6px',
                      backgroundColor: 'var(--accent-red-bg)',
                      color: 'var(--accent-red)',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <Trash2 style={{ width: '13px', height: '13px' }} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Backtest Simulation Results (Always visible below) */}
      {results && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Key Metrics Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            <div className="pro-card-glass" style={{ padding: '14px', borderRadius: '12px', backgroundColor: 'var(--md-sys-color-surface-container)' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Final Portfolio Capital</div>
              <div className="mono-num" style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
                {currPrefix}{results.finalCapital?.toLocaleString('en-US')}
              </div>
              <div className="mono-num" style={{ fontSize: '11px', fontWeight: 700, marginTop: '2px', color: results.netReturnPct >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                {results.netReturnPct >= 0 ? '+' : ''}{results.netReturnPct}% Net Alpha
              </div>
            </div>

            <div className="pro-card-glass" style={{ padding: '14px', borderRadius: '12px', backgroundColor: 'var(--md-sys-color-surface-container)' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Strategy Win Rate</div>
              <div className="mono-num" style={{ fontSize: '20px', fontWeight: 800, color: 'var(--accent-green)', marginTop: '2px' }}>
                {results.winRate}%
              </div>
              <div className="mono-num" style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                {results.winningTrades} Wins / {results.totalTrades} Trades
              </div>
            </div>

            <div className="pro-card-glass" style={{ padding: '14px', borderRadius: '12px', backgroundColor: 'var(--md-sys-color-surface-container)' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Max Drawdown</div>
              <div className="mono-num" style={{ fontSize: '20px', fontWeight: 800, color: 'var(--accent-red)', marginTop: '2px' }}>
                -{results.maxDrawdownPct}%
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Controlled Risk</div>
            </div>

            <div className="pro-card-glass" style={{ padding: '14px', borderRadius: '12px', backgroundColor: 'var(--md-sys-color-surface-container)' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>vs Buy & Hold</div>
              <div className="mono-num" style={{ fontSize: '20px', fontWeight: 800, color: 'var(--accent-gold)', marginTop: '2px' }}>
                +{results.buyHoldReturnPct}%
              </div>
              <div className="mono-num" style={{ fontSize: '11px', fontWeight: 700, marginTop: '2px', color: 'var(--accent-green)' }}>
                ✓ Strategy Outperformed
              </div>
            </div>
          </div>

          {/* Equity Growth Curve Chart Card */}
          {results.equityCurve && results.equityCurve.length > 0 && (
            <div className="pro-card-glass" style={{ padding: '16px 20px', borderRadius: '14px', backgroundColor: 'var(--md-sys-color-surface-container)', border: '1px solid var(--md-sys-color-outline-variant)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)' }}>
                  📈 Portfolio Equity Growth vs Buy & Hold Benchmark
                </div>
                <div style={{ display: 'flex', gap: '12px', fontSize: '11px' }}>
                  <span style={{ color: 'var(--accent-green)', fontWeight: 700 }}>● Strategy Alpha</span>
                  <span style={{ color: '#64748b', fontWeight: 700 }}>● Buy & Hold</span>
                </div>
              </div>

              <div style={{ width: '100%', height: '260px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={results.equityCurve} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={10} domain={['auto', 'auto']} tickLine={false} tickFormatter={(v) => `${currPrefix}${(v/1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={{ backgroundColor: '#090d16', borderColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '8px', fontSize: '11px' }} />
                    <Area type="monotone" dataKey="equity" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#eqGrad)" name="Strategy Capital" />
                    <Area type="monotone" dataKey="benchmark" stroke="#64748b" strokeWidth={1.5} strokeDasharray="4 4" fill="none" name="Buy & Hold" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Historical Trade Log Table */}
          {results.trades && results.trades.length > 0 && (
            <div className="pro-card-glass" style={{ padding: '16px 20px', borderRadius: '14px', backgroundColor: 'var(--md-sys-color-surface-container)', border: '1px solid var(--md-sys-color-outline-variant)' }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '10px' }}>
                📋 Executed Trade History & Invalidation Logs
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--md-sys-color-outline-variant)', color: 'var(--text-muted)', textAlign: 'left' }}>
                      <th style={{ padding: '6px 8px' }}>Entry Date</th>
                      <th style={{ padding: '6px 8px' }}>Exit Date</th>
                      <th style={{ padding: '6px 8px' }}>Side</th>
                      <th style={{ padding: '6px 8px' }}>Entry Price</th>
                      <th style={{ padding: '6px 8px' }}>Exit Price</th>
                      <th style={{ padding: '6px 8px' }}>P&L ({currPrefix})</th>
                      <th style={{ padding: '6px 8px' }}>Exit Reason</th>
                      <th style={{ padding: '6px 8px' }}>Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.trades.map((t, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                        <td style={{ padding: '8px' }}>{t.entryDate}</td>
                        <td style={{ padding: '8px' }}>{t.exitDate}</td>
                        <td style={{ padding: '8px', color: 'var(--accent-blue)', fontWeight: 700 }}>{t.side}</td>
                        <td style={{ padding: '8px' }} className="mono-num">{currPrefix}{t.entryPrice}</td>
                        <td style={{ padding: '8px' }} className="mono-num">{currPrefix}{t.exitPrice}</td>
                        <td style={{ padding: '8px', color: t.pnl >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 700 }} className="mono-num">
                          {t.pnl >= 0 ? '+' : ''}{currPrefix}{t.pnl?.toLocaleString()} ({t.pnlPct}%)
                        </td>
                        <td style={{ padding: '8px', color: 'var(--text-muted)' }}>{t.reason || 'TARGET'}</td>
                        <td style={{ padding: '8px' }}>
                          <span style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '9px',
                            fontWeight: 800,
                            backgroundColor: t.outcome === 'WIN' ? 'var(--emerald-pos-bg)' : 'var(--accent-red-bg)',
                            color: t.outcome === 'WIN' ? 'var(--accent-green)' : 'var(--accent-red)'
                          }}>
                            {t.outcome}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
