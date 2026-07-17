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

document.addEventListener('DOMContentLoaded', () => {
  $('#year').textContent = String(new Date().getFullYear());
  setupReveal();
  setupNavigation();
  setupAtmosphere();
  loadContent();

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
