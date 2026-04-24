    (() => {
      const FLASHCARDS_R2_PUBLIC_ROOT = window.PlaytalkApi?.publicAssetsRoot || 'https://pub-1208463a3c774431bf7e0ddcbd3cf670.r2.dev';
      const ACCESSKEY_PUBLIC_ROOT = window.PlaytalkApi?.accesskeyUrl('') || `${FLASHCARDS_R2_PUBLIC_ROOT}/accesskey`;
      const AUDIOSTUTO_PUBLIC_ROOT = window.PlaytalkApi?.audiostutoUrl('') || `${FLASHCARDS_R2_PUBLIC_ROOT}/audiostuto`;
      const FLASHCARDS_LOCAL_SOURCE_PREFIX = 'allcards';
      const FLASHCARD_CAMERA_OBJECT_KEY = 'FlashCards/camera.webp';
      const FLASHCARD_CAMERA_IMAGE_URL = `${FLASHCARDS_R2_PUBLIC_ROOT}/${FLASHCARD_CAMERA_OBJECT_KEY}`;
      const DATA_MANIFEST_REMOTE_PATH = '/api/flashcards/manifest';
      const OWNED_STORAGE_KEY = 'playtalk-flashcards-owned-v2';
      const CARDS_CACHE_STORAGE_KEY = 'playtalk-flashcards-cards-v3-postgres';
      const USER_PROGRESS_STORAGE_KEY = 'playtalk-flashcards-progress-v3';
      const USER_HIDDEN_STORAGE_KEY = 'playtalk-flashcards-hidden-v1';
      const USER_STATS_STORAGE_KEY = 'playtalk-flashcards-stats-v1';
      const TUTORIAL_PROGRESS_STORAGE_KEY = 'playtalk-flashcards-tutorial-v1';
      const GAME_SESSION_STORAGE_KEY = 'playtalk-flashcards-game-session-v1';
      const SECOND_STAGE_TUTORIAL_DONE_STORAGE_KEY = 'playtalk-second-stage-tutorial-done-v1';
      const TIME_OFFSET_STORAGE_KEY = 'playtalk-flashcards-time-offset-v1';
      const TRAINING_TIME_PER_CARD_LIMIT_MS = 10000;
      const PRONUNCIATION_SAMPLE_LIMIT = 200;
      const AUTH_TOKEN_STORAGE_KEY = 'playtalk_auth_token';
      const SOUND_TEST_COMPLETED_STORAGE_KEY = 'playtalk-soundcheck-completed';
      const SOUND_TEST_LAUNCH_TARGET_STORAGE_KEY = 'playtalk-soundcheck-launch-target';
      const recognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition || null;
      function getNativeSpeechRecognition() {
        const nativeSpeech = window.PlaytalkNativeSpeech;
        if (!nativeSpeech) return null;
        if (typeof nativeSpeech.isSupported === 'function' && !nativeSpeech.isSupported()) {
          return null;
        }
        return nativeSpeech;
      }

      function getOpenAiSpeechRecognition() {
        const openAiSpeech = window.PlaytalkOpenAiStt;
        if (!openAiSpeech) return null;
        if (typeof openAiSpeech.isSupported === 'function' && !openAiSpeech.isSupported()) {
          return null;
        }
        if (typeof openAiSpeech.captureAndTranscribe !== 'function') {
          return null;
        }
        return openAiSpeech;
      }

      function hasSpeechRecognitionSupport() {
        return Boolean(recognitionCtor || getNativeSpeechRecognition() || getOpenAiSpeechRecognition());
      }
      const STAR_ICON_PATH = 'SVG/codex-icons/star.svg';
      const ENGLISH_ICON_PATH = 'SVG/codex-icons/ingles.svg';
      const GAME_TOUCH_ICON_STORAGE_KEY = 'playtalk-game-touch-icon-v1';
      const GAME_TOUCH_ICON_MARKUP = '<svg class="game-touch__books-mic-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 15a3 3 0 0 0 3-3V7a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3m5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-2.08A7 7 0 0 0 19 12z"/></svg>';
      const PORTUGUESE_ICON_PATH = 'SVG/codex-icons/portugues.svg';
      const SUCCESS_SOUND_PATH = 'gamesounds/success.mp3';
      const FOUR_STARS_SOUND_PATH = 'newsongs/4stars.mp3';
      const FIVE_STARS_SOUND_PATH = 'newsongs/5stars.mp3';
      const SECOND_STAR_ERROR_SOUND_PATH = 'flashcard-audio-cues/second-star-error.mp3';
      const TYPE_PORTUGUESE_SOUND_PATH = 'flashcard-audio-cues/typeportuguese.mp3';
      const ACCESSKEY_ERROR_SOUND_PATH = 'https://fluentlevelup.com/error.mp3';
      const LESS_SOUND_PATH = 'svgnovo/less.wav';
      const REPORT_SOUND_PATH = 'thesongs/report.wav';
      const TYPING_KEY_SOUND_PATH = 'sounds/type.mp3';
      const TYPING_KEY_FLASH_MS = 500;
      const TYPING_PROMPT_REPEAT_DELAY_MS = 2000;
      const TYPING_SKIP_LETTER_DELAY_MS = 350;
      const TYPING_SKIP_PROMPT_REPEATS = 2;
      const TYPING_SKIP_PROMPT_RATE = 0.8;
      const STAGE_TUTORIAL_ONE_IMAGE_PATH = 'images/tutorial1.png';
      const STAGE_TUTORIAL_TWO_IMAGE_PATH = 'images/tutorial2.png';
      const STAGE_TUTORIAL_ONE_REMINDER_MS = 12000;
      const STAGE_TUTORIAL_TWO_REMINDER_MS = 15000;
      const ENABLE_STAGE_TUTORIALS = false;
      const STAGE_TWO_HINT_DELAY_MS = 2000;
      const STAGE_TWO_HINT_VISIBLE_MS = 3000;
      const ONBOARDING_GATE_TRANSITION_MS = 2000;
      const ONBOARDING_GATE_OPEN_DELAY_MS = 4000;
      const WATCH_SETTINGS_KEY = 'playtalk-flashcards-watch-v1';
      const FLASHCARDS_PAGE_SIZE = 30;
      const ADMIN_USERNAMES = new Set(['admin', 'adm', 'adminst']);
      const BALANCE_TRACKS = ['zen1.mp3', 'zen2.mp3', 'zen3.mp3', 'zen4.mp3'];
      const BALANCE_TRACK_ROOT = 'https://pub-1208463a3c774431bf7e0ddcbd3cf670.r2.dev/musicas';
      const TYPING_KEY_BLUES = ['#6ebcff', '#76c3ff', '#7dc9ff', '#86ceff', '#8fd4ff', '#98d9ff'];
      const DEFAULT_GAME_CONTEXT_LIMIT = 12;
      const USER_LEVEL_MIN = 1;
      const USER_LEVEL_MAX = 100;
      const CURRENT_LEVEL_ROUND_RATIO = 0.4;
      const MIN_GAME_CONTEXT_LIMIT = 1;
      const TRAINING_MIN_CARD_COUNT = 10;
      const TRAINING_MAX_CARD_COUNT = 500;
      const TRAINING_CARD_STEP = 10;
      const GAME_STAR_TARGET = 5;
      const REVIEW_SLOT_LIMIT = 8;
      const GAME_UPCOMING_PRELOAD_COUNT = 3;
      const GAME_MIC_UNLOCK_DELAY_MS = 1200;
      const TUTORIAL_AUDIO_ROOT = AUDIOSTUTO_PUBLIC_ROOT;
      const TUTORIAL_NORMAL_GAME_COUNT = 1;
      const TUTORIAL_PLANET_IMAGE_NAME = 'planet.jpg';
      const TUTORIAL_PLANET_IMAGE_URL = '/accesskey/planet.jpg';
      const TUTORIAL_PLANET_ENGLISH = 'planet';
      const TUTORIAL_PLANET_PORTUGUESE = 'planeta';
      const EARLY_FLASHCARD_PLAYER_LIMIT = 20;
      const EARLY_FLASHCARD_MAX_CHARACTERS = 12;
      const TUTORIAL_FINALE_SEAL_FLASH_MS = 400;
      const TUTORIAL_LAUNCH_SESSION_KEY = 'playtalk-flashcards-launch-tutorial-consumed';
      const GUEST_FLASHCARD_LOGIN_THRESHOLD = 999999;
      const FLASHCARD_PREMIUM_GATE_LIMIT = Number.POSITIVE_INFINITY;
      const GUEST_FLASHCARD_LOGIN_DELAY_MS = 5000;
      const AUTH_GATE_FORM_REVEAL_MS = 1200;
      const WELCOME_COPY_ROTATION_MS = 2000;
      const WELCOME_COPY_MESSAGES = ['Flu\u00eancia f\u00e1cil', 'Toque para come\u00e7ar'];
      const LEGACY_FLASHCARDS_HOME_ENABLED = false;
      const SOUND_TEST_COPY_ROTATION_MS = 1500;
      const SOUND_TEST_SUBTITLE_MESSAGES = ['Toque no que est\u00e1 ouvindo', 'Ajuste o volume'];
      const SOUND_TEST_SELECTION_COUNT = 3;
      const ACCESS_KEY_LETTERS = 'ABCDEFGHIJKLMNOP'.split('');
      const LIBRARY_RANK_SWAP_DELAY_MS = 2000;
      const REWARD_RANK_VISIBLE_MS = 2000;
      const FIFTH_STAR_HINT_ROTATION_MS = 1500;
      const FIFTH_STAR_HINT_MESSAGES = [];
      const THIRD_STAR_HINT_MESSAGES = [];
      const FIRST_STAGE_MIC_HINT_DELAY_MS = 6000;
      const FIRST_STAGE_MIC_HINT_ROTATION_MS = 2400;
      const FIRST_STAGE_MIC_HINT_MESSAGES = [
        { html: 'Toque no <span class="game-status__hint-blue">microfone</span>' },
        { html: 'Espere ficar <span class="game-status__hint-green">verde</span>' },
        { html: 'Fale <span class="game-status__hint-red">ingl�s</span>' }
      ];
      const SECOND_STAR_IDLE_HINT_DELAY_MS = 4000;
      const SECOND_STAR_IDLE_HINT_ROTATION_MS = 750;
      const SECOND_STAR_IDLE_HINT_MESSAGES = ['Digite ingles', 'Type english'];
      const REWARD_STATUS_ICON_PATHS = {
        same: `${ACCESSKEY_PUBLIC_ROOT}/same.svg`,
        up: `${ACCESSKEY_PUBLIC_ROOT}/up.svg`,
        down: `${ACCESSKEY_PUBLIC_ROOT}/down.svg`
      };
      const REWARD_STATUS_UP_AUDIO_PATH = `${ACCESSKEY_PUBLIC_ROOT}/up.mp3`;
      const NEXT_CARD_WOOSH_AUDIO_PATH = `${ACCESSKEY_PUBLIC_ROOT}/woosh.mp3`;
      const ACCESS_KEY_AUDIO_LIMIT_PATH = `${ACCESSKEY_PUBLIC_ROOT}/limit.mp3`;
      const ACCESS_KEY_AUDIO_MESSAGE_PATH = `${ACCESSKEY_PUBLIC_ROOT}/message.wav`;
      const ACCESS_KEY_AUDIO_INVALID_PATH = `${ACCESSKEY_PUBLIC_ROOT}/invalidkey2.mp3`;
      const ONBOARDING_USERNAME_AUDIO_PATH = `${ACCESSKEY_PUBLIC_ROOT}/username.mp3`;
      const ONBOARDING_PHOTO_AUDIO_PATH = `${ACCESSKEY_PUBLIC_ROOT}/photo.mp3`;
      const ONBOARDING_PHOTO_RECEIVED_AUDIO_PATH = `${ACCESSKEY_PUBLIC_ROOT}/photorecieve.mp3`;
      const ONBOARDING_IMAGE_READY_AUDIO_PATH = `${ACCESSKEY_PUBLIC_ROOT}/imageready.mp3`;
      const ACCESS_KEY_AUDIO_SUCCESS_PATHS = {
        semana: `${ACCESSKEY_PUBLIC_ROOT}/week.mp3`,
        mes: `${ACCESSKEY_PUBLIC_ROOT}/month.mp3`,
        ano: `${ACCESSKEY_PUBLIC_ROOT}/year.mp3`
      };
      const ONBOARDING_NAME_THRESHOLD = 2;
      const ONBOARDING_PHOTO_THRESHOLD = 999999;
      const ONBOARDING_MIN_NAME_LENGTH = 3;
      const ONBOARDING_MAX_PHOTO_GENERATIONS = 5;
      const ONBOARDING_KEYBOARD_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUV'.split('');
      const ONBOARDING_LOADING_MESSAGES = [
        'Analisando a imagem enviada...',
        'Detectando estrutura facial e proporcoes...',
        'Identificando olhos e expressao...',
        'Analisando cabelo, textura e volume...',
        'Extraindo cores principais e iluminacao...',
        'Interpretando expressao e vibe emocional...',
        'Simplificando tracos para estilo ilustrado...',
        'Aplicando caracteristicas animadas...',
        'Ajustando luz, profundidade e foco...',
        'Renderizando sua versao fiel...'
      ];
      const FLASHCARD_REPORT_TYPES = [
        { key: 'blurred-image', label: 'Imagem borrada' },
        { key: 'weak-association', label: 'Associacao fraca' },
        { key: 'wrong-audio', label: 'Audio errado' },
        { key: 'wrong-text', label: 'Texto errado' },
        { key: 'hide-card', label: 'Nao quero ver isso' }
      ];
      const FLASHCARD_REPORT_LABELS = Object.fromEntries(FLASHCARD_REPORT_TYPES.map((item) => [item.key, item.label]));
      const FLASHCARD_REPORT_ICONS = {
        'blurred-image': '<svg class="game-report-menu__icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16v10H4z"></path><circle cx="9" cy="11" r="1.8"></circle><path d="M12 15l2.5-2.5L18 16"></path></svg>',
        'weak-association': '<svg class="game-report-menu__icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 7l-2 2a3 3 0 0 0 0 4 3 3 0 0 0 4 0l2-2"></path><path d="M14 17l2-2a3 3 0 0 0 0-4 3 3 0 0 0-4 0l-2 2"></path><line x1="9" y1="15" x2="15" y2="9"></line></svg>',
        'wrong-audio': '<svg class="game-report-menu__icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 10h4l5-4v12l-5-4H5z"></path><line x1="17" y1="9" x2="21" y2="15"></line><line x1="21" y1="9" x2="17" y2="15"></line></svg>',
        'wrong-text': '<svg class="game-report-menu__icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6h14"></path><path d="M5 12h8"></path><path d="M5 18h6"></path><line x1="16" y1="11" x2="21" y2="16"></line><line x1="21" y1="11" x2="16" y2="16"></line></svg>',
        'hide-card': '<svg class="game-report-menu__icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6z"></path><line x1="4" y1="4" x2="20" y2="20"></line></svg>'
      };
      const REVIEW_SCALE_VERSION = 3;
      const REVIEW_PHASE_MAX = 6;
      const REVIEW_PHASES = {
        1: { key: 'first-star', label: 'First star', durationMs: 6 * 60 * 60 * 1000, sealPath: 'medalhas/prata.png' },
        2: { key: 'second-star', label: 'Second star', durationMs: 34 * 60 * 60 * 1000, sealPath: 'medalhas/quartz.png' },
        3: { key: 'emerald-star', label: 'Emerald star', durationMs: 4 * 24 * 60 * 60 * 1000, sealPath: 'medalhas/emerald.png' },
        4: { key: 'third-star', label: 'Third star', durationMs: 10 * 24 * 60 * 60 * 1000, sealPath: 'medalhas/platina.png' },
        5: { key: 'fourth-star', label: 'Fourth star', durationMs: 20 * 24 * 60 * 60 * 1000, sealPath: 'medalhas/ouro.png' },
        6: { key: 'fifth-star', label: 'Fifth star', durationMs: 45 * 24 * 60 * 60 * 1000, sealPath: 'medalhas/diamante.png' }
      };

      const STAGES = {
        1: { key: 'first-star', badge: 'First star', instruction: 'Fale ingles', showImage: true, showWord: true, wordType: 'english', subtitleType: 'portuguese', expected: 'english', autoAudio: true },
        2: { key: 'second-star', badge: 'Second star', instruction: 'Escreva ingles', showImage: true, showWord: false, subtitleType: 'none', expected: 'english', autoAudio: false, inputMode: 'typing', typingMode: 'english' },
        3: { key: 'third-star', badge: 'Third star', instruction: 'Fale ingles', showImage: true, showWord: false, wordType: 'portuguese', subtitleType: 'none', expected: 'english', autoAudio: false, placeholderUsesPortuguese: false, revealOnHit: false },
        4: { key: 'fourth-star', badge: 'Fourth star', instruction: 'Escreva ingles', showImage: true, showWord: false, subtitleType: 'none', expected: 'english', autoAudio: false, inputMode: 'typing', typingMode: 'english' },
        5: { key: 'fifth-star', badge: 'Fifth star', instruction: 'Fale ingles', showImage: true, showWord: false, subtitleType: 'none', expected: 'english', autoAudio: false }
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
          muteNarration: false,
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

      if (window.PlaytalkApi && typeof window.PlaytalkApi.rewritePublicAssetSources === 'function') {
        window.PlaytalkApi.rewritePublicAssetSources(document);
      }

      const state = {
        allCards: [],
        deckCatalog: [],
        userCards: new Map(),
        hiddenCardIds: new Set(),
        ownedIds: new Set(),
        stats: {
          playTimeMs: 0,
          speakings: 0,
          listenings: 0,
          secondStarErrorHeard: false,
          trainingTimeMs: 0,
          pronunciationSamples: [],
          pronunciationPercent: 0,
          speedFlashcardsPerHour: 0
        },
        timeOffsetMs: 0,
        user: null,
        userLevel: 1,
        lastLevelUpLevel: 0,
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
          welcomeDismissed: false,
          welcomeIndex: 0,
          welcomeTimer: 0,
          launchAfterSoundTest: '',
          soundTestCompleted: false,
          pendingPlayStart: false,
          pendingTutorialStart: false,
          pendingTutorialMuteNarration: false,
          welcomeStartRequested: false,
          authRequired: false,
          authDelayTimer: 0,
          authRevealTimer: 0,
          cardsReloadInFlight: false
        },
        admin: {
          busy: false,
          status: 'Nenhuma acao em andamento.',
          error: false,
          backgroundBusy: false,
          backgroundVariant: '',
          backgroundStatus: '',
          backgroundError: false,
          prompt: '',
          activeCardId: '',
          selectedDeckSource: '',
          decks: [],
          welcomeSummary: null,
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
          footerNavPrimed: false,
          footerNavPrimeKey: '',
          listening: false,
          languageSwapTimer: 0,
          languageSwapFadeTimer: 0,
          stageTwoHintTimer: 0,
          stageOneSwapShowsPortuguese: false,
          activeAudio: null,
          successAudio: null,
          milestoneAudios: new Map(),
          reportAudio: null,
          preloadImages: new Map(),
          preloadAudios: new Map(),
          contextLimit: DEFAULT_GAME_CONTEXT_LIMIT,
          selectedCount: null,
          pendingRewardSeal: null,
          pendingRewardSealTimer: 0,
          skipAutoAudioOnce: false,
          transitioning: false,
          sessionStartedAt: 0,
          currentCardTrainingId: '',
          currentCardTrainingStartedAt: 0,
          canListen: false,
          micUnlockTimer: 0,
          micUnlockCardId: '',
          training: {
            active: false,
            pendingStage: 0,
            stage: 0,
            selectedCount: 0,
            pendingCount: TRAINING_MIN_CARD_COUNT,
            sourceIds: [],
            cycleIndex: 0,
            cycleNumber: 0,
            hitStreak: 0,
            totalHits: 0
          },
          micUnlockStage: 0,
          audioCanBeInterruptedAt: 0,
          typingPromptLoopTimer: 0,
          secondStarIdleHintDelayTimer: 0,
          secondStarIdleHintRotateTimer: 0,
          secondStarIdleHintIndex: 0,
          recognition: null,
          typingKeyAudioPool: [],
          typingKeyAudioIndex: 0,
          typingSkipActive: false,
          typingSkipRunId: 0,
          typingSkipEntryId: '',
          stageTutorialReminderTimer: 0,
          stageHintTimer: 0,
          stageHintIndex: 0,
          firstStageIdleTimer: 0,
          firstStageMicHintTimer: 0,
          firstStageMicHintRotationTimer: 0,
          firstStageMicHintIndex: 0,
          fifthStarHintDismissed: false,
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
          activeView: 'play',
          librarySummaryTimer: 0,
          librarySummaryFlashTimer: 0,
          librarySummaryMode: 'count',
          librarySummaryRank: 0,
          librarySummaryToken: 0,
          profileAvatarDraft: '',
          identityAudio: null,
          nameGateOpen: false,
          nameDraft: '',
          nameKeyboardVariantIndex: 0,
          nameKeyboardTimer: 0,
          nameGateBusy: false,
          photoGateOpen: false,
          photoGateBusy: false,
          photoSourceDataUrl: '',
          photoVersions: [],
          photoVersionIndex: 0,
          photoGenerationCount: 0,
          photoLoadingTimer: 0,
          photoLoadingMessageIndex: 0,
          photoSwipeStartX: 0,
          photoFlashTimer: 0,
          onboardingTransitionActive: false,
          onboardingGateTimer: 0,
          onboardingGateQueued: false,
          gameSwipeStartX: 0,
          gameSwipeStartY: 0,
          gameSwipeTriggeredAt: 0,
          gameStatusRankTimer: 0,
          gameStatusRankToken: 0,
          gameStatusPreviousRank: 0,
          welcomeEnergyBlocked: false,
          welcomeEnergyNextResetAt: '',
          welcomeEnergyTimer: 0,
          gameStageTutorialVisible: false,
          gameStageTutorialKind: '',
          gameStageTutorialDismissHandler: null,
          gameStageTutorialMissingAssets: {
            first: false,
            second: false
          },
          premiumGateOpen: false,
          premiumCode: '',
          premiumStatus: '',
          premiumBusy: false,
          premiumAudioPlayed: false,
          premiumAudio: null,
          soundTestOpen: false,
          soundTestBusy: false,
          soundTestStatus: '',
          soundTestStatusError: false,
          soundTestSubtitleIndex: 0,
          soundTestSubtitleTimer: 0,
          soundTestAudio: null,
          soundTestSelectedLetters: [],
          soundTestTargetLetters: [],
          soundTestPlaybackToken: 0,
          audioCheckLoaded: false,
          audioCheckDeck: {},
          audioCheckTargetWord: '',
          audioCheckTyped: '',
          audioCheckAudio: null,
          audioCheckBusy: false,
          audioCheckIndex: 0,
          micCheckOpen: false,
          micCheckSubtitleIndex: 0,
          micCheckSubtitleTimer: 0,
          micCheckFeedbackIndex: 0,
          micCheckFeedbackTimer: 0,
          micCheckStatus: '',
          micCheckBusy: false,
          micCheckRecognition: null
        }
      };

      const els = {
        welcomeGate: document.getElementById('welcomeGate'),
        welcomeTouch: document.getElementById('welcomeTouch'),
        welcomeLogo: document.getElementById('welcomeLogo'),
        welcomeProfile: document.getElementById('welcomeProfile'),
        welcomeUserName: document.getElementById('welcomeUserName'),
        welcomeAvatarPreview: document.getElementById('welcomeAvatarPreview'),
        welcomeUserLevel: document.getElementById('welcomeUserLevel'),
        welcomeLevelProgressBar: document.getElementById('welcomeLevelProgressBar'),
        welcomeLevelProgressCopy: document.getElementById('welcomeLevelProgressCopy'),
        welcomeTrainingModes: document.getElementById('welcomeTrainingModes'),
        welcomeCopy: document.getElementById('welcomeCopy'),
        welcomeStartBtn: document.getElementById('welcomeStartBtn'),
        welcomeAdminStats: document.getElementById('welcomeAdminStats'),
        welcomeBgAdmin: document.getElementById('welcomeBgAdmin'),
        welcomeBgDesktopBtn: document.getElementById('welcomeBgDesktopBtn'),
        welcomeBgMobileBtn: document.getElementById('welcomeBgMobileBtn'),
        welcomeBgUploadInput: document.getElementById('welcomeBgUploadInput'),
        welcomeBgStatus: document.getElementById('welcomeBgStatus'),
        robotcheck: document.getElementById('robotcheck'),
        appShell: document.querySelector('main.shell'),
        soundTestSubtitle: document.getElementById('soundTestSubtitle'),
        soundTestSlots: document.getElementById('soundTestSlots'),
        soundTestStatus: document.getElementById('soundTestStatus'),
        soundTestKeyboard: document.getElementById('soundTestKeyboard'),
        soundTestAnswer: document.getElementById('soundTestAnswer'),
        soundTestPlayBtn: document.getElementById('soundTestPlayBtn'),
        soundTestInput: document.getElementById('soundTestInput'),
        miccheck: document.getElementById('miccheck'),
        micTestSubtitle: document.getElementById('micTestSubtitle'),
        micTestStatus: document.getElementById('micTestStatus'),
        micTestPlayBtn: document.getElementById('micTestPlayBtn'),
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
        gamePhaseWord: document.getElementById('gamePhaseWord'),
        gameStep: document.getElementById('gameStep'),
        gameStatus: document.getElementById('gameStatus'),
        gameStatusIcon: document.getElementById('gameStatusIcon'),
        flashcardLevelProgress: document.getElementById('flashcardLevelProgress'),
        flashcardLevelProgressBar: document.getElementById('flashcardLevelProgressBar'),
        gameStars: document.getElementById('gameStars'),
        gameLanguageBtn: document.getElementById('gameLanguageBtn'),
        gameTouchBtn: document.getElementById('gameTouchBtn'),
        gameAdvanceBtn: document.getElementById('gameAdvanceBtn'),
        gameTypingKeyboard: document.getElementById('gameTypingKeyboard'),
        gameStageTutorial: document.getElementById('gameStageTutorial'),
        gameStageTutorialImage: document.getElementById('gameStageTutorialImage'),
        gameHeadCopy: document.getElementById('gameHeadCopy'),
        gameStarsWrap: document.getElementById('gameStarsWrap'),
        gameTranslationSlot: document.getElementById('gameTranslationSlot'),
        gameResultsScreen: document.getElementById('gameResultsScreen'),
        gameStatusSlot: document.getElementById('gameStatusSlot'),
        gameKeyboardHost: document.getElementById('gameKeyboardHost'),
        gameControlsProxy: document.getElementById('gameControlsProxy'),
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
          gameSetupTitle: document.getElementById('gameSetupTitle'),
          gameSetupCopy: document.getElementById('gameSetupCopy'),
          trainingCountPicker: document.getElementById('trainingCountPicker'),
          trainingCountValue: document.getElementById('trainingCountValue'),
          trainingCountDownBtn: document.getElementById('trainingCountDownBtn'),
          trainingCountUpBtn: document.getElementById('trainingCountUpBtn'),
          trainingStartBtn: document.getElementById('trainingStartBtn'),
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
        premiumGrid: document.getElementById('premiumGrid'),
        nameGate: document.getElementById('nameGate'),
        nameGateDisplay: document.getElementById('nameGateDisplay'),
        nameGateKeyboard: document.getElementById('nameGateKeyboard'),
        nameGateSpaceBtn: document.getElementById('nameGateSpaceBtn'),
        nameGateContinueBtn: document.getElementById('nameGateContinueBtn'),
        nameGateStatus: document.getElementById('nameGateStatus'),
        nameGateCard: document.querySelector('#nameGate .identity-gate__card'),
        photoGate: document.getElementById('photoGate'),
        photoGateCard: document.querySelector('#photoGate .identity-gate__card'),
        photoGateCircle: document.getElementById('photoGateCircle'),
        photoGateInput: document.getElementById('photoGateInput'),
        photoGateStatus: document.getElementById('photoGateStatus'),
        photoGateLoadingCopy: document.getElementById('photoGateLoadingCopy'),
        photoGateActions: document.getElementById('photoGateActions'),
        photoGateContinueBtn: document.getElementById('photoGateContinueBtn'),
        photoGateRegenerateBtn: document.getElementById('photoGateRegenerateBtn')
      };

      function safeText(value) {
        return typeof value === 'string' ? value.trim() : '';
      }

      function fixMojibake(value) {
        const text = safeText(value);
        if (!text) return '';
        if (!/[����]/.test(text)) return text;
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
          if (!/[����]/.test(text)) break;
          try {
            const decoded = decodeURIComponent(escape(text));
            if (!decoded || decoded === text) break;
            text = decoded;
          } catch (_error) {
            break;
          }
        }
        const replacements = [
          ['á', '�'], ['��', '�'], ['��', '�'], ['��', '�'], ['��', '�'],
          ['��', '�'], ['��', '�'], ['��', '�'], ['��', '�'],
          ['��', '�'], ['��', '�'], ['��', '�'], ['��', '�'],
          ['��', '�'], ['��', '�'], ['��', '�'], ['��', '�'], ['��', '�'],
          ['��', '�'], ['��', '�'], ['��', '�'], ['��', '�'],
          ['��', '�'], ['��', '�'],
          ['��', '�'], ['��', '�'], ['��', '�'], ['��', '�'], ['��', '�'],
          ['��', '�'], ['��', '�'], ['��', '�'], ['��', '�'],
          ['��', '�'], ['��', '�'], ['��', '�'], ['��', '�'],
          ['��', '�'], ['��', '�'], ['��', '�'], ['��', '�'], ['��', '�'],
          ['��', '�'], ['��', '�'], ['��', '�'], ['��', '�'],
          ['��', '�'], ['Ñ', '�'],
          ['—', '-'], ['–', '-'], ['‘', "'"], ['’', "'"], ['“', '"'], ['”', '"'],
          ['º', '�'], ['ª', '�'], ['°', '�'], ['�', '']
        ];
        let repaired = text;
        replacements.forEach(([from, to]) => {
          repaired = repaired.split(from).join(to);
        });
        return repaired.replace(/\uFFFD/g, '').trim();
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
        return parsed >= MIN_GAME_CONTEXT_LIMIT ? parsed : null;
      }

      function normalizeTrainingCount(value) {
        const parsed = Number.parseInt(String(value || '').trim(), 10);
        if (!Number.isFinite(parsed)) return TRAINING_MIN_CARD_COUNT;
        const stepped = Math.round(parsed / TRAINING_CARD_STEP) * TRAINING_CARD_STEP;
        return Math.max(TRAINING_MIN_CARD_COUNT, Math.min(TRAINING_MAX_CARD_COUNT, stepped));
      }

      function normalizeTrainingStage(value) {
        const parsed = Number.parseInt(String(value || '').trim(), 10);
        return [1, 2, 3, 5].includes(parsed) ? parsed : 0;
      }

      function isTrainingMode() {
        return Boolean(state.game.training && state.game.training.active);
      }

      function resetTrainingRuntime({ keepPending = false } = {}) {
        const pendingStage = keepPending ? normalizeTrainingStage(state.game.training?.pendingStage) : 0;
        state.game.training = {
          active: false,
          pendingStage,
          stage: 0,
          selectedCount: 0,
          pendingCount: TRAINING_MIN_CARD_COUNT,
          sourceIds: [],
          cycleIndex: 0,
          cycleNumber: 0,
          hitStreak: 0,
          totalHits: 0
        };
      }

      function loadSelectedGameCount() {
        const selectedCount = currentBaseGameCount();
        state.game.selectedCount = selectedCount;
        state.game.contextLimit = currentGameActiveCardCap(currentUserLevel(), selectedCount);
      }

      function saveSelectedGameCount(value) {
        const normalized = normalizeGameCount(value) || currentBaseGameCount();
        state.game.selectedCount = normalized;
        state.game.contextLimit = currentGameActiveCardCap(currentUserLevel(), normalized);
      }

      function storageKeyForUser(baseKey, userId = state.user?.id) {
        const normalizedUserId = Number(userId) || 0;
        return normalizedUserId ? `${baseKey}:${normalizedUserId}` : baseKey;
      }

      function userScopedStorageKey(baseKey) {
        return storageKeyForUser(baseKey, state.user?.id);
      }

      function clearFlashcardsLocalStorage() {
        const scopedKeys = [
          OWNED_STORAGE_KEY,
          USER_PROGRESS_STORAGE_KEY,
          USER_HIDDEN_STORAGE_KEY,
          USER_STATS_STORAGE_KEY,
          TUTORIAL_PROGRESS_STORAGE_KEY,
          GAME_SESSION_STORAGE_KEY,
          SECOND_STAGE_TUTORIAL_DONE_STORAGE_KEY
        ];
        const directKeys = [
          CARDS_CACHE_STORAGE_KEY,
          TIME_OFFSET_STORAGE_KEY,
          SOUND_TEST_COMPLETED_STORAGE_KEY,
          SOUND_TEST_LAUNCH_TARGET_STORAGE_KEY,
          WATCH_SETTINGS_KEY,
          'playtalk_player_profile',
          'playtalk-player-state'
        ];
        try {
          scopedKeys.forEach((baseKey) => {
            localStorage.removeItem(baseKey);
            for (let userId = 0; userId <= 999; userId += 1) {
              localStorage.removeItem(storageKeyForUser(baseKey, userId));
            }
          });
          directKeys.forEach((key) => localStorage.removeItem(key));
        } catch (_error) {
          // ignore storage cleanup failures
        }
      }

      function readScopedStorage(baseKey, fallback, userId = state.user?.id) {
        const storageKey = storageKeyForUser(baseKey, userId);
        try {
          const raw = localStorage.getItem(storageKey);
          if (raw == null || raw === '') return fallback;
          return JSON.parse(raw);
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
        try {
          localStorage.setItem(
            storageKeyForUser(TUTORIAL_PROGRESS_STORAGE_KEY, state.user?.id),
            JSON.stringify(Boolean(state.game.tutorial.completed))
          );
        } catch (_error) {
          // ignore
        }
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
        if (isTrainingMode()) return null;
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
        const snapshot = serializeCurrentGameState();
        if (!snapshot) {
          removeScopedStorage(GAME_SESSION_STORAGE_KEY, state.user?.id);
          return;
        }
        try {
          localStorage.setItem(
            storageKeyForUser(GAME_SESSION_STORAGE_KEY, state.user?.id),
            JSON.stringify(snapshot)
          );
        } catch (_error) {
          // ignore
        }
      }

      function clearGameSessionLocally(userId = state.user?.id) {
        removeScopedStorage(GAME_SESSION_STORAGE_KEY, userId);
      }

      function readGameSessionForUser(userId = state.user?.id) {
        return readScopedStorage(GAME_SESSION_STORAGE_KEY, null, userId);
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
        try {
          localStorage.setItem(
            storageKeyForUser(OWNED_STORAGE_KEY, state.user?.id),
            JSON.stringify(Array.from(state.ownedIds.values()))
          );
        } catch (_error) {
          // ignore
        }
      }

      function getNowMs() {
        return Date.now() + (Number(state.timeOffsetMs) || 0);
      }

      function readTimeOffsetMs() {
        try {
          return Math.round(Number(localStorage.getItem(TIME_OFFSET_STORAGE_KEY)) || 0);
        } catch (_error) {
          return 0;
        }
      }

      function saveTimeOffsetMs() {
        try {
          localStorage.setItem(TIME_OFFSET_STORAGE_KEY, String(Math.round(Number(state.timeOffsetMs) || 0)));
        } catch (_error) {
          // ignore
        }
      }

      function readCachedCards() {
        try {
          const parsed = JSON.parse(localStorage.getItem(CARDS_CACHE_STORAGE_KEY) || 'null');
          return Array.isArray(parsed?.cards) ? parsed.cards : [];
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
          // ignore
        }
      }

      function normalizeStatsSnapshot(raw) {
        const pronunciationSamples = Array.isArray(raw?.pronunciationSamples)
          ? raw.pronunciationSamples
          : Array.isArray(raw?.pronunciation_samples)
            ? raw.pronunciation_samples
            : [];
        const normalizedPronunciationSamples = pronunciationSamples
          .map((value) => Math.max(0, Math.min(100, Math.round(Number(value) || 0))))
          .filter((value) => Number.isFinite(value))
          .slice(-PRONUNCIATION_SAMPLE_LIMIT);
        const trainingTimeMs = Math.max(
          0,
          Math.round(Number(raw?.trainingTimeMs ?? raw?.training_time_ms) || 0)
        );
        const pronunciationPercent = normalizedPronunciationSamples.length
          ? Math.max(
              0,
              Math.min(
                100,
                Math.round(
                  normalizedPronunciationSamples.reduce((sum, value) => sum + value, 0) / normalizedPronunciationSamples.length + 5
                )
              )
            )
          : 0;
        const speedFlashcardsPerHour = Math.max(0, Number(raw?.speedFlashcardsPerHour ?? raw?.speed_flashcards_per_hour) || 0);
        return {
          playTimeMs: Math.max(0, Math.round(Number(raw?.playTimeMs) || 0)),
          speakings: Math.max(0, Math.round(Number(raw?.speakings) || 0)),
          listenings: Math.max(0, Math.round(Number(raw?.listenings) || 0)),
          secondStarErrorHeard: Boolean(raw?.secondStarErrorHeard || raw?.second_star_error_heard),
          trainingTimeMs,
          pronunciationSamples: normalizedPronunciationSamples,
          pronunciationPercent,
          speedFlashcardsPerHour: Math.round(speedFlashcardsPerHour * 10) / 10
        };
      }

      function hasMeaningfulStats(raw) {
        const stats = normalizeStatsSnapshot(raw);
        return stats.playTimeMs > 0
          || stats.speakings > 0
          || stats.listenings > 0
          || stats.trainingTimeMs > 0
          || stats.pronunciationSamples.length > 0;
      }

      function readUserStatsForUser(userId = state.user?.id) {
        const parsed = readScopedStorage(USER_STATS_STORAGE_KEY, {}, userId);
        return normalizeStatsSnapshot(parsed);
      }

      function readUserStats() {
        return readUserStatsForUser(state.user?.id);
      }

      function persistUserStatsLocally() {
        try {
          localStorage.setItem(
            storageKeyForUser(USER_STATS_STORAGE_KEY, state.user?.id),
            JSON.stringify(normalizeStatsSnapshot(state.stats))
          );
        } catch (_error) {
          // ignore
        }
      }

      function saveUserStats(options = {}) {
        persistUserStatsLocally();
        if (!options.skipCloudSync) {
          scheduleFlashcardCloudSync();
        }
      }

      function countMetricChars(value) {
        const text = safeText(value).replace(/\s+/g, ' ').trim();
        return text ? text.length : 0;
      }

      function postImmediateEnergyConsumption(deltas = {}) {
        if (!state.user?.id) return Promise.resolve(null);
        const readingCharsDelta = Math.max(0, Math.round(Number(deltas?.readingCharsDelta) || 0));
        const speakingCharsDelta = Math.max(0, Math.round(Number(deltas?.speakingCharsDelta) || 0));
        const listeningCharsDelta = Math.max(0, Math.round(Number(deltas?.listeningCharsDelta) || 0));
        if (!readingCharsDelta && !speakingCharsDelta && !listeningCharsDelta) return Promise.resolve(null);
        return fetch(buildApiUrl('/api/books/listening-progress'), {
          method: 'POST',
          headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
          credentials: 'include',
          body: JSON.stringify({
            readingCharsDelta,
            speakingCharsDelta,
            listeningCharsDelta,
            practiceSecondsDelta: 0
          })
        }).then((response) => (
          response.json().catch(() => ({})).then((payload) => ({ response, payload }))
        )).then(({ response, payload }) => {
          if (!response.ok || !payload?.success) {
            if (window.PlaytalkEnergy?.isEnergyErrorPayload(payload, response.status)) {
              const status = window.PlaytalkEnergy.buildEnergyStatus({
                user: state.user,
                stats: payload?.energy || {}
              });
              applyWelcomeEnergyStatus(status);
            }
            return null;
          }
          if (payload?.stats && window.PlaytalkEnergy?.buildEnergyStatus) {
            const status = window.PlaytalkEnergy.buildEnergyStatus({
              user: state.user,
              stats: payload.stats
            });
            if (status?.loggedIn && status?.blocked) {
              applyWelcomeEnergyStatus(status);
              return null;
            }
          }
          return payload.stats || null;
        }).catch(() => null);
      }

      function addListeningCharsForCard(card) {
        const chars = countMetricChars(card?.english || card?.portuguese || '');
        if (chars <= 0) return 0;
        state.stats = normalizeStatsSnapshot({
          ...state.stats,
          listenings: Number(state.stats.listenings || 0) + chars
        });
        saveUserStats();
        void postImmediateEnergyConsumption({ listeningCharsDelta: chars });
        return chars;
      }

      function addReadingCharsForCard(entry, card, stageKey) {
        const normalizedStageKey = safeText(stageKey);
        if (!entry || !normalizedStageKey) return 0;
        if (safeText(entry.lastReadingChargeKey) === normalizedStageKey) return 0;
        const chars = countMetricChars(card?.english || card?.portuguese || '');
        if (chars <= 0) return 0;
        entry.lastReadingChargeKey = normalizedStageKey;
        void postImmediateEnergyConsumption({ readingCharsDelta: chars });
        return chars;
      }

      function addSpeakingCharsFromTranscript(transcript) {
        const chars = countMetricChars(transcript);
        if (chars <= 0) return 0;
        state.stats = normalizeStatsSnapshot({
          ...state.stats,
          speakings: Number(state.stats.speakings || 0) + chars
        });
        saveUserStats();
        void postImmediateEnergyConsumption({ speakingCharsDelta: chars });
        return chars;
      }

      function pushPronunciationSample(percent) {
        const numeric = Math.max(0, Math.min(100, Math.round(Number(percent) || 0)));
        const currentSamples = Array.isArray(state.stats.pronunciationSamples)
          ? state.stats.pronunciationSamples.slice(-PRONUNCIATION_SAMPLE_LIMIT + 1)
          : [];
        currentSamples.push(numeric);
        state.stats = normalizeStatsSnapshot({
          ...state.stats,
          pronunciationSamples: currentSamples
        });
      }

      function commitCurrentCardTrainingTime() {
        const startedAt = Number(state.game.currentCardTrainingStartedAt) || 0;
        if (!startedAt) {
          state.game.currentCardTrainingId = '';
          state.game.currentCardTrainingStartedAt = 0;
          return;
        }
        const elapsedMs = Math.max(0, Date.now() - startedAt);
        const creditedMs = Math.min(TRAINING_TIME_PER_CARD_LIMIT_MS, elapsedMs);
        if (creditedMs > 0) {
          state.stats = normalizeStatsSnapshot({
            ...state.stats,
            trainingTimeMs: Number(state.stats.trainingTimeMs || 0) + creditedMs
          });
          saveUserStats({ skipCloudSync: true });
        }
        state.game.currentCardTrainingId = '';
        state.game.currentCardTrainingStartedAt = 0;
      }

      function startCurrentCardTrainingTime() {
        const currentId = safeText(state.game.currentId);
        if (!state.game.active || !currentId || state.game.paused) {
          state.game.currentCardTrainingId = '';
          state.game.currentCardTrainingStartedAt = 0;
          return;
        }
        if (state.game.currentCardTrainingId === currentId && state.game.currentCardTrainingStartedAt) {
          return;
        }
        state.game.currentCardTrainingId = currentId;
        state.game.currentCardTrainingStartedAt = Date.now();
      }

      function syncOwnedIdsFromProgress() {
        state.ownedIds = new Set(Array.from(state.userCards.keys()));
      }

      function createProgressRecord(cardId, overrides = {}) {
        return {
          cardId,
          phaseIndex: 0,
          targetPhaseIndex: 1,
          reviewScaleVersion: REVIEW_SCALE_VERSION,
          status: 'memorizing',
          typePortuguese: false,
          memorizingStartedAt: getNowMs(),
          memorizingDurationMs: REVIEW_PHASES[1].durationMs,
          availableAt: getNowMs() + REVIEW_PHASES[1].durationMs,
          returnedAt: 0,
          createdAt: getNowMs(),
          sealImage: REVIEW_PHASES[1].sealPath,
          ...overrides
        };
      }

      function phaseFromSealImage(value) {
        const normalized = safeText(value).toLowerCase();
        if (!normalized) return 0;
        if (normalized.includes('diamante')) return 6;
        if (normalized.includes('ouro')) return 5;
        if (normalized.includes('platina')) return 4;
        if (normalized.includes('emerald')) return 3;
        if (normalized.includes('quartz')) return 2;
        if (normalized.includes('prata')) return 1;
        return 0;
      }

      function migrateReviewPhase(rawPhase, raw, minPhase, preferSealImage = false) {
        const lowerBound = minPhase ? 1 : 0;
        const fallback = minPhase ? 1 : 0;
        const parsedPhase = Math.max(lowerBound, Math.min(REVIEW_PHASE_MAX, Number.parseInt(rawPhase, 10) || fallback));
        const version = Number.parseInt(raw?.reviewScaleVersion || raw?.review_scale_version, 10) || 0;
        const imagePhase = preferSealImage ? phaseFromSealImage(raw?.sealImage || raw?.seal_image) : 0;
        if (version >= REVIEW_SCALE_VERSION) return parsedPhase;
        if (imagePhase > 0) return Math.max(lowerBound, Math.min(REVIEW_PHASE_MAX, imagePhase));
        if (version >= 2) {
          if (parsedPhase === 4) return Math.max(lowerBound, 5);
          if (parsedPhase === 5) return Math.max(lowerBound, 4);
          return parsedPhase;
        }
        if (parsedPhase === 3) return Math.max(lowerBound, 5);
        if (parsedPhase === 4) return Math.max(lowerBound, 4);
        if (parsedPhase >= 5) return REVIEW_PHASE_MAX;
        return parsedPhase;
      }

      function normalizeProgressRecord(raw) {
        const cardId = String(raw?.cardId || '').trim();
        if (!cardId) return null;
        const status = raw?.status === 'ready' ? 'ready' : 'memorizing';
        const phaseIndex = migrateReviewPhase(raw?.phaseIndex, raw, false, status === 'ready');
        const targetPhaseIndex = migrateReviewPhase(raw?.targetPhaseIndex, raw, true, true);
        return createProgressRecord(cardId, {
          phaseIndex,
          targetPhaseIndex,
          reviewScaleVersion: REVIEW_SCALE_VERSION,
          status,
          typePortuguese: Boolean(raw?.typePortuguese || raw?.type_portuguese),
          memorizingStartedAt: Number.isFinite(Number(raw?.memorizingStartedAt)) ? Number(raw.memorizingStartedAt) : getNowMs(),
          memorizingDurationMs: Number.isFinite(Number(raw?.memorizingDurationMs)) ? Number(raw.memorizingDurationMs) : (REVIEW_PHASES[targetPhaseIndex]?.durationMs || REVIEW_PHASES[1].durationMs),
          availableAt: Number.isFinite(Number(raw?.availableAt)) ? Number(raw.availableAt) : getNowMs(),
          returnedAt: Number.isFinite(Number(raw?.returnedAt)) ? Number(raw.returnedAt) : 0,
          createdAt: Number.isFinite(Number(raw?.createdAt)) ? Number(raw.createdAt) : getNowMs()
        });
      }

      function readUserProgressForUser(userId = state.user?.id) {
        try {
          const parsed = JSON.parse(localStorage.getItem(storageKeyForUser(USER_PROGRESS_STORAGE_KEY, userId)) || 'null');
          const records = Array.isArray(parsed) ? parsed.map(normalizeProgressRecord).filter(Boolean) : [];
          if (records.length) {
            return new Map(records.map((record) => [record.cardId, record]));
          }
        } catch (_error) {
          // ignore
        }

        const ownedIds = readOwnedIdsForUser(userId);
        if (!ownedIds.length) return new Map();
        const now = getNowMs();
        return new Map(ownedIds.map((cardId, index) => [cardId, createProgressRecord(cardId, {
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
        try {
          localStorage.setItem(
            storageKeyForUser(USER_PROGRESS_STORAGE_KEY, state.user?.id),
            JSON.stringify(Array.from(state.userCards.values()))
          );
        } catch (_error) {
          // ignore
        }
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
        try {
          localStorage.setItem(
            storageKeyForUser(USER_HIDDEN_STORAGE_KEY, state.user?.id),
            JSON.stringify(Array.from(state.hiddenCardIds.values()))
          );
        } catch (_error) {
          // ignore
        }
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
          avatarVersions: Array.isArray(user.avatar_versions || user.avatarVersions)
            ? (user.avatar_versions || user.avatarVersions).map((entry) => ({
              image: safeText(entry?.image || entry?.url),
              source: safeText(entry?.source),
              createdAt: entry?.createdAt || entry?.created_at || null
            })).filter((entry) => entry.image)
            : [],
          avatarGenerationCount: Math.max(0, Number.parseInt(user.avatar_generation_count || user.avatarGenerationCount, 10) || 0),
          onboardingNameCompleted: Boolean(user.onboarding_name_completed || user.onboardingNameCompleted),
          onboardingPhotoCompleted: Boolean(user.onboarding_photo_completed || user.onboardingPhotoCompleted),
          hasPassword: Boolean(user.has_password || user.hasPassword),
          createdAt: user.created_at || user.createdAt || null,
          isAdmin: Boolean(user.is_admin),
          premiumFullAccess: Boolean(user.premium_full_access),
          premiumUntil: user.premium_until || user.premiumUntil || null,
          level: normalizeUserLevel(user.level ?? user.userLevel)
        };
      }

      function progressRank(record) {
        if (!record) {
          return { phase: 0, ready: 0, availableAt: 0, createdAt: 0 };
        }
        const phase = Math.max(
          0,
          Math.min(REVIEW_PHASE_MAX, Number(record.status === 'ready' ? record.phaseIndex : Math.max(record.phaseIndex || 0, record.targetPhaseIndex || 0)) || 0)
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
          listenings: Number(state.stats.listenings || 0) + Number(guestSnapshot.stats?.listenings || 0),
          trainingTimeMs: Number(state.stats.trainingTimeMs || 0) + Number(guestSnapshot.stats?.trainingTimeMs || 0),
          pronunciationSamples: [
            ...(Array.isArray(state.stats.pronunciationSamples) ? state.stats.pronunciationSamples : []),
            ...(Array.isArray(guestSnapshot.stats?.pronunciationSamples) ? guestSnapshot.stats.pronunciationSamples : [])
          ].slice(-PRONUNCIATION_SAMPLE_LIMIT),
          secondStarErrorHeard: Boolean(state.stats.secondStarErrorHeard || guestSnapshot.stats?.secondStarErrorHeard)
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
        reconcileTutorialProgress();
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
          phaseIndex: REVIEW_PHASE_MAX,
          targetPhaseIndex: REVIEW_PHASE_MAX,
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
            phaseIndex: Math.max(0, Math.min(REVIEW_PHASE_MAX, Number.parseInt(record?.phaseIndex, 10) || 0)),
            targetPhaseIndex: Math.max(1, Math.min(REVIEW_PHASE_MAX, Number.parseInt(record?.targetPhaseIndex, 10) || 1)),
            reviewScaleVersion: REVIEW_SCALE_VERSION,
            status: record?.status === 'ready' ? 'ready' : 'memorizing',
            typePortuguese: Boolean(record?.typePortuguese),
            memorizingStartedAt: Number.isFinite(Number(record?.memorizingStartedAt)) ? Number(record.memorizingStartedAt) : 0,
            memorizingDurationMs: Math.max(0, Math.round(Number(record?.memorizingDurationMs) || 0)),
            availableAt: Number.isFinite(Number(record?.availableAt)) ? Number(record.availableAt) : 0,
            returnedAt: Number.isFinite(Number(record?.returnedAt)) ? Number(record.returnedAt) : 0,
            createdAt: Number.isFinite(Number(record?.createdAt)) ? Number(record.createdAt) : Date.now(),
            sealImage: safeText(record?.sealImage || phaseMeta(activeSealPhase(record)).sealPath)
          })).filter(record => record.cardId),
          stats: normalizeStatsSnapshot(state.stats),
          userLevel: normalizeUserLevel(state.userLevel),
          hiddenCardIds: Array.from(state.hiddenCardIds.values())
        };
      }

      async function fetchFlashcardCloudState() {
        const response = await fetch(buildApiUrl('/api/flashcards/state'), {
          headers: buildAuthHeaders(),
          cache: 'no-store',
          credentials: 'include'
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
            credentials: 'include',
            body: JSON.stringify(buildFlashcardCloudPayload())
          });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok || !payload?.success) {
            if (response.status === 401) {
              console.warn('Sessao recusada ao sincronizar flashcards; mantendo estado local.');
              return false;
            }
            throw new Error(payload?.message || 'Falha ao salvar seus flashcards.');
          }
          if (Number.isFinite(Number(payload?.userLevel))) {
            state.userLevel = normalizeUserLevel(payload.userLevel);
            if (state.user) state.user.level = state.userLevel;
            syncWelcomeLevelProgress();
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
          : 'Entre com seu nome e senha para comeÃ§ar a jogar na Liga Playtalk.';
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

      function readSoundTestCompletedFlag() {
        return true;
      }

      function persistSoundTestCompletedFlag(_value) {
      }

      function launchSoundCheck(launchTarget = '') {
        state.entry.launchAfterSoundTest = safeText(launchTarget);
        continueFromSoundTest();
      }

      function consumeSoundCheckLaunchTarget() {
        return '';
      }

      function clearWelcomeRotation() {
        if (!state.entry.welcomeTimer) return;
        window.clearInterval(state.entry.welcomeTimer);
        state.entry.welcomeTimer = 0;
      }

      const AUDIO_CHECK_STORAGE_KEY = 'playtalk-audio-check-completed';
      const MIC_CHECK_STORAGE_KEY = 'playtalk-mic-check-completed';
      const AUDIO_CHECK_ROTATION_MS = 2400;
      const MIC_CHECK_ROTATION_MS = 1000;
      const AUDIO_CHECK_INPUT_MAX = 4;
      const AUDIO_CHECK_KEY_COUNT = 16;
      const AUDIO_CHECK_FALLBACK_WORDS = ['CASA', 'BOLA', 'GATO', 'PATO'];
      const AUDIO_CHECK_SUBTITLE_MESSAGES = [
        'Toque no circulo',
        'Digite o que escutou'
      ];
      const MIC_CHECK_MESSAGES = [
        'Toque no circulo azul',
        'Clique em permitir',
        'E diga microfone'
      ];
      const MIC_CHECK_FEEDBACK_ROTATION_MS = 2400;
      const MIC_CHECK_FEEDBACK_MESSAGES = [
        'Sem capta\u00e7\u00e3o de voz',
        'Diga qualquer coisa'
      ];

      function readAudioCheckCompletedFlag() {
        try {
          return localStorage.getItem(AUDIO_CHECK_STORAGE_KEY) === '1';
        } catch (_error) {
          return false;
        }
      }

      function resolveAudioCheckCompletedState() {
        return Boolean(state.user?.audio_check_completed) || readAudioCheckCompletedFlag();
      }

      function persistAudioCheckCompletedFlag(value) {
        try {
          if (value) {
            localStorage.setItem(AUDIO_CHECK_STORAGE_KEY, '1');
          } else {
            localStorage.removeItem(AUDIO_CHECK_STORAGE_KEY);
          }
        } catch (_error) {
          // ignore
        }
      }

      function readMicCheckCompletedFlag() {
        try {
          return localStorage.getItem(MIC_CHECK_STORAGE_KEY) === '1';
        } catch (_error) {
          return false;
        }
      }

      function persistMicCheckCompletedFlag(value) {
        try {
          if (value) {
            localStorage.setItem(MIC_CHECK_STORAGE_KEY, '1');
          } else {
            localStorage.removeItem(MIC_CHECK_STORAGE_KEY);
          }
        } catch (_error) {
          // ignore
        }
      }

      async function persistAudioCheckOnServer() {
        try {
          const response = await fetch('/auth/audio-check', {
            method: 'PATCH',
            headers: buildAuthHeaders({
              'Content-Type': 'application/json'
            }),
            credentials: 'include'
          });
          const payload = await response.json().catch(() => ({}));
          if (response.ok && payload?.user) {
            state.user = normalizeUser(payload.user);
          }
          return response.ok;
        } catch (_error) {
          // ignore
        }
        return false;
      }

      async function loadAudioCheckDeck() {
        if (state.ui.audioCheckLoaded) return state.ui.audioCheckDeck;
        try {
          const response = await fetch('/data/audio-check.json', { cache: 'no-store' });
          const payload = await response.json();
          if (payload && typeof payload === 'object') {
            state.ui.audioCheckDeck = payload;
          }
        } catch (_error) {
          state.ui.audioCheckDeck = {};
        }
        state.ui.audioCheckLoaded = true;
        return state.ui.audioCheckDeck;
      }

      function shuffleArray(items) {
        const copy = Array.isArray(items) ? items.slice() : [];
        for (let index = copy.length - 1; index > 0; index -= 1) {
          const randomIndex = Math.floor(Math.random() * (index + 1));
          [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
        }
        return copy;
      }

      function pickAudioCheckWords() {
        const keys = Object.keys(state.ui.audioCheckDeck || {});
        const pool = keys.length ? keys : AUDIO_CHECK_FALLBACK_WORDS;
        return shuffleArray(pool).slice(0, 1);
      }

      function buildAudioCheckKeyboardLetters(targetWord) {
        const targetLetters = Array.from(String(targetWord || '').toUpperCase()).filter((letter) => /[A-Z]/.test(letter));
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
        const extras = shuffleArray(alphabet.filter((letter) => !targetLetters.includes(letter)));
        return [...targetLetters, ...extras].slice(0, AUDIO_CHECK_KEY_COUNT).sort();
      }

      function setAudioCheckSubtitle(text, animate = false) {
        if (!els.soundTestSubtitle) return;
        const nextText = safeText(text) || AUDIO_CHECK_SUBTITLE_MESSAGES[0];
        if (!animate || els.soundTestSubtitle.textContent === nextText) {
          els.soundTestSubtitle.textContent = nextText;
          els.soundTestSubtitle.classList.remove('is-changing');
          return;
        }
        els.soundTestSubtitle.classList.add('is-changing');
        window.setTimeout(() => {
          if (!els.soundTestSubtitle) return;
          els.soundTestSubtitle.textContent = nextText;
          els.soundTestSubtitle.classList.remove('is-changing');
        }, 140);
      }

      function startAudioCheckSubtitleRotation() {
        stopAudioCheckSubtitleRotation();
        state.ui.soundTestSubtitleIndex = 0;
        setAudioCheckSubtitle(AUDIO_CHECK_SUBTITLE_MESSAGES[0]);
        state.ui.soundTestSubtitleTimer = window.setInterval(() => {
          if (!state.ui.soundTestOpen) return;
          state.ui.soundTestSubtitleIndex = (state.ui.soundTestSubtitleIndex + 1) % AUDIO_CHECK_SUBTITLE_MESSAGES.length;
          setAudioCheckSubtitle(
            AUDIO_CHECK_SUBTITLE_MESSAGES[state.ui.soundTestSubtitleIndex],
            true
          );
        }, AUDIO_CHECK_ROTATION_MS);
      }

      function stopAudioCheckSubtitleRotation() {
        if (!state.ui.soundTestSubtitleTimer) return;
        window.clearInterval(state.ui.soundTestSubtitleTimer);
        state.ui.soundTestSubtitleTimer = 0;
      }

      function setAudioCheckStatus(message, isError = false) {
        state.ui.soundTestStatus = safeText(message);
        state.ui.soundTestStatusError = Boolean(isError);
        if (!els.soundTestStatus) return;
        els.soundTestStatus.textContent = state.ui.soundTestStatus || '';
        els.soundTestStatus.classList.toggle('is-error', state.ui.soundTestStatusError);
      }

      function renderAudioCheckKeyboard() {
        if (!els.soundTestKeyboard) return;
        const letters = buildAudioCheckKeyboardLetters(state.ui.audioCheckTargetWord)
          .map((letter) => `<button class="flashcards-typing__key" type="button" data-audio-letter="${escapeHtml(letter)}">${escapeHtml(letter)}</button>`);
        els.soundTestKeyboard.innerHTML = `
          <div class="flashcards-typing__grid">
            ${letters.join('')}
          </div>
        `;
      }

      function renderAudioCheckInput() {
        if (!els.soundTestInput) return;
        els.soundTestInput.value = '';
        if (els.soundTestAnswer) {
          const expected = String(state.ui.audioCheckTargetWord || '').toUpperCase();
          const typed = String(state.ui.audioCheckTyped || '').toUpperCase();
          els.soundTestAnswer.innerHTML = typed ? Array.from(expected || '').map((char, index) => {
            const nextTyped = typed[index] || '';
            const ok = nextTyped && nextTyped === char;
            const mismatch = nextTyped && nextTyped !== char;
            return `<span class="${ok ? 'is-correct' : mismatch ? 'is-wrong' : ''}">${escapeHtml(nextTyped)}</span>`;
          }).join('') : '';
        }
      }

      function renderAudioCheckGate() {
        renderAudioCheckInput();
        renderAudioCheckKeyboard();
        setAudioCheckStatus(state.ui.soundTestStatus, state.ui.soundTestStatusError);
      }

      function stopAudioCheckAudio() {
        const current = state.ui.audioCheckAudio;
        if (!current) return;
        try {
          current.pause();
          current.currentTime = 0;
        } catch (_error) {
          // ignore
        }
        state.ui.audioCheckAudio = null;
      }

      async function playAudioCheckWord(word) {
        const deck = await loadAudioCheckDeck();
        const normalized = safeText(word).toUpperCase();
        const src = deck[normalized];
        if (!src) return false;
        stopAudioCheckAudio();
        const audio = new Audio(src);
        audio.preload = 'auto';
        state.ui.audioCheckAudio = audio;
        return new Promise((resolve) => {
          const finish = () => {
            if (state.ui.audioCheckAudio === audio) {
              state.ui.audioCheckAudio = null;
            }
            resolve(true);
          };
          audio.addEventListener('ended', finish, { once: true });
          audio.addEventListener('error', finish, { once: true });
          audio.play().catch(finish);
        });
      }

      async function openAudioCheck() {
        if (isAdminUser() && !state.entry.welcomeStartRequested) {
          syncWelcomeGate();
          return;
        }
        if (resolveAudioCheckCompletedState()) {
          openMicCheck();
          return;
        }
        state.entry.welcomeVisible = false;
        clearWelcomeRotation();
        stopSoundTestAudio();
        stopAudioCheckAudio();
        stopMicCheckAudio();
        stopAudioCheckSubtitleRotation();
        stopMicCheckSubtitleRotation();
        document.documentElement.classList.add('robotcheck-open');
        document.body.classList.remove('welcome-active');
        document.body.classList.add('robotcheck-open', 'sound-test-open');
        els.welcomeGate?.classList.remove('is-visible');
        els.robotcheck?.classList.add('is-visible');
        els.miccheck?.classList.remove('is-visible');
        state.ui.soundTestOpen = true;
        state.ui.soundTestBusy = false;
        state.ui.soundTestStatusError = false;
        state.ui.audioCheckTargetWord = '';
        state.ui.soundTestTargetLetters = [];
        const targetWords = pickAudioCheckWords();
        state.ui.audioCheckTargetWord = targetWords[0] || 'CASA';
        state.ui.soundTestTargetLetters = targetWords;
        state.ui.audioCheckTyped = '';
        setAudioCheckStatus('');
        startAudioCheckSubtitleRotation();
        renderAudioCheckGate();
      }

      function closeAudioCheck() {
        state.ui.soundTestOpen = false;
        if (!state.ui.micCheckOpen) {
          document.documentElement.classList.remove('robotcheck-open');
          document.body.classList.remove('robotcheck-open', 'sound-test-open');
        }
        els.robotcheck?.classList.remove('is-visible');
        stopAudioCheckSubtitleRotation();
        stopAudioCheckAudio();
      }

      function requestVerifiedGameStart() {
        if (isAdminUser() && !state.entry.welcomeStartRequested) {
          state.entry.pendingPlayStart = false;
          syncWelcomeGate();
          return;
        }
        if (!state.entry.cardsReady) {
          state.entry.pendingPlayStart = true;
          state.entry.pendingTutorialStart = false;
          state.entry.pendingTutorialMuteNarration = false;
          setWelcomeCopy('Preparando jogo...');
          return;
        }
        state.entry.welcomeStartRequested = false;
        hideWelcomeGate();
        saveSelectedGameCount(DEFAULT_GAME_CONTEXT_LIMIT);
        state.game.selectedCount = DEFAULT_GAME_CONTEXT_LIMIT;
        beginGame();
      }

      function openMicCheck() {
        if (isAdminUser() && !state.entry.welcomeStartRequested) {
          syncWelcomeGate();
          return;
        }
        if (readMicCheckCompletedFlag()) {
          closeAudioCheck();
          requestVerifiedGameStart();
          return;
        }
        state.ui.micCheckOpen = true;
        state.ui.micCheckBusy = false;
        state.ui.soundTestOpen = false;
        stopAudioCheckSubtitleRotation();
        stopAudioCheckAudio();
        els.robotcheck?.classList.remove('is-visible');
        els.robotcheck?.removeAttribute('data-step');
        els.miccheck?.classList.add('is-visible');
        document.documentElement.classList.add('robotcheck-open');
        document.body.classList.add('robotcheck-open');
        document.body.classList.add('sound-test-open');
        startMicCheckSubtitleRotation();
        startMicCheckFeedbackRotation();
        resetMicCheckSteps();
      }

      function closeMicCheck() {
        state.ui.micCheckOpen = false;
        state.ui.micCheckBusy = false;
        stopMicCheckRecognition();
        els.miccheck?.classList.remove('is-visible');
        document.documentElement.classList.remove('robotcheck-open');
        document.body.classList.remove('robotcheck-open', 'sound-test-open');
        stopMicCheckSubtitleRotation();
        stopMicCheckFeedbackRotation();
      }

      function setMicCheckSubtitle(text, animate = false) {
        const rules = Array.from(els.miccheck?.querySelectorAll('[data-mic-rule]') || []);
        if (!rules.length) return;
        rules.forEach((rule) => {
          rule.classList.add('is-visible');
        });
      }

      function startMicCheckSubtitleRotation() {
        stopMicCheckSubtitleRotation();
        state.ui.micCheckSubtitleIndex = 0;
        setMicCheckSubtitle(MIC_CHECK_MESSAGES[0]);
        state.ui.micCheckSubtitleTimer = window.setInterval(() => {
          if (!state.ui.micCheckOpen) return;
          state.ui.micCheckSubtitleIndex = Math.min(MIC_CHECK_MESSAGES.length - 1, state.ui.micCheckSubtitleIndex + 1);
          setMicCheckSubtitle(MIC_CHECK_MESSAGES[state.ui.micCheckSubtitleIndex], true);
          if (state.ui.micCheckSubtitleIndex >= MIC_CHECK_MESSAGES.length - 1) {
            stopMicCheckSubtitleRotation();
          }
        }, MIC_CHECK_ROTATION_MS);
      }

      function stopMicCheckSubtitleRotation() {
        if (!state.ui.micCheckSubtitleTimer) return;
        window.clearInterval(state.ui.micCheckSubtitleTimer);
        state.ui.micCheckSubtitleTimer = 0;
      }

      function renderMicCheckFeedback() {
        if (!els.micTestStatus) return;
        const message = MIC_CHECK_FEEDBACK_MESSAGES[state.ui.micCheckFeedbackIndex % MIC_CHECK_FEEDBACK_MESSAGES.length];
        state.ui.micCheckStatus = message;
        els.micTestStatus.textContent = message;
      }

      function startMicCheckFeedbackRotation() {
        stopMicCheckFeedbackRotation();
        state.ui.micCheckFeedbackIndex = 0;
        renderMicCheckFeedback();
        state.ui.micCheckFeedbackTimer = window.setInterval(() => {
          if (!state.ui.micCheckOpen) {
            stopMicCheckFeedbackRotation();
            return;
          }
          state.ui.micCheckFeedbackIndex = (state.ui.micCheckFeedbackIndex + 1) % MIC_CHECK_FEEDBACK_MESSAGES.length;
          renderMicCheckFeedback();
        }, MIC_CHECK_FEEDBACK_ROTATION_MS);
      }

      function stopMicCheckFeedbackRotation() {
        if (!state.ui.micCheckFeedbackTimer) return;
        window.clearInterval(state.ui.micCheckFeedbackTimer);
        state.ui.micCheckFeedbackTimer = 0;
      }

      function setMicCheckStatus(message) {
        const nextMessage = safeText(message);
        if (nextMessage === 'Microfone ativado.') {
          stopMicCheckFeedbackRotation();
          state.ui.micCheckStatus = nextMessage;
          if (els.micTestStatus) {
            els.micTestStatus.textContent = nextMessage;
          }
          return;
        }
        if (state.ui.micCheckOpen) {
          if (!state.ui.micCheckFeedbackTimer) {
            startMicCheckFeedbackRotation();
          }
          return;
        }
        state.ui.micCheckStatus = nextMessage;
        if (els.micTestStatus) {
          els.micTestStatus.textContent = state.ui.micCheckStatus || '';
        }
      }

      function setMicCheckStepComplete(step, complete = true) {
        const item = els.miccheck?.querySelector(`[data-mic-step="${step}"]`);
        const check = els.miccheck?.querySelector(`[data-mic-check="${step}"]`);
        item?.classList.toggle('is-complete', Boolean(complete));
        check?.classList.toggle('is-complete', Boolean(complete));
      }

      function resetMicCheckSteps() {
        Array.from(els.miccheck?.querySelectorAll('[data-mic-rule]') || []).forEach((item) => {
          item.classList.add('is-visible');
          item.classList.remove('is-complete');
        });
        Array.from(els.miccheck?.querySelectorAll('[data-mic-check]') || []).forEach((item) => {
          item.classList.remove('is-complete');
        });
      }

      function stopMicCheckRecognition() {
        const recognition = state.ui.micCheckRecognition;
        state.ui.micCheckRecognition = null;
        if (!recognition) return;
        try {
          if (typeof recognition.abort === 'function') {
            recognition.abort();
          } else if (typeof recognition.stop === 'function') {
            recognition.stop();
          } else if (typeof recognition.cancelListening === 'function') {
            recognition.cancelListening();
          }
        } catch (_error) {
          // ignore
        }
      }

      async function completeMicCheck() {
        if (!state.ui.micCheckOpen) return;
        setMicCheckStepComplete('speak', true);
        persistMicCheckCompletedFlag(true);
        setMicCheckStatus('Microfone ativado.');
        await wait(350);
        closeMicCheck();
        requestVerifiedGameStart();
      }

      function resolveMicCheckTranscript(results) {
        return Array.from(results || []).reduce((best, result) => {
          const transcript = Array.from(result || []).reduce((candidate, alternative) => {
            const nextTranscript = safeText(alternative?.transcript || '');
            return nextTranscript.length > candidate.length ? nextTranscript : candidate;
          }, '');
          return transcript.length > best.length ? transcript : best;
        }, '');
      }

      async function startMicCheckCapture() {
        if (!state.ui.micCheckOpen || state.ui.micCheckBusy) return;
        const nativeSpeech = getNativeSpeechRecognition();
        if (!nativeSpeech && !recognitionCtor) {
          setMicCheckStatus('Microfone indisponivel neste aparelho.');
          return;
        }

        state.ui.micCheckBusy = true;
        setMicCheckStepComplete('touch', true);
        els.micTestPlayBtn?.classList.add('is-listening');
        if (els.micTestPlayBtn) {
          els.micTestPlayBtn.disabled = true;
        }
        setMicCheckStatus('Ouvindo...');
        stopMicCheckRecognition();

        if (nativeSpeech) {
          const nativeCapture = {
            aborted: false,
            abort() {
              this.aborted = true;
              if (typeof nativeSpeech.cancelListening === 'function') {
                nativeSpeech.cancelListening();
              }
            }
          };
          state.ui.micCheckRecognition = nativeCapture;
          try {
            const hasAccess = typeof nativeSpeech.ensureGameplayCaptureReady === 'function'
              ? (await nativeSpeech.ensureGameplayCaptureReady(), true)
              : (typeof nativeSpeech.ensurePermissions === 'function'
                ? await nativeSpeech.ensurePermissions()
                : true);
            if (!hasAccess || nativeCapture.aborted || !state.ui.micCheckOpen) {
              setMicCheckStatus('Clique em permitir para continuar.');
              return;
            }
            setMicCheckStepComplete('permit', true);
            const transcript = typeof nativeSpeech.captureForGameplay === 'function'
              ? await nativeSpeech.captureForGameplay({ language: 'pt-BR', maxResults: 5, maxDurationMs: 6500 })
              : await nativeSpeech.captureOnce({ language: 'pt-BR', maxResults: 5, maxDurationMs: 6500 });
            if (nativeCapture.aborted || !state.ui.micCheckOpen) return;
            if (safeText(transcript)) {
              await completeMicCheck();
              return;
            }
            setMicCheckStatus('Nao ouvi nada. Tente de novo.');
          } catch (_error) {
            if (state.ui.micCheckOpen) {
              setMicCheckStatus('Nao consegui abrir o microfone. Tente de novo.');
            }
          } finally {
            if (state.ui.micCheckRecognition === nativeCapture) {
              state.ui.micCheckRecognition = null;
            }
            state.ui.micCheckBusy = false;
            els.micTestPlayBtn?.classList.remove('is-listening');
            if (els.micTestPlayBtn) {
              els.micTestPlayBtn.disabled = false;
            }
          }
          return;
        }

        const recognition = new recognitionCtor();
        state.ui.micCheckRecognition = recognition;
        let completed = false;
        let partialTranscript = '';
        const finish = () => {
          state.ui.micCheckBusy = false;
          if (state.ui.micCheckRecognition === recognition) {
            state.ui.micCheckRecognition = null;
          }
          els.micTestPlayBtn?.classList.remove('is-listening');
          if (els.micTestPlayBtn) {
            els.micTestPlayBtn.disabled = false;
          }
        };

        recognition.lang = 'pt-BR';
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.maxAlternatives = 5;
        recognition.onstart = () => {
          setMicCheckStepComplete('permit', true);
          setMicCheckStatus('Ouvindo...');
        };
        recognition.onresult = async (event) => {
          const transcript = resolveMicCheckTranscript(event.results);
          if (transcript) {
            partialTranscript = transcript;
          }
          const hasFinalResult = Array.from(event.results || []).some(result => result?.isFinal);
          if (!hasFinalResult && !partialTranscript) return;
          completed = true;
          try {
            recognition.stop();
          } catch (_error) {
            // ignore
          }
          finish();
          await completeMicCheck();
        };
        recognition.onerror = () => {
          finish();
          if (!completed && state.ui.micCheckOpen) {
            setMicCheckStatus(partialTranscript ? '' : 'Nao ouvi nada. Tente de novo.');
          }
        };
        recognition.onend = async () => {
          finish();
          if (!completed && partialTranscript && state.ui.micCheckOpen) {
            completed = true;
            await completeMicCheck();
            return;
          }
          if (!completed && state.ui.micCheckOpen) {
            setMicCheckStatus('Nao ouvi nada. Tente de novo.');
          }
        };

        try {
          recognition.start();
        } catch (_error) {
          finish();
          setMicCheckStatus('Toque para tentar de novo.');
        }
      }

      function stopMicCheckAudio() {}

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

      function getAccessKeyImagePath(letter) {
        const normalized = safeText(letter).toUpperCase().replace(/[^A-P]/g, '');
        return normalized ? `${ACCESSKEY_PUBLIC_ROOT}/teclas/Imagens/${normalized}.png` : '';
      }

      function getAccessKeySoundPath(letter) {
        const normalized = safeText(letter).toUpperCase().replace(/[^A-P]/g, '');
        return normalized ? `${ACCESSKEY_PUBLIC_ROOT}/teclas/Teclas/${normalized}.mp3` : '';
      }

      function stopSoundTestAudio() {
        const current = state.ui.soundTestAudio;
        if (!current) return;
        try {
          current.pause();
          current.currentTime = 0;
        } catch (_error) {
          // ignore
        }
        state.ui.soundTestAudio = null;
      }

      function clearSoundTestSubtitleRotation() {
        if (!state.ui.soundTestSubtitleTimer) return;
        window.clearInterval(state.ui.soundTestSubtitleTimer);
        state.ui.soundTestSubtitleTimer = 0;
      }

      function setSoundTestSubtitle(text, animate = false) {
        if (!els.soundTestSubtitle) return;
        const nextText = safeText(text) || SOUND_TEST_SUBTITLE_MESSAGES[0];
        if (!animate || els.soundTestSubtitle.textContent === nextText) {
          els.soundTestSubtitle.textContent = nextText;
          els.soundTestSubtitle.classList.remove('is-changing');
          return;
        }
        els.soundTestSubtitle.classList.add('is-changing');
        window.setTimeout(() => {
          if (!els.soundTestSubtitle) return;
          els.soundTestSubtitle.textContent = nextText;
          els.soundTestSubtitle.classList.remove('is-changing');
        }, 140);
      }

      function startSoundTestSubtitleRotation() {
        clearSoundTestSubtitleRotation();
        state.ui.soundTestSubtitleIndex = 0;
        setSoundTestSubtitle(SOUND_TEST_SUBTITLE_MESSAGES[0]);
        state.ui.soundTestSubtitleTimer = window.setInterval(() => {
          if (!state.ui.soundTestOpen) return;
          state.ui.soundTestSubtitleIndex = (state.ui.soundTestSubtitleIndex + 1) % SOUND_TEST_SUBTITLE_MESSAGES.length;
          setSoundTestSubtitle(SOUND_TEST_SUBTITLE_MESSAGES[state.ui.soundTestSubtitleIndex], true);
        }, SOUND_TEST_COPY_ROTATION_MS);
      }

      function setSoundTestStatus(message, isError = false) {
        state.ui.soundTestStatus = safeText(message);
        state.ui.soundTestStatusError = Boolean(isError);
        if (!els.soundTestStatus) return;
        els.soundTestStatus.textContent = state.ui.soundTestStatus || 'Ouca os 3 sons e toque nas 3 imagens correspondentes. A ordem nao importa.';
        els.soundTestStatus.classList.toggle('is-error', state.ui.soundTestStatusError);
      }

      function renderSoundTestSlots() {
        if (!els.soundTestSlots) return;
        els.soundTestSlots.innerHTML = Array.from({ length: SOUND_TEST_SELECTION_COUNT }, (_, index) => {
          const letter = state.ui.soundTestSelectedLetters[index] || '';
          if (!letter) {
            return '<div class="soundcheck-slot"><span>?</span></div>';
          }
          return `<div class="soundcheck-slot"><img src="${escapeHtml(getAccessKeyImagePath(letter))}" alt="${escapeHtml(letter)}"></div>`;
        }).join('');
      }

      function renderSoundTestGrid() {
        els.soundTestGrid?.querySelectorAll('[data-letter]').forEach((button) => {
          const letter = safeText(button.getAttribute('data-letter')).toUpperCase();
          button.classList.toggle('is-selected', state.ui.soundTestSelectedLetters.includes(letter));
          button.disabled = state.ui.soundTestBusy;
        });
        if (els.soundTestReplayBtn) {
          els.soundTestReplayBtn.disabled = state.ui.soundTestBusy || !state.ui.soundTestTargetLetters.length;
        }
        if (els.soundTestClearBtn) {
          els.soundTestClearBtn.disabled = state.ui.soundTestBusy || !state.ui.soundTestSelectedLetters.length;
        }
      }

      function renderSoundTestGate() {
        renderAudioCheckGate();
      }

      function clearSoundTestSelection({ keepStatus = false } = {}) {
        if (!keepStatus) {
          setAudioCheckStatus('');
        }
        renderSoundTestGate();
      }

      function shuffleArray(items) {
        const copy = Array.isArray(items) ? items.slice() : [];
        for (let index = copy.length - 1; index > 0; index -= 1) {
          const randomIndex = Math.floor(Math.random() * (index + 1));
          [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
        }
        return copy;
      }

      async function playSoundTestSequence() {
        const words = state.ui.soundTestTargetLetters.slice();
        if (!words.length) return;
        const token = Date.now();
        state.ui.soundTestPlaybackToken = token;
        state.ui.soundTestBusy = true;
        setAudioCheckStatus('');
        renderSoundTestGate();
        for (const word of words) {
          if (!state.ui.soundTestOpen || state.ui.soundTestPlaybackToken !== token) {
            state.ui.soundTestBusy = false;
            renderSoundTestGate();
            return;
          }
          await playAudioCheckWord(word);
          if (!state.ui.soundTestOpen || state.ui.soundTestPlaybackToken !== token) {
            state.ui.soundTestBusy = false;
            renderSoundTestGate();
            return;
          }
          await wait(400);
        }
        if (state.ui.soundTestPlaybackToken === token) {
          state.ui.soundTestBusy = false;
          setAudioCheckStatus('');
          renderSoundTestGate();
        }
      }

      function continueFromSoundTest() {
        const launchTarget = state.entry.launchAfterSoundTest;
        state.entry.launchAfterSoundTest = '';
        if (launchTarget === 'welcome' || launchTarget === 'tutorial-setup' || launchTarget === 'play-ready-check') {
          openMicCheck();
        }
      }

      async function beginTutorialGameWhenReady(options = {}) {
        requestWelcomeTutorialStart(true, options);
        return true;
      }

      function closeSoundTestGate() {
        state.ui.soundTestOpen = false;
        state.ui.soundTestBusy = false;
        state.ui.soundTestPlaybackToken = 0;
        stopAudioCheckAudio();
        stopAudioCheckSubtitleRotation();
        closeAudioCheck();
      }

      function openSoundTestGate(launchTarget = '') {
        state.entry.launchAfterSoundTest = safeText(launchTarget || 'welcome');
        continueFromSoundTest();
      }

      function clearSoundTestSelection(keepStatus = false) {
        state.ui.audioCheckTyped = '';
        if (!keepStatus) {
          setAudioCheckStatus('');
        }
        renderSoundTestGate();
      }

      async function validateSoundTestSelection() {
        if (state.ui.soundTestBusy) return;
        const selected = String(state.ui.audioCheckTyped || '').trim().toUpperCase();
        const target = String(state.ui.audioCheckTargetWord || '').trim().toUpperCase();
        if (selected === target) {
          state.ui.soundTestBusy = true;
          state.entry.soundTestCompleted = true;
          persistAudioCheckCompletedFlag(true);
          setAudioCheckStatus('');
          state.ui.audioCheckTyped = '';
          state.ui.soundTestBusy = false;
          openMicCheck();
          void persistAudioCheckOnServer();
          return;
        }
        setAudioCheckStatus('');
        state.ui.audioCheckTyped = '';
        if (els.soundTestInput) {
          els.soundTestInput.value = '';
        }
        renderSoundTestGate();
        await wait(500);
        if (state.ui.soundTestOpen) {
          void playSoundTestSequence();
        }
      }

      function toggleSoundTestLetter(letter) {
        if (!state.ui.soundTestOpen || state.ui.soundTestBusy) return;
        const normalized = safeText(letter).toUpperCase().replace(/[^A-Z]/g, '');
        if (!normalized) return;
        const nextValue = `${state.ui.audioCheckTyped || ''}${normalized}`;
        const target = String(state.ui.audioCheckTargetWord || '').toUpperCase();
        if (target && !target.startsWith(nextValue)) {
          state.ui.audioCheckTyped = '';
          renderSoundTestGate();
          return;
        }
        state.ui.audioCheckTyped = nextValue;
        renderSoundTestGate();
        if ((state.ui.audioCheckTyped || '').trim().length >= String(state.ui.audioCheckTargetWord || '').length) {
          void validateSoundTestSelection();
        }
      }

      function hasWelcomePlayAccess() {
        return isAdminUser() || hasTutorialPlanetUnlocked();
      }

      function readOptimisticWelcomeProgressCount() {
        return 0;
      }

      function hasInstantWelcomePlayAccess() {
        if (hasWelcomePlayAccess()) return true;
        return readOptimisticWelcomeProgressCount() >= 1;
      }

      function shouldShowWelcomeGate() {
        if (state.ui.soundTestOpen || state.ui.micCheckOpen) return false;
        if (state.entry.authRequired || state.game.active || state.watch.active) return false;
        if (LEGACY_FLASHCARDS_HOME_ENABLED) {
          if (isNativeRuntime()) return false;
          if (state.entry.welcomeDismissed) return false;
          if (state.user?.id) return false;
          if (isAdminUser()) return false;
        }
        // Sem a home legada, o welcome gate vira a entrada unica da rota /flashcards.
        return true;
      }

      function syncWelcomeStartButton() {
        if (!els.welcomeStartBtn) return;
        if (!els.welcomeStartBtn.querySelector('.welcome-gate__start-image')) {
          els.welcomeStartBtn.innerHTML = [
            '<img class="welcome-gate__start-image" src="/arquivos-codex/welcome-gate/button.png" alt="Jogar agora">',
            '<span class="welcome-gate__start-timer" hidden>',
            '<img class="welcome-gate__start-timer-icon" src="/SVG/codex-icons/rel�gio.svg" alt="" aria-hidden="true">',
            '<span class="welcome-gate__start-timer-value">00:00:00</span>',
            '</span>'
          ].join('');
        }
        els.welcomeStartBtn.disabled = false;
        els.welcomeStartBtn.classList.toggle('is-energy-blocked', Boolean(state.ui.welcomeEnergyBlocked));
        els.welcomeStartBtn.style.opacity = state.ui.welcomeEnergyBlocked ? '0.8' : '1';
        const image = els.welcomeStartBtn.querySelector('.welcome-gate__start-image');
        const timer = els.welcomeStartBtn.querySelector('.welcome-gate__start-timer');
        const timerValue = els.welcomeStartBtn.querySelector('.welcome-gate__start-timer-value');
        if (image) image.style.opacity = state.ui.welcomeEnergyBlocked ? '0.8' : '1';
        if (timer) timer.hidden = !state.ui.welcomeEnergyBlocked;
        if (timerValue) timerValue.textContent = formatWelcomeEnergyCountdown(state.ui.welcomeEnergyNextResetAt);
      }

      function formatWelcomeEnergyCountdown(nextResetAt) {
        const targetMs = Date.parse(nextResetAt || '');
        if (!Number.isFinite(targetMs)) return '00:00:00';
        const diffMs = Math.max(0, targetMs - Date.now());
        const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
        const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
        const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
        const seconds = String(totalSeconds % 60).padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
      }

      function stopWelcomeEnergyCountdown() {
        if (state.ui.welcomeEnergyTimer) {
          window.clearInterval(state.ui.welcomeEnergyTimer);
          state.ui.welcomeEnergyTimer = 0;
        }
      }

      function startWelcomeEnergyCountdown() {
        stopWelcomeEnergyCountdown();
        if (!state.ui.welcomeEnergyBlocked || !state.ui.welcomeEnergyNextResetAt) {
          syncWelcomeStartButton();
          return;
        }
        syncWelcomeStartButton();
        state.ui.welcomeEnergyTimer = window.setInterval(() => {
          if (!state.ui.welcomeEnergyBlocked) {
            stopWelcomeEnergyCountdown();
            syncWelcomeStartButton();
            return;
          }
          if (formatWelcomeEnergyCountdown(state.ui.welcomeEnergyNextResetAt) === '00:00:00') {
            stopWelcomeEnergyCountdown();
            void refreshWelcomeEnergyState();
            return;
          }
          syncWelcomeStartButton();
        }, 1000);
      }

      function applyWelcomeEnergyStatus(status) {
        const blocked = Boolean(status?.loggedIn && status?.blocked);
        state.ui.welcomeEnergyBlocked = blocked;
        state.ui.welcomeEnergyNextResetAt = blocked ? String(status?.nextResetAt || '') : '';
        if (window.PlaytalkEnergy?.rememberEnergyStatus) {
          window.PlaytalkEnergy.rememberEnergyStatus(status);
        }
        if (blocked) {
          startWelcomeEnergyCountdown();
          return;
        }
        stopWelcomeEnergyCountdown();
        syncWelcomeStartButton();
      }

      async function refreshWelcomeEnergyState() {
        if (!window.PlaytalkEnergy || typeof window.PlaytalkEnergy.getEnergyStatus !== 'function') {
          state.ui.welcomeEnergyBlocked = false;
          state.ui.welcomeEnergyNextResetAt = '';
          stopWelcomeEnergyCountdown();
          syncWelcomeStartButton();
          return;
        }
        const status = await window.PlaytalkEnergy.getEnergyStatus({
          user: state.user
        });
        applyWelcomeEnergyStatus(status);
      }

      function syncGameAdvanceButton(entry = null) {
        if (!els.gameAdvanceBtn) return;
        const phaseKey = safeText(els.game?.dataset?.phaseKey || '');
        const showAdvance = !isTrainingMode() && (phaseKey === 'second-star' || phaseKey === 'fourth-star');
        if (!showAdvance) {
          els.gameAdvanceBtn.hidden = true;
          els.gameAdvanceBtn.classList.remove('is-visible');
          return;
        }
        if (els.gameVisual && els.gameAdvanceBtn.parentElement !== els.gameVisual) {
          els.gameVisual.appendChild(els.gameAdvanceBtn);
        }
        els.gameAdvanceBtn.hidden = false;
        els.gameAdvanceBtn.classList.add('is-visible');
        els.gameAdvanceBtn.setAttribute('aria-label', 'Avancar rapido com digitacao automatica');
        els.gameAdvanceBtn.disabled = !state.game.active || state.game.paused || state.game.listening || state.game.typingSkipActive || state.game.currentId !== entry?.id;
      }

      function countWelcomePlayableDecksAndFlashcards() {
        const playableCards = (Array.isArray(state.allCards) ? state.allCards : [])
          .filter((card) => hasCoreFlashcardText(card) && hasPlayableFlashcardImage(card));
        const playableDeckSources = new Set();
        playableCards.forEach((card) => {
          const sourceKey = safeText(card?.source) || safeText(card?.adminSource) || safeText(card?.deckTitle);
          if (sourceKey) {
            playableDeckSources.add(sourceKey);
          }
        });
        return {
          decksCount: playableDeckSources.size,
          flashcardsCount: playableCards.length
        };
      }

      function normalizeWelcomeAdminSummary(payload) {
        const decksCount = Math.max(0, Math.round(Number(payload?.decksCount) || 0));
        const flashcardsCount = Math.max(0, Math.round(Number(payload?.flashcardsCount) || 0));
        return { decksCount, flashcardsCount };
      }

      function resolveWelcomeAdminStats() {
        if (state.admin?.welcomeSummary) {
          return normalizeWelcomeAdminSummary(state.admin.welcomeSummary);
        }
        return null;
      }

      function syncWelcomeAdminStats() {
        if (!els.welcomeAdminStats) return;
        const showAdminStats = Boolean(state.user?.id) && isAdminUser();
        if (!showAdminStats) {
          els.welcomeAdminStats.textContent = '';
          els.welcomeAdminStats.hidden = true;
          return;
        }
        const summary = resolveWelcomeAdminStats();
        if (!summary) {
          els.welcomeAdminStats.textContent = 'Sincronizando decks...';
          els.welcomeAdminStats.hidden = false;
          return;
        }
        const { decksCount, flashcardsCount } = summary;
        els.welcomeAdminStats.textContent = `${decksCount} decks ${flashcardsCount} flashcards`;
        els.welcomeAdminStats.hidden = false;
      }

      function setWelcomeBackgroundStatus(message, isError = false) {
        state.admin.backgroundStatus = safeText(message);
        state.admin.backgroundError = Boolean(isError);
        if (!els.welcomeBgStatus) return;
        els.welcomeBgStatus.textContent = state.admin.backgroundStatus;
        els.welcomeBgStatus.classList.toggle('is-error', state.admin.backgroundError);
      }

      function syncWelcomeBackgroundAdmin() {
        const adminMode = Boolean(state.user?.id) && isAdminUser();
        if (els.welcomeBgAdmin) {
          els.welcomeBgAdmin.hidden = !adminMode;
        }
        if (!adminMode) {
          state.admin.backgroundBusy = false;
          state.admin.backgroundVariant = '';
          setWelcomeBackgroundStatus('');
          return;
        }
        const disabled = Boolean(state.admin.backgroundBusy);
        if (els.welcomeBgDesktopBtn) els.welcomeBgDesktopBtn.disabled = disabled;
        if (els.welcomeBgMobileBtn) els.welcomeBgMobileBtn.disabled = disabled;
        if (!state.admin.backgroundStatus) {
          setWelcomeBackgroundStatus('BG global: desktop / mobile');
        }
      }

      function applyUploadedGlobalBackground(variant, proxyUrl) {
        const normalizedVariant = variant === 'mobile' ? 'mobile' : 'desktop';
        const url = safeText(proxyUrl);
        if (!url) return;
        document.documentElement.style.setProperty(
          normalizedVariant === 'mobile' ? '--playtalk-global-bg-mobile' : '--playtalk-global-bg-desktop',
          `url("${url}")`
        );
      }

      function requestWelcomeBackgroundUpload(variant) {
        if (!isAdminUser() || state.admin.backgroundBusy || !els.welcomeBgUploadInput) return;
        state.admin.backgroundVariant = variant === 'mobile' ? 'mobile' : 'desktop';
        els.welcomeBgUploadInput.value = '';
        els.welcomeBgUploadInput.click();
      }

      async function uploadWelcomeBackgroundFile(file) {
        if (!file || !isAdminUser()) return;
        const variant = state.admin.backgroundVariant === 'mobile' ? 'mobile' : 'desktop';
        state.admin.backgroundBusy = true;
        setWelcomeBackgroundStatus(`Enviando BG ${variant}...`);
        syncWelcomeBackgroundAdmin();
        try {
          const imageDataUrl = await fileToDataUrl(file);
          const response = await fetch(buildApiUrl('/api/admin/global-background'), {
            method: 'POST',
            headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
            credentials: 'include',
            body: JSON.stringify({ variant, imageDataUrl })
          });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok || !payload?.success) {
            throw new Error(payload?.error || payload?.details || 'Nao foi possivel salvar o background global.');
          }
          applyUploadedGlobalBackground(variant, payload.proxyUrl);
          setWelcomeBackgroundStatus(`BG ${variant} publicado no R2.`);
        } catch (error) {
          setWelcomeBackgroundStatus(error?.message || 'Falha ao enviar background.', true);
        } finally {
          state.admin.backgroundBusy = false;
          state.admin.backgroundVariant = '';
          syncWelcomeBackgroundAdmin();
        }
      }

      function syncWelcomeLevelProgress() {
        if (!els.welcomeUserName || !els.welcomeUserLevel || !els.welcomeLevelProgressBar || !els.welcomeLevelProgressCopy) return;
        const username = safeText(state.user?.username) || 'Jogador';
        const avatar = safeText(state.user?.avatarImage || state.user?.avatar_image || state.user?.avatar);
        const hasAvatar = Boolean(avatar);
        const level = currentUserLevel();
        const levelTarget = userLevelCardTarget(level);
        const progressCount = level >= USER_LEVEL_MAX
          ? levelTarget
          : Math.max(0, Math.min(levelTarget, currentLevelProgressCount(level)));
        const remaining = Math.max(0, levelTarget - progressCount);
        const percent = (progressCount / Math.max(1, levelTarget)) * 100;
        els.welcomeUserName.textContent = username;
        if (els.welcomeAvatarPreview) {
          const nextAvatar = hasAvatar ? avatar : '/Avatar/profile-neon-blue.svg';
          if (els.welcomeAvatarPreview.dataset.src !== nextAvatar) {
            els.welcomeAvatarPreview.src = nextAvatar;
            els.welcomeAvatarPreview.dataset.src = nextAvatar;
          }
          els.welcomeAvatarPreview.hidden = false;
        }
        els.welcomeUserLevel.textContent = `Nivel ${level}`;
        els.welcomeLevelProgressBar.style.width = `${percent.toFixed(2)}%`;
        if (level >= USER_LEVEL_MAX) {
          els.welcomeLevelProgressCopy.textContent = 'Nivel maximo alcancado';
          return;
        }
        els.welcomeLevelProgressCopy.textContent = `Ganhe ${remaining} ${remaining === 1 ? 'carta' : 'cartas'} para avan\u00e7ar`;
      }

      function syncWelcomeAccountLink() {}

      function syncWelcomeGate() {
        const visible = shouldShowWelcomeGate();
        state.entry.welcomeVisible = visible;
        document.body.classList.toggle('welcome-active', visible);
        els.welcomeGate?.classList.toggle('is-visible', visible);
        syncWelcomeStartButton();
        void refreshWelcomeEnergyState();
        syncWelcomeAccountLink();
        syncWelcomeLevelProgress();
        syncWelcomeBackgroundAdmin();
        if (visible && !state.ui.soundTestOpen && !state.ui.micCheckOpen) {
          closeAudioCheck();
        }
        if (!visible) {
          clearWelcomeRotation();
          return;
        }
        if (state.entry.pendingTutorialStart) {
          setWelcomeCopy('Preparando tutorial...');
          return;
        }
        if (state.entry.pendingPlayStart) {
          setWelcomeCopy('Preparando jogo...');
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
        state.entry.pendingPlayStart = false;
        state.entry.pendingTutorialStart = false;
        state.entry.pendingTutorialMuteNarration = false;
        state.entry.welcomeStartRequested = false;
        state.entry.welcomeDismissed = true;
        state.entry.welcomeVisible = false;
        document.body.classList.remove('welcome-active');
        els.welcomeGate?.classList.remove('is-visible');
        closeAudioCheck();
        clearWelcomeRotation();
      }

      function tryStartPendingWelcomePlay() {
        if (!state.entry.pendingPlayStart || !state.entry.cardsReady) return false;
        if (isAdminUser() && !state.entry.welcomeStartRequested) {
          state.entry.pendingPlayStart = false;
          syncWelcomeGate();
          return false;
        }
        state.entry.pendingPlayStart = false;
        state.entry.welcomeStartRequested = false;
        hideWelcomeGate();
        saveSelectedGameCount(DEFAULT_GAME_CONTEXT_LIMIT);
        state.game.selectedCount = DEFAULT_GAME_CONTEXT_LIMIT;
        beginGame();
        return true;
      }

      function tryStartPendingTutorial() {
        if (!state.entry.pendingTutorialStart) return false;
        state.entry.pendingTutorialStart = false;
        state.entry.pendingTutorialMuteNarration = false;
        syncWelcomeGate();
        return false;
      }

      function requestWelcomeTutorialStart(skipSoundTest = false, options = {}) {
        if (state.entry.authRequired) return;
        if (isAdminUser() && !state.entry.welcomeStartRequested && !options.forceTutorial) {
          syncWelcomeGate();
          return;
        }
        if (!state.entry.cardsReady) {
          state.entry.pendingPlayStart = true;
          state.entry.pendingTutorialStart = false;
          state.entry.pendingTutorialMuteNarration = false;
          setWelcomeCopy('Preparando jogo...');
          return;
        }
        state.entry.welcomeStartRequested = false;
        hideWelcomeGate();
        saveSelectedGameCount(DEFAULT_GAME_CONTEXT_LIMIT);
        state.game.selectedCount = DEFAULT_GAME_CONTEXT_LIMIT;
        beginGame();
      }

      function resumePendingSoundCheckFlow() {
        return false;
      }

      function shouldRequireGuestAuth() {
        return false;
      }

      function clearGuestAuthDelay() {}
      function clearAuthRevealTimer() {}
      function lockFlashcardsApp(_locked) {}
      function hideAuthGate() {}
      function showAuthGate() {}
      async function enforceGuestAuthGate() { return false; }
      function scheduleGuestAuthRequirement() { return false; }

      async function fetchSessionUser() {
        if (window.PlaytalkApi && typeof window.PlaytalkApi.fetchSessionUser === 'function') {
          const user = await window.PlaytalkApi.fetchSessionUser({
            attempts: 3,
            retryDelayMs: 450
          });
          return normalizeUser(user);
        }
        const response = await fetch(buildApiUrl('/auth/session'), {
          headers: buildAuthHeaders(),
          cache: 'no-store',
          credentials: 'include'
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
              return '<div class="premium-gate__code-slot"><span>•</span></div>';
            }
            return                             `<div class="premium-gate__code-slot" data-filled-slot="${index}"><img src="${escapeHtml(getAccessKeyImagePath(letter))}" alt="${escapeHtml(letter)}"></div>`;
          });
          els.premiumCodeValue.innerHTML = slots.join('');
        }
        if (els.premiumStatus) {
          els.premiumStatus.textContent = state.ui.premiumStatus || 'Toque nas imagens na ordem certa para montar a chave.';
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
        setPremiumStatus(message || 'Monte sua chave premium tocando nas imagens.');
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
          els.profileAvatarPreview.src = hasAvatar ? avatar : '/Avatar/profile-neon-blue.svg';
          els.profileAvatarPreview.style.display = 'block';
        }
        if (els.profileAvatarFallback) {
          els.profileAvatarFallback.textContent = '';
          els.profileAvatarFallback.style.display = 'none';
        }
        if (els.profileSaveBtn) {
          els.profileSaveBtn.disabled = !state.user;
        }
        if (els.profileLogoutBtn) {
          els.profileLogoutBtn.hidden = !state.user;
        }
        syncFlashcardsFooterVisibility();
      }

      function switchMainView(view) {
        const nextView = 'play';
        state.ui.activeView = nextView;
        const showCatalog = LEGACY_FLASHCARDS_HOME_ENABLED && nextView === 'play';
        const showUsers = false;
        const showProfile = false;
        const showTopbar = LEGACY_FLASHCARDS_HOME_ENABLED && nextView === 'play';

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
        syncFooterNav();
      }

      async function navigateToMainView(view) {
        const nextView = 'play';
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
            closeGameSetup();
            syncWelcomeGate();
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

      async function dataUrlToSquareWebpDataUrl(sourceDataUrl, size = 400) {
        return await new Promise((resolve, reject) => {
          const image = new Image();
          image.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              canvas.width = size;
              canvas.height = size;
              const context = canvas.getContext('2d');
              if (!context) {
                reject(new Error('Nao foi possivel preparar a imagem.'));
                return;
              }
              const sourceWidth = image.naturalWidth || image.width;
              const sourceHeight = image.naturalHeight || image.height;
              const sourceSide = Math.min(sourceWidth, sourceHeight);
              const sourceX = Math.max(0, Math.round((sourceWidth - sourceSide) / 2));
              const sourceY = Math.max(0, Math.round((sourceHeight - sourceSide) / 2));
              context.clearRect(0, 0, size, size);
              context.drawImage(image, sourceX, sourceY, sourceSide, sourceSide, 0, 0, size, size);
              resolve(canvas.toDataURL('image/webp', 0.92));
            } catch (error) {
              reject(error);
            }
          };
          image.onerror = () => reject(new Error('Nao foi possivel abrir a foto.'));
          image.src = sourceDataUrl;
        });
      }

      async function fileToSquareWebpDataUrl(file, size = 400) {
        const sourceDataUrl = await fileToDataUrl(file);
        return dataUrlToSquareWebpDataUrl(sourceDataUrl, size);
      }

      async function createCartoonAvatar(imageDataUrl) {
        const response = await fetch(buildApiUrl('/api/images/openai/avatar-cartoon'), {
          method: 'POST',
          headers: buildAuthHeaders({
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify({ imageDataUrl })
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload?.success || !payload?.dataUrl) {
          throw new Error(payload?.message || payload?.error || 'Nao foi possivel transformar a foto em desenho.');
        }
        return String(payload.dataUrl);
      }

      function stopIdentityAudio() {
        if (!state.ui.identityAudio) return;
        try {
          state.ui.identityAudio.pause();
          state.ui.identityAudio.currentTime = 0;
        } catch (_error) {
          // ignore
        }
        state.ui.identityAudio = null;
      }

      function fadeOutIdentityAudio(durationMs = 1000) {
        const activeAudio = state.ui.identityAudio;
        if (!activeAudio) return Promise.resolve(false);
        return new Promise((resolve) => {
          const startVolume = Number(activeAudio.volume) || 1;
          const steps = Math.max(1, Math.round(durationMs / 50));
          let currentStep = 0;
          const timer = window.setInterval(() => {
            currentStep += 1;
            const ratio = Math.max(0, 1 - (currentStep / steps));
            activeAudio.volume = startVolume * ratio;
            if (currentStep >= steps) {
              window.clearInterval(timer);
              try {
                activeAudio.pause();
                activeAudio.currentTime = 0;
                activeAudio.volume = 1;
              } catch (_error) {
                // ignore
              }
              if (state.ui.identityAudio === activeAudio) {
                state.ui.identityAudio = null;
              }
              resolve(true);
            }
          }, 50);
        });
      }

      function playIdentityAudio(src) {
        if (!src) return;
        stopIdentityAudio();
        const audio = new Audio(src);
        audio.volume = 1;
        state.ui.identityAudio = audio;
        audio.addEventListener('ended', () => {
          if (state.ui.identityAudio === audio) state.ui.identityAudio = null;
        }, { once: true });
        audio.addEventListener('error', () => {
          if (state.ui.identityAudio === audio) state.ui.identityAudio = null;
        }, { once: true });
        audio.play().catch(() => {
          if (state.ui.identityAudio === audio) state.ui.identityAudio = null;
        });
      }

      function setIdentityGateVisibility() {
        const open = state.ui.nameGateOpen || state.ui.photoGateOpen;
        document.body.classList.toggle('identity-gate-open', open);
        els.nameGate?.classList.toggle('is-visible', state.ui.nameGateOpen);
        els.photoGate?.classList.toggle('is-visible', state.ui.photoGateOpen);
        if (open) {
          state.ui.onboardingGateQueued = false;
          state.game.paused = true;
          cleanupGameRecognition();
          stopActiveAudio();
          try {
            window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
          } catch (_error) {
            window.scrollTo(0, 0);
          }
          document.documentElement.scrollTop = 0;
          document.body.scrollTop = 0;
          return;
        }
        if (state.game.active) {
          state.game.paused = false;
          const currentEntryExists = state.game.currentId && state.game.entries.has(state.game.currentId);
          if (!currentEntryExists && state.game.entries.size) {
            advanceToNextCard();
          }
        }
      }

      function clearScheduledOnboardingGate() {
        if (!state.ui.onboardingGateTimer) return;
        window.clearTimeout(state.ui.onboardingGateTimer);
        state.ui.onboardingGateTimer = 0;
      }

      function scheduleOnboardingGateOpen(delayMs = ONBOARDING_GATE_OPEN_DELAY_MS) {
        clearScheduledOnboardingGate();
        state.ui.onboardingGateQueued = true;
        state.ui.onboardingGateTimer = window.setTimeout(() => {
          state.ui.onboardingGateTimer = 0;
          maybeOpenOnboardingGate().catch((error) => {
            state.ui.onboardingGateQueued = false;
            console.warn('Falha ao abrir onboarding de identidade:', error);
          });
        }, Math.max(0, Number(delayMs) || 0));
      }

      function wait(ms) {
        return new Promise((resolve) => {
          window.setTimeout(resolve, ms);
        });
      }

      function getOnboardingTransitionTargets() {
        if (state.ui.nameGateOpen && els.nameGateCard) {
          return [els.nameGateCard];
        }
        if (state.ui.photoGateOpen && els.photoGateCard) {
          return [els.photoGateCard];
        }
        return els.appShell ? [els.appShell] : [];
      }

      async function runOnboardingGateTransition() {
        const targets = getOnboardingTransitionTargets().filter(Boolean);
        if (!targets.length) return;
        stopActiveAudio();
        stopIdentityAudio();
        stopPremiumAudio();
        stopSoundTestAudio();
        targets.forEach((target) => target.classList.add('onboarding-transition-target', 'is-onboarding-exiting'));
        await wait(ONBOARDING_GATE_TRANSITION_MS);
        targets.forEach((target) => target.classList.remove('is-onboarding-exiting', 'onboarding-transition-target'));
      }

      async function redirectToUsernameOnRewardThreshold() {
        if (state.ui.onboardingTransitionActive) return;
        state.ui.onboardingTransitionActive = true;
        try {
          await runOnboardingGateTransition();
          const nextHref = resolveRewardUsernameHref();
          if (window.PlaytalkNative && typeof window.PlaytalkNative.navigate === 'function') {
            window.PlaytalkNative.navigate(nextHref);
            return;
          }
          window.location.href = nextHref;
        } finally {
          state.ui.onboardingTransitionActive = false;
        }
      }

      async function ensureProvisionedUser() {
        if (state.user?.id) return state.user;
        const response = await fetch(buildApiUrl('/auth/provision-temp'), {
          method: 'POST',
          headers: buildAuthHeaders({
            'Content-Type': 'application/json'
          })
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload?.success) {
          throw new Error(payload?.message || 'Nao foi possivel preparar o usuario.');
        }
        const user = normalizeUser(payload.user);
        if (!user) {
          throw new Error('Nao foi possivel preparar o perfil.');
        }
        state.user = user;
        renderProfilePanel();
        renderMetrics();
        return user;
      }

      function setNameGateStatus(message, tone = '') {
        if (!els.nameGateStatus) return;
        els.nameGateStatus.textContent = message || '';
        els.nameGateStatus.className = 'identity-gate__status';
        if (tone) els.nameGateStatus.classList.add(`is-${tone}`);
      }

      function formatOnboardingName(value) {
        return safeText(value).slice(0, 24);
      }

      function renderNameGate() {
        if (els.nameGateDisplay) {
          els.nameGateDisplay.textContent = formatOnboardingName(state.ui.nameDraft) || '\u00A0';
        }
        if (els.nameGateContinueBtn) {
          els.nameGateContinueBtn.disabled = state.ui.nameGateBusy || formatOnboardingName(state.ui.nameDraft).length < ONBOARDING_MIN_NAME_LENGTH;
        }
      }

      function renderNameKeyboard() {
        if (!els.nameGateKeyboard) return;
        const letters = [
          ...ONBOARDING_KEYBOARD_LETTERS,
          ['W', 'X'][state.ui.nameKeyboardVariantIndex % 2],
          ['X', 'Z'][state.ui.nameKeyboardVariantIndex % 2]
        ];
        els.nameGateKeyboard.innerHTML = '';
        for (let rowIndex = 0; rowIndex < 4; rowIndex += 1) {
          const row = document.createElement('div');
          row.className = 'identity-gate__keyboard-row';
          letters.slice(rowIndex * 6, rowIndex * 6 + 6).forEach((letter) => {
            const key = document.createElement('button');
            key.type = 'button';
            key.className = 'identity-gate__key';
            key.textContent = letter;
            key.addEventListener('click', () => {
              if (state.ui.nameGateBusy || state.ui.nameDraft.length >= 24) return;
              state.ui.nameDraft = `${state.ui.nameDraft}${letter}`;
              setNameGateStatus('');
              renderNameGate();
            });
            row.appendChild(key);
          });
          els.nameGateKeyboard.appendChild(row);
        }
      }

      function startNameKeyboardTicker() {
        if (state.ui.nameKeyboardTimer) {
          window.clearInterval(state.ui.nameKeyboardTimer);
        }
        state.ui.nameKeyboardTimer = window.setInterval(() => {
          state.ui.nameKeyboardVariantIndex = (state.ui.nameKeyboardVariantIndex + 1) % 2;
          renderNameKeyboard();
        }, 1200);
      }

      function stopNameKeyboardTicker() {
        if (!state.ui.nameKeyboardTimer) return;
        window.clearInterval(state.ui.nameKeyboardTimer);
        state.ui.nameKeyboardTimer = 0;
      }

      async function openNameGate() {
        if (state.ui.onboardingTransitionActive) return;
        clearScheduledOnboardingGate();
        state.ui.onboardingTransitionActive = true;
        try {
          await runOnboardingGateTransition();
          state.ui.onboardingGateQueued = false;
          state.ui.nameGateOpen = true;
          state.ui.photoGateOpen = false;
          state.ui.nameDraft = safeText(state.user?.onboardingNameCompleted ? state.user?.username : state.user?.username || '');
          state.ui.nameKeyboardVariantIndex = 0;
          renderNameKeyboard();
          startNameKeyboardTicker();
          renderNameGate();
          setNameGateStatus('');
          setIdentityGateVisibility();
          playIdentityAudio(ONBOARDING_USERNAME_AUDIO_PATH);
        } finally {
          state.ui.onboardingTransitionActive = false;
        }
      }

      function closeNameGate() {
        state.ui.nameGateOpen = false;
        stopNameKeyboardTicker();
        setIdentityGateVisibility();
      }

      async function submitNameGate() {
        const nextUsername = formatOnboardingName(state.ui.nameDraft);
        if (nextUsername.length < ONBOARDING_MIN_NAME_LENGTH) {
          setNameGateStatus('Escolha um nome com pelo menos 3 caracteres.', 'error');
          return;
        }
        state.ui.nameGateBusy = true;
        renderNameGate();
        setNameGateStatus('Salvando nome...');
        try {
          const response = await fetch(buildApiUrl('/auth/profile'), {
            method: 'PATCH',
            headers: buildAuthHeaders({
              'Content-Type': 'application/json'
            }),
            body: JSON.stringify({ username: nextUsername })
          });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok || !payload?.success) {
            throw new Error(payload?.message || 'Nao foi possivel salvar o nome.');
          }
          const user = normalizeUser(payload.user);
          if (user) {
            state.user = user;
          }
          renderProfilePanel();
          renderMetrics();
          const openedNextGate = await maybeOpenOnboardingGate();
          if (!openedNextGate) {
            closeNameGate();
          }
        } catch (error) {
          setNameGateStatus(error?.message || 'Nao foi possivel salvar o nome.', 'error');
        } finally {
          state.ui.nameGateBusy = false;
          renderNameGate();
        }
      }

      function currentPhotoVersion() {
        return state.ui.photoVersions[state.ui.photoVersionIndex] || null;
      }

      function stopPhotoLoadingCopy() {
        if (state.ui.photoLoadingTimer) {
          window.clearInterval(state.ui.photoLoadingTimer);
          state.ui.photoLoadingTimer = 0;
        }
      }

      function formatOnboardingLoadingMessage(message) {
        const words = String(message || '').trim().split(/\s+/).filter(Boolean);
        if (words.length <= 2) {
          return words.join(' ');
        }

        let bestIndex = 1;
        let bestScore = Number.POSITIVE_INFINITY;
        for (let index = 1; index < words.length; index += 1) {
          const firstLine = words.slice(0, index).join(' ');
          const secondLine = words.slice(index).join(' ');
          const score = Math.abs(firstLine.length - secondLine.length);
          if (score < bestScore) {
            bestScore = score;
            bestIndex = index;
          }
        }

        return `${words.slice(0, bestIndex).join(' ')}\n${words.slice(bestIndex).join(' ')}`;
      }

      function startPhotoLoadingCopy() {
        stopPhotoLoadingCopy();
        state.ui.photoLoadingMessageIndex = 0;
        if (els.photoGateLoadingCopy) {
          els.photoGateLoadingCopy.textContent = formatOnboardingLoadingMessage(ONBOARDING_LOADING_MESSAGES[0]);
        }
        state.ui.photoLoadingTimer = window.setInterval(() => {
          state.ui.photoLoadingMessageIndex += 1;
          if (!els.photoGateLoadingCopy) return;
          if (state.ui.photoLoadingMessageIndex >= ONBOARDING_LOADING_MESSAGES.length) {
            els.photoGateLoadingCopy.textContent = 'Finalizando';
            return;
          }
          els.photoGateLoadingCopy.textContent = formatOnboardingLoadingMessage(ONBOARDING_LOADING_MESSAGES[state.ui.photoLoadingMessageIndex]);
        }, 2000);
      }

      function renderPhotoGate() {
        const currentVersion = currentPhotoVersion();
        els.photoGate?.classList.toggle('is-generating', Boolean(state.ui.photoGateBusy));
        if (els.photoGateCircle) {
          if (state.ui.photoGateBusy && state.ui.photoSourceDataUrl) {
            const safeSource = escapeHtml(state.ui.photoSourceDataUrl);
            els.photoGateCircle.innerHTML = `
              <img class="identity-gate__photo-layer identity-gate__photo-layer--3" src="${safeSource}" alt="">
              <img class="identity-gate__photo-layer identity-gate__photo-layer--2" src="${safeSource}" alt="">
              <img class="identity-gate__photo-layer identity-gate__photo-layer--1" src="${safeSource}" alt="">
            `;
          } else {
            els.photoGateCircle.innerHTML = currentVersion?.image
              ? `<img src="${escapeHtml(currentVersion.image)}" alt="Foto ilustrada do usuario">`
              : '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 4.5 7.5 6H5.75A2.75 2.75 0 0 0 3 8.75v8.5A2.75 2.75 0 0 0 5.75 20h12.5A2.75 2.75 0 0 0 21 17.25v-8.5A2.75 2.75 0 0 0 18.25 6H16.5L15 4.5H9Zm3 12.75a4.25 4.25 0 1 1 0-8.5 4.25 4.25 0 0 1 0 8.5Zm0-1.75a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/></svg>';
          }
          els.photoGateCircle.classList.toggle('is-busy', state.ui.photoGateBusy && Boolean(state.ui.photoSourceDataUrl));
        }
        if (els.photoGateStatus) {
          els.photoGateStatus.textContent = '';
        }
        if (els.photoGateContinueBtn) {
          els.photoGateContinueBtn.disabled = state.ui.photoGateBusy || !currentVersion?.image;
        }
        if (els.photoGateRegenerateBtn) {
          els.photoGateRegenerateBtn.disabled = state.ui.photoGateBusy || state.ui.photoGenerationCount >= ONBOARDING_MAX_PHOTO_GENERATIONS || !state.ui.photoSourceDataUrl;
        }
        if (els.photoGateActions) {
          els.photoGateActions.classList.toggle('is-hidden', state.ui.photoGateBusy);
        }
      }

      async function openPhotoGate() {
        if (state.ui.onboardingTransitionActive) return;
        clearScheduledOnboardingGate();
        state.ui.onboardingTransitionActive = true;
        try {
          await runOnboardingGateTransition();
          state.ui.onboardingGateQueued = false;
          state.ui.photoGateOpen = true;
          state.ui.nameGateOpen = false;
          state.ui.photoVersions = Array.isArray(state.user?.avatarVersions) ? state.user.avatarVersions.slice(0, 5) : [];
          state.ui.photoVersionIndex = Math.max(0, state.ui.photoVersions.length - 1);
          state.ui.photoGenerationCount = Math.max(state.ui.photoVersions.length, Number(state.user?.avatarGenerationCount || 0));
          if (els.photoGateLoadingCopy) {
            els.photoGateLoadingCopy.textContent = '';
          }
          renderPhotoGate();
          setIdentityGateVisibility();
          playIdentityAudio(ONBOARDING_PHOTO_AUDIO_PATH);
        } finally {
          state.ui.onboardingTransitionActive = false;
        }
      }

      function closePhotoGate() {
        state.ui.photoGateOpen = false;
        stopPhotoLoadingCopy();
        setIdentityGateVisibility();
      }

      function flashPhotoGateResult() {
        if (!els.photoGateCircle) return;
        els.photoGateCircle.classList.remove('is-flash');
        void els.photoGateCircle.offsetWidth;
        els.photoGateCircle.classList.add('is-flash');
        if (state.ui.photoFlashTimer) {
          window.clearTimeout(state.ui.photoFlashTimer);
        }
        state.ui.photoFlashTimer = window.setTimeout(() => {
          els.photoGateCircle?.classList.remove('is-flash');
          state.ui.photoFlashTimer = 0;
        }, 700);
      }

      async function persistPhotoGateProfile() {
        const currentVersion = currentPhotoVersion();
        if (!currentVersion?.image) return;
        const response = await fetch(buildApiUrl('/auth/avatar'), {
          method: 'PATCH',
          headers: buildAuthHeaders({
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify({
            avatar: currentVersion.image,
            avatarVersions: state.ui.photoVersions,
            avatarGenerationCount: state.ui.photoGenerationCount,
            onboardingPhotoCompleted: true
          })
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload?.success) {
          throw new Error(payload?.message || 'Nao foi possivel salvar a foto.');
        }
        const user = normalizeUser(payload.user);
        if (user) {
          state.user = user;
        }
        renderProfilePanel();
      }

      async function generatePhotoVersionFromFile(file) {
        if (!file) return;
        if (state.ui.photoGenerationCount >= ONBOARDING_MAX_PHOTO_GENERATIONS) {
          if (els.photoGateLoadingCopy) {
            els.photoGateLoadingCopy.textContent = 'Voce chegou ao limite de 5 geracoes.';
          }
          return;
        }
        state.ui.photoGateBusy = true;
        renderPhotoGate();
        try {
          const sourceDataUrl = await fileToSquareWebpDataUrl(file, 400);
          state.ui.photoSourceDataUrl = sourceDataUrl;
          playIdentityAudio(ONBOARDING_PHOTO_RECEIVED_AUDIO_PATH);
          startPhotoLoadingCopy();
          const cartoonDataUrl = await createCartoonAvatar(sourceDataUrl);
          const optimizedCartoonDataUrl = await dataUrlToSquareWebpDataUrl(cartoonDataUrl, 400);
          if (state.ui.identityAudio?.src?.endsWith('photorecieve.mp3')) {
            await fadeOutIdentityAudio(1000);
          }
          stopPhotoLoadingCopy();
          if (els.photoGateLoadingCopy) {
            els.photoGateLoadingCopy.textContent = '';
          }
          state.ui.photoGenerationCount += 1;
          state.ui.photoVersions.push({
            image: optimizedCartoonDataUrl,
            source: sourceDataUrl,
            createdAt: new Date().toISOString()
          });
          state.ui.photoVersions = state.ui.photoVersions.slice(-ONBOARDING_MAX_PHOTO_GENERATIONS);
          state.ui.photoVersionIndex = state.ui.photoVersions.length - 1;
          playIdentityAudio(ONBOARDING_IMAGE_READY_AUDIO_PATH);
          flashPhotoGateResult();
          renderPhotoGate();
        } catch (error) {
          stopPhotoLoadingCopy();
          if (els.photoGateLoadingCopy) {
            els.photoGateLoadingCopy.textContent = error?.message || 'Nao foi possivel gerar o desenho.';
          }
        } finally {
          state.ui.photoGateBusy = false;
          renderPhotoGate();
        }
      }

      function showPreviousPhotoVersion() {
        if (state.ui.photoVersionIndex <= 0) return;
        state.ui.photoVersionIndex -= 1;
        renderPhotoGate();
      }

      function showNextPhotoVersion() {
        if (state.ui.photoVersionIndex >= state.ui.photoVersions.length - 1) return;
        state.ui.photoVersionIndex += 1;
        renderPhotoGate();
      }

      async function maybeOpenOnboardingGate() {
        const total = accessibleFlashcardsCount();
        if (shouldGatePremiumAccess()) {
          state.ui.onboardingGateQueued = false;
          return false;
        }
        if (total >= ONBOARDING_NAME_THRESHOLD) {
          const user = await ensureProvisionedUser();
          if (!user?.onboardingNameCompleted) {
            await openNameGate();
            return true;
          }
        }
        if (total >= ONBOARDING_PHOTO_THRESHOLD) {
          const user = await ensureProvisionedUser();
          if (!user?.onboardingPhotoCompleted) {
            await openPhotoGate();
            return true;
          }
        }
        state.ui.onboardingGateQueued = false;
        return false;
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
        state.userLevel = normalizeUserLevel(state.user.level);
        if (state.user.audio_check_completed) {
          persistAudioCheckCompletedFlag(true);
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
            console.warn('Sessao recusada ao carregar estado em nuvem; mantendo estado local.');
          } else {
            console.warn('Falha ao carregar estado salvo dos flashcards:', error);
          }
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
        state.userLevel = normalizeUserLevel(cloudState?.userLevel ?? cloudState?.meta?.userLevel ?? state.user.level);
        state.user.level = state.userLevel;
        state.game.tutorial.completed = readTutorialProgress();
        syncOwnedIdsFromProgress();
        reconcileTutorialProgress();

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
        void refreshLibraryRanking();
        renderProfilePanel();
        syncFlashcardsFooterVisibility();
        hideAuthGate();
        if (els.startGameBtn) {
          els.startGameBtn.disabled = false;
        }
        switchMainView('play');

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
        await refreshAdminWelcomeSummary();
        syncWelcomeGate();
      }

      async function handleLoggedOutState(message) {
        clearGameStatusRankTimer();
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
        state.admin.welcomeSummary = null;
        state.admin.reportFilter = '';
        state.admin.reportCounts = new Map();
        state.admin.draftCards = new Map();
        state.admin.pendingNewCards = [];
        clearLibrarySummaryTimer();
        clearLibrarySummaryFlashTimer();
        state.ui.librarySummaryMode = 'count';
        state.ui.librarySummaryRank = 0;
        resetTutorialRuntime({ preserveCompletion: false });
        state.game.tutorial.completed = readTutorialProgressForUser(0);
        syncOwnedIdsFromProgress();
        reconcileTutorialProgress();
        renderMetrics();
        updateGameChips();
        refreshLibrary();
        state.ui.profileAvatarDraft = '';
        renderProfilePanel();
        syncFlashcardsFooterVisibility();
        hideAuthGate();
        if (els.startGameBtn) {
          els.startGameBtn.disabled = false;
        }
        switchMainView('play');
        syncWelcomeGate();
        hideAuthGate();
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
          primeGameTouchButton();
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
        const protocol = String(window.location?.protocol || '').toLowerCase();
        const hostname = String(window.location?.hostname || '').toLowerCase();
        const port = String(window.location?.port || '').trim();
        return protocol === 'file:'
          || ((hostname === 'localhost' || hostname === '127.0.0.1') && !port);
      }

      function resolveUsersHref() {
        if (window.PlaytalkNative && typeof window.PlaytalkNative.resolveRouteHref === 'function') {
          return window.PlaytalkNative.resolveRouteHref('/users');
        }
        return isNativeRuntime() ? 'users.html' : '/users';
      }

      function resolveRewardUsernameHref() {
        const target = '/username?return=%2Fflashcards';
        if (window.PlaytalkNative && typeof window.PlaytalkNative.resolveRouteHref === 'function') {
          return window.PlaytalkNative.resolveRouteHref(target);
        }
        return target;
      }

      function resolveNativeRenderPageHref(view) {
        const nativeRouteMap = {
          play: '/play',
          cards: '/allcards',
          users: '/users',
          profile: '/account',
          premium: '/premium'
        };
        const mappedTarget = nativeRouteMap[String(view || '').toLowerCase()] || '/flashcards';
        if (window.PlaytalkNative && typeof window.PlaytalkNative.resolveRouteHref === 'function') {
          return window.PlaytalkNative.resolveRouteHref(mappedTarget);
        }

        const nativeBaseUrl = (() => {
          try {
            return String(window.PlaytalkApi?.baseUrl || 'https://fluentlevelup.com').trim().replace(/\/+$/, '');
          } catch (_error) {
            return 'https://fluentlevelup.com';
          }
        })();

        switch (String(view || '').toLowerCase()) {
          case 'play':
            return `${nativeBaseUrl}/flashcards`;
          case 'cards':
            return `${nativeBaseUrl}/allcards`;
          case 'users':
            return `${nativeBaseUrl}/users`;
          case 'profile':
            return `${nativeBaseUrl}/account`;
          default:
            return `${nativeBaseUrl}/flashcards`;
        }
      }

      async function syncFlashcardRankingNow() {
        return syncFlashcardCloudNow();
      }

      function scheduleFlashcardRankingSync(delayMs = 900) {
        scheduleFlashcardCloudSync(delayMs);
      }

      function phaseMeta(phaseIndex) {
        return REVIEW_PHASES[Math.max(1, Math.min(REVIEW_PHASE_MAX, Number(phaseIndex) || 1))] || REVIEW_PHASES[1];
      }

      function activeSealPhase(record) {
        if (!record) return 0;
        const imagePhase = phaseFromSealImage(record.sealImage || record.seal_image);
        if (imagePhase > 0) return imagePhase;
        if (record.status === 'memorizing') {
          return Math.max(1, Math.min(REVIEW_PHASE_MAX, Number(record.targetPhaseIndex) || Number(record.phaseIndex) || 1));
        }
        if ((record.phaseIndex || 0) >= 1) return record.phaseIndex;
        return 0;
      }

      function flashcardRankingWeight(record) {
        return Math.max(0, Math.min(REVIEW_PHASE_MAX, Number(activeSealPhase(record)) || 0));
      }

      function weightedAccessibleFlashcardsScore() {
        return userProgressCards().reduce((total, card) => total + flashcardRankingWeight(card.progress), 0);
      }

      function resolveRewardSealPhase(entry) {
        const currentRecord = state.userCards.get(entry.id) || null;
        if (!currentRecord) return 1;
        if (currentRecord.status === 'ready' && (currentRecord.phaseIndex || 0) >= REVIEW_PHASE_MAX) {
          return Math.max(1, currentRecord.phaseIndex || REVIEW_PHASE_MAX);
        }
        return Math.max(1, Math.min(REVIEW_PHASE_MAX, (currentRecord.phaseIndex || 0) + 1));
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
          record.phaseIndex = Math.max(1, Math.min(REVIEW_PHASE_MAX, Number(record.targetPhaseIndex) || 1));
          record.targetPhaseIndex = record.phaseIndex;
          record.memorizingStartedAt = 0;
          record.memorizingDurationMs = 0;
          record.availableAt = now;
          record.returnedAt = now;
          record.sealImage = phaseMeta(record.phaseIndex).sealPath;
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
        const nextPhase = Math.max(1, Math.min(REVIEW_PHASE_MAX, Number(targetPhaseIndex) || 1));
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
          createdAt: current.createdAt || now,
          sealImage: meta.sealPath
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
          .filter(card => card && !isCardHiddenForUser(card.id) && hasCoreFlashcardText(card) && hasPlayableFlashcardImage(card) && isCardAllowedForUserLevel(card));
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
        const isTrainingSetup = normalizeTrainingStage(state.game.training?.pendingStage) > 0;
        els.gameSetupCountCopy.textContent = total
          ? (isTrainingSetup
            ? `${total} flashcards disponiveis. Escolha de 10 a 60 para esse ciclo.`
            : `${total} flashcards disponiveis no total para jogar agora.`)
          : 'Nenhum flashcard disponivel para jogar agora.';
        syncTutorialSetupButton();
      }

      function normalizeUserLevel(value) {
        const parsed = Number.parseInt(String(value ?? '').trim(), 10);
        if (!Number.isInteger(parsed)) return USER_LEVEL_MIN;
        return Math.max(USER_LEVEL_MIN, Math.min(USER_LEVEL_MAX, parsed));
      }

      function userLevelCardTarget(level = currentUserLevel()) {
        const normalizedLevel = normalizeUserLevel(level);
        if (normalizedLevel >= USER_LEVEL_MAX) return 40;
        if (normalizedLevel >= 40) return 40;
        if (normalizedLevel >= 30) return 30;
        if (normalizedLevel >= 20) return 25;
        if (normalizedLevel === 19) return 20;
        if (normalizedLevel >= 18) return 19;
        return normalizedLevel + 2;
      }

      function currentBaseGameCount(level = currentUserLevel()) {
        return Math.max(MIN_GAME_CONTEXT_LIMIT, userLevelCardTarget(level));
      }

      function currentGameActiveCardCap(level = currentUserLevel(), baseCount = currentBaseGameCount(level)) {
        return Math.max(MIN_GAME_CONTEXT_LIMIT, Number(baseCount) || 0) + REVIEW_SLOT_LIMIT;
      }

      function normalizeDeckLevel(value) {
        const parsed = Number.parseInt(String(value ?? '').trim(), 10);
        return Number.isInteger(parsed) && parsed >= USER_LEVEL_MIN && parsed <= USER_LEVEL_MAX
          ? parsed
          : null;
      }

      function tutorialAudioPath(index) {
        return `${TUTORIAL_AUDIO_ROOT}/tuto${index}.mp3`;
      }

      function isTutorialPlanetByText(card) {
        const english = normalizeText(card?.english);
        const portuguese = normalizeText(card?.portuguese);
        return english === TUTORIAL_PLANET_ENGLISH && portuguese === TUTORIAL_PLANET_PORTUGUESE;
      }

      function applyTutorialPlanetCardDefaults(card) {
        if (!card) return card;
        const imageUrl = safeText(card.imageUrl).toLowerCase();
        const matchesPlanet = isTutorialPlanetByText(card)
          || imageUrl.includes('/planet.')
          || imageUrl.endsWith('planet.jpg')
          || imageUrl.endsWith('planet.webp');
        if (!matchesPlanet) return card;
        return {
          ...card,
          imageUrl: TUTORIAL_PLANET_IMAGE_URL
        };
      }

      function findTutorialPlanetCard() {
        return state.allCards.find((card) => {
          const imageUrl = safeText(card?.imageUrl).toLowerCase();
          return (
            isTutorialPlanetByText(card)
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

      function reconcileTutorialProgress() {
        if (isAdminUser()) return true;
        const unlocked = hasTutorialPlanetUnlocked();
        if (unlocked && !state.game.tutorial.completed) {
          state.game.tutorial.completed = true;
          persistTutorialProgressLocally();
        }
        if (!unlocked && state.game.tutorial.completed) {
          state.game.tutorial.completed = false;
          removeScopedStorage(TUTORIAL_PROGRESS_STORAGE_KEY);
        }
        return unlocked;
      }

      function isTutorialPlanetCard(cardOrId) {
        const tutorialCard = findTutorialPlanetCard();
        const card = typeof cardOrId === 'string' ? cardById(cardOrId) : cardOrId;
        return Boolean(tutorialCard && card && tutorialCard.id === card.id);
      }

      function shouldSuppressTutorialCardAudio(card) {
        return Boolean(
          state.game.tutorial.active
          && !state.game.tutorial?.muteNarration
          && isTutorialPlanetCard(card)
        );
      }

      function canOfferTutorialMode() {
        return false;
      }

      function syncFlashcardsFooterVisibility() {
        if (!els.flashcardsFooterNav) return;
        els.flashcardsFooterNav.hidden = false;
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
        return Promise.resolve(false);
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
        setTutorialInteractionLocked(true);
        setGameStatus('', '');
        gameShell?.classList.remove('is-tutorial-intro', 'is-tutorial-reveal');
        els.gameVisual.classList.remove('is-tutorial-mic-fade');
        els.gameVisual.classList.add('is-mic-live');
        triggerTutorialMicFlash();

        if (!isTutorialSequenceCurrent(token, entry.id)) return;
        setTutorialInteractionLocked(false);
        state.game.canListen = true;
        renderGameTouchButton(STAGES[entry.stage] || STAGES[1], entry);
        setGameStatus('Toque para falar', 'live');
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

        if (state.game.tutorial.sequenceToken !== token || !state.game.active) return;
        setTutorialCompleted(true);
        resetTutorialRuntime({ preserveCompletion: true });
        clearGameSessionLocally();
        saveSelectedGameCount(TUTORIAL_NORMAL_GAME_COUNT);
        switchMainView('play');
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

      function countFlashcardCharacters(text) {
        return safeText(text)
          .replace(/\s+/g, ' ')
          .trim()
          .length;
      }

      function isEarlyFlashcardLengthEligible(card) {
        return true;
      }

      function shouldRestrictEarlyFlashcards() {
        return false;
      }

      function applyEarlyFlashcardFilter(cards) {
        if (!shouldRestrictEarlyFlashcards()) return Array.isArray(cards) ? cards : [];
        return (Array.isArray(cards) ? cards : []).filter(isEarlyFlashcardLengthEligible);
      }

      function currentUserLevel() {
        return normalizeUserLevel(state.userLevel || state.user?.level || 1);
      }

      function cardDeckLevel(card) {
        return normalizeDeckLevel(card?.deckLevel);
      }

      function isCardAllowedForUserLevel(card) {
        if (isAdminUser()) return true;
        const deckLevel = cardDeckLevel(card);
        return deckLevel !== null && deckLevel <= currentUserLevel();
      }

      function currentLevelProgressCount(level = currentUserLevel()) {
        const targetLevel = normalizeUserLevel(level);
        let total = 0;
        state.userCards.forEach((record, cardId) => {
          if (!record) return;
          const card = state.allCards.find(item => item.id === cardId);
          if (!card || cardDeckLevel(card) !== targetLevel) return;
          total += 1;
        });
        return total;
      }

      function updateLevelProgressBar() {
        if (!els.flashcardLevelProgress || !els.flashcardLevelProgressBar) return;
        const show = Boolean(state.game.active && !isAdminUser());
        els.flashcardLevelProgress.hidden = !show;
        const level = currentUserLevel();
        const levelTarget = userLevelCardTarget(level);
        const count = state.lastLevelUpLevel
          ? levelTarget
          : Math.max(0, Math.min(levelTarget, currentLevelProgressCount(level)));
        const percent = (count / Math.max(1, levelTarget)) * 100;
        els.flashcardLevelProgressBar.style.width = `${percent.toFixed(2)}%`;
        syncWelcomeLevelProgress();
      }

      function maybeAdvanceUserLevel() {
        if (isAdminUser()) return false;
        const levelBefore = currentUserLevel();
        let nextLevel = levelBefore;
        while (
          nextLevel < USER_LEVEL_MAX
          && currentLevelProgressCount(nextLevel) >= userLevelCardTarget(nextLevel)
        ) {
          nextLevel = normalizeUserLevel(nextLevel + 1);
        }
        if (nextLevel === levelBefore) return false;
        state.userLevel = nextLevel;
        if (state.user) state.user.level = nextLevel;
        state.lastLevelUpLevel = nextLevel;
        saveUserProgress();
        updateLevelProgressBar();
        return true;
      }

      function baseCandidateCards() {
        if (isAdminUser()) {
          return state.allCards.filter((card) => hasCoreFlashcardText(card) && hasPlayableFlashcardImage(card));
        }
        const lockedCards = state.allCards.filter(card => !state.userCards.has(card.id) && !isCardHiddenForUser(card.id));
        const playableLockedCards = lockedCards.filter(card => hasCoreFlashcardText(card) && hasPlayableFlashcardImage(card) && isCardAllowedForUserLevel(card));
        return playableLockedCards;
      }

      function playableVisibleGameCards() {
        return state.allCards.filter((card) => (
          !isCardHiddenForUser(card.id)
          && hasCoreFlashcardText(card)
          && hasPlayableFlashcardImage(card)
          && isCardAllowedForUserLevel(card)
        ));
      }

      function baseRoundSourceCards() {
        const lockedCards = baseCandidateCards();
        if (lockedCards.length) return lockedCards;
        return playableVisibleGameCards();
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
        const deckLevel = normalizeDeckLevel(options.deckLevel);
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
            deckLevel,
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
        return buildApiUrl(`/${cleaned.replace(/^\/+/, '')}`);
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
        return encodedKey ? buildApiUrl(`/${FLASHCARDS_LOCAL_SOURCE_PREFIX}/${encodedKey}`) : '';
      }

      function isFlashcardsDeckPath(value) {
        const text = safeText(value);
        if (!text) return false;
        if (/^https?:\/\//i.test(text)) {
          try {
            const parsed = new URL(text);
            const parsedPath = decodeURIComponent(String(parsed.pathname || '')).replace(/^\/+/, '');
            return parsedPath.toLowerCase().endsWith('.json')
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

        return buildFlashcardsPublicUrl(fallbackName);
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
          deckLevel: normalizeDeckLevel(file?.deckLevel),
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
            count: file.count,
            deckLevel: normalizeDeckLevel(file?.deckLevel)
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
            idSource: file.idSource,
            deckLevel: file.deckLevel
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
        state.allCards = Array.isArray(freshPayload?.cards)
          ? freshPayload.cards.map((card) => applyTutorialPlanetCardDefaults(card))
          : [];
        state.deckCatalog = Array.isArray(freshPayload?.deckCatalog) ? freshPayload.deckCatalog : [];
        maybeAdvanceUserLevel();
        await refreshAdminDecks();
        await refreshAdminReportSummary();
        await refreshAdminWelcomeSummary();
        saveCachedCards(state.allCards);
        syncWelcomeAdminStats();
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
        const sealMarkup = `<button class="mini-card__seal-btn" type="button" data-admin-audio="${escapeHtml(card.id)}" aria-label="Ouvir audio do flashcard" ${card.audioUrl ? '' : 'disabled'}><img class="mini-card__seal" src="${escapeHtml(phaseMeta(REVIEW_PHASE_MAX).sealPath)}" alt="${escapeHtml(phaseMeta(REVIEW_PHASE_MAX).label)}" style="--seal-opacity:${escapeHtml(String(sealOpacity))}"></button>`;
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

      async function refreshAdminWelcomeSummary() {
        if (!isAdminUser()) {
          state.admin.welcomeSummary = null;
          syncWelcomeAdminStats();
          return;
        }
        try {
          const response = await fetch(buildApiUrl('/api/admin/flashcards/game-summary'), {
            headers: buildAuthHeaders(),
            cache: 'no-store'
          });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok || !payload?.success) {
            throw new Error(payload?.message || 'Falha ao carregar resumo dos decks.');
          }
          state.admin.welcomeSummary = normalizeWelcomeAdminSummary(payload);
        } catch (_error) {
          state.admin.welcomeSummary = null;
        }
        syncWelcomeAdminStats();
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
          state.admin.welcomeSummary = null;
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
        if (state.entry.cardsReloadInFlight) return false;
        state.entry.cardsReloadInFlight = true;
        try {
          const freshPayload = await refreshCardsFromNetwork();
          state.allCards = Array.isArray(freshPayload?.cards) ? freshPayload.cards : [];
          state.deckCatalog = Array.isArray(freshPayload?.deckCatalog) ? freshPayload.deckCatalog : [];
          await refreshAdminDecks();
          await refreshAdminReportSummary();
          await refreshAdminWelcomeSummary();
          saveCachedCards(state.allCards);
          syncWelcomeAdminStats();
          refreshLibrary();
          return true;
        } finally {
          state.entry.cardsReloadInFlight = false;
        }
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

      function hasTypePortugueseHint(cardId) {
        return Boolean(state.stats.secondStarErrorHeard);
      }

      function markTypePortugueseHint(cardId) {
        if (state.stats.secondStarErrorHeard) return;
        state.stats.secondStarErrorHeard = true;
        saveUserStats({ skipCloudSync: true });
      }

      function playCueAudio(src) {
        const resolved = resolveInlineMediaUrl(src);
        if (!resolved) return Promise.resolve(false);
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
        return audio.play().catch(() => false);
      }

      function isFooterGuardStage(entry = currentGameEntry()) {
        return false;
      }

      function syncFooterGuardState(entry = currentGameEntry()) {
        if (!els.flashcardsFooterNav) return;
        els.flashcardsFooterNav.classList.remove('is-stage-guarded', 'is-stage-guarded-primed');
      }

      function primeFooterNavigation(event) {
        if (!isFooterGuardStage()) return false;
        if (state.game.footerNavPrimed) return false;
        event?.preventDefault?.();
        event?.stopPropagation?.();
        state.game.footerNavPrimed = true;
        syncFooterGuardState();
        return true;
      }

      function buildGameReportOptions() {
        if (!els.gameReportOptions) return;
        els.gameReportOptions.innerHTML = FLASHCARD_REPORT_TYPES.map((item) => `
          <button class="btn game-report-menu__option" type="button" data-report-type="${escapeHtml(item.key)}">
            ${FLASHCARD_REPORT_ICONS[item.key] || ''}
            <span class="game-report-menu__label">${escapeHtml(item.label)}</span>
          </button>
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

      function clearLibrarySummaryTimer() {
        if (!state.ui.librarySummaryTimer) return;
        window.clearTimeout(state.ui.librarySummaryTimer);
        state.ui.librarySummaryTimer = 0;
      }

      function clearLibrarySummaryFlashTimer() {
        if (!state.ui.librarySummaryFlashTimer) return;
        window.clearTimeout(state.ui.librarySummaryFlashTimer);
        state.ui.librarySummaryFlashTimer = 0;
      }

      function flashLibrarySummary() {
        if (!els.allSectionCopy) return;
        clearLibrarySummaryFlashTimer();
        els.allSectionCopy.classList.remove('is-updating');
        void els.allSectionCopy.offsetWidth;
        els.allSectionCopy.classList.add('is-updating');
        state.ui.librarySummaryFlashTimer = window.setTimeout(() => {
          els.allSectionCopy?.classList.remove('is-updating');
          state.ui.librarySummaryFlashTimer = 0;
        }, 260);
      }

      function formatLibrarySummaryCount(count = accessibleFlashcardsCount()) {
        return `${Math.max(0, Number(count) || 0)} FlashCards`;
      }

      function formatLibrarySummaryRank(rank = state.ui.librarySummaryRank) {
        const normalizedRank = Math.max(0, Number(rank) || 0);
        return normalizedRank ? `${normalizedRank}\u00ba Lugar` : '';
      }

      function renderLibrarySummary(count = accessibleFlashcardsCount()) {
        if (!els.allSectionCopy) return;
        const nextText = state.ui.librarySummaryMode === 'rank'
          ? (formatLibrarySummaryRank() || formatLibrarySummaryCount(count))
          : formatLibrarySummaryCount(count);
        els.allSectionCopy.textContent = nextText;
      }

      async function refreshLibraryRanking() {
        if (!state.user?.id) {
          state.ui.librarySummaryRank = 0;
          return 0;
        }
        try {
          const response = await fetch(buildApiUrl('/api/rankings/flashcards'), {
            method: 'POST',
            headers: buildAuthHeaders({
              'Content-Type': 'application/json'
            }),
            cache: 'no-store'
          });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok || !payload?.success) {
            throw new Error(payload?.message || 'Falha ao carregar ranking.');
          }
          state.ui.librarySummaryRank = Math.max(0, Number(payload?.rank) || 0);
          return state.ui.librarySummaryRank;
        } catch (error) {
          console.warn('Falha ao atualizar ranking da home:', error);
          return state.ui.librarySummaryRank;
        }
      }

      function triggerLibrarySummaryRankSwap() {
        if (!LEGACY_FLASHCARDS_HOME_ENABLED) {
          clearLibrarySummaryTimer();
          return;
        }
        const nextCount = accessibleFlashcardsCount();
        state.ui.librarySummaryMode = 'count';
        state.ui.librarySummaryToken += 1;
        const token = state.ui.librarySummaryToken;
        clearLibrarySummaryTimer();
        renderLibrarySummary(nextCount);
        flashLibrarySummary();
        state.ui.librarySummaryTimer = window.setTimeout(async () => {
          state.ui.librarySummaryTimer = 0;
          if (token !== state.ui.librarySummaryToken) return;
          const rank = await refreshLibraryRanking();
          if (token !== state.ui.librarySummaryToken || !rank) return;
          state.ui.librarySummaryMode = 'rank';
          renderLibrarySummary(nextCount);
          flashLibrarySummary();
        }, LIBRARY_RANK_SWAP_DELAY_MS);
      }

      function refreshLibrary() {
        syncAdminTheme();
        if (LEGACY_FLASHCARDS_HOME_ENABLED) {
          const cards = userProgressCards().map(buildLibraryCardView);
          const visibleCards = currentLibraryPageSlice(cards);
          if (els.libraryTitle) {
            els.libraryTitle.textContent = 'FlashCards';
          }
          renderLibrarySummary(cards.length);
          renderMiniCards(
            els.allGrid,
            visibleCards,
            '0'
          );
          renderLibraryPagination(cards.length);
        } else {
          clearLibrarySummaryTimer();
          if (els.libraryTitle) {
            els.libraryTitle.textContent = '';
          }
          if (els.allSectionCopy) {
            els.allSectionCopy.textContent = '';
          }
          if (els.allGrid) {
            els.allGrid.innerHTML = '';
          }
          if (els.libraryPagination) {
            els.libraryPagination.hidden = true;
          }
        }
        renderMetrics();
        updateGameChips();
        syncGameSetupSummary();
        syncAdminTools();
        syncPremiumGateVisibility();
      }

      function renderStars(stars) {
        if (isTrainingMode()) {
          renderTrainingSequence();
          return;
        }
        els.gameStars.classList.remove('is-training-sequence');
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
        if (isTrainingMode()) {
          renderTrainingSequence();
          return;
        }
        els.gameStars.classList.remove('is-training-sequence');
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

      function renderTrainingSequence() {
        if (!els.gameStars) return;
        const training = state.game.training || {};
        const cycleSize = Math.max(1, Number(training.sourceIds?.length) || Number(training.selectedCount) || 1);
        const position = Math.max(1, Math.min(cycleSize, Number(training.cycleIndex) || 1));
        els.gameStars.classList.add('is-training-sequence');
        els.gameStars.textContent = `${Math.max(0, Number(training.hitStreak) || 0)} acertos`;
        if (els.gameStarCopy) {
          els.gameStarCopy.textContent = `${position}/${cycleSize}`;
        }
      }

      function clearGameLanguageSwapTimer() {
        if (state.game.languageSwapTimer) {
          window.clearInterval(state.game.languageSwapTimer);
          state.game.languageSwapTimer = 0;
        }
        if (state.game.languageSwapFadeTimer) {
          window.clearTimeout(state.game.languageSwapFadeTimer);
          state.game.languageSwapFadeTimer = 0;
        }
        if (els.gamePhaseWord) {
          els.gamePhaseWord.classList.remove('is-fading');
        }
        state.game.stageOneSwapShowsPortuguese = false;
      }

      function clearTypingPromptLoop() {
        if (state.game.typingPromptLoopTimer) {
          window.clearTimeout(state.game.typingPromptLoopTimer);
          window.clearInterval(state.game.typingPromptLoopTimer);
          state.game.typingPromptLoopTimer = 0;
        }
        clearSecondStarIdleHintTimers();
      }

      function clearSecondStarIdleHintTimers() {
        if (state.game.secondStarIdleHintDelayTimer) {
          window.clearTimeout(state.game.secondStarIdleHintDelayTimer);
          state.game.secondStarIdleHintDelayTimer = 0;
        }
        if (state.game.secondStarIdleHintRotateTimer) {
          window.clearInterval(state.game.secondStarIdleHintRotateTimer);
          state.game.secondStarIdleHintRotateTimer = 0;
        }
        state.game.secondStarIdleHintIndex = 0;
      }

      function clearTypingSkipAutomation() {
        state.game.typingSkipActive = false;
        state.game.typingSkipEntryId = '';
        state.game.typingSkipRunId = (Number(state.game.typingSkipRunId) || 0) + 1;
      }

      function readSecondStageTutorialCompleted(userId = state.user?.id) {
        return Boolean(readScopedStorage(SECOND_STAGE_TUTORIAL_DONE_STORAGE_KEY, false, userId));
      }

      function persistSecondStageTutorialCompleted(completed, userId = state.user?.id) {
        try {
          localStorage.setItem(
            storageKeyForUser(SECOND_STAGE_TUTORIAL_DONE_STORAGE_KEY, userId),
            JSON.stringify(Boolean(completed))
          );
        } catch (_error) {
          // ignore
        }
      }

      function clearStageTutorialReminder() {
        if (state.game.stageTutorialReminderTimer) {
          window.clearTimeout(state.game.stageTutorialReminderTimer);
          state.game.stageTutorialReminderTimer = 0;
        }
      }

      function getStageTutorialAssetPath(kind) {
        return kind === 'second' ? STAGE_TUTORIAL_TWO_IMAGE_PATH : STAGE_TUTORIAL_ONE_IMAGE_PATH;
      }

      function isFirstStageTutorialEligible(entry) {
        return Boolean(entry && Number(entry.stage) === 1 && Number(state.stats.speakings || 0) === 0);
      }

      function isSecondStageTutorialEligible(entry) {
        return Boolean(
          entry
          && Number(entry.stage) === 2
          && Number(entry.stars || 0) === 1
          && accessibleFlashcardsCount() === 0
          && !readSecondStageTutorialCompleted()
        );
      }

      function resolveStageTutorialKind(entry) {
        if (!ENABLE_STAGE_TUTORIALS) return '';
        if (isFirstStageTutorialEligible(entry)) return 'first';
        if (isSecondStageTutorialEligible(entry)) return 'second';
        return '';
      }

      function hideGameStageTutorial(options = {}) {
        if (!els.gameStageTutorial) return;
        const shouldResume = options.resume !== false;
        const dismissHandler = typeof state.ui.gameStageTutorialDismissHandler === 'function'
          ? state.ui.gameStageTutorialDismissHandler
          : null;
        state.ui.gameStageTutorialVisible = false;
        state.ui.gameStageTutorialKind = '';
        state.ui.gameStageTutorialDismissHandler = null;
        els.gameStageTutorial.classList.remove('is-visible');
        els.gameStageTutorial.setAttribute('aria-hidden', 'true');
        if (els.gameStageTutorialImage) {
          els.gameStageTutorialImage.removeAttribute('src');
        }
        if (shouldResume && dismissHandler) {
          dismissHandler();
        }
      }

      function showGameStageTutorial(kind, entry, onDismiss) {
        if (!els.gameStageTutorial || !els.gameStageTutorialImage) return false;
        if (!state.game.active || state.game.paused || state.game.currentId !== entry?.id) return false;
        if (!kind || state.ui.gameStageTutorialMissingAssets[kind]) return false;
        state.ui.gameStageTutorialVisible = true;
        state.ui.gameStageTutorialKind = kind;
        state.ui.gameStageTutorialDismissHandler = typeof onDismiss === 'function' ? onDismiss : null;
        els.gameStageTutorialImage.src = getStageTutorialAssetPath(kind);
        els.gameStageTutorial.classList.add('is-visible');
        els.gameStageTutorial.setAttribute('aria-hidden', 'false');
        return true;
      }

      function maybeShowStageTutorialBeforeCard(entry, options = {}) {
        if (!ENABLE_STAGE_TUTORIALS) return false;
        const skipKind = safeText(options.skipStageTutorialKind || options.skipKind);
        const kind = resolveStageTutorialKind(entry);
        if (!kind || kind === skipKind) return false;
        if (showGameStageTutorial(kind, entry, () => {
          if (!state.game.active || state.game.currentId !== entry?.id) return;
          renderCurrentCard({ skipStageTutorialKind: kind });
        })) {
          return true;
        }
        return false;
      }

      function scheduleStageTutorialReminder(entry) {
        if (!ENABLE_STAGE_TUTORIALS) return;
        clearStageTutorialReminder();
        const kind = resolveStageTutorialKind(entry);
        if (!kind || state.ui.gameStageTutorialMissingAssets[kind]) return;
        const delayMs = kind === 'second' ? STAGE_TUTORIAL_TWO_REMINDER_MS : STAGE_TUTORIAL_ONE_REMINDER_MS;
        state.game.stageTutorialReminderTimer = window.setTimeout(() => {
          state.game.stageTutorialReminderTimer = 0;
          if (!state.game.active || state.game.paused || state.game.currentId !== entry?.id) return;
          if (state.game.listening || state.ui.gameStageTutorialVisible) {
            scheduleStageTutorialReminder(entry);
            return;
          }
          const liveKind = resolveStageTutorialKind(entry);
          if (!liveKind || liveKind !== kind) return;
          showGameStageTutorial(liveKind, entry, () => {
            if (!state.game.active || state.game.currentId !== entry?.id) return;
            renderCurrentCard({ skipStageTutorialKind: liveKind });
          });
        }, delayMs);
      }

      function startTypingSkipAutomation(entry) {
        clearTypingSkipAutomation();
        state.game.typingSkipActive = true;
        state.game.typingSkipEntryId = safeText(entry?.id);
        return state.game.typingSkipRunId;
      }

      function isTypingSkipAutomationActive(entry, runId) {
        return Boolean(
          state.game.typingSkipActive
          && safeText(state.game.typingSkipEntryId) === safeText(entry?.id)
          && Number(state.game.typingSkipRunId) === Number(runId)
          && state.game.active
          && !state.game.paused
          && state.game.currentId === entry?.id
        );
      }

      function finishTypingSkipAutomation(runId) {
        if (Number(state.game.typingSkipRunId) !== Number(runId)) return;
        state.game.typingSkipActive = false;
        state.game.typingSkipEntryId = '';
      }

      function clearStageTwoHintTimer() {
        if (state.game.stageTwoHintTimer) {
          window.clearTimeout(state.game.stageTwoHintTimer);
          state.game.stageTwoHintTimer = 0;
        }
        els.gameVisual.classList.remove('is-image-ready');
        els.gameVisual.querySelector('.game-card__stage-two-hint')?.remove();
      }

      function clearFirstStageIdleTimer() {
        if (state.game.firstStageIdleTimer) {
          window.clearTimeout(state.game.firstStageIdleTimer);
          state.game.firstStageIdleTimer = 0;
        }
      }

      function clearFirstStageMicHint({ clearStatus = false } = {}) {
        if (state.game.firstStageMicHintTimer) {
          window.clearTimeout(state.game.firstStageMicHintTimer);
          state.game.firstStageMicHintTimer = 0;
        }
        if (state.game.firstStageMicHintRotationTimer) {
          window.clearInterval(state.game.firstStageMicHintRotationTimer);
          state.game.firstStageMicHintRotationTimer = 0;
        }
        state.game.firstStageMicHintIndex = 0;
        els.game?.classList.remove('is-first-stage-mic-hint-visible');
        if (clearStatus && safeText(els.game?.dataset?.phaseKey) === 'first-star') {
          els.gameStatus.textContent = '';
          els.gameStatus.className = 'game-status';
        }
      }

      function renderFirstStageMicHintMessage() {
        if (!els.gameStatus || safeText(els.game?.dataset?.phaseKey) !== 'first-star') return;
        const message = FIRST_STAGE_MIC_HINT_MESSAGES[state.game.firstStageMicHintIndex % FIRST_STAGE_MIC_HINT_MESSAGES.length];
        els.game.classList.add('is-first-stage-mic-hint-visible');
        els.gameStatus.className = 'game-status is-visible';
        els.gameStatus.innerHTML = message?.html || '';
      }

      function startFirstStageMicHintLoop(entry) {
        clearFirstStageMicHint({ clearStatus: true });
        if (!entry || Number(entry.stage) !== 1 || !state.game.active || state.game.currentId !== entry.id) return;
        state.game.firstStageMicHintIndex = 0;
        renderFirstStageMicHintMessage();
        state.game.firstStageMicHintRotationTimer = window.setInterval(() => {
          if (!state.game.active || state.game.paused || state.game.listening || state.game.currentId !== entry.id || Number(entry.stage) !== 1) {
            clearFirstStageMicHint({ clearStatus: true });
            return;
          }
          state.game.firstStageMicHintIndex = (state.game.firstStageMicHintIndex + 1) % FIRST_STAGE_MIC_HINT_MESSAGES.length;
          renderFirstStageMicHintMessage();
        }, FIRST_STAGE_MIC_HINT_ROTATION_MS);
      }

      function scheduleFirstStageMicHint(entry) {
        clearFirstStageMicHint({ clearStatus: true });
        if (!entry || Number(entry.stage) !== 1 || !state.game.active || state.game.currentId !== entry.id || state.game.listening) return;
        state.game.firstStageMicHintTimer = window.setTimeout(() => {
          state.game.firstStageMicHintTimer = 0;
          if (!state.game.active || state.game.paused || state.game.transitioning || state.game.listening) return;
          if (state.game.currentId !== entry.id || Number(entry.stage) !== 1) return;
          startFirstStageMicHintLoop(entry);
        }, FIRST_STAGE_MIC_HINT_DELAY_MS);
      }

      function scheduleFirstStageIdleTimer(entry) {
        clearFirstStageIdleTimer();
        if (!entry || entry.stage !== 1 || !state.game.active || state.game.currentId !== entry.id) return;
        state.game.firstStageIdleTimer = window.setTimeout(() => {
          state.game.firstStageIdleTimer = 0;
          if (!state.game.active || state.game.paused || state.game.transitioning) return;
          if (state.game.listening || state.game.currentId !== entry.id || entry.stage !== 1) return;
          removeGameEntry(entry.id);
          refillGameEntry(entry.pool);
          advanceToNextCard();
        }, 10000);
      }

      function scheduleStageTwoHintLoop(entry) {
        clearStageTwoHintTimer();
        if (!entry || entry.stage !== 2 || state.game.currentId !== entry.id || isTypingStage(entry)) return;

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
        if (!hasStageTwoPortugueseOverlay(entry) || Number(entry?.stage) === 2) {
          return baseConfig;
        }
        return {
          ...baseConfig,
          overlayFlag: ENGLISH_ICON_PATH,
          overlayClassName: 'game-card__phase-flag--english'
        };
      }

      function renderStageOneWordSwap(entry, hasSubword) {
        clearGameLanguageSwapTimer();
        if (entry.stage !== 1 || !hasSubword) return;
        state.game.stageOneSwapShowsPortuguese = true;

        const applyStageOneVisibility = () => {
          const showsPortuguese = state.game.stageOneSwapShowsPortuguese;
          els.gameWord.classList.toggle('is-stage-swap-hidden', showsPortuguese);
          els.gameSubword.classList.toggle('is-stage-swap-hidden', !showsPortuguese);
        };

        applyStageOneVisibility();
        state.game.languageSwapTimer = window.setInterval(() => {
          if (!state.game.active || state.game.currentId !== entry.id || entry.stage !== 1) {
            clearGameLanguageSwapTimer();
            return;
          }
          state.game.stageOneSwapShowsPortuguese = !state.game.stageOneSwapShowsPortuguese;
          applyStageOneVisibility();
        }, 1000);
      }

      function renderFirstStarPhaseWordSwap(entry, card) {
        clearGameLanguageSwapTimer();
        if (!els.gamePhaseWord || !entry || entry.stage !== 1 || !card) return;

        const english = capitalizeWords(card.english || card.portuguese || card.deckTitle || '');
        const portuguese = capitalizeWords(card.portuguese || card.english || card.deckTitle || '');
        const hasPortuguese = Boolean(safeText(card.portuguese || ''));

        const applyPhaseWord = () => {
          const showsPortuguese = state.game.stageOneSwapShowsPortuguese && hasPortuguese;
          const nextText = showsPortuguese ? portuguese : english;
          renderChipText(els.gamePhaseWord, nextText);
          els.gamePhaseWord.classList.toggle('is-english', !showsPortuguese);
          els.gamePhaseWord.classList.toggle('is-portuguese', showsPortuguese);
        };

        state.game.stageOneSwapShowsPortuguese = false;
        els.gamePhaseWord.classList.remove('is-fading');
        applyPhaseWord();

        if (!hasPortuguese) return;

        state.game.languageSwapTimer = window.setInterval(() => {
          if (!state.game.active || state.game.currentId !== entry.id || entry.stage !== 1) {
            clearGameLanguageSwapTimer();
            return;
          }
          els.gamePhaseWord.classList.add('is-fading');
          if (state.game.languageSwapFadeTimer) {
            window.clearTimeout(state.game.languageSwapFadeTimer);
          }
          state.game.languageSwapFadeTimer = window.setTimeout(() => {
            state.game.stageOneSwapShowsPortuguese = !state.game.stageOneSwapShowsPortuguese;
            applyPhaseWord();
            els.gamePhaseWord.classList.remove('is-fading');
            state.game.languageSwapFadeTimer = 0;
          }, 300);
        }, 1200);
      }

      function renderGameTouchButton(stageConfig, entry) {
        const stageNumber = Number(entry?.stage) || 0;
        const useBooksMic = stageNumber === 1 || stageNumber === 3 || stageNumber === 5;
        els.gameTouchBtn.parentElement.hidden = !useBooksMic;
        els.gameTouchBtn.className = 'game-touch';
        els.gameTouchBtn.textContent = '';
        els.gameTouchBtn.innerHTML = '';
        els.gameTouchBtn.setAttribute('aria-label', stageConfig.instruction || 'Ativar microfone');
        els.gameTouchBtn.disabled = !state.game.canListen;
        try {
          localStorage.setItem(GAME_TOUCH_ICON_STORAGE_KEY, GAME_TOUCH_ICON_MARKUP);
        } catch (_error) {
          // ignore
        }
        if (!useBooksMic) {
          els.gameTouchBtn.classList.add('is-hidden');
          return;
        }
        els.gameTouchBtn.parentElement.hidden = false;
        els.gameTouchBtn.classList.add('game-touch--books-mic');
        els.gameTouchBtn.innerHTML = GAME_TOUCH_ICON_MARKUP;
      }

      function primeGameTouchButton() {
        try {
          const cached = String(localStorage.getItem(GAME_TOUCH_ICON_STORAGE_KEY) || '').trim();
          if (cached) {
            els.gameTouchBtn.innerHTML = cached;
          } else {
            localStorage.setItem(GAME_TOUCH_ICON_STORAGE_KEY, GAME_TOUCH_ICON_MARKUP);
            els.gameTouchBtn.innerHTML = GAME_TOUCH_ICON_MARKUP;
          }
        } catch (_error) {
          els.gameTouchBtn.innerHTML = GAME_TOUCH_ICON_MARKUP;
        }
      }

      function playStatusCueAudio(path) {
        const resolved = resolveInlineMediaUrl(path);
        if (!resolved) return;
        try {
          const audio = new Audio(resolved);
          audio.preload = 'auto';
          audio.play().catch(() => {});
        } catch (_error) {
          // ignore
        }
      }

      function resolveRewardTrend(previousRank, nextRank) {
        const previous = Math.max(0, Number(previousRank) || 0);
        const current = Math.max(0, Number(nextRank) || 0);
        if (!previous || previous === current) return 'same';
        return current < previous ? 'up' : 'down';
      }

      function setGameStatus(text, tone, options = {}) {
        const phaseKey = safeText(els.game?.dataset?.phaseKey || '');
        const speakingStarPhase = phaseKey === 'first-star' || phaseKey === 'third-star' || phaseKey === 'fifth-star';
        const normalizedText = safeText(text);
        const suppressedSpeakingStarStatuses = new Set([
          'Toque para ligar o microfone',
          'Microfone ligado',
          'Toque para falar',
          'Ouvindo...',
          'Analisando...'
        ]);
        const resolvedText = speakingStarPhase && suppressedSpeakingStarStatuses.has(normalizedText)
          ? ''
          : (text || '');
        els.gameStatus.textContent = resolvedText;
        els.gameStatus.className = 'game-status';
        if (els.gameStatusIcon) {
          const iconPath = safeText(options.iconPath);
          els.gameStatusIcon.className = 'game-status-icon';
          els.gameStatusIcon.removeAttribute('src');
          els.gameStatusIcon.alt = '';
          if (iconPath) {
            els.gameStatusIcon.src = iconPath;
            els.gameStatusIcon.alt = safeText(options.iconLabel) || '';
            els.gameStatusIcon.classList.add('is-visible');
          }
        }
        if (tone) {
          els.gameStatus.classList.add(`is-${tone}`);
        }
        if (resolvedText) {
          els.gameStatus.classList.add('is-visible');
        }
      }

      function updateGuestFirstStarResultsBanner(entry, micActive = false) {
        if (!els.gameResultsScreen) return;
        const isFirstStar = Boolean(entry && Number(entry.stage) === 1);
        const isGuest = !state.user?.id;
        if (!isFirstStar || !isGuest) {
          els.gameResultsScreen.style.display = 'none';
          els.gameResultsScreen.textContent = '';
          els.gameResultsScreen.setAttribute('aria-hidden', 'true');
          return;
        }
        els.gameResultsScreen.style.display = 'none';
        els.gameResultsScreen.textContent = '';
        els.gameResultsScreen.setAttribute('aria-hidden', 'true');
      }

      function clearStageHintLoop({ clearStatus = false } = {}) {
        if (state.game.stageHintTimer) {
          window.clearInterval(state.game.stageHintTimer);
          state.game.stageHintTimer = 0;
        }
        state.game.stageHintIndex = 0;
        if (clearStatus) {
          const phaseKey = safeText(els.game?.dataset?.phaseKey);
          if (phaseKey === 'third-star' || phaseKey === 'fifth-star') {
            setGameStatus('', '');
          }
        }
      }

      function isFifthStarEntry(entry) {
        return Boolean(entry && Number(entry.stage) === 5);
      }

      function shouldShowStageHintLoop(entry) {
        if (!entry || !state.game.active || state.game.listening) return false;
        const stage = Number(entry.stage) || 0;
        if (stage === 3) {
          return !state.user?.id;
        }
        if (stage === 5) {
          return !state.game.fifthStarHintDismissed;
        }
        return false;
      }

      function stageHintMessagesForEntry(entry) {
        const stage = Number(entry?.stage) || 0;
        if (stage === 3) return THIRD_STAR_HINT_MESSAGES;
        if (stage === 5) return FIFTH_STAR_HINT_MESSAGES;
        return [];
      }

      function startStageHintLoop(entry) {
        if (!shouldShowStageHintLoop(entry)) {
          clearStageHintLoop();
          return;
        }
        clearStageHintLoop();
        const applyMessage = () => {
          if (!shouldShowStageHintLoop(entry) || state.game.currentId !== entry.id) {
            clearStageHintLoop();
            return;
          }
          const messages = stageHintMessagesForEntry(entry);
          if (!messages.length) {
            clearStageHintLoop();
            return;
          }
          const message = messages[state.game.stageHintIndex % messages.length];
          state.game.stageHintIndex = (state.game.stageHintIndex + 1) % messages.length;
          setGameStatus(message, 'live');
        };
        applyMessage();
        state.game.stageHintTimer = window.setInterval(applyMessage, FIFTH_STAR_HINT_ROTATION_MS);
      }

      function clearGameStatusRankTimer() {
        if (!state.ui.gameStatusRankTimer) return;
        window.clearTimeout(state.ui.gameStatusRankTimer);
        state.ui.gameStatusRankTimer = 0;
      }

      async function refreshCurrentPlayerRank() {
        try {
          await ensureProvisionedUser();
          const maxAttempts = 4;
          for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
            await syncFlashcardCloudNow();
            const response = await fetch(buildApiUrl('/api/users/flashcards?limit=50'), {
              headers: buildAuthHeaders(),
              cache: 'no-store',
              credentials: 'include'
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok || !payload?.success) {
              throw new Error(payload?.message || 'Falha ao carregar usuarios.');
            }
            const nextRank = Math.max(0, Number(payload?.viewer?.rank) || 0);
            if (nextRank > 0) {
              state.ui.librarySummaryRank = nextRank;
              return nextRank;
            }
            if (attempt < (maxAttempts - 1)) {
              await wait(350);
            }
          }
          return Math.max(0, Number(state.ui.librarySummaryRank) || 0);
        } catch (error) {
          console.warn('Falha ao atualizar posicao do jogador:', error);
          return Math.max(0, Number(state.ui.librarySummaryRank) || 0);
        }
      }

      function showRewardGameStatus() {
        clearStageHintLoop();
        const levelUpLevel = Math.max(0, Number(state.lastLevelUpLevel) || 0);
        const flashcardsCount = weightedAccessibleFlashcardsScore();
        state.ui.gameStatusRankToken += 1;
        const token = state.ui.gameStatusRankToken;
        clearGameStatusRankTimer();
        if (levelUpLevel) {
          setGameStatus(`Voce chegou no Nivel ${levelUpLevel}`, 'flashcards-count');
          if (els.gameStarCopy) {
            els.gameStarCopy.textContent = `Voce chegou no Nivel ${levelUpLevel}`;
          }
          state.lastLevelUpLevel = 0;
        } else {
          setGameStatus(`${flashcardsCount} FlashCards`, 'flashcards-count');
        }
        state.ui.gameStatusRankTimer = window.setTimeout(async () => {
          state.ui.gameStatusRankTimer = 0;
          if (token !== state.ui.gameStatusRankToken || !state.game.active) return;
          const rank = await refreshCurrentPlayerRank();
          if (token !== state.ui.gameStatusRankToken || !state.game.active || rank <= 0) return;
          const trend = resolveRewardTrend(state.ui.gameStatusPreviousRank, rank);
          state.ui.gameStatusPreviousRank = rank;
          setGameStatus(`${rank}\u00ba Lugar`, 'flashcards-count', {
            iconPath: REWARD_STATUS_ICON_PATHS[trend] || '',
            iconLabel: trend
          });
          if (trend === 'up') {
            playStatusCueAudio(REWARD_STATUS_UP_AUDIO_PATH);
          }
        }, LIBRARY_RANK_SWAP_DELAY_MS);
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

      function setGameVisualNeonState(mode = 'default') {
        if (!els.gameVisual) return;
        els.gameVisual.classList.remove('is-neon-touch', 'is-neon-audio');
        if (mode === 'touch') {
          els.gameVisual.classList.add('is-neon-touch');
          return;
        }
        if (mode === 'audio') {
          els.gameVisual.classList.add('is-neon-audio');
        }
      }

      function flashGameVisualBlockedAudio() {
        if (!els.gameVisual) return;
        setGameVisualNeonState('audio');
        if (state.game.blockedAudioFlashTimer) {
          window.clearTimeout(state.game.blockedAudioFlashTimer);
        }
        state.game.blockedAudioFlashTimer = window.setTimeout(() => {
          state.game.blockedAudioFlashTimer = 0;
          if (state.game.listening) {
            setGameVisualNeonState('touch');
            return;
          }
          setGameVisualNeonState('default');
        }, 420);
      }

      function stopActiveAudio() {
        const current = state.game.activeAudio;
        setGameVisualNeonState('default');
        if (state.game.blockedAudioFlashTimer) {
          window.clearTimeout(state.game.blockedAudioFlashTimer);
          state.game.blockedAudioFlashTimer = 0;
        }
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
        setGameVisualNeonState('default');
        if (state.game.blockedAudioFlashTimer) {
          window.clearTimeout(state.game.blockedAudioFlashTimer);
          state.game.blockedAudioFlashTimer = 0;
        }
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
        clearFirstStageMicHint({ clearStatus: true });
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
        if (state.game.blockedAudioFlashTimer) {
          window.clearTimeout(state.game.blockedAudioFlashTimer);
          state.game.blockedAudioFlashTimer = 0;
        }
        setGameVisualNeonState('default');
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
          const cachedAudio = state.game.preloadAudios.get(card.audioUrl);
          const audio = cachedAudio || new Audio(card.audioUrl);
          try {
            audio.pause();
            audio.currentTime = 0;
          } catch (_error) {
            // ignore
          }
          audio.preload = 'auto';
          audio.playbackRate = rate;
          audio.defaultPlaybackRate = rate;
          audio.preservesPitch = true;
          if (options.enableMicDuringPlayback !== false) {
            scheduleGameMicUnlock(
              state.game.currentId ? state.game.entries.get(state.game.currentId) : null,
              options.unlockDelayMs
            );
          }
          return playAudioWithSoftEnd(audio, { registerAsActive: true }).then((played) => {
            if (played) {
              addListeningCharsForCard(card);
              updateGameChips();
            }
            return played;
          });
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
        return;
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

      async function playStageResponseSequence(stageNumber, card, options = {}) {
        if (!card) return;
        if (stageNumber === 2) {
          triggerStageTwoFocusReveal(card);
          await wait(500);
          if (!options.skipPromptAudio) {
            await playPromptAudio(card);
          }
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

      function preloadCardAudio(card) {
        const src = safeText(card?.audioUrl);
        if (!src || state.game.preloadAudios.has(src)) return;
        try {
          const audio = new Audio(src);
          audio.preload = 'auto';
          audio.load();
          state.game.preloadAudios.set(src, audio);
        } catch (_error) {
          // ignore
        }
      }

      function clearGameMicUnlockTimer() {
        if (state.game.micUnlockTimer) {
          window.clearTimeout(state.game.micUnlockTimer);
          state.game.micUnlockTimer = 0;
        }
        state.game.micUnlockCardId = '';
        state.game.micUnlockStage = 0;
        state.game.audioCanBeInterruptedAt = 0;
      }

      function scheduleGameMicUnlock(entry, delayMs = GAME_MIC_UNLOCK_DELAY_MS) {
        clearGameMicUnlockTimer();
        const entryId = safeText(entry?.id);
        const entryStage = Number(entry?.stage) || 0;
        if (!entryId || !entryStage || isTypingStage(entry)) return;
        state.game.micUnlockCardId = entryId;
        state.game.micUnlockStage = entryStage;
        state.game.audioCanBeInterruptedAt = Date.now() + Math.max(0, Number(delayMs) || 0);
        state.game.micUnlockTimer = window.setTimeout(() => {
          state.game.micUnlockTimer = 0;
          if (!state.game.active || state.game.currentId !== entryId) return;
          const currentEntry = state.game.entries.get(entryId);
          if (!currentEntry || Number(currentEntry.stage) !== entryStage) return;
          state.game.canListen = true;
          renderGameTouchButton(STAGES[currentEntry.stage] || STAGES[1], currentEntry);
        }, Math.max(0, Number(delayMs) || 0));
      }

      function primeCurrentAndUpcomingGameMedia(currentCard = null) {
        const cards = [];
        if (currentCard) {
          cards.push(currentCard);
        }
        state.game.queue
          .slice(0, GAME_UPCOMING_PRELOAD_COUNT)
          .forEach((nextId) => {
            const nextCard = cardById(nextId);
            if (nextCard) {
              cards.push(nextCard);
            }
          });
        cards.forEach((card) => {
          preloadCardImage(card);
          preloadCardAudio(card);
        });
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
        if (els.gameActiveValue) {
          els.gameActiveValue.textContent = String(state.stats.speakings || 0);
        }
        if (els.gameQueueValue) {
          els.gameQueueValue.textContent = String(state.stats.listenings || 0);
        }
        if (els.gameOwnedValue) {
          els.gameOwnedValue.textContent = String(accessibleFlashcardsCount());
        }
        const activeCount = state.game.entries.size || 0;
        const targetCount = state.game.contextLimit || DEFAULT_GAME_CONTEXT_LIMIT;
        els.gameHeaderCopy.textContent = `${activeCount}/${targetCount} cartas ativas na mesa.`;
        updateLevelProgressBar();
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

      function createTrainingGameEntry(card, stage) {
        const entry = createGameEntry(card, 'training');
        entry.stage = normalizeTrainingStage(stage) || 1;
        entry.training = true;
        return entry;
      }

      function trainingSourceCards() {
        const source = isAdminUser()
          ? userProgressCards()
          : uniqueCardsById([
              ...baseCandidateCards(),
              ...readyReviewCards()
            ]);
        return source.filter((card) => card && isCardEligibleForGame(card));
      }

      function buildTrainingCycleSourceIds(count) {
        const source = trainingSourceCards();
        const targetCount = Math.min(source.length, normalizeTrainingCount(count));
        return shuffle(source).slice(0, targetCount).map((card) => card.id).filter(Boolean);
      }

      function refillTrainingCycle() {
        if (!isTrainingMode()) return false;
        const training = state.game.training;
        const sourceIds = Array.isArray(training.sourceIds) ? training.sourceIds.filter((id) => cardById(id)) : [];
        if (!sourceIds.length) return false;
        state.game.entries.clear();
        state.game.queue = [];
        shuffle(sourceIds).forEach((cardId) => {
          const card = cardById(cardId);
          if (!card) return;
          const entry = createTrainingGameEntry(card, training.stage);
          state.game.entries.set(entry.id, entry);
          state.game.queue.push(entry.id);
        });
        training.cycleIndex = 0;
        training.cycleNumber = Math.max(0, Number(training.cycleNumber) || 0) + 1;
        return state.game.queue.length > 0;
      }

      function applyGameSessionSnapshot(snapshot, { addFreshCard = false } = {}) {
        if (!snapshot || !state.entry.cardsReady || state.game.tutorial.active) return false;
        const entries = Array.isArray(snapshot.entries) ? snapshot.entries : [];
        if (!entries.length) return false;

        resetTutorialRuntime({ preserveCompletion: true });
        state.game.entries.clear();
        state.game.queue = [];
        state.game.currentId = null;
        state.game.footerNavPrimed = false;
        state.game.footerNavPrimeKey = '';
        state.game.listening = false;
        state.game.paused = false;
        state.game.canListen = false;
        state.game.transitioning = false;
        state.game.active = true;
        state.game.sessionStartedAt = Date.now();
        state.game.selectedCount = snapshot.selectedCount || currentBaseGameCount();
        state.game.contextLimit = snapshot.contextLimit || currentGameActiveCardCap(currentUserLevel(), state.game.selectedCount);

        entries.forEach((entry) => {
          const card = cardById(entry.id);
          if (!card || !isCardAllowedForUserLevel(card)) return;
          state.game.entries.set(entry.id, { ...entry });
        });
        state.game.queue = (Array.isArray(snapshot.queue) ? snapshot.queue : [])
          .filter((id) => state.game.entries.has(id));
        state.game.currentId = state.game.entries.has(snapshot.currentId) ? snapshot.currentId : null;

        if (!state.game.currentId) {
          state.game.currentId = state.game.queue.shift() || Array.from(state.game.entries.keys())[0] || null;
        }

        const activeLimit = Math.max(MIN_GAME_CONTEXT_LIMIT, Number(state.game.contextLimit) || currentGameActiveCardCap());
        if (addFreshCard && state.game.entries.size < activeLimit) {
          refillGameEntry('base', Math.min(activeLimit, state.game.entries.size + 1));
        }

        persistGameSessionLocally();
        return state.game.entries.size > 0 && Boolean(state.game.currentId);
      }

      function buildOrderedDeckSelection(cards, limit) {
        const normalizedLimit = Math.max(0, Number(limit) || 0);
        if (!normalizedLimit || !cards.length) return [];
        return shuffle(cards.slice()).slice(0, normalizedLimit);
      }

      function buildLevelAwareRoundGroups(baseCards, reviewCards, limit) {
        const normalizedLimit = Math.max(0, Number(limit) || 0);
        const reviews = uniqueCardsById(
          (Array.isArray(reviewCards) ? reviewCards : []).filter(isCardAllowedForUserLevel)
        ).slice(0, Math.min(REVIEW_SLOT_LIMIT, normalizedLimit));
        const reviewIds = new Set(reviews.map(card => card.id));
        const base = uniqueCardsById(
          (Array.isArray(baseCards) ? baseCards : [])
            .filter(card => isCardAllowedForUserLevel(card) && !reviewIds.has(card.id))
        );
        if (!normalizedLimit || isAdminUser()) {
          return {
            baseCards: buildOrderedDeckSelection(base, Math.max(0, normalizedLimit - reviews.length)),
            reviewCards: reviews
          };
        }

        const level = currentUserLevel();
        const currentTarget = level <= 1
          ? normalizedLimit
          : Math.max(1, Math.round(normalizedLimit * CURRENT_LEVEL_ROUND_RATIO));
        const previousTarget = Math.max(0, normalizedLimit - currentTarget);
        const currentReviews = reviews.filter(card => cardDeckLevel(card) === level).slice(0, currentTarget);
        const previousReviews = level <= 1
          ? []
          : reviews.filter(card => cardDeckLevel(card) < level).slice(0, previousTarget);
        let selectedReviews = uniqueCardsById([...currentReviews, ...previousReviews]);
        const selectedIds = new Set(selectedReviews.map(card => card.id));
        const baseCurrent = base.filter(card => cardDeckLevel(card) === level && !selectedIds.has(card.id));
        const basePrevious = level <= 1
          ? []
          : base.filter(card => cardDeckLevel(card) < level && !selectedIds.has(card.id));
        const selectedBase = uniqueCardsById([
          ...buildOrderedDeckSelection(
            baseCurrent,
            Math.max(0, currentTarget - currentReviews.length)
          ),
          ...buildOrderedDeckSelection(
            basePrevious,
            Math.max(0, previousTarget - previousReviews.length)
          )
        ]);
        selectedBase.forEach(card => selectedIds.add(card.id));

        let selectedTotal = selectedBase.length + selectedReviews.length;
        if (selectedTotal < normalizedLimit) {
          const fillers = buildOrderedDeckSelection(
            [...baseCurrent, ...basePrevious].filter(card => !selectedIds.has(card.id)),
            normalizedLimit - selectedTotal
          );
          selectedBase.push(...fillers);
          fillers.forEach(card => selectedIds.add(card.id));
        }

        selectedTotal = selectedBase.length + selectedReviews.length;
        if (selectedTotal < normalizedLimit) {
          selectedReviews = uniqueCardsById([
            ...selectedReviews,
            ...reviews.filter(card => !selectedIds.has(card.id)).slice(0, normalizedLimit - selectedTotal)
          ]);
        }

        return {
          baseCards: shuffle(selectedBase).slice(0, normalizedLimit),
          reviewCards: selectedReviews
        };
      }

      function buildGameVisual(card, stageConfig) {
        const shouldShowImage = stageConfig.showImage !== false;
        const placeholderLabel = stageConfig.placeholderUsesPortuguese
          ? buildStageThreePlaceholderMarkup(card)
          : escapeHtml('?');
        preloadCardImage(card);
        preloadCardAudio(card);
        if (stageConfig.overlayFlag) {
          preloadCardImage({ imageUrl: stageConfig.overlayFlag });
        }
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
          ? `<img class="mini-card__seal game-card__seal${rewardSeal ? ' game-card__reward-seal' : ''}${hasTutorialFinale ? ' is-tutorial-finale' : ''}${hasTutorialFinale && tutorialFinale.sealFlash ? ' is-tutorial-seal-flash' : ''}${hasTutorialFinale && tutorialFinale.sealSoft ? ' is-tutorial-seal-soft' : ''}" src="${escapeHtml(phaseMeta(displayedSeal).sealPath)}" alt="${escapeHtml(phaseMeta(displayedSeal).label)}">`
          : '';
        const visualClasses = ['game-card__visual'];
        if (stageConfig.blurImage) visualClasses.push('is-stage-two');
        if (stageConfig.revealOnHit) visualClasses.push('is-stage-three');
        els.gameVisual.className = visualClasses.join(' ');
        els.gameVisual.style.removeProperty('--stage-two-overlay-opacity');
        setGameVisualNeonState('default');
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
        els.gameVisual.style.setProperty('--stage-two-overlay-opacity', '0');
        els.gameVisual.classList.add('is-overlay-dissolving');
      }

      function updateStageTwoOverlayProgress(entry, typingState, typedLetters = '') {
        if (!els.gameVisual) return;
        if (!entry || entry.stage !== 2) {
          els.gameVisual.style.removeProperty('--stage-two-overlay-opacity');
          return;
        }
        const totalLetters = Math.max(1, countTypingDisplayLetters(typingState?.sourceText || typingState?.acceptedAnswer || ''));
        const typedCount = Math.max(0, String(typedLetters || '').length);
        const progress = Math.max(0, Math.min(1, typedCount / totalLetters));
        const nextOpacity = 0.88 * (1 - progress);
        els.gameVisual.style.setProperty('--stage-two-overlay-opacity', String(nextOpacity));
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

      function normalizeTypingSource(rawText) {
        return safeText(rawText)
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toUpperCase()
          .replace(/[^A-Z\s]/g, '')
          .replace(/\s+/g, ' ')
          .trim();
      }

      function isTypingStage(entry) {
        const stageConfig = STAGES[entry?.stage] || STAGES[1];
        return stageConfig.inputMode === 'typing';
      }

      function resolveTypingStageState(entry, card) {
        const stageConfig = STAGES[entry?.stage] || STAGES[1];
        const typingMode = stageConfig.typingMode === 'portuguese' ? 'portuguese' : 'english';
        const sourceText = typingMode === 'portuguese'
          ? (card?.portuguese || card?.english || card?.deckTitle || '')
          : (card?.english || card?.portuguese || card?.deckTitle || '');
        const normalizedTarget = normalizeTypingSource(sourceText);
        return {
          typingMode,
          sourceText,
          normalizedTarget,
          acceptedAnswer: typingMode === 'portuguese'
            ? (card?.portuguese || '')
            : (card?.english || '')
        };
      }

      function countTypingDisplayCharacters(value) {
        return safeText(value).trim().length;
      }

      function countTypingDisplayLetters(value) {
        return normalizeTypingSource(value).replace(/\s+/g, '').length;
      }

      function getTypingDisplayWords(text) {
        return safeText(text).trim().split(/\s+/).filter(Boolean);
      }

      function hasOversizeTypingWord(text) {
        return getTypingDisplayWords(text).some((word) => countTypingDisplayLetters(word) >= 15);
      }

      function isCardEligibleForGame(card) {
        const englishSource = safeText(card?.english || card?.portuguese || card?.deckTitle || '').trim();
        if (!englishSource) return false;
        return !hasOversizeTypingWord(englishSource);
      }

      function scoreTypingDisplayLines(lines) {
        const lengths = lines.map((line) => countTypingDisplayCharacters(line));
        const maxLength = lengths.length ? Math.max(...lengths) : 0;
        const minLength = lengths.length ? Math.min(...lengths) : 0;
        const imbalance = maxLength - minLength;
        const overflowPenalty = lengths.reduce((total, length) => total + Math.max(0, length - 14), 0);
        return (overflowPenalty * 1000) + (maxLength * 20) + imbalance;
      }

      function chooseTypingDisplaySplit(words, lineCount) {
        const best = { score: Number.POSITIVE_INFINITY, lines: [words.join(' ')] };
        if (!Array.isArray(words) || !words.length || lineCount <= 1) {
          return best.lines;
        }

        if (
          lineCount === 2
          && words.length === 2
          && countTypingDisplayLetters(words[0]) > 3
          && countTypingDisplayLetters(words[1]) > 3
        ) {
          return [words[0], words[1]];
        }

        const buildPartitions = (startIndex, remainingLines, chosen) => {
          if (remainingLines === 1) {
            const lines = [...chosen, words.slice(startIndex).join(' ')];
            const score = scoreTypingDisplayLines(lines);
            if (score < best.score) {
              best.score = score;
              best.lines = lines;
            }
            return;
          }

          const maxStart = words.length - remainingLines;
          for (let endIndex = startIndex + 1; endIndex <= maxStart; endIndex += 1) {
            buildPartitions(
              endIndex,
              remainingLines - 1,
              [...chosen, words.slice(startIndex, endIndex).join(' ')]
            );
          }
        };

        buildPartitions(0, Math.min(lineCount, words.length), []);
        return best.lines;
      }

      function splitTypingDisplayText(text) {
        const source = safeText(text).trim();
        if (!source) return [''];
        if (hasOversizeTypingWord(source)) return [];
        const words = getTypingDisplayWords(source);
        if (words.length <= 1) return [source];

        const hasTwoLongWords = words.length === 2
          && countTypingDisplayLetters(words[0]) > 3
          && countTypingDisplayLetters(words[1]) > 3;
        if (hasTwoLongWords) {
          return [words[0], words[1]];
        }

        const totalLength = countTypingDisplayCharacters(source);
        if (totalLength <= 14) return [source];
        const desiredLineCount = totalLength >= 25 ? 3 : (hasTwoLongWords ? 2 : 2);
        return chooseTypingDisplaySplit(words, desiredLineCount);
      }

      function typingDisplayScaleClass(text) {
        const length = countTypingDisplayLetters(text);
        if (length >= 3 && length <= 5) return 'flashcards-typing__display--size-xl';
        if (length >= 6 && length <= 8) return 'flashcards-typing__display--size-lg';
        if (length >= 9 && length <= 11) return 'flashcards-typing__display--size-md';
        return '';
      }

      function isPlaytalkStarTypingStage(entry) {
        return Boolean(entry && (entry.stage === 2 || entry.stage === 4));
      }

      function formatTypingDisplayText(rawText) {
        const source = safeText(rawText).trim();
        if (!source) return '';
        return source.charAt(0).toLocaleUpperCase('pt-BR') + source.slice(1).toLocaleLowerCase('pt-BR');
      }

      function buildTypingDisplayMarkup(typingState, typedLetters, options = {}) {
        const displayText = formatTypingDisplayText(typingState?.sourceText || typingState?.acceptedAnswer || '');
        const typed = String(typedLetters || '').toUpperCase();
        const promptText = safeText(options.promptText);
        if (promptText && !typed) {
          return `<span class="flashcards-typing__display-prompt">${escapeHtml(promptText)}</span>`;
        }
        if (!displayText) return '&nbsp;';

        const revealAll = Boolean(options.revealAll);
        const hintStart = Math.max(0, Number(options.hintStart) || 0);
        const hintLength = Math.max(0, Number(options.hintLength) || 0);
        const alwaysVisible = Boolean(options.alwaysVisible);
        const hideUnfilled = Boolean(options.hideUnfilled);
        let normalizedLetterIndex = 0;

        return splitTypingDisplayText(displayText).map((line) => {
          const lineMarkup = line.split('').map((char) => {
            const normalizedChar = normalizeTypingSource(char);
            if (!normalizedChar) {
              const shouldRevealSpecial = revealAll || alwaysVisible || typed.length >= normalizedLetterIndex;
              const specialChar = shouldRevealSpecial ? (char === ' ' ? '&nbsp;' : escapeHtml(char)) : '&nbsp;';
              return `<span class="flashcards-typing__display-letter${shouldRevealSpecial ? ' is-filled' : ' is-hidden-unfilled'}" data-char="${shouldRevealSpecial ? escapeHtml(char === ' ' ? '\u00A0' : char) : ''}">${specialChar}</span>`;
            }

            const isHint = normalizedLetterIndex >= hintStart && normalizedLetterIndex < (hintStart + hintLength);
            const typedChar = typed[normalizedLetterIndex] || '';
            const visibleChar = revealAll || alwaysVisible
              ? char
              : (typedChar
                ? (char === char.toLocaleUpperCase('pt-BR') ? typedChar : typedChar.toLocaleLowerCase('pt-BR'))
                : '\u00A0');

            const classNames = ['flashcards-typing__display-letter'];
            if (alwaysVisible) classNames.push('is-dimmed');
            if (!typedChar && hideUnfilled && !revealAll && !alwaysVisible) classNames.push('is-hidden-unfilled');
            if (typedChar) classNames.push('is-filled');
            if (isHint) classNames.push('is-hint');

            normalizedLetterIndex += 1;
            return `<span class="${classNames.join(' ')}" data-char="${escapeHtml(visibleChar)}">${escapeHtml(visibleChar)}</span>`;
          }).join('');
          return `<span class="flashcards-typing__display-line">${lineMarkup}</span>`;
        }).join('');
      }

      function renderTypingDisplay(display, typingState, typedLetters, options = {}) {
        if (!display) return;
        const displayText = formatTypingDisplayText(typingState?.sourceText || typingState?.acceptedAnswer || '');
        const splitLines = splitTypingDisplayText(displayText);
        display.classList.remove(
          'flashcards-typing__display--size-xl',
          'flashcards-typing__display--size-lg',
          'flashcards-typing__display--size-md',
          'flashcards-typing__display--two-lines',
          'flashcards-typing__display--three-lines'
        );
        const scaleClassName = typingDisplayScaleClass(displayText);
        if (scaleClassName) {
          display.classList.add(scaleClassName);
        }
        if (splitLines.length === 2) {
          display.classList.add('flashcards-typing__display--two-lines');
        } else if (splitLines.length >= 3) {
          display.classList.add('flashcards-typing__display--three-lines');
        }
        display.innerHTML = buildTypingDisplayMarkup(typingState, typedLetters, options);
      }

      function revealTypingAnswer(entry, card, options = {}) {
        const display = els.gameVisual.querySelector('.flashcards-typing__display--visual');
        if (!display) return;
        display.classList.remove('is-answer-image');
        const typingState = resolveTypingStageState(entry, card);
        renderTypingDisplay(display, typingState, '', {
          revealAll: true,
          hintStart: options.hintStart,
          hintLength: options.hintLength
        });
      }

      function revealTypingAnswerImage(card) {
        const display = els.gameVisual.querySelector('.flashcards-typing__display--visual');
        const imageUrl = safeText(card?.imageUrl);
        if (!display || !imageUrl) return false;
        display.classList.add('is-answer-image');
        display.innerHTML = `<img class="flashcards-typing__answer-image" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(capitalizeWords(card?.english || card?.portuguese || 'Resposta correta'))}">`;
        return true;
      }

      function clearTypingAnswer() {
        const display = els.gameVisual.querySelector('.flashcards-typing__display--visual');
        if (!display) return;
        display.classList.remove('is-answer-image');
        display.innerHTML = '&nbsp;';
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

      function triggerTypingMistakeFeedback(grid, durationMs = 1000) {
        if (!grid) return;
        grid.classList.remove('is-error');
        void grid.offsetWidth;
        grid.classList.add('is-error');
        window.setTimeout(() => {
          grid.classList.remove('is-error');
        }, Math.max(100, Number(durationMs) || 1000));
      }

      async function handleTypingMistake(entry, card, grid, typedLength = 0) {
        entry.typingMistakes = (entry.typingMistakes || 0) + 1;
        setTypingKeysDisabled(grid, true);
        triggerTypingMistakeFeedback(grid);
        playCueAudio(ACCESSKEY_ERROR_SOUND_PATH);
        if (isTrainingMode()) {
          await wait(180);
          await handleRecognitionResult('', 'typing');
          return true;
        }
        revealTypingAnswer(entry, card, { hintStart: typedLength, hintLength: 2 });
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

      async function playTypingSkipPromptSequence(entry, card, runId) {
        for (let index = 0; index < TYPING_SKIP_PROMPT_REPEATS; index += 1) {
          if (!isTypingSkipAutomationActive(entry, runId)) return;
          await playPromptAudio(card, { rate: TYPING_SKIP_PROMPT_RATE, enableMicDuringPlayback: false }).catch(() => false);
        }
      }

      function showStageTwoPortugueseHint(card) {
        const portuguese = capitalizeWords(card?.portuguese || card?.english || card?.deckTitle || '');
        if (!portuguese) return;
        els.gameWord.classList.add('is-hidden');
        els.gameSubword.className = 'game-subword is-chip';
        els.gameSubword.style.display = '';
        renderChipText(els.gameSubword, portuguese);
      }

      function startTypingPromptLoop(entry, card) {
        clearTypingPromptLoop();
        if (!isTypingStage(entry) || !card) return;
        const replayPrompt = () => {
          if (!state.game.active || state.game.paused || state.game.currentId !== entry.id || !isTypingStage(entry)) {
            clearTypingPromptLoop();
            return;
          }
          Promise.resolve(playPromptAudio(card, { rate: 0.8 }))
            .catch(() => {})
            .finally(() => {
              if (!state.game.active || state.game.paused || state.game.currentId !== entry.id || !isTypingStage(entry)) {
                clearTypingPromptLoop();
                return;
              }
              state.game.typingPromptLoopTimer = window.setTimeout(replayPrompt, TYPING_PROMPT_REPEAT_DELAY_MS);
            });
        };
        state.game.typingPromptLoopTimer = window.setTimeout(replayPrompt, 220);
      }

      function renderTypingKeyboard(entry, card) {
        const phaseKey = safeText(els.game?.dataset?.phaseKey || '');
        const isTypingLayoutPhase = phaseKey === 'second-star' || phaseKey === 'fourth-star';
        const keyboardTarget = isTypingLayoutPhase && els.gameKeyboardHost
          ? els.gameKeyboardHost
          : (els.gameControlsProxy || els.gameTypingKeyboard.parentElement);
        if (!isTypingStage(entry) || !card) {
          clearTypingSkipAutomation();
          clearTypingPromptLoop();
          clearSecondStarIdleHintTimers();
          syncGameAdvanceButton(null);
          els.gameVisual.querySelector('.flashcards-typing__display--visual')?.remove();
          els.gameTypingKeyboard.innerHTML = '';
          els.gameTypingKeyboard.classList.remove('is-visible');
          els.gameTypingKeyboard.classList.remove('is-portuguese');
          els.gameTypingKeyboard.setAttribute('aria-hidden', 'true');
          if (keyboardTarget && els.gameTypingKeyboard.parentElement !== keyboardTarget) {
            keyboardTarget.appendChild(els.gameTypingKeyboard);
          }
          return;
        }

        const typingState = resolveTypingStageState(entry, card);
        const target = typingState.normalizedTarget.replace(/\s/g, '');
        syncGameAdvanceButton(entry);
        if (!target) {
          clearTypingSkipAutomation();
          clearTypingPromptLoop();
          clearSecondStarIdleHintTimers();
          syncGameAdvanceButton(null);
          els.gameVisual.querySelector('.flashcards-typing__display--visual')?.remove();
          els.gameTypingKeyboard.innerHTML = '';
          els.gameTypingKeyboard.classList.remove('is-visible');
          els.gameTypingKeyboard.classList.remove('is-portuguese');
          els.gameTypingKeyboard.setAttribute('aria-hidden', 'true');
          if (keyboardTarget && els.gameTypingKeyboard.parentElement !== keyboardTarget) {
            keyboardTarget.appendChild(els.gameTypingKeyboard);
          }
          return;
        }

        clearTypingSkipAutomation();
        let typed = '';
        const display = document.createElement('div');
        display.className = 'flashcards-typing__display flashcards-typing__display--visual';
        display.classList.toggle('is-star-phase-copy', isPlaytalkStarTypingStage(entry));
        const renderTyped = () => {
          updateStageTwoOverlayProgress(entry, typingState, typed);
          renderTypingDisplay(display, typingState, typed, {});
        };
        renderTyped();

        const toolbar = document.createElement('div');
        toolbar.className = 'flashcards-typing__toolbar';
        const skipBtn = document.createElement('button');
        skipBtn.type = 'button';
        skipBtn.className = 'flashcards-typing__skip';
        skipBtn.textContent = 'AVAN�AR';
        skipBtn.setAttribute('aria-label', 'Avancar digitacao automatica');
        skipBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M5 6.5v11l8.25-5.5L5 6.5Zm8.5 0v11L21.75 12 13.5 6.5Z"/></svg>';
        toolbar.appendChild(skipBtn);
        skipBtn.hidden = true;

        const advanceBtn = els.gameAdvanceBtn;
        if (advanceBtn && !isTrainingMode()) {
          advanceBtn.hidden = false;
          advanceBtn.disabled = false;
        }

        const grid = document.createElement('div');
        grid.className = 'flashcards-typing__grid';
        const typingPalette = shuffleList(TYPING_KEY_BLUES);
        const keyNodes = [];
        buildTypingLetterPool(target, 16).forEach((letter, index) => {
          const key = document.createElement('button');
          key.type = 'button';
          key.className = 'flashcards-typing__key';
          key.textContent = letter;
          key.setAttribute('aria-label', `Letra ${letter}`);
          key.style.setProperty('--typing-key-bg', typingPalette[index % typingPalette.length]);
          key.addEventListener('click', async () => {
            if (!state.game.active || state.game.paused || state.game.listening || state.game.typingSkipActive || state.game.currentId !== entry.id) return;
            playTypingKeyAudio();
            const expectedLetter = target[typed.length];
            if (letter !== expectedLetter) {
              const typedLengthBeforeReset = typed.length;
              const finished = await handleTypingMistake(entry, card, grid, typedLengthBeforeReset);
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
              await handleRecognitionResult(typingState.acceptedAnswer || typingState.sourceText || '', 'typing');
              return;
            }
          });
          keyNodes.push(key);
          grid.appendChild(key);
        });

        skipBtn.addEventListener('click', async () => {
          if (!state.game.active || state.game.paused || state.game.listening || state.game.currentId !== entry.id || state.game.typingSkipActive) return;
          const runId = startTypingSkipAutomation(entry);
          clearTypingPromptLoop();
          clearSecondStarIdleHintTimers();
          skipBtn.disabled = true;
          if (advanceBtn && !isTrainingMode()) advanceBtn.disabled = true;
          setTypingKeysDisabled(grid, true);
          const promptSequence = playTypingSkipPromptSequence(entry, card, runId);
          try {
            while (typed.length < target.length) {
              if (!isTypingSkipAutomationActive(entry, runId)) return;
              const nextLetter = target[typed.length];
              const nextKey = keyNodes.find((node) => safeText(node.textContent).toUpperCase() === nextLetter);
              if (nextKey) {
                triggerTypingKeyFlash(nextKey);
              }
              playTypingKeyAudio();
              typed += nextLetter;
              renderTyped();
              if (typed.length < target.length) {
                await wait(TYPING_SKIP_LETTER_DELAY_MS);
              }
            }
            await promptSequence;
            if (!isTypingSkipAutomationActive(entry, runId)) return;
            await handleRecognitionResult(typingState.acceptedAnswer || typingState.sourceText || '', 'typing');
          } finally {
            finishTypingSkipAutomation(runId);
            skipBtn.disabled = false;
            if (advanceBtn && !isTrainingMode()) advanceBtn.disabled = false;
            setTypingKeysDisabled(grid, false);
          }
        });
        if (advanceBtn && !isTrainingMode()) {
          advanceBtn.onclick = () => {
            if (advanceBtn.disabled) return;
            skipBtn.click();
          };
        } else if (advanceBtn) {
          advanceBtn.onclick = null;
          advanceBtn.hidden = true;
          advanceBtn.classList.remove('is-visible');
        }

        els.gameVisual.querySelector('.flashcards-typing__display--visual')?.remove();
        els.gameVisual.appendChild(display);
        if (keyboardTarget && els.gameTypingKeyboard.parentElement !== keyboardTarget) {
          keyboardTarget.appendChild(els.gameTypingKeyboard);
        }
        els.gameTypingKeyboard.innerHTML = '';
        els.gameTypingKeyboard.appendChild(toolbar);
        els.gameTypingKeyboard.appendChild(grid);
        els.gameTypingKeyboard.classList.add('is-visible');
        els.gameTypingKeyboard.classList.toggle('is-portuguese', typingState.typingMode === 'portuguese');
        els.gameTypingKeyboard.setAttribute('aria-hidden', 'false');
        clearTypingPromptLoop();
        clearSecondStarIdleHintTimers();
      }

      function syncGamePhaseWordHost(phaseKey) {
        if (!els.gamePhaseWord || !els.gameStatusSlot) return;
        const useVisualSlot = (phaseKey === 'first-star' || phaseKey === 'third-star') && !!els.gameTranslationSlot;
        const target = useVisualSlot ? els.gameTranslationSlot : els.gameStatusSlot;
        if (!target || els.gamePhaseWord.parentElement === target) return;
        if (target === els.gameStatusSlot) {
          els.gameStatusSlot.prepend(els.gamePhaseWord);
          return;
        }
        target.appendChild(els.gamePhaseWord);
      }

      function renderCurrentCard(options = {}) {
        cleanupGameRecognition();
        const entry = state.game.currentId ? state.game.entries.get(state.game.currentId) : null;
        if (!entry) {
          clearStageTutorialReminder();
          hideGameStageTutorial({ resume: false });
          els.game.removeAttribute('data-phase-key');
          clearGameStatusRankTimer();
          clearGameLanguageSwapTimer();
          clearTypingPromptLoop();
          clearStageTwoHintTimer();
          clearFirstStageIdleTimer();
          clearStageHintLoop({ clearStatus: true });
          state.game.footerNavPrimed = false;
          state.game.footerNavPrimeKey = '';
          syncFooterGuardState(null);
          els.gameWord.parentElement?.classList.remove('is-stage-one-swap');
          els.gameWord.classList.remove('is-stage-swap-hidden');
          els.gameSubword.classList.remove('is-stage-swap-hidden');
          if (els.gamePhaseWord) {
            els.gamePhaseWord.textContent = '';
            els.gamePhaseWord.classList.remove('is-visible');
          }
          syncGamePhaseWordHost('');
          els.gameCard.classList.remove('is-typing-stage');
          els.gameTypingKeyboard.classList.remove('is-portuguese', 'is-visible');
          els.gameTypingKeyboard.setAttribute('aria-hidden', 'true');
          els.gameTypingKeyboard.innerHTML = '';
          els.gameVisual.querySelector('.flashcards-typing__display--visual')?.remove();
          updateGameChips();
          if (!state.game.entries.size) {
            clearGameSessionLocally();
            els.gameCard.style.display = 'none';
            els.gameEnd.classList.add('is-visible');
          }
          updateGuestFirstStarResultsBanner(null, false);
          state.game.currentCardTrainingId = '';
          state.game.currentCardTrainingStartedAt = 0;
          return;
        }

        persistGameSessionLocally();
        startCurrentCardTrainingTime();

        const footerPrimeKey = `${entry.id}:${entry.stage}`;
        if (state.game.footerNavPrimeKey !== footerPrimeKey) {
          state.game.footerNavPrimeKey = footerPrimeKey;
          state.game.footerNavPrimed = false;
        }
        syncFooterGuardState(entry);

        const card = cardById(entry.id);
        if (!isCardEligibleForGame(card)) {
          removeGameEntry(entry.id);
          if (isTrainingMode()) {
            advanceToNextCard();
            return;
          }
          refillGameEntry(entry.pool || 'base', state.game.contextLimit || DEFAULT_GAME_CONTEXT_LIMIT);
          state.game.currentId = state.game.queue.shift() || Array.from(state.game.entries.keys())[0] || null;
          renderCurrentCard(options);
          return;
        }
        const stageConfig = resolveGameStageConfig(entry);
        if (maybeShowStageTutorialBeforeCard(entry, options)) {
          return;
        }
        const isSimpleStarPhase = stageConfig.key === 'first-star'
          || stageConfig.key === 'third-star'
          || stageConfig.key === 'fifth-star';
        const typingStage = isTypingStage(entry);
        clearGameMicUnlockTimer();
        clearFirstStageMicHint({ clearStatus: true });
        if (typingStage) {
          entry.typingMistakes = 0;
        }
        els.game.dataset.phaseKey = stageConfig.key || '';
        syncGamePhaseWordHost(stageConfig.key || '');
        els.gameCard.style.display = '';
        els.gameCard.classList.toggle('is-typing-stage', typingStage);
        els.gameEnd.classList.remove('is-visible');
        if (!state.game.pendingRewardSeal || state.game.pendingRewardSeal.cardId !== entry.id) {
          setGameStatus('', '');
        }
        buildGameVisual(card, stageConfig);
        primeCurrentAndUpcomingGameMedia(card);
        if (stageConfig.key === 'first-star' || stageConfig.key === 'second-star' || stageConfig.key === 'fourth-star') {
          addReadingCharsForCard(entry, card, stageConfig.key);
        }
        if (maybeRunTutorialSequence(entry, card)) {
          return;
        }

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
        const stageOneSwapActive = !isSimpleStarPhase && entry.stage === 1 && Boolean(subword);
        if (els.gamePhaseWord) {
          if (isSimpleStarPhase) {
            if (stageConfig.key === 'first-star') {
              renderFirstStarPhaseWordSwap(entry, card);
              els.gamePhaseWord.classList.add('is-visible');
            } else if (stageConfig.key === 'third-star') {
              clearGameLanguageSwapTimer();
              renderChipText(els.gamePhaseWord, capitalizeWords(card.portuguese || card.english || card.deckTitle || ''));
              els.gamePhaseWord.classList.remove('is-english', 'is-fading');
              els.gamePhaseWord.classList.add('is-portuguese', 'is-visible');
            } else if (stageConfig.key === 'fifth-star') {
              clearGameLanguageSwapTimer();
              els.gamePhaseWord.textContent = '';
              els.gamePhaseWord.classList.remove('is-visible', 'is-english', 'is-portuguese', 'is-fading');
            } else {
              clearGameLanguageSwapTimer();
              renderChipText(els.gamePhaseWord, capitalizeWords(card.english || card.portuguese || card.deckTitle || ''));
              els.gamePhaseWord.classList.remove('is-english', 'is-portuguese', 'is-fading');
              els.gamePhaseWord.classList.add('is-visible');
            }
          } else {
            clearGameLanguageSwapTimer();
            els.gamePhaseWord.textContent = '';
            els.gamePhaseWord.classList.remove('is-visible', 'is-english', 'is-portuguese', 'is-fading');
          }
        }
        els.gameStep.textContent = stageConfig.badge;
        els.gameWord.className = `game-word${stageConfig.showWord === false ? ' is-hidden' : ' is-chip'}`;
        els.gameSubword.className = `game-subword${subword ? ' is-chip' : ' is-hidden'}`;
        els.gameWord.classList.remove('is-stage-swap-hidden');
        els.gameSubword.classList.remove('is-stage-swap-hidden');
        els.gameWord.parentElement?.classList.toggle('is-stage-one-swap', stageOneSwapActive);
        if (stageOneSwapActive) {
          els.gameWord.className = 'game-word is-chip';
          els.gameSubword.className = 'game-subword is-chip';
          els.gameWord.style.display = '';
          els.gameSubword.style.display = '';
        } else {
          els.gameWord.style.display = '';
          els.gameSubword.style.display = subword ? '' : 'none';
        }
        renderChipText(els.gameWord, stageConfig.showWord === false ? '' : word);
        renderChipText(els.gameSubword, subword);
        els.gameCard.querySelector('.game-card__content')?.classList.toggle('is-stage-three', entry.stage === 3);
        if (subword && !stageOneSwapActive) {
          els.gameSubword.classList.remove('is-hidden');
        }
        els.gameSubword.classList.toggle('is-stage-one', entry.stage === 1 && stageConfig.subtitleType === 'portuguese');
        if (!isSimpleStarPhase) {
          renderStageOneWordSwap(entry, Boolean(subword));
        }
        state.game.canListen = !typingStage && (!stageConfig.autoAudio || entry.stage === 1);
        renderGameTouchButton(stageConfig, entry);
        els.gameTouchBtn.parentElement.classList.toggle('is-hidden', typingStage || els.gameTouchBtn.classList.contains('is-hidden'));
        els.gameTouchBtn.classList.toggle('is-busy', state.game.listening);
        renderTypingKeyboard(entry, card);
        if (isSimpleStarPhase) {
          els.gameWord.parentElement?.classList.remove('is-stage-one-swap');
          els.gameWord.classList.remove('is-stage-swap-hidden');
          els.gameSubword.classList.remove('is-stage-swap-hidden');
          els.gameWord.classList.add('is-hidden');
          els.gameSubword.classList.add('is-hidden');
          els.gameWord.style.display = 'none';
          els.gameSubword.style.display = 'none';
        }
        if (typingStage) {
          els.gameWord.parentElement?.classList.remove('is-stage-one-swap');
          els.gameWord.classList.remove('is-stage-swap-hidden');
          els.gameSubword.classList.remove('is-stage-swap-hidden');
          els.gameWord.classList.add('is-hidden');
          els.gameSubword.classList.add('is-hidden');
          els.gameWord.style.display = 'none';
          els.gameSubword.style.display = 'none';
        }
        if (!isSimpleStarPhase && !typingStage && !stageOneSwapActive) {
          els.gameWord.classList.toggle('is-hidden', stageConfig.showWord === false);
          els.gameSubword.classList.toggle('is-hidden', !subword);
          els.gameSubword.style.display = subword ? '' : 'none';
        }
        if (shouldShowStageHintLoop(entry)) {
          startStageHintLoop(entry);
        } else {
          clearStageHintLoop();
        }
        if (isTrainingMode()) {
          state.game.training.cycleIndex = Math.max(1, (Number(state.game.training.sourceIds?.length) || 0) - state.game.queue.length);
          renderTrainingSequence();
        } else {
          renderStars(entry.stars);
          els.gameStarCopy.textContent = '';
        }
        updateGuestFirstStarResultsBanner(entry, false);
        updateGameChips();
        scheduleStageTutorialReminder(entry);
        scheduleStageTwoHintLoop(entry);
        scheduleFirstStageIdleTimer(entry);
        scheduleFirstStageMicHint(entry);

        if (typingStage) {
          window.setTimeout(() => {
            if (state.game.currentId === entry.id && !state.game.listening && !state.game.paused) {
              playPromptAudio(card, { rate: 0.8, enableMicDuringPlayback: false });
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
              const playback = playPromptAudio(card, {
                unlockDelayMs: GAME_MIC_UNLOCK_DELAY_MS
              });
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
        const earlyRestricted = shouldRestrictEarlyFlashcards();
        let preferredSource = pool === 'review'
          ? readyReviewCards().filter(card => !activeIds.has(card.id))
          : baseRoundSourceCards().filter(card => !activeIds.has(card.id));
        let fallbackSource = pool === 'review'
          ? baseRoundSourceCards().filter(card => !activeIds.has(card.id))
          : readyReviewCards().filter(card => !activeIds.has(card.id));
        if (earlyRestricted) {
          if (pool === 'base') {
            preferredSource = preferredSource.filter(isEarlyFlashcardLengthEligible);
            fallbackSource = fallbackSource.filter(isEarlyFlashcardLengthEligible);
          } else {
            fallbackSource = fallbackSource.filter(isEarlyFlashcardLengthEligible);
          }
        }
        preferredSource = preferredSource.filter(isCardEligibleForGame);
        fallbackSource = fallbackSource.filter(isCardEligibleForGame);
        const sourceCards = preferredSource.length ? preferredSource : fallbackSource;
        let nextCard = (pool === 'review' && preferredSource.length)
          ? sourceCards[0]
          : takeRandom(sourceCards, 1)[0];
        if (!nextCard) return null;
        return {
          card: nextCard,
          pool: preferredSource.length ? pool : (pool === 'review' ? 'base' : 'review')
        };
      }

      function refillGameEntry(pool = 'base', limit = state.game.contextLimit || DEFAULT_GAME_CONTEXT_LIMIT) {
        if (state.game.entries.size >= Math.max(MIN_GAME_CONTEXT_LIMIT, Number(limit) || 0)) {
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
        if (state.game.currentId === entry.id) {
          commitCurrentCardTrainingTime();
        }
        const currentRecord = state.userCards.get(entry.id) || null;
        const currentPhase = Math.max(0, Math.min(REVIEW_PHASE_MAX, Number(currentRecord?.phaseIndex) || 0));
        const nextPhase = Math.max(1, Math.min(REVIEW_PHASE_MAX, currentPhase + 1));
        moveCardToMemorizing(entry.id, nextPhase);
        maybeAdvanceUserLevel();
      }

      function removeGameEntry(cardId) {
        if (state.game.currentId === cardId) {
          commitCurrentCardTrainingTime();
        }
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
        return { gapMs: 3000, scope: 'all', music: 'on' };
      }

      function saveWatchSettings() {
        return undefined;
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
        els.watchDeckSummary.textContent = `${selectedSources.size} deck${selectedSources.size === 1 ? '' : 's'} ativo${selectedSources.size === 1 ? '' : 's'} • ${selectedCardCount} carta${selectedCardCount === 1 ? '' : 's'}`;
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
        if (accessibleFlashcardsCount() < 1) {
          return;
        }
        resetTrainingRuntime();
        state.game.selectedCount = currentBaseGameCount();
        beginGame();
      }

      function updateTrainingCountPicker() {
        const count = normalizeTrainingCount(state.game.training?.pendingCount);
        state.game.training.pendingCount = count;
        if (els.trainingCountValue) {
          els.trainingCountValue.textContent = String(count);
        }
        if (els.trainingStartBtn) {
          els.trainingStartBtn.setAttribute('aria-label', `Iniciar treino com ${count} flashcards`);
        }
        if (els.trainingCountDownBtn) {
          els.trainingCountDownBtn.disabled = count <= TRAINING_MIN_CARD_COUNT;
        }
        if (els.trainingCountUpBtn) {
          els.trainingCountUpBtn.disabled = count >= TRAINING_MAX_CARD_COUNT;
        }
      }

      function changeTrainingCount(delta) {
        const current = normalizeTrainingCount(state.game.training?.pendingCount);
        state.game.training.pendingCount = normalizeTrainingCount(current + delta);
        updateTrainingCountPicker();
      }

      function syncGameSetupMode() {
        const pendingStage = normalizeTrainingStage(state.game.training?.pendingStage);
        const isTrainingSetup = pendingStage > 0;
        if (els.trainingCountPicker) {
          els.trainingCountPicker.hidden = !isTrainingSetup;
          els.trainingCountPicker.classList.toggle('is-visible', isTrainingSetup);
        }
        if (els.gameSetupTitle) {
          els.gameSetupTitle.textContent = isTrainingSetup
            ? `Treino ${STAGES[pendingStage]?.badge || 'Flashcards'}`
            : 'Jogar agora';
        }
        if (els.gameSetupCopy) {
          const baseCount = currentBaseGameCount();
          const activeLimit = currentGameActiveCardCap(currentUserLevel(), baseCount);
          els.gameSetupCopy.textContent = isTrainingSetup
            ? 'Escolha quantas cartas entram no ciclo. Elas passam embaralhadas e so voltam depois que o ciclo terminar.'
            : `O jogo monta ${baseCount} flashcards base para o seu nivel atual. Cartas que voltam do memorizing continuam ocupando ate ${REVIEW_SLOT_LIMIT} slots extras, chegando a ${activeLimit} ativas.`;
        }
        const defaultRoundButton = els.gameSetupOptions?.querySelector('[data-game-count]');
        if (defaultRoundButton) {
          const baseCount = currentBaseGameCount();
          defaultRoundButton.dataset.gameCount = String(baseCount);
          defaultRoundButton.textContent = `Comecar com ${baseCount} cartas`;
        }
        Array.from(els.gameSetupOptions?.querySelectorAll('[data-game-count], #startTutorialBtn') || []).forEach((button) => {
          button.hidden = isTrainingSetup;
        });
        if (isTrainingSetup) {
          updateTrainingCountPicker();
        }
        syncGameSetupSummary();
      }

      function openTrainingSetup(stage) {
        if (shouldGatePremiumAccess()) {
          openPremiumGate();
          return;
        }
        const targetStage = normalizeTrainingStage(stage);
        if (!targetStage || totalGameAvailableCards() < 1) return;
        resetTrainingRuntime();
        state.game.training.pendingStage = targetStage;
        state.game.training.pendingCount = TRAINING_MIN_CARD_COUNT;
        syncGameSetupMode();
        els.gameSetup.classList.add('is-visible');
        window.requestAnimationFrame(() => els.gameSetup.classList.add('is-active'));
        document.body.classList.add('game-open');
      }

      function closeGameSetup() {
        els.gameSetup.classList.remove('is-active');
        els.gameSetup.classList.remove('is-visible');
        if (!state.game.active) {
          resetTrainingRuntime();
          syncGameSetupMode();
        }
        if (!state.game.active && !state.watch.active) {
          document.body.classList.remove('game-open');
        }
      }

      function resetGameSwipeTracking() {
        state.ui.gameSwipeStartX = 0;
        state.ui.gameSwipeStartY = 0;
      }

      function beginGameSwipeTracking(event) {
        if (!state.game.active) return;
        state.ui.gameSwipeStartX = Number(event.clientX) || 0;
        state.ui.gameSwipeStartY = Number(event.clientY) || 0;
      }

      function finishGameSwipeTracking(event) {
        if (!state.game.active) {
          resetGameSwipeTracking();
          return;
        }
        const isTouchGesture = event.pointerType === 'touch' || navigator.maxTouchPoints > 0;
        if (!isTouchGesture) {
          resetGameSwipeTracking();
          return;
        }
        const startX = Number(state.ui.gameSwipeStartX) || 0;
        const startY = Number(state.ui.gameSwipeStartY) || 0;
        const endX = Number(event.clientX) || 0;
        const endY = Number(event.clientY) || 0;
        resetGameSwipeTracking();
        if (!startY && !startX) return;
        const deltaX = endX - startX;
        const deltaY = endY - startY;
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);
        if (absY < 70 || absY <= absX || deltaY >= -40) return;
        state.ui.gameSwipeTriggeredAt = Date.now();
        event.preventDefault?.();
        event.stopPropagation?.();
        pauseGameToLibrary();
      }

      function pauseGameToLibrary() {
        if (!state.game.active) return;
        cleanupGameRecognition();
        commitCurrentCardTrainingTime();
        stopActiveAudio();
        clearGameLanguageSwapTimer();
        clearTypingPromptLoop();
        clearTypingSkipAutomation();
        clearStageTutorialReminder();
        hideGameStageTutorial({ resume: false });
        clearStageTwoHintTimer();
        clearFirstStageIdleTimer();
        clearFirstStageMicHint({ clearStatus: true });
        clearStageHintLoop({ clearStatus: true });
        clearPendingRewardSeal();
        closeGameReportMenu();
        state.game.paused = true;
        persistGameSessionLocally();
        document.body.classList.remove('game-open');
        document.body.classList.remove('gameplay-active');
        els.game.classList.remove('is-active', 'is-visible');
        els.catalog.classList.remove('is-hidden');
        els.topbar.classList.remove('is-hidden');
        refreshLibrary();
        switchMainView('play');
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
        try {
          await audio.play();
          addListeningCharsForCard(card);
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
              album: 'Fluent LevelUp Flashcards'
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
        commitCurrentCardTrainingTime();
        clearPendingRewardSeal();
        clearStageTutorialReminder();
        hideGameStageTutorial({ resume: false });
        clearStageTwoHintTimer();
        clearFirstStageIdleTimer();
        if (!state.game.queue.length) {
          if (isTrainingMode() && refillTrainingCycle()) {
            renderTrainingSequence();
          } else {
            state.game.currentId = null;
            renderCurrentCard();
            return;
          }
        }

        if (!state.game.queue.length) {
          state.game.currentId = null;
          renderCurrentCard();
          return;
        }

        state.game.transitioning = true;
        els.gameCard.classList.add('is-transitioning');
        els.gameCard.classList.remove('is-sliding-next');
        await wait(180);
        state.game.currentId = state.game.queue.shift();
        if (isTrainingMode()) {
          state.game.training.cycleIndex = Math.max(1, (Number(state.game.training.sourceIds?.length) || 0) - state.game.queue.length);
        }
        persistGameSessionLocally();
        renderCurrentCard();
        els.gameCard.classList.remove('is-transitioning');
        playStatusCueAudio(NEXT_CARD_WOOSH_AUDIO_PATH);
        els.gameCard.classList.add('is-sliding-next');
        if (!state.game.tutorial.active) {
          playReportAudio();
        }
        await wait(320);
        els.gameCard.classList.remove('is-sliding-next');
        state.game.transitioning = false;
      }

      function beginTrainingGame(stage, count) {
        const targetStage = normalizeTrainingStage(stage);
        if (!targetStage) return;
        const sourceIds = buildTrainingCycleSourceIds(count);
        if (!sourceIds.length) return;

        hideWelcomeGate();
        clearScheduledOnboardingGate();
        clearGameSessionLocally();
        cleanupGameRecognition();
        stopActiveAudio();
        clearGameLanguageSwapTimer();
        clearTypingPromptLoop();
        clearTypingSkipAutomation();
        clearStageTutorialReminder();
        hideGameStageTutorial({ resume: false });
        clearStageTwoHintTimer();
        clearFirstStageIdleTimer();
        clearFirstStageMicHint({ clearStatus: true });
        clearStageHintLoop({ clearStatus: true });
        clearPendingRewardSeal();
        resetTutorialRuntime({ preserveCompletion: true });
        resetTrainingRuntime({ keepPending: true });

        state.game.entries.clear();
        state.game.queue = [];
        state.game.currentId = null;
        state.game.listening = false;
        state.game.paused = false;
        state.game.canListen = false;
        state.game.active = true;
        state.game.transitioning = false;
        state.game.sessionStartedAt = Date.now();
        state.game.contextLimit = sourceIds.length;
        state.game.selectedCount = sourceIds.length;
        state.game.training.active = true;
        state.game.training.stage = targetStage;
        state.game.training.selectedCount = sourceIds.length;
        state.game.training.sourceIds = sourceIds;
        state.game.training.cycleIndex = 0;
        state.game.training.cycleNumber = 0;
        state.game.training.hitStreak = 0;
        state.game.training.totalHits = 0;
        refillTrainingCycle();

        els.topbar.classList.add('is-hidden');
        els.catalog.classList.add('is-hidden');
        closeGameSetup();
        document.body.classList.add('game-open');
        document.body.classList.add('gameplay-active');
        els.game.classList.add('is-visible');
        window.requestAnimationFrame(() => els.game.classList.add('is-active'));

        updateGameChips();
        advanceToNextCard();
      }

      function beginGame() {
        resetTrainingRuntime();
        hideWelcomeGate();
        clearScheduledOnboardingGate();
        cleanupGameRecognition();
        stopActiveAudio();
        clearGameLanguageSwapTimer();
        clearTypingPromptLoop();
        clearTypingSkipAutomation();
        clearStageTutorialReminder();
        hideGameStageTutorial({ resume: false });
        clearStageTwoHintTimer();
        clearFirstStageIdleTimer();
        clearStageHintLoop({ clearStatus: true });
        state.game.fifthStarHintDismissed = false;
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

          const roundCount = Math.max(MIN_GAME_CONTEXT_LIMIT, normalizeGameCount(state.game.selectedCount) || currentBaseGameCount());
          state.game.contextLimit = currentGameActiveCardCap(currentUserLevel(), roundCount);
          state.game.selectedCount = roundCount;
          const reviewCards = readyReviewCards().slice(0, REVIEW_SLOT_LIMIT);
          const basePool = applyEarlyFlashcardFilter(baseRoundSourceCards());
          const roundGroups = buildLevelAwareRoundGroups(
            basePool,
            reviewCards,
            roundCount
          );
          const chosenCards = roundGroups.baseCards;
          chosenCards.forEach(card => {
            const entry = createGameEntry(card, 'base');
            state.game.entries.set(entry.id, entry);
            state.game.queue.push(entry.id);
          });
          roundGroups.reviewCards.forEach(card => {
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
        document.body.classList.add('gameplay-active');
        els.game.classList.add('is-visible');
        window.requestAnimationFrame(() => els.game.classList.add('is-active'));

        if (!state.game.entries.size) {
          renderCurrentCard();
          return;
        }

        updateGameChips();
        if (restored && state.game.currentId) {
          renderCurrentCard();
          return;
        }
        advanceToNextCard();
      }

      function beginTutorialGame(options = {}) {
        const tutorialCard = findTutorialPlanetCard();
        if (!tutorialCard) return;

        resetTrainingRuntime();
        hideWelcomeGate();
        clearScheduledOnboardingGate();
        clearGameSessionLocally();
        cleanupGameRecognition();
        stopActiveAudio();
        clearGameLanguageSwapTimer();
        clearTypingPromptLoop();
        clearTypingSkipAutomation();
        clearStageTutorialReminder();
        hideGameStageTutorial({ resume: false });
        clearStageTwoHintTimer();
        clearFirstStageIdleTimer();
        clearFirstStageMicHint({ clearStatus: true });
        clearStageHintLoop({ clearStatus: true });
        state.game.fifthStarHintDismissed = false;
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
        state.game.tutorial.muteNarration = Boolean(options?.muteNarration);
        state.game.tutorial.currentCardId = tutorialCard.id;

        const entry = createGameEntry(tutorialCard, 'tutorial');
        state.game.entries.set(entry.id, entry);
        state.game.queue.push(entry.id);

        els.topbar.classList.add('is-hidden');
        els.catalog.classList.add('is-hidden');
        closeGameSetup();
        document.body.classList.add('game-open');
        document.body.classList.add('gameplay-active');
        els.game.classList.add('is-visible');
        window.requestAnimationFrame(() => els.game.classList.add('is-active'));

        updateGameChips();
        advanceToNextCard();
      }

      async function exitGame() {
        clearGameStatusRankTimer();
        commitCurrentCardTrainingTime();
        if (state.game.active && !state.game.tutorial.active && state.game.entries.size) {
          persistGameSessionLocally();
        }
        clearScheduledOnboardingGate();
        cleanupGameRecognition();
        stopActiveAudio();
        clearGameLanguageSwapTimer();
        clearTypingPromptLoop();
        clearTypingSkipAutomation();
        clearStageTutorialReminder();
        hideGameStageTutorial({ resume: false });
        clearStageTwoHintTimer();
        clearStageHintLoop({ clearStatus: true });
        state.game.fifthStarHintDismissed = false;
        clearPendingRewardSeal();
        resetTutorialRuntime({ preserveCompletion: true });
        resetTrainingRuntime();
        state.game.active = false;
        state.game.entries.clear();
        state.game.queue = [];
        state.game.currentId = null;
        state.game.listening = false;
        state.game.paused = false;
        updateLevelProgressBar();
        if (state.game.sessionStartedAt) {
          state.stats.playTimeMs += Date.now() - state.game.sessionStartedAt;
          state.game.sessionStartedAt = 0;
          saveUserStats({ skipCloudSync: true });
        }
        document.body.classList.remove('game-open');
        document.body.classList.remove('gameplay-active');
        resetGameSwipeTracking();
        syncFooterGuardState(null);
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
          clearStageTutorialReminder();
          hideGameStageTutorial({ resume: false });
          addSpeakingCharsFromTranscript(transcript);
          pushPronunciationSample(score);
        }
        updateGameChips();

        if (isTrainingMode()) {
          clearStageHintLoop({ clearStatus: true });
          clearFirstStageMicHint({ clearStatus: true });
          clearStageTwoHintTimer();
          if (isHit) {
            state.game.training.hitStreak = Math.max(0, Number(state.game.training.hitStreak) || 0) + 1;
            state.game.training.totalHits = Math.max(0, Number(state.game.training.totalHits) || 0) + 1;
            entry.typingMistakes = 0;
            setGameStatus('', 'hit');
            playSuccessAudio();
          } else {
            state.game.training.hitStreak = 0;
            entry.typingMistakes = 0;
            setGameStatus('', 'miss');
            playCueAudio(ACCESSKEY_ERROR_SOUND_PATH);
          }
          renderTrainingSequence();
          if (isHit) {
            await playStageResponseSequence(evaluatedStage, card, { skipPromptAudio: evaluatedStage === 2 });
            await wait(420);
          } else {
            await wait(180);
          }
          if (!state.game.active || state.game.currentId !== entry.id) return;
          removeGameEntry(entry.id);
          await advanceToNextCard();
          return;
        }

        if (isHit) {
          if (evaluatedStage === 2) {
            persistSecondStageTutorialCompleted(true);
            clearStageTutorialReminder();
            hideGameStageTutorial({ resume: false });
          }
          if (evaluatedStage === 5) {
        clearStageHintLoop({ clearStatus: true });
          }
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
            if (!isFifthStarEntry(entry)) {
              triggerWinFlash();
            }
            animateStarsCascade(GAME_STAR_TARGET);
            schedulePendingRewardSeal(entry.id, rewardSealPhase);
            promoteCardFromWin(entry);
            if (!state.user?.onboardingNameCompleted
              && accessibleCountBeforeResolution < ONBOARDING_NAME_THRESHOLD
              && accessibleFlashcardsCount() >= ONBOARDING_NAME_THRESHOLD) {
              entry._redirectToUsername = true;
            }
            updateGameChips();
            if (!state.user?.id
              && accessibleCountBeforeResolution < GUEST_FLASHCARD_LOGIN_THRESHOLD
              && accessibleFlashcardsCount() >= GUEST_FLASHCARD_LOGIN_THRESHOLD) {
              scheduleGuestAuthRequirement();
            }
            if (accessibleCountBeforeResolution < ONBOARDING_PHOTO_THRESHOLD
              && accessibleFlashcardsCount() >= ONBOARDING_PHOTO_THRESHOLD) {
              scheduleOnboardingGateOpen();
            }
            if (shouldGatePremiumAccess()) {
              setPremiumStatus('Monte uma chave premium tocando nas imagens.');
            }
            showRewardGameStatus();
            triggerLibrarySummaryRankSwap();
            entry._removeAfterReward = true;
          } else {
            setGameStatus('', 'hit');
            state.game.queue.push(entry.id);
          }
        } else {
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
            const missLimit = evaluatedStage === 1 ? 1 : 3;
            if (entry.missesWithoutStars >= missLimit) {
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
        const skipPromptAudio = Boolean(entry._skipStageTwoResponseAudio);
        entry._skipStageTwoResponseAudio = false;
        await playStageResponseSequence(evaluatedStage, card, { skipPromptAudio });
        const redirectingToUsername = Boolean(entry._redirectToUsername);
        await wait(redirectingToUsername
          ? 180
          : entry._removeAfterReward || entry._requeueAfterReward
            ? (LIBRARY_RANK_SWAP_DELAY_MS + REWARD_RANK_VISIBLE_MS)
            : (evaluatedStage === 3 ? 120 : 1200));
        if (entry._redirectToUsername) {
          entry._redirectToUsername = false;
          entry._removeAfterReward = false;
          await redirectToUsernameOnRewardThreshold();
          return;
        }
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
            const activeLimit = Math.max(MIN_GAME_CONTEXT_LIMIT, Number(state.game.contextLimit) || currentGameActiveCardCap());
            const targetActiveCount = activeCountBeforeResolution >= activeLimit
              ? activeLimit
              : Math.min(activeLimit, activeCountBeforeResolution + 2);
            while (state.game.entries.size < targetActiveCount) {
              if (!refillGameEntry(entry.pool, targetActiveCount)) {
                break;
              }
            }
          }
          if (state.ui.onboardingTransitionActive || state.ui.nameGateOpen || state.ui.photoGateOpen) {
            state.game.currentId = null;
            return;
          }
          advanceToNextCard();
        }
      }

      async function startRecognition() {
        if (!state.game.active || state.game.transitioning || state.game.listening || state.game.paused) return;
        hideGameStageTutorial({ resume: false });
        const entry = state.game.currentId ? state.game.entries.get(state.game.currentId) : null;
        if (!entry) return;
        if (isTypingStage(entry)) return;
        if (state.game.activeAudio) {
          const canInterruptAudio = state.game.canListen
            && Number(state.game.audioCanBeInterruptedAt) > 0
            && Date.now() >= Number(state.game.audioCanBeInterruptedAt);
          if (!canInterruptAudio) {
            flashGameVisualBlockedAudio();
            return;
          }
          await fadeOutActiveAudio(180);
        }
        if (!state.game.canListen) return;

        const nativeSpeech = getNativeSpeechRecognition();
        const openAiSpeech = getOpenAiSpeechRecognition();

        if (!nativeSpeech && !recognitionCtor && !openAiSpeech) {
          setGameStatus('Microfone indisponivel neste aparelho.', 'live');
          return;
        }

        cleanupGameRecognition();
        clearStageHintLoop({ clearStatus: true });
        clearFirstStageIdleTimer();
        clearFirstStageMicHint({ clearStatus: true });
        if (isFifthStarEntry(entry)) {
          state.game.fifthStarHintDismissed = true;
        }
        if (entry.stage !== 1) {
          stopActiveAudio();
        }
        state.game.listening = true;
        els.gameTouchBtn.classList.add('is-busy');
        els.gameCard.classList.add('is-listening');
        els.gameVisual.classList.add('is-mic-live');
        setGameVisualNeonState('touch');
        setGameStatus('', 'live');
        updateGuestFirstStarResultsBanner(entry, true);

        const recognitionLanguage = entry.stage === 2 ? 'pt-BR' : 'en-US';

        let activeRecognition = null;
        let finished = false;
        let gotResult = false;
        let hadError = false;
        let retryTimer = 0;
        let partialTranscript = '';
        const restoreIdleState = (statusText = 'Toque para falar') => {
          if (state.game.active && state.game.currentId === entry.id) {
            state.game.canListen = true;
            renderGameTouchButton(STAGES[entry.stage] || STAGES[1], entry);
            if (shouldShowStageHintLoop(entry) && statusText === 'Toque para falar') {
              startStageHintLoop(entry);
            } else {
              setGameStatus(statusText, 'live');
            }
            scheduleFirstStageMicHint(entry);
            updateGuestFirstStarResultsBanner(entry, false);
          }
        };
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
          if (state.game.recognition === activeRecognition) {
            state.game.recognition = null;
          }
          state.game.listening = false;
          state.game.canListen = true;
          els.gameTouchBtn.classList.remove('is-busy');
          renderGameTouchButton(STAGES[entry.stage] || STAGES[1], entry);
          els.gameCard.classList.remove('is-listening');
          els.gameVisual.classList.remove('is-mic-live');
          setGameVisualNeonState('default');
          clearStageHintLoop();
          updateGuestFirstStarResultsBanner(entry, false);
        };
        const tryOpenAiFallback = async (reason = '') => {
          if (!openAiSpeech) return false;

          const fallbackCapture = {
            aborted: false,
            abort() {
              this.aborted = true;
            }
          };
          activeRecognition = fallbackCapture;
          state.game.recognition = fallbackCapture;

          try {
            const hasFallbackMicAccess = typeof openAiSpeech.requestMicrophoneAccess === 'function'
              ? await openAiSpeech.requestMicrophoneAccess()
              : true;
            if (!hasFallbackMicAccess) {
              finish();
              restoreIdleState('Ative o microfone para falar.');
              return true;
            }

            const transcript = await openAiSpeech.captureAndTranscribe({
              language: recognitionLanguage,
              maxDurationMs: 5000,
              onRecordingStart: () => {
                if (fallbackCapture.aborted || !state.game.active || state.game.currentId !== entry.id) return;
                setGameStatus('Ouvindo...', 'live');
              },
              onRecordingStop: () => {
                if (fallbackCapture.aborted || !state.game.active || state.game.currentId !== entry.id) return;
                setGameStatus('Analisando...', 'live');
              }
            });

            if (fallbackCapture.aborted) {
              finish();
              return true;
            }

            finish();
            if (transcript) {
              gotResult = true;
              await handleRecognitionResult(transcript);
              return true;
            }

            restoreIdleState();
            return true;
          } catch (error) {
            console.warn('[flashcards][speech-fallback]', reason || 'openai-stt', error);
            finish();
            restoreIdleState('Toque para tentar de novo');
            return false;
          }
        };

        if (nativeSpeech) {
          const nativeCapture = {
            aborted: false,
            abort() {
              this.aborted = true;
              if (typeof nativeSpeech.cancelListening === 'function') {
                nativeSpeech.cancelListening();
              }
            }
          };
          activeRecognition = nativeCapture;
          state.game.recognition = nativeCapture;

          try {
            const hasNativeMicAccess = typeof nativeSpeech.ensureGameplayCaptureReady === 'function'
              ? (await nativeSpeech.ensureGameplayCaptureReady(), true)
              : (typeof nativeSpeech.ensurePermissions === 'function'
                ? await nativeSpeech.ensurePermissions()
                : true);
            if (!hasNativeMicAccess) {
              finish();
              if (state.game.active && state.game.currentId === entry.id) {
                state.game.canListen = true;
                renderGameTouchButton(STAGES[entry.stage] || STAGES[1], entry);
                setGameStatus('Toque para falar', 'live');
              }
              return;
            }

            const transcript = typeof nativeSpeech.captureForGameplay === 'function'
              ? await nativeSpeech.captureForGameplay({
                  language: recognitionLanguage,
                  maxResults: 5,
                  maxDurationMs: 6500
                })
              : await nativeSpeech.captureOnce({
                  language: recognitionLanguage,
                  maxResults: 5,
                  maxDurationMs: 6500
                });

            if (nativeCapture.aborted) {
              finish();
              return;
            }

            finish();
            if (transcript) {
              gotResult = true;
              await handleRecognitionResult(transcript);
              return;
            }

            if (state.game.active && state.game.currentId === entry.id) {
              state.game.canListen = true;
              renderGameTouchButton(STAGES[entry.stage] || STAGES[1], entry);
              setGameStatus('Toque para falar', 'live');
            }
            return;
          } catch (error) {
            if (nativeCapture.aborted) {
              finish();
              return;
            }

            const errorCode = safeText(error?.code || error?.message || '').toLowerCase();
            hadError = true;
            finish();

            if (
              openAiSpeech
              && errorCode !== 'permission_denied'
              && errorCode !== 'cancelled'
              && errorCode !== 'app_paused'
              && errorCode !== 'busy'
              && errorCode !== 'client'
              && await tryOpenAiFallback(`native:${errorCode || 'unknown'}`)
            ) {
              return;
            }

            if (
              errorCode === 'no_match'
              || errorCode === 'speech_timeout'
              || errorCode === 'cancelled'
              || errorCode === 'app_paused'
              || errorCode === 'permission_denied'
              || errorCode === 'busy'
              || errorCode === 'client'
            ) {
              restoreIdleState(errorCode === 'permission_denied' ? 'Ative o microfone para falar.' : 'Toque para falar');
              return;
            }

            restoreIdleState('Nao consegui abrir o microfone. Tente de novo');
            return;
          }
        }

        if (!recognitionCtor) {
          await tryOpenAiFallback('no-web-recognition');
          return;
        }

        const recognition = new recognitionCtor();
        activeRecognition = recognition;
        state.game.recognition = recognition;

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
            restoreIdleState();
            return;
          }
          if (await tryOpenAiFallback(`web:${errorCode || 'unknown'}`)) return;
          restoreIdleState('Toque para tentar de novo');
        };

        recognition.onend = async () => {
          finish();
          if (!gotResult && partialTranscript && state.game.active && state.game.currentId === entry.id) {
            gotResult = true;
            await handleRecognitionResult(partialTranscript);
            return;
          }
          if (!gotResult && !hadError && state.game.active && state.game.currentId === entry.id) {
            restoreIdleState();
          }
        };

        try {
          recognition.start();
          retryTimer = window.setTimeout(() => {
            if (finished) return;
            finish();
            restoreIdleState();
          }, 10000);
        } catch (_error) {
          finish();
          if (await tryOpenAiFallback('web:start-failed')) return;
          restoreIdleState('Toque para tentar de novo');
        }
      }

      async function guardWelcomeEnergy(options = {}) {
        if (!window.PlaytalkEnergy || typeof window.PlaytalkEnergy.guardEnergyGate !== 'function') {
          return true;
        }
        const result = await window.PlaytalkEnergy.guardEnergyGate({
          user: state.user,
          previewTarget: options.previewTarget,
          previewTargets: options.previewTargets
        });
        return Boolean(result?.allowed);
      }

      function bindEvents() {
        els.welcomeStartBtn?.addEventListener('click', (event) => {
          void (async () => {
            if (!(await guardWelcomeEnergy({ previewTarget: event.currentTarget }))) return;
            state.entry.welcomeStartRequested = true;
            void openAudioCheck();
          })();
        });
        els.welcomeLogo?.addEventListener('click', (event) => {
          void (async () => {
            if (!(await guardWelcomeEnergy({ previewTarget: [event.currentTarget, els.welcomeStartBtn] }))) return;
            state.entry.welcomeStartRequested = true;
            void openAudioCheck();
          })();
        });
        // Guest account link removed from the play screen.
        els.soundTestPlayBtn?.addEventListener('click', () => {
          if (state.ui.soundTestBusy || !state.ui.soundTestOpen) return;
          void playSoundTestSequence();
        });
        els.soundTestReplayBtn?.addEventListener('click', () => {
          if (state.ui.soundTestBusy || !state.ui.soundTestOpen) return;
          void playSoundTestSequence();
        });
        els.soundTestClearBtn?.addEventListener('click', () => {
          if (state.ui.soundTestBusy || !state.ui.soundTestOpen) return;
          clearSoundTestSelection();
        });
        els.soundTestKeyboard?.addEventListener('click', (event) => {
          const tile = event.target.closest('[data-audio-letter], [data-audio-backspace]');
          if (!tile) return;
          toggleSoundTestLetter(tile.getAttribute('data-audio-letter') || '⌫');
        });
        els.soundTestInput?.addEventListener('input', () => {
          const normalized = String(els.soundTestInput.value || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, AUDIO_CHECK_INPUT_MAX);
          els.soundTestInput.value = normalized;
          setAudioCheckStatus('');
        });
        els.micTestPlayBtn?.addEventListener('click', async () => {
          await startMicCheckCapture();
        });
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
        els.welcomeTrainingModes?.addEventListener('click', (event) => {
          const button = event.target.closest('[data-training-stage]');
          if (!button) return;
          openTrainingSetup(button.getAttribute('data-training-stage'));
        });
        els.exitGameBtn?.addEventListener('click', exitGame);
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
        els.welcomeBgDesktopBtn?.addEventListener('click', () => requestWelcomeBackgroundUpload('desktop'));
        els.welcomeBgMobileBtn?.addEventListener('click', () => requestWelcomeBackgroundUpload('mobile'));
        els.welcomeBgUploadInput?.addEventListener('change', (event) => {
          const file = event.target?.files?.[0] || null;
          event.target.value = '';
          if (file) void uploadWelcomeBackgroundFile(file);
        });
        els.adminCardPopover?.addEventListener('click', (event) => {
          if (event.target === els.adminCardPopover) {
            closeAdminCardPopover();
          }
        });
        const gameShell = els.game.querySelector('.game-shell');
        gameShell?.addEventListener('pointerdown', beginGameSwipeTracking);
        gameShell?.addEventListener('pointerup', finishGameSwipeTracking);
        gameShell?.addEventListener('pointercancel', resetGameSwipeTracking);
        els.gameStageTutorial?.addEventListener('pointerdown', (event) => {
          event.preventDefault();
          event.stopPropagation();
          hideGameStageTutorial();
        });
        els.gameStageTutorial?.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
        });
        els.gameStageTutorialImage?.addEventListener('error', () => {
          const missingKind = state.ui.gameStageTutorialKind === 'second' ? 'second' : 'first';
          state.ui.gameStageTutorialMissingAssets[missingKind] = true;
          hideGameStageTutorial();
        });
        gameShell?.addEventListener('click', (event) => {
          if (!state.game.active) return;
          if (Date.now() - (Number(state.ui.gameSwipeTriggeredAt) || 0) < 400) return;
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
        els.trainingCountDownBtn?.addEventListener('click', () => {
          changeTrainingCount(-TRAINING_CARD_STEP);
        });
        els.trainingCountUpBtn?.addEventListener('click', () => {
          changeTrainingCount(TRAINING_CARD_STEP);
        });
        els.trainingStartBtn?.addEventListener('click', () => {
          const stage = normalizeTrainingStage(state.game.training?.pendingStage);
          const count = normalizeTrainingCount(state.game.training?.pendingCount);
          beginTrainingGame(stage, count);
        });
        els.startTutorialBtn?.addEventListener('click', () => {
          state.game.selectedCount = currentBaseGameCount();
          beginGame();
        });
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
          if (state.ui.soundTestOpen) {
            if (event.key === 'Escape') {
              event.preventDefault();
              return;
            }
            if (/^[a-p]$/i.test(event.key || '')) {
              event.preventDefault();
              toggleSoundTestLetter(event.key);
              return;
            }
          }
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
        if (!isNativeRuntime()) {
          window.addEventListener('focus', () => {
            if (!state.user) return;
            reloadCardsFromNetwork().catch(() => {});
          });
          document.addEventListener('visibilitychange', () => {
            if (!state.user || document.hidden) return;
            reloadCardsFromNetwork().catch(() => {});
          });
        }
        els.gameTouchBtn.addEventListener('click', (event) => {
          event.stopPropagation();
          startRecognition();
        });
        els.footerPlayBtn?.addEventListener('click', (event) => {
          if (primeFooterNavigation(event)) return;
          if (isNativeRuntime()) {
            window.location.href = resolveNativeRenderPageHref('play');
            return;
          }
          void navigateToMainView('play');
        });
        els.footerCardsBtn?.addEventListener('click', (event) => {
          if (primeFooterNavigation(event)) return;
          window.location.href = isNativeRuntime()
            ? resolveNativeRenderPageHref('cards')
            : '/allcards';
        });
        els.footerUsersBtn?.addEventListener('click', (event) => {
          if (primeFooterNavigation(event)) return;
          window.location.href = isNativeRuntime()
            ? resolveNativeRenderPageHref('users')
            : '/users';
        });
        els.footerProfileBtn?.addEventListener('click', (event) => {
          if (primeFooterNavigation(event)) return;
          window.location.href = isNativeRuntime()
            ? resolveNativeRenderPageHref('profile')
            : '/account';
        });
        els.nameGateContinueBtn?.addEventListener('click', () => {
          void submitNameGate();
        });
        els.nameGateSpaceBtn?.addEventListener('click', () => {
          if (state.ui.nameGateBusy || !state.ui.nameDraft || state.ui.nameDraft.endsWith(' ') || state.ui.nameDraft.length >= 24) return;
          state.ui.nameDraft = `${state.ui.nameDraft} `;
          renderNameGate();
        });
        els.photoGateCircle?.addEventListener('click', () => {
          if (state.ui.photoGateBusy) return;
          els.photoGateInput?.click();
        });
        els.photoGateRegenerateBtn?.addEventListener('click', () => {
          if (state.ui.photoGateBusy || state.ui.photoGenerationCount >= ONBOARDING_MAX_PHOTO_GENERATIONS) return;
          els.photoGateInput?.click();
        });
        els.photoGateContinueBtn?.addEventListener('click', async () => {
          if (state.ui.photoGateBusy) return;
          try {
            state.ui.photoGateBusy = true;
            renderPhotoGate();
            await persistPhotoGateProfile();
            closePhotoGate();
          } catch (error) {
            if (els.photoGateLoadingCopy) {
              els.photoGateLoadingCopy.textContent = error?.message || 'Nao foi possivel salvar a foto.';
            }
          } finally {
            state.ui.photoGateBusy = false;
            renderPhotoGate();
          }
        });
        els.photoGateInput?.addEventListener('change', async (event) => {
          const file = event.target?.files?.[0];
          event.target.value = '';
          if (!file) return;
          await generatePhotoVersionFromFile(file);
        });
        els.photoGateCircle?.addEventListener('pointerdown', (event) => {
          state.ui.photoSwipeStartX = Number(event.clientX) || 0;
        });
        els.photoGateCircle?.addEventListener('pointerup', (event) => {
          const delta = (Number(event.clientX) || 0) - Number(state.ui.photoSwipeStartX || 0);
          if (Math.abs(delta) < 40) return;
          if (delta > 0) {
            showPreviousPhotoVersion();
          } else {
            showNextPhotoVersion();
          }
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
        const requestedLaunch = safeText(searchParams.get('launch')).toLowerCase();
        let requestedTutorialLaunch = requestedLaunch === 'tutorial';
        if (requestedTutorialLaunch) {
          try {
            if (sessionStorage.getItem(TUTORIAL_LAUNCH_SESSION_KEY) === '1') {
              requestedTutorialLaunch = false;
            } else {
              sessionStorage.setItem(TUTORIAL_LAUNCH_SESSION_KEY, '1');
            }
          } catch (_error) {
            // ignore session storage failures
          }

          searchParams.delete('launch');
          const nextSearch = searchParams.toString();
          const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}${window.location.hash || ''}`;
          if (typeof window.history?.replaceState === 'function') {
            window.history.replaceState(null, '', nextUrl);
          }
        }
        const requestedPremiumOpen = searchParams.get('premium') === '1';
        clearFlashcardsLocalStorage();
        state.entry.soundTestCompleted = readAudioCheckCompletedFlag();
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
        if (LEGACY_FLASHCARDS_HOME_ENABLED) {
          renderMiniCards(els.allGrid, [], 'Entre para carregar seus flashcards.');
        } else if (els.allGrid) {
          els.allGrid.innerHTML = '';
        }
        syncAdminTools();
        renderAdminPublishBar();
        els.flashcardsHomeToggle?.setAttribute('aria-label', 'Mostrar resumo');
        switchMainView('play');

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
            tryStartPendingWelcomePlay();
            tryStartPendingTutorial();
            syncWelcomeGate();
          }
          const sessionUser = await fetchSessionUser();
          if (sessionUser) {
            await hydrateAuthenticatedApp(sessionUser, { skipLoadCards: true });
            primeGameTouchButton();
          } else {
            await handleLoggedOutState('');
          }
          if (!isAdminUser() && resolveAudioCheckCompletedState() && !readMicCheckCompletedFlag()) {
            openMicCheck();
          }
          if (!hasSpeechRecognitionSupport()) {
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

        try {
          await maybeOpenOnboardingGate();
        } catch (error) {
          console.warn('Falha ao verificar onboarding de identidade:', error);
        }

        if (requestedTutorialLaunch && !isAdminUser()) {
          requestWelcomeTutorialStart(true, { forceTutorial: true });
        }

        if (resumePendingSoundCheckFlow()) {
          return;
        }

        if (requestedPremiumOpen) {
          switchMainView('play');
          openPremiumGate();
        } else if (requestedView === 'play') {
          switchMainView('play');
        } else {
          switchMainView('play');
        }
      }

      init();
    })();
