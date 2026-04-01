(function initPlaytalkAccountPage() {
  const AUTH_TOKEN_STORAGE_KEY = 'playtalk_auth_token';
  const AUTO_SAVE_DELAY_MS = 700;
  const els = {
    panel: document.querySelector('.panel'),
    form: document.getElementById('accountForm'),
    avatarInput: document.getElementById('accountAvatarInput'),
    avatarPreview: document.getElementById('accountAvatarPreview'),
    avatarFallback: document.getElementById('accountAvatarFallback'),
    nameInput: document.getElementById('accountNameInput'),
    passwordField: document.getElementById('accountPasswordField'),
    passwordInput: document.getElementById('accountPasswordInput'),
    passwordBtn: document.getElementById('accountPasswordBtn'),
    premiumCard: document.querySelector('.account-premium'),
    premiumLevel: document.getElementById('accountPremiumLevel'),
    premiumUntil: document.getElementById('accountPremiumUntil'),
    premiumBtn: document.getElementById('accountPremiumBtn'),
    premiumIcon: document.getElementById('accountPremiumIcon'),
    premiumLabel: document.getElementById('accountPremiumLabel'),
    logoutBtn: document.getElementById('accountLogoutBtn'),
    status: document.getElementById('accountStatus')
  };

  const state = {
    user: null,
    localProfile: null,
    avatarDraft: '',
    avatarGenerating: false,
    autoSaveTimer: 0,
    saveInFlight: false,
    pendingSave: false,
    lastSavedUsername: '',
    lastSavedAvatar: '',
    passwordEditMode: false
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

  function navigateTo(target, options = {}) {
    if (window.PlaytalkNative && typeof window.PlaytalkNative.navigate === 'function') {
      window.PlaytalkNative.navigate(target, options);
      return;
    }
    if (options.replace) {
      window.location.replace(target);
      return;
    }
    window.location.href = target;
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
      premiumUntil: user.premium_until || user.premiumUntil || null,
      hasPassword: Boolean(user.has_password || user.hasPassword)
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
    if (!els.premiumLevel || !els.premiumUntil || !els.premiumCard) return;
    const isLoggedIn = Boolean(state.user?.id);
    els.premiumCard.hidden = !isLoggedIn;
    if (!isLoggedIn) {
      els.premiumLevel.textContent = '';
      els.premiumUntil.textContent = '';
      return;
    }
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

  function renderPremiumButton() {
    if (!els.premiumBtn || !els.premiumLabel || !els.premiumIcon) return;
    const isLoggedIn = Boolean(state.user?.id);
    els.premiumLabel.textContent = isLoggedIn ? 'Comprar premium!' : 'Entrar';
    els.premiumIcon.hidden = !isLoggedIn;
  }

  function snapshotCurrentProfile() {
    return {
      username: safeText(els.nameInput?.value || state.user?.username || state.localProfile?.username),
      avatarImage: safeText(state.avatarDraft || state.user?.avatarImage || state.localProfile?.avatarImage)
    };
  }

  function syncSavedSnapshot(user = state.user) {
    state.lastSavedUsername = safeText(user?.username || state.localProfile?.username);
    state.lastSavedAvatar = safeText(user?.avatarImage || state.localProfile?.avatarImage);
  }

  function renderUser() {
    const sourceProfile = state.user || state.localProfile || {};
    const username = safeText(sourceProfile.username) || 'Jogador';
    const avatar = safeText(state.avatarDraft || sourceProfile.avatarImage);
    const hasAvatar = Boolean(avatar);
    const isLoggedIn = Boolean(state.user?.id);
    if (document.activeElement !== els.nameInput) {
      els.nameInput.value = username;
    }
    els.avatarPreview.src = hasAvatar ? avatar : 'Avatar/avatar-man-person-svgrepo-com.svg';
    els.avatarPreview.style.display = isLoggedIn && hasAvatar ? 'block' : 'none';
    els.avatarFallback.textContent = isLoggedIn ? (username.charAt(0).toUpperCase() || 'P') : 'Entre com sua conta';
    els.avatarFallback.style.display = isLoggedIn && hasAvatar ? 'none' : 'grid';
    els.avatarInput.disabled = !isLoggedIn;
    els.avatarInput.value = '';
    els.avatarPreview.alt = isLoggedIn ? 'Avatar do usuario' : '';
    if (els.panel) {
      els.panel.classList.toggle('is-guest', !isLoggedIn);
    }
    if (els.avatarPreview?.parentElement) {
      els.avatarPreview.parentElement.classList.toggle('is-message', !isLoggedIn);
    }

    const shouldHidePasswordField = isLoggedIn ? !state.passwordEditMode : false;
    if (els.passwordField) {
      els.passwordField.hidden = shouldHidePasswordField;
    }
    if (els.passwordInput) {
      els.passwordInput.placeholder = isLoggedIn ? 'Nova senha' : 'Senha';
    }
    if (els.passwordBtn) {
      els.passwordBtn.hidden = !isLoggedIn;
      els.passwordBtn.textContent = state.passwordEditMode ? 'Cancelar' : 'Trocar senha';
    }
    if (shouldHidePasswordField && els.passwordInput) {
      els.passwordInput.value = '';
    }

    els.logoutBtn.hidden = !state.user;
    renderPremiumStatus();
    renderPremiumButton();
  }

  async function fileToDataUrl(file) {
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error || new Error('Falha ao ler a imagem.'));
      reader.readAsDataURL(file);
    });
  }

  async function dataUrlToSquareWebpDataUrl(sourceDataUrl, size = 400) {
    return await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          const context = canvas.getContext('2d');
          if (!context) {
            reject(new Error('Nao foi possivel preparar a imagem.'));
            return;
          }

          const sourceWidth = image.naturalWidth || image.width;
          const sourceHeight = image.naturalHeight || image.height;
          const sourceSide = Math.min(sourceWidth, sourceHeight);
          const sourceX = Math.max(0, Math.round((sourceWidth - sourceSide) / 2));
          const sourceY = Math.max(0, Math.round((sourceHeight - sourceSide) / 2));

          context.clearRect(0, 0, size, size);
          context.drawImage(image, sourceX, sourceY, sourceSide, sourceSide, 0, 0, size, size);
          resolve(canvas.toDataURL('image/webp', 0.92));
        } catch (error) {
          reject(error);
        }
      };
      image.onerror = () => reject(new Error('Nao foi possivel abrir a foto.'));
      image.src = sourceDataUrl;
    });
  }

  async function fileToSquareWebpDataUrl(file, size = 400) {
    const sourceDataUrl = await fileToDataUrl(file);
    return dataUrlToSquareWebpDataUrl(sourceDataUrl, size);
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
      headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ imageDataUrl })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.success || !payload?.dataUrl) {
      throw new Error(payload?.message || payload?.error || 'Nao foi possivel transformar a foto em desenho.');
    }
    return String(payload.dataUrl);
  }

  function clearAutoSaveTimer() {
    if (!state.autoSaveTimer) return;
    window.clearTimeout(state.autoSaveTimer);
    state.autoSaveTimer = 0;
  }

  function isValidPassword(password) {
    return typeof password === 'string' && password.trim().length >= 6;
  }

  async function persistProfileNow() {
    if (!state.user?.id) return false;
    const nextProfile = snapshotCurrentProfile();
    if (!nextProfile.username) {
      setStatus('Digite um nome de usuario.', 'error');
      return false;
    }
    if (
      nextProfile.username === state.lastSavedUsername
      && nextProfile.avatarImage === state.lastSavedAvatar
      && !state.avatarDraft
    ) {
      return true;
    }
    if (state.avatarGenerating) return false;
    if (state.saveInFlight) {
      state.pendingSave = true;
      return false;
    }

    state.saveInFlight = true;
    setStatus('Salvando perfil...');
    try {
      const profileResponse = await fetch(buildApiUrl('/auth/profile'), {
        method: 'PATCH',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ username: nextProfile.username })
      });
      const profilePayload = await profileResponse.json().catch(() => ({}));
      if (!profileResponse.ok || !profilePayload?.success) {
        throw new Error(profilePayload?.message || 'Nao foi possivel salvar o perfil.');
      }

      let updatedUser = normalizeUser(profilePayload.user) || state.user;
      if (profilePayload?.token) {
        persistAuthToken(profilePayload.token);
      }

      if (state.avatarDraft) {
        const avatarResponse = await fetch(buildApiUrl('/auth/avatar'), {
          method: 'PATCH',
          headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
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
      syncSavedSnapshot(updatedUser);
      renderUser();
      setStatus('Perfil salvo automaticamente.', 'success');
      return true;
    } catch (error) {
      setStatus(error?.message || 'Nao foi possivel salvar o perfil.', 'error');
      return false;
    } finally {
      state.saveInFlight = false;
      if (state.pendingSave) {
        state.pendingSave = false;
        scheduleAutoSave(250);
      }
    }
  }

  function scheduleAutoSave(delayMs = AUTO_SAVE_DELAY_MS) {
    if (!state.user?.id) return;
    clearAutoSaveTimer();
    state.autoSaveTimer = window.setTimeout(() => {
      state.autoSaveTimer = 0;
      void persistProfileNow();
    }, delayMs);
  }

  async function createAccountFromForm() {
    const nextUsername = safeText(els.nameInput.value);
    const nextPassword = safeText(els.passwordInput?.value);
    const nextAvatar = safeText(state.avatarDraft || state.localProfile?.avatarImage);

    if (!nextUsername) {
      setStatus('Digite um nome de usuario.', 'error');
      return;
    }
    if (!isValidPassword(nextPassword)) {
      setStatus('Defina uma senha com pelo menos 6 caracteres.', 'error');
      return;
    }

    setStatus('Criando conta...');
    try {
      const registerResponse = await fetch(buildApiUrl('/register'), {
        method: 'POST',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
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
      patchLocalPlayerProfile(state.localProfile);
      state.avatarDraft = '';
      syncSavedSnapshot(state.user);
      if (els.passwordInput) {
        els.passwordInput.value = '';
      }
      renderUser();
      setStatus('Conta criada com sucesso.', 'success');
    } catch (error) {
      setStatus(error?.message || 'Nao foi possivel criar a conta.', 'error');
    }
  }

  async function promptForPassword() {
    if (!state.user?.id) return false;
    const password = safeText(els.passwordInput?.value);
    if (!password) return;
    if (!isValidPassword(password)) {
      setStatus('Use pelo menos 6 caracteres na senha.', 'error');
      return false;
    }

    setStatus('Salvando nova senha...');
    try {
      const response = await fetch(buildApiUrl('/auth/password'), {
        method: 'PATCH',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ password })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Nao foi possivel salvar a senha.');
      }
      if (payload?.token) {
        persistAuthToken(payload.token);
      }
      state.user = normalizeUser(payload.user) || state.user;
      state.passwordEditMode = false;
      if (els.passwordInput) {
        els.passwordInput.value = '';
      }
      renderUser();
      setStatus('Senha alterada com sucesso.', 'success');
      return true;
    } catch (error) {
      setStatus(error?.message || 'Nao foi possivel salvar a senha.', 'error');
      return false;
    }
  }

  async function loginFromAccount() {
    const username = safeText(els.nameInput?.value).toLowerCase();
    const password = safeText(els.passwordInput?.value);

    if (!username || !password) {
      setStatus('Preencha nome e senha para entrar.', 'error');
      return;
    }

    if (els.premiumBtn) els.premiumBtn.disabled = true;
    setStatus('Entrando na sua conta...');

    try {
      const response = await fetch(buildApiUrl('/login'), {
        method: 'POST',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ username, password })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Nao foi possivel entrar agora.');
      }

      if (payload?.token) {
        persistAuthToken(payload.token);
      }
      state.user = normalizeUser(payload.user);
      state.localProfile = {
        username: state.user?.username || username,
        avatarImage: state.user?.avatarImage || safeText(state.avatarDraft || state.localProfile?.avatarImage)
      };
      patchLocalPlayerProfile(state.localProfile);
      state.passwordEditMode = false;
      syncSavedSnapshot(state.user);
      if (els.passwordInput) {
        els.passwordInput.value = '';
      }
      renderUser();
      setStatus('Entrada liberada com sucesso.', 'success');
    } catch (error) {
      setStatus(error?.message || 'Nao foi possivel entrar agora.', 'error');
    } finally {
      if (els.premiumBtn) els.premiumBtn.disabled = false;
    }
  }

  async function logout() {
    try {
      await fetch(buildApiUrl('/logout'), {
        method: 'POST',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' })
      });
    } catch (_error) {
      // ignore
    }
    persistAuthToken('');
    navigateTo(window.PlaytalkNative ? '/flashcards' : '/auth.html', { replace: true });
  }

  async function init() {
    state.user = await fetchSessionUser();
    state.localProfile = readLocalPlayerProfile();
    syncSavedSnapshot(state.user || state.localProfile);
    renderUser();

    els.form?.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (state.user?.id) {
        if (state.passwordEditMode && safeText(els.passwordInput?.value)) {
          await promptForPassword();
          return;
        }
        await persistProfileNow();
        return;
      }
      await loginFromAccount();
    });

    els.nameInput?.addEventListener('input', () => {
      setStatus('');
      scheduleAutoSave();
    });

    els.passwordBtn?.addEventListener('click', () => {
      state.passwordEditMode = !state.passwordEditMode;
      if (!state.passwordEditMode && els.passwordInput) {
        els.passwordInput.value = '';
      }
      renderUser();
      if (state.passwordEditMode) {
        setStatus('Digite a nova senha e pressione Enter.', null);
        els.passwordInput?.focus();
      } else {
        setStatus('');
      }
    });

    els.premiumBtn?.addEventListener('click', () => {
      if (!state.user?.id) {
        void loginFromAccount();
        return;
      }
      navigateTo('/premium');
    });

    els.logoutBtn?.addEventListener('click', logout);

    els.avatarInput?.addEventListener('change', async (event) => {
      if (!state.user?.id) return;
      const file = event.target?.files?.[0];
      if (!file) return;
      try {
        state.avatarGenerating = true;
        setStatus('Transformando foto em desenho...');
        const sourceDataUrl = await fileToSquareWebpDataUrl(file, 400);
        state.avatarDraft = sourceDataUrl;
        renderUser();
        const cartoonDataUrl = await createCartoonAvatar(sourceDataUrl);
        state.avatarDraft = await dataUrlToSquareWebpDataUrl(cartoonDataUrl, 400);
        renderUser();
        setStatus('Desenho gerado com sucesso.', 'success');
        scheduleAutoSave(120);
      } catch (error) {
        setStatus(error?.message || 'Nao foi possivel transformar a imagem.', 'error');
      } finally {
        state.avatarGenerating = false;
      }
    });
  }

  init();
})();
