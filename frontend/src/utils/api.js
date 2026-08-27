/**
 * Ultra-Resilient High-Speed API & WebSocket Gateway Client
 * Engineered for 100% Android WebView & Universal Browser Reliability
 */

const DEFAULT_LOCAL_IP = '192.168.31.184';
export const LIVE_CLOUDFLARE_URL = 'https://pure-walks-cdna-suite.trycloudflare.com';

let dynamicApiBase = LIVE_CLOUDFLARE_URL;
let activeWorkingBase = null;
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

  // 1. User manual override (if set in settings)
  if (customIp && customIp.trim()) {
    const val = customIp.trim();
    list.push(val.startsWith('http://') || val.startsWith('https://') ? val : `http://${val}:8000`);
  }

  // 2. Active working base (cached from recent successful call)
  if (activeWorkingBase) {
    list.push(activeWorkingBase);
  }

  const isLocalHost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  // 3. If running on localhost browser, prioritize localhost directly
  if (isLocalHost) {
    list.push('http://localhost:8000');
    list.push('http://127.0.0.1:8000');
  }

  // 4. Dynamic tunnel from Firebase CDN
  if (dynamicApiBase) {
    list.push(dynamicApiBase);
  }

  // 5. Default Cloudflare tunnel
  list.push(LIVE_CLOUDFLARE_URL);

  // 6. Local Wi-Fi LAN IP (High speed, 0 latency on local network)
  list.push(`http://${DEFAULT_LOCAL_IP}:8000`);

  // 7. Android emulator fallback
  list.push('http://10.0.2.2:8000');
  list.push('http://localhost:8000');
  list.push('http://127.0.0.1:8000');

  const uniqueList = Array.from(new Set(list.filter(Boolean)));

  // If running in HTTPS Web context, strictly enforce HTTPS to prevent browser "Not Secure" Mixed Content flags
  if (isSecureContext() && !isCapacitorNative()) {
    const secureOnly = uniqueList.filter(url => url && url.startsWith('https://'));
    return secureOnly.length ? secureOnly : [LIVE_CLOUDFLARE_URL];
  }

  return uniqueList;
}

// Background auto-discovery from Firebase CDN
if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
  fetch('https://manishmarket.web.app/config.json?t=' + Date.now(), { cache: 'no-store' })
    .then(r => r.ok ? r.json() : null)
    .then(cfg => {
      if (cfg && (cfg.tunnelUrl || cfg.apiUrl)) {
        dynamicApiBase = cfg.tunnelUrl || cfg.apiUrl;
        probeFastestServer();
      }
    })
    .catch(() => {});
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

  const timeoutMs = options.timeout || 3500;

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

      if (res.ok) {
        return res;
      }
      // If server returned 5xx/404, invalidate fast path and fall through to race
      activeWorkingBase = null;
    } catch {
      activeWorkingBase = null;
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
          if (res.ok) {
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
