// fabric.js = "fabric-of-space" — the 3D solar system simulator. This file is the main entry point for the browser.
// Renders gravitationally interacting objects as a bent sheet.
// The question asked at the vertex is, " How deep is the gravity well here?"
// Same per-unit-mass math as the potential energy of a ball on a trampoline, but the "ball" is a planet and the "trampoline" is the fabric of space itself.-
import * as THREE from 'three';
import { galaxyPhi } from './physics.js';   // M12b: the measured well

// Honest physics contstants
const SIZE = 80; // Sheet spans plus (+) and minus (-) 40 AU; Neptune's orbit is -30 AU, so the sheet is big enough to see the whole solar system.
const SEGMENTS = 120; // The sheet is a grid of 120x120 square grid -> 14.641 vertices asking the question

// Display dials ( cheats #3, #4, and #5 -- SEE CHEATS.md for details )
const DEPTH_SCALE = 5; // seen units for the deepest part of the gravity well.
const PHI_REF = 2e-5; // "sea level": potential this weak barely bends the fabric, so it is the reference for the depth scale. The deepest part of the well is ~5x this value, so the well is 5x deeper than the "sea level" of space.
const EPS = 0.4; // softening factor for the gravity well. The potential is singular at the center of a body, so this factor makes the well look like a smooth bowl instead of a sharp spike. The value is tuned to make the Sun's well look like a nice bowl, and it works for all other bodies too.
const PLANET_GAIN = 100; // display-only planet mass boost to exaggerate the depth of the wells so they are visible. The Sun is already deep enough to be seen, so it is not boosted.
                         // (true mdoe sets this to 1 - honest, and nearly flat
const HOLE_DEPTH = 12;   // Cheat #5: tear floor, scene units — deeper than any honest funnel (~8 max)
const HOLE_GAIN = 1500;  // Cheat #5: display gain on the horizon radius so the rip is visible
const KM_PER_AU = 149597870.7;
// M12b galaxy-mode display dials (cheat #8): shape honest, depth costumed
const GAL_DEPTH = 6;      // scene units at full log compression
const GAL_PHI_REF = 1e4;  // (km/s)² "sea level" for the galactic sheet

export function makeFabric() {
  const geometry = new THREE.PlaneGeometry(SIZE, SIZE, SEGMENTS, SEGMENTS);
  geometry.rotateX(-Math.PI / 2); // rotate the plane to be horizontal (XZ plane)
                                  // lay the vertices flat into XZ - This is our eliptic plane, so the Sun and planets are all in the same plane. The fabric is a flat sheet at y=0, and the Sun and planets are all on that sheet
  const material = new THREE.MeshBasicMaterial({
    color: 0x3a5a8a, wireframe: true, transparent: true, opacity: 0.45,
  });
  return new THREE.Mesh(geometry, material);
}

export function updateFabric(fabric, simBodies, G, trueMode = false) {
  const gain = trueMode ? 1 : PLANET_GAIN;
  const pos = fabric.geometry.attributes.position;  // the raw vertex buffer

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);        // scene X = ecliptic x, in AU
    const yEcl = -pos.getZ(i);    // undo the render remap: scene z = -ecliptic y

    let phi = 0;                                 // total hole-depth at this point
    for (const b of simBodies) {
      const dx = x - b.pos[0];
      const dy = yEcl - b.pos[1];
      const r = Math.sqrt(dx*dx + dy*dy) + EPS;  // distance in the plane, softened
      const m = b.name === 'Sun' ? b.mass : b.mass * gain;
      phi += (G * m) / r;                        // this body's contribution to the depth
    }

    // Cheat #3: log compression, so the Sun's funnel doesn't punch through the floor
    let y = -DEPTH_SCALE * Math.log10(1 + phi / PHI_REF);

    // Cheat #5: the rip. Inside a collapsed body's (display-scaled) horizon,
    // the honest curve is abandoned — the vertex slams to a fixed floor,
    // producing near-vertical walls where the smooth funnel used to be.
    for (const b of simBodies) {
      if (!b.collapsed) continue;
      const hdx = x - b.pos[0];
      const hdy = yEcl - b.pos[1];
      const holeR = Math.max(1.0, (b.rsKm / KM_PER_AU) * HOLE_GAIN);
      if (hdx * hdx + hdy * hdy < holeR * holeR) {  // d² < r² — same answer, no sqrt
        y = -HOLE_DEPTH;
        break;                                      // one hole is enough
      }
    }

    pos.setY(i, y);
  }
  pos.needsUpdate = true;  // flag the buffer so the GPU re-uploads it this frame
}
// M12b: the galactic sheet. One unit = 1 kpc in galaxy mode. Every vertex
// asks galaxyPhi() — the exact potential the rotation-curve lab measured.
// Same remap and same log-compression pattern as the solar sheet above.
export function updateGalaxyFabric(fabric) {
  const pos = fabric.geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);        // scene X = galactic x, in kpc
    const yGal = -pos.getZ(i);    // undo the render remap, as ever
    const R = Math.hypot(x, yGal);
    pos.setY(i, galaxyDepth(R));
  }
  pos.needsUpdate = true;
}
// M12c: the sheet's own height at radius R. One source of truth, so a star
// placed on the fabric sits ON the fabric — never above it, never through it.
export function galaxyDepth(R) {
  return -GAL_DEPTH * Math.log10(1 + Math.abs(galaxyPhi(R)) / GAL_PHI_REF);
}