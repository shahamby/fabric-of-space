// lab/truthLab.mjs — T0.2: the ledger says true things.
//
// ledgerLab proved the paperwork REFERS TO THINGS THAT EXIST: numbers
// contiguous, citations resolving. It cannot tell whether a confession is
// TRUE. On 2026-08-03 it passed a CHEATS.md in which entry 29 quoted a
// 200-substep cap and a 20-steps-per-orbit target that W2c.1 had replaced
// with 700 and 40 nine days earlier. The entry was well-formed and wrong.
// Taxonomy #18, the stale confession. A human caught it. That is the hole.
//
// This lab reads physics.js AS TEXT and CHEATS.md AS TEXT and asserts that
// where the ledger quotes a declared constant, it quotes the one that ships.
// It imports nothing from the project and knows no physics. Its only claim is
// that two files agree about a number.
//
// WHAT IT ASSERTS
//   TR1  the GAL_STEP declaration is found in physics.js and its target and
//        cap parse as integers
//   TR2  every "N steps per orbit" / "N-steps rule" figure in CHEATS #29
//        equals GAL_STEP.target, and there is at least one
//   TR3  every "capped at N substeps" / "cap of N" figure in CHEATS #29
//        equals GAL_STEP.cap, and there is at least one
//   TR4  negative: three sabotages, each required to MUTATE the input and be
//        CAUGHT by the check that owns it
//
// WHAT IT DELIBERATELY DOES NOT ASSERT
//   Paragraphs opening "**Amended" are EXCLUDED from the scan. An amendment
//   note records what an entry used to say, on purpose — CHEATS #29's own
//   note quotes the retired figures so a reader can see what moved. Scanning
//   those would fire on history that is already reconciled, the same reason
//   ledgerLab excludes TAXONOMY's citation map by name. The exclusion cannot
//   silently swallow the entry: TR2 and TR3 both require at least one figure
//   to survive it.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(resolve(ROOT, p), 'utf8');

let failures = 0;
const check = (tag, ok, msg) => {
  if (!ok) failures++;
  console.log(`${tag} ${msg}  [${ok ? 'PASS' : 'FAIL'}]`);
  return ok;
};

// ---------------------------------------------------------------------------
// SOURCE SIDE — the declared constants, read as text
// ---------------------------------------------------------------------------
// Read as TEXT, not imported. physics.js pulls in the renderer's dependencies;
// a lab that imports it stops being self-contained. Text also means this lab
// sees exactly what a reader of the source sees.

function galStepBlock(src) {
  const open = src.indexOf('export const GAL_STEP = {');
  if (open === -1) return null;
  const close = src.indexOf('\n};', open);
  if (close === -1) return null;
  return src.slice(open, close + 3);
}

function fieldOf(block, name) {
  const m = block.match(new RegExp(`^\\s*${name}\\s*:\\s*(\\d+)\\s*,`, 'm'));
  return m ? Number(m[1]) : null;
}

// ---------------------------------------------------------------------------
// LEDGER SIDE — one entry's prose, minus its amendment notes
// ---------------------------------------------------------------------------

function entryBody(text, n) {
  const lines = text.split('\n');
  const start = lines.findIndex((l) => l.startsWith(`## ${n}.`));
  if (start === -1) return null;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].startsWith('## ')) { end = i; break; }
  }
  return lines.slice(start, end).join('\n');
}

function dropAmendments(body) {
  return body
    .split('\n\n')
    .filter((para) => !para.trimStart().startsWith('**Amended'))
    .join('\n\n');
}

function figures(body, patterns) {
  const found = [];
  for (const re of patterns) {
    const rx = new RegExp(re.source, 'g');
    let m;
    while ((m = rx.exec(body)) !== null) {
      found.push({ n: Number(m[1].replace(/,/g, '')), quote: m[0].replace(/\s+/g, ' ') });
    }
  }
  return found;
}

// ---------------------------------------------------------------------------
// THE CLAIMS TABLE
// ---------------------------------------------------------------------------
// One row per constant the ledger quotes. Adding a row is how a future
// declared constant gets the same guard. The patterns are the PHRASINGS the
// prose is allowed to use; a new phrasing must be added here deliberately,
// which is the point — an unrecognised phrasing reads as zero figures and
// trips the "at least one" floor rather than passing in silence.

const CLAIMS = [
  {
    tag: 'TR2',
    entry: 29,
    field: 'target',
    label: 'steps per orbit',
    patterns: [/(\d[\d,]*)\s+steps per orbit/, /(\d[\d,]*)-steps rule/],
  },
  {
    tag: 'TR3',
    entry: 29,
    field: 'cap',
    label: 'substep cap',
    patterns: [/capped at (\d[\d,]*)\s+substeps/, /cap of (\d[\d,]*)/],
  },
];

// ---------------------------------------------------------------------------
// THE CHECK, factored so the negative can drive it over sabotaged input
// ---------------------------------------------------------------------------

function runClaim(claim, physicsSrc, cheatsSrc, report) {
  const block = galStepBlock(physicsSrc);
  if (!block) return { ok: false, why: 'GAL_STEP block not found in physics.js' };
  const declared = fieldOf(block, claim.field);
  if (declared === null) return { ok: false, why: `GAL_STEP.${claim.field} did not parse` };

  const body = entryBody(cheatsSrc, claim.entry);
  if (body === null) return { ok: false, why: `CHEATS entry ${claim.entry} not found` };

  const found = figures(dropAmendments(body), claim.patterns);
  if (found.length === 0) {
    return { ok: false, why: `no ${claim.label} figure found in CHEATS #${claim.entry}` };
  }
  const wrong = found.filter((f) => f.n !== declared);
  if (wrong.length) {
    const list = wrong.map((f) => `"${f.quote.trim()}"`).join(', ');
    return { ok: false, why: `CHEATS #${claim.entry} says ${list}, physics.js ships ${declared}` };
  }
  if (report) {
    const list = found.map((f) => `"${f.quote.trim()}"`).join(', ');
    return { ok: true, why: `${found.length} ${claim.label} figure(s) agree with GAL_STEP.${claim.field} = ${declared}: ${list}` };
  }
  return { ok: true, why: 'agree' };
}

// ---------------------------------------------------------------------------
// RECEIPTS
// ---------------------------------------------------------------------------

const PHYSICS = read('physics.js');
const CHEATS = read('CHEATS.md');

const block = galStepBlock(PHYSICS);
const target = block ? fieldOf(block, 'target') : null;
const cap = block ? fieldOf(block, 'cap') : null;

console.log(`TR0 read physics.js ${PHYSICS.length} bytes | CHEATS.md ${CHEATS.length} bytes`);

check(
  'TR1',
  block !== null && Number.isInteger(target) && Number.isInteger(cap),
  block === null
    ? 'GAL_STEP declaration NOT FOUND in physics.js'
    : `GAL_STEP declared: target = ${target} steps/orbit, cap = ${cap} substeps`,
);

for (const claim of CLAIMS) {
  const r = runClaim(claim, PHYSICS, CHEATS, true);
  check(claim.tag, r.ok, r.why);
}

// ---------------------------------------------------------------------------
// TR4 — the negative. A guard never seen to fail is theater.
// ---------------------------------------------------------------------------
// Each sabotage must do two things: MUTATE the input (a sabotage that changes
// nothing tests nothing — taxonomy #8, the no-op negative), and be CAUGHT by
// the claim that owns it.

const SABOTAGE = [
  {
    name: 'target dialled in source only',
    claim: CLAIMS[0],
    physics: (s) => s.replace(/(export const GAL_STEP = \{[\s\S]*?target:\s*)(\d+)/, (_m, a, n) => a + (Number(n) + 1)),
    cheats: (s) => s,
  },
  {
    name: 'cap figure rotted in the ledger',
    claim: CLAIMS[1],
    physics: (s) => s,
    cheats: (s) => s.replace(/capped at (\d[\d,]*)\s+substeps/, 'capped at 200 substeps'),
  },
  {
    name: 'GAL_STEP declaration removed',
    claim: CLAIMS[0],
    physics: (s) => s.replace('export const GAL_STEP = {', 'const GAL_STEP_RENAMED = {'),
    cheats: (s) => s,
  },
];

let negOk = true;
const notes = [];
for (const s of SABOTAGE) {
  const p = s.physics(PHYSICS);
  const c = s.cheats(CHEATS);
  const mutated = p !== PHYSICS || c !== CHEATS;
  const clean = runClaim(s.claim, PHYSICS, CHEATS, false).ok;
  const caught = !runClaim(s.claim, p, c, false).ok;
  if (!mutated || !clean || !caught) negOk = false;
  notes.push(`${s.name} ${mutated ? 'mutated' : 'NO-OP'}/${caught ? 'caught' : 'MISSED'}`);
}

check('TR4', negOk, `negative: ${notes.join(' | ')}`);

console.log('');
console.log(failures === 0 ? 'ledger tells the truth  [PASS]' : `truthLab FAILED (${failures})  [FAIL]`);
process.exit(failures === 0 ? 0 : 1);