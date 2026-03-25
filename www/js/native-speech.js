(function initPlaytalkNativeSpeech() {
  function getPlugin() {
    try {
      return window.Capacitor?.Plugins?.SpeechRecognition || null;
    } catch (_error) {
      return null;
    }
  }

  function isNativeAndroidRuntime() {
    try {
      if (window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function') {
        if (!window.Capacitor.isNativePlatform()) {
          return false;
        }
      }
    } catch (_error) {
      return false;
    }

    const userAgent = String(window.navigator?.userAgent || '').toLowerCase();
    return userAgent.includes('android');
  }

  async function isSupported() {
    const plugin = getPlugin();
    if (!plugin || !isNativeAndroidRuntime()) return false;
    try {
      const result = await plugin.available();
      return Boolean(result?.available);
    } catch (_error) {
      return false;
    }
  }

  async function ensurePermissions() {
    const plugin = getPlugin();
    if (!plugin) return false;

    try {
      const current = await plugin.checkPermissions();
      if (current?.speechRecognition === 'granted') {
        return true;
      }
    } catch (_error) {
      // ignore
    }

    try {
      const requested = await plugin.requestPermissions();
      return requested?.speechRecognition === 'granted';
    } catch (_error) {
      return false;
    }
  }

  async function transcribeOnce(options = {}) {
    const plugin = getPlugin();
    if (!plugin) {
      throw new Error('SpeechRecognition nativo indisponivel.');
    }

    const allowed = await ensurePermissions();
    if (!allowed) {
      throw new Error('Permissao de microfone negada.');
    }

    const response = await plugin.start({
      language: String(options.language || 'en-US'),
      maxResults: 1,
      popup: true,
      partialResults: false,
      prompt: String(options.prompt || 'Fale agora')
    });

    const matches = Array.isArray(response?.matches) ? response.matches : [];
    return String(matches[0] || '').trim();
  }

  window.PlaytalkNativeSpeech = {
    getPlugin,
    isNativeAndroidRuntime,
    isSupported,
    ensurePermissions,
    transcribeOnce
  };
})();
