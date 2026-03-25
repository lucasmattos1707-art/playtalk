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

  async function captureOnce(options = {}) {
    const plugin = getPlugin();
    if (!plugin) {
      throw new Error('SpeechRecognition nativo indisponivel.');
    }

    const allowed = await ensurePermissions();
    if (!allowed) {
      throw new Error('Permissao de microfone negada.');
    }

    const language = String(options.language || 'en-US');
    const prompt = String(options.prompt || 'Fale agora');
    const maxResults = Math.max(1, Math.min(5, Number.parseInt(options.maxResults, 10) || 5));
    const maxDurationMs = Math.max(1200, Number.parseInt(options.maxDurationMs, 10) || 8000);
    const silenceGraceMs = Math.max(400, Number.parseInt(options.silenceGraceMs, 10) || 700);
    let partialHandle = null;
    let listeningHandle = null;
    let stopTimer = 0;
    let settleTimer = 0;
    let settled = false;
    let bestTranscript = '';

    const cleanup = async () => {
      if (stopTimer) {
        window.clearTimeout(stopTimer);
        stopTimer = 0;
      }
      if (settleTimer) {
        window.clearTimeout(settleTimer);
        settleTimer = 0;
      }
      const removals = [];
      if (partialHandle && typeof partialHandle.remove === 'function') {
        removals.push(partialHandle.remove().catch(() => {}));
      }
      if (listeningHandle && typeof listeningHandle.remove === 'function') {
        removals.push(listeningHandle.remove().catch(() => {}));
      }
      partialHandle = null;
      listeningHandle = null;
      await Promise.all(removals);
    };

    return new Promise(async (resolve, reject) => {
      const finish = async (result, error) => {
        if (settled) return;
        settled = true;
        await cleanup();
        if (error) {
          reject(error);
          return;
        }
        resolve(String(result || '').trim());
      };

      try {
        partialHandle = await plugin.addListener('partialResults', (data) => {
          const matches = Array.isArray(data?.matches) ? data.matches : [];
          const nextTranscript = matches.find((item) => String(item || '').trim());
          if (nextTranscript) {
            bestTranscript = String(nextTranscript).trim();
          }
        });

        listeningHandle = await plugin.addListener('listeningState', ({ status }) => {
          if (status !== 'stopped') return;
          if (settleTimer) {
            window.clearTimeout(settleTimer);
          }
          settleTimer = window.setTimeout(() => {
            finish(bestTranscript).catch(() => {});
          }, silenceGraceMs);
        });

        stopTimer = window.setTimeout(() => {
          Promise.resolve(plugin.stop())
            .catch(() => {})
            .finally(() => {
              finish(bestTranscript).catch(() => {});
            });
        }, maxDurationMs);

        await plugin.start({
          language,
          maxResults,
          popup: false,
          partialResults: true,
          prompt
        });
      } catch (error) {
        finish('', error instanceof Error ? error : new Error('Nao foi possivel iniciar o reconhecimento nativo.')).catch(() => {});
      }
    });
  }

  window.PlaytalkNativeSpeech = {
    getPlugin,
    isNativeAndroidRuntime,
    isSupported,
    ensurePermissions,
    transcribeOnce,
    captureOnce
  };
})();
