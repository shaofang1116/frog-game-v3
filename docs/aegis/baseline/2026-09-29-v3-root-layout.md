# Frog Game V3 Root Layout Baseline

Date: `2026-09-29`
Status: `accepted`

## Decision

Frog Game V3 is a standalone product. GitHub Pages serves the playable game
from the repository root.

## Canonical Layout

```text
index.html       playable V3 entry point
assets/          authorized local runtime backgrounds
src/             runtime policy and rendering modules
tests/           Node and browser verification
baseline/v2/     preserved V2 root-page evidence only
```

`/demo/` is retired. No redirect, compatibility copy, or second playable entry
is retained.

## Ownership

- `index.html` is the V3 runtime orchestrator.
- `src/` contains the canonical runtime modules.
- `assets/` contains local runtime media.
- `tests/` owns executable verification.
- `baseline/v2/index.html` is not served as product code and remains only for
  historical hash evidence.

## Verification

- GitHub Pages root URL loads the V3 game.
- `/demo/` is absent from the repository.
- `npm run test:unit` executes all root-layout tests.
