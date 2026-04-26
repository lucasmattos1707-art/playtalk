(function initPlaytalkNativeSpeech() {
  const NATIVE_WEB_SPEECH_ENABLED = true;

  function createFallbackPluginProxy() {
    const capacitor = window.Capacitor;
    if (!capacitor || typeof capacitor.nativePromise !== 'function') return null;
    return {
      async isAvailable() {
        return capacitor.nativePromise('PlaytalkSpeech', 'isAvailable');
      },
      async ensurePermissions() {
        return capacitor.nativePromise('PlaytalkSpeech', 'ensurePermissions');
      },
      async captureOnce(options) {
        return capacitor.nativePromise('PlaytalkSpeech', 'captureOnce', options || {});
      },
      async cancelListening() {
        return capacitor.nativePromise('PlaytalkSpeech', 'cancelListening');
      }
    };
  }

  function getCapacitorPlugin() {
    return window.Capacitor?.Plugins?.PlaytalkSpeech
      || window.PlaytalkSpeech
      || createFallbackPluginProxy()
      || null;
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

  function normalizeNativeSpeechErrorCode(error) {
    const code = String(error?.code || error?.error || 'unknown').trim().toLowerCase();
    if (!code) return 'unknown';
    if (code === 'permission_denied') return 'not-allowed';
    if (code === 'speech_timeout') return 'no-speech';
    if (code === 'audio') return 'audio-capture';
    if (code === 'network_timeout') return 'network';
    if (code === 'start_failed') return 'service-not-allowed';
    if (code === 'cancelled') return 'aborted';
    return code.replace(/_/g, '-');
  }

  function buildSpeechRecognitionResults(transcripts) {
    return transcripts.map((transcript) => {
      const alternative = {
        transcript,
        confidence: 1
      };
      const result = [alternative];
      result.isFinal = true;
      result.length = 1;
      return result;
    });
  }

  class PlaytalkNativeSpeechRecognition {
    constructor() {
      this.lang = 'en-US';
      this.continuous = false;
      this.interimResults = false;
      this.maxAlternatives = 1;

      this.onstart = null;
      this.onresult = null;
      this.onerror = null;
      this.onend = null;

      this._active = false;
      this._ending = false;
    }

    start() {
      if (this._active) {
        const error = new Error('Recognition already started.');
        error.code = 'INVALID_STATE';
        throw error;
      }

      this._active = true;
      this._ending = false;
      this._emit('start', this.onstart, { type: 'start' });

      Promise.resolve().then(async () => {
        try {
          const result = await captureOnce({
            language: typeof this.lang === 'string' ? this.lang : 'en-US',
            maxResults: Number.isFinite(this.maxAlternatives) ? this.maxAlternatives : 5,
            maxDurationMs: 10000
          });

          if (!this._active) return;

          const transcripts = normalizeTranscriptList(result);

          if (!transcripts.length) {
            this._emitError('no-speech', 'Nenhuma fala reconhecida.');
            return;
          }

          const results = buildSpeechRecognitionResults(transcripts);
          this._emit('result', this.onresult, {
            type: 'result',
            resultIndex: 0,
            results
          });
          this._finish();
        } catch (error) {
          if (!this._active) return;
          this._emitError(
            normalizeNativeSpeechErrorCode(error),
            String(error?.message || 'Native speech failed')
          );
        }
      });
    }

    stop() {
      if (!this._active) return;
      this._cancel('aborted', 'Captura encerrada.');
    }

    abort() {
      if (!this._active) return;
      this._cancel('aborted', 'Captura cancelada.');
    }

    _cancel(errorCode, message) {
      this._ending = true;
      Promise.resolve(cancelListening())
        .catch(() => {})
        .finally(() => {
          if (!this._active) return;
          this._emitError(errorCode, message);
        });
    }

    _emitError(code, message) {
      this._emit('error', this.onerror, {
        type: 'error',
        error: code,
        message
      });
      this._finish();
    }

    _finish() {
      if (!this._active) return;
      this._active = false;
      if (this._ending) {
        this._ending = false;
      }
      this._emit('end', this.onend, { type: 'end' });
    }

    _emit(_type, handler, payload) {
      if (typeof handler !== 'function') return;
      try {
        handler(payload);
      } catch (_error) {
        // ignore consumer callback failures
      }
    }
  }

  function installSpeechRecognitionPolyfill() {
    if (!NATIVE_WEB_SPEECH_ENABLED) return false;
    if (!isNativeRuntime()) return false;
    if (!getCapacitorPlugin()) return false;

    window.PlaytalkNativeSpeechRecognition = PlaytalkNativeSpeechRecognition;
    window.SpeechRecognition = PlaytalkNativeSpeechRecognition;
    window.webkitSpeechRecognition = PlaytalkNativeSpeechRecognition;
    return true;
  }

  async function captureForGameplay(options = {}) {
    // O microfone do jogo deve abrir apenas depois de uma acao explicita do jogador.
    // A captura e curta, em foreground, e serve so para avaliar a pronuncia da rodada atual.
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
    cancelListening,
    installSpeechRecognitionPolyfill
  };

  installSpeechRecognitionPolyfill();
})();
