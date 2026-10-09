(() => {
  'use strict';

  const STORAGE_KEY = 'fluentlevelup:oz:opened-categories:v1';
  const MEMBER_KEY = 'fluentlevelup:oz:member:v1';
  const loginScreen = document.getElementById('loginScreen');
  const checklistApp = document.getElementById('checklistApp');
  const pageLoginForm = document.getElementById('pageLoginForm');
  const list = document.getElementById('categoryList');
  const dialog = document.getElementById('categoryDialog');
  const teamDialog = document.getElementById('teamDialog');
  const assignMenu = document.getElementById('taskAssignMenu');
  const statusDialog = document.getElementById('statusDialog');
  const statusOptions = document.getElementById('statusOptions');
  const subtaskDialog = document.getElementById('subtaskDialog');
  const subtaskForm = document.getElementById('newSubtaskForm');
  const addMenu = document.getElementById('addMenu');
  const accountMenu = document.getElementById('accountMenu');
  let state = { categories: [] };
  let members = [];
  let activeMember = null;
  let mutationQueue = Promise.resolve();
  let pendingMutations = 0;
  let holdTimer = 0;
  let holdStart = null;
  let ignoreLongPressClick = false;
  let assignTaskId = '';
  let statusTaskId = '';
  let subtaskParentId = '';
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
  let savedMemberId = '';
  try {
    const savedMember = JSON.parse(localStorage.getItem(MEMBER_KEY) || 'null');
    if (savedMember && typeof savedMember.id === 'string') savedMemberId = savedMember.id;
  } catch (_error) {}
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
  const persistOpened = () => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...openedCategories])); } catch (_error) {}
  };

  function updateOverview() {
    const items = state.categories.flatMap((category) => flattenItems(category.items || []));
    const done = items.filter((item) => item.completed).length;
    const rate = items.length ? Math.round((done / items.length) * 100) : 0;
    document.getElementById('overallPercent').textContent = `${rate}%`;
    document.getElementById('overallBar').style.width = `${rate}%`;
    document.getElementById('overallSummary').textContent = `${done} de ${items.length} tarefas concluídas`;
  }

  function getItemStatus(item) {
    if (['pending', 'completed', 'in_progress'].includes(item.status)) return item.status;
    return item.completed ? 'completed' : 'pending';
  }

  function statusLabel(status) {
    return ({ pending: 'Pendente', completed: 'Concluído', in_progress: 'Em andamento' })[status] || 'Pendente';
  }

  function statusIcon(status) {
    if (status === 'completed') return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.3"></circle><path d="m8.3 12.2 2.4 2.4 5-5"></path></svg>';
    if (status === 'in_progress') return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.3"></circle><path d="M12 7.5v5l3.2 1.8"></path></svg>';
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.3"></circle></svg>';
  }

  function flattenItems(items) {
    return items.flatMap((item) => [item, ...flattenItems(Array.isArray(item.subtasks) ? item.subtasks : [])]);
  }

  function renderTask(item) {
    const itemStatus = getItemStatus(item);
    const subtasks = Array.isArray(item.subtasks) ? item.subtasks : [];
    const taskOpenKey = `task:${item.id}`;
    const isOpen = openedCategories.has(taskOpenKey);
    const hasSubtasks = subtasks.length > 0;
    return `<div class="task-node">
      <div class="task-row ${itemStatus === 'completed' ? 'is-done' : ''} ${itemStatus === 'in_progress' ? 'is-in-progress' : ''}" data-task-id="${escapeHtml(item.id)}">
        ${activeMember?.isKelly ? `<button class="subtask-add" type="button" data-action="add-subfolder" data-id="${escapeHtml(item.id)}" aria-label="Adicionar sub pasta" title="Adicionar sub pasta"><span aria-hidden="true">+</span></button>` : ''}
        <button class="item-status status-${itemStatus}" type="button" aria-label="${statusLabel(itemStatus)}" title="${statusLabel(itemStatus)}">${statusIcon(itemStatus)}</button>
        ${hasSubtasks ? `<button class="task-toggle ${isOpen ? 'is-open' : ''}" type="button" data-action="toggle-subtasks" data-id="${escapeHtml(item.id)}" aria-expanded="${isOpen}" aria-controls="subtasks-${escapeHtml(item.id)}" aria-label="${isOpen ? 'Recolher' : 'Abrir'} sub tarefas"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"></path></svg></button>` : '<span class="task-toggle-spacer" aria-hidden="true"></span>'}
        <span class="task-copy"><span class="task-title">${escapeHtml(item.title)}</span>${item.assigneeName ? `<span class="task-assignee"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.1"></circle><path d="M5.8 20c.25-3.8 2.35-5.7 6.2-5.7s5.95 1.9 6.2 5.7"></path></svg><span>${escapeHtml(item.assigneeName)}</span></span>` : ''}</span>
        ${activeMember?.isKelly ? `<button class="delete-task" type="button" data-action="delete-item" data-id="${escapeHtml(item.id)}" aria-label="Excluir tarefa" title="Excluir tarefa"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4.5h10l4 4V20H5z"></path><path d="M15 4.5V9h4M9 13h6M9 16h6"></path></svg></button>` : ''}
      </div>
      ${hasSubtasks ? `<div class="subtask-list" id="subtasks-${escapeHtml(item.id)}" ${isOpen ? '' : 'hidden'}>${subtasks.map(renderTask).join('')}</div>` : ''}
    </div>`;
  }

  function renderCategory(category) {
    const items = Array.isArray(category.items) ? category.items : [];
    const allItems = flattenItems(items);
    const doneCount = allItems.filter((item) => getItemStatus(item) === 'completed').length;
    const itemRate = allItems.length ? Math.round((doneCount / allItems.length) * 100) : 0;
    const isOpen = openedCategories.has(category.id);
    const cardClasses = ['category-card', isOpen ? 'is-open' : '', category.completed ? 'is-complete' : ''].filter(Boolean).join(' ');
    const grouped = new Map();
    const names = [...(Array.isArray(category.groups) ? category.groups : [])];
    for (const item of items) if (item.group && !names.includes(item.group)) names.push(item.group);
    if (names.some(Boolean)) grouped.set('', items.filter((item) => !item.group));
    for (const name of names) grouped.set(name, items.filter((item) => item.group === name));
    if (!grouped.size) grouped.set('', items);

    const groupMarkup = [...grouped.entries()].map(([name, groupItems]) => {
      const taskMarkup = groupItems.map(renderTask).join('');
      return `<section class="group-block">${name ? `<h3 class="group-title">${escapeHtml(name)}</h3>` : ''}<div class="task-list">${taskMarkup || '<div class="task-row task-row--empty"><span class="task-title">Adicione o primeiro item desta etapa.</span></div>'}</div></section>`;
    }).join('');
    return `<article class="${cardClasses}" data-category="${escapeHtml(category.id)}">
      <div class="category-head">
        ${activeMember?.isKelly ? `<button class="category-status ${category.completed ? 'is-done' : ''}" type="button" data-action="toggle-category" data-id="${escapeHtml(category.id)}" aria-label="${category.completed ? 'Marcar categoria como pendente' : 'Marcar categoria como concluída'}" title="${category.completed ? 'Marcar como pendente' : 'Marcar categoria como concluída'}"></button>` : '<span class="category-status-spacer" aria-hidden="true"></span>'}
        <button class="category-title-button" type="button" data-action="open-category" data-id="${escapeHtml(category.id)}" aria-expanded="${isOpen}" aria-controls="panel-${escapeHtml(category.id)}">
          <span class="category-titleline"><span class="category-emoji" aria-hidden="true">${escapeHtml(category.icon || '✨')}</span><span class="category-title">${escapeHtml(category.title)}</span><span class="chevron" aria-hidden="true">›</span></span>
        </button>
        <div class="category-progress" role="img" aria-label="Progresso da categoria"><div class="progress-track"><span style="width:${itemRate}%"></span></div></div>
      </div>
      <div class="category-content" id="panel-${escapeHtml(category.id)}" ${isOpen ? '' : 'hidden'}>
        ${groupMarkup}
        ${activeMember?.isKelly ? `<div class="add-area"><button class="add-item" type="button" data-action="show-add-item" data-id="${escapeHtml(category.id)}"><span aria-hidden="true">+</span> Adicionar item</button></div>` : ''}
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
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (activeMember?.id) headers['X-Oz-Member-Id'] = activeMember.id;
    const response = await fetch(url, {
      ...options,
      headers,
      cache: 'no-store'
    });
    let payload = {};
    try { payload = await response.json(); } catch (_error) {}
    if (!response.ok || payload.success === false) {
      const error = new Error(payload.message || 'Não foi possível salvar a alteração.');
      error.status = response.status;
      if (response.status === 401 && activeMember) exitUser();
      throw error;
    }
    return payload;
  }

  async function loadChecklist() {
    const payload = await requestJson('/api/oz/checklist');
    const next = { categories: Array.isArray(payload.categories) ? payload.categories : [] };
    if (JSON.stringify(next) !== lastPayload) {
      state = next;
      render();
    }
  }

  function mutate(url, method, body) {
    pendingMutations += 1;
    mutationQueue = mutationQueue.then(async () => {
      try {
        const payload = await requestJson(url, { method, body: JSON.stringify(body) });
        state = { categories: Array.isArray(payload.categories) ? payload.categories : [] };
        render();
      } catch (error) {
        if (error.status === 401) exitUser();
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

  function updateIdentity() {
    document.getElementById('currentMemberLabel').textContent = activeMember?.name || '';
    document.querySelector('.list-actions').hidden = !activeMember?.isKelly;
  }

  function avatarSvg() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.1"></circle><path d="M5.8 20c.25-3.8 2.35-5.7 6.2-5.7s5.95 1.9 6.2 5.7"></path></svg>';
  }

  function setActiveMember(member) {
    activeMember = member ? { id: member.id, name: member.name, isKelly: Boolean(member.isKelly) } : null;
    try {
      if (activeMember) localStorage.setItem(MEMBER_KEY, JSON.stringify(activeMember));
      else localStorage.removeItem(MEMBER_KEY);
    } catch (_error) {}
    updateIdentity();
  }

  async function resolveMember(id) {
    const response = await fetch('/api/oz/team/session', { headers: { 'X-Oz-Member-Id': id }, cache: 'no-store' });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.member) throw new Error('Sessão expirada. Entre novamente.');
    return payload.member;
  }

  async function loadTeam() {
    if (!activeMember?.isKelly) { members = []; return; }
    const payload = await requestJson('/api/oz/team');
    members = Array.isArray(payload.members) ? payload.members : [];
  }

  function setTeamError(message = '') {
    const error = document.getElementById('teamError');
    error.textContent = message;
    error.hidden = !message;
  }

  async function openTeam() {
    if (!activeMember?.isKelly) return;
    addMenu.hidden = true;
    document.getElementById('toggleAddMenu').setAttribute('aria-expanded', 'false');
    setTeamError('');
    document.getElementById('newMemberForm').reset();
    teamDialog.showModal();
    document.getElementById('newMemberName').focus();
  }

  function exitUser() {
    setActiveMember(null);
    members = [];
    state = { categories: [] };
    lastPayload = '';
    checklistApp.hidden = true;
    loginScreen.hidden = false;
    accountMenu.hidden = true;
    document.getElementById('accountButton').setAttribute('aria-expanded', 'false');
    if (teamDialog.open) teamDialog.close();
    document.getElementById('loginError').hidden = true;
    document.getElementById('pageLoginName').value = '';
    list.innerHTML = '<div class="loading-state"><span class="loader"></span><span>Entre para carregar suas tarefas.</span></div>';
    document.getElementById('pageLoginName').focus();
  }

  async function enterApp() {
    loginScreen.hidden = true;
    checklistApp.hidden = false;
    updateIdentity();
    try { await loadChecklist(); } catch (_error) {}
    try { await loadTeam(); } catch (_error) { members = []; }
  }

  function openStatusMenu(row) {
    const itemId = row?.dataset.taskId;
    const item = state.categories.flatMap((category) => category.items || []).find((entry) => entry.id === itemId);
    if (!item) return;
    const currentStatus = getItemStatus(item);
    statusTaskId = itemId;
    document.getElementById('statusTaskTitle').textContent = item.title;
    statusOptions.innerHTML = ['pending', 'completed', 'in_progress']
      .filter((status) => status !== currentStatus)
      .map((status) => `<button class="status-choice status-choice--${status}" type="button" data-next-status="${status}">${statusIcon(status)}<span>${statusLabel(status)}</span></button>`)
      .join('');
    statusDialog.showModal();
  }

  function closeStatusMenu() {
    statusTaskId = '';
    if (statusDialog.open) statusDialog.close();
  }

  pageLoginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = String(new FormData(pageLoginForm).get('name') || '').trim();
    const error = document.getElementById('loginError');
    error.hidden = true;
    try {
      const payload = await requestJson('/api/oz/team/login', { method: 'POST', body: JSON.stringify({ name }) });
      setActiveMember(payload.member);
      await enterApp();
    } catch (problem) {
      error.textContent = problem.message || 'Não foi possível entrar.';
      error.hidden = false;
    }
  });

  function closeAssignMenu() {
    assignMenu.hidden = true;
    assignTaskId = '';
  }

  function openAssignMenu(row) {
    if (!activeMember?.isKelly) return;
    assignTaskId = row.dataset.taskId;
    const currentItem = state.categories.flatMap((category) => category.items || []).find((item) => item.id === assignTaskId);
    const people = members.map((member) => `<button type="button" class="assign-person" data-assign-id="${escapeHtml(member.id)}">${avatarSvg()}<span>${escapeHtml(member.name)}</span>${currentItem?.assigneeId === member.id ? '<span class="assigned-check">✓</span>' : ''}</button>`).join('');
    assignMenu.innerHTML = `<div class="assign-menu-title">Delegar tarefa</div>${people || '<div class="assign-empty">Ainda não há integrantes.</div>'}${currentItem?.assigneeId ? '<button type="button" class="assign-clear" data-assign-id="">Remover responsável</button>' : ''}${!members.length ? '<button type="button" class="assign-add-person" data-assign-open-team>Adicionar integrante</button>' : ''}`;
    assignMenu.hidden = false;
    const bounds = row.getBoundingClientRect();
    const menuBounds = assignMenu.getBoundingClientRect();
    const left = Math.max(12, Math.min(bounds.left, window.innerWidth - menuBounds.width - 12));
    const below = bounds.bottom + 6;
    const top = below + menuBounds.height <= window.innerHeight - 12 ? below : Math.max(12, bounds.top - menuBounds.height - 6);
    assignMenu.style.left = `${left}px`;
    assignMenu.style.top = `${top}px`;
  }

  function clearHold() {
    window.clearTimeout(holdTimer);
    holdTimer = 0;
    holdStart = null;
  }

  list.addEventListener('pointerdown', (event) => {
    if (!activeMember?.isKelly) return;
    const row = event.target.closest('.task-row[data-task-id]');
    if (!row || event.target.closest('.item-status, .delete-task, .subtask-add, .task-toggle') || (event.button !== undefined && event.button !== 0)) return;
    holdStart = { x: event.clientX, y: event.clientY, row };
    holdTimer = window.setTimeout(() => {
      openAssignMenu(row);
      holdStart = null;
      ignoreLongPressClick = true;
      window.setTimeout(() => { ignoreLongPressClick = false; }, 1000);
    }, 550);
  });
  list.addEventListener('pointermove', (event) => {
    if (holdStart && Math.hypot(event.clientX - holdStart.x, event.clientY - holdStart.y) > 10) clearHold();
  });
  document.addEventListener('pointerup', clearHold);
  document.addEventListener('pointercancel', clearHold);
  list.addEventListener('contextmenu', (event) => {
    if (event.target.closest('.task-row[data-task-id]')) event.preventDefault();
  });

  list.addEventListener('click', (event) => {
    if (ignoreLongPressClick && event.target.closest('.task-row[data-task-id]')) {
      event.preventDefault();
      return;
    }
    const taskRow = event.target.closest('.task-row[data-task-id]');
    if (taskRow && !event.target.closest('.delete-task, .subtask-add, .task-toggle')) {
      openStatusMenu(taskRow);
      return;
    }
    const control = event.target.closest('[data-action]');
    if (!control) return;
    const action = control.dataset.action;
    const id = control.dataset.id;
    const card = control.closest('.category-card');
    if (action === 'open-category' && id) {
      const opening = !openedCategories.has(id);
      if (opening) openedCategories.add(id);
      else openedCategories.delete(id);
      persistOpened();
      control.setAttribute('aria-expanded', String(opening));
      card?.classList.toggle('is-open', opening);
      const panel = card?.querySelector('.category-content');
      if (panel) panel.hidden = !opening;
      return;
    }
    if (action === 'toggle-category' && id) {
      if (!activeMember?.isKelly) return;
      const category = state.categories.find((entry) => entry.id === id);
      if (category) mutate(`/api/oz/checklist/categories/${encodeURIComponent(id)}`, 'PATCH', { completed: !category.completed });
      return;
    }
    if (action === 'toggle-subtasks' && id) {
      const openKey = `task:${id}`;
      const opening = !openedCategories.has(openKey);
      if (opening) openedCategories.add(openKey);
      else openedCategories.delete(openKey);
      persistOpened();
      control.setAttribute('aria-expanded', String(opening));
      control.setAttribute('aria-label', `${opening ? 'Recolher' : 'Abrir'} sub tarefas`);
      control.classList.toggle('is-open', opening);
      const panel = document.getElementById(control.getAttribute('aria-controls'));
      if (panel) panel.hidden = !opening;
      return;
    }
    if (action === 'add-subfolder' && id && activeMember?.isKelly) {
      subtaskParentId = id;
      subtaskForm.reset();
      subtaskDialog.showModal();
      document.getElementById('newSubtaskTitle').focus();
      return;
    }
    if (action === 'delete-item' && id && activeMember?.isKelly) {
      const item = state.categories.flatMap((entry) => entry.items || []).find((entry) => entry.id === id);
      if (item && window.confirm(`Excluir a tarefa "${item.title}"?`)) mutate(`/api/oz/checklist/items/${encodeURIComponent(id)}`, 'DELETE');
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
    if (activeMember?.isKelly) mutate(`/api/oz/checklist/categories/${encodeURIComponent(categoryId)}/items`, 'POST', { title, group });
  });

  document.getElementById('toggleAddMenu').addEventListener('click', () => {
    const opening = addMenu.hidden;
    addMenu.hidden = !opening;
    document.getElementById('toggleAddMenu').setAttribute('aria-expanded', String(opening));
  });
  addMenu.addEventListener('click', (event) => {
    const option = event.target.closest('[data-menu-action]');
    if (!option) return;
    addMenu.hidden = true;
    document.getElementById('toggleAddMenu').setAttribute('aria-expanded', 'false');
    if (option.dataset.menuAction === 'category') {
      document.getElementById('newCategoryForm').reset();
      dialog.showModal();
      document.getElementById('newCategoryTitle').focus();
    } else if (option.dataset.menuAction === 'team') openTeam();
  });
  document.getElementById('closeTeamDialog').addEventListener('click', () => teamDialog.close());
  teamDialog.addEventListener('cancel', () => {});
  teamDialog.addEventListener('click', (event) => { if (event.target === teamDialog) teamDialog.close(); });
  document.getElementById('accountButton').addEventListener('click', () => {
    const opening = accountMenu.hidden;
    accountMenu.hidden = !opening;
    document.getElementById('accountButton').setAttribute('aria-expanded', String(opening));
  });
  accountMenu.addEventListener('click', (event) => {
    if (event.target.closest('[data-account-action="logout"]')) exitUser();
  });
  document.getElementById('newMemberForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const name = String(new FormData(form).get('name') || '').trim();
    try {
      const payload = await requestJson('/api/oz/team/members', { method: 'POST', body: JSON.stringify({ name }) });
      members = [...members, payload.member];
      form.reset();
      setTeamError('Integrante adicionado à equipe.');
    } catch (error) { setTeamError(error.message); }
  });
  assignMenu.addEventListener('click', (event) => {
    if (event.target.closest('[data-assign-open-team]')) {
      closeAssignMenu();
      openTeam();
      return;
    }
    const button = event.target.closest('[data-assign-id]');
    if (!button || !assignTaskId) return;
    const id = assignTaskId;
    const assigneeId = button.dataset.assignId || null;
    closeAssignMenu();
    mutate(`/api/oz/checklist/items/${encodeURIComponent(id)}`, 'PATCH', { assigneeId });
  });
  document.addEventListener('click', (event) => {
    if (ignoreLongPressClick && event.target.closest('.task-row[data-task-id]')) {
      ignoreLongPressClick = false;
      return;
    }
    if (!event.target.closest('.add-menu-wrap')) {
      addMenu.hidden = true;
      document.getElementById('toggleAddMenu').setAttribute('aria-expanded', 'false');
    }
    if (!event.target.closest('#taskAssignMenu')) closeAssignMenu();
  });

  document.getElementById('closeCategoryDialog').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
  document.getElementById('closeStatusDialog').addEventListener('click', closeStatusMenu);
  statusDialog.addEventListener('click', (event) => { if (event.target === statusDialog) closeStatusMenu(); });
  statusDialog.addEventListener('close', () => { statusTaskId = ''; });
  statusOptions.addEventListener('click', (event) => {
    const option = event.target.closest('[data-next-status]');
    if (!option || !statusTaskId) return;
    const itemId = statusTaskId;
    const status = option.dataset.nextStatus;
    closeStatusMenu();
    mutate(`/api/oz/checklist/items/${encodeURIComponent(itemId)}`, 'PATCH', { status });
  });
  document.getElementById('closeSubtaskDialog').addEventListener('click', () => {
    subtaskParentId = '';
    subtaskDialog.close();
  });
  subtaskDialog.addEventListener('click', (event) => {
    if (event.target === subtaskDialog) {
      subtaskParentId = '';
      subtaskDialog.close();
    }
  });
  subtaskForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!activeMember?.isKelly || !subtaskParentId) return;
    const title = String(new FormData(subtaskForm).get('title') || '').trim();
    if (!title) return;
    const parentId = subtaskParentId;
    subtaskParentId = '';
    subtaskDialog.close();
    openedCategories.add(`task:${parentId}`);
    persistOpened();
    mutate(`/api/oz/checklist/items/${encodeURIComponent(parentId)}/subtasks`, 'POST', { title });
  });
  document.getElementById('newCategoryForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const title = String(formData.get('title') || '').trim();
    const icon = String(formData.get('icon') || '✨');
    if (!title) return;
    dialog.close();
    mutate('/api/oz/checklist/categories', 'POST', { title, icon });
  });

  updateIdentity();
  if (savedMemberId) resolveMember(savedMemberId).then(async (member) => {
    setActiveMember(member);
    await enterApp();
  }).catch(() => exitUser());
  const eventAt = new Date('2026-11-29T16:00:00-03:00').getTime();
  const updateCountdown = () => {
    const remainingHours = Math.max(0, Math.floor((eventAt - Date.now()) / 3600000));
    const days = Math.floor(remainingHours / 24);
    const hours = remainingHours % 24;
    const label = `${days} DIAS · ${String(hours).padStart(2, '0')} HORAS`;
    const countdown = document.getElementById('eventCountdown');
    countdown.textContent = label;
    countdown.setAttribute('aria-label', label.toLocaleLowerCase('pt-BR'));
  };
  updateCountdown();
  window.setInterval(updateCountdown, 60000);
  window.setInterval(() => {
    if (!activeMember) return;
    if (document.hidden || pendingMutations || document.activeElement?.closest('.inline-add, .category-dialog, .team-dialog')) return;
    loadChecklist().catch(() => {});
    if (activeMember?.isKelly) loadTeam().catch(() => {});
  }, 10000);
})();
