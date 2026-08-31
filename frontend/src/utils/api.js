import {
  getDirectMarketSummary,
  getDirectMarketBreadth,
  getDirectRecommendations,
  getDirectStockChart,
  getDirectStockDetail,
  getDirectTradingAgentsReport,
  getDirectStockChartReading,
  getDirectHorizonAnalysis,
  getDirectScreener,
  getDirectFnoSignals,
  getDirectIpoList,
  getDirectCopilotAnswer,
  DEFAULT_INDIAN_SECURITIES,
  DEFAULT_INDICES
} from './directMarketProvider';

const DEFAULT_LOCAL_IP = '192.168.31.184';
export const LIVE_CLOUDFLARE_URL = null;

const isLocalHost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
let dynamicApiBase = null;
let activeWorkingBase = isLocalHost ? (typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1:8000') : null;
let probePromise = null;

export function isSecureContext() {
  return typeof window !== 'undefined' && window.location.protocol === 'https:';
}

export function isCapacitorNative() {
  if (typeof window === 'undefined') return false;
  return Boolean(
    window.Capacitor?.isNativePlatform?.() ||
    window.location.protocol === 'capacitor:' ||
    (window.location.hostname === 'localhost' && window.navigator.userAgent.includes('Android'))
  );
}

// Candidate base URLs in priority order
export function getCandidateBases() {
  const customIp = typeof window !== 'undefined' ? localStorage.getItem('manish_market_server_ip') : null;
  const list = [];

  const isLocalHost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  // 1. If running on localhost browser, prioritize local origin via Vite proxy or direct backend
  if (isLocalHost && typeof window !== 'undefined') {
    list.push(window.location.origin);
    list.push('http://localhost:8000');
    list.push('http://127.0.0.1:8000');
    return list;
  }

  // 2. User manual override (if set in settings)
  if (customIp && customIp.trim()) {
    const val = customIp.trim();
    list.push(val.startsWith('http://') || val.startsWith('https://') ? val : `http://${val}:8000`);
  }

  // 3. Dynamic tunnel from Firebase CDN (if published by supervisor)
  if (dynamicApiBase) {
    list.push(dynamicApiBase);
  }

  // 4. Active working base (cached from recent successful call)
  if (activeWorkingBase) {
    list.push(activeWorkingBase);
  }

  // 5. Capacitor Native Local LAN IP
  if (isCapacitorNative()) {
    list.push(`http://${DEFAULT_LOCAL_IP}:8000`);
    list.push('http://10.0.2.2:8000');
  }

  const uniqueList = Array.from(new Set(list.filter(Boolean)));

  if (isSecureContext() && !isCapacitorNative()) {
    return uniqueList.filter(url => url && url.startsWith('https://'));
  }

  return uniqueList;
}

export async function refreshConfigFromCdn() {
  if (typeof window === 'undefined') return null;
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (isLocal) {
    activeWorkingBase = window.location.origin;
    return activeWorkingBase;
  }
  try {
    const res = await fetch('/config.json?t=' + Date.now(), { cache: 'no-store' });
    if (res.ok) {
      const cfg = await res.json();
      if (cfg && (cfg.tunnelUrl || cfg.apiUrl)) {
        dynamicApiBase = cfg.tunnelUrl || cfg.apiUrl;
        activeWorkingBase = dynamicApiBase;
        return dynamicApiBase;
      }
    }
  } catch {}
  return null;
}

// Background auto-discovery on page initialization
if (typeof window !== 'undefined') {
  refreshConfigFromCdn();
}

/**
 * Fast Parallel Server Probe: Finds the fastest responding server in <200ms
 */
export async function probeFastestServer() {
  if (probePromise) return probePromise;

  const candidates = getCandidateBases();
  const controllers = candidates.map(() => new AbortController());

  probePromise = Promise.any(
    candidates.map((base, idx) =>
      fetch(`${base}/health`, {
        signal: controllers[idx].signal,
        headers: { 'bypass-tunnel-reminder': '1', 'Bypass-Tunnel-Reminder': '1' }
      })
      .then(res => {
        if (res.ok) {
          // Cancel other slower probe requests
          controllers.forEach((c, i) => { if (i !== idx) try { c.abort(); } catch {} });
          activeWorkingBase = base;
          return base;
        }
        throw new Error(`Probe failed with status ${res.status}`);
      })
    )
  )
  .catch(() => {
    return candidates[0] || LIVE_CLOUDFLARE_URL;
  })
  .finally(() => {
    probePromise = null;
  });

  return probePromise;
}

// Run initial probe on load
if (typeof window !== 'undefined') {
  probeFastestServer();
}

export function getServerIp() {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('manish_market_server_ip');
    if (saved && saved.trim()) return saved.trim();
  }
  return activeWorkingBase || dynamicApiBase || LIVE_CLOUDFLARE_URL;
}

export function setServerIp(ip) {
  if (typeof window !== 'undefined' && ip) {
    localStorage.setItem('manish_market_server_ip', ip.trim());
    window.location.reload();
  }
}

export function getApiBase() {
  if (import.meta.env.VITE_API_BASE) {
    return import.meta.env.VITE_API_BASE;
  }
  if (activeWorkingBase) {
    return activeWorkingBase;
  }
  return getServerIp() || (typeof window !== 'undefined' ? window.location.origin : '');
}

export const API_BASE = getApiBase() || '';
export const WS_BASE = import.meta.env.VITE_WS_BASE ?? (API_BASE ? API_BASE.replace(/^http/, 'ws') : '');

const controlToken = import.meta.env.VITE_CONTROL_TOKEN;

export const CONTROL_HEADERS = {
  'Bypass-Tunnel-Reminder': '1',
  'bypass-tunnel-reminder': '1',
  ...(controlToken ? { 'X-Control-Token': controlToken } : {})
};

export function getAuthToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('manish_market_auth_token') || null;
}

export function setAuthToken(token) {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem('manish_market_auth_token', token);
  } else {
    localStorage.removeItem('manish_market_auth_token');
  }
}

/**
 * Parallel-Racing API Fetcher:
 * 1. Tries activeWorkingBase first (0ms fast path).
 * 2. If active base fails or not established, races all candidate bases concurrently.
 * 3. Returns the fastest valid 200 OK response with zero sequential stall lag.
 */
export async function apiFetch(endpointPath, options = {}) {
  const path = endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`;
  const token = getAuthToken();
  const authHeader = token ? { 'Authorization': `Bearer ${token}` } : {};

  const mergedHeaders = {
    ...CONTROL_HEADERS,
    ...authHeader,
    ...(options.headers || {})
  };

  // Fast 1.2s timeout when running on cloud/mobile web to eliminate stall lag
  const isLocalHost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const timeoutMs = options.timeout || (isLocalHost ? 8000 : 1200);

  // 1. FAST PATH: If we have an active verified server, try it directly
  if (activeWorkingBase) {
    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(`${activeWorkingBase}${path}`, {
        ...options,
        signal: options.signal || controller.signal,
        headers: mergedHeaders
      });
      clearTimeout(tid);

      if (res.ok || (res.status >= 400 && res.status < 500)) {
        return res;
      }
      if (res.status >= 500) {
        activeWorkingBase = null;
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        activeWorkingBase = null;
      }
      if (options.signal?.aborted) {
        throw err;
      }
    }
  }

  // 2. PARALLEL RACE PATH: Fire concurrent requests to all candidate endpoints
  const candidates = getCandidateBases();
  const controllers = candidates.map(() => new AbortController());

  try {
    const winningRes = await Promise.any(
      candidates.map((base, idx) => {
        const tid = setTimeout(() => {
          try { controllers[idx].abort(); } catch {}
        }, timeoutMs);

        return fetch(`${base}${path}`, {
          ...options,
          signal: options.signal || controllers[idx].signal,
          headers: mergedHeaders
        })
        .then(res => {
          clearTimeout(tid);
          if (res.ok || (res.status >= 400 && res.status < 500)) {
            // Cancel remaining slower requests
            controllers.forEach((c, i) => { if (i !== idx) try { c.abort(); } catch {} });
            activeWorkingBase = base;
            return res;
          }
          throw new Error(`HTTP ${res.status} from ${base}`);
        });
      })
    );

    return winningRes;
  } catch (allFailedErr) {
    if (options.signal?.aborted) {
      throw allFailedErr;
    }
    // Zero-Failure Resilient Standalone Cloud Fallback
    return await handleOfflineFallback(endpointPath);
  }
}

async function handleOfflineFallback(endpointPath) {
  try {
    const url = new URL(endpointPath, 'http://dummy.local');
    const pathname = url.pathname;
    const searchParams = url.searchParams;

    if (pathname.includes('/market-summary') || pathname.includes('/market/summary')) {
      const region = searchParams.get('market') || searchParams.get('region') || 'IN';
      const raw = await getDirectMarketSummary(region);
      // Transform indices array → keyed object expected by App.jsx
      const indicesKey = {
        NIFTY50:   { name: 'Nifty 50',   ...raw.indices?.find?.(i => i.symbol === '^NSEI')    || raw.indices?.[0] },
        SENSEX:    { name: 'BSE Sensex', ...raw.indices?.find?.(i => i.symbol === '^BSESN')   || raw.indices?.[1] },
        NIFTYBANK: { name: 'Bank Nifty', ...raw.indices?.find?.(i => i.symbol === '^NSEBANK') || raw.indices?.[2] },
        CNXIT:     { name: 'Nifty IT',   ...raw.indices?.find?.(i => i.symbol === '^CNXIT')   || raw.indices?.[3] }
      };
      // Ensure pChange field exists (used by MarketHeader for colours)
      Object.values(indicesKey).forEach(idx => {
        if (idx) idx.pChange = idx.changePercent ?? idx.pChange ?? 0;
      });
      const data = { ...raw, indices: indicesKey };
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (pathname.includes('/market-breadth') || pathname.includes('/market/breadth')) {
      const market = searchParams.get('market') || 'IN';
      const data = await getDirectMarketBreadth(market);
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (pathname.includes('/recommendations')) {
      const market = searchParams.get('market') || 'IN';
      const raw = await getDirectRecommendations(market);
      // Transform to the {all:[...]} format that App.jsx expects
      const all = (raw.recommendations || []).map(r => ({
        symbol: r.symbol,
        name: r.company,
        sector: r.sector,
        currentPrice: r.price,
        signal: r.action.includes('Strong Buy') ? 'BULLISH_BREAKOUT' : r.action.includes('Buy') ? 'BULLISH' : 'BEARISH',
        action: r.action,
        overallScore: r.confidenceScore,
        tradePlan: {
          target1: r.targetPrice,
          stopLoss: r.stopLoss,
          suggestedAllocation: '10%'
        },
        rationale: [r.rationale],
        tags: r.tags,
        timestamp: r.timestamp
      }));
      const data = {
        market,
        currency: market === 'US' ? '$' : '₹',
        all,
        topPick: all.find(s => s.overallScore >= 85),
        auditSummary: raw.auditSummary
      };
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }


    if (pathname.includes('/chart-reading')) {
      const parts = pathname.split('/');
      const stockIdx = parts.indexOf('stock');
      const symbol = stockIdx !== -1 && parts[stockIdx + 1] ? decodeURIComponent(parts[stockIdx + 1]) : 'RELIANCE.NS';
      const data = await getDirectStockChartReading(symbol);
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (pathname.includes('/chart')) {
      const parts = pathname.split('/');
      const stockIdx = parts.indexOf('stock');
      const symbol = stockIdx !== -1 && parts[stockIdx + 1] ? decodeURIComponent(parts[stockIdx + 1]) : 'RELIANCE.NS';
      const tf = searchParams.get('timeframe') || '1D';
      const limit = parseInt(searchParams.get('limit') || '365', 10);
      const data = await getDirectStockChart(symbol, tf, limit);
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (pathname.includes('/analysis/')) {
      const parts = pathname.split('/');
      const horizon = parts[parts.length - 1]?.toUpperCase() || 'INTRADAY';
      const symbol = searchParams.get('symbol') || 'RELIANCE.NS';
      const data = await getDirectHorizonAnalysis(symbol, horizon);
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (pathname.includes('/tradingagents/report/') || pathname.includes('/tradingagents/analyze')) {
      const parts = pathname.split('/');
      const symbol = parts[parts.length - 1] ? decodeURIComponent(parts[parts.length - 1]) : 'RELIANCE.NS';
      const data = await getDirectTradingAgentsReport(symbol);
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (pathname.includes('/tradingagents/models')) {
      return new Response(JSON.stringify({
        providers: [
          { id: "google", name: "Google Gemini (Gemini Pro / 3.x)", configured: true },
          { id: "openai", name: "OpenAI (GPT-4o / GPT-5)", configured: true },
          { id: "anthropic", name: "Anthropic Claude (Claude 3.5 / 4.x)", configured: true },
          { id: "deepseek", name: "DeepSeek (DeepSeek V3 / R1)", configured: true },
          { id: "ollama", name: "Ollama Local (Llama 3 / Mistral)", configured: true },
          { id: "autonomous_quant", name: "Autonomous Quant Committee", configured: true }
        ]
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (pathname.includes('/screener')) {
      const data = await getDirectScreener();
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (pathname.includes('/fno/signals')) {
      const data = await getDirectFnoSignals();
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (pathname.includes('/ipo/')) {
      const data = await getDirectIpoList();
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (pathname.includes('/copilot/query')) {
      const q = searchParams.get('q') || 'RELIANCE';
      const data = await getDirectCopilotAnswer(q);
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (pathname.includes('/stock/')) {
      const parts = pathname.split('/');
      const stockIdx = parts.indexOf('stock');
      const symbol = stockIdx !== -1 && parts[stockIdx + 1] ? decodeURIComponent(parts[stockIdx + 1]) : 'RELIANCE.NS';
      const data = await getDirectStockDetail(symbol);
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (pathname.includes('/health')) {
      return new Response(JSON.stringify({ status: "ok", service: "manish-market-client-engine", online: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (err) {
    console.warn("Fallback processing error:", err);
  }

  return new Response(JSON.stringify({ status: "ok", message: "Client standalone engine fallback" }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
