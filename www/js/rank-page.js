(function initPlaytalkRankPage() {
  const REFRESH_INTERVAL_MS = 30000;
  const MAX_AVATAR_WIDTH = 320;
  const MAX_AVATAR_HEIGHT = 320;
  const AVATAR_IMAGE_QUALITY = 0.88;

  const els = {
    refreshBtn: document.getElementById('refreshBtn'),
    playerHeadline: document.getElementById('playerHeadline'),
    selfSlot: document.getElementById('selfSlot'),
    leaderboard: document.getElementById('leaderboard'),
    lastUpdated: document.getElementById('lastUpdated'),
    avatarUploadInput: document.getElementById('avatarUploadInput')
  };

  const state = {
    sessionUser: null,
    player: null,
    ranking: [],
    uploadingAvatar: false
  };

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

  function normalizeUser(user) {
    if (!user || typeof user !== 'object') return null;
    const id = Number(user.id) || 0;
    const username = safeText(user.username);
    if (!id || !username) return null;
    return {
      id,
      username,
      avatarImage: safeText(user.avatarImage || user.avatar_image)
    };
  }

  function formatCount(value) {
    const count = Number.parseInt(value, 10) || 0;
    return `${count.toLocaleString('pt-BR')} flashcards`;
  }

  function formatShortDate(value) {
    if (!value) return 'agora';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'agora';
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function ordinalPlace(rank) {
    const normalized = Number(rank) || 0;
    if (!normalized) return 'fora do ranking';
    return `${normalized}o lugar`;
  }

  function createInitials(name) {
    const normalized = safeText(name);
    if (!normalized) return '?';
    return normalized.charAt(0).toUpperCase();
  }

  function avatarMarkup(user) {
    const avatarImage = safeText(user?.avatarImage);
    const initials = escapeHtml(createInitials(user?.username));
    if (avatarImage) {
      return `<div class="avatar-box"><img src="${escapeHtml(avatarImage)}" alt="${escapeHtml(user?.username || 'Avatar')}"></div>`;
    }
    return `<div class="avatar-box">${initials}</div>`;
  }

  function uploadButtonMarkup() {
    if (!state.sessionUser) return '';
    return `<button class="avatar-upload" type="button" data-action="avatar-upload" aria-label="Trocar avatar">+</button>`;
  }

  function renderHeadline(player) {
    if (player?.rank) {
      els.playerHeadline.textContent = `Voce esta em ${ordinalPlace(player.rank)}.`;
      return;
    }

    if (state.sessionUser) {
      els.playerHeadline.textContent = 'Voce ainda nao entrou no ranking. Jogue em /flashcards para aparecer aqui.';
      return;
    }

    els.playerHeadline.textContent = 'Entre em /flashcards para ver sua posicao e aparecer no ranking.';
  }

  function renderSelfRow(player) {
    if (!state.sessionUser) {
      els.selfSlot.innerHTML = '';
      return;
    }

    const displayPlayer = player || {
      rank: 0,
      username: state.sessionUser.username,
      avatarImage: state.sessionUser.avatarImage,
      flashcardsCount: 0,
      updatedAt: null
    };

    els.selfSlot.innerHTML = `
      <article class="leaderboard-row is-me is-self">
        <div class="rank-pill">${displayPlayer.rank ? `#${displayPlayer.rank}` : '--'}</div>
        <div class="avatar-stack">
          ${avatarMarkup(displayPlayer)}
          ${uploadButtonMarkup()}
        </div>
        <div class="player-line">
          <strong>${escapeHtml(displayPlayer.username)}</strong>
          <span>${displayPlayer.rank ? `Voce esta em ${ordinalPlace(displayPlayer.rank)}.` : 'Seu lugar aparece assim que voce sincroniza seus flashcards.'}</span>
        </div>
        <div class="count-line">
          <div class="count-strong">${formatCount(displayPlayer.flashcardsCount)}</div>
          <div class="updated-line">Atualizado em ${formatShortDate(displayPlayer.updatedAt)}</div>
        </div>
      </article>
    `;
  }

  function renderLeaderboard(rows) {
    if (!Array.isArray(rows) || !rows.length) {
      els.leaderboard.innerHTML = '<div class="leaderboard-empty">Ainda nao tem jogadores sincronizados. Abre <strong>/flashcards</strong>, joga um pouco e volta aqui.</div>';
      return;
    }

    const currentUserId = Number(state.sessionUser?.id) || 0;

    els.leaderboard.innerHTML = rows.map((row) => {
      const isMe = currentUserId && Number(row.userId) === currentUserId;
      return `
        <article class="leaderboard-row${isMe ? ' is-me' : ''}">
          <div class="rank-pill">#${Number(row.rank) || 0}</div>
          <div class="avatar-stack">
            ${avatarMarkup(row)}
            ${isMe ? uploadButtonMarkup() : ''}
          </div>
          <div class="player-line">
            <strong>${escapeHtml(row.username || `Jogador ${row.playerNumber || ''}`)}</strong>
            <span>${isMe ? 'Voce' : `Jogador #${String(row.playerNumber || '').padStart(6, '0')}`}</span>
          </div>
          <div class="count-line">
            <div class="count-strong">${formatCount(row.flashcardsCount)}</div>
            <div class="updated-line">Atualizado em ${formatShortDate(row.updatedAt)}</div>
          </div>
        </article>
      `;
    }).join('');
  }

  async function fetchSessionUser() {
    const response = await fetch(buildApiUrl('/auth/session'), {
      credentials: 'include',
      headers: buildAuthHeaders(),
      cache: 'no-store'
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.success) {
      return null;
    }
    return normalizeUser(payload.user);
  }

  async function loadRanking() {
    els.lastUpdated.textContent = 'Atualizando...';
    els.refreshBtn.disabled = true;

    try {
      state.sessionUser = await fetchSessionUser();

      const response = await fetch(buildApiUrl('/api/rankings/flashcards?limit=50'), {
        credentials: 'include',
        headers: buildAuthHeaders(),
        cache: 'no-store'
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Falha ao carregar ranking.');
      }

      state.player = payload.player || null;
      state.ranking = Array.isArray(payload.ranking) ? payload.ranking : [];

      if (state.sessionUser && state.player) {
        state.player.avatarImage = safeText(state.player.avatarImage || state.sessionUser.avatarImage);
      }

      renderHeadline(state.player);
      renderSelfRow(state.player);
      renderLeaderboard(state.ranking);
      els.lastUpdated.textContent = `Atualizado agora: ${new Date().toLocaleTimeString('pt-BR')}`;
    } catch (error) {
      renderHeadline(null);
      renderSelfRow(null);
      els.leaderboard.innerHTML = `<div class="leaderboard-empty">${escapeHtml(error.message || 'Falha ao carregar ranking.')}</div>`;
      els.lastUpdated.textContent = 'Erro ao atualizar';
    } finally {
      els.refreshBtn.disabled = false;
    }
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Nao consegui ler a imagem.'));
      reader.readAsDataURL(file);
    });
  }

  function resizeAvatarDataUrl(dataUrl) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const scale = Math.min(1, MAX_AVATAR_WIDTH / image.width, MAX_AVATAR_HEIGHT / image.height);
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error('Nao consegui preparar a imagem.'));
          return;
        }
        context.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', AVATAR_IMAGE_QUALITY));
      };
      image.onerror = () => reject(new Error('Nao consegui abrir a imagem.'));
      image.src = dataUrl;
    });
  }

  async function uploadAvatar(file) {
    if (!state.sessionUser) {
      els.lastUpdated.textContent = 'Entre em /flashcards para trocar seu avatar';
      return;
    }

    if (!file) return;

    state.uploadingAvatar = true;
    els.lastUpdated.textContent = 'Enviando avatar...';

    try {
      const rawDataUrl = await readFileAsDataUrl(file);
      const avatarDataUrl = await resizeAvatarDataUrl(rawDataUrl);
      const response = await fetch(buildApiUrl('/auth/avatar'), {
        method: 'PATCH',
        credentials: 'include',
        headers: buildAuthHeaders({
          'Content-Type': 'application/json'
        }),
        body: JSON.stringify({ avatarDataUrl })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Nao consegui salvar seu avatar.');
      }

      state.sessionUser = normalizeUser(payload.user) || state.sessionUser;
      await loadRanking();
    } catch (error) {
      els.lastUpdated.textContent = String(error.message || 'Falha ao enviar avatar.');
    } finally {
      state.uploadingAvatar = false;
      els.avatarUploadInput.value = '';
    }
  }

  els.refreshBtn?.addEventListener('click', loadRanking);
  els.leaderboard?.addEventListener('click', (event) => {
    if (state.uploadingAvatar) return;
    const uploadTrigger = event.target.closest('[data-action="avatar-upload"]');
    if (!uploadTrigger) return;
    els.avatarUploadInput.click();
  });
  els.selfSlot?.addEventListener('click', (event) => {
    if (state.uploadingAvatar) return;
    const uploadTrigger = event.target.closest('[data-action="avatar-upload"]');
    if (!uploadTrigger) return;
    els.avatarUploadInput.click();
  });
  els.avatarUploadInput?.addEventListener('change', (event) => {
    const file = event.target.files?.[0] || null;
    uploadAvatar(file);
  });

  loadRanking();
  window.setInterval(loadRanking, REFRESH_INTERVAL_MS);
})();
