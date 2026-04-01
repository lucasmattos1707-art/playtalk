(function initPlaytalkSpeakingPage() {
  const DATA_MANIFEST_REMOTE_PATH = '/api/flashcards/manifest';
  const FLASHCARDS_LOCAL_SOURCE_PREFIX = 'allcards';
  const SPEAKING_STATS_KEY = 'playtalk-speaking-general-v1';
  const FINAL_BOX_DURATION_MS = 10000;

  const els = {
    home: document.getElementById('speakingHome'),
    game: document.getElementById('speakingGame'),
    cardCountSelect: document.getElementById('cardCountSelect'),
    startSpeakingBtn: document.getElementById('startSpeakingBtn'),
    homeStatus: document.getElementById('homeStatus'),
    speakingPercent: document.getElementById('speakingPercent'),
    gameProgressBar: document.getElementById('gameProgressBar'),
    progressLabel: document.getElementById('progressLabel'),
    cardImageWrap: document.getElementById('cardImageWrap'),
    cardEnglishWord: document.getElementById('cardEnglishWord'),
    cardPortugueseWord: document.getElementById('cardPortugueseWord'),
    listenCardBtn: document.getElementById('listenCardBtn'),
    sendSpeakingBtn: document.getElementById('sendSpeakingBtn'),
    gameStatus: document.getElementById('gameStatus'),
    finalResultBox: document.getElementById('finalResultBox'),
    successAudio: document.getElementById('successAudio')
  };

  const state = {
    loading: false,
    allCards: [],
    activeCards: [],
    currentIndex: 0,
    scores: [],
    finalTimer: 0,
    speakingStats: readSpeakingStats()
  };

  function safeText(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  function buildApiUrl(path) {
    if (window.PlaytalkApi && typeof window.PlaytalkApi.url === 'function') {
      return window.PlaytalkApi.url(path);
    }
    return path;
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

  function calculateNormalizedSpeechMatchPercent(expected, spoken) {
    if (!expected) return 0;
    if (expected === spoken) return 100;
    const substringPercent = (longestCommonSubstringLength(expected, spoken) / Math.max(expected.length, 1)) * 100;
    const expectedWords = expected.split(' ').filter(Boolean);
    const spokenWords = spoken.split(' ').filter(Boolean);
    const wordLcs = longestCommonWordSubsequenceLength(expectedWords, spokenWords);
    const wordPercent = expectedWords.length ? (wordLcs / expectedWords.length) * 100 : 0;
    const maxLen = Math.max(expected.length, spoken.length, 1);
    const editPercent = Math.max(0, (1 - (levenshteinDistance(expected, spoken) / maxLen)) * 100);
    return Math.max(substringPercent, wordPercent, editPercent);
  }

  function calculateSpeechMatchPercent(expected, spoken) {
    const expectedCandidates = getSpeechComparisonCandidates(expected);
    const spokenCandidates = getSpeechComparisonCandidates(spoken);
    if (!expectedCandidates.length || !spokenCandidates.length) return 0;
    let best = 0;
    expectedCandidates.forEach((expectedCandidate) => {
      spokenCandidates.forEach((spokenCandidate) => {
        best = Math.max(best, calculateNormalizedSpeechMatchPercent(expectedCandidate, spokenCandidate));
      });
    });
    return Math.max(0, Math.min(100, Math.round(best)));
  }

  function updateSpeakingHeader() {
    const sessionSum = state.scores.reduce((acc, value) => acc + value, 0);
    const sessionCount = state.scores.length;
    const totalSum = state.speakingStats.sum + sessionSum;
    const totalCount = state.speakingStats.count + sessionCount;
    const percent = totalCount > 0 ? Math.round(totalSum / totalCount) : 0;
    els.speakingPercent.textContent = `Speaking ${percent}%`;
  }

  function updateProgress() {
    const total = Math.max(1, state.activeCards.length);
    const completed = Math.min(state.currentIndex, total);
    const progress = (completed / total) * 100;
    els.gameProgressBar.style.width = `${progress.toFixed(2)}%`;
    els.progressLabel.textContent = `${completed}/${total} concluidas`;
  }

  function shuffle(array) {
    const clone = array.slice();
    for (let i = clone.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = clone[i];
      clone[i] = clone[j];
      clone[j] = temp;
    }
    return clone;
  }

  function slug(value) {
    return normalizeText(value).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'card';
  }

  function flattenPayload(fileName, payload, options) {
    const title = safeText(payload?.title) || fileName.replace(/\.json$/i, '');
    const sourceKey = safeText(options?.sourceKey || fileName) || fileName;
    const idSource = safeText(options?.idSource || fileName) || fileName;
    const items = Array.isArray(payload) ? payload : (Array.isArray(payload?.items) ? payload.items : []);
    return items.map((item, index) => ({
      id: `${slug(idSource)}-${slug(title)}-${index}`,
      source: sourceKey,
      imageUrl: safeText(item?.imagem || item?.image),
      english: safeText(item?.nomeIngles || item?.english || item?.word),
      portuguese: safeText(item?.nomePortugues || item?.portuguese || item?.translation),
      audioUrl: safeText(item?.audio || item?.audioUrl)
    }));
  }

  function buildFlashcardsPublicUrl(objectKey) {
    const encodedKey = safeText(objectKey)
      .split('/')
      .filter(Boolean)
      .map((part) => encodeURIComponent(part))
      .join('/');
    return encodedKey ? `/${FLASHCARDS_LOCAL_SOURCE_PREFIX}/${encodedKey}` : '';
  }

  function isFlashcardsDeckPath(value) {
    const text = safeText(value);
    if (!text) return false;
    if (/^https?:\/\//i.test(text)) {
      try {
        const parsed = new URL(text);
        const parsedPath = decodeURIComponent(String(parsed.pathname || '')).replace(/^\/+/, '');
        return parsedPath.toLowerCase().endsWith('.json') && parsedPath.startsWith(`${FLASHCARDS_LOCAL_SOURCE_PREFIX}/`);
      } catch (_error) {
        return false;
      }
    }
    const normalized = text.replace(/^\/+/, '');
    return normalized.toLowerCase().endsWith('.json') && normalized.startsWith(`${FLASHCARDS_LOCAL_SOURCE_PREFIX}/`);
  }

  function resolveManifestDeckPath(file) {
    const fallbackName = safeText(file?.name) || safeText(file?.title) || 'deck.json';
    const candidates = [safeText(file?.path), safeText(file?.source), safeText(file?.name)].filter(Boolean);
    for (const candidate of candidates) {
      if (isFlashcardsDeckPath(candidate)) {
        return /^https?:\/\//i.test(candidate) ? candidate : `/${candidate.replace(/^\/+/, '')}`;
      }
      const normalized = candidate.replace(/^\/+/, '');
      if (/^[^/]+\.json$/i.test(normalized)) return buildFlashcardsPublicUrl(normalized);
      if (normalized.startsWith(`${FLASHCARDS_LOCAL_SOURCE_PREFIX}/`) && normalized.toLowerCase().endsWith('.json')) {
        return `/${normalized}`;
      }
    }
    return buildFlashcardsPublicUrl(fallbackName);
  }

  function withNoCacheUrl(value) {
    const normalized = safeText(value);
    if (!normalized) return '';
    const separator = normalized.includes('?') ? '&' : '?';
    return `${normalized}${separator}_pt=${Date.now()}`;
  }

  async function loadAllCards() {
    if (state.allCards.length) return state.allCards;
    const response = await fetch(withNoCacheUrl(buildApiUrl(DATA_MANIFEST_REMOTE_PATH)), { cache: 'no-store' });
    const payload = await response.json().catch(() => ({}));
    const manifestFiles = Array.isArray(payload?.files)
      ? payload.files
      : (Array.isArray(payload?.data?.files) ? payload.data.files : []);
    if (!response.ok || !manifestFiles.length) {
      throw new Error(payload?.message || 'Nao foi possivel carregar o manifesto de flashcards.');
    }

    const files = manifestFiles.map((file) => ({
      name: file.name || file.path || file.source || 'deck.json',
      path: resolveManifestDeckPath(file),
      sourceKey: safeText(file?.source || file?.name || file?.path),
      idSource: safeText(file?.source || file?.name || file?.path)
    }));

    const deckResults = await Promise.allSettled(files.map(async (file) => {
      const deckResponse = await fetch(withNoCacheUrl(buildApiUrl(file.path)), { cache: 'no-store' });
      if (!deckResponse.ok) return [];
      const deckPayload = await deckResponse.json().catch(() => ({}));
      return flattenPayload(file.name, deckPayload, { sourceKey: file.sourceKey, idSource: file.idSource });
    }));

    const cards = deckResults
      .flatMap((result) => (result.status === 'fulfilled' && Array.isArray(result.value) ? result.value : []))
      .filter((card) => safeText(card.english));

    if (!cards.length) {
      throw new Error('Nenhum flashcard valido foi encontrado para speaking.');
    }

    state.allCards = cards;
    return cards;
  }

  function renderCard() {
    const total = state.activeCards.length;
    if (!total || state.currentIndex >= total) {
      finishGame();
      return;
    }

    const card = state.activeCards[state.currentIndex];
    const imageUrl = safeText(card.imageUrl);
    if (imageUrl) {
      els.cardImageWrap.innerHTML = `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(card.english || 'Flashcard')}">`;
    } else {
      els.cardImageWrap.innerHTML = '<div class="card-fallback">Sem imagem nesta carta</div>';
    }

    els.cardEnglishWord.textContent = card.english || '-';
    els.cardPortugueseWord.textContent = card.portuguese || '';
    setGameStatus(`Carta ${state.currentIndex + 1} de ${total}. Fale em ingles e envie.`, '');
  }

  function updateAfterSubmission(score, transcript) {
    state.scores.push(score);
    state.currentIndex += 1;
    updateSpeakingHeader();
    updateProgress();
    setGameStatus(`Transcricao: "${transcript}" | Pronuncia: ${score}%`, 'is-score');
    window.setTimeout(renderCard, 320);
  }

  function finishGame() {
    const sessionCount = state.scores.length;
    const sessionSum = state.scores.reduce((acc, value) => acc + value, 0);
    const finalPercent = sessionCount ? Math.round(sessionSum / sessionCount) : 0;
    state.speakingStats.sum += sessionSum;
    state.speakingStats.count += sessionCount;
    state.speakingStats.sessions += 1;
    saveSpeakingStats();
    updateSpeakingHeader();
    els.finalResultBox.textContent = `${finalPercent}% seu resultado final`;
    els.finalResultBox.classList.add('is-visible');
    setGameStatus('Sessao concluida. Resultado final exibido por 10 segundos.', 'is-score');
    els.sendSpeakingBtn.disabled = true;
    els.listenCardBtn.disabled = true;

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
      updateProgress();
      updateSpeakingHeader();
    }, FINAL_BOX_DURATION_MS);
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

  async function handleSendSpeaking() {
    if (!state.activeCards.length) return;
    const card = state.activeCards[state.currentIndex];
    if (!card) return;
    const stt = window.PlaytalkOpenAiStt;
    if (!stt || typeof stt.recordAudio !== 'function' || typeof stt.transcribeBlob !== 'function') {
      setGameStatus('Reconhecimento de voz nao disponivel neste dispositivo.', 'is-error');
      return;
    }

    els.sendSpeakingBtn.disabled = true;
    els.listenCardBtn.disabled = true;
    setGameStatus('Gravando voz...', '');

    try {
      const blob = await stt.recordAudio({ maxDurationMs: 4500 });
      setGameStatus('Transcrevendo audio...', '');
      const result = await stt.transcribeBlob(blob, { language: 'en' });
      const transcript = safeText(result?.text);
      const score = calculateSpeechMatchPercent(card.english, transcript);
      await playSuccessSound();
      updateAfterSubmission(score, transcript || '(vazio)');
    } catch (error) {
      setGameStatus(error?.message || 'Falha no envio de speaking.', 'is-error');
    } finally {
      els.sendSpeakingBtn.disabled = false;
      els.listenCardBtn.disabled = false;
    }
  }

  async function startGame() {
    if (state.loading) return;
    state.loading = true;
    els.startSpeakingBtn.disabled = true;
    setHomeStatus('Carregando cartas disponiveis...', '');

    try {
      const selectedCount = Math.max(1, Number.parseInt(els.cardCountSelect.value, 10) || 10);
      const allCards = await loadAllCards();
      const pool = shuffle(allCards);
      state.activeCards = pool.slice(0, Math.min(selectedCount, pool.length));
      state.currentIndex = 0;
      state.scores = [];
      updateSpeakingHeader();
      updateProgress();
      els.finalResultBox.classList.remove('is-visible');
      els.home.hidden = true;
      els.game.classList.add('is-active');
      setHomeStatus('', '');
      renderCard();
    } catch (error) {
      setHomeStatus(error?.message || 'Nao foi possivel iniciar o speaking.', 'is-error');
      els.startSpeakingBtn.disabled = false;
    } finally {
      state.loading = false;
    }
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
      void startGame();
    });
    els.listenCardBtn?.addEventListener('click', () => {
      void handleListenCard();
    });
    els.sendSpeakingBtn?.addEventListener('click', () => {
      void handleSendSpeaking();
    });
  }

  function init() {
    updateSpeakingHeader();
    updateProgress();
    bindEvents();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
