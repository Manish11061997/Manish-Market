import React, { useState, useEffect, useRef, useMemo } from 'react';
import { wsClient } from '../utils/WebSocketClient';
import { findTick } from '../utils/symbolMatcher';

const INDIAN_TICKERS = [
  { symbol: 'NIFTY50',       name: 'NIFTY 50'     },
  { symbol: 'SENSEX',        name: 'SENSEX'        },
  { symbol: 'NIFTYBANK',     name: 'BANK NIFTY'   },
  { symbol: 'NIFTYIT',       name: 'NIFTY IT'     },
  { symbol: 'RELIANCE.NS',   name: 'RELIANCE'     },
  { symbol: 'TCS.NS',        name: 'TCS'          },
  { symbol: 'HDFCBANK.NS',   name: 'HDFC BANK'    },
  { symbol: 'INFY.NS',       name: 'INFOSYS'      },
  { symbol: 'ICICIBANK.NS',  name: 'ICICI BANK'   },
  { symbol: 'BHARTIARTL.NS', name: 'AIRTEL'       },
  { symbol: 'TATAMOTORS.NS', name: 'TATA MOTORS'  },
  { symbol: 'ITC.NS',        name: 'ITC'          },
  { symbol: 'SBIN.NS',       name: 'SBI'          },
  { symbol: 'LT.NS',         name: 'L&T'          },
  { symbol: 'WIPRO.NS',      name: 'WIPRO'        },
];

const US_TICKERS = [
  { symbol: 'SP500',  name: 'S&P 500'   },
  { symbol: 'NASDAQ', name: 'NASDAQ'    },
  { symbol: 'DOW',    name: 'DOW'       },
  { symbol: 'NVDA',   name: 'NVIDIA'    },
  { symbol: 'AAPL',   name: 'APPLE'     },
  { symbol: 'MSFT',   name: 'MICROSOFT' },
  { symbol: 'AMZN',   name: 'AMAZON'    },
  { symbol: 'GOOGL',  name: 'GOOGLE'    },
  { symbol: 'META',   name: 'META'      },
  { symbol: 'TSLA',   name: 'TESLA'     },
  { symbol: 'AMD',    name: 'AMD'       },
  { symbol: 'JPM',    name: 'JPMORGAN'  },
  { symbol: 'NFLX',   name: 'NETFLIX'   },
];

export default function LiveTickerTape({ currentMarket = 'IN' }) {
  const tickers = useMemo(
    () => (currentMarket === 'US' ? US_TICKERS : INDIAN_TICKERS),
    [currentMarket]
  );
  const currPrefix = currentMarket === 'US' ? '$' : '₹';

  // price map: { symbol -> { price, pChange, change, flash } }
  const [prices, setPrices] = useState({});
  const flashTimers = useRef({});

  // Subscribe and listen to WebSocket ticks
  useEffect(() => {
    const symbols = tickers.map(t => t.symbol);
    wsClient.subscribe(symbols);

    const unsub = wsClient.onTick((payload) => {
      if (payload.type !== 'TICK_STREAM' || !payload.ticks) return;

      setPrices(prev => {
        const next = { ...prev };
        let hasChanges = false;

        tickers.forEach((t) => {
          const tick = findTick(payload.ticks, t.symbol);
          if (tick && tick.price !== undefined) {
            const prevPrice = prev[t.symbol]?.price;
            let flash = null;
            if (prevPrice !== undefined && tick.price !== prevPrice) {
              flash = tick.price > prevPrice ? 'up' : 'down';
              hasChanges = true;
            } else if (prevPrice === undefined) {
              hasChanges = true;
            }

            next[t.symbol] = {
              price: tick.price,
              pChange: tick.changePercent ?? tick.pChange ?? 0,
              change: tick.change ?? 0,
              flash: flash || prev[t.symbol]?.flash || null,
            };

            // Clear flash after 600ms
            if (flash) {
              if (flashTimers.current[t.symbol]) clearTimeout(flashTimers.current[t.symbol]);
              flashTimers.current[t.symbol] = setTimeout(() => {
                setPrices(p => ({
                  ...p,
                  [t.symbol]: p[t.symbol] ? { ...p[t.symbol], flash: null } : undefined
                }));
              }, 600);
            }
          }
        });

        return hasChanges ? next : prev;
      });
    });

    return () => {
      unsub();
      wsClient.unsubscribe(symbols);
      Object.values(flashTimers.current).forEach(clearTimeout);
      flashTimers.current = {};
    };
  }, [tickers]);

  const renderItem = (ticker, idx) => {
    const data = prices[ticker.symbol];
    const pChange = data?.pChange ?? 0;
    const price   = data?.price;
    const isUp    = pChange >= 0;
    const flash   = data?.flash;

    const flashBg = flash === 'up'
      ? 'rgba(0, 230, 118, 0.22)'
      : flash === 'down'
        ? 'rgba(255, 23, 68, 0.20)'
        : 'transparent';

    return (
      <div
        key={`${ticker.symbol}-${idx}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '4px 14px 4px 12px',
          borderRight: '1px solid var(--border-subtle)',
          backgroundColor: flashBg,
          transition: 'background-color 0.25s ease',
          whiteSpace: 'nowrap',
          cursor: 'default',
          flexShrink: 0,
        }}
      >
        {/* Ticker name */}
        <span style={{
          fontSize: '11px',
          fontWeight: 700,
          color: 'var(--text-secondary)',
          letterSpacing: '0.03em',
        }}>
          {ticker.name}
        </span>

        {/* Price */}
        <span className="mono-num" style={{
          fontSize: '12px',
          fontWeight: 800,
          color: 'var(--text-main)',
        }}>
          {price !== undefined
            ? `${currPrefix}${Number(price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : '—'
          }
        </span>

        {/* Change % badge */}
        {data && data.price !== undefined && (
          <span className="mono-num" style={{
            fontSize: '11px',
            fontWeight: 800,
            padding: '1px 5px',
            borderRadius: '5px',
            backgroundColor: isUp ? 'rgba(0,230,118,0.15)' : 'rgba(255,23,68,0.15)',
            color: isUp ? 'var(--accent-green)' : 'var(--accent-red)',
            border: `1px solid ${isUp ? 'var(--accent-green-border)' : 'var(--accent-red-border)'}`,
          }}>
            {isUp ? '▲' : '▼'} {isUp ? '+' : ''}{Number(pChange).toFixed(2)}%
          </span>
        )}

        {/* Animated live dot on flash */}
        {flash && (
          <span style={{
            width: '5px',
            height: '5px',
            borderRadius: '50%',
            backgroundColor: flash === 'up' ? 'var(--accent-green)' : 'var(--accent-red)',
            boxShadow: `0 0 6px ${flash === 'up' ? 'var(--accent-green)' : 'var(--accent-red)'}`,
            animation: 'pulse 0.6s ease-out',
            flexShrink: 0,
          }} />
        )}
      </div>
    );
  };

  // Duplicate array for seamless infinite loop
  const doubled = [...tickers, ...tickers];

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '100vw',
        backgroundColor: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
        overflow: 'hidden',
        height: '34px',
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
        zIndex: 20,
      }}
    >
      {/* Fade edges */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: '48px',
        background: 'linear-gradient(to right, var(--bg-surface), transparent)',
        zIndex: 2, pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', right: 0, top: 0, bottom: 0, width: '48px',
        background: 'linear-gradient(to left, var(--bg-surface), transparent)',
        zIndex: 2, pointerEvents: 'none',
      }} />

      {/* Pure GPU-accelerated CSS Marquee Track */}
      <div className="ticker-track-animate">
        {doubled.map((ticker, idx) => renderItem(ticker, idx))}
      </div>
    </div>
  );
}
