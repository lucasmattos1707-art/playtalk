(() => {
  const $ = (selector) => document.querySelector(selector);
  const dialog = $('#checkin-dialog');
  const openButton = $('#open-submit');
  const closeButton = $('#dialog-close');
  const workoutChoice = $('#mark-workout');
  const creatineChoice = $('#mark-creatine');
  const activitySubmitButton = $('#activity-submit');
  const historyList = $('#history-list');
  let selectedParticipant = '';
  let selectedActivities = new Set();
  let state = null;
  let holdTimer = null;
  let holdActivated = false;
  let ignorePointerClick = false;
  let bonusDrag = null;
  let refundBusy = false;
  let submissionPending = false;
  let historyHold = null;
  const deletingHistoryEntries = new Set();
  const bonusSound = new Audio('/desafiogym/bonus-success.mp3');
  bonusSound.preload = 'auto';
  const workoutSuccessSound = new Audio('/desafiogym/success.mp3');
  workoutSuccessSound.preload = 'auto';
  const activationSound = new Audio('/desafiogym/mododesbloqueado.mp3');
  activationSound.preload = 'auto';

  const people = {
    kelly: { name: 'Kelly', avatar: '/desafiogym/kelly.png', color: 'orange' },
    lucas: { name: 'Lucas', avatar: '/desafiogym/lucas.jpeg', color: 'blue' }
  };

  function formatDate(dateString) {
    if (!dateString) return '';
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' })
      .format(new Date(`${dateString}T12:00:00`)).replace('.', '');
  }

  function dateForWeekday(startString, index) {
    const date = new Date(`${startString}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + index);
    return date.toISOString().slice(0, 10);
  }

  function todayInSaoPaulo() {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
    return `${values.year}-${values.month}-${values.day}`;
  }

  function renderDots(target, activityDates, weekStart) {
    const activeDates = new Set(activityDates || []);
    const today = todayInSaoPaulo();
    target.innerHTML = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(dateForWeekday(weekStart, index) + 'T12:00:00Z');
      const dateString = date.toISOString().slice(0, 10);
      const dayLabel = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', timeZone: 'UTC' }).format(date);
      const completed = activeDates.has(dateString);
      const passed = dateString < today;
      const icon = completed
        ? '<span class="day-check" aria-hidden="true">✓</span>'
        : (passed ? '<svg class="day-miss" viewBox="0 0 18 18" aria-hidden="true"><path d="m6 6 6 6m0-6-6 6"/></svg>' : '');
      const status = completed ? 'on' : (passed ? 'missed' : 'pending');
      const description = completed ? 'treino registrado' : (passed ? 'dia encerrado sem treino' : 'ainda disponível');
      return `<i class="${status}" title="${dayLabel}: ${description}">${icon}</i>`;
    }).join('');
  }

  function canRegister(participant) {
    if (!state || state.markedToday?.[participant]) return false;
    return true;
  }

  function canMarkCreatine(participant) {
    return Boolean(state) && !state.creatineMarkedToday?.[participant];
  }

  function canMarkAnything(participant) {
    return canRegister(participant) || canMarkCreatine(participant);
  }

  function orderFighters(kelly, lucas) {
    const fighters = $('.fighters');
    const kellyFighter = $('.fighter-kelly');
    const lucasFighter = $('.fighter-lucas');
    const scoreBar = $('.score-bar');
    const kellyBar = $('#kelly-bar');
    const lucasBar = $('#lucas-bar');
    const lucasLeads = lucas > kelly;
    fighters.append(lucasLeads ? lucasFighter : kellyFighter, lucasLeads ? kellyFighter : lucasFighter);
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

  function playSuccessSound() {
    bonusSound.currentTime = 0;
    bonusSound.play().catch(() => {});
  }

  function playActivationSound() {
    activationSound.currentTime = 0;
    activationSound.play().catch(() => {});
  }

  function playWorkoutSuccessSound() {
    workoutSuccessSound.currentTime = 0;
    workoutSuccessSound.play().catch(() => {});
  }

  function animateScore(participant, score = $(`#${participant}-score`)) {
    if (!score) return;
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
    $('#kelly-score').classList.remove('is-loading');
    $('#lucas-score').classList.remove('is-loading');
    $('#kelly-score').setAttribute('aria-label', `Pontos da Kelly: ${kelly}`);
    $('#lucas-score').setAttribute('aria-label', `Pontos do Lucas: ${lucas}`);
    $('#kelly-bar').style.width = `${kellyPercent}%`;
    $('#lucas-bar').style.width = `${lucasPercent}%`;

    ['kelly', 'lucas'].forEach((person) => {
      const creatineScore = Number(state.creatineScores?.[person] || 0);
      const score = $(`#${person}-creatine-score`);
      score.textContent = creatineScore.toLocaleString('pt-BR');
      score.setAttribute('aria-label', `Creatina da ${people[person].name}: ${creatineScore}`);
    });
    const creatineKelly = Number(state.creatineScores?.kelly || 0);
    const creatineLucas = Number(state.creatineScores?.lucas || 0);
    const leadingPerson = creatineLucas > creatineKelly ? 'lucas' : 'kelly';
    const trailingPerson = leadingPerson === 'kelly' ? 'lucas' : 'kelly';
    $('#creatine-left-side').replaceChildren($(`#${leadingPerson}-creatine-avatar`), $(`#${leadingPerson}-creatine-score`));
    $('#creatine-right-side').replaceChildren($(`#${trailingPerson}-creatine-score`), $(`#${trailingPerson}-creatine-avatar`));

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

    const nobodyCanRegister = !canMarkAnything('kelly') && !canMarkAnything('lucas');
    const kellyBonusMode = Boolean(state.bonusMode?.kelly);
    openButton.disabled = Boolean(nobodyCanRegister);
    openButton.classList.toggle('bonus-mode', canRegister('kelly') && kellyBonusMode);
    $('#submit-label').textContent = 'Enviar treino';
    renderActivityChoices();

    const recent = Array.isArray(state.recent) ? state.recent : [];
    historyList.innerHTML = recent.length ? recent.map((entry) => {
      const person = people[entry.participant] || people.lucas;
      return `<div class="history-item" data-entry-id="${entry.id || ''}" data-participant="${entry.participant}" data-training-date="${entry.trainingDate}" role="button" tabindex="0" aria-label="Treino de ${person.name} em ${formatDate(entry.trainingDate)}. Segure por 500 milissegundos para remover.">
        <div class="history-avatar"><img src="${person.avatar}" alt=""></div>
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
      ['kelly', 'lucas'].forEach((person) => {
        const score = $(`#${person}-score`);
        score.textContent = '—';
        score.classList.remove('is-loading');
        score.setAttribute('aria-label', 'Placar indisponível');
      });
      historyList.innerHTML = '<p class="empty">Não foi possível carregar o placar agora.</p>';
      showBonusToast(error.message, true);
    }
  }

  function beginHistoryHold(row, pointerId, clientX, clientY) {
    const entryId = String(row?.dataset?.entryId || '');
    if (!entryId || deletingHistoryEntries.has(entryId) || historyHold) return;
    const press = { row, entryId, pointerId, clientX, clientY, timer: null };
    historyHold = press;
    row.classList.add('is-holding');
    press.timer = window.setTimeout(() => {
      if (historyHold !== press) return;
      historyHold = null;
      row.classList.remove('is-holding');
      row.classList.add('is-removing');
      void removeRecentWorkout(row);
    }, 500);
  }

  function cancelHistoryHold(pointerId) {
    if (!historyHold || (pointerId !== undefined && historyHold.pointerId !== pointerId)) return;
    window.clearTimeout(historyHold.timer);
    historyHold.row.classList.remove('is-holding');
    historyHold = null;
  }

  function updateHistoryHold(event) {
    if (!historyHold || historyHold.pointerId !== event.pointerId) return;
    if (Math.hypot(event.clientX - historyHold.clientX, event.clientY - historyHold.clientY) > 12) {
      cancelHistoryHold(event.pointerId);
    }
  }

  async function removeRecentWorkout(row) {
    const entryId = String(row.dataset.entryId || '');
    const participant = row.dataset.participant;
    const trainingDate = row.dataset.trainingDate;
    if (!entryId || !people[participant] || deletingHistoryEntries.has(entryId)) return;
    deletingHistoryEntries.add(entryId);

    const weekActivity = [...(state.weekActivity?.[participant] || [])];
    const countedThisWeek = weekActivity.includes(trainingDate);
    const optimisticState = {
      ...state,
      scores: { ...state.scores, [participant]: Math.max(0, Number(state.scores?.[participant] || 0) - 1) },
      week: {
        ...state.week,
        [participant]: Math.max(0, Number(state.week?.[participant] || 0) - (countedThisWeek ? 1 : 0))
      },
      weekActivity: {
        ...state.weekActivity,
        [participant]: countedThisWeek ? weekActivity.filter((date) => date !== trainingDate) : weekActivity
      },
      recent: (state.recent || []).filter((entry) => String(entry.id) !== entryId)
    };
    if (trainingDate === state.today) {
      optimisticState.markedToday = { ...state.markedToday, [participant]: false };
      optimisticState.todayKind = { ...state.todayKind, [participant]: '' };
    }
    optimisticState.bonusMode = {
      ...state.bonusMode,
      [participant]: Number(optimisticState.week[participant] || 0) >= 5
    };
    renderState(optimisticState);

    try {
      const response = await fetch(`/api/desafiogym/entries/${encodeURIComponent(entryId)}`, { method: 'DELETE' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) throw new Error(payload.message || 'Não foi possível remover esse treino.');
      renderState(payload);
      showBonusToast(`Treino de ${people[participant].name} removido.`);
    } catch (error) {
      await loadState();
      showBonusToast(error.message, true);
    } finally {
      deletingHistoryEntries.delete(entryId);
    }
  }

  function renderActivityChoices() {
    if (!selectedParticipant || !state) return;
    const workoutMarked = !canRegister(selectedParticipant);
    const creatineMarked = !canMarkCreatine(selectedParticipant);
    workoutChoice.disabled = workoutMarked || submissionPending;
    creatineChoice.disabled = creatineMarked || submissionPending;
    workoutChoice.classList.toggle('is-marked', workoutMarked);
    creatineChoice.classList.toggle('is-marked', creatineMarked);
    workoutChoice.classList.toggle('is-selected', selectedActivities.has('workout') && !workoutMarked);
    creatineChoice.classList.toggle('is-selected', selectedActivities.has('creatine') && !creatineMarked);
    workoutChoice.setAttribute('aria-pressed', String(selectedActivities.has('workout') && !workoutMarked));
    creatineChoice.setAttribute('aria-pressed', String(selectedActivities.has('creatine') && !creatineMarked));
    workoutChoice.setAttribute('aria-label', workoutMarked ? 'Treino já marcado hoje' : 'Marcar treino');
    creatineChoice.setAttribute('aria-label', creatineMarked ? 'Creatina já marcada hoje' : 'Marcar creatina');
    const canSubmit = selectedActivities.size > 0
      && [...selectedActivities].every((activity) => activity === 'workout' ? !workoutMarked : !creatineMarked);
    activitySubmitButton.disabled = !canSubmit || submissionPending;
    activitySubmitButton.textContent = selectedActivities.size === 2
      ? 'Creatina e treino'
      : selectedActivities.has('workout') ? 'Enviar treino'
        : selectedActivities.has('creatine') ? 'Enviar creatina' : 'Escolha uma atividade';
  }

  function resetDialog() {
    selectedParticipant = '';
    submissionPending = false;
    selectedActivities.clear();
    workoutChoice.classList.remove('is-selected', 'is-marked');
    creatineChoice.classList.remove('is-selected', 'is-marked');
    workoutChoice.disabled = false;
    creatineChoice.disabled = false;
    activitySubmitButton.disabled = true;
    activitySubmitButton.textContent = 'Escolha uma atividade';
  }

  function openCheckin(participant) {
    if (!canMarkAnything(participant)) return;
    selectedParticipant = participant;
    selectedActivities.clear();
    renderActivityChoices();
    dialog.showModal();
  }

  function selectActivity(activity) {
    const isAvailable = activity === 'workout'
      ? canRegister(selectedParticipant)
      : activity === 'creatine' && canMarkCreatine(selectedParticipant);
    if (!isAvailable || submissionPending) return;
    if (selectedActivities.has(activity)) {
      selectedActivities.delete(activity);
    } else {
      selectedActivities.add(activity);
      playActivationSound();
    }
    renderActivityChoices();
  }

  function optimisticActivityState(participant, activities) {
    const next = {
      ...state,
      scores: { ...state.scores },
      week: { ...state.week },
      weekActivity: { ...state.weekActivity },
      markedToday: { ...state.markedToday },
      todayKind: { ...state.todayKind },
      bonus: { ...state.bonus },
      creatineScores: { ...state.creatineScores },
      creatineMarkedToday: { ...state.creatineMarkedToday }
    };
    let bonusEarned = false;
    if (activities.includes('creatine')) {
      next.creatineScores[participant] = Number(next.creatineScores[participant] || 0) + 1;
      next.creatineMarkedToday[participant] = true;
    }

    if (activities.includes('workout')) {
      bonusEarned = Number(state.week?.[participant] || 0) >= 5;
      next.markedToday[participant] = true;
      next.todayKind[participant] = bonusEarned ? 'bonus' : 'point';
      if (bonusEarned) {
        next.bonus[participant] = Number(next.bonus[participant] || 0) + 1;
      } else {
        next.scores[participant] = Number(next.scores[participant] || 0) + 1;
        next.week[participant] = Number(next.week[participant] || 0) + 1;
        const dates = [...(next.weekActivity[participant] || [])];
        if (!dates.includes(state.today)) dates.push(state.today);
        next.weekActivity[participant] = dates;
      }
    }
    return { state: next, bonusEarned };
  }

  async function persistActivity(participant, activities) {
    const results = await Promise.allSettled(activities.map(async (activity) => {
      const endpoint = activity === 'creatine' ? '/api/desafiogym/creatine' : '/api/desafiogym/entries';
      const response = await fetch(`${endpoint}?participant=${encodeURIComponent(participant)}`, { method: 'POST' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) throw new Error(payload.message || 'Não foi possível salvar a marcação.');
      return { activity, payload };
    }));
    const failed = results.find((result) => result.status === 'rejected');
    const bonusEarned = results.some((result) => result.status === 'fulfilled' && result.value.payload.bonusEarned);
    await loadState();
    if (bonusEarned) showBonusToast(`Treino marcado · bônus conquistado para ${people[participant].name}!`);
    if (failed) showBonusToast(`${failed.reason?.message || 'Não foi possível salvar a marcação.'} O placar foi sincronizado.`, true);
  }

  function submitActivity() {
    const participant = selectedParticipant;
    const activities = [...selectedActivities];
    if (!participant || !activities.length || submissionPending) return;
    if (activities.includes('workout') && !canRegister(participant)) return;
    if (activities.includes('creatine') && !canMarkCreatine(participant)) return;

    submissionPending = true;
    const optimistic = optimisticActivityState(participant, activities);
    renderState(optimistic.state);
    dialog.close();
    window.requestAnimationFrame(() => {
      if (activities.includes('creatine')) {
        animateScore(participant, $(`#${participant}-creatine-score`));
      }
      if (activities.includes('workout') && optimistic.bonusEarned) {
        animateScore(participant, $(`#${participant}-bonus`));
      } else if (activities.includes('workout')) {
        animateScore(participant);
      }
      if (activities.includes('workout')) playWorkoutSuccessSound();
      else playSuccessSound();
    });
    void persistActivity(participant, activities);
  }

  async function redeemBonus(participant) {
    if (Number(state?.bonus?.[participant] || 0) < 1) {
      showBonusToast(`${people[participant].name} ainda não tem bônus disponível.`, true);
      return;
    }
    if (state.markedToday?.[participant]) {
      showBonusToast(`O ponto de hoje para ${people[participant].name} já está marcado.`, true);
      return;
    }

    const today = state.today;
    const weekActivity = [...(state.weekActivity?.[participant] || [])];
    if (!weekActivity.includes(today)) weekActivity.push(today);

    const optimisticState = {
      ...state,
      scores: { ...state.scores, [participant]: Number(state.scores?.[participant] || 0) + 1 },
      week: { ...state.week, [participant]: Number(state.week?.[participant] || 0) + 1 },
      weekActivity: { ...state.weekActivity, [participant]: weekActivity },
      markedToday: { ...state.markedToday, [participant]: true },
      todayKind: { ...state.todayKind, [participant]: 'bonus' },
      bonus: { ...state.bonus, [participant]: Number(state.bonus?.[participant] || 0) - 1 }
    };
    renderState(optimisticState);
    showBonusToast(`+1 para ${people[participant].name} — salvando…`);

    try {
      const response = await fetch(`/api/desafiogym/bonus/redeem?participant=${encodeURIComponent(participant)}`, { method: 'POST' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) throw new Error(payload.message || 'Não foi possível aplicar o bônus.');
      renderState(payload);
      animateScore(participant);
      playSuccessSound();
      showBonusToast(`+1 para ${people[participant].name} no dia ${formatDate(payload.targetTrainingDate)}`);
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
    if (state.markedToday?.[participant]) {
      showBonusToast(`O ponto de hoje para ${people[participant].name} já está marcado.`, true);
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
      playSuccessSound();
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
      openCheckin('lucas');
    }, 3000);
  });

  openButton.addEventListener('pointerup', () => {
    if (!holdTimer && !holdActivated) return;
    const shouldOpenKelly = !holdActivated;
    clearHold();
    ignorePointerClick = true;
    if (shouldOpenKelly) openCheckin('kelly');
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
    if (event.detail === 0) openCheckin('kelly');
  });

  document.querySelectorAll('.bonus-orb').forEach((orb) => orb.addEventListener('pointerdown', startBonusDrag));
  historyList.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    const row = event.target.closest('.history-item');
    if (row) beginHistoryHold(row, event.pointerId, event.clientX, event.clientY);
  });
  historyList.addEventListener('keydown', (event) => {
    if (event.code !== 'Space' || event.repeat) return;
    const row = event.target.closest('.history-item');
    if (!row) return;
    event.preventDefault();
    beginHistoryHold(row, 'keyboard', 0, 0);
  });
  historyList.addEventListener('keyup', (event) => {
    if (event.code === 'Space') cancelHistoryHold('keyboard');
  });
  historyList.addEventListener('contextmenu', (event) => {
    if (event.target.closest('.history-item')) event.preventDefault();
  });
  window.addEventListener('pointermove', (event) => {
    updateHistoryHold(event);
    updateBonusDrag(event);
  });
  window.addEventListener('pointerup', (event) => {
    cancelHistoryHold(event.pointerId);
    finishBonusDrag(event);
  });
  window.addEventListener('pointercancel', (event) => {
    cancelHistoryHold(event.pointerId);
    finishBonusDrag(event, true);
  });
  window.addEventListener('blur', () => cancelHistoryHold());
  installScoreHold('kelly');
  installScoreHold('lucas');

  closeButton.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', resetDialog);
  workoutChoice.addEventListener('click', () => selectActivity('workout'));
  creatineChoice.addEventListener('click', () => selectActivity('creatine'));
  activitySubmitButton.addEventListener('click', submitActivity);

  if (document.modelContext?.registerTool) {
    try {
      document.modelContext.registerTool({
        name: 'open_gym_checkin',
        title: 'Marcar treino ou creatina',
        description: 'Abre o modal para marcar treino ou creatina sem enviar foto.',
        inputSchema: {
          type: 'object',
          properties: { participant: { type: 'string', enum: ['kelly', 'lucas'] } },
          required: ['participant'],
          additionalProperties: false
        },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        async execute(input) {
          if (!people[input?.participant]) throw new Error('Participante inválido.');
          openCheckin(input.participant);
          return { status: 'checkin_opened', participant: input.participant };
        }
      });
    } catch (_error) {
      // Navegadores sem WebMCP continuam com o fluxo visual normal.
    }
  }

  loadState();
})();
