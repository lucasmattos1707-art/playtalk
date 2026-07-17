const state = {
  mode: 'presencial',
  content: null,
  plansById: new Map()
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Falha na requisição (${response.status}).`);
  return payload;
}

window.InSonicAPI = {
  getContent: () => requestJson('/api/insonic/content'),
  ask: (messages) => requestJson('/api/insonic/assistant', {
    method: 'POST',
    body: JSON.stringify({ messages: Array.isArray(messages) ? messages : [{ role: 'user', content: String(messages || '') }] })
  }),
  submitIntake: (answers) => requestJson('/api/insonic/intakes', {
    method: 'POST',
    body: JSON.stringify(answers)
  })
};

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function buildPrice(plan) {
  const wrapper = makeElement('div', 'plan-price');
  wrapper.append(makeElement('p', 'price-label', plan.priceLabel));
  const row = makeElement('div', 'price-row');
  row.append(
    makeElement('span', 'price-currency', plan.currency),
    makeElement('span', 'price-value', plan.price),
    makeElement('span', 'price-period', plan.period)
  );
  wrapper.append(row);
  return wrapper;
}

function buildCard(plan, index) {
  const article = makeElement('article', `pricing-card${index === 1 ? ' featured' : ''}`);
  article.dataset.planId = plan.id;

  const kicker = makeElement('div', 'plan-kicker');
  kicker.append(
    makeElement('span', '', state.mode === 'presencial' ? 'Presencial' : 'Digital'),
    makeElement('span', '', String(index + 1).padStart(2, '0'))
  );
  article.append(kicker, makeElement('h3', '', plan.title), makeElement('p', 'plan-owner', plan.owner), buildPrice(plan));
  article.append(makeElement('p', 'plan-logline', plan.logline));

  const features = makeElement('ul', 'plan-features');
  plan.features.forEach((feature) => features.append(makeElement('li', '', feature)));
  article.append(features);

  const button = makeElement('button', 'button plan-button', 'Ver plano completo');
  button.type = 'button';
  button.addEventListener('click', () => openPlan(plan));
  article.append(button);
  return article;
}

function renderPlans() {
  const grid = $('#pricingGrid');
  const plans = state.content?.plans?.[state.mode] || [];
  grid.replaceChildren(...plans.map(buildCard));
  state.plansById = new Map(plans.map((plan) => [plan.id, plan]));
}

function setMode(nextMode) {
  if (!['presencial', 'digital'].includes(nextMode) || nextMode === state.mode) return;
  const stage = $('#pricingStage');
  stage.classList.add('changing');
  window.setTimeout(() => {
    state.mode = nextMode;
    renderPlans();
    const digital = state.mode === 'digital';
    $('#pricingToggle').classList.toggle('digital', digital);
    $('#pricingToggle').setAttribute('aria-checked', String(digital));
    $('#presencialLabel').classList.toggle('active', !digital);
    $('#digitalLabel').classList.toggle('active', digital);
    stage.classList.remove('changing');
  }, 230);
}

function openPlan(plan) {
  $('#modalMode').textContent = state.mode === 'presencial' ? 'Plano presencial' : 'Plano digital';
  $('#modalTitle').textContent = plan.title;
  $('#modalLogline').textContent = plan.detail || plan.logline;
  $('#modalMeta').replaceChildren(...(plan.tags || []).map((tag) => makeElement('span', '', tag)));
  $('#modalFeatures').replaceChildren(...plan.features.map((feature) => makeElement('li', '', feature)));
  const modal = $('#planModal');
  if (typeof modal.showModal === 'function') modal.showModal();
  else modal.setAttribute('open', '');
}

function closePlan() {
  const modal = $('#planModal');
  if (typeof modal.close === 'function') modal.close();
  else modal.removeAttribute('open');
}

async function loadContent() {
  try {
    state.content = await window.InSonicAPI.getContent();
  } catch (apiError) {
    try {
      state.content = await requestJson('data/content.json');
    } catch (staticError) {
      console.error('Não foi possível carregar os planos InSonic.', apiError, staticError);
      const grid = $('#pricingGrid');
      const message = makeElement('p', 'plan-load-error', 'Os planos estão temporariamente indisponíveis. Atualize a página em alguns instantes.');
      grid.replaceChildren(message);
      return;
    }
  }
  renderPlans();
}

function setupReveal() {
  const elements = $$('.reveal');
  if (!('IntersectionObserver' in window)) {
    elements.forEach((element) => element.classList.add('visible'));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -28px' });
  elements.forEach((element) => observer.observe(element));
}

function setupNavigation() {
  const header = $('#siteHeader');
  const button = $('#menuButton');
  const menu = $('#mobileMenu');

  const closeMenu = () => {
    button.classList.remove('active');
    button.setAttribute('aria-expanded', 'false');
    menu.classList.remove('open');
    menu.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('menu-open');
  };

  button.addEventListener('click', () => {
    const open = !menu.classList.contains('open');
    button.classList.toggle('active', open);
    button.setAttribute('aria-expanded', String(open));
    menu.classList.toggle('open', open);
    menu.setAttribute('aria-hidden', String(!open));
    document.body.classList.toggle('menu-open', open);
  });
  $$('#mobileMenu a').forEach((link) => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') { closeMenu(); closePlan(); } });

  const navLinks = $$('.desktop-nav a');
  const sections = $$('main section[id]');
  const update = () => {
    header.classList.toggle('scrolled', window.scrollY > 36);
    const marker = window.scrollY + window.innerHeight * .35;
    let activeId = '';
    sections.forEach((section) => { if (marker >= section.offsetTop) activeId = section.id; });
    navLinks.forEach((link) => link.classList.toggle('active', link.hash === `#${activeId}`));
  };
  window.addEventListener('scroll', update, { passive: true });
  update();
}

function setupAtmosphere() {
  const glow = $('#cursorGlow');
  const grid = $('.hero-grid');
  document.addEventListener('pointermove', (event) => {
    glow.style.left = `${event.clientX}px`;
    glow.style.top = `${event.clientY}px`;
    glow.style.opacity = '1';
    const rect = grid.getBoundingClientRect();
    grid.style.setProperty('--mx', `${event.clientX - rect.left}px`);
    grid.style.setProperty('--my', `${event.clientY - rect.top}px`);
  }, { passive: true });
  document.addEventListener('pointerleave', () => { glow.style.opacity = '0'; });
}

const INTAKE_STEPS = [
  {
    id: 'identification', title: 'Identificação do cliente', type: 'identity',
    hint: 'Conte para a InSonic quem está planejando este ambiente.'
  },
  {
    id: 'city', key: 'city', title: 'Cidade e localização', type: 'text',
    hint: 'Somente a cidade onde o projeto será realizado.', placeholder: 'Ex.: Curitiba'
  },
  {
    id: 'environment-size', key: 'environmentSizeM2', title: 'Tipo e tamanho do ambiente', type: 'size',
    hint: 'Use as setas para escolher a metragem aproximada.', options: [100, 300, 500, 1000, 2000, 4000]
  },
  {
    id: 'project-objective', key: 'projectObjective', title: 'Objetivo do projeto', type: 'choice',
    hint: 'Escolha o uso principal ou escreva um objetivo diferente.', customPlaceholder: 'Outro objetivo para este ambiente',
    options: ['Podcasts', 'Vídeos para YouTube', 'Música ao vivo', 'Palestras', 'Teatro', 'Igreja e cultos', 'Auditório', 'Estúdio musical', 'Sala corporativa', 'Cinema e exibição']
  },
  {
    id: 'coverage', key: 'coverage', title: 'Cobertura', type: 'choice', canSkip: true,
    hint: 'Como o espaço é protegido ou aberto hoje?', customPlaceholder: 'Descreva outro tipo de cobertura',
    options: ['100% coberto', 'Quase tudo coberto', 'Parcialmente coberto', 'Aberto']
  },
  {
    id: 'roof', key: 'roofMaterial', title: 'Do que é feito o teto?', type: 'choice', canSkip: true,
    hint: 'O material do teto influencia diretamente a reflexão do som.', customPlaceholder: 'Qual é o material do teto?',
    options: ['Laje de concreto', 'Madeira', 'Metal ou telha', 'Gesso ou drywall', 'PVC', 'Forro acústico', 'Outro']
  },
  {
    id: 'walls', key: 'wallMaterial', title: 'Do que são feitas as paredes?', type: 'choice', canSkip: true,
    hint: 'Escolha o material predominante ou descreva a composição.', customPlaceholder: 'Qual é o material das paredes?',
    options: ['Alvenaria', 'Concreto', 'Drywall', 'Madeira ou MDF', 'Vidro', 'Painel acústico', 'Outro']
  },
  {
    id: 'audience', key: 'audienceCapacity', title: 'Capacidade de público', type: 'number',
    hint: 'Informe quantas pessoas o ambiente deve receber.', placeholder: 'Ex.: 250 pessoas'
  },
  {
    id: 'problems', key: 'acousticProblems', title: 'Problemas acústicos atuais', type: 'textarea',
    hint: 'Descreva ecos, dificuldade para entender a fala, ruídos externos, microfonia ou qualquer desconforto sonoro.', placeholder: 'Conte o que acontece hoje quando o ambiente está em uso...'
  },
  {
    id: 'equipment', key: 'existingEquipment', title: 'Equipamentos e estrutura existentes', type: 'textarea', canSkip: true,
    hint: 'Descreva a estrutura-base: pilares, palco, caixas de som, microfones, mesa, revestimentos e equipamentos já instalados.', placeholder: 'Ex.: palco de madeira, quatro caixas ativas, teto metálico...'
  }
];

const intakeState = {
  step: 0,
  answers: { environmentSizeM2: 100 },
  accessCode: '',
  completed: false,
  submitting: false
};

function flowField(label, name, type = 'text', placeholder = '') {
  const wrapper = makeElement('div', 'flow-field');
  const fieldLabel = makeElement('label', '', label);
  fieldLabel.htmlFor = `flow-${name}`;
  const input = makeElement('input', 'flow-input');
  input.id = `flow-${name}`;
  input.name = name;
  input.type = type;
  input.placeholder = placeholder;
  input.autocomplete = name === 'clientName' ? 'name' : name === 'phone' ? 'tel' : name === 'email' ? 'email' : 'off';
  if (name === 'phone') input.inputMode = 'tel';
  input.value = intakeState.answers[name] || '';
  input.addEventListener('input', () => { intakeState.answers[name] = input.value.trim(); clearFlowFeedback(); });
  wrapper.append(fieldLabel, input);
  return wrapper;
}

function questionHead(step, index) {
  const head = makeElement('div', 'flow-question-head');
  head.append(makeElement('p', 'flow-question-index', `Etapa ${String(index + 1).padStart(2, '0')}`));
  head.append(makeElement('h2', '', step.title));
  head.append(makeElement('p', '', step.hint));
  return head;
}

function renderIdentity(step, question, index) {
  question.append(questionHead(step, index));
  const fields = makeElement('div', 'flow-fields three');
  fields.append(
    flowField('Nome', 'clientName', 'text', 'Seu nome completo'),
    flowField('Celular', 'phone', 'tel', '(00) 00000-0000'),
    flowField('E-mail', 'email', 'email', 'voce@email.com')
  );
  question.append(fields);
}

function renderSimpleField(step, question, index) {
  question.append(questionHead(step, index));
  if (step.type === 'textarea') {
    const textarea = makeElement('textarea', 'flow-textarea');
    textarea.id = `flow-${step.key}`;
    textarea.name = step.key;
    textarea.placeholder = step.placeholder;
    textarea.value = intakeState.answers[step.key] || '';
    textarea.addEventListener('input', () => { intakeState.answers[step.key] = textarea.value.trim(); clearFlowFeedback(); });
    question.append(textarea);
  } else {
    const field = flowField(step.title, step.key, step.type === 'number' ? 'number' : 'text', step.placeholder);
    const input = $('input', field);
    if (step.type === 'number') { input.inputMode = 'numeric'; input.min = '1'; input.max = '1000000'; }
    question.append(field);
  }
  if (step.canSkip) question.append(buildSkipButton(step));
}

function renderSize(step, question, index) {
  question.append(questionHead(step, index));
  const selector = makeElement('div', 'size-selector');
  const left = makeElement('button', 'size-arrow');
  left.type = 'button'; left.setAttribute('aria-label', 'Metragem anterior');
  left.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg>';
  const display = makeElement('div', 'size-value');
  const value = makeElement('strong');
  const unit = makeElement('span', '', 'metros quadrados');
  display.append(value, unit);
  const right = makeElement('button', 'size-arrow');
  right.type = 'button'; right.setAttribute('aria-label', 'Próxima metragem');
  right.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>';
  const dots = makeElement('div', 'size-dots');
  step.options.forEach(() => dots.append(makeElement('span')));

  const update = (direction = 0) => {
    let position = step.options.indexOf(Number(intakeState.answers[step.key]));
    if (position < 0) position = 0;
    position = Math.max(0, Math.min(step.options.length - 1, position + direction));
    intakeState.answers[step.key] = step.options[position];
    value.textContent = Number(step.options[position]).toLocaleString('pt-BR');
    $$('span', dots).forEach((dot, dotIndex) => dot.classList.toggle('active', dotIndex === position));
    left.disabled = position === 0;
    right.disabled = position === step.options.length - 1;
    clearFlowFeedback();
  };
  left.addEventListener('click', () => update(-1));
  right.addEventListener('click', () => update(1));
  selector.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') { event.preventDefault(); update(-1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); update(1); }
  });
  selector.append(left, display, right);
  question.append(selector, dots);
  update();
}

function buildSkipButton(step) {
  const skip = makeElement('button', 'flow-skip', '⭐ Pular esta etapa');
  skip.type = 'button';
  skip.classList.toggle('selected', intakeState.answers[step.key] === 'Pulado');
  skip.addEventListener('click', () => {
    intakeState.answers[step.key] = 'Pulado';
    skip.classList.add('selected');
    const parent = skip.parentElement;
    $$('.flow-option', parent).forEach((option) => option.classList.remove('selected'));
    const custom = $('.flow-custom', parent);
    if (custom) { custom.value = ''; custom.hidden = true; }
    const textarea = $('.flow-textarea', parent);
    if (textarea) textarea.value = '';
    clearFlowFeedback();
  });
  return skip;
}

function renderChoice(step, question, index) {
  question.append(questionHead(step, index));
  const options = makeElement('div', 'flow-options');
  const custom = makeElement('input', 'flow-input flow-custom');
  custom.type = 'text';
  custom.placeholder = step.customPlaceholder;
  custom.hidden = true;
  const current = intakeState.answers[step.key] || '';

  step.options.forEach((label) => {
    const option = makeElement('button', 'flow-option', label);
    option.type = 'button';
    option.classList.toggle('selected', current === label);
    option.addEventListener('click', () => {
      $$('.flow-option', options).forEach((item) => item.classList.remove('selected'));
      option.classList.add('selected');
      const customChoice = label === 'Outro';
      custom.hidden = !customChoice;
      if (customChoice) {
        intakeState.answers[step.key] = '';
        window.setTimeout(() => custom.focus(), 50);
      } else {
        intakeState.answers[step.key] = label;
        custom.value = '';
      }
      const skip = $('.flow-skip', question);
      if (skip) skip.classList.remove('selected');
      clearFlowFeedback();
    });
    options.append(option);
  });

  if (!step.options.includes('Outro')) {
    const other = makeElement('button', 'flow-option', 'Outro');
    other.type = 'button';
    other.addEventListener('click', () => {
      $$('.flow-option', options).forEach((item) => item.classList.remove('selected'));
      other.classList.add('selected');
      intakeState.answers[step.key] = '';
      custom.hidden = false;
      window.setTimeout(() => custom.focus(), 50);
      clearFlowFeedback();
    });
    options.append(other);
  }

  custom.addEventListener('input', () => { intakeState.answers[step.key] = custom.value.trim(); clearFlowFeedback(); });
  question.append(options, custom);
  if (step.canSkip) question.append(buildSkipButton(step));
}

function buildFlowStep(step, index) {
  const section = makeElement('section', 'flow-step');
  section.dataset.step = String(index);
  const question = makeElement('div', 'flow-question');
  if (step.type === 'identity') renderIdentity(step, question, index);
  else if (step.type === 'size') renderSize(step, question, index);
  else if (step.type === 'choice') renderChoice(step, question, index);
  else renderSimpleField(step, question, index);
  section.append(question);
  return section;
}

function buildSummaryStep() {
  const section = makeElement('section', 'flow-step flow-summary');
  section.dataset.step = '10';
  const question = makeElement('div', 'flow-question');
  question.id = 'flowSummaryContent';
  section.append(question);
  return section;
}

function answerForSummary(step) {
  if (step.type === 'identity') {
    return `${intakeState.answers.clientName || '—'}\n${intakeState.answers.phone || '—'}\n${intakeState.answers.email || '—'}`;
  }
  if (step.type === 'size') return `${Number(intakeState.answers[step.key] || 0).toLocaleString('pt-BR')} m²`;
  if (step.type === 'number') return `${Number(intakeState.answers[step.key] || 0).toLocaleString('pt-BR')} pessoas`;
  return intakeState.answers[step.key] || '—';
}

function renderFlowSummary(accessCode) {
  const content = $('#flowSummaryContent');
  const access = makeElement('div', 'access-block');
  access.append(makeElement('p', 'access-label', 'Sua chave InSonic'));
  const code = makeElement('div', 'access-code');
  code.append(makeElement('span', 'code-letters', accessCode.slice(0, 3)), makeElement('span', 'code-numbers', accessCode.slice(3)));
  access.append(code, makeElement('p', 'access-help', 'Guarde sua chave de acesso.'));
  content.append(access, makeElement('p', 'summary-saved', 'Planejamento salvo com segurança no Postgres'));
  content.append(makeElement('h2', 'summary-title', 'Resumo do seu ambiente'));
  const grid = makeElement('div', 'summary-grid');
  INTAKE_STEPS.forEach((step, index) => {
    const card = makeElement('article', 'summary-card');
    card.append(makeElement('span', '', `Etapa ${String(index + 1).padStart(2, '0')}`));
    card.append(makeElement('h3', '', step.title), makeElement('p', '', answerForSummary(step)));
    grid.append(card);
  });
  content.append(grid);
}

function clearFlowFeedback() {
  const feedback = $('#flowFeedback');
  feedback.textContent = '';
  feedback.classList.remove('show');
}

function showFlowFeedback(message) {
  const feedback = $('#flowFeedback');
  feedback.textContent = message;
  feedback.classList.add('show');
}

function validateFlowStep(index) {
  const step = INTAKE_STEPS[index];
  const answers = intakeState.answers;
  if (step.type === 'identity') {
    if (!answers.clientName || !answers.phone || !answers.email) return 'Preencha nome, celular e e-mail para continuar.';
    if (!/^\S+@\S+\.\S+$/.test(answers.email)) return 'Digite um e-mail válido para continuar.';
    return '';
  }
  const value = answers[step.key];
  if (step.type === 'number' && (!Number.isFinite(Number(value)) || Number(value) < 1)) return 'Digite a capacidade de público usando somente números.';
  if (value === 'Pulado' && step.canSkip) return '';
  if (value === undefined || value === null || String(value).trim() === '') return 'Responda esta etapa ou escolha a opção de pular quando disponível.';
  return '';
}

function showFlowStep(index) {
  intakeState.step = Math.max(0, Math.min(INTAKE_STEPS.length, index));
  $('#flowTrack').style.transform = `translateX(-${intakeState.step * 100}%)`;
  $('#flowStepNumber').textContent = String(intakeState.step + 1).padStart(2, '0');
  $('#flowStepTotal').textContent = '11';
  $('#flowProgressBar').style.width = `${((intakeState.step + 1) / 11) * 100}%`;
  $('#flowBack').classList.toggle('visible', intakeState.step > 0 && intakeState.step < 10);
  $('#flowNavigation').hidden = intakeState.step === 10;
  $('#flowNext').textContent = intakeState.step === 9 ? 'Salvar e gerar chave' : 'Continuar';
  clearFlowFeedback();
  window.setTimeout(() => {
    const focusTarget = $$('.flow-step')[intakeState.step]?.querySelector('input, textarea, button');
    if (focusTarget && intakeState.step !== 2) focusTarget.focus({ preventScroll: true });
  }, 520);
}

function openProjectFlow() {
  const flow = $('#projectFlow');
  if (flow.classList.contains('open')) return;
  closePlan();
  flow.hidden = false;
  void flow.offsetWidth;
  flow.classList.add('open');
  flow.setAttribute('aria-hidden', 'false');
  document.body.classList.add('flow-open');
  showFlowStep(intakeState.completed ? 10 : intakeState.step);
}

function closeProjectFlow() {
  const flow = $('#projectFlow');
  flow.classList.remove('open');
  flow.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('flow-open');
  window.setTimeout(() => {
    if (!flow.classList.contains('open')) flow.hidden = true;
  }, 500);
}

async function submitIntake() {
  if (intakeState.submitting) return;
  intakeState.submitting = true;
  const nextButton = $('#flowNext');
  nextButton.disabled = true;
  nextButton.textContent = 'Salvando...';
  clearFlowFeedback();
  try {
    const result = await window.InSonicAPI.submitIntake(intakeState.answers);
    intakeState.accessCode = result.accessCode;
    intakeState.completed = true;
    renderFlowSummary(result.accessCode);
    showFlowStep(10);
  } catch (error) {
    showFlowFeedback(error.message || 'Não foi possível salvar agora. Tente novamente.');
    nextButton.textContent = 'Salvar e gerar chave';
  } finally {
    intakeState.submitting = false;
    nextButton.disabled = false;
  }
}

function setupProjectFlow() {
  const track = $('#flowTrack');
  track.replaceChildren(...INTAKE_STEPS.map(buildFlowStep), buildSummaryStep());
  $('#flowStepTotal').textContent = '11';
  showFlowStep(0);

  $$('[data-open-intake]').forEach((opener) => opener.addEventListener('click', (event) => {
    event.preventDefault();
    openProjectFlow();
  }));
  $('#flowClose').addEventListener('click', closeProjectFlow);
  $('#flowBack').addEventListener('click', () => showFlowStep(intakeState.step - 1));
  $('#projectForm').addEventListener('submit', (event) => {
    event.preventDefault();
    if (intakeState.step >= 10) return;
    const error = validateFlowStep(intakeState.step);
    if (error) { showFlowFeedback(error); return; }
    if (intakeState.step === 9) submitIntake();
    else showFlowStep(intakeState.step + 1);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && $('#projectFlow').classList.contains('open')) closeProjectFlow();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  $('#year').textContent = String(new Date().getFullYear());
  setupReveal();
  setupNavigation();
  setupAtmosphere();
  loadContent();
  setupProjectFlow();

  $('#pricingToggle').addEventListener('click', () => setMode(state.mode === 'presencial' ? 'digital' : 'presencial'));
  $('#presencialLabel').addEventListener('click', () => setMode('presencial'));
  $('#digitalLabel').addEventListener('click', () => setMode('digital'));
  $('#modalClose').addEventListener('click', closePlan);
  $('#modalAction').addEventListener('click', closePlan);
  $('#planModal').addEventListener('click', (event) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const outside = event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom;
    if (outside) closePlan();
  });
});
