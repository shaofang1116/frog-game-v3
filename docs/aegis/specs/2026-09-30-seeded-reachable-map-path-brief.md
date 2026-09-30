# Seeded Reachable Map Path

## Intent

Replace the locally random map-row generator with a seeded replay of its
high-pressure local-generation rules. Every run must preserve sparse pads,
temporary sinking pads, full-row crocodile patrols, and bombs as a finite
break-glass resource; deterministic seeds make a run reproducible without
turning it into a hazard-free route.

## Problem

The former unseeded generator made player reports difficult to reproduce. The
first seeded replacement over-corrected this by introducing a permanent,
crocodile-free primary route. That removed the choices that define the game:
waiting for a patrol, taking a temporary pad, detouring for a pickup, or
spending a bomb to clear a crocodile or create a landing pad.

## Scope

In scope:

- A pure path-planning module that accepts a numeric seed and generates rows 1 through 36.
- Seeded replay of the legacy local anchor, pad density, sinking-pad, pickup,
  and crocodile-spawn rules.
- Stage 3 uses the full seven-column gameplay grid; dynamic pads and pickups
  may pass over the reeds art at both edges.
- Crocodiles spawn from water but patrol across their whole row, including
  candidate pads.
- Unit and browser coverage for deterministic topology and runtime spawning.

Out of scope:

- Changing movement controls, scoring, rewards, stage-transition timing, or canvas art.
- Exposing a production seed picker, debug menu, or test cheat control.
- Guaranteeing that a no-bomb run is always solvable.

## Invariants

1. Rows 1 through 36 are generated deterministically from the run seed; the
   same seed reproduces tiles, pickups, and crocodile parameters exactly.
2. Each generated row receives a local anchor selected from the previous
   row's occupied cells, with a one-column horizontal offset; the anchor may
   be a `SINKING` pad.
3. Non-anchor cells use the legacy sparse fill probability, and the resulting
   map contains more water than permanent pads.
4. At rows 24 through 36, all seven columns participate in the same local
   generation rules as the earlier stages.
5. Crocodiles may spawn from row 3 onward only when at least two water cells
   exist. They begin on water and patrol the full row, so they may cross pads
   and create timing, detour, and bomb decisions.
6. The gameplay runtime consumes a new immutable plan per game start; no map
   state persists into the next run.
7. A player may encounter a locally unsolvable no-bomb state. This is an
   intended resource-management outcome, not a planner defect: bombs can
   clear crocodiles and create a pad in the cell directly ahead.

## Design

`src/map-path.js` is the canonical owner:

- `createMapPlan(seed, options)` normalizes the seed and returns an immutable plan.
- The plan exposes a `getRow(rowIndex)` descriptor containing the local anchor,
  tile layout, item layout, and deterministic crocodile descriptors.
- A small seeded pseudo-random generator is private to the module. Production creates a new entropy seed at game start; tests inject explicit seeds.

At game start, `index.html` stores the new plan. `generateRow(rowIndex)`
consumes its descriptor and instantiates the described crocodiles rather than
independently making random decisions. Rendering, input, collision detection,
camera, and stage transition ownership remain in `index.html`.

## Acceptance

- Plans for multiple explicit seeds reproduce exactly and vary across seeds.
- Unit tests confirm sparse occupancy, meaningful sinking-pad frequency, and
  full-row crocodile patrols that begin in water.
- Rows 24 through 36 retain full-width pad and pickup generation.
- Runtime generation creates only planner-described crocodiles, while bombs
  retain their existing crocodile-clear and empty-cell-pad behavior.

## Compatibility

- Existing `FrogJourney` stage milestones remain row 12, row 24, and row 36.
- Legacy density, item, anchor, and crocodile parameters live only in the
  planner; they do not alter the public controls.
- The inline `Math.random` row generator is retired; its gameplay behavior is
  retained through the planner rather than through a permanent safe route.
