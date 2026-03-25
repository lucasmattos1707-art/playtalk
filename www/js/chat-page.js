(function () {
  const form = document.getElementById('chat-form');
  const input = document.getElementById('chat-input');
  const count = document.getElementById('chat-count');
  const feed = document.getElementById('chat-feed');
  const recordingIndicator = document.getElementById('chat-recording-indicator');

  const MAX_INPUT_CHARS = 120;
  const MAX_OUTPUT_CHARS = 140;
  const chatHistory = [];
  const openAiStt = window.PlaytalkOpenAiStt || null;

  function buildApiUrl(path) {
    if (window.PlaytalkApi && typeof window.PlaytalkApi.url === 'function') {
      return window.PlaytalkApi.url(path);
    }
    return path;
  }

  let mediaRecorder = null;
  let mediaStream = null;
  let recordedChunks = [];
  let isRecording = false;

  function updateCount() {
    count.textContent = `${input.value.length}/${MAX_INPUT_CHARS}`;
  }

  async function animateText(element, text) {
    element.textContent = '';
    for (const char of text) {
      element.textContent += char;
      await new Promise(resolve => window.setTimeout(resolve, 16));
    }
  }

  async function appendMessage(role, text) {
    const node = document.createElement('div');
    node.className = `chat-line chat-line--${role}`;
    feed.appendChild(node);
    feed.scrollTop = feed.scrollHeight;
    await animateText(node, text);
    feed.scrollTop = feed.scrollHeight;
  }

  async function sendMessage(rawText) {
    const text = String(rawText || '').trim().slice(0, MAX_INPUT_CHARS);
    if (!text) {
      input.focus();
      return;
    }

    chatHistory.push({ role: 'user', content: text });
    await appendMessage('user', text);
    input.value = '';
    updateCount();

    const typingNode = document.createElement('div');
    typingNode.className = 'chat-line chat-line--assistant chat-line--pending';
    typingNode.textContent = '...';
    feed.appendChild(typingNode);
    feed.scrollTop = feed.scrollHeight;

    try {
      const response = await fetch(buildApiUrl('/api/chat/openai'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: chatHistory,
          maxOutputChars: MAX_OUTPUT_CHARS,
          systemPrompt: 'Responda em portugues do Brasil. Seja rapido, humano e claro. Nunca passe de 140 caracteres.'
        })
      });

      let payload = null;
      try {
        payload = await response.json();
      } catch (_error) {
        payload = null;
      }

      if (!response.ok) {
        throw new Error(payload?.instructions || payload?.details || payload?.error || 'Erro ao responder.');
      }

      const reply = String(payload?.text || '').trim().slice(0, MAX_OUTPUT_CHARS);
      if (!reply) {
        throw new Error('Resposta vazia.');
      }

      chatHistory.push({ role: 'assistant', content: reply });
      typingNode.remove();
      await appendMessage('assistant', reply);
    } catch (error) {
      typingNode.remove();
      await appendMessage('assistant', String(error.message || 'Erro ao responder.').slice(0, MAX_OUTPUT_CHARS));
    }
  }

  async function transcribeAudio(blob) {
    if (!openAiStt || typeof openAiStt.transcribeBlob !== 'function') {
      throw new Error('Reconhecimento de voz indisponivel neste dispositivo.');
    }

    const result = await openAiStt.transcribeBlob(blob, { language: 'pt' });
    return String(result?.text || '').trim().slice(0, MAX_INPUT_CHARS);
  }

  function setRecordingState(recording) {
    isRecording = recording;
    recordingIndicator.textContent = recording ? 'Gravando voz...' : 'R para voz';
    document.body.classList.toggle('is-recording', recording);
  }

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia || typeof window.MediaRecorder === 'undefined') {
      await appendMessage('assistant', 'Seu navegador nao suporta gravacao por voz.');
      return;
    }

    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recordedChunks = [];
    mediaRecorder = new MediaRecorder(mediaStream);
    mediaRecorder.ondataavailable = (event) => {
      if (event.data?.size) {
        recordedChunks.push(event.data);
      }
    };
    mediaRecorder.onstop = async () => {
      const mimeType = mediaRecorder?.mimeType || 'audio/webm';
      const blob = new Blob(recordedChunks, { type: mimeType });
      mediaStream?.getTracks().forEach(track => track.stop());
      mediaStream = null;
      mediaRecorder = null;
      recordedChunks = [];
      setRecordingState(false);

      try {
        const transcribed = await transcribeAudio(blob);
        await sendMessage(transcribed);
      } catch (error) {
        await appendMessage('assistant', String(error.message || 'Falha ao processar sua voz.').slice(0, MAX_OUTPUT_CHARS));
      }
    };
    mediaRecorder.start();
    setRecordingState(true);
  }

  function stopRecording() {
    if (!mediaRecorder || !isRecording) return;
    mediaRecorder.stop();
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    await sendMessage(input.value);
  });

  input.addEventListener('input', updateCount);
  input.addEventListener('keydown', async (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      await sendMessage(input.value);
    }
  });

  window.addEventListener('keydown', async (event) => {
    if (event.repeat) return;
    if (event.key.toLowerCase() !== 'r') return;
    if (document.activeElement === input && input.value.trim()) return;
    event.preventDefault();

    if (isRecording) {
      stopRecording();
      return;
    }

    try {
      await startRecording();
    } catch (error) {
      setRecordingState(false);
      await appendMessage('assistant', String(error.message || 'Nao consegui acessar o microfone.').slice(0, MAX_OUTPUT_CHARS));
    }
  });

  window.addEventListener('beforeunload', () => {
    mediaStream?.getTracks().forEach(track => track.stop());
  });

  updateCount();
  input.focus();
})();
