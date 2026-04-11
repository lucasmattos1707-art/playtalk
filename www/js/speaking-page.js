(function initPlaytalkSpeakingPage() {
  const SPEAKING_STATS_KEY = 'playtalk-speaking-general-v1';
  const FINAL_BOX_DURATION_MS = 10000;
  const DUEL_WINNER_DURATION_MS = 5000;
  const DUEL_POLL_MS = 2000;
  const PRESENCE_PING_MS = 15000;
  const WORD_SWAP_MS = 1000;
  const DUEL_INTRO_COUNTDOWN_SECONDS = 10;
  const DUEL_BATTLE_DURATION_MS = 3 * 60 * 1000;
  const DUEL_INTRO_SWITCH_TO_PLAYERS_SECONDS = 6;
  const DUEL_INTRO_FALLBACK_GRADIENTS = [
    'linear-gradient(160deg, #274873, #6f3f72)',
    'linear-gradient(160deg, #1f5b57, #355f9d)',
    'linear-gradient(160deg, #745127, #4e3e89)',
    'linear-gradient(160deg, #2b5a44, #83506f)',
    'linear-gradient(160deg, #1e4a66, #9b5d3c)'
  ];

  const els = {
    home: document.getElementById('speakingHome'),
    game: document.getElementById('speakingGame'),
    duelIntro: document.getElementById('duelIntro'),
    duelIntroBookStage: document.getElementById('duelIntroBookStage'),
    duelIntroBookCard: document.getElementById('duelIntroBookCard'),
    duelIntroBookImage: document.getElementById('duelIntroBookImage'),
    duelIntroBookFallback: document.getElementById('duelIntroBookFallback'),
    duelIntroBookKicker: document.getElementById('duelIntroBookKicker'),
    duelIntroBookTitle: document.getElementById('duelIntroBookTitle'),
    duelIntroBookSubtitle: document.getElementById('duelIntroBookSubtitle'),
    duelIntroAvatars: document.getElementById('duelIntroAvatars'),
    duelIntroVs: document.getElementById('duelIntroVs'),
    duelIntroMePlayer: document.getElementById('duelIntroMePlayer'),
    duelIntroEnemyPlayer: document.getElementById('duelIntroEnemyPlayer'),
    duelIntroMeAvatar: document.getElementById('duelIntroMeAvatar'),
    duelIntroEnemyAvatar: document.getElementById('duelIntroEnemyAvatar'),
    duelIntroMeName: document.getElementById('duelIntroMeName'),
    duelIntroEnemyName: document.getElementById('duelIntroEnemyName'),
    duelIntroCountdown: document.getElementById('duelIntroCountdown'),
    duelTimerLabel: document.getElementById('duelTimerLabel'),
    duelTimerValue: document.getElementById('duelTimerValue'),
    levelSelect: document.getElementById('levelSelect'),
    storySelect: document.getElementById('storySelect'),
    miniBooksGrid: document.getElementById('miniBooksGrid'),
    miniBooksEmpty: document.getElementById('miniBooksEmpty'),
    startSpeakingBtn: document.getElementById('startSpeakingBtn'),
    homeStatus: document.getElementById('homeStatus'),
    miniBookAdminEditor: document.getElementById('miniBookAdminEditor'),
    miniBookAdminTitle: document.getElementById('miniBookAdminTitle'),
    miniBookUploadCoverBtn: document.getElementById('miniBookUploadCoverBtn'),
    miniBookUploadCoverInput: document.getElementById('miniBookUploadCoverInput'),
    miniBookNameInput: document.getElementById('miniBookNameInput'),
    miniBookCoverPromptInput: document.getElementById('miniBookCoverPromptInput'),
    miniBookGenerateCoverBtn: document.getElementById('miniBookGenerateCoverBtn'),
    miniBookApproveCoverBtn: document.getElementById('miniBookApproveCoverBtn'),
    miniBookCoverPreview: document.getElementById('miniBookCoverPreview'),
    miniBookBackgroundPromptInput: document.getElementById('miniBookBackgroundPromptInput'),
    miniBookGenerateBackgroundBtn: document.getElementById('miniBookGenerateBackgroundBtn'),
    miniBookApproveBackgroundBtn: document.getElementById('miniBookApproveBackgroundBtn'),
    miniBookBackgroundDesktopPreview: document.getElementById('miniBookBackgroundDesktopPreview'),
    miniBookBackgroundMobilePreview: document.getElementById('miniBookBackgroundMobilePreview'),
    miniBookCloseEditorBtn: document.getElementById('miniBookCloseEditorBtn'),
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
    languageEnglishBtn: document.getElementById('languageEnglishBtn'),
    languagePortugueseBtn: document.getElementById('languagePortugueseBtn'),
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
    stories: [],
    books: [],
    selectedLevel: 1,
    selectedBookId: '',
    displayLanguage: 'english',
    adminUsername: '',
    selectedStoryId: '',
    isAdmin: false,
    adminEditor: {
      open: false,
      bookId: '',
      coverDataUrl: '',
      backgroundDesktopDataUrl: '',
      backgroundMobileDataUrl: '',
      busy: false
    },
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
      introTimer: 0,
      introAnimationTimers: [],
      introAssetToken: 0,
      introCountdownSeconds: DUEL_INTRO_COUNTDOWN_SECONDS,
      battleDurationMs: DUEL_BATTLE_DURATION_MS,
      introBook: {
        id: '',
        title: '',
        coverImageUrl: ''
      },
      preloadedIntroAudio: null,
      battleDeadlineMs: 0,
      battleTimer: 0,
      timeoutSyncInFlight: false
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

  function readLaunchConfig() {
    const params = new URLSearchParams(window.location.search || '');
    const mode = safeText(params.get('mode'));
    const bookId = safeText(params.get('bookId') || params.get('book'));
    const storyId = safeText(params.get('storyId'));
    const autoStartRaw = safeText(params.get('autostart')).toLowerCase();
    const autoStart = autoStartRaw === '1' || autoStartRaw === 'true' || autoStartRaw === 'yes';
    if (!bookId && !storyId) return null;
    return {
      mode,
      bookId,
      storyId,
      autoStart
    };
  }

  function applyLaunchConfig(launchConfig) {
    if (!launchConfig) return false;
    let changed = false;
    const targetBookId = safeText(launchConfig.bookId);
    if (targetBookId) {
      const targetBook = state.books.find((book) => safeText(book?.id) === targetBookId);
      if (targetBook) {
        state.selectedLevel = parseLevel(targetBook.nivel);
        if (els.levelSelect) {
          els.levelSelect.value = String(state.selectedLevel);
        }
        state.selectedBookId = safeText(targetBook.id);
        changed = true;
      }
    }

    renderMiniBooksGrid();

    const preferredStoryId = safeText(launchConfig.storyId);
    if (preferredStoryId) {
      const selectedBook = getSelectedBook();
      const available = new Set(Array.isArray(selectedBook?.storyIds) ? selectedBook.storyIds.map((id) => safeText(id)) : []);
      if (!available.size || available.has(preferredStoryId) || safeText(selectedBook?.selectedStoryId) === preferredStoryId) {
        state.selectedStoryId = preferredStoryId;
        if (els.storySelect) {
          els.storySelect.value = preferredStoryId;
        }
        changed = true;
      }
    }

    return changed;
  }

  function readLocalPlayerProfile() {
    try {
      const raw = JSON.parse(localStorage.getItem('playtalk_player_profile') || 'null');
      if (!raw || typeof raw !== 'object') return { username: '', avatar: '' };
      return {
        username: safeText(raw.username),
        avatar: safeText(raw.avatar || raw.avatarImage || raw.avatar_image || raw.image)
      };
    } catch (_error) {
      return { username: '', avatar: '' };
    }
  }

  function normalizeAvatarSource(value) {
    const avatar = safeText(value);
    return avatar || '/Avatar/avatar-man-person-svgrepo-com.svg';
  }

  function readCurrentPlayerIdentity() {
    let username = '';
    let avatar = '';
    if (window.playtalkPlayerState && typeof window.playtalkPlayerState.get === 'function') {
      const player = window.playtalkPlayerState.get() || {};
      username = safeText(player.username || player.name || player.email);
      avatar = safeText(
        player.avatar
        || player.avatarImage
        || player.avatar_image
        || player.image
      );
    }
    if (!username || !avatar) {
      const localProfile = readLocalPlayerProfile();
      username = username || localProfile.username;
      avatar = avatar || localProfile.avatar;
    }
    return {
      username: username || 'Você',
      avatar: normalizeAvatarSource(avatar)
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

  async function hydrateOfflineIdentityFromSession() {
    try {
      const response = await fetch(buildApiUrl('/api/me'), {
        credentials: 'include',
        cache: 'no-store',
        headers: buildAuthHeaders()
      });
      if (!response.ok) return;
      const payload = await response.json().catch(() => ({}));
      const user = payload?.user || {};
      const username = safeText(user.username || user.email);
      const avatar = normalizeAvatarSource(
        user.avatar_image
        || user.avatarImage
        || user.avatar
      );
      if (username) {
        state.duel.meName = username;
      }
      if (avatar) {
        state.duel.meAvatar = avatar;
      }
      if (window.playtalkPlayerState && typeof window.playtalkPlayerState.patch === 'function') {
        window.playtalkPlayerState.patch({
          username: username || state.duel.meName,
          avatar
        });
      }
      updateDuelAvatarRings();
    } catch (_error) {
      // ignore and keep local fallback identity
    }
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

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function normalizeBookTitle(value) {
    return safeText(value)
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function splitBookTitleLines(value) {
    const normalized = normalizeBookTitle(value) || 'Mini Book';
    const words = normalized.split(' ').filter(Boolean);
    if (words.length <= 1) return [normalized, ''];
    if (words.length === 2) return [words[0], words[1]];

    const half = Math.ceil(words.length / 2);
    return [
      words.slice(0, half).join(' '),
      words.slice(half).join(' ')
    ];
  }

  function pickRandomIntroGradient() {
    if (!DUEL_INTRO_FALLBACK_GRADIENTS.length) {
      return 'linear-gradient(160deg, #385f7e, #8d4d80)';
    }
    const index = Math.floor(Math.random() * DUEL_INTRO_FALLBACK_GRADIENTS.length);
    return DUEL_INTRO_FALLBACK_GRADIENTS[index];
  }

  function resolveDuelIntroBookFromCards() {
    const firstCard = Array.isArray(state.activeCards) && state.activeCards.length ? state.activeCards[0] : null;
    if (!firstCard || typeof firstCard !== 'object') {
      return {
        id: '',
        title: '',
        coverImageUrl: ''
      };
    }
    return {
      id: safeText(firstCard.battleBookId || firstCard.bookId),
      title: normalizeBookTitle(firstCard.battleBookTitle || firstCard.bookTitle || firstCard.bookName || ''),
      coverImageUrl: safeText(firstCard.battleBookCoverImageUrl || firstCard.coverImageUrl)
    };
  }

  function resolveDuelIntroBookData() {
    const fromCards = resolveDuelIntroBookFromCards();
    if (fromCards.id || fromCards.title || fromCards.coverImageUrl) {
      return {
        id: fromCards.id,
        title: fromCards.title || 'Mini Book',
        coverImageUrl: fromCards.coverImageUrl
      };
    }

    const selectedBook = getSelectedBook();
    return {
      id: safeText(selectedBook?.id),
      title: normalizeBookTitle(selectedBook?.title || selectedBook?.fileName || '') || 'Mini Book',
      coverImageUrl: safeText(selectedBook?.coverImageUrl)
    };
  }

  function buildDuelIntroFileLabel(book) {
    const rawId = safeText(book?.id).replace(/\.json$/i, '');
    if (rawId) return `${rawId}.json`;

    const rawTitle = normalizeBookTitle(book?.title || '').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '');
    if (rawTitle) return `${rawTitle.toLowerCase()}.json`;

    return 'minibook.json';
  }

  function parseLevel(value) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isInteger(parsed)) return 1;
    return Math.max(1, Math.min(10, parsed));
  }

  function splitTextInBalancedLines(value) {
    const clean = safeText(value);
    if (!clean) return ['', ''];
    const words = clean.split(/\s+/).filter(Boolean);
    if (words.length < 4) return [clean, ''];

    const totalChars = words.reduce((sum, word) => sum + word.length, 0) + Math.max(0, words.length - 1);
    let bestIndex = 0;
    let bestDelta = Number.POSITIVE_INFINITY;
    let leftLength = 0;

    for (let index = 0; index < words.length - 1; index += 1) {
      leftLength += words[index].length + (index > 0 ? 1 : 0);
      const rightLength = totalChars - leftLength - 1;
      const delta = Math.abs(leftLength - rightLength);
      if (delta < bestDelta) {
        bestDelta = delta;
        bestIndex = index + 1;
      }
    }

    const firstLine = words.slice(0, bestIndex).join(' ');
    const secondLine = words.slice(bestIndex).join(' ');
    if (!secondLine) return [clean, ''];
    return [firstLine, secondLine];
  }

  function getBooksForSelectedLevel() {
    const selectedLevel = parseLevel(state.selectedLevel);
    return state.books.filter((book) => parseLevel(book?.nivel) === selectedLevel);
  }

  function getSelectedBook() {
    return state.books.find((book) => safeText(book?.id) === safeText(state.selectedBookId)) || null;
  }

  function syncStorySelectWithSelectedBook() {
    if (!els.storySelect) return;
    const selectedBook = getSelectedBook();
    els.storySelect.innerHTML = '';
    if (!selectedBook?.selectedStoryId) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'Selecione um MiniBook...';
      els.storySelect.appendChild(option);
      state.selectedStoryId = '';
      return;
    }

    const option = document.createElement('option');
    option.value = selectedBook.selectedStoryId;
    option.textContent = normalizeBookTitle(selectedBook.title) || 'MiniBook';
    els.storySelect.appendChild(option);
    els.storySelect.value = option.value;
    state.selectedStoryId = option.value;
  }

  function applySelectedMiniBookBackground() {
    const body = document.body;
    if (!body) return;
    body.style.backgroundImage = '';
    body.style.backgroundSize = '';
    body.style.backgroundPosition = '';
    body.style.backgroundRepeat = '';
    body.style.backgroundColor = '';
  }

  function renderMiniBooksGrid() {
    if (!els.miniBooksGrid) return;
    const books = getBooksForSelectedLevel();
    els.miniBooksGrid.innerHTML = '';
    if (els.miniBooksEmpty) {
      els.miniBooksEmpty.hidden = books.length > 0;
    }

    if (!books.length) {
      state.selectedBookId = '';
      syncStorySelectWithSelectedBook();
      if (els.startSpeakingBtn) els.startSpeakingBtn.disabled = true;
      applySelectedMiniBookBackground();
      return;
    }

    const hasSelectedBookInLevel = books.some((book) => safeText(book?.id) === safeText(state.selectedBookId));
    if (!hasSelectedBookInLevel) {
      state.selectedBookId = safeText(books[0]?.id);
    }

    books.forEach((book) => {
      const [lineA, lineB] = splitBookTitleLines(book?.title || book?.fileName);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `mini-book${safeText(book?.id) === safeText(state.selectedBookId) ? ' is-selected' : ''}`;
      button.dataset.bookId = safeText(book?.id);
      button.innerHTML = `
        <span class="mini-book__bg"${safeText(book?.coverImageUrl) ? ` style="background-image:url('${escapeHtml(book.coverImageUrl)}')"` : ''}></span>
        <span class="mini-book__overlay"></span>
        <span class="mini-book__content">
          <p class="mini-book__line mini-book__line--a">${escapeHtml(lineA)}</p>
          <p class="mini-book__line mini-book__line--b">${escapeHtml(lineB)}</p>
          <p class="mini-book__meta">LEVEL ${parseLevel(book?.nivel)}</p>
        </span>
      `;
      button.addEventListener('click', () => {
        state.selectedBookId = safeText(book?.id);
        syncStorySelectWithSelectedBook();
        renderMiniBooksGrid();
        void tryOpenMiniBookEditorForSelection(state.selectedBookId);
        applySelectedMiniBookBackground();
      });
      els.miniBooksGrid.appendChild(button);
    });

    syncStorySelectWithSelectedBook();
    if (els.startSpeakingBtn) els.startSpeakingBtn.disabled = false;
    applySelectedMiniBookBackground();
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
    const isActive = Boolean(active);
    els.sendSpeakingBtn.classList.toggle('is-mic-live', isActive);
  }

  function updateLanguageButtons() {
    const showEnglish = state.displayLanguage !== 'portuguese';
    if (els.languageEnglishBtn) {
      els.languageEnglishBtn.classList.toggle('is-active', showEnglish);
      els.languageEnglishBtn.setAttribute('aria-pressed', showEnglish ? 'true' : 'false');
    }
    if (els.languagePortugueseBtn) {
      els.languagePortugueseBtn.classList.toggle('is-active', !showEnglish);
      els.languagePortugueseBtn.setAttribute('aria-pressed', showEnglish ? 'false' : 'true');
    }
  }

  function setDisplayLanguage(language) {
    state.displayLanguage = language === 'portuguese' ? 'portuguese' : 'english';
    updateLanguageButtons();
    renderCurrentCardLanguage();
  }

  function renderCardDisplayText(text, language) {
    if (!els.cardEnglishWord) return;
    const safe = safeText(text) || '-';
    const [firstLine, secondLine] = splitTextInBalancedLines(safe);
    els.cardEnglishWord.classList.remove('is-slide');
    if (secondLine) {
      els.cardEnglishWord.classList.add('is-two-lines');
      els.cardEnglishWord.innerHTML = `
        <span class="card-word__line">${escapeHtml(firstLine)}</span>
        <span class="card-word__line">${escapeHtml(secondLine)}</span>
      `;
    } else {
      els.cardEnglishWord.classList.remove('is-two-lines');
      els.cardEnglishWord.textContent = firstLine || safe;
    }
    els.cardEnglishWord.classList.toggle('is-portuguese', language === 'portuguese');
    const isLongText = safe.length > 22;
    els.cardEnglishWord.classList.toggle('is-long', isLongText);
    void els.cardEnglishWord.offsetWidth;
    els.cardEnglishWord.classList.add('is-slide');
  }

  function renderCurrentCardLanguage() {
    const card = state.activeCards[state.currentIndex];
    if (!card) return;
    const english = safeText(card?.english) || '-';
    const portuguese = safeText(card?.portuguese) || english;
    const language = state.displayLanguage === 'portuguese' ? 'portuguese' : 'english';
    const text = language === 'portuguese' ? portuguese : english;
    renderCardDisplayText(text, language);
    if (els.cardPortugueseWord) {
      els.cardPortugueseWord.hidden = true;
      els.cardPortugueseWord.textContent = '';
    }
  }

  function stopWordTicker() {
    if (state.wordTickerTimer) {
      window.clearInterval(state.wordTickerTimer);
      state.wordTickerTimer = 0;
    }
  }

  function animateWord(nextText) {
    renderCardDisplayText(nextText, state.displayLanguage === 'portuguese' ? 'portuguese' : 'english');
  }

  function applyCardTextSizing(english, portuguese) {
    const language = state.displayLanguage === 'portuguese' ? 'portuguese' : 'english';
    const displayText = language === 'portuguese' ? portuguese : english;
    renderCardDisplayText(displayText, language);
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
    const baseScore = Math.max(0, Math.min(100, Math.round((matched / expectedRaw.length) * 100)));
    return Math.max(0, Math.min(100, Math.round(baseScore * 1.1)));
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
    if (els.meAvatarName) {
      els.meAvatarName.textContent = state.duel.enabled ? (state.duel.meName || 'Você') : '';
    }
    if (els.enemyAvatarName) els.enemyAvatarName.textContent = state.duel.rivalName || 'Adversário';
    if (els.meAvatar) els.meAvatar.src = normalizeAvatarSource(state.duel.meAvatar);
    if (els.enemyAvatar) els.enemyAvatar.src = normalizeAvatarSource(state.duel.rivalAvatar);
    if (els.duelIntroMeAvatar) els.duelIntroMeAvatar.src = normalizeAvatarSource(state.duel.meAvatar);
    if (els.duelIntroEnemyAvatar) els.duelIntroEnemyAvatar.src = normalizeAvatarSource(state.duel.rivalAvatar);
    if (els.duelIntroMeName) els.duelIntroMeName.textContent = state.duel.meName || 'Você';
    if (els.duelIntroEnemyName) els.duelIntroEnemyName.textContent = state.duel.rivalName || 'Adversário';
  }

  function bindAvatarFallbacks() {
    const fallback = '/Avatar/avatar-man-person-svgrepo-com.svg';
    [els.meAvatar, els.enemyAvatar, els.duelIntroMeAvatar, els.duelIntroEnemyAvatar, els.winnerAvatar, els.winnerRevealAvatar]
      .filter(Boolean)
      .forEach((img) => {
        img.onerror = () => {
          if (img.src && img.src.includes(fallback)) return;
          img.src = fallback;
        };
      });
  }

  function clearDuelIntroTimer() {
    if (state.duel.introTimer) {
      window.clearTimeout(state.duel.introTimer);
      state.duel.introTimer = 0;
    }
  }

  function clearDuelIntroAnimationTimers() {
    const timers = Array.isArray(state.duel.introAnimationTimers) ? state.duel.introAnimationTimers : [];
    timers.forEach((timerId) => {
      window.clearTimeout(timerId);
    });
    state.duel.introAnimationTimers = [];
  }

  function preloadImage(url) {
    const normalizedUrl = safeText(url);
    if (!normalizedUrl) {
      return Promise.resolve({ ok: false, url: '' });
    }
    return new Promise((resolve) => {
      const image = new Image();
      image.decoding = 'async';
      image.onload = () => resolve({ ok: true, url: normalizedUrl });
      image.onerror = () => resolve({ ok: false, url: '' });
      image.src = normalizedUrl;
    });
  }

  async function preloadImageWithFallback(url, fallbackUrl) {
    const primary = await preloadImage(url);
    if (primary.ok) return primary;
    const normalizedFallback = safeText(fallbackUrl);
    if (normalizedFallback && normalizedFallback !== safeText(url)) {
      return preloadImage(normalizedFallback);
    }
    return primary;
  }

  function setDuelIntroBookLoading(active) {
    if (!els.duelIntroBookCard) return;
    els.duelIntroBookCard.classList.toggle('is-loading', Boolean(active));
  }

  function setDuelIntroAvatarPending(imageEl, pending) {
    if (!imageEl) return;
    imageEl.classList.toggle('is-pending', Boolean(pending));
  }

  function queueDuelIntroAnimation(callback, delayMs) {
    const timerId = window.setTimeout(() => {
      state.duel.introAnimationTimers = state.duel.introAnimationTimers.filter((id) => id !== timerId);
      callback();
    }, Math.max(0, Number(delayMs) || 0));
    state.duel.introAnimationTimers.push(timerId);
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

  function resetDuelIntroVisuals() {
    if (els.duelIntro) els.duelIntro.classList.remove('is-book-stage', 'is-player-stage');
    if (els.duelIntroAvatars) {
      els.duelIntroAvatars.classList.add('is-hidden');
      els.duelIntroAvatars.classList.remove('is-visible', 'is-leaving');
    }
    if (els.duelIntroVs) els.duelIntroVs.classList.remove('is-visible', 'is-leaving');
    if (els.duelIntroBookStage) els.duelIntroBookStage.hidden = true;
    if (els.duelIntroBookCard) {
      els.duelIntroBookCard.classList.remove('is-visible', 'is-exit', 'is-flash', 'is-loading');
    }
    if (els.duelIntroMePlayer) els.duelIntroMePlayer.classList.remove('is-visible');
    if (els.duelIntroEnemyPlayer) els.duelIntroEnemyPlayer.classList.remove('is-visible');
    if (els.duelIntroMePlayer) els.duelIntroMePlayer.classList.remove('is-leaving', 'is-flash');
    if (els.duelIntroEnemyPlayer) els.duelIntroEnemyPlayer.classList.remove('is-leaving', 'is-flash');
    if (els.duelIntroMeName) {
      els.duelIntroMeName.classList.remove('is-visible', 'is-flash', 'is-leaving');
    }
    if (els.duelIntroEnemyName) {
      els.duelIntroEnemyName.classList.remove('is-visible', 'is-flash', 'is-leaving');
    }
    if (els.duelIntroCountdown) {
      els.duelIntroCountdown.textContent = `O desafio vai comecar em ${DUEL_INTRO_COUNTDOWN_SECONDS}...`;
    }
    if (els.duelIntroBookImage) {
      els.duelIntroBookImage.hidden = true;
      els.duelIntroBookImage.removeAttribute('src');
    }
    if (els.duelIntroBookFallback) {
      els.duelIntroBookFallback.hidden = false;
    }
    setDuelIntroAvatarPending(els.duelIntroMeAvatar, false);
    setDuelIntroAvatarPending(els.duelIntroEnemyAvatar, false);
  }

  function revealDuelIntroPlayers(showNames = true) {
    if (els.duelIntro) {
      els.duelIntro.classList.remove('is-book-stage');
      els.duelIntro.classList.add('is-player-stage');
    }
    if (els.duelIntroAvatars) {
      els.duelIntroAvatars.classList.remove('is-hidden', 'is-leaving');
      els.duelIntroAvatars.classList.add('is-visible');
    }
    if (els.duelIntroVs) {
      els.duelIntroVs.classList.remove('is-leaving');
      els.duelIntroVs.classList.add('is-visible');
    }
    revealDuelIntroPlayer(els.duelIntroMePlayer, showNames ? els.duelIntroMeName : null);
    revealDuelIntroPlayer(els.duelIntroEnemyPlayer, showNames ? els.duelIntroEnemyName : null);
  }

  function revealDuelIntroPlayer(playerEl, nameEl) {
    if (playerEl) {
      playerEl.classList.remove('is-visible');
      playerEl.classList.remove('is-leaving', 'is-flash');
      void playerEl.offsetWidth;
      playerEl.classList.add('is-visible');
      playerEl.classList.add('is-flash');
    }
    if (!nameEl) return;
    nameEl.classList.add('is-visible');
    nameEl.classList.remove('is-flash', 'is-leaving');
    void nameEl.offsetWidth;
    nameEl.classList.add('is-flash');
  }

  function revealDuelIntroNames() {
    revealDuelIntroPlayer(null, els.duelIntroMeName);
    revealDuelIntroPlayer(null, els.duelIntroEnemyName);
  }

  function applyDuelIntroBook() {
    const duelBook = resolveDuelIntroBookData();
    state.duel.introBook = duelBook;

    const fileLabel = buildDuelIntroFileLabel(duelBook);
    if (els.duelIntroBookKicker) {
      els.duelIntroBookKicker.textContent = 'JSON da batalha';
    }
    if (els.duelIntroBookTitle) {
      els.duelIntroBookTitle.textContent = fileLabel;
    }
    if (els.duelIntroBookSubtitle) {
      const subtitle = duelBook.title || 'Mini Book escolhido para o duelo';
      els.duelIntroBookSubtitle.textContent = subtitle;
      els.duelIntroBookSubtitle.hidden = !subtitle;
    }

    const fallbackGradient = pickRandomIntroGradient();
    if (els.duelIntroBookFallback) {
      els.duelIntroBookFallback.style.background = fallbackGradient;
    }

    const hasCover = Boolean(duelBook.coverImageUrl);
    if (els.duelIntroBookImage) {
      els.duelIntroBookImage.hidden = true;
      els.duelIntroBookImage.removeAttribute('src');
    }
    if (els.duelIntroBookFallback) {
      els.duelIntroBookFallback.hidden = false;
    }
    setDuelIntroBookLoading(hasCover);
  }

  function primeDuelIntroAssets() {
    const token = (Number(state.duel.introAssetToken) || 0) + 1;
    state.duel.introAssetToken = token;

    const duelBook = state.duel.introBook?.id || state.duel.introBook?.coverImageUrl
      ? state.duel.introBook
      : resolveDuelIntroBookData();
    const bookUrl = safeText(duelBook?.coverImageUrl);
    const fallbackAvatar = '/Avatar/avatar-man-person-svgrepo-com.svg';
    const introAvatars = [
      { element: els.duelIntroMeAvatar, url: normalizeAvatarSource(state.duel.meAvatar) },
      { element: els.duelIntroEnemyAvatar, url: normalizeAvatarSource(state.duel.rivalAvatar) }
    ];

    introAvatars.forEach(({ element }) => {
      setDuelIntroAvatarPending(element, true);
    });

    introAvatars.forEach(({ element, url }) => {
      void preloadImageWithFallback(url, fallbackAvatar).then((result) => {
        if (token !== state.duel.introAssetToken || !element) return;
        element.src = result.ok && result.url ? result.url : fallbackAvatar;
        setDuelIntroAvatarPending(element, false);
      });
    });

    if (!bookUrl) {
      setDuelIntroBookLoading(false);
      return;
    }

    if (els.duelIntroBookImage) {
      els.duelIntroBookImage.hidden = true;
      els.duelIntroBookImage.removeAttribute('src');
    }
    if (els.duelIntroBookFallback) {
      els.duelIntroBookFallback.hidden = false;
    }
    setDuelIntroBookLoading(true);

    void preloadImage(bookUrl).then((result) => {
      if (token !== state.duel.introAssetToken) return;
      if (result.ok && result.url && els.duelIntroBookImage) {
        els.duelIntroBookImage.src = result.url;
        els.duelIntroBookImage.hidden = false;
        if (els.duelIntroBookFallback) {
          els.duelIntroBookFallback.hidden = true;
        }
      } else if (els.duelIntroBookImage) {
        els.duelIntroBookImage.hidden = true;
        els.duelIntroBookImage.removeAttribute('src');
        if (els.duelIntroBookFallback) {
          els.duelIntroBookFallback.hidden = false;
        }
      }
      setDuelIntroBookLoading(false);
    });
  }

  function revealDuelIntroBook() {
    if (els.duelIntro) {
      els.duelIntro.classList.remove('is-player-stage');
      els.duelIntro.classList.add('is-book-stage');
    }
    if (els.duelIntroBookStage) {
      els.duelIntroBookStage.hidden = false;
    }
    if (els.duelIntroBookCard) {
      els.duelIntroBookCard.classList.remove('is-exit', 'is-visible', 'is-flash');
      void els.duelIntroBookCard.offsetWidth;
      els.duelIntroBookCard.classList.add('is-visible', 'is-flash');
    }
  }

  function transitionDuelIntroFromBookToPlayers() {
    if (els.duelIntroBookCard) {
      els.duelIntroBookCard.classList.remove('is-visible');
      els.duelIntroBookCard.classList.add('is-exit');
    }
    queueDuelIntroAnimation(() => {
      if (els.duelIntroBookStage) {
        els.duelIntroBookStage.hidden = true;
      }
    }, 360);
  }

  function dissolveDuelIntroPlayers() {
    if (els.duelIntroAvatars) {
      els.duelIntroAvatars.classList.add('is-leaving');
    }
    if (els.duelIntroMePlayer) els.duelIntroMePlayer.classList.add('is-leaving');
    if (els.duelIntroEnemyPlayer) els.duelIntroEnemyPlayer.classList.add('is-leaving');
    if (els.duelIntroMeName) els.duelIntroMeName.classList.add('is-leaving');
    if (els.duelIntroEnemyName) els.duelIntroEnemyName.classList.add('is-leaving');
  }

  function preloadFirstDuelCardAudio() {
    try {
      const firstCard = Array.isArray(state.activeCards) && state.activeCards.length ? state.activeCards[0] : null;
      const audioUrl = safeText(firstCard?.audioUrl || firstCard?.audio);
      if (!audioUrl) return;
      const audio = new Audio();
      audio.preload = 'auto';
      audio.src = audioUrl;
      audio.load();
      state.duel.preloadedIntroAudio = audio;
    } catch (_error) {
      state.duel.preloadedIntroAudio = null;
    }
  }

  function formatTimerMs(totalMs) {
    const remaining = Math.max(0, Number(totalMs) || 0);
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  function resolveDuelBattleDurationMs(session) {
    const seconds = Number.parseInt(session?.battleDurationSeconds, 10);
    if (Number.isFinite(seconds) && seconds > 0) {
      return seconds * 1000;
    }
    return DUEL_BATTLE_DURATION_MS;
  }

  function updateDuelTimerLabel() {
    if (!els.duelTimerLabel) return;
    if (!state.duel.enabled || !state.duel.battleDeadlineMs || state.duel.completed || els.game?.classList.contains('is-prestart')) {
      els.duelTimerLabel.hidden = true;
      return;
    }
    const remainingMs = Math.max(0, state.duel.battleDeadlineMs - Date.now());
    els.duelTimerLabel.hidden = false;
    const timerText = formatTimerMs(remainingMs);
    if (els.duelTimerValue) {
      els.duelTimerValue.textContent = timerText;
    } else {
      els.duelTimerLabel.textContent = `Tempo restante: ${timerText}`;
    }
  }

  function stopDuelBattleTimer() {
    if (state.duel.battleTimer) {
      window.clearInterval(state.duel.battleTimer);
      state.duel.battleTimer = 0;
    }
    if (els.duelTimerLabel) {
      els.duelTimerLabel.hidden = true;
    }
  }

  async function handleDuelBattleTimeout() {
    if (!state.duel.enabled || state.duel.completed || state.duel.timeoutSyncInFlight) return;
    state.duel.timeoutSyncInFlight = true;
    try {
      await syncDuelProgress(false, true);
      await pollDuelSession();
    } catch (_error) {
      // ignore
    } finally {
      state.duel.timeoutSyncInFlight = false;
    }
  }

  function startDuelBattleTimer() {
    stopDuelBattleTimer();
    if (!state.duel.enabled || !state.duel.battleDeadlineMs || state.duel.completed) return;
    updateDuelTimerLabel();
    state.duel.battleTimer = window.setInterval(() => {
      if (!state.duel.enabled || state.duel.completed) {
        stopDuelBattleTimer();
        return;
      }
      updateDuelTimerLabel();
      if (Date.now() >= state.duel.battleDeadlineMs) {
        stopDuelBattleTimer();
        void handleDuelBattleTimeout();
      }
    }, 1000);
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
    if (!isVisible) {
      clearDuelIntroAnimationTimers();
      stopBattleIntroAudio();
      state.duel.introAssetToken = (Number(state.duel.introAssetToken) || 0) + 1;
      resetDuelIntroVisuals();
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
    const totalCountdownSeconds = Math.max(1, Number.parseInt(state.duel.introCountdownSeconds, 10) || DUEL_INTRO_COUNTDOWN_SECONDS);
    let switchedToPlayers = false;
    let namesRevealed = false;

    setDuelIntroVisible(true);
    updateTopPercents();
    resetDuelIntroVisuals();
    clearDuelIntroAnimationTimers();
    void playBattleIntroAudio();
    applyDuelIntroBook();
    primeDuelIntroAssets();
    preloadFirstDuelCardAudio();
    revealDuelIntroBook();

    for (let remaining = totalCountdownSeconds; remaining >= 1; remaining -= 1) {
      if (!state.duel.enabled || state.duel.completed) break;
      if (!switchedToPlayers && remaining <= DUEL_INTRO_SWITCH_TO_PLAYERS_SECONDS) {
        switchedToPlayers = true;
        transitionDuelIntroFromBookToPlayers();
        queueDuelIntroAnimation(() => {
          revealDuelIntroPlayers(false);
        }, 360);
      }
      if (switchedToPlayers && !namesRevealed && remaining <= (DUEL_INTRO_SWITCH_TO_PLAYERS_SECONDS - 1)) {
        namesRevealed = true;
        revealDuelIntroNames();
      }
      if (remaining <= 1) {
        dissolveDuelIntroPlayers();
      }
      if (els.duelIntroCountdown) {
        els.duelIntroCountdown.textContent = `O desafio vai comecar em ${remaining}...`;
      }
      await waitMs(1000);
    }

    if (!state.duel.enabled || state.duel.completed) {
      setDuelIntroVisible(false);
      return;
    }
    if (els.duelIntroCountdown) {
      els.duelIntroCountdown.textContent = 'Valendo!';
    }
    await waitMs(180);
    setDuelIntroVisible(false);
  }
  function updateTopPercents() {
    const isBattleMode = state.gameMode === 'battle-mode';
    if (isBattleMode) {
      if (els.speakingPercent) els.speakingPercent.textContent = '';
      if (els.enemySpeakingPercent) els.enemySpeakingPercent.textContent = '';
      if (els.enemyProgressWrap) els.enemyProgressWrap.hidden = false;
      if (els.duelAvatarsWrap) els.duelAvatarsWrap.hidden = false;
      updateDuelTimerLabel();
    } else {
      const offlinePercent = getOfflineAveragePercent();
      if (els.speakingPercent) els.speakingPercent.textContent = `Speaking ${offlinePercent}%`;
      if (els.enemySpeakingPercent) els.enemySpeakingPercent.textContent = '';
      if (els.enemyProgressWrap) els.enemyProgressWrap.hidden = true;
      if (els.duelAvatarsWrap) els.duelAvatarsWrap.hidden = false;
      if (els.duelTimerLabel) els.duelTimerLabel.hidden = true;
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
    stopWordTicker();
    renderCurrentCardLanguage();
    if (!state.duel.enabled) {
      setGameStatus('', '');
    }
  }

  async function loadSinglePlayerCards(storyId) {
    const queryStoryId = String(storyId || '').trim();
    const query = queryStoryId ? `?storyId=${encodeURIComponent(queryStoryId)}` : '';
    const response = await fetch(buildApiUrl(`/api/speaking/cards${query}`), {
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

  async function loadStoryOptions() {
    const response = await fetch(buildApiUrl('/api/speaking/stories'), {
      credentials: 'include',
      cache: 'no-store',
      headers: buildAuthHeaders()
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.success || !Array.isArray(payload.stories)) {
      throw new Error(payload?.message || 'Não foi possível carregar as histórias de speaking.');
    }
    const stories = payload.stories
      .map((entry) => ({
        id: safeText(entry?.id),
        bookId: safeText(entry?.bookId),
        bookTitle: normalizeBookTitle(entry?.bookTitle || entry?.nome || entry?.fileName),
        coverImageUrl: safeText(entry?.coverImageUrl),
        backgroundDesktopUrl: safeText(entry?.backgroundDesktopUrl),
        backgroundMobileUrl: safeText(entry?.backgroundMobileUrl),
        nome: safeText(entry?.nome),
        nivel: Math.max(1, Math.min(10, Number.parseInt(entry?.nivel, 10) || 1)),
        count: Math.max(0, Number.parseInt(entry?.count, 10) || 0)
      }))
      .filter((entry) => entry.id && entry.nome && entry.count > 0);
    if (!stories.length) {
      throw new Error('Nenhuma história disponível para speaking.');
    }
    state.stories = stories;

    const booksFromApi = Array.isArray(payload?.books)
      ? payload.books
      : [];

    const books = booksFromApi
      .map((entry) => ({
        id: safeText(entry?.id || entry?.bookId),
        fileName: safeText(entry?.fileName),
        title: normalizeBookTitle(entry?.title || entry?.bookTitle || entry?.fileName),
        nivel: Math.max(1, Math.min(10, Number.parseInt(entry?.nivel, 10) || 1)),
        count: Math.max(0, Number.parseInt(entry?.count, 10) || 0),
        storyIds: Array.isArray(entry?.storyIds) ? entry.storyIds.map((id) => safeText(id)).filter(Boolean) : [],
        selectedStoryId: safeText(entry?.selectedStoryId),
        coverImageUrl: safeText(entry?.coverImageUrl),
        backgroundDesktopUrl: safeText(entry?.backgroundDesktopUrl),
        backgroundMobileUrl: safeText(entry?.backgroundMobileUrl)
      }))
      .filter((entry) => entry.id && entry.selectedStoryId);

    state.books = books.length
      ? books
      : stories.reduce((acc, story) => {
        const bookId = safeText(story.bookId) || safeText(story.id);
        if (!bookId) return acc;
        if (!acc.some((book) => book.id === bookId)) {
          acc.push({
            id: bookId,
            fileName: '',
            title: normalizeBookTitle(story.bookTitle || story.nome),
            nivel: story.nivel,
            count: story.count,
            storyIds: [story.id],
            selectedStoryId: story.id,
            coverImageUrl: safeText(story.coverImageUrl),
            backgroundDesktopUrl: safeText(story.backgroundDesktopUrl),
            backgroundMobileUrl: safeText(story.backgroundMobileUrl)
          });
        }
        return acc;
      }, []);

    if (!state.books.length) {
      throw new Error('Nenhum MiniBook disponivel para speaking.');
    }

    const firstLevelWithBooks = state.books
      .map((book) => parseLevel(book.nivel))
      .sort((left, right) => left - right)[0] || 1;
    state.selectedLevel = parseLevel(state.selectedLevel || firstLevelWithBooks);
    if (els.levelSelect) {
      els.levelSelect.value = String(state.selectedLevel);
    }

    const booksAtLevel = getBooksForSelectedLevel();
    state.selectedBookId = safeText(booksAtLevel[0]?.id || state.books[0]?.id);
    renderMiniBooksGrid();
  }

  function isAdminAlias(value) {
    const normalized = safeText(value).toLowerCase();
    return normalized === 'admin' || normalized === 'adm' || normalized === 'adminst';
  }

  function applyAdminVisualMode() {
    if (!document?.body?.classList) return;
    document.body.classList.toggle('is-speaking-admin', Boolean(state.isAdmin));
    applySelectedMiniBookBackground();
  }

  function readAdminLocalHint() {
    const fromProfile = safeText(readLocalPlayerProfile()?.username);
    if (isAdminAlias(fromProfile)) return fromProfile;
    if (window.playtalkPlayerState && typeof window.playtalkPlayerState.get === 'function') {
      const player = window.playtalkPlayerState.get() || {};
      const fromState = safeText(player.username || player.name || player.email);
      if (isAdminAlias(fromState)) return fromState;
    }
    return '';
  }

  async function loadAdminFlag() {
    try {
      const localAdminHint = readAdminLocalHint();
      const response = await fetch(buildApiUrl('/api/me'), {
        credentials: 'include',
        cache: 'no-store',
        headers: buildAuthHeaders()
      });
      if (!response.ok) {
        state.adminUsername = localAdminHint;
        state.isAdmin = Boolean(localAdminHint);
        applyAdminVisualMode();
        return;
      }
      const payload = await response.json().catch(() => ({}));
      const username = safeText(payload?.user?.username || payload?.user?.email || '');
      state.adminUsername = username || localAdminHint;
      state.isAdmin = Boolean(payload?.user?.is_admin) || isAdminAlias(username) || Boolean(localAdminHint);
      applyAdminVisualMode();
    } catch (_error) {
      const localAdminHint = readAdminLocalHint();
      state.adminUsername = localAdminHint;
      state.isAdmin = Boolean(localAdminHint);
      applyAdminVisualMode();
    }
  }

  async function tryOpenMiniBookEditorForSelection(bookId) {
    if (!state.isAdmin) {
      const localAdminHint = readAdminLocalHint();
      if (localAdminHint) {
        state.isAdmin = true;
        state.adminUsername = localAdminHint;
      }
    }
    if (state.isAdmin) {
      openMiniBookEditor(bookId);
      return;
    }
    await loadAdminFlag();
    if (state.isAdmin) {
      openMiniBookEditor(bookId);
      return;
    }
    if (isAdminAlias(state.adminUsername)) {
      setHomeStatus('Conta admin detectada, mas sem permissao na sessao. Refaça login e tente de novo.', 'is-error');
    }
  }

  function setMiniBookPreviewImage(element, dataUrl) {
    if (!element) return;
    const value = safeText(dataUrl);
    if (!value) {
      element.removeAttribute('src');
      element.hidden = true;
      return;
    }
    element.src = value;
    element.hidden = false;
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Nao consegui ler o arquivo de imagem.'));
      reader.onload = () => {
        const result = typeof reader.result === 'string' ? reader.result : '';
        if (!result.startsWith('data:image/')) {
          reject(new Error('Arquivo invalido. Envie uma imagem.'));
          return;
        }
        resolve(result);
      };
      reader.readAsDataURL(file);
    });
  }

  function setAdminEditorBusy(isBusy) {
    const busy = Boolean(isBusy);
    state.adminEditor.busy = busy;
    if (els.miniBookGenerateCoverBtn) els.miniBookGenerateCoverBtn.disabled = busy;
    if (els.miniBookGenerateBackgroundBtn) els.miniBookGenerateBackgroundBtn.disabled = busy;
    if (els.miniBookApproveCoverBtn) {
      els.miniBookApproveCoverBtn.disabled = busy || !safeText(state.adminEditor.coverDataUrl);
    }
    if (els.miniBookApproveBackgroundBtn) {
      const hasBothBackgrounds = safeText(state.adminEditor.backgroundDesktopDataUrl) && safeText(state.adminEditor.backgroundMobileDataUrl);
      els.miniBookApproveBackgroundBtn.disabled = busy || !hasBothBackgrounds;
    }
  }

  function closeMiniBookEditor() {
    state.adminEditor.open = false;
    state.adminEditor.bookId = '';
    state.adminEditor.coverDataUrl = '';
    state.adminEditor.backgroundDesktopDataUrl = '';
    state.adminEditor.backgroundMobileDataUrl = '';
    if (els.miniBookAdminEditor) {
      els.miniBookAdminEditor.hidden = true;
    }
    setMiniBookPreviewImage(els.miniBookCoverPreview, '');
    setMiniBookPreviewImage(els.miniBookBackgroundDesktopPreview, '');
    setMiniBookPreviewImage(els.miniBookBackgroundMobilePreview, '');
    setAdminEditorBusy(false);
  }

  function openMiniBookEditor(bookId) {
    if (!state.isAdmin) return;
    const selectedBook = state.books.find((book) => safeText(book?.id) === safeText(bookId));
    if (!selectedBook) return;
    state.adminEditor.open = true;
    state.adminEditor.bookId = safeText(selectedBook.id);
    state.adminEditor.coverDataUrl = '';
    state.adminEditor.backgroundDesktopDataUrl = '';
    state.adminEditor.backgroundMobileDataUrl = '';
    if (els.miniBookAdminEditor) {
      els.miniBookAdminEditor.hidden = false;
    }
    if (els.miniBookAdminTitle) {
      els.miniBookAdminTitle.textContent = `MiniBook Admin: ${normalizeBookTitle(selectedBook.title) || 'Book'}`;
    }
    if (els.miniBookNameInput) {
      els.miniBookNameInput.value = normalizeBookTitle(selectedBook.title);
    }
    if (els.miniBookCoverPromptInput) {
      els.miniBookCoverPromptInput.value = '';
    }
    if (els.miniBookBackgroundPromptInput) {
      els.miniBookBackgroundPromptInput.value = '';
    }
    setMiniBookPreviewImage(els.miniBookCoverPreview, '');
    setMiniBookPreviewImage(els.miniBookBackgroundDesktopPreview, '');
    setMiniBookPreviewImage(els.miniBookBackgroundMobilePreview, '');
    setAdminEditorBusy(false);
  }

  function updateAdminEditorVisibility() {
    if (!state.isAdmin) {
      closeMiniBookEditor();
      return;
    }
    const selectedBook = getSelectedBook();
    if (!selectedBook) {
      closeMiniBookEditor();
      return;
    }
    if (state.adminEditor.open && safeText(state.adminEditor.bookId) !== safeText(selectedBook.id)) {
      openMiniBookEditor(selectedBook.id);
    }
  }

  async function generateMiniBookCoverPreview() {
    if (!state.isAdmin || !state.adminEditor.open || state.adminEditor.busy) return;
    const bookId = safeText(state.adminEditor.bookId);
    if (!bookId) return;
    const selectedBook = getSelectedBook();
    const nameHint = safeText(els.miniBookNameInput?.value || selectedBook?.title || '');
    const customPrompt = safeText(els.miniBookCoverPromptInput?.value || '');
    const prompt = customPrompt || nameHint;

    setAdminEditorBusy(true);
    setHomeStatus('Gerando capa do MiniBook...', '');
    try {
      const response = await fetch(buildApiUrl('/api/admin/minibooks/generate-cover'), {
        method: 'POST',
        credentials: 'include',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          bookId,
          prompt
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success || !safeText(payload?.dataUrl)) {
        throw new Error(payload?.error || payload?.details || 'Nao consegui gerar a capa.');
      }
      state.adminEditor.coverDataUrl = safeText(payload.dataUrl);
      setMiniBookPreviewImage(els.miniBookCoverPreview, state.adminEditor.coverDataUrl);
      setHomeStatus('Capa gerada. Se curtir, clique em Aprovar Capa.', '');
    } catch (error) {
      setHomeStatus(error?.message || 'Falha ao gerar capa.', 'is-error');
    } finally {
      setAdminEditorBusy(false);
    }
  }

  async function approveMiniBookCover() {
    if (!state.isAdmin || state.adminEditor.busy) return;
    const bookId = safeText(state.adminEditor.bookId);
    const imageDataUrl = safeText(state.adminEditor.coverDataUrl);
    if (!bookId || !imageDataUrl) return;
    const prompt = safeText(els.miniBookCoverPromptInput?.value || els.miniBookNameInput?.value || '');

    setAdminEditorBusy(true);
    setHomeStatus('Salvando capa aprovada no R2...', '');
    try {
      const response = await fetch(buildApiUrl('/api/admin/minibooks/save-cover'), {
        method: 'POST',
        credentials: 'include',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          bookId,
          imageDataUrl,
          prompt
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || payload?.details || 'Nao consegui salvar a capa.');
      }
      await loadStoryOptions();
        const launchConfig = readLaunchConfig();
        const launchApplied = applyLaunchConfig(launchConfig);
        updateAdminEditorVisibility();
      setHomeStatus('Capa aprovada e publicada com sucesso.', '');
      state.adminEditor.coverDataUrl = '';
      setMiniBookPreviewImage(els.miniBookCoverPreview, '');
    } catch (error) {
      setHomeStatus(error?.message || 'Falha ao salvar capa.', 'is-error');
    } finally {
      setAdminEditorBusy(false);
    }
  }

  async function generateMiniBookBackgroundPreview() {
    if (!state.isAdmin || !state.adminEditor.open || state.adminEditor.busy) return;
    const bookId = safeText(state.adminEditor.bookId);
    if (!bookId) return;
    const selectedBook = getSelectedBook();
    const nameHint = safeText(els.miniBookNameInput?.value || selectedBook?.title || '');
    const customPrompt = safeText(els.miniBookBackgroundPromptInput?.value || '');
    const prompt = customPrompt || nameHint;

    setAdminEditorBusy(true);
    setHomeStatus('Gerando backgrounds desktop/mobile...', '');
    try {
      const response = await fetch(buildApiUrl('/api/admin/minibooks/generate-background'), {
        method: 'POST',
        credentials: 'include',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          bookId,
          prompt
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || payload?.details || 'Nao consegui gerar os backgrounds.');
      }
      state.adminEditor.backgroundDesktopDataUrl = safeText(payload.desktopDataUrl);
      state.adminEditor.backgroundMobileDataUrl = safeText(payload.mobileDataUrl);
      setMiniBookPreviewImage(els.miniBookBackgroundDesktopPreview, state.adminEditor.backgroundDesktopDataUrl);
      setMiniBookPreviewImage(els.miniBookBackgroundMobilePreview, state.adminEditor.backgroundMobileDataUrl);
      setHomeStatus('Backgrounds gerados. Clique em Aprovar Background para publicar.', '');
    } catch (error) {
      setHomeStatus(error?.message || 'Falha ao gerar backgrounds.', 'is-error');
    } finally {
      setAdminEditorBusy(false);
    }
  }

  async function approveMiniBookBackground() {
    if (!state.isAdmin || state.adminEditor.busy) return;
    const bookId = safeText(state.adminEditor.bookId);
    const desktopDataUrl = safeText(state.adminEditor.backgroundDesktopDataUrl);
    const mobileDataUrl = safeText(state.adminEditor.backgroundMobileDataUrl);
    if (!bookId || !desktopDataUrl || !mobileDataUrl) return;
    const prompt = safeText(els.miniBookBackgroundPromptInput?.value || els.miniBookNameInput?.value || '');

    setAdminEditorBusy(true);
    setHomeStatus('Publicando backgrounds no R2...', '');
    try {
      const response = await fetch(buildApiUrl('/api/admin/minibooks/save-background'), {
        method: 'POST',
        credentials: 'include',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          bookId,
          desktopDataUrl,
          mobileDataUrl,
          prompt
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || payload?.details || 'Nao consegui salvar os backgrounds.');
      }
      await loadStoryOptions();
        const launchConfig = readLaunchConfig();
        const launchApplied = applyLaunchConfig(launchConfig);
        updateAdminEditorVisibility();
      applySelectedMiniBookBackground();
      setHomeStatus('Backgrounds aprovados e publicados.', '');
      state.adminEditor.backgroundDesktopDataUrl = '';
      state.adminEditor.backgroundMobileDataUrl = '';
      setMiniBookPreviewImage(els.miniBookBackgroundDesktopPreview, '');
      setMiniBookPreviewImage(els.miniBookBackgroundMobilePreview, '');
    } catch (error) {
      setHomeStatus(error?.message || 'Falha ao salvar backgrounds.', 'is-error');
    } finally {
      setAdminEditorBusy(false);
    }
  }

  async function uploadMiniBookCoverFile(file) {
    if (!state.isAdmin || state.adminEditor.busy) return;
    const bookId = safeText(state.adminEditor.bookId || state.selectedBookId);
    if (!bookId) {
      setHomeStatus('Selecione um MiniBook antes do upload da capa.', 'is-error');
      return;
    }
    if (!file) return;
    setAdminEditorBusy(true);
    setHomeStatus('Enviando capa manual para o R2...', '');
    try {
      const imageDataUrl = await readFileAsDataUrl(file);
      const prompt = safeText(els.miniBookCoverPromptInput?.value || els.miniBookNameInput?.value || 'manual-upload');
      const response = await fetch(buildApiUrl('/api/admin/minibooks/save-cover'), {
        method: 'POST',
        credentials: 'include',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          bookId,
          imageDataUrl,
          prompt
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || payload?.details || 'Nao consegui salvar a capa manual.');
      }
      await loadStoryOptions();
        const launchConfig = readLaunchConfig();
        const launchApplied = applyLaunchConfig(launchConfig);
        updateAdminEditorVisibility();
      setHomeStatus('Capa manual enviada e salva no R2 com sucesso.', '');
    } catch (error) {
      setHomeStatus(error?.message || 'Falha no upload da capa manual.', 'is-error');
    } finally {
      setAdminEditorBusy(false);
      if (els.miniBookUploadCoverInput) {
        els.miniBookUploadCoverInput.value = '';
      }
    }
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
    const nextMePercent = Math.max(0, Number(session?.mePercent) || 0);
    const nextRivalProgress = Math.max(0, Number(session?.rivalProgress) || 0);
    const nextRivalPercent = Math.max(0, Number(session?.rivalPercent) || 0);
    state.duel.meName = safeText(me?.username || 'Você') || 'Você';
    state.duel.meAvatar = safeText(me?.avatarImage || '/Avatar/avatar-man-person-svgrepo-com.svg') || '/Avatar/avatar-man-person-svgrepo-com.svg';
    state.duel.rivalName = safeText(rival?.username || 'Adversário') || 'Adversário';
    state.duel.rivalAvatar = safeText(rival?.avatarImage || '/Avatar/avatar-man-person-svgrepo-com.svg') || '/Avatar/avatar-man-person-svgrepo-com.svg';
    state.duel.mePercent = Math.max(Math.max(0, Number(state.duel.mePercent) || 0), nextMePercent);
    state.duel.rivalProgress = Math.max(Math.max(0, Number(state.duel.rivalProgress) || 0), nextRivalProgress);
    state.duel.rivalPercent = Math.max(Math.max(0, Number(state.duel.rivalPercent) || 0), nextRivalPercent);
    state.duel.meFinished = Boolean(state.duel.meFinished || session?.meFinished);
    state.duel.introCountdownSeconds = Math.max(
      1,
      Number.parseInt(session?.introCountdownSeconds, 10) || DUEL_INTRO_COUNTDOWN_SECONDS
    );
    state.duel.battleDurationMs = resolveDuelBattleDurationMs(session);
    state.duel.introBook = resolveDuelIntroBookData();
    const battleEndsAtMs = Date.parse(String(session?.battleEndsAt || '').trim());
    if (Number.isFinite(battleEndsAtMs) && battleEndsAtMs > 0) {
      state.duel.battleDeadlineMs = battleEndsAtMs;
    } else {
      const createdAtMs = Date.parse(String(session?.createdAt || '').trim());
      if (Number.isFinite(createdAtMs) && createdAtMs > 0) {
        state.duel.battleDeadlineMs = createdAtMs + (state.duel.introCountdownSeconds * 1000) + state.duel.battleDurationMs;
      }
    }
    updateTopPercents();
    updateProgressBars();

    if (safeText(session?.status) === 'completed' && !state.duel.completed) {
      state.duel.completed = true;
      stopDuelBattleTimer();
      showWinnerReveal(session?.winner);
      scheduleDuelReturnToUsers();
    }
  }

  function showWinnerReveal(winner) {
    if (!els.game) return;
    if (!winner || !winner.userId) {
      if (els.winnerReveal) {
        els.winnerReveal.hidden = true;
        els.winnerReveal.classList.remove('is-visible');
      }
      if (els.finalResultBox) {
        els.finalResultBox.textContent = 'Batalha encerrada sem vencedores';
        els.finalResultBox.classList.add('is-visible');
      }
      els.game.classList.add('is-winner');
      return;
    }
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
    stopDuelBattleTimer();
    clearDuelIntroTimer();
    clearDuelIntroAnimationTimers();
    stopBattleIntroAudio();
    state.duel.introAssetToken = (Number(state.duel.introAssetToken) || 0) + 1;
    stopWordTicker();
    state.duel.enabled = false;
    state.duel.sessionId = '';
    state.duel.completed = false;
    if (state.duel.completedRedirectTimer) {
      window.clearTimeout(state.duel.completedRedirectTimer);
      state.duel.completedRedirectTimer = 0;
    }
    if (state.duel.preloadedIntroAudio) {
      try {
        state.duel.preloadedIntroAudio.pause();
        state.duel.preloadedIntroAudio.removeAttribute('src');
        state.duel.preloadedIntroAudio.load();
      } catch (_error) {
        // ignore
      }
      state.duel.preloadedIntroAudio = null;
    }
    state.duel.meFinished = false;
    state.duel.mePercent = 0;
    state.duel.rivalProgress = 0;
    state.duel.rivalPercent = 0;
    state.duel.introCountdownSeconds = DUEL_INTRO_COUNTDOWN_SECONDS;
    state.duel.battleDurationMs = DUEL_BATTLE_DURATION_MS;
    state.duel.introBook = {
      id: '',
      title: '',
      coverImageUrl: ''
    };
    state.duel.preloadedIntroAudio = null;
    state.duel.battleDeadlineMs = 0;
    state.duel.timeoutSyncInFlight = false;
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
    setHomeStatus('Escolha um MiniBook para jogar.', '');
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

  async function syncDuelProgress(forceFinished, timedOut) {
    if (!state.duel.enabled || !state.duel.sessionId) return;
    const total = Math.max(1, state.activeCards.length);
    const completed = Math.min(state.currentIndex, total);
    const sessionAvg = Math.max(0, Math.min(100, Number(state.duel.mePercent) || 0));
    const isTimedOut = Boolean(timedOut);
    const markFinished = isTimedOut ? Boolean(state.duel.meFinished) : Boolean(forceFinished);
    try {
      const response = await fetch(buildApiUrl(`/api/speaking/sessions/${encodeURIComponent(state.duel.sessionId)}/progress`), {
        method: 'POST',
        credentials: 'include',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          progress: completed,
          percent: sessionAvg,
          finished: markFinished,
          timedOut: isTimedOut
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (response.ok && payload?.success && payload?.session) {
        return payload.session;
      }
    } catch (_error) {
      // ignore
    }
    return null;
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
    void pollDuelSession();
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
      return Promise.reject(new Error('Reconhecimento de voz Não disponível neste navegador.'));
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
      onRecordingStop: () => setMicLiveVisual(false)
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
    void syncDuelProgress(true).then((session) => {
      if (session) {
        syncDuelView(session);
      }
      return pollDuelSession();
    });

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
      setHomeStatus('Sessão finalizada. Escolha outro MiniBook e jogue de novo.', '');
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
    setHomeStatus('Carregando MiniBook...', '');
    try {
      const selectedStoryId = safeText(els.storySelect?.value || state.selectedStoryId);
      if (!selectedStoryId) {
        throw new Error('Escolha um MiniBook antes de iniciar.');
      }
      state.selectedStoryId = selectedStoryId;
      state.activeCards = await loadSinglePlayerCards(selectedStoryId);
      state.currentIndex = 0;
      state.scores = [];
      state.duel.enabled = false;
      state.duel.mePercent = 0;
      state.duel.rivalPercent = 0;
      setGameMode('offline-game');
      applyOfflineIdentity();
      await hydrateOfflineIdentityFromSession();
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
    state.duel.timeoutSyncInFlight = false;
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
    state.duel.introCountdownSeconds = Math.max(
      1,
      Number.parseInt(session?.introCountdownSeconds, 10) || DUEL_INTRO_COUNTDOWN_SECONDS
    );
    state.duel.battleDurationMs = resolveDuelBattleDurationMs(session);
    if (!state.duel.battleDeadlineMs) {
      const createdAtMs = Date.parse(String(session?.createdAt || '').trim());
      if (Number.isFinite(createdAtMs) && createdAtMs > 0) {
        state.duel.battleDeadlineMs = createdAtMs + (state.duel.introCountdownSeconds * 1000) + state.duel.battleDurationMs;
      }
    }
    syncDuelView(session);
    if (state.duel.completed) {
      stopDuelBattleTimer();
      startDuelLoops();
      return;
    }
    await runDuelIntroCountdown();
    if (state.duel.completed) {
      stopDuelBattleTimer();
      startDuelLoops();
      return;
    }
    startDuelBattleTimer();
    renderCard();
    startDuelLoops();
  }

  function bindEvents() {
    els.levelSelect?.addEventListener('change', () => {
      state.selectedLevel = parseLevel(els.levelSelect?.value || state.selectedLevel);
      renderMiniBooksGrid();
      updateAdminEditorVisibility();
      setHomeStatus('', '');
    });
    els.storySelect?.addEventListener('change', () => {
      state.selectedStoryId = safeText(els.storySelect?.value || '');
    });
    els.startSpeakingBtn?.addEventListener('click', () => {
      void startSinglePlayer();
    });
    els.languageEnglishBtn?.addEventListener('click', () => {
      setDisplayLanguage('english');
    });
    els.languagePortugueseBtn?.addEventListener('click', () => {
      setDisplayLanguage('portuguese');
    });
    els.miniBookUploadCoverBtn?.addEventListener('click', () => {
      if (!state.isAdmin) return;
      els.miniBookUploadCoverInput?.click();
    });
    els.miniBookUploadCoverInput?.addEventListener('change', (event) => {
      const input = event?.target;
      const file = input?.files?.[0];
      if (!file) return;
      void uploadMiniBookCoverFile(file);
    });
    els.miniBookGenerateCoverBtn?.addEventListener('click', () => {
      void generateMiniBookCoverPreview();
    });
    els.miniBookApproveCoverBtn?.addEventListener('click', () => {
      void approveMiniBookCover();
    });
    els.miniBookGenerateBackgroundBtn?.addEventListener('click', () => {
      void generateMiniBookBackgroundPreview();
    });
    els.miniBookApproveBackgroundBtn?.addEventListener('click', () => {
      void approveMiniBookBackground();
    });
    els.miniBookCloseEditorBtn?.addEventListener('click', () => {
      closeMiniBookEditor();
    });
    els.sendSpeakingBtn?.addEventListener('click', () => {
      void handleSendSpeaking();
    });
    window.addEventListener('resize', () => {
      applySelectedMiniBookBackground();
    });
    window.addEventListener('beforeunload', () => {
      stopDuelLoops();
      stopDuelBattleTimer();
      clearDuelIntroTimer();
      clearDuelIntroAnimationTimers();
      stopBattleIntroAudio();
      stopWordTicker();
    });
  }

  async function init() {
    bindEvents();
    bindAvatarFallbacks();
    setGameMode(state.duel.sessionId ? 'battle-mode' : 'offline-game');
    applyOfflineIdentity();
    void hydrateOfflineIdentityFromSession();
    updateTopPercents();
    updateProgressBars();
    updateLanguageButtons();
    setMicLiveVisual(false);
    if (!state.duel.sessionId) {
      if (els.startSpeakingBtn) els.startSpeakingBtn.disabled = true;
      try {
        await loadAdminFlag();
        await loadStoryOptions();
        const launchConfig = readLaunchConfig();
        const launchApplied = applyLaunchConfig(launchConfig);
        updateAdminEditorVisibility();
        if (els.startSpeakingBtn) els.startSpeakingBtn.disabled = false;
        setHomeStatus('Escolha um MiniBook para jogar.', '');
        if (
          launchApplied
          && launchConfig
          && (safeText(launchConfig.mode).toLowerCase() === 'pronounce-training' || launchConfig.autoStart)
        ) {
          window.setTimeout(() => {
            void startSinglePlayer();
          }, 120);
        }
      } catch (error) {
        if (els.startSpeakingBtn) els.startSpeakingBtn.disabled = true;
        setHomeStatus(error?.message || 'Não foi possível carregar histórias.', 'is-error');
      }
    }
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





