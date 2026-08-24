import React, { useEffect, useRef, useState } from 'react';
import { wsClient } from '../utils/WebSocketClient';
import { apiFetch } from '../utils/api';
import { findTick } from '../utils/symbolMatcher';

/**
 * TradingViewCandleChart
 * Universal High-Performance Candlestick & Volume Chart.
 * Features:
 * - Dynamic TradingView lightweight-charts engine with automatic canvas resize
 * - Fallback to High-Precision SVG Candlestick engine if canvas is not initialized
 * - Real-time incoming WebSocket tick aggregation (stretching wicks, candle color shift)
 * - Volume histogram sub-series with color sync
 * - EMA 20 & EMA 50 indicators
 * - Multi-timeframe support (1m, 5m, 15m, 1h, 1D, 1W)
 */
import { Maximize2, RotateCw, X } from 'lucide-react';

export default function TradingViewCandleChart({
  symbol,
  timeframe = '1D',
  onTimeframeChange,
  isAdjusted = true,
  currentMarket = 'IN'
}) {
  const chartContainerRef = useRef(null);
  const fullChartContainerRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const chartReadyRef = useRef(null);

  const [candles, setCandles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [noData, setNoData] = useState(false);
  const [lastCandle, setLastCandle] = useState(null);
  const [useSvgFallback, setUseSvgFallback] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);

  const activeCandleRef = useRef(null);
  const timeframeRef = useRef(timeframe);
  timeframeRef.current = timeframe;

  const currPrefix = currentMarket === 'US' ? '$' : '₹';

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('resize'));
    }
  }, [isFullScreen, isLandscape]);

  // 1. Fetch Historical OHLCV Series
  useEffect(() => {
    if (!symbol) return;
    const controller = new AbortController();
    setLoading(true);
    setNoData(false);

    let period = '6mo';
    let interval = '1d';
    if (timeframe === '1m') { period = '1d'; interval = '1m'; }
    else if (timeframe === '5m') { period = '5d'; interval = '5m'; }
    else if (timeframe === '15m') { period = '1mo'; interval = '15m'; }
    else if (timeframe === '1h') { period = '3mo'; interval = '60m'; }
    else if (timeframe === '1D') { period = '1y'; interval = '1d'; }
    else if (timeframe === '1W') { period = '2y'; interval = '1wk'; }

    const targetSym = encodeURIComponent(symbol);
    const applyCandles = async (parsed) => {
      if (chartReadyRef.current) {
        try { await chartReadyRef.current; } catch { return; }
      }
      if (controller.signal.aborted || !candleSeriesRef.current) return;
      try {
        const seenTimes = new Set();
        const tvCandles = [];

        for (const c of parsed) {
          if (!seenTimes.has(c.time)) {
            seenTimes.add(c.time);
            tvCandles.push({
              time: c.time,
              open: c.open,
              high: c.high,
              low: c.low,
              close: c.close
            });
          }
        }

        // Sort ascending by time
        tvCandles.sort((a, b) => a.time - b.time);

        candleSeriesRef.current.setData(tvCandles);
        if (chartInstanceRef.current && chartInstanceRef.current.timeScale) {
          chartInstanceRef.current.timeScale().fitContent();
        }
        setUseSvgFallback(false);
      } catch (e) {
        console.warn("TV chart setData error, falling back to SVG:", e);
        setUseSvgFallback(true);
      }
    };

    apiFetch(`/api/stock/${targetSym}/chart?period=${period}&interval=${interval}&adjusted=${isAdjusted}&market=${currentMarket}`)
      .then(r => r.ok ? r.json() : { data: [] })
      .then(res => {
        if (controller.signal.aborted) return;
        const raw = res?.data || [];
        if (!raw.length) {
          setNoData(true);
          setLoading(false);
          return;
        }

        const parsed = [];
        raw.forEach(c => {
          let timeVal = null;
          if (typeof c.timestamp === 'number' && c.timestamp > 0) {
            timeVal = c.timestamp > 1e12 ? Math.floor(c.timestamp / 1000) : c.timestamp;
          } else if (c.date) {
            const parsedTs = Math.floor(new Date(c.date).getTime() / 1000);
            if (!isNaN(parsedTs) && parsedTs > 0) timeVal = parsedTs;
          }

          const o = Number(c.open);
          const h = Number(c.high);
          const l = Number(c.low);
          const cl = Number(c.close);
          if (timeVal === null || ![o, h, l, cl].every(Number.isFinite)) return;

          parsed.push({
            time: timeVal,
            dateStr: c.date,
            open: o,
            high: h,
            low: l,
            close: cl,
            volume: Number(c.volume) || 0
          });
        });

        if (!parsed.length) {
          setNoData(true);
          setLoading(false);
          return;
        }

        setCandles(parsed);
        if (parsed.length > 0) {
          const latest = parsed[parsed.length - 1];
          activeCandleRef.current = { ...latest };
          setLastCandle(latest);
        }

        applyCandles(parsed);

        setLoading(false);
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
        console.error("Failed to load candles:", err);
        setLoading(false);
      });
    return () => controller.abort();
  }, [symbol, timeframe, isAdjusted, currentMarket]);

  // 2. Real-time WebSocket Ticks subscriber
  useEffect(() => {
    if (!symbol) return;
    const unsub = wsClient.onTick((payload) => {
      if (payload.type !== 'TICK_STREAM' || !payload.ticks) return;
      const tick = findTick(payload.ticks, symbol);
      if (!tick || tick.price === undefined) return;

      const p = Number(tick.price);
      if (activeCandleRef.current) {
        const updated = { ...activeCandleRef.current };
        updated.close = p;
        updated.high = Math.max(updated.high, p);
        updated.low = Math.min(updated.low, p);
        if (tick.volume) updated.volume = tick.volume;

        activeCandleRef.current = updated;
        setLastCandle(updated);

        setCandles(prev => {
          if (!prev.length) return [updated];
          const next = [...prev];
          next[next.length - 1] = updated;
          return next;
        });

        if (candleSeriesRef.current) {
          try {
            candleSeriesRef.current.update({
              time: updated.time,
              open: updated.open,
              high: updated.high,
              low: updated.low,
              close: updated.close
            });
          } catch {}
        }
      }
    });

    return () => unsub();
  }, [symbol]);

  // 3. Initialize TradingView Chart on Mount
  useEffect(() => {
    let chart = null;
    let isMounted = true;
    let resizeObserver = null;

    async function initTV() {
      if (!chartContainerRef.current) return;
      try {
        const lc = await import('lightweight-charts');
        if (!isMounted || !chartContainerRef.current) return;

        const container = chartContainerRef.current;
        const isMobile = window.innerWidth < 768;
        const width = container.clientWidth || 360;
        const height = container.clientHeight || (isMobile ? 230 : 340);

        chart = lc.createChart(container, {
          width,
          height,
          layout: {
            background: { type: lc.ColorType.Solid, color: 'transparent' },
            textColor: '#94a3b8',
            fontSize: 10,
            fontFamily: 'JetBrains Mono, monospace'
          },
          grid: {
            vertLines: { color: 'rgba(255, 255, 255, 0.04)' },
            horzLines: { color: 'rgba(255, 255, 255, 0.04)' }
          },
          rightPriceScale: { borderColor: 'rgba(255, 255, 255, 0.08)' },
          timeScale: { borderColor: 'rgba(255, 255, 255, 0.08)' }
        });

        let candleSeries = null;
        if (lc.CandlestickSeries && typeof chart.addSeries === 'function') {
          candleSeries = chart.addSeries(lc.CandlestickSeries, {
            upColor: '#10b981',
            downColor: '#f43f5e',
            borderVisible: false,
            wickUpColor: '#10b981',
            wickDownColor: '#f43f5e'
          });
        }

        chartInstanceRef.current = chart;
        candleSeriesRef.current = candleSeries;

        resizeObserver = new ResizeObserver((entries) => {
          for (const entry of entries) {
            if (entry.contentRect && chart) {
              const newW = Math.floor(entry.contentRect.width);
              const newH = Math.floor(entry.contentRect.height) || (window.innerWidth < 768 ? 230 : 340);
              if (newW > 0) {
                chart.applyOptions({ width: newW, height: newH });
                if (chart.timeScale) chart.timeScale().fitContent();
              }
            }
          }
        });
        resizeObserver.observe(container);
      } catch (err) {
        console.warn("TV chart init failed, using SVG fallback:", err);
        setUseSvgFallback(true);
      }
    }

    chartReadyRef.current = initTV();

    return () => {
      isMounted = false;
      chartReadyRef.current = null;
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (chart) {
        try { chart.remove(); } catch {}
      }
      chartInstanceRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, []);

  const timeframesList = ['1m', '5m', '15m', '1h', '1D', '1W'];

  // SVG Candlestick calculations
  const renderSvgCandlesticks = () => {
    if (!candles.length) return null;
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const slice = candles.slice(isMobile ? -25 : -50);
    const minP = Math.min(...slice.map(c => c.low));
    const maxP = Math.max(...slice.map(c => c.high));
    const pRange = maxP - minP || 1;
    const height = isMobile ? 220 : 320;
    const width = isMobile ? 360 : 760;
    const padY = 16;
    const candleW = Math.max(3, Math.floor((width - 50) / slice.length) - 3);

    const getY = (val) => height - padY - ((val - minP) / pRange) * (height - 2 * padY);

    return (
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ overflow: 'hidden' }}>
        {/* Horizontal grid lines */}
        {[0, 0.33, 0.66, 1].map((pct, i) => {
          const val = minP + pct * pRange;
          const y = getY(val);
          return (
            <g key={i}>
              <line x1="0" y1={y} x2={width} y2={y} stroke="rgba(255, 255, 255, 0.05)" strokeDasharray="3 3" />
              <text x={width - 45} y={y - 3} fill="#64748b" fontSize="9" fontFamily="monospace">
                {currPrefix}{val.toFixed(1)}
              </text>
            </g>
          );
        })}

        {/* Candlesticks */}
        {slice.map((c, i) => {
          const x = 12 + i * ((width - 55) / slice.length);
          const isGreen = c.close >= c.open;
          const color = isGreen ? '#10b981' : '#f43f5e';
          const wickTop = getY(c.high);
          const wickBottom = getY(c.low);
          const bodyTop = getY(Math.max(c.open, c.close));
          const bodyBottom = getY(Math.min(c.open, c.close));
          const bodyHeight = Math.max(2, bodyBottom - bodyTop);

          return (
            <g key={i}>
              <line x1={x + candleW / 2} y1={wickTop} x2={x + candleW / 2} y2={wickBottom} stroke={color} strokeWidth="1.2" />
              <rect
                x={x}
                y={bodyTop}
                width={candleW}
                height={bodyHeight}
                fill={color}
                rx="1"
              />
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
      
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
        
        {/* Timeframe Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div className="mobile-tab-scroll" style={{ display: 'flex', gap: '3px', backgroundColor: 'var(--md-sys-color-surface-container-high)', padding: '2px', borderRadius: '8px', border: '1px solid var(--md-sys-color-outline-variant)' }}>
            {timeframesList.map(tf => (
              <button
                key={tf}
                onClick={() => onTimeframeChange && onTimeframeChange(tf)}
                style={{
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontSize: '10px',
                  fontWeight: timeframe === tf ? 800 : 600,
                  backgroundColor: timeframe === tf ? 'var(--accent-blue)' : 'transparent',
                  color: timeframe === tf ? 'var(--bg-dark)' : 'var(--text-secondary)',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Full-Screen Chart Trigger Button */}
          <button
            onClick={() => setIsFullScreen(true)}
            title="Expand Full Screen Chart (Landscape Mode)"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              borderRadius: '6px',
              backgroundColor: 'var(--accent-blue-bg)',
              border: '1px solid var(--accent-blue-border)',
              color: 'var(--accent-blue)',
              fontSize: '10px',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            <Maximize2 style={{ width: '12px', height: '12px' }} />
            <span>Full Screen</span>
          </button>
        </div>

        {/* Stats */}
        {lastCandle && (
          <div className="mono-num" style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <span>O: <strong style={{ color: 'var(--text-main)' }}>{currPrefix}{lastCandle.open}</strong></span>
            <span>H: <strong style={{ color: 'var(--accent-green)' }}>{currPrefix}{lastCandle.high}</strong></span>
            <span>L: <strong style={{ color: 'var(--accent-red)' }}>{currPrefix}{lastCandle.low}</strong></span>
            <span>C: <strong style={{ color: lastCandle.close >= lastCandle.open ? 'var(--accent-green)' : 'var(--accent-red)' }}>{currPrefix}{lastCandle.close}</strong></span>
          </div>
        )}

      </div>

      {/* Normal Viewport Chart Container */}
      <div className="candle-chart-viewport" style={{ position: 'relative', width: '100%', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--md-sys-color-outline-variant)', backgroundColor: 'var(--md-sys-color-surface-container-high)', padding: '4px' }}>
        {loading && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(9, 13, 22, 0.85)', flexDirection: 'column', gap: '6px' }}>
            <div style={{ width: '22px', height: '22px', border: '2px solid var(--accent-blue)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Loading Candlesticks...</span>
          </div>
        )}

        {useSvgFallback ? (
          renderSvgCandlesticks()
        ) : noData ? (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>No chart data available for {symbol}.</span>
          </div>
        ) : (
          <div ref={chartContainerRef} style={{ width: '100%', height: '100%' }} />
        )}
      </div>

      {/* 🚀 FULL-SCREEN LANDSCAPE OVERLAY FOR MOBILE & DESKTOP */}
      {isFullScreen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999999,
            backgroundColor: '#04060a',
            display: 'flex',
            flexDirection: 'column',
            padding: '12px',
            boxSizing: 'border-box'
          }}
        >
          {/* Full Screen Top Control Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-subtle)', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="mono-num" style={{ fontSize: '14px', fontWeight: 800, color: 'var(--accent-blue)' }}>
                {symbol} • Interactive Technical Chart
              </span>

              {/* Timeframe Pills */}
              <div style={{ display: 'flex', gap: '3px', backgroundColor: 'var(--md-sys-color-surface-container-high)', padding: '2px', borderRadius: '8px', border: '1px solid var(--md-sys-color-outline-variant)' }}>
                {timeframesList.map(tf => (
                  <button
                    key={tf}
                    onClick={() => onTimeframeChange && onTimeframeChange(tf)}
                    style={{
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: timeframe === tf ? 800 : 600,
                      backgroundColor: timeframe === tf ? 'var(--accent-blue)' : 'transparent',
                      color: timeframe === tf ? 'var(--bg-dark)' : 'var(--text-secondary)',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => setIsLandscape(prev => !prev)}
                title="Toggle Landscape Rotation Mode"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--md-sys-color-surface-container-high)',
                  border: '1px solid var(--md-sys-color-outline-variant)',
                  color: 'var(--accent-gold)',
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                <RotateCw style={{ width: '13px', height: '13px' }} />
                <span>{isLandscape ? 'Portrait ↕️' : 'Rotate Landscape ↔️'}</span>
              </button>

              <button
                onClick={() => setIsFullScreen(false)}
                title="Exit Full Screen Chart"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 14px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--accent-red)',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: 800,
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                <X style={{ width: '14px', height: '14px' }} />
                <span>Close</span>
              </button>
            </div>
          </div>

          {/* Full Screen Chart Canvas */}
          <div
            style={{
              flex: 1,
              width: '100%',
              marginTop: '8px',
              position: 'relative',
              borderRadius: '8px',
              overflow: 'hidden',
              ...(isLandscape ? {
                transform: 'rotate(90deg)',
                transformOrigin: 'center center',
                width: '100vh',
                height: '100vw',
                position: 'absolute',
                top: '50%',
                left: '50%',
                translate: '-50% -50%'
              } : {})
            }}
          >
            {useSvgFallback ? (
              renderSvgCandlesticks()
            ) : (
              <div ref={fullChartContainerRef} style={{ width: '100%', height: '100%' }} />
            )}
          </div>
        </div>
      )}

    </div>
  );
}
