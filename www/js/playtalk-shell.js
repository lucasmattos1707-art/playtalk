(function initPlaytalkShell() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  const starPages = new Set(['/flashcards', '/allcards', '/speaking', '/users', '/account', '/premium']);
  const footerInjectedPages = new Set(['/books']);
  const loaderPages = new Set(['/play', '/flashcards', '/books', '/allcards', '/users']);
  const LOADER_ROOT_ID = 'playtalkGlobalLoader';
  const LOADER_STYLE_ID = 'playtalkGlobalLoaderStyles';
  const LOADER_BODY_CLASS = 'playtalk-loader-active';
  const LOADER_MIN_VISIBLE_MS = 4000;
  const LOADER_TIPS = [
    ['UM VERBO EM USO', 'VALE MAIS QUE DEZ NA LISTA'],
    ['ERRO TAMBEM ENSINA', 'QUANDO VOCE CONTINUA'],
    ['FLUENCIA CRESCE', 'EM REPETICAO COM SENTIDO'],
    ['FRASES VIVIDAS', 'GRUDAM MAIS QUE REGRAS'],
    ['PEQUENO TODO DIA', 'VIRA GIGANTE NO TEMPO'],
    ['OUVIR E REPETIR', 'ACELERA SUA MEMORIA'],
    ['PRATICA DE VERDADE', 'MUDA SEU INGLES'],
    ['UM PASSO AGORA', 'VALE MAIS QUE ESPERAR']
  ];
  const loaderState = {
    activeKeys: new Set(),
    shownAtByKey: new Map(),
    hideTimerByKey: new Map(),
    message: 'Preparando sua jornada',
    metaItems: [],
    tipIndex: 0,
    tipTimer: 0
  };

  function injectStars() {
    if (!starPages.has(path)) return;
    return;
  }

  function activeSlot() {
    if (path === '/allcards') return 'cards';
    if (path === '/users') return 'users';
    if (path === '/account') return 'account';
    if (path === '/premium') return 'premium';
    if (path === '/books' || path === '/speaking') return 'books';
    return 'play';
  }

  function buildFooterItem(slot, href, label, svg) {
    const active = activeSlot() === slot ? ' is-active' : '';
    return `<a class="flashcards-footer-nav__item${active}" href="${href}" aria-label="${label}">${svg}</a>`;
  }

  function injectFooter() {
    if (!footerInjectedPages.has(path)) return;
    if (document.querySelector('.flashcards-footer-nav')) return;
    const nav = document.createElement('nav');
    nav.className = 'flashcards-footer-nav';
    nav.dataset.shellPage = path === '/books' ? 'books' : 'default';
    nav.setAttribute('aria-label', 'Navegacao do flashcards');
    nav.innerHTML = [
      buildFooterItem('play', '/play', 'Jogar', '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8 5.14v13.72a1 1 0 0 0 1.5.86l10-6.36a1 1 0 0 0 0-1.72l-10-6.36A1 1 0 0 0 8 5.14Z"/></svg>'),
      buildFooterItem('cards', '/allcards', 'Flashcards', '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12.6 2.5c.33 2.34 2.12 3.25 3.48 4.86 1.34 1.59 2 3.22 2 5.35 0 4.3-2.96 8.79-7.58 8.79-3.36 0-5.58-2.4-5.58-5.34 0-2.21 1.12-3.85 2.97-5.78 1.38-1.44 2.94-3.14 4.71-7.88Z"/></svg>'),
      buildFooterItem('users', '/users', 'Usuarios', '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 3h10v2h2a2 2 0 0 1 2 2c0 3.32-2.47 6-5.57 6.4A5.99 5.99 0 0 1 13 17.83V20h4v2H7v-2h4v-2.17A5.99 5.99 0 0 1 8.57 13.4C5.47 13 3 10.32 3 7a2 2 0 0 1 2-2h2V3Zm-2 4c0 2.1 1.45 3.82 3.4 4.28A6 6 0 0 1 7 7V7H5Zm14 0h-2a6 6 0 0 1-1.4 4.28C17.55 10.82 19 9.1 19 7Z"/></svg>'),
      buildFooterItem('account', '/account', 'Perfil', '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 12a4.5 4.5 0 1 0-4.5-4.5A4.5 4.5 0 0 0 12 12Zm0 2c-4.42 0-8 2.46-8 5.5 0 .83.67 1.5 1.5 1.5h13c.83 0 1.5-.67 1.5-1.5 0-3.04-3.58-5.5-8-5.5Z"/></svg>'),
      buildFooterItem('books', '/books', 'Books', '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M5 4.5A2.5 2.5 0 0 1 7.5 2H20v15h-2V4H7.5a.5.5 0 0 0 0 1H16v12H7.5A2.5 2.5 0 0 1 5 14.5v-10Zm2.5 10.5H14V7H7.5a2.5 2.5 0 0 1-.5-.05v7.55a.5.5 0 0 0 .5.5Z"/></svg>')
    ].join('');
    document.body.appendChild(nav);
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
        min-width: 100vw !important;
        height: 100vh !important;
        min-height: 100vh !important;
        height: 100dvh !important;
        min-height: 100dvh !important;
        z-index: 2147483647;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        background:
          radial-gradient(circle at 50% 25%, rgba(24, 200, 255, 0.22), transparent 32%),
          radial-gradient(circle at 70% 75%, rgba(45, 102, 255, 0.18), transparent 34%),
          linear-gradient(180deg, #040918 0%, #020713 54%, #01030a 100%);
        opacity: 0;
        visibility: hidden;
        pointer-events: none;
        transition: opacity 220ms ease, visibility 220ms ease;
      }

      .playtalk-loader::before {
        content: '';
        position: absolute;
        inset: 0;
        background:
          linear-gradient(120deg, transparent 0 21%, rgba(24, 200, 255, 0.12) 21.2%, transparent 22%),
          linear-gradient(240deg, transparent 0 28%, rgba(45, 102, 255, 0.14) 28.2%, transparent 29%),
          repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.025) 0 1px, transparent 1px 88px);
        opacity: 0.55;
        pointer-events: none;
      }

      .playtalk-loader.is-visible {
        opacity: 1;
        visibility: visible;
        pointer-events: auto;
      }

      .playtalk-loader__screen {
        width: min(440px, 100%);
        min-height: 100dvh;
        padding: 42px 28px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        position: relative;
        isolation: isolate;
        color: #f5fbff;
        font-family: "Exo 2", "Segoe UI", sans-serif;
      }

      .playtalk-loader__pulse {
        position: absolute;
        width: 280px;
        height: 280px;
        border-radius: 999px;
        border: 1px solid rgba(24, 200, 255, 0.13);
        top: 50%;
        left: 50%;
        transform: translate(-50%, -54%);
        z-index: -1;
        animation: playtalk-loader-pulse 2.8s ease-out infinite;
      }

      .playtalk-loader__logo-wrap {
        width: 126px;
        height: 126px;
        display: grid;
        place-items: center;
        margin-bottom: 24px;
        animation: playtalk-loader-float 2.4s ease-in-out infinite;
      }

      .playtalk-loader__logo {
        width: 84px;
        height: 84px;
        filter:
          drop-shadow(0 0 8px rgba(24, 200, 255, 0.95))
          drop-shadow(0 0 20px rgba(45, 102, 255, 0.68));
      }

      .playtalk-loader__brand {
        font-family: "Orbitron", "Exo 2", sans-serif;
        font-size: 22px;
        font-weight: 900;
        letter-spacing: 0.18em;
        margin-bottom: 6px;
      }

      .playtalk-loader__sub {
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.55em;
        color: #18c8ff;
        font-weight: 900;
        padding-left: 7px;
        margin-bottom: 56px;
        text-shadow: 0 0 16px rgba(24, 200, 255, 0.72);
      }

      .playtalk-loader__kicker {
        color: #18c8ff;
        text-transform: uppercase;
        letter-spacing: 0.16em;
        font-size: 12px;
        font-weight: 900;
        margin-bottom: 12px;
      }

      .playtalk-loader__tip {
        min-height: 104px;
        width: min(360px, 100%);
        display: grid;
        align-content: center;
        gap: 8px;
        font-family: "Orbitron", "Exo 2", sans-serif;
        font-size: clamp(18px, 4.8vw, 24px);
        line-height: 1.15;
        font-weight: 900;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        text-shadow: 0 0 20px rgba(255, 255, 255, 0.12);
      }

      .playtalk-loader__tip-line {
        display: block;
      }

      .playtalk-loader__progress {
        width: min(310px, 100%);
        margin-top: 44px;
      }

      .playtalk-loader__meta {
        width: min(320px, 100%);
        margin-top: 24px;
        display: grid;
        gap: 10px;
      }

      .playtalk-loader__meta[hidden] {
        display: none !important;
      }

      .playtalk-loader__meta-row {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        color: rgba(224, 241, 255, 0.92);
        font-family: "Exo 2", "Segoe UI", sans-serif;
        font-size: clamp(13.5px, 2.9vw, 18px);
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: none;
      }

      .playtalk-loader__meta-row svg {
        width: 18px;
        height: 18px;
        flex: 0 0 auto;
        color: #8deeff;
        filter: drop-shadow(0 0 10px rgba(24, 200, 255, 0.4));
      }

      .playtalk-loader__progress-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
        color: #aebcdf;
        font-size: 13px;
        font-weight: 800;
        margin-bottom: 10px;
      }

      .playtalk-loader__message {
        text-align: left;
      }

      .playtalk-loader__dots span {
        display: inline-block;
        animation: playtalk-loader-dot 1.1s infinite both;
      }

      .playtalk-loader__dots span:nth-child(2) {
        animation-delay: 0.16s;
      }

      .playtalk-loader__dots span:nth-child(3) {
        animation-delay: 0.32s;
      }

      .playtalk-loader__bar {
        height: 13px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(115, 180, 255, 0.22);
        overflow: hidden;
        box-shadow: inset 0 0 14px rgba(0, 0, 0, 0.44);
      }

      .playtalk-loader__fill {
        height: 100%;
        width: 45%;
        border-radius: inherit;
        background: linear-gradient(90deg, #18c8ff, #8deeff, #2d66ff);
        box-shadow: 0 0 22px rgba(24, 200, 255, 0.72);
        animation: playtalk-loader-fill 2.8s ease-in-out infinite;
      }

      @keyframes playtalk-loader-float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-8px); }
      }

      @keyframes playtalk-loader-dot {
        0%, 80%, 100% { opacity: 0.25; transform: translateY(0); }
        40% { opacity: 1; transform: translateY(-3px); }
      }

      @keyframes playtalk-loader-fill {
        0% { width: 8%; transform: translateX(-20%); }
        55% { width: 78%; transform: translateX(0); }
        100% { width: 100%; transform: translateX(15%); }
      }

      @keyframes playtalk-loader-pulse {
        0% { opacity: 0.65; transform: translate(-50%, -54%) scale(0.72); }
        100% { opacity: 0; transform: translate(-50%, -54%) scale(1.28); }
      }
    `;
    document.head.appendChild(style);
  }

  function loaderMarkup() {
    return `
      <div class="playtalk-loader__screen" aria-live="polite">
        <div class="playtalk-loader__pulse" aria-hidden="true"></div>
        <div class="playtalk-loader__logo-wrap" aria-label="Fluent Level Up logo">
          <svg class="playtalk-loader__logo" viewBox="0 0 120 120" role="img" aria-label="Fluent Level Up">
            <defs>
              <linearGradient id="playtalkLoaderGradient" x1="12" y1="14" x2="102" y2="106" gradientUnits="userSpaceOnUse">
                <stop offset="0" stop-color="#bdf5ff"></stop>
                <stop offset="0.26" stop-color="#27d5ff"></stop>
                <stop offset="0.64" stop-color="#2477ff"></stop>
                <stop offset="1" stop-color="#7a5cff"></stop>
              </linearGradient>
              <filter id="playtalkLoaderNeon" x="-80%" y="-80%" width="260%" height="260%">
                <feGaussianBlur stdDeviation="3.4" result="blur1"></feGaussianBlur>
                <feGaussianBlur stdDeviation="8" result="blur2"></feGaussianBlur>
                <feMerge>
                  <feMergeNode in="blur2"></feMergeNode>
                  <feMergeNode in="blur1"></feMergeNode>
                  <feMergeNode in="SourceGraphic"></feMergeNode>
                </feMerge>
              </filter>
            </defs>
            <path filter="url(#playtalkLoaderNeon)" fill="url(#playtalkLoaderGradient)" d="M30 23 L91 8 L82 28 L54 35 L50 47 L75 47 L68 63 L45 63 L40 79 L64 71 L57 91 L22 106 L32 72 L18 72 L23 56 L37 56 L41 43 L26 47 Z"></path>
            <path fill="rgba(255,255,255,0.75)" d="M38 29 L78 19 L74 27 L48 34 Z"></path>
            <path fill="rgba(255,255,255,0.42)" d="M47 50 L69 50 L66 57 L44 57 Z"></path>
          </svg>
        </div>
        <div class="playtalk-loader__brand">FLUENT</div>
        <div class="playtalk-loader__sub">LEVEL UP</div>
        <div class="playtalk-loader__kicker">Dica de fluencia</div>
        <div class="playtalk-loader__tip" id="playtalkLoaderTip">
          <span class="playtalk-loader__tip-line"></span>
          <span class="playtalk-loader__tip-line"></span>
        </div>
        <div class="playtalk-loader__meta" id="playtalkLoaderMeta" hidden></div>
        <section class="playtalk-loader__progress" aria-label="Carregando">
          <div class="playtalk-loader__progress-head">
            <span class="playtalk-loader__message" id="playtalkLoaderMessage"></span>
            <span class="playtalk-loader__dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span>
          </div>
          <div class="playtalk-loader__bar"><div class="playtalk-loader__fill"></div></div>
        </section>
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
    renderLoaderTip();
    renderLoader();
    return root;
  }

  function renderLoaderTip() {
    const tip = LOADER_TIPS[loaderState.tipIndex % LOADER_TIPS.length] || LOADER_TIPS[0];
    const root = document.getElementById(LOADER_ROOT_ID);
    if (!root) return;
    const lines = root.querySelectorAll('.playtalk-loader__tip-line');
    if (lines[0]) lines[0].textContent = tip[0] || '';
    if (lines[1]) lines[1].textContent = tip[1] || '';
  }

  function renderLoader() {
    const root = ensureLoader();
    const visible = loaderState.activeKeys.size > 0;
    const message = String(loaderState.message || 'Preparando sua jornada').trim() || 'Preparando sua jornada';
    const messageEl = root.querySelector('#playtalkLoaderMessage');
    const metaEl = root.querySelector('#playtalkLoaderMeta');
    if (messageEl) {
      messageEl.textContent = message;
    }
    if (metaEl) {
      const safeItems = Array.isArray(loaderState.metaItems) ? loaderState.metaItems.filter(Boolean) : [];
      metaEl.hidden = safeItems.length === 0;
      metaEl.innerHTML = safeItems.map((item) => {
        const icon = String(item?.icon || '').trim();
        const value = String(item?.value || '').trim();
        if (!value) return '';
        return `<div class="playtalk-loader__meta-row">${icon}${value}</div>`;
      }).join('');
    }
    root.hidden = !visible;
    root.classList.toggle('is-visible', visible);
    root.setAttribute('aria-hidden', visible ? 'false' : 'true');
    document.body.classList.toggle(LOADER_BODY_CLASS, visible);
  }

  function startLoaderTips() {
    if (loaderState.tipTimer) return;
    loaderState.tipTimer = window.setInterval(() => {
      loaderState.tipIndex = (loaderState.tipIndex + 1) % LOADER_TIPS.length;
      renderLoaderTip();
    }, 4000);
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

  function showLoader(key, options) {
    const normalizedKey = normalizeLoaderKey(key);
    const nextOptions = options && typeof options === 'object' ? options : {};
    if (nextOptions.message) {
      loaderState.message = String(nextOptions.message);
    }
    if (Array.isArray(nextOptions.metaItems)) {
      loaderState.metaItems = nextOptions.metaItems;
    } else if (nextOptions.clearMeta) {
      loaderState.metaItems = [];
    }
    clearHideTimer(normalizedKey);
    if (!loaderState.activeKeys.has(normalizedKey)) {
      loaderState.shownAtByKey.set(normalizedKey, Date.now());
    }
    loaderState.activeKeys.add(normalizedKey);
    renderLoader();
    startLoaderTips();
  }

  function hideLoader(key) {
    const normalizedKey = normalizeLoaderKey(key);
    const shownAt = loaderState.shownAtByKey.get(normalizedKey) || 0;
    const elapsed = shownAt ? (Date.now() - shownAt) : LOADER_MIN_VISIBLE_MS;
    const remaining = Math.max(0, LOADER_MIN_VISIBLE_MS - elapsed);
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

  function setLoaderMessage(message) {
    loaderState.message = String(message || 'Preparando sua jornada');
    renderLoader();
  }

  function setLoaderMeta(metaItems) {
    loaderState.metaItems = Array.isArray(metaItems) ? metaItems : [];
    renderLoader();
  }

  function resetLoader() {
    loaderState.hideTimerByKey.forEach((timerId) => {
      window.clearTimeout(timerId);
    });
    loaderState.hideTimerByKey.clear();
    loaderState.activeKeys.clear();
    loaderState.shownAtByKey.clear();
    loaderState.metaItems = [];
    renderLoader();
  }

  window.PlaytalkLoader = {
    ensure: ensureLoader,
    show: showLoader,
    hide: hideLoader,
    setMessage: setLoaderMessage,
    setMeta: setLoaderMeta,
    reset: resetLoader,
    isVisible(key) {
      if (key == null) return loaderState.activeKeys.size > 0;
      return loaderState.activeKeys.has(normalizeLoaderKey(key));
    }
  };

  injectStars();
  injectFooter();
  ensureLoader();
  startLoaderTips();
  if (loaderPages.has(path)) {
    showLoader('page-init', { message: 'Preparando sua jornada' });
  }
})();
