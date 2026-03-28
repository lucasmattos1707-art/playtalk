(function initPlaytalkAccountPage() {
  const AUTH_TOKEN_STORAGE_KEY = 'playtalk_auth_token';
  const els = {
    form: document.getElementById('accountForm'),
    avatarInput: document.getElementById('accountAvatarInput'),
    avatarPreview: document.getElementById('accountAvatarPreview'),
    avatarFallback: document.getElementById('accountAvatarFallback'),
    nameInput: document.getElementById('accountNameInput'),
    passwordField: document.getElementById('accountPasswordField'),
    passwordInput: document.getElementById('accountPasswordInput'),
    premiumLevel: document.getElementById('accountPremiumLevel'),
    premiumUntil: document.getElementById('accountPremiumUntil'),
    premiumBtn: document.getElementById('accountPremiumBtn'),
    saveBtn: document.getElementById('accountSaveBtn'),
    logoutBtn: document.getElementById('accountLogoutBtn'),
    status: document.getElementById('accountStatus')
  };

  const state = {
    user: null,
    localProfile: null,
    avatarDraft: '',
    avatarGenerating: false
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
      avatarImage: safeText(user.avatar_image || user.avatarImage),
      premiumFullAccess: Boolean(user.premium_full_access),
      premiumUntil: user.premium_until || user.premiumUntil || null
    };
  }

  function readLocalPlayerProfile() {
    try {
      if (window.playtalkPlayerState && typeof window.playtalkPlayerState.get === 'function') {
        const player = window.playtalkPlayerState.get() || {};
        return {
          username: safeText(player.username),
          avatarImage: safeText(player.avatar)
        };
      }
    } catch (_error) {
      // ignore
    }
    return { username: '', avatarImage: '' };
  }

  function patchLocalPlayerProfile(nextProfile = {}) {
    try {
      if (window.playtalkPlayerState && typeof window.playtalkPlayerState.patch === 'function') {
        window.playtalkPlayerState.patch({
          username: safeText(nextProfile.username),
          avatar: safeText(nextProfile.avatarImage)
        });
      }
    } catch (_error) {
      // ignore
    }
  }

  function isPremiumActive(user = state.user) {
    if (!user) return false;
    if (user.premiumFullAccess) return true;
    const time = Date.parse(user.premiumUntil || '');
    return Number.isFinite(time) && time > Date.now();
  }

  function renderPremiumStatus() {
    if (!els.premiumLevel || !els.premiumUntil) return;
    if (isPremiumActive()) {
      els.premiumLevel.textContent = 'Nivel de acesso: Premium';
      const until = Date.parse(state.user?.premiumUntil || '');
      els.premiumUntil.textContent = Number.isFinite(until)
        ? `Ativo ate ${new Date(until).toLocaleDateString('pt-BR')}.`
        : 'Premium ativo.';
      return;
    }
    els.premiumLevel.textContent = 'Nivel de acesso: Free';
    els.premiumUntil.textContent = 'Sem premium ativo no momento.';
  }

  function renderUser() {
    const sourceProfile = state.user || state.localProfile || {};
    const username = safeText(sourceProfile.username) || 'Jogador';
    const avatar = safeText(state.avatarDraft || sourceProfile.avatarImage);
    const hasAvatar = Boolean(avatar);
    els.nameInput.value = username;
    els.avatarPreview.src = hasAvatar ? avatar : 'Avatar/avatar-man-person-svgrepo-com.svg';
    els.avatarPreview.style.display = hasAvatar ? 'block' : 'none';
    els.avatarFallback.textContent = username.charAt(0).toUpperCase() || 'P';
    els.avatarFallback.style.display = hasAvatar ? 'none' : 'grid';
    if (els.passwordField) {
      els.passwordField.hidden = Boolean(state.user?.id);
    }
    if (els.passwordInput && state.user?.id) {
      els.passwordInput.value = '';
    }
    if (els.saveBtn) {
      els.saveBtn.textContent = state.user?.id ? 'Salvar perfil' : 'Criar conta';
      els.saveBtn.disabled = state.avatarGenerating;
    }
    els.logoutBtn.hidden = !state.user;
    renderPremiumStatus();
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

  async function createCartoonAvatar(imageDataUrl) {
    const response = await fetch(buildApiUrl('/api/images/openai/avatar-cartoon'), {
      method: 'POST',
      headers: buildAuthHeaders({
        'Content-Type': 'application/json'
      }),
      body: JSON.stringify({
        imageDataUrl
      })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.success || !payload?.dataUrl) {
      throw new Error(payload?.message || payload?.error || 'Nao foi possivel transformar a foto em desenho.');
    }
    return String(payload.dataUrl);
  }

  function isValidPassword(password) {
    return typeof password === 'string' && password.trim().length >= 6;
  }

  async function submitForm(event) {
    event.preventDefault();
    const nextUsername = safeText(els.nameInput.value);
    if (!nextUsername) {
      setStatus('Digite um nome de usuario.', 'error');
      return;
    }

    const nextAvatar = safeText(state.avatarDraft || state.user?.avatarImage || state.localProfile?.avatarImage);
    const nextPassword = safeText(els.passwordInput?.value);
    const shouldCreateAccount = !state.user?.id;
    if (shouldCreateAccount && !isValidPassword(nextPassword)) {
      setStatus('Defina uma senha com pelo menos 6 caracteres.', 'error');
      return;
    }

    els.saveBtn.disabled = true;
    setStatus(shouldCreateAccount ? 'Criando conta...' : 'Salvando perfil...');
    try {
      if (shouldCreateAccount) {
        const registerResponse = await fetch(buildApiUrl('/register'), {
          method: 'POST',
          headers: buildAuthHeaders({
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify({
            username: nextUsername,
            password: nextPassword,
            avatar: nextAvatar
          })
        });
        const registerPayload = await registerResponse.json().catch(() => ({}));
        if (!registerResponse.ok || !registerPayload?.success) {
          throw new Error(registerPayload?.message || 'Nao foi possivel criar a conta.');
        }
        if (registerPayload?.token) {
          persistAuthToken(registerPayload.token);
        }
        state.user = normalizeUser(registerPayload.user);
        state.localProfile = {
          username: nextUsername,
          avatarImage: nextAvatar
        };
        patchLocalPlayerProfile({
          username: nextUsername,
          avatarImage: nextAvatar
        });
        if (els.passwordInput) {
          els.passwordInput.value = '';
        }
        renderUser();
        setStatus('Conta criada com sucesso.', 'success');
        return;
      }

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
      state.localProfile = {
        username: updatedUser.username,
        avatarImage: updatedUser.avatarImage
      };
      patchLocalPlayerProfile(state.localProfile);
      state.avatarDraft = '';
      renderUser();
      setStatus('Perfil atualizado com sucesso.', 'success');
    } catch (error) {
      setStatus(error?.message || 'Nao foi possivel salvar o perfil.', 'error');
    } finally {
      if (els.saveBtn) {
        els.saveBtn.disabled = state.avatarGenerating;
      }
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
    state.localProfile = readLocalPlayerProfile();
    renderUser();
    if (!state.user?.id) {
      setStatus('Defina uma senha e salve para criar sua conta real.', null);
    }
    els.form?.addEventListener('submit', submitForm);
    els.premiumBtn?.addEventListener('click', () => {
      window.location.href = '/flashcards?premium=1&view=cards';
    });
    els.logoutBtn?.addEventListener('click', logout);
    els.avatarInput?.addEventListener('change', async (event) => {
      const file = event.target?.files?.[0];
      if (!file) return;
      try {
        state.avatarGenerating = true;
        els.saveBtn.disabled = true;
        setStatus('Transformando foto em desenho...');
        const sourceDataUrl = await fileToDataUrl(file);
        state.avatarDraft = sourceDataUrl;
        renderUser();
        const cartoonDataUrl = await createCartoonAvatar(sourceDataUrl);
        state.avatarDraft = cartoonDataUrl;
        renderUser();
        setStatus('Desenho gerado com sucesso.', 'success');
      } catch (error) {
        setStatus(error?.message || 'Nao foi possivel transformar a imagem.', 'error');
      } finally {
        state.avatarGenerating = false;
        if (els.saveBtn) {
          els.saveBtn.disabled = false;
        }
      }
    });
  }

  init();
})();
