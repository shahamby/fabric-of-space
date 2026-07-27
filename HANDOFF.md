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
  `https://github.com/shahamby/fabric-of-space` (public)
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

- API: `https://ssd.jpl.nasa.gov/api/horizons.api` with params already
  proven in this project: format=json, COMMAND=`'<id>'` (10, 1–8),
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

## Session append — 2026-07-08 through 2026-07-10 (M5a → M7c + public release)

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
6. Gate below the floor: a PASS/FAIL threshold set beneath the
    instrument's own noise (matrix truncation ~1e-8; leapfrog wobble
    ~(omega*dt)^2). Struck twice in one file. Measure the floor first —
    dt-halving, component rounding — then set the gate above it.
7. The no-op negative: a negative test that mutates something the math
    cancels (a consistent log-base swap — the bases vanish in the
    mapping's ratio) proves nothing while looking rigorous. Verify the
    sabotage actually changes an observable before trusting the FAIL it
    was supposed to cause. The upgraded sin: reading a log axis as
    linear — 25.9% wrong, caught loudly.

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

## 2026-07-18 — session 04: M12a COMPLETE — the galaxy measured before rendered

lab/galaxyLab.mjs, 5/5 PASS (galaxy units audited against SI in W0):

- Rotation curve, halo ON: 217, 239, 232, 222, 214, 205 km/s from 2 to
  24.6 kpc — the flat line. OFF: 200, 212, 185, 161, 141, 117 — the fall.
- R1: Sun's speed 232.1 km/s at 8.2 kpc (target 230 ± 5).
- R2: ON drops 11.7% out to 24.6 kpc; OFF drops 37.0%.
- R3: dark-matter gap at 24.6 kpc = 88.4 km/s.
- R4 (Shambu's hand): Kepler fingerprint v²·R — ratioOff 1.006 (visible
  galaxy: Kepler holds), ratioOn 1.563 (halo: Kepler breaks). Vera Rubin's
  discovery, reproduced at the desk. His PASS/FAIL line used
  `["FAIL","PASS"][+cond]` — unprompted idiomatic JS. The student now writes
  his own instruments.
- Every number matched pre-registration to the printed digit.

Bookkeeping: session-03 twin removed, dedupe a502b4d verified on GitHub —
one copy stands.

Next: M12b — the curve lands on the fabric. Galaxy mode in the browser:
'g' swaps the scene, the mesh becomes the Milky Way's well (bulge + disk +
halo potential from this lab), the Sun's dot rides at 8.2 kpc, Sgr A*
anchors the center, and the halo toggle re-shapes the well LIVE — dark
matter's effect on the fabric itself. The mission test made literal.
W29 recap Sunday 07/19 — verify it fires.

## 2026-07-18 — session 04 addendum: M12b COMPLETE — the well on screen

'g' = galaxy mode: the sheet becomes the Milky Way's potential (1 unit =
1 kpc), every vertex asking galaxyPhi() — the exact function the lab
measured 5/5. Sgr A* (black + amber ring, the M7 language) at center; the
Sun's gold seat at 8.2 kpc. 'h' = dark halo, live: rim sag 5.6 -> 1.6
scene units while the center funnel barely moves (9.2 -> 8.0) — dark
matter reshapes the OUTSKIRTS, exactly where the curve refused to fall.
AUDIT receipts: phi(8.2) = -147556, phi(24.6) = -95236 ON / -13834 OFF.
(Claudester's hand-log predictions ran 29 and 15 high; the log-free values
matched to the digit — the hand was convicted, the code exonerated.)
CHEATS #8 confessed (depth dials + marker inflation; shape honest; physics
reads neither mesh). Solar sim runs untouched underneath; toggling back
heals the sheet next frame.

Working agreement amended (2026-07-18): Shambu authors code only in
lab/*.mjs; all core-file changes arrive as complete snippets with exact
anchors. Codified in CLAUDE.md and the Claude Project instructions.

Next (Shambu's call): M12c — stars on the sheet: a real-catalog sample
(HYG) riding the measured curve on the galactic fabric — the well not just
shaped but ORBITED. W29 recap Sunday 07/19 — verify it fires.

## 2026-07-20 — session 05: M12c COMPLETE — the well is orbited

lab/starsLab.mjs 7/7, every digit matching pre-registration:
W0 1.0227e-3 | S1 232.1 km/s | S2 88.4 km/s | S3 217.1 Myr |
S3b 6.91e-7 | S3c 1.97e-13 | S4 ratioOn 3.40 / ratioOff 4.76.
S4 was Shambu's hand. He also ran a NEGATIVE test (threshold moved to
+2.0) and confirmed the FAIL branch fires — the fail-silent shape I
flagged from the first draft is now closed, and the else stays.

Browser receipt: 'g' then 'j'. Console 'Sun's lap at 8.2 kpc = 217.1 Myr'
— the lab's S3 number, reproduced by browser-bound code. At 59 Myr with
the halo ON the four spokes were visibly wound into arms; at 102 Myr with
the halo OFF the outer arms were still near-radial while the inner knotted
up — lagging harder at nearly twice the elapsed time. Dark matter's grip
on the outskirts, drawn as winding. Energy drift -6.05e-10 throughout.

BUG FOUND AND FIXED IN THE SAME MILESTONE (pattern #11, new): Three.js
raycasts INVISIBLE meshes — intersectObjects tests layers, not .visible.
In galaxy mode every body mesh is hidden but still pickable, and the Sun's
0.279-unit display sphere sits INSIDE Sgr A*'s 0.8-unit drawn sphere at the
origin. Clicking the black hole reported 'Sun'; the stale panel then rode
the mode switch showing AU and m/s in a kpc scene. Cure: filter targets by
.visible, swap target lists by mode, clear selection on 'g'. The markers
now answer for themselves — click the Sun's seat and read 232.1 km/s /
217.1 Myr with the halo ON, 185.0 km/s / 272.4 Myr with it OFF. Same seat,
same distance, 47 km/s of dark matter, one click.

CHEATS #9 filed: tracer positions invented, two clocks at once, real stars
given assumed circular velocities, point sizes in pixels + 0.15 lift, and
the Sgr A* panel quoting a real mass this potential does not contain (said
on its own face, with Φ at the 0.05 kpc clamp printed beside it).

Next (Shambu's call): M12d candidates — (a) a bigger real catalog with a
loader, (b) Sgr A* given actual mass in the potential so the inner curve
turns Keplerian, (c) vertical structure: the disk gets thickness and stars
bob through the plane.

## 2026-07-20 — session 06: M12d COMPLETE — the halo, measured and clickable

Chose the Harris globular cluster catalogue over a bigger HYG load. Tested
both: HYG at full size is still a 1 kpc freckle, more dots on the same
postage stamp. The globulars span 0.6 to 120.5 kpc and carry MEASURED
velocities — which let the lab ask a question HYG never could.

lab/clusterLab.mjs, every figure matching pre-registration:
C0 HTTP 200 / 12995 bytes | C1 145 clusters | C2 0.032 kpc | C2b 0.116 kpc |
C3 0.6-120.5 kpc, 138 on the sheet | C4 escape speeds |
C5 (Shambu's hand) 10 unbound of 126 without the halo, 0 with it.
C5 was negative-tested unprompted — the FAIL branch fired, then back to PASS.

C2 is the receipt that matters most: our frame conversion reproduces the
catalogue's own published Rgc column to 0.032 kpc. The coordinate pipeline
is checked against a published source, not against itself.

Browser: 'k' loads through the VizieR proxy, falls back to the shipped
snapshot. NGC 3201 at 8.9 kpc moves at a measured 481.9 km/s. Baryons-only
escape speed there is 269.5 — it is leaving. Turn the halo on and escape
rises to 543.2 — it is held. One real object, one measured speed, and dark
matter is the only thing between 'bound' and 'gone'.

TWO ERRORS OF MINE, both caught by Shambu's screenshot:

- The D4 receipt quoted 279.4 km/s (the 8.2 kpc value) where NGC 3201 needs
  the 8.9 kpc value, 269.5. The code was right; my table was wrong.
- I built clusterProvenance, logged it to console, and never wired it to the
  P panel or the D download — bug pattern #2, committed inside the very
  milestone that added it. Worse, the panel printed "No live data this
  session" AFTER a successful live catalogue fetch. Both fixed: the panel
  and the download now carry both datasets, with nulls where a source was
  never touched. The Horizons progress bar also never stood down; it does now.

Ledger patterns confirmed this session: #2 (silent instrument) and #11
(invisible does not mean unpickable, from M12c).

Next (Shambu's call): M12e candidates — (a) proper motions from Gaia DR3 so
the clusters get real 3D velocities and real orbits, (b) Sgr A* given actual
mass in the potential, (c) 3D tracers so the disk gains thickness.

---- W29 RECAP (2026-07-13 -> 07-19) ----------------------------------

The week Einstein was receipted and the galaxy opened.

1. M8 CLOSED (07/13-14). TOCTOU diff flat to +/-0.05"; LRL witness
   mounted; two-boot ceremony clean: stamp +42.8"/cy, LRL +42.9"/cy vs
   GR's 42.98. M8f verdict: 1PN retimes every perihelion +1.140 s/lap;
   the grid-locked stamp read that slide as fake retrograde. Cure:
   parabolic sub-step stamping. docs/stamp-bias-verdict.md.
2. M9 loose end fixed (07/14): findContacts measured from the
   barycenter, not from A. FAIL-before/PASS-after in
   lab/contactsReceipt.mjs.
3. M10a-c: Boris proven in the lab (CHECK 4 Shambu's hand), married
   into leapfrogStep as the half-turn bracket (DT^2 law restored,
   x3.83 on halving), dipole skeleton drawn (CHEATS #7), Shift+C polar
   dust mirrors at +/-16 deg on a ~160-day shuttle.
4. M10d (07/16 soak): lap stamp cured with the M8f medicine, 2-point
   dose. Boots at 20 and 2048 d/s match lap-for-lap to the tenth.
5. M11: light enters. Beta = push/pull, both 1/r^2, no unit bridge.
   Lab 4/4 with W4 (Shambu) beta-1 coast drifting exactly 0.
   Knife-edge 0.49/0.51 live from Earth on x / Shift+X.
6. M12a: galaxy tier opens on the mission test — rotation curve 5/5,
   R4 (Shambu) Kepler fingerprint 1.006 off / 1.563 on. Dark matter
   measured: 88.4 km/s.
7. M12b: the measured well rendered. 'g' galaxy mode, 'h' live halo
   toggle, rim sag 5.6 -> 1.6. CHEATS #8.
8. M12c: the well orbited. starsLab 7/7, S4 (Shambu) shear clock with
   a negative test. Spokes wind into arms; 24 real HYG stars ride
   along. Bug pattern #11 (raycast ignores .visible) found and fixed.
   CHEATS #9.
9. clusterLab landed: 147-row Harris catalogue fetched live, 145
   parsed, C5 (Shambu) runaway census staged for the fabric.
10. Ops: commit-msg hook regex tightened to word-boundary M`<number>`,
    negative-tested live (07/13).

Shambu's hands this week: CHECK4, W4, R4, S4 (+negative test), C5.
Cheats filed: #7, #8, #9. New bug pattern: #11.
Carried into W30: M12d browser wiring + milestone push (07/20), then
M12e — Gaia proper motions, real 3D velocities, real orbits.

---

==== SESSION 2026-07-20 (close) — M12d shipped, M12e staged ===========

M12d PUSH UNBLOCKED. The hook was right, not broken: CLAUDE.md had no
edits, so `git add CLAUDE.md` staged nothing and the milestone message
was correctly BLOCKED. Cure was the missing Status bullet. Landed as
248090a with the VizieR proxy and .gitignore riding along — a fresh
clone can now reproduce M12d. W29 recap appended same day.

M12e OPENED — option (a), Gaia proper motions. Source verified live:
Vasiliev & Baumgardt 2021, VizieR J/MNRAS/505/5978/tablea1, 170
clusters, pmRA/pmDE in mas/yr. It carries no distances or RVs — good:
Harris already owns both. One fetch, one name-join.

lab/gaiaLab.mjs DELIVERED IN CHAT (not yet in repo). What is in it:

- phi() copied from physics.js GALAXY, forced to re-earn M12a's R1
  before judging anyone (G3: v_c(8.2 kpc) must answer 232.1).
- EQ2GAL rotation receipted at load — row 3 rebuilds from the NGP
  angles, rows orthonormal — and velRepo() must round-trip a
  galaxy-rest cluster to zero. Fail-loud, before any receipt prints.
- RV note: Harris Vr (HELIOCENTRIC), not Vlsr — solar motion is
  added exactly once, inside velRepo(). Vlsr rides only for C5
  kinship.
- Receipts G0-G5, then G6 = SHAMBU'S HAND: derive the 4.74047
  bridge from the AU, the Julian year, and the parsec identity
  (kpc-in-AU x mas-in-rad = 1 exactly). Negative test required.
Claude dry-ran it against live VizieR: G0-G5 PASS, G6 waiting. One
seal died honest: G2 first expected 47 Tuc at 4.5 kpc (2010-edition
memory) — VII/202 is the 1996 edition and says 4.3, so v_t is 119.0
not 124.6. The known-answer check bit its own maker first. Corrected
and confessed in the file's comment.

SEALED FOR SHAMBU'S CEREMONY (the answers exist in the 07/20 chat's
tool blocks — seal before scrolling back):

  1. G1 join count, out of 145.
  2. G5 halo OFF: C5's ten was a sight-line count; the full vector
     can add AND remove members. Your number?
  3. G5 halo ON: who, if anyone, still leaves?
  4. G4: fastest cluster? (You met one famous speedster in M12d.)

NEXT SESSION OPENS WITH:

  1. Fresh-clone audit (always).
  2. Create lab/gaiaLab.mjs from chat, write the ~6 G6 lines, seal,
     run: node lab/gaiaLab.mjs
  3. Lab commit (block in chat; message carries no M-token).
  4. Then the browser wiring plan lands: velocity arrows on the
     clusters, an orbit-launch key into galaxyPhi, 'h' mid-flight —
     watch who stays.
  5. Free gift waiting in the halo-off list: the names clump into
     families. Experiment (b)(1), a milestone early.

---

## 2026-07-21 — session 07: M12e COMPLETE — the halo flies

lab/gaiaLab.mjs, all receipts PASS: G0 two fetches (11780 + 11910 bytes) |
G1 crossmatch 145/145 (seal was >=140) | G2 bridge 4.7410 vs 4.74047 |
G3a matrix anchors | G3b cross-catalog handshake 0.23 deg median |
G3c curve handshake 232.1 | G3d median cluster v_phi -46.0 (Sun -244.3) |
G3e round trip 6.0e-9 | G4 census: halo OFF old-Vlsr-way 10, true 3D 21;
halo ON 0 | G5 (Shambu's hand) NGC 3201: rmin 8.650, rmax 37.934,
dEmax 6.92e-5, PASS; negative test flies to 1541.67 kpc | G5b dt-halving
6.92e-5 -> 1.73e-5, ratio 4.00.

TWO LESSONS, BOTH KEEPERS:

- Vlsr was never a floor. The LSR frame rides the Sun's 232 km/s, so the
  line-of-sight number can EXCEED the true space speed (NGC 3201: 481.9 vs
  367.6). M12d's "lower bound" claim amended in CHEATS #10; the honest 3D
  census reads 21 leavers without dark matter, zero with it.
- Gate below the floor, struck twice in one file: my G3e gate sat under
  the matrix's 10-digit truncation (~1e-8), and my G5 spec gate (1e-8) sat
  ~3.5 orders under leapfrog's honest wobble at dt 0.001. Shambu's 1e-4
  call was correct; certified by the DT^2 law (G5b ratio 4.00). Proposed
  bug pattern #12: calibrate the instrument's own noise floor first, then
  set the gate above it.

Also adjudicated: the G5 guesses comment cited current R 66.8 — the PASS
gate itself proves the live value was ~9.03 (66.8 > rmax would have
failed). Comment slip, corrected in-file; seal missed, law held.

Machine invariance: Shambu's transcript vs container run agree to 13+
significant digits; the negative-test rmax printed digit-identical
(1541.670747976097). Two CPUs, one universe.

Browser: 'k' now fetches Harris (with Vr) + Gaia tablea1 through the
proxy, crossmatches 145/145, seeds 126, and the clusters FLY on the M12c
galaxy clock. Click one: its future integrates live (trail + peri/apo).
Turning-point invariance receipt: after ~2 Gyr of on-screen flight,
NGC 3201 still reports the lab's peri/apo — conserved quantities do not
age. 'h' re-fates 21 real objects mid-flight. Third provenance block +
D-bundle carry the Gaia sha. CHEATS #10 amended (items 2, 5); #11 filed.

Next (Shambu's call): M12f candidates — (a) Sgr A* real mass in the
potential (inner Keplerian turn), (b) a halo-mass knob: dial M_s until the
first real cluster unbinds — dark matter measured by hostage release,
(c) tidal stream spray: test particles along NGC 3201's orbit.

ADDENDUM (post-soak): the h-census is PHASE-DEPENDENT once the clusters
have flown. At the catalogue epoch the flip reads 21 unbound; after ~Gyr
of halo-ON flight the same flip read 11, then 12 — each cluster's energy
jump on halo removal depends on WHERE in its orbit the flip catches it
(pericenter flips are the most lethal). Consequence of CHEATS #11 items
1 and 4, observed live. The 21 is the number for TODAY'S sky.

PLAY RECEIPT (2026-07-21 evening): the Sagittarius family, rediscovered by
click. Sealed prediction — NGC 6715, Terzan 7, Terzan 8, Arp 2 share one
orbit family. Measured peri/apo (kpc): 14.9/56.3, 13.2/52.0, 16.1/48.9,
17.1/52.9 — four rhymes. Bonus: Shambu clicked Pal 12 unprompted and it
sang too (15.3/66.4) — Pal 12's Sagittarius membership is a real published
finding, proposed years after the first four, reproduced here by curiosity.
On-screen r values are model-time after ~350 Myr of flight (CHEATS #11
item 1); the peri/apo rhyme is conserved-quantity physics — today's sky.

## 2026-07-22 — session 08: M12f COMPLETE — the center's engine

lab/bhLab.mjs, 8/8 PASS: B0 horizon bridge 2.9538 km/Msun vs the 2.95
spent since M7 | B1 S2's published 16.05-yr period reproduced at 16.08
(0.2%) from our G and the published 4.30e6 Msun; escape from S2's
pericenter 7974 km/s (2.7% of c); bulge inside S2's whole orbit: 1.5
Msun | B2 crossover 8.61 pc | B3 Kepler fingerprint at 1 pc: -0.486
with the hole, +0.498 without — the sign flip is the signature | B4
regression: vCirc(8.2) still 232.1, worst vEsc shift 0.042 km/s, no
census flip possible | B5 (Shambu's hand) analytic r = AB*q/(1-q)
matches the machine at 1x and 100x; sealed ratio 11.83 hit exactly.

TAXONOMY ITEM 7 — THE BRACKET BLUFF, caught by Shambu's negative test:
my crossover bisection shipped with hi = 0.05, sized only for the real
hole. At 100x the true root (101.9 pc) escapes the bracket and the
bisection returned ITS OWN EDGE (50 pc) with a straight face — 103.8%
error, fail-silent. Shambu's pencil was right; the machine was
bluffing — and he diagnosed the fix himself (widen past 101.91 pc)
before the verdict came back. Cure in 7c99f24: hi = 0.2 plus a
sign-change guard that throws. A bracketed search validates its
bracket first.

Browser: GALAXY.MBH = 4.30e6 joins galaxyPhi inside the unchanged 0.05
clamp (dynamics untouched — B4 certifies). New instrument
galaxyVCircInner reads the true curve down to 0.1 pc, panel only.
Clicking Sgr A* pays the M12c debt: "IN the potential", with the
1/3/10 pc readout falling 137 -> 83 -> 66 km/s beside the hole-less
rise 16 -> 28 -> 50. Kepler at the center, visible. CHEATS #12 filed.

Next (Shambu's call): M12g — (a) rotation curve ON SCREEN as a live
instrument h can bend, (b) star catalog at scale, (c) halo-mass knob.

## 2026-07-22 — session 09: M12g COMPLETE — the curve on screen

lab/curveLab.mjs, 6/6 PASS: V0 anchors 232.1 | gap 88.4 at 24.6 kpc |
gap 47.1 at 8.2 kpc — the recap's mislocation caught and receipted |
V1 ruler round trip 2e-15 | V2 valley 65.8 km/s at 8.68 pc, the
hole-to-bulge hand-off | V3 drops 11.7 / 37.0 restated | V4 (Shambu's
hand) polyline reading honest to 4.57e-5; the linear-ruler lie caught
at 25.9%, FAIL branch proven live.

W29 ERRATUM: the recap claimed the 88.4 km/s gap at the Sun's seat.
galaxyLab R3 always measured it at 24.6 kpc; the seat's own gap is
47.1 km/s. Three lines corrected + erratum footer (commit ab8a05f).
The error was the recap author's (Claude); the lab was right
throughout. Caught while designing V0 — receipts audit their own
paperwork.

TAXONOMY ITEM 8 — THE NO-OP NEGATIVE: the planned V4 sabotage ("swap
log10 for ln") mutates nothing; swapped consistently, the bases cancel
in the ratio. A negative test must be verified to change an observable,
or its FAIL-readiness is theater. Upgraded to the truer sin — reading
the log axis as linear.

Browser: canvas bottom-left, v toggles (galaxy mode only), redrawn on
h and g. 200 samples of galaxyVCircInner on the lab's byte-identical
rulers; the Sun's dot live at 8.2; valley tick at the receipted
8.68 pc. Press h with it open: the plateau sags (Sun 232.1 -> 185.0 —
the erratum's own 47.1, visible), the Keplerian spike stands. Dark
matter and the hole ruling separate rooms, one graph. CHEATS #13.

Next (Shambu's call): M12h — (a) star catalog at scale, (b) halo-mass
knob: dial MS to the first hostage release, (c) real MW rotation-curve
DATA overlaid on this instrument — the toy vs the sky.

## 2026-07-23 — session 10: M12h COMPLETE — the disk's true body

Source probe-verified before a line of code (the gaiaLab rule): VizieR
J/AcA/69/305/table1, Skowron+ 2019 — 2,631 classical Cepheids, Dist in
pc and Age in Myr receipted from the source's own units line.

lab/cephLab.mjs, 6/6 PASS: CD0 fetch 215,840 bytes | CD1 2,387 with
full (l, b, Dist) — 14 far outliers (Rgc > 30 kpc, anticenter, up to
121.7 kpc) BENCHED, counted and named, kept in the snapshot; 2,373 in
the body | CD2 frame handshake: our AG matrix vs the CDS-computed ICRS
columns, worst 6.8e-4 deg over 2,387 stars | CD3 THE WARP, measured:
outer quadrant means +1.07 / -0.05 / -0.58 / -0.54 kpc, spread 1.65,
inner disk flat to 0.012 — the real Milky Way's bend through our own
pipeline | CD4 the flare: sigma_z triples outward (0.338 -> 1.006,
ratio 2.97) | CD5 (Shambu's hand) the shuffle negative: same heights
dealt to the wrong stars kill the signal (1.646 real vs ~0.1-0.3
shuffled) — and he built the double-run INTO the file as a closure
called twice, so every future execution self-verifies. Geometry, not
statistics.

Disclosure: the bench was added mid-verification after the 121.7 kpc
star demanded an answer; the sealed CD3/CD4 bands never moved, and the
cut is confessed in CD1's own print, permanently.

Browser: w toggles 2,373 real stars at real seats and REAL heights,
coloured warm-above / cool-below — the warp as a colour tide sweeping
the outer rim, the inner disk pale. Fourth provenance block, D-bundle
key cepheidDisk, snapshot data/cepheids.tsv. Age column rides the
snapshot, banked for an age-paint experiment (spiral arms as age
ribbons — Skowron's own second result).

Next (Shambu's call): M12i — (a) Mroz velocity hunt: real Cepheid data
points ON the M12g curve instrument, (b) age-paint mode: one key
variant colours by Age and the arms appear, (c) the HYG knot: the
visible bubble, as humility.

## 2026-07-25 — session 11: R1 COMPLETE — the honesty pass

Six review findings closed in one commit, receipt first.

F1 was the honesty item: seedClusterVelocities read the LIVE halo
toggle, so pressing h before the first k seeded all 126 clusters with
the Sun riding at 185.0 instead of 232.1 — the order of key presses
was a hidden input to measured data. gaiaLab G6 (Shambu's hand) tests
it directly: seed one synthetic cluster lamp-on and lamp-off, demand
the same speed. FAIL-before 30.260 km/s against the pre-R1 engine at
fb54627, PASS 0.000 after — and 30.260 matched Claude's container to
the last digit, cross-machine determinism receipt #1.

F2 principal-death disarm: a merge that eats Sun, Earth or Mercury now
AUDITs loudly and nulls the dependent instrument, instead of reading a
frozen corpse forever (bug taxonomy #2's exact shape). F3 the HUD's
Sun-lap was a hand-typed 217.1, true only with the halo on; now
computed live — 217.1 ON, 272.4 OFF, so HUD, seat panel and the j
AUDIT finally read one instrument. F4 in-flight guards on k/w/m. F5 a
failed Horizons fetch lands the progress bar and AUDITs instead of
freezing it — proven by a real VizieR 502 in the wild, which also
exercised the snapshot fallback for free. F7 chart label off the rail.
F6 (fabric dirty flag) deferred.

Discipline note: the G6 FAIL-before was captured only after the fix had
already landed, on a scratch copy of physics.js recovered from
fb54627. A negative test never seen to fail is theater; it was made to
fail before the receipt was accepted.

## 2026-07-25 — session 12: M12j COMPLETE — the chart becomes a test

The rotation curve stopped persuading and started testifying.

lab/mrozLab.mjs gained three receipts. MZ6: the 773 published Cepheids
binned into 11 testifying bins (1 kpc, 5-20, N >= 8), each carrying
mean, SD and SEM — bin count sealed against MZ4's, SEM range 0.9-3.9
km/s. MZ7 the verdict: chi2/nu over the bins, dividing by SEM, nothing
fitted — halo ON 9.0, halo OFF 1329.5, ratio 147.7. Per-star with the
published e_V, for the record: 28.1 vs 638.3.

MZ8 is Shambu's hand and the deepest line of the milestone: the
ACQUITTAL negative. A fake sky drawn from the ON model plus noise at
exactly the measurement scale must read chi2/nu near 1, NOT 0 — a true
model matches its data to within the error bars and no better. It read
1.00. The same fake sky against the OFF model still convicts at 1357.8,
within 2% of the real sky's 1329.5, because the halo gap dwarfs both
the noise and the model's own 4.9 km/s error. A test that survives
having its data swapped for a simulation is testing the model.

Browser: the verdict panel, key r. The log chart (CHEATS #13) spends
90% of its width on the inner galaxy and crushes all 773 stars into
its last 27 px — measured before drawing, which forced a second
instrument rather than an unreadable one. The panel is LINEAR over
4-17 kpc: 11 error bars at 21 px spacing, both models drawn (solid =
live, dashed = counterfactual), verdict live on h. galaxyVCircInner
gained an optional haloOverride so the counterfactual is ASKED for
rather than obtained by mutating GALAXY.haloOn — the F1 lesson built
into the signature. Two-arg behaviour byte-identical over 1600 samples.
The browser's number equals MZ7's number: 9.0, then 1329.5 in red.
CHEATS #17.

## 2026-07-26/27 — session 13: A1 + A1.1 — the URL, and a page that can account for itself

Track A opened after an honest audit: the physics was strong and the
packaging was at zero. Three walls between the repo and a stranger —
nobody can run it, nobody knows what to press, half the instrument
lives in the console. A1 attacks the first.

A1: base './' in vite.config.js (Pages serves at a subpath; the default
absolute asset path 404s into a black screen — reproduced before
fixing). The bundle carries its data via the ?raw imports, so the
hosted page boots fully offline with all 773 Cepheids and 145
clusters. GitHub Actions builds and publishes on push. Live at
`https://shahamby.github.io/fabric-of-space/`.

Then the incident. The M12j paste anchor was a bare function header,
`function renderProvenance() {`. The paste consumed the 27 lines below
it — const blocks, the Horizons record, the Gaia record — and the P
panel threw ReferenceError on the PUBLIC build for four commits. The
provenance panel, the instrument whose whole job is proving the data
is real, was the thing that shipped broken. Restored byte-identical
from fb54627.

New rule, earned: PASTE ANCHORS SANDWICH, NEVER EDGE. Any block
inserted before existing code must include the following distinctive
line in both FIND and REPLACE, so that line rides along in the paste
and cannot be lost.

New receipt, earned: eslint no-undef across every .js and .mjs, wired
into the Pages workflow AHEAD of the build. Proven real by re-breaking
the exact bug in a scratch clone (11 errors) and restoring (clean). An
undefined identifier now fails the deploy instead of shipping. 27 files
gated.

A1.1 closed the gap the incident exposed. The panel had reported only
LIVE fetches, so a hosted visitor saw five absences while real data sat
inside the page. Now every dataset without a live record reports its
COMPILED snapshot — bytes and sha256 hashed at boot from the actual
bundled strings, through the same crypto.subtle path the live fetches
use. lab/snapshotLab.mjs SN1 (Shambu's hand) hashes the same five files
in Node: 5/5 PASS, and the browser's twelve hex digits match the lab's
on all five. .gitattributes pins data/** to LF, because a checksum that
changes with your operating system is not a checksum. Hosted boot
notice on screen, dismissible; L answers in a sentence instead of a
flash. CHEATS #18.
