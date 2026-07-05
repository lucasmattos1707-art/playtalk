(function initPlaytalkApiConfig() {
  const DEFAULT_REMOTE_API_BASE_URL = 'https://fluentlevelup.com';
  const DEFAULT_REMOTE_API_HOSTNAME = 'fluentlevelup.com';
  const LEGACY_REMOTE_API_HOSTNAMES = new Set([
    'fluentlevelup.com',
    'www.fluentlevelup.com'
  ]);
  const API_BASE_URL_STORAGE_KEY = 'playtalk_api_base_url';
  const AUTH_TOKEN_STORAGE_KEY = 'playtalk_auth_token';
  const LANGUAGE_BACKGROUND_STORAGE_KEY = 'playtalk_language_background_v1';
  const DEFAULT_PUBLIC_ASSETS_ROOT = 'https://pub-1208463a3c774431bf7e0ddcbd3cf670.r2.dev';
  const DEFAULT_LANGUAGE_BACKGROUND = Object.freeze({
    targetLanguage: 'english',
    accent: 'mix_100_0'
  });
  const APP_BACKGROUND_GRADIENT = 'radial-gradient(circle at 18% 14%, rgba(120, 235, 255, 0.98) 0%, rgba(58, 184, 255, 0.94) 24%, rgba(32, 116, 234, 0.92) 52%, rgba(18, 77, 184, 0.94) 74%), linear-gradient(180deg, rgba(42, 144, 247, 0.78) 0%, rgba(18, 108, 223, 0.88) 58%, rgba(83, 221, 206, 0.86) 100%)';
  const LANGUAGE_BACKGROUND_ASSET_PATHS = Object.freeze({
    english: Object.freeze({ primary: APP_BACKGROUND_GRADIENT, american: APP_BACKGROUND_GRADIENT, british: APP_BACKGROUND_GRADIENT }),
    spanish: Object.freeze({ primary: APP_BACKGROUND_GRADIENT }),
    french: Object.freeze({ primary: APP_BACKGROUND_GRADIENT }),
    german: Object.freeze({ primary: APP_BACKGROUND_GRADIENT }),
    portuguese: Object.freeze({ primary: APP_BACKGROUND_GRADIENT }),
    mandarin: Object.freeze({ primary: APP_BACKGROUND_GRADIENT })
  });

  function isNativeRuntime() {
    const capacitor = window.Capacitor || null;
    try {
      if (capacitor && typeof capacitor.isNativePlatform === 'function') {
        return Boolean(capacitor.isNativePlatform());
      }
    } catch (_error) {
      // ignore
    }

    try {
      if (capacitor && typeof capacitor.getPlatform === 'function') {
        const platform = String(capacitor.getPlatform() || '').toLowerCase();
        if (platform === 'android' || platform === 'ios') {
          return true;
        }
      }
    } catch (_error) {
      // ignore
    }

    try {
      const platform = String(capacitor && capacitor.platform || '').toLowerCase();
      if (platform === 'android' || platform === 'ios') {
        return true;
      }
    } catch (_error) {
      // ignore
    }

    const protocol = String(window.location?.protocol || '').toLowerCase();
    const hostname = String(window.location?.hostname || '').toLowerCase();
    return protocol === 'file:' || hostname === 'localhost' || hostname === '127.0.0.1' || hostname === 'app';
  }

  function normalizeBaseUrl(value) {
    if (typeof value !== 'string') return '';
    return value.trim().replace(/\/+$/, '');
  }

  function normalizeLanguageBackgroundTarget(value) {
    const normalized = String(value || '').trim().toLowerCase();
    return Object.prototype.hasOwnProperty.call(LANGUAGE_BACKGROUND_ASSET_PATHS, normalized)
      ? normalized
      : DEFAULT_LANGUAGE_BACKGROUND.targetLanguage;
  }

  function normalizeLanguageBackgroundAccent(value) {
    const normalized = String(value || '').trim().toLowerCase();
    return /^mix_\d{1,3}_\d{1,3}$/.test(normalized)
      ? normalized
      : DEFAULT_LANGUAGE_BACKGROUND.accent;
  }

  function pickEnglishBackgroundVariant(accent) {
    const normalizedAccent = normalizeLanguageBackgroundAccent(accent);
    const match = /^mix_(\d{1,3})_(\d{1,3})$/.exec(normalizedAccent);
    if (!match) return 'american';
    const american = Math.max(0, Math.min(100, Number.parseInt(match[1], 10) || 0));
    const british = Math.max(0, Math.min(100, Number.parseInt(match[2], 10) || 0));
    return british > american ? 'british' : 'american';
  }

  function readStoredLanguageBackgroundPreference() {
    try {
      const raw = window.localStorage.getItem(LANGUAGE_BACKGROUND_STORAGE_KEY);
      if (!raw) return { ...DEFAULT_LANGUAGE_BACKGROUND };
      const parsed = JSON.parse(raw);
      return {
        targetLanguage: normalizeLanguageBackgroundTarget(parsed?.targetLanguage),
        accent: normalizeLanguageBackgroundAccent(parsed?.accent)
      };
    } catch (_error) {
      return { ...DEFAULT_LANGUAGE_BACKGROUND };
    }
  }

  function writeStoredLanguageBackgroundPreference(preference) {
    const normalized = {
      targetLanguage: normalizeLanguageBackgroundTarget(preference?.targetLanguage),
      accent: normalizeLanguageBackgroundAccent(preference?.accent)
    };
    try {
      window.localStorage.setItem(LANGUAGE_BACKGROUND_STORAGE_KEY, JSON.stringify(normalized));
    } catch (_error) {
      // ignore
    }
    return normalized;
  }

  function resolveLanguageBackgroundUrls(preference = null) {
    const normalized = preference
      ? {
        targetLanguage: normalizeLanguageBackgroundTarget(preference?.targetLanguage),
        accent: normalizeLanguageBackgroundAccent(preference?.accent)
      }
      : readStoredLanguageBackgroundPreference();
    const targetAssets = LANGUAGE_BACKGROUND_ASSET_PATHS[normalized.targetLanguage]
      || LANGUAGE_BACKGROUND_ASSET_PATHS[DEFAULT_LANGUAGE_BACKGROUND.targetLanguage];
    let assetPath = safeAssetPath(targetAssets?.primary || '');
    if (normalized.targetLanguage === 'english') {
      const variant = pickEnglishBackgroundVariant(normalized.accent);
      assetPath = safeAssetPath(targetAssets?.[variant] || targetAssets?.american || '');
    }
    if (!assetPath) {
      assetPath = safeAssetPath(LANGUAGE_BACKGROUND_ASSET_PATHS.english?.american || '');
    }
    return {
      ...normalized,
      desktopUrl: assetPath,
      mobileUrl: assetPath
    };
  }

  function safeAssetPath(value) {
    const normalized = String(value || '').trim();
    if (!normalized) return '';
    if (normalized.startsWith('/') || normalized.includes('gradient(')) {
      return normalized;
    }
    return '';
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

  function shouldDiscardStoredBaseUrl(value) {
    try {
      const parsedUrl = new URL(normalizeBaseUrl(value));
      const hostname = parsedUrl.hostname.toLowerCase();
      const currentHostname = String(window.location?.hostname || '').toLowerCase();
      if (isNativeRuntime() && (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === 'app')) {
        return true;
      }
      return !LEGACY_REMOTE_API_HOSTNAMES.has(hostname)
        && hostname !== currentHostname
        && hostname !== 'localhost'
        && hostname !== '127.0.0.1'
        && hostname !== 'app';
    } catch (_error) {
      return false;
    }
  }

  function readStoredBaseUrl() {
    try {
      const storedBaseUrl = normalizeBaseUrl(window.localStorage.getItem(API_BASE_URL_STORAGE_KEY) || '');
      if (shouldDiscardStoredBaseUrl(storedBaseUrl)) {
        window.localStorage.removeItem(API_BASE_URL_STORAGE_KEY);
        return '';
      }
      return storedBaseUrl;
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

    if (isNativeRuntime()) {
      return DEFAULT_REMOTE_API_BASE_URL;
    }

    if (!window.location || !window.location.origin) {
      return DEFAULT_REMOTE_API_BASE_URL;
    }

    const { hostname, origin, protocol, port } = window.location;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === 'app';

    if (protocol === 'file:') {
      return DEFAULT_REMOTE_API_BASE_URL;
    }

    if (isLocalhost && port !== '3000') {
      return DEFAULT_REMOTE_API_BASE_URL;
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

  function applyLanguageBackgroundCssVars(root = document, preference = null) {
    if (!root || !root.documentElement) return;
    const selection = resolveLanguageBackgroundUrls(preference);
    const desktopUrl = selection.desktopUrl;
    const mobileUrl = selection.mobileUrl;
    root.documentElement.style.setProperty('--playtalk-global-bg-desktop', desktopUrl);
    root.documentElement.style.setProperty('--playtalk-global-bg-mobile', mobileUrl);
  }

  function applyGlobalBackgroundCssVars(root = document) {
    applyLanguageBackgroundCssVars(root);
  }

  async function fetchWithTimeout(resource, options = {}, timeoutMs = 0) {
    const timeout = Math.max(0, Number(timeoutMs) || 0);
    if (!timeout || typeof AbortController !== 'function') {
      return fetch(resource, options);
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeout);
    try {
      return await fetch(resource, {
        ...(options || {}),
        signal: controller.signal
      });
    } finally {
      window.clearTimeout(timer);
    }
  }

  function wait(ms) {
    return new Promise((resolve) => {
      window.setTimeout(resolve, Math.max(0, Number(ms) || 0));
    });
  }

  function getAuthToken() {
    if (!isNativeRuntime()) {
      return '';
    }
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
      if (!isNativeRuntime()) {
        localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
        return true;
      }
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
    if (isNativeRuntime()) {
      headers['X-Playtalk-Client'] = 'native';
    }
    const token = getAuthToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  }

  async function fetchSessionUser(options = {}) {
    const attempts = Math.max(1, Math.min(4, Number(options.attempts) || (hasAuthToken() ? 3 : 1)));
    const retryDelayMs = Math.max(0, Number(options.retryDelayMs) || 350);
    const timeoutMs = Math.max(1200, Number(options.timeoutMs) || 4200);
    const extraHeaders = options.headers && typeof options.headers === 'object' ? options.headers : undefined;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const response = await fetchWithTimeout(buildApiUrl('/auth/session'), {
          headers: buildAuthHeaders(extraHeaders),
          cache: 'no-store',
          credentials: 'include'
        }, timeoutMs);
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
    buildUrl: buildApiUrl,
    buildApiUrl,
    getAuthToken,
    hasAuthToken,
    setAuthToken,
    fetchSessionUser,
    authHeaders: buildAuthHeaders,
    buildAuthHeaders,
    accesskeyUrl: buildAccesskeyUrl,
    audiostutoUrl: buildAudiostutoUrl,
    rewritePublicAssetSources,
    getLanguageBackgroundPreference: readStoredLanguageBackgroundPreference,
    setLanguageBackgroundPreference(preference) {
      const normalized = writeStoredLanguageBackgroundPreference(preference);
      applyLanguageBackgroundCssVars(document, normalized);
      return normalized;
    },
    applyLanguageBackgroundCssVars,
    applyGlobalBackgroundCssVars,
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
      applyGlobalBackgroundCssVars(document);
      return true;
    }
  };

  if (!isNativeRuntime()) {
    setAuthToken('');
  }
  applyGlobalBackgroundCssVars(document);
})();
