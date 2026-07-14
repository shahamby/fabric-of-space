// contactsReceipt.mjs — regression receipt for the M9 findContacts fix.
// A proximity alarm must measure intruder-to-ASSET, not intruder-to-HQ.
import { findContacts } from './physics.mjs';
const KM_PER_AU = 1.496e8;
const touching = [
  { name: 'X', pos: [2.0, 0, 0], radius_km: 6371 },
  { name: 'Y', pos: [2.00004, 0, 0], radius_km: 6371 },  // ~6,000 km gap < 12,742 sum
];
const apart = [
  { name: 'X', pos: [0.5, 0, 0], radius_km: 6371 },
  { name: 'Y', pos: [0.00003, 0, 0], radius_km: 6371 },  // 0.5 AU apart, B near origin
];
const t = JSON.stringify(findContacts(touching, KM_PER_AU));
const a = JSON.stringify(findContacts(apart, KM_PER_AU));
console.log(`touching pair at 2 AU -> ${t}  (must be [[0,1]])`);
console.log(`half-AU-apart pair    -> ${a}  (must be [])`);
console.log(t === '[[0,1]]' && a === '[]' ? 'PASS' : 'FAIL');