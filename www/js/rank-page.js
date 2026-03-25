(function initPlaytalkRankPage() {
  const PLAYER_ID_STORAGE_KEY = 'playtalk-flashcards-player-id-v1';
  const REFRESH_INTERVAL_MS = 30000;

  const els = {
    refreshBtn: document.getElementById('refreshBtn'),
    playerNumber: document.getElementById('playerNumber'),
    playerStatus: document.getElementById('playerStatus'),
    playerRank: document.getElementById('playerRank'),
    playerCount: document.getElementById('playerCount'),
    leaderboard: document.getElementById('leaderboard'),
    lastUpdated: document.getElementById('lastUpdated')
  };

  function buildApiUrl(path) {
    if (window.PlaytalkApi && typeof window.PlaytalkApi.url === 'function') {
      return window.PlaytalkApi.url(path);
    }
    return path;
  }

  function createAnonymousRankPlayerId() {
    return `flash-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function getOrCreatePlayerId() {
    try {
      const stored = localStorage.getItem(PLAYER_ID_STORAGE_KEY) || '';
      if (stored.trim()) {
        return stored.trim();
      }
      const created = createAnonymousRankPlayerId();
      localStorage.setItem(PLAYER_ID_STORAGE_KEY, created);
      return created;
    } catch (_error) {
      return createAnonymousRankPlayerId();
    }
  }

  function formatPlayerNumber(value) {
    const number = Number.parseInt(value, 10);
    if (!Number.isFinite(number) || number <= 0) {
      return 'Sem numero ainda';
    }
    return `#${String(number).padStart(6, '0')}`;
  }

  function formatCount(value) {
    const count = Number.parseInt(value, 10) || 0;
    return `${count.toLocaleString('pt-BR')} flashcards`;
  }

  function formatShortDate(value) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short'
    });
  }

  function renderPlayer(player) {
    if (!player) {
      els.playerNumber.textContent = 'Anonimo local';
      els.playerRank.textContent = '-';
      els.playerCount.textContent = '0';
      els.playerStatus.textContent = 'Jogue em /flashcards para sincronizar seu total e receber seu numero aleatorio no servidor.';
      return;
    }

    els.playerNumber.textContent = formatPlayerNumber(player.playerNumber);
    els.playerRank.textContent = player.rank ? `#${player.rank}` : '-';
    els.playerCount.textContent = Number(player.flashcardsCount || 0).toLocaleString('pt-BR');
    els.playerStatus.textContent = `Seu jogador anonimo esta com ${formatCount(player.flashcardsCount)}. Ultima atualizacao: ${formatShortDate(player.updatedAt)}.`;
  }

  function renderLeaderboard(rows, playerId) {
    if (!Array.isArray(rows) || !rows.length) {
      els.leaderboard.innerHTML = '<div class="leaderboard-empty">Ainda nao tem jogadores sincronizados. Abre <strong>/flashcards</strong>, joga um pouco e volta aqui.</div>';
      return;
    }

    els.leaderboard.innerHTML = rows.map((row) => {
      const isMe = row.playerId === playerId;
      return `
        <article class="leaderboard-row${isMe ? ' is-me' : ''}">
          <div class="rank-pill">#${row.rank}</div>
          <div class="player-line">
            <strong>${formatPlayerNumber(row.playerNumber)}</strong>
            <span>${isMe ? 'Voce' : 'Jogador anonimo'}</span>
          </div>
          <div class="count-line">
            <div class="count-strong">${formatCount(row.flashcardsCount)}</div>
          </div>
          <div class="updated-line">
            Atualizado em ${formatShortDate(row.updatedAt)}
          </div>
        </article>
      `;
    }).join('');
  }

  async function loadRanking() {
    const playerId = getOrCreatePlayerId();
    els.lastUpdated.textContent = 'Atualizando...';
    els.refreshBtn.disabled = true;

    try {
      const response = await fetch(
        buildApiUrl(`/api/rankings/flashcards?limit=50&playerId=${encodeURIComponent(playerId)}`),
        { cache: 'no-store' }
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Falha ao carregar ranking.');
      }

      renderPlayer(payload.player || null);
      renderLeaderboard(payload.ranking || [], playerId);
      els.lastUpdated.textContent = `Atualizado agora: ${new Date().toLocaleTimeString('pt-BR')}`;
    } catch (error) {
      renderPlayer(null);
      els.leaderboard.innerHTML = `<div class="leaderboard-empty">${String(error.message || 'Falha ao carregar ranking.')}</div>`;
      els.lastUpdated.textContent = 'Erro ao atualizar';
    } finally {
      els.refreshBtn.disabled = false;
    }
  }

  els.refreshBtn?.addEventListener('click', loadRanking);
  loadRanking();
  window.setInterval(loadRanking, REFRESH_INTERVAL_MS);
})();
