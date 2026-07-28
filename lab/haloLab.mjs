// ---------- haloLab: the valley (B1) ----------
// M12j asked one question — does the halo fit the sky? — and answered it
// twice: 9.0 with, 1329.5 without. This lab asks the harder one: HOW MUCH
// halo? It sweeps the NFW characteristic mass MS through the same chi-square
// the verdict panel prints and looks for a floor. If there is a floor, the
// browser knob in B2 is a MEASURING DEVICE and not a toy.
//
// Reads the real physics.js (a copy, so the engine under test is the engine
// that ships) and the real published curve. Run: node lab/haloLab.mjs
import { readFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

mkdirSync('lab/out', { recursive: true });
copyFileSync('physics.js', 'lab/out/physicsHalo.mjs');
const P = await import(pathToFileURL('lab/out/physicsHalo.mjs').href);
const MS_HOUSE = P.GALAXY.MS;

// ---- the 11 testifying bins, same recipe as mrozLab MZ6 ----
const stars = [];
for (const line of readFileSync('data/mroz_curve.txt', 'utf8').split('\n')) {
  const s = line.trim();
  if (!s || s.startsWith('#')) continue;
  const t = s.split(/\s+/);
  const R = +t[1], V = +t[3];
  if (Number.isFinite(R) && Number.isFinite(V)) stars.push({ R, V });
}
const BINS = [];
for (let e = 5; e < 20; e++) {
  const inBin = stars.filter((s) => s.R >= e && s.R < e + 1);
  if (inBin.length < 8) continue;
  const N = inBin.length;
  const mean = inBin.reduce((a, s) => a + s.V, 0) / N;
  const sd = Math.sqrt(inBin.reduce((a, s) => a + (s.V - mean) ** 2, 0) / (N - 1));
  BINS.push({ mid: e + 0.5, N, mean, sem: sd / Math.sqrt(N) });
}

// chi2/nu at a given halo mass. Always halo ON — this lab asks HOW MUCH,
// not WHETHER. MS is restored after every call: a lab that leaves the
// engine dialled is a lab that poisons the next receipt.
function chi2nu(ms) {
  const saved = P.GALAXY.MS;
  P.GALAXY.MS = ms;
  let c2 = 0;
  for (const b of BINS) c2 += ((b.mean - P.galaxyVCircInner(b.mid, true, true)) / b.sem) ** 2;
  P.GALAXY.MS = saved;
  return c2 / BINS.length;
}

// ---- HL0: this lab and mrozLab must agree ----
// Two files, two bin builders, one number. If these ever drift apart, one
// of them is lying and the verdict panel is downstream of both.
const houseChi = chi2nu(MS_HOUSE);
console.log(`HL0 handshake with MZ7: ${BINS.length} bins, chi2/nu at the house MS ` +
  `= ${houseChi.toFixed(1)}  [${BINS.length === 11 && Math.abs(houseChi - 9.0) < 0.15 ? 'PASS' : 'FAIL'}]` +
  `  (MZ7 printed 9.0 over 11 bins)`);

// ---- the finder, with the bracket bluff designed OUT ----
// Bug taxonomy #7 bit bhLab: a bisection whose root escaped its bracket
// returned its own EDGE with a straight face. So this finder reports where
// it looked and refuses to call an endpoint a minimum.
function findFloor(lo, hi, steps = 600) {
  let bi = 0, best = Infinity;
  const at = (i) => lo + (hi - lo) * i / steps;
  for (let i = 0; i <= steps; i++) {
    const c = chi2nu(at(i));
    if (c < best) { best = c; bi = i; }
  }
  if (bi === 0 || bi === steps) {
    return { edge: true, ms: at(bi), chi: best, lo, hi };
  }
  // golden-section refine inside the winning cell's neighbours
  let a = at(bi - 1), b = at(bi + 1);
  const R = (Math.sqrt(5) - 1) / 2;
  let c1 = b - R * (b - a), c2 = a + R * (b - a);
  let f1 = chi2nu(c1), f2 = chi2nu(c2);
  for (let i = 0; i < 200; i++) {
    if (f1 < f2) { b = c2; c2 = c1; f2 = f1; c1 = b - R * (b - a); f1 = chi2nu(c1); }
    else { a = c1; c1 = c2; f1 = f2; c2 = a + R * (b - a); f2 = chi2nu(c2); }
  }
  const ms = (a + b) / 2;
  return { edge: false, ms, chi: chi2nu(ms), lo, hi };
}

// ---- HL1: is there a floor, and where? ----
const floor = findFloor(0.1 * MS_HOUSE, 3 * MS_HOUSE);
const ratio = floor.ms / MS_HOUSE;
const hl1 = !floor.edge && ratio > 0.97 && ratio < 1.02 && floor.chi > 8.5 && floor.chi < 9.5;
console.log(`HL1 the floor: MS = ${floor.ms.toExponential(4)} Msun ` +
  `(${ratio.toFixed(3)} x house), chi2/nu = ${floor.chi.toFixed(2)}  ` +
  `[${hl1 ? 'PASS' : 'FAIL'}]  (seal 0.97-1.02 x, floor 8.5-9.5)`);

// ---- HL2: how sharp is it? ----
// The width where chi2/nu rises by 1 above the floor. This is the CURVATURE
// of the valley, NOT an uncertainty on the real Milky Way — the floor sits
// at 9, not at 1, so the model has systematics beyond its halo mass.
// Confessed in CHEATS; quoted here as geometry, never as an error bar.
const target = floor.chi + 1;
let wLo = floor.ms, wHi = floor.ms;
while (chi2nu(wLo) < target && wLo > 0.2 * MS_HOUSE) wLo -= 0.0005 * MS_HOUSE;
while (chi2nu(wHi) < target && wHi < 2.5 * MS_HOUSE) wHi += 0.0005 * MS_HOUSE;
const halfPct = ((wHi - wLo) / 2) / floor.ms * 100;
console.log(`HL2 valley width at chi2/nu + 1: ${wLo.toExponential(3)} .. ${wHi.toExponential(3)} ` +
  `= +-${halfPct.toFixed(1)}%  [${halfPct > 2.0 && halfPct < 4.5 ? 'PASS' : 'FAIL'}]  (seal 2.0-4.5%)`);

// ---- the sweep, for the eye and for B3's trace ----
console.log('HL2 the sweep:');
for (const f of [0, 0.25, 0.5, 0.75, 0.9, 1.0, 1.1, 1.25, 1.5, 2.0]) {
  const c = f === 0 ? chi2nu(0) : chi2nu(MS_HOUSE * f);
  const bar = '#'.repeat(Math.max(1, Math.round(12 * Math.log10(Math.max(c, 1)) / Math.log10(1400))));
  console.log(`      ${f.toFixed(2)} x  chi2/nu ${c.toFixed(1).padStart(7)}  ${bar}`);
}

// ---- HL3: THE NEGATIVE — the bracket bluff, taxonomy #7 ----
// bhLab shipped a bisection sized only for the real black hole; at 100x mass
// the root escaped the bracket and the routine returned its own edge, 103.8%
// wrong, fail-silent. Same trap lives here. Hand the finder a window that
// EXCLUDES the floor and demand it says so instead of naming the boundary.
const bluff = findFloor(1.5 * MS_HOUSE, 3 * MS_HOUSE);
console.log(`HL3 negative — floor hunted in a window that excludes it ` +
  `(1.5-3.0 x house): edge detected = ${bluff.edge}, ` +
  `best in window ${(bluff.ms / MS_HOUSE).toFixed(2)} x  ` +
  `[${bluff.edge ? 'PASS' : 'FAIL'}]  (a minimum on the bracket edge is not a minimum)`);

// ---- HL4: what MS actually IS, for the record. Ungated. ----
// MS is the NFW characteristic mass, not the number people quote. The
// familiar virial mass is derived: solve M(<r200) = (4/3)pi r200^3 200 rho_c.
const RHO_CRIT = 136;                       // Msun/kpc^3 at H0 = 70
const fNFW = (x) => Math.log(1 + x) - x / (1 + x);
function m200(ms) {
  let lo = 0.1, hi = 100;
  for (let i = 0; i < 300; i++) {
    const m = (lo + hi) / 2;
    if (ms * fNFW(m) > (4 / 3) * Math.PI * (m * P.GALAXY.RS) ** 3 * 200 * RHO_CRIT) lo = m; else hi = m;
  }
  const c = (lo + hi) / 2;
  return { c, r200: c * P.GALAXY.RS, M200: ms * fNFW(c) };
}
const v = m200(floor.ms);
console.log(`HL4 for the record: the floor's MS = ${floor.ms.toExponential(3)} Msun is the NFW`);
console.log(`      CHARACTERISTIC mass with RS pinned at ${P.GALAXY.RS} kpc. The virial mass it`);
console.log(`      implies is M200 = ${v.M200.toExponential(3)} Msun at c = ${v.c.toFixed(1)}, ` +
  `r200 = ${v.r200.toFixed(0)} kpc.`);
console.log(`      Quote M200, never MS. Ungated: no seal, this is arithmetic on a pinned RS.`);

// ---- the verdict ----
const ok = BINS.length === 11 && Math.abs(houseChi - 9.0) < 0.15 && hl1 &&
  halfPct > 2.0 && halfPct < 4.5 && bluff.edge;
console.log(`HL5 the valley is real, located, and cannot be bluffed  [${ok ? 'PASS' : 'FAIL'}]`);
console.log(`      engine left at MS = ${P.GALAXY.MS.toExponential(2)} ` +
  `[${P.GALAXY.MS === MS_HOUSE ? 'PASS' : 'FAIL'}]  (a lab must not leave the dial moved)`);