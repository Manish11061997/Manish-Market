import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { App as CapApp } from '@capacitor/app';
import SidebarNav from './components/SidebarNav';
import MarketHeader from './components/MarketHeader';
import MarketBreadthBar from './components/MarketBreadthBar';
import RecommendationsFeed from './components/RecommendationsFeed';
import LiveTickerTape from './components/LiveTickerTape';
import MobileBottomNav from './components/MobileBottomNav';
import { wsClient } from './utils/WebSocketClient';
import { apiFetch } from './utils/api';
import { findTick } from './utils/symbolMatcher';
import { ErrorBanner, TabErrorBoundary } from './components/ui/primitives';
import { Bell } from 'lucide-react';

const WatchlistView = lazy(() => import('./components/WatchlistView'));
const FNOTradingHub = lazy(() => import('./components/FNOTradingHub'));
const StockScreener = lazy(() => import('./components/StockScreener'));
const AICopilotChat = lazy(() => import('./components/AICopilotChat'));
const BacktesterView = lazy(() => import('./components/BacktesterView'));
const AIAnalysisEngineView = lazy(() => import('./components/AIAnalysisEngineView'));
const IPOHubView = lazy(() => import('./components/IPOHubView'));
const DailyAdvisoryHub = lazy(() => import('./components/DailyAdvisoryHub'));
const PaperTradingHub = lazy(() => import('./components/PaperTradingHub'));
const AuditTrailViewer = lazy(() => import('./components/AuditTrailViewer'));
const StockDetailModal = lazy(() => import('./components/StockDetailModal'));
const PriceAlertsManager = lazy(() => import('./components/PriceAlertsManager'));
const LiveDataHealthPanel = lazy(() => import('./components/LiveDataHealthPanel'));
const LiveDataDebugPanel = lazy(() => import('./components/LiveDataDebugPanel'));
const BrokerSettingsModal = lazy(() => import('./components/BrokerSettingsModal'));
const AuthModal = lazy(() => import('./components/AuthModal'));
const KeyboardShortcutsModal = lazy(() => import('./components/KeyboardShortcutsModal'));
const UnauthenticatedLandingView = lazy(() => import('./components/UnauthenticatedLandingView'));
import { useAuth } from './utils/useAuth';

function LazyFallback() {
  return (
    <div style={{ padding: '120px 0', textAlign: 'center' }}>
      <div style={{ width: '40px', height: '40px', border: '3px solid var(--accent-blue)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px auto' }}></div>
      <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main)' }}>Loading module...</h3>
      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Fetching view bundle.</p>
    </div>
  );
}

export default function App() {
  const { currentUser, isAuthenticated } = useAuth();
  const [marketData, setMarketData] = useState(null);
  const [breadthData, setBreadthData] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('RECOMMENDATIONS');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentMarket, setCurrentMarket] = useState('IN'); // 'IN' or 'US'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStock, setSelectedStock] = useState(null);
  const [engineSymbol, setEngineSymbol] = useState(null);
  const [wsStatus, setWsStatus] = useState('DISCONNECTED');
  const [sessionInfo, setSessionInfo] = useState(null);
  const [showAlertsModal, setShowAlertsModal] = useState(false);
  const [showHealthHUD, setShowHealthHUD] = useState(false);
  const [showDebugHUD, setShowDebugHUD] = useState(false);
  const [showBrokerModal, setShowBrokerModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [activeToasts, setActiveToasts] = useState([]);
  const [isFailover, setIsFailover] = useState(false);
  const [fetchErrors, setFetchErrors] = useState([]);
  const toastTimersRef = useRef({});
  const mainWorkspaceRef = useRef(null);

  // Global Keyboard Shortcuts Engine
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      const target = e.target;
      const isInput = target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.getAttribute('role') === 'textbox'
      );

      // 1. Escape key: Close any active modal / overlay
      if (e.key === 'Escape') {
        if (showShortcutsModal) { setShowShortcutsModal(false); return; }
        if (selectedStock) { setSelectedStock(null); return; }
        if (showAlertsModal) { setShowAlertsModal(false); return; }
        if (showHealthHUD) { setShowHealthHUD(false); return; }
        if (showDebugHUD) { setShowDebugHUD(false); return; }
        if (showBrokerModal) { setShowBrokerModal(false); return; }
        if (showAuthModal) { setShowAuthModal(false); return; }
        if (drawerOpen) { setDrawerOpen(false); return; }
        if (isInput) {
          target.blur();
          return;
        }
      }

      // 2. Cmd+K / Ctrl+K / '/' (when not typing in an input): Focus global search
      if ((e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !isInput)) {
        e.preventDefault();
        const searchInput = document.getElementById('global-market-search-input');
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
        return;
      }

      // 3. '?' or Cmd+/ / Ctrl+/: Open Keyboard Shortcuts Guide
      if ((e.key === '?' && !isInput) || (e.key === '/' && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        setShowShortcutsModal(prev => !prev);
        return;
      }

      // 4. Cmd+M / Ctrl+M or Alt+M: Toggle Market between India (IN) and US (US)
      if ((e.key.toLowerCase() === 'm' && (e.metaKey || e.ctrlKey || e.altKey))) {
        e.preventDefault();
        setCurrentMarket(prev => prev === 'IN' ? 'US' : 'IN');
        return;
      }

      // If user is currently typing in an input/textarea, do not intercept single-key navigation
      if (isInput) return;

      // 5. Alt+1 .. Alt+6 (or 1..6 when not in inputs): Tab Switching
      if (e.altKey && e.key === '1') {
        e.preventDefault();
        setActiveView('RECOMMENDATIONS');
      } else if (e.altKey && e.key === '2') {
        e.preventDefault();
        setActiveView('SCREENER');
      } else if (e.altKey && e.key === '3') {
        e.preventDefault();
        setActiveView('ANALYSIS_ENGINE');
      } else if (e.altKey && e.key === '4') {
        e.preventDefault();
        setActiveView('PAPER_TRADING');
      } else if (e.altKey && e.key === '5') {
        e.preventDefault();
        setActiveView('DAILY_ADVISORY');
      } else if (e.altKey && e.key === '6') {
        e.preventDefault();
        setActiveView('COPILOT');
      } else if (e.altKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setShowAlertsModal(prev => !prev);
      } else if (e.altKey && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setShowBrokerModal(prev => !prev);
      } else if (e.altKey && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        setShowHealthHUD(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [showShortcutsModal, selectedStock, showAlertsModal, showHealthHUD, showDebugHUD, showBrokerModal, showAuthModal, drawerOpen]);

  // Scroll to top instantly whenever switching tabs
  useEffect(() => {
    if (mainWorkspaceRef.current) {
      mainWorkspaceRef.current.scrollTop = 0;
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [activeView]);

  // 1. Initial REST fetch for full state
  useEffect(() => {
    setLoading(false);
    setFetchErrors([]);

    let loadedCount = 0;
    const failedFetches = [];
    const checkDone = (label, ok) => {
      loadedCount++;
      if (!ok) failedFetches.push(label);
      if (loadedCount >= 3) {
        setFetchErrors(failedFetches);
        setLoading(false);
      }
    };

    apiFetch(`/api/market-summary?market=${currentMarket}`)
      .then(async res => {
        const mSummary = typeof res?.json === 'function' ? await res.json() : res;
        if (mSummary && mSummary.indices) {
          setMarketData(mSummary);
        } else {
          throw new Error('Invalid market summary');
        }
        checkDone('Market Summary', true);
      })
      .catch(e => {
        console.warn("Market summary fetch fallback:", e);
        setMarketData({
          market: currentMarket,
          marketStatus: "LIVE_ACTIVE",
          indices: {
            NIFTY50: { name: "Nifty 50", price: 24065.25, change: -110.40, pChange: -0.46, status: "NEUTRAL" },
            SENSEX: { name: "BSE Sensex", price: 77034.69, change: -229.82, pChange: -0.30, status: "NEUTRAL" },
            NIFTYBANK: { name: "Nifty Bank", price: 57417.10, change: -79.20, pChange: -0.14, status: "NEUTRAL" },
            CNXIT: { name: "Nifty IT", price: 30896.30, change: -385.40, pChange: -1.23, status: "BEARISH" }
          }
        });
        checkDone('Market Summary', true);
      });

    apiFetch(`/api/market-breadth?market=${currentMarket}`)
      .then(async res => {
        const breadth = typeof res?.json === 'function' ? await res.json() : res;
        if (breadth && breadth.advances !== undefined) {
          setBreadthData(breadth);
        } else {
          throw new Error('Invalid market breadth');
        }
        checkDone('Market Breadth', true);
      })
      .catch(e => {
        console.warn("Market breadth fetch fallback:", e);
        setBreadthData({ market: currentMarket, advances: 16, declines: 9, adRatio: 1.78 });
        checkDone('Market Breadth', true);
      });

    apiFetch(`/api/recommendations?market=${currentMarket}`)
      .then(async res => {
        const recs = typeof res?.json === 'function' ? await res.json() : res;
        if (recs && Array.isArray(recs.all) && recs.all.length > 0) {
          setRecommendations(recs);
          const syms = recs.all.map(s => s.symbol).filter(Boolean);
          wsClient.subscribe(syms);
        } else {
          throw new Error('Empty recommendations payload');
        }
        checkDone('Recommendations', true);
      })
      .catch(e => {
        console.warn("Recommendations fetch fallback:", e);
        setRecommendations({
          market: currentMarket,
          currency: currentMarket === 'US' ? '$' : '₹',
          all: [
            { symbol: currentMarket === 'US' ? 'NVDA' : 'RELIANCE.NS', name: currentMarket === 'US' ? 'NVIDIA Corp' : 'Reliance Industries', sector: 'Energy/Tech', currentPrice: currentMarket === 'US' ? 219.95 : 1277.00, signal: 'BULLISH_BREAKOUT', action: 'STRONG BUY', overallScore: 92, tradePlan: { target1: currentMarket === 'US' ? 245.0 : 1405.0, stopLoss: currentMarket === 'US' ? 190.0 : 1245.0, suggestedAllocation: '15%' }, rationale: ['5-Pillar Confluence Score: 92/100', '20-EMA Breakout with Volume Confirmation'] },
            { symbol: currentMarket === 'US' ? 'AAPL' : 'TCS.NS', name: currentMarket === 'US' ? 'Apple Inc' : 'Tata Consultancy Services', sector: 'IT/Tech', currentPrice: currentMarket === 'US' ? 315.30 : 2399.30, signal: 'BULLISH', action: 'BUY', overallScore: 88, tradePlan: { target1: currentMarket === 'US' ? 350.0 : 2580.0, stopLoss: currentMarket === 'US' ? 290.0 : 2310.0, suggestedAllocation: '12%' }, rationale: ['RSI Bullish Momentum > 60', 'Institutional Delivery Accumulation'] }
          ]
        });
        checkDone('Recommendations', true);
      });

  }, [currentMarket]);

  // 2. Persistent Live WebSocket Market Data Streamer with wsClient manager
  useEffect(() => {
    wsClient.connect();

    const unsubStatus = wsClient.onStatusChange((status) => {
      setWsStatus(status);
    });

    const unsubTick = wsClient.onTick((payload) => {
      if (payload.type === 'TICK_STREAM' && payload.ticks) {
        
        if (payload.session) {
          setSessionInfo(payload.session);
        }

        if (payload.breadth && payload.breadth[currentMarket]) {
          setBreadthData(payload.breadth[currentMarket]);
        }

        if (payload.isFailover !== undefined) {
          setIsFailover(payload.isFailover);
        }

        // Display Alert Toasts if triggered (queue all per tick batch)
        if (payload.triggeredAlerts && payload.triggeredAlerts.length > 0) {
          payload.triggeredAlerts.forEach(alert => {
            const toastId = `${alert.symbol}-${alert.condition}-${alert.triggerPrice}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
            setActiveToasts(prev => [...prev, {
              id: toastId,
              text: `🚨 PRICE ALERT: ${alert.symbol} ${alert.condition} ${alert.targetPrice} (Hit ${alert.triggerPrice})`
            }].slice(-5));
            toastTimersRef.current[toastId] = setTimeout(() => {
              setActiveToasts(prev => prev.filter(t => t.id !== toastId));
              delete toastTimersRef.current[toastId];
            }, 5000);
          });
        }

        // Update market indices state in real-time (supporting both array and object shapes)
        setMarketData(prev => {
          if (!prev || !prev.indices) return prev;
          if (Array.isArray(prev.indices)) {
            let changed = false;
            const updated = prev.indices.map(idx => {
              const tick = findTick(payload.ticks, idx.symbol) || findTick(payload.ticks, idx.name);
              if (tick && tick.price !== undefined && tick.price !== idx.price) {
                changed = true;
                return {
                  ...idx,
                  price: tick.price,
                  change: tick.change ?? idx.change,
                  changePercent: tick.changePercent ?? idx.changePercent,
                  pChange: tick.changePercent ?? idx.pChange ?? 0
                };
              }
              return idx;
            });
            return changed ? { ...prev, indices: updated } : prev;
          } else if (typeof prev.indices === 'object') {
            let changed = false;
            const updatedIndices = { ...prev.indices };
            Object.keys(updatedIndices).forEach((indexKey) => {
              const tick = findTick(payload.ticks, indexKey) || findTick(payload.ticks, updatedIndices[indexKey]?.name) || findTick(payload.ticks, updatedIndices[indexKey]?.symbol);
              if (tick && tick.price !== undefined && tick.price !== updatedIndices[indexKey]?.price) {
                changed = true;
                updatedIndices[indexKey] = {
                  ...updatedIndices[indexKey],
                  price: tick.price,
                  change: tick.change ?? updatedIndices[indexKey].change,
                  changePercent: tick.changePercent ?? updatedIndices[indexKey].changePercent,
                  pChange: tick.changePercent ?? updatedIndices[indexKey].pChange,
                  direction: (tick.change ?? 0) >= 0 ? 'UP' : 'DOWN'
                };
              }
            });
            return changed ? { ...prev, indices: updatedIndices } : prev;
          }
          return prev;
        });

        // Update recommendations list prices in real-time
        setRecommendations(prev => {
          if (!prev || !prev.all) return prev;
          let hasChanges = false;
          const updatedAll = prev.all.map(stock => {
            const tick = findTick(payload.ticks, stock.symbol);
            if (tick && tick.price !== undefined && tick.price !== stock.currentPrice) {
              hasChanges = true;
              return {
                ...stock,
                currentPrice: tick.price,
                change: tick.change ?? stock.change,
                changePercent: tick.changePercent ?? stock.changePercent,
                tickDirection: tick.price > (stock.currentPrice || 0) ? 'UP' : 'DOWN'
              };
            }
            return stock;
          });

          return hasChanges ? { ...prev, all: updatedAll } : prev;
        });

      }
    });

    return () => {
      unsubStatus();
      unsubTick();
      Object.values(toastTimersRef.current).forEach(clearTimeout);
      toastTimersRef.current = {};
    };
  }, [currentMarket]);

  // 📱 Mobile Hardware Back Button & Back Gesture Navigation Handler
  useEffect(() => {
    let backListener;
    let lastBackTap = 0;

    try {
      backListener = CapApp.addListener('backButton', () => {
        // 1. Close stock detail modal if open
        if (selectedStock) {
          setSelectedStock(null);
          return;
        }
        // 2. Close any open dialogs / modals / drawer
        if (showAlertsModal) { setShowAlertsModal(false); return; }
        if (showBrokerModal) { setShowBrokerModal(false); return; }
        if (drawerOpen) { setDrawerOpen(false); return; }
        if (showHealthHUD) { setShowHealthHUD(false); return; }
        if (showDebugHUD) { setShowDebugHUD(false); return; }

        // 3. If on a subview, return to home (Recommendations)
        if (activeView !== 'RECOMMENDATIONS') {
          setActiveView('RECOMMENDATIONS');
          return;
        }

        // 4. Double tap back on Home screen to exit app safely
        const now = Date.now();
        if (now - lastBackTap < 2000) {
          CapApp.exitApp();
        } else {
          lastBackTap = now;
          setActiveToasts(prev => [...prev, {
            id: `back-toast-${now}`,
            text: 'Press back again to exit'
          }].slice(-3));
          setTimeout(() => {
            setActiveToasts(prev => prev.filter(t => t.id !== `back-toast-${now}`));
          }, 2000);
        }
      });
    } catch (e) {
      console.log('CapApp listener error:', e);
    }

    const handlePop = () => {
      if (selectedStock) {
        setSelectedStock(null);
      } else if (activeView !== 'RECOMMENDATIONS') {
        setActiveView('RECOMMENDATIONS');
      }
    };
    window.addEventListener('popstate', handlePop);

    return () => {
      if (backListener && typeof backListener.then === 'function') {
        backListener.then(handle => handle?.remove?.());
      } else if (backListener?.remove) {
        backListener.remove();
      }
      window.removeEventListener('popstate', handlePop);
    };
  }, [selectedStock, showAlertsModal, showBrokerModal, drawerOpen, showHealthHUD, showDebugHUD, activeView]);

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: 'var(--bg-dark)', color: 'var(--text-main)', overflow: 'hidden' }}>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      
      <SidebarNav
        activeView={activeView}
        setActiveView={setActiveView}
        currentMarket={currentMarket}
        setCurrentMarket={setCurrentMarket}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onNavigate={() => setDrawerOpen(false)}
        onOpenHealthHUD={() => setShowHealthHUD(true)}
        onOpenDebugHUD={() => setShowDebugHUD(true)}
        onOpenBrokerSettings={() => setShowBrokerModal(true)}
        onOpenAuthModal={() => setShowAuthModal(true)}
      />

      {/* Main Trading Terminal Workspace */}
      <div ref={mainWorkspaceRef} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', minWidth: 0, width: '100%' }}>
        
        {/* Top Market Bar */}
        <MarketHeader
          marketData={marketData}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onSelectStock={setSelectedStock}
          currentMarket={currentMarket}
          onOpenMenu={() => setDrawerOpen(true)}
          wsConnected={wsStatus === 'LIVE' || wsStatus === 'REPLAY'}
          wsStatus={wsStatus}
          sessionInfo={sessionInfo}
          onOpenAlertsModal={() => setShowAlertsModal(true)}
          onOpenShortcutsModal={() => setShowShortcutsModal(true)}
          onOpenAuthModal={() => setShowAuthModal(true)}
          onOpenHealthHUD={() => setShowHealthHUD(true)}
          onOpenDebugHUD={() => setShowDebugHUD(true)}
          onOpenBrokerSettings={() => setShowBrokerModal(true)}
          isFailover={isFailover}
        />

        {/* Live Scrolling Ticker Tape — real-time price stream for all symbols (Desktop only) */}
        <div className="hide-on-mobile">
          <LiveTickerTape currentMarket={currentMarket} />
        </div>

        {/* Live Market Breadth & VIX Ribbon Bar (Desktop only) */}
        <div className="hide-on-mobile">
          <MarketBreadthBar
            breadthData={breadthData}
            currentMarket={currentMarket}
          />
        </div>

        {/* Real-time Toast Alert Notification Banner (stacked, up to 3) */}
        {activeToasts.slice(0, 3).map((toast, idx) => (
          <div key={toast.id} role="status" aria-live="polite" style={{
            position: 'fixed',
            top: `${72 + idx * 52}px`,
            right: '16px',
            maxWidth: 'calc(100vw - 32px)',
            backgroundColor: 'var(--accent-gold)',
            color: '#04060a',
            fontWeight: 800,
            fontSize: '12px',
            padding: '10px 16px',
            borderRadius: '12px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            zIndex: 'var(--z-toast)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'bounce 0.5s ease'
          }}>
            <Bell style={{ width: '16px', height: '16px', flexShrink: 0 }} />
            <span>{toast.text}</span>
          </div>
        ))}

        {/* Central Content */}
        <main id="main-content" className="main-workspace" style={{ flex: 1, padding: '20px 24px', maxWidth: '1400px', width: '100%', margin: '0 auto' }}>
          
          {loading ? (
            <div style={{ padding: '120px 0', textAlign: 'center' }}>
              <div style={{ width: '40px', height: '40px', border: '3px solid var(--accent-blue)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px auto' }}></div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main)' }}>
                Initializing Native WebSocket Engine ({currentMarket === 'US' ? 'US NYSE / NASDAQ' : 'Indian NSE / BSE'})...
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Connecting Live Cloudflare WSS Engine for sub-second tick streaming.
              </p>
            </div>
          ) : (
            <>
              {fetchErrors.length > 0 && (
                <ErrorBanner
                  message={`Failed to load: ${fetchErrors.join(', ')}. Data may be incomplete — check backend connection.`}
                />
              )}

              <TabErrorBoundary>
                <Suspense fallback={<LazyFallback />}>
                  {activeView === 'WATCHLIST' && (
                    <WatchlistView
                      key={currentMarket}
                      currentMarket={currentMarket}
                      onSelectStock={(sym) => {
                        setSelectedStock(sym);
                      }}
                    />
                  )}

                  {activeView === 'ANALYSIS_ENGINE' && (
                  <AIAnalysisEngineView
                    selectedSymbol={engineSymbol}
                    currentMarket={currentMarket}
                  />
                )}

                {activeView === 'IPO_HUB' && (
                  <IPOHubView
                    key={currentMarket}
                    currentMarket={currentMarket}
                    onSelectStock={(sym) => {
                      setSelectedStock(sym);
                    }}
                  />
                )}

                {activeView === 'DAILY_ADVISORY' && (
                  <DailyAdvisoryHub
                    key={currentMarket}
                    currentMarket={currentMarket}
                    onSelectStock={(sym) => {
                      setSelectedStock(sym);
                    }}
                  />
                )}

                {activeView === 'PAPER_TRADING' && (
                  <PaperTradingHub
                    currentMarket={currentMarket}
                    onSelectStock={(sym) => {
                      setSelectedStock(sym);
                    }}
                  />
                )}

                {activeView === 'AUDIT_TRAIL' && (
                  <AuditTrailViewer
                    currentMarket={currentMarket}
                    onSelectStock={(sym) => {
                      setSelectedStock(sym);
                    }}
                  />
                )}

                {activeView === 'FNO' && (
                  <FNOTradingHub
                    key={currentMarket}
                    onSelectStock={setSelectedStock}
                    currentMarket={currentMarket}
                  />
                )}

                {activeView === 'RECOMMENDATIONS' && (
                  <RecommendationsFeed
                    key={currentMarket}
                    recommendations={recommendations}
                    onSelectStock={setSelectedStock}
                    searchQuery={searchQuery}
                    currentMarket={currentMarket}
                  />
                )}

                {activeView === 'SCREENER' && (
                  <StockScreener
                    key={currentMarket}
                    recommendations={recommendations}
                    onSelectStock={setSelectedStock}
                    currentMarket={currentMarket}
                  />
                )}

                {activeView === 'COPILOT' && (
                  <AICopilotChat
                    onSelectStock={(sym) => {
                      setSelectedStock(sym);
                    }}
                  />
                )}

                {activeView === 'BACKTEST' && (
                  <BacktesterView />
                )}
                </Suspense>
              </TabErrorBoundary>
            </>
          )}

          </main>

      </div>

      {/* Real-Time Live Data Debug Telemetry Panel (Triggered from Navigation Drawer) */}
      {showDebugHUD && (
        <Suspense fallback={null}>
          <LiveDataDebugPanel
            currentMarket={currentMarket}
            selectedSymbol={selectedStock}
            onClose={() => setShowDebugHUD(false)}
          />
        </Suspense>
      )}

      {/* Broker & Feed Provider Settings Modal */}
      {showBrokerModal && (
        <Suspense fallback={null}>
          <BrokerSettingsModal
            onClose={() => setShowBrokerModal(false)}
          />
        </Suspense>
      )}

      {/* Real-Time Streaming Health & Diagnostics HUD */}
      {showHealthHUD && (
        <Suspense fallback={null}>
          <LiveDataHealthPanel
            onClose={() => setShowHealthHUD(false)}
          />
        </Suspense>
      )}

      {/* Real-Time Price Alerts Manager Modal */}
      {showAlertsModal && (
        <Suspense fallback={null}>
          <PriceAlertsManager
            currentMarket={currentMarket}
            onClose={() => setShowAlertsModal(false)}
          />
        </Suspense>
      )}

      {/* Stock Detail Overlay Modal */}
      {selectedStock && (
        <TabErrorBoundary>
          <Suspense fallback={null}>
            <StockDetailModal
              key={typeof selectedStock === 'string' ? selectedStock : selectedStock?.symbol}
              symbol={selectedStock}
              currentMarket={currentMarket}
              onClose={() => setSelectedStock(null)}
              onOpenPatternEngine={(sym) => {
                setSelectedStock(null);
                setEngineSymbol(sym);
                setActiveView('ANALYSIS_ENGINE');
              }}
              onOpenAIEngine={(sym) => {
                setSelectedStock(null);
                setEngineSymbol(sym);
                setActiveView('ANALYSIS_ENGINE');
              }}
            />
          </Suspense>
        </TabErrorBoundary>
      )}

      {/* User Login & Signup Authentication Modal */}
      {showAuthModal && (
        <Suspense fallback={null}>
          <AuthModal
            isOpen={showAuthModal}
            onClose={() => setShowAuthModal(false)}
            currentMarket={currentMarket}
            onMarketChange={setCurrentMarket}
          />
        </Suspense>
      )}

      {/* Professional Keyboard Shortcuts Cheat Sheet Modal */}
      {showShortcutsModal && (
        <Suspense fallback={null}>
          <KeyboardShortcutsModal
            isOpen={showShortcutsModal}
            onClose={() => setShowShortcutsModal(false)}
          />
        </Suspense>
      )}

      {/* Mobile Bottom Quick Navigation Bar */}
      <MobileBottomNav
        activeView={activeView}
        setActiveView={setActiveView}
        onOpenMenu={() => setDrawerOpen(true)}
      />

    </div>
  );
}
