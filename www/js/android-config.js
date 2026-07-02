(function initPlaytalkAndroidConfig() {
  const DEFAULT_REMOTE_API_BASE_URL = 'https://fluentlevelup.com';

  function normalizeBaseUrl(value) {
    return typeof value === 'string' ? value.trim().replace(/\/+$/, '') : '';
  }

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

  if (!isNativeRuntime()) {
    return;
  }

  const configuredBaseUrl = normalizeBaseUrl(window.PLAYTALK_API_BASE_URL);
  if (!configuredBaseUrl) {
    window.PLAYTALK_API_BASE_URL = DEFAULT_REMOTE_API_BASE_URL;
  }

  window.PLAYTALK_NATIVE_ENABLED = true;
})();
