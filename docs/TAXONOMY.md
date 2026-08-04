# Bug taxonomy — fabric-of-space

The canonical numbered list. Check these FIRST when auditing.

Items 1-7 are preserved verbatim from HANDOFF.md line 209, which was the
canonical block from M9 until 2026-08-01. Items 8+ were EARNED in session
prose and numbered ad hoc against a list that was never updated, producing
three overlapping series with collisions at 2, 7, 8, 9, 10, 11 and 12.
This file is the reconciliation. HANDOFF.md prose is LEFT AS WRITTEN — it is
a record of what happened, not a reference. The CITATION MAP at the bottom
translates every historical mention.

Guard: lab/ledgerLab.mjs (B5). Nothing may cite a number this file lacks.

---

## 1. Dropped backticks
Template literals typed with plain quotes. `${}` never interpolates, so the
string is silently wrong. Fetched Earth 9x; the progress bar never filled.
JS fails silent. Earned M5.

## 2. Wrong room
Correct code, wrong brace level. `sessionProvenance` declared inside
`fetchAllBodies`; records declared inside the loop. Tell: a ReferenceError
naming something you KNOW you declared. Ask "which braces was I inside?"
Earned M5c.

## 3. Instruction text pasted as records
Errand sentences landed verbatim as a CLAUDE.md status line and a CHEATS.md
#5 title. Ledger updates must be handed over as exact paste-ready text; when
auditing, grep the docs for Claude's own phrasing. Earned M7c.

## 4. Skipped typed edits between file drops
A replacement file PLUS a typed edit: the typed edit gets missed (the panel
r_s line). Deliver typed edits separately, or as exact single-line
find/replace. Verify independently after any mixed delivery. Earned M7c;
struck four consecutive times in M8.

## 5. Field names singular/plural
`data.results` vs `data.result`. Log the whole envelope, inspect the
compartments, stop guessing. Earned M5.

## 6. Gate below the floor
A PASS/FAIL threshold set beneath the instrument's own noise (matrix
truncation ~1e-8; leapfrog wobble ~(omega*dt)^2). Struck twice in one file.
Measure the floor first — dt-halving, component rounding — then set the gate
above it. Earned M8; restated at M12e.

## 7. The no-op negative
A negative test that mutates something the math cancels. A consistent
log-base swap vanishes in the mapping's ratio: it proves nothing while
looking rigorous. Verify the sabotage actually changes an observable BEFORE
trusting the FAIL it was supposed to cause. Upgraded sin: reading a log axis
as linear — 25.9% wrong, caught loudly. Earned M12g (curveLab V4).

## 8. The gauge without a needle
A quantity computed correctly and never displayed, or displayed from a
reference that has since died. Three appearances: the LRL witness computed
but never mounted (M8e); the provenance record that reached neither the P
panel nor the D download (M5c); and an instrument holding a startup
reference after a merge ate its subject, reading a frozen corpse forever
(fixed R1/F2). Define -> mount -> verify the needle MOVES.

## 9. The skeleton ate the engine
A landing-spot diagram with `// ...unchanged...` placeholders typed IN PLACE
of `leapfrogStep`'s real loops. Every planet would have frozen on launch.
Rule earned: no elided skeletons, ever — complete blocks or exact single
lines only. Earned M10b.

## 10. The clone split the donor
Cloning `spawnRogue` into `spawnDust` migrated the donor's entire bottom
half into the clone. The N key died silently. Rule earned: after any clone,
audit BOTH the copy and the original. Earned M10b.

## 11. The unterminated append
An append is an edit to the line above it until a trailing newline is
proven. A `.gitignore` append produced `distlab/out/`. Read the file back.
Earned 2026-07-16.

## 12. The invisible answerer
Three.js raycasts meshes with `visible: false`. The hidden Sun mesh inside
Sgr A* was answering clicks in galaxy mode. Invisible is not absent.
Earned M12c.

## 13. The bracket bluff
A search returns its own bracket edge with a straight face. `bhLab`'s
bisection shipped with `hi = 0.05`, sized only for the real black hole; at
100x mass the true root (101.9 pc) escapes the bracket and the finder
reported the edge — 103.8% error, fail-silent. Second appearance at
haloLab HL3, where a window excluding the floor would have claimed 1.50x
house, a 51% error stated as a measurement. A finder must report EDGE, not
a number, when it hits its own boundary. Earned M12f (bhLab B5).

## 14. The edge anchor
A paste boundary placed at the opening line of the following block. Nothing
in the replacement proves the following lines survived, and 27 of them did
not — `renderProvenance` lost `const blocks`, the Horizons record and the
Gaia record, and the P panel threw ReferenceError on the public build for
four commits. Rule earned: PASTE ANCHORS SANDWICH, NEVER EDGE. Guard:
eslint no-undef in the Pages workflow. Earned A1.

## 15. The unlabelled readout
A correct number printed against an undeclared knob. The lap read 33.2 Myr
where every record says 217.1; vCirc read 1519.6 where G3c says 232.1.
Nothing was wrong — the label was incomplete, which is worse, because the
number is one the reader has memorised. A label can be ACCURATE and still
deceive by naming the knob that did NOT move ("halo 1.00x" while MBH sat at
1e10x). Closed at 8 sites via `dialledInto()` / `dialledShort()`.
Earned W2a.1.

## 16. The tunnelling miss — PROPOSED, NO RECEIPT YET
A point-in-region test where the region is smaller than one integration
step. The body is outside before the step and outside after, so the test
never fires and the crossing is never seen. Already live in M9's known
limits (DT 0.05 can tunnel a planet-planet contact). Will be earned by
CAPTURE, whose negative test must WATCH a point test tunnel through the
horizon and survive. Until that receipt exists this entry is a prediction,
not a pattern.

## 17. The fixture that does not match the field
A test double built with a property the real data does not carry. The lab
passes, the code passes, and the two agree about a shape that never occurs.
stepLab ST6 seeded its fake cluster as `{ name: 'DIVER' }` and the substep
readout read `s.name`, so both agreed — while all 126 real Harris clusters
carry `.id` and printed `(unnamed)` on the public HUD. Caught only in the
browser, by reading a label where a catalogue name belonged. Rule: a fixture
must be built from the SAME FIELD the production path reads, and when a lab
stands in for catalogue data, one real row is checked against the fixture's
shape. Earned W2c.2, 2026-08-01.

## 18. The stale confession — PROPOSED, NO RECEIPT YET
A ledger entry that quotes numbers a later milestone replaced. CHEATS #29
was written against W2c's 20 steps/orbit and 200-substep cap; W2c.1 raised
those to 40 and 700 and the confession was left alone, so the public ledger
described a build that no longer existed — and `physics.js`'s own comment
agreed with the ledger rather than with the constant three lines below it.
Distinct from #8: the needle exists and moves, it is the LABEL that is
stale. ledgerLab guards that entries exist and are numbered; it cannot yet
guard that they are TRUE. Will be earned when a lab reads a declared
constant out of source and asserts the ledger quotes it. Until that receipt
exists this entry is a prediction, not a pattern. Found by audit 2026-08-03.

## 19. The clone is not the workbench — PROPOSED, NO RECEIPT YET
An audit run against a fresh clone reports the state of what is COMMITTED and
is silent about what is staged, modified, or untracked on the machine doing
the work. On 2026-08-03 the session audit reported the W31 recap "not
written." It had been written two days earlier and was sitting staged in the
index. The same blindness has a second edge: `git add <paths>` adds to the
index without un-staging what is already in it, so b41805f named seven paths
and committed eight, carrying a 149-line recap its message never mentions.
Distinct from #3 and #4, which are about what a paste carries; this is about
what a COMMIT carries. Will be earned when the session ritual runs `git status`
on the working copy beside the clone, and the staged list is counted against
the named list before a milestone commit — or `git commit --only` removes the
possibility. Until then, a prediction. Found 2026-08-03.

## 20. The bug described by its first symptom
A defect recorded by the first thing anyone noticed about it, then carried
forward in that shape until someone measures it. The galaxy accumulator was
logged for three sessions as "runs 199 steps when 200 are requested." That
description is wrong in one direction and understated in another. In
continuous playback NO step is lost — the unpaid step is deferred to the next
frame, and 60 frames asking 150 each run all 9,000 (carryLab CA4). The real
injury was never the count: it was `myr` drifting from `n*DT` without bound,
2.7e-10 Myr by 9,000 steps and never corrected, plus every lab harness
requesting a fixed count in one call getting k-1 for 42 of the first 300 k.
The recorded symptom was the one case that happened to be visible in a
receipt. Rule: a bug logged from a single observation is a SIGHTING, not a
diagnosis, and the census that separates the two is written before the fix.
Earned W2c.3, 2026-08-03.

---

## RETIRED

**The improvised key name.** An unnamed binding gets invented on the spot and
drifts from the docs. Logged as a candidate 2026-07-16; never receipted.
Made structurally impossible by A2 — KEYS is the single source of truth and
lab/legendLab.mjs fails the deploy on drift in either direction. Retired
rather than numbered: a pattern the build cannot express is not a pattern.

---

## CITATION MAP — historical mentions to canonical numbers

| where it says | it means | now |
|---|---|---|
| HANDOFF:711 "bug pattern #2" (provenance unreached) | gauge without a needle | **8** |
| HANDOFF:349 "#8 struck once" (LRL undisplayed) | gauge without a needle | **8** |
| HANDOFF:422 "pattern #8 in new clothes" (missing qm) | gauge without a needle | **8** |
| HANDOFF:414 "pattern #9" (skeleton) | skeleton ate the engine | **9** |
| HANDOFF:419 "pattern #10" (clone) | clone split the donor | **10** |
| HANDOFF:514 "Pattern #11" (append/newline) | unterminated append | **11** |
| HANDOFF:662, 752 "pattern #11" (raycast) | invisible answerer | **12** |
| HANDOFF:842 "bug pattern #12" (noise floor) | gate below the floor | **6** |
| HANDOFF:548 "Pattern #12" (unnamed key) | — | RETIRED |
| HANDOFF:894 "TAXONOMY ITEM 7" (bracket bluff) | bracket bluff | **13** |
| HANDOFF:930 "TAXONOMY ITEM 8" (no-op negative) | no-op negative | **7** |
| HANDOFF:1380 "Taxonomy #11" (unlabelled readout) | unlabelled readout | **15** |
| CLAUDE.md:249 "taxonomy item 7" | bracket bluff | **13** |
| CLAUDE.md:350 "taxonomy #7's second appearance" | bracket bluff | **13** |
| CLAUDE.md:467 "taxonomy #11" | unlabelled readout | **15** |

