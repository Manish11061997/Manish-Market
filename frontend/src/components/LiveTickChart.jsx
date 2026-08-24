import React, { useState, useEffect, useRef, useCallback } from 'react';
import { wsClient } from '../utils/WebSocketClient';
import { findTick } from '../utils/symbolMatcher';

const MAX_TICKS = 120; // keep last 120 ticks

/**
 * LiveTickChart — SVG sparkline that plots each WebSocket tick as a point.
 * Props:
 *   symbol       string   The ticker to track
 *   width        number   SVG width  (default: '100%')
 *   height       number   SVG height (default: 140)
 *   currentMarket 'IN'|'US'
 */
export default function LiveTickChart({ symbol, height = 140, currentMarket = 'IN' }) {
  const [ticks, setTicks]       = useState([]);         // array of { time, price }
  const [lastTick, setLastTick] = useState(null);
  const [flash, setFlash]       = useState(null);       // 'up' | 'down' | null
  const flashTimer              = useRef(null);
  const ticksRef                = useRef([]);
  const currPrefix              = currentMarket === 'US' ? '$' : '₹';

  useEffect(() => {
    ticksRef.current = [];
    setTicks([]);
    const subscribedSymbols = [symbol, symbol.replace('.NS', ''), `${symbol.replace('.NS', '')}.NS`];
    wsClient.subscribe(subscribedSymbols);

    const unsub = wsClient.onTick((payload) => {
      if (payload.type !== 'TICK_STREAM' || !payload.ticks) return;
      const tick = findTick(payload.ticks, symbol);
      if (!tick || tick.price === undefined) return;

      const now = Date.now();
      const prev = ticksRef.current[ticksRef.current.length - 1];
      const next = [...ticksRef.current, { time: now, price: tick.price }];
      ticksRef.current = next.length > MAX_TICKS ? next.slice(next.length - MAX_TICKS) : next;
      setTicks(ticksRef.current);

      // Detect direction for flash (outside the state updater)
      if (prev && tick.price !== prev.price) {
        setFlash(tick.price > prev.price ? 'up' : 'down');
        if (flashTimer.current) clearTimeout(flashTimer.current);
        flashTimer.current = setTimeout(() => setFlash(null), 700);
      }

      setLastTick(tick);
    });

    return () => {
      unsub();
      wsClient.unsubscribe(subscribedSymbols);
      if (flashTimer.current) clearTimeout(flashTimer.current);
    };
  }, [symbol]);

  // ── SVG drawing ──────────────────────────────────────────────────────────
  const svgRef = useRef(null);
  const [svgWidth, setSvgWidth] = useState(400);

  useEffect(() => {
    if (!svgRef.current) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        setSvgWidth(entry.contentRect.width);
      }
    });
    ro.observe(svgRef.current);
    return () => ro.disconnect();
  }, []);

  const padTop    = 18;
  const padBottom = 22;
  const padLeft   = 8;
  const padRight  = 8;
  const innerW    = svgWidth - padLeft - padRight;
  const innerH    = height - padTop - padBottom;

  const computePath = useCallback(() => {
    if (ticks.length < 2) return { linePath: '', areaPath: '', points: [], min: 0, max: 0 };

    const prices = ticks.map(t => t.price);
    let min = Math.min(...prices);
    let max = Math.max(...prices);

    // Ensure visible range even when price is flat
    if (max === min) { min *= 0.998; max *= 1.002; }

    const xOf = (i) => padLeft + (i / (ticks.length - 1)) * innerW;
    const yOf = (p) => padTop  + innerH - ((p - min) / (max - min)) * innerH;

    const points = ticks.map((t, i) => ({ x: xOf(i), y: yOf(t.price), price: t.price }));

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const areaPath = `${linePath} L${points[points.length - 1].x.toFixed(1)},${(padTop + innerH).toFixed(1)} L${padLeft.toFixed(1)},${(padTop + innerH).toFixed(1)} Z`;

    return { linePath, areaPath, points, min, max };
  }, [ticks, innerW, innerH, padTop, padLeft]);

  const { linePath, areaPath, points, min, max } = computePath();
  const lastPoint  = points[points.length - 1];
  const isPositive = ticks.length > 1 ? ticks[ticks.length - 1].price >= ticks[0].price : true;

  const lineColor  = isPositive ? 'var(--accent-green)' : 'var(--accent-red)';
  const lineColorH = isPositive ? 'var(--accent-green)' : 'var(--danger-bright)';

  const gradId = `tick-grad-${symbol.replace(/\W/g, '_')}`;

  return (
    <div style={{
      backgroundColor: 'var(--bg-elevated)',
      borderRadius: '16px',
      border: `1px solid ${flash === 'up' ? 'var(--accent-green-border)' : flash === 'down' ? 'var(--accent-red-border)' : 'var(--border-subtle)'}`,
      padding: '14px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      transition: 'border-color 0.3s ease',
    }}>

      {/* Header Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Live pulse dot */}
          <span style={{
            width: '7px', height: '7px', borderRadius: '50%',
            backgroundColor: flash
              ? (flash === 'up' ? 'var(--accent-green)' : 'var(--accent-red)')
              : 'var(--accent-blue)',
            boxShadow: flash
              ? `0 0 8px ${flash === 'up' ? 'var(--accent-green)' : 'var(--accent-red)'}`
              : '0 0 6px var(--accent-blue)',
            display: 'inline-block',
            animation: 'pulse 1.5s infinite',
            transition: 'background-color 0.2s ease, box-shadow 0.2s ease',
          }} />
          <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '0.02em' }}>
            {symbol}
          </span>
          <span style={{
            fontSize: '11px', fontWeight: 700, padding: '1px 5px', borderRadius: '4px',
            backgroundColor: 'rgba(41,121,255,0.15)',
            color: 'var(--accent-blue)',
            border: '1px solid rgba(41,121,255,0.3)',
            letterSpacing: '0.04em',
          }}>
            LIVE TICK
          </span>
        </div>

        {lastTick && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span className="mono-num" style={{
              fontSize: '18px', fontWeight: 800,
              color: flash === 'up' ? 'var(--accent-green)' : flash === 'down' ? 'var(--accent-red)' : 'var(--text-main)',
              transition: 'color 0.3s ease',
            }}>
              {currPrefix}{Number(lastTick.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="mono-num" style={{
              fontSize: '11px', fontWeight: 700,
              color: lastTick.changePercent >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
            }}>
              {lastTick.changePercent >= 0 ? '▲' : '▼'} {Number(lastTick.changePercent ?? 0).toFixed(2)}%
            </span>
          </div>
        )}
      </div>

      {/* SVG Chart */}
      <div ref={svgRef} style={{ width: '100%' }}>
        {ticks.length < 2 ? (
          <div style={{
            height: `${height}px`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            fontSize: '12px',
            flexDirection: 'column',
            gap: '8px',
          }}>
            <div style={{
              width: '24px', height: '24px',
              border: '2px solid var(--accent-blue)',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }} />
            <span>Waiting for live ticks…</span>
          </div>
        ) : (
          <svg
            width="100%"
            height={height}
            viewBox={`0 0 ${svgWidth} ${height}`}
            style={{ display: 'block', overflow: 'visible' }}
          >
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={lineColorH} stopOpacity="0.25" />
                <stop offset="100%" stopColor={lineColorH} stopOpacity="0.01" />
              </linearGradient>
              {/* Glow filter for live dot */}
              <filter id={`glow-${symbol.replace(/\W/g, '_')}`}>
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            {/* Area fill */}
            <path d={areaPath} fill={`url(#${gradId})`} />

            {/* Line */}
            <path
              d={linePath}
              fill="none"
              stroke={lineColor}
              strokeWidth="1.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {/* Price labels on Y axis */}
            {[min, (min + max) / 2, max].map((val, i) => {
              const y = i === 0 ? padTop + innerH : i === 1 ? padTop + innerH / 2 : padTop;
              return (
                <text
                  key={i}
                  x={svgWidth - padRight - 2}
                  y={y + (i === 0 ? -3 : i === 1 ? 4 : 11)}
                  textAnchor="end"
                  fontSize="9"
                  fill="var(--text-muted)"
                  fontFamily="monospace"
                >
                  {currPrefix}{Number(val).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </text>
              );
            })}

            {/* Tick count label */}
            <text x={padLeft} y={padTop - 4} fontSize="9" fill="var(--text-muted)" fontFamily="monospace">
              {ticks.length} ticks
            </text>

            {/* Live dot with glow — the "point" the user asked for */}
            {lastPoint && (
              <>
                {/* Outer ring */}
                <circle
                  cx={lastPoint.x}
                  cy={lastPoint.y}
                  r="6"
                  fill="none"
                  stroke={lineColor}
                  strokeWidth="1"
                  strokeOpacity="0.4"
                  style={{ animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite' }}
                />
                {/* Core dot */}
                <circle
                  cx={lastPoint.x}
                  cy={lastPoint.y}
                  r="3.5"
                  fill={lineColor}
                  filter={`url(#glow-${symbol.replace(/\W/g, '_')})`}
                />
              </>
            )}

            {/* Vertical crosshair line at last tick */}
            {lastPoint && (
              <line
                x1={lastPoint.x}
                y1={padTop}
                x2={lastPoint.x}
                y2={padTop + innerH}
                stroke={lineColor}
                strokeWidth="0.5"
                strokeDasharray="3,3"
                strokeOpacity="0.35"
              />
            )}

            {/* Baseline */}
            <line
              x1={padLeft}
              y1={padTop + innerH}
              x2={svgWidth - padRight}
              y2={padTop + innerH}
              stroke="var(--border-subtle)"
              strokeWidth="0.5"
            />
          </svg>
        )}
      </div>

      {/* Footer: tick stats */}
      {ticks.length >= 2 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11px',
          color: 'var(--text-muted)',
          borderTop: '1px solid var(--border-subtle)',
          paddingTop: '8px',
        }}>
          <span className="mono-num">
            Range: {currPrefix}{Number(min).toFixed(2)} – {currPrefix}{Number(max).toFixed(2)}
          </span>
          <span className="mono-num">
            {ticks.length} / {MAX_TICKS} ticks streamed
          </span>
          <span className="mono-num" style={{
            color: isPositive ? 'var(--accent-green)' : 'var(--accent-red)',
            fontWeight: 700,
          }}>
            Session Δ: {isPositive ? '+' : ''}{(ticks[ticks.length - 1].price - ticks[0].price).toFixed(2)}
          </span>
        </div>
      )}
    </div>
  );
}
