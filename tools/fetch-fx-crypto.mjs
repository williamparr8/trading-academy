// Phase 3 : télécharge les cotes quotidiennes de forex et de crypto (Yahoo Finance) et complète data/index.json.
// Les actions (déjà téléchargées) ne sont pas touchées.
import fs from 'node:fs';

const GROUPS = {
  forex: { x: 'Forex', sec: 'Devises', list: [
    ['USDCAD=X', 'USD/CAD', 'Dollar américain / dollar canadien'], ['EURUSD=X', 'EUR/USD', 'Euro / dollar américain'],
    ['GBPUSD=X', 'GBP/USD', 'Livre sterling / dollar américain'], ['USDJPY=X', 'USD/JPY', 'Dollar américain / yen japonais'],
    ['AUDUSD=X', 'AUD/USD', 'Dollar australien / dollar américain'], ['EURCAD=X', 'EUR/CAD', 'Euro / dollar canadien'] ] },
  crypto: { x: 'Crypto', sec: 'Cryptomonnaies', list: [
    ['BTC-USD', 'BTC', 'Bitcoin'], ['ETH-USD', 'ETH', 'Ether (Ethereum)'], ['SOL-USD', 'SOL', 'Solana'],
    ['XRP-USD', 'XRP', 'XRP'], ['LTC-USD', 'LTC', 'Litecoin'], ['DOGE-USD', 'DOGE', 'Dogecoin'] ] },
};
const P1 = 1104710400; // 2005-01-03
const P2 = Math.floor(Date.now() / 1000) + 86400;
const todayDay = Math.floor(Date.now() / 86400000);
const iso = (d) => new Date(d * 86400000).toISOString().slice(0, 10);
const r4 = (x) => Math.round(x * 1e6) / 1e6;   // forex : 6 décimales (les prix sont de l'ordre de 1)

async function get(sym) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?period1=${P1}&period2=${P2}&interval=1d&events=div%2Csplits`;
  for (let k = 0; k < 4; k++) {
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (r.ok) return (await r.json()).chart.result[0];
    await new Promise((r) => setTimeout(r, 1500 * (k + 1)));
  }
  throw new Error('échec ' + sym);
}
function convert(res) {
  const off = res.meta.gmtoffset || 0, q = res.indicators.quote[0];
  const out = { t: [], o: [], h: [], l: [], c: [], v: [] };
  let lastDay = -1;
  res.timestamp.forEach((ts, i) => {
    const o = q.open[i], h = q.high[i], l = q.low[i], c = q.close[i];
    if ([o, h, l, c].some((x) => x == null || !(x > 0))) return;
    const day = Math.floor((ts + off) / 86400);
    if (day <= lastDay) return;
    if (day >= todayDay) return;
    lastDay = day;
    out.t.push(day); out.o.push(r4(o)); out.h.push(r4(Math.max(h, o, c))); out.l.push(r4(Math.min(l, o, c))); out.c.push(r4(c)); out.v.push(q.volume[i] || 0);
  });
  return out;
}

// Forex chez Yahoo : la « clôture » quotidienne est périmée (elle reprend l'ouverture) et quelques barres sont aberrantes.
// 1) on retire les pics isolés ; 2) la clôture devient l'ouverture suivante (le marché se négocie en continu).
function fixForex(d, label) {
  const keep = d.t.map(() => true);
  for (let i = 1; i < d.t.length - 1; i++) {
    const a = d.o[i] / d.o[i - 1] - 1, b = d.o[i + 1] / d.o[i] - 1, across = Math.abs(d.o[i + 1] / d.o[i - 1] - 1);
    if (Math.abs(a) > 0.04 && Math.abs(b) > 0.04 && a * b < 0 && across < 0.03) { keep[i] = false; console.log('  barre aberrante retirée', label, iso(d.t[i])); }
  }
  const out = { t: [], o: [], h: [], l: [], c: [], v: [] };
  d.t.forEach((_, i) => { if (keep[i]) for (const k of Object.keys(out)) out[k].push(d[k][i]); });
  for (let i = 0; i < out.t.length - 1; i++) {
    out.c[i] = out.o[i + 1];
    out.h[i] = Math.max(out.h[i], out.c[i]);
    out.l[i] = Math.min(out.l[i], out.c[i]);
  }
  return out;
}

const only = process.argv[2];
const index = JSON.parse(fs.readFileSync('trading/data/index.json'));
for (const [mk, G] of Object.entries(GROUPS)) {
  if (only && only !== mk) continue;
  for (const [sym, label, name] of G.list) {
    const res = await get(sym), file = sym.replace(/[^A-Za-z0-9]/g, '_');
    const d = mk === 'forex' ? fixForex(convert(res), label) : convert(res);
    fs.writeFileSync(`trading/data/${file}.json`, JSON.stringify({ s: label, n: name, x: G.x, sec: G.sec, cur: res.meta.currency, mk, ...d }));
    index.assets = index.assets.filter((a) => a.id !== file);
    index.assets.push({ id: file, mk, from: d.t[0], to: d.t[d.t.length - 1], n: d.t.length });
    console.log(mk.padEnd(7), label.padEnd(8), String(d.t.length).padStart(5), iso(d.t[0]), iso(d.t[d.t.length - 1]));
    await new Promise((r) => setTimeout(r, 400));
  }
}
for (const a of index.assets) if (!a.mk) a.mk = 'stock';
fs.writeFileSync('trading/data/index.json', JSON.stringify(index));
console.log('index.json :', index.assets.length, 'actifs');
