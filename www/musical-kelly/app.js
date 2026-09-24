(() => {
  'use strict';

  const API_ROOT = '/api/musical-kelly';
  const CACHE_NAME = 'playtalk-musical-kelly-media-v1';
  const PROJECT_SNAPSHOT_KEY = 'playtalk-musical-kelly-project-snapshot-v1';
  const COMMENTER_IDENTITY_KEY = 'playtalk-musical-kelly-commenter-v1';
  const COMMENT_SEEN_KEY = 'playtalk-musical-kelly-comment-seen-v1';
  const COMMENT_OUTBOX_DB_NAME = 'playtalk-musical-kelly-offline-v1';
  const COMMENT_OUTBOX_STORE = 'comment-outbox';
  const COMMENT_SYNC_TAG = 'musical-kelly-comments';
  const LONG_PRESS_MS = 500;
  const USE_NATIVE_AUDIO_ON_APPLE = isAppleTouchDevice();
  let commentOutboxDbPromise = null;

  const elements = {
    topbar: document.getElementById('topbar'),
    newAudioNotice: document.getElementById('newAudioNotice'),
    newAudioNoticeText: document.getElementById('newAudioNoticeText'),
    trackList: document.getElementById('trackList'),
    trackTemplate: document.getElementById('trackTemplate'),
    selectionPanel: document.getElementById('selectionPanel'),
    titleInput: document.getElementById('titleInput'),
    chooseAudioButton: document.getElementById('chooseAudioButton'),
    removeCardButton: document.getElementById('removeCardButton'),
    closeSelectionButton: document.getElementById('closeSelectionButton'),
    addCardButton: document.getElementById('addCardButton'),
    sortButton: document.getElementById('sortButton'),
    refreshButton: document.getElementById('refreshButton'),
    downloadAllButton: document.getElementById('downloadAllButton'),
    addCardDialog: document.getElementById('addCardDialog'),
    addCardForm: document.getElementById('addCardForm'),
    newCardTitle: document.getElementById('newCardTitle'),
    closeAddCardDialog: document.getElementById('closeAddCardDialog'),
    confirmAddCardButton: document.getElementById('confirmAddCardButton'),
    commentsDialog: document.getElementById('commentsDialog'),
    commentsDialogTitle: document.getElementById('commentsDialogTitle'),
    commentsList: document.getElementById('commentsList'),
    commenterIdentity: document.getElementById('commenterIdentity'),
    commenterIdentityText: document.getElementById('commenterIdentityText'),
    commentForm: document.getElementById('commentForm'),
    commentText: document.getElementById('commentText'),
    sendCommentButton: document.getElementById('sendCommentButton'),
    approveTrackButton: document.getElementById('approveTrackButton'),
    closeCommentsDialog: document.getElementById('closeCommentsDialog'),
    commentDetailDialog: document.getElementById('commentDetailDialog'),
    commentDetailTitle: document.getElementById('commentDetailTitle'),
    commentDetailAuthor: document.getElementById('commentDetailAuthor'),
    commentDetailText: document.getElementById('commentDetailText'),
    commentOwnerActions: document.getElementById('commentOwnerActions'),
    editCommentButton: document.getElementById('editCommentButton'),
    deleteCommentButton: document.getElementById('deleteCommentButton'),
    closeCommentDetailDialog: document.getElementById('closeCommentDetailDialog'),
    commentReplies: document.getElementById('commentReplies'),
    replyForm: document.getElementById('replyForm'),
    replyText: document.getElementById('replyText'),
    sendReplyButton: document.getElementById('sendReplyButton'),
    replyCommenterIdentity: document.getElementById('replyCommenterIdentity'),
    replyCommenterIdentityText: document.getElementById('replyCommenterIdentityText'),
    commenterNameDialog: document.getElementById('commenterNameDialog'),
    commenterNameForm: document.getElementById('commenterNameForm'),
    commenterNameInput: document.getElementById('commenterNameInput'),
    closeCommenterNameDialog: document.getElementById('closeCommenterNameDialog'),
    audioInput: document.getElementById('audioInput'),
    statusLine: document.getElementById('statusLine'),
    statusText: document.getElementById('statusText'),
    lyricsScreen: document.getElementById('lyricsScreen'),
    lyricsScreenTitle: document.getElementById('lyricsScreenTitle'),
    lyricsPreviousTrackButton: document.getElementById('lyricsPreviousTrackButton'),
    lyricsNextTrackButton: document.getElementById('lyricsNextTrackButton'),
    lyricsStage: document.getElementById('lyricsStage'),
    lyricsTrackLabel: document.getElementById('lyricsTrackLabel'),
    lyricsTrackLabelBackground: document.getElementById('lyricsTrackLabelBackground'),
    lyricsTrackLabelTitle: document.getElementById('lyricsTrackLabelTitle'),
    lyricsLines: document.getElementById('lyricsLines'),
    lyricsEmpty: document.getElementById('lyricsEmpty'),
    lyricsBackButton: document.getElementById('lyricsBackButton'),
    lyricsEditButton: document.getElementById('lyricsEditButton'),
    lyricsAdminPanel: document.getElementById('lyricsAdminPanel'),
    lyricsAdminTitle: document.getElementById('lyricsAdminTitle'),
    lyricsCloseEditor: document.getElementById('lyricsCloseEditor'),
    generatePlainLyrics: document.getElementById('generatePlainLyrics'),
    generateTimedLyrics: document.getElementById('generateTimedLyrics'),
    lyricsGenerationStatus: document.getElementById('lyricsGenerationStatus'),
    lyricsEditor: document.getElementById('lyricsEditor'),
    lyricsSaveButton: document.getElementById('lyricsSaveButton'),
    lyricsManualSyncButton: document.getElementById('lyricsManualSyncButton'),
    lyricsClearTimesyncButton: document.getElementById('lyricsClearTimesyncButton'),
    manualSyncPanel: document.getElementById('manualSyncPanel'),
    manualSyncProgress: document.getElementById('manualSyncProgress'),
    manualSyncInstruction: document.getElementById('manualSyncInstruction'),
    manualSyncAdvanceButton: document.getElementById('manualSyncAdvanceButton'),
    manualSyncCancelButton: document.getElementById('manualSyncCancelButton'),
    lyricsCharacterSwitch: document.getElementById('lyricsCharacterSwitch'),
    lyricsCharacterAvatar: document.getElementById('lyricsCharacterAvatar'),
    lyricsPlayer: document.getElementById('lyricsPlayer'),
    lyricsRewindButton: document.getElementById('lyricsRewindButton'),
    lyricsPlayButton: document.getElementById('lyricsPlayButton'),
    lyricsSeekSlider: document.getElementById('lyricsSeekSlider'),
    lyricsCurrentTime: document.getElementById('lyricsCurrentTime'),
    lyricsDuration: document.getElementById('lyricsDuration'),
    lyricsForwardButton: document.getElementById('lyricsForwardButton'),
    characterMenu: document.getElementById('characterMenu'),
    characterDialog: document.getElementById('characterDialog'),
    characterDialogTitle: document.getElementById('characterDialogTitle'),
    closeCharacterDialog: document.getElementById('closeCharacterDialog'),
    characterGrid: document.getElementById('characterGrid'),
    characterAddToggle: document.getElementById('characterAddToggle'),
    characterAddForm: document.getElementById('characterAddForm'),
    characterNameInput: document.getElementById('characterNameInput'),
    characterImageInput: document.getElementById('characterImageInput'),
    characterImageLabel: document.getElementById('characterImageLabel'),
    characterSaveButton: document.getElementById('characterSaveButton'),
    downloadPromptDialog: document.getElementById('downloadPromptDialog'),
    downloadPromptCopy: document.getElementById('downloadPromptCopy'),
    closeDownloadPrompt: document.getElementById('closeDownloadPrompt'),
    confirmTrackDownload: document.getElementById('confirmTrackDownload'),
    confirmTrackDownloadLabel: document.getElementById('confirmTrackDownloadLabel'),
    toast: document.getElementById('toast')
  };

  const state = {
    project: { version: 1, cards: [] },
    canEdit: false,
    canContribute: false,
    canComment: false,
    canApprove: false,
    canDeleteComments: false,
    canReorder: false,
    viewerUserId: 0,
    unreadCardIds: new Set(),
    characters: [],
    notificationRequests: new Set(),
    sortMode: false,
    sortingCardId: '',
    activeCommentsCardId: '',
    activeCommentId: '',
    collaborationBusy: false,
    pendingComments: [],
    commentSubmitting: false,
    commentFlushPromise: null,
    afterCommenterName: null,
    refreshing: false,
    selectedId: '',
    current: null,
    colorMode: 'idle',
    colorTimer: null,
    transitionFromId: '',
    transitionTargetId: '',
    transitionDurationMs: 0,
    transitioning: false,
    transitionTimers: [],
    autoAdvance: null,
    autoAdvanceGeneration: 0,
    audioContext: null,
    nativeAudio: null,
    nativeGeneration: 0,
    playRequestGeneration: 0,
    bufferPromises: new Map(),
    durations: new Map(),
    durationPromises: new Map(),
    downloadStates: new Map(),
    uploading: false,
    saveTimer: null,
    saveChain: Promise.resolve(),
    toastTimer: null,
    lyricsCardId: '',
    lyricsActiveLineIndex: -1,
    lyricsScrubbing: false,
    lyricsBusy: false,
    characterDialogMode: 'pov',
    characterMenuLineId: '',
    selectedCharacterId: '',
    downloadPromptCardId: '',
    downloadPromptBusy: false,
    povPlayback: null,
    manualSync: null,
    progressFrame: 0
  };

  function randomLocalId(prefix) {
    const value = window.crypto?.randomUUID
      ? window.crypto.randomUUID().replace(/-/g, '')
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
    return `${prefix}-${value}`.slice(0, 90);
  }

  function readCommenterIdentity({ create = true } = {}) {
    let identity = null;
    try { identity = JSON.parse(localStorage.getItem(COMMENTER_IDENTITY_KEY) || 'null'); } catch (_error) {}
    const valid = identity
      && /^[a-zA-Z0-9_-]{8,96}$/.test(String(identity.ownerId || ''))
      && String(identity.ownerToken || '').length >= 16;
    if (!valid && create) {
      identity = {
        ownerId: randomLocalId('person'),
        ownerToken: randomLocalId('secret'),
        name: ''
      };
      try { localStorage.setItem(COMMENTER_IDENTITY_KEY, JSON.stringify(identity)); } catch (_error) {}
    }
    if (!identity) return { ownerId: '', ownerToken: '', name: '' };
    return {
      ownerId: String(identity.ownerId || ''),
      ownerToken: String(identity.ownerToken || ''),
      name: String(identity.name || '').trim().slice(0, 64)
    };
  }

  function saveCommenterName(name) {
    const identity = readCommenterIdentity();
    identity.name = String(name || '').trim().slice(0, 64);
    try { localStorage.setItem(COMMENTER_IDENTITY_KEY, JSON.stringify(identity)); } catch (_error) {}
    syncCommenterIdentity();
    return identity;
  }

  function commenterRequestHeaders() {
    const identity = readCommenterIdentity();
    return {
      'X-Musical-Kelly-Commenter-Id': identity.ownerId,
      'X-Musical-Kelly-Commenter-Token': identity.ownerToken
    };
  }

  function syncCommenterIdentity() {
    const identity = readCommenterIdentity();
    const label = identity.name
      ? `Comentando como ${identity.name}`
      : 'Coloque seu nome para comentar';
    elements.commenterIdentityText.textContent = label;
    elements.replyCommenterIdentityText.textContent = label;
    elements.commenterIdentity.classList.toggle('has-name', Boolean(identity.name));
    elements.replyCommenterIdentity.classList.toggle('has-name', Boolean(identity.name));
  }

  function requireCommenterName(afterSave) {
    const identity = readCommenterIdentity();
    if (identity.name) return identity;
    state.afterCommenterName = typeof afterSave === 'function' ? afterSave : null;
    elements.commenterNameInput.value = '';
    showDialog(elements.commenterNameDialog);
    window.setTimeout(() => elements.commenterNameInput.focus(), 30);
    return null;
  }

  function readSeenCommentFingerprints() {
    try {
      const value = JSON.parse(localStorage.getItem(COMMENT_SEEN_KEY) || '{}');
      return value && typeof value === 'object' ? value : {};
    } catch (_error) {
      return {};
    }
  }

  function commentTotal(card) {
    return commentsForCard(card).reduce((total, comment) => total + 1 + (Array.isArray(comment.replies) ? comment.replies.length : 0), 0);
  }

  function commentFingerprint(card) {
    return commentsForCard(card).map((comment) => [
      comment.id,
      comment.updatedAt || comment.createdAt,
      ...(Array.isArray(comment.replies) ? comment.replies.map((reply) => `${reply.id}:${reply.updatedAt || reply.createdAt}`) : [])
    ].join(':')).join('|');
  }

  function hasUnseenComments(card) {
    if (!commentTotal(card)) return false;
    return readSeenCommentFingerprints()[card.id] !== commentFingerprint(card);
  }

  function markCommentsSeen(card) {
    if (!card) return;
    const seen = readSeenCommentFingerprints();
    seen[card.id] = commentFingerprint(card);
    try { localStorage.setItem(COMMENT_SEEN_KEY, JSON.stringify(seen)); } catch (_error) {}
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

  function saveProjectSnapshot(project) {
    try {
      localStorage.setItem(PROJECT_SNAPSHOT_KEY, JSON.stringify({
        savedAt: new Date().toISOString(),
        permissions: {
          canEdit: state.canEdit,
          canContribute: state.canContribute,
          canComment: state.canComment,
          canApprove: state.canApprove,
          canDeleteComments: state.canDeleteComments,
          canReorder: state.canReorder,
          viewerUserId: state.viewerUserId
        },
        characters: state.characters,
        project
      }));
    } catch (_error) {}
  }

  function readProjectSnapshot() {
    try {
      const snapshot = JSON.parse(localStorage.getItem(PROJECT_SNAPSHOT_KEY) || 'null');
      if (!snapshot?.project || !Array.isArray(snapshot.project.cards)) return null;
      return snapshot;
    } catch (_error) {
      return null;
    }
  }

  function normalizePendingComment(source) {
    const clientMutationId = String(source?.clientMutationId || '').trim();
    const cardId = String(source?.cardId || '').trim();
    const text = String(source?.text || '').trim().slice(0, 800);
    const authorName = String(source?.authorName || '').trim().slice(0, 64);
    const ownerId = String(source?.ownerId || '').trim().slice(0, 96);
    const ownerToken = String(source?.ownerToken || '').trim().slice(0, 256);
    if (!/^[a-zA-Z0-9_-]{8,64}$/.test(clientMutationId)) return null;
    if (!/^[a-zA-Z0-9_-]{1,80}$/.test(cardId) || !text || !authorName || !ownerId || ownerToken.length < 16) return null;
    const createdAt = new Date(source?.createdAt || '').toISOString();
    return { clientMutationId, cardId, text, authorName, ownerId, ownerToken, createdAt };
  }

  function openCommentOutboxDb() {
    if (commentOutboxDbPromise) return commentOutboxDbPromise;
    commentOutboxDbPromise = new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error('O armazenamento offline não está disponível neste navegador.'));
        return;
      }
      const request = window.indexedDB.open(COMMENT_OUTBOX_DB_NAME, 1);
      request.addEventListener('upgradeneeded', () => {
        if (!request.result.objectStoreNames.contains(COMMENT_OUTBOX_STORE)) {
          request.result.createObjectStore(COMMENT_OUTBOX_STORE, { keyPath: 'clientMutationId' });
        }
      });
      request.addEventListener('success', () => resolve(request.result));
      request.addEventListener('error', () => reject(request.error || new Error('Falha ao abrir a fila offline.')));
    }).catch((error) => {
      commentOutboxDbPromise = null;
      throw error;
    });
    return commentOutboxDbPromise;
  }

  async function readPendingComments() {
    const database = await openCommentOutboxDb();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(COMMENT_OUTBOX_STORE, 'readonly');
      const request = transaction.objectStore(COMMENT_OUTBOX_STORE).getAll();
      request.addEventListener('success', () => {
        const comments = (Array.isArray(request.result) ? request.result : [])
          .map((entry) => {
            try {
              return normalizePendingComment(entry);
            } catch (_error) {
              return null;
            }
          })
          .filter(Boolean)
          .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
        resolve(comments);
      });
      request.addEventListener('error', () => reject(request.error || new Error('Falha ao ler a fila offline.')));
    });
  }

  async function storePendingComment(comment) {
    const normalized = normalizePendingComment(comment);
    if (!normalized) throw new Error('Comentário offline inválido.');
    const database = await openCommentOutboxDb();
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(COMMENT_OUTBOX_STORE, 'readwrite');
      transaction.objectStore(COMMENT_OUTBOX_STORE).put(normalized);
      transaction.addEventListener('complete', resolve);
      transaction.addEventListener('error', () => reject(transaction.error || new Error('Falha ao guardar o comentário.')));
      transaction.addEventListener('abort', () => reject(transaction.error || new Error('Falha ao guardar o comentário.')));
    });
    return normalized;
  }

  async function deletePendingComment(clientMutationId) {
    const database = await openCommentOutboxDb();
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(COMMENT_OUTBOX_STORE, 'readwrite');
      transaction.objectStore(COMMENT_OUTBOX_STORE).delete(clientMutationId);
      transaction.addEventListener('complete', resolve);
      transaction.addEventListener('error', () => reject(transaction.error || new Error('Falha ao atualizar a fila offline.')));
      transaction.addEventListener('abort', () => reject(transaction.error || new Error('Falha ao atualizar a fila offline.')));
    });
  }

  async function reloadPendingComments({ renderNow = true } = {}) {
    state.pendingComments = await readPendingComments();
    if (renderNow && Array.isArray(state.project?.cards)) {
      render();
      if (state.activeCommentsCardId && elements.commentsDialog.hasAttribute('open')) renderComments();
    }
    return state.pendingComments;
  }

  function pendingCommentsForCard(cardId) {
    return state.pendingComments
      .filter((comment) => comment.cardId === cardId)
      .map((comment) => ({
        id: `pending-${comment.clientMutationId}`,
        clientMutationId: comment.clientMutationId,
        authorName: comment.authorName || 'Você',
        ownerId: comment.ownerId,
        title: 'Enviando comentário',
        text: comment.text,
        createdAt: comment.createdAt,
        replies: [],
        pending: true
      }));
  }

  function commentsForCard(card) {
    const savedComments = Array.isArray(card?.comments) ? card.comments : [];
    const savedIds = new Set(savedComments.map((comment) => comment.id));
    return [
      ...savedComments,
      ...pendingCommentsForCard(card?.id)
        .filter((comment) => !savedIds.has(`comment-${comment.clientMutationId}`))
    ];
  }

  function createCommentMutationId() {
    const randomPart = window.crypto?.randomUUID
      ? window.crypto.randomUUID().replace(/-/g, '')
      : `${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
    return `offline-${Date.now().toString(36)}-${randomPart}`.slice(0, 64);
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
      updatedAt: state.project.updatedAt,
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
        } : null,
        createdByUserId: card.createdByUserId,
        createdByName: card.createdByName,
        createdAt: card.createdAt,
        publishedAt: card.publishedAt,
        approvedAt: card.approvedAt,
        approvedByUserId: card.approvedByUserId,
        approvedByName: card.approvedByName,
        comments: Array.isArray(card.comments) ? card.comments.map((comment) => ({
          id: comment.id,
          userId: comment.userId,
          authorName: comment.authorName,
          text: comment.text,
          createdAt: comment.createdAt
        })) : []
      }))
    };
  }

  function saveProject({ quiet = true } = {}) {
    if (!state.canEdit) return Promise.reject(new Error('Somente o administrador pode editar esta página.'));
    window.clearTimeout(state.saveTimer);
    const operation = state.saveChain.then(async () => {
      const payload = projectForSave();
      if (!quiet) setStatus('Salvando no R2…', true);
      const response = await apiJson(`${API_ROOT}/project`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (response?.project?.updatedAt) state.project.updatedAt = response.project.updatedAt;
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
    const seed = `${card?.id || ''}:${card?.title || ''}`;
    let hash = 0;
    for (let index = 0; index < seed.length; index += 1) hash = ((hash << 5) - hash + seed.charCodeAt(index)) | 0;
    const hue = 138 + (Math.abs(hash) % 46);
    element.style.setProperty('--track-hue', String(hue));
    element.style.backgroundImage = [
      `radial-gradient(circle at 18% 28%, hsla(${hue}, 68%, 48%, .34), transparent 34%)`,
      `linear-gradient(118deg, hsl(${hue}, 46%, 21%) 0%, hsl(${hue + 8}, 43%, 12%) 58%, #07100c 100%)`
    ].join(', ');
    element.style.removeProperty('--track-image');
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

  function syncNewAudioNotice() {
    const count = state.canEdit ? 0 : state.unreadCardIds.size;
    elements.newAudioNotice.hidden = count === 0;
    elements.newAudioNoticeText.textContent = count === 1
      ? 'Você tem 1 novo áudio'
      : `Você tem ${count} novos áudios`;
  }

  function markCardNotificationSeen(cardId) {
    if (state.canEdit || !state.unreadCardIds.has(cardId) || state.notificationRequests.has(cardId)) return;
    state.unreadCardIds.delete(cardId);
    state.notificationRequests.add(cardId);
    const cardElement = elements.trackList.querySelector(`[data-card-id="${CSS.escape(cardId)}"]`);
    cardElement?.classList.remove('has-new-audio');
    const badge = cardElement?.querySelector('.new-audio-badge');
    if (badge) badge.hidden = true;
    syncNewAudioNotice();
    apiJson(`${API_ROOT}/notifications/seen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardId })
    }).then((payload) => {
      if (Array.isArray(payload.unreadCardIds)) {
        state.unreadCardIds = new Set(payload.unreadCardIds);
        render();
      }
    }).catch(() => {
      state.unreadCardIds.add(cardId);
      render();
    }).finally(() => {
      state.notificationRequests.delete(cardId);
    });
  }

  function render() {
    elements.trackList.replaceChildren();
    const fragment = document.createDocumentFragment();
    state.project.cards.forEach((card) => {
      const node = elements.trackTemplate.content.firstElementChild.cloneNode(true);
      node.dataset.cardId = card.id;
      node.draggable = state.sortMode;
      const isPlaying = state.current?.cardId === card.id && !state.current.paused;
      const isFadingOut = state.transitioning && state.transitionFromId === card.id;
      const isFadingIn = state.transitioning && state.transitionTargetId === card.id;
      node.classList.toggle('is-selected', state.selectedId === card.id);
      node.classList.toggle('is-playing', isPlaying);
      node.classList.toggle('is-cued', state.transitionTargetId === card.id);
      node.classList.toggle('is-color-revealing', isPlaying && state.colorMode === 'revealing');
      node.classList.toggle('is-color-full', isPlaying && state.colorMode === 'full');
      node.classList.toggle('is-fading-out', isFadingOut);
      node.classList.toggle('is-fading-in', isFadingIn);
      const isUnread = !state.canEdit && state.unreadCardIds.has(card.id);
      node.classList.toggle('has-new-audio', isUnread);
      if (isFadingOut || isFadingIn) {
        node.style.setProperty('--transition-ms', `${Math.max(80, state.transitionDurationMs)}ms`);
      }
      node.setAttribute('aria-label', `${card.title}. ${card.audio ? 'Toque para reproduzir.' : 'Sem música.'}`);
      setCardBackground(node.querySelector('.track-background'), card);
      node.querySelector('.track-title-text').textContent = card.title;

      const durationLabel = node.querySelector('.track-duration');
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
      const newAudioBadge = downloadButton.querySelector('.new-audio-badge');
      newAudioBadge.hidden = !isUnread;
      downloadButton.disabled = false;
      downloadButton.classList.toggle('is-delete', !card.audio);
      if (card.audio) {
        applyDownloadState(card.id, downloadButton);
      } else {
        downloadButton.title = 'Excluir container vazio';
        downloadButton.setAttribute('aria-label', `Excluir container vazio: ${card.title}`);
      }
      downloadButton.addEventListener('click', (event) => {
        event.stopPropagation();
        if (!card.audio) {
          deleteEmptyCard(card.id, downloadButton).catch((error) => showToast(error.message, true));
          return;
        }
        const action = state.downloadStates.get(card.id) === 'done'
          ? openLyricsAndPlay(card.id)
          : downloadCard(card.id);
        action.catch((error) => showToast(error.message, true));
      });

      const commentButton = node.querySelector('.comment-button');
      const isApproved = Boolean(card.approvedAt);
      commentButton.classList.toggle('is-approved', isApproved);
      const commentCount = commentTotal(card);
      const hasUnreadComments = hasUnseenComments(card);
      commentButton.classList.toggle('has-unseen-comments', hasUnreadComments);
      const commentCountLabel = commentButton.querySelector('.comment-count');
      commentCountLabel.hidden = commentCount === 0;
      commentCountLabel.textContent = commentCount > 99 ? '99+' : String(commentCount);
      commentButton.title = commentCount
          ? `${commentCount} comentário${commentCount === 1 ? '' : 's'}`
          : 'Comentários';
      commentButton.setAttribute('aria-label', `${commentButton.title} de ${card.title}`);
      commentButton.addEventListener('click', (event) => {
        event.stopPropagation();
        openComments(card.id);
      });

      const lyricsButton = node.querySelector('.lyrics-button');
      lyricsButton.classList.toggle('has-lyrics', Boolean(card.lyrics?.lines?.length));
      lyricsButton.title = card.lyrics?.lines?.length ? 'Abrir letra' : 'Letra ainda não disponível';
      lyricsButton.setAttribute('aria-label', `${lyricsButton.title}: ${card.title}`);
      lyricsButton.addEventListener('click', (event) => {
        event.stopPropagation();
        openLyrics(card.id);
      });

      bindCardGestures(node, card.id);
      if (state.sortMode) bindSortGestures(node, card.id);
      fragment.appendChild(node);
    });
    elements.trackList.appendChild(fragment);
    document.body.classList.toggle('has-playing-track', Boolean(state.current && !state.current.paused));
    document.body.classList.toggle('is-sorting', state.sortMode);
    elements.topbar.hidden = false;
    elements.addCardButton.hidden = !state.canContribute;
    elements.sortButton.hidden = !state.canReorder;
    elements.sortButton.classList.toggle('is-active', state.sortMode);
    elements.sortButton.setAttribute('aria-label', state.sortMode ? 'Concluir alteração da ordem' : 'Ativar modo de alterar ordem');
    elements.sortButton.title = state.sortMode ? 'Concluir e salvar ordem' : 'Alterar ordem dos containers';
    updateSelectionPanel();
    updateDownloadAllState();
    updatePlayerBar();
    syncNewAudioNotice();
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
      if (state.sortMode) return;
      if (event.target.closest('button')) return;
      startX = event.clientX;
      startY = event.clientY;
      longPressed = false;
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
        cancelTimer();
      }
    });

    element.addEventListener('pointerup', () => {
      cancelTimer();
    });
    element.addEventListener('pointercancel', () => {
      cancelTimer();
    });
    element.addEventListener('pointerleave', (event) => {
      if (event.pointerType === 'mouse') {
        cancelTimer();
      }
    });
    element.addEventListener('contextmenu', (event) => event.preventDefault());
    element.addEventListener('click', (event) => {
      if (state.sortMode) {
        event.preventDefault();
        return;
      }
      if (event.target.closest('button')) return;
      if (longPressed) {
        longPressed = false;
        return;
      }
      openLyricsAndPlay(cardId).catch((error) => showToast(error.message, true));
    });
    element.addEventListener('keydown', (event) => {
      if (state.sortMode) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openLyricsAndPlay(cardId).catch((error) => showToast(error.message, true));
      }
    });
  }

  function selectCard(cardId) {
    if (!state.canEdit) return;
    state.selectedId = cardId;
    render();
    setStatus('Container selecionado. Use A para adicionar ou trocar a música.');
  }

  function showDialog(dialog) {
    if (!dialog) return;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }

  function closeDialog(dialog) {
    if (!dialog) return;
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
  }

  function setDownloadPromptBusy(busy) {
    state.downloadPromptBusy = Boolean(busy);
    elements.confirmTrackDownload.disabled = state.downloadPromptBusy;
    elements.closeDownloadPrompt.disabled = state.downloadPromptBusy;
    elements.confirmTrackDownload.classList.toggle('is-busy', state.downloadPromptBusy);
    elements.confirmTrackDownloadLabel.textContent = state.downloadPromptBusy ? 'Baixando…' : 'Download';
  }

  function openDownloadPrompt(cardId) {
    const card = getCard(cardId);
    if (!card?.audio) return;
    state.downloadPromptCardId = card.id;
    elements.downloadPromptCopy.textContent = `Baixe “${card.title}” para levar o áudio, o rótulo da faixa e as imagens dos personagens usados nela para este aparelho.`;
    setDownloadPromptBusy(false);
    if (!elements.downloadPromptDialog.hasAttribute('open')) showDialog(elements.downloadPromptDialog);
  }

  function closeDownloadPrompt() {
    if (state.downloadPromptBusy) return;
    state.downloadPromptCardId = '';
    closeDialog(elements.downloadPromptDialog);
  }

  async function downloadPromptTrack() {
    if (state.downloadPromptBusy) return;
    const cardId = state.downloadPromptCardId;
    const card = getCard(cardId);
    if (!card?.audio) {
      closeDownloadPrompt();
      return;
    }
    setDownloadPromptBusy(true);
    try {
      await downloadCard(card.id);
      closeDialog(elements.downloadPromptDialog);
      state.downloadPromptCardId = '';
      showToast('Faixa pronta para ensaiar neste aparelho.');
      await openLyricsAndPlay(card.id);
    } finally {
      setDownloadPromptBusy(false);
    }
  }

  async function ensureCardDownloadedForPlayback(card) {
    if (!card?.audio) return false;
    const downloaded = await isCardCached(card).catch(() => false);
    state.downloadStates.set(card.id, downloaded ? 'done' : 'idle');
    if (downloaded) return true;
    openDownloadPrompt(card.id);
    return false;
  }

  function characterById(characterId) {
    return state.characters.find((character) => character.id === characterId) || null;
  }

  function lyricLineLabel(line) {
    const speaker = String(line?.speaker || '').trim();
    return speaker ? `${speaker}: ${line.text}` : String(line?.text || '').trim();
  }

  function openLyrics(cardId) {
    const card = getCard(cardId);
    if (!card) return;
    state.lyricsCardId = cardId;
    state.lyricsActiveLineIndex = -1;
    state.selectedCharacterId = '';
    elements.lyricsScreen.hidden = false;
    document.body.classList.add('lyrics-open');
    if (state.current?.cardId === cardId) cancelAutoAdvance();
    renderLyricsScreen();
    if (card.audio) loadCardDuration(card).then(updateLyricsPlayer).catch(() => {});
    if (state.canEdit && !card.lyrics?.lines?.length) openLyricsEditor();
  }

  async function openLyricsAndPlay(cardId) {
    const card = getCard(cardId);
    if (!card?.audio) {
      selectCard(cardId);
      showToast('Este container ainda não tem música. Pressione A para adicionar.', true);
      return;
    }
    if (!await ensureCardDownloadedForPlayback(card)) return;
    openLyrics(cardId);
    if (state.current?.cardId === card.id && !state.current.paused) {
      cancelAutoAdvance();
      return;
    }
    await toggleLyricsPlayback();
  }

  function closeLyrics() {
    cancelManualSync({ pause: false });
    cancelPovPlayback({ pause: true });
    const current = state.current;
    elements.lyricsScreen.hidden = true;
    elements.lyricsAdminPanel.hidden = true;
    elements.characterMenu.hidden = true;
    document.body.classList.remove('lyrics-open');
    state.lyricsCardId = '';
    state.selectedCharacterId = '';
    state.lyricsActiveLineIndex = -1;
    cancelAutoAdvance();
    if (current && !current.paused) pauseCurrent();
  }

  function openLyricsEditor() {
    if (!state.canEdit) return;
    const card = getCard(state.lyricsCardId);
    if (!card) return;
    elements.lyricsAdminTitle.textContent = card.lyrics?.lines?.length ? 'Corrigir ou recriar' : 'Criar letra';
    elements.lyricsEditor.value = (card.lyrics?.lines || []).map(lyricLineLabel).join('\n');
    elements.lyricsClearTimesyncButton.hidden = card.lyrics?.mode !== 'timesync';
    elements.lyricsAdminPanel.hidden = false;
  }

  function renderLyricsScreen() {
    const card = getCard(state.lyricsCardId);
    if (!card) {
      closeLyrics();
      return;
    }
    const playableCards = state.project.cards.filter((entry) => entry.audio?.fileName);
    const playableIndex = playableCards.findIndex((entry) => entry.id === card.id);
    const trackNumber = playableIndex >= 0 ? playableIndex + 1 : 1;
    const trackTotal = Math.max(1, playableCards.length);
    elements.lyricsScreenTitle.textContent = `Faixa ${trackNumber} de ${trackTotal}`;
    setCardBackground(elements.lyricsTrackLabelBackground, card);
    elements.lyricsTrackLabelTitle.textContent = card.title;
    elements.lyricsPreviousTrackButton.disabled = Boolean(state.manualSync) || playableIndex <= 0;
    elements.lyricsNextTrackButton.disabled = Boolean(state.manualSync)
      || playableIndex < 0
      || playableIndex >= playableCards.length - 1;
    elements.lyricsEditButton.hidden = !state.canEdit;
    const selectedCharacter = characterById(state.selectedCharacterId);
    const characterControlLabel = selectedCharacter
      ? `Ponto de vista: ${selectedCharacter.name}`
      : 'Escolher ponto de vista';
    elements.lyricsCharacterSwitch.setAttribute('aria-label', characterControlLabel);
    elements.lyricsCharacterSwitch.title = characterControlLabel;
    elements.lyricsCharacterAvatar.classList.toggle('has-image', Boolean(selectedCharacter));
    elements.lyricsCharacterAvatar.style.backgroundImage = selectedCharacter
      ? `url("${String(selectedCharacter.imageUrl).replace(/["\\]/g, '')}")`
      : '';
    const lines = Array.isArray(card.lyrics?.lines) ? card.lyrics.lines : [];
    elements.lyricsEmpty.hidden = lines.length > 0;
    elements.lyricsLines.hidden = lines.length === 0;
    elements.lyricsLines.replaceChildren();
    lines.forEach((line, index) => {
      const character = characterById(line.characterId);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'lyric-line';
      button.dataset.lineId = line.id;
      button.dataset.lineIndex = String(index);
      button.classList.toggle('is-pov-muted', Boolean(state.selectedCharacterId && line.characterId !== state.selectedCharacterId));
      button.classList.toggle('is-sync-past', Boolean(state.manualSync && index < state.manualSync.lineIndex - 1));
      button.classList.toggle('is-sync-recorded', Boolean(state.manualSync && index === state.manualSync.lineIndex - 1));
      button.classList.toggle('is-sync-target', Boolean(state.manualSync && index === state.manualSync.lineIndex));

      const avatar = document.createElement('span');
      avatar.className = `lyric-character-avatar${character ? '' : ' is-empty'}`;
      if (character) avatar.style.backgroundImage = `url("${String(character.imageUrl).replace(/["\\]/g, '')}")`;
      const copy = document.createElement('span');
      copy.className = 'lyric-copy';
      const visibleSpeaker = character?.name || line.speaker;
      if (visibleSpeaker) {
        const speaker = document.createElement('small');
        speaker.textContent = visibleSpeaker;
        copy.appendChild(speaker);
      }
      const text = document.createElement('span');
      text.textContent = line.text;
      copy.appendChild(text);
      button.append(avatar, copy);
      let characterPressTimer = null;
      let characterLongPressed = false;
      let characterPressX = 0;
      let characterPressY = 0;
      button.addEventListener('click', () => {
        if (characterLongPressed) {
          characterLongPressed = false;
          return;
        }
        if (state.manualSync) return;
        seekToLyricLine(index).catch((error) => showToast(error.message, true));
      });
      if (state.canEdit && !state.manualSync) {
        button.addEventListener('pointerdown', (event) => {
          characterLongPressed = false;
          characterPressX = event.clientX;
          characterPressY = event.clientY;
          characterPressTimer = window.setTimeout(() => {
            characterLongPressed = true;
            if (navigator.vibrate) navigator.vibrate(20);
            const rect = button.getBoundingClientRect();
            openCharacterMenu(line.id, event.clientX || rect.left + rect.width / 2, event.clientY || rect.top + rect.height / 2);
          }, LONG_PRESS_MS);
        });
        button.addEventListener('pointermove', (event) => {
          if (Math.hypot(event.clientX - characterPressX, event.clientY - characterPressY) > 12) {
            window.clearTimeout(characterPressTimer);
          }
        });
        ['pointerup', 'pointercancel', 'pointerleave'].forEach((eventName) => {
          button.addEventListener(eventName, () => window.clearTimeout(characterPressTimer));
        });
        button.addEventListener('contextmenu', (event) => {
          event.preventDefault();
          window.clearTimeout(characterPressTimer);
          openCharacterMenu(line.id, event.clientX, event.clientY);
        });
      }
      elements.lyricsLines.appendChild(button);
    });
    if (state.canEdit && !elements.lyricsAdminPanel.hidden) openLyricsEditor();
    updateManualSyncPanel();
    updateLyricsPlayer();
  }

  function setActiveLyricLine(index) {
    if (state.lyricsActiveLineIndex === index) return;
    state.lyricsActiveLineIndex = index;
    elements.lyricsLines.querySelectorAll('.lyric-line').forEach((line, lineIndex) => {
      line.classList.toggle('is-active', lineIndex === index);
    });
    if (index >= 0) {
      elements.lyricsLines.querySelector(`[data-line-index="${index}"]`)
        ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }

  function currentLyricsPosition() {
    return state.current?.cardId === state.lyricsCardId ? currentPosition(state.current) : 0;
  }

  function updateLyricsPlayer() {
    if (elements.lyricsScreen.hidden) return;
    const card = getCard(state.lyricsCardId);
    if (!card) return;
    const isCurrent = state.current?.cardId === card.id;
    const duration = isCurrent
      ? Math.max(0, Number(state.current?.buffer?.duration) || 0)
      : Math.max(0, Number(state.durations.get(card.audio?.fileName)) || 0);
    const position = isCurrent ? Math.min(duration || Infinity, currentPosition(state.current)) : 0;
    if (state.manualSync && isCurrent) state.manualSync.lastPosition = position;
    if (!state.lyricsScrubbing) elements.lyricsSeekSlider.value = String(position);
    elements.lyricsSeekSlider.max = String(Math.max(0.01, duration));
    elements.lyricsSeekSlider.disabled = !card.audio || duration <= 0;
    elements.lyricsCurrentTime.textContent = formatTime(state.lyricsScrubbing ? elements.lyricsSeekSlider.value : position);
    elements.lyricsDuration.textContent = formatTime(duration);
    const isPlaying = isCurrent && !state.current.paused;
    elements.lyricsPlayButton.classList.toggle('is-playing', isPlaying);
    elements.lyricsPlayButton.setAttribute('aria-label', isPlaying ? 'Pausar' : 'Reproduzir');
    elements.lyricsRewindButton.disabled = Boolean(state.manualSync) || !isCurrent || duration <= 0;
    elements.lyricsForwardButton.disabled = Boolean(state.manualSync) || !isCurrent || duration <= 0;
    elements.lyricsSeekSlider.disabled = Boolean(state.manualSync) || !card.audio || duration <= 0;
    const lines = Array.isArray(card.lyrics?.lines) ? card.lyrics.lines : [];
    if (state.manualSync) {
      setActiveLyricLine(-1);
    } else if (card.lyrics?.mode === 'timesync' && isCurrent) {
      let activeIndex = -1;
      for (let index = 0; index < lines.length; index += 1) {
        if (position >= Number(lines[index].start)) activeIndex = index;
        else break;
      }
      setActiveLyricLine(activeIndex);
    } else if (!isCurrent) {
      setActiveLyricLine(-1);
    }
  }

  async function ensureLyricsCardAt(card, position, { play = true } = {}) {
    if (!card?.audio) throw new Error('Este container ainda não tem música.');
    if (!await ensureCardDownloadedForPlayback(card)) return false;
    if (state.current?.cardId !== card.id) {
      await playCard(card.id);
    } else if (play && state.current.paused) {
      await resumeCurrent();
    }
    await seekTo(position);
    cancelAutoAdvance();
    return true;
  }

  function updateManualSyncPanel() {
    const sync = state.manualSync;
    elements.manualSyncPanel.hidden = !sync;
    elements.lyricsScreen.classList.toggle('is-manual-sync', Boolean(sync));
    if (!sync) return;
    const card = getCard(sync.cardId);
    const lines = Array.isArray(card?.lyrics?.lines) ? card.lyrics.lines : [];
    const completed = Math.min(sync.lineIndex, lines.length);
    elements.manualSyncProgress.textContent = sync.saving
      ? 'Salvando marcações…'
      : `${completed} de ${lines.length} linhas marcadas`;
    elements.manualSyncInstruction.textContent = sync.saving
      ? 'Aguarde só um instante.'
      : sync.lineIndex >= lines.length
        ? 'Salvando o novo timesync no R2…'
        : `Quando começar “${String(lines[sync.lineIndex]?.text || '').slice(0, 70)}”, toque em ↓.`;
    elements.manualSyncAdvanceButton.disabled = sync.saving;
    elements.manualSyncCancelButton.disabled = sync.saving;
  }

  function cancelManualSync({ pause = true } = {}) {
    if (!state.manualSync) return;
    state.manualSync = null;
    elements.manualSyncPanel.hidden = true;
    elements.lyricsScreen.classList.remove('is-manual-sync');
    if (pause && state.current && !state.current.paused) pauseCurrent();
    if (!elements.lyricsScreen.hidden) renderLyricsScreen();
    setStatus('Sync manual cancelado. Nenhuma marcação foi alterada.');
  }

  async function startManualSync() {
    if (!state.canEdit || state.lyricsBusy || state.manualSync) return;
    const cardBeforeSave = getCard(state.lyricsCardId);
    if (!cardBeforeSave?.audio) throw new Error('Adicione o áudio antes de sincronizar.');
    if (!await ensureCardDownloadedForPlayback(cardBeforeSave)) return;
    await saveLyricsEdits({ closeEditor: false, announce: false });
    const card = getCard(state.lyricsCardId);
    const lines = Array.isArray(card?.lyrics?.lines) ? card.lyrics.lines : [];
    if (!lines.length) throw new Error('Escreva ao menos uma linha da letra.');
    cancelPovPlayback({ pause: true });
    state.selectedCharacterId = '';
    state.lyricsBusy = true;
    elements.lyricsManualSyncButton.disabled = true;
    setStatus(`Abrindo o áudio atual de “${card.title}” direto do R2…`, true);
    try {
      await startManualSyncR2Audio(card);
    } finally {
      state.lyricsBusy = false;
      elements.lyricsManualSyncButton.disabled = false;
    }
    state.manualSync = {
      cardId: card.id,
      lineIndex: 0,
      marks: [],
      lastPosition: 0,
      saving: false
    };
    elements.lyricsAdminPanel.hidden = true;
    renderLyricsScreen();
    setStatus(`Sincronizando “${card.title}” com o áudio atual do R2.`, true);
    showToast('Sync manual iniciado. Use ↓ a cada nova linha.');
  }

  async function advanceManualSync() {
    const sync = state.manualSync;
    const card = getCard(sync?.cardId);
    const lines = Array.isArray(card?.lyrics?.lines) ? card.lyrics.lines : [];
    if (!sync || !card || sync.saving) return;
    const livePosition = state.current?.cardId === card.id
      ? currentPosition(state.current)
      : sync.lastPosition;
    const position = Math.max(0, Number(livePosition) || Number(sync.lastPosition) || 0);
    sync.lastPosition = position;
    if (sync.lineIndex < lines.length) {
      const recordedLineIndex = sync.lineIndex;
      const previous = sync.marks[sync.marks.length - 1];
      sync.marks.push(previous == null ? position : Math.max(position, previous + 0.01));
      sync.lineIndex += 1;
      if (sync.lineIndex < lines.length) {
        renderLyricsScreen();
        elements.lyricsLines.querySelector(`[data-line-index="${recordedLineIndex}"]`)
          ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        return;
      }
    }
    if (sync.marks.length !== lines.length) return;
    const audioDuration = Math.max(
      0,
      Number(state.current?.cardId === card.id ? state.current?.buffer?.duration : 0) || 0,
      Number(state.durations.get(card.audio?.fileName)) || 0
    );
    const finalEnd = Math.max(audioDuration, position, sync.marks[sync.marks.length - 1] + 0.1);
    const timings = lines.map((line, index) => ({
      lineId: line.id,
      start: sync.marks[index],
      end: index + 1 < sync.marks.length ? sync.marks[index + 1] : finalEnd
    }));
    sync.saving = true;
    updateManualSyncPanel();
    try {
      await apiJson(`${API_ROOT}/cards/${encodeURIComponent(card.id)}/lyrics/timesync`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timings })
      });
      const verification = await apiJson(`${API_ROOT}/project?timesync=${encodeURIComponent(`${card.id}-${Date.now()}`)}`, {
        cache: 'no-store'
      });
      const verifiedCard = verification.project?.cards?.find((entry) => entry.id === card.id);
      const verifiedLines = Array.isArray(verifiedCard?.lyrics?.lines) ? verifiedCard.lyrics.lines : [];
      const timingsPersisted = verifiedCard?.lyrics?.mode === 'timesync'
        && verifiedLines.length === timings.length
        && timings.every((timing, index) => (
          verifiedLines[index]?.id === timing.lineId
          && Math.abs(Number(verifiedLines[index]?.start) - timing.start) < 0.002
          && Math.abs(Number(verifiedLines[index]?.end) - timing.end) < 0.002
        ));
      if (!timingsPersisted) throw new Error('O R2 não confirmou o novo timesync. As marcações continuam abertas para tentar novamente.');
      applyCollaborationProject(verification.project);
      state.manualSync = null;
      elements.manualSyncPanel.hidden = true;
      elements.lyricsScreen.classList.remove('is-manual-sync');
      if (state.current && !state.current.paused) pauseCurrent();
      renderLyricsScreen();
      setStatus(`Timesync de “${card.title}” salvo e confirmado no R2.`);
      showToast('Timesync manual salvo com sucesso.');
    } catch (error) {
      sync.saving = false;
      updateManualSyncPanel();
      setStatus('O novo timesync ainda não foi confirmado no R2.');
      throw error;
    }
  }

  async function clearLyricsTimesync() {
    if (!state.canEdit || state.lyricsBusy || state.manualSync) return;
    const card = getCard(state.lyricsCardId);
    if (!card?.lyrics?.lines?.length || card.lyrics.mode !== 'timesync') return;
    const confirmed = window.confirm('Excluir todo o timesync desta faixa? A letra e os personagens serão mantidos.');
    if (!confirmed) return;
    await saveLyricsEdits({ closeEditor: false, announce: false });
    state.lyricsBusy = true;
    elements.lyricsClearTimesyncButton.disabled = true;
    try {
      const payload = await apiJson(`${API_ROOT}/cards/${encodeURIComponent(card.id)}/lyrics/timesync`, {
        method: 'DELETE'
      });
      applyCollaborationProject(payload.project);
      openLyricsEditor();
      showToast('Timesync excluído. A letra e os personagens foram mantidos.');
    } finally {
      state.lyricsBusy = false;
      elements.lyricsClearTimesyncButton.disabled = false;
    }
  }

  async function seekToLyricLine(index) {
    const card = getCard(state.lyricsCardId);
    const line = card?.lyrics?.lines?.[index];
    if (!card || !line) return;
    if (card.lyrics.mode !== 'timesync' || !Number.isFinite(Number(line.start))) {
      showToast('Esta letra foi criada sem timesync. O admin pode gerar a versão sincronizada.');
      return;
    }
    if (state.selectedCharacterId) {
      if (line.characterId !== state.selectedCharacterId) {
        showToast('Este trecho pertence a outro personagem.');
        return;
      }
      const clips = buildPovClips(card, state.selectedCharacterId);
      const clipIndex = clips.findIndex((clip) => Number(line.start) >= clip.start && Number(line.start) <= clip.end);
      await startPovPlayback(card, state.selectedCharacterId, Math.max(0, clipIndex), Number(line.start));
      return;
    }
    cancelPovPlayback();
    await ensureLyricsCardAt(card, Number(line.start));
  }

  function openCharacterMenu(lineId, clientX, clientY) {
    if (!state.canEdit) return;
    state.characterMenuLineId = lineId;
    elements.characterMenu.replaceChildren();
    state.characters.forEach((character) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('role', 'menuitem');
      const image = document.createElement('img');
      image.src = character.imageUrl;
      image.alt = '';
      const label = document.createElement('span');
      label.textContent = character.name;
      button.append(image, label);
      button.addEventListener('click', () => assignCharacterToLine(lineId, character.id));
      elements.characterMenu.appendChild(button);
    });
    const addButton = document.createElement('button');
    addButton.type = 'button';
    addButton.setAttribute('role', 'menuitem');
    addButton.textContent = '＋ Adicionar personagem';
    addButton.addEventListener('click', () => {
      elements.characterMenu.hidden = true;
      openCharacterDialog('add');
    });
    elements.characterMenu.appendChild(addButton);
    const clearButton = document.createElement('button');
    clearButton.type = 'button';
    clearButton.textContent = 'Sem personagem';
    clearButton.addEventListener('click', () => assignCharacterToLine(lineId, ''));
    if (state.characters.length) elements.characterMenu.appendChild(clearButton);
    elements.characterMenu.hidden = false;
    const width = 280;
    elements.characterMenu.style.left = `${Math.max(8, Math.min(clientX, window.innerWidth - width - 8))}px`;
    elements.characterMenu.style.top = `${Math.max(8, Math.min(clientY, window.innerHeight - 260))}px`;
  }

  async function assignCharacterToLine(lineId, characterId) {
    const card = getCard(state.lyricsCardId);
    if (!card) return;
    elements.characterMenu.hidden = true;
    state.characterMenuLineId = '';
    const payload = await apiJson(`${API_ROOT}/cards/${encodeURIComponent(card.id)}/lyrics/${encodeURIComponent(lineId)}/character`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ characterId })
    });
    applyCollaborationProject(payload.project);
    showToast(characterId ? 'Personagem atribuído ao trecho.' : 'Personagem removido do trecho.');
  }

  function openCharacterDialog(mode = 'pov') {
    if (mode === 'pov') state.characterMenuLineId = '';
    state.characterDialogMode = mode;
    elements.characterDialogTitle.textContent = mode === 'add' ? 'Adicionar personagem' : 'Escolha um personagem';
    elements.characterAddToggle.hidden = !state.canEdit || mode === 'add';
    elements.characterAddForm.hidden = !(state.canEdit && mode === 'add');
    renderCharacterGrid();
    showDialog(elements.characterDialog);
    if (mode === 'add') window.setTimeout(() => elements.characterNameInput.focus(), 40);
  }

  function renderCharacterGrid() {
    elements.characterGrid.replaceChildren();
    if (state.characterDialogMode === 'pov') {
      const allButton = document.createElement('button');
      allButton.type = 'button';
      allButton.className = `character-option${state.selectedCharacterId ? '' : ' is-selected'}`;
      allButton.textContent = 'Todas as falas';
      allButton.addEventListener('click', () => selectPovCharacter(''));
      elements.characterGrid.appendChild(allButton);
    }
    state.characters.forEach((character) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `character-option${state.selectedCharacterId === character.id ? ' is-selected' : ''}`;
      const image = document.createElement('img');
      image.src = character.imageUrl;
      image.alt = '';
      const label = document.createElement('span');
      label.textContent = character.name;
      button.append(image, label);
      if (state.characterDialogMode === 'pov') button.addEventListener('click', () => selectPovCharacter(character.id));
      elements.characterGrid.appendChild(button);
    });
    if (!state.characters.length && state.characterDialogMode !== 'pov') elements.characterGrid.hidden = true;
    else elements.characterGrid.hidden = false;
  }

  function selectPovCharacter(characterId) {
    cancelPovPlayback({ pause: true });
    state.selectedCharacterId = characterId;
    closeDialog(elements.characterDialog);
    renderLyricsScreen();
    if (!characterId) {
      showToast('Linha do tempo completa selecionada.');
      return;
    }
    const card = getCard(state.lyricsCardId);
    const character = characterById(characterId);
    const clips = buildPovClips(card, characterId);
    if (!clips.length) showToast(`${character?.name || 'Este personagem'} ainda não tem falas sincronizadas.`, true);
    else showToast(`Ponto de vista: ${character?.name}. Toque no play.`);
  }

  async function createCharacter(event) {
    event.preventDefault();
    if (!state.canEdit || state.lyricsBusy) return;
    const name = elements.characterNameInput.value.trim().slice(0, 80);
    const file = elements.characterImageInput.files?.[0];
    if (!name || !file) throw new Error('Digite o nome e escolha uma imagem PNG.');
    if (file.type !== 'image/png' && !/\.png$/i.test(file.name)) throw new Error('A imagem precisa ser PNG.');
    state.lyricsBusy = true;
    elements.characterSaveButton.disabled = true;
    try {
      const query = new URLSearchParams({ name });
      const payload = await apiJson(`${API_ROOT}/characters?${query}`, {
        method: 'POST',
        headers: { 'Content-Type': 'image/png' },
        body: file
      });
      state.characters = Array.isArray(payload.characters) ? payload.characters : state.characters;
      cacheCharacterImages().catch(() => {});
      const createdCharacter = state.characters.find((character) => character.name.toLocaleLowerCase('pt-BR') === name.toLocaleLowerCase('pt-BR'));
      const pendingLineId = state.characterMenuLineId;
      saveProjectSnapshot(state.project);
      elements.characterNameInput.value = '';
      elements.characterImageInput.value = '';
      elements.characterImageLabel.textContent = 'Escolher PNG';
      if (pendingLineId && createdCharacter) {
        state.characterMenuLineId = '';
        closeDialog(elements.characterDialog);
        await assignCharacterToLine(pendingLineId, createdCharacter.id);
        showToast(`“${name}” foi criado e atribuído ao trecho.`);
      } else {
        elements.characterAddForm.hidden = true;
        state.characterDialogMode = 'pov';
        elements.characterDialogTitle.textContent = 'Escolha um personagem';
        elements.characterAddToggle.hidden = false;
        renderCharacterGrid();
        renderLyricsScreen();
        showToast(`Personagem “${name}” adicionado.`);
      }
    } finally {
      state.lyricsBusy = false;
      elements.characterSaveButton.disabled = false;
    }
  }

  async function generateLyrics(mode) {
    if (!state.canEdit || state.lyricsBusy) return;
    const card = getCard(state.lyricsCardId);
    if (!card?.audio) throw new Error('Adicione o áudio antes de gerar a letra.');
    state.lyricsBusy = true;
    elements.lyricsGenerationStatus.hidden = false;
    elements.generatePlainLyrics.disabled = true;
    elements.generateTimedLyrics.disabled = true;
    elements.lyricsSaveButton.disabled = true;
    try {
      const payload = await apiJson(`${API_ROOT}/cards/${encodeURIComponent(card.id)}/lyrics/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode })
      });
      applyCollaborationProject(payload.project);
      openLyricsEditor();
      showToast(mode === 'timesync' ? 'Letra sincronizada criada.' : 'Letra criada.');
    } finally {
      state.lyricsBusy = false;
      elements.lyricsGenerationStatus.hidden = true;
      elements.generatePlainLyrics.disabled = false;
      elements.generateTimedLyrics.disabled = false;
      elements.lyricsSaveButton.disabled = false;
    }
  }

  async function saveLyricsEdits({ closeEditor = true, announce = true } = {}) {
    if (!state.canEdit || state.lyricsBusy) return;
    const card = getCard(state.lyricsCardId);
    const text = elements.lyricsEditor.value.trim();
    if (!card || !text) throw new Error('Escreva ao menos uma linha da letra.');
    state.lyricsBusy = true;
    elements.lyricsSaveButton.disabled = true;
    try {
      const payload = await apiJson(`${API_ROOT}/cards/${encodeURIComponent(card.id)}/lyrics`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: card.lyrics?.mode || 'plain', text })
      });
      applyCollaborationProject(payload.project);
      if (closeEditor) elements.lyricsAdminPanel.hidden = true;
      if (announce) showToast(payload.mode === 'timesync' ? 'Correções salvas com timesync.' : 'Correções salvas na letra.');
      return getCard(card.id);
    } finally {
      state.lyricsBusy = false;
      elements.lyricsSaveButton.disabled = false;
    }
  }

  function buildPovClips(card, characterId) {
    if (card?.lyrics?.mode !== 'timesync') return [];
    const duration = Math.max(0, Number(state.durations.get(card.audio?.fileName)) || 0);
    const clips = card.lyrics.lines
      .filter((line) => line.characterId === characterId && Number.isFinite(Number(line.start)) && Number.isFinite(Number(line.end)))
      .map((line) => ({
        start: Math.max(0, Number(line.start) - 3),
        end: duration > 0 ? Math.min(duration, Number(line.end) + 3) : Number(line.end) + 3
      }))
      .sort((left, right) => left.start - right.start);
    return clips.reduce((merged, clip) => {
      const previous = merged[merged.length - 1];
      if (previous && clip.start <= previous.end) previous.end = Math.max(previous.end, clip.end);
      else merged.push({ ...clip });
      return merged;
    }, []);
  }

  function clearPovTimers(playback = state.povPlayback) {
    if (!playback) return;
    (playback.timers || []).forEach((timer) => window.clearTimeout(timer));
    playback.timers = [];
    if (playback.fadeFrame) window.cancelAnimationFrame(playback.fadeFrame);
    playback.fadeFrame = 0;
  }

  function setCurrentVoiceVolume(value) {
    const voice = state.current;
    const volume = Math.max(0, Math.min(1, Number(value) || 0));
    if (!voice) return;
    if (voice.native) {
      try { voice.media.volume = volume; } catch (_error) {}
      return;
    }
    if (voice.gain && state.audioContext) {
      const now = state.audioContext.currentTime;
      voice.gain.gain.cancelScheduledValues(now);
      voice.gain.gain.setValueAtTime(volume, now);
    }
  }

  function fadeCurrentVoice(target, durationMs) {
    const voice = state.current;
    if (!voice) return;
    if (!voice.native && voice.gain && state.audioContext) {
      const now = state.audioContext.currentTime;
      const parameter = voice.gain.gain;
      parameter.cancelScheduledValues(now);
      parameter.setValueAtTime(Math.max(0.0001, parameter.value), now);
      parameter.linearRampToValueAtTime(Math.max(0.0001, target), now + durationMs / 1000);
      return;
    }
    const playback = state.povPlayback;
    if (!playback) return;
    if (playback.fadeFrame) window.cancelAnimationFrame(playback.fadeFrame);
    const startAt = performance.now();
    const initial = Number(voice.media?.volume) || 0;
    const step = (now) => {
      if (state.current !== voice || state.povPlayback !== playback) return;
      const progress = Math.min(1, (now - startAt) / Math.max(1, durationMs));
      try { voice.media.volume = initial + ((target - initial) * progress); } catch (_error) {}
      if (progress < 1) playback.fadeFrame = window.requestAnimationFrame(step);
    };
    playback.fadeFrame = window.requestAnimationFrame(step);
  }

  function cancelPovPlayback({ pause = false } = {}) {
    const playback = state.povPlayback;
    clearPovTimers(playback);
    state.povPlayback = null;
    setCurrentVoiceVolume(1);
    if (pause && state.current && !state.current.paused) pauseCurrent();
  }

  async function playPovClip(index, requestedPosition = null, generation = state.povPlayback?.generation) {
    const playback = state.povPlayback;
    const card = getCard(playback?.cardId);
    const clip = playback?.clips?.[index];
    if (!playback || !card || !clip || playback.generation !== generation) return;
    clearPovTimers(playback);
    playback.index = index;
    const start = Math.max(clip.start, Math.min(Number(requestedPosition) || clip.start, Math.max(clip.start, clip.end - 0.05)));
    await ensureLyricsCardAt(card, start);
    if (state.povPlayback !== playback || playback.generation !== generation) return;
    setCurrentVoiceVolume(0);
    fadeCurrentVoice(1, 1500);
    const remainingMs = Math.max(80, (clip.end - start) * 1000);
    const fadeOutDelay = Math.max(0, remainingMs - 1500);
    playback.timers.push(window.setTimeout(() => {
      if (state.povPlayback === playback) fadeCurrentVoice(0, Math.min(1500, remainingMs));
    }, fadeOutDelay));
    playback.timers.push(window.setTimeout(() => {
      if (state.povPlayback !== playback) return;
      if (index + 1 < playback.clips.length) {
        playPovClip(index + 1, null, generation).catch((error) => showToast(error.message, true));
      } else {
        setCurrentVoiceVolume(1);
        state.povPlayback = null;
        if (state.current && !state.current.paused) pauseCurrent();
        showToast('Fim das falas deste personagem.');
      }
    }, remainingMs));
  }

  async function startPovPlayback(card, characterId, index = 0, requestedPosition = null) {
    const clips = buildPovClips(card, characterId);
    if (!clips.length) throw new Error('Este personagem ainda não tem falas sincronizadas.');
    cancelPovPlayback();
    const generation = Date.now() + Math.random();
    state.povPlayback = { cardId: card.id, characterId, clips, index, timers: [], fadeFrame: 0, generation };
    await playPovClip(Math.min(Math.max(0, index), clips.length - 1), requestedPosition, generation);
  }

  async function toggleLyricsPlayback() {
    const card = getCard(state.lyricsCardId);
    if (!card?.audio) throw new Error('Este container ainda não tem música.');
    if (!await ensureCardDownloadedForPlayback(card)) return;
    if (state.current?.cardId === card.id && !state.current.paused) {
      clearPovTimers();
      pauseCurrent();
      return;
    }
    if (state.selectedCharacterId) {
      const clips = buildPovClips(card, state.selectedCharacterId);
      const position = currentLyricsPosition();
      let index = clips.findIndex((clip) => position >= clip.start && position < clip.end);
      if (index < 0) index = Math.max(0, clips.findIndex((clip) => clip.start > position));
      await startPovPlayback(card, state.selectedCharacterId, index);
      return;
    }
    cancelPovPlayback();
    if (state.current?.cardId === card.id && state.current.paused) await resumeCurrent();
    else if (state.current?.cardId !== card.id) await playCard(card.id);
    cancelAutoAdvance();
  }

  async function changeLyricsTrack(direction) {
    if (state.manualSync) {
      showToast('Conclua ou cancele o sync manual antes de trocar de faixa.');
      return;
    }
    const playableCards = state.project.cards.filter((card) => card.audio?.fileName);
    const currentIndex = playableCards.findIndex((card) => card.id === state.lyricsCardId);
    const target = playableCards[currentIndex + direction];
    if (!target) return;
    if (!await ensureCardDownloadedForPlayback(target)) return;
    cancelPovPlayback({ pause: true });
    state.lyricsCardId = target.id;
    state.lyricsActiveLineIndex = -1;
    state.selectedCharacterId = '';
    renderLyricsScreen();
    loadCardDuration(target).then(updateLyricsPlayer).catch(() => {});
    await ensureLyricsCardAt(target, 0);
    cancelAutoAdvance();
  }

  async function seekLyricsRelative(deltaSeconds) {
    const card = getCard(state.lyricsCardId);
    if (!card?.audio) return;
    const target = Math.max(0, currentLyricsPosition() + deltaSeconds);
    if (state.selectedCharacterId) {
      const clips = buildPovClips(card, state.selectedCharacterId);
      let index = clips.findIndex((clip) => target >= clip.start && target < clip.end);
      if (index < 0 && deltaSeconds < 0) {
        index = 0;
        for (let clipIndex = clips.length - 1; clipIndex >= 0; clipIndex -= 1) {
          if (clips[clipIndex].start < target) {
            index = clipIndex;
            break;
          }
        }
      } else if (index < 0) {
        index = Math.max(0, clips.findIndex((clip) => clip.start > target));
      }
      await startPovPlayback(card, state.selectedCharacterId, index, target);
      return;
    }
    await ensureLyricsCardAt(card, target);
  }

  function applyCollaborationProject(project) {
    if (!project || !Array.isArray(project.cards)) return;
    state.project = project;
    saveProjectSnapshot(project);
    if (state.selectedId && !getCard(state.selectedId)) state.selectedId = '';
    if (state.activeCommentsCardId && !getCard(state.activeCommentsCardId)) {
      state.activeCommentsCardId = '';
      closeDialog(elements.commentsDialog);
    }
    render();
    if (state.activeCommentsCardId && elements.commentsDialog.hasAttribute('open')) renderComments();
    if (state.activeCommentId && elements.commentDetailDialog.hasAttribute('open')) renderCommentDetail();
    if (state.lyricsCardId && !elements.lyricsScreen.hidden) renderLyricsScreen();
  }

  function applyProjectPayload(payload) {
    state.canEdit = payload.canEdit === true;
    state.canContribute = payload.canContribute === true;
    state.canComment = payload.canComment === true;
    state.canApprove = payload.canApprove === true;
    state.canDeleteComments = payload.canDeleteComments === true;
    state.canReorder = payload.canReorder === true;
    state.viewerUserId = Math.max(0, Number(payload.viewerUserId) || 0);
    if (Array.isArray(payload.characters)) state.characters = payload.characters;
    state.unreadCardIds = new Set(Array.isArray(payload.unreadCardIds) ? payload.unreadCardIds : []);
    applyCollaborationProject(payload.project || { version: 1, cards: [] });
    cacheCharacterImages().catch(() => {});
  }

  async function refreshProject() {
    if (state.refreshing) return;
    state.refreshing = true;
    elements.refreshButton.disabled = true;
    elements.refreshButton.classList.add('is-refreshing');
    elements.refreshButton.setAttribute('aria-label', 'Atualizando o musical');
    setStatus('Atualizando containers, áudios e comentários…', true);
    try {
      const payload = await apiJson(`${API_ROOT}/project`, { cache: 'no-store' });
      applyProjectPayload(payload);
      await refreshDownloadStates().catch(() => {});
      setStatus('Musical atualizado agora.');
      showToast('Musical atualizado.');
    } finally {
      state.refreshing = false;
      elements.refreshButton.disabled = false;
      elements.refreshButton.classList.remove('is-refreshing');
      elements.refreshButton.setAttribute('aria-label', 'Atualizar containers, áudios e comentários');
    }
  }

  function openAddCardDialog() {
    if (!state.canContribute || state.collaborationBusy) return;
    elements.newCardTitle.value = '';
    showDialog(elements.addCardDialog);
    window.setTimeout(() => elements.newCardTitle.focus(), 30);
  }

  async function submitNewCard(event) {
    event.preventDefault();
    if (!state.canContribute || state.collaborationBusy) return;
    const title = elements.newCardTitle.value.trim().slice(0, 120);
    if (!title) {
      elements.newCardTitle.focus();
      showToast('Digite o nome da faixa.', true);
      return;
    }
    state.collaborationBusy = true;
    elements.confirmAddCardButton.disabled = true;
    setStatus(`Adicionando “${title}”…`, true);
    try {
      const payload = await apiJson(`${API_ROOT}/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title })
      });
      applyCollaborationProject(payload.project);
      closeDialog(elements.addCardDialog);
      showToast(`Container “${title}” adicionado.`);
      setStatus(`Container “${title}” criado.`);
      window.requestAnimationFrame(() => {
        elements.trackList.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    } finally {
      state.collaborationBusy = false;
      elements.confirmAddCardButton.disabled = false;
    }
  }

  async function deleteEmptyCard(cardId, button) {
    if (state.collaborationBusy) return;
    const card = getCard(cardId);
    if (!card || card.audio) return;
    if (!window.confirm(`Excluir o container “${card.title}”?`)) return;
    state.collaborationBusy = true;
    button.disabled = true;
    button.classList.add('is-busy');
    try {
      const payload = await apiJson(`${API_ROOT}/cards/${encodeURIComponent(card.id)}`, {
        method: 'DELETE'
      });
      applyCollaborationProject(payload.project);
      showToast(`Container “${card.title}” excluído.`);
    } finally {
      state.collaborationBusy = false;
      if (button.isConnected) {
        button.disabled = false;
        button.classList.remove('is-busy');
      }
    }
  }

  function formatCommentDate(value) {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return '';
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  function commentPreview(text) {
    const value = String(text || '').replace(/\s+/g, ' ').trim();
    return value.length > 20 ? `${value.slice(0, 20)}...` : value;
  }

  function commentDisplayTitle(comment) {
    const value = String(comment?.title || '').trim();
    if (value) return value;
    const fallback = String(comment?.text || '').replace(/\s+/g, ' ').trim().split(' ').slice(0, 7).join(' ');
    return fallback || 'Comentário sobre a faixa';
  }

  function isOwnCommentEntry(entry) {
    const identity = readCommenterIdentity({ create: false });
    return state.canDeleteComments
      || Boolean(state.viewerUserId && Number(entry?.userId) === state.viewerUserId)
      || Boolean(identity.ownerId && entry?.ownerId === identity.ownerId);
  }

  function authorLine(entry, { pending = false } = {}) {
    const line = document.createElement('span');
    line.className = 'comment-user-line';
    line.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.2"/><path d="M5.5 20c.7-4.3 2.8-6.5 6.5-6.5s5.8 2.2 6.5 6.5"/></svg>';
    const copy = document.createElement('span');
    copy.textContent = `${entry?.authorName || 'Usuário'}${pending ? ' · aguardando envio' : ''}`;
    line.appendChild(copy);
    return line;
  }

  function renderComments() {
    const card = getCard(state.activeCommentsCardId);
    if (!card) return;
    elements.commentsDialogTitle.textContent = card.title;
    elements.commentsList.replaceChildren();
    const comments = commentsForCard(card);
    if (!comments.length) {
      const empty = document.createElement('p');
      empty.className = 'comments-empty';
      empty.textContent = 'Nenhum comentário neste container ainda.';
      elements.commentsList.appendChild(empty);
    } else {
      comments.forEach((comment) => {
        const entry = document.createElement('article');
        entry.className = 'comment-entry';
        entry.classList.toggle('is-pending', comment.pending === true);
        const open = document.createElement('button');
        open.type = 'button';
        open.className = 'comment-notification';
        const copy = document.createElement('span');
        copy.className = 'comment-notification-copy';
        const title = document.createElement('strong');
        title.textContent = commentDisplayTitle(comment);
        const preview = document.createElement('span');
        preview.className = 'comment-preview';
        preview.textContent = commentPreview(comment.text);
        copy.append(title, preview, authorLine(comment, { pending: comment.pending === true }));
        const dots = document.createElement('span');
        dots.className = 'comment-dots';
        dots.setAttribute('aria-hidden', 'true');
        dots.innerHTML = '<i></i><i></i><i></i>';
        open.append(copy, dots);
        open.disabled = comment.pending === true;
        open.addEventListener('click', () => openCommentDetail(comment.id));
        entry.appendChild(open);
        if (comment.pending) {
          const cancel = document.createElement('button');
          cancel.type = 'button';
          cancel.className = 'pending-comment-cancel';
          cancel.textContent = 'Cancelar';
          cancel.addEventListener('click', () => {
            cancelPendingComment(comment.clientMutationId).catch((error) => showToast(error.message, true));
          });
          entry.appendChild(cancel);
        }
        elements.commentsList.appendChild(entry);
      });
    }
    elements.commentForm.hidden = false;
    syncCommenterIdentity();
    elements.approveTrackButton.hidden = !state.canApprove;
    elements.approveTrackButton.disabled = state.collaborationBusy || !card.audio || Boolean(card.approvedAt);
    elements.approveTrackButton.querySelector('span').textContent = card.approvedAt
      ? 'Faixa aprovada'
      : (card.audio ? 'Aprovar faixa' : 'Adicione um áudio para aprovar');
  }

  function openComments(cardId) {
    const card = getCard(cardId);
    if (!card) return;
    state.activeCommentsCardId = cardId;
    state.activeCommentId = '';
    elements.commentText.value = '';
    markCommentsSeen(card);
    renderComments();
    render();
    showDialog(elements.commentsDialog);
  }

  function activeComment() {
    return getCard(state.activeCommentsCardId)?.comments?.find((comment) => comment.id === state.activeCommentId) || null;
  }

  function ownerActionButton(label, svg, action, danger = false) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `comment-inline-action${danger ? ' is-danger' : ''}`;
    button.innerHTML = `${svg}<span>${label}</span>`;
    button.addEventListener('click', action);
    return button;
  }

  function renderCommentDetail() {
    const comment = activeComment();
    if (!comment) {
      closeDialog(elements.commentDetailDialog);
      state.activeCommentId = '';
      return;
    }
    syncCommenterIdentity();
    elements.commentDetailTitle.textContent = commentDisplayTitle(comment);
    elements.commentDetailAuthor.replaceChildren(authorLine(comment));
    const date = document.createElement('time');
    date.dateTime = comment.updatedAt || comment.createdAt || '';
    date.textContent = `${formatCommentDate(comment.updatedAt || comment.createdAt)}${comment.updatedAt ? ' · editado' : ''}`;
    elements.commentDetailAuthor.appendChild(date);
    elements.commentDetailText.textContent = comment.text;
    elements.commentOwnerActions.hidden = !isOwnCommentEntry(comment);
    elements.commentReplies.replaceChildren();
    const replies = Array.isArray(comment.replies) ? comment.replies : [];
    if (!replies.length) {
      const empty = document.createElement('p');
      empty.className = 'comment-replies-empty';
      empty.textContent = 'Ainda não há respostas. Seja o primeiro a comentar.';
      elements.commentReplies.appendChild(empty);
    } else {
      replies.forEach((reply) => {
        const item = document.createElement('article');
        item.className = 'comment-reply';
        const heading = document.createElement('div');
        heading.className = 'comment-reply-heading';
        heading.appendChild(authorLine(reply));
        const date = document.createElement('time');
        date.dateTime = reply.updatedAt || reply.createdAt || '';
        date.textContent = `${formatCommentDate(reply.updatedAt || reply.createdAt)}${reply.updatedAt ? ' · editado' : ''}`;
        heading.appendChild(date);
        const text = document.createElement('p');
        text.textContent = reply.text;
        item.append(heading, text);
        if (isOwnCommentEntry(reply)) {
          const actions = document.createElement('div');
          actions.className = 'comment-reply-actions';
          actions.append(
            ownerActionButton('Editar', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 16-.8 4 4-.8L18 8.4 14.6 5 4 16Z"/></svg>', () => editCommentEntry(reply, reply.id)),
            ownerActionButton('Apagar', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13"/></svg>', () => deleteComment(state.activeCommentsCardId, comment.id, reply.id).catch((error) => showToast(error.message, true)), true)
          );
          item.appendChild(actions);
        }
        elements.commentReplies.appendChild(item);
      });
    }
  }

  function openCommentDetail(commentId) {
    state.activeCommentId = commentId;
    elements.replyText.value = '';
    renderCommentDetail();
    showDialog(elements.commentDetailDialog);
  }

  async function registerCommentBackgroundSync() {
    if (!('serviceWorker' in navigator)) return;
    try {
      const registration = await navigator.serviceWorker.ready;
      if (registration.sync?.register) await registration.sync.register(COMMENT_SYNC_TAG);
    } catch (_error) {}
  }

  async function cancelPendingComment(clientMutationId) {
    await deletePendingComment(clientMutationId);
    await reloadPendingComments();
    showToast('Comentário pendente cancelado.');
  }

  async function flushPendingComments({ announce = false } = {}) {
    if (state.commentFlushPromise) return state.commentFlushPromise;
    if (!navigator.onLine || !state.pendingComments.length) return 0;

    state.commentFlushPromise = (async () => {
      let sentCount = 0;
      let lastError = null;
      while (navigator.onLine) {
        await reloadPendingComments({ renderNow: false });
        const pending = state.pendingComments[0];
        if (!pending) break;
        try {
          const payload = await apiJson(`${API_ROOT}/cards/${encodeURIComponent(pending.cardId)}/comments`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Musical-Kelly-Commenter-Id': pending.ownerId,
              'X-Musical-Kelly-Commenter-Token': pending.ownerToken
            },
            body: JSON.stringify({
              text: pending.text,
              authorName: pending.authorName,
              clientMutationId: pending.clientMutationId
            })
          });
          await deletePendingComment(pending.clientMutationId);
          await reloadPendingComments({ renderNow: false });
          applyCollaborationProject(payload.project);
          markCommentsSeen(getCard(pending.cardId));
          sentCount += 1;
        } catch (error) {
          lastError = error;
          break;
        }
      }

      render();
      if (state.activeCommentsCardId && elements.commentsDialog.hasAttribute('open')) renderComments();
      if (announce && sentCount) {
        showToast(sentCount === 1
          ? 'Comentário offline enviado para o musical.'
          : `${sentCount} comentários offline enviados para o musical.`);
      } else if (announce && lastError) {
        showToast('O comentário continua salvo e será enviado na próxima tentativa.', true);
      }
      return sentCount;
    })().finally(() => {
      state.commentFlushPromise = null;
    });
    return state.commentFlushPromise;
  }

  async function submitComment(event) {
    event.preventDefault();
    if (!state.canComment || state.commentSubmitting) return;
    const identity = requireCommenterName(() => submitCommentFromForm().catch((error) => showToast(error.message, true)));
    if (!identity) return;
    await submitCommentFromForm(identity);
  }

  async function submitCommentFromForm(existingIdentity = null) {
    if (!state.canComment || state.commentSubmitting) return;
    const card = getCard(state.activeCommentsCardId);
    const text = elements.commentText.value.trim().slice(0, 800);
    if (!card || !text) {
      elements.commentText.focus();
      showToast('Escreva um comentário antes de enviar.', true);
      return;
    }
    const identity = existingIdentity || readCommenterIdentity();
    if (!identity.name) {
      requireCommenterName(() => submitCommentFromForm().catch((error) => showToast(error.message, true)));
      return;
    }
    const pending = {
      clientMutationId: createCommentMutationId(),
      cardId: card.id,
      text,
      authorName: identity.name,
      ownerId: identity.ownerId,
      ownerToken: identity.ownerToken,
      createdAt: new Date().toISOString()
    };
    state.commentSubmitting = true;
    elements.sendCommentButton.disabled = true;
    try {
      await storePendingComment(pending);
      await reloadPendingComments();
      elements.commentText.value = '';
      registerCommentBackgroundSync();
      await flushPendingComments();
      const stillPending = state.pendingComments.some((comment) => comment.clientMutationId === pending.clientMutationId);
      markCommentsSeen(getCard(card.id));
      render();
      showToast(stillPending
        ? 'Comentário salvo neste aparelho. Ele será enviado quando a conexão voltar.'
        : 'Comentário adicionado.');
    } catch (error) {
      throw new Error(error?.message || 'Não foi possível guardar o comentário neste aparelho.');
    } finally {
      state.commentSubmitting = false;
      elements.sendCommentButton.disabled = false;
    }
  }

  async function submitReply(event) {
    event.preventDefault();
    if (state.commentSubmitting) return;
    const identity = requireCommenterName(() => submitReplyFromForm().catch((error) => showToast(error.message, true)));
    if (!identity) return;
    await submitReplyFromForm(identity);
  }

  async function submitReplyFromForm(existingIdentity = null) {
    const card = getCard(state.activeCommentsCardId);
    const comment = activeComment();
    const text = elements.replyText.value.trim().slice(0, 800);
    if (!card || !comment || !text) {
      elements.replyText.focus();
      showToast('Escreva uma resposta antes de enviar.', true);
      return;
    }
    const identity = existingIdentity || readCommenterIdentity();
    if (!identity.name) {
      requireCommenterName(() => submitReplyFromForm().catch((error) => showToast(error.message, true)));
      return;
    }
    state.commentSubmitting = true;
    elements.sendReplyButton.disabled = true;
    try {
      const payload = await apiJson(`${API_ROOT}/cards/${encodeURIComponent(card.id)}/comments/${encodeURIComponent(comment.id)}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...commenterRequestHeaders() },
        body: JSON.stringify({
          text,
          authorName: identity.name,
          clientMutationId: createCommentMutationId()
        })
      });
      applyCollaborationProject(payload.project);
      markCommentsSeen(getCard(card.id));
      elements.replyText.value = '';
      render();
      renderCommentDetail();
      showToast('Resposta adicionada.');
    } finally {
      state.commentSubmitting = false;
      elements.sendReplyButton.disabled = false;
    }
  }

  async function approveTrack() {
    if (!state.canApprove || state.collaborationBusy) return;
    const card = getCard(state.activeCommentsCardId);
    if (!card?.audio) {
      showToast('Adicione um áudio antes de aprovar a faixa.', true);
      return;
    }
    state.collaborationBusy = true;
    elements.approveTrackButton.disabled = true;
    try {
      const payload = await apiJson(`${API_ROOT}/cards/${encodeURIComponent(card.id)}/approve`, {
        method: 'POST'
      });
      applyCollaborationProject(payload.project);
      renderComments();
      showToast('Faixa aprovada.');
    } finally {
      state.collaborationBusy = false;
      renderComments();
    }
  }

  async function editCommentEntry(entry, replyId = '') {
    if (!entry || state.collaborationBusy) return;
    const nextText = window.prompt(replyId ? 'Editar resposta' : 'Editar comentário', entry.text || '');
    if (nextText === null) return;
    const text = nextText.trim().slice(0, 800);
    if (!text || text === entry.text) return;
    const cardId = state.activeCommentsCardId;
    const commentId = state.activeCommentId;
    const suffix = replyId ? `/replies/${encodeURIComponent(replyId)}` : '';
    state.collaborationBusy = true;
    try {
      const payload = await apiJson(`${API_ROOT}/cards/${encodeURIComponent(cardId)}/comments/${encodeURIComponent(commentId)}${suffix}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...commenterRequestHeaders() },
        body: JSON.stringify({ text })
      });
      applyCollaborationProject(payload.project);
      markCommentsSeen(getCard(cardId));
      render();
      renderCommentDetail();
      showToast(replyId ? 'Resposta editada.' : 'Comentário editado.');
    } catch (error) {
      showToast(error.message, true);
    } finally {
      state.collaborationBusy = false;
    }
  }

  async function deleteComment(cardId, commentId, replyId = '') {
    if (state.collaborationBusy) return;
    if (!window.confirm(replyId ? 'Apagar esta resposta?' : 'Apagar este comentário?')) return;
    state.collaborationBusy = true;
    try {
      const suffix = replyId ? `/replies/${encodeURIComponent(replyId)}` : '';
      const payload = await apiJson(`${API_ROOT}/cards/${encodeURIComponent(cardId)}/comments/${encodeURIComponent(commentId)}${suffix}`, {
        method: 'DELETE',
        headers: commenterRequestHeaders()
      });
      applyCollaborationProject(payload.project);
      markCommentsSeen(getCard(cardId));
      if (!replyId) {
        closeDialog(elements.commentDetailDialog);
        state.activeCommentId = '';
      }
      render();
      renderComments();
      if (replyId) renderCommentDetail();
      showToast(replyId ? 'Resposta apagada.' : 'Comentário apagado.');
    } finally {
      state.collaborationBusy = false;
    }
  }

  function moveCardBeside(draggedId, targetId, placeAfter) {
    if (!draggedId || !targetId || draggedId === targetId) return false;
    const cards = state.project.cards;
    const draggedIndex = cards.findIndex((card) => card.id === draggedId);
    if (draggedIndex < 0) return false;
    const [draggedCard] = cards.splice(draggedIndex, 1);
    const targetIndex = cards.findIndex((card) => card.id === targetId);
    if (targetIndex < 0) {
      cards.splice(draggedIndex, 0, draggedCard);
      return false;
    }
    cards.splice(targetIndex + (placeAfter ? 1 : 0), 0, draggedCard);

    const draggedNode = elements.trackList.querySelector(`[data-card-id="${CSS.escape(draggedId)}"]`);
    const targetNode = elements.trackList.querySelector(`[data-card-id="${CSS.escape(targetId)}"]`);
    if (draggedNode && targetNode) {
      elements.trackList.insertBefore(draggedNode, placeAfter ? targetNode.nextSibling : targetNode);
    }
    return true;
  }

  async function persistCardOrder() {
    if (!state.canReorder || state.collaborationBusy) return;
    state.collaborationBusy = true;
    setStatus('Salvando nova ordem…', true);
    try {
      const payload = await apiJson(`${API_ROOT}/order`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardIds: state.project.cards.map((card) => card.id) })
      });
      applyCollaborationProject(payload.project);
      setStatus('Nova ordem salva para todos.');
      showToast('Ordem dos containers atualizada.');
    } catch (error) {
      const payload = await apiJson(`${API_ROOT}/project`).catch(() => null);
      if (payload?.project) applyCollaborationProject(payload.project);
      throw error;
    } finally {
      state.collaborationBusy = false;
    }
  }

  function bindSortGestures(element, cardId) {
    let moved = false;
    const moveFromPoint = (clientX, clientY) => {
      const target = document.elementFromPoint(clientX, clientY)?.closest?.('.track-card');
      const targetId = target?.dataset?.cardId;
      if (!targetId || targetId === cardId) return;
      const rect = target.getBoundingClientRect();
      moved = moveCardBeside(cardId, targetId, clientY > rect.top + rect.height / 2) || moved;
    };

    element.addEventListener('dragstart', (event) => {
      state.sortingCardId = cardId;
      moved = false;
      element.classList.add('is-dragging');
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', cardId);
    });
    element.addEventListener('dragover', (event) => {
      event.preventDefault();
      const draggedId = state.sortingCardId || event.dataTransfer.getData('text/plain');
      if (!draggedId || draggedId === cardId) return;
      const rect = element.getBoundingClientRect();
      moved = moveCardBeside(draggedId, cardId, event.clientY > rect.top + rect.height / 2) || moved;
    });
    element.addEventListener('drop', (event) => {
      event.preventDefault();
      state.sortingCardId = '';
      element.classList.remove('is-dragging');
      if (moved) persistCardOrder().catch((error) => showToast(error.message, true));
      moved = false;
    });
    element.addEventListener('dragend', () => {
      element.classList.remove('is-dragging');
      state.sortingCardId = '';
      if (moved) persistCardOrder().catch((error) => showToast(error.message, true));
      moved = false;
    });

    element.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse') return;
      event.preventDefault();
      moved = false;
      state.sortingCardId = cardId;
      element.classList.add('is-dragging');
      element.setPointerCapture?.(event.pointerId);
    });
    element.addEventListener('pointermove', (event) => {
      if (state.sortingCardId !== cardId || event.pointerType === 'mouse') return;
      event.preventDefault();
      moveFromPoint(event.clientX, event.clientY);
    });
    const finishPointerSort = (event) => {
      if (state.sortingCardId !== cardId || event.pointerType === 'mouse') return;
      state.sortingCardId = '';
      element.classList.remove('is-dragging');
      element.releasePointerCapture?.(event.pointerId);
      if (moved) persistCardOrder().catch((error) => showToast(error.message, true));
      moved = false;
    };
    element.addEventListener('pointerup', finishPointerSort);
    element.addEventListener('pointercancel', finishPointerSort);
  }

  function toggleSortMode() {
    if (!state.canReorder || state.collaborationBusy) return;
    state.sortMode = !state.sortMode;
    render();
    showToast(state.sortMode ? 'Modo de ordenar ativado. Arraste os containers.' : 'Modo de ordenar concluído.');
  }

  async function getCache() {
    if (!('caches' in window)) throw new Error('Este navegador não oferece armazenamento grande para mídia.');
    try {
      return await caches.open(CACHE_NAME);
    } catch (_error) {
      throw new Error('O navegador não liberou espaço para salvar a faixa. Ela ainda pode ser tocada pela internet.');
    }
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

  function charactersUsedByCard(card) {
    const usedIds = new Set((Array.isArray(card?.lyrics?.lines) ? card.lyrics.lines : [])
      .map((line) => String(line?.characterId || '').trim())
      .filter(Boolean));
    return state.characters.filter((character) => usedIds.has(String(character?.id || '')));
  }

  async function cacheCharacterImage(character) {
    if (!character?.imageUrl) return;
    const cache = await getCache();
    const request = new Request(absoluteUrl(character.imageUrl), { credentials: 'same-origin' });
    const existing = await cache.match(request, { ignoreVary: true });
    if (existing) return;
    const response = await fetch(request);
    if (!response.ok) throw new Error(`Não foi possível salvar a imagem de ${character.name || 'personagem'} offline.`);
    await cache.put(request, response.clone());
  }

  async function cacheCharacterImages() {
    if (!navigator.onLine || !('caches' in window) || !state.characters.length) return;
    await requestPersistentStorage();
    await Promise.allSettled(state.characters.map(cacheCharacterImage));
  }

  async function cacheCardCharacterImages(card) {
    const characters = charactersUsedByCard(card);
    await Promise.all(characters.map(cacheCharacterImage));
  }

  async function isAssetCached(asset) {
    if (!asset?.url || !('caches' in window)) return false;
    const cache = await getCache();
    return Boolean(await cache.match(new Request(absoluteUrl(asset.url), { credentials: 'same-origin' }), { ignoreVary: true }));
  }

  async function areCardCharacterImagesCached(card) {
    const characters = charactersUsedByCard(card);
    const states = await Promise.all(characters.map((character) => isAssetCached({ url: character.imageUrl })));
    return states.every(Boolean);
  }

  async function isCardCached(card) {
    if (!card?.audio) return false;
    const audioReady = await isAssetCached(card.audio);
    const imageReady = !card.image || await isAssetCached(card.image);
    const characterImagesReady = await areCardCharacterImagesCached(card);
    return audioReady && imageReady && characterImagesReady;
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
    markCardNotificationSeen(cardId);
    if (!card?.audio) throw new Error('Adicione uma música neste container primeiro.');
    state.downloadStates.set(cardId, 'busy');
    render();
    if (!quiet) setStatus(`Baixando “${card.title}” para este aparelho…`, true);
    try {
      await requestPersistentStorage();
      await cacheAsset(card.audio);
      await cacheAsset(card.image);
      await cacheCardCharacterImages(card);
      saveProjectSnapshot(state.project);
      state.downloadStates.set(cardId, 'done');
      if (!quiet) setStatus(`“${card.title}” está pronta com áudio, rótulo e personagens para ensaiar offline.`);
    } catch (error) {
      state.downloadStates.set(cardId, 'idle');
      if (error?.name === 'QuotaExceededError') {
        throw new Error('O iPhone está sem espaço para esta faixa. Libere armazenamento ou toque pela internet.');
      }
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

  function createAudioContextInstance() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) throw new Error('Este navegador não suporta a reprodução contínua do musical.');
    try {
      return new AudioContextClass({ latencyHint: 'interactive' });
    } catch (_error) {
      return new AudioContextClass();
    }
  }

  function primeAudioOutput(context) {
    try {
      const source = context.createBufferSource();
      source.buffer = context.createBuffer(1, 1, context.sampleRate || 44100);
      source.connect(context.destination);
      source.start(0);
    } catch (_error) {}
  }

  async function resumeAudioContext(context) {
    if (context.state === 'running') return context;
    primeAudioOutput(context);
    let timeoutId = null;
    const timeout = new Promise((_, reject) => {
      timeoutId = window.setTimeout(() => reject(new Error('Tempo esgotado ao liberar o áudio.')), 2200);
    });
    try {
      await Promise.race([Promise.resolve(context.resume()), timeout]);
    } finally {
      window.clearTimeout(timeoutId);
    }
    if (context.state !== 'running') throw new Error(`Áudio em estado ${context.state || 'indisponível'}.`);
    return context;
  }

  async function replaceAudioContext() {
    const previousContext = state.audioContext;
    const previousVoice = state.current;
    cancelAutoAdvance();
    clearTransitionTimers();
    if (previousVoice && !previousVoice.paused) {
      const offset = Math.min(
        currentPosition(previousVoice),
        Math.max(0, previousVoice.buffer.duration - 0.01)
      );
      stopVoice(previousVoice);
      state.current = {
        ...previousVoice,
        source: null,
        gain: null,
        offset,
        startedAt: 0,
        paused: true,
        cancelled: false,
        replaced: false
      };
    }
    state.transitioning = false;
    state.transitionFromId = '';
    state.transitionTargetId = '';
    state.colorMode = 'idle';
    await previousContext?.close?.().catch(() => {});
    state.audioContext = createAudioContextInstance();
    primeAudioOutput(state.audioContext);
    return state.audioContext;
  }

  async function getAudioContext({ fromUserGesture = false } = {}) {
    if (!state.audioContext || state.audioContext.state === 'closed') {
      state.audioContext = createAudioContextInstance();
    }
    primeAudioOutput(state.audioContext);
    try {
      return await resumeAudioContext(state.audioContext);
    } catch (error) {
      if (!fromUserGesture) throw error;
      const freshContext = await replaceAudioContext();
      try {
        return await resumeAudioContext(freshContext);
      } catch (_retryError) {
        throw new Error('O iPhone bloqueou o áudio. Confirme que ele não está no silencioso e toque novamente na faixa.');
      }
    }
  }

  function decodeAudioBytes(context, bytes) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = (callback) => (value) => {
        if (settled) return;
        settled = true;
        callback(value);
      };
      const succeed = finish(resolve);
      const fail = finish(reject);
      try {
        const result = context.decodeAudioData(bytes, succeed, fail);
        if (result && typeof result.then === 'function') result.then(succeed, fail);
      } catch (error) {
        fail(error);
      }
    });
  }

  function isAppleTouchDevice() {
    return /iPad|iPhone|iPod/i.test(navigator.userAgent)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  async function recoverAppleAudio() {
    if (USE_NATIVE_AUDIO_ON_APPLE && state.current?.native) {
      if (!state.current.paused && state.current.media?.paused) {
        setStatus('O iPhone pausou o áudio. Toque novamente na faixa para continuar.');
        showToast('Toque novamente na faixa para retomar o áudio no iPhone.');
      }
      return;
    }
    const context = state.audioContext;
    if (!isAppleTouchDevice() || document.hidden || !context || context.state === 'closed' || !state.current) return;
    try {
      if (context.state === 'running') await context.suspend();
      await resumeAudioContext(context);
      setStatus(state.current.paused
        ? 'Faixa pausada. Toque para continuar.'
        : `No ar: “${getCard(state.current.cardId)?.title || 'faixa'}”.`);
    } catch (_error) {
      setStatus('O iPhone pausou o áudio. Toque novamente na faixa para liberar o som.');
      showToast('Toque novamente na faixa para retomar o áudio no iPhone.');
    }
  }

  function syncNativeDuration(voice) {
    if (!voice?.native || !voice.media) return;
    const duration = Number(voice.media.duration);
    if (!Number.isFinite(duration) || duration <= 0) return;
    voice.buffer.duration = duration;
    const card = getCard(voice.cardId);
    if (card?.audio?.fileName) state.durations.set(card.audio.fileName, duration);
    updatePlayerBar();
  }

  function ensureNativeAudio() {
    if (state.nativeAudio) return state.nativeAudio;
    const media = new Audio();
    media.preload = 'auto';
    media.playsInline = true;
    media.setAttribute('playsinline', '');
    media.addEventListener('loadedmetadata', () => syncNativeDuration(state.current));
    media.addEventListener('durationchange', () => syncNativeDuration(state.current));
    media.addEventListener('ended', () => {
      const voice = state.current;
      if (!voice?.native || voice.media !== media || voice.cancelled || voice.replaced) return;
      voice.ended = true;
      clearColorTimer();
      state.colorMode = 'idle';
      state.current = null;
      render();
      setStatus('Faixa concluída.');
    });
    state.nativeAudio = media;
    return media;
  }

  function applyNativeOffset(voice, offset) {
    if (!voice?.native || state.current !== voice) return;
    const duration = Number(voice.media.duration);
    const maximum = Number.isFinite(duration) && duration > 0 ? Math.max(0, duration - 0.02) : offset;
    const target = Math.max(0, Math.min(Number(offset) || 0, maximum));
    try {
      voice.media.currentTime = target;
      voice.offset = target;
    } catch (_error) {}
  }

  async function startNativeCard(card, offset = 0, { natural = false, sourceUrl = '' } = {}) {
    if (!card?.audio?.url) throw new Error('Este container ainda não tem música.');
    const media = ensureNativeAudio();
    const previous = state.current;
    const generation = ++state.nativeGeneration;
    cancelAutoAdvance();
    clearTransitionTimers();
    clearColorTimer();
    if (previous) previous.replaced = true;
    media.pause();
    media.src = absoluteUrl(sourceUrl || card.audio.url);
    media.load();

    const knownDuration = Math.max(0, Number(state.durations.get(card.audio.fileName)) || 0);
    const voice = {
      cardId: card.id,
      native: true,
      media,
      buffer: { duration: knownDuration },
      source: null,
      gain: null,
      offset: Math.max(0, Number(offset) || 0),
      startedAt: 0,
      paused: false,
      cancelled: false,
      replaced: false,
      ended: false
    };
    state.current = voice;
    state.transitionFromId = '';
    state.transitionTargetId = '';
    state.transitioning = false;
    state.colorMode = 'revealing';
    media.addEventListener('loadedmetadata', () => applyNativeOffset(voice, offset), { once: true });
    applyNativeOffset(voice, offset);
    render();
    setStatus(`${natural ? 'Abrindo' : 'Preparando'} “${card.title}” no áudio do iPhone…`, true);

    let playback;
    try {
      playback = media.play();
    } catch (_error) {
      throw new Error('O iPhone bloqueou o áudio. Toque novamente na faixa.');
    }
    try {
      await playback;
    } catch (_error) {
      if (generation === state.nativeGeneration && state.current === voice) {
        voice.paused = true;
        render();
      }
      throw new Error('O iPhone não conseguiu abrir esta música. Use uma faixa MP3 ou M4A/AAC e toque novamente.');
    }
    if (generation !== state.nativeGeneration || state.current !== voice) return;
    syncNativeDuration(voice);
    beginColorReveal(card.id);
    render();
    setStatus(`No ar: “${card.title}”.`);
  }

  function manualSyncAudioUrl(card) {
    const token = encodeURIComponent(`${card.audio?.fileName || 'audio'}-${Date.now()}`);
    return `${API_ROOT}/cards/${encodeURIComponent(card.id)}/audio?fresh=${token}`;
  }

  async function fetchAssetResponse(asset, { forceNetwork = false, sourceUrl = '' } = {}) {
    const request = new Request(absoluteUrl(sourceUrl || asset.url), {
      credentials: 'same-origin',
      cache: forceNetwork ? 'no-store' : 'default'
    });
    if (!forceNetwork && 'caches' in window) {
      const cached = await (await getCache()).match(request);
      if (cached) return cached;
    }
    const response = await fetch(request);
    if (!response.ok) throw new Error(`Não foi possível abrir ${asset.name || 'a faixa'}.`);
    return response;
  }

  async function loadAudioBuffer(card, { forceR2 = false } = {}) {
    if (!card?.audio?.url) throw new Error('Este container ainda não tem música.');
    const key = card.audio.fileName;
    if (forceR2) state.bufferPromises.delete(key);
    if (!state.bufferPromises.has(key)) {
      const promise = (async () => {
        const context = await getAudioContext();
        const response = await fetchAssetResponse(card.audio, forceR2
          ? { forceNetwork: true, sourceUrl: manualSyncAudioUrl(card) }
          : {});
        const bytes = await response.arrayBuffer();
        let buffer;
        try {
          buffer = await decodeAudioBytes(context, bytes.slice(0));
        } catch (_error) {
          throw new Error('Este áudio não pôde ser aberto neste navegador. Para iPhone, prefira MP3 ou M4A/AAC.');
        }
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

  async function startManualSyncR2Audio(card) {
    const generation = ++state.playRequestGeneration;
    cancelAutoAdvance();
    clearTransitionTimers();
    if (USE_NATIVE_AUDIO_ON_APPLE) {
      await startNativeCard(card, 0, { sourceUrl: manualSyncAudioUrl(card) });
      if (generation !== state.playRequestGeneration) throw new Error('A faixa mudou enquanto o áudio era aberto.');
      cancelAutoAdvance();
      return;
    }
    const buffer = await loadAudioBuffer(card, { forceR2: true });
    if (generation !== state.playRequestGeneration) throw new Error('A faixa mudou enquanto o áudio era aberto.');
    await startImmediately(card, buffer);
    cancelAutoAdvance();
  }

  function releaseAudioBuffer(cardId) {
    if (!cardId || state.current?.cardId === cardId || state.autoAdvance?.nextVoice?.cardId === cardId) return;
    const card = getCard(cardId);
    if (card?.audio?.fileName) state.bufferPromises.delete(card.audio.fileName);
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
      try { source.disconnect(); } catch (_error) {}
      try { gain.disconnect(); } catch (_error) {}
      if (voice.cancelled || voice.replaced) return;
      if (state.current === voice) {
        clearColorTimer();
        state.colorMode = 'idle';
        state.current = null;
        state.transitionFromId = '';
        state.transitionTargetId = '';
        state.transitioning = false;
        render();
        setStatus('Faixa concluída.');
        releaseAudioBuffer(voice.cardId);
      }
    });
    source.start(when, Math.max(0, Math.min(offset, Math.max(0, buffer.duration - 0.01))));
    return voice;
  }

  function currentPosition(voice, atTime = null) {
    if (!voice) return 0;
    if (voice.native) {
      const mediaPosition = Number(voice.media?.currentTime);
      return Number.isFinite(mediaPosition) ? Math.max(0, mediaPosition) : Math.max(0, voice.offset || 0);
    }
    if (voice.paused) return voice.offset;
    const contextTime = Number.isFinite(atTime) ? atTime : (state.audioContext?.currentTime || voice.startedAt);
    return Math.max(0, voice.offset + Math.max(0, contextTime - voice.startedAt));
  }

  function formatTime(seconds) {
    const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
    const minutes = Math.floor(safeSeconds / 60);
    const remainder = safeSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
  }

  function updatePlayerBar() {
    const voice = state.current;
    if (!voice) return;
    const duration = Math.max(0, Number(voice.buffer?.duration) || 0);
    const liveLocalPosition = Math.min(duration, currentPosition(voice));
    const activeCardTime = elements.trackList.querySelector('.track-card.is-playing .track-duration');
    if (activeCardTime) activeCardTime.textContent = formatDuration(liveLocalPosition);
  }

  function runProgressLoop() {
    updatePlayerBar();
    updateLyricsPlayer();
    state.progressFrame = window.requestAnimationFrame(runProgressLoop);
  }

  function clearColorTimer() {
    window.clearTimeout(state.colorTimer);
    state.colorTimer = null;
  }

  function setColorFull(cardId) {
    clearColorTimer();
    if (state.current?.cardId !== cardId) return;
    state.colorMode = 'full';
    const cardElement = elements.trackList.querySelector(`[data-card-id="${CSS.escape(cardId)}"]`);
    cardElement?.classList.remove('is-color-revealing');
    cardElement?.classList.add('is-color-full');
  }

  function beginColorReveal(cardId, durationMs = 2000) {
    clearColorTimer();
    state.colorMode = 'revealing';
    state.colorTimer = window.setTimeout(() => setColorFull(cardId), durationMs);
  }

  async function seekTo(targetSeconds) {
    const current = state.current;
    if (!current?.buffer || state.transitioning) return;
    const duration = current.buffer.duration;
    const target = Math.max(0, Math.min(Number(targetSeconds) || 0, Math.max(0, duration - 0.02)));
    if (current.native) {
      applyNativeOffset(current, target);
      updatePlayerBar();
      return;
    }
    if (current.paused) {
      state.current = { ...current, offset: target };
      updatePlayerBar();
      return;
    }

    cancelAutoAdvance();
    const context = await getAudioContext();
    const now = context.currentTime;
    current.replaced = true;
    stopVoice(current, now);

    const when = now + 0.005;
    const nextVoice = createVoice(current.cardId, current.buffer, when, target, 1);
    state.current = nextVoice;
    clearColorTimer();
    state.colorMode = 'full';
    render();
    scheduleAutoAdvance(nextVoice);
  }

  function seekRelative(deltaSeconds) {
    if (!state.current || (!state.current.native && !state.audioContext)) return;
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
    if (voice?.native) {
      voice.cancelled = true;
      try { voice.media.pause(); } catch (_error) {}
      return;
    }
    if (!voice?.source) return;
    voice.cancelled = true;
    try { voice.source.stop(when); } catch (_error) {}
  }

  function cancelAutoAdvance() {
    state.autoAdvanceGeneration += 1;
    if (!state.autoAdvance) return;
    const pendingCardId = state.autoAdvance.nextVoice?.cardId;
    window.clearTimeout(state.autoAdvance.timer);
    stopVoice(state.autoAdvance.nextVoice);
    state.autoAdvance = null;
    releaseAudioBuffer(pendingCardId);
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
      if (!await isCardCached(nextCard)) return;
      const buffer = await loadAudioBuffer(nextCard);
      if (generation !== state.autoAdvanceGeneration || voice.replaced || voice.cancelled || voice.paused) return;
      if (voice.ended) {
        if (!state.current) await startNaturalImmediately(nextCard, buffer);
        return;
      }

      const context = await getAudioContext();
      const startAt = voice.startedAt + Math.max(0, voice.buffer.duration - voice.offset);
      if (startAt <= context.currentTime + 0.025) {
        if (state.current === voice) {
          stopVoice(voice, context.currentTime);
          state.current = null;
          await startNaturalImmediately(nextCard, buffer);
        }
        return;
      }

      const timer = window.setTimeout(async () => {
        if (generation !== state.autoAdvanceGeneration) {
          return;
        }
        state.autoAdvance = null;
        if (state.current !== voice || voice.cancelled || voice.paused) return;
        stopVoice(voice, state.audioContext?.currentTime || 0);
        state.current = null;
        try {
          await startNaturalImmediately(nextCard, buffer);
        } catch (error) {
          console.warn('Não foi possível iniciar a próxima faixa:', error);
        }
      }, Math.max(0, ((startAt - context.currentTime) * 1000) - 35));
      state.autoAdvance = { fromVoice: voice, nextVoice: null, timer };
    } catch (error) {
      console.warn('Não foi possível preparar a próxima faixa:', error);
    }
  }

  async function startNaturalImmediately(card, buffer) {
    const previousVoice = state.current;
    const previousCardId = previousVoice?.cardId;
    cancelAutoAdvance();
    const context = await getAudioContext();
    if (previousVoice) {
      previousVoice.replaced = true;
      stopVoice(previousVoice, context.currentTime);
    }
    const when = context.currentTime + 0.005;
    const voice = createVoice(card.id, buffer, when, 0, 1);
    state.current = voice;
    state.transitionFromId = '';
    state.transitionTargetId = '';
    state.transitioning = false;
    releaseAudioBuffer(previousCardId);
    beginColorReveal(card.id);
    render();
    setStatus(`No ar: “${card.title}”.`);
    scheduleAutoAdvance(voice);
  }

  async function startImmediately(card, buffer) {
    const previousVoice = state.current;
    const previousCardId = previousVoice?.cardId;
    cancelAutoAdvance();
    const context = await getAudioContext();
    if (previousVoice) {
      previousVoice.replaced = true;
      stopVoice(previousVoice, context.currentTime);
    }
    const when = context.currentTime + 0.025;
    const voice = createVoice(card.id, buffer, when, 0, 0);
    voice.gain.gain.linearRampToValueAtTime(1, when + 0.12);
    state.current = voice;
    state.transitionFromId = '';
    state.transitionTargetId = '';
    state.transitioning = false;
    releaseAudioBuffer(previousCardId);
    beginColorReveal(card.id);
    render();
    setStatus(`No ar: “${card.title}”.`);
    scheduleAutoAdvance(voice);
  }

  function pauseCurrent() {
    const voice = state.current;
    if (!voice || voice.paused || (!voice.native && !state.audioContext)) return;
    if (voice.native) {
      clearColorTimer();
      state.colorMode = 'idle';
      voice.offset = currentPosition(voice);
      voice.media.pause();
      voice.paused = true;
      render();
      setStatus(`Pausada: “${getCard(voice.cardId)?.title || 'faixa'}”. Toque novamente para continuar.`);
      return;
    }
    const now = state.audioContext.currentTime;
    clearColorTimer();
    state.colorMode = 'idle';
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
    if (paused.native) {
      applyNativeOffset(paused, paused.offset);
      let playback;
      try {
        playback = paused.media.play();
      } catch (_error) {
        throw new Error('O iPhone bloqueou o áudio. Toque novamente na faixa.');
      }
      try {
        await playback;
      } catch (_error) {
        throw new Error('O iPhone não conseguiu retomar esta música.');
      }
      paused.paused = false;
      beginColorReveal(paused.cardId);
      render();
      setStatus(`No ar: “${getCard(paused.cardId)?.title || 'faixa'}”.`);
      return;
    }
    const context = await getAudioContext();
    const when = context.currentTime + 0.02;
    const voice = createVoice(paused.cardId, paused.buffer, when, paused.offset, 0);
    voice.gain.gain.linearRampToValueAtTime(1, when + 0.1);
    state.current = voice;
    beginColorReveal(voice.cardId);
    render();
    setStatus(`No ar: “${getCard(voice.cardId)?.title || 'faixa'}”.`);
    scheduleAutoAdvance(voice);
  }

  async function playCard(cardId) {
    const requestGeneration = ++state.playRequestGeneration;
    const card = getCard(cardId);
    markCardNotificationSeen(cardId);
    if (!card?.audio) {
      selectCard(cardId);
      showToast('Este container ainda não tem música. Pressione A para adicionar.', true);
      return;
    }
    if (!await ensureCardDownloadedForPlayback(card)) return;
    if (USE_NATIVE_AUDIO_ON_APPLE) {
      if (state.current?.cardId === cardId) {
        if (state.current.paused) await resumeCurrent();
        else pauseCurrent();
        return;
      }
      await startNativeCard(card);
      return;
    }
    await getAudioContext({ fromUserGesture: true });
    if (requestGeneration !== state.playRequestGeneration) return;
    if (state.transitioning) {
      showToast('Aguarde a transição atual terminar.');
      return;
    }
    if (state.current?.cardId === cardId) {
      if (state.current.paused) await resumeCurrent();
      else pauseCurrent();
      return;
    }

    setStatus(`Preparando “${card.title}”…`, true);
    const buffer = await loadAudioBuffer(card);
    if (requestGeneration !== state.playRequestGeneration) return;
    if (!state.current || state.current.paused) {
      if (state.current?.source) stopVoice(state.current);
      await startImmediately(card, buffer);
      return;
    }
    clearTransitionTimers();
    stopVoice(state.current);
    await startNaturalImmediately(card, buffer);
  }

  async function uploadFile(kind, file) {
    if (!state.canEdit) throw new Error('Somente o administrador pode enviar arquivos.');
    const card = getCard(state.selectedId);
    if (!card) throw new Error('Segure um container por 500 ms para selecioná-lo.');
    if (!file) return;
    const isAudio = kind === 'audio';
    const maxBytes = 220 * 1024 * 1024;
    if (!isAudio) throw new Error('Os containers usam apenas o degradê com o nome da faixa.');
    if (file.size > maxBytes) throw new Error('A faixa pode ter no máximo 220 MB.');

    state.uploading = true;
      setStatus('Enviando música para o R2…', true);
    try {
      const query = new URLSearchParams({ cardId: card.id, name: file.name });
      const payload = await apiJson(`${API_ROOT}/assets/${kind}?${query}`, {
        method: 'POST',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file
      });
      card[kind] = payload.asset;
      if (isAudio) {
        card.approvedAt = '';
        card.approvedByUserId = 0;
        card.approvedByName = '';
      }
      if (isAudio && /^Faixa\s+\d+$/i.test(card.title)) {
        card.title = file.name.replace(/\.[^.]+$/, '').trim().slice(0, 120) || card.title;
      }
      state.downloadStates.set(card.id, 'idle');
      render();
      await saveProject({ quiet: false });
      showToast('Música salva no R2.');
    } finally {
      state.uploading = false;
      elements.audioInput.value = '';
    }
  }

  function openPicker(kind) {
    if (!state.canEdit) return;
    if (!getCard(state.selectedId)) {
      showToast('Segure um container por 500 ms para selecioná-lo.', true);
      return;
    }
    elements.audioInput.click();
  }

  function removeSelectedCard() {
    if (!state.canEdit) return;
    const card = getCard(state.selectedId);
    if (!card) return;
    if (!window.confirm(`Remover o container “${card.title}” do musical?`)) return;
    if (state.current?.cardId === card.id) {
      cancelAutoAdvance();
      clearColorTimer();
      stopVoice(state.current);
      state.current = null;
      state.colorMode = 'idle';
    }
    state.project.cards = state.project.cards.filter((entry) => entry.id !== card.id);
    state.selectedId = '';
    render();
    saveProject({ quiet: false }).catch(() => {});
  }

  function bindControls() {
    elements.refreshButton.addEventListener('click', () => {
      refreshProject().catch((error) => {
        setStatus('Não foi possível atualizar o musical.');
        showToast(error.message || 'Falha ao atualizar.', true);
      });
    });
    elements.addCardButton.addEventListener('click', openAddCardDialog);
    elements.sortButton.addEventListener('click', toggleSortMode);
    elements.addCardForm.addEventListener('submit', (event) => {
      submitNewCard(event).catch((error) => showToast(error.message, true));
    });
    elements.closeAddCardDialog.addEventListener('click', () => closeDialog(elements.addCardDialog));
    elements.commentForm.addEventListener('submit', (event) => {
      submitComment(event).catch((error) => showToast(error.message, true));
    });
    elements.replyForm.addEventListener('submit', (event) => {
      submitReply(event).catch((error) => showToast(error.message, true));
    });
    elements.editCommentButton.addEventListener('click', () => {
      editCommentEntry(activeComment()).catch((error) => showToast(error.message, true));
    });
    elements.deleteCommentButton.addEventListener('click', () => {
      const comment = activeComment();
      if (!comment) return;
      deleteComment(state.activeCommentsCardId, comment.id).catch((error) => showToast(error.message, true));
    });
    elements.commenterIdentity.addEventListener('click', () => {
      const identity = readCommenterIdentity();
      state.afterCommenterName = null;
      elements.commenterNameInput.value = identity.name;
      showDialog(elements.commenterNameDialog);
      window.setTimeout(() => elements.commenterNameInput.focus(), 30);
    });
    elements.replyCommenterIdentity.addEventListener('click', () => elements.commenterIdentity.click());
    elements.commenterNameForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const name = elements.commenterNameInput.value.trim().slice(0, 64);
      if (!name) {
        elements.commenterNameInput.focus();
        return;
      }
      saveCommenterName(name);
      closeDialog(elements.commenterNameDialog);
      const next = state.afterCommenterName;
      state.afterCommenterName = null;
      if (next) window.setTimeout(next, 0);
    });
    elements.closeCommenterNameDialog.addEventListener('click', () => {
      state.afterCommenterName = null;
      closeDialog(elements.commenterNameDialog);
    });
    elements.approveTrackButton.addEventListener('click', () => {
      approveTrack().catch((error) => showToast(error.message, true));
    });
    elements.closeCommentsDialog.addEventListener('click', () => closeDialog(elements.commentsDialog));
    elements.closeCommentDetailDialog.addEventListener('click', () => {
      state.activeCommentId = '';
      closeDialog(elements.commentDetailDialog);
    });
    [elements.addCardDialog, elements.commentsDialog, elements.commentDetailDialog, elements.commenterNameDialog, elements.characterDialog].forEach((dialog) => {
      dialog.addEventListener('click', (event) => {
        if (event.target !== dialog) return;
        if (dialog === elements.commentDetailDialog) state.activeCommentId = '';
        if (dialog === elements.commenterNameDialog) state.afterCommenterName = null;
        closeDialog(dialog);
      });
    });
    elements.closeDownloadPrompt.addEventListener('click', closeDownloadPrompt);
    elements.confirmTrackDownload.addEventListener('click', () => {
      downloadPromptTrack().catch((error) => showToast(error.message, true));
    });
    elements.downloadPromptDialog.addEventListener('click', (event) => {
      if (event.target === elements.downloadPromptDialog) closeDownloadPrompt();
    });
    elements.downloadPromptDialog.addEventListener('cancel', (event) => {
      if (state.downloadPromptBusy) {
        event.preventDefault();
        return;
      }
      state.downloadPromptCardId = '';
    });
    elements.lyricsBackButton.addEventListener('click', closeLyrics);
    elements.lyricsEditButton.addEventListener('click', openLyricsEditor);
    elements.lyricsCloseEditor.addEventListener('click', () => {
      elements.lyricsAdminPanel.hidden = true;
    });
    elements.generatePlainLyrics.addEventListener('click', () => {
      generateLyrics('plain').catch((error) => showToast(error.message, true));
    });
    elements.generateTimedLyrics.addEventListener('click', () => {
      generateLyrics('timesync').catch((error) => showToast(error.message, true));
    });
    elements.lyricsSaveButton.addEventListener('click', () => {
      saveLyricsEdits().catch((error) => showToast(error.message, true));
    });
    elements.lyricsManualSyncButton.addEventListener('click', () => {
      startManualSync().catch((error) => showToast(error.message, true));
    });
    elements.lyricsClearTimesyncButton.addEventListener('click', () => {
      clearLyricsTimesync().catch((error) => showToast(error.message, true));
    });
    let manualSyncPointerHandled = false;
    elements.manualSyncAdvanceButton.addEventListener('pointerdown', (event) => {
      if (event.button != null && event.button !== 0) return;
      event.preventDefault();
      manualSyncPointerHandled = true;
      window.setTimeout(() => { manualSyncPointerHandled = false; }, 700);
      advanceManualSync().catch((error) => showToast(error.message, true));
    });
    elements.manualSyncAdvanceButton.addEventListener('click', () => {
      if (manualSyncPointerHandled) {
        manualSyncPointerHandled = false;
        return;
      }
      advanceManualSync().catch((error) => showToast(error.message, true));
    });
    elements.manualSyncCancelButton.addEventListener('click', () => {
      cancelManualSync();
      showToast('Sync manual cancelado; nenhuma marcação foi salva.');
    });
    elements.lyricsCharacterSwitch.addEventListener('click', () => openCharacterDialog('pov'));
    elements.closeCharacterDialog.addEventListener('click', () => closeDialog(elements.characterDialog));
    elements.characterAddToggle.addEventListener('click', () => {
      state.characterDialogMode = 'add';
      elements.characterDialogTitle.textContent = 'Adicionar personagem';
      elements.characterAddToggle.hidden = true;
      elements.characterAddForm.hidden = false;
      renderCharacterGrid();
      elements.characterNameInput.focus();
    });
    elements.characterAddForm.addEventListener('submit', (event) => {
      createCharacter(event).catch((error) => showToast(error.message, true));
    });
    elements.characterImageInput.addEventListener('change', () => {
      elements.characterImageLabel.textContent = elements.characterImageInput.files?.[0]?.name || 'Escolher PNG';
    });
    elements.lyricsPlayButton.addEventListener('click', () => {
      toggleLyricsPlayback().catch((error) => showToast(error.message, true));
    });
    elements.lyricsPreviousTrackButton.addEventListener('click', () => {
      changeLyricsTrack(-1).catch((error) => showToast(error.message, true));
    });
    elements.lyricsNextTrackButton.addEventListener('click', () => {
      changeLyricsTrack(1).catch((error) => showToast(error.message, true));
    });
    elements.lyricsRewindButton.addEventListener('click', () => {
      seekLyricsRelative(-5).catch((error) => showToast(error.message, true));
    });
    elements.lyricsForwardButton.addEventListener('click', () => {
      seekLyricsRelative(5).catch((error) => showToast(error.message, true));
    });
    elements.lyricsSeekSlider.addEventListener('pointerdown', () => {
      state.lyricsScrubbing = true;
    });
    elements.lyricsSeekSlider.addEventListener('input', () => {
      state.lyricsScrubbing = true;
      elements.lyricsCurrentTime.textContent = formatTime(elements.lyricsSeekSlider.value);
    });
    elements.lyricsSeekSlider.addEventListener('change', () => {
      const card = getCard(state.lyricsCardId);
      const target = Number(elements.lyricsSeekSlider.value || 0);
      state.lyricsScrubbing = false;
      if (!card) return;
      const operation = state.selectedCharacterId
        ? (() => {
            const clips = buildPovClips(card, state.selectedCharacterId);
            let index = clips.findIndex((clip) => target >= clip.start && target < clip.end);
            if (index < 0) index = Math.max(0, clips.findIndex((clip) => clip.start > target));
            return startPovPlayback(card, state.selectedCharacterId, index, target);
          })()
        : ensureLyricsCardAt(card, target);
      operation.catch((error) => showToast(error.message, true));
    });
    document.addEventListener('click', (event) => {
      if (!event.target.closest('#characterMenu')) elements.characterMenu.hidden = true;
    });
    elements.downloadAllButton.addEventListener('click', () => {
      downloadAll().catch((error) => {
        setStatus('O download foi interrompido.');
        showToast(error.message, true);
      });
    });
    elements.chooseAudioButton.addEventListener('click', () => openPicker('audio'));
    elements.removeCardButton.addEventListener('click', removeSelectedCard);
    elements.closeSelectionButton.addEventListener('click', () => {
      state.selectedId = '';
      render();
    });
    elements.audioInput.addEventListener('change', () => {
      uploadFile('audio', elements.audioInput.files?.[0]).catch((error) => showToast(error.message, true));
    });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        recoverAppleAudio();
        flushPendingComments({ announce: true }).catch(() => {});
      }
    });
    window.addEventListener('pageshow', () => {
      recoverAppleAudio();
      flushPendingComments({ announce: true }).catch(() => {});
    });
    window.addEventListener('online', () => {
      cacheCharacterImages().catch(() => {});
      if (!state.pendingComments.length) return;
      setStatus('Conexão restabelecida. Enviando comentários pendentes…', true);
      flushPendingComments({ announce: true }).finally(() => {
        setStatus(state.pendingComments.length
          ? 'Os comentários continuam salvos neste aparelho.'
          : 'Comentários offline enviados.');
      });
    });
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type !== 'musical-kelly-comments-synced') return;
        reloadPendingComments({ renderNow: false })
          .then(async () => {
            const payload = await apiJson(`${API_ROOT}/project`, { cache: 'no-store' });
            applyProjectPayload(payload);
            showToast(event.data.count === 1
              ? 'Comentário offline enviado para o musical.'
              : 'Comentários offline enviados para o musical.');
          })
          .catch(() => {});
      });
    }
    elements.titleInput.addEventListener('input', () => {
      const card = getCard(state.selectedId);
      if (!card) return;
      card.title = elements.titleInput.value.slice(0, 120) || 'Faixa';
      queueProjectSave();
    });
    elements.titleInput.addEventListener('blur', () => saveProject().catch(() => {}));
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !elements.lyricsScreen.hidden) {
        if (state.manualSync) cancelManualSync();
        else if (!elements.lyricsAdminPanel.hidden) elements.lyricsAdminPanel.hidden = true;
        else closeLyrics();
        return;
      }
      const tagName = document.activeElement?.tagName;
      const isTyping = tagName === 'INPUT' || tagName === 'TEXTAREA' || document.activeElement?.isContentEditable;
      if (event.key === 'ArrowDown' && state.manualSync && !isTyping && !event.repeat) {
        event.preventDefault();
        advanceManualSync().catch((error) => showToast(error.message, true));
        return;
      }
      if (!state.canEdit || event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
      if (isTyping) return;
      if (event.key.toLowerCase() === 'a') {
        event.preventDefault();
        openPicker('audio');
      }
    });
  }

  function registerOfflineSupport() {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/musical-kelly/sw.js', { scope: '/musical-kelly' })
      .then(() => {
        if (state.pendingComments.length) registerCommentBackgroundSync();
      })
      .catch(() => {});
  }

  async function init() {
    bindControls();
    registerOfflineSupport();
    runProgressLoop();
    await reloadPendingComments({ renderNow: false }).catch(() => {
      state.pendingComments = [];
    });
    try {
      const payload = await apiJson(`${API_ROOT}/project`);
      applyProjectPayload(payload);
      setStatus(state.canEdit
        ? 'Pronto. Toque para reproduzir; segure 500 ms para editar.'
        : 'Pronto. Toque para reproduzir ou use + para adicionar um container.');
      refreshDownloadStates().catch(() => {});
    } catch (error) {
      const snapshot = readProjectSnapshot();
      if (snapshot) {
        const permissions = snapshot.permissions || {};
        state.canEdit = permissions.canEdit === true;
        state.canContribute = permissions.canContribute !== false;
        state.canComment = permissions.canComment !== false;
        state.canApprove = permissions.canApprove !== false;
        state.canDeleteComments = permissions.canDeleteComments === true;
        state.canReorder = permissions.canReorder === true;
        state.viewerUserId = Math.max(0, Number(permissions.viewerUserId) || 0);
        state.characters = Array.isArray(snapshot.characters) ? snapshot.characters : [];
        applyCollaborationProject(snapshot.project);
        setStatus('Mostrando a última versão salva enquanto a conexão volta.');
        showToast('Conexão instável. Exibindo a última versão salva.', true);
      } else {
        setStatus('Não foi possível abrir o musical.');
        showToast(error.message || 'Falha ao carregar.', true);
      }
    }
    if (state.pendingComments.length) {
      registerCommentBackgroundSync();
      flushPendingComments({ announce: true }).catch(() => {});
    }
  }

  init();
})();
