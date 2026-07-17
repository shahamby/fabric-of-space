// lab/radiationLab.mjs — M11 pre-registration: radiation pressure on a dust grain
// Sun fixed at origin (grain mass ~1e-15 kg — back-reaction is below double precision).
// SI units inside. AU and days only at the printouts.
// Run:  node lab/radiationLab.mjs

// ---------- constants (SI) ----------
const G   = 6.674e-11;      // gravity constant
const M   = 1.989e30;       // Sun mass, kg
const L   = 3.828e26;       // Sun luminosity, watts
const c   = 2.998e8;        // speed of light, m/s
const AU  = 1.496e11;       // meters
const DAY = 86400;          // seconds
const DT  = 3600;           // one step = one hour
const RHO = 3000;           // rocky grain density, kg/m^3
const GM  = G * M;

// ---------- the grain ----------
// beta = push/pull = 3L / (16*pi*G*M*c*rho*s) — no distance anywhere in it.
const K = 3 * L / (16 * Math.PI * GM * c * RHO);    // beta = K / s
function makeGrain(s) {                              // s = grain radius, meters
  return { s, m: (4/3) * Math.PI * RHO * s**3, A: Math.PI * s * s };
}
const grainForBeta = b => makeGrain(K / b);

// ---------- forces, from first principles ----------
const aGrav = r      => GM / (r * r);                              // pull, m/s^2
const aRad  = (g, r) => L * g.A / (4 * Math.PI * r * r * c * g.m); // push, m/s^2

function accel(g, p) {                        // net acceleration vector at position p
  const r = Math.hypot(p[0], p[1]);
  const k = (aRad(g, r) - aGrav(r)) / r;      // + outward, - inward
  return [k * p[0], k * p[1]];
}

function step(g, p, v) {                      // leapfrog, kick-drift-kick
  let a = accel(g, p);
  v[0] += 0.5 * DT * a[0];  v[1] += 0.5 * DT * a[1];
  p[0] += DT * v[0];        p[1] += DT * v[1];
  a = accel(g, p);
  v[0] += 0.5 * DT * a[0];  v[1] += 0.5 * DT * a[1];
}

// ========== W1 — push/pull ratio at three distances ==========
console.log('--- W1: one number everywhere ---');
const g1 = makeGrain(0.5e-6);                 // half-micron rocky grain
const radii = [0.5, 1, 2];
const betas = radii.map(x => aRad(g1, x * AU) / aGrav(x * AU));
betas.forEach((b, i) => console.log(`  r = ${radii[i]} AU   beta = ${b.toFixed(4)}`));
const spread = (Math.max(...betas) - Math.min(...betas)) / betas[1];
console.log(spread < 1e-9 ? '  W1 PASS' : `  W1 FAIL — spread ${spread}`);

// ========== W2 — beta 0.5: the lighter-Sun year ==========
console.log('--- W2: beta 0.5 circular orbit ---');
{
  const g = grainForBeta(0.5);
  const p = [AU, 0];
  const v = [0, Math.sqrt(0.5 * GM / AU)];    // circular speed for a HALF-mass Sun
  const predicted = 2 * Math.PI * Math.sqrt(AU**3 / (0.5 * GM)) / DAY;
  let prev = 0, t = 0, lap = 0;
  while (lap === 0) {
    step(g, p, v);  t += DT;
    const off = Math.atan2(p[1], p[0]);       // angle past the start line
    if (t > 100 * DAY && prev < 0 && off >= 0) {
      const f = prev / (prev - off);          // the M10d sub-step stamp
      lap = (t - (1 - f) * DT) / DAY;
    }
    prev = off;
  }
  console.log(`  predicted ${predicted.toFixed(2)} d   measured ${lap.toFixed(2)} d`);
  console.log(Math.abs(lap - predicted) < 0.1 ? '  W2 PASS' : '  W2 FAIL');
}

// ========== W3 — the blowout knife-edge at beta = 1/2 ==========
console.log('--- W3: released from a parent on a circular orbit ---');
function release(beta, maxDays) {
  const g = grainForBeta(beta);
  const p = [AU, 0];
  const v = [0, Math.sqrt(GM / AU)];          // FULL-Sun circular speed — the parent's speed
  let rMax = AU, t = 0;
  while (t < maxDays * DAY) {
    step(g, p, v);  t += DT;
    const r = Math.hypot(p[0], p[1]);
    if (r > rMax) rMax = r;
    else if (r < rMax && rMax > 2 * AU)
      return { fate: 'BOUND', rAU: rMax / AU, day: t / DAY };   // it turned around
  }
  const r  = Math.hypot(p[0], p[1]);
  const vr = (p[0] * v[0] + p[1] * v[1]) / r;
  return { fate: vr > 0 ? 'ESCAPING' : 'BOUND', rAU: r / AU, day: t / DAY };
}
const A = release(0.49, 40000);
console.log(`  beta 0.49 -> ${A.fate} — apoapsis ${A.rAU.toFixed(2)} AU (paper says 50.00)`);
const B = release(0.51, 16000);
console.log(`  beta 0.51 -> ${B.fate} — r = ${B.rAU.toFixed(1)} AU at day ${B.day.toFixed(0)}`);
const w3 = A.fate === 'BOUND' && Math.abs(A.rAU - 50) < 0.25 && B.fate === 'ESCAPING' && B.rAU > 50;
console.log(w3 ? '  W3 PASS — the knife-edge is beta = 1/2' : '  W3 FAIL');

// ========== W4 — beta = 1: the vanished Sun ==========
// ============ SHAMBU'S CHECK — type your code below this line ============
console.log('--- W4: beta 1 straight-line coast (Shambu) ---');

// added by Shambu
const g = grainForBeta(1);
const p = [AU, 0];  const v = [0, 15000];  const v0 = 15000;
let worst = 0;
for (let i = 0; i < 1000 * 24; i++) {
    step(g, p, v);
    const drift = Math.abs(p[0] - AU);
    if (drift > worst) {
        worst = drift;
    }
}

const speedDrift = Math.abs(Math.hypot(v[0], v[1]) - v0) / v0;

console.log("Worst:", worst);
console.log("Speed Drift:", speedDrift);

if (speedDrift < 1e-9 && worst < 1e6) {
    console.log("PASS");
} else {
    console.log("FAIL");
}
