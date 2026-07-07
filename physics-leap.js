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