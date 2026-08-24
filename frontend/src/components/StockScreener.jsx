import React, { useState } from 'react';
import { Sliders, RotateCcw, ChevronRight } from 'lucide-react';
import { EmptyState } from './ui/primitives';

export default function StockScreener({ recommendations, onSelectStock, currentMarket = 'IN' }) {
  const [sector, setSector] = useState('ALL');
  const [cap, setCap] = useState('ALL');
  const [signal, setSignal] = useState('ALL');
  const [maxPe, setMaxPe] = useState(60);
  const [minRsi, setMinRsi] = useState(0);
  const [maxRsi, setMaxRsi] = useState(100);
  const [sort, setSort] = useState({ key: null, dir: 'none' });
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  const allStocks = recommendations?.all || [];

  const filtered = allStocks.filter(stock => {
    if (sector !== 'ALL' && stock.sector !== sector) return false;
    if (cap !== 'ALL' && String(stock.cap || '').toLowerCase() !== cap.toLowerCase()) return false;
    if (signal !== 'ALL' && stock.signal !== signal) return false;

    const pe = stock.fundamentals?.peRatio;
    if (typeof pe === 'number' && pe > maxPe) return false;

    const rsi = stock.technicals?.rsi;
    if (minRsi > 0 || maxRsi < 100) {
      if (typeof rsi !== 'number' || rsi < minRsi || rsi > maxRsi) return false;
    }

    return true;
  });

  const SORT_COLUMNS = {
    ltp: s => s.currentPrice ?? -Infinity,
    rsi: s => s.technicals?.rsi ?? -Infinity,
    pe: s => (typeof s.fundamentals?.peRatio === 'number' ? s.fundamentals.peRatio : -Infinity),
    roe: s => (typeof s.fundamentals?.roe === 'number' ? s.fundamentals.roe : -Infinity),
    score: s => (typeof s.overallScore === 'number' ? s.overallScore : -Infinity)
  };

  const sorted = (() => {
    if (!sort.key || sort.dir === 'none') return filtered;
    const getter = SORT_COLUMNS[sort.key];
    const arr = [...filtered];
    arr.sort((a, b) => {
      const av = getter(a);
      const bv = getter(b);
      return sort.dir === 'asc' ? av - bv : bv - av;
    });
    return arr;
  })();

  const toggleSort = (key) => {
    setSort(prev => ({
      key,
      dir: prev.key === key ? (prev.dir === 'asc' ? 'desc' : prev.dir === 'desc' ? 'none' : 'asc') : 'asc'
    }));
  };

  const SortTh = ({ id, label, align }) => {
    if (!SORT_COLUMNS[id]) {
      return <th style={{ padding: '14px 16px', textAlign: align }}>{label}</th>;
    }
    const active = sort.key === id && sort.dir !== 'none';
    return (
      <th
        style={{ padding: '14px 16px', textAlign: align, cursor: 'pointer', userSelect: 'none', color: active ? 'var(--accent-green)' : undefined }}
        onClick={() => toggleSort(id)}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggleSort(id)}
        tabIndex={0}
        aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      >
        {label}{active ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''}
      </th>
    );
  };

  const resetFilters = () => {
    setSector('ALL');
    setCap('ALL');
    setSignal('ALL');
    setMaxPe(60);
    setMinRsi(0);
    setMaxRsi(100);
    setPage(1);
  };

  React.useEffect(() => { setPage(1); }, [sector, cap, signal, maxPe, minRsi, maxRsi]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const getSignalBadge = (sig) => {
    switch (sig) {
      case 'STRONG_BUY': return 'badge-strong-buy';
      case 'BUY': return 'badge-buy';
      case 'HOLD': return 'badge-hold';
      case 'SELL': return 'badge-sell';
      case 'STRONG_SELL': return 'badge-strong-sell';
      default: return 'badge-hold';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Screener Control Panel */}
      <div className="pro-card-glass" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders style={{ width: '16px', height: '16px', color: 'var(--accent-green)' }} />
            <h2 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)' }}>Equities Screener</h2>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={resetFilters}
              style={{ fontSize: '11px', color: 'var(--text-muted)', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <RotateCcw style={{ width: '12px', height: '12px' }} />
              <span>Reset</span>
            </button>
            <span className="mono-num" style={{ fontSize: '11px', backgroundColor: 'var(--accent-green-bg)', color: 'var(--accent-green)', padding: '2px 8px', borderRadius: '6px', border: '1px solid var(--accent-green-border)' }}>
              Matching: <strong style={{ fontWeight: 800 }}>{filtered.length}</strong>
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', fontSize: '11px' }}>
          
          {/* Sector Filter */}
          <div>
            <label htmlFor="scr-sector" style={{ display: 'block', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '6px' }}>Sector</label>
            <select
              id="scr-sector"
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              className="pro-input-field"
              style={{ width: '100%', fontSize: '12px' }}
            >
              <option value="ALL">All Sectors</option>
              {Array.from(new Set((recommendations?.all || []).map(s => s.sector).filter(Boolean))).map(sec => (
                <option key={sec} value={sec}>{sec}</option>
              ))}
            </select>
          </div>

          {/* Market Cap Filter */}
          <div>
            <label htmlFor="scr-cap" style={{ display: 'block', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '6px' }}>Market Cap</label>
            <select
              id="scr-cap"
              value={cap}
              onChange={(e) => setCap(e.target.value)}
              className="pro-input-field"
              style={{ width: '100%', fontSize: '12px' }}
            >
              <option value="ALL">All Market Caps</option>
              {Array.from(new Set((recommendations?.all || []).map(s => s.cap).filter(Boolean))).map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Signal Filter */}
          <div>
            <label htmlFor="scr-signal" style={{ display: 'block', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '6px' }}>Market Signal</label>
            <select
              id="scr-signal"
              value={signal}
              onChange={(e) => setSignal(e.target.value)}
              className="pro-input-field"
              style={{ width: '100%', fontSize: '12px' }}
            >
              <option value="ALL">All Signals</option>
              <option value="STRONG_BUY">Strong Buy</option>
              <option value="BUY">Buy</option>
              <option value="HOLD">Hold</option>
              <option value="SELL">Sell</option>
              <option value="STRONG_SELL">Strong Sell</option>
            </select>
          </div>

          {/* Max P/E Slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              <label htmlFor="scr-maxpe">Max P/E</label>
              <span className="mono-num" style={{ color: 'var(--accent-green)', fontWeight: 800 }}>{maxPe}</span>
            </div>
            <input
              id="scr-maxpe"
              type="range"
              min="10"
              max="100"
              value={maxPe}
              onChange={(e) => setMaxPe(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent-green)', cursor: 'pointer' }}
            />
          </div>

          {/* RSI Range Filter */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              <span>RSI Range (14)</span>
              <span className="mono-num" style={{ color: 'var(--accent-gold)', fontWeight: 800 }}>{minRsi} - {maxRsi}</span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                id="scr-rsi-min"
                type="number"
                placeholder="Min"
                aria-label="Minimum RSI"
                value={minRsi}
                onChange={(e) => setMinRsi(Number(e.target.value))}
                className="pro-input-field mono-num"
                style={{ width: '50%', padding: '6px 8px', fontSize: '12px' }}
              />
              <input
                id="scr-rsi-max"
                type="number"
                placeholder="Max"
                aria-label="Maximum RSI"
                value={maxRsi}
                onChange={(e) => setMaxRsi(Number(e.target.value))}
                className="pro-input-field mono-num"
                style={{ width: '50%', padding: '6px 8px', fontSize: '12px' }}
              />
            </div>
          </div>

        </div>
      </div>

      {/* Results Table */}
      <div className="pro-card-glass" style={{ overflow: 'hidden' }}>
        <div className="table-scroll" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '11px' }} className="mono-num">
                <th style={{ padding: '14px 16px' }}>Stock Entity</th>
                <th style={{ padding: '14px 16px' }}>Sector</th>
                <SortTh id="ltp" label={`LTP (${currentMarket === 'US' ? '$' : '₹'})`} />
                <SortTh id="rsi" label="RSI (14)" />
                <SortTh id="pe" label="P/E Ratio" />
                <SortTh id="roe" label="ROE %" />
                <SortTh id="score" label="Quant Score" />
                <th style={{ padding: '14px 16px' }}>Recommendation</th>
                <th style={{ padding: '14px 16px', textAlign: 'right' }}>Inspect</th>
              </tr>
            </thead>
            <tbody className="mono-num">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <EmptyState
                      icon="🔍"
                      title="No stocks match your filters"
                      subtitle="Loosen the sector, market cap, P/E or RSI criteria to see more results."
                    />
                  </td>
                </tr>
              ) : paged.map(stock => (
                <tr
                  key={stock.symbol}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectStock(stock.symbol)}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelectStock(stock.symbol)}
                  style={{ borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer', transition: 'background-color 0.15s ease' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <td style={{ padding: '14px 16px', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'sans-serif' }}>
                    <div>{stock.name}</div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{stock.symbol}</span>
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-secondary)', fontFamily: 'sans-serif' }}>{stock.sector}</td>
                  <td style={{ padding: '14px 16px', fontWeight: 800, color: 'var(--text-main)' }}>
                    {stock.symbol.endsWith('.NS') || stock.symbol.startsWith('^') ? '₹' : '$'}{stock.currentPrice?.toLocaleString('en-US')}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontWeight: 800,
                      backgroundColor: stock.technicals?.rsi < 35 ? 'var(--accent-green-bg)' : (stock.technicals?.rsi > 70 ? 'var(--accent-red-bg)' : 'var(--bg-elevated)'),
                      color: stock.technicals?.rsi < 35 ? 'var(--accent-green)' : (stock.technicals?.rsi > 70 ? 'var(--accent-red)' : 'var(--text-secondary)'),
                      border: stock.technicals?.rsi < 35 ? '1px solid var(--accent-green-border)' : (stock.technicals?.rsi > 70 ? '1px solid var(--accent-red-border)' : '1px solid var(--border-subtle)')
                    }}>
                      {stock.technicals?.rsi}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>{stock.fundamentals?.peRatio}</td>
                  <td style={{ padding: '14px 16px', color: 'var(--accent-green)', fontWeight: 800 }}>{stock.fundamentals?.roe}%</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--accent-gold)' }}>{stock.overallScore}/100</span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span className={getSignalBadge(stock.signal)} style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '11px', textTransform: 'uppercase' }}>
                      {stock.action}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--accent-blue)' }}>
                    <ChevronRight style={{ width: '14px', height: '14px' }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', padding: '14px', borderTop: '1px solid var(--border-subtle)' }}>
            <button
              type="button"
              aria-label="Previous page"
              disabled={safePage <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              style={{ padding: '6px 12px', borderRadius: '8px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: safePage <= 1 ? 'var(--text-muted)' : 'var(--text-main)', cursor: safePage <= 1 ? 'not-allowed' : 'pointer', fontSize: '12px', fontWeight: 700 }}
            >
              ← Prev
            </button>
            <span className="mono-num" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Page {safePage} of {totalPages}
            </span>
            <button
              type="button"
              aria-label="Next page"
              disabled={safePage >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              style={{ padding: '6px 12px', borderRadius: '8px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: safePage >= totalPages ? 'var(--text-muted)' : 'var(--text-main)', cursor: safePage >= totalPages ? 'not-allowed' : 'pointer', fontSize: '12px', fontWeight: 700 }}
            >
              Next →
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
