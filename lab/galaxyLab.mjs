// lab/galaxyLab.mjs — M12a pre-registration: the Milky Way's gravity,
// measured before rendered. Three parts: bulge (dense center), disk
// (where the Sun lives), dark halo (invisible). Receipt = the rotation
// curve: flat with the halo, falling without. That gap IS dark matter —
// a gravitational effect you can see, from a cause you can't.
// Run:  node lab/galaxyLab.mjs

// ---------- W0: the unit bridge, audited ----------
// Galaxy units: kpc, km/s, Msun. G in these units, rebuilt from SI so
// the bridge is proven, not trusted (the M10b lesson).
const G_SI = 6.674e-11, MSUN = 1.989e30, KPC = 3.086e19;
const G_CHECK = G_SI * MSUN / KPC / 1e6;   // -> kpc·(km/s)²/Msun
const G = 4.301e-6;                        // the constant the lab spends
console.log('--- W0: unit bridge ---');
console.log(`  G rebuilt from SI: ${G_CHECK.toExponential(4)}  (used: ${G.toExponential(3)})`);
console.log(Math.abs(G_CHECK - G) / G < 1e-3 ? '  W0 PASS' : '  W0 FAIL');

// ---------- the galaxy, three parts (masses Msun, sizes kpc) ----------
const MB = 1.5e10, AB = 0.5;               // bulge
const MD = 6.5e10, AD = 3.0, BD = 0.3;     // disk
const MS = 5.0e11, RS = 16;                // dark halo — mass grows with R

// Circular speed: v² = R × inward pull — the same balance as sqrt(GM/r),
// the entire secret of orbiting, written once per galaxy part.
const v2Bulge = R => G * MB * R / ((R + AB) ** 2);
const v2Disk  = R => G * MD * R * R / ((R * R + (AD + BD) ** 2) ** 1.5);
const v2Halo  = R => {
  const x = R / RS;
  return G * MS * (Math.log(1 + x) - x / (1 + x)) / R;
};
const vTotal = (R, haloOn) =>
  Math.sqrt(v2Bulge(R) + v2Disk(R) + (haloOn ? v2Halo(R) : 0));

// ---------- the rotation curve, in numbers ----------
console.log('--- rotation curve, km/s ---');
console.log('  R kpc   halo ON   halo OFF');
for (const R of [2, 4, 8.2, 12, 16.4, 24.6]) {
  console.log(`  ${String(R).padStart(4)}     ${vTotal(R, true).toFixed(0).padStart(4)}      ${vTotal(R, false).toFixed(0).padStart(4)}`);
}

// ---------- R1: the Sun's speed ----------
const vSun = vTotal(8.2, true);
console.log('--- R1: Sun speed ---');
console.log(`  v(8.2 kpc) with halo = ${vSun.toFixed(1)} km/s  (target 230 ± 5)`);
console.log(Math.abs(vSun - 230) < 5 ? '  R1 PASS' : '  R1 FAIL');

// ---------- R2: flat vs falling ----------
const dropOn  = 1 - vTotal(24.6, true)  / vTotal(8.2, true);
const dropOff = 1 - vTotal(24.6, false) / vTotal(8.2, false);
console.log('--- R2: flat vs falling, 8.2 -> 24.6 kpc ---');
console.log(`  ON drops ${(dropOn * 100).toFixed(1)}% (needs < 15)   OFF drops ${(dropOff * 100).toFixed(1)}% (needs > 30)`);
console.log(dropOn < 0.15 && dropOff > 0.30 ? '  R2 PASS' : '  R2 FAIL');

// ---------- R3: the dark-matter gap ----------
const gap = vTotal(24.6, true) - vTotal(24.6, false);
console.log('--- R3: the dark-matter gap ---');
console.log(`  ON - OFF at 24.6 kpc = ${gap.toFixed(1)} km/s  (needs >= 80)`);
console.log(gap >= 80 ? '  R3 PASS' : '  R3 FAIL');

// ---------- R4: Kepler's fingerprint — v²·R constant far outside the mass ----------
// ============ SHAMBU'S CHECK — type your code below this line ============
console.log('--- R4: Kepler fingerprint ---');
const q = R => vTotal(R, false) ** 2 *R;
const ratioOff = q(100) / q(50);
const qOn = R => vTotal(R, true) ** 2 * R;
const ratioOn = qOn(100) / qOn(50);
console.log(`ratioOff: ${ratioOff.toFixed(3)} (Visible Milky Way = Kepler Holds)`);
console.log(`ratioOn: ${ratioOn.toFixed(3)} (Halo = Kepler's Broken)`);
console.log(["FAIL", "PASS"][+(Math.abs(ratioOff - 1) < 0.02 && ratioOn > 1.3)]);
