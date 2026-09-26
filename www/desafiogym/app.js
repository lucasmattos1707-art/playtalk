(() => {
  const $ = (selector) => document.querySelector(selector);
  const dialog = $('#camera-dialog');
  const openButton = $('#open-submit');
  const closeButton = $('#dialog-close');
  const profilePicker = $('#profile-picker');
  const cameraStage = $('#camera-stage');
  const verificationStage = $('#verification-stage');
  const resultStage = $('#result-stage');
  const video = $('#camera-video');
  const canvas = $('#camera-canvas');
  const captureButton = $('#capture-photo');
  const tryAgainButton = $('#try-again');
  const statusLine = $('#dialog-status');
  let stream = null;
  let selectedParticipant = '';
  let state = null;

  const people = {
    kelly: { name: 'Kelly', avatar: '/desafiogym/kelly.png', color: 'pink' },
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

  function renderState(nextState) {
    state = nextState;
    const kelly = Number(state.scores?.kelly || 0);
    const lucas = Number(state.scores?.lucas || 0);
    const total = kelly + lucas;
    const kellyPercent = total ? Math.round((kelly / total) * 100) : 50;
    const lucasPercent = 100 - kellyPercent;
    $('#kelly-score').textContent = kelly;
    $('#lucas-score').textContent = lucas;
    $('#kelly-percent').textContent = `${kellyPercent}%`;
    $('#lucas-percent').textContent = `${lucasPercent}%`;
    $('#kelly-bar').style.width = `${kellyPercent}%`;
    $('#lucas-bar').style.width = `${lucasPercent}%`;
    $('#week-label').textContent = formatWeek(state.weekStart);

    ['kelly', 'lucas'].forEach((person) => {
      const points = Math.min(5, Number(state.week?.[person] || 0));
      $(`#${person}-week-text`).textContent = `${points} de 5 treino${points === 1 ? '' : 's'}`;
      renderDots($(`#${person}-dots`), points, people[person].color);
      const doneToday = Boolean(state.markedToday?.[person]);
      const reachedLimit = points >= 5;
      const picker = profilePicker.querySelector(`[data-person="${person}"]`);
      picker.disabled = state.isSunday || doneToday || reachedLimit;
      $(`#${person}-picker-status`).textContent = state.isSunday
        ? 'Domingo não vale ponto'
        : doneToday
          ? 'Ponto de hoje marcado'
          : reachedLimit
            ? '5 de 5 nesta semana'
            : 'Pronto para marcar';
    });

    openButton.disabled = Boolean(state.isSunday);
    $('#send-hint').textContent = state.isSunday
      ? 'Domingo é dia de descanso. A marcação volta amanhã.'
      : 'A câmera abre na hora. A foto é verificada automaticamente.';

    const history = $('#history-list');
    const recent = Array.isArray(state.recent) ? state.recent : [];
    history.innerHTML = recent.length ? recent.map((entry) => {
      const person = people[entry.participant] || people.lucas;
      return `<div class="history-item">
        <img src="${person.avatar}" alt="">
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
    setVisible(profilePicker, true);
    setVisible(cameraStage, false);
    setVisible(verificationStage, false);
    setVisible(resultStage, false);
    tryAgainButton.hidden = true;
    statusLine.textContent = '';
    $('#dialog-title').textContent = 'Quem treinou hoje?';
    $('#dialog-copy').textContent = 'Escolha seu perfil. A câmera abre direto — sem galeria.';
  }

  async function openCameraFor(participant) {
    selectedParticipant = participant;
    statusLine.textContent = '';
    $('#selected-avatar').src = people[participant].avatar;
    $('#selected-name').textContent = people[participant].name;
    $('#dialog-title').textContent = `Foto de ${people[participant].name}`;
    $('#dialog-copy').textContent = 'Mostre os aparelhos ou pesos ao fundo e toque no botão branco.';
    setVisible(profilePicker, false);
    setVisible(cameraStage, true);

    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Câmera não disponível neste aparelho.');
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 1600 } }
      });
      video.srcObject = stream;
      await video.play();
    } catch (error) {
      setVisible(cameraStage, false);
      setVisible(profilePicker, true);
      statusLine.textContent = error.name === 'NotAllowedError'
        ? 'Permita o acesso à câmera para enviar o treino.'
        : 'Não consegui abrir a câmera neste aparelho.';
    }
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

  async function sendPhoto(blob) {
    setVisible(cameraStage, false);
    setVisible(verificationStage, true);
    $('#dialog-title').textContent = 'Verificando treino';
    $('#dialog-copy').textContent = 'A IA está olhando apenas o ambiente da academia.';
    statusLine.textContent = '';
    const previewUrl = URL.createObjectURL(blob);
    $('#captured-preview').src = previewUrl;

    try {
      const response = await fetch(`/api/desafiogym/entries?participant=${encodeURIComponent(selectedParticipant)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'image/jpeg' },
        body: blob
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) throw new Error(payload.message || 'Não foi possível confirmar o treino.');
      renderState(payload);
      showResult(true, 'Ponto confirmado!', `${people[selectedParticipant].name} ganhou +1 ponto no placar.`);
      window.setTimeout(() => { if (dialog.open) dialog.close(); }, 1500);
    } catch (error) {
      showResult(false, 'Foto não confirmada', error.message);
    } finally {
      URL.revokeObjectURL(previewUrl);
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
    stopCamera();
    captureButton.disabled = false;
    if (!blob) {
      statusLine.textContent = 'A foto não saiu. Tente novamente.';
      return;
    }
    await sendPhoto(blob);
  }

  openButton.addEventListener('click', () => {
    resetDialog();
    dialog.showModal();
  });
  closeButton.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', resetDialog);
  dialog.addEventListener('cancel', stopCamera);
  profilePicker.addEventListener('click', (event) => {
    const button = event.target.closest('[data-person]');
    if (button && !button.disabled) openCameraFor(button.dataset.person);
  });
  captureButton.addEventListener('click', capturePhoto);
  tryAgainButton.addEventListener('click', () => {
    setVisible(resultStage, false);
    openCameraFor(selectedParticipant);
  });

  if (document.modelContext?.registerTool) {
    try {
      document.modelContext.registerTool({
        name: 'open_gym_checkin_camera',
        title: 'Abrir câmera do treino',
        description: 'Abre o fluxo visível para Kelly ou Lucas tirar uma foto da academia e solicitar um ponto.',
        inputSchema: {
          type: 'object',
          properties: { participant: { type: 'string', enum: ['kelly', 'lucas'] } },
          required: ['participant'],
          additionalProperties: false
        },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        async execute(input) {
          if (!people[input?.participant]) throw new Error('Participante inválido.');
          resetDialog();
          dialog.showModal();
          await openCameraFor(input.participant);
          return { status: 'camera_opened', participant: input.participant };
        }
      });
    } catch (_error) {
      // Navegadores sem WebMCP continuam com o fluxo visual normal.
    }
  }

  loadState();
})();
