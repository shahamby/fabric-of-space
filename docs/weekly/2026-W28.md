# fabric-of-space — The Week Einstein Entered the Sim

*Recap and roadmap, written 2026-07-12. Two editions of the same story: read the first with your feet up, read the second with a pencil.*

---

## Part I — The Plain-English Edition

### What this project is

fabric-of-space is a solar system that lives in a browser. The planets sit where NASA says they actually are, gravity is computed honestly between every pair of bodies, and space itself is drawn as a stretchy grid that sags under mass — the "fabric." The project has one law above all others: **the physics never cheats.** Only the picture cheats, to keep things visible, and every visual trick is confessed in a public ledger called CHEATS.md. Five confessions so far, each one documented like an incident report.

### What happened this week

The week that just closed had three acts. In the first, the sim learned to phone NASA: press one key and it fetches the real positions of the Sun and all eight planets from JPL's Horizons service, verifies the data, fingerprints every response with a cryptographic hash, and is reborn at today's actual sky. In the second act, the sim learned about black holes: every body now carries its "point of no return" size, and if you crush something small and heavy enough, space visibly rips. Jupiter was made thirty-three million times heavier as a test; it tore the grid open and was later found 2.8 light-years from home. All of it reversible, all of it display — the ledger says exactly which parts.

The third act was this weekend, and it is the best story in physics. In the 1800s, astronomers noticed Mercury's oval orbit slowly swiveling — a hair more than Newton's rules allow. After subtracting every known cause (every tug from every planet), an unexplained leftover remained: **43 arcseconds per century**. How small is that? Picture a dime taped to a wall 85 meters away. The width of that dime is how far Mercury's orbit swivels, beyond all explanation, per *hundred years*. And they measured it with brass telescopes. For fifty years, astronomers hunted a phantom planet named Vulcan to explain the leftover. Vulcan never existed. In 1915, Einstein showed the rulebook itself was incomplete: close to the Sun, where gravity is deep and Mercury moves fast, Newton's law is only an approximation. His new theory predicted the leftover exactly — 43 — with no knobs to tune.

This weekend, we set out to reproduce that discovery in the sim. We built a detector that stamps the direction of Mercury's closest approach on every lap. The detector's first catch was embarrassing and wonderful: it caught *our own math*. The sim moves planets in short straight kicks instead of perfect curves, and the corners make the orbit creep artificially. We predicted that making the steps ten times finer would shrink the creep a hundred times — the error obeys a squared law — and the measurement confirmed it on the first try. Then we added Einstein's correction: about fifteen lines of code. The first attempt accidentally applied it thirty-six times per step (a single misplaced line), which we caught because the sim is perfectly deterministic — the same starting sky always replays to the last decimal, so any difference between two runs must be something we changed. The dose is now correct. One clean measurement remains: run a few centuries with Einstein off, run the identical centuries with Einstein on, and subtract. Everything that both universes share cancels out. What refuses to cancel should be the 43.

### The equations, gently

**Gravity.** Every pair of bodies pulls on each other with a strength of G times both masses, divided by the distance squared, aimed along the line between them. Double the distance, quarter the pull.

**The secret of orbiting.** Move sideways at exactly `v = √(G·M / r)` and you fall toward the Sun forever while forever missing it. That one square root is the whole trick.

**Leapfrog.** Instead of "aim, leap, repeat" (which secretly injects energy until orbits spiral away), the sim does half-nudge, glide, half-nudge. The errors from each half cancel instead of piling up.

**The energy audit.** Motion energy plus bond energy should stay constant. The sim watches the total every frame; if it trends instead of wobbling, the physics is lying. This week it held steady to one part in ten billion.

**The balance point.** The Sun and Jupiter sit on a cosmic seesaw. The Sun is 1,047 times heavier, so the balance point sits 1,047 times closer to it — which lands just *outside* the Sun's surface. The Sun spends its life circling a point of empty space. That wobble, seen in other stars, is how we discover planets we cannot see.

**The point of no return.** Squeeze any mass inside 2.95 kilometers per Sun's-worth of mass and not even light escapes. The sim checks this for every body, every change.

**Einstein's correction.** Near a big mass, moving fast, gravity is slightly stronger than Newton says — and it gains a strange new piece that pushes along the direction of motion. Mercury, deepest and fastest, feels it. Neptune, far and slow, effectively doesn't. That difference, accumulating lap after lap, is the 43.

### What comes next, in plain words

First, the measurement itself — fifteen quiet minutes to make the 43 appear. Then the roadmap follows five passions. Magnetism: charged particles surfing field lines, the physics of auroras, which needs a new kind of stepper built beside the current one. Light: rays bending around the black holes we already make, and a mode where you see each planet where it *was* when its light left. The galaxy: real star catalogs by the hundred thousand, a searchable Milky Way, the dark-matter mystery shown as the difference between how galaxies should spin and how they actually do — with the monster black hole at the center connected to the horizon math we already shipped. And someday, in its own sandbox, quantum experiments. The gravity engine stays honest through all of it.

---

## Part II — The Shambu Edition

### The platform, in one paragraph

Simulation state lives in barycentric ecliptic J2000 coordinates in AU, days, and solar masses; `G ≈ 2.9591 × 10⁻⁴ AU³ M☉⁻¹ day⁻²` ships in the data file's metadata. Dependencies are three.js and vite, full stop — minimal supply-chain surface is a standing requirement. The integrator runs at fixed `DT` (the accuracy dial) decoupled from wall time by a carry account (the speed dial, 1–2048 d/s). Instruments: an energy-drift monitor sealed to a baseline `E0` that re-seals only on authorized change, an Earth-lap detector, and as of this weekend a Mercury perihelion instrument. Every external byte is SHA-256'd into a provenance ledger with one source and three views. The whole system is deterministic: identical epoch in, bit-identical universe out — which this week was weaponized twice, as an integrity checker and as a measurement design.

### The standing equations

Newtonian pairwise acceleration, computed once per unique pair with the third law written as a `+=`/`−=` couple:

```
a_i = Σ_{j≠i}  G · m_j · (r_j − r_i) / |r_j − r_i|³
```

Leapfrog, kick-drift-kick — symplectic, so energy oscillates within a bounded envelope instead of trending; measured drift at DT 0.05 is order 10⁻¹⁰:

```
v += a·(dt/2);   x += v·dt;   recompute a;   v += a·(dt/2)
```

The integrity monitor (Newtonian bookkeeping — see the 1PN caveat below):

```
E = Σ ½·m·|v|²  −  Σ_{i<j} G·m_i·m_j / r_ij
```

Circular insertion speed for rogue bodies, applied Sun-relative with the Sun's own velocity added so newcomers ride along with the barycentric flow:

```
v_circ = √(G·M_sun / r)
```

Schwarzschild detection (honest bookkeeping; the 1500× display gain and 1 AU floor are confessed in CHEATS #5):

```
r_s = 2GM/c²  =  2.95 km × (M / M☉)
```

The fabric: true potential `φ = −Σ G·m/r` drives a log-compressed display depth, with planet wells gain-boosted ×100 and softened by 0.4 AU — cheats #3 and #4, flattened to honesty by the T key.

### This week's star: the first post-Newtonian correction

Fifteen lines in physics.js, Sun's field only (planet-planet 1PN is c²-suppressed into irrelevance), applied to every body so that Neptune's null result is itself part of the lesson:

```
a_1PN = (GM / (c²·r³)) · [ (4GM/r − v²)·r_vec  +  4(r·v)·v_vec ]
c = 173.144632 AU/day
```

The first term reshapes the radial pull with depth and speed; the second is a drag along the velocity with no Newtonian ancestor. It rides as the final statement of `computeAccelerations` — one enforcement point, inside every re-aim, every step. The first landing sat one brace too shallow, inside the pair loop, applying the term C(9,2) = 36 times per step: an amplification bug whose strength scales with roster size, convicted by a same-epoch replay diff and a fresh-clone grep while the constant was exonerated digit by digit. Known limitation, documented rather than hidden: `totalEnergy` is Newtonian bookkeeping, so the drift monitor gains a small bounded wobble with 1PN active.

The closed-form prediction we are hunting, per orbit and per century for Mercury (`a = 0.3871 AU`, `e = 0.2056`):

```
Δϖ = 6πGM / (c² · a · (1 − e²))  ≈ 0.1035″ per orbit  ≈ 43″ per century
```

### The instrument and its calibration

Valley trigger `r₍ₙ₋₂₎ > r₍ₙ₋₁₎ ≤ rₙ` on Mercury's Sun-relative distance, sampled per physics step; on fire, stamp `θ = atan2(Δy, Δx)` Sun-relative. Consecutive stamps accumulate through a ±π wrap into a telescoping sum, so only endpoint noise survives, diluting as 1/elapsed:

```
rate (″/century) = Σ wrap(Δθ) × 206,264.8 / elapsed_days × 36,525
```

Calibration was the weekend's quiet triumph. At DT 0.5 the instrument read ≈ −210,000″/century: pure integrator apsidal creep, ~176 chords per 88-day orbit. Prediction on the record — creep ∝ DT², so ten-times-finer steps collapse it a hundredfold — and DT 0.05 measured a settling band of −1,400…−4,600. Law confirmed by hand. Aliasing bound worth remembering: the wrap-sum is only faithful while per-lap swings stay under ±π; the end-of-day deranged-universe readings (−2 × 10⁸) were a clipped sensor honestly reporting regime-exceeded.

### The measurement design (M8c, pending)

Two fresh page loads of the same epoch. Run A: pure Newton, checkpoints #25–#175. Run B: pause, `E`, resume *before the first stamp*, same checkpoints. Determinism makes the grid, the stamp timing, the integrator creep, and the planetary secular drift common-mode; the pairwise column subtraction cancels all of it to first order. The expected residue is ≈ +43″/century, prograde, acceptance ±20%. Mid-flight toggles cannot resolve it — references at different phases break the common-mode assumption, which the weekend's logs demonstrated empirically.

### The roadmap, with the equations waiting on it

Gravity (Tier 1) continues with the 43 measurement, then gravitational-wave energy loss as detection-plus-display. Magnetics (Tier 2) introduces charge and the Lorentz force, `F = q(E + v × B)` — a velocity-dependent force that breaks leapfrog's position-only assumption, hence a Boris integrator built *beside* the corroborated one, never replacing it; the demo is solar wind riding field lines. Light (Tier 3) begins with lensing around the M7 horizons using Einstein's deflection `α = 4GM/(c²·b)` — twice Newton's naive value, the 1919 eclipse discriminator — plus a light-travel-time mode ("you are seeing Neptune four hours ago"). The galaxy tier loads HYG/ATHYG in bulk, SIMBAD and Gaia on demand, and a dark-matter halo toggle against observed flat rotation curves, with Sagittarius A* (~4.3 million M☉, r_s ≈ 1.3 × 10⁷ km) connecting straight back to the Schwarzschild machinery already shipped. Quantum stays a separate engine in its own sandbox, never wired into the N-body core. Every milestone traces to one of the five passions; that map now lives in CLAUDE.md.

### Operational footnote

Uncommitted at time of writing: the HANDOFF session append, the `[1PN]` HUD tag, the applyLiveVectors DRY call, AUDIT log lines for the two unlogged privileged controls, the question-ledger negative test, and deletion of the untracked `assets/` folder. Then the ceremony.

---

*Week's scoreboard: two milestones shipped with zero new cheats; one squared law predicted and confirmed; determinism discovered by accident, deployed twice on purpose; six-ish bugs convicted by protocol; one deranged cosmos recovered in 32 seconds via authoritative re-anchor; 805 stampless orbits caught by a reading that refused to change; one century of celestial mechanics per 18 seconds of wall clock. One subtraction from 1915.*
