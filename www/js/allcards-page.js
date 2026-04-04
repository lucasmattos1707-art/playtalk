(function initPlaytalkAllCardsPage() {
  const CARDS_CACHE_STORAGE_KEY = 'playtalk-flashcards-cards-v2';
  const USER_PROGRESS_STORAGE_KEY = 'playtalk-flashcards-progress-v3';
  const OWNED_STORAGE_KEY = 'playtalk-flashcards-owned-v2';
  const DATA_MANIFEST_REMOTE_PATH = '/api/flashcards/manifest';
  const FLASHCARDS_LOCAL_SOURCE_PREFIX = 'allcards';
  const STATUS_SWAP_MS = 2000;
  const REVIEW_PHASES = {
    1: { durationMs: 6 * 60 * 60 * 1000 },
    2: { durationMs: 3 * 24 * 60 * 60 * 1000 },
    3: { durationMs: 7 * 24 * 60 * 60 * 1000 },
    4: { durationMs: 12 * 24 * 60 * 60 * 1000 },
    5: { durationMs: 30 * 24 * 60 * 60 * 1000 }
  };

  const els = {
    grid: document.getElementById('allcards-grid'),
    empty: document.getElementById('allcards-empty'),
    total: document.getElementById('allcards-total'),
    adminToolbar: document.getElementById('allcards-admin-toolbar'),
    adminHiddenToggleBtn: document.getElementById('allcards-admin-hidden-toggle-btn'),
    adminUploadBtn: document.getElementById('allcards-admin-upload-btn'),
    adminUploadInput: document.getElementById('allcards-admin-upload-input'),
    adminUploadStatus: document.getElementById('allcards-admin-upload-status')
  };

  const state = {
    userId: 0,
    isAdmin: false,
    cards: [],
    decks: [],
    adminExpandedSource: '',
    adminPromptBySource: Object.create(null),
    adminPreviewBySource: Object.create(null),
    adminBusyBySource: Object.create(null),
    adminStatusBySource: Object.create(null),
    adminToolbarBusy: false,
    adminToolbarStatus: '',
    showHiddenDecks: false,
    showPercent: false,
    refreshTimer: 0,
    swapTimer: 0
  };

  function safeText(value) {
    return typeof value === 'string' ? value.trim() : '';
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

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function storageKeyForUser(baseKey, userId = state.userId) {
    const normalizedUserId = Number(userId) || 0;
    return normalizedUserId ? `${baseKey}:${normalizedUserId}` : baseKey;
  }

  function getNowMs() {
    return Date.now();
  }

  function readCardsCache() {
    try {
      const parsed = JSON.parse(localStorage.getItem(CARDS_CACHE_STORAGE_KEY) || 'null');
      return Array.isArray(parsed?.cards) ? parsed.cards : [];
    } catch (_error) {
      return [];
    }
  }

  function saveCardsCache(cards) {
    try {
      localStorage.setItem(CARDS_CACHE_STORAGE_KEY, JSON.stringify({
        savedAt: Date.now(),
        cards: Array.isArray(cards) ? cards : []
      }));
    } catch (_error) {
      // ignore
    }
  }

  function isAdminSessionUser(user) {
    if (!user || typeof user !== 'object') return false;
    if (user.is_admin === true || user.isAdmin === true) return true;
    const username = safeText(user?.username || user?.email).toLowerCase();
    return username === 'admin' || username === 'adm' || username === 'adminst';
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
    const targetPhaseIndex = Math.max(1, Math.min(5, Number.parseInt(raw?.targetPhaseIndex, 10) || 1));
    return createProgressRecord(cardId, {
      phaseIndex: Math.max(0, Math.min(5, Number.parseInt(raw?.phaseIndex, 10) || 0)),
      targetPhaseIndex,
      status: raw?.status === 'ready' ? 'ready' : 'memorizing',
      memorizingStartedAt: Number.isFinite(Number(raw?.memorizingStartedAt)) ? Number(raw.memorizingStartedAt) : getNowMs(),
      memorizingDurationMs: Number.isFinite(Number(raw?.memorizingDurationMs))
        ? Number(raw.memorizingDurationMs)
        : (REVIEW_PHASES[targetPhaseIndex]?.durationMs || REVIEW_PHASES[1].durationMs),
      availableAt: Number.isFinite(Number(raw?.availableAt)) ? Number(raw.availableAt) : getNowMs(),
      returnedAt: Number.isFinite(Number(raw?.returnedAt)) ? Number(raw.returnedAt) : 0,
      createdAt: Number.isFinite(Number(raw?.createdAt)) ? Number(raw.createdAt) : getNowMs()
    });
  }

  function readOwnedIdsForUser(userId = state.userId) {
    try {
      const parsed = JSON.parse(localStorage.getItem(storageKeyForUser(OWNED_STORAGE_KEY, userId)) || '[]');
      return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
    } catch (_error) {
      return [];
    }
  }

  function readUserProgressForUser(userId = state.userId) {
    try {
      const parsed = JSON.parse(localStorage.getItem(storageKeyForUser(USER_PROGRESS_STORAGE_KEY, userId)) || 'null');
      const records = Array.isArray(parsed) ? parsed.map(normalizeProgressRecord).filter(Boolean) : [];
      if (records.length) {
        return new Map(records.map((record) => [record.cardId, record]));
      }
    } catch (_error) {
      // ignore
    }

    const now = getNowMs();
    return new Map(readOwnedIdsForUser(userId).map((cardId, index) => [cardId, createProgressRecord(cardId, {
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

  function saveUserProgressForUser(userId, progressMap) {
    const normalizedUserId = Number(userId) || 0;
    if (!normalizedUserId) return;
    try {
      localStorage.setItem(
        storageKeyForUser(USER_PROGRESS_STORAGE_KEY, normalizedUserId),
        JSON.stringify(Array.from(progressMap.values()))
      );
      localStorage.setItem(
        storageKeyForUser(OWNED_STORAGE_KEY, normalizedUserId),
        JSON.stringify(Array.from(progressMap.keys()))
      );
    } catch (_error) {
      // ignore
    }
  }

  function progressPercent(record) {
    if (!record || record.status !== 'memorizing') return 100;
    const total = Math.max(1, Number(record.memorizingDurationMs) || 1);
    const elapsed = Math.max(0, getNowMs() - (Number(record.memorizingStartedAt) || 0));
    return Math.max(0, Math.min(100, (elapsed / total) * 100));
  }

  function resolveCardImage(card) {
    return safeText(card?.imageDisplayUrl || card?.imageUrl || card?.imagem || card?.image);
  }

  function fallbackLabel(card) {
    return safeText(card?.english || card?.portuguese || card?.deckTitle || 'FlashCard');
  }

  function deckCountLabel(count) {
    const normalized = Math.max(0, Number.parseInt(count, 10) || 0);
    return `${normalized} FlashCard${normalized === 1 ? '' : 's'}`;
  }

  function normalizeDeckSource(value) {
    return safeText(value).toLowerCase();
  }

  function sortDecks() {
    state.decks = Array.isArray(state.decks) ? state.decks.slice() : [];
    state.decks.sort((left, right) => String(left?.title || '').localeCompare(String(right?.title || ''), 'pt-BR', {
      sensitivity: 'base',
      numeric: true
    }));
  }

  function findDeckIndexBySource(source) {
    const normalizedSource = normalizeDeckSource(source);
    if (!normalizedSource) return -1;
    return state.decks.findIndex((deck) => normalizeDeckSource(deck?.source) === normalizedSource);
  }

  function buildDefaultDeckPrompt(deck) {
    const title = safeText(deck?.title) || 'Deck';
    return `Create a premium square 1:1 cover image for a language-learning flashcard deck titled "${title}". No text, no logo, no watermark.`;
  }

  function readDeckPrompt(source, fallbackDeck) {
    const normalizedSource = normalizeDeckSource(source || fallbackDeck?.source);
    if (!normalizedSource) return '';
    const cachedPrompt = safeText(state.adminPromptBySource[normalizedSource]);
    if (cachedPrompt) return cachedPrompt;
    const defaultPrompt = buildDefaultDeckPrompt(fallbackDeck || {});
    state.adminPromptBySource[normalizedSource] = defaultPrompt;
    return defaultPrompt;
  }

  function upsertDeckFromServer(deckPayload) {
    const source = safeText(deckPayload?.source);
    if (!source) return null;
    const mergedDeck = {
      source,
      title: safeText(deckPayload?.title) || 'Deck',
      count: Math.max(0, Number.parseInt(deckPayload?.count, 10) || 0),
      coverImage: safeText(deckPayload?.coverImage),
      isHidden: Boolean(deckPayload?.isHidden)
    };
    const deckIndex = findDeckIndexBySource(source);
    if (deckIndex >= 0) {
      state.decks[deckIndex] = { ...state.decks[deckIndex], ...mergedDeck };
    } else {
      state.decks.push(mergedDeck);
    }
    sortDecks();
    return mergedDeck;
  }

  function setDeckStatus(source, value) {
    const normalizedSource = normalizeDeckSource(source);
    if (!normalizedSource) return;
    const nextValue = safeText(value);
    if (!nextValue) {
      delete state.adminStatusBySource[normalizedSource];
      return;
    }
    state.adminStatusBySource[normalizedSource] = nextValue;
  }

  function setAdminToolbarStatus(value) {
    state.adminToolbarStatus = safeText(value);
    updateAdminToolbar();
  }

  function setAdminToolbarBusy(value) {
    state.adminToolbarBusy = value === true;
    updateAdminToolbar();
  }

  function updateAdminToolbar() {
    if (!els.adminToolbar || !els.adminUploadBtn || !els.adminUploadStatus) return;
    els.adminToolbar.hidden = !state.isAdmin;
    if (els.adminHiddenToggleBtn) {
      els.adminHiddenToggleBtn.disabled = state.adminToolbarBusy;
      els.adminHiddenToggleBtn.textContent = state.showHiddenDecks ? 'Esconder ocultos' : 'Mostrar ocultos';
    }
    els.adminUploadBtn.disabled = state.adminToolbarBusy;
    els.adminUploadBtn.textContent = state.adminToolbarBusy ? 'Enviando decks...' : 'Enviar decks';
    els.adminUploadStatus.textContent = state.adminToolbarStatus;
  }

  function setDeckBusy(source, busy) {
    const normalizedSource = normalizeDeckSource(source);
    if (!normalizedSource) return;
    if (busy) {
      state.adminBusyBySource[normalizedSource] = true;
      return;
    }
    delete state.adminBusyBySource[normalizedSource];
  }

  function resolveAdminDeckPreview(source) {
    return safeText(state.adminPreviewBySource[normalizeDeckSource(source)]);
  }

  function resolveAdminDeckStatus(deck) {
    const source = normalizeDeckSource(deck?.source);
    const statusTextValue = safeText(state.adminStatusBySource[source]);
    if (statusTextValue) return statusTextValue;
    if (deck?.isHidden) return 'Oculto para jogadores.';
    return '';
  }

  function isDeckBusy(source) {
    return Boolean(state.adminBusyBySource[normalizeDeckSource(source)]);
  }

  function hydrateCards(progressMap) {
    const cache = readCardsCache();
    const cardMap = new Map(cache.map((card) => [safeText(card?.id), card]));
    const records = progressMap instanceof Map ? progressMap : readUserProgressForUser(state.userId);

    state.cards = Array.from(records.values())
      .map((progress) => {
        const card = cardMap.get(progress.cardId);
        if (!card) return null;
        return {
          ...card,
          progress
        };
      })
      .filter(Boolean)
      .sort((left, right) => {
        const leftPin = left.progress.status === 'memorizing'
          ? Number(left.progress.availableAt) || 0
          : Number(left.progress.returnedAt || left.progress.createdAt) || 0;
        const rightPin = right.progress.status === 'memorizing'
          ? Number(right.progress.availableAt) || 0
          : Number(right.progress.returnedAt || right.progress.createdAt) || 0;
        return rightPin - leftPin;
      });
  }

  function unresolvedProgressCount(progressMap) {
    const cache = readCardsCache();
    const cardIds = new Set(cache.map((card) => safeText(card?.id)).filter(Boolean));
    return Array.from(progressMap.values()).filter((progress) => !cardIds.has(progress.cardId)).length;
  }

  function normalizeText(value) {
    return safeText(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s'/%+=-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function slug(value) {
    return normalizeText(value).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'card';
  }

  function flattenPayload(fileName, payload, options = {}) {
    const title = safeText(payload?.title) || fileName.replace(/\.json$/i, '');
    const sourceKey = safeText(options.sourceKey || fileName) || fileName;
    const idSource = safeText(options.idSource || fileName) || fileName;
    const items = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.items)
        ? payload.items
        : [];

    return items.map((item, index) => ({
      id: `${slug(idSource)}-${slug(title)}-${index}`,
      source: sourceKey,
      sourceIndex: index,
      deckTitle: title,
      imageUrl: safeText(item?.imagem || item?.image),
      english: safeText(item?.nomeIngles || item?.english || item?.word),
      portuguese: safeText(item?.nomePortugues || item?.portuguese || item?.translation),
      audioUrl: safeText(item?.audio || item?.audioUrl),
      category: safeText(item?.categoria || title)
    }));
  }

  function normalizeFlashcardsDataPath(value) {
    const cleaned = safeText(value);
    if (!cleaned) return '';
    if (/^https?:\/\//i.test(cleaned)) return cleaned;
    return buildApiUrl(`/${cleaned.replace(/^\/+/, '')}`);
  }

  function withNoCacheUrl(value) {
    const normalized = normalizeFlashcardsDataPath(value);
    if (!normalized) return '';
    const separator = normalized.includes('?') ? '&' : '?';
    return `${normalized}${separator}_pt=${Date.now()}`;
  }

  function buildFlashcardsPublicUrl(objectKey) {
    const encodedKey = safeText(objectKey)
      .split('/')
      .filter(Boolean)
      .map((segment) => encodeURIComponent(segment))
      .join('/');
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
    const candidates = [safeText(file?.path), safeText(file?.source), safeText(file?.name)].filter(Boolean);

    for (const candidate of candidates) {
      if (isFlashcardsDeckPath(candidate)) {
        return /^https?:\/\//i.test(candidate) ? candidate : `/${candidate.replace(/^\/+/, '')}`;
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

  function extractManifestFiles(payload) {
    const files = Array.isArray(payload?.files)
      ? payload.files
      : (Array.isArray(payload?.data?.files) ? payload.data.files : []);
    return Array.isArray(files) ? files : [];
  }

  async function fetchRemoteManifestFiles() {
    const manifestPath = state.isAdmin
      ? `${DATA_MANIFEST_REMOTE_PATH}${state.showHiddenDecks ? '?includeHidden=1' : ''}`
      : DATA_MANIFEST_REMOTE_PATH;
    const response = await fetch(withNoCacheUrl(buildApiUrl(manifestPath)), {
      cache: 'no-store',
      headers: buildAuthHeaders(),
      credentials: 'include'
    });
    const payload = await response.json().catch(() => ({}));
    const manifestFiles = extractManifestFiles(payload);
    if (!response.ok) {
      throw new Error(payload?.message || 'Nao consegui abrir o manifesto dos flashcards.');
    }
    return manifestFiles;
  }

  async function fetchRemoteDeckCatalog() {
    const manifestFiles = await fetchRemoteManifestFiles();
    return manifestFiles
      .map((file) => {
        const sourceKey = safeText(file?.source || file?.name || file?.path);
        const title = safeText(file?.title) || safeText(file?.name || file?.path || sourceKey) || 'Deck';
        const count = Math.max(0, Number.parseInt(file?.count, 10) || 0);
        return {
          source: sourceKey,
          title,
          count,
          coverImage: safeText(file?.coverImage),
          isHidden: Boolean(file?.isHidden),
          canDelete: file?.canDelete !== false,
          originType: safeText(file?.originType || 'levels'),
          dayKey: safeText(file?.dayKey)
        };
      })
      .filter((deck) => safeText(deck.source))
      .sort((left, right) => left.title.localeCompare(right.title, 'pt-BR', {
        sensitivity: 'base',
        numeric: true
      }));
  }

  async function fetchRemoteCardsCatalog() {
    const manifestFiles = await fetchRemoteManifestFiles();
    const files = manifestFiles.map((file) => ({
      name: file.name || file.path || file.source || 'deck.json',
      path: resolveManifestDeckPath(file),
      sourceKey: safeText(file?.source || file?.name || file?.path),
      idSource: safeText(file?.source || file?.name || file?.path)
    }));

    const responses = await Promise.all(files.map(async (file) => {
      const deckResponse = await fetch(withNoCacheUrl(file.path), {
        cache: 'no-store',
        headers: buildAuthHeaders(),
        credentials: 'include'
      });
      if (!deckResponse.ok) {
        throw new Error(`Nao consegui abrir o deck "${safeText(file.name) || 'deck.json'}".`);
      }
      const deckPayload = await deckResponse.json();
      return flattenPayload(file.name, deckPayload, {
        sourceKey: file.sourceKey,
        idSource: file.idSource
      });
    }));

    const cards = responses.flatMap((entry) => Array.isArray(entry) ? entry : []);
    saveCardsCache(cards);
    return cards;
  }

  function formatPercent(value) {
    return `${Number(value || 0).toFixed(2).replace('.', ',')}% Complete`;
  }

  function statusText(card) {
    const progress = Math.max(0, Math.min(100, progressPercent(card.progress)));
    if (state.showPercent) {
      return formatPercent(progress);
    }
    return card.progress?.status === 'memorizing' ? 'Memorizing' : 'Complete';
  }

  function updateSummary() {
    if (state.isAdmin) {
      const totalDecks = Array.isArray(state.decks) ? state.decks.length : 0;
      const hiddenDecks = Array.isArray(state.decks)
        ? state.decks.filter((deck) => Boolean(deck?.isHidden)).length
        : 0;
      if (els.total) {
        const hiddenSuffix = hiddenDecks > 0 ? ` (${hiddenDecks} oculto${hiddenDecks === 1 ? '' : 's'})` : '';
        els.total.textContent = `${totalDecks} Deck${totalDecks === 1 ? '' : 's'} disponiveis${hiddenSuffix}`;
      }
      return;
    }

    const totalCards = state.cards.length;
    if (els.total) {
      els.total.textContent = `${totalCards} FlashCards`;
    }
  }

  function renderEyeSlashIcon() {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path fill="currentColor" d="M3.3 2.3 2 3.6l3.1 3.1A12.45 12.45 0 0 0 1 12s3.8 7 11 7c2.2 0 4.1-.6 5.7-1.5l3 3 1.3-1.3L3.3 2.3Zm8.7 6.3 3.3 3.3a4 4 0 0 1-4.7-4.7L12 8.6Zm0 8.4c-5.2 0-8.2-4.5-8.7-5 .3-.6 1.5-2.4 3.5-3.7l1.5 1.5a4 4 0 0 0 5.4 5.4l1.7 1.7a8.47 8.47 0 0 1-3.4.1Zm10-5c-.4.8-1.7 2.9-3.9 4.2l-1.5-1.5a4 4 0 0 0-5.5-5.5L9.6 7.7c.8-.4 1.5-.7 2.4-.7 5.2 0 8.2 4.5 8.7 5Z"/>
      </svg>
    `;
  }

  function renderMagicWandIcon() {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path fill="currentColor" d="M14.6 3.2 13 6.7 9.4 8.3 13 9.9l1.6 3.5 1.6-3.5 3.5-1.6-3.5-1.6-1.6-3.5Zm-9.2 10L3.2 17l3.8-2.2L9.2 11l2.2 3.8 3.8 2.2-3.8 2.2L9.2 23l-2.2-3.8L3.2 17l2.2-3.8ZM16.2 11l-1.2 1.2 2.6 2.6-6.8 6.8L9.6 20l6.8-6.8L19 15.8l1.2-1.2-4-3.6Z"/>
      </svg>
    `;
  }

  function renderTrashIcon() {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path fill="currentColor" d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-2 6h2v8H7V9Zm4 0h2v8h-2V9Zm4 0h2v8h-2V9ZM6 21a2 2 0 0 1-2-2V8h16v11a2 2 0 0 1-2 2H6Z"/>
      </svg>
    `;
  }

  function resolveDeckDisplayImage(deck) {
    const preview = resolveAdminDeckPreview(deck?.source);
    if (preview) return preview;
    return safeText(deck?.coverImage);
  }

  function renderAdminDeckCard(deck) {
    const source = safeText(deck?.source);
    const sourceKey = normalizeDeckSource(source);
    const expanded = normalizeDeckSource(state.adminExpandedSource) === sourceKey;
    const busy = isDeckBusy(source);
    const isHidden = Boolean(deck?.isHidden);
    const prompt = readDeckPrompt(source, deck);
    const promptId = `deck-cover-prompt-${slug(sourceKey || deck?.title || 'deck')}`;
    const preview = resolveAdminDeckPreview(source);
    const imageUrl = resolveDeckDisplayImage(deck);
    const status = resolveAdminDeckStatus(deck);
    const visibilityLabel = isHidden ? 'Mostrar album' : 'Ocultar album';
    const visibilityClass = isHidden ? 'is-active' : '';
    const canApprove = Boolean(preview) && !busy;
    const canDelete = Boolean(deck?.canDelete);
    const deleteDisabled = busy || !isHidden || !canDelete;
    const deleteTitle = !canDelete
      ? 'Esse deck nao pode ser excluido por aqui'
      : (isHidden ? 'Excluir deck para sempre' : 'Oculte o album antes de excluir');

    return `
      <article class="allcards-card ${isHidden ? 'is-hidden-deck' : ''}" role="listitem" data-deck-source="${escapeHtml(source)}">
        <div class="allcards-card__admin-head">
          <p class="allcards-card__status">${escapeHtml(deck.title)}</p>
          <div class="allcards-card__admin-actions">
            <button type="button" class="allcards-admin-btn ${visibilityClass}" data-action="toggle-hidden" data-source="${escapeHtml(source)}" title="${escapeHtml(visibilityLabel)}" ${busy ? 'disabled' : ''}>
              ${renderEyeSlashIcon()}
            </button>
            <button type="button" class="allcards-admin-btn ${expanded ? 'is-active' : ''}" data-action="toggle-cover-panel" data-source="${escapeHtml(source)}" title="Gerar capa IA" ${busy ? 'disabled' : ''}>
              ${renderMagicWandIcon()}
            </button>
            <button type="button" class="allcards-admin-btn is-danger" data-action="delete-deck" data-source="${escapeHtml(source)}" title="${escapeHtml(deleteTitle)}" ${deleteDisabled ? 'disabled' : ''}>
              ${renderTrashIcon()}
            </button>
          </div>
        </div>
        <div class="allcards-card__frame">
          <div class="allcards-card__image">
            ${imageUrl
              ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(deck.title)}">`
              : `<div class="allcards-card__fallback">${escapeHtml(deck.title)}</div>`}
          </div>
        </div>
        <p class="allcards-card__status">${escapeHtml(deckCountLabel(deck.count))}</p>
        ${expanded ? `
          <div class="allcards-card__admin-panel">
            <label class="allcards-card__admin-label" for="${escapeHtml(promptId)}">Prompt da capa</label>
            <input id="${escapeHtml(promptId)}" class="allcards-card__admin-input" type="text" value="${escapeHtml(prompt)}" data-action="cover-prompt" data-source="${escapeHtml(source)}" placeholder="Descreva a capa 1x1 do deck" ${busy ? 'disabled' : ''}>
            <div class="allcards-card__admin-row">
              <button type="button" class="allcards-card__admin-submit" data-action="generate-cover" data-source="${escapeHtml(source)}" ${busy ? 'disabled' : ''}>${busy ? 'Gerando...' : 'Gerar nova'}</button>
              <button type="button" class="allcards-card__admin-submit is-secondary" data-action="approve-cover" data-source="${escapeHtml(source)}" ${canApprove ? '' : 'disabled'}>Aprovar</button>
            </div>
            ${status ? `<p class="allcards-card__admin-status">${escapeHtml(status)}</p>` : ''}
          </div>
        ` : ''}
        <div class="allcards-card__progress" aria-hidden="true">
          <span style="width:100%"></span>
        </div>
      </article>
    `;
  }

  function renderCards() {
    if (!els.grid || !els.empty) return;

    if (state.isAdmin) {
      if (!Array.isArray(state.decks) || !state.decks.length) {
        els.grid.innerHTML = '';
        els.empty.hidden = false;
        els.empty.textContent = 'Nenhum deck disponivel para o admin agora.';
        return;
      }

      els.empty.hidden = true;
      els.grid.innerHTML = state.decks.map((deck) => renderAdminDeckCard(deck)).join('');
      return;
    }

    if (!state.cards.length) {
      els.grid.innerHTML = '';
      els.empty.hidden = false;
      els.empty.textContent = 'Nenhuma carta conquistada ainda.';
      return;
    }

    els.empty.hidden = true;
    els.grid.innerHTML = state.cards.map((card) => {
      const imageUrl = resolveCardImage(card);
      const progress = Math.max(0, Math.min(100, progressPercent(card.progress)));
      return `
        <article class="allcards-card" role="listitem">
          <div class="allcards-card__frame">
            <div class="allcards-card__image">
              ${imageUrl
                ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(fallbackLabel(card))}">`
                : `<div class="allcards-card__fallback">${escapeHtml(fallbackLabel(card))}</div>`}
            </div>
          </div>
          <p class="allcards-card__status">${escapeHtml(statusText(card))}</p>
          <div class="allcards-card__progress" aria-hidden="true">
            <span style="width:${escapeHtml(progress.toFixed(2))}%"></span>
          </div>
        </article>
      `;
    }).join('');
  }

  async function postAdminDeckAction(path, body, fallbackMessage) {
    const response = await fetch(buildApiUrl(path), {
      method: 'POST',
      headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify(body || {})
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.success) {
      throw new Error(payload?.message || fallbackMessage || 'Nao foi possivel concluir a acao.');
    }
    return payload;
  }

  async function toggleDeckVisibility(source) {
    const deckIndex = findDeckIndexBySource(source);
    const currentDeck = deckIndex >= 0 ? state.decks[deckIndex] : null;
    if (!currentDeck) return;

    const nextHidden = !Boolean(currentDeck.isHidden);
    setDeckBusy(source, true);
    setDeckStatus(source, nextHidden ? 'Ocultando para jogadores...' : 'Reativando para jogadores...');
    renderCards();
    try {
      const payload = await postAdminDeckAction(
        '/api/admin/flashcards/public-decks/visibility',
        { source, hidden: nextHidden },
        'Falha ao atualizar visibilidade do deck.'
      );
      upsertDeckFromServer(payload?.deck);
      setDeckStatus(source, nextHidden ? 'Deck oculto para jogadores.' : 'Deck visivel para jogadores.');
      updateSummary();
    } catch (error) {
      setDeckStatus(source, error?.message || 'Falha ao atualizar visibilidade.');
    } finally {
      setDeckBusy(source, false);
      renderCards();
    }
  }

  async function generateDeckCover(source) {
    const deckIndex = findDeckIndexBySource(source);
    const deck = deckIndex >= 0 ? state.decks[deckIndex] : null;
    if (!deck) return;

    const prompt = safeText(readDeckPrompt(source, deck));
    if (!prompt) {
      setDeckStatus(source, 'Digite um prompt antes de gerar a capa.');
      renderCards();
      return;
    }

    setDeckBusy(source, true);
    setDeckStatus(source, 'Gerando capa com OpenAI...');
    renderCards();
    try {
      const payload = await postAdminDeckAction(
        '/api/admin/flashcards/public-decks/generate-cover',
        { source, prompt },
        'Falha ao gerar capa com OpenAI.'
      );
      if (payload?.deck) {
        upsertDeckFromServer(payload.deck);
      }
      const previewDataUrl = safeText(payload?.dataUrl);
      if (!previewDataUrl) {
        throw new Error('A OpenAI nao retornou uma imagem valida.');
      }
      state.adminPreviewBySource[normalizeDeckSource(source)] = previewDataUrl;
      setDeckStatus(source, 'Previa pronta. Toque em Aprovar para publicar.');
    } catch (error) {
      setDeckStatus(source, error?.message || 'Falha ao gerar a capa.');
    } finally {
      setDeckBusy(source, false);
      renderCards();
    }
  }

  async function approveDeckCover(source) {
    const normalizedSource = normalizeDeckSource(source);
    const previewDataUrl = safeText(state.adminPreviewBySource[normalizedSource]);
    if (!previewDataUrl) {
      setDeckStatus(source, 'Gere uma previa antes de aprovar.');
      renderCards();
      return;
    }

    setDeckBusy(source, true);
    setDeckStatus(source, 'Publicando capa no deck...');
    renderCards();
    try {
      const payload = await postAdminDeckAction(
        '/api/admin/flashcards/public-decks/approve-cover',
        { source, imageDataUrl: previewDataUrl },
        'Falha ao aprovar capa do deck.'
      );
      if (payload?.deck) {
        upsertDeckFromServer(payload.deck);
      }
      delete state.adminPreviewBySource[normalizedSource];
      setDeckStatus(source, 'Capa aprovada e publicada com sucesso.');
    } catch (error) {
      setDeckStatus(source, error?.message || 'Falha ao aprovar capa.');
    } finally {
      setDeckBusy(source, false);
      renderCards();
    }
  }

  async function refreshAdminDeckCatalog() {
    state.decks = await fetchRemoteDeckCatalog();
    sortDecks();
    updateSummary();
    renderCards();
  }

  async function deleteDeckPermanently(source) {
    const deckIndex = findDeckIndexBySource(source);
    const deck = deckIndex >= 0 ? state.decks[deckIndex] : null;
    if (!deck) return;
    if (!deck.isHidden) {
      setDeckStatus(source, 'Oculte o album antes da exclusao completa.');
      renderCards();
      return;
    }
    if (!deck.canDelete) {
      setDeckStatus(source, 'Esse deck nao pode ser excluido por aqui.');
      renderCards();
      return;
    }

    const confirmed = window.confirm(`Excluir para sempre o deck "${deck.title}"? Essa acao apaga o deck do Postgres e os assets vinculados a ele.`);
    if (!confirmed) return;

    setDeckBusy(source, true);
    setDeckStatus(source, 'Excluindo deck por completo...');
    renderCards();
    try {
      await postAdminDeckAction(
        '/api/admin/flashcards/public-decks/delete',
        { source },
        'Falha ao excluir o deck.'
      );
      const normalizedSource = normalizeDeckSource(source);
      state.decks = state.decks.filter((entry) => normalizeDeckSource(entry?.source) !== normalizedSource);
      delete state.adminPreviewBySource[normalizedSource];
      delete state.adminPromptBySource[normalizedSource];
      delete state.adminBusyBySource[normalizedSource];
      delete state.adminStatusBySource[normalizedSource];
      if (normalizeDeckSource(state.adminExpandedSource) === normalizedSource) {
        state.adminExpandedSource = '';
      }
      updateSummary();
    } catch (error) {
      setDeckStatus(source, error?.message || 'Falha ao excluir o deck.');
    } finally {
      renderCards();
    }
  }

  async function readDeckUploadFiles(fileList) {
    const files = Array.from(fileList || []).filter((file) => /\.json$/i.test(safeText(file?.name)));
    if (!files.length) {
      throw new Error('Selecione pelo menos um arquivo .json.');
    }
    if (files.length > 100) {
      throw new Error('O limite por envio e de 100 decks JSON.');
    }

    return Promise.all(files.map(async (file) => ({
      name: file.name,
      content: await file.text()
    })));
  }

  async function uploadAdminDeckFiles(fileList) {
    try {
      const files = await readDeckUploadFiles(fileList);
      setAdminToolbarBusy(true);
      setAdminToolbarStatus(`Enviando ${files.length} deck${files.length === 1 ? '' : 's'} para o Postgres...`);
      const payload = await postAdminDeckAction(
        '/api/admin/flashcards/public-decks/upload-jsons',
        { files },
        'Falha ao enviar os decks para o Postgres.'
      );
      await refreshAdminDeckCatalog();
      const uploadedCount = Math.max(0, Number.parseInt(payload?.uploadedCount, 10) || files.length);
      setAdminToolbarStatus(`${uploadedCount} deck${uploadedCount === 1 ? '' : 's'} enviado${uploadedCount === 1 ? '' : 's'} e liberado${uploadedCount === 1 ? '' : 's'} para jogo.`);
    } catch (error) {
      setAdminToolbarStatus(error?.message || 'Falha ao enviar os decks.');
    } finally {
      setAdminToolbarBusy(false);
      if (els.adminUploadInput) {
        els.adminUploadInput.value = '';
      }
    }
  }

  function bindAdminGridEvents() {
    if (!els.grid || els.grid.dataset.adminDeckBound === '1') return;

    els.grid.addEventListener('input', (event) => {
      if (!state.isAdmin) return;
      const input = event.target.closest('[data-action="cover-prompt"]');
      if (!input) return;
      const source = safeText(input.dataset.source);
      if (!source) return;
      state.adminPromptBySource[normalizeDeckSource(source)] = safeText(input.value);
    });

    els.grid.addEventListener('click', async (event) => {
      if (!state.isAdmin) return;
      const button = event.target.closest('[data-action]');
      if (!button) return;

      const action = safeText(button.dataset.action);
      const source = safeText(button.dataset.source);
      if (!source || !action) return;
      if (isDeckBusy(source)) return;

      if (action === 'toggle-hidden') {
        event.preventDefault();
        await toggleDeckVisibility(source);
        return;
      }

      if (action === 'toggle-cover-panel') {
        event.preventDefault();
        const normalizedSource = normalizeDeckSource(source);
        state.adminExpandedSource = normalizeDeckSource(state.adminExpandedSource) === normalizedSource
          ? ''
          : source;
        if (state.adminExpandedSource) {
          readDeckPrompt(source, state.decks[findDeckIndexBySource(source)] || null);
        }
        renderCards();
        return;
      }

      if (action === 'generate-cover') {
        event.preventDefault();
        await generateDeckCover(source);
        return;
      }

      if (action === 'approve-cover') {
        event.preventDefault();
        await approveDeckCover(source);
        return;
      }

      if (action === 'delete-deck') {
        event.preventDefault();
        await deleteDeckPermanently(source);
      }
    });

    els.grid.dataset.adminDeckBound = '1';
  }

  function bindAdminToolbarEvents() {
    if (!els.adminUploadBtn || !els.adminUploadInput || els.adminUploadBtn.dataset.adminToolbarBound === '1') return;

    if (els.adminHiddenToggleBtn && els.adminHiddenToggleBtn.dataset.adminHiddenToggleBound !== '1') {
      els.adminHiddenToggleBtn.addEventListener('click', async () => {
        if (!state.isAdmin || state.adminToolbarBusy) return;
        const nextShowHidden = !state.showHiddenDecks;
        state.showHiddenDecks = nextShowHidden;
        try {
          setAdminToolbarBusy(true);
          setAdminToolbarStatus(nextShowHidden ? 'Exibindo decks ocultos.' : 'Mostrando apenas decks ativos.');
          await refreshAdminDeckCatalog();
        } catch (error) {
          state.showHiddenDecks = !nextShowHidden;
          setAdminToolbarStatus(error?.message || 'Falha ao alternar decks ocultos.');
        } finally {
          setAdminToolbarBusy(false);
          updateAdminToolbar();
        }
      });
      els.adminHiddenToggleBtn.dataset.adminHiddenToggleBound = '1';
    }

    els.adminUploadBtn.addEventListener('click', () => {
      if (!state.isAdmin || state.adminToolbarBusy) return;
      els.adminUploadInput.click();
    });

    els.adminUploadInput.addEventListener('change', async (event) => {
      if (!state.isAdmin || state.adminToolbarBusy) return;
      await uploadAdminDeckFiles(event.target?.files);
    });

    els.adminUploadBtn.dataset.adminToolbarBound = '1';
  }

  async function resolveSessionInfo() {
    try {
      const response = await fetch(buildApiUrl('/auth/session'), {
        headers: buildAuthHeaders(),
        cache: 'no-store',
        credentials: 'include'
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) {
        return { userId: 0, isAdmin: false };
      }
      const user = payload?.user || null;
      return {
        userId: Number(user?.id) || 0,
        isAdmin: isAdminSessionUser(user)
      };
    } catch (_error) {
      return { userId: 0, isAdmin: false };
    }
  }

  async function verifyAdminAccessByEndpoint() {
    try {
      const response = await fetch(buildApiUrl('/api/admin/flashcards/decks'), {
        method: 'GET',
        headers: buildAuthHeaders(),
        cache: 'no-store',
        credentials: 'include'
      });
      const payload = await response.json().catch(() => ({}));
      return Boolean(response.ok && payload?.success);
    } catch (_error) {
      return false;
    }
  }

  async function backfillPublicDecksForAdmin() {
    if (!state.isAdmin) return;
    try {
      await fetch(buildApiUrl('/api/admin/flashcards/backfill-public-decks'), {
        method: 'POST',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({ force: false })
      });
    } catch (_error) {
      // keep page usable even if backfill fails
    }
  }

  async function fetchCloudProgressForUser() {
    try {
      const response = await fetch(buildApiUrl('/api/flashcards/state'), {
        headers: buildAuthHeaders(),
        cache: 'no-store',
        credentials: 'include'
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) {
        return new Map();
      }
      const records = Array.isArray(payload?.progress)
        ? payload.progress.map(normalizeProgressRecord).filter(Boolean)
        : [];
      const progressMap = new Map(records.map((record) => [record.cardId, record]));
      if (progressMap.size) {
        saveUserProgressForUser(state.userId, progressMap);
      }
      return progressMap;
    } catch (_error) {
      return new Map();
    }
  }

  function startRefreshTimers() {
    if (state.isAdmin) return;
    if (!state.refreshTimer) {
      state.refreshTimer = window.setInterval(renderCards, 1000);
    }
    if (!state.swapTimer) {
      state.swapTimer = window.setInterval(() => {
        state.showPercent = !state.showPercent;
        renderCards();
      }, STATUS_SWAP_MS);
    }
  }

  async function init() {
    const session = await resolveSessionInfo();
    state.userId = session.userId;
    state.isAdmin = session.isAdmin;
    if (!state.isAdmin) {
      state.isAdmin = await verifyAdminAccessByEndpoint();
    }

    if (state.isAdmin) {
      bindAdminGridEvents();
      bindAdminToolbarEvents();
      await backfillPublicDecksForAdmin();
      try {
        state.decks = await fetchRemoteDeckCatalog();
        sortDecks();
      } catch (_error) {
        state.decks = [];
      }
      updateAdminToolbar();
      updateSummary();
      renderCards();
      return;
    }

    let progressMap = await fetchCloudProgressForUser();
    if (!progressMap.size) {
      progressMap = readUserProgressForUser(state.userId);
    }

    if (progressMap.size && (!readCardsCache().length || unresolvedProgressCount(progressMap) > 0)) {
      try {
        await fetchRemoteCardsCatalog();
      } catch (_error) {
        // keep local cache fallback
      }
    }

    hydrateCards(progressMap);
    updateSummary();
    renderCards();
    startRefreshTimers();
  }

  init();
})();
