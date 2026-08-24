const DEFAULT_LOCAL_IP = '192.168.31.184';
const LIVE_CLOUDFLARE_URL = 'https://aluminium-shorts-waterproof-distinction.trycloudflare.com';

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
  return LIVE_CLOUDFLARE_URL;
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
      if (val.includes('trycloudflare.com') && !val.includes('aluminium-shorts-waterproof-distinction')) {
        localStorage.removeItem('manish_market_server_ip');
      } else {
        return val.startsWith('http://') || val.startsWith('https://') ? val : `http://${val}:8000`;
      }
    }
    if (isSecureContext() || isCapacitorNative()) {
      return LIVE_CLOUDFLARE_URL;
    }
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:8000';
    }
  }
  return LIVE_CLOUDFLARE_URL;
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
 * Fast, Fail-Safe Fetch Wrapper with HTTPS Mixed-Content Guard & Live Failover
 */
export async function apiFetch(endpointPath, options = {}) {
  const path = endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`;
  const customIp = typeof window !== 'undefined' ? localStorage.getItem('manish_market_server_ip') : null;

  const candidateBases = [];

  // 1. Custom user-configured IP/URL if present
  if (customIp && customIp.trim()) {
    const val = customIp.trim();
    candidateBases.push(val.startsWith('http://') || val.startsWith('https://') ? val : `http://${val}:8000`);
  }

  const isHttps = isSecureContext();

  if (isHttps) {
    // HTTPS web browser running on https://manishmarket.web.app
    candidateBases.push(LIVE_CLOUDFLARE_URL);
  } else if (isCapacitorNative()) {
    // Native Android App: try Cloudflare URL, local host IP, and localhost
    candidateBases.push(LIVE_CLOUDFLARE_URL);
    candidateBases.push(`http://${DEFAULT_LOCAL_IP}:8000`);
    candidateBases.push('http://localhost:8000');
  } else {
    // Local HTTP web browser
    candidateBases.push('http://localhost:8000');
    candidateBases.push(LIVE_CLOUDFLARE_URL);
    candidateBases.push(`http://${DEFAULT_LOCAL_IP}:8000`);
  }

  // Deduplicate candidate list
  const uniqueBases = Array.from(new Set(candidateBases.filter(Boolean)));

  const mergedHeaders = {
    ...CONTROL_HEADERS,
    ...(options.headers || {})
  };

  let lastError = null;
  const maxRetries = options.retries ?? 1;

  for (const base of uniqueBases) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutMs = options.timeout || 4000;
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const url = `${base}${path}`;
        const res = await fetch(url, {
          ...options,
          signal: options.signal || controller.signal,
          headers: mergedHeaders
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          return res;
        }
      } catch (err) {
        lastError = err;
        // Small delay before retry
        if (attempt < maxRetries - 1) {
          await new Promise(r => setTimeout(r, 100));
        }
      }
    }
  }

  throw lastError || new Error(`Failed to fetch ${endpointPath} across all candidate endpoints`);
}
