window.PLAYTALK_GAME_CONFIG = { deferAutoStart: true };

(() => {
  const JOURNEY_STARTED_KEY = 'playtalk-journey-started';
  const PROGRESS_STORAGE_KEY = 'vocabulary-progress';
  const COMPLETION_STORAGE_KEY = 'vocabulary-last-complete';
  const LEVEL_TWO_UNLOCK_STORAGE_KEY = 'vocabulary-level2-unlock-at';
  const LEVEL_TWO_UNLOCK_HOUR = 6;
  const STICKY_JOURNEY_PERCENT_KEY = 'playtalk-home-journey-percent-sticky-v1';
  const LAST_COMPLETED_DAY_STORAGE_KEY = 'playtalk-home-last-completed-day-v1';
  const AVATAR_COUNT = 54;
  const AVATAR_PICK_COUNT = 6;
  const USERNAME_MAX_LENGTH = 20;
  const SWIPE_THRESHOLD = 50;
  const TYPE_SOUND_SRC = 'sounds/type.mp3';
  const KEYBOARD_REFRESH_MS = 3000;
  const BASE_KEYBOARD_LETTERS = Array.from({ length: 24 }, (_, index) =>
    String.fromCharCode('A'.charCodeAt(0) + index)
  );
  const AVATAR_FILENAMES = [
    'african-svgrepo-com.svg',
    'afro-avatar-male-2-svgrepo-com.svg',
    'afro-female-person-svgrepo-com.svg',
    'asian-svgrepo-com.svg',
    'avatar-bad-breaking-svgrepo-com.svg',
    'avatar-batman-comics-svgrepo-com.svg',
    'avatar-boy-kid-svgrepo-com.svg',
    'avatar-boy-male-svgrepo-com.svg',
    'avatar-child-girl-svgrepo-com.svg',
    'avatar-einstein-professor-svgrepo-com.svg',
    'avatar-elderly-grandma-svgrepo-com.svg',
    'avatar-female-girl-svgrepo-com.svg',
    'avatar-male-man-svgrepo-com.svg',
    'avatar-man-muslim-svgrepo-com.svg',
    'avatar-man-person-svgrepo-com.svg',
    'avatar-nun-sister-svgrepo-com.svg',
    'avatar-person-pilot-svgrepo-com.svg',
    'avatar-svgrepo-com (1).svg',
    'avatar-svgrepo-com (2).svg',
    'avatar-svgrepo-com (3).svg',
    'chicken-svgrepo-com.svg',
    'child-girl-kid-svgrepo-com.svg',
    'cooker-svgrepo-com.svg',
    'doctor-svgrepo-com.svg',
    'farmer-svgrepo-com.svg',
    'fighter-luchador-man-svgrepo-com.svg',
    'florist-svgrepo-com (1).svg',
    'florist-svgrepo-com.svg',
    'gentleman-svgrepo-com.svg',
    'hindu-svgrepo-com (1).svg',
    'hindu-svgrepo-com (2).svg',
    'hindu-svgrepo-com.svg',
    'jew-svgrepo-com.svg',
    'male-man-old-svgrepo-com.svg',
    'man-svgrepo-com.svg',
    'mechanic-svgrepo-com (1).svg',
    'mechanic-svgrepo-com.svg',
    'monk-svgrepo-com.svg',
    'musician-svgrepo-com.svg',
    'muslim-svgrepo-com (1).svg',
    'muslim-svgrepo-com (2).svg',
    'muslim-svgrepo-com.svg',
    'nerd-svgrepo-com.svg',
    'ninja-svgrepo-com.svg',
    'nurse-svgrepo-com (1).svg',
    'nurse-svgrepo-com.svg',
    'photographer-svgrepo-com.svg',
    'pilot-svgrepo-com.svg',
    'policeman-svgrepo-com.svg',
    'policewoman-svgrepo-com.svg',
    'priest-svgrepo-com.svg',
    'rapper-svgrepo-com.svg',
    'telemarketer-svgrepo-com (1).svg',
    'telemarketer-svgrepo-com.svg'
  ];
  const AVATAR_FILES = AVATAR_FILENAMES.slice(0, AVATAR_COUNT);
  const journeyPanel = document.getElementById('myhome');
  const journeyButton = document.getElementById('journey-start-btn');
  const myhomeStatus = document.getElementById('myhome-status');
  const myhomeProgressFill = document.getElementById('myhome-progress-fill');
  const journeyReset = document.getElementById('journey-reset-btn');
  const journeyPhaseSelect = document.getElementById('journey-phase-select');
  const journeyPhaseButton = document.getElementById('journey-phase-btn');
  const gamePanel = document.getElementById('home-game');
  const onboardingPanel = document.getElementById('journey-onboarding');
  const avatarStep = document.getElementById('journey-avatar-step');
  const avatarGrid = document.getElementById('journey-avatar-grid');
  const avatarError = document.getElementById('journey-avatar-error');
  const avatarContinueButton = document.getElementById('journey-avatar-continue');
  const nameStep = document.getElementById('journey-name-step');
  const nameHint = document.getElementById('journey-name-hint');
  const nameDisplay = document.getElementById('journey-name-display');
  const nameError = document.getElementById('journey-name-error');
  const nameKeyboard = document.getElementById('journey-name-keyboard');
  const nameFinishButton = document.getElementById('journey-name-finish');

  let myhomeStatusCycleTimer = null;
  let myhomeStatusSwapTimer = null;
  let myhomeStatusTextIndex = 0;
  let myhomeCanContinueByTap = false;
  let avatarPages = [];
  let avatarPageIndex = 0;
  let selectedAvatar = '';
  let typedName = '';
  let keyboardSwapTimer = null;
  let keyboardShifted = false;
  let avatarTouchStartX = null;
  let avatarTouchStartY = null;
  let nameHintCycleTimer = null;
  let nameHintSwapTimer = null;
  let nameHintIndex = 0;
  let clearAllPressTimer = null;
  let clearAllTriggered = false;
  let longPressTriggeredAt = 0;
  
  function normalizeNameCasing(value) {
    return value
      .toLowerCase()
      .replace(/\b([A-Za-z\u00C0-\u00FF])/g, (letter) => letter.toUpperCase());
  }

  function formatTypedName(value) {
    return normalizeNameCasing(value);
  }

  const typeAudio = new Audio(TYPE_SOUND_SRC);
  typeAudio.preload = 'auto';

  const launchSource = (() => {
    try {
      return String(new URLSearchParams(window.location.search).get('source') || '').toLowerCase();
    } catch (error) {
      return '';
    }
  })();

  const hasPlayLaunchPayload = (() => {
    if (launchSource !== 'play') return false;
    try {
      const raw = sessionStorage.getItem('playtalk-play-launch');
      if (!raw) return false;
      const payload = JSON.parse(raw);
      const source = String(payload && payload.source ? payload.source : '').toLowerCase();
      return Boolean(source === 'play' && Number.isFinite(Number(payload && payload.phase)));
    } catch (error) {
      return false;
    }
  })();

  const isPlayLaunch = launchSource === 'play' || hasPlayLaunchPayload;

  const revealPlayLaunchGame = () => {
    if (!isPlayLaunch) return;
    if (!window.__playLaunchLoaderDone) {
      window.__playLaunchRevealPending = true;
      return;
    }
    const root = document.documentElement;
    if (root) root.classList.remove('play-launch-pending');
    document.body.classList.add('play-launch-reveal');
    window.setTimeout(() => {
      document.body.classList.remove('play-launch-reveal');
      const cover = document.getElementById('play-launch-cover');
      if (cover && cover.parentNode) {
        cover.parentNode.removeChild(cover);
      }
      try {
        sessionStorage.removeItem('playtalk-play-launch');
      } catch (error) {
        // no-op
      }
    }, 1000);
  };
  window.__playLaunchRevealFn = revealPlayLaunchGame;

  const safeParse = (key) => {
    try {
      const stored = JSON.parse(localStorage.getItem(key) || '{}');
      return stored && typeof stored === 'object' ? stored : {};
    } catch (error) {
      return {};
    }
  };

  const hasStoredProgress = () => {
    const stored = safeParse(PROGRESS_STORAGE_KEY);
    return Boolean(stored && stored.level && stored.phase && Array.isArray(stored.cycle));
  };

  const hasStoredCompletion = () => {
    const stored = safeParse(COMPLETION_STORAGE_KEY);
    return Boolean(stored && stored.completedLevel);
  };

  const hasCompletedIdentity = () => {
    const stateApi = window.playtalkPlayerState;
    if (!stateApi || typeof stateApi.get !== 'function') return false;
    const player = stateApi.get();
    const username = typeof player?.username === 'string' ? player.username.trim() : '';
    const avatar = typeof player?.avatar === 'string' ? player.avatar.trim() : '';
    return Boolean(username && avatar);
  };

  const updateJourneyButtons = () => {
    if (!journeyButton) return;
    const hasProgress = hasStoredProgress() || hasStoredCompletion();
    journeyButton.textContent = hasProgress ? 'Continuar Jornada' : 'Iniciar Jornada';
    if (journeyReset) journeyReset.classList.add('is-hidden');
  };

  const clearMyhomeStatusCycle = () => {
    if (myhomeStatusCycleTimer) {
      clearInterval(myhomeStatusCycleTimer);
      myhomeStatusCycleTimer = null;
    }
    if (myhomeStatusSwapTimer) {
      clearTimeout(myhomeStatusSwapTimer);
      myhomeStatusSwapTimer = null;
    }
  };

  const setMyhomeStatusText = (text) => {
    if (!myhomeStatus) return;
    myhomeStatus.classList.add('is-fading');
    if (myhomeStatusSwapTimer) {
      clearTimeout(myhomeStatusSwapTimer);
    }
    myhomeStatusSwapTimer = setTimeout(() => {
      myhomeStatus.textContent = text;
      myhomeStatus.classList.remove('is-fading');
      myhomeStatusSwapTimer = null;
    }, 500);
  };

  const readNumericStorage = (key) => {
    const value = Number(localStorage.getItem(key));
    return Number.isFinite(value) ? value : null;
  };

  const writeNumericStorage = (key, value) => {
    if (!Number.isFinite(value)) return;
    localStorage.setItem(key, String(Math.max(0, Math.round(value))));
  };

  const getProgressPercent = (progress, completion) => {
    const totalStepsRaw = Number(progress.journeyTotalSteps);
    const completedStepsRaw = Number(progress.journeyCompletedSteps);
    const totalSteps = Number.isFinite(totalStepsRaw) && totalStepsRaw > 0 ? totalStepsRaw : 0;
    const completedSteps = Number.isFinite(completedStepsRaw) && completedStepsRaw > 0 ? completedStepsRaw : 0;
    if (totalSteps > 0) {
      return Math.max(0, Math.min(100, Math.round((completedSteps / totalSteps) * 100)));
    }
    return completion && completion.completedLevel ? 100 : 0;
  };

  const formatNextLessonCountdown = () => {
    const now = Date.now();
    const storedUnlockAt = readNumericStorage(LEVEL_TWO_UNLOCK_STORAGE_KEY);
    let unlockAt = Number.isFinite(storedUnlockAt) && storedUnlockAt > now ? storedUnlockAt : null;
    if (!unlockAt) {
      const target = new Date();
      target.setDate(target.getDate() + 1);
      target.setHours(LEVEL_TWO_UNLOCK_HOUR, 0, 0, 0);
      unlockAt = target.getTime();
    }

    const remainingMs = unlockAt - now;
    if (remainingMs <= 0) {
      return 'Pr\u00F3xima aula liberada';
    }

    const oneHourMs = 60 * 60 * 1000;
    const oneMinuteMs = 60 * 1000;
    if (remainingMs < oneHourMs) {
      const minutes = Math.max(1, Math.ceil(remainingMs / oneMinuteMs));
      return 'Pr\u00F3xima aula em ' + minutes + ' minuto' + (minutes === 1 ? '' : 's');
    }

    const hours = Math.max(1, Math.ceil(remainingMs / oneHourMs));
    return 'Pr\u00F3xima aula em ' + hours + ' hora' + (hours === 1 ? '' : 's');
  };

  const updateMyhomeProgress = () => {
    const progress = safeParse(PROGRESS_STORAGE_KEY);
    const completion = safeParse(COMPLETION_STORAGE_KEY);
    const sequence = Array.isArray(progress.journeyPhaseSequence) ? progress.journeyPhaseSequence : [];
    const totalPhases = Math.max(sequence.length, 0);

    const phaseIndexRaw = Number(progress.journeyPhaseIndex);
    const phaseIndex = Number.isFinite(phaseIndexRaw) && phaseIndexRaw >= 0 ? phaseIndexRaw : 0;
    const phaseNumber = totalPhases > 0 ? Math.min(totalPhases, phaseIndex + 1) : 1;

    const stickyPercentStored = readNumericStorage(STICKY_JOURNEY_PERCENT_KEY);
    const stickyPercent = Number.isFinite(stickyPercentStored) ? Math.max(0, Math.min(100, stickyPercentStored)) : 0;
    const basePercent = getProgressPercent(progress, completion);
    let percent = Math.max(basePercent, stickyPercent);

    const completionDay = Number(completion.completedLevel);
    const progressDay = Number(progress.level);
    let completedDay = readNumericStorage(LAST_COMPLETED_DAY_STORAGE_KEY);

    if (Number.isFinite(completionDay) && completionDay > 0) {
      completedDay = completionDay;
      percent = 100;
      writeNumericStorage(STICKY_JOURNEY_PERCENT_KEY, 100);
      writeNumericStorage(LAST_COMPLETED_DAY_STORAGE_KEY, completionDay);
    } else if (basePercent >= 100) {
      const resolvedDay = Number.isFinite(progressDay) && progressDay > 0 ? progressDay : 1;
      completedDay = resolvedDay;
      percent = 100;
      writeNumericStorage(STICKY_JOURNEY_PERCENT_KEY, 100);
      writeNumericStorage(LAST_COMPLETED_DAY_STORAGE_KEY, resolvedDay);
    }

    const started = localStorage.getItem(JOURNEY_STARTED_KEY) === 'true'
      || Boolean(totalPhases)
      || percent > 0;

    clearMyhomeStatusCycle();
    myhomeCanContinueByTap = false;
    myhomeStatusTextIndex = 0;

    if (myhomeStatus) {
      if (!started) {
        const introMessages = ['Flu\u00EAncia F\u00E1cil', 'Toque para come\u00E7ar'];
        myhomeStatus.textContent = introMessages[0];
        myhomeStatus.classList.remove('is-fading');
        myhomeStatusCycleTimer = setInterval(() => {
          myhomeStatusTextIndex = (myhomeStatusTextIndex + 1) % introMessages.length;
          setMyhomeStatusText(introMessages[myhomeStatusTextIndex]);
        }, 2000);
      } else if (percent >= 100) {
        const dayLabel = Number.isFinite(completedDay) && completedDay > 0 ? completedDay : 1;
        const completionText = 'Voc\u00EA completou o dia ' + dayLabel;
        const completionMessages = [
          completionText,
          formatNextLessonCountdown()
        ];
        myhomeStatus.textContent = completionMessages[0];
        myhomeStatus.classList.remove('is-fading');
        myhomeStatusCycleTimer = setInterval(() => {
          completionMessages[1] = formatNextLessonCountdown();
          myhomeStatusTextIndex = (myhomeStatusTextIndex + 1) % completionMessages.length;
          setMyhomeStatusText(completionMessages[myhomeStatusTextIndex]);
        }, 2200);
      } else {
        const progressMessages = [
          `Fase ${phaseNumber} de ${Math.max(totalPhases, 1)}`,
          `${percent}% Completo`,
          'Toque para continuar'
        ];
        myhomeStatus.textContent = progressMessages[0];
        myhomeStatus.classList.remove('is-fading');
        myhomeStatusCycleTimer = setInterval(() => {
          myhomeStatusTextIndex = (myhomeStatusTextIndex + 1) % progressMessages.length;
          const nextText = progressMessages[myhomeStatusTextIndex];
          myhomeCanContinueByTap = nextText === 'Toque para continuar';
          setMyhomeStatusText(nextText);
        }, 2000);
      }
    }

    if (myhomeProgressFill) {
      myhomeProgressFill.style.width = `${started ? percent : 0}%`;
    }

    updateJourneyButtons();
  };

  function startJourneyFromTap() {
    const hasProgress = hasStoredProgress() || hasStoredCompletion();
    if (hasProgress) {
      startJourneyGame();
      return;
    }
    if (hasCompletedIdentity()) {
      startJourneyGame();
      return;
    }
    openJourneyOnboarding();
  }

  function stopKeyboardTicker() {
    if (keyboardSwapTimer) {
      window.clearInterval(keyboardSwapTimer);
      keyboardSwapTimer = null;
    }
  }

  const showHome = () => {
    if (journeyPanel) journeyPanel.classList.remove('is-hidden');
    if (onboardingPanel) {
      onboardingPanel.classList.add('is-hidden');
      onboardingPanel.setAttribute('aria-hidden', 'true');
    }
    if (gamePanel) {
      gamePanel.classList.add('is-hidden');
      gamePanel.setAttribute('aria-hidden', 'true');
    }
    stopKeyboardTicker();
    stopNameHintCycle();
    if (hasCompletedIdentity()) {
      document.body.classList.remove('journey-intro-active');
    } else {
      document.body.classList.add('journey-intro-active');
    }
    document.body.classList.remove('journey-onboarding-active');
    document.body.classList.remove('game-active');
    document.body.classList.remove('journey-avatar-step-active', 'journey-name-step-active');

    try {
      sessionStorage.removeItem('playtalk-play-launch');
    } catch (error) {
      // no-op
    }

    try {
      const next = new URL(window.location.href);
      let searchChanged = false;
      ['source', 'phase', 'day'].forEach((key) => {
        if (!next.searchParams.has(key)) return;
        next.searchParams.delete(key);
        searchChanged = true;
      });
      next.hash = '#home';
      if (searchChanged || window.location.hash !== '#home') {
        history.replaceState(null, '', next.href);
      }
    } catch (error) {
      if (window.location.hash !== '#home') {
        window.location.hash = '#home';
      }
    }

    updateJourneyButtons();
    updateMyhomeProgress();
  };


  window.goHome = showHome;

  const showGame = () => {
    if (journeyPanel) journeyPanel.classList.add('is-hidden');
    if (onboardingPanel) {
      onboardingPanel.classList.add('is-hidden');
      onboardingPanel.setAttribute('aria-hidden', 'true');
    }
    if (gamePanel) {
      gamePanel.classList.remove('is-hidden');
      gamePanel.setAttribute('aria-hidden', 'false');
    }
    stopKeyboardTicker();
    stopNameHintCycle();
    document.body.classList.remove('journey-intro-active');
    document.body.classList.remove('journey-onboarding-active');
    document.body.classList.remove('journey-avatar-step-active', 'journey-name-step-active');
    document.body.classList.add('game-active');
    if (window.location.hash !== '#home') {
      window.location.hash = '#home';
    }
  };

  const startJourneyGame = () => {
    if (!window.playtalkGame) return;

    const fromPlayQuery = (() => {
      try {
        return new URLSearchParams(window.location.search).get('source') === 'play';
      } catch (error) {
        return false;
      }
    })();

    if (fromPlayQuery) {
      try {
        const next = new URL(window.location.href);
        next.search = '';
        next.hash = '#home';
        history.replaceState(null, '', next.href);
      } catch (error) {
        // no-op
      }
      showHome();
      return;
    }

    showGame();
    const hasProgress = hasStoredProgress() || hasStoredCompletion();
    if (hasProgress && typeof window.playtalkGame.resumeJourneyToPause === 'function') {
      window.playtalkGame.resumeJourneyToPause();
      return;
    }
    window.playtalkGame.startNewJourney();
  }; 

  function shuffleInPlace(list) {
    for (let i = list.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }

  function createRandomAvatarPage(blocked = []) {
    const blockedSet = new Set(blocked);
    let pool = AVATAR_FILES.filter(src => !blockedSet.has(src));
    if (pool.length < AVATAR_PICK_COUNT) {
      pool = AVATAR_FILES.slice();
    }
    return shuffleInPlace(pool).slice(0, AVATAR_PICK_COUNT);
  }

  function resolveAvatarUrl(filename, variant = 0) {
    const encoded = encodeURIComponent(filename);
    const candidates = [
      `Avatar/${encoded}`,
      `/Avatar/${encoded}`,
      `../Avatar/${encoded}`,
      `../arquivos-codex/novos avatares/${filename}`,
      `../arquivos-codex/novos%20avatares/${encoded}`,
      `arquivos-codex/novos avatares/${filename}`,
      `arquivos-codex/novos%20avatares/${encoded}`,
      `/arquivos-codex/novos avatares/${filename}`,
      `/arquivos-codex/novos%20avatares/${encoded}`
    ];
    const index = Math.max(0, Math.min(candidates.length - 1, variant));
    return candidates[index];
  }

  function getAvatarFilename(avatarValue) {
    if (typeof avatarValue !== 'string' || !avatarValue) return '';
    const raw = avatarValue.split('/').pop();
    return raw ? decodeURIComponent(raw) : '';
  }

  function normalizeAvatarPath(path) {
    const filename = getAvatarFilename(path);
    if (!filename) return '';
    if (AVATAR_FILES.includes(filename)) return filename;
    return path;
  }

  function startNameHintCycle() {
    if (!nameHint) return;
    stopNameHintCycle();
    const messages = ['Toque em qualquer lugar para apagar', 'Toque por 1 segundo para apagar tudo'];
    nameHint.textContent = messages[0];
    nameHint.classList.remove('is-fading');
    nameHintIndex = 0;
    nameHintCycleTimer = window.setInterval(() => {
      nameHintIndex = (nameHintIndex + 1) % messages.length;
      nameHint.classList.add('is-fading');
      if (nameHintSwapTimer) window.clearTimeout(nameHintSwapTimer);
      nameHintSwapTimer = window.setTimeout(() => {
        nameHint.textContent = messages[nameHintIndex];
        nameHint.classList.remove('is-fading');
        nameHintSwapTimer = null;
      }, 500);
    }, 2600);
  }

  function stopNameHintCycle() {
    if (nameHintCycleTimer) {
      window.clearInterval(nameHintCycleTimer);
      nameHintCycleTimer = null;
    }
    if (nameHintSwapTimer) {
      window.clearTimeout(nameHintSwapTimer);
      nameHintSwapTimer = null;
    }
  }

  function setAvatarError(message) {
    if (avatarError) avatarError.textContent = message || '';
  }

  function setNameError(message) {
    if (nameError) nameError.textContent = message || '';
  }

  function renderAvatarGrid() {
    if (!avatarGrid) return;
    const currentPage = avatarPages[avatarPageIndex] || [];
    avatarGrid.innerHTML = '';
    currentPage.forEach((avatarSrc) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'journey-avatar-card grid-card';
      card.setAttribute('aria-label', 'Selecionar avatar');
      card.dataset.avatar = avatarSrc;

      const image = document.createElement('img');
      const avatarFilename = getAvatarFilename(avatarSrc);
      let avatarVariant = 0;
      image.src = resolveAvatarUrl(avatarFilename, avatarVariant);
      image.alt = 'Avatar';
      image.addEventListener('error', () => {
        avatarVariant += 1;
        if (avatarVariant > 5) return;
        image.src = resolveAvatarUrl(avatarFilename, avatarVariant);
      });
      card.appendChild(image);

      if (selectedAvatar === avatarSrc) {
        card.classList.add('is-selected');
      }

      card.addEventListener('click', () => {
        selectedAvatar = avatarSrc;
        setAvatarError('');
        renderAvatarGrid();
        syncHeaderPreview();
      });
      avatarGrid.appendChild(card);
    });
  }

  function showAvatarPageByOffset(offset) {
    if (!avatarPages.length) return;
    if (offset < 0) {
      const nextIndex = avatarPageIndex - 1;
      if (nextIndex >= 0) {
        avatarPageIndex = nextIndex;
        renderAvatarGrid();
      }
      return;
    }

    const nextIndex = avatarPageIndex + 1;
    if (nextIndex < avatarPages.length) {
      avatarPageIndex = nextIndex;
    } else {
      const currentPage = avatarPages[avatarPageIndex] || [];
      avatarPages.push(createRandomAvatarPage(currentPage));
      avatarPageIndex = avatarPages.length - 1;
    }
    renderAvatarGrid();
  }

  function renderNameDisplay() {
    if (!nameDisplay) return;
    nameDisplay.classList.remove('is-updating');
    void nameDisplay.offsetWidth;
    nameDisplay.classList.add('is-updating');
    nameDisplay.textContent = formatTypedName(typedName) || '\u00A0';
  }

  function syncHeaderPreview() {
    const stateApi = window.playtalkPlayerState;
    if (!stateApi || typeof stateApi.patch !== 'function') return;
    stateApi.patch({
      avatar: selectedAvatar ? resolveAvatarUrl(selectedAvatar, 0) : '',
      username: formatTypedName(typedName.trim())
    });
  }

  function playTypeFeedback() {
    try {
      typeAudio.currentTime = 0;
      typeAudio.play().catch(() => {});
    } catch (error) {
      // no-op
    }
  }

  function getKeyboardLetters() {
    const letters = BASE_KEYBOARD_LETTERS.slice();
    if (keyboardShifted) {
      letters[22] = 'Y';
      letters[23] = 'Z';
    }
    return letters;
  }

  function addTypedCharacter(character) {
    if (Date.now() - longPressTriggeredAt < 450) return;
    if (typedName.length >= USERNAME_MAX_LENGTH) return;
    typedName += character.toLowerCase();
    renderNameDisplay();
    setNameError('');
    playTypeFeedback();
    syncHeaderPreview();
  }

  function addTypedSpace() {
    if (Date.now() - longPressTriggeredAt < 450) return;
    if (!typedName || typedName.length >= USERNAME_MAX_LENGTH || typedName.endsWith(' ')) return;
    typedName += ' ';
    renderNameDisplay();
    setNameError('');
    playTypeFeedback();
    syncHeaderPreview();
  }

  function removeLastTypedCharacter() {
    if (!typedName) return;
    typedName = typedName.slice(0, -1);
    renderNameDisplay();
    setNameError('');
    playTypeFeedback();
    syncHeaderPreview();
  }

  function clearTypedName() {
    if (!typedName) return;
    typedName = '';
    renderNameDisplay();
    setNameError('');
    playTypeFeedback();
    syncHeaderPreview();
  }

  function renderNameKeyboard() {
    if (!nameKeyboard) return;
    const letters = getKeyboardLetters();
    nameKeyboard.innerHTML = '';

    for (let rowIndex = 0; rowIndex < 4; rowIndex += 1) {
      const row = document.createElement('div');
      row.className = 'journey-name-keyboard__row';
      const rowLetters = letters.slice(rowIndex * 6, rowIndex * 6 + 6);
      rowLetters.forEach((letter) => {
        const key = document.createElement('button');
        key.type = 'button';
        key.className = 'journey-name-key phase-nine-key';
        key.textContent = letter;
        key.setAttribute('aria-label', `Letra ${letter}`);
        key.addEventListener('click', () => addTypedCharacter(letter));
        row.appendChild(key);
      });
      nameKeyboard.appendChild(row);
    }

    const spacebar = document.createElement('button');
    spacebar.type = 'button';
    spacebar.className = 'journey-name-spacebar phase-nine-spacebar';
    spacebar.textContent = 'Espaco';
    spacebar.setAttribute('aria-label', 'Espaco');
    spacebar.addEventListener('click', addTypedSpace);
    nameKeyboard.appendChild(spacebar);
  }

  function startKeyboardTicker() {
    stopKeyboardTicker();
    keyboardSwapTimer = window.setInterval(() => {
      keyboardShifted = !keyboardShifted;
      renderNameKeyboard();
    }, KEYBOARD_REFRESH_MS);
  }

  function showAvatarStep() {
    if (avatarStep) avatarStep.classList.remove('is-hidden');
    if (nameStep) nameStep.classList.add('is-hidden');
    stopNameHintCycle();
    setAvatarError('');
    if (document.body) {
      document.body.classList.add('journey-avatar-step-active');
      document.body.classList.remove('journey-name-step-active');
    }
  }

  function showNameStep() {
    if (avatarStep) avatarStep.classList.add('is-hidden');
    if (nameStep) nameStep.classList.remove('is-hidden');
    keyboardShifted = false;
    setNameError('');
    renderNameDisplay();
    renderNameKeyboard();
    startKeyboardTicker();
    startNameHintCycle();
    if (document.body) {
      document.body.classList.remove('journey-avatar-step-active');
      document.body.classList.add('journey-name-step-active');
    }
  }

  function saveIdentityAndStartJourney() {
    const username = formatTypedName(typedName.trim());
    if (!username) {
      setNameError('Digite seu nome para continuar.');
      return;
    }

    const stateApi = window.playtalkPlayerState;
    if (stateApi && typeof stateApi.completeOnboarding === 'function') {
      stateApi.completeOnboarding({
        avatar: resolveAvatarUrl(selectedAvatar || AVATAR_FILES[0], 0),
        username,
        password: ''
      });
    }

    startJourneyGame();
  }

  function openJourneyOnboarding() {
    const stateApi = window.playtalkPlayerState;
    const player = stateApi && typeof stateApi.get === 'function' ? stateApi.get() : null;
    selectedAvatar = normalizeAvatarPath(player && typeof player.avatar === 'string' ? player.avatar : '');
    typedName = player && typeof player.username === 'string' ? player.username.slice(0, USERNAME_MAX_LENGTH) : '';

    if (journeyPanel) journeyPanel.classList.add('is-hidden');
    if (gamePanel) {
      gamePanel.classList.add('is-hidden');
      gamePanel.setAttribute('aria-hidden', 'true');
    }
    if (onboardingPanel) {
      onboardingPanel.classList.remove('is-hidden');
      onboardingPanel.setAttribute('aria-hidden', 'false');
    }

    let firstPage = createRandomAvatarPage();
    if (selectedAvatar && AVATAR_FILES.includes(selectedAvatar) && !firstPage.includes(selectedAvatar)) {
      firstPage = [selectedAvatar, ...firstPage.slice(0, AVATAR_PICK_COUNT - 1)];
    }

    avatarPages = [firstPage];
    avatarPageIndex = 0;
    renderAvatarGrid();
    renderNameDisplay();
    syncHeaderPreview();
    showAvatarStep();

    document.body.classList.remove('journey-intro-active', 'game-active');
    document.body.classList.add('journey-onboarding-active');
  }

  const startSinglePhase = () => {
    showGame();
    if (!window.playtalkGame || typeof window.playtalkGame.startSinglePhase !== 'function') return;
    const phase = Number.parseInt((journeyPhaseSelect && journeyPhaseSelect.value) || '1', 10);
    window.playtalkGame.startSinglePhase(phase);
  };

  const resetJourney = () => {
    if (window.playtalkGame) {
      window.playtalkGame.resetJourney();
    }
    updateJourneyButtons();
  };

  if (journeyButton) {
    journeyButton.remove();
  }

  document.addEventListener('pointerdown', (event) => {
    const body = document.body;
    if (!body) return;
    if (!body.classList.contains('page-home')) return;
    if (body.classList.contains('game-active') || body.classList.contains('journey-onboarding-active')) return;
    const target = event.target;
    if (target && target.closest('#main-nav')) return;
    startJourneyFromTap();
  });
  document.addEventListener('pointerdown', (event) => {
    const body = document.body;
    if (!body || !body.classList.contains('journey-onboarding-active')) return;
    if (!nameStep || nameStep.classList.contains('is-hidden')) return;
    const target = event.target;
    if (target && target.closest('#journey-name-finish')) return;

    clearAllTriggered = false;
    if (clearAllPressTimer) {
      window.clearTimeout(clearAllPressTimer);
      clearAllPressTimer = null;
    }

    clearAllPressTimer = window.setTimeout(() => {
      clearAllTriggered = true;
      longPressTriggeredAt = Date.now();
      clearTypedName();
      clearAllPressTimer = null;
    }, 1000);
  });

  document.addEventListener('pointerup', (event) => {
    const body = document.body;
    if (!body || !body.classList.contains('journey-onboarding-active')) return;
    if (!nameStep || nameStep.classList.contains('is-hidden')) return;

    if (clearAllPressTimer) {
      window.clearTimeout(clearAllPressTimer);
      clearAllPressTimer = null;
    }

    if (clearAllTriggered) {
      clearAllTriggered = false;
      return;
    }

    const target = event.target;
    if (target && target.closest('button')) return;
    removeLastTypedCharacter();
  });

  document.addEventListener('pointercancel', () => {
    if (clearAllPressTimer) {
      window.clearTimeout(clearAllPressTimer);
      clearAllPressTimer = null;
    }
  });

  if (journeyPhaseButton) {
    journeyPhaseButton.addEventListener('click', startSinglePhase);
  }

  if (journeyReset) {
    journeyReset.addEventListener('click', resetJourney);
  }

  if (avatarContinueButton) {
    avatarContinueButton.addEventListener('click', () => {
      if (!selectedAvatar) {
        setAvatarError('Escolha um avatar para continuar.');
        return;
      }
      showNameStep();
    });
  }

  if (nameFinishButton) {
    nameFinishButton.addEventListener('click', saveIdentityAndStartJourney);
  }

  if (avatarGrid) {
    avatarGrid.addEventListener('touchstart', (event) => {
      const touch = event.changedTouches && event.changedTouches[0];
      if (!touch) return;
      avatarTouchStartX = touch.clientX;
      avatarTouchStartY = touch.clientY;
    }, { passive: true });

    avatarGrid.addEventListener('touchend', (event) => {
      const touch = event.changedTouches && event.changedTouches[0];
      if (!touch || avatarTouchStartX == null || avatarTouchStartY == null) return;
      const deltaX = touch.clientX - avatarTouchStartX;
      const deltaY = touch.clientY - avatarTouchStartY;
      avatarTouchStartX = null;
      avatarTouchStartY = null;
      if (Math.abs(deltaX) < SWIPE_THRESHOLD || Math.abs(deltaX) <= Math.abs(deltaY)) return;
      if (deltaX < 0) {
        showAvatarPageByOffset(1);
      } else {
        showAvatarPageByOffset(-1);
      }
    }, { passive: true });
  }

  document.addEventListener('playtalk:journey-progress', updateMyhomeProgress);

  window.addEventListener('playtalk:return-home', () => {
    if (document.body && document.body.classList.contains('page-play')) return;
    showHome();
  });
  window.addEventListener('playtalk:play-launch-ready', revealPlayLaunchGame);

  window.addEventListener('DOMContentLoaded', () => {
    if (isPlayLaunch) {
      showGame();
      return;
    }
    updateMyhomeProgress();
    showHome();
  });
})();



























