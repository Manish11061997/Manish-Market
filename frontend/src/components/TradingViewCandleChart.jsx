import React, { useEffect, useRef, useState } from 'react';
import { wsClient } from '../utils/WebSocketClient';
import { apiFetch } from '../utils/api';
import { findTick } from '../utils/symbolMatcher';
import { Maximize2, Minimize2, RotateCw, X, TrendingUp, RefreshCw } from 'lucide-react';

/**
 * TradingViewCandleChart
 * High-Performance Candlestick Chart powered by TradingView lightweight-charts.
 * Supports:
 * - Real-time incoming WebSocket ticks & wick updates
 * - Multi-timeframe switching (1m, 5m, 15m, 1h, 1D, 1W)
 * - True Full-Screen & Landscape Rotation modes
 * - Resilient fallback rendering
 */
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
  const fullChartInstanceRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const fullCandleSeriesRef = useRef(null);

  const [candles, setCandles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [noData, setNoData] = useState(false);
  const [lastCandle, setLastCandle] = useState(null);
  const [useSvgFallback, setUseSvgFallback] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);

  const activeCandleRef = useRef(null);
  const currPrefix = currentMarket === 'US' ? '$' : '₹';
  const timeframesList = ['1m', '5m', '15m', '1h', '1D', '1W'];

  // Helper to format candles for lightweight-charts
  const formatTVCandles = (rawList) => {
    const seen = new Set();
    const formatted = [];
    for (const c of rawList) {
      let t = c.time;
      if (typeof t !== 'number' || t <= 0) {
        if (c.timestamp) t = c.timestamp;
        else if (c.date) t = Math.floor(new Date(c.date).getTime() / 1000);
      }
      if (!t || seen.has(t)) continue;
      seen.add(t);
      formatted.push({
        time: t,
        open: Number(c.open),
        high: Number(c.high),
        low: Number(c.low),
        close: Number(c.close)
      });
    }
    return formatted.sort((a, b) => a.time - b.time);
  };

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
        const latest = parsed[parsed.length - 1];
        activeCandleRef.current = { ...latest };
        setLastCandle(latest);

        const tvData = formatTVCandles(parsed);

        // Update normal chart
        if (candleSeriesRef.current) {
          try {
            candleSeriesRef.current.setData(tvData);
            if (chartInstanceRef.current?.timeScale) {
              chartInstanceRef.current.timeScale().fitContent();
            }
          } catch (e) {
            console.warn("Chart setData fallback:", e);
          }
        }

        // Update fullscreen chart if active
        if (fullCandleSeriesRef.current) {
          try {
            fullCandleSeriesRef.current.setData(tvData);
            if (fullChartInstanceRef.current?.timeScale) {
              fullChartInstanceRef.current.timeScale().fitContent();
            }
          } catch {}
        }

        setLoading(false);
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
        console.warn("Candles fetch notice:", err);
        setLoading(false);
      });

    return () => controller.abort();
  }, [symbol, timeframe, isAdjusted, currentMarket]);

  // 2. Real-time WebSocket Ticks
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

        const candleUpdate = {
          time: updated.time,
          open: updated.open,
          high: updated.high,
          low: updated.low,
          close: updated.close
        };

        if (candleSeriesRef.current) {
          try { candleSeriesRef.current.update(candleUpdate); } catch {}
        }
        if (fullCandleSeriesRef.current) {
          try { fullCandleSeriesRef.current.update(candleUpdate); } catch {}
        }
      }
    });

    return () => unsub();
  }, [symbol]);

  // 3. Mount Primary Regular Chart
  useEffect(() => {
    let chart = null;
    let isMounted = true;
    let resizeObserver = null;

    async function initPrimary() {
      if (!chartContainerRef.current) return;
      try {
        const lc = await import('lightweight-charts');
        if (!isMounted || !chartContainerRef.current) return;

        const container = chartContainerRef.current;
        container.innerHTML = '';

        const width = container.clientWidth || 360;
        const height = container.clientHeight || 320;

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
          crosshair: {
            mode: lc.CrosshairMode.Normal
          },
          rightPriceScale: { 
            borderColor: 'rgba(255, 255, 255, 0.08)',
            scaleMargins: { top: 0.1, bottom: 0.1 }
          },
          timeScale: { 
            borderColor: 'rgba(255, 255, 255, 0.08)',
            timeVisible: true,
            secondsVisible: false
          }
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

        if (candles.length > 0 && candleSeries) {
          candleSeries.setData(formatTVCandles(candles));
          chart.timeScale().fitContent();
        }

        resizeObserver = new ResizeObserver((entries) => {
          for (const entry of entries) {
            if (entry.contentRect && chart) {
              const newW = Math.floor(entry.contentRect.width);
              const newH = Math.floor(entry.contentRect.height) || 320;
              if (newW > 0) {
                chart.applyOptions({ width: newW, height: newH });
              }
            }
          }
        });
        resizeObserver.observe(container);
      } catch (err) {
        console.warn("Primary TV chart fallback notice:", err);
        setUseSvgFallback(true);
      }
    }

    initPrimary();

    return () => {
      isMounted = false;
      if (resizeObserver) resizeObserver.disconnect();
      if (chart) {
        try { chart.remove(); } catch {}
      }
      chartInstanceRef.current = null;
      candleSeriesRef.current = null;
    };
  }, []);

  // 4. Mount Full-Screen Chart when FullScreen is active
  useEffect(() => {
    if (!isFullScreen) {
      if (fullChartInstanceRef.current) {
        try { fullChartInstanceRef.current.remove(); } catch {}
        fullChartInstanceRef.current = null;
        fullCandleSeriesRef.current = null;
      }
      return;
    }

    let fullChart = null;
    let isMounted = true;
    let resizeObserver = null;

    async function initFullScreen() {
      if (!fullChartContainerRef.current) return;
      try {
        const lc = await import('lightweight-charts');
        if (!isMounted || !fullChartContainerRef.current) return;

        const container = fullChartContainerRef.current;
        container.innerHTML = '';

        const width = container.clientWidth || window.innerWidth;
        const height = container.clientHeight || (window.innerHeight - 60);

        fullChart = lc.createChart(container, {
          width,
          height,
          layout: {
            background: { type: lc.ColorType.Solid, color: '#090d16' },
            textColor: '#94a3b8',
            fontSize: 11,
            fontFamily: 'JetBrains Mono, monospace'
          },
          grid: {
            vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
            horzLines: { color: 'rgba(255, 255, 255, 0.05)' }
          },
          crosshair: {
            mode: lc.CrosshairMode.Normal
          },
          rightPriceScale: { 
            borderColor: 'rgba(255, 255, 255, 0.1)',
            scaleMargins: { top: 0.08, bottom: 0.08 }
          },
          timeScale: { 
            borderColor: 'rgba(255, 255, 255, 0.1)',
            timeVisible: true
          }
        });

        let candleSeries = null;
        if (lc.CandlestickSeries && typeof fullChart.addSeries === 'function') {
          candleSeries = fullChart.addSeries(lc.CandlestickSeries, {
            upColor: '#10b981',
            downColor: '#f43f5e',
            borderVisible: false,
            wickUpColor: '#10b981',
            wickDownColor: '#f43f5e'
          });
        }

        fullChartInstanceRef.current = fullChart;
        fullCandleSeriesRef.current = candleSeries;

        if (candles.length > 0 && candleSeries) {
          candleSeries.setData(formatTVCandles(candles));
          fullChart.timeScale().fitContent();
        }

        resizeObserver = new ResizeObserver((entries) => {
          for (const entry of entries) {
            if (entry.contentRect && fullChart) {
              const newW = Math.floor(entry.contentRect.width);
              const newH = Math.floor(entry.contentRect.height);
              if (newW > 0 && newH > 0) {
                fullChart.applyOptions({ width: newW, height: newH });
              }
            }
          }
        });
        resizeObserver.observe(container);
      } catch (err) {
        console.warn("FullScreen TV chart init notice:", err);
      }
    }

    const timer = setTimeout(initFullScreen, 50);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (resizeObserver) resizeObserver.disconnect();
      if (fullChart) {
        try { fullChart.remove(); } catch {}
      }
      fullChartInstanceRef.current = null;
      fullCandleSeriesRef.current = null;
    };
  }, [isFullScreen, isLandscape]);

  // SVG Fallback Renderer
  const renderSvgCandlesticks = () => {
    if (!candles.length) return null;
    const slice = candles.slice(-50);
    const minP = Math.min(...slice.map(c => c.low));
    const maxP = Math.max(...slice.map(c => c.high));
    const pRange = maxP - minP || 1;
    const height = 300;
    const width = 600;
    const padY = 16;
    const candleW = Math.max(4, Math.floor((width - 40) / slice.length) - 2);

    const getY = (val) => height - padY - ((val - minP) / pRange) * (height - 2 * padY);

    return (
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        {[0, 0.33, 0.66, 1].map((pct, i) => {
          const val = minP + pct * pRange;
          const y = getY(val);
          return (
            <g key={i}>
              <line x1="0" y1={y} x2={width} y2={y} stroke="rgba(255, 255, 255, 0.05)" strokeDasharray="3 3" />
              <text x={width - 50} y={y - 3} fill="#64748b" fontSize="9" fontFamily="monospace">
                {currPrefix}{val.toFixed(1)}
              </text>
            </g>
          );
        })}
        {slice.map((c, i) => {
          const x = 10 + i * ((width - 50) / slice.length);
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
              <rect x={x} y={bodyTop} width={candleW} height={bodyHeight} fill={color} rx="1" />
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
      
      {/* Top Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
        
        {/* Timeframe Selector Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ display: 'flex', gap: '2px', backgroundColor: 'var(--md-sys-color-surface-container-high)', padding: '2px', borderRadius: '8px', border: '1px solid var(--md-sys-color-outline-variant)' }}>
            {timeframesList.map(tf => (
              <button
                key={tf}
                type="button"
                onClick={() => onTimeframeChange && onTimeframeChange(tf)}
                style={{
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: timeframe === tf ? 800 : 600,
                  backgroundColor: timeframe === tf ? 'var(--accent-blue)' : 'transparent',
                  color: timeframe === tf ? 'var(--bg-dark)' : 'var(--text-secondary)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Full Screen Chart Trigger Button */}
          <button
            type="button"
            onClick={() => setIsFullScreen(true)}
            title="Expand Full Screen Chart"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 10px',
              borderRadius: '8px',
              backgroundColor: 'var(--accent-blue-bg)',
              border: '1px solid var(--accent-blue-border)',
              color: 'var(--accent-blue)',
              fontSize: '11px',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            <Maximize2 style={{ width: '12px', height: '12px' }} />
            <span>Full Screen</span>
          </button>
        </div>

        {/* Real-time OHLC Bar Stats */}
        {lastCandle && (
          <div className="mono-num" style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span>O: <strong style={{ color: 'var(--text-main)' }}>{currPrefix}{lastCandle.open}</strong></span>
            <span>H: <strong style={{ color: 'var(--accent-green)' }}>{currPrefix}{lastCandle.high}</strong></span>
            <span>L: <strong style={{ color: 'var(--accent-red)' }}>{currPrefix}{lastCandle.low}</strong></span>
            <span>C: <strong style={{ color: lastCandle.close >= lastCandle.open ? 'var(--accent-green)' : 'var(--accent-red)' }}>{currPrefix}{lastCandle.close}</strong></span>
          </div>
        )}

      </div>

      {/* Main Standard Chart Canvas */}
      <div 
        style={{ 
          position: 'relative', 
          width: '100%', 
          height: '340px',
          minHeight: '280px',
          borderRadius: '12px', 
          overflow: 'hidden', 
          border: '1px solid var(--md-sys-color-outline-variant)', 
          backgroundColor: '#090d16'
        }}
      >
        {loading && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(9, 13, 22, 0.85)', flexDirection: 'column', gap: '8px' }}>
            <div style={{ width: '24px', height: '24px', border: '2px solid var(--accent-blue)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Rendering Live Candlesticks...</span>
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

      {/* 🚀 FULL-SCREEN OVERLAY & LANDSCAPE VIEWPORT */}
      {isFullScreen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999999,
            backgroundColor: '#06090e',
            display: 'flex',
            flexDirection: 'column',
            padding: '12px',
            boxSizing: 'border-box'
          }}
        >
          {/* Full Screen Top Control Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="mono-num" style={{ fontSize: '15px', fontWeight: 900, color: '#38bdf8' }}>
                  {symbol}
                </span>
                {lastCandle && (
                  <span className="mono-num" style={{ fontSize: '15px', fontWeight: 800, color: lastCandle.close >= lastCandle.open ? '#10b981' : '#f43f5e' }}>
                    {currPrefix}{lastCandle.close}
                  </span>
                )}
              </div>

              {/* Timeframe Pills in Full Screen */}
              <div style={{ display: 'flex', gap: '3px', backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: '2px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                {timeframesList.map(tf => (
                  <button
                    key={tf}
                    type="button"
                    onClick={() => onTimeframeChange && onTimeframeChange(tf)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: timeframe === tf ? 800 : 600,
                      backgroundColor: timeframe === tf ? '#38bdf8' : 'transparent',
                      color: timeframe === tf ? '#000000' : '#94a3b8',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions: Rotate & Close */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setIsLandscape(prev => !prev)}
                title="Toggle Landscape Rotation Mode"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255, 184, 0, 0.1)',
                  border: '1px solid rgba(255, 184, 0, 0.3)',
                  color: '#fbbf24',
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                <RotateCw style={{ width: '13px', height: '13px' }} />
                <span>{isLandscape ? 'Portrait ↕️' : 'Rotate Landscape ↔️'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsFullScreen(false)}
                title="Exit Full Screen Chart"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 14px',
                  borderRadius: '8px',
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: 800,
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                <X style={{ width: '14px', height: '14px' }} />
                <span>Exit</span>
              </button>
            </div>
          </div>

          {/* Full Screen Chart Canvas */}
          <div
            style={{
              flex: 1,
              width: '100%',
              marginTop: '10px',
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
            <div ref={fullChartContainerRef} style={{ width: '100%', height: '100%' }} />
          </div>
        </div>
      )}

    </div>
  );
}
