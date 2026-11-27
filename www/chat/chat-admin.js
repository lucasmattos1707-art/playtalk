(() => {
  const $ = (selector) => document.querySelector(selector);
  const layout = $('#layout'), peopleRoot = $('#people'), feed = $('#feed');
  const nameNode = $('#selected-name'), metaNode = $('#selected-meta');
  const input = $('#message-input'), sendButton = $('#send'), statusNode = $('#status');
  const conversations = new Map();
  let selectedId = null, socket = null, retryTimer = null, soundEnabled = false, audioContext = null;

  function setStatus(text, error = false) { statusNode.textContent = text || ''; statusNode.classList.toggle('error', error); }
  function playAlert() {
    if (!soundEnabled || !audioContext) return;
    try {
      const now = audioContext.currentTime;
      [0, .19].forEach((offset, index) => {
        const oscillator = audioContext.createOscillator(), gain = audioContext.createGain();
        oscillator.type = 'sine'; oscillator.frequency.value = index ? 880 : 660;
        gain.gain.setValueAtTime(.0001, now + offset); gain.gain.exponentialRampToValueAtTime(.16, now + offset + .025); gain.gain.exponentialRampToValueAtTime(.0001, now + offset + .16);
        oscillator.connect(gain); gain.connect(audioContext.destination); oscillator.start(now + offset); oscillator.stop(now + offset + .17);
      });
      if (navigator.vibrate) navigator.vibrate([70, 45, 70]);
    } catch (_error) {}
  }
  $('#sound-toggle').addEventListener('click', async (event) => {
    if (!soundEnabled) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) { setStatus('Este navegador não oferece áudio de notificação.', true); return; }
      audioContext = audioContext || new AudioContextClass();
      if (audioContext.state === 'suspended') await audioContext.resume();
      soundEnabled = true; event.currentTarget.textContent = 'Som ativado'; event.currentTarget.style.borderColor = '#f260b4';
      playAlert(); setStatus('Notificações sonoras ativadas.'); setTimeout(() => setStatus(''), 2200);
    } else {
      soundEnabled = false; event.currentTarget.textContent = 'Ativar som'; event.currentTarget.style.borderColor = '';
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
  function renderMessages(messages) {
    if (!messages.length) { feed.innerHTML = '<div class="hint">Conversa aberta. Mande uma mensagem para começar.</div>'; return; }
    feed.innerHTML = messages.map((message) => `<div class="bubble${message.sender === 'admin' ? ' admin' : ''}">${escapeText(message.body)}<time class="bubble-time">${timeLabel(message.created_at)}</time></div>`).join('');
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
    layout.classList.add('show-conversation'); input.disabled = false; sendButton.disabled = false;
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
      input.disabled = true; sendButton.disabled = true;
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
    if (selectedId && !conversations.has(selectedId)) { selectedId = null; layout.classList.remove('show-conversation'); input.disabled = true; sendButton.disabled = true; nameNode.textContent = 'Escolha uma conversa'; metaNode.textContent = 'As novas mensagens aparecem aqui em tempo real'; renderMessages([]); }
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
  $('#back').addEventListener('click', () => layout.classList.remove('show-conversation'));
  $('#composer').addEventListener('submit', async (event) => {
    event.preventDefault(); const body = input.value.trim(), conversationId = selectedId; if (!body || !conversationId) return;
    sendButton.disabled = true; setStatus('Enviando…');
    try {
      const response = await fetch(`/api/downloads-kelly-chat/admin/conversations/${conversationId}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body }) });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.message || 'Não foi possível enviar.');
      if (payload.closed) { input.value = ''; closeConversation(conversationId); return; }
      input.value = ''; await refreshMessages(selectedId); setStatus(''); refreshConversations().catch(() => {});
    } catch (error) { setStatus(error.message, true); }
    finally { sendButton.disabled = !selectedId; }
  });
  refreshConversations().catch((error) => setStatus(error.message, true));
  connectSocket(); setInterval(() => refreshConversations().catch(() => {}), 12000);
})();
