(() => {
  const launcher = document.querySelector('#kelly-chat-launcher');
  const panel = document.querySelector('#kelly-chat-panel');
  const close = document.querySelector('#kelly-chat-close');
  const feed = document.querySelector('#kelly-chat-feed');
  const form = document.querySelector('#kelly-chat-form');
  const sendButton = form.querySelector('button[type="submit"]');
  const input = document.querySelector('#kelly-chat-input');
  const badge = document.querySelector('#kelly-chat-badge');
  const notice = document.querySelector('#kelly-chat-notice');
  const attachButton = document.querySelector('#kelly-chat-attach');
  const imageFileInput = document.querySelector('#kelly-chat-image-file');
  const imageViewer = document.querySelector('#kelly-chat-image-viewer');
  const imageViewerImage = imageViewer.querySelector('img');
  const notificationAudio = new Audio('/downloads-kelly/mission-passou.mp3');
  notificationAudio.preload = 'auto';
  let socket = null, sessionReady = false, chatClosed = false, unread = 0, retryTimer = null;
  let soundToken = 0, soundCyclesLeft = 0, soundBlocked = false;
  let pendingImageData = '';

  const safe = (value) => { const node = document.createElement('span'); node.textContent = String(value || ''); return node.innerHTML; };
  const timeLabel = (value) => { const date = new Date(value); return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); };
  function addMessage(message) {
    feed.querySelector('.chat-panel__welcome')?.remove();
    const element = document.createElement('div');
    element.className = `chat-panel__message${message.sender === 'visitor' ? ' chat-panel__message--visitor' : ''}`;
    if (message.image_data) {
      const imageButton = document.createElement('button');
      imageButton.type = 'button'; imageButton.className = 'chat-panel__message-image';
      imageButton.setAttribute('aria-label', 'Toque para expandir a imagem');
      const image = document.createElement('img'); image.src = message.image_data; image.alt = 'Imagem enviada no chat';
      const hint = document.createElement('small'); hint.textContent = 'Toque para expandir';
      imageButton.append(image, hint); imageButton.addEventListener('click', () => openImageViewer(image.src)); element.append(imageButton);
    }
    if (message.body && message.body !== '[Imagem]') {
      const body = document.createElement('div'); body.textContent = message.body; element.append(body);
    }
    const time = document.createElement('time'); time.className = 'chat-panel__time'; time.textContent = timeLabel(message.created_at); element.append(time);
    feed.append(element); feed.scrollTop = feed.scrollHeight;
  }
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
    try {
      pendingImageData = await makeJpegDataUrl(file);
      input.value = 'Imagem'; input.classList.add('has-image');
      input.focus({ preventScroll: true });
    } catch (error) {
      const message = document.createElement('p'); message.className = 'chat-panel__welcome'; message.textContent = error.message || 'Não foi possível adicionar essa imagem.'; feed.append(message);
    }
  }
  function clearAttachment() { pendingImageData = ''; input.value = ''; input.classList.remove('has-image'); }
  function hasFileDrag(event) { return Array.from(event.dataTransfer?.types || []).includes('Files'); }
  function acceptDroppedImage(dataTransfer) {
    const file = Array.from(dataTransfer?.files || []).find((item) => item.type.startsWith('image/'));
    if (file) setPendingImage(file);
  }
  attachButton.addEventListener('click', () => imageFileInput.click());
  imageFileInput.addEventListener('change', () => { const file = imageFileInput.files?.[0]; if (file) setPendingImage(file); imageFileInput.value = ''; });
  function updateBadge() { badge.hidden = unread < 1; badge.textContent = unread > 9 ? '9+' : String(unread); }
  function showNotice() { if (!notice.open && !chatClosed) notice.showModal(); }
  async function playNextSound(token) {
    if (token !== soundToken || soundCyclesLeft < 1) return;
    soundCyclesLeft -= 1;
    try { notificationAudio.currentTime = 0; await notificationAudio.play(); soundBlocked = false; }
    catch (_error) { soundCyclesLeft = 0; soundBlocked = true; }
  }
  function playNotificationSound() {
    soundToken += 1; soundCyclesLeft = 3; soundBlocked = false;
    notificationAudio.pause(); notificationAudio.currentTime = 0;
    playNextSound(soundToken);
  }
  notificationAudio.addEventListener('ended', () => playNextSound(soundToken));
  function closeForVisitor() {
    chatClosed = true; sessionReady = false; panel.hidden = true; launcher.hidden = true;
    launcher.setAttribute('aria-expanded', 'false');
    if (notice.open) notice.close();
    socket?.close(1000, 'chat closed');
  }
  async function loadMessages() {
    const response = await fetch('/api/downloads-kelly-chat/messages', { cache: 'no-store' });
    if (!response.ok) throw new Error('chat unavailable');
    const payload = await response.json();
    if (payload.closed) { closeForVisitor(); return; }
    feed.innerHTML = '';
    if (!payload.messages?.length) feed.innerHTML = '<p class="chat-panel__welcome">Oi! Mande sua mensagem e a gente responde por aqui.</p>';
    else payload.messages.forEach(addMessage);
    const unreadAdmin = (payload.messages || []).filter((message) => message.sender === 'admin' && message.read_by_visitor === false).length;
    if (unreadAdmin && panel.hidden) { unread = unreadAdmin; updateBadge(); playNotificationSound(); showNotice(); }
    else { unread = 0; updateBadge(); }
  }
  async function initialize() {
    try {
      const response = await fetch('/api/downloads-kelly-chat/session', { method: 'POST', cache: 'no-store' });
      if (!response.ok) throw new Error('Não foi possível conectar agora.');
      sessionReady = true;
      connectSocket();
      await loadMessages();
    } catch (_error) {
      feed.innerHTML = '<p class="chat-panel__welcome">O chat está indisponível agora. Tente novamente em instantes.</p>';
    }
  }
  function connectSocket() {
    clearTimeout(retryTimer);
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    socket = new WebSocket(`${protocol}//${location.host}/ws/downloads-kelly-chat`);
    socket.addEventListener('close', () => { if (sessionReady) retryTimer = setTimeout(connectSocket, 2000); });
    socket.addEventListener('error', () => socket.close());
    socket.addEventListener('message', (event) => {
      let payload; try { payload = JSON.parse(event.data); } catch (_error) { return; }
      if (payload.type === 'new_message' && payload.message?.sender === 'admin') {
        playNotificationSound();
        if (panel.hidden) { unread += 1; updateBadge(); showNotice(); }
        else loadMessages().catch(() => {});
      }
      if (payload.type === 'chat_closed') closeForVisitor();
    });
  }
  launcher.addEventListener('click', async () => {
    if (chatClosed) return;
    const opening = panel.hidden;
    panel.hidden = !opening; launcher.setAttribute('aria-expanded', String(opening));
    if (opening) { unread = 0; updateBadge(); if (sessionReady) await loadMessages().catch(() => {}); input.focus({ preventScroll: true }); }
  });
  close.addEventListener('click', () => { panel.hidden = true; launcher.setAttribute('aria-expanded', 'false'); launcher.focus(); });
  input.addEventListener('input', () => { if (pendingImageData && input.value !== 'Imagem') clearAttachment(); });
  panel.addEventListener('paste', (event) => {
    const item = Array.from(event.clipboardData?.items || []).find((clipboardItem) => clipboardItem.type.startsWith('image/'));
    const file = item?.getAsFile();
    if (file) { event.preventDefault(); setPendingImage(file); }
  });
  let panelDragDepth = 0;
  panel.addEventListener('dragenter', (event) => { if (hasFileDrag(event)) { event.preventDefault(); panelDragDepth += 1; panel.classList.add('is-dragging'); } });
  panel.addEventListener('dragover', (event) => { if (hasFileDrag(event)) { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; } });
  panel.addEventListener('dragleave', (event) => { if (hasFileDrag(event)) { event.preventDefault(); panelDragDepth = Math.max(0, panelDragDepth - 1); if (!panelDragDepth) panel.classList.remove('is-dragging'); } });
  panel.addEventListener('drop', (event) => { if (hasFileDrag(event)) { event.preventDefault(); panelDragDepth = 0; panel.classList.remove('is-dragging'); acceptDroppedImage(event.dataTransfer); } });
  launcher.addEventListener('dragenter', (event) => { if (hasFileDrag(event)) { event.preventDefault(); launcher.classList.add('is-dragging'); } });
  launcher.addEventListener('dragover', (event) => { if (hasFileDrag(event)) { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; launcher.classList.add('is-dragging'); } });
  launcher.addEventListener('dragleave', () => launcher.classList.remove('is-dragging'));
  launcher.addEventListener('drop', (event) => {
    if (!hasFileDrag(event)) return;
    event.preventDefault(); launcher.classList.remove('is-dragging');
    if (!chatClosed) { panel.hidden = false; launcher.setAttribute('aria-expanded', 'true'); acceptDroppedImage(event.dataTransfer); }
  });
  imageViewer.querySelector('button').addEventListener('click', () => imageViewer.close());
  imageViewer.addEventListener('click', (event) => { if (event.target === imageViewer) imageViewer.close(); });
  document.querySelector('#kelly-chat-notice-ok').addEventListener('click', () => { if (soundBlocked) playNotificationSound(); notice.close(); });
  notice.addEventListener('close', () => {
    if (chatClosed) return;
    panel.hidden = false; launcher.setAttribute('aria-expanded', 'true');
    loadMessages().catch(() => {}); input.focus({ preventScroll: true });
  });
  notice.addEventListener('click', (event) => { if (event.target === notice) notice.close(); });
  form.addEventListener('submit', async (event) => {
    event.preventDefault(); const body = input.value === 'Imagem' ? '' : input.value.trim(); if ((!body && !pendingImageData) || !sessionReady) return;
    sendButton.disabled = true;
    try {
      const response = await fetch('/api/downloads-kelly-chat/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body, imageData: pendingImageData }) });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.message || 'Falha ao enviar.');
      input.value = ''; clearAttachment(); addMessage(payload.message);
    } catch (error) {
      const notice = document.createElement('p'); notice.className = 'chat-panel__welcome'; notice.textContent = error.message || 'Não foi possível enviar. Tente novamente.'; feed.append(notice);
    } finally { sendButton.disabled = false; input.focus({ preventScroll: true }); }
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && sessionReady) fetch('/api/downloads-kelly-chat/presence', { method: 'POST', cache: 'no-store' }).catch(() => {}); });
  setInterval(() => { if (sessionReady && !document.hidden) fetch('/api/downloads-kelly-chat/presence', { method: 'POST', cache: 'no-store' }).catch(() => {}); }, 20000);
  initialize();
})();
