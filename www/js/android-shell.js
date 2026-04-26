(function initPlaytalkAndroidShell() {
  const LAST_ROUTE_STORAGE_KEY = 'playtalk_native_last_route_v1';
  const LAST_ROUTE_MAX_AGE_MS = 30000;
  const ROUTES = {
    auth: { webPath: '/entrar', localPath: '/auth.html' },
    flashcards: { webPath: '/flashcards', localPath: '/flashcards.html?view=play' },
    allcards: { webPath: '/allcards', localPath: '/allcards.html' },
    mycards: { webPath: '/mycards', localPath: '/mycards.html' },
    users: { webPath: '/users', localPath: '/users.html' },
    account: { webPath: '/account', localPath: '/account.html' },
    books: { webPath: '/books', localPath: '/books.html' },
    username: { webPath: '/username', localPath: '/username.html' },
    usermame: { webPath: '/usermame', localPath: '/username.html' },
    avataradd: { webPath: '/avataradd', localPath: '/avataradd.html' },
    password: { webPath: '/password', localPath: '/password.html' },
    premium: { webPath: '/premium', localPath: '/premium.html' }
    ,
    speaking: { webPath: '/speaking', localPath: '/speaking.html' }
  };

  const FILE_TO_ROUTE_KEY = {
    'auth.html': 'auth',
    'flashcards.html': 'flashcards',
    'allcards.html': 'allcards',
    'mycards.html': 'mycards',
    'users.html': 'users',
    'account.html': 'account',
    'books.html': 'books',
    'username.html': 'username',
    'avataradd.html': 'avataradd',
    'password.html': 'password',
    'premium.html': 'premium'
    ,
    'speaking.html': 'speaking'
  };

  let backButtonListenerBound = false;

  function isNativeRuntime() {
    try {
      if (window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function') {
        return Boolean(window.Capacitor.isNativePlatform());
      }
    } catch (_error) {
      // ignore
    }

    const protocol = String(window.location?.protocol || '').toLowerCase();
    const hostname = String(window.location?.hostname || '').toLowerCase();
    const port = String(window.location?.port || '').trim();

    return protocol === 'file:'
      || ((hostname === 'localhost' || hostname === '127.0.0.1') && !port);
  }

  function normalizePathname(pathname) {
    const normalized = String(pathname || '').trim() || '/';
    if (normalized === '/') return '/';
    return normalized.replace(/\/+$/, '') || '/';
  }

  function findRouteByWebPath(pathname) {
    const normalizedPath = normalizePathname(pathname);
    return Object.entries(ROUTES).find(([, route]) => route.webPath === normalizedPath) || null;
  }

  function parseUrl(rawValue) {
    try {
      return new URL(String(rawValue || ''), window.location.href);
    } catch (_error) {
      return null;
    }
  }

  function comparableHref(rawValue) {
    const parsedUrl = parseUrl(rawValue);
    if (!parsedUrl) return String(rawValue || '').trim();
    return `${normalizePathname(parsedUrl.pathname)}${parsedUrl.search}${parsedUrl.hash}`;
  }

  function isCurrentResolvedHref(rawValue) {
    const candidate = comparableHref(rawValue);
    const current = comparableHref(window.location.href);
    return Boolean(candidate) && candidate === current;
  }

  function rememberCurrentRoute() {
    if (!isNativeRuntime()) return;
    const routeKey = currentRouteKey();
    if (!routeKey || routeKey === 'speaking') return;
    try {
      window.localStorage.setItem(LAST_ROUTE_STORAGE_KEY, JSON.stringify({
        href: comparableHref(window.location.href),
        savedAt: Date.now()
      }));
    } catch (_error) {
      // ignore
    }
  }

  function resolveRouteHref(target, options = {}) {
    const fallback = String(target || '').trim() || '/flashcards';
    const searchOverride = typeof options.search === 'string' ? options.search : null;
    const hashOverride = typeof options.hash === 'string' ? options.hash : null;

    if (!isNativeRuntime()) {
      return fallback;
    }

    const routeEntry = ROUTES[fallback];
    if (routeEntry) {
      const localUrl = new URL(routeEntry.localPath, window.location.origin);
      if (searchOverride !== null) {
        localUrl.search = searchOverride;
      }
      if (hashOverride !== null) {
        localUrl.hash = hashOverride;
      }
      return `${localUrl.pathname}${localUrl.search}${localUrl.hash}`;
    }

    const parsedUrl = parseUrl(fallback);
    if (!parsedUrl) {
      return fallback;
    }

    const matchedRoute = findRouteByWebPath(parsedUrl.pathname);
    if (!matchedRoute) {
      return fallback;
    }

    const [, route] = matchedRoute;
    const localUrl = new URL(route.localPath, window.location.origin);
    localUrl.search = searchOverride !== null ? searchOverride : parsedUrl.search;
    localUrl.hash = hashOverride !== null ? hashOverride : parsedUrl.hash;
    return `${localUrl.pathname}${localUrl.search}${localUrl.hash}`;
  }

  function navigate(target, options = {}) {
    const href = resolveRouteHref(target, options);
    if (isCurrentResolvedHref(href)) {
      syncFooterNav();
      return;
    }
    if (options.replace) {
      window.location.replace(href);
      return;
    }
    window.location.href = href;
  }

  function currentRouteKey() {
    const pathname = normalizePathname(window.location.pathname);
    const fileName = pathname.split('/').filter(Boolean).pop() || 'index.html';
    if (FILE_TO_ROUTE_KEY[fileName]) {
      return FILE_TO_ROUTE_KEY[fileName];
    }
    const matchedRoute = findRouteByWebPath(pathname);
    return matchedRoute ? matchedRoute[0] : '';
  }

  function routeKeyFromHref(href) {
    const parsedUrl = parseUrl(href);
    if (!parsedUrl) return '';
    const fileName = normalizePathname(parsedUrl.pathname).split('/').filter(Boolean).pop() || '';
    if (FILE_TO_ROUTE_KEY[fileName]) {
      return FILE_TO_ROUTE_KEY[fileName];
    }
    const matchedRoute = findRouteByWebPath(parsedUrl.pathname);
    return matchedRoute ? matchedRoute[0] : '';
  }

  function isCurrentSpeakingSession(sessionId) {
    const normalizedSessionId = String(sessionId || '').trim();
    if (!normalizedSessionId) return false;

    const parsedUrl = parseUrl(window.location.href);
    if (!parsedUrl) return false;

    const normalizedPath = normalizePathname(parsedUrl.pathname);
    if (normalizedPath !== '/speaking' && normalizedPath !== '/speaking.html') {
      return false;
    }

    const currentSessionId = String(parsedUrl.searchParams.get('session') || '').trim();
    return currentSessionId === normalizedSessionId;
  }

  function rewriteAnchors(root) {
    if (!isNativeRuntime()) return;
    const scope = root && typeof root.querySelectorAll === 'function' ? root : document;
    Array.from(scope.querySelectorAll('a[href]')).forEach((anchor) => {
      const href = String(anchor.getAttribute('href') || '').trim();
      if (!href || href.startsWith('#')) return;
      const nextHref = resolveRouteHref(href);
      if (nextHref !== href) {
        anchor.setAttribute('href', nextHref);
      }
    });
  }

  function syncFooterNav() {
    if (!isNativeRuntime()) return;
    const activeRouteKey = currentRouteKey();
    Array.from(document.querySelectorAll('.flashcards-footer-nav__item')).forEach((item) => {
      const routeKey = routeKeyFromHref(item.getAttribute('href'));
      item.classList.toggle('is-active', Boolean(routeKey) && routeKey === activeRouteKey);
    });
  }

  async function bindBackButtonListener() {
    if (backButtonListenerBound || !isNativeRuntime()) return;
    backButtonListenerBound = true;

    try {
      const appPlugin = window.Capacitor?.Plugins?.App;
      if (!appPlugin || typeof appPlugin.addListener !== 'function') {
        return;
      }

      await appPlugin.addListener('backButton', async () => {
        const routeKey = currentRouteKey();
        const rootRoutes = new Set(['flashcards', 'allcards', 'mycards', 'users', 'account', 'books']);

        if (!rootRoutes.has(routeKey) && window.history.length > 1) {
          window.history.back();
          return;
        }

        if (typeof appPlugin.minimizeApp === 'function') {
          await appPlugin.minimizeApp();
          return;
        }

        if (typeof appPlugin.exitApp === 'function') {
          await appPlugin.exitApp();
        }
      });
    } catch (_error) {
      // ignore
    }
  }

  function bindNavigationInterceptor() {
    if (!isNativeRuntime()) return;

    document.addEventListener('click', (event) => {
      const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!anchor) return;
      if (event.defaultPrevented) return;
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (anchor.target && anchor.target.toLowerCase() !== '_self') return;

      const href = String(anchor.getAttribute('href') || '').trim();
      const nextHref = resolveRouteHref(href);
      if (!nextHref || nextHref === href) return;

      event.preventDefault();
      if (isCurrentResolvedHref(nextHref)) {
        syncFooterNav();
        return;
      }
      navigate(nextHref);
    }, true);
  }

  const challengeRuntime = {
    started: false,
    pollTimer: 0,
    pingTimer: 0,
    redirecting: false,
    incomingId: 0,
    outgoingId: 0,
    outgoingTerminalNoticeKey: ''
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

  function navigateToSpeakingSession(sessionId, options = {}) {
    const normalizedSessionId = String(sessionId || '').trim();
    if (!normalizedSessionId) return;
    navigate('speaking', {
      ...options,
      search: `?session=${encodeURIComponent(normalizedSessionId)}`
    });
  }

  function ensureChallengePopupUi() {
    if (document.getElementById('globalChallengePopupStyles')) return;
    const style = document.createElement('style');
    style.id = 'globalChallengePopupStyles';
    style.textContent = `
      html.global-challenge-locked,
      body.global-challenge-locked{overflow:hidden !important;overscroll-behavior:none !important}
      .global-challenge-modal{position:fixed !important;top:0 !important;right:0 !important;bottom:0 !important;left:0 !important;width:100vw !important;height:100dvh !important;max-width:none !important;max-height:none !important;z-index:2147483647 !important;display:none;align-items:center;justify-content:center;padding:clamp(10px,2.5vw,20px);background:rgba(2,11,24,.72);backdrop-filter:blur(8px);margin:0 !important;transform:none !important}
      .global-challenge-modal.is-visible{display:flex}
      .global-challenge-card{width:min(95vw,980px);height:min(95dvh,980px);max-height:min(95dvh,980px);border-radius:28px;border:1px solid rgba(124,192,255,.38);background:radial-gradient(circle at 15% 10%,rgba(160,220,255,.24),transparent 34%),radial-gradient(circle at 90% 90%,rgba(95,176,255,.22),transparent 30%),linear-gradient(145deg,rgba(28,92,156,.96),rgba(18,70,127,.95));color:#eff7ff;padding:20px;box-shadow:0 24px 52px rgba(2,14,29,.46);text-align:center;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:12px}
      .global-challenge-avatar{width:124px;height:124px;border-radius:50%;object-fit:cover;border:3px solid rgba(255,255,255,.68);box-shadow:0 10px 22px rgba(2,12,29,.34)}
      .global-challenge-title{margin:0 0 8px;font-size:clamp(28px,5vw,42px);letter-spacing:.02em}
      .global-challenge-copy{margin:0 0 14px;color:rgba(232,244,255,.94);line-height:1.45;font-size:clamp(16px,2.5vw,22px);max-width:760px}
      .global-challenge-actions{display:grid;gap:14px;width:min(520px,100%);margin-top:12px}
      .global-challenge-btn{border:0;border-radius:16px;padding:14px 14px;font-size:clamp(16px,2.3vw,22px);font-weight:800;letter-spacing:.01em;cursor:pointer;color:#08315e;background:linear-gradient(140deg,#b4dcff,#8cc8ff)}
      .global-challenge-btn.is-secondary{color:#ecf4ff;background:rgba(12,43,82,.68);border:1px solid rgba(174,214,255,.24)}
      .global-challenge-btn:disabled{cursor:not-allowed;opacity:.6}
    `;
    document.head.appendChild(style);

    const incoming = document.createElement('div');
    incoming.id = 'globalIncomingChallenge';
    incoming.className = 'global-challenge-modal';
    incoming.innerHTML = `
      <div class="global-challenge-card">
        <img class="global-challenge-avatar" id="globalIncomingAvatar" src="/Avatar/profile-neon-blue.svg" alt="Avatar">
        <h2 class="global-challenge-title">Voce recebeu um desafio</h2>
        <h2 class="global-challenge-title" id="globalIncomingName">Usuario</h2>
        <p class="global-challenge-copy" id="globalIncomingCopy">Usuario te desafiou pra um speaking</p>
        <div class="global-challenge-actions">
          <button class="global-challenge-btn" id="globalIncomingAcceptBtn" type="button">Aceitar</button>
          <button class="global-challenge-btn is-secondary" id="globalIncomingRejectBtn" type="button">Recusar</button>
        </div>
      </div>
    `;
    document.documentElement.appendChild(incoming);

    const outgoing = document.createElement('div');
    outgoing.id = 'globalOutgoingChallenge';
    outgoing.className = 'global-challenge-modal';
    outgoing.innerHTML = `
      <div class="global-challenge-card">
        <img class="global-challenge-avatar" id="globalOutgoingAvatar" src="/Avatar/profile-neon-blue.svg" alt="Avatar">
        <h2 class="global-challenge-title" id="globalOutgoingTitle">Desafio speaking</h2>
        <p class="global-challenge-copy" id="globalOutgoingCopy"></p>
        <div class="global-challenge-actions">
          <button class="global-challenge-btn is-secondary" id="globalOutgoingCloseBtn" type="button">Fechar</button>
        </div>
      </div>
    `;
    document.documentElement.appendChild(outgoing);
    outgoing.querySelector('#globalOutgoingCloseBtn')?.addEventListener('click', () => {
      outgoing.classList.remove('is-visible');
    });

    incoming.querySelector('#globalIncomingAcceptBtn')?.addEventListener('click', () => {
      void respondToIncoming('accept');
    });
    incoming.querySelector('#globalIncomingRejectBtn')?.addEventListener('click', () => {
      void respondToIncoming('reject');
    });
  }

  function syncChallengeViewportLock() {
    const incomingVisible = document.getElementById('globalIncomingChallenge')?.classList.contains('is-visible');
    const outgoingVisible = document.getElementById('globalOutgoingChallenge')?.classList.contains('is-visible');
    const shouldLock = Boolean(incomingVisible || outgoingVisible);
    document.documentElement.classList.toggle('global-challenge-locked', shouldLock);
    document.body?.classList.toggle('global-challenge-locked', shouldLock);
  }

  function openIncomingPopup(challenge) {
    const modal = document.getElementById('globalIncomingChallenge');
    if (!modal) return;
    challengeRuntime.incomingId = Number(challenge?.challengeId) || 0;
    const avatar = document.getElementById('globalIncomingAvatar');
    const name = document.getElementById('globalIncomingName');
    const copy = document.getElementById('globalIncomingCopy');
    if (avatar) avatar.src = challenge?.challenger?.avatarImage || '/Avatar/profile-neon-blue.svg';
    if (name) name.textContent = challenge?.challenger?.username || 'Usuario';
    const label = String(challenge?.challengeMode || '').trim().toLowerCase() === 'battle-cards'
      ? 'FluentCards'
      : 'Smart Books';
    if (copy) copy.textContent = `${challenge?.challenger?.username || 'Usuario'} te desafiou para ${label}`;
    modal.classList.add('is-visible');
    syncChallengeViewportLock();
  }

  function closeIncomingPopup() {
    document.getElementById('globalIncomingChallenge')?.classList.remove('is-visible');
    challengeRuntime.incomingId = 0;
    syncChallengeViewportLock();
  }

  function openOutgoingPopup(copy, avatar, title) {
    const modal = document.getElementById('globalOutgoingChallenge');
    if (!modal) return;
    const copyEl = document.getElementById('globalOutgoingCopy');
    const avatarEl = document.getElementById('globalOutgoingAvatar');
    const titleEl = document.getElementById('globalOutgoingTitle');
    if (copyEl) copyEl.textContent = copy || '';
    if (avatarEl) avatarEl.src = avatar || '/Avatar/profile-neon-blue.svg';
    if (titleEl) titleEl.textContent = title || 'Desafio speaking';
    modal.classList.add('is-visible');
    syncChallengeViewportLock();
  }

  function closeOutgoingPopup() {
    document.getElementById('globalOutgoingChallenge')?.classList.remove('is-visible');
    challengeRuntime.outgoingId = 0;
    syncChallengeViewportLock();
  }

  async function respondToIncoming(action) {
    const challengeId = Number(challengeRuntime.incomingId) || 0;
    if (!challengeId) return;
    try {
      const response = await fetch(buildApiUrl('/api/speaking/challenges/respond'), {
        method: 'POST',
        credentials: 'include',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ challengeId, action })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) return;
      closeIncomingPopup();
      if (action === 'accept' && payload?.sessionId) {
        challengeRuntime.redirecting = true;
        navigateToSpeakingSession(payload.sessionId);
      }
    } catch (_error) {
      // ignore
    }
  }

  async function pingChallengePresence() {
    try {
      await fetch(buildApiUrl('/api/speaking/presence/ping'), {
        method: 'POST',
        credentials: 'include',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        body: '{}'
      });
    } catch (_error) {
      // ignore
    }
  }

  async function pollChallengeState() {
    if (challengeRuntime.redirecting) return;
    try {
      const response = await fetch(buildApiUrl('/api/speaking/challenges/poll'), {
        credentials: 'include',
        cache: 'no-store',
        headers: buildAuthHeaders()
      });
      if (response.status === 401) {
        closeIncomingPopup();
        closeOutgoingPopup();
        return;
      }
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) return;

      const incoming = payload.incomingChallenge;
      if (incoming && incoming.status === 'pending') {
        openIncomingPopup(incoming);
      } else {
        closeIncomingPopup();
      }

      const outgoing = payload.outgoingChallenge;
      const outgoingLabel = String(outgoing?.challengeMode || '').trim().toLowerCase() === 'battle-cards'
        ? 'FluentCards'
        : 'Smart Books';
      if (!outgoing) {
        challengeRuntime.outgoingTerminalNoticeKey = '';
        closeOutgoingPopup();
        return;
      }
      challengeRuntime.outgoingId = Number(outgoing.challengeId) || 0;
      if (outgoing.status === 'pending') {
        challengeRuntime.outgoingTerminalNoticeKey = '';
        openOutgoingPopup(`Aguardando resposta de ${outgoing?.opponent?.username || 'Usuario'} em ${outgoingLabel}...`, outgoing?.opponent?.avatarImage, 'Desafio enviado');
      } else if (outgoing.status === 'rejected') {
        const noticeKey = `${challengeRuntime.outgoingId}:rejected`;
        if (challengeRuntime.outgoingTerminalNoticeKey !== noticeKey) {
          challengeRuntime.outgoingTerminalNoticeKey = noticeKey;
          openOutgoingPopup('Usuario recusou seu pedido.', outgoing?.opponent?.avatarImage, 'Desafio recusado');
        }
      } else if (outgoing.status === 'expired') {
        const noticeKey = `${challengeRuntime.outgoingId}:expired`;
        if (challengeRuntime.outgoingTerminalNoticeKey !== noticeKey) {
          challengeRuntime.outgoingTerminalNoticeKey = noticeKey;
          openOutgoingPopup('Seu desafio expirou.', outgoing?.opponent?.avatarImage, 'Desafio expirou');
        }
      } else if (outgoing.status === 'accepted' && outgoing.sessionId) {
        const acceptedSessionId = String(outgoing.sessionId || '').trim();
        if (acceptedSessionId && !isCurrentSpeakingSession(acceptedSessionId)) {
          challengeRuntime.redirecting = true;
          navigateToSpeakingSession(acceptedSessionId);
        } else {
          challengeRuntime.outgoingTerminalNoticeKey = '';
          closeOutgoingPopup();
        }
      } else if (outgoing.status === 'completed') {
        challengeRuntime.outgoingTerminalNoticeKey = '';
        closeOutgoingPopup();
      }
    } catch (_error) {
      // ignore
    }
  }

  function startGlobalChallengePopups() {
    if (challengeRuntime.started) return;
    challengeRuntime.started = true;
    ensureChallengePopupUi();
    void pingChallengePresence();
    void pollChallengeState();
    challengeRuntime.pingTimer = window.setInterval(() => {
      void pingChallengePresence();
    }, 15000);
    challengeRuntime.pollTimer = window.setInterval(() => {
      void pollChallengeState();
    }, 2500);
  }

  function init() {
    startGlobalChallengePopups();
    if (!isNativeRuntime()) return;
    rewriteAnchors(document);
    syncFooterNav();
    rememberCurrentRoute();
    bindNavigationInterceptor();
    void bindBackButtonListener();
  }

  window.PlaytalkNative = {
    isNativeRuntime,
    resolveRouteHref,
    navigate,
    rewriteAnchors,
    syncFooterNav
  };
  window.PlaytalkChallengePopups = {
    forcePoll() {
      void pollChallengeState();
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
