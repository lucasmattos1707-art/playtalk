(function initPlaytalkBooksPage() {
  const URL_PARAMS = new URLSearchParams(window.location.search || '');
  const EMBED_MODE = String(URL_PARAMS.get('embed') || '').trim().toLowerCase();
  const IS_MYBOOKS_GRID_EMBED = EMBED_MODE === 'mybooks-grid';
  const ADMIN_ALIASES = new Set(['admin', 'adm', 'adminst']);
  const MAX_GRADIENTS = 8;
  const SESSION_ENDPOINTS = ['/auth/session', '/api/me'];
  const DEFAULT_READER_BACKGROUND = 'transparent';
  const FORCE_ADMIN_UI_STORAGE_KEY = 'playtalk_books_force_admin_ui_v1';
  const MODE_DISSOLVE_MS = 2000;
  const MODE_LOADING_FADE_MS = 500;
  const PREBOOK_INSIGHT_ROTATE_MS = 1500;
  const PREBOOK_INSIGHT_FADE_MS = 180;
  const BOOK_SNAP_DURATION_MS = 300;
  const LEVEL_SLIDE_DURATION_MS = 420;
  const BOOK_SWIPE_THRESHOLD = 44;
  const LEVEL_SWIPE_THRESHOLD = 54;
  const CREATE_MIN_LINES = 7;
  const CREATE_MAX_PHRASE_PAIRS = 120;
  const CREATE_JOBS_POLL_MS = 2200;
  const CREATE_EDIT_COVER_SENTINEL = 'Capa';
  const CREATE_EDIT_BACKGROUND_SENTINEL = 'Background';
  const READER_FINISH_DISSOLVE_MS = 500;
  const READER_FINISH_BOOK_ENTER_MS = 500;
  const READER_FINISH_LINE_STEP_MS = 1000;
  const READER_FINISH_LINE_ENTER_MS = 260;
  const READER_FREE_READ_MIN_VIEW_MS = 3000;
  const READER_BLOCKED_FLASH_MS = 750;
  const BOOKS_STATS_SYNC_MS = 30 * 1000;
  const BOOKS_LISTENING_FLUSH_BATCH_CHARS = 250;
  const BOOKS_PRONUNCIATION_SAMPLE_LIMIT = 300;
  const SCORE_ANIMATION_MS = 1000;
  const PREBOOK_OVERLAY_MS = 1000;
  const HOME_REPEAT_OPTIONS = [1, 2, 3, 5, 7, 10];
  const HOME_SPEED_OPTIONS = [0.7, 0.8, 0.9, 1, 1.25, 1.5, 2];
  const HOME_BOOK_TRANSITION_MS = 600;
  const HOME_BOOK_META_ROTATE_MS = 2400;
  const HOME_SWIPE_UP_THRESHOLD = 70;
  const HOME_SWIPE_DOWN_THRESHOLD = 70;
  const HOME_WHEEL_THRESHOLD = 18;
  const ALL_BOOKS_WINDOW_SIZE = 6;
  const MAX_BOOK_LEVEL = 100;
  const SMARTBOOKS_PER_UNLOCK_LEVEL = 5;
  // UI levels:
  // 0 = Home
  // 1 = MyBooks
  // 2 = Books (all books feed)
  // 3.. map to book levels 1..MAX_BOOK_LEVEL
  const UI_LEVEL_HOME = 0;
  const UI_LEVEL_MY_BOOKS = 1;
  const UI_LEVEL_ALL_BOOKS = 2;
  const UI_FIRST_BOOK_LEVEL = 3;
  const MAX_UI_LEVEL = UI_FIRST_BOOK_LEVEL + MAX_BOOK_LEVEL - 1;
  const DEFAULT_HOME_REPEAT_INDEX = Math.max(0, HOME_REPEAT_OPTIONS.indexOf(5));
  const MY_BOOKS_BADGES = [
    { minPercent: 98, src: '/medalhas/diamante.png', alt: 'Selo diamante' },
    { minPercent: 94, src: '/medalhas/ouro.png', alt: 'Selo ouro' },
    { minPercent: 92, src: '/medalhas/platina.png', alt: 'Selo platina' },
    { minPercent: 90, src: '/medalhas/emerald.png', alt: 'Selo esmeralda' },
    { minPercent: 85, src: '/medalhas/quartz.png', alt: 'Selo quartz' },
    { minPercent: 80, src: '/medalhas/prata.png', alt: 'Selo prata' }
  ];

  const LISTENING_CHARS_PENDING_KEY = 'playtalk_books_listening_chars_pending_v1';
  const LISTENING_CHARS_TOTAL_KEY = 'playtalk_books_listening_chars_total_v1';
  const DEFAULT_PROFILE_AVATAR = '/Avatar/profile-neon-blue.svg';
  const READING_CHARS_PENDING_KEY = 'playtalk_books_reading_chars_pending_v1';
  const READING_CHARS_TOTAL_KEY = 'playtalk_books_reading_chars_total_v1';
  const BOOKS_PRONUNCIATION_FLUSH_BATCH_SIZE = 6;
  const BOOKS_READING_FLUSH_BATCH_CHARS = 250;
  const BOOKS_PRACTICE_FLUSH_BATCH_SECONDS = 60;
  const READER_PRACTICE_CAP_SECONDS = 10;
  const HOME_MUSIC_PLAYLIST = [
    'https://pub-1208463a3c774431bf7e0ddcbd3cf670.r2.dev/musicas/zen1.mp3',
    'https://pub-1208463a3c774431bf7e0ddcbd3cf670.r2.dev/musicas/zen2.mp3',
    'https://pub-1208463a3c774431bf7e0ddcbd3cf670.r2.dev/musicas/zen3.mp3',
    'https://pub-1208463a3c774431bf7e0ddcbd3cf670.r2.dev/musicas/zen4.mp3'
  ];
  // Book-only display names (index = book level). Keep this stable because admin create parsing relies on it.
  const BOOK_LEVEL_DISPLAY_NAMES = [
    'Home',
    'Básico',
    'Aprendiz',
    'Estudante',
    'Leitor',
    'Intermediário',
    'Experiente',
    'Avançado',
    'Nativo',
    'Fluente',
    'Expert'
  ];
  const BOOK_LEVEL_DISPLAY_NAMES_100 = {
    9: BOOK_LEVEL_DISPLAY_NAMES[1],
    19: BOOK_LEVEL_DISPLAY_NAMES[2],
    29: BOOK_LEVEL_DISPLAY_NAMES[3],
    39: BOOK_LEVEL_DISPLAY_NAMES[4],
    49: BOOK_LEVEL_DISPLAY_NAMES[5],
    59: BOOK_LEVEL_DISPLAY_NAMES[6],
    69: BOOK_LEVEL_DISPLAY_NAMES[7],
    79: BOOK_LEVEL_DISPLAY_NAMES[8],
    89: BOOK_LEVEL_DISPLAY_NAMES[9],
    99: BOOK_LEVEL_DISPLAY_NAMES[10]
  };
  const STARFIELD_RANGE = 2000;
  const STARFIELD_CONFIG = [
    { id: 'stars', count: 700 },
    { id: 'stars2', count: 200 },
    { id: 'stars3', count: 100 }
  ];
  const HOME_AUDIO_DURATION_CACHE = new Map();
  const BOOK_READING_TIME_CACHE = new Map();
  const BOOK_ENGLISH_CHAR_CACHE = new Map();
  const NUMBER_ANIMATION_HANDLES = new WeakMap();
  const HOME_UPCOMING_SESSION_TARGET = 2;
  const HOME_AUDIO_PREROLL_CARD_COUNT = 2;

  const els = {
    page: document.querySelector('.books-page'),
    homeBookBackgroundPrimary: document.getElementById('booksHomeBookBackgroundPrimary'),
    homeBookBackgroundSecondary: document.getElementById('booksHomeBookBackgroundSecondary'),
    levelMenu: document.getElementById('booksLevelMenu'),
    adminUiToggleBtn: document.getElementById('booksAdminUiToggleBtn'),
    createBookBtn: document.getElementById('booksCreateBookBtn'),
    prevLevelBtn: document.getElementById('booksLevelPrevBtn'),
    nextLevelBtn: document.getElementById('booksLevelNextBtn'),
    levelTitle: document.getElementById('booksLevelTitle'),
    levelSubtitle: document.getElementById('booksLevelSubtitle'),
    topHomeBtn: document.getElementById('booksTopHomeBtn'),
    status: document.getElementById('booksStatus'),
    shelfViewport: document.getElementById('booksShelfViewport'),
    shelfLoading: document.getElementById('booksShelfLoading'),
    statsPanel: document.getElementById('booksStatsPanel'),
    statsIcon: document.getElementById('booksStatsIcon'),
    statsLabel: document.getElementById('booksStatsLabel'),
    statsValue: document.getElementById('booksStatsValue'),
    statsLine: document.getElementById('booksStatsLine'),
    adminSummary: document.getElementById('booksAdminSummary'),
    adminSummaryTotalBooks: document.getElementById('booksAdminTotalBooks'),
    adminSummaryUniqueWords: document.getElementById('booksAdminUniqueWords'),
    adminSummaryHint: document.getElementById('booksAdminSummaryHint'),
    homePanel: document.getElementById('booksHomePanel'),
    homeShell: document.getElementById('booksHomeShell'),
    homeViewport: document.getElementById('booksHomeViewport'),
    homeStartPanel: document.getElementById('booksHomeStartPanel'),
    homeAuthForm: document.getElementById('booksHomeAuthForm'),
    homeLoginInput: document.getElementById('booksHomeLoginInput'),
    homePasswordInput: document.getElementById('booksHomePasswordInput'),
    homeAuthStatus: document.getElementById('booksHomeAuthStatus'),
    homeStartBtn: document.getElementById('booksHomeStartBtn'),
    homeCollectBtn: document.getElementById('booksHomeCollectBtn'),
    homeLaunchBtn: document.getElementById('booksHomeLaunchBtn'),
    homeAccountPanel: document.getElementById('booksHomeAccountPanel'),
    homeAccountStatus: document.getElementById('booksHomeAccountStatus'),
    homePremiumLevel: document.getElementById('booksHomePremiumLevel'),
    homePremiumUntil: document.getElementById('booksHomePremiumUntil'),
    homeSwitchAccountBtn: document.getElementById('booksHomeSwitchAccountBtn'),
    homePremiumBtn: document.getElementById('booksHomePremiumBtn'),
    homeCover: document.getElementById('booksHomeCover'),
    sleepFabMeta: document.getElementById('booksSleepFabMeta'),
    homeNextCover: document.getElementById('booksHomeNextCover'),
    homeTextPanel: document.getElementById('booksHomeTextPanel'),
    homeNextTextPanel: document.getElementById('booksHomeNextTextPanel'),
    homeControls: document.getElementById('booksHomeControls'),
    homeMissionSummary: document.getElementById('booksHomeMissionSummary'),
    homeMissionDailyLabel: document.getElementById('booksHomeMissionDailyLabel'),
    homeMissionSmartbooksLabel: document.getElementById('booksHomeMissionSmartbooksLabel'),
    homeMissionFill: document.getElementById('booksHomeMissionFill'),
    homeCornerHomeBtn: document.getElementById('booksHomeCornerHomeBtn'),
    homeCornerPlayBtn: document.getElementById('booksHomeCornerPlayBtn'),
    homeBlackoutToggle: document.getElementById('booksHomeBlackoutToggle'),
    blackoutScreen: document.getElementById('booksBlackoutScreen'),
    homeSleepFab: document.getElementById('booksHomeSleepFab'),
    playerBooksProgressTime: document.getElementById('playerBooksProgressTime'),
    playerBooksProgressTrack: document.getElementById('playerBooksProgressTrack'),
    playerBooksProgressFill: document.getElementById('playerBooksProgressFill'),
    homeRepeatBtn: document.getElementById('booksHomeRepeatBtn'),
    homeRepeatLabel: document.getElementById('booksHomeRepeatLabel'),
    homeMusicBtn: document.getElementById('booksHomeMusicBtn'),
    homePauseBtn: document.getElementById('booksHomePauseBtn'),
    homeSpeedBtn: document.getElementById('booksHomeSpeedBtn'),
    homeSpeedLabel: document.getElementById('booksHomeSpeedLabel'),
    homeLanguageBtn: document.getElementById('booksHomeLanguageBtn'),
    homeLanguageIcon: document.getElementById('booksHomeLanguageIcon'),
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
    createCard: document.getElementById('booksCreateCard'),
    createModalTitle: document.getElementById('booksCreateModalTitle'),
    createEditor: document.getElementById('booksCreateEditor'),
    createPreview: document.getElementById('booksCreatePreview'),
    createInput: document.getElementById('booksCreateInput'),
    createVoiceSelect: document.getElementById('booksCreateVoiceSelect'),
    createIdeaControl: document.getElementById('booksCreateIdeaControl'),
    createIdeaInput: document.getElementById('booksCreateIdeaInput'),
    createCharsControl: document.getElementById('booksCreateCharsControl'),
    createCharsInput: document.getElementById('booksCreateCharsInput'),
    createWriteBtn: document.getElementById('booksCreateWriteBtn'),
    createSubmitBtn: document.getElementById('booksCreateSubmitBtn'),
    createCloseBtn: document.getElementById('booksCreateCloseBtn'),
    preBookModal: document.getElementById('booksPreBookModal'),
    preBookCard: document.getElementById('booksPreBookCard'),
    preBookActions: document.getElementById('booksPreBookActions'),
    preBookLoading: document.getElementById('booksPreBookLoading'),
    preBookCover: document.getElementById('booksPreBookCover'),
    preBookRankedBtn: document.getElementById('booksPreBookRankedBtn'),
    preBookPronounceBtn: document.getElementById('booksPreBookPronounceBtn'),
    preBookNoEnergyHint: document.getElementById('booksPreBookNoEnergyHint'),
    preBookListeningBtn: document.getElementById('booksPreBookListeningBtn'),
    preBookSpeakingBtn: document.getElementById('booksPreBookSpeakingBtn'),
    preBookInsights: document.getElementById('booksPreBookInsights'),
    preBookInsightIcon: document.getElementById('booksPreBookInsightIcon'),
    preBookInsightLabel: document.getElementById('booksPreBookInsightLabel'),
    preBookInsightValue: document.getElementById('booksPreBookInsightValue'),
    preBookCloseBtn: document.getElementById('booksPreBookCloseBtn'),
    reader: document.getElementById('booksReader'),
    readerBackBtn: document.getElementById('booksReaderBackBtn'),
    readerContent: document.getElementById('booksReaderContent'),
    readerBookHero: document.getElementById('booksReaderBookHero'),
    readerBookCover: document.getElementById('booksReaderBookCover'),
    readerProfile: document.getElementById('booksReaderProfile'),
    readerEnglish: document.getElementById('booksReaderEnglish'),
    readerPortuguese: document.getElementById('booksReaderPortuguese'),
    readerTraining: document.getElementById('booksReaderTraining'),
    readerAvatarImage: document.getElementById('booksReaderAvatarImage'),
    readerAvatarFallback: document.getElementById('booksReaderAvatarFallback'),
    readerCurrentBadge: document.getElementById('booksReaderCurrentBadge'),
    readerUserName: document.getElementById('booksReaderUserName'),
    readerPronRing: document.getElementById('booksReaderPronRing'),
    readerPronPercent: document.getElementById('booksReaderPronPercent'),
    readerCurrentScore: document.getElementById('booksReaderCurrentScore'),
    readerLangEnglishBtn: document.getElementById('booksReaderLangEnglishBtn'),
    readerLangPortugueseBtn: document.getElementById('booksReaderLangPortugueseBtn'),
    readerReplayBtn: document.getElementById('booksReaderReplayBtn'),
    readerHidePortugueseBtn: document.getElementById('booksReaderHidePortugueseBtn'),
    readerMicBtn: document.getElementById('booksReaderMicBtn'),
    readerMicScore: document.getElementById('booksReaderMicScore'),
    readerTrainingStatus: document.getElementById('booksReaderTrainingStatus'),
    readerProgressFill: document.getElementById('booksReaderProgressFill'),
    readerFinish: document.getElementById('booksReaderFinish'),
    readerFinishCover: document.getElementById('booksReaderFinishCover'),
    readerFinishFlash: document.getElementById('booksReaderFinishFlash'),
    readerFinishLine: document.getElementById('booksReaderFinishLine'),
    readerAdminAudioModal: document.getElementById('booksReaderAdminAudioModal'),
    readerAdminAudioTextInput: document.getElementById('booksReaderAdminAudioTextInput'),
    readerAdminAudioVoiceSelect: document.getElementById('booksReaderAdminAudioVoiceSelect'),
    readerAdminAudioCloseBtn: document.getElementById('booksReaderAdminAudioCloseBtn'),
    readerAdminAudioSubmitBtn: document.getElementById('booksReaderAdminAudioSubmitBtn')
  };

  const state = {
    user: null,
    localProfile: null,
    initialLoading: true,
    selectedLevel: UI_FIRST_BOOK_LEVEL,
    userSelectedBookLevel: false,
    stats: null,
    statsRotationTimer: 0,
    statsRotationIndex: 0,
    statsLastRenderedLine: '',
    statsFetchInFlight: false,
    dailyMissionFetchInFlight: false,
    dailyMission: null,
    missionCardToggleTimer: 0,
    missionCardShowDaily: false,
    adminBooksSummary: null,
    books: [],
    isAdmin: false,
    forceAdminUi: false,
    uploadInFlight: false,
    uploadTargetBookId: '',
    deleteConfirmBookId: '',
    deleteBusyBookId: '',
    gradients: [],
    magicBookId: '',
    magicProcessingBookIds: new Set(),
    jsonBookId: '',
    createModalOpen: false,
    createMode: 'create',
    createEditBookId: '',
    createOriginalLines: [],
    createBusy: false,
    createWriteBusy: false,
    createJobs: [],
    createJobsPollTimer: 0,
    createJobsPollInFlight: false,
    createJobStatusById: new Map(),
    modeBookId: '',
    modeBook: null,
    preBookStep: 'root',
    preBookRankedMode: true,
    preBookInsightsRotationTimer: 0,
    preBookInsightsIndex: 0,
    preBookInsightsData: [],
    preBookInsightsFetchToken: 0,
    preBookHiddenCardId: '',
    modeStartBusy: false,
    modeStartToken: 0,
    readerOpen: false,
    readerBookId: '',
    readerMode: 'free-read',
    readerRankedMode: true,
    readerCards: [],
    readerIndex: 0,
    readerDisplayLanguage: 'english',
    readerVisualLanguage: 'english',
    readerListeningRevealPortuguese: false,
    readerScores: [],
    readerCurrentScore: null,
    readerCurrentBadgeSrc: '',
    readerCurrentBadgeRank: 0,
    readerCurrentBadgeTimer: 0,
    readerSessionListenedMs: 0,
    readerSessionSpokenChars: 0,
    readerMicBusy: false,
    readerMicScoreTimer: 0,
    readerAudioToken: 0,
    readerAudioElement: null,
    readerLastAudioKey: '',
    readerCardShownAt: 0,
    readerRenderedCardIndex: -1,
    readerInlineEditing: false,
    readerInlineEditTouchStartY: 0,
    readerAdminAudioBusy: false,
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
    shelfAnimationToken: 0,
    homeSleepActive: false,
    homeIntroDismissed: false,
    homeStartBusy: false,
    homeAuthBusy: false,
    homePlaybackToken: 0,
    homePlaybackLoopRunningToken: 0,
    homeAudioElement: null,
    homeVoiceAudioElement: null,
    homeCurrentBookId: '',
    homeCurrentBookCover: '',
    homeCurrentBookName: '',
    homeCurrentSession: null,
    homeNextSession: null,
    homeUpcomingSessions: [],
    homeSessionHistory: [],
    homePendingSession: null,
    homePendingDirection: 'next',
    homeCurrentCards: [],
    homeCurrentCardIndex: 0,
    homeCurrentCardText: '',
    homeCurrentCardTextPt: '',
    homeTextVisible: true,
    homeTextRevealToken: 0,
    homeTextMode: 'english',
    homeBookMetaIndex: 0,
    homeBookMetaRotationTimer: 0,
    homeSpeedIndex: 1,
    homeProgressRatio: 0,
    homeProgressLabel: '',
    homeProgressElapsedSeconds: 0,
    homeProgressTotalSeconds: 0,
    homePaused: false,
    homeProgressDragging: false,
    homeAudioResolver: null,
    homeAudioInterrupted: false,
    homeAudioPracticeAnchorTime: null,
    homeSkipRequested: false,
    homeSeekTarget: null,
    homeTransitioning: false,
    homeBackgroundUrl: '',
    homeBackgroundLayer: 'primary',
    homeTouchStartX: 0,
    homeTouchStartY: 0,
    homeRepeatIndex: DEFAULT_HOME_REPEAT_INDEX,
    homeMusicEnabled: true,
    homeBlackoutActive: false,
    homeMusicAudioElement: null,
    homeMusicIndex: 0,
    homePreBookPausedBefore: false,
    homePreBookVoiceVolumeBefore: 1,
    homeNativeSleepLockEnabled: false,
    energyRedirectInProgress: false,
    welcomeModesUsersEnabled: true,
    allBooksFeed: [],
    allBooksFeedVersion: '',
    allBooksWindowStart: 0,
    allBooksSentinelMode: false,
    allBooksAdvancePending: 0,
    readingCharsPending: 0,
    readingCharsTotal: 0,
    homeLastReadingKey: '',
    readerLastReadingKey: '',
    listeningCharsPending: 0,
    listeningCharsTotal: 0,
    practiceSecondsPending: 0,
    practiceSecondsTotal: 0,
    listeningFlushInFlight: false,
    booksPronunciationPending: [],
    booksPronunciationFlushInFlight: false,
    booksSyncTimer: 0,
    energyDepletionWatch: null
  };

  const homePanelMount = {
    parent: els.homePanel?.parentElement || null,
    nextSibling: els.homePanel?.nextSibling || null
  };

  function applyMyBooksGridEmbedUi() {
    if (!IS_MYBOOKS_GRID_EMBED || document.getElementById('booksEmbedMybooksGridStyle')) return;
    document.body.classList.add('books-embed-mybooks-grid');
    const style = document.createElement('style');
    style.id = 'booksEmbedMybooksGridStyle';
    style.textContent = `
      html,
      body {
        background: transparent !important;
      }
      body.books-embed-mybooks-grid {
        overflow: hidden !important;
      }
      body.books-embed-mybooks-grid::before,
      body.books-embed-mybooks-grid .books-home-book-bg,
      body.books-embed-mybooks-grid #booksLevelMenu,
      body.books-embed-mybooks-grid #booksStatus,
      body.books-embed-mybooks-grid #booksStatsPanel,
      body.books-embed-mybooks-grid #booksHomePanel,
      body.books-embed-mybooks-grid .flashcards-footer-nav {
        display: none !important;
      }
      body.books-embed-mybooks-grid .books-page {
        width: 100% !important;
        max-width: none !important;
        min-height: 100vh !important;
        padding: 0 !important;
        gap: 0 !important;
        grid-template-rows: 1fr !important;
      }
      body.books-embed-mybooks-grid .books-shelf {
        margin: 0 !important;
        min-height: 100vh !important;
        padding: 0 !important;
        border: 0 !important;
        background: transparent !important;
      }
      body.books-embed-mybooks-grid .books-grid {
        padding-top: 0 !important;
        padding-bottom: 18px !important;
      }
      body.books-embed-mybooks-grid .books-card {
        cursor: default !important;
      }
    `;
    document.head.appendChild(style);
  }

  function safeText(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  function getNativeBooksSleepPlugin() {
    return window.Capacitor?.Plugins?.PlaytalkBooksSleep || null;
  }

  function isNativeBooksSleepSupported() {
    try {
      if (window.PlaytalkNative && typeof window.PlaytalkNative.isNativeRuntime === 'function') {
        if (!window.PlaytalkNative.isNativeRuntime()) return false;
      } else if (!(window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform())) {
        return false;
      }
    } catch (_error) {
      return false;
    }
    return Boolean(getNativeBooksSleepPlugin());
  }

  async function setNativeBooksSleepModeEnabled(enabled) {
    const shouldEnable = Boolean(enabled);
    const plugin = getNativeBooksSleepPlugin();
    if (!plugin || !isNativeBooksSleepSupported()) return false;
    if (shouldEnable === state.homeNativeSleepLockEnabled) return true;
    try {
      if (shouldEnable && typeof plugin.activate === 'function') {
        await plugin.activate();
        state.homeNativeSleepLockEnabled = true;
        return true;
      }
      if (!shouldEnable && typeof plugin.deactivate === 'function') {
        await plugin.deactivate();
        state.homeNativeSleepLockEnabled = false;
        return true;
      }
    } catch (_error) {
      if (!shouldEnable) {
        state.homeNativeSleepLockEnabled = false;
      }
    }
    return false;
  }

  function readStoredInt(key) {
    try {
      const raw = localStorage.getItem(key);
      const parsed = Number.parseInt(raw || '0', 10);
      return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
    } catch (_error) {
      return 0;
    }
  }

  function writeStoredInt(key, value) {
    try {
      localStorage.setItem(key, String(Math.max(0, Math.round(Number(value) || 0))));
    } catch (_error) {
      // ignore
    }
  }

  function clearLegacyPronunciationStorage() {
    try {
      localStorage.removeItem('playtalk_books_pronunciation_pending_v1');
    } catch (_error) {
      // ignore
    }
  }

  function normalizePercent(value) {
    return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
  }

  function normalizePrecisePercent(value) {
    return Math.max(0, Math.min(100, Number(Number(value) || 0)));
  }

  function formatCountCompact(value) {
    const normalized = Math.max(0, Number(value) || 0);
    if (normalized >= 1_000_000) return `${Math.round((normalized / 1_000_000) * 10) / 10}m`;
    if (normalized >= 1_000) return `${Math.round((normalized / 1_000) * 10) / 10}k`;
    return `${Math.round(normalized)}`;
  }

  function formatDurationCompact(totalSeconds) {
    const seconds = Math.max(0, Math.round(Number(totalSeconds) || 0));
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}m`;
    return `${minutes}m`;
  }

  function formatEstimatedReadingTimeFromChars(totalChars) {
    const chars = Math.max(0, Number(totalChars) || 0);
    const totalSeconds = Math.max(0, chars * 60 / 400);
    return formatEstimatedReadingTimeFromSeconds(totalSeconds);
  }

  function formatEstimatedReadingTimeFromSeconds(totalSeconds) {
    const normalizedSeconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
    const minutes = Math.floor(normalizedSeconds / 60) + ((normalizedSeconds % 60) >= 31 ? 1 : 0);
    return `${minutes} minuto${minutes === 1 ? '' : 's'}`;
  }

  function getRoundedReadingMinutes(totalSeconds) {
    const normalizedSeconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
    return Math.floor(normalizedSeconds / 60) + ((normalizedSeconds % 60) >= 31 ? 1 : 0);
  }

  function formatEstimatedReadingMinutesEn(totalSeconds) {
    const minutes = getRoundedReadingMinutes(totalSeconds);
    return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  }

  function normalizeAudioSources(values) {
    if (!Array.isArray(values)) return [];
    const seen = new Set();
    return values
      .map((value) => safeText(value))
      .filter((value) => {
        if (!value || seen.has(value)) return false;
        seen.add(value);
        return true;
      });
  }

  function cancelAnimatedNumber(element) {
    if (!element) return;
    const frameId = NUMBER_ANIMATION_HANDLES.get(element);
    if (frameId) {
      window.cancelAnimationFrame(frameId);
      NUMBER_ANIMATION_HANDLES.delete(element);
    }
  }

  function buildDecimalMarkup(value, options = {}) {
    const decimals = Math.max(0, Math.min(4, Math.round(Number(options.decimals) || 0)));
    const suffix = safeText(options.suffix || '');
    const prefix = safeText(options.prefix || '');
    const normalized = Number.isFinite(Number(value)) ? Number(value) : 0;
    const fixed = normalized.toFixed(decimals);
    const decimalIndex = fixed.indexOf('.');
    const main = decimalIndex >= 0 ? fixed.slice(0, decimalIndex) : fixed;
    const fraction = decimalIndex >= 0 ? fixed.slice(decimalIndex) : '';
    const numberMarkup = `
      <span class="books-decimal-value">
        <span class="books-decimal-value__main">${main}</span>
        ${fraction ? `<span class="books-decimal-value__fraction">${fraction}${suffix}</span>` : `${suffix ? `<span class="books-decimal-value__fraction">${suffix}</span>` : ''}`}
      </span>
    `;
    return prefix ? `${prefix} ${numberMarkup}` : numberMarkup;
  }

  function setAnimatedDecimalMarkup(element, value, options = {}) {
    if (!element) return;
    const numericValue = Number.isFinite(Number(value)) ? Number(value) : 0;
    element.innerHTML = buildDecimalMarkup(numericValue, options);
    element.dataset.displayValue = String(numericValue);
  }

  function animateDecimalMarkup(element, value, options = {}) {
    if (!element) return Promise.resolve();
    const targetValue = Number.isFinite(Number(value)) ? Number(value) : 0;
    const decimals = Math.max(0, Math.min(4, Math.round(Number(options.decimals) || 0)));
    const factor = 10 ** decimals;
    const duration = Math.max(0, Number(options.duration) || SCORE_ANIMATION_MS);
    const rawStartValue = Number(element.dataset.displayValue);
    const configuredStartValue = Number(options.startValue);
    const startValue = Number.isFinite(rawStartValue)
      ? rawStartValue
      : (Number.isFinite(configuredStartValue) ? configuredStartValue : targetValue);
    if (duration <= 0 || Math.abs(startValue - targetValue) < (1 / factor)) {
      cancelAnimatedNumber(element);
      setAnimatedDecimalMarkup(element, targetValue, options);
      return Promise.resolve();
    }

    cancelAnimatedNumber(element);

    return new Promise((resolve) => {
      const startedAt = performance.now();
      const step = (now) => {
        const progress = Math.max(0, Math.min(1, (now - startedAt) / duration));
        const interpolated = startValue + ((targetValue - startValue) * progress);
        const rounded = Math.round(interpolated * factor) / factor;
        setAnimatedDecimalMarkup(element, progress >= 1 ? targetValue : rounded, options);
        if (progress >= 1) {
          NUMBER_ANIMATION_HANDLES.delete(element);
          resolve();
          return;
        }
        const nextFrame = window.requestAnimationFrame(step);
        NUMBER_ANIMATION_HANDLES.set(element, nextFrame);
      };
      const frameId = window.requestAnimationFrame(step);
      NUMBER_ANIMATION_HANDLES.set(element, frameId);
    });
  }

  function getStatsMetricIconMarkup(kind) {
    switch (safeText(kind)) {
      case 'books':
      case 'reading':
        return `
          <svg viewBox="0 0 64 64" aria-hidden="true">
            <path fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" d="M12 16.5c0-2.49 2.01-4.5 4.5-4.5H31v39H16.5A4.5 4.5 0 0 1 12 46.5zm40 0c0-2.49-2.01-4.5-4.5-4.5H33v39h14.5a4.5 4.5 0 0 0 4.5-4.5zM31 15h2"/>
          </svg>
        `;
      case 'listening':
        return `
          <svg viewBox="0 0 64 64" aria-hidden="true">
            <path fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" d="M8 35c4.5 0 4.5-16 9-16s4.5 26 9 26s4.5-34 9-34s4.5 42 9 42s4.5-18 9-18"/>
          </svg>
        `;
      case 'speaking':
        return `
          <svg viewBox="0 0 64 64" aria-hidden="true">
            <path fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" d="M32 40a8 8 0 0 0 8-8V19a8 8 0 1 0-16 0v13a8 8 0 0 0 8 8zm13-9a13 13 0 0 1-26 0M32 44v10m-8 0h16"/>
          </svg>
        `;
      case 'pronunciation':
        return `
          <svg viewBox="0 0 64 64" aria-hidden="true">
            <path fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" d="M18 34l9 9 19-21"/>
            <circle cx="32" cy="32" r="22" fill="none" stroke="currentColor" stroke-width="3.4"/>
          </svg>
        `;
      case 'practice-time':
      default:
        return `
          <svg viewBox="0 0 64 64" aria-hidden="true">
            <circle cx="32" cy="32" r="21" fill="none" stroke="currentColor" stroke-width="3.4"/>
            <path fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" d="M32 20v13l8 5M24 8h16"/>
          </svg>
        `;
    }
  }

  function buildStarShadowMap(count, color = '#FFF') {
    return Array.from({ length: Math.max(0, Number(count) || 0) }, () => {
      const x = Math.floor(Math.random() * STARFIELD_RANGE) + 1;
      const y = Math.floor(Math.random() * STARFIELD_RANGE) + 1;
      return `${x}px ${y}px ${color}`;
    }).join(', ');
  }

  function initializeBooksStarfield() {
    STARFIELD_CONFIG.forEach(({ id, count }) => {
      const layer = document.getElementById(id);
      if (!layer) return;
      layer.style.setProperty('--star-shadow', buildStarShadowMap(count));
    });
  }

  function formatHomeClock(totalSeconds) {
    const normalized = Math.max(0, Math.round(Number(totalSeconds) || 0));
    const minutes = Math.floor(normalized / 60);
    const seconds = normalized % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  }

  function getHomeCardDurationSeconds(card) {
    return Math.max(0, Number(card?.audioDurationSeconds) || 0);
  }

  function getHomeGapSeconds() {
    return Math.max(0, Number(getHomeRepeatSeconds()) || 0);
  }

  function getHomeSessionTotalSeconds(session = state.homeCurrentSession) {
    const cards = Array.isArray(session?.cards) ? session.cards : [];
    if (!cards.length) return 0;
    const audioSeconds = cards.reduce((total, card) => total + getHomeCardDurationSeconds(card), 0);
    return audioSeconds + (cards.length * getHomeGapSeconds());
  }

  function getHomeElapsedSecondsForPosition(cardIndex, timeWithinCardSeconds, session = state.homeCurrentSession) {
    const cards = Array.isArray(session?.cards) ? session.cards : [];
    if (!cards.length) return 0;
    const safeIndex = Math.max(0, Math.min(cards.length - 1, Number(cardIndex) || 0));
    const gapSeconds = getHomeGapSeconds();
    let elapsed = 0;
    for (let index = 0; index < safeIndex; index += 1) {
      elapsed += getHomeCardDurationSeconds(cards[index]) + gapSeconds;
    }
    elapsed += Math.max(0, Number(timeWithinCardSeconds) || 0);
    return elapsed;
  }

  function updateHomeProgressTimeline(elapsedSeconds, totalSeconds, label = state.homeCurrentBookName || 'Livro') {
    const normalizedTotal = Math.max(0, Number(totalSeconds) || 0);
    const normalizedElapsed = Math.max(0, Math.min(normalizedTotal || Number.MAX_SAFE_INTEGER, Number(elapsedSeconds) || 0));
    state.homeProgressLabel = safeText(label) || 'Livro';
    state.homeProgressElapsedSeconds = normalizedElapsed;
    state.homeProgressTotalSeconds = normalizedTotal;
    state.homeProgressRatio = normalizedTotal > 0 ? Math.max(0, Math.min(1, normalizedElapsed / normalizedTotal)) : 0;
    renderHomeProgressUi();
  }

  function refreshHomeProgressFromPlayback() {
    const session = state.homeCurrentSession;
    const totalSeconds = getHomeSessionTotalSeconds(session);
    const elapsedSeconds = getHomeElapsedSecondsForPosition(
      state.homeCurrentCardIndex,
      Number(state.homeAudioElement?.currentTime) || 0,
      session
    );
    updateHomeProgressTimeline(elapsedSeconds, totalSeconds, state.homeCurrentBookName || safeText(session?.title) || 'Livro');
  }

  function loadLocalConsumptionCounters() {
    state.readingCharsPending = readStoredInt(READING_CHARS_PENDING_KEY);
    state.readingCharsTotal = readStoredInt(READING_CHARS_TOTAL_KEY);
    state.listeningCharsPending = readStoredInt(LISTENING_CHARS_PENDING_KEY);
    state.listeningCharsTotal = readStoredInt(LISTENING_CHARS_TOTAL_KEY);
    state.practiceSecondsPending = 0;
    state.practiceSecondsTotal = 0;
  }

  function persistLocalConsumptionCounters() {
    writeStoredInt(READING_CHARS_PENDING_KEY, state.readingCharsPending);
    writeStoredInt(READING_CHARS_TOTAL_KEY, state.readingCharsTotal);
    writeStoredInt(LISTENING_CHARS_PENDING_KEY, state.listeningCharsPending);
    writeStoredInt(LISTENING_CHARS_TOTAL_KEY, state.listeningCharsTotal);
  }

  function syncPracticeSecondsTotal(serverPracticeSeconds) {
    const synced = Math.max(0, Math.round(Number(serverPracticeSeconds) || 0));
    const pendingWholeSeconds = Math.max(0, Math.floor(Number(state.practiceSecondsPending) || 0));
    state.practiceSecondsTotal = synced + pendingWholeSeconds;
  }

  function reconcileLocalConsumptionTotals(stats) {
    if (!stats || typeof stats !== 'object') return;

    const serverReadingChars = Math.max(0, Math.round(Number(stats.readingChars) || 0));
    const serverListeningChars = Math.max(0, Math.round(Number(stats.listeningChars) || 0));
    const serverPracticeSeconds = Math.max(0, Math.round(Number(stats.practiceSeconds) || 0));
    const nextReadingTotal = Math.max(
      serverReadingChars + Math.max(0, Number(state.readingCharsPending) || 0),
      Math.max(0, Number(state.readingCharsTotal) || 0)
    );
    const nextListeningTotal = Math.max(
      serverListeningChars + Math.max(0, Number(state.listeningCharsPending) || 0),
      Math.max(0, Number(state.listeningCharsTotal) || 0)
    );
    const nextPracticeTotal = Math.max(
      serverPracticeSeconds + Math.max(0, Math.floor(Number(state.practiceSecondsPending) || 0)),
      Math.max(0, Number(state.practiceSecondsTotal) || 0)
    );

    if (
      nextReadingTotal !== state.readingCharsTotal
      || nextListeningTotal !== state.listeningCharsTotal
      || nextPracticeTotal !== state.practiceSecondsTotal
    ) {
      state.readingCharsTotal = nextReadingTotal;
      state.listeningCharsTotal = nextListeningTotal;
      state.practiceSecondsTotal = nextPracticeTotal;
      persistLocalConsumptionCounters();
    }
  }

  function setStatsState(stats) {
    reconcileLocalConsumptionTotals(stats);
    state.stats = stats && typeof stats === 'object'
      ? {
        ...stats,
        pronunciationSamplesCount: Math.max(0, Number(stats.pronunciationSamplesCount) || 0),
        generalPronunciationPercent: normalizePrecisePercent(stats.generalPronunciationPercent),
        latestPronunciationPercent: normalizePercent(stats.latestPronunciationPercent),
        qualifiedBookIds: Array.isArray(stats.qualifiedBookIds)
          ? Array.from(new Set(stats.qualifiedBookIds.map((value) => safeText(value)).filter(Boolean)))
          : [],
        qualifiedBookCount: Math.max(
          0,
          Number(stats.qualifiedBookCount)
            || (Array.isArray(stats.qualifiedBookIds) ? stats.qualifiedBookIds.length : 0)
        ),
        bookBestPercentById: stats.bookBestPercentById && typeof stats.bookBestPercentById === 'object'
          ? Object.entries(stats.bookBestPercentById).reduce((accumulator, [bookId, percent]) => {
            const normalizedBookId = safeText(bookId);
            if (!normalizedBookId) return accumulator;
            accumulator[normalizedBookId] = normalizePercent(percent);
            return accumulator;
          }, {})
          : {},
        adminBooksSummary: stats.adminBooksSummary && typeof stats.adminBooksSummary === 'object'
          ? {
            totalBooks: Math.max(0, Number(stats.adminBooksSummary.totalBooks) || 0),
            uniqueWordsCount: Math.max(0, Number(stats.adminBooksSummary.uniqueWordsCount) || 0)
          }
          : null
      }
      : stats;
    syncPracticeSecondsTotal(state.stats?.practiceSeconds);
    if (!state.initialLoading) {
      syncSelectedLevelWithUnlocked({ preferUnlocked: !state.userSelectedBookLevel });
      renderLevelMenu();
      renderCards();
    }
    return state.stats;
  }

  function addPendingPronunciationSample(percent) {
    const normalized = normalizePercent(percent);
    state.booksPronunciationPending = [
      ...(Array.isArray(state.booksPronunciationPending) ? state.booksPronunciationPending : []),
      normalized
    ].slice(-BOOKS_PRONUNCIATION_SAMPLE_LIMIT);
    void flushBooksPronunciationIfNeeded();
  }

  function addListeningProgress(englishText) {
    const english = safeText(englishText);
    const charsDelta = english ? english.length : 0;

    if (charsDelta > 0) {
      state.listeningCharsPending += charsDelta;
      state.listeningCharsTotal += charsDelta;
    }

    persistLocalConsumptionCounters();
    renderStatsPanel();
    void flushListeningProgressIfNeeded();
  }

  function addReadingProgress(englishText, key) {
    const english = safeText(englishText);
    const charsDelta = english ? english.length : 0;
    const dedupeKey = safeText(key) || english;
    if (!charsDelta || !dedupeKey) return;

    state.readingCharsPending += charsDelta;
    state.readingCharsTotal += charsDelta;
    persistLocalConsumptionCounters();
    renderStatsPanel();
    void flushListeningProgressIfNeeded();
  }

  function addPracticeProgressSeconds(secondsDelta) {
    const normalized = Math.max(0, Number(secondsDelta) || 0);
    if (normalized <= 0) return;
    state.practiceSecondsPending += normalized;
    syncPracticeSecondsTotal(state.stats?.practiceSeconds);
    renderStatsPanel();
    void flushListeningProgressIfNeeded();
  }

  async function flushListeningProgressIfNeeded(force = false) {
    if (!state.user?.id || navigator.onLine === false) return false;
    if (state.listeningFlushInFlight) return false;
    const pendingReadingChars = Math.max(0, Number(state.readingCharsPending) || 0);
    const pendingChars = Math.max(0, Number(state.listeningCharsPending) || 0);
    const pendingSeconds = Math.max(0, Number(state.practiceSecondsPending) || 0);
    const chunkReadingChars = force
      ? pendingReadingChars
      : (Math.floor(pendingReadingChars / BOOKS_READING_FLUSH_BATCH_CHARS) * BOOKS_READING_FLUSH_BATCH_CHARS);
    const chunkChars = force
      ? pendingChars
      : (Math.floor(pendingChars / BOOKS_LISTENING_FLUSH_BATCH_CHARS) * BOOKS_LISTENING_FLUSH_BATCH_CHARS);
    const chunkSeconds = force
      ? Math.floor(pendingSeconds)
      : (Math.floor(pendingSeconds / BOOKS_PRACTICE_FLUSH_BATCH_SECONDS) * BOOKS_PRACTICE_FLUSH_BATCH_SECONDS);
    if (!chunkReadingChars && !chunkChars && !chunkSeconds && !force) return false;
    if (!chunkReadingChars && !chunkChars && !chunkSeconds && force) return false;

    state.listeningFlushInFlight = true;
    const sendReadingChars = Math.max(0, Math.round(chunkReadingChars) || 0);
    const sendChars = Math.max(0, Math.round(chunkChars) || 0);
    const sendSeconds = Math.max(0, Math.round(chunkSeconds) || 0);
    try {
      const response = await fetch(buildApiUrl('/api/books/listening-progress'), {
        method: 'POST',
        credentials: 'include',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          readingCharsDelta: sendReadingChars,
          listeningCharsDelta: sendChars,
          practiceSecondsDelta: sendSeconds
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) {
        if (window.PlaytalkEnergy?.isEnergyErrorPayload(payload, response.status)) {
          syncEnergyRedirectFromStats(payload?.energy || {});
        }
        return false;
      }
      state.readingCharsPending = Math.max(0, state.readingCharsPending - sendReadingChars);
      state.listeningCharsPending = Math.max(0, state.listeningCharsPending - sendChars);
      state.practiceSecondsPending = Math.max(0, state.practiceSecondsPending - sendSeconds);
      persistLocalConsumptionCounters();
      if (payload?.stats) {
        setStatsState({ ...(state.stats || {}), ...(payload.stats || {}) });
        syncEnergyRedirectFromStats(payload.stats);
        if (state.user?.id && (state.stats.bookReadCount == null || state.stats.generalPronunciationPercent == null)) {
          void refreshStatsFromServer();
        }
      } else {
        void refreshStatsFromServer();
      }
      syncPracticeSecondsTotal(payload?.stats?.practiceSeconds ?? state.stats?.practiceSeconds);
      renderStatsPanel();
      return true;
    } catch (_error) {
      return false;
    } finally {
      state.listeningFlushInFlight = false;
    }
  }

  async function flushBooksPronunciationIfNeeded(force = false) {
    if (!state.user?.id || navigator.onLine === false) return false;
    if (state.booksPronunciationFlushInFlight) return false;

    const pendingSamples = Array.isArray(state.booksPronunciationPending)
      ? state.booksPronunciationPending.slice(-BOOKS_PRONUNCIATION_SAMPLE_LIMIT)
      : [];
    if (!pendingSamples.length) return false;
    if (!force && pendingSamples.length < BOOKS_PRONUNCIATION_FLUSH_BATCH_SIZE) return false;

    const samplesToSend = force
      ? pendingSamples
      : pendingSamples.slice(0, BOOKS_PRONUNCIATION_FLUSH_BATCH_SIZE);

    state.booksPronunciationFlushInFlight = true;
    try {
      const response = await fetch(buildApiUrl('/api/books/training/complete'), {
        method: 'POST',
        credentials: 'include',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          bookId: safeText(state.readerBookId || state.modeBookId || ''),
          pronunciationPercents: samplesToSend
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) {
        return false;
      }
      state.booksPronunciationPending = pendingSamples.slice(samplesToSend.length);
      setStatsState({ ...(state.stats || {}), ...(payload.stats || {}) });
      syncEnergyRedirectFromStats(payload.stats);
      renderStatsPanel();
      return true;
    } catch (_error) {
      return false;
    } finally {
      state.booksPronunciationFlushInFlight = false;
    }
  }

  async function flushBooksSyncIfNeeded(force = false) {
    await Promise.allSettled([
      flushListeningProgressIfNeeded(force),
      flushBooksPronunciationIfNeeded(force)
    ]);
  }

  function startBooksSyncTimer() {
    if (state.booksSyncTimer) return;
    state.booksSyncTimer = window.setInterval(() => {
      if (!state.user?.id || navigator.onLine === false) return;
      void flushBooksSyncIfNeeded(true);
    }, BOOKS_STATS_SYNC_MS);
  }

  function primeHomeSessionAudio(session, limit = HOME_AUDIO_PREROLL_CARD_COUNT) {
    const cards = Array.isArray(session?.cards) ? session.cards : [];
    cards
      .slice(0, Math.max(0, Number(limit) || 0))
      .forEach((card) => {
        const source = safeText(card?.audio);
        if (!source) return;
        try {
          const audio = new Audio();
          audio.preload = 'auto';
          audio.src = source;
          audio.load();
        } catch (_error) {
          // ignore prefetch failures
        }
      });
  }

  function loadHomeAudioDurationSeconds(source) {
    const normalizedSource = safeText(source);
    if (!normalizedSource) return Promise.resolve(0);
    if (HOME_AUDIO_DURATION_CACHE.has(normalizedSource)) {
      return HOME_AUDIO_DURATION_CACHE.get(normalizedSource);
    }
    const promise = new Promise((resolve) => {
      const audio = new Audio();
      let settled = false;
      const finish = (value) => {
        if (settled) return;
        settled = true;
        audio.onloadedmetadata = null;
        audio.onerror = null;
        resolve(Math.max(0, Number(value) || 0));
      };
      audio.preload = 'metadata';
      audio.onloadedmetadata = () => finish(audio.duration);
      audio.onerror = () => finish(0);
      audio.src = normalizedSource;
    });
    HOME_AUDIO_DURATION_CACHE.set(normalizedSource, promise);
    return promise;
  }

  async function hydrateHomeCardDurations(cards) {
    const list = Array.isArray(cards) ? cards : [];
    await Promise.all(list.map(async (card) => {
      card.audioDurationSeconds = await loadHomeAudioDurationSeconds(card?.audio);
    }));
    return list;
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

  function hasOneLetterWordMatch(expected, spoken) {
    const expectedWords = normalizeText(expected).split(' ').filter(Boolean);
    const spokenWords = normalizeText(spoken).split(' ').filter(Boolean);
    return expectedWords.some(word => word.length === 1)
      && spokenWords.some(word => word.length === 1);
  }

  function hasCommonLetterSequence(expected, spoken, sequenceLength = 2) {
    const expectedRaw = lettersOnly(expected);
    const spokenRaw = lettersOnly(spoken);
    if (expectedRaw.length < sequenceLength || spokenRaw.length < sequenceLength) return false;
    for (let start = 0; start <= expectedRaw.length - sequenceLength; start += 1) {
      if (spokenRaw.includes(expectedRaw.slice(start, start + sequenceLength))) {
        return true;
      }
    }
    return false;
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

  function isCreateEditMode() {
    return state.createMode === 'edit';
  }

  function normalizeCreateComparableLine(value) {
    return String(value || '').replace(/\s+$/g, '');
  }

  function doesCreateLineRequestAudio(value) {
    return String(value || '').includes('@');
  }

  function isCreateLineEdited(line, index) {
    if (!isCreateEditMode()) return true;
    const originalLine = Array.isArray(state.createOriginalLines) ? state.createOriginalLines[index] : '';
    return normalizeCreateComparableLine(line) !== normalizeCreateComparableLine(originalLine)
      || doesCreateLineRequestAudio(line);
  }

  function resetCreateModalState(mode) {
    state.createMode = mode === 'edit' ? 'edit' : 'create';
    state.createEditBookId = '';
    state.createOriginalLines = [];
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
        const opacityClass = isCreateEditMode()
          ? (isCreateLineEdited(line, index) ? ' is-edited' : ' is-muted')
          : '';
        const content = line.length ? escapeHtml(line) : '&nbsp;';
        return `<span class="books-create-line ${className}${opacityClass}">${content}</span>`;
      })
      .join('');
    els.createPreview.innerHTML = html;
    if (els.createEditor) {
      els.createEditor.classList.toggle('is-empty', !safeText(rawText));
    }
    if (els.createCard) {
      els.createCard.classList.toggle('is-edit-mode', isCreateEditMode());
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
    const namedLevel = Object.entries(BOOK_LEVEL_DISPLAY_NAMES_100)
      .find(([, name]) => normalizeText(name) === normalizedLevelLabel);
    return namedLevel ? normalizeLevel(namedLevel[0]) : null;
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
      throw new Error('A linha 2 precisa de um nivel valido (1-100 ou nome do nivel).');
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

  function sanitizeBooksDisplayTail(value) {
    let text = String(value || '').trimEnd();
    while (text) {
      const dotTrail = text.match(/\.{2,}$/);
      if (dotTrail) {
        return `${text.slice(0, -dotTrail[0].length)}${dotTrail[0].length >= 3 ? '...' : '.'}`;
      }
      const commaTrail = text.match(/,+$/);
      if (commaTrail) {
        return `${text.slice(0, -commaTrail[0].length)},`;
      }
      const questionTrail = text.match(/\?+$/);
      if (questionTrail) {
        return `${text.slice(0, -questionTrail[0].length)}?`;
      }
      if (/[,.?]$/.test(text) || /\p{L}$/u.test(text)) {
        return text;
      }
      text = text.slice(0, -1).trimEnd();
    }
    return '';
  }

  function sanitizeReaderDisplayText(value) {
    const normalized = String(value || '')
      .replace(/\u221F/g, ' ')
      .replace(/,;/g, '')
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    return sanitizeBooksDisplayTail(normalized);
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
    if (IS_MYBOOKS_GRID_EMBED) {
      els.status.textContent = '';
      els.status.className = 'books-status';
      els.status.hidden = true;
      return;
    }
    els.status.textContent = safeText(message);
    els.status.className = 'books-status';
    if (tone) {
      els.status.classList.add(`is-${tone}`);
    }
  }

  function toggleGlobalLoader(key, active, message) {
    const loader = window.PlaytalkLoader;
    if (!loader) return;
    if (active) {
      loader.show(key, { message });
      return;
    }
    loader.hide(key);
  }

  function buildBookLoaderMetaItems(book) {
    const items = getHomeBookMetaItems(book);
    return items.map((item) => ({
      icon: getHomeBookMetaIcon(item?.kind),
      value: safeText(item?.value)
    })).filter((item) => item.value);
  }

  function renderShelfLoading() {
    if (els.shelfLoading) {
      els.shelfLoading.hidden = true;
    }
    toggleGlobalLoader('page-init', state.initialLoading, 'Carregando sua estante');
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
    return Math.max(1, Math.min(MAX_BOOK_LEVEL, parsed));
  }

  function normalizeUser(user) {
    if (!user || typeof user !== 'object') return null;
    const username = safeText(user.username);
    if (!username) return null;
    return {
      id: Number(user.id) || 0,
      username,
      avatarImage: safeText(user.avatar_image || user.avatarImage),
      premiumUntil: safeText(user.premium_until || user.premiumUntil),
      premiumFullAccess: Boolean(user.premium_full_access || user.premiumFullAccess),
      isAdmin: Boolean(user.is_admin || user.isAdmin) || isAdminAlias(username),
      noEnergy: Boolean(user.no_energy || user.noEnergy)
    };
  }

  function isManualNoEnergyBlocked() {
    return Boolean(state.user?.noEnergy);
  }

  function pulseBlockedButton(button, baseOpacity = '0.6') {
    if (!(button instanceof HTMLElement)) return;
    button.style.transition = 'opacity 1000ms ease';
    button.style.opacity = '1';
    window.setTimeout(() => {
      button.style.opacity = baseOpacity;
    }, 1000);
  }

  function syncManualNoEnergyUi() {
    const blocked = isManualNoEnergyBlocked();
    const opacity = blocked ? '0.6' : '1';
    [els.homeLaunchBtn, els.homeSleepFab, els.preBookRankedBtn, els.preBookPronounceBtn, els.preBookListeningBtn, els.preBookSpeakingBtn].forEach((button) => {
      if (!(button instanceof HTMLElement)) return;
      button.style.opacity = opacity;
    });
  }

  function applyWelcomeModeVisibility() {
    const showModes = Boolean(state.welcomeModesUsersEnabled);
    [els.preBookRankedBtn, els.preBookPronounceBtn, els.preBookListeningBtn, els.preBookSpeakingBtn].forEach((button) => {
      if (!(button instanceof HTMLElement)) return;
      button.hidden = !showModes;
      button.disabled = !showModes || state.modeStartBusy;
    });
  }

  async function handleManualNoEnergyBlock(button, hintKind = 'prebook') {
    if (!isManualNoEnergyBlocked()) return false;
    pulseBlockedButton(button, '0.6');
    if (window.PlaytalkEnergy?.getEnergyStatus && window.PlaytalkEnergy?.openEnergyGate) {
      const status = await window.PlaytalkEnergy.getEnergyStatus({
        user: state.user,
        stats: state.stats || {}
      });
      window.PlaytalkEnergy.openEnergyGate(status);
    }
    return true;
  }

  function navigateTo(target, options = {}) {
    if (window.PlaytalkNative && typeof window.PlaytalkNative.navigate === 'function') {
      window.PlaytalkNative.navigate(target, options);
      return;
    }
    if (options.replace) {
      window.location.replace(target);
      return;
    }
    window.location.href = target;
  }

  async function loadWelcomeModeSettings() {
    const response = await fetch(buildApiUrl('/api/flashcards/welcome-mode-settings'), {
      headers: buildAuthHeaders(),
      credentials: 'include',
      cache: 'no-store'
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.success || !payload?.settings) {
      throw new Error(payload?.message || 'Nao foi possivel carregar as configuracoes do welcome gate.');
    }
    state.welcomeModesUsersEnabled = payload.settings.usersEnabled !== false;
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

  function persistLocalPlayerProfile(profile) {
    try {
      const nextProfile = {
        username: safeText(profile?.username),
        avatarImage: safeText(profile?.avatarImage)
      };
      localStorage.setItem('playtalk_player_profile', JSON.stringify(nextProfile));
    } catch (_error) {
      // ignore
    }
  }

  function persistAuthToken(token) {
    if (window.PlaytalkApi && typeof window.PlaytalkApi.setAuthToken === 'function') {
      window.PlaytalkApi.setAuthToken(token || '');
    }
  }

  function isPremiumActive(user = state.user) {
    if (!user) return false;
    if (user.premiumFullAccess) return true;
    const time = Date.parse(user.premiumUntil || '');
    return Number.isFinite(time) && time > Date.now();
  }

  async function guardEnergyAndRedirect(options = {}) {
    if (!window.PlaytalkEnergy || typeof window.PlaytalkEnergy.guardEnergyGate !== 'function') {
      return true;
    }
    const result = await window.PlaytalkEnergy.guardEnergyGate({
      user: state.user,
      stats: {
        readingChars: state.readingCharsTotal,
        listeningChars: state.listeningCharsTotal,
        speakingChars: Math.max(0, Number(state.stats?.speakingChars) || 0),
        remainingEnergy: state.stats?.remainingEnergy,
        dailyEnergyUsed: state.stats?.dailyEnergyUsed,
        dailyEnergyLimit: state.stats?.dailyEnergyLimit,
        unlimited: state.stats?.unlimited,
        nextEnergyResetAt: state.stats?.nextEnergyResetAt
      },
      previewTarget: options.previewTarget,
      previewTargets: options.previewTargets
    });
    return Boolean(result?.allowed);
  }

  function handleEnergyExhaustedRedirect() {
    if (state.energyRedirectInProgress) return;
    state.energyRedirectInProgress = true;
    state.homePaused = true;
    interruptHomeAudioPlayback();
    stopHomeMusicLoop();
    if (window.PlaytalkEnergy && typeof window.PlaytalkEnergy.openEnergyGate === 'function') {
      window.PlaytalkEnergy.openEnergyGate(
        window.PlaytalkEnergy.buildEnergyStatus({
          user: state.user,
          stats: state.stats || {}
        })
      );
    }
    state.energyRedirectInProgress = false;
  }

  function syncEnergyRedirectFromStats(stats) {
    if (!window.PlaytalkEnergy?.buildEnergyStatus || !window.PlaytalkEnergy?.triggerEnergyDepletionExit) {
      return false;
    }
    const status = window.PlaytalkEnergy.buildEnergyStatus({
      user: state.user,
      stats: stats || state.stats || {}
    });
    if (!window.PlaytalkEnergy.isDepletedStatus?.(status)) {
      return false;
    }
    void window.PlaytalkEnergy.triggerEnergyDepletionExit({
      status,
      targets: [
        state.readerOpen ? els.reader : null,
        state.homeSleepActive ? els.homePanel : null,
        els.preBookModal?.classList.contains('is-visible') ? els.preBookModal : null
      ],
      beforeExit: () => {
        state.energyRedirectInProgress = true;
        state.homePaused = true;
        interruptHomeAudioPlayback();
        stopHomeMusicLoop();
        closeReaderAdminAudioModal(true);
      }
    });
    return true;
  }

  function ensureEnergyDepletionWatch() {
    if (state.energyDepletionWatch || !window.PlaytalkEnergy?.watchEnergyDepletion) {
      return;
    }
    state.energyDepletionWatch = window.PlaytalkEnergy.watchEnergyDepletion({
      getUser: () => state.user,
      getStats: () => state.stats,
      isActive: () => Boolean(state.homeSleepActive || state.readerOpen),
      getTargets: () => ([
        state.readerOpen ? els.reader : null,
        state.homeSleepActive ? els.homePanel : null,
        els.preBookModal?.classList.contains('is-visible') ? els.preBookModal : null
      ]),
      beforeExit: () => {
        state.energyRedirectInProgress = true;
        state.homePaused = true;
        interruptHomeAudioPlayback();
        stopHomeMusicLoop();
        closeReaderAdminAudioModal(true);
      }
    });
  }

  function renderHomeAccountUi() {
    const isLoggedIn = Boolean(state.user?.id);
    if (els.homeAccountPanel) {
      els.homeAccountPanel.hidden = false;
    }
    if (els.homeAccountStatus && els.homePremiumLevel && els.homePremiumUntil) {
      els.homeAccountStatus.hidden = !isLoggedIn;
      if (isLoggedIn) {
        if (isPremiumActive()) {
          els.homePremiumLevel.textContent = 'Nivel de acesso: Premium';
          const until = Date.parse(state.user?.premiumUntil || '');
          els.homePremiumUntil.textContent = Number.isFinite(until)
            ? `Ativo ate ${new Date(until).toLocaleDateString('pt-BR')}.`
            : 'Premium ativo.';
        } else {
          els.homePremiumLevel.textContent = 'Nivel de acesso: Free';
          els.homePremiumUntil.textContent = 'Sem premium ativo no momento.';
        }
      } else {
        els.homePremiumLevel.textContent = '';
        els.homePremiumUntil.textContent = '';
      }
    }
    if (els.homeSwitchAccountBtn) {
      els.homeSwitchAccountBtn.hidden = false;
      els.homeSwitchAccountBtn.disabled = state.homeAuthBusy || state.homeStartBusy;
    }
    if (els.homePremiumBtn) {
      els.homePremiumBtn.hidden = !isLoggedIn;
      els.homePremiumBtn.disabled = state.homeAuthBusy || state.homeStartBusy;
    }
    syncManualNoEnergyUi();
  }

  function setHomeAuthStatus(message, tone) {
    if (!els.homeAuthStatus) return;
    els.homeAuthStatus.textContent = safeText(message);
    els.homeAuthStatus.className = 'books-home-auth-status';
    if (tone) {
      els.homeAuthStatus.classList.add(`is-${tone}`);
    }
  }

  function renderHomeAuthUi() {
    if (IS_MYBOOKS_GRID_EMBED) {
      setHomeAuthStatus('', null);
      return;
    }
    const isLoggedIn = Boolean(state.user?.id);
    if (els.homeStartPanel) {
      els.homeStartPanel.classList.toggle('is-logged-in', isLoggedIn);
    }
    if (els.homeStartBtn) {
      els.homeStartBtn.disabled = state.homeAuthBusy;
      els.homeStartBtn.textContent = state.homeAuthBusy ? 'Entrando...' : 'Entrar e começar';
    }
    if (els.homeLaunchBtn) {
      els.homeLaunchBtn.hidden = !isLoggedIn;
      els.homeLaunchBtn.disabled = state.homeAuthBusy || state.homeStartBusy;
      const launchLabel = els.homeLaunchBtn.querySelector('span');
      if (launchLabel) {
        launchLabel.textContent = state.homeStartBusy ? 'Abrindo...' : 'Iniciar';
      }
    }
    if (els.homeLoginInput) {
      els.homeLoginInput.disabled = state.homeAuthBusy || isLoggedIn;
      if (isLoggedIn && !safeText(els.homeLoginInput.value)) {
        els.homeLoginInput.value = safeText(state.user?.username || state.localProfile?.username);
      }
    }
    if (els.homePasswordInput) {
      els.homePasswordInput.disabled = state.homeAuthBusy || isLoggedIn;
      if (isLoggedIn) {
        els.homePasswordInput.value = '';
        els.homePasswordInput.placeholder = 'sessao ativa';
      } else {
        els.homePasswordInput.placeholder = 'sua senha';
      }
    }
    if (isLoggedIn) {
      setHomeAuthStatus(`Conta ativa: ${safeText(state.user?.username)}.`, 'success');
    }
    syncManualNoEnergyUi();
  }

  async function loginFromBooksHome() {
    if (state.homeAuthBusy) return;
    if (state.user?.id) {
      setHomeAuthStatus('Conta ativa. Toque em Iniciar para abrir o player.', 'success');
      return;
    }
    const username = safeText(els.homeLoginInput?.value).toLowerCase();
    const password = safeText(els.homePasswordInput?.value);
    if (!username || !password) {
      setHomeAuthStatus('Preencha login e senha para entrar.', 'error');
      return;
    }

    state.homeAuthBusy = true;
    renderHomeAuthUi();
    setHomeAuthStatus('Entrando na sua conta...', null);
    try {
      const response = await fetch(buildApiUrl('/api/books/home-auth'), {
        method: 'POST',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ username, password })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Nao foi possivel entrar agora.');
      }
      if (payload?.token) {
        persistAuthToken(payload.token);
      }
      state.user = normalizeUser(payload.user);
      state.localProfile = {
        username: state.user?.username || username,
        avatarImage: state.user?.avatarImage || safeText(state.localProfile?.avatarImage)
      };
      persistLocalPlayerProfile(state.localProfile);
      renderAvatar();
      void flushListeningProgressIfNeeded(true);
      void refreshStatsFromServer().then(() => renderStatsPanel());
      renderHomeAuthUi();
      setHomeAuthStatus(payload?.created ? 'Conta criada e entrada liberada.' : 'Entrada liberada com sucesso.', 'success');
    } catch (error) {
      setHomeAuthStatus(error?.message || 'Nao foi possivel entrar agora.', 'error');
    } finally {
      state.homeAuthBusy = false;
      renderHomeAuthUi();
    }
  }

  // Override the legacy login-focused home UI: Books Home should launch directly.
  function renderHomeAuthUi() {
    const isLoggedIn = Boolean(state.user?.id);
    if (els.homeStartPanel) {
      els.homeStartPanel.classList.toggle('is-logged-in', isLoggedIn);
    }
    if (els.homeStartBtn) {
      els.homeStartBtn.hidden = true;
    }
    if (els.homeLaunchBtn) {
      els.homeLaunchBtn.hidden = false;
      els.homeLaunchBtn.disabled = state.homeStartBusy;
      const launchLabel = els.homeLaunchBtn.querySelector('span');
      if (launchLabel) {
        launchLabel.textContent = state.homeStartBusy ? 'Abrindo...' : 'SmartBooks';
      }
    }
    setHomeAuthStatus('', null);
    renderHomeAccountUi();
    syncManualNoEnergyUi();
  }

  function getFirstHomeBook() {
    const pool = getHomeBooksPool();
    if (!pool.length) return null;
    return pool
      .slice()
      .sort((left, right) => {
        const levelDelta = normalizeLevel(left?.nivel) - normalizeLevel(right?.nivel);
        if (levelDelta !== 0) return levelDelta;
        return sortByNome(left, right);
      })[0] || null;
  }

  async function startFirstBookFromHome() {
    const firstBook = getFirstHomeBook();
    if (!firstBook) {
      setHomeAuthStatus('Nenhum MiniBook disponível para iniciar agora.', 'error');
      return;
    }
    try {
      const cards = await prepareReaderData(firstBook);
      await startBookByMode(firstBook, 'free-read', cards);
    } catch (error) {
      setHomeAuthStatus(error?.message || 'Não consegui abrir o primeiro livro agora.', 'error');
    }
  }

  function renderAvatar() {
    // Header avatar/greeting was removed from the Books home player.
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
          englishChars: Math.max(0, Number(entry?.englishChars) || 0),
          readingTimeSeconds: Math.max(0, Number(entry?.readingTimeSeconds) || 0),
          audioSources: normalizeAudioSources(entry?.audioSources),
          coverImageUrl: safeText(entry?.coverImageUrl),
          backgroundDesktopUrl: safeText(entry?.backgroundDesktopUrl),
          backgroundMobileUrl: safeText(entry?.backgroundMobileUrl),
          selectedStoryId: storyId,
          storyIds: storyId ? [storyId] : []
        });
        return;
      }

      const current = byBook.get(key);
      const entryEnglishChars = Math.max(0, Number(entry?.englishChars) || 0);
      const entryReadingSeconds = Math.max(0, Number(entry?.readingTimeSeconds) || (entryEnglishChars * 60 / 400));
      current.englishChars = Math.max(0, Number(current.englishChars) || 0) + entryEnglishChars;
      current.readingTimeSeconds = Math.max(0, Number(current.readingTimeSeconds) || 0) + entryReadingSeconds;
      if (!current.coverImageUrl && safeText(entry?.coverImageUrl)) {
        current.coverImageUrl = safeText(entry.coverImageUrl);
      }
      if (!current.backgroundDesktopUrl && safeText(entry?.backgroundDesktopUrl)) {
        current.backgroundDesktopUrl = safeText(entry.backgroundDesktopUrl);
      }
      if (!current.backgroundMobileUrl && safeText(entry?.backgroundMobileUrl)) {
        current.backgroundMobileUrl = safeText(entry.backgroundMobileUrl);
      }
      if (Array.isArray(entry?.audioSources) && entry.audioSources.length) {
        current.audioSources = normalizeAudioSources([...(current.audioSources || []), ...entry.audioSources]);
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

  function uiLevelToBookLevel(level) {
    const parsed = Number.parseInt(level, 10);
    if (!Number.isFinite(parsed)) return null;
    if (parsed < UI_FIRST_BOOK_LEVEL) return null;
    return normalizeLevel(parsed - UI_FIRST_BOOK_LEVEL + 1);
  }

  async function openBooksCollectionFromHome() {
    if (state.homeStartBusy) return;
    stopHomeSleepPlayback({ keepIntro: false });
    state.selectedLevel = bookLevelToUiLevel(1);
    state.userSelectedBookLevel = false;
    state.shelfIndex = 0;
    renderHomeAuthUi();
    renderLevelMenu();
    renderCards();
  }

  function bookLevelToUiLevel(level) {
    return normalizeLevel(level) + UI_FIRST_BOOK_LEVEL - 1;
  }

  function isMyBooksLevel(level = state.selectedLevel) {
    return Number.parseInt(level, 10) === UI_LEVEL_MY_BOOKS;
  }

  function isAllBooksLevel(level = state.selectedLevel) {
    return Number.parseInt(level, 10) === UI_LEVEL_ALL_BOOKS;
  }

  function getAccessibleLevels() {
    if (IS_MYBOOKS_GRID_EMBED) {
      return [UI_LEVEL_MY_BOOKS];
    }
    return getUnlockedBookUiLevels();
  }

  function shuffleBooks(list) {
    const items = Array.isArray(list) ? list.slice() : [];
    for (let index = items.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      const current = items[index];
      items[index] = items[swapIndex];
      items[swapIndex] = current;
    }
    return items;
  }

  function getAllBooksFeed() {
    const qualifiedBookIds = new Set(
      (Array.isArray(state.stats?.qualifiedBookIds) ? state.stats.qualifiedBookIds : [])
        .map((bookId) => safeText(bookId).toLowerCase())
        .filter(Boolean)
    );
    const sourceBooks = state.books
      .filter((book) => !qualifiedBookIds.has(safeText(book?.bookId).toLowerCase()))
      .sort(sortByNome);
    if (!sourceBooks.length) {
      state.allBooksFeed = [];
      state.allBooksFeedVersion = '';
      state.allBooksWindowStart = 0;
      return [];
    }
    const version = sourceBooks.map((book) => `${safeText(book?.bookId)}:${normalizeLevel(book?.nivel)}`).join('|');
    if (state.allBooksFeedVersion !== version || !state.allBooksFeed.length) {
      const cycles = Math.max(4, Math.ceil(36 / sourceBooks.length));
      const feed = [];
      for (let cycle = 0; cycle < cycles; cycle += 1) {
        feed.push(...shuffleBooks(sourceBooks));
      }
      state.allBooksFeed = feed;
      state.allBooksFeedVersion = version;
      state.allBooksWindowStart = 0;
    }
    return state.allBooksFeed.slice();
  }

  function getQualifiedMyBooks() {
    const ids = Array.isArray(state.stats?.qualifiedBookIds) ? state.stats.qualifiedBookIds : [];
    if (!ids.length) return [];
    const booksById = new Map(
      state.books.map((book) => [safeText(book?.bookId).toLowerCase(), book])
    );
    return ids
      .map((bookId) => booksById.get(safeText(bookId).toLowerCase()))
      .filter(Boolean);
  }

  function getOwnedSmartBookIdsSet() {
    const qualified = Array.isArray(state.stats?.qualifiedBookIds) ? state.stats.qualifiedBookIds : [];
    return new Set(qualified.map((bookId) => safeText(bookId).toLowerCase()).filter(Boolean));
  }

  function getCollectedSmartBooksCount() {
    const owned = getOwnedSmartBookIdsSet();
    return Math.max(0, owned.size);
  }

  function getUnlockedSmartBookLevel() {
    const collectedCount = getCollectedSmartBooksCount();
    if (collectedCount <= 0) return 1;
    return Math.max(1, Math.min(
      MAX_BOOK_LEVEL,
      Math.floor(collectedCount / SMARTBOOKS_PER_UNLOCK_LEVEL) + 1
    ));
  }

  function getSmartBooksMissionSummary() {
    const mission = state.dailyMission && typeof state.dailyMission === 'object'
      ? state.dailyMission
      : {};
    const booksToday = Math.max(0, Number(mission?.booksToday) || 0);
    const booksExpected = Math.max(0, Number(mission?.booksExpected) || 0);
    const booksTarget = booksExpected > 0 ? Math.max(1, Math.ceil(booksExpected)) : SMARTBOOKS_PER_UNLOCK_LEVEL;
    const safeTarget = Math.max(1, booksTarget);
    const smartBooksProgressPercent = Math.max(0, Math.min(100, (booksToday / safeTarget) * 100));
    const missionPercent = Math.max(0, Math.min(200, Number(mission?.weightedPercent) || 0));
    const missionProgressPercent = Math.max(0, Math.min(100, missionPercent));
    return {
      booksToday,
      booksTarget: safeTarget,
      missionPercent,
      smartBooksProgressPercent,
      missionProgressPercent
    };
  }

  function renderHomeMissionSummary() {
    if (!els.homeMissionSummary) return;

      card.append(background, overlay, badgeEl, approvedBadge);

      if (!IS_MYBOOKS_GRID_EMBED) {
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
        textBtn.setAttribute('aria-label', `Editar ${safeText(book?.nome) || 'livro'}`);
        textBtn.title = 'Editar livro';
        textBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75zM20.71 7.04a1.003 1.003 0 0 0 0-1.42L18.37 3.29a1.003 1.003 0 0 0-1.42 0L15.12 5.12l3.75 3.75z"/></svg>';
        textBtn.disabled = processingMagic || pendingCreate;
        textBtn.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          void openEditBookModal(book);
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'books-card__delete-btn';
        deleteBtn.setAttribute('aria-label', `Excluir ${safeText(book?.nome) || 'livro'}`);
        deleteBtn.title = 'Excluir livro';
        deleteBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 4h10l1 2h3v2H3V6h3zM6 8h12l-1 12H7zM10 10v8h2v-8zm4 0v8h2v-8z"/></svg>';
        deleteBtn.disabled = processingMagic || pendingCreate || state.deleteBusyBookId === safeText(book?.bookId);
        deleteBtn.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          openBookDeleteConfirm(book.bookId);
        });

        const deletePopover = document.createElement('div');
        deletePopover.className = 'books-card__delete-popover';
        deletePopover.hidden = state.deleteConfirmBookId !== safeText(book?.bookId);
        const deletePopoverTitle = document.createElement('div');
        deletePopoverTitle.className = 'books-card__delete-popover-title';
        deletePopoverTitle.textContent = 'Excluir para sempre?';
        const deletePopoverText = document.createElement('div');
        deletePopoverText.className = 'books-card__delete-popover-text';
        deletePopoverText.textContent = 'Esse texto some do livro e nao volta.';
        const deletePopoverActions = document.createElement('div');
        deletePopoverActions.className = 'books-card__delete-popover-actions';
        const deleteConfirmBtn = document.createElement('button');
        deleteConfirmBtn.type = 'button';
        deleteConfirmBtn.className = 'books-card__delete-confirm-btn';
        deleteConfirmBtn.textContent = state.deleteBusyBookId === safeText(book?.bookId) ? 'Excluindo...' : 'Excluir';
        deleteConfirmBtn.disabled = state.deleteBusyBookId === safeText(book?.bookId);
        deleteConfirmBtn.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          void deleteBookPermanently(book);
        });
        const deleteCancelBtn = document.createElement('button');
        deleteCancelBtn.type = 'button';
        deleteCancelBtn.className = 'books-card__delete-cancel-btn';
        deleteCancelBtn.textContent = 'Cancelar';
        deleteCancelBtn.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          closeBookDeleteConfirm();
        });
        deletePopoverActions.append(deleteConfirmBtn, deleteCancelBtn);
        deletePopover.append(deletePopoverTitle, deletePopoverText, deletePopoverActions);

        const processingOverlay = document.createElement('span');
        processingOverlay.className = 'books-card__processing';
        const processingLabel = pendingCreate
          ? safeText(book?.pendingLabel) || 'Criando...'
          : 'Gerando...';
        processingOverlay.innerHTML = `<span class="books-card__spinner" aria-hidden="true"></span><span class="books-card__processing-label">${escapeHtml(processingLabel)}</span>`;

        actions.append(uploadBtn, magicBtn, textBtn, deleteBtn);
        card.append(adminChip, actions, deletePopover, processingOverlay);
      }
      card.addEventListener('click', () => {
        if (IS_MYBOOKS_GRID_EMBED) return;
        if ((Date.now() - state.shelfLastGestureAt) < 240) return;
        if (state.uploadInFlight || processingMagic || pendingCreate) return;
        void startDirectRankedListeningBook(book);
      });
      page.appendChild(card);
      els.cardsGrid.appendChild(page);
    });

    syncShelfViewportHeight();
    renderHomeMissionSummary();
    state.shelfIndex = clampVisibleShelfIndex(state.shelfIndex);
    void scrollShelfToIndex(state.shelfIndex, false);
    syncSleepFabVisibility();
    renderSleepFabMeta();
  }

  function getUiLevelDisplayName(level) {
    const parsed = Number.parseInt(level, 10);
    if (!Number.isFinite(parsed)) return 'AllBooks';
    if (parsed === UI_LEVEL_HOME) return 'Home';
    if (parsed === UI_LEVEL_MY_BOOKS) return 'MyBooks';
    if (parsed === UI_LEVEL_ALL_BOOKS) return 'AllBooks';
    const bookLevel = uiLevelToBookLevel(parsed);
    if (!bookLevel) return `Nivel ${parsed}`;
    return `Nível ${bookLevel}`;
  }

  function renderLevelMenu() {
    const accessibleLevels = getAccessibleLevels();
    const currentIndex = accessibleLevels.indexOf(normalizeBrowseLevel(state.selectedLevel));
    if (els.levelMenu) {
      if (IS_MYBOOKS_GRID_EMBED) {
        els.levelMenu.hidden = true;
      }
      if (!IS_MYBOOKS_GRID_EMBED) {
        els.levelMenu.hidden = false;
      }
    }
    if (els.levelTitle) {
      els.levelTitle.textContent = `${getUiLevelDisplayName(state.selectedLevel)}`;
      els.levelTitle.hidden = false;
    }
    if (els.levelSubtitle) {
      els.levelSubtitle.textContent = 'Leia 5 MiniBooks para avançar';
      els.levelSubtitle.hidden = false;
    }
    if (els.prevLevelBtn) {
      els.prevLevelBtn.hidden = accessibleLevels.length <= 1;
      els.prevLevelBtn.disabled = currentIndex <= 0 || state.uploadInFlight;
    }
    if (els.nextLevelBtn) {
      els.nextLevelBtn.hidden = accessibleLevels.length <= 1;
      els.nextLevelBtn.disabled = currentIndex < 0
        || currentIndex >= (accessibleLevels.length - 1)
        || state.uploadInFlight;
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
    const accessibleLevels = getAccessibleLevels();
    const normalizedLevel = normalizeBrowseLevel(nextLevel);
    if (normalizedLevel === state.selectedLevel) return;
    const currentIndex = accessibleLevels.indexOf(normalizeBrowseLevel(state.selectedLevel));
    const nextIndex = accessibleLevels.indexOf(normalizedLevel);
    const direction = nextIndex >= currentIndex ? 1 : -1;
    await animateLevelChangeTransition(direction);
    state.selectedLevel = normalizedLevel;
    state.userSelectedBookLevel = true;
    state.shelfIndex = 0;
    if (isAllBooksLevel()) {
      state.allBooksWindowStart = 0;
      state.allBooksAdvancePending = 0;
      state.allBooksSentinelMode = getAllBooksFeed().length > ALL_BOOKS_WINDOW_SIZE;
      if (state.allBooksSentinelMode) {
        state.shelfIndex = 1;
      }
    }
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
    if (window.PlaytalkApi && typeof window.PlaytalkApi.fetchSessionUser === 'function') {
      const user = await window.PlaytalkApi.fetchSessionUser({
        attempts: 3,
        retryDelayMs: 450
      });
      const normalized = normalizeUser(user);
      if (normalized) {
        return normalized;
      }
    }
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
    const expectedRaw = normalizeText(expected);
    const spokenRaw = normalizeText(spoken);
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
    const expectedRaw = normalizeText(expected);
    if (!expectedRaw) return 0;
    const matched = countLetterBlocksCoverage(expected, spoken);
    return clampReaderPercent((matched / expectedRaw.length) * 100);
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

  function setReaderMicVisible(visible) {
    if (!els.readerMicBtn) return;
    els.readerMicBtn.classList.toggle('is-visible', Boolean(visible));
  }

  function clearReaderMicScoreDisplay() {
    if (state.readerMicScoreTimer) {
      window.clearTimeout(state.readerMicScoreTimer);
      state.readerMicScoreTimer = 0;
    }
    cancelAnimatedNumber(els.readerMicScore);
    if (els.readerMicBtn) {
      els.readerMicBtn.classList.remove('is-showing-score');
    }
    if (els.readerMicScore) {
      els.readerMicScore.innerHTML = '';
      delete els.readerMicScore.dataset.displayValue;
    }
  }

  function showReaderMicScore(value) {
    if (!els.readerMicBtn || !els.readerMicScore) return;
    const display = formatReaderRoundedScoreValue(value);
    clearReaderMicScoreDisplay();
    els.readerMicScore.textContent = display.text;
    els.readerMicBtn.classList.add('is-showing-score');
    state.readerMicScoreTimer = window.setTimeout(() => {
      if (els.readerMicBtn) {
        els.readerMicBtn.classList.remove('is-showing-score');
      }
      if (els.readerMicScore) {
        cancelAnimatedNumber(els.readerMicScore);
        els.readerMicScore.innerHTML = '';
        delete els.readerMicScore.dataset.displayValue;
      }
      state.readerMicScoreTimer = 0;
    }, 1200);
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
    const normalizedLanguage = language || 'en-US';
    if (nativeSpeech && typeof nativeSpeech.isSupported === 'function' && nativeSpeech.isSupported()) {
      try {
        if (typeof nativeSpeech.captureForGameplay === 'function') {
          return await nativeSpeech.captureForGameplay({
            language: normalizedLanguage,
            maxResults: 5,
            maxDurationMs: 7000
          });
        }
        if (typeof nativeSpeech.captureOnce === 'function') {
          return await nativeSpeech.captureOnce({
            language: normalizedLanguage,
            maxResults: 5,
            maxDurationMs: 7000
          });
        }
      } catch (nativeError) {
        const nativeCode = String(nativeError?.code || '').toUpperCase();
        if (nativeCode === 'PERMISSION_DENIED') {
          throw new Error('Permissao de microfone negada.');
        }
      }
    }

    const RecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (typeof RecognitionCtor === 'function') {
      try {
        return await captureSpeechWithWebSpeech({
          language: normalizedLanguage,
          maxDurationMs: 7000,
          onRecordingStart: () => setReaderMicLive(true),
          onRecordingStop: () => setReaderMicLive(false)
        });
      } catch (webError) {
        const webMessage = safeText(webError?.message || '').toLowerCase();
        if (!webMessage.includes('permissao') && !webMessage.includes('negada')) {
          throw webError;
        }
      }
    }

    const openAiStt = window.PlaytalkOpenAiStt;
    if (openAiStt && typeof openAiStt.captureAndTranscribe === 'function' && openAiStt.isSupported?.()) {
      return openAiStt.captureAndTranscribe({
        language: normalizedLanguage,
        maxDurationMs: 7000,
        onRecordingStart: () => setReaderMicLive(true),
        onRecordingStop: () => setReaderMicLive(false)
      });
    }

    throw new Error('Microfone indisponivel neste dispositivo.');
  }

  function setReaderTrainingStatus(message) {
    if (!els.readerTrainingStatus) return;
    els.readerTrainingStatus.textContent = safeText(message);
  }

  function isReaderAdminEditingEnabled() {
    return Boolean(state.isAdmin && state.readerOpen && !state.readerFinishing);
  }

  function getActiveReaderCard() {
    if (!Array.isArray(state.readerCards) || !state.readerCards.length) return null;
    const index = Math.max(0, Math.min(state.readerCards.length - 1, state.readerIndex));
    return state.readerCards[index] || null;
  }

  function syncReaderAdminVoiceOptions() {
    if (!els.readerAdminAudioVoiceSelect || !els.createVoiceSelect) return;
    els.readerAdminAudioVoiceSelect.innerHTML = els.createVoiceSelect.innerHTML;
    els.readerAdminAudioVoiceSelect.value = safeText(els.createVoiceSelect.value || 'openai:fable') || 'openai:fable';
  }

  function setReaderAdminAudioBusy(isBusy) {
    state.readerAdminAudioBusy = Boolean(isBusy);
    if (els.readerAdminAudioSubmitBtn) {
      els.readerAdminAudioSubmitBtn.disabled = state.readerAdminAudioBusy;
      els.readerAdminAudioSubmitBtn.textContent = state.readerAdminAudioBusy ? 'Enviando...' : 'Enviar';
    }
    if (els.readerAdminAudioCloseBtn) {
      els.readerAdminAudioCloseBtn.disabled = state.readerAdminAudioBusy;
    }
    if (els.readerAdminAudioTextInput) {
      els.readerAdminAudioTextInput.disabled = state.readerAdminAudioBusy;
    }
    if (els.readerAdminAudioVoiceSelect) {
      els.readerAdminAudioVoiceSelect.disabled = state.readerAdminAudioBusy;
    }
  }

  function openReaderAdminAudioModal() {
    if (!isReaderAdminEditingEnabled() || !els.readerAdminAudioModal) return;
    const card = getActiveReaderCard();
    if (!card) return;
    syncReaderAdminVoiceOptions();
    if (els.readerAdminAudioTextInput) {
      const seedText = state.readerDisplayLanguage === 'portuguese'
        ? safeText(card.portuguese || card.english)
        : safeText(card.english);
      els.readerAdminAudioTextInput.value = seedText;
    }
    setReaderAdminAudioBusy(false);
    els.readerAdminAudioModal.classList.add('is-visible');
  }

  function closeReaderAdminAudioModal(force) {
    if (!els.readerAdminAudioModal) return;
    if (state.readerAdminAudioBusy && !force) return;
    els.readerAdminAudioModal.classList.remove('is-visible');
  }

  async function saveReaderCardEdit(payload) {
    const activeBook = findActiveReaderBook();
    const activeCard = getActiveReaderCard();
    if (!activeBook || !activeCard) {
      throw new Error('Card ativo nao encontrado para editar.');
    }
    const response = await postJsonWithSuccess('/api/admin/minibooks/update-card', {
      bookId: activeBook.bookId,
      storyId: activeCard.storyId,
      storyKey: activeCard.storyKey,
      cardIndex: activeCard.cardIndex,
      ...payload
    }, 'Nao foi possivel atualizar o card do livro.');
    const nextCard = response?.card && typeof response.card === 'object' ? response.card : {};
    Object.assign(activeCard, {
      english: safeText(nextCard.english || activeCard.english),
      portuguese: safeText(nextCard.portuguese || activeCard.portuguese),
      audio: safeText(nextCard.audio || activeCard.audio),
      highlight: Boolean(nextCard.highlight)
    });
    state.readerLastAudioKey = '';
    return activeCard;
  }

  function stopInlineReaderEditing() {
    state.readerInlineEditing = false;
    if (!els.readerEnglish) return;
    els.readerEnglish.contentEditable = 'false';
    els.readerEnglish.classList.remove('is-inline-editing');
  }

  function startInlineReaderEditing() {
    if (!isReaderAdminEditingEnabled() || !els.readerEnglish) return;
    state.readerInlineEditing = true;
    els.readerEnglish.contentEditable = 'true';
    els.readerEnglish.classList.add('is-inline-editing');
    try {
      els.readerEnglish.focus({ preventScroll: true });
    } catch (_error) {
      // ignore
    }
    const selection = window.getSelection ? window.getSelection() : null;
    if (selection && document.createRange) {
      const range = document.createRange();
      range.selectNodeContents(els.readerEnglish);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }

  async function submitInlineReaderEditing() {
    if (!state.readerInlineEditing || !els.readerEnglish) return;
    const editedText = safeText(els.readerEnglish.textContent || '');
    if (!editedText) {
      setStatus('O texto do card nao pode ficar vazio.', 'error');
      return;
    }
    stopInlineReaderEditing();
    const payload = state.readerDisplayLanguage === 'portuguese'
      ? { portuguese: editedText }
      : { english: editedText };
    try {
      await saveReaderCardEdit(payload);
      renderReader();
      setStatus('Texto do card atualizado.', 'success');
    } catch (error) {
      renderReader();
      setStatus(error?.message || 'Falha ao atualizar o texto do card.', 'error');
    }
  }

  async function submitReaderAdminAudioModal() {
    if (!isReaderAdminEditingEnabled() || state.readerAdminAudioBusy) return;
    const audioText = safeText(els.readerAdminAudioTextInput?.value || '');
    const voice = safeText(els.readerAdminAudioVoiceSelect?.value || els.createVoiceSelect?.value || 'openai:fable');
    if (!audioText) {
      setStatus('Preencha o texto antes de gerar o audio.', 'error');
      return;
    }
    setReaderAdminAudioBusy(true);
    try {
      await saveReaderCardEdit({
        audioText,
        voice
      });
      setReaderAdminAudioBusy(false);
      closeReaderAdminAudioModal(true);
      setStatus('Audio do card atualizado com sucesso.', 'success');
      renderReader();
    } catch (error) {
      setStatus(error?.message || 'Falha ao atualizar o audio do card.', 'error');
    } finally {
      setReaderAdminAudioBusy(false);
    }
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
    if (state.readerMode === 'speaking-training') {
      state.readerLastAudioKey = `${Number(index) || 0}::speaking-training`;
      setReaderMicVisible(true);
      return;
    }
    const source = safeText(card?.audio || card?.audioUrl);
    const english = safeText(card?.english);
    const key = `${Number(index) || 0}::${source || english}`;

    if (!source) {
      state.readerLastAudioKey = key;
      setReaderMicVisible(true);
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
    audio.onended = () => {
      if (token !== state.readerAudioToken) return;
      state.readerSessionListenedMs += Math.max(0, Math.round((Number(audio.duration) || 0) * 1000));
      addListeningProgress(english);
    };
    state.readerAudioElement = audio;

    try {
      await audio.play();
      if (token !== state.readerAudioToken) {
        audio.pause();
        return;
      }
      setReaderMicVisible(true);
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

  function updateReaderCurrentBadge(percent, options = {}) {
    const badgeEl = els.readerCurrentBadge;
    if (!badgeEl) return;
    const shouldShow = isReaderTrainingMode();
    const badge = shouldShow ? getMyBooksBadge(percent) : null;
    const nextSrc = safeText(badge?.src);
    const nextRank = getMyBooksBadgeRank(badge);
    const previousSrc = state.readerCurrentBadgeSrc;
    const previousRank = state.readerCurrentBadgeRank;

    if (!nextSrc) {
      badgeEl.hidden = true;
      badgeEl.removeAttribute('src');
      badgeEl.classList.remove('is-swapping', 'is-flashing');
      state.readerCurrentBadgeSrc = '';
      state.readerCurrentBadgeRank = 0;
      return;
    }

    if (nextSrc === previousSrc && !options.force) return;

    if (state.readerCurrentBadgeTimer) {
      window.clearTimeout(state.readerCurrentBadgeTimer);
      state.readerCurrentBadgeTimer = 0;
    }

    badgeEl.hidden = false;
    badgeEl.src = nextSrc;
    badgeEl.alt = safeText(badge.alt);
    badgeEl.classList.remove('is-swapping', 'is-flashing');
    void badgeEl.offsetWidth;
    badgeEl.classList.add(nextRank > previousRank ? 'is-flashing' : 'is-swapping');
    state.readerCurrentBadgeTimer = window.setTimeout(() => {
      badgeEl.classList.remove('is-swapping', 'is-flashing');
      state.readerCurrentBadgeTimer = 0;
    }, 540);

    state.readerCurrentBadgeSrc = nextSrc;
    state.readerCurrentBadgeRank = nextRank;
  }

  function resetReaderCurrentBadge() {
    if (state.readerCurrentBadgeTimer) {
      window.clearTimeout(state.readerCurrentBadgeTimer);
      state.readerCurrentBadgeTimer = 0;
    }
    state.readerCurrentBadgeSrc = '';
    state.readerCurrentBadgeRank = 0;
    if (!els.readerCurrentBadge) return;
    els.readerCurrentBadge.hidden = true;
    els.readerCurrentBadge.removeAttribute('src');
    els.readerCurrentBadge.classList.remove('is-swapping', 'is-flashing');
  }

  function updateReaderPronPercent() {
    const totalCards = Math.max(0, Number(state.readerCards?.length) || 0);
    const currentIndex = Math.max(0, Math.min(Math.max(0, totalCards - 1), Number(state.readerIndex) || 0));
    const bookProgressPercent = totalCards > 0
      ? Math.max(0, Math.min(100, ((currentIndex + 1) / totalCards) * 100))
      : 0;
    const readingPronunciationPercent = calculateReaderAverageScore();
    const pronunciationDisplay = formatReaderScoreValue(readingPronunciationPercent);
    if (els.readerPronRing) {
      els.readerPronRing.style.setProperty('--percent', String(bookProgressPercent));
      els.readerPronRing.style.setProperty('--reader-progress-angle', `${bookProgressPercent * 3.6}deg`);
    }
    if (els.readerPronPercent) {
      void animateDecimalMarkup(els.readerPronPercent, pronunciationDisplay.scaledValue, {
        decimals: 2,
        suffix: '%',
        duration: SCORE_ANIMATION_MS,
        startValue: 0
      });
    }
    updateReaderCurrentBadge(readingPronunciationPercent);
  }

  function updateReaderLanguageButtons() {
    const showToggles = state.readerMode === 'speaking-training';
    const visualLanguage = state.readerVisualLanguage === 'portuguese' ? 'portuguese' : 'english';
    if (els.readerLangEnglishBtn) {
      els.readerLangEnglishBtn.hidden = !showToggles;
      els.readerLangEnglishBtn.classList.toggle('is-active', visualLanguage === 'english');
      els.readerLangEnglishBtn.setAttribute('aria-pressed', visualLanguage === 'english' ? 'true' : 'false');
    }
    if (els.readerLangPortugueseBtn) {
      els.readerLangPortugueseBtn.hidden = !showToggles;
      els.readerLangPortugueseBtn.classList.toggle('is-active', visualLanguage === 'portuguese');
      els.readerLangPortugueseBtn.setAttribute('aria-pressed', visualLanguage === 'portuguese' ? 'true' : 'false');
    }
  }

  function getActiveReaderCard() {
    const total = state.readerCards.length;
    if (!total) return null;
    const index = Math.max(0, Math.min(total - 1, state.readerIndex));
    return state.readerCards[index] || null;
  }

  function updateReaderListeningPortugueseUi() {
    const isListening = state.readerMode === 'listening-training';
    const hidePortuguese = Boolean(state.readerListeningRevealPortuguese);
    if (els.readerPortuguese) {
      els.readerPortuguese.hidden = !isListening;
      els.readerPortuguese.classList.toggle('is-muted', isListening && hidePortuguese);
    }
    if (els.readerHidePortugueseBtn) {
      els.readerHidePortugueseBtn.classList.toggle('is-active', isListening && hidePortuguese);
      els.readerHidePortugueseBtn.setAttribute('aria-pressed', isListening && hidePortuguese ? 'true' : 'false');
      els.readerHidePortugueseBtn.setAttribute('aria-label', isListening && hidePortuguese ? 'Mostrar traducao em portugues' : 'Ocultar traducao em portugues');
    }
  }

  async function replayReaderListeningAudio() {
    if (state.readerMode !== 'listening-training') return;
    const card = getActiveReaderCard();
    if (!card) return;
    const index = Math.max(0, Math.min(state.readerCards.length - 1, state.readerIndex));
    state.readerLastAudioKey = '';
    await playReaderCardAudio(card, index);
  }

  function setReaderVisualLanguage(language) {
    const nextLanguage = language === 'portuguese' ? 'portuguese' : 'english';
    if (state.readerVisualLanguage === nextLanguage) {
      updateReaderLanguageButtons();
      return;
    }
    state.readerVisualLanguage = nextLanguage;
    renderReader();
  }

  function formatReaderListeningText(value) {
    const text = safeText(value).trim();
    if (!text) return '';
    return text.charAt(0).toLocaleUpperCase('pt-BR') + text.slice(1).toLocaleLowerCase('pt-BR');
  }

  function formatReaderListeningDisplayText(value) {
    const normalized = formatReaderListeningText(value).replace(/\s+/g, ' ').trim();
    if (!normalized) return '';
    if (normalized.length <= 18) return normalized;
    const midpoint = Math.floor(normalized.length / 2);
    const leftBreak = normalized.lastIndexOf(' ', midpoint);
    const rightBreak = normalized.indexOf(' ', midpoint);
    let breakAt = -1;
    if (leftBreak > 3 && rightBreak > 3) {
      breakAt = (midpoint - leftBreak) <= (rightBreak - midpoint) ? leftBreak : rightBreak;
    } else if (leftBreak > 3) {
      breakAt = leftBreak;
    } else if (rightBreak > 3) {
      breakAt = rightBreak;
    }
    if (breakAt < 0) {
      breakAt = Math.min(18, Math.max(6, midpoint));
    }
    const firstLine = normalized.slice(0, breakAt).trim();
    const secondLine = normalized.slice(breakAt).trim();
    return `${firstLine}\n${secondLine}`;
  }

  function setReaderVisible(visible) {
    state.readerOpen = Boolean(visible);
    if (els.reader) {
      els.reader.classList.toggle('is-visible', state.readerOpen);
    }
    document.body.classList.toggle('books-reader-open', state.readerOpen);
  }

  function clampReaderPercent(value) {
    return Math.max(0, Math.min(100, Number(value) || 0));
  }

  function normalizeReaderPercent(value) {
    return Math.round(clampReaderPercent(value));
  }

  function applyReaderSentenceBonus(value) {
    return clampReaderPercent(Number(value) + 10);
  }

  function formatReaderScoreValue(value) {
    const normalized = Math.max(0, Math.min(100, Number(value) || 0));
    const scaled = normalized / 10;
    return {
      text: scaled.toFixed(2),
      scaledValue: scaled
    };
  }

  function formatReaderRoundedScoreValue(value) {
    const precise = formatReaderScoreValue(value);
    const roundedValue = Math.max(0, Math.ceil(precise.scaledValue));
    return {
      text: `${roundedValue}`,
      roundedValue
    };
  }

  function syncSleepFabVisibility() {
    const fab = els.homeSleepFab;
    if (!fab) return;
    const shouldShow = isAllBooksLevel() && !state.homeStartBusy;
    fab.hidden = !shouldShow;
    fab.disabled = state.homeStartBusy;
    if (shouldShow && !state.homeSleepActive) {
      startHomeBookMetaRotation();
      renderSleepFabMeta();
    } else {
      renderSleepFabMeta();
    }
  }

  function getReaderDisplayedScorePercent(value) {
    return clampReaderPercent(value);
  }

  function isReaderTrainingMode(mode = state.readerMode) {
    return mode === 'listening-training' || mode === 'speaking-training';
  }

  function getReaderLockedLanguage(mode = state.readerMode) {
    return 'english';
  }

  async function startDirectRankedListeningBook(book) {
    if (!book || state.modeStartBusy) return;
    const bookId = safeText(book?.bookId);
    if (!bookId) return;

    if (isHomeLevel() && state.homeIntroDismissed) {
      state.homePaused = true;
      renderHomeTransportUi();
      const voice = state.homeAudioElement;
      if (voice && !voice.paused) {
        commitHomeAudioPracticeProgress(voice);
        try {
          voice.pause();
        } catch (_error) {
          // ignore
        }
      }
    }

    state.modeBookId = bookId;
    state.modeBook = book;
    state.preBookRankedMode = true;
    setModeStartBusy(true);

    try {
      const cards = await prepareReaderData(book);
      await startBookByMode(book, 'listening-training', cards);
    } catch (error) {
      setStatus(error?.message || 'Nao foi possivel abrir o livro.', 'error');
    } finally {
      state.modeBookId = '';
      state.modeBook = null;
      setModeStartBusy(false);
    }
  }

  function calculateReaderAverageScore() {
    if (!Array.isArray(state.readerScores) || !state.readerScores.length) return 0;
    const total = state.readerScores.reduce((acc, value) => acc + clampReaderPercent(value), 0);
    return clampReaderPercent(total / state.readerScores.length);
  }

  function commitReaderPhrasePracticeProgress() {
    if (!isReaderTrainingMode()) return;
    const shownAt = Number(state.readerCardShownAt) || 0;
    if (!shownAt) return;
    const elapsedSeconds = Math.max(0, (Date.now() - shownAt) / 1000);
    const creditedSeconds = Math.min(READER_PRACTICE_CAP_SECONDS, elapsedSeconds);
    state.readerCardShownAt = 0;
    addPracticeProgressSeconds(creditedSeconds);
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

  function setReaderFinishLineContent(line) {
    if (!els.readerFinishLine) return;
    if (line && typeof line === 'object' && Number.isFinite(Number(line.scoreValue))) {
      const initialValue = Number.isFinite(Number(line.initialScoreValue))
        ? Number(line.initialScoreValue)
        : Number(line.scoreValue);
      els.readerFinishLine.innerHTML = buildDecimalMarkup(initialValue, {
        decimals: 2,
        prefix: safeText(line.prefix || ''),
        suffix: safeText(line.suffix || '')
      });
      els.readerFinishLine.dataset.displayValue = String(initialValue);
      return;
    }
    els.readerFinishLine.textContent = safeText(line);
    delete els.readerFinishLine.dataset.displayValue;
  }

  async function animateReaderFinishLine(line) {
    if (!els.readerFinishLine) return;
    cancelAnimatedNumber(els.readerFinishLine);
    els.readerFinishLine.classList.remove('is-visible');
    setReaderFinishLineContent(line);
    void els.readerFinishLine.offsetWidth;
    els.readerFinishLine.classList.add('is-visible');
    if (line && typeof line === 'object' && Number.isFinite(Number(line.scoreValue))) {
      setReaderFinishLineContent({
        ...line,
        initialScoreValue: 0
      });
      void animateDecimalMarkup(els.readerFinishLine, Number(line.scoreValue), {
        decimals: 2,
        duration: SCORE_ANIMATION_MS,
        startValue: 0,
        prefix: safeText(line.prefix || ''),
        suffix: safeText(line.suffix || '')
      });
    }
    await wait(READER_FINISH_LINE_ENTER_MS);
  }

  async function postReaderBookCompletion(book, options = {}) {
    const bookId = safeText(book?.bookId);
    const mode = safeText(options.mode) || 'free-read';
    const scorePercent = normalizeReaderPercent(options.scorePercent);
    const listenedSeconds = Math.max(0, Math.round(Number(options.listenedSeconds) || 0));
    const speakingChars = Math.max(0, Math.round(Number(options.speakingChars) || 0));
    if (!bookId) {
      return {
        success: false,
        message: 'Livro sem identificador para salvar progresso.',
        stats: {
          bookReadCount: 0,
          generalPronunciationPercent: scorePercent
        }
      };
    }

    try {
      const response = await fetch(buildApiUrl('/api/books/complete'), {
        method: 'POST',
        credentials: 'include',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          bookId,
          mode,
          scorePercent,
          listenedSeconds,
          speakingChars
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) {
        return {
          success: false,
          message: payload?.message || 'Nao consegui salvar progresso do livro.',
          stats: {
            bookReadCount: 0,
            generalPronunciationPercent: scorePercent
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
          generalPronunciationPercent: scorePercent
        }
      };
    }
  }

  async function runReaderBookCompletionSequence() {
    if (!state.readerOpen || !isReaderTrainingMode() || state.readerFinishing) return;

    commitReaderPhrasePracticeProgress();
    state.readerFinishing = true;
    state.readerFinishToken += 1;
    const token = state.readerFinishToken;
    const activeBook = findActiveReaderBook();
    const sessionPronunciationPercent = calculateReaderAverageScore();
    let completionPromise = null;

    if (els.reader) {
      els.reader.classList.add('is-finishing');
    }

    await wait(READER_FINISH_DISSOLVE_MS);
    if (token !== state.readerFinishToken || !state.readerOpen) return;

    showReaderFinishUi(activeBook);
    await wait(READER_FINISH_BOOK_ENTER_MS);
    if (token !== state.readerFinishToken || !state.readerOpen) return;

    triggerReaderFinishFlash();

    if (state.readerRankedMode) {
      await flushBooksPronunciationIfNeeded(true);
    }
    if (token !== state.readerFinishToken || !state.readerOpen) return;

    completionPromise = postReaderBookCompletion(activeBook, {
      mode: state.readerMode,
      scorePercent: sessionPronunciationPercent,
      listenedSeconds: Math.round(state.readerSessionListenedMs / 1000),
      speakingChars: state.readerSessionSpokenChars
    });

    const completionPayload = await completionPromise;
    if (token !== state.readerFinishToken || !state.readerOpen) return;
    if (completionPayload?.stats) {
      setStatsState({ ...(state.stats || {}), ...(completionPayload.stats || {}) });
      await refreshDailyMissionFromServer().catch(() => null);
      renderStatsPanel();
      syncSelectedLevelWithUnlocked({ preferUnlocked: !state.userSelectedBookLevel });
      renderLevelMenu();
      renderCards();
      renderHomeMissionSummary();
    }

    const savedBookRead = Math.max(0, Number(completionPayload?.stats?.bookReadCount) || 0);
    const savedGeneralPronunciation = normalizePrecisePercent(
      completionPayload?.stats?.generalPronunciationPercent
    );
    const sessionPronunciationDisplay = formatReaderScoreValue(sessionPronunciationPercent);
    const savedGeneralPronunciationDisplay = formatReaderScoreValue(savedGeneralPronunciation);
    const lines = state.readerRankedMode
      ? [
        {
          prefix: 'Pronuncia: ',
          scoreValue: sessionPronunciationDisplay.scaledValue
        },
        `${savedBookRead > 0 ? savedBookRead : '--'} Livros`,
        {
          prefix: 'Nota geral ',
          scoreValue: savedGeneralPronunciationDisplay.scaledValue
        }
      ]
      : [
        'Treino concluido',
        `${savedBookRead > 0 ? savedBookRead : '--'} Livros`,
        'Progresso salvo'
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
    const completionPromise = postReaderBookCompletion(activeBook, {
      mode: 'free-read',
      scorePercent: 0,
      listenedSeconds: Math.round(state.readerSessionListenedMs / 1000),
      speakingChars: 0
    });

    triggerReaderSuccessBookFlash();
    if (els.reader) {
      els.reader.classList.add('is-finishing');
    }

    await wait(READER_FINISH_DISSOLVE_MS);
    if (token !== state.readerFinishToken || !state.readerOpen) return;

    const completionPayload = await completionPromise;
    if (token !== state.readerFinishToken || !state.readerOpen) return;
    if (completionPayload?.stats) {
      setStatsState({ ...(state.stats || {}), ...(completionPayload.stats || {}) });
      await refreshDailyMissionFromServer().catch(() => null);
      renderStatsPanel();
      syncSelectedLevelWithUnlocked({ preferUnlocked: !state.userSelectedBookLevel });
      renderLevelMenu();
      renderCards();
      renderHomeMissionSummary();
    }

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
      safeText(profile.avatarImage)
    ]
      .filter(Boolean)
      .filter((url, index, list) => list.indexOf(url) === index);

    if (!urls.length) return;
    await Promise.all(urls.map((url) => preloadImageUrl(url)));
  }

  function applyReaderBackground(book) {
    if (!els.reader) return;
    els.reader.style.background = DEFAULT_READER_BACKGROUND;
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
    els.readerAvatarImage.src = avatar || DEFAULT_PROFILE_AVATAR;
    els.readerAvatarImage.hidden = false;
    els.readerAvatarFallback.hidden = true;
  }

  function renderReaderModeUi() {
    const isTraining = isReaderTrainingMode();
    const isAdminEditor = Boolean(state.isAdmin);
    const activeBook = findActiveReaderBook();
    const hidesBookHero = state.readerMode === 'speaking-training' || state.readerMode === 'free-read' || isTraining;
    if (els.reader) {
      els.reader.dataset.readerMode = state.readerMode || 'free-read';
      els.reader.classList.toggle('is-admin-reader', isAdminEditor);
    }
    if (els.readerBookHero) {
      els.readerBookHero.hidden = hidesBookHero;
    }
    if (!hidesBookHero) {
      renderReaderBookCover(activeBook);
    }
    if (els.readerProfile) {
      els.readerProfile.hidden = !isTraining;
    }
    if (els.readerUserName) {
      els.readerUserName.hidden = true;
    }
    if (els.readerTraining) {
      els.readerTraining.hidden = !(isTraining || isAdminEditor);
    }
    if (els.readerPronPercent) {
      els.readerPronPercent.hidden = !isTraining;
    }
    if (els.readerMicBtn) {
      els.readerMicBtn.disabled = (!(isTraining || isAdminEditor)) || state.readerMicBusy || state.readerFinishing || state.readerAdminAudioBusy;
    }
    if (els.readerReplayBtn) {
      els.readerReplayBtn.disabled = state.readerMode !== 'listening-training' || state.readerMicBusy || state.readerFinishing || state.readerAdminAudioBusy;
    }
    if (els.readerHidePortugueseBtn) {
      els.readerHidePortugueseBtn.disabled = state.readerMode !== 'listening-training';
    }
    if (els.readerEnglish) {
      els.readerEnglish.classList.toggle('is-admin-editable', isAdminEditor);
    }
    updateReaderLanguageButtons();
    updateReaderListeningPortugueseUi();
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
    const displayLanguage = state.readerMode === 'speaking-training'
      ? (state.readerVisualLanguage === 'portuguese' ? 'portuguese' : 'english')
      : (isReaderTrainingMode() ? getReaderLockedLanguage() : 'english');
    state.readerDisplayLanguage = displayLanguage;
    const listeningPortuguese = formatReaderListeningText(portuguese);
    const displayText = state.readerMode === 'listening-training'
      ? formatReaderListeningDisplayText(english)
      : (displayLanguage === 'portuguese' ? portuguese : english);
    const displayTextFormatted = state.readerMode === 'listening-training'
      ? sanitizeReaderDisplayText(displayText)
      : splitBalancedLines(sanitizeReaderDisplayText(displayText));
    if (state.readerRenderedCardIndex !== index) {
      if (state.readerRenderedCardIndex >= 0) {
        commitReaderPhrasePracticeProgress();
      }
      state.readerRenderedCardIndex = index;
      state.readerCardShownAt = Date.now();
      if (isReaderTrainingMode()) {
      state.readerCurrentScore = null;
      if (els.readerCurrentScore) {
        els.readerCurrentScore.textContent = '-';
      }
      setReaderMicVisible(false);
      }
    }
    els.readerEnglish.textContent = displayTextFormatted || 'Sem conteudo neste livro.';
    if (els.readerPortuguese) {
      const portugueseText = splitBalancedLines(sanitizeReaderDisplayText(listeningPortuguese));
      els.readerPortuguese.textContent = portugueseText || '';
    }
    els.readerEnglish.classList.toggle('is-highlight', highlight && displayLanguage === 'english');
    if (displayText) {
      const readingKey = `reader:${safeText(state.readerBookId)}:${displayLanguage}:${index}:${displayText}`;
      if (state.readerLastReadingKey !== readingKey) {
        state.readerLastReadingKey = readingKey;
        addReadingProgress(displayText, readingKey);
      }
    }
    animateReaderPhrase();
    if (state.readerMode === 'listening-training') {
      setReaderMicVisible(true);
    } else {
      void playReaderCardAudio(card, index);
    }
    updateReaderProgress(total, index);
    renderReaderModeUi();
  }

  function closeReader() {
    commitReaderPhrasePracticeProgress();
    stopReaderAudio();
    stopInlineReaderEditing();
    closeReaderAdminAudioModal(true);
    state.readerFinishToken += 1;
    state.readerFinishing = false;
    resetReaderFinishUi();
    setReaderVisible(false);
    state.readerBookId = '';
    state.readerMode = 'free-read';
    state.readerRankedMode = false;
    state.readerCards = [];
    state.readerIndex = 0;
    state.readerDisplayLanguage = 'english';
    state.readerVisualLanguage = 'english';
    state.readerListeningRevealPortuguese = false;
    state.readerScores = [];
    state.readerCurrentScore = null;
    resetReaderCurrentBadge();
    state.readerSessionListenedMs = 0;
    state.readerSessionSpokenChars = 0;
    state.readerMicBusy = false;
    state.readerLastAudioKey = '';
    state.readerLastReadingKey = '';
    state.readerCardShownAt = 0;
    state.readerRenderedCardIndex = -1;
    state.readerAdminAudioBusy = false;
    setReaderTrainingStatus('');
    clearReaderMicScoreDisplay();
    setReaderMicLive(false);
    setReaderMicVisible(false);
  }

  function stepReader(delta) {
    if (!state.readerOpen || !state.readerCards.length || state.readerFinishing || state.readerInlineEditing) return;
    if (els.readerAdminAudioModal?.classList.contains('is-visible')) return;
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
          highlight: Boolean(entry?.highlight),
          storyId: safeText(entry?.battleStoryId),
          storyKey: safeText(entry?.battleStoryKey),
          cardIndex: Number.parseInt(entry?.battleCardIndex, 10) || 0,
          bookId: safeText(entry?.battleBookId)
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
      state.readerBookId = safeText(book.bookId);
      state.readerMode = ['listening-training', 'speaking-training', 'free-read'].includes(mode) ? mode : 'free-read';
      state.readerRankedMode = isReaderTrainingMode(state.readerMode) ? Boolean(state.preBookRankedMode) : false;
      state.readerCards = cards.length
        ? cards
        : [{
          english: 'Este livro nao tem frases em ingles ainda.',
          portuguese: 'Este livro nao tem frases em ingles ainda.',
          audio: ''
        }];
      state.readerScores = [];
      state.readerCurrentScore = null;
      resetReaderCurrentBadge();
      state.readerSessionListenedMs = 0;
      state.readerSessionSpokenChars = 0;
      state.readerDisplayLanguage = 'english';
      state.readerVisualLanguage = 'english';
      state.readerListeningRevealPortuguese = false;
      state.readerMicBusy = false;
      state.readerLastAudioKey = '';
      state.readerCardShownAt = 0;
      state.readerRenderedCardIndex = -1;
      state.readerIndex = 0;
      renderReaderAvatar();
      renderReaderBookCover(book);
      setReaderTrainingStatus('');
      renderReader();
      setReaderVisible(true);
      setStatus('', null);
    } catch (error) {
      closeReader();
      setStatus(error?.message || 'Nao foi possivel abrir o livro.', 'error');
    }
  }

  async function handleReaderMicTraining() {
    if (!state.readerOpen || state.readerMicBusy || state.readerFinishing) return;
    if (state.isAdmin) {
      openReaderAdminAudioModal();
      return;
    }
      if (!isReaderTrainingMode()) return;
    const card = state.readerCards[state.readerIndex];
    if (!card || !safeText(card.english)) return;

    stopReaderAudio();
    state.readerMicBusy = true;
    renderReaderModeUi();
    setReaderTrainingStatus('');
    setReaderMicLive(true);

      try {
        const transcript = safeText(await captureSpeechFast('en-US'));
        if (transcript) {
          state.readerSessionSpokenChars += transcript.length;
        }
        const rawScore = calculateSpeechMatchPercent(card.english, transcript);
        const withBonus = rawScore > 50 ? applyReaderSentenceBonus(rawScore) : rawScore;
        const displayedScore = getReaderDisplayedScorePercent(withBonus);
        state.readerScores.push(displayedScore);
        if (state.readerRankedMode) {
          addPendingPronunciationSample(displayedScore);
        }
        state.readerCurrentScore = displayedScore;
        if (els.readerCurrentScore) {
          els.readerCurrentScore.textContent = `${displayedScore.toFixed(2)}%`;
        }
        updateReaderPronPercent();
        showReaderMicScore(displayedScore);
        setReaderTrainingStatus('');
        if (state.readerIndex < (state.readerCards.length - 1)) {
        window.setTimeout(() => {
          stepReader(1);
        }, 220);
        } else {
          setReaderTrainingStatus('');
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

  function handleHomeSwipeStart(event) {
    if (!state.homeIntroDismissed) return;
    const touch = event.touches?.[0];
    if (!touch) return;
    state.homeTouchStartX = Number(touch.clientX) || 0;
    state.homeTouchStartY = Number(touch.clientY) || 0;
  }

  function handleHomeSwipeEnd(event) {
    if (!state.homeIntroDismissed) return;
    const touch = event.changedTouches?.[0];
    if (!touch) return;
    const dx = (Number(touch.clientX) || 0) - state.homeTouchStartX;
    const dy = state.homeTouchStartY - (Number(touch.clientY) || 0);
    if (dy >= HOME_SWIPE_UP_THRESHOLD && Math.abs(dy) > Math.abs(dx)) {
      void requestHomeNextBook();
      return;
    }
    if (dy <= -HOME_SWIPE_DOWN_THRESHOLD && Math.abs(dy) > Math.abs(dx)) {
      void requestHomePreviousBook();
    }
  }

  function handleHomeWheel(event) {
    if (!state.homeIntroDismissed) return;
    if (isOverlayOpen()) return;
    const deltaY = Number(event.deltaY) || 0;
    if (Math.abs(deltaY) < HOME_WHEEL_THRESHOLD) return;
    event.preventDefault();
    if (deltaY > 0) {
      void requestHomeNextBook();
      return;
    }
    void requestHomePreviousBook();
  }

  function bindEvents() {
    els.prevLevelBtn?.addEventListener('click', () => {
      const accessibleLevels = getAccessibleLevels();
      const currentIndex = accessibleLevels.indexOf(normalizeBrowseLevel(state.selectedLevel));
      const targetLevel = accessibleLevels[Math.max(0, currentIndex - 1)];
      void setLevel(targetLevel);
    });

    els.nextLevelBtn?.addEventListener('click', () => {
      const accessibleLevels = getAccessibleLevels();
      const currentIndex = accessibleLevels.indexOf(normalizeBrowseLevel(state.selectedLevel));
      const targetLevel = accessibleLevels[Math.min(accessibleLevels.length - 1, currentIndex + 1)];
      void setLevel(targetLevel);
    });

    els.shelfViewport?.addEventListener('wheel', (event) => {
      if (isHomeShellActive() || isStatsLevel()) return;
      if (isOverlayOpen()) return;
      const deltaY = Number(event.deltaY) || 0;
      if (Math.abs(deltaY) < 4) return;
      event.preventDefault();
      state.shelfLastGestureAt = Date.now();
      void snapShelfByStep(deltaY > 0 ? 1 : -1);
    }, { passive: false });

    els.shelfViewport?.addEventListener('touchstart', (event) => {
      if (isHomeShellActive() || isStatsLevel()) return;
      const touch = event.touches?.[0];
      if (!touch) return;
      state.shelfTouchStartX = Number(touch.clientX) || 0;
      state.shelfTouchStartY = Number(touch.clientY) || 0;
      state.shelfGestureMoved = false;
    }, { passive: true });

    els.shelfViewport?.addEventListener('touchmove', (event) => {
      if (isHomeShellActive() || isStatsLevel()) return;
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
      if (isHomeShellActive() || isStatsLevel()) return;
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
        const accessibleLevels = getAccessibleLevels();
        const currentIndex = accessibleLevels.indexOf(normalizeBrowseLevel(state.selectedLevel));
        if (dx < 0) {
          void setLevel(accessibleLevels[Math.min(accessibleLevels.length - 1, currentIndex + 1)]);
        } else {
          void setLevel(accessibleLevels[Math.max(0, currentIndex - 1)]);
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
      resetCreateModalState('create');
      if (els.createInput) {
        els.createInput.value = '';
      }
      if (els.createIdeaInput) {
        els.createIdeaInput.value = '';
      }
      if (els.createCharsInput) {
        els.createCharsInput.value = '900';
      }
      openCreateModal();
    });

    els.homeAuthForm?.addEventListener('submit', (event) => {
      event.preventDefault();
      void loginFromBooksHome();
    });

    els.homeLaunchBtn?.addEventListener('click', (event) => {
      void (async () => {
        if (await handleManualNoEnergyBlock(event.currentTarget, 'sleep')) return;
        void startHomeSleepPlayback({ previewTarget: event.currentTarget });
      })();
    });

    els.homeCollectBtn?.addEventListener('click', () => {
      void openBooksCollectionFromHome();
    });

    els.homeSwitchAccountBtn?.addEventListener('click', () => {
      navigateTo('/account');
    });

    els.homePremiumBtn?.addEventListener('click', () => {
      if (!state.user?.id) {
        navigateTo('/account');
        return;
      }
      navigateTo('/premium');
    });

    els.homeRepeatBtn?.addEventListener('click', () => {
      state.homeRepeatIndex = (state.homeRepeatIndex + 1) % HOME_REPEAT_OPTIONS.length;
      renderHomeTransportUi();
      refreshHomeProgressFromPlayback();
    });

    els.homeMusicBtn?.addEventListener('click', () => {
      toggleHomeMusicLoop();
    });

    els.homePauseBtn?.addEventListener('click', () => {
      void toggleHomePausePlayback();
    });

    els.homeCornerHomeBtn?.addEventListener('click', () => {
      // Back to the Home/login screen.
      stopHomeSleepPlayback({ keepIntro: false });
      renderHomeAuthUi();
      renderLevelMenu();
      renderCards();
    });

    els.homeCornerPlayBtn?.addEventListener('click', (event) => {
      event.stopPropagation();
    });

    els.homeBlackoutToggle?.addEventListener('change', () => {
      setHomeBlackoutMode(Boolean(els.homeBlackoutToggle?.checked));
    });

    els.homeSleepFab?.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      void (async () => {
        if (await handleManualNoEnergyBlock(event.currentTarget, 'sleep')) return;
        void startHomeSleepPlayback({ previewTarget: event.currentTarget });
      })();
    });

    // Tapping the current book cover in the Home player opens the pre-book overlay (paused + blurred).
    els.homeCover?.addEventListener('click', () => {
      if (!isHomeLevel() || !state.homeIntroDismissed) return;
      const current = state.homeCurrentSession?.book || null;
      if (!current || !safeText(current?.bookId)) return;
      void startDirectRankedListeningBook(current);
    });

    els.topHomeBtn?.addEventListener('click', () => {
      window.location.href = '/play';
    });

    els.homeSpeedBtn?.addEventListener('click', () => {
      cycleHomeSpeed();
    });

    els.homeLanguageBtn?.addEventListener('click', () => {
      toggleHomeTextMode();
    });

    els.playerBooksProgressTrack?.addEventListener('pointerdown', (event) => {
      if (typeof event.button === 'number' && event.button !== 0) return;
      startHomeProgressDrag(event.clientX);
      try {
        els.playerBooksProgressTrack?.setPointerCapture(event.pointerId);
      } catch (_error) {
        // ignore
      }
      event.preventDefault();
    });

    window.addEventListener('pointermove', (event) => {
      updateHomeProgressDrag(event.clientX);
    });

    window.addEventListener('pointerup', () => {
      stopHomeProgressDrag();
    });

    window.addEventListener('pointercancel', () => {
      stopHomeProgressDrag();
    });

    els.playerBooksProgressTrack?.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && event.key !== 'Home' && event.key !== 'End') return;
      event.preventDefault();
      const current = Math.max(0, Math.min(1, Number(state.homeProgressRatio) || 0));
      if (event.key === 'Home') {
        seekHomeProgressFromRatio(0);
        return;
      }
      if (event.key === 'End') {
        seekHomeProgressFromRatio(1);
        return;
      }
      seekHomeProgressFromRatio(current + (event.key === 'ArrowRight' ? 0.05 : -0.05));
    });

    els.homeViewport?.addEventListener('touchstart', handleHomeSwipeStart, { passive: true });
    els.homeViewport?.addEventListener('touchend', handleHomeSwipeEnd, { passive: true });
    els.homeShell?.addEventListener('touchstart', handleHomeSwipeStart, { passive: true });
    els.homeShell?.addEventListener('touchend', handleHomeSwipeEnd, { passive: true });
    els.homeViewport?.addEventListener('wheel', handleHomeWheel, { passive: false });
    els.homeShell?.addEventListener('wheel', handleHomeWheel, { passive: false });

    els.createSubmitBtn?.addEventListener('click', () => {
      if (isCreateEditMode()) {
        void updateBookFromLines();
      } else {
        void createBookFromLines();
      }
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

    els.preBookRankedBtn?.addEventListener('click', () => {
      state.preBookRankedMode = true;
      setPreBookStep('training');
    });

    els.preBookPronounceBtn?.addEventListener('click', () => {
      state.preBookRankedMode = false;
      setPreBookStep('training');
    });

    els.preBookCover?.addEventListener('click', () => {
      void (async () => {
        if (state.modeStartBusy) return;
        if (state.preBookStep === 'root') {
          state.preBookRankedMode = true;
          setPreBookStep('training');
          return;
        }
        if (state.preBookStep === 'training') {
          await startBookFromPreBookModal('listening-training');
        }
      })();
    });

    const triggerPreBookListeningMode = (event) => {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      void startBookFromPreBookModal('listening-training');
    };

    const triggerPreBookSpeakingMode = (event) => {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      void startBookFromPreBookModal('speaking-training');
    };

    els.preBookListeningBtn?.addEventListener('click', triggerPreBookListeningMode);
    els.preBookListeningBtn?.addEventListener('pointerup', triggerPreBookListeningMode);

    els.preBookSpeakingBtn?.addEventListener('click', triggerPreBookSpeakingMode);
    els.preBookSpeakingBtn?.addEventListener('pointerup', triggerPreBookSpeakingMode);

    els.preBookCloseBtn?.addEventListener('click', () => {
      closePreBookModal({ animate: true });
    });

    els.preBookModal?.addEventListener('click', (event) => {
      if (event.target === els.preBookModal) {
        closePreBookModal({ animate: true });
      }
    });

    els.readerAdminAudioCloseBtn?.addEventListener('click', () => {
      closeReaderAdminAudioModal();
    });

    els.readerAdminAudioSubmitBtn?.addEventListener('click', () => {
      void submitReaderAdminAudioModal();
    });

    els.readerAdminAudioModal?.addEventListener('click', (event) => {
      if (event.target === els.readerAdminAudioModal) {
        closeReaderAdminAudioModal();
      }
    });

    els.readerBackBtn?.addEventListener('click', () => {
      if (state.readerFinishing) return;
      closeReader();
    });

    els.readerMicBtn?.addEventListener('click', () => {
      void handleReaderMicTraining();
    });

    els.readerLangEnglishBtn?.addEventListener('click', () => {
      setReaderVisualLanguage('english');
    });

    els.readerLangPortugueseBtn?.addEventListener('click', () => {
      setReaderVisualLanguage('portuguese');
    });

    els.readerReplayBtn?.addEventListener('click', () => {
      void replayReaderListeningAudio();
    });

    els.readerHidePortugueseBtn?.addEventListener('click', () => {
      if (state.readerMode !== 'listening-training') return;
      state.readerListeningRevealPortuguese = !state.readerListeningRevealPortuguese;
      updateReaderListeningPortugueseUi();
    });

    els.readerEnglish?.addEventListener('click', () => {
      if (!isReaderAdminEditingEnabled() || state.readerInlineEditing) return;
      startInlineReaderEditing();
    });

    els.readerEnglish?.addEventListener('keydown', (event) => {
      if (!state.readerInlineEditing) return;
      if (event.key === 'Enter') {
        event.preventDefault();
        void submitInlineReaderEditing();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        renderReader();
        stopInlineReaderEditing();
      }
    });

    els.readerEnglish?.addEventListener('touchstart', (event) => {
      if (!state.readerInlineEditing) return;
      const touch = event.touches?.[0];
      if (!touch) return;
      state.readerInlineEditTouchStartY = Number(touch.clientY) || 0;
    }, { passive: true });

    els.readerEnglish?.addEventListener('touchend', (event) => {
      if (!state.readerInlineEditing) return;
      const touch = event.changedTouches?.[0];
      if (!touch) return;
      const endY = Number(touch.clientY) || 0;
      const dy = state.readerInlineEditTouchStartY - endY;
      if (dy >= 48) {
        void submitInlineReaderEditing();
      }
    }, { passive: true });

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
      if (event.key === 'Escape' && els.readerAdminAudioModal?.classList.contains('is-visible')) {
        event.preventDefault();
        closeReaderAdminAudioModal();
        return;
      }
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
        } else if ((event.key === 'Enter' || event.key === ' ') && isReaderTrainingMode()) {
          event.preventDefault();
          void handleReaderMicTraining();
        }
    });

    window.addEventListener('resize', () => {
      syncShelfViewportHeight();
      renderHomePanel();
      if (state.readerOpen && state.readerBookId) {
        const activeBook = state.books.find((entry) => safeText(entry?.bookId) === state.readerBookId);
        if (!activeBook) return;
        applyReaderBackground(activeBook);
        return;
      }
      if (isOverlayOpen()) return;
      state.shelfIndex = clampVisibleShelfIndex(state.shelfIndex);
      void scrollShelfToIndex(state.shelfIndex, false);
    });

    window.addEventListener('online', () => {
      void flushBooksSyncIfNeeded(true);
      ensureHomePlaybackLoopRunning('online');
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        void flushBooksSyncIfNeeded(true);
        return;
      }
      if (state.homeSleepActive) {
        void flushBooksSyncIfNeeded(true);
        ensureHomePlaybackLoopRunning('visibility');
      }
    });

    window.addEventListener('pagehide', () => {
      void flushBooksSyncIfNeeded(true);
    });

    const appPlugin = window.Capacitor?.Plugins?.App;
    if (appPlugin && typeof appPlugin.addListener === 'function') {
      try {
        const listener = appPlugin.addListener('appStateChange', ({ isActive }) => {
          if (!isActive) {
            void flushBooksSyncIfNeeded(true);
            return;
          }
          if (state.homeSleepActive) {
            ensureHomePlaybackLoopRunning('app-active');
          }
        });
        if (listener && typeof listener.catch === 'function') {
          listener.catch(() => {});
        }
      } catch (_error) {
        // ignore
      }
    }
  }

  async function init() {
    applyMyBooksGridEmbedUi();
    if (IS_MYBOOKS_GRID_EMBED) {
      state.selectedLevel = UI_LEVEL_MY_BOOKS;
    }
    initializeBooksStarfield();
    bindEvents();
    renderCreateInputPreview();
    syncCreatePreviewScroll();
    setCreateBusy(false);
    state.gradients = buildGradientPool();
    state.forceAdminUi = readForceAdminUiFlag();
    renderHomePanel();
    renderStatsPanel();
    renderShelfLoading();
    renderLevelMenu();
    renderAdminUiToggle();
    state.localProfile = readLocalPlayerProfile();
    clearLegacyPronunciationStorage();
    loadLocalConsumptionCounters();
    renderStatsPanel();

    const [sessionUser, books] = await Promise.all([
      fetchSessionUser(),
      fetchStories(),
      loadWelcomeModeSettings().catch(() => null)
    ]);

    state.user = sessionUser;
    ensureEnergyDepletionWatch();
    startBooksSyncTimer();
    ensureMissionCardToggleLoop();
    void refreshDailyMissionFromServer();
    void refreshStatsFromServer().then(() => renderStatsPanel());
    state.isAdmin = Boolean(sessionUser?.isAdmin)
      || isAdminAlias(sessionUser?.username)
      || isAdminAlias(state.localProfile?.username);
    state.books = Array.isArray(books) ? books : [];
    if (state.isAdmin) {
      await refreshCreateJobs({ ignoreTransitions: true });
    }

    syncSelectedLevelWithUnlocked({ preferUnlocked: !state.userSelectedBookLevel });
    const firstBook = getBooksForSelectedLevel()[0] || state.books.slice().sort(sortByNome)[0];
    const firstCoverUrl = safeText(firstBook?.coverImageUrl);
    if (firstCoverUrl) {
      await preloadImageUrl(firstCoverUrl);
    }
    state.initialLoading = false;
    renderShelfLoading();

    renderAvatar();
    applyWelcomeModeVisibility();
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
    renderHomeAuthUi();
    syncSleepFabVisibility();
  }

  init();
})();
