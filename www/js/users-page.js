(function initPlaytalkUsersPage() {
  const GUEST_ID_KEY = 'playtalk_guest_rank_id';
  const GUEST_PROGRESS_KEY = 'playtalk-flashcards-progress-v3';
  const els = {
    usersList: document.getElementById('usersList'),
    usersStatus: document.getElementById('usersStatus')
  };

  const state = {
    currentUser: null,
    busyUserId: 0,
    viewer: null
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

  function safeText(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  function readGuestName() {
    try {
      let id = localStorage.getItem(GUEST_ID_KEY);
      if (!id) {
        id = String(Math.floor(100000 + Math.random() * 900000));
        localStorage.setItem(GUEST_ID_KEY, id);
      }
      return `#user${id}`;
    } catch (_error) {
      return '#user000000';
    }
  }

  function readGuestFlashcardsCount() {
    try {
      const parsed = JSON.parse(localStorage.getItem(GUEST_PROGRESS_KEY) || '[]');
      return Array.isArray(parsed) ? parsed.length : 0;
    } catch (_error) {
      return 0;
    }
  }

  function normalizeUser(user) {
    if (!user || typeof user !== 'object') return null;
    const id = Number(user.id) || 0;
    const username = safeText(user.username);
    if (!id || !username) return null;
    return {
      id,
      username,
      isAdmin: Boolean(user.is_admin)
    };
  }

  function normalizeUsers(payload) {
    const users = Array.isArray(payload?.users) ? payload.users : [];
    return users.map((entry) => ({
      userId: Number(entry?.userId) || 0,
      username: safeText(entry?.username || 'Usuario') || 'Usuario',
      rank: Number(entry?.rank) || 0,
      flashcardsCount: Number(entry?.flashcardsCount) || 0,
      premiumUntil: entry?.premiumUntil || null,
      premiumActive: Boolean(entry?.premiumActive)
    }));
  }

  function normalizeViewer(entry) {
    if (!entry || typeof entry !== 'object') return null;
    return {
      userId: Number(entry?.userId) || 0,
      username: safeText(entry?.username || 'Usuario') || 'Usuario',
      rank: Number(entry?.rank) || 0,
      flashcardsCount: Number(entry?.flashcardsCount) || 0
    };
  }

  function currentViewerEntry(rows) {
    if (state.currentUser?.id) {
      return state.viewer || rows.find((entry) => entry.userId === state.currentUser.id) || null;
    }
    const guestCount = readGuestFlashcardsCount();
    const higherCount = rows.filter((entry) => entry.flashcardsCount > guestCount).length;
    return {
      userId: 0,
      username: readGuestName(),
      rank: higherCount + 1,
      flashcardsCount: guestCount,
      premiumActive: false
    };
  }

  function renderRows(rows) {
    if (!rows.length) {
      els.usersList.innerHTML = `
        <div class="users-row is-empty">
          <span>Nenhum usuario cadastrado apareceu ainda.</span>
        </div>
      `;
      return;
    }

    const isAdmin = Boolean(state.currentUser?.isAdmin);
    const displayRows = rows.slice(0, 50);
    if (!state.currentUser?.id) {
      const guestEntry = currentViewerEntry(rows);
      const alreadyShown = displayRows.some((entry) => entry.rank === guestEntry.rank && entry.username === guestEntry.username);
      if (!alreadyShown) {
        displayRows.push(guestEntry);
      }
    }
    displayRows.sort((left, right) => (left.rank || 999999) - (right.rank || 999999));

    const rowMarkup = displayRows.map((entry) => `
      <div class="users-row" data-user-id="${entry.userId}">
        <div class="users-rank">${escapeHtml(`${entry.rank || 0}º`)}</div>
        <div class="users-avatar"><img src="Avatar/avatar-man-person-svgrepo-com.svg" alt=""></div>
        <div class="users-main">
          <span class="users-name">${escapeHtml(entry.username)}</span>
          <span class="users-sub">${escapeHtml(`${entry.flashcardsCount} flashcards`)}</span>
        </div>
        ${isAdmin ? `
          <div class="users-actions">
            <button class="users-action" type="button" data-plan="semana" ${state.busyUserId === entry.userId ? 'disabled' : ''}>1 semana</button>
            <button class="users-action" type="button" data-plan="mes" ${state.busyUserId === entry.userId ? 'disabled' : ''}>1 mes</button>
            <button class="users-action" type="button" data-plan="ano" ${state.busyUserId === entry.userId ? 'disabled' : ''}>1 ano</button>
          </div>
        ` : ''}
      </div>
    `).join('');

    els.usersList.innerHTML = rowMarkup;
  }

  async function fetchSessionUser() {
    const response = await fetch(buildApiUrl('/auth/session'), { cache: 'no-store', credentials: 'include' });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.success) return null;
    return normalizeUser(payload.user);
  }

  async function loadUsers(message) {
    els.usersStatus.textContent = message || 'Carregando ranking...';

    try {
      const response = await fetch(buildApiUrl('/api/users/flashcards?limit=50'), {
        cache: 'no-store',
        credentials: 'include'
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Falha ao carregar usuarios.');
      }

      const users = normalizeUsers(payload);
      state.viewer = normalizeViewer(payload.viewer);
      renderRows(users);
      const viewer = currentViewerEntry(users);
      els.usersStatus.textContent = viewer?.rank
        ? `Voce esta em ${viewer.rank}º lugar`
        : 'Ranking carregado.';
    } catch (_error) {
      renderRows([]);
      els.usersStatus.textContent = 'Nao consegui carregar o ranking agora.';
    }
  }

  async function assignPremium(userId, plan) {
    if (!state.currentUser?.isAdmin || !userId || !plan) return;
    state.busyUserId = userId;
    await loadUsers('Liberando premium...');
    try {
      const response = await fetch(buildApiUrl(`/api/admin/users/${userId}/premium`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
        credentials: 'include'
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Nao foi possivel liberar premium.');
      }
      await loadUsers(payload.message || 'Premium liberado.');
    } catch (error) {
      await loadUsers(error?.message || 'Nao foi possivel liberar premium.');
    } finally {
      state.busyUserId = 0;
    }
  }

  els.usersList?.addEventListener('click', (event) => {
    const button = event.target.closest('.users-action');
    if (!button) return;
    const row = button.closest('.users-row');
    const userId = Number(row?.dataset?.userId) || 0;
    const plan = safeText(button.dataset.plan);
    void assignPremium(userId, plan);
  });

  (async () => {
    state.currentUser = await fetchSessionUser();
    await loadUsers();
  })();
})();


