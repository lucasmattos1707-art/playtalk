(() => {
  const $ = (selector) => document.querySelector(selector);
  const layout = $('#layout'), peopleRoot = $('#people'), feed = $('#feed');
  const nameNode = $('#selected-name'), metaNode = $('#selected-meta');
  const input = $('#message-input'), sendButton = $('#send'), statusNode = $('#status');
  const conversationRoot = $('#conversation'), attachment = $('#chat-attachment');
  const attachButton = $('#attach-image'), imageFileInput = $('#chat-image-file');
  const imageViewer = $('#image-viewer'), imageViewerImage = imageViewer.querySelector('img');
  const conversations = new Map();
  const notificationAudio = new Audio('/downloads-kelly/mission-passou.mp3');
  notificationAudio.preload = 'auto';
  let selectedId = null, socket = null, retryTimer = null, soundEnabled = false;
  let notificationRun = 0, notificationRepeatsLeft = 0;
  let pendingImageData = '';

  function setStatus(text, error = false) { statusNode.textContent = text || ''; statusNode.classList.toggle('error', error); }
  async function playNotificationRepeat(run) {
    if (!soundEnabled || run !== notificationRun || notificationRepeatsLeft < 1) return;
    notificationRepeatsLeft -= 1;
    try { notificationAudio.currentTime = 0; await notificationAudio.play(); }
    catch (_error) { notificationRepeatsLeft = 0; }
  }
  notificationAudio.addEventListener('ended', () => playNotificationRepeat(notificationRun));
  function playAlert() {
    if (!soundEnabled) return;
    notificationRun += 1; notificationRepeatsLeft = 3;
    notificationAudio.pause(); notificationAudio.currentTime = 0;
    playNotificationRepeat(notificationRun);
    if (navigator.vibrate) navigator.vibrate([70, 45, 70]);
  }
  $('#sound-toggle').addEventListener('click', async (event) => {
    if (!soundEnabled) {
      soundEnabled = true; event.currentTarget.textContent = 'Som ativado'; event.currentTarget.style.borderColor = '#f260b4';
      playAlert(); setStatus('Notificações sonoras ativadas.'); setTimeout(() => setStatus(''), 2200);
    } else {
      soundEnabled = false; notificationRun += 1; notificationRepeatsLeft = 0; notificationAudio.pause();
      event.currentTarget.textContent = 'Ativar som'; event.currentTarget.style.borderColor = '';
    }
  });

  function timeLabel(value) {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  function renderPeople() {
    const rows = [...conversations.values()];
    $('#online-count').textContent = `${rows.length} ${rows.length === 1 ? 'pessoa' : 'pessoas'}`;
    if (!rows.length) { peopleRoot.innerHTML = '<div class="empty-list">Aguardando visitantes em /downloads-kelly</div>'; return; }
    peopleRoot.innerHTML = rows.map((item) => `<button class="person${Number(item.id) === Number(selectedId) ? ' active' : ''}" type="button" data-id="${Number(item.id)}"><span class="avatar">${String(item.label || 'U').replace(/[^A-Za-z0-9]/g, '').slice(-2).toUpperCase()}</span><span class="person-info"><span class="person-name">${escapeText(item.label)}</span><span class="person-ip">${escapeText(item.ip_address || 'IP indisponível')}</span></span><span class="person-meta"><span class="person-time">${timeLabel(item.last_message_at || item.last_seen)}</span><span class="unread"${Number(item.unread_count) ? '' : ' hidden'}>${Number(item.unread_count) > 9 ? '9+' : Number(item.unread_count)}</span></span></button>`).join('');
    peopleRoot.querySelectorAll('.person').forEach((button) => button.addEventListener('click', () => selectConversation(Number(button.dataset.id))));
  }
  function escapeText(value) { const node = document.createElement('span'); node.textContent = String(value || ''); return node.innerHTML; }
  function openImageViewer(src) { imageViewerImage.src = src; imageViewer.showModal(); }
  function makeJpegDataUrl(file) {
    return new Promise((resolve, reject) => {
      const image = new Image(), objectUrl = URL.createObjectURL(file);
      image.onload = () => {
        (async () => {
          let blob = null;
          for (const maxSide of [1400, 1200, 1000, 800]) {
            const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
            const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
            const context = canvas.getContext('2d'); if (!context) throw new Error('Não foi possível preparar essa imagem.');
            context.drawImage(image, 0, 0, canvas.width, canvas.height);
            for (const quality of [.78, .62, .48, .35]) {
              blob = await new Promise((done) => canvas.toBlob(done, 'image/jpeg', quality));
              if (blob && blob.type === 'image/jpeg' && blob.size <= 900_000) break;
            }
            if (blob && blob.type === 'image/jpeg' && blob.size <= 900_000) break;
          }
          URL.revokeObjectURL(objectUrl);
          if (!blob || blob.type !== 'image/jpeg' || blob.size > 900_000) throw new Error('Não foi possível reduzir essa imagem para envio.');
          const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('Não foi possível ler a imagem.')); reader.readAsDataURL(blob);
        })().catch((error) => { URL.revokeObjectURL(objectUrl); reject(error); });
      };
      image.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Não foi possível abrir essa imagem.')); };
      image.src = objectUrl;
    });
  }
  async function setPendingImage(file) {
    if (!file || !file.type.startsWith('image/')) return;
    try { pendingImageData = await makeJpegDataUrl(file); attachment.querySelector('img').src = pendingImageData; attachment.hidden = false; input.focus({ preventScroll: true }); }
    catch (error) { setStatus(error.message || 'Não foi possível adicionar essa imagem.', true); }
  }
  function clearAttachment() { pendingImageData = ''; attachment.querySelector('img').removeAttribute('src'); attachment.hidden = true; }
  function hasFileDrag(event) { return Array.from(event.dataTransfer?.types || []).includes('Files'); }
  function acceptDroppedImage(dataTransfer) { const file = Array.from(dataTransfer?.files || []).find((item) => item.type.startsWith('image/')); if (file) setPendingImage(file); }
  attachButton.addEventListener('click', () => imageFileInput.click());
  imageFileInput.addEventListener('change', () => { const file = imageFileInput.files?.[0]; if (file) setPendingImage(file); imageFileInput.value = ''; });
  function renderMessages(messages) {
    if (!messages.length) { feed.innerHTML = '<div class="hint">Conversa aberta. Mande uma mensagem para começar.</div>'; return; }
    feed.replaceChildren();
    messages.forEach((message) => {
      const bubble = document.createElement('div'); bubble.className = `bubble${message.sender === 'admin' ? ' admin' : ''}`;
      if (message.image_data) {
        const imageButton = document.createElement('button'); imageButton.type = 'button'; imageButton.className = 'bubble-image-button'; imageButton.setAttribute('aria-label', 'Toque para expandir a imagem');
        const image = document.createElement('img'); image.src = message.image_data; image.alt = 'Imagem enviada no chat';
        const hint = document.createElement('small'); hint.textContent = 'Toque para expandir';
        imageButton.append(image, hint); imageButton.addEventListener('click', () => openImageViewer(image.src)); bubble.append(imageButton);
      }
      if (message.body && message.body !== '[Imagem]') { const body = document.createElement('div'); body.textContent = message.body; bubble.append(body); }
      const time = document.createElement('time'); time.className = 'bubble-time'; time.textContent = timeLabel(message.created_at); bubble.append(time); feed.append(bubble);
    });
    feed.scrollTop = feed.scrollHeight;
  }
  async function refreshMessages(id) {
    const response = await fetch(`/api/downloads-kelly-chat/admin/conversations/${id}/messages`, { cache: 'no-store' });
    if (response.status === 401 || response.status === 403) { window.location.href = '/entrar?return=%2Fchat%2F'; return; }
    if (!response.ok) throw new Error('Não foi possível carregar as mensagens.');
    const payload = await response.json();
    if (Number(selectedId) === Number(id)) renderMessages(payload.messages || []);
    const item = conversations.get(Number(id)); if (item) item.unread_count = 0;
    renderPeople();
  }
  async function selectConversation(id) {
    selectedId = Number(id); const item = conversations.get(selectedId);
    layout.classList.add('show-conversation'); input.disabled = false; sendButton.disabled = false; attachButton.disabled = false;
    nameNode.textContent = item?.label || `User ${id}`;
    metaNode.textContent = `${item?.ip_address || 'IP indisponível'} · ${item?.visit_count || 1} ${Number(item?.visit_count) === 1 ? 'entrada' : 'entradas'}`;
    renderPeople(); feed.innerHTML = '<div class="hint">Carregando conversa…</div>';
    try { await refreshMessages(id); setStatus(''); } catch (error) { setStatus(error.message, true); }
    input.focus({ preventScroll: true });
  }
  function closeConversation(id) {
    const conversation = conversations.get(Number(id));
    if (!conversation && Number(selectedId) !== Number(id)) return;
    conversations.delete(Number(id));
    if (Number(selectedId) === Number(id)) {
      selectedId = null; layout.classList.remove('show-conversation');
      input.disabled = true; sendButton.disabled = true; attachButton.disabled = true;
      nameNode.textContent = 'Escolha uma conversa';
      metaNode.textContent = 'As novas mensagens aparecem aqui em tempo real';
      renderMessages([]);
    }
    renderPeople();
    setStatus(`${conversation?.label || 'A pessoa'} saiu da lista de conversas.`);
    setTimeout(() => setStatus(''), 3500);
  }
  async function refreshConversations() {
    const response = await fetch('/api/downloads-kelly-chat/admin/conversations', { cache: 'no-store' });
    if (response.status === 401 || response.status === 403) { window.location.href = '/entrar?return=%2Fchat%2F'; return; }
    if (!response.ok) throw new Error('Não foi possível atualizar a lista.');
    const payload = await response.json(), previous = new Set(conversations.keys());
    conversations.clear(); (payload.conversations || []).forEach((item) => conversations.set(Number(item.id), item));
    if (selectedId && !conversations.has(selectedId)) { selectedId = null; layout.classList.remove('show-conversation'); input.disabled = true; sendButton.disabled = true; attachButton.disabled = true; nameNode.textContent = 'Escolha uma conversa'; metaNode.textContent = 'As novas mensagens aparecem aqui em tempo real'; renderMessages([]); }
    renderPeople();
    if (selectedId && !previous.has(selectedId)) refreshMessages(selectedId).catch(() => {});
  }
  function connectSocket() {
    clearTimeout(retryTimer);
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    socket = new WebSocket(`${protocol}//${location.host}/ws/downloads-kelly-chat`);
    socket.addEventListener('open', () => { $('#connection-dot').classList.add('live'); $('#connection-label').textContent = 'Ao vivo'; refreshConversations().catch(() => {}); });
    socket.addEventListener('close', () => { $('#connection-dot').classList.remove('live'); $('#connection-label').textContent = 'Reconectando'; retryTimer = setTimeout(connectSocket, 1800); });
    socket.addEventListener('error', () => socket.close());
    socket.addEventListener('message', (event) => {
      let payload; try { payload = JSON.parse(event.data); } catch (_error) { return; }
      if (payload.type === 'visitor_enter') {
        playAlert(); refreshConversations().catch(() => {});
        setStatus(`${payload.label || 'Visitante'} entrou em Downloads da Kelly.`); setTimeout(() => setStatus(''), 3500);
      }
      if (payload.type === 'new_message') {
        const id = Number(payload.conversationId), message = payload.message;
        if (message?.sender === 'visitor') playAlert();
        refreshConversations().catch(() => {});
        if (selectedId === id) refreshMessages(id).catch(() => {});
      }
      if (payload.type === 'chat_closed') closeConversation(Number(payload.conversationId));
    });
  }
  conversationRoot.addEventListener('paste', (event) => {
    const item = Array.from(event.clipboardData?.items || []).find((clipboardItem) => clipboardItem.type.startsWith('image/'));
    const file = item?.getAsFile(); if (file) { event.preventDefault(); setPendingImage(file); }
  });
  let dragDepth = 0;
  conversationRoot.addEventListener('dragenter', (event) => { if (hasFileDrag(event)) { event.preventDefault(); dragDepth += 1; conversationRoot.classList.add('is-dragging'); } });
  conversationRoot.addEventListener('dragover', (event) => { if (hasFileDrag(event)) { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; } });
  conversationRoot.addEventListener('dragleave', (event) => { if (hasFileDrag(event)) { event.preventDefault(); dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) conversationRoot.classList.remove('is-dragging'); } });
  conversationRoot.addEventListener('drop', (event) => { if (hasFileDrag(event)) { event.preventDefault(); dragDepth = 0; conversationRoot.classList.remove('is-dragging'); acceptDroppedImage(event.dataTransfer); } });
  attachment.querySelector('button').addEventListener('click', clearAttachment);
  imageViewer.querySelector('button').addEventListener('click', () => imageViewer.close());
  imageViewer.addEventListener('click', (event) => { if (event.target === imageViewer) imageViewer.close(); });
  $('#back').addEventListener('click', () => layout.classList.remove('show-conversation'));
  $('#composer').addEventListener('submit', async (event) => {
    event.preventDefault(); const body = input.value.trim(), conversationId = selectedId; if ((!body && !pendingImageData) || !conversationId) return;
    sendButton.disabled = true; setStatus('Enviando…');
    try {
      const response = await fetch(`/api/downloads-kelly-chat/admin/conversations/${conversationId}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body, imageData: pendingImageData }) });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.message || 'Não foi possível enviar.');
      if (payload.closed) { input.value = ''; closeConversation(conversationId); return; }
      input.value = ''; clearAttachment(); await refreshMessages(selectedId); setStatus(''); refreshConversations().catch(() => {});
    } catch (error) { setStatus(error.message, true); }
    finally { sendButton.disabled = !selectedId; }
  });
  refreshConversations().catch((error) => setStatus(error.message, true));
  connectSocket(); setInterval(() => refreshConversations().catch(() => {}), 12000);
})();
