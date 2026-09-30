# Seeded Path Baseline

## Product Constraints

- Every generated journey must contain a player-traversable route from row 0 through row 36.
- Map variety remains a gameplay feature; deterministic path planning must not make consecutive runs identical.
- Stage 3 reserves columns 0 and 6 for the sunset-reeds scene and does not place playable route tiles there.
- Existing stage transition behavior preserves score, timer, and bombs.

## Runtime Boundary

- `src/map-path.js` will own seed normalization, pseudo-random generation, and route planning.
- `index.html` remains the consumer: it requests a plan at run start, renders generated rows, and owns entities, input, and stage transitions.
- The guaranteed route consists only of permanent `PAD` tiles. Sinking tiles, pickups, and crocodiles may decorate non-route positions only.

## Verification Boundary

- Unit tests prove route continuity, Stage 3 column safety, obstacle exclusion, reproducibility for a seed, and variation across seeds.
- Browser acceptance follows the planned route using real input after browser automation is available.
