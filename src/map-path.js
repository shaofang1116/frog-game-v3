(function exposeMapPath(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.FrogMapPath = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createMapPathPlanner() {
  const START_COLUMN = 3;
  const TILE = Object.freeze({
    PAD: 'PAD',
    SINKING: 'SINKING',
    EMPTY: 'EMPTY'
  });
  const ITEM = Object.freeze({
    FLOWER: 'FLOWER',
    BOMB_ITEM: 'BOMB_ITEM'
  });
  const DEFAULT_OPTIONS = Object.freeze({
    columns: 7,
    finalRow: 36,
    stageThreeStartRow: 24
  });
  const OPTION_KEYS = Object.freeze(['columns', 'finalRow', 'stageThreeStartRow']);

  // These reproduce the original runtime generator's gameplay ratios:
  // one locally connected anchor, then a 42% fill on other playable cells.
  const FILL_CHANCE = 0.42;
  const ANCHOR_PAD_CHANCE = 0.6;
  const FILL_PAD_CHANCE = 0.65;
  const FLOWER_CHANCE = 0.18;
  const BOMB_ITEM_CHANCE = 0.24;
  const CROCODILE_CHANCE = 0.45;

  function createMapPlan(seed, options) {
    assertSeed(seed);
    const settings = resolveOptions(options);
    const { columns, finalRow, stageThreeStartRow } = settings;
    const random = mulberry32(hashSeed(seed));
    const rows = new Array(finalRow + 1).fill(null);
    let previousTiles = new Array(columns).fill(TILE.PAD);

    for (let row = 1; row <= finalRow; row++) {
      const descriptor = createRowDescriptor(
        row,
        previousTiles,
        columns,
        random
      );
      rows[row] = deepFreeze(descriptor);
      previousTiles = descriptor.tiles;
    }

    const planData = {
      seed,
      columns,
      finalRow,
      stageThreeStartRow,
      startColumn: START_COLUMN,
      rows
    };
    Object.defineProperty(planData, 'getRow', {
      value(row) {
        if (!Number.isSafeInteger(row) || row < 1 || row > finalRow) return null;
        return rows[row];
      },
      enumerable: false,
      configurable: false,
      writable: false
    });

    return deepFreeze(planData);
  }

  function createRowDescriptor(row, previousTiles, columns, random) {
    const tiles = new Array(columns).fill(TILE.EMPTY);
    const items = new Array(columns).fill(null);
    const previousPlayableColumns = [];

    previousTiles.forEach((tile, column) => {
      if (tile !== TILE.EMPTY) previousPlayableColumns.push(column);
    });

    const previousColumn =
      previousPlayableColumns.length > 0
        ? previousPlayableColumns[
            Math.floor(random() * previousPlayableColumns.length)
          ]
        : START_COLUMN;
    const anchorColumn = clamp(
      previousColumn + Math.floor(random() * 3) - 1,
      0,
      columns - 1
    );

    // The anchor keeps local topology connected, but deliberately remains
    // temporary 40% of the time. It is not a permanent route or a promise
    // that the player can finish without retaining a bomb.
    tiles[anchorColumn] =
      random() < ANCHOR_PAD_CHANCE ? TILE.PAD : TILE.SINKING;

    for (let column = 0; column < columns; column++) {
      if (column === anchorColumn || random() >= FILL_CHANCE) continue;
      tiles[column] = random() < FILL_PAD_CHANCE ? TILE.PAD : TILE.SINKING;
    }

    for (let column = 0; column < columns; column++) {
      if (tiles[column] === TILE.EMPTY) continue;
      const roll = random();
      if (roll < FLOWER_CHANCE) {
        items[column] = ITEM.FLOWER;
      } else if (roll < BOMB_ITEM_CHANCE) {
        items[column] = ITEM.BOMB_ITEM;
      }
    }

    const crocodiles = createCrocodiles(row, tiles, columns, random);

    return {
      row,
      // Kept for testability of legacy local connectivity. It is intentionally
      // not a route contract and may point to a SINKING tile.
      anchor: {
        previousColumn,
        column: anchorColumn,
        tile: tiles[anchorColumn]
      },
      tiles,
      items,
      crocodiles
    };
  }

  function createCrocodiles(row, tiles, columns, random) {
    if (row < 3 || random() >= CROCODILE_CHANCE) return [];

    const emptyColumns = [];
    tiles.forEach((tile, column) => {
      if (tile === TILE.EMPTY) emptyColumns.push(column);
    });
    if (emptyColumns.length < 2) return [];

    const startColumn =
      emptyColumns[Math.floor(random() * emptyColumns.length)];
    const direction = random() < 0.5 ? -1 : 1;
    const speed = 0.8 + random() * 0.6;

    // Crocodiles begin in water but retain the legacy full-row patrol. They
    // can therefore cross candidate pads and force timing, detours, or bombs.
    return [
      {
        gridY: row,
        startColumn,
        x: startColumn,
        vx: direction * speed,
        length: 1.4,
        warning: false,
        patrol: {
          minX: -0.5,
          maxX: columns - 0.5
        }
      }
    ];
  }

  function assertSeed(seed) {
    const isNumericSeed = typeof seed === 'number' && Number.isFinite(seed);
    if (!isNumericSeed && typeof seed !== 'string') {
      throw new TypeError('seed must be a finite number or a string');
    }
  }

  function resolveOptions(options) {
    if (options === undefined || options === null) {
      return { ...DEFAULT_OPTIONS };
    }
    if (typeof options !== 'object') {
      throw new TypeError('options must be an object when provided');
    }

    const settings = { ...DEFAULT_OPTIONS };
    for (const key of OPTION_KEYS) {
      if (options[key] !== undefined) settings[key] = options[key];
    }
    validateSettings(settings);
    return settings;
  }

  function validateSettings(settings) {
    const { columns, finalRow, stageThreeStartRow } = settings;
    if (!Number.isSafeInteger(columns) || columns <= START_COLUMN) {
      throw new RangeError(
        'options.columns must be a safe integer greater than the start column 3'
      );
    }
    if (!Number.isSafeInteger(finalRow) || finalRow < 1) {
      throw new RangeError('options.finalRow must be a safe integer no smaller than 1');
    }
    if (
      !Number.isSafeInteger(stageThreeStartRow) ||
      stageThreeStartRow < 1 ||
      stageThreeStartRow > finalRow
    ) {
      throw new RangeError(
        'options.stageThreeStartRow must be a safe integer between 1 and finalRow'
      );
    }
  }

  function hashSeed(seed) {
    const source = typeof seed === 'number' ? `n:${String(seed)}` : `s:${seed}`;
    return xmur3(source)();
  }

  function xmur3(input) {
    let h = 1779033703 ^ input.length;
    for (let i = 0; i < input.length; i++) {
      h = Math.imul(h ^ input.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return function nextHash() {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      h ^= h >>> 16;
      return h >>> 0;
    };
  }

  function mulberry32(initialState) {
    let state = initialState >>> 0;
    return function next() {
      state = (state + 0x6d2b79f5) >>> 0;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  }

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function deepFreeze(value) {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      Object.keys(value).forEach((key) => deepFreeze(value[key]));
      Object.freeze(value);
    }
    return value;
  }

  return Object.freeze({
    createMapPlan
  });
});
