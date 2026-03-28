(function initPlaytalkMyCardsPage() {
  const CARDS_CACHE_STORAGE_KEY = 'playtalk-flashcards-cards-v2';
  const USER_PROGRESS_STORAGE_KEY = 'playtalk-flashcards-progress-v3';
  const OWNED_STORAGE_KEY = 'playtalk-flashcards-owned-v2';
  const PAGE_SIZE = 30;
  const REVIEW_PHASES = {
    1: { key: 'prata', label: 'Prata', durationMs: 24 * 60 * 60 * 1000, sealPath: 'medalhas/prata.png' },
    2: { key: 'quartz', label: 'Quartz', durationMs: 3 * 24 * 60 * 60 * 1000, sealPath: 'medalhas/quartz.png' },
    3: { key: 'gold', label: 'Gold', durationMs: 7 * 24 * 60 * 60 * 1000, sealPath: 'medalhas/ouro.png' },
    4: { key: 'platina', label: 'Platina', durationMs: 12 * 24 * 60 * 60 * 1000, sealPath: 'medalhas/platina.png' },
    5: { key: 'diamante', label: 'Diamante', durationMs: 30 * 24 * 60 * 60 * 1000, sealPath: 'medalhas/diamante.png' }
  };

  const els = {
    grid: document.getElementById('cards-collection-grid'),
    empty: document.getElementById('cards-empty-state'),
    total: document.getElementById('mycards-total'),
    ready: document.getElementById('mycards-ready'),
    memorizing: document.getElementById('mycards-memorizing'),
    pagination: document.getElementById('mycards-pagination'),
    prev: document.getElementById('mycards-prev'),
    next: document.getElementById('mycards-next'),
    pageLabel: document.getElementById('mycards-page-label')
  };

  const state = {
    userId: 0,
    cards: [],
    currentPage: 1
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
    return createProgressRecord(cardId, {
      phaseIndex: Math.max(0, Math.min(5, Number.parseInt(raw?.phaseIndex, 10) || 0)),
      targetPhaseIndex: Math.max(1, Math.min(5, Number.parseInt(raw?.targetPhaseIndex, 10) || 1)),
      status: raw?.status === 'ready' ? 'ready' : 'memorizing',
      memorizingStartedAt: Number.isFinite(Number(raw?.memorizingStartedAt)) ? Number(raw.memorizingStartedAt) : getNowMs(),
      memorizingDurationMs: Number.isFinite(Number(raw?.memorizingDurationMs)) ? Number(raw.memorizingDurationMs) : REVIEW_PHASES[1].durationMs,
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

  function resolveCardImage(card) {
    return safeText(card?.imageDisplayUrl || card?.imageUrl || card?.imagem || card?.image);
  }

  function resolveCardEnglish(card) {
    return safeText(card?.english || card?.nomeIngles);
  }

  function resolveCardPortuguese(card) {
    return safeText(card?.portuguese || card?.nomePortugues);
  }

  function formatStatus(record) {
    if (!record) {
      return { label: 'Sem status', className: '' };
    }
    if (record.status === 'ready') {
      return {
        label: 'Liberado pra fila',
        className: 'is-ready'
      };
    }
    const percent = progressPercent(record);
    return {
      label: `Memorizing ${percent.toFixed(0)}%`,
      className: 'is-memorizing'
    };
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
      if (els.pagination) els.pagination.hidden = true;
      return;
    }

    els.empty.hidden = true;
    const totalPages = Math.max(1, Math.ceil(state.cards.length / PAGE_SIZE));
    state.currentPage = Math.max(1, Math.min(totalPages, state.currentPage));
    const start = (state.currentPage - 1) * PAGE_SIZE;
    const visibleCards = state.cards.slice(start, start + PAGE_SIZE);

    els.grid.innerHTML = visibleCards.map((card) => {
      const imageUrl = resolveCardImage(card);
      const english = resolveCardEnglish(card);
      const portuguese = resolveCardPortuguese(card);
      const sealPhase = activeSealPhase(card.progress);
      const seal = sealPhase ? phaseMeta(sealPhase) : null;
      const status = formatStatus(card.progress);
      return `
        <article class="mycards-card" role="listitem">
          <div class="mycards-card__image">
            ${imageUrl
              ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(english || portuguese || 'Carta')}">`
              : ''}
            ${seal ? `<img class="mycards-card__seal" src="${escapeHtml(seal.sealPath)}" alt="${escapeHtml(seal.label)}">` : ''}
            <div class="mycards-card__status ${escapeHtml(status.className)}">${escapeHtml(status.label)}</div>
          </div>
          <p class="mycards-card__title">${escapeHtml(english || portuguese || 'Carta')}</p>
          <p class="mycards-card__sub">${escapeHtml(portuguese || (seal ? seal.label : ''))}</p>
        </article>
      `;
    }).join('');

    if (els.pagination) {
      els.pagination.hidden = totalPages <= 1;
    }
    if (els.pageLabel) {
      els.pageLabel.textContent = `Página ${state.currentPage} de ${totalPages}`;
    }
    if (els.prev) {
      els.prev.disabled = state.currentPage <= 1;
    }
    if (els.next) {
      els.next.disabled = state.currentPage >= totalPages;
    }
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

    els.prev?.addEventListener('click', () => {
      state.currentPage = Math.max(1, state.currentPage - 1);
      renderCardsPage();
    });

    els.next?.addEventListener('click', () => {
      const totalPages = Math.max(1, Math.ceil(state.cards.length / PAGE_SIZE));
      state.currentPage = Math.min(totalPages, state.currentPage + 1);
      renderCardsPage();
    });
  }

  init();
})();
