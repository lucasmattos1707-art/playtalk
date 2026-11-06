(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const state = { isAdmin: false, tracks: [], submittedImages: [], responses: [], approvalProgress: { approved: 0, total: 0 }, pending: null, saving: false, visitorUploadSource: null };
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
    if (state.isAdmin && !state.tracks.some((track) => track.isCustom)) renderCustomImageCreator(root);
    if (state.isAdmin) renderVisitorSubmissions(root);
    if (!state.tracks.length) {
      const empty = document.createElement('div'); empty.className = 'empty';
      empty.textContent = state.isAdmin ? 'As faixas do Musical Kelly aparecerão aqui.' : 'Nenhuma imagem disponível para aprovar no momento.';
      root.append(empty);
      if (state.isAdmin) renderRemovedResponses(root);
      return;
    }
    state.tracks.forEach((track) => {
      const image = track.image;
      const card = document.createElement('article'); card.className = 'card';
      const title = document.createElement('h2'); title.textContent = state.isAdmin ? track.title : (image?.title || track.title); card.append(title);
      if (state.isAdmin) renderTrackUploader(card, track, track.isCustom ? 'replace-custom' : 'track');
      if (!image) { root.append(card); return; }
      const viewer = document.createElement('div'); viewer.className = 'viewer';
      const canvas = document.createElement('canvas'); viewer.append(canvas);
      const nav = document.createElement('div'); nav.className = 'nav';
      const prev = document.createElement('button'); prev.type = 'button'; prev.textContent = '‹'; prev.setAttribute('aria-label', 'Opção anterior');
      const next = document.createElement('button'); next.type = 'button'; next.textContent = '›'; next.setAttribute('aria-label', 'Próxima opção');
      nav.append(prev, next); viewer.append(nav); card.append(viewer);
      if (!state.isAdmin) {
        const hint = document.createElement('div'); hint.className = 'longpress-hint';
        hint.textContent = 'Segure a imagem por 300 ms para enviar uma imagem inteira.'; card.append(hint);
      }
      const dots = document.createElement('div'); dots.className = 'dots'; card.append(dots);
      const actions = document.createElement('div'); actions.className = 'actions';
      const choose = document.createElement('button'); choose.type = 'button'; choose.className = 'primary'; choose.textContent = 'Escolher';
      const none = document.createElement('button'); none.type = 'button'; none.className = 'none-choice'; none.textContent = 'Nenhuma';
      actions.append(choose, none); card.append(actions);
      const status = document.createElement('div'); status.className = 'card-status'; status.setAttribute('aria-live', 'polite'); card.append(status);
      const local = { index: 0, selected: null };
      const imageObj = new Image();
      imageObj.onload = () => renderOptions();
      imageObj.onerror = () => {
        const error = document.createElement('div'); error.className = 'image-error';
        error.textContent = state.isAdmin ? 'Imagem indisponível no R2 · troque a imagem acima' : 'Imagem indisponível no momento';
        viewer.append(error);
      };
      imageObj.src = String(image.imageUrl || '').startsWith('data:') ? image.imageUrl : apiUrl(image.imageUrl);
      if (!state.isAdmin) bindVisitorUploadGesture(canvas, image);
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
    if (state.isAdmin) renderRemovedResponses(root);
  }

  function renderVisitorSubmissions(root) {
    if (!state.submittedImages.length) return;
    const section = document.createElement('section'); section.className = 'visitor-submissions';
    const heading = document.createElement('h2'); heading.textContent = 'Imagens enviadas por visitantes'; section.append(heading);
    state.submittedImages.forEach((image) => {
      const card = document.createElement('article'); card.className = 'card visitor-submission';
      const title = document.createElement('h3'); title.textContent = image.title; card.append(title);
      const viewer = document.createElement('div'); viewer.className = 'viewer visitor-full-viewer';
      const photo = document.createElement('img'); photo.className = 'visitor-full-image'; photo.alt = image.title;
      photo.src = String(image.imageUrl || '').startsWith('data:') ? image.imageUrl : apiUrl(image.imageUrl);
      viewer.append(photo); card.append(viewer);
      const badge = document.createElement('div'); badge.className = 'approved-badge'; badge.textContent = 'Aprovada automaticamente'; card.append(badge);
      section.append(card);
    });
    root.append(section);
  }

  function bindVisitorUploadGesture(canvas, image) {
    let timer = 0, startX = 0, startY = 0;
    const clear = () => { window.clearTimeout(timer); timer = 0; };
    canvas.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      startX = event.clientX; startY = event.clientY;
      clear();
      timer = window.setTimeout(() => openVisitorUpload(image), 300);
    });
    canvas.addEventListener('pointermove', (event) => {
      if (Math.abs(event.clientX - startX) > 12 || Math.abs(event.clientY - startY) > 12) clear();
    });
    canvas.addEventListener('pointerup', clear);
    canvas.addEventListener('pointercancel', clear);
    canvas.addEventListener('pointerleave', clear);
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  function renderRemovedResponses(root) {
    const rows = state.responses.filter((row) => row.imageDeleted);
    if (!rows.length) return;
    const section = document.createElement('section'); section.className = 'card response-list';
    const title = document.createElement('h2'); title.textContent = 'Imagens removidas por “Nenhuma”'; section.append(title);
    rows.forEach((row) => {
      const item = document.createElement('div'); item.className = 'response';
      const who = document.createElement('strong'); who.textContent = row.respondentName || 'Visitante'; item.append(who);
      const imageTitle = document.createElement('span'); imageTitle.textContent = ` · ${row.imageTitle || 'Imagem'}`; item.append(imageTitle);
      if (row.comment) { const comment = document.createElement('div'); comment.textContent = row.comment; item.append(comment); }
      section.append(item);
    });
    root.append(section);
  }

  function renderCustomImageCreator(root) {
    const card = document.createElement('article'); card.className = 'card';
    const title = document.createElement('h2'); title.textContent = 'Nova imagem'; card.append(title);
    renderTrackUploader(card, { id: '', title: '', image: null }, 'create');
    root.append(card);
  }

  function renderTrackUploader(card, track, mode = 'track') {
    const isNewCustom = mode === 'create';
    const box = document.createElement('div'); box.className = 'upload-status';
    const row = document.createElement('div'); row.className = 'admin-form';
    const name = document.createElement('input'); name.type = 'text'; name.maxLength = 120; name.value = track.image?.title || track.title; name.placeholder = 'Título da imagem';
    const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/png,image/jpeg,image/webp';
    input.setAttribute('aria-label', `Imagem para ${track.title}`);
    const button = document.createElement('button'); button.type = 'button'; button.className = 'primary';
    button.textContent = isNewCustom ? 'Criar imagem' : track.image ? 'Trocar imagem' : 'Adicionar imagem'; button.disabled = true;
    row.append(name, input, button); box.append(row);
    const status = document.createElement('div'); status.className = 'upload-status'; status.setAttribute('aria-live', 'polite');
    status.textContent = isNewCustom ? 'Crie uma imagem avulsa com título.' : track.image ? 'Imagem vinculada a esta faixa.' : 'Aguardando imagem desta faixa.'; box.append(status);
    const showUploadPreview = !track.image;
    const preview = document.createElement('div'); preview.className = 'viewer'; preview.hidden = true;
    const canvas = document.createElement('canvas'); preview.append(canvas);
    const nav = document.createElement('div'); nav.className = 'nav';
    const prev = document.createElement('button'); prev.type = 'button'; prev.textContent = '‹'; prev.setAttribute('aria-label', 'Opção anterior');
    const next = document.createElement('button'); next.type = 'button'; next.textContent = '›'; next.setAttribute('aria-label', 'Próxima opção');
    nav.append(prev, next); preview.append(nav);
    const dots = document.createElement('div'); dots.className = 'dots';
    if (showUploadPreview) box.append(preview, dots);
    card.append(box);
    let imageData = '', previewImage = null, option = 0;
    function renderPreview() {
      if (!previewImage || !showUploadPreview) return;
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
        imageData = canvasDataUrl(img); previewImage = img; option = 0; preview.hidden = !showUploadPreview; button.disabled = false; renderPreview();
        status.textContent = `${img.naturalWidth} × ${img.naturalHeight} px${track.title ? ` · imagem pronta para ${track.title}` : ' · prévia pronta'}.`;
      };
      img.onerror = () => { URL.revokeObjectURL(url); status.textContent = 'Não foi possível abrir essa imagem.'; button.disabled = true; };
      img.src = url;
    });
    button.onclick = async () => {
      if (!imageData) return;
      button.disabled = true; status.textContent = 'Publicando…';
      try {
        const endpoint = mode === 'create'
          ? '/api/video-quadrants'
          : mode === 'replace-custom'
            ? `/api/video-quadrants/${encodeURIComponent(track.image.id)}/image`
            : `/api/video-quadrants/${encodeURIComponent(track.id)}/image`;
        await apiFetch(endpoint, {
          method: mode === 'replace-custom' ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageData, title: name.value.trim() })
        });
        await loadGallery(); setToast(isNewCustom ? 'Imagem criada.' : `Imagem salva${track.title ? ` para ${track.title}` : ''}.`);
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
      setToast(result.selectedOption === -1 ? 'Imagem removida do seletor.' : 'Salvo! Obrigado por participar.');
      await loadGallery();
    } catch (error) { $('modalStatus').textContent = error.message; }
    finally { state.saving = false; $('commentBtn').disabled = false; $('approveBtn').disabled = false; }
  }

  function showAdmin() {
    $('adminBadge').hidden = !state.isAdmin;
  }
  function renderApprovalProgress() {
    const { approved = 0, total = 0 } = state.approvalProgress;
    const ratio = total ? Math.min(100, Math.round((approved / total) * 100)) : 0;
    $('approvalProgressText').textContent = `${approved} de ${total} imagens aprovadas`;
    $('approvalProgressValue').style.width = `${ratio}%`;
    $('approvalProgress').setAttribute('aria-valuenow', String(approved));
    $('approvalProgress').setAttribute('aria-valuemax', String(total));
  }
  async function loadGallery() {
    const result = await apiFetch('/api/video-quadrants');
    state.isAdmin = Boolean(result.isAdmin); state.tracks = Array.isArray(result.tracks) ? result.tracks : [];
    state.submittedImages = Array.isArray(result.submittedImages) ? result.submittedImages : [];
    state.responses = Array.isArray(result.responses) ? result.responses : [];
    state.approvalProgress = result.approvalProgress || { approved: 0, total: 0 };
    renderApprovalProgress();
    showAdmin(); renderGallery();
  }

  async function downloadApprovedPack() {
    setToast('Preparando pacote de imagens aprovadas…');
    try {
      const response = await fetch(apiUrl('/api/video-quadrants/approved-pack.zip'), {
        credentials: 'include', headers: apiHeaders()
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message || 'Não foi possível baixar o pacote.');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url; link.download = 'fluentlevelup-imagens-aprovadas.zip';
      document.body.append(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 30000);
      setToast('Pacote de imagens aprovadas baixado.');
    } catch (error) { setToast(error.message); }
  }

  let dKeyTimes = [];
  document.addEventListener('keydown', (event) => {
    if (!state.isAdmin || !window.matchMedia('(min-width: 700px) and (pointer: fine)').matches) return;
    const target = event.target;
    if (target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
    if (event.key.toLowerCase() !== 'd' || event.ctrlKey || event.metaKey || event.altKey) { dKeyTimes = []; return; }
    if (event.repeat) return;
    const now = Date.now(); dKeyTimes = dKeyTimes.filter((time) => now - time < 1400); dKeyTimes.push(now);
    if (dKeyTimes.length >= 3) { dKeyTimes = []; downloadApprovedPack(); }
  });

  let visitorImageData = '';
  function openVisitorUpload(image) {
    if (state.isAdmin || !image?.id) return;
    state.visitorUploadSource = image;
    visitorImageData = '';
    $('visitorUploadTitle').textContent = `Enviar imagem para “${image.title || 'esta imagem'}”`;
    $('visitorImageInput').value = '';
    $('visitorImagePreview').removeAttribute('src'); $('visitorImagePreview').hidden = true;
    $('visitorUploadStatus').textContent = 'A imagem vai inteira para o administrador, sem recorte.';
    $('visitorUploadBtn').disabled = true; $('visitorUploadModal').hidden = false;
  }

  $('visitorImageInput').addEventListener('change', () => {
    const file = $('visitorImageInput').files?.[0];
    visitorImageData = '';
    $('visitorImagePreview').removeAttribute('src'); $('visitorImagePreview').hidden = true;
    $('visitorUploadBtn').disabled = true;
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      $('visitorUploadStatus').textContent = 'Escolha uma imagem PNG, JPG ou WebP.'; return;
    }
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      if (!img.naturalWidth || !img.naturalHeight) { $('visitorUploadStatus').textContent = 'Não foi possível ler essa imagem.'; return; }
      try {
        visitorImageData = canvasDataUrl(img);
        const encodedBytes = Math.floor((visitorImageData.length - visitorImageData.indexOf(',') - 1) * 0.75);
        if (encodedBytes > 5 * 1024 * 1024) { visitorImageData = ''; $('visitorUploadStatus').textContent = 'A imagem otimizada precisa ter até 5 MB.'; return; }
        $('visitorImagePreview').src = visitorImageData; $('visitorImagePreview').hidden = false;
        $('visitorUploadStatus').textContent = `${img.naturalWidth} × ${img.naturalHeight} px · imagem inteira pronta para envio.`;
        $('visitorUploadBtn').disabled = false;
      } catch (_error) { $('visitorUploadStatus').textContent = 'Não foi possível preparar essa imagem. Tente outra.'; }
    };
    img.onerror = () => { URL.revokeObjectURL(url); $('visitorUploadStatus').textContent = 'Não foi possível abrir essa imagem.'; };
    img.src = url;
  });

  $('visitorUploadBtn').onclick = async () => {
    if (!visitorImageData || !state.visitorUploadSource) return;
    const button = $('visitorUploadBtn'); button.disabled = true;
    $('visitorUploadStatus').textContent = 'Enviando imagem inteira…';
    try {
      await apiFetch('/api/video-quadrants/visitor-upload', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceImageId: state.visitorUploadSource.id, imageData: visitorImageData })
      });
      $('visitorUploadModal').hidden = true; state.visitorUploadSource = null; visitorImageData = '';
      setToast('Imagem enviada ao administrador e aprovada.');
      await loadGallery();
    } catch (error) { $('visitorUploadStatus').textContent = error.message; button.disabled = false; }
  };
  $('visitorUploadCancel').onclick = () => { $('visitorUploadModal').hidden = true; state.visitorUploadSource = null; visitorImageData = ''; };
  $('visitorUploadModal').addEventListener('click', (event) => {
    if (event.target === $('visitorUploadModal')) $('visitorUploadCancel').click();
  });

  function canvasDataUrl(img) {
    const scale = Math.min(1, 1600 / img.naturalWidth, 1600 / img.naturalHeight);
    const canvas = document.createElement('canvas'); canvas.width = Math.max(2, Math.round(img.naturalWidth * scale)); canvas.height = Math.max(2, Math.round(img.naturalHeight * scale));
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/webp', 0.84);
  }
  $('commentBtn').onclick = () => saveResponse(true);
  $('approveBtn').onclick = () => saveResponse(false);
  $('commentModal').addEventListener('click', (event) => { if (event.target === $('commentModal') && state.pending?.selectedOption !== -1) $('commentModal').hidden = true; });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (!$('visitorUploadModal').hidden) $('visitorUploadCancel').click();
    else if (state.pending?.selectedOption !== -1) $('commentModal').hidden = true;
  });
  loadGallery().catch((error) => { $('imageList').innerHTML = ''; const notice = document.createElement('div'); notice.className = 'empty'; notice.textContent = error.message; $('imageList').append(notice); });
  window.setInterval(() => {
    if (!document.hidden && $('commentModal').hidden) loadGallery().catch(() => {});
  }, 30000);
})();
