(() => {
  const $ = (selector) => document.querySelector(selector);
  const dialog = $('#camera-dialog');
  const openButton = $('#open-submit');
  const closeButton = $('#dialog-close');
  const cameraFlow = $('#camera-flow');
  const verificationStage = $('#verification-stage');
  const resultStage = $('#result-stage');
  const video = $('#camera-video');
  const canvas = $('#camera-canvas');
  const captureButton = $('#capture-photo');
  const withoutPhotoButton = $('#register-without-photo');
  const tryAgainButton = $('#try-again');
  const statusLine = $('#dialog-status');
  let stream = null;
  let selectedParticipant = '';
  let state = null;
  let holdTimer = null;
  let holdActivated = false;
  let ignorePointerClick = false;

  const people = {
    kelly: { name: 'Kelly', avatar: '/desafiogym/kelly.png', color: 'orange' },
    lucas: { name: 'Lucas', avatar: '/desafiogym/lucas.jpeg', color: 'blue' }
  };

  function setVisible(element, visible) {
    element.hidden = !visible;
  }

  function stopCamera() {
    if (stream) stream.getTracks().forEach((track) => track.stop());
    stream = null;
    video.srcObject = null;
  }

  function formatDate(dateString) {
    if (!dateString) return '';
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' })
      .format(new Date(`${dateString}T12:00:00`)).replace('.', '');
  }

  function formatWeek(startString) {
    if (!startString) return '';
    const start = new Date(`${startString}T12:00:00`);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const short = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' });
    return `${short.format(start).replace('.', '')} — ${short.format(end).replace('.', '')}`;
  }

  function renderDots(target, amount, color) {
    target.innerHTML = Array.from({ length: 5 }, (_, index) =>
      `<i class="${index < amount ? `on ${color}` : ''}"></i>`
    ).join('');
  }

  function canRegister(participant) {
    if (!state || state.markedToday?.[participant]) return false;
    return Number(state.week?.[participant] || 0) < 5;
  }

  function renderState(nextState) {
    state = nextState;
    const kelly = Number(state.scores?.kelly || 0);
    const lucas = Number(state.scores?.lucas || 0);
    const total = kelly + lucas;
    const kellyPercent = total ? (kelly / total) * 100 : 50;
    const lucasPercent = 100 - kellyPercent;
    $('#kelly-score').textContent = kelly;
    $('#lucas-score').textContent = lucas;
    $('#kelly-bar').style.width = `${kellyPercent}%`;
    $('#lucas-bar').style.width = `${lucasPercent}%`;
    $('#week-label').textContent = formatWeek(state.weekStart);

    ['kelly', 'lucas'].forEach((person) => {
      const points = Math.min(5, Number(state.week?.[person] || 0));
      $(`#${person}-week-text`).textContent = `${points} de 5 treino${points === 1 ? '' : 's'}`;
      renderDots($(`#${person}-dots`), points, people[person].color);
    });

    const kellySent = Boolean(state.markedToday?.kelly);
    const nobodyCanRegister = !canRegister('kelly') && !canRegister('lucas');
    openButton.disabled = Boolean(nobodyCanRegister);
    $('#submit-label').textContent = kellySent ? 'Treino enviado' : 'Enviar treino';
    openButton.querySelector('small').textContent = kellySent ? 'hoje' : '+1 ponto';
    $('#send-hint').textContent = kellySent
      ? 'Seu treino de hoje já entrou no placar.'
      : 'Toque para abrir a câmera. A foto é opcional.';

    const history = $('#history-list');
    const recent = Array.isArray(state.recent) ? state.recent : [];
    history.innerHTML = recent.length ? recent.map((entry) => {
      const person = people[entry.participant] || people.lucas;
      const verifiedBadge = entry.verifiedByPhoto
        ? '<span class="verified-badge" title="Foto verificada" aria-label="Foto verificada">✓</span>'
        : '';
      return `<div class="history-item">
        <div class="history-avatar"><img src="${person.avatar}" alt="">${verifiedBadge}</div>
        <div><strong>${person.name}</strong><small>${formatDate(entry.trainingDate)}</small></div>
        <b>+1 ponto</b>
      </div>`;
    }).join('') : '<p class="empty">O primeiro treino da disputa ainda vai chegar.</p>';
  }

  async function loadState() {
    try {
      const response = await fetch('/api/desafiogym', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.message || 'Falha ao carregar.');
      renderState(payload);
    } catch (error) {
      $('#history-list').innerHTML = '<p class="empty">Não foi possível carregar o placar agora.</p>';
      $('#send-hint').textContent = error.message;
    }
  }

  function resetDialog() {
    stopCamera();
    selectedParticipant = '';
    setVisible(cameraFlow, false);
    setVisible(verificationStage, false);
    setVisible(resultStage, false);
    tryAgainButton.hidden = true;
    statusLine.textContent = '';
    $('#dialog-title').textContent = 'Enviar treino';
    $('#dialog-copy').textContent = 'A câmera abre direto — sem galeria.';
    captureButton.disabled = false;
    withoutPhotoButton.disabled = false;
  }

  async function openCameraFor(participant) {
    selectedParticipant = participant;
    statusLine.textContent = '';
    $('#selected-avatar').src = people[participant].avatar;
    $('#selected-name').textContent = people[participant].name;
    $('#dialog-title').textContent = 'Foto de verificação';
    $('#dialog-copy').textContent = 'Mostre os aparelhos ou pesos ao fundo e toque no botão branco.';
    setVisible(cameraFlow, true);

    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Câmera não disponível neste aparelho.');
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 1600 } }
      });
      video.srcObject = stream;
      await video.play();
    } catch (error) {
      statusLine.textContent = error.name === 'NotAllowedError'
        ? 'Permita a câmera ou use “Registrar sem foto”.'
        : 'Câmera indisponível. Você ainda pode registrar sem foto.';
    }
  }

  async function beginCheckin(participant) {
    if (!canRegister(participant)) return;
    resetDialog();
    dialog.showModal();
    await openCameraFor(participant);
  }

  function showResult(success, title, copy) {
    setVisible(verificationStage, false);
    setVisible(resultStage, true);
    $('#result-icon').textContent = success ? '✓' : '!';
    $('#result-icon').classList.toggle('error', !success);
    $('#result-title').textContent = title;
    $('#result-copy').textContent = copy;
    tryAgainButton.hidden = success;
  }

  async function sendRegistration(blob = null) {
    const participant = selectedParticipant;
    stopCamera();
    setVisible(cameraFlow, false);
    setVisible(verificationStage, true);
    $('#dialog-title').textContent = blob ? 'Verificando treino' : 'Registrando treino';
    $('#dialog-copy').textContent = blob
      ? 'A IA está olhando apenas o ambiente da academia.'
      : 'Só um instante para atualizar o placar.';
    statusLine.textContent = '';
    const previewUrl = blob ? URL.createObjectURL(blob) : people[participant].avatar;
    $('#captured-preview').src = previewUrl;

    try {
      const suffix = blob ? '' : '&withoutPhoto=1';
      const options = { method: 'POST' };
      if (blob) {
        options.headers = { 'Content-Type': 'image/jpeg' };
        options.body = blob;
      }
      const response = await fetch(`/api/desafiogym/entries?participant=${encodeURIComponent(participant)}${suffix}`, options);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) throw new Error(payload.message || 'Não foi possível confirmar o treino.');
      renderState(payload);
      if (participant === 'lucas') {
        dialog.close();
        return;
      }
      showResult(true, 'Treino enviado', 'Seu ponto já entrou no placar.');
      window.setTimeout(() => { if (dialog.open) dialog.close(); }, 1200);
    } catch (error) {
      showResult(false, blob ? 'Foto não confirmada' : 'Treino não registrado', error.message);
    } finally {
      if (blob) URL.revokeObjectURL(previewUrl);
    }
  }

  async function capturePhoto() {
    if (!stream || !video.videoWidth || !video.videoHeight) return;
    captureButton.disabled = true;
    const maxWidth = 1024;
    const scale = Math.min(1, maxWidth / video.videoWidth);
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', .82));
    captureButton.disabled = false;
    if (!blob) {
      statusLine.textContent = 'A foto não saiu. Tente novamente.';
      return;
    }
    await sendRegistration(blob);
  }

  function clearHold() {
    if (holdTimer) window.clearTimeout(holdTimer);
    holdTimer = null;
    openButton.classList.remove('is-holding');
  }

  openButton.addEventListener('pointerdown', (event) => {
    if (openButton.disabled || event.button !== 0) return;
    holdActivated = false;
    openButton.classList.add('is-holding');
    openButton.setPointerCapture?.(event.pointerId);
    holdTimer = window.setTimeout(() => {
      holdActivated = true;
      ignorePointerClick = true;
      clearHold();
      beginCheckin('lucas');
    }, 3000);
  });

  openButton.addEventListener('pointerup', () => {
    if (!holdTimer && !holdActivated) return;
    const shouldOpenKelly = !holdActivated;
    clearHold();
    ignorePointerClick = true;
    if (shouldOpenKelly) beginCheckin('kelly');
    window.setTimeout(() => { ignorePointerClick = false; }, 100);
  });

  openButton.addEventListener('pointercancel', clearHold);
  openButton.addEventListener('lostpointercapture', () => {
    if (!holdActivated) clearHold();
  });
  openButton.addEventListener('click', (event) => {
    if (ignorePointerClick) {
      event.preventDefault();
      return;
    }
    if (event.detail === 0) beginCheckin('kelly');
  });

  closeButton.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', resetDialog);
  dialog.addEventListener('cancel', stopCamera);
  captureButton.addEventListener('click', capturePhoto);
  withoutPhotoButton.addEventListener('click', () => {
    withoutPhotoButton.disabled = true;
    sendRegistration();
  });
  tryAgainButton.addEventListener('click', () => {
    setVisible(resultStage, false);
    openCameraFor(selectedParticipant);
  });

  if (document.modelContext?.registerTool) {
    try {
      document.modelContext.registerTool({
        name: 'open_gym_checkin_camera',
        title: 'Abrir câmera do treino',
        description: 'Abre o fluxo visível para tirar uma foto da academia e solicitar um ponto.',
        inputSchema: {
          type: 'object',
          properties: { participant: { type: 'string', enum: ['kelly', 'lucas'] } },
          required: ['participant'],
          additionalProperties: false
        },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        async execute(input) {
          if (!people[input?.participant]) throw new Error('Participante inválido.');
          await beginCheckin(input.participant);
          return { status: 'camera_opened', participant: input.participant };
        }
      });
    } catch (_error) {
      // Navegadores sem WebMCP continuam com o fluxo visual normal.
    }
  }

  loadState();
})();
