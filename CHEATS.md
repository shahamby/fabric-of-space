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

## 7. Field lines are stagecraft (M10c)

**Where:** `main.js`, `makeFieldLines()` — shells, longitudes, truncation, glow.

The dipole's geometry is real — every drawn line is r = L·cos²(latitude), the
same shape the physics samples through dipoleTesla(). Everything else is
theater: four shells (0.5/0.8/1.2/1.8 AU) out of a continuum, eight longitudes
out of infinity, lines truncated at 0.3 AU so they appear to enter the drawn
Sun's poles (the Sun's size being itself a confessed cheat), and an opacity
chosen for contemplation. The field exists everywhere; we draw a skeleton.
Physics never reads a single vertex of it.

## 8. The galaxy in costume (M12b)

**Where:** `fabric.js` GAL_DEPTH / GAL_PHI_REF; `main.js` galaxy markers.

The well's SHAPE is honest — every vertex asks galaxyPhi(), the same three-
part potential the rotation-curve lab measured (5/5 receipts) — but the
depth is log-compressed on its own dials (GAL_DEPTH 6, GAL_PHI_REF 1e4),
and the two markers are enormously inflated: Sgr A* draws at 0.8 kpc
against a true horizon near 4e-10 kpc, the Sun's seat at 0.5 kpc against
~2.3e-11 kpc. At true scale both are sub-pixel. The physics reads neither
mesh; the solar sim runs untouched underneath galaxy mode.

## 9. Stars on the sheet (M12c)

**Where:** `physics.js` GAL_STARS + seedGalaxyStars; `main.js` star clouds.

Five confessions, one honest core. The MOTION is real: every star and
tracer is leapfrogged through galaxyPhi() in kick-drift-kick, receipted
7/7 in lab/starsLab.mjs before any of it reached the browser.

1. TRACER POSITIONS ARE INVENTED. 240 dots on four straight spokes,
   4 -> 25 kpc. No catalog says a star is there. The spokes exist to make
   differential rotation visible; they wind because the physics winds them.
2. TWO CLOCKS RUN AT ONCE. The solar sim advances on timeScale (days/sec);
   the galaxy advances on GAL_STARS.MYR_PER_SEC = 8 (Myr/sec). Unrelated
   rates, same wall clock. Neither is wrong; they are simply not the same
   clock, and the HUD names both.
3. REAL STARS GET ASSUMED VELOCITIES. The 24 HYG stars sit at true
   galactocentric positions, but each is launched at the well's circular
   speed for its radius. Actual peculiar motions are not modeled.
4. POINT SIZES ARE PIXELS. sizeAttenuation is off (3 px tracers, 6 px real)
   and every dot is lifted 0.15 units above the sheet so it clears the
   wireframe instead of z-fighting it. At true scale all of them vanish.
5. THE Sgr A* PANEL QUOTES A MASS THE PHYSICS DOES NOT HAVE. 4.30e6 M☉ is
   the real measured value; this potential has a bulge and no central black
   hole. The panel says so on its own face, and prints Φ at the 0.05 kpc
   clamp — the number the sim actually uses.

Picking bug fixed in the same milestone: Three.js raycasts invisible meshes
(it tests layers, not .visible), so the hidden Sun mesh inside Sgr A*'s
drawn sphere was answering clicks. The picker now filters by visibility and
swaps target lists by mode.