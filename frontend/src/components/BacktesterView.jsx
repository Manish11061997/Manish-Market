import React, { useState, useEffect, useRef } from 'react';
import { Play, RefreshCw, BarChart2 } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { apiFetch } from '../utils/api';
import { ErrorBanner } from './ui/primitives';

export default function BacktesterView() {
  const [selectedStock, setSelectedStock] = useState('RELIANCE.NS');
  const [initialCapital, setInitialCapital] = useState(100000);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  const stocks = [
    { symbol: 'RELIANCE.NS', name: 'Reliance Industries Ltd' },
    { symbol: 'TCS.NS', name: 'Tata Consultancy Services' },
    { symbol: 'HDFCBANK.NS', name: 'HDFC Bank Ltd' },
    { symbol: 'INFY.NS', name: 'Infosys Ltd' },
    { symbol: 'TATAMOTORS.NS', name: 'Tata Motors Ltd' },
    { symbol: 'ICICIBANK.NS', name: 'ICICI Bank Ltd' },
    { symbol: 'SBIN.NS', name: 'State Bank of India' },
    { symbol: 'ITC.NS', name: 'ITC Ltd' },
    { symbol: 'VIDYAWIRES.NS', name: 'Vidya Wires Ltd' },
    { symbol: 'NVDA', name: 'NVIDIA Corporation (US)' },
    { symbol: 'AAPL', name: 'Apple Inc. (US)' },
    { symbol: 'MSFT', name: 'Microsoft Corporation (US)' },
    { symbol: 'TSLA', name: 'Tesla Inc. (US)' },
    { symbol: 'AMZN', name: 'Amazon.com Inc. (US)' }
  ];

  const capitalValid = Number.isFinite(initialCapital) && initialCapital > 0;

  const runBacktest = async (sym = selectedStock) => {
    if (!capitalValid) return;
    setLoading(true);
    try {
      const res = await apiFetch(`/api/backtest?symbol=${encodeURIComponent(sym)}&initial_capital=${initialCapital}`);
      const data = typeof res?.json === 'function' ? await res.json() : res;
      setResults(data);
      setFetchError(null);
    } catch (err) {
      console.error("Backtest API error:", err);
      setFetchError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const runBacktestRef = useRef(runBacktest);
  runBacktestRef.current = runBacktest;

  useEffect(() => {
    runBacktestRef.current();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {fetchError && (
        <ErrorBanner message={`Backtest failed: ${fetchError}`} onRetry={() => runBacktest(selectedStock)} />
      )}

      {/* Controls Panel */}
      <div className="pro-card-glass" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BarChart2 style={{ width: '20px', height: '20px', color: 'var(--accent-gold)' }} />
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)' }}>Quantitative Strategy Backtester & Simulator</h2>
          </div>
          <span className="mono-num hide-on-mobile" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Historical Quantitative Simulation (6-Month Horizon)</span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '10px', fontSize: '12px' }}>
          
          <div style={{ flex: 1, minWidth: '180px' }}>
            <label htmlFor="bt-stock" style={{ display: 'block', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '4px' }}>Select Stock Asset</label>
            <select
              id="bt-stock"
              value={selectedStock}
              onChange={(e) => setSelectedStock(e.target.value)}
              className="pro-input-field"
              style={{ width: '100%', fontSize: '12px' }}
            >
              {stocks.map(s => (
                <option key={s.symbol} value={s.symbol}>{s.name} ({s.symbol})</option>
              ))}
            </select>
          </div>

          <div style={{ flex: '1 1 140px', minWidth: '120px' }}>
            <label htmlFor="bt-capital" style={{ display: 'block', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '4px' }}>Initial Capital (₹)</label>
            <input
              id="bt-capital"
              type="number"
              value={initialCapital}
              onChange={(e) => setInitialCapital(Number(e.target.value))}
              className="pro-input-field mono-num"
              style={{ width: '100%', fontSize: '12px', borderColor: capitalValid ? undefined : 'var(--accent-red)' }}
            />
            {!capitalValid && (
              <div style={{ fontSize: '10px', color: 'var(--accent-red)', fontWeight: 700, marginTop: '2px' }}>
                Must be &gt; 0.
              </div>
            )}
          </div>

          <button
            onClick={() => runBacktest(selectedStock)}
            disabled={loading || !capitalValid}
            className="mobile-btn-touch"
            style={{
              padding: '8px 16px',
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

      {results && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Performance Summary Ribbon */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div className="pro-card-glass" style={{ padding: '18px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Final Portfolio Capital</div>
              <div className="mono-num" style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
                {results.symbol && !results.symbol.endsWith('.NS') && !results.symbol.startsWith('^') ? '$' : '₹'}{results.finalCapital?.toLocaleString('en-US')}
              </div>
              <div className="mono-num" style={{ fontSize: '11px', fontWeight: 700, marginTop: '4px', color: results.netReturnPct >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                {results.netReturnPct >= 0 ? '+' : ''}{results.netReturnPct}% Net Return
              </div>
            </div>

            <div className="pro-card-glass" style={{ padding: '18px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Strategy Win Rate</div>
              <div className="mono-num" style={{ fontSize: '22px', fontWeight: 800, color: 'var(--accent-green)', marginTop: '4px' }}>
                {results.winRate}%
              </div>
              <div className="mono-num" style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                {results.winningTrades} Wins / {results.totalTrades} Total Trades
              </div>
            </div>

            <div className="pro-card-glass" style={{ padding: '18px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Max Portfolio Drawdown</div>
              <div className="mono-num" style={{ fontSize: '22px', fontWeight: 800, color: 'var(--accent-red)', marginTop: '4px' }}>
                -{results.maxDrawdownPct}%
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Risk Managed</div>
            </div>

            {results.buyHoldReturnPct !== undefined && (
              <div className="pro-card-glass" style={{ padding: '18px', borderColor: results.strategyBeatsBuyHold ? 'var(--accent-green-border)' : 'var(--accent-red-border)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>vs Buy & Hold (same window)</div>
                <div className="mono-num" style={{ fontSize: '22px', fontWeight: 800, color: results.buyHoldReturnPct >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', marginTop: '4px' }}>
                  {results.buyHoldReturnPct >= 0 ? '+' : ''}{results.buyHoldReturnPct}%
                </div>
                <div className="mono-num" style={{ fontSize: '11px', fontWeight: 700, marginTop: '4px', color: results.strategyBeatsBuyHold ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                  {results.strategyBeatsBuyHold ? '✓ Strategy beats benchmark' : '✗ Strategy trails benchmark'}
                </div>
              </div>
            )}

            {(results.sharpeRatio !== null && results.sharpeRatio !== undefined) && (
              <div className="pro-card-glass" style={{ padding: '18px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Sharpe Ratio</div>
                <div className="mono-num" style={{ fontSize: '22px', fontWeight: 800, color: results.sharpeRatio >= 1 ? 'var(--accent-green)' : results.sharpeRatio >= 0.5 ? 'var(--accent-gold)' : 'var(--text-secondary)', marginTop: '4px' }}>
                  {results.sharpeRatio}
                </div>
                {results.profitFactor != null && (
                  <div className="mono-num" style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Profit Factor: {results.profitFactor === 99.0 ? '∞' : results.profitFactor}
                  </div>
                )}
              </div>
            )}

            <div className="pro-card-glass" style={{ padding: '18px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Simulated Asset</div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>{results.stockName}</div>
              <div className="mono-num" style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{results.symbol}</div>
            </div>
          </div>

          {/* Equity Growth Curve Chart */}
          <div className="pro-card-glass" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)' }}>Portfolio Growth & Equity Curve</h3>
              <span className="mono-num" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Initial: {results.symbol && !results.symbol.endsWith('.NS') && !results.symbol.startsWith('^') ? '$' : '₹'}{results.initialCapital?.toLocaleString('en-US')}</span>
            </div>

            <div style={{ height: '260px', width: '100%', paddingTop: '8px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={results.equityCurve || []}>
                  <defs>
                    <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent-blue)" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="var(--accent-blue)" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis dataKey="date" stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                  <YAxis domain={['auto', 'auto']} stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-bright)', borderRadius: '10px', color: 'var(--text-main)', fontSize: '12px' }}
                    formatter={(val) => [`${results.symbol && !results.symbol.endsWith('.NS') && !results.symbol.startsWith('^') ? '$' : '₹'}${val.toLocaleString('en-US')}`, 'Portfolio Capital']}
                  />
                  <Area type="monotone" dataKey="value" stroke="var(--accent-blue)" strokeWidth={2} fillOpacity={1} fill="url(#colorEquity)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Trade Log Table */}
          <div className="pro-card-glass" style={{ overflow: 'hidden', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>Historical Executed Trade Log</h3>
            
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr className="mono-num" style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '11px' }}>
                    <th style={{ padding: '12px' }}>Entry Date</th>
                    <th style={{ padding: '12px' }}>Exit Date</th>
                    <th style={{ padding: '12px' }}>Entry Price</th>
                    <th style={{ padding: '12px' }}>Exit Price</th>
                    <th style={{ padding: '12px' }}>Shares</th>
                    <th style={{ padding: '12px' }}>P&L</th>
                    <th style={{ padding: '12px' }}>P&L (%)</th>
                    <th style={{ padding: '12px' }}>Exit Signal Reason</th>
                  </tr>
                </thead>
                <tbody className="mono-num">
                  {results.trades?.map((t, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{t.entryDate}</td>
                      <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{t.exitDate}</td>
                      <td style={{ padding: '12px', fontWeight: 800, color: 'var(--text-main)' }}>{results.symbol && !results.symbol.endsWith('.NS') && !results.symbol.startsWith('^') ? '$' : '₹'}{t.entryPrice}</td>
                      <td style={{ padding: '12px', fontWeight: 800, color: 'var(--text-main)' }}>{results.symbol && !results.symbol.endsWith('.NS') && !results.symbol.startsWith('^') ? '$' : '₹'}{t.exitPrice}</td>
                      <td style={{ padding: '12px', color: 'var(--text-muted)' }}>{t.shares}</td>
                      <td style={{ padding: '12px', fontWeight: 800, color: t.isWin ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                        {t.isWin ? '+' : ''}{results.symbol && !results.symbol.endsWith('.NS') && !results.symbol.startsWith('^') ? '$' : '₹'}{t.pnl?.toLocaleString('en-US')}
                      </td>
                      <td style={{ padding: '12px', fontWeight: 800, color: t.isWin ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                        {t.isWin ? '+' : ''}{t.pnlPercent}%
                      </td>
                      <td style={{ padding: '12px', color: 'var(--text-secondary)', fontFamily: 'sans-serif', fontSize: '11px' }}>{t.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
