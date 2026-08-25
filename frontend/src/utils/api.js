const DEFAULT_LOCAL_IP = '192.168.31.184';
export const LIVE_CLOUDFLARE_URL = 'https://level-prescribed-key-rat.trycloudflare.com';

let dynamicApiBase = LIVE_CLOUDFLARE_URL;
let activeWorkingBase = null;

if (typeof window !== 'undefined') {
  const cachedDynamic = localStorage.getItem('manish_market_dynamic_api');
  if (cachedDynamic && cachedDynamic.startsWith('http')) {
    dynamicApiBase = cachedDynamic;
    activeWorkingBase = cachedDynamic;
  }

  // Asynchronously refresh dynamic endpoint from Firebase CDN
  fetch('https://manishmarket.web.app/config.json?t=' + Date.now(), { cache: 'no-store' })
    .then(r => r.json())
    .then(cfg => {
      if (cfg && cfg.apiUrl && cfg.apiUrl.startsWith('http')) {
        dynamicApiBase = cfg.apiUrl;
        activeWorkingBase = cfg.apiUrl;
        localStorage.setItem('manish_market_dynamic_api', cfg.apiUrl);
      }
    })
    .catch(() => {});
}

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
  if (typeof window !== 'undefined') {
    const savedIp = localStorage.getItem('manish_market_server_ip');
    if (savedIp && savedIp.trim()) {
      const val = savedIp.trim();
      return val.startsWith('http://') || val.startsWith('https://') ? val : `http://${val}:8000`;
    }
    if (activeWorkingBase) {
      return activeWorkingBase;
    }
    if (isSecureContext()) {
      return dynamicApiBase || LIVE_CLOUDFLARE_URL;
    }
    if (isCapacitorNative()) {
      return dynamicApiBase || LIVE_CLOUDFLARE_URL;
    }
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:8000';
    }
  }
  return activeWorkingBase || dynamicApiBase || LIVE_CLOUDFLARE_URL;
}

export const API_BASE = getApiBase();
export const WS_BASE = import.meta.env.VITE_WS_BASE ?? API_BASE.replace(/^http/, 'ws');

const controlToken = import.meta.env.VITE_CONTROL_TOKEN;

export const CONTROL_HEADERS = {
  'Bypass-Tunnel-Reminder': '1',
  'bypass-tunnel-reminder': '1',
  ...(controlToken ? { 'X-Control-Token': controlToken } : {})
};

/**
 * Fast, Fail-Safe Fetch Wrapper with Multi-Tier Fallback and Active Host Caching
 */
export async function apiFetch(endpointPath, options = {}) {
  const path = endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`;
  const customIp = typeof window !== 'undefined' ? localStorage.getItem('manish_market_server_ip') : null;

  const candidateBases = [];

  // 1. Custom user-configured server IP/URL if present
  if (customIp && customIp.trim()) {
    const val = customIp.trim();
    candidateBases.push(val.startsWith('http://') || val.startsWith('https://') ? val : `http://${val}:8000`);
  }

  // 2. Currently known active working base (Fast Path)
  if (activeWorkingBase) {
    candidateBases.push(activeWorkingBase);
  }

  // 3. Dynamic tunnel from Firebase CDN
  if (dynamicApiBase) {
    candidateBases.push(dynamicApiBase);
  }

  // 4. Default cloudflare tunnel fallback
  candidateBases.push(LIVE_CLOUDFLARE_URL);

  // 5. Local LAN IP and localhost (for Android on local WiFi or emulator)
  if (typeof window !== 'undefined' && !isSecureContext()) {
    candidateBases.push(`http://${DEFAULT_LOCAL_IP}:8000`);
    candidateBases.push('http://localhost:8000');
    candidateBases.push('http://127.0.0.1:8000');
  }

  // Deduplicate candidate list preserving order
  const uniqueBases = Array.from(new Set(candidateBases.filter(Boolean)));

  const mergedHeaders = {
    ...CONTROL_HEADERS,
    ...(options.headers || {})
  };

  let lastError = null;
  const timeoutMs = options.timeout || 2200; // Fast 2.2s timeout per candidate to prevent stalling

  for (const base of uniqueBases) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const url = `${base}${path}`;
      const res = await fetch(url, {
        ...options,
        signal: options.signal || controller.signal,
        headers: mergedHeaders
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        // Cache this working base so all subsequent requests take the 0ms fast path
        activeWorkingBase = base;
        return res;
      }
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error(`Failed to fetch ${endpointPath} across all candidate endpoints`);
}
