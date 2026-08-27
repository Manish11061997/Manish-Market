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

const INDEX_ALIASES = {
  'NIFTY50': ['^NSEI', 'NIFTY 50', 'NIFTY', 'NIFTY_50', 'NIFTY-50'],
  '^NSEI': ['NIFTY50', 'NIFTY 50', 'NIFTY', 'NIFTY_50'],
  'SENSEX': ['^BSESN', 'SENSEX', 'BSE SENSEX', 'BSESN'],
  '^BSESN': ['SENSEX', 'BSE SENSEX', 'BSESN'],
  'NIFTYBANK': ['^NSEBANK', 'BANKNIFTY', 'NIFTY BANK', 'NIFTY_BANK'],
  '^NSEBANK': ['NIFTYBANK', 'BANKNIFTY', 'NIFTY BANK'],
  'SP500': ['^GSPC', 'SPX', 'S&P 500', 'S&P500', '^INX'],
  '^GSPC': ['SP500', 'SPX', 'S&P 500'],
  'NASDAQ': ['^IXIC', 'COMP', 'NASDAQ', 'NDX', '^NDX'],
  '^IXIC': ['NASDAQ', 'COMP', 'NDX'],
  'DOW': ['^DJI', 'DJI', 'DOW JONES', 'DJIA'],
  '^DJI': ['DOW', 'DJI', 'DOW JONES']
};

export function findTick(ticks, querySymbol) {
  if (!ticks || !querySymbol) return null;
  const q = normalizeSymbol(querySymbol);
  const qClean = cleanSymbol(querySymbol);

  // 1. Direct exact lookup
  if (ticks[querySymbol]) return ticks[querySymbol];
  if (ticks[q]) return ticks[q];
  if (ticks[`${qClean}.NS`]) return ticks[`${qClean}.NS`];
  if (ticks[qClean]) return ticks[qClean];

  // 2. Index alias lookup
  const aliases = INDEX_ALIASES[q] || INDEX_ALIASES[querySymbol] || [];
  for (const alias of aliases) {
    if (ticks[alias]) return ticks[alias];
    const aNorm = normalizeSymbol(alias);
    if (ticks[aNorm]) return ticks[aNorm];
  }

  // 3. Iterate through keys
  for (const [key, tick] of Object.entries(ticks)) {
    const k = normalizeSymbol(key);
    const kClean = cleanSymbol(key);
    if (k === q || kClean === qClean || k === `${qClean}.NS` || kClean === q) {
      return tick;
    }
    if (aliases.includes(key) || aliases.includes(k)) {
      return tick;
    }
  }

  // 4. Match against tick.symbol property inside payload
  for (const tick of Object.values(ticks)) {
    if (tick && tick.symbol) {
      const ts = normalizeSymbol(tick.symbol);
      const tsClean = cleanSymbol(tick.symbol);
      if (ts === q || tsClean === qClean || ts === `${qClean}.NS` || tsClean === q || aliases.includes(ts)) {
        return tick;
      }
    }
  }

  return null;
}
