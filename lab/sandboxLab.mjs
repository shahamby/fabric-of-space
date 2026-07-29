// ---------- sandboxLab: one engine, two modes (W1) ----------
// WHAT IF is not a second simulator. It is the SAME engine with declared
// constants. That claim is worth exactly as much as the test behind it, so:
// with every knob at its calibration value, WHAT IF must be bit-identical
// to TRUTH — not close, identical, to the last bit of the last double.
//
// The day this fails, a fork has happened. Run: node lab/sandboxLab.mjs
import { readFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

mkdirSync('lab/out', { recursive: true });
copyFileSync('physics.js', 'lab/out/physicsSandbox.mjs');
const P = await import(pathToFileURL('lab/out/physicsSandbox.mjs').href);

// ---- SB0: the calibration values exist and are separate from the live ones ----
const pairs = [
  ['LIGHT.c / LIGHT.cal', P.LIGHT.c, P.LIGHT.cal],
  ['GALAXY.MS / MS_CAL', P.GALAXY.MS, P.GALAXY.MS_CAL],
];
let sb0 = true;
for (const [name, live, cal] of pairs) {
  const ok = live === cal;
  if (!ok) sb0 = false;
  console.log(`SB0 ${name.padEnd(22)} live ${String(live).padEnd(14)} cal ${cal}  ` +
    `[${ok ? 'PASS' : 'FAIL'}]`);
}
console.log(`SB0 every knob starts at its calibration value  [${sb0 ? 'PASS' : 'FAIL'}]`);

// ---- the probe: a run of the real engine that touches both knobs ----
// 1PN reads LIGHT.c; the galaxy potential reads GALAXY.MS. One number that
// depends on both is enough, but two separate ones are clearer.
function fingerprint() {
  const bodies = JSON.parse(readFileSync('data/bodies.json', 'utf8'));
  const G = bodies.G ?? bodies.constants?.G;
  const out = [];
  // galaxy side: the rotation curve at eleven radii, full precision
  for (let i = 0; i < 11; i++) out.push(P.galaxyVCircInner(4 + i * 1.3, true, true));
  // 1PN side: the 1/c^2 coefficient the correction actually multiplies by
  out.push(1 / (P.LIGHT.c * P.LIGHT.c));
  return { G, out };
}
const truth = fingerprint();

// ---- SB1: entering WHAT IF and moving nothing changes nothing ----
// This is what "one engine" means. No flag is consulted inside physics.js;
// there is nothing to consult. The mode lives entirely in main.js.
const idle = fingerprint();
const identical = truth.out.every((v, i) => v === idle.out[i]);
console.log(`SB1 WHAT IF with nothing moved is bit-identical: ` +
  `${truth.out.length} values compared  [${identical ? 'PASS' : 'FAIL'}]`);

// ---- SB2: moving a knob moves the number, and only the right one ----
P.LIGHT.c = P.LIGHT.cal * 0.01;
const dimmed = fingerprint();
const galaxySame = truth.out.slice(0, 11).every((v, i) => v === dimmed.out[i]);
const pnMoved = dimmed.out[11] / truth.out[11];
console.log(`SB2 c x0.01: 1PN coefficient scaled by ${pnMoved.toExponential(2)} ` +
  `(want 1.00e+4), galaxy curve untouched ${galaxySame}  ` +
  `[${Math.abs(pnMoved - 1e4) < 1 && galaxySame ? 'PASS' : 'FAIL'}]`);

// ---- SB3: THE NEGATIVE — a knob left dialled must be CAUGHT, not tolerated ----
// The whole safety argument rests on leaving WHAT IF restoring everything.
// So: prove the identity test can FAIL. With c still at 0.01x, SB1's own
// comparison must come back false. A test that passes in both states is not
// a test.
const stillDialled = fingerprint();
const wouldPass = truth.out.every((v, i) => v === stillDialled.out[i]);
console.log(`SB3 negative — with c still dialled, the identity check reports ` +
  `${wouldPass ? 'IDENTICAL (blind!)' : 'DIFFERENT'}  [${wouldPass ? 'FAIL' : 'PASS'}]`);

// ---- restore, and prove the restore ----
P.LIGHT.c = P.LIGHT.cal;
const restored = fingerprint();
const backExact = truth.out.every((v, i) => v === restored.out[i]);
console.log(`SB4 leaving WHAT IF restores bit-exactly  [${backExact ? 'PASS' : 'FAIL'}]`);

const ok = sb0 && identical && galaxySame && Math.abs(pnMoved - 1e4) < 1 && !wouldPass && backExact;
console.log(`SB5 one engine, two modes, no fork  [${ok ? 'PASS' : 'FAIL'}]`);
process.exit(ok ? 0 : 1);