import React from 'react';
import { Activity, TrendingUp, TrendingDown, Layers, DollarSign } from 'lucide-react';

function MarketBreadthBar({ breadthData, currentMarket = 'IN' }) {
  if (!breadthData) return null;

  const {
    advances = 0,
    declines = 0,
    unchanged = 0,
    adRatio = 1.0,
    new52wHighs = 0,
    new52wLows = 0,
    vix = { price: 13.85, pChange: -2.94, symbol: 'INDIAVIX' },
    institutionalFlow = { fiiNet: 1420.5, diiNet: 980.2, netInstitutionalSentiment: 'NET_BUYERS' }
  } = breadthData;

  const total = advances + declines + unchanged || 1;
  const advPct = Math.round((advances / total) * 100);
  const decPct = Math.round((declines / total) * 100);
  const currPrefix = currentMarket === 'US' ? '$' : '₹';
  const flowUnit = currentMarket === 'US' ? 'M' : 'Cr';

  return (
    <div className="breadth-bar-container" style={{
      backgroundColor: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border-subtle)',
      padding: '8px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '16px',
      flexWrap: 'wrap',
      fontSize: '11px',
      maxWidth: '100vw',
      boxSizing: 'border-box'
    }}>
      {/* Left: Advances / Declines Ratio Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: 'var(--text-secondary)' }}>
          <Layers style={{ width: '13px', height: '13px', color: 'var(--accent-blue)' }} />
          <span>Market Breadth:</span>
        </div>

        {/* Visual Bar Ratio */}
        <div style={{
          display: 'flex',
          width: '120px',
          height: '8px',
          borderRadius: '4px',
          overflow: 'hidden',
          backgroundColor: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)'
        }}>
          <div style={{ width: `${advPct}%`, backgroundColor: 'var(--accent-green)', transition: 'width 0.3s ease' }} title={`Advancers: ${advances} (${advPct}%)`}></div>
          <div style={{ width: `${decPct}%`, backgroundColor: 'var(--accent-red)', transition: 'width 0.3s ease' }} title={`Decliners: ${declines} (${decPct}%)`}></div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
          <span style={{ color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: '2px' }}>
            <TrendingUp style={{ width: '12px', height: '12px' }} /> {advances} Adv
          </span>
          <span style={{ color: 'var(--accent-red)', display: 'flex', alignItems: 'center', gap: '2px' }}>
            <TrendingDown style={{ width: '12px', height: '12px' }} /> {declines} Dec
          </span>
          <span className="mono-num" style={{ color: 'var(--text-muted)' }}>
            (A/D: <strong style={{ color: adRatio >= 1 ? 'var(--accent-green)' : 'var(--accent-red)' }}>{adRatio}</strong>)
          </span>
        </div>
      </div>

      {/* Center: 52-Week Highs / Lows */}
      <div className="hide-on-mobile" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}>
          <span>52W Highs/Lows:</span>
          <span className="mono-num" style={{ fontWeight: 800, color: 'var(--accent-green)' }}>+{new52wHighs}</span>
          <span style={{ color: 'var(--text-muted)' }}>/</span>
          <span className="mono-num" style={{ fontWeight: 800, color: 'var(--accent-red)' }}>-{new52wLows}</span>
        </div>
      </div>

      {/* Right: Volatility Index (VIX) & Institutional Net Flow */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        
        {/* VIX Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          backgroundColor: 'var(--bg-elevated)',
          padding: '3px 8px',
          borderRadius: '6px',
          border: '1px solid var(--border-subtle)',
          whiteSpace: 'nowrap'
        }}>
          <Activity style={{ width: '12px', height: '12px', color: 'var(--accent-gold)' }} />
          <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{vix.symbol}:</span>
          <span className="mono-num" style={{ fontWeight: 800, color: 'var(--accent-gold)' }}>{vix.price}</span>
          <span className="mono-num" style={{
            fontSize: '11px',
            color: vix.pChange <= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
            fontWeight: 700
          }}>
            {vix.pChange > 0 ? '+' : ''}{vix.pChange}%
          </span>
        </div>

        {/* FII / DII Institutional Flow Badge */}
        <div className="hide-on-mobile" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          backgroundColor: 'var(--bg-elevated)',
          padding: '3px 8px',
          borderRadius: '6px',
          border: '1px solid var(--border-subtle)',
          whiteSpace: 'nowrap'
        }}>
          <DollarSign style={{ width: '12px', height: '12px', color: 'var(--accent-green)' }} />
          <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Institutions:</span>
          <span className="mono-num" style={{ fontWeight: 800, color: institutionalFlow.fiiNet >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
            FII: {currPrefix}{institutionalFlow.fiiNet > 0 ? '+' : ''}{institutionalFlow.fiiNet} {flowUnit}
          </span>
          <span style={{ color: 'var(--text-muted)' }}>|</span>
          <span className="mono-num" style={{ fontWeight: 800, color: institutionalFlow.diiNet >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
            DII: {currPrefix}{institutionalFlow.diiNet > 0 ? '+' : ''}{institutionalFlow.diiNet} {flowUnit}
          </span>
        </div>

      </div>
    </div>
  );
}

export default React.memo(MarketBreadthBar);
