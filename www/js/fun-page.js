(() => {
  let initialized = false;
  const LEVEL_STORAGE_KEY = 'vocabulary-level';
  const MIN_DAY = 1;
  const MAX_DAY = 200;

  const stationOrder = ['modern', 'balance', 'happy', 'soft'];
  const stationDescriptions = {
    modern: 'Beats limpos, vibe futurista. Sua radio pra trabalhar e voar.',
    balance: 'Trilha equilibrada e meditativa para estudar com calma e foco.',
    happy: 'Energia alegre e positiva para aprender sorrindo.',
    soft: 'Pegada acustica suave para uma experiencia leve e acolhedora.'
  };

  function getDescription(stationId, stationName) {
    const key = String(stationId || '').trim().toLowerCase();
    if (stationDescriptions[key]) return stationDescriptions[key];
    if (String(stationName || '').trim().toLowerCase() === 'modern') {
      return stationDescriptions.modern;
    }
    return 'Escolha um tema para o app.';
  }

  function initFunPage() {
    if (initialized) return;
    initialized = true;

    const stationImage = document.getElementById('radioStationImage');
    const stationLabel = document.getElementById('radioStationLabel');
    const stationTitle = document.getElementById('radioStationTitle');
    const stationDescription = document.getElementById('radioStationDescription');
    const stationDots = document.getElementById('radioStationDots');
    const prevBtn = document.getElementById('radioPrevBtn');
    const nextBtn = document.getElementById('radioNextBtn');
    const cover = document.getElementById('radioCover');
    const journeyDayForm = document.getElementById('journeyDayForm');
    const journeyDayInput = document.getElementById('journeyDayInput');
    const journeyDayStatus = document.getElementById('journeyDayStatus');

    if (!stationImage || !stationLabel || !stationTitle || !stationDescription || !stationDots || !prevBtn || !nextBtn || !cover || !journeyDayForm || !journeyDayInput || !journeyDayStatus) {
      return;
    }

    const radioApi = window.playtalkGlobalRadio;
    const hasRadioApi = Boolean(radioApi && radioApi.stations && typeof radioApi.setStation === 'function');

    let stationIndex = 0;
    let pointerStartX = 0;
    let pointerTracking = false;
    const swipeThreshold = 35;

    function readStoredDay() {
      const stored = Number.parseInt(localStorage.getItem(LEVEL_STORAGE_KEY) || '', 10);
      return Number.isFinite(stored) && stored >= MIN_DAY && stored <= MAX_DAY ? stored : MIN_DAY;
    }

    function clampDay(value) {
      const parsed = Number.parseInt(value, 10);
      if (!Number.isFinite(parsed)) return null;
      return Math.min(MAX_DAY, Math.max(MIN_DAY, parsed));
    }

    function setDayStatus(message, options = {}) {
      const text = typeof message === 'string' ? message.trim() : '';
      journeyDayStatus.textContent = text;
      journeyDayStatus.classList.toggle('is-error', Boolean(options.isError && text));
    }

    function syncDayInput() {
      const storedDay = readStoredDay();
      journeyDayInput.value = String(storedDay);
      setDayStatus(`Dia atual salvo: ${storedDay}`);
    }

    function renderDots() {
      if (!hasRadioApi) return;
      stationDots.innerHTML = '';
      stationOrder.forEach((stationId, index) => {
        const stationMeta = radioApi.stations[stationId];
        const input = document.createElement('input');
        input.type = 'radio';
        input.name = 'radioSelect';
        input.className = 'radio-lounge__dot';
        input.checked = index === stationIndex;
        input.setAttribute('aria-label', `Selecionar ${stationMeta && stationMeta.name ? stationMeta.name : stationId}`);
        input.addEventListener('change', () => {
          goToStationByIndex(index, { forceUnmute: true });
        });
        stationDots.appendChild(input);
      });
    }

    const applyState = (detail) => {
      if (!hasRadioApi) return;
      const station = detail && detail.station ? detail.station : null;
      const stationId = detail && detail.stationId ? String(detail.stationId) : '';
      const name = station && station.name ? station.name : 'Sem Fundo Musical';
      const image = station && station.image ? station.image : 'images/sound.png';

      stationImage.src = image;
      stationImage.alt = `Album ${name}`;
      stationLabel.textContent = name;
      stationTitle.textContent = 'Escolha um tema';
      stationDescription.textContent = getDescription(stationId, name);
      renderDots();
    };

    const syncIndexFromState = (state) => {
      if (!hasRadioApi) return;
      const stationId = state && state.stationId ? String(state.stationId) : '';
      const foundIndex = stationOrder.indexOf(stationId);
      stationIndex = foundIndex >= 0 ? foundIndex : 0;
    };

    const goToStationByIndex = (nextIndex, { forceUnmute = false } = {}) => {
      if (!hasRadioApi) return;
      stationIndex = (nextIndex + stationOrder.length) % stationOrder.length;
      const stationId = stationOrder[stationIndex];
      radioApi.setStation(stationId);
      if (forceUnmute && typeof radioApi.setMuted === 'function') {
        radioApi.setMuted(false);
      }
    };

    const goToNextStation = () => {
      goToStationByIndex(stationIndex + 1, { forceUnmute: true });
    };

    const goToPrevStation = () => {
      goToStationByIndex(stationIndex - 1, { forceUnmute: true });
    };

    if (hasRadioApi && typeof radioApi.getState === 'function') {
      const state = radioApi.getState();
      syncIndexFromState(state);
      if (!state || stationOrder.indexOf(String(state.stationId || '')) < 0) {
        goToStationByIndex(0, { forceUnmute: true });
      } else {
        applyState(state);
      }
    } else if (hasRadioApi) {
      goToStationByIndex(0, { forceUnmute: true });
    }

    if (hasRadioApi) {
      document.addEventListener('playtalk:global-radio-change', (event) => {
        const detail = event ? event.detail : null;
        syncIndexFromState(detail);
        applyState(detail);
      });
    }

    prevBtn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      goToPrevStation();
    });

    nextBtn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      goToNextStation();
    });

    cover.addEventListener('click', () => {
      goToNextStation();
    });

    cover.addEventListener('pointerdown', (event) => {
      pointerTracking = true;
      pointerStartX = event.clientX;
    });

    cover.addEventListener('pointerup', (event) => {
      if (!pointerTracking) return;
      pointerTracking = false;
      const deltaX = event.clientX - pointerStartX;
      if (Math.abs(deltaX) < swipeThreshold) return;
      if (deltaX < 0) {
        goToNextStation();
      } else {
        goToPrevStation();
      }
    });

    cover.addEventListener('pointercancel', () => {
      pointerTracking = false;
    });

    syncDayInput();

    journeyDayForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const nextDay = clampDay(journeyDayInput.value);
      if (!Number.isFinite(nextDay)) {
        setDayStatus('Digite um numero entre 1 e 200.', { isError: true });
        return;
      }

      localStorage.setItem(LEVEL_STORAGE_KEY, String(nextDay));
      journeyDayInput.value = String(nextDay);
      setDayStatus(`Pronto. Seu progresso agora esta no Dia ${nextDay}.`);
      window.dispatchEvent(new CustomEvent('playtalk:level-updated', {
        detail: { day: nextDay }
      }));
    });

    journeyDayInput.addEventListener('blur', () => {
      const nextDay = clampDay(journeyDayInput.value);
      if (!Number.isFinite(nextDay)) return;
      journeyDayInput.value = String(nextDay);
    });
  }

  if (typeof window !== 'undefined' && typeof window.registerPlaytalkPage === 'function') {
    window.registerPlaytalkPage('page-fun', initFunPage);
    return;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFunPage, { once: true });
  } else {
    initFunPage();
  }
})();

