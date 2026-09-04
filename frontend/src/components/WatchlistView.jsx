import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Star, Plus, Trash2, Search, TrendingUp, TrendingDown, ArrowUpRight, 
  Sparkles, SlidersHorizontal, RefreshCw, BarChart2, ShieldCheck, ChevronRight, X
} from 'lucide-react';
import { useWatchlist } from '../utils/useWatchlist';
import { wsClient } from '../utils/WebSocketClient';
import { findTick } from '../utils/symbolMatcher';
import { apiFetch } from '../utils/api';
import { fuzzySearchUniverse } from '../utils/stockUniverse';

export default function WatchlistView({ currentMarket = 'IN', onSelectStock }) {
  const {
    watchlists,
    activeListId,
    setActiveListId,
    activeList,
    toggleWatchlist,
    addSymbolToList,
    removeSymbolFromList,
    createList,
    deleteList
  } = useWatchlist(currentMarket);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showNewListModal, setShowNewListModal] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [sortBy, setSortBy] = useState('DEFAULT'); // 'DEFAULT', 'GAINERS', 'LOSERS', 'PRICE_HIGH', 'SCORE'
  const [stockDetailsMap, setStockDetailsMap] = useState({});
  const [liveTicks, setLiveTicks] = useState({});
  const [loading, setLoading] = useState(false);
  const [priceFlashes, setPriceFlashes] = useState({});
  const prevPricesRef = useRef({});
  const searchTimeoutRef = useRef(null);

  const symbols = activeList?.symbols || [];
  const currPrefix = currentMarket === 'US' ? '$' : '₹';

  // 1. Subscribe to WebSocket for all symbols in the active watchlist
  useEffect(() => {
    if (!symbols.length) return;
    wsClient.subscribe(symbols);

    const unsub = wsClient.onTick((payload) => {
      if (payload.type === 'TICK_STREAM' && payload.ticks) {
        setLiveTicks(prev => {
          const updated = { ...prev };
          symbols.forEach(sym => {
            const tick = findTick(payload.ticks, sym);
            if (tick && tick.price !== undefined) {
              const newPrice = Number(tick.price);
              const prevPrice = prevPricesRef.current[sym];
              
              if (prevPrice !== undefined && prevPrice !== newPrice) {
                const flashType = newPrice > prevPrice ? 'flash-up' : 'flash-down';
                setPriceFlashes(f => ({ ...f, [sym]: flashType }));
                setTimeout(() => {
                  setPriceFlashes(f => {
                    const next = { ...f };
                    delete next[sym];
                    return next;
                  });
                }, 800);
              }
              prevPricesRef.current[sym] = newPrice;
              updated[sym] = tick;
            }
          });
          return updated;
        });
      }
    });

    return () => unsub();
  }, [symbols]);

  // 2. Fetch stock data/scores for watchlisted symbols
  useEffect(() => {
    if (!symbols.length) {
      setStockDetailsMap({});
      return;
    }

    let isMounted = true;
    setLoading(true);

    // Fetch batch details
    apiFetch(`/api/recommendations?market=${currentMarket}`)
      .then(async res => {
        const data = typeof res?.json === 'function' ? await res.json() : res;
        if (!isMounted) return;
        const map = {};
        if (data?.all && Array.isArray(data.all)) {
          data.all.forEach(s => {
            if (s.symbol) map[s.symbol.toUpperCase()] = s;
          });
        }
        setStockDetailsMap(map);
        setLoading(false);
      })
      .catch(err => {
        console.warn('Watchlist details fetch error:', err);
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [currentMarket, symbols]);

  // 3. Instant local results + debounced API fetch for "Add to Watchlist"
  const localResults = useMemo(() => {
    return fuzzySearchUniverse(searchQuery, currentMarket);
  }, [searchQuery, currentMarket]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setIsSearching(true);
      apiFetch(`/api/search?q=${encodeURIComponent(searchQuery)}&market=${currentMarket}`)
        .then(async res => {
          const data = typeof res?.json === 'function' ? await res.json() : res;
          setSearchResults(data?.results || []);
          setIsSearching(false);
        })
        .catch(() => {
          setIsSearching(false);
        });
    }, 150);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery, currentMarket]);

  // Unified instant display results
  const displayResults = useMemo(() => {
    const map = new Map();
    // 1. Add instant local matches
    localResults.forEach(r => map.set(r.symbol.toUpperCase(), r));
    // 2. Merge API matches
    searchResults.forEach(r => {
      if (r && r.symbol) {
        const key = r.symbol.toUpperCase();
        map.set(key, { ...map.get(key), ...r });
      }
    });
    return Array.from(map.values()).slice(0, 10);
  }, [localResults, searchResults]);

  // Merge symbols with live ticks and metadata
  const watchlistedStocks = useMemo(() => {
    return symbols.map(sym => {
      const symUpper = sym.toUpperCase();
      const meta = stockDetailsMap[symUpper] || stockDetailsMap[`${symUpper}.NS`] || {};
      const tick = liveTicks[sym] || liveTicks[symUpper] || {};

      const currentPrice = tick.price !== undefined ? Number(tick.price) : (meta.currentPrice || 0);
      const change = tick.change !== undefined ? Number(tick.change) : (meta.change || 0);
      const changePercent = tick.changePercent !== undefined ? Number(tick.changePercent) : (meta.changePercent || 0);
      const name = meta.name || sym.replace('.NS', '').replace('^', '');
      const sector = meta.sector || 'Equity';
      const signal = meta.signal || 'HOLD';
      const score = meta.overallScore || 75;

      return {
        symbol: sym,
        name,
        sector,
        currentPrice,
        change,
        changePercent,
        signal,
        score,
        targetPrice: meta.targetPrice,
        stopLoss: meta.stopLoss,
        rawMeta: meta
      };
    });
  }, [symbols, stockDetailsMap, liveTicks]);

  // Sort watchlisted stocks
  const sortedStocks = useMemo(() => {
    const list = [...watchlistedStocks];
    if (sortBy === 'GAINERS') {
      return list.sort((a, b) => b.changePercent - a.changePercent);
    }
    if (sortBy === 'LOSERS') {
      return list.sort((a, b) => a.changePercent - b.changePercent);
    }
    if (sortBy === 'PRICE_HIGH') {
      return list.sort((a, b) => b.currentPrice - a.currentPrice);
    }
    if (sortBy === 'SCORE') {
      return list.sort((a, b) => b.score - a.score);
    }
    return list;
  }, [watchlistedStocks, sortBy]);

  // KPI Metrics Calculation
  const metrics = useMemo(() => {
    if (!watchlistedStocks.length) {
      return { advances: 0, declines: 0, unchanged: 0, topGainer: null, topLoser: null, avgReturn: 0 };
    }
    let advances = 0;
    let declines = 0;
    let unchanged = 0;
    let sumReturns = 0;

    watchlistedStocks.forEach(s => {
      sumReturns += s.changePercent;
      if (s.changePercent > 0) advances++;
      else if (s.changePercent < 0) declines++;
      else unchanged++;
    });

    const sortedByGain = [...watchlistedStocks].sort((a, b) => b.changePercent - a.changePercent);
    const topGainer = sortedByGain[0] && sortedByGain[0].changePercent > 0 ? sortedByGain[0] : null;
    const topLoser = sortedByGain[sortedByGain.length - 1] && sortedByGain[sortedByGain.length - 1].changePercent < 0 ? sortedByGain[sortedByGain.length - 1] : null;
    const avgReturn = sumReturns / watchlistedStocks.length;

    return { advances, declines, unchanged, topGainer, topLoser, avgReturn };
  }, [watchlistedStocks]);

  const handleCreateNewList = (e) => {
    e.preventDefault();
    if (!newListName.trim()) return;
    createList(newListName.trim());
    setNewListName('');
    setShowNewListModal(false);
  };

  const handleAddPopularStock = (sym) => {
    addSymbolToList(sym);
  };

  return (
    <div className="watchlist-hub-container" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* 1. Header & Multi-List Selector Navigation */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '20px',
        padding: '16px 20px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              backgroundColor: 'rgba(255, 184, 0, 0.15)',
              border: '1px solid rgba(255, 184, 0, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-gold)'
            }}>
              <Star style={{ width: '22px', height: '22px', fill: 'currentColor' }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                  Watchlist Hub
                </h1>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--accent-blue-bg)',
                  color: 'var(--accent-blue)',
                  border: '1px solid var(--accent-blue-border)'
                }}>
                  {currentMarket === 'US' ? 'US Equities' : 'NSE / BSE'}
                </span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Live real-time streaming price ticks, momentum signals & quick trade setup analysis.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setShowNewListModal(true)}
              className="m3-button-outlined"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                fontSize: '12px',
                fontWeight: 700,
                borderRadius: '20px'
              }}
            >
              <Plus style={{ width: '15px', height: '15px' }} />
              <span>New List</span>
            </button>
          </div>
        </div>

        {/* Watchlist Tabs */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '4px',
          borderTop: '1px solid var(--border-subtle)',
          paddingTop: '12px'
        }}>
          {watchlists.map(list => {
            const isActive = list.id === activeListId;
            const count = list.symbols?.length || 0;
            return (
              <button
                key={list.id}
                type="button"
                onClick={() => setActiveListId(list.id)}
                className={`m3-filter-chip ${isActive ? 'active' : ''}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 14px',
                  borderRadius: '16px',
                  fontSize: '12px',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  backgroundColor: isActive ? 'var(--accent-blue)' : 'var(--bg-elevated)',
                  color: isActive ? '#04060a' : 'var(--text-main)',
                  border: `1px solid ${isActive ? 'transparent' : 'var(--border-subtle)'}`
                }}
              >
                <span>{list.name}</span>
                <span style={{
                  fontSize: '10px',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  backgroundColor: isActive ? 'rgba(0,0,0,0.2)' : 'var(--bg-surface)',
                  color: isActive ? '#04060a' : 'var(--text-muted)',
                  fontWeight: 800
                }}>
                  {count}
                </span>
                {!list.isDefault && (
                  <span
                    role="button"
                    title="Delete custom list"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Delete watchlist "${list.name}"?`)) {
                        deleteList(list.id);
                      }
                    }}
                    style={{
                      marginLeft: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      opacity: 0.7
                    }}
                  >
                    <X style={{ width: '12px', height: '12px' }} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. KPI Summary Banner */}
      {watchlistedStocks.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px'
        }}>
          {/* Card 1: Tracked Securities & A/D */}
          <div className="pro-card-glass" style={{ padding: '14px 16px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Securities Tracked
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span className="mono-num" style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text-main)' }}>
                {watchlistedStocks.length}
              </span>
              <div style={{ fontSize: '11px', display: 'flex', gap: '6px' }}>
                <span style={{ color: 'var(--accent-green)', fontWeight: 800 }}>▲ {metrics.advances}</span>
                <span style={{ color: 'var(--accent-red)', fontWeight: 800 }}>▼ {metrics.declines}</span>
              </div>
            </div>
            {/* Advance/Decline Ratio Bar */}
            <div style={{ width: '100%', height: '4px', backgroundColor: 'var(--accent-red-bg)', borderRadius: '4px', overflow: 'hidden', display: 'flex', marginTop: '2px' }}>
              <div style={{
                width: `${watchlistedStocks.length ? (metrics.advances / watchlistedStocks.length) * 100 : 50}%`,
                backgroundColor: 'var(--accent-green)',
                height: '100%'
              }} />
            </div>
          </div>

          {/* Card 2: Average List Performance */}
          <div className="pro-card-glass" style={{ padding: '14px 16px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Watchlist Day Momentum
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {metrics.avgReturn >= 0 ? (
                <TrendingUp style={{ width: '20px', height: '20px', color: 'var(--accent-green)' }} />
              ) : (
                <TrendingDown style={{ width: '20px', height: '20px', color: 'var(--accent-red)' }} />
              )}
              <span className="mono-num" style={{
                fontSize: '22px',
                fontWeight: 900,
                color: metrics.avgReturn >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'
              }}>
                {metrics.avgReturn >= 0 ? '+' : ''}{metrics.avgReturn.toFixed(2)}%
              </span>
            </div>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              Equally weighted average day change
            </span>
          </div>

          {/* Card 3: Top Gainer */}
          {metrics.topGainer && (
            <div 
              className="pro-card-glass" 
              onClick={() => onSelectStock?.(metrics.topGainer.symbol)}
              style={{ padding: '14px 16px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '6px', cursor: 'pointer' }}
            >
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Top Gainer
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--accent-blue)' }}>
                  {metrics.topGainer.symbol.replace('.NS', '')}
                </span>
                <span className="mono-num" style={{ fontSize: '15px', fontWeight: 900, color: 'var(--accent-green)' }}>
                  +{metrics.topGainer.changePercent.toFixed(2)}%
                </span>
              </div>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                {currPrefix}{Number(metrics.topGainer.currentPrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}

          {/* Card 4: Top Loser */}
          {metrics.topLoser && (
            <div 
              className="pro-card-glass" 
              onClick={() => onSelectStock?.(metrics.topLoser.symbol)}
              style={{ padding: '14px 16px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '6px', cursor: 'pointer' }}
            >
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Top Pullback / Dip
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main)' }}>
                  {metrics.topLoser.symbol.replace('.NS', '')}
                </span>
                <span className="mono-num" style={{ fontSize: '15px', fontWeight: 900, color: 'var(--accent-red)' }}>
                  {metrics.topLoser.changePercent.toFixed(2)}%
                </span>
              </div>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                {currPrefix}{Number(metrics.topLoser.currentPrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
        </div>
      )}

      {/* 3. Search & Add Bar + Sort Filters */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        backgroundColor: 'var(--bg-surface)',
        padding: '12px 16px',
        borderRadius: '16px',
        border: '1px solid var(--border-subtle)'
      }}>
        {/* Quick Search & Add */}
        <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: '400px' }}>
          <Search style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '15px',
            height: '15px',
            color: 'var(--text-muted)'
          }} />
          <input
            type="text"
            placeholder={`Add stock to "${activeList.name}" (e.g. RELIANCE, NVDA)...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchQuery.trim()) {
                e.preventDefault();
                if (displayResults.length > 0) {
                  const targetSym = displayResults[0].symbol;
                  if (!symbols.some(s => s.toUpperCase() === targetSym.toUpperCase())) {
                    addSymbolToList(targetSym);
                  }
                } else {
                  let sym = searchQuery.trim().toUpperCase();
                  if (currentMarket === 'IN' && !sym.endsWith('.NS') && !sym.endsWith('.BO') && !sym.startsWith('^')) {
                    sym = `${sym}.NS`;
                  }
                  if (!symbols.some(s => s.toUpperCase() === sym.toUpperCase())) {
                    addSymbolToList(sym);
                  }
                }
                setSearchQuery('');
              }
            }}
            className="pro-input-field"
            style={{
              width: '100%',
              paddingLeft: '36px',
              paddingRight: searchQuery ? '32px' : '12px',
              fontSize: '12px',
              borderRadius: '20px',
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)'
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '12px',
                padding: '2px 4px'
              }}
            >
              ✕
            </button>
          )}

          {/* Autocomplete Dropdown */}
          {searchQuery.trim() && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: '6px',
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-bright)',
              borderRadius: '12px',
              padding: '6px',
              maxHeight: '260px',
              overflowY: 'auto',
              boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
              zIndex: 100
            }}>
              {displayResults.length === 0 && isSearching ? (
                <div style={{ padding: '10px', fontSize: '11px', color: 'var(--accent-blue)', textAlign: 'center' }}>
                  Searching securities...
                </div>
              ) : displayResults.length === 0 ? (
                <div style={{ padding: '10px', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>
                  No exact match. Press Enter to add "{searchQuery.trim().toUpperCase()}" directly.
                </div>
              ) : (
                displayResults.map(res => {
                  const alreadyAdded = symbols.some(s => s.toUpperCase() === res.symbol.toUpperCase());
                  return (
                    <div
                      key={res.symbol}
                      onClick={() => {
                        if (!alreadyAdded) {
                          addSymbolToList(res.symbol);
                        }
                        setSearchQuery('');
                      }}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: alreadyAdded ? 'default' : 'pointer',
                        backgroundColor: alreadyAdded ? 'transparent' : 'var(--bg-surface)',
                        marginBottom: '4px',
                        opacity: alreadyAdded ? 0.5 : 1
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '12px', color: 'var(--text-main)' }}>
                          {res.symbol} <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>• {res.name}</span>
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--accent-blue)' }}>
                          {res.sector || 'Equity'} • {res.exchange || 'NSE'}
                        </div>
                      </div>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: alreadyAdded ? 'var(--text-muted)' : 'var(--accent-green)'
                      }}>
                        {alreadyAdded ? '✓ Added' : '+ Add'}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Sort Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <SlidersHorizontal style={{ width: '12px', height: '12px' }} />
            Sort:
          </span>
          {[
            { id: 'DEFAULT', label: 'Default' },
            { id: 'GAINERS', label: 'Top Gainers' },
            { id: 'LOSERS', label: 'Top Losers' },
            { id: 'PRICE_HIGH', label: 'Highest Price' },
            { id: 'SCORE', label: 'AI Score' },
          ].map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSortBy(s.id)}
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '12px',
                border: `1px solid ${sortBy === s.id ? 'var(--accent-blue)' : 'var(--border-subtle)'}`,
                backgroundColor: sortBy === s.id ? 'var(--accent-blue-bg)' : 'var(--bg-elevated)',
                color: sortBy === s.id ? 'var(--accent-blue)' : 'var(--text-muted)',
                cursor: 'pointer'
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Watchlist Securities Grid / Table */}
      {sortedStocks.length === 0 ? (
        <div style={{
          padding: '60px 20px',
          textAlign: 'center',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: '20px',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 184, 0, 0.1)',
            border: '1px solid rgba(255, 184, 0, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-gold)'
          }}>
            <Star style={{ width: '28px', height: '28px' }} />
          </div>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
              "{activeList.name}" is Empty
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px', maxWidth: '400px' }}>
              Add stocks from global search, the Recommendations feed, or tap any quick-pick below to populate this watchlist.
            </p>
          </div>

          {/* Quick-Pick Popular Stocks */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', marginTop: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Suggested {currentMarket === 'US' ? 'US Mega Caps' : 'Nifty 50 Leaders'}
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
              {(currentMarket === 'US' 
                ? ['NVDA', 'AAPL', 'MSFT', 'AMZN', 'GOOGL', 'TSLA'] 
                : ['RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'ICICIBANK.NS', 'ZOMATO.NS']
              ).map(sym => (
                <button
                  key={sym}
                  type="button"
                  onClick={() => handleAddPopularStock(sym)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--accent-blue-border)',
                    color: 'var(--accent-blue)',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Plus style={{ width: '12px', height: '12px' }} />
                  <span>{sym.replace('.NS', '')}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 330px), 1fr))',
          gap: '12px'
        }}>
          {sortedStocks.map(stock => {
            const isPos = stock.changePercent >= 0;
            const flashClass = priceFlashes[stock.symbol] || '';
            const avatar = stock.symbol.replace('.NS', '').replace('^', '').slice(0, 2);

            return (
              <div
                key={stock.symbol}
                role="button"
                tabIndex={0}
                onClick={() => onSelectStock?.(stock.symbol)}
                className="pro-card-glass native-stock-row"
                style={{
                  padding: '16px',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  border: '1px solid var(--border-subtle)',
                  backgroundColor: 'var(--bg-surface)',
                  transition: 'transform 0.15s ease, border-color 0.15s ease'
                }}
              >
                {/* Row 1: Symbol Avatar, Name, and Star Button */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <div className="ticker-avatar" style={{ width: '34px', height: '34px', fontSize: '11px', flexShrink: 0 }}>
                      {avatar}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {stock.symbol.replace('.NS', '')}
                        </span>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          padding: '1px 5px',
                          borderRadius: '4px',
                          backgroundColor: stock.signal.includes('BUY') ? 'var(--emerald-pos-bg)' : 'var(--indigo-info-bg)',
                          color: stock.signal.includes('BUY') ? 'var(--accent-green)' : 'var(--accent-blue)',
                          border: `1px solid ${stock.signal.includes('BUY') ? 'var(--emerald-pos-border)' : 'var(--accent-blue-border)'}`
                        }}>
                          {stock.signal.replace('_', ' ')}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {stock.name} • <span style={{ color: 'var(--accent-blue)' }}>{stock.sector}</span>
                      </div>
                    </div>
                  </div>

                  {/* Remove / Star Toggle Button */}
                  <button
                    type="button"
                    title="Remove from watchlist"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSymbolFromList(stock.symbol);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent-gold)',
                      padding: '4px',
                      cursor: 'pointer',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Star style={{ width: '18px', height: '18px', fill: 'currentColor' }} />
                  </button>
                </div>

                {/* Row 2: Live Price & Day Change */}
                <div style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)'
                }}>
                  <div>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>
                      Live Market Price
                    </span>
                    <span className={`mono-num ${flashClass}`} style={{ fontSize: '17px', fontWeight: 900, color: 'var(--text-main)' }}>
                      {stock.currentPrice > 0 
                        ? `${currPrefix}${Number(stock.currentPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : '—'}
                    </span>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div className="mono-num" style={{
                      fontSize: '13px',
                      fontWeight: 800,
                      color: isPos ? 'var(--accent-green)' : 'var(--accent-red)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: '2px'
                    }}>
                      {isPos ? '+' : ''}{Number(stock.changePercent).toFixed(2)}%
                    </div>
                    <span className="mono-num" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {isPos ? '+' : ''}{Number(stock.change).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Row 3: Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    AI Score: <strong style={{ color: 'var(--accent-blue)' }}>{stock.score}/100</strong>
                  </span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectStock?.(stock.symbol);
                      }}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '8px',
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
                      <BarChart2 style={{ width: '12px', height: '12px' }} />
                      <span>Chart</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Watchlist Modal */}
      {showNewListModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div className="pro-card-glass" style={{
            width: '100%',
            maxWidth: '380px',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: '20px',
            border: '1px solid var(--border-bright)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                Create New Watchlist
              </h3>
              <button
                type="button"
                onClick={() => setShowNewListModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X style={{ width: '18px', height: '18px' }} />
              </button>
            </div>

            <form onSubmit={handleCreateNewList} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                  Watchlist Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Swing Breakouts, Dividend Stocks"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  autoFocus
                  className="pro-input-field"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    fontSize: '13px',
                    borderRadius: '12px',
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowNewListModal(false)}
                  className="m3-button-text"
                  style={{ padding: '8px 14px', fontSize: '12px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newListName.trim()}
                  className="m3-button-filled"
                  style={{ padding: '8px 18px', fontSize: '12px', fontWeight: 800, borderRadius: '12px' }}
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
