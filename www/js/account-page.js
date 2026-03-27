(function initPlaytalkAccountPage() {
  const AUTH_TOKEN_STORAGE_KEY = 'playtalk_auth_token';
  const els = {
    form: document.getElementById('accountForm'),
    avatarInput: document.getElementById('accountAvatarInput'),
    avatarPreview: document.getElementById('accountAvatarPreview'),
    avatarFallback: document.getElementById('accountAvatarFallback'),
    nameInput: document.getElementById('accountNameInput'),
    saveBtn: document.getElementById('accountSaveBtn'),
    logoutBtn: document.getElementById('accountLogoutBtn'),
    status: document.getElementById('accountStatus')
  };

  const state = {
    user: null,
    avatarDraft: ''
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

  function setStatus(message, tone) {
    if (!els.status) return;
    els.status.textContent = message || '';
    els.status.className = 'account-status';
    if (tone) {
      els.status.classList.add(`is-${tone}`);
    }
  }

  function persistAuthToken(token) {
    try {
      if (token) {
        localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
      } else {
        localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
      }
    } catch (_error) {
      // ignore
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
      avatarImage: safeText(user.avatar_image || user.avatarImage)
    };
  }

  function renderUser() {
    const username = safeText(state.user?.username) || 'Jogador';
    const avatar = safeText(state.avatarDraft || state.user?.avatarImage);
    const hasAvatar = Boolean(avatar);
    els.nameInput.value = username;
    els.avatarPreview.src = hasAvatar ? avatar : 'Avatar/avatar-man-person-svgrepo-com.svg';
    els.avatarPreview.style.display = hasAvatar ? 'block' : 'none';
    els.avatarFallback.textContent = username.charAt(0).toUpperCase() || 'P';
    els.avatarFallback.style.display = hasAvatar ? 'none' : 'grid';
    els.saveBtn.disabled = !state.user;
    els.logoutBtn.hidden = !state.user;
  }

  async function fileToDataUrl(file) {
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error || new Error('Falha ao ler a imagem.'));
      reader.readAsDataURL(file);
    });
  }

  async function fetchSessionUser() {
    const response = await fetch(buildApiUrl('/auth/session'), {
      headers: buildAuthHeaders(),
      cache: 'no-store'
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.success) {
      return null;
    }
    return normalizeUser(payload.user);
  }

  async function submitForm(event) {
    event.preventDefault();
    if (!state.user?.id) {
      setStatus('Entre na conta para editar o perfil.', 'error');
      return;
    }

    const nextUsername = safeText(els.nameInput.value);
    if (!nextUsername) {
      setStatus('Digite um nome de usuario.', 'error');
      return;
    }

    els.saveBtn.disabled = true;
    setStatus('Salvando perfil...');
    try {
      const profileResponse = await fetch(buildApiUrl('/auth/profile'), {
        method: 'PATCH',
        headers: buildAuthHeaders({
          'Content-Type': 'application/json'
        }),
        body: JSON.stringify({ username: nextUsername })
      });
      const profilePayload = await profileResponse.json().catch(() => ({}));
      if (!profileResponse.ok || !profilePayload?.success) {
        throw new Error(profilePayload?.message || 'Nao foi possivel salvar o perfil.');
      }

      let updatedUser = normalizeUser(profilePayload.user) || state.user;
      if (state.avatarDraft) {
        const avatarResponse = await fetch(buildApiUrl('/auth/avatar'), {
          method: 'PATCH',
          headers: buildAuthHeaders({
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify({ avatar: state.avatarDraft })
        });
        const avatarPayload = await avatarResponse.json().catch(() => ({}));
        if (!avatarResponse.ok || !avatarPayload?.success) {
          throw new Error(avatarPayload?.message || 'Nao foi possivel salvar a foto.');
        }
        updatedUser = normalizeUser(avatarPayload.user) || updatedUser;
      }

      state.user = updatedUser;
      state.avatarDraft = '';
      renderUser();
      setStatus('Perfil atualizado com sucesso.', 'success');
    } catch (error) {
      setStatus(error?.message || 'Nao foi possivel salvar o perfil.', 'error');
    } finally {
      els.saveBtn.disabled = !state.user;
    }
  }

  async function logout() {
    try {
      await fetch(buildApiUrl('/logout'), {
        method: 'POST',
        headers: buildAuthHeaders({
          'Content-Type': 'application/json'
        })
      });
    } catch (_error) {
      // ignore
    }
    persistAuthToken('');
    window.location.href = '/auth.html';
  }

  async function init() {
    state.user = await fetchSessionUser();
    if (!state.user) {
      window.location.href = '/auth.html';
      return;
    }
    renderUser();
    els.form?.addEventListener('submit', submitForm);
    els.logoutBtn?.addEventListener('click', logout);
    els.avatarInput?.addEventListener('change', async (event) => {
      const file = event.target?.files?.[0];
      if (!file) return;
      try {
        state.avatarDraft = await fileToDataUrl(file);
        renderUser();
        setStatus('');
      } catch (error) {
        setStatus(error?.message || 'Nao foi possivel ler a imagem.', 'error');
      }
    });
  }

  init();
})();
