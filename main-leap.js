import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { makeStarfield } from './starfield.js';
import { loadBodyMeshes, buildSimBodies, G } from './bodies.js';
import { computeAccelerations, leapfrogStep, totalEnergy } from './physics.js';
import { eclToScene } from './bodyMesh.js';

// ---------- 1. The stage ----------
// Think movie set: a Scene holds objects, a Camera views them,
// and a Renderer is the crew that draws each frame onto a canvas.
const scene = new THREE.Scene();

// PerspectiveCamera(field-of-view°, aspect ratio, nearest visible dist, farthest)
const camera = new THREE.PerspectiveCamera(
  60, window.innerWidth / window.innerHeight, 0.1, 5000
);
camera.position.set(0, 60, 100); // above and back, so the ecliptic plane reads clearly

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // crisp on HiDPI screens
document.body.appendChild(renderer.domElement); // the <canvas> lands in the page here

// Lets the mouse orbit/pan/zoom the camera around the scene.
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// ---------- 2. The stars ----------
const stars = makeStarfield();
scene.add(stars);

// ---------- 3. The solar system ----------
// GridHelper's default plane is XZ at y=0, which is exactly the ecliptic
// plane after eclToScene() — so it lines up with the bodies with no extra math.
const grid = new THREE.GridHelper(80, 16, 0x444466, 0x222233);
scene.add(grid);

const bodyMeshes = loadBodyMeshes();
scene.add(...bodyMeshes);

const sunMesh = bodyMeshes.find((mesh) => mesh.userData.body.name === 'Sun');
const sunlight = new THREE.PointLight(0xffffff, 2);
sunlight.decay = 0;                                  // cheat #2
sunlight.position.copy(sunMesh.position);            // tracks the Sun, not the origin
scene.add(sunlight, new THREE.AmbientLight(0xffffff, 0.08));

// Physics setup (runs once)
const simBodies = buildSimBodies();
computeAccelerations(simBodies, G); // prime the accelerations for the first leapfrog step, before the loop starts

const DT = 0.5; // days per physics step, ~12 hours
let timeScale = 20; // days per real second - Speed up the simulation to make it interesting. 20 days/sec is ~6000x real time.
let simDays = 0 // total days simulated since the page loaded. This is a running counter, not a delta.
let carry = 0; // carry-over fraction of a day from the last frame, to keep the simulation smooth
let lastTime = performance.now(); // milliseconds since page load, from the browser's clock

// Instruments (setup)
const hud = document.getElementById('hud'); // get the <div> added to index.html for the heads-up display by its id
const E0 = totalEnergy(simBodies, G); // initial energy, for the energy at day zero

// ---------- 4. True-scale toggle ----------
// Cheat #1 is body-size exaggeration (see CHEATS.md). Press T to see the
// real, true-to-data size of every body — most will vanish to a speck.
let trueScale = false;
window.addEventListener('keydown', (event) => {
  if (event.key.toLowerCase() !== 't') return;
  trueScale = !trueScale;
  for (const mesh of bodyMeshes) {
    const radius = trueScale ? mesh.userData.trueRadiusAu : mesh.userData.displayRadiusAu;
    mesh.scale.setScalar(radius);
  }
});

// The ONLY bridge betwween simulated space and rendered space.
function syncMeshes() {
  for (let i = 0; i < simBodies.length; i++) {
    const [x, y, z] = simBodies[i].pos;
    bodyMeshes[i].position.copy(eclToScene(x, y, z));
  }
}

// Lap detector: Earth's bearing as seen from the Sun's position, in the ecliptic plane.
const earthSim = simBodies.find((body) => body.name === 'Earth');
const sunSim = simBodies.find((body) => body.name === 'Sun');
const heliocentricAngle = () =>
  Math.atan2(earthSim.pos[1] - sunSim.pos[1], earthSim.pos[0] - sunSim.pos[0]);
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a)); // fold any angle into [-π, π]
const startAngle = heliocentricAngle();
let prevOffset = 0;
let lastLapDay = 0;

// ---------- 5. The loop ----------
// requestAnimationFrame asks the browser to call us before every screen
// refresh (~60x/sec). In M2, the physics step will live inside this loop.
function animate(now) {              // 'now' = stopwatch reading from the browser
  requestAnimationFrame(animate);

  const real = Math.min((now - lastTime) / 1000, 0.1);  // secs since last frame,
  lastTime = now;                                       // clamped for tab-switches

  carry += real * timeScale;         // deposit the sim-days we owe
  while (carry >= DT) {              // spend them in fixed, identical steps
    leapfrogStep(simBodies, DT, G);
    simDays += DT;
    carry -= DT;
  }

  syncMeshes();                                // simulation space -> screen
  sunlight.position.copy(sunMesh.position);    // the Sun moves now; its light follows
  const drift = (totalEnergy(simBodies, G) - E0) / Math.abs(E0); // relative energy drift since day zero
  hud.textContent = `Day ${Math.floor(simDays)}\nEnergy drift: ${drift.toExponential(2)}`;
  const offset = wrap(heliocentricAngle() - startAngle);
  if (simDays - lastLapDay > 180 && prevOffset < 0 && offset >= 0) {
    console.log(`The pale blue dot has completed another orbit around the Sun! ${(simDays - lastLapDay).toFixed(1)} simulated days since the last lap.`);
    lastLapDay = simDays;
  }
  prevOffset = offset;
  controls.update();
  renderer.render(scene, camera);
}
requestAnimationFrame(animate);      // NOT animate() — the browser must supply 'now'

// ---------- 6. Stay correct when the window resizes ----------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix(); // camera must recompute its math after changes
  renderer.setSize(window.innerWidth, window.innerHeight);
});