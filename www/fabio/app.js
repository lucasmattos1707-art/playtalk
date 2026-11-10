(() => {
  const questions = Array.isArray(window.FABIO_QUESTIONS) ? window.FABIO_QUESTIONS : [];
  const state = { index: 0, answers: new Map(), recording: null, pendingTranscript: '', toastTimer: 0 };
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

  function setCard() {
    const question = questions[state.index];
    if (!question) return;
    const answer = state.answers.get(question.id);
    $('categoryLabel').textContent = question.category || 'Uma boa conversa';
    $('questionNumber').textContent = String(question.id).padStart(2, '0');
    $('questionText').textContent = question.prompt;
    $('progressCount').textContent = `${state.index + 1} de ${questions.length}`;
    const answered = Boolean(answer?.transcript);
    card.classList.toggle('is-answered', answered);
    $('answeredBadge').hidden = !answered;
    $('viewAnswer').hidden = !answered;
    $('recordTitle').textContent = state.recording ? 'Toque para parar e transcrever' : (answered ? 'Gravar outra resposta' : 'Responder por voz');
    $('recordSubtitle').textContent = state.recording ? 'A gravação está acontecendo' : (answered ? 'A transcrição anterior será substituída' : 'Fale com naturalidade; a OpenAI transcreve');
    const count = state.answers.size;
    $('progressBar').style.width = `${questions.length ? Math.round((count / questions.length) * 100) : 0}%`;
    document.querySelector('.progress-track').setAttribute('aria-valuenow', String(count));
    $('prevQuestion').disabled = state.index === 0;
    $('nextQuestion').disabled = state.index === questions.length - 1;
    try { localStorage.setItem('fabio-question-index', String(state.index)); } catch (_) {}
  }

  function move(direction) {
    if (state.recording) return;
    const next = Math.min(questions.length - 1, Math.max(0, state.index + direction));
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
    openDialog((root) => {
      root.append(element('span', 'eyebrow', `${state.answers.size} respostas salvas`));
      root.append(element('h2', '', 'Escolha uma pergunta'));
      root.append(element('p', '', 'As perguntas respondidas aparecem em verde.'));
      const scroll = element('div', 'list-scroll');
      for (const question of questions) {
        const answered = state.answers.has(question.id);
        const button = element('button', `question-item${answered ? ' answered' : ''}`);
        button.type = 'button';
        button.append(element('span', 'item-number', String(question.id).padStart(2, '0')));
        button.append(element('span', 'item-prompt', question.prompt));
        if (answered) button.append(icon('<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>'));
        button.addEventListener('click', () => { state.index = question.id - 1; setCard(); closeDialog(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
        scroll.append(button);
      }
      root.append(scroll);
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
    const question = questions[state.index];
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
    state.pendingTranscript = text;
    openDialog((root) => {
      const question = questions[state.index];
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
        clearTimeout(timeout); stream.getTracks().forEach((track) => track.stop()); state.recording = null;
        $('recordAnswer').disabled = true; $('recordTitle').textContent = 'Transcrevendo sua resposta…'; $('recordSubtitle').textContent = 'Só mais um instante';
        try {
          if (!chunks.length) throw new Error('Nenhum áudio foi capturado.');
          const blob = new Blob(chunks, { type: recorder.mimeType || mimeType || 'audio/webm' });
          const transcript = await api('/api/fabio/transcribe', { method: 'POST', body: JSON.stringify({ audioDataUrl: await blobToDataUrl(blob) }) });
          $('recordAnswer').disabled = false; setCard(); reviewTranscript(transcript.text);
        } catch (error) { $('recordAnswer').disabled = false; setCard(); showToast(error.message); }
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
      setCard();
    } catch (_) { showNamePrompt(); }
    api('/api/admin/fabio/answers').then(() => { $('adminTrigger').hidden = false; }).catch(() => {});
  }

  $('closeDialog').addEventListener('click', closeDialog);
  $('modalBackdrop').addEventListener('click', (event) => { if (event.target === $('modalBackdrop')) closeDialog(); });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !$('modalBackdrop').hidden) closeDialog();
    if ($('modalBackdrop').hidden && !state.recording && event.key === 'ArrowLeft') move(-1);
    if ($('modalBackdrop').hidden && !state.recording && event.key === 'ArrowRight') move(1);
  });
  $('prevQuestion').addEventListener('click', () => move(-1));
  $('nextQuestion').addEventListener('click', () => move(1));
  $('openQuestionList').addEventListener('click', showQuestionList);
  $('viewAnswer').addEventListener('click', () => showAnswer(questions[state.index].id));
  $('recordAnswer').addEventListener('click', startRecording);
  $('adminTrigger').addEventListener('click', showAdminAnswers);
  let pointerStart = null;
  card.addEventListener('pointerdown', (event) => { pointerStart = { x: event.clientX, y: event.clientY }; });
  card.addEventListener('pointerup', (event) => {
    if (!pointerStart) return;
    const dx = event.clientX - pointerStart.x, dy = event.clientY - pointerStart.y; pointerStart = null;
    if (Math.abs(dx) > 58 && Math.abs(dx) > Math.abs(dy) * 1.3) move(dx > 0 ? 1 : -1);
  });
  card.addEventListener('pointercancel', () => { pointerStart = null; });
  initialize();
})();
