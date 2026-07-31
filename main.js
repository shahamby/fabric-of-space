import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildSimBodies, G, loadBodyMeshes } from './bodies.js';
import { eclToScene, KM_PER_AU, makeBodyMesh } from './bodyMesh.js';
import { makeFabric, updateFabric, updateGalaxyFabric, galaxyDepth } from './fabric.js';
import { computeAccelerations, dipoleTesla, findContacts, leapfrogStep, mergeBodies, PN1, totalEnergy, BFIELD, GALAXY, galaxyPhi, GAL_STARS, seedGalaxyStars, stepGalaxyStars, galaxyVCirc, KMS_TO_KPC_MYR, GAL_CLUSTERS, seedClusterVelocities, clusterOrbit, galaxyVCircInner } from './physics.js';
import { HYG_SAMPLE } from './hygSample.js';
import harrisVrSnapshot from './data/harris_vr.tsv?raw';  // M12e: Harris incl. heliocentric Vr
import gaiaSnapshot from './data/gaia_pm.tsv?raw';        // M12e: Gaia EDR3 proper motions
import cepheidSnapshot from './data/cepheids.tsv?raw';    // M12h: the disk's body
import mrozSnapshot from './data/mroz_curve.txt?raw';     // M12i: the sky's own curve
import bodiesSnapshot from './data/bodies.json?raw';       // A1.1: the solar epoch, as BYTES (bodies.js imports the parsed object; provenance needs the file)
import { makeStarfield } from './starfield.js';
import { LIGHT, schwarzschildRadius } from './physics.js';   // W1: c declared. W2a: r_s = 2GM/c^2

// ---------- A1: hosted mode ----------
// The dev server carries the CORS proxies (vite.config.js). A built bundle
// served from a static host has no /api/* to proxy through — a STRUCTURAL
// limit, not a bug, so say so instead of leaking an HTTP code at a visitor.
// Nothing is lost but freshness: every catalog is compiled into this page by
// the ?raw imports above, so all 773 Cepheids, 145 clusters and the full
// solar system are here offline. import.meta.env.PROD is true in a build,
// false under `npm run dev`.
const HOSTED = import.meta.env.PROD;
const LIVE_OFF = 'hosted build — no CORS proxy here, so live catalogs are ' +
  'unreachable; running on the snapshots compiled into this page';
const fetchNote = (err) => (HOSTED ? LIVE_OFF : err.message);
if (HOSTED) {
  console.log(`AUDIT: ${LIVE_OFF}. Everything else is fully live — ` +
    `the integrator, the fabric, the instruments.`);
  const notice = document.createElement('div');   // A1.1: say it on SCREEN, once, dismissibly
  notice.style.cssText =
    'position:fixed; top:84px; left:50%; transform:translateX(-50%); max-width:540px;' +
    'background:rgba(8,10,14,0.92); border:1px solid #3a3f4a; border-radius:6px; z-index:20;' +
    'color:#9fd; font:12px/1.55 monospace; padding:10px 14px; cursor:pointer;';
  notice.textContent =
    'Hosted build — this page carries its own data: the full solar system, ' +
    '145 globular clusters, 773 measured Cepheids. Live catalogue fetches need ' +
    'the dev server, so they fall back to these snapshots. Press P for their checksums,' +
    ' or ? for the controls.' +
    '\n\n[click to dismiss]';
  notice.style.whiteSpace = 'pre-wrap';
  notice.addEventListener('click', () => notice.remove());
  document.body.append(notice);        // module scripts are deferred — body exists
}

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

// ---------- A1.1: the compiled snapshots have provenance too ----------
// This bundle CARRIES its data (the ?raw imports above). On a hosted build
// nothing is fetched, so the panel used to report five absences — true, and
// useless, while 773 Cepheids sat inside the page. Hash what is actually
// here, once at boot, through the same crypto path the live fetches use.
// Receipt: lab/snapshotLab.mjs hashes the same files on disk; the browser's
// digits must match byte for byte. .gitattributes pins these files to LF so
// the answer cannot depend on which OS checked the repo out.
const SNAPSHOTS = {
  solar:    { file: 'data/bodies.json',    text: bodiesSnapshot,
              what: 'NASA/JPL Horizons state vectors, frozen at build time' },
  gaia:     { file: 'data/gaia_pm.tsv',    text: gaiaSnapshot,
              what: 'Gaia EDR3 cluster proper motions (Vasiliev & Baumgardt 2021)' },
  clusters: { file: 'data/harris_vr.tsv',  text: harrisVrSnapshot,
              what: 'Harris globular cluster catalogue (1996, 2010 ed.)' },
  cepheids: { file: 'data/cepheids.tsv',   text: cepheidSnapshot,
              what: 'OGLE Cepheids — the disk\'s body' },
  mroz:     { file: 'data/mroz_curve.txt', text: mrozSnapshot,
              what: 'Mroz+ 2019 measured rotation curve, published per-star' },
};
let snapshotsHashed = false;
(async () => {
  for (const s of Object.values(SNAPSHOTS)) {
    s.bytes = new TextEncoder().encode(s.text).length;
    try { s.sha256 = await sha256Hex(s.text); }
    catch { s.sha256 = null; }        // no secure context — say so, never throw
  }
  snapshotsHashed = true;
  console.log('AUDIT: compiled snapshots hashed — ' + Object.entries(SNAPSHOTS)
    .map(([k, s]) => `${k} ${s.bytes}B ${s.sha256 ? s.sha256.slice(0, 12) : 'NO-HASH'}`)
    .join(' | ') + '. Press P for the full record.');
})();

// One honest block for a dataset with no live record this session.
function compiledBlock(label, key, hint) {
  const s = SNAPSHOTS[key];
  if (!snapshotsHashed) return `${label} compiled snapshot — hashing, press P again.`;
  return `${label} COMPILED SNAPSHOT — carried inside this page, no fetch\n` +
    `SOURCE   ${s.what}\n` +
    `FILE     ${s.file}\n` +
    `bytes    ${s.bytes}\n` +
    (s.sha256 ? `sha256=${s.sha256.slice(0, 12)}…  OK` : 'sha256   unavailable — page is not in a secure context') +
    (hint ? `\n${hint}` : '');
}

// ---------- A2: the legend ----------
// Wall 2: main.js bound 24 actions and the README documented 10, so the
// whole galaxy tier was undiscoverable to anyone but its author. KEYS is
// the SINGLE source of truth for what this app can do. lab/legendLab.mjs
// reads the key handlers out of this same file and demands the two lists
// agree — bind a key without documenting it and the lab FAILs before the
// commit does. Same doctrine as CHEATS: nothing undeclared. Toggle: ?
const KEYS = [
  { group: 'LOOKING',       key: '?',     does: 'this legend',                                        short: 'legend / detail' },
  { group: 'LOOKING',       key: 'Space', does: 'pause / resume',                                     short: 'pause' },
  { group: 'LOOKING',       key: '[',     does: 'slower — halve the clock',                           short: 'slower' },
  { group: 'LOOKING',       key: ']',     does: 'faster — double the clock',                           short: 'faster' },
  { group: 'LOOKING',       key: 't',     does: 'true scale — planets shrink to real size',            short: 'true scale' },

  { group: 'SOLAR SYSTEM',  key: '=',     does: 'DOUBLE the selected body\'s mass — watch the fabric', short: 'mass x2' },
  { group: 'SOLAR SYSTEM',  key: '-',     does: 'halve the selected body\'s mass',                     short: 'mass /2' },
  { group: 'SOLAR SYSTEM',  key: 'e',     does: 'Einstein on/off — 1PN, Mercury\'s +42.8"/century',    short: 'Einstein 1PN' },
  { group: 'SOLAR SYSTEM',  key: 'b',     does: 'solar magnetic field + its field lines',              short: 'magnetic field' },
  { group: 'SOLAR SYSTEM',  key: 'n',     does: 'spawn a rogue body',                                  short: 'rogue body' },
  { group: 'SOLAR SYSTEM',  key: 'c',     does: 'spawn charged dust',                                  short: 'charged dust' },
  { group: 'SOLAR SYSTEM',  key: 'C',     does: 'spawn POLAR dust — bounces between mirror points',    short: 'polar dust' },
  { group: 'SOLAR SYSTEM',  key: 'x',     does: 'smoke grain, beta 0.49 — bound, comes back',          short: 'smoke b0.49' },
  { group: 'SOLAR SYSTEM',  key: 'X',     does: 'smoke grain, beta 0.51 — past the knife-edge, gone',  short: 'smoke b0.51' },

  { group: 'GALAXY',        key: 'g',     does: 'galaxy mode — 1 grid unit becomes 1 kiloparsec',      short: 'GALAXY MODE' },
  { group: 'GALAXY',        key: 'h',     does: 'DARK HALO on/off — the whole point, press it',        short: 'DARK HALO on/off' },
  { group: 'GALAXY',        key: 'j',     does: 'tracer stars — straight spokes wind into arms',       short: 'tracer stars' },
  { group: 'GALAXY',        key: 'k',     does: '145 real globular clusters, in flight',               short: '145 clusters' },
  { group: 'GALAXY',        key: 'w',     does: '2,373 real Cepheids — the disk\'s warp',              short: '2373 Cepheids' },
  { group: 'GALAXY',        key: 'v',     does: 'rotation curve chart (log R, 1 pc to 30 kpc)',        short: 'rotation curve' },
  { group: 'GALAXY',        key: 'm',     does: '773 MEASURED stars on that chart',                    short: '773 measured' },
  { group: 'GALAXY',        key: 'r',     does: 'VERDICT panel — chi2/nu, the hypothesis test',        short: 'VERDICT panel' },
  { group: 'GALAXY',        key: ',',     does: 'dial the halo mass DOWN 2% — watch chi2/nu climb',   short: 'halo mass -2%' },
  { group: 'GALAXY',        key: '.',     does: 'dial the halo mass UP 2% — hunt the floor',          short: 'halo mass +2%' },
  { group: 'GALAXY',        key: '/',     does: 'halo mass back to house — clusters KEEP their history', short: 'halo reset' },
  { group: 'GALAXY',        key: 'u',     does: 'undo: clusters back to the catalogue epoch, halo untouched', short: 'undo dialling' },
  { group: 'GALAXY',        key: 'f',     does: 'find: cycle fastest / farthest / highest / nearest escape', short: 'find a cluster' },

  { group: 'WHAT IF',       key: 'i',     does: 'enter / leave WHAT IF — declared constants, not measurements', short: 'WHAT IF mode' },
  { group: 'WHAT IF',       key: 'o',     does: 'speed of light: 1x / 1-10th / 1-100th / 1-1000th', short: 'dial c' },
  { group: 'WHAT IF',       key: 's',     does: 'Sgr A* mass: 1x / 1e6 / 1e9 / 1e10 — horizon is r_s = 2GM/c2', short: 'dial Sgr A*' },

  { group: 'RECORDS',       key: 'L',     does: 'fetch today\'s state vectors from NASA/JPL Horizons', short: 'live JPL fetch' },
  { group: 'RECORDS',       key: 'P',     does: 'provenance — every dataset, bytes and sha256',        short: 'provenance' },
  { group: 'RECORDS',       key: 'D',     does: 'download the provenance record as JSON',              short: 'download record' },
];

const legendPanel = document.createElement('div');
legendPanel.addEventListener('click', () => { legendMode = 0; applyLegend(); });
document.body.append(legendPanel);

const legendHint = document.createElement('div');
legendHint.style.cssText =
  'position:fixed; bottom:8px; left:50%; transform:translateX(-50%); z-index:15;' +
  'color:#6f7d88; font:11px monospace; pointer-events:none;';
legendHint.textContent = 'press ? for controls';
document.body.append(legendHint);

// 0 = closed, 1 = DOCKED (compact, stays open, ignores the mouse so you can
// fly the camera straight through it), 2 = FULL (centred, the first read).
// ? cycles. The panel says what the next press does, so nothing is hidden.
// No z-index on the docked state ON PURPOSE: every data panel is appended
// after this one, so provenance and the charts always draw OVER the
// reference sheet rather than under it.
let legendMode = 0;

const DOCKED_CSS =
  'position:fixed; top:132px; right:12px; pointer-events:none;' +
  'background:rgba(8,10,14,0.82); border:1px solid #2c313a; border-radius:6px;' +
  'color:#9fb8c8; font:11px/1.5 monospace; padding:8px 12px; white-space:pre;';
const FULL_CSS =
  'position:fixed; top:50%; left:50%; transform:translate(-50%,-50%);' +
  'width:min(560px,92vw); max-height:82vh; overflow:auto; z-index:30;' +
  'background:rgba(8,10,14,0.94); border:1px solid #3a3f4a; border-radius:8px;' +
  'color:#cfe3ee; font:12px/1.6 monospace; padding:16px 20px;' +
  'white-space:pre; cursor:pointer;';

// DOCKED: two columns, solar system on the left, galaxy and records on the right.
function compactLegend() {
  const left = KEYS.filter(k => k.group === 'LOOKING' || k.group === 'SOLAR SYSTEM');
  const right = KEYS.filter(k => k.group === 'GALAXY' || k.group === 'RECORDS');
  const cell = (k) => k ? `${k.key.padEnd(6)}${k.short}`.padEnd(24) : ' '.repeat(24);
  const rows = ['CONTROLS' + ' '.repeat(16) + '? for detail', ''];
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    rows.push(cell(left[i]) + '  ' + cell(right[i]).trimEnd());
  }
  rows.push('', 'mouse: drag orbit  scroll zoom  click select');
  return rows.join('\n');
}

// FULL: every key with its full sentence, the first-read version.
function fullLegend() {
  const lines = ['FABRIC OF SPACE — controls', ''];
  lines.push('  mouse       drag to orbit, scroll to zoom, click a body to select');
  let group = null;
  for (const k of KEYS) {
    if (k.group !== group) { group = k.group; lines.push('', `${group}`); }
    lines.push(`  ${k.key.padEnd(10)}${k.does}`);
  }
  lines.push('', '  Nothing here is a cartoon: every number comes from a public',
    '  catalogue and every visual shortcut is confessed in CHEATS.md.',
    '', '  [press ? again to close, or click this box]');
  return lines.join('\n');
}

function applyLegend() {
  if (legendMode === 0) {
    legendPanel.style.display = 'none';
    legendHint.style.display = 'block';
    return;
  }
  legendHint.style.display = 'none';
  legendPanel.style.display = 'block';
  legendPanel.style.cssText = (legendMode === 1 ? DOCKED_CSS : FULL_CSS) + 'display:block;';
  legendPanel.textContent = legendMode === 1 ? compactLegend() : fullLegend();
}
applyLegend();

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
  if (event.key === '?') {                            // A2: closed -> docked -> full -> closed
    legendMode = (legendMode + 1) % 3;
    applyLegend();
    return;
  }
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
    updateHorizon();   // W2a: the marker retires when the true horizon resolves
    if (!GALAXY.on) { GAL_STARS.on = false; tracerCloud.visible = realCloud.visible = false; }
    selected = null; galaxyPick = null; panel.style.display = 'none';   // M12c: no stale readout across the mode switch
    if (!GALAXY.on) { clusterCloud.visible = false; clusterPick = null; clusterTrail.visible = false; curveCanvas.style.display = 'none'; verdictCanvas.style.display = 'none'; cepheidCloud.visible = false; }   // M12d/M12e/M12g/M12h/M12j
    console.log(`AUDIT: galaxy mode ${GALAXY.on ? 'ON — 1 unit = 1 kpc' : 'OFF — 1 unit = 1 AU'}. ` +
      `Solar sim continues underneath. phi(8.2 kpc) = ${galaxyPhi(8.2).toFixed(0)} (km/s)^2, ` +
      `dark halo ${GALAXY.haloOn ? 'ON' : 'OFF'}.${dialledInto()}`);
    return;
  }
  if (event.key.toLowerCase() === 'j') {              // M12c: stars on the sheet
    if (!GALAXY.on) { console.log('AUDIT: press g first — stars ride the galactic sheet.'); return; }
    GAL_STARS.on = !GAL_STARS.on;
    if (GAL_STARS.on) { seedGalaxyStars(HYG_SAMPLE); syncGalaxyStars(); }  // every switch-on re-straightens the spokes at t=0
    tracerCloud.visible = realCloud.visible = GAL_STARS.on;
    console.log(`AUDIT: galaxy stars ${GAL_STARS.on ? `ON — 4 spokes straight at t=0, 240 tracers + ${HYG_SAMPLE.length} real` : 'OFF'}. ` +
      `Sun's lap at 8.2 kpc = ${(2 * Math.PI * 8.2 / (galaxyVCirc(8.2) * KMS_TO_KPC_MYR)).toFixed(1)} Myr, ` +
      `dark halo ${GALAXY.haloOn ? 'ON' : 'OFF'}.${dialledInto()}`);
    return;
  }
  if (event.key.toLowerCase() === 'k') {              // M12d: the real halo
    if (!GALAXY.on) { console.log('AUDIT: press g first — clusters live at galactic scale.'); return; }
    if (!CLUSTERS.loaded) {                            // F4: one fetch in flight, ever
      if (!CLUSTERS.inFlight) {
        CLUSTERS.inFlight = true;
        loadClusters().finally(() => { CLUSTERS.inFlight = false; });
      } else console.log('AUDIT: cluster fetch already in flight — key ignored.');
      return;
    }
    clusterCloud.visible = !clusterCloud.visible;
    if (!clusterCloud.visible) { clusterPick = null; refreshClusterTrail(); }
    console.log(`AUDIT: globular clusters ${clusterCloud.visible ? 'shown' : 'hidden'} ` +
      `(${CLUSTERS.list.length} loaded from ${CLUSTERS.source}).`);
    return;
  }
  if (WHATIF.armed) {                                 // W1: the confirmation swallows the key
    WHATIF.armed = false;
    if (event.key.toLowerCase() === 'i') {
      WHATIF.on = true;
      console.log('AUDIT: WHAT IF entered. One engine, declared constants. ' +
        'Nothing printed from here is a measurement. o cycles the speed of light; ' +
        'i leaves and resets every knob.');
    } else {
      console.log('AUDIT: stayed in TRUTH — the keypress was consumed, not acted on.');
    }
    applyWhatIf();
    return;
  }
  if (event.key.toLowerCase() === 'i') {              // W1: the boundary
    if (!WHATIF.on) { WHATIF.armed = true; applyWhatIf(); return; }
    const had = whatIfMoved();
    WHATIF.on = false;
    whatIfReset();
    applyWhatIf();
    console.log(`AUDIT: back in TRUTH. ${had.length ? had.join(', ') + ' reset to measured values' :
      'nothing had been moved'}. Every constant is where the universe put it.`);
    return;
  }
  if (event.key.toLowerCase() === 'o') {             // W1: the speed of light
    if (!WHATIF.on) { console.log('AUDIT: press i first — constants only move in WHAT IF.'); return; }
    WHATIF.cIdx = (WHATIF.cIdx + 1) % WHATIF.cSteps.length;
    const f = WHATIF.cSteps[WHATIF.cIdx];
    LIGHT.c = LIGHT.cal * f;
    applyWhatIf();
    console.log(`AUDIT: c = ${f}x measured (${(LIGHT.c / 173.144632 * 299792.458).toFixed(0)} km/s). ` +
      `1PN is suppressed by 1/c^2, so Mercury's drift scales by ${(1 / (f * f)).toExponential(1)}x — ` +
      `about ${(42.98 / (f * f) / 3600).toExponential(2)} degrees per century. ` +
      `Press e if Einstein is not already on.`);
    return;
  }
  if (event.key.toLowerCase() === 's') {             // W2a: Sgr A*'s mass
    if (!WHATIF.on) { console.log('AUDIT: press i first — constants only move in WHAT IF.'); return; }
    WHATIF.sIdx = (WHATIF.sIdx + 1) % WHATIF.sSteps.length;
    const f = WHATIF.sSteps[WHATIF.sIdx];
    GALAXY.MBH = GALAXY.MBH_CAL * f;
    const { rs, resolved } = updateHorizon();
    applyWhatIf();
    // W2a.1: read the DIALLED c, not the measured one. r_s already does —
    // printing a measured-c step against a dialled-c horizon compares two
    // different universes. Caught when o x0.01 made the ratio read 14.9x
    // where the truth was 0.149x, i.e. crossable in one step.
    const cKmsNow = LIGHT.c * (299792.458 / LIGHT.cal);
    const step = cKmsNow * KMS_TO_KPC_MYR * GAL_STARS.DT;
    console.log(`AUDIT: Sgr A* = ${f.toExponential(0)}x published (${GALAXY.MBH.toExponential(2)} Msun). ` +
      `r_s = 2GM/c^2 = ${rs.toExponential(4)} kpc — computed from the dialled c, never drawn to taste. ` +
      (resolved
        ? `Outside the ${HORIZON_RESOLVED} kpc galaxyPhi clamp, so the CHEATS #8 marker retires and ` +
          `the horizon is drawn at TRUE size. One ${GAL_STARS.DT} Myr step at c covers ` +
          `${step.toFixed(3)} kpc = ${step / rs < 0.1 ? (step / rs).toExponential(2) : (step / rs).toFixed(1)}x ` +
          `this horizon — ${step > rs ? 'which is why W2b needs ' : 'so at THIS c a point test would suffice; in general W2b still needs '}` +
          `a segment-crossing test and its own substep, not a point-in-sphere check.`
        : `Still inside the ${HORIZON_RESOLVED} kpc clamp, where galaxyPhi is flat and the force is ` +
          `zero. Unresolved, so the CHEATS #8 marker still stands in for it.`) +
      ` NOT A MEASUREMENT.`);
    return;
  }
  if (event.key.toLowerCase() === 'f') {              // S1: find the interesting one
    if (!GALAXY.on) { console.log('AUDIT: press g first — f hunts through the clusters.'); return; }
    if (!CLUSTERS.loaded) { console.log('AUDIT: no clusters loaded — press k first.'); return; }
    const flying = CLUSTERS.list.filter((c) => c.vx !== undefined);
    if (!flying.length) { console.log('AUDIT: no clusters carry 3D velocities.'); return; }
    HUNT.mode = (HUNT.mode + 1) % HUNT.queries.length;
    const q = HUNT.queries[HUNT.mode];
    let best = flying[0], bestScore = q.score(best);
    for (const c of flying) { const s = q.score(c); if (s > bestScore) { best = c; bestScore = s; } }
    clusterPick = CLUSTERS.list.indexOf(best);
    galaxyPick = null;
    refreshClusterTrail();
    console.log(`AUDIT: hunt "${q.name}" over ${flying.length} clusters — ${best.id} wins at ` +
      `${q.say(best)}. Selected; its trail is drawn and the panel is open. ` +
      `f again for "${HUNT.queries[(HUNT.mode + 1) % HUNT.queries.length].name}".`);
    return;
  }
  if (event.key.toLowerCase() === 'u') {              // B2.1: undo the dialling
    if (!GALAXY.on) { console.log('AUDIT: press g first — u restores the clusters.'); return; }
    if (!CLUSTERS.loaded) { console.log('AUDIT: no clusters loaded — press k first.'); return; }
    const n = restoreClusters();
    const unbound = colourClusters();
    refreshClusterTrail();
    const c = clusterPick !== null ? CLUSTERS.list[clusterPick] : null;
    const at = c && c.seed
      ? ` ${c.id} back to r ${Math.hypot(c.x, c.y, c.z).toFixed(1)} kpc, ` +
        `|v3D| ${(Math.hypot(c.vx, c.vy, c.vz) / KMS_TO_KPC_MYR).toFixed(1)} km/s.`
      : '';
    console.log(`AUDIT: ${n} clusters returned to the catalogue epoch — Harris positions, ` +
      `Gaia velocities, exactly as loaded.${at} ${unbound} unbound at the CURRENT halo ` +
      `(${(GALAXY.MS / GALAXY.MS_CAL).toFixed(2)}x). The halo knob was not moved; the galaxy ` +
      `clock keeps running as a stopwatch.`);
    return;
  }
  if (event.key === ',' || event.key === '.' || event.key === '/') {   // B2: the halo knob
    if (!GALAXY.on) { console.log('AUDIT: press g first — the halo knob reads the galaxy.'); return; }
    const before = GALAXY.MS;
    if (event.key === '/') GALAXY.MS = GALAXY.MS_CAL;
    else GALAXY.MS = Math.min(3 * GALAXY.MS_CAL, Math.max(0.1 * GALAXY.MS_CAL,
      GALAXY.MS * (event.key === '.' ? 1.02 : 1 / 1.02)));
    if (GALAXY.MS === before && event.key !== '/') {
      console.log(`AUDIT: halo knob at its stop (${(GALAXY.MS / GALAXY.MS_CAL).toFixed(2)}x house) — ` +
        `the scan window haloLab HL1 used is 0.1x to 3.0x.`);
      return;
    }
    if (CLUSTERS.loaded) {
      // The clusters are IN FLIGHT: changing MS changes the force on them NOW,
      // so their trajectories are path-dependent from here on. / resets the
      // halo but KEEPS that history. u throws the history away. CHEATS #23.
      console.log(`AUDIT: ${colourClusters()} clusters now unbound — the halo changed under them.`);
      if (clusterPick !== null) refreshClusterTrail();
    }
    drawCurve();
    drawVerdict();
    const v = nfwM200(GALAXY.MS);
    const chi = MROZ.bins.length ? verdictChi2(true).toFixed(1) : 'press m';
    console.log(`AUDIT: halo mass ${(GALAXY.MS / GALAXY.MS_CAL).toFixed(3)}x house — ` +
      `M200 ${v.M200.toExponential(2)} Msun (c ${v.c.toFixed(1)}, r200 ${v.r200.toFixed(0)} kpc), ` +
      `vCirc(8.2) ${galaxyVCirc(8.2).toFixed(1)} km/s, chi2/nu ${chi}. ` +
      `Floor is 0.993x at 8.96 — lab/haloLab.mjs HL1.${dialledInto('halo')}`);
    return;
  }
  if (event.key.toLowerCase() === 'h') {              // M12b: dark matter, live
    GALAXY.haloOn = !GALAXY.haloOn;
    console.log(`AUDIT: dark halo ${GALAXY.haloOn ? 'ON' : 'OFF'} — ` +
      `phi(24.6 kpc) = ${galaxyPhi(24.6).toFixed(0)} (km/s)^2. Watch the outskirts.${dialledInto()}`);
    if (CLUSTERS.loaded) {
      console.log(`AUDIT: ${colourClusters()} clusters now unbound — futures changed mid-flight.`);
      if (clusterPick !== null) refreshClusterTrail();   // same cluster, new fate
    }
    drawCurve();                                      // M12g: the plateau sags live
    drawVerdict();                                    // M12j: and the verdict answers
    return;
  }
    if (event.key.toLowerCase() === 'v') {              // M12g: the curve, live
    if (!GALAXY.on) { console.log('AUDIT: press g first — the curve reads the galaxy.'); return; }
    curveCanvas.style.display = curveCanvas.style.display === 'none' ? 'block' : 'none';
    drawCurve();
    console.log(`AUDIT: rotation-curve instrument ${curveCanvas.style.display === 'none'
      ? 'hidden' : 'ON — rulers receipted in lab/curveLab.mjs V0-V4'}.`);
    return;
  }
  if (event.key.toLowerCase() === 'r') {              // M12j: the verdict
    if (!GALAXY.on) { console.log('AUDIT: press g first — the verdict reads the galaxy.'); return; }
    verdictCanvas.style.display = verdictCanvas.style.display === 'none' ? 'block' : 'none';
    drawVerdict();
    if (verdictCanvas.style.display === 'none') { console.log('AUDIT: verdict panel hidden.'); return; }
    console.log(`AUDIT: verdict panel ON — chi2/nu ${verdictChi2(GALAXY.haloOn).toFixed(1)} ` +
      `with the halo ${GALAXY.haloOn ? 'ON' : 'OFF'}, ` +
      `${verdictChi2(!GALAXY.haloOn).toFixed(1)} the other way. ` +
      `${MROZ.loaded ? `${MROZ.bins.length} testifying bins` : 'press m to load the sky'}. ` +
      `Rulers: lab/mrozLab.mjs MZ6-MZ8.`);
    return;
  }
  if (event.key.toLowerCase() === 'w') {              // M12h: the disk's body
    if (!GALAXY.on) { console.log('AUDIT: press g first — Cepheids live at galactic scale.'); return; }
    if (!CEPHEIDS.loaded) {                            // F4: one fetch in flight, ever
      if (!CEPHEIDS.inFlight) {
        CEPHEIDS.inFlight = true;
        loadCepheids().finally(() => { CEPHEIDS.inFlight = false; });
      } else console.log('AUDIT: Cepheid fetch already in flight — key ignored.');
      return;
    }
    cepheidCloud.visible = !cepheidCloud.visible;
    console.log(`AUDIT: Cepheid disk ${cepheidCloud.visible ? 'shown' : 'hidden'} ` +
      `(${CEPHEIDS.list.length} from ${CEPHEIDS.source}).`);
    return;
  }
  if (event.key.toLowerCase() === 'm') {              // M12i: the sky on the chart
    if (!GALAXY.on) { console.log('AUDIT: press g first — the measured curve reads the galaxy.'); return; }
    if (curveCanvas.style.display === 'none') { curveCanvas.style.display = 'block'; }
    if (!MROZ.loaded) {                                // F4: one fetch in flight, ever
      if (!MROZ.inFlight) {
        MROZ.inFlight = true;
        loadMroz().finally(() => { MROZ.inFlight = false; });
      } else console.log('AUDIT: Mroz fetch already in flight — key ignored.');
      return;
    }
    MROZ.shown = !MROZ.shown;
    drawCurve();
    console.log(`AUDIT: measured stars ${MROZ.shown ? 'shown' : 'hidden'} ` +
      `(${MROZ.list.length} from ${MROZ.source}).`);
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

// ---------- W2a: the event horizon, at the size the mass actually gives it ----------
// 1 scene unit = 1 kpc (sunSeat sits at 8.2 for 8.2 kpc). The sphere is built at
// UNIT radius and scaled to r_s, so no length is invented anywhere in here. The
// rim is 0.97-1.00 of that same radius — an annotation at true scale, not a glow
// drawn for effect.
//
// The 0.8-unit sgrA marker and its 1.4-1.7 unit ring (CHEATS #8) exist BECAUSE
// the measured horizon is 4.1e-10 kpc and invisible. The moment r_s clears the
// 0.05 kpc galaxyPhi clamp — the same threshold captureLab CP3 measures — the
// stand-in retires and the real thing is drawn alone. A true horizon hidden
// inside a decorative one is the worst lie this project could tell.
const HORIZON_RESOLVED = 0.05;      // kpc — the galaxyPhi clamp. captureLab CP3.
const horizon = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 32), BLACK_HOLE_MAT);
const horizonRim = new THREE.Mesh(
  new THREE.RingGeometry(0.97, 1.0, 64),
  new THREE.MeshBasicMaterial({ color: 0xff6a1a, side: THREE.DoubleSide,
    transparent: true, opacity: 0.9 }));
horizonRim.rotateX(-Math.PI / 2);
horizon.add(horizonRim);
horizon.visible = false;
scene.add(horizon);

function updateHorizon() {
  const rs = schwarzschildRadius(GALAXY.MBH);
  const resolved = rs > HORIZON_RESOLVED;
  horizon.scale.setScalar(rs);          // unit sphere -> exactly r_s kpc
  horizon.visible = GALAXY.on && resolved;
  sgrA.visible = GALAXY.on && !resolved;
  return { rs, resolved };
}

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

// ---------- W1: WHAT IF ----------
// The rule this project was built on is "physics never cheats." W1 widens it
// on purpose, and the wording matters: PHYSICS NEVER CHEATS, CONSTANTS MAY BE
// DECLARED. There is exactly ONE engine. WHAT IF does not fork it, replace it
// or approximate it — it moves stated constants and lets the same integrator,
// the same force law and the same receipts do what they always do. Nothing
// here is faked; things here are simply not measurements.
//
// The guard against drift is lab/sandboxLab.mjs: with every knob at its
// calibration value, WHAT IF must be bit-identical to TRUTH. The day that
// fails, a fork has happened and the ledger will say which hour.
const WHATIF = {
  on: false,
  armed: false,                     // the confirmation is deliberate ceremony
  cIdx: 0,
  cSteps: [1, 0.1, 0.01, 0.001],    // multipliers on the measured speed of light
  sIdx: 0,
  sSteps: [1, 1e6, 1e9, 1e10],      // W2a: multipliers on Sgr A*'s published mass
};

// Taxonomy #11, the unlabelled readout: a derived number printed against an
// undeclared knob. phi(8.2) reads -147558 at the house values and -2402958
// with Sgr A* at 1e6x — correct physics, and indistinguishable from a bug
// unless the label names what moved. Every AUDIT printing a derived quantity
// appends this. NOT the same list as whatIfMoved(): MS is dialled in TRUTH
// (B2), MBH only in WHAT IF, and both feed phi.
function dialledInto(skip) {
  const d = [];
  if (skip !== 'halo' && GALAXY.MS !== GALAXY.MS_CAL) d.push(`halo ${(GALAXY.MS / GALAXY.MS_CAL).toFixed(2)}x`);
  if (skip !== 'bh' && GALAXY.MBH !== GALAXY.MBH_CAL) d.push(`Sgr A* ${(GALAXY.MBH / GALAXY.MBH_CAL).toExponential(0)}x`);
  return d.length ? ` [dialled: ${d.join(', ')} — NOT the measured galaxy]` : '';
}

// Short form for the HUD and panels, which redraw every frame and cannot
// carry the full sentence. Empty at house values, so it costs nothing until
// something has actually moved.
function dialledShort() {
  const d = [];
  if (GALAXY.MS !== GALAXY.MS_CAL) d.push(`halo ${(GALAXY.MS / GALAXY.MS_CAL).toFixed(2)}x`);
  if (GALAXY.MBH !== GALAXY.MBH_CAL) d.push(`Sgr A* ${(GALAXY.MBH / GALAXY.MBH_CAL).toExponential(0)}x`);
  return d.length ? `  [DIALLED: ${d.join(', ')}]` : '';
}

// Only the constants that have actually MOVED. An empty list means the mode
// is on but nothing differs — and the banner says exactly that.
function whatIfMoved() {
  const moved = [];
  if (LIGHT.c !== LIGHT.cal) moved.push(`c x${(LIGHT.c / LIGHT.cal).toFixed(3)}`);
  if (GALAXY.MBH !== GALAXY.MBH_CAL) {
    moved.push(`Sgr A* x${(GALAXY.MBH / GALAXY.MBH_CAL).toExponential(0)}`);
  }
  return moved;
}

function whatIfReset() {
  LIGHT.c = LIGHT.cal;
  WHATIF.cIdx = 0;
  GALAXY.MBH = GALAXY.MBH_CAL;
  WHATIF.sIdx = 0;
}

const whatIfBanner = document.createElement('div');
whatIfBanner.style.cssText =
  'position:fixed; top:0; left:0; right:0; z-index:40; display:none;' +
  'background:#5a3a10; border-bottom:2px solid #d89a3a; color:#ffd79a;' +
  'font:bold 13px monospace; padding:6px 14px; text-align:center; letter-spacing:0.5px;';
document.body.append(whatIfBanner);

const whatIfAsk = document.createElement('div');
whatIfAsk.style.cssText =
  'position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); z-index:50;' +
  'width:min(520px,92vw); background:rgba(20,12,4,0.96); border:2px solid #d89a3a;' +
  'border-radius:8px; color:#ffd79a; font:13px/1.6 monospace; padding:18px 22px;' +
  'white-space:pre-wrap; display:none;';
whatIfAsk.textContent =
  'LEAVING TRUTH MODE\n\n' +
  'In WHAT IF the constants are yours to move. The engine does not change:\n' +
  'same integrator, same force law, same receipts. But once a constant has\n' +
  'moved, nothing on this screen is a measurement of our universe.\n\n' +
  'Press i again to enter.   Any other key stays in TRUTH.';
document.body.append(whatIfAsk);

// The label has to survive a cropped screenshot, so it lives in the pixels:
// a banner across the top AND a hue shift on the fabric itself.
function applyWhatIf() {
  const moved = whatIfMoved();
  whatIfAsk.style.display = WHATIF.armed ? 'block' : 'none';
  whatIfBanner.style.display = WHATIF.on ? 'block' : 'none';
  whatIfBanner.textContent = WHATIF.on
    ? `WHAT IF${moved.length ? ' — ' + moved.join(' — ') : ' — nothing moved yet'}` +
      '  ·  NOT MEASUREMENTS'
    : '';
  fabric.material.color.setHex(WHATIF.on ? 0x8a6a2a : 0x3a5a8a);
  updateHorizon();   // W2a: leaving WHAT IF must put the marker back
  if (GALAXY.on) { drawCurve(); drawVerdict(); }
}

// ---------- S1: the hunt ----------
// Finding one dot among 145 by eye is the wrong instrument. These are the
// questions you actually want answered, and every one is a single pass over
// data already in memory. No text box, no index, no new failure mode: f
// cycles the question and the winner selects itself. Every answer is LIVE —
// dial the halo or fly the clock and the winner can change, which is the
// point. Escape speed is the same galaxyPhi the census uses (M12d).
const HUNT = {
  mode: -1,                                   // first press lands on query 0
  queries: [
    { name: 'fastest',
      score: (c) => Math.hypot(c.vx, c.vy, c.vz),
      say: (c) => `|v3D| ${(Math.hypot(c.vx, c.vy, c.vz) / KMS_TO_KPC_MYR).toFixed(1)} km/s` },
    { name: 'farthest from Sgr A*',
      score: (c) => Math.hypot(c.x, c.y, c.z),
      say: (c) => `r ${Math.hypot(c.x, c.y, c.z).toFixed(1)} kpc` },
    { name: 'highest above the plane',
      score: (c) => Math.abs(c.z),
      say: (c) => `|z| ${Math.abs(c.z).toFixed(1)} kpc` },
    { name: 'closest to escaping',
      score: (c) => (Math.hypot(c.vx, c.vy, c.vz) / KMS_TO_KPC_MYR) /
                    escapeSpeed(Math.hypot(c.x, c.y, c.z)),
      say: (c) => {
        const r = Math.hypot(c.x, c.y, c.z);
        const v = Math.hypot(c.vx, c.vy, c.vz) / KMS_TO_KPC_MYR;
        return `v/vEsc ${(v / escapeSpeed(r)).toFixed(3)} ` +
          `(${v.toFixed(1)} of ${escapeSpeed(r).toFixed(1)} km/s at r ${r.toFixed(1)} kpc)` +
          dialledShort();
      } },
  ],
};

// B2.1: put the clusters back where the catalogues say they are. The halo is
// NOT touched — that is the point. Dial the halo, press u, and you are asking
// the honest question: what does the MEASURED cluster do in THIS galaxy?
function restoreClusters() {
  let n = 0;
  for (const c of CLUSTERS.list) {
    if (!c.seed) continue;
    c.x = c.seed.x; c.y = c.seed.y; c.z = c.seed.z;
    c.vx = c.seed.vx; c.vy = c.seed.vy; c.vz = c.seed.vz;
    c.v3 = c.seed.v3;
    n++;
  }
  return n;
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
      console.log(`AUDIT: ${label} fetch failed (${fetchNote(err)}) — using the shipped snapshot.`);
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
  // B2.1: the catalogue epoch, kept aside before anything flies. kdk3 mutates
  // x/y/z/vx/vy/vz in place, so once the clock runs the measured state is gone
  // unless it was copied. This is the ONLY copy of where Harris and Gaia say
  // these 145 objects actually were. u restores it; nothing else may touch it.
  for (const c of CLUSTERS.list) {
    if (c.vx === undefined) continue;
    c.seed = { x: c.x, y: c.y, z: c.z, vx: c.vx, vy: c.vy, vz: c.vz, v3: c.v3 };
  }
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

// ---------- M12h: the Cepheid disk — the galaxy's true body ----------
// 2,373 real classical Cepheids (Skowron+ 2019, VizieR J/AcA/69/305) at
// their measured seats, REAL heights, no lift — coloured by height so the
// warp reads as a colour tide on the outer rim. Structure receipted in
// lab/cephLab.mjs CD0-CD5 (warp spread 1.65 kpc, flare 2.97, shuffle
// negative). They do not move — velocities honestly absent, banked for
// the data-overlay milestone. CHEATS #14. Toggle: w.
const CEPHEIDS = { loaded: false, list: [], source: null };
let cepheidProvenance = null;
// M12i: the sky's own rotation curve — 773 Cepheids with MEASURED circular
// velocities (Mroz+ 2019). The browser spends the PUBLISHED per-star file;
// lab/mrozLab.mjs MZ2 proved our machinery regenerates it star-for-star
// (773/773, worst dV 5.0e-3 km/s). We spend the file because we minted it.
const MROZ = { loaded: false, shown: false, list: [], bins: [], railed: 0, source: null };
let mrozProvenance = null;
const cepheidCloud = new THREE.Points(
  new THREE.BufferGeometry(),
  new THREE.PointsMaterial({ size: 3, sizeAttenuation: false,
    vertexColors: true, transparent: true, opacity: 0.9 }));
cepheidCloud.visible = false;
scene.add(cepheidCloud);

function parseCepheidTSV(text) {
  const lines = text.split('\n').filter((l) => l && !l.startsWith('#')).slice(3);
  const out = [], D2R = Math.PI / 180;
  for (const line of lines) {
    const [name, glon, glat, dist, , age] = line.split('\t').map((s) => s.trim());
    if (!glon || !glat || !dist) continue;          // no distance, no seat
    const l = +glon * D2R, b = +glat * D2R, d = +dist / 1000;
    const xh = d * Math.cos(b) * Math.cos(l);       // heliocentric: x to center,
    const yh = d * Math.cos(b) * Math.sin(l);       // y to rotation, z north
    const zh = d * Math.sin(b);
    const X = 8.2 - xh, Y = -yh, z = zh;            // repo axes, Sun at +8.2
    if (Math.hypot(X, Y, z) > 30) continue;         // the confessed bench (CD1)
    out.push({ name, X, Y, z, age: age ? +age : null });
  }
  return out;
}

// Height -> colour: warm above the plane, cool below, pale at zero.
// The ramp saturates at +-1.5 kpc — a display dial, confessed in #14.
function colourCepheids() {
  const col = cepheidCloud.geometry.attributes.color;
  for (let i = 0; i < CEPHEIDS.list.length; i++) {
    const t = Math.max(-1, Math.min(1, CEPHEIDS.list[i].z / 1.5));
    if (t >= 0) col.setXYZ(i, 0.85 + 0.15 * t, 0.85 - 0.28 * t, 0.85 - 0.62 * t);
    else        col.setXYZ(i, 0.85 + 0.40 * t, 0.85 + 0.23 * t, 0.85 - 0.10 * t);
  }
  col.needsUpdate = true;
}

function buildCepheidCloud() {
  const n = CEPHEIDS.list.length;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const c = CEPHEIDS.list[i];
    pos[i * 3] = c.X; pos[i * 3 + 1] = c.z; pos[i * 3 + 2] = -c.Y;   // real height
  }
  const g = cepheidCloud.geometry;
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  g.computeBoundingSphere();
  colourCepheids();
}

async function loadCepheids() {
  const q = '?-source=J/AcA/69/305/table1'
    + '&-out=Name,GLON,GLAT,Dist,e_Dist,Age,_RA.icrs,_DE.icrs&-out.max=3000';
  progressBox.style.display = 'block';
  progressLabel.textContent = 'Collecting Cepheids » VizieR';
  progressFill.style.width = '40%';
  let text, source;
  try {
    const res = await fetch('/api/vizier' + q);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    text = await res.text();
    if (text.length < 100000) throw new Error(`short body, ${text.length} bytes`);
    source = 'VizieR live';
  } catch (err) {
    console.log(`AUDIT: Cepheid fetch failed (${fetchNote(err)}) — using the shipped snapshot.`);
    text = cepheidSnapshot; source = 'shipped snapshot';
  }
  CEPHEIDS.list = parseCepheidTSV(text);
  CEPHEIDS.source = source;
  CEPHEIDS.loaded = true;
  buildCepheidCloud();
  cepheidCloud.visible = true;
  progressFill.style.width = '100%';
  progressLabel.textContent = `${CEPHEIDS.list.length} Cepheids — the disk's body √`;
  setTimeout(() => { progressBox.style.display = 'none'; }, 1500);
  cepheidProvenance = {
    source: `Classical Cepheids (Skowron+ 2019, OGLE) — ${source}`,
    endpoint: 'https://vizier.cds.unistra.fr/viz-bin/asu-tsv?-source=J/AcA/69/305/table1',
    frame: 'seats from (GLON, GLAT, Dist), repo flip; real heights, no lift',
    receipts: 'lab/cephLab.mjs CD0-CD5: warp 1.65 kpc, flare 2.97, shuffle negative',
    session: new Date().toISOString(),
    plotted: CEPHEIDS.list.length,
    bytes: text.length,
    sha256: await sha256Hex(text),
  };
  console.log('Cepheid provenance:', cepheidProvenance);
  console.log(`AUDIT: ${CEPHEIDS.list.length} Cepheids at real seats, coloured by height — ` +
    `warm above the plane, cool below. The outer rim's colour tide IS the warp ` +
    `(CD3: +1.07 / -0.58 kpc). They do not move — velocities banked. CHEATS #14.`);
}

async function loadMroz() {
  progressBox.style.display = 'block';
  progressLabel.textContent = 'Collecting the measured curve » OGLE archive';
  progressFill.style.width = '40%';
  let text, source;
  try {
    const res = await fetch('/api/ogle/rotation_curve.txt');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    text = await res.text();
    if (text.length < 30000) throw new Error(`short body, ${text.length} bytes`);
    source = 'OGLE archive live';
  } catch (err) {
    console.log(`AUDIT: Mroz fetch failed (${fetchNote(err)}) — using the shipped snapshot.`);
    text = mrozSnapshot; source = 'shipped snapshot';
  }
  MROZ.list = []; MROZ.railed = 0;
  for (const line of text.split('\n')) {
    const s = line.trim();
    if (!s || s.startsWith('#')) continue;
    const t = s.split(/\s+/);
    const R = +t[1], V = +t[3], eV = +t[4];
    if (!Number.isFinite(R) || !Number.isFinite(V)) continue;
    if (V > CURVE.V_MAX) MROZ.railed++;           // pinned at the rail, never hidden
    MROZ.list.push({ R, V, eV });
  }
  // M12j: the bins are DATA — published R and V only, no model, no halo
  // (the F1 rule). Built ONCE at load, never per frame. Byte-identical
  // recipe to mrozLab MZ6: 1 kpc bins, 5 to 20, a bin testifies at N >= 8.
  MROZ.bins = [];
  for (let e = 5; e < 20; e++) {
    const inBin = MROZ.list.filter((s) => s.R >= e && s.R < e + 1);
    if (inBin.length < 8) continue;
    const N = inBin.length;
    const mean = inBin.reduce((a, s) => a + s.V, 0) / N;
    const sd = Math.sqrt(inBin.reduce((a, s) => a + (s.V - mean) ** 2, 0) / (N - 1));
    MROZ.bins.push({ mid: e + 0.5, N, mean, sd, sem: sd / Math.sqrt(N) });
  }
  MROZ.loaded = true; MROZ.shown = true; MROZ.source = source;
  progressFill.style.width = '100%';
  progressLabel.textContent = `${MROZ.list.length} measured stars on the chart √`;
  setTimeout(() => { progressBox.style.display = 'none'; }, 1500);
  mrozProvenance = {
    source: `Cepheid rotation curve (Mroz+ 2019, ApJL 870 L10) — ${source}`,
    endpoint: 'https://www.astrouw.edu.pl/ogle/ogle4/ROTATION_CURVE/rotation_curve.txt',
    method: 'published per-star (R, v_circ); their MODEL 2 seat R0 8.09 kpc, theta0 233.6',
    receipts: 'lab/mrozLab.mjs MZ0-MZ5: 773/773 handshake; ON 4.9 vs OFF 55.5 km/s',
    session: new Date().toISOString(),
    plotted: MROZ.list.length,
    railed: MROZ.railed,
    bytes: text.length,
    sha256: await sha256Hex(text),
  };
  console.log('Mroz provenance:', mrozProvenance);
  console.log(`AUDIT: ${MROZ.list.length} measured stars on the curve instrument ` +
    `(${MROZ.railed} above the 250 axis, pinned at the rail), binned into ` +
    `${MROZ.bins.length} testifying bins. Press r for the verdict. CHEATS #15, #17.`);
  buildValley();                                  // B3: the scan, once
  drawCurve();
  drawVerdict();
}

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
let earthSim = simBodies.find((body) => body.name === 'Earth');      // F2: let — a principal can die
let sunSim = simBodies.find((body) => body.name === 'Sun');          // F2: let — a principal can die
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
  if (!earthSim || !sunSim) return;      // F2: instrument disarmed — principal gone
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
let mercurySim = simBodies.find((body) => body.name === 'Mercury');  // F2: let — a principal can die
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
  if (!mercurySim || !sunSim) return;    // F2: instrument disarmed — principal gone
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
  // F2 (R1): a named principal can be eaten (mass surgery makes it reachable).
  // A captured reference would then read a frozen corpse forever — bug
  // taxonomy #2's exact shape. Confess loudly, disarm what depended on it.
  if (eaten === sunSim || eaten === earthSim || eaten === mercurySim) {
    console.log(`AUDIT: PRINCIPAL ABSORBED — ${eaten.name} no longer exists. ` +
      `Dependent instruments disarmed; their ledgers end here.`);
    if (eaten === mercurySim || eaten === sunSim) {
      mercurySim = null;
      periHud = 'Mercury perihelion: DISARMED — principal absorbed';
    }
    if (eaten === earthSim || eaten === sunSim) earthSim = null;
    if (eaten === sunSim) sunSim = null;
  }
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

// ---------- M12g: the rotation curve, on screen ----------
// The instrument whose rulers were receipted in lab/curveLab.mjs V0-V4.
// Geometry constants are BYTE-IDENTICAL to the lab. CHEATS #13: sample
// count, colors, ticks are display; every plotted value is
// galaxyVCircInner — the receipted function. Toggle: v.
const CURVE = { R_MIN: 1e-3, R_MAX: 30, V_MAX: 250,
  X0: 34, X1: 308, Y_TOP: 16, Y_AXIS: 140 };
const CURVE_LOGSPAN = Math.log10(CURVE.R_MAX) - Math.log10(CURVE.R_MIN);
const curveRToPx = (R) => CURVE.X0 + (Math.log10(R) - Math.log10(CURVE.R_MIN)) / CURVE_LOGSPAN * (CURVE.X1 - CURVE.X0);
const curveVToPy = (v) => CURVE.Y_AXIS - v / CURVE.V_MAX * (CURVE.Y_AXIS - CURVE.Y_TOP);

const curveCanvas = document.createElement('canvas');
curveCanvas.width = 320; curveCanvas.height = 170;
curveCanvas.style.cssText =
  'position:fixed; bottom:12px; left:12px; background:rgba(8,10,14,0.88);' +
  'border:1px solid #3a3f4a; border-radius:6px; display:none;';
document.body.append(curveCanvas);

function drawCurve() {
  if (curveCanvas.style.display === 'none') return;
  const c = curveCanvas.getContext('2d');
  const { X0, X1, Y_TOP, Y_AXIS, R_MIN, V_MAX } = CURVE;
  c.clearRect(0, 0, 320, 170);
  c.font = '10px monospace';
  c.fillStyle = '#8ee6c8';
  c.fillText(`ROTATION CURVE — dark halo ${GALAXY.haloOn ? 'ON' : 'OFF'}`, X0, 11);
  c.strokeStyle = '#555';
  c.beginPath(); c.moveTo(X0, Y_AXIS); c.lineTo(X1, Y_AXIS);
  c.moveTo(X0, Y_TOP); c.lineTo(X0, Y_AXIS); c.stroke();
  c.fillStyle = '#777';
  for (const [R, label] of [[0.01, '0.01'], [0.1, '0.1'], [1, '1'], [10, '10 kpc']]) {
    const px = curveRToPx(R);
    c.beginPath(); c.moveTo(px, Y_AXIS); c.lineTo(px, Y_AXIS + 4); c.stroke();
    c.fillText(label, px - 8, Y_AXIS + 14);
  }
  c.fillText('250', X0 - 24, Y_TOP + 4);
  c.fillText('0', X0 - 10, Y_AXIS + 3);
  const pxV = curveRToPx(0.00868);              // the V2-receipted valley
  c.setLineDash([3, 3]);
  c.beginPath(); c.moveTo(pxV, Y_AXIS - 20); c.lineTo(pxV, Y_AXIS); c.stroke();
  c.setLineDash([]);
  c.fillText('8.7 pc', pxV - 14, Y_AXIS - 24);
  c.strokeStyle = '#ff7a4f'; c.lineWidth = 1.5; c.beginPath();
  for (let i = 0; i < 200; i++) {
    const R = R_MIN * 10 ** (i / 199 * CURVE_LOGSPAN);
    const py = curveVToPy(Math.min(galaxyVCircInner(R, true), V_MAX));
    i === 0 ? c.moveTo(curveRToPx(R), py) : c.lineTo(curveRToPx(R), py);
  }
  c.stroke(); c.lineWidth = 1;
  const vSun = galaxyVCircInner(8.2, true);     // the Sun's dot, live
  c.fillStyle = '#ffd24f';
  c.beginPath(); c.arc(curveRToPx(8.2), curveVToPy(vSun), 3.5, 0, 7); c.fill();
  c.fillStyle = '#bbb';
  c.fillText(`Sun ${vSun.toFixed(1)}`, curveRToPx(8.2) - 62, curveVToPy(vSun) - 7);
  // M12i: the sky testifies. Dots are published measurements; they never
  // move. Stars above the 250 axis ride the rail as open ticks — counted,
  // confessed (CHEATS #15).
  if (MROZ.loaded && MROZ.shown) {
    c.fillStyle = 'rgba(140,190,255,0.75)';
    for (const s of MROZ.list) {
      if (s.V <= V_MAX) c.fillRect(curveRToPx(s.R) - 1, curveVToPy(s.V) - 1, 2, 2);
    }
    c.strokeStyle = '#8cbeff';
    for (const s of MROZ.list) {
      if (s.V > V_MAX) c.strokeRect(curveRToPx(s.R) - 1.5, Y_TOP - 1.5, 3, 3);
    }
    c.fillStyle = '#8cbeff';
    c.fillText(`${MROZ.list.length} stars, Mroz+19 (${MROZ.railed} railed)`, X1 - 168, Y_TOP + 14);   // F7: below the rail ticks
  }
}

// ---------- M12j: the verdict panel ----------
// The log chart (CHEATS #13) spends 90% of its width on the inner galaxy;
// every measured star lives in its last 10%. This panel is LINEAR in R
// over 4-17 kpc — the band where the sky testifies — so 11 bins and their
// error bars are legible. Same receipted galaxyVCircInner, same bins as
// mrozLab MZ6, same chi-square as MZ7. Toggle: r.
const VERD = { R_LO: 4, R_HI: 17, V_LO: 130, V_HI: 260,
  X0: 40, X1: 310, Y_TOP: 28, Y_BOT: 152 };
const vpx = (R) => VERD.X0 + (R - VERD.R_LO) / (VERD.R_HI - VERD.R_LO) * (VERD.X1 - VERD.X0);
const vpy = (V) => VERD.Y_BOT - (V - VERD.V_LO) / (VERD.V_HI - VERD.V_LO) * (VERD.Y_BOT - VERD.Y_TOP);

// B2: MS is the NFW CHARACTERISTIC mass, not the number anyone quotes.
// The virial mass is derived — solve M(<r200) = (4/3)pi r200^3 * 200 * rho_c.
// CHEATS #21 rule: quote M200, never MS. haloLab HL4 computes this
// independently; the two must agree (8.174e11 Msun, c 12.1, r200 193 kpc).
const RHO_CRIT = 136;                        // Msun/kpc^3 at H0 = 70
function nfwM200(ms) {
  const f = (x) => Math.log(1 + x) - x / (1 + x);
  let lo = 0.1, hi = 100;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (ms * f(mid) > (4 / 3) * Math.PI * (mid * GALAXY.RS) ** 3 * 200 * RHO_CRIT) lo = mid;
    else hi = mid;
  }
  const c = (lo + hi) / 2;
  return { c, r200: c * GALAXY.RS, M200: ms * f(c) };
}

// ---------- B3: the valley ----------
// B2 gave the halo a knob and printed one number. A number you have to
// remember is not a measurement. This scans chi2/nu across the knob's whole
// travel ONCE (it depends on the bins and the potential SHAPE, not on where
// the knob currently sits), so the panel can show you the floor, the width
// of the floor, and where you are standing — all at the same time.
const VALLEY = { lo: 0.1, hi: 3.0, pts: [], min: null, max: 1, wLo: null, wHi: null };

function buildValley() {
  VALLEY.pts = []; VALLEY.min = null;
  if (!MROZ.bins.length) return;
  // Same save/restore discipline as haloLab: the dial is borrowed, never left
  // moved. Synchronous, so nothing observes the intermediate values.
  const saved = GALAXY.MS;
  for (let i = 0; i <= 96; i++) {
    const r = VALLEY.lo * Math.pow(VALLEY.hi / VALLEY.lo, i / 96);
    GALAXY.MS = r * GALAXY.MS_CAL;
    VALLEY.pts.push({ r, chi: verdictChi2(true) });
  }
  GALAXY.MS = saved;
  VALLEY.min = VALLEY.pts.reduce((a, p) => (p.chi < a.chi ? p : a), VALLEY.pts[0]);
  VALLEY.max = Math.max(...VALLEY.pts.map((p) => p.chi));
  // The chi2 + 1 band — the CURVATURE of the valley, not an error bar on the
  // Milky Way. CHEATS #21 item 2 says why. Drawn so the narrowness is visible.
  const target = VALLEY.min.chi + 1;
  const below = VALLEY.pts.filter((p) => p.chi <= target);
  VALLEY.wLo = below.length ? below[0].r : null;
  VALLEY.wHi = below.length ? below[below.length - 1].r : null;
}

const verdictCanvas = document.createElement('canvas');
verdictCanvas.width = 320; verdictCanvas.height = 292;
verdictCanvas.style.cssText =
  'position:fixed; bottom:190px; left:12px; background:rgba(8,10,14,0.88);' +
  'border:1px solid #3a3f4a; border-radius:6px; display:none;';
document.body.append(verdictCanvas);

// chi2/nu over the testifying bins. Divides by SEM — how well each bin MEAN
// is known — not SD, which is how thick the sky is. MZ7's ruler exactly.
function verdictChi2(halo) {
  if (!MROZ.bins.length) return NaN;
  let c2 = 0;
  for (const b of MROZ.bins) c2 += ((b.mean - galaxyVCircInner(b.mid, true, halo)) / b.sem) ** 2;
  return c2 / MROZ.bins.length;
}

function drawVerdict() {
  if (verdictCanvas.style.display === 'none') return;
  const c = verdictCanvas.getContext('2d');
  const { X0, X1, Y_TOP, Y_BOT, R_LO, R_HI } = VERD;
  c.clearRect(0, 0, 320, 292);
  c.font = '10px monospace';
  c.fillStyle = '#8ee6c8';
  c.fillText('VERDICT PANEL — 4 to 17 kpc, linear', 8, 13);
  c.strokeStyle = '#555';
  c.beginPath(); c.moveTo(X0, Y_BOT); c.lineTo(X1, Y_BOT);
  c.moveTo(X0, Y_TOP); c.lineTo(X0, Y_BOT); c.stroke();
  c.fillStyle = '#777';
  for (const R of [4, 6, 8, 10, 12, 14, 16]) {
    const px = vpx(R);
    c.beginPath(); c.moveTo(px, Y_BOT); c.lineTo(px, Y_BOT + 4); c.stroke();
    c.fillText(String(R), px - 6, Y_BOT + 14);
  }
  c.fillText('kpc', X1 - 22, Y_BOT + 14);
  for (const V of [260, 195, 130]) c.fillText(String(V), X0 - 26, vpy(V) + 3);
  if (!MROZ.loaded) {
    c.fillStyle = '#bbb';
    c.fillText('press m to load the measured sky', X0 + 20, vpy(195));
    return;
  }
  // Both models, always: solid = the live hypothesis, dashed = the other.
  for (const halo of [true, false]) {
    const live = halo === GALAXY.haloOn;
    c.strokeStyle = halo ? '#ff7a4f' : '#8a7a72';
    c.lineWidth = live ? 2 : 1;
    c.setLineDash(live ? [] : [4, 3]);
    c.beginPath();
    for (let i = 0; i <= 120; i++) {
      const R = R_LO + (R_HI - R_LO) * i / 120;
      const py = vpy(galaxyVCircInner(R, true, halo));
      i === 0 ? c.moveTo(vpx(R), py) : c.lineTo(vpx(R), py);
    }
    c.stroke();
  }
  c.setLineDash([]); c.lineWidth = 1;
  // The sky: bin means, whisker = +-1 SD. Published values, never moved.
  c.strokeStyle = '#5fe3b0'; c.fillStyle = '#5fe3b0';
  for (const b of MROZ.bins) {
    const px = vpx(b.mid), hi = vpy(b.mean + b.sd), lo = vpy(b.mean - b.sd);
    c.beginPath();
    c.moveTo(px, lo); c.lineTo(px, hi);
    c.moveTo(px - 3, hi); c.lineTo(px + 3, hi);
    c.moveTo(px - 3, lo); c.lineTo(px + 3, lo);
    c.stroke();
    c.beginPath(); c.arc(px, vpy(b.mean), 2, 0, 7); c.fill();
  }
  // Legend, in the empty ground under the halo-OFF model.
  c.strokeStyle = '#ff7a4f'; c.lineWidth = 2;
  c.beginPath(); c.moveTo(X0 + 6, 120); c.lineTo(X0 + 20, 120); c.stroke();
  c.strokeStyle = '#8a7a72'; c.lineWidth = 1; c.setLineDash([4, 3]);
  c.beginPath(); c.moveTo(X0 + 6, 133); c.lineTo(X0 + 20, 133); c.stroke();
  c.setLineDash([]);
  c.fillStyle = '#bbb';
  c.fillText(`halo ON${GALAXY.haloOn ? ' (live)' : ''}`, X0 + 26, 123);
  c.fillText(`halo OFF${GALAXY.haloOn ? '' : ' (live)'}`, X0 + 26, 136);
  c.fillStyle = '#5fe3b0';
  c.fillText(`I ${MROZ.bins.length} bins, bar 1 SD`, X0 + 6, 148);
  // The number. Green under MZ7's ON seal of 18, red above it.
  const live = verdictChi2(GALAXY.haloOn), other = verdictChi2(!GALAXY.haloOn);
  c.fillStyle = live < 18 ? '#8ee6c8' : '#ff6b5a';
  c.fillText(`VERDICT chi2/nu ${live.toFixed(1)}   (halo ${GALAXY.haloOn ? 'OFF' : 'ON'}` +
    ` would read ${other.toFixed(1)})`, 8, 178);
  // B2: where the knob is sitting. M200, never MS — CHEATS #21.
  const nv = nfwM200(GALAXY.MS);
  const atFloor = Math.abs(GALAXY.MS / GALAXY.MS_CAL - 0.993) < 0.01;
  c.fillStyle = atFloor ? '#8ee6c8' : '#8fa4b4';
  c.fillText(`halo ${(GALAXY.MS / GALAXY.MS_CAL).toFixed(2)}x   ` +
    `M200 ${nv.M200.toExponential(2)} Msun   , . dial   / reset   u undo`, 8, 194);
  drawValley(c);
}

// B3: the valley strip. Log in both axes — the knob travels 30x and chi2/nu
// travels 330x, so nothing else fits. The floor, its width, and your own
// position, on one 44-pixel band.
function drawValley(c) {
  const X0 = VERD.X0, X1 = VERD.X1, Y0 = 230, Y1 = 274;
  c.strokeStyle = '#2c313a'; c.lineWidth = 1;
  c.beginPath(); c.moveTo(8, 212); c.lineTo(312, 212); c.stroke();
  c.font = '10px monospace';
  if (!VALLEY.pts.length) {
    c.fillStyle = '#6f7d88';
    c.fillText('VALLEY — press m to load the sky', 8, 226);
    return;
  }
  const L = Math.log10(VALLEY.lo), span = Math.log10(VALLEY.hi) - L;
  const loC = Math.log10(VALLEY.min.chi), hiC = Math.log10(VALLEY.max);
  const lx = (r) => X0 + (Math.log10(r) - L) / span * (X1 - X0);
  const ly = (chi) => Y1 - (Math.log10(chi) - loC) / (hiC - loC) * (Y1 - Y0);

  c.fillStyle = '#8ee6c8';
  c.fillText(`VALLEY — chi2/nu across the knob's travel`, 8, 226);

  // the chi2+1 band: how narrow the floor is
  if (VALLEY.wLo && VALLEY.wHi) {
    c.fillStyle = 'rgba(142,230,200,0.18)';
    c.fillRect(lx(VALLEY.wLo), Y0, Math.max(2, lx(VALLEY.wHi) - lx(VALLEY.wLo)), Y1 - Y0);
  }
  // axis
  c.strokeStyle = '#555';
  c.beginPath(); c.moveTo(X0, Y1); c.lineTo(X1, Y1); c.stroke();
  // the curve
  c.strokeStyle = '#ff7a4f'; c.lineWidth = 1.5;
  c.beginPath();
  VALLEY.pts.forEach((p, i) => (i ? c.lineTo(lx(p.r), ly(p.chi)) : c.moveTo(lx(p.r), ly(p.chi))));
  c.stroke();
  // the floor
  c.strokeStyle = '#8ee6c8'; c.lineWidth = 1; c.setLineDash([2, 3]);
  c.beginPath(); c.moveTo(lx(VALLEY.min.r), ly(VALLEY.min.chi)); c.lineTo(lx(VALLEY.min.r), Y1 + 3); c.stroke();
  c.setLineDash([]);
  // where you are standing
  const here = GALAXY.MS / GALAXY.MS_CAL;
  if (here >= VALLEY.lo && here <= VALLEY.hi) {
    const hc = verdictChi2(true);
    c.strokeStyle = '#ffd24f'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(lx(here), Y0); c.lineTo(lx(here), Y1); c.stroke();
    c.fillStyle = '#ffd24f';
    c.beginPath(); c.arc(lx(here), ly(Math.max(hc, VALLEY.min.chi)), 3, 0, 7); c.fill();
  }
  c.fillStyle = '#777';
  c.fillText('0.1x', X0 - 4, Y1 + 13);
  c.fillText('1x', lx(1) - 5, Y1 + 13);
  c.fillText('3x', X1 - 12, Y1 + 13);
  c.fillStyle = '#8ee6c8';
  c.fillText(`floor ${VALLEY.min.chi.toFixed(1)} at ${VALLEY.min.r.toFixed(2)}x` +
    (VALLEY.wLo ? `   +1 band ${VALLEY.wLo.toFixed(2)}-${VALLEY.wHi.toFixed(2)}x` : ''),
    X0 + 30, Y1 + 13);
}

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
    blocks.push(compiledBlock('SOLAR   ', 'solar',
      HOSTED ? null : 'press L for a live Horizons fetch'));
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
    blocks.push(compiledBlock('GAIA PMs', 'gaia',
      'press k in galaxy mode to try the live catalogue'));
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
    blocks.push(compiledBlock('CLUSTERS', 'clusters',
      'press k in galaxy mode to try the live catalogue'));
  }
  // M12h: the FOURTH live dataset — the Cepheid disk.
  if (cepheidProvenance) {
    blocks.push(
      `SOURCE   ${cepheidProvenance.source}\n` +
      `FRAME    ${cepheidProvenance.frame}\n` +
      `RECEIPTS ${cepheidProvenance.receipts}\n` +
      `SESSION  ${cepheidProvenance.session}\n\n` +
      `plotted  ${cepheidProvenance.plotted} (14 far outliers benched — CD1)\n` +
      `bytes    ${cepheidProvenance.bytes}\n` +
      `sha256=${cepheidProvenance.sha256.slice(0, 12)}…  OK`);
  } else {
    blocks.push(compiledBlock('CEPHEIDS', 'cepheids',
      'press w in galaxy mode to try the live catalogue'));
  }
  // M12i: the FIFTH dataset — the measured rotation curve.
  if (mrozProvenance) {
    blocks.push(
      `SOURCE   ${mrozProvenance.source}\n` +
      `METHOD   ${mrozProvenance.method}\n` +
      `RECEIPTS ${mrozProvenance.receipts}\n` +
      `SESSION  ${mrozProvenance.session}\n\n` +
      `plotted  ${mrozProvenance.plotted} (${mrozProvenance.railed} above the 250 axis — railed)\n` +
      `bytes    ${mrozProvenance.bytes}\n` +
      `sha256=${mrozProvenance.sha256.slice(0, 12)}…  OK`);
  } else {
    blocks.push(compiledBlock('CURVE   ', 'mroz',
      'press m in galaxy mode to try the live archive'));
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
  if (HOSTED) {                            // A1.1: answer on screen, not only in the console
    progressBox.style.display = 'block';
    progressFill.style.width = '0%';
    progressLabel.textContent = 'Live Horizons needs the dev server — running on the compiled epoch.';
    setTimeout(() => { progressBox.style.display = 'none'; }, 5000);
    console.log(`AUDIT: L pressed on a ${LIVE_OFF}. The solar epoch in this page is ` +
      `data/bodies.json; press P for its checksum.`);
    return null;
  }
  progressBox.style.display = 'block';
  try {                                    // F5: a failed fetch must LAND, not freeze
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
  } catch (err) {                          // F5: fail loud, stand the bar down
    progressBox.style.display = 'none';
    console.log(`AUDIT: Horizons fetch FAILED — ${fetchNote(err)}. ` +
      `Sim continues on the last good state${HOSTED ? '' : '; press L to retry'}.`);
    return null;
  }
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
    cepheidDisk: cepheidProvenance,
    measuredCurve: mrozProvenance,
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
      `circular speed: ${vc.toFixed(1)} km/s${dialledShort()}\n` +
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
    const sunLapMyr = 2 * Math.PI * 8.2 / (galaxyVCirc(8.2) * KMS_TO_KPC_MYR);   // F3: live — honours h
    hud.textContent += `\nGalaxy clock: ${GAL_STARS.myr.toFixed(0)} Myr — Sun's lap ${sunLapMyr.toFixed(1)} Myr${dialledShort()}`;
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