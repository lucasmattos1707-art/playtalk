(function initPlaytalkRankPage() {
  const els = {
    leagueList: document.getElementById('leagueList'),
    rankStatus: document.getElementById('rankStatus')
  };

  function buildApiUrl(path) {
    if (window.PlaytalkApi && typeof window.PlaytalkApi.url === 'function') {
      return window.PlaytalkApi.url(path);
    }
    return path;
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

  function formatFlashcards(value) {
    return Number(value || 0).toLocaleString('pt-BR');
  }

  function normalizeRanking(payload) {
    const ranking = Array.isArray(payload?.ranking) ? payload.ranking : [];
    return ranking.map((entry) => ({
      username: String(entry?.username || 'Usuario').trim() || 'Usuario',
      flashcardsCount: Number(entry?.allTimeFlashcardsCount ?? entry?.flashcardsCount) || 0
    }));
  }

  function renderRows(rows) {
    if (!rows.length) {
      els.leagueList.innerHTML = `
        <div class="league-row is-empty">
          <span>Nenhum usuario apareceu na liga ainda.</span>
        </div>
      `;
      return;
    }

    const headerMarkup = `
      <div class="league-row is-header">
        <span>Nome</span>
        <span>Flashcards</span>
      </div>
    `;

    const rowMarkup = rows.map((entry) => `
      <div class="league-row">
        <span class="league-name">${escapeHtml(entry.username)}</span>
        <span class="league-count">${escapeHtml(formatFlashcards(entry.flashcardsCount))}</span>
      </div>
    `).join('');

    els.leagueList.innerHTML = `${headerMarkup}${rowMarkup}`;
  }

  async function loadRanking() {
    els.rankStatus.textContent = 'Carregando usuarios...';

    try {
      const response = await fetch(buildApiUrl('/api/rankings/flashcards?period=allTime'), {
        cache: 'no-store'
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Falha ao carregar a liga.');
      }

      const ranking = normalizeRanking(payload);
      renderRows(ranking);
      els.rankStatus.textContent = ranking.length
        ? `${ranking.length} usuarios na Liga PlayTalk`
        : 'Sem usuarios por enquanto.';
    } catch (_error) {
      renderRows([]);
      els.rankStatus.textContent = 'Nao consegui carregar a Liga PlayTalk agora.';
    }
  }

  loadRanking();
})();
