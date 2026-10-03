import { apiFetch } from './src/utils/api.js';
const res = await apiFetch('/api/recommendations?market=IN');
const data = await res.json();
const rel = data.all.find(s => s.symbol === 'RELIANCE.NS');
const tcs = data.all.find(s => s.symbol === 'TCS.NS');
const infy = data.all.find(s => s.symbol === 'INFY.NS');

console.log('RELIANCE: price=', rel.currentPrice, 'change=', rel.change, 'changePercent=', rel.changePercent, 'fundamentals=', rel.fundamentals);
console.log('TCS: price=', tcs.currentPrice, 'change=', tcs.change, 'changePercent=', tcs.changePercent, 'fundamentals=', tcs.fundamentals);
console.log('INFY: price=', infy.currentPrice, 'change=', infy.change, 'changePercent=', infy.changePercent, 'fundamentals=', infy.fundamentals);

process.exit(0);
