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
   gaiaLab G6: |dv| 30.260 km/s before the fix, 0.000 after.
2. THE HUD LAP WAS A LITERAL. 'Sun's lap 217.1 Myr' was typed by hand,
   true only with the halo on. Now computed live from galaxyVCirc(8.2):
   217.1 with the halo, 272.4 without — the j AUDIT and the HUD finally
   read the same instrument.

## 17. The verdict panel (M12j)

**Where:** `main.js` VERD block, drawVerdict, verdictChi2, the r key.

The hypothesis test on screen. What is display, confessed:

1. THE PANEL IS LINEAR; THE OTHER CHART IS LOG. Same physics, two
   frames. The log chart (#13) exists for Sgr A*'s 8.7 pc valley and
   crushes all 773 measured stars into its last 10% — 11 bins across
   27 px, whiskers 3-9 px, one smear. This panel spends its whole
   width on 4-17 kpc, where the sky actually testifies. Nothing is
   hidden: every star still rides the log chart under m.
2. THE BAR AND THE TEST USE DIFFERENT RULERS. Whiskers draw +-1 SD —
   how thick the sky is, what the eye should see. chi2/nu divides by
   SEM = SD/sqrt(N) — how well each bin MEAN is known, which is what a
   hypothesis test must use. Both printed by mrozLab MZ6; the legend
   says "bar 1 SD" so the two are never confused.
3. THE COLOUR THRESHOLD IS 18. Green below, red above. 18 is MZ7's
   sealed upper bound for the halo-ON verdict, not a taste.
4. BOTH CURVES ARE ALWAYS DRAWN. The dashed one is a counterfactual —
   galaxyVCircInner's haloOverride argument, which reads a curve
   WITHOUT mutating GALAXY.haloOn. Two-arg calls are byte-identical to
   pre-M12j behaviour (verified over 1600 samples, worst |dv| 0).

## 18. What the hosted page says about itself (A1.1)

**Where:** `main.js` SNAPSHOTS, compiledBlock, the hosted notice, the L guard.

The provenance panel used to report only LIVE fetches, so a hosted visitor
saw five absences while 773 Cepheids and 145 clusters sat inside the page.
What is display, confessed:

1. THE COMPILED RECORD IS AS REAL AS THE LIVE ONE. Byte counts and sha256
   are computed at boot from the actual bundled strings, through the same
   crypto.subtle path the live fetches use — not typed in. Cross-examined
   by lab/snapshotLab.mjs SN1, which hashes the same files in Node.
2. THE HASH DEPENDS ON LINE ENDINGS, so .gitattributes pins data/** to LF.
   A checksum that changes with your operating system is not a checksum.
3. L IS DISABLED ON A HOSTED BUILD, not merely failing. It returns before
   the request instead of letting it 404 — the visitor gets a sentence
   instead of a flash. One line to remove if you host behind your own proxy.
4. THE BOOT NOTICE IS THE ONLY UNPROMPTED TEXT this app puts on screen.
   It dismisses on click and never returns that session.

## 19. The legend is generated, not written (A2)

**Where:** `main.js` KEYS, drawLegend, the ? key; `lab/legendLab.mjs`.

The panel is built from the KEYS array at boot, so the text on screen and
the list in the code cannot be different things. What is display,
confessed:

1. THE GROUPS AND THE ORDER ARE EDITORIAL. Keys are listed in the order a
   newcomer should meet them, not the order they appear in the firewall.
   The MEMBERSHIP is not editorial: legendLab L1/L2 fails if a single key
   is bound without a line here, or promised here without a binding.
2. THE DESCRIPTIONS ARE PROSE and nothing verifies them. legendLab proves
   the key EXISTS, not that the sentence is true. A wrong sentence is
   still possible; a missing key is not.
3. THE HINT AT THE BOTTOM never goes away except while the legend is open.
   It is the only permanent unprompted text in the app.
4. TWO VIEWS, ONE LIST. ? cycles closed -> docked -> full. The docked
   sheet is a SHORTENING of the same KEYS array, not a second list, so
   legendLab still guards both. The docked panel takes no mouse events
   and carries no z-index, so the camera flies through it and every data
   panel draws over it — a reference sheet must never win a fight with
   an instrument.

## 20. The archive is not rewritten by accident (B0)

**Where:** `lab/snapshot.mjs`; the fetch paths in gaiaLab, clusterLab,
cephLab, mrozLab.

Four labs re-fetch catalogues the app also ships compiled into its bundle,
and each one used to write the fresh copy straight over the shipped file.
VizieR stamps the fetch DATE into every response, so running a test
changed four of the five sha256 values in CHEATS #18 without changing a
single measurement. Fail-silent: git status was the only witness, and the
casualty was the provenance panel — the one instrument whose job is
proving the data is real.

Re-archiving is now opt-in (SNAPSHOT=1). A normal run fetches, verifies,
and leaves the shipped bytes untouched. Found by B0's own workflow: G7
requires running gaiaLab, and running gaiaLab broke SN1.

## 21. What the halo knob will actually be measuring (B1)

**Where:** `lab/haloLab.mjs`.

The valley exists: chi2/nu has a floor at MS = 4.967e11 Msun, 0.993 x the
house value, at chi2/nu 8.96. Three things must be said before B2 puts
that on a key:

1. MS IS NOT THE NUMBER PEOPLE QUOTE. It is the NFW characteristic mass
   with RS pinned at 16 kpc. The virial mass it implies is M200 = 8.17e11
   Msun at c = 12.1, r200 = 193 kpc — computed in HL4, ungated, because it
   is arithmetic on a pinned RS rather than a measurement. Quote M200.
2. THE +-3.2% WIDTH IS GEOMETRY, NOT AN ERROR BAR. The floor sits at
   chi2/nu 9, not 1, so the model carries systematics beyond its halo mass
   and a real uncertainty would need the errors rescaled. The width is the
   curvature of the valley and is never to be printed as +- on a mass.
3. THE HOUSE VALUE WAS ALREADY RIGHT, to 0.7%. B does not discover a new
   number; it converts a CHOSEN constant into a FOUND one. That is the
   whole milestone and it should not be sold as more.

## 22. The halo knob (B2)

**Where:** `main.js` the , . / handlers, nfwM200, the verdict panel's
bottom line.

The dark halo's mass is now a dial. What is display, confessed:

1. THE READOUT QUOTES M200, NEVER MS, per #21. The conversion is a
   bisection on the NFW profile with RS pinned at 16 kpc, computed twice
   by two independent implementations — main.js nfwM200 and haloLab HL4 —
   which agree at 8.174e11 Msun, c 12.1, r200 193 kpc.
2. THE STEP IS 2% AND THE STOPS ARE 0.1x TO 3.0x, matching the window
   haloLab HL1 scanned. The knob cannot be dialled anywhere the lab has
   not already been. At a stop it AUDITs instead of silently refusing.
3. THE MINT HIGHLIGHT AT 0.99x is a display flourish keyed to HL1's
   floor of 0.993x. It marks a number the LAB found; the browser does not
   search for it.
4. THE KNOB CANNOT TOUCH MEASURED DATA. Cluster seeding is pinned to
   MS_CAL — B0, receipted in gaiaLab G7 at 0.000 km/s. Dial first or last,
   the 126 velocities are identical.

## 23. The knob has a memory (B2.1)

**Where:** `main.js` c.seed in loadClusters, restoreClusters, the u key.

Found by Shambu while flying NGC 6426: dial the halo, come back to 1.00x,
and the cluster does NOT return to its original orbit. Apocentre went 14.7
-> 64.8 kpc across one round trip. What is going on, confessed:

1. THE CLUSTERS ARE INTEGRATED LIVE, not merely predicted. kdk3 advances
   them through galaxyPhi on the galaxy clock, so moving MS changes the
   force on them AT THAT INSTANT. Energy is pumped in or out. Their
   trajectories are PATH-DEPENDENT from the first keypress onward.
2. THE READOUTS ARE THEREFORE HISTORIES, not propagations. After any
   dialling, r / |v3D| / peri / apo describe a cluster that has been
   kicked — not the measured state carried forward in one potential.
3. TWO KEYS, TWO QUESTIONS. / resets the halo and KEEPS the history:
   "what happened to the thing I have been playing with?" u restores the
   catalogue epoch and leaves the halo alone: "what does the MEASURED
   cluster do in THIS galaxy?" Only the second is a physics question.
4. THE MEASURED STATE SURVIVES EVERYTHING. c.seed is copied once at load,
   before the clock starts, and nothing writes to it. Restore is byte-
   exact — verified by flying a cluster 200 Myr through a randomly
   yanked halo (158.0 -> 193.1 km/s) and reading 158.023 back.
5. THE GALAXY CLOCK IS NOT REWOUND. u restores the clusters only; the
   clock keeps running as a stopwatch, and the tracer stars (j) are not
   touched. Said in the AUDIT rather than hidden.

## 24. The valley (B3)

**Where:** `main.js` VALLEY / buildValley() / drawValley(), the 44-pixel
strip at the foot of the verdict panel.

B2 gave the halo a knob and printed one number; a number you have to
remember is not a measurement. B3 draws the whole travel. What is
display, confessed:

1. THE SCAN IS COMPUTED ONCE, AND IT BORROWS THE DIAL. buildValley runs
   at load and never again — the curve depends on the bins and the
   potential SHAPE, not on where the knob is standing. It saves
   GALAXY.MS, walks 97 points, and restores. Synchronous, so nothing —
   no frame, no instrument, no AUDIT — ever observes an intermediate MS.
   Same save/restore discipline as haloLab.
2. BOTH AXES ARE LOG, AND THAT IS NOT A FLOURISH. The knob travels 30x
   (0.1 to 3.0) and chi2/nu travels 330x. Nothing else fits in 44
   pixels. A reader who takes the strip for a linear plot will misjudge
   the valley's width badly — #8's cousin, the log axis read as linear,
   is exactly the error this shape invites.
3. THE MINT BAND IS CURVATURE, NEVER AN ERROR BAR. It marks where
   chi2/nu rises 1 above the floor. That is the SHARPNESS of the valley,
   not an uncertainty on the Milky Way's halo mass — the floor sits at 9,
   not at 1, so the model's systematics dwarf the band. #21 item 2 says
   this about the number; this says it about the picture.
4. THE STRIP IS ~72x COARSER THAN THE LAB THAT MEASURED THE VALLEY. 97
   log-spaced points is 3.606% per sample. haloLab HL2 walks the band in
   steps of 0.05% of house, after a golden-section refine of 200
   iterations. The sealed +1 band is +-3.2% — 6.4% wide, or 1.77 sample
   intervals. So the strip's floor is whichever SAMPLE won, not the true
   minimum, and its band edges snap to the grid and read systematically
   NARROW. The physics is identical — verdictChi2 is the same function
   the lab calls. The resolution is not. Read the strip for the SHAPE;
   read haloLab for the NUMBER.
5. THE PANEL'S FLOOR WILL DISAGREE WITH THE SEALED NUMBER, ON PURPOSE.
   Grid points near the floor land at 0.9319, 0.9655, 1.0003, 1.0364 —
   none of them 0.993. Sealed 0.993x / chi2/nu 8.96 comes from haloLab
   and stands. The strip is not broken when it prints something else; it
   is quantized. Written down so a future reader does not go hunting a
   bug that is really a pixel budget.
6. THE STANDING DOT IS CLAMPED TO THE FLOOR LINE. drawValley plots the
   yellow marker at max(live chi, sampled floor chi), so it cannot fall
   out of the bottom of the strip. It CAN fall out, because your knob
   position is continuous while the scan is a grid — your true chi2/nu
   can beat every sampled point. That clamp is item 4 becoming visible.
   The marker is also gated to 0.1-3.0x; B2's stops are exactly that
   range, so the gate is defensive, not a hidden truncation.

## 25. The hunt (S1)

**Where:** `main.js` HUNT, the f key.

Four questions over the 145 clusters, cycled by f. What is display,
confessed:

1. THREE QUERIES READ DATA, ONE READS THE MODEL. Fastest, farthest and
   highest are pure catalogue geometry. "Closest to escaping" divides by
   escapeSpeed, so it moves when the halo knob moves — and it SHOULD.
   That asymmetry is the receipt that the wiring is right.
2. EVERY ANSWER IS LIVE. The clusters are in flight and path-dependent
   (#23), so the winner at day 0 need not be the winner at day 900. The
   AUDIT prints the number, never just the name, so the reader can see
   what was actually being compared.
3. TIES ARE BROKEN BY CATALOGUE ORDER. Strictly-greater comparison, so
   the first in Harris order wins a tie. No tie has been observed; the
   rule is stated rather than left to chance.
4. THE CAMERA DOES NOT MOVE. f selects and draws the trail; it does not
   fly you there. Nothing hidden — the panel names the winner.

## 26. WHAT IF (W1)

**Where:** `main.js` WHATIF, applyWhatIf, the i and o keys; `physics.js` LIGHT.

The founding rule widened on purpose: physics never cheats, CONSTANTS MAY BE
DECLARED. What is display, confessed:

1. THERE IS ONE ENGINE. physics.js contains no mode flag and never checks
   one. WHAT IF lives entirely in main.js and does nothing but assign to
   declared constants. lab/sandboxLab.mjs SB1 proves the two modes are
   bit-identical at calibration values, and SB3 proves that check can fail.
2. THE LABEL IS IN THE PIXELS, because a screenshot can be cropped. A banner
   across the top naming only the MOVED constants, plus an amber fabric. No
   console-only disclosure, ever.
3. ENTERING IS CEREMONIAL. i arms, i confirms, any other key cancels AND IS
   SWALLOWED — otherwise cancelling with h would silently flip the halo.
4. LEAVING RESETS EVERYTHING. There is no half-dialled world to walk back
   into. Same doctrine as u (#23).
5. NOTHING IS FAKED, EVEN HERE. c x0.01 makes Mercury precess 119 deg per
   century because that is what 1PN does at that c — the same correction,
   the same code, one stated constant. The numbers are real consequences of
   a declared premise. They are not measurements of our universe.

## 27. The event horizon at true scale (W2a)

**Where:** `physics.js` schwarzschildRadius, `main.js` horizon / horizonRim /
updateHorizon / the s key.

Sgr A* has been in the potential since M12f but never had a SIZE. W2a gives
it one, and refuses to draw it to taste. What is display, confessed:

1. r_s IS COMPUTED, NEVER CHOSEN. 2GM/c^2, in kpc. State a mass and the
   Schwarzschild radius that mass actually has does the rest. No sphere was
   invented anywhere in this milestone.
2. IT READS THE DIALLED c. r_s ∝ 1/c^2, so slowing light in WHAT IF genuinely
   GROWS the horizon. Hardcoding c would have been a physics cheat wearing a
   rendering costume, and captureLab CP4 exists to keep it honest. The same
   sin was committed one paste later in the AUDIT's step figure and caught
   by the o dial reading 14.9x where the truth was 0.149x.
3. THE SPHERE IS BUILT AT UNIT RADIUS AND SCALED TO r_s. 1 scene unit = 1
   kpc. No minimum size, no glow. The rim ring is 0.97-1.00 of that same
   radius — an annotation at true scale.
4. AT MEASURED MASS THE HORIZON IS INVISIBLE, AND THAT IS THE POINT. r_s =
   4.1155e-10 kpc, 5.6e9 times smaller than the closest approach anything in
   this simulation has ever made. It is drawn at true size and vanishes. The
   invisibility IS the measurement, not a bug.
5. THE MARKER RETIRES WHEN THE REAL THING ARRIVES. sgrA's 0.8-unit sphere
   and its 1.4-1.7 unit ring (#8) exist BECAUSE the true horizon is
   invisible. Above the 0.05 kpc clamp they hide and the horizon is drawn
   alone. Otherwise the real event horizon would sit hidden inside a
   decorative one, and a viewer would point at the decoration — the worst
   lie this project could tell.
6. THE KNOB HAS A FLOOR, AND IT IS THE ENGINE'S. 1.21491e8x is the smallest
   multiplier putting r_s outside galaxyPhi's 0.05 kpc clamp. Below that the
   horizon lives where the potential is flat and the force is zero. Same
   number governs the marker swap: one threshold, two jobs, both principled.
7. NOTHING HERE IS A MEASUREMENT. The knob lives in WHAT IF only, the banner
   names it, and every AUDIT line ends by saying so.

## 28. The sheet's gauge (W2b)

**Where:** `physics.js` galaxySheetY, `fabric.js` galaxyDepth / GAL_REF_R.

1. THE SHEET IS PINNED TO ITS OWN FAR CORNER, 56.5685 kpc, not to an
   absolute zero. This is a GAUGE CHOICE, not a costume: a gravitational
   potential has no absolute zero and only differences are observable. The
   re-referenced sheet is arguably MORE honest than the old one.
2. WHY IT CHANGED. Absolute depth ran to -51 units with Sgr A* at 1e10x and
   left the camera behind — the horizon floated in empty space above a sheet
   that had sunk out of frame. Reported from the browser, predicted from the
   arithmetic, fixed by choosing a gauge.
3. WHAT IT COSTS. The baseline picture MOVED. The funnel at house values now
   reads 4.04 units deep where it used to read 9.2. Every screenshot taken
   before W2b used the old gauge. Said out loud so nobody hunts a regression.
4. WHAT IT BUYS. The funnel deepens 4.04 -> 18.32 units relative to its rim
   across the knob's travel. The effect is 4.5x MORE visible, which is the
   only test this project judges by.
5. SATURATION, AND IT IS REAL PHYSICS. Past ~1e9x the sheet stops reading
   the knob at all: with phi ~ 1/r everywhere, log|phi(R)| - log|phi(ref)|
   = log(ref/R) and the mass CANCELS. 1e9x and 1e10x differ by 5.253e-4
   units. A pure point-mass well is scale-free under this rendering, so past
   saturation the horizon's radius is the ONLY instrument still responding.
   The black disc is not decoration; eventually it is the whole readout.
6. THE MATH LIVES IN physics.js SO A LAB CAN REACH IT. The display dials
   stay in fabric.js and are passed in; captureLab reads them out of
   fabric.js by text rather than copying them. Receipts CP7-CP10.
