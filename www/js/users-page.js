(function initPlaytalkUsersPage() {
  const els = {
    usersList: document.getElementById('usersList'),
    usersStatus: document.getElementById('usersStatus')
  };

  const state = {
    currentUser: null,
    busyUserId: 0
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

  function formatPremium(entry) {
    if (!entry?.premiumActive) return 'Sem premium';
    if (!entry?.premiumUntil) return 'Premium ativo';
    const date = new Date(entry.premiumUntil);
    if (Number.isNaN(date.getTime())) return 'Premium ativo';
    return `Premium ate ${date.toLocaleDateString('pt-BR')}`;
  }

  function normalizeUser(user) {
    if (!user || typeof user !== 'object') return null;
    const id = Number(user.id) || 0;
    const username = String(user.username || '').trim();
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
      username: String(entry?.username || 'Usuario').trim() || 'Usuario',
      flashcardsCount: Number(entry?.flashcardsCount) || 0,
      premiumFullAccess: Boolean(entry?.premiumFullAccess),
      premiumUntil: entry?.premiumUntil || null,
      premiumActive: Boolean(entry?.premiumActive)
    }));
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
    const headerMarkup = `
      <div class="users-row is-header">
        <span>Usuario</span>
        <span>Flashcards</span>
        <span>Premium</span>
        ${isAdmin ? '<span>Acoes</span>' : ''}
      </div>
    `;

    const rowMarkup = rows.map((entry) => `
      <div class="users-row" data-user-id="${entry.userId}">
        <span class="users-name">${escapeHtml(entry.username)}</span>
        <span class="users-count">${escapeHtml(formatFlashcards(entry.flashcardsCount))}</span>
        <span class="users-premium ${entry.premiumActive ? 'is-active' : ''}">${escapeHtml(formatPremium(entry))}</span>
        ${isAdmin ? `
          <div class="users-actions">
            <button class="users-action" type="button" data-plan="semana" ${state.busyUserId === entry.userId ? 'disabled' : ''}>Atribuir 1 semana</button>
            <button class="users-action" type="button" data-plan="mes" ${state.busyUserId === entry.userId ? 'disabled' : ''}>Atribuir 1 mes</button>
            <button class="users-action" type="button" data-plan="ano" ${state.busyUserId === entry.userId ? 'disabled' : ''}>Atribuir 1 ano</button>
          </div>
        ` : ''}
      </div>
    `).join('');

    els.usersList.innerHTML = `${headerMarkup}${rowMarkup}`;
  }

  async function fetchSessionUser() {
    const response = await fetch(buildApiUrl('/auth/session'), { cache: 'no-store', credentials: 'include' });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.success) return null;
    return normalizeUser(payload.user);
  }

  async function loadUsers(message) {
    els.usersStatus.textContent = message || 'Carregando usuarios...';

    try {
      const response = await fetch(buildApiUrl('/api/users/flashcards'), {
        cache: 'no-store',
        credentials: 'include'
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Falha ao carregar usuarios.');
      }

      const users = normalizeUsers(payload);
      renderRows(users);
      els.usersStatus.textContent = users.length
        ? `${users.length} usuarios cadastrados no PlayTalk`
        : 'Sem usuarios por enquanto.';
    } catch (_error) {
      renderRows([]);
      els.usersStatus.textContent = 'Nao consegui carregar os usuarios agora.';
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
    const plan = String(button.dataset.plan || '').trim();
    void assignPremium(userId, plan);
  });

  (async () => {
    state.currentUser = await fetchSessionUser();
    await loadUsers();
  })();
})();
