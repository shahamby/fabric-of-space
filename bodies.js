import bodiesData from './data/bodies.json';
import { makeBodyMesh } from './bodyMesh.js';

// Builds one mesh per body in data/bodies.json, in file order (Sun first).
export function loadBodyMeshes() {
  return bodiesData.bodies.map(makeBodyMesh);
}
