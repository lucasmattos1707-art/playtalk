(function initPlaytalkBooksPage() {
  const ADMIN_ALIASES = new Set(['admin', 'adm', 'adminst']);
  const MAX_GRADIENTS = 8;
  const SESSION_ENDPOINTS = ['/auth/session', '/api/me'];
  const DEFAULT_READER_BACKGROUND = 'radial-gradient(circle at top, rgba(22, 34, 56, 0.72), #04070d 60%, #020306 100%)';
  const FORCE_ADMIN_UI_STORAGE_KEY = 'playtalk_books_force_admin_ui_v1';
  const MODE_DISSOLVE_MS = 2000;
  const MODE_LOADING_FADE_MS = 500;
  const BOOK_SNAP_DURATION_MS = 300;
  const LEVEL_SLIDE_DURATION_MS = 420;
  const BOOK_SWIPE_THRESHOLD = 44;
  const LEVEL_SWIPE_THRESHOLD = 54;
  const CREATE_MIN_LINES = 7;
  const CREATE_MAX_PHRASE_PAIRS = 120;
  const CREATE_JOBS_POLL_MS = 2200;
  const READER_FINISH_DISSOLVE_MS = 500;
  const READER_FINISH_BOOK_ENTER_MS = 500;
  const READER_FINISH_LINE_STEP_MS = 1000;
  const READER_FINISH_LINE_ENTER_MS = 260;
  const READER_FREE_READ_MIN_VIEW_MS = 3000;
  const READER_BLOCKED_FLASH_MS = 750;
  const LEVEL_DISPLAY_NAMES = [
    'Iniciante',
    'Básico',
    'Aprendiz',
    'Estudante',
    'Leitor',
    'Intermediário',
    'Experiente',
    'Avançado',
    'Nativo',
    'Expert'
  ];

  const els = {
    avatarImage: document.getElementById('booksAccountAvatarImage'),
    avatarFallback: document.getElementById('booksAccountAvatarFallback'),
    avatarName: document.getElementById('booksAccountName'),
    levelMenu: document.getElementById('booksLevelMenu'),
    adminUiToggleBtn: document.getElementById('booksAdminUiToggleBtn'),
    createBookBtn: document.getElementById('booksCreateBookBtn'),
    prevLevelBtn: document.getElementById('booksLevelPrevBtn'),
    nextLevelBtn: document.getElementById('booksLevelNextBtn'),
    levelTitle: document.getElementById('booksLevelTitle'),
    status: document.getElementById('booksStatus'),
    shelfViewport: document.getElementById('booksShelfViewport'),
    shelfLoading: document.getElementById('booksShelfLoading'),
    cardsGrid: document.getElementById('booksCardsGrid'),
    cardsEmpty: document.getElementById('booksCardsEmpty'),
    coverUploadInput: document.getElementById('booksCoverUploadInput'),
    magicModal: document.getElementById('booksMagicModal'),
    magicTitle: document.getElementById('booksMagicTitle'),
    magicCoverPromptInput: document.getElementById('booksMagicCoverPromptInput'),
    magicBackgroundPromptInput: document.getElementById('booksMagicBackgroundPromptInput'),
    magicGenerateBtn: document.getElementById('booksMagicGenerateBtn'),
    magicCloseBtn: document.getElementById('booksMagicCloseBtn'),
    jsonModal: document.getElementById('booksJsonModal'),
    jsonTitle: document.getElementById('booksJsonTitle'),
    jsonInput: document.getElementById('booksJsonInput'),
    jsonSaveBtn: document.getElementById('booksJsonSaveBtn'),
    jsonCloseBtn: document.getElementById('booksJsonCloseBtn'),
    createModal: document.getElementById('booksCreateModal'),
    createEditor: document.getElementById('booksCreateEditor'),
    createPreview: document.getElementById('booksCreatePreview'),
    createInput: document.getElementById('booksCreateInput'),
    createVoiceSelect: document.getElementById('booksCreateVoiceSelect'),
    createIdeaInput: document.getElementById('booksCreateIdeaInput'),
    createCharsInput: document.getElementById('booksCreateCharsInput'),
    createWriteBtn: document.getElementById('booksCreateWriteBtn'),
    createSubmitBtn: document.getElementById('booksCreateSubmitBtn'),
    createCloseBtn: document.getElementById('booksCreateCloseBtn'),
    modeModal: document.getElementById('booksModeModal'),
    modeCard: document.getElementById('booksModeCard'),
    modeLoading: document.getElementById('booksModeLoading'),
    modeCover: document.getElementById('booksModeCover'),
    modeFreeReadBtn: document.getElementById('booksModeFreeReadBtn'),
    modePronounceBtn: document.getElementById('booksModePronounceBtn'),
    modeCloseBtn: document.getElementById('booksModeCloseBtn'),
    reader: document.getElementById('booksReader'),
    readerBackBtn: document.getElementById('booksReaderBackBtn'),
    readerContent: document.getElementById('booksReaderContent'),
    readerBookHero: document.getElementById('booksReaderBookHero'),
    readerBookCover: document.getElementById('booksReaderBookCover'),
    readerProfile: document.getElementById('booksReaderProfile'),
    readerEnglish: document.getElementById('booksReaderEnglish'),
    readerTraining: document.getElementById('booksReaderTraining'),
    readerAvatarImage: document.getElementById('booksReaderAvatarImage'),
    readerAvatarFallback: document.getElementById('booksReaderAvatarFallback'),
    readerUserName: document.getElementById('booksReaderUserName'),
    readerPronRing: document.getElementById('booksReaderPronRing'),
    readerPronPercent: document.getElementById('booksReaderPronPercent'),
    readerLangEnglishBtn: document.getElementById('booksReaderLangEnglishBtn'),
    readerLangPortugueseBtn: document.getElementById('booksReaderLangPortugueseBtn'),
    readerMicBtn: document.getElementById('booksReaderMicBtn'),
    readerTrainingStatus: document.getElementById('booksReaderTrainingStatus'),
    readerProgressFill: document.getElementById('booksReaderProgressFill'),
    readerFinish: document.getElementById('booksReaderFinish'),
    readerFinishCover: document.getElementById('booksReaderFinishCover'),
    readerFinishFlash: document.getElementById('booksReaderFinishFlash'),
    readerFinishLine: document.getElementById('booksReaderFinishLine')
  };

  const state = {
    user: null,
    localProfile: null,
    initialLoading: true,
    selectedLevel: 1,
    books: [],
    isAdmin: false,
    forceAdminUi: false,
    uploadInFlight: false,
    uploadTargetBookId: '',
    gradients: [],
    magicBookId: '',
    magicProcessingBookIds: new Set(),
    jsonBookId: '',
    createModalOpen: false,
    createBusy: false,
    createWriteBusy: false,
    createJobs: [],
    createJobsPollTimer: 0,
    createJobsPollInFlight: false,
    createJobStatusById: new Map(),
    modeBookId: '',
    modeStartBusy: false,
    modeStartToken: 0,
    readerOpen: false,
    readerBookId: '',
    readerMode: 'free-read',
    readerCards: [],
    readerIndex: 0,
    readerDisplayLanguage: 'english',
    readerScores: [],
    readerMicBusy: false,
    readerAudioToken: 0,
    readerAudioElement: null,
    readerLastAudioKey: '',
    readerCardShownAt: 0,
    readerRenderedCardIndex: -1,
    readerFinishing: false,
    readerFinishToken: 0,
    readerTouchStartX: 0,
    readerTouchStartY: 0,
    shelfIndex: 0,
    shelfTouchStartX: 0,
    shelfTouchStartY: 0,
    shelfGestureMoved: false,
    shelfLastGestureAt: 0,
    shelfAnimating: false,
    shelfAnimationFrame: 0,
    shelfAnimationToken: 0
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

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function splitCreateInputRawLines(rawValue) {
    return String(rawValue || '')
      .replace(/\r\n?/g, '\n')
      .split('\n');
  }

  function getCreateLineClassName(index) {
    if (index === 0) return 'books-create-line--title';
    if (index === 1) return 'books-create-line--level';
    if (index === 2) return 'books-create-line--tag';
    if (index === 3 || index === 4) return 'books-create-line--prompt';
    return ((index - 5) % 2 === 0) ? 'books-create-line--pt' : 'books-create-line--en';
  }

  function renderCreateInputPreview() {
    if (!els.createPreview || !els.createInput) return;
    const rawText = String(els.createInput.value || '');
    const lines = splitCreateInputRawLines(rawText);
    const html = lines
      .map((line, index) => {
        const className = getCreateLineClassName(index);
        const content = line.length ? escapeHtml(line) : '&nbsp;';
        return `<span class="books-create-line ${className}">${content}</span>`;
      })
      .join('');
    els.createPreview.innerHTML = html;
    if (els.createEditor) {
      els.createEditor.classList.toggle('is-empty', !safeText(rawText));
    }
  }

  function syncCreatePreviewScroll() {
    if (!els.createPreview || !els.createInput) return;
    els.createPreview.scrollTop = els.createInput.scrollTop;
    els.createPreview.scrollLeft = els.createInput.scrollLeft;
  }

  function parseLevelFromCreateInput(rawLevel) {
    const normalizedRaw = safeText(rawLevel);
    const asNumber = Number.parseInt(normalizedRaw, 10);
    if (Number.isFinite(asNumber)) {
      return normalizeLevel(asNumber);
    }

    const embeddedNumber = normalizedRaw.match(/\d+/);
    if (embeddedNumber && embeddedNumber[0]) {
      return normalizeLevel(Number.parseInt(embeddedNumber[0], 10));
    }

    const normalizedLevelLabel = normalizeText(normalizedRaw);
    if (!normalizedLevelLabel) return null;
    const index = LEVEL_DISPLAY_NAMES.findIndex((name) => normalizeText(name) === normalizedLevelLabel);
    if (index < 0) return null;
    return index + 1;
  }

  function parseCreateInputForSubmission(rawText) {
    const lines = splitCreateInputRawLines(rawText)
      .map((line) => safeText(line))
      .filter(Boolean);

    if (lines.length < CREATE_MIN_LINES) {
      throw new Error('Preencha pelo menos 7 linhas para criar o livro.');
    }

    const title = safeText(lines[0]);
    const levelValue = parseLevelFromCreateInput(lines[1]);
    const tag = safeText(lines[2]);
    const coverPrompt = safeText(lines[3]);
    const backgroundPrompt = safeText(lines[4]);
    const phraseLines = lines.slice(5);

    if (!title) {
      throw new Error('A linha 1 (titulo) e obrigatoria.');
    }
    if (!levelValue) {
      throw new Error('A linha 2 precisa de um nivel valido (1-10 ou nome do nivel).');
    }
    if (!tag) {
      throw new Error('A linha 3 (tag adicional) e obrigatoria.');
    }
    if (!coverPrompt || !backgroundPrompt) {
      throw new Error('As linhas 4 e 5 (prompts de capa/background) sao obrigatorias.');
    }
    if (phraseLines.length < 2) {
      throw new Error('Adicione pelo menos um par de frases (portugues e ingles).');
    }
    if ((phraseLines.length % 2) !== 0) {
      throw new Error('As frases precisam estar em pares: portugues e ingles.');
    }

    const pairs = phraseLines.length / 2;
    if (pairs > CREATE_MAX_PHRASE_PAIRS) {
      throw new Error(`Limite de ${CREATE_MAX_PHRASE_PAIRS} pares por livro neste modo.`);
    }

    return {
      title,
      level: levelValue,
      tag,
      coverPrompt,
      backgroundPrompt,
      pairs
    };
  }

  function splitBalancedLines(value) {
    const raw = safeText(value);
    if (!raw) return '';
    const words = raw.split(/\s+/).filter(Boolean);
    if (words.length <= 1) return raw;

    let bestLineA = raw;
    let bestLineB = '';
    let bestScore = Number.POSITIVE_INFINITY;

    for (let index = 1; index < words.length; index += 1) {
      const lineA = words.slice(0, index).join(' ');
      const lineB = words.slice(index).join(' ');
      const score = Math.abs(lineA.length - lineB.length);
      if (score < bestScore) {
        bestScore = score;
        bestLineA = lineA;
        bestLineB = lineB;
      }
    }

    return bestLineB ? `${bestLineA}\n${bestLineB}` : bestLineA;
  }

  function readForceAdminUiFlag() {
    try {
      return window.localStorage.getItem(FORCE_ADMIN_UI_STORAGE_KEY) === '1';
    } catch (_error) {
      return false;
    }
  }

  function persistForceAdminUiFlag(enabled) {
    try {
      if (enabled) {
        window.localStorage.setItem(FORCE_ADMIN_UI_STORAGE_KEY, '1');
      } else {
        window.localStorage.removeItem(FORCE_ADMIN_UI_STORAGE_KEY);
      }
    } catch (_error) {
      // ignore
    }
  }

  function isAdminAlias(value) {
    return ADMIN_ALIASES.has(safeText(value).toLowerCase());
  }

  function isAdminUiEnabled() {
    return Boolean(state.isAdmin || state.forceAdminUi);
  }

  function setStatus(message, tone) {
    if (!els.status) return;
    els.status.textContent = safeText(message);
    els.status.className = 'books-status';
    if (tone) {
      els.status.classList.add(`is-${tone}`);
    }
  }

  function renderShelfLoading() {
    if (!els.shelfLoading) return;
    els.shelfLoading.hidden = !state.initialLoading;
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

  function normalizeLevel(value) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return 1;
    return Math.max(1, Math.min(10, parsed));
  }

  function normalizeUser(user) {
    if (!user || typeof user !== 'object') return null;
    const username = safeText(user.username);
    if (!username) return null;
    return {
      id: Number(user.id) || 0,
      username,
      avatarImage: safeText(user.avatar_image || user.avatarImage),
      isAdmin: Boolean(user.is_admin || user.isAdmin) || isAdminAlias(username)
    };
  }

  function readPersistedPlayerProfile() {
    try {
      const raw = JSON.parse(localStorage.getItem('playtalk_player_profile') || 'null');
      if (!raw || typeof raw !== 'object') {
        return { username: '', avatarImage: '' };
      }
      return {
        username: safeText(raw.username || raw.name || raw.email),
        avatarImage: safeText(raw.avatar || raw.avatarImage)
      };
    } catch (_error) {
      return { username: '', avatarImage: '' };
    }
  }

  function readLocalPlayerProfile() {
    const persisted = readPersistedPlayerProfile();
    try {
      if (window.playtalkPlayerState && typeof window.playtalkPlayerState.get === 'function') {
        const player = window.playtalkPlayerState.get() || {};
        return {
          username: safeText(player.username || persisted.username),
          avatarImage: safeText(player.avatar || persisted.avatarImage)
        };
      }
    } catch (_error) {
      // ignore
    }
    return persisted;
  }

  function renderAvatar() {
    if (!els.avatarImage || !els.avatarFallback) return;
    const sourceProfile = state.user || state.localProfile || {};
    const username = safeText(sourceProfile.username) || 'Jogador';
    const avatar = safeText(sourceProfile.avatarImage);
    const hasAvatar = Boolean(avatar);
    if (els.avatarName) {
      els.avatarName.textContent = splitBalancedLines(username);
    }

    if (hasAvatar) {
      els.avatarImage.src = avatar;
      els.avatarImage.hidden = false;
      els.avatarFallback.hidden = true;
      return;
    }

    els.avatarImage.removeAttribute('src');
    els.avatarImage.hidden = true;
    els.avatarFallback.hidden = false;
    els.avatarFallback.textContent = username.charAt(0).toUpperCase() || 'P';
  }

  function sortByNome(left, right) {
    return String(left?.nome || '').localeCompare(String(right?.nome || ''), 'pt-BR', {
      sensitivity: 'base',
      numeric: true
    });
  }

  function normalizeBooksFromStories(stories) {
    const byBook = new Map();
    if (!Array.isArray(stories)) return [];

    stories.forEach((entry) => {
      const fileName = safeText(entry?.fileName);
      const nome = safeText(entry?.nome);
      const bookId = safeText(entry?.bookId);
      const storyId = safeText(entry?.id);
      if (!fileName || !nome || !bookId) return;

      const key = bookId.toLowerCase();
      if (!byBook.has(key)) {
        byBook.set(key, {
          bookId,
          fileName,
          nome,
          nivel: normalizeLevel(entry?.nivel),
          coverImageUrl: safeText(entry?.coverImageUrl),
          backgroundDesktopUrl: safeText(entry?.backgroundDesktopUrl),
          backgroundMobileUrl: safeText(entry?.backgroundMobileUrl),
          selectedStoryId: storyId,
          storyIds: storyId ? [storyId] : []
        });
        return;
      }

      const current = byBook.get(key);
      if (!current.coverImageUrl && safeText(entry?.coverImageUrl)) {
        current.coverImageUrl = safeText(entry.coverImageUrl);
      }
      if (!current.backgroundDesktopUrl && safeText(entry?.backgroundDesktopUrl)) {
        current.backgroundDesktopUrl = safeText(entry.backgroundDesktopUrl);
      }
      if (!current.backgroundMobileUrl && safeText(entry?.backgroundMobileUrl)) {
        current.backgroundMobileUrl = safeText(entry.backgroundMobileUrl);
      }
      if (storyId && !current.storyIds.includes(storyId)) {
        current.storyIds.push(storyId);
        if (!current.selectedStoryId) {
          current.selectedStoryId = storyId;
        }
      }
    });

    return Array.from(byBook.values()).sort(sortByNome);
  }

  function getBooksForSelectedLevel() {
    return state.books
      .filter((entry) => normalizeLevel(entry?.nivel) === state.selectedLevel)
      .sort(sortByNome);
  }

  function randomInt(max) {
    return Math.floor(Math.random() * Math.max(1, max));
  }

  function buildGradientPool() {
    const colors = [];
    let guard = 0;
    while (colors.length < MAX_GRADIENTS && guard < 200) {
      guard += 1;
      const hue = randomInt(360);
      const tooClose = colors.some((entry) => {
        const distance = Math.min(Math.abs(entry - hue), 360 - Math.abs(entry - hue));
        return distance < 18;
      });
      if (!tooClose) {
        colors.push(hue);
      }
    }

    if (!colors.length) {
      colors.push(210, 270, 150, 20);
    }

    return colors.map((hue, index) => {
      const nextHue = (hue + 35 + (index * 7)) % 360;
      const satA = 56 + randomInt(16);
      const satB = 52 + randomInt(15);
      const lightA = 54 + randomInt(10);
      const lightB = 33 + randomInt(12);
      return `linear-gradient(160deg, hsl(${hue} ${satA}% ${lightA}%), hsl(${nextHue} ${satB}% ${lightB}%))`;
    });
  }

  function safeCssUrl(url) {
    return `"${String(url || '').replace(/"/g, '%22')}"`;
  }

  function wait(ms) {
    return new Promise((resolve) => {
      window.setTimeout(resolve, Math.max(0, Number(ms) || 0));
    });
  }

  async function animateLevelChangeTransition(direction) {
    const isReverse = Number(direction) < 0;
    if (els.cardsGrid) {
      els.cardsGrid.classList.toggle('is-reverse', isReverse);
      els.cardsGrid.classList.remove('is-level-sliding-in');
      els.cardsGrid.classList.add('is-level-sliding-out');
    }
    if (els.levelTitle) {
      els.levelTitle.classList.add('is-sliding');
    }
    await wait(Math.round(LEVEL_SLIDE_DURATION_MS * 0.42));
  }

  async function settleLevelChangeTransition() {
    if (els.cardsGrid) {
      els.cardsGrid.classList.remove('is-level-sliding-out');
      els.cardsGrid.classList.add('is-level-sliding-in');
    }
    if (els.levelTitle) {
      els.levelTitle.classList.remove('is-sliding');
    }
    await wait(32);
    if (els.cardsGrid) {
      els.cardsGrid.classList.remove('is-level-sliding-in');
      els.cardsGrid.classList.remove('is-reverse');
    }
  }

  function isOverlayOpen() {
    return Boolean(
      state.readerOpen
      || state.modeBookId
      || state.magicBookId
      || state.jsonBookId
      || state.createModalOpen
    );
  }

  function getShelfPages() {
    if (!els.cardsGrid) return [];
    return Array.from(els.cardsGrid.querySelectorAll('.books-shelf-page'));
  }

  function getShelfCards() {
    return getShelfPages()
      .map((page) => page.querySelector('.books-card'))
      .filter(Boolean);
  }

  function flashShelfCard(index) {
    const cards = getShelfCards();
    const target = cards[Math.max(0, Math.min(cards.length - 1, Number(index) || 0))];
    if (!target) return;
    target.classList.remove('is-appearing');
    void target.offsetWidth;
    target.classList.add('is-appearing');
    window.setTimeout(() => {
      target.classList.remove('is-appearing');
    }, 380);
  }

  function syncShelfViewportHeight() {
    const shelf = els.shelfViewport;
    if (!shelf) return;
    const top = shelf.getBoundingClientRect().top;
    const nextHeight = Math.max(260, Math.round(window.innerHeight - top));
    shelf.style.setProperty('--books-shelf-height', `${nextHeight}px`);
    if (Math.abs(nextHeight - shelf.clientHeight) > 1) {
      shelf.style.height = `${nextHeight}px`;
    }
    getShelfPages().forEach((page) => {
      page.style.height = `${nextHeight}px`;
    });
  }

  function clampShelfIndex(index) {
    const pages = getShelfPages();
    if (!pages.length) return 0;
    const normalized = Number.isFinite(index) ? index : 0;
    return Math.max(0, Math.min(pages.length - 1, Math.round(normalized)));
  }

  function easeInOutCubic(progress) {
    const t = Math.max(0, Math.min(1, Number(progress) || 0));
    return t < 0.5 ? (4 * t * t * t) : (1 - Math.pow(-2 * t + 2, 3) / 2);
  }

  function cancelShelfAnimation() {
    if (state.shelfAnimationFrame) {
      window.cancelAnimationFrame(state.shelfAnimationFrame);
      state.shelfAnimationFrame = 0;
    }
    state.shelfAnimating = false;
  }

  function animateShelfScrollTo(targetScrollTop, durationMs) {
    const shelf = els.shelfViewport;
    if (!shelf) return Promise.resolve();
    cancelShelfAnimation();
    const animationToken = state.shelfAnimationToken + 1;
    state.shelfAnimationToken = animationToken;
    state.shelfAnimating = true;

    const from = shelf.scrollTop;
    const to = Math.max(0, Number(targetScrollTop) || 0);
    const duration = Math.max(0, Number(durationMs) || 0);
    if (duration <= 0 || Math.abs(to - from) < 1) {
      shelf.scrollTop = to;
      state.shelfAnimating = false;
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      const startedAt = performance.now();
      const step = (now) => {
        if (animationToken !== state.shelfAnimationToken) {
          state.shelfAnimating = false;
          resolve();
          return;
        }
        const elapsed = now - startedAt;
        const ratio = Math.max(0, Math.min(1, elapsed / duration));
        const eased = easeInOutCubic(ratio);
        shelf.scrollTop = from + ((to - from) * eased);
        if (ratio >= 1) {
          state.shelfAnimating = false;
          state.shelfAnimationFrame = 0;
          resolve();
          return;
        }
        state.shelfAnimationFrame = window.requestAnimationFrame(step);
      };
      state.shelfAnimationFrame = window.requestAnimationFrame(step);
    });
  }

  async function scrollShelfToIndex(index, animate) {
    const shelf = els.shelfViewport;
    const pages = getShelfPages();
    if (!shelf || !pages.length) return;
    syncShelfViewportHeight();
    const previousIndex = state.shelfIndex;
    const nextIndex = Math.max(0, Math.min(pages.length - 1, Number(index) || 0));
    state.shelfIndex = nextIndex;
    const pageHeight = Math.max(1, shelf.clientHeight);
    const targetScrollTop = Math.max(0, nextIndex * pageHeight);

    if (animate) {
      await animateShelfScrollTo(targetScrollTop, BOOK_SNAP_DURATION_MS);
      if (previousIndex !== nextIndex) {
        flashShelfCard(nextIndex);
      }
      return;
    }
    cancelShelfAnimation();
    shelf.scrollTop = targetScrollTop;
    if (previousIndex !== nextIndex) {
      flashShelfCard(nextIndex);
    }
  }

  function updateShelfIndexFromViewport() {
    const shelf = els.shelfViewport;
    const pages = getShelfPages();
    if (!shelf || !pages.length) {
      state.shelfIndex = 0;
      return;
    }
    const pageHeight = Math.max(1, shelf.clientHeight);
    state.shelfIndex = clampShelfIndex(Math.round(shelf.scrollTop / pageHeight));
  }

  async function snapShelfByStep(direction) {
    if (isOverlayOpen() || state.shelfAnimating) return;
    const pages = getShelfPages();
    if (!pages.length) return;
    updateShelfIndexFromViewport();
    const step = Number(direction) > 0 ? 1 : -1;
    const target = clampShelfIndex(state.shelfIndex + step);
    if (target === state.shelfIndex) return;
    await scrollShelfToIndex(target, true);
  }

  function setModeStartBusy(isBusy) {
    state.modeStartBusy = Boolean(isBusy);
    if (els.modeFreeReadBtn) {
      els.modeFreeReadBtn.disabled = state.modeStartBusy;
    }
    if (els.modePronounceBtn) {
      els.modePronounceBtn.disabled = state.modeStartBusy;
    }
  }

  function resetModeTransitionUi() {
    if (els.modeCard) {
      els.modeCard.classList.remove('is-starting');
    }
    if (els.modeLoading) {
      els.modeLoading.classList.remove('is-visible');
    }
  }

  async function hideModeLoadingSmoothly() {
    if (!els.modeLoading || !els.modeLoading.classList.contains('is-visible')) return;
    els.modeLoading.classList.remove('is-visible');
    await wait(MODE_LOADING_FADE_MS);
  }

  function normalizeBookKey(bookId) {
    return safeText(bookId).toLowerCase();
  }

  function isBookProcessingMagic(bookId) {
    return state.magicProcessingBookIds.has(normalizeBookKey(bookId));
  }

  function openUploadForBook(bookId) {
    if (!state.isAdmin || state.uploadInFlight) return;
    const targetBookId = safeText(bookId);
    if (!targetBookId || !els.coverUploadInput) return;
    if (isBookProcessingMagic(targetBookId)) return;
    state.uploadTargetBookId = targetBookId;
    els.coverUploadInput.value = '';
    els.coverUploadInput.click();
  }

  function openMagicModal(book) {
    if (!state.isAdmin || !els.magicModal || !book) return;
    state.magicBookId = safeText(book.bookId);
    if (!state.magicBookId) return;
    if (isBookProcessingMagic(state.magicBookId)) {
      setStatus('Esse livro ja esta gerando imagens agora.', null);
      return;
    }
    if (els.magicTitle) {
      els.magicTitle.textContent = `Gerar imagens: ${safeText(book.nome) || 'Livro'}`;
    }
    if (els.magicCoverPromptInput && !safeText(els.magicCoverPromptInput.value)) {
      els.magicCoverPromptInput.value = `Capa do livro ${safeText(book.nome)} com atmosfera cinematica, personagens e profundidade visual.`;
    }
    if (els.magicBackgroundPromptInput && !safeText(els.magicBackgroundPromptInput.value)) {
      els.magicBackgroundPromptInput.value = `Background do livro ${safeText(book.nome)} em estilo imersivo, sem texto e sem logos.`;
    }
    els.magicModal.classList.add('is-visible');
  }

  function closeMagicModal() {
    state.magicBookId = '';
    if (els.magicModal) {
      els.magicModal.classList.remove('is-visible');
    }
  }

  function openJsonModal(book) {
    if (!state.isAdmin || !els.jsonModal || !book) return;
    const bookId = safeText(book.bookId);
    if (!bookId) return;
    if (isBookProcessingMagic(bookId)) {
      setStatus('Esse livro esta processando. Aguarde terminar.', null);
      return;
    }
    state.jsonBookId = bookId;
    if (els.jsonTitle) {
      els.jsonTitle.textContent = `Salvar JSON: ${safeText(book.nome) || 'Livro'}`;
    }
    if (els.jsonInput) {
      els.jsonInput.value = '';
    }
    els.jsonModal.classList.add('is-visible');
  }

  function closeJsonModal() {
    state.jsonBookId = '';
    if (els.jsonModal) {
      els.jsonModal.classList.remove('is-visible');
    }
  }

  function setCreateBusy(isBusy) {
    state.createBusy = Boolean(isBusy);
    const lockAll = state.createBusy || state.createWriteBusy;
    if (els.createSubmitBtn) {
      els.createSubmitBtn.disabled = lockAll;
    }
    if (els.createCloseBtn) {
      els.createCloseBtn.disabled = lockAll;
    }
    if (els.createInput) {
      els.createInput.disabled = lockAll;
    }
    if (els.createVoiceSelect) {
      els.createVoiceSelect.disabled = lockAll;
    }
    if (els.createIdeaInput) {
      els.createIdeaInput.disabled = lockAll;
    }
    if (els.createCharsInput) {
      els.createCharsInput.disabled = lockAll;
    }
    if (els.createWriteBtn) {
      els.createWriteBtn.disabled = lockAll;
      els.createWriteBtn.textContent = state.createWriteBusy ? 'Escrevendo...' : 'Escrever livro';
    }
    if (els.createBookBtn) {
      els.createBookBtn.disabled = state.createWriteBusy;
      els.createBookBtn.textContent = 'Criar livro';
    }
  }

  function setCreateWriteBusy(isBusy) {
    state.createWriteBusy = Boolean(isBusy);
    setCreateBusy(state.createBusy);
  }

  function openCreateModal() {
    if (!state.isAdmin || !els.createModal) return;
    state.createModalOpen = true;
    renderCreateInputPreview();
    syncCreatePreviewScroll();
    setCreateBusy(state.createBusy);
    els.createModal.classList.add('is-visible');
    if (els.createInput) {
      window.setTimeout(() => {
        try {
          els.createInput.focus();
        } catch (_error) {
          // ignore focus issues
        }
      }, 25);
    }
  }

  function readCreateTargetChars() {
    const parsed = Number.parseInt(els.createCharsInput?.value, 10);
    if (!Number.isFinite(parsed)) return 900;
    return Math.max(0, Math.min(1500, parsed));
  }

  async function writeCreateBookWithNano() {
    if (!state.isAdmin || state.createBusy || state.createWriteBusy) return;
    const userPrompt = safeText(els.createIdeaInput?.value || '');
    const targetChars = readCreateTargetChars();
    if (els.createCharsInput) {
      els.createCharsInput.value = String(targetChars);
    }

    setCreateWriteBusy(true);
    setStatus('Escrevendo minibook com GPT-5.4-nano...', null);
    try {
      const payload = await postJsonWithSuccess('/api/admin/minibooks/write-lines', {
        userPrompt,
        targetChars
      }, 'Nao foi possivel escrever o livro automaticamente.');

      if (els.createInput) {
        els.createInput.value = safeText(payload?.linesText);
      }
      renderCreateInputPreview();
      syncCreatePreviewScroll();
      const pairs = Number(payload?.stats?.pairsCount) || 0;
      const chars = Number(payload?.stats?.englishChars) || 0;
      setStatus(`Rascunho pronto: ${pairs} pares, ${chars} chars em ingles.`, 'success');
    } catch (error) {
      setStatus(error?.message || 'Falha ao escrever livro com GPT-5.4-nano.', 'error');
    } finally {
      setCreateWriteBusy(false);
    }
  }

  function closeCreateModal() {
    state.createModalOpen = false;
    if (els.createModal) {
      els.createModal.classList.remove('is-visible');
    }
  }

  function normalizeCreateJob(job) {
    if (!job || typeof job !== 'object') return null;
    const id = safeText(job.id || job.jobId);
    if (!id) return null;
    const statusRaw = safeText(job.status).toLowerCase();
    const status = statusRaw || 'queued';
    const progress = Math.max(0, Math.min(100, Math.round(Number(job.progress) || 0)));
    const step = safeText(job.step || job.message);
    const errorMessage = safeText(job.errorMessage || job.error);
    const book = {
      id: safeText(job?.book?.id || job?.book?.bookId),
      title: safeText(job?.book?.title || job?.title) || 'Livro',
      level: normalizeLevel(job?.book?.level || job?.level),
      fileName: safeText(job?.book?.fileName || job?.fileName)
    };
    const updatedAt = safeText(job.updatedAt || job.finishedAt || job.startedAt || job.createdAt);
    return {
      id,
      status,
      progress,
      step,
      errorMessage,
      book,
      updatedAt
    };
  }

  function isCreateJobRunning(job) {
    const status = safeText(job?.status).toLowerCase();
    return status === 'queued' || status === 'running';
  }

  function formatCreateJobLabel(job) {
    if (!job) return 'Criando...';
    const progress = Math.max(0, Math.min(100, Math.round(Number(job.progress) || 0)));
    const step = safeText(job.step);
    if (step && progress > 0) return `${step} ${progress}%`;
    if (step) return step;
    if (progress > 0) return `Criando... ${progress}%`;
    return 'Criando...';
  }

  function upsertCreateJob(job) {
    const normalized = normalizeCreateJob(job);
    if (!normalized) return null;
    const next = state.createJobs.slice();
    const index = next.findIndex((entry) => safeText(entry?.id) === normalized.id);
    if (index >= 0) {
      next[index] = { ...next[index], ...normalized };
    } else {
      next.push(normalized);
    }
    next.sort((left, right) => String(right?.updatedAt || '').localeCompare(String(left?.updatedAt || '')));
    state.createJobs = next;
    return normalized;
  }

  function hasRunningCreateJobs() {
    return state.createJobs.some((job) => isCreateJobRunning(job));
  }

  function scheduleCreateJobsPoll(delayMs) {
    if (!state.isAdmin) return;
    if (state.createJobsPollTimer) {
      window.clearTimeout(state.createJobsPollTimer);
      state.createJobsPollTimer = 0;
    }
    const delay = Math.max(250, Number(delayMs) || CREATE_JOBS_POLL_MS);
    state.createJobsPollTimer = window.setTimeout(() => {
      state.createJobsPollTimer = 0;
      void refreshCreateJobs();
    }, delay);
  }

  async function refreshCreateJobs(options) {
    if (!state.isAdmin || state.createJobsPollInFlight) return;
    const opts = options && typeof options === 'object' ? options : {};
    state.createJobsPollInFlight = true;
    try {
      const response = await fetch(buildApiUrl('/api/admin/minibooks/create-jobs'), {
        credentials: 'include',
        headers: buildAuthHeaders(),
        cache: 'no-store'
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success || !Array.isArray(payload.jobs)) {
        throw new Error(payload?.error || payload?.message || 'Nao foi possivel carregar status de criacao.');
      }

      const previousStatusMap = state.createJobStatusById;
      const nextStatusMap = new Map();
      const normalizedJobs = payload.jobs
        .map((job) => normalizeCreateJob(job))
        .filter(Boolean);
      const ignoreTransitions = Boolean(opts.ignoreTransitions);

      let shouldReloadStories = Boolean(opts.forceStoriesReload);
      normalizedJobs.forEach((job) => {
        nextStatusMap.set(job.id, job.status);
        const previousStatus = ignoreTransitions
          ? safeText(job.status).toLowerCase()
          : safeText(previousStatusMap.get(job.id)).toLowerCase();
        if (job.status === 'done' && previousStatus !== 'done') {
          shouldReloadStories = true;
          setStatus(`Livro "${job.book.title}" criado com sucesso.`, 'success');
        } else if (job.status === 'error' && previousStatus !== 'error') {
          setStatus(job.errorMessage || `Falha ao criar "${job.book.title}".`, 'error');
        }
      });

      state.createJobs = normalizedJobs;
      state.createJobStatusById = nextStatusMap;

      if (shouldReloadStories) {
        state.books = await fetchStories();
      }

      renderCards();
      if (hasRunningCreateJobs()) {
        scheduleCreateJobsPoll(CREATE_JOBS_POLL_MS);
      }
    } catch (_error) {
      if (hasRunningCreateJobs()) {
        scheduleCreateJobsPoll(CREATE_JOBS_POLL_MS * 2);
      }
    } finally {
      state.createJobsPollInFlight = false;
    }
  }

  async function createBookFromLines() {
    if (!state.isAdmin || state.createBusy || state.createWriteBusy) return;
    const rawText = String(els.createInput?.value || '');
    const selectedVoice = safeText(els.createVoiceSelect?.value || 'openai:fable').toLowerCase();

    let parsedInput = null;
    try {
      parsedInput = parseCreateInputForSubmission(rawText);
    } catch (error) {
      setStatus(error?.message || 'Formato invalido para criar livro.', 'error');
      return;
    }

    closeCreateModal();
    setCreateBusy(true);
    setStatus(`Fila iniciada para "${parsedInput.title}". A criacao segue em background.`, null);

    try {
      const payload = await postJsonWithSuccess('/api/admin/minibooks/create-from-lines', {
        linesText: rawText,
        voice: selectedVoice
      }, 'Nao foi possivel criar o livro.');
      const job = upsertCreateJob(payload?.job);
      state.selectedLevel = normalizeLevel(job?.book?.level || parsedInput.level);
      renderLevelMenu();
      renderCards();
      scheduleCreateJobsPoll(250);
      const queuedTitle = safeText(job?.book?.title || parsedInput.title);
      const progressLabel = formatCreateJobLabel(job);
      setStatus(`Criacao de "${queuedTitle}" em andamento. ${progressLabel}`, 'success');
    } catch (error) {
      setStatus(error?.message || 'Falha ao criar livro por linhas.', 'error');
    } finally {
      setCreateBusy(false);
    }
  }

  function openModeModal(book) {
    if (!els.modeModal || !book) return;
    const bookId = safeText(book.bookId);
    if (!bookId) return;
    state.modeBookId = bookId;
    resetModeTransitionUi();
    setModeStartBusy(false);
    if (els.modeCover) {
      const coverUrl = safeText(book.coverImageUrl);
      els.modeCover.style.backgroundImage = coverUrl ? `url(${safeCssUrl(coverUrl)})` : 'linear-gradient(155deg, #2a5bcf, #28a7d5)';
    }
    els.modeModal.classList.add('is-visible');
  }

  function closeModeModal(options) {
    const shouldCancelStart = !options || options.cancelStart !== false;
    if (shouldCancelStart) {
      state.modeStartToken += 1;
    }
    state.modeBookId = '';
    setModeStartBusy(false);
    resetModeTransitionUi();
    if (els.modeModal) {
      els.modeModal.classList.remove('is-visible');
    }
  }

  function findModeSelectedBook() {
    const targetBookId = safeText(state.modeBookId);
    if (!targetBookId) return null;
    return state.books.find((entry) => safeText(entry?.bookId) === targetBookId) || null;
  }

  function trackPromiseState(promise) {
    const tracked = { settled: false };
    tracked.promise = Promise.resolve(promise).then(
      (value) => {
        tracked.settled = true;
        return value;
      },
      (error) => {
        tracked.settled = true;
        throw error;
      }
    );
    return tracked;
  }

  async function prepareReaderData(book) {
    const [cards] = await Promise.all([
      fetchBookCards(book),
      preloadReaderAssets(book)
    ]);
    return cards;
  }

  async function startBookFromModeModal(mode) {
    if (state.modeStartBusy) return;
    const selected = findModeSelectedBook();
    if (!selected) return;

    const startToken = state.modeStartToken + 1;
    state.modeStartToken = startToken;
    setModeStartBusy(true);
    if (els.modeCard) {
      els.modeCard.classList.add('is-starting');
    }

    const trackedPreparation = trackPromiseState(prepareReaderData(selected));
    await wait(MODE_DISSOLVE_MS);
    if (startToken !== state.modeStartToken) return;

    if (!trackedPreparation.settled && els.modeLoading) {
      els.modeLoading.classList.add('is-visible');
      await wait(MODE_LOADING_FADE_MS);
      if (startToken !== state.modeStartToken) return;
    }

    let cards;
    try {
      cards = await trackedPreparation.promise;
    } catch (error) {
      await hideModeLoadingSmoothly();
      if (startToken !== state.modeStartToken) return;
      setModeStartBusy(false);
      if (els.modeCard) {
        els.modeCard.classList.remove('is-starting');
      }
      setStatus(error?.message || 'Nao foi possivel abrir o livro.', 'error');
      return;
    }

    await hideModeLoadingSmoothly();
    if (startToken !== state.modeStartToken) return;

    closeModeModal({ cancelStart: false });
    await startBookByMode(selected, mode, cards);
  }

  function renderCards() {
    if (!els.cardsGrid || !els.cardsEmpty) return;
    const books = getBooksForSelectedLevel();
    const pendingBooks = state.createJobs
      .filter((job) => isCreateJobRunning(job) && normalizeLevel(job?.book?.level) === state.selectedLevel)
      .map((job) => ({
        bookId: `job:${job.id}`,
        jobId: job.id,
        nome: safeText(job?.book?.title) || 'Livro',
        nivel: normalizeLevel(job?.book?.level),
        isPendingCreate: true,
        pendingLabel: formatCreateJobLabel(job)
      }))
      .sort(sortByNome);
    const cardsList = books.concat(pendingBooks);
    els.cardsGrid.innerHTML = '';
    els.cardsEmpty.hidden = cardsList.length > 0;
    if (!cardsList.length) {
      state.shelfIndex = 0;
      cancelShelfAnimation();
      if (els.shelfViewport) {
        els.shelfViewport.scrollTop = 0;
      }
      return;
    }

    const gradients = state.gradients.length ? state.gradients : ['linear-gradient(160deg, #4a5cff, #4ea5ff)'];

    cardsList.forEach((book, index) => {
      const gradient = gradients[index % gradients.length];
      const coverImageUrl = safeText(book?.coverImageUrl);
      const pendingCreate = Boolean(book?.isPendingCreate);
      const processingMagic = pendingCreate || isBookProcessingMagic(book?.bookId);
      const page = document.createElement('article');
      page.className = 'books-shelf-page';
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'books-card';
      card.dataset.bookId = safeText(book?.bookId);
      card.setAttribute('aria-label', `Livro ${safeText(book?.nome) || '-'}`);
      if (isAdminUiEnabled()) {
        card.classList.add('is-admin');
      }
      if (processingMagic) {
        card.classList.add('is-processing');
      }

      const background = document.createElement('span');
      background.className = 'books-card__background';
      if (coverImageUrl) {
        background.style.backgroundImage = `url(${safeCssUrl(coverImageUrl)})`;
      } else {
        background.style.backgroundImage = gradient;
      }

      const overlay = document.createElement('span');
      overlay.className = 'books-card__overlay';

      const adminChip = document.createElement('span');
      adminChip.className = 'books-card__admin-chip';
      adminChip.textContent = 'Admin';

      const actions = document.createElement('div');
      actions.className = 'books-card__actions';

      const uploadBtn = document.createElement('button');
      uploadBtn.type = 'button';
      uploadBtn.className = 'books-card__upload-btn';
      uploadBtn.setAttribute('aria-label', `Enviar capa de ${safeText(book?.nome) || 'livro'}`);
      uploadBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M19 18v2H5v-2H3v2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2zm-7-2 5-5h-3V2h-4v9H7z"/></svg>';
      uploadBtn.disabled = state.uploadInFlight || processingMagic || pendingCreate;
      uploadBtn.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        openUploadForBook(book.bookId);
      });

      const magicBtn = document.createElement('button');
      magicBtn.type = 'button';
      magicBtn.className = 'books-card__magic-btn';
      magicBtn.setAttribute('aria-label', `Gerar imagens com IA para ${safeText(book?.nome) || 'livro'}`);
      magicBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m7.5 2 1.13 3.4L12 6.5l-3.37 1.1L7.5 11l-1.13-3.4L3 6.5l3.37-1.1zm9 5 1.5 4.5L22.5 13 18 14.5 16.5 19 15 14.5 10.5 13 15 11.5zm-8 7 1 3 3 1-3 1-1 3-1-3-3-1 3-1z"/></svg>';
      magicBtn.disabled = processingMagic || pendingCreate;
      magicBtn.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        openMagicModal(book);
      });

      const textBtn = document.createElement('button');
      textBtn.type = 'button';
      textBtn.className = 'books-card__text-btn';
      textBtn.setAttribute('aria-label', `Salvar JSON de ${safeText(book?.nome) || 'livro'}`);
      textBtn.title = 'Salvar JSON';
      textBtn.textContent = 'JSON';
      textBtn.style.fontSize = '9px';
      textBtn.style.fontWeight = '800';
      textBtn.style.letterSpacing = '0.06em';
      textBtn.style.background = 'rgba(9, 36, 70, 0.9)';
      textBtn.disabled = processingMagic || pendingCreate;
      textBtn.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        openJsonModal(book);
      });

      const processingOverlay = document.createElement('span');
      processingOverlay.className = 'books-card__processing';
      const processingLabel = pendingCreate
        ? safeText(book?.pendingLabel) || 'Criando...'
        : 'Gerando...';
      processingOverlay.innerHTML = `<span class="books-card__spinner" aria-hidden="true"></span><span class="books-card__processing-label">${escapeHtml(processingLabel)}</span>`;

      actions.append(uploadBtn, magicBtn, textBtn);
      card.append(background, overlay, adminChip, actions, processingOverlay);
      card.addEventListener('click', () => {
        if ((Date.now() - state.shelfLastGestureAt) < 240) return;
        if (state.uploadInFlight || processingMagic || pendingCreate) return;
        openModeModal(book);
      });
      page.appendChild(card);
      els.cardsGrid.appendChild(page);
    });

    syncShelfViewportHeight();
    state.shelfIndex = clampShelfIndex(state.shelfIndex);
    void scrollShelfToIndex(state.shelfIndex, false);
  }

  function renderLevelMenu() {
    if (els.levelTitle) {
      const levelIndex = Math.max(0, Math.min(LEVEL_DISPLAY_NAMES.length - 1, state.selectedLevel - 1));
      const levelName = LEVEL_DISPLAY_NAMES[levelIndex] || `Nivel ${state.selectedLevel}`;
      els.levelTitle.textContent = `${levelName}`;
    }
    if (els.prevLevelBtn) {
      els.prevLevelBtn.disabled = state.selectedLevel <= 1 || state.uploadInFlight;
    }
    if (els.nextLevelBtn) {
      els.nextLevelBtn.disabled = state.selectedLevel >= 10 || state.uploadInFlight;
    }
  }

  function renderAdminUiToggle() {
    const canShowToggle = Boolean(state.isAdmin);
    if (els.adminUiToggleBtn) {
      els.adminUiToggleBtn.hidden = !canShowToggle;
    }
    if (els.createBookBtn) {
      els.createBookBtn.hidden = !canShowToggle;
      els.createBookBtn.disabled = state.createWriteBusy;
    }
    if (els.levelMenu) {
      els.levelMenu.classList.toggle('is-admin', canShowToggle);
    }
    if (!canShowToggle) return;
    const isOn = isAdminUiEnabled();
    if (els.adminUiToggleBtn) {
      els.adminUiToggleBtn.classList.toggle('is-on', isOn);
      els.adminUiToggleBtn.textContent = isOn ? 'Admin UI On' : 'Admin UI Off';
    }
    if (els.createBookBtn) {
      els.createBookBtn.textContent = 'Criar livro';
    }
  }

  async function setLevel(nextLevel) {
    const normalizedLevel = normalizeLevel(nextLevel);
    if (normalizedLevel === state.selectedLevel) return;
    const direction = normalizedLevel > state.selectedLevel ? 1 : -1;
    await animateLevelChangeTransition(direction);
    state.selectedLevel = normalizedLevel;
    state.shelfIndex = 0;
    renderLevelMenu();
    renderCards();
    await settleLevelChangeTransition();
  }

  async function fetchStories() {
    try {
      const response = await fetch(buildApiUrl('/api/speaking/stories'), {
        credentials: 'include',
        headers: buildAuthHeaders(),
        cache: 'no-store'
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) {
        return [];
      }
      return normalizeBooksFromStories(payload.stories);
    } catch (_error) {
      return [];
    }
  }

  async function fetchSessionUser() {
    for (const path of SESSION_ENDPOINTS) {
      try {
        const response = await fetch(buildApiUrl(path), {
          credentials: 'include',
          headers: buildAuthHeaders(),
          cache: 'no-store'
        });
        if (!response.ok) {
          continue;
        }
        const payload = await response.json().catch(() => ({}));
        if (!payload || payload.success === false) {
          continue;
        }
        const normalized = normalizeUser(payload.user || payload);
        if (normalized) {
          return normalized;
        }
      } catch (_error) {
        // try next endpoint
      }
    }
    return null;
  }

  function setUploadBusy(isBusy) {
    state.uploadInFlight = Boolean(isBusy);
    renderLevelMenu();
    renderCards();
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error || new Error('Falha ao ler imagem.'));
      reader.readAsDataURL(file);
    });
  }

  function dataUrlToImage(dataUrl) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Falha ao abrir imagem.'));
      image.src = dataUrl;
    });
  }

  async function fileToWebp600DataUrl(file) {
    const sourceDataUrl = await fileToDataUrl(file);
    const image = await dataUrlToImage(sourceDataUrl);
    const sourceWidth = Math.max(1, Number(image.naturalWidth || image.width) || 1);
    const sourceHeight = Math.max(1, Number(image.naturalHeight || image.height) || 1);
    const targetHeight = 600;
    const targetWidth = Math.max(1, Math.round((sourceWidth / sourceHeight) * targetHeight));
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Nao foi possivel otimizar a imagem.');
    }
    context.clearRect(0, 0, targetWidth, targetHeight);
    context.drawImage(image, 0, 0, targetWidth, targetHeight);
    return canvas.toDataURL('image/webp', 0.82);
  }

  async function uploadCoverForBook(bookId, file) {
    const normalizedBookId = safeText(bookId);
    if (!normalizedBookId || !file) return;

    setUploadBusy(true);
    setStatus('Otimizando capa e enviando para o R2...', null);

    try {
      const imageDataUrl = await fileToWebp600DataUrl(file);
      const targetBook = state.books.find((entry) => safeText(entry?.bookId) === normalizedBookId);
      const response = await fetch(buildApiUrl('/api/admin/minibooks/save-cover'), {
        method: 'POST',
        credentials: 'include',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          bookId: normalizedBookId,
          imageDataUrl,
          prompt: safeText(targetBook?.nome || '')
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('Conta admin sem sessao ativa no servidor. Abra /account, faça login e tente de novo.');
        }
        throw new Error(payload?.error || payload?.details || 'Nao foi possivel salvar a capa.');
      }

      state.books = await fetchStories();
      renderCards();
      setStatus('Capa publicada com sucesso para todos os usuarios.', 'success');
    } catch (error) {
      setStatus(error?.message || 'Falha ao enviar capa.', 'error');
    } finally {
      setUploadBusy(false);
      state.uploadTargetBookId = '';
      if (els.coverUploadInput) {
        els.coverUploadInput.value = '';
      }
    }
  }

  async function postJsonWithSuccess(path, body, fallbackError) {
    const response = await fetch(buildApiUrl(path), {
      method: 'POST',
      credentials: 'include',
      headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body || {})
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.success) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('Conta admin sem sessao ativa no servidor. Abra /account, faça login e tente de novo.');
      }
      throw new Error(payload?.error || payload?.details || payload?.message || fallbackError || 'Falha na requisicao.');
    }
    return payload;
  }

  async function runMagicGenerationForBook(bookId, coverPrompt, backgroundPrompt, bookName) {
    const key = normalizeBookKey(bookId);
    if (!key || state.magicProcessingBookIds.has(key)) return;
    state.magicProcessingBookIds.add(key);
    renderCards();

    setStatus(`Gerando imagens para "${bookName || 'Livro'}"...`, null);
    try {
      const coverGenerated = await postJsonWithSuccess('/api/admin/minibooks/generate-cover', {
        bookId,
        prompt: coverPrompt
      }, 'Nao foi possivel gerar a capa.');

      const backgroundGenerated = await postJsonWithSuccess('/api/admin/minibooks/generate-background', {
        bookId,
        prompt: backgroundPrompt
      }, 'Nao foi possivel gerar o background.');

      await postJsonWithSuccess('/api/admin/minibooks/save-cover', {
        bookId,
        imageDataUrl: safeText(coverGenerated?.dataUrl),
        prompt: coverPrompt
      }, 'Nao foi possivel salvar a capa no R2.');

      await postJsonWithSuccess('/api/admin/minibooks/save-background', {
        bookId,
        desktopDataUrl: safeText(backgroundGenerated?.desktopDataUrl),
        mobileDataUrl: safeText(backgroundGenerated?.mobileDataUrl),
        prompt: backgroundPrompt
      }, 'Nao foi possivel salvar o background no R2.');

      state.books = await fetchStories();
      setStatus(`"${bookName || 'Livro'}" atualizado com capa e background no R2.`, 'success');
    } catch (error) {
      setStatus(error?.message || `Falha na geracao do livro "${bookName || 'Livro'}".`, 'error');
    } finally {
      state.magicProcessingBookIds.delete(key);
      renderCards();
    }
  }

  function generateAndSaveMagicForBook() {
    if (!state.isAdmin) return;
    const bookId = safeText(state.magicBookId);
    if (!bookId) return;
    if (isBookProcessingMagic(bookId)) {
      setStatus('Esse livro ja esta gerando imagens agora.', null);
      closeMagicModal();
      return;
    }

    const targetBook = state.books.find((entry) => safeText(entry?.bookId) === bookId);
    const bookName = safeText(targetBook?.nome || 'Livro');
    const coverPrompt = safeText(els.magicCoverPromptInput?.value || targetBook?.nome || '');
    const backgroundPrompt = safeText(els.magicBackgroundPromptInput?.value || targetBook?.nome || '');

    if (!coverPrompt || !backgroundPrompt) {
      setStatus('Preencha os dois campos de prompt antes de gerar.', 'error');
      return;
    }

    closeMagicModal();
    void runMagicGenerationForBook(bookId, coverPrompt, backgroundPrompt, bookName);
  }

  async function saveJsonForBook() {
    if (!state.isAdmin) return;
    const bookId = safeText(state.jsonBookId);
    if (!bookId) return;
    if (isBookProcessingMagic(bookId)) {
      setStatus('Esse livro esta processando. Aguarde terminar.', null);
      return;
    }

    const targetBook = state.books.find((entry) => safeText(entry?.bookId) === bookId);
    const bookName = safeText(targetBook?.nome || 'Livro');
    const jsonText = safeText(els.jsonInput?.value || '');
    if (!jsonText) {
      setStatus('Cole o JSON antes de salvar.', 'error');
      return;
    }

    try {
      JSON.parse(jsonText);
    } catch (_error) {
      setStatus('JSON invalido. Revise o formato e tente novamente.', 'error');
      return;
    }

    closeJsonModal();
    const key = normalizeBookKey(bookId);
    state.magicProcessingBookIds.add(key);
    renderCards();

    setStatus(`Salvando JSON de "${bookName}" no Postgres...`, null);
    try {
      await postJsonWithSuccess('/api/admin/minibooks/save-json', {
        bookId,
        jsonText
      }, 'Nao foi possivel salvar o JSON do livro.');
      state.books = await fetchStories();
      setStatus(`JSON do livro "${bookName}" salvo e publicado para todos.`, 'success');
    } catch (error) {
      setStatus(error?.message || `Falha ao salvar JSON de "${bookName}".`, 'error');
    } finally {
      state.magicProcessingBookIds.delete(key);
      renderCards();
    }
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
      let canCover = true;
      for (let index = range.start; index < range.end; index += 1) {
        if (covered[index]) {
          canCover = false;
          break;
        }
      }
      if (!canCover) return;
      for (let index = range.start; index < range.end; index += 1) {
        covered[index] = true;
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

  function mapWebSpeechError(errorCode) {
    const code = String(errorCode || '').toLowerCase();
    if (code === 'not-allowed' || code === 'service-not-allowed') {
      return 'Permissao de microfone negada.';
    }
    if (code === 'audio-capture') {
      return 'Nenhum microfone disponivel.';
    }
    if (code === 'network') {
      return 'Falha de rede no reconhecimento de voz.';
    }
    if (code === 'no-speech') {
      return 'Nao detectei sua fala. Tente novamente.';
    }
    return 'Falha no reconhecimento de voz.';
  }

  function setReaderMicLive(active) {
    if (!els.readerMicBtn) return;
    els.readerMicBtn.classList.toggle('is-live', Boolean(active));
  }

  function captureSpeechWithWebSpeech(options = {}) {
    const RecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (typeof RecognitionCtor !== 'function') {
      return Promise.reject(new Error('Reconhecimento de voz nao disponivel neste navegador.'));
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
          options.onRecordingStart();
        }
      };

      recognition.onresult = (event) => {
        const transcript = safeText(event?.results?.[0]?.[0]?.transcript || '');
        finish(() => {
          if (typeof options.onRecordingStop === 'function') {
            options.onRecordingStop();
          }
          if (!transcript) {
            reject(new Error('Transcricao vazia.'));
            return;
          }
          resolve(transcript);
        });
      };

      recognition.onerror = (event) => {
        const message = mapWebSpeechError(event?.error);
        finish(() => {
          if (typeof options.onRecordingStop === 'function') {
            options.onRecordingStop();
          }
          reject(new Error(message));
        });
      };

      recognition.onend = () => {
        if (!finished) {
          finish(() => {
            if (typeof options.onRecordingStop === 'function') {
              options.onRecordingStop();
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
            options.onRecordingStop();
          }
          reject(new Error('Nao foi possivel iniciar o reconhecimento de voz.'));
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
      onRecordingStart: () => setReaderMicLive(true),
      onRecordingStop: () => setReaderMicLive(false)
    });
  }

  function setReaderTrainingStatus(message) {
    if (!els.readerTrainingStatus) return;
    els.readerTrainingStatus.textContent = safeText(message);
  }

  function stopReaderAudio() {
    state.readerAudioToken += 1;
    state.readerLastAudioKey = '';
    const current = state.readerAudioElement;
    state.readerAudioElement = null;
    if (!current) return;
    try {
      current.pause();
      current.currentTime = 0;
      current.src = '';
    } catch (_error) {
      // ignore
    }
  }

  async function playReaderCardAudio(card, index) {
    const source = safeText(card?.audio || card?.audioUrl);
    const english = safeText(card?.english);
    const key = `${Number(index) || 0}::${source || english}`;

    if (!source) {
      state.readerLastAudioKey = key;
      return;
    }
    if (state.readerLastAudioKey === key) {
      return;
    }

    state.readerLastAudioKey = key;
    const token = state.readerAudioToken + 1;
    state.readerAudioToken = token;

    const previous = state.readerAudioElement;
    if (previous) {
      try {
        previous.pause();
        previous.currentTime = 0;
      } catch (_error) {
        // ignore
      }
    }

    const audio = new Audio(source);
    audio.preload = 'auto';
    state.readerAudioElement = audio;

    try {
      await audio.play();
      if (token !== state.readerAudioToken) {
        audio.pause();
      }
    } catch (_error) {
      // browser may block autoplay; keep silent
    }
  }

  function updateReaderProgress(total, index) {
    if (!els.readerProgressFill) return;
    if (!total || total <= 0) {
      els.readerProgressFill.style.width = '0%';
      return;
    }
    const safeIndex = Math.max(0, Math.min(total - 1, index));
    const percent = Math.round(((safeIndex + 1) / total) * 100);
    els.readerProgressFill.style.width = `${percent}%`;
  }

  function animateReaderPhrase() {
    if (!els.readerEnglish) return;
    els.readerEnglish.classList.remove('is-dissolve');
    void els.readerEnglish.offsetWidth;
    els.readerEnglish.classList.add('is-dissolve');
  }

  function updateReaderPronPercent() {
    const total = state.readerScores.length;
    const avg = total
      ? Math.max(0, Math.min(100, Math.round(state.readerScores.reduce((acc, value) => acc + value, 0) / total)))
      : 0;
    if (els.readerPronRing) {
      els.readerPronRing.style.setProperty('--percent', String(avg));
    }
    if (els.readerPronPercent) {
      els.readerPronPercent.textContent = `${avg}%`;
    }
  }

  function updateReaderLanguageButtons() {
    const showEnglish = state.readerDisplayLanguage !== 'portuguese';
    if (els.readerLangEnglishBtn) {
      els.readerLangEnglishBtn.classList.toggle('is-active', showEnglish);
      els.readerLangEnglishBtn.disabled = state.readerFinishing;
    }
    if (els.readerLangPortugueseBtn) {
      els.readerLangPortugueseBtn.classList.toggle('is-active', !showEnglish);
      els.readerLangPortugueseBtn.disabled = state.readerFinishing;
    }
  }

  function setReaderVisible(visible) {
    state.readerOpen = Boolean(visible);
    if (els.reader) {
      els.reader.classList.toggle('is-visible', state.readerOpen);
    }
    document.body.classList.toggle('books-reader-open', state.readerOpen);
  }

  function normalizeReaderPercent(value) {
    return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
  }

  function calculateReaderAverageScore() {
    if (!Array.isArray(state.readerScores) || !state.readerScores.length) return 0;
    const total = state.readerScores.reduce((acc, value) => acc + normalizeReaderPercent(value), 0);
    return normalizeReaderPercent(total / state.readerScores.length);
  }

  function findActiveReaderBook() {
    const targetBookId = safeText(state.readerBookId);
    if (!targetBookId) return null;
    return state.books.find((entry) => safeText(entry?.bookId) === targetBookId) || null;
  }

  function resetReaderFinishUi() {
    if (els.reader) {
      els.reader.classList.remove('is-finishing');
    }
    if (els.readerFinish) {
      els.readerFinish.classList.remove('is-visible');
      els.readerFinish.hidden = true;
    }
    if (els.readerFinishLine) {
      els.readerFinishLine.textContent = '';
      els.readerFinishLine.classList.remove('is-visible');
    }
    if (els.readerFinishFlash) {
      els.readerFinishFlash.classList.remove('is-active');
    }
  }

  function showReaderFinishUi(book) {
    if (!els.readerFinish) return;
    if (els.readerFinishCover) {
      const coverUrl = safeText(book?.coverImageUrl);
      els.readerFinishCover.style.backgroundImage = coverUrl
        ? `url(${safeCssUrl(coverUrl)})`
        : 'linear-gradient(155deg, #2a5bcf, #28a7d5)';
    }
    els.readerFinish.hidden = false;
    els.readerFinish.classList.add('is-visible');
  }

  function triggerReaderFinishFlash() {
    if (!els.readerFinishFlash) return;
    els.readerFinishFlash.classList.remove('is-active');
    void els.readerFinishFlash.offsetWidth;
    els.readerFinishFlash.classList.add('is-active');
  }

  function triggerReaderBlockedBookFlash() {
    if (!els.readerBookCover) return;
    els.readerBookCover.classList.remove('is-blocked-flash');
    void els.readerBookCover.offsetWidth;
    els.readerBookCover.classList.add('is-blocked-flash');
    window.setTimeout(() => {
      els.readerBookCover?.classList.remove('is-blocked-flash');
    }, READER_BLOCKED_FLASH_MS + 40);
  }

  function triggerReaderSuccessBookFlash() {
    if (!els.readerBookCover) return;
    els.readerBookCover.classList.remove('is-success-flash');
    void els.readerBookCover.offsetWidth;
    els.readerBookCover.classList.add('is-success-flash');
    window.setTimeout(() => {
      els.readerBookCover?.classList.remove('is-success-flash');
    }, READER_BLOCKED_FLASH_MS + 40);
  }

  async function animateReaderFinishLine(text) {
    if (!els.readerFinishLine) return;
    els.readerFinishLine.classList.remove('is-visible');
    els.readerFinishLine.textContent = safeText(text);
    void els.readerFinishLine.offsetWidth;
    els.readerFinishLine.classList.add('is-visible');
    await wait(READER_FINISH_LINE_ENTER_MS);
  }

  async function postReaderBookCompletion(book, pronunciationPercent) {
    const bookId = safeText(book?.bookId);
    if (!bookId) {
      return {
        success: false,
        message: 'Livro sem identificador para salvar progresso.',
        stats: {
          bookReadCount: 0,
          generalPronunciationPercent: normalizeReaderPercent(pronunciationPercent)
        }
      };
    }

    try {
      const response = await fetch(buildApiUrl('/api/books/training/complete'), {
        method: 'POST',
        credentials: 'include',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          bookId,
          pronunciationPercent: normalizeReaderPercent(pronunciationPercent)
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) {
        return {
          success: false,
          message: payload?.message || 'Nao consegui salvar progresso do livro.',
          stats: {
            bookReadCount: 0,
            generalPronunciationPercent: normalizeReaderPercent(pronunciationPercent)
          }
        };
      }
      return payload;
    } catch (_error) {
      return {
        success: false,
        message: 'Falha de rede ao salvar progresso do livro.',
        stats: {
          bookReadCount: 0,
          generalPronunciationPercent: normalizeReaderPercent(pronunciationPercent)
        }
      };
    }
  }

  async function runReaderBookCompletionSequence() {
    if (!state.readerOpen || state.readerMode !== 'pronounce-training' || state.readerFinishing) return;

    state.readerFinishing = true;
    state.readerFinishToken += 1;
    const token = state.readerFinishToken;
    const activeBook = findActiveReaderBook();
    const sessionPronunciationPercent = calculateReaderAverageScore();
    const completionPromise = postReaderBookCompletion(activeBook, sessionPronunciationPercent);

    if (els.reader) {
      els.reader.classList.add('is-finishing');
    }

    await wait(READER_FINISH_DISSOLVE_MS);
    if (token !== state.readerFinishToken || !state.readerOpen) return;

    showReaderFinishUi(activeBook);
    await wait(READER_FINISH_BOOK_ENTER_MS);
    if (token !== state.readerFinishToken || !state.readerOpen) return;

    triggerReaderFinishFlash();

    const completionPayload = await completionPromise;
    if (token !== state.readerFinishToken || !state.readerOpen) return;

    const savedBookRead = Math.max(0, Number(completionPayload?.stats?.bookReadCount) || 0);
    const savedGeneralPronunciation = normalizeReaderPercent(
      completionPayload?.stats?.generalPronunciationPercent
    );
    const lines = [
      `Pronuncia ${sessionPronunciationPercent}%`,
      `${savedBookRead > 0 ? savedBookRead : '--'} Livros`,
      `Pronuncia geral ${savedGeneralPronunciation}%`
    ];

    for (const line of lines) {
      await animateReaderFinishLine(line);
      await wait(READER_FINISH_LINE_STEP_MS);
      if (token !== state.readerFinishToken || !state.readerOpen) return;
    }

    closeReader();
  }

  async function runFreeReadCompletionSequence() {
    if (!state.readerOpen || state.readerMode !== 'free-read' || state.readerFinishing) return;

    state.readerFinishing = true;
    state.readerFinishToken += 1;
    const token = state.readerFinishToken;
    const activeBook = findActiveReaderBook();
    const completionPromise = postReaderBookCompletion(activeBook, 0);

    triggerReaderSuccessBookFlash();
    if (els.reader) {
      els.reader.classList.add('is-finishing');
    }

    await wait(READER_FINISH_DISSOLVE_MS);
    if (token !== state.readerFinishToken || !state.readerOpen) return;

    const completionPayload = await completionPromise;
    if (token !== state.readerFinishToken || !state.readerOpen) return;

    const savedBookRead = Math.max(0, Number(completionPayload?.stats?.bookReadCount) || 0);
    if (savedBookRead > 0) {
      setStatus(`${savedBookRead} livros lidos.`, 'success');
    }
    closeReader();
  }

  function chooseReaderBackgroundUrl(book) {
    const desktop = safeText(book?.backgroundDesktopUrl);
    const mobile = safeText(book?.backgroundMobileUrl);
    const isMobile = Boolean(window.matchMedia && window.matchMedia('(max-width: 900px)').matches);
    if (isMobile) {
      return mobile || desktop;
    }
    return desktop || mobile;
  }

  function preloadImageUrl(url) {
    const source = safeText(url);
    if (!source) {
      return Promise.resolve(false);
    }
    return new Promise((resolve) => {
      const image = new Image();
      let resolved = false;
      const finish = (ok) => {
        if (resolved) return;
        resolved = true;
        resolve(Boolean(ok));
      };
      const timer = window.setTimeout(() => {
        finish(false);
      }, 9000);
      image.onload = () => {
        window.clearTimeout(timer);
        if (typeof image.decode === 'function') {
          image.decode()
            .catch(() => null)
            .finally(() => finish(true));
          return;
        }
        finish(true);
      };
      image.onerror = () => {
        window.clearTimeout(timer);
        finish(false);
      };
      image.src = source;
      if (image.complete && Number(image.naturalWidth) > 0) {
        window.clearTimeout(timer);
        finish(true);
      }
    });
  }

  async function preloadReaderAssets(book) {
    const profile = state.user || state.localProfile || {};
    const urls = [
      chooseReaderBackgroundUrl(book),
      safeText(profile.avatarImage)
    ]
      .filter(Boolean)
      .filter((url, index, list) => list.indexOf(url) === index);

    if (!urls.length) return;
    await Promise.all(urls.map((url) => preloadImageUrl(url)));
  }

  function applyReaderBackground(book) {
    if (!els.reader) return;
    const backgroundUrl = chooseReaderBackgroundUrl(book);
    if (!backgroundUrl) {
      els.reader.style.background = DEFAULT_READER_BACKGROUND;
      return;
    }

    els.reader.style.background = `linear-gradient(to top, rgba(2, 5, 10, 0.78) 0%, rgba(2, 5, 10, 0.38) 60%, rgba(2, 5, 10, 0.32) 100%), url(${safeCssUrl(backgroundUrl)}) center / cover no-repeat`;
  }

  function renderReaderBookCover(book) {
    if (!els.readerBookCover) return;
    const coverUrl = safeText(book?.coverImageUrl);
    els.readerBookCover.style.backgroundImage = coverUrl
      ? `url(${safeCssUrl(coverUrl)})`
      : 'linear-gradient(155deg, #2a5bcf, #28a7d5)';
  }

  function renderReaderAvatar() {
    if (!els.readerAvatarImage || !els.readerAvatarFallback) return;
    const profile = state.user || state.localProfile || {};
    const avatar = safeText(profile.avatarImage);
    const username = safeText(profile.username) || 'Jogador';
    if (els.readerUserName) {
      els.readerUserName.textContent = splitBalancedLines(username);
    }
    if (avatar) {
      els.readerAvatarImage.src = avatar;
      els.readerAvatarImage.hidden = false;
      els.readerAvatarFallback.hidden = true;
      return;
    }
    els.readerAvatarImage.removeAttribute('src');
    els.readerAvatarImage.hidden = true;
    els.readerAvatarFallback.hidden = false;
    els.readerAvatarFallback.textContent = username.charAt(0).toUpperCase() || 'P';
  }

  function renderReaderModeUi() {
    const isTraining = state.readerMode === 'pronounce-training';
    const activeBook = findActiveReaderBook();
    if (els.reader) {
      els.reader.dataset.readerMode = isTraining ? 'pronounce-training' : 'free-read';
    }
    if (els.readerBookHero) {
      els.readerBookHero.hidden = isTraining;
    }
    if (!isTraining) {
      renderReaderBookCover(activeBook);
    }
    if (els.readerProfile) {
      els.readerProfile.hidden = !isTraining;
    }
    if (els.readerUserName) {
      els.readerUserName.hidden = true;
    }
    if (els.readerTraining) {
      els.readerTraining.hidden = !isTraining;
    }
    if (els.readerPronPercent) {
      els.readerPronPercent.hidden = !isTraining;
    }
    if (els.readerMicBtn) {
      els.readerMicBtn.disabled = !isTraining || state.readerMicBusy || state.readerFinishing;
    }
    updateReaderLanguageButtons();
    updateReaderPronPercent();
  }

  function renderReader() {
    if (!els.readerEnglish) return;
    const total = state.readerCards.length;
    const index = Math.max(0, Math.min(total - 1, state.readerIndex));
    state.readerIndex = index;
    const card = total ? state.readerCards[index] : null;
    const english = safeText(card?.english);
    const portuguese = safeText(card?.portuguese || english);
    const highlight = Boolean(card?.highlight);
    const displayLanguage = state.readerDisplayLanguage === 'portuguese' ? 'portuguese' : 'english';
    const displayText = displayLanguage === 'portuguese' ? portuguese : english;
    const displayTextFormatted = splitBalancedLines(displayText);
    if (state.readerRenderedCardIndex !== index) {
      state.readerRenderedCardIndex = index;
      state.readerCardShownAt = Date.now();
    }
    els.readerEnglish.textContent = displayTextFormatted || 'Sem conteudo neste livro.';
    els.readerEnglish.classList.toggle('is-highlight', highlight && displayLanguage === 'english');
    animateReaderPhrase();
    void playReaderCardAudio(card, index);
    updateReaderProgress(total, index);
    renderReaderModeUi();
  }

  function closeReader() {
    stopReaderAudio();
    state.readerFinishToken += 1;
    state.readerFinishing = false;
    resetReaderFinishUi();
    setReaderVisible(false);
    state.readerBookId = '';
    state.readerMode = 'free-read';
    state.readerCards = [];
    state.readerIndex = 0;
    state.readerDisplayLanguage = 'english';
    state.readerScores = [];
    state.readerMicBusy = false;
    state.readerLastAudioKey = '';
    state.readerCardShownAt = 0;
    state.readerRenderedCardIndex = -1;
    setReaderTrainingStatus('');
    setReaderMicLive(false);
  }

  function stepReader(delta) {
    if (!state.readerOpen || !state.readerCards.length || state.readerFinishing) return;
    const isForward = Number(delta) > 0;
    if (state.readerMode === 'free-read' && isForward) {
      const elapsed = Date.now() - (Number(state.readerCardShownAt) || 0);
      if (elapsed < READER_FREE_READ_MIN_VIEW_MS) {
        triggerReaderBlockedBookFlash();
        return;
      }
    }
    const next = Math.max(0, Math.min(state.readerCards.length - 1, state.readerIndex + delta));
    if (next === state.readerIndex) {
      if (state.readerMode === 'free-read' && isForward && state.readerIndex >= (state.readerCards.length - 1)) {
        void runFreeReadCompletionSequence();
      }
      return;
    }
    state.readerIndex = next;
    renderReader();
  }

  async function fetchBookCards(book) {
    const storyId = safeText(book?.selectedStoryId || (Array.isArray(book?.storyIds) ? book.storyIds[0] : ''));
    if (!storyId) return [];
    const response = await fetch(buildApiUrl(`/api/speaking/cards?storyId=${encodeURIComponent(storyId)}`), {
      credentials: 'include',
      headers: buildAuthHeaders(),
      cache: 'no-store'
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.success || !Array.isArray(payload.cards)) {
      throw new Error(payload?.message || 'Nao foi possivel abrir o livro.');
    }
    return payload.cards
      .map((entry) => {
        const english = safeText(entry?.english || entry?.en);
        const portuguese = safeText(entry?.portuguese || entry?.pt || english);
        const audio = safeText(entry?.audio || entry?.audioUrl);
        if (!english) return null;
        return {
          english,
          portuguese,
          audio,
          highlight: Boolean(entry?.highlight)
        };
      })
      .filter(Boolean);
  }

  async function startBookByMode(book, mode, providedCards) {
    if (!book) return;
    try {
      const cards = Array.isArray(providedCards) ? providedCards : await fetchBookCards(book);
      stopReaderAudio();
      applyReaderBackground(book);
      state.readerFinishToken += 1;
      state.readerFinishing = false;
      resetReaderFinishUi();
      setReaderVisible(true);
      state.readerBookId = safeText(book.bookId);
      state.readerMode = mode === 'pronounce-training' ? 'pronounce-training' : 'free-read';
      state.readerCards = cards.length
        ? cards
        : [{
          english: 'Este livro nao tem frases em ingles ainda.',
          portuguese: 'Este livro nao tem frases em ingles ainda.',
          audio: ''
        }];
      state.readerScores = [];
      state.readerDisplayLanguage = 'english';
      state.readerMicBusy = false;
      state.readerLastAudioKey = '';
      state.readerCardShownAt = 0;
      state.readerRenderedCardIndex = -1;
      state.readerIndex = 0;
      renderReaderAvatar();
      renderReaderBookCover(book);
      setReaderTrainingStatus('');
      renderReader();
      setStatus('', null);
    } catch (error) {
      closeReader();
      setStatus(error?.message || 'Nao foi possivel abrir o livro.', 'error');
    }
  }

  async function handleReaderMicTraining() {
    if (!state.readerOpen || state.readerMode !== 'pronounce-training' || state.readerMicBusy || state.readerFinishing) return;
    const card = state.readerCards[state.readerIndex];
    if (!card || !safeText(card.english)) return;

    stopReaderAudio();
    state.readerMicBusy = true;
    renderReaderModeUi();
    setReaderTrainingStatus('');
    setReaderMicLive(true);

    try {
      const transcript = safeText(await captureSpeechFast('en-US'));
      const score = calculateSpeechMatchPercent(card.english, transcript);
      state.readerScores.push(score);
      updateReaderPronPercent();
      setReaderTrainingStatus(`Pronuncia: ${score}%`);
      if (state.readerIndex < (state.readerCards.length - 1)) {
        window.setTimeout(() => {
          stepReader(1);
        }, 220);
      } else {
        setReaderTrainingStatus(`Pronuncia: ${score}% - fim do livro.`);
        await runReaderBookCompletionSequence();
      }
    } catch (error) {
      setReaderTrainingStatus(error?.message || 'Nao foi possivel capturar sua fala.');
    } finally {
      state.readerMicBusy = false;
      setReaderMicLive(false);
      renderReaderModeUi();
    }
  }

  function bindEvents() {
    els.prevLevelBtn?.addEventListener('click', () => {
      void setLevel(state.selectedLevel - 1);
    });

    els.nextLevelBtn?.addEventListener('click', () => {
      void setLevel(state.selectedLevel + 1);
    });

    els.shelfViewport?.addEventListener('wheel', (event) => {
      if (isOverlayOpen()) return;
      const deltaY = Number(event.deltaY) || 0;
      if (Math.abs(deltaY) < 4) return;
      event.preventDefault();
      state.shelfLastGestureAt = Date.now();
      void snapShelfByStep(deltaY > 0 ? 1 : -1);
    }, { passive: false });

    els.shelfViewport?.addEventListener('touchstart', (event) => {
      const touch = event.touches?.[0];
      if (!touch) return;
      state.shelfTouchStartX = Number(touch.clientX) || 0;
      state.shelfTouchStartY = Number(touch.clientY) || 0;
      state.shelfGestureMoved = false;
    }, { passive: true });

    els.shelfViewport?.addEventListener('touchmove', (event) => {
      if (isOverlayOpen()) return;
      const touch = event.touches?.[0];
      if (!touch) return;
      const dx = (Number(touch.clientX) || 0) - state.shelfTouchStartX;
      const dy = (Number(touch.clientY) || 0) - state.shelfTouchStartY;
      if (Math.abs(dy) > 10 || Math.abs(dx) > 10) {
        state.shelfGestureMoved = true;
        event.preventDefault();
      }
    }, { passive: false });

    els.shelfViewport?.addEventListener('touchend', (event) => {
      if (isOverlayOpen()) return;
      const touch = event.changedTouches?.[0];
      if (!touch) return;
      const endY = Number(touch.clientY) || 0;
      const endX = Number(touch.clientX) || 0;
      const dy = state.shelfTouchStartY - endY;
      const dx = endX - state.shelfTouchStartX;
      if (state.shelfGestureMoved) {
        state.shelfLastGestureAt = Date.now();
      }
      if (Math.abs(dx) >= LEVEL_SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) {
          void setLevel(state.selectedLevel + 1);
        } else {
          void setLevel(state.selectedLevel - 1);
        }
        return;
      }
      if (Math.abs(dy) < BOOK_SWIPE_THRESHOLD || Math.abs(dy) <= Math.abs(dx)) return;
      void snapShelfByStep(dy > 0 ? 1 : -1);
    }, { passive: true });

    els.adminUiToggleBtn?.addEventListener('click', () => {
      state.forceAdminUi = !state.forceAdminUi;
      persistForceAdminUiFlag(state.forceAdminUi);
      renderAdminUiToggle();
      renderCards();
      if (isAdminUiEnabled()) {
        setStatus('Ferramentas admin visiveis. As APIs ainda validam permissao real.', null);
      } else {
        setStatus('', null);
      }
    });

    els.createBookBtn?.addEventListener('click', () => {
      openCreateModal();
    });

    els.createSubmitBtn?.addEventListener('click', () => {
      void createBookFromLines();
    });

    els.createWriteBtn?.addEventListener('click', () => {
      void writeCreateBookWithNano();
    });

    els.createCloseBtn?.addEventListener('click', () => {
      closeCreateModal();
    });

    els.createModal?.addEventListener('click', (event) => {
      if (event.target === els.createModal && !state.createBusy && !state.createWriteBusy) {
        closeCreateModal();
      }
    });

    els.createInput?.addEventListener('input', () => {
      renderCreateInputPreview();
      syncCreatePreviewScroll();
    });

    els.createInput?.addEventListener('scroll', () => {
      syncCreatePreviewScroll();
    });

    els.createCharsInput?.addEventListener('change', () => {
      if (!els.createCharsInput) return;
      els.createCharsInput.value = String(readCreateTargetChars());
    });

    els.coverUploadInput?.addEventListener('change', (event) => {
      const file = event?.target?.files?.[0];
      if (!state.isAdmin || !file || !state.uploadTargetBookId) return;
      void uploadCoverForBook(state.uploadTargetBookId, file);
    });

    els.magicGenerateBtn?.addEventListener('click', () => {
      generateAndSaveMagicForBook();
    });

    els.magicCloseBtn?.addEventListener('click', () => {
      closeMagicModal();
    });

    els.magicModal?.addEventListener('click', (event) => {
      if (event.target === els.magicModal) {
        closeMagicModal();
      }
    });

    els.jsonSaveBtn?.addEventListener('click', () => {
      void saveJsonForBook();
    });

    els.jsonCloseBtn?.addEventListener('click', () => {
      closeJsonModal();
    });

    els.jsonModal?.addEventListener('click', (event) => {
      if (event.target === els.jsonModal) {
        closeJsonModal();
      }
    });

    els.modeFreeReadBtn?.addEventListener('click', () => {
      void startBookFromModeModal('free-read');
    });

    els.modePronounceBtn?.addEventListener('click', () => {
      void startBookFromModeModal('pronounce-training');
    });

    els.modeCloseBtn?.addEventListener('click', () => {
      closeModeModal();
    });

    els.modeModal?.addEventListener('click', (event) => {
      if (event.target === els.modeModal) {
        closeModeModal();
      }
    });

    els.readerBackBtn?.addEventListener('click', () => {
      if (state.readerFinishing) return;
      closeReader();
    });

    els.readerLangEnglishBtn?.addEventListener('click', () => {
      if (!state.readerOpen || state.readerFinishing) return;
      state.readerDisplayLanguage = 'english';
      renderReader();
    });

    els.readerLangPortugueseBtn?.addEventListener('click', () => {
      if (!state.readerOpen || state.readerFinishing) return;
      state.readerDisplayLanguage = 'portuguese';
      renderReader();
    });

    els.readerMicBtn?.addEventListener('click', () => {
      void handleReaderMicTraining();
    });

    els.readerContent?.addEventListener('touchstart', (event) => {
      const touch = event.touches?.[0];
      if (!touch) return;
      state.readerTouchStartX = Number(touch.clientX) || 0;
      state.readerTouchStartY = Number(touch.clientY) || 0;
    }, { passive: true });

    els.readerContent?.addEventListener('touchend', (event) => {
      if (state.readerFinishing) return;
      const touch = event.changedTouches?.[0];
      if (!touch) return;
      const endX = Number(touch.clientX) || 0;
      const endY = Number(touch.clientY) || 0;
      const dx = endX - state.readerTouchStartX;
      const dy = endY - state.readerTouchStartY;
      if (Math.abs(dx) < 45 || Math.abs(dx) <= Math.abs(dy)) return;
      if (dx < 0) {
        stepReader(1);
      } else {
        stepReader(-1);
      }
    }, { passive: true });

    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && state.createModalOpen && !state.createBusy && !state.createWriteBusy) {
        event.preventDefault();
        closeCreateModal();
        return;
      }
      if (!state.readerOpen) return;
      if (state.readerFinishing) return;
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        stepReader(1);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        stepReader(-1);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        closeReader();
      } else if ((event.key === 'Enter' || event.key === ' ') && state.readerMode === 'pronounce-training') {
        event.preventDefault();
        void handleReaderMicTraining();
      }
    });

    window.addEventListener('resize', () => {
      syncShelfViewportHeight();
      if (state.readerOpen && state.readerBookId) {
        const activeBook = state.books.find((entry) => safeText(entry?.bookId) === state.readerBookId);
        if (!activeBook) return;
        applyReaderBackground(activeBook);
        return;
      }
      if (isOverlayOpen()) return;
      state.shelfIndex = clampShelfIndex(state.shelfIndex);
      void scrollShelfToIndex(state.shelfIndex, false);
    });
  }

  async function init() {
    bindEvents();
    renderCreateInputPreview();
    syncCreatePreviewScroll();
    setCreateBusy(false);
    state.gradients = buildGradientPool();
    state.forceAdminUi = readForceAdminUiFlag();
    renderShelfLoading();
    renderLevelMenu();
    renderAdminUiToggle();
    state.localProfile = readLocalPlayerProfile();

    const [sessionUser, books] = await Promise.all([
      fetchSessionUser(),
      fetchStories()
    ]);

    state.user = sessionUser;
    state.isAdmin = Boolean(sessionUser?.isAdmin)
      || isAdminAlias(sessionUser?.username)
      || isAdminAlias(state.localProfile?.username);
    state.books = Array.isArray(books) ? books : [];
    if (state.isAdmin) {
      await refreshCreateJobs({ ignoreTransitions: true });
    }

    const firstBook = getBooksForSelectedLevel()[0];
    const firstCoverUrl = safeText(firstBook?.coverImageUrl);
    if (firstCoverUrl) {
      await preloadImageUrl(firstCoverUrl);
    }
    state.initialLoading = false;
    renderShelfLoading();

    renderAvatar();
    renderLevelMenu();
    renderAdminUiToggle();
    renderCards();
    syncShelfViewportHeight();
    void scrollShelfToIndex(state.shelfIndex, false);

    if (state.isAdmin) {
      if (hasRunningCreateJobs()) {
        scheduleCreateJobsPoll(CREATE_JOBS_POLL_MS);
      }
      if (sessionUser?.isAdmin || isAdminAlias(sessionUser?.username)) {
        setStatus('Modo admin ativo: upload e varinha disponiveis no card.', null);
      } else {
        setStatus('Admin local detectado. Se o servidor bloquear upload/IA, faça login em /account e volte.', null);
      }
    } else {
      setStatus('', null);
    }
  }

  init();
})();
