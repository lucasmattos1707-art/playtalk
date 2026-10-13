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
  let bonusDrag = null;
  let refundBusy = false;
  const bonusSound = new Audio('/desafiogym/bonus-success.mp3');
  bonusSound.preload = 'auto';

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

  function renderDots(target, activityDates, weekStart) {
    const activeDates = new Set(activityDates || []);
    const start = new Date(`${weekStart}T12:00:00Z`);
    target.innerHTML = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start);
      date.setUTCDate(date.getUTCDate() + index);
      const dateString = date.toISOString().slice(0, 10);
      const dayLabel = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', timeZone: 'UTC' }).format(date);
      return `<i class="${activeDates.has(dateString) ? 'on' : ''}" title="${dayLabel}${activeDates.has(dateString) ? ': treino registrado' : ''}"></i>`;
    }).join('');
  }

  function canRegister(participant) {
    if (!state || state.markedToday?.[participant]) return false;
    return true;
  }

  function orderFighters(kelly, lucas) {
    const fighters = $('.fighters');
    const versus = $('.versus');
    const kellyFighter = $('.fighter-kelly');
    const lucasFighter = $('.fighter-lucas');
    const scoreBar = $('.score-bar');
    const kellyBar = $('#kelly-bar');
    const lucasBar = $('#lucas-bar');
    const lucasLeads = lucas > kelly;
    fighters.append(lucasLeads ? lucasFighter : kellyFighter, versus, lucasLeads ? kellyFighter : lucasFighter);
    scoreBar.append(lucasLeads ? lucasBar : kellyBar, lucasLeads ? kellyBar : lucasBar);
  }

  function showBonusToast(message, isError = false) {
    const toast = $('#bonus-toast');
    toast.textContent = message;
    toast.classList.toggle('error', isError);
    toast.classList.add('show');
    window.clearTimeout(showBonusToast.timer);
    showBonusToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2600);
  }

  function playBonusSound() {
    bonusSound.currentTime = 0;
    bonusSound.play().catch(() => {});
  }

  function animateScore(participant) {
    const score = $(`#${participant}-score`);
    score.classList.remove('bonus-pop');
    void score.offsetWidth;
    score.classList.add('bonus-pop');
    window.setTimeout(() => score.classList.remove('bonus-pop'), 720);
  }

  function renderState(nextState) {
    state = nextState;
    const kelly = Number(state.scores?.kelly || 0);
    const lucas = Number(state.scores?.lucas || 0);
    const total = kelly + lucas;
    const kellyPercent = total ? (kelly / total) * 100 : 50;
    const lucasPercent = 100 - kellyPercent;
    orderFighters(kelly, lucas);
    $('#kelly-score').textContent = kelly;
    $('#lucas-score').textContent = lucas;
    $('#kelly-bar').style.width = `${kellyPercent}%`;
    $('#lucas-bar').style.width = `${lucasPercent}%`;
    $('#week-label').textContent = formatWeek(state.weekStart);

    ['kelly', 'lucas'].forEach((person) => {
      const points = Math.min(5, Number(state.week?.[person] || 0));
      const bonus = Math.max(0, Number(state.bonus?.[person] || 0));
      $(`#${person}-week-text`).textContent = `${points}/5`;
      renderDots($(`#${person}-dots`), state.weekActivity?.[person], state.weekStart);
      $(`#${person}-bonus-count`).textContent = bonus;
      const orb = $(`#${person}-bonus`);
      orb.hidden = bonus < 1;
      orb.classList.toggle('empty', bonus < 1);
      orb.setAttribute('aria-label', `${people[person].name} tem ${bonus} ponto${bonus === 1 ? '' : 's'} bônus`);
    });

    const kellySent = Boolean(state.markedToday?.kelly);
    const nobodyCanRegister = !canRegister('kelly') && !canRegister('lucas');
    const kellyBonusMode = Boolean(state.bonusMode?.kelly);
    openButton.disabled = Boolean(nobodyCanRegister);
    openButton.classList.toggle('bonus-mode', !kellySent && kellyBonusMode);
    $('#submit-label').textContent = kellySent ? 'Treino enviado' : (kellyBonusMode ? 'Treino bônus' : 'Enviar treino');
    openButton.querySelector('small').textContent = kellySent ? 'hoje' : (kellyBonusMode ? '+1 bônus' : '+1 ponto');
    $('#send-hint').textContent = kellySent
      ? 'Seu treino de hoje já entrou no placar.'
      : (kellyBonusMode
        ? 'Você completou 5 treinos. O próximo vale um bônus.'
        : 'Toque para abrir a câmera. A foto é opcional.');

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
    const isBonus = Boolean(state?.bonusMode?.[participant]);
    $('#dialog-title').textContent = isBonus ? 'Treino bônus' : 'Foto de verificação';
    $('#dialog-copy').textContent = isBonus
      ? 'Mostre a academia e ganhe +1 bônus para completar outra semana.'
      : 'Mostre os aparelhos ou pesos ao fundo e toque no botão branco.';
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
      showResult(
        true,
        payload.bonusEarned ? 'Bônus conquistado!' : 'Treino enviado',
        payload.bonusEarned ? 'Seu bônus está pronto para completar outra semana.' : 'Seu ponto já entrou no placar.'
      );
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

  async function redeemBonus(participant) {
    if (Number(state?.bonus?.[participant] || 0) < 1) {
      showBonusToast(`${people[participant].name} ainda não tem bônus disponível.`, true);
      return;
    }

    const optimisticState = {
      ...state,
      scores: { ...state.scores, [participant]: Number(state.scores?.[participant] || 0) + 1 },
      bonus: { ...state.bonus, [participant]: Number(state.bonus?.[participant] || 0) - 1 }
    };
    renderState(optimisticState);
    animateScore(participant);
    playBonusSound();
    showBonusToast(`+1 para ${people[participant].name} — salvando…`);

    try {
      const response = await fetch(`/api/desafiogym/bonus/redeem?participant=${encodeURIComponent(participant)}`, { method: 'POST' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) throw new Error(payload.message || 'Não foi possível aplicar o bônus.');
      renderState(payload);
      showBonusToast(`+1 para ${people[participant].name} na semana ${formatWeek(payload.targetWeekStart)}`);
    } catch (error) {
      await loadState();
      showBonusToast(`${error.message} O placar foi sincronizado.`, true);
    }
  }

  function updateBonusDrag(event) {
    if (!bonusDrag || event.pointerId !== bonusDrag.pointerId) return;
    bonusDrag.token.style.left = `${event.clientX}px`;
    bonusDrag.token.style.top = `${event.clientY + 28}px`;
    const rect = bonusDrag.target.getBoundingClientRect();
    const overTarget = event.clientX >= rect.left - 12 && event.clientX <= rect.right + 12
      && event.clientY >= rect.top - 12 && event.clientY <= rect.bottom + 12;
    bonusDrag.overTarget = overTarget;
    bonusDrag.target.classList.toggle('bonus-drop-ready', overTarget);
  }

  function finishBonusDrag(event, cancelled = false) {
    if (!bonusDrag || event.pointerId !== bonusDrag.pointerId) return;
    const { orb, token, target, participant, overTarget } = bonusDrag;
    orb.classList.remove('dragging');
    target.classList.remove('bonus-drop-ready');
    token.remove();
    bonusDrag = null;
    if (!cancelled && overTarget) redeemBonus(participant);
  }

  function startBonusDrag(event) {
    if (event.button !== 0) return;
    const orb = event.currentTarget;
    const participant = orb.dataset.person;
    const balance = Number(state?.bonus?.[participant] || 0);
    if (balance < 1) {
      showBonusToast(`${people[participant].name} ainda não tem bônus disponível.`, true);
      return;
    }
    event.preventDefault();
    const token = document.createElement('span');
    token.className = 'bonus-drag-token';
    token.textContent = '1';
    document.body.append(token);
    orb.classList.add('dragging');
    bonusDrag = {
      participant,
      pointerId: event.pointerId,
      orb,
      token,
      target: $(`#${participant}-score`),
      overTarget: false
    };
    orb.setPointerCapture?.(event.pointerId);
    updateBonusDrag(event);
  }

  async function refundBonus(participant) {
    if (refundBusy) return;
    refundBusy = true;
    try {
      const response = await fetch(`/api/desafiogym/bonus/refund?participant=${encodeURIComponent(participant)}`, { method: 'POST' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) throw new Error(payload.message || 'Não foi possível devolver o bônus.');
      renderState(payload);
      animateScore(participant);
      playBonusSound();
      showBonusToast(`1 ponto voltou para os bônus de ${people[participant].name}.`);
    } catch (error) {
      showBonusToast(error.message, true);
    } finally {
      refundBusy = false;
    }
  }

  function installScoreHold(participant) {
    const score = $(`#${participant}-score`);
    let timer = null;
    let startX = 0;
    let startY = 0;
    const cancel = () => {
      if (timer) window.clearTimeout(timer);
      timer = null;
      score.classList.remove('bonus-refund-holding');
    };
    score.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 || refundBusy) return;
      startX = event.clientX;
      startY = event.clientY;
      score.setPointerCapture?.(event.pointerId);
      score.classList.add('bonus-refund-holding');
      timer = window.setTimeout(() => {
        timer = null;
        score.classList.remove('bonus-refund-holding');
        refundBonus(participant);
      }, 3000);
    });
    score.addEventListener('pointermove', (event) => {
      if (timer && Math.hypot(event.clientX - startX, event.clientY - startY) > 14) cancel();
    });
    score.addEventListener('pointerup', cancel);
    score.addEventListener('pointercancel', cancel);
    score.addEventListener('lostpointercapture', cancel);
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

  document.querySelectorAll('.bonus-orb').forEach((orb) => orb.addEventListener('pointerdown', startBonusDrag));
  window.addEventListener('pointermove', updateBonusDrag);
  window.addEventListener('pointerup', (event) => finishBonusDrag(event));
  window.addEventListener('pointercancel', (event) => finishBonusDrag(event, true));
  installScoreHold('kelly');
  installScoreHold('lucas');

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
