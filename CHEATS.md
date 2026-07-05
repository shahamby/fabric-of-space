# Cheats

Ledger of every display-vs-reality divergence. Physics never cheats — simulation
state always stays true to the data in `data/bodies.json`. Only *rendering*
cheats, and every one is logged here per CLAUDE.md's non-negotiable conventions.

## #1 — Body-size exaggeration

**Where:** `bodyMesh.js`, `PLANET_SIZE_X` / `PLANET_CAP_AU` / `SUN_SIZE_X`.

At true scale, Earth is 0.0000426 AU wide — invisible at any camera distance
that also shows its orbit (1 AU). So body *positions* stay true-to-data, but
display *radius* is inflated by a fixed multiplier (1200x for planets, 60x for
the Sun), with a cap (0.25 AU) so gas giants don't out-size the Sun.

Press `T` in the running app to toggle between true scale and exaggerated
scale — the toggle swaps `mesh.scale` between `userData.trueRadiusAu` and
`userData.displayRadiusAu`, both precomputed in `makeBodyMesh()`.

## #2 — Sunlight decay disabled

**Where:** `main.js`, `sunlight.decay = 0`.

A physically correct `PointLight` decays with the inverse square of distance,
which would leave Neptune (30 AU out) essentially unlit relative to Mercury —
correct physics, unreadable visualization. Decay is disabled so every body is
lit at roughly the same brightness regardless of true distance from the Sun.
