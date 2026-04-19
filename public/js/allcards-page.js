(function initPlaytalkAllCardsPage() {
  const CARDS_CACHE_STORAGE_KEY = 'playtalk-flashcards-cards-v2';
  const USER_PROGRESS_STORAGE_KEY = 'playtalk-flashcards-progress-v3';
  const OWNED_STORAGE_KEY = 'playtalk-flashcards-owned-v2';
  const LAST_ACTIVE_USER_STORAGE_KEY = 'playtalk-flashcards-last-user-v1';
  const DATA_MANIFEST_REMOTE_PATH = '/api/flashcards/manifest';
  const FLASHCARDS_LOCAL_SOURCE_PREFIX = 'allcards';
  const LIBRARY_RANK_SWAP_DELAY_MS = 2000;
  const REVIEW_SCALE_VERSION = 3;
  const REVIEW_PHASE_MAX = 6;
  const REVIEW_PHASES = {
    1: { label: 'First star', durationMs: 6 * 60 * 60 * 1000, sealPath: 'medalhas/prata.png' },
    2: { label: 'Second star', durationMs: 34 * 60 * 60 * 1000, sealPath: 'medalhas/quartz.png' },
    3: { label: 'Emerald star', durationMs: 4 * 24 * 60 * 60 * 1000, sealPath: 'medalhas/emerald.png' },
    4: { label: 'Third star', durationMs: 10 * 24 * 60 * 60 * 1000, sealPath: 'medalhas/platina.png' },
    5: { label: 'Fourth star', durationMs: 20 * 24 * 60 * 60 * 1000, sealPath: 'medalhas/ouro.png' },
    6: { label: 'Fifth star', durationMs: 45 * 24 * 60 * 60 * 1000, sealPath: 'medalhas/diamante.png' }
  };

  const els = {
    allGrid: document.getElementById('allGrid'),
    allSectionCopy: document.getElementById('allSectionCopy'),
    libraryTitle: document.getElementById('libraryTitle'),
    flashcardsToggleBtn: document.getElementById('flashcardsToggleBtn'),
    smartbooksToggleBtn: document.getElementById('smartbooksToggleBtn'),
    flashcardsView: document.getElementById('flashcardsView'),
    smartbooksView: document.getElementById('smartbooksView'),
    smartbooksTitle: document.getElementById('smartbooksTitle'),
    smartbooksShelf: document.getElementById('smartbooksShelf'),
    smartbooksGrid: document.getElementById('smartbooksGrid'),
    smartbooksStatus: document.getElementById('smartbooksStatus')
  };

  const state = {
    userId: 0,
    cards: [],
    ui: {
      activeView: 'flashcards',
      librarySummaryMode: 'count',
      librarySummaryRank: 0,
      librarySummaryTimer: 0,
      librarySummaryFlashTimer: 0,
      librarySummaryToken: 0,
      smartbooksReady: false,
      smartbooksLoading: false
    },
    renderTimer: 0,
    summaryLoopTimer: 0,
    smartbooksInitPromise: null,
    smartbooksBooks: [],
    smartbooksStats: null
  };

  function safeText(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  function slug(value) {
    return String(value || '')
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'card';
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

  function wait(ms) {
    return new Promise((resolve) => {
      window.setTimeout(resolve, Math.max(0, Number(ms) || 0));
    });
  }

  function storageKeyForUser(baseKey, userId = state.userId) {
    const normalizedUserId = Number(userId) || 0;
    return normalizedUserId ? `${baseKey}:${normalizedUserId}` : baseKey;
  }

  function readLastActiveUserId() {
    try {
      return Math.max(0, Number(localStorage.getItem(LAST_ACTIVE_USER_STORAGE_KEY)) || 0);
    } catch (_error) {
      return 0;
    }
  }

  function saveLastActiveUserId(userId) {
    const normalizedUserId = Math.max(0, Number(userId) || 0);
    if (!normalizedUserId) return;
    try {
      localStorage.setItem(LAST_ACTIVE_USER_STORAGE_KEY, String(normalizedUserId));
    } catch (_error) {
      // ignore
    }
  }

  function createProgressRecord(cardId, overrides = {}) {
    return {
      cardId,
      phaseIndex: 0,
      targetPhaseIndex: 1,
      reviewScaleVersion: REVIEW_SCALE_VERSION,
      status: 'memorizing',
      memorizingStartedAt: getNowMs(),
      memorizingDurationMs: REVIEW_PHASES[1].durationMs,
      availableAt: getNowMs() + REVIEW_PHASES[1].durationMs,
      returnedAt: 0,
      createdAt: getNowMs(),
      ...overrides
    };
  }

  function phaseFromSealImage(value) {
    const normalized = safeText(value).toLowerCase();
    if (!normalized) return 0;
    if (normalized.includes('diamante')) return 6;
    if (normalized.includes('ouro')) return 5;
    if (normalized.includes('platina')) return 4;
    if (normalized.includes('emerald')) return 3;
    if (normalized.includes('quartz')) return 2;
    if (normalized.includes('prata')) return 1;
    return 0;
  }

  function migrateReviewPhase(rawPhase, raw, minPhase, preferSealImage = false) {
    const lowerBound = minPhase ? 1 : 0;
    const fallback = minPhase ? 1 : 0;
    const parsedPhase = Math.max(lowerBound, Math.min(REVIEW_PHASE_MAX, Number.parseInt(rawPhase, 10) || fallback));
    const version = Number.parseInt(raw?.reviewScaleVersion || raw?.review_scale_version, 10) || 0;
    const imagePhase = preferSealImage ? phaseFromSealImage(raw?.sealImage || raw?.seal_image) : 0;
    if (version >= REVIEW_SCALE_VERSION) return parsedPhase;
    if (imagePhase > 0) return Math.max(lowerBound, Math.min(REVIEW_PHASE_MAX, imagePhase));
    if (version >= 2) {
      if (parsedPhase === 4) return Math.max(lowerBound, 5);
      if (parsedPhase === 5) return Math.max(lowerBound, 4);
      return parsedPhase;
    }
    if (parsedPhase === 3) return Math.max(lowerBound, 5);
    if (parsedPhase === 4) return Math.max(lowerBound, 4);
    if (parsedPhase >= 5) return REVIEW_PHASE_MAX;
    return parsedPhase;
  }

  function normalizeProgressRecord(raw) {
    const cardId = String(raw?.cardId || '').trim();
    if (!cardId) return null;
    const status = raw?.status === 'ready' ? 'ready' : 'memorizing';
    const targetPhaseIndex = migrateReviewPhase(raw?.targetPhaseIndex, raw, true, true);
    const phaseIndex = migrateReviewPhase(raw?.phaseIndex, raw, false, status === 'ready');
    return createProgressRecord(cardId, {
      phaseIndex,
      targetPhaseIndex,
      reviewScaleVersion: REVIEW_SCALE_VERSION,
      status,
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

    return items.map((item, index) => {
      const legacyId = `${idSource.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${index}`;
      return {
        id: `${slug(idSource)}-${slug(title)}-${index}`,
        legacyId,
        source: sourceKey,
        sourceIndex: index,
        deckTitle: title,
        imageUrl: safeText(item?.imagem || item?.image),
        imageDisplayUrl: safeText(item?.imagem || item?.image),
        english: safeText(item?.nomeIngles || item?.english || item?.word),
        portuguese: safeText(item?.nomePortugues || item?.portuguese || item?.translation),
        audioUrl: safeText(item?.audio || item?.audioUrl)
      };
    });
  }

  function unresolvedProgressCount(progressMap) {
    const cache = readCardsCache();
    const cardIds = new Set();
    cache.forEach((card) => {
      const id = safeText(card?.id);
      const legacyId = safeText(card?.legacyId);
      if (id) cardIds.add(id);
      if (legacyId) cardIds.add(legacyId);
    });
    return Array.from(progressMap.values()).filter((progress) => !cardIds.has(progress.cardId)).length;
  }

  function phaseMeta(phaseIndex) {
    return REVIEW_PHASES[Math.max(1, Math.min(REVIEW_PHASE_MAX, Number(phaseIndex) || 1))] || REVIEW_PHASES[1];
  }

  function activeSealPhase(record) {
    if (!record) return 0;
    if (record.status === 'memorizing') {
      return Math.max(1, Math.min(REVIEW_PHASE_MAX, Number(record.targetPhaseIndex) || Number(record.phaseIndex) || 1));
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
      ? '<div class="mini-card__loader" aria-hidden="true"></div>'
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
    const cardMap = new Map();
    cache.forEach((card) => {
      const id = safeText(card?.id);
      const legacyId = safeText(card?.legacyId);
      if (id) cardMap.set(id, card);
      if (legacyId && !cardMap.has(legacyId)) cardMap.set(legacyId, card);
    });
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
    if (!els.libraryTitle) return;
    clearLibrarySummaryFlashTimer();
    els.libraryTitle.classList.remove('is-updating');
    void els.libraryTitle.offsetWidth;
    els.libraryTitle.classList.add('is-updating');
    state.ui.librarySummaryFlashTimer = window.setTimeout(() => {
      els.libraryTitle?.classList.remove('is-updating');
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
    const nextText = formatLibrarySummaryCount(count);
    if (els.libraryTitle) {
      els.libraryTitle.textContent = nextText;
    }
    if (els.allSectionCopy) {
      els.allSectionCopy.textContent = nextText;
    }
  }

  function triggerLibrarySummaryRankSwap() {
    const nextCount = state.cards.length;
    state.ui.librarySummaryMode = 'count';
    state.ui.librarySummaryToken += 1;
    clearLibrarySummaryTimer();
    renderLibrarySummary(nextCount);
    flashLibrarySummary();
  }

  function refreshLibrary() {
    const cards = state.cards.map(buildLibraryCardView);
    renderMiniCards(els.allGrid, cards, '0');
    renderLibrarySummary(cards.length);
  }

  function renderViewToggle() {
    const flashcardsActive = state.ui.activeView === 'flashcards';
    const smartbooksActive = !flashcardsActive;
    els.flashcardsToggleBtn?.classList.toggle('is-active', flashcardsActive);
    els.smartbooksToggleBtn?.classList.toggle('is-active', smartbooksActive);
    els.flashcardsToggleBtn?.setAttribute('aria-selected', flashcardsActive ? 'true' : 'false');
    els.smartbooksToggleBtn?.setAttribute('aria-selected', smartbooksActive ? 'true' : 'false');
    if (els.flashcardsView) {
      els.flashcardsView.hidden = !flashcardsActive;
    }
    if (els.smartbooksView) {
      els.smartbooksView.hidden = !smartbooksActive;
    }
  }

  function setSmartbooksStatus(message, visible = true) {
    if (!els.smartbooksStatus) return;
    els.smartbooksStatus.textContent = safeText(message) || 'Carregando MyBooks...';
    els.smartbooksStatus.hidden = !visible;
  }

  function normalizePercent(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0;
    return Math.max(0, Math.min(100, numeric));
  }

  function normalizeAudioSources(value) {
    return Array.isArray(value)
      ? value.map((item) => safeText(item)).filter(Boolean)
      : [];
  }

  function normalizeBooksFromStories(stories) {
    const byBook = new Map();
    if (!Array.isArray(stories)) return [];

    stories.forEach((entry) => {
      const fileName = safeText(entry?.fileName);
      const nome = safeText(entry?.nome);
      const bookId = safeText(entry?.bookId);
      const storyId = safeText(entry?.id);
      if (!fileName || !nome || !bookId) return;

      const key = bookId.toLowerCase();
      if (!byBook.has(key)) {
        byBook.set(key, {
          bookId,
          fileName,
          nome,
          nivel: Number.parseInt(entry?.nivel, 10) || 1,
          audioSources: normalizeAudioSources(entry?.audioSources),
          coverImageUrl: safeText(entry?.coverImageUrl),
          selectedStoryId: storyId
        });
        return;
      }

      const current = byBook.get(key);
      if (!current.coverImageUrl && safeText(entry?.coverImageUrl)) {
        current.coverImageUrl = safeText(entry.coverImageUrl);
      }
      if (Array.isArray(entry?.audioSources) && entry.audioSources.length) {
        current.audioSources = normalizeAudioSources([...(current.audioSources || []), ...entry.audioSources]);
      }
      if (!current.selectedStoryId && storyId) {
        current.selectedStoryId = storyId;
      }
    });

    return Array.from(byBook.values()).sort((left, right) => String(left?.nome || '').localeCompare(String(right?.nome || ''), 'pt-BR', {
      sensitivity: 'base',
      numeric: true
    }));
  }

  function getMyBooksBadge(bestPercent) {
    const normalizedPercent = normalizePercent(bestPercent);
    if (normalizedPercent >= 98) return { src: '/medalhas/diamante.png', alt: 'Selo diamante' };
    if (normalizedPercent >= 94) return { src: '/medalhas/ouro.png', alt: 'Selo ouro' };
    if (normalizedPercent >= 92) return { src: '/medalhas/platina.png', alt: 'Selo platina' };
    if (normalizedPercent >= 90) return { src: '/medalhas/emerald.png', alt: 'Selo esmeralda' };
    if (normalizedPercent >= 85) return { src: '/medalhas/quartz.png', alt: 'Selo quartz' };
    if (normalizedPercent >= 80) return { src: '/medalhas/prata.png', alt: 'Selo prata' };
    return null;
  }

  function getQualifiedMyBooks(books, stats) {
    const ids = Array.isArray(stats?.qualifiedBookIds) ? stats.qualifiedBookIds : [];
    if (!ids.length) return [];
    const booksById = new Map(
      (Array.isArray(books) ? books : []).map((book) => [safeText(book?.bookId).toLowerCase(), book])
    );
    return ids
      .map((bookId) => booksById.get(safeText(bookId).toLowerCase()))
      .filter(Boolean);
  }

  function renderSmartbooksGrid() {
    if (!els.smartbooksGrid) return;
    const books = getQualifiedMyBooks(state.smartbooksBooks, state.smartbooksStats);
    if (els.smartbooksTitle) {
      els.smartbooksTitle.textContent = `Voc\u00ea tem ${books.length} smartbooks`;
    }
    if (!books.length) {
      els.smartbooksGrid.innerHTML = '<div class="empty">Nenhum livro ainda em MyBooks.</div>';
      return;
    }

    els.smartbooksGrid.innerHTML = books.map((book) => {
      const badge = getMyBooksBadge(state.smartbooksStats?.bookBestPercentById?.[safeText(book?.bookId)] || 0);
      return `
        <article class="smartbooks-shelf-page">
          <div class="smartbooks-card" aria-label="${escapeHtml(safeText(book?.nome) || 'Livro')}">
            <span class="smartbooks-card__background" style="background-image:${safeText(book?.coverImageUrl) ? `url(${escapeHtml(book.coverImageUrl)})` : 'linear-gradient(155deg, #2a5bcf, #28a7d5)'}"></span>
            <span class="smartbooks-card__overlay"></span>
            ${badge ? `<span class="smartbooks-card__badge"><img src="${escapeHtml(badge.src)}" alt="${escapeHtml(badge.alt)}"></span>` : ''}
            <p class="smartbooks-card__title">${escapeHtml(safeText(book?.nome) || 'Livro')}</p>
          </div>
        </article>
      `;
    }).join('');
  }

  async function fetchSmartbooksStats() {
    const response = await fetch(buildApiUrl('/api/books/stats'), {
      credentials: 'include',
      headers: buildAuthHeaders(),
      cache: 'no-store'
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.success) {
      return { qualifiedBookIds: [], bookBestPercentById: {} };
    }
    return payload.stats || { qualifiedBookIds: [], bookBestPercentById: {} };
  }

  async function fetchSmartbooksStories() {
    const response = await fetch(buildApiUrl('/api/speaking/stories'), {
      credentials: 'include',
      headers: buildAuthHeaders(),
      cache: 'no-store'
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.success) {
      return [];
    }
    return normalizeBooksFromStories(payload.stories);
  }

  function ensureSmartbooksGrid() {
    if (state.ui.smartbooksReady) {
      renderSmartbooksGrid();
      setSmartbooksStatus('', false);
      return Promise.resolve();
    }
    if (state.smartbooksInitPromise) {
      return state.smartbooksInitPromise;
    }

    state.ui.smartbooksLoading = true;
    setSmartbooksStatus('Carregando MyBooks...', true);

    state.smartbooksInitPromise = Promise.all([
      fetchSmartbooksStories(),
      fetchSmartbooksStats()
    ]).then(([books, stats]) => {
      state.smartbooksBooks = Array.isArray(books) ? books : [];
      state.smartbooksStats = stats || { qualifiedBookIds: [], bookBestPercentById: {} };
      state.ui.smartbooksReady = true;
      renderSmartbooksGrid();
      setSmartbooksStatus('', false);
    }).catch((error) => {
      state.ui.smartbooksReady = false;
      state.ui.smartbooksLoading = false;
      setSmartbooksStatus(error?.message || 'Nao foi possivel carregar o SmartBooks.', true);
      throw error;
    }).finally(() => {
      state.ui.smartbooksLoading = false;
      state.smartbooksInitPromise = null;
    });

    return state.smartbooksInitPromise;
  }

  function bindViewToggles() {
    els.flashcardsToggleBtn?.addEventListener('click', () => {
      state.ui.activeView = 'flashcards';
      renderViewToggle();
    });

    els.smartbooksToggleBtn?.addEventListener('click', () => {
      state.ui.activeView = 'smartbooks';
      renderViewToggle();
      void ensureSmartbooksGrid();
    });
  }

  async function resolveSessionUserId() {
    if (window.PlaytalkApi && typeof window.PlaytalkApi.fetchSessionUser === 'function') {
      const user = await window.PlaytalkApi.fetchSessionUser({
        attempts: 3,
        retryDelayMs: 450
      });
      const resolvedId = Number(user?.id) || 0;
      if (resolvedId) {
        saveLastActiveUserId(resolvedId);
      }
      return resolvedId || readLastActiveUserId();
    }
    try {
      const response = await fetch(buildApiUrl('/auth/session'), {
        headers: buildAuthHeaders(),
        cache: 'no-store',
        credentials: 'include'
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) return readLastActiveUserId();
      const resolvedId = Number(payload?.user?.id) || 0;
      if (resolvedId) {
        saveLastActiveUserId(resolvedId);
      }
      return resolvedId || readLastActiveUserId();
    } catch (_error) {
      return readLastActiveUserId();
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

  async function loadFlashcardsLibrary(options = {}) {
    const forceCatalogRefresh = Boolean(options.forceCatalogRefresh);
    const allowRetry = options.allowRetry !== false;

    state.userId = await resolveSessionUserId();

    let progressMap = await fetchCloudProgressForUser();
    if (!progressMap.size) {
      progressMap = readUserProgressForUser(state.userId);
    }

    const shouldRefreshCatalog = forceCatalogRefresh
      || !readCardsCache().length
      || unresolvedProgressCount(progressMap) > 0;

    if (shouldRefreshCatalog) {
      try {
        await fetchRemoteCardsCatalog();
      } catch (_error) {
        // keep cache fallback
      }
    }

    hydrateCards(progressMap);
    refreshLibrary();
    triggerLibrarySummaryRankSwap();

    if (!state.cards.length && allowRetry) {
      await wait(700);
      return loadFlashcardsLibrary({
        forceCatalogRefresh: true,
        allowRetry: false
      });
    }

    return state.cards;
  }

  async function init() {
    bindViewToggles();
    renderViewToggle();
    await loadFlashcardsLibrary();
    startVisualTimers();
  }

  init();
})();
