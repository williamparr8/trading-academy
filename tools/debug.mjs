import '../trading/js/engine.js';
const TA = globalThis.TA;
function synth(bars) {
  const len = bars.length + 100;
  const mk = (f) => Float64Array.from({ length: len }, (_, i) => (i < 100 ? 100 : bars[i - 100][f]));
  return { startIdx: 100, endIdx: len - 1, N: len, c: mk(3), o: mk(0), h: mk(1), l: mk(2), t: Array.from({ length: len }, (_, i) => i), v: new Float64Array(len).fill(1), meta: {}, unit: 'J', style: 'swing', market: 'forex' };
}
const g = synth([[100, 100.5, 99.5, 100], [100, 100.2, 80, 85]]);
const st = TA.newState(g, 'soft', 2, 5);
const qs = TA.maxQty(g, st, 100.01, 1);
console.log('qty', qs, TA.submit(g, st, { side: 'buy', type: 'market', qty: qs, j: { reason: 'trend', emotion: 'calm' } }));
console.log('liq', TA.liqPrice(g, st), 'cash', st.cash, 'pos', st.pos.qty, st.pos.avg);
const ev = TA.advance(g, st);
console.log(ev, 'pos', st.pos, 'ruined', st.ruined, 'eq', TA.metrics(g, st).equity, st.trades.map((t) => [t.exit, t.net, t.reason]));
