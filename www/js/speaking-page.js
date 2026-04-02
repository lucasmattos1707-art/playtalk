(function initPlaytalkSpeakingPage() {
  const SPEAKING_STATS_KEY = 'playtalk-speaking-general-v1';
  const FINAL_BOX_DURATION_MS = 10000;
  const DUEL_POLL_MS = 2000;
  const PRESENCE_PING_MS = 15000;

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
    cardImageWrap: document.getElementById('cardImageWrap'),
    cardEnglishWord: document.getElementById('cardEnglishWord'),
    cardPortugueseWord: document.getElementById('cardPortugueseWord'),
    listenCardBtn: document.getElementById('listenCardBtn'),
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
    speakingStats: readSpeakingStats(),
    duel: {
      sessionId: readSessionId(),
      enabled: false,
      meFinished: false,
      rivalProgress: 0,
      rivalPercent: 0,
      rivalGeneralPercent: 0,
      rivalName: 'Adversario',
      pollTimer: 0,
      pingTimer: 0
    }
  };

  function safeText(value) {
    return typeof value === 'string' ? value.trim() : '';
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

  function normalizeText(value) {
    return safeText(value)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s']/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function expandEnglishSpeechContractions(value) {
    return String(value || '')
      .replace(/\bi'm\b/g, 'i am')
      .replace(/\byou're\b/g, 'you are')
      .replace(/\bhe's\b/g, 'he is')
      .replace(/\bshe's\b/g, 'she is')
      .replace(/\bit's\b/g, 'it is')
      .replace(/\bwe're\b/g, 'we are')
      .replace(/\bthey're\b/g, 'they are')
      .replace(/\bcan't\b/g, 'cannot')
      .replace(/\bwon't\b/g, 'will not')
      .replace(/\bn't\b/g, ' not')
      .replace(/\b(\w+)'ll\b/g, '$1 will')
      .replace(/\b(\w+)'ve\b/g, '$1 have')
      .replace(/\b(\w+)'re\b/g, '$1 are')
      .replace(/\b(\w+)'d\b/g, '$1 would')
      .replace(/\b(\w+)'s\b/g, '$1 is')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function getSpeechComparisonCandidates(text) {
    const normalized = normalizeText(text);
    if (!normalized) return [];
    const variants = new Set([normalized, normalized.replace(/'/g, '').trim()]);
    const expanded = expandEnglishSpeechContractions(normalized);
    if (expanded) {
      variants.add(expanded);
      variants.add(expanded.replace(/'/g, '').trim());
    }
    return Array.from(variants).filter(Boolean);
  }

  function levenshteinDistance(a, b) {
    const left = String(a || '');
    const right = String(b || '');
    if (!left && !right) return 0;
    const rows = Array.from({ length: left.length + 1 }, () => Array(right.length + 1).fill(0));
    for (let i = 0; i <= left.length; i += 1) rows[i][0] = i;
    for (let j = 0; j <= right.length; j += 1) rows[0][j] = j;
    for (let i = 1; i <= left.length; i += 1) {
      for (let j = 1; j <= right.length; j += 1) {
        const cost = left[i - 1] === right[j - 1] ? 0 : 1;
        rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + cost);
      }
    }
    return rows[left.length][right.length];
  }

  function longestCommonSubstringLength(a, b) {
    if (!a || !b) return 0;
    const dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
    let maxLen = 0;
    for (let i = 1; i <= a.length; i += 1) {
      for (let j = 1; j <= b.length; j += 1) {
        if (a[i - 1] === b[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
          if (dp[i][j] > maxLen) maxLen = dp[i][j];
        }
      }
    }
    return maxLen;
  }

  function longestCommonWordSubsequenceLength(expectedWords, spokenWords) {
    if (!expectedWords.length || !spokenWords.length) return 0;
    const dp = Array.from({ length: expectedWords.length + 1 }, () => Array(spokenWords.length + 1).fill(0));
    for (let i = 1; i <= expectedWords.length; i += 1) {
      for (let j = 1; j <= spokenWords.length; j += 1) {
        if (expectedWords[i - 1] === spokenWords[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }
    return dp[expectedWords.length][spokenWords.length];
  }

  function calculateSpeechMatchPercent(expected, spoken) {
    const expectedCandidates = getSpeechComparisonCandidates(expected);
    const spokenCandidates = getSpeechComparisonCandidates(spoken);
    if (!expectedCandidates.length || !spokenCandidates.length) return 0;
    let best = 0;
    expectedCandidates.forEach((expectedCandidate) => {
      spokenCandidates.forEach((spokenCandidate) => {
        const substringPercent = (longestCommonSubstringLength(expectedCandidate, spokenCandidate) / Math.max(expectedCandidate.length, 1)) * 100;
        const expectedWords = expectedCandidate.split(' ').filter(Boolean);
        const spokenWords = spokenCandidate.split(' ').filter(Boolean);
        const wordLcs = longestCommonWordSubsequenceLength(expectedWords, spokenWords);
        const wordPercent = expectedWords.length ? (wordLcs / expectedWords.length) * 100 : 0;
        const maxLen = Math.max(expectedCandidate.length, spokenCandidate.length, 1);
        const editPercent = Math.max(0, (1 - (levenshteinDistance(expectedCandidate, spokenCandidate) / maxLen)) * 100);
        best = Math.max(best, substringPercent, wordPercent, editPercent);
      });
    });
    return Math.max(0, Math.min(100, Math.round(best)));
  }

  function updateTopPercents() {
    const sessionSum = state.scores.reduce((acc, value) => acc + value, 0);
    const sessionCount = state.scores.length;
    const totalSum = state.speakingStats.sum + sessionSum;
    const totalCount = state.speakingStats.count + sessionCount;
    const myPercent = totalCount > 0 ? Math.round(totalSum / totalCount) : 0;
    els.speakingPercent.textContent = `Speaking ${myPercent}%`;
    if (state.duel.enabled) {
      els.enemySpeakingPercent.textContent = `Speaking rival ${Math.round(state.duel.rivalGeneralPercent || state.duel.rivalPercent || 0)}%`;
      els.enemyProgressWrap.hidden = false;
    } else {
      els.enemySpeakingPercent.textContent = 'Modo: first-star';
      els.enemyProgressWrap.hidden = true;
    }
  }

  function updateProgressBars() {
    const total = Math.max(1, state.activeCards.length);
    const completed = Math.min(state.currentIndex, total);
    const myProgressPercent = (completed / total) * 100;
    els.gameProgressBar.style.width = `${myProgressPercent.toFixed(2)}%`;
    if (state.duel.enabled) {
      const rivalProgressPercent = (Math.min(state.duel.rivalProgress, total) / total) * 100;
      els.enemyProgressBar.style.width = `${rivalProgressPercent.toFixed(2)}%`;
      els.progressLabel.textContent = `Voce ${completed}/${total} • Rival ${Math.min(state.duel.rivalProgress, total)}/${total}`;
    } else {
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
    const imageUrl = safeText(card?.imageUrl);
    if (imageUrl) {
      els.cardImageWrap.innerHTML = `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(card?.english || 'Flashcard')}">`;
    } else {
      els.cardImageWrap.innerHTML = '<div class="card-fallback">Sem imagem nesta carta</div>';
    }
    els.cardEnglishWord.textContent = card?.english || '-';
    els.cardPortugueseWord.textContent = card?.portuguese || '';
    if (!state.duel.enabled) {
      setGameStatus(`Carta ${state.currentIndex + 1} de ${total}. Fale em ingles e envie.`, '');
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
    if (!state.duel.sessionId) return null;
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
    const rival = isChallenger ? session?.opponent : session?.challenger;
    state.duel.rivalName = safeText(rival?.username || 'Adversario') || 'Adversario';
    state.duel.rivalProgress = Math.max(0, Number(session?.rivalProgress) || 0);
    state.duel.rivalPercent = Math.max(0, Number(session?.rivalPercent) || 0);
    state.duel.rivalGeneralPercent = Math.max(0, Number(session?.rivalGeneralPercent) || 0);
    state.duel.meFinished = Boolean(session?.meFinished);
    updateTopPercents();
    updateProgressBars();

    if (session?.winner?.userId) {
      els.winnerName.textContent = `Vencedor ${session.winner.username || 'Usuario'}`;
      els.winnerAvatar.src = session.winner.avatarImage || '/Avatar/avatar-man-person-svgrepo-com.svg';
      els.winnerCard.classList.add('is-visible');
    }
  }

  async function syncDuelProgress(forceFinished) {
    if (!state.duel.enabled || !state.duel.sessionId) return;
    const total = Math.max(1, state.activeCards.length);
    const completed = Math.min(state.currentIndex, total);
    const sessionAvg = state.scores.length
      ? Math.round(state.scores.reduce((acc, value) => acc + value, 0) / state.scores.length)
      : 0;
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
      // ignore sync failures; polling reconciles
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
    if (state.duel.pollTimer) window.clearInterval(state.duel.pollTimer);
    if (state.duel.pingTimer) window.clearInterval(state.duel.pingTimer);
    state.duel.pollTimer = window.setInterval(() => {
      void pollDuelSession();
    }, DUEL_POLL_MS);
    state.duel.pingTimer = window.setInterval(() => {
      void pingPresence();
    }, PRESENCE_PING_MS);
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

  async function playSuccessSound() {
    const audio = els.successAudio;
    if (!audio) return;
    try {
      audio.currentTime = 0;
      await audio.play();
    } catch (_error) {
      // ignore
    }
  }

  async function handleListenCard() {
    const card = state.activeCards[state.currentIndex];
    const audioUrl = safeText(card?.audioUrl);
    if (!audioUrl) {
      setGameStatus('Essa carta nao possui audio.', 'is-error');
      return;
    }
    try {
      const audio = new Audio(audioUrl);
      await audio.play();
    } catch (_error) {
      setGameStatus('Nao foi possivel tocar o audio da carta.', 'is-error');
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
      onRecordingStart: () => setGameStatus('Ouvindo...', ''),
      onRecordingStop: () => setGameStatus('Analisando...', '')
    });
  }

  async function handleSendSpeaking() {
    if (!state.activeCards.length || state.duel.meFinished) return;
    const card = state.activeCards[state.currentIndex];
    if (!card) return;
    els.sendSpeakingBtn.disabled = true;
    els.listenCardBtn.disabled = true;
    setGameStatus('Ouvindo...', '');

    try {
      const transcript = safeText(await captureSpeechFast('en-US'));
      const score = calculateSpeechMatchPercent(card.english, transcript);
      await playSuccessSound();
      state.scores.push(score);
      state.currentIndex += 1;
      updateTopPercents();
      updateProgressBars();
      setGameStatus(`Pronuncia: ${score}%`, 'is-score');
      await syncDuelProgress(false);
      window.setTimeout(renderCard, 220);
    } catch (error) {
      setGameStatus(error?.message || 'Falha no envio de speaking.', 'is-error');
    } finally {
      els.sendSpeakingBtn.disabled = false;
      els.listenCardBtn.disabled = false;
    }
  }

  function finishGame() {
    const sessionCount = state.scores.length;
    const sessionSum = state.scores.reduce((acc, value) => acc + value, 0);
    const finalPercent = sessionCount ? Math.round(sessionSum / sessionCount) : 0;
    state.speakingStats.sum += sessionSum;
    state.speakingStats.count += sessionCount;
    state.speakingStats.sessions += 1;
    saveSpeakingStats();
    updateTopPercents();
    els.finalResultBox.textContent = `${finalPercent}% seu resultado final`;
    els.finalResultBox.classList.add('is-visible');
    els.listenCardBtn.disabled = true;
    els.sendSpeakingBtn.disabled = true;
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
      els.finalResultBox.classList.remove('is-visible');
      els.game.classList.remove('is-active');
      els.home.hidden = false;
      els.startSpeakingBtn.disabled = false;
      els.sendSpeakingBtn.disabled = false;
      els.listenCardBtn.disabled = false;
      setHomeStatus('Sessao finalizada. Escolha outra quantidade e jogue de novo.', '');
      setGameStatus('', '');
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
    els.startSpeakingBtn.disabled = true;
    setHomeStatus('Carregando cartas...', '');
    try {
      const selectedCount = Math.max(1, Number.parseInt(els.cardCountSelect.value, 10) || 10);
      state.activeCards = await loadSinglePlayerCards(selectedCount);
      state.currentIndex = 0;
      state.scores = [];
      state.duel.enabled = false;
      els.home.hidden = true;
      els.game.classList.add('is-active');
      els.finalResultBox.classList.remove('is-visible');
      els.winnerCard.classList.remove('is-visible');
      updateTopPercents();
      updateProgressBars();
      setHomeStatus('', '');
      renderCard();
    } catch (error) {
      setHomeStatus(error?.message || 'Nao foi possivel iniciar speaking.', 'is-error');
      els.startSpeakingBtn.disabled = false;
    } finally {
      state.loading = false;
    }
  }

  async function startDuelMode() {
    state.duel.enabled = true;
    els.home.hidden = true;
    els.game.classList.add('is-active');
    els.finalResultBox.classList.remove('is-visible');
    els.winnerCard.classList.remove('is-visible');
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

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function bindEvents() {
    els.startSpeakingBtn?.addEventListener('click', () => {
      void startSinglePlayer();
    });
    els.listenCardBtn?.addEventListener('click', () => {
      void handleListenCard();
    });
    els.sendSpeakingBtn?.addEventListener('click', () => {
      void handleSendSpeaking();
    });
    window.addEventListener('beforeunload', () => {
      stopDuelLoops();
    });
  }

  async function init() {
    bindEvents();
    updateTopPercents();
    updateProgressBars();
    if (state.duel.sessionId) {
      try {
        await startDuelMode();
      } catch (error) {
        setHomeStatus(error?.message || 'Nao foi possivel abrir a sessao de duelo.', 'is-error');
        els.home.hidden = false;
        els.game.classList.remove('is-active');
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
