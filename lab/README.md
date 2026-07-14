# lab/ — the stamp-bias forensics lab (M8f evidence)

Dependency-free node. Runs the M8c two-boot protocol against a byte copy of
the repo's physics.js and convicts the stamp's timing side-channel.

- stampBiasLab.mjs — evidence collection: replicates both witnesses verbatim,
  adds the oracle (sub-step interpolated stamping) and the timing ledger;
  prints naive differentials for 5 experiments; writes the E1 CSV.
- despike.mjs — the conviction pass: MAD-trims the ±ω·DT staircase spikes and
  shows every experiment collapse to −81.9″/cy = true(+42.8) + bias(−124.7).
- physics.mjs — byte copy of ../physics.js, hash-pinned:
  4a72abd9a6c52866e02d864ca5d13e2e46571d8b5bba66230b4ccd724f08c302
  Regenerate with `cp ../physics.js physics.mjs` and re-verify with sha256sum.
- out/E1_ninebody_DT005.csv — per-lap differential columns for the M8c
  condition (elapsed, stamp, LRL, oracle, timing). The ±1138″ staircase is
  visible to the naked eye.

Run from repo root:
  node lab/stampBiasLab.mjs
  node lab/despike.mjs

