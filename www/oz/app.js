(() => {
  'use strict';

  const STORAGE_KEY = 'fluentlevelup:oz:opened-categories:v1';
  const MEMBER_KEY = 'fluentlevelup:oz:member:v1';
  const list = document.getElementById('categoryList');
  const dialog = document.getElementById('categoryDialog');
  const teamDialog = document.getElementById('teamDialog');
  const teamRoster = document.getElementById('teamRoster');
  const assignMenu = document.getElementById('taskAssignMenu');
  const addMenu = document.getElementById('addMenu');
  let state = { categories: [] };
  let members = [];
  let activeMember = null;
  let mutationQueue = Promise.resolve();
  let pendingMutations = 0;
  let holdTimer = 0;
  let holdStart = null;
  let ignoreLongPressClick = false;
  let assignTaskId = '';
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
  try {
    const savedMember = JSON.parse(localStorage.getItem(MEMBER_KEY) || 'null');
    if (savedMember && typeof savedMember.id === 'string' && typeof savedMember.name === 'string') activeMember = savedMember;
  } catch (_error) {}
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
  const persistOpened = () => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...openedCategories])); } catch (_error) {}
  };

  function updateOverview() {
    const items = state.categories.flatMap((category) => category.items || []);
    const done = items.filter((item) => item.completed).length;
    const rate = items.length ? Math.round((done / items.length) * 100) : 0;
    document.getElementById('overallPercent').textContent = `${rate}%`;
    document.getElementById('overallBar').style.width = `${rate}%`;
    document.getElementById('overallSummary').textContent = `${done} de ${items.length} tarefas concluídas`;
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
        <div class="task-row ${item.completed ? 'is-done' : ''}" data-task-id="${escapeHtml(item.id)}">
          <button class="item-status ${item.completed ? 'is-done' : ''}" type="button" data-action="toggle-item" data-id="${escapeHtml(item.id)}" aria-label="${item.completed ? 'Marcar como pendente' : 'Marcar como concluído'}" title="${item.completed ? 'Marcar como pendente' : 'Marcar como concluído'}"></button>
          <span class="task-copy"><span class="task-title">${escapeHtml(item.title)}</span>${item.assigneeName ? `<span class="task-assignee"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.1"></circle><path d="M5.8 20c.25-3.8 2.35-5.7 6.2-5.7s5.95 1.9 6.2 5.7"></path></svg><span>${escapeHtml(item.assigneeName)}</span></span>` : ''}</span>
        </div>`).join('');
      return `<section class="group-block">${name ? `<h3 class="group-title">${escapeHtml(name)}</h3>` : ''}<div class="task-list">${taskMarkup || '<div class="task-row task-row--empty"><span class="task-title">Adicione o primeiro item desta etapa.</span></div>'}</div></section>`;
    }).join('');
    return `<article class="${cardClasses}" data-category="${escapeHtml(category.id)}">
      <div class="category-head">
        <button class="category-status ${category.completed ? 'is-done' : ''}" type="button" data-action="toggle-category" data-id="${escapeHtml(category.id)}" aria-label="${category.completed ? 'Marcar categoria como pendente' : 'Marcar categoria como concluída'}" title="${category.completed ? 'Marcar como pendente' : 'Marcar categoria como concluída'}"></button>
        <button class="category-title-button" type="button" data-action="open-category" data-id="${escapeHtml(category.id)}" aria-expanded="${isOpen}" aria-controls="panel-${escapeHtml(category.id)}">
          <span class="category-titleline"><span class="category-emoji" aria-hidden="true">${escapeHtml(category.icon || '✨')}</span><span class="category-title">${escapeHtml(category.title)}</span><span class="chevron" aria-hidden="true">›</span></span>
        </button>
        <div class="category-progress" role="img" aria-label="Progresso da categoria"><div class="progress-track"><span style="width:${itemRate}%"></span></div></div>
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
      } catch (_error) {
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
    document.getElementById('currentMemberLabel').textContent = activeMember?.name || 'Equipe';
    const activePanel = document.getElementById('activeMember');
    if (activeMember) {
      activePanel.hidden = false;
      activePanel.innerHTML = `<span class="member-avatar">${avatarSvg()}</span><span>Conectado como <strong>${escapeHtml(activeMember.name)}</strong></span><button type="button" data-team-action="logout">Sair</button>`;
    } else {
      activePanel.hidden = true;
      activePanel.innerHTML = '';
    }
  }

  function avatarSvg() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.1"></circle><path d="M5.8 20c.25-3.8 2.35-5.7 6.2-5.7s5.95 1.9 6.2 5.7"></path></svg>';
  }

  function setActiveMember(member) {
    activeMember = member ? { id: member.id, name: member.name } : null;
    try {
      if (activeMember) localStorage.setItem(MEMBER_KEY, JSON.stringify(activeMember));
      else localStorage.removeItem(MEMBER_KEY);
    } catch (_error) {}
    updateIdentity();
  }

  async function loadTeam() {
    const payload = await requestJson('/api/oz/team');
    members = Array.isArray(payload.members) ? payload.members : [];
    teamRoster.innerHTML = members.length
      ? members.map((member) => `<button class="roster-person ${activeMember?.id === member.id ? 'is-current' : ''}" type="button" data-member-id="${escapeHtml(member.id)}">${avatarSvg()}<span>${escapeHtml(member.name)}</span>${activeMember?.id === member.id ? '<small>Você</small>' : ''}</button>`).join('')
      : '<div class="roster-empty">Nenhum integrante cadastrado.</div>';
    if (activeMember && !members.some((member) => member.id === activeMember.id)) setActiveMember(null);
    updateIdentity();
  }

  function setTeamError(message = '') {
    const error = document.getElementById('teamError');
    error.textContent = message;
    error.hidden = !message;
  }

  async function openTeam() {
    addMenu.hidden = true;
    document.getElementById('toggleAddMenu').setAttribute('aria-expanded', 'false');
    setTeamError('');
    document.getElementById('newMemberForm').hidden = true;
    teamDialog.showModal();
    try { await loadTeam(); } catch (_error) { teamRoster.innerHTML = '<div class="roster-empty">Equipe indisponível no momento.</div>'; }
  }

  function closeAssignMenu() {
    assignMenu.hidden = true;
    assignTaskId = '';
  }

  function openAssignMenu(row) {
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
    const row = event.target.closest('.task-row[data-task-id]');
    if (!row || event.target.closest('.item-status') || (event.button !== undefined && event.button !== 0)) return;
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
      const category = state.categories.find((entry) => entry.id === id);
      if (category) mutate(`/api/oz/checklist/categories/${encodeURIComponent(id)}`, 'PATCH', { completed: !category.completed });
      return;
    }
    if (action === 'toggle-item' && id) {
      const item = state.categories.flatMap((entry) => entry.items || []).find((entry) => entry.id === id);
      if (item) mutate(`/api/oz/checklist/items/${encodeURIComponent(id)}`, 'PATCH', { completed: !item.completed });
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
    mutate(`/api/oz/checklist/categories/${encodeURIComponent(categoryId)}/items`, 'POST', { title, group });
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
  document.getElementById('openTeamDialog').addEventListener('click', openTeam);
  document.getElementById('closeTeamDialog').addEventListener('click', () => {
    if (activeMember) teamDialog.close();
  });
  teamDialog.addEventListener('cancel', (event) => {
    if (!activeMember) event.preventDefault();
  });
  teamDialog.addEventListener('click', (event) => { if (event.target === teamDialog && activeMember) teamDialog.close(); });
  document.getElementById('showAddMember').addEventListener('click', () => {
    const form = document.getElementById('newMemberForm');
    form.hidden = !form.hidden;
    if (!form.hidden) document.getElementById('newMemberName').focus();
    setTeamError('');
  });
  teamRoster.addEventListener('click', (event) => {
    const button = event.target.closest('[data-member-id]');
    if (!button) return;
    const member = members.find((entry) => entry.id === button.dataset.memberId);
    if (member) {
      setActiveMember(member);
      loadTeam().catch(() => {});
    }
  });
  document.getElementById('activeMember').addEventListener('click', (event) => {
    if (event.target.closest('[data-team-action="logout"]')) {
      setActiveMember(null);
      loadTeam().catch(() => {});
      if (!teamDialog.open) teamDialog.showModal();
    }
  });
  document.getElementById('teamLoginForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = String(new FormData(event.currentTarget).get('name') || '').trim();
    try {
      const payload = await requestJson('/api/oz/team/login', { method: 'POST', body: JSON.stringify({ name }) });
      setActiveMember(payload.member);
      teamDialog.close();
    } catch (error) { setTeamError(error.message); }
  });
  document.getElementById('newMemberForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const name = String(new FormData(form).get('name') || '').trim();
    try {
      const payload = await requestJson('/api/oz/team/members', { method: 'POST', body: JSON.stringify({ name }) });
      setActiveMember(payload.member);
      form.reset();
      form.hidden = true;
      await loadTeam();
      teamDialog.close();
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

  loadChecklist().catch((error) => {
    list.innerHTML = `<div class="error-state"><span>${escapeHtml(error.message || 'Não foi possível carregar o checklist agora.')}</span><button type="button" id="retryLoad">Tentar novamente</button></div>`;
    document.getElementById('retryLoad')?.addEventListener('click', () => {
      list.innerHTML = '<div class="loading-state"><span class="loader"></span><span>Carregando…</span></div>';
      loadChecklist().catch(() => {});
    });
  });
  updateIdentity();
  loadTeam().then(() => {
    if (!activeMember) {
      teamDialog.showModal();
      document.getElementById('teamLoginName').focus();
    }
  }).catch(() => {});
  window.setInterval(() => {
    if (document.hidden || pendingMutations || document.activeElement?.closest('.inline-add, .category-dialog, .team-dialog')) return;
    loadChecklist().catch(() => {});
    if (teamDialog.open) loadTeam().catch(() => {});
  }, 10000);
})();
