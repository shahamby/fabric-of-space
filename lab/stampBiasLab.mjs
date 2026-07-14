// stampBiasLab.mjs — forensics for the SillyUserQuestions OPEN item (2026-07-13):
// "Why does the valley-stamp bearing misreport perturbation differentials
//  (−91″/cy) that the LRL witness reads true (+43″/cy), and why is that
//  bias DT-invariant?"
//
// Method: replicate main.js's two witnesses EXACTLY against the byte-identical
// physics module (sha256 4a72abd9…), then add two court-appointed experts the
// browser never had:
//   (1) an ORACLE — parabolic sub-step interpolation that reads the bearing
//       at the TRUE radial minimum instead of at the stamp's grid step, and
//   (2) a TIMING LEDGER — the interpolated minimum time t* of every lap, so
//       we can watch run B's perihelia slide against run A's on a shared clock.
//
// Zero dependencies beyond node built-ins + physics.mjs. Supply chain: intact.

import { readFileSync, writeFileSync } from 'node:fs';
import { computeAccelerations, leapfrogStep, PN1 } from './physics.mjs';

const data = JSON.parse(readFileSync(new URL('../data/bodies.json', import.meta.url), 'utf8'));
const G = data._meta.G_au3_msun_day2;

const ARCSEC_PER_RAD = 206264.8;    // main.js's own constants, verbatim
const DAYS_PER_CENTURY = 36525;
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));

// ---- roster factory: fresh, spread-copied state every run (provenance rule:
// evidence must not change after collection — no shared references)
function makeBodies(twoBody) {
  const roster = twoBody
    ? data.bodies.filter(b => b.name === 'Sun' || b.name === 'Mercury')
    : data.bodies;
  return roster.map(b => ({
    name: b.name, mass: b.mass_msun, radius_km: b.radius_km,
    pos: [...b.position_au], vel: [...b.velocity_au_day], acc: [0, 0, 0],
  }));
}

// ---- one boot: integrate until maxLaps stamps are on the ledger ----------
// Replicates main.js line-for-line where it matters:
//   prime -> loop { leapfrogStep; simDays += DT; checkPerihelion() }
//   valley test:  isFinite(prev2) && prev2 > prev && prev <= r
//   stamp bearing: 2-D ecliptic atan2, read at the CURRENT step
//   LRL witness:   3-D eccentricity vector, sampled at stamps only
function boot({ twoBody, pn1, DT, maxLaps }) {
  const bodies = makeBodies(twoBody);
  const sun = bodies.find(b => b.name === 'Sun');
  const mrc = bodies.find(b => b.name === 'Mercury');

  PN1.on = pn1;                       // the E key, thrown before the first stamp
  computeAccelerations(bodies, G);    // prime, exactly like main.js line 84

  let simDays = 0;
  let periRPrev2 = Infinity, periRPrev = Infinity;
  let periAngleLast = null, periDriftTotal = 0, periLaps = 0;
  let periLRLLast = null, periLRLDrift = 0;

  // forensic ring buffer: last three (t, relative position, r) samples,
  // so the oracle can interpolate without touching the instrument.
  const ring = [null, null, null];
  const ledger = [];                  // one row per stamp (row 0 = reference)

  const stepCap = Math.ceil((maxLaps + 3) * 88.5 / DT);
  for (let n = 0; n < stepCap && periLaps < maxLaps; n++) {
    leapfrogStep(bodies, DT, G);
    simDays += DT;

    const relx = mrc.pos[0] - sun.pos[0],
          rely = mrc.pos[1] - sun.pos[1],
          relz = mrc.pos[2] - sun.pos[2];
    const r = Math.hypot(relx, rely, relz);
    ring[0] = ring[1]; ring[1] = ring[2];
    ring[2] = { t: simDays, rel: [relx, rely, relz], r };

    if (Number.isFinite(periRPrev2) && periRPrev2 > periRPrev && periRPrev <= r) {
      const angle = Math.atan2(rely, relx);          // the stamp, verbatim

      // LRL witness, verbatim from main.js checkPerihelion
      const vx = mrc.vel[0] - sun.vel[0], vy = mrc.vel[1] - sun.vel[1], vz = mrc.vel[2] - sun.vel[2];
      const gmS = G * sun.mass;
      const hx = rely * vz - relz * vy, hy = relz * vx - relx * vz, hz = relx * vy - rely * vx;
      const ex = (vy * hz - vz * hy) / gmS - relx / r,
            ey = (vz * hx - vx * hz) / gmS - rely / r,
            ez = (vx * hy - vy * hx) / gmS - relz / r;
      if (periLRLLast) {
        const P = periLRLLast,
              cx = P[1] * ez - P[2] * ey, cy = P[2] * ex - P[0] * ez, cz = P[0] * ey - P[1] * ex;
        periLRLDrift += Math.sign(cx * hx + cy * hy + cz * hz) *
                        Math.atan2(Math.hypot(cx, cy, cz), P[0] * ex + P[1] * ey + P[2] * ez);
      }
      periLRLLast = [ex, ey, ez];

      // ---- the oracle: parabola through the three ring samples ----------
      // r(t) near the bottom is a parabola to leading order; its vertex is
      // the true minimum. Offset from the middle sample, in units of DT:
      //   s = (r0 − r2) / (2 (r0 − 2 r1 + r2)),   s ∈ (−0.5, +0.5]
      const [q0, q1, q2] = ring;
      let tStar = null, lambdaStar = null;
      if (q0) {
        const denom = q0.r - 2 * q1.r + q2.r;
        const s = denom !== 0 ? (q0.r - q2.r) / (2 * denom) : 0;
        tStar = q1.t + s * DT;
        const interp = k => {          // same parabola, per coordinate
          const a = (q0.rel[k] - 2 * q1.rel[k] + q2.rel[k]) / 2;
          const b = (q2.rel[k] - q0.rel[k]) / 2;
          return q1.rel[k] + b * s + a * s * s;
        };
        lambdaStar = Math.atan2(interp(1), interp(0));
      }

      if (periAngleLast !== null) {
        periDriftTotal += wrap(angle - periAngleLast);
        periLaps++;
      }
      periAngleLast = angle;

      ledger.push({
        lap: periLaps, tStamp: simDays, angle,
        drift: periDriftTotal,         // radians, telescoped stamp ledger
        lrl: periLRLDrift,             // radians, LRL ledger
        tStar, lambdaStar,             // the oracle's testimony
      });
    }
    periRPrev2 = periRPrev;
    periRPrev = r;
  }
  return { ledger };
}

// ---- two-boot differential, per the M8c protocol ------------------------
function slope(xs, ys) {              // plain least squares, no libraries
  const n = xs.length;
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (let i = 0; i < n; i++) { sx += xs[i]; sy += ys[i]; sxx += xs[i] * xs[i]; sxy += xs[i] * ys[i]; }
  return (n * sxy - sx * sy) / (n * sxx - sx * sx);
}

function differential(A, B, LO, HI) {
  // telescoped oracle ledger, built exactly the way the stamp ledger is
  const teleInterp = run => {
    const out = [0]; let acc = 0;
    for (let i = 1; i < run.ledger.length; i++) {
      acc += wrap(run.ledger[i].lambdaStar - run.ledger[i - 1].lambdaStar);
      out.push(acc);
    }
    return out;
  };
  const tiA = teleInterp(A), tiB = teleInterp(B);

  const el = [], dStamp = [], dLRL = [], dInterp = [], dTiming = [];
  let gridJumps = 0;
  for (let k = LO; k <= HI; k++) {
    const a = A.ledger[k], b = B.ledger[k];
    el.push(a.tStamp - A.ledger[0].tStamp);                 // elapsed days, run A clock
    dStamp.push((b.drift - a.drift) * ARCSEC_PER_RAD);
    dLRL.push((b.lrl - a.lrl) * ARCSEC_PER_RAD);
    dInterp.push((tiB[k] - tiA[k]) * ARCSEC_PER_RAD);
    dTiming.push(b.tStar - a.tStar);                        // days: B's minima vs A's
    if (Math.abs(b.tStamp - a.tStamp) > 1e-9) gridJumps++;  // did the stamps land on different grid steps?
  }
  const perCy = arr => slope(el, arr) * DAYS_PER_CENTURY;
  return {
    stamp: perCy(dStamp), lrl: perCy(dLRL), interp: perCy(dInterp),
    timingSlope: slope(el, dTiming),                        // d(Δt*)/dt, dimensionless
    gridJumps, rows: { el, dStamp, dLRL, dInterp, dTiming },
  };
}

// bearing rate at perihelion, measured from run A's own ledger:
// the stamp is taken (tStamp − t*) after the true minimum, so
//   omega ≈ wrap(stampAngle − lambdaStar) / (tStamp − t*)      [rad/day]
function measureOmega(A, LO, HI) {
  let acc = 0, n = 0;
  for (let k = LO; k <= HI; k++) {
    const row = A.ledger[k];
    const lag = row.tStamp - row.tStar;
    if (row.tStar !== null && lag > 1e-4) {
      acc += wrap(row.angle - row.lambdaStar) / lag;
      n++;
    }
  }
  return acc / n;
}

// ---- experiment battery ---------------------------------------------------
const MAXLAPS = 178, LO = 25, HI = 175;
const experiments = [
  { label: 'E1 nine-body  DT 0.05  (the M8c condition)', twoBody: false, DT: 0.05 },
  { label: 'E2 two-body   DT 0.05', twoBody: true,  DT: 0.05 },
  { label: 'E3 two-body   DT 0.5', twoBody: true,  DT: 0.5 },
  { label: 'E4 two-body   DT 0.1', twoBody: true,  DT: 0.1 },
  { label: 'E5 two-body   DT 0.025', twoBody: true,  DT: 0.025 },
];

console.log(`stamp-bias lab — two-boot differentials over laps ${LO}–${HI}\n`);
const results = [];
for (const ex of experiments) {
  const t0 = Date.now();
  const A = boot({ twoBody: ex.twoBody, pn1: false, DT: ex.DT, maxLaps: MAXLAPS });
  const B = boot({ twoBody: ex.twoBody, pn1: true,  DT: ex.DT, maxLaps: MAXLAPS });
  const d = differential(A, B, LO, HI);

  // predicted stamp bias from timing decoherence alone:
  //   recorded = bearing(true peri) + omega·(tStamp − t*)
  //   within a no-jump window tStamp is grid-locked, so d(lag)/dt = −timingSlope
  //   biasRate = −omega · timingSlope
  const omega = measureOmega(A, LO, HI);                     // rad/day
  const predictedBias = -omega * d.timingSlope * ARCSEC_PER_RAD * DAYS_PER_CENTURY;
  const measuredBias = d.stamp - d.interp;

  results.push({ ex, d, omega, predictedBias, measuredBias });

  console.log(ex.label);
  console.log(`  stamp differential : ${d.stamp.toFixed(1)} ″/cy   <- the accused witness`);
  console.log(`  LRL differential   : ${d.lrl.toFixed(1)} ″/cy   <- the trusted witness`);
  console.log(`  oracle (interp)    : ${d.interp.toFixed(1)} ″/cy   <- bearing at the TRUE minimum`);
  console.log(`  timing drift       : ${(d.timingSlope * 87.969 * 86400).toFixed(3)} s per Mercury lap (B minus A), grid jumps: ${d.gridJumps}`);
  console.log(`  omega at perihelion: ${(omega * ARCSEC_PER_RAD / 3600).toFixed(3)} deg/day`);
  console.log(`  bias: measured ${measuredBias.toFixed(1)} ″/cy vs predicted −omega·timingSlope = ${predictedBias.toFixed(1)} ″/cy`);
  console.log(`  wall time          : ${((Date.now() - t0) / 1000).toFixed(1)}s\n`);
}

// CSV evidence pack for E1 (the M8c condition)
const e1 = results[0].d.rows;
let csv = 'elapsed_days,stamp_diff_arcsec,lrl_diff_arcsec,interp_diff_arcsec,timing_diff_days\n';
for (let i = 0; i < e1.el.length; i++) {
  csv += `${e1.el[i].toFixed(3)},${e1.dStamp[i].toFixed(4)},${e1.dLRL[i].toFixed(4)},${e1.dInterp[i].toFixed(4)},${e1.dTiming[i].toExponential(6)}\n`;
}
writeFileSync(new URL('./out/E1_ninebody_DT005.csv', import.meta.url), csv);
console.log('evidence pack: out/E1_ninebody_DT005.csv written');
