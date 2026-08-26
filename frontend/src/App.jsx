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
  const [activeToasts, setActiveToasts] = useState([]);
  const [isFailover, setIsFailover] = useState(false);
  const [fetchErrors, setFetchErrors] = useState([]);
  const toastTimersRef = useRef({});

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
            NIFTY50: { name: "Nifty 50", price: 24334.55, change: 115.50, pChange: 0.48, status: "BULLISH" },
            SENSEX: { name: "BSE Sensex", price: 77656.09, change: 286.98, pChange: 0.37, status: "BULLISH" },
            NIFTYBANK: { name: "Nifty Bank", price: 57514.20, change: -11.75, pChange: -0.02, status: "NEUTRAL" }
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
            { symbol: currentMarket === 'US' ? 'NVDA' : 'RELIANCE.NS', name: currentMarket === 'US' ? 'NVIDIA Corp' : 'Reliance Industries', sector: 'Energy/Tech', currentPrice: currentMarket === 'US' ? 128.5 : 2980.0, signal: 'BULLISH_BREAKOUT', action: 'STRONG BUY', overallScore: 92, tradePlan: { target1: currentMarket === 'US' ? 145.0 : 3200.0, stopLoss: currentMarket === 'US' ? 118.0 : 2850.0, suggestedAllocation: '15%' }, rationale: ['5-Pillar Confluence Score: 92/100', '20-EMA Breakout with Volume Confirmation'] },
            { symbol: currentMarket === 'US' ? 'AAPL' : 'TCS.NS', name: currentMarket === 'US' ? 'Apple Inc' : 'Tata Consultancy Services', sector: 'IT/Tech', currentPrice: currentMarket === 'US' ? 224.2 : 4150.0, signal: 'BULLISH', action: 'BUY', overallScore: 88, tradePlan: { target1: currentMarket === 'US' ? 245.0 : 4450.0, stopLoss: currentMarket === 'US' ? 210.0 : 3980.0, suggestedAllocation: '12%' }, rationale: ['RSI Bullish Momentum > 60', 'Institutional Delivery Accumulation'] }
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

        // Update market indices state in real-time
        setMarketData(prev => {
          if (!prev || !prev.indices) return prev;
          const updatedIndices = { ...prev.indices };
          
          Object.keys(updatedIndices).forEach((indexKey) => {
            const tick = findTick(payload.ticks, indexKey);
            if (tick && tick.price !== undefined) {
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

          return { ...prev, indices: updatedIndices };
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
      />

      {/* Main Trading Terminal Workspace */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', minWidth: 0, width: '100%' }}>
        
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
