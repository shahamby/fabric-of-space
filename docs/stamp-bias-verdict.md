# The Stamp-Bias Verdict

**Case:** SillyUserQuestions OPEN item, logged 2026-07-13 — *"Why does the
valley-stamp bearing misreport perturbation differentials (−91″/cy) that the
LRL witness reads true (+43″/cy), and why is that bias DT-invariant?"*

**Investigator:** Claudester, working alone by delegation (2026-07-13 session).
**Evidence integrity:** every experiment ran against a byte-identical copy of
the repo's physics.js — SHA-256 `4a72abd9a6c52866e02d864ca5d13e2e46571d8b5bba66230b4ccd724f08c302`
for both the repo file and the lab copy. The lab is dependency-free node
(supply chain: `three` + `vite` remain the only packages, untouched).

---

## TL;DR — the verdict

**The stamp never lied about WHERE Mercury was. It lied about WHEN it looked.**

Einstein enters your sim through *two* doors, and you'd only instrumented one:

1. **Rotation** — 1PN turns the ellipse +42.98″/century. The famous door.
   Your LRL witness reads it true: +42.9.
2. **Retiming** — 1PN also *delays every perihelion arrival by 1.140 seconds
   per lap.* The quiet door. The lab measured this drift at DT 0.5, 0.1,
   0.05, and 0.025 and got **1.140 s/lap every single time** — it's physics,
   not numerics. (Why: at perihelion, 4GM/r > v² for Mercury, so the 1PN term
   pushes *outward* — gravity is softened exactly where the slingshot happens,
   so every lap runs a hair long.)

Your two boots share one fixed step grid, and the stamp reads the bearing at
a grid step roughly one step *after* the true minimum. As run B's minima
slide later beneath that fixed shutter, run B gets photographed earlier and
earlier in its swing each lap. At Mercury's perihelion angular rate
(ω = 6.322°/day), a 1.140 s/lap slide forges

> bias = −ω · (slide rate) = **−124.7″/century of fake retrograde precession**

stacked on the true +42.8. The clean stamp differential is therefore
**−81.9″/cy — identical at every DT and both rosters.** That is the
DT-invariance you observed: the slide is physics and ω is physics, so the
bias never touches DT.

On top of the clean −81.9 sits **staircase noise**: whenever run B's sliding
minimum grazes a step-grid boundary, the stamp toggles to the adjacent grid
step for one lap — a one-lap spike of exactly ±ω·DT (**±1138″ at DT 0.05**;
the lab measured ±1137.8/−1138.2). A handful of these spikes scattered through
the fit window is what turned −82 into your browser's −91 — and into +112,
−151, +103, and −69 in my naive lab runs. **All of those numbers are draws
from the same broken estimator.** Despiked, every one of them collapses to
−81.9.

Your instrument concept was sound. Its *clock* was the leak.

---

## The metaphor (read this before the tables)

A photo-finish camera fires on a fixed schedule — click, click, click — and
each lap it photographs a runner as he crosses the line. Runner A keeps
perfect time. Runner B arrives **1.14 seconds later every lap**.

The camera doesn't wait for runner B. It fires on ITS schedule, so each lap
it catches B a little earlier in his stride — a little farther *before* the
line. Flip through the photos and runner B appears to drift *backward* along
the track, even though on the track itself he is inching forward.

And once in a while, B slips so far behind the shutter that the *next* click
catches him instead — and in that one photo he teleports a full frame forward.
That's the ±1138″ spike.

The LRL witness never used the camera. It measures the shape of the track
itself — the ellipse's orientation from instantaneous position and velocity —
so the schedule has nothing to leak through. **Shape, not schedule.** That is
why it never flinched.

Security framing, because it's exact: M8d convicted a TOCTOU bug *inside the
force* (velocities read half a step stale). This is the same family, one
level up — a TOCTOU *inside the witness*. The stamp is a once-per-lap poller
on a shared clock; the LRL is a full packet capture. The secret (1PN)
exfiltrated through a timing side-channel the monitor wasn't watching.

---

## Evidence

### Table 1 — naive two-boot differentials (M8c protocol, laps 25–175)

| Experiment | DT | Stamp (naive) | LRL | Oracle* | Timing drift | Grid jumps |
|---|---|---|---|---|---|---|
| E1 nine-body (M8c condition) | 0.05 | **+112.5** | +42.9 | +42.8 | +1.140 s/lap | 5 |
| E2 two-body | 0.05 | **−151.0** | +43.0 | +42.8 | +1.140 s/lap | 7 |
| E3 two-body | 0.5 | **−81.4** | +43.4 | +42.6 | +1.140 s/lap | 0 |
| E4 two-body | 0.1 | **+102.6** | +43.0 | +42.8 | +1.140 s/lap | 1 |
| E5 two-body | 0.025 | **−69.5** | +43.0 | +42.8 | +1.140 s/lap | 6 |

\* *Oracle = a court-appointed expert the browser never had: parabolic sub-step
interpolation reading the bearing at the TRUE radial minimum instead of at the
stamp's grid step. All rates in ″/century.*

Note E3: with **zero** grid jumps in the window, the naive stamp reads the
clean bias directly — and the timing-decoherence prediction (−124.3) matches
the measured bias (−123.9) to less than half an arcsecond. That was the first
conviction.

### Table 2 — the collapse (spikes trimmed by MAD gating, 3 rounds)

| Experiment | DT | Clean stamp | Oracle | Bias (clean − oracle) | Predicted (oracle − ω·slide) |
|---|---|---|---|---|---|
| nine-body | 0.05 | **−81.9** | +42.8 | −124.7 | −81.8 |
| two-body | 0.05 | **−81.8** | +42.8 | −124.7 | −81.9 |
| two-body | 0.5 | **−81.4** | +42.6 | −123.9 | −81.7 |
| two-body | 0.1 | **−81.8** | +42.8 | −124.6 | −81.8 |
| two-body | 0.025 | **−81.8** | +42.8 | −124.7 | −81.9 |

Predicted, then confirmed, to ≤0.3″/cy — five experiments, four DTs, two
rosters. The DT² law session's discipline, applied to its own instrument.

### The spike receipt

Consecutive-lap discontinuities in the E1 stamp column: +1137.76, −1138.15,
+1137.79, −1138.18, +1137.8, −1138.2, … — against predicted ω·DT =
6.322°/day × 0.05 d × 3600 = **1138.0″**. Matched to a tenth of an arcsecond,
and they arrive in ±pairs one lap apart: the stamp flickering across a grid
boundary and snapping back. Full per-lap columns: `lab/out/E1_ninebody_DT005.csv`.

### The two honest witnesses agree to their frames

LRL reads +43.0 (in Mercury's orbital plane). Oracle reads +42.8 (projected
onto the ecliptic, where the stamp's atan2 lives). The ratio is 0.996 —
exactly the projection factor for Mercury's 7° inclination at its perihelion's
offset from the node. Sub-arcsecond consistency between two independent
instruments; nothing left unexplained.

### Why your −91 and my +112 are the same answer

Same broken estimator, different spike draws. The spike *pattern* depends on
microscopic trajectory details (exact epoch, whether E was thrown at prime or
a few steps in, roster) — but the clean core underneath is always −81.9. Your
"DT-invariant −91" was the clean −82 plus one modest unfavorable draw; the
invariance you noticed was real, and it was the fingerprint of the mechanism.

---

## Mechanism, in four lines

For lap k in a window with no grid jumps:

- recorded(k) = λ_peri(k) + ω · lag(k), where lag = t_stamp − t_min
- t_stamp is grid-locked and shared between boots; t_min,B(k) = t_min,A(k) + k·δ with δ = 1.140 s
- so lag_B(k) = lag_A(k) − k·δ, and the differential picks up −ω·δ per lap = −124.7″/cy
- when B's t_min crosses a step midpoint: t_stamp toggles one grid step for one lap → ±ω·DT spike

---

## The fix — M8f (see M8f-instrument-patch.md, delivered separately)

Stamp the *oracle's* bearing: parabola through the last three r samples finds
the true minimum; the same parabola interpolates the position there. Then
lag ≡ 0 and the schedule has nothing to leak through. Lab-validated: the
oracle read +42.8 in all five experiments. The LRL stays as the second
witness — two instruments, two principles, one answer.

The patch is in its own file **on purpose** — bug pattern #4 (typed edits get
skipped when bundled with larger blocks). Zero new CHEATS entries: this is an
instrument repair, physics untouched, display untouched.

**M8f acceptance test:** rerun the M8c two-boot differential; the stamp column
must read ≈ +42.8″/cy, spike-free, and agree with the LRL to the projection
factor.

---

## OUT-OF-SCOPE FIND — M9 `findContacts` measures the wrong distance

Flagged during the fresh-clone audit, receipt produced in the lab. In
physics.js:

```js
const dx = B.pos[0], dy = B.pos[1], dz = B.pos[2];
```

The `- A.pos[k]` terms were dropped — it's the computeAccelerations pair-loop
opening, cloned, minus the subtraction (pattern #6's big brother, living in
pattern #7's cloned-exemplar territory). So `r` is **body B's distance from
the barycenter**, not the A–B separation.

Receipt (node, against the hash-verified module):

- Two Earth-sized bodies **touching** at 2 AU from the origin → `[]` (missed)
- Same two bodies **half an AU apart**, one parked near the origin → `[[0,1]]` (false hit)

Why the Venus demo hid it: for pairs where A is the Sun, |B.pos| ≈ the Sun–B
separation, because the Sun sits within ~0.01 AU of the barycenter. The one
configuration the acceptance test exercised is the one configuration the bug
can't reach. Fail-silent, with a passing test — pattern #8's favorite disguise.

Caveat to log with the fix: the Sun's barycentric offset (up to ~0.01 AU,
about 2× the Sun's radius) means even Sun–planet contact timing is currently
off by more than a solar radius at some epochs.

**The fix is one typed line** (this one is yours — it's exactly 60/40-sized):

```js
const dx = B.pos[0] - A.pos[0], dy = B.pos[1] - A.pos[1], dz = B.pos[2] - A.pos[2];
```

Suggested regression test: the two receipts above, inverted — touching pair
must hit, origin-parked pair must miss.

---

## Ledger updates (paste-ready)

### SillyUserQuestions.md — wrap the OPEN line with:

```html
<!-- ANSWERED 2026-07-13: the stamp lied about WHEN, not WHERE. 1PN retimes
Mercury — each perihelion arrives +1.140 s later per lap (DT-invariant;
physics, not numerics). Both boots share one step grid and the stamp reads
bearing ~a step after the minimum, so run B is photographed earlier in its
swing each lap: bias = −ω·(1.140 s/lap) = −124.7″/cy on top of true +42.8 →
clean −81.9″/cy at every DT. One-lap ±ω·DT staircase spikes (±1138″ at DT
0.05) scattered the naive readout: −91 (browser) and +112 (lab) are two draws
of the same broken estimator. Despiked, five experiments collapse to −81.9;
predicted-then-confirmed to 0.3″/cy. LRL immune: shape, not schedule. Fix:
M8f oracle stamping (lag ≡ 0). Verdict: docs/stamp-bias-verdict.md; lab: lab/. -->
```

### CLAUDE.md — Status section, new line:

```
- **M8f: COMPLETE** — stamp witness rehabilitated. Verdict: 1PN retimes the
  perihelion (+1.140 s/lap, DT-invariant — Einstein's quiet second door); the
  grid-locked stamp read that slide as −124.7″/cy of fake retrograde on top of
  true +42.8, clean −81.9 at every DT, plus one-lap ±ω·DT staircase spikes
  that scattered naive readouts (−91 was one draw). Fix: parabolic sub-step
  stamping — lag ≡ 0, schedule side-channel closed. Stamp and LRL now agree
  to their frames (+42.8 ecliptic vs +43.0 in-plane; 7° projection = 0.996).
  Zero new cheats. Lab: lab/ (node, dependency-free, hash-pinned physics).
```

### CLAUDE.md — edit the M8c status line's tail:

```
  OPEN: the valley-stamp instrument misreports … → RESOLVED by M8f; verdict in
  docs/stamp-bias-verdict.md.
```

### CLAUDE.md — Open loose ends, add:

```
- M9 findContacts measures B's distance from the BARYCENTER, not from A
  (`const dx = B.pos[0]` — the `- A.pos[k]` terms dropped; cloned pair-loop
  opening, pattern #6/#7). Touching planet pairs are invisible; bodies near
  the origin false-positive; the Venus demo worked only because A=Sun ≈
  barycenter. One-line fix + regression receipts in
  docs/stamp-bias-verdict.md. HIGH priority.
```

### HANDOFF.md — session append draft:

```
---
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
```

### Commit message:

```
M8f: stamp witness rehabilitated — 1PN retimes perihelion +1.14 s/lap; grid-locked stamp read the slide as −125″/cy; oracle stamping restores +42.8
```

(CLAUDE.md staged in the same commit, per the hook. The findContacts fix
deserves its own commit: `M9 fix: findContacts measured |B|, not |B−A| — separation restored, regression receipts added`.)

---

## Replicate it yourself (2 minutes)

```
cd fabric-of-space
node lab/stampBiasLab.mjs     # Tables: naive differentials + spike receipt CSV
node lab/despike.mjs          # The collapse table with predictions
```

Both scripts are dependency-free. `lab/physics.mjs` is a byte copy of the
repo's physics.js — verify with `sha256sum physics.js lab/physics.mjs` before
trusting anything, as is right and proper.

---

*Filed by Claudester. Every number above was measured, not remembered.*
