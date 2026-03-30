(function initPlaytalkUsersPage() {
  const GUEST_ID_KEY = 'playtalk_guest_rank_id';
  const GUEST_PROGRESS_KEY = 'playtalk-flashcards-progress-v3';
  const els = {
    usersList: document.getElementById('usersList'),
    usersStatus: document.getElementById('usersStatus'),
    adminModal: document.getElementById('usersAdminModal'),
    adminTitle: document.getElementById('usersAdminTitle'),
    adminCopy: document.getElementById('usersAdminCopy'),
    adminStatus: document.getElementById('usersAdminStatus'),
    grant7Btn: document.getElementById('grant7Btn'),
    grant30Btn: document.getElementById('grant30Btn'),
    grant365Btn: document.getElementById('grant365Btn'),
    deleteUserBtn: document.getElementById('deleteUserBtn'),
    closeAdminModalBtn: document.getElementById('closeAdminModalBtn')
  };

  const state = {
    currentUser: null,
    viewer: null,
    rows: [],
    selectedUser: null,
    adminBusy: false
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
      avatarImage: safeText(entry?.avatarImage || 'Avatar/avatar-man-person-svgrepo-com.svg') || 'Avatar/avatar-man-person-svgrepo-com.svg',
      isAdmin: Boolean(entry?.isAdmin),
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

  function isAdminViewer() {
    return Boolean(state.currentUser?.isAdmin);
  }

  function setAdminStatus(message) {
    if (!els.adminStatus) return;
    els.adminStatus.textContent = message || '';
  }

  function syncAdminButtons() {
    const disabled = state.adminBusy || !state.selectedUser;
    [els.grant7Btn, els.grant30Btn, els.grant365Btn, els.deleteUserBtn].forEach((button) => {
      if (!button) return;
      button.disabled = disabled;
    });
  }

  function closeAdminModal() {
    state.selectedUser = null;
    state.adminBusy = false;
    if (els.adminModal) els.adminModal.classList.remove('is-visible');
    setAdminStatus('');
    syncAdminButtons();
  }

  function openAdminModal(user) {
    if (!isAdminViewer() || !user || user.userId === state.currentUser?.id) return;
    state.selectedUser = user;
    state.adminBusy = false;
    if (els.adminTitle) els.adminTitle.textContent = user.username;
    if (els.adminCopy) {
      els.adminCopy.textContent = `Rank ${user.rank || 0} • ${user.flashcardsCount || 0} flashcards`;
    }
    if (els.adminModal) els.adminModal.classList.add('is-visible');
    setAdminStatus('');
    syncAdminButtons();
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

    const displayRows = rows
      .slice(0, 50)
      .sort((left, right) => (left.rank || 999999) - (right.rank || 999999));

    const rowMarkup = displayRows.map((entry) => `
      <div class="users-row${isAdminViewer() && entry.userId !== state.currentUser?.id ? ' is-admin-target' : ''}" data-user-id="${entry.userId}">
        <div class="users-avatar">
          <img src="${escapeHtml(entry.avatarImage || 'Avatar/avatar-man-person-svgrepo-com.svg')}" alt="${escapeHtml(entry.username)}">
          <span class="users-rank-badge">${escapeHtml(entry.rank || 0)}</span>
        </div>
        <div class="users-main">
          <span class="users-name">${escapeHtml(entry.username)}</span>
          <span class="users-meta">${entry.premiumActive ? 'Premium ativo' : 'Free'}</span>
        </div>
        <div class="users-count">${escapeHtml(entry.flashcardsCount || 0)}</div>
      </div>
    `).join('');

    els.usersList.innerHTML = rowMarkup;
    if (isAdminViewer()) {
      Array.from(els.usersList.querySelectorAll('[data-user-id]')).forEach((rowEl) => {
        rowEl.addEventListener('click', () => {
          const userId = Number(rowEl.getAttribute('data-user-id')) || 0;
          const user = state.rows.find((entry) => entry.userId === userId);
          openAdminModal(user);
        });
      });
    }
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
      state.rows = users;
      state.viewer = normalizeViewer(payload.viewer);
      renderRows(users);
      const viewer = currentViewerEntry(users);
      els.usersStatus.textContent = viewer?.rank
        ? `Voce esta em ${viewer.rank} lugar`
        : 'Ranking carregado.';
    } catch (_error) {
      renderRows([]);
      state.rows = [];
      els.usersStatus.textContent = 'Nao consegui carregar o ranking agora.';
    }
  }

  async function grantPremium(durationDays) {
    if (!state.selectedUser || state.adminBusy) return;
    state.adminBusy = true;
    syncAdminButtons();
    setAdminStatus('Liberando premium...');
    try {
      const response = await fetch(buildApiUrl(`/api/admin/users/${state.selectedUser.userId}/premium`), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ durationDays })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Erro ao atribuir premium.');
      }
      setAdminStatus('Premium atualizado.');
      await loadUsers('Atualizando ranking...');
    } catch (error) {
      setAdminStatus(error?.message || 'Erro ao atribuir premium.');
    } finally {
      state.adminBusy = false;
      syncAdminButtons();
    }
  }

  async function deleteUser() {
    if (!state.selectedUser || state.adminBusy) return;
    const confirmed = window.confirm(`Excluir ${state.selectedUser.username} e todos os dados dele?`);
    if (!confirmed) return;
    state.adminBusy = true;
    syncAdminButtons();
    setAdminStatus('Excluindo usuario...');
    try {
      const response = await fetch(buildApiUrl(`/api/admin/users/${state.selectedUser.userId}`), {
        method: 'DELETE',
        credentials: 'include'
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Erro ao excluir usuario.');
      }
      closeAdminModal();
      await loadUsers('Usuario excluido. Atualizando...');
    } catch (error) {
      setAdminStatus(error?.message || 'Erro ao excluir usuario.');
      state.adminBusy = false;
      syncAdminButtons();
    }
  }

  (async () => {
    state.currentUser = await fetchSessionUser();
    await loadUsers();
  })();

  els.closeAdminModalBtn?.addEventListener('click', closeAdminModal);
  els.grant7Btn?.addEventListener('click', () => { void grantPremium(7); });
  els.grant30Btn?.addEventListener('click', () => { void grantPremium(30); });
  els.grant365Btn?.addEventListener('click', () => { void grantPremium(365); });
  els.deleteUserBtn?.addEventListener('click', () => { void deleteUser(); });
})();


