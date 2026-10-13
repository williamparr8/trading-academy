// Phase 6 : ajoute des actions et des FNB (ETF) à data/ sans toucher aux actifs existants.
// Même conversion que fetch-data.mjs : cotes quotidiennes ajustées des dividendes et fractionnements.
import fs from 'node:fs';

const MORE = [
  // [symbole Yahoo, nom, bourse, secteur]
  ['TSLA', 'Tesla', 'Nasdaq', 'Automobile'], ['NFLX', 'Netflix', 'Nasdaq', 'Médias'],
  ['META', 'Meta Platforms', 'Nasdaq', 'Communications'], ['AMD', 'AMD', 'Nasdaq', 'Semi-conducteurs'],
  ['PFE', 'Pfizer', 'NYSE', 'Santé'], ['CVX', 'Chevron', 'NYSE', 'Énergie'],
  ['MCD', 'McDonald’s', 'NYSE', 'Consommation discrétionnaire'],
  ['BNS.TO', 'Banque Scotia', 'TSX', 'Finance'], ['CP.TO', 'Canadien Pacifique Kansas City', 'TSX', 'Transport'],
  ['MFC.TO', 'Manuvie', 'TSX', 'Finance'],   // ATD.TO écarté : volume manquant avant 2017 (classe B peu liquide)
  // FNB : un panier d'actifs négocié comme une action
  ['SPY', 'SPDR S&P 500 (FNB)', 'NYSE Arca', 'FNB – Actions américaines'],
  ['QQQ', 'Invesco QQQ, Nasdaq-100 (FNB)', 'Nasdaq', 'FNB – Technologie américaine'],
  ['IWM', 'iShares Russell 2000 (FNB)', 'NYSE Arca', 'FNB – Petites capitalisations'],
  ['GLD', 'SPDR Gold Shares (FNB)', 'NYSE Arca', 'FNB – Or'],
  ['TLT', 'iShares obligations du Trésor 20 ans et plus (FNB)', 'Nasdaq', 'FNB – Obligations'],
  ['XIU.TO', 'iShares S&P/TSX 60 (FNB)', 'TSX', 'FNB – Actions canadiennes'],
  ['ZEB.TO', 'BMO Banques canadiennes à pondération égale (FNB)', 'TSX', 'FNB – Banques canadiennes'],
  ['XEG.TO', 'iShares S&P/TSX énergie plafonné (FNB)', 'TSX', 'FNB – Énergie canadienne'],
];
const P1 = 1104710400; // 2005-01-03
const P2 = Math.floor(Date.now() / 1000) + 86400;
const todayDay = Math.floor(Date.now() / 86400000);
const iso = (d) => new Date(d * 86400000).toISOString().slice(0, 10);
const r4 = (x) => Math.round(x * 10000) / 10000;

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
  const adj = res.indicators.adjclose?.[0]?.adjclose;
  const out = { t: [], o: [], h: [], l: [], c: [], v: [] };
  let lastDay = -1;
  res.timestamp.forEach((ts, i) => {
    const o = q.open[i], h = q.high[i], l = q.low[i], c = q.close[i];
    if ([o, h, l, c].some((x) => x == null || !(x > 0))) return;
    const day = Math.floor((ts + off) / 86400);
    if (day <= lastDay || day >= todayDay) return;
    lastDay = day;
    const f = adj && adj[i] > 0 ? adj[i] / c : 1;
    const O = o * f, C = c * f;
    out.t.push(day); out.o.push(r4(O)); out.h.push(r4(Math.max(h * f, O, C))); out.l.push(r4(Math.min(l * f, O, C))); out.c.push(r4(C)); out.v.push(q.volume[i] || 0);
  });
  return out;
}

const index = JSON.parse(fs.readFileSync('trading/data/index.json', 'utf8'));
for (const [sym, name, exch, sector] of MORE) {
  const file = sym.replace(/[^A-Za-z0-9]/g, '_');
  if (fs.existsSync(`trading/data/${file}.json`) && !process.argv.includes('--force')) { console.log('déjà là', sym); continue; }
  const res = await get(sym), d = convert(res);
  // bornes de sûreté : un fichier vide ou avec un énorme saut de prix est refusé
  let worst = 0;
  for (let i = 1; i < d.c.length; i++) worst = Math.max(worst, Math.abs(d.c[i] / d.c[i - 1] - 1));
  if (d.t.length < 500 || worst > 0.6) { console.log('REFUSÉ', sym, d.t.length, 'plus grand écart', (worst * 100).toFixed(0) + ' %'); continue; }
  fs.writeFileSync(`trading/data/${file}.json`, JSON.stringify({ s: sym, n: name, x: exch, sec: sector, cur: res.meta.currency, mk: 'stock', ...d }));
  index.assets = index.assets.filter((a) => a.id !== file);
  index.assets.push({ id: file, mk: 'stock', from: d.t[0], to: d.t[d.t.length - 1], n: d.t.length });
  console.log(sym.padEnd(8), String(d.t.length).padStart(5), iso(d.t[0]), iso(d.t[d.t.length - 1]), res.meta.currency, 'écart max', (worst * 100).toFixed(1) + ' %');
  await new Promise((r) => setTimeout(r, 400));
}
fs.writeFileSync('trading/data/index.json', JSON.stringify(index));
console.log('index.json :', index.assets.length, 'actifs');
