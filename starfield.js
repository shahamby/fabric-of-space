import * as THREE from 'three';

// One flat typed array of coordinates: [x0,y0,z0, x1,y1,z1, ...]
// This exact pattern is how we'll render 120,000 real Gaia stars later —
// one buffer shipped to the GPU once, instead of thousands of objects.
export function makeStarfield(count = 5000, spread = 2000) {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3 + 0] = (Math.random() - 0.5) * spread; // x
    positions[i * 3 + 1] = (Math.random() - 0.5) * spread; // y
    positions[i * 3 + 2] = (Math.random() - 0.5) * spread; // z
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3)); // 3 = values per star

  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 1.5,
    sizeAttenuation: true, // distant stars render smaller
  });

  return new THREE.Points(geometry, material);
}
