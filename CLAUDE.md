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
- A milestone commit is incomplete without its CHEATS.md entries and Status
  update in the same commit; when asked to make a milestone commit, verify
  both first and do not proceed without them.
- Surface the payoffs: open every session with a fresh-clone audit, then
  explicitly name any physics beauty on the table and tie it to the passion
  map. Not everything fits in one sitting — log deferred payoffs so none
  slide by unnamed.
- Check SillyUserQuestions.md every session: answer each OPEN question with
  verified, credible references, then wrap the answered line in an HTML
  comment with the date and where the answer lives.

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

- M0: complete and committed. Starfield skeleton runs clean.
- M1: complete and committed. Static solar system from live Horizons data;
  true-scale toggle; CHEATS.md logs both display cheats.
- M2: complete and committed. Leapfrog N-body in motion. Instruments live:
  day counter, energy-drift monitor (oscillates ~1e-7, no trend), Earth-lap
  detector (365.0–365.5 days, half-day resolution).
- M3: complete and committed. The fabric — potential-displaced wireframe;
  cheats #3/#4; T flattens to honest depth.
- M4: complete and committed. Picking, info panel, time controls (M4a);
  mass surgery + rogue bodies with re-baseline on change (M4b).
- M5a: complete — Vite proxy + live Horizons test fetch verified
- M5b: complete — sequential live fetch + progress bar, keyed to L.
- M5c: complete — provenance ledger, one source with three views
  (console log, P panel, D download); SHA-256 per body.
- M6: complete — live epoch rebirth. L re-anchors sim state to real
  yesterday-00:00 TDB, resets odometer, re-seals E0.
- M7b: complete — the rip: black sphere + horizon ring on collapse (reversible
  via -), fabric tears to a fixed floor inside the display-scaled horizon.
  Verified in the wild: collapsed Jupiter ejected to 176,411 AU (~2.8 ly).
- M7c: complete — ledger close-out. CHEATS #5 (Newtonian detection, 1500×
  horizon gain + 1 AU floor, fixed tear depth), r_s shown in info panel for
  every body, fabric.js tear code committed, roadmap/status synced.
- M8a: complete — Mercury perihelion instrument (per-step valley detector,
  Sun-relative bearing, telescoping drift ledger, HUD + throttled log, resets
  on L). Calibration: integrator creep ≈ −210k″/cy at DT 0.5 → −1.4k…−4.6k
  band at DT 0.05 — error ∝ DT², prediction confirmed. Determinism verified:
  identical epochs replay to the decimal. Measurement DT for M8: 0.05.

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
- Commit-msg hook has a prefix bypass: messages like "Commit: M7b: ..." dodge
  the M* pattern check (observed on the M7b commit). Fix: anchor the regex
  so only a leading M<number> passes.
- ~~Stray dev server~~ may be holding port 5173 (current session moved to 5174).
  Fix when seen: netstat -ano | findstr :5173 → taskkill /PID <pid> /F. - Verified 07/12/2026
- ~~M5c provenance design decision~~ — RESOLVED: one source, three views
  (console / P panel / D download). Shipped in M5c.