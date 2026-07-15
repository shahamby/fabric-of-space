// lab/turnOrderLab.mjs — M10b design receipt: WHERE the turn sits is physics.
// One particle, uniform gravity + uniform magnetic field, 10 s flight,
// judged against a converged reference. Three arrangements on trial:
//   A  turn, kick, drift, kick            (the typed deviation — the sandwich)
//   B  kick, turn, drift, kick            (the original spec — retired)
//   C  turn/2, kick, drift, kick, turn/2  (the bracket — SHIPPED in physics.js)
// Verdicts this receipt exists to preserve:
//   the deviation beat the spec 2.7x; both simple placements fail the DT²
//   law (a one-time seam at the first step); the bracket irons the seam,
//   restores DT², and lands ~73x closer to truth.
// Run:  node lab/turnOrderLab.mjs
const wz = 1.0;                 // turn rate, rad/s (plays the role of qm·B)
const g  = [0.3, 0, 0];         // uniform pull, perpendicular to the field axis

function rot(v, dt) {           // boris rotation about z — same algebra as physics.js
  const tz = wz * dt / 2, sz = 2 * tz / (1 + tz * tz);
  const vp = [v[0] + v[1] * tz, v[1] - v[0] * tz, v[2]];
  return [v[0] + vp[1] * sz, v[1] - vp[0] * sz, v[2]];
}
const kick = (v, h) => [v[0] + g[0] * h, v[1] + g[1] * h, v[2] + g[2] * h];

function run(kind, dt, T) {
  let v = [1, 0, 0], x = [0, 0, 0];
  const h = dt / 2, n = Math.round(T / dt);
  for (let i = 0; i < n; i++) {
    if (kind === 'A')      { v = rot(v, dt); v = kick(v, h); }
    else if (kind === 'B') { v = kick(v, h); v = rot(v, dt); }
    else                   { v = rot(v, h);  v = kick(v, h); }
    x = [x[0] + v[0] * dt, x[1] + v[1] * dt, x[2] + v[2] * dt];
    v = kick(v, h);
    if (kind === 'C') v = rot(v, h);
  }
  return x;
}

const ref = run('C', 1e-5, 10);            // converged reference trajectory
const err = (x) => Math.hypot(x[0] - ref[0], x[1] - ref[1], x[2] - ref[2]);

const e = {};
for (const k of ['A', 'B', 'C']) e[k] = [err(run(k, 0.05, 10)), err(run(k, 0.025, 10))];
const shrink = (k) => e[k][0] / e[k][1];

console.log('turn-order receipt — err vs converged truth after 10 s');
console.log('scheme                      dt 0.05      dt 0.025     shrink on halving');
console.log(`A  sandwich (deviation)     ${e.A[0].toExponential(3)}    ${e.A[1].toExponential(3)}    x${shrink('A').toFixed(2)}`);
console.log(`B  spec (retired)           ${e.B[0].toExponential(3)}    ${e.B[1].toExponential(3)}    x${shrink('B').toFixed(2)}`);
console.log(`C  bracket (shipped)        ${e.C[0].toExponential(3)}    ${e.C[1].toExponential(3)}    x${shrink('C').toFixed(2)}`);
console.log('');
const pass = (ok) => ok ? 'PASS' : 'FAIL';
console.log(`CHECK 1  deviation beat the spec        B/A = ${(e.B[0] / e.A[0]).toFixed(2)} (want > 2)      ${pass(e.B[0] / e.A[0] > 2)}`);
console.log(`CHECK 2  bracket restores the DT² law   shrink x${shrink('C').toFixed(2)} (want 3.3..4.7)   ${pass(shrink('C') > 3.3 && shrink('C') < 4.7)}`);
console.log(`CHECK 3  bracket crushes the seam       A/C = ${(e.A[0] / e.C[0]).toFixed(1)} (want > 10)     ${pass(e.A[0] / e.C[0] > 10)}`);
