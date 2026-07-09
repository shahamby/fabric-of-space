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

## Non-negotiable conventions

- Physics never cheats. Only rendering cheats, and every display cheat is
  logged in CHEATS.md (#1-#4).
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

## Roadmap

- v1 solar sandbox: M0 skeleton -> M1 static scene from Horizons data ->
  M2 leapfrog N-body integrator (acceptance: Earth laps in ~365 sim days) ->
  M3 potential fabric mesh -> M4 click-picking, info panel, time controls,
  mass editing, spawn-a-body -> M5 live Horizons fetch with progress bar and
  automated provenance writing.
- v2 galaxy tier: HYG/ATHYG star snapshot (bulk local), SIMBAD search,
  Gaia detail-on-demand, dark-matter halo toggle vs observed rotation curve.

## Status (update at every commit)

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

## Idea backlog

- Event-horizon mode: r_s ≈ 2.95 km × mass_msun per body; when radius_km < r_s,
  render the rip (dark sphere, capped funnel, horizon ring on the fabric).
  Physics stays Newtonian; detection + display only. (Asked on day 4837,
  the night of the rogue swarm.)

## Open loose ends (non-milestone)

- Barycenter-watch exercise: proposed after M2, never confirmed done.
- HANDOFF.md needs an append-only header line ("append new sessions
  below; never rewrite history").
- M5c design decision pending: runtime provenance strategy (downloadable
  record vs in-app panel vs shipped snapshot + runtime log).
  