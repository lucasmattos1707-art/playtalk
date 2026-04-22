(function () {
  const STORAGE_KEY = 'vocabulary-level';
  const JOURNEY_STARTED_KEY = 'playtalk-journey-started';
  const GAME_CONFIG = window.PLAYTALK_GAME_CONFIG || {};
  const deferAutoStart = Boolean(GAME_CONFIG.deferAutoStart);
  const gameRoot = document.querySelector('[data-game-root]') || document.body;
  const gameRuntimeState = document.getElementById('game-runtime-state');
  const PLAYER_IDLE_AUTO_PAUSE_MS = 8000;
  const board = document.getElementById('board');
  const boardInner = document.getElementById('board-inner');
  const gameFeedback = document.getElementById('game-feedback');
  const feedbackProgress = document.getElementById('game-feedback-progress');
  const feedbackProgressFill = document.getElementById('game-feedback-progress-fill');
  const textContainer = document.getElementById('text-container');
  const textContainerHomeParent = textContainer ? textContainer.parentNode : null;
  const textContainerHomeNextSibling = textContainer ? textContainer.nextSibling : null;
  const choiceRow = document.getElementById('choice-row');
  const progressFill = document.getElementById('progress-fill');
  const phaseLabel = document.getElementById('phase-label');
  const levelBadge = document.getElementById('level-indicator');
  const startScreen = document.getElementById('start-screen');
  const rotatingText = document.getElementById('rotating-text');
  const levelComplete = document.getElementById('level-complete');
  const levelCompleteText = document.getElementById('level-complete-text');
  const levelCountdown = document.getElementById('level-countdown');
  const nextLevelBtn = document.getElementById('next-level-btn');
  const replayLevelBtn = document.getElementById('replay-level-btn');
  const preGameScreen = document.getElementById('pre-game-screen');
  const preGameTitle = document.getElementById('pre-game-title');
  const preGameLogline = document.getElementById('pre-game-logline');
  const preGameStartBtn = document.getElementById('pre-game-start-btn');
  const preGameAdmin = document.getElementById('pre-game-admin');
  const preGameLoadLevelBtn = document.getElementById('pre-game-load-level-btn');
  const preGameLevelPicker = document.getElementById('pre-game-level-picker');
  const preGameLevelSelect = document.getElementById('pre-game-level-select');
  const preGameApplyLevelBtn = document.getElementById('pre-game-apply-level-btn');
  const preGameLevelStatus = document.getElementById('pre-game-level-status');
  const playingScreen = document.getElementById('playing');
  const playingTitle = document.getElementById('playing-title');
  const playingLogline = document.getElementById('playing-logline');
  const myhomeStatus = document.getElementById('myhome-status');
  const myhomeProgress = document.getElementById('myhome-progress');
  const myhomeProgressFill = document.getElementById('myhome-progress-fill');
  const playingStatus = document.getElementById('playing-status');
  const playingProgress = document.getElementById('playing-progress');
  const playingProgressFill = document.getElementById('playing-progress-fill');
  const playingHelpBtn = document.getElementById('playing-help-btn');
  const playingHomeBtn = document.getElementById('playing-home-btn');
  const playingResetBtn = document.getElementById('playing-reset-btn');
  const dynamicBar = document.getElementById('dynamic-bar');
  const resultsScreen = document.getElementById('results-screen');
  const resultsRingProgress = document.getElementById('results-ring-progress');
  const resultsAvatarImage = document.getElementById('results-avatar-image');
  const resultsAvatarFallback = document.getElementById('results-avatar-fallback');
  const DEFAULT_PROFILE_AVATAR = '/Avatar/profile-neon-blue.svg';
  const resultsMetricIcon = document.getElementById('results-metric-icon');
  const resultsMetricLabel = document.getElementById('results-metric-label');
  const resultsMetricValue = document.getElementById('results-metric-value');
  const progressCompleteOverlay = document.getElementById('progress-complete-overlay');
  const finalOverlay = document.getElementById('final-overlay');
  const finalSlideshow = document.getElementById('final-slideshow');
  const finalSlideshowImage = document.getElementById('final-slideshow-image');
  const finalAvatarWrap = document.getElementById('final-avatar-wrap');
  const finalAvatarImage = document.getElementById('final-avatar-image');
  const finalAvatarFallback = document.getElementById('final-avatar-fallback');
  const finalGeneralStats = document.getElementById('final-general-stats');
  const finalPhaseProgressList = document.getElementById('final-phase-progress-list');
  const finalContinueBtn = document.getElementById('final-continue-btn');
  const finalTotalTimeEl = document.getElementById('final-total-time');
  const finalPronunciationEl = document.getElementById('final-pronunciation');
  const finalRotatingLabel = document.getElementById('final-rotating-label');
  const finalRotatingStat = document.getElementById('final-rotating-stat');
  const finalMemoryEl = document.getElementById('final-memory');
  const finalProgressBar = document.getElementById('final-progress-bar');
  const finalProgressFill = document.getElementById('final-progress-fill');
  const finalMedalImage = document.getElementById('final-medal-image');
  const finalMedalLabel = document.getElementById('final-medal-label');
  const gameMedalIcon = document.getElementById('game-medal-icon');
  const gameMedalLabel = document.getElementById('game-medal-label');
  const heartNodes = Array.from(document.querySelectorAll('.game-heart'));
  let pauseButton = document.getElementById('game-pause-btn');
  let micButton = document.getElementById('game-mic-btn');
  let volumeButton = document.getElementById('game-volume-btn');
  let narratorButton = document.getElementById('game-narrator-btn');
  let backButton = document.getElementById('game-back-btn');
  let nextButton = document.getElementById('game-next-btn');
  let voiceButton = document.getElementById('game-voice-btn');
  let speedButton = document.getElementById('game-speed-btn');
  let subtitleButton = document.getElementById('game-subtitle-btn');
  let languageButton = document.getElementById('game-language-btn');
  let controlsRoot = document.querySelector('.game-controls');
  const phaseAudioProgress = document.getElementById('phase-audio-progress');
  const phaseAudioProgressFill = document.getElementById('phase-audio-progress-fill');
  const phaseAudioSkip = document.getElementById('phase-audio-skip');
  const deviceSelectOverlay = document.getElementById('device-select');
  const deviceSelectButtons = Array.from(document.querySelectorAll('[data-device-option]'));
  const PHASE_DISSOLVE_MS = 500;
  const IMAGE_DISSOLVE_MS = 500;
  const RESULTS_STEP_MS = 2500;
  const RESULTS_RING_ANIMATION_MS = 2000;
  const RESULTS_RING_CIRCUMFERENCE = 326.73;
  const PHASE_FOUR_BATCH_SIZE = 6;
  const PHASE_FOUR_GREEN_MS = 1000;
  const PHASE_FOUR_DISSOLVE_MS = 1000;
  const AUDIO_SKIP_TAP_COUNT = 5;
  const MAX_PHASE = 12;
  const MEDAL_STORAGE_KEY = 'vocabulary-medals';
  const PROGRESS_STORAGE_KEY = 'vocabulary-progress';
  const SINGLE_PROGRESS_STORAGE_KEY = 'playtalk-single-progress-v1';
  const COMPLETION_STORAGE_KEY = 'vocabulary-last-complete';
  const GAME_CONTEXT_STORAGE_KEY = 'playtalk-active-game-context';
  const GAME_CONTEXT_EVENT = 'playtalk:game-context-change';
  const LIVE_STATS_STORAGE_KEY = 'playtalk-game-stats-live-v1';
  const LEVEL_TIME_STORAGE_KEY = 'vocabulary-level-times';
  const MEDAL_RANKING = { bronze: 0, prata: 1, ouro: 2, diamante: 3 };
  const MEDAL_HEARTS = {
    diamante: 5,
    ouro: 5,
    prata: 5,
    bronze: 5
  };
  const MEDAL_UPGRADE = {
    bronze: 'prata',
    prata: 'ouro',
    ouro: 'diamante',
    diamante: 'bronze'
  };
  const MEDAL_DOWNGRADE = {
    diamante: 'ouro',
    ouro: 'prata',
    prata: 'bronze',
    bronze: 'bronze'
  };
  const LOCAL_LEVEL_API_PATH = '/api/local-level/day/{day}/phase/{phase}';
  const LOCAL_LEVEL_FILES_MANIFEST_PATH = 'data/local-level-files.json';
  const FLUENCY_PHASE_CACHE_PREFIX = 'playtalk-fluency-phase-cache-v1';
  const MIRROR_PATH = 'data/mirror.json';
  const VOICE_CHARACTER_STORAGE_KEY = 'playtalk-voice-character';
  const HARRY_VOICE_ICON = 'images/personagens/harry.png';
  const ANNIE_VOICE_ICON = 'images/personagens/annie.png';
  const AUDIO_LEVELS_PATHS = [
    'data/trilhas.json',
    'data/audiosniveis.json'
  ];
  const WRITING_POOLS_PATHS = {
    micro: 'Writing/micro_words.json',
    verbs: 'Writing/verbs.json',
    nouns: 'Writing/nouns.json',
    adjectives: 'Writing/adjectives_adverbs.json'
  };
  const WRITING_HUB_COUNTS = {
    micro: 6,
    verbs: 4,
    nouns: 3,
    adjectives: 2
  };
  const WRITING_HUB_LIMIT = 12;
  const WRITING_HUB_ROWS = 4;
  const WRITING_HUB_COLS = 3;
  const WRITING_HUB_MAX_ROW_CHARS = 20;
  const WRITING_COLOR_CLASSES = [
    'writing-chip--red',
    'writing-chip--blue',
    'writing-chip--purple',
    'writing-chip--gold',
    'writing-chip--gremio',
    'writing-chip--orange'
  ];
  const INTRO_AUDIO_FADEOUT_MS = 350;
  const PAUSE_INFO_FADEOUT_MS = 1000;
  const ACCURACY_RING_ANIMATION_MS = 500;
  const ACCURACY_RING_RESET_MS = 500;
  const CIRCULAR_BAR_RADIUS = 57;
  const ACCURACY_RING_CIRC = 2 * Math.PI * CIRCULAR_BAR_RADIUS;
  const STREAK_HEART_TARGET = 8;
  const PHASE_EIGHT_TEXT_ANIMATION_MS = 8000;
  const WRITING_COLOR_CYCLE_MS = 3000;
  const AUDIO_LISTENED_STORAGE_KEY = 'playtalk-phase-audio-listened';
  const DEVICE_STORAGE_KEY = 'playtalk-device-selection';
  const CUSTOM_JSON_HOLD_MS = 2000;
  const FLASHCARD_STATS_STORAGE_KEY = 'playtalk-flashcard-stats';
  const FLASHCARD_PRONUNCIATION_LIMIT = 6;
  const FLASHCARD_METRIC_LIMIT = 10;
  const FLASHCARD_TIME_LIMIT = 10;
  const GAME_STATS_STORAGE_KEY = 'playtalk-game-stats-v1';
  const MEMORY_HISTORY_LIMIT = 10;
  const MEMORY_SEEDING_DAYS = [3, 7, 15, 30];
  const AUDIO_RESOLVE_ENDPOINT = '/api/media/resolve';
  const R2_VOICES_BASE_URL = 'https://pub-1208463a3c774431bf7e0ddcbd3cf670.r2.dev/voices';
  const PHASE_FIVE_ICON_URL = 'SVG/codex-icons/microfone.svg';
  const successAudio = document.getElementById('audio-success');
  const errorAudio = document.getElementById('audio-error');
  const conclusionAudio = document.getElementById('audio-conclusao');
  const micAudio = document.getElementById('audio-mic');
  const MIC_PROMPT_STORAGE_KEY = 'vocabulary-mic-prompted';
  const PHASE_THREE_HINT_STORAGE_KEY = 'vocabulary-phase3-mic-hint';
  const NEXT_LEVEL_UNLOCK_STORAGE_KEY = 'vocabulary-next-level-unlock-at';
  const LEGACY_LEVEL_TWO_UNLOCK_STORAGE_KEY = 'vocabulary-level2-unlock-at';
  const MODE_PHASE_MAP = {
    association: 2,
    reading: 3,
    listening: 5,
    writing: 9
  };
  const MODE_NAME_TO_PHASE = {
    planting: 1,
    connecting: 2,
    reading: 3,
    sequence: 4,
    listening: 5,
    meaning: 6,
    memory: 7,
    building: 8,
    typing: 9,
    blocks: 10,
    watching: 11,
    talking: 12
  };
  const PHASE_NAMES = {
    1: 'Planting',
    2: 'Connecting',
    3: 'Reading',
    4: 'Sequence',
    5: 'Listening',
    6: 'Meaning',
    7: 'Memory',
    8: 'Building',
    9: 'Typing',
    10: 'Blocks',
    11: 'Watching',
    12: 'Talking'
  };
  const PAUSE_HELP_AUDIO_URLS = {
    1: 'https://pub-1208463a3c774431bf7e0ddcbd3cf670.r2.dev/tips/01.mp3',
    2: 'https://pub-1208463a3c774431bf7e0ddcbd3cf670.r2.dev/tips/02.mp3',
    3: 'https://pub-1208463a3c774431bf7e0ddcbd3cf670.r2.dev/tips/03.mp3',
    4: 'https://pub-1208463a3c774431bf7e0ddcbd3cf670.r2.dev/tips/04.mp3',
    5: 'https://pub-1208463a3c774431bf7e0ddcbd3cf670.r2.dev/tips/05.mp3',
    6: 'https://pub-1208463a3c774431bf7e0ddcbd3cf670.r2.dev/tips/06.mp3',
    7: 'https://pub-1208463a3c774431bf7e0ddcbd3cf670.r2.dev/tips/07.mp3',
    8: 'https://pub-1208463a3c774431bf7e0ddcbd3cf670.r2.dev/tips/08.mp3',
    9: 'https://pub-1208463a3c774431bf7e0ddcbd3cf670.r2.dev/tips/09.mp3',
    10: 'https://pub-1208463a3c774431bf7e0ddcbd3cf670.r2.dev/tips/10.mp3',
    11: 'https://pub-1208463a3c774431bf7e0ddcbd3cf670.r2.dev/tips/11.mp3',
    12: 'https://pub-1208463a3c774431bf7e0ddcbd3cf670.r2.dev/tips/12.mp3'
  };
  const ERROR_AUDIO_SOURCES = [
    '../thesongs/error.mp3',
    'thesongs/error.mp3',
    '/thesongs/error.mp3'
  ];
  const LEVEL_COMPLETE_AUDIO_SOURCES = [
    '../thesongs/level%20complete.mp3',
    'thesongs/level%20complete.mp3',
    '/thesongs/level%20complete.mp3'
  ];
  const RESULTS_PLUS_AUDIO_SOURCES = [
    '../thesongs/plus.mp3',
    'thesongs/plus.mp3',
    '/thesongs/plus.mp3'
  ];
  const PHASE_TEMPO_TARGET_CPS = {
    1: 3.2,
    2: 2.9,
    3: 1.78,
    4: 3.69,
    5: 1.43,
    6: 1.25,
    7: 1.19,
    8: 1.11,
    9: 1.92,
    10: 1.67,
    12: 0.78
  };
  const PRE_GAME_LOG_LINES = {
    1: 'Toque na opcao em portugues que combina com a imagem.',
    2: 'Ouca o ingles e toque na imagem correta.',
    3: 'Leia em ingles e fale a frase em voz alta.',
    4: 'Ouca a sequencia e toque nas imagens na mesma ordem.',
    5: 'Ouca a frase e repita em voz alta do seu jeito.',
    6: 'Leia em portugues e diga em ingles, falando alto.',
    7: 'Veja a imagem e digite a frase que voce lembra.',
    8: 'Transforme a frase: pergunta, negativa, passado, futuro e siga as acoes.',
    9: 'Veja o portugues e digite em ingles usando o teclado smart.',
    10: 'Ouca e monte a frase tocando nos blocos na ordem certa.',
    11: 'Assista, ajuste idioma/velocidade e absorva o ingles no contexto.',
    12: 'Espere sua vez e interprete seu personagem falando as falas.'
  };
  const PHASE_COIN_REWARD = {
    1: 1,
    2: 2,
    3: 4,
    4: 1,
    5: 5,
    6: 7,
    7: 9,
    8: 1,
    9: 6,
    10: 3,
    11: 0.5,
    12: 12
  };
  const PHASE_INTRO_AUDIO_BY_PHASE = {
    1: 'planting.mp3',
    2: 'connecting.mp3',
    3: 'reading.mp3',
    4: 'sequence.mp3',
    5: 'listening.mp3',
    6: 'meaning.mp3',
    7: 'memory.mp3',
    8: 'building.mp3',
    9: 'typing.mp3',
    10: 'blocks.mp3',
    11: 'watching.mp3',
    12: 'talking.mp3'
  };
  const PHASE_ICON_URLS = {
    1: 'https://pub-1208463a3c774431bf7e0ddcbd3cf670.r2.dev/%C3%ADcones/modos%20de%20jogo/thinking.svg',
    2: 'https://pub-1208463a3c774431bf7e0ddcbd3cf670.r2.dev/%C3%ADcones/modos%20de%20jogo/connecting.svg',
    3: 'https://pub-1208463a3c774431bf7e0ddcbd3cf670.r2.dev/%C3%ADcones/modos%20de%20jogo/reading.svg',
    4: 'https://pub-1208463a3c774431bf7e0ddcbd3cf670.r2.dev/%C3%ADcones/modos%20de%20jogo/sequence.svg',
    5: 'https://pub-1208463a3c774431bf7e0ddcbd3cf670.r2.dev/%C3%ADcones/modos%20de%20jogo/listening.svg',
    6: 'https://pub-1208463a3c774431bf7e0ddcbd3cf670.r2.dev/%C3%ADcones/modos%20de%20jogo/meaning.svg',
    7: 'https://pub-1208463a3c774431bf7e0ddcbd3cf670.r2.dev/%C3%ADcones/modos%20de%20jogo/memory.svg',
    8: 'https://pub-1208463a3c774431bf7e0ddcbd3cf670.r2.dev/%C3%ADcones/modos%20de%20jogo/building.svg',
    9: 'https://pub-1208463a3c774431bf7e0ddcbd3cf670.r2.dev/%C3%ADcones/modos%20de%20jogo/typing.svg',
    10: 'https://pub-1208463a3c774431bf7e0ddcbd3cf670.r2.dev/%C3%ADcones/modos%20de%20jogo/blocks.svg',
    11: 'https://pub-1208463a3c774431bf7e0ddcbd3cf670.r2.dev/%C3%ADcones/modos%20de%20jogo/watching.svg',
    12: 'https://pub-1208463a3c774431bf7e0ddcbd3cf670.r2.dev/%C3%ADcones/modos%20de%20jogo/talking.svg'
  };
  const RESULTS_ICON_URLS = {
    pronunciation: 'SVG/codex-icons/post-results/pronuncia.svg',
    listens: 'SVG/codex-icons/post-results/play.svg',
    tempo: 'SVG/codex-icons/post-results/clock.svg',
    typing: 'SVG/codex-icons/post-results/typing.svg',
    speakings: 'SVG/codex-icons/post-results/speakings.svg',
    coins: 'SVG/codex-icons/post-results/coins.svg'
  };
  const PHASE_NINE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const PHASE_NINE_BASE_KEY_COUNT = 16;
  const PHASE_NINE_EXTENDED_KEY_COUNT = 20;
  const PHASE_NINE_TYPE_SOUND_SRC = 'sounds/type.mp3';
  const PHASE_NINE_TAP_FLASH_MS = 500;
  const HEART_ICON_URL = 'SVG/codex-icons/star.svg';
  const JOURNEY_PHASE_ORDER = [1, 10, 2, 5, 4, 9, 3, 7, 6, 8, 11, 12];
  const SPEECH_LISTEN_LIMIT_MS = 8000;
  const urlParams = new URLSearchParams(window.location.search);
  const playLaunchPayload = (() => {
    try {
      const raw = sessionStorage.getItem('playtalk-play-launch');
      if (!raw) return null;
      const payload = JSON.parse(raw);
      if (!payload || typeof payload !== 'object') return null;
      const phase = Number.parseInt(payload.phase, 10);
      const day = Number.parseInt(payload.day, 10);
      return {
        phase: Number.isFinite(phase) ? phase : null,
        day: Number.isFinite(day) ? day : null,
        source: String(payload.source || '').toLowerCase()
      };
    } catch (error) {
      return null;
    }
  })();
  const launchSource = String(urlParams.get('source') || '').toLowerCase();
  const isPlayLaunch = launchSource === 'play' || Boolean(playLaunchPayload && playLaunchPayload.source === 'play');
  const isCardsLaunch = launchSource === 'cards' || Boolean(playLaunchPayload && playLaunchPayload.source === 'cards');
  const isExternalSingleLaunch = isPlayLaunch || isCardsLaunch;
  const hasPlayLaunchPayload = (launchSource === 'play' || launchSource === 'cards')
    && Boolean(playLaunchPayload && (playLaunchPayload.source === 'play' || playLaunchPayload.source === 'cards'));
  const requestedMode = urlParams.get('mode');
  const requestedPhaseRaw = Number.parseInt(urlParams.get('phase') || '', 10);
  const requestedDayRaw = Number.parseInt(urlParams.get('day') || '', 10);
  const modePhase = MODE_PHASE_MAP[requestedMode];
  const requestedPhase = Number.isFinite(requestedPhaseRaw)
    ? requestedPhaseRaw
    : (hasPlayLaunchPayload && Number.isFinite(playLaunchPayload?.phase) ? playLaunchPayload.phase : null);
  const requestedDay = Number.isFinite(requestedDayRaw)
    ? requestedDayRaw
    : (hasPlayLaunchPayload && Number.isFinite(playLaunchPayload?.day) ? playLaunchPayload.day : null);
  const forcedPhase = Number.isFinite(requestedPhase)
    ? requestedPhase
    : (Number.isFinite(modePhase) ? modePhase : null);
  const isSingleModeLaunch = isExternalSingleLaunch || Number.isFinite(modePhase);
  const singlePhaseMode = isSingleModeLaunch && Number.isFinite(forcedPhase) && forcedPhase >= 1 && forcedPhase <= MAX_PHASE;
  let singleModeSessionActive = singlePhaseMode;
  let activeSinglePhase = Number.isFinite(forcedPhase) ? forcedPhase : null;
  const isSingleModeSession = () => singlePhaseMode || singleModeSessionActive;
  const isFunLaunch = launchSource === 'fun';
  if (!isExternalSingleLaunch && playLaunchPayload) {
    try {
      sessionStorage.removeItem('playtalk-play-launch');
    } catch (error) {
      // no-op
    }
  }
  const MIC_ICON_ON = 'SVG/codex-icons/microfone.svg';
  const MIC_ICON_OFF = 'SVG/codex-icons/microfone.svg';
  const BACK_ICON = 'SVG/codex-icons/voltar.svg';
  const MUSIC_ICON = 'SVG/codex-icons/music.svg';
  const MODE11_PORTUGUESE_ICON = 'SVG/codex-icons/portugues.svg';
  const MODE11_ENGLISH_ICON = 'SVG/codex-icons/ingles.svg';
  const SUBTITLE_ICON = 'SVG/codex-icons/chat.svg';
  const MODE_AUDIO_SPEEDS = [0.6, 0.8, 1, 1.2];
  const MODE_AUDIO_SPEED_ICONS = [
    'SVG/codex-icons/060.svg',
    'SVG/codex-icons/080.svg',
    'SVG/codex-icons/100.svg',
    'SVG/codex-icons/120.svg'
  ];
  const MODE11_VOICE_MODES = ['english', 'portuguese', 'both'];
  const MODE11_SUBTITLE_MODES = ['english', 'portuguese', 'none'];
  const MODE12_SCENE_AUDIO_BASE_URL = 'https://pub-1208463a3c774431bf7e0ddcbd3cf670.r2.dev/scenes/scene1';
  const MODE12_SPECTATOR_ID = '__spectator__';
  const MODE12_PICKER_TITLE_ID = 'mode12-hearts-title';
  const MIC_CONTINUOUS_HOLD_MS = 2000;
  const PAUSE_DISSOLVE_MS = 0;

  if (document.body) {
    document.body.classList.toggle('cards-library-launch', isCardsLaunch);
  }
  if (gameRoot) {
    gameRoot.classList.toggle('from-cards-library', isCardsLaunch);
  }

  function normalizeAudioSourceCandidates(sources) {
    const list = Array.isArray(sources) ? sources : [];
    return Array.from(new Set(
      list
        .map((source) => String(source || '').trim())
        .filter(Boolean)
    ));
  }

  function configureAudioElementFallback(audio, sources) {
    if (!audio) return;
    const candidates = normalizeAudioSourceCandidates(sources);
    if (!candidates.length) return;
    let index = 0;
    const applySource = () => {
      audio.src = candidates[index];
      audio.preload = 'auto';
      if (typeof audio.load === 'function') {
        audio.load();
      }
    };
    const existingHandler = audio.__playtalkFallbackHandler;
    if (typeof existingHandler === 'function') {
      audio.removeEventListener('error', existingHandler);
    }
    const onError = () => {
      if (index >= candidates.length - 1) return;
      index += 1;
      applySource();
    };
    audio.__playtalkFallbackHandler = onError;
    audio.addEventListener('error', onError);
    applySource();
  }

  function createAudioWithFallback(sources) {
    const candidates = normalizeAudioSourceCandidates(sources);
    if (!candidates.length) return null;
    const audio = new Audio();
    configureAudioElementFallback(audio, candidates);
    return audio;
  }

  function configureFeedbackAudioSources() {
    configureAudioElementFallback(errorAudio, ERROR_AUDIO_SOURCES);
  }

  function playLevelCompleteAudioForPhase(completedPhase) {
    if (Number(completedPhase) === 12 || !levelCompleteAudio || isGamePaused) return;
    try {
      levelCompleteAudio.currentTime = 0;
    } catch (error) {
      // ignore
    }
    levelCompleteAudio.play().catch(() => {});
  }

  function playResultsPlusAudio() {
    if (!resultsPlusAudio || isGamePaused) return;
    try {
      resultsPlusAudio.currentTime = 0;
    } catch (error) {
      // ignore
    }
    resultsPlusAudio.play().catch(() => {});
  }

  function normalizeVoiceCharacter(value) {
    return String(value || '').toLowerCase() === 'annie' ? 'annie' : 'harry';
  }

  function readVoiceCharacterPreference() {
    try {
      return normalizeVoiceCharacter(localStorage.getItem(VOICE_CHARACTER_STORAGE_KEY));
    } catch (error) {
      return 'harry';
    }
  }

  function playSuccessAudio() {
    if (!successAudio || isGamePaused || isTypingPhase()) return Promise.resolve(false);
    try {
      successAudio.currentTime = 0;
    } catch (error) {
      // ignore
    }
    const playResult = successAudio.play();
    if (playResult && typeof playResult.then === 'function') {
      return playResult.then(() => true).catch(() => false);
    }
    return Promise.resolve(true);
  }

  function playFeedbackAudio(audio) {
    if (!audio || isGamePaused) return;
    if (audio === successAudio) {
      playSuccessAudio();
      return;
    }
    audio.play().catch(() => {});
  }

  function setControlState(button, enabled, isActive = false) {
    if (!button) return;
    button.classList.toggle('game-control--disabled', !enabled);
    button.classList.toggle('game-control--active', enabled && isActive);
    button.disabled = !enabled;
  }

  function isWatchingPhase(targetPhase = phase) {
    return Number(targetPhase) === 11;
  }

  function isTalkingPhase(targetPhase = phase) {
    return Number(targetPhase) === 12;
  }

  function isTypingPhase(targetPhase = phase) {
    return Number(targetPhase) === 9;
  }

  function formatMode11SpeedLabel() {
    const value = MODE_AUDIO_SPEEDS[mode11SpeedIndex] || 1;
    return `${value.toFixed(2).replace('.', ',')}x`;
  }

  function getCurrentPlaybackRate() {
    return MODE_AUDIO_SPEEDS[mode11SpeedIndex] || 1;
  }

  function getCurrentSpeedIcon() {
    return MODE_AUDIO_SPEED_ICONS[mode11SpeedIndex] || MODE_AUDIO_SPEED_ICONS[2];
  }

  function getCurrentPhaseCoinReward(targetPhase = phase) {
    const value = Number(PHASE_COIN_REWARD[targetPhase]);
    return Number.isFinite(value) && value > 0 ? value : 0;
  }

  function awardPhaseCoins(targetPhase = phase, customAmount = null) {
    const amount = Number.isFinite(Number(customAmount))
      ? Math.max(0, Number(customAmount))
      : getCurrentPhaseCoinReward(targetPhase);
    const playerState = window.playtalkPlayerState;
    if (!amount || !playerState || typeof playerState.addCoins !== 'function') return;
    playerState.addCoins(amount);
  }

  function resetPhaseResultsStats(targetPhase = phase) {
    phaseStartedAt = Date.now();
    phaseListeningsEnglish = 0;
    phaseTypingHits = 0;
    phaseTypingMisses = 0;
    phaseSpeakingSends = 0;
    phasePronunciationSamples = [];
    pendingPhaseCoinAward = 0;
    if (resultsRingProgress) {
      resultsRingProgress.style.transition = 'none';
      resultsRingProgress.style.strokeDashoffset = String(RESULTS_RING_CIRCUMFERENCE);
    }
    clearLiveJourneyStats();
    pulseLiveJourneyStats();
  }

  function registerPhaseListeningEnglish() {
    phaseListeningsEnglish += 1;
    pulseLiveJourneyStats();
  }

  function registerPhaseTypingResult(isCorrect) {
    if (isCorrect) {
      phaseTypingHits += 1;
    } else {
      phaseTypingMisses += 1;
    }
    pulseLiveJourneyStats();
  }

  function registerPhaseSpeakingSend() {
    phaseSpeakingSends += 1;
    pulseLiveJourneyStats();
  }

  function registerPhasePronunciation(percent) {
    const numeric = Number(percent);
    if (!Number.isFinite(numeric)) return;
    phasePronunciationSamples.push(Math.max(0, Math.min(100, numeric)));
    pulseLiveJourneyStats();
  }

  function getPhaseTypingPercent() {
    const total = phaseTypingHits + phaseTypingMisses;
    if (!total) return 0;
    return Math.round((phaseTypingHits / total) * 100);
  }

  function getPhaseElapsedSeconds() {
    if (!Number.isFinite(phaseStartedAt) || phaseStartedAt <= 0) return 0;
    return Math.max(0, (Date.now() - phaseStartedAt) / 1000);
  }

  function formatResultsElapsedTime(elapsedSeconds) {
    const totalSeconds = Math.max(0, Math.round(Number(elapsedSeconds) || 0));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes <= 0) {
      return `${seconds} segundos`;
    }
    if (seconds <= 0) {
      return `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
    }
    return `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'} e ${seconds} segundos`;
  }

  function countEnglishCharacters(text) {
    if (typeof text !== 'string') return 0;
    const normalized = text.replace(/\s+/g, ' ').trim();
    return normalized.length;
  }

  function getPhaseTotalEnglishCharacters(targetPhase = phase) {
    const items = dayPhaseEntries.get(targetPhase);
    if (!Array.isArray(items) || !items.length) return 0;
    return items.reduce((total, entry) => total + countEnglishCharacters(getEntrySentence(entry)), 0);
  }

  function emitJourneyStatsUpdate() {
    window.dispatchEvent(new CustomEvent('playtalk:journey-stats-update'));
  }

  function clearLiveJourneyStats() {
    try {
      localStorage.removeItem(LIVE_STATS_STORAGE_KEY);
    } catch (error) {
      // ignore persistence errors
    }
    emitJourneyStatsUpdate();
  }

  function buildLiveJourneyStats() {
    const typingTotal = phaseTypingHits + phaseTypingMisses;
    const summary = buildCurrentPhaseSummary();
    return {
      level: Number(level) || 1,
      phase: Number(phase) || 1,
      speakingsTotal: Math.max(0, Number(phaseSpeakingSends) || 0),
      listeningsTotal: Math.max(0, Number(phaseListeningsEnglish) || 0),
      pronunciationSum: phasePronunciationSamples.reduce((acc, value) => acc + value, 0),
      pronunciationCount: phasePronunciationSamples.length,
      typingPercentSum: typingTotal > 0 ? getPhaseTypingPercent() : 0,
      typingPercentCount: typingTotal > 0 ? 1 : 0,
      timePlayedMsTotal: Math.round(getPhaseElapsedSeconds() * 1000),
      timeExpectedMsTotal: Number(summary?.expectedMs) || 0,
      coinsEarnedTotal: Math.max(0, Math.floor(pendingPhaseCoinAward)),
      progressPercentSum: Number.isFinite(summary?.progressPercent) ? summary.progressPercent : 0,
      progressPercentCount: Number.isFinite(summary?.progressPercent) ? 1 : 0,
      updatedAt: Date.now()
    };
  }

  function pulseLiveJourneyStats() {
    if (!gameStarted) return;
    const payload = buildLiveJourneyStats();
    try {
      localStorage.setItem(LIVE_STATS_STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      // ignore persistence errors
    }
    emitJourneyStatsUpdate();
  }

  function startLiveStatsPulseLoop() {
    if (liveStatsPulseTimer) {
      window.clearInterval(liveStatsPulseTimer);
      liveStatsPulseTimer = null;
    }
    liveStatsPulseTimer = window.setInterval(() => {
      if (isGamePaused) return;
      pulseLiveJourneyStats();
    }, 1000);
  }

  function stopLiveStatsPulseLoop() {
    if (!liveStatsPulseTimer) return;
    window.clearInterval(liveStatsPulseTimer);
    liveStatsPulseTimer = null;
  }

  function getPhaseTempoMetric(targetPhase = phase) {
    if (Number(targetPhase) === 11) return null;
    const elapsedSeconds = Math.max(getPhaseElapsedSeconds(), 0.001);
    const elapsedLabel = formatResultsElapsedTime(elapsedSeconds);
    const targetCps = Number(PHASE_TEMPO_TARGET_CPS[targetPhase]);
    const totalChars = getPhaseTotalEnglishCharacters(targetPhase);
    if (!Number.isFinite(targetCps) || targetCps <= 0 || totalChars <= 0) {
      return {
        percent: 0,
        value: '0%'
      };
    }
    const actualCps = totalChars / elapsedSeconds;
    const percent = Math.max(0, Math.min(100, Math.round((actualCps / targetCps) * 100)));
    return {
      percent,
      value: percent + '%'
    };
  }

  function getPhaseCoinsPercent(targetPhase = phase) {
    const reward = getCurrentPhaseCoinReward(targetPhase);
    if (!reward) return 0;
    const maxCoins = reward * Math.max(1, getPhaseStepCount(targetPhase));
    if (!maxCoins) return 0;
    return Math.max(0, Math.min(100, Math.round((pendingPhaseCoinAward / maxCoins) * 100)));
  }

  function hideResultsOverlay() {
    if (!resultsScreen) return;
    resultsScreen.classList.add('hidden');
    resultsScreen.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('results-active');
    if (resultsRingProgress) {
      resultsRingProgress.style.transition = 'none';
      resultsRingProgress.style.strokeDashoffset = String(RESULTS_RING_CIRCUMFERENCE);
    }
  }

  function getResultsRingOffset(percent) {
    const clamped = Math.max(0, Math.min(100, Number(percent) || 0));
    return RESULTS_RING_CIRCUMFERENCE - ((RESULTS_RING_CIRCUMFERENCE * clamped) / 100);
  }

  function animateResultsRing(fromPercent, toPercent) {
    if (!resultsRingProgress) return;
    const toOffset = getResultsRingOffset(toPercent);
    resultsRingProgress.style.transition = 'none';
    resultsRingProgress.style.strokeDashoffset = String(toOffset);
  }

  function flashResultsMetricIcon() {
    if (!resultsMetricIcon) return;
    resultsMetricIcon.classList.remove('results-metric-icon--flash');
  }

  function normalizeResultMetric(metric) {
    if (!metric || typeof metric !== 'object') return null;
    const percentRaw = Number(metric.percent);
    const percent = Number.isFinite(percentRaw) ? Math.max(0, Math.min(100, Math.round(percentRaw))) : 0;
    const key = String(metric.key || '').trim();
    if (!key) return null;
    const label = String(metric.label || key).trim();
    const value = metric.value == null ? `${percent}%` : String(metric.value);
    return { key, label, percent, value };
  }

  function sortResultMetricsByPercent(metrics) {
    return (Array.isArray(metrics) ? metrics : [])
      .map(normalizeResultMetric)
      .filter(Boolean)
      .sort((a, b) => a.percent - b.percent);
  }

  function syncResultsAvatarFromPlayer() {
    const player = window.playtalkPlayerState && typeof window.playtalkPlayerState.get === 'function'
      ? window.playtalkPlayerState.get()
      : null;
    const avatar = player && typeof player.avatar === 'string' ? player.avatar.trim() : '';
    const displayAvatar = avatar || DEFAULT_PROFILE_AVATAR;
    if (resultsAvatarImage) {
      resultsAvatarImage.src = displayAvatar;
      resultsAvatarImage.style.display = 'block';
    }
    if (resultsAvatarFallback) {
      resultsAvatarFallback.textContent = '';
      resultsAvatarFallback.style.display = 'none';
    }
  }

  function runResultsMetricSequence(metrics, onDone, options = {}) {
    if (!resultsScreen || !resultsMetricLabel || !resultsMetricValue || !resultsMetricIcon) {
      if (typeof onDone === 'function') onDone();
      return;
    }

    const sortedMetrics = sortResultMetricsByPercent(metrics);
    if (!sortedMetrics.length) {
      if (typeof onDone === 'function') onDone();
      return;
    }

    const waitFor = options && options.waitFor && typeof options.waitFor.then === 'function'
      ? options.waitFor
      : null;
    const resultType = String(options && options.resultType ? options.resultType : 'phase-result');

    syncResultsAvatarFromPlayer();
    resultsScreen.dataset.resultType = resultType;
    resultsScreen.classList.toggle('daily-journey-result', resultType === 'daily-journey-result');
    resultsScreen.classList.remove('hidden');
    resultsScreen.setAttribute('aria-hidden', 'false');
    if (resultsRingProgress) {
      resultsRingProgress.style.transition = 'none';
      resultsRingProgress.style.strokeDashoffset = String(RESULTS_RING_CIRCUMFERENCE);
    }

    let metricIndex = 0;
    let previousMetricPercent = 0;
    let finalized = false;
    let metricsDone = false;
    let waitDone = !waitFor;
    let stepTimer = null;
    let plusAudioTimer = null;

    const finish = () => {
      if (finalized) return;
      finalized = true;
      if (stepTimer) {
        clearTimeout(stepTimer);
        stepTimer = null;
      }
      if (plusAudioTimer) {
        clearTimeout(plusAudioTimer);
        plusAudioTimer = null;
      }
      hideResultsOverlay();
      if (typeof onDone === 'function') onDone();
    };

    const maybeFinish = () => {
      if (!metricsDone || !waitDone) return;
      finish();
    };

    if (waitFor) {
      waitFor
        .catch(() => false)
        .then(() => {
          waitDone = true;
          maybeFinish();
        });
    }

    const showNext = () => {
      if (metricIndex >= sortedMetrics.length) {
        metricsDone = true;
        maybeFinish();
        return;
      }
      const metric = sortedMetrics[metricIndex];
      resultsMetricLabel.textContent = metric.label;
      resultsMetricValue.textContent = metric.value;
      resultsMetricIcon.src = RESULTS_ICON_URLS[metric.key] || '';
      resultsMetricIcon.alt = metric.label;
      flashResultsMetricIcon();
      animateResultsRing(previousMetricPercent, metric.percent);
      if (plusAudioTimer) {
        clearTimeout(plusAudioTimer);
      }
      plusAudioTimer = window.setTimeout(() => {
        playResultsPlusAudio();
        plusAudioTimer = null;
      }, 1000);
      previousMetricPercent = metric.percent;
      metricIndex += 1;
      stepTimer = window.setTimeout(showNext, RESULTS_STEP_MS);
    };

    showNext();
  }

  function buildDailyJourneyResultMetrics(stats, finalElapsedMs = 0) {
    const safeStats = stats && typeof stats === 'object' ? stats : createEmptyJourneyStats();
    const aspectMetrics = safeStats.aspectMetrics && typeof safeStats.aspectMetrics === 'object'
      ? safeStats.aspectMetrics
      : {};
    const getAveragePercent = (key) => {
      const bucket = aspectMetrics[key] || {};
      const sum = Number(bucket.sum);
      const count = Number(bucket.count);
      if (!Number.isFinite(sum) || !Number.isFinite(count) || count <= 0) return 0;
      return Math.max(0, Math.min(100, Math.round(sum / count)));
    };

    const pronunciationPercent = getAveragePercent('pronunciation');
    const listeningPercent = getAveragePercent('listens');
    const tempoPercent = getAveragePercent('tempo');
    const typingPercent = getAveragePercent('typing');
    const speakingPercent = getAveragePercent('speakings');
    const coinsPercent = getAveragePercent('coins');
    const coinsTotal = Math.max(0, Math.round(Number(safeStats.coinsEarnedTotal) || 0));
    const _totalTimeMs = Math.max(0, Number(finalElapsedMs) || Number(safeStats.timePlayedMsTotal) || 0);

    return [
      { key: 'pronunciation', label: 'PronÃƒÂºncia', percent: pronunciationPercent, value: `${pronunciationPercent}%` },
      { key: 'listens', label: 'Listening', percent: listeningPercent, value: `${listeningPercent}%` },
      { key: 'tempo', label: 'Tempo', percent: tempoPercent, value: `${tempoPercent}%` },
      { key: 'typing', label: 'Typing', percent: typingPercent, value: `${typingPercent}%` },
      { key: 'speakings', label: 'Speaking', percent: speakingPercent, value: `${speakingPercent}%` },
      { key: 'coins', label: 'Moedas', percent: coinsPercent, value: `${coinsTotal}` }
    ];
  }

  function showPhaseResults(onDone) {
    if (!resultsScreen || !resultsMetricLabel || !resultsMetricValue || !resultsMetricIcon) {
      onDone();
      return;
    }

    hidePhaseElements();
    clearBoard();
    showText('');
    if (choiceRow) choiceRow.innerHTML = '';
    document.body.classList.add('results-active');

    const phaseSummary = buildCurrentPhaseSummary();
    const pronunciationAverage = phaseSummary.pronunciationAverage;
    const tempoMetric = phaseSummary.tempoMetric;
    const phaseMetrics = sortResultMetricsByPercent([
      pronunciationAverage == null ? null : {
        key: 'pronunciation',
        label: 'PronÃƒÂºncia',
        percent: Math.round(pronunciationAverage),
        value: `${Math.round(pronunciationAverage)}%`
      },
      phaseSummary.listensPercent != null ? {
        key: 'listens',
        label: 'Listening',
        percent: phaseSummary.listensPercent,
        value: `${phaseSummary.listensCount}`
      } : null,
      tempoMetric ? {
        key: 'tempo',
        label: 'Tempo',
        percent: tempoMetric.percent,
        value: tempoMetric.value
      } : null,
      phaseSummary.typingPercent != null ? {
        key: 'typing',
        label: 'Typing',
        percent: phaseSummary.typingPercent,
        value: `${phaseSummary.typingPercent}%`
      } : null,
      phaseSummary.speakingsPercent != null ? {
        key: 'speakings',
        label: 'Speaking',
        percent: phaseSummary.speakingsPercent,
        value: `${phaseSummary.speakingsCount}`
      } : null,
      {
        key: 'coins',
        label: 'Moedas',
        percent: phaseSummary.coinsPercent,
        value: `${phaseSummary.coinsEarned}`
      }
    ]);

    recordPhaseJourneyStats(phaseSummary);

    if (!phaseMetrics.length) {
      onDone();
      return;
    }

    runResultsMetricSequence(phaseMetrics, onDone, {
      resultType: 'phase-result'
    });
  }

  async function showDailyJourneyResult(completedLevel, finalElapsedMs = 0) {
    hidePhaseElements();
    clearBoard();
    showText('');
    if (choiceRow) choiceRow.innerHTML = '';
    document.body.classList.add('results-active');
    if (finalOverlay) {
      finalOverlay.classList.remove('active');
      finalOverlay.setAttribute('aria-hidden', 'true');
    }

    const stats = journeyRunStats || createEmptyJourneyStats();
    const dailyMetrics = buildDailyJourneyResultMetrics(stats, finalElapsedMs);

    await loadAudioLevelsConfig();
    const postGameAudioName = getPostGameAudioName(completedLevel);
    const postGameAudio = postGameAudioName ? await getAudioElementFromName(postGameAudioName) : null;
    const waitForAudio = postGameAudio
      ? playAudioElement(postGameAudio).catch(() => false)
      : Promise.resolve(true);

    runResultsMetricSequence(
      dailyMetrics,
      () => {
        if (postGameAudio) {
          fadeOutAndStopAudio(postGameAudio, { durationMs: 0, resetVolume: isAudioMuted ? 0 : 1 }).catch(() => {});
        }
        const resolvedCompletedLevel = Number.isFinite(completedLevel) && completedLevel > 0 ? completedLevel : level;
        const nextLevel = resolvedCompletedLevel + 1;
        clearNextLevelUnlockAt();
        saveCompletionStorage({
          completedLevel: resolvedCompletedLevel,
          nextLevel,
          completedAt: Date.now()
        });
        completedLevelSnapshot = resolvedCompletedLevel;
        clearProgressStorage();
        hideResultsOverlay();
        document.body.classList.remove('results-active');
        if (progressCompleteOverlay) progressCompleteOverlay.setAttribute('aria-hidden', 'true');
        if (finalOverlay) {
          finalOverlay.classList.remove('active');
          finalOverlay.setAttribute('aria-hidden', 'true');
        }
        setGameStartedState(false);
        clearJourneyStarted();
        clearGameContext();
        window.dispatchEvent(new CustomEvent('playtalk:return-home'));
      },
      {
        waitFor: waitForAudio,
        resultType: 'daily-journey-result'
      }
    );
  }

  function formatMode12LanguageLabel() {
    return mode12SpeechMode === 'portuguese' ? 'PT' : 'EN';
  }

  function formatMode12SubtitleLabel() {
    if (mode12SubtitleMode === 'portuguese') return 'PT';
    if (mode12SubtitleMode === 'none') return 'OFF';
    return 'EN';
  }

  function getMode12LanguageIcon() {
    return mode12SpeechMode === 'portuguese' ? MODE11_PORTUGUESE_ICON : MODE11_ENGLISH_ICON;
  }

  function formatMode11SubtitleLabel() {
    if (mode11SubtitleMode === 'portuguese') return 'PT';
    if (mode11SubtitleMode === 'none') return 'OFF';
    return 'EN';
  }

  function getMode12RecognitionLanguage() {
    return mode12SpeechMode === 'portuguese' ? 'pt-BR' : 'en-US';
  }

  function createControlButton({ id, icon, ariaLabel, extraClass = '' }) {
    const button = document.createElement('button');
    button.className = ['game-control', 'game-control--active', extraClass].filter(Boolean).join(' ');
    button.id = id;
    button.type = 'button';
    button.setAttribute('aria-label', ariaLabel);
    const img = document.createElement('img');
    img.src = icon;
    img.alt = '';
    img.setAttribute('aria-hidden', 'true');
    if (id === 'game-mic-btn') {
      img.classList.add('game-control__mic-icon');
      img.src = MIC_ICON_OFF;
    }
    button.appendChild(img);
    return button;
  }

  function updateMode11VoiceButtonIcon() {
    if (!voiceButton) return;
    voiceButton.innerHTML = '';
    if (mode11VoiceMode === 'both') {
      const stack = document.createElement('span');
      stack.className = 'game-control__dual-lang';

      const pt = document.createElement('img');
      pt.src = MODE11_PORTUGUESE_ICON;
      pt.alt = '';
      pt.setAttribute('aria-hidden', 'true');
      pt.className = 'game-control__dual-lang-icon game-control__dual-lang-icon--pt';

      const en = document.createElement('img');
      en.src = MODE11_ENGLISH_ICON;
      en.alt = '';
      en.setAttribute('aria-hidden', 'true');
      en.className = 'game-control__dual-lang-icon game-control__dual-lang-icon--en';

      stack.appendChild(pt);
      stack.appendChild(en);
      voiceButton.appendChild(stack);
      return;
    }

    const img = document.createElement('img');
    img.src = mode11VoiceMode === 'portuguese' ? MODE11_PORTUGUESE_ICON : MODE11_ENGLISH_ICON;
    img.alt = '';
    img.setAttribute('aria-hidden', 'true');
    voiceButton.appendChild(img);
  }

  function updateMode12LanguageButtonIcon() {
    if (!languageButton) return;
    const img = languageButton.querySelector('img');
    if (!img) return;
    img.src = getMode12LanguageIcon();
  }

  function updateSpeedButtonIcon() {
    if (!speedButton) return;
    const img = speedButton.querySelector('img');
    if (!img) return;
    img.src = getCurrentSpeedIcon();
  }

  function applyControlBadge(button, text = '') {
    if (!button) return;
    const value = String(text || '').trim();
    if (!value) {
      button.removeAttribute('data-control-badge');
      return;
    }
    button.setAttribute('data-control-badge', value);
  }

  function renderGameControlsForPhase(targetPhase = phase) {
    const statusBottom = document.querySelector('.game-status--bottom');
    if (!statusBottom) return;
    if (!controlsRoot) {
      controlsRoot = document.createElement('div');
      controlsRoot.className = 'game-controls';
      controlsRoot.setAttribute('aria-label', 'Controles do jogo');
      statusBottom.appendChild(controlsRoot);
    }
    controlsRoot.innerHTML = '';
    const controls = [];
    if (isWatchingPhase(targetPhase)) {
      controls.push(createControlButton({ id: 'game-back-btn', icon: BACK_ICON, ariaLabel: 'Voltar para o item anterior' }));
      controls.push(createControlButton({ id: 'game-subtitle-btn', icon: SUBTITLE_ICON, ariaLabel: 'Alternar legenda' }));
      controls.push(createControlButton({ id: 'game-voice-btn', icon: MODE11_ENGLISH_ICON, ariaLabel: 'Alternar voz do audio' }));
      controls.push(createControlButton({ id: 'game-speed-btn', icon: getCurrentSpeedIcon(), ariaLabel: 'Alterar velocidade do audio' }));
      controls.push(createControlButton({ id: 'game-pause-btn', icon: 'SVG/codex-icons/pausa.svg', ariaLabel: 'Pausar ou continuar jogo' }));
    } else if (isTalkingPhase(targetPhase)) {
      controls.push(createControlButton({ id: 'game-subtitle-btn', icon: SUBTITLE_ICON, ariaLabel: 'Alternar legenda da fala' }));
      controls.push(createControlButton({ id: 'game-back-btn', icon: BACK_ICON, ariaLabel: 'Voltar para a fala anterior' }));
      controls.push(createControlButton({ id: 'game-pause-btn', icon: 'SVG/codex-icons/home.svg', ariaLabel: 'Abrir pausa do jogo', extraClass: 'game-control--primary' }));
      controls.push(createControlButton({ id: 'game-speed-btn', icon: getCurrentSpeedIcon(), ariaLabel: 'Alterar velocidade do audio' }));
      controls.push(createControlButton({ id: 'game-language-btn', icon: getMode12LanguageIcon(), ariaLabel: 'Alternar idioma do audio e do microfone' }));
    } else {
      controls.push(createControlButton({ id: 'game-narrator-btn', icon: getVoiceCharacterIcon(), ariaLabel: 'Trocar voz do narrador', extraClass: 'game-control--character' }));
      controls.push(createControlButton({ id: 'game-pause-btn', icon: 'SVG/codex-icons/pause.svg', ariaLabel: 'Pausar ou continuar jogo' }));
      controls.push(createControlButton({ id: 'game-mic-btn', icon: MIC_ICON_OFF, ariaLabel: 'Ativar ou desativar microfone', extraClass: 'game-control--primary' }));
      controls.push(createControlButton({ id: 'game-speed-btn', icon: getCurrentSpeedIcon(), ariaLabel: 'Alterar velocidade do audio' }));
      controls.push(createControlButton({ id: 'game-volume-btn', icon: MUSIC_ICON, ariaLabel: 'Ativar ou desativar volume' }));
    }
    controls.forEach(button => controlsRoot.appendChild(button));
    narratorButton = document.getElementById('game-narrator-btn');
    pauseButton = document.getElementById('game-pause-btn');
    micButton = document.getElementById('game-mic-btn');
    volumeButton = document.getElementById('game-volume-btn');
    backButton = document.getElementById('game-back-btn');
    nextButton = document.getElementById('game-next-btn');
    voiceButton = document.getElementById('game-voice-btn');
    speedButton = document.getElementById('game-speed-btn');
    subtitleButton = document.getElementById('game-subtitle-btn');
    languageButton = document.getElementById('game-language-btn');
  }
  function updateControlButtons() {
    const watching = isWatchingPhase();
    const talking = isTalkingPhase();
    setControlState(narratorButton, isCharacterVoicePhase(), false);
    setControlState(pauseButton, true, isGamePaused);
    setControlState(volumeButton, true, !isAudioMuted);
    setControlState(micButton, true, micPersistentEnabled);
    setControlState(backButton, watching || talking, false);
    setControlState(nextButton, talking, false);
    setControlState(voiceButton, watching, false);
    setControlState(speedButton, true, false);
    setControlState(subtitleButton, watching || talking, false);
    setControlState(languageButton, talking, false);
    applyControlBadge(voiceButton, '');
    applyControlBadge(speedButton, '');
    applyControlBadge(subtitleButton, watching ? formatMode11SubtitleLabel() : (talking ? formatMode12SubtitleLabel() : ''));
    applyControlBadge(languageButton, talking ? formatMode12LanguageLabel() : '');
    if (watching) {
      updateMode11VoiceButtonIcon();
    }
    if (speedButton) {
      updateSpeedButtonIcon();
    }
    if (talking) {
      updateMode12LanguageButtonIcon();
    }
    if (micButton) {
      micButton.classList.toggle('game-control--mic-on', micPersistentEnabled);
      micButton.classList.toggle('game-control--mic-continuous', micContinuousMode);
      micButton.setAttribute('aria-pressed', micPersistentEnabled ? 'true' : 'false');
      const micIcon = micButton.querySelector('.game-control__mic-icon');
      if (micIcon) {
        micIcon.setAttribute('src', micPersistentEnabled ? MIC_ICON_ON : MIC_ICON_OFF);
      }
    }
    if (pauseButton) {
      pauseButton.setAttribute('aria-pressed', isGamePaused ? 'true' : 'false');
    }
    updateNarratorButtonIcon();
    if (volumeButton) {
      volumeButton.setAttribute('aria-pressed', isAudioMuted ? 'false' : 'true');
    }
    if (gameRoot) {
      gameRoot.classList.toggle('game-paused', isGamePaused);
    }
  }
  function setMicControlEnabled(enabled) {
    micControlEnabled = Boolean(enabled);
    if (!micControlEnabled) {
      micControlActive = false;
      currentMicAction = null;
    }
    updateControlButtons();
  }

  function setMicControlAction(action) {
    currentMicAction = typeof action === 'function' ? action : null;
    setMicControlEnabled(Boolean(currentMicAction));
    if (!currentMicAction) {
      clearMicAutoStartTimer();
      return;
    }
    scheduleMicAutoStart();
  }

  function setMicControlActive(active) {
    micControlActive = Boolean(active) && micControlEnabled && micPersistentEnabled;
    updateControlButtons();
  }

  function setMicContinuousMode(enabled) {
    micContinuousMode = Boolean(enabled);
    if (micContinuousMode) {
      primeMicrophonePermission();
      scheduleMicAutoStart();
    } else {
      clearMicAutoStartTimer();
      setMicControlActive(false);
    }
    updateControlButtons();
  }

  function setMicPersistentEnabled(enabled, options = {}) {
    const { force = false } = options;
    if (!force && !enabled && micContinuousMode) {
      updateControlButtons();
      return;
    }
    micPersistentEnabled = Boolean(enabled);
    if (!micPersistentEnabled) {
      clearMicAutoStartTimer();
      setMicControlActive(false);
      if (recognition && typeof recognition.stop === 'function') {
        try {
          recognition.stop();
        } catch (error) {
          // ignore
        }
      }
    } else {
      primeMicrophonePermission();
      scheduleMicAutoStart();
    }
    updateControlButtons();
  }

  function getAudiosToPause() {
    const audios = [];
    const seen = new Set();
    const register = (audio) => {
      if (!audio || seen.has(audio)) return;
      seen.add(audio);
      audios.push(audio);
    };

    register(successAudio);
    register(errorAudio);
    register(conclusionAudio);
    register(levelCompleteAudio);
    register(resultsPlusAudio);
    register(micAudio);
    audioElementCache.forEach((audio) => register(audio));
    if (activeAudioSource) register(activeAudioSource);
    document.querySelectorAll('audio').forEach((audio) => register(audio));

    return audios;
  }

  function isGlobalRadioAudio(audio) {
    return Boolean(audio && audio.__playtalkGlobalRadio === true);
  }

  function pauseAllGameAudio() {
    pausedAudioState = [];
    getAudiosToPause().forEach((audio) => {
      if (isGlobalRadioAudio(audio)) return;
      if (!audio || audio.paused || audio.ended) return;
      pausedAudioState.push(audio);
      audio.pause();
    });
    if (window.speechSynthesis) {
      wasSpeechSynthesisSpeaking = window.speechSynthesis.speaking;
      if (wasSpeechSynthesisSpeaking) {
        try {
          window.speechSynthesis.pause();
        } catch (error) {
          // ignore
        }
      }
    }
  }

  function resumePausedGameAudio() {
    const audiosToResume = pausedAudioState.slice();
    pausedAudioState = [];
    audiosToResume.forEach((audio) => {
      if (!audio) return;
      audio.play().catch(() => {});
    });
    if (wasSpeechSynthesisSpeaking && window.speechSynthesis) {
      try {
        window.speechSynthesis.resume();
      } catch (error) {
        // ignore
      }
    }
    wasSpeechSynthesisSpeaking = false;
  }

  function setGamePaused(nextPaused) {
    const pauseNow = Boolean(nextPaused);
    if (pauseNow === isGamePaused) {
      syncGameRuntimeState();
      if (!pauseNow) schedulePlayerIdleAutoPause();
      return;
    }
    isGamePaused = pauseNow;
    if (pauseOverlayTimer) {
      window.clearTimeout(pauseOverlayTimer);
      pauseOverlayTimer = null;
    }
    if (isGamePaused) {
      clearPlayerIdleAutoPause();
      stopLiveStatsPulseLoop();
      gameRoot.classList.add('pause-dissolving');
      gameRoot.classList.remove('pause-dissolved');
      pauseLevelTimer();
      stopMicPromptLoop();
      if (recognition && typeof recognition.stop === 'function') {
        try {
          recognition.stop();
        } catch (error) {
          // ignore
        }
      }
      setMicControlActive(false);
      pauseAllGameAudio();
      pauseOverlayTimer = window.setTimeout(() => {
        if (!isGamePaused) return;
        gameRoot.classList.add('pause-dissolved');
        showPlayingOverlay();
      }, PAUSE_DISSOLVE_MS);
    } else {
      gameRoot.classList.remove('pause-dissolving');
      gameRoot.classList.remove('pause-dissolved');
      startLiveStatsPulseLoop();
      if (gameStarted) {
        resumePausedLevelTimer();
      }
      resumePausedGameAudio();
      hidePlayingOverlay();
      if (pendingAdvanceCycle) {
        pendingAdvanceCycle = false;
        advanceCycle();
      }
      registerPlayerActivity({ force: true });
    }
    syncGameRuntimeState();
    updateControlButtons();
  }

  function togglePause() {
    if (isGamePaused) {
      setGamePaused(false);
      return;
    }
    setGamePaused(true);
  }

  function openPlayingPauseMenu() {
    setGamePaused(true);
  }

  function toggleVolume() {
    isAudioMuted = !isAudioMuted;
    if (window.playtalkGlobalRadio && typeof window.playtalkGlobalRadio.setMuted === 'function') {
      window.playtalkGlobalRadio.setMuted(isAudioMuted);
    }
    updateControlButtons();
  }

  function syncGlobalRadioMuteState() {
    const radioApi = window.playtalkGlobalRadio;
    if (!radioApi || typeof radioApi.getState !== 'function') return;
    const state = radioApi.getState();
    if (!state) return;
    isAudioMuted = Boolean(state.muted);
    updateControlButtons();
  }

  let dayPhaseEntries = new Map();
  let dayPhaseMeta = new Map();
  let customPhaseOverrides = new Map();
  let dayPhaseSequence = [];
  let baseDayPhaseSequence = [];
  let hasCustomJourneySequence = false;
  let journeyPhaseIndex = 0;
  let dayEntries = [];
  let level = 1;
  let phase = 1;
  let pool = [];
  let cycle = [];
  let index = 0; // posiÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o atual no ciclo
  let score = 0; // progresso / acertos
  let currentItem = null;
  let completionGridShown = false;
  let phaseFourBatchStart = 0;
  let phaseFourBatch = [];
  let phaseFourExpectedIndex = 0;
  let phaseFourResolved = 0;
  let phaseFourAudioPlaying = false;
  let audioLevelsConfig = null;
  let audioLevelsPromise = null;
  let localLevelFilesManifest = null;
  let localLevelFilesManifestPromise = null;
  const resolvedAudioCache = new Map();
  let writingState = null;
  let writingCleanup = null;
  let writingColorTimer = null;
  let typingTapFlashTimer = null;
  let returnToHomeAfterSinglePhase = false;
  let isGamePaused = false;
  let isAudioMuted = false;
  let micControlEnabled = false;
  let micControlActive = false;
  let micPersistentEnabled = false;
  let micContinuousMode = false;
  let micAutoStartTimer = null;
  let currentMicAction = null;
  let pendingAdvanceCycle = false;
  let openPauseOnResume = false;
  let pauseOverlayTimer = null;
  let playingOverlayHideTimer = null;
  let playerIdleAutoPauseTimer = null;
  let lastPlayerActivityAt = Date.now();
  let phaseStartInProgress = false;
  let phaseCompleteInProgress = false;
  let activeAudioSource = null;
  let pausedAudioState = [];
  let wasSpeechSynthesisSpeaking = false;
  let pendingPhaseCoinAward = 0;
  let phaseStartedAt = 0;
  let phaseListeningsEnglish = 0;
  let phaseTypingHits = 0;
  let phaseTypingMisses = 0;
  let phaseSpeakingSends = 0;
  let phasePronunciationSamples = [];
  let liveStatsPulseTimer = null;
  let playingInstructionAudio = null;
  let pauseStatusSyncTimer = null;
  let dynamicBarOriginalParent = null;
  let dynamicBarOriginalNextSibling = null;
  let pausePromptStartMode = false;
  const pauseInstructionAudioCache = new Map();
  const levelCompleteAudio = createAudioWithFallback(LEVEL_COMPLETE_AUDIO_SOURCES);
  const resultsPlusAudio = createAudioWithFallback(RESULTS_PLUS_AUDIO_SOURCES);

  let awaiting = false;
  let recognition = null;
  let micPermissionPromise = null;
  let loadPromise = null;
  let writingPoolsPromise = null;
  let writingPools = null;
  let levelCache = new Map();
  let adminLevelJsonFilesPromise = null;
  let mode11VoiceMode = 'both';
  let mode11SpeedIndex = 2;
  let mode11SubtitleMode = 'english';
  let mode11BackAction = null;
  let mode12SpeechMode = 'english';
  let mode12SubtitleMode = 'english';
  let mode12SelectedCharacterId = '';
  let mode12CharacterMap = new Map();
  let mode12BackAction = null;
  let mode12AdvanceAction = null;
  let mode12CurrentNeedsUserLine = false;
  let mode12HeartsTitleEl = null;
  let mode12SubtitleFadeTimer = null;
  let mode12HeartsHintTimer = null;
  let mode12HeartsHintFadeTimer = null;
  let selectedVoiceCharacter = readVoiceCharacterPreference();
  let playLaunchRevealSent = false;

  function isCharacterVoicePhase(targetPhase = phase) {
    const numeric = Number(targetPhase);
    return numeric >= 1 && numeric <= 10;
  }

  function getVoiceCharacterIcon() {
    return selectedVoiceCharacter === 'annie' ? ANNIE_VOICE_ICON : HARRY_VOICE_ICON;
  }

  function getVoiceCharacterLabel() {
    return selectedVoiceCharacter === 'annie' ? 'Annie' : 'Harry';
  }

  function applyVoiceCharacterToAudioUrl(url) {
    const source = String(url || '');
    if (!source || !isCharacterVoicePhase()) return source;
    if (selectedVoiceCharacter === 'annie') {
      return source.replace(/\/audios\//i, '/audios2/');
    }
    return source.replace(/\/audios2\//i, '/audios/');
  }

  function updateNarratorButtonIcon() {
    if (!narratorButton) return;
    const label = getVoiceCharacterLabel();
    narratorButton.setAttribute('aria-label', `Trocar voz do narrador (atual: ${label})`);
    narratorButton.setAttribute('aria-pressed', selectedVoiceCharacter === 'annie' ? 'true' : 'false');
    const img = narratorButton.querySelector('img');
    if (!img) return;
    img.src = getVoiceCharacterIcon();
    img.alt = `Voz ${label}`;
  }

  function toggleVoiceCharacter() {
    selectedVoiceCharacter = selectedVoiceCharacter === 'annie' ? 'harry' : 'annie';
    try {
      localStorage.setItem(VOICE_CHARACTER_STORAGE_KEY, selectedVoiceCharacter);
    } catch (error) {
      // ignore persistence errors
    }
    updateControlButtons();
  }

  function notifyPlayLaunchReady() {
    if (playLaunchRevealSent) return;
    playLaunchRevealSent = true;
    window.dispatchEvent(new CustomEvent('playtalk:play-launch-ready'));
  }
  let phaseNarrationToken = 0;
  let rotationTimer = null;
  let rotationIndex = 0;
  let finalStatsRotationTimer = null;
  let finalStatsRotationIndex = 0;
  let gameStarted = false;
  let errorStreak = 0;
  let attemptCount = 0;
  let correctStreak = 0;
  let sessionMemoryHistory = [];
  let totalErrors = 0;
  let currentMedalKey = 'diamante';
  let heartsRemaining = MEDAL_HEARTS.diamante;
  let completedLevelSnapshot = null;
  let levelStartTime = 0;
  let levelElapsedBase = 0;
  let mirrorGroups = [];
  let pronunciationSamples = [];
  let micPromptTimer = null;
  let phaseEightTimeout = null;
  let levelUnlockTimer = null;
  const ROTATION_FADE_MS = 400;
  const FINAL_SLIDESHOW_INTERVAL_MS = 2000;
  const SUPPORTED_ENTRY_AUDIO_EXTENSIONS = ['.mp3', '.wav', '.opus', '.ogg', '.webm'];
  const audioElementCache = new Map();
  const sessionSeenImageSet = new Set();
  let sessionSeenImages = [];
  let finalSlideshowTimer = null;
  let finalSlideshowIndex = 0;
  const FINAL_ADVANCE_DELAY_MS = 1500;
  let journeyRunStats = null;

  function syncGameRuntimeState() {
    const state = gameStarted && !isGamePaused ? 'game-in-progress' : 'game-paused';
    if (gameRoot && typeof gameRoot.setAttribute === 'function') {
      gameRoot.setAttribute('data-game-state', state);
    }
    if (gameRuntimeState) {
      gameRuntimeState.dataset.gameState = state;
      gameRuntimeState.textContent = state;
    }
  }

  function isAutoPauseEligible() {
    if (!gameStarted || isGamePaused) return false;
    if (isWatchingPhase() || isTalkingPhase()) return false;
    if (document.body && document.body.classList.contains('pause-menu-active')) return false;
    if (preGameScreen && !preGameScreen.classList.contains('hidden')) return false;
    if (resultsScreen && !resultsScreen.classList.contains('hidden')) return false;
    if (levelComplete && !levelComplete.classList.contains('hidden')) return false;
    if (startScreen && !startScreen.classList.contains('hidden')) return false;
    return true;
  }

  function clearPlayerIdleAutoPause() {
    if (!playerIdleAutoPauseTimer) return;
    window.clearTimeout(playerIdleAutoPauseTimer);
    playerIdleAutoPauseTimer = null;
  }

  function schedulePlayerIdleAutoPause() {
    clearPlayerIdleAutoPause();
    if (!isAutoPauseEligible()) return;
    playerIdleAutoPauseTimer = window.setTimeout(() => {
      if (!isAutoPauseEligible()) return;
      const idleMs = Date.now() - lastPlayerActivityAt;
      if (idleMs >= PLAYER_IDLE_AUTO_PAUSE_MS) {
        setGamePaused(true);
        return;
      }
      schedulePlayerIdleAutoPause();
    }, PLAYER_IDLE_AUTO_PAUSE_MS);
  }

  function registerPlayerActivity(options = {}) {
    const force = Boolean(options && options.force);
    lastPlayerActivityAt = Date.now();
    if (force || isAutoPauseEligible()) {
      schedulePlayerIdleAutoPause();
    }
  }

  function setGameStartedState(nextStarted) {
    gameStarted = Boolean(nextStarted);
    if (gameStarted && !isGamePaused) {
      registerPlayerActivity({ force: true });
    } else {
      clearPlayerIdleAutoPause();
    }
    syncGameRuntimeState();
  }

  const TENSE_STYLES = {
    '': {
      ring: 'conic-gradient(#8dc9ff, #8dc9ff)'
    },
    'present-simple': {
      ring: 'conic-gradient(#8dc9ff, #8dc9ff)'
    },
    'present-continuous': {
      ring: 'conic-gradient(#8dc9ff, #cfeaff, #8dc9ff)',
      animation: 'spin 3s linear infinite'
    },
    'present-perfect': {
      ring: 'conic-gradient(#8dc9ff, #c2b15a, #f2c14f, #8dc9ff)'
    },
    'present-perfect-continuous': {
      ring: 'conic-gradient(#8dc9ff, #cfeaff, #f78c1f, #8dc9ff)',
      animation: 'spin 1s linear infinite'
    },
    'past-simple': {
      ring: 'conic-gradient(#8d939e, #8d939e)',
      filter: 'drop-shadow(0 10px 16px rgba(0, 0, 0, 0.25)) grayscale(1)'
    },
    'past-continuous': {
      ring: 'conic-gradient(#8d939e, #1b1b1b, #8d939e)',
      animation: 'spin 3s linear infinite',
      filter: 'drop-shadow(0 10px 16px rgba(0, 0, 0, 0.25)) grayscale(1)'
    },
    'past-perfect': {
      ring: 'conic-gradient(#8d939e, #1b1b1b, #f2c14f, #8d939e)',
      filter: 'drop-shadow(0 10px 16px rgba(0, 0, 0, 0.25)) grayscale(1)'
    },
    'past-perfect-continuous': {
      ring: 'conic-gradient(#8d939e, #6f7480, #f78c1f, #8d939e)',
      animation: 'spin 1s linear infinite',
      filter: 'drop-shadow(0 10px 16px rgba(0, 0, 0, 0.25)) grayscale(1)'
    },
    'future-simple': {
      ring: 'conic-gradient(#172c6b, #172c6b)'
    },
    'future-continuous': {
      ring: 'conic-gradient(#172c6b, #0a0a0a, #172c6b)',
      animation: 'spin 3s linear infinite'
    },
    'future-perfect': {
      ring: 'conic-gradient(#172c6b, #0a0a0a, #f2c14f, #172c6b)'
    },
    'future-perfect-continuous': {
      ring: 'conic-gradient(#172c6b, #0a0a0a, #f78c1f, #172c6b)',
      animation: 'spin 1s linear infinite'
    },
    'going-to-future': {
      ring: 'conic-gradient(#172c6b, #172c6b)'
    },
    'present-continuous-future': {
      ring: 'conic-gradient(#172c6b, #172c6b)'
    },
    'present-simple-future': {
      ring: 'conic-gradient(#172c6b, #172c6b)'
    },
    'conditional-would': {
      lens: 'linear-gradient(40deg, rgba(90, 150, 255, 0.75) 0%, rgba(90, 150, 255, 0) 60%)'
    }
  };
  const SENTENCE_FORM_STYLES = {
    affirmative: {
      lens: 'none'
    },
    negative: {
      lens: 'linear-gradient(to top, rgba(255, 77, 79, 0.75) 0%, rgba(255, 77, 79, 0) 60%)'
    },
    question: {
      lens: 'linear-gradient(to top, rgba(246, 178, 94, 0.75) 0%, rgba(246, 178, 94, 0) 60%)'
    },
    imperative: {
      lens: 'linear-gradient(to top, rgba(246, 196, 83, 0.75) 0%, rgba(246, 196, 83, 0) 60%)'
    }
  };

  function normalizeImageEntry(entry) {
    if (!entry || typeof entry !== 'object') return null;

    const file = entry.file || entry.imagem || entry.targetImage || entry.image || '';
    const en = entry.en || entry.english || entry.nomeIngles || entry.targetSentence || entry.sentence || '';
    const pt = entry.pt || entry.portuguese || entry.nomePortugues || entry.frase || '';
    const audio = typeof entry.audio === 'string'
      ? entry.audio
      : (typeof entry.targetAudioMp3 === 'string' ? entry.targetAudioMp3 : '');
    const audioPortuguese = typeof entry.audio_portuguese === 'string' ? entry.audio_portuguese : '';
    const audioEnglish = typeof entry.audio_english === 'string' ? entry.audio_english : '';

    return {
      ...entry,
      file,
      en,
      pt: pt || entry.pt || '',
      audio,
      audio_portuguese: audioPortuguese,
      audio_english: audioEnglish
    };
  }

  function getEntrySentence(entry) {
    if (!entry || typeof entry !== 'object') return '';
    return String(
      entry.targetSentence
        || entry.english
        || entry.sentence
        || entry.frase
        || entry.en
        || entry.nomeIngles
        || ''
    ).trim();
  }

  function getEntryPortugueseSentence(entry) {
    if (!entry || typeof entry !== 'object') return '';
    return String(
      entry.pt
        || entry.portuguese
        || entry.nomePortugues
        || entry.frase
        || ''
    ).trim();
  }

  function getEntryImageName(entry) {
    if (!entry || typeof entry !== 'object') return '';
    return String(entry.targetImage || entry.image || entry.imagem || entry.file || '').trim();
  }

  function getEntryAudioName(entry) {
    if (!entry || typeof entry !== 'object') return '';
    return String(entry.targetAudioMp3 || entry.audioMp3 || entry.audio || '').trim();
  }

  function getEntryAudioNameByMode(entry, mode = 'english') {
    if (!entry || typeof entry !== 'object') return '';
    if (mode === 'portuguese') {
      return String(entry.audio_portuguese || '').trim();
    }
    return String(entry.audio_english || getEntryAudioName(entry)).trim();
  }

  function hasSupportedAudioExtension(fileName = '') {
    const lower = fileName.toLowerCase();
    return SUPPORTED_ENTRY_AUDIO_EXTENSIONS.some(ext => lower.endsWith(ext));
  }

  function extractAssetFileName(assetName = '') {
    const trimmed = typeof assetName === 'string' ? assetName.trim() : '';
    if (!trimmed) return '';
    const normalized = trimmed.replace(/\\/g, '/').replace(/^\/+/, '');
    const segments = normalized.split('/').filter(Boolean);
    return segments.length ? segments[segments.length - 1] : '';
  }

  function buildPublicLevelAssetUrl(assetName = '', dayNumber = level, phaseNumber = phase) {
    const trimmed = typeof assetName === 'string' ? assetName.trim() : '';
    if (!trimmed) return '';
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    const fileName = extractAssetFileName(trimmed);
    if (!fileName) return '';
    const dayFolder = String(Math.max(1, Number.parseInt(dayNumber, 10) || 1)).padStart(3, '0');
    const phaseFolder = getPhaseFolderCode(Number.parseInt(phaseNumber, 10) || 1);
    return `${PUBLIC_LEVEL_ASSET_BASE_URL}/${dayFolder}/${phaseFolder}/${encodeURIComponent(fileName)}`;
  }

  function buildAudioSrcFromName(audioName = '', dayNumber = level, phaseNumber = phase) {
    const trimmed = typeof audioName === 'string' ? audioName.trim() : '';
    if (!trimmed || !hasSupportedAudioExtension(trimmed)) return '';
    if (/^https?:\/\//i.test(trimmed)) return applyVoiceCharacterToAudioUrl(trimmed);
    return applyVoiceCharacterToAudioUrl(buildPublicLevelAssetUrl(trimmed, dayNumber, phaseNumber));
  }

  function buildAudioSrc(entry) {
    const audioName = typeof entry?.audio === 'string' ? entry.audio.trim() : '';
    return buildAudioSrcFromName(audioName);
  }

  function buildImageSrcFromName(fileName = '', dayNumber = level, phaseNumber = phase) {
    const trimmed = typeof fileName === 'string' ? fileName.trim() : '';
    if (!trimmed) return '';
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return buildPublicLevelAssetUrl(trimmed, dayNumber, phaseNumber);
  }

  function isWebpFile(fileName) {
    return typeof fileName === 'string' && fileName.trim().toLowerCase().endsWith('.webp');
  }

  function applyImageStyling(img, fileName) {
    if (!img) return;
    if (isWebpFile(fileName)) {
      img.classList.add('image--webp');
    }
  }

  function applyVisualStyles(wrapper, entry = {}) {
    if (!wrapper) return;
    const tenseStyle = TENSE_STYLES[entry.tense] || {};
    const formStyle = SENTENCE_FORM_STYLES[entry.sentenceForm] || {};

    wrapper.style.setProperty('--tense-ring', tenseStyle.ring || 'none');
    wrapper.style.setProperty('--tense-animation', tenseStyle.animation || 'none');
    wrapper.style.setProperty('--tense-glow', tenseStyle.glow || 'none');
    wrapper.style.setProperty('--tense-filter', tenseStyle.filter || 'drop-shadow(0 10px 16px rgba(0, 0, 0, 0.25))');
    wrapper.style.setProperty('--tense-mask', tenseStyle.mask || 'none');
    const isAffirmative = String(entry.sentenceForm || '').toLowerCase() === 'affirmative';
    wrapper.style.setProperty('--tense-lens', isAffirmative ? 'none' : (tenseStyle.lens || 'none'));

    wrapper.style.setProperty('--form-ring', formStyle.ring || 'none');
    wrapper.style.setProperty('--form-animation', formStyle.animation || 'none');
    wrapper.style.setProperty('--form-glow', formStyle.glow || 'none');
    wrapper.style.setProperty('--form-lens', isAffirmative ? 'none' : (formStyle.lens || 'none'));
  }
  // "Barra circular": indicador de progresso da pronuncia.
  // Nao existe nos modos 2, 11 e 12.
  function isCircularBarEnabledForPhase(targetPhase = phase) {
    const phaseNumber = Number(targetPhase);
    return phaseNumber !== 2 && phaseNumber !== 11 && phaseNumber !== 12;
  }

  function buildVisualWrapper(entry, img, options = {}) {
    const wrapper = document.createElement('div');
    wrapper.className = `image-visual${options.fill ? ' image-visual--fill' : ''}`;
    applyVisualStyles(wrapper, entry);

    const tenseRing = document.createElement('div');
    tenseRing.className = 'image-ring image-ring--tense';
    const formRing = document.createElement('div');
    formRing.className = 'image-ring image-ring--form';
    const showCircularBar = isCircularBarEnabledForPhase();
    let accuracyRing = null;
    if (showCircularBar) {
      accuracyRing = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      accuracyRing.classList.add('image-ring-accuracy', 'barra-circular');
      accuracyRing.setAttribute('viewBox', '0 0 120 120');
      accuracyRing.setAttribute('aria-hidden', 'true');
      const accuracyTrack = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      accuracyTrack.classList.add('image-ring-accuracy__track');
      accuracyTrack.setAttribute('cx', '60');
      accuracyTrack.setAttribute('cy', '60');
      accuracyTrack.setAttribute('r', `${CIRCULAR_BAR_RADIUS}`);
      const accuracyProgress = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      accuracyProgress.classList.add('image-ring-accuracy__progress');
      accuracyProgress.setAttribute('cx', '60');
      accuracyProgress.setAttribute('cy', '60');
      accuracyProgress.setAttribute('r', `${CIRCULAR_BAR_RADIUS}`);
      accuracyProgress.style.strokeDasharray = `${ACCURACY_RING_CIRC}`;
      accuracyProgress.style.strokeDashoffset = `${ACCURACY_RING_CIRC}`;
      accuracyRing.appendChild(accuracyTrack);
      accuracyRing.appendChild(accuracyProgress);
    }
    const tenseLens = document.createElement('div');
    tenseLens.className = 'image-lens image-lens--tense';
    const formLens = document.createElement('div');
    formLens.className = 'image-lens image-lens--form';

    wrapper.appendChild(tenseRing);
    wrapper.appendChild(formRing);
    if (accuracyRing) {
      wrapper.appendChild(accuracyRing);
    }
    wrapper.appendChild(tenseLens);
    wrapper.appendChild(formLens);
    wrapper.appendChild(img);
    return wrapper;
  }

  function createEntryImage(entry, className, options = {}) {
    const img = document.createElement('img');
    img.src = buildImageSrc(entry);
    img.alt = entry.en;
    img.className = className;
    applyImageStyling(img, entry.file);
    return buildVisualWrapper(entry, img, options);
  }

  function createIconImage(entry, src, alt, className, options = {}) {
    const img = document.createElement('img');
    img.src = src;
    img.alt = alt;
    img.className = className;
    return buildVisualWrapper(entry, img, options);
  }

  function createTextVisual(entry, text, className, options = {}) {
    const textEl = document.createElement('div');
    textEl.className = className;
    textEl.textContent = text;
    return buildVisualWrapper(entry, textEl, options);
  }

  function attachSpeechTapTrigger(wrapper, triggerFn) {
    if (!wrapper || typeof triggerFn !== 'function') return;
    wrapper.style.cursor = 'pointer';
    wrapper.setAttribute('role', 'button');
    wrapper.setAttribute('tabindex', '0');
    wrapper.setAttribute('aria-label', 'Toque para enviar e comparar sua pronuncia');
    wrapper.addEventListener('click', (event) => {
      event.preventDefault();
      triggerFn();
    });
    wrapper.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      triggerFn();
    });
  }

  function scheduleButtonTextFit(button, minSize = 14) {
    if (!button) return;
    const resize = () => {
      const computed = window.getComputedStyle(button);
      const baseSize = Number.parseFloat(computed.fontSize) || 0;
      if (!baseSize) return;
      let size = baseSize;
      button.style.fontSize = `${size}px`;
      while (button.scrollWidth > button.clientWidth && size > minSize) {
        size -= 1;
        button.style.fontSize = `${size}px`;
      }
    };
    window.requestAnimationFrame(resize);
  }

  function playAudioElement(audio, options = {}) {
    return new Promise(resolve => {
      if (!audio || isGamePaused) {
        resolve(false);
        return;
      }

      let hasPlayed = false;
      let cleanupSkip = null;
      const { allowSkip = false, onSkip } = options;

      const markPlayed = () => {
        hasPlayed = true;
      };

      const finish = () => {
        audio.removeEventListener('playing', markPlayed);
        audio.removeEventListener('ended', finish);
        audio.removeEventListener('error', finish);
        if (activeAudioSource === audio) {
          activeAudioSource = null;
        }
        if (cleanupSkip) cleanupSkip();
        resolve(hasPlayed);
      };

      const handleSkip = () => {
        audio.pause();
        audio.currentTime = 0;
        if (typeof onSkip === 'function') {
          onSkip();
        }
        finish();
      };

      audio.currentTime = 0;
      activeAudioSource = audio;
      audio.addEventListener('playing', markPlayed);
      audio.addEventListener('ended', finish);
      audio.addEventListener('error', finish);
      cleanupSkip = allowSkip ? createTapSkipListener(handleSkip) : null;

      const playResult = audio.play();
      if (playResult && typeof playResult.then === 'function') {
        playResult
          .then(() => { hasPlayed = true; })
          .catch(finish);
      } else {
        hasPlayed = true;
      }
      if (levelCountdown) {
        levelCountdown.textContent = '';
      }
    });
  }

  function fadeOutAndStopAudio(audio, options = {}) {
    const { durationMs = INTRO_AUDIO_FADEOUT_MS, resetVolume = null } = options;
    return new Promise((resolve) => {
      if (!audio) {
        resolve();
        return;
      }
      if (!Number.isFinite(durationMs) || durationMs <= 0 || audio.paused) {
        audio.pause();
        audio.currentTime = 0;
        if (Number.isFinite(resetVolume)) {
          audio.volume = resetVolume;
        }
        resolve();
        return;
      }

      const startVolume = Number.isFinite(audio.volume) ? audio.volume : 1;
      const startTime = performance.now();

      const tick = (now) => {
        const progress = Math.min(1, (now - startTime) / durationMs);
        audio.volume = Math.max(0, startVolume * (1 - progress));
        if (progress < 1 && !audio.paused) {
          requestAnimationFrame(tick);
          return;
        }
        audio.pause();
        audio.currentTime = 0;
        if (Number.isFinite(resetVolume)) {
          audio.volume = resetVolume;
        }
        resolve();
      };

      requestAnimationFrame(tick);
    });
  }

  function getAdvanceDelay(defaultDelayMs) {
    return index >= cycle.length ? FINAL_ADVANCE_DELAY_MS : defaultDelayMs;
  }

  function clearLevelUnlockTimer() {
    if (levelUnlockTimer) {
      clearInterval(levelUnlockTimer);
      levelUnlockTimer = null;
    }
  }

  function clearNextLevelUnlockAt() {
    localStorage.removeItem(NEXT_LEVEL_UNLOCK_STORAGE_KEY);
    localStorage.removeItem(LEGACY_LEVEL_TWO_UNLOCK_STORAGE_KEY);
  }

  function getCompletionStateStatus(completionState = readCompletionStorage()) {
    if (!completionState || !completionState.completedLevel) return null;
    const completedLevel = Number(completionState.completedLevel);
    if (!Number.isFinite(completedLevel) || completedLevel <= 0) return null;
    const nextLevel = Number(completionState.nextLevel);
    const resolvedNextLevel = Number.isFinite(nextLevel) && nextLevel > completedLevel
      ? nextLevel
      : completedLevel + 1;
    return {
      completedLevel,
      nextLevel: resolvedNextLevel
    };
  }

  function syncCompletionUnlockStorage(completionState = readCompletionStorage()) {
    const status = getCompletionStateStatus(completionState);
    clearNextLevelUnlockAt();
    if (!status) return null;
    return status;
  }

  function resolveReadyCompletionState() {
    const status = getCompletionStateStatus();
    if (!status) return null;
    clearCompletionStorage();
    clearNextLevelUnlockAt();
    level = status.nextLevel;
    saveLevelToStorage();
    updateLevelIndicators();
    return status;
  }

  function resetPhaseAudioProgress() {
    if (!phaseAudioProgress || !phaseAudioProgressFill) return;
    phaseAudioProgressFill.style.width = '0%';
    phaseAudioProgress.setAttribute('aria-valuenow', '0');
  }

  function trackPhaseAudioProgress(audio) {
    if (!phaseAudioProgress || !phaseAudioProgressFill || !audio) {
      return () => {};
    }

    const updateProgress = () => {
      const duration = audio.duration;
      const percent = duration ? Math.min(100, (audio.currentTime / duration) * 100) : 0;
      phaseAudioProgressFill.style.width = `${percent}%`;
      phaseAudioProgress.setAttribute('aria-valuenow', String(Math.round(percent)));
    };

    const finalizeProgress = () => {
      updateProgress();
      if (!audio.duration || Number.isNaN(audio.duration)) {
        phaseAudioProgressFill.style.width = '100%';
        phaseAudioProgress.setAttribute('aria-valuenow', '100');
      }
    };

    resetPhaseAudioProgress();
    updateProgress();

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', updateProgress);
    audio.addEventListener('ended', finalizeProgress);
    audio.addEventListener('error', finalizeProgress);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('loadedmetadata', updateProgress);
      audio.removeEventListener('ended', finalizeProgress);
      audio.removeEventListener('error', finalizeProgress);
    };
  }

  function loadLevelFromStorage() {
    resolveReadyCompletionState();
    const stored = Number(localStorage.getItem(STORAGE_KEY));
    if (Number.isFinite(stored) && stored > 0) {
      level = stored;
    } else {
      level = 1;
    }
    updateLevelIndicators();
  }

  function saveLevelToStorage() {
    localStorage.setItem(STORAGE_KEY, String(level));
  }

  function updateLevelIndicators() {
    if (levelBadge) levelBadge.textContent = `Dia ${level}`;
  }

  function getPhaseName(phaseNumber) {
    return PHASE_NAMES[phaseNumber] || 'Mode';
  }

  function getPhaseIconUrl(phaseNumber) {
    return PHASE_ICON_URLS[phaseNumber] || PHASE_ICON_URLS[1];
  }

  function getPlayerStateSnapshot() {
    try {
      if (window.playtalkPlayerState && typeof window.playtalkPlayerState.get === 'function') {
        return window.playtalkPlayerState.get() || {};
      }
      return {};
    } catch (error) {
      return {};
    }
  }

  function isAdminPlayer() {
    const player = getPlayerStateSnapshot();
    const username = player && typeof player.username === 'string' ? player.username.trim().toLowerCase() : '';
    return username === 'adm' || username === 'admin' || username === 'adminst';
  }

  function rebuildDayEntriesFromPhases() {
    dayEntries = Array.from(dayPhaseEntries.values()).flatMap(entries => (Array.isArray(entries) ? entries : []));
  }

  function getCustomPhaseOverride(phaseNumber) {
    const entry = customPhaseOverrides.get(phaseNumber);
    return entry && typeof entry === 'object' ? entry : null;
  }

  function getPreGameLoglineText(phaseNumber) {
    const segments = [PRE_GAME_LOG_LINES[phaseNumber] || ''];
    segments.push('Toque no icone para carregar um JSON do seu computador.');
    const override = getCustomPhaseOverride(phaseNumber);
    if (override && override.sourceLabel) {
      segments.push(`JSON carregado: ${override.sourceLabel}.`);
    }
    if (isAdminPlayer()) {
      segments.push('Adm: use "Carregar NÃ­vel" para escolher um JSON do bucket.');
    }
    return segments.filter(Boolean).join(' ');
  }

  function getPreGameLoglineText(phaseNumber) {
    const segments = [PRE_GAME_LOG_LINES[phaseNumber] || ''];
    segments.push('Toque no icone para abrir a lista fixa de arquivos JSON desta fase.');
    const override = getCustomPhaseOverride(phaseNumber);
    if (override && override.sourceLabel) {
      segments.push(`Arquivo carregado: ${override.sourceLabel}.`);
    }
    if (isAdminPlayer()) {
      segments.push('Adm: use "Ver arquivos" para escolher um JSON local desta fase.');
    }
    return segments.filter(Boolean).join(' ');
  }

  function applyCustomPhaseData(phaseNumber, phaseData, sourceLabel) {
    const safePhase = Number.parseInt(phaseNumber, 10);
    if (!Number.isFinite(safePhase) || safePhase < 1 || safePhase > MAX_PHASE) {
      throw new Error('Fase invÃ¡lida para JSON personalizado.');
    }
    const normalizedEntries = normalizePhaseEntries(phaseData.entries, safePhase);
    if (!normalizedEntries.length) {
      throw new Error('Esse JSON nÃ£o trouxe itens vÃ¡lidos para este modo.');
    }
    const metadata = phaseData.metadata && typeof phaseData.metadata === 'object' ? phaseData.metadata : {};
    dayPhaseEntries.set(safePhase, normalizedEntries);
    dayPhaseMeta.set(safePhase, metadata);
    customPhaseOverrides.set(safePhase, {
      entries: normalizedEntries.slice(),
      metadata: { ...metadata },
      sourceLabel: String(sourceLabel || 'JSON personalizado').trim()
    });
    baseDayPhaseSequence = Array.from(new Set([...baseDayPhaseSequence, safePhase])).sort((a, b) => a - b);
    applyDevicePhaseSequence();
    rebuildDayEntriesFromPhases();
  }

  function normalizeCustomPhasePayload(payload) {
    if (Array.isArray(payload)) {
      return { entries: payload, metadata: {} };
    }
    if (!payload || typeof payload !== 'object') {
      throw new Error('O arquivo precisa conter um JSON vÃ¡lido.');
    }
    const metadata = {
      soundtrack: typeof payload.soundtrack === 'string' ? payload.soundtrack.trim() : '',
      level: typeof payload.level === 'string' ? payload.level : '',
      characters: Array.isArray(payload.characters) ? payload.characters : []
    };
    if (Array.isArray(payload.items)) return { entries: payload.items, metadata };
    if (Array.isArray(payload.entries)) return { entries: payload.entries, metadata };
    if (Array.isArray(payload.phrases)) return { entries: payload.phrases, metadata };
    throw new Error('JSON sem lista de itens. Use um arquivo com array, "items", "entries" ou "phrases".');
  }

  function setPreGameAdminStatus(message, options = {}) {
    if (!preGameLevelStatus) return;
    const text = typeof message === 'string' ? message.trim() : '';
    preGameLevelStatus.hidden = !text;
    preGameLevelStatus.textContent = text;
    preGameLevelStatus.classList.toggle('is-error', Boolean(options.isError && text));
  }

  function resetPreGameLevelSelect() {
    if (!preGameLevelSelect) return;
    preGameLevelSelect.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Selecione um arquivo JSON da fase';
    preGameLevelSelect.appendChild(placeholder);
    preGameLevelSelect.value = '';
    updatePreGameApplyLevelButton();
  }

  function updatePreGameApplyLevelButton() {
    if (!preGameApplyLevelBtn) return;
    preGameApplyLevelBtn.disabled = !(preGameLevelSelect && preGameLevelSelect.value);
  }

  function getLocalLevelsFolderFromPhaseNumber(phaseNumber) {
    if (Number(phaseNumber) === 11) return 'talking';
    if (Number(phaseNumber) === 12) return 'watching';
    return 'others';
  }

  async function fetchLocalLevelFilesManifest() {
    if (localLevelFilesManifest) {
      return localLevelFilesManifest;
    }
    if (localLevelFilesManifestPromise) {
      return localLevelFilesManifestPromise;
    }

    localLevelFilesManifestPromise = (async () => {
      const response = await fetch(LOCAL_LEVEL_FILES_MANIFEST_PATH, { cache: 'no-store' });
      let payload = null;
      try {
        payload = await response.json();
      } catch (error) {
        payload = null;
      }

      if (!response.ok) {
        throw new Error('Nao foi possivel listar os arquivos locais da fase.');
      }

      const files = Array.isArray(payload && payload.files) ? payload.files : [];
      localLevelFilesManifest = files.filter(file => (
        file &&
        typeof file.folder === 'string' &&
        file.folder.trim() &&
        typeof file.path === 'string' &&
        file.path.trim()
      ));
      return localLevelFilesManifest;
    })();

    try {
      return await localLevelFilesManifestPromise;
    } finally {
      localLevelFilesManifestPromise = null;
    }
  }

  function filterLocalLevelFilesForPhase(files, phaseNumber) {
    const targetFolder = getLocalLevelsFolderFromPhaseNumber(phaseNumber);
    return (Array.isArray(files) ? files : [])
      .filter(file => file.folder === targetFolder)
      .sort((left, right) => {
        const leftDay = Number.isFinite(left.day) ? left.day : Number.MAX_SAFE_INTEGER;
        const rightDay = Number.isFinite(right.day) ? right.day : Number.MAX_SAFE_INTEGER;
        if (leftDay !== rightDay) return leftDay - rightDay;
        return String(left.name || '').localeCompare(String(right.name || ''), 'pt-BR');
      });
  }

  function populatePreGameLevelSelect(files) {
    resetPreGameLevelSelect();
    if (!preGameLevelSelect) return;
    const fragment = document.createDocumentFragment();
    files.forEach(file => {
      const option = document.createElement('option');
      option.value = file.path;
      option.textContent = file.name || file.path;
      fragment.appendChild(option);
    });
    preGameLevelSelect.appendChild(fragment);
    preGameLevelSelect.selectedIndex = 0;
    updatePreGameApplyLevelButton();
  }

  async function applySelectedPreGameLevelFromAssets(phaseNumber) {
    const assetPath = preGameLevelSelect && typeof preGameLevelSelect.value === 'string'
      ? preGameLevelSelect.value.trim()
      : '';

    if (!assetPath) {
      throw new Error('Escolha um arquivo JSON antes de carregar.');
    }

    const response = await fetch(encodeURI(assetPath), { cache: 'no-store' });
    if (!response.ok) {
      throw new Error('Nao foi possivel carregar o arquivo selecionado.');
    }

    const payload = await response.json();
    const phaseData = normalizeCustomPhasePayload(payload);
    applyCustomPhaseData(phaseNumber, phaseData, assetPath);
    if (preGameLogline) {
      preGameLogline.textContent = getPreGameLoglineText(phaseNumber);
    }
    return assetPath;
  }

  function configurePreGameAdminControls(phaseNumber) {
    if (!preGameAdmin || !preGameLoadLevelBtn || !preGameLevelPicker || !preGameLevelSelect || !preGameApplyLevelBtn) {
      return;
    }

    const restoreStatus = () => {
      const override = getCustomPhaseOverride(phaseNumber);
      if (override && override.sourceLabel) {
        setPreGameAdminStatus(`JSON atual: ${override.sourceLabel}`);
        return;
      }
      setPreGameAdminStatus('');
    };

    resetPreGameLevelSelect();
    preGameLevelPicker.hidden = true;
    preGameLoadLevelBtn.textContent = 'Ver arquivos';
    preGameLoadLevelBtn.disabled = false;
    preGameLevelSelect.onchange = null;
    preGameApplyLevelBtn.onclick = null;
    preGameLoadLevelBtn.onclick = null;

    if (!isAdminPlayer()) {
      preGameAdmin.hidden = true;
      setPreGameAdminStatus('');
      return;
    }

    preGameAdmin.hidden = false;
    restoreStatus();

    preGameLevelSelect.onchange = () => {
      updatePreGameApplyLevelButton();
      if (preGameLevelSelect.value) {
        setPreGameAdminStatus(`Selecionado: ${preGameLevelSelect.value}`);
      } else {
        restoreStatus();
      }
    };

    preGameLoadLevelBtn.onclick = async () => {
      if (!preGameLevelPicker.hidden) {
        preGameLevelPicker.hidden = true;
        preGameLoadLevelBtn.textContent = 'Ver arquivos';
        restoreStatus();
        return;
      }

      preGameLevelPicker.hidden = false;
      preGameLoadLevelBtn.textContent = 'Ocultar NÃ­veis';
      preGameLoadLevelBtn.disabled = true;
      setPreGameAdminStatus('Carregando JSONs de Niveis/...');

      try {
        const files = await fetchAdminLevelJsonFiles();
        populatePreGameLevelSelect(files);
        if (!files.length) {
          setPreGameAdminStatus('Nenhum arquivo .json foi encontrado em Niveis/.');
        } else {
          setPreGameAdminStatus(`${files.length} arquivo(s) .json encontrados em Niveis/.`);
        }
      } catch (error) {
        setPreGameAdminStatus(
          error && error.message ? error.message : 'Nao foi possivel listar os arquivos do bucket.',
          { isError: true }
        );
      } finally {
        preGameLoadLevelBtn.disabled = false;
        updatePreGameApplyLevelButton();
      }
    };

    preGameApplyLevelBtn.onclick = async () => {
      if (!preGameLevelSelect.value) {
        setPreGameAdminStatus('Escolha um JSON antes de carregar.', { isError: true });
        return;
      }

      const selectedKey = preGameLevelSelect.value;
      preGameApplyLevelBtn.disabled = true;
      preGameLoadLevelBtn.disabled = true;
      preGameStartBtn.disabled = true;
      setPreGameAdminStatus(`Carregando ${selectedKey}...`);

      try {
        const loadedKey = await applySelectedPreGameLevelFromBucket(phaseNumber);
        setPreGameAdminStatus(`JSON carregado: ${loadedKey}`);
      } catch (error) {
        setPreGameAdminStatus(
          error && error.message ? error.message : 'Nao foi possivel carregar o JSON selecionado.',
          { isError: true }
        );
      } finally {
        preGameLoadLevelBtn.disabled = false;
        preGameStartBtn.disabled = false;
        updatePreGameApplyLevelButton();
      }
    };
  }

  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('NÃ£o foi possÃ­vel ler o arquivo.'));
      reader.readAsText(file);
    });
  }

  function ensureCustomJsonFileInput() {
    let input = document.getElementById('admin-custom-phase-json-input');
    if (input) return input;
    input = document.createElement('input');
    input.type = 'file';
    input.id = 'admin-custom-phase-json-input';
    input.accept = 'application/json,.json';
    input.hidden = true;
    document.body.appendChild(input);
    return input;
  }

  async function promptCustomJsonUrl(phaseNumber) {
    const rawUrl = window.prompt('Cole o link pÃºblico do JSON desta fase:');
    const url = typeof rawUrl === 'string' ? rawUrl.trim() : '';
    if (!url) return false;
    let parsedUrl = null;
    try {
      parsedUrl = new URL(url);
    } catch (error) {
      throw new Error('Link invÃ¡lido. Cole uma URL pÃºblica completa.');
    }
    const response = await fetch(parsedUrl.toString(), { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`NÃ£o consegui baixar o JSON (${response.status}).`);
    }
    let payload = null;
    try {
      payload = await response.json();
    } catch (error) {
      throw new Error('O link retornou algo que nÃ£o Ã© um JSON vÃ¡lido.');
    }
    const phaseData = normalizeCustomPhasePayload(payload);
    applyCustomPhaseData(phaseNumber, phaseData, parsedUrl.toString());
    if (preGameLogline) {
      preGameLogline.textContent = getPreGameLoglineText(phaseNumber);
    }
    return true;
  }

  async function promptCustomJsonFile(phaseNumber) {
    const input = ensureCustomJsonFileInput();
    return new Promise((resolve, reject) => {
      input.value = '';
      input.onchange = async () => {
        try {
          const file = input.files && input.files[0] ? input.files[0] : null;
          if (!file) {
            resolve(false);
            return;
          }
          const raw = await readFileAsText(file);
          let payload = null;
          try {
            payload = JSON.parse(raw);
          } catch (error) {
            throw new Error('O arquivo selecionado nÃ£o contÃ©m um JSON vÃ¡lido.');
          }
          const phaseData = normalizeCustomPhasePayload(payload);
          applyCustomPhaseData(phaseNumber, phaseData, file.name || 'arquivo local');
          if (preGameLogline) {
            preGameLogline.textContent = getPreGameLoglineText(phaseNumber);
          }
          resolve(true);
        } catch (error) {
          reject(error);
        } finally {
          input.value = '';
          input.onchange = null;
        }
      };
      input.click();
    });
  }

  function configurePreGameAdminControls(phaseNumber) {
    if (!preGameAdmin || !preGameLoadLevelBtn || !preGameLevelPicker || !preGameLevelSelect || !preGameApplyLevelBtn) {
      return;
    }

    const restoreStatus = () => {
      const override = getCustomPhaseOverride(phaseNumber);
      if (override && override.sourceLabel) {
        setPreGameAdminStatus(`JSON atual: ${override.sourceLabel}`);
        return;
      }
      setPreGameAdminStatus('');
    };

    resetPreGameLevelSelect();
    preGameLevelPicker.hidden = true;
    preGameLoadLevelBtn.textContent = 'Ver arquivos';
    preGameLoadLevelBtn.disabled = false;
    preGameLevelSelect.onchange = null;
    preGameApplyLevelBtn.onclick = null;
    preGameLoadLevelBtn.onclick = null;

    if (!isAdminPlayer()) {
      preGameAdmin.hidden = true;
      setPreGameAdminStatus('');
      return;
    }

    preGameAdmin.hidden = false;
    restoreStatus();

    preGameLevelSelect.onchange = () => {
      updatePreGameApplyLevelButton();
      if (preGameLevelSelect.value) {
        setPreGameAdminStatus(`Selecionado: ${preGameLevelSelect.value}`);
      } else {
        restoreStatus();
      }
    };

    preGameLoadLevelBtn.onclick = async () => {
      if (!preGameLevelPicker.hidden) {
        preGameLevelPicker.hidden = true;
        preGameLoadLevelBtn.textContent = 'Ver arquivos';
        restoreStatus();
        return;
      }

      const folderName = getLocalLevelsFolderFromPhaseNumber(phaseNumber);
      preGameLevelPicker.hidden = false;
      preGameLoadLevelBtn.textContent = 'Ocultar arquivos';
      preGameLoadLevelBtn.disabled = true;
      setPreGameAdminStatus(`Carregando arquivos de Niveis/${folderName}/...`);

      try {
        const manifestFiles = await fetchLocalLevelFilesManifest();
        const files = filterLocalLevelFilesForPhase(manifestFiles, phaseNumber);
        populatePreGameLevelSelect(files);
        if (!files.length) {
          setPreGameAdminStatus(`Nenhum arquivo .json foi encontrado em Niveis/${folderName}/.`);
        } else {
          setPreGameAdminStatus(`${files.length} arquivo(s) .json encontrados em Niveis/${folderName}/.`);
        }
      } catch (error) {
        setPreGameAdminStatus(
          error && error.message ? error.message : 'Nao foi possivel listar os arquivos locais.',
          { isError: true }
        );
      } finally {
        preGameLoadLevelBtn.disabled = false;
        updatePreGameApplyLevelButton();
      }
    };

    preGameApplyLevelBtn.onclick = async () => {
      if (!preGameLevelSelect.value) {
        setPreGameAdminStatus('Escolha um arquivo JSON antes de carregar.', { isError: true });
        return;
      }

      const selectedKey = preGameLevelSelect.value;
      preGameApplyLevelBtn.disabled = true;
      preGameLoadLevelBtn.disabled = true;
      preGameStartBtn.disabled = true;
      setPreGameAdminStatus(`Carregando ${selectedKey}...`);

      try {
        const loadedKey = await applySelectedPreGameLevelFromAssets(phaseNumber);
        setPreGameAdminStatus(`Arquivo carregado: ${loadedKey}`);
      } catch (error) {
        setPreGameAdminStatus(
          error && error.message ? error.message : 'Nao foi possivel carregar o arquivo selecionado.',
          { isError: true }
        );
      } finally {
        preGameLoadLevelBtn.disabled = false;
        preGameStartBtn.disabled = false;
        updatePreGameApplyLevelButton();
      }
    };
  }

  function ensurePreGameIcon() {
    if (!preGameScreen) return null;
    let icon = document.getElementById('pre-game-icon');
    if (icon) return icon;
    const card = preGameScreen.querySelector('.overlay-card');
    if (!card) return null;
    icon = document.createElement('img');
    icon.id = 'pre-game-icon';
    icon.className = 'pre-game__icon';
    icon.alt = '';
    icon.setAttribute('aria-hidden', 'true');
    card.prepend(icon);
    return icon;
  }

  function setPreGameIcon(phaseNumber) {
    const icon = ensurePreGameIcon();
    if (icon) {
      icon.src = getPhaseIconUrl(phaseNumber);
    }
  }

  function configurePreGameIconActions(phaseNumber) {
    const currentIcon = ensurePreGameIcon();
    if (!currentIcon || !currentIcon.parentNode) return null;
    const icon = currentIcon.cloneNode(true);
    currentIcon.parentNode.replaceChild(icon, currentIcon);
    let isLoading = false;
    const triggerLocalJsonPicker = async () => {
      if (isLoading || !preGameStartBtn) return;
      isLoading = true;
      icon.classList.add('is-loading');
      preGameStartBtn.disabled = true;
      icon.setAttribute('aria-busy', 'true');
      try {
        await promptCustomJsonFile(phaseNumber);
      } catch (error) {
        const message = error && error.message ? error.message : 'Nao foi possivel carregar o JSON selecionado.';
        window.alert(message);
      } finally {
        isLoading = false;
        icon.classList.remove('is-loading');
        icon.removeAttribute('aria-busy');
        preGameStartBtn.disabled = false;
      }
    };

    icon.style.cursor = 'pointer';
    icon.tabIndex = 0;
    icon.setAttribute('role', 'button');
    icon.removeAttribute('aria-hidden');
    icon.setAttribute('aria-label', 'Carregar um arquivo JSON local para este modo');
    icon.title = 'Toque para carregar um JSON do seu computador';
    icon.addEventListener('click', () => {
      triggerLocalJsonPicker();
    });
    icon.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      triggerLocalJsonPicker();
    });
    return icon;
  }

  function configurePreGameIconActions(phaseNumber) {
    const currentIcon = ensurePreGameIcon();
    if (!currentIcon || !currentIcon.parentNode) return null;
    const icon = currentIcon.cloneNode(true);
    currentIcon.parentNode.replaceChild(icon, currentIcon);

    const toggleFileList = async () => {
      if (!preGameLoadLevelBtn || !preGameStartBtn || preGameLoadLevelBtn.disabled) return;
      preGameStartBtn.disabled = true;
      icon.classList.add('is-loading');
      icon.setAttribute('aria-busy', 'true');
      try {
        await preGameLoadLevelBtn.onclick?.();
      } finally {
        icon.classList.remove('is-loading');
        icon.removeAttribute('aria-busy');
        preGameStartBtn.disabled = false;
      }
    };

    icon.style.cursor = 'pointer';
    icon.tabIndex = 0;
    icon.setAttribute('role', 'button');
    icon.removeAttribute('aria-hidden');
    icon.setAttribute('aria-label', 'Abrir lista fixa de arquivos JSON desta fase');
    icon.title = 'Toque para ver os arquivos fixos desta fase';
    icon.addEventListener('click', () => {
      toggleFileList();
    });
    icon.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      toggleFileList();
    });
    return icon;
  }

  function ensurePlayingIcon() {
    if (!playingScreen) return null;
    let icon = document.getElementById('playing-icon');
    if (icon) return icon;
    const card = playingScreen.querySelector('.overlay-card');
    if (!card) return null;
    icon = document.createElement('img');
    icon.id = 'playing-icon';
    icon.className = 'pre-game__icon';
    icon.alt = '';
    icon.setAttribute('aria-hidden', 'true');
    card.prepend(icon);
    return icon;
  }

  function showPlayingOverlay() {
    if (!playingScreen) return;
    if (playingOverlayHideTimer) {
      window.clearTimeout(playingOverlayHideTimer);
      playingOverlayHideTimer = null;
    }
    if (dynamicBar && dynamicBar.parentNode && dynamicBar.parentNode !== playingScreen) {
      dynamicBarOriginalParent = dynamicBar.parentNode;
      dynamicBarOriginalNextSibling = dynamicBar.nextSibling;
      playingScreen.appendChild(dynamicBar);
    }
    const icon = ensurePlayingIcon();
    if (icon) {
      icon.src = getPhaseIconUrl(phase);
    }
    if (playingTitle) {
      playingTitle.textContent = pausePromptStartMode ? 'Toque para comeÃƒÂ§ar' : 'Toque para retornar';
    }
    if (playingLogline) {
      playingLogline.textContent = '';
    }
    syncPlayingTopStatus();
    startPlayingTopStatusSync();
    playingScreen.classList.remove('hidden');
    playingScreen.classList.remove('is-hiding');
    playingScreen.setAttribute('aria-hidden', 'false');
    document.body.classList.add('pause-menu-active');
    if (!playingScreen.classList.contains('hidden')) {
      playingScreen.classList.add('is-visible');
    }
  }

  function hidePlayingOverlay() {
    if (!playingScreen) return;
    stopPlayingTopStatusSync();
    playingScreen.classList.remove('is-visible');
    playingScreen.classList.add('is-hiding');
    if (playingOverlayHideTimer) {
      window.clearTimeout(playingOverlayHideTimer);
    }
    playingOverlayHideTimer = window.setTimeout(() => {
      if (!playingScreen) return;
      playingScreen.classList.remove('is-hiding');
      playingScreen.classList.add('hidden');
      playingScreen.setAttribute('aria-hidden', 'true');
      if (dynamicBar && dynamicBarOriginalParent) {
        if (dynamicBarOriginalNextSibling && dynamicBarOriginalNextSibling.parentNode === dynamicBarOriginalParent) {
          dynamicBarOriginalParent.insertBefore(dynamicBar, dynamicBarOriginalNextSibling);
        } else {
          dynamicBarOriginalParent.appendChild(dynamicBar);
        }
        dynamicBarOriginalParent = null;
        dynamicBarOriginalNextSibling = null;
      }
      document.body.classList.remove('pause-menu-active');
      playingOverlayHideTimer = null;
    }, PAUSE_DISSOLVE_MS);
  }

  function syncPlayingTopStatus() {
    if (isSingleModeSession()) {
      if (!playingProgress || !playingProgressFill) return;
      const totalSteps = Math.max(0, getPhaseStepCount(phase));
      const doneSteps = Math.max(0, Math.min(totalSteps, getCurrentPhaseStepProgress()));
      const percent = totalSteps > 0 ? Math.round((doneSteps / totalSteps) * 100) : 0;
      const modeText = 'Modo ' + getPhaseName(phase);
      const percentText = percent + '% Completo';
      if (playingStatus) {
        const showModeText = Math.floor(Date.now() / 3000) % 2 === 0;
        playingStatus.textContent = showModeText ? modeText : percentText;
      }
      playingProgress.style.display = '';
      playingProgressFill.style.width = percent + '%';
      return;
    }
    if (playingStatus) {
      const nextText = (myhomeStatus && myhomeStatus.textContent) ? myhomeStatus.textContent : 'FluÃƒÂªncia FÃƒÂ¡cil';
      playingStatus.textContent = nextText;
    }
    if (!playingProgress || !playingProgressFill) return;
    if (!myhomeProgress || !myhomeProgressFill) {
      playingProgress.style.display = 'none';
      return;
    }
    const sourceVisible = window.getComputedStyle(myhomeProgress).display !== 'none';
    playingProgress.style.display = sourceVisible ? '' : 'none';
    playingProgressFill.style.width = myhomeProgressFill.style.width || '0%';
  }

  function startPlayingTopStatusSync() {
    stopPlayingTopStatusSync();
    syncPlayingTopStatus();
    pauseStatusSyncTimer = window.setInterval(syncPlayingTopStatus, 500);
  }

  function stopPlayingTopStatusSync() {
    if (pauseStatusSyncTimer) {
      window.clearInterval(pauseStatusSyncTimer);
      pauseStatusSyncTimer = null;
    }
  }

  async function playPauseInstructionAudio() {
    const currentPhase = Number(phase);
    const path = PAUSE_HELP_AUDIO_URLS[currentPhase];
    if (!path) return;
    let audio = pauseInstructionAudioCache.get(path);
    if (!audio) {
      audio = new Audio(path);
      audio.preload = 'auto';
      pauseInstructionAudioCache.set(path, audio);
    }
    if (!audio) return;
    if (playingInstructionAudio && playingInstructionAudio !== audio) {
      await fadeOutAndStopAudio(playingInstructionAudio, { durationMs: 0, resetVolume: isAudioMuted ? 0 : 1 });
    }
    playingInstructionAudio = audio;
    audio.pause();
    audio.currentTime = 0;
    audio.volume = isAudioMuted ? 0 : 1;
    activeAudioSource = audio;
    audio.play().catch(() => {});
  }

  async function resetCurrentLevelFromPause() {
    const fallbackPhase = getFirstPhaseForDay() || 1;
    const requestedPhase = Number.parseInt(phase, 10);
    const targetPhase = Number.isFinite(requestedPhase) && dayPhaseEntries.has(requestedPhase)
      ? requestedPhase
      : fallbackPhase;
    const currentJourneyIndex = Math.max(0, journeyPhaseIndex);

    pausePromptStartMode = false;
    pendingAdvanceCycle = false;
    awaiting = false;
    completionGridShown = false;
    if (playingInstructionAudio) {
      await fadeOutAndStopAudio(playingInstructionAudio, { durationMs: 0, resetVolume: isAudioMuted ? 0 : 1 });
      playingInstructionAudio = null;
    }
    if (isGamePaused) {
      // Avoid resuming audio from the old run before restarting the phase.
      pausedAudioState = [];
      wasSpeechSynthesisSpeaking = false;
      setGamePaused(false);
      pauseLevelTimer();
    } else {
      hidePlayingOverlay();
    }
    if (isSingleModeSession()) {
      clearSinglePhaseProgress(level, targetPhase);
      journeyPhaseIndex = Math.max(0, dayPhaseSequence.indexOf(targetPhase));
    } else {
      journeyPhaseIndex = currentJourneyIndex;
    }
    phase = targetPhase;
    updatePhaseLabel();
    filterPool();
    resetPhaseResultsStats(targetPhase);
    resetProgress();
    if (levelComplete) {
      levelComplete.classList.add('hidden');
    }
    clearBoard();
    showText('');
    hidePhaseElements();
    await showPhaseTransition(targetPhase);
    syncPlayingTopStatus();
  }

  async function resumeFromPauseOverlay() {
    if (!isGamePaused) return;
    if (playingInstructionAudio && !playingInstructionAudio.paused) {
      await fadeOutAndStopAudio(playingInstructionAudio, {
        durationMs: PAUSE_INFO_FADEOUT_MS,
        resetVolume: isAudioMuted ? 0 : 1
      });
    }
    pausePromptStartMode = false;
    hidePlayingOverlay();
    setGamePaused(false);
  }

  function updatePhaseLabel() {
    if (phaseLabel) phaseLabel.textContent = getPhaseName(phase);
    if (gameRoot) {
      for (let i = 1; i <= MAX_PHASE; i += 1) {
        gameRoot.classList.toggle(`phase-${i}`, phase === i);
      }
    }
  }

  function getFirstPhaseForDay() {
    return dayPhaseSequence.length ? dayPhaseSequence[0] : null;
  }

  function applyDevicePhaseSequence() {
    dayPhaseSequence = Array.isArray(baseDayPhaseSequence)
      ? baseDayPhaseSequence
        .filter(phaseNumber => Number.isFinite(phaseNumber))
        .slice()
        .sort((left, right) => left - right)
      : [];
  }

  function getNextPhaseForDay() {
    if (!dayPhaseSequence.length) return null;
    return dayPhaseSequence[journeyPhaseIndex + 1] || null;
  }

  function ensureDeviceSelection() {
    applyDevicePhaseSequence();
    if (deviceSelectOverlay) {
      deviceSelectOverlay.classList.add('hidden');
      deviceSelectOverlay.setAttribute('aria-hidden', 'true');
    }
    return Promise.resolve('default');
  }

  function readMedalStorage() {
    try {
      const stored = JSON.parse(localStorage.getItem(MEDAL_STORAGE_KEY) || '{}');
      return stored && typeof stored === 'object' ? stored : {};
    } catch (error) {
      return {};
    }
  }

  function saveMedalStorage(data) {
    localStorage.setItem(MEDAL_STORAGE_KEY, JSON.stringify(data));
  }

  function readProgressStorage() {
    try {
      const stored = JSON.parse(localStorage.getItem(PROGRESS_STORAGE_KEY) || '{}');
      return stored && typeof stored === 'object' ? stored : {};
    } catch (error) {
      return {};
    }
  }

  function saveProgressStorage(data) {
    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(data));
  }

  function clearProgressStorage() {
    localStorage.removeItem(PROGRESS_STORAGE_KEY);
  }

  function readSingleProgressStorage() {
    try {
      const stored = JSON.parse(localStorage.getItem(SINGLE_PROGRESS_STORAGE_KEY) || '{}');
      return stored && typeof stored === 'object' ? stored : {};
    } catch (error) {
      return {};
    }
  }

  function saveSingleProgressStorage(data) {
    localStorage.setItem(SINGLE_PROGRESS_STORAGE_KEY, JSON.stringify(data));
  }

  function buildSingleProgressKey(dayNumber, phaseNumber) {
    const safeDay = Math.max(1, Number.parseInt(dayNumber, 10) || 1);
    const safePhase = Math.max(1, Math.min(MAX_PHASE, Number.parseInt(phaseNumber, 10) || 1));
    return `day-${safeDay}-phase-${safePhase}`;
  }

  function readSinglePhaseProgress(dayNumber, phaseNumber) {
    const storage = readSingleProgressStorage();
    return storage[buildSingleProgressKey(dayNumber, phaseNumber)] || null;
  }

  function saveSinglePhaseProgress(dayNumber, phaseNumber, data) {
    const storage = readSingleProgressStorage();
    storage[buildSingleProgressKey(dayNumber, phaseNumber)] = {
      ...(data || {}),
      day: Math.max(1, Number.parseInt(dayNumber, 10) || 1),
      phase: Math.max(1, Math.min(MAX_PHASE, Number.parseInt(phaseNumber, 10) || 1)),
      updatedAt: Date.now()
    };
    saveSingleProgressStorage(storage);
  }

  function clearSinglePhaseProgress(dayNumber, phaseNumber) {
    const storage = readSingleProgressStorage();
    delete storage[buildSingleProgressKey(dayNumber, phaseNumber)];
    saveSingleProgressStorage(storage);
  }

  // Fluency Journey vs Single Game: this context drives the badge shown in the profile avatar.
  function persistGameContext(mode, active) {
    const safeMode = mode === 'single-game' ? 'single-game' : 'fluency-journey';
    const payload = {
      mode: safeMode,
      active: Boolean(active),
      updatedAt: Date.now()
    };
    try {
      localStorage.setItem(GAME_CONTEXT_STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      // no-op
    }
    document.dispatchEvent(new CustomEvent(GAME_CONTEXT_EVENT, {
      detail: payload
    }));
  }

  function clearGameContext() {
    try {
      localStorage.removeItem(GAME_CONTEXT_STORAGE_KEY);
    } catch (error) {
      // no-op
    }
    document.dispatchEvent(new CustomEvent(GAME_CONTEXT_EVENT, {
      detail: { mode: '', active: false, updatedAt: Date.now() }
    }));
  }

  function readCompletionStorage() {
    try {
      const stored = JSON.parse(localStorage.getItem(COMPLETION_STORAGE_KEY) || '{}');
      return stored && typeof stored === 'object' ? stored : {};
    } catch (error) {
      return {};
    }
  }

  function saveCompletionStorage(data) {
    localStorage.setItem(COMPLETION_STORAGE_KEY, JSON.stringify(data));
  }

  function readAudioListenedStorage() {
    try {
      const stored = JSON.parse(localStorage.getItem(AUDIO_LISTENED_STORAGE_KEY) || '{}');
      return stored && typeof stored === 'object' ? stored : {};
    } catch (error) {
      return {};
    }
  }

  function saveAudioListenedStorage(data) {
    localStorage.setItem(AUDIO_LISTENED_STORAGE_KEY, JSON.stringify(data));
  }

  function getPhaseAudioStorageKey(day, phaseNumber) {
    return `day-${day}-phase-${phaseNumber}`;
  }

  function hasListenedPhaseAudio(day, phaseNumber) {
    const storage = readAudioListenedStorage();
    return Boolean(storage[getPhaseAudioStorageKey(day, phaseNumber)]);
  }

  function markPhaseAudioListened(day, phaseNumber) {
    const storage = readAudioListenedStorage();
    storage[getPhaseAudioStorageKey(day, phaseNumber)] = true;
    saveAudioListenedStorage(storage);
  }

  function loadAudioLevelsConfig() {
    if (audioLevelsConfig) return Promise.resolve(audioLevelsConfig);
    if (audioLevelsPromise) return audioLevelsPromise;
    audioLevelsPromise = (async () => {
      for (const path of AUDIO_LEVELS_PATHS) {
        try {
          const response = await fetch(path);
          if (!response.ok) continue;
          const data = await response.json();
          if (data && typeof data === 'object') {
            audioLevelsConfig = data;
            return audioLevelsConfig;
          }
        } catch (error) {
          // ignore and try next source
        }
      }
      audioLevelsConfig = {};
      return audioLevelsConfig;
    })();
    return audioLevelsPromise;
  }

  function getDayAudioConfig(dayNumber) {
    if (!audioLevelsConfig || typeof audioLevelsConfig !== 'object') return {};
    const days = audioLevelsConfig.days && typeof audioLevelsConfig.days === 'object' ? audioLevelsConfig.days : {};
    return days[String(dayNumber)] || {};
  }

  function getPhaseAudioName(dayNumber, phaseNumber) {
    const dayConfig = getDayAudioConfig(dayNumber);
    const phases = dayConfig.phases && typeof dayConfig.phases === 'object' ? dayConfig.phases : {};
    const audioName = phases[String(phaseNumber)];
    if (typeof audioName === 'string' && audioName.trim()) {
      return audioName.trim();
    }
    return PHASE_INTRO_AUDIO_BY_PHASE[Number(phaseNumber)] || '';
  }

  function getPostGameAudioName(dayNumber) {
    const dayConfig = getDayAudioConfig(dayNumber);
    const audioName = dayConfig.postGame;
    return typeof audioName === 'string' ? audioName.trim() : '';
  }

  async function resolveMediaUrl(fileName) {
    const trimmed = typeof fileName === 'string' ? fileName.trim() : '';
    if (!trimmed) return '';
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    if (resolvedAudioCache.has(trimmed)) {
      return resolvedAudioCache.get(trimmed) || '';
    }
    try {
      const response = await fetch(`${AUDIO_RESOLVE_ENDPOINT}?name=${encodeURIComponent(trimmed)}`);
      if (response.ok) {
        const data = await response.json();
        if (data && data.success && typeof data.url === 'string') {
          resolvedAudioCache.set(trimmed, data.url);
          return data.url;
        }
      }
    } catch (error) {
      // ignore and fallback
    }
    const fallbackPath = trimmed
      .split('/')
      .map(segment => encodeURIComponent(segment))
      .join('/');
    const fallbackUrl = typeof window.getGameSoundUrl === 'function'
      ? window.getGameSoundUrl(`gamesounds/${fallbackPath}`)
      : `gamesounds/${fallbackPath}`;
    resolvedAudioCache.set(trimmed, fallbackUrl);
    return fallbackUrl;
  }

  async function getAudioElementFromName(fileName) {
    const src = await resolveMediaUrl(fileName);
    if (!src) return null;
    return getCachedAudioElement(src);
  }

  function clearCompletionStorage() {
    localStorage.removeItem(COMPLETION_STORAGE_KEY);
    clearNextLevelUnlockAt();
  }

  function readLevelTimeStorage() {
    try {
      const stored = JSON.parse(localStorage.getItem(LEVEL_TIME_STORAGE_KEY) || '{}');
      return stored && typeof stored === 'object' ? stored : {};
    } catch (error) {
      return {};
    }
  }

  function saveLevelTimeStorage(data) {
    localStorage.setItem(LEVEL_TIME_STORAGE_KEY, JSON.stringify(data));
  }

  function updateLevelBestTime(levelNumber, elapsedMs) {
    if (!Number.isFinite(levelNumber) || levelNumber <= 0) return;
    if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return;
    const storage = readLevelTimeStorage();
    const key = String(levelNumber);
    const existing = Number(storage[key]);
    if (!Number.isFinite(existing) || elapsedMs < existing) {
      storage[key] = Math.round(elapsedMs);
      saveLevelTimeStorage(storage);
    }
  }

  function startLevelTimer() {
    levelElapsedBase = 0;
    levelStartTime = Date.now();
  }

  function pauseLevelTimer() {
    if (!levelStartTime) return;
    levelElapsedBase += Math.max(0, Date.now() - levelStartTime);
    levelStartTime = 0;
  }

  function resumePausedLevelTimer() {
    if (levelStartTime) return;
    levelStartTime = Date.now();
  }

  function resumeLevelTimer(elapsedMs) {
    levelElapsedBase = Math.max(0, Math.floor(Number(elapsedMs) || 0));
    levelStartTime = Date.now();
  }

  function getLevelElapsedMs() {
    if (!levelStartTime) {
      return levelElapsedBase;
    }
    return levelElapsedBase + Math.max(0, Date.now() - levelStartTime);
  }

  function resetLevelTimer() {
    levelElapsedBase = 0;
    levelStartTime = 0;
  }

  function formatElapsedTime(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  function getPronunciationAverage() {
    if (!pronunciationSamples.length) return 0;
    const sum = pronunciationSamples.reduce((total, value) => total + value, 0);
    return sum / pronunciationSamples.length;
  }

  function normalizeCount(entry, key, fallbackKey) {
    if (!entry) return 0;
    if (typeof entry[key] === 'number') return entry[key];
    if (fallbackKey && Array.isArray(entry[fallbackKey])) return entry[fallbackKey].length;
    return 0;
  }

  function accumulateMetric(entry, key, totals, counts) {
    if (!entry || !Array.isArray(entry[key])) return;
    entry[key].forEach(value => {
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) return;
      totals[key] += numeric;
      counts[key] += 1;
    });
  }

  function formatAverage(total, count) {
    if (!count) return '--';
    return `${Math.round(total / count)}%`;
  }

  function getAggregateFlashcardStats() {
    const stats = readFlashcardStats();
    const entries = Object.values(stats || {});
    const totals = {
      listening: 0,
      reading: 0,
      association: 0,
      meaning: 0
    };
    const counts = {
      listening: 0,
      reading: 0,
      association: 0,
      meaning: 0
    };
    let totalSpeakings = 0;
    let totalListenings = 0;

    entries.forEach(entry => {
      totalSpeakings += normalizeCount(entry, 'spokenCount', 'pronunciation');
      totalListenings += normalizeCount(entry, 'listenedCount');
      accumulateMetric(entry, 'listening', totals, counts);
      accumulateMetric(entry, 'reading', totals, counts);
      accumulateMetric(entry, 'association', totals, counts);
      accumulateMetric(entry, 'meaning', totals, counts);
    });

    return {
      totalSpeakings,
      totalListenings,
      avgListening: formatAverage(totals.listening, counts.listening),
      avgReading: formatAverage(totals.reading, counts.reading),
      avgAssociation: formatAverage(totals.association, counts.association),
      avgMeaning: formatAverage(totals.meaning, counts.meaning)
    };
  }

  function createEmptyAspectMetrics() {
    return {
      pronunciation: { sum: 0, count: 0 },
      listens: { sum: 0, count: 0 },
      tempo: { sum: 0, count: 0 },
      typing: { sum: 0, count: 0 },
      speakings: { sum: 0, count: 0 },
      coins: { sum: 0, count: 0 }
    };
  }

  function createEmptyJourneyStats() {
    return {
      speakingsTotal: 0,
      listeningsTotal: 0,
      pronunciationSum: 0,
      pronunciationCount: 0,
      typingPercentSum: 0,
      typingPercentCount: 0,
      timePlayedMsTotal: 0,
      timeExpectedMsTotal: 0,
      coinsEarnedTotal: 0,
      progressPercentSum: 0,
      progressPercentCount: 0,
      aspectMetrics: createEmptyAspectMetrics(),
      modeTotals: {}
    };
  }

  function normalizeAspectMetrics(raw) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const defaults = createEmptyAspectMetrics();
    Object.keys(defaults).forEach((key) => {
      const metric = source[key] && typeof source[key] === 'object' ? source[key] : {};
      defaults[key].sum = Number.isFinite(Number(metric.sum)) ? Number(metric.sum) : 0;
      defaults[key].count = Number.isFinite(Number(metric.count)) ? Number(metric.count) : 0;
    });
    return defaults;
  }

  function normalizeModeTotals(raw) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const normalized = {};
    Object.keys(source).forEach((phaseKey) => {
      const bucket = source[phaseKey] && typeof source[phaseKey] === 'object' ? source[phaseKey] : {};
      normalized[phaseKey] = {
        plays: Number(bucket.plays) || 0,
        progressPercentSum: Number(bucket.progressPercentSum) || 0,
        progressPercentCount: Number(bucket.progressPercentCount) || 0
      };
    });
    return normalized;
  }

  function normalizeJourneyStats(raw) {
    const source = raw && typeof raw === 'object' ? raw : {};
    return {
      speakingsTotal: Number(source.speakingsTotal) || 0,
      listeningsTotal: Number(source.listeningsTotal) || 0,
      pronunciationSum: Number(source.pronunciationSum) || 0,
      pronunciationCount: Number(source.pronunciationCount) || 0,
      typingPercentSum: Number(source.typingPercentSum) || 0,
      typingPercentCount: Number(source.typingPercentCount) || 0,
      timePlayedMsTotal: Number(source.timePlayedMsTotal) || 0,
      timeExpectedMsTotal: Number(source.timeExpectedMsTotal) || 0,
      coinsEarnedTotal: Number(source.coinsEarnedTotal) || 0,
      progressPercentSum: Number(source.progressPercentSum) || 0,
      progressPercentCount: Number(source.progressPercentCount) || 0,
      aspectMetrics: normalizeAspectMetrics(source.aspectMetrics),
      modeTotals: normalizeModeTotals(source.modeTotals)
    };
  }

  function readJourneyStatsStorage() {
    try {
      const raw = JSON.parse(localStorage.getItem(GAME_STATS_STORAGE_KEY) || '{}');
      return normalizeJourneyStats(raw);
    } catch (error) {
      return normalizeJourneyStats({});
    }
  }

  function saveJourneyStatsStorage(data) {
    localStorage.setItem(GAME_STATS_STORAGE_KEY, JSON.stringify(normalizeJourneyStats(data)));
  }

  function pushAspectMetric(stats, key, percent) {
    if (!stats || !stats.aspectMetrics || !stats.aspectMetrics[key]) return;
    const numeric = Number(percent);
    if (!Number.isFinite(numeric)) return;
    stats.aspectMetrics[key].sum += numeric;
    stats.aspectMetrics[key].count += 1;
  }

  function averageFromValues(values) {
    const safe = values.filter((value) => Number.isFinite(value));
    if (!safe.length) return null;
    const sum = safe.reduce((acc, value) => acc + value, 0);
    return sum / safe.length;
  }

  function buildCurrentPhaseSummary() {
    const pronunciationAverage = phasePronunciationSamples.length
      ? phasePronunciationSamples.reduce((acc, value) => acc + value, 0) / phasePronunciationSamples.length
      : null;
    const tempoMetric = getPhaseTempoMetric(phase);
    const typingPercent = (phase === 9 && (phaseTypingHits + phaseTypingMisses) > 0)
      ? getPhaseTypingPercent()
      : null;
    const listensPercent = ((phase === 11 || phase === 12) && phaseListeningsEnglish > 0) ? 100 : null;
    const speakingsPercent = phaseSpeakingSends > 0 ? 100 : null;
    const coinsPercent = getPhaseCoinsPercent(phase);
    const elapsedMs = Math.round(getPhaseElapsedSeconds() * 1000);
    const targetCps = Number(PHASE_TEMPO_TARGET_CPS[phase]);
    const totalChars = getPhaseTotalEnglishCharacters(phase);
    const expectedMs = Number.isFinite(targetCps) && targetCps > 0 && totalChars > 0
      ? Math.round((totalChars / targetCps) * 1000)
      : 0;
    const progressPercent = averageFromValues([
      pronunciationAverage,
      tempoMetric ? tempoMetric.percent : null,
      typingPercent,
      listensPercent,
      speakingsPercent,
      coinsPercent
    ]);

    return {
      phase,
      pronunciationAverage,
      tempoMetric,
      typingPercent,
      listensPercent,
      speakingsPercent,
      coinsPercent,
      listensCount: phaseListeningsEnglish,
      speakingsCount: phaseSpeakingSends,
      coinsEarned: Math.max(0, Math.floor(pendingPhaseCoinAward)),
      elapsedMs,
      expectedMs,
      progressPercent
    };
  }

  function applyPhaseSummaryToJourneyStats(target, summary) {
    if (!target || !summary) return;
    const phaseKey = String(summary.phase);
    const modeBucket = target.modeTotals[phaseKey] || {
      plays: 0,
      progressPercentSum: 0,
      progressPercentCount: 0
    };
    modeBucket.plays += 1;
    if (Number.isFinite(summary.progressPercent)) {
      modeBucket.progressPercentSum += summary.progressPercent;
      modeBucket.progressPercentCount += 1;
      target.progressPercentSum += summary.progressPercent;
      target.progressPercentCount += 1;
    }
    target.modeTotals[phaseKey] = modeBucket;

    target.speakingsTotal += Math.max(0, Number(summary.speakingsCount) || 0);
    target.listeningsTotal += Math.max(0, Number(summary.listensCount) || 0);
    target.coinsEarnedTotal += Math.max(0, Number(summary.coinsEarned) || 0);
    target.timePlayedMsTotal += Math.max(0, Number(summary.elapsedMs) || 0);
    target.timeExpectedMsTotal += Math.max(0, Number(summary.expectedMs) || 0);

    if (Number.isFinite(summary.pronunciationAverage)) {
      target.pronunciationSum += summary.pronunciationAverage;
      target.pronunciationCount += 1;
      pushAspectMetric(target, 'pronunciation', summary.pronunciationAverage);
    }
    if (Number.isFinite(summary.typingPercent)) {
      target.typingPercentSum += summary.typingPercent;
      target.typingPercentCount += 1;
      pushAspectMetric(target, 'typing', summary.typingPercent);
    }
    if (Number.isFinite(summary.tempoMetric?.percent)) {
      pushAspectMetric(target, 'tempo', summary.tempoMetric.percent);
    }
    if (Number.isFinite(summary.listensPercent)) {
      pushAspectMetric(target, 'listens', summary.listensPercent);
    }
    if (Number.isFinite(summary.speakingsPercent)) {
      pushAspectMetric(target, 'speakings', summary.speakingsPercent);
    }
    if (Number.isFinite(summary.coinsPercent)) {
      pushAspectMetric(target, 'coins', summary.coinsPercent);
    }
  }

  function recordPhaseJourneyStats(summary) {
    if (!summary) return;
    if (!journeyRunStats) {
      journeyRunStats = createEmptyJourneyStats();
    }
    applyPhaseSummaryToJourneyStats(journeyRunStats, summary);
    const global = readJourneyStatsStorage();
    applyPhaseSummaryToJourneyStats(global, summary);
    saveJourneyStatsStorage(global);
  }

  function formatSummaryPercent(sum, count) {
    if (!count) return '--';
    return `${Math.round(sum / count)}%`;
  }

  function formatSummaryDuration(ms) {
    const totalSeconds = Math.max(0, Math.round((Number(ms) || 0) / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}m`;
    if (minutes > 0) return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
    return `${seconds}s`;
  }

  function renderFinalSummary(stats) {
    if (!finalGeneralStats || !stats) return;
    const averageJourneySpeed = formatSummaryPercent(stats.aspectMetrics.tempo.sum, stats.aspectMetrics.tempo.count);
    const cards = [
      ['Precisao total', formatSummaryPercent(stats.progressPercentSum, stats.progressPercentCount)],
      ['Tempo total', formatSummaryDuration(stats.timePlayedMsTotal)],
      ['Velocidade media', averageJourneySpeed],
      ['Moedas totais', `${Math.round(stats.coinsEarnedTotal)}`],
      ['Speakings', `${Math.round(stats.speakingsTotal)}`],
      ['Listenings', `${Math.round(stats.listeningsTotal)}`],
      ['Pronuncia media', formatSummaryPercent(stats.pronunciationSum, stats.pronunciationCount)],
      ['Typing medio', formatSummaryPercent(stats.typingPercentSum, stats.typingPercentCount)],
      ['Aspecto Pronuncia', formatSummaryPercent(stats.aspectMetrics.pronunciation.sum, stats.aspectMetrics.pronunciation.count)],
      ['Aspecto Listening', formatSummaryPercent(stats.aspectMetrics.listens.sum, stats.aspectMetrics.listens.count)],
      ['Aspecto Typing', formatSummaryPercent(stats.aspectMetrics.typing.sum, stats.aspectMetrics.typing.count)],
      ['Aspecto Speaking', formatSummaryPercent(stats.aspectMetrics.speakings.sum, stats.aspectMetrics.speakings.count)],
      ['Aspecto Moedas', formatSummaryPercent(stats.aspectMetrics.coins.sum, stats.aspectMetrics.coins.count)]
    ];
    finalGeneralStats.innerHTML = cards.map(([label, value]) => `
      <article class="final-summary-card">
        <span>${label}</span>
        <strong>${value}</strong>
      </article>
    `).join('');
  }

  function renderFinalPhaseProgress(stats) {
    if (!finalPhaseProgressList || !stats) return;
    const phases = Array.from({ length: MAX_PHASE }, (_, idx) => idx + 1);
    finalPhaseProgressList.innerHTML = phases.map((phaseNumber) => {
      const bucket = stats.modeTotals[String(phaseNumber)] || {};
      const percent = bucket.progressPercentCount
        ? Math.round(bucket.progressPercentSum / bucket.progressPercentCount)
        : 0;
      return `
        <div class="final-phase-row">
          <span class="final-phase-row__label">${getPhaseName(phaseNumber)}</span>
          <span class="final-phase-row__bar">
            <span class="final-phase-row__fill" data-final-fill="${phaseNumber}" data-percent="${percent}"></span>
          </span>
          <span class="final-phase-row__value">${percent}%</span>
        </div>
      `;
    }).join('');

    const fills = Array.from(finalPhaseProgressList.querySelectorAll('[data-final-fill]'));
    fills.forEach((fill) => {
      const percent = Math.max(0, Math.min(100, Number(fill.getAttribute('data-percent')) || 0));
      fill.style.width = `${percent}%`;
    });
  }

  function renderFinalAvatar() {
    if (!finalAvatarWrap) return;
    const player = window.playtalkPlayerState && typeof window.playtalkPlayerState.get === 'function'
      ? window.playtalkPlayerState.get()
      : null;
    const avatar = player && typeof player.avatar === 'string' ? player.avatar.trim() : '';
    const hasAvatar = Boolean(avatar) && avatar !== 'Avatar/avatar-boy-male-svgrepo-com.svg';
    if (finalAvatarImage) {
      finalAvatarImage.src = hasAvatar ? avatar : DEFAULT_PROFILE_AVATAR;
      finalAvatarImage.style.display = 'block';
    }
    if (finalAvatarFallback) {
      finalAvatarFallback.textContent = '';
      finalAvatarFallback.style.display = 'none';
    }
  }

  function stopFinalStatsRotation() {
    if (finalStatsRotationTimer) {
      clearInterval(finalStatsRotationTimer);
      finalStatsRotationTimer = null;
    }
    finalStatsRotationIndex = 0;
  }

  function setRotatingStatContent(stat, animate = true) {
    if (!finalPronunciationEl || !finalRotatingLabel || !finalRotatingStat) return;
    finalRotatingStat.classList.remove('is-sliding');
    finalPronunciationEl.textContent = stat.value;
    finalRotatingLabel.textContent = stat.label;
  }

  function startFinalStatsRotation(pronunciationAverage) {
    if (!finalPronunciationEl || !finalRotatingLabel || !finalRotatingStat) return;
    stopFinalStatsRotation();
    const aggregate = getAggregateFlashcardStats();
    const stats = [
      { label: 'PronÃƒÆ’Ã‚Âºncia', value: `${pronunciationAverage.toFixed(1)}%` },
      { label: 'Total speakings', value: `${aggregate.totalSpeakings}` },
      { label: 'Total listenings', value: `${aggregate.totalListenings}` },
      { label: 'MÃƒÆ’Ã‚Â©dia listening', value: `${aggregate.avgListening}` },
      { label: 'MÃƒÆ’Ã‚Â©dia reading', value: `${aggregate.avgReading}` },
      { label: 'MÃƒÆ’Ã‚Â©dia association', value: `${aggregate.avgAssociation}` },
      { label: 'MÃƒÆ’Ã‚Â©dia meaning', value: `${aggregate.avgMeaning}` }
    ];

    finalStatsRotationIndex = 0;
    setRotatingStatContent(stats[0], false);

    if (stats.length <= 1) return;
  }

  function getSessionMemorySummary() {
    if (!sessionMemoryHistory.length) return { total: 0, correct: 0 };
    const correct = sessionMemoryHistory.filter(Boolean).length;
    return { total: sessionMemoryHistory.length, correct };
  }

  function resetSessionSeenImages() {
    sessionSeenImageSet.clear();
    sessionSeenImages = [];
  }

  function registerSessionImage(entry) {
    const imageName = getEntryImageName(entry);
    if (!imageName) return;
    const imagePath = buildImageSrcFromName(imageName);
    if (!imagePath || sessionSeenImageSet.has(imagePath)) return;
    sessionSeenImageSet.add(imagePath);
    sessionSeenImages.push(imagePath);
  }

  function stopFinalSlideshow() {
    if (finalSlideshowTimer) {
      clearInterval(finalSlideshowTimer);
      finalSlideshowTimer = null;
    }
    finalSlideshowIndex = 0;
  }

  function renderFinalSlide(images, index) {
    if (!finalSlideshowImage || !Array.isArray(images) || !images.length) return;
    const safeIndex = ((index % images.length) + images.length) % images.length;
    finalSlideshowImage.classList.remove('is-dissolving');
    finalSlideshowImage.src = images[safeIndex];
  }

  function startFinalSlideshow(images) {
    stopFinalSlideshow();
    if (!finalSlideshow || !finalSlideshowImage) return;
    if (!Array.isArray(images) || !images.length) {
      finalSlideshowImage.removeAttribute('src');
      return;
    }
    renderFinalSlide(images, 0);
    if (images.length <= 1) return;
  }

  function getMedalForErrors(errorCount) {
    if (errorCount >= 7) return 'prata';
    if (errorCount >= 4) return 'ouro';
    return 'diamante';
  }

  function getMedalImage(medalKey) {
    return 'SVG/codex-icons/coraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o.svg';
  }

  function updateMedalHud(medalKey) {
    const label = medalKey ? medalKey.charAt(0).toUpperCase() + medalKey.slice(1) : '';
    if (gameMedalIcon) gameMedalIcon.src = getMedalImage(medalKey);
    if (gameMedalIcon) gameMedalIcon.alt = `Medalha ${medalKey}`;
    if (gameMedalLabel) gameMedalLabel.textContent = label;
  }

  function updateFinalMedal(medalKey) {
    const label = 'CoraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o';
    if (finalMedalImage) finalMedalImage.src = getMedalImage(medalKey);
    if (finalMedalImage) finalMedalImage.alt = 'CoraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o';
    if (finalMedalLabel) finalMedalLabel.textContent = label;
  }

  function getHeartsTotal(medalKey) {
    return MEDAL_HEARTS[medalKey] ?? MEDAL_HEARTS.diamante;
  }

  function normalizeMedalKey(medalKey) {
    return MEDAL_HEARTS[medalKey] ? medalKey : 'diamante';
  }

  function normalizeSpeechText(text) {
    return String(text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9' ]/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function toSpeechTextList(value) {
    if (Array.isArray(value)) {
      return value.flatMap(item => toSpeechTextList(item)).filter(Boolean);
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed ? [trimmed] : [];
    }
    return [];
  }

  function stripSpeechInstructionPrefix(text) {
    const trimmed = String(text || '').trim();
    if (!trimmed) return '';
    const match = trimmed.match(/^(repeat after me|now say|say|ask|answer|tell me|repeat)\s*:\s*(.+)$/i);
    return match && match[2] ? match[2].trim() : trimmed;
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function applyMirrorGroups(text) {
    if (!mirrorGroups.length || !text) return text;
    let result = text;
    mirrorGroups.forEach(group => {
      const { canonical, variants } = group;
      variants.forEach(variant => {
        if (!variant || variant === canonical) return;
        const escaped = escapeRegExp(variant);
        const regex = new RegExp(`(^|\\s)${escaped}(?=\\s|$)`, 'g');
        result = result.replace(regex, `$1${canonical}`);
      });
    });
    return result;
  }

  function longestCommonSubstringLength(a, b) {
    if (!a || !b) return 0;
    const aLen = a.length;
    const bLen = b.length;
    const dp = Array.from({ length: aLen + 1 }, () => Array(bLen + 1).fill(0));
    let maxLen = 0;
    for (let i = 1; i <= aLen; i += 1) {
      for (let j = 1; j <= bLen; j += 1) {
        if (a[i - 1] === b[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
          if (dp[i][j] > maxLen) maxLen = dp[i][j];
        }
      }
    }
    return maxLen;
  }

  function calculateSequenceMatchPercent(expected, spoken) {
    const normalizedExpected = applyMirrorGroups(normalizeSpeechText(expected));
    const normalizedSpoken = applyMirrorGroups(normalizeSpeechText(spoken));
    if (!normalizedExpected) return 0;
    const longestMatch = longestCommonSubstringLength(normalizedExpected, normalizedSpoken);
    return (longestMatch / normalizedExpected.length) * 100;
  }

  function getNormalizedSpeechComparisonText(text) {
    return applyMirrorGroups(normalizeSpeechText(text));
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
    const variants = new Set();
    toSpeechTextList(text).forEach((entry) => {
      const stripped = stripSpeechInstructionPrefix(entry);
      const normalized = getNormalizedSpeechComparisonText(stripped);
      if (!normalized) return;
      variants.add(normalized);
      variants.add(normalized.replace(/'/g, '').trim());
      const expanded = expandEnglishSpeechContractions(normalized);
      if (expanded) {
        variants.add(expanded);
        variants.add(expanded.replace(/'/g, '').trim());
      }
    });
    return Array.from(variants).filter(Boolean);
  }

  function getSpeechCaptureSettings(expected) {
    const candidates = getSpeechComparisonCandidates(expected);
    const shortestCandidate = candidates.reduce((best, candidate) => {
      if (!candidate) return best;
      if (!best || candidate.length < best.length) return candidate;
      return best;
    }, '');
    const compactCandidate = shortestCandidate.replace(/\s+/g, '');
    const words = shortestCandidate.split(' ').filter(Boolean);
    const charCount = compactCandidate.length;
    const isShortSingleWord = words.length === 1 && charCount > 0 && charCount <= 5;
    const isMicroUtterance = words.length === 1 && charCount > 0 && charCount <= 2;

    return {
      browserContinuous: isShortSingleWord,
      browserInterimResults: true,
      completeSilenceMs: isShortSingleWord ? (isMicroUtterance ? 1800 : 2400) : 3200,
      possibleSilenceMs: isShortSingleWord ? (isMicroUtterance ? 700 : 1100) : 1800,
      languageModel: isShortSingleWord ? 'web_search' : 'free_form',
      maxResults: isShortSingleWord ? 10 : 6,
      minimumLengthMs: isShortSingleWord ? (isMicroUtterance ? 250 : 450) : 900
    };
  }

  function levenshteinDistance(a, b) {
    const source = String(a || '');
    const target = String(b || '');
    const rows = source.length + 1;
    const cols = target.length + 1;
    const matrix = Array.from({ length: rows }, () => Array(cols).fill(0));

    for (let i = 0; i < rows; i += 1) matrix[i][0] = i;
    for (let j = 0; j < cols; j += 1) matrix[0][j] = j;

    for (let i = 1; i < rows; i += 1) {
      for (let j = 1; j < cols; j += 1) {
        const cost = source[i - 1] === target[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }

    return matrix[rows - 1][cols - 1];
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

  function calculateNormalizedSpeechMatchPercent(normalizedExpected, normalizedSpoken) {
    if (!normalizedExpected) return 0;
    if (normalizedExpected === normalizedSpoken) return 100;

    const substringPercent = calculateSequenceMatchPercent(normalizedExpected, normalizedSpoken);
    const expectedWords = normalizedExpected ? normalizedExpected.split(' ').filter(Boolean) : [];
    const spokenWords = normalizedSpoken ? normalizedSpoken.split(' ').filter(Boolean) : [];
    const wordLcs = longestCommonWordSubsequenceLength(expectedWords, spokenWords);
    const wordPercent = expectedWords.length ? (wordLcs / expectedWords.length) * 100 : 0;
    const maxLen = Math.max(normalizedExpected.length, normalizedSpoken.length, 1);
    const editPercent = Math.max(0, (1 - (levenshteinDistance(normalizedExpected, normalizedSpoken) / maxLen)) * 100);

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
    return best;
  }

  function readFlashcardStats() {
    try {
      const stored = localStorage.getItem(FLASHCARD_STATS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      return {};
    }
  }

  function saveFlashcardStats(stats) {
    localStorage.setItem(FLASHCARD_STATS_STORAGE_KEY, JSON.stringify(stats));
  }

  function getFlashcardKey(entry) {
    if (!entry || typeof entry !== 'object') return '';
    const text = entry.targetSentence || entry.sentence || entry.en || entry.nomeIngles || '';
    const normalizedText = normalizeSpeechText(text);
    if (normalizedText) return normalizedText;
    return String(entry.file || entry.imagem || '').trim().toLowerCase();
  }

  function getFlashcardStatsEntry(stats, key) {
    if (!key) return null;
    if (!stats[key]) {
      stats[key] = {
        pronunciation: [],
        listening: [],
        reading: [],
        association: [],
        meaning: [],
        durations: [],
        lastPlayedAt: null,
        lastSpokenAt: null,
        lastHeardAt: null,
        spokenCount: 0,
        listenedCount: 0,
        memoryHistory: [],
        memoryStreak: 0,
        memoryStage: 0,
        memorySeedingUntil: null,
        memoryMastered: false
      };
    }
    if (!Array.isArray(stats[key].listening)) {
      stats[key].listening = [];
    }
    if (!Array.isArray(stats[key].reading)) {
      stats[key].reading = [];
    }
    if (!Array.isArray(stats[key].association)) {
      stats[key].association = [];
    }
    if (!Array.isArray(stats[key].meaning)) {
      stats[key].meaning = [];
    }
    if (!Array.isArray(stats[key].memoryHistory)) {
      stats[key].memoryHistory = [];
    }
    if (typeof stats[key].spokenCount !== 'number') {
      stats[key].spokenCount = Array.isArray(stats[key].pronunciation)
        ? stats[key].pronunciation.length
        : 0;
    }
    if (typeof stats[key].listenedCount !== 'number') {
      stats[key].listenedCount = 0;
    }
    if (typeof stats[key].memoryStreak !== 'number') {
      stats[key].memoryStreak = 0;
    }
    if (typeof stats[key].memoryStage !== 'number') {
      stats[key].memoryStage = 0;
    }
    if (typeof stats[key].memorySeedingUntil !== 'number') {
      stats[key].memorySeedingUntil = null;
    }
    if (typeof stats[key].memoryMastered !== 'boolean') {
      stats[key].memoryMastered = false;
    }
    return stats[key];
  }

  function pushLimited(list, value, limit) {
    if (!Array.isArray(list)) return;
    list.push(value);
    while (list.length > limit) {
      list.shift();
    }
  }

  function recordFlashcardPlayed(entry) {
    registerSessionImage(entry);
    const key = getFlashcardKey(entry);
    if (!key) return;
    const stats = readFlashcardStats();
    const record = getFlashcardStatsEntry(stats, key);
    if (!record) return;
    record.lastPlayedAt = Date.now();
    saveFlashcardStats(stats);
  }

  function recordFlashcardHeard(entry) {
    const key = getFlashcardKey(entry);
    if (!key) return;
    const stats = readFlashcardStats();
    const record = getFlashcardStatsEntry(stats, key);
    if (!record) return;
    record.listenedCount += 1;
    record.lastHeardAt = Date.now();
    saveFlashcardStats(stats);
  }

  function recordFlashcardSpoken(entry, percent) {
    const key = getFlashcardKey(entry);
    if (!key) return;
    const stats = readFlashcardStats();
    const record = getFlashcardStatsEntry(stats, key);
    if (!record) return;
    const normalizedPercent = Math.max(0, Math.min(100, Number(percent) || 0));
    pushLimited(record.pronunciation, normalizedPercent, FLASHCARD_PRONUNCIATION_LIMIT);
    record.spokenCount += 1;
    record.lastSpokenAt = Date.now();
    saveFlashcardStats(stats);
  }

  function recordFlashcardDuration(entry, durationMs) {
    const key = getFlashcardKey(entry);
    if (!key) return;
    const stats = readFlashcardStats();
    const record = getFlashcardStatsEntry(stats, key);
    if (!record) return;
    const normalizedDuration = Math.max(0, Number(durationMs) || 0);
    pushLimited(record.durations, normalizedDuration, FLASHCARD_TIME_LIMIT);
    saveFlashcardStats(stats);
  }

  function recordFlashcardMetric(entry, metricKey, percent) {
    const key = getFlashcardKey(entry);
    if (!key || !metricKey) return;
    const stats = readFlashcardStats();
    const record = getFlashcardStatsEntry(stats, key);
    if (!record || !Array.isArray(record[metricKey])) return;
    const normalizedPercent = Math.max(0, Math.min(100, Number(percent) || 0));
    pushLimited(record[metricKey], normalizedPercent, FLASHCARD_METRIC_LIMIT);
    saveFlashcardStats(stats);
  }

  function syncMemoryState(record) {
    if (!record) return false;
    let changed = false;
    const now = Date.now();
    if (record.memorySeedingUntil && now >= record.memorySeedingUntil) {
      record.memorySeedingUntil = null;
      record.memoryStreak = 0;
      if (record.memoryStage < 4) {
        record.memoryStage += 1;
      }
      changed = true;
    }
    if (record.memoryMastered && record.memoryStage !== 4) {
      record.memoryStage = 4;
      changed = true;
    }
    return changed;
  }

  function filterSeedingEntries(entries) {
    if (requestedMode !== 'reading') return entries;
    const stats = readFlashcardStats();
    let changed = false;
    const now = Date.now();
    const filtered = entries.filter(entry => {
      const key = getFlashcardKey(entry);
      if (!key) return true;
      const record = getFlashcardStatsEntry(stats, key);
      if (!record) return true;
      if (syncMemoryState(record)) {
        changed = true;
      }
      return !(record.memorySeedingUntil && now < record.memorySeedingUntil);
    });
    if (changed) saveFlashcardStats(stats);
    return filtered;
  }

  function recordMemoryAttempt(entry, wasCorrect) {
    const key = getFlashcardKey(entry);
    if (!key) return;
    const stats = readFlashcardStats();
    const record = getFlashcardStatsEntry(stats, key);
    if (!record) return;
    syncMemoryState(record);
    const now = Date.now();
    if (record.memorySeedingUntil && now < record.memorySeedingUntil) {
      saveFlashcardStats(stats);
      return;
    }

    record.memoryHistory.push(Boolean(wasCorrect));
    while (record.memoryHistory.length > MEMORY_HISTORY_LIMIT) {
      record.memoryHistory.shift();
    }

    if (record.memoryMastered) {
      record.memoryStreak = 10;
      saveFlashcardStats(stats);
      return;
    }

    if (wasCorrect) {
      record.memoryStreak += 1;
    } else {
      record.memoryStreak = 0;
    }

    if (record.memoryStage <= 3 && record.memoryStreak >= 10) {
      const days = MEMORY_SEEDING_DAYS[record.memoryStage] || 3;
      record.memorySeedingUntil = now + days * 24 * 60 * 60 * 1000;
      record.memoryStreak = 0;
    }

    if (record.memoryStage === 4 && record.memoryStreak >= 5) {
      record.memoryMastered = true;
      record.memoryStage = 4;
      record.memoryStreak = 10;
    }

    sessionMemoryHistory.push(Boolean(wasCorrect));
    while (sessionMemoryHistory.length > MEMORY_HISTORY_LIMIT) {
      sessionMemoryHistory.shift();
    }
    saveFlashcardStats(stats);
  }

  function isSpokenCorrect(expected, spoken) {
    const candidates = Array.isArray(spoken) ? spoken : [spoken];
    const percent = candidates.reduce((best, candidate) => (
      Math.max(best, calculateSpeechMatchPercent(expected, candidate))
    ), 0);
    pronunciationSamples.push(percent);
    if (percent < 50) {
      console.info('[speech-compare]', {
        expected,
        spoken: candidates,
        expectedCandidates: getSpeechComparisonCandidates(expected),
        spokenCandidates: candidates.flatMap(candidate => getSpeechComparisonCandidates(candidate)),
        percent
      });
    }
    return {
      percent,
      success: percent >= 50
    };
  }

  function getAccuracyRing(wrapper) {
    if (!wrapper) return null;
    return wrapper.querySelector('.image-ring-accuracy__progress');
  }

  function setAccuracyRingProgress(ring, percent, isVisible) {
    if (!ring) return;
    const clamped = Math.max(0, Math.min(100, percent));
    ring.style.strokeDashoffset = `${ACCURACY_RING_CIRC * (1 - clamped / 100)}`;
    ring.style.opacity = isVisible ? '1' : '0';
  }

  function interpolateRgb(from, to, ratio) {
    const t = Math.max(0, Math.min(1, ratio));
    return from.map((start, index) => Math.round(start + (to[index] - start) * t));
  }

  function getPronunciationRingColor(percent) {
    const clamped = Math.max(0, Math.min(100, Number(percent) || 0));
    const stops = [
      { p: 0, rgb: [112, 8, 34] },
      { p: 40, rgb: [255, 45, 0] },
      { p: 60, rgb: [255, 132, 0] },
      { p: 70, rgb: [255, 196, 0] },
      { p: 75, rgb: [42, 196, 96] },
      { p: 100, rgb: [102, 198, 255] }
    ];
    for (let i = 1; i < stops.length; i += 1) {
      if (clamped <= stops[i].p) {
        const prev = stops[i - 1];
        const next = stops[i];
        const ratio = (clamped - prev.p) / Math.max(1, next.p - prev.p);
        const rgb = interpolateRgb(prev.rgb, next.rgb, ratio);
        return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
      }
    }
    const last = stops[stops.length - 1].rgb;
    return `rgb(${last[0]}, ${last[1]}, ${last[2]})`;
  }

  function animateAccuracyRing(wrapper, percent, options = {}) {
    const ring = getAccuracyRing(wrapper);
    if (!ring) {
      if (typeof options.onPeak === 'function') {
        options.onPeak();
      }
      return Promise.resolve();
    }
    const clamped = Math.max(0, Math.min(100, percent));
    const { onPeak } = options;
    const ringColor = getPronunciationRingColor(clamped);
    ring.style.transition = 'none';
    setAccuracyRingProgress(ring, clamped, true);
    ring.style.stroke = ringColor;
    ring.dataset.currentPercent = `${clamped}`;
    ring.dataset.currentColor = ringColor;
    if (clamped >= 100) {
      playSuccessAudio().catch(() => {});
    }
    if (typeof onPeak === 'function') {
      onPeak();
    }
    return Promise.resolve();
  }

  function normalizeMirrorGroups(data) {
    if (!data || typeof data !== 'object') return [];
    return Object.entries(data).map(([canonical, variants]) => {
      const normalizedCanonical = normalizeSpeechText(canonical);
      const normalizedVariants = Array.isArray(variants) ? variants : [];
      const normalizedList = [normalizedCanonical, ...normalizedVariants.map(normalizeSpeechText)]
        .filter(Boolean);
      const unique = Array.from(new Set(normalizedList));
      unique.sort((a, b) => b.length - a.length);
      return {
        canonical: normalizedCanonical,
        variants: unique
      };
    }).filter(group => group.canonical);
  }

  async function loadMirrorGroups() {
    try {
      const response = await fetch(MIRROR_PATH);
      if (!response.ok) {
        mirrorGroups = [];
        return;
      }
      const data = await response.json();
      mirrorGroups = normalizeMirrorGroups(data);
    } catch (error) {
      mirrorGroups = [];
    }
  }

  function getHeartsRemaining(errorCount) {
    const totalHearts = 5;
    return Math.max(0, totalHearts - errorCount);
  }

  function updateHeartsDisplay() {
    const total = getHeartsTotal(currentMedalKey);
    const remaining = Math.min(Math.max(heartsRemaining, 0), total);
    heartNodes.forEach((node, idx) => {
      node.classList.toggle('game-heart--lost', idx >= total || idx >= remaining);
      const icon = node.querySelector('img');
      if (icon) {
        icon.src = HEART_ICON_URL;
      }
    });
  }

  function isStreakPhase(targetPhase) {
    return targetPhase === 3
      || targetPhase === 5
      || targetPhase === 6
      || targetPhase === 7
      || targetPhase === 8
      || targetPhase === 9
      || targetPhase === 10;
  }

  function awardStreakHeart() {
    const total = getHeartsTotal(currentMedalKey);
    if (currentMedalKey === 'diamante' && heartsRemaining >= total) {
      updateHeartsDisplay();
      return;
    }
    if (heartsRemaining < total) {
      heartsRemaining += 1;
    } else {
      currentMedalKey = MEDAL_UPGRADE[currentMedalKey] || 'bronze';
      heartsRemaining = 1;
      updateMedalHud(currentMedalKey);
      updateFinalMedal(currentMedalKey);
    }
    updateHeartsDisplay();
  }

  function registerMedalResult(levelNumber, medalKey) {
    const levelKey = String(levelNumber);
    const storage = readMedalStorage();
    const existing = storage[levelKey];
    const nextRank = MEDAL_RANKING[medalKey] || 0;
    const currentRank = MEDAL_RANKING[existing] || 0;
    if (!existing || nextRank > currentRank) {
      storage[levelKey] = medalKey;
      saveMedalStorage(storage);
    }
  }

  function applyBoardSizing(targetPhase) {
    if (!board || !textContainer || !choiceRow) return;
    const shouldExpand = targetPhase === 4;
    const isCompact = targetPhase === 1
      || targetPhase === 3
      || targetPhase === 5
      || targetPhase === 6
      || targetPhase === 7
      || targetPhase === 8
      || targetPhase === 11
      || targetPhase === 12;
    board.classList.toggle('board--expanded', shouldExpand);
    board.classList.toggle('board--compact', isCompact);
    textContainer.classList.toggle('text-container--compact', isCompact);
    choiceRow.classList.toggle('choice-row--compact', isCompact);
  }

  function splitPhaseSevenText(message, maxLength = 20) {
    const trimmed = message.trim();
    if (trimmed.length <= maxLength) return [message];
    const midpoint = Math.floor(trimmed.length / 2);
    let splitIndex = -1;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (let i = 0; i < trimmed.length; i += 1) {
      if (trimmed[i] !== ' ') continue;
      const distance = Math.abs(i - midpoint);
      if (distance < bestDistance) {
        bestDistance = distance;
        splitIndex = i;
      }
    }

    if (splitIndex === -1) {
      splitIndex = midpoint;
    }

    const line1 = trimmed.slice(0, splitIndex).trimEnd();
    const line2 = trimmed.slice(trimmed[splitIndex] === ' ' ? splitIndex + 1 : splitIndex).trimStart();
    return [line1, line2].filter(Boolean);
  }

  function buildLevelPhasePaths(dayNumber, phaseNumber) {
    return [
      LOCAL_LEVEL_API_PATH
        .replace('{day}', encodeURIComponent(String(dayNumber)))
        .replace('{phase}', encodeURIComponent(String(phaseNumber)))
    ];
  }

  function buildLevelPhasePaths(dayNumber, phaseNumber) {
    const folderName = getLocalLevelsFolderFromPhaseNumber(phaseNumber);
    const fileName = `day-${dayNumber}.json`;
    return [
      `Niveis/${folderName}/${fileName}`,
      LOCAL_LEVEL_API_PATH
        .replace('{day}', encodeURIComponent(String(dayNumber)))
        .replace('{phase}', encodeURIComponent(String(phaseNumber)))
    ];
  }

  function getPhaseFolderCode(phaseNumber) {
    if (Number(phaseNumber) === 11) return '011';
    if (Number(phaseNumber) === 12) return '012';
    return '001';
  }

  function getPhaseCacheKey(dayNumber, phaseNumber) {
    return `${FLUENCY_PHASE_CACHE_PREFIX}:${String(dayNumber).padStart(3, '0')}:${getPhaseFolderCode(phaseNumber)}`;
  }

  function readCachedPhaseData(dayNumber, phaseNumber) {
    try {
      const raw = localStorage.getItem(getPhaseCacheKey(dayNumber, phaseNumber));
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' && parsed.data ? parsed.data : parsed;
    } catch (error) {
      return null;
    }
  }

  function writeCachedPhaseData(dayNumber, phaseNumber, data) {
    try {
      localStorage.setItem(getPhaseCacheKey(dayNumber, phaseNumber), JSON.stringify({
        savedAt: Date.now(),
        day: Number(dayNumber) || 1,
        folder: getPhaseFolderCode(phaseNumber),
        data
      }));
    } catch (error) {
      // ignore storage limits
    }
  }

  function toPhaseDataResult(data) {
    const metadata = data && typeof data === 'object'
      ? {
        soundtrack: typeof data.soundtrack === 'string' ? data.soundtrack.trim() : '',
        level: typeof data.level === 'string' ? data.level : '',
        characters: Array.isArray(data.characters) ? data.characters : []
      }
      : {};
    if (Array.isArray(data)) return { entries: data, metadata };
    if (data && Array.isArray(data.items)) return { entries: data.items, metadata };
    if (data && Array.isArray(data.entries)) return { entries: data.entries, metadata };
    if (data && Array.isArray(data.phrases)) return { entries: data.phrases, metadata };
    return { entries: [], metadata };
  }

  function normalizePhaseEntries(entries, phaseNumber) {
    if (!Array.isArray(entries)) return [];
    return entries
      .map(normalizeImageEntry)
      .filter(entry => {
        if (!entry) return false;
        if (phaseNumber >= 9) {
          return Boolean(getEntrySentence(entry));
        }
        return Boolean(entry.file && entry.en);
      });
  }

  async function fetchLevelPhaseData(dayNumber, phaseNumber) {
    const cachedData = readCachedPhaseData(dayNumber, phaseNumber);
    if (cachedData) {
      return toPhaseDataResult(cachedData);
    }

    const candidates = buildLevelPhasePaths(dayNumber, phaseNumber);
    for (const path of candidates) {
      try {
        const response = await fetch(encodeURI(path));
        if (!response.ok) continue;
        const data = await response.json();
        writeCachedPhaseData(dayNumber, phaseNumber, data);
        return toPhaseDataResult(data);
      } catch (error) {
        // ignore and keep trying
      }
    }
    return null;
  }

  async function loadDayLevels(dayNumber) {
    if (levelCache.has(dayNumber)) {
      const cached = levelCache.get(dayNumber);
      dayPhaseEntries = new Map(cached.entries);
      dayPhaseMeta = new Map(cached.meta || []);
      baseDayPhaseSequence = cached.sequence.slice();
      hasCustomJourneySequence = Boolean(cached.hasCustomJourneySequence);
      customPhaseOverrides.forEach((override, phaseNumber) => {
        applyCustomPhaseData(phaseNumber, override, override.sourceLabel || 'JSON personalizado');
      });
      applyDevicePhaseSequence();
      if (!customPhaseOverrides.size) {
        dayEntries = cached.allEntries.slice();
      } else {
        rebuildDayEntriesFromPhases();
      }
      return;
    }

    const entries = new Map();
    const meta = new Map();
    const sequence = [];
    const allEntries = [];

    for (let phaseNumber = 1; phaseNumber <= MAX_PHASE; phaseNumber += 1) {
      const phaseData = await fetchLevelPhaseData(dayNumber, phaseNumber);
      if (!phaseData) continue;
      const normalized = normalizePhaseEntries(phaseData.entries, phaseNumber);
      if (!normalized.length) continue;
      entries.set(phaseNumber, normalized);
      meta.set(phaseNumber, phaseData.metadata || {});
      sequence.push(phaseNumber);
      allEntries.push(...normalized);
    }

    hasCustomJourneySequence = false;
    dayPhaseEntries = entries;
    dayPhaseMeta = meta;
    baseDayPhaseSequence = sequence.slice().sort((left, right) => left - right);
    customPhaseOverrides.forEach((override, phaseNumber) => {
      applyCustomPhaseData(phaseNumber, override, override.sourceLabel || 'JSON personalizado');
    });
    applyDevicePhaseSequence();
    if (!customPhaseOverrides.size) {
      dayEntries = allEntries;
    } else {
      rebuildDayEntriesFromPhases();
    }
    levelCache.set(dayNumber, {
      entries: new Map(entries),
      meta: new Map(meta),
      sequence: baseDayPhaseSequence.slice(),
      allEntries: allEntries.slice(),
      hasCustomJourneySequence: false
    });
  }

  function loadWritingPools() {
    if (writingPools) return Promise.resolve(writingPools);
    if (writingPoolsPromise) return writingPoolsPromise;
    const load = (path) => fetch(path)
      .then(response => (response.ok ? response.json() : []))
      .catch(() => []);
    writingPoolsPromise = Promise.all([
      load(WRITING_POOLS_PATHS.micro),
      load(WRITING_POOLS_PATHS.verbs),
      load(WRITING_POOLS_PATHS.nouns),
      load(WRITING_POOLS_PATHS.adjectives)
    ])
      .then(([micro, verbs, nouns, adjectives]) => {
        writingPools = {
          micro: Array.isArray(micro) ? micro : [],
          verbs: Array.isArray(verbs) ? verbs : [],
          nouns: Array.isArray(nouns) ? nouns : [],
          adjectives: Array.isArray(adjectives) ? adjectives : []
        };
        return writingPools;
      })
      .catch(() => {
        writingPools = { micro: [], verbs: [], nouns: [], adjectives: [] };
        return writingPools;
      });
    return writingPoolsPromise;
  }

  function loadJourneyData(dayNumber = level) {
    return Promise.all([
      loadDayLevels(dayNumber),
      loadWritingPools(),
      loadMirrorGroups()
    ]);
  }

  function buildImageSrc(entry) {
    const fileName = entry?.file;
    return buildImageSrcFromName(fileName);
  }

  function filterPool() {
    const phaseEntries = dayPhaseEntries.get(phase) || [];
    pool = filterSeedingEntries(phaseEntries);
  }

  function shuffle(list) {
    const arr = list.slice();
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function shouldUseOrderedCycle(targetPhase = phase) {
    return isWatchingPhase(targetPhase) || isTalkingPhase(targetPhase);
  }

  function buildCycleForPhase(sourcePool, targetPhase = phase) {
    const base = Array.isArray(sourcePool) ? sourcePool.slice() : [];
    if (!shouldUseOrderedCycle(targetPhase)) {
      return shuffle(base);
    }
    return base
      .map((entry, position) => ({ entry, position }))
      .sort((a, b) => {
        const aId = Number(a.entry?.id);
        const bId = Number(b.entry?.id);
        const aHasId = Number.isFinite(aId);
        const bHasId = Number.isFinite(bId);
        if (aHasId && bHasId && aId !== bId) return aId - bId;
        if (aHasId !== bHasId) return aHasId ? -1 : 1;
        return a.position - b.position;
      })
      .map(item => item.entry);
  }

  function resetProgress() {
    index = 0;
    score = 0;
    errorStreak = 0;
    attemptCount = 0;
    currentItem = null;
    completionGridShown = false;
    cycle = buildCycleForPhase(pool, phase);
    phaseFourBatchStart = 0;
    phaseFourBatch = [];
    phaseFourExpectedIndex = 0;
    phaseFourResolved = 0;

    if (!cycle.length) {
      const message = dayPhaseSequence.length
        ? 'Nenhuma frase disponivel para esta fase.'
        : 'Aula nao encontrada';
      showText(message);
    }

    updateProgressBar();
  }

  function resetLevelState() {
    totalErrors = 0;
    currentMedalKey = 'diamante';
    heartsRemaining = getHeartsTotal(currentMedalKey);
    updateHeartsDisplay();
    updateMedalHud(currentMedalKey);
    updateFinalMedal(currentMedalKey);
    pronunciationSamples = [];
    sessionMemoryHistory = [];
    resetSessionSeenImages();
    journeyRunStats = createEmptyJourneyStats();
  }

  function markJourneyStarted() {
    localStorage.setItem(JOURNEY_STARTED_KEY, 'true');
  }

  function clearJourneyStarted() {
    localStorage.removeItem(JOURNEY_STARTED_KEY);
  }

  function getPhaseStepCount(phaseNumber) {
    const items = dayPhaseEntries.get(phaseNumber);
    return Array.isArray(items) ? items.length : 0;
  }

  function getJourneyTotalSteps() {
    if (!Array.isArray(dayPhaseSequence) || !dayPhaseSequence.length) return 0;
    return dayPhaseSequence.reduce((total, phaseNumber) => total + getPhaseStepCount(phaseNumber), 0);
  }

  function getCurrentPhaseStepProgress() {
    if (phase === 4) {
      return Math.max(0, phaseFourResolved);
    }
    return Math.max(0, score);
  }

  function getJourneyCompletedSteps() {
    if (!Array.isArray(dayPhaseSequence) || !dayPhaseSequence.length) return 0;
    const completedBefore = dayPhaseSequence
      .slice(0, Math.max(0, journeyPhaseIndex))
      .reduce((total, phaseNumber) => total + getPhaseStepCount(phaseNumber), 0);
    return completedBefore + getCurrentPhaseStepProgress();
  }

  function emitJourneyProgress() {
    const totalSteps = getJourneyTotalSteps();
    const completedSteps = Math.max(0, Math.min(totalSteps || 0, getJourneyCompletedSteps()));
    const totalPhases = dayPhaseSequence.length;
    const currentPhasePosition = totalPhases ? Math.min(totalPhases, journeyPhaseIndex + 1) : 1;
    const percent = totalSteps > 0
      ? Math.max(0, Math.min(100, Math.round((completedSteps / totalSteps) * 100)))
      : 0;
    document.dispatchEvent(new CustomEvent('playtalk:journey-progress', {
      detail: {
        totalPhases,
        currentPhasePosition,
        totalSteps,
        completedSteps,
        percent
      }
    }));
  }

  function updateProgressBar() {
    if (!progressFill) return;
    if (phase === 4) {
      const total = Math.max(phaseFourBatch.length, 1);
      const percent = Math.min(100, Math.round((phaseFourResolved / total) * 100));
      progressFill.style.width = `${percent}%`;
      if (feedbackProgress) {
        feedbackProgress.hidden = !isCardsLaunch;
        feedbackProgress.setAttribute('aria-valuenow', String(percent));
      }
      if (feedbackProgressFill) {
        feedbackProgressFill.style.width = `${percent}%`;
      }
      persistProgressState();
      emitJourneyProgress();
      return;
    }
    const total = Math.max(cycle.length, 1);
    const percent = Math.min(100, Math.round((score / total) * 100));
    progressFill.style.width = `${percent}%`;
    if (feedbackProgress) {
      feedbackProgress.hidden = !isCardsLaunch;
      feedbackProgress.setAttribute('aria-valuenow', String(percent));
    }
    if (feedbackProgressFill) {
      feedbackProgressFill.style.width = `${percent}%`;
    }
    persistProgressState();
    emitJourneyProgress();
  }

  function persistProgressState() {
    if (!gameStarted || isSingleModeSession()) return;
    saveProgressStorage({
      level,
      phase,
      index,
      score,
      errorStreak,
      attemptCount,
      correctStreak,
      totalErrors,
      medalKey: currentMedalKey,
      heartsRemaining,
      cycle: cycle.map(item => getEntryStorageKey(item)),
      levelElapsedMs: getLevelElapsedMs(),
      phaseFour: phase === 4 ? {
        batchStart: phaseFourBatchStart,
        resolved: phaseFourResolved
      } : null,
      journeyPhaseSequence: dayPhaseSequence.slice(),
      journeyPhaseIndex,
      journeyTotalSteps: getJourneyTotalSteps(),
      journeyCompletedSteps: getJourneyCompletedSteps()
    });
  }

  function getEntryStorageKey(entry) {
    if (!entry || typeof entry !== 'object') return '';
    return entry.file || getEntrySentence(entry) || entry.en || entry.nomeIngles || '';
  }

  function buildCycleFromFiles(files) {
    if (!Array.isArray(files) || !files.length) return [];
    const knownEntries = new Map(
      [...pool, ...dayEntries]
        .filter(entry => entry)
        .map(entry => [getEntryStorageKey(entry), entry])
    );

    return files
      .map(file => knownEntries.get(file))
      .filter(Boolean);
  }

  function restoreProgressState() {
    const stored = readProgressStorage();
    if (!stored || !stored.level || !stored.phase || !Array.isArray(stored.cycle)) {
      return false;
    }

    level = stored.level;
    phase = stored.phase;
    const storedJourneySequence = Array.isArray(stored.journeyPhaseSequence)
      ? stored.journeyPhaseSequence
        .map(value => Number.parseInt(value, 10))
        .filter(value => Number.isFinite(value) && value >= 1 && value <= MAX_PHASE)
      : [];
    if (storedJourneySequence.length) {
      dayPhaseSequence = storedJourneySequence;
      baseDayPhaseSequence = storedJourneySequence.slice();
      hasCustomJourneySequence = true;
    }
    if (dayPhaseSequence.length && !dayPhaseSequence.includes(phase)) {
      phase = dayPhaseSequence[0];
    }
    const storedJourneyIndex = Number.parseInt(stored.journeyPhaseIndex, 10);
    journeyPhaseIndex = Number.isFinite(storedJourneyIndex)
      ? Math.min(Math.max(storedJourneyIndex, 0), Math.max(dayPhaseSequence.length - 1, 0))
      : 0;
    index = Math.max(0, Number(stored.index) || 0);
    score = Math.max(0, Number(stored.score) || 0);
    errorStreak = Math.max(0, Number(stored.errorStreak) || 0);
    attemptCount = Math.max(0, Number(stored.attemptCount) || 0);
    correctStreak = Math.max(0, Number(stored.correctStreak) || 0);
    totalErrors = Math.max(0, Number(stored.totalErrors) || 0);
    resumeLevelTimer(stored.levelElapsedMs);

    updateLevelIndicators();
    updatePhaseLabel();
    updateRecognitionLanguage(phase);
    applyBoardSizing(phase);
    filterPool();
    cycle = buildCycleFromFiles(stored.cycle);

    if (!cycle.length) {
      cycle = buildCycleForPhase(pool, phase);
    }

    const total = Math.max(cycle.length, 1);
    score = Math.min(score, total);
    index = Math.min(index, total);

    currentMedalKey = normalizeMedalKey(stored.medalKey || getMedalForErrors(totalErrors));
    const totalHearts = getHeartsTotal(currentMedalKey);
    heartsRemaining = Number.isFinite(stored.heartsRemaining)
      ? Math.min(Math.max(Number(stored.heartsRemaining), 0), totalHearts)
      : totalHearts;
    updateHeartsDisplay();
    updateMedalHud(currentMedalKey);
    updateFinalMedal(currentMedalKey);
    const phaseFourState = stored.phaseFour && typeof stored.phaseFour === 'object' ? stored.phaseFour : null;
    if (phase === 4) {
      const batchStart = Number.isFinite(phaseFourState?.batchStart) ? phaseFourState.batchStart : 0;
      const resolved = Number.isFinite(phaseFourState?.resolved) ? phaseFourState.resolved : 0;
      phaseFourBatchStart = Math.max(0, batchStart);
      phaseFourResolved = Math.max(0, resolved);
      phaseFourExpectedIndex = phaseFourResolved;
      phaseFourBatch = cycle.slice(phaseFourBatchStart, phaseFourBatchStart + PHASE_FOUR_BATCH_SIZE);
    }
    updateProgressBar();
    completionGridShown = false;
    awaiting = false;
    return true;
  }

  function registerErrorAndCheckReset() {
    errorStreak += 1;
    totalErrors += 1;
    heartsRemaining = Math.max(0, heartsRemaining - 1);
    if (heartsRemaining === 0) {
      const nextMedal = MEDAL_DOWNGRADE[currentMedalKey] || 'bronze';
      if (nextMedal !== currentMedalKey) {
        currentMedalKey = nextMedal;
        heartsRemaining = getHeartsTotal(currentMedalKey);
        updateMedalHud(currentMedalKey);
        updateFinalMedal(currentMedalKey);
      }
    }
    updateHeartsDisplay();
    return false;
  }

  function registerAttemptAndCheckAutoCorrect() {
    attemptCount += 1;
    return false;
  }

  function setRoundFeedbackState(state = 'none') {
    if (!gameFeedback) return;
    const normalized = state === 'hit' || state === 'miss' ? state : 'none';
    gameFeedback.dataset.feedback = normalized;
  }

  function applyCorrectOutcome(options = {}) {
    const { awardCoins = true } = options;
    errorStreak = 0;
    attemptCount = 0;
    setRoundFeedbackState('hit');
    if (awardCoins) {
      const reward = getCurrentPhaseCoinReward(phase);
      pendingPhaseCoinAward += reward;
      awardPhaseCoins(phase, reward);
    }
    if (phase === 9) {
      registerPhaseTypingResult(true);
    }
    score += 1;
    index += 1;
  }

  function applyIncorrectOutcome() {
    attemptCount = 0;
    setRoundFeedbackState('miss');
    if (phase === 9) {
      registerPhaseTypingResult(false);
    }
    score += 1;
    index += 1;
  }

  function buildGoogleTtsUrl(text) {
    const query = encodeURIComponent(text || '');
    return `https://translate.google.com/translate_tts?ie=UTF-8&client=gtx&tl=en&q=${query}`;
  }

  function speak(text) {
    if (isGamePaused || !text || !('speechSynthesis' in window) || typeof SpeechSynthesisUtterance !== 'function') {
      return Promise.resolve(false);
    }
    return new Promise(resolve => {
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'en-US';
      utter.rate = 0.95;
      utter.onend = () => resolve(true);
      utter.onerror = () => resolve(false);
      try {
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utter);
      } catch (error) {
        resolve(false);
      }
    });
  }

  function createTapSkipListener(onSkip) {
    if (typeof onSkip !== 'function') return () => {};
    let taps = 0;

    const handleTap = () => {
      taps += 1;
      if (taps >= AUDIO_SKIP_TAP_COUNT) {
        cleanup();
        onSkip();
      }
    };

    const cleanup = () => {
      document.removeEventListener('pointerdown', handleTap);
    };

    document.addEventListener('pointerdown', handleTap);
    return cleanup;
  }

  function getCachedAudioElement(src) {
    if (!src) return null;
    const cached = audioElementCache.get(src) || new Audio(src);
    audioElementCache.set(src, cached);
    return cached;
  }

  function playAudioSource(src, options = {}) {
    if (!src) return Promise.reject(new Error('No audio source available'));
    if (isGamePaused) return Promise.resolve(false);

    return new Promise((resolve, reject) => {
      const {
        rate = 1,
        preservePitch = true,
        allowSkip = false,
        onSkip,
        countListeningEnglish = false
      } = options;
      const cachedAudio = getCachedAudioElement(src);
      let listeningCounted = false;
      const markListening = () => {
        if (!countListeningEnglish || listeningCounted) return;
        listeningCounted = true;
        registerPhaseListeningEnglish();
      };
      activeAudioSource = cachedAudio;
      cachedAudio.pause();
      cachedAudio.currentTime = 0;
      cachedAudio.loop = false;
      cachedAudio.playbackRate = rate;
      if (preservePitch) {
        cachedAudio.preservesPitch = true;
        cachedAudio.mozPreservesPitch = true;
        cachedAudio.webkitPreservesPitch = true;
      }

      const cleanup = () => {
        cachedAudio.removeEventListener('ended', handleEnded);
        cachedAudio.removeEventListener('error', handleError);
        if (activeAudioSource === cachedAudio) {
          activeAudioSource = null;
        }
        if (cleanupSkip) cleanupSkip();
      };

      const handleSkip = () => {
        markListening();
        cachedAudio.pause();
        cachedAudio.currentTime = 0;
        cleanup();
        if (typeof onSkip === 'function') {
          onSkip();
        }
        resolve(true);
      };

      const handleEnded = () => {
        cleanup();
        resolve(true);
      };

      const handleError = () => {
        cleanup();
        reject(new Error('Audio playback failed'));
      };

      cachedAudio.addEventListener('ended', handleEnded);
      cachedAudio.addEventListener('error', handleError);
      const cleanupSkip = allowSkip ? createTapSkipListener(handleSkip) : null;

      const playResult = cachedAudio.play();
      if (playResult && typeof playResult.then === 'function') {
        playResult.then(markListening).catch(handleError);
      } else {
        markListening();
      }
    });
  }

  function playGoogleTts(text, options = {}) {
    if (!text) return Promise.resolve(false);
    const url = buildGoogleTtsUrl(text);
    return playAudioSource(url, options);
  }

  function playPronunciation(entry, options = {}) {
    const audioSrc = buildAudioSrc(entry);
    const text = typeof entry === 'string' ? entry : entry?.en || '';
    const mergedOptions = {
      ...options,
      rate: Number.isFinite(options?.rate) ? Number(options.rate) : getCurrentPlaybackRate()
    };

    if (entry && typeof entry === 'object') {
      recordFlashcardHeard(entry);
    }

    if (audioSrc) {
      // When mp3 exists, do not fallback to synthesized narration.
      return playAudioSource(audioSrc, { ...mergedOptions, countListeningEnglish: true }).catch(() => false);
    }

    return speak(text).then((spoken) => {
      if (spoken) {
        registerPhaseListeningEnglish();
        return true;
      }
      return playGoogleTts(text, mergedOptions);
    });
  }

  function triggerTypingTapFeedback() {
    if (isGamePaused) return;
    playAudioSource(PHASE_NINE_TYPE_SOUND_SRC).catch(() => {});
    if (!gameRoot) return;
    gameRoot.classList.remove('typing-tap-flash');
    void gameRoot.offsetWidth;
    gameRoot.classList.add('typing-tap-flash');
    if (typingTapFlashTimer) {
      window.clearTimeout(typingTapFlashTimer);
    }
    typingTapFlashTimer = window.setTimeout(() => {
      gameRoot.classList.remove('typing-tap-flash');
      typingTapFlashTimer = null;
    }, PHASE_NINE_TAP_FLASH_MS);
  }

  function shouldShowMicPrompt() {
    return !localStorage.getItem(MIC_PROMPT_STORAGE_KEY);
  }

  function stopMicPromptLoop() {
    if (micPromptTimer) {
      clearInterval(micPromptTimer);
      micPromptTimer = null;
    }
  }

  function startMicPromptLoop() {
    if (!micAudio) return;
    stopMicPromptLoop();
    playAudioElement(micAudio).catch(() => {});
    micPromptTimer = window.setInterval(() => {
      playAudioElement(micAudio).catch(() => {});
    }, 15000);
  }

  function getRandomPromptItem() {
    const source = pool.length ? pool : dayEntries;
    if (!source.length) return null;
    return source[Math.floor(Math.random() * source.length)];
  }

  function getBrowserSpeechRecognitionCtor() {
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }

  function getNativeSpeechRecognition() {
    return null;
  }

  function getSilentOpenAiSpeechCapture() {
    const openAiStt = window.PlaytalkOpenAiStt;
    if (!openAiStt) return null;
    if (typeof openAiStt.isNativeRuntime !== 'function' || !openAiStt.isNativeRuntime()) {
      return null;
    }
    if (typeof openAiStt.captureAndTranscribe !== 'function') return null;
    if (typeof openAiStt.isSupported !== 'function' || !openAiStt.isSupported()) {
      return null;
    }
    return openAiStt;
  }

  function getPreferredSpeechCapture() {
    return getSilentOpenAiSpeechCapture();
  }

  function getRecognitionLanguage(targetPhase = phase) {
    return isTalkingPhase(targetPhase) ? getMode12RecognitionLanguage() : 'en-US';
  }

  function clearMicAutoStartTimer() {
    if (!micAutoStartTimer) return;
    window.clearTimeout(micAutoStartTimer);
    micAutoStartTimer = null;
  }

  function shouldAutoStartMicAction() {
    return Boolean(
      micContinuousMode
      && micPersistentEnabled
      && !awaiting
      && !isGamePaused
      && !isTalkingPhase()
      && typeof currentMicAction === 'function'
    );
  }

  function scheduleMicAutoStart(delayMs = 220) {
    clearMicAutoStartTimer();
    if (!shouldAutoStartMicAction()) return;
    micAutoStartTimer = window.setTimeout(() => {
      micAutoStartTimer = null;
      if (!shouldAutoStartMicAction()) return;
      currentMicAction();
    }, Math.max(0, Number(delayMs) || 0));
  }

  function primeMicrophonePermission() {
    if (micPermissionPromise) return micPermissionPromise;

    const rememberPermissionAttempt = (promise) => {
      micPermissionPromise = Promise.resolve(promise)
        .then((granted) => {
          const resolved = Boolean(granted);
          if (!resolved) {
            micPermissionPromise = null;
          }
          return resolved;
        })
        .catch(() => {
          micPermissionPromise = null;
          return false;
        });
      return micPermissionPromise;
    };

    const silentOpenAi = getSilentOpenAiSpeechCapture();
    if (silentOpenAi && typeof silentOpenAi.requestMicrophoneAccess === 'function') {
      return rememberPermissionAttempt(silentOpenAi.requestMicrophoneAccess());
    }

    const nativeSpeech = getNativeSpeechRecognition();
    if (nativeSpeech && typeof nativeSpeech.ensurePermissions === 'function') {
      return rememberPermissionAttempt(nativeSpeech.ensurePermissions());
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      micPermissionPromise = null;
      return Promise.resolve(false);
    }
    return rememberPermissionAttempt(
      navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })
        .then(stream => {
          stream.getTracks().forEach(track => track.stop());
          return true;
        })
    );
  }

  function requestMicrophoneAccess() {
    if (isGamePaused) return Promise.resolve(false);
    if (getPreferredSpeechCapture()) {
      return primeMicrophonePermission().catch(() => false);
    }
    if (!recognition) return Promise.resolve(true);
    return primeMicrophonePermission().catch(() => false);
  }
  function showMicActivationPrompt() {
    return new Promise(resolve => {
      const promptItem = getRandomPromptItem();
      if (!promptItem || !boardInner) {
        resolve();
        return;
      }

      awaiting = true;
      clearBoard();
      boardInner.classList.remove('board__inner--grid');

      const container = document.createElement('div');
      container.className = 'board__mic-prompt';

      const img = document.createElement('img');
      img.src = buildImageSrc(promptItem);
      img.alt = promptItem.en || 'Microfone';
      img.className = 'board__image-single board__mic-image';
      applyImageStyling(img, promptItem.file);

      const imageHolder = document.createElement('div');
      imageHolder.className = 'board__mic-button';
      imageHolder.appendChild(img);

      const text = document.createElement('p');
      text.className = 'board__mic-text';
      text.innerHTML = 'use o botao de microfone<br>no rodape';

      container.appendChild(imageHolder);
      container.appendChild(text);
      boardInner.appendChild(container);

      if (choiceRow) choiceRow.innerHTML = '';
      showText('');
      startMicPromptLoop();

      const handleActivate = () => {
        if (isGamePaused) return;
        setMicControlActive(true);
        stopMicPromptLoop();
        requestMicrophoneAccess().then((granted) => {
          setMicControlActive(false);
          if (!granted) {
            startMicPromptLoop();
            return;
          }
          localStorage.setItem(MIC_PROMPT_STORAGE_KEY, 'true');
          if (micButton) {
            micButton.removeEventListener('click', handleActivate);
          }
          awaiting = false;
          resolve();
        });
      };

      if (micButton) {
        micButton.addEventListener('click', handleActivate);
      }
      setMicControlAction(null);
    });
  }

  function showText(message) {
    if (!textContainer) return;
    if (!message) {
      textContainer.textContent = '';
      textContainer.classList.remove('text-container--split');
      textContainer.classList.remove('text-container--phase-eight-animate');
      textContainer.classList.toggle('active', false);
      return;
    }

    const shouldAnimateText = phase === 7 || phase === 8;
    if (phase === 8 && message.length > 20) {
      const lines = splitPhaseSevenText(message);
      textContainer.innerHTML = '';
      textContainer.appendChild(document.createTextNode(lines[0] || ''));
      if (lines[1]) {
        textContainer.appendChild(document.createElement('br'));
        textContainer.appendChild(document.createTextNode(lines[1]));
      }
      textContainer.classList.add('text-container--split');
    } else {
      textContainer.textContent = message;
      textContainer.classList.remove('text-container--split');
    }

    textContainer.classList.toggle('active', true);
    if (shouldAnimateText) {
      textContainer.classList.remove('text-container--phase-eight-animate');
      void textContainer.offsetWidth;
      textContainer.classList.add('text-container--phase-eight-animate');
    } else {
      textContainer.classList.remove('text-container--phase-eight-animate');
    }
  }

  function renderWithDissolve(renderer) {
    if (typeof renderer !== 'function') return;
    if (!boardInner) {
      renderer();
      return;
    }

    boardInner.style.opacity = '1';
    renderer();
  }

  function clearPhaseEightTimeout() {
    if (phaseEightTimeout) {
      window.clearTimeout(phaseEightTimeout);
      phaseEightTimeout = null;
    }
  }

  function schedulePhaseEightTimeout() {
    clearPhaseEightTimeout();
    phaseEightTimeout = window.setTimeout(() => {
      if (phase !== 8 || awaiting) return;
      registerErrorAndCheckReset();
      applyIncorrectOutcome();
      updateProgressBar();
      advanceCycle();
    }, PHASE_EIGHT_TEXT_ANIMATION_MS);
  }

  function clearWritingColorCycle() {
    if (writingColorTimer) {
      window.clearInterval(writingColorTimer);
      writingColorTimer = null;
    }
  }

  function getNextWritingColorClass(currentClass) {
    const index = WRITING_COLOR_CLASSES.indexOf(currentClass);
    if (index === -1) return WRITING_COLOR_CLASSES[0];
    return WRITING_COLOR_CLASSES[(index + 1) % WRITING_COLOR_CLASSES.length];
  }

  function rotateWritingChipColors() {
    if (!writingState) return;
    writingState.chips.forEach((chip, idx) => {
      const nextClass = getNextWritingColorClass(chip.colorClass);
      chip.colorClass = nextClass;
      const button = choiceRow && choiceRow.querySelector(`.writing-chip[data-index="${idx}"]`);
      if (button) {
        WRITING_COLOR_CLASSES.forEach(colorClass => button.classList.remove(colorClass));
        button.classList.add(nextClass);
      }
    });
    if (writingState.selectedWords.length) {
      writingState.selectedWords = writingState.selectedWords.map(entry => ({
        ...entry,
        colorClass: writingState.chips[entry.chipIndex]?.colorClass || entry.colorClass
      }));
      renderWritingDisplay(writingState.selectedWords, { highlight: false });
    }
  }

  function startWritingColorCycle() {
    clearWritingColorCycle();
    writingColorTimer = window.setInterval(() => {
      rotateWritingChipColors();
    }, WRITING_COLOR_CYCLE_MS);
  }

  function clearWritingState() {
    clearWritingColorCycle();
    if (typingTapFlashTimer) {
      window.clearTimeout(typingTapFlashTimer);
      typingTapFlashTimer = null;
    }
    gameRoot.classList.remove('typing-tap-flash');
    if (typeof writingCleanup === 'function') {
      writingCleanup();
    }
    writingCleanup = null;
    writingState = null;
    if (textContainer) {
      textContainer.classList.remove(
        'text-container--writing',
        'text-container--writing-feedback',
        'text-container--writing-dissolve'
      );
    }
  }

  function startRotatingText() {
    if (!rotatingText) return;
    rotatingText.textContent = 'Jornada Fluent LevelUp';
    rotatingText.classList.remove('is-fading');
    if (rotationTimer) {
      window.clearInterval(rotationTimer);
      rotationTimer = null;
    }
  }

  function clearBoard() {
    phaseNarrationToken += 1;
    clearPhaseEightTimeout();
    clearWritingState();
    mode12BackAction = null;
    mode12AdvanceAction = null;
    setMicPersistentEnabled(false);
    setMicControlAction(null);
    if (textContainer) {
      textContainer.classList.remove('text-container--media-caption');
      if (textContainerHomeParent && textContainer.parentNode !== textContainerHomeParent) {
        if (textContainerHomeNextSibling && textContainerHomeNextSibling.parentNode === textContainerHomeParent) {
          textContainerHomeParent.insertBefore(textContainer, textContainerHomeNextSibling);
        } else {
          textContainerHomeParent.appendChild(textContainer);
        }
      }
    }
    if (boardInner) boardInner.innerHTML = '';
    if (choiceRow) choiceRow.innerHTML = '';
  }

  function hidePhaseElements() {
    board.classList.add('board--hidden', 'hidden-phase');
    textContainer.classList.add('hidden-phase');
    choiceRow.classList.add('hidden-phase');
  }

  function showPhaseElements() {
    board.classList.remove('board--hidden', 'hidden-phase');
    textContainer.classList.remove('hidden-phase');
    choiceRow.classList.remove('hidden-phase');
  }

  async function playPhaseIntro(nextPhase, options = {}) {
    await loadAudioLevelsConfig();
    const audioName = getPhaseAudioName(level, nextPhase);
    if (!audioName) return false;
    const audio = await getAudioElementFromName(audioName);
    if (!audio) return false;
    const listened = hasListenedPhaseAudio(level, nextPhase);
    audio.addEventListener('ended', () => markPhaseAudioListened(level, nextPhase), { once: true });
    const allowSkip = listened && options.allowSkip !== false;
    const { allowSkip: _ignored, ...rest } = options;
    return playAudioElement(audio, { ...rest, allowSkip });
  }

  function preparePhaseIntro() {
    hidePhaseElements();
    showText('');
    clearBoard();
    if (choiceRow) choiceRow.innerHTML = '';
  }

  function getRandomWrongItem(excludeFile) {
    const options = pool.filter(entry => entry.file !== excludeFile);
    if (!options.length) return null;
    return options[Math.floor(Math.random() * options.length)];
  }

  function showPhaseOneCard(item) {
    currentItem = item;
    recordFlashcardPlayed(item);
    clearBoard();
    boardInner.classList.remove('board__inner--grid');
    const imageWrapper = createEntryImage(item, 'board__image-single board__image-single--phase-one');
    boardInner.appendChild(imageWrapper);

    const wrongItem = getRandomWrongItem(item.file) || item;
    const options = shuffle([
      { label: item.pt || item.en, correct: true },
      { label: wrongItem.pt || wrongItem.en, correct: false }
    ]);

    choiceRow.innerHTML = '';
    options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.textContent = opt.label;
      btn.addEventListener('click', () => handlePhaseOneChoice(btn, opt.correct));
      choiceRow.appendChild(btn);
      scheduleButtonTextFit(btn, 16);
    });

  }

  function handlePhaseOneChoice(btn, correct) {
    if (awaiting) return;
    awaiting = true;
    choiceRow.querySelectorAll('button').forEach(b => { b.disabled = true; });
    let audio = correct ? successAudio : errorAudio;

    if (correct) {
      btn.classList.add('success');
      applyCorrectOutcome();
    } else {
      const autoCorrect = registerAttemptAndCheckAutoCorrect();
      if (autoCorrect) {
        btn.classList.add('success');
        applyCorrectOutcome();
        audio = successAudio;
      } else {
        btn.classList.add('error');
        registerErrorAndCheckReset();
        applyIncorrectOutcome();
        audio = errorAudio;
      }
    }

    updateProgressBar();
    playPronunciation(currentItem);
    playFeedbackAudio(audio);
    setTimeout(() => {
      awaiting = false;
      advanceCycle();
    }, getAdvanceDelay(1000));
  }

  function buildPhaseOptions(item, totalOptions = 4) {
    const wrongPool = pool.filter(entry => entry.file !== item.file);
    const wrongChoices = shuffle(wrongPool).slice(0, totalOptions - 1);

    while (wrongChoices.length < totalOptions - 1 && wrongPool.length) {
      const filler = wrongPool[Math.floor(Math.random() * wrongPool.length)];
      wrongChoices.push(filler);
    }

    while (wrongChoices.length < totalOptions - 1) {
      wrongChoices.push(item);
    }

    const options = [
      { ...item, correct: true },
      ...wrongChoices.slice(0, totalOptions - 1).map(choice => ({ ...choice, correct: false }))
    ];

    return shuffle(options).slice(0, totalOptions);
  }

  function showPhaseTwoCards(item) {
    currentItem = item;
    recordFlashcardPlayed(item);
    clearBoard();
    boardInner.classList.add('board__inner--grid');
    const selection = buildPhaseOptions(item, 4);

    selection.forEach(entry => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'grid-card grid-card--enter';
      card.dataset.correct = String(entry.correct === true);
      const imageWrapper = createEntryImage(entry, 'grid-card__image', { fill: true });
      card.appendChild(imageWrapper);
      card.addEventListener('click', () => handlePhaseTwoChoice(card));
      boardInner.appendChild(card);
    });

    playPronunciation(item, { preservePitch: true });
  }

  function highlightCorrectCard() {
    boardInner.querySelectorAll('.grid-card').forEach(btn => {
      if (btn.dataset.correct === 'true') {
        btn.classList.add('grid-card--correct');
      }
    });
  }

  function handlePhaseTwoChoice(card) {
    if (awaiting) return;
    awaiting = true;
    const isCorrect = card.dataset.correct === 'true';
    let wasCorrect = isCorrect;
    let audio = isCorrect ? successAudio : errorAudio;
    highlightCorrectCard();
    if (!isCorrect) {
      card.classList.add('grid-card--wrong');
    }

    boardInner.querySelectorAll('.grid-card').forEach(btn => { btn.disabled = true; });

    if (isCorrect) {
      applyCorrectOutcome();
    } else {
      const autoCorrect = registerAttemptAndCheckAutoCorrect();
      if (autoCorrect) {
        applyCorrectOutcome();
        audio = successAudio;
        wasCorrect = true;
        card.classList.remove('grid-card--wrong');
        card.classList.add('grid-card--correct');
      } else {
        registerErrorAndCheckReset();
        applyIncorrectOutcome();
        audio = errorAudio;
        wasCorrect = false;
      }
    }

    recordFlashcardMetric(currentItem, 'association', wasCorrect ? 100 : 0);

    playFeedbackAudio(audio);
    updateProgressBar();
    setTimeout(() => {
      awaiting = false;
      advanceCycle();
    }, getAdvanceDelay(1000));
  }

  function setupSpeechRecognition() {
    const SpeechRecognition = getBrowserSpeechRecognitionCtor();
    if (SpeechRecognition) {
      recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.continuous = true;
      recognition.interimResults = true;
      if ('maxAlternatives' in recognition) {
        recognition.maxAlternatives = 10;
      }
    }
  }

  function updateRecognitionLanguage(targetPhase) {
    if (!recognition) return;
    recognition.lang = getRecognitionLanguage(targetPhase);
  }

  function showPhaseThreeCard(item) {
    currentItem = item;
    recordFlashcardPlayed(item);
    clearBoard();
    boardInner.classList.remove('board__inner--grid');
    if (recognition && typeof recognition.stop === 'function') {
      try {
        recognition.stop();
      } catch (error) {
        // ignore
      }
    }

    const imageWrapper = createEntryImage(item, 'board__image-single board__image-speech');
    const img = imageWrapper.querySelector('img');
    img.setAttribute('aria-hidden', 'true');

    const speechBtn = document.createElement('button');
    speechBtn.type = 'button';
    speechBtn.className = 'phase-word-btn';
    const speechLabel = document.createElement('span');
    speechLabel.className = 'phase-word-btn__label';
    speechLabel.textContent = item.en;
    speechBtn.appendChild(speechLabel);
    speechBtn.setAttribute('aria-label', `Toque e repita: ${item.en}`);

    const startListening = () => {
      if (awaiting || isGamePaused) return;
      handleSpeechChallenge(item.en, startListening, {
        onListeningStart: () => img.classList.add('board__image-speech--listening'),
        onListeningEnd: () => img.classList.remove('board__image-speech--listening'),
        progressTarget: imageWrapper,
        evaluationTarget: img,
        entry: item
      });
    };
    attachSpeechTapTrigger(imageWrapper, startListening);

    speechBtn.addEventListener('click', () => playPronunciation(item));
    const phaseFivePromptToken = Date.now() + Math.random();
    showPhaseFiveCard.promptToken = phaseFivePromptToken;
    setMicControlAction(startListening);

    const phaseThreeStack = document.createElement('div');
    phaseThreeStack.className = 'phase-3-speech-stack';
    phaseThreeStack.appendChild(imageWrapper);
    phaseThreeStack.appendChild(speechBtn);
    boardInner.appendChild(phaseThreeStack);
    choiceRow.innerHTML = '';
    scheduleButtonTextFit(speechBtn, 18);
    if (!localStorage.getItem(PHASE_THREE_HINT_STORAGE_KEY)) {
      const hint = document.createElement('p');
      hint.className = 'phase-mic-hint';
      hint.textContent = 'use o botao de microfone no rodape';
      choiceRow.appendChild(hint);
      localStorage.setItem(PHASE_THREE_HINT_STORAGE_KEY, 'true');
    }
    showText('');
  }

  function showPhaseFiveCard(item) {
    currentItem = item;
    recordFlashcardPlayed(item);
    clearBoard();
    boardInner.classList.remove('board__inner--grid');
    if (recognition && typeof recognition.stop === 'function') {
      try {
        recognition.stop();
      } catch (error) {
        // ignore
      }
    }

    const expectedText = item.en;
    const phaseFivePtText = document.createElement('p');
    phaseFivePtText.className = 'phase-five-pt-text phase-five-pt-text--hidden';
    phaseFivePtText.textContent = item.pt || item.en;
    phaseFivePtText.setAttribute('aria-live', 'polite');
    const imageWrapper = createIconImage(
      item,
      PHASE_FIVE_ICON_URL,
      'Som',
      'board__image-single board__image-speech board__image-icon'
    );
    const img = imageWrapper.querySelector('img');
    img.setAttribute('aria-hidden', 'true');
    const startListening = () => {
      if (awaiting || isGamePaused) return;
      handleSpeechChallenge(expectedText, startListening, {
        onListeningStart: () => img.classList.add('board__image-speech--listening'),
        onListeningEnd: () => img.classList.remove('board__image-speech--listening'),
        onAttemptComplete: () => {
          phaseFivePtText.classList.remove('phase-five-pt-text--hidden');
        },
        progressTarget: imageWrapper,
        evaluationTarget: img,
        entry: item
      });
    };
    attachSpeechTapTrigger(imageWrapper, startListening);

    setMicControlAction(startListening);

    boardInner.appendChild(imageWrapper);
    boardInner.appendChild(phaseFivePtText);
    choiceRow.innerHTML = '';
    showText('');
    Promise.resolve(playPronunciation(item, { preservePitch: true }))
      .catch(() => {})
      .finally(() => {
        if (showPhaseFiveCard.promptToken !== phaseFivePromptToken) return;
        if (phase !== 5 || currentItem !== item) return;
        setMicControlAction(startListening);
      });
  }

  function getPhaseSixSquareScale(text = '') {
    const normalized = String(text || '').replace(/\s+/g, '');
    const charCount = normalized.length;
    if (charCount <= 8) return 1;
    if (charCount <= 15) return 1.2;
    if (charCount <= 24) return 1.35;
    if (charCount <= 36) return 1.5;
    return 1.5;
  }

  function showPhaseSixCard(item) {
    currentItem = item;
    recordFlashcardPlayed(item);
    clearBoard();
    boardInner.classList.remove('board__inner--grid');
    if (recognition && typeof recognition.stop === 'function') {
      try {
        recognition.stop();
      } catch (error) {
        // ignore
      }
    }

    const promptText = item.pt || item.en;
    const expectedText = item.en;
    const imageWrapper = createTextVisual(
      item,
      promptText,
      'board__image-text board__image-speech'
    );
    const textEl = imageWrapper.querySelector('.board__image-text');
    applyBalancedText(textEl, promptText);
    imageWrapper.style.setProperty('--phase6-square-scale', String(getPhaseSixSquareScale(promptText))); 

    const startListening = () => {
      if (awaiting || isGamePaused) return;
      handleSpeechChallenge(expectedText, startListening, {
        onListeningStart: () => textEl.classList.add('board__image-speech--listening'),
        onListeningEnd: () => textEl.classList.remove('board__image-speech--listening'),
        progressTarget: imageWrapper,
        evaluationTarget: textEl,
        entry: item
      });
    };
    attachSpeechTapTrigger(imageWrapper, startListening);

    setMicControlAction(startListening);

    boardInner.appendChild(imageWrapper);
    choiceRow.innerHTML = '';
    showText('');
  }

  function showPhaseSevenCard(item) {
    currentItem = item;
    recordFlashcardPlayed(item);
    clearBoard();
    boardInner.classList.remove('board__inner--grid');
    if (recognition && typeof recognition.stop === 'function') {
      try {
        recognition.stop();
      } catch (error) {
        // ignore
      }
    }

    const expectedText = item.en;
    const phaseSevenEnText = document.createElement('p');
    phaseSevenEnText.className = 'phase-seven-en-text phase-seven-en-text--hidden';
    phaseSevenEnText.textContent = item.en;
    phaseSevenEnText.setAttribute('aria-live', 'polite');

    const imageWrapper = createEntryImage(item, 'board__image-single board__image-speech');
    const img = imageWrapper.querySelector('img');
    img.setAttribute('aria-hidden', 'true');

    const startListening = () => {
      if (awaiting || isGamePaused) return;
      handleSpeechChallenge(expectedText, startListening, {
        onListeningStart: () => img.classList.add('board__image-speech--listening'),
        onListeningEnd: () => img.classList.remove('board__image-speech--listening'),
        onAttemptComplete: () => {
          phaseSevenEnText.classList.remove('phase-seven-en-text--hidden');
        },
        progressTarget: imageWrapper,
        evaluationTarget: img,
        entry: item
      });
    };
    attachSpeechTapTrigger(imageWrapper, startListening);

    setMicControlAction(startListening);

    boardInner.appendChild(imageWrapper);
    boardInner.appendChild(phaseSevenEnText);
    choiceRow.innerHTML = '';
    showText('');
  }

  function showPhaseEightCard(item) {
    currentItem = item;
    recordFlashcardPlayed(item);
    clearBoard();
    boardInner.classList.remove('board__inner--grid');
    if (recognition && typeof recognition.stop === 'function') {
      try {
        recognition.stop();
      } catch (error) {
        // ignore
      }
    }

    const promptText = item.pt || item.en;
    const expected = item.en;
    const phaseEightPtText = document.createElement('p');
    phaseEightPtText.className = 'phase-eight-pt-text';
    phaseEightPtText.textContent = promptText;
    phaseEightPtText.setAttribute('aria-live', 'polite');

    const imageWrapper = createEntryImage(item, 'board__image-single board__image-speech');
    const img = imageWrapper.querySelector('img');
    img.setAttribute('aria-hidden', 'true');

    const startListening = () => {
      if (awaiting || isGamePaused) return;
      clearPhaseEightTimeout();
      handleSpeechChallenge(expected, startListening, {
        onListeningStart: () => img.classList.add('board__image-speech--listening'),
        onListeningEnd: () => img.classList.remove('board__image-speech--listening'),
        requireFullMatch: true,
        strictSequence: true,
        maxWordDistance: 1,
        progressTarget: imageWrapper,
        evaluationTarget: img,
        entry: item
      });
    };
    attachSpeechTapTrigger(imageWrapper, startListening);

    setMicControlAction(startListening);

    boardInner.appendChild(imageWrapper);
    boardInner.appendChild(phaseEightPtText);
    choiceRow.innerHTML = '';
    showText('');
    schedulePhaseEightTimeout();
  }

  function normalizeWritingWord(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9'-]/gi, '')
      .trim();
  }

  function tokenizeWritingSentence(sentence) {
    return String(sentence || '')
      .split(/\s+/)
      .map(token => ({
        original: token,
        normalized: normalizeWritingWord(token)
      }))
      .filter(token => token.normalized);
  }

  function normalizeWritingSentence(sentence) {
    return tokenizeWritingSentence(sentence).map(token => token.normalized);
  }

  function splitBalancedText(text) {
    const normalizedText = String(text || '').trim();
    const compactLength = normalizedText.replace(/\s+/g, ' ').trim().length;
    const words = normalizedText.split(/\s+/).filter(Boolean);
    if (compactLength < 14) {
      return [normalizedText, ''];
    }
    if (words.length <= 1) {
      return [normalizedText, ''];
    }
    let bestSplit = 1;
    let smallestDiff = Infinity;
    for (let i = 1; i < words.length; i += 1) {
      const first = words.slice(0, i).join(' ');
      const second = words.slice(i).join(' ');
      const diff = Math.abs(first.length - second.length);
      if (diff < smallestDiff) {
        smallestDiff = diff;
        bestSplit = i;
      }
    }
    return [words.slice(0, bestSplit).join(' '), words.slice(bestSplit).join(' ')];
  }

  function applyBalancedText(element, text) {
    if (!element) return;
    const [first, second] = splitBalancedText(text);
    element.innerHTML = '';
    element.appendChild(document.createTextNode(first));
    if (second) {
      element.appendChild(document.createElement('br'));
      element.appendChild(document.createTextNode(second));
    }
  }

  function pickUniqueWords(poolList, count, exclude = new Set()) {
    const candidates = Array.isArray(poolList) ? poolList : [];
    const normalizedCandidates = candidates
      .map(word => ({
        original: String(word || '').trim(),
        normalized: normalizeWritingWord(word)
      }))
      .filter(entry => entry.normalized && !exclude.has(entry.normalized));
    const shuffled = shuffle(normalizedCandidates);
    const result = [];
    const used = new Set();
    for (const entry of shuffled) {
      if (result.length >= count) break;
      if (used.has(entry.normalized)) continue;
      used.add(entry.normalized);
      result.push(entry);
    }
    return result;
  }

  function buildWritingHub(targetSentence, pools) {
    const tokens = tokenizeWritingSentence(targetSentence);
    const limit = WRITING_HUB_LIMIT;
    const displayLookup = tokens.reduce((acc, token) => {
      if (!acc[token.normalized]) {
        const cleaned = token.original.replace(/[^a-z0-9'-]/gi, '').trim();
        acc[token.normalized] = cleaned || token.normalized;
      }
      return acc;
    }, {});
    const targetCounts = tokens.reduce((acc, token) => {
      acc[token.normalized] = (acc[token.normalized] || 0) + 1;
      return acc;
    }, {});
    const microSet = new Set((pools.micro || []).map(normalizeWritingWord));
    const verbsSet = new Set((pools.verbs || []).map(normalizeWritingWord));
    const nounsSet = new Set((pools.nouns || []).map(normalizeWritingWord));
    const adjectivesSet = new Set((pools.adjectives || []).map(normalizeWritingWord));

    const baseChips = [
      ...pickUniqueWords(pools.micro, WRITING_HUB_COUNTS.micro)
        .map(entry => ({ ...entry, category: 'micro' })),
      ...pickUniqueWords(pools.verbs, WRITING_HUB_COUNTS.verbs)
        .map(entry => ({ ...entry, category: 'verbs' })),
      ...pickUniqueWords(pools.nouns, WRITING_HUB_COUNTS.nouns)
        .map(entry => ({ ...entry, category: 'nouns' })),
      ...pickUniqueWords(pools.adjectives, WRITING_HUB_COUNTS.adjectives)
        .map(entry => ({ ...entry, category: 'adjectives' }))
    ].map(entry => ({
      word: entry.original,
      normalized: entry.normalized,
      category: entry.category || 'distractor',
      isTarget: false
    }));

    const hub = baseChips.slice(0, limit);
    hub.forEach(chip => {
      if (targetCounts[chip.normalized]) {
        chip.isTarget = true;
      }
    });

    const resolveCategory = (word) => {
      if (microSet.has(word)) return 'micro';
      if (verbsSet.has(word)) return 'verbs';
      if (nounsSet.has(word)) return 'nouns';
      if (adjectivesSet.has(word)) return 'adjectives';
      return 'custom';
    };

    const ensureTargetWord = (word) => {
      const category = resolveCategory(word);
      const replacement = {
        word: displayLookup[word] || word,
        normalized: word,
        category,
        isTarget: true
      };
      const candidates = hub
        .map((chip, idx) => ({ chip, idx }))
        .filter(({ chip }) => !chip.isTarget && (chip.category === category || category === 'custom'));
      const fallback = hub
        .map((chip, idx) => ({ chip, idx }))
        .filter(({ chip }) => !chip.isTarget);
      const targetList = candidates.length ? candidates : fallback;
      if (!targetList.length) {
        if (hub.length < limit) {
          hub.push(replacement);
        }
        return;
      }
      const pick = targetList[Math.floor(Math.random() * targetList.length)];
      hub[pick.idx] = replacement;
    };

    Object.entries(targetCounts).forEach(([word, count]) => {
      for (let i = 0; i < count; i += 1) {
        const existingCount = hub.filter(chip => chip.normalized === word).length;
        if (existingCount >= count) break;
        ensureTargetWord(word);
      }
    });

    tokens.forEach(token => {
      const occurrences = hub.filter(chip => chip.normalized === token.normalized).length;
      if (occurrences < targetCounts[token.normalized]) {
        ensureTargetWord(token.normalized);
      }
    });
    if (hub.length < limit) {
      const combinedPool = [
        ...(pools.micro || []),
        ...(pools.verbs || []),
        ...(pools.nouns || []),
        ...(pools.adjectives || [])
      ];
      const available = shuffle(combinedPool);
      const existing = new Set(hub.map(chip => chip.normalized));
      for (const word of available) {
        if (hub.length >= limit) break;
        const normalized = normalizeWritingWord(word);
        if (!normalized || existing.has(normalized)) continue;
        existing.add(normalized);
        hub.push({
          word: String(word).trim(),
          normalized,
          category: 'distractor',
          isTarget: false
        });
      }
    }

    const shuffledHub = shuffle(hub).slice(0, limit);
    return arrangeWritingHubRows(shuffledHub) || shuffledHub;
  }

  function updateWritingSentence(text, options = {}) {
    if (!textContainer) return;
    const { highlight = false } = options;
    textContainer.classList.add('text-container--writing');
    textContainer.classList.toggle('text-container--writing-feedback', highlight);
    textContainer.classList.add('text-container--writing-dissolve');
    window.setTimeout(() => {
      textContainer.textContent = text;
      textContainer.classList.remove('text-container--writing-dissolve');
      textContainer.classList.toggle('active', true);
    }, 250);
  }

  function arrangeWritingHubRows(chips, options = {}) {
    const {
      rows = WRITING_HUB_ROWS,
      cols = WRITING_HUB_COLS,
      maxChars = WRITING_HUB_MAX_ROW_CHARS
    } = options;
    if (chips.length !== rows * cols) return null;
    const shuffled = shuffle([...chips]);
    const sorted = shuffled.sort((a, b) => (b.word || '').length - (a.word || '').length);
    const rowData = Array.from({ length: rows }, () => ({ items: [], total: 0 }));

    const place = (index) => {
      if (index >= sorted.length) return true;
      const chip = sorted[index];
      const length = (chip.word || '').length;
      const rowOrder = shuffle([...rowData]);
      for (const row of rowOrder) {
        if (row.items.length >= cols) continue;
        if (row.total + length > maxChars) continue;
        row.items.push(chip);
        row.total += length;
        if (place(index + 1)) return true;
        row.items.pop();
        row.total -= length;
      }
      return false;
    };

    if (!place(0)) return null;
    return rowData.flatMap(row => row.items);
  }

  function setWritingPrompt(text) {
    if (!textContainer) return;
    textContainer.classList.add('text-container--writing');
    textContainer.classList.remove('text-container--writing-feedback');
    textContainer.textContent = text;
    textContainer.classList.toggle('active', Boolean(text));
  }

  function renderWritingDisplay(words, options = {}) {
    if (!writingState?.displayEl) return;
    const { highlight = false } = options;
    const displayEl = writingState.displayEl;
    displayEl.innerHTML = '';
    words.forEach((entry) => {
      const chip = document.createElement('span');
      chip.className = `writing-chip writing-chip--display ${entry.colorClass || ''}`.trim();
      chip.textContent = entry.word;
      displayEl.appendChild(chip);
    });
    displayEl.classList.toggle('writing-display--highlight', highlight);
  }

  function buildWritingDisplayEntriesFromSentence(sentence, options = {}) {
    if (!writingState) return [];
    const tokens = tokenizeWritingSentence(sentence);
    const { overrideColorClass } = options;
    return tokens.map((token, index) => {
      const match = writingState.chips.find(chip => chip.normalized === token.normalized);
      return {
        word: token.original || token.normalized,
        colorClass: overrideColorClass
          || match?.colorClass
          || WRITING_COLOR_CLASSES[index % WRITING_COLOR_CLASSES.length]
      };
    });
  }

  function showWritingPhase(item, options = {}) {
    currentItem = item;
    recordFlashcardPlayed(item);
    clearBoard();
    boardInner.classList.remove('board__inner--grid');
    if (recognition && typeof recognition.stop === 'function') {
      try {
        recognition.stop();
      } catch (error) {
        // ignore
      }
    }

    const targetSentence = getEntrySentence(item);
    if (!targetSentence) {
      showText('Estamos criando essa aula');
      return;
    }

    const targetTokens = normalizeWritingSentence(targetSentence);
    writingState = {
      targetSentence,
      targetTokens,
      selectedWords: [],
      chips: [],
      displayEl: null,
      playPromptAudio: null
    };

    if (options.mode === 'audio') {
      const audioName = getEntryAudioName(item);
      if (audioName) {
        const audioSrc = buildAudioSrcFromName(audioName);
        writingState.playPromptAudio = () => {
          if (isGamePaused) return;
          if (audioSrc) {
            const audio = new Audio(audioSrc);
            audio.play().catch(() => {});
            return;
          }
          getAudioElementFromName(audioName).then((audio) => {
            if (audio) {
              audio.play().catch(() => {});
            }
          });
        };
      }
    }

    const renderPrompt = () => {
      if (options.mode === 'image') {
        const imageName = getEntryImageName(item);
        if (imageName) {
          const imageWrapper = createEntryImage(
            { ...item, file: imageName },
            'board__image-single board__image-single--phase-one'
          );
          boardInner.appendChild(imageWrapper);
        }
      }
    };

    boardInner.classList.add('board__inner--writing');
    renderPrompt();

    const pools = writingPools || { micro: [], verbs: [], nouns: [], adjectives: [] };
    const chips = buildWritingHub(targetSentence, pools);
    const colorClasses = shuffle(WRITING_COLOR_CLASSES.slice());
    chips.forEach((chip, index) => {
      chip.colorClass = colorClasses[index % colorClasses.length];
    });
    writingState.chips = chips;

    const hub = document.createElement('div');
    hub.className = 'writing-hub';
    const hubRows = [];
    if (phase === 10) {
      const rowCount = Math.ceil(chips.length / WRITING_HUB_COLS);
      for (let i = 0; i < rowCount; i += 1) {
        const row = document.createElement('div');
        row.className = `writing-hub__row writing-hub__row--${(i % 4) + 1}`;
        hub.appendChild(row);
        hubRows.push(row);
      }
    }

    const display = document.createElement('div');
    display.className = 'writing-display';
    boardInner.appendChild(display);
    writingState.displayEl = display;

    const chipElements = chips.map((chip, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `writing-chip ${chip.colorClass}`;
      button.textContent = chip.word;
      button.dataset.index = String(index);
      button.addEventListener('click', () => {
        if (button.disabled || awaiting) return;
        hub.classList.remove('writing-hub--error');
        const nextPosition = writingState.selectedWords.length;
        const expectedWord = writingState.targetTokens[nextPosition];
        const selectedWord = chip.normalized;
        if (expectedWord !== selectedWord) {
          awaiting = true;
          registerErrorAndCheckReset();
          applyIncorrectOutcome();
          updateProgressBar();
          playFeedbackAudio(errorAudio);
          hub.classList.add('writing-hub--error');
          renderWritingDisplay(
            buildWritingDisplayEntriesFromSentence(targetSentence, { overrideColorClass: 'writing-chip--correct' }),
            { highlight: true }
          );
          window.setTimeout(() => {
            textContainer.classList.remove('text-container--writing-feedback');
            resetSelection();
            awaiting = false;
            advanceCycle();
          }, getAdvanceDelay(600));
          return;
        }

        writingState.selectedWords.push({
          chipIndex: index,
          word: chip.word,
          normalized: chip.normalized,
          colorClass: chip.colorClass
        });
        playSuccessAudio();
        button.disabled = true;
        button.classList.add('writing-chip--selected');
        renderWritingDisplay(writingState.selectedWords, { highlight: false });

        if (writingState.selectedWords.length === writingState.targetTokens.length) {
          awaiting = true;
          if (typeof writingState.playPromptAudio === 'function') {
            writingState.playPromptAudio();
          }
          applyCorrectOutcome();
          updateProgressBar();
          window.setTimeout(() => {
            awaiting = false;
            advanceCycle();
          }, getAdvanceDelay(600));
        }
      });
      const targetRow = hubRows.length ? hubRows[Math.floor(index / WRITING_HUB_COLS)] : hub;
      targetRow.appendChild(button);
      return button;
    });

    const resetSelection = () => {
      writingState.selectedWords = [];
      chipElements.forEach(chipEl => {
        chipEl.disabled = false;
        chipEl.classList.remove('writing-chip--selected');
      });
      hub.classList.remove('writing-hub--error');
      renderWritingDisplay([]);
    };

    if (choiceRow) {
      choiceRow.innerHTML = '';
      choiceRow.classList.add('choice-row--writing');
      choiceRow.appendChild(hub);
    }
    renderWritingDisplay([]);

    writingCleanup = () => {
      if (choiceRow) {
        choiceRow.classList.remove('choice-row--writing');
      }
      boardInner.classList.remove('board__inner--writing');
    };

    if (phase === 9) {
      const prompt = getEntryPortugueseSentence(item);
      if (textContainer) {
        textContainer.classList.add('text-container--writing');
        textContainer.classList.remove('text-container--writing-feedback');
        textContainer.textContent = prompt;
        textContainer.classList.toggle('active', Boolean(prompt));
      }
      startWritingColorCycle();
    } else {
      setWritingPrompt('');
    }
  }

  function showPhaseNineCard(item) {
    currentItem = item;
    recordFlashcardPlayed(item);
    clearBoard();
    boardInner.classList.remove('board__inner--grid');
    boardInner.classList.add('board__inner--writing');

    if (recognition && typeof recognition.stop === 'function') {
      try {
        recognition.stop();
      } catch (error) {
        // ignore
      }
    }

    const targetSentenceRaw = getEntrySentence(item);
    const targetDisplay = String(targetSentenceRaw || '')
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Z\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const targetLetters = targetDisplay.replace(/\s/g, '');
    if (!targetLetters) {
      showText('Estamos criando essa aula');
      return;
    }

    const neededLetters = Array.from(new Set(targetLetters.split(''))).sort();
    if (neededLetters.length > PHASE_NINE_EXTENDED_KEY_COUNT) {
      showText('Frase com muitas letras unicas para este teclado.');
      return;
    }

    const keyCount = neededLetters.length > PHASE_NINE_BASE_KEY_COUNT
      ? PHASE_NINE_EXTENDED_KEY_COUNT
      : PHASE_NINE_BASE_KEY_COUNT;
    const randomFill = shuffle(
      PHASE_NINE_ALPHABET.filter(letter => !neededLetters.includes(letter))
    ).slice(0, keyCount - neededLetters.length);
    const keyboardLetters = [...neededLetters, ...randomFill].sort();
    const gridColumns = keyCount === PHASE_NINE_EXTENDED_KEY_COUNT ? 5 : 4;

    writingState = {
      targetSentence: targetDisplay,
      targetTokens: targetLetters.split(''),
      selectedWords: [],
      chips: [],
      displayEl: null,
      playPromptAudio: null
    };

    const audioName = getEntryAudioName(item);
    if (audioName) {
      const audioSrc = buildAudioSrcFromName(audioName);
      writingState.playPromptAudio = () => {
        if (isGamePaused) return;
        if (audioSrc) {
          const audio = new Audio(audioSrc);
          audio.play().catch(() => {});
          return;
        }
        getAudioElementFromName(audioName).then((audio) => {
          if (audio) audio.play().catch(() => {});
        });
      };
    }

    const phrasePrompt = getEntryPortugueseSentence(item);
    if (textContainer) {
      textContainer.classList.add('text-container--writing');
      textContainer.classList.remove('text-container--writing-feedback');
      textContainer.textContent = phrasePrompt;
      textContainer.classList.toggle('active', Boolean(phrasePrompt));
    }

    if (choiceRow) {
      choiceRow.innerHTML = '';
      choiceRow.classList.add('choice-row--writing', 'choice-row--phase-nine');
    }

    const typedLetters = [];
    const formatTypedWithTemplate = () => {
      if (!typedLetters.length) return '';
      let built = '';
      let consumed = 0;
      for (const ch of targetDisplay) {
        if (ch === ' ') {
          if (consumed > 0 && consumed < typedLetters.length) {
            built += ' ';
          }
          continue;
        }
        if (consumed >= typedLetters.length) break;
        built += typedLetters[consumed];
        consumed += 1;
      }
      return built.trimEnd();
    };

    const display = document.createElement('div');
    display.className = 'phase-nine-display';
    display.textContent = '';
    writingState.displayEl = display;

    const formatPhaseNineDisplayText = (value) => String(value || '')
      .toLowerCase()
      .replace(/\b([a-z])/g, (_, letter) => letter.toUpperCase());

    const keyboard = document.createElement('div');
    keyboard.className = 'phase-nine-keyboard';
    keyboard.dataset.keyCount = String(keyCount);
    keyboard.style.setProperty('--phase-nine-columns', String(gridColumns));

    const grid = document.createElement('div');
    grid.className = 'phase-nine-keyboard__grid';
    keyboard.appendChild(grid);

    const renderTyped = () => {
      display.textContent = formatPhaseNineDisplayText(formatTypedWithTemplate());
    };

    const onWrongLetter = () => {
      awaiting = true;
      registerErrorAndCheckReset();
      applyIncorrectOutcome();
      updateProgressBar();
      playFeedbackAudio(errorAudio);
      display.classList.add('phase-nine-display--error');
      display.textContent = formatPhaseNineDisplayText(targetDisplay);
      window.setTimeout(() => {
        typedLetters.length = 0;
        display.classList.remove('phase-nine-display--error');
        renderTyped();
        awaiting = false;
        advanceCycle();
      }, getAdvanceDelay(600));
    };

    keyboardLetters.forEach((letter) => {
      const key = document.createElement('button');
      key.type = 'button';
      key.className = 'phase-nine-key';
      key.textContent = letter;
      key.setAttribute('aria-label', `Letra ${letter}`);
      key.addEventListener('click', () => {
        if (awaiting || isGamePaused) return;
        triggerTypingTapFeedback();
        const expected = targetLetters[typedLetters.length];
        if (letter !== expected) {
          onWrongLetter();
          return;
        }

        typedLetters.push(letter);
        playSuccessAudio();
        renderTyped();

        if (typedLetters.length === targetLetters.length) {
          awaiting = true;
          if (typeof writingState.playPromptAudio === 'function') {
            writingState.playPromptAudio();
          }
          applyCorrectOutcome();
          updateProgressBar();
          window.setTimeout(() => {
            awaiting = false;
            advanceCycle();
          }, getAdvanceDelay(600));
        }
      });
      grid.appendChild(key);
    });

    if (choiceRow) {
      choiceRow.appendChild(display);
      choiceRow.appendChild(keyboard);
    }

    writingCleanup = () => {
      if (choiceRow) {
        choiceRow.classList.remove('choice-row--writing', 'choice-row--phase-nine');
      }
      boardInner.classList.remove('board__inner--writing');
    };
  }

  function showPhaseTenCard(item) {
    showWritingPhase(item, { mode: 'image' });
    const audioName = getEntryAudioName(item);
    const audioSrc = buildAudioSrcFromName(audioName);
    if (audioSrc) {
      window.setTimeout(() => {
        if (isGamePaused) return;
        playAudioSource(audioSrc, { rate: getCurrentPlaybackRate(), preservePitch: true }).catch(() => {});
      }, 120);
    }
  }

  function getPhaseMetadata(phaseNumber = phase) {
    const meta = dayPhaseMeta.get(phaseNumber);
    return meta && typeof meta === 'object' ? meta : {};
  }

  async function playMode11ItemAudio(item) {
    const speed = getCurrentPlaybackRate();
    const audioQueue = [];
    const portugueseAudio = getEntryAudioNameByMode(item, 'portuguese');
    const englishAudio = getEntryAudioNameByMode(item, 'english');

    if (mode11VoiceMode === 'portuguese' || mode11VoiceMode === 'both') {
      if (portugueseAudio) audioQueue.push({ name: portugueseAudio, isEnglish: false });
    }
    if (mode11VoiceMode === 'english' || mode11VoiceMode === 'both') {
      if (englishAudio) audioQueue.push({ name: englishAudio, isEnglish: true });
    }

    if (!audioQueue.length) {
      const fallback = getEntryAudioName(item);
      if (fallback) audioQueue.push({ name: fallback, isEnglish: true });
    }

    for (const audioEntry of audioQueue) {
      const audioSrc = buildAudioSrcFromName(audioEntry.name);
      if (!audioSrc) continue;
      await playAudioSource(audioSrc, {
        rate: speed,
        preservePitch: true,
        countListeningEnglish: audioEntry.isEnglish
      }).catch(() => false);
      if (isGamePaused) return false;
    }
    return true;
  }

  function getMode11SubtitleText(item) {
    if (mode11SubtitleMode === 'none') {
      return getEntrySentence(item) || getEntryPortugueseSentence(item) || '';
    }
    if (mode11SubtitleMode === 'portuguese') {
      return getEntryPortugueseSentence(item) || getEntrySentence(item) || '';
    }
    return getEntrySentence(item) || getEntryPortugueseSentence(item) || '';
  }

  function splitMode11TextIntoBalancedLines(text) {
    const normalized = String(text || '').trim();
    if (!normalized) return [''];
    const words = normalized.split(/\s+/).filter(Boolean);
    if (words.length <= 1) return [normalized];

    let bestIndex = 1;
    let bestDiff = Number.POSITIVE_INFINITY;
    for (let i = 1; i < words.length; i += 1) {
      const left = words.slice(0, i).join(' ');
      const right = words.slice(i).join(' ');
      const diff = Math.abs(left.length - right.length);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestIndex = i;
      }
    }

    return [
      words.slice(0, bestIndex).join(' '),
      words.slice(bestIndex).join(' ')
    ];
  }

  function updateMode11SubtitleForCurrentItem(item) {
    const subtitle = boardInner ? boardInner.querySelector('.mode11-subtitle') : null;
    const text = getMode11SubtitleText(item);
    if (subtitle) {
      subtitle.textContent = text;
      subtitle.classList.toggle('is-hidden', !text);
    }
    if (textContainer) {
      const lines = splitMode11TextIntoBalancedLines(text);
      if (lines.length > 1) {
        textContainer.innerHTML = '';
        textContainer.appendChild(document.createTextNode(lines[0]));
        textContainer.appendChild(document.createElement('br'));
        textContainer.appendChild(document.createTextNode(lines[1]));
      } else {
        textContainer.textContent = lines[0] || ' ';
      }
      textContainer.classList.add('active');
    }
  }
  function getMode12SubtitleText(item) {
    if (mode12SubtitleMode === 'none') return '';
    if (mode12SubtitleMode === 'portuguese') {
      return getEntryPortugueseSentence(item) || getEntrySentence(item) || '';
    }
    return getEntrySentence(item) || getEntryPortugueseSentence(item) || '';
  }

  function updateMode12SubtitleForCurrentItem(item, options = {}) {
    if (!textContainer) return;
    const animate = options.animate !== false;
    const subtitleText = getMode12SubtitleText(item);
    const applySubtitle = () => {
      if (subtitleText) {
        applyBalancedText(textContainer, subtitleText);
      } else {
        textContainer.textContent = '\u00A0';
      }
      textContainer.classList.add('active');
    };

    if (!animate) {
      applySubtitle();
      return;
    }

    if (mode12SubtitleFadeTimer) {
      window.clearTimeout(mode12SubtitleFadeTimer);
      mode12SubtitleFadeTimer = null;
    }

    textContainer.style.transition = 'none';
    textContainer.style.opacity = '1';
    applySubtitle();
  }
  function showPhaseElevenCard(item, options = {}) {
    const narrationToken = ++phaseNarrationToken;
    const replayAudio = options.replayAudio !== false;
    currentItem = item;
    recordFlashcardPlayed(item);
    clearPhaseEightTimeout();
    clearWritingState();
    setMicPersistentEnabled(false);
    setMicControlAction(null);
    boardInner.classList.remove('board__inner--grid');
    if (choiceRow) choiceRow.innerHTML = '';
    if (textContainer) {
      textContainer.classList.remove('text-container--split');
    }
    const previousStage = boardInner ? boardInner.querySelector('.mode11-stage') : null;
    if (boardInner && !previousStage) {
      boardInner.innerHTML = '';
    }
    const stage = document.createElement('div');
    stage.className = 'mode11-stage mode11-stage--fade-in';
    const imageWrapper = createEntryImage(item, 'board__image-single board__image-single--phase-one mode11-image');
    stage.appendChild(imageWrapper);
    if (textContainer) {
      stage.appendChild(textContainer);
      textContainer.classList.add('text-container--media-caption');
    }
    boardInner.appendChild(stage);
    updateMode11SubtitleForCurrentItem(item);
    if (previousStage && previousStage !== stage) {
      if (previousStage.parentNode) previousStage.parentNode.removeChild(previousStage);
    }
    mode11BackAction = () => {
      if (index <= 0 || isGamePaused) return;
      if (activeAudioSource) {
        try {
          activeAudioSource.pause();
          activeAudioSource.currentTime = 0;
        } catch (error) {
          // ignore
        }
      }
      phaseNarrationToken += 1;
      awaiting = false;
      index = Math.max(0, index - 1);
      score = Math.max(0, score - 1);
      updateProgressBar();
      advanceCycle();
    };
    if (!replayAudio) {
      awaiting = false;
      return;
    }
    if (activeAudioSource) {
      try {
        activeAudioSource.pause();
        activeAudioSource.currentTime = 0;
      } catch (error) {
        // ignore
      }
    }
    awaiting = true;
    playMode11ItemAudio(item)
      .then(() => {
        if (narrationToken !== phaseNarrationToken) return;
        if (isGamePaused) return;
        applyCorrectOutcome();
        updateProgressBar();
        awaiting = false;
        advanceCycle();
      })
      .catch(() => {
        if (narrationToken !== phaseNarrationToken) return;
        awaiting = false;
      });
  }

  function getMode12CharacterId(entry) {
    if (!entry || typeof entry !== 'object') return '';
    return String(entry.character || entry.speaker || entry.personagem || '').trim();
  }

  function getMode12CharacterNameById(characterId) {
    const key = String(characterId || '').trim();
    const character = mode12CharacterMap.get(key);
    if (!character) return key;
    return String(character.name || character.id || key || '').trim();
  }

  function getMode12CharacterImageById(characterId) {
    const key = String(characterId || '').trim();
    const character = mode12CharacterMap.get(key);
    if (!character) return '';
    return String(character.image || '').trim();
  }

  function getMode12CharacterSlot(characterId) {
    const key = String(characterId || '').trim();
    if (!key) return 1;
    const ids = Array.from(mode12CharacterMap.keys());
    const index = ids.indexOf(key);
    return index >= 0 ? index + 1 : 1;
  }

  function getMode12SceneAudioSource(item) {
    const rawId = String(item?.id || '').trim();
    const parsedId = Number.parseInt(rawId.replace(/[^\d]/g, ''), 10);
    if (!Number.isFinite(parsedId) || parsedId < 1) return '';
    const slot = getMode12CharacterSlot(getMode12CharacterId(item));
    return `${MODE12_SCENE_AUDIO_BASE_URL}/id${parsedId}_${slot}.mp3`;
  }

  function hideMode12HeartsTitle() {
    if (mode12HeartsHintTimer) {
      window.clearInterval(mode12HeartsHintTimer);
      mode12HeartsHintTimer = null;
    }
    if (mode12HeartsHintFadeTimer) {
      window.clearTimeout(mode12HeartsHintFadeTimer);
      mode12HeartsHintFadeTimer = null;
    }
    if (mode12HeartsTitleEl && mode12HeartsTitleEl.parentNode) {
      mode12HeartsTitleEl.parentNode.removeChild(mode12HeartsTitleEl);
    }
    mode12HeartsTitleEl = null;
    if (gameRoot) {
      gameRoot.classList.remove('mode12-picker-active');
    }
  }
  function showMode12HeartsTitle(message, hint = '') {
    hideMode12HeartsTitle();
    const title = document.createElement('h1');
    title.id = MODE12_PICKER_TITLE_ID;
    title.className = 'mode12-hearts-title';

    const main = document.createElement('span');
    main.className = 'mode12-hearts-title__main';
    const lines = String(message || '').split(/\n+/).map(line => line.trim()).filter(Boolean);
    if (lines.length) {
      main.textContent = lines[0];
      for (let i = 1; i < lines.length; i += 1) {
        main.appendChild(document.createElement('br'));
        main.appendChild(document.createTextNode(lines[i]));
      }
    }
    title.appendChild(main);

    const hintText = String(hint || '').trim();
    if (hintText) {
      const hintEl = document.createElement('span');
      hintEl.className = 'mode12-hearts-title__hint';
      hintEl.textContent = hintText;
      title.appendChild(hintEl);

      hintEl.classList.remove('is-fading');
    }

    (gameRoot || document.body).appendChild(title);
    mode12HeartsTitleEl = title;
    if (gameRoot) {
      gameRoot.classList.add('mode12-picker-active');
    }
  }

  function showMode12CharacterPicker() {
    const phaseMeta = getPhaseMetadata(12);
    let characters = Array.isArray(phaseMeta.characters) ? phaseMeta.characters.slice() : [];
    mode12CharacterMap = new Map();
    if (!characters.length) {
      const ids = [];
      (Array.isArray(cycle) ? cycle : []).forEach(entry => {
        const id = getMode12CharacterId(entry);
        if (!id || ids.includes(id)) return;
        ids.push(id);
      });
      characters = ids.map((id, idx) => ({
        id,
        name: getMode12CharacterNameById(id) || id || `Character ${idx + 1}`,
        image: getMode12CharacterImageById(id) || ''
      }));
    }
    characters.forEach((character, idx) => {
      const id = String(character?.id || character?.name || `character_${idx + 1}`).trim();
      if (!id) return;
      mode12CharacterMap.set(id, {
        id,
        name: String(character?.name || id),
        image: String(character?.image || '').trim()
      });
    });

    if (!mode12CharacterMap.size) {
      mode12SelectedCharacterId = '';
      hideMode12HeartsTitle();
      return Promise.resolve('');
    }

    return new Promise(resolve => {
      clearBoard();
      if (choiceRow) choiceRow.innerHTML = '';
      if (textContainer) {
        textContainer.textContent = '';
        textContainer.classList.remove('active');
      }

      showMode12HeartsTitle('Escolha um\npersonagem', 'Deslize para mudar');

      const picker = document.createElement('div');
      picker.className = 'mode12-picker';

      const canUseSpectator = Boolean(document.body && document.body.classList.contains('page-play'));
      const options = [
        ...Array.from(mode12CharacterMap.values()).map(character => ({
          id: character.id,
          name: character.name,
          image: character.image
        })),
        ...(canUseSpectator ? [{ id: MODE12_SPECTATOR_ID, name: 'Espectador', image: 'SVG/logo.png' }] : [])
      ];
      let currentOptionIndex = 0;
      let selectionLocked = false;

      const viewport = document.createElement('div');
      viewport.className = 'mode12-picker__viewport';
      const stage = document.createElement('div');
      stage.className = 'mode12-picker__stage';

      let pointerStartX = 0;
      let pointerTracking = false;
      let lastSwipeAt = 0;
      const onPointerDown = (event) => {
        if (selectionLocked) return;
        pointerTracking = true;
        pointerStartX = event.clientX;
      };
      const onPointerUp = (event) => {
        if (!pointerTracking || selectionLocked) return;
        pointerTracking = false;
        const deltaX = event.clientX - pointerStartX;
        if (Math.abs(deltaX) < 35) return;
        goToOption(deltaX < 0 ? 1 : -1);
        lastSwipeAt = Date.now();
      };
      const onPointerCancel = () => {
        pointerTracking = false;
      };
      const onTapStart = () => {
        if (selectionLocked) return;
        if ((Date.now() - lastSwipeAt) < 320) return;
        const current = options[currentOptionIndex];
        if (!current) return;
        finalizeSelection(current.id);
      };
      const cleanupSwipeListeners = () => {
        document.removeEventListener('pointerdown', onPointerDown);
        document.removeEventListener('pointerup', onPointerUp);
        document.removeEventListener('pointercancel', onPointerCancel);
        picker.removeEventListener('click', onTapStart);
        boardInner.removeEventListener('click', onTapStart);
      };
      const finalizeSelection = (optionId) => {
        if (selectionLocked) return;
        selectionLocked = true;
        cleanupSwipeListeners();
        hideMode12HeartsTitle();
        mode12SelectedCharacterId = optionId;
        resolve(optionId);
      };

      const renderCard = (option, { enterFrom = null, exitTo = null } = {}) => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'mode12-character-btn mode12-character-btn--single';
        card.setAttribute('aria-label', `Escolher ${option.name}`);
        card.dataset.characterId = option.id;

        const avatar = document.createElement('img');
        avatar.className = 'mode12-character-btn__avatar';
        avatar.src = option.image || 'SVG/logo.png';
        avatar.alt = option.name;

        const name = document.createElement('span');
        name.className = 'mode12-character-btn__name';
        name.textContent = option.name;

        card.appendChild(avatar);
        card.appendChild(name);
        card.addEventListener('click', () => {
          finalizeSelection(option.id);
        });

        const slide = document.createElement('div');
        slide.className = 'mode12-slide mode12-slide--fade-in';
        const previous = stage.querySelector('.mode12-slide');
        if (previous && previous.parentNode) {
          previous.parentNode.removeChild(previous);
        }
        slide.appendChild(card);
        stage.appendChild(slide);
        card.classList.add('is-active');
      };

      const goToOption = (delta) => {
        if (!options.length) return;
        const nextIndex = (currentOptionIndex + delta + options.length) % options.length;
        const movingRight = delta > 0;
        currentOptionIndex = nextIndex;
        renderCard(options[currentOptionIndex], {
          enterFrom: movingRight ? 'right' : 'left',
          exitTo: movingRight ? 'left' : 'right'
        });
      };
      document.addEventListener('pointerdown', onPointerDown, { passive: true });
      document.addEventListener('pointerup', onPointerUp, { passive: true });
      document.addEventListener('pointercancel', onPointerCancel, { passive: true });
      picker.addEventListener('click', onTapStart);
      boardInner.addEventListener('click', onTapStart);

      const arrowLeft = document.createElement('div');
      arrowLeft.className = 'mode12-swipe-arrow mode12-swipe-arrow--left';
      arrowLeft.textContent = 'Ã¢â‚¬Â¹';
      const arrowRight = document.createElement('div');
      arrowRight.className = 'mode12-swipe-arrow mode12-swipe-arrow--right';
      arrowRight.textContent = 'Ã¢â‚¬Âº';
      picker.appendChild(arrowLeft);
      picker.appendChild(arrowRight);

      renderCard(options[currentOptionIndex]);
      viewport.appendChild(stage);
      picker.appendChild(viewport);
      boardInner.appendChild(picker);
    });
  }

  function buildMode12ImageEntry(item) {
    const characterId = getMode12CharacterId(item);
    const fallbackImage = getMode12CharacterImageById(characterId);
    const lineImage = String(item?.image || item?.file || '').trim();
    return {
      ...item,
      file: lineImage || fallbackImage
    };
  }

  function startMode12MicCapture(item) {
    if (!mode12CurrentNeedsUserLine || isGamePaused || !item) return;
    const expected = mode12SpeechMode === 'portuguese'
      ? (getEntryPortugueseSentence(item) || getEntrySentence(item))
      : (getEntrySentence(item) || getEntryPortugueseSentence(item));
    if (!expected) {
      applyCorrectOutcome({ awardCoins: false });
      updateProgressBar();
      awaiting = false;
      advanceCycle();
      return;
    }

    const speakerName = getMode12CharacterNameById(getMode12CharacterId(item));
    const defaultText = textContainer ? textContainer.textContent || '' : '';
    const errorText = `${speakerName}: tente novamente.`;
    setMicPersistentEnabled(true);
    updateRecognitionLanguage(12);

    handleSpeechChallenge(expected, () => startMode12MicCapture(item), {
      entry: item,
      listenLimitMs: 12000,
      strictSequence: false,
      errorTextTarget: textContainer,
      errorText,
      defaultText
    });
  }

  function showPhaseTwelveCard(item) {
    currentItem = item;
    recordFlashcardPlayed(item);
    clearBoard();
    const narrationToken = ++phaseNarrationToken;
    boardInner.classList.remove('board__inner--grid');
    const speakerId = getMode12CharacterId(item);
    const isUserLine = Boolean(mode12SelectedCharacterId) && speakerId === mode12SelectedCharacterId;
    mode12CurrentNeedsUserLine = isUserLine;
    setMicControlAction(isUserLine ? () => startMode12MicCapture(item) : null);

    const imageEntry = buildMode12ImageEntry(item);
    const stage = document.createElement('div');
    stage.className = 'mode12-stage';
    const imageWrapper = createEntryImage(imageEntry, 'board__image-single board__image-single--phase-one');
    imageWrapper.classList.add('mode12-image--fade-in');
    stage.appendChild(imageWrapper);
    if (textContainer) {
      stage.appendChild(textContainer);
      textContainer.classList.add('text-container--media-caption');
    }
    boardInner.appendChild(stage);

    updateMode12SubtitleForCurrentItem(item, { animate: false });

    mode12BackAction = () => {
      if (index <= 0 || isGamePaused) return;
      awaiting = false;
      index = Math.max(0, index - 1);
      score = Math.max(0, score - 1);
      updateProgressBar();
      advanceCycle();
    };
    if (choiceRow) choiceRow.innerHTML = '';
    if (isUserLine) {
      awaiting = false;
      window.setTimeout(() => {
        if (narrationToken !== phaseNarrationToken) return;
        if (isGamePaused) return;
        startMode12MicCapture(item);
      }, getAdvanceDelay(120));
      return;
    }

    awaiting = true;
    let mode12LineFinalized = false;
    const finalizeMode12Line = () => {
      if (mode12LineFinalized) return;
      mode12LineFinalized = true;
      if (narrationToken !== phaseNarrationToken) {
        awaiting = false;
        return;
      }
      applyCorrectOutcome();
      updateProgressBar();
      awaiting = false;
      advanceCycle();
    };
    mode12AdvanceAction = finalizeMode12Line;
    const audioName = getEntryAudioNameByMode(item, mode12SpeechMode);
    const audioSrc = buildAudioSrcFromName(audioName);
    if (!audioSrc) {
      window.setTimeout(finalizeMode12Line, getAdvanceDelay(900));
      return;
    }
    if (activeAudioSource) {
      try {
        activeAudioSource.pause();
        activeAudioSource.currentTime = 0;
      } catch (error) {
        // ignore
      }
    }
    const playbackRate = getCurrentPlaybackRate();
    playAudioSource(audioSrc, {
      rate: playbackRate,
      preservePitch: true,
      countListeningEnglish: mode12SpeechMode !== 'portuguese'
    })
      .then(() => {
        finalizeMode12Line();
      })
      .catch(finalizeMode12Line);
  }

  function handleSpeechChallenge(expected, handler, options = {}) {
    if (awaiting || isGamePaused) return;
    awaiting = true;
    setMicControlActive(true);
    const speechStartedAt = Date.now();
    const {
      onListeningStart,
      onListeningEnd,
      evaluationTarget,
      errorTextTarget,
      errorText,
      defaultText
    } = options;
    if (typeof onListeningStart === 'function') {
      onListeningStart();
    }
    const listenLimitMs = Number.isFinite(options.listenLimitMs)
      ? Math.max(1000, Number(options.listenLimitMs))
      : SPEECH_LISTEN_LIMIT_MS;
    const captureSettings = getSpeechCaptureSettings(expected);
    let resolved = false;
    let listenTimeout = null;
    const cancelSpeechAttempt = (message) => {
      if (resolved) return;
      resolved = true;
      if (listenTimeout) {
        window.clearTimeout(listenTimeout);
        listenTimeout = null;
      }
      setMicControlActive(false);
      if (recognition && typeof recognition.stop === 'function') {
        try {
          recognition.stop();
        } catch (error) {
          // ignore
        }
      }
      if (typeof onListeningEnd === 'function') {
        onListeningEnd();
      }
      if (errorTextTarget && typeof message === 'string' && message) {
        errorTextTarget.textContent = message;
        scheduleButtonTextFit(errorTextTarget, 18);
      }
      awaiting = false;
    };
    const onResult = async (spoken) => {
      if (resolved) return;
      resolved = true;
      registerPhaseSpeakingSend();
      if (listenTimeout) {
        window.clearTimeout(listenTimeout);
        listenTimeout = null;
      }
      setMicControlActive(false);
      if (recognition && typeof recognition.stop === 'function') {
        try {
          recognition.stop();
        } catch (error) {
          // ignore
        }
      }
      const spokenSample = Array.isArray(spoken) ? (spoken.find(Boolean) || '') : spoken;
      const { success, percent } = isSpokenCorrect(expected, spoken, options);
      registerPhasePronunciation(percent);
      const entry = options.entry || currentItem;

      if (typeof onListeningEnd === 'function') {
        onListeningEnd();
      }

      if (evaluationTarget) {
        evaluationTarget.classList.add('board__image-speech--evaluating');
      }

      let shouldRestoreText = false;
      if (!success && errorTextTarget && typeof errorText === 'string') {
        errorTextTarget.textContent = errorText;
        scheduleButtonTextFit(errorTextTarget, 18);
        shouldRestoreText = true;
      }

      const triggerFeedback = (wasCorrect) => {
        const feedbackPromise = (wasCorrect && isTalkingPhase())
          ? Promise.resolve(playSuccessAudio())
          : (() => {
            const feedbackAudio = wasCorrect ? successAudio : errorAudio;
            return feedbackAudio ? playAudioElement(feedbackAudio) : Promise.resolve(false);
          })();
        if (typeof options.afterFeedback === 'function') {
          feedbackPromise
            .catch(() => false)
            .then(() => options.afterFeedback())
            .catch(() => {});
        } else {
          feedbackPromise.catch(() => {});
        }
      };

      let wasCorrect = success;
      if (success) {
        applyCorrectOutcome();
      } else {
        const autoCorrect = registerAttemptAndCheckAutoCorrect();
        if (autoCorrect) {
          applyCorrectOutcome();
          wasCorrect = true;
        } else {
          registerErrorAndCheckReset();
          applyIncorrectOutcome();
        }
      }

      if (isStreakPhase(phase)) {
        if (wasCorrect) {
          correctStreak += 1;
          if (correctStreak >= STREAK_HEART_TARGET) {
            correctStreak = 0;
            awardStreakHeart();
          }
        } else {
          correctStreak = 0;
        }
      }

      let feedbackTriggered = false;
      if (typeof options.onAttemptComplete === 'function') {
        try {
          options.onAttemptComplete({
            spoken: spokenSample,
            expected,
            percent,
            success,
            wasCorrect
          });
        } catch (error) {
          // ignore callback errors to avoid blocking gameplay
        }
      }
      const accuracyAnimation = animateAccuracyRing(options.progressTarget, percent, {
        onPeak: () => {
          if (feedbackTriggered) return;
          feedbackTriggered = true;
          triggerFeedback(wasCorrect);
        }
      });

      updateProgressBar();
      await accuracyAnimation;
      if (evaluationTarget) {
        evaluationTarget.classList.remove('board__image-speech--evaluating');
      }
      if (entry && (phase === 3 || phase === 5 || phase === 6 || phase === 7 || phase === 8)) {
        recordFlashcardSpoken(entry, percent);
      }
      if (entry) {
        if (phase === 3) {
          recordFlashcardMetric(entry, 'reading', percent);
        }
        if (phase === 5 || phase === 6) {
          recordFlashcardMetric(entry, 'listening', percent);
        }
        if (phase === 7 || phase === 8) {
          recordFlashcardMetric(entry, 'meaning', percent);
        }
        if (phase === 7) {
          recordFlashcardDuration(entry, Date.now() - speechStartedAt);
        }
      }
      if (shouldRestoreText && errorTextTarget && typeof defaultText === 'string') {
        errorTextTarget.textContent = defaultText;
        scheduleButtonTextFit(errorTextTarget, 18);
      }
      setTimeout(() => {
        awaiting = false;
        advanceCycle();
      }, getAdvanceDelay(0));
    };

    Promise.resolve(primeMicrophonePermission())
      .catch(() => false)
      .then((permissionReady) => {
        if (permissionReady === false) {
          cancelSpeechAttempt(options.permissionErrorText || 'Ative o microfone para continuar.');
          return;
        }
        const silentOpenAi = getSilentOpenAiSpeechCapture();
        if (silentOpenAi) {
          silentOpenAi.captureAndTranscribe({
            language: getRecognitionLanguage(),
            maxDurationMs: listenLimitMs
          })
            .then(onResult)
            .catch(() => {
              cancelSpeechAttempt(options.micErrorText || 'Nao foi possivel abrir o microfone.');
            });
          return;
        }
        const nativeSpeech = getNativeSpeechRecognition();
        if (nativeSpeech) {
          nativeSpeech.captureOnce({
            language: getRecognitionLanguage(),
            prompt: getRecognitionLanguage().toLowerCase().startsWith('pt') ? 'Fale em portugues' : 'Fale em ingles',
            maxResults: captureSettings.maxResults,
            maxDurationMs: listenLimitMs
          })
            .then(onResult)
            .catch(() => {
              cancelSpeechAttempt(options.micErrorText || 'Nao foi possivel abrir o microfone.');
            });
          return;
        }
        if (recognition) {
          recognition.continuous = Boolean(captureSettings.browserContinuous);
          recognition.interimResults = Boolean(captureSettings.browserInterimResults);
          if ('maxAlternatives' in recognition) {
            recognition.maxAlternatives = captureSettings.maxResults;
          }
          listenTimeout = window.setTimeout(() => {
            onResult('');
          }, listenLimitMs);
          recognition.onresult = (event) => {
            const transcripts = Array.from(event.results)
              .flatMap(result => Array.from(result || []))
              .map(alternative => alternative && alternative.transcript)
              .filter(Boolean);
            onResult(transcripts.length ? transcripts : '');
          };
          recognition.onerror = () => onResult('');
          recognition.onend = () => onResult('');
          try {
            recognition.start();
          } catch (error) {
            if (error && error.name === 'InvalidStateError') {
              try {
                recognition.stop();
                recognition.start();
              } catch (restartError) {
                cancelSpeechAttempt(options.micErrorText || 'Nao foi possivel abrir o microfone.');
              }
            } else {
              cancelSpeechAttempt(options.micErrorText || 'Nao foi possivel abrir o microfone.');
            }
          }
          return;
        }
        const openAiStt = window.PlaytalkOpenAiStt;
        if (
          openAiStt
          && typeof openAiStt.isNativeRuntime === 'function'
          && openAiStt.isNativeRuntime()
          && typeof openAiStt.captureAndTranscribe === 'function'
          && typeof openAiStt.isSupported === 'function'
          && openAiStt.isSupported()
        ) {
          openAiStt.captureAndTranscribe({
            language: getRecognitionLanguage(),
            maxDurationMs: listenLimitMs
          })
            .then(onResult)
            .catch(() => {
              cancelSpeechAttempt(options.micErrorText || 'Nao foi possivel abrir o microfone.');
            });
          return;
        }
        const typed = window.prompt('Diga o nome em inglÃƒÂªs:') || '';
        onResult(typed);
      });

  }

  function playPhaseFourBatchAudio(batch) {
    let skipAll = false;
    const markSkip = () => {
      skipAll = true;
    };

    return batch.reduce((promise, entry) => (
      promise.then(() => {
        if (skipAll) return null;
        return playPronunciation(entry, {
          preservePitch: true,
          allowSkip: true,
          onSkip: markSkip
        });
      })
    ), Promise.resolve());
  }

  function initializePhaseFourBatch() {
    if (!cycle.length) return [];
    if (phaseFourBatchStart > index || index >= phaseFourBatchStart + PHASE_FOUR_BATCH_SIZE) {
      phaseFourBatchStart = index;
      phaseFourResolved = 0;
      phaseFourExpectedIndex = 0;
    }
    phaseFourBatch = cycle.slice(phaseFourBatchStart, phaseFourBatchStart + PHASE_FOUR_BATCH_SIZE);
    phaseFourExpectedIndex = Math.min(phaseFourResolved, phaseFourBatch.length);
    return phaseFourBatch;
  }

  function showPhaseFourCard() {
    currentItem = null;
    clearBoard();
    boardInner.classList.add('board__inner--grid');
    phaseFourAudioPlaying = false;
    if (recognition && typeof recognition.stop === 'function') {
      try {
        recognition.stop();
      } catch (error) {
        // ignore
      }
    }

    const batch = initializePhaseFourBatch();
    const shuffledBatch = shuffle(batch);
    if (!batch.length) {
      handleProgressCompletion();
      return;
    }
    batch.forEach(entry => recordFlashcardPlayed(entry));
    updateProgressBar();

    boardInner.innerHTML = '';
    const resolvedFiles = new Set(batch.slice(0, phaseFourResolved).map(entry => entry.file));
    shuffledBatch.forEach((entry) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'grid-card grid-card--enter';
      card.dataset.file = entry.file;
      const imageWrapper = createEntryImage(entry, 'grid-card__image', { fill: true });
      card.appendChild(imageWrapper);

      if (resolvedFiles.has(entry.file)) {
        card.classList.add('grid-card--correct', 'grid-card--gone');
        card.disabled = true;
      }

      card.addEventListener('click', () => {
        if ((awaiting && !phaseFourAudioPlaying) || card.disabled) return;
        const expected = batch[phaseFourExpectedIndex];
        const isCorrect = expected && expected.file === entry.file;
        if (isCorrect) {
          errorStreak = 0;
          card.classList.add('grid-card--correct');
          card.disabled = true;
          phaseFourExpectedIndex += 1;
          phaseFourResolved += 1;
          applyCorrectOutcome();
          playSuccessAudio();
          updateProgressBar();

          window.setTimeout(() => {
            card.classList.add('grid-card--dissolve');
            window.setTimeout(() => {
              card.classList.add('grid-card--gone');
            }, PHASE_FOUR_DISSOLVE_MS);
          }, PHASE_FOUR_GREEN_MS);

          if (phaseFourExpectedIndex >= batch.length) {
            awaiting = true;
            window.setTimeout(() => {
              awaiting = false;
              if (index >= cycle.length) {
                handleProgressCompletion();
              } else {
                phaseFourBatchStart = index;
                phaseFourResolved = 0;
                phaseFourExpectedIndex = 0;
                advanceCycle();
              }
            }, PHASE_FOUR_GREEN_MS + PHASE_FOUR_DISSOLVE_MS);
          }
        } else {
          card.classList.add('grid-card--wrong');
          setRoundFeedbackState('miss');
          registerErrorAndCheckReset();
          playFeedbackAudio(errorAudio);
          updateProgressBar();
          window.setTimeout(() => {
            card.classList.remove('grid-card--wrong');
          }, 600);
        }
      });
      boardInner.appendChild(card);
    });

    choiceRow.innerHTML = '';
    showText('');

    if (phaseFourResolved === 0) {
      awaiting = true;
      phaseFourAudioPlaying = true;
      playPhaseFourBatchAudio(batch).finally(() => {
        awaiting = false;
        phaseFourAudioPlaying = false;
      });
    }
  }

  function advanceCycle() {
    if (isGamePaused) {
      pendingAdvanceCycle = true;
      return;
    }
    pendingAdvanceCycle = false;
    if (!cycle.length) return;

    if (index >= cycle.length) {
      handleProgressCompletion();
      return;
    }

    const item = cycle[index];
    setRoundFeedbackState('none');
    persistGameContext(isSingleModeSession() ? 'single-game' : 'fluency-journey', true);
    if (phase === 11) {
      showPhaseElevenCard(item);
      return;
    }
    if (phase === 12) {
      showText('');
      showPhaseTwelveCard(item);
      return;
    }

    renderWithDissolve(() => {
      showText('');

      switch (phase) {
        case 1:
          showPhaseOneCard(item);
          break;
        case 2:
          showPhaseTwoCards(item);
          break;
        case 3:
          showPhaseThreeCard(item);
          break;
        case 4:
          showPhaseFourCard();
          break;
        case 5:
          showPhaseFiveCard(item);
          break;
        case 6:
          showPhaseSixCard(item);
          break;
        case 7:
          showPhaseSevenCard(item);
          break;
        case 8:
          showPhaseEightCard(item);
          break;
        case 9:
          showPhaseNineCard(item);
          break;
        case 10:
          showPhaseTenCard(item);
          break;
        case 11:
          showPhaseElevenCard(item);
          break;
        case 12:
          showPhaseTwelveCard(item);
          break;
        default:
          showPhaseOneCard(item);
      }
    });
  }

  function buildCompletionGridItems(target) {
    const basePool = dayEntries.length ? dayEntries : pool;
    const fallbackPool = basePool.filter(entry => entry && entry.file && entry.file !== target.file);
    const randomOptions = shuffle(fallbackPool).slice(0, 3);

    while (randomOptions.length < 3 && fallbackPool.length) {
      const candidate = fallbackPool[Math.floor(Math.random() * fallbackPool.length)];
      randomOptions.push(candidate);
    }

    while (randomOptions.length < 3) {
      randomOptions.push(target);
    }

    const selection = [target, ...randomOptions.slice(0, 3)];
    return shuffle(selection).slice(0, 4);
  }

  function showCompletionGrid(target) {
    if (!target) return;

    clearBoard();
    boardInner.classList.add('board__inner--grid');
    const items = buildCompletionGridItems(target);

    items.forEach(entry => {
      const card = document.createElement('div');
      card.className = 'grid-card grid-card--enter grid-card--static';
      const imageWrapper = createEntryImage(entry, 'grid-card__image', { fill: true });
      card.appendChild(imageWrapper);
      boardInner.appendChild(card);
    });

    playPronunciation(target);
  }

  function showProgressCompletionOverlay(nextPhase) {
    return new Promise(resolve => {
      if (progressCompleteOverlay) {
        progressCompleteOverlay.classList.add('active');
        progressCompleteOverlay.setAttribute('aria-hidden', 'false');
      }

      Promise.resolve(playPhaseIntro(nextPhase)).then(() => {
        if (progressCompleteOverlay) {
          progressCompleteOverlay.classList.remove('active');
          progressCompleteOverlay.setAttribute('aria-hidden', 'true');
        }
        resolve();
      });
    });
  }

  async function showPhaseTransition(nextPhase) {
    if (!preGameScreen || !preGameStartBtn || !preGameTitle) {
      startPhase(nextPhase);
      return;
    }

    if (nextPhase === 1 && !isSingleModeSession()) {
      await ensureDeviceSelection();
    }

    const phaseName = getPhaseName(nextPhase);
    const config = {
      title: phaseName,
      cta: 'Iniciar jogo'
    };

    preGameTitle.textContent = config.title;
    if (preGameLogline) {
      preGameLogline.textContent = getPreGameLoglineText(nextPhase);
    }
    preGameStartBtn.textContent = config.cta;
    setPreGameIcon(nextPhase);
    configurePreGameIconActions(nextPhase);
    configurePreGameAdminControls(nextPhase);
    preGameScreen.classList.remove('hidden');
    preGameScreen.setAttribute('aria-hidden', 'false');
    preGameStartBtn.disabled = false;
    document.body.classList.add('pre-game-active');

    await loadAudioLevelsConfig();
    const audioName = getPhaseAudioName(level, nextPhase);
    const audio = audioName ? await getAudioElementFromName(audioName) : null;
    const hasAudio = Boolean(audioName && audio);
    const introAudioBaseVolume = isAudioMuted ? 0 : 1;
    let introAudioEnded = !hasAudio;
    let cleanupIntroListeners = null;

    let startTransitionTriggered = false;
    const startNextPhase = async () => {
      if (startTransitionTriggered) return;
      startTransitionTriggered = true;
      preGameStartBtn.removeEventListener('click', startNextPhase);
      if (audio) {
        if (cleanupIntroListeners) {
          cleanupIntroListeners();
          cleanupIntroListeners = null;
        }
        await fadeOutAndStopAudio(audio, {
          durationMs: introAudioEnded ? 0 : INTRO_AUDIO_FADEOUT_MS,
          resetVolume: introAudioBaseVolume
        });
      }
      preGameScreen.classList.add('hidden');
      preGameScreen.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('pre-game-active');
      startPhase(nextPhase, { skipIntroAudio: true });
    };

    preGameStartBtn.addEventListener('click', startNextPhase);
    if (!hasAudio || !audio) {
      return;
    }

    audio.pause();
    audio.currentTime = 0;
    audio.volume = introAudioBaseVolume;
    introAudioEnded = false;
    const markEnded = () => {
      introAudioEnded = true;
      markPhaseAudioListened(level, nextPhase);
      if (cleanupIntroListeners) {
        cleanupIntroListeners();
        cleanupIntroListeners = null;
      }
    };
    audio.addEventListener('ended', markEnded);
    audio.addEventListener('error', markEnded);
    cleanupIntroListeners = () => {
      audio.removeEventListener('ended', markEnded);
      audio.removeEventListener('error', markEnded);
    };

    audio.play().catch(() => {
      introAudioEnded = true;
      if (cleanupIntroListeners) {
        cleanupIntroListeners();
        cleanupIntroListeners = null;
      }
    });
  }

  function handleProgressCompletion() {
    pauseLevelTimer();
    persistProgressState();
    if (isSingleModeSession()) {
      clearSinglePhaseProgress(level, phase);
      awaiting = false;
      handlePhaseComplete({ nextPhase: null, skipIntroAudio: true });
      return;
    }
    const nextPhase = getNextPhaseForDay();
    if (!nextPhase) {
      awaiting = false;
      handlePhaseComplete();
      return;
    }
    if (phase === 1 || phase === 2 || phase === 3 || phase === 4) {
      awaiting = false;
      handlePhaseComplete({ nextPhase, showTransition: true });
      return;
    }

    if (phase >= 5) {
      awaiting = false;
      handlePhaseComplete({ nextPhase, showTransition: true });
      return;
    }

    if (completionGridShown) {
      handlePhaseComplete();
      return;
    }

    completionGridShown = true;
    if (!currentItem) {
      handlePhaseComplete();
      return;
    }

    awaiting = true;
    showCompletionGrid(currentItem);
    awaiting = false;
    handlePhaseComplete({ nextPhase });
  }

  function dissolveEnvironment(callback) {
    hidePhaseElements();
    if (typeof callback === 'function') {
      callback();
    }
  }

  async function startPhase(nextPhase, options = {}) {
    if (phaseStartInProgress) return;
    phaseStartInProgress = true;
    const { skipIntroAudio = false } = options;
    try {
      const fallbackPhase = getFirstPhaseForDay();
      if (!fallbackPhase) {
        phase = nextPhase;
        updatePhaseLabel();
        clearBoard();
        showText('Aula nao encontrada');
        return;
      }
      if (isSingleModeSession() && !dayPhaseEntries.has(nextPhase)) {
        phase = nextPhase;
        updatePhaseLabel();
        clearBoard();
        showText('Aula nao encontrada');
        return;
      }
      phase = dayPhaseEntries.has(nextPhase) ? nextPhase : fallbackPhase;
      resetPhaseResultsStats(phase);
      updatePhaseLabel();
      updateRecognitionLanguage(phase);
      applyBoardSizing(phase);
      setupGameControls();
      setMicContinuousMode(false);
      setMicPersistentEnabled(false, { force: true });
      stopMicPromptLoop();
      if (journeyPhaseIndex === 0) {
        resetLevelState();
      }
      filterPool();
      resetProgress();
      preparePhaseIntro();
      if (!skipIntroAudio) {
        await playPhaseIntro(phase);
      }
      if (isTalkingPhase(phase)) {
        showPhaseElements();
        if (isExternalSingleLaunch) {
          notifyPlayLaunchReady();
        }
        await showMode12CharacterPicker();
      }
      if (journeyPhaseIndex === 0) {
        if (!isGamePaused) {
          startLevelTimer();
        }
      } else if (!isGamePaused) {
        resumePausedLevelTimer();
      }
      advanceCycle();
      startLiveStatsPulseLoop();
      pulseLiveJourneyStats();
      if (!isTalkingPhase(phase)) {
        showPhaseElements();
      }
    } finally {
      phaseStartInProgress = false;
    }
  }

  function showLevelCompleteOverlay(completedLevel) {
    const previousLevel = Number.isFinite(completedLevel) ? completedLevel : level;
    const nextLevel = level;
    saveLevelToStorage();
    updateLevelIndicators();
    levelCompleteText.textContent = `VocÃƒÆ’Ã‚Âª concluiu o dia ${previousLevel}. Vamos para o dia ${nextLevel}?`;
    if (levelCountdown) {
      levelCountdown.textContent = '';
    }
    levelComplete.classList.remove('hidden');
    nextLevelBtn.disabled = true;
    nextLevelBtn.classList.add('is-hidden');
    nextLevelBtn.textContent = 'Ir para o prÃƒÆ’Ã‚Â³ximo';
    if (replayLevelBtn) {
      replayLevelBtn.disabled = false;
    }
    clearLevelUnlockTimer();

    const shouldPlayConclusion = previousLevel === 1 && conclusionAudio;
    const playPromise = shouldPlayConclusion ? playAudioElement(conclusionAudio) : Promise.resolve();

    playPromise.then(() => {
      nextLevelBtn.disabled = false;
      nextLevelBtn.textContent = `Iniciar dia ${nextLevel}`;
      nextLevelBtn.classList.remove('is-hidden');
      if (levelCountdown) {
        levelCountdown.textContent = '';
      }
    });
  }

  function handlePhaseComplete(options = {}) {
    if (phaseCompleteInProgress) return;
    phaseCompleteInProgress = true;
    const {
      skipIntroAudio = false,
      nextPhase = getNextPhaseForDay(),
      showTransition = false
    } = options;
    const proceedAfterResults = () => {
      phaseCompleteInProgress = false;
      pendingPhaseCoinAward = 0;
      clearLiveJourneyStats();

      if (isSingleModeSession()) {
        clearGameContext();
        const restartSinglePhase = Number.isFinite(activeSinglePhase)
          ? activeSinglePhase
          : (Number.isFinite(forcedPhase) ? forcedPhase : phase);
        dissolveEnvironment(() => {
          if (returnToHomeAfterSinglePhase) {
            resetJourneyState({ resetLevel: false, clearJourneyProgress: false });
            if (isCardsLaunch) {
              window.dispatchEvent(new CustomEvent('playtalk:return-cards'));
              return;
            }
            if (document.body && document.body.classList.contains('page-play')) {
              window.dispatchEvent(new CustomEvent('playtalk:return-play'));
              return;
            }
            document.body.classList.add('page-return-to-play');
            try {
              sessionStorage.removeItem('playtalk-play-launch');
            } catch (error) {
              // no-op
            }
            window.location.href = '/#play';
            return;
          }
          startPhase(restartSinglePhase, { skipIntroAudio: true });
        });
        return;
      }
      if (!nextPhase) {
        clearCompletionStorage();
        clearProgressStorage();
        awaiting = false;
        showFinalSequence(level, getLevelElapsedMs());
        return;
      }

      if (showTransition) {
        awaiting = false;
        completionGridShown = true;
        clearBoard();
        showText('');
        if (choiceRow) choiceRow.innerHTML = '';
        hidePhaseElements();
        journeyPhaseIndex = Math.min(journeyPhaseIndex + 1, Math.max(dayPhaseSequence.length - 1, 0));
        showPhaseTransition(nextPhase);
        return;
      }

      journeyPhaseIndex = Math.min(journeyPhaseIndex + 1, Math.max(dayPhaseSequence.length - 1, 0));
      dissolveEnvironment(() => {
        startPhase(nextPhase, { skipIntroAudio });
      });
    };

    playLevelCompleteAudioForPhase(phase);
    showPhaseResults(proceedAfterResults);
  }

  async function showFinalSequence(completedLevel, finalElapsedMs = 0) {
    await showDailyJourneyResult(completedLevel, finalElapsedMs);
  }

  function startDayJourney() {
    const firstPhase = getFirstPhaseForDay();
    if (!firstPhase) {
      if (preGameScreen) {
        preGameScreen.classList.add('hidden');
        preGameScreen.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('pre-game-active');
      }
      if (progressCompleteOverlay) {
        progressCompleteOverlay.setAttribute('aria-hidden', 'true');
      }
      showPhaseElements();
      clearBoard();
      showText('Aula nao encontrada');
      return;
    }
    const phaseToStart = isSingleModeSession()
      ? (dayPhaseSequence.includes(forcedPhase) ? forcedPhase : firstPhase)
      : firstPhase;
    journeyPhaseIndex = isSingleModeSession()
      ? Math.max(0, dayPhaseSequence.indexOf(phaseToStart))
      : 0;
    phase = phaseToStart;
    updatePhaseLabel();
    showPhaseTransition(phaseToStart);
  }

  function handleStartInteraction() {
    if (gameStarted) return;
    singleModeSessionActive = false;
    activeSinglePhase = null;
    setGameStartedState(true);
    clearCompletionStorage();
    clearProgressStorage();
    markJourneyStarted();

    if (startScreen) {
      startScreen.classList.add('start-screen--blank');
      startScreen.classList.add('hidden');
    }

    if (rotationTimer) {
      clearInterval(rotationTimer);
      rotationTimer = null;
    }

    loadJourneyData(level).then(() => {
      startDayJourney();
    });
  }

  function hasSavedJourneyState() {
    const progressState = readProgressStorage();
    const completionState = readCompletionStorage();
    const hasProgress = Boolean(
      progressState
        && progressState.level
        && progressState.phase
        && Array.isArray(progressState.cycle)
    );
    const hasCompletion = Boolean(completionState && completionState.completedLevel);
    return hasProgress || hasCompletion;
  }

  function resetJourneyState({ resetLevel = true } = {}) {
    if (isGamePaused) {
      setGamePaused(false);
    }
    clearLevelUnlockTimer();
    clearCompletionStorage();
    clearProgressStorage();
    clearJourneyStarted();
    clearGameContext();
    dayPhaseEntries = new Map();
    dayPhaseMeta = new Map();
    customPhaseOverrides = new Map();
    dayPhaseSequence = [];
    baseDayPhaseSequence = [];
    hasCustomJourneySequence = false;
    journeyPhaseIndex = 0;
    dayEntries = [];
    levelCache = new Map();
    mode11VoiceMode = 'both';
    mode11SpeedIndex = 2;
    mode11SubtitleMode = 'english';
    mode11BackAction = null;
    mode12SpeechMode = 'english';
    mode12SubtitleMode = 'english';
    mode12SelectedCharacterId = '';
    mode12CharacterMap = new Map();
    mode12BackAction = null;
    mode12AdvanceAction = null;
    mode12CurrentNeedsUserLine = false;
    pausePromptStartMode = false;
    hideMode12HeartsTitle();
    setMicContinuousMode(false);
    setMicPersistentEnabled(false, { force: true });
    if (resetLevel) {
      loadLevelFromStorage();
    }
    phase = 1;
    updatePhaseLabel();
    resetLevelState();
    resetProgress();
    clearBoard();
    showText('');
    hidePhaseElements();
    if (levelComplete) levelComplete.classList.add('hidden');
    if (preGameScreen) {
      preGameScreen.classList.add('hidden');
      preGameScreen.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('pre-game-active');
    }
    hidePlayingOverlay();
    if (playingInstructionAudio) {
      fadeOutAndStopAudio(playingInstructionAudio, { durationMs: 0, resetVolume: isAudioMuted ? 0 : 1 }).catch(() => {});
      playingInstructionAudio = null;
    }
    hideResultsOverlay();
    if (progressCompleteOverlay) progressCompleteOverlay.setAttribute('aria-hidden', 'true');
    if (finalOverlay) {
      finalOverlay.classList.remove('active');
      finalOverlay.setAttribute('aria-hidden', 'true');
    }
    stopFinalSlideshow();
    stopLiveStatsPulseLoop();
    clearLiveJourneyStats();
    completedLevelSnapshot = null;
    journeyRunStats = createEmptyJourneyStats();
    awaiting = false;
    setGameStartedState(false);
    returnToHomeAfterSinglePhase = false;
    pendingPhaseCoinAward = 0;
  }

  function resumeJourney() {
    if (gameStarted) return;
    singleModeSessionActive = false;
    activeSinglePhase = null;
    if (!hasSavedJourneyState()) {
      handleStartInteraction();
      return;
    }
    const readyCompletion = resolveReadyCompletionState();
    if (readyCompletion) {
      handleStartInteraction();
      return;
    }
    const storedProgress = readProgressStorage();
    if (storedProgress && storedProgress.level) {
      level = storedProgress.level;
      updateLevelIndicators();
    }
    markJourneyStarted();
    setGameStartedState(true);
    if (startScreen) {
      startScreen.classList.add('start-screen--blank');
      startScreen.classList.add('hidden');
    }
    if (rotationTimer) {
      clearInterval(rotationTimer);
      rotationTimer = null;
    }
    loadJourneyData(level).then(() => {
      const completionState = readCompletionStorage();
      if (restoreProgressState()) {
        showPhaseElements();
        advanceCycle();
        if (openPauseOnResume) {
          window.setTimeout(() => {
            openPauseOnResume = false;
            openPlayingPauseMenu();
          }, 120);
        }
        return;
      }
      if (completionState && completionState.completedLevel) {
        setGameStartedState(false);
        clearGameContext();
        window.dispatchEvent(new CustomEvent('playtalk:return-home'));
        openPauseOnResume = false;
        return;
      }
      phase = getFirstPhaseForDay() || 1;
      updatePhaseLabel();
      startDayJourney();
      openPauseOnResume = false;
    });
  }

  function resumeJourneyToPause() {
    pausePromptStartMode = false;
    if (gameStarted) {
      openPlayingPauseMenu();
      return;
    }
    openPauseOnResume = true;
    resumeJourney();
  }

  function startNewJourney(options = {}) {
    returnToHomeAfterSinglePhase = false;
    singleModeSessionActive = false;
    activeSinglePhase = null;
    resetJourneyState({ resetLevel: true, clearJourneyProgress: true });
    handleStartInteraction();
  }

  function startSinglePhase(phaseNumber, options = {}) {
    const nextPhase = Number.parseInt(phaseNumber, 10);
    if (!Number.isFinite(nextPhase) || nextPhase < 1 || nextPhase > MAX_PHASE) {
      return;
    }
    const nextDay = Number.parseInt(options.day, 10);
    if (Number.isFinite(nextDay) && nextDay > 0) {
      level = nextDay;
      saveLevelToStorage();
      updateLevelIndicators();
    }
    singleModeSessionActive = true;
    activeSinglePhase = nextPhase;
    resetJourneyState({ resetLevel: false, clearJourneyProgress: false });
    singleModeSessionActive = true;
    activeSinglePhase = nextPhase;
    returnToHomeAfterSinglePhase = options.returnToPlay !== false;
    setGameStartedState(true);
    if (startScreen) {
      startScreen.classList.add('start-screen--blank');
      startScreen.classList.add('hidden');
    }
    loadJourneyData(level).then(() => {
      journeyPhaseIndex = 0;
      phase = nextPhase;
      updatePhaseLabel();
      showPhaseTransition(phase);
    });
  }

  function setupMedalSkipShortcut() {
    const medalTarget = gameMedalIcon ? gameMedalIcon.closest('.game-medal') || gameMedalIcon : null;
    if (!medalTarget) return;
    let taps = 0;
    let resetTimer = null;

    const reset = () => {
      taps = 0;
      if (resetTimer) {
        clearTimeout(resetTimer);
        resetTimer = null;
      }
    };

    const handleTap = () => {
      taps += 1;
      if (taps >= 3) {
        reset();
        handleProgressCompletion();
        return;
      }
      if (resetTimer) {
        clearTimeout(resetTimer);
      }
      resetTimer = window.setTimeout(reset, 800);
    };

    medalTarget.addEventListener('pointerdown', handleTap);
  }

  function ensureGameControlsDom() {
    renderGameControlsForPhase(phase);
  }

  function setupGameControls() {
    ensureGameControlsDom();
    if (pauseButton) {
      pauseButton.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        togglePause();
      });
    }
    if (volumeButton) {
      volumeButton.addEventListener('click', toggleVolume);
    }
    if (narratorButton) {
      narratorButton.addEventListener('click', () => {
        if (!isCharacterVoicePhase()) return;
        toggleVoiceCharacter();
      });
    }
    if (micButton) {
      let holdTimer = null;
      let holdTriggered = false;
      let holdArmed = false;

      const clearHold = () => {
        holdArmed = false;
        if (holdTimer) {
          window.clearTimeout(holdTimer);
          holdTimer = null;
        }
      };

      micButton.addEventListener('pointerdown', () => {
        if (isGamePaused) return;
        holdTriggered = false;
        holdArmed = true;
        if (holdTimer) {
          window.clearTimeout(holdTimer);
        }
        holdTimer = window.setTimeout(() => {
          if (!holdArmed) return;
          holdTriggered = true;
          if (micContinuousMode) {
            setMicContinuousMode(false);
            setMicPersistentEnabled(false, { force: true });
            return;
          }
          setMicContinuousMode(true);
          setMicPersistentEnabled(true, { force: true });
          requestMicrophoneAccess().then((granted) => {
            if (granted && typeof currentMicAction === 'function' && !awaiting && !isGamePaused) {
              currentMicAction();
            }
          });
        }, MIC_CONTINUOUS_HOLD_MS);
      });

      micButton.addEventListener('pointerup', clearHold);
      micButton.addEventListener('pointercancel', clearHold);
      micButton.addEventListener('pointerleave', clearHold);

      micButton.addEventListener('click', () => {
        if (holdTriggered) return;
        if (isGamePaused) return;
        if (!currentMicAction || awaiting) return;
        setMicPersistentEnabled(true);
        requestMicrophoneAccess().then((granted) => {
          if (!granted) return;
          currentMicAction();
        });
      });
    }
    if (backButton) {
      backButton.addEventListener('click', () => {
        if (isWatchingPhase() && typeof mode11BackAction === 'function') {
          mode11BackAction();
          return;
        }
        if (isTalkingPhase() && typeof mode12BackAction === 'function') {
          mode12BackAction();
        }
      });
    }
    if (voiceButton) {
      voiceButton.addEventListener('click', () => {
        const currentIndex = MODE11_VOICE_MODES.indexOf(mode11VoiceMode);
        const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % MODE11_VOICE_MODES.length : 0;
        mode11VoiceMode = MODE11_VOICE_MODES[nextIndex];
        updateControlButtons();
        if (isWatchingPhase() && currentItem) {
          showPhaseElevenCard(currentItem, { replayAudio: true });
        }
      });
    }
    if (speedButton) {
      speedButton.addEventListener('click', () => {
        mode11SpeedIndex = (mode11SpeedIndex + 1) % MODE_AUDIO_SPEEDS.length;
        updateControlButtons();
        if (isWatchingPhase() && currentItem) {
          showPhaseElevenCard(currentItem, { replayAudio: true });
          return;
        }
        if (isTalkingPhase() && currentItem && !mode12CurrentNeedsUserLine) {
          showPhaseTwelveCard(currentItem);
        }
      });
    }
    if (subtitleButton) {
      subtitleButton.addEventListener('click', () => {
        if (isWatchingPhase()) {
          const currentIndex = MODE11_SUBTITLE_MODES.indexOf(mode11SubtitleMode);
          const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % MODE11_SUBTITLE_MODES.length : 0;
          mode11SubtitleMode = MODE11_SUBTITLE_MODES[nextIndex];
        } else if (isTalkingPhase()) {
          const currentIndex = MODE11_SUBTITLE_MODES.indexOf(mode12SubtitleMode);
          const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % MODE11_SUBTITLE_MODES.length : 0;
          mode12SubtitleMode = MODE11_SUBTITLE_MODES[nextIndex];
        }
        updateControlButtons();
        if (isWatchingPhase() && currentItem) {
          updateMode11SubtitleForCurrentItem(currentItem);
          return;
        }
        if (isTalkingPhase() && currentItem) {
          updateMode12SubtitleForCurrentItem(currentItem, { animate: true });
        }
      });
    }
    if (languageButton) {
      languageButton.addEventListener('click', () => {
        mode12SpeechMode = mode12SpeechMode === 'english' ? 'portuguese' : 'english';
        updateRecognitionLanguage(12);
        updateControlButtons();
        if (isTalkingPhase() && currentItem) {
          showPhaseTwelveCard(currentItem);
        }
      });
    }
    updateControlButtons();
  }


  function persistProgressState() {
    if (!gameStarted) return;
    const snapshot = {
      level,
      phase,
      index,
      score,
      errorStreak,
      attemptCount,
      correctStreak,
      totalErrors,
      medalKey: currentMedalKey,
      heartsRemaining,
      cycle: cycle.map(item => getEntryStorageKey(item)),
      levelElapsedMs: getLevelElapsedMs(),
      phaseFour: phase === 4 ? {
        batchStart: phaseFourBatchStart,
        resolved: phaseFourResolved
      } : null,
      journeyPhaseSequence: dayPhaseSequence.slice(),
      journeyPhaseIndex,
      journeyTotalSteps: getJourneyTotalSteps(),
      journeyCompletedSteps: getJourneyCompletedSteps()
    };
    if (isSingleModeSession()) {
      saveSinglePhaseProgress(level, phase, snapshot);
      return;
    }
    saveProgressStorage(snapshot);
  }

  function restoreProgressState(stored = readProgressStorage(), options = {}) {
    const singleGame = Boolean(options && options.singleGame);
    if (!stored || !stored.level || !stored.phase || !Array.isArray(stored.cycle)) {
      return false;
    }

    level = stored.level;
    phase = stored.phase;

    if (!singleGame) {
      const storedJourneySequence = Array.isArray(stored.journeyPhaseSequence)
        ? stored.journeyPhaseSequence
          .map(value => Number.parseInt(value, 10))
          .filter(value => Number.isFinite(value) && value >= 1 && value <= MAX_PHASE)
        : [];
      if (storedJourneySequence.length) {
        dayPhaseSequence = storedJourneySequence;
        baseDayPhaseSequence = storedJourneySequence.slice();
        hasCustomJourneySequence = true;
      }
      if (dayPhaseSequence.length && !dayPhaseSequence.includes(phase)) {
        phase = dayPhaseSequence[0];
      }
      const storedJourneyIndex = Number.parseInt(stored.journeyPhaseIndex, 10);
      journeyPhaseIndex = Number.isFinite(storedJourneyIndex)
        ? Math.min(Math.max(storedJourneyIndex, 0), Math.max(dayPhaseSequence.length - 1, 0))
        : 0;
    } else {
      journeyPhaseIndex = Math.max(0, dayPhaseSequence.indexOf(phase));
    }

    index = Math.max(0, Number(stored.index) || 0);
    score = Math.max(0, Number(stored.score) || 0);
    errorStreak = Math.max(0, Number(stored.errorStreak) || 0);
    attemptCount = Math.max(0, Number(stored.attemptCount) || 0);
    correctStreak = Math.max(0, Number(stored.correctStreak) || 0);
    totalErrors = Math.max(0, Number(stored.totalErrors) || 0);
    resumeLevelTimer(stored.levelElapsedMs);

    updateLevelIndicators();
    updatePhaseLabel();
    updateRecognitionLanguage(phase);
    applyBoardSizing(phase);
    filterPool();
    cycle = buildCycleFromFiles(stored.cycle);

    if (!cycle.length) {
      cycle = buildCycleForPhase(pool, phase);
    }

    const total = Math.max(cycle.length, 1);
    score = Math.min(score, total);
    index = Math.min(index, total);

    currentMedalKey = normalizeMedalKey(stored.medalKey || getMedalForErrors(totalErrors));
    const totalHearts = getHeartsTotal(currentMedalKey);
    heartsRemaining = Number.isFinite(stored.heartsRemaining)
      ? Math.min(Math.max(Number(stored.heartsRemaining), 0), totalHearts)
      : totalHearts;
    updateHeartsDisplay();
    updateMedalHud(currentMedalKey);
    updateFinalMedal(currentMedalKey);
    const phaseFourState = stored.phaseFour && typeof stored.phaseFour === 'object' ? stored.phaseFour : null;
    if (phase === 4) {
      const batchStart = Number.isFinite(phaseFourState?.batchStart) ? phaseFourState.batchStart : 0;
      const resolved = Number.isFinite(phaseFourState?.resolved) ? phaseFourState.resolved : 0;
      phaseFourBatchStart = Math.max(0, batchStart);
      phaseFourResolved = Math.max(0, resolved);
      phaseFourExpectedIndex = phaseFourResolved;
      phaseFourBatch = cycle.slice(phaseFourBatchStart, phaseFourBatchStart + PHASE_FOUR_BATCH_SIZE);
    }
    updateProgressBar();
    completionGridShown = false;
    awaiting = false;
    return true;
  }

  function resetJourneyState({ resetLevel = true, clearJourneyProgress = true } = {}) {
    if (isGamePaused) {
      setGamePaused(false);
    }
    clearLevelUnlockTimer();
    if (clearJourneyProgress) {
      clearCompletionStorage();
      clearProgressStorage();
      clearJourneyStarted();
    }
    dayPhaseEntries = new Map();
    dayPhaseMeta = new Map();
    customPhaseOverrides = new Map();
    dayPhaseSequence = [];
    baseDayPhaseSequence = [];
    hasCustomJourneySequence = false;
    journeyPhaseIndex = 0;
    dayEntries = [];
    levelCache = new Map();
    mode11VoiceMode = 'both';
    mode11SpeedIndex = 2;
    mode11SubtitleMode = 'english';
    mode11BackAction = null;
    mode12SpeechMode = 'english';
    mode12SubtitleMode = 'english';
    mode12SelectedCharacterId = '';
    mode12CharacterMap = new Map();
    mode12BackAction = null;
    mode12AdvanceAction = null;
    mode12CurrentNeedsUserLine = false;
    pausePromptStartMode = false;
    hideMode12HeartsTitle();
    setMicContinuousMode(false);
    setMicPersistentEnabled(false, { force: true });
    if (resetLevel) {
      loadLevelFromStorage();
    }
    phase = 1;
    updatePhaseLabel();
    resetLevelState();
    resetProgress();
    clearBoard();
    showText('');
    hidePhaseElements();
    if (levelComplete) levelComplete.classList.add('hidden');
    if (preGameScreen) {
      preGameScreen.classList.add('hidden');
      preGameScreen.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('pre-game-active');
    }
    hidePlayingOverlay();
    if (playingInstructionAudio) {
      fadeOutAndStopAudio(playingInstructionAudio, { durationMs: 0, resetVolume: isAudioMuted ? 0 : 1 }).catch(() => {});
      playingInstructionAudio = null;
    }
    hideResultsOverlay();
    if (progressCompleteOverlay) progressCompleteOverlay.setAttribute('aria-hidden', 'true');
    if (finalOverlay) {
      finalOverlay.classList.remove('active');
      finalOverlay.setAttribute('aria-hidden', 'true');
    }
    stopFinalSlideshow();
    stopLiveStatsPulseLoop();
    clearLiveJourneyStats();
    completedLevelSnapshot = null;
    journeyRunStats = createEmptyJourneyStats();
    awaiting = false;
    setGameStartedState(false);
    returnToHomeAfterSinglePhase = false;
    pendingPhaseCoinAward = 0;
    clearGameContext();
  }
  function init() {
    journeyRunStats = createEmptyJourneyStats();
    configureFeedbackAudioSources();
    const storedProgress = isSingleModeSession() ? null : readProgressStorage();
    const completionState = isSingleModeSession() ? null : (resolveReadyCompletionState(), readCompletionStorage());
    const onboardingDone = (() => {
      if (window.playtalkPlayerState && typeof window.playtalkPlayerState.get === 'function') {
        const state = window.playtalkPlayerState.get();
        return Boolean(state && state.onboardingDone);
      }
      try {
        const raw = localStorage.getItem('playtalk_player_profile');
        if (!raw) return false;
        const parsed = JSON.parse(raw);
        return Boolean(parsed && parsed.onboardingDone);
      } catch (error) {
        return false;
      }
    })();
    const shouldAutoStart = (!deferAutoStart || isExternalSingleLaunch) && (onboardingDone || !isExternalSingleLaunch);
    if (isExternalSingleLaunch) {
      gameRoot.classList.add('from-play');
      returnToHomeAfterSinglePhase = true;
    }
    if (Number.isFinite(requestedDay) && requestedDay > 0) {
      level = requestedDay;
      saveLevelToStorage();
      updateLevelIndicators();
    }
    if (storedProgress && storedProgress.level) {
      level = storedProgress.level;
      updateLevelIndicators();
    }
    if (!storedProgress || !storedProgress.level) {
      loadLevelFromStorage();
    }
    const playLaunchPhase = Number.isFinite(forcedPhase) ? forcedPhase : (Number.isFinite(requestedPhase) ? requestedPhase : 1);
    const singleStoredProgress = isSingleModeSession() ? readSinglePhaseProgress(level, playLaunchPhase) : null;
    updatePhaseLabel();
    setupSpeechRecognition();
    setupGameControls();
    syncGlobalRadioMuteState();
    syncGameRuntimeState();
    document.addEventListener('playtalk:global-radio-change', (event) => {
      const detail = event && event.detail ? event.detail : null;
      isAudioMuted = Boolean(detail && detail.muted);
      updateControlButtons();
    });
    document.addEventListener('playtalk:before-page-change', (event) => {
      const from = String(event?.detail?.from || '');
      const to = String(event?.detail?.to || '');
      const leavingCurrentGamePage = (from === 'index.html' || from === 'play.html') && to !== from;
      if (!leavingCurrentGamePage) return;
      if (!gameStarted) return;
      hidePlayingOverlay();
      setGamePaused(true, { keepPhaseTrack: true });
    });
    document.addEventListener('playtalk:view-change', (event) => {
      const nextView = String(event?.detail?.view || '').toLowerCase();
      if (!nextView || nextView === 'home') return;
      if (!gameStarted) return;
      hidePlayingOverlay();
      setGamePaused(true, { keepPhaseTrack: true });
    });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) return;
      if (!gameStarted) return;
      hidePlayingOverlay();
      setGamePaused(true, { keepPhaseTrack: true });
    });
    document.addEventListener('pointerdown', () => {
      if (!gameStarted || isGamePaused) return;
      pulseLiveJourneyStats();
      registerPlayerActivity();
    }, true);
    document.addEventListener('keydown', () => {
      if (!gameStarted || isGamePaused) return;
      pulseLiveJourneyStats();
      registerPlayerActivity();
    }, true);
    if (playingScreen) {
      playingScreen.addEventListener('pointerdown', (event) => {
        if (event.target && event.target.closest('.playing-action, #dynamic-bar')) return;
        if (!isGamePaused) return;
        resumeFromPauseOverlay().catch(() => {});
      });
    }
    if (playingHelpBtn) {
      playingHelpBtn.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        playPauseInstructionAudio().catch(() => {});
      });
    }
    if (playingHomeBtn) {
      playingHomeBtn.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        pausePromptStartMode = false;
        if (playingInstructionAudio) {
          fadeOutAndStopAudio(playingInstructionAudio, { durationMs: 0, resetVolume: isAudioMuted ? 0 : 1 }).catch(() => {});
        }
        setGamePaused(true);
        hidePlayingOverlay();
        if (isCardsLaunch) {
          window.dispatchEvent(new CustomEvent('playtalk:return-cards'));
        } else if (isPlayLaunch || (document.body && document.body.classList.contains('page-play'))) {
          window.dispatchEvent(new CustomEvent('playtalk:return-play'));
        } else {
          window.dispatchEvent(new CustomEvent('playtalk:return-home'));
        }
      });
    }
    if (playingResetBtn) {
      playingResetBtn.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        resetCurrentLevelFromPause().catch(() => {});
      });
    }
    resetLevelState();
    if (shouldAutoStart) {
      loadJourneyData(level).then(() => {
        if (isExternalSingleLaunch) {
          setGameStartedState(true);
          if (startScreen) {
            startScreen.classList.add('start-screen--blank');
            startScreen.classList.add('hidden');
          }
          if (rotationTimer) {
            clearInterval(rotationTimer);
            rotationTimer = null;
          }
          const phaseToStart = Number.isFinite(forcedPhase)
            ? forcedPhase
            : (getFirstPhaseForDay() || 1);
          if (singleStoredProgress && restoreProgressState(singleStoredProgress, { singleGame: true })) {
            showPhaseElements();
            advanceCycle();
            window.setTimeout(() => {
              openPlayingPauseMenu();
              notifyPlayLaunchReady();
            }, 120);
            return;
          }
          dissolveEnvironment(() => {
            startPhase(phaseToStart, { skipIntroAudio: true })
              .then(() => {
                notifyPlayLaunchReady();
              })
              .catch(() => {
                notifyPlayLaunchReady();
              });
          });
          return;
        }
        if (storedProgress && restoreProgressState()) {
    setGameStartedState(true);
          markJourneyStarted();
          if (startScreen) {
            startScreen.classList.add('start-screen--blank');
            startScreen.classList.add('hidden');
          }
          if (rotationTimer) {
            clearInterval(rotationTimer);
            rotationTimer = null;
          }
          showPhaseElements();
          advanceCycle();
          return;
        }

        if (completionState && completionState.completedLevel) {
          if (startScreen) {
            startScreen.classList.remove('hidden');
            startScreen.classList.remove('start-screen--blank');
          }
          setGameStartedState(false);
          clearGameContext();
        }
      });

      if (!storedProgress && !(completionState && completionState.completedLevel)) {
        if (!isExternalSingleLaunch) {
          startRotatingText();
        }
      }
    } else if (startScreen) {
      startScreen.classList.add('start-screen--blank');
      startScreen.classList.add('hidden');
    }

    if (startScreen && !isExternalSingleLaunch && shouldAutoStart) {
      startScreen.addEventListener('click', handleStartInteraction);
      startScreen.addEventListener('touchstart', handleStartInteraction, { passive: true });
      startScreen.addEventListener('pointerdown', handleStartInteraction);
    }

    setupMedalSkipShortcut();

    nextLevelBtn.addEventListener('click', () => {
      clearLevelUnlockTimer();
      clearCompletionStorage();
      clearProgressStorage();
      levelComplete.classList.add('hidden');
      loadJourneyData(level).then(() => {
        phase = getFirstPhaseForDay() || 1;
        updatePhaseLabel();
        startDayJourney();
      });
    });

    if (replayLevelBtn) {
      replayLevelBtn.addEventListener('click', () => {
        clearLevelUnlockTimer();
        clearCompletionStorage();
        clearProgressStorage();
        levelComplete.classList.add('hidden');
        if (Number.isFinite(completedLevelSnapshot)) {
          level = completedLevelSnapshot;
        }
        loadJourneyData(level).then(() => {
          phase = getFirstPhaseForDay() || 1;
          updatePhaseLabel();
          startDayJourney();
        });
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.playtalkGame = {
    startNewJourney,
    startSinglePhase,
    resumeJourney,
    resumeJourneyToPause,
    resetJourney: resetJourneyState,
    hasSavedJourneyState
  };
})();
























































































