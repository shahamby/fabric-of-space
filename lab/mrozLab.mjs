// lab/mrozLab.mjs — M12i pre-registration: the sky's own rotation curve.
// 773 classical Cepheids (Mroz et al. 2019, ApJL 870, L10) each carry a
// MEASURED circular velocity, published star-by-star in the OGLE archive
// beside the paper's own reduction code (probe-verified 2026-07-24).
// This lab: (MZ0) fetches the two files through the front door, (MZ2)
// reproduces the paper's own reduction star-by-star in our JavaScript —
// 773 stars, two numbers each, against the published science file — and
// (MZ4) holds the sky against galaxyVCircInner, dark halo ON and OFF.
// The browser overlay ships nothing that does not pass here first.
// Run:  node lab/mrozLab.mjs        (MZ5 is Shambu's hand — see slot)

import { writeFileSync } from 'node:fs';

// ---------- MZ0: the fetch — two files through the front door ----------
// SEALED before running: Cepheids.dat >= 100,000 bytes and exactly 832
// data rows; rotation_curve.txt exactly 773 data rows; the count of
// flag==1 rows in Cepheids.dat EQUALS the curve's row count (the paper
// says 832 observed, 773 used — the two files must agree on the cut).
const BASE = 'https://www.astrouw.edu.pl/ogle/ogle4/ROTATION_CURVE';

async function grab(name, minBytes) {
  const res = await fetch(`${BASE}/${name}`);
  const text = await res.text();
  console.log(`MZ0 fetch ${name}: status ${res.status}, ${text.length} bytes  ` +
    `[${res.status === 200 && text.length > minBytes ? 'PASS' : 'FAIL'}]`);
  return text;
}

const cephText  = await grab('Cepheids.dat', 100000);
const curveText = await grab('rotation_curve.txt', 30000);
writeFileSync('data/mroz_cepheids.dat', cephText);
writeFileSync('data/mroz_curve.txt', curveText);

// Cepheids.dat columns (README): Name flag RA Decl l b dist e_dist
// pmra e_pmra pmdec e_pmdec pm_corr vrad e_vrad — 15 space-split tokens.
const stars = cephText.split('\n').map((l) => l.trim()).filter(Boolean)
  .map((line) => {
    const t = line.split(/\s+/);
    return { name: t[0], flag: +t[1], ra: +t[2], dec: +t[3],
      l: +t[4], b: +t[5], dist: +t[6], pmra: +t[8], pmdec: +t[10],
      vrad: +t[13] };
  });

// rotation_curve.txt columns: Name R e_R V e_V — '#' lines are header.
const pub = new Map();
for (const line of curveText.split('\n')) {
  const s = line.trim();
  if (!s || s.startsWith('#')) continue;
  const t = s.split(/\s+/);
  pub.set(t[0], { R: +t[1], V: +t[3], eV: +t[4] });   // M12j: the error column, kept
}

const flagged = stars.filter((s) => s.flag === 1);
console.log(`MZ0 rows: Cepheids ${stars.length} (seal 832), flagged ${flagged.length}, ` +
  `curve ${pub.size} (seal 773)  ` +
  `[${stars.length === 832 && pub.size === 773 && flagged.length === pub.size
    ? 'PASS' : 'FAIL'}]`);

// ---------- MZ1: the bridge — one constant, two spellings ----------
// SEALED: Mroz spends 4.74 km/s per (mas/yr * kpc); the house bridge
// (gaiaLab) is 4.740470. Same physical constant, agreement < 1e-3.
// The handshake (MZ2) spends THEIR 4.74 — reproducing a file means
// spending the file's own coin.
const K_HOUSE = 4.740470;
const K_MROZ  = 4.74;
console.log(`MZ1 bridge: house ${K_HOUSE}, Mroz ${K_MROZ}, ` +
  `rel diff ${(Math.abs(K_HOUSE - K_MROZ) / K_HOUSE).toExponential(2)}  ` +
  `[${Math.abs(K_HOUSE - K_MROZ) / K_HOUSE < 1e-3 ? 'PASS' : 'FAIL'}]`);

// ---------- The paper's own reduction, in our JavaScript ----------
// Method read from construct_rotation_curve.py (OGLE archive), plain words:
//   1. Turn the equatorial proper motion (pmra, pmdec) into the galactic
//      one (pm_l, pm_b) — a pure ROTATION around the North Galactic Pole.
//   2. Tangential speeds: v_l = K * dist * pm_l, v_b = K * dist * pm_b
//      (K = the bridge; dist = heliocentric distance in kpc).
//   3. Stack (vrad, v_b, v_l) into a galactic Cartesian arrow (U1, V1, W1)
//      — the star's velocity AS SEEN FROM the moving Sun.
//   4. ADD the Sun's own arrow: U2 = U1+U0, V2 = V1+V0+THETA0, W2 = W1+W0
//      — now the arrow is galactocentric.
//   5. R = law-of-cosines distance from the Galactic center.
//   6. Rotate (U2, V2) by beta — the Sun-to-star angle seen from the
//      center — so V lands on the star's OWN forward direction. That
//      forward part, V_s, is the circular velocity the file publishes.
const DEG  = Math.PI / 180;
const RA_G = 192.85948 * DEG;   // North Galactic Pole, right ascension
const DE_G = 27.12825  * DEG;   // North Galactic Pole, declination

// MODEL 2 constants from their file header — the coin the file spent:
const MROZ = { R0: 8.09, U0: 10.1, V0: 12.3, W0: 7.3, TH0: 233.6, K: K_MROZ };

function reduceStar(s, C) {
  const ra = s.ra * DEG, dec = s.dec * DEG, l = s.l * DEG, b = s.b * DEG;
  // 1. rotation to galactic proper motion
  let C1 = Math.sin(DE_G) * Math.cos(dec)
         - Math.cos(DE_G) * Math.sin(dec) * Math.cos(ra - RA_G);
  let C2 = Math.cos(DE_G) * Math.sin(ra - RA_G);
  const norm = Math.hypot(C1, C2);
  C1 /= norm; C2 /= norm;
  const pm_l = C1 * s.pmra + C2 * s.pmdec;
  const pm_b = C1 * s.pmdec - C2 * s.pmra;
  // 2. tangential speeds
  const v_l = C.K * s.dist * pm_l;
  const v_b = C.K * s.dist * pm_b;
  // 3. galactic Cartesian arrow at the Sun
  const U1 = Math.cos(b) * Math.cos(l) * s.vrad
           - Math.sin(b) * Math.cos(l) * v_b - Math.sin(l) * v_l;
  const V1 = Math.cos(b) * Math.sin(l) * s.vrad
           - Math.sin(b) * Math.sin(l) * v_b + Math.cos(l) * v_l;
  const W1 = Math.sin(b) * s.vrad + Math.cos(b) * v_b;
  // 4. add the Sun's arrow
  const U2 = U1 + C.U0, V2 = V1 + C.V0 + C.TH0, W2 = W1 + C.W0;
  // 5. distance from the center
  const dproj = s.dist * Math.cos(b);
  const R = Math.sqrt(C.R0 * C.R0 + dproj * dproj
          - 2 * C.R0 * dproj * Math.cos(l));
  // 6. rotate onto the star's forward direction
  const sinb = dproj * Math.sin(l) / R;
  const cosb = (C.R0 - dproj * Math.cos(l)) / R;
  const Vs = V2 * cosb + U2 * sinb;
  return { R, Vs, v_l, v_b, W2 };
}

// ---------- MZ2: THE HANDSHAKE — 773 stars vs the published file ----------
// SEALED: every one of the 773 flagged stars matches its published row by
// name; worst |dR| <= 0.001 kpc and worst |dV| <= 0.01 km/s — i.e. we
// reproduce the science file to ITS OWN printed precision, star by star.
let worstR = 0, worstV = 0, matched = 0;
const sky = [];                       // the (R, V) points the browser will draw
for (const s of flagged) {
  const p = pub.get(s.name);
  if (!p) continue;
  matched++;
  const m = reduceStar(s, MROZ);
  worstR = Math.max(worstR, Math.abs(m.R - p.R));
  worstV = Math.max(worstV, Math.abs(m.Vs - p.V));
  sky.push({ name: s.name, R: m.R, V: m.Vs });
}
console.log(`MZ2 handshake: matched ${matched}/773, worst dR ` +
  `${worstR.toExponential(2)} kpc, worst dV ${worstV.toExponential(2)} km/s  ` +
  `[${matched === 773 && worstR <= 0.001 && worstV <= 0.01 ? 'PASS' : 'FAIL'}]`);

// The designated star for MZ5's pencil — raw coin and machine change:
const d0 = flagged[0], m0 = reduceStar(d0, MROZ);
console.log(`MZ2 pencil star ${d0.name}: dist ${d0.dist} kpc, ` +
  `pmra ${d0.pmra}, pmdec ${d0.pmdec} mas/yr  ->  machine v_l ` +
  `${m0.v_l.toFixed(4)}, v_b ${m0.v_b.toFixed(4)} km/s`);

// ---------- MZ3: the sky's own anchors ----------
// SEALED: (a) median V of the Sun's ring (R within 8.09 +/- 0.5 kpc)
// lands inside 233.6 +/- 6 km/s; (b) FLATNESS — median V at 16-20 kpc
// divided by median V at 7-9 kpc exceeds 0.85. A Keplerian sky would
// give sqrt(8/18) = 0.67; the flat ratio is dark matter's fingerprint
// read from real stars, no model in the room.
const med = (a) => { const s = [...a].sort((x, y) => x - y);
  return s.length ? s[Math.floor(s.length / 2)] : NaN; };
const ring  = med(sky.filter((s) => Math.abs(s.R - 8.09) < 0.5).map((s) => s.V));
const inner = med(sky.filter((s) => s.R > 7  && s.R < 9 ).map((s) => s.V));
const outer = med(sky.filter((s) => s.R > 16 && s.R < 20).map((s) => s.V));
console.log(`MZ3 anchors: Sun-ring median ${ring.toFixed(1)} (seal 233.6 +/- 6), ` +
  `outer/inner ${outer.toFixed(1)}/${inner.toFixed(1)} = ${(outer / inner).toFixed(3)} ` +
  `(seal > 0.85; Kepler would be 0.67)  ` +
  `[${Math.abs(ring - 233.6) < 6 && outer / inner > 0.85 ? 'PASS' : 'FAIL'}]`);

// ---------- The well: house model, mirrored from curveLab/physics.js ----------
const G  = 4.301e-6;
const MB = 1.5e10, AB = 0.5;
const MD = 6.5e10, AD = 3.0, BD = 0.3;
const MS = 5.0e11, RS = 16;
const MBH = 4.30e6;
let HALO = true;
function vInner(R) {
  const r = Math.max(R, 1e-4), S = AD + BD;
  let v2 = G * MB * r / ((r + AB) ** 2)
         + G * MD * r * r / ((r * r + S * S) ** 1.5);
  if (HALO) {
    const x = r / RS;
    v2 += G * MS * (Math.log(1 + x) - x / (1 + x)) / r;
  }
  v2 += G * MBH / r;
  return Math.sqrt(v2);
}

// ---------- MZ4: MODEL vs SKY — the milestone's heart ----------
// One-kpc bins, 5 to 20 kpc, a bin testifies with n >= 8 stars.
// SEALED: with the halo ON, mean |sky - model| over testifying bins
// stays under 15 km/s; with the halo OFF the mean residual is at least
// DOUBLE the ON residual; and at the outermost testifying bin the
// halo-OFF model misses the sky by more than 30 km/s. The dark halo is
// not decoration — without it the model abandons the measured stars.
let sumOn = 0, sumOff = 0, nBins = 0, lastMiss = 0, lastMid = 0;
console.log('MZ4 bin   n   sky     ON      OFF');
for (let e = 5; e < 20; e++) {
  const mid = e + 0.5;
  const inBin = sky.filter((s) => s.R >= e && s.R < e + 1).map((s) => s.V);
  if (inBin.length < 8) continue;
  const skyV = med(inBin);
  HALO = true;  const on  = vInner(mid);
  HALO = false; const off = vInner(mid);
  HALO = true;
  sumOn += Math.abs(skyV - on); sumOff += Math.abs(skyV - off); nBins++;
  lastMiss = Math.abs(skyV - off); lastMid = mid;
  console.log(`    ${mid.toFixed(1).padStart(4)} ${String(inBin.length).padStart(4)}` +
    `  ${skyV.toFixed(1).padStart(6)} ${on.toFixed(1).padStart(6)} ${off.toFixed(1).padStart(7)}`);
}
const resOn = sumOn / nBins, resOff = sumOff / nBins;
console.log(`MZ4 residuals over ${nBins} bins: ON ${resOn.toFixed(1)}, ` +
  `OFF ${resOff.toFixed(1)} km/s (ratio ${(resOff / resOn).toFixed(2)}); ` +
  `outermost bin ${lastMid} OFF-miss ${lastMiss.toFixed(1)}  ` +
  `[${resOn < 15 && resOff >= 2 * resOn && lastMiss > 30 ? 'PASS' : 'FAIL'}]`);

// ---------- MZ5: SHAMBU'S HAND — two receipts, assignment in session ----------
// (5a) rotations do not stretch: the machine's sqrt(v_l^2 + v_b^2) for
//      the pencil star must equal K * dist * sqrt(pmra^2 + pmdec^2),
//      computed by you from the raw line — no rotation code allowed.
// (5b) the negative that must fire: rerun the Sun-ring median with the
//      Sun's arrow zeroed (U0 = V0 = W0 = TH0 = 0) and PROVE the anchor
//      crashes out of MZ3's seal. A negative that changes nothing is
//      theater (taxonomy item 8).
// ---- your code below this line ----
// 5a. Compute the same tangential-speed magnitude directly from the raw
// proper motions. This uses no coordinate-rotation code.
// 5a: prove that the coordinate rotation preserves vector length.
const handSpeed =
  MROZ.K * d0.dist * Math.hypot(d0.pmra, d0.pmdec);

const machineSpeed =
  Math.hypot(m0.v_l, m0.v_b);

const rotationDiff =
  Math.abs(handSpeed - machineSpeed);

console.log(`MZ5a rotation receipt: hand ${handSpeed.toFixed(6)}, ` +
  `machine ${machineSpeed.toFixed(6)} km/s, ` +
  `diff ${rotationDiff.toExponential(2)}  ` +
  `[${rotationDiff < 1e-9 ? 'PASS' : 'FAIL'}]`);

// 5b: remove the Sun's motion and prove that the MZ3 anchor fails.
const NO_SUN = {
  ...MROZ,
  U0: 0,
  V0: 0,
  W0: 0,
  TH0: 0
};

const noSunSky = flagged.map((star) => {
  const result = reduceStar(star, NO_SUN);
  return { R: result.R, V: result.Vs };
});

const noSunRing = med(
  noSunSky
    .filter((star) => Math.abs(star.R - MROZ.R0) < 0.5)
    .map((star) => star.V)
);

const sealLow = MROZ.TH0 - 6;
const sealHigh = MROZ.TH0 + 6;
const anchorCrashed =
  noSunRing < sealLow || noSunRing > sealHigh;

console.log(`MZ5b negative receipt: zero-Sun median ` +
  `${noSunRing.toFixed(4)} km/s, MZ3 seal ` +
  `${sealLow.toFixed(1)}–${sealHigh.toFixed(1)}  ` +
  `[${anchorCrashed ? 'PASS' : 'FAIL'}]`);

// ---------- MZ6: the bins carry error bars (M12j) ----------
// Spend the FILE's coin (CHEATS #15 doctrine): published V and e_V.
// Same bins as MZ4 — 1 kpc, 5 to 20, testify n >= 8. Each bin: N stars,
// mean V, SD (the sky's thickness), SEM = SD/sqrt(N) (how well the MEAN
// is known — the verdict's ruler). SEALED: bin count EQUALS MZ4's nBins,
// and every SEM lands in 0.5-5 km/s.
const BINS = [];
for (let e = 5; e < 20; e++) {
  const inBin = [...pub.values()].filter((p) => p.R >= e && p.R < e + 1);
  if (inBin.length < 8) continue;
  const N = inBin.length;
  const mean = inBin.reduce((a, p) => a + p.V, 0) / N;
  const sd = Math.sqrt(inBin.reduce((a, p) => a + (p.V - mean) ** 2, 0) / (N - 1));
  BINS.push({ mid: e + 0.5, N, mean, sd, sem: sd / Math.sqrt(N) });
}
console.log('MZ6 bin    N   mean     SD    SEM');
for (const b of BINS) console.log(`   ${b.mid.toFixed(1).padStart(5)} ${String(b.N).padStart(4)}` +
  ` ${b.mean.toFixed(1).padStart(6)} ${b.sd.toFixed(1).padStart(6)} ${b.sem.toFixed(1).padStart(6)}`);
const semOk = BINS.every((b) => b.sem > 0.5 && b.sem < 5);
console.log(`MZ6 bins ${BINS.length} (MZ4 counted ${nBins}), SEM range ` +
  `${Math.min(...BINS.map((b) => b.sem)).toFixed(1)}-${Math.max(...BINS.map((b) => b.sem)).toFixed(1)}  ` +
  `[${BINS.length === nBins && semOk ? 'PASS' : 'FAIL'}]`);

// ---------- MZ7: THE VERDICT — chi-square per bin, both hypotheses ----------
// chi2/nu = mean of ((data - model)/SEM)^2 over the bins; nu = 11,
// nothing was fitted to this data. SEALED: ON lands in 4-18 (a toy model,
// convicted of being a toy, not of being wrong-shaped); OFF exceeds 300
// (annihilation); OFF/ON exceeds 30. Second line: per-star chi2 with the
// PUBLISHED e_V, for the record, ungated — peculiar motions live there.
let c2On = 0, c2Off = 0, c2sOn = 0, c2sOff = 0;
for (const b of BINS) {
  HALO = true;  const onV  = vInner(b.mid);
  HALO = false; const offV = vInner(b.mid);
  HALO = true;
  c2On  += ((b.mean - onV)  / b.sem) ** 2;
  c2Off += ((b.mean - offV) / b.sem) ** 2;
}
for (const p of pub.values()) {
  HALO = true;  const onV  = vInner(p.R);
  HALO = false; const offV = vInner(p.R);
  HALO = true;
  c2sOn  += ((p.V - onV)  / p.eV) ** 2;
  c2sOff += ((p.V - offV) / p.eV) ** 2;
}
const nuOn = c2On / BINS.length, nuOff = c2Off / BINS.length;
console.log(`MZ7 verdict chi2/nu: halo ON ${nuOn.toFixed(1)}, OFF ${nuOff.toFixed(1)}, ` +
  `ratio ${(nuOff / nuOn).toFixed(1)}  ` +
  `[${nuOn > 4 && nuOn < 18 && nuOff > 300 && nuOff / nuOn > 30 ? 'PASS' : 'FAIL'}]`);
console.log(`MZ7 per-star (published e_V, ${pub.size} stars): ` +
  `ON ${(c2sOn / pub.size).toFixed(1)}, OFF ${(c2sOff / pub.size).toFixed(1)}  (for the record)`);

// ---------- MZ8: SHAMBU'S HAND — the acquittal negative ----------
let lcgState = 12345;
const lcg = () => (lcgState = (lcgState * 48271) % 2147483647) / 2147483647;

const zBell = () => {
  let total = 0;
  for (let i = 0; i < 12; i++) total += lcg();
  return total - 6;
};

let c2Acq = 0, c2Cross = 0;
for (const b of BINS) {
  HALO = true;  const onV  = vInner(b.mid);
  HALO = false; const offV = vInner(b.mid);
  HALO = true;

  const fake = onV + zBell() * b.sem;
  c2Acq   += ((fake - onV)  / b.sem) ** 2;
  c2Cross += ((fake - offV) / b.sem) ** 2;
}

const acq = c2Acq / BINS.length;
const cross = c2Cross / BINS.length;

console.log(`MZ8 acquittal chi2/nu ${acq.toFixed(2)}  ` +
  `[${acq > 0.2 && acq < 2.6 ? 'PASS' : 'FAIL'}]  ` +
  `(seal 0.2-2.6; a TRUE model reads ~1, not 0)`);

console.log(`MZ8 cross chi2/nu ${cross.toFixed(1)}  ` +
  `[${cross > 300 ? 'PASS' : 'FAIL'}]  ` +
  `(the negative still convicts — taxonomy #8 armor)`);