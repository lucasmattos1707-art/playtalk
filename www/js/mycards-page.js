(function initPlaytalkMyCardsPage() {
  const CARDS_CACHE_STORAGE_KEY = 'playtalk-flashcards-cards-v2';
  const USER_PROGRESS_STORAGE_KEY = 'playtalk-flashcards-progress-v3';
  const OWNED_STORAGE_KEY = 'playtalk-flashcards-owned-v2';
  const REVIEW_PHASES = {
    1: { durationMs: 24 * 60 * 60 * 1000 },
    2: { durationMs: 3 * 24 * 60 * 60 * 1000 },
    3: { durationMs: 7 * 24 * 60 * 60 * 1000 },
    4: { durationMs: 12 * 24 * 60 * 60 * 1000 },
    5: { durationMs: 30 * 24 * 60 * 60 * 1000 }
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

  function progressPercent(record) {
    if (!record || record.status !== 'memorizing') return 100;
    const total = Math.max(1, Number(record.memorizingDurationMs) || 1);
    const elapsed = Math.max(0, getNowMs() - (Number(record.memorizingStartedAt) || 0));
    return Math.max(0, Math.min(100, (elapsed / total) * 100));
  }

  function resolveCardImage(card) {
    return safeText(card?.imageDisplayUrl || card?.imageUrl || card?.imagem || card?.image);
  }

  function fallbackLetter(card) {
    const source = safeText(card?.english || card?.nomeIngles || card?.portuguese || card?.nomePortugues || 'C');
    return source.charAt(0).toUpperCase() || 'C';
  }

  function hydrateCards() {
    const cache = readCardsCache();
    const cardMap = new Map(cache.map((card) => [safeText(card?.id), card]));
    const progressMap = readUserProgressForUser(state.userId);

    state.cards = Array.from(progressMap.values())
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
      return `
        <article class="mycards-item" role="listitem">
          <div class="mycards-card ${isMemorizing ? 'is-memorizing' : 'is-ready'}" style="--progress:${escapeHtml((progress * 3.6).toFixed(1))}deg;">
            <div class="mycards-card__image">
              ${imageUrl
                ? `<img src="${escapeHtml(imageUrl)}" alt="Carta">`
                : `<div class="mycards-card__fallback">${escapeHtml(fallbackLetter(card))}</div>`}
              ${isMemorizing ? '<div class="mycards-card__status">Memorizing</div>' : ''}
            </div>
          </div>
        </article>
      `;
    }).join('');
  }

  async function resolveSessionUserId() {
    try {
      const response = await fetch(window.PlaytalkApi?.url ? window.PlaytalkApi.url('/auth/session') : '/auth/session', {
        headers: window.PlaytalkApi?.authHeaders ? window.PlaytalkApi.authHeaders() : {},
        cache: 'no-store'
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) return 0;
      return Number(payload?.user?.id) || 0;
    } catch (_error) {
      return 0;
    }
  }

  async function init() {
    state.userId = await resolveSessionUserId();
    hydrateCards();
    updateSummary();
    renderCardsPage();
    window.setInterval(renderCardsPage, 1000);
  }

  init();
})();
