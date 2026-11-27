(() => {
  const launcher = document.querySelector('#kelly-chat-launcher');
  const panel = document.querySelector('#kelly-chat-panel');
  const close = document.querySelector('#kelly-chat-close');
  const feed = document.querySelector('#kelly-chat-feed');
  const form = document.querySelector('#kelly-chat-form');
  const input = document.querySelector('#kelly-chat-input');
  const badge = document.querySelector('#kelly-chat-badge');
  let socket = null, sessionReady = false, unread = 0, retryTimer = null;

  const safe = (value) => { const node = document.createElement('span'); node.textContent = String(value || ''); return node.innerHTML; };
  const timeLabel = (value) => { const date = new Date(value); return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); };
  function addMessage(message) {
    feed.querySelector('.chat-panel__welcome')?.remove();
    const element = document.createElement('div');
    element.className = `chat-panel__message${message.sender === 'visitor' ? ' chat-panel__message--visitor' : ''}`;
    element.innerHTML = `${safe(message.body)}<time class="chat-panel__time">${timeLabel(message.created_at)}</time>`;
    feed.append(element); feed.scrollTop = feed.scrollHeight;
  }
  function updateBadge() { badge.hidden = unread < 1; badge.textContent = unread > 9 ? '9+' : String(unread); }
  async function loadMessages() {
    const response = await fetch('/api/downloads-kelly-chat/messages', { cache: 'no-store' });
    if (!response.ok) throw new Error('chat unavailable');
    const payload = await response.json();
    feed.innerHTML = '';
    if (!payload.messages?.length) feed.innerHTML = '<p class="chat-panel__welcome">Oi! Mande sua mensagem e a gente responde por aqui.</p>';
    else payload.messages.forEach(addMessage);
    unread = 0; updateBadge();
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
        if (panel.hidden) { unread += 1; updateBadge(); }
        else loadMessages().catch(() => {});
      }
    });
  }
  launcher.addEventListener('click', async () => {
    const opening = panel.hidden;
    panel.hidden = !opening; launcher.setAttribute('aria-expanded', String(opening));
    if (opening) { unread = 0; updateBadge(); if (sessionReady) await loadMessages().catch(() => {}); input.focus({ preventScroll: true }); }
  });
  close.addEventListener('click', () => { panel.hidden = true; launcher.setAttribute('aria-expanded', 'false'); launcher.focus(); });
  form.addEventListener('submit', async (event) => {
    event.preventDefault(); const body = input.value.trim(); if (!body || !sessionReady) return;
    const button = form.querySelector('button'); button.disabled = true;
    try {
      const response = await fetch('/api/downloads-kelly-chat/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body }) });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.message || 'Falha ao enviar.');
      input.value = ''; addMessage(payload.message);
    } catch (_error) {
      const notice = document.createElement('p'); notice.className = 'chat-panel__welcome'; notice.textContent = 'Não foi possível enviar. Tente novamente.'; feed.append(notice);
    } finally { button.disabled = false; input.focus({ preventScroll: true }); }
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && sessionReady) fetch('/api/downloads-kelly-chat/presence', { method: 'POST', cache: 'no-store' }).catch(() => {}); });
  setInterval(() => { if (sessionReady && !document.hidden) fetch('/api/downloads-kelly-chat/presence', { method: 'POST', cache: 'no-store' }).catch(() => {}); }, 20000);
  initialize();
})();
