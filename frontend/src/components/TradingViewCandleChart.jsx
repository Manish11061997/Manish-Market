import React, { useEffect, useRef, useState } from 'react';
import { wsClient } from '../utils/WebSocketClient';
import { apiFetch } from '../utils/api';
import { findTick } from '../utils/symbolMatcher';
import { Maximize2, RotateCw, RotateCcw, X, TrendingUp, Minus, MoveRight, Square, Trash2 } from 'lucide-react';

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

  const [viewportKey, setViewportKey] = useState(0);

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

        // Real-time synchronization of drawing overlay with pan, zoom and scroll
        chart.timeScale().subscribeVisibleLogicalRangeChange(() => setViewportKey(k => k + 1));
        chart.timeScale().subscribeVisibleTimeRangeChange(() => setViewportKey(k => k + 1));
        chart.subscribeCrosshairMove(() => setViewportKey(k => k + 1));

        resizeObserver = new ResizeObserver((entries) => {
          for (const entry of entries) {
            if (entry.contentRect && chart) {
              const newW = Math.floor(entry.contentRect.width);
              const newH = Math.floor(entry.contentRect.height) || 340;
              if (newW > 0) {
                chart.applyOptions({ width: newW, height: newH });
                setViewportKey(k => k + 1);
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

        fullChart.timeScale().subscribeVisibleLogicalRangeChange(() => setViewportKey(k => k + 1));
        fullChart.timeScale().subscribeVisibleTimeRangeChange(() => setViewportKey(k => k + 1));
        fullChart.subscribeCrosshairMove(() => setViewportKey(k => k + 1));

        resizeObserver = new ResizeObserver((entries) => {
          for (const entry of entries) {
            if (entry.contentRect && fullChart) {
              const newW = Math.floor(entry.contentRect.width);
              const newH = Math.floor(entry.contentRect.height) || (window.innerHeight - 60);
              if (newW > 0) {
                fullChart.applyOptions({ width: newW, height: newH });
                setViewportKey(k => k + 1);
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

  // Chart Drawing Keyboard Shortcuts
  useEffect(() => {
    const handleChartKeyDown = (e) => {
      const target = e.target;
      const isInput = target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      );
      if (isInput) return;

      // Undo drawing: Cmd+Z, Ctrl+Z, or U
      if ((e.key.toLowerCase() === 'z' && (e.metaKey || e.ctrlKey)) || e.key.toLowerCase() === 'u') {
        e.preventDefault();
        setDrawings(prev => prev.slice(0, -1));
        return;
      }

      // Clear drawings: Delete or Backspace (only when tool is active or drawings exist)
      if ((e.key === 'Delete' || e.key === 'Backspace') && activeTool !== 'NONE') {
        e.preventDefault();
        setDrawings([]);
        setDraftDrawing(null);
        setActiveTool('NONE');
        return;
      }

      // Cancel current drawing tool: Escape
      if (e.key === 'Escape' && activeTool !== 'NONE') {
        e.preventDefault();
        setActiveTool('NONE');
        setDraftDrawing(null);
        return;
      }

      // Drawing Tool Activations
      if (!e.metaKey && !e.ctrlKey && !e.altKey) {
        if (e.key.toLowerCase() === 't') {
          setActiveTool(prev => prev === 'TRENDLINE' ? 'NONE' : 'TRENDLINE');
          setDraftDrawing(null);
        } else if (e.key.toLowerCase() === 'l' || e.key.toLowerCase() === 'h') {
          setActiveTool(prev => prev === 'HORIZONTAL' ? 'NONE' : 'HORIZONTAL');
          setDraftDrawing(null);
        } else if (e.key.toLowerCase() === 'y') {
          setActiveTool(prev => prev === 'RAY' ? 'NONE' : 'RAY');
          setDraftDrawing(null);
        } else if (e.key.toLowerCase() === 'b') {
          setActiveTool(prev => prev === 'RECTANGLE' ? 'NONE' : 'RECTANGLE');
          setDraftDrawing(null);
        }
      }
    };

    window.addEventListener('keydown', handleChartKeyDown);
    return () => window.removeEventListener('keydown', handleChartKeyDown);
  }, [activeTool]);

  // Professional Drawing Coordinate Mouse Handlers
  const handleOverlayMouseDown = (e) => {
    if (activeTool === 'NONE') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    const activeChart = isFullScreen ? fullChartInstanceRef.current : chartInstanceRef.current;
    const activeSeries = isFullScreen ? fullCandleSeriesRef.current : candleSeriesRef.current;
    if (!activeChart || !activeSeries) return;

    const price = activeSeries.coordinateToPrice(screenY);
    const time = activeChart.timeScale().coordinateToTime(screenX);
    if (price == null) return;

    const timeFallback = time || (lastCandle?.time ?? Math.floor(Date.now() / 1000));

    if (activeTool === 'HORIZONTAL') {
      const newD = {
        id: Date.now(),
        type: 'HORIZONTAL',
        price1: Number(price.toFixed(2)),
        time1: timeFallback,
        color: drawingColor
      };
      setDrawings(prev => [...prev, newD]);
      return;
    }

    if (!draftDrawing) {
      setDraftDrawing({
        type: activeTool,
        price1: Number(price.toFixed(2)),
        time1: timeFallback,
        price2: Number(price.toFixed(2)),
        time2: timeFallback,
        screenX1: screenX,
        screenY1: screenY,
        screenX2: screenX,
        screenY2: screenY,
        color: drawingColor
      });
    } else {
      const newD = {
        id: Date.now(),
        type: activeTool,
        price1: draftDrawing.price1,
        time1: draftDrawing.time1,
        price2: Number(price.toFixed(2)),
        time2: timeFallback,
        color: drawingColor
      };
      setDrawings(prev => [...prev, newD]);
      setDraftDrawing(null);
    }
  };

  const handleOverlayMouseMove = (e) => {
    if (!draftDrawing || activeTool === 'NONE' || activeTool === 'HORIZONTAL') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    const activeChart = isFullScreen ? fullChartInstanceRef.current : chartInstanceRef.current;
    const activeSeries = isFullScreen ? fullCandleSeriesRef.current : candleSeriesRef.current;
    if (!activeChart || !activeSeries) return;

    const price = activeSeries.coordinateToPrice(screenY);
    const time = activeChart.timeScale().coordinateToTime(screenX);

    setDraftDrawing(prev => ({
      ...prev,
      price2: price != null ? Number(price.toFixed(2)) : prev.price2,
      time2: time || prev.time2,
      screenX2: screenX,
      screenY2: screenY
    }));
  };

  const renderDrawingsSvg = () => {
    const activeChart = isFullScreen ? fullChartInstanceRef.current : chartInstanceRef.current;
    const activeSeries = isFullScreen ? fullCandleSeriesRef.current : candleSeriesRef.current;

    const allDrawings = [...drawings, ...(draftDrawing ? [draftDrawing] : [])];

    return (
      <svg
        key={viewportKey}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          zIndex: 15,
          cursor: activeTool === 'NONE' ? 'default' : 'crosshair',
          pointerEvents: activeTool === 'NONE' ? 'none' : 'auto'
        }}
        onMouseDown={handleOverlayMouseDown}
        onMouseMove={handleOverlayMouseMove}
      >
        {allDrawings.map((d, i) => {
          let y1 = null, y2 = null, x1 = null, x2 = null;
          if (activeSeries && activeChart) {
            if (d.price1 != null) y1 = activeSeries.priceToCoordinate(d.price1);
            if (d.price2 != null) y2 = activeSeries.priceToCoordinate(d.price2);
            if (d.time1 != null) x1 = activeChart.timeScale().timeToCoordinate(d.time1);
            if (d.time2 != null) x2 = activeChart.timeScale().timeToCoordinate(d.time2);
          }

          // Fallback to screen coordinates during active drafting
          if (y1 == null && d.screenY1 != null) y1 = d.screenY1;
          if (y2 == null && d.screenY2 != null) y2 = d.screenY2;
          if (x1 == null && d.screenX1 != null) x1 = d.screenX1;
          if (x2 == null && d.screenX2 != null) x2 = d.screenX2;

          if (d.type === 'HORIZONTAL' && y1 != null) {
            const priceStr = `${currPrefix}${d.price1?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            return (
              <g key={d.id || i}>
                <line x1="0" y1={y1} x2="100%" y2={y1} stroke={d.color} strokeWidth="1.5" strokeDasharray="5 3" />
                
                {/* Center Badge */}
                <rect x="12" y={y1 - 10} width="115" height="20" rx="5" fill="#0b111e" stroke={d.color} strokeWidth="1.2" />
                <text x="69" y={y1 + 4} fill={d.color} fontSize="10" fontWeight="800" textAnchor="middle" fontFamily="JetBrains Mono, monospace">
                  LEVEL: {priceStr}
                </text>

                {/* Right Scale Price Badge */}
                <rect x="calc(100% - 75px)" y={y1 - 9} width="70" height="18" rx="4" fill={d.color} />
                <text x="calc(100% - 40px)" y={y1 + 4} fill="#090d16" fontSize="10" fontWeight="900" textAnchor="middle" fontFamily="JetBrains Mono, monospace">
                  {priceStr}
                </text>
              </g>
            );
          }

          if (d.type === 'TRENDLINE' && x1 != null && y1 != null && x2 != null && y2 != null) {
            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2;
            const deltaPts = (d.price2 != null && d.price1 != null) ? (d.price2 - d.price1) : 0;
            const deltaPct = (d.price1) ? ((deltaPts / d.price1) * 100) : 0;
            const sign = deltaPts >= 0 ? '+' : '';
            const badgeText = `Δ ${sign}${deltaPts.toFixed(2)} (${sign}${deltaPct.toFixed(2)}%)`;

            return (
              <g key={d.id || i}>
                {/* Main Trendline */}
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={d.color} strokeWidth="2.2" strokeLinecap="round" />
                
                {/* Start Node */}
                <circle cx={x1} cy={y1} r="5" fill="#0b111e" stroke={d.color} strokeWidth="2" />
                <circle cx={x1} cy={y1} r="2.5" fill={d.color} />
                
                {/* End Node */}
                <circle cx={x2} cy={y2} r="5" fill="#0b111e" stroke={d.color} strokeWidth="2" />
                <circle cx={x2} cy={y2} r="2.5" fill={d.color} />

                {/* Floating Metric Pill */}
                <rect x={midX - 60} y={midY - 22} width="120" height="18" rx="4" fill="#0b111e" stroke={d.color} strokeWidth="1" />
                <text x={midX} y={midY - 9} fill={d.color} fontSize="9" fontWeight="800" textAnchor="middle" fontFamily="JetBrains Mono, monospace">
                  {badgeText}
                </text>
              </g>
            );
          }

          if (d.type === 'RAY' && x1 != null && y1 != null && x2 != null && y2 != null) {
            const dx = x2 - x1;
            const dy = y2 - y1;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            const extX = x1 + (dx / len) * 2000;
            const extY = y1 + (dy / len) * 2000;

            return (
              <g key={d.id || i}>
                <line x1={x1} y1={y1} x2={extX} y2={extY} stroke={d.color} strokeWidth="2" strokeDasharray="6 3" strokeLinecap="round" />
                <circle cx={x1} cy={y1} r="5" fill="#0b111e" stroke={d.color} strokeWidth="2" />
                <circle cx={x1} cy={y1} r="2.5" fill={d.color} />
                <circle cx={x2} cy={y2} r="4" fill={d.color} fillOpacity="0.7" />
                <rect x={x1 + 8} y={y1 - 18} width="70" height="16" rx="3" fill="#0b111e" stroke={d.color} strokeWidth="1" />
                <text x={x1 + 43} y={y1 - 6} fill={d.color} fontSize="8" fontWeight="800" textAnchor="middle">RAY ORIGIN</text>
              </g>
            );
          }

          if (d.type === 'RECTANGLE' && x1 != null && y1 != null && x2 != null && y2 != null) {
            const rx = Math.min(x1, x2);
            const ry = Math.min(y1, y2);
            const rw = Math.max(1, Math.abs(x2 - x1));
            const rh = Math.max(1, Math.abs(y2 - y1));

            const highP = (d.price1 != null && d.price2 != null) ? Math.max(d.price1, d.price2) : 0;
            const lowP = (d.price1 != null && d.price2 != null) ? Math.min(d.price1, d.price2) : 0;
            const delta = highP - lowP;
            const deltaPct = lowP ? ((delta / lowP) * 100) : 0;

            return (
              <g key={d.id || i}>
                <rect x={rx} y={ry} width={rw} height={rh} fill={d.color} fillOpacity="0.2" stroke={d.color} strokeWidth="1.5" rx="4" />
                
                {/* Top Resistance Label */}
                <rect x={rx + 4} y={ry + 4} width="110" height="16" rx="3" fill="#0b111e" stroke={d.color} strokeWidth="0.8" />
                <text x={rx + 59} y={ry + 15} fill={d.color} fontSize="8" fontWeight="800" textAnchor="middle" fontFamily="JetBrains Mono, monospace">
                  RES: {currPrefix}{highP.toFixed(2)}
                </text>

                {/* Bottom Support Label */}
                <rect x={rx + 4} y={ry + rh - 20} width="110" height="16" rx="3" fill="#0b111e" stroke={d.color} strokeWidth="0.8" />
                <text x={rx + 59} y={ry + rh - 8} fill={d.color} fontSize="8" fontWeight="800" textAnchor="middle" fontFamily="JetBrains Mono, monospace">
                  SUP: {currPrefix}{lowP.toFixed(2)}
                </text>

                {/* Center Range Tag */}
                {rw > 85 && rh > 45 && (
                  <>
                    <rect x={rx + rw / 2 - 50} y={ry + rh / 2 - 10} width="100" height="19" rx="4" fill="#0b111e" stroke={d.color} strokeWidth="1" />
                    <text x={rx + rw / 2} y={ry + rh / 2 + 4} fill={d.color} fontSize="9" fontWeight="800" textAnchor="middle" fontFamily="JetBrains Mono, monospace">
                      ZONE: {delta.toFixed(2)} ({deltaPct.toFixed(1)}%)
                    </text>
                  </>
                )}
              </g>
            );
          }

          return null;
        })}
      </svg>
    );
  };

  // Synchronize candles whenever candles state updates
  useEffect(() => {
    if (candles && candles.length > 0) {
      syncCandlesToCharts(candles);
    }
  }, [candles]);

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

          {/* ✏️ Professional Interactive Chart Drawing Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', backgroundColor: 'var(--md-sys-color-surface-container)', padding: '2px 4px', borderRadius: '8px', border: '1px solid var(--md-sys-color-outline-variant)' }}>
            <button
              type="button"
              onClick={() => { setActiveTool(activeTool === 'TRENDLINE' ? 'NONE' : 'TRENDLINE'); setDraftDrawing(null); }}
              title="Trendline (Click 1st candle, then 2nd candle)"
              style={{
                padding: '4px 7px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: activeTool === 'TRENDLINE' ? 'var(--accent-blue)' : 'transparent',
                color: activeTool === 'TRENDLINE' ? '#090d16' : 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                fontSize: '10px',
                fontWeight: 800
              }}
            >
              <TrendingUp style={{ width: '13px', height: '13px' }} />
              <span className="hide-on-mobile">Trend</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTool(activeTool === 'HORIZONTAL' ? 'NONE' : 'HORIZONTAL'); setDraftDrawing(null); }}
              title="Horizontal Support/Resistance Level (Click anywhere on chart)"
              style={{
                padding: '4px 7px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: activeTool === 'HORIZONTAL' ? 'var(--accent-blue)' : 'transparent',
                color: activeTool === 'HORIZONTAL' ? '#090d16' : 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                fontSize: '10px',
                fontWeight: 800
              }}
            >
              <Minus style={{ width: '13px', height: '13px' }} />
              <span className="hide-on-mobile">Level</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTool(activeTool === 'RAY' ? 'NONE' : 'RAY'); setDraftDrawing(null); }}
              title="Extended Trend Ray (Click origin, then direction point)"
              style={{
                padding: '4px 7px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: activeTool === 'RAY' ? 'var(--accent-blue)' : 'transparent',
                color: activeTool === 'RAY' ? '#090d16' : 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                fontSize: '10px',
                fontWeight: 800
              }}
            >
              <MoveRight style={{ width: '13px', height: '13px' }} />
              <span className="hide-on-mobile">Ray</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTool(activeTool === 'RECTANGLE' ? 'NONE' : 'RECTANGLE'); setDraftDrawing(null); }}
              title="Supply/Demand Zone Box (Click 1st corner, then 2nd corner)"
              style={{
                padding: '4px 7px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: activeTool === 'RECTANGLE' ? 'var(--accent-blue)' : 'transparent',
                color: activeTool === 'RECTANGLE' ? '#090d16' : 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                fontSize: '10px',
                fontWeight: 800
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

            {/* Undo Last Drawing */}
            {drawings.length > 0 && (
              <button
                type="button"
                onClick={() => setDrawings(prev => prev.slice(0, -1))}
                title="Undo Last Drawing (Cmd+Z or U)"
                style={{
                  padding: '4px 6px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  marginLeft: '2px'
                }}
              >
                <RotateCcw style={{ width: '11px', height: '11px' }} />
              </button>
            )}

            {/* Clear All Drawings */}
            {drawings.length > 0 && (
              <button
                type="button"
                onClick={() => { setDrawings([]); setDraftDrawing(null); setActiveTool('NONE'); }}
                title="Clear All Drawings (Delete)"
                style={{
                  padding: '4px 6px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: 'var(--accent-red-bg)',
                  color: 'var(--accent-red)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  marginLeft: '2px'
                }}
              >
                <Trash2 style={{ width: '11px', height: '11px' }} />
              </button>
            )}
          </div>
        </div>

        {/* Right Side Fullscreen and Reset Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            type="button"
            onClick={() => {
              if (chartInstanceRef.current?.timeScale) {
                chartInstanceRef.current.timeScale().fitContent();
                setViewportKey(k => k + 1);
              }
            }}
            title="Reset Zoom / Fit Content (R)"
            style={{
              padding: '4px 8px',
              borderRadius: '6px',
              backgroundColor: 'var(--md-sys-color-surface-container)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--md-sys-color-outline-variant)',
              fontSize: '10px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '3px'
            }}
          >
            <RotateCw style={{ width: '11px', height: '11px' }} />
            <span className="hide-on-mobile">Reset</span>
          </button>

          <button
            type="button"
            onClick={() => setIsFullScreen(true)}
            title="Maximize Chart Fullscreen (F)"
            style={{
              padding: '4px 8px',
              borderRadius: '6px',
              backgroundColor: 'var(--accent-blue-bg)',
              color: 'var(--accent-blue)',
              border: '1px solid var(--accent-blue-border)',
              fontSize: '10px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Maximize2 style={{ width: '11px', height: '11px' }} />
            <span className="hide-on-mobile">Expand</span>
          </button>
        </div>
      </div>

      {/* Active Drawing Tool Instructional Helper Banner */}
      {activeTool !== 'NONE' && (
        <div style={{
          padding: '4px 10px',
          borderRadius: '6px',
          backgroundColor: 'rgba(56, 189, 248, 0.08)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11px',
          color: 'var(--accent-blue)'
        }}>
          <span>
            {activeTool === 'TRENDLINE' && (draftDrawing ? '📍 Click on the 2nd candlestick to lock your Trendline' : '📍 Click on the 1st candlestick to start your Trendline')}
            {activeTool === 'HORIZONTAL' && '📍 Click anywhere on the chart canvas to place a Support / Resistance Level'}
            {activeTool === 'RAY' && (draftDrawing ? '📍 Click direction point to project your Trend Ray' : '📍 Click origin candlestick to start your Trend Ray')}
            {activeTool === 'RECTANGLE' && (draftDrawing ? '📍 Click opposite corner to complete your Supply / Demand Zone Box' : '📍 Click 1st corner to start your Supply / Demand Zone Box')}
          </span>
          <button
            type="button"
            onClick={() => { setActiveTool('NONE'); setDraftDrawing(null); }}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '10px', fontWeight: 700 }}
          >
            Done ✕
          </button>
        </div>
      )}

      {/* Real-time OHLC Bar Stats */}
      {lastCandle && (
        <div className="mono-num" style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', gap: '8px', flexWrap: 'wrap', padding: '0 4px' }}>
          <span>O: <strong style={{ color: 'var(--text-main)' }}>{currPrefix}{lastCandle.open}</strong></span>
          <span>H: <strong style={{ color: 'var(--accent-green)' }}>{currPrefix}{lastCandle.high}</strong></span>
          <span>L: <strong style={{ color: 'var(--accent-red)' }}>{currPrefix}{lastCandle.low}</strong></span>
          <span>C: <strong style={{ color: lastCandle.close >= lastCandle.open ? 'var(--accent-green)' : 'var(--accent-red)' }}>{currPrefix}{lastCandle.close}</strong></span>
        </div>
      )}

      {/* Main Standard Chart Canvas */}
      <div 
        style={{ 
          position: 'relative', 
          width: '100%', 
          height: '360px',
          minHeight: '320px',
          borderRadius: '12px', 
          overflow: 'hidden', 
          border: '1px solid var(--md-sys-color-outline-variant)', 
          backgroundColor: '#090d16'
        }}
      >
        <div ref={chartContainerRef} style={{ width: '100%', height: '100%' }} />
        {renderDrawingsSvg()}

        {loading && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(9, 13, 22, 0.75)', flexDirection: 'column', gap: '8px' }}>
            <div style={{ width: '24px', height: '24px', border: '2px solid var(--accent-blue)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Rendering Live Candlesticks...</span>
          </div>
        )}

        {noData && !loading && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(9, 13, 22, 0.9)', zIndex: 12 }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No chart data available for {symbol}.</span>
          </div>
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
                  onClick={() => { setActiveTool(activeTool === 'RAY' ? 'NONE' : 'RAY'); setDraftDrawing(null); }}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: activeTool === 'RAY' ? '#38bdf8' : 'transparent',
                    color: activeTool === 'RAY' ? '#000000' : '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <MoveRight style={{ width: '13px', height: '13px' }} />
                  <span>Ray</span>
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
                  <span>Box</span>
                </button>

                {/* Color Palette in Full Screen */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginLeft: '4px', paddingLeft: '4px', borderLeft: '1px solid rgba(255, 255, 255, 0.1)' }}>
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

                {/* Undo in Full Screen */}
                {drawings.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setDrawings(prev => prev.slice(0, -1))}
                    title="Undo Last Drawing"
                    style={{
                      padding: '4px 6px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      marginLeft: '2px'
                    }}
                  >
                    <RotateCcw style={{ width: '11px', height: '11px' }} />
                  </button>
                )}

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
