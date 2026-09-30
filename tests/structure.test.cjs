const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const stageTwoBackgroundPath = path.join(
  repoRoot,
  'assets',
  'storm-deep-lake-river.jpg'
);
const stageOneBackgroundPath = path.join(
  repoRoot,
  'assets',
  'morning-mist-pond.jpg'
);
const expectedStageOneBackgroundHash =
  'ef04e240c22a6b7853a26e6b44ef045462d597614c31fb69dd6547263d0d6cea';
const expectedStageTwoBackgroundHash =
  'aadac9b9483900e66b71c4513e6b16115e59532c86002dec37de85f0527b35d5';

test('the V3 root is the only playable entry and loads its local runtime modules', () => {
  const html = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');

  assert.match(html, /<title>🐸 荷塘大冒险 V3 · 青蛙跳荷叶<\/title>/);
  assert.match(html, /<script src="\.\/src\/input\.js"><\/script>/);
  assert.match(html, /<script src="\.\/src\/stage-transition\.js"><\/script>/);
  assert.match(html, /<script src="\.\/src\/map-path\.js"><\/script>/);
  assert.equal(fs.existsSync(path.join(repoRoot, 'demo')), false);
});

test('the V3 root game loads input and journey policies without the legacy charge control', () => {
  const html = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');

  assert.match(html, /<script src="\.\/src\/input\.js"><\/script>/);
  assert.match(html, /<script src="\.\/src\/journey\.js"><\/script>/);
  assert.doesNotMatch(html, /id="btn-charge"/);
  assert.doesNotMatch(html, /chargeMode/);
});

test('the bomb sound preserves the blast while removing its long tail', () => {
  const html = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
  const playBomb = html.match(
    /playBomb\(\) \{([\s\S]*?)\n    \}\n    playGameOver/
  );

  assert.ok(playBomb);
  assert.match(playBomb[1], /const blast = this\.ctx\.createOscillator\(\)/);
  assert.match(playBomb[1], /blast\.type = 'sawtooth'/);
  assert.match(playBomb[1], /blast\.frequency\.exponentialRampToValueAtTime\(72, now \+ 0\.14\)/);
  assert.match(playBomb[1], /blast\.stop\(now \+ 0\.24\)/);
  assert.match(playBomb[1], /const burst = this\.ctx\.createBufferSource\(\)/);
  assert.match(playBomb[1], /const burstFilter = this\.ctx\.createBiquadFilter\(\)/);
  assert.match(playBomb[1], /burst\.stop\(now \+ 0\.12\)/);
  assert.doesNotMatch(playBomb[1], /chime|shock|triangle/);
});

test('the V3 root loads the local poster helper before its inline runtime', () => {
  const html = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
  const helperIndex = html.indexOf('<script src="./src/share-poster.js"></script>');
  const runtimeIndex = html.indexOf('<script>\n/**');

  assert.ok(helperIndex >= 0);
  assert.ok(runtimeIndex > helperIndex);
});

test('the result card uses direct result-card actions without its retired feature showcase', () => {
  const html = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');

  assert.doesNotMatch(html, /💡 创意与技术特性：/);
  assert.doesNotMatch(html, /id="btn-copy-share"/);
  assert.match(
    html,
    /<button class="btn-main" id="btn-download-poster" type="button" disabled>战绩卡准备中…<\/button>/
  );
  assert.match(
    html,
    /<button class="btn-secondary" id="btn-copy-challenge" type="button" disabled>复制挑战地址<\/button>/
  );
  assert.match(html, /id="over-badge"/);
  assert.match(html, /id="over-title"/);
  assert.match(html, /id="over-rank"/);
  for (const metricId of ['res-score', 'res-distance', 'res-time', 'res-best']) {
    assert.match(html, new RegExp(`id="${metricId}"`));
  }
});

test('the result modal is the only visible battle-card surface', () => {
  const html = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');

  assert.match(
    html,
    /<div class="modal-overlay hidden" id="gameover-modal">/
  );
  assert.match(html, /<div class="card result-poster-card" id="result-poster-card">/);
  assert.match(html, /id="result-environment"/);
  assert.match(html, /class="result-score-value"><span id="res-score">0<\/span><small> 分<\/small>/);
  assert.match(html, /id="btn-copy-challenge"[^>]*disabled/);
  assert.match(html, /id="btn-download-poster"[^>]*disabled/);
  assert.match(html, /id="result-poster-status"[^>]*aria-live="polite"/);
  assert.match(html, /\.result-poster-card\s*\{[\s\S]*?url\('\.\/assets\/morning-mist-pond\.jpg'\)/);
  assert.match(html, /\.result-poster-card\.stage-two\s*\{[\s\S]*?url\('\.\/assets\/storm-deep-lake-river\.jpg'\)/);
  assert.match(html, /\.result-poster-card\s*\{[\s\S]*?overflow-y:\s*auto/);
  assert.doesNotMatch(html, /id="poster-modal"/);
  assert.doesNotMatch(html, /id="btn-generate-poster"/);
});

test('the start modal has a dismissible challenge prompt backed by the poster parser', () => {
  const html = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');

  assert.match(html, /id="challenge-prompt"[^>]*hidden/);
  assert.match(html, /id="btn-dismiss-challenge"/);
  assert.match(html, /FrogSharePoster\.parseChallengeScore\(window\.location\.search\)/);
  assert.match(html, /有人打出 \$\{challengeScore\} 分，来试试超过它。/);
  assert.match(
    html,
    /btnDismissChallenge\.addEventListener\('click', \(\) => \{\s*challengePrompt\.hidden = true;\s*\}\);/
  );
});

test('game over owns one immutable completed run and prepares its result-card export', () => {
  const html = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
  const releaseResultPosterExport = html.match(
    /releaseResultPosterExport\(invalidateGeneration = true\) \{([\s\S]*?)\n    \},\n\n    update/
  );

  assert.match(html, /completedRun:\s*null/);
  assert.match(html, /posterObjectUrl:\s*null/);
  assert.match(html, /challengeAddress:\s*''/);
  assert.match(html, /this\.completedRun = null;/);
  assert.match(html, /this\.posterObjectUrl = null;/);
  assert.match(
    html,
    /this\.completedRun = Object\.freeze\(\{\s*score: this\.score,\s*distance: this\.maxDistance,\s*survivalTime: this\.survivalTime,\s*highScore: this\.highScore,\s*rank,\s*completed,\s*stageName: this\.getCurrentStageName\(\)\s*\}\);/
  );
  assert.match(html, /document\.getElementById\('res-score'\)\.innerText = this\.completedRun\.score;/);
  assert.match(html, /document\.getElementById\('res-distance'\)\.innerText = `\$\{this\.completedRun\.distance\}m`;/);
  assert.doesNotMatch(
    html,
    /this\.completedRun = Object\.freeze\(\{[\s\S]*?\bmaxDistance:/
  );
  assert.match(html, /this\.prepareResultPosterExport\(\);/);
  assert.match(html, /result-poster-card'\)\.classList\.toggle\(\s*'stage-two'/);
  assert.ok(releaseResultPosterExport);
  assert.match(releaseResultPosterExport[1], /URL\.revokeObjectURL\(this\.posterObjectUrl\);/);
  assert.match(releaseResultPosterExport[1], /this\.posterObjectUrl = null;/);
  assert.doesNotMatch(releaseResultPosterExport[1], /(?:gameoverModal|this\.state)/);
  assert.match(
    html,
    /start\(\) \{\s*sfx\.init\(\);\s*this\.releaseResultPosterExport\(\);/
  );
});

test('the unified result card exports a local PNG and retains copy controls', () => {
  const html = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
  const prepareResultPosterExport = html.match(
    /prepareResultPosterExport\(\) \{([\s\S]*?)\n    \},\n\n    releaseResultPosterExport/
  );

  assert.ok(prepareResultPosterExport);
  assert.match(prepareResultPosterExport[1], /document\.createElement\('canvas'\)/);
  assert.match(prepareResultPosterExport[1], /FrogSharePoster\.renderPoster\(/);
  assert.match(prepareResultPosterExport[1], /canvas\.toBlob\([\s\S]*?'image\/png'/);
  assert.match(
    prepareResultPosterExport[1],
    /FrogSharePoster\.createChallengeUrl\(\s*window\.location\.origin,\s*window\.location\.pathname,\s*this\.completedRun\.score\s*\)/
  );
  assert.match(
    prepareResultPosterExport[1],
    /const posterBackground = this\.getStageBackground\(this\.journey\.currentStage\)\.image;[\s\S]*?FrogSharePoster\.renderPoster\(\s*context,\s*this\.completedRun,\s*challengeAddress,\s*posterBackground\s*\)/
  );
  assert.match(
    prepareResultPosterExport[1],
    /this\.releaseResultPosterExport\(false\);[\s\S]*?this\.posterObjectUrl = URL\.createObjectURL\(blob\);/
  );
  assert.match(
    html,
    /navigator\.clipboard && typeof navigator\.clipboard\.writeText === 'function'/
  );
  assert.match(html, /navigator\.clipboard\.writeText\(this\.challengeAddress\)/);
  assert.match(html, /地址已选中，可长按或使用系统复制。/);
  assert.match(html, /download = '荷塘大冒险-战绩卡\.png'/);
  assert.doesNotMatch(html, /\balert\s*\(/);
});

test('saving a result image opens a long-press-safe image layer without replacing the result card', () => {
  const html = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
  const closeImageSaveLayer = html.match(
    /closeImageSaveLayer\([^)]*\) \{([\s\S]*?)\n    \},\n\n    update/
  );

  assert.match(
    html,
    /<div class="modal-overlay image-save-overlay hidden" id="image-save-modal" role="dialog" aria-modal="true" aria-labelledby="image-save-title" hidden>/
  );
  assert.match(html, /<img class="save-image" id="save-image" alt="荷塘大冒险战绩卡图片">/);
  assert.match(html, /id="btn-close-image-save"[^>]*aria-label="关闭图片保存"/);
  assert.match(html, /id="btn-download-png"[^>]*hidden/);
  assert.match(html, /body\.image-save-mode\s*\{[\s\S]*?touch-action:\s*auto/);
  assert.match(html, /\.save-image\s*\{[\s\S]*?-webkit-touch-callout:\s*default/);
  assert.match(html, /\.save-image\s*\{[\s\S]*?user-select:\s*auto/);
  assert.match(html, /\.save-image\s*\{[\s\S]*?touch-action:\s*auto/);
  assert.match(html, /btnDownloadPoster\.innerText = '保存战绩卡';/);
  assert.match(
    html,
    /document\.getElementById\('btn-download-poster'\)\.addEventListener\('click', \(\) => \{\s*this\.openImageSaveLayer\(\);/
  );
  assert.match(
    html,
    /openImageSaveLayer\([^)]*\) \{[\s\S]*?saveImage\.src = this\.posterObjectUrl;[\s\S]*?document\.body\.classList\.add\('image-save-mode'\);[\s\S]*?btnDownloadPng\.hidden = false;[\s\S]*?imageSaveModal\.hidden = false;/
  );
  assert.ok(closeImageSaveLayer);
  assert.match(closeImageSaveLayer[1], /document\.body\.classList\.remove\('image-save-mode'\);/);
  assert.match(closeImageSaveLayer[1], /saveImage\.removeAttribute\('src'\);/);
  assert.match(closeImageSaveLayer[1], /btnDownloadPng\.hidden = true;/);
  assert.doesNotMatch(closeImageSaveLayer[1], /URL\.revokeObjectURL/);
});

test('clipboard fallback reveals and selects the challenge address for manual copying', () => {
  const html = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');

  assert.match(
    html,
    /<textarea class="challenge-address-fallback" id="challenge-address-fallback" readonly hidden><\/textarea>/
  );
  assert.match(
    html,
    /const showChallengeAddressFallback = \(\) => \{[\s\S]*?challengeAddressFallback\.value = this\.challengeAddress;[\s\S]*?challengeAddressFallback\.hidden = false;[\s\S]*?challengeAddressFallback\.focus\(\);[\s\S]*?challengeAddressFallback\.select\(\);/
  );
  assert.match(
    html,
    /if \(!\(navigator\.clipboard && typeof navigator\.clipboard\.writeText === 'function'\)\) \{\s*showChallengeAddressFallback\(\);/
  );
  assert.match(
    html,
    /\.catch\(\(\) => \{\s*showChallengeAddressFallback\(\);/
  );
  assert.match(
    html,
    /challengeAddressFallback\.hidden = true;[\s\S]*?challengeAddressFallback\.value = ''/
  );
});

test('the root contains no prohibited social SDK, QR, invite, analytics, or remote URL integration', () => {
  const html = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');

  assert.doesNotMatch(html, /\bjweixin\b/i);
  assert.doesNotMatch(html, /\bwx\./i);
  assert.doesNotMatch(html, /\b(?:qrcode|QRCode)\b/);
  assert.doesNotMatch(html, /\binvite\b/i);
  assert.doesNotMatch(html, /\b(?:analytics|ga\(|gtag\()\b/i);
  assert.doesNotMatch(html, /https?:\/\//i);
});

test('the V3 root game delegates protected element drawing to the canonical library', () => {
  const html = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');

  assert.match(html, /<script src="\.\/src\/game-elements\.js"><\/script>/);
  assert.match(html, /FrogGameElements\.drawLilyPad\(/);
  assert.match(html, /FrogGameElements\.drawFlower\(/);
  assert.match(html, /FrogGameElements\.drawBombPickup\(/);
  assert.match(html, /FrogGameElements\.drawCrocodile\(/);
  assert.match(html, /FrogGameElements\.drawJumpPreview\(/);
  assert.match(html, /FrogGameElements\.drawFrog\(/);
  assert.doesNotMatch(html, /\n\s*drawLilyPad\(/);
  assert.doesNotMatch(html, /\n\s*drawLotusFlower\(/);
  assert.doesNotMatch(html, /\n\s*drawBombItem\(/);
  assert.doesNotMatch(html, /\n\s*drawCrocodile\(/);
  assert.doesNotMatch(html, /\n\s*drawFrog\(/);
});

test('the V3 root game owns the stage-transition lifecycle while the transition module owns timing and overlay rendering', () => {
  const html = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');

  assert.match(html, /<script src="\.\/src\/stage-transition\.js"><\/script>/);
  assert.match(html, /stageTransition:\s*null/);
  assert.match(
    html,
    /this\.stageTransition = FrogStageTransition\.create\(\{\s*startTime: performance\.now\(\),\s*reducedMotion: window\.matchMedia\('\(prefers-reduced-motion: reduce\)'\)\.matches\s*\}\);/
  );
assert.match(html, /this\.state = 'TRANSITIONING';/);
  assert.match(html, /updateStageTransition\(\) \{[\s\S]*?transitionEvent\.switchStage/);
  assert.match(html, /if \(transitionEvent\.switchStage\) \{\s*this\.journey\.currentStage = this\.pendingStage;/);
  assert.match(
    html,
    /if \(transitionEvent\.completed\) \{[\s\S]*?this\.stageTransition = null;[\s\S]*?this\.state = 'PLAYING';/
  );
  assert.match(html, /this\.stageTransition\.render\(ctx, this\.width, this\.height\);/);

  const entityIndex = html.indexOf('FrogGameElements.drawFrog(ctx, this.frog);');
  const overlayIndex = html.indexOf('this.stageTransition.render(ctx, this.width, this.height);');
  assert.ok(entityIndex >= 0 && overlayIndex > entityIndex);
});

test('the transition boundary pauses input, timer, camera, crocodiles, sinks, and buffered jumps', () => {
  const html = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');

  assert.match(html, /if \(this\.state === 'TRANSITIONING'\) \{\s*this\.updateStageTransition\(\);\s*return;\s*\}/);
  assert.match(html, /if \(this\.state !== 'PLAYING' \|\| !this\.frog\.alive\) return;/);
  assert.match(html, /if \(this\.state !== 'PLAYING' \|\| this\.bombs <= 0\) return;/);
  assert.match(html, /if \(this\.state === 'PLAYING'\) \{\s*this\.timeLeft--;/);
  assert.match(
    html,
    /this\.inputBuffer\.clear\(\);[\s\S]*?this\.stageTransition = FrogStageTransition\.create/
  );
  assert.match(html, /if \(this\.state === 'PLAYING' && this\.frog\.alive && nextJump\)/);
});

test('the Stage 1 morning background remains a local authorized asset', () => {
  const html = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');

  assert.equal(hashFile(stageOneBackgroundPath), expectedStageOneBackgroundHash);
  assert.match(html, /this\.preloadStageOneBackground\(\)/);
  assert.match(html, /image\.src = '\.\/assets\/morning-mist-pond\.jpg'/);
  assert.doesNotMatch(html, /image\.src = ['"]https?:\/\//);
});

test('the Stage 2 storm background remains a local authorized asset', () => {
  const html = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');

  assert.equal(hashFile(stageTwoBackgroundPath), expectedStageTwoBackgroundHash);
  assert.match(html, /const image = new Image\(\)/);
  assert.match(html, /image\.src = '\.\/assets\/storm-deep-lake-river\.jpg'/);
  assert.doesNotMatch(html, /image\.src = ['"]https?:\/\//);
});

test('the Stage 3 sunset reeds background remains local and is transition-ready', () => {
  const html = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');

  assert.match(html, /<script src="\.\/src\/chapters\.js"><\/script>/);
  assert.match(html, /FrogChapters\.getJourneyOptions\(\)/);
  assert.match(html, /stageThreeBackground:\s*\{\s*image:\s*null,\s*ready:\s*false\s*\}/);
  assert.match(html, /this\.preloadStageThreeBackground\(\)/);
  assert.match(html, /image\.src = '\.\/assets\/stage3-sunset-reeds\.jpg'/);
  assert.match(html, /this\.pendingStage = result\.currentStage;[\s\S]*?this\.journey\.currentStage = previousStage;/);
  assert.match(html, /this\.journey\.currentStage = this\.pendingStage;/);
  assert.match(html, /this\.pendingStage = null;/);
});

test('gameplay rows consume the canonical map plan created per run', () => {
  const html = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
  const mapPathScriptIndex = html.indexOf('<script src="./src/map-path.js"></script>');
  const runtimeIndex = html.indexOf('<script>\n/**');
  const generateRow = html.match(
    /generateRow\(rowIndex\) \{([\s\S]*?)\n    \},\n\n    getScreenX/
  );

  // The planner must load before the inline runtime can create a plan.
  assert.ok(mapPathScriptIndex >= 0);
  assert.ok(runtimeIndex > mapPathScriptIndex);

  assert.match(html, /mapPlan:\s*null/);
  assert.match(
    html,
    /this\.mapPlan = FrogMapPath\.createMapPlan\(this\.createRunSeed\(\)\);/
  );
  assert.match(
    html,
    /createRunSeed\(\) \{[\s\S]*?window\.crypto\.getRandomValues\(new Uint32Array\(1\)\)\[0\]/
  );

  assert.ok(generateRow);
  assert.match(
    generateRow[1],
    /const descriptor = this\.mapPlan\.getRow\(rowIndex\);/
  );
  assert.match(generateRow[1], /throw new RangeError/);
  assert.match(generateRow[1], /const tiles = descriptor\.tiles\.slice\(\);/);
  assert.match(generateRow[1], /const items = descriptor\.items\.slice\(\);/);
  assert.match(generateRow[1], /const sinks = new Array\(COLS\)\.fill\(0\);/);

  // The inline runtime must not recreate the retired Math.random generator.
  // Crocodile data belongs to the seeded planner and is only instantiated
  // from the descriptor here.
  assert.doesNotMatch(html, /validPrevCols/);
  assert.doesNotMatch(html, /anchorCol/);
  assert.doesNotMatch(html, /safeCol/);
  assert.doesNotMatch(html, /firstPlayableCol/);
  assert.doesNotMatch(html, /lastPlayableCol/);
  assert.doesNotMatch(html, /isSunsetStage/);
  assert.doesNotMatch(html, /\bprevRow\b/);
  assert.match(
    generateRow[1],
    /descriptor\.crocodiles\.forEach\(\(crocodile\) => \{[\s\S]*?this\.crocodiles\.push/
  );
  assert.doesNotMatch(generateRow[1], /Math\.random/);
});

test('the canonical map planner keeps Stage 3 generation full width', () => {
  const planner = fs.readFileSync(
    path.join(repoRoot, 'src', 'map-path.js'),
    'utf8'
  );

  assert.doesNotMatch(planner, /firstPlayableColumn|lastPlayableColumn|protectEdges/);
  assert.match(planner, /for \(let column = 0; column < columns; column\+\+\)/);
});

test('each stage draws its loaded local background before entities and falls back to procedural water', () => {
  const html = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
  const stageOneBackgroundIndex = html.indexOf('this.drawStageOneMorningBackground(ctx);');
  const stageTwoBackgroundIndex = html.indexOf('this.drawStageTwoStormBackground(ctx);');
  const stageThreeBackgroundIndex = html.indexOf('this.drawStageThreeSunsetBackground(ctx);');
  const firstEntityIndex = html.indexOf('FrogGameElements.drawLilyPad(');

  assert.match(
    html,
    /if \(this\.journey\.currentStage === 1 && this\.stageOneBackground\.ready\) \{\s*this\.drawStageOneMorningBackground\(ctx\);\s*\} else if \(this\.journey\.currentStage === 2 && this\.stageTwoBackground\.ready\) \{\s*this\.drawStageTwoStormBackground\(ctx\);\s*\} else if \(this\.journey\.currentStage === 3 && this\.stageThreeBackground\.ready\) \{\s*this\.drawStageThreeSunsetBackground\(ctx\);\s*\} else \{\s*this\.drawProceduralWater\(ctx\);\s*\}/
  );
  assert.match(html, /image\.addEventListener\('error', \(\) => \{\s*this\.stageOneBackground\.ready = false;/);
  assert.match(html, /image\.addEventListener\('error', \(\) => \{\s*this\.stageTwoBackground\.ready = false;/);
  assert.match(html, /image\.addEventListener\('error', \(\) => \{\s*this\.stageThreeBackground\.ready = false;/);
  assert.match(html, /ctx\.drawImage\(\s*image,[\s\S]*?this\.width,\s*this\.height\s*\)/);
  assert.ok(
    stageOneBackgroundIndex >= 0 &&
      stageTwoBackgroundIndex >= 0 &&
      stageThreeBackgroundIndex >= 0 &&
      stageOneBackgroundIndex < firstEntityIndex &&
      stageTwoBackgroundIndex < firstEntityIndex &&
      stageThreeBackgroundIndex < firstEntityIndex
  );
});

test('the V3 root inline script parses as JavaScript', () => {
  const html = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
  const inlineScripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];

  assert.equal(inlineScripts.length, 1);
  assert.doesNotThrow(() => new Function(inlineScripts[0][1]));
});

test('the V3 root game buffers one jump while airborne and clears it at reset boundaries', () => {
  const html = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');

  assert.match(html, /inputBuffer:\s*FrogInput\.createSingleInputBuffer\(\)/);
  assert.match(
    html,
    /if \(this\.frog\.isJumping\) \{\s*this\.inputBuffer\.put\(jump\);\s*return;\s*\}/
  );
  assert.match(html, /const nextJump = this\.inputBuffer\.take\(\)/);
  assert.match(html, /this\.triggerJump\(nextJump\.direction, nextJump\.steps\)/);
  assert.ok(
    [...html.matchAll(/this\.inputBuffer\.clear\(\)/g)].length >= 3,
    'start, gameOver, and touchcancel must clear buffered input'
  );
});

test('the D-Pad binds one touch identifier and suppresses compatibility clicks', () => {
  const html = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');

  assert.match(html, /holdGesture\.start\(dir,\s*touch\.identifier\)/);
  assert.match(html, /holdGesture\.end\(e\.changedTouches\[i\]\.identifier\)/);
  assert.match(html, /holdGesture\.cancel\(e\.changedTouches\[i\]\.identifier\)/);
  assert.match(
    html,
    /FrogInput\.isCompatibilityClick\(lastTouchAt,\s*Date\.now\(\)\)/
  );
});

test('the D-Pad cancels its owned gesture when the touch leaves its button', () => {
  const html = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
  const touchMoveHandler = html.match(
    /btn\.addEventListener\('touchmove', \(e\) => \{([\s\S]*?)\n\s*\}, \{ passive: false \}\);/
  );

  assert.ok(touchMoveHandler);
  assert.match(touchMoveHandler[1], /btn\.getBoundingClientRect\(\)/);
  assert.match(
    touchMoveHandler[1],
    /holdGesture\.cancel\(touch\.identifier\)[\s\S]*?lastTouchAt = Date\.now\(\);[\s\S]*?this\.inputBuffer\.clear\(\)/
  );
});

test('page interruptions cancel the active D-Pad gesture and buffered input', () => {
  const html = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
  const cancelActiveTouch = html.match(
    /const cancelActiveTouch = \(\) => \{([\s\S]*?)\n\s*\};/
  );

  assert.ok(cancelActiveTouch);
  assert.match(cancelActiveTouch[1], /holdGesture\.cancelActive\(\)/);
  assert.match(cancelActiveTouch[1], /lastTouchAt = Date\.now\(\)/);
  assert.match(cancelActiveTouch[1], /this\.inputBuffer\.clear\(\)/);
  assert.match(html, /window\.addEventListener\('blur', cancelActiveTouch\)/);
  assert.match(
    html,
    /document\.addEventListener\('visibilitychange',[\s\S]*?document\.hidden[\s\S]*?cancelActiveTouch\(\)/
  );
  assert.match(
    html,
    /window\.addEventListener\('orientationchange', cancelActiveTouch\)/
  );
});

test('the Canvas binds the swipe hold policy and shares global cancellation', () => {
  const html = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
  const cancelActiveTouch = html.match(
    /const cancelActiveTouch = \(\) => \{([\s\S]*?)\n\s*\};/
  );

  assert.match(html, /const swipeGesture = FrogInput\.createSwipeHoldGesture\(\{/);
  assert.match(
    html,
    /swipeGesture\.start\(touch\.identifier,\s*touch\.clientX,\s*touch\.clientY\)/
  );
  assert.match(
    html,
    /swipeGesture\.move\(touch\.identifier,\s*touch\.clientX,\s*touch\.clientY\)/
  );
  assert.match(html, /swipeGesture\.end\(e\.changedTouches\[i\]\.identifier\)/);
  assert.match(html, /swipeGesture\.cancel\(e\.changedTouches\[i\]\.identifier\)/);
  assert.ok(cancelActiveTouch);
  assert.match(cancelActiveTouch[1], /swipeGesture\.cancelActive\(\)/);
  assert.doesNotMatch(html, /touchStart[XY]/);
});

test('the bomb touch stays independent and suppresses its compatibility click', () => {
  const html = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');

  assert.match(html, /let lastBombTouchAt = 0/);
  assert.match(html, /lastBombTouchAt = Date\.now\(\)[\s\S]*?this\.throwBomb\(\)/);
  assert.match(
    html,
    /FrogInput\.isCompatibilityClick\(lastBombTouchAt,\s*Date\.now\(\)\)/
  );
});

function hashFile(filePath) {
  return crypto
    .createHash('sha256')
    .update(fs.readFileSync(filePath))
    .digest('hex');
}
