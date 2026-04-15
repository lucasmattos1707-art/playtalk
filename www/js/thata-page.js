(function () {
  const STORAGE_KEYS = {
    model: 'playtalk_thata_model',
    systemPrompt: 'playtalk_thata_system_prompt'
  };

  const MODEL_LABELS = {
    'gpt-5-nano': 'GPT-5 Nano',
    'gpt-5-mini': 'GPT-5 Mini',
    'gpt-5': 'GPT-5',
    'gpt-5.1': 'GPT-5.1',
    'gpt-5-chat-latest': 'GPT-5 Chat Latest',
    'gpt-4.1': 'GPT-4.1'
  };

  const DEFAULT_SYSTEM_PROMPT = [
    'Voce e um assistente totalmente guiado pelo prompt mestre do usuario.',
    'Siga o prompt mestre como autoridade principal de estilo, tom, personalidade e postura.',
    'Se o prompt mestre nao limitar idioma, responda em portugues do Brasil.',
    'Mantenha respostas claras, humanas e coerentes com a conversa.'
  ].join(' ');

  const feed = document.getElementById('thata-feed');
  const form = document.getElementById('thata-form');
  const input = document.getElementById('thata-input');
  const count = document.getElementById('thata-count');
  const modelSelect = document.getElementById('thata-model');
  const systemPromptInput = document.getElementById('thata-system-prompt');
  const applyPromptButton = document.getElementById('thata-apply-prompt');
  const promptStatus = document.getElementById('thata-prompt-status');
  const clearChatButton = document.getElementById('thata-clear-chat');

  const conversation = [];
  let isSending = false;

  function buildApiUrl(path) {
    if (window.PlaytalkApi && typeof window.PlaytalkApi.url === 'function') {
      return window.PlaytalkApi.url(path);
    }
    return path;
  }

  function savePreference(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (_error) {
      // Ignora falhas de storage.
    }
  }

  function loadPreference(key, fallback) {
    try {
      return window.localStorage.getItem(key) || fallback;
    } catch (_error) {
      return fallback;
    }
  }

  function updateCounter() {
    count.textContent = `${input.value.length}/2400`;
  }

  function getActiveSystemPrompt() {
    const userPrompt = String(systemPromptInput.value || '').trim();
    if (!userPrompt) return DEFAULT_SYSTEM_PROMPT;
    return `${DEFAULT_SYSTEM_PROMPT}\n\nPrompt mestre do usuario:\n${userPrompt}`;
  }

  function updatePromptStatus() {
    const currentModel = modelSelect.value;
    const currentPrompt = String(systemPromptInput.value || '').trim();
    const label = MODEL_LABELS[currentModel] || currentModel;
    promptStatus.textContent = currentPrompt
      ? `${label} configurado com o seu prompt mestre.`
      : `${label} pronto no modo neutro padrao.`;
  }

  function scrollFeedToBottom() {
    feed.scrollTop = feed.scrollHeight;
  }

  function createBubble(role, text, labelOverride) {
    const bubble = document.createElement('article');
    bubble.className = `thata-bubble thata-bubble--${role}`;

    const label = document.createElement('p');
    label.className = 'thata-bubble__label';
    label.textContent = labelOverride || (role === 'user' ? 'Usuario' : 'GPT');

    const content = document.createElement('p');
    content.className = 'thata-bubble__text';
    content.textContent = text;

    bubble.append(label, content);
    return bubble;
  }

  function appendBubble(role, text, labelOverride) {
    const bubble = createBubble(role, text, labelOverride);
    feed.appendChild(bubble);
    scrollFeedToBottom();
    return bubble;
  }

  function setSendingState(sending) {
    isSending = sending;
    form.classList.toggle('is-busy', sending);
    input.disabled = sending;
    modelSelect.disabled = sending;
    systemPromptInput.disabled = sending;
    applyPromptButton.disabled = sending;
    clearChatButton.disabled = sending;
  }

  async function sendMessage(rawText) {
    if (isSending) return;

    const text = String(rawText || '').trim();
    if (!text) {
      input.focus();
      return;
    }

    conversation.push({ role: 'user', content: text });
    appendBubble('user', text, 'Usuario');
    input.value = '';
    updateCounter();
    setSendingState(true);

    const model = modelSelect.value;
    const assistantLabel = MODEL_LABELS[model] || 'GPT';
    const typingBubble = appendBubble('assistant', 'Pensando...', assistantLabel);
    typingBubble.classList.add('thata-bubble--pending');

    try {
      const response = await fetch(buildApiUrl('/api/chat/openai'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages: conversation,
          systemPrompt: getActiveSystemPrompt()
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

      const reply = String(payload?.text || '').trim();
      if (!reply) {
        throw new Error('Resposta vazia.');
      }

      conversation.push({ role: 'assistant', content: reply });
      typingBubble.remove();
      appendBubble('assistant', reply, assistantLabel);
    } catch (error) {
      typingBubble.remove();
      appendBubble('assistant', String(error.message || 'Falha ao conversar.'), assistantLabel);
    } finally {
      setSendingState(false);
      input.focus();
    }
  }

  function clearChat() {
    conversation.length = 0;
    feed.innerHTML = '';
    appendBubble('assistant', 'Chat limpo. Pode mandar a proxima mensagem quando quiser.', MODEL_LABELS[modelSelect.value] || 'GPT');
    input.focus();
  }

  modelSelect.value = loadPreference(STORAGE_KEYS.model, modelSelect.value || 'gpt-5');
  systemPromptInput.value = loadPreference(STORAGE_KEYS.systemPrompt, '');
  updateCounter();
  updatePromptStatus();

  modelSelect.addEventListener('change', () => {
    savePreference(STORAGE_KEYS.model, modelSelect.value);
    updatePromptStatus();
  });

  systemPromptInput.addEventListener('input', () => {
    savePreference(STORAGE_KEYS.systemPrompt, systemPromptInput.value);
    updatePromptStatus();
  });

  applyPromptButton.addEventListener('click', () => {
    savePreference(STORAGE_KEYS.systemPrompt, systemPromptInput.value);
    updatePromptStatus();
    appendBubble('assistant', 'Prompt mestre atualizado. As proximas respostas vao seguir essa nova direcao.', MODEL_LABELS[modelSelect.value] || 'GPT');
  });

  clearChatButton.addEventListener('click', clearChat);

  input.addEventListener('input', updateCounter);
  input.addEventListener('keydown', async (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      await sendMessage(input.value);
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    await sendMessage(input.value);
  });

  input.focus();
})();
