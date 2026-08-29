/**
 * Ultra-Resilient High-Speed API & WebSocket Gateway Client
 * Engineered for 100% Android WebView & Universal Browser Reliability
 */

const DEFAULT_LOCAL_IP = '192.168.31.184';
export const LIVE_CLOUDFLARE_URL = 'https://televisions-factor-conferences-instead.trycloudflare.com';

const isLocalHost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
let dynamicApiBase = LIVE_CLOUDFLARE_URL;
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

// Auto-purge stale or obsolete tunnel URLs from localStorage on initialization
if (typeof window !== 'undefined') {
  try {
    const saved = localStorage.getItem('manish_market_server_ip');
    if (saved && (saved.includes('trycloudflare.com') || saved.includes('pure-walks') || saved.includes('logan-pipeline') || saved.includes('ict-environments') || saved.includes('viewers-montreal'))) {
      if (!saved.includes('televisions-factor-conferences')) {
        localStorage.removeItem('manish_market_server_ip');
      }
    }
  } catch {}
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
  }

  // 2. User manual override (if set in settings and not obsolete)
  if (customIp && customIp.trim() && !customIp.includes('pure-walks')) {
    const val = customIp.trim();
    list.push(val.startsWith('http://') || val.startsWith('https://') ? val : `http://${val}:8000`);
  }

  // 3. Dynamic tunnel from Firebase CDN or LIVE_CLOUDFLARE_URL
  if (dynamicApiBase) {
    list.push(dynamicApiBase);
  }
  list.push(LIVE_CLOUDFLARE_URL);

  // 4. Active working base (cached from recent successful call)
  if (activeWorkingBase) {
    list.push(activeWorkingBase);
  }

  // 5. Local Wi-Fi LAN IP (High speed, 0 latency on local network)
  list.push(`http://${DEFAULT_LOCAL_IP}:8000`);

  // 6. Android emulator fallback
  list.push('http://10.0.2.2:8000');

  const uniqueList = Array.from(new Set(list.filter(Boolean)));

  // If running in HTTPS Web context, prioritize HTTPS endpoints
  if (isSecureContext() && !isCapacitorNative()) {
    if (isLocalHost) {
      return [window.location.origin, LIVE_CLOUDFLARE_URL];
    }
    const secureOnly = uniqueList.filter(url => url && url.startsWith('https://'));
    return secureOnly.length ? secureOnly : [LIVE_CLOUDFLARE_URL];
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
  return getServerIp();
}

export const API_BASE = getApiBase();
export const WS_BASE = import.meta.env.VITE_WS_BASE ?? API_BASE.replace(/^http/, 'ws');

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

  const timeoutMs = options.timeout || 12000;

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
    throw new Error(`Failed to reach any server for ${endpointPath}`);
  }
}
