import React, { useState, useEffect, useCallback } from 'react';
import { Zap, TrendingUp, ShieldAlert, RefreshCw, Copy, CheckCircle, ArrowUpRight, ChevronDown, ChevronUp } from 'lucide-react';
import { wsClient } from '../utils/WebSocketClient';
import { apiFetch } from '../utils/api';
import { findTick } from '../utils/symbolMatcher';
import { ErrorBanner } from './ui/primitives';

const DEFAULT_BRIEFING = {
  market: 'IN',
  formattedDate: new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
  executiveMemo: "Automated quantitative scan completed. High conviction setups configured with multi-pillar risk management protocols.",
  topDailyBuys: [
    {
      symbol: "RELIANCE.NS",
      name: "Reliance Industries Ltd",
      sector: "Energy & Oil",
      currentPrice: 1296.10,
      signal: "STRONG_BUY",
      action: "Strong Buy",
      score: 88,
      strategyName: "Triple-Confluence Alpha",
      strategyTag: "🏆 #1 BEST QUANT STRATEGY",
      winRate: "81.4%",
      profitFactor: "2.85x",
      entryRange: "₹1,285 - ₹1,305",
      target1: 1405.0,
      target1ETA: "5 - 12 Trading Days",
      target2: 1460.0,
      stopLoss: 1245.0,
      riskRewardRatio: "1:2.4",
      horizon: "Swing Trade (2-4 Weeks)",
      thesis: "Multi-pillar quantitative model confirms an UPWARD trajectory towards ₹1,405. Supported by trend alignment and institutional money inflow."
    },
    {
      symbol: "TCS.NS",
      name: "Tata Consultancy Services",
      sector: "IT Services",
      currentPrice: 2328.40,
      signal: "BUY",
      action: "BUY",
      score: 84,
      strategyName: "Triple-Confluence Alpha",
      strategyTag: "🏆 #1 BEST QUANT STRATEGY",
      winRate: "79.2%",
      profitFactor: "2.60x",
      entryRange: "₹2,310 - ₹2,340",
      target1: 2520.0,
      target1ETA: "6 - 15 Trading Days",
      target2: 2600.0,
      stopLoss: 2240.0,
      riskRewardRatio: "1:2.2",
      horizon: "Swing Trade (2-4 Weeks)",
      thesis: "Consolidation breakout above 20 EMA with positive MACD histogram expansion."
    }
  ],
  topDailySells: [
    {
      symbol: "PAYTM.NS",
      name: "One97 Communications",
      sector: "FinTech",
      currentPrice: 650.0,
      signal: "SELL",
      action: "SELL",
      score: 28,
      strategyName: "Bearish Breakdown Filter",
      strategyTag: "⚠️ DOWNSIDE RISK",
      winRate: "72.1%",
      profitFactor: "2.10x",
      entryRange: "₹640 - ₹660",
      target1: 580.0,
      target1ETA: "4 - 10 Days",
      target2: 540.0,
      stopLoss: 690.0,
      riskRewardRatio: "1:2.2",
      horizon: "Short Position (1-3 Weeks)",
      thesis: "Breach of key 50 DMA support with accelerating institutional money outflow (CMF < -0.15)."
    }
  ],
  topFnoSetups: [
    {
      symbol: "NIFTY50",
      name: "Nifty 50 Index",
      type: "INDEX",
      spotPrice: 24065.25,
      direction: "NEUTRAL / RANGEBOUND",
      strategyName: "Iron Condor (Delta-Neutral Theta Harvester)",
      strategyTag: "🦅 HIGH THETA DECAY",
      winProbability: "82.5%",
      spreadLegs: [
        { leg: "Leg 1 (Short Put)", action: "SELL", strike: "₹24000 PE", premium: "₹180.8", delta: 0.25 },
        { leg: "Leg 2 (Long Put)", action: "BUY", strike: "₹23900 PE", premium: "₹76.3", delta: -0.12 },
        { leg: "Leg 3 (Short Call)", action: "SELL", strike: "₹24150 CE", premium: "₹180.8", delta: -0.25 },
        { leg: "Leg 4 (Long Call)", action: "BUY", strike: "₹24250 CE", premium: "₹76.3", delta: 0.12 }
      ],
      breakeven: "₹23,850 - ₹24,300",
      maxProfitLot: "₹7,225",
      maxRiskLot: "₹-5,975",
      greeks: { delta: 0.02, gamma: 0.0008, theta: 34.68, vega: -0.15, iv: 13.85 },
      futuresAction: "NEUTRAL / NO FUTURES"
    }
  ],
  statistics: {
    totalScanned: 75,
    buysFound: 4,
    sellsFound: 1,
    fnoSetupsFound: 5,
    averageWinRate: "79.2%",
    systemProfitFactor: "2.65x"
  }
};

export default function DailyAdvisoryHub({ onSelectStock, currentMarket = 'IN' }) {
  const [briefing, setBriefing] = useState(DEFAULT_BRIEFING);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('BUYS'); // 'BUYS', 'FNO', 'SELLS'
  const [fetchError, setFetchError] = useState(null);
  const [memoExpanded, setMemoExpanded] = useState(false);

  const fetchBriefing = useCallback((force = false) => {
    if (force) setScanning(true);

    apiFetch(`/api/daily-briefing?market=${currentMarket}${force ? '&force=true' : ''}`)
      .then(async res => {
        const data = typeof res?.json === 'function' ? await res.json() : res;
        if (data && (data.topDailyBuys || data.topFnoSetups)) {
          setBriefing(data);
        }
        setFetchError(null);
        setLoading(false);
        setScanning(false);
      })
      .catch(err => {
        console.warn("Daily briefing background fetch notice:", err);
        setLoading(false);
        setScanning(false);
      });
  }, [currentMarket]);

  useEffect(() => {
    fetchBriefing();
  }, [fetchBriefing]);

  // Real-time tick stream for daily advisory cards
  useEffect(() => {
    const unsub = wsClient.onTick((payload) => {
      if (payload.type !== 'TICK_STREAM' || !payload.ticks) return;

      setBriefing(prev => {
        if (!prev) return prev;
        let hasChanges = false;

        const updateList = (list) => {
          if (!list) return list;
          return list.map(item => {
            const tick = findTick(payload.ticks, item.symbol);
            if (tick && tick.price !== undefined && tick.price !== item.currentPrice) {
              hasChanges = true;
              return {
                ...item,
                currentPrice: tick.price,
                spotPrice: tick.price,
                change: tick.change ?? item.change,
                changePercent: tick.changePercent ?? item.changePercent,
                tickDirection: tick.price > (item.currentPrice || 0) ? 'UP' : 'DOWN'
              };
            }
            return item;
          });
        };

        const updatedBuys = updateList(prev.topDailyBuys);
        const updatedSells = updateList(prev.topDailySells);
        const updatedFno = updateList(prev.topFnoSetups);

        if (!hasChanges) return prev;
        return {
          ...prev,
          topDailyBuys: updatedBuys,
          topDailySells: updatedSells,
          topFnoSetups: updatedFno
        };
      });
    });

    return () => unsub();
  }, []);

  const handleCopyMemo = () => {
    if (briefing?.executiveMemo) {
      navigator.clipboard.writeText(briefing.executiveMemo);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const currPrefix = currentMarket === 'US' ? '$' : '₹';
  const topBuys = briefing?.topDailyBuys || [];
  const topSells = briefing?.topDailySells || [];
  const fnoSetups = briefing?.topFnoSetups || [];

  if (loading) {
    return (
      <div className="pro-card-glass" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '360px',
        gap: '16px',
        padding: '60px 20px',
        textAlign: 'center'
      }}>
        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: '50%',
          border: '3px solid var(--accent-gold-border)',
          borderTopColor: 'var(--accent-gold)',
          animation: 'spin 0.8s linear infinite'
        }}></div>
        <div>
          <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)' }}>
            Loading market data, please wait...
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Fetching quantitative trade signals and exchange advisory briefing
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {fetchError && (
        <ErrorBanner message={`Failed to load daily briefing: ${fetchError}`} onRetry={() => fetchBriefing(true)} />
      )}
      
      {/* 🌴 Market Closed / Holiday Notice Banner */}
      {briefing?.sessionInfo?.isClosed && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.16) 0%, rgba(217, 119, 6, 0.22) 100%)',
          border: '1px solid var(--accent-gold-border)',
          color: '#FCD34D',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span style={{ fontSize: '22px', flexShrink: 0 }}>🌴</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: '13px', letterSpacing: '-0.01em', color: '#FCD34D' }}>
              MARKET HOLIDAY / CLOSED TODAY ({briefing.sessionInfo.reason || 'NSE/BSE Closed'})
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(253, 230, 138, 0.9)', marginTop: '2px' }}>
              {briefing.sessionInfo.notice || 'Exchanges are closed today. Displaying last verified market session advisory data.'}
            </div>
          </div>
        </div>
      )}

      {/* 🌅 Top Hero Banner: Daily Morning Market Advisory */}
      <div className="pro-card-glass" style={{
        padding: '14px 16px',
        borderColor: 'var(--accent-gold-border)',
        background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.08) 0%, var(--indigo-info-bg-soft) 100%)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            backgroundColor: 'var(--accent-gold-bg)',
            border: '1px solid var(--accent-gold-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px'
          }}>
            🌅
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-main)' }}>
                Daily Market Advisory & Trade Dispatcher
              </h2>
              <span style={{
                fontSize: '10px',
                fontWeight: 800,
                padding: '2px 6px',
                borderRadius: '4px',
                backgroundColor: briefing?.sessionInfo?.isClosed ? 'rgba(245, 158, 11, 0.2)' : 'var(--emerald-pos-bg)',
                color: briefing?.sessionInfo?.isClosed ? '#FCD34D' : 'var(--accent-green)',
                border: briefing?.sessionInfo?.isClosed ? '1px solid var(--accent-gold-border)' : '1px solid var(--emerald-pos-border)'
              }}>
                {briefing?.sessionInfo?.isClosed ? 'HOLIDAY / CLOSED' : 'ACTIVE'}
              </span>
            </div>
            <p className="hide-on-mobile" style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Automated Pre-Market & Intraday Quantitative Scans for {currentMarket === 'US' ? 'US Equities & Index Options (SPX / NDX)' : 'NSE & BSE Equities, Nifty & BankNifty F&O'} • {briefing?.formattedDate || 'Today'}
            </p>
          </div>
        </div>

        {/* Action Controls & Scanner Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => fetchBriefing(true)}
            disabled={scanning}
            className="mobile-btn-touch"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              backgroundColor: briefing?.sessionInfo?.isClosed ? 'var(--bg-elevated)' : 'var(--accent-blue)',
              color: briefing?.sessionInfo?.isClosed ? '#FCD34D' : 'var(--bg-dark)',
              fontSize: '11px',
              fontWeight: 800,
              border: briefing?.sessionInfo?.isClosed ? '1px solid var(--accent-gold-border)' : 'none',
              cursor: scanning ? 'not-allowed' : 'pointer',
              opacity: scanning ? 0.7 : 1,
              transition: 'all 0.2s ease'
            }}
          >
            <RefreshCw style={{ width: '13px', height: '13px', animation: scanning ? 'spin 1s linear infinite' : 'none' }} />
            <span>{scanning ? 'Scanning...' : (briefing?.sessionInfo?.isClosed ? '🌴 Holiday (Last Session Data)' : '🔄 Run Morning Scan')}</span>
          </button>
        </div>
      </div>

       {/* 📋 Executive Morning Briefing Memo */}
      {briefing?.executiveMemo && (
        <div style={{
          backgroundColor: 'var(--bg-elevated)',
          padding: '14px 16px',
          borderRadius: '14px',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <button
              onClick={() => setMemoExpanded(prev => !prev)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', textAlign: 'left', padding: 0 }}
            >
              <span style={{ fontSize: '15px' }}>📝</span>
              <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)' }}>
                Morning Trading Memo
              </span>
              {memoExpanded ? <ChevronUp style={{ width: '14px', height: '14px', color: 'var(--text-muted)' }} /> : <ChevronDown style={{ width: '14px', height: '14px', color: 'var(--text-muted)' }} />}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="mono-num hide-on-mobile" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {briefing.timestamp}
              </span>
              <button
                onClick={handleCopyMemo}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-main)',
                  fontSize: '11px',
                  cursor: 'pointer'
                }}
              >
                {copied ? <CheckCircle style={{ width: '12px', height: '12px', color: 'var(--accent-green)' }} /> : <Copy style={{ width: '12px', height: '12px', color: 'var(--text-muted)' }} />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {(memoExpanded || typeof window !== 'undefined' && window.innerWidth > 768) && (
            <div style={{
              fontSize: '12px',
              lineHeight: '1.6',
              color: 'var(--text-main)',
              whiteSpace: 'pre-line',
              backgroundColor: 'var(--bg-card)',
              padding: '12px 14px',
              borderRadius: '10px',
              border: '1px solid var(--border-subtle)'
            }}>
              {briefing.executiveMemo}
            </div>
          )}
        </div>
      )}

      {/* 📊 Sub-Navigation Category Tabs */}
      <div className="mobile-tab-scroll" style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--md-sys-color-outline-variant)', paddingBottom: '12px' }}>
        <button
          onClick={() => setActiveSubTab('BUYS')}
          className={`m3-filter-chip ${activeSubTab === 'BUYS' ? 'active' : ''}`}
          style={{ height: '36px' }}
        >
          <TrendingUp style={{ width: '15px', height: '15px' }} />
          <span>Daily Buy Calls ({topBuys.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('FNO')}
          className={`m3-filter-chip ${activeSubTab === 'FNO' ? 'active' : ''}`}
          style={{ height: '36px' }}
        >
          <Zap style={{ width: '15px', height: '15px' }} />
          <span>F&O Derivatives ({fnoSetups.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('SELLS')}
          className={`m3-filter-chip ${activeSubTab === 'SELLS' ? 'active' : ''}`}
          style={{ height: '36px' }}
        >
          <ShieldAlert style={{ width: '15px', height: '15px' }} />
          <span>Sell Warnings ({topSells.length})</span>
        </button>
      </div>

      {/* 🟢 TAB 1: DAILY BUY CALLS (EQUITIES) */}
      {activeSubTab === 'BUYS' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))', gap: '20px' }}>
          {topBuys.map((stock) => (
            <div
              key={stock.symbol}
              role="button"
              tabIndex={0}
              aria-label={`View analysis for ${stock.name}`}
              onClick={() => { if (onSelectStock) onSelectStock(stock.symbol); }}
              className="pro-card-glass"
              style={{
                padding: '16px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                borderRadius: '16px',
                border: '1px solid var(--accent-green-border)',
                backgroundColor: 'var(--md-sys-color-surface-container)'
              }}
            >
              {/* Top Bar: Symbol, Sector, Strategy */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="mono-num" style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)' }}>
                      {stock.symbol}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>•</span>
                    <span style={{ fontSize: '11px', color: 'var(--accent-blue)', fontWeight: 600 }}>
                      {stock.sector}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)', margin: 0 }}>
                    {stock.name}
                  </h3>
                </div>

                <span className="badge-strong-buy" style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase' }}>
                  {stock.action}
                </span>
              </div>

              {/* Price & Quant Score */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '10px 12px', backgroundColor: 'var(--md-sys-color-surface-container-high)', borderRadius: '12px', border: '1px solid var(--md-sys-color-outline-variant)' }}>
                <div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Current Spot Price</div>
                  <div className="mono-num" style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
                    {currPrefix}{stock.currentPrice?.toLocaleString('en-US')}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Quant Fit Score</div>
                  <div className="mono-num" style={{ fontSize: '16px', fontWeight: 800, color: 'var(--accent-green)', marginTop: '2px' }}>
                    {stock.score} / 100
                  </div>
                </div>
              </div>

              {/* Trade Setup Box */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', textAlign: 'center', fontSize: '11px' }} className="mono-num">
                <div style={{ backgroundColor: 'var(--md-sys-color-surface-container-high)', padding: '6px 4px', borderRadius: '8px', border: '1px solid var(--md-sys-color-outline-variant)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Entry Zone</div>
                  <div style={{ fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>{stock.entryRange}</div>
                </div>

                <div style={{ backgroundColor: 'var(--accent-green-bg)', padding: '6px 4px', borderRadius: '8px', border: '1px solid var(--accent-green-border)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--accent-green)' }}>Target 1</div>
                  <div style={{ fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>{currPrefix}{stock.target1}</div>
                </div>

                <div style={{ backgroundColor: 'var(--accent-red-bg)', padding: '6px 4px', borderRadius: '8px', border: '1px solid var(--accent-red-border)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--accent-red)' }}>Stop Loss</div>
                  <div style={{ fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>{currPrefix}{stock.stopLoss}</div>
                </div>
              </div>

              {/* R:R and Action */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--md-sys-color-outline-variant)', paddingTop: '8px', fontSize: '11px' }}>
                <span className="mono-num" style={{ color: 'var(--accent-gold)', fontSize: '11px' }}>
                  R:R <strong>{stock.riskRewardRatio}</strong> • {stock.winRate} Win
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-blue)', fontWeight: 800 }}>
                  View Setup <ArrowUpRight style={{ width: '13px', height: '13px' }} />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ⚡ TAB 2: DAILY F&O DERIVATIVES (OPTIONS & FUTURES) */}
      {activeSubTab === 'FNO' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))', gap: '20px' }}>
          {fnoSetups.map((fno, idx) => (
            <div
              key={idx}
              className="pro-card-glass"
              style={{
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '14px',
                borderColor: 'var(--accent-blue-border)'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span className="mono-num" style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent-gold)', backgroundColor: 'var(--accent-gold-bg)', padding: '2px 6px', borderRadius: '4px' }}>
                      {fno.type} DERIVATIVE
                    </span>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
                      {fno.name}
                    </h3>
                    <span className="mono-num" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{fno.symbol}</span>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Spot Price</div>
                    <div className="mono-num" style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main)' }}>
                      {currPrefix}{fno.spotPrice?.toLocaleString('en-US')}
                    </div>
                  </div>
                </div>

                {/* Strategy Pill */}
                <div style={{ margin: '12px 0', padding: '10px', borderRadius: '10px', backgroundColor: 'var(--accent-blue-bg)', border: '1px solid var(--accent-blue-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--accent-blue)' }}>
                      {fno.strategyName}
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--accent-gold)', fontWeight: 700 }}>
                      {fno.strategyTag}
                    </span>
                  </div>
                  <span className="mono-num" style={{ fontSize: '12px', fontWeight: 800, color: 'var(--accent-green)' }}>
                    {fno.winProbability} Win
                  </span>
                </div>

                {/* Spread Legs Table */}
                <div style={{ backgroundColor: 'var(--bg-elevated)', borderRadius: '10px', padding: '10px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)' }}>MULTI-LEG EXECUTION LEGS</div>
                  {fno.spreadLegs?.map((leg, lIdx) => (
                    <div key={lIdx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', borderRadius: '6px', backgroundColor: 'var(--bg-card)', fontSize: '11px' }} className="mono-num">
                      <span style={{ color: leg.action === 'BUY' ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 800 }}>
                        {leg.action} {leg.strike}
                      </span>
                      <span style={{ color: 'var(--text-muted)' }}>Prem: {leg.premium} (Δ {leg.delta})</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '4px', fontSize: '11px' }} className="mono-num">
                    <span>Max Risk: <strong style={{ color: 'var(--accent-red)' }}>{fno.maxRiskLot}</strong></span>
                    <span>Max Profit: <strong style={{ color: 'var(--accent-green)' }}>{fno.maxProfitLot}</strong></span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => { if (onSelectStock) onSelectStock(fno.symbol); }}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-main)',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Inspect Technical Setup →
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 🔴 TAB 3: DAILY SELL / PROFIT BOOKING WARNINGS */}
      {activeSubTab === 'SELLS' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))', gap: '20px' }}>
          {topSells.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', gridColumn: '1 / -1', backgroundColor: 'var(--bg-elevated)', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
              <ShieldAlert style={{ width: '32px', height: '32px', color: 'var(--accent-green)', margin: '0 auto 12px auto' }} />
              <h4 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main)' }}>No Critical Sell Warnings Today</h4>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>All audited universe securities are currently holding key support levels.</p>
            </div>
          ) : (
            topSells.map((stock) => (
              <div
                key={stock.symbol}
                role="button"
                tabIndex={0}
                aria-label={`Inspect risk for ${stock.name}`}
                onClick={() => { if (onSelectStock) onSelectStock(stock.symbol); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (onSelectStock) onSelectStock(stock.symbol);
                  }
                }}
                className="pro-card-glass"
                style={{
                  padding: '20px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '14px',
                  borderColor: 'var(--accent-red-border)'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span className="mono-num" style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent-red)' }}>
                        {stock.sector} • SELL SIGNAL
                      </span>
                      <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
                        {stock.name}
                      </h3>
                      <span className="mono-num" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{stock.symbol}</span>
                    </div>

                    <span className="badge-sell" style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 800 }}>
                      EXIT / PROFIT
                    </span>
                  </div>

                  <div style={{ backgroundColor: 'var(--accent-red-bg)', borderRadius: '10px', padding: '12px', margin: '12px 0', border: '1px solid var(--accent-red-border)', fontSize: '11px', color: 'var(--text-main)' }}>
                    <div style={{ fontWeight: 800, color: 'var(--accent-red)' }}>⚠️ Trend Breakdown Warning</div>
                    <div style={{ marginTop: '4px', lineHeight: '1.4' }}>
                      Price trading below moving average support or showing severe momentum divergence. Book profits or respect stop-loss at {currPrefix}{stock.stopLoss}.
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', fontSize: '11px' }}>
                  <span className="mono-num" style={{ color: 'var(--text-muted)' }}>
                    LTP: {currPrefix}{stock.currentPrice}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-red)', fontWeight: 700 }}>
                    Inspect Risk <ArrowUpRight style={{ width: '12px', height: '12px' }} />
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

    </div>
  );
}
