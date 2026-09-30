(function exposeSharePoster(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.FrogSharePoster = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createSharePoster() {
  const MAX_CHALLENGE_SCORE = 999999;
  const POSTER_WIDTH = 1080;
  const POSTER_HEIGHT = 1440;
  const GAME_NAME = '荷塘大冒险';

  function parseChallengeScore(value) {
    let url;
    try {
      url = new URL(String(value), 'https://challenge.invalid');
    } catch (error) {
      return null;
    }

    const scores = url.searchParams.getAll('challenge');
    if (url.searchParams.size !== 1 ||
      scores.length !== 1 ||
      !/^(0|[1-9]\d*)$/.test(scores[0])) {
      return null;
    }

    const score = Number(scores[0]);
    return score <= MAX_CHALLENGE_SCORE ? score : null;
  }

  function createChallengeUrl(origin, pathname, score) {
    if (!isChallengeScore(score)) {
      throw new TypeError('Challenge score must be an integer between 0 and 999999.');
    }

    let base;
    try {
      base = new URL(String(origin));
    } catch (error) {
      throw new TypeError('Challenge origin must be an absolute URL.');
    }

    if (base.protocol !== 'http:' && base.protocol !== 'https:') {
      throw new TypeError('Challenge origin must be an HTTP(S) URL.');
    }

    if (typeof pathname !== 'string' ||
      !pathname.startsWith('/') ||
      pathname.startsWith('//') ||
      pathname.includes('\\')) {
      throw new TypeError('Challenge pathname must be an absolute path on the challenge origin.');
    }

    const url = new URL(
      pathname,
      base.origin
    );
    if (url.origin !== base.origin) {
      throw new TypeError('Challenge pathname must be an absolute path on the challenge origin.');
    }
    url.search = `?challenge=${score}`;
    url.hash = '';
    return url.href;
  }

  function normalizePosterSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== 'object' ||
      !isNonNegativeSafeInteger(snapshot.score) ||
      !isNonNegativeSafeInteger(snapshot.distance) ||
      !isNonNegativeSafeInteger(snapshot.survivalTime) ||
      !isNonNegativeSafeInteger(snapshot.highScore) ||
      !isNonEmptyString(snapshot.rank) ||
      typeof snapshot.completed !== 'boolean' ||
      !isNonEmptyString(snapshot.stageName)) {
      throw new TypeError('Poster snapshot is invalid.');
    }

    return {
      score: snapshot.score,
      distance: snapshot.distance,
      survivalTime: snapshot.survivalTime,
      highScore: snapshot.highScore,
      rank: snapshot.rank,
      completed: snapshot.completed,
      stageName: snapshot.stageName
    };
  }

  function getPosterDescriptor(snapshot, publicAddress) {
    const normalized = normalizePosterSnapshot(snapshot);
    if (!isNonEmptyString(publicAddress)) {
      throw new TypeError('Poster public address must be a non-empty string.');
    }

    return {
      width: POSTER_WIDTH,
      height: POSTER_HEIGHT,
      mimeType: 'image/png',
      gameName: GAME_NAME,
      environment: normalized.stageName,
      rank: normalized.rank,
      score: normalized.score,
      distance: normalized.distance,
      survivalTime: normalized.survivalTime,
      highScore: normalized.highScore,
      distanceFact: `本次前进 ${normalized.distance} 米`,
      publicAddress
    };
  }

  function renderPoster(context, snapshot, publicAddress, backgroundImage) {
    if (!context || !context.canvas ||
      typeof context.fillRect !== 'function' ||
      typeof context.fillText !== 'function') {
      throw new TypeError('A CanvasRenderingContext2D-like context is required.');
    }

    const descriptor = getPosterDescriptor(snapshot, publicAddress);
    setCanvasDimensions(context.canvas, descriptor.width, descriptor.height);

    drawPosterBackground(context, descriptor, backgroundImage);
    drawPosterContent(context, descriptor);

    return descriptor;
  }

  function drawPosterBackground(context, descriptor, backgroundImage) {
    context.fillStyle = '#082a31';
    context.fillRect(0, 0, descriptor.width, descriptor.height);

    if (backgroundImage && typeof context.drawImage === 'function') {
      drawCoverImage(context, backgroundImage, descriptor.width, descriptor.height);
    }

    const overlay = typeof context.createLinearGradient === 'function'
      ? context.createLinearGradient(0, 0, 0, descriptor.height)
      : null;
    if (overlay) {
      overlay.addColorStop(0, 'rgba(3, 18, 26, 0.16)');
      overlay.addColorStop(0.42, 'rgba(4, 22, 30, 0.42)');
      overlay.addColorStop(1, 'rgba(2, 12, 18, 0.92)');
      context.fillStyle = overlay;
    } else {
      context.fillStyle = 'rgba(2, 12, 18, 0.68)';
    }
    context.fillRect(0, 0, descriptor.width, descriptor.height);

    context.fillStyle = 'rgba(255, 190, 55, 0.95)';
    context.fillRect(72, 96, 14, 172);
    context.fillStyle = 'rgba(232, 247, 230, 0.16)';
    context.fillRect(72, 820, 936, 2);
    context.fillStyle = 'rgba(232, 247, 230, 0.12)';
    context.fillRect(72, 1168, 936, 2);
  }

  function drawPosterContent(context, descriptor) {
    const inset = 92;
    context.textAlign = 'left';
    context.fillStyle = '#f6f3dd';
    context.font = '700 74px Georgia, "Songti SC", serif';
    context.fillText(descriptor.gameName, inset, 166);
    context.fillStyle = '#b8d9cf';
    context.font = '600 30px sans-serif';
    context.fillText(descriptor.environment.toUpperCase(), inset, 222);

    context.fillStyle = 'rgba(6, 26, 32, 0.76)';
    context.fillRect(72, 338, 936, 408);
    context.fillStyle = '#ffbe37';
    context.font = '600 34px sans-serif';
    context.fillText('本局战绩', inset, 414);
    context.textAlign = 'center';
    context.fillStyle = '#fff9e5';
    context.font = '700 218px Georgia, "Songti SC", serif';
    context.fillText(String(descriptor.score), 540, 606);
    context.fillStyle = '#cde8dc';
    context.font = '600 32px sans-serif';
    context.fillText('SCORE', 540, 666);

    context.textAlign = 'left';
    context.fillStyle = '#e9f7ea';
    context.font = '700 43px sans-serif';
    context.fillText(descriptor.rank, inset, 896);
    context.fillStyle = '#b8d9cf';
    context.font = '500 30px sans-serif';
    context.fillText(descriptor.distanceFact, inset, 952);

    drawMetric(context, '前进距离', `${descriptor.distance} m`, 92, 1040);
    drawMetric(context, '存活时长', `${descriptor.survivalTime} s`, 420, 1040);
    drawMetric(context, '历史最高', `${descriptor.highScore}`, 748, 1040);

    context.fillStyle = '#93c7bd';
    context.font = '500 25px sans-serif';
    context.textAlign = 'left';
    context.fillText('挑战地址', inset, 1240);
    context.fillStyle = '#f6f3dd';
    context.font = '500 25px monospace';
    context.fillText(descriptor.publicAddress, inset, 1292);
    context.fillStyle = '#ffbe37';
    context.font = '600 27px sans-serif';
    context.fillText('跳得更远，荷塘见。', inset, 1360);
  }

  function drawMetric(context, label, value, x, y) {
    context.textAlign = 'left';
    context.fillStyle = 'rgba(6, 26, 32, 0.68)';
    context.fillRect(x, y - 44, 286, 122);
    context.fillStyle = '#a7d2c5';
    context.font = '500 25px sans-serif';
    context.fillText(label, x + 22, y);
    context.fillStyle = '#fff9e5';
    context.font = '700 42px Georgia, "Songti SC", serif';
    context.fillText(value, x + 22, y + 51);
  }

  function drawCoverImage(context, image, targetWidth, targetHeight) {
    const sourceWidth = image.naturalWidth || image.width;
    const sourceHeight = image.naturalHeight || image.height;
    if (!Number.isFinite(sourceWidth) || !Number.isFinite(sourceHeight) ||
      sourceWidth <= 0 || sourceHeight <= 0) {
      return;
    }

    const scale = Math.max(targetWidth / sourceWidth, targetHeight / sourceHeight);
    const width = sourceWidth * scale;
    const height = sourceHeight * scale;
    context.drawImage(image, (targetWidth - width) / 2, (targetHeight - height) / 2, width, height);
  }

  function setCanvasDimensions(canvas, width, height) {
    if (!canvas || typeof canvas !== 'object' ||
      !canSetCanvasDimensions(canvas, width, height)) {
      throw new TypeError('A CanvasRenderingContext2D-like context is required.');
    }
  }

  function canSetCanvasDimensions(canvas, width, height) {
    try {
      return Reflect.set(canvas, 'width', width) &&
        Reflect.set(canvas, 'height', height) &&
        canvas.width === width &&
        canvas.height === height;
    } catch (error) {
      return false;
    }
  }

  function isChallengeScore(value) {
    return Number.isSafeInteger(value) && value >= 0 && value <= MAX_CHALLENGE_SCORE;
  }

  function isNonNegativeSafeInteger(value) {
    return Number.isSafeInteger(value) && value >= 0;
  }

  function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
  }

  return Object.freeze({
    MAX_CHALLENGE_SCORE,
    parseChallengeScore,
    createChallengeUrl,
    normalizePosterSnapshot,
    getPosterDescriptor,
    renderPoster
  });
});
