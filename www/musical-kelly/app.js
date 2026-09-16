(() => {
  'use strict';

  const API_ROOT = '/api/musical-kelly';
  const CACHE_NAME = 'playtalk-musical-kelly-media-v1';
  const LONG_PRESS_MS = 500;
  const FADE_TOTAL_SECONDS = 3;
  const OVERLAP_SECONDS = 1;
  const DEFAULT_CARD_COUNT = 6;

  const elements = {
    trackList: document.getElementById('trackList'),
    trackTemplate: document.getElementById('trackTemplate'),
    selectionPanel: document.getElementById('selectionPanel'),
    titleInput: document.getElementById('titleInput'),
    chooseAudioButton: document.getElementById('chooseAudioButton'),
    chooseImageButton: document.getElementById('chooseImageButton'),
    removeCardButton: document.getElementById('removeCardButton'),
    addCardButton: document.getElementById('addCardButton'),
    downloadAllButton: document.getElementById('downloadAllButton'),
    audioInput: document.getElementById('audioInput'),
    imageInput: document.getElementById('imageInput'),
    statusLine: document.getElementById('statusLine'),
    statusText: document.getElementById('statusText'),
    toast: document.getElementById('toast')
  };

  const state = {
    project: { version: 1, cards: [] },
    selectedId: '',
    current: null,
    transitionTargetId: '',
    transitioning: false,
    transitionTimers: [],
    audioContext: null,
    bufferPromises: new Map(),
    downloadStates: new Map(),
    uploading: false,
    saveTimer: null,
    saveChain: Promise.resolve(),
    toastTimer: null
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
    elements.selectionPanel.hidden = !selected;
    if (!selected) return;
    if (document.activeElement !== elements.titleInput) {
      elements.titleInput.value = selected.title;
    }
  }

  function setCardBackground(element, card) {
    if (card.image?.url) {
      element.style.backgroundImage = `url("${String(card.image.url).replace(/["\\]/g, '')}")`;
    } else {
      element.style.backgroundImage = '';
    }
  }

  function applyDownloadState(cardId, button) {
    const value = state.downloadStates.get(cardId);
    button.classList.toggle('is-downloaded', value === 'done');
    button.classList.toggle('is-busy', value === 'busy');
    button.querySelector('.download-label').textContent = value === 'done' ? 'baixado' : (value === 'busy' ? 'baixando' : 'baixar');
  }

  function render() {
    elements.trackList.replaceChildren();
    const fragment = document.createDocumentFragment();
    state.project.cards.forEach((card, index) => {
      const node = elements.trackTemplate.content.firstElementChild.cloneNode(true);
      node.dataset.cardId = card.id;
      node.classList.toggle('is-selected', state.selectedId === card.id);
      node.classList.toggle('is-playing', state.current?.cardId === card.id && !state.current.paused);
      node.classList.toggle('is-cued', state.transitionTargetId === card.id);
      node.setAttribute('aria-label', `${card.title}. ${card.audio ? 'Toque para reproduzir.' : 'Sem música. Segure para selecionar.'}`);
      node.querySelector('.track-number').textContent = String(index + 1).padStart(2, '0');
      node.querySelector('.track-title').textContent = card.title;
      node.querySelector('.track-file').textContent = card.audio?.name || 'Segure 500 ms e pressione A para adicionar a música';
      setCardBackground(node.querySelector('.track-background'), card);

      const downloadButton = node.querySelector('.download-button');
      downloadButton.disabled = !card.audio;
      downloadButton.title = card.audio ? 'Baixar faixa para este aparelho' : 'Adicione uma música primeiro';
      applyDownloadState(card.id, downloadButton);
      downloadButton.addEventListener('click', (event) => {
        event.stopPropagation();
        downloadCard(card.id).catch((error) => showToast(error.message, true));
      });

      bindCardGestures(node, card.id);
      fragment.appendChild(node);
    });
    elements.trackList.appendChild(fragment);
    document.body.classList.toggle('has-playing-track', Boolean(state.current && !state.current.paused));
    updateSelectionPanel();
    updateDownloadAllState();
  }

  function bindCardGestures(element, cardId) {
    let timer = null;
    let startX = 0;
    let startY = 0;
    let longPressed = false;

    const cancelTimer = () => {
      window.clearTimeout(timer);
      timer = null;
    };

    element.addEventListener('pointerdown', (event) => {
      if (event.target.closest('button')) return;
      startX = event.clientX;
      startY = event.clientY;
      longPressed = false;
      timer = window.setTimeout(() => {
        longPressed = true;
        if (navigator.vibrate) navigator.vibrate(24);
        selectCard(cardId);
      }, LONG_PRESS_MS);
    });

    element.addEventListener('pointermove', (event) => {
      if (Math.hypot(event.clientX - startX, event.clientY - startY) > 12) cancelTimer();
    });

    element.addEventListener('pointerup', () => {
      const shouldPlay = Boolean(timer) && !longPressed;
      cancelTimer();
      if (shouldPlay) playCard(cardId).catch((error) => showToast(error.message, true));
    });
    element.addEventListener('pointercancel', cancelTimer);
    element.addEventListener('pointerleave', (event) => {
      if (event.pointerType === 'mouse') cancelTimer();
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
    showToast('Download concluído. Os botões ficaram verdes.');
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
        return context.decodeAudioData(bytes.slice(0));
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

  function clearTransitionTimers() {
    state.transitionTimers.forEach((timer) => window.clearTimeout(timer));
    state.transitionTimers = [];
  }

  function stopVoice(voice, when = state.audioContext?.currentTime || 0) {
    if (!voice?.source) return;
    voice.cancelled = true;
    try { voice.source.stop(when); } catch (_error) {}
  }

  async function startImmediately(card, buffer) {
    const context = await getAudioContext();
    const when = context.currentTime + 0.025;
    const voice = createVoice(card.id, buffer, when, 0, 0);
    voice.gain.gain.linearRampToValueAtTime(1, when + 0.12);
    state.current = voice;
    state.transitionTargetId = '';
    state.transitioning = false;
    render();
    setStatus(`No ar: “${card.title}”.`);
  }

  async function transitionTo(card, buffer) {
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
    }, Math.max(0, fadeSeconds * 1000 + 80));
    state.transitionTimers.push(activateTimer, finishTimer);
  }

  function pauseCurrent() {
    const voice = state.current;
    if (!voice || voice.paused || !state.audioContext) return;
    const now = state.audioContext.currentTime;
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
    if (!getCard(state.selectedId)) {
      showToast('Segure um container por 500 ms para selecioná-lo.', true);
      return;
    }
    (kind === 'audio' ? elements.audioInput : elements.imageInput).click();
  }

  function addCard() {
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
    const card = getCard(state.selectedId);
    if (!card) return;
    if (!window.confirm(`Remover o container “${card.title}” do musical?`)) return;
    if (state.current?.cardId === card.id) {
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
      const title = elements.trackList.querySelector(`[data-card-id="${CSS.escape(card.id)}"] .track-title`);
      if (title) title.textContent = card.title;
      queueProjectSave();
    });
    elements.titleInput.addEventListener('blur', () => saveProject().catch(() => {}));
    document.addEventListener('keydown', (event) => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
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
    try {
      const payload = await apiJson(`${API_ROOT}/project`);
      state.project = payload.project || { version: 1, cards: [] };
      if (!Array.isArray(state.project.cards) || !state.project.cards.length) {
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
