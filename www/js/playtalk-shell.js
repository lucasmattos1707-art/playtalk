(function initPlaytalkShell() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  const starPages = new Set(['/flashcards', '/allcards', '/speaking', '/users', '/account', '/premium']);
  const footerPages = new Set(['/play', '/flashcards', '/allcards', '/users', '/account', '/books']);
  const loaderPages = new Set(['/play', '/flashcards', '/books', '/allcards']);
  const LOADER_ROOT_ID = 'playtalkGlobalLoader';
  const LOADER_STYLE_ID = 'playtalkGlobalLoaderStyles';
  const LOADER_BODY_CLASS = 'playtalk-loader-active';
  const LOADER_MIN_VISIBLE_MS = 0;
  const USERS_LOADER_MAX_VISIBLE_MS = 4200;

  const loaderState = {
    activeKeys: new Set(),
    shownAtByKey: new Map(),
    hideTimerByKey: new Map(),
    messageByKey: new Map(),
    metaByKey: new Map()
  };

  function injectStars() {
    if (!starPages.has(path)) return;
  }

  function activeSlot() {
    if (path === '/play' || path === '/flashcards') return 'play';
    if (path === '/allcards') return 'cards';
    if (path === '/users') return 'users';
    if (path === '/account') return 'account';
    if (path === '/books') return 'books';
    return 'play';
  }

  function buildFooterItem(slot, href, label, svg, id) {
    const active = activeSlot() === slot ? ' is-active' : '';
    const idAttr = id ? ` id="${id}"` : '';
    return `<a class="flashcards-footer-nav__item${active}"${idAttr} href="${href}" data-view="${slot}" aria-label="${label}">${svg}</a>`;
  }

  function injectFooter() {
    if (!footerPages.has(path)) return;
    let nav = document.querySelector('.flashcards-footer-nav');
    if (!nav) {
      nav = document.createElement('nav');
      document.body.appendChild(nav);
    }
    nav.className = 'flashcards-footer-nav';
    nav.id = 'flashcardsFooterNav';
    nav.dataset.shellPage = path === '/books' ? 'books' : 'default';
    nav.setAttribute('aria-label', 'Navegacao do flashcards');
    nav.innerHTML = [
      buildFooterItem('play', '/play', 'Home', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 10.8 12 4l8.5 6.8"></path><path d="M5.5 9.5V20h5v-5.5h3V20h5V9.5"></path></svg>', 'footerPlayBtn'),
      buildFooterItem('cards', '/allcards', 'Flashcards', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m13 2.8-7.4 11H11l-1.2 7.4 8.6-12.4H13l0-6Z"></path></svg>', 'footerCardsBtn'),
      buildFooterItem('users', '/users', 'Usuarios', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10v2h3v1.8a5.2 5.2 0 0 1-4.6 5.15A5.8 5.8 0 0 1 13 15.45V19h4v2H7v-2h4v-3.55a5.8 5.8 0 0 1-2.4-2.5A5.2 5.2 0 0 1 4 7.8V6h3V4Z"></path><path d="M7 8H5.8A3.1 3.1 0 0 0 8 11"></path><path d="M17 8h1.2A3.1 3.1 0 0 1 16 11"></path></svg>', 'footerUsersBtn'),
      buildFooterItem('account', '/account', 'Perfil', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12.2a4.2 4.2 0 1 0 0-8.4 4.2 4.2 0 0 0 0 8.4Z"></path><path d="M4.5 20.2c.8-3.7 3.6-5.7 7.5-5.7s6.7 2 7.5 5.7"></path></svg>', 'footerProfileBtn'),
      buildFooterItem('books', '/books', 'Books', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H20v15h-2V4H7.5a.5.5 0 0 0 0 1H16v12H7.5A2.5 2.5 0 0 1 5 14.5v-10Z"></path><path d="M7.5 15H14V7H7.5"></path></svg>', 'footerBooksBtn')
    ].join('');
  }

  function ensureLoaderStyles() {
    if (document.getElementById(LOADER_STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = LOADER_STYLE_ID;
    style.textContent = `
      body.${LOADER_BODY_CLASS} {
        overflow: hidden !important;
        touch-action: none;
      }

      body > .playtalk-loader {
        position: fixed !important;
        inset: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        height: 100dvh !important;
        z-index: 2147483647;
        display: grid;
        place-items: center;
        padding: 0;
        background: rgba(0, 0, 0, 0.28);
        backdrop-filter: blur(18px) saturate(0.92);
        -webkit-backdrop-filter: blur(18px) saturate(0.92);
        opacity: 0;
        visibility: hidden;
        pointer-events: none;
        transition: opacity 180ms ease, visibility 180ms ease;
      }

      body > .playtalk-loader::before {
        content: '';
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.08);
        pointer-events: none;
      }

      body > .playtalk-loader.is-visible {
        opacity: 1;
        visibility: visible;
        pointer-events: auto;
      }

      .playtalk-loader__screen {
        position: relative;
        z-index: 1;
        width: 100%;
        min-height: 100%;
        display: grid;
        place-items: center;
        padding: 28px;
      }

      .playtalk-loader__stack {
        width: min(88vw, 420px);
        display: grid;
        justify-items: center;
        gap: 14px;
        text-align: center;
      }

      .playtalk-loader__spinner {
        width: 54px;
        height: 54px;
        border-radius: 999px;
        border: 3px solid rgba(255, 255, 255, 0.28);
        border-top-color: #ffffff;
        border-right-color: rgba(255, 255, 255, 0.84);
        filter: drop-shadow(0 0 16px rgba(255, 255, 255, 0.34));
        animation: playtalk-loader-spin 0.82s linear infinite;
      }

      .playtalk-loader__message {
        margin: 0;
        color: #ffffff;
        font: 800 clamp(19px, 2.5vw, 25px)/1.15 "Exo 2", Arial, sans-serif;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        text-shadow: 0 0 18px rgba(255, 255, 255, 0.18);
      }

      .playtalk-loader__meta {
        margin: 0;
        max-width: min(84vw, 360px);
        color: rgba(255, 255, 255, 0.82);
        font: 700 clamp(13px, 1.9vw, 15px)/1.35 "Exo 2", Arial, sans-serif;
        letter-spacing: 0.025em;
      }

      @keyframes playtalk-loader-spin {
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }

  function loaderMarkup() {
    return `
      <div class="playtalk-loader__screen" aria-live="polite">
        <div class="playtalk-loader__stack">
          <span class="playtalk-loader__spinner" aria-label="Carregando"></span>
          <p class="playtalk-loader__message" data-loader-message hidden></p>
          <p class="playtalk-loader__meta" data-loader-meta hidden></p>
        </div>
      </div>
    `;
  }

  function ensureLoader() {
    ensureLoaderStyles();
    let root = document.getElementById(LOADER_ROOT_ID);
    if (root) return root;
    root = document.createElement('div');
    root.id = LOADER_ROOT_ID;
    root.className = 'playtalk-loader';
    root.hidden = true;
    root.setAttribute('aria-hidden', 'true');
    root.innerHTML = loaderMarkup();
    document.body.appendChild(root);
    renderLoader();
    return root;
  }

  function waitForLoaderAudioCycle() {
    return Promise.resolve();
  }

  function renderLoader() {
    const root = ensureLoader();
    const visible = loaderState.activeKeys.size > 0;
    const messageNode = root.querySelector('[data-loader-message]');
    const metaNode = root.querySelector('[data-loader-meta]');
    const topKey = Array.from(loaderState.activeKeys.values()).pop() || '';
    const message = String(loaderState.messageByKey?.get(topKey) || '').trim();
    const meta = String(loaderState.metaByKey?.get(topKey) || '').trim();
    if (messageNode) {
      messageNode.hidden = !message;
      messageNode.textContent = message;
    }
    if (metaNode) {
      metaNode.hidden = !meta;
      metaNode.textContent = meta;
    }
    root.hidden = !visible;
    root.classList.toggle('is-visible', visible);
    root.setAttribute('aria-hidden', visible ? 'false' : 'true');
    document.body.classList.toggle(LOADER_BODY_CLASS, visible);
  }

  function normalizeLoaderKey(key) {
    return String(key || 'default');
  }

  function clearHideTimer(key) {
    const timerId = loaderState.hideTimerByKey.get(key);
    if (timerId) {
      window.clearTimeout(timerId);
      loaderState.hideTimerByKey.delete(key);
    }
  }

  function showLoader(key) {
    const normalizedKey = normalizeLoaderKey(key);
    clearHideTimer(normalizedKey);
    if (!loaderState.activeKeys.has(normalizedKey)) {
      loaderState.shownAtByKey.set(normalizedKey, Date.now());
    }
    loaderState.activeKeys.add(normalizedKey);
    renderLoader();
  }

  function hideLoader(key, options) {
    const normalizedKey = normalizeLoaderKey(key);
    const nextOptions = options && typeof options === 'object' ? options : {};
    const shownAt = loaderState.shownAtByKey.get(normalizedKey) || 0;
    const elapsed = shownAt ? (Date.now() - shownAt) : LOADER_MIN_VISIBLE_MS;
    const remaining = nextOptions.force ? 0 : Math.max(0, LOADER_MIN_VISIBLE_MS - elapsed);
    clearHideTimer(normalizedKey);
    if (remaining > 0) {
      const timerId = window.setTimeout(() => {
        loaderState.activeKeys.delete(normalizedKey);
        loaderState.shownAtByKey.delete(normalizedKey);
        loaderState.hideTimerByKey.delete(normalizedKey);
        renderLoader();
      }, remaining);
      loaderState.hideTimerByKey.set(normalizedKey, timerId);
      return;
    }
    loaderState.activeKeys.delete(normalizedKey);
    loaderState.shownAtByKey.delete(normalizedKey);
    renderLoader();
  }

  function setLoaderMessage() {
    const [key, message] = arguments;
    const normalizedKey = normalizeLoaderKey(key);
    if (!loaderState.messageByKey) {
      loaderState.messageByKey = new Map();
    }
    if (message == null || String(message).trim() === '') {
      loaderState.messageByKey.delete(normalizedKey);
    } else {
      loaderState.messageByKey.set(normalizedKey, String(message));
    }
    renderLoader();
  }

  function setLoaderMeta() {
    const [key, meta] = arguments;
    const normalizedKey = normalizeLoaderKey(key);
    if (!loaderState.metaByKey) {
      loaderState.metaByKey = new Map();
    }
    if (meta == null || String(meta).trim() === '') {
      loaderState.metaByKey.delete(normalizedKey);
    } else {
      loaderState.metaByKey.set(normalizedKey, String(meta));
    }
    renderLoader();
  }

  function resetLoader() {
    loaderState.hideTimerByKey.forEach((timerId) => {
      window.clearTimeout(timerId);
    });
    loaderState.hideTimerByKey.clear();
    loaderState.activeKeys.clear();
    loaderState.shownAtByKey.clear();
    if (loaderState.messageByKey) loaderState.messageByKey.clear();
    if (loaderState.metaByKey) loaderState.metaByKey.clear();
    renderLoader();
  }

  function forceHideUsersLoader() {
    if (path !== '/users') return;
    resetLoader();
  }

  window.PlaytalkLoader = {
    ensure: ensureLoader,
    show: showLoader,
    hide: hideLoader,
    setMessage: setLoaderMessage,
    setMeta: setLoaderMeta,
    reset: resetLoader,
    waitForAudioCycle: waitForLoaderAudioCycle,
    isVisible(key) {
      if (key == null) return loaderState.activeKeys.size > 0;
      return loaderState.activeKeys.has(normalizeLoaderKey(key));
    }
  };

  injectStars();
  injectFooter();
  ensureLoader();
  document.addEventListener('click', (event) => {
    const trigger = event.target && typeof event.target.closest === 'function'
      ? event.target.closest('a[href], #welcomeStartBtn, #footerUsersBtn')
      : null;
    if (!trigger) return;
    const href = trigger.getAttribute && trigger.getAttribute('href');
    const isUsers = trigger.id === 'footerUsersBtn' || (href && /\/users(?:[/?#]|$)/i.test(href));
    const isFlashWelcome = trigger.id === 'welcomeStartBtn';
    if (isUsers) {
      showLoader('nav-users');
      return;
    }
    if (isFlashWelcome) {
      showLoader('welcome-flash-start');
    }
  }, true);
  if (loaderPages.has(path)) {
    showLoader('page-init');
    if (path === '/users') {
      window.setTimeout(forceHideUsersLoader, USERS_LOADER_MAX_VISIBLE_MS);
    }
  }
})();
