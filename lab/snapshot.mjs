// ---------- B0: writing a shipped snapshot is a deliberate act ----------
// Four labs re-fetch catalogues that the app also ships compiled into its
// bundle. VizieR stamps the fetch DATE into every response, so a plain
// re-fetch changes the file's sha256 without changing a single measurement
// — and every checksum in CLAUDE.md, in the weekly recap, and in the hosted
// provenance panel silently goes stale. git status was the only witness.
//
// So refreshing an archive is now opt-in. Run a lab normally and it fetches,
// verifies, and leaves the shipped bytes alone. To genuinely re-archive:
//
//     SNAPSHOT=1 node lab/gaiaLab.mjs
//     node lab/snapshotLab.mjs        <- then RESEAL: the digits have moved
//
// and update the sealed values in snapshotLab, CLAUDE.md and CHEATS #18.
import { writeFileSync, mkdirSync } from 'node:fs';

export const REFRESH = process.env.SNAPSHOT === '1';

export function writeSnapshot(path, text, label) {
  if (!REFRESH) {
    console.log(`    (${label}: ${text.length} bytes fetched and checked; ` +
      `shipped snapshot left alone — SNAPSHOT=1 to re-archive)`);
    return;
  }
  mkdirSync('data', { recursive: true });
  writeFileSync(path, text);
  console.log(`    (${label}: snapshot REWRITTEN — rerun lab/snapshotLab.mjs and reseal)`);
}