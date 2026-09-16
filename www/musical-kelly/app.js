(() => {
  'use strict';

  const API_ROOT = '/api/musical-kelly';
  const CACHE_NAME = 'playtalk-musical-kelly-media-v1';
  const LONG_PRESS_MS = 500;
  const FADE_TOTAL_SECONDS = 3;
  const OVERLAP_SECONDS = 1;
  const DEFAULT_CARD_COUNT = 6;

  const elements = {
    adminHeader: document.getElementById('adminHeader'),
    trackList: document.getElementById('trackList'),
    trackTemplate: document.getElementById('trackTemplate'),
    selectionPanel: document.getElementById('selectionPanel'),
    titleInput: document.getElementById('titleInput'),
    chooseAudioButton: document.getElementById('chooseAudioButton'),
    chooseImageButton: document.getElementById('chooseImageButton'),
    removeCardButton: document.getElementById('removeCardButton'),
    closeSelectionButton: document.getElementById('closeSelectionButton'),
    addCardButton: document.getElementById('addCardButton'),
    downloadAllButton: document.getElementById('downloadAllButton'),
    audioInput: document.getElementById('audioInput'),
    imageInput: document.getElementById('imageInput'),
    statusLine: document.getElementById('statusLine'),
    statusText: document.getElementById('statusText'),
    playerBar: document.getElementById('playerBar'),
    rewindButton: document.getElementById('rewindButton'),
    forwardButton: document.getElementById('forwardButton'),
    seekSlider: document.getElementById('seekSlider'),
    currentTimeLabel: document.getElementById('currentTimeLabel'),
    toast: document.getElementById('toast')
  };

  const state = {
    project: { version: 1, cards: [] },
    canEdit: false,
    selectedId: '',
    current: null,
    transitionTargetId: '',
    transitioning: false,
    transitionTimers: [],
    autoAdvance: null,
    autoAdvanceGeneration: 0,
    audioContext: null,
    bufferPromises: new Map(),
    durations: new Map(),
    durationPromises: new Map(),
    downloadStates: new Map(),
    uploading: false,
    saveTimer: null,
    saveChain: Promise.resolve(),
    toastTimer: null,
    scrubbing: false,
    progressFrame: 0
  };

  function makeId() {
    if (crypto.randomUUID) return `cue-${crypto.randomUUID()}`;
    return `cue-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function makeDefaultCards(count = DEFAULT_CARD_COUNT) {
    return Array.from({ length: count }, (_, index) => ({
      id: makeId(),
      title: `Faixa ${String(index + 1).padStart(2, '0')}`,
      audio: null,
      image: null
    }));
  }

  function getCard(cardId) {
    return state.project.cards.find((card) => card.id === cardId) || null;
  }

  function absoluteUrl(url) {
    return new URL(url, window.location.origin).href;
  }

  function setStatus(message, busy = false) {
    elements.statusText.textContent = message;
    elements.statusLine.classList.toggle('is-busy', busy);
  }

  function showToast(message, isError = false) {
    window.clearTimeout(state.toastTimer);
    elements.toast.textContent = message;
    elements.toast.classList.toggle('is-error', isError);
    elements.toast.hidden = false;
    state.toastTimer = window.setTimeout(() => {
      elements.toast.hidden = true;
    }, isError ? 5200 : 3000);
  }

  async function apiJson(url, options = {}) {
    const response = await fetch(url, {
      credentials: 'same-origin',
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.headers || {})
      }
    });
    const payload = await response.json().catch(() => ({}));
    if (response.status === 401) {
      window.location.href = `/entrar?return=${encodeURIComponent('/musical-kelly')}`;
      throw new Error('Sessão expirada.');
    }
    if (!response.ok || payload.success === false) {
      throw new Error(payload.message || `Erro ${response.status}.`);
    }
    return payload;
  }

  function projectForSave() {
    return {
      version: 1,
      cards: state.project.cards.map((card) => ({
        id: card.id,
        title: card.title,
        audio: card.audio ? {
          fileName: card.audio.fileName,
          name: card.audio.name,
          contentType: card.audio.contentType,
          size: card.audio.size,
          updatedAt: card.audio.updatedAt
        } : null,
        image: card.image ? {
          fileName: card.image.fileName,
          name: card.image.name,
          contentType: card.image.contentType,
          size: card.image.size,
          updatedAt: card.image.updatedAt
        } : null
      }))
    };
  }

  function saveProject({ quiet = true } = {}) {
    if (!state.canEdit) return Promise.reject(new Error('Somente o administrador pode editar esta página.'));
    window.clearTimeout(state.saveTimer);
    const payload = projectForSave();
    const operation = state.saveChain.then(async () => {
      if (!quiet) setStatus('Salvando no R2…', true);
      await apiJson(`${API_ROOT}/project`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!quiet) setStatus('Tudo salvo no R2.');
    });
    state.saveChain = operation.catch((error) => {
      setStatus('Falha ao salvar. As alterações continuam abertas nesta tela.');
      showToast(error.message || 'Não foi possível salvar.', true);
    });
    return operation;
  }

  function queueProjectSave(delay = 450) {
    window.clearTimeout(state.saveTimer);
    state.saveTimer = window.setTimeout(() => saveProject().catch(() => {}), delay);
  }

  function updateSelectionPanel() {
    const selected = getCard(state.selectedId);
    elements.selectionPanel.hidden = !state.canEdit || !selected;
    if (!selected) return;
    if (document.activeElement !== elements.titleInput) {
      elements.titleInput.value = selected.title;
    }
  }

  function setCardBackground(element, card) {
    if (card.image?.url) {
      const imageValue = `url("${String(card.image.url).replace(/["\\]/g, '')}")`;
      element.style.backgroundImage = imageValue;
      element.style.setProperty('--track-image', imageValue);
    } else {
      element.style.backgroundImage = '';
      element.style.removeProperty('--track-image');
    }
  }

  function formatDuration(seconds) {
    const totalSeconds = Math.max(0, Math.round(Number(seconds) || 0));
    const minutes = Math.floor(totalSeconds / 60);
    const remainder = totalSeconds % 60;
    if (!minutes) return `${remainder} seg`;
    if (!remainder) return `${minutes} min`;
    return `${minutes} min ${remainder} seg`;
  }

  function loadCardDuration(card) {
    if (!card?.audio?.url) return Promise.resolve(0);
    const key = card.audio.fileName;
    if (state.durations.has(key)) return Promise.resolve(state.durations.get(key));
    if (!state.durationPromises.has(key)) {
      const promise = new Promise((resolve, reject) => {
        const media = new Audio();
        media.preload = 'metadata';
        media.addEventListener('loadedmetadata', () => {
          const duration = Number.isFinite(media.duration) ? media.duration : 0;
          state.durations.set(key, duration);
          media.removeAttribute('src');
          media.load();
          resolve(duration);
        }, { once: true });
        media.addEventListener('error', () => reject(new Error('Duração indisponível.')), { once: true });
        media.src = card.audio.url;
      }).catch(() => 0).finally(() => state.durationPromises.delete(key));
      state.durationPromises.set(key, promise);
    }
    return state.durationPromises.get(key);
  }

  function applyDownloadState(cardId, button) {
    const value = state.downloadStates.get(cardId);
    const isPlaying = state.current?.cardId === cardId && !state.current.paused;
    button.classList.toggle('is-downloaded', value === 'done');
    button.classList.toggle('is-busy', value === 'busy');
    button.classList.toggle('is-playing-control', value === 'done' && isPlaying);
    button.title = button.disabled
      ? 'Faixa ainda não configurada'
      : value === 'done'
      ? (isPlaying ? 'Pausar faixa' : 'Reproduzir faixa')
      : (value === 'busy' ? 'Baixando faixa' : 'Baixar faixa para este aparelho');
    button.setAttribute('aria-label', button.title);
  }

  function render() {
    elements.trackList.replaceChildren();
    const fragment = document.createDocumentFragment();
    state.project.cards.forEach((card) => {
      const node = elements.trackTemplate.content.firstElementChild.cloneNode(true);
      node.dataset.cardId = card.id;
      node.classList.toggle('is-selected', state.selectedId === card.id);
      node.classList.toggle('is-playing', state.current?.cardId === card.id && !state.current.paused);
      node.classList.toggle('is-cued', state.transitionTargetId === card.id);
      node.setAttribute('aria-label', `${card.title}. ${card.audio ? 'Toque para reproduzir.' : 'Sem música.'}`);
      setCardBackground(node.querySelector('.track-background'), card);

      const durationLabel = node.querySelector('.track-duration');
      const isPlaying = state.current?.cardId === card.id && !state.current.paused;
      const knownDuration = card.audio ? state.durations.get(card.audio.fileName) : 0;
      durationLabel.textContent = isPlaying
        ? formatDuration(currentPosition(state.current))
        : (knownDuration ? formatDuration(knownDuration) : '--');
      node.querySelector('.card-seek-back').addEventListener('click', (event) => {
        event.stopPropagation();
        seekCardRelative(card.id, -5);
      });
      node.querySelector('.card-seek-forward').addEventListener('click', (event) => {
        event.stopPropagation();
        seekCardRelative(card.id, 5);
      });
      if (card.audio && !knownDuration) {
        loadCardDuration(card).then((duration) => {
          const currentLabel = elements.trackList.querySelector(`[data-card-id="${CSS.escape(card.id)}"] .track-duration`);
          const isCurrent = state.current?.cardId === card.id && !state.current.paused;
          if (currentLabel && duration && !isCurrent) currentLabel.textContent = formatDuration(duration);
        });
      }

      const downloadButton = node.querySelector('.download-button');
      downloadButton.disabled = !card.audio;
      downloadButton.title = card.audio ? 'Baixar faixa para este aparelho' : 'Adicione uma música primeiro';
      applyDownloadState(card.id, downloadButton);
      downloadButton.addEventListener('click', (event) => {
        event.stopPropagation();
        const action = state.downloadStates.get(card.id) === 'done'
          ? playCard(card.id)
          : downloadCard(card.id);
        action.catch((error) => showToast(error.message, true));
      });

      bindCardGestures(node, card.id);
      fragment.appendChild(node);
    });
    elements.trackList.appendChild(fragment);
    document.body.classList.toggle('has-playing-track', Boolean(state.current && !state.current.paused));
    elements.adminHeader.hidden = !state.canEdit;
    elements.addCardButton.hidden = !state.canEdit;
    updateSelectionPanel();
    updateDownloadAllState();
    updatePlayerBar();
  }

  function bindCardGestures(element, cardId) {
    let timer = null;
    let startX = 0;
    let startY = 0;
    let longPressed = false;
    let pointerActive = false;

    const cancelTimer = () => {
      window.clearTimeout(timer);
      timer = null;
    };

    element.addEventListener('pointerdown', (event) => {
      if (event.target.closest('button')) return;
      startX = event.clientX;
      startY = event.clientY;
      longPressed = false;
      pointerActive = true;
      if (state.canEdit) {
        timer = window.setTimeout(() => {
          longPressed = true;
          if (navigator.vibrate) navigator.vibrate(24);
          selectCard(cardId);
        }, LONG_PRESS_MS);
      }
    });

    element.addEventListener('pointermove', (event) => {
      if (Math.hypot(event.clientX - startX, event.clientY - startY) > 12) {
        pointerActive = false;
        cancelTimer();
      }
    });

    element.addEventListener('pointerup', () => {
      const shouldPlay = pointerActive && !longPressed;
      pointerActive = false;
      cancelTimer();
      if (shouldPlay) playCard(cardId).catch((error) => showToast(error.message, true));
    });
    element.addEventListener('pointercancel', () => {
      pointerActive = false;
      cancelTimer();
    });
    element.addEventListener('pointerleave', (event) => {
      if (event.pointerType === 'mouse') {
        pointerActive = false;
        cancelTimer();
      }
    });
    element.addEventListener('contextmenu', (event) => event.preventDefault());
    element.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        playCard(cardId).catch((error) => showToast(error.message, true));
      }
    });
  }

  function selectCard(cardId) {
    if (!state.canEdit) return;
    state.selectedId = cardId;
    render();
    setStatus('Container selecionado. Use A para música ou P para imagem.');
  }

  async function getCache() {
    if (!('caches' in window)) throw new Error('Este navegador não oferece armazenamento grande para mídia.');
    return caches.open(CACHE_NAME);
  }

  async function requestPersistentStorage() {
    if (navigator.storage?.persist) {
      await navigator.storage.persist().catch(() => false);
    }
  }

  async function cacheAsset(asset) {
    if (!asset?.url) return;
    const cache = await getCache();
    const request = new Request(absoluteUrl(asset.url), { credentials: 'same-origin' });
    const existing = await cache.match(request);
    if (existing) return;
    const response = await fetch(request);
    if (!response.ok) throw new Error(`Não foi possível baixar ${asset.name || 'o arquivo'}.`);
    await cache.put(request, response.clone());
  }

  async function isAssetCached(asset) {
    if (!asset?.url || !('caches' in window)) return false;
    const cache = await getCache();
    return Boolean(await cache.match(new Request(absoluteUrl(asset.url), { credentials: 'same-origin' })));
  }

  async function isCardCached(card) {
    if (!card?.audio) return false;
    const audioReady = await isAssetCached(card.audio);
    const imageReady = !card.image || await isAssetCached(card.image);
    return audioReady && imageReady;
  }

  async function refreshDownloadStates() {
    await Promise.all(state.project.cards.map(async (card) => {
      if (state.downloadStates.get(card.id) === 'busy') return;
      state.downloadStates.set(card.id, await isCardCached(card) ? 'done' : 'idle');
      const button = elements.trackList.querySelector(`[data-card-id="${CSS.escape(card.id)}"] .download-button`);
      if (button) applyDownloadState(card.id, button);
    }));
    updateDownloadAllState();
  }

  function updateDownloadAllState() {
    const cardsWithAudio = state.project.cards.filter((card) => card.audio);
    const allReady = cardsWithAudio.length > 0 && cardsWithAudio.every((card) => state.downloadStates.get(card.id) === 'done');
    elements.downloadAllButton.classList.toggle('is-downloaded', allReady);
    elements.downloadAllButton.title = allReady
      ? 'Todas as faixas estão neste aparelho'
      : 'Baixar todas as faixas para este aparelho';
  }

  async function downloadCard(cardId, { quiet = false } = {}) {
    const card = getCard(cardId);
    if (!card?.audio) throw new Error('Adicione uma música neste container primeiro.');
    state.downloadStates.set(cardId, 'busy');
    render();
    if (!quiet) setStatus(`Baixando “${card.title}” para este aparelho…`, true);
    try {
      await requestPersistentStorage();
      await cacheAsset(card.audio);
      await cacheAsset(card.image);
      state.downloadStates.set(cardId, 'done');
      if (!quiet) setStatus(`“${card.title}” está pronta para tocar sem depender da internet.`);
      loadAudioBuffer(card).catch(() => {});
    } catch (error) {
      state.downloadStates.set(cardId, 'idle');
      throw error;
    } finally {
      render();
    }
  }

  async function downloadAll() {
    const cards = state.project.cards.filter((card) => card.audio);
    if (!cards.length) {
      showToast('Adicione pelo menos uma música antes de baixar.', true);
      return;
    }
    await requestPersistentStorage();
    for (let index = 0; index < cards.length; index += 1) {
      setStatus(`Baixando ${index + 1} de ${cards.length}: “${cards[index].title}”…`, true);
      await downloadCard(cards[index].id, { quiet: true });
    }
    setStatus('Todas as faixas estão baixadas e prontas para a apresentação.');
    showToast('Download concluído. As faixas estão prontas para tocar.');
  }

  async function getAudioContext() {
    if (!state.audioContext) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) throw new Error('Este navegador não suporta a mesa de áudio.');
      state.audioContext = new AudioContextClass({ latencyHint: 'interactive' });
    }
    if (state.audioContext.state === 'suspended') await state.audioContext.resume();
    return state.audioContext;
  }

  async function fetchAssetResponse(asset) {
    const request = new Request(absoluteUrl(asset.url), { credentials: 'same-origin' });
    if ('caches' in window) {
      const cached = await (await getCache()).match(request);
      if (cached) return cached;
    }
    const response = await fetch(request);
    if (!response.ok) throw new Error(`Não foi possível abrir ${asset.name || 'a faixa'}.`);
    return response;
  }

  async function loadAudioBuffer(card) {
    if (!card?.audio?.url) throw new Error('Este container ainda não tem música.');
    const key = card.audio.fileName;
    if (!state.bufferPromises.has(key)) {
      const promise = (async () => {
        const context = await getAudioContext();
        const response = await fetchAssetResponse(card.audio);
        const bytes = await response.arrayBuffer();
        const buffer = await context.decodeAudioData(bytes.slice(0));
        state.durations.set(key, buffer.duration);
        return buffer;
      })().catch((error) => {
        state.bufferPromises.delete(key);
        throw error;
      });
      state.bufferPromises.set(key, promise);
    }
    return state.bufferPromises.get(key);
  }

  function createVoice(cardId, buffer, when, offset, initialGain) {
    const context = state.audioContext;
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;
    gain.gain.setValueAtTime(initialGain, context.currentTime);
    source.connect(gain).connect(context.destination);
    const voice = {
      cardId,
      buffer,
      source,
      gain,
      offset,
      startedAt: when,
      paused: false,
      cancelled: false,
      replaced: false,
      ended: false
    };
    source.addEventListener('ended', () => {
      voice.ended = true;
      if (voice.cancelled || voice.replaced) return;
      if (state.current === voice) {
        state.current = null;
        state.transitionTargetId = '';
        state.transitioning = false;
        render();
        setStatus('Faixa concluída.');
      }
    });
    source.start(when, Math.max(0, Math.min(offset, Math.max(0, buffer.duration - 0.01))));
    return voice;
  }

  function currentPosition(voice, atTime = state.audioContext.currentTime) {
    if (!voice) return 0;
    if (voice.paused) return voice.offset;
    return Math.max(0, voice.offset + Math.max(0, atTime - voice.startedAt));
  }

  function formatTime(seconds) {
    const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
    const minutes = Math.floor(safeSeconds / 60);
    const remainder = safeSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
  }

  function updatePlayerBar() {
    const voice = state.current;
    elements.playerBar.hidden = !voice;
    if (!voice) return;
    const duration = Math.max(0, Number(voice.buffer?.duration) || 0);
    const livePosition = state.audioContext
      ? Math.min(duration, currentPosition(voice))
      : Math.min(duration, voice.offset || 0);
    const displayedPosition = state.scrubbing
      ? Number(elements.seekSlider.value || 0)
      : livePosition;
    elements.seekSlider.max = String(Math.max(0.01, duration));
    if (!state.scrubbing) elements.seekSlider.value = String(livePosition);
    elements.currentTimeLabel.textContent = formatTime(displayedPosition);
    elements.currentTimeLabel.dateTime = `PT${Math.floor(displayedPosition / 60)}M${Math.floor(displayedPosition % 60)}S`;
    const activeCardTime = elements.trackList.querySelector('.track-card.is-playing .track-duration');
    if (activeCardTime) activeCardTime.textContent = formatDuration(displayedPosition);
    const disabled = state.transitioning || duration <= 0;
    elements.seekSlider.disabled = disabled;
    elements.rewindButton.disabled = disabled;
    elements.forwardButton.disabled = disabled;
  }

  function runProgressLoop() {
    updatePlayerBar();
    state.progressFrame = window.requestAnimationFrame(runProgressLoop);
  }

  async function seekTo(targetSeconds) {
    const current = state.current;
    if (!current?.buffer || state.transitioning) return;
    const duration = current.buffer.duration;
    const target = Math.max(0, Math.min(Number(targetSeconds) || 0, Math.max(0, duration - 0.02)));
    if (current.paused) {
      state.current = { ...current, offset: target };
      updatePlayerBar();
      return;
    }

    cancelAutoAdvance();
    const context = await getAudioContext();
    const now = context.currentTime;
    current.replaced = true;
    current.gain.gain.cancelScheduledValues(now);
    current.gain.gain.setValueAtTime(Math.max(0.0001, current.gain.gain.value), now);
    current.gain.gain.linearRampToValueAtTime(0, now + 0.055);
    try { current.source.stop(now + 0.06); } catch (_error) {}

    const when = now + 0.018;
    const nextVoice = createVoice(current.cardId, current.buffer, when, target, 0);
    nextVoice.gain.gain.linearRampToValueAtTime(1, when + 0.075);
    state.current = nextVoice;
    render();
    scheduleAutoAdvance(nextVoice);
  }

  function seekRelative(deltaSeconds) {
    if (!state.current || !state.audioContext) return;
    seekTo(currentPosition(state.current) + deltaSeconds).catch((error) => showToast(error.message, true));
  }

  function seekCardRelative(cardId, deltaSeconds) {
    if (state.current?.cardId !== cardId) {
      showToast('Toque no play desta faixa antes de avançar ou voltar.');
      return;
    }
    seekRelative(deltaSeconds);
  }

  function clearTransitionTimers() {
    state.transitionTimers.forEach((timer) => window.clearTimeout(timer));
    state.transitionTimers = [];
  }

  function stopVoice(voice, when = state.audioContext?.currentTime || 0) {
    if (!voice?.source) return;
    voice.cancelled = true;
    try { voice.source.stop(when); } catch (_error) {}
  }

  function cancelAutoAdvance() {
    state.autoAdvanceGeneration += 1;
    if (!state.autoAdvance) return;
    window.clearTimeout(state.autoAdvance.timer);
    stopVoice(state.autoAdvance.nextVoice);
    state.autoAdvance = null;
  }

  function nextPlayableCard(cardId) {
    const currentIndex = state.project.cards.findIndex((card) => card.id === cardId);
    if (currentIndex < 0) return null;
    return state.project.cards.slice(currentIndex + 1).find((card) => card.audio) || null;
  }

  async function scheduleAutoAdvance(voice) {
    cancelAutoAdvance();
    const generation = state.autoAdvanceGeneration;
    const nextCard = nextPlayableCard(voice?.cardId);
    if (!voice || !nextCard || voice.paused || voice.cancelled) return;

    try {
      const buffer = await loadAudioBuffer(nextCard);
      if (generation !== state.autoAdvanceGeneration || voice.replaced || voice.cancelled || voice.paused) return;
      if (voice.ended) {
        if (!state.current) await startImmediately(nextCard, buffer);
        return;
      }

      const context = await getAudioContext();
      const startAt = voice.startedAt + Math.max(0, voice.buffer.duration - voice.offset);
      if (startAt <= context.currentTime + 0.025) {
        if (state.current === voice) await startImmediately(nextCard, buffer);
        return;
      }

      voice.replaced = true;
      const nextVoice = createVoice(nextCard.id, buffer, startAt, 0, 1);
      const timer = window.setTimeout(() => {
        if (generation !== state.autoAdvanceGeneration) {
          stopVoice(nextVoice);
          return;
        }
        state.autoAdvance = null;
        state.current = nextVoice;
        render();
        setStatus(`No ar: “${nextCard.title}”.`);
        scheduleAutoAdvance(nextVoice);
      }, Math.max(0, (startAt - context.currentTime) * 1000));
      state.autoAdvance = { fromVoice: voice, nextVoice, timer };
    } catch (error) {
      console.warn('Não foi possível preparar a próxima faixa:', error);
    }
  }

  async function startImmediately(card, buffer) {
    cancelAutoAdvance();
    const context = await getAudioContext();
    const when = context.currentTime + 0.025;
    const voice = createVoice(card.id, buffer, when, 0, 0);
    voice.gain.gain.linearRampToValueAtTime(1, when + 0.12);
    state.current = voice;
    state.transitionTargetId = '';
    state.transitioning = false;
    render();
    setStatus(`No ar: “${card.title}”.`);
    scheduleAutoAdvance(voice);
  }

  async function transitionTo(card, buffer) {
    cancelAutoAdvance();
    const context = await getAudioContext();
    const outgoing = state.current;
    const now = context.currentTime + 0.035;
    const outgoingPosition = currentPosition(outgoing, now);
    const remaining = Math.max(0.08, outgoing.buffer.duration - outgoingPosition);
    const fadeSeconds = Math.min(FADE_TOTAL_SECONDS, remaining);
    const overlapSeconds = Math.min(OVERLAP_SECONDS, fadeSeconds);
    const incomingDelay = Math.max(0, fadeSeconds - overlapSeconds);
    const incomingStart = now + incomingDelay;
    const fadeEnd = now + fadeSeconds;

    outgoing.replaced = true;
    outgoing.gain.gain.cancelScheduledValues(now);
    outgoing.gain.gain.setValueAtTime(Math.max(0.0001, outgoing.gain.gain.value), now);
    outgoing.gain.gain.linearRampToValueAtTime(0, fadeEnd);

    const incoming = createVoice(card.id, buffer, incomingStart, 0, 0);
    incoming.gain.gain.setValueAtTime(0, incomingStart);
    incoming.gain.gain.linearRampToValueAtTime(1, fadeEnd);

    state.transitioning = true;
    state.transitionTargetId = card.id;
    render();
    setStatus(`Transição: fade de ${(fadeSeconds * 1000).toFixed(0)} ms; a próxima faixa entra nos últimos ${(overlapSeconds * 1000).toFixed(0)} ms.`, true);

    const activateTimer = window.setTimeout(() => {
      state.current = incoming;
      state.transitionTargetId = '';
      render();
    }, Math.max(0, incomingDelay * 1000));
    const finishTimer = window.setTimeout(() => {
      stopVoice(outgoing);
      state.current = incoming.ended ? null : incoming;
      state.transitionTargetId = '';
      state.transitioning = false;
      render();
      setStatus(incoming.ended ? 'Faixa concluída.' : `No ar: “${card.title}”.`);
      if (!incoming.ended) scheduleAutoAdvance(incoming);
    }, Math.max(0, fadeSeconds * 1000 + 80));
    state.transitionTimers.push(activateTimer, finishTimer);
  }

  function pauseCurrent() {
    const voice = state.current;
    if (!voice || voice.paused || !state.audioContext) return;
    const now = state.audioContext.currentTime;
    cancelAutoAdvance();
    const offset = Math.min(currentPosition(voice, now), Math.max(0, voice.buffer.duration - 0.01));
    voice.cancelled = true;
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setValueAtTime(Math.max(0.0001, voice.gain.gain.value), now);
    voice.gain.gain.linearRampToValueAtTime(0, now + 0.08);
    try { voice.source.stop(now + 0.09); } catch (_error) {}
    state.current = { ...voice, source: null, gain: null, offset, startedAt: 0, paused: true, cancelled: false };
    render();
    setStatus(`Pausada: “${getCard(voice.cardId)?.title || 'faixa'}”. Toque novamente para continuar.`);
  }

  async function resumeCurrent() {
    const paused = state.current;
    if (!paused?.paused) return;
    const context = await getAudioContext();
    const when = context.currentTime + 0.02;
    const voice = createVoice(paused.cardId, paused.buffer, when, paused.offset, 0);
    voice.gain.gain.linearRampToValueAtTime(1, when + 0.1);
    state.current = voice;
    render();
    setStatus(`No ar: “${getCard(voice.cardId)?.title || 'faixa'}”.`);
    scheduleAutoAdvance(voice);
  }

  async function playCard(cardId) {
    const card = getCard(cardId);
    if (!card?.audio) {
      selectCard(cardId);
      showToast('Este container ainda não tem música. Pressione A para adicionar.', true);
      return;
    }
    await getAudioContext();
    if (state.transitioning) {
      showToast('Aguarde a transição atual terminar.');
      return;
    }
    if (state.current?.cardId === cardId) {
      if (state.current.paused) await resumeCurrent();
      else pauseCurrent();
      return;
    }

    setStatus(`Preparando “${card.title}”… a faixa atual continua tocando.`, true);
    const buffer = await loadAudioBuffer(card);
    if (!state.current || state.current.paused) {
      if (state.current?.source) stopVoice(state.current);
      await startImmediately(card, buffer);
      return;
    }
    clearTransitionTimers();
    await transitionTo(card, buffer);
  }

  async function uploadFile(kind, file) {
    if (!state.canEdit) throw new Error('Somente o administrador pode enviar arquivos.');
    const card = getCard(state.selectedId);
    if (!card) throw new Error('Segure um container por 500 ms para selecioná-lo.');
    if (!file) return;
    const isAudio = kind === 'audio';
    const maxBytes = isAudio ? 220 * 1024 * 1024 : 20 * 1024 * 1024;
    if (file.size > maxBytes) throw new Error(isAudio ? 'A faixa pode ter no máximo 220 MB.' : 'A imagem pode ter no máximo 20 MB.');

    state.uploading = true;
    setStatus(`Enviando ${isAudio ? 'música' : 'imagem'} para o R2…`, true);
    try {
      const query = new URLSearchParams({ cardId: card.id, name: file.name });
      const payload = await apiJson(`${API_ROOT}/assets/${kind}?${query}`, {
        method: 'POST',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file
      });
      card[kind] = payload.asset;
      if (isAudio && /^Faixa\s+\d+$/i.test(card.title)) {
        card.title = file.name.replace(/\.[^.]+$/, '').trim().slice(0, 120) || card.title;
      }
      state.downloadStates.set(card.id, 'idle');
      render();
      await saveProject({ quiet: false });
      showToast(`${isAudio ? 'Música' : 'Imagem'} salva no R2.`);
    } finally {
      state.uploading = false;
      elements.audioInput.value = '';
      elements.imageInput.value = '';
    }
  }

  function openPicker(kind) {
    if (!state.canEdit) return;
    if (!getCard(state.selectedId)) {
      showToast('Segure um container por 500 ms para selecioná-lo.', true);
      return;
    }
    (kind === 'audio' ? elements.audioInput : elements.imageInput).click();
  }

  function addCard() {
    if (!state.canEdit) return;
    const card = {
      id: makeId(),
      title: `Faixa ${String(state.project.cards.length + 1).padStart(2, '0')}`,
      audio: null,
      image: null
    };
    state.project.cards.push(card);
    state.selectedId = card.id;
    render();
    queueProjectSave(50);
    window.requestAnimationFrame(() => {
      elements.trackList.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  function removeSelectedCard() {
    if (!state.canEdit) return;
    const card = getCard(state.selectedId);
    if (!card) return;
    if (!window.confirm(`Remover o container “${card.title}” do musical?`)) return;
    if (state.current?.cardId === card.id) {
      cancelAutoAdvance();
      stopVoice(state.current);
      state.current = null;
    }
    state.project.cards = state.project.cards.filter((entry) => entry.id !== card.id);
    state.selectedId = '';
    render();
    saveProject({ quiet: false }).catch(() => {});
  }

  function bindControls() {
    elements.addCardButton.addEventListener('click', addCard);
    elements.downloadAllButton.addEventListener('click', () => {
      downloadAll().catch((error) => {
        setStatus('O download foi interrompido.');
        showToast(error.message, true);
      });
    });
    elements.chooseAudioButton.addEventListener('click', () => openPicker('audio'));
    elements.chooseImageButton.addEventListener('click', () => openPicker('image'));
    elements.removeCardButton.addEventListener('click', removeSelectedCard);
    elements.closeSelectionButton.addEventListener('click', () => {
      state.selectedId = '';
      render();
    });
    elements.rewindButton.addEventListener('click', () => seekRelative(-5));
    elements.forwardButton.addEventListener('click', () => seekRelative(5));
    elements.seekSlider.addEventListener('pointerdown', () => {
      state.scrubbing = true;
    });
    elements.seekSlider.addEventListener('input', () => {
      state.scrubbing = true;
      elements.currentTimeLabel.textContent = formatTime(elements.seekSlider.value);
    });
    elements.seekSlider.addEventListener('change', () => {
      const target = Number(elements.seekSlider.value || 0);
      state.scrubbing = false;
      seekTo(target).catch((error) => showToast(error.message, true));
    });
    elements.audioInput.addEventListener('change', () => {
      uploadFile('audio', elements.audioInput.files?.[0]).catch((error) => showToast(error.message, true));
    });
    elements.imageInput.addEventListener('change', () => {
      uploadFile('image', elements.imageInput.files?.[0]).catch((error) => showToast(error.message, true));
    });
    elements.titleInput.addEventListener('input', () => {
      const card = getCard(state.selectedId);
      if (!card) return;
      card.title = elements.titleInput.value.slice(0, 120) || 'Faixa';
      queueProjectSave();
    });
    elements.titleInput.addEventListener('blur', () => saveProject().catch(() => {}));
    document.addEventListener('keydown', (event) => {
      if (!state.canEdit || event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
      const tagName = document.activeElement?.tagName;
      if (tagName === 'INPUT' || tagName === 'TEXTAREA' || document.activeElement?.isContentEditable) return;
      if (event.key.toLowerCase() === 'a') {
        event.preventDefault();
        openPicker('audio');
      } else if (event.key.toLowerCase() === 'p') {
        event.preventDefault();
        openPicker('image');
      }
    });
  }

  async function init() {
    bindControls();
    runProgressLoop();
    try {
      const payload = await apiJson(`${API_ROOT}/project`);
      state.canEdit = payload.canEdit === true;
      state.project = payload.project || { version: 1, cards: [] };
      if (state.canEdit && (!Array.isArray(state.project.cards) || !state.project.cards.length)) {
        state.project.cards = makeDefaultCards();
        await saveProject().catch(() => {});
      }
      render();
      setStatus('Pronto. Toque para reproduzir; segure 500 ms para selecionar.');
      refreshDownloadStates().catch(() => {});
    } catch (error) {
      setStatus('Não foi possível abrir o musical.');
      showToast(error.message || 'Falha ao carregar.', true);
    }
  }

  init();
})();
