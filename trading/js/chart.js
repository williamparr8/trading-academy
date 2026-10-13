/* Trading Academy — graphique en chandeliers (TradingView Lightweight Charts)
   Les dates réelles ne sont jamais données au graphique : l'axe du temps est fictif (J0 = jour de départ). */
(function () {
  'use strict';
  const TA = (window.TA = window.TA || {});
  const LW = window.LightweightCharts;
  const BASE = 1000000000, DAY = 86400;
  const tm = (i) => BASE + i * DAY;
  const idxOf = (t) => Math.round((t - BASE) / DAY);
  const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

  TA.PriceChart = class PriceChart {
    constructor(el, opts = {}) {
      this.onHover = opts.onHover || (() => {});
      this.g = null; this.i0 = 0; this.i1 = 0;
      this.flags = { vol: true, sma20: true, sma50: false, boll: false, rsi: false, macd: false };
      this.series = []; this.updaters = []; this.lines = [];
      const C = (this.C = {
        panel: css('--panel'), muted: css('--muted'), grid: css('--grid'), line: css('--line-2'),
        up: css('--up'), down: css('--down'), upA: css('--up-a'), downA: css('--down-a'),
        accent: css('--accent'), warn: css('--warn'), violet: css('--violet'), cyan: css('--cyan'),
      });
      const nf = new Intl.NumberFormat('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      this.chart = LW.createChart(el, {
        autoSize: true,
        layout: {
          background: { type: LW.ColorType.Solid, color: C.panel }, textColor: C.muted,
          fontFamily: css('--f-mono'), fontSize: 11, panes: { separatorColor: C.line, separatorHoverColor: C.grid },
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
      this.chart.subscribeCrosshairMove((p) => {
        const d = p.time != null && p.seriesData ? p.seriesData.get(this.candle) : null;
        this.onHover(d ? idxOf(p.time) : null);
      });
      this._applyFlags();
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
    setGame(g, st, flags) {
      this.g = g;
      if (flags) this.flags = { ...this.flags, ...flags };
      this.i0 = g.startIdx - TA.CFG.CTX;
      this.i1 = st.idx;
      this.candle.setData(this._candles(this.i0, this.i1));
      this.vol.setData(this._vols(this.i0, this.i1));
      this._applyFlags();
      this._rebuild();
      this.refresh(st);
      this.reset();
    }

    /* --- nouvelle barre révélée --- */
    push(st) {
      const g = this.g, i = st.idx;
      if (i <= this.i1) return;
      this.i1 = i;
      this.candle.update(this._candle(i));
      this.vol.update(this._vol(i));
      for (const u of this.updaters) u(i);
      this.refresh(st);
    }

    /* --- repères d'exécution et niveaux (entrée, stop, objectif, ordres en attente) --- */
    refresh(st) {
      const C = this.C, LS = LW.LineStyle;
      for (const l of this.lines) this.candle.removePriceLine(l);
      this.lines = [];
      const add = (price, color, title, style) =>
        this.lines.push(this.candle.createPriceLine({ price, color, lineWidth: 1, lineStyle: style, axisLabelVisible: true, title }));
      if (st.pos) {
        add(st.pos.avg, C.accent, 'Entrée', LS.Dotted);
        if (st.pos.sl != null) add(st.pos.sl, C.down, 'Stop', LS.Dashed);
        if (st.pos.tp != null) add(st.pos.tp, C.up, 'Objectif', LS.Dashed);
        const lp = TA.liqPrice(this.g, st);   // positions à levier ou vendues à découvert : prix où la plateforme liquide
        if (lp != null) add(lp, C.down, 'Liquidation', LS.SparseDotted);
      }
      for (const o of st.orders) add(o.price, C.warn, (o.side === 'buy' ? 'Achat ' : 'Vente ') + (o.type === 'limit' ? 'limite' : 'stop'), LS.Dashed);
      this.markers.setMarkers(
        st.fills.filter((f) => f.idx >= this.i0).map((f) => ({
          time: tm(f.idx), position: f.side === 'buy' ? 'belowBar' : 'aboveBar', shape: f.side === 'buy' ? 'arrowUp' : 'arrowDown',
          color: f.side === 'buy' ? C.up : C.down, text: (f.side === 'buy' ? 'A ' : 'V ') + f.qty,
        }))
      );
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
    setFlags(flags) {
      this.flags = { ...this.flags, ...flags };
      this._applyFlags();
      if (this.g) { this._rebuild(); }
    }
    _applyFlags() {
      this.vol.applyOptions({ visible: !!this.flags.vol });
      this.candle.priceScale().applyOptions({ scaleMargins: { top: 0.06, bottom: this.flags.vol ? 0.2 : 0.06 } });
    }
    _rebuild() {
      const ch = this.chart, g = this.g, f = this.flags, C = this.C;
      for (const s of this.series) ch.removeSeries(s);
      this.series = []; this.updaters = [];
      let pane = 1;
      const pts = (arr, i) => ({ time: tm(i), value: arr[i] });
      const line = (arr, color, p, extra = {}) => {
        const s = ch.addSeries(LW.LineSeries, { color, lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false, ...extra }, p);
        const data = [];
        for (let i = this.i0; i <= this.i1; i++) if (!isNaN(arr[i])) data.push(pts(arr, i));
        s.setData(data);
        this.series.push(s);
        this.updaters.push((i) => { if (!isNaN(arr[i])) s.update(pts(arr, i)); });
        return s;
      };
      if (f.sma20) line(g.ind.sma20, C.warn, 0);
      if (f.sma50) line(g.ind.sma50, C.accent, 0);
      if (f.boll) {
        line(g.ind.boll.up, C.violet, 0); line(g.ind.boll.lo, C.violet, 0);
        line(g.ind.boll.mid, C.violet, 0, { lineStyle: LW.LineStyle.Dotted });
      }
      if (f.rsi) {
        const s = line(g.ind.rsi, C.cyan, pane, { lastValueVisible: true, autoscaleInfoProvider: () => ({ priceRange: { minValue: 0, maxValue: 100 } }) });
        for (const p of [30, 70]) s.createPriceLine({ price: p, color: C.line, lineWidth: 1, lineStyle: LW.LineStyle.Dashed, axisLabelVisible: false });
        pane++;
      }
      if (f.macd) {
        const m = g.ind.macd;
        const h = ch.addSeries(LW.HistogramSeries, { priceLineVisible: false, lastValueVisible: false }, pane);
        const hp = (i) => ({ time: tm(i), value: m.hist[i], color: m.hist[i] >= 0 ? C.upA : C.downA });
        const data = [];
        for (let i = this.i0; i <= this.i1; i++) if (!isNaN(m.hist[i])) data.push(hp(i));
        h.setData(data);
        this.series.push(h);
        this.updaters.push((i) => { if (!isNaN(m.hist[i])) h.update(hp(i)); });
        line(m.line, C.accent, pane);
        line(m.signal, C.warn, pane);
        pane++;
      }
      // les volets vides disparaissent ; les proportions suivent les volets actifs
      while (ch.panes().length > pane) ch.removePane(ch.panes().length - 1);
      const ps = ch.panes();
      ps.forEach((p, k) => p.setStretchFactor(k === 0 ? 3.2 : 1));
    }

    /* --- données --- */
    _candle(i) { const g = this.g; return { time: tm(i), open: g.o[i], high: g.h[i], low: g.l[i], close: g.c[i] }; }
    _vol(i) { const g = this.g; return { time: tm(i), value: g.v[i], color: g.c[i] >= g.o[i] ? this.C.upA : this.C.downA }; }
    _candles(a, b) { const o = []; for (let i = a; i <= b; i++) o.push(this._candle(i)); return o; }
    _vols(a, b) { const o = []; for (let i = a; i <= b; i++) o.push(this._vol(i)); return o; }
  };
})();
