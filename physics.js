// physics.js — the mathematical heart of fabric-of-space.
// Runs ENTIRELY in simulation space: barycentric ecliptic coordinates,
// in AU, days, and solar masses. Nothing in this file knows Three.js
// exists — rendering translates our numbers, never the other way around.

// ---------- Gravity ----------
// Newton: every pair of bodies attracts with F = G·mA·mB / r².
// We want each body's ACCELERATION (a = F/m), so each body's own mass
// drops out of its side of the equation.
export function computeAccelerations(bodies, G) {
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
  if (PN1.on) apply1PN(bodies, G);   // Einstein rides ONCE per re-aim, roster-wide
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
export function leapfrogStep(bodies, dt, G) {
  const h = dt / 2;

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
  computeAccelerations(bodies, G);     // gravity at the NEW positions
  for (const b of bodies) {            // KICK: the other half
    b.vel[0] += b.acc[0] * h;
    b.vel[1] += b.acc[1] * h;
    b.vel[2] += b.acc[2] * h;
  }
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
const C_AU_DAY = 173.144632;             // speed of light in our units

function apply1PN(bodies, G) {
  const sun = bodies.find(b => b.name === 'Sun');
  const gm = G * sun.mass;
  for (const b of bodies) {
    if (b === sun) continue;
    const rx = b.pos[0]-sun.pos[0], ry = b.pos[1]-sun.pos[1], rz = b.pos[2]-sun.pos[2];
    const vx = b.vel[0]-sun.vel[0], vy = b.vel[1]-sun.vel[1], vz = b.vel[2]-sun.vel[2];
    const r  = Math.hypot(rx, ry, rz);
    const v2 = vx*vx + vy*vy + vz*vz;
    const rdotv = rx*vx + ry*vy + rz*vz;
    const k = gm / (C_AU_DAY*C_AU_DAY * r*r*r);   // the 1/c² volume knob
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
      const dx = B.pos[0], dy = B.pos[1], dz = B.pos[2];
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