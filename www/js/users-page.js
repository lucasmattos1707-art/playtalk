(function initPlaytalkUsersPage() {
  const els = {
    usersList: document.getElementById('usersList'),
    usersStatus: document.getElementById('usersStatus')
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

  function normalizeUsers(payload) {
    const users = Array.isArray(payload?.users) ? payload.users : [];
    return users.map((entry) => ({
      username: String(entry?.username || 'Usuario').trim() || 'Usuario',
      flashcardsCount: Number(entry?.flashcardsCount) || 0
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

    const headerMarkup = `
      <div class="users-row is-header">
        <span>Usuario</span>
        <span>Flashcards</span>
      </div>
    `;

    const rowMarkup = rows.map((entry) => `
      <div class="users-row">
        <span class="users-name">${escapeHtml(entry.username)}</span>
        <span class="users-count">${escapeHtml(formatFlashcards(entry.flashcardsCount))}</span>
      </div>
    `).join('');

    els.usersList.innerHTML = `${headerMarkup}${rowMarkup}`;
  }

  async function loadUsers() {
    els.usersStatus.textContent = 'Carregando usuarios...';

    try {
      const response = await fetch(buildApiUrl('/api/users/flashcards'), {
        cache: 'no-store'
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

  loadUsers();
})();
