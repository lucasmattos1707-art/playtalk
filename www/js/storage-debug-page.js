(function initStorageDebugPage() {
  const DEBUG_API_PATH = '/api/r2/storage-debug?prefix=Niveis/';

  const elements = {
    status: document.getElementById('storage-debug-status'),
    summary: document.getElementById('storage-debug-summary'),
    output: document.getElementById('storage-debug-output'),
    refresh: document.getElementById('storage-debug-refresh')
  };

  function buildApiUrl(path) {
    const protocol = String(window.location.protocol || '').toLowerCase();
    if (protocol === 'http:' || protocol === 'https:') {
      return path;
    }
    if (window.PlaytalkApi && typeof window.PlaytalkApi.url === 'function') {
      return window.PlaytalkApi.url(path);
    }
    return path;
  }

  function setStatus(message, tone) {
    elements.status.textContent = message;
    elements.status.dataset.tone = tone || 'neutral';
  }

  async function loadDebug() {
    setStatus('Consultando o bucket e coletando sinais de erro...', 'loading');
    elements.summary.textContent = '';
    elements.output.textContent = '';

    try {
      const response = await fetch(buildApiUrl(DEBUG_API_PATH), { cache: 'no-store' });
      const payload = await response.json().catch(() => null);

      if (!payload) {
        throw new Error(`Resposta vazia ou invalida. HTTP ${response.status}`);
      }

      const debug = payload.debug || {};
      const statusBits = [];
      if (debug.status) statusBits.push(`HTTP do R2: ${debug.status} ${debug.statusText || ''}`.trim());
      if (debug.code) statusBits.push(`codigo: ${debug.code}`);
      if (typeof debug.totalObjects === 'number') statusBits.push(`objetos: ${debug.totalObjects}`);
      elements.summary.textContent = statusBits.join(' | ');
      elements.output.textContent = JSON.stringify(payload, null, 2);

      if (payload.success) {
        setStatus(payload.message || 'Leitura concluida com sucesso.', 'success');
        return;
      }

      setStatus(payload.message || 'Falha ao consultar o bucket.', 'error');
    } catch (error) {
      setStatus(`Falha ao carregar debug: ${error.message}`, 'error');
    }
  }

  elements.refresh.addEventListener('click', loadDebug);
  loadDebug();
})();
