// lab/bhLab.mjs — M12f pre-registration: the center gets its engine.
// Sgr A*'s published 4.30e6 Msun enters the potential as a point mass.
// Its kingdom is tiny: inside ~8.6 pc it out-pulls the bulge and the
// rotation curve FALLS as 1/sqrt(r) — Kepler's fingerprint at the galactic
// center, the same law the planets obey. Outside that room, the receipted
// world must not move (B4 is the guard).
// Run:  node lab/bhLab.mjs

// ---------- The well: house constants + the new tenant ----------
const G  = 4.301e-6;                       // kpc (km/s)^2 / Msun
const MB = 1.5e10, AB = 0.5;               // bulge
const MD = 6.5e10, AD = 3.0, BD = 0.3;     // disk
const MS = 5.0e11, RS = 16;                // dark halo
const MBH = 4.30e6;                        // Sgr A* — the published mass
let HALO = true, BH = true;

// Circular-speed pieces, one per tenant. v^2 = r x inward pull.
const v2Bulge = (r) => G * MB * r / ((r + AB) ** 2);
const v2Disk  = (r) => { const S = AD + BD; return G * MD * r * r / ((r * r + S * S) ** 1.5); };
const v2Halo  = (r) => { const x = r / RS; return G * MS * (Math.log(1 + x) - x / (1 + x)) / r; };
const v2BH    = (r) => G * MBH / r;
const vCirc   = (r) => Math.sqrt(v2Bulge(r) + v2Disk(r)
  + (HALO ? v2Halo(r) : 0) + (BH ? v2BH(r) : 0));

// The clamped potential the DYNAMICS feel — same 0.05 kpc floor the
// clusters and fabric use. The BH term joins inside the same clamp.
function phi(R) {
  const r = Math.max(R, 0.5);
  let p = -G * MB / (r + AB)
        - G * MD / Math.sqrt(r * r + (AD + BD) ** 2);
  if (HALO) p -= G * MS * Math.log(1 + r / RS) / r;
  if (BH)   p -= G * MBH / r;
  return p;
}
const vEsc = (R) => Math.sqrt(2 * Math.abs(phi(R)));

// ---------- B0: the horizon constant, rebuilt from SI ----------
// The repo has spent "2.95 km per solar mass" since M7. Rebuild it:
// r_s = 2 G M / c^2, in kilometers.
const G_SI = 6.674e-11, MSUN = 1.989e30, C = 2.998e8;
const RS_KM_CHECK = 2 * G_SI * MSUN / (C * C) / 1e3;
console.log(`B0  horizon bridge: rebuilt ${RS_KM_CHECK.toFixed(4)} km/Msun vs spent 2.95  ` +
  `[${Math.abs(RS_KM_CHECK - 2.95) / 2.95 < 0.005 ? 'PASS' : 'FAIL'}]` +
  `   Sgr A* r_s = ${(2.95 * MBH).toExponential(3)} km`);

// ---------- B1: the S2 anchor — a real star times our engine ----------
// S2 orbits Sgr A* with a published semi-major axis of ~1036 AU and a
// measured period of 16.05 years. Kepler III with OUR G and the published
// mass must reproduce that clock: P = 2 pi sqrt(a^3 / (G M)).
const AU_KPC = 1 / 2.06265e8;              // 206,265 AU per pc, 1000 pc per kpc
const TU_YR  = 3.086e16 / 3.15576e7;       // one kpc/(km/s) time unit, in years
const aS2 = 1036 * AU_KPC;
const P_S2 = 2 * Math.PI * Math.sqrt(aS2 ** 3 / (G * MBH)) * TU_YR;
console.log(`B1  S2 period: predicted ${P_S2.toFixed(2)} yr vs measured 16.05  ` +
  `[${Math.abs(P_S2 - 16.05) / 16.05 < 0.02 ? 'PASS' : 'FAIL'}]`);
const rPeri = 120 * AU_KPC;                // S2's closest approach, ~120 AU
console.log(`      escape from S2's pericenter: ${Math.sqrt(2 * G * MBH / rPeri).toFixed(0)} km/s ` +
  `(~${(Math.sqrt(2 * G * MBH / rPeri) / 2.998e5 * 100).toFixed(1)}% of lightspeed)`);
const mBulgeInside = MB * aS2 * aS2 / ((aS2 + AB) ** 2);
console.log(`      bulge mass inside S2's orbit: ${mBulgeInside.toFixed(1)} Msun of ` +
  `${MBH.toExponential(2)} — the hole owns this room`);

// ---------- B2: the crossover — where the hole's reign ends ----------
// Bisection on v2BH(r) = v2Bulge(r). Scaffold takes the mass as an
// argument so B5's negative test can reuse it at 100x.
function crossover(mbh) {
  let lo = 1e-4, hi = 0.2;
  if (G * mbh / hi > v2Bulge(hi)) throw new Error(
    `crossover: the root sits ABOVE the ${hi} kpc bracket — widen hi. ` +
    `No silent bracket edges.`);;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (G * mbh / mid > v2Bulge(mid)) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}
const rX = crossover(MBH);
console.log(`B2  crossover: ${(rX * 1000).toFixed(2)} pc  ` +
  `[${rX > 0.006 && rX < 0.012 ? 'PASS' : 'FAIL'}]  (sealed: ~8.6 pc)`);

// ---------- B3: the fingerprint — falling vs rising ----------
// Log-log slope of the circular speed at 1 pc. A point mass demands
// v ~ 1/sqrt(r): slope -1/2. Without the hole, bulge and halo both give
// solid-body rise: slope +1/2. The SIGN FLIP is the signature (R4's
// pattern, moved to the center).
function slope(r) {
  const f = 1.01;
  return Math.log(vCirc(r * f) / vCirc(r / f)) / Math.log(f * f);
}
BH = true;  const sOn  = slope(0.001);
BH = false; const sOff = slope(0.001);
BH = true;
console.log(`B3  slope at 1 pc: BH on ${sOn.toFixed(3)}, BH off ${sOff.toFixed(3)}  ` +
  `[${sOn < -0.4 && sOff > 0.4 ? 'PASS' : 'FAIL'}]  (sealed: -0.5 vs +0.5)`);

// ---------- B4: regression — the receipted world must not move ----------
// Adding 4.3e6 Msun to a 5.2e11 Msun galaxy is a rounding error outside
// the hole's own room. Certify it: the Sun's curve handshake stays 232.1,
// and escape speed at the INNERMOST cluster's seat (NGC 6522, 0.6 kpc)
// shifts by less than 0.1 km/s — so no census verdict can flip.
BH = true;  const vSunOn  = vCirc(8.2);
BH = false; const vSunOff = vCirc(8.2);
BH = true;  const e06On = vEsc(0.6), e89On = vEsc(8.9);
BH = false; const e06Off = vEsc(0.6), e89Off = vEsc(8.9);
BH = true;
const dSun = Math.abs(vSunOn - 232.1);
const d06 = Math.abs(e06On - e06Off), d89 = Math.abs(e89On - e89Off);
console.log(`B4  handshake: vCirc(8.2) = ${vSunOn.toFixed(1)} (shift ${(vSunOn - vSunOff).toFixed(4)})  ` +
  `[${dSun < 0.05 ? 'PASS' : 'FAIL'}]`);
console.log(`      vEsc shift: ${d06.toFixed(3)} km/s at 0.6 kpc, ${d89.toFixed(4)} at 8.9  ` +
  `[${d06 < 0.1 && d89 < 0.1 ? 'PASS' : 'FAIL'}]  — no census flip possible`);

// ---------- B5: the crossover ----------
// Sealed: rAnalytic ≈ 8.61 pc; naive ×10, corrected rBig/rX ≈ 11.83.
const q = Math.sqrt(MBH / MB), rAnalytic = AB * q / (1 - q);
const err = Math.abs(rAnalytic - rX) / rX;
if (err < 0.01) console.log(`B5 analytic: ${(rAnalytic * 1000).toFixed(2)} pc [PASS]`);
else { console.error(`B5 analytic [FAIL]: error ${(100 * err).toFixed(2)}%`); process.exitCode = 1; }
const q100 = 10 * q, rBig = crossover(100 * MBH);
const rAnalyticBig = AB * q100 / (1 - q100);
const errBig = Math.abs(rAnalyticBig - rBig) / rBig, ratio = rBig / rX;
if (errBig < 0.01) console.log(`B5 100x: ${(rBig * 1000).toFixed(2)} pc [PASS], rBig/rX=${ratio.toFixed(2)}`);
else { console.error(`B5 100x [FAIL]: error ${(100 * errBig).toFixed(2)}%, rBig/rX=${ratio.toFixed(2)}`); process.exitCode = 1; }