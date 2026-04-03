(function initPlaytalkBooksPage() {
  const ADMIN_ALIASES = new Set(['admin', 'adm', 'adminst']);
  const MAX_GRADIENTS = 8;

  const els = {
    avatarImage: document.getElementById('booksAccountAvatarImage'),
    avatarFallback: document.getElementById('booksAccountAvatarFallback'),
    prevLevelBtn: document.getElementById('booksLevelPrevBtn'),
    nextLevelBtn: document.getElementById('booksLevelNextBtn'),
    levelTitle: document.getElementById('booksLevelTitle'),
    status: document.getElementById('booksStatus'),
    cardsGrid: document.getElementById('booksCardsGrid'),
    cardsEmpty: document.getElementById('booksCardsEmpty'),
    coverUploadInput: document.getElementById('booksCoverUploadInput')
  };

  const state = {
    user: null,
    localProfile: null,
    selectedLevel: 1,
    books: [],
    isAdmin: false,
    uploadInFlight: false,
    uploadTargetBookId: '',
    gradients: []
  };

  function safeText(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  function setStatus(message, tone) {
    if (!els.status) return;
    els.status.textContent = safeText(message);
    els.status.className = 'books-status';
    if (tone) {
      els.status.classList.add(`is-${tone}`);
    }
  }

  function buildApiUrl(path) {
    if (window.PlaytalkApi && typeof window.PlaytalkApi.url === 'function') {
      return window.PlaytalkApi.url(path);
    }
    return path;
  }

  function buildAuthHeaders(extraHeaders) {
    if (window.PlaytalkApi && typeof window.PlaytalkApi.authHeaders === 'function') {
      return window.PlaytalkApi.authHeaders(extraHeaders);
    }
    return { ...(extraHeaders || {}) };
  }

  function normalizeLevel(value) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return 1;
    return Math.max(1, Math.min(10, parsed));
  }

  function normalizeUser(user) {
    if (!user || typeof user !== 'object') return null;
    const id = Number(user.id) || 0;
    const username = safeText(user.username);
    if (!id || !username) return null;
    return {
      id,
      username,
      avatarImage: safeText(user.avatar_image || user.avatarImage)
    };
  }

  function readLocalPlayerProfile() {
    try {
      if (window.playtalkPlayerState && typeof window.playtalkPlayerState.get === 'function') {
        const player = window.playtalkPlayerState.get() || {};
        return {
          username: safeText(player.username),
          avatarImage: safeText(player.avatar)
        };
      }
    } catch (_error) {
      // ignore
    }
    return {
      username: '',
      avatarImage: ''
    };
  }

  function renderAvatar() {
    if (!els.avatarImage || !els.avatarFallback) return;
    const sourceProfile = state.user || state.localProfile || {};
    const username = safeText(sourceProfile.username) || 'Jogador';
    const avatar = safeText(sourceProfile.avatarImage);
    const hasAvatar = Boolean(avatar);

    if (hasAvatar) {
      els.avatarImage.src = avatar;
      els.avatarImage.hidden = false;
      els.avatarFallback.hidden = true;
      return;
    }

    els.avatarImage.removeAttribute('src');
    els.avatarImage.hidden = true;
    els.avatarFallback.hidden = false;
    els.avatarFallback.textContent = username.charAt(0).toUpperCase() || 'P';
  }

  function sortByNome(left, right) {
    return String(left?.nome || '').localeCompare(String(right?.nome || ''), 'pt-BR', {
      sensitivity: 'base',
      numeric: true
    });
  }

  function normalizeBooksFromStories(stories) {
    const byBook = new Map();
    if (!Array.isArray(stories)) return [];

    stories.forEach((entry) => {
      const fileName = safeText(entry?.fileName);
      const nome = safeText(entry?.nome);
      const bookId = safeText(entry?.bookId);
      if (!fileName || !nome || !bookId) return;

      const key = bookId.toLowerCase();
      if (byBook.has(key)) return;
      byBook.set(key, {
        bookId,
        fileName,
        nome,
        nivel: normalizeLevel(entry?.nivel),
        coverImageUrl: safeText(entry?.coverImageUrl)
      });
    });

    return Array.from(byBook.values()).sort(sortByNome);
  }

  function getBooksForSelectedLevel() {
    return state.books
      .filter((entry) => normalizeLevel(entry?.nivel) === state.selectedLevel)
      .sort(sortByNome);
  }

  function randomInt(max) {
    return Math.floor(Math.random() * Math.max(1, max));
  }

  function buildGradientPool() {
    const colors = [];
    let guard = 0;
    while (colors.length < MAX_GRADIENTS && guard < 200) {
      guard += 1;
      const hue = randomInt(360);
      const tooClose = colors.some((entry) => {
        const distance = Math.min(Math.abs(entry - hue), 360 - Math.abs(entry - hue));
        return distance < 18;
      });
      if (!tooClose) {
        colors.push(hue);
      }
    }

    if (!colors.length) {
      colors.push(210, 270, 150, 20);
    }

    return colors.map((hue, index) => {
      const nextHue = (hue + 35 + (index * 7)) % 360;
      const satA = 56 + randomInt(16);
      const satB = 52 + randomInt(15);
      const lightA = 54 + randomInt(10);
      const lightB = 33 + randomInt(12);
      return `linear-gradient(160deg, hsl(${hue} ${satA}% ${lightA}%), hsl(${nextHue} ${satB}% ${lightB}%))`;
    });
  }

  function safeCssUrl(url) {
    return `"${String(url || '').replace(/"/g, '%22')}"`;
  }

  function renderCards() {
    if (!els.cardsGrid || !els.cardsEmpty) return;
    const books = getBooksForSelectedLevel();
    els.cardsGrid.innerHTML = '';
    els.cardsEmpty.hidden = books.length > 0;
    if (!books.length) return;

    const gradients = state.gradients.length ? state.gradients : ['linear-gradient(160deg, #4a5cff, #4ea5ff)'];

    books.forEach((book, index) => {
      const gradient = gradients[index % gradients.length];
      const coverImageUrl = safeText(book?.coverImageUrl);
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'books-card';
      card.dataset.bookId = safeText(book?.bookId);
      card.setAttribute('aria-label', `Livro ${safeText(book?.nome) || '-'}`);
      if (state.isAdmin) {
        card.classList.add('is-admin');
      }

      const background = document.createElement('span');
      background.className = 'books-card__background';
      if (coverImageUrl) {
        background.style.backgroundImage = `linear-gradient(to top, rgba(8, 10, 14, 0.46), rgba(8, 10, 14, 0.08)), url(${safeCssUrl(coverImageUrl)})`;
      } else {
        background.style.backgroundImage = gradient;
      }

      const overlay = document.createElement('span');
      overlay.className = 'books-card__overlay';

      const title = document.createElement('p');
      title.className = 'books-card__title';
      title.textContent = safeText(book?.nome) || '-';

      const adminChip = document.createElement('span');
      adminChip.className = 'books-card__admin-chip';
      adminChip.textContent = 'Admin';

      card.append(background, overlay, title, adminChip);
      card.addEventListener('click', () => {
        if (!state.isAdmin || state.uploadInFlight) return;
        const targetBookId = safeText(book?.bookId);
        if (!targetBookId || !els.coverUploadInput) return;
        state.uploadTargetBookId = targetBookId;
        els.coverUploadInput.value = '';
        els.coverUploadInput.click();
      });
      els.cardsGrid.appendChild(card);
    });
  }

  function renderLevelMenu() {
    if (els.levelTitle) {
      els.levelTitle.textContent = `Nivel ${state.selectedLevel}`;
    }
    if (els.prevLevelBtn) {
      els.prevLevelBtn.disabled = state.selectedLevel <= 1 || state.uploadInFlight;
    }
    if (els.nextLevelBtn) {
      els.nextLevelBtn.disabled = state.selectedLevel >= 10 || state.uploadInFlight;
    }
  }

  function setLevel(nextLevel) {
    state.selectedLevel = normalizeLevel(nextLevel);
    renderLevelMenu();
    renderCards();
  }

  async function fetchStories() {
    try {
      const response = await fetch(buildApiUrl('/api/speaking/stories'), {
        credentials: 'include',
        headers: buildAuthHeaders(),
        cache: 'no-store'
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) {
        return [];
      }
      return normalizeBooksFromStories(payload.stories);
    } catch (_error) {
      return [];
    }
  }

  async function fetchSessionUser() {
    try {
      const response = await fetch(buildApiUrl('/auth/session'), {
        credentials: 'include',
        headers: buildAuthHeaders(),
        cache: 'no-store'
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) {
        return null;
      }
      return normalizeUser(payload.user);
    } catch (_error) {
      return null;
    }
  }

  async function fetchAdminFlag() {
    try {
      const response = await fetch(buildApiUrl('/api/me'), {
        credentials: 'include',
        headers: buildAuthHeaders(),
        cache: 'no-store'
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        return false;
      }
      const username = safeText(payload?.user?.username).toLowerCase();
      return Boolean(payload?.user?.is_admin) || ADMIN_ALIASES.has(username);
    } catch (_error) {
      return false;
    }
  }

  function setUploadBusy(isBusy) {
    state.uploadInFlight = Boolean(isBusy);
    renderLevelMenu();
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error || new Error('Falha ao ler imagem.'));
      reader.readAsDataURL(file);
    });
  }

  function dataUrlToImage(dataUrl) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Falha ao abrir imagem.'));
      image.src = dataUrl;
    });
  }

  async function fileToWebp600DataUrl(file) {
    const sourceDataUrl = await fileToDataUrl(file);
    const image = await dataUrlToImage(sourceDataUrl);
    const sourceWidth = Math.max(1, Number(image.naturalWidth || image.width) || 1);
    const sourceHeight = Math.max(1, Number(image.naturalHeight || image.height) || 1);
    const targetHeight = 600;
    const targetWidth = Math.max(1, Math.round((sourceWidth / sourceHeight) * targetHeight));
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Nao foi possivel otimizar a imagem.');
    }
    context.clearRect(0, 0, targetWidth, targetHeight);
    context.drawImage(image, 0, 0, targetWidth, targetHeight);
    return canvas.toDataURL('image/webp', 0.82);
  }

  async function uploadCoverForBook(bookId, file) {
    const normalizedBookId = safeText(bookId);
    if (!normalizedBookId || !file) return;

    setUploadBusy(true);
    setStatus('Otimizando capa e enviando para o R2...', null);

    try {
      const imageDataUrl = await fileToWebp600DataUrl(file);
      const targetBook = state.books.find((entry) => safeText(entry?.bookId) === normalizedBookId);
      const response = await fetch(buildApiUrl('/api/admin/minibooks/save-cover'), {
        method: 'POST',
        credentials: 'include',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          bookId: normalizedBookId,
          imageDataUrl,
          prompt: safeText(targetBook?.nome || '')
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || payload?.details || 'Nao foi possivel salvar a capa.');
      }

      state.books = await fetchStories();
      renderCards();
      setStatus('Capa publicada com sucesso para todos os usuarios.', 'success');
    } catch (error) {
      setStatus(error?.message || 'Falha ao enviar capa.', 'error');
    } finally {
      setUploadBusy(false);
      state.uploadTargetBookId = '';
      if (els.coverUploadInput) {
        els.coverUploadInput.value = '';
      }
    }
  }

  function bindEvents() {
    els.prevLevelBtn?.addEventListener('click', () => {
      setLevel(state.selectedLevel - 1);
    });

    els.nextLevelBtn?.addEventListener('click', () => {
      setLevel(state.selectedLevel + 1);
    });

    els.coverUploadInput?.addEventListener('change', (event) => {
      const file = event?.target?.files?.[0];
      if (!state.isAdmin || !file || !state.uploadTargetBookId) return;
      void uploadCoverForBook(state.uploadTargetBookId, file);
    });
  }

  async function init() {
    bindEvents();
    state.gradients = buildGradientPool();
    renderLevelMenu();

    const [sessionUser, isAdmin, books] = await Promise.all([
      fetchSessionUser(),
      fetchAdminFlag(),
      fetchStories()
    ]);

    state.localProfile = readLocalPlayerProfile();
    state.user = sessionUser;
    state.isAdmin = Boolean(isAdmin);
    state.books = Array.isArray(books) ? books : [];

    renderAvatar();
    renderLevelMenu();
    renderCards();

    if (state.isAdmin) {
      setStatus('Modo admin ativo: toque em um card para trocar a capa.', null);
    } else {
      setStatus('', null);
    }
  }

  init();
})();
