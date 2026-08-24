/**
 * symbolMatcher.js
 * Universal symbol normalizer and fuzzy tick finder for exchange securities.
 * Handles NSE (.NS), BSE (.BO), and US symbols seamlessly across case differences.
 */

export function normalizeSymbol(sym) {
  if (!sym) return '';
  return String(sym).toUpperCase().trim();
}

export function cleanSymbol(sym) {
  if (!sym) return '';
  return normalizeSymbol(sym).replace('.NS', '').replace('.BO', '');
}

export function findTick(ticks, querySymbol) {
  if (!ticks || !querySymbol) return null;
  const q = normalizeSymbol(querySymbol);
  const qClean = cleanSymbol(querySymbol);

  // 1. Direct exact lookup
  if (ticks[querySymbol]) return ticks[querySymbol];
  if (ticks[q]) return ticks[q];
  if (ticks[`${qClean}.NS`]) return ticks[`${qClean}.NS`];
  if (ticks[qClean]) return ticks[qClean];

  // 2. Iterate through keys
  for (const [key, tick] of Object.entries(ticks)) {
    const k = normalizeSymbol(key);
    const kClean = cleanSymbol(key);
    if (k === q || kClean === qClean || k === `${qClean}.NS` || kClean === q) {
      return tick;
    }
  }

  // 3. Match against tick.symbol property inside payload
  for (const tick of Object.values(ticks)) {
    if (tick && tick.symbol) {
      const ts = normalizeSymbol(tick.symbol);
      const tsClean = cleanSymbol(tick.symbol);
      if (ts === q || tsClean === qClean || ts === `${qClean}.NS` || tsClean === q) {
        return tick;
      }
    }
  }

  return null;
}
