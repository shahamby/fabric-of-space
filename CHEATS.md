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

## 10. The cluster halo (M12d)

**Where:** `main.js` CLUSTERS / clusterCloud / colourClusters.

Positions are MEASURED — Harris (1996, 2010 ed.) via VizieR, and the frame
conversion is checked against the catalogue's own Rgc column to 0.032 kpc
(clusterLab C2), which is published rounding and nothing else. Five things
are not measured:

1. THE VERTICAL AXIS DOES DOUBLE DUTY. The sheet uses scene-y for potential
   DEPTH. The clusters use the same scene-y for real galactic HEIGHT. Two
   meanings on one axis. A cluster floating above the sheet is not "less
   deep in the well" — it is physically above the disk.
2. THE CLUSTERS DO NOT MOVE. The catalogue gives line-of-sight velocity
   only. Without proper motions there is no orbit to integrate, and seeding
   them at circular speed would be a lie — C5 proves these things are not
   on circular orbits. So they sit still, honestly.
   [AMENDED 2026-07-21, M12e: cured. 126 of 145 now carry Gaia+Harris 3D
   velocities and leapfrog live in galaxyPhi. The 19 without proper
   motions still sit still, honestly.]
3. POINT SIZE IS PIXELS. 5 px, sizeAttenuation off. A globular cluster is
   ~0.05 kpc across; at true scale every one is sub-pixel.
4. THE COLOUR IS COMPUTED, NOT OBSERVED. Red means a MEASURED speed exceeds
   the escape speed of OUR MODEL at that radius. Change the halo mass and
   the colours change; the catalogue does not.
5. Vlsr IS LINE-OF-SIGHT ONLY. True speeds are equal or greater. The count
   of ten runaways is a FLOOR, not a ceiling.
   [AMENDED 2026-07-21, M12e: the floor claim was WRONG. Vlsr still rides
   the Sun's ~232 km/s rotation (LSR removes only the ~13 km/s peculiar
   drift), so it can EXCEED the true galactocentric speed — NGC 3201 reads
   481.9 along the sight line but 367.6 through space. The honest census
   uses |v3D|: 21 leave the baryons-only galaxy, 0 leave with the halo.]

The halo parameters were fit to disk kinematics inside 25 kpc and were never
shown these clusters. That they then bind tracers out to 120 kpc is a
consistency check, not circular reasoning.

## 11. The flying halo (M12e)

**Where:** `physics.js` GAL_CLUSTERS / seedClusterVelocities / clusterOrbit;
`main.js` clusterTrail / syncClusterCloud / colourClusters.

The velocities are MEASURED — Gaia EDR3 proper motions (Vasiliev &
Baumgardt 2021) times Harris distances, plus heliocentric Vr, through the
pipeline receipted in lab/gaiaLab.mjs G0-G5b. Five things are not:

1. POSITIONS ARE MEASURED AT LOAD ONLY. The instant 'k' finishes, the
   clusters fly in OUR potential on OUR clock. A seat on screen after
   N Myr is this model's extrapolation, not the catalogue's row.
2. THE TRAIL SHOWS THE FUTURE WHILE THE DOT LIVES THE PRESENT. Two times
   on one screen — CHEATS #9's two-clocks disease, third strain. The trail
   is a real integration (dt 0.5 Myr, sampled every 10 Myr, capped at
   6 Gyr or the 250 kpc exit), but the sampling, cap, and cyan are display.
3. COLOUR IS COMPUTED, IN TWO DIALECTS. Movers: red means positive total
   energy in the CURRENT halo. The 19 Vlsr-only holdouts wear muted
   orange/steel from the old one-slice comparison, which can neither
   convict nor acquit — the M12e frame lesson, worn as a colour.
4. THE h KEY EDITS THE UNIVERSE MID-FLIGHT. Energies jump when the halo
   vanishes — authorized model surgery, AUDIT-logged, not a leak.
5. ERROR BARS RIDE INVISIBLY. Proper-motion and distance uncertainties
   propagate into every v3D; the census counts carry few-cluster error
   bars this display does not draw.

## 12. The clamped well and the unclamped readout (M12f)

**Where:** `physics.js` galaxyPhi (the MBH term) + galaxyVCircInner;
`main.js` Sgr A* panel.

Sgr A*'s published 4.30e6 Msun is IN the potential — the panel's old
"NOT in this potential" confession is paid. What remains display:

1. THE DYNAMICS KEEP THE 0.05 kpc CLAMP. Every mover and every fabric
   vertex feels the same floor as before; the hole's pull outside 50 pc
   is real but microscopic (B4: worst shift 0.042 km/s, at the
   innermost cluster's seat). Nothing that flies in this sim ever
   enters the room where the hole rules.
2. THE PANEL'S INNER CURVE READS THE UNCLAMPED FORMULA. The 1/3/10 pc
   numbers come from galaxyVCircInner, floored at 0.0001 kpc — five
   orders above the horizon, far below the dynamics clamp. Instrument
   and dynamics disagree only in a room no simulated object occupies.
   Receipted in lab/bhLab.mjs (S2's 16-yr clock: 0.2%).
3. THE DOT IS STILL 0.8 kpc (CHEATS #8). The hole's true kingdom,
   8.6 pc, would be a hundredth of that dot's radius.

## 13. The chart that must not lie (M12g)

**Where:** `main.js` CURVE constants, drawCurve, the v key.

The rotation curve is an on-screen instrument now. Every plotted value
is galaxyVCircInner — the receipted function — at 200 log-spaced radii.
What is display, confessed:

1. THE RULERS ARE THE LAB'S, BYTE-IDENTICAL. R 0.001-30 kpc log,
   v 0-250 km/s linear, plot box (34..308, 16..140). Receipted in
   lab/curveLab.mjs: round trip 2e-15, polyline reading honest to
   4.6e-5, the linear-ruler lie caught at 25.9% (V4, Shambu's hand).
2. SAMPLE COUNT, COLORS, TICKS, THE VALLEY TICK, AND THE SUN DOT are
   for eyes. The valley tick sits at the V2-receipted 8.68 pc, its
   label rounded to 8.7.
3. THE CURVE ALWAYS INCLUDES THE HOLE. Only the halo answers to h;
   there is no toggle for the engine.
4. VALUES ABOVE 250 km/s WOULD CLIP at the axis top. None exist on
   this domain today; the guard is for future physics.

## 14. The colour tide (M12h)

**Where:** `main.js` CEPHEIDS block, parseCepheidTSV, colourCepheids,
the w key.

The seats are MEASURED: 2,373 classical Cepheids (Skowron+ 2019) placed
from (GLON, GLAT, Dist) through the front door, real heights, no lift —
and the warp they draw is receipted (lab/cephLab.mjs CD3: quadrant
means +1.07 / -0.58 kpc, spread 1.65; CD5 shuffle negative proves the
instrument reads geometry, not statistics). What is display, confessed:

1. COLOUR IS A HEIGHT RAMP, warm above the plane, cool below,
   saturating at +/- 1.5 kpc. The tide's colours are chosen; the tide's
   SHAPE is the catalogue's.
2. THEY DO NOT MOVE. No velocities are wired — honestly absent, banked
   for the data-overlay milestone. A Cepheid's seat is the catalogue's
   epoch, frozen.
3. FOURTEEN FAR OUTLIERS ARE BENCHED (Rgc > 30 kpc — past the fabric's
   edge and the disk's body). Counted and named in CD1's own print;
   kept in the snapshot; never silently dropped.
4. POINT SIZE AND OPACITY are for eyes. The sample itself carries
   OGLE's footprint bias — the far southern disk is seen deeper than
   the north; the warp is real, the sampling is a telescope's.

## 15. The sky on the chart (M12i)

**Where:** `main.js` MROZ block, loadMroz, drawCurve overlay, the m key.

773 classical Cepheids with MEASURED circular velocities (Mroz et al.
2019, OGLE archive) drawn on the rotation-curve instrument. What is
display, confessed:

1. THE DOTS ARE THE PUBLISHED VALUES, spent straight from the archive's
   per-star file. Legitimate coin: lab/mrozLab.mjs MZ2 regenerated all
   773 rows through our own reduction to the file's printed precision
   (worst dR 4.99e-4 kpc, dV 5.00e-3 km/s). We spend the file because
   we proved we could mint it.
2. FORTY-ONE STARS RIDE THE RAIL. The #13 item 4 guard met real data:
   41 of 773 carry V above the 250 km/s axis top. They are pinned at
   the rail as open ticks — R true, V reading 'above the chart' — and
   counted in the AUDIT line, the panel, and the provenance. Full
   values live in data/mroz_curve.txt.
3. ERROR BARS ARE NOT DRAWN. The file carries e_R and e_V per star; the
   2x2 px dots ignore them. Typical e_V is a few km/s — an order below
   the 55.5 km/s halo-OFF miss.
4. THE DATA NEVER MOVES. Press h and only the MODEL sags; the sky is
   the sky. The seat under the data is Mroz's MODEL 2 (R0 8.09 kpc,
   theta0 233.6), not our 8.2 — a 1% difference, worn openly.

## 16. The seeded frame and the hand-written lap (R1 — review commit)

**Where:** `physics.js` seedClusterVelocities; `main.js` HUD galaxy line.

Two places display had touched reality, repaired and receipted:

1. THE h KEY COULD WRITE THE DATA. Cluster seeding read the LIVE halo
   toggle: press h before the first k and all velocities seeded with the
   Sun riding at 185.0 instead of 232.1 — order of key presses as a
   hidden input. Sealed to the calibration frame (halo ON), receipted in
   gaiaLab G6: |dv| ____ km/s before the fix, ____ after.
2. THE HUD LAP WAS A LITERAL. 'Sun's lap 217.1 Myr' was typed by hand,
   true only with the halo on. Now computed live from galaxyVCirc(8.2):
   217.1 with the halo, 272.4 without — the j AUDIT and the HUD finally
   read the same instrument.
