(async function initJourneyPlanEditor() {
  'use strict';
  const $ = id => document.getElementById(id);
  const names = { tutorial: 'Tutorial', interactive: 'Ouvir e falar', phase1: 'Fase 1 existente' };
  let plan, selected = null, dirty = false, working = 0;
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
    for (const [input, counter] of [['stepPortuguese', 'portugueseCount'], ['stepEnglish', 'englishCount']]) {
      const length = Array.from($(input).value).length;
      $(counter).textContent = `${length}/180 caracteres · mínimo 150`;
      $(counter).classList.toggle('is-invalid', length < 150 || length > 180);
    }
  }
  function drawList() {
    $('stepsList').replaceChildren(); $('emptyPlan').hidden = Boolean(plan.steps.length);
    plan.steps.forEach((step, index) => {
      const li = document.createElement('li'); li.className = `journeyplan-row${selected === step.id ? ' is-selected' : ''}`;
      const choose = document.createElement('button'); choose.type = 'button'; choose.className = 'journeyplan-step-select';
      const title = document.createElement('strong'); title.textContent = `${index + 1}. ${step.title || 'Nova etapa'}`;
      const type = document.createElement('span'); type.textContent = names[step.type]; choose.append(title, type);
      choose.onclick = () => select(step.id); li.append(choose);
      const actions = document.createElement('div'); actions.className = 'journeyplan-row-actions';
      for (const [label, callback, disabled] of [
        ['▶ Testar', () => run(() => preview(step.id)), false],
        ['↑', () => move(index, -1), index === 0], ['↓', () => move(index, 1), index === plan.steps.length - 1],
        ['Excluir', () => remove(step.id), false]
      ]) {
        const button = document.createElement('button'); button.type = 'button'; button.textContent = label; button.disabled = disabled;
        if (label === '↑' || label === '↓') button.setAttribute('aria-label', `${label === '↑' ? 'Mover para cima' : 'Mover para baixo'}: ${step.title}`);
        if (label === 'Excluir') button.className = 'is-danger'; button.onclick = callback; actions.append(button);
      }
      li.append(actions); $('stepsList').append(li);
    });
  }
  function select(id) {
    selected = id; const step = current(); drawList();
    $('stepForm').hidden = !step; $('chooseStep').hidden = Boolean(step);
    if (!step) return;
    $('stepType').textContent = names[step.type]; $('stepTitle').value = step.title;
    $('tutorialFields').hidden = step.type !== 'tutorial'; $('interactiveFields').hidden = step.type !== 'interactive'; $('phaseFields').hidden = step.type !== 'phase1';
    $('pointsField').hidden = step.type === 'tutorial'; $('stepPoints').value = step.points ?? 100;
    $('stepPortuguese').value = step.portuguese || ''; $('stepEnglish').value = step.english || '';
    $('generationTopic').value = step.topic || ''; $('phaseLevel').value = step.level || 1; $('phaseCards').value = step.cards || 1;
    $('tutorialImage').value = ''; $('tutorialAudio').value = '';
    $('imageStatus').textContent = step.imageAsset ? '✓ Imagem adicionada' : '';
    $('audioStatus').textContent = step.audioAsset ? '✓ Áudio adicionado' : '';
    $('generatedAudioStatus').textContent = step.audioAsset ? '✓ Áudio em inglês · Harry' : 'Gere o texto para criar o áudio em inglês.';
    updateCounters();
  }
  function add(type) {
    const step = { id: crypto.randomUUID(), type, title: '', points: type === 'tutorial' ? 0 : 100 };
    if (type === 'phase1') { step.level = 1; step.cards = 1; }
    plan.steps.push(step); markDirty(); select(step.id); $('stepTitle').focus();
  }
  function move(index, direction) { [plan.steps[index], plan.steps[index + direction]] = [plan.steps[index + direction], plan.steps[index]]; markDirty(); drawList(); }
  function remove(id) { plan.steps = plan.steps.filter(s => s.id !== id); markDirty(); select(selected === id ? plan.steps[0]?.id : selected); }
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
    if (step.type === 'interactive' && [step.portuguese, step.english].some(t => Array.from(t || '').length < 150 || Array.from(t || '').length > 180)) throw new Error('Os dois textos precisam ter de 150 a 180 caracteres.');
    if (step.type !== 'phase1' && !step.audioAsset) throw new Error('Adicione o áudio antes de testar ou salvar.');
    if (step.type === 'tutorial' && !step.imageAsset) throw new Error('Adicione a imagem do tutorial.');
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
  $('stepForm').onsubmit = event => event.preventDefault();
  for (const [id, key] of [['stepTitle', 'title'], ['stepPortuguese', 'portuguese'], ['stepEnglish', 'english'], ['generationTopic', 'topic'], ['stepPoints', 'points'], ['phaseLevel', 'level'], ['phaseCards', 'cards']]) {
    $(id).oninput = () => {
      const step = current(); if (!step) return;
      step[key] = ['points', 'level', 'cards'].includes(key) ? Number($(id).value) : $(id).value;
      if (key === 'english') { step.audioAsset = ''; $('generatedAudioStatus').textContent = 'Gere novamente para atualizar o áudio em inglês.'; }
      markDirty(); updateCounters(); if (key === 'title') drawList();
    };
  }
  $('tutorialImage').onchange = () => run(() => upload('tutorialImage', 'imageAsset'));
  $('tutorialAudio').onchange = () => run(() => upload('tutorialAudio', 'audioAsset'));
  $('generateStep').onclick = () => run(async () => {
    const step = current(); if (!step || pending.has(step.id)) return;
    pending.add(step.id); status('Luna está criando os textos; Harry vai gravar o inglês…');
    try {
      const result = await window.PlaytalkJourney.post('/api/admin/journey/generate', { topic: $('generationTopic').value });
      if (!plan.steps.includes(step)) return;
      Object.assign(step, { portuguese: result.portuguese, english: result.english, audioAsset: result.audioAsset });
      markDirty(); if (selected === step.id) select(step.id); status('Textos e áudio prontos. Teste a etapa e salve a jornada.');
    } finally { pending.delete(step.id); }
  });
  $('previewStep').onclick = () => run(() => preview(selected));
  $('savePlan').onclick = () => run(async () => {
    if (working > 1) throw new Error('Aguarde os arquivos ou a geração terminarem.');
    plan.steps.forEach(validate); status('Salvando jornada…');
    const payload = await window.PlaytalkJourney.request('/api/admin/journey', { method: 'PUT', body: JSON.stringify({ revision: plan.revision, steps: plan.steps }) });
    plan = payload.plan; dirty = false; $('savePlan').textContent = 'Salvar jornada'; select(selected);
    status(plan.steps.length ? 'Jornada salva! O botão Jogar abrirá esta sequência.' : 'Jornada vazia salva. O jogo anterior está disponível.');
  });
  window.addEventListener('beforeunload', event => { if (dirty || working) { event.preventDefault(); event.returnValue = ''; } });
  try {
    const payload = await window.PlaytalkJourney.request('/api/admin/journey'); plan = payload.plan;
    $('planEditor').hidden = false; drawList(); status('Jornada carregada.');
    if (plan.steps.length) select(plan.steps[0].id);
  } catch (error) { status(error.message, true); }
})();
