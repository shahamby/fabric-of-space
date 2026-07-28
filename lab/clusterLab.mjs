// lab/clusterLab.mjs — M12d pre-registration: the REAL halo.
// 147 globular clusters, Harris (1996, 2010 ed.), fetched live from VizieR.
// These are the objects that span the galaxy: 0.6 to 120.5 kpc, where the
// HYG stars never leave a 1 kpc freckle. The catalog carries MEASURED
// velocities, so C5 can ask the question HYG could not:
//   are these things still bound if you take the dark matter away?
// Run:  node lab/clusterLab.mjs

import { writeFileSync, mkdirSync } from 'node:fs';
import { writeSnapshot } from './snapshot.mjs';

const URL = 'https://vizier.cds.unistra.fr/viz-bin/asu-tsv'
  + '?-source=VII/202/catalog'
  + '&-out=ID,Name,GLON,GLAT,Rsun,Rgc,X,Y,Z,Vlsr'
  + '&-out.max=200';

// ---------- The well: SAME constants as physics.js GALAXY ----------
const G  = 4.301e-6;
const MB = 1.5e10, AB = 0.5;
const MD = 6.5e10, AD = 3.0, BD = 0.3;
const MS = 5.0e11, RS = 16;
let HALO = true;

function phi(R) {
  const r = Math.max(R, 0.05);
  let p = -G * MB / (r + AB)
        - G * MD / Math.sqrt(r * r + (AD + BD) ** 2);
  if (HALO) p -= G * MS * Math.log(1 + r / RS) / r;
  return p;
}

// Escape speed: the speed at which kinetic energy equals the depth of the
// well. v_esc = sqrt(2|phi|). Faster than this and you are leaving.
function vEsc(R) { return Math.sqrt(2 * Math.abs(phi(R))); }

// ---------- C0: fetch, and keep the receipt ----------
const res = await fetch(URL);
const text = await res.text();
console.log(`C0  HTTP ${res.status}, ${text.length} bytes  ` +
  `[${res.status === 200 && text.length > 5000 ? 'PASS' : 'FAIL'}]`);
mkdirSync('data', { recursive: true });
writeSnapshot('data/harris_gc.tsv', text, 'Harris GC');

// ---------- C1: parse ----------
// VizieR TSV: '#' comments, then header / units / dashes, then rows.
const lines = text.split('\n').filter((l) => l && !l.startsWith('#')).slice(3);
const gc = [];
for (const line of lines) {
  const f = line.split('\t').map((s) => s.trim());
  const [id, name, glon, glat, rsun, rgc, X, Y, Z, vlsr] = f;
  if (!X || !Y || !Z || !rgc) continue;          // a few rows lack positions
  gc.push({
    id, name: name || id,
    xh: +X, yh: +Y, zh: +Z,                      // HELIOCENTRIC, Sun at origin
    rgcCat: +rgc,                                // the catalog's own answer
    vlsr: vlsr === '' ? null : +vlsr,
  });
}
console.log(`C1  parsed ${gc.length} clusters with positions  ` +
  `[${gc.length === 145 ? 'PASS' : 'FAIL'}]  (expect 145)`);

// ---------- C2: the frame conversion, checked against the catalog ----------
// Harris X/Y/Z are heliocentric: X toward the galactic center, Y toward
// rotation, Z toward the north pole. Our frame puts the Sun at +R0 on X
// and Sgr A* at the origin — a 180-degree turn about Z, handedness intact:
//     Xrepo = R0 - xh      Yrepo = -yh      Zrepo = zh
// Harris computed his Rgc column assuming R0 = 8.0. Convert with 8.0 and
// our answer must reproduce his — that is the check. The sim then uses
// 8.2, which is why C2b exists.
function toRepo(c, R0) { return [R0 - c.xh, -c.yh, c.zh]; }

function meanErr(R0) {
  let sum = 0;
  for (const c of gc) sum += Math.abs(Math.hypot(...toRepo(c, R0)) - c.rgcCat);
  return sum / gc.length;
}
const e80 = meanErr(8.0), e82 = meanErr(8.2);
console.log(`C2  mean |ours - catalog Rgc| at R0=8.0 : ${e80.toFixed(3)} kpc  ` +
  `[${e80 < 0.05 ? 'PASS' : 'FAIL'}]  (< 0.05 = published rounding only)`);
console.log(`C2b same at our R0=8.2                 : ${e82.toFixed(3)} kpc  ` +
  `[${e82 > e80 && e82 < 0.20 ? 'PASS' : 'FAIL'}]  (the 0.2 kpc R0 offset, expected)`);

// ---------- C3: does it span the sheet? ----------
const R = gc.map((c) => c.rgcCat);
const onSheet = R.filter((r) => r < 40).length;
console.log(`C3  Rgc range ${Math.min(...R)} - ${Math.max(...R)} kpc, ` +
  `${onSheet} land on the +/-40 kpc sheet  ` +
  `[${Math.max(...R) > 100 && onSheet > 130 ? 'PASS' : 'FAIL'}]`);

// ---------- C4: how deep is the well out there? ----------
console.log('C4  escape speed, km/s:');
for (const r of [8.2, 20, 50, 120.5]) {
  HALO = true;  const on  = vEsc(r);
  HALO = false; const off = vEsc(r);
  HALO = true;
  console.log(`      R=${String(r).padStart(5)} kpc   halo ON ${on.toFixed(1)}` +
    `   halo OFF ${off.toFixed(1)}`);
}

// ---------- C5: the runaway census — SHAMBU'S HAND ----------
// This is the whole point of choosing this catalog. Vlsr is a MEASURED
// speed. Compare it to the escape speed and ask who stays.
//
// Spec (write below this comment, ~12 lines):
//   1. Filter gc to clusters where c.vlsr is not null. Expect 126.
//   2. For each, take speed = Math.abs(c.vlsr) and R = c.rgcCat.
//   3. Count nOff = how many have speed > vEsc(R) with HALO = false.
//      Count nOn  = how many have speed > vEsc(R) with HALO = true.
//      (Set HALO before each call and put it back to true after.)
//   4. Print both counts.
//   5. Print the name, Rgc, speed and baryon-only escape speed for each
//      cluster in the nOff set.
//   6. PASS if nOff > 0 AND nOn === 0 — meaning: without dark matter some
//      of these are already leaving; with it, every single one is held.
//   7. Print FAIL loudly in an else branch. No silent instruments.
// Spec (write below this comment, ~12 lines):
const valid = gc.filter(c => c.vlsr !== null);
let nOff = 0, nOn = 0, offSet = [];
valid.forEach(c => {
  let s = Math.abs(c.vlsr), R = c.rgcCat;
  HALO = false; let escOff = vEsc(R); if (s > escOff) { nOff++; offSet.push({n: c.id || c.name, R, s, escOff}); }
  HALO = true;  if (s > vEsc(R)) nOn++; HALO = true;
});
console.log(`nOff: ${nOff}, nOn: ${nOn}`);
offSet.forEach(c => console.log(`Name: ${c.n}, Rgc: ${c.R}, Speed: ${c.s}, vEsc(Baryon): ${c.escOff}`));
if (nOff > 0 && nOn === 0) console.log('C5 Pass');
else console.log('C5 !!! FAIL !!!');
