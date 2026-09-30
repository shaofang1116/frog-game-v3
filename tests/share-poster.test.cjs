const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sharePoster = require('../src/share-poster.js');
const {
  MAX_CHALLENGE_SCORE,
  parseChallengeScore,
  createChallengeUrl,
  normalizePosterSnapshot,
  getPosterDescriptor,
  renderPoster
} = sharePoster;

const API_KEYS = [
  'MAX_CHALLENGE_SCORE',
  'createChallengeUrl',
  'getPosterDescriptor',
  'normalizePosterSnapshot',
  'parseChallengeScore',
  'renderPoster'
];

const snapshot = {
  score: 320,
  distance: 48,
  survivalTime: 75,
  highScore: 500,
  rank: '荷塘冲刺者',
  completed: true,
  stageName: '荷塘终点'
};

test('parses only one canonical challenge score within the allowed range', () => {
  assert.equal(MAX_CHALLENGE_SCORE, 999999);
  assert.equal(parseChallengeScore('?challenge=0'), 0);
  assert.equal(parseChallengeScore('https://example.test/frog/?challenge=320'), 320);
  assert.equal(parseChallengeScore('?challenge=999999'), 999999);

  for (const value of [
    '',
    '?challenge=',
    '?challenge=01',
    '?challenge=-1',
    '?challenge=1.5',
    '?challenge=1000000',
    '?challenge=320&challenge=321',
    '?challenge=320&utm_source=x',
    '?challenge=320&invite=x',
    '?challenge=320&qrcode=x',
    '?challenge=320&any_other_parameter=x',
    '?score=320'
  ]) {
    assert.equal(parseChallengeScore(value), null, value);
  }
});

test('creates a public challenge URL with the score as display-only context', () => {
  assert.equal(
    createChallengeUrl('https://shaofang1116.github.io', '/frog-game-v3/', 320),
    'https://shaofang1116.github.io/frog-game-v3/?challenge=320'
  );
  assert.equal(
    createChallengeUrl('https://example.test/', '/frog-game-v3', 0),
    'https://example.test/frog-game-v3?challenge=0'
  );
});

test('rejects non-HTTP(S) origins and invalid challenge scores', () => {
  for (const origin of [
    'ftp://example.test',
    '/frog-game-v3/',
    'not a URL',
    'https://'
  ]) {
    assert.throws(() => createChallengeUrl(origin, '/', 1), TypeError, origin);
  }

  for (const score of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, '1', 1000000]) {
    assert.throws(
      () => createChallengeUrl('https://example.test', '/', score),
      TypeError,
      String(score)
    );
  }
});

test('rejects challenge pathnames that could change the origin', () => {
  for (const pathname of [
    '//attacker.example/path',
    '///attacker.example/path',
    '/\\attacker.example/path',
    '/foo\\bar',
    '/foo\\\\bar',
    'http://attacker.example/path',
    'https://attacker.example/path',
    'frog-game-v3'
  ]) {
    assert.throws(
      () => createChallengeUrl('https://shaofang1116.github.io', pathname, 320),
      TypeError,
      pathname
    );
  }
});

test('normalizes a complete result snapshot without changing its calculated values', () => {
  assert.deepEqual(normalizePosterSnapshot(snapshot), snapshot);
  assert.notEqual(normalizePosterSnapshot(snapshot), snapshot);

  for (const invalidSnapshot of [
    null,
    { ...snapshot, score: -1 },
    { ...snapshot, distance: 1.5 },
    { ...snapshot, survivalTime: Number.MAX_SAFE_INTEGER + 1 },
    { ...snapshot, highScore: '500' },
    { ...snapshot, rank: '' },
    { ...snapshot, completed: 'true' },
    { ...snapshot, stageName: '  ' }
  ]) {
    assert.throws(() => normalizePosterSnapshot(invalidSnapshot), TypeError);
  }
});

test('rejects invalid snapshots from every snapshot entry point', () => {
  const invalidSnapshot = { ...snapshot, score: -1 };
  const address = 'https://shaofang1116.github.io/frog-game-v3/?challenge=320';
  const context = {
    canvas: {},
    fillRect() {},
    fillText() {}
  };

  assert.throws(() => normalizePosterSnapshot(invalidSnapshot), TypeError);
  assert.throws(() => getPosterDescriptor(invalidSnapshot, address), TypeError);
  assert.throws(() => renderPoster(context, invalidSnapshot, address), TypeError);
});

test('creates a fixed PNG poster descriptor using only the supplied snapshot and address', () => {
  const address = 'https://shaofang1116.github.io/frog-game-v3/?challenge=320';
  const descriptor = getPosterDescriptor(snapshot, address);

  assert.deepEqual(descriptor, {
    width: 1080,
    height: 1440,
    mimeType: 'image/png',
    gameName: '荷塘大冒险',
    environment: '荷塘终点',
    rank: '荷塘冲刺者',
    score: 320,
    distance: 48,
    survivalTime: 75,
    highScore: 500,
    distanceFact: '本次前进 48 米',
    publicAddress: address
  });
});

test('renders the descriptor to a supplied canvas context without exporting a blob', () => {
  const calls = [];
  const context = {
    canvas: { width: 1, height: 1 },
    fillRect(...args) { calls.push(['fillRect', ...args]); },
    fillText(...args) { calls.push(['fillText', ...args]); }
  };

  const descriptor = renderPoster(
    context,
    snapshot,
    'https://shaofang1116.github.io/frog-game-v3/?challenge=320'
  );

  assert.equal(context.canvas.width, 1080);
  assert.equal(context.canvas.height, 1440);
  assert.equal(descriptor.mimeType, 'image/png');
  assert.ok(calls.some(([name]) => name === 'fillRect'));
  const renderedText = calls
    .filter(([name]) => name === 'fillText')
    .map(([, text]) => text);
  for (const expectedText of [
    descriptor.gameName,
    snapshot.stageName,
    snapshot.rank,
    String(snapshot.score),
    String(snapshot.distance),
    String(snapshot.survivalTime),
    String(snapshot.highScore),
    descriptor.distanceFact,
    'shaofang1116.github.io/frog-game-v3'
  ]) {
    assert.ok(
      renderedText.some((text) => text.includes(expectedText)),
      `expected poster text to include ${expectedText}`
    );
  }

  const source = fs.readFileSync(path.join(__dirname, '../src/share-poster.js'), 'utf8');
  const forbiddenAccess = (name) => ({
    get() {
      throw new Error(`renderPoster must not access ${name}`);
    }
  });
  const sandbox = { globalThis: null };
  sandbox.globalThis = sandbox;
  for (const name of [
    'document',
    'localStorage',
    'fetch',
    'setTimeout',
    'setInterval',
    'navigator'
  ]) {
    Object.defineProperty(sandbox, name, forbiddenAccess(name));
  }
  vm.runInNewContext(source, sandbox);

  const isolatedContext = {
    canvas: {
      width: 1,
      height: 1,
      get toBlob() {
        throw new Error('renderPoster must not access canvas.toBlob');
      }
    },
    fillRect() {},
    fillText() {}
  };
  assert.doesNotThrow(() => {
    sandbox.FrogSharePoster.renderPoster(
      isolatedContext,
      snapshot,
      'https://shaofang1116.github.io/frog-game-v3/?challenge=320'
    );
  });
  assert.equal(isolatedContext.canvas.width, 1080);
  assert.equal(isolatedContext.canvas.height, 1440);
});

test('rejects contexts without a usable writable canvas before drawing', () => {
  const address = 'https://shaofang1116.github.io/frog-game-v3/?challenge=320';
  const throwingCanvas = { height: 1 };
  const callableCanvas = function callableCanvas() {};
  callableCanvas.width = 1;
  callableCanvas.height = 1;
  Object.defineProperty(throwingCanvas, 'width', {
    set() {
      throw new Error('canvas is unavailable');
    }
  });
  const drawingMethods = {
    fillRect() {},
    fillText() {}
  };

  for (const context of [
    null,
    drawingMethods,
    { ...drawingMethods, canvas: null },
    { ...drawingMethods, canvas: 1 },
    { ...drawingMethods, canvas: callableCanvas },
    { ...drawingMethods, canvas: Object.freeze({ width: 1, height: 1 }) },
    { ...drawingMethods, canvas: throwingCanvas },
    { canvas: { width: 1, height: 1 }, fillText() {} },
    { canvas: { width: 1, height: 1 }, fillRect() {} }
  ]) {
    assert.throws(() => renderPoster(context, snapshot, address), TypeError);
  }
});

test('exposes the exact CommonJS and window FrogSharePoster APIs', () => {
  assert.deepEqual(Object.keys(sharePoster).sort(), API_KEYS);

  const window = {};
  const source = fs.readFileSync(path.join(__dirname, '../src/share-poster.js'), 'utf8');
  vm.runInNewContext(source, { globalThis: window, window });

  assert.deepEqual(Object.keys(window.FrogSharePoster).sort(), API_KEYS);
});
