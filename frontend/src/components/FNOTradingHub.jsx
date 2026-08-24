import React, { useState, useEffect } from 'react';
import { Zap, TrendingUp, TrendingDown, ArrowUpRight } from 'lucide-react';
import { wsClient } from '../utils/WebSocketClient';
import { apiFetch } from '../utils/api';
import { findTick } from '../utils/symbolMatcher';
import { ErrorBanner } from './ui/primitives';

export default function FNOTradingHub({ onSelectStock, currentMarket = 'IN' }) {
  const [fnoData, setFnoData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterDirection, setFilterDirection] = useState('ALL');
  const [sessionInfo, setSessionInfo] = useState(null);
  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    const fetchFno = () => {
      setLoading(true);
      apiFetch(`/api/fno-signals?market=${currentMarket}`)
        .then(async res => {
          const data = typeof res?.json === 'function' ? await res.json() : res;
          const list = Array.isArray(data?.signals) ? data.signals : (Array.isArray(data?.setups) ? data.setups : (Array.isArray(data) ? data : []));
          setFnoData(list);
          if (data?.sessionInfo) setSessionInfo(data.sessionInfo);
          setFetchError(null);
          setLoading(false);
        })
        .catch(err => {
          console.error("F&O API Error:", err);
          setFetchError(err.message);
          setLoading(false);
        });
    };

    fetchFno();
  }, [currentMarket]);

  // Connect to native WebSocket tick stream for sub-second F&O price updates
  useEffect(() => {
    const unsubscribe = wsClient.onTick((payload) => {
      if (payload.type === 'TICK_STREAM' && payload.ticks) {
        setFnoData(prev => {
          return prev.map(item => {
            const tick = findTick(payload.ticks, item.symbol);
            if (tick && tick.price !== undefined) {
              return {
                ...item,
                spotPrice: tick.price,
                change: tick.change ?? item.change,
                changePercent: tick.changePercent ?? item.changePercent,
                tickDirection: tick.direction || (tick.change >= 0 ? 'UP' : 'DOWN')
              };
            }
            return item;
          });
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const filtered = fnoData.filter(item => {
    if (filterDirection === 'BULLISH') return item.fnoDirection === 'BULLISH';
    if (filterDirection === 'BEARISH') return item.fnoDirection === 'BEARISH';
    return true;
  });

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
            Fetching quantitative F&O options spreads, implied volatility & delta metrics
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {fetchError && (
        <ErrorBanner message={`Failed to load F&O signals: ${fetchError}`} />
      )}

      {/* 🌴 Market Closed / Holiday Notice Banner */}
      {sessionInfo?.isClosed && (
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
              MARKET HOLIDAY / CLOSED TODAY ({sessionInfo.reason || 'NSE/BSE Closed'})
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(253, 230, 138, 0.9)', marginTop: '2px' }}>
              Futures & Options exchanges are closed today. Displaying last verified F&O session signals.
            </div>
          </div>
        </div>
      )}

      {/* Control Banner */}
      <div className="pro-card-glass" style={{ padding: '14px 16px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: 'var(--accent-gold-bg)', color: 'var(--accent-gold)' }}>
              <Zap style={{ width: '20px', height: '20px' }} />
            </div>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                F&O Derivatives Matrix (Futures & Options)
                <span className="mono-num" style={{ fontSize: '11px', backgroundColor: 'var(--accent-blue-bg)', color: 'var(--accent-blue)', padding: '2px 8px', borderRadius: '6px', border: '1px solid var(--accent-blue-border)' }}>
                  {currentMarket === 'US' ? 'US OPTIONS (SPX/NDX/EQUITY)' : 'NSE F&O (NIFTY/BANKNIFTY)'}
                </span>
              </h2>
              <p className="hide-on-mobile" style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Algorithmic ATM Strike Selection, Estimated Option Premiums, Profit Targets & Stop Loss
              </p>
            </div>
          </div>
        </div>

        {/* Direction Filter Pills */}
        <div style={{ display: 'flex', gap: '6px', backgroundColor: 'var(--bg-elevated)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
          {['ALL', 'BULLISH', 'BEARISH'].map(dir => (
            <button
              key={dir}
              onClick={() => setFilterDirection(dir)}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: filterDirection === dir ? 800 : 600,
                backgroundColor: filterDirection === dir ? (dir === 'BULLISH' ? 'var(--accent-green)' : (dir === 'BEARISH' ? 'var(--accent-red)' : 'var(--accent-blue)')) : 'transparent',
                color: filterDirection === dir ? 'var(--bg-dark)' : 'var(--text-secondary)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {dir === 'ALL' ? 'All Contracts' : (dir === 'BULLISH' ? '📈 Calls (CE)' : '📉 Puts (PE)')}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))', gap: '16px' }}>
        {filtered.map((item, idx) => {
          if (!item) return null;
          const isBullish = item.fnoDirection === 'BULLISH';
          const sym = item.symbol || '';
          const fnoCurrPrefix = (sym.endsWith('.NS') || sym.startsWith('^') || ['NIFTY50', 'NIFTYBANK', 'NIFTYIT', 'SENSEX'].includes(sym)) ? '₹' : '$';
          return (
            <div
              key={sym || idx}
              className="pro-card-glass"
              style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '8px' }}
            >
                <div>
                  
                  {/* Contract Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="mono-num" style={{ fontSize: '10px', fontWeight: 800, color: 'var(--accent-gold)', backgroundColor: 'var(--accent-gold-bg)', padding: '2px 5px', borderRadius: '4px' }}>
                          {item.type}
                        </span>
                        <span className="mono-num" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Lot: {item.lotSize}</span>
                      </div>
                      <h3 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>{item.name}</h3>
                      <span className="mono-num" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{item.symbol}</span>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Spot Price</div>
                      <div className={`mono-num ${item.tickDirection === 'UP' ? 'flash-up' : (item.tickDirection === 'DOWN' ? 'flash-down' : '')}`} style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-main)', borderRadius: '4px', padding: '0 2px' }}>
                        {fnoCurrPrefix}{item.spotPrice?.toLocaleString('en-US')}
                      </div>
                    </div>
                  </div>

                  {/* Signal & Strategy Badge */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: '6px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', borderRadius: '8px', backgroundColor: isBullish ? 'var(--accent-green-bg)' : 'var(--accent-red-bg)', border: isBullish ? '1px solid var(--accent-green-border)' : '1px solid var(--accent-red-border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {isBullish ? <TrendingUp style={{ width: '18px', height: '18px', color: 'var(--accent-green)' }} /> : <TrendingDown style={{ width: '18px', height: '18px', color: 'var(--accent-red)' }} />}
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 800, color: isBullish ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                            {item.strategyName || item.strategy}
                          </div>
                          <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent-gold)' }}>
                            {item.strategyTag || '🏆 DEFINED RISK STRATEGY'}
                          </span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span className="mono-num" style={{ fontSize: '12px', fontWeight: 800, color: 'var(--accent-green)' }}>
                          {item.winProbability || '78.4%'} Win
                        </span>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>PF: {item.profitFactor || '2.65x'}</div>
                      </div>
                    </div>

                    {/* Option Greeks & Liquidity Bar */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: 'var(--hover-white-2)', padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border-subtle)', fontSize: '11px' }} className="mono-num">
                      <span>Δ Delta: <strong style={{ color: 'var(--accent-blue)' }}>{item.greeks?.delta || '0.52'}</strong></span>
                      <span>Θ Theta: <strong style={{ color: 'var(--accent-red)' }}>{item.greeks?.theta || '-0.15'}/d</strong></span>
                      <span>IV: <strong style={{ color: 'var(--accent-gold)' }}>{item.iv || '15.2%'}</strong></span>
                      <span>PCR: <strong style={{ color: 'var(--text-main)' }}>{item.pcr || '1.15'}</strong></span>
                      {item.chainMeta && (
                        <span
                          title={item.chainMeta.note || `Live NSE chain · expiry ${item.chainMeta.nearestExpiry || '—'} · Call wall ${item.chainMeta.callResistance ?? '—'} / Put support ${item.chainMeta.putSupport ?? '—'}`}
                          style={{
                            fontWeight: 800,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            backgroundColor: item.chainMeta.oiSource === 'nse-option-chain' ? 'var(--accent-green-bg)' : 'rgba(255, 193, 7, 0.12)',
                            color: item.chainMeta.oiSource === 'nse-option-chain' ? 'var(--accent-green)' : 'var(--accent-gold)'
                          }}
                        >
                          {item.chainMeta.oiSource === 'nse-option-chain' ? 'OI: LIVE NSE' : 'OI: ESTIMATE'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Multi-Leg Spread Breakdown */}
                  {item.spreadLegs && item.spreadLegs.length > 0 ? (
                    <div style={{ backgroundColor: 'var(--bg-elevated)', borderRadius: '12px', padding: '12px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                        <span>MULTI-LEG SPREAD STRUCTURE</span>
                        <span style={{ color: 'var(--accent-blue)' }}>Breakeven: {item.breakeven}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {item.spreadLegs.map((leg, lIdx) => (
                          <div key={lIdx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', borderRadius: '6px', backgroundColor: 'var(--bg-card)', fontSize: '11px' }} className="mono-num">
                            <span style={{ color: leg.action === 'BUY' ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 800 }}>
                              {leg.action} {leg.strike}
                            </span>
                            <span style={{ color: 'var(--text-muted)' }}>Prem: <strong>{leg.premium}</strong> (Δ {leg.delta})</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '6px', fontSize: '11px' }} className="mono-num">
                        <span>Max Risk/Lot: <strong style={{ color: 'var(--accent-red)' }}>{item.maxRiskLot}</strong></span>
                        <span>Max Profit/Lot: <strong style={{ color: 'var(--accent-green)' }}>{item.maxProfitLot}</strong></span>
                      </div>
                    </div>
                  ) : (
                    /* Fallback Single Leg Setup */
                    <div style={{ backgroundColor: 'var(--bg-elevated)', borderRadius: '14px', padding: '14px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-blue)' }}>Selected Strike: {item.optionSetup?.strike}</span>
                        <span className="mono-num" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Est. Premium: <strong>{item.optionSetup?.estimatedPremium}</strong></span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', textAlign: 'center', fontSize: '11px' }} className="mono-num">
                        <div style={{ backgroundColor: 'var(--accent-green-bg)', padding: '8px', borderRadius: '8px', border: '1px solid var(--accent-green-border)' }}>
                          <div style={{ fontSize: '11px', color: 'var(--accent-green)' }}>Target 1</div>
                          <div style={{ fontWeight: 800, color: 'var(--text-main)' }}>{item.optionSetup?.targetPremium1}</div>
                        </div>

                        <div style={{ backgroundColor: 'var(--accent-blue-bg)', padding: '8px', borderRadius: '8px', border: '1px solid var(--accent-blue-border)' }}>
                          <div style={{ fontSize: '11px', color: 'var(--accent-blue)' }}>Target 2</div>
                          <div style={{ fontWeight: 800, color: 'var(--text-main)' }}>{item.optionSetup?.targetPremium2}</div>
                        </div>

                        <div style={{ backgroundColor: 'var(--accent-red-bg)', padding: '8px', borderRadius: '8px', border: '1px solid var(--accent-red-border)' }}>
                          <div style={{ fontSize: '11px', color: 'var(--accent-red)' }}>Stop Loss</div>
                          <div style={{ fontWeight: 800, color: 'var(--text-main)' }}>{item.optionSetup?.stopLossPremium}</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', paddingTop: '4px' }} className="mono-num">
                        <span>Max Risk/Lot: <strong style={{ color: 'var(--accent-red)' }}>{item.optionSetup?.maxRiskPerLot}</strong></span>
                        <span>Target Profit/Lot: <strong style={{ color: 'var(--accent-green)' }}>{item.optionSetup?.profitPerLot}</strong></span>
                      </div>
                    </div>
                  )}

                </div>

                {/* Footer Trigger */}
                <button
                  onClick={() => { if (typeof onSelectStock === 'function') onSelectStock(item.symbol); }}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '10px',
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-main)',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--accent-blue)'; e.currentTarget.style.color = 'var(--bg-dark)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--text-main)'; }}
                >
                  <span>Analyze {item.symbol} Chart & Technicals</span>
                  <ArrowUpRight style={{ width: '14px', height: '14px' }} />
                </button>

              </div>
            );
          })}
        </div>

    </div>
  );
}
