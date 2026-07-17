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

## 2026-07-15 — session append: the sandwich and the skeleton

Tier 2 is open. M10a and M10b shipped tonight: the Boris rotation proven
in the lab first (solar-wind proton in 5 nT — four checks, the fourth
written by Shambu's own hand from a right-hand-rule prediction posed at
the desk before any code ran), then married into leapfrogStep. Charged
dust spawns on C in electric cyan, the uniform field toggles on B with an
AUDIT line, and the dreaded SI-to-sim unit bridge collapsed to one exact
constant: SEC_PER_DAY = 86400. A rotation only needs an angle; an angle is
turns-per-second times seconds; the AU never enters. And the energy
monitor cannot see the field at all — not a cheat, physics: magnetic force
does no work, so the E0 seal holds with the field on. A free watchdog.

The review that outranked the spec: Claudester's Edit A said the turn goes
above the DRIFT loop. Shambu's typing landed it above the first KICK — and
when the deviation went on trial (lab-style, uniform gravity + field
against a converged reference), the deviation won 2.7x. Unroll consecutive
steps and his placement centers every turn between two half kicks: the
textbook Boris sandwich. The spec left the turn dangling off a fused full
kick. The same trial caught BOTH simple placements failing the DT² law
(x2 shrink on halving, not x4) — a one-time seam at the very first step.
The shipped fix is the half-turn bracket: turn/2, kick, drift, kick,
turn/2. The halves fuse between steps, the seam irons out, DT² walks back
in at x4.00, and the error falls ~74x. Receipt: lab/turnOrderLab.mjs
(added with this append). Pattern for the ages: where a new beat sits
inside the integrator is physics, not style — unroll and measure before
trusting any spec, including Claudester's.

Three breaks caught before they burned, all in one review Shambu called
on himself ("I do not want to mess up our streak"):
1. The skeleton ate the engine (pattern #9): a landing-spot diagram with
   "// ...unchanged..." placeholders was typed IN PLACE of leapfrogStep's
   real loops. Every planet would have frozen on launch. New rule in the
   working agreement: no elided skeletons, ever — complete blocks or
   exact single lines only.
2. The clone split the donor (pattern #10): cloning spawnRogue into
   spawnDust migrated the donor's entire bottom half into the clone. The
   N key died silently. New rule: after any clone, audit BOTH halves.
3. The missing qm (pattern #8 in new clothes): the dust's PHYSICS twin
   never received qm — declared in the display record, dropped at the
   simBodies.push. Press B, press C, watch nothing happen, every piece
   individually "correct." THE line M10b hangs on now carries a comment
   saying exactly that.

Recovery was a golden-image restore — full files rebuilt from last known
good plus the agreed changes, never in-place patching of a corrupted
original — with receipts run before handoff: the rebuilt engine held a
test Earth at 1.0000 AU for a full year (drift 1.6e-14); a lone dust
grain gyrated 48.481 days measured against 48.481 predicted; speed hash
silent at 1.6e-15. The files landed in the repo byte-identical (missing
final newline at EOF on both — harmless, heals on next edit).

Errata, for the honest ledger: HEAD 4c42781's commit message says "M10a:"
— it is the M10b milestone. The hook checks that AN M-number exists, not
that it is the RIGHT one; the human eye remains the enforcement point.
History stands; this line corrects the record. Also this session:
find-replace collateral in the working agreement repaired (673bdb9), and
the assignment-format rule (numbered steps, picture or physical demo
first, plain-word names for every symbol) was committed after Shambu
rightly called a halt on a symbol-dense paragraph.

State at close: M0–M10b complete. CHEATS.md: six entries, ZERO new across
the entire M8-to-M10 run. SillyUserQuestions: closed. Speed-hash
watchdog: armed, twice per step, silent. W29 recap due Sunday 07/19 —
verify the scheduled task fires.

Next steps (M10c — the payoff):
- Solar dipole field: a B(pos) function in physics.js, moment along
  ecliptic z, 1/r³ falloff; borisTurn samples it per body. The bracket
  already samples pre- and post-drift positions — the plumbing is ready
  for a field that varies in space.
- First expected CHEATS entry since M7c: field-LINE rendering (density,
  length, and scale chosen for eyes; the physics never reads them).
- Demo acceptance: dust spiraling along field lines; watch for magnetic
  mirror bounce near the poles — grad-B is real in a dipole, and if it
  bounces, that is the aurora's opening act.
- Instrument candidates: HUD shows field ON/OFF (console-only today —
  instruments beat memory); info panel shows qm for charged bodies;
  optional gravitational-drift check against the g/omega prediction.
- Shelf, still named: GW energy loss (gravity tier), lensing and
  light-travel time (light tier), 4D-to-3D projections (dimensional).

## 2026-07-16 — session 01: M10c COMPLETE — the mirror left the lab
(spans 07-15 evening into 07-16; closes the arc session 00 opened)

Shipped, in three receipted phases:
- dipoleLab.mjs (SI): falloff 8.000000000, pole/equator 2.000000000, speed
  hash 4.03e-13 across 11.4M steps, and THE MIRROR — a 30° tilt bounced at
  3.9998x home field, 33.15° latitude vs 33.15° predicted. Paper first,
  code second. Windows and Claudinator's Linux printed identical digits.
- dipoleTesla() wired into physics.js (AU in, Tesla out, normalized at
  1 AU; unit bridge still SEC_PER_DAY alone; the magnet rides the Sun by
  name). dipoleWireLab 6/6 — after draft one FAILED its own W3 at 8.787
  and taught us: THE GUIDING CENTER IS NOT THE PARTICLE. A grain circles
  a point one gyro-radius from where you put it, and in a 1/r³ field that
  offset samples a different grip. Equalize rho/r and the bias cancels in
  the ratio: 8.0000. The stamp-bias lesson in magnetic clothes.
- Field-line skeleton (CHEATS #7 — geometry honest, r = L·cos²(lat);
  shells, longitudes, truncation, glow are stagecraft), HUD field state,
  qm in the info panel, and Shift+C polar dust (qm 1000, pitch 63°): rides
  the 0.8 shell, MIRRORS at ±16°, ~160-day shuttle. polarBounceLab 4/4
  with gravity on: seal 4.1e-7, five shuttles in 400 days, resolution
  floor never approached.

Live-sky findings (the 44,000-day soak):
- The eccentricity pump: the field does no work but it torques. Grains
  keep orbit SIZE and trade SHAPE; perihelia dive; Dust-12's dove below
  the solar radius and M9 fed it to the Sun — two milestones
  interoperating unprompted. Verified from the info panel alone: Dust-10
  at 0.49 AU / 49.9 km/s carries exactly its 0.8 AU birth energy.
- Earth-lap detector convicted of frame-lock: stamps quantize to
  timeScale/fps (358.4 = 21x17.07, 375.5 = 22x17.07 at 1024 d/s). M8f
  disease, second organ. Loose-ended; physics untouched.
- Honesty floors: DT 0.05 under-resolves gyration inside ~0.27 AU
  (qm 300) and ~0.41 AU (qm 1000).
- Polar-1..5 launched field-OFF (the AUDIT parenthetical said so): tilted
  Kepler orbits until B came on and the dipole caught them mid-flight.
  Capture cost zero energy — Polar-5's panel reads a = 1.08 AU, its
  launch energy to within rounding.

Errata & confessions:
- 0d091ea is the physicsLive.mjs untracking, wearing an empty commit
  message. History stands; this line is its name. Hook gap logged.
- Claudinator's .gitignore append produced `distlab/out/` — no trailing
  newline on the line above. Caught by reading the file back; fixed.
  Pattern #11: an append is an edit to the line above it until a
  trailing newline is proven.
- The lab/out/ ignore was over-broad (it would silently hide future
  receipt files); narrowed to the one generated artifact.

Next steps:
- M10d (small, next session's opener): lap-stamp sub-step cure — the
  M8f medicine for the second organ.
- M11, the fork (Shambu's call): radiation pressure, LIGHT'S FIRST ENTRY.
  Shelf alternative: Parker spiral, the honest heliosphere.
- W29 recap Sunday 07/19 — verify the scheduled task fires.

## 2026-07-16 — session 02: M10d COMPLETE

Shipped: checkLap() — per-step zero-crossing, straight-line sub-step stamp.
Old frame-level detector deleted. A crossing needs 2 points; a minimum needed 3.

Receipts:
- Frame-lock gone: steady 365.3. The 365.2s are real Jupiter wobble sitting
  on the one-decimal rounding seam.
- Invariance: boots at 20 and 2048 d/s match lap-for-lap to the tenth, and
  byte-match the 07/16 soak through Perihelion #175.
- Perihelion ~-1445"/cy = known Newtonian creep band at DT 0.05. Not a bug.
  Einstein's +42.8 only shows in the two-boot differential (M8c).

Non-milestone findings:
- 'q' typed in the Vite terminal QUITS the dev server — same signature as the
  soak drops. OneDrive ruled out. Ceremony reloads are now F5 in the browser.
- timeScale boots at 20: doubling gives 40..1280, then clamps to 2048. 64 and
  1024 are only reachable after touching a clamp. Arithmetic exact, physics
  blind to it. Parked option: boot at 16 (one-line change, own micro-commit).
- Pattern #12 (candidate): an unnamed key gets improvised — name every key.

M11 fork resolved by delegation to Claudester, 07/16: RADIATION PRESSURE.
Parker spiral stays on the shelf.

Next: lab/radiationLab.mjs — 4 pre-registered checks. W1 push/pull ratio
identical at 0.5 / 1 / 2 AU. W2 beta=0.5 circular orbit, predicted period
516.5 days. W3 blowout knife-edge: beta=0.49 bound (apoapsis 50 AU),
beta=0.51 escapes. W4 = Shambu's check: beta=1 straight-line coast.
W29 recap due Sunday 07/19.

## 2026-07-17 — session 03: M11 COMPLETE — light entered; course reset to the fabric

Lab receipts (lab/radiationLab.mjs, SI first principles, 4/4 PASS):
- W1: beta 0.3827 at 0.5 / 1 / 2 AU — one number everywhere.
- W2: beta-0.5 year — predicted 516.50 d, measured 516.50 d (M10d stamp).
- W3: knife-edge at beta = 1/2 — 0.49 BOUND, apoapsis 50.00 AU (paper 50.00);
  0.51 ESCAPING, 65.5 AU at day 16000.
- W4 (Shambu): beta-1 coast — Worst 0, Speed Drift 0. Exact zeros are real:
  the push-pull float mismatch sits below double precision beside AU-scale
  numbers. Falsifier: beta 0.999 FAILs loudly.

Engine + browser: applyRadiation() post-pair hook in physics.js; x / Shift+X
spawn Smoke (beta 0.49 / 0.51) from Earth; panel shows beta; sub-km/s speeds
now read in m/s (Sun ~13 m/s — Jupiter's reflex wobble, the exoplanet
radial-velocity signal). Non-interference receipt: perihelion checkpoints
byte-match the pre-M11 soak with smoke alive. Honesty notes: photons carry
the momentum (no Sun reaction); totalEnergy stays Newtonian (drift held
e-9-class); merged smoke loses beta (v1). Zero new cheats. Stray VS Code
auto-import (three/tsl) caught in the lab file and removed.

Bookkeeping:
- 07/16 soak drops CONFIRMED as Shambu's 'q' presses (first round). Closed.
- M10d landed as TWO commits, same message: df31c79 (code + status, 15:30)
  and e83904c (HANDOFF + cleanup, 16:16). Benign split, named here; pushed
  history stands. M11 = 1abc988.
- Boot timeScale stays 20 (Shambu's call).

COURSE CORRECTION (Shambu, 07/17): the goal is the title — visualize
gravitational effects. The fabric is the instrument, not the decoration.
Every milestone now passes one test: does it make a gravitational effect
visible on screen. Side-quest physics tiers (PR drag, sail, Parker spiral)
are shelved indefinitely. Road: the galaxy tier.

Next: M12a — lab/galaxyLab.mjs, the Milky Way's gravity measured before
rendered. W29 recap Sunday 07/19.


## 2026-07-17 — session 03: M11 COMPLETE — light's first entry, Tier 3 open

Lab first: lab/radiationLab.mjs, SI from first principles, 4/4 PASS.
- W1: beta 0.3827 at 0.5 / 1 / 2 AU — one number everywhere.
- W2: beta-0.5 circular year — predicted 516.50 d, measured 516.50 d,
  measured with the M10d sub-step lap stamp.
- W3: knife-edge at beta = 1/2 — 0.49 BOUND, apoapsis 50.00 AU (paper 50.00);
  0.51 ESCAPING, 65.5 AU at day 16000.
- W4 (Shambu): beta 1 — Worst 0, Speed Drift 0. Exact zeros are real: the
  push-pull float mismatch is below double precision next to AU-scale
  numbers, so it absorbs. Falsifier: beta 0.999 FAILs loudly.

Engine: applyRadiation() in physics.js — post-pair hook beside 1PN. Outward
term on beta bodies only. Photons carry the momentum: no reaction on the
Sun — honest, not a cheat. Known limits: totalEnergy stays Newtonian
(drift held e-9-class with smoke alive); merged smoke loses beta (v1).

Browser: x = Smoke beta 0.49 from Earth (apoapsis ~50 AU, ~180-yr round
trip); Shift+X = beta 0.51, never returns. Smoke carries no qm — the dipole
cannot grip it; only light pushes. Panel shows beta. Non-interference
receipt: perihelion checkpoints byte-match the pre-M11 soak with smoke
alive — a 1e-12 Msun grain moves nothing at display precision.
Panel fix: sub-km/s speeds read in m/s — the Sun shows ~13 m/s, Jupiter's
reflex wobble, the radial-velocity exoplanet signal. Zero new cheats.

Bookkeeping: 07/16 soak drops CONFIRMED as Shambu's 'q' presses in the Vite
terminal — loose end closed. Boot timeScale stays 20 (Shambu's call).
Stray VS Code auto-import (three/tsl Loop) caught in the lab file and
removed — labs stay dependency-free.

Shelf: Parker spiral; Poynting-Robertson drag (light that does WORK — the
field never does); steerable-beta sail (LightSail 2). Next fork: Shambu's.