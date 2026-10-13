// Télécharge les cotes quotidiennes (ajustées dividendes/fractionnements) depuis Yahoo Finance
// et les convertit en JSON compact : un fichier par actif + index.json + bench.json.
import fs from 'node:fs';

const ASSETS = [
  ['AAPL','Apple','Nasdaq','Technologie'],['MSFT','Microsoft','Nasdaq','Technologie'],
  ['AMZN','Amazon','Nasdaq','Consommation discrétionnaire'],['NVDA','NVIDIA','Nasdaq','Semi-conducteurs'],
  ['GOOGL','Alphabet (Google)','Nasdaq','Communications'],['INTC','Intel','Nasdaq','Semi-conducteurs'],
  ['COST','Costco','Nasdaq','Consommation de base'],
  ['JPM','JPMorgan Chase','NYSE','Finance'],['BAC','Bank of America','NYSE','Finance'],
  ['GS','Goldman Sachs','NYSE','Finance'],['KO','Coca-Cola','NYSE','Consommation de base'],
  ['XOM','ExxonMobil','NYSE','Énergie'],['WMT','Walmart','NYSE','Consommation de base'],
  ['DIS','Disney','NYSE','Médias'],['BA','Boeing','NYSE','Aérospatiale'],['JNJ','Johnson & Johnson','NYSE','Santé'],
  ['RY.TO','Banque Royale du Canada','TSX','Finance'],['TD.TO','Banque TD','TSX','Finance'],
  ['SHOP.TO','Shopify','TSX','Technologie'],['ENB.TO','Enbridge','TSX','Énergie'],
  ['CNQ.TO','Canadian Natural Resources','TSX','Énergie'],['CNR.TO','Canadien National','TSX','Transport'],
  ['BCE.TO','BCE','TSX','Télécommunications'],['SU.TO','Suncor','TSX','Énergie'],
];
const BENCH = [['sp','^GSPC'],['tsx','^GSPTSE']];
const P1 = 1104710400; // 2005-01-03
const P2 = Math.floor(Date.now()/1000) + 86400;

async function get(sym) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?period1=${P1}&period2=${P2}&interval=1d&events=div%2Csplits`;
  for (let k = 0; k < 4; k++) {
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (r.ok) return (await r.json()).chart.result[0];
    await new Promise(r => setTimeout(r, 1500 * (k + 1)));
  }
  throw new Error('échec ' + sym);
}
const r4 = x => Math.round(x * 10000) / 10000;

function convert(res) {
  const off = res.meta.gmtoffset || 0;
  const q = res.indicators.quote[0];
  const adj = res.indicators.adjclose?.[0]?.adjclose;
  const out = { t: [], o: [], h: [], l: [], c: [], v: [] };
  let lastDay = -1;
  res.timestamp.forEach((ts, i) => {
    const o = q.open[i], h = q.high[i], l = q.low[i], c = q.close[i];
    if ([o, h, l, c].some(x => x == null || !(x > 0))) return;
    const day = Math.floor((ts + off) / 86400);
    if (day <= lastDay) return;
    if (day >= todayDay) return;
    lastDay = day;
    const f = adj && adj[i] > 0 ? adj[i] / c : 1;
    const O = o * f, C = c * f;
    out.t.push(day);
    out.o.push(r4(O));
    out.h.push(r4(Math.max(h * f, O, C)));
    out.l.push(r4(Math.min(l * f, O, C)));
    out.c.push(r4(C));
    out.v.push(q.volume[i] || 0);
  });
  return out;
}

const todayDay = Math.floor(Date.now() / 86400000);
const iso = d => new Date(d * 86400000).toISOString().slice(0, 10);
const index = { generated: new Date().toISOString().slice(0, 10), assets: [] };
for (const [sym, name, exch, sector] of ASSETS) {
  const res = await get(sym);
  const d = convert(res);
  const file = sym.replace('.', '_');
  fs.writeFileSync(`trading/data/${file}.json`, JSON.stringify({ s: sym, n: name, x: exch, sec: sector, cur: res.meta.currency, ...d }));
  index.assets.push({ id: file, from: d.t[0], to: d.t[d.t.length - 1], n: d.t.length });
  console.log(sym.padEnd(8), d.t.length, iso(d.t[0]), iso(d.t[d.t.length - 1]));
  await new Promise(r => setTimeout(r, 400));
}
fs.writeFileSync('trading/data/index.json', JSON.stringify(index));
const bench = {};
for (const [key, sym] of BENCH) {
  const d = convert(await get(sym));
  bench[key] = { t: d.t, c: d.c };
  console.log(sym.padEnd(8), d.t.length, iso(d.t[0]), iso(d.t[d.t.length - 1]));
}
fs.writeFileSync('trading/data/bench.json', JSON.stringify(bench));
