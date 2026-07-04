import * as THREE from 'three';

// ---------- 1. The stage ----------
// Think movie set: a Scene holds objects, a Camera views them,
// and a Renderer is the crew that draws each frame onto a canvas.
const scene = new THREE.Scene();

// PerspectiveCamera(field-of-view°, aspect ratio, nearest visible dist, farthest)
const camera = new THREE.PerspectiveCamera(
  60, window.innerWidth / window.innerHeight, 0.1, 5000
);
camera.position.z = 100; // back the camera up so we're not inside the stars

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // crisp on HiDPI screens
document.body.appendChild(renderer.domElement); // the <canvas> lands in the page here

// ---------- 2. The stars ----------
// One flat typed array of coordinates: [x0,y0,z0, x1,y1,z1, ...]
// This exact pattern is how we'll render 120,000 real Gaia stars later —
// one buffer shipped to the GPU once, instead of thousands of objects.
const STAR_COUNT = 5000;
const positions = new Float32Array(STAR_COUNT * 3);
for (let i = 0; i < STAR_COUNT; i++) {
  positions[i * 3 + 0] = (Math.random() - 0.5) * 2000; // x
  positions[i * 3 + 1] = (Math.random() - 0.5) * 2000; // y
  positions[i * 3 + 2] = (Math.random() - 0.5) * 2000; // z
}

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3)); // 3 = values per star

const material = new THREE.PointsMaterial({
  color: 0xffffff,
  size: 1.5,
  sizeAttenuation: true, // distant stars render smaller
});

const stars = new THREE.Points(geometry, material);
scene.add(stars);

// ---------- 3. The loop ----------
// requestAnimationFrame asks the browser to call us before every screen
// refresh (~60x/sec). In M2, the physics step will live inside this loop.
function animate() {
  requestAnimationFrame(animate);
  stars.rotation.y += 0.0003; // slow spin — pure proof of life for M0
  renderer.render(scene, camera);
}
animate();

// ---------- 4. Stay correct when the window resizes ----------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix(); // camera must recompute its math after changes
  renderer.setSize(window.innerWidth, window.innerHeight);
});