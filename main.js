import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildSimBodies, G, loadBodyMeshes } from './bodies.js';
import { eclToScene, KM_PER_AU, makeBodyMesh } from './bodyMesh.js';
import { makeFabric, updateFabric, updateGalaxyFabric, galaxyDepth } from './fabric.js';
import { computeAccelerations, dipoleTesla, findContacts, leapfrogStep, mergeBodies, PN1, totalEnergy, BFIELD, GALAXY, galaxyPhi, GAL_STARS, seedGalaxyStars, stepGalaxyStars, galaxyVCirc, KMS_TO_KPC_MYR, GAL_CLUSTERS, seedClusterVelocities, clusterOrbit, galaxyVCircInner } from './physics.js';
import { HYG_SAMPLE } from './hygSample.js';
import harrisVrSnapshot from './data/harris_vr.tsv?raw';  // M12e: Harris incl. heliocentric Vr
import gaiaSnapshot from './data/gaia_pm.tsv?raw';        // M12e: Gaia EDR3 proper motions
import { makeStarfield } from './starfield.js';

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

const DT = 0.05;      // sim days per physics step — the ACCURACY dial
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
  if (event.key.toLowerCase() === 'e') {
    PN1.on = !PN1.on;
    computeAccelerations(simBodies, G);  // the rules changed THIS instant — re-aim
    E0 = totalEnergy(simBodies, G);      // authorized physics change — re-seal
    resetPerihelionInstrument();         // new universe, new ledger
    console.log(`1PN ${PN1.on ? 'ON — Einstein has entered the sim' : 'OFF — pure Newton'}`);
    return;
  }
  if (event.key.toLowerCase() === 'b') {
    BFIELD.on = !BFIELD.on;
    fieldLines.visible = BFIELD.on;             // the skeleton appears with the field
    console.log(`AUDIT field: ideal solar dipole ${BFIELD.on ? 'ON' : 'OFF'} — 5 nT at the 1 AU equator, 1/r³ falloff, moment ecliptic-south. MODEL dial, not the real Parker-spiral heliosphere.`);
    return;
  }
  if (event.code === 'Space') { paused = !paused; return; }   // .code, not .key — the key for
  // Mass surgery on the selected body: '-' halves, '=' doubles ('=' is the + key)
  if ((event.key === '-' || event.key === '=') && selected) {
    const b = simBodies[bodyMeshes.indexOf(selected)];
    b.mass *= (event.key === '=' ? 2 : 0.5);
    console.log(`AUDIT: mass surgery — ${b.name} ${event.key === '=' ? 'doubled' : 'halved'} ` +
      `to ${b.mass.toExponential(3)} Msun at day ${simDays.toFixed(1)}`);
    computeAccelerations(simBodies, G);  // forces changed THIS instant — everyone re-aims
    E0 = totalEnergy(simBodies, G);      // authorized change -> re-seal the baseline
    setCollapseVisual(selected, checkCollapse(b));
    return;
  }
  if (event.key.toLowerCase() === 'n') { spawnRogue(); return; }
  if (event.key === 'C') { spawnPolarDust(); return; }   // capital C: Shift held — the bouncers
  if (event.key === 'x') { spawnSmoke(0.49); return; }   // smoke: bound — ~50 AU and back
  if (event.key === 'X') { spawnSmoke(0.51); return; }   // Shift: past the knife-edge — gone
  if (event.key.toLowerCase() === 'c') { spawnDust(); return; }
  if (event.key.toLowerCase() === 'g') {              // M12b: the galaxy fabric
    GALAXY.on = !GALAXY.on;
    for (const m of bodyMeshes) m.visible = !GALAXY.on;
    fieldLines.visible = GALAXY.on ? false : BFIELD.on;
    sgrA.visible = sunSeat.visible = GALAXY.on;
    if (!GALAXY.on) { GAL_STARS.on = false; tracerCloud.visible = realCloud.visible = false; }
    selected = null; galaxyPick = null; panel.style.display = 'none';   // M12c: no stale readout across the mode switch
    if (!GALAXY.on) { clusterCloud.visible = false; clusterPick = null; clusterTrail.visible = false; }   // M12d/M12e
    console.log(`AUDIT: galaxy mode ${GALAXY.on ? 'ON — 1 unit = 1 kpc' : 'OFF — 1 unit = 1 AU'}. ` +
      `Solar sim continues underneath. phi(8.2 kpc) = ${galaxyPhi(8.2).toFixed(0)} (km/s)^2, ` +
      `dark halo ${GALAXY.haloOn ? 'ON' : 'OFF'}.`);
    return;
  }
  if (event.key.toLowerCase() === 'j') {              // M12c: stars on the sheet
    if (!GALAXY.on) { console.log('AUDIT: press g first — stars ride the galactic sheet.'); return; }
    GAL_STARS.on = !GAL_STARS.on;
    if (GAL_STARS.on) { seedGalaxyStars(HYG_SAMPLE); syncGalaxyStars(); }  // every switch-on re-straightens the spokes at t=0
    tracerCloud.visible = realCloud.visible = GAL_STARS.on;
    console.log(`AUDIT: galaxy stars ${GAL_STARS.on ? `ON — 4 spokes straight at t=0, 240 tracers + ${HYG_SAMPLE.length} real` : 'OFF'}. ` +
      `Sun's lap at 8.2 kpc = ${(2 * Math.PI * 8.2 / (galaxyVCirc(8.2) * KMS_TO_KPC_MYR)).toFixed(1)} Myr, ` +
      `dark halo ${GALAXY.haloOn ? 'ON' : 'OFF'}.`);
    return;
  }
  if (event.key.toLowerCase() === 'k') {              // M12d: the real halo
    if (!GALAXY.on) { console.log('AUDIT: press g first — clusters live at galactic scale.'); return; }
    if (!CLUSTERS.loaded) { loadClusters(); return; }
    clusterCloud.visible = !clusterCloud.visible;
    if (!clusterCloud.visible) { clusterPick = null; refreshClusterTrail(); }
    console.log(`AUDIT: globular clusters ${clusterCloud.visible ? 'shown' : 'hidden'} ` +
      `(${CLUSTERS.list.length} loaded from ${CLUSTERS.source}).`);
    return;
  }
  if (event.key.toLowerCase() === 'h') {              // M12b: dark matter, live
    GALAXY.haloOn = !GALAXY.haloOn;
    console.log(`AUDIT: dark halo ${GALAXY.haloOn ? 'ON' : 'OFF'} — ` +
      `phi(24.6 kpc) = ${galaxyPhi(24.6).toFixed(0)} (km/s)^2. Watch the outskirts.`);
    if (CLUSTERS.loaded) {
      console.log(`AUDIT: ${colourClusters()} clusters now unbound — futures changed mid-flight.`);
      if (clusterPick !== null) refreshClusterTrail();   // same cluster, new fate
    }
    return;
  }
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
let galaxyPick = null;            // M12c: sgrA / sunSeat, galaxy mode only
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

  // M12c FIX: Three.js raycasts INVISIBLE meshes — it tests layers, not
  // .visible. In galaxy mode every body mesh is hidden but still skewerable,
  // and the Sun's 0.279-unit sphere sits INSIDE Sgr A*'s 0.8-unit sphere at
  // the origin. That is why clicking the black hole reported 'Sun'.
  // Two rules now: filter by visibility, and swap the target list by mode.
  const targets = GALAXY.on ? galaxyMarkers : bodyMeshes.filter((m) => m.visible);
  const hits = raycaster.intersectObjects(targets, false);
  const hit = hits.length > 0 ? hits[0].object : null;

  if (GALAXY.on) { galaxyPick = hit; selected = null; }   // markers answer here
  else           { selected = hit; galaxyPick = null; }   // bodies answer there
  // M12d: the cluster cloud is Points — it needs a pick radius and reports
  // an index, not an object. A cluster hit wins over a marker hit.
  if (GALAXY.on && clusterCloud.visible) {
    raycaster.params.Points.threshold = 0.6;          // kpc
    const cHits = raycaster.intersectObject(clusterCloud, false);
    clusterPick = cHits.length > 0 ? cHits[0].index : null;
    if (clusterPick !== null) galaxyPick = null;
    refreshClusterTrail();
  } else { clusterPick = null; clusterTrail.visible = false; }

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
// Field lines used for the sky's skeleton
// Display only (CHEATS #7): shells, longitudes, truncation radius, and glow are
// chosen for eyes. The geometry is honest — every line is r = L·cos²(latitude),
// the exact shape dipoleTesla() enforces — but the physics never reads a vertex.
function makeFieldLines() {
  const group = new THREE.Group();
  const mat = new THREE.LineBasicMaterial({ color: 0x66ffcc, transparent: true, opacity: 0.35 });
  const R_TRUNC = 0.3;                          // AU — just outside the drawn Sun, so lines
  for (const L of [0.5, 0.8, 1.2, 1.8]) {       //   appear to enter its poles. 0.8 = the dust rail.
    const latMax = Math.acos(Math.sqrt(Math.min(1, R_TRUNC / L)));
    for (let p = 0; p < 8; p++) {               // eight longitudes out of infinity
      const phi = p * Math.PI / 4;
      const pts = [];
      for (let i = 0; i <= 64; i++) {
        const lat = -latMax + (2 * latMax * i) / 64;
        const r = L * Math.cos(lat) ** 2;       // the dipole line: r = L cos²(latitude)
        pts.push(eclToScene(r * Math.cos(lat) * Math.cos(phi),
                            r * Math.cos(lat) * Math.sin(phi),
                            r * Math.sin(lat)));
      }
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat));
    }
  }
  group.visible = BFIELD.on;                    // born matching the switch
  return group;
}
const fieldLines = makeFieldLines();
scene.add(fieldLines);

// Galaxy markers (M12b): Sgr A* at the center, the Sun's seat at 8.2 kpc.
// Sizes are display cheats (CHEATS #8) — at true scale both are sub-pixel.
const sgrA = new THREE.Mesh(new THREE.SphereGeometry(0.8, 24, 24), BLACK_HOLE_MAT);
sgrA.add(makeHorizonRing());
const sunSeat = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 16),
  new THREE.MeshBasicMaterial({ color: 0xffd24f }));
sunSeat.position.set(8.2, 0, 0);
sgrA.visible = sunSeat.visible = false;
scene.add(sgrA, sunSeat);
const galaxyMarkers = [sgrA, sunSeat];   // M12c: the only pickable things in galaxy mode
// ---------- M12d: the real halo — 147 globular clusters ----------
// POSITIONS ARE MEASURED (Harris 1996, 2010 ed., via VizieR; conversion
// validated against the catalogue's own Rgc column in clusterLab C2).
// COLOUR IS COMPUTED: red means this cluster's measured speed is greater
// than the escape speed of the galaxy AS CURRENTLY CONFIGURED. Press h and
// twenty-one real objects change their fate mid-flight (M12e).
const CLUSTERS = { loaded: false, list: [], source: null };
let clusterProvenance = null;
let clusterPick = null;

function parseHarrisTSV(text) {
  // VizieR TSV: '#' comments, then header / units / dashes, then rows.
  // M12e columns: ID,Name,Rsun,Rgc,X,Y,Z,Vr,Vlsr — same layout as the lab
  // snapshot data/harris_vr.tsv, so live and fallback parse identically.
  const lines = text.split('\n').filter((l) => l && !l.startsWith('#')).slice(3);
  const out = [];
  for (const line of lines) {
    const f = line.split('\t').map((s) => s.trim());
    const [id, name, rsun, rgc, X, Y, Z, vr, vlsr] = f;
    if (!rsun || !rgc || !X || !Y || !Z) continue;   // a few rows carry no position
    // Harris X/Y/Z are HELIOCENTRIC: X to the galactic centre, Y to
    // rotation, Z to the north pole. Our frame puts Sgr A* at the origin
    // and the Sun at +8.2 on X — receipted in clusterLab C2 (0.032 kpc).
    out.push({
      id: id || name,
      x: 8.2 - (+X), y: -(+Y), z: +Z,
      R: +rgc, rsun: +rsun,
      v: vlsr === '' ? null : Math.abs(+vlsr),   // line-of-sight, LSR frame (legacy)
      vr: vr === '' ? null : +vr,                // HELIOCENTRIC — the vector math's fuel
    });
  }
  return out;
}
// M12e: Gaia EDR3 mean proper motions, keyed by normalized name AND
// alternate name. pmRA already carries the cos(Dec) — gaiaLab G0 checked.
let gaiaProvenance = null;
const normName = (s) => (s || '').toUpperCase().replace(/\s+/g, '');
function parseGaiaPM(text) {
  const lines = text.split('\n').filter((l) => l && !l.startsWith('#')).slice(3);
  const map = new Map();
  for (const line of lines) {
    const [name, oname, ra, de, pmra, pmde] = line.split('\t').map((s) => s.trim());
    if (!ra || !de || !pmra || !pmde) continue;
    const rec = { ra: +ra, de: +de, pmra: +pmra, pmde: +pmde };
    map.set(normName(name), rec);
    if (oname) map.set(normName(oname), rec);
  }
  return map;
}
// The speed at which kinetic energy equals the depth of the well. This
// reads GALAXY.haloOn through galaxyPhi, so it re-answers when you press h.
function escapeSpeed(R) { return Math.sqrt(2 * Math.abs(galaxyPhi(R))); }

const clusterCloud = new THREE.Points(
  new THREE.BufferGeometry(),
  new THREE.PointsMaterial({ size: 5, sizeAttenuation: false,
    vertexColors: true, transparent: true, opacity: 0.95 }));
clusterCloud.visible = false;
scene.add(clusterCloud);
// M12e: the picked cluster's FUTURE, drawn — integrated live in the current
// halo. Bound = a closed rosette. Halo off = a straight goodbye.
const clusterTrail = new THREE.Line(
  new THREE.BufferGeometry(),
  new THREE.LineBasicMaterial({ color: 0x66e0d0, transparent: true, opacity: 0.85 }));
clusterTrail.visible = false;
scene.add(clusterTrail);
let clusterOrbitInfo = null;

function refreshClusterTrail() {
  const c = clusterPick !== null ? CLUSTERS.list[clusterPick] : null;
  if (!c || c.vx === undefined || !clusterCloud.visible) {
    clusterTrail.visible = false; clusterOrbitInfo = null; return;
  }
  clusterOrbitInfo = clusterOrbit(c);            // 6 Gyr, or first exit past 250 kpc
  const pts = clusterOrbitInfo.pts.map(([x, y, z]) => new THREE.Vector3(x, z, -y));
  clusterTrail.geometry.dispose();
  clusterTrail.geometry = new THREE.BufferGeometry().setFromPoints(pts);
  clusterTrail.visible = true;
}

// Scene axes: X = galactic X, Z = -galactic Y, Y = real galactic height.
// The sheet uses that same Y for potential DEPTH. Two meanings, one axis —
// confessed loudly in CHEATS #10.
function buildClusterCloud() {
  const n = CLUSTERS.list.length;
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const c = CLUSTERS.list[i];
    pos[i * 3] = c.x; pos[i * 3 + 1] = c.z; pos[i * 3 + 2] = -c.y;
  }
  const g = clusterCloud.geometry;
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeBoundingSphere();
}
// M12e: clusters MOVE now — positions repainted every frame. Same scene
// mapping as buildClusterCloud: X = sim x, Y(up) = real height z, Z = -sim y.
function syncClusterCloud() {
  const a = clusterCloud.geometry.attributes.position;
  if (!a) return;
  for (let i = 0; i < CLUSTERS.list.length; i++) {
    const c = CLUSTERS.list[i];
    a.setXYZ(i, c.x, c.z, -c.y);
  }
  a.needsUpdate = true;
}

function colourClusters() {
  const col = clusterCloud.geometry.attributes.color;
  if (!col) return 0;
  let unbound = 0;
  for (let i = 0; i < CLUSTERS.list.length; i++) {
    const c = CLUSTERS.list[i];
    if (c.vx !== undefined) {
      // Movers get the honest verdict: total energy in the CURRENT halo.
      // E = v^2/2 + phi(r) < 0 means held — same test as escape speed.
      const vk = Math.hypot(c.vx, c.vy, c.vz) / KMS_TO_KPC_MYR;   // km/s
      const r = Math.hypot(c.x, c.y, c.z);
      if (0.5 * vk * vk + galaxyPhi(r) < 0) col.setXYZ(i, 0.62, 0.78, 1.00);
      else { col.setXYZ(i, 1.00, 0.25, 0.20); unbound++; }
    } else if (c.v !== null) {
      // No proper motion: line-of-sight only. One slice cannot convict or
      // acquit (the M12e frame lesson) — muted colours say so.
      if (c.v > escapeSpeed(c.R)) col.setXYZ(i, 1.00, 0.55, 0.20);
      else col.setXYZ(i, 0.50, 0.62, 0.80);
    } else col.setXYZ(i, 0.45, 0.45, 0.50);      // no speed measured at all
  }
  col.needsUpdate = true;
  return unbound;
}
async function loadClusters() {
  const harrisQ = '?-source=VII/202/catalog'
    + '&-out=ID,Name,Rsun,Rgc,X,Y,Z,Vr,Vlsr&-out.max=200';
  const gaiaQ = '?-source=J/MNRAS/505/5978/tablea1'
    + '&-out=Name,OName,RAJ2000,DEJ2000,pmRA,pmDE&-out.max=300';
  progressBox.style.display = 'block';
  progressLabel.textContent = 'Collecting globular clusters » VizieR';
  progressFill.style.width = '25%';

  async function grab(q, fallback, minBytes, label) {
    try {
      const res = await fetch('/api/vizier' + q);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      if (text.length < minBytes) throw new Error(`short body, ${text.length} bytes`);
      return { text, source: 'VizieR live' };
    } catch (err) {
      console.log(`AUDIT: ${label} fetch failed (${err.message}) — using the shipped snapshot.`);
      return { text: fallback, source: 'shipped snapshot' };
    }
  }
  const harris = await grab(harrisQ, harrisVrSnapshot, 5000, 'Harris');
  progressFill.style.width = '55%';
  const gaia = await grab(gaiaQ, gaiaSnapshot, 8000, 'Gaia PM');
  progressFill.style.width = '80%';

  CLUSTERS.list = parseHarrisTSV(harris.text);
  CLUSTERS.source = harris.source;
  const pmMap = parseGaiaPM(gaia.text);
  let matched = 0;
  for (const c of CLUSTERS.list) {
    const pm = pmMap.get(normName(c.id));
    if (pm) { Object.assign(c, pm); matched++; }
  }
  const seeded = seedClusterVelocities(CLUSTERS.list);  // gaiaLab's pipeline, receipted
  GAL_CLUSTERS.list = CLUSTERS.list;
  GAL_CLUSTERS.on = seeded > 0;
  CLUSTERS.loaded = true;
  buildClusterCloud();
  const unbound = colourClusters();
  clusterCloud.visible = true;
  progressFill.style.width = '100%';
  progressLabel.textContent = `${CLUSTERS.list.length} clusters — ${seeded} in flight √`;
  setTimeout(() => { progressBox.style.display = 'none'; }, 1500);

  clusterProvenance = {
    source: `Harris catalogue (1996, 2010 ed.) — ${harris.source}`,
    endpoint: 'https://vizier.cds.unistra.fr/viz-bin/asu-tsv?-source=VII/202/catalog',
    frame: 'galactocentric; Sgr A* at origin, Sun at +8.2 kpc on X',
    units: 'kpc, km/s (Vr heliocentric feeds the 3D pipeline; Vlsr kept for the record)',
    session: new Date().toISOString(),
    clusters: CLUSTERS.list.length,
    withVelocity: CLUSTERS.list.filter((c) => c.v !== null).length,
    bytes: harris.text.length,
    sha256: await sha256Hex(harris.text),
  };
  gaiaProvenance = {
    source: `Gaia EDR3 cluster proper motions (Vasiliev & Baumgardt 2021) — ${gaia.source}`,
    endpoint: 'https://vizier.cds.unistra.fr/viz-bin/asu-tsv?-source=J/MNRAS/505/5978/tablea1',
    pipeline: 'lab/gaiaLab.mjs G0-G5b: bridge 4.7405, round trip 6e-9, dt-halving 4.00',
    session: new Date().toISOString(),
    matched, seeded,
    bytes: gaia.text.length,
    sha256: await sha256Hex(gaia.text),
  };
  console.log('Cluster provenance:', clusterProvenance);
  console.log('Gaia provenance:', gaiaProvenance);
  console.log(`AUDIT: ${CLUSTERS.list.length} clusters, ${matched} matched to Gaia, ` +
    `${seeded} carrying full 3D velocities — IN FLIGHT on the galaxy clock. ` +
    `${unbound} unbound with the dark halo ${GALAXY.haloOn ? 'ON' : 'OFF'}. Click one for its future.`);
}
// M12c: two star clouds riding the well. Tracers = synthetic disk sample
// (positions invented, motion real physics). Real = HYG sample at true
// galactocentric positions. Both confessed in CHEATS #9.
function makeStarCloud(count, color, size) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({
    color, size, sizeAttenuation: false, transparent: true, opacity: 0.9 }));
  p.visible = false;
  return p;
}
const tracerCloud = makeStarCloud(240, 0x9fc4ff, 3);
const realCloud   = makeStarCloud(HYG_SAMPLE.length, 0xffd24f, 6);
scene.add(tracerCloud, realCloud);

// Lift 0.15 units so the dots clear the wireframe instead of z-fighting it.
function syncGalaxyStars() {
  const put = (cloud, list) => {
    const a = cloud.geometry.attributes.position;
    for (let i = 0; i < list.length; i++) {
      const s = list[i];
      a.setXYZ(i, s.x, galaxyDepth(Math.hypot(s.x, s.y)) + 0.15, -s.y);
    }
    a.needsUpdate = true;
  };
  put(tracerCloud, GAL_STARS.tracers);
  put(realCloud, GAL_STARS.real);
}

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
  console.log(`AUDIT: rogue spawn — ${body.name} injected at day ${simDays.toFixed(1)} ` +
    `(${body.mass_msun.toExponential(3)} Msun, ${body.radius_km} km)`);

  computeAccelerations(simBodies, G);  // everyone re-aims, newcomer included
  E0 = totalEnergy(simBodies, G);      // new member -> new ledger baseline
}

// Charged dust factory (M10b) — same skeleton as spawnRogue, plus the one
// field the magnetic turn actually reads: qm, the steering sensitivity.
let dustCount = 0;
function spawnDust() {
  dustCount++;
  const r = 0.8;                              // AU — the dipole made "close in" literal:
                                              // |B| here ≈ 9.8 nT → ~25-day curls you can see
  const theta = Math.random() * Math.PI * 2;  // random bearing on the ecliptic

  // Circular-orbit speed: sqrt(G·M/r) is the entire secret of orbiting —
  // move sideways exactly fast enough to keep missing the thing pulling you.
  const vCirc = Math.sqrt(G * sunSim.mass / r);

  const body = {                              // shaped like a bodies.json record,
    name: `Dust-${dustCount}`,                // so makeBodyMesh accepts it happily
    mass_msun: 1e-12,                         // a speck — the roster barely feels it
    radius_km: 3000,                          // asteroid-sized, so the dot stays visible
    qm: 300,                                  // steering sensitivity, C/kg — sandbox-declared
    color: '#4fd8ff',                         // electric cyan: charged things get cold light
    position_au: [ sunSim.pos[0] + r * Math.cos(theta),
                   sunSim.pos[1] + r * Math.sin(theta), 0 ],
    velocity_au_day: [ sunSim.vel[0] - vCirc * Math.sin(theta),   // perpendicular to the
                       sunSim.vel[1] + vCirc * Math.cos(theta),   // radius = sideways,
                       0 ],                                       // riding along with the Sun
  };

  // Both worlds get told, same index, same instant — and the PHYSICS twin
  // must carry qm, or the field can never grip it. This is THE line
  // M10b hangs on: a dust grain without qm is just a slow rogue.
  simBodies.push({ name: body.name, mass: body.mass_msun, radius_km: body.radius_km,
    qm: body.qm,
    pos: [...body.position_au], vel: [...body.velocity_au_day], acc: [0, 0, 0] });
  const mesh = makeBodyMesh(body);
  bodyMeshes.push(mesh);
  scene.add(mesh);
  console.log(`AUDIT: dust spawn — ${body.name} injected at day ${simDays.toFixed(1)} ` +
    `(${body.mass_msun.toExponential(3)} Msun, ${body.radius_km} km, qm ${body.qm} C/kg)`);
      const Bloc = dipoleTesla(body.position_au, sunSim.pos);   // instrument beats memory:
      const Bmag = Math.hypot(Bloc[0], Bloc[1], Bloc[2]);       // the LOCAL grip, in Tesla
      console.log(`AUDIT dust field: local |B| ${(Bmag * 1e9).toFixed(2)} nT → ` +
        `predicted loop ${(2 * Math.PI / (body.qm * Bmag * 86400)).toFixed(1)} days ` +
        `(field ${BFIELD.on ? 'ON' : 'OFF'})`);

  computeAccelerations(simBodies, G);  // everyone re-aims, newcomer included
  E0 = totalEnergy(simBodies, G);      // new member -> new ledger baseline
}

// Polar dust (M10c) — the same speck, launched with CLIMB: half its orbital
// speed points along the field line (ecliptic north), pitch ≈ 63°. It helixes
// up the 0.8 rail, feels the squeeze, and BOUNCES — the mirror, live in the
// sky. qm 1000 keeps the helix tight and adiabatic (gyro-loop ~7.4 d at spawn;
// resolution floor for qm 1000 is r ≈ 0.41 AU — it never goes near it).
// Measured in lab/polarBounceLab.mjs: mirrors at ±16° latitude, ~160-day shuttle.
let polarCount = 0;
function spawnPolarDust() {
  polarCount++;
  const r = 0.8;                              // AU — the same home rail as Dust
  const theta = Math.random() * Math.PI * 2;
  const vCirc = Math.sqrt(G * sunSim.mass / r);

  const body = {
    name: `Polar-${polarCount}`,
    mass_msun: 1e-12,
    radius_km: 3000,
    qm: 1000,                                 // stiffer steering than Dust's 300
    color: '#7dff9a',                         // aurora green: the bouncers
    position_au: [ sunSim.pos[0] + r * Math.cos(theta),
                   sunSim.pos[1] + r * Math.sin(theta), 0 ],
    velocity_au_day: [ sunSim.vel[0] - vCirc * Math.sin(theta),
                       sunSim.vel[1] + vCirc * Math.cos(theta),
                       sunSim.vel[2] + 0.5 * vCirc ],   // the CLIMB, along the line
  };

  simBodies.push({ name: body.name, mass: body.mass_msun, radius_km: body.radius_km,
    qm: body.qm,
    pos: [...body.position_au], vel: [...body.velocity_au_day], acc: [0, 0, 0] });
  const mesh = makeBodyMesh(body);
  bodyMeshes.push(mesh);
  scene.add(mesh);

  const Bloc = dipoleTesla(body.position_au, sunSim.pos);
  const Bmag = Math.hypot(Bloc[0], Bloc[1], Bloc[2]);
  console.log(`AUDIT: polar spawn — ${body.name} at day ${simDays.toFixed(1)}, qm ${body.qm} C/kg, ` +
    `pitch 63° (climb = vCirc/2). Local |B| ${(Bmag * 1e9).toFixed(2)} nT, ` +
    `gyro-loop ${(2 * Math.PI / (body.qm * Bmag * 86400)).toFixed(1)} d. ` +
    `Watch the bounce: ±16° latitude, ~160-day shuttle (field ${BFIELD.on ? 'ON' : 'OFF'}).`);

  computeAccelerations(simBodies, G);  // everyone re-aims, newcomer included
  E0 = totalEnergy(simBodies, G);      // new member -> new ledger baseline
}

// Smoke (M11) — dust born from Earth at Earth's speed: W3's exact setup, live.
// beta 0.49 climbs to ~50 AU and falls back; beta 0.51 never returns.
// No qm: the dipole cannot grip it — only light pushes. (Diagram-1 lesson.)
let smokeCount = 0;
function spawnSmoke(beta) {
  smokeCount++;
  const body = {
    name: `Smoke-${smokeCount}`,
    mass_msun: 1e-12,                         // a speck — the roster barely feels it
    radius_km: 3000,                          // asteroid-sized, so the dot stays visible
    beta,                                     // push/pull ratio — THE line M11 hangs on
    color: '#ffd24f',                         // sunlit gold: the pushed ones
    position_au: [ earthSim.pos[0], earthSim.pos[1], earthSim.pos[2] + 0.02 ],
    velocity_au_day: [ ...earthSim.vel ],     // the parent's speed
  };

  simBodies.push({ name: body.name, mass: body.mass_msun, radius_km: body.radius_km,
    beta: body.beta,
    pos: [...body.position_au], vel: [...body.velocity_au_day], acc: [0, 0, 0] });
  const mesh = makeBodyMesh(body);
  bodyMeshes.push(mesh);
  scene.add(mesh);

  const a = (1 - beta) / (1 - 2 * beta);      // semi-major axis if bound (release near 1 AU)
  console.log(`AUDIT: smoke spawn — ${body.name} at day ${simDays.toFixed(1)}, beta ${beta}. ` +
    (beta < 0.5
      ? `Bound: apoapsis ~${(2 * a - 1).toFixed(0)} AU, round trip ~${Math.round(365.25 * Math.sqrt(a ** 3 / (1 - beta)))} days.`
      : `Past the knife-edge (beta >= 1/2): escaping — it never comes back.`));

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
// Lap instrument (M10d): per-step zero-crossing with a straight-line
// sub-step stamp. A perihelion is a MINIMUM (flat bottom — needed the
// M8f parabola); a lap is a CROSSING (full slope — a line through the
// two samples that straddle zero lands on it). Same disease, smaller dose.
function checkLap() {
  const offset = wrap(heliocentricAngle() - startAngle); // radians past the start line
  if (simDays - lastLapDay > 180 && prevOffset < 0 && offset >= 0) {
    const f = prevOffset / (prevOffset - offset);  // fraction of the step where the line hits zero
    const lapDay = simDays - (1 - f) * DT;         // true crossing time, between the two samples
    console.log(`The pale blue dot has completed another orbit around the Sun! ` +
      `${(lapDay - lastLapDay).toFixed(1)} simulated days since the last lap.`);
    lastLapDay = lapDay;                           // stamp the TRUE time — the M8f lesson
  }
  prevOffset = offset;
}

// Perihelion instrument (M8a): stamp Mercury's Sun-relative bearing at each
// closest approach. Stamp-to-stamp drift IS the precession we're hunting.
const mercurySim = simBodies.find((body) => body.name === 'Mercury');
const mercurySunDistance = () => Math.hypot(
  mercurySim.pos[0] - sunSim.pos[0],
  mercurySim.pos[1] - sunSim.pos[1],
  mercurySim.pos[2] - sunSim.pos[2]
);
const mercuryAngle = () =>
  Math.atan2(mercurySim.pos[1] - sunSim.pos[1],
             mercurySim.pos[0] - sunSim.pos[0]);

const ARCSEC_PER_RAD = 206264.8;   // one radian, expressed in arcseconds
const DAYS_PER_CENTURY = 36525;    // Julian century, in days

let periRPrev2 = Infinity, periRPrev = Infinity; // Infinity = trigger disarmed
let periAngleLast = null;   // bearing at the previous stamp
let periFirstDay = null;    // simDays at the first stamp — the clock starts there
let periDriftTotal = 0;     // accumulated drift, radians
let periLaps = 0;           // laps measured since the reference stamp
let periHud = 'Mercury perihelion: awaiting first laps';
let periLRLLast = null, periLRLDrift = 0;
let periRel2 = null, periRel1 = null;  // M8f — the last two Sun-relative positions: the Oracle's memory, shifted in lockstep with r

function checkPerihelion() {
  handleContacts();                      // M9 — surfaces exist; per-STEP, same honesty rule as the instrument
  const rx = mercurySim.pos[0] - sunSim.pos[0],
        ry = mercurySim.pos[1] - sunSim.pos[1],
        rz = mercurySim.pos[2] - sunSim.pos[2];
  const r = Math.hypot(rx, ry, rz);
  // Valley test: was falling, now rising — the bottom was one step ago.
  // The isFinite guard keeps the trigger disarmed for two steps after any
  // reset, so a mid-orbit rebirth can't fake a perihelion.
  if (Number.isFinite(periRPrev2) && periRPrev2 > periRPrev && periRPrev <= r) {
    // M8f — the de-biased stamp. A parabola through the last three r samples
    // finds the TRUE minimum (offset s from the middle sample, in steps);
    // the same parabola interpolates the position there. lag ≡ 0: the
    // schedule side-channel is closed (docs/stamp-bias-verdict.md).
    const den = periRPrev2 - 2 * periRPrev + r;
    const s = den !== 0 ? (periRPrev2 - r) / (2 * den) : 0;
    const ix = periRel1[0] + (rx - periRel2[0]) / 2 * s
             + (periRel2[0] - 2 * periRel1[0] + rx) / 2 * s * s;
    const iy = periRel1[1] + (ry - periRel2[1]) / 2 * s
             + (periRel2[1] - 2 * periRel1[1] + ry) / 2 * s * s;
    const angle = Math.atan2(iy, ix);
      const vx=mercurySim.vel[0]-sunSim.vel[0], vy=mercurySim.vel[1]-sunSim.vel[1], vz=mercurySim.vel[2]-sunSim.vel[2];
    const rr=Math.hypot(rx,ry,rz), gmS=G*sunSim.mass;
    const hx=ry*vz-rz*vy, hy=rz*vx-rx*vz, hz=rx*vy-ry*vx;
    const ex=(vy*hz-vz*hy)/gmS-rx/rr, ey=(vz*hx-vx*hz)/gmS-ry/rr, ez=(vx*hy-vy*hx)/gmS-rz/rr;
    if (periLRLLast) {
      const P=periLRLLast, cx=P[1]*ez-P[2]*ey, cy=P[2]*ex-P[0]*ez, cz=P[0]*ey-P[1]*ex;
      periLRLDrift += Math.sign(cx*hx+cy*hy+cz*hz)*Math.atan2(Math.hypot(cx,cy,cz), P[0]*ex+P[1]*ey+P[2]*ez);
    }
    periLRLLast = [ex,ey,ez];
    if (periAngleLast === null) {
      periFirstDay = simDays;               // first stamp = reference, not a lap
    } else {
      periDriftTotal += wrap(angle - periAngleLast);  // wrap() eats the ±π seam
      periLaps++;
      const elapsed = simDays - periFirstDay;
      const rate = (periDriftTotal * ARCSEC_PER_RAD / elapsed) * DAYS_PER_CENTURY;
      const lrlRate = (periLRLDrift * ARCSEC_PER_RAD / elapsed) * DAYS_PER_CENTURY;
      periHud = `Mercury perihelion drift: ${rate.toFixed(1)}″/century over ${periLaps} laps` + `\nLRL witness: ${lrlRate.toFixed(1)}″/century`;
      if (periLaps <= 3 || periLaps % 25 === 0) {
        console.log(`Perihelion #${periLaps} — day ${simDays.toFixed(1)}, ${periHud}`);
      }
    }
    periAngleLast = angle;
  }
  periRPrev2 = periRPrev;
  periRPrev = r;
  periRel2 = periRel1;              // the oracle's memory shifts with the
  periRel1 = [rx, ry, rz];          // valley trigger's — same clock, always
}

function resetPerihelionInstrument() {
  periRPrev2 = Infinity; periRPrev = Infinity;  // re-arm the valley trigger
  periAngleLast = null;  periFirstDay = null;   // old epoch's stamps are void
  periDriftTotal = 0;    periLaps = 0;          // fresh ledger for the new epoch
  periLRLLast = null;  periLRLDrift = 0;    // the witness forgets the old universe too
    periRel2 = null;  periRel1 = null;        // and so does the oracle
  periHud = 'Mercury perihelion: awaiting first laps';  
}

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
  resetPerihelionInstrument();          // ONE reset policy, ONE enforcement point —
                                        // the inline copy missed the LRL state. Never again.
  computeAccelerations(simBodies, G);   // forces changed — everyone re-aims
  E0 = totalEnergy(simBodies, G);       // authorized change — re-seal the baseline
  console.log('Sim reborn from live Horizons epoch.');
}

// Schwarzschild equation
function schwarzschildRadiusKm(massMsun) {
  return 2.95 * massMsun;    // r_s of the Sun is 2.95 km; linear in mass
}
// No more light can leave
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

// M9 — contact handler - runs all physics. Momentum survives the
// crash; kinetic energy dies in it, and the AUDIT line confesses exactly
// how much before the baseline re-seals.
function handleContacts() {
  const hits = findContacts(simBodies, KM_PER_AU);
  if (hits.length === 0) return;
  const [i, j] = hits[0];                    // one crash at a time; rescan after
  const [si, ei] = simBodies[i].mass >= simBodies[j].mass ? [i, j] : [j, i];
  const survivor = simBodies[si], eaten = simBodies[ei];
  const eBefore = totalEnergy(simBodies, G);
  mergeBodies(survivor, eaten);
  if (selected === bodyMeshes[ei]) selected = null;   // don't inspect a ghost
  scene.remove(bodyMeshes[ei]);
  bodyMeshes.splice(ei, 1);                  // BOTH arrays, SAME index — the
  simBodies.splice(ei, 1);                   // body<->mesh twin coupling is positional
  const eAfter = totalEnergy(simBodies, G);
  console.log(`AUDIT: contact merge — ${survivor.name} absorbed ${eaten.name} ` +
    `at day ${simDays.toFixed(1)}. New mass ${survivor.mass.toExponential(3)} Msun, ` +
    `radius ${survivor.radius_km.toFixed(0)} km, KE destroyed ${(eBefore - eAfter).toExponential(2)}.`);
  E0 = eAfter;                               // authorized change — re-seal AFTER confessing
  const sIdx = simBodies.indexOf(survivor);
  setCollapseVisual(bodyMeshes[sIdx], checkCollapse(survivor));  // heavier now — horizon check
  handleContacts();                          // indices shifted; rescan fresh
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
  const blocks = [];

  if (sessionProvenance) {
    blocks.push(
      `SOURCE   ${sessionProvenance.source}\n` +
      `FRAME    ${sessionProvenance.frame}\n` +
      `SESSION  ${sessionProvenance.session}\n\n` +
      sessionProvenance.bodies.map(r =>
        `${r.body.padEnd(8)} cmd=${r.command}  ${r.epoch}  ` +
        `sha256=${r.sha256.slice(0, 12)}…  ${r.parsed}`
      ).join('\n'));
  } else {
    blocks.push('SOLAR    no live fetch this session — shipped snapshot (bodies.json).');
  }
  // M12e: the THIRD dataset — Gaia proper motions. Same rule as M12d: an
  // absent record is itself a fact worth writing down.
  if (gaiaProvenance) {
    blocks.push(
      `SOURCE   ${gaiaProvenance.source}\n` +
      `PIPELINE ${gaiaProvenance.pipeline}\n` +
      `SESSION  ${gaiaProvenance.session}\n\n` +
      `matched  ${gaiaProvenance.matched} of 145, ${gaiaProvenance.seeded} seeded with 3D velocity\n` +
      `bytes    ${gaiaProvenance.bytes}\n` +
      `sha256=${gaiaProvenance.sha256.slice(0, 12)}…  OK`);
  } else {
    blocks.push('GAIA PMs not loaded this session — press k in galaxy mode.');
  }

  // M12d: the catalogue is a SECOND dataset and gets its own block. The old
  // panel knew only about Horizons, so loading clusters live still printed
  // "no live data" — a witness telling half the truth.
  if (clusterProvenance) {
    blocks.push(
      `SOURCE   ${clusterProvenance.source}\n` +
      `FRAME    ${clusterProvenance.frame}\n` +
      `UNITS    ${clusterProvenance.units}\n` +
      `SESSION  ${clusterProvenance.session}\n\n` +
      `clusters ${clusterProvenance.clusters} parsed, ` +
      `${clusterProvenance.withVelocity} with measured speed\n` +
      `bytes    ${clusterProvenance.bytes}\n` +
      `sha256=${clusterProvenance.sha256.slice(0, 12)}…  OK`);
  } else {
    blocks.push('CLUSTERS not loaded this session — press k in galaxy mode.');
  }

  provPanel.textContent = blocks.join('\n\n' + '-'.repeat(46) + '\n\n');
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
  progressLabel.textContent = 'NASA JPL was synchronized √';
  setTimeout(() => { progressBox.style.display = 'none'; }, 1500);   // it never stood down before
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
  // M12d: one bundle, both datasets, nulls where a source was never touched.
  // An absent record is itself a fact worth writing down.
  if (!sessionProvenance && !clusterProvenance) {
    console.log('AUDIT: nothing to download — no live data fetched this session.');
    return;
  }
  const bundle = {
    generated: new Date().toISOString(),
    solarSystem: sessionProvenance,
    globularClusters: clusterProvenance,
    gaiaProperMotions: gaiaProvenance,
  };
  const blob = new Blob([JSON.stringify(bundle, null, 2)],
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
    checkPerihelion();                     // per-STEP instrument — this line was the missing hook
    checkLap();                            // per-STEP, same honesty rule
    carry -= DT;
  }
  syncMeshes();                                // simulation space -> screen
  sunlight.position.copy(sunMesh.position);    // the Sun moves; its light follows
  fieldLines.position.copy(sunMesh.position);  // the field lines ride the magnet

  const drift = (totalEnergy(simBodies, G) - E0) / Math.abs(E0);
  hud.textContent = `${GALAXY.on ? `GALAXY — 1 unit = 1 kpc — dark halo ${GALAXY.haloOn ? 'ON' : 'OFF'}\n` : ''}Day ${Math.floor(simDays)} — ${timeScale} d/s${paused ? '  [paused]' : ''}\nField: ${BFIELD.on ? 'dipole ON' : 'off'}\nEnergy drift: ${drift.toExponential(2)}\n${periHud}`;



  if (selected) {
    const b = simBodies[bodyMeshes.indexOf(selected)];   // mesh -> its physics twin
    const rSun = Math.hypot(b.pos[0] - sunSim.pos[0], b.pos[1] - sunSim.pos[1], b.pos[2] - sunSim.pos[2]);
    const v = Math.hypot(...b.vel) * KM_PER_AU / 86400;  // AU/day -> km/s
    panel.textContent = `${b.name}\n` +
      `mass: ${b.mass.toExponential(2)} M☉  (≈ ${(b.mass * 1.989e30).toExponential(2)} kg)\n` +
      `from Sun: ${rSun.toFixed(2)} AU\n` +
      `speed: ${v >= 1 ? v.toFixed(1) + ' km/s' : (v * 1000).toFixed(1) + ' m/s'}\n` +
      `r_s: ${schwarzschildRadiusKm(b.mass).toFixed(4)} km` +
      (b.qm ? `\nqm: ${b.qm} C/kg — charged` : '') +
      (b.beta ? `\nbeta: ${b.beta} — sunlit` : '') +
      (b.collapsed ? '  — COLLAPSED' : '');
    panel.style.display = 'block';
  } else {
    panel.style.display = 'none';
  }
// M12c: the markers answer for themselves, in the galaxy's own units —
  // no AU, no days. Clicking the Sun's seat reports what the well DEMANDS
  // of anything sitting there; press h and the same click reads different.
// M12f: the debt is paid — the mass is IN. The readout is the inner
  // rotation curve: FALLING toward the hole (Kepler) beside the RISING
  // curve a hole-less center would give. Numbers from galaxyVCircInner,
  // the unclamped instrument — CHEATS #12; receipted in lab/bhLab.mjs.
  if (galaxyPick === sgrA) {
    const w = (pc) => galaxyVCircInner(pc / 1000, true).toFixed(0);
    const wo = (pc) => galaxyVCircInner(pc / 1000, false).toFixed(0);
    panel.textContent = `Sgr A* — the galactic center\n` +
      `mass: ${GALAXY.MBH.toExponential(2)} M☉ — IN the potential (M12f)\n` +
      `r_s: ${schwarzschildRadiusKm(GALAXY.MBH).toExponential(3)} km\n` +
      `inner curve, km/s (with hole | without):\n` +
      `  1 pc: ${w(1)} | ${wo(1)}    3 pc: ${w(3)} | ${wo(3)}    10 pc: ${w(10)} | ${wo(10)}\n` +
      `falling vs rising — Keplerian inside 8.6 pc (S2 clock: B1)\n` +
      `drawn at 0.8 kpc — CHEATS #8; inner readout — CHEATS #12`;
    panel.style.display = 'block';
  } else if (galaxyPick === sunSeat) {
    const vc = galaxyVCirc(8.2);
    panel.textContent = `The Sun's seat\n` +
      `R: 8.20 kpc from Sgr A*\n` +
      `circular speed: ${vc.toFixed(1)} km/s\n` +
      `lap: ${(2 * Math.PI * 8.2 / (vc * KMS_TO_KPC_MYR)).toFixed(1)} Myr\n` +
      `dark halo: ${GALAXY.haloOn ? 'ON' : 'OFF'}`;
    panel.style.display = 'block';
  }
// M12e: a real object gives its own verdict — now with its whole future.
  // Press h: the SAME cluster re-answers with a new fate.
  if (clusterPick !== null && CLUSTERS.list[clusterPick]) {
    const c = CLUSTERS.list[clusterPick];
    if (c.vx !== undefined) {
      const r = Math.hypot(c.x, c.y, c.z);
      const vk = Math.hypot(c.vx, c.vy, c.vz) / KMS_TO_KPC_MYR;
      const bound = 0.5 * vk * vk + galaxyPhi(r) < 0;
      const o = clusterOrbitInfo;
      panel.textContent = `${c.id} — globular cluster, IN FLIGHT\n` +
        `r: ${r.toFixed(1)} kpc    height z: ${c.z.toFixed(1)} kpc\n` +
        `speed |v3D|: ${vk.toFixed(1)} km/s  (Gaia + Harris, receipted)\n` +
        `escape here: ${escapeSpeed(r).toFixed(1)} km/s  (halo ${GALAXY.haloOn ? 'ON' : 'OFF'})\n` +
        `verdict: ${bound ? 'bound' : 'UNBOUND — this one is leaving'}\n` +
        (o ? (o.left ? `future: crosses 250 kpc — no return`
                     : `future: peri ${o.rmin.toFixed(1)} / apo ${o.rmax.toFixed(1)} kpc — the trail`)
           : '');
      panel.style.display = 'block';
    } else {
      const esc = escapeSpeed(c.R);
      panel.textContent = `${c.id} — globular cluster\n` +
        `Rgc: ${c.R.toFixed(1)} kpc    height z: ${c.z.toFixed(1)} kpc\n` +
        (c.v === null ? `line-of-sight speed: not measured\n`
                      : `measured |Vlsr|: ${c.v.toFixed(1)} km/s (no proper motion — sits still, honestly)\n`) +
        `escape speed here: ${esc.toFixed(1)} km/s  (halo ${GALAXY.haloOn ? 'ON' : 'OFF'})\n` +
        (c.v === null ? `verdict: unknown — no velocity in the catalogue`
         : c.v > esc  ? `verdict: line-of-sight already exceeds escape`
                      : `verdict: not decidable from one slice`);
      panel.style.display = 'block';
    }
  }
if (GALAXY.on && (GAL_STARS.on || GAL_CLUSTERS.on)) {   // M12c: the disk turns; M12e: the halo flies
    if (!paused) stepGalaxyStars(real);
    if (GAL_STARS.on) syncGalaxyStars();
    if (GAL_CLUSTERS.on && clusterCloud.visible) { syncClusterCloud(); colourClusters(); }
    hud.textContent += `\nGalaxy clock: ${GAL_STARS.myr.toFixed(0)} Myr — Sun's lap 217.1 Myr`;
  }
  if (GALAXY.on) updateGalaxyFabric(fabric);
  else updateFabric(fabric, simBodies, G, trueScale);
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