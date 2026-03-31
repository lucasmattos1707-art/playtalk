(function initPlaytalkApiConfig() {
  const LEGACY_RENDER_URL = 'https://playtalk-dvv5.onrender.com';
  const API_BASE_URL_STORAGE_KEY = 'playtalk_api_base_url';
  const AUTH_TOKEN_STORAGE_KEY = 'playtalk_auth_token';

  function normalizeBaseUrl(value) {
    if (typeof value !== 'string') return '';
    return value.trim().replace(/\/+$/, '');
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

  function normalizePath(path) {
    if (!path) return '/';
    return path.startsWith('/') ? path : `/${path}`;
  }

  function buildApiUrl(path) {
    return `${apiBaseUrl}${normalizePath(path)}`;
  }

  function getAuthToken() {
    try {
      return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || '';
    } catch (_error) {
      return '';
    }
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

  window.PlaytalkApi = {
    get baseUrl() {
      return apiBaseUrl;
    },
    url: buildApiUrl,
    getAuthToken,
    setAuthToken,
    authHeaders: buildAuthHeaders,
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
