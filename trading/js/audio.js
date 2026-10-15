/* Trading Academy — sons de l'interface. Tout est synthétisé avec WebAudio (aucun fichier), discret, et désactivable
   d'un clic (réglage conservé dans ta:sound). Les sons sont déclenchés par :
   - les clics sur les boutons et les tuiles (« tick ») ;
   - les corrigés qui apparaissent (bonne réponse, mauvaise réponse) ;
   - les points d'expérience, badges et changements de grade (appels depuis career.js). */
(function (root) {
  'use strict';
  const TA = (root.TA = root.TA || {});
  const SFX = (TA.SFX = {});
  const KEY = 'ta:sound';

  // [fréquence Hz, début s, durée s, forme d'onde, gain]
  const SOUNDS = {
    tick: [[1250, 0, 0.035, 'sine', 0.05]],
    good: [[523, 0, 0.11, 'triangle', 0.14], [659, 0.08, 0.11, 'triangle', 0.14], [784, 0.16, 0.2, 'triangle', 0.15]],
    bad: [[233, 0, 0.16, 'sawtooth', 0.07], [175, 0.1, 0.24, 'sawtooth', 0.07]],
    xp: [[880, 0, 0.07, 'sine', 0.1], [1318, 0.07, 0.14, 'sine', 0.1]],
    badge: [[659, 0, 0.1, 'triangle', 0.14], [784, 0.09, 0.1, 'triangle', 0.14], [988, 0.18, 0.1, 'triangle', 0.14], [1319, 0.27, 0.3, 'triangle', 0.15]],
    level: [[392, 0, 0.12, 'square', 0.07], [523, 0.12, 0.12, 'square', 0.07], [659, 0.24, 0.12, 'square', 0.07], [784, 0.36, 0.12, 'square', 0.07], [1047, 0.48, 0.45, 'square', 0.08]],
    open: [[440, 0, 0.06, 'sine', 0.06], [587, 0.05, 0.1, 'sine', 0.06]],
  };

  let on = true, ctx = null;
  const last = {};
  try { on = localStorage.getItem(KEY) !== '0'; } catch (e) { /* stockage indisponible */ }
  SFX.enabled = () => on;
  SFX.set = (v) => { on = !!v; try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (e) { /* rien */ } paintToggle(); if (on) SFX.play('open'); };
  SFX.names = Object.keys(SOUNDS);

  function audio() {
    if (ctx) return ctx;
    const AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch (e) { ctx = null; }
    return ctx;
  }
  SFX.play = function (name) {
    if (!on || !SOUNDS[name]) return;
    const nowMs = Date.now();
    if (nowMs - (last[name] || 0) < 40) return;
    last[name] = nowMs;
    const c = audio();
    if (!c) return;
    try {
      if (c.state === 'suspended') c.resume();
      const t0 = c.currentTime + 0.005;
      for (const [f, s, d, type, g] of SOUNDS[name]) {
        const o = c.createOscillator(), gn = c.createGain();
        o.type = type; o.frequency.value = f;
        gn.gain.setValueAtTime(0.0001, t0 + s);
        gn.gain.exponentialRampToValueAtTime(g, t0 + s + 0.012);
        gn.gain.exponentialRampToValueAtTime(0.0001, t0 + s + d);
        o.connect(gn); gn.connect(c.destination);
        o.start(t0 + s); o.stop(t0 + s + d + 0.03);
      }
    } catch (e) { /* le son ne doit jamais casser l'interface */ }
  };

  if (typeof document === 'undefined') return;
  let btn = null;
  function paintToggle() {
    if (!btn) return;
    btn.textContent = on ? '🔊' : '🔇';
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.title = on ? 'Sons activés : cliquer pour couper' : 'Sons coupés : cliquer pour activer';
  }
  function mount() {
    const top = document.querySelector('.top');
    if (!top || btn) return;
    btn = document.createElement('button');
    btn.type = 'button'; btn.id = 'sfx-toggle'; btn.className = 'btn sm ghost sfx-toggle'; btn.setAttribute('aria-label', 'Sons');
    btn.addEventListener('click', (e) => { e.stopPropagation(); SFX.set(!on); });
    top.appendChild(btn);
    paintToggle();
  }
  mount();

  // clic sur un contrôle actif : petit « tick »
  document.addEventListener('click', (e) => {
    const t = e.target.closest && e.target.closest('button, .btn, [role="button"], .mode-tile, .cp-tile, .ex-opt, label.opt');
    if (!t || t.disabled || t.id === 'sfx-toggle' || t.getAttribute('aria-disabled') === 'true') return;
    SFX.play('tick');
  }, true);

  // corrigés : une bonne ou une mauvaise réponse qui apparaît à l'écran
  function scan(node) {
    if (!node || node.nodeType !== 1) return null;
    const hit = (sel) => node.matches(sel) || node.querySelector(sel);
    if (hit('.fd.good, .cp-bub.good')) return 'good';
    if (hit('.fd.warn, .fd.bad, .cp-bub.warn')) return 'bad';
    const ex = node.matches('.expl') ? node : node.querySelector('.expl');
    if (ex) { const s = ex.querySelector('strong'); if (s) return /^Bonne/.test(s.textContent) ? 'good' : /^Pas tout/.test(s.textContent) ? 'bad' : null; }
    return null;
  }
  try {
    new MutationObserver((muts) => {
      let res = null;
      for (const m of muts) for (const n of m.addedNodes) { const r = scan(n); if (r) res = res === 'bad' ? res : r; }
      if (res) SFX.play(res);
    }).observe(document.body, { childList: true, subtree: true });
  } catch (e) { /* rien */ }
})(typeof window !== 'undefined' ? window : globalThis);
