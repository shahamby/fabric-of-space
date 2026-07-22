// lab/curveLab.mjs — M12g pre-registration: the flagship measurement
// becomes an on-screen instrument. This lab receipts the CHART'S OWN MATH
// before a single pixel renders: the sampler, the log ruler, the pixel
// ruler, and the anchors — all the exact constants the browser will ship.
// Bonus receipt: V0 corrects a documentation error caught while building
// it — the 88.4 km/s dark-matter gap belongs to 24.6 kpc (galaxyLab R3's
// own seat), NOT to the Sun's. At 8.2 kpc the gap is 47.1.
// Run:  node lab/curveLab.mjs

// ---------- The well: house constants, all four tenants ----------
const G  = 4.301e-6;
const MB = 1.5e10, AB = 0.5;
const MD = 6.5e10, AD = 3.0, BD = 0.3;
const MS = 5.0e11, RS = 16;
const MBH = 4.30e6;
let HALO = true;

// The exact function the chart reads — physics.js galaxyVCircInner,
// mirrored: unclamped to 0.0001 kpc, all tenants, halo obeys the switch.
function vInner(R, withBH = true) {
  const r = Math.max(R, 1e-4), S = AD + BD;
  let v2 = G * MB * r / ((r + AB) ** 2)
         + G * MD * r * r / ((r * r + S * S) ** 1.5);
  if (HALO) {
    const x = r / RS;
    v2 += G * MS * (Math.log(1 + x) - x / (1 + x)) / r;
  }
  if (withBH) v2 += G * MBH / r;
  return Math.sqrt(v2);
}

// ---------- The instrument's geometry — SHIPPED VERBATIM ----------
// One panel, four and a half decades. These constants go to main.js
// unchanged; receipting them here IS receipting the browser.
const R_MIN = 1e-3, R_MAX = 30;            // 1 pc to 30 kpc
const V_MAX = 250;                          // km/s, top of the axis
const X0 = 34, X1 = 308;                    // plot columns, px
const Y_TOP = 16, Y_AXIS = 140;             // plot rows, px

const LOGSPAN = Math.log10(R_MAX) - Math.log10(R_MIN);
const rToPx = (R)  => X0 + (Math.log10(R) - Math.log10(R_MIN)) / LOGSPAN * (X1 - X0);
const pxToR = (px) => R_MIN * 10 ** ((px - X0) / (X1 - X0) * LOGSPAN);
const vToPy = (v)  => Y_AXIS - v / V_MAX * (Y_AXIS - Y_TOP);
const pyToV = (py) => (Y_AXIS - py) / (Y_AXIS - Y_TOP) * V_MAX;

// The sampler the browser will run: N log-spaced points, ready to draw.
function buildSamples(n = 200) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const R = R_MIN * 10 ** (i / (n - 1) * LOGSPAN);
    const v = vInner(R, true);
    out.push({ R, v, px: rToPx(R), py: vToPy(v) });
  }
  return out;
}

// ---------- V0: anchors — and the gap put back in its seat ----------
HALO = true;  const vSun = vInner(8.2);
const gap82 = vSun - (() => { HALO = false; const x = vInner(8.2); HALO = true; return x; })();
const gap246 = vInner(24.6) - (() => { HALO = false; const x = vInner(24.6); HALO = true; return x; })();
console.log(`V0  anchors: v(8.2) = ${vSun.toFixed(1)}  ` +
  `[${Math.abs(vSun - 232.1) < 0.05 ? 'PASS' : 'FAIL'}]  (R1 said 232.1)`);
console.log(`      gap at 24.6 kpc = ${gap246.toFixed(1)}  ` +
  `[${Math.abs(gap246 - 88.4) < 0.5 ? 'PASS' : 'FAIL'}]  (R3's seat — 24.6, not the Sun's)`);
console.log(`      gap at  8.2 kpc = ${gap82.toFixed(1)}  ` +
  `[${Math.abs(gap82 - 47.1) < 0.5 ? 'PASS' : 'FAIL'}]  (the W29 erratum's number)`);

// ---------- V1: the rulers, made to confess ----------
// Round trip both mappings across the whole grid. A ruler that cannot
// reproduce its own markings is not a ruler.
let worst = 0;
for (const s of buildSamples(200)) {
  worst = Math.max(worst,
    Math.abs(pxToR(rToPx(s.R)) - s.R) / s.R,
    Math.abs(pyToV(vToPy(s.v)) - s.v) / Math.max(s.v, 1));
}
console.log(`V1  ruler round trip: worst ${worst.toExponential(1)}  ` +
  `[${worst < 1e-9 ? 'PASS' : 'FAIL'}]`);

// ---------- V2: the valley — where the hole hands off ----------
// Fine grid over the inner room. Sealed: minimum ~66 km/s near 8-9 pc,
// the hand-off between the hole's falling curve and the bulge's rise.
let rMin = 0, vMin = Infinity;
for (let i = 0; i <= 4000; i++) {
  const R = 1e-3 * 10 ** (i / 4000 * Math.log10(50));   // 1 pc .. 0.05 kpc
  const v = vInner(R, true);
  if (v < vMin) { vMin = v; rMin = R; }
}
console.log(`V2  valley: ${vMin.toFixed(1)} km/s at ${(rMin * 1000).toFixed(2)} pc  ` +
  `[${vMin > 60 && vMin < 72 && rMin > 0.007 && rMin < 0.010 ? 'PASS' : 'FAIL'}]  ` +
  `(sealed: ~66 near 8-9 pc)`);

// ---------- V3: flatness restated through the new eyes ----------
HALO = true;  const dropOn  = (vInner(8.2) - vInner(24.6)) / vInner(8.2) * 100;
HALO = false; const dropOff = (vInner(8.2) - vInner(24.6)) / vInner(8.2) * 100;
HALO = true;
console.log(`V3  drop 8.2 -> 24.6 kpc: ON ${dropOn.toFixed(1)}%, OFF ${dropOff.toFixed(1)}%  ` +
  `[${Math.abs(dropOn - 11.7) < 0.3 && Math.abs(dropOff - 37.0) < 0.3 ? 'PASS' : 'FAIL'}]  ` +
  `(R2 said 11.7 / 37.0)`);

// ---------- V4: read the instrument like a person ----------
// An instrument you cannot read backwards is a picture. Prove a person
// tracing the drawn polyline recovers the true physics.
// NOTE, one honest upgrade to the plan: the promised "swap log10 for ln"
// negative test is secretly a no-op — swapped CONSISTENTLY, the bases
// cancel in the ratio and the mapping is identical. The truer sin, and
// the new negative test, is reading a log axis AS IF IT WERE LINEAR —
// the number-one real-world chart mistake.
const samples = buildSamples(200);
const columns = [60, 171, 290];
const READ_SEAL = 0.001, LIE_SEAL = 0.20;

const readings = columns.map(col => {
  const i = samples.findIndex((s, j) =>
    j < samples.length - 1 && s.px <= col && col < samples[j + 1].px);
  const a = samples[i], b = samples[i + 1];
  const f = (col - a.px) / (b.px - a.px);
  const vRead = pyToV(a.py + f * (b.py - a.py));
  const R = pxToR(col), vTrue = vInner(R, true);
  return { col, vRead, error: Math.abs(vRead - vTrue) / vTrue };
});

if (readings.every(r => r.error < READ_SEAL)) {
  console.log(`V4  polyline reading: worst ${Math.max(...readings.map(r => r.error)).toExponential(2)}  [PASS]`);
} else {
  console.log(`V4  polyline reading  [FAIL]`);
  process.exitCode = 1;
}

const middle = readings[1];
const rWrong = R_MIN + (middle.col - X0) / (X1 - X0) * (R_MAX - R_MIN);
const lieError = Math.abs(middle.vRead - vInner(rWrong, true)) / vInner(rWrong, true);

if (lieError > LIE_SEAL) {
  console.log(`V4  linear-ruler lie: ${(lieError * 100).toFixed(1)}% wrong  [PASS — lie caught]`);
} else {
  console.log(`V4  linear-ruler lie: ${(lieError * 100).toFixed(1)}% wrong  [FAIL]`);
  process.exitCode = 1;
}
