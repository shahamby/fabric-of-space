import bodiesData from './data/bodies.json';
import { makeBodyMesh } from './bodyMesh.js';

// Builds one mesh per body in data/bodies.json, in file order (Sun first).
export function loadBodyMeshes() {
  return bodiesData.bodies.map(makeBodyMesh);
}

// Simulation State
// A working copy for the physics to scribble on, wihile the imported JSON remains pristine and auditable.

export const G = bodiesData._meta.G_au3_msun_day2;
console.assert(Number.isFinite(G), 'G failed to load from bodies.json');

export function buildSimBodies() {
  const simBodies = [];                    // start with an empty array
  for (const b of bodiesData.bodies) {    // walk the bodies in the JSON
    simBodies.push({                       // .push() appents to the array
      name: b.name,
      mass: b.mass_msun,                   // physics calls it "mass"
      radius_km: b.radius_km,              // twin knows its own size (M7 detection)
      pos: [...b.position_au],             // [...] = real copy of the array, not a reference       
      vel: [...b.velocity_au_day],         // (see below)
      acc: [0, 0, 0],                      // Gravvity will fill this in
    });
  }
  return simBodies;
}