import fs from 'node:fs';
const iso = (d) => new Date(d * 86400000).toISOString().slice(0, 10);
const dow = (d) => ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'][(d + 4) % 7];
const show = (id, from, to) => {
  const d = JSON.parse(fs.readFileSync(`trading/data/${id}.json`));
  console.log('--', id);
  for (let i = 0; i < d.t.length; i++) if (iso(d.t[i]) >= from && iso(d.t[i]) <= to) console.log(iso(d.t[i]), dow(d.t[i]), d.o[i], d.h[i], d.l[i], d.c[i]);
};
show('GBPUSD_X', '2016-06-21', '2016-06-29');
show('EURUSD_X', '2008-12-03', '2008-12-12');
show('USDJPY_X', '2008-12-03', '2008-12-12');
// écarts de calendrier > 4 jours
for (const id of ['EURUSD_X', 'USDJPY_X', 'GBPUSD_X']) {
  const d = JSON.parse(fs.readFileSync(`trading/data/${id}.json`));
  for (let i = 1; i < d.t.length; i++) if (d.t[i] - d.t[i - 1] > 4) console.log(id, 'trou', iso(d.t[i - 1]), '->', iso(d.t[i]));
}
