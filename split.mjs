import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';

const HEADER = `// ---------- ui/legend.js — the ? legend and its key manifest ----------
// EXTRACTED FROM main.js 2026-08-04 (Phase 1, step 1 of the core/experiment
// split). Behaviour is unchanged: same DOM nodes, same three modes, same text.
// Only the file boundary moved. No lab receipt: nothing on screen changed.
//
// WHY THIS MODULE CREATES ITS DOM AT IMPORT TIME
// The docked legend deliberately carries NO z-index, so it relies on being
// APPENDED FIRST — every data panel appended later then draws over it. An
// import is evaluated before the importing module's body runs, so this file
// running document.body.append() at import time preserves that order exactly.
// Do not defer it into a function.
//
// GUARDED BY lab/legendLab.mjs, which now reads the KEYS array out of THIS
// file and the keydown bindings out of main.js, and refuses to let the two
// disagree. Proven to read this file: cutting one entry from KEYS makes L1
// fire on the orphaned binding.

`;

const TAIL = `
// The ? key cycles: closed -> docked -> full -> closed. main.js owns the
// single keydown firewall and calls this; it never touches legendMode.
export function cycleLegend() {
  legendMode = (legendMode + 1) % 3;
  applyLegend();
}
`;

const START = 'const KEYS = [';
const STOP = 'applyLegend();\n';
const CALLSITE = "    legendMode = (legendMode + 1) % 3;\n    applyLegend();";
const IMPORT_ANCHOR = "import { makeStarfield } from './starfield.js';";
const IMPORT_LINE = "\nimport { cycleLegend } from './ui/legend.js';   // A2 legend + KEYS manifest, extracted 2026-08-04";

if (existsSync('ui/legend.js')) {
  console.log('skipped: ui/legend.js already exists — nothing done');
  process.exit(0);
}

let main = readFileSync('main.js', 'utf8');

const start = main.indexOf(START);
if (start === -1) { console.log('ABORT: KEYS array not found in main.js'); process.exit(1); }
const stopAt = main.indexOf(STOP, start);
if (stopAt === -1) { console.log('ABORT: trailing applyLegend() call not found'); process.exit(1); }
const end = stopAt + STOP.length;
const block = main.slice(start, end);

if (!block.includes('function compactLegend()') || !block.includes('function fullLegend()')) {
  console.log('ABORT: block does not contain both legend builders — boundaries wrong');
  process.exit(1);
}
if (!main.includes(CALLSITE)) { console.log('ABORT: keydown call site not found'); process.exit(1); }
if (!main.includes(IMPORT_ANCHOR)) { console.log('ABORT: import anchor not found'); process.exit(1); }

mkdirSync('ui', { recursive: true });
writeFileSync('ui/legend.js', HEADER + block.replace(START, 'export ' + START) + TAIL);

main = main.slice(0, start) + main.slice(end);
main = main.replace(CALLSITE, '    cycleLegend();');
main = main.replace(IMPORT_ANCHOR, IMPORT_ANCHOR + IMPORT_LINE);
writeFileSync('main.js', main);

let lab = readFileSync('lab/legendLab.mjs', 'utf8');
lab = lab.replace(
  "const SRC = readFileSync('main.js', 'utf8');",
  "const FILES = ['main.js', 'ui/legend.js'];   // KEYS moved to ui/legend.js 2026-08-04\nconst SRC = FILES.map((f) => readFileSync(f, 'utf8')).join('\\n');",
);
lab = lab.replace(
  "throw new Error('legendLab: no KEYS array in main.js')",
  "throw new Error(`legendLab: no KEYS array in ${FILES.join(' or ')}`)",
);
writeFileSync('lab/legendLab.mjs', lab);

console.log(`moved ${block.length} bytes into ui/legend.js`);
console.log(`main.js: ${main.split('\n').length} lines (was 2266)`);
console.log('patched: main.js, lab/legendLab.mjs');