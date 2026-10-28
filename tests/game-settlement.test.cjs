const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function fixture(high = '0') {
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  const source = html.slice(html.indexOf('  const Game = {'),
    html.indexOf("  window.addEventListener('DOMContentLoaded'"));
  const nodes = new Map(), writes = [];
  let interval;
  const context = {
    COLS: 7, VISIBLE_ROWS: 9, TILE_PAD: 'PAD', TILE_EMPTY: 'EMPTY', TILE_SINKING: 'SINKING',
    Date, performance: { now: () => 0 }, URLSearchParams,
    location: { origin: 'https://shaofang1116.github.io', pathname: '/frog-game-v3/', search: '' },
    localStorage: { getItem: () => high, setItem(key, value) { writes.push({ key, value }); } },
    document: { getElementById(id) {
      if (!nodes.has(id)) nodes.set(id, { classList: { add() {}, remove() {}, toggle() {} } });
      return nodes.get(id);
    } },
    matchMedia: () => ({ matches: false }),
    sfx: Object.fromEntries(['init', 'playScore', 'playGameOver', 'playBomb', 'playJump',
      'playSplash'].map(name => [name, () => {}])),
    setInterval(fn) { interval = fn; return 1; }, clearInterval() {}, setTimeout() {}
  };
  for (const name of ['Journey', 'Chapters', 'Input', 'MapPath', 'ChallengeLink', 'StageTransition', 'Rewards']) {
    const file = name.replace(/[A-Z]/g, (c, i) => (i ? '-' : '') + c.toLowerCase());
    context['Frog' + name] = require('../src/' + file + '.js');
  }
  context.window = context;
  vm.createContext(context);
  vm.runInContext(source + '\nglobalThis.game = Game;', context);
  const game = context.game;
  Object.assign(game, { width: 390, height: 650, tileSize: 55, gridOffsetX: 2 });
  game.createRunSeed = () => 'settlement-test';
  game.start();
  return { game, nodes, writes, timeout: () => interval() };
}

function verifyResult(f, expected, completed) {
  assert.equal(f.game.completedRun.score, expected);
  assert.equal(f.game.completedRun.completed, completed);
  assert.equal(f.nodes.get('res-score').innerText, expected);
  assert.ok(f.game.challengeAddress.endsWith('?challenge=' + expected));
  assert.equal(f.game.timeLeft, 0);
  assert.equal(f.game.bombs, 0);
}

test('every stage failure settles before high score, rank, card and challenge snapshot', () => {
  for (const stage of [1, 2, 3]) {
    const f = fixture();
    Object.assign(f.game, { score: 100, timeLeft: 12, bombs: 5 });
    f.game.journey.currentStage = stage;
    f.game.gameOver('failure');
    verifyResult(f, 470, false);
    assert.equal(f.game.highScore, 470);
    assert.equal(f.writes.at(-1).value, '470');
    assert.equal(f.game.completedRun.rank, '⚡ 凌波微步·飞天蛙');
    assert.equal(f.game.completedRun.settlement.scoreBefore, 100);
  }
});

test('water, sinking pads, crocodiles and timeout all reach resource settlement', () => {
  for (const cause of ['water', 'sink', 'croc', 'timeout']) {
    const f = fixture();
    Object.assign(f.game, { score: 100, timeLeft: 12, bombs: 2 });
    if (cause === 'water') {
      f.game.rows.get(0).tiles[3] = 'EMPTY';
      f.game.onFrogLanded();
    } else if (cause === 'sink') {
      f.game.rows.get(0).sinks[3] = 0.01;
      f.game.update(0.02);
    } else if (cause === 'croc') {
      f.game.crocodiles = [{ x: 3, gridY: 0, vx: 0.1, patrol: { minX: 0, maxX: 6 } }];
      f.game.update(0.02);
    } else {
      f.game.timeLeft = 1;
      f.timeout();
    }
    verifyResult(f, cause === 'timeout' ? 200 : 320, false);
  }
});

test('actual final journey event includes endpoint rewards and prevents duplicate conversion', () => {
  const f = fixture();
  Object.assign(f.game, { score: 100, timeLeft: 12, bombs: 5, maxDistance: 36 });
  f.game.journey.currentStage = 3;
  assert.equal(f.game.updateJourneyProgress(), true);
  verifyResult(f, 750, true);
  const snapshot = f.game.completedRun;
  f.game.gameOver('duplicate failure');
  f.game.gameOver('duplicate completion', true);
  assert.equal(f.game.completedRun, snapshot);
  assert.equal(f.writes.length, 1);
  assert.ok(Object.isFrozen(snapshot.settlement));
  assert.ok(Object.isFrozen(snapshot.settlement.time));
});

test('stage transition does not settle resources; restarting resets run settlement', () => {
  const f = fixture('999');
  Object.assign(f.game, { score: 100, timeLeft: 12, bombs: 2, maxDistance: 12 });
  f.game.updateJourneyProgress();
  assert.equal(f.game.state, 'TRANSITIONING');
  assert.equal(f.game.score, 100);
  assert.equal(f.game.timeLeft, 12);
  assert.equal(f.game.bombs, 2);
  f.game.state = 'PLAYING';
  f.game.gameOver('failure');
  verifyResult(f, 320, false);
  assert.equal(f.game.highScore, 999);
  assert.equal(f.writes.length, 0);
  f.game.start();
  assert.equal(f.game.score, 0);
  assert.equal(f.game.timeLeft, 30);
  assert.equal(f.game.bombs, 2);
  assert.equal(f.game.completedRun, null);
  assert.equal(f.nodes.get('result-settlement').innerText, '');
  f.game.gameOver('next run');
  verifyResult(f, 400, false);
});
