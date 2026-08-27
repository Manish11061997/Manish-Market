import React, { useEffect, useRef, useState } from 'react';
import { wsClient } from '../utils/WebSocketClient';
import { apiFetch } from '../utils/api';
import { findTick } from '../utils/symbolMatcher';
import { Maximize2, RotateCw, X, TrendingUp, Minus, MoveRight, Square, Trash2 } from 'lucide-react';

/**
 * TradingViewCandleChart
 * High-Performance Candlestick Chart powered by TradingView lightweight-charts.
 * Synchronized with real-time websocket ticks, multi-timeframe feeds,
 * and interactive Line & Shape Drawing Tools (Trendline, Horizontal, Ray, Box).
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
  const candlesRef = useRef([]);
  const [loading, setLoading] = useState(true);
  const [noData, setNoData] = useState(false);
  const [lastCandle, setLastCandle] = useState(null);
  const [useSvgFallback, setUseSvgFallback] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);

  // Drawing Tools State
  const [activeTool, setActiveTool] = useState('NONE'); // NONE, TRENDLINE, HORIZONTAL, RAY, RECTANGLE
  const [drawings, setDrawings] = useState([]);
  const [drawingColor, setDrawingColor] = useState('#38bdf8');
  const [draftDrawing, setDraftDrawing] = useState(null);

  const colorPalette = ['#38bdf8', '#10b981', '#fbbf24', '#f43f5e', '#a855f7', '#ffffff'];

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

  // Push candles to series whenever candles update
  const syncCandlesToCharts = (candleList) => {
    if (!candleList || candleList.length === 0) return;
    const tvData = formatTVCandles(candleList);
    if (!tvData.length) return;

    if (candleSeriesRef.current) {
      try {
        candleSeriesRef.current.setData(tvData);
        if (chartInstanceRef.current?.timeScale) {
          chartInstanceRef.current.timeScale().fitContent();
        }
      } catch (e) {
        console.warn("Primary chart setData notice:", e);
      }
    }

    if (fullCandleSeriesRef.current) {
      try {
        fullCandleSeriesRef.current.setData(tvData);
        if (fullChartInstanceRef.current?.timeScale) {
          fullChartInstanceRef.current.timeScale().fitContent();
        }
      } catch (e) {
        console.warn("Fullscreen chart setData notice:", e);
      }
    }
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
        for (const item of raw) {
          let tVal = item.time || item.timestamp;
          if (typeof tVal !== 'number' || tVal <= 0) {
            tVal = Math.floor(new Date(item.date || Date.now()).getTime() / 1000);
          }
          parsed.push({
            time: tVal,
            open: Number(item.open ?? item.close),
            high: Number(item.high ?? item.close),
            low: Number(item.low ?? item.close),
            close: Number(item.close),
            volume: Number(item.volume || 0)
          });
        }

        parsed.sort((a, b) => a.time - b.time);
        candlesRef.current = parsed;
        setCandles(parsed);
        if (parsed.length > 0) {
          setLastCandle(parsed[parsed.length - 1]);
        }
        setLoading(false);

        syncCandlesToCharts(parsed);
      })
      .catch(err => {
        if (!controller.signal.aborted) {
          console.warn("OHLCV chart fetch notice:", err);
          setLoading(false);
          setUseSvgFallback(true);
        }
      });

    return () => controller.abort();
  }, [symbol, timeframe, isAdjusted, currentMarket]);

  // 2. Real-time WebSocket Tick Stream Subscription
  useEffect(() => {
    if (!symbol) return;
    const cleanSym = symbol.replace('.NS', '').trim();
    const subscribedList = [symbol, cleanSym, `${cleanSym}.NS`];
    wsClient.subscribe(subscribedList);

    const unsubscribe = wsClient.onTick((payload) => {
      if (payload.type === 'TICK_STREAM' && payload.ticks) {
        const tick = findTick(payload.ticks, symbol);
        if (tick && tick.price) {
          const livePrice = Number(tick.price);
          const nowSec = Math.floor(Date.now() / 1000);

          const getBucketTime = (tsSec, tf) => {
            if (tf === '1D') {
              const d = new Date(tsSec * 1000);
              d.setUTCHours(0, 0, 0, 0);
              return Math.floor(d.getTime() / 1000);
            }
            if (tf === '1W') {
              const d = new Date(tsSec * 1000);
              const day = d.getUTCDay();
              const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
              d.setUTCDate(diff);
              d.setUTCHours(0, 0, 0, 0);
              return Math.floor(d.getTime() / 1000);
            }
            const tfSec = tf === '1m' ? 60 : tf === '5m' ? 300 : tf === '15m' ? 900 : tf === '1h' ? 3600 : 86400;
            return Math.floor(tsSec / tfSec) * tfSec;
          };

          setCandles(prev => {
            if (!prev.length) return prev;
            const updated = [...prev];
            const last = { ...updated[updated.length - 1] };
            const bucketTs = getBucketTime(nowSec, timeframe);
            const lastBucketTs = getBucketTime(last.time, timeframe);

            if (bucketTs <= lastBucketTs || bucketTs === last.time) {
              // Smoothly update current forming candle body and wicks
              last.high = Math.max(last.high, livePrice);
              last.low = Math.min(last.low, livePrice);
              last.close = livePrice;
              updated[updated.length - 1] = last;
            } else {
              // Discrete interval step
              const newBar = {
                time: bucketTs,
                open: last.close || livePrice,
                high: Math.max(last.close || livePrice, livePrice),
                low: Math.min(last.close || livePrice, livePrice),
                close: livePrice,
                volume: 0
              };
              updated.push(newBar);
            }

            candlesRef.current = updated;
            const cur = updated[updated.length - 1];
            setLastCandle(cur);

            if (candleSeriesRef.current) {
              try {
                candleSeriesRef.current.update({
                  time: cur.time,
                  open: cur.open,
                  high: cur.high,
                  low: cur.low,
                  close: cur.close
                });
              } catch {}
            }

            if (fullCandleSeriesRef.current) {
              try {
                fullCandleSeriesRef.current.update({
                  time: cur.time,
                  open: cur.open,
                  high: cur.high,
                  low: cur.low,
                  close: cur.close
                });
              } catch {}
            }

            return updated;
          });
        }
      }
    });

    return () => {
      unsubscribe();
      wsClient.unsubscribe(subscribedList);
    };
  }, [symbol, timeframe]);

  // 3. Mount Primary Lightweight-Charts Canvas
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

        const width = container.clientWidth || 600;
        const height = container.clientHeight || 340;

        chart = lc.createChart(container, {
          width,
          height,
          layout: {
            background: { type: lc.ColorType.Solid, color: '#090d16' },
            textColor: '#94a3b8',
            fontSize: 11,
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
            scaleMargins: { top: 0.08, bottom: 0.08 }
          },
          timeScale: { 
            borderColor: 'rgba(255, 255, 255, 0.08)',
            timeVisible: true
          }
        });

        let candleSeries = null;
        if (lc.CandlestickSeries && typeof chart.addSeries === 'function') {
          candleSeries = chart.addSeries(lc.CandlestickSeries, {
            upColor: '#00e676',
            downColor: '#ff5252',
            borderVisible: false,
            wickUpColor: '#00e676',
            wickDownColor: '#ff5252'
          });
        } else if (typeof chart.addCandlestickSeries === 'function') {
          candleSeries = chart.addCandlestickSeries({
            upColor: '#00e676',
            downColor: '#ff5252',
            borderVisible: false,
            wickUpColor: '#00e676',
            wickDownColor: '#ff5252'
          });
        }

        chartInstanceRef.current = chart;
        candleSeriesRef.current = candleSeries;

        if (candlesRef.current && candlesRef.current.length > 0 && candleSeries) {
          candleSeries.setData(formatTVCandles(candlesRef.current));
          chart.timeScale().fitContent();
        }

        resizeObserver = new ResizeObserver((entries) => {
          for (const entry of entries) {
            if (entry.contentRect && chart) {
              const newW = Math.floor(entry.contentRect.width);
              const newH = Math.floor(entry.contentRect.height) || 340;
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
            upColor: '#00e676',
            downColor: '#ff5252',
            borderVisible: false,
            wickUpColor: '#00e676',
            wickDownColor: '#ff5252'
          });
        } else if (typeof fullChart.addCandlestickSeries === 'function') {
          candleSeries = fullChart.addCandlestickSeries({
            upColor: '#00e676',
            downColor: '#ff5252',
            borderVisible: false,
            wickUpColor: '#00e676',
            wickDownColor: '#ff5252'
          });
        }

        fullChartInstanceRef.current = fullChart;
        fullCandleSeriesRef.current = candleSeries;

        if (candlesRef.current && candlesRef.current.length > 0 && candleSeries) {
          candleSeries.setData(formatTVCandles(candlesRef.current));
          fullChart.timeScale().fitContent();
        }

        resizeObserver = new ResizeObserver((entries) => {
          for (const entry of entries) {
            if (entry.contentRect && fullChart) {
              const newW = Math.floor(entry.contentRect.width);
              const newH = Math.floor(entry.contentRect.height) || (window.innerHeight - 60);
              if (newW > 0) {
                fullChart.applyOptions({ width: newW, height: newH });
              }
            }
          }
        });
        resizeObserver.observe(container);
      } catch (err) {
        console.warn("Fullscreen TV chart notice:", err);
      }
    }

    initFullScreen();

    return () => {
      isMounted = false;
      if (resizeObserver) resizeObserver.disconnect();
      if (fullChart) {
        try { fullChart.remove(); } catch {}
      }
      fullChartInstanceRef.current = null;
      fullCandleSeriesRef.current = null;
    };
  }, [isFullScreen, isLandscape]);

  // Drawing Mouse & Touch Handlers
  const handleOverlayMouseDown = (e) => {
    if (activeTool === 'NONE') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (activeTool === 'HORIZONTAL') {
      const newD = {
        id: Date.now(),
        type: 'HORIZONTAL',
        y1: y,
        color: drawingColor
      };
      setDrawings(prev => [...prev, newD]);
      return;
    }

    if (!draftDrawing) {
      setDraftDrawing({
        type: activeTool,
        x1: x,
        y1: y,
        x2: x,
        y2: y,
        color: drawingColor
      });
    } else {
      const newD = {
        ...draftDrawing,
        id: Date.now(),
        x2: x,
        y2: y
      };
      setDrawings(prev => [...prev, newD]);
      setDraftDrawing(null);
    }
  };

  const handleOverlayMouseMove = (e) => {
    if (!draftDrawing || activeTool === 'NONE' || activeTool === 'HORIZONTAL') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setDraftDrawing(prev => ({ ...prev, x2: x, y2: y }));
  };

  const renderDrawingsSvg = () => {
    const allDrawings = [...drawings, ...(draftDrawing ? [draftDrawing] : [])];
    return (
      <svg
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          zIndex: 15,
          cursor: activeTool === 'NONE' ? 'crosshair' : 'crosshair',
          pointerEvents: activeTool === 'NONE' ? 'none' : 'auto'
        }}
        onMouseDown={handleOverlayMouseDown}
        onMouseMove={handleOverlayMouseMove}
      >
        {allDrawings.map((d, i) => {
          if (d.type === 'HORIZONTAL') {
            return (
              <g key={d.id || i}>
                <line x1="0" y1={d.y1} x2="100%" y2={d.y1} stroke={d.color} strokeWidth="1.5" strokeDasharray="5 3" />
                <rect x="8" y={d.y1 - 10} width="60" height="18" rx="4" fill="#090d16" stroke={d.color} strokeWidth="1" />
                <text x="38" y={d.y1 + 3} fill={d.color} fontSize="9" fontWeight="800" textAnchor="middle">LEVEL</text>
              </g>
            );
          }
          if (d.type === 'TRENDLINE') {
            return (
              <g key={d.id || i}>
                <line x1={d.x1} y1={d.y1} x2={d.x2} y2={d.y2} stroke={d.color} strokeWidth="2" />
                <circle cx={d.x1} cy={d.y1} r="4" fill={d.color} />
                <circle cx={d.x2} cy={d.y2} r="4" fill={d.color} />
              </g>
            );
          }
          if (d.type === 'RAY') {
            const dx = d.x2 - d.x1;
            const dy = d.y2 - d.y1;
            const extX = d.x1 + dx * 10;
            const extY = d.y1 + dy * 10;
            return (
              <g key={d.id || i}>
                <line x1={d.x1} y1={d.y1} x2={extX} y2={extY} stroke={d.color} strokeWidth="2" />
                <circle cx={d.x1} cy={d.y1} r="4" fill={d.color} />
              </g>
            );
          }
          if (d.type === 'RECTANGLE') {
            const rx = Math.min(d.x1, d.x2);
            const ry = Math.min(d.y1, d.y2);
            const rw = Math.abs(d.x2 - d.x1);
            const rh = Math.abs(d.y2 - d.y1);
            return (
              <g key={d.id || i}>
                <rect x={rx} y={ry} width={rw} height={rh} fill={d.color} fillOpacity="0.18" stroke={d.color} strokeWidth="1.5" rx="3" />
                <text x={rx + 6} y={ry + 14} fill={d.color} fontSize="9" fontWeight="700">ZONE</text>
              </g>
            );
          }
          return null;
        })}
      </svg>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
      
      {/* Timeframe, Drawing Tools, and Control Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          
          {/* Timeframe Selector Pills */}
          <div style={{ display: 'flex', gap: '2px', backgroundColor: 'var(--md-sys-color-surface-container)', padding: '2px', borderRadius: '8px', border: '1px solid var(--md-sys-color-outline-variant)' }}>
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

          {/* ✏️ Interactive Chart Drawing Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', backgroundColor: 'var(--md-sys-color-surface-container)', padding: '2px 4px', borderRadius: '8px', border: '1px solid var(--md-sys-color-outline-variant)' }}>
            <button
              type="button"
              onClick={() => { setActiveTool(activeTool === 'TRENDLINE' ? 'NONE' : 'TRENDLINE'); setDraftDrawing(null); }}
              title="Draw Trend Line (Click point 1, click point 2)"
              style={{
                padding: '4px 7px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: activeTool === 'TRENDLINE' ? 'var(--accent-blue-bg)' : 'transparent',
                color: activeTool === 'TRENDLINE' ? 'var(--accent-blue)' : 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                fontSize: '10px',
                fontWeight: 700
              }}
            >
              <TrendingUp style={{ width: '13px', height: '13px' }} />
              <span className="hide-on-mobile">Trend</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTool(activeTool === 'HORIZONTAL' ? 'NONE' : 'HORIZONTAL'); setDraftDrawing(null); }}
              title="Draw Horizontal Support/Resistance Level"
              style={{
                padding: '4px 7px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: activeTool === 'HORIZONTAL' ? 'var(--accent-blue-bg)' : 'transparent',
                color: activeTool === 'HORIZONTAL' ? 'var(--accent-blue)' : 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                fontSize: '10px',
                fontWeight: 700
              }}
            >
              <Minus style={{ width: '13px', height: '13px' }} />
              <span className="hide-on-mobile">Level</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTool(activeTool === 'RAY' ? 'NONE' : 'RAY'); setDraftDrawing(null); }}
              title="Draw Extended Ray"
              style={{
                padding: '4px 7px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: activeTool === 'RAY' ? 'var(--accent-blue-bg)' : 'transparent',
                color: activeTool === 'RAY' ? 'var(--accent-blue)' : 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                fontSize: '10px',
                fontWeight: 700
              }}
            >
              <MoveRight style={{ width: '13px', height: '13px' }} />
              <span className="hide-on-mobile">Ray</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTool(activeTool === 'RECTANGLE' ? 'NONE' : 'RECTANGLE'); setDraftDrawing(null); }}
              title="Draw Support/Demand Box"
              style={{
                padding: '4px 7px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: activeTool === 'RECTANGLE' ? 'var(--accent-blue-bg)' : 'transparent',
                color: activeTool === 'RECTANGLE' ? 'var(--accent-blue)' : 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                fontSize: '10px',
                fontWeight: 700
              }}
            >
              <Square style={{ width: '12px', height: '12px' }} />
              <span className="hide-on-mobile">Box</span>
            </button>

            {/* Color Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginLeft: '4px', paddingLeft: '4px', borderLeft: '1px solid var(--md-sys-color-outline-variant)' }}>
              {colorPalette.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setDrawingColor(c)}
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: c,
                    border: drawingColor === c ? '2px solid #ffffff' : 'none',
                    cursor: 'pointer',
                    padding: 0
                  }}
                />
              ))}
            </div>

            {/* Clear All Drawings */}
            {drawings.length > 0 && (
              <button
                type="button"
                onClick={() => { setDrawings([]); setDraftDrawing(null); setActiveTool('NONE'); }}
                title="Clear All Drawings"
                style={{
                  padding: '4px 6px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: 'var(--accent-red-bg)',
                  color: 'var(--accent-red)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  marginLeft: '4px'
                }}
              >
                <Trash2 style={{ width: '11px', height: '11px' }} />
              </button>
            )}
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
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Fallback candlestick rendering
          </div>
        ) : noData ? (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>No chart data available for {symbol}.</span>
          </div>
        ) : (
          <>
            <div ref={chartContainerRef} style={{ width: '100%', height: '100%' }} />
            {renderDrawingsSvg()}
          </>
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
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

              {/* Fullscreen Drawing Tools */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px', backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: '3px 6px', borderRadius: '8px' }}>
                <button
                  type="button"
                  onClick={() => { setActiveTool(activeTool === 'TRENDLINE' ? 'NONE' : 'TRENDLINE'); setDraftDrawing(null); }}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: activeTool === 'TRENDLINE' ? '#38bdf8' : 'transparent',
                    color: activeTool === 'TRENDLINE' ? '#000000' : '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <TrendingUp style={{ width: '13px', height: '13px' }} />
                  <span>Trend</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setActiveTool(activeTool === 'HORIZONTAL' ? 'NONE' : 'HORIZONTAL'); setDraftDrawing(null); }}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: activeTool === 'HORIZONTAL' ? '#38bdf8' : 'transparent',
                    color: activeTool === 'HORIZONTAL' ? '#000000' : '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Minus style={{ width: '13px', height: '13px' }} />
                  <span>Level</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setActiveTool(activeTool === 'RECTANGLE' ? 'NONE' : 'RECTANGLE'); setDraftDrawing(null); }}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: activeTool === 'RECTANGLE' ? '#38bdf8' : 'transparent',
                    color: activeTool === 'RECTANGLE' ? '#000000' : '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Square style={{ width: '12px', height: '12px' }} />
                  <span>Zone</span>
                </button>

                {drawings.length > 0 && (
                  <button
                    type="button"
                    onClick={() => { setDrawings([]); setDraftDrawing(null); setActiveTool('NONE'); }}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: 'rgba(239, 68, 68, 0.2)',
                      color: '#ef4444',
                      cursor: 'pointer'
                    }}
                  >
                    <Trash2 style={{ width: '13px', height: '13px' }} />
                  </button>
                )}
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
            {renderDrawingsSvg()}
          </div>
        </div>
      )}

    </div>
  );
}
