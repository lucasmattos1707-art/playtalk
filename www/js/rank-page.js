(function initPlaytalkRankPage() {
  const PERIODS = [
    {
      id: 'weekly',
      label: 'Rank Semanal',
      subtitle: 'Confira os Top Falantes da Semana!'
    },
    {
      id: 'monthly',
      label: 'Rank Mensal',
      subtitle: 'Os jogadores mais consistentes do mes em destaque.'
    },
    {
      id: 'allTime',
      label: 'Rank Geral',
      subtitle: 'Veja quem lidera o PlayTalk no ranking geral.'
    }
  ];
  const PERIOD_MAP = PERIODS.reduce((acc, period) => {
    acc[period.id] = period;
    return acc;
  }, {});
  const DEFAULT_AVATAR = '/Avatar/avatar-man-person-svgrepo-com.svg';
  const PLACEHOLDER_NAME = 'Usuario';

  const PODIUM_STYLES = {
    1: {
      tone: 'is-first',
      color: '#e7c97b',
      glow: 'rgba(231, 201, 123, 0.24)'
    },
    2: {
      tone: 'is-second',
      color: '#cad5df',
      glow: 'rgba(202, 213, 223, 0.2)'
    },
    3: {
      tone: 'is-third',
      color: '#bf8a65',
      glow: 'rgba(191, 138, 101, 0.22)'
    }
  };

  const els = {
    podium: document.getElementById('podium'),
    rankingTableBody: document.getElementById('rankingTableBody'),
    periodTabs: document.getElementById('periodTabs'),
    pageSubtitle: document.querySelector('.page-subtitle'),
    tablePeriodLabel: document.getElementById('tablePeriodLabel'),
    tableTitle: document.getElementById('rankingTableTitle')
  };

  const state = {
    activePeriod: 'weekly',
    currentUserId: 0,
    cache: new Map(),
    loading: false,
    error: '',
    requestId: 0
  };

  function formatFlashcards(value) {
    return Number(value || 0).toLocaleString('pt-BR');
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, (char) => (
      {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        '\'': '&#39;'
      }[char] || char
    ));
  }

  function createPlaceholderEntry(rank) {
    return {
      rank,
      username: PLACEHOLDER_NAME,
      avatarImage: DEFAULT_AVATAR,
      flashcardsCount: 0,
      userId: 0,
      isPlaceholder: true
    };
  }

  function buildPlaceholderRanking(limit) {
    return Array.from({ length: limit }, (_, index) => createPlaceholderEntry(index + 1));
  }

  function fallbackPayload(periodId) {
    const period = PERIOD_MAP[periodId] || PERIOD_MAP.weekly;
    return {
      period: period.id,
      periodLabel: period.label,
      ranking: buildPlaceholderRanking(100),
      player: null
    };
  }

  function buildApiUrl(path) {
    if (window.PlaytalkApi && typeof window.PlaytalkApi.url === 'function') {
      return window.PlaytalkApi.url(path);
    }
    return path;
  }

  function normalizeRankingPayload(periodId, payload) {
    const period = PERIOD_MAP[periodId] || PERIOD_MAP.weekly;
    const ranking = Array.isArray(payload?.ranking) ? payload.ranking : [];
    const normalizedRanking = buildPlaceholderRanking(100).map((placeholder, index) => {
      const entry = ranking[index];
      if (!entry || typeof entry !== 'object') {
        return placeholder;
      }
      return {
        rank: Number(entry.rank) || (index + 1),
        username: String(entry.username || PLACEHOLDER_NAME).trim() || PLACEHOLDER_NAME,
        avatarImage: String(entry.avatarImage || DEFAULT_AVATAR).trim() || DEFAULT_AVATAR,
        flashcardsCount: Number(entry.flashcardsCount) || 0,
        userId: Number(entry.userId) || 0,
        isPlaceholder: Boolean(entry.isPlaceholder)
      };
    });

    return {
      period: period.id,
      periodLabel: String(payload?.periodLabel || period.label),
      ranking: normalizedRanking,
      player: payload?.player && typeof payload.player === 'object'
        ? {
          userId: Number(payload.player.userId) || 0,
          rank: Number(payload.player.rank) || 0
        }
        : null
    };
  }

  async function fetchRanking(periodId) {
    const response = await fetch(buildApiUrl(`/api/rankings/flashcards?period=${encodeURIComponent(periodId)}&limit=100`), {
      cache: 'no-store'
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.success) {
      throw new Error(payload?.message || 'Falha ao carregar ranking.');
    }
    return normalizeRankingPayload(periodId, payload);
  }

  function getActivePayload() {
    return state.cache.get(state.activePeriod) || fallbackPayload(state.activePeriod);
  }

  function buildPodiumEntries(ranking) {
    const first = ranking[0] || createPlaceholderEntry(1);
    const second = ranking[1] || createPlaceholderEntry(2);
    const third = ranking[2] || createPlaceholderEntry(3);
    return [second, first, third];
  }

  function resolveAvatar(entry) {
    return entry && entry.avatarImage ? entry.avatarImage : DEFAULT_AVATAR;
  }

  function buildTableMeta(entry) {
    return entry && !entry.isPlaceholder && entry.userId
      ? 'Jogador PlayTalk'
      : 'Vaga pronta para novo jogador';
  }

  function createPodiumCard(entry) {
    const style = PODIUM_STYLES[entry.rank] || PODIUM_STYLES[3];
    const avatar = resolveAvatar(entry);
    const username = escapeHtml(entry.username || PLACEHOLDER_NAME);
    const meta = entry && !entry.isPlaceholder && entry.userId
      ? 'Jogador em destaque'
      : 'Aguardando jogador';

    return `
      <article
        class="podium-card ${style.tone}"
        style="--podium-color:${style.color}; --podium-glow:${style.glow};"
      >
        <div class="podium-rank">${entry.rank}</div>
        <div class="podium-avatar">
          <img src="${avatar}" alt="${username}" onerror="this.onerror=null;this.src='${DEFAULT_AVATAR}';">
        </div>
        <p class="podium-name">${username}</p>
        <p class="podium-meta">${meta}</p>
        <p class="podium-count">
          ${formatFlashcards(entry.flashcardsCount)}
          <span>Flashcards</span>
        </p>
      </article>
    `;
  }

  function createTableRow(entry) {
    const avatar = resolveAvatar(entry);
    const isCurrentPlayer = state.currentUserId && entry.userId === state.currentUserId;
    const username = escapeHtml(entry.username || PLACEHOLDER_NAME);
    return `
      <tr class="${isCurrentPlayer ? 'is-current-player' : ''}">
        <td class="cell-position">${entry.rank}</td>
        <td>
          <div class="cell-user">
            <img class="table-avatar" src="${avatar}" alt="${username}" loading="lazy" onerror="this.onerror=null;this.src='${DEFAULT_AVATAR}';">
            <div class="table-user-copy">
              <span class="table-user-name">${username}</span>
              <span class="table-user-meta">${buildTableMeta(entry)}</span>
            </div>
          </div>
        </td>
        <td class="cell-flashcards">${formatFlashcards(entry.flashcardsCount)}</td>
      </tr>
    `;
  }

  function createPeriodTabs() {
    return PERIODS.map((period) => `
      <button
        class="rank-tab${period.id === state.activePeriod ? ' is-active' : ''}"
        type="button"
        data-period="${period.id}"
        aria-pressed="${period.id === state.activePeriod ? 'true' : 'false'}"
      >
        ${period.label}
      </button>
    `).join('');
  }

  function render() {
    const period = PERIOD_MAP[state.activePeriod] || PERIOD_MAP.weekly;
    const payload = getActivePayload();
    const ranking = Array.isArray(payload.ranking) ? payload.ranking : buildPlaceholderRanking(100);
    const subtitleSuffix = state.error ? ' Exibindo vagas padrao por enquanto.' : state.loading ? ' Atualizando ranking...' : '';

    state.currentUserId = Number(payload?.player?.userId) || 0;
    els.pageSubtitle.textContent = `${period.subtitle}${subtitleSuffix}`;
    els.tableTitle.textContent = 'Top 100 PlayTalk';
    els.tablePeriodLabel.textContent = payload.periodLabel || period.label;
    els.podium.innerHTML = buildPodiumEntries(ranking).map(createPodiumCard).join('');
    els.rankingTableBody.innerHTML = ranking.slice(3).map(createTableRow).join('');
    els.periodTabs.innerHTML = createPeriodTabs();
  }

  async function loadPeriod(periodId) {
    const nextPeriod = PERIOD_MAP[periodId] ? periodId : 'weekly';
    state.activePeriod = nextPeriod;

    if (state.cache.has(nextPeriod)) {
      state.error = '';
      render();
      return;
    }

    const requestId = state.requestId + 1;
    state.requestId = requestId;
    state.loading = true;
    state.error = '';
    render();

    try {
      const payload = await fetchRanking(nextPeriod);
      if (requestId !== state.requestId) return;
      state.cache.set(nextPeriod, payload);
    } catch (_error) {
      if (requestId !== state.requestId) return;
      state.cache.set(nextPeriod, fallbackPayload(nextPeriod));
      state.error = 'fallback';
    } finally {
      if (requestId !== state.requestId) return;
      state.loading = false;
      render();
    }
  }

  function handleTabClick(event) {
    const trigger = event.target.closest('[data-period]');
    if (!trigger) return;

    const nextPeriod = trigger.getAttribute('data-period');
    if (!nextPeriod || nextPeriod === state.activePeriod) return;

    loadPeriod(nextPeriod);
  }

  els.periodTabs.addEventListener('click', handleTabClick);
  render();
  loadPeriod(state.activePeriod);
})();
