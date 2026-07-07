// fabric.js = "fabric-of-space" — the 3D solar system simulator. This file is the main entry point for the browser.
// Renders gravitationally interacting objects as a bent sheet.
// The question asked at the vertex is, " How deep is the gravity well here?"
// Same per-unit-mass math as the potential energy of a ball on a trampoline, but the "ball" is a planet and the "trampoline" is the fabric of space itself.-
import * as THREE from 'three';

// Honest physics contstants
const SIZE = 80; // Sheet spans plus (+) and minus (-) 40 AU; Neptune's orbit is -30 AU, so the sheet is big enough to see the whole solar system.
const SEGMENTS = 120; // The sheet is a grid of 120x120 square grid -> 14.641 vertices asking the question

// Display dials ( cheats #3 and #4 -- SEE CHEATS.md for details )
const DEPTH_SCALE = 5; // seen units for the deepest part of the gravity well.
const PHI_REF = 2e-5; // "sea level": potential this weak barely bends the fabric, so it is the reference for the depth scale. The deepest part of the well is ~5x this value, so the well is 5x deeper than the "sea level" of space.
const EPS = 0.4; // softening factor for the gravity well. The potential is singular at the center of a body, so this factor makes the well look like a smooth bowl instead of a sharp spike. The value is tuned to make the Sun's well look like a nice bowl, and it works for all other bodies too.
const PLANET_GAIN = 100; // display-only planet mass boost to exaggerate the depth of the wells so they are visible. The Sun is already deep enough to be seen, so it is not boosted.
                         // (true mdoe sets this to 1 - honest, and nearly flat

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
    pos.setY(i, -DEPTH_SCALE * Math.log10(1 + phi / PHI_REF));
  }
  pos.needsUpdate = true;  // flag the buffer so the GPU re-uploads it this frame
}