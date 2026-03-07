(() => {
  let initialized = false;
  let leaving = false;
  const AUDIO_RESOLVE_ENDPOINT = '/api/media/resolve';
  const R2_VOICES_BASE_URL = 'https://pub-1208463a3c774431bf7e0ddcbd3cf670.r2.dev/voices';
  const SUPPORTED_ENTRY_AUDIO_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.m4a'];
  const SINGLE_PROGRESS_STORAGE_KEY = 'playtalk-single-progress-v1';
  const MODE_ENTRANCE_STAGGER_MS = 200;
  const MODE_ENTRANCE_DURATION_MS = 500;
  const MODE_PICK_HIDE_MS = 500;
  const MODE_PICK_FLASH_MS = 120;
  const NAV_EXIT_MS = 500;

  function initPlayModesPage() {
    if (initialized) return;
    initialized = true;

    const items = Array.from(document.querySelectorAll('.play-mode-item[data-phase]'));
    const skyClock = document.getElementById('playSkyClock');
    const playContainer = document.getElementById('play-container');
    const modesHub = playContainer ? playContainer.querySelector('.play-modes-hub') : null;
    const ensurePlayHeaderPinned = () => {
      if (!document.body || !document.body.classList.contains('page-play')) return;
      const header = document.getElementById('global-header');
      if (!header) return;

      let headerContainer = document.getElementById('game-header');
      if (headerContainer && header.parentNode === headerContainer) {
        headerContainer.parentNode.insertBefore(header, headerContainer);
      }
      if (headerContainer && !headerContainer.childNodes.length) {
        headerContainer.remove();
      }

      const firstContentNode = Array.from(document.body.children).find((node) => (
        node !== header
        && node !== headerContainer
        && node.id !== 'play-launch-cover'
        && !node.classList.contains('lens-overlay')
      ));
      if (firstContentNode) {
        document.body.insertBefore(header, firstContentNode);
      } else if (header.parentNode !== document.body) {
        document.body.prepend(header);
      }

      header.classList.remove('is-hidden');
      header.style.removeProperty('opacity');
      header.style.removeProperty('visibility');
      header.style.removeProperty('pointer-events');
      header.style.removeProperty('transform');
    };
    const refreshPlayHeader = () => {
      ensurePlayHeaderPinned();
      if (window.playtalkPlayerState && typeof window.playtalkPlayerState.renderHeader === 'function') {
        window.playtalkPlayerState.renderHeader();
      }
    };
    let gameNodeHomeParent = null;
    let gameNodeHomeNextSibling = null;
    let modeIntroTimers = [];

    if (!items.length) return;

    const clearModeIntroTimers = () => {
      modeIntroTimers.forEach((timer) => {
        window.clearTimeout(timer);
      });
      modeIntroTimers = [];
    };

    const resetModeSelectionAnimation = () => {
      const launchFocusNode = document.querySelector('.play-mode-item--launch-focus');
      if (launchFocusNode && launchFocusNode.parentNode) {
        launchFocusNode.parentNode.removeChild(launchFocusNode);
      }
      items.forEach((item) => {
        item.classList.remove('play-mode-item--exit');
        item.classList.remove('play-mode-item--selected-hidden');
      });
    };

    const runModesEntranceAnimation = () => {
      resetModeSelectionAnimation();
      clearModeIntroTimers();
      items.forEach((item) => {
        item.classList.remove('play-mode-item--intro-visible');
        item.classList.add('play-mode-item--intro');
      });

      const kickoffTimer = window.setTimeout(() => {
        items.forEach((item, index) => {
          const showTimer = window.setTimeout(() => {
            item.classList.add('play-mode-item--intro-visible');
          }, index * MODE_ENTRANCE_STAGGER_MS);
          modeIntroTimers.push(showTimer);
        });
      }, 10);
      modeIntroTimers.push(kickoffTimer);

      const totalMs = ((items.length - 1) * MODE_ENTRANCE_STAGGER_MS) + MODE_ENTRANCE_DURATION_MS + 120;
      const cleanupTimer = window.setTimeout(() => {
        items.forEach((item) => {
          item.classList.remove('play-mode-item--intro');
          item.classList.remove('play-mode-item--intro-visible');
        });
      }, totalMs);
      modeIntroTimers.push(cleanupTimer);
    };

    const visualClock = (() => {
      const now = new Date();
      return {
        hour: now.getHours(),
        minute: now.getMinutes()
      };
    })();

    const renderSkyClock = () => {
      if (!skyClock) return;
      skyClock.innerHTML = [
        `<span class="play-sky-clock__hour">${visualClock.hour}</span>`,
        '<span class="play-sky-clock__sep">h</span>',
        `<span class="play-sky-clock__minute">${visualClock.minute}</span>`
      ].join('');
    };

    const syncSkyClock = () => {
      const now = new Date();
      visualClock.hour = now.getHours();
      visualClock.minute = now.getMinutes();
      renderSkyClock();
    };

    const runModePickAnimation = (clickedItem) => new Promise((resolve) => {
      if (!clickedItem) {
        window.setTimeout(resolve, MODE_PICK_HIDE_MS + MODE_PICK_FLASH_MS);
        return;
      }

      const itemRect = clickedItem.getBoundingClientRect();
      const clone = clickedItem.cloneNode(true);
      clone.classList.remove('play-mode-item--intro');
      clone.classList.remove('play-mode-item--intro-visible');
      clone.classList.add('play-mode-item--launch-focus');
      clone.setAttribute('aria-hidden', 'true');
      clone.style.setProperty('--start-left', `${itemRect.left}px`);
      clone.style.setProperty('--start-top', `${itemRect.top}px`);
      clone.style.setProperty('--start-width', `${itemRect.width}px`);
      clone.style.setProperty('--start-height', `${itemRect.height}px`);
      const shiftX = (window.innerWidth / 2) - (itemRect.left + (itemRect.width / 2));
      const shiftY = (window.innerHeight / 2) - (itemRect.top + (itemRect.height / 2));
      clone.style.setProperty('--shift-x', `${shiftX}px`);
      clone.style.setProperty('--shift-y', `${shiftY}px`);

      items.forEach((item) => {
        if (item === clickedItem) {
          item.classList.add('play-mode-item--selected-hidden');
        } else {
          item.classList.add('play-mode-item--exit');
        }
      });

      document.body.appendChild(clone);

      window.requestAnimationFrame(() => {
        clone.classList.add('is-visible');
      });

      window.setTimeout(() => {
        clone.classList.add('is-flash');
      }, MODE_PICK_HIDE_MS);

      window.setTimeout(() => {
        if (clone.parentNode) {
          clone.parentNode.removeChild(clone);
        }
        resolve();
      }, MODE_PICK_HIDE_MS + MODE_PICK_FLASH_MS);
    });

    const runNavExitAnimation = () => new Promise((resolve) => {
      if (!document.body || !document.body.classList.contains('page-play')) {
        resolve();
        return;
      }
      document.body.classList.add('play-nav-hiding');
      window.setTimeout(resolve, NAV_EXIT_MS);
    });

    syncSkyClock();
    window.setInterval(syncSkyClock, 30000);
    ensurePlayHeaderPinned();
    if (window.MutationObserver && document.body) {
      const headerVisibilityObserver = new MutationObserver(() => ensurePlayHeaderPinned());
      headerVisibilityObserver.observe(document.body, {
        attributes: true,
        attributeFilter: ['class']
      });
    }

    const readSingleProgressStorage = () => {
      try {
        const stored = JSON.parse(localStorage.getItem(SINGLE_PROGRESS_STORAGE_KEY) || '{}');
        return stored && typeof stored === 'object' ? stored : {};
      } catch (error) {
        return {};
      }
    };

    const buildSingleProgressKey = (dayNumber, phaseNumber) => {
      const safeDay = Math.max(1, Number.parseInt(dayNumber, 10) || 1);
      const safePhase = Math.max(1, Math.min(12, Number.parseInt(phaseNumber, 10) || 1));
      return `day-${safeDay}-phase-${safePhase}`;
    };

    const getSingleProgressPercent = (snapshot) => {
      if (!snapshot || typeof snapshot !== 'object') return 0;
      const totalSteps = Array.isArray(snapshot.cycle) ? snapshot.cycle.length : 0;
      if (!Number.isFinite(totalSteps) || totalSteps <= 0) return 0;
      const parsedIndex = Number.parseInt(snapshot.index, 10);
      const parsedScore = Number.parseInt(snapshot.score, 10);
      const completedSteps = Math.max(
        0,
        Number.isFinite(parsedIndex) ? parsedIndex : 0,
        Number.isFinite(parsedScore) ? parsedScore : 0
      );
      const percent = (completedSteps / totalSteps) * 100;
      if (!Number.isFinite(percent)) return 0;
      return Math.max(0, Math.min(100, percent));
    };

    const hasSingleProgress = (dayNumber, phaseNumber) => {
      const storage = readSingleProgressStorage();
      const snapshot = storage[buildSingleProgressKey(dayNumber, phaseNumber)];
      const percent = getSingleProgressPercent(snapshot);
      return percent >= 1 && percent < 100;
    };

    const renderModeProgressBadges = () => {
      const storedLevelRaw = Number.parseInt(localStorage.getItem('vocabulary-level') || '', 10);
      const currentDay = Number.isFinite(storedLevelRaw) && storedLevelRaw > 0 ? storedLevelRaw : 1;
      items.forEach((item) => {
        const phase = Number.parseInt(item.dataset.phase || '', 10);
        const shouldShow = Number.isFinite(phase) && hasSingleProgress(currentDay, phase);
        item.classList.toggle('has-single-progress', shouldShow);
      });
    };

    const buildLevelPhasePath = (dayNumber, phaseNumber) => {
      const block = Math.max(1, Math.ceil(dayNumber / 10));
      return `Levels/Bloco ${block}/Dia ${dayNumber}/fase${phaseNumber}.json`;
    };

    const getEntriesFromPhaseData = (data) => {
      if (Array.isArray(data)) return data;
      if (!data || typeof data !== 'object') return [];
      if (Array.isArray(data.items)) return data.items;
      if (Array.isArray(data.entries)) return data.entries;
      if (Array.isArray(data.phrases)) return data.phrases;
      return [];
    };

    const getEntryImageName = (entry) => String(
      entry?.targetImage || entry?.image || entry?.imagem || entry?.file || ''
    ).trim();

    const getEntryAudioName = (entry) => String(
      entry?.audio_english || entry?.targetAudioMp3 || entry?.audioMp3 || entry?.audio || ''
    ).trim();

    const buildImageSrcFromName = (fileName = '') => {
      const trimmed = typeof fileName === 'string' ? fileName.trim() : '';
      if (!trimmed) return '';
      if (/^https?:\/\//i.test(trimmed)) return trimmed;
      const sanitized = trimmed.replace(/^[/\\]+/, '');
      const lower = sanitized.toLowerCase();
      const encodedPath = sanitized
        .split('/')
        .map(segment => encodeURIComponent(segment))
        .join('/');
      if (lower.startsWith('images/') || lower.startsWith('imagens/')) {
        return encodedPath;
      }
      return `images/${encodedPath}`;
    };

    const hasSupportedAudioExtension = (fileName = '') => {
      const lower = String(fileName || '').toLowerCase();
      return SUPPORTED_ENTRY_AUDIO_EXTENSIONS.some(ext => lower.endsWith(ext));
    };

    const buildAudioSrcFromName = (audioName = '', dayNumber = 1) => {
      const trimmed = typeof audioName === 'string' ? audioName.trim() : '';
      if (!trimmed || !hasSupportedAudioExtension(trimmed)) return '';
      if (/^https?:\/\//i.test(trimmed)) return trimmed;

      const sanitized = trimmed.replace(/^[/\\]+/, '');
      const normalized = sanitized.replace(/\\/g, '/');
      let relativePath = '';
      if (normalized.toLowerCase().startsWith('voices/')) {
        relativePath = normalized.slice('voices/'.length);
      } else if (/^\d+\//.test(normalized)) {
        relativePath = normalized;
      } else {
        relativePath = `${Math.max(1, Number(dayNumber) || 1)}/${normalized}`;
      }

      const encodedPath = relativePath
        .split('/')
        .map(segment => encodeURIComponent(segment))
        .join('/');
      return `${R2_VOICES_BASE_URL}/${encodedPath}`;
    };

    const resolveAudioSrc = async (audioName, dayNumber) => {
      const trimmed = String(audioName || '').trim();
      if (!trimmed) return '';
      try {
        const response = await fetch(`${AUDIO_RESOLVE_ENDPOINT}?name=${encodeURIComponent(trimmed)}`);
        if (response.ok) {
          const data = await response.json();
          if (data && data.success && typeof data.url === 'string') {
            return data.url;
          }
        }
      } catch (error) {
        // fallback below
      }
      return buildAudioSrcFromName(trimmed, dayNumber);
    };

    const preloadImage = (src) => new Promise((resolve) => {
      if (!src) {
        resolve(false);
        return;
      }
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = src;
    });

    const preloadAudio = (src) => new Promise((resolve) => {
      if (!src) {
        resolve(false);
        return;
      }
      const audio = new Audio();
      audio.preload = 'auto';
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        audio.removeEventListener('canplaythrough', onReady);
        audio.removeEventListener('loadeddata', onReady);
        audio.removeEventListener('error', onError);
        resolve(true);
      };
      const onReady = () => done();
      const onError = () => done();
      audio.addEventListener('canplaythrough', onReady, { once: true });
      audio.addEventListener('loadeddata', onReady, { once: true });
      audio.addEventListener('error', onError, { once: true });
      audio.src = src;
      audio.load();
      window.setTimeout(done, 2500);
    });

    const preloadPhaseMedia = async ({ phase, day }) => {
      const levelPath = buildLevelPhasePath(day, phase);
      try {
        const response = await fetch(encodeURI(levelPath), { cache: 'force-cache' });
        if (!response.ok) return;
        const data = await response.json();
        const entries = getEntriesFromPhaseData(data);
        if (!entries.length) return;
        const firstEntry = entries.find(Boolean) || entries[0];
        const imageName = getEntryImageName(firstEntry);
        const audioName = getEntryAudioName(firstEntry);
        const imageSrc = buildImageSrcFromName(imageName);
        const audioSrc = await resolveAudioSrc(audioName, day);
        await Promise.all([
          preloadImage(imageSrc),
          preloadAudio(audioSrc)
        ]);
      } catch (error) {
        // keep launch flow smooth even when preload fails
      }
    };

    const getSharedGameNode = () => document.getElementById('home-game');

    const ensureGameHomeAnchor = () => {
      const gameNode = getSharedGameNode();
      if (!gameNode || gameNodeHomeParent) return;
      gameNodeHomeParent = gameNode.parentNode || null;
      gameNodeHomeNextSibling = gameNode.nextSibling || null;
    };

    const restoreGameNodeToHome = () => {
      const gameNode = getSharedGameNode();
      if (!gameNode) return;
      gameNode.removeAttribute('data-play-inline');
      gameNode.classList.add('is-hidden');
      gameNode.setAttribute('aria-hidden', 'true');
      if (!gameNodeHomeParent || gameNode.parentNode === gameNodeHomeParent) return;
      if (gameNodeHomeNextSibling && gameNodeHomeNextSibling.parentNode === gameNodeHomeParent) {
        gameNodeHomeParent.insertBefore(gameNode, gameNodeHomeNextSibling);
      } else {
        gameNodeHomeParent.appendChild(gameNode);
      }
    };

    const showPlayModesHub = () => {
      refreshPlayHeader();
      if (modesHub) modesHub.classList.remove('is-hidden');
      if (playContainer) playContainer.classList.remove('play-inline-active');
      document.body.classList.remove('game-active');
      document.body.classList.remove('play-inline-active');
      document.body.classList.remove('play-nav-hiding');
      resetModeSelectionAnimation();
      restoreGameNodeToHome();
      leaving = false;
      renderModeProgressBadges();
      runModesEntranceAnimation();
    };

    const mountSharedGameIntoPlay = () => {
      refreshPlayHeader();
      if (!playContainer || !modesHub) return false;
      const gameNode = getSharedGameNode();
      if (!gameNode) return false;
      ensureGameHomeAnchor();
      if (gameNode.parentNode !== playContainer) {
        playContainer.appendChild(gameNode);
      }
      gameNode.dataset.playInline = 'true';
      gameNode.classList.remove('is-hidden');
      gameNode.setAttribute('aria-hidden', 'false');
      modesHub.classList.add('is-hidden');
      document.body.classList.add('game-active');
      playContainer.classList.add('play-inline-active');
      document.body.classList.add('play-inline-active');
      return true;
    };

    const stopInlineSingleMode = () => {
      if (!document.body.classList.contains('play-inline-active')) return;
      if (window.playtalkGame && typeof window.playtalkGame.resetJourney === 'function') {
        window.playtalkGame.resetJourney({ resetLevel: false, clearJourneyProgress: false });
      }
      showPlayModesHub();
    };

    const animateAndOpenPhase = async (phaseValue, sourceItem) => {
      if (leaving) return;
      const phase = Number.parseInt(phaseValue || '', 10);
      if (!Number.isFinite(phase) || phase < 1 || phase > 12) return;
      const clickedItem = sourceItem || items.find((item) => item.dataset.phase === String(phase)) || null;
      const clickedImage = clickedItem ? clickedItem.querySelector('img') : null;
      const storedLevelRaw = Number.parseInt(localStorage.getItem('vocabulary-level') || '', 10);
      const currentDay = Number.isFinite(storedLevelRaw) && storedLevelRaw > 0 ? storedLevelRaw : 1;
      const destination = `index.html?phase=${encodeURIComponent(String(phase))}&day=${encodeURIComponent(String(currentDay))}&source=play#home`;
      const gameApi = window.playtalkGame;
      const canRunInline = gameApi && typeof gameApi.startSinglePhase === 'function';
      leaving = true;
      clearModeIntroTimers();

      await Promise.all([
        runModePickAnimation(clickedItem),
        runNavExitAnimation()
      ]);

      if (canRunInline && mountSharedGameIntoPlay()) {
        try {
          localStorage.setItem('vocabulary-level', String(currentDay));
        } catch (error) {
          // ignore persistence issues
        }
        preloadPhaseMedia({ phase, day: currentDay }).catch(() => {});
        window.setTimeout(() => {
          try {
            gameApi.startSinglePhase(phase, { day: currentDay, returnToPlay: true });
          } finally {
            leaving = false;
          }
        }, 40);
        return;
      }

      try {
        sessionStorage.setItem('playtalk-play-launch', JSON.stringify({
          iconSrc: clickedImage && clickedImage.src ? clickedImage.src : '',
          phase,
          day: currentDay,
          source: 'play',
          createdAt: Date.now()
        }));
      } catch (error) {
        // ignore storage issues
      }
      window.location.href = destination;
    };

    renderModeProgressBadges();
    runModesEntranceAnimation();

    window.addEventListener('playtalk:return-play', showPlayModesHub);
    window.addEventListener('playtalk:return-home', () => {
      if (!document.body.classList.contains('page-play')) return;
      showPlayModesHub();
    });
    document.addEventListener('playtalk:before-page-change', (event) => {
      const from = String(event?.detail?.from || '');
      const to = String(event?.detail?.to || '');
      if (from !== 'play.html' || to === 'play.html') return;
      stopInlineSingleMode();
    });

    items.forEach((item) => {
      item.addEventListener('click', () => {
        animateAndOpenPhase(item.dataset.phase, item);
      });
      item.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        animateAndOpenPhase(item.dataset.phase, item);
      });
    });
  }

  if (typeof window.registerPlaytalkPage === 'function') {
    window.registerPlaytalkPage('page-play', initPlayModesPage);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPlayModesPage, { once: true });
  } else {
    initPlayModesPage();
  }
})();





