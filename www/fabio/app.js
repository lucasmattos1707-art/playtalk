(() => {
  const questions = Array.isArray(window.FABIO_QUESTIONS) ? window.FABIO_QUESTIONS : [];
  const state = { index: 0, answers: new Map(), hiddenQuestions: new Set(), recording: null, transcribing: false, pendingTranscript: '', toastTimer: 0 };
  const $ = (id) => document.getElementById(id);
  const card = $('questionCard');
  const api = async (url, options = {}) => {
    const response = await fetch(url, { credentials: 'same-origin', ...options, headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) } });
    let payload = {};
    try { payload = await response.json(); } catch (_) {}
    if (!response.ok) throw new Error(payload.message || payload.error || 'Não consegui concluir agora. Tente de novo.');
    return payload;
  };

  function showToast(message) {
    const toast = $('toast');
    toast.textContent = message;
    toast.classList.add('visible');
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => toast.classList.remove('visible'), 3300);
  }

  function openDialog(contentBuilder) {
    const root = $('dialogContent');
    root.replaceChildren();
    contentBuilder(root);
    $('modalBackdrop').hidden = false;
    $('dialog').focus();
  }

  function closeDialog() {
    $('modalBackdrop').hidden = true;
    $('dialogContent').replaceChildren();
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function icon(markup) {
    const holder = document.createElement('span');
    holder.innerHTML = markup;
    return holder.firstElementChild;
  }

  function visibleQuestions() {
    return questions.filter((question) => !state.hiddenQuestions.has(question.id));
  }

  function currentQuestion() {
    return visibleQuestions()[state.index] || null;
  }

  function setCard() {
    const visible = visibleQuestions();
    if (!visible.length) {
      card.classList.remove('is-answered');
      $('categoryLabel').textContent = '';
      $('questionNumber').textContent = '';
      $('questionText').textContent = 'Você ocultou todas as perguntas.';
      $('answeredBadge').hidden = true;
      $('viewAnswer').hidden = true;
      $('recordAnswer').disabled = true;
      $('hideQuestion').disabled = true;
      $('prevQuestion').disabled = true;
      $('nextQuestion').disabled = true;
      $('progressBar').style.width = '100%';
      $('answerProgressTrack').setAttribute('aria-valuemax', '0');
      $('answerProgressTrack').setAttribute('aria-valuenow', '0');
      $('answerProgressTrack').setAttribute('aria-valuetext', 'Nenhuma pergunta restante');
      return;
    }
    state.index = Math.min(Math.max(state.index, 0), visible.length - 1);
    const question = visible[state.index];
    const answer = state.answers.get(question.id);
    $('categoryLabel').textContent = question.category || 'Uma boa conversa';
    $('questionNumber').textContent = String(question.id).padStart(2, '0');
    $('questionText').textContent = question.prompt;
    const answered = Boolean(answer?.transcript);
    card.classList.toggle('is-answered', answered);
    $('answeredBadge').hidden = !answered;
    $('viewAnswer').hidden = !answered;
    const recordLabel = state.transcribing ? 'Transcrevendo gravação' : (state.recording ? 'Toque para parar a gravação' : (answered ? 'Gravar outra resposta' : 'Responder por voz'));
    $('recordAnswer').setAttribute('aria-label', recordLabel);
    $('recordAnswer').setAttribute('title', recordLabel);
    $('recordAnswer').classList.toggle('is-recording', Boolean(state.recording));
    $('recordAnswer').disabled = state.transcribing;
    $('hideQuestion').disabled = Boolean(state.recording || state.transcribing);
    const answeredCount = visible.reduce((count, item) => count + (state.answers.has(item.id) ? 1 : 0), 0);
    const progressTrack = $('answerProgressTrack');
    progressTrack.setAttribute('aria-valuemax', String(visible.length));
    progressTrack.setAttribute('aria-valuenow', String(answeredCount));
    progressTrack.setAttribute('aria-valuetext', `${answeredCount} de ${visible.length} perguntas não excluídas respondidas`);
    $('progressBar').style.width = `${Math.round((answeredCount / visible.length) * 100)}%`;
    $('prevQuestion').disabled = state.index === 0 || Boolean(state.recording || state.transcribing);
    $('nextQuestion').disabled = state.index === visible.length - 1 || Boolean(state.recording || state.transcribing);
    $('openQuestionList').disabled = Boolean(state.recording || state.transcribing);
    $('viewAnswer').disabled = Boolean(state.recording || state.transcribing);
    try { localStorage.setItem('fabio-question-index', String(state.index)); } catch (_) {}
  }

  function move(direction) {
    if (state.recording || state.transcribing) return;
    const next = Math.min(visibleQuestions().length - 1, Math.max(0, state.index + direction));
    if (next === state.index) return;
    state.index = next;
    setCard();
    card.animate([{ transform: `translateX(${direction > 0 ? '14px' : '-14px'})`, opacity: .65 }, { transform: 'translateX(0)', opacity: 1 }], { duration: 190, easing: 'ease-out' });
  }

  function showNamePrompt() {
    openDialog((root) => {
      root.append(element('span', 'eyebrow', 'Antes de começar'));
      root.append(element('h2', '', 'Como podemos chamar você?'));
      root.append(element('p', '', 'Assim, a equipe consegue identificar de quem é cada resposta. Você pode voltar a este link neste aparelho e continuar de onde parou.'));
      const label = element('label', 'field-label', 'Seu nome');
      label.htmlFor = 'participantName';
      root.append(label);
      const input = element('input', 'text-field');
      input.id = 'participantName'; input.name = 'name'; input.autocomplete = 'name'; input.maxLength = 80; input.placeholder = 'Digite seu nome';
      root.append(input);
      const actions = element('div', 'dialog-actions');
      const button = element('button', 'primary-button', 'Começar a conversa'); button.type = 'button';
      button.addEventListener('click', async () => {
        const name = input.value.trim();
        if (!name) { input.focus(); return; }
        button.disabled = true;
        try {
          const payload = await api('/api/fabio/session', { method: 'POST', body: JSON.stringify({ name }) });
          state.answers = new Map((payload.answers || []).map((answer) => [Number(answer.questionId), answer]));
          state.hiddenQuestions = new Set((payload.hiddenQuestionIds || []).map(Number));
          closeDialog(); setCard();
        } catch (error) { showToast(error.message); button.disabled = false; }
      });
      input.addEventListener('keydown', (event) => { if (event.key === 'Enter') button.click(); });
      actions.append(button); root.append(actions);
      setTimeout(() => input.focus(), 30);
    });
  }

  function showAnswer(questionId) {
    const answer = state.answers.get(questionId);
    const question = questions.find((item) => item.id === questionId);
    if (!answer || !question) return;
    openDialog((root) => {
      root.append(element('span', 'eyebrow', `Pergunta ${String(questionId).padStart(2, '0')} · ${question.category}`));
      root.append(element('h2', '', 'Sua resposta'));
      root.append(element('p', '', question.prompt));
      root.append(element('blockquote', 'answer-quote', answer.transcript));
      const updatedAt = answer.updatedAt ? new Date(answer.updatedAt).toLocaleString('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }) : '';
      if (updatedAt) root.append(element('p', '', `Salva em ${updatedAt}`));
      const actions = element('div', 'dialog-actions');
      const close = element('button', 'secondary-button', 'Fechar'); close.type = 'button'; close.addEventListener('click', closeDialog);
      const record = element('button', 'primary-button', 'Gravar novamente'); record.type = 'button'; record.addEventListener('click', () => { closeDialog(); startRecording(); });
      actions.append(close, record); root.append(actions);
    });
  }

  function showQuestionList() {
    const visible = visibleQuestions();
    const answeredCount = visible.reduce((count, question) => count + (state.answers.has(question.id) ? 1 : 0), 0);
    openDialog((root) => {
      root.append(element('span', 'eyebrow', `${answeredCount} de ${visible.length} respondidas`));
      root.append(element('h2', '', 'Escolha uma pergunta'));
      if (!visible.length) { root.append(element('div', 'admin-empty', 'Nenhuma pergunta restante.')); return; }
      const scroll = element('div', 'list-scroll');
      for (const question of visible) {
        const answered = state.answers.has(question.id);
        const button = element('button', `question-item${answered ? ' answered' : ''}`);
        button.type = 'button';
        button.append(element('span', 'item-number', String(question.id).padStart(2, '0')));
        button.append(element('span', 'item-prompt', question.prompt));
        if (answered) button.append(icon('<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>'));
        button.addEventListener('click', () => { state.index = visibleQuestions().findIndex((item) => item.id === question.id); setCard(); closeDialog(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
        scroll.append(button);
      }
      root.append(scroll);
    });
  }

  function confirmHideQuestion() {
    const question = currentQuestion();
    if (!question) return;
    openDialog((root) => {
      root.append(element('span', 'eyebrow', `Pergunta ${String(question.id).padStart(2, '0')}`));
      root.append(element('h2', '', 'Ocultar esta pergunta?'));
      root.append(element('p', '', 'Ela não vai aparecer novamente na sua lista. A resposta já salva, se houver, continua disponível para o administrador.'));
      const actions = element('div', 'dialog-actions');
      const cancel = element('button', 'secondary-button', 'Cancelar');
      cancel.type = 'button'; cancel.addEventListener('click', closeDialog);
      const confirm = element('button', 'primary-button danger-confirm', 'Sim, ocultar');
      confirm.type = 'button';
      confirm.addEventListener('click', async () => {
        confirm.disabled = true;
        try {
          await api(`/api/fabio/questions/${question.id}/hide`, { method: 'POST', body: JSON.stringify({}) });
          state.hiddenQuestions.add(question.id);
          state.index = Math.min(state.index, visibleQuestions().length - 1);
          closeDialog(); setCard();
        } catch (error) { showToast(error.message); confirm.disabled = false; }
      });
      actions.append(cancel, confirm); root.append(actions);
    });
  }

  async function showAdminAnswers() {
    openDialog((root) => {
      root.append(element('span', 'eyebrow', 'Área administrativa'));
      root.append(element('h2', '', 'Respostas recebidas'));
      root.append(element('div', 'loading-state', 'Carregando as respostas…'));
    });
    try {
      const payload = await api('/api/admin/fabio/answers');
      const root = $('dialogContent'); root.replaceChildren();
      root.append(element('span', 'eyebrow', `${payload.answers.length} respostas`));
      root.append(element('h2', '', 'Respostas recebidas'));
      if (!payload.answers.length) { root.append(element('div', 'admin-empty', 'Ainda não chegaram respostas.')); return; }
      const list = element('div', 'list-scroll');
      for (const answer of payload.answers) {
        const block = element('article', 'admin-answer');
        const meta = element('div', 'admin-meta');
        meta.append(element('strong', '', answer.participantName));
        const date = answer.updatedAt ? new Date(answer.updatedAt).toLocaleString('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }) : '';
        meta.append(element('span', '', `Pergunta ${String(answer.questionId).padStart(2, '0')}${date ? ` · ${date}` : ''}`));
        block.append(meta);
        const question = questions.find((item) => item.id === Number(answer.questionId));
        if (question) block.append(element('div', 'admin-prompt', question.prompt));
        block.append(element('div', 'admin-transcript', answer.transcript));
        list.append(block);
      }
      root.append(list);
    } catch (error) {
      const root = $('dialogContent'); root.replaceChildren();
      root.append(element('h2', '', 'Respostas recebidas'));
      root.append(element('p', '', error.message));
    }
  }

  async function saveTranscript(text) {
    const question = currentQuestion();
    if (!question) return;
    const payload = await api(`/api/fabio/answers/${question.id}`, { method: 'PUT', body: JSON.stringify({ transcript: text }) });
    state.answers.set(question.id, payload.answer);
    state.pendingTranscript = '';
    closeDialog(); setCard();
    showToast('Resposta salva. Pode seguir para a próxima!');
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Não consegui preparar o áudio para transcrição.'));
      reader.readAsDataURL(blob);
    });
  }

  function reviewTranscript(text) {
    const question = currentQuestion();
    if (!question) return;
    state.pendingTranscript = text;
    openDialog((root) => {
      root.append(element('span', 'eyebrow', `Pergunta ${String(question.id).padStart(2, '0')}`));
      root.append(element('h2', '', 'Confira a transcrição'));
      root.append(element('p', '', 'A resposta foi captada por voz e transcrita pela OpenAI. Se ficou boa, salve; se preferir, grave outra vez.'));
      root.append(element('blockquote', 'answer-quote transcript-preview', text));
      const actions = element('div', 'dialog-actions');
      const retry = element('button', 'secondary-button', 'Gravar outra vez'); retry.type = 'button'; retry.addEventListener('click', () => { closeDialog(); startRecording(); });
      const save = element('button', 'primary-button', state.answers.has(question.id) ? 'Atualizar resposta' : 'Salvar resposta'); save.type = 'button';
      save.addEventListener('click', async () => { save.disabled = true; try { await saveTranscript(text); } catch (error) { showToast(error.message); save.disabled = false; } });
      actions.append(retry, save); root.append(actions);
    });
  }

  async function startRecording() {
    if (state.recording) { state.recording.recorder.stop(); return; }
    if (!navigator.mediaDevices?.getUserMedia || typeof window.MediaRecorder === 'undefined') { showToast('Este navegador não oferece gravação por microfone.'); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      const choices = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
      const mimeType = choices.find((type) => MediaRecorder.isTypeSupported?.(type)) || '';
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      const chunks = [];
      let timeout = 0;
      recorder.ondataavailable = (event) => { if (event.data?.size) chunks.push(event.data); };
      recorder.onerror = () => { stream.getTracks().forEach((track) => track.stop()); state.recording = null; setCard(); showToast('Não consegui gravar sua voz. Tente de novo.'); };
      recorder.onstop = async () => {
        clearTimeout(timeout); stream.getTracks().forEach((track) => track.stop()); state.recording = null; state.transcribing = true;
        $('recordAnswer').classList.remove('is-recording');
        $('recordAnswer').classList.add('is-transcribing');
        setCard();
        showToast('Transcrevendo sua resposta…');
        try {
          if (!chunks.length) throw new Error('Nenhum áudio foi capturado.');
          const blob = new Blob(chunks, { type: recorder.mimeType || mimeType || 'audio/webm' });
          const transcript = await api('/api/fabio/transcribe', { method: 'POST', body: JSON.stringify({ audioDataUrl: await blobToDataUrl(blob) }) });
          state.transcribing = false; $('recordAnswer').classList.remove('is-transcribing'); setCard(); reviewTranscript(transcript.text);
        } catch (error) { state.transcribing = false; $('recordAnswer').classList.remove('is-transcribing'); setCard(); showToast(error.message); }
      };
      state.recording = { recorder };
      recorder.start();
      setCard();
      timeout = setTimeout(() => { if (recorder.state !== 'inactive') recorder.stop(); }, 90000);
    } catch (error) {
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') showToast('Libere o microfone no navegador para responder.');
      else showToast('Não consegui acessar o microfone. Confira as permissões do aparelho.');
    }
  }

  async function initialize() {
    if (!questions.length) { showToast('Não consegui carregar as perguntas. Atualize a página.'); return; }
    try {
      const savedIndex = Number(localStorage.getItem('fabio-question-index'));
      if (Number.isInteger(savedIndex) && savedIndex >= 0 && savedIndex < questions.length) state.index = savedIndex;
    } catch (_) {}
    setCard();
    try {
      const session = await api('/api/fabio/session');
      state.answers = new Map((session.answers || []).map((answer) => [Number(answer.questionId), answer]));
      state.hiddenQuestions = new Set((session.hiddenQuestionIds || []).map(Number));
      setCard();
    } catch (_) { showNamePrompt(); }
    api('/api/admin/fabio/answers').then(() => { $('adminTrigger').hidden = false; }).catch(() => {});
  }

  $('closeDialog').addEventListener('click', closeDialog);
  $('modalBackdrop').addEventListener('click', (event) => { if (event.target === $('modalBackdrop')) closeDialog(); });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !$('modalBackdrop').hidden) closeDialog();
    if ($('modalBackdrop').hidden && !state.recording && !state.transcribing && event.key === 'ArrowLeft') move(-1);
    if ($('modalBackdrop').hidden && !state.recording && !state.transcribing && event.key === 'ArrowRight') move(1);
  });
  $('prevQuestion').addEventListener('click', () => move(-1));
  $('nextQuestion').addEventListener('click', () => move(1));
  $('openQuestionList').addEventListener('click', showQuestionList);
  $('viewAnswer').addEventListener('click', () => { const question = currentQuestion(); if (question) showAnswer(question.id); });
  $('recordAnswer').addEventListener('click', startRecording);
  $('hideQuestion').addEventListener('click', confirmHideQuestion);
  $('adminTrigger').addEventListener('click', showAdminAnswers);
  let pointerStart = null;
  card.addEventListener('pointerdown', (event) => { pointerStart = { x: event.clientX, y: event.clientY }; });
  card.addEventListener('pointerup', (event) => {
    if (!pointerStart) return;
    const dx = event.clientX - pointerStart.x, dy = event.clientY - pointerStart.y; pointerStart = null;
    if (Math.abs(dx) > 58 && Math.abs(dx) > Math.abs(dy) * 1.3) move(dx < 0 ? 1 : -1);
  });
  card.addEventListener('pointercancel', () => { pointerStart = null; });
  initialize();
})();
