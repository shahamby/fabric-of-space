// lab/borisLab.mjs — M10a acceptance receipt: the Boris rotation
// One solar-wind proton, one interplanetary magnetic field, zero dependencies.
// Run:  node lab/borisLab.mjs
//
// Claim under test: the Boris push steers a charged particle around a field
// line WITHOUT ever changing its speed — the magnetic force can only turn,
// never throttle (F = qv×B is always perpendicular to v, so it does no work).
// Speed is our integrity hash: if |v| drifts, the integrator is tampering.

// ---------- Physical constants (SI, CODATA) ----------
const Q_P = 1.602176634e-19;    // proton charge [C]  (exact by SI definition)
const M_P = 1.67262192369e-27;  // proton mass   [kg]

// ---------- The scenario ----------
const B  = [0, 0, 5e-9];        // 5 nT field along +z [T] — typical IMF at 1 AU
const V0 = 4.0e5;               // 400 km/s [m/s] — typical solar-wind speed
// Velocity starts fully perpendicular to B, so the truth is a closed circle.

// ---------- Analytic truth the receipt must reproduce ----------
const OMEGA  = (Q_P * B[2]) / M_P;         // cyclotron frequency [rad/s]
const T_TRUE = (2 * Math.PI) / OMEGA;      // gyro-period [s]  (~13.1 s)
const R_TRUE = (M_P * V0) / (Q_P * B[2]);  // gyro-radius [m]  (~835 km)

// ---------- The Boris push ----------
// Velocity-only update. Encodes a rotation about B by angle ~ omega*dt using
// two cross products — no sin/cos calls, and the speed is preserved EXACTLY
// in exact arithmetic. Floating-point rounding is the only possible leak.
function borisPush(v, q, m, Bf, dt) {
  const k  = (q / m) * (dt / 2);
  const t  = [Bf[0] * k, Bf[1] * k, Bf[2] * k];            // half-angle vector
  const t2 = t[0] * t[0] + t[1] * t[1] + t[2] * t[2];
  const s  = [2 * t[0] / (1 + t2), 2 * t[1] / (1 + t2), 2 * t[2] / (1 + t2)];
  const vp = [                                             // v' = v + v x t
    v[0] + v[1] * t[2] - v[2] * t[1],
    v[1] + v[2] * t[0] - v[0] * t[2],
    v[2] + v[0] * t[1] - v[1] * t[0],
  ];
  return [                                                 // v+ = v + v' x s
    v[0] + vp[1] * s[2] - vp[2] * s[1],
    v[1] + vp[2] * s[0] - vp[0] * s[2],
    v[2] + vp[0] * s[1] - vp[1] * s[0],
  ];
}

// ---------- One measured run ----------
function gyroRun(dt, cycles) {
  let pos = [0, 0, 0];
  let vel = [V0, 0, 0];
  const speed0 = Math.hypot(...vel);
  const steps  = Math.ceil((cycles * T_TRUE) / dt);

  let worstSpeedDrift = 0;
  let sumX = 0, sumY = 0;
  const xs = [], ys = [];
  const crossings = [];               // times when vy crosses 0 going upward
  let prevVy = vel[1], tNow = 0;

  for (let i = 0; i < steps; i++) {
    vel = borisPush(vel, Q_P, M_P, B, dt);
    pos = [pos[0] + vel[0] * dt, pos[1] + vel[1] * dt, pos[2] + vel[2] * dt];
    tNow += dt;

    const drift = Math.abs(Math.hypot(...vel) - speed0) / speed0;
    if (drift > worstSpeedDrift) worstSpeedDrift = drift;

    xs.push(pos[0]); ys.push(pos[1]);
    sumX += pos[0];  sumY += pos[1];

    if (prevVy < 0 && vel[1] >= 0) {                 // upward zero-crossing
      const f = prevVy / (prevVy - vel[1]);          // sub-step interpolation
      crossings.push(tNow - dt + f * dt);
    }
    prevVy = vel[1];
  }

  // Period: average spacing of the interpolated zero-crossings.
  let period = NaN;
  if (crossings.length >= 2) {
    period = (crossings[crossings.length - 1] - crossings[0]) / (crossings.length - 1);
  }

  // Radius: mean distance from the orbit centroid. Constant speed means the
  // samples are uniform in angle, so the centroid is an honest circle center.
  const cx = sumX / xs.length, cy = sumY / ys.length;
  let sumR = 0;
  for (let i = 0; i < xs.length; i++) sumR += Math.hypot(xs[i] - cx, ys[i] - cy);
  const radius = sumR / xs.length;

  return { worstSpeedDrift, period, radius };
}

// ---------- The receipt ----------
const DT = 0.1;                        // seconds; omega*dt ~ 0.048 — resolved
const runA = gyroRun(DT, 50);
const runB = gyroRun(DT / 2, 50);

const perErrA = Math.abs(runA.period - T_TRUE) / T_TRUE;
const perErrB = Math.abs(runB.period - T_TRUE) / T_TRUE;
const radErrA = Math.abs(runA.radius - R_TRUE) / R_TRUE;
const ratio   = perErrA / perErrB;     // DT-squared law predicts ~ 4

const pass = (ok) => ok ? "PASS" : "FAIL";
console.log("M10a receipt — Boris rotation, solar-wind proton in 5 nT");
console.log(`analytic  period ${T_TRUE.toFixed(6)} s   radius ${(R_TRUE / 1e3).toFixed(2)} km`);
console.log(`measured  period ${runA.period.toFixed(6)} s   radius ${(runA.radius / 1e3).toFixed(2)} km   (DT ${DT})`);
console.log("");
console.log(`CHECK 1  speed conservation   worst drift ${runA.worstSpeedDrift.toExponential(2)}   ${pass(runA.worstSpeedDrift < 1e-12)}`);
console.log(`CHECK 2  vs analytic          period err ${perErrA.toExponential(2)}, radius err ${radErrA.toExponential(2)}   ${pass(perErrA < 5e-4 && radErrA < 5e-4)}`);
console.log(`CHECK 3  DT-squared law       err(DT)/err(DT/2) = ${ratio.toFixed(2)}   ${pass(ratio > 3.3 && ratio < 4.7)}`);
// Check 4 - charge-sign handedness
// Test answer is known. Right-hand rule at the desk states:
// proton -> first push toward the chest -> forward speed becomes negative
// flipped -> mirror image -> forward speed becomes positive
const oneStepProton = borisPush([V0, 0, 0], Q_P, M_P, B, DT); // negative push
const oneStepFlipped = borisPush([V0, 0, 0], -Q_P, M_P, B, DT); // positive push

const check4 = (oneStepProton[1] < 0) && (oneStepFlipped[1] > 0);
console.log(`Check 4  charge-sign handedness  proton  vy  ${oneStepProton[1].toExponential(2)}, flipped vy  ${oneStepFlipped[1].toExponential(2)} ${pass(check4)}`);

