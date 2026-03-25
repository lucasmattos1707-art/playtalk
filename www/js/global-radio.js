(() => {
  const STORAGE_KEY = 'playtalk-global-radio-station';
  const MUTE_STORAGE_KEY = 'playtalk-global-radio-muted';
  const PLAYBACK_STORAGE_KEY = 'playtalk-global-radio-playback';
  const DEFAULT_STATION = 'off';
  const MUSIC_BASE_URL = 'https://pub-1208463a3c774431bf7e0ddcbd3cf670.r2.dev/musicas';
  const PLAYBACK_SAVE_INTERVAL_MS = 2000;
  const PLAYBACK_STATE_MAX_AGE_MS = 2 * 60 * 60 * 1000;
  const STATIONS = {
    off: {
      id: 'off',
      name: 'Sem Fundo Musical',
      image: 'images/sound.png',
      tracks: []
    },
    happy: {
      id: 'happy',
      name: 'Happy',
      image: 'images/happy.png',
      tracks: ['kids1.mp3', 'kids2.mp3', 'kids3.mp3', 'kids4.mp3']
    },
    balance: {
      id: 'balance',
      name: 'Balance',
      image: 'images/balance.png',
      tracks: ['zen1.mp3', 'zen2.mp3', 'zen3.mp3', 'zen4.mp3']
    },
    modern: {
      id: 'modern',
      name: 'Modern',
      image: 'images/modern.png',
      tracks: ['trap1.mp3', 'trap2.mp3', 'trap3.mp3', 'trap4.mp3']
    },
    soft: {
      id: 'soft',
      name: 'Soft',
      image: 'images/soft.png',
      tracks: ['soft1.mp3', 'soft2.mp3', 'soft3.mp3', 'soft4.mp3']
    }
  };

  const existingApi = window.playtalkGlobalRadio;
  if (existingApi) {
    return;
  }

  const audio = new Audio();
  audio.preload = 'auto';
  audio.loop = false;
  audio.__playtalkGlobalRadio = true;

  let muted = false;
  let currentStation = DEFAULT_STATION;
  let currentTrackIndex = 0;
  let playAttemptPending = false;
  let pendingStartTime = null;
  let playbackPersistTimer = null;

  function normalizeStationId(raw) {
    const key = String(raw || '').trim().toLowerCase();
    if (key === 'future') return 'modern';
    if (key === 'garden') return 'balance';
    return STATIONS[key] ? key : DEFAULT_STATION;
  }

  function getStationMeta(stationId = currentStation) {
    return STATIONS[normalizeStationId(stationId)] || STATIONS[DEFAULT_STATION];
  }

  function resolveTrackUrl(trackName = '') {
    const normalized = String(trackName || '').trim();
    if (!normalized) return '';
    const encoded = normalized
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/');
    return `${MUSIC_BASE_URL}/${encoded}`;
  }

  function saveStation() {
    try {
      localStorage.setItem(STORAGE_KEY, currentStation);
    } catch (error) {
      // ignore write issues
    }
  }

  function loadStation() {
    try {
      return normalizeStationId(localStorage.getItem(STORAGE_KEY));
    } catch (error) {
      return DEFAULT_STATION;
    }
  }

  function saveMutedState() {
    try {
      localStorage.setItem(MUTE_STORAGE_KEY, muted ? '1' : '0');
    } catch (error) {
      // ignore write issues
    }
  }

  function loadMutedState() {
    try {
      return localStorage.getItem(MUTE_STORAGE_KEY) === '1';
    } catch (error) {
      return false;
    }
  }

  function savePlaybackState() {
    try {
      localStorage.setItem(PLAYBACK_STORAGE_KEY, JSON.stringify({
        stationId: currentStation,
        trackIndex: currentTrackIndex,
        currentTime: Number.isFinite(audio.currentTime) ? audio.currentTime : 0,
        savedAt: Date.now()
      }));
    } catch (error) {
      // ignore write issues
    }
  }

  function loadPlaybackState() {
    try {
      const raw = localStorage.getItem(PLAYBACK_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      const savedAt = Number(parsed.savedAt);
      if (!Number.isFinite(savedAt) || (Date.now() - savedAt) > PLAYBACK_STATE_MAX_AGE_MS) {
        return null;
      }
      return {
        stationId: normalizeStationId(parsed.stationId),
        trackIndex: Number.parseInt(parsed.trackIndex, 10) || 0,
        currentTime: Number.isFinite(Number(parsed.currentTime)) ? Number(parsed.currentTime) : 0
      };
    } catch (error) {
      return null;
    }
  }

  function emitChange() {
    document.documentElement.dataset.globalRadioStation = currentStation;
    const detail = {
      stationId: currentStation,
      station: getStationMeta(currentStation),
      muted,
      trackIndex: currentTrackIndex
    };
    document.dispatchEvent(new CustomEvent('playtalk:global-radio-change', { detail }));
  }

  function applyMutedState() {
    audio.muted = Boolean(muted);
    document.documentElement.dataset.globalRadioMuted = muted ? 'true' : 'false';
  }

  function applyPendingStartTime() {
    if (!Number.isFinite(pendingStartTime) || pendingStartTime < 0) return;
    const desiredTime = pendingStartTime;
    const setStartTime = () => {
      try {
        if (Number.isFinite(audio.duration) && audio.duration > 0) {
          audio.currentTime = Math.min(desiredTime, Math.max(audio.duration - 0.25, 0));
        } else {
          audio.currentTime = desiredTime;
        }
      } catch (error) {
        // ignore currentTime errors
      } finally {
        pendingStartTime = null;
      }
    };

    if (audio.readyState >= 1) {
      setStartTime();
    } else {
      audio.addEventListener('loadedmetadata', setStartTime, { once: true });
    }
  }

  function ensureTrackLoaded() {
    const station = getStationMeta(currentStation);
    if (!Array.isArray(station.tracks) || !station.tracks.length) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      return false;
    }

    if (currentTrackIndex < 0 || currentTrackIndex >= station.tracks.length) {
      currentTrackIndex = 0;
    }

    const nextSrc = resolveTrackUrl(station.tracks[currentTrackIndex]);
    if (!nextSrc) {
      return false;
    }

    if (audio.src !== nextSrc) {
      audio.src = nextSrc;
      audio.load();
    }
    applyPendingStartTime();

    return true;
  }

  function advanceTrack() {
    const station = getStationMeta(currentStation);
    if (!Array.isArray(station.tracks) || !station.tracks.length) {
      return;
    }
    currentTrackIndex = (currentTrackIndex + 1) % station.tracks.length;
    ensureTrackLoaded();
    playCurrentTrack();
  }

  function playCurrentTrack() {
    const canPlay = ensureTrackLoaded();
    if (!canPlay || currentStation === 'off') {
      playAttemptPending = false;
      return;
    }

    applyMutedState();
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.then === 'function') {
      playPromise
        .then(() => {
          playAttemptPending = false;
          savePlaybackState();
        })
        .catch(() => {
          playAttemptPending = true;
        });
    }
  }

  function setStation(stationId) {
    const nextStation = normalizeStationId(stationId);
    const changed = nextStation !== currentStation;
    if (!changed) {
      if (currentStation !== 'off' && audio.paused) {
        playCurrentTrack();
      }
      emitChange();
      return;
    }

    currentStation = nextStation;
    currentTrackIndex = 0;
    pendingStartTime = null;
    saveStation();

    if (currentStation === 'off') {
      audio.pause();
      savePlaybackState();
    } else {
      playCurrentTrack();
    }

    if (changed) {
      emitChange();
    }
  }

  function setMuted(nextMuted) {
    muted = Boolean(nextMuted);
    saveMutedState();
    applyMutedState();
    emitChange();
  }

  function handleFirstInteraction() {
    if (!playAttemptPending) {
      return;
    }
    playCurrentTrack();
  }

  audio.addEventListener('ended', advanceTrack);
  audio.addEventListener('error', advanceTrack);

  document.addEventListener('pointerdown', handleFirstInteraction, { passive: true });
  document.addEventListener('keydown', handleFirstInteraction);

  currentStation = loadStation();
  muted = loadMutedState();
  applyMutedState();
  const savedPlayback = loadPlaybackState();
  if (savedPlayback && savedPlayback.stationId === currentStation) {
    currentTrackIndex = Math.max(0, savedPlayback.trackIndex);
    pendingStartTime = Math.max(0, savedPlayback.currentTime || 0);
  }

  function startPlaybackPersistence() {
    if (playbackPersistTimer) {
      clearInterval(playbackPersistTimer);
    }
    playbackPersistTimer = window.setInterval(savePlaybackState, PLAYBACK_SAVE_INTERVAL_MS);
  }

  window.addEventListener('pagehide', savePlaybackState);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      savePlaybackState();
    }
  });

  window.playtalkGlobalRadio = {
    stations: STATIONS,
    getState() {
      return {
        stationId: currentStation,
        station: getStationMeta(currentStation),
        muted,
        trackIndex: currentTrackIndex
      };
    },
    getStation() {
      return currentStation;
    },
    setStation,
    setMuted,
    play: playCurrentTrack
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (currentStation !== 'off') {
        playCurrentTrack();
      }
      startPlaybackPersistence();
      emitChange();
    }, { once: true });
  } else {
    if (currentStation !== 'off') {
      playCurrentTrack();
    }
    startPlaybackPersistence();
    emitChange();
  }
})();
