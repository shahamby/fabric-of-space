// physics.js — the mathematical heart of fabric-of-space.
// Runs ENTIRELY in simulation space: barycentric ecliptic coordinates,
// in AU, days, and solar masses. Nothing in this file knows Three.js
// exists — rendering translates our numbers, never the other way around.

// ---------- Gravity ----------
// Newton: every pair of bodies attracts with F = G·mA·mB / r².
// We want each body's ACCELERATION (a = F/m), so each body's own mass
// drops out of its side of the equation.
export function computeAccelerations(bodies, G, vLead = 0) {
  for (const b of bodies) b.acc[0] = b.acc[1] = b.acc[2] = 0;

  // Visit every unique PAIR exactly once (j always starts above i).
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const A = bodies[i], B = bodies[j];

      const dx = B.pos[0] - A.pos[0];
      const dy = B.pos[1] - A.pos[1];
      const dz = B.pos[2] - A.pos[2];
      const r2 = dx*dx + dy*dy + dz*dz;
      const r  = Math.sqrt(r2);

      // G / r³: the third division by r turns (dx,dy,dz) into a pure
      // direction. Each body is accelerated by the OTHER body's mass —
      // heavy things pull hard but are themselves hard to move.
      const s  = G / (r2 * r);
      const sA = s * B.mass;   // what B does to A
      const sB = s * A.mass;   // what A does to B

      A.acc[0] += sA * dx;  A.acc[1] += sA * dy;  A.acc[2] += sA * dz;
      B.acc[0] -= sB * dx;  B.acc[1] -= sB * dy;  B.acc[2] -= sB * dz;
      // ^ This +=/-= pair is Newton's third law written as code:
      //   equal pulls, opposite directions, computed once per pair.
    }
  }
  if (PN1.on) apply1PN(bodies, G, vLead);   // Einstein rides ONCE per re-aim, roster-wide
  applyRadiation(bodies, G);                // M11: light pushes ONCE per re-aim
}

// ---------- The integrator: leapfrog (kick-drift-kick) ----------
// Why not the "obvious" way — move along velocity, recompute, repeat?
// That's Euler's method, and it systematically INJECTS energy: orbits
// spiral outward. Leapfrog interleaves half-updates so the errors cancel
// instead of accumulating — energy wobbles but never trends. Same cost,
// wildly better behavior. You'll prove this yourself in exercise 1.
//
// Contract: bodies[i].acc must be current when this is called. Prime it
// with one computeAccelerations() at startup; every step after that
// leaves acc fresh for the next.
//
// M10b: charged bodies (qm ≠ 0) get a half TURN at each edge of the step.
// Consecutive steps fuse the trailing half with the next leading half —
// the textbook Boris sandwich, with every seam ironed (see lab receipt).
export function leapfrogStep(bodies, dt, G) {
  const h = dt / 2;
  if (BFIELD.on) borisTurn(bodies, dt / 2);  // TURN: first half — speed untouched
  for (const b of bodies) {            // KICK: half-step the velocity
    b.vel[0] += b.acc[0] * h;
    b.vel[1] += b.acc[1] * h;
    b.vel[2] += b.acc[2] * h;
  }
  for (const b of bodies) {            // DRIFT: full-step the position
    b.pos[0] += b.vel[0] * dt;
    b.pos[1] += b.vel[1] * dt;
    b.pos[2] += b.vel[2] * dt;
  }
  computeAccelerations(bodies, G, h);  // gravity at the NEW positions — and tell
                                       // Einstein how far the velocities lag them
  for (const b of bodies) {            // KICK: the other half
    b.vel[0] += b.acc[0] * h;
    b.vel[1] += b.acc[1] * h;
    b.vel[2] += b.acc[2] * h;
  }
  if (BFIELD.on) borisTurn(bodies, dt / 2);  // TURN: other half — fuses with next step's first
}

// ---------- The integrity monitor ----------
// Real gravity conserves total energy exactly. Our discretized gravity
// can't — the finite timestep is the ONE approximation the physics is
// allowed, and this function measures it instead of hiding it. If the
// logged drift trends instead of oscillating, the physics is lying.
// (Bonus: the potential loop below is, per unit mass, the exact formula
// M3 will use to bend the fabric. You're validating it a milestone early.)
export function totalEnergy(bodies, G) {
  let ke = 0, pe = 0;
  for (const b of bodies) {
    const [vx, vy, vz] = b.vel;
    ke += 0.5 * b.mass * (vx*vx + vy*vy + vz*vz);
  }
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const A = bodies[i], B = bodies[j];
      const dx = B.pos[0]-A.pos[0], dy = B.pos[1]-A.pos[1], dz = B.pos[2]-A.pos[2];
      pe -= G * A.mass * B.mass / Math.sqrt(dx*dx + dy*dy + dz*dz);
    }
  }
  return ke + pe;  // absolute value is meaningless to us; the DRIFT is everything
}

// eualerStep = the "obvious" (well for those that are good at math) method, and the control group for my little experiment.
// Kept here for a reason and is to never be wired into real simulation. It is a control group for the leapfrog method, and is used to demonstrate the energy drift that occurs with the naive method.
export function eulerStep(bodies, dt, G) {
  computeAccelerations(bodies, G);     // aim Once: where does gravity pull, here?
  for (const b of bodies) {            // Go STRAIGHT for the entire step.
    b.pos[0] += b.vel[0] * dt;
    b.pos[1] += b.vel[1] * dt;
    b.pos[2] += b.vel[2] * dt;
  }
  for (const b of bodies) {            // Adjust the velocity for the next step -- but the position is already wrong.
    b.vel[0] += b.acc[0] * dt;
    b.vel[1] += b.acc[1] * dt;
    b.vel[2] += b.acc[2] * dt;
  }
}

// M8b — first post-Newtonian correction (1PN), Sun's field only.
// Newton is the fast-and-far-away approximation of gravity. This is
// Einstein's leading correction: suppressed by 1/c², so it only matters
// deep in the well, moving fast — which is Mercury's exact job description.
export const PN1 = { on: false };        // main.js flips this with the E key
// W1: the speed of light is a CONSTANT, not a law. TRUTH pins it at the
// measured value; WHAT IF may move it, and the 1PN correction then does
// exactly what it always did — 1/c^2 suppressed — only louder. LIGHT.cal is
// the measured value and is never dialled; LIGHT.c is what the engine reads.
export const LIGHT = { c: 173.144632, cal: 173.144632 };   // AU/day

function apply1PN(bodies, G, vLead) {
  const sun = bodies.find(b => b.name === 'Sun');
  const gm = G * sun.mass;
  for (const b of bodies) {
    if (b === sun) continue;
    const rx = b.pos[0]-sun.pos[0], ry = b.pos[1]-sun.pos[1], rz = b.pos[2]-sun.pos[2];
    // M8d TOCTOU fix — time-of-check vs time-of-use. Mid-leapfrog, positions
    // sit at t+dt but velocities at t+dt/2: Einstein's velocity-dependent term
    // was reading a speedometer from half a step ago, every step, forever —
    // a systematic lag that leaked energy secularly (the 17x drift). Dead-reckon
    // the velocity forward to the positions' instant using the fresh Newtonian
    // acc the pair loop just wrote. vLead = dt/2 mid-step, 0 at prime/re-aim
    // (where clocks are already synchronized).
    const vx = (b.vel[0] + b.acc[0]*vLead) - (sun.vel[0] + sun.acc[0]*vLead);
    const vy = (b.vel[1] + b.acc[1]*vLead) - (sun.vel[1] + sun.acc[1]*vLead);
    const vz = (b.vel[2] + b.acc[2]*vLead) - (sun.vel[2] + sun.acc[2]*vLead);
    const r  = Math.hypot(rx, ry, rz);
    const v2 = vx*vx + vy*vy + vz*vz;
    const rdotv = rx*vx + ry*vy + rz*vz;
    const k = gm / (LIGHT.c*LIGHT.c * r*r*r);      // the 1/c² volume knob
    const radial = 4*gm/r - v2;                    // reshapes the pull with depth & speed
    b.acc[0] += k * (radial*rx + 4*rdotv*vx);      // second piece drags along
    b.acc[1] += k * (radial*ry + 4*rdotv*vy);      // the direction of motion —
    b.acc[2] += k * (radial*rz + 4*rdotv*vz);      // Newton has no such term at all
  }
}

// M9 - Contact phyiscs. Point masses get surfaces: the overlap is measured at PHYSICAL radii.
// The inflated display radii will lie for visibility (it CHEATS).
// The following function will not read them.
export function findContacts(bodies, kmPerAu) { // function to compute contacts
  const hits = [];
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const A  = bodies[i], B = bodies[j];
      const dx = B.pos[0] - A.pos[0], dy = B.pos[1] - A.pos[1], dz = B.pos[2] - A.pos[2];
      const r = Math.sqrt(dx*dx + dy*dy + dz*dz);
      if (r < (A.radius_km + B.radius_km) / kmPerAu) hits.push([i, j]);
    }
  }
  return hits;  // paired indexes only - the roster remains untouched
}

// A pair of trailer park girls collide and latch onto each others hair. Determined to not let go,
// the pair rolls on with their combined momentum, v = (mA*vA + mB*vB)/(mA+mB). The mass adds,
// and so does the volume (r³+r³), the position goes to the mass-weighted of the collision.
export function mergeBodies(A, B) {          // A survives, B is absorbed
  const m = A.mass + B.mass;
  for (let k = 0; k < 3; k++) {
    A.pos[k] = (A.mass*A.pos[k] + B.mass*B.pos[k]) / m;
    A.vel[k] = (A.mass*A.vel[k] + B.mass*B.vel[k]) / m;
  }
  A.radius_km = Math.cbrt(A.radius_km**3 + B.radius_km**3);
  A.mass = m;
}

// ---------- M10b: the magnetic turn ----------
// Steering only — a magnetic field can never change a body's speed,
// so this rotates velocity vectors and touches nothing else.
export const BFIELD = { on: false, eqTesla1AU: 5e-9 };    // ideal solar dipole; main.js flips with B key

const SEC_PER_DAY = 86400;   // the entire unit bridge — exact by definition

// ---------- M10c: the Sun's field, an ideal dipole ----------
// Positions in AU, output in Tesla. Normalized so the equator field at
// 1 AU is exactly BFIELD.eqTesla1AU — the AU enters only as the
// normalization distance, never as a conversion, so the unit bridge
// remains SEC_PER_DAY alone. Moment points ecliptic SOUTH (-z), like
// Earth's, so field lines run south-to-north.
// MODEL CONFESSION: a teaching dipole, NOT the real heliosphere (which
// is Parker-spiral dominated out here). The physics integrates the
// chosen field honestly; the choice itself is the dial.
// Receipts: lab/dipoleLab.mjs (SI physics), lab/dipoleWireLab.mjs (this wiring).
export function dipoleTesla(pos, center) {
  const x = pos[0] - center[0], y = pos[1] - center[1], z = pos[2] - center[2];
  const r2 = x*x + y*y + z*z;                 // AU²; r → 0 is M9 contact territory
  const r5 = r2 * r2 * Math.sqrt(r2);
  const B0 = BFIELD.eqTesla1AU;
  const mdotr = -z;                            // unit moment [0,0,-1] · r
  return [
    B0 * (3 * mdotr * x) / r5,
    B0 * (3 * mdotr * y) / r5,
    B0 * (3 * mdotr * z + r2) / r5,            // "− m_z·r²" with m_z = −1 flips to +r²
  ];
}

function borisTurn(bodies, dt) {
  const halfTurnTime = dt * SEC_PER_DAY / 2;      // our day-clock, in their seconds
  const c = (bodies.find(s => s.name === 'Sun') || { pos: [0, 0, 0] }).pos;
  // ^ the magnet rides the Sun; barycenter fallback if a merge ate it (M9 limit)
  for (const b of bodies) {
    if (!b.qm) continue;                          // neutral bodies are immune
    const k  = b.qm * halfTurnTime;
    const Bf = dipoleTesla(b.pos, c);             // the LOCAL field — sampled here, now
    const t  = [Bf[0] * k, Bf[1] * k, Bf[2] * k];
    const t2 = t[0] * t[0] + t[1] * t[1] + t[2] * t[2];
    const s  = [2 * t[0] / (1 + t2), 2 * t[1] / (1 + t2), 2 * t[2] / (1 + t2)];
    const v  = b.vel;
    const hashBefore = Math.hypot(v[0], v[1], v[2]);   // speed is the integrity hash
    const vp = [
      v[0] + v[1] * t[2] - v[2] * t[1],
      v[1] + v[2] * t[0] - v[0] * t[2],
      v[2] + v[0] * t[1] - v[1] * t[0],
    ];
    v[0] += vp[1] * s[2] - vp[2] * s[1];
    v[1] += vp[2] * s[0] - vp[0] * s[2];
    v[2] += vp[0] * s[1] - vp[1] * s[0];
    const hashAfter = Math.hypot(v[0], v[1], v[2]);
    if (Math.abs(hashAfter - hashBefore) / hashBefore > 1e-12) {
      console.warn(`AUDIT boris: speed hash broke on ${b.name} — integrator tampering`);
    }
  }
}
// ---------- M11: radiation pressure ----------
// A grain with beta feels light's push as a pure fraction of the Sun's pull.
// Both fall off as 1/r², so beta is dimensionless and distance-free — the
// lab distilled it in SI, the engine spends it as-is. No unit bridge at all.
// Photons carry the momentum: no reaction on the Sun. Honest, logged.
function applyRadiation(bodies, G) {
  const sun = bodies.find(b => b.name === 'Sun');
  if (!sun) return;
  for (const b of bodies) {
    if (!b.beta) continue;
    const dx = b.pos[0] - sun.pos[0];
    const dy = b.pos[1] - sun.pos[1];
    const dz = b.pos[2] - sun.pos[2];
    const r2 = dx*dx + dy*dy + dz*dz;
    const s  = b.beta * G * sun.mass / (r2 * Math.sqrt(r2));  // + = outward
    b.acc[0] += s * dx;  b.acc[1] += s * dy;  b.acc[2] += s * dz;
  }
}

// ---------- M12b: the Milky Way's well (galaxy units: kpc, km/s, Msun) ----------
// The SAME three parts the lab measured (lab/galaxyLab.mjs, 5/5). The fabric
// reads THIS function — the rendered well is the measured object.
export const GALAXY = {
  on: false, haloOn: true,
  G: 4.301e-6,                       // kpc·(km/s)²/Msun — audited in W0
  MB: 1.5e10, AB: 0.5,               // bulge
  MD: 6.5e10, AD: 3.0, BD: 0.3,      // disk
  MS: 5.0e11, RS: 16,                // dark halo — MS is a KNOB from B1 on
  MS_CAL: 5.0e11,                    // B0: the frozen calibration mass. Never dialled.
  MBH: 4.30e6,                       // Sgr A* — the published mass (M12f)
  MBH_CAL: 4.30e6,                   // W2a: the frozen published mass. Never dialled.
};
export function galaxyPhi(R) {       // potential at planar radius R kpc, (km/s)²
  const g = GALAXY, r = Math.max(R, 0.05);   // clamp: Sgr A*'s zone, not resolved here
  let phi = -g.G * g.MB / (r + g.AB)
          - g.G * g.MD / Math.sqrt(r * r + (g.AD + g.BD) ** 2);
  if (g.haloOn) phi -= g.G * g.MS * Math.log(1 + r / g.RS) / r;
  phi -= g.G * g.MBH / r;   // M12f: the engine, inside the same clamp.
  return phi;               // B4 receipt: a 0.04 km/s whisper outside 8.6 pc.
}

// W2a: the horizon is a LENGTH the mass already has, not a sphere we drew.
// r_s = 2GM/c^2, in kpc. It reads LIGHT.c, so dialling light slower in WHAT IF
// genuinely GROWS the horizon — hardcoding c here would have been a physics
// cheat wearing a rendering costume. Receipted in lab/captureLab.mjs CP1-CP4.
export function schwarzschildRadius(Msun) {
  const cKms = LIGHT.c * (299792.458 / LIGHT.cal);
  return 2 * GALAXY.G * Msun / (cKms * cKms);
}

// W2b: the sheet's height at radius R, referenced to refR where it is pinned
// to zero. A potential has NO absolute zero — only differences are observable
// — so referencing the sheet to its own rim is a GAUGE CHOICE, not a costume.
// It also keeps the sheet in frame when Sgr A* is dialled: absolute depth ran
// to -51 units and left the camera behind, while the funnel's depth RELATIVE
// to its rim grows 4.04 -> 18.32 and is the thing worth looking at anyway.
//
// The math lives here, not in fabric.js, so lab/captureLab.mjs can reach it.
// The display dials stay in fabric.js and are passed in. Receipts CP7-CP10.
export function galaxySheetY(R, refR, depth, phiRef) {
  const c = (r) => Math.log10(1 + Math.abs(galaxyPhi(r)) / phiRef);
  return -depth * (c(R) - c(refR));
}

// ---------- M12c: stars that RIDE the well (kpc, Myr) ----------
// Same potential, same kick-drift-kick shape as the house integrator.
// Receipted in lab/starsLab.mjs (7/7) before any of it reached the browser.
export const KMS_TO_KPC_MYR = 3.1557e13 / 3.0857e16;   // W0 bridge: 1.0227e-3

export function galaxyVCirc(R) {          // circular speed, km/s, read off Phi
  const h = 1e-4;
  return Math.sqrt(R * (galaxyPhi(R + h) - galaxyPhi(R - h)) / (2 * h));
}

// M12f INSTRUMENT (CHEATS #12): the true inner curve, no 0.05 clamp.
// Panel-only — nothing dynamical ever flies here. Analytic v^2 pieces,
// floored at 0.0001 kpc (0.1 pc, five orders above the horizon).
// Receipted in lab/bhLab.mjs: crossover 8.61 pc, slopes -0.49 / +0.50.
export function galaxyVCircInner(R, withBH, haloOverride) {
  const g = GALAXY, r = Math.max(R, 1e-4), S = g.AD + g.BD;
  // M12j: haloOverride lets a caller ASK for the counterfactual curve
  // without touching GALAXY.haloOn. Omit it and behaviour is unchanged —
  // the F1 lesson built in: no global is mutated just to read a number.
  const halo = haloOverride === undefined ? g.haloOn : haloOverride;
  let v2 = g.G * g.MB * r / ((r + g.AB) ** 2)
         + g.G * g.MD * r * r / ((r * r + S * S) ** 1.5);
  if (halo) {
    const x = r / g.RS;
    v2 += g.G * g.MS * (Math.log(1 + x) - x / (1 + x)) / r;
  }
  if (withBH) v2 += g.G * g.MBH / r;
  return Math.sqrt(v2);
}

export function galaxyAccel(x, y) {       // kpc/Myr^2, inward along r-hat
  const R = Math.max(Math.hypot(x, y), 0.05), h = 1e-4;
  const dPhi = (galaxyPhi(R + h) - galaxyPhi(R - h)) / (2 * h);
  const a = -dPhi * KMS_TO_KPC_MYR * KMS_TO_KPC_MYR / R;
  return [a * x, a * y];
}

export const GAL_STARS = {
  on: false, myr: 0, carry: 0,
  DT: 0.2,            // Myr per fixed step — 500+ steps per inner orbit
  MYR_PER_SEC: 8,     // playback rate; the Sun laps in ~27 s (CHEATS #9)
  tracers: [],        // synthetic disk sample: shape invented, motion real
  real: [],           // HYG sample at true positions
};

function seatStar(name, x, y, z) {        // give it the well's own circular speed
  const R = Math.hypot(x, y), v = galaxyVCirc(R) * KMS_TO_KPC_MYR;
  return { name, x, y, z, vx: v * y / R, vy: -v * x / R, R0: R };
}

// Four straight spokes, 4 -> 25 kpc. They wind because the inner orbits
// are faster. Differential rotation, drawn.
export function seedGalaxyStars(hygSample, n = 240) {
  GAL_STARS.tracers = [];
  for (let i = 0; i < n; i++) {
    const arm = i % 4, k = Math.floor(i / 4);
    const R = 4 + 21 * (k / (n / 4 - 1)), th = arm * Math.PI / 2;
    GAL_STARS.tracers.push(seatStar(`T${i}`, R * Math.cos(th), R * Math.sin(th), 0));
  }
  GAL_STARS.real = hygSample.map(([name, x, y, z]) => seatStar(name, x, y, z));
  GAL_STARS.myr = 0;
  GAL_STARS.carry = 0;
}

function kdk(s, dt) {                     // kick - drift - kick, the house shape
  let [ax, ay] = galaxyAccel(s.x, s.y);
  s.vx += 0.5 * dt * ax; s.vy += 0.5 * dt * ay;
  s.x  += dt * s.vx;     s.y  += dt * s.vy;
  [ax, ay] = galaxyAccel(s.x, s.y);
  s.vx += 0.5 * dt * ax; s.vy += 0.5 * dt * ay;
}

// W2c: HOW FINELY must this frame be chopped? The fixed 0.2 Myr galaxy step
// is meaningless once something orbits faster than that: with Sgr A* dialled
// to 1e9x, a cluster at 0.6 kpc laps 9.5 times inside ONE step. The fix is not
// a smaller DT for everyone — it is a DT divided only as far as the fastest
// thing actually on screen demands.
//
// WHO VOTES: every body the loop integrates — tracers, HYG stars and clusters
// alike. Excluding a population would integrate it at a resolution we have
// already declared insufficient and say nothing about it: a fail-silent
// channel inside the loop built to close one. Decided 2026-08-01.
//
// THE FLOOR is galaxyPhi's own 0.05 kpc clamp. Inside it the potential is flat,
// there is no orbit, and a step count computed there means nothing.
//
// THE CAP is 200 substeps, about one 8 ms half-frame. Uncapped it reaches
// 25,043 for a body at the clamp with Sgr A* at 1e10x — roughly one second of
// arithmetic per frame. Past the cap the STATE is under-resolved, and
// GAL_STEP.achieved says so out loud. That is an integration limit, not a
// rendering cheat — CHEATS.md "NOT CHEATS" — and taxonomy #15 is the reason
// it is never allowed to stay quiet.
//
// GRANULARITY: the count is taken ONCE per 0.2 Myr step, not per substep. A
// body that dives inside a single step is resolved by the count it entered
// with. Cheap, stable, and stated rather than discovered.
export const GAL_STEP = {
  target: 40,          // steps per orbit demanded of the innermost integrated body
  cap: 700,            // hard ceiling; past it we accept coarser and confess it
  n: 1,                // substeps actually run on the last step
  achieved: 0,         // steps/orbit the innermost body actually received
  byName: '',          // WHO set the count — taxonomy #15: never an unlabelled number
  byR: 0,              // and at what radius, kpc
  fastest: 0,          // W2c.2: fastest integrated body, km/s
  fastestName: '',     // and which one
  overC: 0,            // that speed in units of the DIALLED c. Past 1 the engine is
                       // answering Newtonianly in a regime Newton does not describe,
                       // and no amount of subdivision makes the answer mean anything.
  truthClamped: true,  // n forced to 1 because Sgr A* sits at its calibration mass
};

// Scan every integrated body, find the innermost, and report the subdivision
// its orbit demands. Fills GAL_STEP so the HUD can name what set the count.
export function galaxySubstepCount() {
  const S = GAL_STEP;
  S.truthClamped = GALAXY.MBH === GALAXY.MBH_CAL;

  let minR = Infinity, who = '', fastest = 0, fastWho = '';
  const vote = (s, R, speed) => {
    // tracers and HYG stars carry .name; Harris clusters carry .id (main.js:462
    // hunts on best.id). Reading only .name printed "(unnamed)" for all 126
    // clusters — a readout that cannot say WHO is taxonomy #15 with the name
    // filed off. Caught in the browser, 2026-08-01.
    const label = s.name || s.id || '(unnamed)';
    if (R < minR) { minR = R; who = label; }
    if (speed > fastest) { fastest = speed; fastWho = label; }
  };
  for (const s of GAL_STARS.tracers) vote(s, Math.hypot(s.x, s.y), Math.hypot(s.vx, s.vy));
  for (const s of GAL_STARS.real)    vote(s, Math.hypot(s.x, s.y), Math.hypot(s.vx, s.vy));
  if (GAL_CLUSTERS.on) {
    for (const s of GAL_CLUSTERS.list) {
      if (s.vx !== undefined) vote(s, Math.hypot(s.x, s.y, s.z), Math.hypot(s.vx, s.vy, s.vz));
    }
  }
  if (!Number.isFinite(minR)) {        // nothing in flight: nothing to resolve
    S.n = 1; S.achieved = 0; S.byName = ''; S.byR = 0;
    S.fastest = 0; S.fastestName = ''; S.overC = 0;
    return 1;
  }

  const R = Math.max(minR, 0.05);                          // the clamp is the floor
  const v = galaxyVCircInner(R, true) * KMS_TO_KPC_MYR;    // kpc/Myr
  const period = 2 * Math.PI * R / v;                      // Myr per orbit
  const wanted = S.target * GAL_STARS.DT / period;

  S.byName = who;
  S.byR = minR;
  S.n = S.truthClamped ? 1 : Math.min(S.cap, Math.max(1, Math.ceil(wanted)));
  S.achieved = period / (GAL_STARS.DT / S.n);

  // W2c.2: is anything moving faster than light? Nothing in a Newtonian engine
  // forbids it, so at a dialled Sgr A* it happens: free-fall to the 0.05 kpc
  // clamp at 1e10x reaches 9.1c even integrated perfectly. That is not a
  // resolution failure and no subdivision cures it. The only honest response is
  // to say so where the number is read — the same discipline as the WHAT IF
  // banner. Receipt: stepLab ST9.
  const cKms = LIGHT.c * (299792.458 / LIGHT.cal);
  S.fastest = fastest / KMS_TO_KPC_MYR;
  S.fastestName = fastWho;
  S.overC = S.fastest / cKms;
  return S.n;
}

// Fixed-step accumulator — same discipline as the solar loop, own clock.
// Each 0.2 Myr step is now spent as GAL_STEP.n identical substeps. At
// calibration n is 1 and DT / 1 is bit-exact, so TRUTH mode is unchanged.
export function stepGalaxyStars(realSeconds) {
  GAL_STARS.carry += realSeconds * GAL_STARS.MYR_PER_SEC;
  let steps = 0;
  while (GAL_STARS.carry >= GAL_STARS.DT && steps < 200) {
    const n = galaxySubstepCount();
    const sub = GAL_STARS.DT / n;
    for (let k = 0; k < n; k++) {
      for (const s of GAL_STARS.tracers) kdk(s, sub);
      for (const s of GAL_STARS.real)    kdk(s, sub);
      if (GAL_CLUSTERS.on) for (const s of GAL_CLUSTERS.list) { if (s.vx !== undefined) kdk3(s, sub); }
    }
    GAL_STARS.myr += GAL_STARS.DT;
    GAL_STARS.carry -= GAL_STARS.DT;
    steps++;
  }
}
// ---------- M12e: the clusters get their velocity ----------
// Gaia EDR3 proper motions (Vasiliev & Baumgardt 2021) x Harris distances
// + heliocentric Vr -> full 3D galactocentric velocities. Pipeline
// receipted in lab/gaiaLab.mjs G0-G5b: bridge 4.7405, matrix anchors,
// round trip 6e-9, curve handshake 232.1, dt-halving ratio 4.00.

export const GAL_CLUSTERS = { on: false, list: [] };

const K_PM = 4.740470;                    // km/s per (mas/yr at 1 kpc) — G2
const AG = [                              // equatorial J2000 -> galactic — G3a
  [-0.0548755604, -0.8734370902, -0.4838350155],
  [ 0.4941094279, -0.4448296300,  0.7469822445],
  [-0.8676661490, -0.1980763734,  0.4559837762],
];
const D2R = Math.PI / 180;

function galaxyAccel3(x, y, z) {          // 3D pull, kpc/Myr^2, toward center
  const r = Math.max(Math.hypot(x, y, z), 0.05), h = 1e-4;
  const dPhi = (galaxyPhi(r + h) - galaxyPhi(r - h)) / (2 * h);
  const a = -dPhi * KMS_TO_KPC_MYR * KMS_TO_KPC_MYR / r;
  return [a * x, a * y, a * z];
}
function kdk3(s, dt) {                    // the house shape, third axis included
  let [ax, ay, az] = galaxyAccel3(s.x, s.y, s.z);
  s.vx += 0.5 * dt * ax; s.vy += 0.5 * dt * ay; s.vz += 0.5 * dt * az;
  s.x += dt * s.vx; s.y += dt * s.vy; s.z += dt * s.vz;
  [ax, ay, az] = galaxyAccel3(s.x, s.y, s.z);
  s.vx += 0.5 * dt * ax; s.vy += 0.5 * dt * ay; s.vz += 0.5 * dt * az;
}

// One cluster: (RA, Dec, pmRA*, pmDE, Vr, Rsun) -> repo-frame velocity.
// Radial piece + two sky pieces in equatorial axes, rotate to galactic,
// flip to repo (Sun at +X), add the Sun's own ride. Receipt: gaiaLab G3e.
export function seedClusterVelocities(list) {
  // F1 (R1) + B0: the h key is a DISPLAY toggle and MS is a DISPLAY knob;
  // seeding is DATA. The calibration frame is halo ON at the frozen
  // calibration mass — gaiaLab G3c's 232.1 km/s — no matter what the
  // screen showed or what the knob read when k was pressed.
  // Receipts: G6 (the toggle), G7 (the halo mass), G8 (the Sgr A* mass).
  // W2a.1: MBH joined the knobs and re-opened this door. Any constant that
  // enters galaxyPhi enters this frame — pin every one of them, not the
  // ones that happened to be dialable when the comment was written.
  const savedHalo = GALAXY.haloOn, savedMS = GALAXY.MS, savedMBH = GALAXY.MBH;
  GALAXY.haloOn = true;
  GALAXY.MS = GALAXY.MS_CAL;
  GALAXY.MBH = GALAXY.MBH_CAL;
  const vlsrModel = galaxyVCirc(8.2);       // always the receipted frame: 232.1 km/s
  GALAXY.haloOn = savedHalo; GALAXY.MS = savedMS; GALAXY.MBH = savedMBH;
  const VSUN = [-11.1, -(vlsrModel + 12.24), 7.25];   // Schoenrich+2010 + our curve
  let seeded = 0;
  for (const c of list) {
    if (c.pmra === undefined || c.vr === null || !c.rsun) continue;
    const ra = c.ra * D2R, de = c.de * D2R;
    const rh = [Math.cos(de) * Math.cos(ra), Math.cos(de) * Math.sin(ra), Math.sin(de)];
    const ah = [-Math.sin(ra), Math.cos(ra), 0];
    const dh = [-Math.sin(de) * Math.cos(ra), -Math.sin(de) * Math.sin(ra), Math.cos(de)];
    const va = K_PM * c.rsun * c.pmra, vd = K_PM * c.rsun * c.pmde;
    const veq = [0, 1, 2].map((i) => c.vr * rh[i] + va * ah[i] + vd * dh[i]);
    const vg = AG.map((row) => row[0] * veq[0] + row[1] * veq[1] + row[2] * veq[2]);
    const v = [-vg[0] + VSUN[0], -vg[1] + VSUN[1], vg[2] + VSUN[2]];   // km/s, repo axes
    c.v3 = Math.hypot(...v);
    c.vx = v[0] * KMS_TO_KPC_MYR;         // stored in kpc/Myr, like the tracers
    c.vy = v[1] * KMS_TO_KPC_MYR;
    c.vz = v[2] * KMS_TO_KPC_MYR;
    seeded++;
  }
  return seeded;
}

// Fly a COPY into the future under the CURRENT halo. Returns the path (for
// the trail), the turning points (for the panel), and whether it ever left.
export function clusterOrbit(c, maxMyr = 6000, dt = 0.5) {
  const s = { x: c.x, y: c.y, z: c.z, vx: c.vx, vy: c.vy, vz: c.vz };
  const pts = [[s.x, s.y, s.z]];
  let rmin = Math.hypot(s.x, s.y, s.z), rmax = rmin, left = false;
  const steps = Math.round(maxMyr / dt);
  for (let n = 1; n <= steps; n++) {
    kdk3(s, dt);
    const r = Math.hypot(s.x, s.y, s.z);
    rmin = Math.min(rmin, r); rmax = Math.max(rmax, r);
    if (n % 20 === 0) pts.push([s.x, s.y, s.z]);
    if (r > 250) { left = true; pts.push([s.x, s.y, s.z]); break; }
  }
  return { pts, rmin, rmax, left };
}