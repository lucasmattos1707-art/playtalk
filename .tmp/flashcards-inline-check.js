(() => {
      const FLASHCARDS_R2_PUBLIC_ROOT = 'https://pub-1208463a3c774431bf7e0ddcbd3cf670.r2.dev';
      const FLASHCARDS_LOCAL_SOURCE_PREFIX = 'allcards';
      const FLASHCARD_CAMERA_OBJECT_KEY = 'FlashCards/camera.webp';
      const FLASHCARD_CAMERA_IMAGE_URL = `${FLASHCARDS_R2_PUBLIC_ROOT}/${FLASHCARD_CAMERA_OBJECT_KEY}`;
      const DATA_MANIFEST_REMOTE_PATH = '/api/flashcards/manifest';
      const OWNED_STORAGE_KEY = 'playtalk-flashcards-owned-v2';
      const CARDS_CACHE_STORAGE_KEY = 'playtalk-flashcards-cards-v2';
      const USER_PROGRESS_STORAGE_KEY = 'playtalk-flashcards-progress-v3';
      const USER_HIDDEN_STORAGE_KEY = 'playtalk-flashcards-hidden-v1';
      const USER_STATS_STORAGE_KEY = 'playtalk-flashcards-stats-v1';
      const TUTORIAL_PROGRESS_STORAGE_KEY = 'playtalk-flashcards-tutorial-v1';
      const GAME_SESSION_STORAGE_KEY = 'playtalk-flashcards-game-session-v1';
      const TIME_OFFSET_STORAGE_KEY = 'playtalk-flashcards-time-offset-v1';
      const AUTH_TOKEN_STORAGE_KEY = 'playtalk_auth_token';
      const recognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition || null;
      const STAR_ICON_PATH = 'SVG/codex-icons/star.svg';
      const ENGLISH_ICON_PATH = 'SVG/codex-icons/ingles.svg';
      const PORTUGUESE_ICON_PATH = 'SVG/codex-icons/portugues.svg';
      const SUCCESS_SOUND_PATH = 'gamesounds/success.mp3';
      const FOUR_STARS_SOUND_PATH = 'newsongs/4stars.mp3';
      const FIVE_STARS_SOUND_PATH = 'newsongs/5stars.mp3';
      const LESS_SOUND_PATH = 'svgnovo/less.wav';
      const REPORT_SOUND_PATH = 'thesongs/report.wav';
      const TYPING_KEY_SOUND_PATH = 'sounds/type.mp3';
      const TYPING_KEY_FLASH_MS = 500;
      const STAGE_TWO_HINT_DELAY_MS = 2000;
      const STAGE_TWO_HINT_VISIBLE_MS = 3000;
      const WATCH_SETTINGS_KEY = 'playtalk-flashcards-watch-v1';
      const FLASHCARDS_PAGE_SIZE = 30;
      const ADMIN_USERNAMES = new Set(['admin', 'adm']);
      const BALANCE_TRACKS = ['zen1.mp3', 'zen2.mp3', 'zen3.mp3', 'zen4.mp3'];
      const BALANCE_TRACK_ROOT = 'https://pub-1208463a3c774431bf7e0ddcbd3cf670.r2.dev/musicas';
      const TYPING_KEY_BLUES = ['#6ebcff', '#76c3ff', '#7dc9ff', '#86ceff', '#8fd4ff', '#98d9ff'];
      const DEFAULT_GAME_CONTEXT_LIMIT = 3;
      const MIN_GAME_CONTEXT_LIMIT = 3;
      const GAME_ACTIVE_CARD_CAP = 12;
      const GAME_STAR_TARGET = 5;
      const EARLY_FLASHCARD_LIMIT = 200;
      const EARLY_FLASHCARD_MIN_LENGTH = 6;
      const EARLY_FLASHCARD_MAX_LENGTH = 12;
      const REVIEW_SLOT_LIMIT = 8;
      const TUTORIAL_AUDIO_ROOT = 'audiostuto';
      const TUTORIAL_NORMAL_GAME_COUNT = 3;
      const TUTORIAL_PLANET_IMAGE_NAME = 'planet.webp';
      const TUTORIAL_PLANET_ENGLISH = 'planet';
      const TUTORIAL_PLANET_PORTUGUESE = 'planeta';
      const TUTORIAL_FINALE_SEAL_FLASH_MS = 400;
      const GUEST_FLASHCARD_LOGIN_THRESHOLD = 6;
      const FLASHCARD_PREMIUM_GATE_LIMIT = 8;
      const GUEST_FLASHCARD_LOGIN_DELAY_MS = 5000;
      const AUTH_GATE_FORM_REVEAL_MS = 1200;
      const WELCOME_COPY_ROTATION_MS = 2000;
      const WELCOME_COPY_MESSAGES = ['Flu\u00eancia f\u00e1cil', 'Toque para come\u00e7ar'];
      const ACCESS_KEY_AUDIO_LIMIT_PATH = '/accesskey/limit.mp3';
      const ACCESS_KEY_AUDIO_MESSAGE_PATH = '/accesskey/message.wav';
      const ACCESS_KEY_AUDIO_INVALID_PATH = '/accesskey/invalidkey2.mp3';
      const ACCESS_KEY_AUDIO_SUCCESS_PATHS = {
        semana: '/accesskey/week.mp3',
        mes: '/accesskey/month.mp3',
        ano: '/accesskey/year.mp3',
        'monthly-magic': '/accesskey/month.mp3'
      };
      const FLASHCARD_REPORT_TYPES = [
        { key: 'blurred-image', label: 'Imagem borrada' },
        { key: 'weak-association', label: 'Associacao fraca' },
        { key: 'wrong-audio', label: 'Audio errado' },
        { key: 'wrong-text', label: 'Texto errado' },
        { key: 'hide-card', label: 'Nao quero ver isso' }
      ];
      const FLASHCARD_REPORT_LABELS = Object.fromEntries(FLASHCARD_REPORT_TYPES.map((item) => [item.key, item.label]));
      const SECRET_TIME_CODE = 'yyeua';
      const REVIEW_PHASES = {
        1: { key: 'prata', label: 'Prata', durationMs: 24 * 60 * 60 * 1000, sealPath: 'medalhas/prata.png' },
        2: { key: 'quartz', label: 'Quartz', durationMs: 3 * 24 * 60 * 60 * 1000, sealPath: 'medalhas/quartz.png' },
        3: { key: 'gold', label: 'Gold', durationMs: 7 * 24 * 60 * 60 * 1000, sealPath: 'medalhas/ouro.png' },
        4: { key: 'platina', label: 'Platina', durationMs: 12 * 24 * 60 * 60 * 1000, sealPath: 'medalhas/platina.png' },
        5: { key: 'diamante', label: 'Diamante', durationMs: 30 * 24 * 60 * 60 * 1000, sealPath: 'medalhas/diamante.png' }
      };

      const STAGES = {
        1: { badge: 'Etapa 1/5', instruction: 'Fale ingles', showImage: true, showWord: true, wordType: 'english', subtitleType: 'portuguese', expected: 'english', autoAudio: true },
        2: { badge: 'Etapa 2/5', instruction: 'Fale portugues', showImage: true, showWord: true, wordType: 'english', subtitleType: 'none', expected: 'portuguese', autoAudio: true },
        3: { badge: 'Etapa 3/5', instruction: 'Fale ingles', showImage: false, showWord: false, wordType: 'portuguese', subtitleType: 'none', expected: 'english', autoAudio: false, placeholderUsesPortuguese: true, revealOnHit: true },
        4: { badge: 'Etapa 4/5', instruction: 'Escreva ingles', showImage: true, showWord: false, subtitleType: 'none', expected: 'english', autoAudio: false },
        5: { badge: 'Etapa 5/5', instruction: 'Fale ingles', showImage: true, showWord: false, subtitleType: 'none', expected: 'english', autoAudio: false }
      };

      function createTutorialState() {
        return {
          active: false,
          completed: false,
          interactionLocked: false,
          introPlayed: false,
          explainedStars: -1,
          sequenceToken: 0,
          timers: [],
          currentCardId: '',
          finishing: false,
          finale: {
            active: false,
            cardId: '',
            sealPhase: 0,
            sealFlash: false,
            sealSoft: false
          }
        };
      }

      const state = {
        allCards: [],
        deckCatalog: [],
        userCards: new Map(),
        hiddenCardIds: new Set(),
        ownedIds: new Set(),
        stats: { playTimeMs: 0, speakings: 0, listenings: 0 },
        timeOffsetMs: 0,
        user: null,
        authMode: 'login',
        authReason: 'optional',
          flashcardsSyncInFlight: false,
          flashcardsSyncQueued: false,
          flashcardsSyncTimer: 0,
          cardsRefreshTimer: 0,
          libraryPage: 1,
        secretBuffer: '',
        entry: {
          cardsReady: false,
          welcomeVisible: true,
          welcomeIndex: 0,
          welcomeTimer: 0,
          pendingTutorialStart: false,
          authRequired: false,
          authDelayTimer: 0,
          authRevealTimer: 0
        },
        admin: {
          busy: false,
          status: 'Nenhuma acao em andamento.',
          error: false,
          prompt: '',
          activeCardId: '',
          selectedDeckSource: '',
          decks: [],
          reportFilter: '',
          reportCounts: new Map(),
          draftCards: new Map(),
          pendingNewCards: [],
          publish: {
            visible: false,
            percent: 0,
            title: 'Publicando deck',
            message: 'Preparando...',
            error: false,
            timer: 0
          }
        },
        game: {
          active: false,
          entries: new Map(),
          queue: [],
          currentId: null,
          listening: false,
          languageSwapTimer: 0,
          stageTwoHintTimer: 0,
          stageOneSwapShowsPortuguese: false,
          activeAudio: null,
          successAudio: null,
          milestoneAudios: new Map(),
          reportAudio: null,
          preloadImages: new Map(),
          contextLimit: DEFAULT_GAME_CONTEXT_LIMIT,
          selectedCount: null,
          pendingRewardSeal: null,
          pendingRewardSealTimer: 0,
          skipAutoAudioOnce: false,
          transitioning: false,
          sessionStartedAt: 0,
          canListen: false,
          recognition: null,
          typingKeyAudioPool: [],
          typingKeyAudioIndex: 0,
          paused: false,
          reportCardId: '',
          tutorial: createTutorialState()
        },
        watch: {
          active: false,
          scope: 'all',
          gapMs: 3000,
          music: 'on',
          selectedSources: [],
          queue: [],
          sourceCards: [],
          currentCardId: null,
          voiceAudio: null,
          musicAudio: null,
          timer: null
        },
        ui: {
          activeView: 'cards',
          profileAvatarDraft: '',
          premiumGateOpen: false,
          premiumCode: '',
          premiumStatus: '',
          premiumBusy: false,
          premiumAudioPlayed: false,
          premiumAudio: null
        }
      };

      const els = {
        welcomeGate: document.getElementById('welcomeGate'),
        welcomeTouch: document.getElementById('welcomeTouch'),
        welcomeCopy: document.getElementById('welcomeCopy'),
        authGate: document.getElementById('authGate'),
        authCard: document.getElementById('authCard'),
        authBody: document.getElementById('authBody'),
        authCopy: document.getElementById('authCopy'),
        authForm: document.getElementById('authForm'),
        authUsername: document.getElementById('authUsername'),
        authPassword: document.getElementById('authPassword'),
        authSubmitBtn: document.getElementById('authSubmitBtn'),
        authStatus: document.getElementById('authStatus'),
        authModeLogin: document.getElementById('authModeLogin'),
        authModeRegister: document.getElementById('authModeRegister'),
        topbar: document.getElementById('topbar'),
        flashcardsHomeToggle: document.getElementById('flashcardsHomeToggle'),
        usersLink: document.getElementById('usersLink'),
        logoutBtn: document.getElementById('logoutBtn'),
        catalog: document.getElementById('catalog'),
        metrics: document.getElementById('metrics'),
        libraryTitle: document.getElementById('libraryTitle'),
        adminBadge: document.getElementById('adminBadge'),
        adminTools: document.getElementById('adminTools'),
        adminDeckSelect: document.getElementById('adminDeckSelect'),
        adminReportFilter: document.getElementById('adminReportFilter'),
        adminCreateDeckBtn: document.getElementById('adminCreateDeckBtn'),
        adminSaveBtn: document.getElementById('adminSaveBtn'),
        adminCreateCardsBtn: document.getElementById('adminCreateCardsBtn'),
        adminPromptInput: document.getElementById('adminPromptInput'),
        adminPasteInput: document.getElementById('adminPasteInput'),
        adminPasteTextBtn: document.getElementById('adminPasteTextBtn'),
        adminSubmitPasteBtn: document.getElementById('adminSubmitPasteBtn'),
          adminFillTextBtn: document.getElementById('adminFillTextBtn'),
          adminFillImageBtn: document.getElementById('adminFillImageBtn'),
          adminMagicBtn: document.getElementById('adminMagicBtn'),
          adminFillAudioBtn: document.getElementById('adminFillAudioBtn'),
          adminToolsStatus: document.getElementById('adminToolsStatus'),
          adminCardPopover: document.getElementById('adminCardPopover'),
          adminCardPopoverTitle: document.getElementById('adminCardPopoverTitle'),
          adminDeleteImageBtn: document.getElementById('adminDeleteImageBtn'),
          adminDeleteAudioBtn: document.getElementById('adminDeleteAudioBtn'),
          adminDeleteCardBtn: document.getElementById('adminDeleteCardBtn'),
          adminClosePopoverBtn: document.getElementById('adminClosePopoverBtn'),
          adminPublishBar: document.getElementById('adminPublishBar'),
          adminPublishTitle: document.getElementById('adminPublishTitle'),
          adminPublishPercent: document.getElementById('adminPublishPercent'),
          adminPublishFill: document.getElementById('adminPublishFill'),
          adminPublishCopy: document.getElementById('adminPublishCopy'),
          allGrid: document.getElementById('allGrid'),
        allSectionCopy: document.getElementById('allSectionCopy'),
        libraryPagination: document.getElementById('libraryPagination'),
        libraryPageInfo: document.getElementById('libraryPageInfo'),
        libraryPrevBtn: document.getElementById('libraryPrevBtn'),
        libraryNextBtn: document.getElementById('libraryNextBtn'),
        watchFlashcardsBtn: document.getElementById('watchFlashcardsBtn'),
        startGameBtn: document.getElementById('startGameBtn'),
        game: document.getElementById('game'),
        exitGameBtn: document.getElementById('exitGameBtn'),
        gameReportTrigger: document.getElementById('gameReportTrigger'),
        gameReportMenu: document.getElementById('gameReportMenu'),
        gameReportOptions: document.getElementById('gameReportOptions'),
        closeGameReportBtn: document.getElementById('closeGameReportBtn'),
        gameEnd: document.getElementById('gameEnd'),
        gameCard: document.getElementById('gameCard'),
        gameVisual: document.getElementById('gameVisual'),
        gameWord: document.getElementById('gameWord'),
        gameSubword: document.getElementById('gameSubword'),
        gameStep: document.getElementById('gameStep'),
        gameStatus: document.getElementById('gameStatus'),
        gameStars: document.getElementById('gameStars'),
        gameLanguageBtn: document.getElementById('gameLanguageBtn'),
        gameTouchBtn: document.getElementById('gameTouchBtn'),
        gameTypingKeyboard: document.getElementById('gameTypingKeyboard'),
        gameHeadCopy: document.getElementById('gameHeadCopy'),
        gameStarsWrap: document.getElementById('gameStarsWrap'),
        gameStatusSlot: document.getElementById('gameStatusSlot'),
        gameChipRow: document.getElementById('gameChipRow'),
        gameHeaderCopy: document.getElementById('gameHeaderCopy'),
        gameActiveChip: document.getElementById('gameActiveChip'),
        gameActiveValue: document.getElementById('gameActiveValue'),
        gameQueueChip: document.getElementById('gameQueueChip'),
        gameQueueValue: document.getElementById('gameQueueValue'),
        gameOwnedChip: document.getElementById('gameOwnedChip'),
        gameOwnedValue: document.getElementById('gameOwnedValue'),
        gameStarCopy: document.getElementById('gameStarCopy'),
          gameSetup: document.getElementById('gameSetup'),
          gameSetupOptions: document.getElementById('gameSetupOptions'),
          closeGameSetupBtn: document.getElementById('closeGameSetupBtn'),
          gameSetupCountCopy: document.getElementById('gameSetupCountCopy'),
          startTutorialBtn: document.getElementById('startTutorialBtn'),
          watchPopover: document.getElementById('watchPopover'),
        closeWatchPopoverBtn: document.getElementById('closeWatchPopoverBtn'),
        startWatchBtn: document.getElementById('startWatchBtn'),
        watchGapSelect: document.getElementById('watchGapSelect'),
        watchScopeSelect: document.getElementById('watchScopeSelect'),
        watchMusicSelect: document.getElementById('watchMusicSelect'),
        watchDeckGrid: document.getElementById('watchDeckGrid'),
        watchDeckSummary: document.getElementById('watchDeckSummary'),
        watch: document.getElementById('watch'),
        exitWatchBtn: document.getElementById('exitWatchBtn'),
        stopWatchBtn: document.getElementById('stopWatchBtn'),
        watchVisual: document.getElementById('watchVisual'),
        watchWord: document.getElementById('watchWord'),
        watchSubword: document.getElementById('watchSubword'),
        watchStars: document.getElementById('watchStars'),
        gameTutorialOverlay: document.getElementById('gameTutorialOverlay'),
        gameTutorialLogo: document.getElementById('gameTutorialLogo')
        ,
        usersPanel: document.getElementById('usersPanel'),
        usersFrame: document.getElementById('usersFrame'),
        profilePanel: document.getElementById('profilePanel'),
        profileForm: document.getElementById('profileForm'),
        profileAvatarInput: document.getElementById('profileAvatarInput'),
        profileAvatarPreview: document.getElementById('profileAvatarPreview'),
        profileAvatarFallback: document.getElementById('profileAvatarFallback'),
        profileNameInput: document.getElementById('profileNameInput'),
        profileSaveBtn: document.getElementById('profileSaveBtn'),
        profileLogoutBtn: document.getElementById('profileLogoutBtn'),
        profileStatus: document.getElementById('profileStatus'),
        footerPlayBtn: document.getElementById('footerPlayBtn'),
        footerCardsBtn: document.getElementById('footerCardsBtn'),
        footerUsersBtn: document.getElementById('footerUsersBtn'),
        footerProfileBtn: document.getElementById('footerProfileBtn'),
        flashcardsFooterNav: document.getElementById('flashcardsFooterNav'),
        premiumGate: document.getElementById('premiumGate'),
        premiumCodeValue: document.getElementById('premiumCodeValue'),
        premiumStatus: document.getElementById('premiumStatus'),
        premiumClearBtn: document.getElementById('premiumClearBtn'),
        premiumBackspaceBtn: document.getElementById('premiumBackspaceBtn'),
        premiumCloseBtn: document.getElementById('premiumCloseBtn'),
        premiumGrid: document.getElementById('premiumGrid')
      };

      function safeText(value) {
        return typeof value === 'string' ? value.trim() : '';
      }

      function fixMojibake(value) {
        const text = safeText(value);
        if (!text) return '';
        if (!/[ÃƒÃ‚]/.test(text)) return text;
        try {
          return decodeURIComponent(escape(text));
        } catch (_error) {
          return text;
        }
      }

      function repairDisplayText(value) {
        let text = fixMojibake(value);
        if (!text) return '';
        for (let attempt = 0; attempt < 2; attempt += 1) {
          if (!/[ÃƒÃ‚ï¿½]/.test(text)) break;
          try {
            const decoded = decodeURIComponent(escape(text));
            if (!decoded || decoded === text) break;
            text = decoded;
          } catch (_error) {
            break;
          }
        }
        return text
          .replace(/Ãƒâ€”/g, 'Ã—')
          .replace(/Ã¢â‚¬â€/g, '-')
          .replace(/Ã¢â‚¬â€œ/g, '-')
          .replace(/Ã¢â‚¬Ëœ|Ã¢â‚¬â„¢/g, "'")
          .replace(/Ã¢â‚¬Å“|Ã¢â‚¬ï¿½/g, '"');
      }

      function normalizeText(value) {
        return repairDisplayText(value)
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .replace(/[^a-z0-9\s'/%+=-]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      }

      function normalizeAnswerList(value) {
        if (Array.isArray(value)) {
          return value
            .map(repairDisplayText)
            .map(item => safeText(item))
            .filter(Boolean);
        }
        const single = safeText(repairDisplayText(value));
        return single ? [single] : [];
      }

      function uniqueAnswerList(items) {
        const seen = new Set();
        const result = [];
        items.forEach((item) => {
          const normalized = normalizeText(item);
          if (!normalized || seen.has(normalized)) return;
          seen.add(normalized);
          result.push(item);
        });
        return result;
      }

      function collectAcceptedAnswers(primaryValue, ...variantGroups) {
        const answers = [primaryValue];
        variantGroups.forEach((group) => {
          answers.push(...normalizeAnswerList(group));
        });
        return uniqueAnswerList(answers.map(repairDisplayText).map(item => safeText(item)).filter(Boolean));
      }

      function capitalizeWords(value) {
        return repairDisplayText(value)
          .split(/\s+/)
          .filter(Boolean)
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
      }

      function escapeHtml(value) {
        return String(value || '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      }

      function slug(value) {
        return normalizeText(value).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'card';
      }

      function shuffle(items) {
        const list = items.slice();
        for (let index = list.length - 1; index > 0; index -= 1) {
          const randomIndex = Math.floor(Math.random() * (index + 1));
          [list[index], list[randomIndex]] = [list[randomIndex], list[index]];
        }
        return list;
      }

      function takeRandom(items, limit) {
        return shuffle(items).slice(0, Math.max(0, limit));
      }

      function normalizeGameCount(value) {
        const parsed = Number.parseInt(String(value || '').trim(), 10);
        return parsed >= 3 ? parsed : null;
      }

      function loadSelectedGameCount() {
        state.game.selectedCount = DEFAULT_GAME_CONTEXT_LIMIT;
        state.game.contextLimit = DEFAULT_GAME_CONTEXT_LIMIT;
      }

      function saveSelectedGameCount(value) {
        const normalized = normalizeGameCount(value) || DEFAULT_GAME_CONTEXT_LIMIT;
        state.game.selectedCount = normalized;
        state.game.contextLimit = normalized;
      }

      function storageKeyForUser(baseKey, userId = state.user?.id) {
        const normalizedUserId = Number(userId) || 0;
        return normalizedUserId ? `${baseKey}:${normalizedUserId}` : baseKey;
      }

      function userScopedStorageKey(baseKey) {
        return storageKeyForUser(baseKey, state.user?.id);
      }

      function readScopedStorage(baseKey, fallback, userId = state.user?.id) {
        try {
          const raw = localStorage.getItem(storageKeyForUser(baseKey, userId));
          if (raw == null) return fallback;
          const parsed = JSON.parse(raw);
          return parsed == null ? fallback : parsed;
        } catch (_error) {
          return fallback;
        }
      }

      function removeScopedStorage(baseKey, userId = state.user?.id) {
        try {
          localStorage.removeItem(storageKeyForUser(baseKey, userId));
        } catch (_error) {
          // ignore
        }
      }

      function readTutorialProgressForUser(userId = state.user?.id) {
        const parsed = readScopedStorage(TUTORIAL_PROGRESS_STORAGE_KEY, null, userId);
        return Boolean(parsed?.completed || parsed === true);
      }

      function readTutorialProgress() {
        return readTutorialProgressForUser(state.user?.id);
      }

      function persistTutorialProgressLocally() {
        localStorage.setItem(userScopedStorageKey(TUTORIAL_PROGRESS_STORAGE_KEY), JSON.stringify({
          completed: Boolean(state.game.tutorial.completed)
        }));
      }

      function normalizeSavedGameEntry(raw) {
        const id = safeText(raw?.id);
        if (!id) return null;
        return {
          id,
          stars: Math.max(0, Math.min(4, Number.parseInt(raw?.stars, 10) || 0)),
          stage: Math.max(1, Math.min(4, Number.parseInt(raw?.stage, 10) || 1)),
          missesWithoutStars: Math.max(0, Number.parseInt(raw?.missesWithoutStars, 10) || 0),
          typingMistakes: Math.max(0, Number.parseInt(raw?.typingMistakes, 10) || 0),
          pool: raw?.pool === 'review' ? 'review' : 'base'
        };
      }

      function serializeCurrentGameState() {
        const entries = Array.from(state.game.entries.values())
          .map(normalizeSavedGameEntry)
          .filter((entry) => entry && cardById(entry.id));
        if (!entries.length || state.game.tutorial.active) return null;
        const validIds = new Set(entries.map((entry) => entry.id));
        return {
          entries,
          queue: state.game.queue.filter((id) => validIds.has(id)),
          currentId: validIds.has(state.game.currentId) ? state.game.currentId : '',
          selectedCount: normalizeGameCount(state.game.selectedCount) || DEFAULT_GAME_CONTEXT_LIMIT,
          contextLimit: Math.max(DEFAULT_GAME_CONTEXT_LIMIT, Number(state.game.contextLimit) || DEFAULT_GAME_CONTEXT_LIMIT)
        };
      }

      function persistGameSessionLocally() {
        try {
          const snapshot = serializeCurrentGameState();
          if (!snapshot) {
            removeScopedStorage(GAME_SESSION_STORAGE_KEY);
            return;
          }
          localStorage.setItem(userScopedStorageKey(GAME_SESSION_STORAGE_KEY), JSON.stringify(snapshot));
        } catch (_error) {
          // ignore storage issues
        }
      }

      function clearGameSessionLocally(userId = state.user?.id) {
        removeScopedStorage(GAME_SESSION_STORAGE_KEY, userId);
      }

      function readGameSessionForUser(userId = state.user?.id) {
        const parsed = readScopedStorage(GAME_SESSION_STORAGE_KEY, null, userId);
        const entries = Array.isArray(parsed?.entries)
          ? parsed.entries.map(normalizeSavedGameEntry).filter((entry) => entry && cardById(entry.id))
          : [];
        if (!entries.length) return null;
        const validIds = new Set(entries.map((entry) => entry.id));
        return {
          entries,
          queue: Array.isArray(parsed?.queue)
            ? parsed.queue.map((id) => safeText(id)).filter((id) => validIds.has(id))
            : [],
          currentId: validIds.has(parsed?.currentId) ? safeText(parsed.currentId) : '',
          selectedCount: normalizeGameCount(parsed?.selectedCount) || DEFAULT_GAME_CONTEXT_LIMIT,
          contextLimit: Math.max(DEFAULT_GAME_CONTEXT_LIMIT, Math.min(GAME_ACTIVE_CARD_CAP, Number(parsed?.contextLimit) || GAME_ACTIVE_CARD_CAP))
        };
      }

      function setTutorialCompleted(completed) {
        state.game.tutorial.completed = Boolean(completed);
        persistTutorialProgressLocally();
        syncTutorialSetupButton();
        syncWelcomeGate();
      }

      function readOwnedIdsForUser(userId = state.user?.id) {
        const parsed = readScopedStorage(OWNED_STORAGE_KEY, [], userId);
        return Array.isArray(parsed) ? parsed.filter(item => typeof item === 'string') : [];
      }

      function readOwnedIds() {
        return readOwnedIdsForUser(state.user?.id);
      }

      function persistOwnedIdsLocally() {
        localStorage.setItem(userScopedStorageKey(OWNED_STORAGE_KEY), JSON.stringify(Array.from(state.ownedIds)));
      }

      function getNowMs() {
        return Date.now() + (Number(state.timeOffsetMs) || 0);
      }

      function readTimeOffsetMs() {
        try {
          const parsed = Number(localStorage.getItem(TIME_OFFSET_STORAGE_KEY) || '0');
          return Number.isFinite(parsed) ? parsed : 0;
        } catch (_error) {
          return 0;
        }
      }

      function saveTimeOffsetMs() {
        localStorage.setItem(TIME_OFFSET_STORAGE_KEY, String(Number(state.timeOffsetMs) || 0));
      }

      function readCachedCards() {
        try {
          const parsed = JSON.parse(localStorage.getItem(CARDS_CACHE_STORAGE_KEY) || 'null');
          const cards = Array.isArray(parsed?.cards) ? parsed.cards : [];
          return cards.filter((card) => card && typeof card === 'object' && safeText(card.id));
        } catch (_error) {
          return [];
        }
      }

      function saveCachedCards(cards) {
        try {
          localStorage.setItem(CARDS_CACHE_STORAGE_KEY, JSON.stringify({
            savedAt: Date.now(),
            cards: Array.isArray(cards) ? cards : []
          }));
        } catch (_error) {
          // ignore storage quota issues
        }
      }

      function normalizeStatsSnapshot(raw) {
        return {
          playTimeMs: Math.max(0, Math.round(Number(raw?.playTimeMs) || 0)),
          speakings: Math.max(0, Math.round(Number(raw?.speakings) || 0)),
          listenings: Math.max(0, Math.round(Number(raw?.listenings) || 0))
        };
      }

      function hasMeaningfulStats(raw) {
        const stats = normalizeStatsSnapshot(raw);
        return stats.playTimeMs > 0 || stats.speakings > 0 || stats.listenings > 0;
      }

      function readUserStatsForUser(userId = state.user?.id) {
        const parsed = readScopedStorage(USER_STATS_STORAGE_KEY, {}, userId);
        return normalizeStatsSnapshot(parsed);
      }

      function readUserStats() {
        return readUserStatsForUser(state.user?.id);
      }

      function persistUserStatsLocally() {
        localStorage.setItem(userScopedStorageKey(USER_STATS_STORAGE_KEY), JSON.stringify({
          playTimeMs: Math.max(0, Math.round(Number(state.stats.playTimeMs) || 0)),
          speakings: Math.max(0, Math.round(Number(state.stats.speakings) || 0)),
          listenings: Math.max(0, Math.round(Number(state.stats.listenings) || 0))
        }));
      }

      function saveUserStats(options = {}) {
        persistUserStatsLocally();
        if (!options.skipCloudSync) {
          scheduleFlashcardCloudSync();
        }
      }

      function syncOwnedIdsFromProgress() {
        state.ownedIds = new Set(Array.from(state.userCards.keys()));
      }

      function createProgressRecord(cardId, overrides = {}) {
        return {
          cardId,
          phaseIndex: 0,
          targetPhaseIndex: 1,
          status: 'memorizing',
          memorizingStartedAt: getNowMs(),
          memorizingDurationMs: REVIEW_PHASES[1].durationMs,
          availableAt: getNowMs() + REVIEW_PHASES[1].durationMs,
          returnedAt: 0,
          createdAt: getNowMs(),
          ...overrides
        };
      }

      function normalizeProgressRecord(raw) {
        const cardId = String(raw?.cardId || '').trim();
        if (!cardId) return null;
        return createProgressRecord(cardId, {
          phaseIndex: Math.max(0, Math.min(5, Number.parseInt(raw?.phaseIndex, 10) || 0)),
          targetPhaseIndex: Math.max(1, Math.min(5, Number.parseInt(raw?.targetPhaseIndex, 10) || 1)),
          status: raw?.status === 'ready' ? 'ready' : 'memorizing',
          memorizingStartedAt: Number.isFinite(Number(raw?.memorizingStartedAt)) ? Number(raw.memorizingStartedAt) : getNowMs(),
          memorizingDurationMs: Number.isFinite(Number(raw?.memorizingDurationMs)) ? Number(raw.memorizingDurationMs) : REVIEW_PHASES[1].durationMs,
          availableAt: Number.isFinite(Number(raw?.availableAt)) ? Number(raw.availableAt) : getNowMs(),
          returnedAt: Number.isFinite(Number(raw?.returnedAt)) ? Number(raw.returnedAt) : 0,
          createdAt: Number.isFinite(Number(raw?.createdAt)) ? Number(raw.createdAt) : getNowMs()
        });
      }

      function readUserProgressForUser(userId = state.user?.id) {
        const parsed = readScopedStorage(USER_PROGRESS_STORAGE_KEY, null, userId);
        const records = Array.isArray(parsed) ? parsed.map(normalizeProgressRecord).filter(Boolean) : [];
        if (records.length) {
          return new Map(records.map(record => [record.cardId, record]));
        }

        const legacyOwnedIds = readOwnedIdsForUser(userId);
        const now = Date.now();
        return new Map(legacyOwnedIds.map((cardId, index) => [cardId, createProgressRecord(cardId, {
          phaseIndex: 1,
          targetPhaseIndex: 1,
          status: 'ready',
          memorizingStartedAt: 0,
          memorizingDurationMs: 0,
          availableAt: now - 1,
          returnedAt: now + index,
          createdAt: now + index
        })]));
      }

      function readUserProgress() {
        return readUserProgressForUser(state.user?.id);
      }

      function persistUserProgressLocally() {
        syncOwnedIdsFromProgress();
        persistOwnedIdsLocally();
        localStorage.setItem(userScopedStorageKey(USER_PROGRESS_STORAGE_KEY), JSON.stringify(Array.from(state.userCards.values())));
      }

      function readHiddenCardIdsForUser(userId = state.user?.id) {
        const parsed = readScopedStorage(USER_HIDDEN_STORAGE_KEY, [], userId);
        const ids = Array.isArray(parsed)
          ? parsed.map((cardId) => safeText(cardId)).filter(Boolean)
          : [];
        return new Set(ids);
      }

      function readHiddenCardIds() {
        return readHiddenCardIdsForUser(state.user?.id);
      }

      function persistHiddenCardIdsLocally() {
        localStorage.setItem(
          userScopedStorageKey(USER_HIDDEN_STORAGE_KEY),
          JSON.stringify(Array.from(state.hiddenCardIds.values()))
        );
      }

      function saveUserProgress(options = {}) {
        persistUserProgressLocally();
        persistHiddenCardIdsLocally();
        if (!options.skipCloudSync) {
          scheduleFlashcardCloudSync();
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

      function persistAuthToken(token) {
        try {
          if (token) {
            localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
          } else {
            localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
          }
        } catch (_error) {
          // ignore
        }
      }

      function normalizeUser(user) {
        if (!user || typeof user !== 'object') return null;
        const id = Number(user.id) || 0;
        const username = safeText(user.username);
        if (!id || !username) return null;
        return {
          id,
          username,
          avatarImage: safeText(user.avatar_image || user.avatarImage),
          createdAt: user.created_at || user.createdAt || null,
          isAdmin: Boolean(user.is_admin),
          premiumFullAccess: Boolean(user.premium_full_access),
          premiumUntil: user.premium_until || user.premiumUntil || null
        };
      }

      function progressRank(record) {
        if (!record) {
          return { phase: 0, ready: 0, availableAt: 0, createdAt: 0 };
        }
        const phase = Math.max(
          0,
          Math.min(5, Number(record.status === 'ready' ? record.phaseIndex : Math.max(record.phaseIndex || 0, record.targetPhaseIndex || 0)) || 0)
        );
        return {
          phase,
          ready: record.status === 'ready' ? 1 : 0,
          availableAt: Number(record.availableAt) || 0,
          createdAt: Number(record.createdAt) || 0
        };
      }

      function pickMoreAdvancedProgress(leftRecord, rightRecord) {
        const left = normalizeProgressRecord(leftRecord);
        const right = normalizeProgressRecord(rightRecord);
        if (!left) return right;
        if (!right) return left;
        const leftRank = progressRank(left);
        const rightRank = progressRank(right);
        if (rightRank.phase !== leftRank.phase) {
          return rightRank.phase > leftRank.phase ? right : left;
        }
        if (rightRank.ready !== leftRank.ready) {
          return rightRank.ready > leftRank.ready ? right : left;
        }
        if (rightRank.availableAt !== leftRank.availableAt) {
          return rightRank.availableAt > leftRank.availableAt ? right : left;
        }
        return rightRank.createdAt >= leftRank.createdAt ? right : left;
      }

      function captureGuestSnapshot() {
        return {
          progress: readUserProgressForUser(0),
          stats: readUserStatsForUser(0),
          hiddenCardIds: readHiddenCardIdsForUser(0),
          tutorialCompleted: readTutorialProgressForUser(0)
        };
      }

      function guestSnapshotHasData(snapshot) {
        return Boolean(
          snapshot
          && (
            snapshot.progress?.size
            || snapshot.hiddenCardIds?.size
            || snapshot.tutorialCompleted
            || hasMeaningfulStats(snapshot.stats)
          )
        );
      }

      function clearGuestLocalState() {
        [
          TUTORIAL_PROGRESS_STORAGE_KEY,
          OWNED_STORAGE_KEY,
          USER_STATS_STORAGE_KEY,
          USER_PROGRESS_STORAGE_KEY,
          USER_HIDDEN_STORAGE_KEY
        ].forEach((storageKey) => removeScopedStorage(storageKey, 0));
      }

      async function migrateGuestProgressToAuthenticatedUser() {
        if (!state.user?.id) return false;
        const guestSnapshot = captureGuestSnapshot();
        if (!guestSnapshotHasData(guestSnapshot)) return false;

        const mergedProgress = new Map(state.userCards);
        guestSnapshot.progress.forEach((record, cardId) => {
          mergedProgress.set(cardId, pickMoreAdvancedProgress(mergedProgress.get(cardId), record));
        });
        state.userCards = mergedProgress;
        state.hiddenCardIds = new Set([
          ...Array.from(state.hiddenCardIds.values()),
          ...Array.from(guestSnapshot.hiddenCardIds.values())
        ]);
        state.stats = normalizeStatsSnapshot({
          playTimeMs: Number(state.stats.playTimeMs || 0) + Number(guestSnapshot.stats?.playTimeMs || 0),
          speakings: Number(state.stats.speakings || 0) + Number(guestSnapshot.stats?.speakings || 0),
          listenings: Number(state.stats.listenings || 0) + Number(guestSnapshot.stats?.listenings || 0)
        });
        if (guestSnapshot.tutorialCompleted) {
          state.game.tutorial.completed = true;
        }

        persistUserStatsLocally();
        persistUserProgressLocally();
        persistHiddenCardIdsLocally();
        persistTutorialProgressLocally();
        clearGuestLocalState();
        syncOwnedIdsFromProgress();
        refreshLibrary();
        syncWelcomeGate();
        await syncFlashcardCloudNow();
        return true;
      }

      function isAdminUsername(value) {
        return ADMIN_USERNAMES.has(safeText(value).toLowerCase());
      }

      function isAdminUser(user = state.user) {
        return Boolean(user?.isAdmin) || isAdminUsername(user?.username);
      }

      function isPremiumUser(user = state.user) {
        if (!user) return false;
        if (Boolean(user.premiumFullAccess)) return true;
        const premiumUntilTime = Date.parse(user?.premiumUntil || '');
        return Number.isFinite(premiumUntilTime) && premiumUntilTime > Date.now();
      }

      function shouldGatePremiumAccess() {
        return !isAdminUser()
          && !isPremiumUser()
          && accessibleFlashcardsCount() >= FLASHCARD_PREMIUM_GATE_LIMIT;
      }

      function syncAdminTheme() {
        document.body.classList.toggle('admin-user', isAdminUser());
      }

      function adminReadyProgressRecord(cardId) {
        const now = getNowMs();
        return createProgressRecord(cardId, {
          phaseIndex: 5,
          targetPhaseIndex: 5,
          status: 'ready',
          memorizingStartedAt: 0,
          memorizingDurationMs: 0,
          availableAt: now,
          returnedAt: now,
          createdAt: now
        });
      }

      function accessibleFlashcardsCount() {
        if (isAdminUser()) return userProgressCards().length;
        return userProgressCards().length;
      }

      function isCardHiddenForUser(cardId) {
        return !isAdminUser() && state.hiddenCardIds.has(safeText(cardId));
      }

      function buildFlashcardCloudPayload() {
        return {
          progress: Array.from(state.userCards.values()).map(record => ({
            cardId: safeText(record?.cardId),
            phaseIndex: Math.max(0, Math.min(5, Number.parseInt(record?.phaseIndex, 10) || 0)),
            targetPhaseIndex: Math.max(1, Math.min(5, Number.parseInt(record?.targetPhaseIndex, 10) || 1)),
            status: record?.status === 'ready' ? 'ready' : 'memorizing',
            memorizingStartedAt: Number.isFinite(Number(record?.memorizingStartedAt)) ? Number(record.memorizingStartedAt) : 0,
            memorizingDurationMs: Math.max(0, Math.round(Number(record?.memorizingDurationMs) || 0)),
            availableAt: Number.isFinite(Number(record?.availableAt)) ? Number(record.availableAt) : 0,
            returnedAt: Number.isFinite(Number(record?.returnedAt)) ? Number(record.returnedAt) : 0,
            createdAt: Number.isFinite(Number(record?.createdAt)) ? Number(record.createdAt) : Date.now(),
            sealImage: safeText(record?.sealImage)
          })).filter(record => record.cardId),
          stats: normalizeStatsSnapshot(state.stats),
          hiddenCardIds: Array.from(state.hiddenCardIds.values())
        };
      }

      async function fetchFlashcardCloudState() {
        const response = await fetch(buildApiUrl('/api/flashcards/state'), {
          headers: buildAuthHeaders(),
          cache: 'no-store'
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload?.success) {
          const error = new Error(payload?.message || 'Falha ao carregar seus flashcards salvos.');
          error.statusCode = response.status;
          throw error;
        }
        return payload;
      }

      async function syncFlashcardCloudNow() {
        if (!state.user?.id) return false;

        if (state.flashcardsSyncInFlight) {
          state.flashcardsSyncQueued = true;
          return false;
        }

        state.flashcardsSyncInFlight = true;
        try {
          const response = await fetch(buildApiUrl('/api/flashcards/state'), {
            method: 'PUT',
            headers: buildAuthHeaders({
              'Content-Type': 'application/json'
            }),
            body: JSON.stringify(buildFlashcardCloudPayload())
          });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok || !payload?.success) {
            if (response.status === 401) {
              await handleLoggedOutState('Sua sessao expirou. Entre novamente para continuar.');
              return false;
            }
            throw new Error(payload?.message || 'Falha ao salvar seus flashcards.');
          }
          return true;
        } catch (error) {
          console.warn('Falha ao sincronizar estado dos flashcards:', error);
          return false;
        } finally {
          state.flashcardsSyncInFlight = false;
          if (state.flashcardsSyncQueued) {
            state.flashcardsSyncQueued = false;
            scheduleFlashcardCloudSync(350);
          }
        }
      }

      function scheduleFlashcardCloudSync(delayMs = 900) {
        if (!state.user?.id) return;
        if (state.flashcardsSyncTimer) {
          window.clearTimeout(state.flashcardsSyncTimer);
        }
        state.flashcardsSyncTimer = window.setTimeout(() => {
          state.flashcardsSyncTimer = 0;
          syncFlashcardCloudNow();
        }, Math.max(0, Number(delayMs) || 0));
      }

      function authCopyText() {
        const isRegister = state.authMode === 'register';
        if (state.authReason === 'progress') {
          return isRegister
            ? 'Crie sua conta para salvar seus 6 flashcards e continuar jogando.'
            : 'Voce ja liberou 6 flashcards. Entre agora para continuar sem perder seu progresso.';
        }
        return isRegister
          ? 'Crie seu nome e sua senha para entrar na Liga Playtalk e aparecer no ranking.'
          : 'Entre com seu nome e senha para comeÃƒÂ§ar a jogar na Liga Playtalk.';
      }

      function setAuthMode(mode) {
        state.authMode = mode === 'register' ? 'register' : 'login';
        const isRegister = state.authMode === 'register';
        els.authModeLogin.classList.toggle('is-active', !isRegister);
        els.authModeRegister.classList.toggle('is-active', isRegister);
        els.authSubmitBtn.textContent = isRegister ? 'Cadastrar e jogar' : 'Entrar e jogar';
        els.authPassword.setAttribute('autocomplete', isRegister ? 'new-password' : 'current-password');
        els.authCopy.textContent = authCopyText();
      }

      function setAuthStatus(message, tone = '') {
        els.authStatus.textContent = message || '';
        els.authStatus.className = 'auth-status';
        if (tone) {
          els.authStatus.classList.add(`is-${tone}`);
        }
      }

      function clearWelcomeRotation() {
        if (!state.entry.welcomeTimer) return;
        window.clearInterval(state.entry.welcomeTimer);
        state.entry.welcomeTimer = 0;
      }

      function setWelcomeCopy(text, animate = false) {
        if (!els.welcomeCopy) return;
        const nextText = safeText(text) || WELCOME_COPY_MESSAGES[0];
        if (!animate || els.welcomeCopy.textContent === nextText) {
          els.welcomeCopy.textContent = nextText;
          els.welcomeCopy.classList.remove('is-changing');
          return;
        }
        els.welcomeCopy.classList.add('is-changing');
        window.setTimeout(() => {
          els.welcomeCopy.textContent = nextText;
          els.welcomeCopy.classList.remove('is-changing');
        }, 160);
      }

      function shouldShowWelcomeGate() {
        if (state.entry.authRequired || state.game.active || state.watch.active || isAdminUser()) return false;
        if (state.game.tutorial.completed) return false;
        if (hasTutorialPlanetUnlocked()) return false;
        return !state.entry.cardsReady || Boolean(findTutorialPlanetCard());
      }

      function syncWelcomeGate() {
        const visible = shouldShowWelcomeGate();
        state.entry.welcomeVisible = visible;
        document.body.classList.toggle('welcome-active', visible);
        els.welcomeGate?.classList.toggle('is-visible', visible);
        if (!visible) {
          clearWelcomeRotation();
          return;
        }
        if (state.entry.pendingTutorialStart) {
          setWelcomeCopy('Preparando tutorial...');
          return;
        }
        setWelcomeCopy(WELCOME_COPY_MESSAGES[state.entry.welcomeIndex % WELCOME_COPY_MESSAGES.length]);
        if (state.entry.welcomeTimer) return;
        state.entry.welcomeTimer = window.setInterval(() => {
          if (!shouldShowWelcomeGate() || state.entry.pendingTutorialStart) return;
          state.entry.welcomeIndex = (state.entry.welcomeIndex + 1) % WELCOME_COPY_MESSAGES.length;
          setWelcomeCopy(WELCOME_COPY_MESSAGES[state.entry.welcomeIndex], true);
        }, WELCOME_COPY_ROTATION_MS);
      }

      function hideWelcomeGate() {
        state.entry.pendingTutorialStart = false;
        state.entry.welcomeVisible = false;
        document.body.classList.remove('welcome-active');
        els.welcomeGate?.classList.remove('is-visible');
        clearWelcomeRotation();
      }

      function tryStartPendingTutorial() {
        if (!state.entry.pendingTutorialStart || !state.entry.cardsReady) return false;
        if (!findTutorialPlanetCard()) {
          state.entry.pendingTutorialStart = false;
          syncWelcomeGate();
          return false;
        }
        hideWelcomeGate();
        beginTutorialGame();
        return true;
      }

      function requestWelcomeTutorialStart() {
        if (state.entry.authRequired) return;
        if (hasTutorialPlanetUnlocked()) {
          hideWelcomeGate();
          beginGame();
          return;
        }
        state.entry.pendingTutorialStart = true;
        setWelcomeCopy('Preparando tutorial...');
        tryStartPendingTutorial();
      }

      function clearGuestAuthDelay() {
        if (!state.entry.authDelayTimer) return;
        window.clearTimeout(state.entry.authDelayTimer);
        state.entry.authDelayTimer = 0;
      }

      function shouldRequireGuestAuth() {
        return !state.user?.id
          && !isAdminUser()
          && accessibleFlashcardsCount() >= GUEST_FLASHCARD_LOGIN_THRESHOLD;
      }

      function clearAuthRevealTimer() {
        if (!state.entry.authRevealTimer) return;
        window.clearTimeout(state.entry.authRevealTimer);
        state.entry.authRevealTimer = 0;
      }

      function lockFlashcardsApp(locked) {
        document.body.classList.toggle('auth-locked', locked);
      }

      function hideAuthGate() {
        state.entry.authRequired = false;
        state.authReason = 'optional';
        clearAuthRevealTimer();
        els.authGate?.classList.remove('is-form-visible');
        lockFlashcardsApp(false);
        setAuthStatus('');
      }

      function showAuthGate({ reason = 'optional', statusMessage = '' } = {}) {
        state.entry.authRequired = true;
        state.authReason = reason;
        clearAuthRevealTimer();
        lockFlashcardsApp(true);
        els.authGate?.classList.remove('is-form-visible');
        setAuthMode('login');
        els.authCopy.textContent = authCopyText();
        setAuthStatus(statusMessage);
        state.entry.authRevealTimer = window.setTimeout(() => {
          state.entry.authRevealTimer = 0;
          els.authGate?.classList.add('is-form-visible');
          els.authUsername?.focus({ preventScroll: true });
        }, AUTH_GATE_FORM_REVEAL_MS);
      }

      async function enforceGuestAuthGate() {
        clearGuestAuthDelay();
        if (!shouldRequireGuestAuth()) return false;
        hideWelcomeGate();
        if (state.watch.active) {
          stopWatch();
        }
        if (state.game.active) {
          await exitGame();
        }
        showAuthGate({
          reason: 'progress',
          statusMessage: 'Voce liberou 6 flashcards. Entre para continuar.'
        });
        return true;
      }

      function scheduleGuestAuthRequirement({ immediate = false } = {}) {
        if (!shouldRequireGuestAuth()) {
          clearGuestAuthDelay();
          return false;
        }
        if (state.entry.authRequired || state.entry.authDelayTimer) {
          return true;
        }
        if (immediate) {
          void enforceGuestAuthGate();
          return true;
        }
        state.entry.authDelayTimer = window.setTimeout(() => {
          state.entry.authDelayTimer = 0;
          void enforceGuestAuthGate();
        }, GUEST_FLASHCARD_LOGIN_DELAY_MS);
        return true;
      }

      async function fetchSessionUser() {
        const response = await fetch(buildApiUrl('/auth/session'), {
          headers: buildAuthHeaders(),
          cache: 'no-store'
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload?.success) {
          return null;
        }
        return normalizeUser(payload.user);
      }

      function setProfileStatus(message, tone = '') {
        if (!els.profileStatus) return;
        els.profileStatus.textContent = message || '';
        els.profileStatus.className = 'profile-panel__status';
        if (tone) {
          els.profileStatus.classList.add(`is-${tone}`);
        }
      }

      function syncFooterNav() {
        const activeView = state.ui.activeView;
        [els.footerPlayBtn, els.footerCardsBtn, els.footerUsersBtn, els.footerProfileBtn].forEach((button) => {
          if (!button) return;
          button.classList.toggle('is-active', button.dataset.view === activeView);
        });
      }

      function renderPremiumCode() {
        if (els.premiumCodeValue) {
          const slots = Array.from({ length: 6 }, (_, index) => {
            const letter = state.ui.premiumCode[index] || '';
            if (!letter) {
              return '<div class="premium-gate__code-slot"><span>â€¢</span></div>';
            }
            return                             `<div class="premium-gate__code-slot" data-filled-slot="${index}"><img src="/accesskey/${letter.toLowerCase()}.png" alt="${escapeHtml(letter)}"></div>`;
          });
          els.premiumCodeValue.innerHTML = slots.join('');
        }
        if (els.premiumStatus) {
          els.premiumStatus.textContent = state.ui.premiumStatus || 'Toque nas imagens na ordem certa para digitar a chave.';
        }
        if (els.premiumClearBtn) {
          els.premiumClearBtn.disabled = state.ui.premiumBusy || !state.ui.premiumCode;
        }
        if (els.premiumBackspaceBtn) {
          els.premiumBackspaceBtn.disabled = state.ui.premiumBusy || !state.ui.premiumCode;
        }
      }

      function setPremiumStatus(message) {
        state.ui.premiumStatus = safeText(message);
        renderPremiumCode();
      }

      function stopPremiumAudio() {
        if (!state.ui.premiumAudio) return;
        try {
          state.ui.premiumAudio.pause();
          state.ui.premiumAudio.currentTime = 0;
        } catch (_error) {
          // ignore
        }
        state.ui.premiumAudio = null;
      }

      function playPremiumAudio(src, { allowReplay = false } = {}) {
        if (!src) return;
        if (!allowReplay && state.ui.premiumAudio && state.ui.premiumAudio.src.endsWith(src)) {
          return;
        }
        stopPremiumAudio();
        const audio = new Audio(src);
        state.ui.premiumAudio = audio;
        const clearCurrent = () => {
          if (state.ui.premiumAudio === audio) {
            state.ui.premiumAudio = null;
          }
        };
        audio.addEventListener('ended', clearCurrent, { once: true });
        audio.addEventListener('error', clearCurrent, { once: true });
        audio.play().catch(clearCurrent);
      }

      function playPremiumLimitAudio() {
        if (state.ui.premiumAudioPlayed) return;
        state.ui.premiumAudioPlayed = true;
        playPremiumAudio(ACCESS_KEY_AUDIO_LIMIT_PATH);
      }

      function flashPremiumCodeSlots() {
        els.premiumCodeValue?.querySelectorAll('.premium-gate__code-slot[data-filled-slot]').forEach((slot) => {
          slot.classList.remove('is-flash');
          void slot.offsetWidth;
          slot.classList.add('is-flash');
        });
      }

      function closePremiumGate(force = false) {
        if (!els.premiumGate) return;
        if (!force && shouldGatePremiumAccess()) return;
        state.ui.premiumGateOpen = false;
        document.body.classList.remove('premium-gate-open');
        els.premiumGate.classList.remove('is-visible');
      }

      function openPremiumGate(message) {
        if (!els.premiumGate) return;
        state.ui.premiumGateOpen = true;
        state.ui.premiumCode = '';
        state.ui.premiumBusy = false;
        state.ui.premiumAudioPlayed = false;
        document.body.classList.add('premium-gate-open');
        els.premiumGate.classList.add('is-visible');
        playPremiumLimitAudio();
        setPremiumStatus(message || 'Voce chegou ao limite de 8 cartas. Digite uma chave premium.');
      }

      async function redeemPremiumAccessCode() {
        if (!state.user?.id) {
          setPremiumStatus('Entre na sua conta para ativar a chave premium.');
          return;
        }
        if (state.ui.premiumCode.length !== 6 || state.ui.premiumBusy) {
          return;
        }

        state.ui.premiumBusy = true;
        setPremiumStatus('Validando chave...');

        try {
          const response = await fetch(buildApiUrl('/api/premium/redeem'), {
            method: 'POST',
            headers: buildAuthHeaders({
              'Content-Type': 'application/json'
            }),
            body: JSON.stringify({ code: state.ui.premiumCode })
          });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok || !payload?.success) {
            throw new Error(payload?.message || 'Nao foi possivel validar a chave.');
          }

          const updatedUser = normalizeUser(payload.user);
          if (updatedUser) {
            state.user = updatedUser;
          }
          flashPremiumCodeSlots();
          playPremiumAudio(ACCESS_KEY_AUDIO_SUCCESS_PATHS[payload?.accessType] || ACCESS_KEY_AUDIO_LIMIT_PATH, { allowReplay: true });
          state.ui.premiumCode = '';
          setPremiumStatus(payload?.message || 'Premium liberado com sucesso.');
          renderProfilePanel();
          renderMetrics();
          closePremiumGate(true);
        } catch (error) {
          playPremiumAudio(ACCESS_KEY_AUDIO_INVALID_PATH, { allowReplay: true });
          state.ui.premiumCode = '';
          setPremiumStatus(error?.message || 'Chave invalida.');
        } finally {
          state.ui.premiumBusy = false;
          renderPremiumCode();
        }
      }

      function appendPremiumCodeLetter(letter) {
        if (!state.ui.premiumGateOpen || state.ui.premiumBusy) return;
        const normalized = safeText(letter).toUpperCase().replace(/[^A-P]/g, '');
        if (!normalized || state.ui.premiumCode.length >= 6) return;
        state.ui.premiumCode = `${state.ui.premiumCode}${normalized}`.slice(0, 6);
        playPremiumAudio(ACCESS_KEY_AUDIO_MESSAGE_PATH, { allowReplay: true });
        renderPremiumCode();
        if (state.ui.premiumCode.length === 6) {
          void redeemPremiumAccessCode();
        }
      }

      function syncPremiumGateVisibility() {

        if (shouldGatePremiumAccess()) {
          if (state.game.active) {
            void exitGame();
          }
          openPremiumGate();
          return true;
        }
        closePremiumGate(true);
        return false;
      }

      function renderProfilePanel() {
        const username = safeText(state.user?.username) || 'Jogador';
        const avatar = state.ui.profileAvatarDraft || safeText(state.user?.avatar) || safeText(state.user?.avatar_image);
        const hasAvatar = Boolean(avatar);
        if (els.profileNameInput) {
          els.profileNameInput.value = username;
        }
        if (els.profileAvatarPreview) {
          els.profileAvatarPreview.src = hasAvatar ? avatar : 'Avatar/avatar-man-person-svgrepo-com.svg';
          els.profileAvatarPreview.style.display = hasAvatar ? 'block' : 'none';
        }
        if (els.profileAvatarFallback) {
          els.profileAvatarFallback.textContent = username.charAt(0).toUpperCase() || 'P';
          els.profileAvatarFallback.style.display = hasAvatar ? 'none' : 'grid';
        }
        if (els.profileSaveBtn) {
          els.profileSaveBtn.disabled = !state.user;
        }
        if (els.profileLogoutBtn) {
          els.profileLogoutBtn.hidden = !state.user;
        }
      }

      function switchMainView(view) {
        const nextView = ['cards', 'users', 'profile', 'play'].includes(view) ? view : 'cards';
        state.ui.activeView = nextView === 'play' ? 'play' : nextView;
        const showCatalog = nextView === 'cards';
        const showUsers = nextView === 'users';
        const showProfile = nextView === 'profile';
        const showTopbar = false;

        if (els.catalog) {
          els.catalog.hidden = !showCatalog;
        }
        if (els.usersPanel) {
          els.usersPanel.hidden = !showUsers;
        }
        if (els.profilePanel) {
          els.profilePanel.hidden = !showProfile;
        }
        if (els.topbar) {
          els.topbar.hidden = !showTopbar;
          els.topbar.classList.toggle('is-hidden', !showTopbar);
        }
        if (els.usersPanel) {
          els.usersPanel.classList.toggle('section', !showUsers);
          els.usersPanel.classList.toggle('panel', !showUsers);
        }
        if (showProfile) {
          renderProfilePanel();
        }
        syncFooterNav();
      }

      async function navigateToMainView(view) {
        const nextView = ['cards', 'users', 'profile', 'play'].includes(view) ? view : 'cards';
        if (state.game.active && nextView !== 'play') {
          await exitGame();
        }
        if (state.watch.active && nextView !== 'play') {
          stopWatch();
        }
        if (nextView !== 'play') {
          closeGameSetup();
          closeWatchPopover();
          document.body.classList.remove('game-open');
        }
        if (nextView === 'play') {
          switchMainView('play');
          if (!state.game.active) {
            openGameSetup();
          }
          return;
        }
        switchMainView(nextView);
      }

      async function fileToDataUrl(file) {
        return await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ''));
          reader.onerror = () => reject(reader.error || new Error('Falha ao ler a imagem.'));
          reader.readAsDataURL(file);
        });
      }

      async function submitProfileForm(event) {
        event?.preventDefault?.();
        if (!state.user?.id) {
          setProfileStatus('Entre na conta para editar o perfil.', 'error');
          return;
        }

        const nextUsername = safeText(els.profileNameInput?.value);
        if (!nextUsername) {
          setProfileStatus('Digite um nome de usuario.', 'error');
          return;
        }

        setProfileStatus('Salvando perfil...');
        try {
          const profileResponse = await fetch(buildApiUrl('/auth/profile'), {
            method: 'PATCH',
            headers: buildAuthHeaders({
              'Content-Type': 'application/json'
            }),
            body: JSON.stringify({ username: nextUsername })
          });
          const profilePayload = await profileResponse.json().catch(() => ({}));
          if (!profileResponse.ok || !profilePayload?.success) {
            throw new Error(profilePayload?.message || 'Nao foi possivel salvar o perfil.');
          }

          let updatedUser = normalizeUser(profilePayload.user) || state.user;
          if (state.ui.profileAvatarDraft) {
            const avatarResponse = await fetch(buildApiUrl('/auth/avatar'), {
              method: 'PATCH',
              headers: buildAuthHeaders({
                'Content-Type': 'application/json'
              }),
              body: JSON.stringify({ avatar: state.ui.profileAvatarDraft })
            });
            const avatarPayload = await avatarResponse.json().catch(() => ({}));
            if (!avatarResponse.ok || !avatarPayload?.success) {
              throw new Error(avatarPayload?.message || 'Nao foi possivel salvar a foto.');
            }
            updatedUser = normalizeUser(avatarPayload.user) || updatedUser;
          }

          state.user = updatedUser;
          state.ui.profileAvatarDraft = '';
          renderProfilePanel();
          refreshLibrary();
          setProfileStatus('Perfil atualizado com sucesso.', 'success');
        } catch (error) {
          setProfileStatus(error?.message || 'Nao foi possivel salvar o perfil.', 'error');
        }
      }

      async function hydrateAuthenticatedApp(user, options = {}) {
        state.user = normalizeUser(user);
        if (!state.user) {
          throw new Error('Sessao invalida.');
        }
        clearGuestAuthDelay();
        scheduleCardsRefresh();
        state.libraryPage = 1;

        const localStats = readUserStats();
        const localProgress = readUserProgress();
        const localHidden = readHiddenCardIds();
        let cloudState = null;
        try {
          cloudState = await fetchFlashcardCloudState();
        } catch (error) {
          if (Number(error?.statusCode) === 401) {
            throw error;
          }
          console.warn('Falha ao carregar estado salvo dos flashcards:', error);
        }

        const cloudProgress = Array.isArray(cloudState?.progress)
          ? cloudState.progress.map(normalizeProgressRecord).filter(Boolean)
          : [];
        const hasCloudProgress = Boolean(cloudState?.meta?.hasProgress);
        const hasCloudStats = Boolean(cloudState?.meta?.hasStats);

        state.stats = hasCloudStats
          ? normalizeStatsSnapshot(cloudState?.stats)
          : localStats;
        state.userCards = hasCloudProgress
          ? new Map(cloudProgress.map(record => [record.cardId, record]))
          : localProgress;
        state.hiddenCardIds = Array.isArray(cloudState?.meta?.hiddenCardIds)
          ? new Set(cloudState.meta.hiddenCardIds.map((cardId) => safeText(cardId)).filter(Boolean))
          : localHidden;
        state.game.tutorial.completed = readTutorialProgress();
        syncOwnedIdsFromProgress();

        if (Number.isFinite(Number(cloudState?.serverTimeMs)) && Number(cloudState.serverTimeMs) > 0) {
          state.timeOffsetMs = Math.round(Number(cloudState.serverTimeMs) - Date.now());
          saveTimeOffsetMs();
        }

        persistUserStatsLocally();
        persistUserProgressLocally();
        persistHiddenCardIdsLocally();

        renderMetrics();
        updateGameChips();
        refreshLibrary();
        renderProfilePanel();
        hideAuthGate();
        if (els.startGameBtn) {
          els.startGameBtn.disabled = false;
        }
        switchMainView(state.ui.activeView === 'play' ? 'cards' : state.ui.activeView);

        if (!options.skipLoadCards) {
          try {
            await loadCards();
            const prunedUnavailable = pruneUnavailableUserProgress();
            refreshLibrary();
            if (prunedUnavailable) {
              await syncFlashcardCloudNow();
            }
          } catch (error) {
            console.warn('Falha ao carregar os flashcards do usuario:', error);
            els.allSectionCopy.textContent = 'Falha ao carregar os flashcards.';
            els.allGrid.innerHTML = `<div class="empty">${escapeHtml(error.message || 'Falha ao carregar.')}</div>`;
            if (els.startGameBtn) {
              els.startGameBtn.disabled = true;
            }
          }
        }

        await migrateGuestProgressToAuthenticatedUser();

        if ((!hasCloudProgress && localProgress.size > 0) || (!hasCloudStats && hasMeaningfulStats(localStats))) {
          await syncFlashcardCloudNow();
        }
        syncWelcomeGate();
        tryStartPendingTutorial();
      }

      async function handleLoggedOutState(message) {
        if (state.game.active) {
          await exitGame();
        }
        if (state.watch.active) {
          stopWatch();
        }
        persistAuthToken('');
        clearGuestAuthDelay();
        state.user = null;
        syncAdminTheme();
        stopCardsRefresh();
        if (state.flashcardsSyncTimer) {
          window.clearTimeout(state.flashcardsSyncTimer);
          state.flashcardsSyncTimer = 0;
        }
        state.flashcardsSyncInFlight = false;
        state.flashcardsSyncQueued = false;
        state.userCards = readUserProgressForUser(0);
        state.hiddenCardIds = readHiddenCardIdsForUser(0);
        state.stats = readUserStatsForUser(0);
        state.libraryPage = 1;
        state.admin.selectedDeckSource = '';
        state.admin.decks = [];
        state.admin.reportFilter = '';
        state.admin.reportCounts = new Map();
        state.admin.draftCards = new Map();
        state.admin.pendingNewCards = [];
        resetTutorialRuntime({ preserveCompletion: false });
        state.game.tutorial.completed = readTutorialProgressForUser(0);
        syncOwnedIdsFromProgress();
        renderMetrics();
        updateGameChips();
        refreshLibrary();
        state.ui.profileAvatarDraft = '';
        renderProfilePanel();
        hideAuthGate();
        if (els.startGameBtn) {
          els.startGameBtn.disabled = false;
        }
        switchMainView('cards');
        syncWelcomeGate();
        tryStartPendingTutorial();
        if (shouldRequireGuestAuth()) {
          showAuthGate({
            reason: 'progress',
            statusMessage: message || 'Entre com seu nome e senha para continuar.'
          });
          return;
        }
        setAuthStatus('');
      }

      async function submitAuthForm(event) {
        event.preventDefault();

        const username = safeText(els.authUsername.value).toLowerCase();
        const password = String(els.authPassword.value || '').trim();

        if (!username || !password) {
          setAuthStatus('Preencha nome e senha para continuar.', 'error');
          return;
        }

        els.authSubmitBtn.disabled = true;
        setAuthStatus(state.authMode === 'register' ? 'Criando sua conta...' : 'Entrando na Liga...');

        try {
          const endpoint = state.authMode === 'register' ? '/register' : '/login';
          const response = await fetch(buildApiUrl(endpoint), {
            method: 'POST',
            headers: buildAuthHeaders({
              'Content-Type': 'application/json'
            }),
            body: JSON.stringify({ username, password })
          });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok || !payload?.success) {
            throw new Error(payload?.message || 'Nao foi possivel autenticar agora.');
          }

          persistAuthToken(payload.token || '');
          els.authPassword.value = '';
          await hydrateAuthenticatedApp(payload.user);
          setAuthStatus(state.authMode === 'register' ? 'Conta criada. Bora jogar.' : 'Entrada liberada.', 'success');
        } catch (error) {
          setAuthStatus(String(error.message || 'Nao foi possivel autenticar agora.'), 'error');
        } finally {
          els.authSubmitBtn.disabled = false;
        }
      }

      async function logoutCurrentUser() {
        try {
          await fetch(buildApiUrl('/logout'), {
            method: 'POST',
            headers: buildAuthHeaders({
              'Content-Type': 'application/json'
            })
          });
        } catch (_error) {
          // ignore
        }
        await handleLoggedOutState('Sessao encerrada. Entre novamente para jogar.');
      }

      function isNativeRuntime() {
        try {
          if (window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function') {
            return Boolean(window.Capacitor.isNativePlatform());
          }
        } catch (_error) {
          // ignore
        }

        const protocol = String(window.location?.protocol || '').toLowerCase();
        const hostname = String(window.location?.hostname || '').toLowerCase();
        const port = String(window.location?.port || '').trim();
        return protocol === 'capacitor:'
          || protocol === 'file:'
          || ((hostname === 'localhost' || hostname === '127.0.0.1') && !port);
      }

      function resolveUsersHref() {
        return isNativeRuntime() ? 'users.html' : '/users';
      }

      async function syncFlashcardRankingNow() {
        return syncFlashcardCloudNow();
      }

      function scheduleFlashcardRankingSync(delayMs = 900) {
        scheduleFlashcardCloudSync(delayMs);
      }

      function phaseMeta(phaseIndex) {
        return REVIEW_PHASES[Math.max(1, Math.min(5, Number(phaseIndex) || 1))] || REVIEW_PHASES[1];
      }

      function activeSealPhase(record) {
        if (!record) return 0;
        if (record.status === 'memorizing') {
          return Math.max(1, Math.min(5, Number(record.targetPhaseIndex) || Number(record.phaseIndex) || 1));
        }
        if ((record.phaseIndex || 0) >= 1) return record.phaseIndex;
        return 0;
      }

      function resolveRewardSealPhase(entry) {
        const currentRecord = state.userCards.get(entry.id) || null;
        if (!currentRecord) return 1;
        if (currentRecord.status === 'ready' && (currentRecord.phaseIndex || 0) >= 5) {
          return Math.max(1, currentRecord.phaseIndex || 5);
        }
        return Math.max(1, Math.min(5, (currentRecord.phaseIndex || 0) + 1));
      }

      function progressPercent(record) {
        if (!record || record.status !== 'memorizing') return 100;
        const total = Math.max(1, Number(record.memorizingDurationMs) || 1);
        const elapsed = Math.max(0, getNowMs() - (Number(record.memorizingStartedAt) || 0));
        return Math.max(0, Math.min(100, (elapsed / total) * 100));
      }

      function advanceReadyMemorizations() {
        let changed = false;
        const now = getNowMs();
        state.userCards.forEach((record, cardId) => {
          if (record.status !== 'memorizing') return;
          if (now < (Number(record.availableAt) || 0)) return;
          record.status = 'ready';
          record.phaseIndex = Math.max(1, Math.min(5, Number(record.targetPhaseIndex) || 1));
          record.targetPhaseIndex = record.phaseIndex;
          record.memorizingStartedAt = 0;
          record.memorizingDurationMs = 0;
          record.availableAt = now;
          record.returnedAt = now;
          state.userCards.set(cardId, record);
          changed = true;
        });
        if (changed) {
          saveUserProgress();
        } else {
          syncOwnedIdsFromProgress();
        }
      }

      function moveCardToMemorizing(cardId, targetPhaseIndex) {
        const current = state.userCards.get(cardId) || createProgressRecord(cardId);
        const nextPhase = Math.max(1, Math.min(5, Number(targetPhaseIndex) || 1));
        const meta = phaseMeta(nextPhase);
        const now = getNowMs();
        const record = createProgressRecord(cardId, {
          ...current,
          status: 'memorizing',
          targetPhaseIndex: nextPhase,
          memorizingStartedAt: now,
          memorizingDurationMs: meta.durationMs,
          availableAt: now + meta.durationMs,
          returnedAt: 0,
          createdAt: current.createdAt || now
        });
        state.userCards.set(cardId, record);
        saveUserProgress();
        return record;
      }

      function userProgressCards() {
        if (isAdminUser()) {
          return state.allCards
            .filter((card) => hasCoreFlashcardText(card) && hasPlayableFlashcardImage(card))
            .map((card) => ({
            ...card,
            progress: adminReadyProgressRecord(card.id)
            }));
        }
        advanceReadyMemorizations();
        return Array.from(state.userCards.values())
          .map(record => {
            const card = state.allCards.find(item => item.id === record.cardId);
            if (!card) return null;
            if (isCardHiddenForUser(card.id)) return null;
            if (!hasCoreFlashcardText(card) || !hasPlayableFlashcardImage(card)) return null;
            return { ...card, progress: record };
          })
          .filter(Boolean)
          .sort((left, right) => {
            const leftPin = left.progress.status === 'memorizing' ? Number(left.progress.availableAt) || 0 : Number(left.progress.returnedAt || left.progress.createdAt) || 0;
            const rightPin = right.progress.status === 'memorizing' ? Number(right.progress.availableAt) || 0 : Number(right.progress.returnedAt || right.progress.createdAt) || 0;
            return rightPin - leftPin;
          });
      }

      function pruneUnavailableUserProgress() {
        if (isAdminUser()) return false;
        const validCardIds = new Set(state.allCards.map((card) => safeText(card?.id)).filter(Boolean));
        let changed = false;
        const nextUserCards = new Map();
        state.userCards.forEach((record, cardId) => {
          const normalizedCardId = safeText(cardId);
          if (!normalizedCardId || !validCardIds.has(normalizedCardId)) {
            changed = true;
            return;
          }
          nextUserCards.set(normalizedCardId, record);
        });
        if (changed) {
          state.userCards = nextUserCards;
          syncOwnedIdsFromProgress();
          persistUserProgressLocally();
        }
        return changed;
      }

      function readyReviewCards() {
        if (isAdminUser()) {
          return [];
        }
        advanceReadyMemorizations();
        return Array.from(state.userCards.values())
          .filter(record => record.status === 'ready' && (record.phaseIndex || 0) >= 1)
          .sort((left, right) => (Number(left.returnedAt) || 0) - (Number(right.returnedAt) || 0))
          .map(record => state.allCards.find(card => card.id === record.cardId))
          .filter(card => card && !isCardHiddenForUser(card.id) && hasCoreFlashcardText(card) && hasPlayableFlashcardImage(card));
      }

      function totalGameAvailableCards() {
        if (isAdminUser()) {
          return userProgressCards().length;
        }
        return uniqueCardsById([
          ...baseCandidateCards(),
          ...readyReviewCards()
        ]).length;
      }

      function syncGameSetupSummary() {
        if (!els.gameSetupCountCopy) return;
        const total = totalGameAvailableCards();
        els.gameSetupCountCopy.textContent = total
          ? `${total} flashcards disponiveis no total para jogar agora.`
          : 'Nenhum flashcard disponivel para jogar agora.';
        syncTutorialSetupButton();
      }

      function tutorialAudioPath(index) {
        return `/${TUTORIAL_AUDIO_ROOT}/tuto${index}.mp3`;
      }

      function findTutorialPlanetCard() {
        return state.allCards.find((card) => {
          const english = normalizeText(card?.english);
          const portuguese = normalizeText(card?.portuguese);
          const imageUrl = safeText(card?.imageUrl).toLowerCase();
          return (
            (english === TUTORIAL_PLANET_ENGLISH && portuguese === TUTORIAL_PLANET_PORTUGUESE)
            || imageUrl.includes(`/${TUTORIAL_PLANET_IMAGE_NAME}`)
            || imageUrl.endsWith(TUTORIAL_PLANET_IMAGE_NAME)
          );
        }) || null;
      }

      function hasTutorialPlanetUnlocked() {
        const tutorialCard = findTutorialPlanetCard();
        if (!tutorialCard) return false;
        return state.userCards.has(tutorialCard.id) || state.ownedIds.has(tutorialCard.id);
      }

      function isTutorialPlanetCard(cardOrId) {
        const tutorialCard = findTutorialPlanetCard();
        const card = typeof cardOrId === 'string' ? cardById(cardOrId) : cardOrId;
        return Boolean(tutorialCard && card && tutorialCard.id === card.id);
      }

      function shouldSuppressTutorialCardAudio(card) {
        return Boolean(state.game.tutorial.active && isTutorialPlanetCard(card));
      }

      function canOfferTutorialMode() {
        return Boolean(
          !isAdminUser()
          && !state.game.tutorial.completed
          && !hasTutorialPlanetUnlocked()
          && findTutorialPlanetCard()
        );
      }

      function syncTutorialSetupButton() {
        if (!els.startTutorialBtn) return;
        const available = canOfferTutorialMode();
        els.startTutorialBtn.hidden = !available;
        els.startTutorialBtn.disabled = !available;
      }

      function clearTutorialTimers() {
        const timers = Array.isArray(state.game.tutorial.timers) ? state.game.tutorial.timers : [];
        timers.forEach((timerId) => window.clearTimeout(timerId));
        state.game.tutorial.timers = [];
      }

      function queueTutorialTimer(token, delayMs, callback) {
        const timerId = window.setTimeout(() => {
          state.game.tutorial.timers = state.game.tutorial.timers.filter((currentId) => currentId !== timerId);
          if (state.game.tutorial.sequenceToken !== token) return;
          callback();
        }, Math.max(0, Number(delayMs) || 0));
        state.game.tutorial.timers.push(timerId);
        return timerId;
      }

      function isTutorialSequenceCurrent(token, cardId = state.game.currentId) {
        return Boolean(
          state.game.active
          && state.game.tutorial.active
          && state.game.tutorial.sequenceToken === token
          && (!cardId || state.game.currentId === cardId)
        );
      }

      function tutorialFinaleState() {
        return state.game.tutorial?.finale || createTutorialState().finale;
      }

      function setTutorialFinaleState(patch = {}) {
        state.game.tutorial.finale = {
          ...tutorialFinaleState(),
          ...patch
        };
        const finaleCardId = safeText(state.game.tutorial.finale.cardId);
        if (!finaleCardId || state.game.currentId === finaleCardId) {
          renderCurrentCard();
        }
      }

      function preloadTutorialFinaleSeals() {
        Object.values(REVIEW_PHASES).forEach((phase) => {
          const src = safeText(phase?.sealPath);
          if (!src || state.game.preloadImages.has(src)) return;
          const image = new Image();
          image.src = src;
          state.game.preloadImages.set(src, image);
        });
      }

      function flashTutorialFinaleSeal(phase, cardId) {
        setTutorialFinaleState({
          active: true,
          cardId,
          sealPhase: phase,
          sealFlash: true,
          sealSoft: true
        });
        window.setTimeout(() => {
          if (!state.game.tutorial.active) return;
          const finale = tutorialFinaleState();
          if (!finale.active || finale.cardId !== cardId || finale.sealPhase !== phase) return;
          setTutorialFinaleState({ sealFlash: false });
        }, TUTORIAL_FINALE_SEAL_FLASH_MS);
      }

      function resetTutorialVisualState() {
        const gameShell = els.game.querySelector('.game-shell');
        gameShell?.classList.remove('is-tutorial-intro', 'is-tutorial-reveal');
        els.gameTutorialLogo?.classList.remove('is-visible', 'is-fading-out');
        els.gameVisual.classList.remove('is-mic-live', 'is-tutorial-mic-fade', 'is-tutorial-mic-flash');
      }

      function setTutorialTypingDisabled(disabled) {
        Array.from(els.gameTypingKeyboard.querySelectorAll('.flashcards-typing__grid')).forEach((grid) => {
          setTypingKeysDisabled(grid, disabled);
        });
      }

      function setTutorialInteractionLocked(locked) {
        const nextLocked = Boolean(locked);
        state.game.tutorial.interactionLocked = nextLocked;
        state.game.paused = nextLocked;
        if (nextLocked) {
          state.game.canListen = false;
          cleanupGameRecognition();
        }
        els.gameTouchBtn.disabled = nextLocked;
        if (els.gameLanguageBtn) {
          els.gameLanguageBtn.disabled = nextLocked;
        }
        if (els.gameReportTrigger) {
          els.gameReportTrigger.disabled = nextLocked;
        }
        setTutorialTypingDisabled(nextLocked);
      }

      function resetTutorialRuntime({ preserveCompletion = true } = {}) {
        clearTutorialTimers();
        resetTutorialVisualState();
        state.game.paused = false;
        state.game.canListen = false;
        state.game.tutorial.sequenceToken += 1;
        const completed = preserveCompletion ? Boolean(state.game.tutorial.completed) : false;
        state.game.tutorial = {
          ...createTutorialState(),
          completed
        };
        els.gameTouchBtn.disabled = false;
        if (els.gameLanguageBtn) {
          els.gameLanguageBtn.disabled = false;
        }
        if (els.gameReportTrigger) {
          els.gameReportTrigger.disabled = false;
        }
      }

      function startTutorialSequence(entryId) {
        clearTutorialTimers();
        resetTutorialVisualState();
        state.game.tutorial.sequenceToken += 1;
        state.game.tutorial.currentCardId = safeText(entryId);
        return state.game.tutorial.sequenceToken;
      }

      function playTutorialAudio(index) {
        const resolved = resolveInlineMediaUrl(tutorialAudioPath(index));
        if (!resolved) return Promise.resolve(false);
        stopActiveAudio();
        const audio = new Audio(resolved);
        audio.preload = 'auto';
        return playAudioWithSoftEnd(audio, { registerAsActive: true });
      }

      function triggerTutorialMicFlash() {
        els.gameVisual.classList.remove('is-tutorial-mic-flash');
        void els.gameVisual.offsetWidth;
        els.gameVisual.classList.add('is-tutorial-mic-flash');
      }

      function beginTutorialIntroSequence(entry) {
        const token = startTutorialSequence(entry.id);
        const gameShell = els.game.querySelector('.game-shell');
        state.game.tutorial.introPlayed = true;
        state.game.tutorial.explainedStars = Math.max(state.game.tutorial.explainedStars, 0);
        gameShell?.classList.add('is-tutorial-intro');
        setTutorialInteractionLocked(true);
        setGameStatus('', '');
        playTutorialAudio(1).catch?.(() => {});

        queueTutorialTimer(token, 1000, () => {
          if (!isTutorialSequenceCurrent(token, entry.id)) return;
          els.gameTutorialLogo?.classList.add('is-visible');
        });

        queueTutorialTimer(token, 4000, () => {
          if (!isTutorialSequenceCurrent(token, entry.id)) return;
          els.gameTutorialLogo?.classList.remove('is-visible');
          els.gameTutorialLogo?.classList.add('is-fading-out');
        });

        queueTutorialTimer(token, 6000, () => {
          if (!isTutorialSequenceCurrent(token, entry.id)) return;
          gameShell?.classList.remove('is-tutorial-intro');
          gameShell?.classList.add('is-tutorial-reveal');
          queueTutorialTimer(token, 1700, () => {
            if (!isTutorialSequenceCurrent(token, entry.id)) return;
            gameShell?.classList.remove('is-tutorial-reveal');
          });
        });

        queueTutorialTimer(token, 9000, () => {
          if (!isTutorialSequenceCurrent(token, entry.id)) return;
          els.gameVisual.classList.remove('is-tutorial-mic-fade');
          els.gameVisual.classList.add('is-mic-live');
        });

        queueTutorialTimer(token, 10000, () => {
          if (!isTutorialSequenceCurrent(token, entry.id)) return;
          triggerTutorialMicFlash();
        });

        queueTutorialTimer(token, 11000, () => {
          if (!isTutorialSequenceCurrent(token, entry.id)) return;
          triggerTutorialMicFlash();
        });

        queueTutorialTimer(token, 12000, () => {
          if (!isTutorialSequenceCurrent(token, entry.id)) return;
          els.gameVisual.classList.add('is-tutorial-mic-fade');
          queueTutorialTimer(token, 700, () => {
            if (!isTutorialSequenceCurrent(token, entry.id)) return;
            els.gameVisual.classList.remove('is-mic-live', 'is-tutorial-mic-flash', 'is-tutorial-mic-fade');
          });
        });

        queueTutorialTimer(token, 15000, () => {
          if (!isTutorialSequenceCurrent(token, entry.id)) return;
          triggerWinFlash();
        });

        queueTutorialTimer(token, 19000, () => {
          if (!isTutorialSequenceCurrent(token, entry.id)) return;
          setTutorialInteractionLocked(false);
          state.game.canListen = true;
          renderGameTouchButton(STAGES[entry.stage] || STAGES[1], entry);
          setGameStatus('Toque para falar', 'live');
        });
      }

      async function beginTutorialHintSequence(entry, audioIndex) {
        const token = startTutorialSequence(entry.id);
        state.game.tutorial.explainedStars = Math.max(state.game.tutorial.explainedStars, Number(entry.stars) || 0);
        setTutorialInteractionLocked(true);
        await playTutorialAudio(audioIndex);
        if (!isTutorialSequenceCurrent(token, entry.id)) return;
        setTutorialInteractionLocked(false);
        renderCurrentCard();
      }

      function maybeRunTutorialSequence(entry, card) {
        if (!state.game.tutorial.active || state.game.tutorial.finishing || !isTutorialPlanetCard(card)) {
          return false;
        }
        if (Number(entry.stars) === 0 && !state.game.tutorial.introPlayed) {
          beginTutorialIntroSequence(entry);
          return true;
        }
        if (entry.stars >= 1 && entry.stars <= 4 && state.game.tutorial.explainedStars < entry.stars) {
          beginTutorialHintSequence(entry, entry.stars + 1);
          return true;
        }
        return false;
      }

      async function finishTutorialAndStartNormalGame() {
        const cardId = state.game.currentId || state.game.tutorial.currentCardId;
        const token = startTutorialSequence(cardId);
        state.game.tutorial.finishing = true;
        setTutorialInteractionLocked(true);
        clearPendingRewardSeal(cardId);
        preloadTutorialFinaleSeals();
        setTutorialFinaleState({
          active: true,
          cardId,
          sealPhase: 0,
          sealFlash: false,
          sealSoft: false
        });

        queueTutorialTimer(token, 6000, () => {
          if (!isTutorialSequenceCurrent(token, cardId)) return;
          flashTutorialFinaleSeal(1, cardId);
        });

        queueTutorialTimer(token, 9100, () => {
          if (!isTutorialSequenceCurrent(token, cardId)) return;
          flashTutorialFinaleSeal(2, cardId);
        });

        queueTutorialTimer(token, 10000, () => {
          if (!isTutorialSequenceCurrent(token, cardId)) return;
          flashTutorialFinaleSeal(3, cardId);
        });

        queueTutorialTimer(token, 11000, () => {
          if (!isTutorialSequenceCurrent(token, cardId)) return;
          flashTutorialFinaleSeal(4, cardId);
        });

        queueTutorialTimer(token, 12000, () => {
          if (!isTutorialSequenceCurrent(token, cardId)) return;
          flashTutorialFinaleSeal(5, cardId);
        });

        queueTutorialTimer(token, 14000, () => {
          if (!isTutorialSequenceCurrent(token, cardId)) return;
          flashTutorialFinaleSeal(1, cardId);
        });

        const resolved = resolveInlineMediaUrl(tutorialAudioPath(6));
        if (!resolved) {
          throw new Error('Nao consegui abrir o audio final do tutorial.');
        }
        stopActiveAudio();
        const audio = new Audio(resolved);
        audio.preload = 'auto';
        state.game.activeAudio = { type: 'audio', instance: audio };
        await new Promise((resolve) => {
          const finish = () => {
            audio.removeEventListener('ended', finish);
            audio.removeEventListener('error', finish);
            if (state.game.activeAudio?.instance === audio) {
              state.game.activeAudio = null;
            }
            resolve();
          };
          audio.addEventListener('ended', finish, { once: true });
          audio.addEventListener('error', finish, { once: true });
          audio.play().catch(finish);
        });
        if (state.game.tutorial.sequenceToken !== token || !state.game.active) return;
        setTutorialCompleted(true);
        resetTutorialRuntime({ preserveCompletion: true });
        clearGameSessionLocally();
        saveSelectedGameCount(TUTORIAL_NORMAL_GAME_COUNT);
        beginGame();
      }

      function stopCardsRefresh() {
        if (state.cardsRefreshTimer) {
          window.clearTimeout(state.cardsRefreshTimer);
          state.cardsRefreshTimer = 0;
        }
      }

      function scheduleCardsRefresh(delayMs = 20000) {
        stopCardsRefresh();
        if (!state.user) return;
        state.cardsRefreshTimer = window.setTimeout(async () => {
          state.cardsRefreshTimer = 0;
          if (!state.user) return;
          try {
            await reloadCardsFromNetwork();
          } catch (_error) {
            // ignore transient refresh failures
          } finally {
            scheduleCardsRefresh(delayMs);
          }
        }, delayMs);
      }

      function countFlashcardLetters(text) {
        return safeText(text)
          .replace(/[^A-Za-zÃ€-Ã¿0-9]/g, '')
          .length;
      }

      function isEarlyFlashcardLengthEligible(card) {
        const englishLength = countFlashcardLetters(card?.english);
        const portugueseLength = countFlashcardLetters(card?.portuguese);
        return englishLength >= EARLY_FLASHCARD_MIN_LENGTH
          && englishLength <= EARLY_FLASHCARD_MAX_LENGTH
          && portugueseLength >= EARLY_FLASHCARD_MIN_LENGTH
          && portugueseLength <= EARLY_FLASHCARD_MAX_LENGTH;
      }

      function baseCandidateCards() {
        if (isAdminUser()) {
          return state.allCards.filter((card) => hasCoreFlashcardText(card) && hasPlayableFlashcardImage(card));
        }
        const lockedCards = state.allCards.filter(card => !state.userCards.has(card.id) && !isCardHiddenForUser(card.id));
        const playableLockedCards = lockedCards.filter(card => hasCoreFlashcardText(card) && hasPlayableFlashcardImage(card));
        if (state.userCards.size >= EARLY_FLASHCARD_LIMIT) {
          return playableLockedCards;
        }
        return playableLockedCards.filter(isEarlyFlashcardLengthEligible);
      }

      function formatDuration(ms) {
        const totalSeconds = Math.max(0, Math.floor((Number(ms) || 0) / 1000));
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      }

      function flattenPayload(fileName, payload, options = {}) {
        const title = repairDisplayText(payload?.title) || fileName.replace(/\.json$/i, '');
        const sourceKey = safeText(options.sourceKey || fileName) || fileName;
        const idSource = safeText(options.idSource || fileName) || fileName;
        const items = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.items)
            ? payload.items
            : [];

        return items.map((item, index) => {
          const english = repairDisplayText(item?.nomeIngles || item?.english || item?.word);
          const portuguese = repairDisplayText(item?.nomePortugues || item?.portuguese || item?.translation);
          return {
            id: `${slug(idSource)}-${slug(title)}-${index}`,
            source: sourceKey,
            sourceIndex: index,
            deckTitle: title,
            imageUrl: safeText(item?.imagem || item?.image),
            english,
            englishAnswers: collectAcceptedAnswers(
              english,
              item?.acceptedEnglish,
              item?.acceptedAnswersEnglish,
              item?.englishAlternatives,
              item?.alternativasIngles,
              item?.respostasIngles,
              item?.correctEnglish
            ),
            portuguese,
            portugueseAnswers: collectAcceptedAnswers(
              portuguese,
              item?.acceptedPortuguese,
              item?.acceptedAnswersPortuguese,
              item?.portugueseAlternatives,
              item?.alternativasPortugues,
              item?.respostasPortugues,
              item?.correctPortuguese
            ),
            audioUrl: safeText(item?.audio || item?.audioUrl),
            category: repairDisplayText(item?.categoria || title)
          };
        });
      }

      function hasCoreFlashcardText(card) {
        return Boolean(safeText(card?.english) && safeText(card?.portuguese));
      }

      function normalizeFlashcardImageSource(value) {
        const text = safeText(value);
        if (!text) return '';
        if (/^https?:\/\//i.test(text)) {
          try {
            const parsed = new URL(text);
            return String(parsed.pathname || '').replace(/^\/+/, '');
          } catch (_error) {
            return text.replace(/^\/+/, '');
          }
        }
        const proxyMatch = text.match(/^\/?api\/r2-media\/(.+)$/i);
        if (proxyMatch) {
          return safeText(proxyMatch[1]);
        }
        return text.replace(/^\/+/, '');
      }

      function isFlashcardPlaceholderImageUrl(value) {
        return normalizeFlashcardImageSource(value) === FLASHCARD_CAMERA_OBJECT_KEY;
      }

      function hasPlayableFlashcardImage(card) {
        const imageUrl = safeText(card?.imageUrl);
        return Boolean(imageUrl && !isFlashcardPlaceholderImageUrl(imageUrl));
      }

      function isAdminMagicImageSlot(card) {
        return !hasPlayableFlashcardImage(card);
      }

      function adminCardDisplayImageUrl(card) {
        const imageUrl = safeText(card?.imageUrl);
        if (imageUrl && !isFlashcardPlaceholderImageUrl(imageUrl)) {
          return imageUrl;
        }
        return FLASHCARD_CAMERA_IMAGE_URL;
      }

      function normalizeFlashcardsDataPath(path) {
        const cleaned = safeText(path);
        if (!cleaned) return '';
        if (/^https?:\/\//i.test(cleaned)) {
          return cleaned;
        }
        return `/${cleaned.replace(/^\/+/, '')}`;
      }

      function withNoCacheUrl(path) {
        const normalized = normalizeFlashcardsDataPath(path);
        if (!normalized) return '';
        const separator = normalized.includes('?') ? '&' : '?';
        return `${normalized}${separator}_pt=${Date.now()}`;
      }

      function encodePublicObjectKey(objectKey) {
        return safeText(objectKey)
          .split('/')
          .filter(Boolean)
          .map((segment) => encodeURIComponent(segment))
          .join('/');
      }

      function buildFlashcardsPublicUrl(objectKey) {
        const encodedKey = encodePublicObjectKey(objectKey);
        return encodedKey ? `/${FLASHCARDS_LOCAL_SOURCE_PREFIX}/${encodedKey}` : '';
      }

      function isFlashcardsDeckPath(value) {
        const text = safeText(value);
        if (!text) return false;
        if (/^https?:\/\//i.test(text)) {
          try {
            const parsed = new URL(text);
            const parsedPath = decodeURIComponent(String(parsed.pathname || '')).replace(/^\/+/, '');
            return parsed.origin === window.location.origin
              && parsedPath.toLowerCase().endsWith('.json')
              && parsedPath.startsWith(`${FLASHCARDS_LOCAL_SOURCE_PREFIX}/`);
          } catch (_error) {
            return false;
          }
        }
        const normalized = text.replace(/^\/+/, '');
        return normalized.toLowerCase().endsWith('.json')
          && normalized.startsWith(`${FLASHCARDS_LOCAL_SOURCE_PREFIX}/`);
      }

      function resolveManifestDeckPath(file) {
        const fallbackName = safeText(file?.name) || safeText(file?.title) || 'deck.json';
        const candidates = [
          safeText(file?.path),
          safeText(file?.source),
          safeText(file?.name)
        ].filter(Boolean);

        for (const candidate of candidates) {
          if (isFlashcardsDeckPath(candidate)) {
            if (/^https?:\/\//i.test(candidate)) {
              return candidate;
            }
            return `/${candidate.replace(/^\/+/, '')}`;
          }

          const normalized = candidate.replace(/^\/+/, '');
          if (/^[^/]+\.json$/i.test(normalized)) {
            return buildFlashcardsPublicUrl(normalized);
          }
          if (normalized.startsWith(`${FLASHCARDS_LOCAL_SOURCE_PREFIX}/`) && normalized.toLowerCase().endsWith('.json')) {
            return `/${normalized}`;
          }
        }

        throw new Error(`O deck "${fallbackName}" precisa apontar para ${FLASHCARDS_LOCAL_SOURCE_PREFIX}/.`);
      }

      function sortDeckCatalogEntries(entries) {
        return entries.sort((left, right) => (
          safeText(left?.title).localeCompare(safeText(right?.title), 'pt-BR', {
            sensitivity: 'base',
            numeric: true
          })
        ));
      }

      function normalizeDeckFileName(file) {
        return safeText(file?.name) || safeText(file?.path).split('/').pop() || 'deck.json';
      }

      function buildDeckCatalogEntry(file, payload, cards) {
        const defaultTitle = normalizeDeckFileName(file).replace(/\.json$/i, '') || 'Deck';
        return {
          source: safeText(file?.sourceKey || file?.name || file?.path),
          title: repairDisplayText(payload?.title) || safeText(file?.title) || defaultTitle,
          path: safeText(file?.path),
          count: Array.isArray(cards) ? cards.length : (Number.isFinite(Number(file?.count)) ? Math.max(0, Number(file.count)) : 0)
        };
      }

      async function fetchFirstWorkingJson(paths) {
        for (const path of paths) {
          const normalized = normalizeFlashcardsDataPath(path);
          if (!normalized) continue;
          try {
            const response = await fetch(withNoCacheUrl(normalized), { cache: 'no-store' });
            if (response.ok) {
              const data = await response.json();
              return { data, response };
            }
          } catch (_error) {
            // try next
          }
        }
        throw new Error('Nao consegui abrir o manifesto dos flashcards.');
      }

      async function fetchRemoteManifestOrEmpty(path) {
        const normalized = normalizeFlashcardsDataPath(path);
        if (!normalized) {
          return {
            data: { generatedAt: new Date().toISOString(), files: [] },
            response: null
          };
        }
        try {
          const response = await fetch(withNoCacheUrl(normalized), { cache: 'no-store' });
          if (response.ok) {
            const data = await response.json();
            return { data, response };
          }
          if (response.status === 404) {
            return {
              data: { generatedAt: new Date().toISOString(), files: [] },
              response
            };
          }
        } catch (_error) {
          // fall through
        }
        throw new Error('Nao consegui abrir o manifesto dos flashcards.');
      }

      async function refreshCardsFromNetwork() {
        const manifestPayload = await fetchRemoteManifestOrEmpty(DATA_MANIFEST_REMOTE_PATH);
        const manifest = manifestPayload?.data || {};
        const serverDateHeader = manifestPayload?.response?.headers?.get('date') || '';
        const serverNow = Date.parse(serverDateHeader) || Date.parse(String(manifest?.generatedAt || '')) || 0;
        if (serverNow) {
          state.timeOffsetMs = serverNow - Date.now();
          saveTimeOffsetMs();
        }
        const manifestFiles = Array.isArray(manifest?.files) ? manifest.files : [];
        if (!manifestFiles.length) {
          throw new Error(`A pasta ${FLASHCARDS_LOCAL_SOURCE_PREFIX} nao possui decks publicados.`);
        }
        const files = manifestFiles.map((file) => {
          const resolvedPath = resolveManifestDeckPath(file);
          const sourceKey = safeText(file?.source || file?.name || resolvedPath) || resolvedPath;
          return {
            name: file.name || file.path || file.source || resolvedPath,
            title: file.title || '',
            path: resolvedPath,
            sourceKey,
            idSource: sourceKey,
            count: file.count
          };
        });
        const responses = await Promise.all(files.map(async (file) => {
          const filePath = normalizeFlashcardsDataPath(file.path);
          if (!filePath) {
            throw new Error(`O deck "${safeText(file?.name) || 'deck.json'}" nao possui URL valida no manifesto.`);
          }
          const response = await fetch(withNoCacheUrl(filePath), { cache: 'no-store' });
          if (!response.ok) {
            throw new Error(`Nao consegui abrir o deck "${safeText(file?.name) || 'deck.json'}" em ${FLASHCARDS_LOCAL_SOURCE_PREFIX}.`);
          }
          const payload = await response.json();
          const cards = flattenPayload(file.name || file.path, payload, {
            sourceKey: file.sourceKey,
            idSource: file.idSource
          });
          return {
            cards,
            deck: buildDeckCatalogEntry(file, payload, cards)
          };
        }));
        return {
          cards: responses.flatMap((entry) => Array.isArray(entry?.cards) ? entry.cards : []),
          deckCatalog: sortDeckCatalogEntries(
            responses
              .map((entry) => entry?.deck)
              .filter((deck) => safeText(deck?.source))
          )
        };
      }

      async function loadCards() {
        const freshPayload = await refreshCardsFromNetwork();
        state.allCards = Array.isArray(freshPayload?.cards) ? freshPayload.cards : [];
        state.deckCatalog = Array.isArray(freshPayload?.deckCatalog) ? freshPayload.deckCatalog : [];
        await refreshAdminDecks();
        await refreshAdminReportSummary();
        saveCachedCards(state.allCards);
      }

      function renderMetrics() {
        const userCount = accessibleFlashcardsCount();
        const metrics = [
          { label: isAdminUser() ? 'Flashcards liberados' : 'Meus flashcards', value: userCount },
          { label: 'Tempo jogado', value: formatDuration(state.stats.playTimeMs) },
          { label: 'Speakings', value: state.stats.speakings },
          { label: 'Listenings', value: state.stats.listenings }
        ];

        els.metrics.innerHTML = metrics.map(metric => `
          <div class="metric">
            <span>${escapeHtml(metric.label)}</span>
            <strong>${escapeHtml(metric.value)}</strong>
          </div>
        `).join('');
      }

      function renderMiniCards(target, cards, emptyCopy) {
        if (!cards.length) {
          target.innerHTML = `<div class="empty">${escapeHtml(emptyCopy)}</div>`;
          return;
        }

        const adminMode = isAdminUser() && Boolean(els.adminTools);
        target.innerHTML = cards.map(card => `
          <article class="mini-card" data-card-id="${escapeHtml(card.id)}">
            <div class="mini-card__image" ${adminMode ? `data-admin-image="${escapeHtml(card.id)}"` : ''}>
              ${safeText(card.imageDisplayUrl || card.imageUrl)
                ? `<img src="${escapeHtml(card.imageDisplayUrl || card.imageUrl)}" alt="${escapeHtml(card.english || card.portuguese || card.deckTitle)}" style="${escapeHtml(card.imageStyle || '')}">`
                : (card.imageFallbackMarkup || `<div class="mini-card__fallback">${escapeHtml(card.deckTitle)}</div>`)}
              ${card.sealMarkup || ''}
              ${card.loaderMarkup || ''}
            </div>
            ${card.wordMarkup || `<p class="mini-card__word">${escapeHtml(card.displayEnglish || card.english || card.portuguese || card.deckTitle)}</p>`}
            ${card.subwordMarkup || `<p class="mini-card__subword">${escapeHtml(card.displayPortuguese || card.portuguese || '')}</p>`}
            ${card.reportsMarkup || ''}
            ${card.progressMarkup || ''}
          </article>
        `).join('');
        if (adminMode) {
          Array.from(target.querySelectorAll('[data-admin-image]')).forEach((node) => {
            node.addEventListener('click', () => {
              const card = cardById(node.getAttribute('data-admin-image'));
              openAdminCardPopover(card);
            });
          });
          Array.from(target.querySelectorAll('[data-admin-audio]')).forEach((node) => {
            node.addEventListener('click', (event) => {
              event.preventDefault();
              event.stopPropagation();
              const card = cardById(node.getAttribute('data-admin-audio'));
              playAdminCardAudio(card);
            });
          });
          Array.from(target.querySelectorAll('[data-admin-edit-field]')).forEach((node) => {
            node.addEventListener('keydown', (event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                node.blur();
              }
            });
            node.addEventListener('blur', async () => {
              const cardId = node.getAttribute('data-card-id');
              const field = node.getAttribute('data-admin-edit-field');
              const nextValue = clampAdminEditableText(node.textContent);
              const originalValue = safeText(node.getAttribute('data-original-value'));
              if (!cardId || !field || nextValue === originalValue) {
                node.textContent = nextValue || (field === 'english' ? 'Ingles' : 'Portugues');
                return;
              }
              try {
                node.setAttribute('data-original-value', nextValue);
                stageAdminCardDraft(cardId, field === 'english' ? { english: nextValue } : { portuguese: nextValue });
                refreshLibrary();
                syncAdminTools();
              } catch (_error) {
                node.textContent = originalValue || (field === 'english' ? 'Ingles' : 'Portugues');
              }
            });
          });
        }
      }

      function buildLibraryCardView(card) {
        const record = card.progress;
        const percent = progressPercent(record);
        const memorizing = record.status === 'memorizing';
        const displayedSeal = activeSealPhase(record);
        const sealMarkup = displayedSeal
          ? `<img class="mini-card__seal" src="${escapeHtml(phaseMeta(displayedSeal).sealPath)}" alt="${escapeHtml(phaseMeta(displayedSeal).label)}">`
          : '';
        const progressMarkup = memorizing
          ? `<div class="mini-card__progress" aria-hidden="true"><span style="width:${escapeHtml(percent.toFixed(2))}%"></span></div>`
          : '';
        const loaderMarkup = memorizing
          ? '<div class="mini-card__loader" aria-hidden="true"><span></span><span></span><span></span><span></span></div>'
          : '';
        const blurPx = memorizing ? (7 * (1 - (percent / 100))) : 0;
        return {
          ...card,
          displayEnglish: memorizing ? 'Memorizing' : (card.english || card.portuguese || card.deckTitle),
          displayPortuguese: memorizing ? `${percent.toFixed(2)}%` : (card.portuguese || ''),
          imageStyle: `filter: blur(${blurPx.toFixed(2)}px);`,
          loaderMarkup,
          progressMarkup,
          sealMarkup
        };
      }

      function buildAdminLibraryCardView(card) {
        const isEmptySlot = !hasPlayableFlashcardImage(card);
        const sealOpacity = card.audioUrl ? 1 : (isEmptySlot ? 0.3 : 0.2);
        const sealMarkup = `<button class="mini-card__seal-btn" type="button" data-admin-audio="${escapeHtml(card.id)}" aria-label="Ouvir audio do flashcard" ${card.audioUrl ? '' : 'disabled'}><img class="mini-card__seal" src="${escapeHtml(phaseMeta(5).sealPath)}" alt="${escapeHtml(phaseMeta(5).label)}" style="--seal-opacity:${escapeHtml(String(sealOpacity))}"></button>`;
        const reportCounts = state.admin.reportCounts.get(card.id) || {};
        const reportsMarkup = FLASHCARD_REPORT_TYPES
          .filter((item) => Number(reportCounts?.[item.key] || 0) > 0)
          .map((item) => `<span class="mini-card__report-chip">${escapeHtml(item.label)} (${escapeHtml(String(reportCounts[item.key]))})</span>`)
          .join('');
        return {
          ...card,
          progress: adminReadyProgressRecord(card.id),
          displayEnglish: card.english || card.portuguese || card.deckTitle,
          displayPortuguese: card.portuguese || '',
          imageDisplayUrl: adminCardDisplayImageUrl(card),
          imageStyle: '',
          loaderMarkup: '',
          progressMarkup: '',
          sealMarkup,
          reportsMarkup: reportsMarkup ? `<div class="mini-card__reports">${reportsMarkup}</div>` : '',
          imageFallbackMarkup: `<div class="mini-card__fallback">${escapeHtml(card.deckTitle)}</div>`,
          wordMarkup: `<div class="mini-card__empty-field mini-card__editable" contenteditable="plaintext-only" spellcheck="false" data-card-id="${escapeHtml(card.id)}" data-admin-edit-field="portuguese" data-original-value="${escapeHtml(card.portuguese || '')}">${escapeHtml(card.portuguese || 'Portugues')}</div>`,
          subwordMarkup: `<div class="mini-card__empty-field mini-card__editable" contenteditable="plaintext-only" spellcheck="false" data-card-id="${escapeHtml(card.id)}" data-admin-edit-field="english" data-original-value="${escapeHtml(card.english || '')}">${escapeHtml(card.english || 'Ingles')}</div>`
        };
      }

      function clampAdminEditableText(value, maxChars = 32) {
        const clean = safeText(value).replace(/\s+/g, ' ').trim();
        if (!clean) return '';
        if (clean.length <= maxChars) return clean;
        const sliced = clean.slice(0, maxChars).trim();
        const lastSpace = sliced.lastIndexOf(' ');
        if (lastSpace >= Math.max(4, Math.floor(maxChars * 0.55))) {
          return sliced.slice(0, lastSpace).trim();
        }
        return sliced;
      }

      function adminHasPendingChanges() {
        return state.admin.draftCards.size > 0 || state.admin.pendingNewCards.length > 0;
      }

      function createAdminDraftCard(source, deckTitle, category) {
        const randomKey = Math.random().toString(36).slice(2, 8);
        return {
          id: `draft-${Date.now()}-${randomKey}`,
          source: safeText(source),
          sourceIndex: -1,
          deckTitle: safeText(deckTitle) || 'Deck',
          imageUrl: FLASHCARD_CAMERA_IMAGE_URL,
          english: '',
          portuguese: '',
          audioUrl: '',
          category: safeText(category) || safeText(deckTitle) || 'flashcard',
          isDraftNew: true
        };
      }

      function buildAdminDraftCard(card) {
        const draft = state.admin.draftCards.get(card.id);
        if (!draft) return { ...card };
        return {
          ...card,
          portuguese: typeof draft.portuguese === 'string' ? draft.portuguese : card.portuguese,
          english: typeof draft.english === 'string' ? draft.english : card.english
        };
      }

      function currentAdminDraftAwarePageCards() {
        return currentLibrarySourceCards().map((card) => ({ ...card }));
      }

      function stageAdminCardDraft(cardId, patch = {}) {
        const pendingCardIndex = state.admin.pendingNewCards.findIndex((card) => card.id === cardId);
        if (pendingCardIndex >= 0) {
          const current = state.admin.pendingNewCards[pendingCardIndex];
          state.admin.pendingNewCards[pendingCardIndex] = {
            ...current,
            ...(Object.prototype.hasOwnProperty.call(patch, 'portuguese') ? { portuguese: clampAdminEditableText(patch.portuguese) } : {}),
            ...(Object.prototype.hasOwnProperty.call(patch, 'english') ? { english: clampAdminEditableText(patch.english) } : {})
          };
          return;
        }

        const current = state.admin.draftCards.get(cardId) || {};
        state.admin.draftCards.set(cardId, {
          ...current,
          ...(Object.prototype.hasOwnProperty.call(patch, 'portuguese') ? { portuguese: clampAdminEditableText(patch.portuguese) } : {}),
          ...(Object.prototype.hasOwnProperty.call(patch, 'english') ? { english: clampAdminEditableText(patch.english) } : {})
        });
      }

      function collectAdminEmptyTextSlotsFromCurrentPage() {
        const slots = [];
        currentAdminDraftAwarePageCards().forEach((card) => {
          if (!safeText(card?.portuguese)) {
            slots.push({ cardId: card.id, field: 'portuguese' });
          }
          if (!safeText(card?.english)) {
            slots.push({ cardId: card.id, field: 'english' });
          }
        });
        return slots;
      }

      function clampLibraryPage(page, totalCards) {
        const pageCount = Math.max(1, Math.ceil(Math.max(0, totalCards) / FLASHCARDS_PAGE_SIZE));
        return Math.max(1, Math.min(pageCount, Number.parseInt(page, 10) || 1));
      }

      function renderLibraryPagination(totalCards) {
        if (!els.libraryPagination || !els.libraryPageInfo || !els.libraryPrevBtn || !els.libraryNextBtn) {
          return;
        }
        const pageCount = Math.max(1, Math.ceil(Math.max(0, totalCards) / FLASHCARDS_PAGE_SIZE));
        const hasPagination = totalCards > FLASHCARDS_PAGE_SIZE;
        state.libraryPage = clampLibraryPage(state.libraryPage, totalCards);
        els.libraryPagination.hidden = !hasPagination;
        els.libraryPageInfo.textContent = totalCards
          ? `Pagina ${state.libraryPage} de ${pageCount}`
          : '0';
        els.libraryPrevBtn.disabled = !hasPagination || state.libraryPage <= 1;
        els.libraryNextBtn.disabled = !hasPagination || state.libraryPage >= pageCount;
      }

      function currentLibraryPageSlice(cards) {
        state.libraryPage = clampLibraryPage(state.libraryPage, cards.length);
        const startIndex = (state.libraryPage - 1) * FLASHCARDS_PAGE_SIZE;
        return cards.slice(startIndex, startIndex + FLASHCARDS_PAGE_SIZE);
      }

      function adminDeckOptions() {
        return Array.isArray(state.admin.decks) ? state.admin.decks.slice() : [];
      }

      function adminEditableSource(card) {
        return safeText(card?.adminSource || card?.source);
      }

      function normalizeDeckTitleKey(value) {
        return normalizeText(value).toLocaleLowerCase('pt-BR');
      }

      function reconcileAdminCardSources() {
        const decks = adminDeckOptions();
        if (!decks.length || !Array.isArray(state.allCards) || !state.allCards.length) {
          return;
        }
        const titleToSource = new Map();
        decks.forEach((deck) => {
          const titleKey = normalizeDeckTitleKey(deck?.title);
          const source = safeText(deck?.source);
          if (!titleKey || !source) return;
          if (titleToSource.has(titleKey) && titleToSource.get(titleKey) !== source) {
            titleToSource.set(titleKey, '');
            return;
          }
          titleToSource.set(titleKey, source);
        });
        state.allCards = state.allCards.map((card) => {
          const titleKey = normalizeDeckTitleKey(card?.deckTitle);
          const matchedSource = titleToSource.get(titleKey);
          if (!matchedSource) {
            return { ...card };
          }
          return {
            ...card,
            adminSource: matchedSource
          };
        });
      }

      function selectedAdminDeckMeta() {
        const selectedSource = safeText(state.admin.selectedDeckSource);
        if (!selectedSource) return null;
        return adminDeckOptions().find((deck) => deck.source === selectedSource) || null;
      }

      function syncAdminDeckSelect() {
        if (!els.adminDeckSelect) return;
        const options = adminDeckOptions();
        if (state.admin.selectedDeckSource && !options.some((deck) => deck.source === state.admin.selectedDeckSource)) {
          state.admin.selectedDeckSource = '';
        }
        const currentValue = safeText(state.admin.selectedDeckSource);
        const rendered = ['<option value="">Todos os decks</option>']
          .concat(options.map((deck) => (
            `<option value="${escapeHtml(deck.source)}">${escapeHtml(`${deck.title} (${deck.count})`)}</option>`
          )));
        els.adminDeckSelect.innerHTML = rendered.join('');
        els.adminDeckSelect.value = currentValue;
      }

      function currentAdminDeckCards() {
        const selectedSource = safeText(state.admin.selectedDeckSource);
        const reportFilter = safeText(state.admin.reportFilter);
        let cards = !selectedSource
          ? state.allCards.slice()
          : state.allCards.filter((card) => adminEditableSource(card) === selectedSource);
        cards = cards.map(buildAdminDraftCard);
        const pendingCards = !selectedSource
          ? state.admin.pendingNewCards.slice()
          : state.admin.pendingNewCards.filter((card) => adminEditableSource(card) === selectedSource);
        cards = cards.concat(pendingCards.map((card) => ({ ...card })));
        if (reportFilter) {
          cards = cards.filter((card) => Number(state.admin.reportCounts.get(card.id)?.[reportFilter] || 0) > 0);
        }
        return cards;
      }

      function syncAdminReportFilter() {
        if (!els.adminReportFilter) return;
        const currentValue = safeText(state.admin.reportFilter);
        const options = ['<option value="">Todas as marcacoes</option>']
          .concat(FLASHCARD_REPORT_TYPES.map((item) => `<option value="${escapeHtml(item.key)}">${escapeHtml(item.label)}</option>`));
        els.adminReportFilter.innerHTML = options.join('');
        els.adminReportFilter.value = currentValue;
      }

      async function refreshAdminReportSummary() {
        if (!isAdminUser()) {
          state.admin.reportCounts = new Map();
          syncAdminReportFilter();
          return;
        }
        try {
          const response = await fetch(buildApiUrl('/api/admin/flashcards/reports-summary'), {
            headers: buildAuthHeaders(),
            cache: 'no-store'
          });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok || !payload?.success) {
            throw new Error(payload?.message || 'Falha ao carregar reports.');
          }
          state.admin.reportCounts = new Map(
            Object.entries(payload?.reportsByCard || {}).map(([cardId, counts]) => [cardId, counts || {}])
          );
        } catch (_error) {
          state.admin.reportCounts = new Map();
        }
        syncAdminReportFilter();
      }

      async function refreshAdminDecks() {
        if (!isAdminUser()) {
          state.admin.decks = [];
          syncAdminDeckSelect();
          return;
        }
        try {
          const response = await fetch(buildApiUrl('/api/admin/flashcards/decks'), {
            headers: buildAuthHeaders(),
            cache: 'no-store'
          });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok || !payload?.success) {
            throw new Error(payload?.message || 'Falha ao carregar decks.');
          }
          state.admin.decks = Array.isArray(payload?.decks) ? payload.decks : [];
        } catch (_error) {
          state.admin.decks = [];
        }
        reconcileAdminCardSources();
        syncAdminDeckSelect();
      }

      function currentLibrarySourceCards() {
        const cards = isAdminUser()
          ? currentAdminDeckCards()
          : userProgressCards().map(card => ({ ...card }));
        return currentLibraryPageSlice(cards);
      }

      function setAdminToolsStatus(message, isError = false) {
        state.admin.status = message || 'Nenhuma acao em andamento.';
        state.admin.error = Boolean(isError);
        if (els.adminToolsStatus) {
          els.adminToolsStatus.textContent = state.admin.status;
          els.adminToolsStatus.classList.toggle('is-error', state.admin.error);
        }
      }

      function renderAdminPublishBar() {
        const publishState = state.admin.publish;
        if (!els.adminPublishBar || !publishState) return;
        els.adminPublishBar.hidden = !publishState.visible;
        els.adminPublishBar.classList.toggle('is-error', Boolean(publishState.error));
        if (els.adminPublishTitle) {
          els.adminPublishTitle.textContent = publishState.title || 'Publicando deck';
        }
        if (els.adminPublishPercent) {
          els.adminPublishPercent.textContent = `${Math.max(0, Math.min(100, Math.round(Number(publishState.percent) || 0)))}%`;
        }
        if (els.adminPublishFill) {
          els.adminPublishFill.style.width = `${Math.max(0, Math.min(100, Number(publishState.percent) || 0))}%`;
        }
        if (els.adminPublishCopy) {
          els.adminPublishCopy.textContent = publishState.message || 'Preparando...';
        }
      }

      function setAdminPublishBar({ visible, title, message, percent, error } = {}) {
        const publishState = state.admin.publish;
        if (!publishState) return;
        if (publishState.timer) {
          window.clearTimeout(publishState.timer);
          publishState.timer = 0;
        }
        if (typeof visible === 'boolean') publishState.visible = visible;
        if (typeof title === 'string') publishState.title = title;
        if (typeof message === 'string') publishState.message = message;
        if (typeof percent === 'number') publishState.percent = Math.max(0, Math.min(100, percent));
        if (typeof error === 'boolean') publishState.error = error;
        renderAdminPublishBar();
      }

      function hideAdminPublishBar(delayMs = 0) {
        const publishState = state.admin.publish;
        if (!publishState) return;
        if (publishState.timer) {
          window.clearTimeout(publishState.timer);
          publishState.timer = 0;
        }
        const hideNow = () => {
          publishState.visible = false;
          publishState.error = false;
          publishState.percent = 0;
          publishState.title = 'Publicando deck';
          publishState.message = 'Preparando...';
          renderAdminPublishBar();
        };
        if (delayMs > 0) {
          publishState.timer = window.setTimeout(hideNow, delayMs);
          return;
        }
        hideNow();
      }

      function closeAdminCardPopover() {
        state.admin.activeCardId = '';
        if (els.adminCardPopover) {
          els.adminCardPopover.classList.remove('is-visible');
          els.adminCardPopover.setAttribute('aria-hidden', 'true');
        }
      }

      function openAdminCardPopover(card) {
        if (!isAdminUser() || !card || !els.adminCardPopover) return;
        state.admin.activeCardId = card.id;
        if (els.adminCardPopoverTitle) {
          els.adminCardPopoverTitle.textContent = `Acoes do flashcard ${card.deckTitle || card.english || card.portuguese || card.id}`;
        }
        els.adminCardPopover.classList.add('is-visible');
        els.adminCardPopover.setAttribute('aria-hidden', 'false');
      }

      function syncAdminTools() {
        const adminMode = isAdminUser();
        if (els.adminTools) {
          els.adminTools.hidden = !adminMode;
        }
        if (!adminMode) {
          state.admin.busy = false;
          state.admin.error = false;
          state.admin.status = 'Nenhuma acao em andamento.';
          state.admin.reportFilter = '';
          state.admin.reportCounts = new Map();
        }
        if (els.adminPromptInput) {
          els.adminPromptInput.value = state.admin.prompt || '';
          els.adminPromptInput.disabled = state.admin.busy || !adminMode;
        }
        if (els.adminPasteInput) {
          els.adminPasteInput.disabled = state.admin.busy || !adminMode;
        }
        syncAdminDeckSelect();
        syncAdminReportFilter();
        if (els.adminDeckSelect) {
          els.adminDeckSelect.disabled = state.admin.busy || !adminMode;
        }
        if (els.adminReportFilter) {
          els.adminReportFilter.disabled = state.admin.busy || !adminMode;
        }
        if (els.adminCreateDeckBtn) {
          els.adminCreateDeckBtn.disabled = state.admin.busy || !adminMode;
          els.adminCreateDeckBtn.textContent = state.admin.busy ? 'Processando...' : 'Novo deck vazio';
        }
        if (els.adminSaveBtn) {
          els.adminSaveBtn.disabled = state.admin.busy || !adminMode || !adminHasPendingChanges();
          els.adminSaveBtn.textContent = state.admin.busy ? 'Salvando...' : 'Salvar';
        }
        if (els.adminFillTextBtn) {
          els.adminFillTextBtn.disabled = state.admin.busy || !adminMode;
          els.adminFillTextBtn.textContent = state.admin.busy ? 'Processando...' : 'Preencher texto';
        }
        if (els.adminPasteTextBtn) {
          els.adminPasteTextBtn.disabled = state.admin.busy || !adminMode;
          els.adminPasteTextBtn.textContent = state.admin.busy ? 'Processando...' : 'Colar texto';
        }
        if (els.adminSubmitPasteBtn) {
          els.adminSubmitPasteBtn.disabled = state.admin.busy || !adminMode;
          els.adminSubmitPasteBtn.textContent = state.admin.busy ? 'Enviando...' : 'Enviar';
        }
        if (els.adminCreateCardsBtn) {
          els.adminCreateCardsBtn.disabled = state.admin.busy || !adminMode || !safeText(state.admin.selectedDeckSource);
          els.adminCreateCardsBtn.textContent = state.admin.busy ? 'Processando...' : 'Criar cartas';
        }
        if (els.adminFillImageBtn) {
          els.adminFillImageBtn.disabled = state.admin.busy || !adminMode;
          els.adminFillImageBtn.textContent = state.admin.busy ? 'Processando...' : 'Preencher imagem';
        }
        if (els.adminMagicBtn) {
          els.adminMagicBtn.disabled = state.admin.busy || !adminMode;
          const magicLabel = els.adminMagicBtn.querySelector('.btn__label');
          if (magicLabel) {
            magicLabel.textContent = state.admin.busy ? 'Processando...' : 'Magic';
          }
        }
        if (els.adminFillAudioBtn) {
          els.adminFillAudioBtn.disabled = state.admin.busy || !adminMode;
          els.adminFillAudioBtn.textContent = state.admin.busy ? 'Processando...' : 'Preencher audio';
        }
        setAdminToolsStatus(state.admin.status, state.admin.error);
      }

      async function reloadCardsFromNetwork() {
        const freshPayload = await refreshCardsFromNetwork();
        state.allCards = Array.isArray(freshPayload?.cards) ? freshPayload.cards : [];
        state.deckCatalog = Array.isArray(freshPayload?.deckCatalog) ? freshPayload.deckCatalog : [];
        await refreshAdminDecks();
        await refreshAdminReportSummary();
        saveCachedCards(state.allCards);
        refreshLibrary();
      }

      async function reloadCardsFromNetworkWithRetry(maxAttempts = 5, delayMs = 900) {
        let lastError = null;
        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
          try {
            await reloadCardsFromNetwork();
            return true;
          } catch (error) {
            lastError = error;
            if (attempt < maxAttempts) {
              await wait(delayMs);
            }
          }
        }
        throw lastError || new Error('Nao consegui abrir o manifesto dos flashcards.');
      }

      async function tryRefreshPublishedFlashcards(options = {}) {
        try {
          await reloadCardsFromNetworkWithRetry(
            Number.isInteger(options.maxAttempts) ? options.maxAttempts : 5,
            Number.isFinite(options.delayMs) ? options.delayMs : 900
          );
          return true;
        } catch (_error) {
          return false;
        }
      }

      function currentVisibleAdminCards() {
        if (!isAdminUser()) {
          return currentLibrarySourceCards();
        }
        const cards = currentLibraryPageSlice(currentAdminDeckCards());
        const seen = new Set();
        return cards.filter((card) => {
          const cardId = safeText(card?.id);
          if (!cardId || seen.has(cardId)) return false;
          seen.add(cardId);
          return true;
        });
      }

      function collectAdminCurrentPageTargets(kind) {
        return currentVisibleAdminCards().filter((card) => {
          if (kind === 'text') {
            return !safeText(card?.english) || !safeText(card?.portuguese);
          }
          if (kind === 'image') {
            return !hasPlayableFlashcardImage(card) && safeText(card?.english) && safeText(card?.portuguese);
          }
          if (kind === 'magic') {
            return isAdminMagicImageSlot(card) && safeText(card?.english) && safeText(card?.portuguese);
          }
          if (kind === 'audio') {
            return !safeText(card?.audioUrl);
          }
          return false;
        });
      }

      async function postAdminFlashcardAction(endpoint, body) {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        let payload = null;
        try {
          payload = await response.json();
        } catch (_error) {
          payload = null;
        }
        if (!response.ok) {
          throw new Error(payload?.instructions || payload?.details || payload?.error || 'Falha ao executar a acao do admin.');
        }
        return payload || {};
      }

      async function runAdminPublishRequest(endpoint, body, options = {}) {
        const title = options.title || 'Publicando deck';
        const waitingMessage = options.waitingMessage || 'Enviando arquivos para o servidor e para o R2...';
        setAdminPublishBar({
          visible: true,
          title,
          message: options.startMessage || 'Preparando publicacao...',
          percent: 12,
          error: false
        });

        const rampTargets = [24, 39, 57, 72, 84];
        let rampIndex = 0;
        const rampTimer = window.setInterval(() => {
          if (rampIndex >= rampTargets.length) {
            window.clearInterval(rampTimer);
            return;
          }
          setAdminPublishBar({
            visible: true,
            title,
            message: waitingMessage,
            percent: rampTargets[rampIndex],
            error: false
          });
          rampIndex += 1;
        }, 420);

        try {
          const payload = await postAdminFlashcardAction(endpoint, body);
          window.clearInterval(rampTimer);
          const publishedCount = Array.isArray(payload?.publishedDecks) ? payload.publishedDecks.length : 0;
          setAdminPublishBar({
            visible: true,
            title,
            message: publishedCount
              ? `${publishedCount} deck(s) atualizado(s) no R2.`
              : (options.successMessage || 'Publicacao concluida.'),
            percent: 100,
            error: false
          });
          hideAdminPublishBar(2200);
          return payload;
        } catch (error) {
          window.clearInterval(rampTimer);
          setAdminPublishBar({
            visible: true,
            title,
            message: error.message || 'Falha ao publicar no R2.',
            percent: 100,
            error: true
          });
          hideAdminPublishBar(3400);
          throw error;
        }
      }

      async function updateAdminCardText(cardId, field, value) {
        const card = cardById(cardId);
        if (!card) return;
        const nextValue = clampAdminEditableText(value);
        const payload = {
          source: adminEditableSource(card),
          sourceIndex: card.sourceIndex
        };
        if (field === 'english') {
          payload.english = nextValue;
        } else {
          payload.portuguese = nextValue;
        }
        await postAdminFlashcardAction('/api/admin/flashcards/update-card', payload);
      }

      async function runAdminSaveDrafts() {
        if (!isAdminUser() || state.admin.busy || !adminHasPendingChanges()) return null;

        const updates = Array.from(state.admin.draftCards.entries()).map(([cardId, draft]) => {
          const card = state.allCards.find((entry) => entry.id === cardId);
          if (!card) return null;
          return {
            source: adminEditableSource(card),
            sourceIndex: card.sourceIndex,
            portuguese: typeof draft.portuguese === 'string' ? draft.portuguese : card.portuguese,
            english: typeof draft.english === 'string' ? draft.english : card.english
          };
        }).filter(Boolean);

        const newCards = state.admin.pendingNewCards.map((card) => ({
          source: card.source,
          deckTitle: card.deckTitle,
          category: card.category,
          imageUrl: card.imageUrl,
          portuguese: card.portuguese,
          english: card.english
        }));

        state.admin.busy = true;
        state.admin.error = false;
        state.admin.status = 'Salvando alteracoes do admin...';
        syncAdminTools();

        try {
          const payload = await runAdminPublishRequest('/api/admin/flashcards/save-drafts', {
            updates,
            newCards
          }, {
            title: 'Salvando deck',
            startMessage: 'Salvando textos e cartas novas...',
            waitingMessage: 'Subindo deck, imagens e audios para o R2...'
          });
          state.admin.draftCards = new Map();
          state.admin.pendingNewCards = [];
          const refreshed = await tryRefreshPublishedFlashcards();
          const updatedCount = Number(payload?.updatedCount) || 0;
          const createdCount = Number(payload?.createdCount) || 0;
          state.admin.status = createdCount || updatedCount
            ? (refreshed
              ? `Salvo. ${createdCount} carta(s) nova(s) e ${updatedCount} alteracao(oes) publicadas.`
              : `Salvo. ${createdCount} carta(s) nova(s) e ${updatedCount} alteracao(oes) publicadas. A lista pode levar alguns segundos para atualizar.`)
            : 'Nenhuma alteracao pendente para salvar.';
          state.admin.error = false;
          return payload;
        } catch (error) {
          state.admin.status = error.message || 'Falha ao salvar as alteracoes.';
          state.admin.error = true;
          return null;
        } finally {
          state.admin.busy = false;
          syncAdminTools();
        }
      }

      async function runAdminCreateDeck() {
        if (!isAdminUser() || state.admin.busy) return;

        const typedDeckName = window.prompt('Nome do novo deck vazio:', '');
        if (typedDeckName === null) return;
        const deckTitle = safeText(typedDeckName);
        if (!deckTitle) {
          setAdminToolsStatus('Digite um nome para o novo deck.', true);
          syncAdminTools();
          return;
        }

        state.admin.busy = true;
        state.admin.error = false;
        state.admin.status = `Criando o deck "${deckTitle}"...`;
        syncAdminTools();

        try {
          const payload = await runAdminPublishRequest('/api/admin/flashcards/create-deck', {
            deckTitle,
            slotCount: 0
          }, {
            title: 'Criando deck vazio',
            startMessage: `Criando "${deckTitle}" no servidor...`,
            waitingMessage: `Publicando "${deckTitle}" no R2...`,
            successMessage: `Deck "${deckTitle}" criado.`
          });
          const refreshed = await tryRefreshPublishedFlashcards();
          if (!refreshed) {
            state.admin.decks = [
              ...state.admin.decks.filter((deck) => safeText(deck?.source) !== safeText(payload?.source)),
              {
                source: safeText(payload?.source),
                title: safeText(payload?.title) || deckTitle,
                coverImage: safeText(payload?.coverImage),
                count: 0
              }
            ].sort((left, right) => safeText(left?.title).localeCompare(safeText(right?.title), 'pt-BR', {
              sensitivity: 'base',
              numeric: true
            }));
            syncAdminDeckSelect();
          }
          state.admin.selectedDeckSource = safeText(payload?.source);
          state.libraryPage = 1;
          refreshLibrary();
          state.admin.status = refreshed
            ? `Deck "${deckTitle}" criado e publicado no R2.`
            : `Deck "${deckTitle}" criado e publicado no R2. A lista pode levar alguns segundos para atualizar.`;
          state.admin.error = false;
        } catch (error) {
          state.admin.status = error.message || 'Falha ao criar o deck vazio.';
          state.admin.error = true;
        } finally {
          state.admin.busy = false;
          syncAdminTools();
        }
      }

      function runAdminPasteText() {
        if (!isAdminUser() || state.admin.busy) return;
        const pasted = String(els.adminPasteInput?.value || '');
        const lines = pasted
          .split(/\r?\n/)
          .map((line) => clampAdminEditableText(line))
          .filter(Boolean);

        if (!lines.length) {
          setAdminToolsStatus('Cole pelo menos uma linha de texto.', true);
          syncAdminTools();
          return;
        }

        const emptySlots = collectAdminEmptyTextSlotsFromCurrentPage();
        if (!emptySlots.length) {
          setAdminToolsStatus('Nao ha campos de texto vazios na pagina atual.', false);
          syncAdminTools();
          return;
        }

        let appliedCount = 0;
        for (let index = 0; index < emptySlots.length && index < lines.length; index += 1) {
          const slot = emptySlots[index];
          const line = lines[index];
          if (!slot || !line) continue;
          stageAdminCardDraft(
            slot.cardId,
            slot.field === 'portuguese' ? { portuguese: line } : { english: line }
          );
          appliedCount += 1;
        }

        refreshLibrary();
        setAdminToolsStatus(
          appliedCount
            ? `${appliedCount} campo(s) vazio(s) preenchido(s) no rascunho. Clique em Salvar para publicar.`
            : 'Nenhuma linha foi aplicada.'
        );
        syncAdminTools();
      }

      async function runAdminCreateCards() {
        if (!isAdminUser() || state.admin.busy) return;
        const selectedDeck = selectedAdminDeckMeta();
        if (!selectedDeck?.source) {
          setAdminToolsStatus('Selecione um deck antes de criar cartas.', true);
          syncAdminTools();
          return;
        }

        const typed = window.prompt(`Quantos containers vazios voce quer criar no deck "${selectedDeck.title}"?`, '1');
        if (typed === null) return;

        const count = Number.parseInt(String(typed).trim(), 10);
        if (!Number.isInteger(count) || count < 1 || count > 100) {
          setAdminToolsStatus('Digite um numero inteiro entre 1 e 100.', true);
          syncAdminTools();
          return;
        }

        state.admin.busy = true;
        state.admin.error = false;
        state.admin.status = `Criando ${count} container(es) vazio(s) no rascunho...`;
        syncAdminTools();

        try {
          for (let index = 0; index < count; index += 1) {
            state.admin.pendingNewCards.push(createAdminDraftCard(selectedDeck.source, selectedDeck.title, selectedDeck.title));
          }
          state.libraryPage = Math.max(1, Math.ceil(currentAdminDeckCards().length / FLASHCARDS_PAGE_SIZE));
          refreshLibrary();
          state.admin.status = `${count} container(es) vazio(s) criado(s) em rascunho. Clique em Salvar para publicar.`;
          state.admin.error = false;
        } catch (error) {
          state.admin.status = error.message || 'Falha ao criar containers vazios.';
          state.admin.error = true;
        } finally {
          state.admin.busy = false;
          syncAdminTools();
        }
      }

      function currentGameEntry() {
        return state.game.currentId ? state.game.entries.get(state.game.currentId) : null;
      }

      function currentGameCard() {
        const entry = currentGameEntry();
        return entry ? cardById(entry.id) : null;
      }

      function buildGameReportOptions() {
        if (!els.gameReportOptions) return;
        els.gameReportOptions.innerHTML = FLASHCARD_REPORT_TYPES.map((item) => `
          <button class="btn game-report-menu__option" type="button" data-report-type="${escapeHtml(item.key)}">${escapeHtml(item.label)}</button>
        `).join('');
        Array.from(els.gameReportOptions.querySelectorAll('[data-report-type]')).forEach((button) => {
          button.addEventListener('click', () => {
            submitGameReport(button.getAttribute('data-report-type'));
          });
        });
      }

      function openGameReportMenu() {
        if (state.game.tutorial.interactionLocked) return;
        if (!state.game.active || !currentGameCard() || !els.gameReportMenu) return;
        state.game.paused = true;
        cleanupGameRecognition();
        stopActiveAudio();
        els.gameCard.classList.remove('is-listening');
        els.gameVisual.classList.remove('is-mic-live');
        buildGameReportOptions();
        els.gameReportMenu.classList.add('is-visible');
      }

      function closeGameReportMenu() {
        if (!els.gameReportMenu) return;
        els.gameReportMenu.classList.remove('is-visible');
        state.game.paused = false;
      }

      async function submitGameReport(reportType) {
        const entry = currentGameEntry();
        const card = currentGameCard();
        if (!entry || !card || !reportType) return;

        try {
          const response = await fetch(buildApiUrl('/api/flashcards/report'), {
            method: 'POST',
            headers: buildAuthHeaders({
              'Content-Type': 'application/json'
            }),
            body: JSON.stringify({
              cardId: card.id,
              reportType
            })
          });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok || !payload?.success) {
            throw new Error(payload?.message || 'Falha ao reportar o flashcard.');
          }

          if (reportType === 'hide-card') {
            const activeCountBefore = state.game.entries.size;
            state.hiddenCardIds.add(card.id);
            persistHiddenCardIdsLocally();
            saveUserProgress();
            removeGameEntry(card.id);
            while (state.game.entries.size < activeCountBefore) {
              if (!refillGameEntry(entry.pool, activeCountBefore)) break;
            }
            closeGameReportMenu();
            refreshLibrary();
            advanceToNextCard();
            return;
          }

          if (isAdminUser()) {
            await refreshAdminReportSummary();
            refreshLibrary();
          }
          setGameStatus('Reporte enviado.', 'hit');
          closeGameReportMenu();
        } catch (error) {
          setGameStatus(error.message || 'Falha ao enviar reporte.', 'miss');
          closeGameReportMenu();
        }
      }

      async function runAdminCardAssetDelete(kind) {
        const card = cardById(state.admin.activeCardId);
        if (!card || state.admin.busy) return;
        if (adminHasPendingChanges()) {
          setAdminToolsStatus('Salve os rascunhos antes de apagar foto ou audio.', true);
          syncAdminTools();
          return;
        }
        state.admin.busy = true;
        state.admin.status = `Apagando ${kind === 'image' ? 'foto' : 'audio'}...`;
        state.admin.error = false;
        syncAdminTools();
        try {
          await postAdminFlashcardAction('/api/admin/flashcards/delete-asset', {
            source: adminEditableSource(card),
            sourceIndex: card.sourceIndex,
            kind
          });
          closeAdminCardPopover();
          await reloadCardsFromNetwork();
          state.admin.status = `${kind === 'image' ? 'Foto' : 'Audio'} apagado.`;
        } catch (error) {
          state.admin.status = error.message || 'Falha ao apagar asset.';
          state.admin.error = true;
        } finally {
          state.admin.busy = false;
          syncAdminTools();
        }
      }

      async function runAdminCardDelete() {
        const card = cardById(state.admin.activeCardId);
        if (!card || state.admin.busy) return;
        if (adminHasPendingChanges()) {
          setAdminToolsStatus('Salve os rascunhos antes de apagar containers.', true);
          syncAdminTools();
          return;
        }
        state.admin.busy = true;
        state.admin.status = 'Apagando container...';
        state.admin.error = false;
        syncAdminTools();
        try {
          await postAdminFlashcardAction('/api/admin/flashcards/delete-card', {
            source: adminEditableSource(card),
            sourceIndex: card.sourceIndex
          });
          closeAdminCardPopover();
          await reloadCardsFromNetwork();
          state.admin.status = 'Container apagado.';
        } catch (error) {
          state.admin.status = error.message || 'Falha ao apagar container.';
          state.admin.error = true;
        } finally {
          state.admin.busy = false;
          syncAdminTools();
        }
      }

      async function runAdminFlashcardFill(kind) {
        if (!isAdminUser() || state.admin.busy) return;
        if (kind !== 'text' && kind !== 'image' && kind !== 'magic' && adminHasPendingChanges()) {
          setAdminToolsStatus('Salve os rascunhos antes de preencher imagem ou audio.', true);
          syncAdminTools();
          return;
        }
        if (kind === 'image' && !safeText(state.admin.prompt)) {
          setAdminToolsStatus('Digite o prompt manual antes de preencher imagens.', true);
          syncAdminTools();
          return;
        }
        if ((kind === 'image' || kind === 'magic') && adminHasPendingChanges()) {
          setAdminToolsStatus('Salvando os rascunhos antes de gerar imagens...', false);
          syncAdminTools();
          const saved = await runAdminSaveDrafts();
          if (!saved || state.admin.error) {
            return;
          }
        }

        const targets = collectAdminCurrentPageTargets(kind);
        const label = kind === 'text'
          ? 'textos'
          : kind === 'image'
            ? 'imagens'
            : kind === 'magic'
              ? 'imagens magic'
              : 'audios';
        if (!targets.length) {
          if (kind === 'image') {
            const cardsMissingImage = currentVisibleAdminCards().filter((card) => !hasPlayableFlashcardImage(card));
            if (cardsMissingImage.length) {
              setAdminToolsStatus('Preencha Portugues e Ingles dos cards vazios antes de gerar imagens.', true);
              syncAdminTools();
              return;
            }
          }
          if (kind === 'magic') {
            const cardsWithCamera = currentVisibleAdminCards().filter((card) => isAdminMagicImageSlot(card));
            if (cardsWithCamera.length) {
              setAdminToolsStatus('Preencha Portugues e Ingles dos cards sem imagem real antes de usar o Magic.', true);
              syncAdminTools();
              return;
            }
            setAdminToolsStatus('Nenhum slot vazio de imagem nesta pagina para o Magic.', false);
            syncAdminTools();
            return;
          }
          setAdminToolsStatus(`Nenhum slot vazio de ${label} nesta pagina.`, false);
          syncAdminTools();
          return;
        }

        const endpoint = kind === 'text'
          ? '/api/admin/flashcards/fill-missing-text'
          : (kind === 'image' || kind === 'magic')
            ? '/api/admin/flashcards/fill-missing-images'
            : '/api/admin/flashcards/fill-missing-audio';

        state.admin.busy = true;
        state.admin.error = false;
        state.admin.status = `Preenchendo ${label} da pagina atual...`;
        syncAdminTools();

        try {
          const payload = await postAdminFlashcardAction(endpoint, {
            cards: targets.map((card) => ({
              id: card.id,
              source: adminEditableSource(card),
              sourceIndex: card.sourceIndex,
              deckTitle: card.deckTitle,
              english: card.english,
            portuguese: card.portuguese,
            category: card.category
          })),
            basePrompt: state.admin.prompt || '',
            magicMode: kind === 'magic',
            maxChars: 32,
            ...(kind === 'text' ? { persist: false } : {})
          });
          const updatedCount = Number(payload?.updatedCount) || 0;
          const failedCount = Number(payload?.failedCount) || 0;
          if (kind === 'text') {
            const updatedItems = Array.isArray(payload?.updated) ? payload.updated : [];
            updatedItems.forEach((entry) => {
              if (!entry?.id) return;
              stageAdminCardDraft(entry.id, {
                portuguese: entry.pt || '',
                english: entry.en || ''
              });
            });
            refreshLibrary();
            state.admin.status = failedCount
              ? `${updatedCount} textos preparados no rascunho. ${failedCount} falharam.`
              : `${updatedCount} textos preparados. Clique em Salvar para publicar.`;
            state.admin.error = false;
            return;
          }
          await reloadCardsFromNetwork();
          state.admin.status = failedCount
            ? `${updatedCount} ${label} preenchido(s). ${failedCount} falharam.`
            : `${updatedCount} ${label} preenchido(s) na pagina atual.`;
          state.admin.error = false;
        } catch (error) {
          state.admin.status = error.message || `Falha ao preencher ${label}.`;
          state.admin.error = true;
        } finally {
          state.admin.busy = false;
          syncAdminTools();
        }
      }

      function refreshLibrary() {
        syncAdminTheme();
        const cards = userProgressCards().map(buildLibraryCardView);
        const visibleCards = currentLibraryPageSlice(cards);
        if (els.libraryTitle) {
          els.libraryTitle.textContent = 'FlashCards';
        }
        els.allSectionCopy.textContent = String(cards.length || 0);
        renderMiniCards(
          els.allGrid,
          visibleCards,
          '0'
        );
        renderLibraryPagination(cards.length);
        renderMetrics();
        updateGameChips();
        syncGameSetupSummary();
        syncAdminTools();
        syncPremiumGateVisibility();
      }

      function renderStars(stars) {
        els.gameStars.innerHTML = '';
        for (let index = 0; index < GAME_STAR_TARGET; index += 1) {
          const star = document.createElement('img');
          star.className = `star${index < stars ? ' is-on' : ''}`;
          star.src = STAR_ICON_PATH;
          star.alt = '';
          els.gameStars.appendChild(star);
        }
      }

      function renderStarsLossState(initialStars, lostCount) {
        els.gameStars.innerHTML = '';
        const safeInitialStars = Math.max(0, Math.min(GAME_STAR_TARGET, Number(initialStars) || 0));
        const safeLostCount = Math.max(0, Math.min(safeInitialStars, Number(lostCount) || 0));
        for (let index = 0; index < GAME_STAR_TARGET; index += 1) {
          const star = document.createElement('img');
          const isEarned = index < safeInitialStars;
          const isLost = isEarned && index >= (safeInitialStars - safeLostCount);
          star.className = `star${isEarned ? ' is-on' : ''}${isLost ? ' is-lost' : ''}`;
          star.src = STAR_ICON_PATH;
          star.alt = '';
          els.gameStars.appendChild(star);
        }
      }

      function clearGameLanguageSwapTimer() {
        if (state.game.languageSwapTimer) {
          window.clearInterval(state.game.languageSwapTimer);
          state.game.languageSwapTimer = 0;
        }
        state.game.stageOneSwapShowsPortuguese = false;
      }

      function clearStageTwoHintTimer() {
        if (state.game.stageTwoHintTimer) {
          window.clearTimeout(state.game.stageTwoHintTimer);
          state.game.stageTwoHintTimer = 0;
        }
        els.gameVisual.classList.remove('is-image-ready');
        els.gameVisual.querySelector('.game-card__stage-two-hint')?.remove();
      }

      function scheduleStageTwoHintLoop(entry) {
        clearStageTwoHintTimer();
        if (!entry || entry.stage !== 2 || state.game.currentId !== entry.id) return;

        const showHint = () => {
          if (!state.game.active || state.game.currentId !== entry.id || entry.stage !== 2) {
            clearStageTwoHintTimer();
            return;
          }
          let hint = els.gameVisual.querySelector('.game-card__stage-two-hint');
          if (!hint) {
            hint = document.createElement('div');
            hint.className = 'game-card__stage-two-hint';
            hint.textContent = 'Fale portugu\u00EAs';
            els.gameVisual.appendChild(hint);
          }
          hint.classList.remove('is-visible');
          void hint.offsetWidth;
          hint.classList.add('is-visible');
          state.game.stageTwoHintTimer = window.setTimeout(() => {
            hint?.classList.remove('is-visible');
            state.game.stageTwoHintTimer = 0;
          }, STAGE_TWO_HINT_VISIBLE_MS);
        };

        const markImageReady = () => {
          if (!state.game.active || state.game.currentId !== entry.id || entry.stage !== 2) return;
          els.gameVisual.classList.add('is-image-ready');
          state.game.stageTwoHintTimer = window.setTimeout(showHint, STAGE_TWO_HINT_DELAY_MS);
        };

        const image = els.gameVisual.querySelector('img:not(.game-card__seal):not(.game-card__phase-flag)');
        if (!image) {
          markImageReady();
          return;
        }

        if (image.complete) {
          markImageReady();
          return;
        }

        const handleImageReady = () => {
          image.removeEventListener('load', handleImageReady);
          image.removeEventListener('error', handleImageReady);
          markImageReady();
        };

        image.addEventListener('load', handleImageReady, { once: true });
        image.addEventListener('error', handleImageReady, { once: true });
      }

      function hasStageTwoPortugueseOverlay(entry) {
        return Boolean(entry && entry.stage === 2 && Number(entry.stars) > 0);
      }

      function resolveGameStageConfig(entry) {
        const baseConfig = STAGES[entry?.stage] || STAGES[1];
        if (!hasStageTwoPortugueseOverlay(entry)) {
          return baseConfig;
        }
        return {
          ...baseConfig,
          overlayFlag: PORTUGUESE_ICON_PATH,
          overlayClassName: 'game-card__phase-flag--portuguese'
        };
      }

      function renderStageOneWordSwap(entry, hasSubword) {
        clearGameLanguageSwapTimer();
        if (entry.stage !== 1 || !hasSubword) return;
        state.game.stageOneSwapShowsPortuguese = entry.stars === 0;

        const applyStageOneVisibility = () => {
          const showsPortuguese = state.game.stageOneSwapShowsPortuguese;
          els.gameWord.classList.toggle('is-hidden', showsPortuguese);
          els.gameSubword.classList.toggle('is-hidden', !showsPortuguese);
          els.gameSubword.style.display = showsPortuguese ? '' : 'none';
        };

        applyStageOneVisibility();
        state.game.languageSwapTimer = window.setInterval(() => {
          if (!state.game.active || state.game.currentId !== entry.id || entry.stage !== 1) {
            clearGameLanguageSwapTimer();
            return;
          }
          state.game.stageOneSwapShowsPortuguese = !state.game.stageOneSwapShowsPortuguese;
          applyStageOneVisibility();
        }, 1500);
      }

      function renderGameTouchButton(stageConfig, entry) {
        els.gameTouchBtn.className = 'game-touch';
        els.gameTouchBtn.classList.add('is-hidden');
        els.gameTouchBtn.textContent = '';
        els.gameTouchBtn.setAttribute('aria-label', stageConfig.instruction || 'Ativar microfone');
        els.gameTouchBtn.disabled = true;
      }

      function setGameStatus(text, tone) {
        els.gameStatus.textContent = text || '';
        els.gameStatus.className = 'game-status';
        if (tone) {
          els.gameStatus.classList.add(`is-${tone}`);
        }
        if (text) {
          els.gameStatus.classList.add('is-visible');
        }
      }

      function resolveInlineMediaUrl(path) {
        const cleaned = safeText(path);
        if (!cleaned) return '';
        if (
          cleaned.startsWith('http://') ||
          cleaned.startsWith('https://') ||
          cleaned.startsWith('data:') ||
          cleaned.startsWith('blob:')
        ) {
          return cleaned;
        }
        if (cleaned.startsWith('gamesounds/') && typeof window.getGameSoundUrl === 'function') {
          return window.getGameSoundUrl(cleaned);
        }
        return new URL(cleaned.replace(/^\/+/, ''), window.location.href).toString();
      }

      function shuffleList(items) {
        return items
          .map((item) => ({ item, weight: Math.random() }))
          .sort((left, right) => left.weight - right.weight)
          .map((entry) => entry.item);
      }

      function stopActiveAudio() {
        const current = state.game.activeAudio;
        if (!current) return;
        state.game.activeAudio = null;
        if (current.type === 'audio') {
          current.instance.pause();
          current.instance.currentTime = 0;
        } else if (current.type === 'tts' && window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
      }

      function fadeOutActiveAudio(durationMs = 1000) {
        const current = state.game.activeAudio;
        if (!current) return Promise.resolve(false);
        state.game.activeAudio = null;
        if (current.type === 'audio') {
          const audio = current.instance;
          return new Promise((resolve) => {
            const startVolume = Number.isFinite(audio.volume) ? audio.volume : 1;
            const startedAt = Date.now();
            const cleanup = () => {
              if (typeof audio._softEndCleanup === 'function') {
                audio._softEndCleanup();
              }
            };
            const step = () => {
              const elapsed = Date.now() - startedAt;
              const progress = Math.max(0, Math.min(1, elapsed / Math.max(1, durationMs)));
              audio.volume = Math.max(0, startVolume * (1 - progress));
              if (progress < 1) {
                window.requestAnimationFrame(step);
                return;
              }
              audio.pause();
              try {
                audio.currentTime = 0;
              } catch (_error) {
                // ignore
              }
              audio.volume = startVolume;
              cleanup();
              resolve(true);
            };
            step();
          });
        }
        if (current.type === 'tts' && window.speechSynthesis) {
          return new Promise((resolve) => {
            window.setTimeout(() => {
              window.speechSynthesis.cancel();
              resolve(true);
            }, Math.max(0, durationMs));
          });
        }
        return Promise.resolve(false);
      }

      function cleanupGameRecognition() {
        const current = state.game.recognition;
        if (!current) return;
        state.game.recognition = null;
        try {
          if (typeof current.abort === 'function') {
            current.onresult = null;
            current.onerror = null;
            current.onend = null;
            current.abort();
          }
        } catch (_error) {
          // ignore
        }
        state.game.listening = false;
        els.gameCard.classList.remove('is-listening');
        els.gameVisual.classList.remove('is-mic-live');
      }

      function playAudioWithSoftEnd(audio, { registerAsActive = false } = {}) {
        if (!audio) return Promise.resolve(false);
        if (typeof audio._softEndCleanup === 'function') {
          audio._softEndCleanup();
        }
        audio.volume = 1;
        const shouldTrim = /\.mp3(?:$|\?)/i.test(String(audio.currentSrc || audio.src || ''));
        return new Promise((resolve) => {
          let finished = false;
          let fading = false;
          const finish = () => {
            if (finished) return;
            finished = true;
            cleanup();
            if (registerAsActive && state.game.activeAudio?.instance === audio) {
              state.game.activeAudio = null;
            }
            resolve(true);
          };
          const onEnded = () => finish();
          const onError = () => finish();
          const onTimeUpdate = () => {
            if (!shouldTrim || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
            const remainingMs = Math.max(0, (audio.duration - audio.currentTime) * 1000);
            if (!fading && remainingMs <= 500) {
              fading = true;
            }
            if (fading && remainingMs <= 250) {
              audio.volume = Math.max(0, remainingMs / 250);
            }
            if (remainingMs <= 10) {
              audio.pause();
              try {
                audio.currentTime = Math.max(0, audio.duration - 0.5);
              } catch (_error) {
                // ignore
              }
              finish();
            }
          };
          const cleanup = () => {
            audio.removeEventListener('ended', onEnded);
            audio.removeEventListener('error', onError);
            audio.removeEventListener('timeupdate', onTimeUpdate);
            audio._softEndCleanup = null;
          };
          audio._softEndCleanup = cleanup;
          audio.addEventListener('ended', onEnded);
          audio.addEventListener('error', onError);
          audio.addEventListener('timeupdate', onTimeUpdate);
          if (registerAsActive) {
            state.game.activeAudio = { type: 'audio', instance: audio };
          }
          audio.play().catch(() => finish());
        });
      }

      function playPromptAudio(card, options = {}) {
        if (shouldSuppressTutorialCardAudio(card)) {
          return Promise.resolve(false);
        }
        const rate = Number(options?.rate) > 0 ? Number(options.rate) : 1;
        stopActiveAudio();
        if (card.audioUrl) {
          const audio = new Audio(card.audioUrl);
          audio.playbackRate = rate;
          audio.defaultPlaybackRate = rate;
          audio.preservesPitch = true;
          state.stats.listenings += 1;
          saveUserStats();
          updateGameChips();
          return playAudioWithSoftEnd(audio, { registerAsActive: true });
        }

        if (window.speechSynthesis && card.english) {
          return new Promise((resolve) => {
            const utterance = new SpeechSynthesisUtterance(card.english);
            utterance.lang = 'en-US';
            utterance.rate = rate;
            utterance.pitch = 1;
            utterance.onend = utterance.onerror = () => {
              if (state.game.activeAudio && state.game.activeAudio.instance === utterance) {
                state.game.activeAudio = null;
              }
              resolve(true);
            };
            state.game.activeAudio = { type: 'tts', instance: utterance };
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(utterance);
          });
        }
        return Promise.resolve(false);
      }

      function playSuccessAudio() {
        if (!state.game.successAudio) {
          const resolved = typeof window.getGameSoundUrl === 'function'
            ? window.getGameSoundUrl(SUCCESS_SOUND_PATH)
            : SUCCESS_SOUND_PATH;
          state.game.successAudio = new Audio(resolved);
          state.game.successAudio.preload = 'auto';
        }
        try {
          state.game.successAudio.currentTime = 0;
        } catch (_error) {
          // ignore
        }
        playAudioWithSoftEnd(state.game.successAudio).catch?.(() => {});
      }

      function playMilestoneAudio(src) {
        const resolved = resolveInlineMediaUrl(src);
        if (!resolved) return;
        if (!state.game.milestoneAudios.has(resolved)) {
          const audio = new Audio(resolved);
          audio.preload = 'auto';
          state.game.milestoneAudios.set(resolved, audio);
        }
        const audio = state.game.milestoneAudios.get(resolved);
        try {
          audio.currentTime = 0;
        } catch (_error) {
          // ignore
        }
        playAudioWithSoftEnd(audio).catch?.(() => {});
      }

      function playLessAudio() {
        const resolved = resolveInlineMediaUrl(LESS_SOUND_PATH);
        if (!resolved) return;
        if (!state.game.milestoneAudios.has(resolved)) {
          const audio = new Audio(resolved);
          audio.preload = 'auto';
          state.game.milestoneAudios.set(resolved, audio);
        }
        const audio = state.game.milestoneAudios.get(resolved);
        try {
          audio.pause();
          audio.currentTime = 0;
        } catch (_error) {
          // ignore
        }
        audio.play().catch(() => {});
      }

      function triggerFourStarGlow() {
        els.gameVisual.classList.remove('is-four-star-glow');
        void els.gameVisual.offsetWidth;
        els.gameVisual.classList.add('is-four-star-glow');
        window.setTimeout(() => {
          els.gameVisual.classList.remove('is-four-star-glow');
        }, 900);
      }

      function animateStarsCascade(count) {
        const stars = Array.from(els.gameStars.querySelectorAll('.star'));
        stars.slice(0, count).forEach((star, index) => {
          window.setTimeout(() => {
            star.classList.remove('is-burst');
            void star.offsetWidth;
            star.classList.add('is-burst');
          }, index * 300);
        });
      }

      async function playStageResponseSequence(stageNumber, card) {
        if (!card) return;
        if (stageNumber === 2) {
          triggerStageTwoFocusReveal(card);
          await wait(500);
          await playPromptAudio(card);
          return;
        }
        if (stageNumber === 3) {
          triggerStageThreeReveal(card);
          await wait(220);
          return;
        }
        if (stageNumber === 4) {
          triggerOverlayDissolve();
          await wait(500);
          return;
        }
        if (stageNumber === 5) {
          triggerOverlayDissolve();
          triggerWinFlash();
          const audioPlayback = playPromptAudio(card);
          await wait(500);
          await audioPlayback;
          return;
        }
      }

      function playReportAudio() {
        if (!state.game.reportAudio) {
          const resolved = typeof window.getGameSoundUrl === 'function'
            ? window.getGameSoundUrl(REPORT_SOUND_PATH)
            : REPORT_SOUND_PATH;
          state.game.reportAudio = new Audio(resolved);
          state.game.reportAudio.preload = 'auto';
          state.game.reportAudio.volume = 0.8;
        }
        try {
          state.game.reportAudio.currentTime = 0;
        } catch (_error) {
          // ignore
        }
        state.game.reportAudio.play().catch(() => {});
      }

      function playAdminCardAudio(card) {
        if (!isAdminUser() || !card?.audioUrl) return;
        try {
          const audio = new Audio(card.audioUrl);
          audio.play().catch(() => {});
        } catch (_error) {
          // ignore
        }
      }

      function preloadCardImage(card) {
        const src = safeText(card?.imageUrl);
        if (!src || state.game.preloadImages.has(src)) return;
        const image = new Image();
        image.src = src;
        state.game.preloadImages.set(src, image);
      }

      function preloadUpcomingGameCard() {
        const nextId = state.game.queue[0];
        if (!nextId) return;
        preloadCardImage(cardById(nextId));
      }

      function expandEnglishSpeechContractions(text) {
        return String(text || '')
          .replace(/\bi'm\b/g, 'i am')
          .replace(/\byou're\b/g, 'you are')
          .replace(/\bhe's\b/g, 'he is')
          .replace(/\bshe's\b/g, 'she is')
          .replace(/\bit's\b/g, 'it is')
          .replace(/\bwe're\b/g, 'we are')
          .replace(/\bthey're\b/g, 'they are')
          .replace(/\bthat's\b/g, 'that is')
          .replace(/\bthere's\b/g, 'there is')
          .replace(/\bhere's\b/g, 'here is')
          .replace(/\bwhat's\b/g, 'what is')
          .replace(/\bwho's\b/g, 'who is')
          .replace(/\bwhere's\b/g, 'where is')
          .replace(/\bwhen's\b/g, 'when is')
          .replace(/\bwhy's\b/g, 'why is')
          .replace(/\bhow's\b/g, 'how is')
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
        return Math.round(best);
      }

      function expectedAnswersForEntry(entry) {
        const card = cardById(entry.id);
        const stageConfig = STAGES[entry.stage] || STAGES[1];
        const answers = stageConfig.expected === 'portuguese'
          ? (Array.isArray(card?.portugueseAnswers) && card.portugueseAnswers.length ? card.portugueseAnswers : [card?.portuguese || ''])
          : (Array.isArray(card?.englishAnswers) && card.englishAnswers.length ? card.englishAnswers : [card?.english || '']);
        return uniqueAnswerList(answers.map(repairDisplayText).map(item => safeText(item)).filter(Boolean));
      }

      function evaluateAcceptedAnswers(expectedAnswers, spoken) {
        const answers = Array.isArray(expectedAnswers) ? expectedAnswers : [expectedAnswers];
        const normalizedAnswers = uniqueAnswerList(answers.map(repairDisplayText).map(item => safeText(item)).filter(Boolean));
        let bestScore = 0;
        let isHit = false;
        normalizedAnswers.forEach((answer) => {
          const score = calculateSpeechMatchPercent(answer, spoken);
          bestScore = Math.max(bestScore, score);
          if (score >= resolveSpeechHitThreshold(answer)) {
            isHit = true;
          }
        });
        return { score: bestScore, isHit };
      }

      function resolveSpeechHitThreshold(expected) {
        const normalized = getSpeechComparisonCandidates(expected)[0] || '';
        const words = normalized.split(' ').filter(Boolean);
        if (words.length === 1 && normalized.length <= 4) return 28;
        if (words.length === 1 && normalized.length <= 6) return 36;
        if (words.length <= 2 && normalized.length <= 10) return 42;
        return 50;
      }

      function getReserveGameCardsCount() {
        const eligibleCount = baseCandidateCards().length + readyReviewCards().length;
        return Math.max(0, eligibleCount - state.game.entries.size);
      }

      function updateGameChips() {
        els.gameActiveValue.textContent = String(state.stats.speakings || 0);
        els.gameQueueValue.textContent = String(state.stats.listenings || 0);
        els.gameOwnedValue.textContent = String(accessibleFlashcardsCount());
        const activeCount = state.game.entries.size || 0;
        const targetCount = state.game.contextLimit || DEFAULT_GAME_CONTEXT_LIMIT;
        els.gameHeaderCopy.textContent = `${activeCount}/${targetCount} cartas ativas na mesa.`;
      }

      function cardById(id) {
        const pendingCard = state.admin.pendingNewCards.find(card => card.id === id);
        if (pendingCard) return pendingCard;
        const card = state.allCards.find(entry => entry.id === id);
        return card ? buildAdminDraftCard(card) : null;
      }

      function createGameEntry(card, pool = 'base') {
        return { id: card.id, stars: 0, stage: 1, missesWithoutStars: 0, typingMistakes: 0, pool };
      }

      function applyGameSessionSnapshot(snapshot, { addFreshCard = false } = {}) {
        if (!snapshot || !state.entry.cardsReady || state.game.tutorial.active) return false;
        const entries = Array.isArray(snapshot.entries) ? snapshot.entries : [];
        if (!entries.length) return false;

        resetTutorialRuntime({ preserveCompletion: true });
        state.game.entries.clear();
        state.game.queue = [];
        state.game.currentId = null;
        state.game.listening = false;
        state.game.paused = false;
        state.game.canListen = false;
        state.game.transitioning = false;
        state.game.active = true;
        state.game.sessionStartedAt = Date.now();
        state.game.selectedCount = snapshot.selectedCount || DEFAULT_GAME_CONTEXT_LIMIT;
        state.game.contextLimit = snapshot.contextLimit || GAME_ACTIVE_CARD_CAP;

        entries.forEach((entry) => {
          if (!cardById(entry.id)) return;
          state.game.entries.set(entry.id, { ...entry });
        });
        state.game.queue = (Array.isArray(snapshot.queue) ? snapshot.queue : [])
          .filter((id) => state.game.entries.has(id));
        state.game.currentId = state.game.entries.has(snapshot.currentId) ? snapshot.currentId : null;

        if (!state.game.currentId) {
          state.game.currentId = state.game.queue.shift() || Array.from(state.game.entries.keys())[0] || null;
        }

        if (addFreshCard && state.game.entries.size < GAME_ACTIVE_CARD_CAP) {
          refillGameEntry('base', Math.min(GAME_ACTIVE_CARD_CAP, state.game.entries.size + 1));
        }

        persistGameSessionLocally();
        return state.game.entries.size > 0 && Boolean(state.game.currentId);
      }

      function buildOrderedDeckSelection(cards, limit) {
        const normalizedLimit = Math.max(0, Number(limit) || 0);
        if (!normalizedLimit || !cards.length) return [];
        return shuffle(cards.slice()).slice(0, normalizedLimit);
      }

      function buildGameVisual(card, stageConfig) {
        const shouldShowImage = stageConfig.showImage !== false;
        const placeholderLabel = stageConfig.placeholderUsesPortuguese
          ? buildStageThreePlaceholderMarkup(card)
          : escapeHtml('?');
        preloadCardImage(card);
        const imageOnlyMarkup = card.imageUrl
          ? `<img src="${escapeHtml(card.imageUrl)}" alt="${escapeHtml(card.english || card.portuguese || card.deckTitle)}">`
          : `<div class="mini-card__fallback">${escapeHtml(card.deckTitle)}</div>`;
        let imageMarkup = shouldShowImage
          ? imageOnlyMarkup
          : `<div class="game-card__placeholder${stageConfig.placeholderUsesPortuguese ? ' is-word-mode' : ''}">${placeholderLabel}</div>`;
        if (stageConfig.revealOnHit && card.imageUrl) {
          imageMarkup = `<div class="game-card__placeholder is-word-mode">${placeholderLabel}</div><img class="game-card__reveal-image" src="${escapeHtml(card.imageUrl)}" alt="${escapeHtml(card.english || card.portuguese || card.deckTitle)}">`;
        }
        if (stageConfig.overlayFlag) {
          const overlayClassName = stageConfig.overlayClassName
            ? `game-card__phase-flag ${stageConfig.overlayClassName}`
            : 'game-card__phase-flag';
          imageMarkup += `<img class="${overlayClassName}" src="${escapeHtml(stageConfig.overlayFlag)}" alt="">`;
        }
        const record = state.userCards.get(card.id) || null;
        const tutorialFinale = tutorialFinaleState();
        const hasTutorialFinale = Boolean(
          state.game.tutorial.active
          && tutorialFinale.active
          && tutorialFinale.cardId === card.id
        );
        const rewardSeal = state.game.pendingRewardSeal && state.game.pendingRewardSeal.cardId === card.id
          ? state.game.pendingRewardSeal
          : null;
        const displayedSeal = hasTutorialFinale
          ? Math.max(0, Number(tutorialFinale.sealPhase) || 0)
          : (rewardSeal ? rewardSeal.phase : activeSealPhase(record));
        const sealMarkup = displayedSeal
          ? `<img class="mini-card__seal game-card__seal${rewardSeal ? ' game-card__reward-seal' : ''}${hasTutorialFinale && tutorialFinale.sealFlash ? ' is-tutorial-seal-flash' : ''}${hasTutorialFinale && tutorialFinale.sealSoft ? ' is-tutorial-seal-soft' : ''}" src="${escapeHtml(phaseMeta(displayedSeal).sealPath)}" alt="${escapeHtml(phaseMeta(displayedSeal).label)}">`
          : '';
        const visualClasses = ['game-card__visual'];
        if (stageConfig.blurImage) visualClasses.push('is-stage-two');
        if (stageConfig.revealOnHit) visualClasses.push('is-stage-three');
        els.gameVisual.className = visualClasses.join(' ');
        els.gameVisual.innerHTML = `${imageMarkup}${sealMarkup}`;
      }

      function triggerStageTwoFocusReveal(card) {
        els.gameVisual.classList.add('is-revealing-focus');
      }

      function triggerStageThreeReveal(card) {
        els.gameVisual.classList.add('is-stage-three-reveal');
        if (!card?.imageUrl) {
          buildGameVisual(card, { ...STAGES[4], showImage: true });
        }
      }

      function triggerStageThreeDissolve() {
        els.gameVisual.classList.add('is-stage-three-dissolving');
      }

      function triggerOverlayDissolve() {
        els.gameVisual.classList.add('is-overlay-dissolving');
      }

      function triggerWinFlash() {
        els.gameVisual.classList.remove('is-win-flash');
        void els.gameVisual.offsetWidth;
        els.gameVisual.classList.add('is-win-flash');
      }

      function clearPendingRewardSeal(cardId = '') {
        if (state.game.pendingRewardSealTimer) {
          if (!cardId || state.game.pendingRewardSeal?.cardId === cardId || state.game.currentId === cardId) {
            window.clearTimeout(state.game.pendingRewardSealTimer);
            state.game.pendingRewardSealTimer = 0;
          }
        }
        if (!state.game.pendingRewardSeal) return;
        if (cardId && state.game.pendingRewardSeal.cardId !== cardId) return;
        state.game.pendingRewardSeal = null;
      }

      function schedulePendingRewardSeal(cardId, phase) {
        clearPendingRewardSeal(cardId);
        state.game.pendingRewardSealTimer = window.setTimeout(() => {
          state.game.pendingRewardSealTimer = 0;
          if (!state.game.active || state.game.currentId !== cardId) return;
          state.game.pendingRewardSeal = { cardId, phase };
          renderCurrentCard();
        }, 500);
      }

      function renderImmediateHitFeedback(stars) {
        renderStars(stars);
      }

      async function animateStarLossSequence(stars, card) {
        const totalStars = Math.max(0, Math.min(GAME_STAR_TARGET, Number(stars) || 0));
        if (!totalStars) {
          renderStars(0);
          return;
        }
        renderStarsLossState(totalStars, 0);
        const voicePlayback = Promise.resolve(playPromptAudio(card, { rate: 0.7 })).catch(() => false);
        for (let lostCount = 1; lostCount <= totalStars; lostCount += 1) {
          await wait(750);
          playLessAudio();
          renderStarsLossState(totalStars, lostCount);
        }
        await voicePlayback;
        renderStars(0);
      }

      function shouldUseLongChipLayout(text) {
        const normalized = safeText(text).replace(/\s+/g, '');
        return normalized.length > 12;
      }

      function splitLongChipText(text) {
        const normalized = safeText(text);
        if (!normalized) return '';
        const words = normalized.split(/\s+/).filter(Boolean);
        if (words.length >= 2) {
          const midpoint = Math.ceil(words.length / 2);
          return `${escapeHtml(words.slice(0, midpoint).join(' '))}<br>${escapeHtml(words.slice(midpoint).join(' '))}`;
        }
        const middle = Math.ceil(normalized.length / 2);
        return `${escapeHtml(normalized.slice(0, middle))}<br>${escapeHtml(normalized.slice(middle))}`;
      }

      function renderChipText(element, text) {
        const content = safeText(text);
        const isLong = shouldUseLongChipLayout(content);
        const wordCount = content ? content.split(/\s+/).filter(Boolean).length : 0;
        const isShort = Boolean(content) && wordCount > 0 && wordCount <= 8;
        element.classList.toggle('is-long', isLong);
        element.classList.toggle('is-short', isShort && !isLong);
        if (isLong) {
          element.innerHTML = splitLongChipText(content);
        } else {
          element.textContent = content;
        }
      }

      function buildStageThreePlaceholderMarkup(card) {
        const placeholderLabel = capitalizeWords(card.portuguese || card.english || card.deckTitle || '?');
        const words = placeholderLabel.split(/\s+/).filter(Boolean);
        if (words.length === 2) {
          return `${escapeHtml(words[0])}<br>${escapeHtml(words[1])}`;
        }
        return escapeHtml(placeholderLabel);
      }

      function buildTypingLetterPool(text, total = 16) {
        const source = safeText(text).toUpperCase().replace(/[^A-Z]/g, '');
        const pool = [];
        source.split('').forEach((letter) => {
          if (letter && !pool.includes(letter)) {
            pool.push(letter);
          }
        });
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
        while (pool.length < total) {
          const next = alphabet[Math.floor(Math.random() * alphabet.length)];
          if (!pool.includes(next)) {
            pool.push(next);
          }
        }
        return pool.slice(0, total).sort();
      }

      function formatTypingDisplay(rawText, typedLetters) {
        const source = safeText(rawText).toUpperCase();
        const typed = String(typedLetters || '').toUpperCase();
        let pointer = 0;
        return source.split('').map((char) => {
          if (!/[A-Z]/.test(char)) return char;
          const next = typed[pointer] || '';
          pointer += 1;
          return next;
        }).join('');
      }

      function revealTypingAnswer(card) {
        const display = els.gameVisual.querySelector('.flashcards-typing__display--visual');
        if (!display) return;
        display.textContent = safeText(card?.english).toUpperCase() || '\u00A0';
      }

      function clearTypingAnswer() {
        const display = els.gameVisual.querySelector('.flashcards-typing__display--visual');
        if (!display) return;
        display.textContent = '\u00A0';
      }

      function setTypingKeysDisabled(grid, disabled) {
        Array.from(grid.querySelectorAll('.flashcards-typing__key')).forEach((node) => {
          node.classList.toggle('is-disabled', disabled);
          node.disabled = disabled;
        });
      }

      function playTypingKeyAudio() {
        try {
          if (!state.game.typingKeyAudioPool.length) {
            state.game.typingKeyAudioPool = Array.from({ length: 4 }, () => {
              const audio = new Audio(TYPING_KEY_SOUND_PATH);
              audio.preload = 'auto';
              audio.volume = 0.95;
              return audio;
            });
            state.game.typingKeyAudioIndex = 0;
          }
          const pool = state.game.typingKeyAudioPool;
          const audio = pool[state.game.typingKeyAudioIndex % pool.length];
          state.game.typingKeyAudioIndex = (state.game.typingKeyAudioIndex + 1) % pool.length;
          audio.pause();
          audio.currentTime = 0;
          audio.play().catch(() => {});
        } catch (_error) {
          // ignore
        }
      }

      function triggerTypingKeyFlash(key) {
        if (!key) return;
        if (key._flashTimer) {
          window.clearTimeout(key._flashTimer);
          key._flashTimer = 0;
        }
        key.classList.remove('is-correct-hit');
        void key.offsetWidth;
        key.classList.add('is-correct-hit');
        key._flashTimer = window.setTimeout(() => {
          key.classList.remove('is-correct-hit');
          key._flashTimer = 0;
        }, TYPING_KEY_FLASH_MS);
      }

      async function handleTypingMistake(entry, card, grid) {
        entry.typingMistakes = (entry.typingMistakes || 0) + 1;
        setTypingKeysDisabled(grid, true);
        revealTypingAnswer(card);
        await Promise.allSettled([playPromptAudio(card, { rate: 0.8 }), wait(2000)]);
        if (!state.game.active || state.game.currentId !== entry.id) return true;
        if (entry.typingMistakes < 2) {
          clearTypingAnswer();
          setTypingKeysDisabled(grid, false);
          return false;
        }
        await handleRecognitionResult('', 'typing');
        return true;
      }

      function showStageTwoPortugueseHint(card) {
        const portuguese = capitalizeWords(card?.portuguese || card?.english || card?.deckTitle || '');
        if (!portuguese) return;
        els.gameWord.classList.add('is-hidden');
        els.gameSubword.className = 'game-subword is-chip';
        els.gameSubword.style.display = '';
        renderChipText(els.gameSubword, portuguese);
      }

      function renderTypingKeyboard(entry, card) {
        if (entry.stage !== 4 || !card) {
          els.gameVisual.querySelector('.flashcards-typing__display--visual')?.remove();
          els.gameTypingKeyboard.innerHTML = '';
          els.gameTypingKeyboard.classList.remove('is-visible');
          els.gameTypingKeyboard.setAttribute('aria-hidden', 'true');
          return;
        }

        const target = safeText(card.english).toUpperCase().replace(/[^A-Z]/g, '');
        if (!target) {
          els.gameVisual.querySelector('.flashcards-typing__display--visual')?.remove();
          els.gameTypingKeyboard.innerHTML = '';
          els.gameTypingKeyboard.classList.remove('is-visible');
          els.gameTypingKeyboard.setAttribute('aria-hidden', 'true');
          return;
        }

        let typed = '';
        const display = document.createElement('div');
        display.className = 'flashcards-typing__display flashcards-typing__display--visual';
        const renderTyped = () => {
          display.textContent = formatTypingDisplay(card.english || '', typed) || '\u00A0';
        };
        renderTyped();

        const grid = document.createElement('div');
        grid.className = 'flashcards-typing__grid';
        const typingPalette = shuffleList(TYPING_KEY_BLUES);
        buildTypingLetterPool(target, 16).forEach((letter, index) => {
          const key = document.createElement('button');
          key.type = 'button';
          key.className = 'flashcards-typing__key';
          key.textContent = letter;
          key.setAttribute('aria-label', `Letra ${letter}`);
          key.style.setProperty('--typing-key-bg', typingPalette[index % typingPalette.length]);
          key.addEventListener('click', async () => {
            if (!state.game.active || state.game.paused || state.game.listening || state.game.currentId !== entry.id) return;
            playTypingKeyAudio();
            const expectedLetter = target[typed.length];
            if (letter !== expectedLetter) {
              typed = '';
              const finished = await handleTypingMistake(entry, card, grid);
              if (!finished) {
                renderTyped();
              }
              return;
            }
            triggerTypingKeyFlash(key);
            typed += letter;
            renderTyped();
            if (typed.length === target.length) {
              setTypingKeysDisabled(grid, true);
              await handleRecognitionResult(card.english || '', 'typing');
            }
          });
          grid.appendChild(key);
        });

        els.gameVisual.querySelector('.flashcards-typing__display--visual')?.remove();
        els.gameVisual.appendChild(display);
        els.gameTypingKeyboard.innerHTML = '';
        els.gameTypingKeyboard.appendChild(grid);
        els.gameTypingKeyboard.classList.add('is-visible');
        els.gameTypingKeyboard.setAttribute('aria-hidden', 'false');
      }

      function renderCurrentCard() {
        cleanupGameRecognition();
        const entry = state.game.currentId ? state.game.entries.get(state.game.currentId) : null;
        if (!entry) {
          clearGameLanguageSwapTimer();
          clearStageTwoHintTimer();
          els.gameCard.classList.remove('is-typing-stage');
          updateGameChips();
          if (!state.game.entries.size) {
            clearGameSessionLocally();
            els.gameCard.style.display = 'none';
            els.gameEnd.classList.add('is-visible');
          }
          return;
        }

        persistGameSessionLocally();

        const card = cardById(entry.id);
        const stageConfig = resolveGameStageConfig(entry);
        els.gameCard.style.display = '';
        els.gameCard.classList.toggle('is-typing-stage', entry.stage === 4);
        els.gameEnd.classList.remove('is-visible');
        if (!state.game.pendingRewardSeal || state.game.pendingRewardSeal.cardId !== entry.id) {
          setGameStatus('', '');
        }
        buildGameVisual(card, stageConfig);
        preloadUpcomingGameCard();

        let word = ' ';
        if (stageConfig.wordType === 'portuguese') {
          word = capitalizeWords(card.portuguese || card.english || card.deckTitle);
        } else if (stageConfig.wordType === 'english') {
          word = capitalizeWords(card.english || card.portuguese || card.deckTitle);
        }

        let subword = '';
        if (stageConfig.subtitleType === 'portuguese') {
          subword = capitalizeWords(card.portuguese || '');
        } else if (stageConfig.subtitleType === 'english') {
          subword = capitalizeWords(card.english || '');
        }
        els.gameStep.textContent = stageConfig.badge;
        els.gameWord.className = `game-word${stageConfig.showWord === false ? ' is-hidden' : ' is-chip'}`;
        els.gameSubword.className = `game-subword${subword ? ' is-chip' : ' is-hidden'}`;
        renderChipText(els.gameWord, stageConfig.showWord === false ? '' : word);
        renderChipText(els.gameSubword, subword);
        els.gameCard.querySelector('.game-card__content')?.classList.toggle('is-stage-three', entry.stage === 3);
        if (subword) {
          els.gameSubword.classList.remove('is-hidden');
        }
        els.gameSubword.classList.toggle('is-stage-one', entry.stage === 1 && stageConfig.subtitleType === 'portuguese');
        renderStageOneWordSwap(entry, Boolean(subword));
        state.game.canListen = entry.stage !== 4;
        renderGameTouchButton(stageConfig, entry);
        els.gameTouchBtn.parentElement.classList.toggle('is-hidden', entry.stage === 4 || els.gameTouchBtn.classList.contains('is-hidden'));
        els.gameTouchBtn.classList.toggle('is-busy', state.game.listening);
        renderTypingKeyboard(entry, card);
        if (!(entry.stage === 1 && subword)) {
          els.gameWord.classList.toggle('is-hidden', stageConfig.showWord === false);
          els.gameSubword.classList.toggle('is-hidden', !subword);
          els.gameSubword.style.display = subword ? '' : 'none';
        }
        renderStars(entry.stars);
        els.gameStarCopy.textContent = '';
        updateGameChips();
        scheduleStageTwoHintLoop(entry);
        if (maybeRunTutorialSequence(entry, card)) {
          return;
        }

        if (entry.stage === 4) {
          window.setTimeout(() => {
            if (state.game.currentId === entry.id && !state.game.listening && !state.game.paused) {
              playPromptAudio(card);
            }
          }, 220);
          return;
        }

        if (stageConfig.autoAudio) {
          if (state.game.skipAutoAudioOnce) {
            state.game.skipAutoAudioOnce = false;
            state.game.canListen = true;
            renderGameTouchButton(stageConfig, entry);
            return;
          }
          window.setTimeout(() => {
            if (state.game.currentId === entry.id && !state.game.listening && !state.game.paused) {
              const playback = playPromptAudio(card);
              playback.finally(() => {
                if (state.game.currentId === entry.id) {
                  state.game.canListen = true;
                  renderGameTouchButton(stageConfig, entry);
                }
              });
            }
          }, 220);
        }
      }

      function nextGameCardForPool(pool = 'base') {
        const activeIds = new Set(Array.from(state.game.entries.keys()));
        const preferredSource = pool === 'review'
          ? readyReviewCards().filter(card => !activeIds.has(card.id))
          : baseCandidateCards().filter(card => !activeIds.has(card.id));
        const fallbackSource = pool === 'review'
          ? baseCandidateCards().filter(card => !activeIds.has(card.id))
          : readyReviewCards().filter(card => !activeIds.has(card.id));
        const sourceCards = preferredSource.length ? preferredSource : fallbackSource;
        const nextCard = (pool === 'review' && preferredSource.length)
          ? sourceCards[0]
          : takeRandom(sourceCards, 1)[0];
        if (!nextCard) return null;
        return {
          card: nextCard,
          pool: preferredSource.length ? pool : (pool === 'review' ? 'base' : 'review')
        };
      }

      function refillGameEntry(pool = 'base', limit = state.game.contextLimit || DEFAULT_GAME_CONTEXT_LIMIT) {
        if (state.game.entries.size >= Math.max(DEFAULT_GAME_CONTEXT_LIMIT, Number(limit) || 0)) {
          updateGameChips();
          return false;
        }
        const nextChoice = nextGameCardForPool(pool);
        const nextCard = nextChoice?.card || null;
        if (!nextCard) {
          updateGameChips();
          return false;
        }
        const entry = createGameEntry(nextCard, nextChoice.pool);
        state.game.entries.set(entry.id, entry);
        state.game.queue.push(entry.id);
        persistGameSessionLocally();
        updateGameChips();
        return true;
      }

      function promoteCardFromWin(entry) {
        const currentRecord = state.userCards.get(entry.id) || null;
        const currentPhase = Math.max(0, Math.min(5, Number(currentRecord?.phaseIndex) || 0));
        const nextPhase = Math.max(1, Math.min(5, currentPhase + 1));
        moveCardToMemorizing(entry.id, nextPhase);
      }

      function removeGameEntry(cardId) {
        state.game.entries.delete(cardId);
        state.game.queue = state.game.queue.filter(id => id !== cardId);
        if (state.game.currentId === cardId) {
          state.game.currentId = null;
        }
        persistGameSessionLocally();
      }

      function wait(ms) {
        return new Promise(resolve => window.setTimeout(resolve, ms));
      }

      function applyDefaultWatchSettings() {
        state.watch.gapMs = 3000;
        state.watch.scope = 'all';
        state.watch.music = 'on';
        if (els.watchGapSelect) els.watchGapSelect.value = '3000';
        if (els.watchScopeSelect) els.watchScopeSelect.value = 'all';
        if (els.watchMusicSelect) els.watchMusicSelect.value = 'on';
      }

      function readWatchSettings() {
        try {
          const parsed = JSON.parse(localStorage.getItem(WATCH_SETTINGS_KEY) || 'null');
          return {
            gapMs: [3000, 5000, 10000, 30000, 60000].includes(Number(parsed?.gapMs)) ? Number(parsed.gapMs) : 3000,
            scope: parsed?.scope === 'mine' ? 'mine' : 'all',
            music: parsed?.music === 'off' ? 'off' : 'on'
          };
        } catch (_error) {
          return { gapMs: 3000, scope: 'all', music: 'on' };
        }
      }

      function saveWatchSettings() {
        localStorage.setItem(WATCH_SETTINGS_KEY, JSON.stringify({
          gapMs: state.watch.gapMs,
          scope: state.watch.scope,
          music: state.watch.music
        }));
      }

      function syncWatchControls() {
        const settings = readWatchSettings();
        state.watch.gapMs = settings.gapMs;
        state.watch.scope = settings.scope;
        state.watch.music = settings.music;
        els.watchGapSelect.value = String(settings.gapMs);
        els.watchScopeSelect.value = settings.scope;
        els.watchMusicSelect.value = settings.music;
      }

      function uniqueCardsById(cards) {
        const seen = new Set();
        const unique = [];
        (Array.isArray(cards) ? cards : []).forEach((card) => {
          const cardId = safeText(card?.id);
          if (!cardId || seen.has(cardId)) return;
          seen.add(cardId);
          unique.push({ ...card });
        });
        return unique;
      }

      function buildWatchSourceCards() {
        const sourceCards = state.watch.scope === 'mine'
          ? userProgressCards().map(card => ({ ...card }))
          : uniqueCardsById([
              ...baseCandidateCards(),
              ...readyReviewCards()
            ]);
        return sourceCards.filter(card => card.audioUrl);
      }

      function buildWatchDeckOptions(cards) {
        const groups = new Map(
          (Array.isArray(state.deckCatalog) ? state.deckCatalog : []).map((deck) => [
            safeText(deck?.source),
            {
              source: safeText(deck?.source),
              title: safeText(deck?.title) || safeText(deck?.source) || 'Deck',
              count: 0
            }
          ]).filter(([source]) => source)
        );
        cards.forEach((card) => {
          const source = safeText(card?.source) || safeText(card?.deckTitle) || safeText(card?.id);
          if (!source) return;
          const current = groups.get(source) || {
            source,
            title: safeText(card?.deckTitle) || source,
            count: 0
          };
          current.count += 1;
          groups.set(source, current);
        });
        return Array.from(groups.values())
          .sort((left, right) => left.title.localeCompare(right.title, 'pt-BR', { sensitivity: 'base' }));
      }

      function syncWatchDeckSelection(options) {
        const validSources = new Set(options.map(option => option.source));
        const current = Array.isArray(state.watch.selectedSources)
          ? state.watch.selectedSources.filter(source => validSources.has(source))
          : [];
        state.watch.selectedSources = current.length
          ? current
          : options.map(option => option.source);
      }

      function renderWatchDeckPicker() {
        if (!els.watchDeckGrid || !els.watchDeckSummary) return;
        const sourceCards = buildWatchSourceCards();
        const options = buildWatchDeckOptions(sourceCards);
        syncWatchDeckSelection(options);
        const selectedSources = new Set(state.watch.selectedSources);
        const selectedCardCount = sourceCards.filter(card => selectedSources.has(safeText(card?.source) || safeText(card?.deckTitle) || safeText(card?.id))).length;

        if (!options.length) {
          els.watchDeckGrid.innerHTML = '<div class="watch-decks__empty">Nenhum deck com audio esta disponivel neste filtro.</div>';
          els.watchDeckSummary.textContent = '0 decks ativos';
          if (els.startWatchBtn) els.startWatchBtn.disabled = true;
          return;
        }

        els.watchDeckGrid.innerHTML = options.map((option) => {
          const active = selectedSources.has(option.source);
          return `
            <button class="watch-deck-toggle ${active ? 'is-active' : ''}" type="button" data-watch-source="${escapeHtml(option.source)}" aria-pressed="${active ? 'true' : 'false'}">
              <span class="watch-deck-toggle__title">${escapeHtml(option.title)}</span>
              <span class="watch-deck-toggle__meta">${option.count} carta${option.count === 1 ? '' : 's'} com audio</span>
            </button>
          `;
        }).join('');
        els.watchDeckSummary.textContent = `${selectedSources.size} deck${selectedSources.size === 1 ? '' : 's'} ativo${selectedSources.size === 1 ? '' : 's'} â€¢ ${selectedCardCount} carta${selectedCardCount === 1 ? '' : 's'}`;
        if (els.startWatchBtn) {
          els.startWatchBtn.disabled = !selectedSources.size || !selectedCardCount;
        }
      }

      function toggleWatchDeckSource(source) {
        const normalized = safeText(source);
        if (!normalized) return;
        const next = new Set(state.watch.selectedSources);
        if (next.has(normalized)) {
          next.delete(normalized);
        } else {
          next.add(normalized);
        }
        state.watch.selectedSources = Array.from(next);
        renderWatchDeckPicker();
      }

      function buildWatchQueue(cards) {
        const source = cards.slice();
        if (source.length > 1 && state.watch.currentCardId) {
          const filtered = source.filter(card => card.id !== state.watch.currentCardId);
          return shuffle(filtered.length ? filtered : source);
        }
        return shuffle(source);
      }

      function stopWatchTimer() {
        if (state.watch.timer) {
          window.clearTimeout(state.watch.timer);
          state.watch.timer = null;
        }
      }

      function stopWatchVoice() {
        if (!state.watch.voiceAudio) return;
        state.watch.voiceAudio.pause();
        state.watch.voiceAudio.currentTime = 0;
        state.watch.voiceAudio = null;
      }

      function stopWatchMusic() {
        if (!state.watch.musicAudio) return;
        state.watch.musicAudio.pause();
        state.watch.musicAudio.currentTime = 0;
        state.watch.musicAudio = null;
      }

      function renderWatchStars() {
        els.watchStars.innerHTML = '';
        for (let index = 0; index < GAME_STAR_TARGET; index += 1) {
          const star = document.createElement('img');
          star.className = 'star is-on';
          star.src = STAR_ICON_PATH;
          star.alt = '';
          els.watchStars.appendChild(star);
        }
      }

      function renderWatchCard(card) {
        const imageMarkup = card?.imageUrl
          ? `<img src="${escapeHtml(card.imageUrl)}" alt="${escapeHtml(card.english || card.portuguese || card.deckTitle)}">`
          : `<div class="watch-card__fallback">${escapeHtml(card?.deckTitle || 'Flashcards')}</div>`;
        els.watchVisual.innerHTML = imageMarkup;
        els.watchWord.textContent = card?.english || card?.portuguese || 'Preparando...';
        els.watchSubword.textContent = card?.portuguese || '';
        els.watchSubword.style.display = card?.portuguese ? '' : 'none';
        renderWatchStars();
      }

      function openWatchPopover() {
        syncWatchControls();
        renderWatchDeckPicker();
        els.watchPopover.classList.add('is-visible');
        window.requestAnimationFrame(() => els.watchPopover.classList.add('is-active'));
        document.body.classList.add('game-open');
      }

      function closeWatchPopover() {
        els.watchPopover.classList.remove('is-active');
        els.watchPopover.classList.remove('is-visible');
        if (!state.game.active && !state.watch.active) {
          document.body.classList.remove('game-open');
        }
      }

      function openGameSetup() {
        if (shouldGatePremiumAccess()) {
          openPremiumGate();
          return;
        }
        if (canOfferTutorialMode()) {
          beginTutorialGame();
          return;
        }
        state.game.selectedCount = DEFAULT_GAME_CONTEXT_LIMIT;
        beginGame();
      }

      function closeGameSetup() {
        els.gameSetup.classList.remove('is-active');
        els.gameSetup.classList.remove('is-visible');
        if (!state.game.active && !state.watch.active) {
          document.body.classList.remove('game-open');
        }
      }

      function pickWatchCards() {
        const selectedSources = new Set(
          Array.isArray(state.watch.selectedSources) ? state.watch.selectedSources.map(source => safeText(source)).filter(Boolean) : []
        );
        return buildWatchSourceCards().filter((card) => {
          const source = safeText(card?.source) || safeText(card?.deckTitle) || safeText(card?.id);
          return selectedSources.has(source);
        });
      }

      function playWatchMusic() {
        if (state.watch.music !== 'on') return;
        if (state.watch.musicAudio) return;
        const track = BALANCE_TRACKS[Math.floor(Math.random() * BALANCE_TRACKS.length)];
        const audio = new Audio(`${BALANCE_TRACK_ROOT}/${encodeURIComponent(track)}`);
        audio.loop = true;
        audio.volume = 0.7;
        state.watch.musicAudio = audio;
        audio.play().catch(() => {
          state.watch.musicAudio = null;
        });
      }

      async function playWatchAudio(card, rate) {
        if (!state.watch.active || !card?.audioUrl) return;
        stopWatchVoice();
        const audio = new Audio(card.audioUrl);
        audio.playbackRate = rate;
        audio.defaultPlaybackRate = rate;
        audio.preservesPitch = true;
        state.watch.voiceAudio = audio;
        state.stats.listenings += 1;
        saveUserStats();
        try {
          await audio.play();
        } catch (_error) {
          state.watch.voiceAudio = null;
          return;
        }
        await new Promise(resolve => {
          audio.addEventListener('ended', resolve, { once: true });
          audio.addEventListener('error', resolve, { once: true });
        });
        if (state.watch.voiceAudio === audio) {
          state.watch.voiceAudio = null;
        }
      }

      async function runWatchCycle() {
        if (!state.watch.active) return;
        if (!state.watch.queue.length) {
          state.watch.queue = buildWatchQueue(state.watch.sourceCards);
        }
        const card = state.watch.queue.shift();
        if (!card) return;
        state.watch.currentCardId = card.id;
        renderWatchCard(card);
        playWatchMusic();
        if ('mediaSession' in navigator) {
          try {
            navigator.mediaSession.metadata = new MediaMetadata({
              title: card.english || card.portuguese || 'Flashcard',
              artist: card.portuguese || '',
              album: 'PlayTalk Flashcards'
            });
            navigator.mediaSession.playbackState = 'playing';
          } catch (_error) {
            // ignore
          }
        }
        await playWatchAudio(card, 0.75);
        if (!state.watch.active) return;
        await wait(3000);
        if (!state.watch.active) return;
        await playWatchAudio(card, 1);
        if (!state.watch.active) return;
        stopWatchTimer();
        state.watch.timer = window.setTimeout(() => {
          runWatchCycle();
        }, state.watch.gapMs);
      }

      function stopWatch() {
        state.watch.active = false;
        state.watch.currentCardId = null;
        state.watch.queue = [];
        state.watch.sourceCards = [];
        stopWatchTimer();
        stopWatchVoice();
        stopWatchMusic();
        els.watch.classList.remove('is-visible');
        closeWatchPopover();
        if ('mediaSession' in navigator) {
          try {
            navigator.mediaSession.playbackState = 'none';
          } catch (_error) {
            // ignore
          }
        }
        if (!state.game.active) {
          document.body.classList.remove('game-open');
        }
      }

      function startWatch(options = {}) {
        if (options.useDefaults) {
          applyDefaultWatchSettings();
        }
        state.watch.gapMs = Number(els.watchGapSelect.value) || 3000;
        state.watch.scope = els.watchScopeSelect.value === 'mine' ? 'mine' : 'all';
        state.watch.music = els.watchMusicSelect.value === 'off' ? 'off' : 'on';
        saveWatchSettings();
        state.watch.sourceCards = pickWatchCards();
        if (!state.watch.sourceCards.length) {
          window.alert('Nenhum flashcard com audio foi encontrado nos decks ativados.');
          return;
        }
        state.watch.queue = buildWatchQueue(state.watch.sourceCards);
        state.watch.active = true;
        closeWatchPopover();
        els.watch.classList.add('is-visible');
        document.body.classList.add('game-open');
        runWatchCycle();
      }

      async function advanceToNextCard() {
        if (!state.game.active) return;
        cleanupGameRecognition();
        clearPendingRewardSeal();
        clearStageTwoHintTimer();
        if (!state.game.queue.length) {
          state.game.currentId = null;
          renderCurrentCard();
          return;
        }

        state.game.transitioning = true;
        els.gameCard.classList.add('is-transitioning');
        await wait(180);
        state.game.currentId = state.game.queue.shift();
        persistGameSessionLocally();
        renderCurrentCard();
        if (!state.game.tutorial.active) {
          playReportAudio();
        }
        await wait(30);
        els.gameCard.classList.remove('is-transitioning');
        state.game.transitioning = false;
      }

      function beginGame() {
        hideWelcomeGate();
        cleanupGameRecognition();
        stopActiveAudio();
        clearGameLanguageSwapTimer();
        clearStageTwoHintTimer();
        clearPendingRewardSeal();
        advanceReadyMemorizations();
        if (!hasTutorialPlanetUnlocked()) {
          clearGameSessionLocally();
        }
        const restored = hasTutorialPlanetUnlocked() && applyGameSessionSnapshot(readGameSessionForUser(), { addFreshCard: true });
        if (!restored) {
          resetTutorialRuntime({ preserveCompletion: true });
          state.game.entries.clear();
          state.game.queue = [];
          state.game.currentId = null;
          state.game.listening = false;
          state.game.paused = false;
          state.game.canListen = false;
          state.game.active = true;
          state.game.sessionStartedAt = Date.now();

          const roundCount = normalizeGameCount(state.game.selectedCount) || DEFAULT_GAME_CONTEXT_LIMIT;
          state.game.contextLimit = GAME_ACTIVE_CARD_CAP;
          const reviewLimit = Math.min(REVIEW_SLOT_LIMIT, Math.floor(roundCount / 3));
          const reviewCards = readyReviewCards().slice(0, reviewLimit);
          const chosenCards = buildOrderedDeckSelection(
            baseCandidateCards(),
            Math.max(0, roundCount - reviewCards.length)
          );
          chosenCards.forEach(card => {
            const entry = createGameEntry(card, 'base');
            state.game.entries.set(entry.id, entry);
            state.game.queue.push(entry.id);
          });
          reviewCards.forEach(card => {
            const entry = createGameEntry(card, 'review');
            state.game.entries.set(entry.id, entry);
            state.game.queue.push(entry.id);
          });
          persistGameSessionLocally();
        }

        els.topbar.classList.add('is-hidden');
        els.catalog.classList.add('is-hidden');
        closeGameSetup();
        document.body.classList.add('game-open');
        els.game.classList.add('is-visible');
        window.requestAnimationFrame(() => els.game.classList.add('is-active'));

        if (!state.game.entries.size) {
          renderCurrentCard();
          return;
        }

        updateGameChips();
        advanceToNextCard();
      }

      function beginTutorialGame() {
        const tutorialCard = findTutorialPlanetCard();
        if (!tutorialCard) return;

        hideWelcomeGate();
        clearGameSessionLocally();
        cleanupGameRecognition();
        stopActiveAudio();
        clearGameLanguageSwapTimer();
        clearStageTwoHintTimer();
        clearPendingRewardSeal();
        resetTutorialRuntime({ preserveCompletion: true });
        state.game.entries.clear();
        state.game.queue = [];
        state.game.currentId = null;
        state.game.listening = false;
        state.game.paused = false;
        state.game.canListen = false;
        state.game.active = true;
        state.game.transitioning = false;
        state.game.sessionStartedAt = Date.now();
        state.game.tutorial.active = true;
        state.game.tutorial.currentCardId = tutorialCard.id;

        const entry = createGameEntry(tutorialCard, 'tutorial');
        state.game.entries.set(entry.id, entry);
        state.game.queue.push(entry.id);

        els.topbar.classList.add('is-hidden');
        els.catalog.classList.add('is-hidden');
        closeGameSetup();
        document.body.classList.add('game-open');
        els.game.classList.add('is-visible');
        window.requestAnimationFrame(() => els.game.classList.add('is-active'));

        updateGameChips();
        advanceToNextCard();
      }

      async function exitGame() {
        if (state.game.active && !state.game.tutorial.active && state.game.entries.size) {
          persistGameSessionLocally();
        }
        cleanupGameRecognition();
        stopActiveAudio();
        clearGameLanguageSwapTimer();
        clearStageTwoHintTimer();
        clearPendingRewardSeal();
        resetTutorialRuntime({ preserveCompletion: true });
        state.game.active = false;
        state.game.entries.clear();
        state.game.queue = [];
        state.game.currentId = null;
        state.game.listening = false;
        state.game.paused = false;
        if (state.game.sessionStartedAt) {
          state.stats.playTimeMs += Date.now() - state.game.sessionStartedAt;
          state.game.sessionStartedAt = 0;
          saveUserStats();
        }
        document.body.classList.remove('game-open');
        els.game.classList.remove('is-active');
        closeGameReportMenu();
        await wait(180);
        els.game.classList.remove('is-visible');
        els.catalog.classList.add('is-hidden');
        els.topbar.classList.add('is-hidden');
        refreshLibrary();
        syncWelcomeGate();
      }

      async function handleRecognitionResult(transcript, inputMode = 'speech') {
        const entry = state.game.currentId ? state.game.entries.get(state.game.currentId) : null;
        if (!entry) return;

        const expectedAnswers = expectedAnswersForEntry(entry);
        const activeCountBeforeResolution = state.game.entries.size;
        const accessibleCountBeforeResolution = accessibleFlashcardsCount();
        const evaluatedStage = entry.stage;
        const { score, isHit } = evaluateAcceptedAnswers(expectedAnswers, transcript);
        const card = cardById(entry.id);
        if (inputMode === 'speech') {
          state.stats.speakings += 1;
          saveUserStats();
        }
        updateGameChips();

        if (isHit) {
          entry.stars += 1;
          entry.stage = Math.min(entry.stars + 1, GAME_STAR_TARGET);
          entry.missesWithoutStars = 0;
          entry.typingMistakes = 0;
          if (entry.stars === 4) {
            playMilestoneAudio(FOUR_STARS_SOUND_PATH);
            triggerFourStarGlow();
          } else if (entry.stars === 5) {
            playMilestoneAudio(FIVE_STARS_SOUND_PATH);
          } else {
            playSuccessAudio();
          }
          renderImmediateHitFeedback(entry.stars);

          if (entry.stars >= GAME_STAR_TARGET) {
            const rewardSealPhase = resolveRewardSealPhase(entry);
            setGameStatus('', 'hit');
            renderStars(GAME_STAR_TARGET);
            renderCurrentCard();
            triggerWinFlash();
            animateStarsCascade(GAME_STAR_TARGET);
            schedulePendingRewardSeal(entry.id, rewardSealPhase);
            setGameStatus(`${accessibleFlashcardsCount()} FlashCards`, 'flashcards-count');
            promoteCardFromWin(entry);
            updateGameChips();
            if (!state.user?.id
              && accessibleCountBeforeResolution < GUEST_FLASHCARD_LOGIN_THRESHOLD
              && accessibleFlashcardsCount() >= GUEST_FLASHCARD_LOGIN_THRESHOLD) {
              scheduleGuestAuthRequirement();
            }
            if (shouldGatePremiumAccess()) {
              setPremiumStatus('Voce chegou em 8 cartas. Digite uma chave premium.');
            }
            setGameStatus(`${accessibleFlashcardsCount()} FlashCards`, 'flashcards-count');
            entry._removeAfterReward = true;
          } else {
            setGameStatus('', 'hit');
            state.game.queue.push(entry.id);
          }
        } else {
          if (evaluatedStage === 2) {
            showStageTwoPortugueseHint(card);
          }
          if (entry.stars > 0) {
            const starsBeforeMiss = entry.stars;
            entry.stars = 0;
            entry.stage = 1;
            entry.missesWithoutStars = 0;
            entry.typingMistakes = 0;
            setGameStatus('', 'miss');
            state.game.queue.push(entry.id);
            await animateStarLossSequence(starsBeforeMiss, card);
          } else {
            entry.missesWithoutStars += 1;
            if (entry.missesWithoutStars >= 3) {
              setGameStatus('', 'miss');
              removeGameEntry(entry.id);
              refillGameEntry(entry.pool);
            } else {
              setGameStatus('', 'miss');
              state.game.queue.push(entry.id);
            }
          }
        }

        if (evaluatedStage === 3) {
          state.game.skipAutoAudioOnce = true;
        }
        await playStageResponseSequence(evaluatedStage, card);
        await wait(entry._removeAfterReward || entry._requeueAfterReward ? 1500 : (evaluatedStage === 3 ? 120 : 1200));
        if (state.game.active && state.game.tutorial.active && isTutorialPlanetCard(entry.id) && entry._removeAfterReward) {
          entry._removeAfterReward = false;
          await finishTutorialAndStartNormalGame();
          return;
        }
        if (state.game.active) {
          if (entry._requeueAfterReward) {
            entry._requeueAfterReward = false;
            state.game.queue.push(entry.id);
          }
          if (entry._removeAfterReward) {
            entry._removeAfterReward = false;
            removeGameEntry(entry.id);
            if (shouldGatePremiumAccess()) {
              openPremiumGate();
              await exitGame();
              return;
            }
            const targetActiveCount = activeCountBeforeResolution >= GAME_ACTIVE_CARD_CAP
              ? GAME_ACTIVE_CARD_CAP
              : Math.min(GAME_ACTIVE_CARD_CAP, activeCountBeforeResolution + 1);
            while (state.game.entries.size < targetActiveCount) {
              if (!refillGameEntry(entry.pool, targetActiveCount)) {
                break;
              }
            }
          }
          advanceToNextCard();
        }
      }

      async function startRecognition() {
        if (!state.game.active || state.game.transitioning || state.game.listening || state.game.paused) return;
        const entry = state.game.currentId ? state.game.entries.get(state.game.currentId) : null;
        if (!entry) return;
        if (entry.stage === 4) return;

        if (!recognitionCtor) {
          setGameStatus('', 'miss');
          return;
        }

        cleanupGameRecognition();
        stopActiveAudio();
        state.game.listening = true;
        els.gameTouchBtn.classList.add('is-busy');
        els.gameCard.classList.add('is-listening');
        els.gameVisual.classList.add('is-mic-live');
        setGameStatus('', 'live');

        const recognitionLanguage = entry.stage === 2 ? 'pt-BR' : 'en-US';

        const recognition = new recognitionCtor();
        state.game.recognition = recognition;
        let finished = false;
        let gotResult = false;
        let hadError = false;
        let retryTimer = 0;
        let partialTranscript = '';
        const resolveRecognitionTranscript = (results) => Array.from(results || []).reduce((best, result) => {
          const transcript = Array.from(result || []).reduce((candidate, alternative) => {
            const nextTranscript = safeText(alternative?.transcript || '');
            return nextTranscript.length > candidate.length ? nextTranscript : candidate;
          }, '');
          return transcript.length > best.length ? transcript : best;
        }, '');
        const finish = () => {
          if (finished) return;
          finished = true;
          if (retryTimer) {
            window.clearTimeout(retryTimer);
            retryTimer = 0;
          }
          if (state.game.recognition === recognition) {
            state.game.recognition = null;
          }
          state.game.listening = false;
          state.game.canListen = entry.stage === 1 ? Boolean(gotResult) : true;
          els.gameTouchBtn.classList.remove('is-busy');
          renderGameTouchButton(STAGES[entry.stage] || STAGES[1], entry);
          els.gameCard.classList.remove('is-listening');
          els.gameVisual.classList.remove('is-mic-live');
        };

        recognition.lang = recognitionLanguage;
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.maxAlternatives = 5;

        recognition.onresult = async (event) => {
          const transcript = resolveRecognitionTranscript(event.results);
          if (transcript) {
            partialTranscript = transcript;
          }
          const hasFinalResult = Array.from(event.results || []).some(result => result?.isFinal);
          if (!hasFinalResult) return;
          gotResult = true;
          finish();
          await handleRecognitionResult(partialTranscript || transcript);
        };

        recognition.onerror = async (event) => {
          const errorCode = safeText(event?.error || '').toLowerCase();
          hadError = true;
          finish();
          if (partialTranscript) {
            gotResult = true;
            await handleRecognitionResult(partialTranscript);
            return;
          }
          if (errorCode === 'no-speech' || errorCode === 'audio-capture') {
            if (state.game.active && state.game.currentId === entry.id) {
              state.game.canListen = true;
              renderGameTouchButton(STAGES[entry.stage] || STAGES[1], entry);
              setGameStatus('Toque para falar', 'live');
            }
            return;
          }
          setGameStatus('', 'miss');
          state.game.queue.push(entry.id);
          window.setTimeout(() => {
            if (state.game.active) advanceToNextCard();
          }, 900);
        };

        recognition.onend = async () => {
          finish();
          if (!gotResult && partialTranscript && state.game.active && state.game.currentId === entry.id) {
            gotResult = true;
            await handleRecognitionResult(partialTranscript);
            return;
          }
          if (!gotResult && !hadError && state.game.active && state.game.currentId === entry.id) {
            state.game.canListen = true;
            renderGameTouchButton(STAGES[entry.stage] || STAGES[1], entry);
          }
        };

        try {
          recognition.start();
          retryTimer = window.setTimeout(() => {
            if (finished) return;
            finish();
            if (state.game.active && state.game.currentId === entry.id) {
              state.game.canListen = true;
              renderGameTouchButton(STAGES[entry.stage] || STAGES[1], entry);
              setGameStatus('', 'live');
            }
          }, 10000);
        } catch (_error) {
          finish();
          setGameStatus('', 'miss');
        }
      }

      function bindEvents() {
        els.welcomeTouch?.addEventListener('click', requestWelcomeTutorialStart);
        els.authModeLogin.addEventListener('click', () => {
          setAuthMode('login');
          els.authCopy.textContent = authCopyText();
        });
        els.authModeRegister.addEventListener('click', () => {
          setAuthMode('register');
          els.authCopy.textContent = authCopyText();
        });
        els.authForm.addEventListener('submit', submitAuthForm);
        els.logoutBtn?.addEventListener('click', logoutCurrentUser);
        els.watchFlashcardsBtn?.addEventListener('click', openWatchPopover);
        els.closeWatchPopoverBtn?.addEventListener('click', closeWatchPopover);
        els.startWatchBtn?.addEventListener('click', startWatch);
        els.watchScopeSelect?.addEventListener('change', (event) => {
          state.watch.scope = event.target.value === 'mine' ? 'mine' : 'all';
          renderWatchDeckPicker();
        });
        els.watchDeckGrid?.addEventListener('click', (event) => {
          const toggle = event.target.closest('[data-watch-source]');
          if (!toggle) return;
          toggleWatchDeckSource(toggle.dataset.watchSource || '');
        });
        els.exitWatchBtn?.addEventListener('click', stopWatch);
        els.stopWatchBtn?.addEventListener('click', stopWatch);
        els.startGameBtn?.addEventListener('click', openGameSetup);
        els.exitGameBtn.addEventListener('click', exitGame);
        els.libraryPrevBtn?.addEventListener('click', () => {
          state.libraryPage -= 1;
          refreshLibrary();
        });
        els.libraryNextBtn?.addEventListener('click', () => {
          state.libraryPage += 1;
          refreshLibrary();
        });
        els.adminDeckSelect?.addEventListener('change', (event) => {
          state.admin.selectedDeckSource = safeText(event.target.value);
          state.libraryPage = 1;
          refreshLibrary();
        });
        els.adminReportFilter?.addEventListener('change', (event) => {
          state.admin.reportFilter = safeText(event.target.value);
          state.libraryPage = 1;
          refreshLibrary();
        });
        els.adminPromptInput?.addEventListener('input', (event) => {
          state.admin.prompt = String(event.target.value || '').trim();
        });
        els.adminPasteTextBtn?.addEventListener('click', runAdminPasteText);
        els.adminSubmitPasteBtn?.addEventListener('click', runAdminPasteText);
        els.adminCreateDeckBtn?.addEventListener('click', runAdminCreateDeck);
        els.adminSaveBtn?.addEventListener('click', runAdminSaveDrafts);
        els.adminCreateCardsBtn?.addEventListener('click', runAdminCreateCards);
        els.adminFillTextBtn?.addEventListener('click', () => runAdminFlashcardFill('text'));
        els.adminFillImageBtn?.addEventListener('click', () => runAdminFlashcardFill('image'));
        els.adminMagicBtn?.addEventListener('click', () => runAdminFlashcardFill('magic'));
        els.adminFillAudioBtn?.addEventListener('click', () => runAdminFlashcardFill('audio'));
        els.adminDeleteImageBtn?.addEventListener('click', () => runAdminCardAssetDelete('image'));
        els.adminDeleteAudioBtn?.addEventListener('click', () => runAdminCardAssetDelete('audio'));
        els.adminDeleteCardBtn?.addEventListener('click', runAdminCardDelete);
        els.adminClosePopoverBtn?.addEventListener('click', closeAdminCardPopover);
        els.adminCardPopover?.addEventListener('click', (event) => {
          if (event.target === els.adminCardPopover) {
            closeAdminCardPopover();
          }
        });
        const gameShell = els.game.querySelector('.game-shell');
        gameShell?.addEventListener('click', (event) => {
          if (!state.game.active) return;
          if (event.target.closest('.btn-close')) return;
          if (event.target.closest('.flashcards-typing')) return;
          if (event.target.closest('.game-report-trigger')) return;
          startRecognition();
        });
        els.gameReportTrigger?.addEventListener('click', openGameReportMenu);
        els.closeGameReportBtn?.addEventListener('click', closeGameReportMenu);
        els.gameReportMenu?.addEventListener('click', (event) => {
          if (event.target === els.gameReportMenu) {
            closeGameReportMenu();
          }
        });
        els.flashcardsHomeToggle.addEventListener('click', () => {
          document.body.classList.toggle('flashcards-home-collapsed');
          els.flashcardsHomeToggle.setAttribute(
            'aria-label',
            document.body.classList.contains('flashcards-home-collapsed') ? 'Mostrar resumo' : 'Ocultar resumo'
          );
        });
        els.closeGameSetupBtn.addEventListener('click', closeGameSetup);
        els.startTutorialBtn?.addEventListener('click', beginTutorialGame);
        Array.from(els.gameSetupOptions.querySelectorAll('[data-game-count]')).forEach((button) => {
          button.addEventListener('click', () => {
            const count = normalizeGameCount(button.getAttribute('data-game-count'));
            if (!count) return;
            saveSelectedGameCount(count);
            beginGame();
          });
        });
        els.game.addEventListener('click', (event) => {
          if (event.target === els.game) {
            exitGame();
          }
        });
        els.gameSetup.addEventListener('click', (event) => {
          if (event.target === els.gameSetup) {
            closeGameSetup();
          }
        });
        els.watchPopover.addEventListener('click', (event) => {
          if (event.target === els.watchPopover) {
            closeWatchPopover();
          }
        });
        els.watch.addEventListener('click', (event) => {
          if (event.target === els.watch) {
            stopWatch();
          }
        });
        els.premiumGrid?.addEventListener('click', (event) => {
          const tile = event.target.closest('[data-letter]');
          if (!tile) return;
          appendPremiumCodeLetter(tile.getAttribute('data-letter'));
        });
        els.premiumBackspaceBtn?.addEventListener('click', () => {
          if (state.ui.premiumBusy) return;
          state.ui.premiumCode = state.ui.premiumCode.slice(0, -1);
          renderPremiumCode();
        });
        els.premiumClearBtn?.addEventListener('click', () => {
          if (state.ui.premiumBusy) return;
          state.ui.premiumCode = '';
          setPremiumStatus('Toque nas imagens na ordem certa para digitar a chave.');
        });
        els.premiumCloseBtn?.addEventListener('click', () => {
          closePremiumGate();
        });
        window.addEventListener('keydown', (event) => {
          if (state.ui.premiumGateOpen && event.key === 'Backspace') {
            event.preventDefault();
            if (!state.ui.premiumBusy) {
              state.ui.premiumCode = state.ui.premiumCode.slice(0, -1);
              renderPremiumCode();
            }
            return;
          }
          if (state.ui.premiumGateOpen && /^[a-p]$/i.test(event.key || '')) {
            event.preventDefault();
            appendPremiumCodeLetter(event.key);
            return;
          }
          if (event.key && event.key.length === 1) {
            state.secretBuffer = `${state.secretBuffer}${event.key.toLowerCase()}`.slice(-SECRET_TIME_CODE.length);
            if (state.secretBuffer === SECRET_TIME_CODE) {
              state.secretBuffer = '';
              const typedMinutes = window.prompt('Quantos minutos?', '60');
              const minutes = Number.parseFloat(String(typedMinutes || '').replace(',', '.'));
              if (Number.isFinite(minutes) && minutes !== 0) {
                state.timeOffsetMs += Math.round(minutes * 60 * 1000);
                saveTimeOffsetMs();
                advanceReadyMemorizations();
                refreshLibrary();
              }
            }
          }
          if (event.key === 'Escape' && state.ui.premiumGateOpen) {
            closePremiumGate();
          } else if (event.key === 'Escape' && els.gameReportMenu?.classList.contains('is-visible')) {
            closeGameReportMenu();
          } else if (event.key === 'Escape' && state.game.active) {
            exitGame();
          } else if (event.key === 'Escape' && els.gameSetup.classList.contains('is-visible')) {
            closeGameSetup();
          } else if (event.key === 'Escape' && state.watch.active) {
            stopWatch();
          }
        });
        window.addEventListener('focus', () => {
          if (!state.user) return;
          reloadCardsFromNetwork().catch(() => {});
        });
        document.addEventListener('visibilitychange', () => {
          if (!state.user || document.hidden) return;
          reloadCardsFromNetwork().catch(() => {});
        });
        els.gameTouchBtn.addEventListener('click', (event) => {
          event.stopPropagation();
          startRecognition();
        });
        els.footerPlayBtn?.addEventListener('click', () => {
          void navigateToMainView('play');
        });
        els.footerCardsBtn?.addEventListener('click', () => {
          window.location.href = '/mycards';
        });
        els.footerUsersBtn?.addEventListener('click', () => {
          window.location.href = '/users';
        });
        els.footerProfileBtn?.addEventListener('click', () => {
          window.location.href = '/account';
        });
        els.profileForm?.addEventListener('submit', submitProfileForm);
        els.profileLogoutBtn?.addEventListener('click', logoutCurrentUser);
        els.profileAvatarInput?.addEventListener('change', async (event) => {
          const file = event.target?.files?.[0];
          if (!file) return;
          try {
            state.ui.profileAvatarDraft = await fileToDataUrl(file);
            renderProfilePanel();
            setProfileStatus('');
          } catch (error) {
            setProfileStatus(error?.message || 'Nao foi possivel ler a imagem.', 'error');
          }
        });
      }

      async function init() {
        const searchParams = new URLSearchParams(window.location.search);
        const requestedView = searchParams.get('view');
        const requestedPremiumOpen = searchParams.get('premium') === '1';
        state.timeOffsetMs = readTimeOffsetMs();
        loadSelectedGameCount();
        syncWatchControls();
        bindEvents();
        setAuthMode('login');
        els.authCopy.textContent = authCopyText();
        if (els.usersLink) {
          els.usersLink.setAttribute('href', resolveUsersHref());
        }
        hideAuthGate();
        preloadTutorialFinaleSeals();
        syncWelcomeGate();
        renderMetrics();
        renderProfilePanel();
        renderPremiumCode();
        updateGameChips();
        renderMiniCards(els.allGrid, [], 'Entre para carregar seus flashcards.');
        syncAdminTools();
        renderAdminPublishBar();
        els.flashcardsHomeToggle.setAttribute('aria-label', 'Mostrar resumo');
        switchMainView('cards');

        const gameHeadCopy = els.gameHeaderCopy?.parentElement || null;
        if (gameHeadCopy) {
          gameHeadCopy.classList.add('game-head__copy', 'is-hidden');
        }
        els.gameStep.classList.add('is-hidden');
        els.gameStatus.classList.add('is-hidden');
        els.gameStarCopy.classList.add('is-hidden');

        try {
          try {
            await loadCards();
          } catch (cardsError) {
            console.warn('Falha ao carregar os decks na inicializacao:', cardsError);
            state.allCards = readCachedCards();
            state.deckCatalog = [];
          } finally {
            state.entry.cardsReady = true;
            refreshLibrary();
            syncWelcomeGate();
            tryStartPendingTutorial();
          }
          const sessionUser = await fetchSessionUser();
          if (sessionUser) {
            await hydrateAuthenticatedApp(sessionUser, { skipLoadCards: true });
          } else {
            await handleLoggedOutState('');
          }
          if (!recognitionCtor) {
            if (els.startGameBtn) {
              const startGameLabel = els.startGameBtn.querySelector('.btn__label');
              if (startGameLabel) {
                startGameLabel.textContent = 'Jogar sem mic';
              } else {
                els.startGameBtn.textContent = 'Jogar sem mic';
              }
            }
          }
        } catch (error) {
          console.warn('Falha ao iniciar flashcards:', error);
          state.entry.cardsReady = true;
          await handleLoggedOutState('');
        }

        if (requestedPremiumOpen) {
          switchMainView('cards');
          openPremiumGate();
        } else if (requestedView === 'play') {
          switchMainView('play');
          openGameSetup();
        } else {
          switchMainView('cards');
        }
      }

      init();
    })();
  
