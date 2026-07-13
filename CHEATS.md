# Cheats

Ledger of every display-vs-reality divergence. Physics never cheats — simulation
state always stays true to the data in `data/bodies.json`. Only *rendering*
cheats, and every one is logged here per CLAUDE.md's non-negotiable conventions.

## #1 — Body-size exaggeration

**Where:** `bodyMesh.js`, `PLANET_SIZE_X` / `PLANET_CAP_AU` / `SUN_SIZE_X`.

At true scale, Earth is 0.0000426 AU wide — invisible at any camera distance
that also shows its orbit (1 AU). So body *positions* stay true-to-data, but
display *radius* is inflated by a fixed multiplier (1200x for planets, 60x for
the Sun), with a cap (0.25 AU) so gas giants don't out-size the Sun.

Press `T` in the running app to toggle between true scale and exaggerated
scale — the toggle swaps `mesh.scale` between `userData.trueRadiusAu` and
`userData.displayRadiusAu`, both precomputed in `makeBodyMesh()`.

## #2 — Sunlight decay disabled

**Where:** `main.js`, `sunlight.decay = 0`.

A physically correct `PointLight` decays with the inverse square of distance,
which would leave Neptune (30 AU out) essentially unlit relative to Mercury —
correct physics, unreadable visualization. Decay is disabled so every body is
lit at roughly the same brightness regardless of true distance from the Sun.

## #3 — Log-compressed fabric depth

**Where:** `fabric.js`, `DEPTH_SCALE` / `PHI_REF`.

The Sun's raw potential near the funnel is thousands of times Neptune's —
drawn honestly it would punch through the scene floor. Vertex depth is
`DEPTH_SCALE * log10(1 + phi/PHI_REF)`. Display only; physics never sees it.

## #4 — Planet well gain + softening

**Where:** `fabric.js`, `PLANET_GAIN` / `EPS`.

True planetary dents are whispers on the Sun's slope. For display, planet
masses are boosted 100x (fabric only) and distances softened by 0.4 AU so
dimples span several grid cells. Press `T` for honest depth (gain = 1).

## #5 — Event horizon display: Newtonian detection, 1500× horizon gain + 1 AU floor, fixed tear depth

**Where:** `main.js` (detection, 2.95 × mass), `fabric.js` (`HOLE_DEPTH` / `HOLE_GAIN` / 1 AU floor).

Detection is honest Newtonian bookkeeping: a body collapses when its radius
drops below r_s = 2.95 km × mass in solar masses — the real Schwarzschild
radius, no relativity simulated. The display then cheats twice: the horizon
radius is boosted 1500× (a true stellar-mass horizon is ~3 km, invisible at
1 scene unit = 1 AU) with a 1 AU minimum so the rip spans grid cells, and
the tear floor is a fixed −12 scene units rather than honest potential
depth. Physics never sees any of it; `-` reverses the collapse.

## 6. Collisions merge instantly, with no debris (M9)

Reality shatters and throws fragments; we latch two bodies into one point
mass in a single step. Momentum is conserved exactly and the destroyed
kinetic energy is printed in the AUDIT line — but the fireworks are not
modeled. Detection uses PHYSICAL radii; the inflated display radii still
touch on screen without consequence, as ever.
