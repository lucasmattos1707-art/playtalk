(function initPlaytalkAccountPage() {
  const AUTH_TOKEN_STORAGE_KEY = 'playtalk_auth_token';
  const AUTO_SAVE_DELAY_MS = 700;
  const STATS_ROTATE_MS = 2500;
  const GUEST_PROMPT_ROTATE_MS = 2500;
  const GUEST_NAME_PROMPTS = ['Digite um nome de usuário'];
  const NUMBER_ANIMATION_HANDLES = new WeakMap();
  const AURA_CIRCLE_RADIUS = 123.2;
  const AURA_CIRCLE_GAP_DEG = 3.5;
  const AURA_COLORS = {
    listening: { bright: '#38b6ff', dim: 'rgba(56,182,255,0.28)', filterId: 'accountAuraBlueGlow' },
    speaking: { bright: '#ffd84d', dim: 'rgba(255,216,77,0.28)', filterId: 'accountAuraYellowGlow' },
    reading: { bright: '#b84dff', dim: 'rgba(184,77,255,0.28)', filterId: 'accountAuraPurpleGlow' }
  };
  const els = {
    body: document.body,
    panel: document.querySelector('.panel'),
    form: document.getElementById('accountForm'),
    avatarFrame: document.querySelector('.account-avatar'),
    auraBlueArc: document.getElementById('accountAuraBlueArc'),
    auraYellowArc: document.getElementById('accountAuraYellowArc'),
    auraPurpleArc: document.getElementById('accountAuraPurpleArc'),
    avatarInput: document.getElementById('accountAvatarInput'),
    avatarPreview: document.getElementById('accountAvatarPreview'),
    avatarFallback: document.getElementById('accountAvatarFallback'),
    nameInline: document.getElementById('accountNameInline'),
    namePromptLabel: document.querySelector('.account-name-prompt-label'),
    nameInput: document.getElementById('accountNameInput'),
    passwordField: document.getElementById('accountPasswordField'),
    passwordInput: document.getElementById('accountPasswordInput'),
    guestLoginBtn: document.getElementById('accountGuestLoginBtn'),
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
    logoutWrap: document.getElementById('accountLogoutWrap'),
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

  async function awaitWithTimeout(promise, timeoutMs, fallbackValue) {
    const timeout = Math.max(0, Number(timeoutMs) || 0);
    if (!timeout) {
      return promise;
    }
    let timer = 0;
    try {
      return await Promise.race([
        promise,
        new Promise((resolve) => {
          timer = window.setTimeout(() => resolve(fallbackValue), timeout);
        })
      ]);
    } finally {
      if (timer) {
        window.clearTimeout(timer);
      }
    }
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

  function polarToCartesian(cx, cy, radius, angleDeg) {
    const radians = ((angleDeg - 90) * Math.PI) / 180;
    return {
      x: cx + (radius * Math.cos(radians)),
      y: cy + (radius * Math.sin(radians))
    };
  }

  function describeAuraArc(cx, cy, radius, startAngle, endAngle) {
    const start = polarToCartesian(cx, cy, radius, endAngle);
    const end = polarToCartesian(cx, cy, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    return ['M', start.x, start.y, 'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y].join(' ');
  }

  function glowToStdDeviation(glowPercent) {
    return (clampNumber(glowPercent, 0, 100) / 100) * 25;
  }

  function applyGlowFilter(filterId, glowPercent) {
    const filterElement = document.getElementById(filterId);
    if (!filterElement) return;
    const blurNodes = filterElement.querySelectorAll('feGaussianBlur');
    if (blurNodes.length < 3) return;
    const base = glowToStdDeviation(glowPercent);
    blurNodes[0].setAttribute('stdDeviation', (base * 0.15).toFixed(2));
    blurNodes[1].setAttribute('stdDeviation', (base * 0.8).toFixed(2));
    blurNodes[2].setAttribute('stdDeviation', (base * 2.2).toFixed(2));
  }

  function setAuraArcStyle(pathElement, colorConfig, glowPercent) {
    if (!pathElement || !colorConfig) return;
    if (glowPercent <= 0) {
      pathElement.setAttribute('stroke', colorConfig.dim);
      pathElement.removeAttribute('filter');
      pathElement.style.opacity = '1';
      return;
    }
    pathElement.setAttribute('stroke', colorConfig.bright);
    pathElement.setAttribute('filter', `url(#${colorConfig.filterId})`);
    pathElement.style.opacity = '1';
  }

  function hideAuraArc(pathElement) {
    if (!pathElement) return;
    pathElement.setAttribute('d', '');
    pathElement.removeAttribute('filter');
    pathElement.style.opacity = '0';
  }

  function renderAuraArc(pathElement, sharePercent, startAngle, colorConfig, glowPercent) {
    if (!pathElement || !colorConfig) return startAngle;
    if (sharePercent <= 0) {
      hideAuraArc(pathElement);
      return startAngle;
    }
    const usableDegrees = 360 - (AURA_CIRCLE_GAP_DEG * 3);
    const sweep = usableDegrees * (sharePercent / 100);
    const endAngle = startAngle + sweep;
    pathElement.setAttribute('d', describeAuraArc(130, 130, AURA_CIRCLE_RADIUS, startAngle, endAngle));
    setAuraArcStyle(pathElement, colorConfig, glowPercent);
    return endAngle + AURA_CIRCLE_GAP_DEG;
  }

  function applyAvatarAura() {
    if (!els.avatarFrame) return;

    if (!state.user?.id) {
      hideAuraArc(els.auraBlueArc);
      hideAuraArc(els.auraYellowArc);
      hideAuraArc(els.auraPurpleArc);
      return;
    }

    const stats = state.booksStats || {};
    const readingTotal = Math.max(0, Number(stats.readingChars) || 0);
    const listeningTotal = Math.max(0, Number(stats.listeningChars) || 0);
    const speakingTotal = Math.max(0, Number(stats.speakingChars) || 0);
    const trainingTotal = readingTotal + listeningTotal + speakingTotal;
    const readingShare = trainingTotal > 0 ? (readingTotal / trainingTotal) * 100 : 0;
    const listeningShare = trainingTotal > 0 ? (listeningTotal / trainingTotal) * 100 : 0;
    const speakingShare = trainingTotal > 0 ? (speakingTotal / trainingTotal) * 100 : 0;
    const consistencyGlowPercent = 100;

    applyGlowFilter(AURA_COLORS.listening.filterId, consistencyGlowPercent);
    applyGlowFilter(AURA_COLORS.speaking.filterId, consistencyGlowPercent);
    applyGlowFilter(AURA_COLORS.reading.filterId, consistencyGlowPercent);

    let startAngle = 0;
    startAngle = renderAuraArc(els.auraBlueArc, listeningShare, startAngle, AURA_COLORS.listening, consistencyGlowPercent);
    startAngle = renderAuraArc(els.auraYellowArc, speakingShare, startAngle, AURA_COLORS.speaking, consistencyGlowPercent);
    renderAuraArc(els.auraPurpleArc, readingShare, startAngle, AURA_COLORS.reading, consistencyGlowPercent);
  }

  function formatDurationCompact(totalSeconds) {
    const normalized = Math.max(0, Math.round(Number(totalSeconds) || 0));
    const hours = Math.floor(normalized / 3600);
    const minutes = Math.floor((normalized % 3600) / 60);
    if (hours > 0) return `${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`;
    if (minutes > 0) return `${minutes} min`;
    return `${normalized}s`;
  }

  function setAnimatedDecimalMarkup(element, value, suffix = '') {
    if (!element) return;
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      element.textContent = safeText(value) || '--';
      return;
    }
    const rounded = Math.round(numeric * 10) / 10;
    const [main, fraction = '0'] = rounded.toFixed(1).split('.');
    const safeSuffix = safeText(suffix);
    element.innerHTML = `<span class="account-decimal-value"><span class="account-decimal-value__main">${main}</span><span class="account-decimal-value__fraction">.${fraction}</span>${safeSuffix ? `<span class="account-decimal-value__suffix">${safeSuffix}</span>` : ''}</span>`;
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
      case 'flashcards':
        return `
          <svg viewBox="0 0 64 64" aria-hidden="true">
            <rect x="14" y="18" width="28" height="22" rx="5" ry="5" fill="none" stroke="currentColor" stroke-width="3.2"/>
            <path fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" d="M22 27h12m-12 7h8M22 13h28a4 4 0 0 1 4 4v20"/>
          </svg>
        `;
      case 'books':
      case 'reading':
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
      case 'precision-general':
        return `
          <svg viewBox="0 0 64 64" aria-hidden="true">
            <path fill="none" stroke="currentColor" stroke-width="3.8" stroke-linecap="round" stroke-linejoin="round" d="M35 9L20 34h12l-3 21l15-25H32z"/>
          </svg>
        `;
      case 'consistency':
        return `
          <svg viewBox="0 0 64 64" aria-hidden="true">
            <path fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" d="M18 34l9 9 19-21"/>
            <path fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" d="M16 50h32"/>
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
          layout: 'three',
          items: [
            {
              kind: 'practice-time',
              label: 'Estatisticas',
              value: '--'
            }
          ]
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
    const readingChars = Math.max(0, Number(stats.readingChars) || 0);
    const speakingChars = Math.max(0, Number(stats.speakingChars) || 0);
    const listeningChars = Math.max(0, Number(stats.listeningChars) || 0);
    const practiceSeconds = Math.max(0, Number(stats.practiceSeconds) || 0);
    const registeredDays = Math.max(0, Math.floor(Number(stats.accountAgeDays) || 0));
    const flashcardsCount = Math.max(0, Number(stats.flashcardsCount) || 0);
    const consistencyPercent = normalizePrecisePercent(stats.consistencyPercent);

    return [
      {
        layout: 'three',
        items: [
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
            kind: 'reading',
            label: 'Reading',
            value: formatCountCompact(readingChars)
          }
        ]
      },
      {
        layout: 'three',
        items: [
          {
            kind: 'days',
            label: 'Dias',
            value: `${registeredDays}`
          },
          {
            kind: 'practice-time',
            label: 'Pratica',
            value: formatDurationCompact(practiceSeconds)
          },
          {
            kind: 'consistency',
            label: 'Consistencia',
            value: consistencyPercent,
            decimal: true,
            suffix: '%'
          }
        ]
      },
      {
        layout: 'three',
        items: [
          {
            kind: 'flashcards',
            label: 'Flash Cards',
            value: `${flashcardsCount}`
          },
          {
            kind: 'books',
            label: 'Livros Lidos',
            value: `${myBooksCount}`
          },
          {
            kind: 'precision-general',
            label: 'Precisao',
            value: pronAvg,
            decimal: true
          }
        ]
      }
    ];
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
      setAnimatedDecimalMarkup(value, metric?.value, metric?.suffix);
    } else {
      value.textContent = safeText(metric?.value) || '--';
    }

    card.append(iconShell, label, value);
    return card;
  }

  function renderAccountMetrics() {
    if (!els.metrics || !els.statsPages) return;
    const loggedIn = isLoggedIn();
    els.metrics.hidden = !loggedIn;
    if (!loggedIn) {
      stopStatsRotation();
      els.statsPages.innerHTML = '';
      return;
    }

    startStatsRotation();
    const items = buildStatsRotationItems();
    const safePages = Array.isArray(items)
      ? items.filter((page) => Array.isArray(page?.items) && page.items.length)
      : [];
    const pageCount = safePages.length || 1;
    const activePageIndex = state.statsRotationIndex % pageCount;
    const signature = safePages
      .map((page) => `${safeText(page?.layout)}:${page.items.map((metric) => `${safeText(metric?.kind)}|${safeText(metric?.label)}|${metric?.value ?? ''}|${metric?.decimal ? '1' : '0'}|${safeText(metric?.suffix)}`).join('~')}`)
      .join('||');
    const shouldRebuild = state.statsLastRenderedLine !== signature;
    state.statsLastRenderedLine = signature;

    if (shouldRebuild) {
      els.statsPages.innerHTML = '';
      safePages.forEach((page, pageIndex) => {
        const pageElement = document.createElement('div');
        pageElement.className = 'account-stats-page';
        pageElement.dataset.layout = safeText(page?.layout) || 'three';
        pageElement.dataset.pageIndex = String(pageIndex);
        page.items.forEach((metric) => {
          pageElement.appendChild(createStatsMetricCard(metric));
        });
        els.statsPages.appendChild(pageElement);
      });
    }
    Array.from(els.statsPages.children).forEach((pageElement, pageIndex) => {
      pageElement.classList.toggle('is-active', pageIndex === activePageIndex);
    });
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
        setGuestInputTarget('name');
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
    const username = safeText(sourceProfile.username);
    const avatar = safeText(state.avatarDraft || sourceProfile.avatarImage);
    const hasAvatar = Boolean(avatar);
    const loggedIn = isLoggedIn();
    if (document.activeElement !== els.nameInput || !state.nameEditing) {
      els.nameInput.value = username;
    }
    if (els.nameInput) {
      const shouldUseInlineReadonly = loggedIn ? !state.nameEditing : false;
      els.nameInput.readOnly = shouldUseInlineReadonly;
      els.nameInput.inputMode = 'text';
      els.nameInput.autocomplete = loggedIn ? 'name' : 'username';
      els.nameInput.setAttribute('aria-label', loggedIn ? 'Nome do usuario' : 'Digite um nome de usuario');
      els.nameInput.placeholder = loggedIn ? 'Seu nome' : 'Digite um nome de usuario';
    }
    if (els.nameInline) {
      els.nameInline.classList.toggle('is-editing', loggedIn && state.nameEditing);
    }
    els.avatarPreview.src = hasAvatar
      ? avatar
      : (loggedIn ? 'Avatar/avatar-man-person-svgrepo-com.svg' : '/arquivos-codex/fluent-levelup-logo.png');
    els.avatarPreview.style.display = 'block';
    els.avatarFallback.textContent = loggedIn ? (username.charAt(0).toUpperCase() || 'P') : '';
    els.avatarFallback.style.display = loggedIn && !hasAvatar ? 'grid' : 'none';
    els.avatarInput.disabled = !loggedIn;
    els.avatarInput.value = '';
    els.avatarPreview.alt = loggedIn ? 'Avatar do usuario' : 'Logo Fluent LevelUp';
    if (els.panel) {
      els.panel.classList.toggle('is-guest', !loggedIn);
    }
    applyAvatarAura();

    const shouldHidePasswordField = loggedIn ? !state.passwordEditMode : false;
    if (els.passwordField) {
      els.passwordField.hidden = shouldHidePasswordField;
      const passwordFieldLabel = els.passwordField.querySelector('span');
      if (passwordFieldLabel) {
        passwordFieldLabel.textContent = loggedIn ? 'Senha' : 'Toque para inserir a senha';
      }
    }
    if (els.passwordInput) {
      els.passwordInput.placeholder = loggedIn ? 'Nova senha' : 'Digite sua senha';
      els.passwordInput.readOnly = false;
      els.passwordInput.inputMode = 'text';
      els.passwordInput.autocomplete = loggedIn ? 'new-password' : 'current-password';
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

    if (els.logoutBtn) {
      els.logoutBtn.hidden = !state.user;
    }
    if (els.logoutWrap) {
      els.logoutWrap.hidden = !state.user;
    }
    if (els.guestLoginBtn) {
      els.guestLoginBtn.hidden = loggedIn;
      const guestLoginLabel = els.guestLoginBtn.querySelector('.account-button__label');
      if (guestLoginLabel) {
        guestLoginLabel.textContent = 'Acessar plataforma';
      }
    }
    syncGuestInlineUi();
    renderGuestPromptLabel();
    startGuestPromptRotation();
    renderPremiumStatus();
    renderPremiumButton();
    renderAccountMetrics();
    if (els.guestKeyboard) {
      els.guestKeyboard.hidden = true;
    }
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
      applyAvatarAura();
      renderAccountMetrics();
      return;
    }

    const booksResult = await Promise.resolve(fetch(buildApiUrl('/api/books/stats'), {
      headers: buildAuthHeaders(),
      cache: 'no-store',
      credentials: 'include'
    })).then((value) => ({ status: 'fulfilled', value }), (reason) => ({ status: 'rejected', reason }));

    if (booksResult.status === 'fulfilled') {
      const payload = await booksResult.value.json().catch(() => ({}));
      state.booksStats = booksResult.value.ok && payload?.success
        ? (payload.stats || null)
        : null;
    } else {
      state.booksStats = null;
    }

    applyAvatarAura();
    renderAccountMetrics();
  }

  function finishInlineNameEdit(options = {}) {
    const shouldSave = options.save !== false;
    const revert = options.revert === true;
    if (revert) {
      els.nameInput.value = safeText(state.lastSavedUsername || state.user?.username || state.localProfile?.username);
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

    if (els.guestLoginBtn) els.guestLoginBtn.disabled = true;
    if (els.premiumBtn) els.premiumBtn.disabled = true;
    setStatus('Entrando na sua conta...');

    try {
      const supportsAbort = typeof AbortController === 'function';
      const requestController = supportsAbort ? new AbortController() : null;
      const requestTimeoutMs = 14000;
      const timeoutHandle = requestController
        ? window.setTimeout(() => requestController.abort(), requestTimeoutMs)
        : 0;
      let response;
      try {
        response = await fetch(buildApiUrl('/login'), {
          method: 'POST',
          headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ username, password }),
          ...(requestController ? { signal: requestController.signal } : {})
        });
      } finally {
        if (timeoutHandle) {
          window.clearTimeout(timeoutHandle);
        }
      }
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
      const timeoutMessage = error?.name === 'AbortError'
        ? 'Servidor demorou para responder. Confirme se o Postgres esta online e tente novamente.'
        : (error?.message || 'Nao foi possivel entrar agora.');
      setStatus(timeoutMessage, 'error');
    } finally {
      if (els.guestLoginBtn) els.guestLoginBtn.disabled = false;
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
    const bootTimeoutToken = Symbol('account-boot-timeout');
    try {
      const sessionUser = await awaitWithTimeout(fetchSessionUser(), 5200, bootTimeoutToken);
      const sessionRequestTimedOut = sessionUser === bootTimeoutToken;
      state.user = sessionRequestTimedOut ? null : sessionUser;
      state.localProfile = readLocalPlayerProfile();
      syncSavedSnapshot(state.user || state.localProfile);
      renderUser();
      const metricsResult = await awaitWithTimeout(fetchBooksMetrics(), 5200, bootTimeoutToken);
      if (sessionRequestTimedOut || metricsResult === bootTimeoutToken) {
        setStatus('Servidor instavel no momento. Voce ainda pode tentar fazer login manualmente.', 'error');
      }
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

  }

  init();
})();
