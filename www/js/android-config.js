(function initPlaytalkAndroidConfig() {
  const DEFAULT_REMOTE_API_BASE_URL = 'https://www.fluentlevelup.com';

  function normalizeBaseUrl(value) {
    return typeof value === 'string' ? value.trim().replace(/\/+$/, '') : '';
  }

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

  if (!isNativeRuntime()) {
    return;
  }

  const configuredBaseUrl = normalizeBaseUrl(window.PLAYTALK_API_BASE_URL);
  if (!configuredBaseUrl) {
    window.PLAYTALK_API_BASE_URL = DEFAULT_REMOTE_API_BASE_URL;
  }

  window.PLAYTALK_NATIVE_ENABLED = true;
})();
