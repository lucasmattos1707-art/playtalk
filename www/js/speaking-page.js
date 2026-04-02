(function initPlaytalkSpeakingPage() {
  const SPEAKING_STATS_KEY = 'playtalk-speaking-general-v1';
  const FINAL_BOX_DURATION_MS = 10000;
  const DUEL_POLL_MS = 2000;
  const PRESENCE_PING_MS = 15000;
  const WORD_SWAP_MS = 1000;

  const els = {
    home: document.getElementById('speakingHome'),
    game: document.getElementById('speakingGame'),
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
    successAudio: document.getElementById('successAudio')
  };

  const state = {
    loading: false,
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
      rivalName: 'Adversario',
      meName: 'Voce',
      meAvatar: '/Avatar/avatar-man-person-svgrepo-com.svg',
      rivalAvatar: '/Avatar/avatar-man-person-svgrepo-com.svg',
      pollTimer: 0,
      pingTimer: 0
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
    els.gameStatus.textContent = text || '';
    els.gameStatus.className = tone ? `status ${tone}` : 'status';
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
    els.sendSpeakingBtn.textContent = active ? 'Fale agora' : 'Ligar microfone';
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
    const myPercent = state.duel.enabled ? Math.max(0, Math.min(100, Number(state.duel.mePercent) || 0)) : 0;
    const rivalPercent = state.duel.enabled ? Math.max(0, Math.min(100, Number(state.duel.rivalPercent) || 0)) : 0;

    if (els.mePronRing) els.mePronRing.style.setProperty('--percent', String(myPercent));
    if (els.enemyPronRing) els.enemyPronRing.style.setProperty('--percent', String(rivalPercent));
    if (els.meAvatarPercent) els.meAvatarPercent.textContent = `${myPercent}%`;
    if (els.enemyAvatarPercent) els.enemyAvatarPercent.textContent = `${rivalPercent}%`;
    if (els.meAvatarName) els.meAvatarName.textContent = state.duel.meName || 'Voce';
    if (els.enemyAvatarName) els.enemyAvatarName.textContent = state.duel.rivalName || 'Adversario';
    if (els.meAvatar) els.meAvatar.src = state.duel.meAvatar || '/Avatar/avatar-man-person-svgrepo-com.svg';
    if (els.enemyAvatar) els.enemyAvatar.src = state.duel.rivalAvatar || '/Avatar/avatar-man-person-svgrepo-com.svg';
  }

  function updateTopPercents() {
    if (state.duel.enabled) {
      if (els.speakingPercent) els.speakingPercent.textContent = '';
      if (els.enemySpeakingPercent) els.enemySpeakingPercent.textContent = '';
      if (els.enemyProgressWrap) els.enemyProgressWrap.hidden = false;
      if (els.duelAvatarsWrap) els.duelAvatarsWrap.hidden = false;
    } else {
      if (els.speakingPercent) els.speakingPercent.textContent = '';
      if (els.enemySpeakingPercent) els.enemySpeakingPercent.textContent = '';
      if (els.enemyProgressWrap) els.enemyProgressWrap.hidden = true;
      if (els.duelAvatarsWrap) els.duelAvatarsWrap.hidden = true;
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
      if (els.progressLabel) {
        els.progressLabel.textContent = `Voce ${completed}/${total} • Rival ${rivalCompleted}/${total}`;
      }
    } else if (els.progressLabel) {
      els.progressLabel.textContent = `${completed}/${total} concluidas`;
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
      throw new Error(payload?.message || 'Nao foi possivel carregar as cartas de speaking.');
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
      throw new Error(payload?.message || 'Nao consegui carregar a sessao do duelo.');
    }
    return payload.session;
  }

  function syncDuelView(session) {
    const meRole = safeText(session?.meRole);
    const isChallenger = meRole === 'challenger';
    const me = isChallenger ? session?.challenger : session?.opponent;
    const rival = isChallenger ? session?.opponent : session?.challenger;
    state.duel.meName = safeText(me?.username || 'Voce') || 'Voce';
    state.duel.meAvatar = safeText(me?.avatarImage || '/Avatar/avatar-man-person-svgrepo-com.svg') || '/Avatar/avatar-man-person-svgrepo-com.svg';
    state.duel.rivalName = safeText(rival?.username || 'Adversario') || 'Adversario';
    state.duel.rivalAvatar = safeText(rival?.avatarImage || '/Avatar/avatar-man-person-svgrepo-com.svg') || '/Avatar/avatar-man-person-svgrepo-com.svg';
    state.duel.mePercent = Math.max(0, Number(session?.mePercent) || 0);
    state.duel.rivalProgress = Math.max(0, Number(session?.rivalProgress) || 0);
    state.duel.rivalPercent = Math.max(0, Number(session?.rivalPercent) || 0);
    state.duel.meFinished = Boolean(session?.meFinished);
    updateTopPercents();
    updateProgressBars();

    if (session?.winner?.userId) {
      if (els.winnerName) els.winnerName.textContent = `Vencedor ${session.winner.username || 'Usuario'}`;
      if (els.winnerAvatar) els.winnerAvatar.src = session.winner.avatarImage || '/Avatar/avatar-man-person-svgrepo-com.svg';
      if (els.winnerCard) els.winnerCard.classList.add('is-visible');
    }

    if (safeText(session?.status) === 'completed' && !state.duel.completed) {
      state.duel.completed = true;
      scheduleDuelReturnToUsers();
    }
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
    if (els.finalResultBox) els.finalResultBox.classList.remove('is-visible');
    if (els.winnerCard) els.winnerCard.classList.remove('is-visible');
    if (els.game) els.game.classList.remove('is-active');
    if (els.home) els.home.hidden = false;
    if (els.startSpeakingBtn) els.startSpeakingBtn.disabled = false;
    if (els.sendSpeakingBtn) els.sendSpeakingBtn.disabled = false;
    setMicLiveVisual(false);
    setHomeStatus('Escolha quantas cartas voce quer jogar.', '');
    setGameStatus('', '');
    updateTopPercents();
    updateProgressBars();
  }

  function scheduleDuelReturnToUsers() {
    if (state.duel.completedRedirectTimer) return;
    setGameStatus('Batalha encerrada. Voltando para usuarios em 10 segundos...', 'is-score');
    state.duel.completedRedirectTimer = window.setTimeout(() => {
      resetSpeakingToOfflineMode();
      window.location.replace('/users');
    }, FINAL_BOX_DURATION_MS);
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

    const openAiStt = window.PlaytalkOpenAiStt;
    if (!openAiStt || typeof openAiStt.captureAndTranscribe !== 'function') {
      throw new Error('Reconhecimento de voz nao disponivel neste dispositivo.');
    }

    return openAiStt.captureAndTranscribe({
      language: 'en',
      maxDurationMs: 3200,
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
      if (state.duel.enabled) {
        const nextCount = previousCount + 1;
        const weighted = ((Number(state.duel.mePercent) || 0) * previousCount) + score;
        state.duel.mePercent = nextCount > 0 ? Math.round(weighted / nextCount) : score;
      }
      updateTopPercents();
      updateProgressBars();
      await syncDuelProgress(false);
      window.setTimeout(renderCard, 220);
    } catch (error) {
      setGameStatus(error?.message || 'Falha no envio de speaking.', 'is-error');
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
      setGameStatus('Voce concluiu suas cartas. Aguardando resultado final...', 'is-score');
      return;
    }

    setGameStatus('Sessao concluida. Resultado final exibido por 10 segundos.', 'is-score');
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
      setHomeStatus('Sessao finalizada. Escolha outra quantidade e jogue de novo.', '');
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
      state.duel.meName = 'Voce';
      state.duel.rivalName = 'Adversario';
      if (els.home) els.home.hidden = true;
      if (els.game) els.game.classList.add('is-active');
      if (els.finalResultBox) els.finalResultBox.classList.remove('is-visible');
      if (els.winnerCard) els.winnerCard.classList.remove('is-visible');
      updateTopPercents();
      updateProgressBars();
      setHomeStatus('', '');
      renderCard();
    } catch (error) {
      setHomeStatus(error?.message || 'Nao foi possivel iniciar speaking.', 'is-error');
      if (els.startSpeakingBtn) els.startSpeakingBtn.disabled = false;
    } finally {
      state.loading = false;
    }
  }

  async function startDuelMode() {
    state.duel.enabled = true;
    state.duel.completed = false;
    if (els.home) els.home.hidden = true;
    if (els.game) els.game.classList.add('is-active');
    if (els.finalResultBox) els.finalResultBox.classList.remove('is-visible');
    if (els.winnerCard) els.winnerCard.classList.remove('is-visible');
    setGameStatus('Carregando duelo...', '');
    await pingPresence();
    const session = await fetchDuelSession();
    state.activeCards = Array.isArray(session.cards) ? session.cards : [];
    state.currentIndex = Math.max(0, Number(session.meProgress) || 0);
    state.scores = [];
    syncDuelView(session);
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
      stopWordTicker();
    });
  }

  async function init() {
    bindEvents();
    updateTopPercents();
    updateProgressBars();
    setMicLiveVisual(false);
    if (state.duel.sessionId) {
      try {
        await startDuelMode();
      } catch (error) {
        setHomeStatus(error?.message || 'Nao foi possivel abrir a sessao de duelo.', 'is-error');
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
