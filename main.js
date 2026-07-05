import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { makeStarfield } from './starfield.js';
import { loadBodyMeshes } from './bodies.js';

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

// ---------- 5. The loop ----------
// requestAnimationFrame asks the browser to call us before every screen
// refresh (~60x/sec). In M2, the physics step will live inside this loop.
function animate() {
  requestAnimationFrame(animate);
  stars.rotation.y += 0.0003; // slow spin — pure proof of life for M0
  controls.update(); // required each frame while damping is enabled
  renderer.render(scene, camera);
}
animate();

// ---------- 6. Stay correct when the window resizes ----------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix(); // camera must recompute its math after changes
  renderer.setSize(window.innerWidth, window.innerHeight);
});