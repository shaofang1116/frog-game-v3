const test = require('node:test');
const assert = require('node:assert/strict');
const rewards = require('../src/rewards.js');
const chapters = require('../src/chapters.js');

test('failure converts remaining resources without granting endpoint rewards', () => {
  const result = rewards.settleRun({ score: 100, timeLeft: 12, bombs: 5, completed: false });
  assert.equal(result.applied, true);
  assert.equal(result.nextScore, 470);
  assert.equal(result.nextTimeLeft, 0);
  assert.equal(result.nextBombs, 0);
  assert.equal(result.breakdown.lotusScore, 0);
  assert.equal(result.breakdown.time.virtual, 0);
  assert.equal(result.breakdown.bombs.virtual, 0);
});

test('completion reuses the existing final checkpoint conversion, including a sixth virtual bomb', () => {
  const input = { score: 100, timeLeft: 12, bombs: 5, completed: true };
  const snapshot = structuredClone(input);
  const result = rewards.settleRun(input, chapters.getStage(3));
  assert.equal(result.nextScore, 750);
  assert.equal(result.breakdown.time.units, 20);
  assert.equal(result.breakdown.bombs.units, 6);
  assert.equal(result.breakdown.lotusContribution, 280);
  assert.deepEqual(input, snapshot);
});

test('zero resources settle on both failure and completion, with only completion earning 280', () => {
  assert.equal(rewards.settleRun({ score: 0, timeLeft: 0, bombs: 0, completed: false }).nextScore, 0);
  assert.equal(rewards.settleRun({ score: 0, timeLeft: 0, bombs: 0, completed: true },
    chapters.getStage(3)).nextScore, 280);
});

test('invalid outcomes and nonfinal completion requests are not applied', () => {
  for (const input of [null, { score: -1, timeLeft: 1, bombs: 1, completed: false },
    { score: 0, timeLeft: 1.5, bombs: 1, completed: false },
    { score: 0, timeLeft: 0, bombs: NaN, completed: false },
    { score: 0, timeLeft: 0, bombs: 0, completed: 'yes' }]) {
    assert.equal(rewards.settleRun(input, chapters.getStage(3)).applied, false);
  }
  assert.equal(rewards.settleRun({ score: 0, timeLeft: 0, bombs: 0, completed: true },
    chapters.getStage(1)).applied, false);
});
