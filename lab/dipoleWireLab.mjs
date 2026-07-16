// lab/dipoleWireLab.mjs — M10c wiring receipt: the dipole INSIDE the engine.
// dipoleLab.mjs proved the field physics in SI. THIS lab proves the transplanted
// sim-units version (AU in, Tesla out) actually steers engine bodies through
// leapfrogStep — the LIVE physics.js as shipped, never a pinned snapshot.
// Run from the repo root:  node lab/dipoleWireLab.mjs
//
// How it reads the live engine: package.json says "type": "commonjs", so node
// refuses to parse physics.js as a module directly. We copy it to a scratch
// .mjs in lab/out/ at every run and import THAT — fresh copy, zero staleness.

import { copyFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

mkdirSync('lab/out', { recursive: true });
copyFileSync('physics.js', 'lab/out/physicsLive.mjs');
const { leapfrogStep, computeAccelerations, BFIELD, dipoleTesla } =
  await import(pathToFileURL('lab/out/physicsLive.mjs').href);

const G = 2.959122082855911e-4;  // AU^3/(Msun day^2) — masses are zero below, so inert
const mag = (v) => Math.hypot(v[0], v[1], v[2]);
let failures = 0;
function report(name, detail, pass) {
  console.log(`WIRE ${name} ${pass ? "PASS" : "FAIL"} — ${detail}`);
  if (!pass) failures++;
}

console.log("=== dipoleWireLab — M10c wiring acceptance ===\n");

// ---------- W1: the sim-units field function (AU in, Tesla out) ----------
{
  const eq1  = mag(dipoleTesla([1, 0, 0], [0, 0, 0]));
  const eq2  = mag(dipoleTesla([2, 0, 0], [0, 0, 0]));
  const pole = mag(dipoleTesla([0, 0, 1], [0, 0, 0]));
  report("1 (normalization)",
    `|B| at 1 AU equator: ${(eq1 * 1e9).toFixed(6)} nT (want 5 exactly)`,
    Math.abs(eq1 - 5e-9) < 1e-18);
  report("1 (inverse-cube)",
    `r vs 2r ratio: ${(eq1 / eq2).toFixed(9)} (want 8)`,
    Math.abs(eq1 / eq2 - 8) < 1e-9);
  report("1 (anatomy)",
    `pole/equator: ${(pole / eq1).toFixed(9)} (want 2)`,
    Math.abs(pole / eq1 - 2) < 1e-9);
}

// ---------- The rig: one charged grain, one massless Sun-anchor ----------
// The Sun has mass 0 so gravity is silent and ONLY the field steers. It exists
// because borisTurn anchors the magnet to the body named 'Sun' — this rig
// exercises that exact code path.
//
// MEASUREMENT CONFESSION (first draft failed its own check): a grain gyrates
// around its GUIDING CENTER, which sits one gyro-radius away from wherever you
// place the particle — and in a 1/r³ field that offset samples a measurably
// different grip. Draft one launched every grain at the same speed; at 2 AU the
// gyro-circle grew to 6% of r and the ratio read 8.787, not 8. The instrument
// was biased, not the wiring — the stamp-bias lesson in magnetic clothes.
// Fix: scale launch speed so the gyro-circle is the same small FRACTION of r
// everywhere (0.5%), and run whole loops with equal steps-per-loop, so the
// offset bias cancels in any ratio of measurements.
const RHO_FRAC = 0.005;   // gyro-circle radius as a fraction of the orbit radius
function gyroOmega(rAU, loops, stepsPerLoop) {
  const wPred = 300 * mag(dipoleTesla([rAU, 0, 0], [0, 0, 0])) * 86400; // rad/day
  const v     = RHO_FRAC * rAU * wPred;    // speed that makes rho = RHO_FRAC * r
  const dt    = (2 * Math.PI / wPred) / stepsPerLoop;
  const days  = loops * (2 * Math.PI / wPred);
  const bodies = [
    { name: "Sun",   mass: 0, radius_km: 0, pos: [0, 0, 0], vel: [0, 0, 0], acc: [0, 0, 0] },
    { name: "Grain", mass: 0, radius_km: 1, qm: 300,
      pos: [rAU, 0, 0], vel: [0, v, 0], acc: [0, 0, 0] },
  ];
  computeAccelerations(bodies, G);           // contract: prime acc (true zeros here)
  const g = bodies[1];
  const v0 = mag(g.vel);
  let angle = 0, prev = Math.atan2(g.vel[1], g.vel[0]), maxDrift = 0;
  for (let t = 0; t < days; t += dt) {
    leapfrogStep(bodies, dt, G);
    const a = Math.atan2(g.vel[1], g.vel[0]);
    let d = a - prev;
    if (d >  Math.PI) d -= 2 * Math.PI;      // unwrap the atan2 seam
    if (d < -Math.PI) d += 2 * Math.PI;
    angle += d; prev = a;
    const drift = Math.abs(mag(g.vel) - v0) / v0;
    if (drift > maxDrift) maxDrift = drift;
  }
  return { omega: Math.abs(angle) / days, wPred, maxDrift };   // rad/day
}

BFIELD.on = true;                            // the lab flips its own switch...

// ---------- W2: gyration at 0.8 AU obeys the LOCAL field ----------
{
  const { omega, wPred, maxDrift } = gyroOmega(0.8, 2, 2400);
  report("2 (local gyration, 0.8 AU)",
    `measured ${omega.toFixed(5)} rad/day vs predicted ${wPred.toFixed(5)} ` +
    `(loop ${(2 * Math.PI / omega).toFixed(1)} d; ~1.5% guiding-center offset is physics, see rig note)`,
    Math.abs(omega - wPred) / wPred < 0.02);
  report("2 (speed hash)",
    `max relative speed drift: ${maxDrift.toExponential(2)} (limit 1e-9)`,
    maxDrift < 1e-9);
}

// ---------- W3: move the grain and the grip obeys the inverse cube ----------
// Same rho/r and same steps-per-loop at both radii, so instrument biases
// cancel in the ratio and the 1/r³ law stands alone in the dock.
{
  const w1 = gyroOmega(1, 2, 2400).omega;
  const w2 = gyroOmega(2, 2, 2400).omega;
  report("3 (1/r³ in the dynamics)",
    `omega(1 AU) / omega(2 AU) = ${(w1 / w2).toFixed(4)} (want 8, tol 1%)`,
    Math.abs(w1 / w2 - 8) < 0.08);
}

BFIELD.on = false;                           // ...and leaves it as found

console.log(failures === 0
  ? "\nALL WIRE CHECKS PASS — the engine now grips harder where the field is stronger."
  : `\nWIRING FAILED — ${failures} check(s) red. Walk the edits top to bottom; one was skipped or mistyped.`);
process.exitCode = failures === 0 ? 0 : 1;