/**
 * indicators.js
 * High-performance technical indicators engine for financial charts.
 * Computes EMAs, SMAs, Bollinger Bands, VWAP, RSI, MACD, and Volume Series.
 */

export function calculateEMA(data, period) {
  if (!data || data.length < period) return [];
  const k = 2 / (period + 1);
  const result = [];
  let sum = 0;
  for (let i = 0; i < period; i++) sum += data[i].close;
  let ema = sum / period;
  result.push({ time: data[period - 1].time, value: Number(ema.toFixed(2)) });

  for (let i = period; i < data.length; i++) {
    ema = data[i].close * k + ema * (1 - k);
    result.push({ time: data[i].time, value: Number(ema.toFixed(2)) });
  }
  return result;
}

export function calculateSMA(data, period) {
  if (!data || data.length < period) return [];
  const result = [];
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i].close;
    if (i >= period) {
      sum -= data[i - period].close;
    }
    if (i >= period - 1) {
      result.push({ time: data[i].time, value: Number((sum / period).toFixed(2)) });
    }
  }
  return result;
}

export function calculateBollingerBands(data, period = 20, multiplier = 2) {
  if (!data || data.length < period) return { upper: [], middle: [], lower: [] };
  const upper = [];
  const middle = [];
  const lower = [];

  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    const mean = slice.reduce((acc, c) => acc + c.close, 0) / period;
    const variance = slice.reduce((acc, c) => acc + Math.pow(c.close - mean, 2), 0) / period;
    const sd = Math.sqrt(variance);
    const t = data[i].time;

    middle.push({ time: t, value: Number(mean.toFixed(2)) });
    upper.push({ time: t, value: Number((mean + multiplier * sd).toFixed(2)) });
    lower.push({ time: t, value: Number((mean - multiplier * sd).toFixed(2)) });
  }
  return { upper, middle, lower };
}

export function calculateVWAP(data) {
  if (!data || !data.length) return [];
  let cumVol = 0;
  let cumTypVol = 0;
  const result = [];

  for (const bar of data) {
    const typical = (bar.high + bar.low + bar.close) / 3;
    const vol = bar.volume || 1;
    cumVol += vol;
    cumTypVol += typical * vol;
    const vwap = cumVol > 0 ? cumTypVol / cumVol : bar.close;
    result.push({ time: bar.time, value: Number(vwap.toFixed(2)) });
  }
  return result;
}

export function formatVolumeSeries(data) {
  if (!data || !data.length) return [];
  return data.map(bar => ({
    time: bar.time,
    value: bar.volume || 0,
    color: bar.close >= bar.open ? 'rgba(0, 230, 118, 0.45)' : 'rgba(255, 82, 82, 0.45)'
  }));
}

export function calculateRSI(data, period = 14) {
  if (!data || data.length <= period) return [];
  const result = [];
  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = data[i].close - data[i - 1].close;
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  let rsi = 100 - (100 / (1 + rs));
  result.push({ time: data[period].time, value: Number(rsi.toFixed(2)) });

  for (let i = period + 1; i < data.length; i++) {
    const diff = data[i].close - data[i - 1].close;
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi = 100 - (100 / (1 + rs));
    result.push({ time: data[i].time, value: Number(rsi.toFixed(2)) });
  }
  return result;
}

export function calculateMACD(data, fast = 12, slow = 26, signal = 9) {
  if (!data || data.length < slow + signal) return { macd: [], signal: [], hist: [] };
  const emaFast = calculateEMA(data, fast);
  const emaSlow = calculateEMA(data, slow);

  const macdRaw = [];
  const fastMap = new Map(emaFast.map(item => [item.time, item.value]));
  for (const s of emaSlow) {
    const fVal = fastMap.get(s.time);
    if (fVal != null) {
      macdRaw.push({ time: s.time, close: fVal - s.value });
    }
  }

  const signalLine = calculateEMA(macdRaw, signal);
  const signalMap = new Map(signalLine.map(item => [item.time, item.value]));

  const macd = [];
  const hist = [];
  for (const m of macdRaw) {
    const sVal = signalMap.get(m.time);
    macd.push({ time: m.time, value: Number(m.close.toFixed(2)) });
    if (sVal != null) {
      const h = m.close - sVal;
      hist.push({
        time: m.time,
        value: Number(h.toFixed(2)),
        color: h >= 0 ? 'rgba(0, 230, 118, 0.75)' : 'rgba(255, 82, 82, 0.75)'
      });
    }
  }
  return { macd, signal: signalLine, hist };
}
