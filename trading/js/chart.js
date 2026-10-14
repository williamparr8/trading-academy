/* Trading Academy — graphique en chandeliers (TradingView Lightweight Charts).
   - indicateurs ajoutables et retirables, avec leurs paramètres ;
   - outils de dessin : ligne horizontale (support / résistance), tendance, zone ;
   - stop-loss et objectif posés ou déplacés directement sur le graphique.
   Les dates réelles ne sont jamais données au graphique : l'axe du temps est fictif (J0 = jour de départ). */
(function () {
  'use strict';
  const TA = (window.TA = window.TA || {});
  const LW = window.LightweightCharts;
  const BASE = 1000000000, DAY = 86400;
  const tm = (i) => BASE + i * DAY;
  const idxOf = (t) => Math.round((t - BASE) / DAY);
  const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const HIT = 7;      // tolérance de sélection en pixels
  const SNAP = 8;     // aimantation aux prix d'ouverture, haut, bas et clôture

  // Couche de dessin attachée à la série de chandeliers : elle est redessinée par le graphique à chaque changement
  // d'échelle (zoom, défilement, nouvelle barre), donc les tracés restent collés aux prix.
  class DrawLayer {
    constructor(owner) {
      this.owner = owner;
      this.views = [{ zOrder: () => 'top', renderer: () => ({ draw: (t) => owner._paint(t) }) }];
    }
    attached(p) { this.req = p.requestUpdate; }
    detached() { this.req = null; }
    updateAllViews() { /* rien : tout se calcule au dessin */ }
    paneViews() { return this.views; }
    update() { if (this.req) this.req(); }
  }

  TA.PriceChart = class PriceChart {
    constructor(el, opts = {}) {
      this.el = el;
      this.cb = { onHover() {}, onDraw() {}, onErase() {}, onMove() {}, onExit() {}, onTool() {}, onSelect() {}, ...opts };
      this.g = null; this.st = null; this.i0 = 0; this.i1 = 0;
      this.inds = []; this.series = []; this.updaters = []; this.lines = []; this._cache = new Map();
      this.tool = 'cursor'; this.sel = null; this.pending = null; this.hover = null; this.drag = null; this.dragDraw = null;
      this.ticket = { sl: null, tp: null };
      const C = (this.C = {
        panel: css('--panel'), muted: css('--muted'), grid: css('--grid'), line: css('--line-2'),
        up: css('--up'), down: css('--down'), upA: css('--up-a'), downA: css('--down-a'),
        accent: css('--accent'), warn: css('--warn'), violet: css('--violet'), cyan: css('--cyan'), warnA: css('--warn-a'), text: css('--text'),
        mono: css('--f-mono'),
      });
      this.pal = [C.warn, C.accent, C.violet, C.cyan, '#e879a6', '#a3b3c4'];
      const nf = (this.nf = new Intl.NumberFormat('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
      this.chart = LW.createChart(el, {
        autoSize: true,
        layout: {
          background: { type: LW.ColorType.Solid, color: C.panel }, textColor: C.muted,
          fontFamily: C.mono, fontSize: 11, panes: { separatorColor: C.line, separatorHoverColor: C.grid },
        },
        grid: { vertLines: { color: C.grid }, horzLines: { color: C.grid } },
        crosshair: { mode: LW.CrosshairMode.Normal },
        rightPriceScale: { borderColor: C.line },
        timeScale: {
          borderColor: C.line, rightOffset: 8, timeVisible: false, secondsVisible: false,
          tickMarkFormatter: (t) => this.label(t, false),
        },
        localization: { priceFormatter: (p) => nf.format(p), timeFormatter: (t) => this.label(t, true) },
      });
      this.candle = this.chart.addSeries(LW.CandlestickSeries, {
        upColor: C.up, downColor: C.down, wickUpColor: C.up, wickDownColor: C.down, borderVisible: false,
        priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
      });
      this.vol = this.chart.addSeries(LW.HistogramSeries, {
        priceScaleId: 'vol', priceFormat: { type: 'volume' }, lastValueVisible: false, priceLineVisible: false,
      });
      this.vol.priceScale().applyOptions({ scaleMargins: { top: 0.84, bottom: 0 }, visible: false });
      this.markers = LW.createSeriesMarkers(this.candle, []);
      this.layer = new DrawLayer(this);
      this.candle.attachPrimitive(this.layer);
      this.chart.subscribeCrosshairMove((p) => {
        const d = p.time != null && p.seriesData ? p.seriesData.get(this.candle) : null;
        this.cb.onHover(d ? idxOf(p.time) : null);
        this.hover = p.point ? { x: p.point.x, y: p.point.y } : null;
        if (this.tool !== 'cursor' || this.pending) this.layer.update();
      });
      this.chart.subscribeClick((p) => this._click(p));
      this._bindDrag();
    }

    label(t, long) {
      if (!this.g) return '';
      if (this.g.live) {   // compte Live : vraies dates
        const day = this.g.t[Math.min(Math.max(idxOf(t), 0), this.g.t.length - 1)];
        return new Date(day * 86400000).toLocaleDateString('fr-CA', long ? { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' } : { day: 'numeric', month: 'short', timeZone: 'UTC' });
      }
      const rel = idxOf(t) - this.g.startIdx;
      const word = long ? (this.g.style === 'long' ? 'Semaine ' : 'Jour ') : this.g.unit;
      return word + (rel < 0 ? '−' + -rel : rel);
    }

    /* --- chargement d'une partie --- */
    setGame(g, st, inds) {
      this.g = g; this.st = st;
      if (inds) this.inds = inds;
      this._cache.clear();
      this.tool = 'cursor'; this.sel = null; this.pending = null; this.drag = null; this.dragDraw = null;
      this.el.classList.remove('tool-on', 'hot');
      this.i0 = g.startIdx - TA.CFG.CTX;
      this.i1 = st.idx;
      this.candle.setData(this._candles(this.i0, this.i1));
      this.vol.setData(this._vols(this.i0, this.i1));
      this._rebuild();
      this.refresh(st);
      this.reset();
    }

    /* --- nouvelle barre révélée --- */
    push(st) {
      const i = st.idx;
      this.st = st;
      if (i <= this.i1) return;
      this.i1 = i;
      this.candle.update(this._candle(i));
      this.vol.update(this._vol(i));
      for (const u of this.updaters) u(i);
      this.refresh(st);
    }

    /* --- repères d'exécution et niveaux (entrée, stop, objectif, ordres en attente) --- */
    refresh(st) {
      this.st = st;
      this._lines();
      const C = this.C;
      this.markers.setMarkers(
        st.fills.filter((f) => f.idx >= this.i0).map((f) => ({
          time: tm(f.idx), position: f.side === 'buy' ? 'belowBar' : 'aboveBar', shape: f.side === 'buy' ? 'arrowUp' : 'arrowDown',
          color: f.side === 'buy' ? C.up : C.down, text: (f.side === 'buy' ? 'A ' : 'V ') + f.qty,
        }))
      );
      this.layer.update();
    }
    // Stop et objectif saisis dans le ticket (sans position ouverte) : affichés sur le graphique, déplaçables.
    setTicket(t) {
      const sl = t && t.sl > 0 ? t.sl : null, tp = t && t.tp > 0 ? t.tp : null;
      if (sl === this.ticket.sl && tp === this.ticket.tp) return;
      this.ticket = { sl, tp };
      if (this.st && !this.st.pos && !this.drag) this._lines();
    }
    _lines() {
      if (!this.st || !this.g) return;
      const C = this.C, LS = LW.LineStyle, st = this.st;
      for (const l of this.lines) this.candle.removePriceLine(l.line);
      this.lines = [];
      const add = (price, color, title, style, kind, src) => {
        const line = this.candle.createPriceLine({ price, color, lineWidth: 1, lineStyle: style, axisLabelVisible: true, title });
        this.lines.push({ line, kind: kind || null, src: src || null, price });
      };
      if (st.pos) {
        add(st.pos.avg, C.accent, 'Entrée', LS.Dotted);
        if (st.pos.sl != null) add(st.pos.sl, C.down, 'Stop', LS.Dashed, 'sl', 'pos');
        if (st.pos.tp != null) add(st.pos.tp, C.up, 'Objectif', LS.Dashed, 'tp', 'pos');
        const lp = TA.liqPrice(this.g, st);   // positions à levier ou vendues à découvert : prix où la plateforme liquide
        if (lp != null) add(lp, C.down, 'Liquidation', LS.SparseDotted);
      } else {
        if (this.ticket.sl != null) add(this.ticket.sl, C.down, 'Stop (ordre)', LS.Dashed, 'sl', 'ticket');
        if (this.ticket.tp != null) add(this.ticket.tp, C.up, 'Objectif (ordre)', LS.Dashed, 'tp', 'ticket');
      }
      for (const o of st.orders) add(o.price, C.warn, (o.side === 'buy' ? 'Achat ' : 'Vente ') + (o.type === 'limit' ? 'limite' : 'stop'), LS.Dashed);
    }

    /* --- zoom --- */
    zoom(f) {
      const ts = this.chart.timeScale(), r = ts.getVisibleLogicalRange();
      if (!r) return;
      const w = Math.min(Math.max((r.to - r.from) * f, 12), 600);
      ts.setVisibleLogicalRange({ from: r.to - w, to: r.to });
    }
    reset() {
      const n = this.i1 - this.i0 + 1;
      this.chart.timeScale().setVisibleLogicalRange({ from: Math.max(0, n - 80), to: n + 8 });
    }

    /* --- indicateurs --- */
    setIndicators(list) {
      this.inds = list || [];
      if (this.g) this._rebuild();
    }
    _calc(ind) {
      const g = this.g, I = TA.ind, key = [ind.t, ind.n, ind.k, ind.f, ind.s, ind.g].join(':');
      if (this._cache.has(key)) return this._cache.get(key);
      let v = null;
      if (ind.t === 'sma') v = I.sma(g.c, ind.n);
      else if (ind.t === 'ema') v = I.ema(g.c, ind.n);
      else if (ind.t === 'boll') v = I.boll(g.c, ind.n, ind.k);
      else if (ind.t === 'rsi') v = I.rsi(g.c, ind.n);
      else if (ind.t === 'macd') v = I.macd(g.c, ind.f, ind.s, ind.g);
      else if (ind.t === 'atr') v = I.atr(g.h, g.l, g.c, ind.n);
      this._cache.set(key, v);
      return v;
    }
    _line(arr, color, pane, extra = {}) {
      const s = this.chart.addSeries(LW.LineSeries, { color, lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false, ...extra }, pane);
      const pts = (i) => ({ time: tm(i), value: arr[i] }), data = [];
      for (let i = this.i0; i <= this.i1; i++) if (!isNaN(arr[i])) data.push(pts(i));
      s.setData(data);
      this.series.push(s);
      this.updaters.push((i) => { if (!isNaN(arr[i])) s.update(pts(i)); });
      return s;
    }
    _rebuild() {
      const ch = this.chart, C = this.C, LS = LW.LineStyle;
      for (const s of this.series) ch.removeSeries(s);
      this.series = []; this.updaters = [];
      let pane = 1, vol = false;
      for (const ind of this.inds) {
        const col = this.pal[(ind.c | 0) % this.pal.length];
        if (ind.t === 'vol') { vol = true; continue; }
        const v = this._calc(ind);
        if (!v) continue;
        if (ind.t === 'sma' || ind.t === 'ema') this._line(v, col, 0);
        else if (ind.t === 'boll') {
          this._line(v.up, col, 0); this._line(v.lo, col, 0);
          this._line(v.mid, col, 0, { lineStyle: LS.Dotted });
        } else if (ind.t === 'rsi') {
          const s = this._line(v, col, pane, { lastValueVisible: true, autoscaleInfoProvider: () => ({ priceRange: { minValue: 0, maxValue: 100 } }) });
          for (const p of [30, 70]) s.createPriceLine({ price: p, color: C.line, lineWidth: 1, lineStyle: LS.Dashed, axisLabelVisible: false });
          pane++;
        } else if (ind.t === 'macd') {
          const h = ch.addSeries(LW.HistogramSeries, { priceLineVisible: false, lastValueVisible: false }, pane);
          const hp = (i) => ({ time: tm(i), value: v.hist[i], color: v.hist[i] >= 0 ? C.upA : C.downA }), data = [];
          for (let i = this.i0; i <= this.i1; i++) if (!isNaN(v.hist[i])) data.push(hp(i));
          h.setData(data);
          this.series.push(h);
          this.updaters.push((i) => { if (!isNaN(v.hist[i])) h.update(hp(i)); });
          this._line(v.line, col, pane);
          this._line(v.signal, C.warn, pane);
          pane++;
        } else if (ind.t === 'atr') {
          this._line(v, col, pane, { lastValueVisible: true });
          pane++;
        }
      }
      this.vol.applyOptions({ visible: vol });
      this.candle.priceScale().applyOptions({ scaleMargins: { top: 0.06, bottom: vol ? 0.2 : 0.06 } });
      // les volets vides disparaissent ; les proportions suivent les volets actifs
      while (ch.panes().length > pane) ch.removePane(ch.panes().length - 1);
      ch.panes().forEach((p, k) => p.setStretchFactor(k === 0 ? 3.2 : 1));
    }

    /* --- outils de dessin --- */
    setTool(t) {
      this.tool = t; this.pending = null;
      if (t !== 'cursor') this._select(null);
      this.el.classList.toggle('tool-on', t !== 'cursor');
      this.layer.update();
    }
    _select(id) {
      if (this.sel === id) return;
      this.sel = id; this.cb.onSelect(id); this.layer.update();
    }
    select(id) { this._select(id); }
    _finish() { this.tool = 'cursor'; this.pending = null; this.el.classList.remove('tool-on'); this.cb.onTool('cursor'); this.layer.update(); }

    _idxAt(x) {
      const l = this.chart.timeScale().coordinateToLogical(x);
      const i = l == null ? this.i1 : Math.round(l) + this.i0;
      return Math.max(this.i0, Math.min(this.i1, i));
    }
    // Aimante le prix cliqué à l'ouverture, au haut, au bas ou à la clôture de la barre voisine.
    _snap(i, y, price) {
      const g = this.g; let best = price, bd = SNAP + 1;
      for (const v of [g.o[i], g.h[i], g.l[i], g.c[i]]) {
        const vy = this.candle.priceToCoordinate(v);
        if (vy == null) continue;
        const d = Math.abs(vy - y);
        if (d < bd) { bd = d; best = v; }
      }
      return bd <= SNAP ? best : price;
    }
    _click(p) {
      if (!this.g || !p || !p.point) return;
      const { x, y } = p.point;
      const raw = this.candle.coordinateToPrice(y);
      if (raw == null || !(raw > 0)) return;
      const t = this.tool;
      if (t === 'cursor') { this._select(this._hitDraw(x, y)); return; }
      if (t === 'erase') { const id = this._hitDraw(x, y); if (id != null) this.cb.onErase(id); return; }
      const i = this._idxAt(x);
      if (t === 'sl' || t === 'tp') {
        this.cb.onExit(t, raw, this.st.pos ? 'pos' : 'ticket');
        this._finish();
        return;
      }
      const price = this._snap(i, y, raw);
      if (t === 'h') { this.cb.onDraw({ k: 'h', p: price }); this._finish(); return; }
      if (!this.pending) { this.pending = { i, p: price }; this.layer.update(); return; }
      const a = this.pending;
      this.pending = null;
      this.cb.onDraw({ k: t, a, b: { i, p: price } });
      this._finish();
    }

    // Géométrie d'un tracé en pixels (null si hors échelle).
    _geom(d, W) {
      const X = (i) => this.chart.timeScale().logicalToCoordinate(i - this.i0), Y = (p) => this.candle.priceToCoordinate(p);
      if (d.k === 'h') {
        const p = this.dragDraw && this.dragDraw.id === d.id ? this.dragDraw.p : d.p, y = Y(p);
        return y == null ? null : { k: 'h', p, y };
      }
      const xa = X(d.a.i), ya = Y(d.a.p), xb = X(d.b.i), yb = Y(d.b.p);
      if ([xa, ya, xb, yb].some((v) => v == null)) return null;
      return { k: d.k, xa, ya, xb, yb, W };
    }
    _dist(gm, x, y) {
      if (gm.k === 'h') return Math.abs(y - gm.y);
      if (gm.k === 'r') {
        const l = Math.min(gm.xa, gm.xb), top = Math.min(gm.ya, gm.yb), bot = Math.max(gm.ya, gm.yb);
        if (x < l - HIT || y < top - HIT || y > bot + HIT) return 1e9;
        const edge = Math.min(Math.abs(y - top), Math.abs(y - bot));
        return y >= top && y <= bot ? Math.min(HIT - 0.5, edge) : edge;   // à l'intérieur : un trait posé dessus reste prioritaire
      }
      // tendance : demi-droite qui part du point de gauche et traverse l'autre point, jusqu'au bord droit
      const [x1, y1, x2, y2] = gm.xa <= gm.xb ? [gm.xa, gm.ya, gm.xb, gm.yb] : [gm.xb, gm.yb, gm.xa, gm.ya];
      if (x < x1 - HIT) return 1e9;
      if (Math.abs(x2 - x1) < 1) return Math.abs(x - x1);
      const yl = y1 + ((y2 - y1) * (x - x1)) / (x2 - x1);
      return Math.abs(y - yl) / Math.sqrt(1 + ((y2 - y1) / (x2 - x1)) ** 2);
    }
    _hitDraw(x, y) {
      const W = this.el.clientWidth, ds = (this.st && this.st.draw) || [];
      let best = null, bd = HIT + 0.001;
      for (let k = ds.length - 1; k >= 0; k--) {
        const gm = this._geom(ds[k], W);
        if (!gm) continue;
        const d = this._dist(gm, x, y);
        if (d < bd) { bd = d; best = ds[k].id; }
      }
      return best;
    }

    /* --- glisser un stop, un objectif ou une ligne horizontale --- */
    _dragTarget(x, y) {
      if (this.tool !== 'cursor' || !this.g || !this.st) return null;
      let best = null, bd = HIT + 0.001;
      for (const l of this.lines) {
        if (!l.kind) continue;
        const ly = this.candle.priceToCoordinate(l.price);
        if (ly == null) continue;
        const d = Math.abs(ly - y);
        if (d < bd) { bd = d; best = { kind: l.kind, src: l.src, line: l }; }
      }
      for (const d of this.st.draw || []) {
        if (d.k !== 'h') continue;
        const ly = this.candle.priceToCoordinate(d.p);
        if (ly == null) continue;
        const dd = Math.abs(ly - y);
        if (dd < bd) { bd = dd; best = { kind: 'draw', id: d.id }; }
      }
      return best;
    }
    _bindDrag() {
      const pos = (cx, cy) => { const r = this.el.getBoundingClientRect(); return { x: cx - r.left, y: cy - r.top }; };
      const inside = (p) => p.x >= 0 && p.y >= 0 && p.x <= this.chart.timeScale().width() && p.y <= this.el.clientHeight;   // pas sur l'échelle des prix
      const lock = (on) => this.chart.applyOptions({ handleScroll: !on, handleScale: !on });
      const start = (cx, cy, e) => {
        const p = pos(cx, cy), tgt = inside(p) ? this._dragTarget(p.x, p.y) : null;
        if (!tgt) return;
        e.stopPropagation(); if (e.cancelable) e.preventDefault();
        this.drag = tgt; lock(true);
        this.el.classList.add('hot');
        if (tgt.kind === 'draw') this._select(tgt.id);
      };
      const move = (cx, cy, e) => {
        if (!this.drag && !this.el.offsetParent) return;
        const p = pos(cx, cy);
        if (!this.drag) {
          this.el.classList.toggle('hot', inside(p) && !!this._dragTarget(p.x, p.y));
          return;
        }
        if (e && e.cancelable) e.preventDefault();
        const price = this.candle.coordinateToPrice(p.y);
        if (price == null || !(price > 0)) return;
        this.drag.price = price;
        if (this.drag.kind === 'draw') { this.dragDraw = { id: this.drag.id, p: price }; this.layer.update(); }
        else this.drag.line.line.applyOptions({ price });
      };
      const end = () => {
        const d = this.drag;
        if (!d) return;
        this.drag = null; lock(false);
        this.el.classList.remove('hot');
        const price = d.price;
        if (d.kind === 'draw') {
          this.dragDraw = null;
          if (price != null) this.cb.onMove(d.id, price);
          this.layer.update();
        } else if (price != null) this.cb.onExit(d.kind, price, d.src);
        else this._lines();
      };
      // la bibliothèque écoute souris et toucher : on intercepte avant elle seulement quand on attrape une ligne
      this.el.addEventListener('mousedown', (e) => { if (e.button === 0) start(e.clientX, e.clientY, e); }, true);
      this.el.addEventListener('touchstart', (e) => { const t = e.touches[0]; if (t) start(t.clientX, t.clientY, e); }, { capture: true, passive: false });
      window.addEventListener('mousemove', (e) => move(e.clientX, e.clientY, e));
      window.addEventListener('touchmove', (e) => { if (this.drag && e.touches[0]) move(e.touches[0].clientX, e.touches[0].clientY, e); }, { passive: false });
      window.addEventListener('mouseup', end);
      window.addEventListener('touchend', end);
      window.addEventListener('touchcancel', end);
    }

    /* --- rendu des tracés --- */
    _paint(target) {
      if (!this.g || !this.st) return;
      target.useMediaCoordinateSpace(({ context: ctx, mediaSize }) => {
        const W = mediaSize.width, C = this.C, st = this.st, last = this.g.c[st.idx], nf = (p) => this.nf.format(p);
        ctx.save();
        ctx.font = `600 11px ${C.mono}`; ctx.textBaseline = 'middle';
        const line = (x1, y1, x2, y2) => { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
        const tag = (text, x, y, color, right) => {
          const w = ctx.measureText(text).width + 10;
          const x0 = right ? x - w : x;
          ctx.fillStyle = C.panel; ctx.globalAlpha = 0.85; ctx.fillRect(x0, y - 8, w, 16); ctx.globalAlpha = 1;
          ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.setLineDash([]); ctx.strokeRect(x0 + 0.5, y - 7.5, w - 1, 15);
          ctx.fillStyle = color; ctx.textAlign = 'left'; ctx.fillText(text, x0 + 5, y + 0.5);
        };
        const dot = (x, y, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = C.panel; ctx.lineWidth = 1.5; ctx.stroke(); };
        for (const d of st.draw || []) {
          const gm = this._geom(d, W);
          if (!gm) continue;
          const sel = d.id === this.sel;
          ctx.setLineDash([]);
          if (gm.k === 'h') {
            const sup = gm.p < last, col = sup ? C.cyan : C.violet;
            ctx.strokeStyle = col; ctx.lineWidth = sel ? 2.5 : 1.5;
            line(0, gm.y, W, gm.y);
            tag(`${sup ? 'Support' : 'Résistance'} ${nf(gm.p)}`, W - 8, gm.y - 12, col, true);
          } else if (gm.k === 'r') {
            const l = Math.max(0, Math.min(gm.xa, gm.xb)), top = Math.min(gm.ya, gm.yb), h = Math.abs(gm.yb - gm.ya);
            ctx.fillStyle = C.warnA; ctx.fillRect(l, top, W - l, h);
            ctx.strokeStyle = C.warn; ctx.lineWidth = sel ? 2 : 1; ctx.setLineDash([5, 4]);
            ctx.strokeRect(l + 0.5, top + 0.5, W - l - 1, h);
            ctx.setLineDash([]);
            tag(`Zone ${nf(Math.min(d.a.p, d.b.p))} – ${nf(Math.max(d.a.p, d.b.p))}`, W - 8, top - 10 < 10 ? top + h + 10 : top - 10, C.warn, true);
          } else {
            const [x1, y1, x2, y2] = gm.xa <= gm.xb ? [gm.xa, gm.ya, gm.xb, gm.yb] : [gm.xb, gm.yb, gm.xa, gm.ya];
            const yEnd = Math.abs(x2 - x1) < 1 ? y2 : y1 + ((y2 - y1) * (W - x1)) / (x2 - x1);
            ctx.strokeStyle = C.accent; ctx.lineWidth = sel ? 2.5 : 1.5;
            line(x1, y1, W, yEnd);
            dot(gm.xa, gm.ya, C.accent); dot(gm.xb, gm.yb, C.accent);
          }
        }
        // aperçu : premier point posé, guide sous le curseur
        const hv = this.hover, t = this.tool;
        if (this.pending) {
          const xa = this.chart.timeScale().logicalToCoordinate(this.pending.i - this.i0), ya = this.candle.priceToCoordinate(this.pending.p);
          if (xa != null && ya != null) {
            dot(xa, ya, C.accent);
            if (hv) {
              ctx.setLineDash([5, 4]); ctx.lineWidth = 1; ctx.strokeStyle = C.accent;
              if (t === 'r') { ctx.fillStyle = C.warnA; ctx.fillRect(Math.min(xa, hv.x), Math.min(ya, hv.y), W - Math.min(xa, hv.x), Math.abs(hv.y - ya)); }
              else line(xa, ya, hv.x, hv.y);
            }
          }
        }
        if (hv && (t === 'h' || t === 'sl' || t === 'tp')) {
          const p = this.candle.coordinateToPrice(hv.y);
          if (p != null && p > 0) {
            const col = t === 'sl' ? C.down : t === 'tp' ? C.up : C.muted, name = t === 'sl' ? 'Stop-loss' : t === 'tp' ? 'Objectif' : 'Niveau';
            ctx.setLineDash([4, 4]); ctx.lineWidth = 1; ctx.strokeStyle = col;
            line(0, hv.y, W, hv.y);
            tag(`${name} ${nf(p)}`, 8, hv.y - 12, col, false);
          }
        }
        ctx.restore();
      });
    }

    /* --- données --- */
    _candle(i) { const g = this.g; return { time: tm(i), open: g.o[i], high: g.h[i], low: g.l[i], close: g.c[i] }; }
    _vol(i) { const g = this.g; return { time: tm(i), value: g.v[i], color: g.c[i] >= g.o[i] ? this.C.upA : this.C.downA }; }
    _candles(a, b) { const o = []; for (let i = a; i <= b; i++) o.push(this._candle(i)); return o; }
    _vols(a, b) { const o = []; for (let i = a; i <= b; i++) o.push(this._vol(i)); return o; }
  };
})();
