// ---------- captureLab: the horizon is a length, not a decoration (W2) ----------
// M12f put Sgr A* in the potential. It has never been CROSSABLE: the measured
// Schwarzschild radius is 4.1e-10 kpc and the closest approach anything in
// this simulation has ever made is 2.3 kpc — a factor of 5.6e9.
//
// W2 does not invent a sphere. It states a mass, and the Schwarzschild radius
// THAT MASS ACTUALLY HAS does the rest. This lab is the receipt that the
// radius is computed and not drawn, that it responds to the speed of light
// the way 2GM/c^2 says it must, and that the house timestep cannot resolve it.
//
// Reads the real physics.js (a copy, so the engine under test is the engine
// that ships). Run: node lab/captureLab.mjs
import { mkdirSync, copyFileSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

mkdirSync('lab/out', { recursive: true });
copyFileSync('physics.js', 'lab/out/physicsCapture.mjs');
const P = await import(pathToFileURL('lab/out/physicsCapture.mjs').href);

const CLAMP = 0.05;          // physics.js galaxyPhi: potential is flat inside this
const DT = 0.2;              // GAL_STARS.DT, Myr per house galaxy step
const C_KMS = 299792.458;
let ok = true;
const check = (label, pass) => { if (!pass) ok = false; return pass ? 'PASS' : 'FAIL'; };

// ---- CP0: the calibration constant exists and is frozen at the published mass ----
const hasCal = typeof P.GALAXY.MBH_CAL === 'number';
const calMatches = hasCal && P.GALAXY.MBH_CAL === P.GALAXY.MBH;
console.log(`CP0 MBH_CAL present ${hasCal ? 'yes' : 'NO — physics.js has no frozen Sgr A* mass'}` +
  `${hasCal ? `, = ${P.GALAXY.MBH_CAL.toExponential(2)} Msun, matches MBH ${calMatches}` : ''}` +
  `  [${check('CP0', hasCal && calMatches)}]`);

if (!hasCal || typeof P.schwarzschildRadius !== 'function') {
  console.log('CP1-CP6 SKIPPED — physics.js is missing MBH_CAL and/or schwarzschildRadius().');
  console.log('This is the FAIL-BEFORE. Paste the physics.js blocks and run again.');
  process.exit(1);
}

// ---- CP1: the measured horizon, from the engine's own G and c ----
const rsMeasured = P.schwarzschildRadius(P.GALAXY.MBH_CAL);
const wantMeasured = 4.11553e-10;
console.log(`CP1 r_s(measured 4.30e6 Msun) = ${rsMeasured.toExponential(5)} kpc ` +
  `(want ${wantMeasured.toExponential(5)})  [${check('CP1', Math.abs(rsMeasured / wantMeasured - 1) < 1e-4)}]`);

// ---- CP2: the roadmap's crossable mass ----
const rsBig = P.schwarzschildRadius(P.GALAXY.MBH_CAL * 1e9);
console.log(`CP2 r_s(1e9x) = ${rsBig.toFixed(6)} kpc — larger than one 0.2 Myr step at ` +
  `500 km/s (0.1023 kpc)  [${check('CP2', Math.abs(rsBig - 0.411553) < 1e-5)}]`);

// ---- CP3: the clamp is a FLOOR on the knob, not a detail ----
// galaxyPhi clamps r to 0.05 kpc, so the potential is flat inside 50 pc and
// the force there is zero. A horizon inside the clamp sits in a region the
// engine does not resolve. The knob therefore has a minimum honest setting.
const minMult = CLAMP / rsMeasured;
console.log(`CP3 smallest multiplier putting r_s outside the ${CLAMP} kpc clamp = ` +
  `${minMult.toExponential(5)}x  [${check('CP3', Math.abs(minMult / 1.21491e8 - 1) < 1e-4)}]`);

// ---- CP4: r_s reads the DIALLED speed of light, not a hardcoded one ----
// 2GM/c^2. Slower light, bigger horizon. If this fails, c was hardcoded and
// the horizon is a drawing that ignores a constant the app lets you move.
const cWas = P.LIGHT.c;
P.LIGHT.c = P.LIGHT.cal * 0.01;
const rsSlowLight = P.schwarzschildRadius(P.GALAXY.MBH_CAL);
const grew = rsSlowLight / rsMeasured;
console.log(`CP4 c x0.01 grows r_s by ${grew.toExponential(4)}x (want 1.0000e+4, r_s ∝ 1/c^2)` +
  `  [${check('CP4', Math.abs(grew - 1e4) / 1e4 < 1e-9)}]`);

// ---- CP5: the house timestep cannot resolve this horizon. Taxonomy #10, arithmetic form ----
// At the horizon, escape speed IS c. That is what a Schwarzschild radius means.
P.LIGHT.c = cWas;
const cKpcMyr = C_KMS * P.KMS_TO_KPC_MYR;
const stepAtC = cKpcMyr * DT;
const overshoot = stepAtC / rsBig;
console.log(`CP5 one ${DT} Myr step at c covers ${stepAtC.toFixed(2)} kpc = ` +
  `${overshoot.toFixed(1)}x the 1e9x horizon — a point-in-sphere test CANNOT see it` +
  `  [${check('CP5', overshoot > 100)}]`);

// ---- CP6: the lab leaves the engine where it found it ----
const rsBack = P.schwarzschildRadius(P.GALAXY.MBH_CAL);
console.log(`CP6 c restored, r_s back to ${rsBack.toExponential(5)} kpc, bit-exact ` +
  `${rsBack === rsMeasured}  [${check('CP6', rsBack === rsMeasured)}]`);

// ---- the sheet's gauge (W2b) ----
// A potential has no absolute zero. Only DIFFERENCES are observable, so
// pinning the sheet to its own rim is a gauge choice, not a costume. The
// display dials are read out of fabric.js rather than copied here: a lab
// testing stale constants is a lab testing nothing.
const fabricSrc = readFileSync('fabric.js', 'utf8');
const grab = (name) => {
  const m = fabricSrc.match(new RegExp(`const ${name} = ([0-9.e+-]+)`));
  return m ? Number(m[1]) : NaN;
};
const GAL_DEPTH = grab('GAL_DEPTH'), GAL_PHI_REF = grab('GAL_PHI_REF'), SIZE = grab('SIZE');
const REF_R = Math.hypot(SIZE / 2, SIZE / 2);
const dialsRead = Number.isFinite(GAL_DEPTH) && Number.isFinite(GAL_PHI_REF) && Number.isFinite(SIZE);
console.log(`CP7 display dials read live from fabric.js: GAL_DEPTH ${GAL_DEPTH}, ` +
  `GAL_PHI_REF ${GAL_PHI_REF}, SIZE ${SIZE}, ref radius ${REF_R.toFixed(4)} kpc` +
  `  [${check('CP7', dialsRead && typeof P.galaxySheetY === 'function')}]`);

if (typeof P.galaxySheetY !== 'function') {
  console.log('CP8-CP10 SKIPPED — physics.js has no galaxySheetY(). This is the FAIL-BEFORE.');
  console.log(`\nW2 horizon geometry and sheet gauge  [FAIL]`);
  process.exit(1);
}

const sheet = (R, f) => {
  const was = P.GALAXY.MBH;
  P.GALAXY.MBH = P.GALAXY.MBH_CAL * f;
  const y = P.galaxySheetY(R, REF_R, GAL_DEPTH, GAL_PHI_REF);
  P.GALAXY.MBH = was;                      // borrow and restore, same as haloLab
  return y;
};

// ---- CP8: the reference radius is pinned to exactly zero, at every mass ----
const pinned = [1, 1e6, 1e9, 1e10].every((f) => Math.abs(sheet(REF_R, f)) < 1e-12);
console.log(`CP8 sheet(ref) = 0 at 1x, 1e6x, 1e9x, 1e10x — the rim is the gauge` +
  `  [${check('CP8', pinned)}]`);

// ---- CP9: the funnel DEEPENS relative to its rim, and stays in frame ----
const f1 = Math.abs(sheet(0.05, 1)), f9 = Math.abs(sheet(0.05, 1e9));
const inFrame = [1, 1e6, 1e9, 1e10].every((f) => Math.abs(sheet(0.05, f)) < 25);
console.log(`CP9 funnel depth ${f1.toFixed(4)} -> ${f9.toFixed(4)} units (x${(f9 / f1).toFixed(2)} ` +
  `MORE visible), every stop inside 25 units of the rim ${inFrame}` +
  `  [${check('CP9', Math.abs(f1 - 4.0396) < 1e-3 && Math.abs(f9 - 18.3210) < 1e-3 && inFrame)}]`);

// ---- CP10: SATURATION. Past dominance the sheet stops reading the knob ----
// phi ~ 1/r everywhere, so log|phi(R)| - log|phi(ref)| = log(ref/R). The mass
// cancels. The sheet is scale-free and the HORIZON becomes the only instrument
// still responding — which is why W2's visible answer had to be a radius.
const sat = Math.abs(sheet(0.05, 1e9) - sheet(0.05, 1e10));
console.log(`CP10 sheet(1e9x) vs sheet(1e10x) differ by ${sat.toExponential(3)} units — a pure ` +
  `1/r well is SCALE-FREE here, so past saturation only r_s still reads the knob` +
  `  [${check('CP10', sat < 1e-3)}]`);

console.log(`\nW2 horizon geometry and sheet gauge receipted  [${ok ? 'PASS' : 'FAIL'}]`);
process.exit(ok ? 0 : 1);