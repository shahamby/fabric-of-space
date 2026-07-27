import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const FILES = {
  solar: 'data/bodies.json',
  gaia: 'data/gaia_pm.tsv',
  clusters: 'data/harris_vr.tsv',
  cepheids: 'data/cepheids.tsv',
  mroz: 'data/mroz_curve.txt',
};

const SEAL = {
  solar: [4291, '6cf6d13a6cf7'],
  gaia: [11780, '989ad75bb6ad'],
  clusters: [11910, 'c16f2fcd98d8'],
  cepheids: [215840, 'f5cdd1cc6cea'],
  mroz: [36559, '270466d87042'],
};

let allPassed = true;

for (const [k, f] of Object.entries(FILES)) {
  const b = readFileSync(f);
  const bytes = b.length;
  const sha12 = createHash('sha256')
    .update(b)
    .digest('hex')
    .slice(0, 12);

  const pass = bytes === SEAL[k][0] && sha12 === SEAL[k][1];
  allPassed = allPassed && pass;

  console.log(`${k} ${bytes} ${sha12} [${pass ? 'PASS' : 'FAIL'}]`);
}

console.log(
  `SN1 five compiled snapshots byte-exact [${allPassed ? 'PASS' : 'FAIL'}]`
);