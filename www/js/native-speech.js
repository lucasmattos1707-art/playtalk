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

    try {
      await plugin.stop();
    } catch (_error) {
      // ignore
    }

    try {
      await plugin.removeAllListeners();
    } catch (_error) {
      // ignore
    }

    return new Promise(async (resolve, reject) => {
      let settled = false;
      let latestTranscript = '';
      let finishTimer = 0;
      let hardTimeout = 0;
      let partialHandle = null;
      let stateHandle = null;

      const cleanup = async () => {
        if (finishTimer) {
          window.clearTimeout(finishTimer);
          finishTimer = 0;
        }
        if (hardTimeout) {
          window.clearTimeout(hardTimeout);
          hardTimeout = 0;
        }
        try {
          if (partialHandle && typeof partialHandle.remove === 'function') {
            await partialHandle.remove();
          }
        } catch (_error) {
          // ignore
        }
        try {
          if (stateHandle && typeof stateHandle.remove === 'function') {
            await stateHandle.remove();
          }
        } catch (_error) {
          // ignore
        }
        try {
          await plugin.removeAllListeners();
        } catch (_error) {
          // ignore
        }
      };

      const finalize = async (callback) => {
        if (settled) return;
        settled = true;
        await cleanup();
        callback();
      };

      const scheduleResolve = () => {
        if (!latestTranscript) return;
        if (finishTimer) {
          window.clearTimeout(finishTimer);
        }
        finishTimer = window.setTimeout(async () => {
          try {
            await plugin.stop();
          } catch (_error) {
            // ignore
          }
          finalize(() => resolve(latestTranscript));
        }, 220);
      };

      try {
        partialHandle = await plugin.addListener('partialResults', (data) => {
          const matches = Array.isArray(data?.matches) ? data.matches : [];
          const nextTranscript = String(matches[0] || '').trim();
          if (!nextTranscript) return;
          latestTranscript = nextTranscript;
          scheduleResolve();
        });

        stateHandle = await plugin.addListener('listeningState', async (data) => {
          if (data?.status !== 'stopped') return;
          if (latestTranscript) {
            finalize(() => resolve(latestTranscript));
            return;
          }
          finalize(() => reject(new Error('No speech input')));
        });

        hardTimeout = window.setTimeout(async () => {
          try {
            await plugin.stop();
          } catch (_error) {
            // ignore
          }
          if (latestTranscript) {
            finalize(() => resolve(latestTranscript));
            return;
          }
          finalize(() => reject(new Error('Tempo de fala esgotado.')));
        }, Number(options.timeoutMs) > 0 ? Number(options.timeoutMs) : 6000);

        await plugin.start({
          language: String(options.language || 'en-US'),
          maxResults: 1,
          popup: false,
          partialResults: true
        });
      } catch (error) {
        finalize(() => reject(error));
      }
    });
  }

  window.PlaytalkNativeSpeech = {
    getPlugin,
    isNativeAndroidRuntime,
    isSupported,
    ensurePermissions,
    transcribeOnce
  };
})();
