const test = require('node:test');
const assert = require('node:assert/strict');

const { createMapPlan } = require('../src/map-path.js');

const COLUMNS = 7;
const FINAL_ROW = 36;
const STAGE_THREE_START_ROW = 24;
const SEEDS = [1, 2, 3, 4, 5, 17, 42, 'storm-lake', 'sunset-reeds'];

function createPlan(seed = 1) {
  return createMapPlan(seed, {
    columns: COLUMNS,
    finalRow: FINAL_ROW,
    stageThreeStartRow: STAGE_THREE_START_ROW
  });
}

test('creates immutable local-generation descriptors for every playable row', () => {
  const plan = createPlan();

  assert.equal(plan.columns, COLUMNS);
  assert.equal(plan.finalRow, FINAL_ROW);
  assert.equal(plan.stageThreeStartRow, STAGE_THREE_START_ROW);
  assert.equal(plan.startColumn, 3);
  assert.equal(plan.getRow(0), null);
  assert.equal(plan.getRow(FINAL_ROW + 1), null);

  for (let row = 1; row <= FINAL_ROW; row++) {
    const descriptor = plan.getRow(row);
    assert.equal(descriptor.row, row);
    assert.equal(descriptor.tiles.length, COLUMNS);
    assert.equal(descriptor.items.length, COLUMNS);
    assert.ok(Array.isArray(descriptor.crocodiles));
    assert.equal(Object.isFrozen(descriptor), true);
    assert.equal(Object.isFrozen(descriptor.tiles), true);
    assert.equal(Object.isFrozen(descriptor.items), true);
    assert.equal(Object.isFrozen(descriptor.crocodiles), true);
  }
});

test('replays the same local topology, pickups, and crocodiles for an identical seed', () => {
  const first = createPlan(42);
  const second = createPlan(42);

  assert.notEqual(first, second);
  assert.notEqual(first.getRow(1), second.getRow(1));
  assert.deepEqual(first, second);
});

test('varies the map content across distinct seeds', () => {
  const signatures = SEEDS.map((seed) => JSON.stringify(createPlan(seed).rows));

  assert.ok(
    new Set(signatures).size >= 2,
    'expected different seeds to vary topology, pickups, or crocodile spawns'
  );
});

test('matches the legacy sparse topology rather than exposing a permanent safe route', () => {
  const counts = {
    PAD: 0,
    SINKING: 0,
    EMPTY: 0
  };

  for (let seed = 1; seed <= 200; seed++) {
    const plan = createPlan(seed);
    for (let row = 1; row <= FINAL_ROW; row++) {
      for (const tile of plan.getRow(row).tiles) {
        counts[tile]++;
      }
    }
  }

  const total = counts.PAD + counts.SINKING + counts.EMPTY;
  const occupiedRatio = (counts.PAD + counts.SINKING) / total;
  const sinkingRatio = counts.SINKING / total;

  // Legacy generation expected one local anchor plus a 42% roll across the
  // remaining six cells: roughly 50% occupied, with about 18% sinking.
  assert.ok(
    occupiedRatio >= 0.42 && occupiedRatio <= 0.56,
    `expected sparse legacy-like occupancy, received ${occupiedRatio}`
  );
  assert.ok(
    sinkingRatio >= 0.13 && sinkingRatio <= 0.24,
    `expected meaningful sinking-pad pressure, received ${sinkingRatio}`
  );
  assert.ok(
    counts.EMPTY > counts.PAD,
    'open water must remain more common than permanent pads'
  );
});

test('keeps Stage 3 edge columns in the normal generation pool', () => {
  let occupiedEdges = 0;
  let edgeItems = 0;

  for (let seed = 1; seed <= 200; seed++) {
    const plan = createPlan(seed);
    for (let row = STAGE_THREE_START_ROW; row <= FINAL_ROW; row++) {
      const descriptor = plan.getRow(row);
      for (const column of [0, COLUMNS - 1]) {
        if (descriptor.tiles[column] !== 'EMPTY') occupiedEdges++;
        if (descriptor.items[column] !== null) edgeItems++;
      }
    }
  }

  assert.ok(occupiedEdges > 0, 'expected Stage 3 edge pads to be generated');
  assert.ok(edgeItems > 0, 'expected Stage 3 edge pickups to be generated');
});

test('allows locally connected pads to be temporary, preserving bomb decisions', () => {
  let foundSinkingAnchor = false;

  for (let seed = 1; seed <= 200 && !foundSinkingAnchor; seed++) {
    const plan = createPlan(seed);
    for (let row = 1; row <= FINAL_ROW; row++) {
      const descriptor = plan.getRow(row);
      if (descriptor.anchor.tile === 'SINKING') {
        foundSinkingAnchor = true;
        break;
      }
    }
  }

  assert.equal(
    foundSinkingAnchor,
    true,
    'local connectivity must not silently turn into a permanent safe route'
  );
});

test('emits legacy-style crocodiles that spawn from water and patrol the full row', () => {
  let crocodileCount = 0;

  for (let seed = 1; seed <= 200; seed++) {
    const plan = createPlan(seed);
    for (let row = 1; row <= FINAL_ROW; row++) {
      const descriptor = plan.getRow(row);

      for (const crocodile of descriptor.crocodiles) {
        crocodileCount++;
        assert.ok(row >= 3, `crocodile spawned too early on row ${row}`);
        assert.equal(crocodile.gridY, row);
        assert.equal(descriptor.tiles[crocodile.startColumn], 'EMPTY');
        assert.ok(Math.abs(crocodile.vx) >= 0.8 && Math.abs(crocodile.vx) <= 1.4);
        assert.equal(crocodile.length, 1.4);
        assert.equal(crocodile.patrol.minX, -0.5);
        assert.equal(crocodile.patrol.maxX, COLUMNS - 0.5);
      }
    }
  }

  assert.ok(crocodileCount > 0, 'expected crocodiles across deterministic runs');
});

test('items remain valid only on occupied tiles', () => {
  for (const seed of SEEDS) {
    const plan = createPlan(seed);
    for (let row = 1; row <= FINAL_ROW; row++) {
      const descriptor = plan.getRow(row);
      descriptor.items.forEach((item, column) => {
        assert.ok(item === null || item === 'FLOWER' || item === 'BOMB_ITEM');
        if (item !== null) {
          assert.notEqual(descriptor.tiles[column], 'EMPTY');
        }
      });
    }
  }
});

test('validates seeds and options', () => {
  assert.throws(() => createMapPlan(undefined), TypeError);
  assert.throws(() => createMapPlan(null), TypeError);
  assert.throws(() => createMapPlan(NaN), TypeError);
  assert.throws(() => createMapPlan({}), TypeError);
  assert.throws(() => createMapPlan(1, { columns: 3 }), /columns/);
  assert.throws(() => createMapPlan(1, { finalRow: 0 }), /finalRow/);
  assert.throws(() => createMapPlan(1, { stageThreeStartRow: 37 }), /stageThreeStartRow/);
});
