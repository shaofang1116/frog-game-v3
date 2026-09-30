const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const challengeLink = require('../src/challenge-link.js');
const {
  MAX_CHALLENGE_SCORE,
  parseChallengeScore,
  createChallengeUrl
} = challengeLink;

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

test('rejects invalid origins, paths, and scores', () => {
  for (const origin of ['ftp://example.test', '/frog-game-v3/', 'not a URL']) {
    assert.throws(() => createChallengeUrl(origin, '/', 1), TypeError, origin);
  }
  for (const pathname of ['//attacker.example/path', '/foo\\bar', 'frog-game-v3']) {
    assert.throws(
      () => createChallengeUrl('https://shaofang1116.github.io', pathname, 320),
      TypeError,
      pathname
    );
  }
  for (const score of [-1, 1.5, Number.NaN, '1', 1000000]) {
    assert.throws(
      () => createChallengeUrl('https://example.test', '/', score),
      TypeError,
      String(score)
    );
  }
});

test('exposes the challenge-link API for CommonJS and browsers', () => {
  assert.deepEqual(Object.keys(challengeLink).sort(), [
    'MAX_CHALLENGE_SCORE',
    'createChallengeUrl',
    'parseChallengeScore'
  ]);

  const source = fs.readFileSync(path.join(__dirname, '../src/challenge-link.js'), 'utf8');
  const window = {};
  vm.runInNewContext(source, { globalThis: window, window });

  assert.deepEqual(Object.keys(window.FrogChallengeLink).sort(), [
    'MAX_CHALLENGE_SCORE',
    'createChallengeUrl',
    'parseChallengeScore'
  ]);
});
