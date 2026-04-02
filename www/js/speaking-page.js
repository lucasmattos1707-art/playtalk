(function initPlaytalkSpeakingPage() {
  const SPEAKING_STATS_KEY = 'playtalk-speaking-general-v1';
  const FINAL_BOX_DURATION_MS = 10000;
  const DUEL_WINNER_DURATION_MS = 5000;
  const DUEL_POLL_MS = 2000;
  const PRESENCE_PING_MS = 15000;
  const WORD_SWAP_MS = 1000;
  const DUEL_INTRO_COUNTDOWN_SECONDS = 5;

  const els = {
    home: document.getElementById('speakingHome'),
    game: document.getElementById('speakingGame'),
    duelIntro: document.getElementById('duelIntro'),
    duelIntroMePlayer: document.getElementById('duelIntroMePlayer'),
    duelIntroEnemyPlayer: document.getElementById('duelIntroEnemyPlayer'),
    duelIntroMeAvatar: document.getElementById('duelIntroMeAvatar'),
    duelIntroEnemyAvatar: document.getElementById('duelIntroEnemyAvatar'),
    duelIntroMeName: document.getElementById('duelIntroMeName'),
    duelIntroEnemyName: document.getElementById('duelIntroEnemyName'),
    duelIntroCountdown: document.getElementById('duelIntroCountdown'),
    cardCountSelect: document.getElementById('cardCountSelect'),
    startSpeakingBtn: document.getElementById('startSpeakingBtn'),
    homeStatus: document.getElementById('homeStatus'),
    speakingPercent: document.getElementById('speakingPercent'),
    enemySpeakingPercent: document.getElementById('enemySpeakingPercent'),
    gameProgressBar: document.getElementById('gameProgressBar'),
    enemyProgressWrap: document.getElementById('enemyProgressWrap'),
    enemyProgressBar: document.getElementById('enemyProgressBar'),
    progressLabel: document.getElementById('progressLabel'),
    duelAvatarsWrap: document.getElementById('duelAvatarsWrap'),
    mePronRing: document.getElementById('mePronRing'),
    enemyPronRing: document.getElementById('enemyPronRing'),
    meAvatar: document.getElementById('meAvatar'),
    enemyAvatar: document.getElementById('enemyAvatar'),
    meAvatarName: document.getElementById('meAvatarName'),
    enemyAvatarName: document.getElementById('enemyAvatarName'),
    meAvatarPercent: document.getElementById('meAvatarPercent'),
    enemyAvatarPercent: document.getElementById('enemyAvatarPercent'),
    cardEnglishWord: document.getElementById('cardEnglishWord'),
    cardPortugueseWord: document.getElementById('cardPortugueseWord'),
    sendSpeakingBtn: document.getElementById('sendSpeakingBtn'),
    gameStatus: document.getElementById('gameStatus'),
    finalResultBox: document.getElementById('finalResultBox'),
    winnerCard: document.getElementById('winnerCard'),
    winnerAvatar: document.getElementById('winnerAvatar'),
    winnerName: document.getElementById('winnerName'),
    winnerReveal: document.getElementById('winnerReveal'),
    winnerRevealAvatar: document.getElementById('winnerRevealAvatar'),
    successAudio: document.getElementById('successAudio'),
    battleIntroAudio: document.getElementById('battleIntroAudio')
  };

  const state = {
    loading: false,
    gameMode: 'offline-game',
    activeCards: [],
    currentIndex: 0,
    scores: [],
    finalTimer: 0,
    wordTickerTimer: 0,
    wordTickerEnglish: true,
    speakingStats: readSpeakingStats(),
    duel: {
      sessionId: readSessionId(),
      enabled: false,
      completed: false,
      completedRedirectTimer: 0,
      meFinished: false,
      mePercent: 0,
      rivalProgress: 0,
      rivalPercent: 0,
      rivalName: 'Adversário',
      meName: 'Você',
      meAvatar: '/Avatar/avatar-man-person-svgrepo-com.svg',
      rivalAvatar: '/Avatar/avatar-man-person-svgrepo-com.svg',
      pollTimer: 0,
      pingTimer: 0,
      introTimer: 0
    }
  };

  function safeText(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  function normalizeText(value) {
    return safeText(value)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s']/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function lettersOnly(value) {
    return normalizeText(value).replace(/[^a-z0-9]/g, '');
  }

  function readSessionId() {
    const params = new URLSearchParams(window.location.search || '');
    return safeText(params.get('session'));
  }

  function readLocalPlayerProfile() {
    try {
      const raw = JSON.parse(localStorage.getItem('playtalk_player_profile') || 'null');
      if (!raw || typeof raw !== 'object') return { username: '', avatar: '' };
      return {
        username: safeText(raw.username),
        avatar: safeText(raw.avatar || raw.avatarImage)
      };
    } catch (_error) {
      return { username: '', avatar: '' };
    }
  }

  function readCurrentPlayerIdentity() {
    let username = '';
    let avatar = '';
    if (window.playtalkPlayerState && typeof window.playtalkPlayerState.get === 'function') {
      const player = window.playtalkPlayerState.get() || {};
      username = safeText(player.username);
      avatar = safeText(player.avatar);
    }
    if (!username || !avatar) {
      const localProfile = readLocalPlayerProfile();
      username = username || localProfile.username;
      avatar = avatar || localProfile.avatar;
    }
    return {
      username: username || 'Você',
      avatar: avatar || '/Avatar/avatar-man-person-svgrepo-com.svg'
    };
  }

  function getOfflineAveragePercent() {
    if (!state.scores.length) return 0;
    const total = state.scores.reduce((acc, value) => acc + (Number(value) || 0), 0);
    return Math.max(0, Math.min(100, Math.round(total / state.scores.length)));
  }

  function applyOfflineIdentity() {
    const identity = readCurrentPlayerIdentity();
    state.duel.meName = identity.username;
    state.duel.meAvatar = identity.avatar;
    state.duel.rivalName = 'Adversário';
    state.duel.rivalAvatar = '/Avatar/avatar-man-person-svgrepo-com.svg';
  }

  function setGameMode(mode) {
    const normalized = mode === 'battle-mode' ? 'battle-mode' : 'offline-game';
    state.gameMode = normalized;
    if (els.game) {
      els.game.dataset.mode = normalized;
    }
    if (els.duelAvatarsWrap) {
      els.duelAvatarsWrap.classList.toggle('is-offline', normalized === 'offline-game');
    }
  }

  function buildApiUrl(path) {
    if (window.PlaytalkApi && typeof window.PlaytalkApi.url === 'function') {
      return window.PlaytalkApi.url(path);
    }
    return path;
  }

  function buildAuthHeaders(extraHeaders) {
    if (window.PlaytalkApi && typeof window.PlaytalkApi.authHeaders === 'function') {
      return window.PlaytalkApi.authHeaders(extraHeaders);
    }
    return { ...(extraHeaders || {}) };
  }

  function setHomeStatus(text, tone) {
    els.homeStatus.textContent = text || '';
    els.homeStatus.className = tone ? `status ${tone}` : 'status';
  }

  function setGameStatus(text, tone) {
    if (!els.gameStatus) return;
    els.gameStatus.textContent = text || '';
    els.gameStatus.className = tone ? `mic-trigger-feedback ${tone}` : 'mic-trigger-feedback';
  }

  function readSpeakingStats() {
    try {
      const raw = JSON.parse(localStorage.getItem(SPEAKING_STATS_KEY) || 'null');
      return {
        sum: Math.max(0, Number(raw?.sum) || 0),
        count: Math.max(0, Number(raw?.count) || 0),
        sessions: Math.max(0, Number(raw?.sessions) || 0)
      };
    } catch (_error) {
      return { sum: 0, count: 0, sessions: 0 };
    }
  }

  function saveSpeakingStats() {
    try {
      localStorage.setItem(SPEAKING_STATS_KEY, JSON.stringify(state.speakingStats));
    } catch (_error) {
      // ignore
    }
  }

  function setMicLiveVisual(active) {
    if (!els.sendSpeakingBtn) return;
    els.sendSpeakingBtn.classList.toggle('is-mic-live', Boolean(active));
  }

  function stopWordTicker() {
    if (state.wordTickerTimer) {
      window.clearInterval(state.wordTickerTimer);
      state.wordTickerTimer = 0;
    }
  }

  function animateWord(nextText) {
    if (!els.cardEnglishWord) return;
    els.cardEnglishWord.classList.remove('is-slide');
    void els.cardEnglishWord.offsetWidth;
    els.cardEnglishWord.textContent = nextText || '-';
    els.cardEnglishWord.classList.add('is-slide');
  }

  function startWordTicker(card) {
    stopWordTicker();
    const english = safeText(card?.english) || '-';
    const portuguese = safeText(card?.portuguese) || english;
    state.wordTickerEnglish = true;
    animateWord(english);
    state.wordTickerTimer = window.setInterval(() => {
      state.wordTickerEnglish = !state.wordTickerEnglish;
      animateWord(state.wordTickerEnglish ? english : portuguese);
    }, WORD_SWAP_MS);
  }

  function countLetterBlocksCoverage(expected, spoken) {
    const expectedRaw = lettersOnly(expected);
    const spokenRaw = lettersOnly(spoken);
    if (!expectedRaw || !spokenRaw) return 0;

    const ranges = [];
    for (let start = 0; start < expectedRaw.length; start += 1) {
      for (let end = start + 2; end <= expectedRaw.length; end += 1) {
        const fragment = expectedRaw.slice(start, end);
        if (fragment.length >= 2 && spokenRaw.includes(fragment)) {
          ranges.push({ start, end, len: end - start });
        }
      }
    }

    ranges.sort((a, b) => (b.len - a.len) || (a.start - b.start));
    const covered = Array(expectedRaw.length).fill(false);
    ranges.forEach((range) => {
      for (let i = range.start; i < range.end; i += 1) {
        if (covered[i]) return;
      }
      for (let i = range.start; i < range.end; i += 1) {
        covered[i] = true;
      }
    });

    return covered.filter(Boolean).length;
  }

  function calculateSpeechMatchPercent(expected, spoken) {
    const expectedRaw = lettersOnly(expected);
    if (!expectedRaw) return 0;
    const matched = countLetterBlocksCoverage(expected, spoken);
    return Math.max(0, Math.min(100, Math.round((matched / expectedRaw.length) * 100)));
  }

  function updateDuelAvatarRings() {
    const myPercent = state.duel.enabled
      ? Math.max(0, Math.min(100, Number(state.duel.mePercent) || 0))
      : getOfflineAveragePercent();
    const rivalPercent = state.duel.enabled ? Math.max(0, Math.min(100, Number(state.duel.rivalPercent) || 0)) : 0;

    if (els.mePronRing) els.mePronRing.style.setProperty('--percent', String(myPercent));
    if (els.enemyPronRing) els.enemyPronRing.style.setProperty('--percent', String(rivalPercent));
    if (els.meAvatarPercent) els.meAvatarPercent.textContent = `${myPercent}%`;
    if (els.enemyAvatarPercent) els.enemyAvatarPercent.textContent = `${rivalPercent}%`;
    if (els.meAvatarName) els.meAvatarName.textContent = state.duel.meName || 'Você';
    if (els.enemyAvatarName) els.enemyAvatarName.textContent = state.duel.rivalName || 'Adversário';
    if (els.meAvatar) els.meAvatar.src = state.duel.meAvatar || '/Avatar/avatar-man-person-svgrepo-com.svg';
    if (els.enemyAvatar) els.enemyAvatar.src = state.duel.rivalAvatar || '/Avatar/avatar-man-person-svgrepo-com.svg';
    if (els.duelIntroMeAvatar) els.duelIntroMeAvatar.src = state.duel.meAvatar || '/Avatar/avatar-man-person-svgrepo-com.svg';
    if (els.duelIntroEnemyAvatar) els.duelIntroEnemyAvatar.src = state.duel.rivalAvatar || '/Avatar/avatar-man-person-svgrepo-com.svg';
    if (els.duelIntroMeName) els.duelIntroMeName.textContent = state.duel.meName || 'Você';
    if (els.duelIntroEnemyName) els.duelIntroEnemyName.textContent = state.duel.rivalName || 'Adversário';
  }

  function clearDuelIntroTimer() {
    if (state.duel.introTimer) {
      window.clearTimeout(state.duel.introTimer);
      state.duel.introTimer = 0;
    }
  }

  function stopBattleIntroAudio() {
    if (!els.battleIntroAudio) return;
    try {
      els.battleIntroAudio.pause();
      els.battleIntroAudio.currentTime = 0;
    } catch (_error) {
      // ignore
    }
  }

  async function playBattleIntroAudio() {
    if (!els.battleIntroAudio) return;
    try {
      els.battleIntroAudio.currentTime = 0;
      await els.battleIntroAudio.play();
    } catch (_error) {
      // ignore autoplay restrictions
    }
  }

  function resetDuelIntroPlayersVisual() {
    if (els.duelIntroMePlayer) els.duelIntroMePlayer.classList.remove('is-entered');
    if (els.duelIntroEnemyPlayer) els.duelIntroEnemyPlayer.classList.remove('is-entered');
    if (els.duelIntroMeAvatar) els.duelIntroMeAvatar.classList.remove('is-flash');
    if (els.duelIntroEnemyAvatar) els.duelIntroEnemyAvatar.classList.remove('is-flash');
  }

  function animateDuelIntroEntry(playerEl, avatarEl) {
    if (playerEl) {
      playerEl.classList.remove('is-entered');
      void playerEl.offsetWidth;
      playerEl.classList.add('is-entered');
    }
    if (avatarEl) {
      avatarEl.classList.remove('is-flash');
      void avatarEl.offsetWidth;
      avatarEl.classList.add('is-flash');
    }
  }

  function setDuelIntroVisible(visible) {
    const isVisible = Boolean(visible);
    if (els.duelIntro) {
      els.duelIntro.hidden = !isVisible;
      els.duelIntro.classList.toggle('is-visible', isVisible);
    }
    if (els.game) {
      els.game.classList.toggle('is-prestart', isVisible);
    }
    if (els.sendSpeakingBtn) {
      els.sendSpeakingBtn.disabled = isVisible || state.duel.meFinished;
    }
  }

  function waitMs(durationMs) {
    return new Promise((resolve) => {
      clearDuelIntroTimer();
      state.duel.introTimer = window.setTimeout(() => {
        state.duel.introTimer = 0;
        resolve();
      }, Math.max(0, Number(durationMs) || 0));
    });
  }

  async function runDuelIntroCountdown() {
    if (!state.duel.enabled) return;
    setDuelIntroVisible(true);
    updateTopPercents();
    resetDuelIntroPlayersVisual();
    void playBattleIntroAudio();
    animateDuelIntroEntry(els.duelIntroMePlayer, els.duelIntroMeAvatar);

    for (let remaining = DUEL_INTRO_COUNTDOWN_SECONDS; remaining >= 1; remaining -= 1) {
      if (!state.duel.enabled || state.duel.completed) break;
      if (remaining === DUEL_INTRO_COUNTDOWN_SECONDS - 1) {
        animateDuelIntroEntry(els.duelIntroEnemyPlayer, els.duelIntroEnemyAvatar);
      }
      if (els.duelIntroCountdown) {
        els.duelIntroCountdown.textContent = `O desafio vai começar em ${remaining}...`;
      }
      await waitMs(1000);
    }
    if (!state.duel.enabled || state.duel.completed) {
      stopBattleIntroAudio();
      setDuelIntroVisible(false);
      return;
    }
    if (els.duelIntroCountdown) {
      els.duelIntroCountdown.textContent = 'Valendo!';
    }
    await waitMs(500);
    stopBattleIntroAudio();
    setDuelIntroVisible(false);
  }

  function updateTopPercents() {
    const isBattleMode = state.gameMode === 'battle-mode';
    if (isBattleMode) {
      if (els.speakingPercent) els.speakingPercent.textContent = '';
      if (els.enemySpeakingPercent) els.enemySpeakingPercent.textContent = '';
      if (els.enemyProgressWrap) els.enemyProgressWrap.hidden = false;
      if (els.duelAvatarsWrap) els.duelAvatarsWrap.hidden = false;
    } else {
      const offlinePercent = getOfflineAveragePercent();
      if (els.speakingPercent) els.speakingPercent.textContent = `Speaking ${offlinePercent}%`;
      if (els.enemySpeakingPercent) els.enemySpeakingPercent.textContent = '';
      if (els.enemyProgressWrap) els.enemyProgressWrap.hidden = true;
      if (els.duelAvatarsWrap) els.duelAvatarsWrap.hidden = false;
    }
    updateDuelAvatarRings();
  }

  function updateProgressBars() {
    const total = Math.max(1, state.activeCards.length);
    const completed = Math.min(state.currentIndex, total);
    if (els.gameProgressBar) {
      els.gameProgressBar.style.width = `${((completed / total) * 100).toFixed(2)}%`;
    }
    if (state.duel.enabled) {
      const rivalCompleted = Math.min(state.duel.rivalProgress, total);
      if (els.enemyProgressBar) {
        els.enemyProgressBar.style.width = `${((rivalCompleted / total) * 100).toFixed(2)}%`;
      }
    }
  }

  function renderCard() {
    const total = state.activeCards.length;
    if (!total || state.currentIndex >= total) {
      finishGame();
      return;
    }
    const card = state.activeCards[state.currentIndex];
    startWordTicker(card);
    if (els.cardPortugueseWord) els.cardPortugueseWord.textContent = '';
    if (!state.duel.enabled) {
      setGameStatus('', '');
    }
  }

  async function loadSinglePlayerCards(count) {
    const response = await fetch(buildApiUrl(`/api/speaking/cards?count=${encodeURIComponent(String(count))}`), {
      credentials: 'include',
      cache: 'no-store',
      headers: buildAuthHeaders()
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.success || !Array.isArray(payload.cards) || !payload.cards.length) {
      throw new Error(payload?.message || 'Não foi possível carregar as cartas de speaking.');
    }
    return payload.cards;
  }

  async function pingPresence() {
    try {
      await fetch(buildApiUrl('/api/speaking/presence/ping'), {
        method: 'POST',
        credentials: 'include',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        body: '{}'
      });
    } catch (_error) {
      // ignore
    }
  }

  async function fetchDuelSession() {
    const response = await fetch(buildApiUrl(`/api/speaking/sessions/${encodeURIComponent(state.duel.sessionId)}`), {
      credentials: 'include',
      cache: 'no-store',
      headers: buildAuthHeaders()
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.success || !payload?.session) {
      throw new Error(payload?.message || 'Não consegui carregar a sessão do duelo.');
    }
    return payload.session;
  }

  function syncDuelView(session) {
    const meRole = safeText(session?.meRole);
    const isChallenger = meRole === 'challenger';
    const me = isChallenger ? session?.challenger : session?.opponent;
    const rival = isChallenger ? session?.opponent : session?.challenger;
    state.duel.meName = safeText(me?.username || 'Você') || 'Você';
    state.duel.meAvatar = safeText(me?.avatarImage || '/Avatar/avatar-man-person-svgrepo-com.svg') || '/Avatar/avatar-man-person-svgrepo-com.svg';
    state.duel.rivalName = safeText(rival?.username || 'Adversário') || 'Adversário';
    state.duel.rivalAvatar = safeText(rival?.avatarImage || '/Avatar/avatar-man-person-svgrepo-com.svg') || '/Avatar/avatar-man-person-svgrepo-com.svg';
    state.duel.mePercent = Math.max(0, Number(session?.mePercent) || 0);
    state.duel.rivalProgress = Math.max(0, Number(session?.rivalProgress) || 0);
    state.duel.rivalPercent = Math.max(0, Number(session?.rivalPercent) || 0);
    state.duel.meFinished = Boolean(session?.meFinished);
    updateTopPercents();
    updateProgressBars();

    if (safeText(session?.status) === 'completed' && !state.duel.completed) {
      state.duel.completed = true;
      showWinnerReveal(session?.winner);
      scheduleDuelReturnToUsers();
    }
  }

  function showWinnerReveal(winner) {
    if (!els.game) return;
    const avatarImage = safeText(winner?.avatarImage || '/Avatar/avatar-man-person-svgrepo-com.svg') || '/Avatar/avatar-man-person-svgrepo-com.svg';
    if (els.winnerRevealAvatar) {
      els.winnerRevealAvatar.src = avatarImage;
    }
    if (els.winnerReveal) {
      els.winnerReveal.hidden = false;
      els.winnerReveal.classList.add('is-visible');
    }
    els.game.classList.add('is-winner');
  }

  function stopDuelLoops() {
    if (state.duel.pollTimer) {
      window.clearInterval(state.duel.pollTimer);
      state.duel.pollTimer = 0;
    }
    if (state.duel.pingTimer) {
      window.clearInterval(state.duel.pingTimer);
      state.duel.pingTimer = 0;
    }
  }

  function resetSpeakingToOfflineMode() {
    stopDuelLoops();
    clearDuelIntroTimer();
    stopBattleIntroAudio();
    stopWordTicker();
    state.duel.enabled = false;
    state.duel.sessionId = '';
    state.duel.completed = false;
    if (state.duel.completedRedirectTimer) {
      window.clearTimeout(state.duel.completedRedirectTimer);
      state.duel.completedRedirectTimer = 0;
    }
    state.duel.meFinished = false;
    state.duel.mePercent = 0;
    state.duel.rivalProgress = 0;
    state.duel.rivalPercent = 0;
    state.activeCards = [];
    state.currentIndex = 0;
    state.scores = [];
    setGameMode('offline-game');
    applyOfflineIdentity();
    if (els.winnerReveal) {
      els.winnerReveal.hidden = true;
      els.winnerReveal.classList.remove('is-visible');
    }
    if (els.game) els.game.classList.remove('is-winner');
    if (els.finalResultBox) els.finalResultBox.classList.remove('is-visible');
    if (els.winnerCard) els.winnerCard.classList.remove('is-visible');
    if (els.game) els.game.classList.remove('is-active');
    if (els.home) els.home.hidden = false;
    if (els.startSpeakingBtn) els.startSpeakingBtn.disabled = false;
    if (els.sendSpeakingBtn) els.sendSpeakingBtn.disabled = false;
    setMicLiveVisual(false);
    setDuelIntroVisible(false);
    setHomeStatus('Escolha quantas cartas você quer jogar.', '');
    updateTopPercents();
    updateProgressBars();
  }

  function scheduleDuelReturnToUsers() {
    if (state.duel.completedRedirectTimer) return;
    state.duel.completedRedirectTimer = window.setTimeout(() => {
      resetSpeakingToOfflineMode();
      window.location.replace('/users');
    }, DUEL_WINNER_DURATION_MS);
  }

  async function syncDuelProgress(forceFinished) {
    if (!state.duel.enabled || !state.duel.sessionId) return;
    const total = Math.max(1, state.activeCards.length);
    const completed = Math.min(state.currentIndex, total);
    const sessionAvg = Math.max(0, Math.min(100, Number(state.duel.mePercent) || 0));
    try {
      await fetch(buildApiUrl(`/api/speaking/sessions/${encodeURIComponent(state.duel.sessionId)}/progress`), {
        method: 'POST',
        credentials: 'include',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          progress: completed,
          percent: sessionAvg,
          finished: Boolean(forceFinished)
        })
      });
    } catch (_error) {
      // ignore
    }
  }

  async function pollDuelSession() {
    if (!state.duel.enabled || !state.duel.sessionId) return;
    try {
      const session = await fetchDuelSession();
      syncDuelView(session);
    } catch (_error) {
      // ignore
    }
  }

  function startDuelLoops() {
    stopDuelLoops();
    state.duel.pollTimer = window.setInterval(() => {
      void pollDuelSession();
    }, DUEL_POLL_MS);
    state.duel.pingTimer = window.setInterval(() => {
      void pingPresence();
    }, PRESENCE_PING_MS);
  }

  async function playSuccessSound() {
    if (!els.successAudio) return;
    try {
      els.successAudio.currentTime = 0;
      await els.successAudio.play();
    } catch (_error) {
      // ignore
    }
  }

  function mapWebSpeechError(errorCode) {
    const code = String(errorCode || '').toLowerCase();
    if (code === 'not-allowed' || code === 'service-not-allowed') {
      return 'Permissão de microfone negada.';
    }
    if (code === 'audio-capture') {
      return 'Nenhum microfone disponível.';
    }
    if (code === 'network') {
      return 'Falha de rede no reconhecimento de voz.';
    }
    if (code === 'no-speech') {
      return 'Não detectei sua fala. Tente novamente.';
    }
    return 'Falha no reconhecimento de voz.';
  }

  function captureSpeechWithWebSpeech(options = {}) {
    const RecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (typeof RecognitionCtor !== 'function') {
      return Promise.reject(new Error('Reconhecimento de voz não disponível neste navegador.'));
    }

    const language = safeText(options.language) || 'en-US';
    const maxDurationMs = Number.isFinite(options.maxDurationMs)
      ? Math.max(1500, Number(options.maxDurationMs))
      : 7000;

    return new Promise((resolve, reject) => {
      const recognition = new RecognitionCtor();
      let finished = false;
      let stopTimer = 0;

      const finish = (handler) => {
        if (finished) return;
        finished = true;
        if (stopTimer) {
          window.clearTimeout(stopTimer);
          stopTimer = 0;
        }
        try {
          recognition.onstart = null;
          recognition.onresult = null;
          recognition.onerror = null;
          recognition.onend = null;
        } catch (_error) {
          // ignore
        }
        handler();
      };

      recognition.lang = language;
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 5;

      recognition.onstart = () => {
        if (typeof options.onRecordingStart === 'function') {
          try {
            options.onRecordingStart();
          } catch (_error) {
            // ignore
          }
        }
      };

      recognition.onresult = (event) => {
        const transcript = safeText(event?.results?.[0]?.[0]?.transcript || '');
        finish(() => {
          if (typeof options.onRecordingStop === 'function') {
            try {
              options.onRecordingStop();
            } catch (_error) {
              // ignore
            }
          }
          if (!transcript) {
            reject(new Error('Transcrição vazia.'));
            return;
          }
          resolve(transcript);
        });
      };

      recognition.onerror = (event) => {
        const message = mapWebSpeechError(event?.error);
        finish(() => {
          if (typeof options.onRecordingStop === 'function') {
            try {
              options.onRecordingStop();
            } catch (_error) {
              // ignore
            }
          }
          reject(new Error(message));
        });
      };

      recognition.onend = () => {
        if (!finished) {
          finish(() => {
            if (typeof options.onRecordingStop === 'function') {
              try {
                options.onRecordingStop();
              } catch (_error) {
                // ignore
              }
            }
            reject(new Error('Reconhecimento finalizado sem resultado.'));
          });
        }
      };

      stopTimer = window.setTimeout(() => {
        try {
          recognition.stop();
        } catch (_error) {
          // ignore
        }
      }, maxDurationMs);

      try {
        recognition.start();
      } catch (_error) {
        finish(() => {
          if (typeof options.onRecordingStop === 'function') {
            try {
              options.onRecordingStop();
            } catch (__error) {
              // ignore
            }
          }
          reject(new Error('Não foi possível iniciar o reconhecimento de voz.'));
        });
      }
    });
  }

  async function captureSpeechFast(language) {
    const nativeSpeech = window.PlaytalkNativeSpeech;
    if (nativeSpeech && typeof nativeSpeech.isSupported === 'function' && nativeSpeech.isSupported()) {
      const granted = typeof nativeSpeech.ensurePermissions === 'function'
        ? await nativeSpeech.ensurePermissions()
        : true;
      if (granted && typeof nativeSpeech.captureOnce === 'function') {
        return nativeSpeech.captureOnce({
          language: language || 'en-US',
          maxResults: 5,
          maxDurationMs: 7000
        });
      }
    }

    return captureSpeechWithWebSpeech({
      language: language || 'en-US',
      maxDurationMs: 7000,
      onRecordingStart: () => setMicLiveVisual(true),
      onRecordingStop: () => setMicLiveVisual(true)
    });
  }

  async function handleSendSpeaking() {
    if (!state.activeCards.length || state.duel.meFinished) return;
    const card = state.activeCards[state.currentIndex];
    if (!card) return;
    if (els.sendSpeakingBtn) els.sendSpeakingBtn.disabled = true;
    setMicLiveVisual(true);
    setGameStatus('', '');

    try {
      const transcript = safeText(await captureSpeechFast('en-US'));
      const score = calculateSpeechMatchPercent(card.english, transcript);
      await playSuccessSound();
      const previousCount = Math.max(0, Number(state.currentIndex) || 0);
      state.scores.push(score);
      state.currentIndex += 1;
      const nextCount = previousCount + 1;
      const weighted = ((Number(state.duel.mePercent) || 0) * previousCount) + score;
      state.duel.mePercent = nextCount > 0 ? Math.round(weighted / nextCount) : score;
      updateTopPercents();
      updateProgressBars();
      await syncDuelProgress(false);
      window.setTimeout(renderCard, 220);
    } catch (error) {
      setGameStatus(error?.message || '', 'is-error');
    } finally {
      if (els.sendSpeakingBtn) els.sendSpeakingBtn.disabled = false;
      setMicLiveVisual(false);
    }
  }

  function finishGame() {
    const sessionCount = state.scores.length;
    const sessionSum = state.scores.reduce((acc, value) => acc + value, 0);
    const finalPercent = sessionCount ? Math.round(sessionSum / sessionCount) : 0;

    if (!state.duel.enabled) {
      state.speakingStats.sum += sessionSum;
      state.speakingStats.count += sessionCount;
      state.speakingStats.sessions += 1;
      saveSpeakingStats();
    } else {
      state.duel.mePercent = finalPercent;
    }

    updateTopPercents();
    if (els.finalResultBox) {
      els.finalResultBox.textContent = `${finalPercent}% seu resultado final`;
      els.finalResultBox.classList.add('is-visible');
    }
    if (els.sendSpeakingBtn) els.sendSpeakingBtn.disabled = true;
    setMicLiveVisual(false);
    void syncDuelProgress(true);

    if (state.duel.enabled) {
      state.duel.meFinished = true;
      setGameStatus('', '');
      return;
    }

    setGameStatus('', '');
    if (state.finalTimer) {
      window.clearTimeout(state.finalTimer);
      state.finalTimer = 0;
    }
    state.finalTimer = window.setTimeout(() => {
      if (els.finalResultBox) els.finalResultBox.classList.remove('is-visible');
      if (els.game) els.game.classList.remove('is-active');
      if (els.home) els.home.hidden = false;
      if (els.startSpeakingBtn) els.startSpeakingBtn.disabled = false;
      if (els.sendSpeakingBtn) els.sendSpeakingBtn.disabled = false;
      setMicLiveVisual(false);
      setHomeStatus('Sessão finalizada. Escolha outra quantidade e jogue de novo.', '');
      setGameStatus('', '');
      stopWordTicker();
      state.activeCards = [];
      state.currentIndex = 0;
      state.scores = [];
      updateProgressBars();
      updateTopPercents();
    }, FINAL_BOX_DURATION_MS);
  }

  async function startSinglePlayer() {
    if (state.loading) return;
    state.loading = true;
    if (els.startSpeakingBtn) els.startSpeakingBtn.disabled = true;
    setHomeStatus('Carregando cartas...', '');
    try {
      const selectedCount = Math.max(1, Number.parseInt(els.cardCountSelect?.value, 10) || 10);
      state.activeCards = await loadSinglePlayerCards(selectedCount);
      state.currentIndex = 0;
      state.scores = [];
      state.duel.enabled = false;
      state.duel.mePercent = 0;
      state.duel.rivalPercent = 0;
      setGameMode('offline-game');
      applyOfflineIdentity();
      if (els.home) els.home.hidden = true;
      if (els.game) els.game.classList.add('is-active');
      if (els.finalResultBox) els.finalResultBox.classList.remove('is-visible');
      if (els.winnerCard) els.winnerCard.classList.remove('is-visible');
      updateTopPercents();
      updateProgressBars();
      setHomeStatus('', '');
      renderCard();
    } catch (error) {
      setHomeStatus(error?.message || 'Não foi possível iniciar speaking.', 'is-error');
      if (els.startSpeakingBtn) els.startSpeakingBtn.disabled = false;
    } finally {
      state.loading = false;
    }
  }

  async function startDuelMode() {
    setGameMode('battle-mode');
    state.duel.enabled = true;
    state.duel.completed = false;
    if (els.home) els.home.hidden = true;
    if (els.game) els.game.classList.add('is-active');
    if (els.finalResultBox) els.finalResultBox.classList.remove('is-visible');
    if (els.winnerCard) els.winnerCard.classList.remove('is-visible');
    if (els.winnerReveal) {
      els.winnerReveal.hidden = true;
      els.winnerReveal.classList.remove('is-visible');
    }
    if (els.game) els.game.classList.remove('is-winner');
    setGameStatus('', '');
    await pingPresence();
    const session = await fetchDuelSession();
    state.activeCards = Array.isArray(session.cards) ? session.cards : [];
    state.currentIndex = Math.max(0, Number(session.meProgress) || 0);
    state.scores = [];
    syncDuelView(session);
    if (state.duel.completed) {
      startDuelLoops();
      return;
    }
    await runDuelIntroCountdown();
    if (state.duel.completed) {
      startDuelLoops();
      return;
    }
    renderCard();
    startDuelLoops();
  }

  function bindEvents() {
    els.startSpeakingBtn?.addEventListener('click', () => {
      void startSinglePlayer();
    });
    els.sendSpeakingBtn?.addEventListener('click', () => {
      void handleSendSpeaking();
    });
    window.addEventListener('beforeunload', () => {
      stopDuelLoops();
      clearDuelIntroTimer();
      stopBattleIntroAudio();
      stopWordTicker();
    });
  }

  async function init() {
    bindEvents();
    setGameMode(state.duel.sessionId ? 'battle-mode' : 'offline-game');
    applyOfflineIdentity();
    updateTopPercents();
    updateProgressBars();
    setMicLiveVisual(false);
    if (state.duel.sessionId) {
      try {
        await startDuelMode();
      } catch (error) {
        setHomeStatus(error?.message || 'Não foi possível abrir a sessão de duelo.', 'is-error');
        if (els.home) els.home.hidden = false;
        if (els.game) els.game.classList.remove('is-active');
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      void init();
    }, { once: true });
  } else {
    void init();
  }
})();

