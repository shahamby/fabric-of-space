// lab/carryLab.mjs — W2c.3: the accumulator pays what it owes.
//
// THE DISEASE. stepGalaxyStars accumulates MYR OWED and pays it down by
// repeated `carry -= DT`. DT is 0.2, which has no exact binary representation.
// Each subtraction is slightly wrong, the errors accumulate in one direction,
// and `carry` eventually lands just below DT with a whole step still owed.
// GAL_STARS.myr has the same disease from repeated `+= DT`.
//
// WHAT THAT ACTUALLY COSTS — measured, not assumed, because the bug was
// logged for three sessions as "199 steps run when 200 are requested" and
// that description is misleading in one direction and understated in another.
//
//   NOT LOST IN PLAYBACK. In the browser, carry is topped up every frame and
//   the unpaid step is DEFERRED to the next frame, not discarded. 60 frames
//   asking for 150 steps each run all 9000. The step count is not the injury.
//
//   THE CLOCK IS THE INJURY. GAL_STARS.myr drifts from n*DT without bound:
//   3.9e-14 Myr after 100 steps, 2.7e-10 after 9000. It never recovers,
//   because nothing ever corrects it. Every readout of the galaxy's age, and
//   anything that seeds or samples against myr, inherits that drift.
//
//   THE LABS ARE THE OTHER INJURY. Any harness that requests a fixed count in
//   ONE call — which is what stepLab's runEngine does — gets k-1 steps for 42
//   of the first 300 values of k. Receipts computed at a requested step count
//   are silently computed at a different one.
//
// THE FIX. Count in STEPS OWED, not in Myr. `owed -= Math.floor(owed)` is
// bit-exact for any float, so no error can accumulate, and myr is derived
// from an integer step counter instead of being summed.
//
// This lab drives the REAL engine. It does not re-implement the loop — a lab
// that reimplements the thing it tests agrees with its own copy and learns
// nothing (taxonomy #14).

// Reads the real physics.js (a copy, so the engine under test is the engine
// that ships) — same shim as stepLab. Run: node lab/carryLab.mjs
import { mkdirSync, copyFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

mkdirSync('lab/out', { recursive: true });
copyFileSync('physics.js', 'lab/out/physicsCarry.mjs');
const P = await import(pathToFileURL('lab/out/physicsCarry.mjs').href);

let failures = 0;
const check = (tag, ok) => { if (!ok) failures++; return ok ? 'PASS' : 'FAIL'; };

const DT = P.GAL_STARS.DT;
const CAP = 200;

// ---------------------------------------------------------------------------
// HARNESS — works on BOTH sides of the fix, and says which side it is on.
// Before: GAL_STARS.carry holds MYR owed, myr is summed.
// After:  GAL_STARS.owed holds STEPS owed, GAL_STARS.nsteps is an integer.
// ---------------------------------------------------------------------------
const FIXED = Object.prototype.hasOwnProperty.call(P.GAL_STARS, 'owed');

function reset() {
  P.GAL_STARS.tracers = [];
  P.GAL_STARS.real = [];
  P.GAL_CLUSTERS.on = false;
  P.GAL_STARS.myr = 0;
  if (FIXED) { P.GAL_STARS.owed = 0; P.GAL_STARS.backlog = 0; P.GAL_STARS.nsteps = 0; }
  else P.GAL_STARS.carry = 0;
}

// Add k steps' worth of debt to the accumulator, in that accumulator's units.
function owe(k) {
  if (FIXED) P.GAL_STARS.owed += k;
  else P.GAL_STARS.carry += k * DT;
}

function stepsRun() {
  return FIXED ? P.GAL_STARS.nsteps : Math.round(P.GAL_STARS.myr / DT);
}

function residual() {
  return FIXED ? (P.GAL_STARS.owed + P.GAL_STARS.backlog) * DT : P.GAL_STARS.carry;
}

// One single-shot request of k steps, from a clean accumulator.
function single(k) {
  reset();
  owe(k);
  P.stepGalaxyStars(0);
  return { ran: stepsRun(), left: residual(), myr: P.GAL_STARS.myr };
}

// ---- CA0: machinery, and which accounting is loaded ----
const hasStars = typeof P.GAL_STARS === 'object' && typeof P.stepGalaxyStars === 'function';
console.log(`CA0 GAL_STARS ${typeof P.GAL_STARS === 'object' ? 'present' : 'ABSENT'}, ` +
  `stepGalaxyStars ${typeof P.stepGalaxyStars === 'function' ? 'present' : 'ABSENT'}, ` +
  `DT ${DT}, accounting = ${FIXED ? 'STEPS OWED (fixed)' : 'MYR OWED (pre-W2c.3)'}  ` +
  `[${check('CA0', hasStars)}]`);

if (!hasStars) {
  console.log('\nCA1-CA6 SKIPPED — physics.js exports are missing.');
  process.exit(1);
}

// ---- CA1: the census. Single-shot requests, k = 1..300 ----
// Sealed prediction, pre-fix, cap included: 42 short, in two bands,
// k in [15,45] and k in [190,200]. Above 200 the cap binds and hides it.
const short = [];
for (let k = 1; k <= 300; k++) {
  const want = Math.min(k, CAP);
  if (single(k).ran !== want) short.push(k);
}
const bandA = short.filter((k) => k <= 100);
const bandB = short.filter((k) => k > 100);
const bandTxt = short.length === 0 ? 'none'
  : `[${bandA[0]}..${bandA[bandA.length - 1]}] and [${bandB[0]}..${bandB[bandB.length - 1]}]`;
console.log(`CA1 single-shot census k=1..300: ${short.length} requests ran one step short, bands ${bandTxt} ` +
  `(want 0)  [${check('CA1', short.length === 0)}]`);

// ---- CA2: the named case, the one logged for three sessions ----
const two = single(200);
console.log(`CA2 request 200 in one call: ran ${two.ran}, ${(two.left / DT).toFixed(3)} steps left unpaid ` +
  `(want 200 and 0.000)  [${check('CA2', two.ran === 200 && Math.abs(two.left) < 1e-12)}]`);

// ---- CA3: clock fidelity in a single call ----
const hundred = single(100);
const err100 = Math.abs(hundred.myr - hundred.ran * DT);
console.log(`CA3 after 100 steps, |myr - n*DT| = ${err100.toExponential(3)} Myr ` +
  `(want exactly 0)  [${check('CA3', err100 === 0)}]`);

// ---- CA4: CONTINUOUS PLAYBACK. The honest one ----
// This is what the browser actually does: top up every frame, never reset.
// The step COUNT is already correct here pre-fix, because an unpaid step is
// deferred rather than dropped. The CLOCK is not. CA4 must not be allowed to
// read as a pass on the strength of the count alone.
reset();
for (let f = 0; f < 60; f++) { owe(150); P.stepGalaxyStars(0); }
const ran4 = stepsRun();
const err4 = Math.abs(P.GAL_STARS.myr - ran4 * DT);
console.log(`CA4 60 frames x 150 steps: ran ${ran4} of 9000 (deferral, not loss — correct pre-fix too), ` +
  `|myr - n*DT| = ${err4.toExponential(3)} Myr, residual ${(residual() / DT).toExponential(3)} steps ` +
  `(want 9000 and exactly 0)  [${check('CA4', ran4 === 9000 && err4 === 0)}]`);

// ---- CA5: the cap still binds. The fix must not "solve" this by uncapping ----
const capped = single(250);
console.log(`CA5 request 250, cap ${CAP}: ran ${capped.ran} (want exactly ${CAP} — the fix must not ` +
  `raise or remove the cap)  [${check('CA5', capped.ran === CAP)}]`);

// ---- CA6: NEGATIVE. Prove CA1 can read zero for a reason ----
// 0.25 IS exactly representable in binary. With that DT the disease cannot
// occur, and the census must report 0 short — pre-fix, with nothing repaired.
// If CA1's zero after the fix is to mean anything, CA1 must be capable of
// zero when the arithmetic is clean, and non-zero when it is not.
const savedDT = P.GAL_STARS.DT;
P.GAL_STARS.DT = 0.25;
const shortExact = [];
for (let k = 1; k <= 300; k++) {
  const want = Math.min(k, CAP);
  reset();
  if (FIXED) P.GAL_STARS.owed += k; else P.GAL_STARS.carry += k * 0.25;
  P.stepGalaxyStars(0);
  const ran = FIXED ? P.GAL_STARS.nsteps : Math.round(P.GAL_STARS.myr / 0.25);
  if (ran !== want) shortExact.push(k);
}
P.GAL_STARS.DT = savedDT;
const dtRestored = P.GAL_STARS.DT === DT;
console.log(`CA6 negative: with DT=0.25 (exact in binary) the same census reads ${shortExact.length} short ` +
  `where DT=${DT} read ${short.length}. The instrument moves with the arithmetic, and DT restored to ` +
  `${P.GAL_STARS.DT} (${dtRestored})  ` +
  `[${check('CA6', shortExact.length === 0 && dtRestored && (FIXED || short.length > 0))}]`);

console.log('');
console.log(`W2c.3 accumulator ${failures === 0 ? 'pays what it owes' : `NOT FIXED — ${failures} receipt(s) failing`}  [${failures === 0 ? 'PASS' : 'FAIL'}]`);
process.exit(failures === 0 ? 0 : 1);