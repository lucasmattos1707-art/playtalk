(async function initJourneyPlanEditor() {
  'use strict';
  const $ = id => document.getElementById(id);
  const names = { tutorial: 'Tutorial', interactive: 'Ouvir e falar', phase1: 'Fase 1 existente' };
  const textSizes = {
    micro: { label: 'Micro', min: 80, max: 150 },
    small: { label: 'Pequeno', min: 151, max: 200 },
    medium: { label: 'Médio', min: 201, max: 300 },
    large: { label: 'Grande', min: 301, max: 400 }
  };
  const legacyTextSize = { label: 'Formato anterior', min: 150, max: 180 };
  const explorerModes = {
    1: 'Ouvir e falar', 2: 'Ouvir e falar no idioma nativo', 3: 'Falar',
    4: 'Escrever', 5: 'Falar sem ajuda', 6: 'Teclado de 9 letras'
  };
  let plan, selected = null, dirty = false, working = 0;
  let editorPreviousFocus = null;
  const pending = new Set();
  const status = (text, error = false) => { $('planStatus').textContent = text; $('planStatus').classList.toggle('is-error', error); };
  const markDirty = () => { dirty = true; $('savePlan').textContent = 'Salvar jornada · alterações pendentes'; };
  const current = () => plan?.steps.find(s => s.id === selected);
  function syncBusy() { $('savePlan').disabled = working > 0; $('generateStep').disabled = working > 0; $('previewStep').disabled = working > 0; }
  async function run(action) {
    working++; syncBusy();
    try { await action(); } catch (error) { status(error.message, true); }
    finally { working--; syncBusy(); }
  }
  function updateCounters() {
    const step = current();
    const range = step?.textSize === 'legacy' || !step?.textSize ? legacyTextSize : (textSizes[step.textSize] || textSizes.small);
    for (const [input, counter] of [['stepPortuguese', 'portugueseCount'], ['stepEnglish', 'englishCount']]) {
      const length = Array.from($(input).value).length;
      $(counter).textContent = `${length} caracteres · permitido ${range.min} a ${range.max}`;
      $(counter).classList.toggle('is-invalid', length < range.min || length > range.max);
    }
    $('textSizeNote').textContent = `${range.label}: cada idioma deve ter de ${range.min} a ${range.max} caracteres. O áudio é apenas em inglês, com Harry. Se editar o inglês, gere novamente o áudio antes de salvar.`;
  }
  function setEditorOpen(open) {
    const modal = $('stepEditorModal');
    if (open) {
      const wasHidden = modal.hidden;
      if (wasHidden) editorPreviousFocus = document.activeElement;
      modal.hidden = false;
      document.body.style.overflow = 'hidden';
      if (wasHidden) window.setTimeout(() => $('stepTitle').focus(), 0);
    } else {
      if (modal.hidden) return;
      modal.hidden = true;
      document.body.style.overflow = '';
      editorPreviousFocus?.focus?.();
      editorPreviousFocus = null;
    }
  }
  function drawList() {
    $('stepsList').replaceChildren(); $('emptyPlan').hidden = Boolean(plan.steps.length);
    plan.steps.forEach((step, index) => {
      const li = document.createElement('li'); li.className = `journeyplan-row${selected === step.id ? ' is-selected' : ''}`;
      const choose = document.createElement('button'); choose.type = 'button'; choose.className = 'journeyplan-step-select';
      const title = document.createElement('strong'); title.textContent = `${index + 1}. ${step.title || 'Nova etapa'}`;
      const type = document.createElement('span');
      type.textContent = step.type === 'phase1' ? `${names[step.type]} · ${explorerModes[step.explorerMode || 1]}` : names[step.type];
      choose.append(title, type);
      choose.onclick = () => select(step.id); li.append(choose);
      const actions = document.createElement('div'); actions.className = 'journeyplan-row-actions';
      for (const [label, callback, disabled] of [
        ['✎ Editar', () => select(step.id), false],
        ['▶ Testar', () => run(() => preview(step.id)), false],
        ['↑', () => move(index, -1), index === 0], ['↓', () => move(index, 1), index === plan.steps.length - 1],
        ['Excluir', () => remove(step.id), false]
      ]) {
        const button = document.createElement('button'); button.type = 'button'; button.textContent = label; button.disabled = disabled;
        button.onclick = callback;
        if (label === '✎ Editar') { button.className = 'journeyplan-edit-button'; button.setAttribute('aria-label', `Editar: ${step.title || 'Nova etapa'}`); }
        if (label === '↑' || label === '↓') button.setAttribute('aria-label', `${label === '↑' ? 'Mover para cima' : 'Mover para baixo'}: ${step.title}`);
        if (label === 'Excluir') button.className = 'is-danger'; actions.append(button);
      }
      li.append(actions); $('stepsList').append(li);
    });
  }
  function select(id, open = true) {
    selected = id; const step = current(); drawList();
    $('stepForm').hidden = !step; $('chooseStep').hidden = Boolean(step);
    if (!step) { setEditorOpen(false); return; }
    $('stepType').textContent = names[step.type]; $('stepTitle').value = step.title;
    $('tutorialFields').hidden = step.type !== 'tutorial'; $('interactiveFields').hidden = step.type !== 'interactive'; $('phaseFields').hidden = step.type !== 'phase1';
    $('pointsField').hidden = step.type === 'tutorial'; $('stepPoints').value = step.points ?? 100;
    $('textSize').value = textSizes[step.textSize] ? step.textSize : 'small';
    $('stepPortuguese').value = step.portuguese || ''; $('stepEnglish').value = step.english || '';
    $('generationTopic').value = step.topic || ''; $('phaseLevel').value = step.level || 1; $('phaseCards').value = step.cards || 1;
    document.querySelectorAll('input[name="explorerMode"]').forEach(input => { input.checked = Number(input.value) === Number(step.explorerMode || 1); });
    $('tutorialImage').value = ''; $('tutorialAudio').value = '';
    $('imageStatus').textContent = step.imageAsset ? '✓ Imagem adicionada' : '';
    $('audioStatus').textContent = step.audioAsset ? '✓ Áudio adicionado' : '';
    $('generatedAudioStatus').textContent = step.audioAsset ? '✓ Áudio em inglês · Harry' : 'Gere o texto para criar o áudio em inglês.';
    updateCounters();
    if (open) setEditorOpen(true);
  }
  function add(type) {
    const step = { id: crypto.randomUUID(), type, title: '', points: type === 'tutorial' ? 0 : 100 };
    if (type === 'interactive') step.textSize = 'micro';
    if (type === 'phase1') { step.level = 1; step.cards = 1; step.explorerMode = 1; }
    plan.steps.push(step); markDirty(); select(step.id); $('stepTitle').focus();
  }
  function move(index, direction) { [plan.steps[index], plan.steps[index + direction]] = [plan.steps[index + direction], plan.steps[index]]; markDirty(); drawList(); }
  function remove(id) {
    plan.steps = plan.steps.filter(s => s.id !== id); markDirty();
    if (selected === id) { selected = plan.steps[0]?.id || null; setEditorOpen(false); }
    drawList();
  }
  async function fileData(file) {
    return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.')); reader.readAsDataURL(file); });
  }
  async function upload(field, property) {
    const step = current(), file = $(field).files[0]; if (!step || !file) return;
    if (file.size > (property === 'imageAsset' ? 6 : 12) * 1024 * 1024) throw new Error('Arquivo grande demais. Imagem: até 6 MB; áudio: até 12 MB.');
    status('Adicionando arquivo…');
    const result = await window.PlaytalkJourney.post('/api/admin/journey/assets', { dataUrl: await fileData(file) });
    if (!plan.steps.includes(step)) return;
    step[property] = result.assetId; markDirty(); if (selected === step.id) select(step.id); status('Arquivo adicionado. Salve a jornada para publicar a etapa.');
  }
  function validate(step) {
    if (!step.title.trim()) throw new Error('Defina o título da etapa.');
    if (pending.has(step.id)) throw new Error('Aguarde a geração do texto e do áudio.');
    if (step.type === 'interactive') {
      const range = step.textSize === 'legacy' || !step.textSize ? legacyTextSize : (textSizes[step.textSize] || textSizes.small);
      if ([step.portuguese, step.english].some(t => Array.from(t || '').length < range.min || Array.from(t || '').length > range.max)) {
        throw new Error(`Os dois textos precisam ter de ${range.min} a ${range.max} caracteres.`);
      }
    }
    if (step.type !== 'phase1' && !step.audioAsset) throw new Error('Adicione o áudio antes de testar ou salvar.');
    if (step.type === 'tutorial' && !step.imageAsset) throw new Error('Adicione a imagem do tutorial.');
    if (step.type === 'phase1' && (!Number.isInteger(step.explorerMode) || step.explorerMode < 1 || step.explorerMode > 6)) throw new Error('Escolha um dos seis modos do Explorador.');
  }
  async function preview(id) {
    if (working > 1) throw new Error('Aguarde o arquivo ou a geração terminar.');
    const index = plan.steps.findIndex(s => s.id === id); validate(plan.steps[index]);
    if (plan.steps[index].type === 'phase1') {
      // Legacy previews load a saved step; no student progress or rewards are changed.
      if (dirty) throw new Error('Salve a jornada antes de testar a fase existente.');
    }
    await window.PlaytalkJourney.preview(plan, index);
  }
  $('addTutorial').onclick = () => add('tutorial'); $('addInteractive').onclick = () => add('interactive'); $('addPhase').onclick = () => add('phase1');
  $('closeEditor').onclick = () => setEditorOpen(false); $('closeEditorBackdrop').onclick = () => setEditorOpen(false);
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !$('stepEditorModal').hidden) setEditorOpen(false); });
  $('stepForm').onsubmit = event => event.preventDefault();
  for (const [id, key] of [['stepTitle', 'title'], ['stepPortuguese', 'portuguese'], ['stepEnglish', 'english'], ['generationTopic', 'topic'], ['stepPoints', 'points'], ['phaseLevel', 'level'], ['phaseCards', 'cards']]) {
    $(id).oninput = () => {
      const step = current(); if (!step) return;
      step[key] = ['points', 'level', 'cards'].includes(key) ? Number($(id).value) : $(id).value;
      if (key === 'english') { step.audioAsset = ''; $('generatedAudioStatus').textContent = 'Gere novamente para atualizar o áudio em inglês.'; }
      markDirty(); updateCounters(); if (key === 'title') drawList();
    };
  }
  $('textSize').onchange = () => {
    const step = current(); if (!step) return;
    step.textSize = $('textSize').value; markDirty(); updateCounters();
  };
  document.querySelectorAll('input[name="explorerMode"]').forEach(input => {
    input.onchange = () => {
      const step = current(); if (!step || !input.checked) return;
      step.explorerMode = Number(input.value); markDirty(); drawList();
    };
  });
  $('tutorialImage').onchange = () => run(() => upload('tutorialImage', 'imageAsset'));
  $('tutorialAudio').onchange = () => run(() => upload('tutorialAudio', 'audioAsset'));
  $('generateStep').onclick = () => run(async () => {
    const step = current(); if (!step || pending.has(step.id)) return;
    step.textSize = $('textSize').value;
    pending.add(step.id); status('Luna está criando os textos; Harry vai gravar o inglês…');
    try {
      const result = await window.PlaytalkJourney.post('/api/admin/journey/generate', { topic: $('generationTopic').value, textSize: step.textSize });
      if (!plan.steps.includes(step)) return;
      Object.assign(step, { title: result.title, textSize: result.textSize, portuguese: result.portuguese, english: result.english, audioAsset: result.audioAsset });
      markDirty(); if (selected === step.id) select(step.id); status('Textos e áudio prontos. Teste a etapa e salve a jornada.');
    } finally { pending.delete(step.id); }
  });
  $('previewStep').onclick = () => run(() => preview(selected));
  $('savePlan').onclick = () => run(async () => {
    if (working > 1) throw new Error('Aguarde os arquivos ou a geração terminarem.');
    plan.steps.forEach(validate); status('Salvando jornada…');
    const payload = await window.PlaytalkJourney.request('/api/admin/journey', { method: 'PUT', body: JSON.stringify({ revision: plan.revision, steps: plan.steps }) });
    plan = payload.plan; dirty = false; $('savePlan').textContent = 'Salvar jornada'; select(selected, !$('stepEditorModal').hidden);
    status(plan.steps.length ? 'Jornada salva! O botão Jogar abrirá esta sequência.' : 'Jornada vazia salva. O jogo anterior está disponível.');
  });
  window.addEventListener('beforeunload', event => { if (dirty || working) { event.preventDefault(); event.returnValue = ''; } });
  try {
    const payload = await window.PlaytalkJourney.request('/api/admin/journey'); plan = payload.plan;
    $('planEditor').hidden = false; drawList(); status('Jornada carregada.');
    if (plan.steps.length) { selected = plan.steps[0].id; drawList(); }
  } catch (error) { status(error.message, true); }
})();
