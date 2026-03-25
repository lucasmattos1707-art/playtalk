(function initStoragePage() {
  const TREE_API_PATH = '/api/r2/storage-tree?prefix=Niveis/';

  const elements = {
    status: document.getElementById('storage-status'),
    stats: document.getElementById('storage-stats'),
    tree: document.getElementById('storage-tree'),
    names: document.getElementById('storage-names'),
    debug: document.getElementById('storage-debug'),
    refresh: document.getElementById('storage-refresh')
  };

  function setStatus(message, tone) {
    if (!elements.status) return;
    elements.status.textContent = message;
    elements.status.dataset.tone = tone || 'neutral';
  }

  function clearNode(node) {
    if (!node) return;
    while (node.firstChild) {
      node.removeChild(node.firstChild);
    }
  }

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

  function renderTreeNode(node) {
    const item = document.createElement('li');
    item.className = `storage-tree__item storage-tree__item--${node.type}`;

    const label = document.createElement('span');
    label.className = 'storage-tree__label';
    label.textContent = node.name;
    item.appendChild(label);

    if (node.type === 'folder' && Array.isArray(node.children) && node.children.length) {
      const childList = document.createElement('ul');
      childList.className = 'storage-tree__list';
      node.children.forEach(child => {
        childList.appendChild(renderTreeNode(child));
      });
      item.appendChild(childList);
    }

    return item;
  }

  function renderKeys(keys) {
    clearNode(elements.names);
    const fragment = document.createDocumentFragment();

    keys.forEach(key => {
      const item = document.createElement('li');
      item.className = 'storage-names__item';
      item.textContent = key;
      fragment.appendChild(item);
    });

    elements.names.appendChild(fragment);
  }

  function renderTree(tree) {
    clearNode(elements.tree);
    const list = document.createElement('ul');
    list.className = 'storage-tree__list';
    list.appendChild(renderTreeNode(tree));
    elements.tree.appendChild(list);
  }

  async function loadStorageTree() {
    setStatus('Carregando estrutura de Niveis/...', 'loading');
    clearNode(elements.tree);
    clearNode(elements.names);
    elements.stats.textContent = '';
    if (elements.debug) {
      elements.debug.textContent = '';
      elements.debug.hidden = true;
    }

    try {
      const response = await fetch(buildApiUrl(TREE_API_PATH), {
        cache: 'no-store'
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.success) {
        if (elements.debug && payload?.debug) {
          elements.debug.hidden = false;
          elements.debug.textContent = JSON.stringify(payload.debug, null, 2);
        }
        throw new Error(payload?.message || 'Nao foi possivel carregar a estrutura.');
      }

      renderTree(payload.tree);
      renderKeys(Array.isArray(payload.keys) ? payload.keys : []);
      elements.stats.textContent = `${payload.totalObjects || 0} item(ns) encontrados em ${payload.prefix || 'Niveis/'}`;
      setStatus('Estrutura carregada com sucesso.', 'success');
    } catch (error) {
      setStatus(`Falha ao carregar: ${error.message}`, 'error');
    }
  }

  if (elements.refresh) {
    elements.refresh.addEventListener('click', loadStorageTree);
  }

  loadStorageTree();
})();
