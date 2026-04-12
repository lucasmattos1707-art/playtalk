(function initPlaytalkApiConfig() {
  const LEGACY_RENDER_URL = 'https://playtalk-dvv5.onrender.com';
  const API_BASE_URL_STORAGE_KEY = 'playtalk_api_base_url';
  const AUTH_TOKEN_STORAGE_KEY = 'playtalk_auth_token';
  const DEFAULT_PUBLIC_ASSETS_ROOT = 'https://pub-1208463a3c774431bf7e0ddcbd3cf670.r2.dev';

  function normalizeBaseUrl(value) {
    if (typeof value !== 'string') return '';
    return value.trim().replace(/\/+$/, '');
  }

  function joinPublicAssetUrl(baseUrl, relativePath = '') {
    const normalizedBase = normalizeBaseUrl(baseUrl);
    const cleanedPath = String(relativePath || '')
      .trim()
      .replace(/^\/+|\/+$/g, '');

    if (!normalizedBase) return cleanedPath ? `/${cleanedPath}` : '';
    if (!cleanedPath) return normalizedBase;

    const encodedPath = cleanedPath
      .split('/')
      .filter(Boolean)
      .map((segment) => encodeURIComponent(segment))
      .join('/');

    return `${normalizedBase}/${encodedPath}`;
  }

  function readStoredBaseUrl() {
    try {
      return normalizeBaseUrl(window.localStorage.getItem(API_BASE_URL_STORAGE_KEY) || '');
    } catch (_error) {
      return '';
    }
  }

  function readGlobalBaseUrl() {
    return normalizeBaseUrl(window.PLAYTALK_API_BASE_URL || '');
  }

  function readGlobalAssetsBaseUrl() {
    return normalizeBaseUrl(
      window.PLAYTALK_ASSET_PUBLIC_ROOT
      || window.PLAYTALK_R2_PUBLIC_ROOT
      || ''
    );
  }

  function detectApiBaseUrl() {
    const configuredBaseUrl = readGlobalBaseUrl() || readStoredBaseUrl();
    if (configuredBaseUrl) return configuredBaseUrl;

    if (!window.location || !window.location.origin) {
      return LEGACY_RENDER_URL;
    }

    const { hostname, origin, protocol, port } = window.location;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

    if (protocol === 'file:') {
      return 'http://localhost:3000';
    }

    if (isLocalhost && port !== '3000') {
      return 'http://localhost:3000';
    }

    return origin;
  }

  let apiBaseUrl = detectApiBaseUrl();
  const publicAssetsRoot = readGlobalAssetsBaseUrl() || DEFAULT_PUBLIC_ASSETS_ROOT;

  function normalizePath(path) {
    if (!path) return '/';
    return path.startsWith('/') ? path : `/${path}`;
  }

  function buildApiUrl(path) {
    return `${apiBaseUrl}${normalizePath(path)}`;
  }

  function wait(ms) {
    return new Promise((resolve) => {
      window.setTimeout(resolve, Math.max(0, Number(ms) || 0));
    });
  }

  function getAuthToken() {
    try {
      return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || '';
    } catch (_error) {
      return '';
    }
  }

  function hasAuthToken() {
    return Boolean(getAuthToken());
  }

  function setAuthToken(token) {
    try {
      const normalized = typeof token === 'string' ? token.trim() : '';
      if (normalized) {
        localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, normalized);
      } else {
        localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
      }
      return true;
    } catch (_error) {
      return false;
    }
  }

  function buildAuthHeaders(extraHeaders) {
    const headers = {
      ...(extraHeaders || {})
    };
    const token = getAuthToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  }

  async function fetchSessionUser(options = {}) {
    const attempts = Math.max(1, Math.min(4, Number(options.attempts) || (hasAuthToken() ? 3 : 1)));
    const retryDelayMs = Math.max(0, Number(options.retryDelayMs) || 350);
    const extraHeaders = options.headers && typeof options.headers === 'object' ? options.headers : undefined;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const response = await fetch(buildApiUrl('/auth/session'), {
          headers: buildAuthHeaders(extraHeaders),
          cache: 'no-store',
          credentials: 'include'
        });
        const payload = await response.json().catch(() => ({}));

        if (response.ok && payload?.success && payload?.user) {
          return payload.user;
        }

        const shouldRetry = attempt < attempts && (response.status === 401 || response.status === 403 || response.status >= 500);
        if (!shouldRetry) {
          return null;
        }
      } catch (_error) {
        if (attempt >= attempts) {
          return null;
        }
      }

      await wait(retryDelayMs * attempt);
    }

    return null;
  }

  function buildAccesskeyUrl(relativePath = '') {
    return joinPublicAssetUrl(publicAssetsRoot, `accesskey/${relativePath}`);
  }

  function buildAudiostutoUrl(relativePath = '') {
    return joinPublicAssetUrl(publicAssetsRoot, `audiostuto/${relativePath}`);
  }

  function rewritePublicAssetSources(root) {
    const scope = root && typeof root.querySelectorAll === 'function' ? root : document;
    const elements = Array.from(scope.querySelectorAll('[src]'));
    elements.forEach((element) => {
      const current = String(element.getAttribute('src') || '').trim();
      if (!current) return;

      if (current.startsWith('/accesskey/')) {
        element.setAttribute('src', buildAccesskeyUrl(current.slice('/accesskey/'.length)));
        return;
      }

      if (current.startsWith('/audiostuto/')) {
        element.setAttribute('src', buildAudiostutoUrl(current.slice('/audiostuto/'.length)));
      }
    });
  }

  window.PlaytalkApi = {
    get baseUrl() {
      return apiBaseUrl;
    },
    get publicAssetsRoot() {
      return publicAssetsRoot;
    },
    url: buildApiUrl,
    getAuthToken,
    hasAuthToken,
    setAuthToken,
    fetchSessionUser,
    authHeaders: buildAuthHeaders,
    accesskeyUrl: buildAccesskeyUrl,
    audiostutoUrl: buildAudiostutoUrl,
    rewritePublicAssetSources,
    setBaseUrl(nextBaseUrl) {
      const normalized = normalizeBaseUrl(nextBaseUrl);
      try {
        if (normalized) {
          window.localStorage.setItem(API_BASE_URL_STORAGE_KEY, normalized);
          apiBaseUrl = normalized;
        } else {
          window.localStorage.removeItem(API_BASE_URL_STORAGE_KEY);
          apiBaseUrl = detectApiBaseUrl();
        }
      } catch (_error) {
        return false;
      }
      return true;
    }
  };
})();
