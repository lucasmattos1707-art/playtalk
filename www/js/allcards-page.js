(function initPlaytalkAllCardsPage() {
  const CARDS_CACHE_STORAGE_KEY = 'playtalk-flashcards-cards-v2';
  const USER_PROGRESS_STORAGE_KEY = 'playtalk-flashcards-progress-v3';
  const OWNED_STORAGE_KEY = 'playtalk-flashcards-owned-v2';
  const DATA_MANIFEST_REMOTE_PATH = '/api/flashcards/manifest';
  const FLASHCARDS_LOCAL_SOURCE_PREFIX = 'allcards';
  const LIBRARY_RANK_SWAP_DELAY_MS = 2000;
  const REVIEW_PHASES = {
    1: { label: 'First star', durationMs: 6 * 60 * 60 * 1000, sealPath: 'medalhas/prata.png' },
    2: { label: 'Second star', durationMs: 3 * 24 * 60 * 60 * 1000, sealPath: 'medalhas/quartz.png' },
    3: { label: 'Third star', durationMs: 7 * 24 * 60 * 60 * 1000, sealPath: 'medalhas/ouro.png' },
    4: { label: 'Fourth star', durationMs: 12 * 24 * 60 * 60 * 1000, sealPath: 'medalhas/platina.png' },
    5: { label: 'Fifth star', durationMs: 30 * 24 * 60 * 60 * 1000, sealPath: 'medalhas/diamante.png' }
  };

  const els = {
    allGrid: document.getElementById('allGrid'),
    allSectionCopy: document.getElementById('allSectionCopy'),
    libraryTitle: document.getElementById('libraryTitle')
  };

  const state = {
    userId: 0,
    cards: [],
    ui: {
      librarySummaryMode: 'count',
      librarySummaryRank: 0,
      librarySummaryTimer: 0,
      librarySummaryFlashTimer: 0,
      librarySummaryToken: 0
    },
    renderTimer: 0,
    summaryLoopTimer: 0
  };

  function safeText(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeSelectorValue(value) {
    return String(value || '')
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"');
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

  function getNowMs() {
    return Date.now();
  }

  function storageKeyForUser(baseKey, userId = state.userId) {
    const normalizedUserId = Number(userId) || 0;
    return normalizedUserId ? `${baseKey}:${normalizedUserId}` : baseKey;
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
      localStorage.setItem(storageKeyForUser(USER_PROGRESS_STORAGE_KEY, normalizedUserId), JSON.stringify(Array.from(progressMap.values())));
      localStorage.setItem(storageKeyForUser(OWNED_STORAGE_KEY, normalizedUserId), JSON.stringify(Array.from(progressMap.keys())));
    } catch (_error) {
      // ignore
    }
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
      id: `${idSource.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${index}`,
      source: sourceKey,
      sourceIndex: index,
      deckTitle: title,
      imageUrl: safeText(item?.imagem || item?.image),
      imageDisplayUrl: safeText(item?.imagem || item?.image),
      english: safeText(item?.nomeIngles || item?.english || item?.word),
      portuguese: safeText(item?.nomePortugues || item?.portuguese || item?.translation),
      audioUrl: safeText(item?.audio || item?.audioUrl)
    }));
  }

  function unresolvedProgressCount(progressMap) {
    const cache = readCardsCache();
    const cardIds = new Set(cache.map((card) => safeText(card?.id)).filter(Boolean));
    return Array.from(progressMap.values()).filter((progress) => !cardIds.has(progress.cardId)).length;
  }

  function phaseMeta(phaseIndex) {
    return REVIEW_PHASES[Math.max(1, Math.min(5, Number(phaseIndex) || 1))] || REVIEW_PHASES[1];
  }

  function activeSealPhase(record) {
    if (!record) return 0;
    if (record.status === 'memorizing') {
      return Math.max(1, Math.min(5, Number(record.targetPhaseIndex) || Number(record.phaseIndex) || 1));
    }
    if ((record.phaseIndex || 0) >= 1) return record.phaseIndex;
    return 0;
  }

  function progressPercent(record) {
    if (!record || record.status !== 'memorizing') return 100;
    const total = Math.max(1, Number(record.memorizingDurationMs) || 1);
    const elapsed = Math.max(0, getNowMs() - (Number(record.memorizingStartedAt) || 0));
    return Math.max(0, Math.min(100, (elapsed / total) * 100));
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

  function renderMiniCards(target, cards, emptyCopy) {
    if (!target) return;
    if (!cards.length) {
      target.innerHTML = `<div class="empty">${escapeHtml(emptyCopy)}</div>`;
      return;
    }
    target.innerHTML = cards.map((card) => `
      <article class="mini-card" data-card-id="${escapeHtml(card.id)}">
        <div class="mini-card__image">
          ${safeText(card.imageDisplayUrl || card.imageUrl)
            ? `<img src="${escapeHtml(card.imageDisplayUrl || card.imageUrl)}" alt="${escapeHtml(card.english || card.portuguese || card.deckTitle)}" style="${escapeHtml(card.imageStyle || '')}">`
            : `<div class="mini-card__fallback">${escapeHtml(card.deckTitle || 'FlashCard')}</div>`}
          ${card.sealMarkup || ''}
          ${card.loaderMarkup || ''}
        </div>
        <p class="mini-card__word">${escapeHtml(card.displayEnglish || card.english || card.portuguese || card.deckTitle)}</p>
        <p class="mini-card__subword">${escapeHtml(card.displayPortuguese || card.portuguese || '')}</p>
        ${card.progressMarkup || ''}
      </article>
    `).join('');
  }

  function ensureMiniCardProgressUi(cardEl, view) {
    if (!cardEl) return;
    const imageWrap = cardEl.querySelector('.mini-card__image');
    let loaderEl = imageWrap?.querySelector('.mini-card__loader') || null;
    if (view.loaderMarkup) {
      if (!loaderEl && imageWrap) {
        const loader = document.createElement('div');
        loader.className = 'mini-card__loader';
        loader.setAttribute('aria-hidden', 'true');
        loader.innerHTML = '<span></span><span></span><span></span><span></span>';
        imageWrap.appendChild(loader);
      }
    } else if (loaderEl) {
      loaderEl.remove();
    }

    let progressWrap = cardEl.querySelector('.mini-card__progress');
    let progressFill = progressWrap?.querySelector('span') || null;
    if (view.progressMarkup) {
      if (!progressWrap) {
        progressWrap = document.createElement('div');
        progressWrap.className = 'mini-card__progress';
        progressWrap.setAttribute('aria-hidden', 'true');
        progressFill = document.createElement('span');
        progressWrap.appendChild(progressFill);
        cardEl.appendChild(progressWrap);
      }
      if (progressFill) {
        progressFill.style.width = `${String(view.displayPortuguese || '0').replace(',', '.')}%`;
      }
    } else if (progressWrap) {
      progressWrap.remove();
    }
  }

  function refreshRenderedLibraryCards() {
    if (!els.allGrid || !state.cards.length) return;
    state.cards.forEach((card) => {
      const cardEl = els.allGrid.querySelector(`[data-card-id="${escapeSelectorValue(card.id)}"]`);
      if (!cardEl) return;
      const view = buildLibraryCardView(card);
      const imageEl = cardEl.querySelector('.mini-card__image img');
      const wordEl = cardEl.querySelector('.mini-card__word');
      const subwordEl = cardEl.querySelector('.mini-card__subword');

      if (imageEl) {
        imageEl.style.cssText = view.imageStyle || '';
      }
      if (wordEl) wordEl.textContent = view.displayEnglish || card.english || card.portuguese || card.deckTitle;
      if (subwordEl) subwordEl.textContent = view.displayPortuguese || card.portuguese || '';
      ensureMiniCardProgressUi(cardEl, view);
    });
  }

  function hydrateCards(progressMap) {
    const cache = readCardsCache();
    const cardMap = new Map(cache.map((card) => [safeText(card?.id), card]));
    state.cards = Array.from(progressMap.values())
      .map((progress) => {
        const card = cardMap.get(progress.cardId);
        if (!card) return null;
        return { ...card, progress };
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

  function formatLibrarySummaryCount(count = state.cards.length) {
    return `${Math.max(0, Number(count) || 0)} FlashCards`;
  }

  function formatLibrarySummaryRank(rank = state.ui.librarySummaryRank) {
    const normalizedRank = Math.max(0, Number(rank) || 0);
    return normalizedRank ? `${normalizedRank}o Lugar` : '';
  }

  function renderLibrarySummary(count = state.cards.length) {
    if (!els.allSectionCopy) return;
    const nextText = state.ui.librarySummaryMode === 'rank'
      ? (formatLibrarySummaryRank() || formatLibrarySummaryCount(count))
      : formatLibrarySummaryCount(count);
    els.allSectionCopy.textContent = nextText;
  }

  async function refreshLibraryRanking() {
    if (!state.userId) {
      state.ui.librarySummaryRank = 0;
      return 0;
    }
    try {
      const response = await fetch(buildApiUrl('/api/rankings/flashcards'), {
        method: 'POST',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        cache: 'no-store',
        credentials: 'include'
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Falha ao carregar ranking.');
      }
      state.ui.librarySummaryRank = Math.max(0, Number(payload?.rank) || 0);
      return state.ui.librarySummaryRank;
    } catch (_error) {
      return state.ui.librarySummaryRank;
    }
  }

  function triggerLibrarySummaryRankSwap() {
    const nextCount = state.cards.length;
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
    if (els.libraryTitle) {
      els.libraryTitle.textContent = 'FlashCards';
    }
    const cards = state.cards.map(buildLibraryCardView);
    renderMiniCards(els.allGrid, cards, '0');
    renderLibrarySummary(cards.length);
  }

  async function resolveSessionUserId() {
    if (window.PlaytalkApi && typeof window.PlaytalkApi.fetchSessionUser === 'function') {
      const user = await window.PlaytalkApi.fetchSessionUser({
        attempts: 3,
        retryDelayMs: 450
      });
      return Number(user?.id) || 0;
    }
    try {
      const response = await fetch(buildApiUrl('/auth/session'), {
        headers: buildAuthHeaders(),
        cache: 'no-store',
        credentials: 'include'
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) return 0;
      return Number(payload?.user?.id) || 0;
    } catch (_error) {
      return 0;
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

  async function fetchRemoteCardsCatalog() {
    const manifestResponse = await fetch(withNoCacheUrl(buildApiUrl(DATA_MANIFEST_REMOTE_PATH)), {
      cache: 'no-store',
      headers: buildAuthHeaders(),
      credentials: 'include'
    });
    const manifestPayload = await manifestResponse.json().catch(() => ({}));
    const manifestFiles = Array.isArray(manifestPayload?.files)
      ? manifestPayload.files
      : (Array.isArray(manifestPayload?.data?.files) ? manifestPayload.data.files : []);
    if (!manifestResponse.ok || !manifestFiles.length) {
      return [];
    }

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
      if (!deckResponse.ok) return [];
      const deckPayload = await deckResponse.json().catch(() => ({}));
      return flattenPayload(file.name, deckPayload, {
        sourceKey: file.sourceKey,
        idSource: file.idSource
      });
    }));

    const cards = responses.flatMap((entry) => Array.isArray(entry) ? entry : []);
    saveCardsCache(cards);
    return cards;
  }

  function startVisualTimers() {
    if (!state.renderTimer) {
      state.renderTimer = window.setInterval(() => {
        refreshRenderedLibraryCards();
      }, 1000);
    }
    if (!state.summaryLoopTimer) {
      state.summaryLoopTimer = window.setInterval(() => {
        triggerLibrarySummaryRankSwap();
      }, 9000);
    }
  }

  async function init() {
    state.userId = await resolveSessionUserId();

    let progressMap = await fetchCloudProgressForUser();
    if (!progressMap.size) {
      progressMap = readUserProgressForUser(state.userId);
    }

    if (progressMap.size && (!readCardsCache().length || unresolvedProgressCount(progressMap) > 0)) {
      try {
        await fetchRemoteCardsCatalog();
      } catch (_error) {
        // keep cache fallback
      }
    }

    hydrateCards(progressMap);
    refreshLibrary();
    triggerLibrarySummaryRankSwap();
    startVisualTimers();
  }

  init();
})();
