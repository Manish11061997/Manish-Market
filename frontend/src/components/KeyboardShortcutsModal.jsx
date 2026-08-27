import React, { useEffect } from 'react';
import { X, Command, Search, TrendingUp, Minus, MoveRight, Square, RotateCcw, Trash2, Globe, Bell, Sliders, Activity, HelpCircle } from 'lucide-react';

export default function KeyboardShortcutsModal({ isOpen, onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const modKey = isMac ? '⌘' : 'Ctrl';

  const shortcutSections = [
    {
      title: 'Global Navigation & Search',
      icon: <Globe style={{ width: '16px', height: '16px', color: 'var(--accent-blue)' }} />,
      shortcuts: [
        { keys: [`${modKey}`, 'K'], fallback: '/', label: 'Global Stock & Symbol Search' },
        { keys: ['Esc'], label: 'Close Active Modal / Exit Tool / Reset Search' },
        { keys: ['?'], fallback: `${modKey}+/`, label: 'Toggle Keyboard Shortcuts Guide' },
        { keys: [`${modKey}`, 'M'], fallback: 'Alt+M', label: 'Toggle Market (NSE / BSE ↔ US Markets)' },
        { keys: ['Alt', '1'], fallback: '1', label: 'Go to Recommendations / Home' },
        { keys: ['Alt', '2'], fallback: '2', label: 'Go to Stock Screener' },
        { keys: ['Alt', '3'], fallback: '3', label: 'Go to AI Analysis & Backtester' },
        { keys: ['Alt', '4'], fallback: '4', label: 'Go to Paper Trading Hub' },
        { keys: ['Alt', '5'], fallback: '5', label: 'Go to Daily Advisory & IPO Hub' },
        { keys: ['Alt', '6'], fallback: '6', label: 'Open AI Copilot Chat' },
        { keys: ['Alt', 'A'], label: 'Open Price Alerts Manager' },
        { keys: ['Alt', 'B'], label: 'Open Broker & API Settings' },
        { keys: ['Alt', 'H'], label: 'Open Live Stream Health & Telemetry' }
      ]
    },
    {
      title: 'Chart Timeframes & Viewport',
      icon: <TrendingUp style={{ width: '16px', height: '16px', color: 'var(--accent-green)' }} />,
      shortcuts: [
        { keys: ['1'], label: '1-Minute Timeframe (1m)' },
        { keys: ['2'], label: '5-Minute Timeframe (5m)' },
        { keys: ['3'], label: '15-Minute Timeframe (15m)' },
        { keys: ['4'], label: '1-Hour Timeframe (1h)' },
        { keys: ['5'], fallback: 'D', label: '1-Day Timeframe (1D Daily)' },
        { keys: ['W'], label: '1-Week Timeframe (1W Weekly)' },
        { keys: ['F'], fallback: 'Alt+F', label: 'Expand / Collapse Fullscreen Chart' },
        { keys: ['R'], label: 'Reset Chart Zoom & Fit Content' }
      ]
    },
    {
      title: 'Professional Chart Drawing Suite',
      icon: <Square style={{ width: '16px', height: '16px', color: 'var(--accent-gold)' }} />,
      shortcuts: [
        { keys: ['T'], label: 'Trendline Tool (Click point 1 ➔ point 2)' },
        { keys: ['L'], fallback: 'H', label: 'Horizontal Level Tool (Price Support / Resistance)' },
        { keys: ['Y'], label: 'Extended Trend Ray Tool' },
        { keys: ['B'], label: 'Supply / Demand Zone Box Tool' },
        { keys: [`${modKey}`, 'Z'], fallback: 'U', label: 'Undo Last Drawing' },
        { keys: ['Del'], fallback: 'Backspace', label: 'Clear All Active Drawings' }
      ]
    }
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(4, 7, 13, 0.82)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '720px',
          maxHeight: '90vh',
          backgroundColor: '#090d16',
          border: '1px solid var(--md-sys-color-outline-variant)',
          borderRadius: '16px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.85), 0 0 40px rgba(56, 189, 248, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            backgroundColor: 'rgba(255, 255, 255, 0.02)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'rgba(56, 189, 248, 0.12)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-blue)'
              }}
            >
              <Command style={{ width: '18px', height: '18px' }} />
            </div>
            <div>
              <h2 id="shortcuts-modal-title" style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                Professional Keyboard Shortcuts
              </h2>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
                Boost your workflow with pro key combinations
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close shortcuts dialog"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X style={{ width: '18px', height: '18px' }} />
          </button>
        </div>

        {/* Shortcuts Body */}
        <div
          style={{
            padding: '20px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}
        >
          {shortcutSections.map((section, sIdx) => (
            <div key={sIdx} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '6px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                {section.icon}
                <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {section.title}
                </span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                  gap: '8px'
                }}
              >
                {section.shortcuts.map((sc, scIdx) => (
                  <div
                    key={scIdx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.05)'
                    }}
                  >
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {sc.label}
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {sc.keys.map((k, kIdx) => (
                        <kbd
                          key={kIdx}
                          style={{
                            padding: '2px 7px',
                            borderRadius: '5px',
                            backgroundColor: 'rgba(255, 255, 255, 0.08)',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            color: 'var(--accent-blue)',
                            fontSize: '11px',
                            fontWeight: 800,
                            fontFamily: 'JetBrains Mono, monospace',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                          }}
                        >
                          {k}
                        </kbd>
                      ))}
                      {sc.fallback && (
                        <>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>or</span>
                          <kbd
                            style={{
                              padding: '2px 7px',
                              borderRadius: '5px',
                              backgroundColor: 'rgba(255, 255, 255, 0.05)',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              color: 'var(--text-muted)',
                              fontSize: '10px',
                              fontWeight: 700,
                              fontFamily: 'JetBrains Mono, monospace'
                            }}
                          >
                            {sc.fallback}
                          </kbd>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: 'var(--text-muted)'
          }}
        >
          <span>Press <kbd style={{ padding: '1px 5px', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', color: 'var(--text-main)' }}>Esc</kbd> to dismiss this dialog anytime</span>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '5px 14px',
              borderRadius: '8px',
              backgroundColor: 'var(--accent-blue)',
              color: '#090d16',
              border: 'none',
              fontSize: '11px',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
