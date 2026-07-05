import * as THREE from 'three';

export const KM_PER_AU = 149597870.7;

// ---- Cheat #1: size exaggeration ----
// At true scale Earth is 0.0000426 AU wide — invisible at any distance that
// also shows its orbit. So distances stay TRUE, sizes get inflated.
// The cap stops giant planets from out-sizing the Sun; the Sun's own
// multiplier keeps it smaller than Mercury's orbit (0.31 AU at closest).
const PLANET_SIZE_X = 1200;
const PLANET_CAP_AU = 0.25;
const SUN_SIZE_X = 60;

// Every mesh is this same unit sphere, scaled per-body via mesh.scale —
// shared across all bodies instead of allocated once per call.
const UNIT_SPHERE = new THREE.SphereGeometry(1, 32, 16);

// Astronomy says Z points up out of the ecliptic; Three.js says Y is up.
// (x, y, z) -> (x, z, -y) is a pure 90° rotation — no mirror-imaging — so
// M2's physics can stay in ecliptic coordinates and ONLY rendering passes
// through this function. Simulation space vs render space, in one line.
export function eclToScene(x, y, z) {
  return new THREE.Vector3(x, z, -y);
}

// The Sun renders self-lit and its own size multiplier; every other body is
// lit by the Sun and shares the planet size multiplier/cap. One branch that
// produces both outputs together, instead of two separate isSun ternaries
// drifting out of sync as more body types (moons, stars) are added later.
function sunOrPlanetLook(isSun, trueRadiusAu, color) {
  if (isSun) {
    return {
      displayRadiusAu: trueRadiusAu * SUN_SIZE_X,
      material: new THREE.MeshBasicMaterial({ color }), // self-lit
    };
  }
  return {
    displayRadiusAu: Math.min(trueRadiusAu * PLANET_SIZE_X, PLANET_CAP_AU),
    material: new THREE.MeshStandardMaterial({ color }), // lit by the Sun
  };
}

export function makeBodyMesh(body) {
  const isSun = body.name === 'Sun';
  const trueRadiusAu = body.radius_km / KM_PER_AU;
  const { displayRadiusAu, material } = sunOrPlanetLook(isSun, trueRadiusAu, body.color);

  // The Sun must stay smaller than Mercury's orbit (0.31 AU at closest) and
  // any capped planet must stay smaller than the Sun — both constants above
  // are hand-tuned to that, so warn loudly if the invariant ever breaks.
  if (isSun && displayRadiusAu <= PLANET_CAP_AU) {
    console.warn(
      `Sun display radius (${displayRadiusAu} AU) is no longer larger than ` +
      `the planet cap (${PLANET_CAP_AU} AU) — re-tune SUN_SIZE_X/PLANET_CAP_AU.`
    );
  }

  const mesh = new THREE.Mesh(UNIT_SPHERE, material);
  const [x, y, z] = body.position_au;
  mesh.position.copy(eclToScene(x, y, z));  // 1 scene unit = 1 AU
  mesh.scale.setScalar(displayRadiusAu);

  // Stashed for your toggle now, and for click-picking in M4
  mesh.userData = { body, trueRadiusAu, displayRadiusAu };
  return mesh;
}