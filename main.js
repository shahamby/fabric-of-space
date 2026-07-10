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

// Hash helper
async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)]
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

// Black hole helper
const BLACK_HOLE_MAT = new THREE.MeshBasicMaterial({ color: 0x000000 });

function makeHorizonRing() {
  const geo = new THREE.RingGeometry(1.4, 1.7, 48);   // unit-sphere units
  geo.rotateX(-Math.PI / 2);                          // lie flat in the ecliptic
  const mat = new THREE.MeshBasicMaterial({ color: 0xffaa33,
    side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
  return new THREE.Mesh(geo, mat);
}

function setCollapseVisual(mesh, collapsed) {
  if (collapsed && !mesh.userData.originalMaterial) {
    mesh.userData.originalMaterial = mesh.material;   // save the planet's clothes
    mesh.material = BLACK_HOLE_MAT;
    mesh.userData.ring = makeHorizonRing();
    mesh.add(mesh.userData.ring);   // child of the mesh: rides along, inherits scale
  }
  if (!collapsed && mesh.userData.originalMaterial) {
    mesh.material = mesh.userData.originalMaterial;   // clothes back on
    mesh.userData.originalMaterial = null;
    mesh.remove(mesh.userData.ring);
    mesh.userData.ring = null;
  }
}

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
    setCollapseVisual(selected, checkCollapse(b));
    return;
  }
  if (event.key.toLowerCase() === 'n') { spawnRogue(); return; }
  if (event.code === 'BracketLeft')  timeScale = Math.max(1,    timeScale / 2);  // space is an
  if (event.code === 'BracketRight') timeScale = Math.min(2048, timeScale * 2);  // invisible ' '
  if (event.code === 'KeyL') fetchAllBodies(); // JPL data from Horizons
  if (event.code === 'KeyP') {
    provPanel.style.display =
      provPanel.style.display === 'none' ? 'block' : 'none';
    renderProvenance()
  }
  if (event.code === 'KeyD') downloadProvenance();
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

  // Soft glow on the chosen one. The Sun's material has no emissive, hence the guards — it self-selects by glowing anyway.
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
simBodies.push({ name: body.name, mass: body.mass_msun, radius_km: body.radius_km,
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

// Notify on mismatch
function applyLiveVectors(results) {
  for (const [name, state] of Object.entries(results)) {
    const body = simBodies.find((b) => b.name === name);
    if (!body) {
      throw new Error(`Live data for "${name}" has no sim twin — roster mismatch?`);
    }
    body.pos = [...state.position];
    body.vel = [...state.velocity];
  }
  simDays = 0;                          // new epoch — reset the odometer
  lastLapDay = 0;                       // lap detector starts fresh too
  computeAccelerations(simBodies, G);   // forces changed — everyone re-aims
  E0 = totalEnergy(simBodies, G);       // authorized change — re-seal the baseline
  console.log('Sim reborn from live Horizons epoch.');
}

// Schwarzschild equation
function schwarzschildRadiusKm(massMsun) {
  return 2.95 * massMsun;    // r_s of the Sun is 2.95 km; linear in mass
}

function checkCollapse(body) {
  const rs = schwarzschildRadiusKm(body.mass);
  const collapsed = body.radius_km < rs;
  if (collapsed && !body.collapsed) {
    console.log(`${body.name} has collapsed into a black hole! ` +
      `r_s ${rs.toFixed(1)} km > radius ${body.radius_km.toFixed(1)} km`);
  }
  if (!collapsed && body.collapsed) {
    console.log(`${body.name} has un-collapsed — the horizon receded inside the body.`);
  }
  body.collapsed = collapsed;   // the twin now carries its own state
  body.rsKm = rs;               // and its horizon size, for the fabric to read
  return collapsed;
}


// Horizons - ID mapping
const HORIZONS_IDS = [
  ['Sun', '10'],
  ['Mercury', '1'], ['Venus', '2'], ['Earth', '3'], ['Mars', '4'],
  ['Jupiter', '5'], ['Saturn', '6'], ['Uranus', '7'], ['Neptune', '8'],
];

// Horizons - Progress bar
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
// Horizons - Panel setup
const provPanel = document.createElement('div');
provPanel.style.cssText =
  'position:fixed; bottom:12px; right:12px; max-width:440px; max-height:60vh;' +
  'overflow:auto; background:rgba(0,0,0,0.85); border:1px solid #555;' +
  'color:#9fd; font:11px monospace; padding:8px; white-space:pre; display:none;';
document.body.append(provPanel);

function renderProvenance() {
  if (!sessionProvenance) {
    provPanel.textContent =
      'No live data this session — running on shipped snapshot (bodies.json).';
    return;
  }
  const head =
    `SOURCE   ${sessionProvenance.source}\n` +
    `FRAME    ${sessionProvenance.frame}\n` +
    `SESSION  ${sessionProvenance.session}\n\n`;
  const rows = sessionProvenance.bodies.map(r =>
    `${r.body.padEnd(8)} cmd=${r.command}  ${r.epoch}  ` +
    `sha256=${r.sha256.slice(0, 12)}…  ${r.parsed}`
  ).join('\n');
  provPanel.textContent = head + rows;
}

// Horizons - Parser function
function parseHorizonsVectors(text, expectedName) {
  // Trust boundary checks — refuse before parsing, never after
  if (!text.includes(expectedName)) {
    throw new Error(`${expectedName} appears to be incorrect — wrong body?`);
  }
  const soe = text.indexOf('$$SOE');
  const eoe = text.indexOf('$$EOE');
  if (soe === -1 || eoe === -1) {
    throw new Error(`No $$SOE/$$EOE fence for ${expectedName} — truncated response?`);
  }
  const firstRow = text.slice(soe + 5, eoe).trim().split('\n')[0];
  const cols = firstRow.split(',').map(s => s.trim());
  const nums = cols.slice(2, 8).map(Number);   // X Y Z VX VY VZ
  if (nums.some(Number.isNaN)) {
    throw new Error(`NaN in state vector for ${expectedName}: ${firstRow}`);
  }
  return { position: nums.slice(0, 3), velocity: nums.slice(3, 6) };
}
// Horizons - Fetch setup
let sessionProvenance = null;

// Horizons - Fetch function
async function fetchAllBodies() {
  progressBox.style.display = 'block';
  const results = {};
  const records = [];
    const msPerDay = 24 * 60 * 60 * 1000;
    const stop  = new Date();                                // now
    const start = new Date(stop.getTime() - msPerDay);       // 24h ago
    const fmt = (d) => d.toISOString().slice(0, 10);         // → 'YYYY-MM-DD'
  for (let i = 0; i < HORIZONS_IDS.length; i++) {
    const [name, id] = HORIZONS_IDS[i];
    progressLabel.textContent = `Collecting ${name} » (${i + 1}/9)`;
      const params = 
      `?format=json&COMMAND='${id}'&EPHEM_TYPE='VECTORS'&CENTER='500@0'` +
      "&OUT_UNITS='AU-D'&REF_PLANE='ECLIPTIC'&CSV_FORMAT='YES'" +
      `&START_TIME='${fmt(start)}'&STOP_TIME='${fmt(stop)}'&STEP_SIZE='1d'`;
    const response = await fetch('/api/horizons' + params);
    const data = await response.json();
    results[name] = parseHorizonsVectors(data.result, name);
    records.push({
      body: name,
      command: id,
      epoch: `${fmt(start)} 00:00 TDB`,
      fetchedAtUTC: new Date().toISOString(),
      responseBytes: data.result.length,
      sha256: await sha256Hex(data.result),
      parsed: 'OK',
    });
    progressFill.style.width = `${((i + 1) / 9) * 100}%`;
  }
  progressLabel.textContent = 'All your base belong to us! √';
  console.log('Live Horizons Data:', results);
  sessionProvenance = {
    source: 'NASA/JPL Horizons API via local Vite proxy',
    endpoint: 'https://ssd.jpl.nasa.gov/api/horizons.api',
    frame: 'Solar System Barycenter, ecliptic J2000',
    units: 'AU, AU/day',
    session: new Date().toISOString(),
    bodies: records,
  };
  console.log('Session provenance:', sessionProvenance);   // ← Option C, done
  applyLiveVectors(results);
  return results
}

// Horizons - Download provenance
function downloadProvenance() {
  if (!sessionProvenance) return;
  const blob = new Blob([JSON.stringify(sessionProvenance, null, 2)],
                        { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fabric-provenance-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
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
      `speed: ${v.toFixed(1)} km/s\n` +
      `r_s: ${schwarzschildRadiusKm(b.mass).toFixed(4)} km` +
      (b.collapsed ? '  — COLLAPSED' : '');
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