(() => {
  'use strict';

  const STORAGE_KEY = 'fluentlevelup:oz:opened-categories:v1';
  const list = document.getElementById('categoryList');
  const percent = document.getElementById('overallPercent');
  const overallBar = document.getElementById('overallBar');
  const overallSummary = document.getElementById('overallSummary');
  const dialog = document.getElementById('categoryDialog');
  const toast = document.getElementById('toast');
  let state = { categories: [] };
  let mutationQueue = Promise.resolve();
  let pendingMutations = 0;
  let toastTimer = 0;
  let lastPayload = '';

  const readOpened = () => {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return new Set(Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : []);
    } catch (_error) {
      return new Set();
    }
  };
  const openedCategories = readOpened();
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
  const showToast = (message, isError = false) => {
    toast.textContent = message;
    toast.classList.toggle('is-error', isError);
    toast.classList.add('is-visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 2800);
  };
  const persistOpened = () => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...openedCategories])); } catch (_error) {}
  };

  function updateOverview() {
    const items = state.categories.flatMap((category) => category.items || []);
    const done = items.filter((item) => item.completed).length;
    const rate = items.length ? Math.round((done / items.length) * 100) : 0;
    percent.textContent = `${rate}%`;
    overallBar.style.width = `${rate}%`;
    overallSummary.textContent = `${done} de ${items.length} tarefas concluídas · ${state.categories.length} categorias`;
  }

  function renderCategory(category) {
    const items = Array.isArray(category.items) ? category.items : [];
    const doneCount = items.filter((item) => item.completed).length;
    const itemRate = items.length ? Math.round((doneCount / items.length) * 100) : 0;
    const isOpen = openedCategories.has(category.id);
    const cardClasses = ['category-card', isOpen ? 'is-open' : '', category.completed ? 'is-complete' : ''].filter(Boolean).join(' ');
    const grouped = new Map();
    const names = [...(Array.isArray(category.groups) ? category.groups : [])];
    for (const item of items) if (item.group && !names.includes(item.group)) names.push(item.group);
    if (names.some(Boolean)) grouped.set('', items.filter((item) => !item.group));
    for (const name of names) grouped.set(name, items.filter((item) => item.group === name));
    if (!grouped.size) grouped.set('', items);

    const groupMarkup = [...grouped.entries()].map(([name, groupItems]) => {
      const taskMarkup = groupItems.map((item) => `
        <div class="task-row ${item.completed ? 'is-done' : ''}">
          <button class="item-status ${item.completed ? 'is-done' : ''}" type="button" data-action="toggle-item" data-id="${escapeHtml(item.id)}" aria-label="${item.completed ? 'Marcar como pendente' : 'Marcar como concluído'}" title="${item.completed ? 'Marcar como pendente' : 'Marcar como concluído'}"></button>
          <span class="task-title">${escapeHtml(item.title)}</span>
        </div>`).join('');
      return `<section class="group-block">${name ? `<h3 class="group-title">${escapeHtml(name)}</h3>` : ''}<div class="task-list">${taskMarkup || '<div class="task-row task-row--empty"><span class="task-title">Adicione o primeiro item desta etapa.</span></div>'}</div></section>`;
    }).join('');
    const groupSelect = names.filter(Boolean).length > 1
      ? `<select name="group" aria-label="Grupo do novo item"><option value="">Sem grupo</option>${names.filter(Boolean).map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join('')}</select>`
      : '';

    return `<article class="${cardClasses}" data-category="${escapeHtml(category.id)}">
      <div class="category-head">
        <button class="category-status ${category.completed ? 'is-done' : ''}" type="button" data-action="toggle-category" data-id="${escapeHtml(category.id)}" aria-label="${category.completed ? 'Marcar categoria como pendente' : 'Marcar categoria como concluída'}" title="${category.completed ? 'Marcar como pendente' : 'Marcar categoria como concluída'}"></button>
        <button class="category-title-button" type="button" data-action="open-category" data-id="${escapeHtml(category.id)}" aria-expanded="${isOpen}" aria-controls="panel-${escapeHtml(category.id)}">
          <span class="category-titleline"><span class="category-emoji" aria-hidden="true">${escapeHtml(category.icon || '✨')}</span><span class="category-title">${escapeHtml(category.title)}</span></span>
          <span class="category-meta"><span>${doneCount}/${items.length} tarefas</span>${category.completed ? '<span class="done-copy">Concluído</span>' : ''}</span>
        </button>
        <div class="category-progress" aria-label="${itemRate}% das tarefas concluídas"><span class="progress-label">${itemRate}%</span><div class="progress-track"><span style="width:${itemRate}%"></span></div></div>
        <span class="chevron" aria-hidden="true">›</span>
      </div>
      <div class="category-content" id="panel-${escapeHtml(category.id)}" ${isOpen ? '' : 'hidden'}>
        ${groupMarkup}
        <div class="add-area"><button class="add-item" type="button" data-action="show-add-item" data-id="${escapeHtml(category.id)}"><span aria-hidden="true">+</span> Adicionar item</button></div>
      </div>
    </article>`;
  }

  function render() {
    updateOverview();
    list.innerHTML = state.categories.length
      ? state.categories.map(renderCategory).join('')
      : '<div class="loading-state">Nenhuma categoria encontrada.</div>';
    lastPayload = JSON.stringify(state);
  }

  async function requestJson(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      cache: 'no-store'
    });
    let payload = {};
    try { payload = await response.json(); } catch (_error) {}
    if (!response.ok || payload.success === false) throw new Error(payload.message || 'Não foi possível salvar a alteração.');
    return payload;
  }

  async function loadChecklist({ quiet = false } = {}) {
    const payload = await requestJson('/api/oz/checklist');
    const next = { categories: Array.isArray(payload.categories) ? payload.categories : [] };
    if (JSON.stringify(next) !== lastPayload) {
      state = next;
      render();
      if (quiet) showToast('Checklist atualizado com as alterações da equipe.');
    }
  }

  function mutate(url, method, body, successMessage) {
    pendingMutations += 1;
    mutationQueue = mutationQueue.then(async () => {
      try {
        const payload = await requestJson(url, { method, body: JSON.stringify(body) });
        state = { categories: Array.isArray(payload.categories) ? payload.categories : [] };
        render();
        showToast(successMessage);
      } catch (error) {
        showToast(error.message || 'Não foi possível salvar. Tente de novo.', true);
        try { await loadChecklist(); } catch (_refreshError) {}
      } finally {
        pendingMutations = Math.max(0, pendingMutations - 1);
      }
    });
    return mutationQueue;
  }

  function revealAddForm(card) {
    const area = card?.querySelector('.add-area');
    if (!area) return;
    const existing = area.querySelector('form');
    if (existing) {
      existing.querySelector('input')?.focus();
      return;
    }
    const id = card.dataset.category;
    const category = state.categories.find((entry) => entry.id === id);
    if (!category) return;
    const groupNames = (category.groups || []).filter(Boolean);
    const groupSelect = groupNames.length > 1
      ? `<select name="group" aria-label="Grupo do novo item"><option value="">Sem grupo</option>${groupNames.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join('')}</select>`
      : '';
    area.innerHTML = `<form class="inline-add" data-category-id="${escapeHtml(id)}"><input name="title" maxlength="240" placeholder="O que falta incluir?" aria-label="Novo item" required>${groupSelect}<button type="submit">Adicionar</button><button type="button" class="cancel-add" data-action="cancel-add-item" aria-label="Cancelar">×</button></form>`;
    area.querySelector('input')?.focus();
  }

  list.addEventListener('click', (event) => {
    const control = event.target.closest('[data-action]');
    if (!control) return;
    const action = control.dataset.action;
    const id = control.dataset.id;
    const card = control.closest('.category-card');
    if (action === 'open-category' && id && !openedCategories.has(id)) {
      openedCategories.add(id);
      persistOpened();
      control.setAttribute('aria-expanded', 'true');
      card?.classList.add('is-open');
      card?.querySelector('.category-content')?.removeAttribute('hidden');
      return;
    }
    if (action === 'toggle-category' && id) {
      const category = state.categories.find((entry) => entry.id === id);
      if (category) mutate(`/api/oz/checklist/categories/${encodeURIComponent(id)}`, 'PATCH', { completed: !category.completed }, category.completed ? 'Categoria marcada como pendente.' : 'Categoria concluída. Que conquista linda!');
      return;
    }
    if (action === 'toggle-item' && id) {
      const item = state.categories.flatMap((entry) => entry.items || []).find((entry) => entry.id === id);
      if (item) mutate(`/api/oz/checklist/items/${encodeURIComponent(id)}`, 'PATCH', { completed: !item.completed }, item.completed ? 'Tarefa voltou para a lista.' : 'Tarefa concluída. Mandou bem!');
      return;
    }
    if (action === 'show-add-item') revealAddForm(card);
    if (action === 'cancel-add-item') {
      const category = state.categories.find((entry) => entry.id === card?.dataset.category);
      if (category) render();
    }
  });

  list.addEventListener('submit', (event) => {
    const form = event.target.closest('.inline-add');
    if (!form) return;
    event.preventDefault();
    const formData = new FormData(form);
    const title = String(formData.get('title') || '').trim();
    const group = String(formData.get('group') || '').trim();
    if (!title) return;
    const categoryId = form.dataset.categoryId;
    mutate(`/api/oz/checklist/categories/${encodeURIComponent(categoryId)}/items`, 'POST', { title, group }, 'Item adicionado ao checklist.');
  });

  document.getElementById('openCategoryDialog').addEventListener('click', () => {
    document.getElementById('newCategoryForm').reset();
    dialog.showModal();
    document.getElementById('newCategoryTitle').focus();
  });
  document.getElementById('closeCategoryDialog').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
  document.getElementById('newCategoryForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const title = String(formData.get('title') || '').trim();
    const icon = String(formData.get('icon') || '✨');
    if (!title) return;
    dialog.close();
    mutate('/api/oz/checklist/categories', 'POST', { title, icon }, 'Categoria criada. A jornada ganhou mais uma etapa!');
  });

  loadChecklist().catch((error) => {
    list.innerHTML = `<div class="error-state"><span>${escapeHtml(error.message || 'Não foi possível carregar o checklist agora.')}</span><button type="button" id="retryLoad">Tentar novamente</button></div>`;
    document.getElementById('retryLoad')?.addEventListener('click', () => {
      list.innerHTML = '<div class="loading-state"><span class="loader"></span><span>Carregando…</span></div>';
      loadChecklist().catch(() => showToast('Ainda não consegui conectar ao checklist.', true));
    });
  });

  window.setInterval(() => {
    if (document.hidden || pendingMutations || document.activeElement?.closest('.inline-add, .category-dialog')) return;
    loadChecklist({ quiet: true }).catch(() => {});
  }, 10000);
})();
