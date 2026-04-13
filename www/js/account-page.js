(function initPlaytalkAccountPage() {
  const AUTH_TOKEN_STORAGE_KEY = 'playtalk_auth_token';
  const AUTO_SAVE_DELAY_MS = 700;
  const STATS_ROTATE_MS = 2500;
  const GUEST_PROMPT_ROTATE_MS = 2500;
  const GUEST_NAME_PROMPTS = ['Digite um nome de usuário', 'Toque para digitar'];
  const NUMBER_ANIMATION_HANDLES = new WeakMap();
  const els = {
    body: document.body,
    panel: document.querySelector('.panel'),
    form: document.getElementById('accountForm'),
    avatarFrame: document.querySelector('.account-avatar'),
    avatarInput: document.getElementById('accountAvatarInput'),
    avatarPreview: document.getElementById('accountAvatarPreview'),
    avatarFallback: document.getElementById('accountAvatarFallback'),
    nameInline: document.getElementById('accountNameInline'),
    namePromptLabel: document.querySelector('.account-name-prompt-label'),
    nameInput: document.getElementById('accountNameInput'),
    passwordField: document.getElementById('accountPasswordField'),
    passwordInput: document.getElementById('accountPasswordInput'),
    passwordBtn: document.getElementById('accountPasswordBtn'),
    passwordBtnLabel: document.getElementById('accountPasswordBtnLabel'),
    premiumCard: document.querySelector('.account-premium'),
    metrics: document.getElementById('accountMetrics'),
    statsCarousel: document.getElementById('accountStatsCarousel'),
    statsPages: document.getElementById('accountStatsPages'),
    premiumLevel: document.getElementById('accountPremiumLevel'),
    premiumUntil: document.getElementById('accountPremiumUntil'),
    premiumBtn: document.getElementById('accountPremiumBtn'),
    premiumIcon: document.getElementById('accountPremiumIcon'),
    premiumLabel: document.getElementById('accountPremiumLabel'),
    logoutBtn: document.getElementById('accountLogoutBtn'),
    status: document.getElementById('accountStatus'),
    guestKeyboard: document.getElementById('guestKeyboard')
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
    passwordEditMode: false,
    nameEditing: false,
    booksStats: null,
    pronunciationRankingPercent: 0,
    statsRotationTimer: 0,
    statsRotationIndex: 0,
    statsLastRenderedLine: '',
    guestPromptTimer: 0,
    guestPromptIndex: 0,
    guestInputTarget: 'name',
    guestShiftActive: false,
    guestCapsLockActive: false,
    bootComplete: false
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

  function isLoggedIn() {
    return Boolean(state.user?.id);
  }

  function isGuestFieldActive(fieldName) {
    if (isLoggedIn()) return false;
    if (state.guestInputTarget === fieldName) return true;
    const field = fieldName === 'password' ? els.passwordInput : els.nameInput;
    return document.activeElement === field;
  }

  function getGuestTargetInput() {
    return state.guestInputTarget === 'password' ? els.passwordInput : els.nameInput;
  }

  function formatTrainingTime(trainingTimeMs) {
    const totalMinutes = Math.max(0, Math.floor((Number(trainingTimeMs) || 0) / 60000));
    if (totalMinutes >= 60) {
      const hours = totalMinutes / 60;
      const rounded = hours >= 10 ? Math.round(hours) : Math.round(hours * 10) / 10;
      return `${String(rounded).replace(/\.0$/, '')} h`;
    }
    return `${totalMinutes} min`;
  }

  function formatCountCompact(value) {
    const total = Math.max(0, Number(value) || 0);
    if (total >= 1000000) {
      return `${(total / 1000000).toFixed(total >= 10000000 ? 0 : 1).replace(/\.0$/, '')}M`;
    }
    if (total >= 1000) {
      return `${(total / 1000).toFixed(total >= 10000 ? 0 : 1).replace(/\.0$/, '')}k`;
    }
    return `${Math.round(total)}`;
  }

  function normalizePrecisePercent(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0;
    return Math.max(0, Math.min(100, Math.round(numeric * 10) / 10));
  }

  function clampNumber(value, min, max) {
    return Math.min(max, Math.max(min, Number(value) || 0));
  }

  function formatCssAuraValue(value, digits = 3) {
    const numeric = Number(value) || 0;
    return String(Number(numeric.toFixed(digits)));
  }

  function intensityToAuraAlpha(intensity) {
    const normalized = clampNumber(intensity, 0, 1);
    if (normalized <= 0) return 0;
    return 0.018 + (Math.pow(normalized, 1.2) * 0.882);
  }

  function setAvatarAuraVariable(name, value, digits) {
    if (!els.avatarFrame) return;
    els.avatarFrame.style.setProperty(name, formatCssAuraValue(value, digits));
  }

  function applyAvatarAura() {
    if (!els.avatarFrame) return;

    if (!state.user?.id) {
      setAvatarAuraVariable('--aura-speaking-end', 0, 3);
      setAvatarAuraVariable('--aura-listening-end', 0, 3);
      setAvatarAuraVariable('--aura-pronunciation-end', 0, 3);
      setAvatarAuraVariable('--aura-speaking-alpha', 0, 3);
      setAvatarAuraVariable('--aura-listening-alpha', 0, 3);
      setAvatarAuraVariable('--aura-pronunciation-alpha', 0, 3);
      setAvatarAuraVariable('--aura-speaking-glow', 0, 3);
      setAvatarAuraVariable('--aura-listening-glow', 0, 3);
      setAvatarAuraVariable('--aura-pronunciation-glow', 0, 3);
      setAvatarAuraVariable('--aura-overall-glow', 0, 3);
      setAvatarAuraVariable('--aura-visible', 0, 3);
      return;
    }

    const stats = state.booksStats || {};
    const listeningTotal = Math.max(0, Number(stats.listeningChars) || 0);
    const speakingTotal = Math.max(0, Number(stats.speakingChars) || 0);
    const pronunciationAverage = normalizePrecisePercent(stats.generalPronunciationPercent);
    const pronunciationRanking = normalizePrecisePercent(state.pronunciationRankingPercent);
    const pronunciationBlend = normalizePrecisePercent((pronunciationAverage + pronunciationRanking) / 2);
    const pronunciationProgress = pronunciationBlend <= 60
      ? 0
      : clampNumber((pronunciationBlend - 60) / 40, 0, 1);
    const pronunciationShare = pronunciationProgress * 33;
    const trainingTotal = listeningTotal + speakingTotal;
    const remainingShare = Math.max(0, 100 - pronunciationShare);
    const listeningRatio = trainingTotal > 0 ? listeningTotal / trainingTotal : 0;
    const speakingRatio = trainingTotal > 0 ? speakingTotal / trainingTotal : 0;
    const speakingShare = remainingShare * speakingRatio;
    const listeningShare = remainingShare * listeningRatio;
    const speakingEnd = speakingShare;
    const listeningEnd = speakingShare + listeningShare;
    const pronunciationEnd = Math.min(100, listeningEnd + pronunciationShare);

    const listeningGlow = clampNumber(listeningTotal / 10000, 0, 1);
    const speakingGlow = clampNumber(speakingTotal / 7500, 0, 1);
    const pronunciationGlow = pronunciationProgress;
    const hasVisibleAura = speakingShare > 0 || listeningShare > 0 || pronunciationShare > 0;
    const overallGlow = Math.max(speakingGlow, listeningGlow, pronunciationGlow);

    setAvatarAuraVariable('--aura-speaking-end', speakingEnd, 3);
    setAvatarAuraVariable('--aura-listening-end', listeningEnd, 3);
    setAvatarAuraVariable('--aura-pronunciation-end', pronunciationEnd, 3);
    setAvatarAuraVariable('--aura-speaking-alpha', intensityToAuraAlpha(speakingGlow), 3);
    setAvatarAuraVariable('--aura-listening-alpha', intensityToAuraAlpha(listeningGlow), 3);
    setAvatarAuraVariable('--aura-pronunciation-alpha', intensityToAuraAlpha(pronunciationGlow), 3);
    setAvatarAuraVariable('--aura-speaking-glow', speakingGlow, 3);
    setAvatarAuraVariable('--aura-listening-glow', listeningGlow, 3);
    setAvatarAuraVariable('--aura-pronunciation-glow', pronunciationGlow, 3);
    setAvatarAuraVariable('--aura-overall-glow', overallGlow, 3);
    setAvatarAuraVariable('--aura-visible', hasVisibleAura ? 1 : 0, 3);
  }

  function formatDurationCompact(totalSeconds) {
    const normalized = Math.max(0, Math.round(Number(totalSeconds) || 0));
    const hours = Math.floor(normalized / 3600);
    const minutes = Math.floor((normalized % 3600) / 60);
    if (hours > 0) return `${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`;
    if (minutes > 0) return `${minutes} min`;
    return `${normalized}s`;
  }

  function setAnimatedDecimalMarkup(element, value) {
    if (!element) return;
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      element.textContent = safeText(value) || '--';
      return;
    }
    const rounded = Math.round(numeric * 10) / 10;
    const [main, fraction = '0'] = rounded.toFixed(1).split('.');
    element.innerHTML = `<span class="account-decimal-value"><span class="account-decimal-value__main">${main}</span><span class="account-decimal-value__fraction">.${fraction}</span></span>`;
  }

  function cancelAnimatedNumber(element) {
    if (!element) return;
    const frameId = NUMBER_ANIMATION_HANDLES.get(element);
    if (frameId) {
      window.cancelAnimationFrame(frameId);
      NUMBER_ANIMATION_HANDLES.delete(element);
    }
  }

  function getStatsMetricIconMarkup(kind) {
    switch (safeText(kind)) {
      case 'books':
        return `
          <svg viewBox="0 0 64 64" aria-hidden="true">
            <path fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" d="M12 16.5c0-2.49 2.01-4.5 4.5-4.5H31v39H16.5A4.5 4.5 0 0 1 12 46.5zm40 0c0-2.49-2.01-4.5-4.5-4.5H33v39h14.5a4.5 4.5 0 0 0 4.5-4.5zM31 15h2"/>
          </svg>
        `;
      case 'listening':
        return `
          <svg viewBox="0 0 64 64" aria-hidden="true">
            <path fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" d="M8 35c4.5 0 4.5-16 9-16s4.5 26 9 26s4.5-34 9-34s4.5 42 9 42s4.5-18 9-18"/>
          </svg>
        `;
      case 'speaking':
        return `
          <svg viewBox="0 0 64 64" aria-hidden="true">
            <path fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" d="M32 40a8 8 0 0 0 8-8V19a8 8 0 1 0-16 0v13a8 8 0 0 0 8 8zm13-9a13 13 0 0 1-26 0M32 44v10m-8 0h16"/>
          </svg>
        `;
      case 'pronunciation':
        return `
          <svg viewBox="0 0 64 64" aria-hidden="true">
            <path fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" d="M18 34l9 9 19-21"/>
            <circle cx="32" cy="32" r="22" fill="none" stroke="currentColor" stroke-width="3.4"/>
          </svg>
        `;
      case 'days':
        return `
          <svg viewBox="0 0 64 64" aria-hidden="true">
            <rect x="12" y="15" width="40" height="35" rx="8" ry="8" fill="none" stroke="currentColor" stroke-width="3.2"/>
            <path fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" d="M21 10v10m22-10v10M12 24h40"/>
            <path fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" d="M23 32h18M23 40h10"/>
          </svg>
        `;
      case 'practice-time':
      default:
        return `
          <svg viewBox="0 0 64 64" aria-hidden="true">
            <circle cx="32" cy="32" r="21" fill="none" stroke="currentColor" stroke-width="3.4"/>
            <path fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" d="M32 20v13l8 5M24 8h16"/>
          </svg>
        `;
    }
  }

  function buildStatsRotationItems() {
    if (!state.user?.id) {
      return [
        {
          kind: 'practice-time',
          label: 'Estatisticas',
          value: '--'
        }
      ];
    }

    const stats = state.booksStats || {};
    const myBooksCount = Math.max(
      0,
      Number(stats.myBooksCount)
        || Number(stats.qualifiedBookCount)
        || 0
    );
    const pronAvg = normalizePrecisePercent(stats.generalPronunciationPercent);
    const speakingChars = Math.max(0, Number(stats.speakingChars) || 0);
    const listeningChars = Math.max(0, Number(stats.listeningChars) || 0);
    const practiceSeconds = Math.max(0, Number(stats.practiceSeconds) || 0);
    const registeredDays = Math.max(0, Math.floor(Number(stats.accountAgeDays) || 0));

    return [
      {
        kind: 'practice-time',
        label: 'Pratica',
        value: formatDurationCompact(practiceSeconds)
      },
      {
        kind: 'books',
        label: 'Livros',
        value: `${myBooksCount}`
      },
      {
        kind: 'listening',
        label: 'Listening',
        value: formatCountCompact(listeningChars)
      },
      {
        kind: 'speaking',
        label: 'Speaking',
        value: formatCountCompact(speakingChars)
      },
      {
        kind: 'pronunciation',
        label: 'Pronuncia',
        value: pronAvg,
        decimal: true
      },
      {
        kind: 'days',
        label: 'Dias',
        value: `${registeredDays}`
      }
    ];
  }

  function chunkStatsItems(items, size = 3) {
    const safeItems = Array.isArray(items) ? items.filter(Boolean) : [];
    const chunks = [];
    for (let index = 0; index < safeItems.length; index += size) {
      chunks.push(safeItems.slice(index, index + size));
    }
    return chunks;
  }

  function stopStatsRotation() {
    if (!state.statsRotationTimer) return;
    window.clearInterval(state.statsRotationTimer);
    state.statsRotationTimer = 0;
  }

  function startStatsRotation() {
    if (state.statsRotationTimer || !state.user?.id) return;
    state.statsRotationTimer = window.setInterval(() => {
      state.statsRotationIndex = (state.statsRotationIndex + 1) % 1000000;
      renderAccountMetrics();
    }, STATS_ROTATE_MS);
  }

  function createStatsMetricCard(metric) {
    const card = document.createElement('article');
    card.className = 'account-stats-item';
    card.dataset.kind = safeText(metric?.kind) || 'practice-time';

    const label = document.createElement('p');
    label.className = 'account-stats-label';
    label.textContent = safeText(metric?.label) || 'Estatisticas';

    const iconShell = document.createElement('div');
    iconShell.className = 'account-stats-icon-shell';
    iconShell.setAttribute('aria-hidden', 'true');

    const icon = document.createElement('div');
    icon.className = 'account-stats-icon';
    icon.innerHTML = getStatsMetricIconMarkup(metric?.kind);
    iconShell.appendChild(icon);

    const value = document.createElement('p');
    value.className = 'account-stats-value';
    if (metric?.decimal) {
      setAnimatedDecimalMarkup(value, metric?.value);
    } else {
      value.textContent = safeText(metric?.value) || '--';
    }

    card.append(label, iconShell, value);
    return card;
  }

  function renderAccountMetrics() {
    if (!els.metrics || !els.statsPages) return;
    const loggedIn = isLoggedIn();
    els.metrics.hidden = !loggedIn;
    if (!loggedIn) {
      stopStatsRotation();
      els.statsPages.innerHTML = '';
      els.statsPages.style.transform = 'translateX(0)';
      return;
    }

    startStatsRotation();
    const items = buildStatsRotationItems();
    const pages = chunkStatsItems(items, 3);
    const safePages = Array.isArray(pages) ? pages.filter((page) => Array.isArray(page) && page.length) : [];
    const pageCount = safePages.length || 1;
    const activePageIndex = state.statsRotationIndex % pageCount;
    const signature = safePages
      .map((page) => page.map((metric) => `${safeText(metric?.kind)}|${safeText(metric?.label)}|${metric?.value ?? ''}|${metric?.decimal ? '1' : '0'}`).join('~'))
      .join('||');
    const shouldRebuild = state.statsLastRenderedLine !== signature;
    state.statsLastRenderedLine = signature;

    if (shouldRebuild) {
      els.statsPages.innerHTML = '';
      safePages.forEach((page) => {
        const pageElement = document.createElement('div');
        pageElement.className = 'account-stats-page';
        page.forEach((metric) => {
          pageElement.appendChild(createStatsMetricCard(metric));
        });
        els.statsPages.appendChild(pageElement);
      });
    }
    els.statsPages.style.transform = `translateX(-${activePageIndex * 100}%)`;
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
      createdAt: user.created_at || user.createdAt || null,
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
    const loggedIn = isLoggedIn();
    els.premiumCard.hidden = !loggedIn;
    if (!loggedIn) {
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
    const loggedIn = isLoggedIn();
    els.premiumLabel.textContent = loggedIn ? 'Comprar premium!' : 'Entrar';
    els.premiumIcon.hidden = !loggedIn;
  }

  function syncGuestInlineUi() {
    const loggedIn = isLoggedIn();
    if (els.nameInline) {
      const hasNameValue = Boolean(safeText(els.nameInput?.value));
      els.nameInline.classList.toggle('is-typing', !loggedIn && isGuestFieldActive('name'));
      els.nameInline.classList.toggle('has-value', !loggedIn && hasNameValue);
      els.nameInline.classList.toggle('is-active', !loggedIn && state.guestInputTarget === 'name');
    }
    if (els.passwordField) {
      const hasPasswordValue = Boolean(safeText(els.passwordInput?.value));
      els.passwordField.classList.toggle('is-typing', !loggedIn && isGuestFieldActive('password'));
      els.passwordField.classList.toggle('has-value', !loggedIn && hasPasswordValue);
      els.passwordField.classList.toggle('is-active', !loggedIn && state.guestInputTarget === 'password');
    }
  }

  function stopGuestPromptRotation() {
    if (!state.guestPromptTimer) return;
    window.clearInterval(state.guestPromptTimer);
    state.guestPromptTimer = 0;
  }

  function renderGuestPromptLabel() {
    if (!els.namePromptLabel) return;
    const loggedIn = isLoggedIn();
    const isTyping = isGuestFieldActive('name') || Boolean(safeText(els.nameInput?.value));
    if (loggedIn || isTyping) return;
    els.namePromptLabel.textContent = GUEST_NAME_PROMPTS[state.guestPromptIndex % GUEST_NAME_PROMPTS.length] || GUEST_NAME_PROMPTS[0];
  }

  function startGuestPromptRotation() {
    stopGuestPromptRotation();
    const loggedIn = isLoggedIn();
    if (loggedIn || !els.namePromptLabel) return;
    renderGuestPromptLabel();
    state.guestPromptTimer = window.setInterval(() => {
      if (isGuestFieldActive('name') || safeText(els.nameInput?.value)) return;
      state.guestPromptIndex = (state.guestPromptIndex + 1) % GUEST_NAME_PROMPTS.length;
      renderGuestPromptLabel();
    }, GUEST_PROMPT_ROTATE_MS);
  }

  function clearGuestModifiers() {
    state.guestShiftActive = false;
  }

  function setGuestInputTarget(fieldName) {
    if (fieldName !== 'name' && fieldName !== 'password') return;
    state.guestInputTarget = fieldName;
    syncGuestInlineUi();
    renderGuestPromptLabel();
  }

  function finishBoot() {
    if (state.bootComplete) return;
    state.bootComplete = true;
    els.body?.classList.remove('account-page--booting');
  }

  function updateGuestKeyboardState() {
    if (!els.guestKeyboard) return;
    const keys = els.guestKeyboard.querySelectorAll('[data-key-action="shift"], [data-key-action="caps"]');
    keys.forEach((key) => {
      const action = key.getAttribute('data-key-action');
      if (action === 'shift') {
        key.classList.toggle('is-active', state.guestShiftActive);
      }
      if (action === 'caps') {
        key.classList.toggle('is-active', state.guestCapsLockActive);
      }
    });
  }

  function applyGuestKeyValue(rawValue) {
    const input = getGuestTargetInput();
    if (!input) return;
    const value = String(rawValue || '');
    if (!value) return;
    const maxLength = Number(input.maxLength) > 0 ? Number(input.maxLength) : 9999;
    if ((input.value || '').length >= maxLength) return;
    const shouldUppercase = state.guestShiftActive !== state.guestCapsLockActive;
    const nextChar = /^[a-z]$/i.test(value)
      ? (shouldUppercase ? value.toUpperCase() : value.toLowerCase())
      : value;
    input.value = `${input.value || ''}${nextChar}`;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    clearGuestModifiers();
    updateGuestKeyboardState();
  }

  function deleteGuestKeyValue() {
    const input = getGuestTargetInput();
    if (!input || !input.value) return;
    input.value = input.value.slice(0, -1);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    clearGuestModifiers();
    updateGuestKeyboardState();
  }

  function toggleGuestShift() {
    state.guestShiftActive = !state.guestShiftActive;
    updateGuestKeyboardState();
  }

  function toggleGuestCaps() {
    state.guestCapsLockActive = !state.guestCapsLockActive;
    updateGuestKeyboardState();
  }

  async function handleGuestKeyboardAction(action, keyValue) {
    if (isLoggedIn()) return;
    switch (action) {
      case 'backspace':
        deleteGuestKeyValue();
        return;
      case 'tab':
        setGuestInputTarget(state.guestInputTarget === 'name' ? 'password' : 'name');
        return;
      case 'shift':
        toggleGuestShift();
        return;
      case 'caps':
        toggleGuestCaps();
        return;
      case 'space':
        applyGuestKeyValue(' ');
        return;
      case 'enter':
        await loginFromAccount();
        return;
      case 'noop':
        return;
      default:
        applyGuestKeyValue(keyValue);
    }
  }

  function preventGuestPaste(event) {
    if (isLoggedIn()) return;
    event.preventDefault();
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
    const loggedIn = isLoggedIn();
    if (document.activeElement !== els.nameInput || !state.nameEditing) {
      els.nameInput.value = username;
    }
    if (els.nameInput) {
      const shouldUseInlineReadonly = loggedIn ? !state.nameEditing : true;
      els.nameInput.readOnly = shouldUseInlineReadonly;
      els.nameInput.inputMode = loggedIn ? 'text' : 'none';
      els.nameInput.autocomplete = 'off';
      els.nameInput.setAttribute('aria-label', loggedIn ? 'Nome do usuario' : 'Digite um nome de usuario');
      els.nameInput.placeholder = loggedIn ? 'Seu nome' : 'Digite um nome de usuario';
    }
    if (els.nameInline) {
      els.nameInline.classList.toggle('is-editing', loggedIn && state.nameEditing);
    }
    els.avatarPreview.src = hasAvatar ? avatar : 'Avatar/avatar-man-person-svgrepo-com.svg';
    els.avatarPreview.style.display = loggedIn && hasAvatar ? 'block' : 'none';
    els.avatarFallback.textContent = loggedIn ? (username.charAt(0).toUpperCase() || 'P') : 'Entre com\nsua conta';
    els.avatarFallback.style.display = loggedIn && hasAvatar ? 'none' : 'grid';
    els.avatarInput.disabled = !loggedIn;
    els.avatarInput.value = '';
    els.avatarPreview.alt = loggedIn ? 'Avatar do usuario' : '';
    if (els.panel) {
      els.panel.classList.toggle('is-guest', !loggedIn);
    }
    if (els.avatarPreview?.parentElement) {
      els.avatarPreview.parentElement.classList.toggle('is-message', !loggedIn);
    }
    applyAvatarAura();

    const shouldHidePasswordField = loggedIn ? !state.passwordEditMode : false;
    if (els.passwordField) {
      els.passwordField.hidden = shouldHidePasswordField;
      const passwordFieldLabel = els.passwordField.querySelector('span');
      if (passwordFieldLabel) {
        passwordFieldLabel.textContent = 'Senha';
      }
    }
    if (els.passwordInput) {
      els.passwordInput.placeholder = loggedIn ? 'Nova senha' : 'Digite sua senha';
      els.passwordInput.readOnly = !loggedIn;
      els.passwordInput.inputMode = loggedIn ? 'text' : 'none';
      els.passwordInput.autocomplete = 'off';
    }
    if (els.passwordBtn) {
      els.passwordBtn.hidden = !loggedIn;
      if (els.passwordBtnLabel) {
        els.passwordBtnLabel.textContent = loggedIn
          ? (state.passwordEditMode ? 'Cancelar' : 'Trocar senha')
          : '';
      }
    }
    if (shouldHidePasswordField && els.passwordInput) {
      els.passwordInput.value = '';
    }

    els.logoutBtn.hidden = !state.user;
    syncGuestInlineUi();
    renderGuestPromptLabel();
    startGuestPromptRotation();
    renderPremiumStatus();
    renderPremiumButton();
    renderAccountMetrics();
    updateGuestKeyboardState();
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
    if (window.PlaytalkApi && typeof window.PlaytalkApi.fetchSessionUser === 'function') {
      const user = await window.PlaytalkApi.fetchSessionUser({
        attempts: 3,
        retryDelayMs: 450
      });
      return normalizeUser(user);
    }
    const response = await fetch(buildApiUrl('/auth/session'), {
      headers: buildAuthHeaders(),
      cache: 'no-store',
      credentials: 'include'
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.success) {
      return null;
    }
    return normalizeUser(payload.user);
  }

  async function fetchBooksMetrics() {
    if (!state.user?.id) {
      state.booksStats = null;
      state.pronunciationRankingPercent = 0;
      applyAvatarAura();
      renderAccountMetrics();
      return;
    }

    const [booksResult, rankingResult] = await Promise.allSettled([
      fetch(buildApiUrl('/api/books/stats'), {
        headers: buildAuthHeaders(),
        cache: 'no-store',
        credentials: 'include'
      }),
      fetch(buildApiUrl('/api/users/flashcards?limit=50&metric=pronunciation'), {
        headers: buildAuthHeaders(),
        cache: 'no-store',
        credentials: 'include'
      })
    ]);

    if (booksResult.status === 'fulfilled') {
      const payload = await booksResult.value.json().catch(() => ({}));
      state.booksStats = booksResult.value.ok && payload?.success
        ? (payload.stats || null)
        : null;
    } else {
      state.booksStats = null;
    }

    if (rankingResult.status === 'fulfilled') {
      const payload = await rankingResult.value.json().catch(() => ({}));
      state.pronunciationRankingPercent = rankingResult.value.ok && payload?.success
        ? normalizePrecisePercent(payload?.viewer?.pronunciationPercent)
        : 0;
    } else {
      state.pronunciationRankingPercent = 0;
    }

    applyAvatarAura();
    renderAccountMetrics();
  }

  function finishInlineNameEdit(options = {}) {
    const shouldSave = options.save !== false;
    const revert = options.revert === true;
    if (revert) {
      els.nameInput.value = safeText(state.lastSavedUsername || state.user?.username || state.localProfile?.username || 'Jogador');
    }
    const wasEditing = state.nameEditing;
    state.nameEditing = false;
    renderUser();
    if (wasEditing && shouldSave && state.user?.id) {
      scheduleAutoSave(120);
    }
  }

  function startInlineNameEdit() {
    if (!state.user?.id || state.nameEditing || !els.nameInput) return;
    state.nameEditing = true;
    renderUser();
    window.requestAnimationFrame(() => {
      els.nameInput.focus();
      const valueLength = els.nameInput.value.length;
      try {
        els.nameInput.setSelectionRange(valueLength, valueLength);
      } catch (_error) {
        // ignore
      }
    });
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
      await fetchBooksMetrics();
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
      await fetchBooksMetrics();
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
    navigateTo('/flashcards', { replace: true });
  }

  async function init() {
    try {
      state.user = await fetchSessionUser();
      state.localProfile = readLocalPlayerProfile();
      syncSavedSnapshot(state.user || state.localProfile);
      renderUser();
      await fetchBooksMetrics();
    } catch (_error) {
      state.user = null;
      state.localProfile = readLocalPlayerProfile();
      syncSavedSnapshot(state.localProfile);
      renderUser();
    } finally {
      finishBoot();
    }

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
      syncGuestInlineUi();
      renderGuestPromptLabel();
      if (state.user?.id) {
        scheduleAutoSave();
      }
    });

    els.nameInput?.addEventListener('focus', () => {
      syncGuestInlineUi();
      renderGuestPromptLabel();
      if (state.user?.id && !state.nameEditing) {
        startInlineNameEdit();
      } else if (!state.user?.id) {
        setGuestInputTarget('name');
      }
    });

    els.nameInput?.addEventListener('click', () => {
      if (state.user?.id && !state.nameEditing) {
        startInlineNameEdit();
        return;
      }
      setGuestInputTarget('name');
    });

    els.nameInput?.addEventListener('blur', () => {
      syncGuestInlineUi();
      renderGuestPromptLabel();
      if (!state.user?.id) return;
      finishInlineNameEdit({ save: true });
    });

    els.nameInput?.addEventListener('keydown', (event) => {
      if (!state.user?.id) return;
      if (event.key === 'Enter') {
        event.preventDefault();
        els.nameInput?.blur();
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        finishInlineNameEdit({ save: false, revert: true });
        return;
      }
    });

    els.passwordBtn?.addEventListener('click', () => {
      if (!state.user?.id) {
        els.passwordInput?.focus();
        setStatus('');
        syncGuestInlineUi();
        return;
      }
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

    els.nameInline?.addEventListener('click', () => {
      if (state.user?.id) return;
      setGuestInputTarget('name');
      syncGuestInlineUi();
      renderGuestPromptLabel();
    });

    els.passwordField?.addEventListener('click', () => {
      if (state.user?.id) return;
      setGuestInputTarget('password');
      syncGuestInlineUi();
    });

    els.passwordInput?.addEventListener('focus', () => {
      if (!state.user?.id) {
        setGuestInputTarget('password');
      }
      syncGuestInlineUi();
    });

    els.passwordInput?.addEventListener('input', () => {
      setStatus('');
      syncGuestInlineUi();
    });

    els.passwordInput?.addEventListener('blur', () => {
      syncGuestInlineUi();
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

    [els.nameInput, els.passwordInput].forEach((input) => {
      input?.addEventListener('keydown', (event) => {
        if (state.user?.id) return;
        event.preventDefault();
      });
      input?.addEventListener('paste', preventGuestPaste);
      input?.addEventListener('drop', preventGuestPaste);
      input?.addEventListener('contextmenu', preventGuestPaste);
    });

    els.guestKeyboard?.addEventListener('click', async (event) => {
      const key = event.target.closest('[data-key-action], [data-key-value]');
      if (!key) return;
      const action = key.getAttribute('data-key-action') || '';
      const keyValue = key.getAttribute('data-key-value') || '';
      await handleGuestKeyboardAction(action, keyValue);
    });
  }

  init();
})();
