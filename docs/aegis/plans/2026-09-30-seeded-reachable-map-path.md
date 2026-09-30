# Seeded Reachable Map Path Plan

## Goal

Guarantee a traversable, hazard-free primary route from row 0 through row 36 while preserving varied seeded layouts and existing three-stage transitions.

## Architecture

`src/map-path.js` owns deterministic seed normalization, route planning, and decoration descriptors. `index.html` owns run state, rendering, and entity lifecycles, and consumes one immutable plan per game start.

## Tech Stack

Browser JavaScript, Node built-in test runner, HTML Canvas, Playwright browser acceptance.

## Baseline / Authority Refs

- `docs/aegis/specs/2026-09-30-seeded-reachable-map-path-brief.md`
- `docs/aegis/baseline/2026-09-30-seeded-path-baseline.md`
- `src/chapters.js`
- `src/journey.js`

## Compatibility Boundary

- Preserve row milestones 12, 24, and 36, current input behavior, score, time, bombs, and transition timing.
- Do not add a production seed selector or debug control.
- Keep Stage 3 columns 0 and 6 free of route tiles.

## File Map

- Create `src/map-path.js`: pure seeded planner and immutable plan API.
- Create `tests/map-path.test.cjs`: route, seed, hazard, and Stage 3 boundary tests.
- Modify `index.html`: load planner, allocate a plan per run, render descriptors, and retire row-local reachability randomness.
- Modify `tests/structure.test.cjs`: assert planner loading and planned-row consumption.
- Modify `tests/browser/map-path.spec.mjs`: follow the planned route through both transitions with real keyboard input.
- Modify `docs/aegis/INDEX.md`: record this plan.

## Architecture Integrity Lens

- Invariant: a full run has one non-sinking, crocodile-free route.
- Canonical owner: `src/map-path.js`, not the inline renderer.
- Responsibility overlap: the old `safeCol` generator independently decides reachability and must be removed.
- Higher-level simplification: one precomputed plan supplies both route and decorative randomness.
- Retirement: delete the old previous-row anchor and per-row `safeCol` selection after the runtime uses plan descriptors.
- Verdict: proceed with a new pure module.

## Plan-Time Complexity Check

- Target files: `index.html` is 1,975 lines; the existing `generateRow` block mixes reachability, decoration, and hazards.
- Owner fit: a pure planner is a better boundary than expanding the inline controller.
- Recommendation: add `src/map-path.js`; keep only descriptor application in `index.html`.

## Tasks

### 1. Define the path planner contract

Files: create `src/map-path.js`, create `tests/map-path.test.cjs`.

Why: establish one testable owner for the route guarantee.

Verification: `node --test tests/map-path.test.cjs`.

1. Write tests asserting rows 1 through 36 exist, begin from column 3, and adjacent route columns differ by at most one.
2. Run `node --test tests/map-path.test.cjs` and confirm the tests fail because the module does not exist.
3. Implement `createMapPlan(seed, { columns: 7, finalRow: 36, stageThreeStartRow: 24 })`, returning frozen descriptors with one permanent route `PAD` per row.
4. Re-run `node --test tests/map-path.test.cjs` and confirm the continuity tests pass.
5. Commit only `src/map-path.js` and `tests/map-path.test.cjs`.

### 2. Add seeded variation and hazard exclusion

Files: modify `src/map-path.js`, modify `tests/map-path.test.cjs`.

Why: preserve varied maps without invalidating the route guarantee.

Verification: `node --test tests/map-path.test.cjs`.

1. Write tests that identical seeds produce deeply equal plans; several distinct seeds produce at least two distinct serialized plans; route cells are `PAD`; and route rows do not permit crocodiles.
2. Run the focused test and confirm the unimplemented seed and hazard cases fail.
3. Add an internal deterministic PRNG and use it only for route steering, decorations, items, and crocodile permission.
4. Re-run focused tests and confirm reproducibility, variation, and exclusion pass.
5. Commit the planner and focused tests.

### 3. Enforce Stage 3 route bounds

Files: modify `src/map-path.js`, modify `tests/map-path.test.cjs`.

Why: protect the sunset-reeds decorative edge columns.

Verification: `node --test tests/map-path.test.cjs`.

1. Write tests asserting route columns for rows 24 through 36 are in the inclusive range 1 through 5 for multiple seeds.
2. Run the focused test and confirm it fails before the Stage 3 clamp exists.
3. Clamp the route planner's legal columns at the Stage 3 boundary while retaining a maximum one-column transition.
4. Re-run focused tests and confirm they pass.
5. Commit the Stage 3 bound changes.

### 4. Consume the plan in gameplay generation

Files: modify `index.html`, modify `tests/structure.test.cjs`.

Why: make the playable runtime use the canonical route plan instead of local random connectivity.

Verification: `node --test tests/map-path.test.cjs tests/structure.test.cjs`.

1. Write structure assertions that `index.html` loads `src/map-path.js`, creates a plan in `start()`, and reads the descriptor in `generateRow()`.
2. Run the focused tests and confirm they fail.
3. Add `mapPlan` run state; create it with a new entropy seed in `start()`; replace anchor/safe-column selection and route-row crocodile spawning with descriptor application; preserve non-route decorations and existing entity formats.
4. Remove the retired `validPrevCols`, `anchorCol`, and `safeCol` algorithm.
5. Re-run the focused tests and confirm they pass; commit runtime integration and structure coverage.

### 5. Prove the three-stage run in the TRAE browser

Files: no project test runner dependency.

Why: validate the actual canvas, keyboard input, transitions, and backgrounds
without making Chromium a repository dependency.

Verification: TRAE built-in browser real-device-style acceptance.

1. Start a local server with `npm run serve`.
2. Use real keyboard and touch inputs through the TRAE browser.
3. Assert stage transitions, Stage 3 local image rendering, and input continuing after a transition.
4. Add no production debug UI or browser-specific test hooks.
5. Record screenshots and observations in the implementation handoff.

### 6. Run the full acceptance suite

Files: no production changes unless a verified failure identifies an integration defect.

Why: protect existing rewards, challenge-link, input, and map-theme contracts.

Verification:

1. Run `npm run test:unit`.
2. Run `npm run audit:map-themes`.
3. Run `git diff --check`.
4. Record TRAE-browser acceptance evidence in the implementation handoff.

## Risks

- A route cell can be safe at generation but become unsafe if crocodiles are merely spawned nearby. The plan therefore prohibits crocodiles on every route row.
- A Stage 3 clamp can create a discontinuity at row 24. The planner must account for the clamp as it creates row 24, preserving a delta of at most one.
- TRAE browser availability may block live acceptance. Unit tests remain
  necessary but do not replace the manual browser gate.

## Repair Track

- Root cause: row-local randomness treats local connectivity as a full-run reachability proof.
- Stable repair: a seeded primary-path plan is the single reachability authority.

## Retirement Track

- Retired owner: `generateRow`'s `validPrevCols` / `anchorCol` / `safeCol` branch.
- Keep reason: none after the planner is consumed.
- Deletion trigger: planner integration test verifies descriptors drive all generated rows.
