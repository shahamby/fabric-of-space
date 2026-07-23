// lab/cephLab.mjs — M12h pre-registration: the disk's true body.
// 2,631 classical Cepheids (Skowron+ 2019, OGLE; VizieR J/AcA/69/305,
// table1) — young pulsing stars whose distances hold across the whole
// galaxy. This lab fetches them, builds their seats from (l, b, d) through
// the front door, and MEASURES two gravitational structures from real
// stars before anything renders: the WARP (the outer disk bends out of
// the plane, S-shaped) and the FLARE (the disk thickens outward).
// Run:  node lab/cephLab.mjs

import { writeFileSync, mkdirSync } from 'node:fs';

const URL = 'https://vizier.cds.unistra.fr/viz-bin/asu-tsv'
  + '?-source=J/AcA/69/305/table1'
  + '&-out=Name,GLON,GLAT,Dist,e_Dist,Age,_RA.icrs,_DE.icrs'
  + '&-out.max=3000';

const R0 = 8.2, D2R = Math.PI / 180;
const AG = [                              // equatorial J2000 -> galactic (G3a-receipted)
  [-0.0548755604, -0.8734370902, -0.4838350155],
  [ 0.4941094279, -0.4448296300,  0.7469822445],
  [-0.8676661490, -0.1980763734,  0.4559837762],
];

// ---------- CD0: fetch, snapshot, receipt ----------
const res = await fetch(URL);
const text = await res.text();
console.log(`CD0 fetch: HTTP ${res.status}, ${text.length} bytes  ` +
  `[${res.status === 200 && text.length > 100000 ? 'PASS' : 'FAIL'}]`);
mkdirSync('data', { recursive: true });
writeFileSync('data/cepheids.tsv', text);

// ---------- CD1: parse — the space-padding lesson applied ----------
// The probe showed blank Dist cells stuffed with spaces; trim BEFORE
// deciding a field is empty, or the count lies.
const lines = text.split('\n').filter((l) => l && !l.startsWith('#')).slice(3);
const stars = [];
let total = 0;
for (const line of lines) {
  const [name, glon, glat, dist, , age, ra, de] = line.split('\t').map((s) => s.trim());
  if (!glon || !glat) continue;
  total++;
  if (!dist) continue;                    // no distance, no seat — honestly benched
  const l = +glon * D2R, b = +glat * D2R, d = +dist / 1000;   // pc -> kpc
  const xh = d * Math.cos(b) * Math.cos(l);   // heliocentric: x to the center,
  const yh = d * Math.cos(b) * Math.sin(l);   // y to rotation, z north — the
  const zh = d * Math.sin(b);                 // same frame Harris hands out
  stars.push({ name, l, b, d, age: age ? +age : null,
    ra: ra ? +ra : null, de: de ? +de : null,
    X: R0 - xh, Y: -yh, z: zh,                // repo axes: Sun at +X = 8.2
    Rcyl: Math.hypot(R0 - xh, -yh) });
}
console.log(`CD1 parse: ${total} rows, ${stars.length} with full (l, b, Dist)  ` +
  `[${stars.length >= 2100 ? 'PASS' : 'FAIL'}]  (seal: >= 2100; paper says 2214)  ` +
  `max d ${Math.max(...stars.map((s) => s.d)).toFixed(1)} kpc`);
// The confessed bench: a handful of rows sit beyond Rgc 30 kpc — past the
// fabric's edge and the disk's body (anticenter stars with enormous
// distances; 0.6% of the sample). They stay in the snapshot; the
// STRUCTURE receipts below read the Galactic body only. Counted, named,
// never silent.
const rgc3 = (s) => Math.hypot(s.X, s.Y, s.z);
const bench = stars.filter((s) => rgc3(s) > 30);
const kept  = stars.filter((s) => rgc3(s) <= 30);
console.log(`      benched ${bench.length} beyond Rgc 30 kpc ` +
  `(${bench.slice(0, 3).map((s) => s.name).join(', ')}, ...) — ${kept.length} in the body`);

// ---------- CD2: frame handshake against the observatory ----------
// Two sky descriptions ride each row: the catalog's (GLON, GLAT) and the
// CDS-computed (_RA.icrs, _DE.icrs). Push (l, b) through the TRANSPOSE of
// our receipted AG matrix and the two must meet on the sky. This anchors
// OUR rotation against the observatory-grade transform, star by star.
const angles = [];
for (const s of stars) {
  if (s.ra === null || s.de === null) continue;
  const ug = [Math.cos(s.b) * Math.cos(s.l), Math.cos(s.b) * Math.sin(s.l), Math.sin(s.b)];
  const ue = [0, 1, 2].map((i) => AG[0][i] * ug[0] + AG[1][i] * ug[1] + AG[2][i] * ug[2]);
  const ra = s.ra * D2R, de = s.de * D2R;
  const uc = [Math.cos(de) * Math.cos(ra), Math.cos(de) * Math.sin(ra), Math.sin(de)];
  const dot = Math.min(1, ue[0] * uc[0] + ue[1] * uc[1] + ue[2] * uc[2]);
  angles.push(Math.acos(dot) / D2R);
}
angles.sort((a, b) => a - b);
const medAng = angles[Math.floor(angles.length / 2)];
console.log(`CD2 handshake: median ${medAng.toExponential(1)} deg, ` +
  `worst ${angles[angles.length - 1].toExponential(1)}  ` +
  `[${medAng < 0.01 ? 'PASS' : 'FAIL'}]  (${angles.length} stars, both columns catalog-native)`);

// ---------- The warp instrument — used by CD3 now, CD5's hand later ----------
// Four pie slices around the center; mean height of the OUTER disk in
// each. A warped galaxy answers up on one side, down on the other.
function warpSpread(list) {
  const q = [[], [], [], []];
  for (const s of list) {
    if (s.Rcyl <= 12) continue;
    const phi = Math.atan2(s.Y, s.X);           // -pi..pi around the center
    q[Math.min(3, Math.floor((phi + Math.PI) / (Math.PI / 2)))].push(s.z);
  }
  const means = q.map((a) => a.length ? a.reduce((p, c) => p + c, 0) / a.length : 0);
  return { means, n: q.map((a) => a.length),
    max: Math.max(...means), min: Math.min(...means),
    spread: Math.max(...means) - Math.min(...means) };
}

// ---------- CD3: the warp, measured from real stars ----------
// SEALED before running: outer quadrant means of OPPOSITE sign somewhere
// (up one side, down the other), spread > 0.6 kpc, extremes past
// +/- 0.25 — while the inner disk (3-8 kpc) stays flat, |mean z| < 0.15.
const w = warpSpread(kept);
const inner = kept.filter((s) => s.Rcyl > 3 && s.Rcyl < 8).map((s) => s.z);
const innerMean = inner.reduce((p, c) => p + c, 0) / inner.length;
console.log(`CD3 warp: outer quadrant means [${w.means.map((m) => m.toFixed(2)).join(', ')}] kpc ` +
  `(n = ${w.n.join('/')})`);
console.log(`      spread ${w.spread.toFixed(2)}, extremes ${w.max.toFixed(2)} / ${w.min.toFixed(2)}, ` +
  `inner mean ${innerMean.toFixed(3)}  ` +
  `[${w.spread > 0.6 && w.max > 0.25 && w.min < -0.25 && Math.abs(innerMean) < 0.15
    ? 'PASS' : 'FAIL'}]`);

// ---------- CD4: the flare — the disk thickens outward ----------
// SEALED: the spread of heights beyond 12 kpc is at least DOUBLE the
// spread at 5-8 kpc. (Warp and flare thicken together out there; the
// receipt names the sum honestly.)
const sig = (a) => {
  const m = a.reduce((p, c) => p + c, 0) / a.length;
  return Math.sqrt(a.reduce((p, c) => p + (c - m) ** 2, 0) / a.length);
};
const sIn = sig(kept.filter((s) => s.Rcyl > 5 && s.Rcyl < 8).map((s) => s.z));
const sOut = sig(kept.filter((s) => s.Rcyl > 12).map((s) => s.z));
console.log(`CD4 flare: sigma_z 5-8 kpc = ${sIn.toFixed(3)}, beyond 12 = ${sOut.toFixed(3)}, ` +
  `ratio ${(sOut / sIn).toFixed(2)}  [${sOut / sIn > 2 ? 'PASS' : 'FAIL'}]  (seal: > 2)`);

// ---------- CD5: the shuffle negative — SHAMBU'S HAND ----------
// The warp instrument must read GEOMETRY, not statistics. Deal the same
// pile of heights to the wrong owners and the signal must die.
// Spec (write below, ~12 lines):
//   1. Copy the stars into a scratch list, each entry copied too:
//        const scratch = kept.map((s) => ({ ...s }));
//   2. Fisher-Yates shuffle ONLY the z values across the scratch list —
//      walk i from the end down to 1, pick j = random 0..i, swap
//      scratch[i].z with scratch[j].z. Same heights, wrong stars.
//   3. SEAL both outcomes first, in a comment: the real spread (CD3's
//      number) survives; the shuffled spread collapses below 0.3 kpc —
//      the mean of ~hundreds of randomly dealt heights forgets the warp.
//   4. const wS = warpSpread(scratch); print both spreads side by side:
//      geometry vs statistics.
//   5. PASS if wS.spread < 0.3 AND the real w.spread still > 0.6.
//      Loud FAIL in an else, process.exitCode = 1. Run it twice — the
//      shuffle is random; the verdict must not be.
// The real spread (CD3's number) survives; the shuffled spread collapses below 0.3 kpc — the mean of randomly dealt heights forgets the warp.
const run = () => {
  const scratch = kept.map((s) => ({ ...s }));
  for (let i = scratch.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [scratch[i].z, scratch[j].z] = [scratch[j].z, scratch[i].z];
  }
  const wS = warpSpread(scratch), rS = warpSpread(kept);
  console.log(`Geometry (real): ${rS.spread} | Statistics (shuffled): ${wS.spread}`);
  if (wS.spread < 0.3 && rS.spread > 0.6) console.log("PASS");
  else { console.error("FAIL"); process.exitCode = 1; }
};
run(); run();
