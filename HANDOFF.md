# fabric-of-space — Session Handoff (v1, through M4)

Written 2026-07-07 by Claude at Shambu's request, to seed a new context.
Scrubbed for public-repo safety — fine to commit as HANDOFF.md if desired.
Complements CLAUDE.md (working agreement + status); does not replace it.

## What this project is

- Interactive 3D solar-system gravity visualizer. "Fabric of space" =
  gravitational potential rendered as a physically displaced mesh — the
  trampoline analogy, with real math and real data.
- v1 = solar-system sandbox (nearly complete). v2 = Milky Way galaxy tier.
- Repo (GROUND TRUTH — always clone/pull before advising):
  https://github.com/shahamby/fabric-of-space (public)
- Environment: Windows, VS Code workspace "MrGrouper", Chrome, Vite +
  Three.js. Dependencies are `three` and `vite` ONLY — nothing added
  without explicit approval. Commits are made by hand in the VS Code
  Source Control panel. Claude Code is available in VS Code; the claude.ai
  project chat is the planning/architecture room.

## Working agreement (critical — also codified in CLAUDE.md)

- Shambu: senior network security professional / ethical hacker; beginner
  programmer learning JavaScript and Three.js through this project.
- VISUAL-FIRST teaching: lead with a diagram, animation, or physical
  metaphor BEFORE any equation; recommend videos and/or images for new concepts; explain
  every code block (what + why).
- 60/40 split: Shambu types most code following Claude's exemplar
  patterns; Claude scaffolds the math-heavy modules, supplies data,
  audits, and reviews. Calibrate to small typed-along steps with
  checkpoints and plain-language "what correct looks like" descriptions.
  Full assembled sections on request are fine — anchored to the repo's
  REAL names and line numbers, never guessed.
- Security framings land well: provenance, sealed baselines, fail-loud vs
  fail-silent, compensating controls, change management, audits with
  receipts.
- Pedagogy that works: falsification experiments (predict -> run ->
  observe), instruments as truth-tellers, an honest cheat ledger.
- When guidance and repo diverge, the repo wins. Clone and read first.

## Core conventions & contracts

- Physics never cheats; only rendering cheats, and every cheat is logged
  in CHEATS.md: #1 body-size exaggeration (+cap), #2 sunlight decay
  disabled, #3 log-compressed fabric depth, #4 planet well gain x100 +
  EPS 0.4 softening.
- Simulation space: barycentric ecliptic J2000; units AU / days / solar
  masses; G lives in data/bodies.json `_meta.G_au3_msun_day2`
  (2.959122e-4). Rendering converts via `eclToScene(x,y,z) -> (x, z, -y)`
  in bodyMesh.js. 1 scene unit = 1 AU. Never mix the two spaces.
- `T` key = whole-truth toggle: true body sizes AND honest fabric depth.
- Index-alignment contract: `simBodies[i]` <-> `bodyMeshes[i]`, both born
  from the same source array; every mutation (e.g. spawn) updates both.
- Energy baseline `E0` is `let`; re-seal (`E0 = totalEnergy(...)`) after
  every AUTHORIZED change (mass surgery, spawn) — alarms must not cry
  about approved work.
- DT = 0.5 sim-days default (accuracy dial). Drop to 0.05 for rogue
  swarms/close encounters — leapfrog's honesty guarantee holds only when
  the timestep resolves the fastest encounter. timeScale default 20 d/s
  (speed dial), keys `[` `]`, clamped 1–2048; `Space` pauses deposits
  only (the render loop never stops).
- Milestone commit ritual: code + CHEATS.md entries + CLAUDE.md Status in
  the SAME commit. Enforced by `.git/hooks/commit-msg`, which blocks any
  message starting `M<digit>` unless CLAUDE.md is staged. The hook fired
  successfully on its maiden voyage (the M4b commit attempt).
  Break-glass: `git commit --no-verify` (each use is a small confession).

## File map (repo names — the real ones)

- main.js — stage + loop; keyboard (T, Space, [, ], -, =, N); raycast
  picking with drag guard; HUD `#hud` (day, d/s, paused, energy drift);
  info panel `#panel` (name, mass in M-sun + kg, distance from Sun,
  speed km/s); spawnRogue(); syncMeshes()
- physics.js — computeAccelerations, leapfrogStep (LIVE integrator),
  totalEnergy; eulerStep kept as a labeled FALSIFIED specimen — never
  wire it in
- bodies.js — imports data/bodies.json as `bodiesData`; loadBodyMeshes();
  buildSimBodies(); exports G (with a console.assert tripwire)
- bodyMesh.js — makeBodyMesh (unit sphere + scale; userData holds
  {body, trueRadiusAu, displayRadiusAu}); eclToScene; KM_PER_AU; size
  constants (planet x1200 capped at 0.25 AU, sun x60)
- fabric.js — makeFabric (PlaneGeometry 80 AU, 120 segments, rotated
  flat, wireframe); updateFabric (per-vertex potential sum + log
  compression); dials: SIZE, SEGMENTS, DEPTH_SCALE, PHI_REF, EPS,
  PLANET_GAIN
- starfield.js — makeStarfield()
- data/bodies.json — 9 bodies, real JPL Horizons state vectors, epoch
  2026-07-04 TDB; masses from DE inverse ratios; _meta holds frame,
  units, G
- data/provenance.csv — per-body query URL, retrieved UTC, epoch,
  SHA-256, license
- CHEATS.md; CLAUDE.md (working agreement incl. visual-first line + hook
  rule + Status block + Idea backlog); .git/hooks/commit-msg

## State at handoff (VERIFY by pulling the repo first)

- M0–M3 complete and committed. M4a committed (17dfcea). M4b BUILT and
  demonstrated working, but its commit was blocked by the hook
  (CLAUDE.md not staged). Unblock instructions were delivered: bring
  Status current through M4, add the Idea backlog section, stage
  CLAUDE.md with the code, recommit. FIRST TASK NEXT SESSION: confirm
  the M4b commit landed and Status is current.
- App verified live via screenshots: a Day-7959 run with drift -6.63e-7
  (healthy) and a Venus panel matching NASA to three digits; lap logs
  365.5 / 365.0 / 365.5 (the predicted half-day quantization
  fingerprint). Chaos session: dozens of Jupiter-mass rogues; Saturn at
  x128 mass (3.66e-2 M-sun) ejected to 169.8 AU at 125.7 km/s; drift
  1.83e-1 correctly flagged unresolved close encounters.
- Sim state does NOT persist — refresh reloads the 2026-07-04 epoch
  (chaos is never saved). Possible future feature: scenario save/load.
- User patterns to watch: dropped-letter typos (Tab-autocomplete habit
  taught); Status updates were historically skipped (hook now enforces);
  early backup-copy instinct retired in favor of
  `git show <hash>:file` time travel.

## Validated reference numbers

- Healthy leapfrog drift: oscillates ~1e-8..1e-6, NO trend. Euler
  (falsified): drift trends to ~5.6e-3 by day 365; Mercury illegally
  reaches 0.875 AU (legal range 0.31–0.47).
- Earth lap detector: 365.0–365.5 on the half-day ruler; truth is 365.25.
- Fabric headless receipts: Sun funnel -7.89 units, sheet corner -0.56,
  Jupiter dimple -3.64 display / -2.77 true; updateFabric ~3 ms on CPU.
- Jupiter panel: 9.55e-4 M-sun ~ 1.90e27 kg, 5.0–5.5 AU, ~13 km/s.
  Venus panel: 2.45e-6 M-sun ~ 4.87e24 kg, ~0.72–0.73 AU, ~35 km/s.

## M5 plan (next milestone): the live data pipeline

Goal: the app fetches its own state vectors from JPL Horizons at load or
on demand ("load today's solar system"), with a progress bar — the
original prompt's DataGathering status-bar requirement — replacing the
static import; provenance recorded automatically; cached bodies.json as
the offline fallback.

- API: https://ssd.jpl.nasa.gov/api/horizons.api with params already
  proven in this project: format=json, COMMAND='<id>' (10, 1–8),
  EPHEM_TYPE='VECTORS', CENTER='500@0', OUT_UNITS='AU-D',
  REF_PLANE='ECLIPTIC', CSV_FORMAT='YES', START/STOP/STEP. Parse the
  $$SOE..$$EOE block, first row: JD, date, X, Y, Z, VX, VY, VZ.
- 9 sequential fetches -> a natural 0–100% progress bar.
- KNOWN-UNKNOWN: browser CORS on the Horizons API — verify first; if
  blocked, teach Vite's dev proxy (vite.config `server.proxy`) as the fix.
- Design decision to make together: browsers cannot write repo files —
  runtime provenance options are a downloadable record, an in-app
  provenance panel, or keeping the shipped provenance.csv for the
  snapshot while logging runtime fetches. Masses/radii/colors stay in a
  local table (Horizons supplies vectors only).
- New concepts to teach visual-first: fetch + async/await, promises,
  loading states, CORS.

## Beyond M5 (v2 + backlog)

- v2 galaxy tier: HYG (~120k stars) or ATHYG snapshot bulk-local; SIMBAD
  name search + detail-on-demand; dark-matter halo toggle vs the observed
  rotation curve (the killer feature); Sagittarius A* (4 million M-sun)
  anchors the map.
- Idea backlog (mirror in CLAUDE.md): event-horizon mode — r_s ~ 2.95 km
  x mass_msun; when radius_km < r_s, render the rip (dark sphere, capped
  funnel, horizon ring). The 30,000-km rogue rips at ~10,000 M-sun = 24
  presses of `=` from Jupiter mass. Physics stays Newtonian (no c in
  physics.js — an honest, logged limit).
- Maybe-someday: scenario save/load; adaptive timestep; a drag slider for
  mass; the barycenter-watch exercise (never confirmed done).

## Session rituals

- Always pull the repo before advising; audit with receipts (headless
  runs of their own physics + data, eslint no-undef on a scratch config,
  exact line anchors).
- Milestones end with: acceptance test -> clean console -> commit
  (code + CHEATS + Status together) -> report back.
- Celebrate by VERIFYING their numbers against reality; end every build
  with a concrete report-back cue. Tone: warm, collegial, precise,
  playful when they are.

---

APPEND-ONLY FILE: add new session notes below; never rewrite history above.

---

# Session append — 2026-07-08 through 2026-07-10 (M5a → M7c + public release)

Note to self (Claude → Claude). Read CLAUDE.md first; this is the color
commentary that the spec doesn't carry.

## What happened this session, in one paragraph

The entire live-data arc shipped: M5a (Vite reverse proxy over NASA/JPL
Horizons — CORS confirmed blocked by testing headers directly, proxy is the
permanent answer), M5b (sequential nine-body fetch with honest progress bar,
keyed to L), M5c (provenance: ONE sessionProvenance object, THREE views —
console log, P panel via textContent-only rendering, D download via Blob;
SHA-256 per body via crypto.subtle), M6 (applyLiveVectors splices live
vectors into the running sim: L = "anchor to reality," resets simDays +
lastLapDay, re-aims, re-seals E0), and all of M7 (event horizon:
schwarzschildRadiusKm = 2.95 * massMsun; checkCollapse with edge-detected
transition logging; black MeshBasicMaterial swap + amber RingGeometry child
mesh; fabric tear in fabric.js — vertices inside display-scaled horizon slam
to HOLE_DEPTH=12; cheat #5 = 1500× horizon gain, 1 AU floor, Newtonian
detection). Then public release prep: README.md at root, docs/tear.png
screenshot, MIT LICENSE added via GitHub UI. Jupiter collapses on the 25TH
press of = (not 24 — I corrected my own earlier estimate; 24 leaves r_s
~47,000 km, still inside the 69,911 km radius). Field observation now in
CLAUDE.md: a collapsed Jupiter got ejected to 176,411 AU (~2.8 ly) at
64.6 km/s with drift at e-14. Barycenter Horizons IDs: Sun='10',
Mercury..Neptune = '1'..'8' (NOT 9 — that's Pluto; Shambu caught my error).

## Shambu's bug taxonomy (updated — check these FIRST when auditing)

1. Dropped backticks: template literals typed with plain quotes → ${} never
   interpolates → silently wrong strings (fetched Earth 9×; progress bar
   never filled). JS fails silent; this is the #1 recurring pattern.
2. Wrong room: correct code, wrong brace level. sessionProvenance declared
   inside fetchAllBodies; records declared inside the loop. Tell: a
   ReferenceError naming something he KNOWS he declared. Ask "which braces
   was I inside?"
3. Instruction text pasted as records: my errand sentences ended up as a
   CLAUDE.md status line AND a CHEATS.md #5 title, verbatim. When writing
   ledger updates for him, give exact paste-ready text; when auditing, grep
   for my own phrasing in his docs.
4. Skipped typed edits between file drops: when I hand him replacement
   files PLUS a typed edit, the typed edit gets missed (panel r_s line).
   Verify main.js changes independently after any mixed delivery.
5. Field names singular/plural (data.results vs .result). Teach: log the
   whole envelope, inspect compartments, stop guessing.

## Process facts that matter

- Repo is truth. Audit pattern unchanged: rm -rf + shallow clone + grep -n.
  EVERY "committed and synced" claim gets verified by a fresh pull — this
  session caught real gaps three separate times (fabric.js absent from M7b
  commit entirely; M7b status line missing; panel edit skipped while the
  commit message claimed it).
- The commit-msg hook has a KNOWN BYPASS: messages starting with any prefix
  word ("Commit: M7b:") dodge the M* match. Logged in loose ends. Also
  learned: the hook checks that CLAUDE.md was touched, not that it's TRUE —
  the audit step is the real control.
- Vite dev server moved to port 5174 at one point → a stray server was
  likely holding 5173. Logged in loose ends; suggest netstat/kill next time
  it appears.
- Filesystem MCP (his local machine) timed out when tried once — bash-clone
  auditing is the reliable path.
- Teaching metaphors that landed hard this session: fetch/await = deli
  claim ticket; CORS = browser-side DLP that shreds at the desk; scope =
  nested rooms/lobby; provenance = evidence must not change after
  collection (spread-copy [...arr] to avoid shared references); parser =
  trust boundary, validate BEFORE the ledger claims OK.

## Open threads (mirror of CLAUDE.md loose ends + next moves)

- Barycenter-watch exercise: STILL never confirmed. Quickest wonder
  available: pause, T, zoom Sun, watch it orbit a point outside itself.
- Hook prefix bypass: tighten pattern.
- Stray 5173 listener.
- Backlog next candidates: (a) 1PN post-Newtonian term in physics.js →
  Mercury's perihelion precession, 43 arcsec/century, ~15 lines, huge
  payoff — probably the next milestone; (b) v2 galaxy tier (HYG/ATHYG,
  SIMBAD, Gaia, dark-matter halo, Sgr A*).
- Architecture ruling given and accepted: platform contract = "acceleration
  given state." Tier 1 plug-ins (radiation pressure, 1PN); Tier 2 with
  integrator care (magnetism → Boris integrator; GW energy loss as
  detection+display); Tier 3 = separate engines beside the sim (ray-traced
  light, full GR, quantum). No rearchitecture debt.

## The person, briefly

This project matters to him — he said so explicitly ("meaningful,"
excitement/anxious together). He hand-types the majority (60/40 holds),
catches my errors (Pluto ID), verifies before trusting, and responds best
to: security framings, visual-first teaching, honest ledgers, being treated
as the capable instrument-keeper he is. Celebrate observations ("the jump
IS the proof"). Correct my own mistakes openly — it models the audit
culture and he values it. The pale-blue-dot lap message and "All your base
belong to us" flavor are his; protect the playfulness.

Current HEAD at session close: 2b6116c (panel r_s fix) + README/LICENSE
commits landing this evening. v1 is COMPLETE through M7 and public-ready.

---
## Session append — 2026-07-12 (M8 hackathon: Einstein enters the sim)

Arc: M8a shipped, M8b shipped, M8c ceremony pending. First milestones ever
with ZERO new CHEATS entries — physics upgrades, not display tricks.

- M8a: perihelion instrument (per-step valley detector, Sun-relative bearing,
  telescoping drift ledger). Calibration: integrator creep ≈ −210k″/cy at
  DT 0.5 → −1.4k…−4.6k band at DT 0.05. Error ∝ DT² — predicted, then
  confirmed. Determinism proven in the wild: same epoch replays to the
  decimal. It is now both our integrity checker and our measurement design.
- M8b: 1PN term behind PN1 / E toggle. First landing ran 36× hot — hook
  pasted INSIDE the pair loop (pattern #2), convicted by same-epoch replay
  diff + fresh-clone grep. C_AU_DAY exonerated digit by digit. Lesson:
  amplification that scales with C(N,2) is a roster-dependent fingerprint.
- M8c protocol (NOT yet run clean): two fresh loads, same epoch. Run A pure
  Newton. Run B: pause → E → resume BEFORE the first stamp. Record #25–#175
  in both, subtract columns. Expected residue ≈ +43″/century, prograde.
  Mid-flight toggles cannot resolve it — noise only cancels when common-mode.
- New patterns: #7 cloned exemplar blocks carry duplicate declarations
  (const collision = fail-LOUD; the parser is a friend). #8 defined-but-
  never-called instrument = fail-SILENT (805 orbits, zero stamps; only
  monitoring catches the reading that never changes).
- Process facts: WIP commit double-tapped; "ix:" commit lost its F
  (pattern #6 reaches commit messages); M8b commit satisfied the hook with
  an unrelated CLAUDE.md line — "checks touched, not TRUE," caught live.
- End-of-day incident: mid-run orbital derangement (Earth year → ~187 d,
  Mercury → ~2.7 d) by an UNLOGGED privileged control — mass surgery and
  spawnRogue print nothing. Recovered twice via L: provenance pipeline as
  incident response. Action: add AUDIT console lines to both controls.
  Untracked assets/ folder of foreign JS on disk — never entered the repo;
  delete it; dependencies stay three + vite only.

  ---
## 2026-07-13 — session append: the night the dime landed

**Arc:** M9 shipped (contact physics — Venus absorbed live, Jupiter slingshotted
by conservation of momentum, AUDIT confessing KE destroyed). M8c's first verdict
convicted a counterfeit Einstein: diff column climbing −1.9/lap, energy leaking
17×. Interrogation found the formula innocent and the integration guilty — a
TOCTOU bug in physics form: leapfrog velocities live half a step behind
positions, and the velocity-dependent 1PN term read a stale speedometer every
step. M8d dead-reckoned the read to the position clock; diff went flat to
±0.05″, energy returned to the floor.

**The flat line read −91, not +43.** Claudester imported physics.js into a node
lab (zero Three.js dependencies made it portable): cross-machine determinism
confirmed to the decimal (−1394.3 on Windows/Chrome = −1394.3 on Linux/node),
DT-invariance ruled out numerics, two-body ruled out the other planets, and the
LRL eccentricity vector ruled the truth: the code produces +42.99 vs +42.98
analytic, with the three 1PN pieces decomposing −2u +1u +4u = 3u, exactly per
theory. The valley-stamp instrument was the biased witness all along —
mechanism still unknown, logged OPEN.

**M8e** mounted the LRL witness in the browser. Two-boot differential:
**+42.9″/century, flat from lap 1.** Einstein measured on this machine.

**Bug patterns fed:** #4 struck four consecutive times (question wrap ×3, DRY
reset ×1 — the skipped DRY edit created a live divergence within the hour,
caught because E-after-L habit masked it). #8 struck once: LRL witness computed
but never displayed — the gauge without a needle. #6 reached a commit message
("sesssion").

**Loose ends:** stamp-bias mystery (OPEN, SillyUserQuestions). Weekly recap
W29 due Sunday — verify the scheduled task fired.

## 2026-07-14 — session append: the shutter and the runner

Arc: the stamp-bias mystery, handed to Claudester whole, is CLOSED. The lab
(node, hash-pinned physics.js) convicted a timing side-channel: 1PN doesn't
just rotate the ellipse — it delays every perihelion by 1.140 s/lap. The
grid-locked stamp photographed run B earlier in its swing each lap: −ω·slide
= −124.7″/cy of forged retrograde over true +42.8 → clean −81.9 at EVERY DT
(the DT-invariance was the fingerprint). Staircase spikes of exactly ±ω·DT
(±1138″ @ 0.05) scattered naive readouts; −91 and +112 are draws of one broken
estimator. Predicted-then-confirmed to 0.3″/cy, five experiments. M8d was
TOCTOU in the force; this was TOCTOU in the witness. LRL immune: shape, not
schedule. Fix = M8f oracle stamping (lag ≡ 0), patch delivered as a separate
typed edit (pattern #4 protection). Zero new CHEATS — third clean milestone
running. Audit also convicted M9 findContacts (measures |B|, not |B−A|;
receipts in verdict; Venus demo sat in the one blind-spot-free config).
Claudester logged one of its own: a dropped unit factor in the prediction
column, caught because 42.8 made no sense as a prediction of −81.9 — the
parser is a friend, and so is a number that refuses to fit.

Acceptance test PASSED on Shambu's machine 07/14: two-boot differential flat
+42.8″ (stamp) / +42.9″ (LRL) from lap 25 to 150, zero spikes — the 0.1″ gap
is the 7° projection, right where it belongs. Confession: the two boots
pulled live epochs two minutes apart (13:24 vs 13:26 UTC), off-protocol; the
verdict held anyway — an unplanned robustness result, not a license.