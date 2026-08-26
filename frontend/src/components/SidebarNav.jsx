import React, { useEffect, useState } from 'react';
import { Zap, TrendingUp, Sliders, MessageSquare, BarChart2, Cpu, Globe, ShieldCheck, FileText, Sparkles, Activity, Star } from 'lucide-react';
import LogoHexagon from './LogoHexagon';

const MOBILE_QUERY = '(max-width: 1024px)';

export default function SidebarNav({
  activeView,
  setActiveView,
  currentMarket,
  setCurrentMarket,
  open,
  onClose,
  onNavigate,
  onOpenHealthHUD,
  onOpenDebugHUD,
  onOpenBrokerSettings
}) {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches
  );

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    const handler = (event) => setIsMobile(event.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  const navItems = [
    { id: 'WATCHLIST', label: '⭐ Watchlist Hub', icon: Star, badge: 'HOT' },
    { id: 'DAILY_ADVISORY', label: '🌅 Daily Advisory', icon: Zap, badge: 'DAILY' },
    { id: 'IPO_HUB', label: '🚀 IPO Intelligence Hub', icon: Sparkles, badge: 'NEW' },
    { id: 'ANALYSIS_ENGINE', label: '📈 Pattern Engine', icon: TrendingUp, badge: 'PRO' },
    { id: 'PAPER_TRADING', label: 'Paper Trading & OMS', icon: ShieldCheck, badge: 'SIM' },
    { id: 'AUDIT_TRAIL', label: 'Audit Trail & Trace', icon: FileText },
    { id: 'FNO', label: 'F&O Derivatives', icon: Zap, badge: 'PRO' },
    { id: 'RECOMMENDATIONS', label: 'Equity Signals', icon: TrendingUp },
    { id: 'SCREENER', label: 'Stock Screener', icon: Sliders },
    { id: 'COPILOT', label: 'Market Assistant', icon: MessageSquare },
    { id: 'BACKTEST', label: 'Strategy Backtest', icon: BarChart2 }
  ];

  const handleNavigate = (view) => {
    setActiveView(view);
    onNavigate?.();
  };

  return (
    <>
      {isMobile && open && (
        <div
          className="sidebar-backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside className={`app-sidebar${open ? ' open' : ''}`} aria-label="Primary navigation" style={{
      width: isMobile ? '280px' : '240px',
      backgroundColor: 'var(--bg-surface)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '20px 16px',
      flexShrink: 0,
      height: '100vh',
      position: isMobile ? 'fixed' : 'sticky',
      left: isMobile ? 0 : undefined,
      top: 0,
      bottom: isMobile ? 0 : undefined,
      transform: isMobile ? (open ? 'translateX(0)' : 'translateX(-100%)') : 'none',
      transition: 'transform 0.25s cubic-bezier(0.2, 0, 0, 1)',
      zIndex: isMobile ? 1100 : 40,
      boxShadow: isMobile && open ? '4px 0 24px rgba(0,0,0,0.7)' : 'none',
      borderRadius: isMobile ? '0 28px 28px 0' : 0
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Brand Emblem */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '0 4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <LogoHexagon size={32} />
            <div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                MANISH MARKET
              </div>
              <span className="mono-num" style={{ fontSize: '10px', color: 'var(--accent-green)', fontWeight: 700, letterSpacing: '0.05em' }}>
                GLOBAL TRADING v2.0
              </span>
            </div>
          </div>

          {isMobile && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close navigation menu"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-muted)',
                width: '30px',
                height: '30px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Global Market Switcher Toggle */}
        <div style={{ backgroundColor: 'var(--bg-elevated)', padding: '6px', borderRadius: '12px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', padding: '0 4px' }}>
            <span>ACTIVE MARKET REGION</span>
            <Globe style={{ width: '12px', height: '12px', color: 'var(--accent-blue)' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
            <button
              onClick={() => setCurrentMarket('IN')}
              style={{
                padding: '6px 8px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: currentMarket === 'IN' ? 800 : 600,
                backgroundColor: currentMarket === 'IN' ? 'var(--accent-blue)' : 'transparent',
                color: currentMarket === 'IN' ? 'var(--bg-dark)' : 'var(--text-secondary)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}
            >
              <span>🇮🇳 NSE / BSE</span>
            </button>

            <button
              onClick={() => setCurrentMarket('US')}
              style={{
                padding: '6px 8px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: currentMarket === 'US' ? 800 : 600,
                backgroundColor: currentMarket === 'US' ? 'var(--accent-green)' : 'transparent',
                color: currentMarket === 'US' ? 'var(--bg-dark)' : 'var(--text-secondary)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}
            >
              <span>🇺🇸 US NYSE</span>
            </button>
          </div>
        </div>

        {/* Navigation Items */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 12px', marginBottom: '4px' }}>
            TERMINAL WORKSPACE
          </div>
          {navItems.map(item => {
            const Icon = item.icon;
            const isSelected = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 16px',
                  borderRadius: '24px',
                  border: 'none',
                  backgroundColor: isSelected ? 'var(--md-sys-color-secondary-container)' : 'transparent',
                  color: isSelected ? 'var(--md-sys-color-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: isSelected ? 800 : 600,
                  transition: 'all 0.15s ease',
                  textAlign: 'left'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Icon style={{ width: '18px', height: '18px', color: isSelected ? 'var(--md-sys-color-primary)' : 'var(--text-muted)' }} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="mono-num" style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    padding: '2px 7px',
                    borderRadius: '12px',
                    backgroundColor: isSelected ? 'var(--md-sys-color-primary)' : 'var(--bg-elevated)',
                    color: isSelected ? 'var(--md-sys-color-on-primary)' : 'var(--text-muted)',
                    border: isSelected ? 'none' : '1px solid var(--border-subtle)'
                  }}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* System Diagnostics & Utilities */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingTop: '8px', borderTop: '1px solid var(--md-sys-color-outline-variant)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 12px', marginBottom: '2px' }}>
            DIAGNOSTICS & BROKER
          </div>
          
          {onOpenHealthHUD && (
            <button
              onClick={() => {
                if (onClose) onClose();
                onOpenHealthHUD();
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '8px 16px',
                borderRadius: '20px',
                border: 'none',
                backgroundColor: 'transparent',
                color: 'var(--accent-blue)',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 700,
                transition: 'all 0.15s ease',
                textAlign: 'left'
              }}
            >
              <Activity style={{ width: '16px', height: '16px' }} />
              <span>Telemetry Health HUD</span>
            </button>
          )}

          {onOpenBrokerSettings && (
            <button
              onClick={() => {
                if (onClose) onClose();
                onOpenBrokerSettings();
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '8px 16px',
                borderRadius: '20px',
                border: 'none',
                backgroundColor: 'transparent',
                color: 'var(--accent-green)',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 700,
                transition: 'all 0.15s ease',
                textAlign: 'left'
              }}
            >
              <ShieldCheck style={{ width: '16px', height: '16px' }} />
              <span>Broker Integration APIs</span>
            </button>
          )}

          {onOpenDebugHUD && (
            <button
              onClick={() => {
                if (onClose) onClose();
                onOpenDebugHUD();
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '8px 16px',
                borderRadius: '20px',
                border: 'none',
                backgroundColor: 'transparent',
                color: 'var(--sky-info)',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 700,
                transition: 'all 0.15s ease',
                textAlign: 'left'
              }}
            >
              <Cpu style={{ width: '16px', height: '16px' }} />
              <span>Real-Time Stream Debug</span>
            </button>
          )}

          <button
            onClick={() => {
              if (onClose) onClose();
              const currentIp = localStorage.getItem('manish_market_server_ip') || '10.73.152.182';
              const input = prompt('Enter Backend Server IP Address (e.g. 10.73.152.182):', currentIp);
              if (input && input.trim()) {
                localStorage.setItem('manish_market_server_ip', input.trim());
                window.location.reload();
              }
            }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '8px 16px',
              borderRadius: '20px',
              border: 'none',
              backgroundColor: 'transparent',
              color: 'var(--accent-gold)',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 700,
              transition: 'all 0.15s ease',
              textAlign: 'left'
            }}
          >
            <Globe style={{ width: '16px', height: '16px' }} />
            <span>Configure Server IP ({localStorage.getItem('manish_market_server_ip') || '10.73.152.182'})</span>
          </button>
        </div>

      </div>

      {/* Live System Status Box */}
      <div style={{
        padding: '12px 14px',
        borderRadius: '12px',
        backgroundColor: 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: 700, color: currentMarket === 'US' ? 'var(--accent-green)' : 'var(--accent-blue)' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: currentMarket === 'US' ? 'var(--accent-green)' : 'var(--accent-blue)', boxShadow: '0 0 8px var(--accent-blue)' }}></span>
          <span className="mono-num">{currentMarket === 'US' ? 'US MARKETS LIVE' : 'NSE / BSE LIVE ACTIVE'}</span>
        </div>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.3 }}>
          Modular Quantitative Execution, Risk, & Advisory Platform.
        </p>
      </div>

    </aside>
    </>
  );
}
