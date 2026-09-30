(function exposeChallengeLink(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.FrogChallengeLink = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createChallengeLink() {
  const MAX_CHALLENGE_SCORE = 999999;

  function parseChallengeScore(value) {
    let url;
    try {
      url = new URL(String(value), 'https://challenge.invalid');
    } catch (error) {
      return null;
    }

    const scores = url.searchParams.getAll('challenge');
    if (
      url.searchParams.size !== 1 ||
      scores.length !== 1 ||
      !/^(0|[1-9]\d*)$/.test(scores[0])
    ) {
      return null;
    }

    const score = Number(scores[0]);
    return score <= MAX_CHALLENGE_SCORE ? score : null;
  }

  function createChallengeUrl(origin, pathname, score) {
    if (!Number.isSafeInteger(score) || score < 0 || score > MAX_CHALLENGE_SCORE) {
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

    if (
      typeof pathname !== 'string' ||
      !pathname.startsWith('/') ||
      pathname.startsWith('//') ||
      pathname.includes('\\')
    ) {
      throw new TypeError('Challenge pathname must be an absolute path on the challenge origin.');
    }

    const url = new URL(pathname, base.origin);
    if (url.origin !== base.origin) {
      throw new TypeError('Challenge pathname must be an absolute path on the challenge origin.');
    }
    url.search = `?challenge=${score}`;
    url.hash = '';
    return url.href;
  }

  return Object.freeze({
    MAX_CHALLENGE_SCORE,
    parseChallengeScore,
    createChallengeUrl
  });
});
