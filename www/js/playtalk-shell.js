(function initPlaytalkShell() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  const starPages = new Set(['/flashcards', '/allcards', '/speaking', '/users', '/account', '/premium']);
  const footerPages = new Set(['/play', '/flashcards', '/allcards', '/users', '/account', '/books']);
  const loaderPages = new Set(['/play', '/flashcards', '/books', '/allcards']);
  const LOADER_ROOT_ID = 'playtalkGlobalLoader';
  const LOADER_STYLE_ID = 'playtalkGlobalLoaderStyles';
  const LOADER_BODY_CLASS = 'playtalk-loader-active';
  const LOADER_MIN_VISIBLE_MS = 9000;
  const USERS_LOADER_MAX_VISIBLE_MS = 4200;
  const LOADER_AUDIO_BASE_URL = 'https://pub-1208463a3c774431bf7e0ddcbd3cf670.r2.dev';
  const LOADER_AUDIO_PATHS = {
    pt: `${LOADER_AUDIO_BASE_URL}/Niveis/114/001`,
    en: `${LOADER_AUDIO_BASE_URL}/Niveis/154/001`
  };
  const LOADER_BG_MUSIC_URL = '/audio/load.mp3';
  const LOADER_TIP_AUDIO_VOLUME = 0.56;
  const LOADER_TIP_AUDIO_FADE_MS = 1500;
  const LOADER_FINAL_DISSOLVE_MS = 500;
  const LOADER_TIPS = [
    ['Fluência é construída uma frase de cada vez', 'Fluency is built one phrase at a time'],
    ['Sessões curtas. Evolução gigantesca', 'Small sessions. Massive evolution.'],
    ['Seus ouvidos aprendem antes da sua boca', 'Your ears learn before your mouth'],
    ['Consistência vence intensidade', 'Consistency beats intensity'],
    ['Escute primeiro. Fale naturalmente depois', 'Listen first. Speak naturally later'],
    ['Inglês é ritmo, não tradução', 'English is rhythm, not translation'],
    ['Mais um card. Mais um passo forte', 'One more card. One step stronger'],
    ['Seu cérebro está se adaptando agora', 'Your brain is adapting right now'],
    ['Repetição cria fala automática', 'Repetition creates automatic speech'],
    ['Fluência real parece sem esforço', 'Real fluency feels effortless'],
    ['Pense menos. Absorva mais', 'Think less. Absorb more'],
    ['Seu sotaque melhora com coragem', 'Your accent improves with courage'],
    ['Entender importa mais que perfeição', 'Understanding matters more than perfection'],
    ['Bebês também aprendem por exposição', 'Babies learn by exposure too'],
    ['Prática curta. Resultados de longo prazo', 'Short practice. Long-term results'],
    ['Cada erro ensina seu cérebro', 'Every mistake teaches your brain'],
    ['Ouça. Sinta. Repita', 'Hear it. Feel it. Repeat it'],
    ['Fluência cresce em camadas', 'Fluency grows in layers'],
    ['Sua escuta está evoluindo', 'Your listening is leveling up'],
    ['Inglês natural vem da exposição', 'Natural English comes from input'],
    ['Velocidade vem depois da clareza', 'Speed comes after clarity'],
    ['Entender é melhor que decorar', 'Understanding beats memorizing'],
    ['Contato diário muda tudo', 'Daily contact changes everything'],
    ['O idioma está ficando familiar', 'The language is becoming familiar'],
    ['Treine seus ouvidos todos os dias', 'Train your ears every day'],
    ['Pequeno progresso ainda conta', 'Tiny progress still counts'],
    ['Você está criando respostas automáticas', 'You are building automatic responses'],
    ['Inglês fica mais fácil com ritmo', 'English becomes easier with momentum'],
    ['Fluência é um estilo de vida', 'Fluency is a lifestyle'],
    ['Seu cérebro ama padrões', 'Your brain loves patterns'],
    ['Frases reais criam fluência real', 'Real phrases create real fluency'],
    ['Imersão muda seus instintos', 'Immersion changes your instincts'],
    ['Confiança cresce através da repetição', 'Confidence grows through repetition'],
    ['Prática transforma confusão em instinto', 'Practice turns confusion into instinct'],
    ['Continue aparecendo todos os dias', 'Keep showing up every day'],
    ['Aprenda naturalmente, como na vida real', 'Learn naturally, like real life'],
    ['Inglês começa a soar previsível', 'English starts sounding predictable'],
    ['Você está mais perto do que imagina', 'You are closer than you think'],
    ['Treine diariamente. Fale livremente depois', 'Train daily. Speak freely later'],
    ['Seu eu do futuro fala inglês', 'Your future self speaks English']
  ];
  const loaderState = {
    activeKeys: new Set(),
    shownAtByKey: new Map(),
    hideTimerByKey: new Map(),
    message: 'PREPARANDO SUA PARTIDA',
    metaItems: [],
    tipIndex: 0,
    lastTipIndex: -1,
    tipTimer: 0,
    rotateTips: true,
    progressRaf: 0,
    tipLanguage: 'pt',
    tipAudio: null,
    bgAudio: null,
    tipAudioToken: 0,
    tipAdvanceTimer: 0,
    audioSequenceRunning: false,
    tipFadeStartTimer: 0,
    tipFadeInterval: 0,
    pendingAudioCycleResolvers: []
  };

  function injectStars() {
    if (!starPages.has(path)) return;
    return;
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
        font-family: "Exo 2", "Segoe UI", sans-serif;
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
        font-family: "Exo 2", "Segoe UI", sans-serif;
        font-size: clamp(21.6px, 5.76vw, 28.8px);
        line-height: 1.15;
        font-weight: 700;
        letter-spacing: 0.01em;
        text-transform: none;
        text-shadow: 0 0 20px rgba(255, 255, 255, 0.12);
      }

      .playtalk-loader__tip-line {
        display: block;
        color: #ffffff;
        opacity: 1;
        transform: none;
      }

      .playtalk-loader__tip-line:last-child {
        color: #33d6ff;
        text-shadow:
          0 0 8px rgba(51, 214, 255, 0.75),
          0 0 16px rgba(51, 214, 255, 0.45);
      }

      .playtalk-loader__screen.is-dissolving {
        opacity: 0;
        transform: scale(0.992);
        transition: opacity ${LOADER_FINAL_DISSOLVE_MS}ms ease, transform ${LOADER_FINAL_DISSOLVE_MS}ms ease;
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
        width: 0%;
        border-radius: inherit;
        background: linear-gradient(90deg, #18c8ff, #8deeff, #2d66ff);
        box-shadow: 0 0 22px rgba(24, 200, 255, 0.72);
        transition: width 120ms linear;
      }

      @keyframes playtalk-loader-float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-8px); }
      }

      @keyframes playtalk-loader-dot {
        0%, 80%, 100% { opacity: 0.25; transform: translateY(0); }
        40% { opacity: 1; transform: translateY(-3px); }
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
        <div class="playtalk-loader__kicker">DICA DE FLUÊNCIA</div>
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

  function splitTipTextBalanced(text) {
    const clean = String(text || '').replace(/\s+/g, ' ').trim();
    if (!clean) return ['', ''];
    const words = clean.split(' ');
    if (words.length <= 2) return [clean, ''];
    const target = Math.floor(clean.length / 2);
    let bestIndex = 1;
    let bestDelta = Number.POSITIVE_INFINITY;
    let prefixLength = words[0].length;
    for (let i = 1; i < words.length; i += 1) {
      const delta = Math.abs(prefixLength - target);
      if (delta < bestDelta) {
        bestDelta = delta;
        bestIndex = i;
      }
      prefixLength += 1 + words[i].length;
    }
    const top = words.slice(0, bestIndex).join(' ').trim();
    const bottom = words.slice(bestIndex).join(' ').trim();
    return [top, bottom];
  }

  function renderLoaderTip() {
    const tip = LOADER_TIPS[loaderState.tipIndex % LOADER_TIPS.length] || LOADER_TIPS[0];
    const root = document.getElementById(LOADER_ROOT_ID);
    if (!root) return;
    const lines = root.querySelectorAll('.playtalk-loader__tip-line');
    if (lines[0]) lines[0].textContent = tip[0] || '';
    if (lines[1]) lines[1].textContent = tip[1] || '';
  }

  function renderLoaderTipForLanguage(language) {
    const tip = LOADER_TIPS[loaderState.tipIndex % LOADER_TIPS.length] || LOADER_TIPS[0];
    const root = document.getElementById(LOADER_ROOT_ID);
    if (!root) return;
    const lines = root.querySelectorAll('.playtalk-loader__tip-line');
    const normalizedLanguage = language === 'en' ? 'en' : 'pt';
    if (normalizedLanguage === 'pt') {
      if (lines[0]) lines[0].textContent = tip[0] || '';
      if (lines[1]) lines[1].textContent = '';
      return;
    }
    if (lines[0]) lines[0].textContent = '';
    if (lines[1]) lines[1].textContent = tip[1] || '';
  }

  function resolvePendingAudioCycleWaiters() {
    const waiters = Array.isArray(loaderState.pendingAudioCycleResolvers)
      ? loaderState.pendingAudioCycleResolvers.splice(0)
      : [];
    waiters.forEach((resolve) => {
      try {
        resolve();
      } catch (_error) {
        // ignore
      }
    });
  }

  function stopLoaderAdvanceTimer() {
    if (!loaderState.tipAdvanceTimer) return;
    window.clearTimeout(loaderState.tipAdvanceTimer);
    loaderState.tipAdvanceTimer = 0;
  }

  function stopLoaderAudio() {
    loaderState.audioSequenceRunning = false;
    loaderState.tipAudioToken += 1;
    stopLoaderAdvanceTimer();
    if (loaderState.tipFadeStartTimer) {
      window.clearTimeout(loaderState.tipFadeStartTimer);
      loaderState.tipFadeStartTimer = 0;
    }
    if (loaderState.tipFadeInterval) {
      window.clearInterval(loaderState.tipFadeInterval);
      loaderState.tipFadeInterval = 0;
    }
    if (loaderState.tipAudio) {
      loaderState.tipAudio.pause();
      loaderState.tipAudio.currentTime = 0;
      loaderState.tipAudio = null;
    }
    if (loaderState.bgAudio) {
      loaderState.bgAudio.pause();
      loaderState.bgAudio.currentTime = 0;
      loaderState.bgAudio = null;
    }
    resolvePendingAudioCycleWaiters();
  }

  function loaderTipAudioUrl(index, language) {
    const safeIndex = Math.max(1, (Number(index) || 0) + 1);
    const fileId = String(safeIndex).padStart(3, '0');
    if (language === 'en') return `${LOADER_AUDIO_PATHS.en}/acts-flashcard-item-${fileId}.mp3`;
    return `${LOADER_AUDIO_PATHS.pt}/bandeiras-flashcard-item-${fileId}.mp3`;
  }

  function loaderTipAudioCandidates(index, language) {
    const safeIndex = Math.max(1, (Number(index) || 0) + 1);
    const fileId3 = String(safeIndex).padStart(3, '0');
    const legacyEvenFile = String(safeIndex * 2).padStart(6, '0');
    if (language === 'en') {
      return [
        `${LOADER_AUDIO_PATHS.en}/acts-flashcard-item-${fileId3}.mp3`,
        `${LOADER_AUDIO_PATHS.en}/${legacyEvenFile}.mp3`
      ];
    }
    return [
      `${LOADER_AUDIO_PATHS.pt}/bandeiras-flashcard-item-${fileId3}.mp3`,
      `${LOADER_AUDIO_PATHS.pt}/${legacyEvenFile}.mp3`
    ];
  }

  function preloadAudioUrl(url) {
    if (!url) return;
    try {
      const audio = new Audio(url);
      audio.preload = 'auto';
      audio.load();
    } catch (_error) {
      // ignore
    }
  }

  function pickNextTipIndexRandom() {
    if (LOADER_TIPS.length <= 1) return 0;
    let nextIndex = loaderState.tipIndex;
    while (nextIndex === loaderState.tipIndex) {
      nextIndex = Math.floor(Math.random() * LOADER_TIPS.length);
    }
    return nextIndex;
  }

  function ensureLoaderBackgroundMusic() {
    if (loaderState.bgAudio) return loaderState.bgAudio;
    const bgAudio = new Audio(LOADER_BG_MUSIC_URL);
    bgAudio.preload = 'auto';
    bgAudio.loop = true;
    bgAudio.volume = 0.22;
    loaderState.bgAudio = bgAudio;
    return bgAudio;
  }

  function preloadLoaderAudioBuffer() {
    preloadAudioUrl(LOADER_BG_MUSIC_URL);
    const tipCount = LOADER_TIPS.length;
    if (!tipCount) return;
    for (let offset = 0; offset <= 4; offset += 1) {
      const targetIndex = (loaderState.tipIndex + offset) % tipCount;
      const ptCandidates = loaderTipAudioCandidates(targetIndex, 'pt');
      const enCandidates = loaderTipAudioCandidates(targetIndex, 'en');
      preloadAudioUrl(ptCandidates[0]);
      preloadAudioUrl(enCandidates[0]);
    }
  }

  function playLoaderBackgroundMusic() {
    const bgAudio = ensureLoaderBackgroundMusic();
    if (!bgAudio.paused) return;
    bgAudio.play().catch(() => {});
  }

  function fadeOutLoaderBackgroundMusic(durationMs = LOADER_FINAL_DISSOLVE_MS) {
    const bgAudio = loaderState.bgAudio;
    if (!bgAudio) return;
    const startVolume = Math.max(0, Number(bgAudio.volume) || 0);
    const steps = Math.max(1, Math.round(durationMs / 40));
    let step = 0;
    const timer = window.setInterval(() => {
      step += 1;
      const ratio = Math.max(0, 1 - (step / steps));
      bgAudio.volume = startVolume * ratio;
      if (step >= steps) {
        window.clearInterval(timer);
      }
    }, Math.max(30, Math.floor(durationMs / steps)));
  }

  function dissolveLoaderScreen() {
    const root = document.getElementById(LOADER_ROOT_ID);
    const screen = root?.querySelector('.playtalk-loader__screen');
    if (!screen) return;
    screen.classList.remove('is-dissolving');
    void screen.offsetWidth;
    screen.classList.add('is-dissolving');
  }

  function playLoaderTipLanguage(language, token) {
    if (!loaderState.activeKeys.size) return;
    loaderState.tipLanguage = language === 'en' ? 'en' : 'pt';
    renderLoaderTipForLanguage(loaderState.tipLanguage);
    if (loaderState.tipAudio) {
      loaderState.tipAudio.pause();
      loaderState.tipAudio.currentTime = 0;
      loaderState.tipAudio = null;
    }
    playLoaderBackgroundMusic();
    const candidates = loaderTipAudioCandidates(loaderState.tipIndex, loaderState.tipLanguage);
    if (loaderState.tipFadeStartTimer) {
      window.clearTimeout(loaderState.tipFadeStartTimer);
      loaderState.tipFadeStartTimer = 0;
    }
    if (loaderState.tipFadeInterval) {
      window.clearInterval(loaderState.tipFadeInterval);
      loaderState.tipFadeInterval = 0;
    }
    const onFinish = () => {
      if (token !== loaderState.tipAudioToken || !loaderState.activeKeys.size) return;
      if (loaderState.tipLanguage === 'pt') {
        playLoaderTipLanguage('en', token);
        return;
      }
      dissolveLoaderScreen();
      fadeOutLoaderBackgroundMusic(LOADER_FINAL_DISSOLVE_MS);
      loaderState.audioSequenceRunning = false;
      loaderState.tipIndex = pickNextTipIndexRandom();
      resolvePendingAudioCycleWaiters();
    };
    const scheduleFadeOut = () => {
      if (token !== loaderState.tipAudioToken) return;
      const duration = Number(audio.duration);
      if (!Number.isFinite(duration) || duration <= 0) return;
      const fadeStartMs = Math.max(0, (duration * 1000) - LOADER_TIP_AUDIO_FADE_MS);
      loaderState.tipFadeStartTimer = window.setTimeout(() => {
        if (token !== loaderState.tipAudioToken) return;
        const startVolume = Math.max(0, Number(audio.volume) || 0);
        const steps = 15;
        const intervalMs = Math.max(40, Math.floor(LOADER_TIP_AUDIO_FADE_MS / steps));
        let step = 0;
        loaderState.tipFadeInterval = window.setInterval(() => {
          if (token !== loaderState.tipAudioToken) {
            window.clearInterval(loaderState.tipFadeInterval);
            loaderState.tipFadeInterval = 0;
            return;
          }
          step += 1;
          const ratio = Math.max(0, 1 - (step / steps));
          audio.volume = Math.max(0, startVolume * ratio);
          if (step >= steps) {
            window.clearInterval(loaderState.tipFadeInterval);
            loaderState.tipFadeInterval = 0;
          }
        }, intervalMs);
      }, fadeStartMs);
    };
    const tryPlayCandidate = (candidateIndex) => {
      if (token !== loaderState.tipAudioToken || !loaderState.activeKeys.size) return;
      if (candidateIndex >= candidates.length) {
        onFinish();
        return;
      }
      const audio = new Audio(candidates[candidateIndex]);
      audio.preload = 'auto';
      audio.volume = LOADER_TIP_AUDIO_VOLUME;
      loaderState.tipAudio = audio;
      audio.addEventListener('loadedmetadata', scheduleFadeOut, { once: true });
      audio.addEventListener('ended', onFinish, { once: true });
      audio.addEventListener('error', () => {
        if (token !== loaderState.tipAudioToken) return;
        tryPlayCandidate(candidateIndex + 1);
      }, { once: true });
      audio.play().catch(() => {
        if (token !== loaderState.tipAudioToken) return;
        tryPlayCandidate(candidateIndex + 1);
      });
    };
    tryPlayCandidate(0);
  }

  function startLoaderAudioSequence() {
    if (!loaderState.activeKeys.size) return;
    if (loaderState.audioSequenceRunning) return;
    loaderState.audioSequenceRunning = true;
    loaderState.tipAudioToken += 1;
    const token = loaderState.tipAudioToken;
    renderLoaderTipForLanguage('pt');
    preloadLoaderAudioBuffer();
    playLoaderTipLanguage('pt', token);
  }

  function waitForLoaderAudioCycle(options = {}) {
    const timeoutMs = Math.max(1000, Number(options?.timeoutMs) || 30000);
    if (!loaderState.audioSequenceRunning) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      let resolved = false;
      const done = () => {
        if (resolved) return;
        resolved = true;
        resolve();
      };
      const timer = window.setTimeout(done, timeoutMs);
      loaderState.pendingAudioCycleResolvers.push(() => {
        window.clearTimeout(timer);
        done();
      });
    });
  }

  function renderLoader() {
    const root = ensureLoader();
    const visible = loaderState.activeKeys.size > 0;
    const message = String(loaderState.message || 'PREPARANDO SUA PARTIDA').trim() || 'PREPARANDO SUA PARTIDA';
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
    if (visible) {
      const screen = root.querySelector('.playtalk-loader__screen');
      if (screen) screen.classList.remove('is-dissolving');
      const bgAudio = loaderState.bgAudio;
      if (bgAudio && bgAudio.volume <= 0.001) {
        bgAudio.volume = 0.22;
      }
    }
    document.body.classList.toggle(LOADER_BODY_CLASS, visible);
  }

  function stopLoaderTips() {
    if (!loaderState.tipTimer) return;
    window.clearInterval(loaderState.tipTimer);
    loaderState.tipTimer = 0;
  }

  function updateLoaderProgress() {
    const root = document.getElementById(LOADER_ROOT_ID);
    if (!root) return;
    const fill = root.querySelector('.playtalk-loader__fill');
    if (!fill) return;
    if (!loaderState.activeKeys.size) {
      fill.style.width = '0%';
      return;
    }
    let earliest = Number.POSITIVE_INFINITY;
    loaderState.activeKeys.forEach((key) => {
      const shownAt = loaderState.shownAtByKey.get(key);
      if (shownAt && shownAt < earliest) earliest = shownAt;
    });
    if (!Number.isFinite(earliest)) {
      fill.style.width = '0%';
      return;
    }
    const elapsed = Math.max(0, Date.now() - earliest);
    const progress = Math.max(0, Math.min(100, (elapsed / LOADER_MIN_VISIBLE_MS) * 100));
    fill.style.width = `${progress.toFixed(2)}%`;
  }

  function runLoaderProgressFrame() {
    updateLoaderProgress();
    if (!loaderState.activeKeys.size) {
      loaderState.progressRaf = 0;
      return;
    }
    loaderState.progressRaf = window.requestAnimationFrame(runLoaderProgressFrame);
  }

  function startLoaderProgress() {
    if (loaderState.progressRaf) return;
    runLoaderProgressFrame();
  }

  function stopLoaderProgress() {
    if (!loaderState.progressRaf) return;
    window.cancelAnimationFrame(loaderState.progressRaf);
    loaderState.progressRaf = 0;
    updateLoaderProgress();
  }

  function startLoaderTips(options = {}) {
    const rotate = options.rotate !== false;
    stopLoaderTips();
    loaderState.rotateTips = rotate;
    loaderState.tipIndex = pickNextTipIndexRandom();
    loaderState.lastTipIndex = loaderState.tipIndex;
    loaderState.tipLanguage = 'pt';
    renderLoaderTip();
    startLoaderAudioSequence();
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
    const wasInactive = loaderState.activeKeys.size === 0;
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
    startLoaderProgress();
    if (wasInactive) {
      startLoaderTips({ rotate: nextOptions.rotateTips !== false });
    }
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
        if (!loaderState.activeKeys.size) {
          stopLoaderTips();
          stopLoaderProgress();
          stopLoaderAudio();
        }
        renderLoader();
      }, remaining);
      loaderState.hideTimerByKey.set(normalizedKey, timerId);
      return;
    }
    loaderState.activeKeys.delete(normalizedKey);
    loaderState.shownAtByKey.delete(normalizedKey);
    if (!loaderState.activeKeys.size) {
      stopLoaderTips();
      stopLoaderProgress();
      stopLoaderAudio();
    }
    renderLoader();
  }

  function setLoaderMessage(message) {
    loaderState.message = String(message || 'PREPARANDO SUA PARTIDA');
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
    stopLoaderTips();
    stopLoaderProgress();
    stopLoaderAudio();
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
      showLoader('nav-users', { message: 'PREPARANDO SUA PARTIDA', rotateTips: false, clearMeta: true });
      return;
    }
    if (isFlashWelcome) {
      showLoader('welcome-flash-start', { message: 'PREPARANDO SUA PARTIDA', rotateTips: false, clearMeta: true });
    }
  }, true);
  if (loaderPages.has(path)) {
    showLoader('page-init', { message: 'PREPARANDO SUA PARTIDA', rotateTips: path !== '/users' });
    if (path === '/users') {
      window.setTimeout(forceHideUsersLoader, USERS_LOADER_MAX_VISIBLE_MS);
    }
  }
})();
