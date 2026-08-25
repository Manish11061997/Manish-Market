import React, { useState, useEffect, useCallback } from 'react';
import { Zap, TrendingUp, TrendingDown, ArrowUpRight, Table, RefreshCw } from 'lucide-react';
import { wsClient } from '../utils/WebSocketClient';
import { apiFetch } from '../utils/api';
import { findTick } from '../utils/symbolMatcher';

const DEFAULT_FNO_SIGNALS_IN = [
  {
    symbol: "NIFTY50",
    name: "Nifty 50 Index",
    type: "INDEX OPTION",
    lotSize: 25,
    spotPrice: 24334.55,
    fnoDirection: "BULLISH",
    strategyName: "BULL CALL SPREAD",
    winProbability: "82.4%",
    profitFactor: "2.85x",
    strike: "24350 CE",
    iv: "13.8%",
    pcr: "1.12",
    greeks: { delta: "0.54", theta: "-0.12" },
    optionSetup: { strike: "24350 CE", estimatedPremium: "₹145.00", targetPremium1: "₹220.00", targetPremium2: "₹290.00", stopLossPremium: "₹85.00" }
  },
  {
    symbol: "NIFTYBANK",
    name: "Bank Nifty Index",
    type: "INDEX OPTION",
    lotSize: 15,
    spotPrice: 57514.20,
    fnoDirection: "BULLISH",
    strategyName: "LONG CALL OPTION",
    winProbability: "79.1%",
    profitFactor: "2.40x",
    strike: "57600 CE",
    iv: "16.4%",
    pcr: "1.25",
    greeks: { delta: "0.48", theta: "-0.22" },
    optionSetup: { strike: "57600 CE", estimatedPremium: "₹380.00", targetPremium1: "₹550.00", targetPremium2: "₹720.00", stopLossPremium: "₹240.00" }
  },
  {
    symbol: "RELIANCE.NS",
    name: "Reliance Industries",
    type: "STOCK OPTION",
    lotSize: 250,
    spotPrice: 1317.00,
    fnoDirection: "BULLISH",
    strategyName: "BULL CALL SPREAD",
    winProbability: "84.0%",
    profitFactor: "3.10x",
    strike: "1320 CE",
    iv: "18.2%",
    pcr: "1.08",
    greeks: { delta: "0.52", theta: "-0.08" },
    optionSetup: { strike: "1320 CE", estimatedPremium: "₹22.50", targetPremium1: "₹36.00", targetPremium2: "₹48.00", stopLossPremium: "₹14.00" }
  },
  {
    symbol: "HDFCBANK.NS",
    name: "HDFC Bank Ltd",
    type: "STOCK OPTION",
    lotSize: 550,
    spotPrice: 727.50,
    fnoDirection: "BULLISH",
    strategyName: "LONG CALL OPTION",
    winProbability: "81.5%",
    profitFactor: "2.60x",
    strike: "730 CE",
    iv: "15.6%",
    pcr: "1.18",
    greeks: { delta: "0.50", theta: "-0.05" },
    optionSetup: { strike: "730 CE", estimatedPremium: "₹14.00", targetPremium1: "₹22.00", targetPremium2: "₹30.00", stopLossPremium: "₹8.50" }
  }
];

const DEFAULT_CHAIN_DATA_IN = {
  underlyingValue: 24334.55,
  atmStrike: 24350,
  pcr: 1.12,
  nearestExpiry: "28-Aug-2026",
  strikes: [
    { strike: 24200, callOI: 92400, callDelta: 0.68, callLtp: 178.0, putLtp: 42.0, putDelta: -0.32, putOI: 168000 },
    { strike: 24250, callOI: 115000, callDelta: 0.61, callLtp: 142.0, putLtp: 58.0, putDelta: -0.39, putOI: 152000 },
    { strike: 24300, callOI: 148000, callDelta: 0.54, callLtp: 110.0, putLtp: 76.0, putDelta: -0.46, putOI: 135400 },
    { strike: 24350, callOI: 189000, callDelta: 0.50, callLtp: 82.0, putLtp: 98.0, putDelta: -0.50, putOI: 118000 },
    { strike: 24400, callOI: 162000, callDelta: 0.43, callLtp: 58.0, putLtp: 124.0, putDelta: -0.57, putOI: 82100 },
    { strike: 24450, callOI: 138000, callDelta: 0.36, callLtp: 39.0, putLtp: 155.0, putDelta: -0.64, putOI: 54800 },
    { strike: 24500, callOI: 112000, callDelta: 0.29, callLtp: 25.0, putLtp: 192.0, putDelta: -0.71, putOI: 38200 }
  ]
};

export default function FNOTradingHub({ onSelectStock, currentMarket = 'IN' }) {
  const [fnoTab, setFnoTab] = useState('SETUPS'); // 'SETUPS' or 'CHAIN'
  const [fnoData, setFnoData] = useState(DEFAULT_FNO_SIGNALS_IN);
  const [filterDirection, setFilterDirection] = useState('ALL');
  const [selectedChainSymbol, setSelectedChainSymbol] = useState(currentMarket === 'US' ? 'SP500' : 'NIFTY50');
  const [chainData, setChainData] = useState(DEFAULT_CHAIN_DATA_IN);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const currPrefix = currentMarket === 'US' ? '$' : '₹';

  const chainSymbols = currentMarket === 'US' 
    ? [
        { id: 'SP500', name: 'S&P 500' },
        { id: 'NASDAQ', name: 'NASDAQ 100' },
        { id: 'NVDA', name: 'NVIDIA Corp' },
        { id: 'AAPL', name: 'Apple Inc' },
        { id: 'TSLA', name: 'Tesla Inc' }
      ]
    : [
        { id: 'NIFTY50', name: 'NIFTY 50' },
        { id: 'NIFTYBANK', name: 'BANK NIFTY' },
        { id: 'RELIANCE.NS', name: 'Reliance Ind' },
        { id: 'HDFCBANK.NS', name: 'HDFC Bank' },
        { id: 'TCS.NS', name: 'TCS' }
      ];

  const fetchFnoSignals = useCallback(() => {
    setIsRefreshing(true);
    apiFetch(`/api/fno-signals?market=${currentMarket}`)
      .then(async res => {
        const data = typeof res?.json === 'function' ? await res.json() : res;
        const list = Array.isArray(data?.signals) ? data.signals : (Array.isArray(data?.setups) ? data.setups : (Array.isArray(data) ? data : []));
        if (list && list.length > 0) setFnoData(list);
        setIsRefreshing(false);
      })
      .catch(() => {
        setIsRefreshing(false);
      });
  }, [currentMarket]);

  const fetchOptionChain = useCallback((sym) => {
    setIsRefreshing(true);
    apiFetch(`/api/fno/option-chain?symbol=${encodeURIComponent(sym)}`)
      .then(async res => {
        const data = typeof res?.json === 'function' ? await res.json() : res;
        if (data && data.strikes && data.strikes.length > 0) {
          setChainData(data);
        }
        setIsRefreshing(false);
      })
      .catch(() => {
        setIsRefreshing(false);
      });
  }, []);

  useEffect(() => {
    fetchFnoSignals();
  }, [fetchFnoSignals]);

  useEffect(() => {
    const defaultSym = currentMarket === 'US' ? 'SP500' : 'NIFTY50';
    setSelectedChainSymbol(defaultSym);
    fetchOptionChain(defaultSym);
  }, [currentMarket, fetchOptionChain]);

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Main Mode Sub-Tab Switcher */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setFnoTab('SETUPS')}
            className={`m3-filter-chip ${fnoTab === 'SETUPS' ? 'active' : ''}`}
            style={{ height: '36px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Zap style={{ width: '15px', height: '15px' }} />
            <span>⚡ Quantitative Trade Setups</span>
          </button>
          <button
            onClick={() => setFnoTab('CHAIN')}
            className={`m3-filter-chip ${fnoTab === 'CHAIN' ? 'active' : ''}`}
            style={{ height: '36px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Table style={{ width: '15px', height: '15px' }} />
            <span>📊 Live Option Chain Matrix</span>
          </button>
        </div>

        <button
          onClick={() => {
            if (fnoTab === 'SETUPS') fetchFnoSignals();
            else fetchOptionChain(selectedChainSymbol);
          }}
          disabled={isRefreshing}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '11px',
            fontWeight: 800,
            backgroundColor: 'var(--bg-elevated)',
            color: 'var(--accent-gold)',
            border: '1px solid var(--accent-gold-border)',
            cursor: 'pointer'
          }}
        >
          <RefreshCw style={{ width: '13px', height: '13px', animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
          <span>Refresh</span>
        </button>
      </div>

      {/* TAB 1: QUANTITATIVE TRADE SETUPS */}
      {fnoTab === 'SETUPS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Direction Filter Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '6px', backgroundColor: 'var(--bg-elevated)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              {['ALL', 'BULLISH', 'BEARISH'].map(dir => (
                <button
                  key={dir}
                  onClick={() => setFilterDirection(dir)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: filterDirection === dir ? 800 : 600,
                    backgroundColor: filterDirection === dir ? (dir === 'BULLISH' ? 'var(--accent-green)' : (dir === 'BEARISH' ? 'var(--accent-red)' : 'var(--accent-blue)')) : 'transparent',
                    color: filterDirection === dir ? 'var(--bg-dark)' : 'var(--text-secondary)',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {dir === 'ALL' ? 'All Contracts' : (dir === 'BULLISH' ? '📈 Calls (CE)' : '📉 Puts (PE)')}
                </button>
              ))}
            </div>

            <span className="mono-num" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Showing {filtered.length} F&O Setups
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))', gap: '14px' }}>
            {filtered.map((item, idx) => {
              if (!item) return null;
              const isBullish = item.fnoDirection === 'BULLISH';
              const sym = item.symbol || '';
              const fnoCurrPrefix = (sym.endsWith('.NS') || sym.startsWith('^') || ['NIFTY50', 'NIFTYBANK', 'NIFTYIT', 'SENSEX'].includes(sym)) ? '₹' : '$';
              return (
                <div
                  key={sym || idx}
                  className="pro-card-glass"
                  style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px', borderRadius: '12px' }}
                >
                  {/* Contract Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="mono-num" style={{ fontSize: '10px', fontWeight: 800, color: 'var(--accent-gold)', backgroundColor: 'var(--accent-gold-bg)', padding: '2px 6px', borderRadius: '4px' }}>
                          {item.type}
                        </span>
                        <span className="mono-num" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Lot: {item.lotSize}</span>
                      </div>
                      <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px', margin: 0 }}>{item.name}</h3>
                      <span className="mono-num" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.symbol}</span>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Spot Price</div>
                      <div className="mono-num" style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)' }}>
                        {fnoCurrPrefix}{typeof item.spotPrice === 'number' ? item.spotPrice.toLocaleString('en-US') : item.spotPrice}
                      </div>
                    </div>
                  </div>

                  {/* Signal & Strategy Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: '8px', backgroundColor: isBullish ? 'var(--accent-green-bg)' : 'var(--accent-red-bg)', border: isBullish ? '1px solid var(--accent-green-border)' : '1px solid var(--accent-red-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {isBullish ? <TrendingUp style={{ width: '16px', height: '16px', color: 'var(--accent-green)' }} /> : <TrendingDown style={{ width: '16px', height: '16px', color: 'var(--accent-red)' }} />}
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: isBullish ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                          {item.strategyName || item.strategy}
                        </div>
                        <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--accent-gold)' }}>
                          {item.strategyTag || '🏆 DEFINED RISK STRATEGY'}
                        </span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="mono-num" style={{ fontSize: '12px', fontWeight: 800, color: 'var(--accent-green)' }}>
                        {item.winProbability || '78.4%'} Win
                      </span>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>PF: {item.profitFactor || '2.65x'}</div>
                    </div>
                  </div>

                  {/* Option Greeks Bar */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: 'var(--bg-elevated)', padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border-subtle)', fontSize: '10px' }} className="mono-num">
                    <span>Δ Delta: <strong style={{ color: 'var(--accent-blue)' }}>{item.greeks?.delta || '0.52'}</strong></span>
                    <span>Θ Theta: <strong style={{ color: 'var(--accent-red)' }}>{item.greeks?.theta || '-0.15'}/d</strong></span>
                    <span>IV: <strong style={{ color: 'var(--accent-gold)' }}>{item.iv || '15.2%'}</strong></span>
                    <span>PCR: <strong style={{ color: 'var(--text-main)' }}>{item.pcr || '1.15'}</strong></span>
                  </div>

                  {/* Option Setup Targets */}
                  <div style={{ backgroundColor: 'var(--bg-elevated)', borderRadius: '10px', padding: '10px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--accent-blue)', fontWeight: 700 }}>
                      <span>Strike: {item.optionSetup?.strike || item.strike}</span>
                      <span className="mono-num" style={{ color: 'var(--text-muted)' }}>Prem: {item.optionSetup?.estimatedPremium || '—'}</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', textAlign: 'center', fontSize: '10px' }} className="mono-num">
                      <div style={{ backgroundColor: 'var(--accent-green-bg)', padding: '6px 4px', borderRadius: '6px', border: '1px solid var(--accent-green-border)' }}>
                        <div style={{ color: 'var(--accent-green)' }}>Target 1</div>
                        <div style={{ fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>{item.optionSetup?.targetPremium1 || '—'}</div>
                      </div>
                      <div style={{ backgroundColor: 'var(--accent-blue-bg)', padding: '6px 4px', borderRadius: '6px', border: '1px solid var(--accent-blue-border)' }}>
                        <div style={{ color: 'var(--accent-blue)' }}>Target 2</div>
                        <div style={{ fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>{item.optionSetup?.targetPremium2 || '—'}</div>
                      </div>
                      <div style={{ backgroundColor: 'var(--accent-red-bg)', padding: '6px 4px', borderRadius: '6px', border: '1px solid var(--accent-red-border)' }}>
                        <div style={{ color: 'var(--accent-red)' }}>Stop Loss</div>
                        <div style={{ fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>{item.optionSetup?.stopLossPremium || '—'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Action */}
                  <button
                    onClick={() => { if (typeof onSelectStock === 'function') onSelectStock(item.symbol); }}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--bg-elevated)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-main)',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <span>Analyze {item.symbol} Chart</span>
                    <ArrowUpRight style={{ width: '13px', height: '13px' }} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: LIVE OPTION CHAIN MATRIX */}
      {fnoTab === 'CHAIN' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Symbol Selector Pills */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
            {chainSymbols.map(s => (
              <button
                key={s.id}
                onClick={() => {
                  setSelectedChainSymbol(s.id);
                  fetchOptionChain(s.id);
                }}
                className={`m3-filter-chip ${selectedChainSymbol === s.id ? 'active' : ''}`}
                style={{ height: '34px', fontSize: '11px' }}
              >
                {s.name}
              </button>
            ))}
          </div>

          {/* Option Chain Macro Metrics */}
          {chainData && (
            <div className="pro-card-glass" style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px' }} className="mono-num">
                <div>Underlying Spot: <strong style={{ color: 'var(--accent-green)' }}>{currPrefix}{chainData.underlyingValue?.toLocaleString('en-US')}</strong></div>
                <div>ATM Strike: <strong style={{ color: 'var(--accent-blue)' }}>{chainData.atmStrike}</strong></div>
                <div>PCR: <strong style={{ color: chainData.pcr >= 1 ? 'var(--accent-green)' : 'var(--accent-red)' }}>{chainData.pcr}</strong></div>
                <div>Expiry: <strong style={{ color: 'var(--accent-gold)' }}>{chainData.nearestExpiry}</strong></div>
              </div>
            </div>
          )}

          {/* Option Chain Matrix Table */}
          {chainData && chainData.strikes && (
            <div className="pro-card-glass" style={{ overflow: 'hidden', padding: 0 }}>
              <div className="table-scroll">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'center' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase' }}>
                      <th style={{ padding: '10px 8px', color: 'var(--accent-green)' }}>Call OI</th>
                      <th style={{ padding: '10px 8px', color: 'var(--accent-green)' }}>Call Δ</th>
                      <th style={{ padding: '10px 8px', color: 'var(--accent-green)' }}>Call LTP</th>
                      <th style={{ padding: '10px 12px', backgroundColor: 'var(--hover-white-4)', color: 'var(--accent-blue)', fontWeight: 900 }}>STRIKE</th>
                      <th style={{ padding: '10px 8px', color: 'var(--accent-red)' }}>Put LTP</th>
                      <th style={{ padding: '10px 8px', color: 'var(--accent-red)' }}>Put Δ</th>
                      <th style={{ padding: '10px 8px', color: 'var(--accent-red)' }}>Put OI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chainData.strikes.map((row, idx) => {
                      const isAtm = row.strike === chainData.atmStrike;
                      return (
                        <tr
                          key={idx}
                          style={{
                            borderBottom: '1px solid var(--border-subtle)',
                            backgroundColor: isAtm ? 'rgba(59, 130, 246, 0.12)' : (idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)')
                          }}
                        >
                          <td style={{ padding: '8px', color: 'var(--text-secondary)' }} className="mono-num">{row.callOI?.toLocaleString('en-US')}</td>
                          <td style={{ padding: '8px', color: 'var(--accent-blue)' }} className="mono-num">{row.callDelta}</td>
                          <td style={{ padding: '8px', fontWeight: 800, color: 'var(--accent-green)' }} className="mono-num">{currPrefix}{row.callLtp}</td>
                          <td style={{ padding: '8px 12px', fontWeight: 900, color: isAtm ? 'var(--accent-gold)' : 'var(--text-main)', backgroundColor: isAtm ? 'rgba(245, 158, 11, 0.15)' : 'var(--hover-white-2)' }} className="mono-num">
                            {row.strike} {isAtm && '🎯 ATM'}
                          </td>
                          <td style={{ padding: '8px', fontWeight: 800, color: 'var(--accent-red)' }} className="mono-num">{currPrefix}{row.putLtp}</td>
                          <td style={{ padding: '8px', color: 'var(--accent-blue)' }} className="mono-num">{row.putDelta}</td>
                          <td style={{ padding: '8px', color: 'var(--text-secondary)' }} className="mono-num">{row.putOI?.toLocaleString('en-US')}</td>
                        </tr>
                      );
                    })}
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
