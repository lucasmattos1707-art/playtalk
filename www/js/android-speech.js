(function initPlaytalkNativeSpeech() {
  function getCapacitorPlugin() {
    return window.Capacitor?.Plugins?.PlaytalkSpeech || null;
  }

  function createNativeSpeechError(message, code) {
    const error = new Error(String(message || 'Native speech failed'));
    error.code = String(code || 'UNKNOWN').toUpperCase();
    return error;
  }

  function isNativeRuntime() {
    try {
      if (window.PlaytalkNative && typeof window.PlaytalkNative.isNativeRuntime === 'function') {
        return Boolean(window.PlaytalkNative.isNativeRuntime());
      }
    } catch (_error) {
      // ignore
    }
    try {
      if (window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function') {
        return Boolean(window.Capacitor.isNativePlatform());
      }
    } catch (_error) {
      // ignore
    }
    return false;
  }

  function isSupported() {
    return isNativeRuntime() && Boolean(getCapacitorPlugin());
  }

  async function isAvailable() {
    const plugin = getCapacitorPlugin();
    if (!plugin || typeof plugin.isAvailable !== 'function') return false;
    try {
      const result = await plugin.isAvailable();
      return Boolean(result?.available);
    } catch (_error) {
      return false;
    }
  }

  async function ensurePermissions() {
    const plugin = getCapacitorPlugin();
    if (!plugin || typeof plugin.ensurePermissions !== 'function') return false;
    try {
      const result = await plugin.ensurePermissions();
      return Boolean(result?.granted);
    } catch (_error) {
      return false;
    }
  }

  async function ensureGameplayCaptureReady() {
    if (!isSupported()) {
      throw createNativeSpeechError('Native speech unavailable', 'UNAVAILABLE');
    }

    const available = await isAvailable();
    if (!available) {
      throw createNativeSpeechError('Reconhecimento de voz nativo indisponivel neste aparelho.', 'UNAVAILABLE');
    }

    const granted = await ensurePermissions();
    if (!granted) {
      throw createNativeSpeechError('Permissao de microfone negada.', 'PERMISSION_DENIED');
    }
  }

  function normalizeTranscriptList(payload) {
    if (!payload) return [];
    const list = Array.isArray(payload) ? payload : [payload];
    return list
      .map((entry) => String(entry || '').trim())
      .filter(Boolean);
  }

  async function captureOnce(options = {}) {
    const plugin = getCapacitorPlugin();
    if (!plugin || typeof plugin.captureOnce !== 'function') {
      throw createNativeSpeechError('Native speech unavailable', 'UNAVAILABLE');
    }

    try {
      const result = await plugin.captureOnce({
        language: typeof options.language === 'string' ? options.language : 'en-US',
        maxResults: Number.isFinite(options.maxResults) ? options.maxResults : 5,
        maxDurationMs: Number.isFinite(options.maxDurationMs) ? options.maxDurationMs : 10000
      });
      const transcripts = normalizeTranscriptList(result?.transcripts);
      const transcript = String(result?.transcript || '').trim();
      return transcript || transcripts[0] || '';
    } catch (error) {
      const nativeError = error instanceof Error
        ? error
        : createNativeSpeechError(String(error || 'Native speech failed'), 'UNKNOWN');
      if (error && typeof error === 'object' && 'code' in error) {
        nativeError.code = String(error.code || 'UNKNOWN').toUpperCase();
      } else if (!nativeError.code) {
        nativeError.code = 'UNKNOWN';
      }
      throw nativeError;
    }
  }

  async function captureForGameplay(options = {}) {
    // O microfone do jogo deve abrir apenas depois de uma acao explicita do jogador.
    // A captura e curta, em foreground, e serve so para avaliar a pronuncia da rodada atual.
    await ensureGameplayCaptureReady();
    return captureOnce({
      language: typeof options.language === 'string' ? options.language : 'en-US',
      maxResults: Number.isFinite(options.maxResults) ? options.maxResults : 5,
      maxDurationMs: Number.isFinite(options.maxDurationMs) ? options.maxDurationMs : 7000
    });
  }

  async function cancelListening() {
    const plugin = getCapacitorPlugin();
    if (!plugin || typeof plugin.cancelListening !== 'function') return;
    try {
      await plugin.cancelListening();
    } catch (_error) {
      // ignore
    }
  }

  window.PlaytalkNativeSpeech = {
    isSupported,
    isAvailable,
    ensurePermissions,
    ensureGameplayCaptureReady,
    captureOnce,
    captureForGameplay,
    cancelListening
  };
})();
