/* Trading Academy — installation sur l'écran d'accueil et indicateur hors ligne.
   Le navigateur n'émet « beforeinstallprompt » que sur le site déployé (pas dans l'artifact) : ailleurs, ce fichier ne fait rien. */
(function (root) {
  'use strict';
  if (typeof document === 'undefined') return;
  let deferred = null;

  function show() {
    if (!deferred || document.getElementById('pwa-install')) return;
    const hero = document.querySelector('#screen-home .home > div:first-child');
    if (!hero) return;
    const b = document.createElement('button');
    b.type = 'button'; b.id = 'pwa-install'; b.className = 'btn pwa-install';
    b.textContent = '📲 Installer l’appli';
    b.addEventListener('click', async () => {
      if (!deferred) return;
      const ev = deferred; deferred = null;
      b.remove();
      try { ev.prompt(); await ev.userChoice; } catch (e) { /* refus ou non pris en charge */ }
    });
    hero.appendChild(b);
  }
  root.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; show(); });
  root.addEventListener('appinstalled', () => { deferred = null; const b = document.getElementById('pwa-install'); if (b) b.remove(); });

  // hors ligne : on le dit simplement, les cotes déjà ouvertes restent disponibles
  let bar = null;
  function net() {
    const off = root.navigator && root.navigator.onLine === false;
    if (off && !bar) {
      bar = document.createElement('div');
      bar.className = 'offline-bar'; bar.setAttribute('role', 'status');
      bar.textContent = 'Hors ligne : les marchés déjà ouverts restent disponibles.';
      document.body.appendChild(bar);
    } else if (!off && bar) { bar.remove(); bar = null; }
  }
  root.addEventListener('online', net);
  root.addEventListener('offline', net);
  net();
})(typeof window !== 'undefined' ? window : globalThis);
