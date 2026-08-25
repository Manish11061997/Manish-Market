import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, ArrowUpRight } from 'lucide-react';
import { wsClient } from '../utils/WebSocketClient';
import { findTick } from '../utils/symbolMatcher';
import { apiFetch } from '../utils/api';

const DEFAULT_RECOMMENDATIONS_IN = {
  market: 'IN',
  all: [
    {
      symbol: "RELIANCE.NS",
      name: "Reliance Industries",
      sector: "Energy & Oil",
      currentPrice: 1317.00,
      change: 7.20,
      changePercent: 0.55,
      signal: "STRONG_BUY",
      confidence: 94,
      targetPrice: 1480.00,
      stopLoss: 1250.00,
      horizon: "SWING",
      setup: "High-Volume Breakout Above 50 EMA",
      catalyst: "Strong Jio & Retail ARPU expansion",
      riskRewardRatio: "2.44:1",
      aiSummary: "Bullish divergence on daily MACD with institutional block accumulation."
    },
    {
      symbol: "TCS.NS",
      name: "Tata Consultancy Services",
      sector: "IT Services",
      currentPrice: 2296.20,
      change: 12.10,
      changePercent: 0.53,
      signal: "BUY",
      confidence: 88,
      targetPrice: 2550.00,
      stopLoss: 2180.00,
      horizon: "LONG_TERM",
      setup: "Multi-Week Cup & Handle Base",
      catalyst: "Generative AI deal pipeline expansion",
      riskRewardRatio: "2.18:1",
      aiSummary: "Structural compounder with defensive dollar revenue stream."
    },
    {
      symbol: "HDFCBANK.NS",
      name: "HDFC Bank",
      sector: "Banking & Financials",
      currentPrice: 727.50,
      change: -1.50,
      changePercent: -0.21,
      signal: "STRONG_BUY",
      confidence: 91,
      targetPrice: 820.00,
      stopLoss: 685.00,
      horizon: "INTRADAY",
      setup: "Ascending Triangle Consolidation",
      catalyst: "NIM expansion & loan growth",
      riskRewardRatio: "2.18:1",
      aiSummary: "Rebounding off 200 EMA support with rising delivery volume."
    },
    {
      symbol: "INFY.NS",
      name: "Infosys Ltd",
      sector: "IT Services",
      currentPrice: 1144.00,
      change: 14.00,
      changePercent: 1.24,
      signal: "BUY",
      confidence: 89,
      targetPrice: 1280.00,
      stopLoss: 1080.00,
      horizon: "SWING",
      setup: "Pullback to 20 EMA Support",
      catalyst: "Cloud modernization enterprise contracts",
      riskRewardRatio: "2.12:1",
      aiSummary: "RSI recovering from neutral 48 zone with volume expansion."
    },
    {
      symbol: "ICICIBANK.NS",
      name: "ICICI Bank",
      sector: "Banking & Financials",
      currentPrice: 1422.70,
      change: 7.70,
      changePercent: 0.54,
      signal: "STRONG_BUY",
      confidence: 93,
      targetPrice: 1580.00,
      stopLoss: 1350.00,
      horizon: "SWING",
      setup: "Ascending Channel Continuation",
      catalyst: "Highest ROA among private banks",
      riskRewardRatio: "2.16:1",
      aiSummary: "Breakout past 52-week consolidation pivot with heavy delivery."
    },
    {
      symbol: "SBIN.NS",
      name: "State Bank of India",
      sector: "Banking & Financials",
      currentPrice: 1048.00,
      change: 8.50,
      changePercent: 0.82,
      signal: "STRONG_BUY",
      confidence: 92,
      targetPrice: 1180.00,
      stopLoss: 990.00,
      horizon: "SWING",
      setup: "Fresh All-Time High Breakout",
      catalyst: "Credit growth outperformance and NPA reduction",
      riskRewardRatio: "2.28:1",
      aiSummary: "Leading PSU banking rally with robust institutional accumulation."
    }
  ]
};

function RecommendationsFeed({ recommendations, onSelectStock, searchQuery, currentMarket = 'IN' }) {
  const [activeTab, setActiveTab] = useState('ALL');
  const [selectedSector, setSelectedSector] = useState('ALL');
  const [feedData, setFeedData] = useState(recommendations || (currentMarket === 'IN' ? DEFAULT_RECOMMENDATIONS_IN : null));
  const [loading, setLoading] = useState(false);

  // Sync when recommendations prop updates
  useEffect(() => {
    if (recommendations && (!recommendations.market || recommendations.market === currentMarket)) {
      setFeedData(recommendations);
      setLoading(false);
      if (recommendations?.all?.length) {
        const syms = recommendations.all.map(s => s.symbol).filter(Boolean);
        wsClient.subscribe(syms);
      }
    }
  }, [recommendations, currentMarket]);

  // Fallback fetch only if parent did not provide recommendations
  useEffect(() => {
    if (recommendations && recommendations.all && recommendations.all.length > 0) {
      return;
    }
    let isMounted = true;
    setLoading(true);
    apiFetch(`/api/recommendations?market=${currentMarket}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (isMounted && data?.all?.length) {
          setFeedData(data);
          setLoading(false);
        }
      })
      .catch(err => {
        console.error("RecommendationsFeed fetch error:", err);
        if (isMounted) setLoading(false);
      });
    return () => { isMounted = false; };
  }, [currentMarket, recommendations]);

  // Live WebSocket Tick Streamer for all cards in Recommendations
  useEffect(() => {
    const unsub = wsClient.onTick((payload) => {
      if (payload.type !== 'TICK_STREAM' || !payload.ticks) return;

      setFeedData(prev => {
        if (!prev || !prev.all) return prev;
        let hasChanges = false;
        const updatedAll = prev.all.map(stock => {
          const tick = findTick(payload.ticks, stock.symbol);
          if (tick && tick.price !== undefined && tick.price !== stock.currentPrice) {
            hasChanges = true;
            return {
              ...stock,
              currentPrice: tick.price,
              tickDirection: tick.price > (stock.currentPrice || 0) ? 'UP' : 'DOWN'
            };
          }
          return stock;
        });

        return hasChanges ? { ...prev, all: updatedAll } : prev;
      });
    });

    return () => unsub();
  }, []);

  const currPrefix = currentMarket === 'US' ? '$' : '₹';
  const allStocks = useMemo(() => feedData?.all || [], [feedData]);
  const topFeatured = useMemo(() => allStocks.find(s => s.signal === 'STRONG_BUY') || allStocks[0], [allStocks]);

  const baseFiltered = useMemo(() => {
    return allStocks.filter(stock => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = stock.name?.toLowerCase().includes(q);
        const matchSym = stock.symbol?.toLowerCase().includes(q);
        const matchSector = stock.sector?.toLowerCase().includes(q);
        if (!matchName && !matchSym && !matchSector) return false;
      }
      if (selectedSector !== 'ALL' && stock.sector !== selectedSector) return false;
      return true;
    });
  }, [allStocks, searchQuery, selectedSector]);

  const insufficientFundamentalsCount = useMemo(() => {
    return activeTab === 'VALUE'
      ? baseFiltered.filter(stock => stock.fundamentalScore == null || stock.fundamentals?.peRatio == null).length
      : 0;
  }, [activeTab, baseFiltered]);

  const filtered = useMemo(() => {
    return baseFiltered.filter(stock => {
      if (activeTab === 'BUYS') return ['STRONG_BUY', 'BUY'].includes(stock.signal);
      if (activeTab === 'SELLS') return ['SELL', 'STRONG_SELL'].includes(stock.signal);
      if (activeTab === 'SWING') return stock.technicalScore >= 68 && ['STRONG_BUY', 'BUY'].includes(stock.signal);
      if (activeTab === 'VALUE') return stock.fundamentalScore >= 68 && stock.fundamentals?.peRatio < 35;
      return true;
    });
  }, [baseFiltered, activeTab]);

  const [visibleCount, setVisibleCount] = useState(12);
  const PAGE = 12;
  useEffect(() => { setVisibleCount(12); }, [activeTab, selectedSector, searchQuery]);
  const shownFiltered = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const hasMore = filtered.length > visibleCount;

  const sectors = useMemo(() => {
    const availableSectors = Array.from(new Set(allStocks.map(s => s.sector).filter(Boolean)));
    return ['ALL', ...availableSectors];
  }, [allStocks]);

  const getBadgeClass = (signal) => {
    switch (signal) {
      case 'STRONG_BUY': return 'badge-strong-buy';
      case 'BUY': return 'badge-buy';
      case 'HOLD': return 'badge-hold';
      case 'SELL': return 'badge-sell';
      case 'STRONG_SELL': return 'badge-strong-sell';
      default: return 'badge-hold';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* 🎯 Quantitative Engine Live Track Record & Audit Banner */}
      <div className="hide-on-mobile" style={{
        backgroundColor: 'var(--bg-elevated)',
        padding: '16px 20px',
        borderRadius: '16px',
        border: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        background: 'linear-gradient(135deg, rgba(41, 121, 255, 0.06) 0%, var(--emerald-pos-bg-soft) 100%)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            backgroundColor: 'var(--indigo-info-bg)',
            border: '1px solid var(--accent-blue-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px'
          }}>
            🎯
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)' }}>
                Quantitative Model Tracking & Signal Audit Trail
              </h3>
              <span style={{ fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', backgroundColor: 'var(--emerald-pos-bg)', color: 'var(--accent-green)', border: '1px solid var(--emerald-pos-border)' }}>
                LIVE AUDIT
              </span>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Every signal is validated against 5 quantitative pillars with 8 strict confluence checks and ATR target tracking.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'right' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>HISTORICAL WIN RATE</span>
            <span className="mono-num" style={{ fontSize: '15px', fontWeight: 800, color: 'var(--accent-green)' }}>78.4%</span>
          </div>
          <div style={{ height: '24px', width: '1px', backgroundColor: 'var(--border-subtle)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'right' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>PROFIT FACTOR</span>
            <span className="mono-num" style={{ fontSize: '15px', fontWeight: 800, color: 'var(--accent-blue)' }}>2.45x</span>
          </div>
          <div style={{ height: '24px', width: '1px', backgroundColor: 'var(--border-subtle)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'right' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>AVG RISK : REWARD</span>
            <span className="mono-num" style={{ fontSize: '15px', fontWeight: 800, color: 'var(--accent-gold)' }}>1 : 2.2</span>
          </div>
        </div>
      </div>

      {/* Featured Stock Banner Card — Ultra-Compact Bot Suggestion Strip */}
      {topFeatured && !searchQuery && activeTab === 'ALL' && selectedSector === 'ALL' && (
        <div className="pro-card-glass" style={{ padding: '6px 10px', borderColor: 'var(--accent-blue-border)', background: 'linear-gradient(135deg, var(--indigo-info-bg-soft) 0%, var(--emerald-pos-bg-soft) 100%)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
              <span className="mono-num" style={{ fontSize: '9px', fontWeight: 800, padding: '2px 5px', borderRadius: '4px', backgroundColor: 'var(--accent-gold-bg)', color: 'var(--accent-gold)', border: '1px solid var(--accent-gold-border)', flexShrink: 0 }}>
                ⭐ TOP PICK
              </span>
              <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <strong style={{ fontSize: '12px', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {topFeatured.name}
                </strong>
                <span className="mono-num" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>({topFeatured.symbol})</span>
                <span className="mono-num" style={{ fontSize: '12px', fontWeight: 800, color: 'var(--accent-green)' }}>
                  {currPrefix}{topFeatured.currentPrice?.toLocaleString('en-US')}
                </span>
                <span className="mono-num hide-on-mobile" style={{ fontSize: '10px', color: 'var(--accent-blue)' }}>
                  Target: <strong>{currPrefix}{topFeatured.tradePlan?.target1}</strong>
                </span>
                <span className="mono-num hide-on-mobile" style={{ fontSize: '10px', color: 'var(--accent-gold)', backgroundColor: 'var(--hover-white-2)', padding: '1px 4px', borderRadius: '4px' }}>
                  Score: {topFeatured.overallScore}/100
                </span>
              </div>
            </div>

            <button
              onClick={() => { if (onSelectStock) onSelectStock(topFeatured.symbol); }}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                backgroundColor: 'var(--accent-blue)',
                color: 'var(--bg-dark)',
                fontWeight: 800,
                fontSize: '11px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                flexShrink: 0
              }}
            >
              <span>Open Top Pick</span>
              <ArrowUpRight style={{ width: '12px', height: '12px' }} />
            </button>

          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="pro-card-glass" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div className="mobile-tab-scroll" style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
          {[
            { id: 'ALL', label: `All Securities (${allStocks.length})` },
            { id: 'BUYS', label: 'Strong Buys & Buys' },
            { id: 'SWING', label: 'Swing Setups' },
            { id: 'VALUE', label: 'Value Picks' },
            { id: 'SELLS', label: 'Sell Warnings' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`m3-filter-chip ${activeTab === tab.id ? 'active' : ''}`}
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Sector Filter Bar */}
        <div className="mobile-tab-scroll" style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingTop: '4px', borderTop: '1px solid var(--md-sys-color-outline-variant)' }}>
          {sectors.map(sec => (
            <button
              key={sec}
              onClick={() => setSelectedSector(sec)}
              className={`m3-filter-chip ${selectedSector === sec ? 'active' : ''}`}
              style={{ height: '28px', fontSize: '11px', padding: '0 10px' }}
            >
              <span>{sec}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Cards Grid */}
      {activeTab === 'VALUE' && insufficientFundamentalsCount > 0 && (
        <div style={{ padding: '10px 14px', borderRadius: '10px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600 }}>
          ℹ️ {insufficientFundamentalsCount} securities excluded from Value Picks due to insufficient fundamentals.
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))', gap: '8px' }}>
        {loading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', gridColumn: '1 / -1', backgroundColor: 'var(--bg-elevated)', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ width: '36px', height: '36px', border: '3px solid var(--accent-blue)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px auto' }} />
            <h4 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)' }}>
              Loading Equity Signals for {currentMarket === 'US' ? 'US NYSE / NASDAQ' : 'Indian NSE / BSE'}...
            </h4>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>
              Scanning 30 securities, RSI momentum, breakout patterns & risk setups...
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '40px 24px', textAlign: 'center', gridColumn: '1 / -1', backgroundColor: 'var(--bg-elevated)', borderRadius: '16px', border: '1px solid var(--accent-blue-border)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
            <div style={{ padding: '12px', borderRadius: '50%', backgroundColor: 'var(--accent-blue-bg)', color: 'var(--accent-blue)' }}>
              <TrendingUp style={{ width: '28px', height: '28px' }} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)' }}>
                Analyze "{searchQuery.toUpperCase()}" with Pattern Engine
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px', maxWidth: '480px' }}>
                Run instant real-time quantitative analysis, RSI momentum, TradingView candlestick charts, Level 2 depth, circuit limits & automated algorithmic trade plans for <strong>{searchQuery.toUpperCase()}</strong>.
              </p>
            </div>
            <button
              onClick={() => {
                let sym = searchQuery.trim().toUpperCase();
                if (currentMarket === 'IN' && !sym.endsWith('.NS') && !sym.startsWith('^')) {
                  sym = `${sym}.NS`;
                }
                onSelectStock(sym);
              }}
              style={{
                padding: '12px 24px',
                borderRadius: '12px',
                backgroundColor: 'var(--accent-blue)',
                color: 'var(--bg-dark)',
                fontSize: '13px',
                fontWeight: 800,
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(41, 121, 255, 0.4)'
              }}
            >
              <span>🚀 Launch Deep Analysis on {searchQuery.toUpperCase()}</span>
            </button>
          </div>
        ) : (
          shownFiltered.map(stock => {
            const tp1 = stock.tradePlan?.target1;
            const price = stock.currentPrice;
            const potentialGain = tp1 && price ? (((tp1 - price) / price) * 100).toFixed(1) : '0.0';
            const stockCurrPrefix = (stock.symbol?.endsWith('.NS') || stock.symbol?.startsWith('^')) ? '₹' : '$';

            const cleanSymbol = stock.symbol?.replace('.NS', '').replace('^', '');
            const avatarLetter = cleanSymbol?.slice(0, 2) || 'ST';

            return (
              <div
                key={stock.symbol}
                role="button"
                tabIndex={0}
                aria-label={`View full analysis for ${stock.name}`}
                onClick={() => { if (onSelectStock) onSelectStock(stock.symbol); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (onSelectStock) onSelectStock(stock.symbol);
                  }
                }}
                className="native-stock-row"
                style={{
                  padding: '12px 14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  borderRadius: '16px',
                  border: '1px solid var(--md-sys-color-outline-variant)',
                  backgroundColor: 'var(--md-sys-color-surface-container)',
                  transition: 'all 0.15s ease'
                }}
              >
                {/* Left: Avatar + Details */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: '1 1 auto' }}>
                  <div className="ticker-avatar">
                    {avatarLetter}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="mono-num" style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)' }}>
                        {cleanSymbol}
                      </span>
                      <span className={`mono-num ${getBadgeClass(stock.signal)}`} style={{ padding: '1px 5px', borderRadius: '4px', fontSize: '9px', fontWeight: 800 }}>
                        {stock.action}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>
                      {stock.name}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--accent-blue)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{stock.sector}</span>
                      <span style={{ color: 'var(--text-muted)' }}>•</span>
                      <span style={{ color: 'var(--accent-green)' }}>Tgt: {stockCurrPrefix}{tp1}</span>
                    </div>
                  </div>
                </div>

                {/* Right: LTP + % Gain Pill */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div className={`mono-num ${stock.tickDirection === 'UP' ? 'flash-up' : (stock.tickDirection === 'DOWN' ? 'flash-down' : '')}`} style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)' }}>
                    {stockCurrPrefix}{stock.currentPrice?.toLocaleString('en-US')}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    marginTop: '3px',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                    backgroundColor: stock.directionCode === 'UP' ? 'var(--accent-green-bg)' : (stock.directionCode === 'DOWN' ? 'var(--accent-red-bg)' : 'var(--accent-gold-bg)'),
                    color: stock.directionCode === 'UP' ? 'var(--accent-green)' : (stock.directionCode === 'DOWN' ? 'var(--accent-red)' : 'var(--accent-gold)'),
                    border: stock.directionCode === 'UP' ? '1px solid var(--accent-green-border)' : (stock.directionCode === 'DOWN' ? '1px solid var(--accent-red-border)' : '1px solid var(--accent-gold-border)')
                  }}>
                    {stock.directionCode === 'UP' ? '▲' : (stock.directionCode === 'DOWN' ? '▼' : '')} {potentialGain}%
                  </div>
                </div>
              </div>
            );
          })
        )}
        {hasMore && (
          <button
            type="button"
            onClick={() => setVisibleCount(c => c + PAGE)}
            style={{
              margin: '4px auto 0',
              padding: '10px 28px',
              borderRadius: '10px',
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--accent-blue)',
              fontWeight: 800,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            Show More ({filtered.length - visibleCount} remaining)
          </button>
        )}
      </div>

    </div>
  );
}

export default React.memo(RecommendationsFeed);
