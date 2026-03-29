(function initPlaytalkMyCardsPage() {
  const CARDS_CACHE_STORAGE_KEY = 'playtalk-flashcards-cards-v2';
  const USER_PROGRESS_STORAGE_KEY = 'playtalk-flashcards-progress-v3';
  const OWNED_STORAGE_KEY = 'playtalk-flashcards-owned-v2';
  const DATA_MANIFEST_REMOTE_PATH = '/api/flashcards/manifest';
  const FLASHCARDS_LOCAL_SOURCE_PREFIX = 'allcards';
  const REVIEW_PHASES = {
    1: { durationMs: 6 * 60 * 60 * 1000, sealImage: 'medalhas/prata.png' },
    2: { durationMs: 3 * 24 * 60 * 60 * 1000, sealImage: 'medalhas/quartz.png' },
    3: { durationMs: 7 * 24 * 60 * 60 * 1000, sealImage: 'medalhas/ouro.png' },
    4: { durationMs: 12 * 24 * 60 * 60 * 1000, sealImage: 'medalhas/platina.png' },
    5: { durationMs: 30 * 24 * 60 * 60 * 1000, sealImage: 'medalhas/diamante.png' }
  };

  const els = {
    grid: document.getElementById('cards-collection-grid'),
    empty: document.getElementById('cards-empty-state'),
    total: document.getElementById('mycards-total'),
    ready: document.getElementById('mycards-ready'),
    memorizing: document.getElementById('mycards-memorizing')
  };

  const state = {
    userId: 0,
    cards: []
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
      sealImage: safeText(REVIEW_PHASES[1].sealImage),
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
      createdAt: Number.isFinite(Number(raw?.createdAt)) ? Number(raw.createdAt) : getNowMs(),
      sealImage: safeText(raw?.sealImage || REVIEW_PHASES[targetPhaseIndex]?.sealImage || REVIEW_PHASES[1].sealImage)
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

  function resolveSealImage(progress) {
    const phaseIndex = Math.max(1, Math.min(5, Number(progress?.targetPhaseIndex || progress?.phaseIndex) || 1));
    return safeText(progress?.sealImage || REVIEW_PHASES[phaseIndex]?.sealImage || REVIEW_PHASES[1].sealImage);
  }

  function fallbackLetter(card) {
    const source = safeText(card?.english || card?.nomeIngles || card?.portuguese || card?.nomePortugues || 'C');
    return source.charAt(0).toUpperCase() || 'C';
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
    return `/${cleaned.replace(/^\/+/, '')}`;
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
    return encodedKey ? `/${FLASHCARDS_LOCAL_SOURCE_PREFIX}/${encodedKey}` : '';
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

  async function fetchRemoteCardsCatalog() {
    const response = await fetch(withNoCacheUrl(buildApiUrl(DATA_MANIFEST_REMOTE_PATH)), { cache: 'no-store' });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !Array.isArray(payload?.data?.files)) {
      throw new Error(payload?.message || 'Nao consegui abrir o manifesto dos flashcards.');
    }

    const files = payload.data.files.map((file) => ({
      name: file.name || file.path || file.source || 'deck.json',
      path: resolveManifestDeckPath(file),
      sourceKey: safeText(file?.source || file?.name || file?.path),
      idSource: safeText(file?.source || file?.name || file?.path)
    }));

    const responses = await Promise.all(files.map(async (file) => {
      const deckResponse = await fetch(withNoCacheUrl(file.path), { cache: 'no-store' });
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

  function updateSummary() {
    const total = state.cards.length;
    const ready = state.cards.filter((card) => card.progress?.status === 'ready').length;
    const memorizing = total - ready;
    if (els.total) els.total.textContent = String(total);
    if (els.ready) els.ready.textContent = String(ready);
    if (els.memorizing) els.memorizing.textContent = String(memorizing);
  }

  function renderCardsPage() {
    if (!els.grid || !els.empty) return;
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
      const isMemorizing = card.progress?.status === 'memorizing';
      const statusLabel = isMemorizing ? `${Math.round(progress)}% Complete` : 'Ready';
      const sealImage = resolveSealImage(card.progress);
      return `
        <article class="mycards-item" role="listitem">
          <div class="mycards-card ${isMemorizing ? 'is-memorizing' : 'is-ready'}" style="--progress:${escapeHtml((progress * 3.6).toFixed(1))}deg;">
            <div class="mycards-card__image">
              ${imageUrl
                ? `<img src="${escapeHtml(imageUrl)}" alt="Carta">`
                : `<div class="mycards-card__fallback">${escapeHtml(fallbackLetter(card))}</div>`}
              ${isMemorizing ? `<div class="mycards-card__status"><span class="mycards-card__status-text">Memorizing</span><span class="mycards-card__status-text is-secondary">${escapeHtml(statusLabel)}</span></div>` : ''}
              ${sealImage ? `<img class="mycards-card__seal" src="${escapeHtml(sealImage)}" alt="">` : ''}
            </div>
          </div>
        </article>
      `;
    }).join('');
  }

  async function resolveSessionUserId() {
    try {
      const response = await fetch(buildApiUrl('/auth/session'), {
        headers: buildAuthHeaders(),
        cache: 'no-store'
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) return 0;
      return Number(payload?.user?.id) || 0;
    } catch (_error) {
      return 0;
    }
  }

  async function fetchCloudProgressForUser() {
    if (!state.userId) {
      return new Map();
    }
    try {
      const response = await fetch(buildApiUrl('/api/flashcards/state'), {
        headers: buildAuthHeaders(),
        cache: 'no-store'
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
        // keep local cache fallback
      }
    }

    hydrateCards(progressMap);
    updateSummary();
    renderCardsPage();
    window.setInterval(renderCardsPage, 1000);
  }

  init();
})();
