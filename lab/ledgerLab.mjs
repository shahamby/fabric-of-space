// lab/ledgerLab.mjs — B5 / T0.1: the guard the docs do not have.
//
// eslint guards code against itself. legendLab guards the docs against the
// code. NOTHING guards the ledger. CHEATS #24 went missing on 2026-07-28 and
// was not noticed for 8 sessions and 4 commits. On 2026-08-01 two more entries
// (W2c, W2c.2) shipped with no number at all — in the same commit that shelved
// this lab.
//
// This lab reads the ledgers as TEXT. It knows nothing about physics and
// imports nothing from the project. Its only claim is that the paperwork
// refers to things that exist.
//
// WHAT IT ASSERTS
//   LD1  CHEATS.md   entry numbers run 1..N with no gap, no repeat, none blank
//   LD2  TAXONOMY.md entry numbers run 1..N with no gap, no repeat, none blank
//   LD3  every "CHEATS #N" cited in the prose resolves to a real CHEATS entry
//   LD4  every "taxonomy #N" cited in the prose resolves to a real TAXONOMY entry
//   LD5  negative: three sabotages, each must be caught
//
// WHAT IT DELIBERATELY DOES NOT ASSERT
//   HANDOFF.md's historical "pattern #N" mentions use a DEAD numbering series.
//   TAXONOMY.md's CITATION MAP exists precisely to translate them. Scanning
//   those would fire on history that is already reconciled, so the citation
//   map section of TAXONOMY.md is excluded from LD4 by name.

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
// PARSER
// ---------------------------------------------------------------------------
// CHEATS.md carries two heading dialects, both legitimate:
//     "## #1 — Body-size exaggeration"      (entries 1-5, the oldest)
//     "## 6. Collisions merge instantly"    (entries 6+)
// TAXONOMY.md uses the second only. Both are accepted. Anything else under a
// "## " in an entry file is an UNNUMBERED ENTRY unless it is named below.

const NOT_ENTRIES = new Set([
  'RETIRED',
  'CITATION MAP — historical mentions to canonical numbers',
]);

function parseEntries(text, file) {
  const numbered = [];   // { n, title, line }
  const unnumbered = []; // { title, line }
  text.split('\n').forEach((raw, i) => {
    if (!raw.startsWith('## ')) return;
    const head = raw.slice(3).trim();
    if (NOT_ENTRIES.has(head)) return;
    const m = head.match(/^(?:#(\d+)\s*—|(\d+)\.)\s*(.+)$/);
    if (m) numbered.push({ n: Number(m[1] ?? m[2]), title: m[3].trim(), line: i + 1 });
    else unnumbered.push({ title: head, line: i + 1 });
  });
  return { file, numbered, unnumbered };
}

// A ledger is sound when: nothing is unnumbered, and the numbers present are
// exactly 1..N. Returns a list of complaints, empty means sound.
function auditNumbering(led) {
  const bad = [];
  for (const u of led.unnumbered) {
    bad.push(`${led.file}:${u.line} unnumbered entry "${u.title}"`);
  }
  const seen = new Map();
  for (const e of led.numbered) {
    if (seen.has(e.n)) bad.push(`${led.file}:${e.line} duplicate #${e.n} ("${e.title}")`);
    else seen.set(e.n, e);
  }
  const nums = [...seen.keys()].sort((a, b) => a - b);
  const top = nums.length ? nums[nums.length - 1] : 0;
  for (let want = 1; want <= top; want++) {
    if (!seen.has(want)) bad.push(`${led.file} missing #${want}`);
  }
  return { bad, top, count: nums.length };
}

// Citations. "CHEATS #24" and "taxonomy #17" / "Taxonomy #17" / "TAXONOMY #17".
function citations(text, word) {
  const re = new RegExp(`${word}\\s*#(\\d+)`, 'gi');
  const out = [];
  text.split('\n').forEach((line, i) => {
    let m;
    while ((m = re.exec(line)) !== null) out.push({ n: Number(m[1]), line: i + 1 });
  });
  return out;
}

// Drop the excluded sections of a file before scanning it for citations.
function stripSection(text, headings) {
  const lines = text.split('\n');
  const keep = [];
  let skipping = false;
  for (const line of lines) {
    if (line.startsWith('## ')) skipping = headings.has(line.slice(3).trim());
    if (!skipping) keep.push(line);
  }
  return keep.join('\n');
}

// ---------------------------------------------------------------------------
// LOAD
// ---------------------------------------------------------------------------
const CHEATS = read('CHEATS.md');
const TAXON = read('docs/TAXONOMY.md');
const CLAUDE = read('CLAUDE.md');
const HANDOFF = read('HANDOFF.md');

const cheatsLedger = parseEntries(CHEATS, 'CHEATS.md');
const taxonLedger = parseEntries(TAXON, 'docs/TAXONOMY.md');

// LD0 — inventory. Not a judgement, a statement of what was read.
const cA = auditNumbering(cheatsLedger);
const tA = auditNumbering(taxonLedger);
console.log(
  `LD0 read CHEATS.md ${cA.count} numbered + ${cheatsLedger.unnumbered.length} unnumbered ` +
  `(highest #${cA.top}) | TAXONOMY.md ${tA.count} numbered + ${taxonLedger.unnumbered.length} ` +
  `unnumbered (highest #${tA.top})`
);

// LD1 / LD2 — contiguity.
check('LD1', cA.bad.length === 0,
  cA.bad.length === 0
    ? `CHEATS.md numbering contiguous 1..${cA.top}, no gaps, no duplicates, none unnumbered`
    : `CHEATS.md numbering broken: ${cA.bad.join(' | ')}`);

check('LD2', tA.bad.length === 0,
  tA.bad.length === 0
    ? `TAXONOMY.md numbering contiguous 1..${tA.top}, no gaps, no duplicates, none unnumbered`
    : `TAXONOMY.md numbering broken: ${tA.bad.join(' | ')}`);

// LD3 — every CHEATS #N cited in prose exists.
const cheatNums = new Set(cheatsLedger.numbered.map((e) => e.n));
const cheatCites = [
  ...citations(CLAUDE, 'CHEATS').map((c) => ({ ...c, file: 'CLAUDE.md' })),
  ...citations(HANDOFF, 'CHEATS').map((c) => ({ ...c, file: 'HANDOFF.md' })),
];
const danglingCheats = cheatCites.filter((c) => !cheatNums.has(c.n));
check('LD3', danglingCheats.length === 0,
  danglingCheats.length === 0
    ? `all ${cheatCites.length} "CHEATS #N" citations in CLAUDE.md + HANDOFF.md resolve`
    : `dangling CHEATS citations: ${danglingCheats.map((c) => `${c.file}:${c.line} #${c.n}`).join(', ')}`);

// LD4 — every taxonomy #N cited in prose exists. TAXONOMY's own citation map
// is excluded: it quotes the dead series on purpose.
const taxonNums = new Set(taxonLedger.numbered.map((e) => e.n));
const taxonSources = [
  ['CLAUDE.md', CLAUDE],
  ['HANDOFF.md', HANDOFF],
  ['CHEATS.md', CHEATS],
  ['docs/TAXONOMY.md', stripSection(TAXON, NOT_ENTRIES)],
];
const taxonCites = taxonSources.flatMap(([file, text]) =>
  citations(text, 'taxonomy').map((c) => ({ ...c, file })));
const danglingTaxon = taxonCites.filter((c) => !taxonNums.has(c.n));
check('LD4', danglingTaxon.length === 0,
  danglingTaxon.length === 0
    ? `all ${taxonCites.length} "taxonomy #N" citations resolve (citation map excluded by name)`
    : `dangling taxonomy citations: ${danglingTaxon.map((c) => `${c.file}:${c.line} #${c.n}`).join(', ')}`);

// ---------------------------------------------------------------------------
// LD5 — NEGATIVE. Three sabotages against in-memory copies. Each must be
// caught. A guard never seen to fire is theater.
// ---------------------------------------------------------------------------
const sab = [];

// S-a: delete a number from a heading — the W2c failure, exactly.
{
  const broken = CHEATS.replace('## 28. The sheet\'s gauge', '## The sheet\'s gauge');
  const changed = broken !== CHEATS;
  const caught = auditNumbering(parseEntries(broken, 'X')).bad.length > 0;
  sab.push({ name: 'unnumbered heading', changed, caught });
}

// S-b: remove an entry outright, leaving a hole — the missing-#24 failure.
{
  const broken = CHEATS.replace(/^## 20\. .*$/m, '## 21b. duplicate-free filler');
  const changed = broken !== CHEATS;
  const caught = auditNumbering(parseEntries(broken, 'X')).bad.some((s) => s.includes('missing #20'));
  sab.push({ name: 'gap at #20', changed, caught });
}

// S-c: cite a CHEATS entry that does not exist.
{
  const broken = `${CLAUDE}\nA line that cites CHEATS #998 which was never written.\n`;
  const changed = broken !== CLAUDE;
  const caught = citations(broken, 'CHEATS').some((c) => !cheatNums.has(c.n));
  sab.push({ name: 'dangling CHEATS #998', changed, caught });
}

const allChanged = sab.every((s) => s.changed);
const allCaught = sab.every((s) => s.caught);
check('LD5', allChanged && allCaught,
  `negative: ${sab.map((s) => `${s.name} ${s.changed ? 'mutated' : 'NO-OP'}/${s.caught ? 'caught' : 'MISSED'}`).join(' | ')}`);

console.log('');
console.log(`ledger guard ${failures === 0 ? 'holds' : `found ${failures} problem(s)`}  [${failures === 0 ? 'PASS' : 'FAIL'}]`);
process.exit(failures === 0 ? 0 : 1);