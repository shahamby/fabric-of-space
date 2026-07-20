// lab/starsLab.mjs — M12c pre-registration: a star RIDES the measured well.
// M12a measured the curve. M12b shaped the well. This lab proves a star,
// leapfrogged in that same potential, holds its circle and keeps the
// curve's clock — BEFORE any star touches the browser.
// Units: kpc, Myr. Speeds quoted in km/s via the W0 bridge.
// Run:  node lab/starsLab.mjs

// ---------- W0: the unit bridge, audited ----------
const KPC_KM = 3.0857e16;              // km in one kiloparsec
const MYR_S  = 3.1557e13;              // seconds in one megayear
const KMS    = MYR_S / KPC_KM;         // 1 km/s in kpc/Myr
console.log(`W0  1 km/s = ${KMS.toExponential(4)} kpc/Myr  (expect 1.0227e-3)`);

// ---------- The well: SAME constants as M12a / physics.js GALAXY ----------
// Self-contained on purpose; S1 below is the drift detector — it can only
// PASS if these digits still match the curve of record.
const G  = 4.301e-6;                   // kpc·(km/s)²/Msun
const MB = 1.5e10, AB = 0.5;           // bulge
const MD = 6.5e10, AD = 3.0, BD = 0.3; // disk
const MS = 5.0e11, RS = 16;            // dark halo
let HALO = true;

function phi(R) {                      // (km/s)² at planar radius R kpc
  const r = Math.max(R, 0.05);
  let p = -G * MB / (r + AB)
        - G * MD / Math.sqrt(r * r + (AD + BD) ** 2);
  if (HALO) p -= G * MS * Math.log(1 + r / RS) / r;
  return p;
}

// Circular speed from the well itself: v² = R · dΦ/dR (central difference).
function vCirc(R) {
  const h = 1e-4;
  const dPhi = (phi(R + h) - phi(R - h)) / (2 * h);
  return Math.sqrt(R * dPhi);          // km/s
}

// ---------- S1: the curve of record, recovered from Φ alone ----------
const v82 = vCirc(8.2);
console.log(`S1  vCirc(8.2, halo ON) = ${v82.toFixed(1)} km/s  ` +
  `[${Math.abs(v82 - 232.1) < 0.3 ? 'PASS' : 'FAIL'}]  (M12a R1: 232.1)`);

// ---------- S2: the dark-matter gap at 24.6 kpc ----------
const vOn = vCirc(24.6);
HALO = false; const vOff = vCirc(24.6); HALO = true;
const gap = vOn - vOff;
console.log(`S2  gap(24.6) = ${gap.toFixed(1)} km/s  ` +
  `[${Math.abs(gap - 88.4) < 0.5 ? 'PASS' : 'FAIL'}]  (M12a R3: 88.4)`);

// ---------- The star: leapfrog in the measured well ----------
// Acceleration points inward along r-hat; magnitude dΦ/dR, converted to
// kpc/Myr² through the W0 bridge squared.
function accel(x, y) {
  const R = Math.max(Math.hypot(x, y), 0.05);
  const h = 1e-4;
  const dPhi = (phi(R + h) - phi(R - h)) / (2 * h);   // (km/s)²/kpc
  const a = -dPhi * KMS * KMS / R;                     // kpc/Myr² per unit
  return [a * x, a * y];
}

// One full lap: start at (R, 0) moving +y at the well's own circular
// speed; stamp the return crossing of y = 0 (vy > 0) with sub-step
// interpolation — the M10d medicine, reused on purpose.
function measureLap(R, haloOn) {
  const saved = HALO; HALO = haloOn;
  const v = vCirc(R) * KMS;            // kpc/Myr
  const T_est = 2 * Math.PI * R / v;
  const dt = T_est / 4000;
  let x = R, y = 0, vx = 0, vy = v;
  let [ax, ay] = accel(x, y);
  const E0 = 0.5 * (vx * vx + vy * vy) + phi(Math.hypot(x, y)) * KMS * KMS;
  let lapT = NaN, rMin = R, rMax = R, dEmax = 0;
  for (let n = 1; n <= 30000; n++) {
    vx += 0.5 * dt * ax; vy += 0.5 * dt * ay;          // kick
    const yPrev = y;
    x += dt * vx; y += dt * vy;                        // drift
    [ax, ay] = accel(x, y);
    vx += 0.5 * dt * ax; vy += 0.5 * dt * ay;          // kick
    const r = Math.hypot(x, y);
    rMin = Math.min(rMin, r); rMax = Math.max(rMax, r);
    const E = 0.5 * (vx * vx + vy * vy) + phi(r) * KMS * KMS;
    dEmax = Math.max(dEmax, Math.abs((E - E0) / E0));
    if (Number.isNaN(lapT) && yPrev < 0 && y >= 0 && vy > 0) {
      const frac = -yPrev / (y - yPrev);               // see between heartbeats
      lapT = (n - 1 + frac) * dt;
    }
  }
  HALO = saved;
  return { lapT, rDrift: Math.max(rMax - R, R - rMin) / R, dEmax };
}

// ---------- S3: the Sun's seat holds its circle and its clock ----------
const sun = measureLap(8.2, true);
console.log(`S3  lap(8.2, ON) = ${sun.lapT.toFixed(1)} Myr  ` +
  `[${Math.abs(sun.lapT - 217.0) < 1.0 ? 'PASS' : 'FAIL'}]  (2πR/v: 217.0)`);
console.log(`S3b radius drift = ${sun.rDrift.toExponential(2)}  ` +
  `[${sun.rDrift < 1e-3 ? 'PASS' : 'FAIL'}]  (< 1e-3)`);
console.log(`S3c |dE/E| max  = ${sun.dEmax.toExponential(2)}  ` +
  `[${sun.dEmax < 5e-6 ? 'PASS' : 'FAIL'}]  (< 5e-6)`);

// ---------- S4: the shear clock — SHAMBU'S HAND ----------
// Spec (write below this comment, ~7 lines):
//   1. tOn82  = sun.lapT               (already measured above)
//   2. tOn246 = measureLap(24.6, true).lapT
//   3. tOff82 and tOff246 = same two radii, haloOn = false
//   4. ratioOn  = tOn246 / tOn82       (inner laps per outer lap, halo ON)
//      ratioOff = tOff246 / tOff82     (same, halo OFF)
//   5. Print both ratios to 2 decimals.
//   6. PASS if ratioOff > ratioOn + 1.0 — without dark matter the
//      outskirts fall behind HARDER. The halo is what tames the shear.
let tOn82 = sun.lapT, tOn246 = measureLap(24.6, true).lapT;
let tOff82 = measureLap(8.2, false).lapT, tOff246 = measureLap(24.6, false).lapT;
let ratioOn = tOn246 / tOn82, ratioOff = tOff246 / tOff82;
console.log(`Halo ON ratio: ${ratioOn.toFixed(2)}`);
console.log(`Halo OFF ratio: ${ratioOff.toFixed(2)}`);
if (ratioOff > ratioOn + 1.0) {
    console.log("PASS: The outskirts fall behind HARDER. The halo tames the shear.");
}
