import React from 'react';
import { Zap, Sparkles, TrendingUp, Menu, Activity } from 'lucide-react';

export default function MobileBottomNav({ activeView, setActiveView, onOpenMenu }) {
  const primaryTabs = [
    { id: 'RECOMMENDATIONS', label: 'Signals', icon: TrendingUp },
    { id: 'DAILY_ADVISORY', label: 'Advisory', icon: Zap },
    { id: 'IPO_HUB', label: 'IPO Hub', icon: Sparkles },
    { id: 'FNO', label: 'F&O', icon: Activity },
  ];

  return (
    <nav
      className="mobile-bottom-nav m3-navigation-bar"
      aria-label="Material 3 Navigation Bar"
    >
      {primaryTabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeView === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => setActiveView(tab.id)}
            className={`m3-nav-destination ${isActive ? 'active' : ''}`}
          >
            <div className="m3-indicator-pill">
              <Icon style={{ width: '18px', height: '18px', strokeWidth: isActive ? 2.5 : 2 }} />
            </div>
            <span className="m3-nav-label">{tab.label}</span>
          </button>
        );
      })}

      <button
        type="button"
        role="tab"
        aria-selected={false}
        onClick={onOpenMenu}
        className="m3-nav-destination"
        title="Open Navigation Menu"
      >
        <div className="m3-indicator-pill">
          <Menu style={{ width: '18px', height: '18px', strokeWidth: 2 }} />
        </div>
        <span className="m3-nav-label">Menu</span>
      </button>
    </nav>
  );
}
