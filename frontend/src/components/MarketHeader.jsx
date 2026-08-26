import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, ChevronRight, Zap, Bell, Play, Pause, AlertTriangle, Star, User } from 'lucide-react';
import { CONTROL_HEADERS, apiFetch } from '../utils/api';
import { useWatchlist } from '../utils/useWatchlist';
import UserProfileDropdown from './UserProfileDropdown';
import LogoHexagon from './LogoHexagon';
import { fuzzySearchUniverse } from '../utils/stockUniverse';

function MarketHeader({
  marketData,
  searchQuery,
  setSearchQuery,
  onSelectStock,
  currentMarket = 'IN',
  wsStatus = 'LIVE',
  sessionInfo,
  onOpenAlertsModal,
  onOpenAuthModal,
  onOpenMenu,
  isFailover = false
}) {
  const wsConnected = wsStatus === 'LIVE' || wsStatus === 'REPLAY';
  const indices = useMemo(() => marketData?.indices || {}, [marketData]);
  const { isWatchlisted, toggleWatchlist } = useWatchlist(currentMarket);
  const currPrefix = currentMarket === 'US' ? '$' : '₹';
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [replaySpeed, setReplaySpeed] = useState(1.0);
  const [isReplayPlaying, setIsReplayPlaying] = useState(true);
  const [flashes, setFlashes] = useState({});
  const prevPrices = useRef({});

  const currentSession = sessionInfo?.[currentMarket] || { status: 'LIVE', label: 'LIVE MARKET DATA' };

  useEffect(() => {
    const newFlashes = {};
    Object.entries(indices).forEach(([key, idx]) => {
      const prev = prevPrices.current[key];
      if (prev !== undefined && idx.price !== undefined && idx.price !== prev) {
        if (idx.price > prev) newFlashes[key] = 'flash-up';
        else if (idx.price < prev) newFlashes[key] = 'flash-down';
      }
      prevPrices.current[key] = idx.price;
    });

    if (Object.keys(newFlashes).length > 0) {
      setFlashes(newFlashes);
      const timer = setTimeout(() => setFlashes({}), 700);
      return () => clearTimeout(timer);
    }
  }, [indices]);

  const [liveSearchResults, setLiveSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Live Debounced Multi-Exchange Company Search
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setLiveSearchResults([]);
      setIsSearching(false);
      return;
    }

    const controller = new AbortController();
    setIsSearching(true);
    const timer = setTimeout(() => {
      const q = encodeURIComponent(searchQuery.trim());
      apiFetch(`/api/search?q=${q}&market=${currentMarket}`)
        .then(async res => {
          const data = typeof res?.json === 'function' ? await res.json() : res;
          setLiveSearchResults(data?.results || []);
          setIsSearching(false);
        })
        .catch(err => {
          if (err?.name === 'AbortError') return;
          console.warn("Search fetch error:", err);
          setIsSearching(false);
        });
    }, 100);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery, currentMarket]);

  // High-accuracy instant local matches
  const localFiltered = useMemo(() => {
    return fuzzySearchUniverse(searchQuery, currentMarket);
  }, [searchQuery, currentMarket]);

  // Combine and deduplicate local universe and live search
  const combinedResults = useMemo(() => {
    const map = new Map();
    // 1. First add API search results if available
    liveSearchResults.forEach(item => {
      if (item && item.symbol) {
        map.set(item.symbol.toUpperCase(), item);
      }
    });
    // 2. Add or backfill with local high-accuracy universe
    localFiltered.forEach(item => {
      const key = item.symbol.toUpperCase();
      if (!map.has(key)) {
        map.set(key, item);
      }
    });
    return Array.from(map.values()).slice(0, 10);
  }, [liveSearchResults, localFiltered]);

  const selectSymbol = (sym) => {
    if (!sym) return;
    if (typeof onSelectStock === 'function') {
      onSelectStock(sym);
    }
    setSearchQuery('');
    setHighlightIndex(-1);
    setShowSearchDropdown(false);
    setShowMobileSearch(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setShowSearchDropdown(true);
      setHighlightIndex(prev => (combinedResults.length > 0 ? Math.min(prev + 1, combinedResults.length - 1) : -1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex(prev => Math.max(prev - 1, -1));
      return;
    }
    if (e.key === 'Enter' && searchQuery.trim()) {
      e.preventDefault();
      if (highlightIndex >= 0 && combinedResults[highlightIndex]) {
        selectSymbol(combinedResults[highlightIndex].symbol);
        return;
      }
      let targetSym = searchQuery.trim().toUpperCase();
      if (combinedResults.length > 0) {
        targetSym = combinedResults[0].symbol;
      } else {
        if (currentMarket === 'IN' && !targetSym.endsWith('.NS') && !targetSym.startsWith('^') && !targetSym.includes(' ')) {
          targetSym = `${targetSym}.NS`;
        }
      }
      selectSymbol(targetSym);
    }
  };

  const [replayBusy, setReplayBusy] = useState(false);
  const [replayError, setReplayError] = useState(null);

  const sendReplayCommand = async (body) => {
    setReplayError(null);
    setReplayBusy(true);
    try {
      await apiFetch(`/api/replay/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...CONTROL_HEADERS },
        body: JSON.stringify(body)
      });
      return true;
    } catch (err) {
      setReplayError(`Replay control failed: ${err.message}`);
      return false;
    } finally {
      setReplayBusy(false);
    }
  };

  const handleReplayToggle = async (action) => {
    if (action === 'pause') {
      setIsReplayPlaying(false);
      const ok = await sendReplayCommand({ action: 'pause' });
      if (!ok) setIsReplayPlaying(true);
    } else if (action === 'resume') {
      setIsReplayPlaying(true);
      const ok = await sendReplayCommand({ action: 'resume' });
      if (!ok) setIsReplayPlaying(false);
    } else if (action === 'step') {
      await sendReplayCommand({ action: 'step' });
    }
  };

  const handleSpeedChange = async (speed) => {
    const prevSpeed = replaySpeed;
    setReplaySpeed(speed);
    const ok = await sendReplayCommand({ action: 'set_speed', speed });
    if (!ok) setReplaySpeed(prevSpeed);
  };

  const isReplay = wsStatus === 'REPLAY';

  return (
    <header className="market-header" style={{
      width: '100%',
      backgroundColor: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border-subtle)',
      padding: '10px 20px',
      position: 'sticky',
      top: 0,
      zIndex: 30,
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    }}>
      {/* ── Top Bar: Navigation, Brand, Actions & Search ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', width: '100%' }}>
        
        {/* Left: Mobile Menu & Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          <button
            type="button"
            aria-label="Open navigation menu"
            onClick={onOpenMenu}
            className="mobile-menu-toggle m3-icon-button"
            style={{
              display: 'none',
              width: '36px',
              height: '36px',
              borderRadius: '18px',
              backgroundColor: 'var(--md-sys-color-surface-container-high)',
              border: '1px solid var(--md-sys-color-outline-variant)',
              color: 'var(--text-main)',
              cursor: 'pointer',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              flexShrink: 0
            }}
          >
            ☰
          </button>

          <div className="mobile-brand" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <LogoHexagon size={24} />
            <span style={{ fontSize: '15px', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-main)' }}>
              MANISH<span style={{ color: 'var(--accent-blue)' }}> MARKET</span>
            </span>

            {/* Live Streaming Data Confirmation Badge */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 7px',
              borderRadius: '10px',
              backgroundColor: wsConnected ? 'rgba(0, 230, 118, 0.15)' : 'rgba(255, 171, 0, 0.15)',
              border: `1px solid ${wsConnected ? 'rgba(0, 230, 118, 0.4)' : 'rgba(255, 171, 0, 0.4)'}`,
              color: wsConnected ? 'var(--accent-green)' : 'var(--accent-gold)',
              fontSize: '10px',
              fontWeight: 800
            }}>
              <span className="live-dot-pulse" style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: wsConnected ? 'var(--accent-green)' : 'var(--accent-gold)'
              }}></span>
              <span>{wsConnected ? 'LIVE' : 'CONNECTING...'}</span>
            </div>

            {/* Market Session Status / Holiday Badge */}
            {sessionInfo?.status === 'MARKET_CLOSED' && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 8px',
                borderRadius: '10px',
                backgroundColor: 'rgba(245, 158, 11, 0.18)',
                border: '1px solid var(--accent-gold-border)',
                color: '#FCD34D',
                fontSize: '10px',
                fontWeight: 800
              }}>
                <span>{sessionInfo.reason?.toLowerCase().includes('holiday') ? '🌴 HOLIDAY' : '🌙 AFTER-HOURS'} ({currentMarket === 'IN' ? 'NSE/BSE Closed' : 'US Closed'})</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Actions, Replay Controls & Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 auto', justifyContent: 'flex-end' }}>
          
          {/* Replay Controls Quick Bar */}
          {isReplay && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'flex-end' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: 'var(--bg-elevated)',
                padding: '4px 8px',
                borderRadius: '10px',
                border: '1px solid var(--accent-gold-border)'
              }}>
                {isReplayPlaying ? (
                  <button
                    type="button"
                    onClick={() => handleReplayToggle('pause')}
                    disabled={replayBusy}
                    title="Pause Replay"
                    aria-label="Pause Replay"
                    style={{ background: 'none', border: 'none', color: 'var(--accent-gold)', cursor: replayBusy ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', opacity: replayBusy ? 0.5 : 1 }}
                  >
                    <Pause style={{ width: '14px', height: '14px' }} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleReplayToggle('resume')}
                    disabled={replayBusy}
                    title="Resume Replay"
                    aria-label="Resume Replay"
                    style={{ background: 'none', border: 'none', color: 'var(--accent-green)', cursor: replayBusy ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', opacity: replayBusy ? 0.5 : 1 }}
                  >
                    <Play style={{ width: '14px', height: '14px' }} />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleReplayToggle('step')}
                  disabled={replayBusy}
                  title="Step 1 Frame"
                  aria-label="Step 1 Frame"
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: replayBusy ? 'wait' : 'pointer', fontSize: '11px', fontWeight: 700, opacity: replayBusy ? 0.5 : 1 }}
                >
                  Step
                </button>

                <div style={{ display: 'flex', gap: '2px' }}>
                  {[1, 2, 5].map(spd => (
                    <button
                      key={spd}
                      onClick={() => handleSpeedChange(spd)}
                      disabled={replayBusy}
                      style={{
                        padding: '2px 5px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 800,
                        backgroundColor: replaySpeed === spd ? 'var(--accent-gold)' : 'transparent',
                        color: replaySpeed === spd ? 'var(--bg-dark)' : 'var(--text-muted)',
                        border: 'none',
                        cursor: replayBusy ? 'wait' : 'pointer',
                        opacity: replayBusy ? 0.6 : 1
                      }}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              </div>
              {replayError && (
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-red)' }}>
                  ⚠️ {replayError}
                </span>
              )}
            </div>
          )}

          {/* Price Alerts Trigger Button */}
          <button
            onClick={onOpenAlertsModal}
            title="Manage Real-Time Price Alerts"
            aria-label="Manage Real-Time Price Alerts"
            className="m3-icon-button"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '18px',
              backgroundColor: 'var(--md-sys-color-surface-container-high)',
              border: '1px solid var(--md-sys-color-outline-variant)',
              color: 'var(--accent-gold)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Bell style={{ width: '16px', height: '16px' }} />
          </button>

          {/* User Authentication & Profile Dropdown */}
          <UserProfileDropdown
            onOpenAuthModal={onOpenAuthModal}
            currentMarket={currentMarket}
          />

          {/* Mobile Search Button Trigger */}
          <button
            onClick={() => setShowMobileSearch(true)}
            title="Search Stocks"
            aria-label="Search Stocks"
            className="m3-icon-button show-on-mobile"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '18px',
              backgroundColor: 'var(--md-sys-color-surface-container-high)',
              border: '1px solid var(--md-sys-color-outline-variant)',
              color: 'var(--accent-blue)',
              cursor: 'pointer',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Search style={{ width: '16px', height: '16px' }} />
          </button>

          {/* Search Box (Desktop Inline) */}
          <div className="hide-on-mobile" style={{ position: 'relative', flex: '1 1 200px', minWidth: 0 }}>
            <Search style={{ width: '14px', height: '14px', position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              role="combobox"
              aria-expanded={showSearchDropdown && !!searchQuery.trim()}
              aria-controls="market-search-listbox"
              aria-autocomplete="list"
              aria-label="Search stocks and indices"
              placeholder={currentMarket === 'US' ? "Search US stock (NVDA, AAPL)..." : "Search NSE stock (Reliance, TCS)..."}
              value={searchQuery}
              onFocus={() => setShowSearchDropdown(true)}
              onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
              onKeyDown={handleKeyDown}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setHighlightIndex(-1);
                setShowSearchDropdown(true);
              }}
              className="pro-input-field"
              style={{ width: '100%', paddingLeft: '36px', paddingRight: '14px', fontSize: '12px', borderRadius: '24px', backgroundColor: 'var(--md-sys-color-surface-container)', border: '1px solid var(--md-sys-color-outline-variant)' }}
            />

            {showSearchDropdown && searchQuery.trim() && (
              <div
                id="market-search-listbox"
                role="listbox"
                aria-label="Search results"
                style={{
                  position: 'absolute',
                  top: '100%',
                  marginTop: '8px',
                  left: 0,
                  right: 0,
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border-bright)',
                  borderRadius: '12px',
                  padding: '6px',
                  maxHeight: '340px',
                  overflowY: 'auto',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.7)',
                  zIndex: 100
                }}>
                {/* Instant Dynamic Symbol Analysis Trigger */}
                <div
                  onMouseDown={(e) => {
                    e.preventDefault();
                    let sym = searchQuery.trim().toUpperCase();
                    if (currentMarket === 'IN' && !sym.endsWith('.NS') && !sym.startsWith('^')) {
                      sym = `${sym}.NS`;
                    }
                    selectSymbol(sym);
                  }}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--accent-blue-bg)',
                    border: '1px solid var(--accent-blue-border)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '12px',
                    marginBottom: '6px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Zap style={{ width: '14px', height: '14px', color: 'var(--accent-blue)' }} />
                    <span style={{ fontWeight: 800, color: 'var(--accent-blue)' }}>
                      Analyze <strong>{searchQuery.trim().toUpperCase()}</strong> with Pattern Engine
                    </span>
                  </div>
                  <ChevronRight style={{ width: '14px', height: '14px', color: 'var(--accent-blue)' }} />
                </div>

                {isSearching && (
                  <div style={{ padding: '8px 12px', fontSize: '11px', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="live-dot-pulse" style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--accent-blue)' }}></span>
                    Searching global exchanges...
                  </div>
                )}

                {combinedResults.map((s, idx) => (
                  <div
                    key={s.symbol}
                    role="option"
                    id={`market-search-option-${idx}`}
                    aria-selected={idx === highlightIndex}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectSymbol(s.symbol);
                    }}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '12px',
                      transition: 'background-color 0.15s ease',
                      backgroundColor: idx === highlightIndex ? 'var(--accent-blue-bg)' : 'transparent'
                    }}
                    onMouseEnter={(e) => {
                      setHighlightIndex(idx);
                      e.currentTarget.style.backgroundColor = 'var(--accent-blue-bg)';
                    }}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = idx === highlightIndex ? 'var(--accent-blue-bg)' : 'transparent'}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{s.name}</span>
                        {s.exchange && (
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            padding: '1px 5px',
                            borderRadius: '4px',
                            backgroundColor: s.exchange.includes('NSE') ? 'var(--emerald-pos-bg)' : 'var(--indigo-info-bg)',
                            color: s.exchange.includes('NSE') ? 'var(--accent-green)' : 'var(--accent-blue)',
                            border: `1px solid ${s.exchange.includes('NSE') ? 'var(--emerald-pos-border)' : 'var(--accent-blue-border)'}`
                          }}>
                            {s.exchange}
                          </span>
                        )}
                      </div>
                      <div className="mono-num" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        <strong style={{ color: 'var(--accent-blue)' }}>{s.symbol}</strong> • {s.sector || 'Equity'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        title={isWatchlisted(s.symbol) ? "Remove from Watchlist" : "Add to Watchlist"}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleWatchlist(s.symbol);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: isWatchlisted(s.symbol) ? 'var(--accent-gold)' : 'var(--text-muted)',
                          padding: '4px',
                          cursor: 'pointer',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: isWatchlisted(s.symbol) ? 1 : 0.6
                        }}
                      >
                        <Star style={{ width: '14px', height: '14px', fill: isWatchlisted(s.symbol) ? 'currentColor' : 'none' }} />
                      </button>
                      <ChevronRight style={{ width: '14px', height: '14px', color: 'var(--accent-blue)' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* ── Sub-Bar: Clean Material 3 Indices & Market Session Ribbon ── */}
      <div className="indices-scroll-track" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        WebkitOverflowScrolling: 'touch',
        padding: '2px 0 2px 0',
        width: '100%'
      }}>
        {/* Session Status Pill */}
        {isReplay ? (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            backgroundColor: 'rgba(255, 171, 0, 0.15)',
            border: '1px solid var(--accent-gold-border)',
            padding: '3px 9px',
            borderRadius: '14px',
            fontSize: '10px',
            fontWeight: 800,
            color: 'var(--accent-gold)',
            whiteSpace: 'nowrap',
            flexShrink: 0
          }}>
            <span className="live-dot-pulse" style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--accent-gold)' }}></span>
            <span>REPLAY</span>
          </div>
        ) : (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            backgroundColor: wsStatus === 'STALE' ? 'rgba(245, 158, 11, 0.15)' : (currentSession.status === 'LIVE' ? 'var(--accent-green-bg)' : 'var(--accent-gold-bg)'),
            border: wsStatus === 'STALE' ? '1px solid rgba(245, 158, 11, 0.4)' : (currentSession.status === 'LIVE' ? '1px solid var(--accent-green-border)' : '1px solid var(--accent-gold-border)'),
            padding: '3px 9px',
            borderRadius: '14px',
            fontSize: '10px',
            fontWeight: 800,
            color: wsStatus === 'STALE' ? 'var(--accent-gold)' : (currentSession.status === 'LIVE' ? 'var(--accent-green)' : 'var(--accent-gold)'),
            whiteSpace: 'nowrap',
            flexShrink: 0
          }}>
            <span className="live-dot-pulse" style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: wsStatus === 'STALE' ? 'var(--accent-gold)' : (currentSession.status === 'LIVE' ? 'var(--accent-green)' : 'var(--accent-gold)')
            }}></span>
            <span>{wsStatus === 'STALE' ? 'STALE' : (currentSession.status === 'LIVE' ? 'LIVE' : 'CLOSED')}</span>
          </div>
        )}

        {/* Failover Feed Warning Badge if Active */}
        {isFailover && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: 'var(--accent-red-bg)',
            border: '1px solid var(--accent-red-border)',
            padding: '3px 8px',
            borderRadius: '14px',
            fontSize: '10px',
            fontWeight: 800,
            color: 'var(--accent-red)',
            whiteSpace: 'nowrap',
            flexShrink: 0
          }}>
            <AlertTriangle style={{ width: '11px', height: '11px' }} />
            <span>FAILOVER</span>
          </div>
        )}

        {/* Sleek Index Pills */}
        {Object.entries(indices).map(([key, idx]) => {
          const isUp = idx.pChange >= 0;
          const flashClass = flashes[key] || '';
          return (
            <div key={key} className={flashClass} style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'var(--md-sys-color-surface-container)',
              padding: '3px 9px',
              borderRadius: '14px',
              border: '1px solid var(--md-sys-color-outline-variant)',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              fontSize: '11px',
              transition: 'all 0.2s ease'
            }}>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{idx.name}</span>
              <span className="mono-num" style={{ fontWeight: 800, color: 'var(--text-main)' }}>{currPrefix}{idx.price?.toLocaleString('en-US')}</span>
              <span className="mono-num" style={{
                fontSize: '10px',
                fontWeight: 800,
                padding: '1px 5px',
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px',
                backgroundColor: isUp ? 'var(--accent-green-bg)' : 'var(--accent-red-bg)',
                color: isUp ? 'var(--accent-green)' : 'var(--accent-red)'
              }}>
                {isUp ? '+' : ''}{idx.pChange}%
              </span>
            </div>
          );
        })}
      </div>

      {/* Dedicated Mobile Search Overlay Sheet */}
      {showMobileSearch && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 2000,
          backgroundColor: 'var(--bg-dark)',
          display: 'flex',
          flexDirection: 'column',
          padding: '16px 16px 24px 16px',
          animation: 'fade-in 0.2s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search style={{ width: '16px', height: '16px', position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                autoFocus
                type="text"
                placeholder={currentMarket === 'US' ? "Search US stocks (NVDA, AAPL)..." : "Search NSE stocks (Reliance, TCS)..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 38px',
                  fontSize: '14px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--accent-blue)',
                  color: 'var(--text-main)'
                }}
              />
            </div>
            <button
              onClick={() => setShowMobileSearch(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-main)',
                fontSize: '18px',
                fontWeight: 800,
                padding: '8px',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {isSearching && (
              <div style={{ padding: '12px', fontSize: '12px', color: 'var(--accent-blue)', textAlign: 'center' }}>
                Searching market exchanges...
              </div>
            )}

            {searchQuery.trim() && (
              <div
                onClick={() => {
                  let sym = searchQuery.trim().toUpperCase();
                  if (currentMarket === 'IN' && !sym.endsWith('.NS') && !sym.startsWith('^')) {
                    sym = `${sym}.NS`;
                  }
                  selectSymbol(sym);
                }}
                style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--accent-blue-bg)',
                  border: '1px solid var(--accent-blue-border)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '8px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Zap style={{ width: '16px', height: '16px', color: 'var(--accent-blue)' }} />
                  <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--accent-blue)' }}>
                    Analyze {searchQuery.trim().toUpperCase()}
                  </span>
                </div>
                <ChevronRight style={{ width: '16px', height: '16px', color: 'var(--accent-blue)' }} />
              </div>
            )}

            {combinedResults.map((s) => (
              <div
                key={s.symbol}
                onClick={() => {
                  selectSymbol(s.symbol);
                }}
                style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer'
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)' }}>{s.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{s.symbol} • {s.sector || 'Equities'}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    title={isWatchlisted(s.symbol) ? "Remove from Watchlist" : "Add to Watchlist"}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleWatchlist(s.symbol);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: isWatchlisted(s.symbol) ? 'var(--accent-gold)' : 'var(--text-muted)',
                      padding: '6px',
                      cursor: 'pointer',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: isWatchlisted(s.symbol) ? 1 : 0.6
                    }}
                  >
                    <Star style={{ width: '16px', height: '16px', fill: isWatchlisted(s.symbol) ? 'currentColor' : 'none' }} />
                  </button>
                  <ChevronRight style={{ width: '16px', height: '16px', color: 'var(--accent-blue)' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}

export default React.memo(MarketHeader);
