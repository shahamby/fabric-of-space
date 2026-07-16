// lab/dipoleLab.mjs — M10c acceptance receipt: the dipole field and the magnetic mirror
// One solar-wind proton, one ideal dipole, zero dependencies.
// Run from the repo root:  node lab/dipoleLab.mjs
//
// Claims under test:
//   1. dipoleB() falls off as the inverse CUBE — twice the distance, one-eighth the field.
//   2. Dipole anatomy — over the pole the field is exactly 2x the equator value at the same r.
//   3. The free watchdog survives curvature — speed stays sealed even when B varies in
//      space (F = q v x B is perpendicular to v no matter how B twists; the THEOREM is
//      the enforcement point, so the watchdog needed zero new code).
//   4. THE MIRROR — a proton launched at tilt ALPHA0 off the field line must turn around
//      exactly where the field reaches  (home field) / sin^2(tilt).  Your paper number,
//      measured on this machine.

// ---------- Physical constants (SI, CODATA) ----------
const Q_P     = 1.602176634e-19;   // proton charge [C] (exact by SI definition)
const M_P     = 1.67262192369e-27; // proton mass [kg]
const MU0_4PI = 1e-7;              // mu0 / 4pi [T*m/A]
const AU      = 1.495978707e11;    // astronomical unit [m]

// ---------- The scenario knobs ----------
const B0_EQ      = 5e-9;  // home field: strength at the 1 AU equator crossing [T] (M10a continuity)
const V0         = 4.0e5; // 400 km/s solar-wind speed [m/s]
const ALPHA0_DEG = 30;    // <<< YOUR KNOB: the launch tilt, in degrees. Your paper
                          //     prediction must be computed for THIS angle.

// Dipole moment sized so the equator field at 1 AU is exactly B0_EQ. The moment VECTOR
// points -z (south), like Earth's — field lines run south-to-north, so our proton
// climbs toward the NORTH pole.
const M_DIP = B0_EQ * AU ** 3 / MU0_4PI; // [A*m^2]

// ---------- The field ----------
// B(r) = (mu0/4pi) * ( 3(m.rhat)rhat - m ) / r^3   with  m = (0, 0, -M_DIP)
function dipoleB(p) {
  const x = p[0], y = p[1], z = p[2];
  const r2 = x * x + y * y + z * z;
  const r  = Math.sqrt(r2);
  const r5 = r2 * r2 * r;
  const mdotr = -M_DIP * z;                       // m . r  (moment is [0, 0, -M_DIP])
  return [
    MU0_4PI * (3 * mdotr * x) / r5,
    MU0_4PI * (3 * mdotr * y) / r5,
    MU0_4PI * (3 * mdotr * z + M_DIP * r2) / r5,  // "- m_z" with m_z = -M_DIP flips to +
  ];
}

// ---------- The Boris push (identical scheme to borisLab.mjs / physics.js) ----------
// Velocity-only rotation about the LOCAL field. Speed-exact in exact arithmetic;
// floating-point rounding is the only possible leak — CHECK 3 hunts for it.
function borisPush(v, q, m, Bf, dt) {
  const k  = (q / m) * (dt / 2);
  const t  = [Bf[0] * k, Bf[1] * k, Bf[2] * k];
  const t2 = t[0] * t[0] + t[1] * t[1] + t[2] * t[2];
  const s  = [2 * t[0] / (1 + t2), 2 * t[1] / (1 + t2), 2 * t[2] / (1 + t2)];
  const vp = [
    v[0] + v[1] * t[2] - v[2] * t[1],
    v[1] + v[2] * t[0] - v[0] * t[2],
    v[2] + v[0] * t[1] - v[1] * t[0],
  ];
  return [
    v[0] + vp[1] * s[2] - vp[2] * s[1],
    v[1] + vp[2] * s[0] - vp[0] * s[2],
    v[2] + vp[0] * s[1] - vp[1] * s[0],
  ];
}

// ---------- Small helpers ----------
const mag = (v) => Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
const fmt = (x, d = 6) => x.toFixed(d);

// Analytic field strength along a dipole field line, relative to its equator crossing:
//   B(lat) / B(equator) = sqrt(1 + 3 sin^2 lat) / cos^6 lat
function ratioAtLat(latRad) {
  const s = Math.sin(latRad), c = Math.cos(latRad);
  return Math.sqrt(1 + 3 * s * s) / (c ** 6);
}

// Invert it by bisection: find the latitude where the line's field reaches `target` x home.
function latitudeForRatio(target) {
  let lo = 0, hi = 1.55; // radians, just shy of the pole
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (ratioAtLat(mid) < target) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

let failures = 0;
function report(name, detail, pass) {
  console.log(`CHECK ${name} ${pass ? "PASS" : "FAIL"} — ${detail}`);
  if (!pass) failures++;
}

console.log("=== dipoleLab — M10c acceptance ===\n");

// ---------- CHECK 1: inverse-cube falloff ----------
// Twice the distance must mean exactly one-eighth the field (2^3 = 8).
{
  const near = mag(dipoleB([AU, 0, 0]));
  const far  = mag(dipoleB([2 * AU, 0, 0]));
  const ratio = near / far;
  report("1 (inverse-cube falloff)",
    `equator field at r vs 2r: ratio ${fmt(ratio, 9)} (want 8 exactly)`,
    Math.abs(ratio - 8) < 1e-9);
}

// ---------- CHECK 2: dipole anatomy ----------
// Over the pole the field is exactly TWICE the equator value at the same distance.
{
  const eq   = mag(dipoleB([AU, 0, 0]));
  const pole = mag(dipoleB([0, 0, AU]));
  const ratio = pole / eq;
  report("2 (pole = 2x equator)",
    `pole/equator at 1 AU: ${fmt(ratio, 9)} (want 2 exactly)`,
    Math.abs(ratio - 2) < 1e-9);

  // sanity: home field really is the 5 nT we normalized to
  console.log(`        (home field at 1 AU equator: ${(eq * 1e9).toFixed(3)} nT)`);
}

// ---------- THE MIRROR RUN (feeds CHECK 3 and CHECK 4) ----------
const alpha  = (ALPHA0_DEG * Math.PI) / 180;   // launch tilt in radians (Math.sin wants radians)
const paperMultiple = 1 / Math.sin(alpha) ** 2; // <<< the number YOUR paper should hold
const predLatDeg    = (latitudeForRatio(paperMultiple) * 180) / Math.PI;

// Launch at the 1 AU equator crossing. Field there points +z, so:
//   parallel part  = V0 * cos(tilt)  along +z  (the climb)
//   spin part      = V0 * sin(tilt)  in the equator plane (pick +y)
let pos = [AU, 0, 0];
let vel = [0, V0 * Math.sin(alpha), V0 * Math.cos(alpha)];

// Timestep honesty: resolve the FASTEST gyration on the path — at the wall, not at home.
const T_HOME = (2 * Math.PI * M_P) / (Q_P * B0_EQ);   // gyro-period at launch [s] (~13.1 s)
const T_WALL = T_HOME / paperMultiple;                 // shortest period, at the bounce
const DT     = T_WALL / 100;                           // 100 steps per fastest loop
const T_MAX  = 5e6;                                    // give-up horizon [s] — a run that
                                                       // never bounces must FAIL LOUD (#8)

let maxSpeedDrift = 0;
let prevVpar = NaN, prevLat = NaN, prevBmag = NaN;
let bounceLatDeg = NaN, bounceMultiple = NaN, bounceDay = NaN;
let steps = 0;

for (let t = 0; t < T_MAX; t += DT) {
  const Bf = dipoleB(pos);
  vel = borisPush(vel, Q_P, M_P, Bf, DT);
  pos = [pos[0] + vel[0] * DT, pos[1] + vel[1] * DT, pos[2] + vel[2] * DT];
  steps++;

  // watchdog: relative speed drift (theorem says zero; rounding is the only leak)
  const drift = Math.abs(mag(vel) - V0) / V0;
  if (drift > maxSpeedDrift) maxSpeedDrift = drift;

  // parallel velocity = velocity projected on the LOCAL field direction
  const Bmag = mag(Bf);
  const vpar = (vel[0] * Bf[0] + vel[1] * Bf[1] + vel[2] * Bf[2]) / Bmag;
  const lat  = Math.asin(pos[2] / mag(pos)) * (180 / Math.PI);

  // the bounce: the climb runs out — vpar crosses zero. Sub-step interpolate (M8f lesson:
  // grid-locked readings lie; photograph the crossing, not the nearest step).
  if (prevVpar > 0 && vpar <= 0) {
    const f = prevVpar / (prevVpar - vpar);
    bounceLatDeg   = prevLat + f * (lat - prevLat);
    bounceMultiple = (prevBmag + f * (Bmag - prevBmag)) / (B0_EQ);
    bounceDay      = (t + f * DT) / 86400;
    break;
  }
  prevVpar = vpar; prevLat = lat; prevBmag = Bmag;
}

// ---------- CHECK 3: the free watchdog, curved edition ----------
report("3 (speed hash, curved field)",
  `max relative speed drift over ${steps.toLocaleString()} steps: ${maxSpeedDrift.toExponential(2)} (limit 1e-9)`,
  maxSpeedDrift < 1e-9);

// ---------- CHECK 4: THE MIRROR ----------
if (Number.isNaN(bounceLatDeg)) {
  report("4 (the mirror)", `no bounce within ${T_MAX / 86400} days — the gauge has no needle`, false);
} else {
  console.log(`\n--- CHECK 4: THE MIRROR (launch tilt ${ALPHA0_DEG}°) ---`);
  console.log(`  your paper number  (wall = home / sin^2 tilt): ${fmt(paperMultiple, 4)}x home`);
  console.log(`  measured           (field at bounce / home):   ${fmt(bounceMultiple, 4)}x home`);
  console.log(`  predicted bounce latitude: ${fmt(predLatDeg, 2)}°   measured: ${fmt(bounceLatDeg, 2)}°`);
  console.log(`  bounce reached on sim day ${fmt(bounceDay, 2)} after ${steps.toLocaleString()} steps\n`);
  const wallOK = Math.abs(bounceMultiple - paperMultiple) / paperMultiple < 0.005; // 0.5 %
  const latOK  = Math.abs(bounceLatDeg - predLatDeg) < 0.3;                        // 0.3 deg
  report("4 (the mirror)",
    `wall multiple within 0.5% and latitude within 0.3° of prediction`,
    wallOK && latOK);
}

console.log(failures === 0
  ? "\nALL CHECKS PASS — the dipole is fit for physics.js. The proton bounced: the aurora's opening act, on this machine."
  : `\nLAB FAILED — ${failures} check(s) red. Do not wire this field into physics.js.`);
process.exitCode = failures === 0 ? 0 : 1;