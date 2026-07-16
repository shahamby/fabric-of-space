// lab/polarBounceLab.mjs — M10c demo receipt: the mirror, in the sky we built.
// The Shift+C polar grain (qm 1000, pitch 63°, born at 0.8 AU) must shuttle
// pole-to-pole in the LIVE engine — gravity, dipole, Boris bracket, all on.
// Unlike dipoleLab's clean proton, this grain feels the Sun's pull too, so the
// clean-formula mirror (13°) deepens; telemetry on 2026-07-15 measured ±16°
// with a ~160-day shuttle. This lab pins those numbers with margin.
// Run from the repo root:  node lab/polarBounceLab.mjs

import { copyFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
mkdirSync('lab/out', { recursive: true });
copyFileSync('physics.js', 'lab/out/physicsLive.mjs');
const { leapfrogStep, computeAccelerations, totalEnergy, BFIELD } =
  await import(pathToFileURL('lab/out/physicsLive.mjs').href);

const G = 2.959122082855911e-4;   // AU^3/(Msun day^2)
let failures = 0;
function report(name, detail, pass) {
  console.log(`BOUNCE ${name} ${pass ? "PASS" : "FAIL"} — ${detail}`);
  if (!pass) failures++;
}

console.log("=== polarBounceLab — M10c demo acceptance ===\n");

// The exact Shift+C recipe: real-mass Sun, grain at 0.8 AU with orbital speed
// plus half of it aimed north along the field line (pitch 63°).
const r0 = 0.8;
const vCirc = Math.sqrt(G * 1 / r0);
const bodies = [
  { name: "Sun",   mass: 1,     radius_km: 695700, pos: [0, 0, 0], vel: [0, 0, 0], acc: [0, 0, 0] },
  { name: "Polar", mass: 1e-12, radius_km: 3000, qm: 1000,
    pos: [r0, 0, 0], vel: [0, vCirc, 0.5 * vCirc], acc: [0, 0, 0] },
];
computeAccelerations(bodies, G);
BFIELD.on = true;
const E0 = totalEnergy(bodies, G);
const g = bodies[0 + 1], sun = bodies[0], DT = 0.05, DAYS = 400;

let maxLat = 0, minR = Infinity, maxEdrift = 0;
let shuttles = 0;          // equator crossings that follow a genuine excursion
let armed = false;         // becomes true once |lat| exceeds 10 degrees
let prevLat = 0;

for (let t = 0; t <= DAYS; t += DT) {
  leapfrogStep(bodies, DT, G);
  const dx = g.pos[0] - sun.pos[0], dy = g.pos[1] - sun.pos[1], dz = g.pos[2] - sun.pos[2];
  const r   = Math.hypot(dx, dy, dz);
  const lat = Math.asin(dz / r) * 180 / Math.PI;

  if (Math.abs(lat) > maxLat) maxLat = Math.abs(lat);
  if (r < minR) minR = r;
  if (Math.abs(lat) > 10) armed = true;                    // reached mirror territory
  if (armed && (prevLat > 0) !== (lat > 0)) {              // ...then re-crossed the equator
    shuttles++; armed = false;
  }
  prevLat = lat;

  const ed = Math.abs((totalEnergy(bodies, G) - E0) / E0);
  if (ed > maxEdrift) maxEdrift = ed;
}

// B1 — the seal: gravity does work, the field does none, leapfrog+Boris keep
// the ledger. Telemetry floor was 4.1e-7; limit carries 10x margin.
report("1 (energy seal)",
  `max relative energy drift over ${DAYS} d: ${maxEdrift.toExponential(2)} (limit 5e-6)`,
  maxEdrift < 5e-6);

// B2 — it MIRRORS: at least 4 pole-to-pole shuttles in 400 days (~160 d cycle).
report("2 (the shuttle)",
  `equator crossings after >10° excursions: ${shuttles} (want >= 4)`,
  shuttles >= 4);

// B3 — the turning point: gravity deepens the clean 13° to ~16°; band 12–20°.
report("3 (mirror latitude)",
  `max |latitude| reached: ${maxLat.toFixed(2)}° (band 12–20°)`,
  maxLat >= 12 && maxLat <= 20);

// B4 — honesty floor: qm 1000 gyration is resolved only outside r ≈ 0.41 AU.
// The grain must ride its shell, nowhere near the floor.
report("4 (resolution floor)",
  `min distance from Sun: ${minR.toFixed(3)} AU (must stay > 0.6)`,
  minR > 0.6);

BFIELD.on = false;   // leave the switch as found

console.log(failures === 0
  ? "\nALL BOUNCE CHECKS PASS — the mirror left the lab. Aurora's opening act, in the sky you built."
  : `\nDEMO FAILED — ${failures} check(s) red. Do not ship Shift+C.`);
process.exitCode = failures === 0 ? 0 : 1;