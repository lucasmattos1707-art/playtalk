(function initPlaytalkOpenAiStt() {
  function isNativeRuntime() {
    try {
      if (window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function') {
        return Boolean(window.Capacitor.isNativePlatform());
      }
    } catch (_error) {
      // ignore
    }

    if (!window.location) return false;
    const protocol = String(window.location.protocol || '').toLowerCase();
    const hostname = String(window.location.hostname || '').toLowerCase();
    const port = String(window.location.port || '').trim();
    return protocol === 'capacitor:'
      || protocol === 'file:'
      || ((hostname === 'localhost' || hostname === '127.0.0.1') && !port);
  }

  function buildApiUrl(path) {
    if (window.PlaytalkApi && typeof window.PlaytalkApi.url === 'function') {
      return window.PlaytalkApi.url(path);
    }
    return path;
  }

  function canUseMediaRecorder() {
    return Boolean(
      navigator.mediaDevices
      && typeof navigator.mediaDevices.getUserMedia === 'function'
      && typeof window.MediaRecorder !== 'undefined'
    );
  }

  function normalizeLanguage(language) {
    const normalized = String(language || '').trim().toLowerCase();
    if (!normalized) return '';
    const [base] = normalized.split(/[-_]/);
    return /^[a-z]{2}$/.test(base) ? base : '';
  }

  function chooseRecorderMimeType() {
    if (typeof window.MediaRecorder === 'undefined' || typeof window.MediaRecorder.isTypeSupported !== 'function') {
      return '';
    }

    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/ogg'
    ];

    const supported = candidates.find((candidate) => window.MediaRecorder.isTypeSupported(candidate));
    return supported || '';
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Nao foi possivel ler o audio gravado.'));
      reader.readAsDataURL(blob);
    });
  }

  async function requestMicrophoneAccess() {
    if (!canUseMediaRecorder()) return false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch (_error) {
      return false;
    }
  }

  async function recordAudio(options = {}) {
    if (!canUseMediaRecorder()) {
      throw new Error('Gravacao por microfone nao e suportada neste dispositivo.');
    }

    const maxDurationMs = Number.isFinite(options.maxDurationMs)
      ? Math.max(1200, Number(options.maxDurationMs))
      : 5000;
    const mimeType = chooseRecorderMimeType();
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });

    return new Promise((resolve, reject) => {
      const recordedChunks = [];
      let settled = false;
      let stopTimer = 0;
      let recorder = null;

      const finish = (callback) => {
        if (settled) return;
        settled = true;
        if (stopTimer) {
          window.clearTimeout(stopTimer);
          stopTimer = 0;
        }
        stream.getTracks().forEach((track) => track.stop());
        if (typeof options.onRecordingStop === 'function') {
          try {
            options.onRecordingStop();
          } catch (_error) {
            // ignore
          }
        }
        callback();
      };

      try {
        recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      } catch (error) {
        finish(() => reject(error));
        return;
      }

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size) {
          recordedChunks.push(event.data);
        }
      };

      recorder.onerror = () => {
        finish(() => reject(new Error('Nao foi possivel gravar sua voz.')));
      };

      recorder.onstop = () => {
        finish(() => {
          if (!recordedChunks.length) {
            reject(new Error('Nenhum audio foi capturado.'));
            return;
          }
          const outputType = recorder && recorder.mimeType ? recorder.mimeType : (mimeType || 'audio/webm');
          resolve(new Blob(recordedChunks, { type: outputType }));
        });
      };

      try {
        recorder.start();
      } catch (error) {
        finish(() => reject(error));
        return;
      }

      if (typeof options.onRecordingStart === 'function') {
        try {
          options.onRecordingStart();
        } catch (_error) {
          // ignore
        }
      }

      stopTimer = window.setTimeout(() => {
        try {
          if (recorder && recorder.state !== 'inactive') {
            recorder.stop();
          }
        } catch (_error) {
          finish(() => reject(new Error('Nao foi possivel finalizar a gravacao.')));
        }
      }, maxDurationMs);
    });
  }

  async function transcribeBlob(blob, options = {}) {
    const response = await fetch(buildApiUrl('/api/stt/openai'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        audioDataUrl: await blobToDataUrl(blob),
        language: normalizeLanguage(options.language)
      })
    });

    let payload = null;
    try {
      payload = await response.json();
    } catch (_error) {
      payload = null;
    }

    if (!response.ok) {
      throw new Error(payload?.instructions || payload?.details || payload?.error || 'Erro ao transcrever audio.');
    }

    const text = String(payload?.text || '').trim();
    if (!text) {
      throw new Error('A transcricao veio vazia.');
    }

    return {
      text,
      model: String(payload?.model || '').trim()
    };
  }

  async function captureAndTranscribe(options = {}) {
    const blob = await recordAudio(options);
    const result = await transcribeBlob(blob, options);
    return result.text;
  }

  window.PlaytalkOpenAiStt = {
    buildApiUrl,
    isNativeRuntime,
    isSupported: canUseMediaRecorder,
    requestMicrophoneAccess,
    recordAudio,
    transcribeBlob,
    captureAndTranscribe
  };
})();
