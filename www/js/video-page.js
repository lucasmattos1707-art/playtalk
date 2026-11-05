(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const state = { isAdmin: false, tracks: [], responses: [], pending: null, saving: false };
  const positions = ['superior esquerda', 'superior direita', 'inferior esquerda', 'inferior direita'];
  const respondentKey = (() => {
    try {
      let key = localStorage.getItem('fluentlevelup_video_visitor');
      if (!key) { key = crypto.randomUUID(); localStorage.setItem('fluentlevelup_video_visitor', key); }
      return key;
    } catch (_) { return crypto.randomUUID(); }
  })();

  function apiUrl(path) { return window.PlaytalkApi?.buildApiUrl(path) || path; }
  function apiHeaders(extra = {}) { return window.PlaytalkApi?.authHeaders(extra) || extra; }
  function setToast(message) {
    const toast = $('toast'); toast.textContent = message; toast.hidden = false;
    window.clearTimeout(setToast.timer); setToast.timer = window.setTimeout(() => { toast.hidden = true; }, 3000);
  }
  async function apiFetch(path, options = {}) {
    const response = await fetch(apiUrl(path), { credentials: 'include', ...options, headers: apiHeaders(options.headers || {}) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.success) throw new Error(payload.message || 'Não foi possível concluir agora.');
    return payload;
  }

  function drawQuadrant(canvas, img, index) {
    const width = Math.floor(img.naturalWidth / 2), height = Math.floor(img.naturalHeight / 2);
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, (index % 2) * width, Math.floor(index / 2) * height, width, height, 0, 0, width, height);
  }

  function renderGallery() {
    const root = $('imageList'); root.replaceChildren();
    if (state.isAdmin) renderCustomImageCreator(root);
    if (!state.tracks.length) {
      const empty = document.createElement('div'); empty.className = 'empty';
      if (state.isAdmin) empty.textContent = 'As faixas do Musical Kelly aparecerão aqui.';
      root.append(empty); return;
    }
    state.tracks.forEach((track) => {
      const image = track.image;
      const card = document.createElement('article'); card.className = 'card';
      const title = document.createElement('h2'); title.textContent = state.isAdmin ? track.title : (image?.title || track.title); card.append(title);
      if (state.isAdmin && !track.isCustom) renderTrackUploader(card, track);
      if (!image) { root.append(card); return; }
      const viewer = document.createElement('div'); viewer.className = 'viewer';
      const canvas = document.createElement('canvas'); viewer.append(canvas);
      const nav = document.createElement('div'); nav.className = 'nav';
      const prev = document.createElement('button'); prev.type = 'button'; prev.textContent = '‹'; prev.setAttribute('aria-label', 'Opção anterior');
      const next = document.createElement('button'); next.type = 'button'; next.textContent = '›'; next.setAttribute('aria-label', 'Próxima opção');
      nav.append(prev, next); viewer.append(nav); card.append(viewer);
      const dots = document.createElement('div'); dots.className = 'dots'; card.append(dots);
      const actions = document.createElement('div'); actions.className = 'actions';
      const choose = document.createElement('button'); choose.type = 'button'; choose.className = 'primary'; choose.textContent = 'Escolher';
      const none = document.createElement('button'); none.type = 'button'; none.className = 'none-choice'; none.textContent = 'Nenhuma';
      actions.append(choose, none); card.append(actions);
      const status = document.createElement('div'); status.className = 'card-status'; status.setAttribute('aria-live', 'polite'); card.append(status);
      const local = { index: 0, selected: null };
      const imageObj = new Image();
      imageObj.onload = () => renderOptions();
      imageObj.src = String(image.imageUrl || '').startsWith('data:') ? image.imageUrl : apiUrl(image.imageUrl);
      function renderOptions() {
        if (imageObj.naturalWidth && local.index >= 0) drawQuadrant(canvas, imageObj, local.index);
        dots.replaceChildren();
        for (let i = 0; i < 4; i += 1) {
          const dot = document.createElement('button'); dot.type = 'button'; dot.className = 'dot' + (i === local.index ? ' active' : '') + (i === local.selected ? ' chosen' : '');
          dot.textContent = String(i + 1); dot.setAttribute('aria-label', `Opção ${i + 1}`); dot.onclick = () => { local.index = i; renderOptions(); };
          dots.append(dot);
        }
        if (local.index === -1) {
          canvas.width = 1; canvas.height = 1;
          const mark = document.createElement('div'); mark.className = 'none-mark'; mark.textContent = '×';
          if (!viewer.querySelector('.none-mark')) viewer.append(mark);
        } else {
          viewer.querySelector('.none-mark')?.remove();
        }
        status.textContent = local.selected === -1 ? '×' : local.selected == null ? '' : `✓ ${positions[local.selected]}`;
        status.classList.toggle('is-none', local.selected === -1);
      }
      prev.onclick = () => { local.index = (local.index + 3) % 4; renderOptions(); };
      next.onclick = () => { local.index = (local.index + 1) % 4; renderOptions(); };
      choose.onclick = () => openModal(image.id, local.index, (result) => { local.selected = result.selectedOption; if (result.selectedOption >= 0) local.index = result.selectedOption; renderOptions(); });
      none.onclick = () => openModal(image.id, -1, (result) => { local.selected = result.selectedOption; local.index = -1; renderOptions(); });
      renderOptions();
      if (state.isAdmin) renderAdminResponses(card, image.id);
      root.append(card);
    });
  }

  function renderCustomImageCreator(root) {
    const card = document.createElement('article'); card.className = 'card';
    const title = document.createElement('h2'); title.textContent = 'Nova imagem'; card.append(title);
    renderTrackUploader(card, { id: '', title: '', image: null }, true);
    root.append(card);
  }

  function renderTrackUploader(card, track, isCustom = false) {
    const box = document.createElement('div'); box.className = 'upload-status';
    const row = document.createElement('div'); row.className = 'admin-form';
    const name = document.createElement('input'); name.type = 'text'; name.maxLength = 120; name.value = track.image?.title || track.title; name.placeholder = 'Título da imagem';
    const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/png,image/jpeg,image/webp';
    input.setAttribute('aria-label', `Imagem para ${track.title}`);
    const button = document.createElement('button'); button.type = 'button'; button.className = 'primary';
    button.textContent = isCustom ? 'Criar imagem' : track.image ? 'Trocar imagem' : 'Adicionar imagem'; button.disabled = true;
    row.append(name, input, button); box.append(row);
    const status = document.createElement('div'); status.className = 'upload-status'; status.setAttribute('aria-live', 'polite');
    status.textContent = isCustom ? 'Crie uma imagem avulsa com título.' : track.image ? 'Imagem vinculada a esta faixa.' : 'Aguardando imagem desta faixa.'; box.append(status);
    const preview = document.createElement('div'); preview.className = 'viewer'; preview.hidden = true;
    const canvas = document.createElement('canvas'); preview.append(canvas);
    const nav = document.createElement('div'); nav.className = 'nav';
    const prev = document.createElement('button'); prev.type = 'button'; prev.textContent = '‹'; prev.setAttribute('aria-label', 'Opção anterior');
    const next = document.createElement('button'); next.type = 'button'; next.textContent = '›'; next.setAttribute('aria-label', 'Próxima opção');
    nav.append(prev, next); preview.append(nav); box.append(preview);
    const dots = document.createElement('div'); dots.className = 'dots'; box.append(dots);
    card.append(box);
    let imageData = '', previewImage = null, option = 0;
    function renderPreview() {
      if (!previewImage) return;
      drawQuadrant(canvas, previewImage, option); dots.replaceChildren();
      for (let i = 0; i < 4; i += 1) {
        const dot = document.createElement('button'); dot.type = 'button'; dot.className = 'dot' + (i === option ? ' active' : ''); dot.textContent = String(i + 1);
        dot.setAttribute('aria-label', `Prévia da opção ${i + 1}`); dot.onclick = () => { option = i; renderPreview(); }; dots.append(dot);
      }
    }
    prev.onclick = () => { option = (option + 3) % 4; renderPreview(); };
    next.onclick = () => { option = (option + 1) % 4; renderPreview(); };
    input.addEventListener('change', () => {
      const file = input.files?.[0]; if (!file) return;
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { status.textContent = 'Use PNG, JPG ou WebP.'; button.disabled = true; return; }
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        if (img.naturalWidth < 2 || img.naturalHeight < 2) { status.textContent = 'A imagem não permite o recorte 2 × 2.'; button.disabled = true; return; }
        imageData = canvasDataUrl(img); previewImage = img; option = 0; preview.hidden = false; button.disabled = false; renderPreview();
        status.textContent = `${img.naturalWidth} × ${img.naturalHeight} px${track.title ? ` · imagem pronta para ${track.title}` : ' · prévia pronta'}.`;
      };
      img.onerror = () => { URL.revokeObjectURL(url); status.textContent = 'Não foi possível abrir essa imagem.'; button.disabled = true; };
      img.src = url;
    });
    button.onclick = async () => {
      if (!imageData) return;
      button.disabled = true; status.textContent = 'Publicando…';
      try {
        const endpoint = isCustom ? '/api/video-quadrants' : `/api/video-quadrants/${encodeURIComponent(track.id)}/image`;
        await apiFetch(endpoint, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageData, title: name.value.trim() })
        });
        await loadGallery(); setToast(isCustom ? 'Imagem criada.' : `Imagem vinculada a ${track.title}.`);
      } catch (error) { status.textContent = error.message; button.disabled = false; }
    };
  }

  function renderAdminResponses(card, trackId) {
    const section = document.createElement('div'); section.className = 'response-list';
    const rows = state.responses.filter((row) => row.imageId === trackId);
    if (!rows.length) {
      const empty = document.createElement('div'); empty.className = 'response'; empty.textContent = 'Ainda sem escolhas.'; section.append(empty);
    }
    rows.forEach((row) => {
      const item = document.createElement('div'); item.className = 'response';
      const who = document.createElement('strong'); who.textContent = row.respondentName || 'Visitante';
      const decision = document.createElement('span');
      decision.textContent = row.selectedOption === -1 ? ' · Nenhuma opção (×)' : ` · Opção ${Number(row.selectedOption) + 1} (${positions[Number(row.selectedOption)] || ''})`;
      item.append(who, decision);
      if (row.comment) { const comment = document.createElement('div'); comment.textContent = row.comment; item.append(comment); }
      else { const approved = document.createElement('div'); approved.textContent = 'Somente aprovou.'; item.append(approved); }
      section.append(item);
    });
    card.append(section);
  }

  function openModal(imageId, selectedOption, onSaved) {
    state.pending = { imageId, selectedOption, onSaved };
    $('commentInput').value = ''; $('modalStatus').textContent = '';
    $('modalTitle').textContent = selectedOption === -1 ? 'Nenhuma opção' : 'Sua escolha';
    $('commentInput').placeholder = selectedOption === -1 ? 'Explique por que nenhuma opção serve' : 'Escreva um comentário (opcional)';
    $('approveBtn').hidden = selectedOption === -1;
    $('commentModal').hidden = false; $('commentInput').focus();
  }

  async function saveResponse(withComment) {
    if (state.saving || !state.pending) return;
    const comment = $('commentInput').value.trim();
    if (withComment && !comment) { $('modalStatus').textContent = 'Escreva seu comentário.'; $('commentInput').focus(); return; }
    if (state.pending.selectedOption === -1 && !comment) { $('modalStatus').textContent = 'Para marcar nenhuma opção, explique o motivo.'; $('commentInput').focus(); return; }
    state.saving = true; $('commentBtn').disabled = true; $('approveBtn').disabled = true;
    try {
      await apiFetch(`/api/video-quadrants/${encodeURIComponent(state.pending.imageId)}/response`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ respondentKey, selectedOption: state.pending.selectedOption, comment })
      });
      const done = state.pending.onSaved; const result = { selectedOption: state.pending.selectedOption };
      $('commentModal').hidden = true; state.pending = null; if (done) done(result);
      setToast('Salvo! Obrigado por participar.');
      if (state.isAdmin) await loadGallery();
    } catch (error) { $('modalStatus').textContent = error.message; }
    finally { state.saving = false; $('commentBtn').disabled = false; $('approveBtn').disabled = false; }
  }

  function showAdmin() {
    $('adminBadge').hidden = !state.isAdmin;
  }
  async function loadGallery() {
    const result = await apiFetch('/api/video-quadrants');
    state.isAdmin = Boolean(result.isAdmin); state.tracks = Array.isArray(result.tracks) ? result.tracks : [];
    state.responses = Array.isArray(result.responses) ? result.responses : [];
    showAdmin(); renderGallery();
  }

  function canvasDataUrl(img) {
    const scale = Math.min(1, 1600 / img.naturalWidth, 1600 / img.naturalHeight);
    const canvas = document.createElement('canvas'); canvas.width = Math.max(2, Math.round(img.naturalWidth * scale)); canvas.height = Math.max(2, Math.round(img.naturalHeight * scale));
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/webp', 0.84);
  }
  $('commentBtn').onclick = () => saveResponse(true);
  $('approveBtn').onclick = () => saveResponse(false);
  $('commentModal').addEventListener('click', (event) => { if (event.target === $('commentModal') && state.pending?.selectedOption !== -1) $('commentModal').hidden = true; });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && state.pending?.selectedOption !== -1) $('commentModal').hidden = true; });
  loadGallery().catch((error) => { $('imageList').innerHTML = ''; const notice = document.createElement('div'); notice.className = 'empty'; notice.textContent = error.message; $('imageList').append(notice); });
  window.setInterval(() => {
    if (state.isAdmin && !document.hidden) loadGallery().catch(() => {});
  }, 60000);
})();
