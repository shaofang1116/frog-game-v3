# Baseline Governance

## Baseline Roles

- Product baseline: the game must retain varied maps while every journey has a traversable route.
- Runtime baseline: `index.html` owns gameplay state and rendering; pure policies belong in `src/`.

## Change Classification

- A requirement or architecture error is a design defect and must be corrected at its source.
- An implementation that violates a correct baseline is implementation drift and must be returned to the baseline.

## Check Protocol

Before a non-trivial change, read the relevant product specification and runtime boundary, identify the canonical owner, preserve compatibility invariants, and verify with focused and full test suites.
