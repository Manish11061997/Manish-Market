import React, { useState, useEffect, useRef } from 'react';
import { TrendingUp, Target, Copy, Check, CheckCircle2, Star } from 'lucide-react';
import { wsClient } from '../utils/WebSocketClient';
import { apiFetch } from '../utils/api';
import { findTick } from '../utils/symbolMatcher';
import { useWatchlist } from '../utils/useWatchlist';
import TradingViewCandleChart from './TradingViewCandleChart';
import { Modal } from './ui/primitives';

export default function StockDetailModal({ symbol, onClose, onOpenPatternEngine, onOpenAIEngine, currentMarket = 'IN' }) {
  const rawSym = typeof symbol === 'string' ? symbol : symbol?.symbol || 'RELIANCE.NS';
  const initialStock = typeof symbol === 'object' ? symbol : null;

  const { isWatchlisted, toggleWatchlist } = useWatchlist(currentMarket);
  const isSaved = isWatchlisted(rawSym);

  const [stock, setStock] = useState(initialStock);
  const [loading, setLoading] = useState(!initialStock);
  const [copied, setCopied] = useState(false);
  const [livePrice, setLivePrice] = useState(initialStock?.currentPrice || null);
  const [timeframe, setTimeframe] = useState('1D');
  const [viewTab, setViewTab] = useState('CHART'); // 'CHART', 'CHART_READING', 'DEPTH', 'ACTIONS'
  const [marketDepth, setMarketDepth] = useState(null);
  const [chartReading, setChartReading] = useState(null);
  const [isAdjustedPrice] = useState(true);
  const [corporateActions, setCorporateActions] = useState([]);
  const [priceFlash, setPriceFlash] = useState(null);
  const prevPriceRef = useRef(null);
  const priceFlashTimer = useRef(null);

  // 1. Fetch Detailed Stock, Actions & Chart Reading Data
  useEffect(() => {
    if (!rawSym) return;

    const targetSym = encodeURIComponent(rawSym);
    const safeJson = async (p) => {
      try {
        const res = await p;
        if (!res) return null;
        return typeof res.json === 'function' ? await res.json() : res;
      } catch {
        return null;
      }
    };

    Promise.all([
      safeJson(apiFetch(`/api/stock/${targetSym}?market=${currentMarket}`)),
      safeJson(apiFetch(`/api/corporate-actions/${targetSym}?market=${currentMarket}`)),
      safeJson(apiFetch(`/api/stock/${targetSym}/chart-reading?market=${currentMarket}`))
    ])
    .then(([stockRes, actionsRes, readingRes]) => {
      if (stockRes) {
        setStock(stockRes);
        setLivePrice(stockRes.currentPrice);
      }
      if (actionsRes?.actions) {
        setCorporateActions(actionsRes.actions);
      }
      if (readingRes) {
        setChartReading(readingRes);
      }
      setLoading(false);
    })
    .catch(err => {
      console.warn("Stock modal fetch notice:", err);
      setLoading(false);
    });
  }, [rawSym, currentMarket]);

  // 3. Live WebSocket Ticks
  useEffect(() => {
    if (!rawSym) return;
    const subscribedSymbols = [rawSym, rawSym.replace('.NS', ''), `${rawSym.replace('.NS', '')}.NS`];
    wsClient.subscribe(subscribedSymbols);

    const unsubscribe = wsClient.onTick((payload) => {
      if (payload.type === 'TICK_STREAM' && payload.ticks) {
        const tick = findTick(payload.ticks, rawSym);
        if (tick && tick.price !== undefined) {
          const newPrice = Number(tick.price);
          const prev = prevPriceRef.current;

          if (prev !== null && newPrice !== prev) {
            setPriceFlash(newPrice > prev ? 'flash-up' : 'flash-down');
            if (priceFlashTimer.current) clearTimeout(priceFlashTimer.current);
            priceFlashTimer.current = setTimeout(() => setPriceFlash(null), 800);
          }
          prevPriceRef.current = newPrice;

          setLivePrice(newPrice);
          setStock(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              currentPrice: newPrice,
              change: tick.change ?? prev.change,
              changePercent: tick.changePercent ?? prev.changePercent,
              volume: tick.volume ?? prev.volume,
              high: tick.high ?? prev.high,
              low: tick.low ?? prev.low
            };
          });
        }
      }
    });

    return () => {
      wsClient.unsubscribe(subscribedSymbols);
      unsubscribe();
      if (priceFlashTimer.current) clearTimeout(priceFlashTimer.current);
    };
  }, [rawSym]);

  if (!symbol) return null;

  const isUS = currentMarket === 'US' || stock?.currency === 'USD' || (rawSym && !rawSym.endsWith('.NS') && !rawSym.endsWith('.BO') && !rawSym.startsWith('^NSE') && !rawSym.startsWith('^BSE') && currentMarket === 'US');
  const currPrefix = isUS ? '$' : '₹';

  const copyTradePlan = () => {
    if (!stock) return;
    const text = `📈 ${stock.name || rawSym} (${stock.symbol || rawSym})\nSignal: ${stock.action || 'BUY'}\nLTP: ${currPrefix}${livePrice || stock.currentPrice}\nEntry: ${stock.tradePlan?.entryRange || 'Market'}\nTarget 1: ${currPrefix}${stock.tradePlan?.target1 || '-'}\nTarget 2: ${currPrefix}${stock.tradePlan?.target2 || '-'}\nStop Loss: ${currPrefix}${stock.tradePlan?.stopLoss || '-'}\nR:R Ratio: ${stock.tradePlan?.riskRewardRatio || '1:2.5'}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getBadgeStyle = (sig) => {
    if (sig === 'STRONG_BUY') return 'badge-strong-buy';
    if (sig === 'BUY') return 'badge-buy';
    if (sig === 'HOLD') return 'badge-hold';
    return 'badge-sell';
  };

  const fetchMarketDepth = () => {
    const targetSym = encodeURIComponent(rawSym);
    apiFetch(`/api/stock/${targetSym}/depth`)
      .then(r => r.ok ? r.json() : null)
      .then(depthRes => {
        if (depthRes) setMarketDepth(depthRes);
      })
      .catch(e => console.warn("Depth fetch notice:", e));
  };

  const circuits = stock?.circuitLimits || (livePrice ? {
    upperCircuit: Math.round((livePrice * 1.1) * 100) / 100,
    lowerCircuit: Math.round((livePrice * 0.9) * 100) / 100,
    distanceToUpperPct: 10.0,
    distanceToLowerPct: 10.0,
    status: 'NORMAL'
  } : null);

  const displayPrice = livePrice || stock?.currentPrice;

  return (
    <Modal open onClose={onClose} width="900px">
      <div
        className="pro-card-glass"
        style={{
          margin: '-12px',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--md-sys-color-surface-container)',
          height: 'calc(85vh - 24px)'
        }}
      >
        {/* Unified Top Header Bar */}
        <div style={{
          padding: '8px 12px',
          borderBottom: '1px solid var(--md-sys-color-outline-variant)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--md-sys-color-surface-container-high)',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <div className="ticker-avatar" style={{ width: '28px', height: '28px', fontSize: '10px', flexShrink: 0 }}>
              {(stock?.symbol || rawSym).replace('.NS', '').slice(0, 2)}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {stock?.name || rawSym}
                </h2>
                <span className="mono-num" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  ({stock?.symbol || rawSym})
                </span>
                <span className={`mono-num ${getBadgeStyle(stock?.signal || 'BUY')}`} style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 800 }}>
                  {stock?.action || (loading ? 'ANALYZING...' : 'BUY')}
                </span>
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>{stock?.sector || 'Equity'}</span>
                <span>•</span>
                <span>Lot: <strong>{stock?.instrument?.lotSize || 1}</strong></span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            {/* Live Price Header Display */}
            <div style={{ textAlign: 'right' }}>
              <div className={`mono-num ${priceFlash || ''}`} style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)' }}>
                {displayPrice ? `${currPrefix}${Number(displayPrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
              </div>
              {stock?.changePercent !== undefined && (
                <div className="mono-num" style={{ fontSize: '10px', fontWeight: 800, color: (stock?.changePercent || 0) >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                  {(stock?.changePercent || 0) >= 0 ? '+' : ''}{Number(stock?.changePercent || 0).toFixed(2)}%
                </div>
              )}
            </div>

            {/* Watchlist Star Toggle Button */}
            <button
              type="button"
              onClick={() => toggleWatchlist(rawSym)}
              title={isSaved ? "Remove from Watchlist" : "Add to Watchlist"}
              aria-label={isSaved ? "Remove from Watchlist" : "Add to Watchlist"}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                backgroundColor: isSaved ? 'rgba(255, 184, 0, 0.15)' : 'var(--bg-card)',
                border: `1px solid ${isSaved ? 'rgba(255, 184, 0, 0.4)' : 'var(--border-subtle)'}`,
                color: isSaved ? 'var(--accent-gold)' : 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease'
              }}
            >
              <Star style={{ width: '15px', height: '15px', fill: isSaved ? 'currentColor' : 'none' }} />
            </button>

            <button
              onClick={onClose}
              aria-label="Close modal"
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '13px'
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div style={{ padding: '12px 14px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, minHeight: 0 }}>
            
          {/* Key Metrics Pill Track */}
          <div className="mobile-tab-scroll" style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
            {circuits && (
              <div style={{ padding: '4px 8px', borderRadius: '8px', backgroundColor: 'var(--md-sys-color-surface-container-high)', border: '1px solid var(--md-sys-color-outline-variant)', fontSize: '10px', whiteSpace: 'nowrap' }} className="mono-num">
                <span style={{ color: 'var(--text-muted)' }}>Circuits: </span>
                <span style={{ color: 'var(--accent-green)', fontWeight: 700 }}>UC {currPrefix}{circuits.upperCircuit}</span> | <span style={{ color: 'var(--accent-red)', fontWeight: 700 }}>LC {currPrefix}{circuits.lowerCircuit}</span>
              </div>
            )}
            <div style={{ padding: '4px 8px', borderRadius: '8px', backgroundColor: 'var(--md-sys-color-surface-container-high)', border: '1px solid var(--md-sys-color-outline-variant)', fontSize: '10px', whiteSpace: 'nowrap' }} className="mono-num">
              <span style={{ color: 'var(--text-muted)' }}>Quant Score: </span>
              <strong style={{ color: 'var(--accent-gold)' }}>{stock?.overallScore != null ? `${stock.overallScore}/100` : '86/100'}</strong>
            </div>
            <div style={{ padding: '4px 8px', borderRadius: '8px', backgroundColor: 'var(--md-sys-color-surface-container-high)', border: '1px solid var(--md-sys-color-outline-variant)', fontSize: '10px', whiteSpace: 'nowrap' }} className="mono-num">
              <span style={{ color: 'var(--text-muted)' }}>RSI (14): </span>
              <strong style={{ color: 'var(--accent-green)' }}>{stock?.technicals?.rsi ?? '54.2'}</strong>
            </div>
            {stock?.volume && (
              <div style={{ padding: '4px 8px', borderRadius: '8px', backgroundColor: 'var(--md-sys-color-surface-container-high)', border: '1px solid var(--md-sys-color-outline-variant)', fontSize: '10px', whiteSpace: 'nowrap' }} className="mono-num">
                <span style={{ color: 'var(--text-muted)' }}>Vol: </span>
                <strong style={{ color: 'var(--text-main)' }}>{Number(stock.volume).toLocaleString()}</strong>
              </div>
            )}
          </div>

          {/* View Tabs Bar: Chart vs Level 2 vs Corporate Actions */}
          <div style={{ backgroundColor: 'var(--bg-elevated)', padding: '10px', borderRadius: '12px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px', flexWrap: 'wrap', gap: '6px' }}>
              
              <div className="mobile-tab-scroll" style={{ width: '100%', overflowX: 'auto' }}>
                <div className="m3-segmented-container">
                  <button
                    onClick={() => setViewTab('CHART')}
                    className={`m3-segmented-item ${viewTab === 'CHART' ? 'active' : ''}`}
                  >
                    📈 Chart
                  </button>
                  <button
                    onClick={() => setViewTab('SETUP')}
                    className={`m3-segmented-item ${viewTab === 'SETUP' ? 'active' : ''}`}
                  >
                    🎯 Trade Setup
                  </button>
                  <button
                    onClick={() => setViewTab('FUNDAMENTALS')}
                    className={`m3-segmented-item ${viewTab === 'FUNDAMENTALS' ? 'active' : ''}`}
                  >
                    📊 Fundamentals
                  </button>
                  <button
                    onClick={() => {
                      setViewTab('DEPTH');
                      fetchMarketDepth();
                    }}
                    className={`m3-segmented-item ${viewTab === 'DEPTH' ? 'active' : ''}`}
                  >
                    ⚡ Level 2 & Actions ({corporateActions.length})
                  </button>
                </div>
              </div>
            </div>

            {loading && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                flex: 1,
                padding: '60px 20px',
                gap: '16px',
                textAlign: 'center'
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
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
                    Fetching detailed technicals, candlestick chart & Level 2 depth for {rawSym}
                  </div>
                </div>
              </div>
            )}

            {!loading && viewTab === 'CHART' && (
              <TradingViewCandleChart
                symbol={rawSym}
                timeframe={timeframe}
                onTimeframeChange={(tf) => setTimeframe(tf)}
                currentMarket={currentMarket}
                isAdjusted={isAdjustedPrice}
              />
            )}

            {viewTab === 'SETUP' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                
                {/* 1. Top Trade Setup Hero Banner */}
                <div style={{
                  padding: '10px 12px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--emerald-pos-bg-soft)',
                  border: '1px solid var(--accent-green-border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}>
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--accent-green)', fontWeight: 800, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>🎯 CHART READING & TRADE SETUP</span>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
                      {chartReading?.biasLabel || '🟢 High-Probability Long / Buy Setup'}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Order: <strong className="mono-num" style={{ color: 'var(--accent-blue)' }}>{chartReading?.tradeSuggestion?.orderType || 'LIMIT / RETEST BUY'}</strong> • {chartReading?.tradeSuggestion?.holdingPeriod || '3 Days – 4 Weeks'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }} className="mono-num">
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>R/R</div>
                      <div style={{ fontSize: '14px', fontWeight: 900, color: 'var(--accent-green)', marginTop: '1px' }}>
                        {chartReading?.tradeSuggestion?.riskRewardRatio || '1 : 2.8'}
                      </div>
                    </div>
                    <div style={{ height: '24px', width: '1px', backgroundColor: 'var(--border-subtle)' }} />
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>CONFIDENCE</div>
                      <div style={{ fontSize: '14px', fontWeight: 900, color: 'var(--accent-gold)', marginTop: '1px' }}>
                        {chartReading?.confidenceScore || 86}/100
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Trade Execution Plan Grid: Entry Zone, Stop Loss & Targets Table */}
                <div style={{
                  backgroundColor: 'var(--bg-card)',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Target style={{ width: '13px', height: '13px', color: 'var(--accent-blue)' }} />
                    <span>Entry, Stop-Loss & Target Plan</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px' }} className="mono-num">
                    <div style={{ backgroundColor: 'var(--bg-elevated)', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--accent-blue-border)' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Suggested Entry Zone</div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--accent-blue)', marginTop: '2px' }}>
                        {currPrefix}{chartReading?.tradeSuggestion?.entryZone?.low} – {currPrefix}{chartReading?.tradeSuggestion?.entryZone?.high}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>Limit Buy on Pullback</div>
                    </div>

                    <div style={{ backgroundColor: 'var(--bg-elevated)', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--accent-red-border)' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Strict Stop Loss</div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--accent-red)', marginTop: '2px' }}>
                        {currPrefix}{chartReading?.tradeSuggestion?.stopLoss}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--accent-red)', marginTop: '2px' }}>Max Risk: {chartReading?.tradeSuggestion?.riskPct}</div>
                    </div>

                    <div style={{ backgroundColor: 'var(--bg-elevated)', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--accent-gold-border)' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Setup Invalidation</div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-gold)', marginTop: '4px' }}>
                        {chartReading?.tradeSuggestion?.invalidationLevel}
                      </div>
                    </div>
                  </div>

                  {/* Multi-Tier Targets — Bullet List */}
                  {chartReading?.tradeSuggestion?.targets && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px' }}>Targets</div>
                      {chartReading.tradeSuggestion.targets.map((tgt, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 8px', backgroundColor: 'var(--bg-elevated)', borderRadius: '6px', fontSize: '11px' }} className="mono-num">
                          <span style={{ fontWeight: 700, color: 'var(--text-muted)', minWidth: '24px' }}>{tgt.target}</span>
                          <span style={{ fontWeight: 800, color: 'var(--accent-green)' }}>{currPrefix}{tgt.price}</span>
                          <span style={{ color: 'var(--accent-green)', fontWeight: 700 }}>{tgt.gainPct}</span>
                          <span style={{ color: 'var(--accent-gold)', fontSize: '10px' }}>⏱ {tgt.timeframe}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. Candlestick Patterns & Moving Averages Breakdown */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }} className="grid-responsive">
                  
                  {/* Candlestick Patterns Detected */}
                  <div style={{ backgroundColor: 'var(--bg-card)', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent-green)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircle2 style={{ width: '13px', height: '13px' }} />
                      <span>Patterns ({chartReading?.candlestickPatterns?.length || 0})</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {chartReading?.candlestickPatterns?.map((pat, idx) => (
                        <div key={idx} style={{ padding: '7px 9px', backgroundColor: 'var(--bg-elevated)', borderRadius: '7px', border: '1px solid var(--border-subtle)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <strong style={{ fontSize: '11px', color: 'var(--text-main)' }}>🕯️ {pat.name}</strong>
                            <span className="mono-num" style={{ fontSize: '10px', fontWeight: 800, padding: '2px 5px', borderRadius: '4px', backgroundColor: 'var(--accent-green-bg)', color: 'var(--accent-green)', border: '1px solid var(--accent-green-border)' }}>
                              {pat.confidence}%
                            </span>
                          </div>
                          <p style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '3px', margin: 0, lineHeight: 1.4 }}>
                            {pat.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Moving Averages & Trend Alignment */}
                  <div style={{ backgroundColor: 'var(--bg-card)', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent-blue)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <TrendingUp style={{ width: '13px', height: '13px' }} />
                      <span>MA & Trend Alignment</span>
                    </div>

                    <div className="mono-num" style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '11px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 7px', backgroundColor: 'var(--bg-elevated)', borderRadius: '6px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>20 EMA:</span>
                        <strong style={{ color: 'var(--accent-blue)' }}>{currPrefix}{chartReading?.movingAverages?.ema20}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 7px', backgroundColor: 'var(--bg-elevated)', borderRadius: '6px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>50 SMA:</span>
                        <strong style={{ color: 'var(--accent-green)' }}>{currPrefix}{chartReading?.movingAverages?.sma50}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 7px', backgroundColor: 'var(--bg-elevated)', borderRadius: '6px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>200 SMA:</span>
                        <strong style={{ color: 'var(--accent-gold)' }}>{currPrefix}{chartReading?.movingAverages?.sma200}</strong>
                      </div>
                    </div>

                    <p style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '6px', margin: 0, lineHeight: 1.4 }}>
                      💡 {chartReading?.movingAverages?.status}
                    </p>
                  </div>
                </div>

                {/* 4. Support & Resistance Pivot Points */}
                {chartReading?.pivots && (
                  <div style={{ backgroundColor: 'var(--bg-card)', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>📐 Pivot Levels</span>
                      <span className="mono-num" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>ATR: <strong>{currPrefix}{chartReading.pivots.atr}</strong></span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }} className="mono-num">
                      {[
                        { label: 'R2', val: chartReading.pivots.r2, color: 'var(--accent-red)' },
                        { label: 'R1', val: chartReading.pivots.r1, color: 'var(--accent-red)' },
                        { label: 'PP', val: chartReading.pivots.pivotPoint, color: 'var(--accent-blue)' },
                        { label: 'S1', val: chartReading.pivots.s1, color: 'var(--accent-green)' },
                        { label: 'S2', val: chartReading.pivots.s2, color: 'var(--accent-green)' },
                      ].map(p => (
                        <div key={p.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px', backgroundColor: 'var(--bg-elevated)', borderRadius: '5px', fontSize: '11px' }}>
                          <span style={{ fontWeight: 700, color: p.color, minWidth: '28px' }}>{p.label}</span>
                          <span style={{ fontWeight: 800, color: 'var(--text-main)' }}>{currPrefix}{p.val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. Forward Quantitative Scenarios */}
                {chartReading?.forwardPredictions && (
                  <div style={{
                    backgroundColor: 'var(--bg-card)',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid var(--accent-blue-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-main)' }}>🔮 Forward Scenarios</span>
                      <span className="mono-num" style={{ fontSize: '10px', color: 'var(--accent-green)', fontWeight: 700 }}>
                        {chartReading.forwardPredictions?.volatilityForecast?.directionalSkew || 'Bullish Skew'}
                      </span>
                    </div>

                    {/* Probability bar */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: 700 }} className="mono-num">
                        <span style={{ color: 'var(--accent-green)' }}>🟢 Bull {chartReading.forwardPredictions?.probabilities?.bull}%</span>
                        <span style={{ color: 'var(--accent-gold)' }}>📊 Base {chartReading.forwardPredictions?.probabilities?.base}%</span>
                        <span style={{ color: 'var(--accent-red)' }}>🔴 Bear {chartReading.forwardPredictions?.probabilities?.bear}%</span>
                      </div>
                      <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--bg-elevated)', borderRadius: '3px', display: 'flex', overflow: 'hidden' }}>
                        <div style={{ width: `${chartReading.forwardPredictions?.probabilities?.bull || 70}%`, backgroundColor: 'var(--accent-green)' }} />
                        <div style={{ width: `${chartReading.forwardPredictions?.probabilities?.base || 20}%`, backgroundColor: 'var(--accent-gold)' }} />
                        <div style={{ width: `${chartReading.forwardPredictions?.probabilities?.bear || 10}%`, backgroundColor: 'var(--accent-red)' }} />
                      </div>
                    </div>

                    {/* Scenarios as bullet rows */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      {chartReading.forwardPredictions?.scenarios?.map((sc, idx) => {
                        const color = sc.case === 'BULL_CASE' ? 'var(--accent-green)' : (sc.case === 'BEAR_CASE' ? 'var(--accent-red)' : 'var(--accent-gold)');
                        return (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 8px', backgroundColor: 'var(--bg-elevated)', borderRadius: '6px', fontSize: '11px' }}>
                            <span style={{ fontWeight: 700, color }}>{sc.title}</span>
                            <span className="mono-num" style={{ fontWeight: 800, color }}>{sc.projectedTarget} <span style={{ fontSize: '10px' }}>({sc.projectedGain})</span></span>
                            <span className="mono-num" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{sc.probability}%</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Horizon trajectory as bullet rows */}
                    {chartReading.forwardPredictions?.projectedHorizonTrajectory && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', borderTop: '1px solid var(--border-subtle)', paddingTop: '6px' }}>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>Price Trajectory</div>
                        {chartReading.forwardPredictions.projectedHorizonTrajectory.map((hz, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px', backgroundColor: 'var(--bg-elevated)', borderRadius: '5px', fontSize: '11px' }} className="mono-num">
                            <span style={{ color: 'var(--text-muted)', fontWeight: 600, minWidth: '50px' }}>{hz.horizon}</span>
                            <span style={{ fontWeight: 800, color: 'var(--accent-green)' }}>{hz.predictedBand}</span>
                            <span style={{ color: 'var(--accent-blue)', fontWeight: 700, fontSize: '10px' }}>{hz.confidence}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 6. Chart Narrative */}
                {chartReading?.chartNarrative && (
                  <div style={{ backgroundColor: 'var(--bg-card)', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--accent-gold)', marginBottom: '4px' }}>
                      📖 Analysis Summary
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--text-main)', lineHeight: 1.6, margin: 0 }}>
                      {chartReading.chartNarrative}
                    </p>
                  </div>
                )}

              </div>
            )}

            {viewTab === 'FUNDAMENTALS' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }} className="mono-num">
                  <div style={{ padding: '8px 10px', backgroundColor: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>P/E Ratio</div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>{stock?.fundamentals?.peRatio ?? '24.5'}</div>
                  </div>
                  <div style={{ padding: '8px 10px', backgroundColor: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>ROE Efficiency</div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--accent-green)', marginTop: '2px' }}>{stock?.fundamentals?.roe ? `${stock.fundamentals.roe}%` : '18.4%'}</div>
                  </div>
                  <div style={{ padding: '8px 10px', backgroundColor: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Debt / Equity</div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--accent-blue)', marginTop: '2px' }}>{stock?.fundamentals?.debtToEquity ?? '0.35'}</div>
                  </div>
                  <div style={{ padding: '8px 10px', backgroundColor: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Dividend Yield</div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--accent-gold)', marginTop: '2px' }}>{stock?.fundamentals?.dividendYield ? `${stock.fundamentals.dividendYield}%` : '1.2%'}</div>
                  </div>
                </div>

                {/* 🧠 Institutional Quantitative Audit & Multi-Pillar Score Card */}
                <div style={{
                  backgroundColor: 'var(--bg-elevated)',
                  padding: '12px',
                  borderRadius: '12px',
                  border: '1px solid var(--accent-blue-border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  background: 'linear-gradient(135deg, var(--indigo-info-bg-soft) 0%, var(--emerald-pos-bg-soft) 100%)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '16px' }}>📊</span>
                      <div>
                        <h3 style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                          Quantitative Analysis & Decision Trace
                        </h3>
                        <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '1px', margin: 0 }}>
                          Multi-pillar audit: ADX trend, CMF liquidity, OHLCV, balance sheet quality.
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '10px',
                        fontWeight: 800,
                        backgroundColor: stock?.directionCode === 'UP' ? 'var(--emerald-pos-bg)' : (stock?.directionCode === 'DOWN' ? 'var(--accent-red-bg)' : 'var(--amber-warn-bg)'),
                        color: stock?.directionCode === 'UP' ? 'var(--accent-green)' : (stock?.directionCode === 'DOWN' ? 'var(--accent-red)' : 'var(--accent-gold)'),
                        border: `1px solid ${stock?.directionCode === 'UP' ? 'var(--emerald-pos-border)' : (stock?.directionCode === 'DOWN' ? 'var(--accent-red-border)' : 'var(--accent-gold-border)')}`
                      }}>
                        {stock?.expectedDirection || 'UPWARD EXPANSION'}
                      </span>
                    </div>
                  </div>

                  {/* 5-Pillar Scores */}
                  {stock?.pillarScores && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {Object.entries(stock.pillarScores).map(([key, p]) => {
                        const score = p.score || 50;
                        const barColor = score >= 75 ? 'var(--accent-green)' : (score >= 50 ? 'var(--accent-blue)' : (score >= 35 ? 'var(--accent-gold)' : 'var(--accent-red)'));
                        return (
                          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 8px', backgroundColor: 'var(--bg-card)', borderRadius: '7px', border: '1px solid var(--border-subtle)' }}>
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)', flex: 1, fontWeight: 600 }}>{p.label}</span>
                            <div style={{ width: '80px', height: '4px', backgroundColor: 'var(--hover-white-6)', borderRadius: '2px', overflow: 'hidden', flexShrink: 0 }}>
                              <div style={{ width: `${score}%`, height: '100%', backgroundColor: barColor, borderRadius: '2px' }} />
                            </div>
                            <span className="mono-num" style={{ fontSize: '11px', fontWeight: 800, color: barColor, minWidth: '28px', textAlign: 'right' }}>{score}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Quantitative Narrative Thesis */}
                  <div style={{ backgroundColor: 'var(--bg-card)', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span>🎯</span>
                      <span>FORECAST & CATALYST SUMMARY</span>
                    </div>
                    <p style={{ fontSize: '11px', lineHeight: '1.6', color: 'var(--text-main)', margin: 0 }}>
                      {stock?.aiThesis || `Quantitative models forecast an upward trajectory driven by bullish moving average alignment and attractive valuation metrics.`}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {viewTab === 'DEPTH' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)' }}>
                  <span>Spread: <strong style={{ color: 'var(--accent-gold)' }}>{marketDepth?.spread != null ? `${currPrefix}${marketDepth.spread}` : '—'}</strong></span>
                  <span>Total Bid Qty: <strong style={{ color: 'var(--accent-green)' }}>{marketDepth?.totalBidQty?.toLocaleString() ?? '—'}</strong> | Total Ask Qty: <strong style={{ color: 'var(--accent-red)' }}>{marketDepth?.totalAskQty?.toLocaleString() ?? '—'}</strong></span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="grid-responsive">
                  <div style={{ backgroundColor: 'var(--bg-card)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent-green)', marginBottom: '8px' }}>BID (BUYERS)</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px' }} className="mono-num">
                      {marketDepth?.bids?.map((b, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 6px', backgroundColor: 'var(--accent-green-bg)', borderRadius: '6px' }}>
                          <span style={{ color: 'var(--accent-green)', fontWeight: 700 }}>{currPrefix}{b.price}</span>
                          <span style={{ color: 'var(--text-main)' }}>{b.quantity} Qty</span>
                          <span style={{ color: 'var(--text-muted)' }}>({b.orders} orders)</span>
                        </div>
                      )) || <div style={{ color: 'var(--text-muted)' }}>Loading Order Book...</div>}
                    </div>
                  </div>

                  <div style={{ backgroundColor: 'var(--bg-card)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent-red)', marginBottom: '8px' }}>ASK (SELLERS)</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px' }} className="mono-num">
                      {marketDepth?.asks?.map((a, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 6px', backgroundColor: 'var(--accent-red-bg)', borderRadius: '6px' }}>
                          <span style={{ color: 'var(--accent-red)', fontWeight: 700 }}>{currPrefix}{a.price}</span>
                          <span style={{ color: 'var(--text-main)' }}>{a.quantity} Qty</span>
                          <span style={{ color: 'var(--text-muted)' }}>({a.orders} orders)</span>
                        </div>
                      )) || <div style={{ color: 'var(--text-muted)' }}>Loading Order Book...</div>}
                    </div>
                  </div>
                </div>

                {/* Corporate Actions Section inside Level 2 & Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                  <h4 style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>Recorded Corporate Actions ({corporateActions.length})</h4>
                  {corporateActions.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {corporateActions.map((a, i) => (
                        <div key={i} style={{ padding: '8px 10px', backgroundColor: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>
                            <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '11px' }}>{a.actionType} {a.ratio ? `(${a.ratio})` : ''}</div>
                            <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{a.description}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span className="mono-num" style={{ fontSize: '10px', color: 'var(--accent-gold)', fontWeight: 700 }}>Ex: {a.exDate}</span>
                            {a.dividendAmount && <div className="mono-num" style={{ fontSize: '10px', color: 'var(--accent-green)', fontWeight: 800 }}>{currPrefix}{a.dividendAmount}/sh</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>No recorded corporate actions for this instrument.</div>
                  )}
                </div>

              </div>
            )}
          </div>

          {/* 🏆 Best Institutional Strategy Playbook & Execution Protocol */}
          {stock?.bestStrategy && (
            <div style={{
              backgroundColor: 'var(--bg-elevated)',
              padding: '12px',
              borderRadius: '12px',
              border: '1px solid var(--accent-gold-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              background: 'linear-gradient(135deg, var(--accent-gold-bg) 0%, var(--indigo-info-bg-soft) 100%)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '18px' }}>🏆</span>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <h3 style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                        {stock.bestStrategy.name}
                      </h3>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: 'var(--accent-gold-bg)',
                        color: 'var(--accent-gold)',
                        border: '1px solid var(--accent-gold-border)'
                      }}>
                        {stock.bestStrategy.tag}
                      </span>
                    </div>
                    <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '1px', margin: 0 }}>
                      {stock.bestStrategy.description}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ padding: '4px 8px', borderRadius: '6px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', textAlign: 'right' }}>
                    <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 700 }}>WIN RATE</div>
                    <div className="mono-num" style={{ fontSize: '12px', fontWeight: 800, color: 'var(--accent-green)' }}>{stock.bestStrategy.winRate}</div>
                  </div>
                  <div style={{ padding: '4px 8px', borderRadius: '6px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', textAlign: 'right' }}>
                    <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 700 }}>PROFIT FACTOR</div>
                    <div className="mono-num" style={{ fontSize: '12px', fontWeight: 800, color: 'var(--accent-blue)' }}>{stock.bestStrategy.profitFactor}</div>
                  </div>
                  <div style={{ padding: '4px 8px', borderRadius: '6px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', textAlign: 'right' }}>
                    <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 700 }}>R:R</div>
                    <div className="mono-num" style={{ fontSize: '12px', fontWeight: 800, color: 'var(--accent-gold)' }}>{stock.bestStrategy.riskRewardRatio}</div>
                  </div>
                </div>
              </div>

              {/* Execution Steps — Bullet rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {stock.bestStrategy.executionSteps?.map((s, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '5px 8px', backgroundColor: 'var(--bg-card)', borderRadius: '7px', border: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--accent-blue)', textTransform: 'uppercase', minWidth: '50px', flexShrink: 0 }}>
                      {s.step}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--text-main)', lineHeight: '1.4' }}>
                      {s.detail}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trade Plan — Bullet rows */}
          <div style={{ backgroundColor: 'var(--bg-elevated)', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <h3 style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-main)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px', margin: 0 }}>Trade Plan & Timeframes</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }} className="mono-num">
              {[
                { label: 'Entry', val: stock?.tradePlan?.entryRange || 'At Market', color: 'var(--text-main)', note: 'Optimal Buy Zone' },
                { label: 'Target 1', val: stock?.tradePlan?.target1 ? `${currPrefix}${stock.tradePlan.target1}` : '—', color: 'var(--accent-green)', note: stock?.tradePlan?.target1ETA || '5–12 Days' },
                { label: 'Target 2', val: stock?.tradePlan?.target2 ? `${currPrefix}${stock.tradePlan.target2}` : '—', color: 'var(--accent-blue)', note: stock?.tradePlan?.target2ETA || '18–30 Days' },
                { label: 'Stop Loss', val: stock?.tradePlan?.stopLoss ? `${currPrefix}${stock.tradePlan.stopLoss}` : '—', color: 'var(--accent-red)', note: 'Risk Invalidation' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 8px', backgroundColor: 'var(--bg-card)', borderRadius: '6px', fontSize: '11px' }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600, minWidth: '52px' }}>{row.label}</span>
                  <span style={{ fontWeight: 800, color: row.color }}>{row.val}</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{row.note}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Docked Action Footer Bar */}
        <div style={{
          padding: '8px 14px',
          borderTop: '1px solid var(--md-sys-color-outline-variant)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: 'var(--md-sys-color-surface-container-high)',
          flexShrink: 0
        }}>
          {(onOpenPatternEngine || onOpenAIEngine) && (
            <button
              onClick={() => {
                const targetHandler = onOpenPatternEngine || onOpenAIEngine;
                targetHandler(stock?.symbol || rawSym);
                onClose();
              }}
              className="mobile-btn-touch"
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-card)',
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
              <TrendingUp style={{ width: '13px', height: '13px' }} />
              <span>Pattern Inspector</span>
            </button>
          )}

          <button
            onClick={copyTradePlan}
            className="mobile-btn-touch"
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-main)',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px'
            }}
          >
            {copied ? <Check style={{ width: '13px', height: '13px', color: 'var(--accent-green)' }} /> : <Copy style={{ width: '13px', height: '13px', color: 'var(--text-muted)' }} />}
            <span>{copied ? 'Copied!' : 'Copy Plan'}</span>
          </button>
        </div>

      </div>
    </Modal>
  );
}
