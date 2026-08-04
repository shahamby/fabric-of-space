// ---------- stepLab: the galaxy clock learns to subdivide (W2c) ----------
// The galaxy integrator has always spent a fixed 0.2 Myr step. That was fine
// while Sgr A* sat at its published 4.3e6 Msun. W2a made the hole a knob, and
// at 1e9x a cluster at 0.6 kpc completes 9.5 orbits INSIDE ONE STEP. The
// trajectory there is not approximate; it is arithmetic about nothing.
//
// W2c subdivides each step until the innermost INTEGRATED body — tracer, HYG
// star or cluster, all three vote — receives 20 steps per orbit, capped at 200
// substeps and clamped to 1 whenever Sgr A* sits at its calibration mass, so
// TRUTH mode stays bit-identical and every sealed number still reproduces.
//
// Reads the real physics.js (a copy, so the engine under test is the engine
// that ships). Run: node lab/stepLab.mjs
import { mkdirSync, copyFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

mkdirSync('lab/out', { recursive: true });
copyFileSync('physics.js', 'lab/out/physicsStep.mjs');
const P = await import(pathToFileURL('lab/out/physicsStep.mjs').href);

const DT = P.GAL_STARS.DT;          // 0.2 Myr, the house galaxy step
const CLAMP = 0.05;                 // galaxyPhi's own floor
const R_IN = 0.6;                   // innermost Harris cluster seat, kpc
let ok = true;
const check = (label, pass) => { if (!pass) ok = false; return pass ? 'PASS' : 'FAIL'; };

// Put the dial back wherever a test leaves it — haloLab HL5's discipline.
const MBH_HOUSE = P.GALAXY.MBH, MS_HOUSE = P.GALAXY.MS;
const dial = (mult) => { P.GALAXY.MBH = P.GALAXY.MBH_CAL * mult; };
const undial = () => { P.GALAXY.MBH = MBH_HOUSE; P.GALAXY.MS = MS_HOUSE; };

// A body on a circular orbit in the engine's OWN potential, so any radius
// drift below is the integrator's doing and not a bad seed.
function seat(name, R) {
  const v = P.galaxyVCirc(R) * P.KMS_TO_KPC_MYR;   // kpc/Myr
  return { name, x: R, y: 0, z: 0, vx: 0, vy: -v, R0: R };
}
const radius = (s) => Math.hypot(s.x, s.y);

// TWO integrators, on purpose.
//
// accelLocal is re-derived here from the exported galaxyPhi, using only what
// physics.js exported BEFORE W2c. ST1 runs on it, so the FAIL-before reports
// a number instead of a stack trace on an engine that has not been patched yet.
function accelLocal(x, y) {
  const R = Math.max(Math.hypot(x, y), 0.05), h = 1e-4;
  const dPhi = (P.galaxyPhi(R + h) - P.galaxyPhi(R - h)) / (2 * h);
  const a = -dPhi * P.KMS_TO_KPC_MYR * P.KMS_TO_KPC_MYR / R;
  return [a * x, a * y];
}
function kdkLocal(s, dt) {
  let [ax, ay] = accelLocal(s.x, s.y);
  s.vx += 0.5 * dt * ax; s.vy += 0.5 * dt * ay;
  s.x += dt * s.vx;      s.y += dt * s.vy;
  [ax, ay] = accelLocal(s.x, s.y);
  s.vx += 0.5 * dt * ax; s.vy += 0.5 * dt * ay;
}

// kdkPlain rides the engine's OWN exported galaxyAccel — the same arithmetic
// the browser runs. ST3's bit-identity claim is only worth something if the
// comparison integrator is the shipping one and not a lab lookalike.
function kdkPlain(s, dt) {
  let [ax, ay] = P.galaxyAccel(s.x, s.y);
  s.vx += 0.5 * dt * ax; s.vy += 0.5 * dt * ay;
  s.x += dt * s.vx;      s.y += dt * s.vy;
  [ax, ay] = P.galaxyAccel(s.x, s.y);
  s.vx += 0.5 * dt * ax; s.vy += 0.5 * dt * ay;
}

// Drive the engine's own loop for exactly k steps, with one population loaded.
function runEngine(bodies, k) {
  P.GAL_STARS.tracers = bodies;
  P.GAL_STARS.real = [];
  P.GAL_CLUSTERS.on = false;
  P.GAL_STARS.owed = 0;
  P.GAL_STARS.backlog = k;      // W2c.3: the debt is counted in STEPS, exactly
  P.GAL_STARS.nsteps = 0;
  P.GAL_STARS.myr = 0;
  P.stepGalaxyStars(0);
}

// ---- ST0: the new machinery exists ----
const hasStep = typeof P.galaxySubstepCount === 'function' && typeof P.GAL_STEP === 'object';
const hasAccel = typeof P.galaxyAccel === 'function';
console.log(`ST0 galaxySubstepCount ${typeof P.galaxySubstepCount === 'function' ? 'present' : 'ABSENT'}, ` +
  `GAL_STEP ${typeof P.GAL_STEP === 'object' ? 'present' : 'ABSENT'}, ` +
  `galaxyAccel exported ${hasAccel}  [${check('ST0', hasStep && hasAccel)}]`);

// ---- ST1: THE DISEASE. Runs with or without the fix — it is the FAIL-before ----
// One 0.2 Myr step at 1e9x spans 9.5 orbits at 0.6 kpc. A kick-drift-kick that
// long is not a small error; the body is flung off the well entirely.
dial(1e9);
const period = 2 * Math.PI * R_IN / (P.galaxyVCircInner(R_IN, true) * P.KMS_TO_KPC_MYR);
const lapsPerStep = DT / period;
const sick = seat('SICK', R_IN);
for (let i = 0; i < 10; i++) kdkLocal(sick, DT);
const sickR = radius(sick);
console.log(`ST1 FAIL-BEFORE at MBH 1e9x: one ${DT} Myr step spans ${lapsPerStep.toFixed(1)} orbits at ` +
  `${R_IN} kpc; 10 unsubdivided steps take a circular body from ${R_IN} to ${sickR.toFixed(3)} kpc ` +
  `(${(sickR / R_IN).toFixed(1)}x)  [${check('ST1', lapsPerStep > 9 && sickR > 3 * R_IN)}]`);
undial();

if (!hasStep || !hasAccel) {
  console.log('\nST2-ST7 SKIPPED — physics.js has no galaxySubstepCount / GAL_STEP,');
  console.log('and/or galaxyAccel is not exported. This is the FAIL-BEFORE.');
  console.log('Paste the physics.js blocks and run again.');
  process.exit(1);
}

// ---- ST2: PASS-AFTER. The same body, subdivided, stays on the well ----
dial(1e9);
const well = seat('WELL', R_IN);
runEngine([well], 10);
const wellR = radius(well);
const wellErr = Math.abs(wellR / R_IN - 1);
console.log(`ST2 PASS-AFTER, same 10 steps: n_sub ${P.GAL_STEP.n}, set by ${P.GAL_STEP.byName} at ` +
  `${P.GAL_STEP.byR.toFixed(3)} kpc, ${P.GAL_STEP.achieved.toFixed(1)} steps/orbit. R ends at ` +
  `${wellR.toFixed(4)} kpc (${(wellErr * 100).toFixed(2)}% off) where ST1 read ${sickR.toFixed(0)} kpc ` +
  `— an improvement of ${((sickR / R_IN - 1) / wellErr).toExponential(2)}x` +
  `  [${check('ST2', P.GAL_STEP.n >= 370 && P.GAL_STEP.n <= 400 && wellErr < 0.1)}]`);
undial();

// ---- ST3: TRUTH mode is BIT-IDENTICAL. Every sealed number still reproduces ----
// MBH at calibration clamps n to 1, and DT / 1 is exact in IEEE754, so the
// engine must do precisely what the pre-W2c integrator did — to the last bit.
//
// The step COUNT is read back from GAL_STARS.nsteps rather than assumed.
// Before W2c.3 this request ran 199 of 200: the accumulator counted Myr owed
// and repeated `carry -= DT` drifted below DT, leaving a step unpaid. It now
// counts STEPS owed, `owed - Math.floor(owed)` is bit-exact, and the count is
// exact for every k. Receipt: carryLab CA1-CA4.
const engineBody = seat('T0', 8.2);
const plainBody = seat('T0', 8.2);
runEngine([engineBody], 200);
const ranSteps = P.GAL_STARS.nsteps;
for (let i = 0; i < ranSteps; i++) kdkPlain(plainBody, DT);
const bitSame = engineBody.x === plainBody.x && engineBody.y === plainBody.y &&
                engineBody.vx === plainBody.vx && engineBody.vy === plainBody.vy;
console.log(`ST3 TRUTH mode, ${ranSteps} steps of 200 requested (W2c.3: exact, was 199): ` +
  `n_sub ${P.GAL_STEP.n}, clamped ${P.GAL_STEP.truthClamped}; engine x ` +
  `${engineBody.x.toExponential(17)} vs plain ${plainBody.x.toExponential(17)} — bit-identical ` +
  `${bitSame}  [${check('ST3', bitSame && P.GAL_STEP.n === 1)}]`);

// ---- ST4: second order. Halve the substep, quarter the error ----
// Leapfrog is O(dt^2). The observable is the AMPLITUDE of the radial breathing
// over a fixed number of orbits, not the radius at the final instant: the
// endpoint reading is phase-dependent and reads non-monotonically under
// refinement (0.29% at 20 steps/orbit, 0.47% at 40), which would have been a
// taxonomy #7 no-op — a test that looks rigorous and measures phase.
dial(1e9);
function ampAt(stepsPerOrbit) {
  const b = seat('CONV', R_IN);
  const k = stepsPerOrbit * 10, sub = period * 10 / k;
  let mx = 0;
  for (let i = 0; i < k; i++) { kdkPlain(b, sub); mx = Math.max(mx, Math.abs(radius(b) / R_IN - 1)); }
  return mx;
}
const a1 = ampAt(20), a2 = ampAt(40), a3 = ampAt(80), a4 = ampAt(160);
const r1 = a1 / a2, r2 = a2 / a3, r3 = a3 / a4;
console.log(`ST4 convergence, radial amplitude over 10 orbits: ${a1.toExponential(3)} -> ` +
  `${a2.toExponential(3)} -> ${a3.toExponential(3)} -> ${a4.toExponential(3)}, ratios ` +
  `${r1.toFixed(2)} / ${r2.toFixed(2)} / ${r3.toFixed(2)} (want ~4.00)` +
  `  [${check('ST4', [r1, r2, r3].every((r) => Math.abs(r - 4) < 0.25))}]`);
console.log(`    NOTE: 20 steps/orbit costs ${(a1 * 100).toFixed(1)}% radial breathing; the shipped target ` +
  `of ${P.GAL_STEP.target} costs ${(a2 * 100).toFixed(1)}% and buys it with n_sub 382 at 1e9x. The ` +
  `${P.GAL_STEP.cap} cap holds 1e10x to 23.2 steps/orbit, ${(4.831e-2 * (20 / 23.2) ** 2 * 100).toFixed(1)}% ` +
  `— where a 200 cap would have delivered 6.6 and 44.4%.`);
undial();

// ---- ST5: the HALO knob never needs a substep. B2 is untouched by W2c ----
// MS changes the DEPTH of the well, not the SPEED of the innermost orbit.
// Sgr A* is the only knob that moves the clock.
const msRows = [];
let msAllOne = true;
for (const f of [0.1, 1, 3]) {
  P.GALAXY.MS = P.GALAXY.MS_CAL * f;
  dial(1e6);                                     // out of TRUTH clamp, so n is honest
  P.GAL_STARS.tracers = [seat('MS', R_IN)]; P.GAL_STARS.real = []; P.GAL_CLUSTERS.on = false;
  const nHere = P.galaxySubstepCount();
  P.GALAXY.MBH = P.GALAXY.MBH_CAL;               // house hole, halo still dialled
  const nHouse = P.galaxySubstepCount();
  msRows.push(`${f}x:${nHouse}`);
  if (nHouse !== 1) msAllOne = false;
  void nHere;
}
undial();
console.log(`ST5 halo knob at house Sgr A*, n_sub by MS multiplier — ${msRows.join('  ')} ` +
  `(all 1: the halo never moves the clock)  [${check('ST5', msAllOne)}]`);

// ---- ST6: THE NEGATIVE. It must be SEEN to fail ----
// Two sabotages, each of which must change an observable (taxonomy #7).
// (a) a body parked at the clamp must NOT come back as n_sub 1.
// (b) hiding the cluster population from the scan must change the answer —
//     which is the exact failure mode "clusters only" would have shipped.
dial(1e10);
P.GAL_STARS.tracers = [seat('FAR', 8.0)];
P.GAL_STARS.real = [];
P.GAL_CLUSTERS.on = true;
// NOTE the field: real clusters carry .id, not .name (main.js:462 hunts on
// best.id). Seeding this with .name would have let the "(unnamed)" bug through
// the lab untouched, which is exactly how it reached the browser.
P.GAL_CLUSTERS.list = [{ id: 'DIVER', x: CLAMP, y: 0, z: 0, vx: 0, vy: 0, vz: 0 }];
const nSeen = P.galaxySubstepCount();
const whoSeen = P.GAL_STEP.byName;
P.GAL_CLUSTERS.on = false;                       // SABOTAGE: hide the clusters
const nBlind = P.galaxySubstepCount();
const whoBlind = P.GAL_STEP.byName;
const sabotageBites = nSeen !== nBlind && whoSeen === 'DIVER' && whoBlind === 'FAR';
console.log(`ST6 negative: clusters visible -> n_sub ${nSeen} set by ${whoSeen}; ` +
  `clusters hidden -> n_sub ${nBlind} set by ${whoBlind}. Sabotage changes an observable ` +
  `${sabotageBites}, and the clamp never reads as 1 (${nSeen !== 1})` +
  `  [${check('ST6', sabotageBites && nSeen !== 1)}]`);
undial();

// ---- ST7: the cap CONFESSES. It reports achieved, never target ----
// A cap that quietly prints "20 steps/orbit" would be taxonomy #15 exactly:
// a correct-looking number standing against an undeclared limit.
dial(1e10);
P.GAL_STARS.tracers = [seat('CAPPED', R_IN)];
P.GAL_STARS.real = []; P.GAL_CLUSTERS.on = false;
const nCap = P.galaxySubstepCount();
const achieved = P.GAL_STEP.achieved;
const capBinds = nCap === P.GAL_STEP.cap;
console.log(`ST7 cap at MBH 1e10x, ${R_IN} kpc: n_sub ${nCap} (cap ${P.GAL_STEP.cap}) — cap binds ` +
  `${capBinds}; readout says ${achieved.toFixed(1)} steps/orbit, NOT the ${P.GAL_STEP.target} target` +
  `  [${check('ST7', capBinds && Math.abs(achieved - 23.2) < 0.2 && achieved < P.GAL_STEP.target)}]`);
undial();

// ---- ST8: THE PLUNGE, and the limit it exposes (W2c.2) ----
// ST2 proved a CIRCULAR orbit is resolved. A body falling nearly straight in is
// a different animal: it crosses the whole well in a fraction of a circular
// period, so the orbit criterion is reading a clock the body is not on.
//
// This receipt does NOT claim the plunge is fixed. It claims the opposite, and
// proves the engine CONFESSES it: at 1e10x the cluster goes unbound, the cap
// binds, and n >= cap is the flag the HUD reads to stop claiming.
//
// Two designs were measured against this case and REJECTED, recorded in HANDOFF
// session 24: a travel criterion (v*DT <= eps*r), which turned out to be a
// relabelled target increase and a worse one — target 126 alone beat it 6.58e1
// to 1.11e2 at a quarter the cost — and an adaptive per-substep loop, whose
// sign flipped with configuration in an already-unbound regime.
function plunge(mult, steps) {
  dial(mult);
  const c = { id: 'PLUNGER', x: 67.2, y: 0, z: 0,
              vx: -170 * P.KMS_TO_KPC_MYR, vy: 48 * P.KMS_TO_KPC_MYR, vz: 0 };
  P.GAL_STARS.tracers = []; P.GAL_STARS.real = [];
  P.GAL_CLUSTERS.on = true; P.GAL_CLUSTERS.list = [c];
  const rad3 = () => Math.hypot(c.x, c.y, c.z);
  const spd = () => Math.hypot(c.vx, c.vy, c.vz) / P.KMS_TO_KPC_MYR;
  const E0 = 0.5 * spd() ** 2 + P.galaxyPhi(rad3());
  let peak = 0;
  for (let i = 0; i < steps; i++) {
    P.GAL_STARS.owed = 0; P.GAL_STARS.backlog = 1; P.GAL_STARS.nsteps = 0; P.GAL_STARS.myr = 0;
    P.stepGalaxyStars(0);
    peak = Math.max(peak, P.GAL_STEP.n);
  }
  const E = 0.5 * spd() ** 2 + P.galaxyPhi(rad3());
  const out = { dE: Math.abs(E / E0 - 1), bound: E < 0, peak, overC: P.GAL_STEP.overC, v: spd() };
  undial();
  P.GAL_CLUSTERS.on = false; P.GAL_CLUSTERS.list = [];
  return out;
}
const p9 = plunge(1e9, 20);
const p10 = plunge(1e10, 20);
const confesses = p10.peak >= P.GAL_STEP.cap;
console.log(`ST8 plunge, 20 steps: at 1e9x |dE/E0| ${p9.dE.toExponential(2)} and it stays BOUND ` +
  `(${p9.bound}); at 1e10x |dE/E0| ${p10.dE.toExponential(2)} and it is EJECTED (bound ${p10.bound}), ` +
  `peak n_sub ${p10.peak} of cap ${P.GAL_STEP.cap} — the cap binds, so the readout confesses ` +
  `${confesses}  [${check('ST8', p9.bound && !p10.bound && confesses)}]`);

// ---- ST9: BEYOND NEWTON, with its own negative ----
// The ejection at 1e10x is not only a resolution failure. Free-fall to the
// 0.05 kpc clamp there reaches 9.1c BEFORE any discretisation error, so the
// engine is answering Newtonianly in a regime Newton does not describe. No
// subdivision at any price cures that; only a label does.
const cKms = P.LIGHT.c * (299792.458 / P.LIGHT.cal);
const vFall = Math.sqrt(2 * P.GALAXY.G * P.GALAXY.MBH_CAL * 1e10 / CLAMP);
// the negative: at house values nothing comes anywhere near c, so the flag
// must stay DARK — a warning that is always on warns about nothing.
dial(1);
P.GAL_STARS.tracers = [seat('QUIET', 8.2)]; P.GAL_STARS.real = []; P.GAL_CLUSTERS.on = false;
P.galaxySubstepCount();
const quiet = P.GAL_STEP.overC;
undial();
console.log(`ST9 free-fall to the ${CLAMP} kpc clamp at 1e10x = ${vFall.toExponential(3)} km/s = ` +
  `${(vFall / cKms).toFixed(1)}c before any integration error; the flown cluster read ` +
  `${p10.overC.toFixed(1)}c. Negative: at house values the flag stays dark at ` +
  `${quiet.toExponential(2)}c  [${check('ST9', vFall / cKms > 9 && p10.overC > 1 && quiet < 0.01)}]`);

console.log(`\nW2c substep subdivision receipted  [${ok ? 'PASS' : 'FAIL'}]`);
process.exit(ok ? 0 : 1);