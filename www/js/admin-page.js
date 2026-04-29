(function initPlaytalkAdminPage() {
  const els = {
    energyForm: document.getElementById('adminEnergyForm'),
    multiplierInput: document.getElementById('adminEnergyMultiplierInput'),
    limitInput: document.getElementById('adminEnergyLimitInput'),
    energySaveBtn: document.getElementById('adminEnergySaveBtn'),
    energyStatus: document.getElementById('adminEnergyStatus'),
    preview100: document.getElementById('adminPreview100'),
    preview250: document.getElementById('adminPreview250'),
    previewLimit: document.getElementById('adminPreviewLimit'),
    factMultiplier: document.getElementById('adminFactMultiplier'),
    factLimit: document.getElementById('adminFactLimit'),
    welcomeModesForm: document.getElementById('adminWelcomeModesForm'),
    welcomeModesUsersEnabled: document.getElementById('adminWelcomeModesUsersEnabled'),
    welcomeModesSaveBtn: document.getElementById('adminWelcomeModesSaveBtn'),
    welcomeModesStatus: document.getElementById('adminWelcomeModesStatus'),
    factWelcomeModes: document.getElementById('adminFactWelcomeModes')
  };

  const state = {
    user: null,
    energyBusy: false,
    welcomeModesBusy: false,
    settings: {
      dailyFreeEnergyLimit: 5000,
      energyCostMultiplier: 1,
      energyCostMultiplierMilli: 1000,
      energyCostMultiplierDisplay: '1.00x'
    },
    welcomeModes: {
      usersEnabled: false
    }
  };

  function buildApiUrl(path) {
    if (window.PlaytalkApi && typeof window.PlaytalkApi.buildApiUrl === 'function') {
      return window.PlaytalkApi.buildApiUrl(path);
    }
    return path;
  }

  function buildAuthHeaders(extraHeaders) {
    if (window.PlaytalkApi && typeof window.PlaytalkApi.buildAuthHeaders === 'function') {
      return window.PlaytalkApi.buildAuthHeaders(extraHeaders);
    }
    return { ...(extraHeaders || {}) };
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

  function safeNumber(value, fallback = 0) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
  }

  function formatInteger(value) {
    return new Intl.NumberFormat('pt-BR').format(Math.max(0, Math.round(safeNumber(value))));
  }

  function formatMultiplier(value) {
    const numeric = Math.max(0.01, Math.min(10, safeNumber(value, 1)));
    return `${numeric.toFixed(2)}x`;
  }

  function formatWelcomeModesState(usersEnabled) {
    return usersEnabled ? 'Ligados' : 'Desligados';
  }

  function applyMultiplier(chars, multiplier) {
    const normalizedChars = Math.max(0, Math.round(safeNumber(chars)));
    const normalizedMultiplier = Math.max(0.01, Math.min(10, safeNumber(multiplier, 1)));
    return Math.ceil(normalizedChars * normalizedMultiplier);
  }

  function setStatus(target, message, tone) {
    if (!target) return;
    target.textContent = message || '';
    target.className = 'admin-status';
    if (tone) target.classList.add(`is-${tone}`);
  }

  function syncEnergyBusyState() {
    if (els.energySaveBtn) {
      els.energySaveBtn.disabled = state.energyBusy;
      els.energySaveBtn.textContent = state.energyBusy ? 'Salvando...' : 'Salvar energia';
    }
    if (els.multiplierInput) els.multiplierInput.disabled = state.energyBusy;
    if (els.limitInput) els.limitInput.disabled = state.energyBusy;
  }

  function syncWelcomeModesBusyState() {
    if (els.welcomeModesSaveBtn) {
      els.welcomeModesSaveBtn.disabled = state.welcomeModesBusy;
      els.welcomeModesSaveBtn.textContent = state.welcomeModesBusy ? 'Salvando...' : 'Salvar modos';
    }
    if (els.welcomeModesUsersEnabled) els.welcomeModesUsersEnabled.disabled = state.welcomeModesBusy;
  }

  function readDraftSettings() {
    return {
      energyCostMultiplier: Math.max(0.01, Math.min(10, safeNumber(els.multiplierInput?.value, state.settings.energyCostMultiplier))),
      dailyFreeEnergyLimit: Math.max(0, Math.min(1000000, Math.round(safeNumber(els.limitInput?.value, state.settings.dailyFreeEnergyLimit))))
    };
  }

  function readDraftWelcomeModes() {
    return {
      usersEnabled: Boolean(els.welcomeModesUsersEnabled?.checked)
    };
  }

  function renderPreview() {
    const draft = readDraftSettings();
    const preview100 = applyMultiplier(100, draft.energyCostMultiplier);
    const preview250 = applyMultiplier(250, draft.energyCostMultiplier);
    if (els.preview100) els.preview100.textContent = `${formatInteger(preview100)} energias`;
    if (els.preview250) els.preview250.textContent = `${formatInteger(preview250)} energias`;
    if (els.previewLimit) els.previewLimit.textContent = `${formatInteger(draft.dailyFreeEnergyLimit)} energias`;
    if (els.factMultiplier) els.factMultiplier.textContent = formatMultiplier(draft.energyCostMultiplier);
    if (els.factLimit) els.factLimit.textContent = `${formatInteger(draft.dailyFreeEnergyLimit)} energias`;
  }

  function renderWelcomeModesFact() {
    if (els.factWelcomeModes) {
      els.factWelcomeModes.textContent = formatWelcomeModesState(state.welcomeModes.usersEnabled);
    }
  }

  function applySettings(settings) {
    state.settings = {
      dailyFreeEnergyLimit: Math.max(0, Math.min(1000000, Math.round(safeNumber(settings?.dailyFreeEnergyLimit, 5000)))),
      energyCostMultiplier: Math.max(0.01, Math.min(10, safeNumber(settings?.energyCostMultiplier, 1))),
      energyCostMultiplierMilli: Math.max(1, Math.round(safeNumber(settings?.energyCostMultiplierMilli, 1000))),
      energyCostMultiplierDisplay: String(settings?.energyCostMultiplierDisplay || formatMultiplier(settings?.energyCostMultiplier || 1))
    };
    if (els.multiplierInput) els.multiplierInput.value = state.settings.energyCostMultiplier.toFixed(2);
    if (els.limitInput) els.limitInput.value = String(state.settings.dailyFreeEnergyLimit);
    renderPreview();
  }

  function applyWelcomeModes(settings) {
    state.welcomeModes = {
      usersEnabled: Boolean(settings?.usersEnabled)
    };
    if (els.welcomeModesUsersEnabled) {
      els.welcomeModesUsersEnabled.checked = state.welcomeModes.usersEnabled;
    }
    renderWelcomeModesFact();
  }

  async function fetchSessionUser() {
    if (window.PlaytalkApi && typeof window.PlaytalkApi.fetchSessionUser === 'function') {
      return window.PlaytalkApi.fetchSessionUser({ attempts: 2, timeoutMs: 3500 });
    }
    const response = await fetch(buildApiUrl('/auth/session'), {
      headers: buildAuthHeaders(),
      credentials: 'include',
      cache: 'no-store'
    });
    const payload = await response.json().catch(() => ({}));
    return response.ok && payload?.success ? payload.user : null;
  }

  async function loadEnergySettings() {
    const response = await fetch(buildApiUrl('/api/admin/energy-settings'), {
      headers: buildAuthHeaders(),
      credentials: 'include',
      cache: 'no-store'
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.success || !payload?.settings) {
      throw new Error(payload?.message || 'Nao foi possivel carregar as configuracoes de energia.');
    }
    applySettings(payload.settings);
  }

  async function loadWelcomeModeSettings() {
    const response = await fetch(buildApiUrl('/api/admin/welcome-mode-settings'), {
      headers: buildAuthHeaders(),
      credentials: 'include',
      cache: 'no-store'
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.success || !payload?.settings) {
      throw new Error(payload?.message || 'Nao foi possivel carregar as configuracoes dos modos extras.');
    }
    applyWelcomeModes(payload.settings);
  }

  async function submitEnergySettings(event) {
    event.preventDefault();
    state.energyBusy = true;
    syncEnergyBusyState();
    setStatus(els.energyStatus, 'Salvando configuracoes de energia...');
    try {
      const draft = readDraftSettings();
      const response = await fetch(buildApiUrl('/api/admin/energy-settings'), {
        method: 'POST',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify(draft)
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success || !payload?.settings) {
        throw new Error(payload?.message || 'Nao foi possivel salvar as configuracoes de energia.');
      }
      applySettings(payload.settings);
      setStatus(els.energyStatus, payload?.message || 'Configuracoes de energia atualizadas.', 'success');
    } catch (error) {
      setStatus(els.energyStatus, error?.message || 'Nao foi possivel salvar as configuracoes de energia.', 'error');
    } finally {
      state.energyBusy = false;
      syncEnergyBusyState();
    }
  }

  async function submitWelcomeModeSettings(event) {
    event.preventDefault();
    state.welcomeModesBusy = true;
    syncWelcomeModesBusyState();
    setStatus(els.welcomeModesStatus, 'Salvando configuracoes dos modos extras...');
    try {
      const draft = readDraftWelcomeModes();
      const response = await fetch(buildApiUrl('/api/admin/welcome-mode-settings'), {
        method: 'POST',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify(draft)
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success || !payload?.settings) {
        throw new Error(payload?.message || 'Nao foi possivel salvar as configuracoes dos modos extras.');
      }
      applyWelcomeModes(payload.settings);
      setStatus(els.welcomeModesStatus, payload?.message || 'Configuracoes dos modos extras atualizadas.', 'success');
    } catch (error) {
      setStatus(els.welcomeModesStatus, error?.message || 'Nao foi possivel salvar as configuracoes dos modos extras.', 'error');
    } finally {
      state.welcomeModesBusy = false;
      syncWelcomeModesBusyState();
    }
  }

  function bindEvents() {
    els.energyForm?.addEventListener('submit', submitEnergySettings);
    els.multiplierInput?.addEventListener('input', renderPreview);
    els.limitInput?.addEventListener('input', renderPreview);
    els.welcomeModesForm?.addEventListener('submit', submitWelcomeModeSettings);
  }

  (async () => {
    bindEvents();
    syncEnergyBusyState();
    syncWelcomeModesBusyState();
    renderPreview();
    renderWelcomeModesFact();
    state.user = await fetchSessionUser().catch(() => null);
    if (!state.user?.id || !state.user?.is_admin) {
      setStatus(els.energyStatus, 'Acesso restrito ao administrador.', 'error');
      setStatus(els.welcomeModesStatus, 'Acesso restrito ao administrador.', 'error');
      window.setTimeout(() => navigateTo('/account', { replace: true }), 900);
      return;
    }
    try {
      await Promise.all([
        loadEnergySettings(),
        loadWelcomeModeSettings()
      ]);
      setStatus(els.energyStatus, 'Configuracoes carregadas.');
      setStatus(els.welcomeModesStatus, 'Modos extras sincronizados.');
    } catch (error) {
      const message = error?.message || 'Nao foi possivel carregar as configuracoes do admin.';
      setStatus(els.energyStatus, message, 'error');
      setStatus(els.welcomeModesStatus, message, 'error');
    }
  })();
})();
