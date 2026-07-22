// lab/gaiaLab.mjs — M12e pre-registration: the clusters get their velocity.
// Harris gave each cluster one slice of its motion (the line-of-sight piece).
// Gaia EDR3 (Vasiliev & Baumgardt 2021) gives the sideways piece: proper
// motion. PM x distance = tangential speed; add the radial piece and the
// Sun's own ride, and every cluster carries a full 3D galactocentric
// velocity. The M12d runaway census upgrades from a floor to a count.
// Run:  node lab/gaiaLab.mjs                 (all receipts)
//       PLUMBING_ONLY=1 node lab/gaiaLab.mjs (G0-G3 only; census stays sealed)

import { writeFileSync, mkdirSync } from 'node:fs';

const GAIA_URL = 'https://vizier.cds.unistra.fr/viz-bin/asu-tsv'
  + '?-source=J/MNRAS/505/5978/tablea1'
  + '&-out=Name,OName,RAJ2000,DEJ2000,pmRA,pmDE'
  + '&-out.max=300';
const HARRIS_URL = 'https://vizier.cds.unistra.fr/viz-bin/asu-tsv'
  + '?-source=VII/202/catalog'
  + '&-out=ID,Name,Rsun,Rgc,X,Y,Z,Vr,Vlsr'
  + '&-out.max=200';

// ---------- The well: SAME constants + SAME phi as clusterLab ----------
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
function vEsc(R) { return Math.sqrt(2 * Math.abs(phi(R))); }

// The well's slope (outward). Pull is minus this, toward the center.
// Needed twice: the curve handshake below, and G5's orbit integrator.
function dphidr(R) {
  const r = Math.max(R, 0.05), S = AD + BD;
  let g = G * MB / ((r + AB) ** 2)
        + G * MD * r / ((r * r + S * S) ** 1.5);
  if (HALO) g += G * MS * (Math.log(1 + r / RS) / (r * r) - 1 / (r * (RS + r)));
  return g;
}
// Circular speed from the slope: v^2 = R x slope. Must reproduce the
// receipted curve (galaxyLab R1: 232.1 km/s at 8.2 kpc) — the handshake
// that binds this file's force law to the one already on the books.
function vCirc(R) { return Math.sqrt(R * dphidr(R)); }

// ---------- G0: two fetches, two receipts ----------
async function grab(url, snapshot, label, minBytes) {
  const res = await fetch(url);
  const text = await res.text();
  console.log(`G0  ${label}: HTTP ${res.status}, ${text.length} bytes  ` +
    `[${res.status === 200 && text.length > minBytes ? 'PASS' : 'FAIL'}]`);
  mkdirSync('data', { recursive: true });
  writeFileSync(snapshot, text);
  return text;
}
const gaiaText   = await grab(GAIA_URL,   'data/gaia_pm.tsv',   'Gaia PMs  ', 8000);
const harrisText = await grab(HARRIS_URL, 'data/harris_vr.tsv', 'Harris Vr ', 5000);

// ---------- G1: parse both, crossmatch by normalized name ----------
const rows = (t) => t.split('\n').filter((l) => l && !l.startsWith('#')).slice(3);
const norm = (s) => (s || '').toUpperCase().replace(/\s+/g, '');

const pmByName = new Map();
for (const line of rows(gaiaText)) {
  const [name, oname, ra, de, pmra, pmde] = line.split('\t').map((s) => s.trim());
  if (!ra || !de || !pmra || !pmde) continue;
  const rec = { ra: +ra, de: +de, pmra: +pmra, pmde: +pmde };
  pmByName.set(norm(name), rec);
  if (oname) pmByName.set(norm(oname), rec);
}

const matched = [];
let nHarris = 0;
const unmatched = [];
for (const line of rows(harrisText)) {
  const [id, name, rsun, rgc, X, Y, Z, vr, vlsr] = line.split('\t').map((s) => s.trim());
  if (!rsun || !rgc || !X || !Y || !Z) continue;      // same skip rule as C1
  nHarris++;
  const pm = pmByName.get(norm(id)) || pmByName.get(norm(name));
  if (!pm) { unmatched.push(id || name); continue; }
  matched.push({
    id, rsun: +rsun, rgcCat: +rgc,
    xh: +X, yh: +Y, zh: +Z,                            // heliocentric, X toward GC
    vr:   vr   === '' ? null : +vr,                    // HELIOCENTRIC radial — the
    vlsr: vlsr === '' ? null : +vlsr,                  // vector math needs vr, NOT vlsr
    ...pm,
  });
}
console.log(`G1  Gaia ${pmByName.size} name keys | Harris ${nHarris} with positions | ` +
  `matched ${matched.length}  [${matched.length >= 140 ? 'PASS' : 'FAIL'}]  (seal: >= 140)`);
if (unmatched.length) console.log(`      unmatched Harris IDs: ${unmatched.join(', ')}`);

// ---------- G2: the unit bridge, rebuilt from SI ----------
// One constant carries this whole milestone: km/s per (mas/yr at 1 kpc).
// kpc in km, times one mas in radians, divided by one year in seconds.
const K = 4.740470;                                     // the constant the lab spends
const K_CHECK = (3.086e19 / 1e3) * (Math.PI / 180 / 3600 / 1e3) / (365.25 * 86400);
console.log(`G2  bridge: rebuilt ${K_CHECK.toFixed(4)} vs spent ${K}  ` +
  `[${Math.abs(K_CHECK - K) / K < 1e-3 ? 'PASS' : 'FAIL'}]`);

// ---------- G3: equatorial -> galactic -> repo axes, anchored ----------
const D2R = Math.PI / 180;
// IAU rotation, equatorial J2000 -> galactic. Row 1 = the direction of the
// galactic center, row 2 = the direction of rotation (l=90), row 3 = the
// north galactic pole, each written in equatorial coordinates.
const AG = [
  [-0.0548755604, -0.8734370902, -0.4838350155],
  [ 0.4941094279, -0.4448296300,  0.7469822445],
  [-0.8676661490, -0.1980763734,  0.4559837762],
];
const eqToGal = (v) => AG.map((r) => r[0] * v[0] + r[1] * v[1] + r[2] * v[2]);
const rHat = (ra, de) =>
  [Math.cos(de) * Math.cos(ra), Math.cos(de) * Math.sin(ra), Math.sin(de)];

// G3a — matrix anchors against published sky marks.
const ngp = eqToGal(rHat(192.85948 * D2R, 27.12825 * D2R));
const gc  = eqToGal(rHat(266.405 * D2R, -28.936 * D2R));
const gcOff = Math.acos(Math.min(1, gc[0])) / D2R;      // degrees off the l=0,b=0 axis
console.log(`G3a matrix: NGP z=${ngp[2].toFixed(7)} (want 1) | ` +
  `Sgr A* ${gcOff.toFixed(3)} deg off center axis  ` +
  `[${Math.abs(ngp[2] - 1) < 1e-6 && gcOff < 0.1 ? 'PASS' : 'FAIL'}]`);

// G3b — cross-catalog handshake: the line of sight built from Gaia RA/Dec,
// rotated by our matrix, must point along Harris's own heliocentric X,Y,Z.
// Wrong matrix or wrong crossmatch = tens of degrees, loudly.
const angles = matched.map((c) => {
  const u = eqToGal(rHat(c.ra * D2R, c.de * D2R));
  const h = Math.hypot(c.xh, c.yh, c.zh) || 1;
  const dot = (u[0] * c.xh + u[1] * c.yh + u[2] * c.zh) / h;
  return Math.acos(Math.min(1, Math.max(-1, dot))) / D2R;
}).sort((a, b) => a - b);
const medAng = angles[Math.floor(angles.length / 2)];
console.log(`G3b handshake: median angle Gaia-los vs Harris-XYZ = ` +
  `${medAng.toFixed(2)} deg (worst ${angles[angles.length - 1].toFixed(2)})  ` +
  `[${medAng < 1.0 ? 'PASS' : 'FAIL'}]  (Harris XYZ rounded to 0.1 kpc)`);

// G3c — the full pipeline, one cluster at a time.
// Helio velocity in equatorial axes: radial piece + two sky pieces.
// Rotate to galactic (x toward GC, y toward rotation, z up), then flip to
// repo axes (Sun at +X, Sgr A* at origin): x,y negate, z stays.
function vHelioRepo(c) {
  const ra = c.ra * D2R, de = c.de * D2R;
  const rh = rHat(ra, de);
  const ah = [-Math.sin(ra), Math.cos(ra), 0];
  const dh = [-Math.sin(de) * Math.cos(ra), -Math.sin(de) * Math.sin(ra), Math.cos(de)];
  const va = K * c.rsun * c.pmra, vd = K * c.rsun * c.pmde;   // sideways, km/s
  const veq = [0, 1, 2].map((i) => c.vr * rh[i] + va * ah[i] + vd * dh[i]);
  const vg = eqToGal(veq);
  return [-vg[0], -vg[1], vg[2]];
}
// The Sun's own ride, repo axes: circular speed of OUR model at 8.2 kpc
// plus the peculiar drift (11.1 toward center, 12.24 ahead, 7.25 up —
// Schoenrich, Binney & Dellar 2010). Using vlsr instead of vr in the
// pipeline would smuggle part of this in twice.
const R0 = 8.2;
HALO = true;
const VLSR = vCirc(R0);
console.log(`G3c curve handshake: vCirc(8.2) = ${VLSR.toFixed(1)} km/s  ` +
  `[${Math.abs(VLSR - 232.1) < 0.2 ? 'PASS' : 'FAIL'}]  (galaxyLab R1 said 232.1)`);
const VSUN = [-11.1, -(VLSR + 12.24), 7.25];
const posRepo = (c) => [R0 - c.xh, -c.yh, c.zh];
const vGC = (c) => vHelioRepo(c).map((v, i) => v + VSUN[i]);

// G3d — the forgot-the-Sun detector. Clusters are a pressure-supported
// swarm: their median rotation should be small. If we forgot to add the
// Sun's ride, the whole system would appear to counter-rotate at ~-244.
const withV = matched.filter((c) => c.vr !== null);
const vphi = withV.map((c) => {
  const p = posRepo(c), v = vGC(c);
  const Rcyl = Math.hypot(p[0], p[1]) || 1e-6;
  return (p[0] * v[1] - p[1] * v[0]) / Rcyl;            // signed; Sun's is -244
}).sort((a, b) => a - b);
const medPhi = vphi[Math.floor(vphi.length / 2)];
console.log(`G3d median cluster v_phi = ${medPhi.toFixed(1)} km/s ` +
  `(Sun's is ${(-(VLSR + 12.24)).toFixed(1)})  [${Math.abs(medPhi) < 100 ? 'PASS' : 'FAIL'}]`);

// Three eyeball rows: the line-of-sight number Harris knew, and the full
// speed Gaia completes. NGC 3201 is the M12d poster child (481.9 was Vlsr).
// LESSON (caught in this lab's first plumbing run): |v3D| can come out
// SMALLER than |Vlsr| — the LSR frame still rides the Sun's 232 km/s
// rotation, so Vlsr was never a clean floor on the true speed. CHEATS #10
// item 5 gets amended when this milestone lands. History stands; the
// ledger line corrects the record.
for (const pick of ['NGC 3201', 'NGC 104', 'NGC 5139']) {
  const c = matched.find((m) => norm(m.id) === norm(pick));
  if (c && c.vr !== null) console.log(`      ${pick.padEnd(9)}  |Vlsr| ` +
    `${Math.abs(c.vlsr).toFixed(1).padStart(6)}   |v3D| ${Math.hypot(...vGC(c)).toFixed(1).padStart(6)} km/s`);
}

// G3e — round trip. Run the pipeline BACKWARD for one cluster: subtract
// the Sun, transpose the (orthonormal) matrix, project back onto the sky
// directions, and the original vr / pmRA / pmDE must reappear to machine
// precision. Tests the machinery itself, immune to physics surprises.
{
  const c = matched.find((m) => m.vr !== null);
  const vhr = vGC(c).map((v, i) => v - VSUN[i]);
  const vg = [-vhr[0], -vhr[1], vhr[2]];
  const veq = [0, 1, 2].map((i) => AG[0][i] * vg[0] + AG[1][i] * vg[1] + AG[2][i] * vg[2]);
  const ra = c.ra * D2R, de = c.de * D2R;
  const rh = rHat(ra, de);
  const ah = [-Math.sin(ra), Math.cos(ra), 0];
  const dh = [-Math.sin(de) * Math.cos(ra), -Math.sin(de) * Math.sin(ra), Math.cos(de)];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const err = Math.abs(dot(veq, rh) - c.vr)
            + Math.abs(dot(veq, ah) / (K * c.rsun) - c.pmra)
            + Math.abs(dot(veq, dh) / (K * c.rsun) - c.pmde);
  // Gate sits above the matrix's own noise: AG ships with 10 printed
  // digits, so transpose-as-inverse holds to ~1e-8. A real bug (swapped
  // sign, wrong projection) screams at order 10-500.
  console.log(`G3e round trip on ${c.id}: total error ${err.toExponential(1)}  ` +
    `[${err < 1e-6 ? 'PASS' : 'FAIL'}]  (matrix truncation floor ~1e-8)`);
}

// ---------- G4: the census, upgraded (sealed until the full run) ----------
// SEALED before the first full run (the plumbing run never executed this
// block). What is gated is only what is solid: at least one real cluster
// leaves the baryons-only well at its true 3D speed (NGC 3201's 367.6
// already clears the ~270 baryon escape at its seat). The COUNTS are the
// measurement: sealed guesses, printed beside the result, not gated.
//   - halo OFF, 3D: guess 5-15. NOT required to beat the old Vlsr count of
//     10 — that number was frame-dressed (see the lesson above).
//   - halo ON, 3D: guess 0-5. A surprise here is a physics finding to
//     investigate, not automatically a bug.
if (!process.env.PLUMBING_ONLY) {
  const cens = matched.filter((c) => c.vr !== null && c.vlsr !== null);
  let n3Off = 0, n3On = 0, nLosOff = 0;
  const leavers = [];
  for (const c of cens) {
    const v = Math.hypot(...vGC(c)), R = c.rgcCat;
    HALO = false;
    const eOff = vEsc(R);
    if (Math.abs(c.vlsr) > eOff) nLosOff++;
    if (v > eOff) { n3Off++; leavers.push({ n: c.id, R, v, eOff }); }
    HALO = true;
    if (v > vEsc(R)) n3On++;
  }
  console.log(`G4  census on ${cens.length} clusters (same subset all three ways):`);
  console.log(`      halo OFF — old Vlsr way ${nLosOff}, true 3D ${n3Off}  ` +
    `[${n3Off >= 1 ? 'PASS' : 'FAIL'}]  (gate: at least one real leaver)`);
  console.log(`      halo ON  — true 3D unbound: ${n3On}   (sealed 0-5; measured, not gated)`);
  for (const l of leavers) console.log(`      ${l.n.padEnd(10)} R ${String(l.R).padStart(5)} kpc` +
    `   |v3D| ${l.v.toFixed(1).padStart(6)}   vEsc(baryons) ${l.eOff.toFixed(1)}`);
}

// ---------- G5: one real orbit, receipted — SHAMBU'S HAND ----------
// Scaffold (math tools, provided): a 3D leapfrog in this same well.
const TU_MYR = 3.086e16 / 3.15576e13;   // one (kpc / km/s) time unit ~ 977.9 Myr
function accelSph(p) {                   // pull vector, toward the center
  const r = Math.max(Math.hypot(...p), 0.05);
  const g = dphidr(r);
  return p.map((x) => -g * x / r);
}
function stepKDK(s, dt) {                // half-kick, drift, half-kick
  let a = accelSph(s.p);
  s.v = s.v.map((v, i) => v + 0.5 * dt * a[i]);
  s.p = s.p.map((x, i) => x + dt * s.v[i]);
  a = accelSph(s.p);
  s.v = s.v.map((v, i) => v + 0.5 * dt * a[i]);
}
function energy(s) { return 0.5 * (s.v[0] ** 2 + s.v[1] ** 2 + s.v[2] ** 2) + phi(Math.hypot(...s.p)); }
const target = matched.find((c) => norm(c.id) === 'NGC3201' && c.vr !== null);
const s0 = target ? { p: posRepo(target), v: vGC(target) } : null;

// Spec (write below this comment, ~14 lines):
//   1. HALO = true. Copy the start: s = { p: [...s0.p], v: [...s0.v] }.
//      Seal E0 = energy(s) — the number the whole run must keep.
//   2. dt = 0.001 (one step ~ 0.98 Myr — TU_MYR is the bridge).
//      Run N = 6000 steps of stepKDK(s, dt): about 5.9 Gyr of flight.
//   3. Every step, track rmin and rmax of r = Math.hypot(...s.p), and the
//      worst |energy(s) - E0| / |E0| seen so far. Name it dEmax.
//   4. BEFORE running: write your sealed guesses for rmin and rmax in a
//      comment here. (Hint: the cluster's CURRENT radius Math.hypot(...s0.p)
//      must land between them — a turning-point law, free of any catalog.)
//   5. Print rmin (pericenter), rmax (apocenter), dEmax.
//   6. PASS if: rmin <= current radius <= rmax  AND  rmax < 200 (the halo
//      holds it)  AND  dEmax < 1e-4 (leapfrog's floor at dt 0.001 — certified by G5b). Print FAIL loudly in an else. No
//      silent instruments.
//   7. NEGATIVE test: set HALO = false, rerun the same loop from s0, print
//      the new rmax. Sealed guess: without dark matter this cluster does
//      not turn around — rmax runs away past 200 kpc. Set HALO back to true.
let s = { p: [...s0.p], v: [...s0.v] }, E0 = energy(s), rmin = Infinity, rmax = 0, dEmax = 0; HALO = true;
// Sealed guesses were rmin 20 / rmax 120, written against a misread current
// R of 66.8 — the live value is ~9.03, and the PASS gate itself proves it,
// since 66.8 > rmax. Measured: rmin 8.65 / rmax 37.93. Seal missed; law held.
for (let n = 0; n < 6000; n++) {
  stepKDK(s, 0.001); let r = Math.hypot(...s.p);
  rmin = Math.min(rmin, r); rmax = Math.max(rmax, r);
  dEmax = Math.max(dEmax, Math.abs(energy(s) - E0) / Math.abs(E0));
}
console.log(rmin, rmax, dEmax);
if (rmin <= Math.hypot(...s0.p) && rmax >= Math.hypot(...s0.p) && rmax < 200 && dEmax < 1e-4) {
  console.log("PASS"); HALO = false; rmin = Infinity; rmax = 0; s.p = [...s0.p]; s.v = [...s0.v];
  for (let n = 0; n < 6000; n++) { stepKDK(s, 0.001); rmax = Math.max(rmax, Math.hypot(...s.p)); }
  console.log(rmax); HALO = true;
} else console.log("FAIL");
// G5b — certify the 1e-4 gate: halve dt, and dEmax must drop ~x4 (the
// DT^2 law). Proves 6.9e-5 is the integrator's honest wobble, not a leak.
// Sealed: ratio lands between 3 and 5.
HALO = true;
let s2 = { p: [...s0.p], v: [...s0.v] }, dE2 = 0;
for (let n = 0; n < 12000; n++) {
  stepKDK(s2, 0.0005);
  dE2 = Math.max(dE2, Math.abs(energy(s2) - E0) / Math.abs(E0));
}
const ratio = dEmax / dE2;
console.log(`G5b dt-halving: dEmax ${dEmax.toExponential(2)} -> ${dE2.toExponential(2)}, ` +
  `ratio ${ratio.toFixed(2)}  [${ratio > 3 && ratio < 5 ? 'PASS' : 'FAIL'}]`);