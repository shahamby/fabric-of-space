# fabric-of-space

Interactive 3D gravity visualizer. "Fabric of space" means the gravitational
potential rendered as a displaced mesh under the bodies — real math,
compressed display. v1 is a solar-system sandbox; v2 is a Milky Way star map.

## Working agreement

- You are pairing with a beginner coder who is a senior network security
  professional. Explain every code block you produce: what it does and why.
  Teaching beats speed.
- CODE AUTHORSHIP (2026-07-29, supersedes the 60/40 split and the 2026-07-18
  lab rule): Claude delivers ALL code complete and paste-ready with exact
  anchors — lab/*.mjs included. There is no longer a "Shambu's hand"
  assignment on any receipt. Shambu pastes, runs, verifies, commits, and
  retains the right to interrogate anything he does not believe. Historical
  "Shambu's hand" notes in Status and HANDOFF are LEFT AS WRITTEN — they are
  a record of what happened, not a rule still in force.
- Propose a brief plan before any non-trivial change and wait for agreement.
- Visual-first teaching: for any math or physics concept, lead with a picture,
  animation, or plain-language physical metaphor before any equation; when a
  good video exists, recommend it.
- A milestone commit is NOT COMPLETE without its CHEATS.md entries and Status
  update in the same commit; when asked to make a milestone commit, verify
  both first and do not proceed without them.
- Surface the payoffs: open every session with a fresh-clone audit, then
  explicitly name any physics beauty on the table and tie it to the passion
  map. Not everything fits in one sitting — log deferred payoffs so none
  slide by unnamed.
- Check SillyUserQuestions.md every session: answer each OPEN question with
  verified, credible references, then wrap the answered line in an HTML
  comment with the date and where the answer lives.
- Assignment format: any task handed to the human is delivered as numbered
  steps with a picture or physical demo first — never buried in a paragraph.
  Every symbol gets a plain-word name on first use (vy = "the forward part
  of the velocity"), and the plain word travels with the symbol after that.
- No elided skeletons: code is delivered as complete blocks or exact single
  lines — placeholder diagrams read as code and get typed as code.
- Cloning a function can split the donor: after any clone, audit BOTH the
  copy and the original before running.
- **Paste anchors sandwich, never edge.** Any block inserted before existing
  code must include the following distinctive line in both FIND and REPLACE,
  so that line rides along in the paste and cannot be lost. A bare function
  header is never a valid anchor.

## Non-negotiable conventions

- **Physics never cheats. Constants may be declared.** There is ONE engine.
  In TRUTH mode every constant sits at its measured value and every number on
  screen is a claim about our universe. In WHAT IF mode any constant may be
  moved, but the engine is unchanged — same integrator, same force law, same
  receipts — every moved constant is named in the pixels, and no number
  produced there is a measurement. WHAT IF must never fork physics.js; the
  guard is lab/sandboxLab.mjs, which fails if the two modes ever disagree at
  calibration values. CHEATS.md confesses what the picture does. The banner
  confesses what the numbers mean.
- Simulation space: barycentric ecliptic J2000 coordinates in AU, days, and
  solar masses (G is in data/bodies.json _meta). Rendering converts through
  eclToScene(x, y, z) -> (x, z, -y) in bodyMesh.js. Never mix the two spaces.
- 1 scene unit = 1 AU.
- Every external dataset gets a row in data/provenance.csv: query URL,
  retrieval timestamp UTC, SHA-256 of response, license. No untracked data.
- Dependencies are `three` and `vite` only. Never add a package without
  explicit human approval — minimal supply-chain surface is a requirement.
- A milestone is done when: acceptance test passes, console is clean, work is
  committed, and the Status section below is updated in the same commit.

## Layout

- main.js — stage (scene/camera/renderer) and animation loop
- starfield.js — background stars
- bodyMesh.js — body mesh factory, scale constants, eclToScene()
- bodies.js — loads data/bodies.json, builds all body meshes
- data/bodies.json — real state vectors, epoch 2026-07-04 TDB (JPL Horizons)
- data/provenance.csv — data audit trail
- CHEATS.md — ledger of every display-vs-reality divergence
- SillyUserQuestions.md — ClaudinatorFile #4, the question ledger: questions
  Shambu logs mid-project as a learning tool. Uncommented lines below the
  marker are OPEN.
- docs/weekly/ — weekly two-edition recaps, one file per week (yyyy-w#.md)
- docs/UserNotes/ — Shambu's personal session notes; not audited

## Controls (key map — source of truth is the keydown handler in main.js)

- Click        select body (drag-guarded); info panel shows its stats
- T            toggle true-scale display (escape hatch for CHEATS #1/#2)
- Space        pause / resume the integrator
- = / -        double / halve selected body's mass (re-aims + re-seals E0;
               triggers collapse/un-collapse check)
- N            spawn a rogue body
- [ / ]        halve / double time scale (1 to 2048 d/s)
- L            load live epoch — re-anchors sim to real yesterday-00:00 TDB
               via Horizons; resets day odometer and lap detector; re-seals E0
- P            toggle provenance panel (source, epoch, per-body SHA-256)
- D            download session provenance as JSON

## Roadmap

- v1 solar sandbox: M0 skeleton -> M1 static scene from Horizons data ->
  M2 leapfrog N-body integrator (acceptance: Earth laps in ~365 sim days) ->
  M3 potential fabric mesh -> M4 click-picking, info panel, time controls,
  mass editing, spawn-a-body -> M5 live Horizons fetch with progress bar and
  automated provenance writing -> M6 live-epoch splice into the running sim ->
  M7 event-horizon renderer (Schwarzschild detection, rip display, ledger).
- v2 galaxy tier: HYG/ATHYG star snapshot (bulk local), SIMBAD search,
  Gaia detail-on-demand, dark-matter halo toggle vs observed rotation curve.

## Passion → tier map (the why behind every milestone)

Driving interests: quantum, dimensional, gravity, magnetics, light.
Every milestone traces to one. Platform contract: "acceleration given state."

- Gravity — Tier 1, native. The whole sim; M8 = 1PN term (Mercury's
  43″/century). Later: GW energy loss as detection + display.
- Magnetics — Tier 2. Charged bodies + Lorentz force need a Boris
  integrator beside leapfrog; demo: solar wind riding field lines.
- Light — Tier 3 engine. Ray-traced lensing around the M7 horizon;
  light-travel-time mode ("you are seeing Neptune 4 hours ago").
- Dimensional — cross-cutting. The fabric IS the dimensional teaching
  tool (3D potential as a 2D sheet); candidate: 4D→3D projection demos.
- Quantum — Tier 3 engine, farthest out. Separate sandbox (double-slit,
  tunneling) beside the sim; never wired into the N-body core.

## Status (update at every commit)

v1's data pipeline is closed: NASA → proxy → parser → provenance → physics → fabric.

- **M0: COMPLETE** and committed. Starfield skeleton runs clean.
- **M1: COMPLETE** and committed. Static solar system from live Horizons data;
  true-scale toggle; CHEATS.md logs both display cheats.
- **M2: COMPLETE** and committed. Leapfrog N-body in motion. Instruments live:
  day counter, energy-drift monitor (oscillates ~1e-7, no trend), Earth-lap
  detector (365.0–365.5 days, half-day resolution).
- **M3: COMPLETE** and committed. The fabric — potential-displaced wireframe;
  cheats #3/#4; T flattens to honest depth.
- **M4: COMPLETE** and committed. Picking, info panel, time controls (M4a);
  mass surgery + rogue bodies with re-baseline on change (M4b).
- **M5a: COMPLETE** — Vite proxy + live Horizons test fetch verified
- **M5b: COMPLETE** — sequential live fetch + progress bar, keyed to L.
- **M5c: COMPLETE** — provenance ledger, one source with three views
  (console log, P panel, D download); SHA-256 per body.
- **M6: COMPLETE** — live epoch rebirth. L re-anchors sim state to real
  yesterday-00:00 TDB, resets odometer, re-seals E0.
- **M7b: COMPLETE** — the rip: black sphere + horizon ring on collapse (reversible
  via -), fabric tears to a fixed floor inside the display-scaled horizon.
  Verified in the wild: collapsed Jupiter ejected to 176,411 AU (~2.8 ly).
- **M7c: COMPLETE** — ledger close-out. CHEATS #5 (Newtonian detection, 1500×
  horizon gain + 1 AU floor, fixed tear depth), r_s shown in info panel for
  every body, fabric.js tear code committed, roadmap/status synced.
- **M8a: COMPLETE** — Mercury perihelion instrument (per-step valley detector,
  Sun-relative bearing, telescoping drift ledger, HUD + throttled log, resets
  on L). Calibration: integrator creep ≈ −210k″/cy at DT 0.5 → −1.4k…−4.6k
  band at DT 0.05 — error ∝ DT², prediction confirmed. Determinism verified:
  identical epochs replay to the decimal. Measurement DT for M8: 0.05.
- **M8b: COMPLETE** — 1PN correction term in physics.js behind PN1 toggle (E key,
  re-aim + re-seal + instrument reset on flip). First landing was 36× hot —
  hook inside the pair loop, pattern #2 — caught by same-epoch replay diff,
  fixed to single application per re-aim. Known limitation: totalEnergy is
  Newtonian bookkeeping, so drift gains a tiny bounded wobble with 1PN on.
- **M9: COMPLETE** — per-step contact detection at physical radii,
  momentum-conserving inelastic merge, AUDIT line with KE destroyed,
  E0 re-seal, post-merge collapse check. Zero new physics cheats (CHEATS #6
  is a rendering-of-reality confession, not a physics one).
- **M8d: COMPLETE** — 1PN TOCTOU fix verified 07/13: diff column flat to ±0.05″
  over 150 laps; energy drift back at the Newtonian floor (e-10 both runs).
- **M8e: COMPLETE** — LRL (eccentricity-vector) witness mounted beside the stamp
  instrument; honest apsidal readout from pure orbital state, reset unified.
- **M8c: COMPLETE** — the two-boot differential ceremony, run clean 07/14:
  stamp +42.8″/cy and LRL +42.9″/cy, flat laps 25–150, spike-free, vs GR's
  42.98. The stamp's earlier −91 anomaly RESOLVED by M8f; verdict in
  docs/stamp-bias-verdict.md.
- **M8f: COMPLETE** — stamp witness rehabilitated. Verdict: 1PN retimes the
  perihelion (+1.140 s/lap, DT-invariant — Einstein's quiet second door); the
  grid-locked stamp read that slide as −124.7″/cy of fake retrograde on top of
  true +42.8, clean −81.9 at every DT, plus one-lap ±ω·DT staircase spikes
  that scattered naive readouts (−91 was one draw). Fix: parabolic sub-step
  stamping — lag ≡ 0, schedule side-channel closed. Stamp and LRL now agree
  to their frames (+42.8 ecliptic vs +43.0 in-plane; 7° projection = 0.996).
  Zero new cheats. Lab: lab/ (node, dependency-free, hash-pinned physics).
- **M10a: COMPLETE** — Boris rotation proven in the lab (solar-wind proton, 5 nT):
  speed conserved to rounding, period/radius match analytic in the DT² band,
  err(DT)/err(DT/2) ≈ 4. CHECK 4 charge-sign handedness written by hand.
- **M10b: COMPLETE** — Boris turn married into leapfrogStep as a half-turn
  bracket (turn/2, kick, drift, kick, turn/2): placement review beat the spec
  2.7×, bracket restored the DT² law (×3.83 on halving, receipt in lab/).
  Unit bridge is SEC_PER_DAY alone. Dust on C loops the ~48.5-day prediction;
  energy floor unchanged; speed-hash silent.
- **M10c: COMPLETE** — the Sun's dipole made visible and survivable: field-line
  skeleton rendered (CHEATS #7, first confession since M7c), HUD field state,
  qm in the info panel, and Shift+C polar dust (qm 1000, pitch 63°) that rides
  the 0.8 shell and MIRRORS at ±16° latitude, ~160-day shuttle — receipt
  lab/polarBounceLab.mjs 4/4. Energy seal held through gravity+field+bounce.
- **M10d: COMPLETE** — lap stamp fixed: per-step zero-crossing + straight-line
  sub-step stamp (M8f medicine, 2-point dose). Frame-lock gone. Invariance
  receipt: boots at 20 and 2048 d/s match lap-for-lap to the tenth; transcripts
  byte-match the 07/16 soak through Perihelion #175. Zero new cheats.
- **M11: COMPLETE** — light enters (Tier 3 open): radiation pressure as
  dimensionless beta (push/pull, both 1/r² — no unit bridge). Lab 4/4:
  W1 beta identical at 0.5/1/2 AU; W2 beta-0.5 year 516.50 d predicted =
  measured; W3 knife-edge at beta = 1/2 (0.49 bound, apoapsis 50.00 AU;
  0.51 escapes); W4 (Shambu) beta-1 coast, drift exactly 0. Browser:
  x / Shift+X spawn Smoke (beta 0.49 / 0.51) from Earth; panel shows beta;
  sub-km/s speeds now read in m/s (Sun ≈ 13 m/s — Jupiter's reflex wobble).
  Planets' ledger unmoved with smoke alive. Zero new cheats.
- **M12a: COMPLETE** — galaxy tier opens on the mission test: the Milky Way's
  rotation curve measured in lab/galaxyLab.mjs (bulge + disk + NFW dark halo,
  G rebuilt from SI). 5/5: W0 unit bridge; R1 Sun 232.1 km/s at 8.2 kpc;
  R2 flat vs falling (11.7% vs 37.0% drop out to 24.6 kpc); R3 dark-matter
  gap 88.4 km/s; R4 (Shambu) Kepler fingerprint — v²·R ratio 1.006 without
  the halo, 1.563 with it. Dark matter as a measured gravitational effect.
- **M12b: COMPLETE** — the measured well on screen. 'g' swaps to galaxy mode
  (1 unit = 1 kpc): fabric renders galaxyPhi() — bulge + disk + halo from
  M12a — Sgr A* and the Sun's seat marked (CHEATS #8). 'h' toggles the dark
  halo LIVE: rim sag ~5.6 -> ~1.6 units, center nearly unmoved — dark
  matter's effect on the fabric itself. Solar sim untouched underneath.
- **M12c: COMPLETE** — the well is ORBITED. lab/starsLab.mjs 7/7 (W0 bridge;
  S1 232.1 km/s; S2 gap 88.4; S3 lap 217.1 Myr; S3b drift 6.9e-7; S3c dE/E
  2.0e-13; S4 (Shambu) shear clock 3.40 ON vs 4.76 OFF, with a negative test
  proving the FAIL branch fires). Browser: 'j' seeds 4 straight spokes
  (240 tracers, 4-25 kpc) + 24 real HYG stars at true positions, all
  leapfrogged in galaxyPhi. Spokes wind into arms; halo OFF makes the
  outskirts lag harder. Picking bug fixed — Three.js raycasts invisible
  meshes, so the hidden Sun mesh inside Sgr A* was answering clicks.
  Markers now report kpc/km/s/Myr. CHEATS #9.
- **M12d: COMPLETE** — the real halo. Harris catalogue (VizieR VII/202,
  147 rows) fetched live through the proxy: 145 parsed to galactocentric
  seats, 126 carrying Vlsr; provenance sha'd beside the Horizons ledger.
  Runaway census (lab/clusterLab.mjs C0–C5, C5 Shambu's hand): halo OFF
  frees ten clusters on line-of-sight speed alone — a lower bound, since
  Vlsr is only the sight-line slice of each velocity. Halo ON frees none.
  Browser: clusters live on the galaxy fabric. Zero new physics cheats.
- **M12e: COMPLETE** — the halo flies. Gaia EDR3 proper motions (VizieR
  J/MNRAS/505/5978) crossed with Harris distances and heliocentric Vr give
  126 clusters full 3D galactocentric velocities; all leapfrog live in
  galaxyPhi on the galaxy clock. Lab receipted (lab/gaiaLab.mjs G0-G5b:
  bridge 4.7405, matrix anchors, cross-catalog handshake 0.23 deg, round
  trip 6e-9, curve handshake 232.1, census 10 -> 21 -> 0, dt-halving 4.00;
  G5 Shambu's hand: NGC 3201 peri 8.65 / apo 37.93, dE 6.9e-5, negative
  test flies to 1541 kpc). Browser: clusters in flight, click one for its
  integrated future (trail + peri/apo), h re-fates 21 real objects live.
  Frame lesson banked: Vlsr is not a floor — CHEATS #10 amended, #11 filed.
- **M12f: COMPLETE** — the center's engine. Sgr A*'s published 4.30e6
  Msun enters galaxyPhi as a point mass (same 0.05 kpc clamp — dynamics
  untouched, B4-certified to 0.042 km/s); galaxyVCircInner reads the
  true inner curve to 0.1 pc for the panel only. Lab receipted
  (lab/bhLab.mjs 8/8: horizon bridge 2.9538; S2's 16.05-yr clock
  reproduced at 16.08; crossover 8.61 pc, numeric = Shambu's analytic
  at 1x and 100x; fingerprint -0.486/+0.498; B5's negative test caught
  the bracket bluff — taxonomy #13). Panel debt paid: clicking
  Sgr A* shows the curve FALLING toward center. CHEATS #12 filed.
  - **M12g: COMPLETE** — the curve on screen. A 320x170 canvas instrument
  (v toggles, galaxy mode only) draws 200 samples of galaxyVCircInner on
  rulers receipted byte-identical in lab/curveLab.mjs (6/6: anchors
  232.1 / 88.4-at-24.6 / 47.1-at-8.2; round trip 2e-15; valley 65.8 km/s
  at 8.68 pc; drops 11.7/37.0; V4 Shambu's hand — polyline reading
  4.6e-5, linear-ruler lie caught at 25.9%). Pressing h sags the plateau
  live while the Keplerian spike stands. W29 erratum filed: the 88.4 gap
  belongs to 24.6 kpc; the Sun's seat gap is 47.1. CHEATS #13 filed.
- **M12h: COMPLETE** — the disk's true body. 2,373 classical Cepheids
  (Skowron+ 2019, VizieR J/AcA/69/305/table1, probe-verified) placed
  from (l, b, d) through the front door; the WARP measured before
  rendered (lab/cephLab.mjs 6/6: fetch 215,840 B; 2,387 parsed, 14
  benched and named; frame handshake vs CDS worst 6.8e-4 deg; warp
  quadrants +1.07/-0.05/-0.58/-0.54 kpc, spread 1.65, inner flat to
  0.012; flare 2.97; CD5 Shambu's hand — shuffle negative built to
  self-run twice, geometry 1.646 vs statistics ~0.1-0.3). Browser: w
  toggles the height-coloured cloud — the warp as a colour tide on the
  rim. Velocities banked for the overlay milestone. CHEATS #14 filed.
- **M12i: COMPLETE** — the sky on the chart. 773 classical Cepheids with
  MEASURED circular velocities (Mroz+ 2019, ApJL 870 L10, OGLE archive —
  the probe moved the front door off VizieR) drawn on the M12g instrument;
  m fetches/toggles, snapshot fallback. Lab receipted (lab/mrozLab.mjs
  MZ0-MZ5: 773/773 star-by-star handshake vs the published science file,
  worst dV 5.0e-3 km/s; sky flatness 0.954 vs Kepler's 0.67; model
  residuals halo-ON 4.9 vs OFF 55.5 km/s over 11 bins, outermost miss
  76.2; MZ5 Shambu's hand — rotation-length receipt exact to the last
  digit, zero-Sun negative crashes the ring median from 231.5 to 8.2).
  41 stars above the 250 axis ride the rail, counted. Press h: the model
  abandons the measured stars on screen. CHEATS #15.
- **R1: COMPLETE** — review commit, the honesty pass. F1 seed-frame sealed
  (h can no longer write cluster data; gaiaLab G6: 30.260 km/s leak -> 0.000),
  F2 principal-death disarm (a merge that eats Sun/Earth/Mercury now AUDITs
  and disarms the lap/perihelion instruments — no frozen-corpse readings),
  F3 HUD Sun-lap computed live (217.1 halo ON / 272.4 OFF), F4 in-flight
  guards on the k/w/m loaders, F5 a Horizons failure lands the progress bar
  and AUDITs, F7 chart label clear of the rail. F6 (fabric dirty flag)
  deferred to the backlog.
- **M12j: COMPLETE** — the chart stops persuading and starts testifying.
  773 published Cepheid velocities binned into 11 testifying bins (1 kpc,
  5-20, N >= 8); error bars on screen and a live chi-square verdict.
  Lab receipted (lab/mrozLab.mjs MZ6-MZ8): MZ6 bins match MZ4's count with
  SEM 0.9-3.9 km/s; MZ7 verdict chi2/nu halo ON 9.0 vs OFF 1329.5, ratio
  147.7 (per-star with published e_V: 28.1 vs 638.3); MZ8 Shambu's hand —
  the ACQUITTAL negative, a fake sky drawn from the ON model reads 1.00,
  not 0, and the same fake sky still convicts the OFF model at 1357.8.
  'r' opens the verdict panel (linear 4-17 kpc); the browser's number is
  MZ7's number to the decimal. Press h: the model abandons the error bars
  and the verdict goes red. CHEATS #17.
- **A1: COMPLETE** — the URL exists. `base: './'` (GitHub Pages serves at a
  subpath; the default absolute asset path 404s there — verified). Static
  build carries every catalog inside the bundle via the ?raw imports, so a
  hosted visitor gets all 773 Cepheids, 145 clusters and the full solar
  system with no network. Live-catalog keys are dark on a hosted build and
  now SAY SO instead of leaking an HTTP code. Receipt: hosted URL, fresh
  profile, g/m/r reads 9.0 and h reads 1329.5 — MZ7's numbers from a machine
  that never cloned the repo. Track A continues: A2 legend, A3 tour.
  Fix riding along: the M12j paste anchor (a bare function header) silently
  ate 27 lines from renderProvenance — const blocks, the Horizons record and
  the Gaia record — and the P panel threw ReferenceError on the public build.
  Restored byte-identical from fb54627. Receipt added: eslint no-undef over
  every .js/.mjs, wired into the Pages workflow ahead of the build, so an
  undefined identifier now fails the deploy instead of shipping. New rule:
  paste anchors sandwich, never edge.
- **A1.1: COMPLETE** — the hosted page can account for itself. Provenance now
  reports the COMPILED snapshots (bytes + runtime sha256) instead of five
  absences: solar 4291/6cf6d13a6cf7, gaia 11780/989ad75bb6ad, clusters
  11910/c16f2fcd98d8, cepheids 215840/f5cdd1cc6cea, mroz 36559/270466d87042.
  Cross-examined by lab/snapshotLab.mjs SN1 (Node-side, same five files).
  .gitattributes pins data/** to LF so a checksum cannot depend on the OS.
  Hosted boot notice on screen, dismissible; L answers in a sentence instead
  of a flash. CHEATS #18.
- **A2: COMPLETE** — Wall 2 down. 24 actions were bound and 10 documented;
  the whole galaxy tier was undiscoverable. KEYS is now the single source
  of truth, the ? legend is generated from it, and a permanent 'press ?
  for controls' hint sits at the bottom of the screen. lab/legendLab.mjs
  reads both the keydown firewall and the KEYS array out of main.js and
  fails on drift in either direction — 25/25 agreement, with L3 sabotaging
  a copy of the source to prove the lab can fail. Wired into the Pages
  workflow ahead of the build, beside the eslint gate. README rewritten
  from the same list. CHEATS #19.
- **A2.1: COMPLETE** — the legend docks. ? now cycles closed -> docked -> full
  instead of an all-or-nothing overlay, so the reference sheet can stay open
  while you work. The docked sheet is a SHORTENING of the same KEYS array,
  never a second list, so legendLab guards both views with one check. It takes
  no mouse events and carries no z-index: the camera flies through it and every
  data panel draws over it — a reference sheet must never win a fight with an
  instrument. CHEATS #19 item 4.
- **B0: COMPLETE** — the halo-mass knob's foundation. MS_CAL freezes the
  cluster-seeding calibration frame so a live MS can never rewrite measured
  velocities: gaiaLab G7 FAIL-before 18.497 km/s at MS/2 and 36.604 at 2MS,
  PASS-after 0.000 / 0.000. F1's disease, second door, caught by probe
  before the knob existed. Rode along: snapshot writing is now opt-in
  (lab/snapshot.mjs, SNAPSHOT=1) after running gaiaLab silently rewrote two
  of the five sealed checksums. CHEATS #20. Next: B1 haloLab — the valley,
  minimum sealed at 0.993x house, chi2/nu 8.96.
- **B1: COMPLETE** — the valley is real, located and un-bluffable.
  lab/haloLab.mjs HL0 handshakes with MZ7 at 9.0 over the same 11 bins;
  HL1 finds the floor at MS 4.967e11 Msun (0.993 x house), chi2/nu 8.96;
  HL2 the Delta-chi2 = 1 width is +-3.2%, quoted as valley curvature and
  never as an error bar; HL3 is taxonomy #13's second appearance — the
  finder is handed a window that excludes the floor and must report the
  edge instead of naming it, which without the guard would have claimed
  1.50 x house, a 51% error stated as a measurement. HL4 records that MS
  is the NFW characteristic mass and the quotable number is M200 = 8.17e11
  Msun at c 12.1. HL5 also checks the lab left the dial where it found it.
  CHEATS #21. Next: B2, the knob on , and .
- **B2: COMPLETE** — the halo mass is a dial. ',' and '.' step MS by 2%
  within haloLab's own 0.1x-3.0x scan window, '/' resets to the house
  value; the rotation curve, verdict panel, cluster census and cluster
  trail all answer live, and the HUD, fabric and seat panel follow through
  animate(). The verdict panel gained a bottom line reading the halo ratio
  and M200 — quoting M200 and never MS, per CHEATS #21 — and turns mint at
  HL1's floor. main.js nfwM200 and haloLab HL4 agree independently at
  8.174e11 Msun, c 12.1, r200 193 kpc. legendLab caught the three new keys
  as undocumented on its first run against real work, which is the first
  time that guard has fired outside a drill. CHEATS #22. Next: B3, the
  valley drawn on the panel.  
- **B2.1: COMPLETE** — the knob's memory, found by Shambu in flight and given
  an undo. The clusters are integrated live, so dialling MS changes the force
  on them mid-flight and their orbits become path-dependent (NGC 6426's
  apocentre moved 14.7 -> 64.8 kpc across one round trip at the same halo
  mass). The catalogue epoch is now copied into c.seed once at load, before
  the clock starts. Two keys, two questions: '/' resets the halo and keeps the
  flown history, 'u' restores the measured Harris/Gaia state and leaves the
  halo where you put it — so you can ask what the REAL cluster does in a
  dialled galaxy. Restore verified byte-exact after 200 Myr through a randomly
  yanked halo. legendLab 29/29. CHEATS #23.
- **B3: COMPLETE** — the valley drawn. B2 printed one number and asked you to
  remember the last one; B3 puts the whole travel on screen. VALLEY scans
  chi2/nu across 97 log-spaced points from 0.1x to 3.0x house, ONCE at load —
  the curve depends on the bins and the potential SHAPE, not on where the knob
  is standing. The dial is borrowed and restored synchronously, same discipline
  as haloLab, so nothing observes an intermediate MS. The strip is 44 pixels at
  the foot of the verdict canvas and log in BOTH axes, because the knob travels
  30x and chi2/nu travels 330x. Three marks: mint dashed for the floor, mint
  fill for the chi2+1 band, yellow for where you are standing. Reads
  "VALLEY — press m to load the sky" until the bins exist. Honest limit: the
  strip samples at 3.606% per point, ~72x coarser than haloLab's 0.05% walk, so
  its floor and band edges are grid-snapped and will NOT match the sealed
  0.993x / 8.96 / +-3.2%. CHEATS #24.
- **S1: COMPLETE** — the hunt. Four questions over the 145 clusters, cycled by
  f, no text box required — which is why S0's input guard is still unshipped,
  see below. Three are pure catalogue geometry: fastest, farthest, highest. The
  fourth, "closest to escaping", divides by escapeSpeed and therefore MOVES when
  the halo knob moves — that asymmetry is the receipt that the wiring is right.
  Every answer is live: the clusters are in flight and path-dependent (#23), so
  the winner at day 0 need not be the winner at day 900, and the AUDIT prints
  the NUMBER, never just the name. Ties break by Harris catalogue order via
  strictly-greater comparison; none observed, the rule is stated anyway. The
  camera does not move — f selects and draws the trail, it does not fly you
  there. CHEATS #25.
- **S2 PREREQUISITE (S0):** the keydown firewall has no input guard. The moment
  a text field exists, typing "Terzan" fires t / e / r / z / a / n and spawns a
  rogue body. S2 (name search) MUST open with `if (event.target.matches('input,
  textarea, [contenteditable]')) return;` at the top of the firewall, receipted
  by typing a word into the box and confirming no key fires. Not shipped with
  S1 because S1 has no input and an untested guard is theatre.
- **W1: COMPLETE** — WHAT IF opens. One engine, declared constants, no fork.
  physics.js gains LIGHT { c, cal } on the MS/MS_CAL pattern and contains no
  mode flag; the mode is entirely main.js. i arms and confirms (cancel key is
  swallowed so backing out cannot flip the halo), i again leaves and resets
  every knob, o cycles c through 1 / 0.1 / 0.01 / 0.001 of measured. Label is
  in the pixels: top banner naming only moved constants, amber fabric.
  lab/sandboxLab.mjs SB0-SB5 all PASS — SB1 bit-identity at calibration over
  12 values, SB2 c x0.01 scales the 1PN coefficient by exactly 1e4 and leaves
  the galaxy curve untouched, SB3 the negative (the identity check reports
  DIFFERENT when a knob is left dialled), SB4 restore bit-exact. Wired into
  the Pages gate. CHEATS #26. Next: W2 — Sgr A* mass, which is what makes the
  event horizon real (10^9x measured puts r_s at 0.41 kpc, larger than one
  integration step and therefore genuinely crossable).
- **B4: SHELVED** — refine the valley strip. Its floor and +1 band edges snap
  to a 3.606%-per-sample grid, ~72x coarser than haloLab HL2's 0.05% walk, so
  the strip cannot print the sealed 0.993x / 8.96 / +-3.2%. Fix would be a
  local refine around the winning sample, or a denser grid near the floor.
  Confessed instead of fixed: CHEATS #24 items 4, 5, 6. Only worth doing if
  the strip is ever asked to be read as a NUMBER rather than a SHAPE.
- **B5: SHELVED** — lab/ledgerLab.mjs, the guard the docs do not have. eslint
  guards code against itself; legendLab guards docs against code; NOTHING
  guards the ledger. Assert CHEATS numbering is contiguous, and that every
  "CHEATS #N" cited in CLAUDE.md exists in CHEATS.md. Would have fired on the
  missing #24 the day it happened, instead of 8 sessions and 4 commits later.
  ~25 lines, wires into the Pages gate beside legendLab.
- **MOBILE: TABLED 2026-07-29** — deliberately, until the desktop build is one
  we are satisfied with. Not blocked; deferred. What the investigation found,
  so it is not re-derived later: (1) the app ALREADY renders and scrolls on
  iPhone at the hosted URL — camera and tap-select work because OrbitControls
  and Pointer Events are touch-native, so that work is already done; (2) F6 is
  NOT a mobile prerequisite — 14,641 galaxyPhi calls measure 0.376 ms desktop,
  ~2.6 ms on a low-end phone, 16% of a 60fps budget, so the arithmetic is not
  the bottleneck; the per-frame 176 kB vertex re-upload is where F6 would
  actually pay; (3) the unmeasured risk is fabric.js's wireframe:true on a
  120x120 plane — 28,800 triangles rasterised as GL_LINES, which mobile drivers
  handle badly; (4) the real problem is that 32 single-character keys have no
  touch surface, which is a UI design problem, not a technical one — the point
  needs 6 buttons (g h r m v Space), not 32. REJECTED as the answer: raising
  the soft keyboard via a hidden input. It works and it is 5 lines, but it
  covers half the screen, puts [ ] = three taps deep, makes every mistyped
  letter fire a real action, and requires S0's input guard to ship first. When
  mobile resumes it resumes with buttons, and legendLab must be extended to
  guard the button surface as a FOURTH thing that can drift from KEYS.
- **W2a: COMPLETE** — the event horizon becomes a length. MBH_CAL freezes the
  published mass; s dials Sgr A* through 1x / 1e6 / 1e9 / 1e10 in WHAT IF
  only, because a 4.3e15 Msun hole fits no data and TRUTH mode is for claims
  about our universe. schwarzschildRadius reads the DIALLED c, so r_s ∝ 1/c^2
  and slowing light grows the horizon. Drawn at true size from a unit sphere;
  the CHEATS #8 marker retires above galaxyPhi's 0.05 kpc clamp so the real
  horizon is never hidden inside a decorative one. captureLab CP0-CP6.
  Sealed: r_s 4.11554e-10 measured, 0.411554 kpc at 1e9x, knob floor
  1.21491e8x, one 0.2 Myr step at c overshoots the horizon 149.0x. CHEATS #27.
- **W2a.1: COMPLETE** — the third door. W2a put MBH into galaxyPhi and did not
  audit who else reads it. seedClusterVelocities pins haloOn and MS to
  calibration and did NOT pin MBH, so dialling the hole moved the Sun's own
  ride — 232.1 km/s became 1519.6 at 1e6x and 150180.2 at 1e10x — and every
  cluster velocity was measured against it. 126 clusters read unbound while
  the AUDIT truthfully said "halo 1.00x". gaiaLab G8 is the receipt: 1281.972
  and 149942.276 km/s before the pin, 0.000 and 0.000 after. Also closed
  taxonomy #15 at all eight readouts and fixed a hardcoded c in the s AUDIT
  that made a crossable horizon read as uncrossable. Full galaxyPhi reader
  audit in HANDOFF session 23: SEED pins, DYNAMICS honours, READOUT labels.
- **W2b: COMPLETE** — the sheet gets a gauge. galaxyDepth is referenced to the
  sheet's own far corner (56.5685 kpc) instead of an absolute zero, because a
  potential has no absolute zero and only differences are observable. Fixes
  the sheet sinking to -51 units and leaving the camera behind at high MBH;
  the funnel now deepens 4.04 -> 18.32 units relative to its rim, 4.5x MORE
  visible. Baseline picture moved (house funnel 9.2 -> 4.04) and that is said
  out loud. captureLab CP7-CP10, including CP10's finding: past ~1e9x the
  sheet is SCALE-FREE and only r_s still reads the knob. CHEATS #28.

- **W2c: COMPLETE** — the galaxy clock subdivides. At DT 0.2 Myr a cluster at
  0.6 kpc completed 9.5 orbits inside ONE step at Sgr A* 1e9x; ten unsubdivided
  steps took a circular body from 0.6 to 10,751 kpc. Each step is now spent as
  n_sub substeps until the innermost INTEGRATED body gets 40 steps/orbit,
  capped at 700. All three populations vote — tracers, HYG stars and clusters —
  because a tracer migrates inward and takes the vote (seen in the browser:
  T54 seeded past 4 kpc, voting from 0.18 kpc). n_sub clamps to 1 whenever
  MBH === MBH_CAL, and DT/1 is bit-exact, so TRUTH mode is unchanged and every
  sealed number still reproduces: stepLab ST3 reads 3.33479341669428608e+0 on
  both paths. The halo knob never moves the clock (ST5, n_sub 1 across
  0.1x-3.0x). stepLab ST0-ST7.

- **W2c.1: COMPLETE** — the count on screen. ST7 proved the cap reports what it
  ACHIEVED and not what it wanted, but that receipt was testifying into a Node
  console nobody reads while flying — bug #8, the gauge without a needle. The
  galaxy HUD now publishes n_sub, the body that set it, the radius, and the
  steps/orbit actually delivered, recomputed each frame so it stays live while
  paused. No new keys; legendLab still reads 33/33.

- **W2c.2: COMPLETE** — where Newton stops. The orbit criterion resolves a
  circular orbit; a PLUNGE crosses the well in a fraction of a period and is
  not resolved (ST8: bound at 1e9x, ejected at 1e10x with the cap binding, so
  the readout confesses). Two candidate fixes were measured and REJECTED — a
  travel criterion that was a worse relabelled target increase, and an adaptive
  per-substep loop that bought nothing reliable; tables in HANDOFF session 24.
  What shipped instead is the honest label: free-fall to the 0.05 kpc clamp at
  1e10x reaches 9.1c BEFORE any integration error, so the HUD says BEYOND
  NEWTON and names the body and the multiple (ST9, negative at 7.74e-4c). Also
  fixed: clusters carry .id, not .name, and the substep readout printed
  "(unnamed)" for all 126 — TAXONOMY #17, the fixture that does not match the
  field. CHEATS "NOT CHEATS" gains the plunge entry; CHEATS #23 amended to name
  the Sgr A* knob, whose downward turn empties the halo.

## Idea backlog

- Event-horizon mode: r_s ≈ 2.95 km × mass_msun per body; when radius_km < r_s,
  render the rip (dark sphere, capped funnel, horizon ring on the fabric).
  Physics stays Newtonian; detection + display only. (Asked on day 4837,
  the night of the rogue swarm.) — SHIPPED as M7.
- Post-Newtonian gravity (1PN correction term): makes Mercury's perihelion
  precess — the 43 arcsec/century Newton couldn't explain. Extra acceleration
  term in physics.js; a live demo of where Einstein departs from Newton.

## Open loose ends (non-milestone)

- ~~Barycenter-watch exercise~~ — DONE: observed 07/11/2026, Sun loops the origin.
- ~~HANDOFF.md needs an append-only header line~~ — DONE: landed with the
  M5–M7 session append (commit 4f5db44).
- ~~Commit-msg hook prefix bypass~~ — CONFIRMED live 07/13 by negative test,
  regex tightened to word-boundary M`'<number>'`: match, sterile retest BLOCKED. CLOSED.
- ~~Stray dev server~~ may be holding port 5173 (current session moved to 5174).
  Fix when seen: netstat -ano | findstr :5173 → taskkill /PID `'<pid>'` /F. - Verified 07/12/2026
- ~~M5c provenance design decision~~ — RESOLVED: one source, three views
  (console / P panel / D download). Shipped in M5c.
- M9 known limits: DT 0.05 can tunnel a planet-planet contact at extreme
  closing speed (step length exceeds the radius sum — leapfrog only sees
  what the timestep resolves); lower DT for collision studies. Instruments
  hold startup references — a merge that eats Sun/Earth/Mercury deranges
  the perihelion and lap detectors.
- ~~M9 findContacts measured B's distance from the BARYCENTER, not from A~~ —
  FIXED 07/14: `- A.pos[k]` restored; receipt lab/contactsReceipt.mjs runs
  FAIL-before / PASS-after; the Venus-demo blind spot is documented in
  docs/stamp-bias-verdict.md.
- ~~Earth-lap detector is frame-locked~~ — FIXED 07/16 (M10d): per-step
  zero-crossing + sub-step stamp. Invariance receipt: 20 vs 2048 d/s identical.
- M10c known limit: DT 0.05 under-samples dipole gyration inside r ≈ 0.27 AU
  for qm 300 (loop < 20 steps). Speed stays exact (Boris theorem); the path
  there does not. Grains pumped inward cross this line before M9 eats them.
- Commit-msg hook accepts empty subjects (0d091ea escaped nameless; it is
  the physicsLive untracking). Candidate: reject blank subject lines —
  second hardening, after the prefix-word bypass.
  