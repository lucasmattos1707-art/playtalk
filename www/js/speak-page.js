(function () {
  const form = document.getElementById('speak-form');
  const voiceSelect = document.getElementById('voice-select');
  const textInput = document.getElementById('text-input');
  const generateBtn = document.getElementById('generate-btn');
  const clearBtn = document.getElementById('clear-btn');
  const statusMessage = document.getElementById('status-message');
  const charCount = document.getElementById('char-count');
  const audioPreview = document.getElementById('audio-preview');
  const lastFileName = document.getElementById('last-file-name');
  const modelLabel = document.getElementById('tts-model-label');
  const sttModelLabel = document.getElementById('stt-model-label');
  const chatModelLabel = document.getElementById('chat-model-label');
  const recordBtn = document.getElementById('record-btn');
  const stopRecordBtn = document.getElementById('stop-record-btn');
  const chatToggleBtn = document.getElementById('chat-toggle-btn');
  const chatCard = document.getElementById('chat-card');
  const chatMessages = document.getElementById('chat-messages');
  const chatInput = document.getElementById('chat-input');
  const chatSendBtn = document.getElementById('chat-send-btn');
  const chatUseAnswerBtn = document.getElementById('chat-use-answer-btn');

  const ttsModel = window.API_CONFIG?.openaiTtsModel || 'gpt-4o-mini-tts';
  const sttModel = window.API_CONFIG?.openaiSttModel || 'gpt-4o-mini-transcribe';
  const chatModel = window.API_CONFIG?.openaiChatModel || 'gpt-5-mini';

  modelLabel.textContent = ttsModel;
  sttModelLabel.textContent = sttModel;
  chatModelLabel.textContent = chatModel;

  let currentObjectUrl = '';
  let mediaRecorder = null;
  let mediaStream = null;
  let recordedChunks = [];
  let isRecording = false;
  let lastAssistantReply = '';
  const chatHistory = [];

  function updateCharCount() {
    const total = textInput.value.length;
    charCount.textContent = `${total} caractere${total === 1 ? '' : 's'}`;
  }

  function setStatus(message, tone) {
    statusMessage.textContent = message || '';
    statusMessage.dataset.tone = tone || '';
  }

  function revokePreviewUrl() {
    if (!currentObjectUrl) return;
    URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = '';
  }

  function buildFileName(voice, text) {
    const stem = String(text || '')
      .trim()
      .slice(0, 32)
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'texto';
    return `${stem}-${voice}-${Date.now()}.mp3`;
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Nao foi possivel ler o audio gravado.'));
      reader.readAsDataURL(blob);
    });
  }

  function appendChatMessage(role, content) {
    const message = document.createElement('div');
    message.className = `speak-chat-message speak-chat-message--${role}`;
    message.textContent = content;
    chatMessages.appendChild(message);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function setRecordingState(recording) {
    isRecording = recording;
    recordBtn.disabled = recording;
    stopRecordBtn.disabled = !recording;
    recordBtn.textContent = recording ? 'Gravando...' : 'Gravar voz';
  }

  async function generateSpeech(event) {
    event.preventDefault();

    const text = textInput.value.trim();
    const voice = voiceSelect.value.trim();

    if (!text) {
      setStatus('Cole um texto antes de gerar o audio.', 'error');
      textInput.focus();
      return;
    }

    generateBtn.disabled = true;
    clearBtn.disabled = true;
    setStatus('Gerando MP3 na OpenAI...', 'loading');

    try {
      const fileName = buildFileName(voice, text);
      const response = await fetch('/api/tts/openai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          voice,
          text,
          fileName
        })
      });

      if (!response.ok) {
        let payload = null;
        try {
          payload = await response.json();
        } catch (_error) {
          payload = null;
        }
        throw new Error(payload?.instructions || payload?.details || payload?.error || 'Erro ao gerar audio.');
      }

      const blob = await response.blob();
      revokePreviewUrl();
      currentObjectUrl = URL.createObjectURL(blob);
      audioPreview.src = currentObjectUrl;
      audioPreview.load();
      lastFileName.textContent = fileName;

      const downloadLink = document.createElement('a');
      downloadLink.href = currentObjectUrl;
      downloadLink.download = fileName;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();

      setStatus(`MP3 gerado com a voz ${voice} e download iniciado.`, 'success');
    } catch (error) {
      setStatus(error.message || 'Nao foi possivel gerar o audio.', 'error');
    } finally {
      generateBtn.disabled = false;
      clearBtn.disabled = false;
    }
  }

  async function transcribeAudio(blob) {
    setStatus('Enviando gravacao para transcricao...', 'loading');

    const response = await fetch('/api/stt/openai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        audioDataUrl: await blobToDataUrl(blob),
        language: 'pt'
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

    if (!payload?.text) {
      throw new Error('A transcricao veio vazia.');
    }

    textInput.value = payload.text;
    updateCharCount();
    setStatus('Texto preenchido pela sua voz.', 'success');
  }

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia || typeof window.MediaRecorder === 'undefined') {
      setStatus('Gravacao por microfone nao e suportada neste navegador.', 'error');
      return;
    }

    try {
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
        mediaStream?.getTracks().forEach((track) => track.stop());
        mediaStream = null;
        mediaRecorder = null;
        recordedChunks = [];
        setRecordingState(false);

        try {
          await transcribeAudio(blob);
        } catch (error) {
          setStatus(error.message || 'Nao foi possivel transcrever o audio.', 'error');
        }
      };

      mediaRecorder.start();
      setRecordingState(true);
      setStatus('Gravando sua voz... clique em Parar quando terminar.', 'loading');
    } catch (error) {
      setRecordingState(false);
      setStatus(error.message || 'Nao foi possivel acessar o microfone.', 'error');
    }
  }

  function stopRecording() {
    if (!mediaRecorder || !isRecording) return;
    mediaRecorder.stop();
    setStatus('Finalizando gravacao...', 'loading');
  }

  function toggleChatCard() {
    chatCard.classList.toggle('is-collapsed');
    const active = !chatCard.classList.contains('is-collapsed');
    chatToggleBtn.textContent = active ? 'Fechar chat GPT-5' : 'Ativar chat GPT-5';
    if (active) {
      chatInput.focus();
    }
  }

  async function sendChatMessage() {
    const content = chatInput.value.trim();
    if (!content) {
      chatInput.focus();
      return;
    }

    chatSendBtn.disabled = true;
    chatUseAnswerBtn.disabled = true;
    appendChatMessage('user', content);
    chatHistory.push({ role: 'user', content });
    chatInput.value = '';

    try {
      const response = await fetch('/api/chat/openai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [
            ...chatHistory,
            {
              role: 'user',
              content: `Texto atual no editor:\n${textInput.value.trim() || '(vazio)'}`
            }
          ]
        })
      });

      let payload = null;
      try {
        payload = await response.json();
      } catch (_error) {
        payload = null;
      }

      if (!response.ok) {
        throw new Error(payload?.instructions || payload?.details || payload?.error || 'Erro ao falar com o GPT-5.');
      }

      lastAssistantReply = String(payload?.text || '').trim();
      if (!lastAssistantReply) {
        throw new Error('O chat nao retornou resposta.');
      }

      chatHistory.push({ role: 'assistant', content: lastAssistantReply });
      appendChatMessage('assistant', lastAssistantReply);
      chatUseAnswerBtn.disabled = false;
    } catch (error) {
      appendChatMessage('assistant', error.message || 'Nao foi possivel obter resposta agora.');
    } finally {
      chatSendBtn.disabled = false;
    }
  }

  function useLastAssistantReply() {
    if (!lastAssistantReply) return;
    textInput.value = lastAssistantReply;
    updateCharCount();
    textInput.focus();
    setStatus('Resposta do chat enviada para o campo de texto.', 'success');
  }

  function clearForm() {
    textInput.value = '';
    updateCharCount();
    textInput.focus();
    setStatus('', '');
  }

  textInput.addEventListener('input', updateCharCount);
  form.addEventListener('submit', generateSpeech);
  clearBtn.addEventListener('click', clearForm);
  recordBtn.addEventListener('click', startRecording);
  stopRecordBtn.addEventListener('click', stopRecording);
  chatToggleBtn.addEventListener('click', toggleChatCard);
  chatSendBtn.addEventListener('click', sendChatMessage);
  chatUseAnswerBtn.addEventListener('click', useLastAssistantReply);
  chatInput.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      sendChatMessage();
    }
  });
  window.addEventListener('beforeunload', () => {
    revokePreviewUrl();
    mediaStream?.getTracks().forEach((track) => track.stop());
  });

  updateCharCount();
  setRecordingState(false);
})();
