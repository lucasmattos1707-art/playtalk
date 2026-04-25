(function initPlaytalkEnergyManager() {
  const DAILY_FREE_ENERGY = 5000;
  const ENERGY_EXHAUSTED_STATUS = 402;
  const ENERGY_GATE_PREVIEW_MS = 1000;
  const ENERGY_DEPLETION_EXIT_MS = 2000;
  const ENERGY_DEPLETION_WATCH_MS = 5000;
  const ENERGY_GATE_LOG_LINES = [
    'Volte amanhã para treinar mais!',
    'ou continue com energias infinitas'
  ];
  const ENERGY_GATE_STATUS_STORE = 'playtalk-energy-gate-status';
  const ENERGY_GATE_PENDING_STORE = 'playtalk-energy-gate-pending';
  const ENERGY_GATE_STATIC_COPY = 'Mais energias em:';
  const ENERGY_GATE_MODE_DEFAULT = 'default';
  const ENERGY_GATE_MODE_DEPLETION = 'depletion';
  let energyGateTimer = 0;
  let energyGateCountdownTimer = 0;
  let energyGateLoglineIndex = 0;
  let latestEnergyGateStatus = null;
  let energyDepletionExitInFlight = false;
  let energyDepletionScreenVisible = false;

  function rememberEnergyStatus(status = null) {
    if (!status || typeof status !== 'object') return null;
    latestEnergyGateStatus = {
      ...status
    };
    return latestEnergyGateStatus;
  }

  function readRememberedEnergyStatus(user = null) {
    if (!latestEnergyGateStatus || typeof latestEnergyGateStatus !== 'object') {
      return null;
    }
    if (!user?.id && !latestEnergyGateStatus.loggedIn) {
      return null;
    }
    return {
      ...latestEnergyGateStatus,
      loggedIn: Boolean(user?.id || latestEnergyGateStatus.loggedIn)
    };
  }

  function safeNumber(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function isPremiumActive(user) {
    if (!user || typeof user !== 'object') return false;
    if (Boolean(user.premiumFullAccess || user.premium_full_access)) return true;
    const premiumUntilMs = Date.parse(user.premiumUntil || user.premium_until || '');
    return Number.isFinite(premiumUntilMs) && premiumUntilMs > Date.now();
  }

  function formatResetCountdown(nextResetAt) {
    const targetMs = resolveEnergyResetTargetMs(nextResetAt);
    const diffMs = Math.max(0, (Number.isFinite(targetMs) ? targetMs : Date.now()) - Date.now());
    const totalMinutes = Math.ceil(diffMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}min`;
  }

  function formatResetCountdownDetailed(nextResetAt) {
    const targetMs = resolveEnergyResetTargetMs(nextResetAt);
    const diffMs = Math.max(0, (Number.isFinite(targetMs) ? targetMs : Date.now()) - Date.now());
    const totalSeconds = Math.ceil(diffMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
  }

  function formatResetCountdownClock(nextResetAt) {
    const targetMs = resolveEnergyResetTargetMs(nextResetAt);
    const diffMs = Math.max(0, (Number.isFinite(targetMs) ? targetMs : Date.now()) - Date.now());
    const totalSeconds = Math.ceil(diffMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours}:${String(minutes).padStart(2, '0')}`;
  }

  function resolveEnergyResetTargetMs(nextResetAt) {
    const parsedMs = Date.parse(nextResetAt || '');
    if (Number.isFinite(parsedMs)) {
      return parsedMs;
    }
    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setHours(24, 0, 0, 0);
    return nextMidnight.getTime();
  }

  function resolveAccountHref() {
    if (window.PlaytalkNative && typeof window.PlaytalkNative.resolveRouteHref === 'function') {
      return window.PlaytalkNative.resolveRouteHref('/account');
    }
    return '/account';
  }

  function resolvePremiumHref() {
    if (window.PlaytalkNative && typeof window.PlaytalkNative.resolveRouteHref === 'function') {
      return window.PlaytalkNative.resolveRouteHref('/premium');
    }
    return '/premium';
  }

  function resolveHomeHref() {
    if (window.PlaytalkNative && typeof window.PlaytalkNative.resolveRouteHref === 'function') {
      return window.PlaytalkNative.resolveRouteHref('/home');
    }
    return '/home';
  }

  function resolveFlashcardsEnergyHref() {
    const path = '/flashcards?energy=empty';
    if (window.PlaytalkNative && typeof window.PlaytalkNative.resolveRouteHref === 'function') {
      return window.PlaytalkNative.resolveRouteHref(path);
    }
    return path;
  }

  function resolveFlashcardsWelcomeHref() {
    const path = '/flashcards';
    if (window.PlaytalkNative && typeof window.PlaytalkNative.resolveRouteHref === 'function') {
      return window.PlaytalkNative.resolveRouteHref(path);
    }
    return path;
  }

  function isFlashcardsRoute() {
    const path = String(window.location?.pathname || '').toLowerCase();
    return path === '/flashcards' || path.endsWith('/flashcards.html');
  }

  function injectEnergyGateStyles() {
    if (document.getElementById('playtalk-energy-gate-style')) return;
    const style = document.createElement('style');
    style.id = 'playtalk-energy-gate-style';
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Exo+2:wght@300;700&display=swap');

      @font-face {
        font-family: "Soopafre";
        src: url("/soopafre.ttf") format("truetype");
        font-weight: 400;
        font-style: normal;
        font-display: swap;
      }

      @font-face {
        font-family: "TheBoldFont";
        src: url("/THEBOLDFONT-FREEVERSION.otf") format("opentype");
        font-weight: 700;
        font-style: normal;
        font-display: swap;
      }

      @font-face {
        font-family: "PlaytalkDisplay";
        src: url("/playtalk.otf") format("opentype");
        font-weight: 400;
        font-style: normal;
        font-display: swap;
      }

      .playtalk-energy-gate,
      body > .playtalk-energy-gate,
      body > #playtalkEnergyGate {
        --playtalk-global-bg-desktop: url('/api/r2-media/backgrounds/playtalk-global-desktop.webp');
        --playtalk-global-bg-mobile: url('/api/r2-media/backgrounds/playtalk-global-mobile.webp');
        --playtalk-global-bg-image: var(--playtalk-global-bg-desktop);
        --playtalk-global-bg-overlay: linear-gradient(to top, rgba(4, 18, 38, 0.82) 0%, rgba(4, 18, 38, 0.4) 44%, rgba(4, 18, 38, 0.12) 100%);
        position: fixed;
        inset: 0;
        z-index: 2147483647;
        display: none;
        width: 100vw;
        height: 100dvh;
        background: #041226 var(--playtalk-global-bg-image) center/cover no-repeat fixed;
        color: #ffffff;
        font-family: "Soopafre", "PlaytalkDisplay", Arial, sans-serif;
        overflow: hidden;
      }

      @media (max-width: 800px) {
        .playtalk-energy-gate,
        body > .playtalk-energy-gate,
        body > #playtalkEnergyGate {
          --playtalk-global-bg-image: var(--playtalk-global-bg-mobile);
        }
      }

      .playtalk-energy-gate::before,
      body > .playtalk-energy-gate::before,
      body > #playtalkEnergyGate::before {
        content: "";
        position: absolute;
        inset: 0;
        background: var(--playtalk-global-bg-overlay);
        z-index: 0;
      }

      .playtalk-energy-gate.is-visible,
      body > .playtalk-energy-gate.is-visible,
      body > #playtalkEnergyGate.is-visible {
        display: grid;
        place-items: center;
      }

      body.playtalk-energy-gate-open {
        overflow: hidden !important;
      }

      .playtalk-energy-gate__close {
        position: fixed;
        top: max(18px, env(safe-area-inset-top, 0px) + 12px);
        right: 18px;
        z-index: 2;
        width: 48px;
        height: 48px;
        border: 1px solid rgba(255, 255, 255, 0.38);
        border-radius: 50%;
        background: rgba(4, 32, 110, 0.58);
        color: #ffffff;
        display: grid;
        place-items: center;
        box-shadow: 0 12px 28px rgba(0, 0, 0, 0.22);
        cursor: pointer;
      }

      .playtalk-energy-gate__nav {
        position: fixed;
        top: max(18px, env(safe-area-inset-top, 0px) + 12px);
        right: 18px;
        z-index: 2;
        width: 48px;
        height: 48px;
        border: 1px solid rgba(255, 255, 255, 0.38);
        border-radius: 50%;
        background: rgba(4, 32, 110, 0.58);
        color: #ffffff;
        display: none;
        place-items: center;
        box-shadow: 0 12px 28px rgba(0, 0, 0, 0.22);
        cursor: pointer;
      }

      .playtalk-energy-gate__close svg,
      .playtalk-energy-gate__nav svg {
        width: 25px;
        height: 25px;
        fill: currentColor;
      }

      .playtalk-energy-gate__content {
        position: relative;
        z-index: 1;
        width: min(92vw, 620px);
        display: grid;
        justify-items: center;
        justify-content: center;
        align-content: center;
        place-self: center;
        justify-self: center;
        text-align: center;
        gap: clamp(14px, 2.6vh, 24px);
        padding: 18px 16px 32px;
        margin: 0 auto;
        visibility: visible;
        opacity: 1;
      }

      .playtalk-energy-gate__title {
        margin: 0;
        display: grid;
        gap: 2px;
        font-family: "Exo 2", "Segoe UI", Arial, sans-serif;
        font-size: clamp(33px, 8.4vw, 66px);
        font-weight: 700;
        line-height: 0.92;
        transform: translateY(-10px);
        text-shadow:
          0 3px 0 rgba(5, 48, 138, 0.98),
          0 14px 30px rgba(0, 0, 0, 0.28);
      }

      .playtalk-energy-gate__title span {
        display: block;
      }

      .playtalk-energy-gate.is-depletion-screen .playtalk-energy-gate__content {
        width: min(92vw, 460px);
        gap: clamp(14px, 2.3vh, 20px);
        padding: 18px 18px 36px;
      }

      .playtalk-energy-gate.is-depletion-screen .playtalk-energy-gate__title {
        gap: 6px;
        transform: none;
        font-family: "Exo 2", "Segoe UI", Arial, sans-serif;
        font-size: clamp(28px, 6.8vw, 42px);
        font-weight: 700;
        line-height: 1.08;
        text-shadow: 0 8px 24px rgba(0, 0, 0, 0.22);
      }

      .playtalk-energy-gate__star {
        width: min(27vw, 27vh, 238px);
        height: min(27vw, 27vh, 238px);
        object-fit: contain;
        filter:
          drop-shadow(0 10px 24px rgba(0, 0, 0, 0.28))
          drop-shadow(0 0 18px rgba(255, 226, 112, 0.42));
      }

      .playtalk-energy-gate.is-depletion-screen .playtalk-energy-gate__star {
        width: min(37vw, 32vh, 174px);
        height: min(37vw, 32vh, 174px);
      }

      .playtalk-energy-gate__logline {
        min-height: 1.2em;
        margin: 0;
        display: block;
        width: 100%;
        font-family: "Exo 2", "Segoe UI", Arial, sans-serif;
        font-weight: 300;
        font-size: clamp(24px, 6.2vw, 42px);
        line-height: 1;
        white-space: nowrap;
        text-shadow: 0 8px 20px rgba(0, 0, 0, 0.24);
        opacity: 1;
        transform: translateY(0);
      }

      .playtalk-energy-gate.is-depletion-screen .playtalk-energy-gate__logline {
        display: none;
      }

      .playtalk-energy-gate__countdown {
        margin: 0;
        min-width: min(90vw, 430px);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        padding: 14px 18px 12px;
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.35);
        background: rgba(3, 30, 103, 0.42);
        font-family: "Exo 2", "Segoe UI", Arial, sans-serif;
        font-size: clamp(25px, 6.4vw, 48px);
        font-weight: 700;
        line-height: 1;
        box-shadow:
          inset 0 0 18px rgba(255, 255, 255, 0.08),
          0 14px 34px rgba(0, 0, 0, 0.2);
      }

      .playtalk-energy-gate.is-depletion-screen .playtalk-energy-gate__countdown {
        min-width: 0;
        padding: 0;
        border: 0 !important;
        outline: none !important;
        box-sizing: border-box;
        border-radius: 0;
        background: transparent !important;
        box-shadow: none !important;
        flex-direction: column;
        align-items: center;
        gap: 0;
        font-family: "Exo 2", "Segoe UI", Arial, sans-serif;
        font-weight: 300;
        line-height: 1.15;
      }

      .playtalk-energy-gate__countdown-icon {
        width: clamp(24px, 5vw, 38px);
        height: clamp(24px, 5vw, 38px);
        object-fit: contain;
        filter: brightness(0) invert(1);
        flex: 0 0 auto;
      }

      .playtalk-energy-gate.is-depletion-screen .playtalk-energy-gate__countdown-icon {
        display: none;
      }

      .playtalk-energy-gate__countdown-label {
        display: none;
      }

      .playtalk-energy-gate__countdown-value {
        display: inline-block;
        min-width: 7.4em;
        text-align: center;
      }

      .playtalk-energy-gate__loader {
        display: none;
      }

      .playtalk-energy-gate.is-depletion-screen .playtalk-energy-gate__countdown-label {
        display: block;
        font-size: clamp(34px, 8.5vw, 48px);
        font-family: "Exo 2", "Segoe UI", Arial, sans-serif;
        font-weight: 300;
        line-height: 0.96;
        white-space: normal;
        color: rgba(255, 255, 255, 0.96);
        margin-bottom: 2px;
      }

      .playtalk-energy-gate.is-depletion-screen .playtalk-energy-gate__countdown-label span {
        display: block;
      }

      .playtalk-energy-gate.is-depletion-screen .playtalk-energy-gate__loader {
        width: 65px;
        height: 65px;
        display: block;
        margin: 0 0 6px;
        border: 8px solid rgba(238, 155, 0, 0.65);
        border-radius: 50px;
        position: relative;
      }

      .playtalk-energy-gate.is-depletion-screen .playtalk-energy-gate__loader span {
        display: block;
        background: #ee9b00;
      }

      .playtalk-energy-gate.is-depletion-screen .playtalk-energy-gate__loader-hour,
      .playtalk-energy-gate.is-depletion-screen .playtalk-energy-gate__loader-min {
        width: 6px;
        height: 22px;
        border-radius: 50px;
        position: absolute;
        top: 24.5px;
        left: 21px;
        animation: playtalkEnergyGateClockSpin 1.2s linear infinite;
        transform-origin: top center;
      }

      .playtalk-energy-gate.is-depletion-screen .playtalk-energy-gate__loader-min {
        height: 17px;
        animation-duration: 4s;
      }

      .playtalk-energy-gate.is-depletion-screen .playtalk-energy-gate__loader-circle {
        width: 10px;
        height: 10px;
        border-radius: 50px;
        position: absolute;
        top: 19px;
        left: 19px;
      }

      @keyframes playtalkEnergyGateClockSpin {
        0% {
          transform: rotate(0deg);
        }

        100% {
          transform: rotate(360deg);
        }
      }

      .playtalk-energy-gate.is-depletion-screen .playtalk-energy-gate__countdown-value {
        min-width: 0;
        font-family: "Exo 2", "Segoe UI", Arial, sans-serif;
        font-size: clamp(30px, 8vw, 52px);
        font-weight: 700;
        font-variant-numeric: tabular-nums;
        letter-spacing: 0.04em;
        line-height: 1;
        text-shadow: none;
      }

      .playtalk-energy-gate__premium {
        min-height: 62px;
        padding: 0 28px;
        border: 0;
        border-radius: 999px;
        background: linear-gradient(180deg, #c084fc 0%, #9333ea 52%, #6b21c8 100%);
        color: #ffffff;
        font-family: "Exo 2", "Segoe UI", Arial, sans-serif;
        font-size: clamp(20px, 4.6vw, 32px);
        font-weight: 700;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        box-shadow:
          0 0 24px rgba(192, 132, 252, 0.42),
          0 16px 34px rgba(0, 0, 0, 0.24);
        cursor: pointer;
      }

      .playtalk-energy-gate.is-depletion-screen .playtalk-energy-gate__premium {
        min-height: 58px;
        width: min(90vw, 320px);
        padding: 0 24px;
        border: 1.5px solid rgba(229, 166, 255, 0.98);
        background: linear-gradient(135deg, #40106f 0%, #6b21c8 48%, #9333ea 100%);
        color: #ffffff;
        font-family: "Exo 2", "Segoe UI", Arial, sans-serif;
        font-size: clamp(20px, 4.8vw, 28px);
        font-weight: 700;
        box-shadow:
          inset 0 0 0 1px rgba(255, 230, 255, 0.14),
          0 0 18px rgba(214, 112, 255, 0.44),
          0 0 42px rgba(147, 51, 234, 0.34);
      }

      .playtalk-energy-gate__premium-crown {
        width: 22px;
        height: 22px;
        display: inline-block;
        color: #ffd84a;
        filter:
          drop-shadow(0 0 8px rgba(255, 216, 74, 0.68))
          drop-shadow(0 0 18px rgba(255, 186, 0, 0.26));
        flex: 0 0 auto;
      }

      .playtalk-energy-gate__premium-crown svg {
        width: 100%;
        height: 100%;
        display: block;
        fill: currentColor;
      }

      .playtalk-energy-gate__premium-note {
        display: none;
        margin: -2px 0 0;
        font-family: "Exo 2", "Segoe UI", Arial, sans-serif;
        font-size: clamp(15px, 3.8vw, 20px);
        font-weight: 300;
        line-height: 1.05;
        color: rgba(255, 255, 255, 0.92);
        text-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
      }

      .playtalk-energy-gate.is-depletion-screen .playtalk-energy-gate__close {
        display: none;
      }

      .playtalk-energy-gate.is-depletion-screen .playtalk-energy-gate__nav {
        display: grid;
      }

      .playtalk-energy-gate.is-depletion-screen .playtalk-energy-gate__premium-note {
        display: block;
      }

      .playtalk-energy-preview-blocked {
        filter: grayscale(1) brightness(0.42) !important;
        transition: filter 180ms ease, opacity 180ms ease !important;
      }
    `;
    document.head.appendChild(style);
  }

  function wait(ms) {
    return new Promise((resolve) => {
      window.setTimeout(resolve, Math.max(0, Number(ms) || 0));
    });
  }

  function ensureEnergyGate() {
    injectEnergyGateStyles();
    let gate = document.getElementById('playtalkEnergyGate');
    if (gate) return gate;
    gate = document.createElement('section');
    gate.className = 'playtalk-energy-gate';
    gate.id = 'playtalkEnergyGate';
    gate.setAttribute('aria-modal', 'true');
    gate.setAttribute('role', 'dialog');
    gate.setAttribute('aria-label', 'Treino diario completo');
    const closeButton = document.createElement('button');
    closeButton.className = 'playtalk-energy-gate__close';
    closeButton.id = 'playtalkEnergyGateClose';
    closeButton.type = 'button';
    closeButton.setAttribute('aria-label', 'Fechar');
    closeButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6l5.6-5.6L5 6.4z"/></svg>';

    const navButton = document.createElement('button');
    navButton.className = 'playtalk-energy-gate__nav';
    navButton.id = 'playtalkEnergyGateNav';
    navButton.type = 'button';
    navButton.setAttribute('aria-label', 'Ir para o inicio do treino');
    navButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.7 5.3a1 1 0 0 1 0 1.4L10.41 11H19a1 1 0 1 1 0 2h-8.59l4.3 4.3a1 1 0 1 1-1.42 1.4l-6-6a1 1 0 0 1 0-1.4l6-6a1 1 0 0 1 1.41 0z"/></svg>';

    const content = document.createElement('div');
    content.className = 'playtalk-energy-gate__content';

    const title = document.createElement('h2');
    title.className = 'playtalk-energy-gate__title';
    title.innerHTML = '<span>Você completou</span><span>o treino diário!</span>';

    const star = document.createElement('img');
    star.className = 'playtalk-energy-gate__star';
    star.src = '/SVG/codex-icons/star.svg';
    star.alt = '';
    star.setAttribute('aria-hidden', 'true');

    const logline = document.createElement('p');
    logline.className = 'playtalk-energy-gate__logline';
    logline.id = 'playtalkEnergyGateLogline';
    logline.textContent = ENERGY_GATE_STATIC_COPY;

    const countdown = document.createElement('p');
    countdown.className = 'playtalk-energy-gate__countdown';

    const countdownIcon = document.createElement('img');
    countdownIcon.className = 'playtalk-energy-gate__countdown-icon';
    countdownIcon.src = '/SVG/codex-icons/relógio.svg';
    countdownIcon.alt = '';
    countdownIcon.setAttribute('aria-hidden', 'true');

    const countdownValue = document.createElement('span');
    countdownValue.className = 'playtalk-energy-gate__countdown-value';
    countdownValue.id = 'playtalkEnergyGateCountdown';
    countdownValue.textContent = '00h 00m 00s';

    const countdownLabel = document.createElement('span');
    countdownLabel.className = 'playtalk-energy-gate__countdown-label';
    countdownLabel.id = 'playtalkEnergyGateCountdownLabel';
    countdownLabel.innerHTML = '<span>Mais energias</span><span>em</span>';

    const countdownLoader = document.createElement('span');
    countdownLoader.className = 'playtalk-energy-gate__loader';
    countdownLoader.setAttribute('aria-hidden', 'true');
    countdownLoader.innerHTML = '<span class="playtalk-energy-gate__loader-hour"></span><span class="playtalk-energy-gate__loader-min"></span><span class="playtalk-energy-gate__loader-circle"></span>';

    const premiumButton = document.createElement('button');
    premiumButton.className = 'playtalk-energy-gate__premium';
    premiumButton.id = 'playtalkEnergyGatePremium';
    premiumButton.type = 'button';
    premiumButton.innerHTML = '<span class="playtalk-energy-gate__premium-crown" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 17h16l-1.2-8.54a.75.75 0 0 0-1.2-.48L14 10.75 11.2 6.9a.75.75 0 0 0-1.2 0L7 10.75 4.4 7.98a.75.75 0 0 0-1.2.48L4 17zm1.1 2a1 1 0 0 1 0-2h13.8a1 1 0 1 1 0 2H5.1z"/></svg></span><span class="playtalk-energy-gate__premium-label">Assinar premium</span>';

    const premiumNote = document.createElement('p');
    premiumNote.className = 'playtalk-energy-gate__premium-note';
    premiumNote.id = 'playtalkEnergyGatePremiumNote';
    premiumNote.textContent = 'para energias infinitas';

    countdown.append(countdownIcon, countdownLabel, countdownLoader, countdownValue);
    content.append(title, star, logline, countdown, premiumButton, premiumNote);
    gate.append(closeButton, navButton, content);
    document.body.appendChild(gate);
    closeButton.addEventListener('click', closeEnergyGate);
    navButton.addEventListener('click', () => {
      const href = resolveFlashcardsWelcomeHref();
      if (window.PlaytalkNative && typeof window.PlaytalkNative.navigate === 'function') {
        window.PlaytalkNative.navigate(href, { replace: true });
      } else {
        window.location.href = href;
      }
    });
    premiumButton.addEventListener('click', () => {
      window.location.href = resolvePremiumHref();
    });
    return gate;
    gate.innerHTML = `
      <button class="playtalk-energy-gate__close" id="playtalkEnergyGateClose" type="button" aria-label="Fechar">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6l5.6-5.6L5 6.4z"/></svg>
      </button>
      <div class="playtalk-energy-gate__content">
        <h2 class="playtalk-energy-gate__title"><span>Você completou</span><span>o treino diário!</span></h2>
        <img class="playtalk-energy-gate__star" src="/SVG/codex-icons/star.svg" alt="" aria-hidden="true">
        <p class="playtalk-energy-gate__logline" id="playtalkEnergyGateLogline">${ENERGY_GATE_LOG_LINES[0]}</p>
        <p class="playtalk-energy-gate__countdown">
          <img class="playtalk-energy-gate__countdown-icon" src="/SVG/codex-icons/relógio.svg" alt="" aria-hidden="true">
          <span class="playtalk-energy-gate__countdown-value" id="playtalkEnergyGateCountdown">00h 00m 00s</span>
        </p>
        <button class="playtalk-energy-gate__premium" id="playtalkEnergyGatePremium" type="button">Assinar premium</button>
      </div>
    `;
    document.body.appendChild(gate);
    gate.querySelector('#playtalkEnergyGateClose')?.addEventListener('click', closeEnergyGate);
    gate.querySelector('#playtalkEnergyGatePremium')?.addEventListener('click', () => {
      window.location.href = resolvePremiumHref();
    });
    return gate;
  }

  function updateEnergyGateCountdown() {
    const countdown = document.getElementById('playtalkEnergyGateCountdown');
    if (!countdown) return;
    const gate = document.getElementById('playtalkEnergyGate');
    const mode = gate?.dataset?.mode || ENERGY_GATE_MODE_DEFAULT;
    countdown.textContent = mode === ENERGY_GATE_MODE_DEPLETION
      ? formatResetCountdownClock(latestEnergyGateStatus?.nextResetAt)
      : formatResetCountdownDetailed(latestEnergyGateStatus?.nextResetAt);
  }

  function renderEnergyGateLogline(text) {
    const logline = document.getElementById('playtalkEnergyGateLogline');
    if (!logline) return;
    logline.innerHTML = escapeHtml(text);
  }

  function startEnergyGateTimers() {
    stopEnergyGateTimers();
    const logline = document.getElementById('playtalkEnergyGateLogline');
    if (logline) {
      renderEnergyGateLogline(ENERGY_GATE_STATIC_COPY);
    }
    updateEnergyGateCountdown();
    energyGateCountdownTimer = window.setInterval(updateEnergyGateCountdown, 1000);
  }

  function stopEnergyGateTimers() {
    if (energyGateCountdownTimer) {
      window.clearInterval(energyGateCountdownTimer);
      energyGateCountdownTimer = 0;
    }
  }

  function applyEnergyGateMode(mode = ENERGY_GATE_MODE_DEFAULT) {
    const gate = ensureEnergyGate();
    const title = gate.querySelector('.playtalk-energy-gate__title');
    const logline = gate.querySelector('#playtalkEnergyGateLogline');
    const countdownLabel = gate.querySelector('#playtalkEnergyGateCountdownLabel');
    const premiumButton = gate.querySelector('#playtalkEnergyGatePremium');
    const premiumNote = gate.querySelector('#playtalkEnergyGatePremiumNote');
    gate.dataset.mode = mode;
    gate.classList.toggle('is-depletion-screen', mode === ENERGY_GATE_MODE_DEPLETION);
    gate.setAttribute(
      'aria-label',
      mode === ENERGY_GATE_MODE_DEPLETION ? 'Treino diario completo' : 'Mais energias em breve'
    );
    if (title) {
      title.innerHTML = mode === ENERGY_GATE_MODE_DEPLETION
        ? '<span>Você completou</span><span>seu treino diário</span>'
        : '<span>Você completou</span><span>o treino diário!</span>';
    }
    if (logline) {
      logline.textContent = ENERGY_GATE_STATIC_COPY;
    }
    if (countdownLabel) {
      countdownLabel.innerHTML = mode === ENERGY_GATE_MODE_DEPLETION
        ? '<span>Mais energias</span><span>em</span>'
        : 'Mais energias em';
    }
    if (premiumButton) {
      premiumButton.innerHTML = '<span class="playtalk-energy-gate__premium-crown" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 17h16l-1.2-8.54a.75.75 0 0 0-1.2-.48L14 10.75 11.2 6.9a.75.75 0 0 0-1.2 0L7 10.75 4.4 7.98a.75.75 0 0 0-1.2.48L4 17zm1.1 2a1 1 0 0 1 0-2h13.8a1 1 0 1 1 0 2H5.1z"/></svg></span><span class="playtalk-energy-gate__premium-label">Assinar premium</span>';
    }
    if (premiumNote) {
      premiumNote.textContent = 'para energias infinitas';
    }
    return gate;
  }

  function openEnergyGate(status = null, options = {}) {
    latestEnergyGateStatus = status && typeof status === 'object'
      ? rememberEnergyStatus(status)
      : latestEnergyGateStatus || buildEnergyStatus({ stats: {} });
    const gate = applyEnergyGateMode(options.mode || ENERGY_GATE_MODE_DEFAULT);
    document.body.classList.add('playtalk-energy-gate-open');
    gate.classList.add('is-visible');
    gate.removeAttribute('hidden');
    startEnergyGateTimers();
  }

  function closeEnergyGate() {
    const gate = document.getElementById('playtalkEnergyGate');
    document.body.classList.remove('playtalk-energy-gate-open');
    energyDepletionScreenVisible = false;
    if (gate) {
      gate.classList.remove('is-visible');
      gate.hidden = true;
      gate.classList.remove('is-depletion-screen');
      gate.dataset.mode = ENERGY_GATE_MODE_DEFAULT;
    }
    stopEnergyGateTimers();
  }

  function normalizePreviewTargets(targets) {
    const source = Array.isArray(targets) ? targets : [targets];
    return source.filter((target) => target instanceof HTMLElement);
  }

  async function previewBlockedTargets(targets, durationMs = ENERGY_GATE_PREVIEW_MS) {
    const entries = normalizePreviewTargets(targets).map((element) => ({
      element,
      pointerEvents: element.style.pointerEvents
    }));
    if (!entries.length) {
      await wait(durationMs);
      return;
    }
    entries.forEach(({ element }) => {
      element.classList.add('playtalk-energy-preview-blocked');
      element.style.pointerEvents = 'none';
    });
    await wait(durationMs);
    entries.forEach(({ element, pointerEvents }) => {
      element.classList.remove('playtalk-energy-preview-blocked');
      if (pointerEvents) {
        element.style.pointerEvents = pointerEvents;
      } else {
        element.style.removeProperty('pointer-events');
      }
    });
  }

  function redirectToFlashcardsEnergyGate(status = null) {
    if (status && typeof status === 'object') {
      rememberEnergyStatus(status);
    }
    try {
      sessionStorage.setItem(ENERGY_GATE_PENDING_STORE, '1');
      if (status && typeof status === 'object') {
        sessionStorage.setItem(ENERGY_GATE_STATUS_STORE, JSON.stringify(status));
      }
    } catch (_error) {
      // ignore
    }
    if (isFlashcardsRoute()) {
      openEnergyGate(status, { mode: ENERGY_GATE_MODE_DEFAULT });
      return;
    }
    window.location.href = resolveFlashcardsEnergyHref();
  }

  function readStoredEnergyGateStatus() {
    try {
      const raw = sessionStorage.getItem(ENERGY_GATE_STATUS_STORE);
      if (!raw) return null;
      sessionStorage.removeItem(ENERGY_GATE_STATUS_STORE);
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (_error) {
      return null;
    }
  }

  function shouldOpenStoredEnergyGate() {
    try {
      const params = new URLSearchParams(window.location.search || '');
      const hasQueryFlag = params.get('energy') === 'empty';
      const hasPendingFlag = sessionStorage.getItem(ENERGY_GATE_PENDING_STORE) === '1';
      if (hasQueryFlag || hasPendingFlag) {
        sessionStorage.removeItem(ENERGY_GATE_PENDING_STORE);
        return true;
      }
    } catch (_error) {
      return false;
    }
    return false;
  }

  function openStoredEnergyGateIfNeeded() {
    if (!shouldOpenStoredEnergyGate()) return;
    const status = readStoredEnergyGateStatus();
    openEnergyGate(status, { mode: ENERGY_GATE_MODE_DEFAULT });
    window.setTimeout(() => openEnergyGate(status, { mode: ENERGY_GATE_MODE_DEFAULT }), 250);
  }


  async function fetchBooksStats() {
    if (!window.PlaytalkApi || typeof window.PlaytalkApi.buildApiUrl !== 'function') {
      return null;
    }
    try {
      const response = await fetch(window.PlaytalkApi.buildApiUrl('/api/books/stats'), {
        headers: typeof window.PlaytalkApi.buildAuthHeaders === 'function'
          ? window.PlaytalkApi.buildAuthHeaders()
          : {},
        cache: 'no-store',
        credentials: 'include'
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) return null;
      return payload.stats || null;
    } catch (_error) {
      return null;
    }
  }

  function buildEnergyStatus({ user, stats } = {}) {
    const premium = isPremiumActive(user) || Boolean(stats?.unlimited);
    const nextResetAt = String(stats?.nextEnergyResetAt || '').trim();
    const simpleEnergyUsed = Math.max(0,
      Math.round(
        safeNumber(stats?.listeningChars)
        + safeNumber(stats?.speakingChars)
        + safeNumber(stats?.readingChars)
      )
    );
    const hasSimpleEnergyTotals = simpleEnergyUsed > 0
      || stats?.listeningChars != null
      || stats?.speakingChars != null
      || stats?.readingChars != null;
    const hasServerEnergySnapshot = stats && (
      stats.remainingEnergy != null
      || stats.dailyEnergyUsed != null
      || stats.dailyEnergyLimit != null
      || stats.unlimited != null
      || stats.nextEnergyResetAt != null
    );
    const dailyEnergyLimit = Math.max(0, Math.round(safeNumber(stats?.dailyEnergyLimit))) || DAILY_FREE_ENERGY;
    const usedToday = premium
      ? 0
      : hasSimpleEnergyTotals
        ? simpleEnergyUsed
        : hasServerEnergySnapshot
        ? Math.max(0, Math.round(safeNumber(stats?.dailyEnergyUsed)))
        : 0;
    const serverRemaining = safeNumber(stats?.remainingEnergy);
    const hasServerRemaining = stats?.remainingEnergy != null && Number.isFinite(Number(stats.remainingEnergy));
    const remaining = premium
      ? Number.POSITIVE_INFINITY
      : hasServerRemaining
        ? Math.round(serverRemaining)
        : Math.round(dailyEnergyLimit - usedToday);
    return {
      loggedIn: Boolean(user?.id),
      premium,
      unlimited: premium,
      remaining,
      usedToday,
      blocked: false,
      gateRequired: false,
      minimumEnergyRequired: 0,
      nextResetAt: nextResetAt || null,
      countdownText: nextResetAt ? formatResetCountdown(nextResetAt) : '0h 0min',
      message: premium
        ? 'Energia infinita'
        : `${remaining} energias restantes`,
      dailyEnergyLimit
    };
  }

  function shouldRefreshEnergyStats(stats) {
    if (!stats || typeof stats !== 'object') return true;
    if (stats.nextEnergyResetAt != null && String(stats.nextEnergyResetAt).trim()) return false;
    const hasEnergyNumbers = (
      stats.remainingEnergy != null
      || stats.dailyEnergyUsed != null
      || stats.dailyEnergyLimit != null
      || stats.readingChars != null
      || stats.listeningChars != null
      || stats.speakingChars != null
    );
    return !hasEnergyNumbers || stats.nextEnergyResetAt == null;
  }

  async function getEnergyStatus(options = {}) {
    const user = options.user && typeof options.user === 'object' ? options.user : null;
    let stats = options.stats && typeof options.stats === 'object'
      ? options.stats
      : null;
    if (!stats) {
      const rememberedStatus = readRememberedEnergyStatus(user);
      if (rememberedStatus) {
        return rememberedStatus;
      }
    }
    if (shouldRefreshEnergyStats(stats)) {
      const fetchedStats = await fetchBooksStats();
      if (fetchedStats && typeof fetchedStats === 'object') {
        stats = stats && typeof stats === 'object'
          ? { ...fetchedStats, ...stats, nextEnergyResetAt: fetchedStats.nextEnergyResetAt || stats.nextEnergyResetAt }
          : fetchedStats;
      }
    }
    if (stats && typeof stats === 'object') {
      return rememberEnergyStatus(buildEnergyStatus({ user, stats }));
    }
    const rememberedStatus = readRememberedEnergyStatus(user);
    if (rememberedStatus) {
      return rememberedStatus;
    }
    return rememberEnergyStatus(buildEnergyStatus({ user, stats }));
  }

  async function guardEnergyGate(options = {}) {
    const status = await getEnergyStatus(options);
    if (status.loggedIn && status.blocked) {
      const previewTargets = options.previewTargets != null
        ? options.previewTargets
        : options.previewTarget;
      await previewBlockedTargets(previewTargets, options.previewDurationMs);
      openEnergyGate(status);
      return { allowed: false, status };
    }
    return { allowed: true, status };
  }

  async function guardEnergy(options = {}) {
    const status = await getEnergyStatus(options);
    if (status.loggedIn && status.blocked) {
      redirectToFlashcardsEnergyGate(status);
      return { allowed: false, status };
    }
    return { allowed: true, status };
  }

  function isEnergyErrorPayload(payload, statusCode) {
    return Number(statusCode) === ENERGY_EXHAUSTED_STATUS || Boolean(payload?.energy);
  }

  function isDepletedStatus(status) {
    if (!status || typeof status !== 'object') return false;
    if (!status.loggedIn || status.premium || status.unlimited) return false;
    return Number(status.remaining) <= 0;
  }

  async function activateNoEnergyForCurrentUser() {
    try {
      const response = await fetch('/api/me/no-energy', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: '{}'
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success || !payload?.user) {
        return null;
      }
      try {
        window.dispatchEvent(new CustomEvent('playtalk:no-energy-updated', {
          detail: {
            user: payload.user,
            noEnergy: Boolean(payload.noEnergy ?? payload.user?.no_energy)
          }
        }));
      } catch (_error) {
        // ignore
      }
      return payload.user;
    } catch (_error) {
      return null;
    }
  }

  async function triggerEnergyDepletionExit(options = {}) {
    const status = options.status && typeof options.status === 'object'
      ? rememberEnergyStatus(options.status)
      : rememberEnergyStatus(buildEnergyStatus({
        user: options.user,
        stats: options.stats
      }));
    if (!isDepletedStatus(status) || energyDepletionExitInFlight || energyDepletionScreenVisible) {
      return false;
    }

    energyDepletionExitInFlight = true;
    try {
      await activateNoEnergyForCurrentUser();

      if (typeof options.beforeExit === 'function') {
        try {
          options.beforeExit(status);
        } catch (_error) {
          // ignore
        }
      }

      const targets = normalizePreviewTargets(options.targets).filter((element) => {
        if (!(element instanceof HTMLElement)) return false;
        if (element.hidden) return false;
        const computed = window.getComputedStyle(element);
        return computed.display !== 'none' && computed.visibility !== 'hidden';
      });

      targets.forEach((element) => {
        element.style.transition = `opacity ${ENERGY_DEPLETION_EXIT_MS}ms ease, filter ${ENERGY_DEPLETION_EXIT_MS}ms ease, transform ${ENERGY_DEPLETION_EXIT_MS}ms ease`;
        element.style.transformOrigin = 'center center';
        element.style.pointerEvents = 'none';
      });

      // Force a frame so the browser sees the initial state before dissolving.
      void document.body.offsetWidth;

      targets.forEach((element) => {
        element.style.opacity = '0';
        element.style.filter = 'blur(18px)';
        element.style.transform = 'scale(0.98)';
      });

      await wait(ENERGY_DEPLETION_EXIT_MS);
      energyDepletionScreenVisible = true;
      openEnergyGate(status, { mode: ENERGY_GATE_MODE_DEPLETION });
      return true;
    } finally {
      window.setTimeout(() => {
        energyDepletionExitInFlight = false;
      }, 250);
    }
  }

  function watchEnergyDepletion(options = {}) {
    let timerId = 0;
    let checkInFlight = false;

    const isActive = () => {
      if (typeof options.isActive === 'function') {
        try {
          return Boolean(options.isActive());
        } catch (_error) {
          return false;
        }
      }
      return true;
    };

    const runCheck = async () => {
      if (checkInFlight || energyDepletionExitInFlight || energyDepletionScreenVisible || !isActive()) {
        return false;
      }
      checkInFlight = true;
      try {
        const status = await getEnergyStatus({
          user: typeof options.getUser === 'function' ? options.getUser() : options.user,
          stats: typeof options.getStats === 'function' ? options.getStats() : options.stats
        });
        if (!isDepletedStatus(status)) {
          return false;
        }
        await triggerEnergyDepletionExit({
          status,
          targets: typeof options.getTargets === 'function' ? options.getTargets() : options.targets,
          beforeExit: options.beforeExit,
          href: options.href,
          replace: options.replace
        });
        return true;
      } finally {
        checkInFlight = false;
      }
    };

    const start = () => {
      if (timerId) return;
      void runCheck();
      timerId = window.setInterval(() => {
        void runCheck();
      }, Math.max(1000, Number(options.intervalMs) || ENERGY_DEPLETION_WATCH_MS));
    };

    const stop = () => {
      if (!timerId) return;
      window.clearInterval(timerId);
      timerId = 0;
    };

    if (options.start !== false) {
      start();
    }

    return {
      start,
      stop,
      check: runCheck
    };
  }

  window.PlaytalkEnergy = {
    DAILY_FREE_ENERGY,
    ENERGY_EXHAUSTED_STATUS,
    buildEnergyStatus,
    fetchBooksStats,
    formatResetCountdown,
    getEnergyStatus,
    readRememberedEnergyStatus,
    rememberEnergyStatus,
    guardEnergyGate,
    guardEnergy,
    isEnergyErrorPayload,
    isDepletedStatus,
    isPremiumActive,
    activateNoEnergyForCurrentUser,
    openEnergyGate,
    closeEnergyGate,
    previewBlockedTargets,
    triggerEnergyDepletionExit,
    watchEnergyDepletion,
    redirectToFlashcardsEnergyGate,
    resolveHomeHref,
    resolveFlashcardsEnergyHref,
    resolveFlashcardsWelcomeHref,
    resolvePremiumHref,
    resolveAccountHref
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      openStoredEnergyGateIfNeeded();
    }, { once: true });
  } else {
    openStoredEnergyGateIfNeeded();
  }
})();
