(function initPlaytalkRankPage() {
  const PERIODS = [
    { id: 'weekly', label: 'Rank Semanal' },
    { id: 'monthly', label: 'Rank Mensal' },
    { id: 'allTime', label: 'Rank Geral' }
  ];

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

  const mockRankings = {
    weekly: {
      subtitle: 'Confira os Top Falantes da Semana!',
      tableLabel: 'Rank Semanal',
      topThree: [
        { position: 2, name: 'Bianca', number: 1088, flashcards: 7420, avatar: '/arquivos-codex/avatar/12.webp' },
        { position: 1, name: 'Caio', number: 1042, flashcards: 8240, avatar: '/arquivos-codex/avatar/33.webp' },
        { position: 3, name: 'Luna', number: 1165, flashcards: 7010, avatar: '/arquivos-codex/avatar/48.webp' }
      ],
      tableRows: [
        { position: 4, number: 1024, flashcards: 6880 },
        { position: 5, number: 1137, flashcards: 6610 },
        { position: 6, number: 1192, flashcards: 6455 },
        { position: 7, number: 1270, flashcards: 6218 },
        { position: 8, number: 1314, flashcards: 5984 },
        { position: 9, number: 1406, flashcards: 5760 },
        { position: 10, number: 1491, flashcards: 5528 }
      ]
    },
    monthly: {
      subtitle: 'Os jogadores mais consistentes do mes em destaque.',
      tableLabel: 'Rank Mensal',
      topThree: [
        { position: 2, name: 'Maya', number: 1216, flashcards: 22480, avatar: '/arquivos-codex/avatar/27.webp' },
        { position: 1, name: 'Noah', number: 1007, flashcards: 23960, avatar: '/arquivos-codex/avatar/41.webp' },
        { position: 3, name: 'Rafa', number: 1184, flashcards: 21910, avatar: '/arquivos-codex/avatar/08.webp' }
      ],
      tableRows: [
        { position: 4, number: 1092, flashcards: 21460 },
        { position: 5, number: 1178, flashcards: 20910 },
        { position: 6, number: 1243, flashcards: 20120 },
        { position: 7, number: 1366, flashcards: 19540 },
        { position: 8, number: 1428, flashcards: 19075 },
        { position: 9, number: 1502, flashcards: 18460 },
        { position: 10, number: 1589, flashcards: 17920 }
      ]
    },
    allTime: {
      subtitle: 'Veja quem lidera o PlayTalk no ranking geral.',
      tableLabel: 'Rank Geral',
      topThree: [
        { position: 2, name: 'Helena', number: 1103, flashcards: 48620, avatar: '/arquivos-codex/avatar/05.webp' },
        { position: 1, name: 'Theo', number: 1001, flashcards: 51440, avatar: '/arquivos-codex/avatar/60.webp' },
        { position: 3, name: 'Gael', number: 1259, flashcards: 47280, avatar: '/arquivos-codex/avatar/18.webp' }
      ],
      tableRows: [
        { position: 4, number: 1064, flashcards: 46010 },
        { position: 5, number: 1142, flashcards: 45130 },
        { position: 6, number: 1238, flashcards: 43860 },
        { position: 7, number: 1345, flashcards: 42690 },
        { position: 8, number: 1451, flashcards: 41825 },
        { position: 9, number: 1517, flashcards: 41070 },
        { position: 10, number: 1620, flashcards: 40315 }
      ]
    }
  };

  const els = {
    podium: document.getElementById('podium'),
    rankingTableBody: document.getElementById('rankingTableBody'),
    periodTabs: document.getElementById('periodTabs'),
    pageSubtitle: document.querySelector('.page-subtitle'),
    tablePeriodLabel: document.getElementById('tablePeriodLabel')
  };

  const state = {
    activePeriod: 'weekly'
  };

  function formatFlashcards(value) {
    return Number(value || 0).toLocaleString('pt-BR');
  }

  function normalizePeriodData(periodId) {
    return mockRankings[periodId] || mockRankings.weekly;
  }

  function createPodiumCard(entry) {
    const style = PODIUM_STYLES[entry.position] || PODIUM_STYLES[3];

    return `
      <article
        class="podium-card ${style.tone}"
        style="--podium-color:${style.color}; --podium-glow:${style.glow};"
      >
        <div class="podium-rank">${entry.position}</div>
        <div class="podium-avatar">
          <img src="${entry.avatar}" alt="${entry.name}">
        </div>
        <p class="podium-name">${entry.name}</p>
        <p class="podium-meta">#${entry.number}</p>
        <p class="podium-count">
          ${formatFlashcards(entry.flashcards)}
          <span>Flashcards</span>
        </p>
      </article>
    `;
  }

  function createTableRow(entry) {
    return `
      <tr>
        <td class="cell-position">${entry.position}</td>
        <td class="cell-number">#${entry.number}</td>
        <td class="cell-flashcards">${formatFlashcards(entry.flashcards)}</td>
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
    const periodData = normalizePeriodData(state.activePeriod);
    els.pageSubtitle.textContent = periodData.subtitle;
    els.tablePeriodLabel.textContent = periodData.tableLabel;
    els.podium.innerHTML = periodData.topThree.map(createPodiumCard).join('');
    els.rankingTableBody.innerHTML = periodData.tableRows.map(createTableRow).join('');
    els.periodTabs.innerHTML = createPeriodTabs();
  }

  function handleTabClick(event) {
    const trigger = event.target.closest('[data-period]');
    if (!trigger) return;

    const nextPeriod = trigger.getAttribute('data-period');
    if (!nextPeriod || nextPeriod === state.activePeriod) return;

    state.activePeriod = nextPeriod;
    render();
  }

  els.periodTabs.addEventListener('click', handleTabClick);
  render();
})();
