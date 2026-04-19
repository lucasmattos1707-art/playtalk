(function initPlaytalkPlayerState() {
  const STORAGE_KEY = 'playtalk_player_profile';
  const DEFAULT_AVATAR = '';
  const PROGRESS_STORAGE_KEY = 'vocabulary-progress';
  const COMPLETION_STORAGE_KEY = 'vocabulary-last-complete';
  const GAME_CONTEXT_STORAGE_KEY = 'playtalk-active-game-context';
  const GAME_CONTEXT_EVENT = 'playtalk:game-context-change';
  const PROFILE_BADGE_ID = 'global-header-game-mode-badge';
  const FLUENCY_JOURNEY_BADGE_SRC = 'SVG/game-context/rocket.svg';
  const SINGLE_GAME_BADGE_SRC = 'SVG/game-context/play.svg';
  const FOOTER_HOME_ROCKET_ICON = 'SVG/game-context/rocket.svg';
  let memoryState = null;

  const DEFAULT_STATE = {
    avatar: DEFAULT_AVATAR,
    username: '',
    password: '',
    coins: 0,
    onboardingDone: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  function normalizeCoins(value) {
    const parsed = Number.parseFloat(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return 0;
    return Math.floor(parsed);
  }

  function formatCoins(value) {
    const num = normalizeCoins(value);
    return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(num);
  }

  function getLevelFromCoins(value) {
    const coins = normalizeCoins(value);
    return Math.max(1, Math.floor(coins / 1000) + 1);
  }

  function getCurrentRoute() {
    const rawPath = (window.location.pathname || '').toLowerCase();
    if (!rawPath || rawPath === '/') return '/index.html';
    if (rawPath.endsWith('/')) return `${rawPath}index.html`;
    return rawPath;
  }

  function getActiveIndexView() {
    const body = document.body;
    if (!body) return 'home';
    const fromDataset = (body.dataset.activeView || '').toLowerCase().trim();
    if (fromDataset) return fromDataset;
    const hash = decodeURIComponent((window.location.hash || '').replace('#', '')).toLowerCase().trim();
    return hash || 'home';
  }

  function shouldShowHeader() {
    const body = document.body;
    if (!body) return true;
    if (body.classList.contains('journey-onboarding-active')) {
      return false;
    }
    if (body.classList.contains('page-play') || body.classList.contains('play-inline-active')) {
      return true;
    }

    const route = getCurrentRoute();
    const activeView = route.endsWith('/index.html') ? getActiveIndexView() : '';
    if (
      route.endsWith('/fun.html')
      || route.endsWith('/play.html')
      || route.endsWith('/cards.html')
      || route.endsWith('/mycards')
      || route.endsWith('/mycards.html')
      || activeView === 'options'
      || activeView === 'play'
      || activeView === 'cards'
    ) {
      return true;
    }

    if (body.classList.contains('wizard-active')) {
      return false;
    }

    if (
      body.classList.contains('pre-game-active')
      || body.classList.contains('pause-menu-active')
      || body.classList.contains('game-active')
    ) {
      return true;
    }

    if (route.endsWith('/profile.html')) return true;

    if (route.endsWith('/index.html')) {
      return activeView === 'home' || activeView === 'play' || activeView === 'options' || activeView === 'profile' || activeView === 'cards';
    }

    return false;
  }

  function ensureHeaderIdentity(header) {
    const leftSlot = header.querySelector('.site-header__slot--left');
    const avatarButton = header.querySelector('.site-header__avatar-button');
    let player = header.querySelector('.site-header__player');

    if (!player && leftSlot && avatarButton) {
      player = document.createElement('div');
      player.className = 'site-header__player';
      leftSlot.insertBefore(player, avatarButton);
      player.appendChild(avatarButton);
    }

    if (!player) {
      return {
        usernameEl: document.getElementById('global-header-username'),
        dayEl: document.getElementById('global-header-day'),
        badgeEl: document.getElementById(PROFILE_BADGE_ID)
      };
    }

    let identity = player.querySelector('.site-header__identity');
    if (!identity) {
      identity = document.createElement('div');
      identity.className = 'site-header__identity';
      player.appendChild(identity);
    }

    let usernameEl = player.querySelector('#global-header-username');
    if (!usernameEl) {
      usernameEl = document.createElement('span');
      usernameEl.id = 'global-header-username';
      usernameEl.className = 'site-header__username';
      identity.appendChild(usernameEl);
    } else if (usernameEl.parentElement !== identity) {
      identity.appendChild(usernameEl);
    }

    let dayEl = player.querySelector('#global-header-day');
    if (!dayEl) {
      dayEl = document.createElement('span');
      dayEl.id = 'global-header-day';
      dayEl.className = 'site-header__day';
      identity.appendChild(dayEl);
    } else if (dayEl.parentElement !== identity) {
      identity.appendChild(dayEl);
    }

    let badgeEl = avatarButton ? avatarButton.querySelector(`#${PROFILE_BADGE_ID}`) : null;
    if (!badgeEl && avatarButton) {
      badgeEl = document.createElement('img');
      badgeEl.id = PROFILE_BADGE_ID;
      badgeEl.className = 'site-header__mode-badge';
      badgeEl.alt = '';
      badgeEl.setAttribute('aria-hidden', 'true');
      badgeEl.loading = 'lazy';
      avatarButton.appendChild(badgeEl);
    }

    return { usernameEl, dayEl, badgeEl };
  }

  function sanitizeState(value) {
    const safe = value && typeof value === 'object' ? value : {};
    const avatar = typeof safe.avatar === 'string' && safe.avatar.trim()
      ? safe.avatar.trim()
      : DEFAULT_AVATAR;
    const username = typeof safe.username === 'string' ? safe.username.trim().slice(0, 20) : '';
    const password = '';
    const coins = normalizeCoins(safe.coins);
    return {
      ...DEFAULT_STATE,
      ...safe,
      avatar,
      username,
      password,
      coins,
      onboardingDone: true,
      updatedAt: Date.now()
    };
  }

  function read() {
    if (!memoryState) {
      memoryState = sanitizeState({ ...DEFAULT_STATE });
    }
    return { ...memoryState };
  }

  function write(nextState) {
    const safe = sanitizeState(nextState);
    memoryState = { ...safe };
    document.dispatchEvent(new CustomEvent('playtalk:player-state-change', {
      detail: { state: safe }
    }));
    renderHeader(safe);
    return safe;
  }

  function patch(partial) {
    const current = read();
    return write({ ...current, ...(partial || {}) });
  }

  function completeOnboarding(payload) {
    const current = read();
    return write({
      ...current,
      ...(payload || {}),
      onboardingDone: true
    });
  }

  function addCoins(amount) {
    const num = normalizeCoins(amount);
    if (!Number.isFinite(num) || num <= 0) return read();
    const current = read();
    const currentCoins = normalizeCoins(current.coins);
    return write({
      ...current,
      coins: normalizeCoins(currentCoins + num)
    });
  }

  function spendCoins(amount) {
    const num = normalizeCoins(amount);
    if (!Number.isFinite(num) || num <= 0) return false;
    const current = read();
    const currentCoins = normalizeCoins(current.coins);
    if (currentCoins < num) return false;
    write({
      ...current,
      coins: normalizeCoins(currentCoins - num)
    });
    return true;
  }

  function readJsonStorage(key) {
    return {};
  }

  function readJourneyProgressPercent() {
    const progress = readJsonStorage(PROGRESS_STORAGE_KEY);
    const total = Number(progress.journeyTotalSteps);
    const done = Number(progress.journeyCompletedSteps);
    if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(done)) return 0;
    return Math.max(0, Math.min(100, (done / total) * 100));
  }

  function hasFluencyJourneyProgress() {
    const percent = readJourneyProgressPercent();
    if (percent > 0) return true;
    const completion = readJsonStorage(COMPLETION_STORAGE_KEY);
    return Number.isFinite(Number(completion.completedLevel)) && Number(completion.completedLevel) > 0;
  }

  function readGameContextStorage() {
    const context = readJsonStorage(GAME_CONTEXT_STORAGE_KEY);
    const mode = typeof context.mode === 'string' ? context.mode.trim() : '';
    const active = Boolean(context.active);
    return { mode, active };
  }

  function resolveHeaderModeBadge() {
    const context = readGameContextStorage();
    if (context.active && context.mode === 'single-game') {
      return { visible: true, src: SINGLE_GAME_BADGE_SRC };
    }
    if (hasFluencyJourneyProgress()) {
      return { visible: true, src: FLUENCY_JOURNEY_BADGE_SRC };
    }
    return { visible: false, src: '' };
  }
  function updateFooterHomeIcon() {
    const homeLink = document.querySelector('#main-nav a.nav-item[data-nav-index="0"]');
    if (!homeLink) return;
    homeLink.setAttribute('href', '#home');
  }

  function readJourneyDay() {
    return 1;
  }

  function renderHeader(state = read()) {
    const header = document.getElementById('global-header');
    if (!header) return;
    const avatarImg = document.getElementById('global-header-avatar-image');
    const avatarFallback = document.getElementById('global-header-avatar-fallback');
    const coinsEl = document.getElementById('global-header-coins');
    const menuBtn = document.getElementById('global-header-menu');
    const menuLabel = document.getElementById('global-header-menu-label');
    const identity = ensureHeaderIdentity(header);
    const usernameEl = identity.usernameEl;
    const dayEl = identity.dayEl;
    const badgeEl = identity.badgeEl;

    header.classList.toggle('is-hidden', !shouldShowHeader());

    const avatarValue = typeof state.avatar === 'string' ? state.avatar.trim() : '';
    const hasCustomAvatar = Boolean(avatarValue) && avatarValue !== 'Avatar/avatar-boy-male-svgrepo-com.svg';

    if (avatarImg) {
      avatarImg.alt = state.username ? `Avatar de ${state.username}` : 'Avatar do jogador';
      avatarImg.style.display = hasCustomAvatar ? 'block' : 'none';
      if (hasCustomAvatar) {
        avatarImg.src = avatarValue;
      } else {
        avatarImg.removeAttribute('src');
      }
    }
    if (avatarFallback) {
      avatarFallback.textContent = state.username ? state.username.slice(0, 1).toUpperCase() : 'P';
      avatarFallback.style.display = hasCustomAvatar ? 'none' : 'flex';
    }
    if (coinsEl) {
      coinsEl.textContent = formatCoins(state.coins);
    }
    if (usernameEl) {
      usernameEl.textContent = state.username || 'Player';
    }
    if (dayEl) {
      dayEl.textContent = `Dia ${readJourneyDay()}`;
    }
    if (menuBtn && menuLabel) {
      menuLabel.textContent = 'Fluent LevelUp';
      menuBtn.setAttribute('aria-label', 'Menu principal');
    }

    if (badgeEl) {
      const badge = resolveHeaderModeBadge();
      badgeEl.style.display = badge.visible ? 'block' : 'none';
      if (badge.visible && badge.src) {
        badgeEl.src = badge.src;
      } else {
        badgeEl.removeAttribute('src');
      }
    }

    updateFooterHomeIcon();
  }

  const api = {
    key: STORAGE_KEY,
    defaultAvatar: DEFAULT_AVATAR,
    get: read,
    set: write,
    patch,
    completeOnboarding,
    addCoins,
    spendCoins,
    renderHeader
  };

  window.playtalkPlayerState = api;

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (_error) {
    // ignore cleanup failure
  }

  document.addEventListener('playtalk:view-change', () => {
    api.renderHeader();
  });

  document.addEventListener('playtalk:journey-progress', () => {
    api.renderHeader();
  });

  document.addEventListener('playtalk:level-updated', () => {
    api.renderHeader();
  });

  document.addEventListener(GAME_CONTEXT_EVENT, () => {
    api.renderHeader();
  });

  window.addEventListener('hashchange', () => {
    api.renderHeader();
  });

  window.addEventListener('storage', (event) => {
    if (event.key === 'vocabulary-level') {
      api.renderHeader();
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    api.renderHeader();
    if (document.body && window.MutationObserver) {
      const observer = new MutationObserver(() => api.renderHeader());
      observer.observe(document.body, {
        attributes: true,
        attributeFilter: ['class', 'data-active-view']
      });
    }
  });
})();



