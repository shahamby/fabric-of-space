# fabric-of-space

Interactive 3D gravity visualizer. "Fabric of space" means the gravitational
potential rendered as a displaced mesh under the bodies — real math,
compressed display. v1 is a solar-system sandbox; v2 is a Milky Way star map.

## Working agreement

- You are pairing with a beginner coder who is a senior network security
  professional. Explain every code block you produce: what it does and why.
  Teaching beats speed.
- 60/40 workload split: the human writes most of the code by following your
  exemplar patterns. You scaffold the math-heavy modules (integrator,
  potential mesh), supply data, and review. Do NOT write full solutions for
  tasks assigned to the human — guide, hint, and review instead.
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

## Non-negotiable conventions

- Physics never cheats. Only rendering cheats, and every display cheat is
  logged in CHEATS.md (#1-#5).
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
  regex tightened to word-boundary M<number>: match, sterile retest BLOCKED. CLOSED.
- ~~Stray dev server~~ may be holding port 5173 (current session moved to 5174).
  Fix when seen: netstat -ano | findstr :5173 → taskkill /PID <pid> /F. - Verified 07/12/2026
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
  