import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { makeStarfield } from './starfield.js';
import { loadBodyMeshes, buildSimBodies, G } from './bodies.js';
import { computeAccelerations, leapfrogStep, totalEnergy } from './physics.js';
import { eclToScene, KM_PER_AU, makeBodyMesh } from './bodyMesh.js';
import { makeFabric, updateFabric } from './fabric.js';

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
const fabric = makeFabric();
scene.add(fabric);

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

const DT = 0.5;      // sim days per physics step — the ACCURACY dial
let timeScale = 20;  // sim days per real second — the SPEED dial ([ and ] halve/double)
                     // 20 d/s = 20 × 86,400 sim-seconds per real second ≈ 1.7 million× real time
let simDays = 0;     // the simulation's odometer — a running counter, not a delta
let carry = 0;       // carry-over sim-days owed from the last frame
let lastTime = performance.now();  // milliseconds since page load, from the browser's clock
let paused = false;  // Space toggles this; it gates the deposit only — rendering never pauses

// Instruments (setup)
const hud = document.getElementById('hud');       // heads-up display, top-left
const panel = document.getElementById('panel');   // selection readout, top-right
let E0 = totalEnergy(simBodies, G);             // Re-baselined on change; keep the alarm meaningful.

// ---------- 4. Keyboard controls ----------
// T = true scale (cheats off, see CHEATS.md). Space = pause. [ / ] = slower / faster.
// One listener routes every key — one firewall, many rules. Never add a second keydown.
let trueScale = false;
window.addEventListener('keydown', (event) => {
  if (event.key.toLowerCase() === 't') {
    trueScale = !trueScale;
    for (const mesh of bodyMeshes) {
      const radius = trueScale ? mesh.userData.trueRadiusAu : mesh.userData.displayRadiusAu;
      mesh.scale.setScalar(radius);
    }
    return;
  }
  if (event.code === 'Space') { paused = !paused; return; }   // .code, not .key — the key for
  // Mass surgery on the selected body: '-' halves, '=' doubles ('=' is the + key)
  if ((event.key === '-' || event.key === '=') && selected) {
    const b = simBodies[bodyMeshes.indexOf(selected)];
    b.mass *= (event.key === '=' ? 2 : 0.5);
    computeAccelerations(simBodies, G);  // forces changed THIS instant — everyone re-aims
    E0 = totalEnergy(simBodies, G);      // authorized change -> re-seal the baseline
    return;
  }
  if (event.key.toLowerCase() === 'n') { spawnRogue(); return; }
  if (event.code === 'BracketLeft')  timeScale = Math.max(1,    timeScale / 2);  // space is an
  if (event.code === 'BracketRight') timeScale = Math.min(2048, timeScale * 2);  // invisible ' '
  if (event.code === 'KeyL') fetchAllBodies(); // JPL data from Horizons
});

// ---------- Picking (see the ray diagram) ----------
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let selected = null;
let downX = 0, downY = 0;

window.addEventListener('pointerdown', (e) => { downX = e.clientX; downY = e.clientY; });

window.addEventListener('pointerup', (e) => {
  // If the mouse traveled, that was an orbit-drag, not a click. Stand down.
  if (Math.hypot(e.clientX - downX, e.clientY - downY) > 5) return;

  // Screen pixels -> math coordinates: center (0,0), edges ±1. The y-flip is
  // your third coordinate flip (eclToScene, the plane rotation, now this).
  pointer.x =  (e.clientX / window.innerWidth)  * 2 - 1;
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);            // aim the ray
  const hits = raycaster.intersectObjects(bodyMeshes); // everything skewered, nearest first
  selected = hits.length > 0 ? hits[0].object : null;  // first hit wins; empty space deselects

  // Soft glow on the chosen one. The Sun's material has no emissive, hence the
  // guards — it self-selects by glowing anyway.
  for (const m of bodyMeshes) if (m.material.emissive) m.material.emissive.set(0x000000);
  if (selected && selected.material.emissive) selected.material.emissive.set(0x223344);
});

// The ONLY bridge betwween simulated space and rendered space.
function syncMeshes() {
  for (let i = 0; i < simBodies.length; i++) {
    const [x, y, z] = simBodies[i].pos;
    bodyMeshes[i].position.copy(eclToScene(x, y, z));
  }
}

// Rogue body factory
let rogueCount = 0;
function spawnRogue() {
  rogueCount++;
  const r = 12;                               // AU from our local star - outside of Saturn's traffic pattern
  const theta = Math.random() * Math.PI * 2;  // random bearing on the ecliptic

  // Circular-orbit speed: sqrt(G·M/r) is the entire secret of orbiting —
  // move sideways exactly fast enough to keep missing the thing pulling you.
  const vCirc = Math.sqrt(G * sunSim.mass / r);

  const body = {                              // shaped like a bodies.json record,
    name: `Rogue-${rogueCount}`,              // so makeBodyMesh accepts it happily
    mass_msun: 9.55e-4,                       // one Jupiter's worth of trouble (infuckingsane bro)
    radius_km: 30000,
    color: '#ff4fa3',                         // no natural body is hot pink. Honest labeling.
    position_au: [ sunSim.pos[0] + r * Math.cos(theta),
                   sunSim.pos[1] + r * Math.sin(theta), 0 ],
    velocity_au_day: [ sunSim.vel[0] - vCirc * Math.sin(theta),   // perpendicular to the
                       sunSim.vel[1] + vCirc * Math.cos(theta),   // radius = sideways,
                       0 ],                                       // riding along with the Sun
  };

  // Both worlds get told, same index, same instant — the alignment contract holds.
  simBodies.push({ name: body.name, mass: body.mass_msun,
    pos: [...body.position_au], vel: [...body.velocity_au_day], acc: [0, 0, 0] });
  const mesh = makeBodyMesh(body);
  bodyMeshes.push(mesh);
  scene.add(mesh);

  computeAccelerations(simBodies, G);  // everyone re-aims, newcomer included
  E0 = totalEnergy(simBodies, G);      // new member -> new ledger baseline
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

// Horizons sanity check
const HORIZONS_IDS = [
  ['Sun', '10'], ['Mercury', '199'], ['Venus', '299'], // Cross check ./data/bodies.json 
  ['Earth', '399'], ['Mars', '499'], ['Jupiter', '599'], // Verify all names match and the order is correct
  ['Saturn', '699'], ['Uranus', '799'], ['Neptune', '899'], // These are the JPL codes and x99 refers to the planet itself
];

// Horizons progress bar
// Plain div to leave index.html untouched
const progressBox = document.createElement('div');
progressBox.style.cssText =
  'position:fixed; top:12px; left:50%; transform:translateX(-50%);' +
  'width:300px; background:#222; border:1px solid #555;' +
  'font:12px monospace; color:#eee; padding:4px; display:none;';
const progressFill = document.createElement('div');
progressFill.style.cssText = 'height:14px; width:0%; background:#1D9E75;';
const progressLabel = document.createElement('div');
progressBox.append(progressLabel, progressFill);
document.body.append(progressBox);

// Horizons
async function fetchAllBodies() {
  progressBox.style.display = 'block';
  const results = {};
  for (let i = 0; i < HORIZONS_IDS.length; i++) {
    const [name, id] = HORIZONS_IDS[i];
    progressLabel.textContent = `Collecting ${name} » (${i + 1}/9)`;
      const params = 
      "?format=json&COMMAND='399'&EPHEM_TYPE='VECTORS'&CENTER='500@0'" +
      "&OUT_UNITS='AU-D'&REF_PLANE='ECLIPTIC'&CSV_FORMAT='YES'" +
      "&START_TIME='2026-07-08'&STOP_TIME='2026-07-09'&STEP_SIZE='1d'";
    const response = await fetch('/api/horizons' + params);
    const data = await response.json();
    results[name] = data.result;
    progressFill.style.width = '${((i + 1) / 9) * 100}%';
  }
  progressLabel.textContent = 'All your base belong to us! √';
  console.log('Live Horizons Data:', data.result);
  return results
}

// ---------- 5. The loop ----------
// Physics deposits in fixed steps, then everything below the while paints.
function animate(now) {              // 'now' = stopwatch reading from the browser
  requestAnimationFrame(animate);

  const real = Math.min((now - lastTime) / 1000, 0.1);  // secs since last frame,
  lastTime = now;                                       // clamped for tab-switches

  if (!paused) carry += real * timeScale;  // deposit the sim-days we owe — unless paused
  while (carry >= DT) {                    // spend them in fixed, identical steps
    leapfrogStep(simBodies, DT, G);        // the corroborated integrator. Accept no substitutes.
    simDays += DT;
    carry -= DT;
  }

  syncMeshes();                                // simulation space -> screen
  sunlight.position.copy(sunMesh.position);    // the Sun moves; its light follows

  const drift = (totalEnergy(simBodies, G) - E0) / Math.abs(E0);
  hud.textContent = `Day ${Math.floor(simDays)} — ${timeScale} d/s${paused ? '  [paused]' : ''}\nEnergy drift: ${drift.toExponential(2)}`;

  const offset = wrap(heliocentricAngle() - startAngle);
  if (simDays - lastLapDay > 180 && prevOffset < 0 && offset >= 0) {
    console.log(`The pale blue dot has completed another orbit around the Sun! ${(simDays - lastLapDay).toFixed(1)} simulated days since the last lap.`);
    lastLapDay = simDays;
  }
  prevOffset = offset;

  if (selected) {
    const b = simBodies[bodyMeshes.indexOf(selected)];   // mesh -> its physics twin
    const rSun = Math.hypot(b.pos[0] - sunSim.pos[0], b.pos[1] - sunSim.pos[1], b.pos[2] - sunSim.pos[2]);
    const v = Math.hypot(...b.vel) * KM_PER_AU / 86400;  // AU/day -> km/s
    panel.textContent = `${b.name}\n` +
      `mass: ${b.mass.toExponential(2)} M☉  (≈ ${(b.mass * 1.989e30).toExponential(2)} kg)\n` +
      `from Sun: ${rSun.toFixed(2)} AU\n` +
      `speed: ${v.toFixed(1)} km/s`;
    panel.style.display = 'block';
  } else {
    panel.style.display = 'none';
  }

  updateFabric(fabric, simBodies, G, trueScale);
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