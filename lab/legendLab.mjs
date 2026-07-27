// ---------- legendLab: the docs must match the code ----------
// Wall 2, sealed. main.js binds keys in its keydown firewall and declares
// them in the KEYS array that feeds the ? legend. Those two lists are
// written by different hands at different times, so they drift — and the
// drift is FAIL-SILENT: a key that works but is documented nowhere is
// invisible to everyone except the person who typed it. This lab reads
// both lists out of main.js and refuses to let them disagree.
//
// Same idea as the eslint no-undef gate one level up: that one proves the
// code is consistent with itself, this one proves the DOCS are consistent
// with the code. Run: node lab/legendLab.mjs
import { readFileSync } from 'node:fs';

const SRC = readFileSync('main.js', 'utf8');

// event.code names that are not single characters, mapped to what a human presses.
const CODE_TO_KEY = {
  Space: 'Space', BracketLeft: '[', BracketRight: ']',
  KeyL: 'L', KeyP: 'P', KeyD: 'D',
};

// ---- L0: read the two lists ----
function boundKeys(src) {
  const found = new Set();
  for (const m of src.matchAll(/event\.key\.toLowerCase\(\)\s*===\s*'([^']+)'/g)) found.add(m[1]);
  for (const m of src.matchAll(/event\.key\s*===\s*'([^']+)'/g)) found.add(m[1]);
  for (const m of src.matchAll(/event\.code\s*===\s*'([^']+)'/g)) {
    const k = CODE_TO_KEY[m[1]];
    if (!k) throw new Error(`legendLab: unmapped event.code '${m[1]}' — add it to CODE_TO_KEY`);
    found.add(k);
  }
  return found;
}

function documentedKeys(src) {
  const start = src.indexOf('const KEYS = [');
  if (start === -1) throw new Error('legendLab: no KEYS array in main.js');
  const end = src.indexOf('\n];', start);
  if (end === -1) throw new Error('legendLab: KEYS array is not closed');
  const block = src.slice(start, end);
  const found = new Set();
  for (const m of block.matchAll(/key:\s*'((?:[^'\\]|\\.)*)'/g)) found.add(m[1]);
  return found;
}

const bound = boundKeys(SRC);
const documented = documentedKeys(SRC);
console.log(`L0  ${bound.size} keys bound in the firewall | ` +
  `${documented.size} declared in KEYS`);

// ---- L1: nothing works in secret ----
const undocumented = [...bound].filter(k => !documented.has(k)).sort();
console.log(`L1  every bound key is documented: ` +
  `${undocumented.length ? undocumented.map(k => `'${k}'`).join(' ') : 'none missing'}  ` +
  `[${undocumented.length === 0 ? 'PASS' : 'FAIL'}]`);

// ---- L2: nothing is promised that does not exist ----
const phantom = [...documented].filter(k => !bound.has(k)).sort();
console.log(`L2  every documented key is bound: ` +
  `${phantom.length ? phantom.map(k => `'${k}'`).join(' ') : 'no phantoms'}  ` +
  `[${phantom.length === 0 ? 'PASS' : 'FAIL'}]`);

// ---- L3: the negative — prove this lab CAN fail ----
// A checker that has never been seen to fail is not a checker. Bind a key
// in a COPY of the source that KEYS knows nothing about, and demand L1's
// logic catches it. Nothing on disk is touched.
const sabotaged = SRC.replace(
  "  if (event.key === '?') {",
  "  if (event.key.toLowerCase() === 'q') { return; }\n  if (event.key === '?') {");
const sabBound = boundKeys(sabotaged);
const caught = [...sabBound].filter(k => !documented.has(k));
const sawQ = caught.includes('q');
console.log(`L3  negative: a secret 'q' binding is caught: ` +
  `${caught.map(k => `'${k}'`).join(' ') || 'NOTHING — the lab is blind'}  ` +
  `[${sawQ ? 'PASS' : 'FAIL'}]`);

// ---- L4: the verdict ----
const ok = undocumented.length === 0 && phantom.length === 0 && sawQ;
console.log(`L4  legend and firewall agree on all ${bound.size} keys  ` +
  `[${ok ? 'PASS' : 'FAIL'}]`);
process.exit(ok ? 0 : 1);