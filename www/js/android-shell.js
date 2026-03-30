(function initPlaytalkAndroidShell() {
  const ROUTES = {
    flashcards: { webPath: '/flashcards', localPath: '/flashcards.html?view=play' },
    allcards: { webPath: '/allcards', localPath: '/allcards.html' },
    users: { webPath: '/users', localPath: '/users.html' },
    account: { webPath: '/account', localPath: '/account.html' },
    username: { webPath: '/username', localPath: '/username.html' },
    avataradd: { webPath: '/avataradd', localPath: '/avataradd.html' },
    password: { webPath: '/password', localPath: '/password.html' },
    premium: { webPath: '/premium', localPath: '/premium.html' }
  };

  const FILE_TO_ROUTE_KEY = {
    'flashcards.html': 'flashcards',
    'allcards.html': 'allcards',
    'users.html': 'users',
    'account.html': 'account',
    'username.html': 'username',
    'avataradd.html': 'avataradd',
    'password.html': 'password',
    'premium.html': 'premium'
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
        const rootRoutes = new Set(['flashcards', 'allcards', 'users', 'account']);

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
      navigate(nextHref);
    }, true);
  }

  function init() {
    if (!isNativeRuntime()) return;
    rewriteAnchors(document);
    syncFooterNav();
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
