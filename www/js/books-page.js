(function initPlaytalkBooksPage() {
  const ADMIN_ALIASES = new Set(['admin', 'adm', 'adminst']);
  const MAX_GRADIENTS = 8;
  const SESSION_ENDPOINTS = ['/auth/session', '/api/me'];
  const DEFAULT_READER_BACKGROUND = 'radial-gradient(circle at top, rgba(22, 34, 56, 0.72), #04070d 60%, #020306 100%)';
  const FORCE_ADMIN_UI_STORAGE_KEY = 'playtalk_books_force_admin_ui_v1';

  const els = {
    avatarImage: document.getElementById('booksAccountAvatarImage'),
    avatarFallback: document.getElementById('booksAccountAvatarFallback'),
    adminUiToggleBtn: document.getElementById('booksAdminUiToggleBtn'),
    prevLevelBtn: document.getElementById('booksLevelPrevBtn'),
    nextLevelBtn: document.getElementById('booksLevelNextBtn'),
    levelTitle: document.getElementById('booksLevelTitle'),
    status: document.getElementById('booksStatus'),
    cardsGrid: document.getElementById('booksCardsGrid'),
    cardsEmpty: document.getElementById('booksCardsEmpty'),
    coverUploadInput: document.getElementById('booksCoverUploadInput'),
    magicModal: document.getElementById('booksMagicModal'),
    magicTitle: document.getElementById('booksMagicTitle'),
    magicCoverPromptInput: document.getElementById('booksMagicCoverPromptInput'),
    magicBackgroundPromptInput: document.getElementById('booksMagicBackgroundPromptInput'),
    magicGenerateBtn: document.getElementById('booksMagicGenerateBtn'),
    magicCloseBtn: document.getElementById('booksMagicCloseBtn'),
    jsonModal: document.getElementById('booksJsonModal'),
    jsonTitle: document.getElementById('booksJsonTitle'),
    jsonInput: document.getElementById('booksJsonInput'),
    jsonSaveBtn: document.getElementById('booksJsonSaveBtn'),
    jsonCloseBtn: document.getElementById('booksJsonCloseBtn'),
    reader: document.getElementById('booksReader'),
    readerBackBtn: document.getElementById('booksReaderBackBtn'),
    readerContent: document.getElementById('booksReaderContent'),
    readerEnglish: document.getElementById('booksReaderEnglish'),
    readerCounter: document.getElementById('booksReaderCounter')
  };

  const state = {
    user: null,
    localProfile: null,
    selectedLevel: 1,
    books: [],
    isAdmin: false,
    forceAdminUi: false,
    uploadInFlight: false,
    uploadTargetBookId: '',
    gradients: [],
    magicBookId: '',
    magicProcessingBookIds: new Set(),
    jsonBookId: '',
    readerOpen: false,
    readerBookId: '',
    readerLines: [],
    readerIndex: 0,
    readerTouchStartX: 0,
    readerTouchStartY: 0
  };

  function safeText(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  function readForceAdminUiFlag() {
    try {
      return window.localStorage.getItem(FORCE_ADMIN_UI_STORAGE_KEY) === '1';
    } catch (_error) {
      return false;
    }
  }

  function persistForceAdminUiFlag(enabled) {
    try {
      if (enabled) {
        window.localStorage.setItem(FORCE_ADMIN_UI_STORAGE_KEY, '1');
      } else {
        window.localStorage.removeItem(FORCE_ADMIN_UI_STORAGE_KEY);
      }
    } catch (_error) {
      // ignore
    }
  }

  function isAdminAlias(value) {
    return ADMIN_ALIASES.has(safeText(value).toLowerCase());
  }

  function isAdminUiEnabled() {
    return Boolean(state.isAdmin || state.forceAdminUi);
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
    const username = safeText(user.username);
    if (!username) return null;
    return {
      id: Number(user.id) || 0,
      username,
      avatarImage: safeText(user.avatar_image || user.avatarImage),
      isAdmin: Boolean(user.is_admin || user.isAdmin) || isAdminAlias(username)
    };
  }

  function readPersistedPlayerProfile() {
    try {
      const raw = JSON.parse(localStorage.getItem('playtalk_player_profile') || 'null');
      if (!raw || typeof raw !== 'object') {
        return { username: '', avatarImage: '' };
      }
      return {
        username: safeText(raw.username || raw.name || raw.email),
        avatarImage: safeText(raw.avatar || raw.avatarImage)
      };
    } catch (_error) {
      return { username: '', avatarImage: '' };
    }
  }

  function readLocalPlayerProfile() {
    const persisted = readPersistedPlayerProfile();
    try {
      if (window.playtalkPlayerState && typeof window.playtalkPlayerState.get === 'function') {
        const player = window.playtalkPlayerState.get() || {};
        return {
          username: safeText(player.username || persisted.username),
          avatarImage: safeText(player.avatar || persisted.avatarImage)
        };
      }
    } catch (_error) {
      // ignore
    }
    return persisted;
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
      const storyId = safeText(entry?.id);
      if (!fileName || !nome || !bookId) return;

      const key = bookId.toLowerCase();
      if (!byBook.has(key)) {
        byBook.set(key, {
          bookId,
          fileName,
          nome,
          nivel: normalizeLevel(entry?.nivel),
          coverImageUrl: safeText(entry?.coverImageUrl),
          backgroundDesktopUrl: safeText(entry?.backgroundDesktopUrl),
          backgroundMobileUrl: safeText(entry?.backgroundMobileUrl),
          selectedStoryId: storyId,
          storyIds: storyId ? [storyId] : []
        });
        return;
      }

      const current = byBook.get(key);
      if (!current.coverImageUrl && safeText(entry?.coverImageUrl)) {
        current.coverImageUrl = safeText(entry.coverImageUrl);
      }
      if (!current.backgroundDesktopUrl && safeText(entry?.backgroundDesktopUrl)) {
        current.backgroundDesktopUrl = safeText(entry.backgroundDesktopUrl);
      }
      if (!current.backgroundMobileUrl && safeText(entry?.backgroundMobileUrl)) {
        current.backgroundMobileUrl = safeText(entry.backgroundMobileUrl);
      }
      if (storyId && !current.storyIds.includes(storyId)) {
        current.storyIds.push(storyId);
        if (!current.selectedStoryId) {
          current.selectedStoryId = storyId;
        }
      }
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

  function normalizeBookKey(bookId) {
    return safeText(bookId).toLowerCase();
  }

  function isBookProcessingMagic(bookId) {
    return state.magicProcessingBookIds.has(normalizeBookKey(bookId));
  }

  function openUploadForBook(bookId) {
    if (!state.isAdmin || state.uploadInFlight) return;
    const targetBookId = safeText(bookId);
    if (!targetBookId || !els.coverUploadInput) return;
    if (isBookProcessingMagic(targetBookId)) return;
    state.uploadTargetBookId = targetBookId;
    els.coverUploadInput.value = '';
    els.coverUploadInput.click();
  }

  function openMagicModal(book) {
    if (!state.isAdmin || !els.magicModal || !book) return;
    state.magicBookId = safeText(book.bookId);
    if (!state.magicBookId) return;
    if (isBookProcessingMagic(state.magicBookId)) {
      setStatus('Esse livro ja esta gerando imagens agora.', null);
      return;
    }
    if (els.magicTitle) {
      els.magicTitle.textContent = `Gerar imagens: ${safeText(book.nome) || 'Livro'}`;
    }
    if (els.magicCoverPromptInput && !safeText(els.magicCoverPromptInput.value)) {
      els.magicCoverPromptInput.value = `Capa do livro ${safeText(book.nome)} com atmosfera cinematica, personagens e profundidade visual.`;
    }
    if (els.magicBackgroundPromptInput && !safeText(els.magicBackgroundPromptInput.value)) {
      els.magicBackgroundPromptInput.value = `Background do livro ${safeText(book.nome)} em estilo imersivo, sem texto e sem logos.`;
    }
    els.magicModal.classList.add('is-visible');
  }

  function closeMagicModal() {
    state.magicBookId = '';
    if (els.magicModal) {
      els.magicModal.classList.remove('is-visible');
    }
  }

  function openJsonModal(book) {
    if (!state.isAdmin || !els.jsonModal || !book) return;
    const bookId = safeText(book.bookId);
    if (!bookId) return;
    if (isBookProcessingMagic(bookId)) {
      setStatus('Esse livro esta processando. Aguarde terminar.', null);
      return;
    }
    state.jsonBookId = bookId;
    if (els.jsonTitle) {
      els.jsonTitle.textContent = `Salvar JSON: ${safeText(book.nome) || 'Livro'}`;
    }
    if (els.jsonInput) {
      els.jsonInput.value = '';
    }
    els.jsonModal.classList.add('is-visible');
  }

  function closeJsonModal() {
    state.jsonBookId = '';
    if (els.jsonModal) {
      els.jsonModal.classList.remove('is-visible');
    }
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
      const processingMagic = isBookProcessingMagic(book?.bookId);
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'books-card';
      card.dataset.bookId = safeText(book?.bookId);
      card.setAttribute('aria-label', `Livro ${safeText(book?.nome) || '-'}`);
      if (isAdminUiEnabled()) {
        card.classList.add('is-admin');
      }
      if (processingMagic) {
        card.classList.add('is-processing');
      }

      const background = document.createElement('span');
      background.className = 'books-card__background';
      if (coverImageUrl) {
        background.style.backgroundImage = `url(${safeCssUrl(coverImageUrl)})`;
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

      const actions = document.createElement('div');
      actions.className = 'books-card__actions';

      const uploadBtn = document.createElement('button');
      uploadBtn.type = 'button';
      uploadBtn.className = 'books-card__upload-btn';
      uploadBtn.setAttribute('aria-label', `Enviar capa de ${safeText(book?.nome) || 'livro'}`);
      uploadBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M19 18v2H5v-2H3v2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2zm-7-2 5-5h-3V2h-4v9H7z"/></svg>';
      uploadBtn.disabled = state.uploadInFlight || processingMagic;
      uploadBtn.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        openUploadForBook(book.bookId);
      });

      const magicBtn = document.createElement('button');
      magicBtn.type = 'button';
      magicBtn.className = 'books-card__magic-btn';
      magicBtn.setAttribute('aria-label', `Gerar imagens com IA para ${safeText(book?.nome) || 'livro'}`);
      magicBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m7.5 2 1.13 3.4L12 6.5l-3.37 1.1L7.5 11l-1.13-3.4L3 6.5l3.37-1.1zm9 5 1.5 4.5L22.5 13 18 14.5 16.5 19 15 14.5 10.5 13 15 11.5zm-8 7 1 3 3 1-3 1-1 3-1-3-3-1 3-1z"/></svg>';
      magicBtn.disabled = processingMagic;
      magicBtn.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        openMagicModal(book);
      });

      const textBtn = document.createElement('button');
      textBtn.type = 'button';
      textBtn.className = 'books-card__text-btn';
      textBtn.setAttribute('aria-label', `Salvar JSON de ${safeText(book?.nome) || 'livro'}`);
      textBtn.title = 'Salvar JSON';
      textBtn.textContent = 'JSON';
      textBtn.style.fontSize = '9px';
      textBtn.style.fontWeight = '800';
      textBtn.style.letterSpacing = '0.06em';
      textBtn.style.background = 'rgba(9, 36, 70, 0.9)';
      textBtn.disabled = processingMagic;
      textBtn.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        openJsonModal(book);
      });

      const processingOverlay = document.createElement('span');
      processingOverlay.className = 'books-card__processing';
      processingOverlay.innerHTML = '<span class="books-card__spinner" aria-hidden="true"></span><span class="books-card__processing-label">Gerando...</span>';

      actions.append(uploadBtn, magicBtn, textBtn);
      card.append(background, overlay, title, adminChip, actions, processingOverlay);
      card.addEventListener('click', () => {
        if (state.uploadInFlight || processingMagic) return;
        void startBookReader(book);
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

  function renderAdminUiToggle() {
    if (!els.adminUiToggleBtn) return;
    const isOn = isAdminUiEnabled();
    els.adminUiToggleBtn.classList.toggle('is-on', isOn);
    els.adminUiToggleBtn.textContent = isOn ? 'Admin UI On' : 'Admin UI Off';
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
    for (const path of SESSION_ENDPOINTS) {
      try {
        const response = await fetch(buildApiUrl(path), {
          credentials: 'include',
          headers: buildAuthHeaders(),
          cache: 'no-store'
        });
        if (!response.ok) {
          continue;
        }
        const payload = await response.json().catch(() => ({}));
        if (!payload || payload.success === false) {
          continue;
        }
        const normalized = normalizeUser(payload.user || payload);
        if (normalized) {
          return normalized;
        }
      } catch (_error) {
        // try next endpoint
      }
    }
    return null;
  }

  function setUploadBusy(isBusy) {
    state.uploadInFlight = Boolean(isBusy);
    renderLevelMenu();
    renderCards();
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
        if (response.status === 401 || response.status === 403) {
          throw new Error('Conta admin sem sessao ativa no servidor. Abra /account, faça login e tente de novo.');
        }
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

  async function postJsonWithSuccess(path, body, fallbackError) {
    const response = await fetch(buildApiUrl(path), {
      method: 'POST',
      credentials: 'include',
      headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body || {})
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.success) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('Conta admin sem sessao ativa no servidor. Abra /account, faça login e tente de novo.');
      }
      throw new Error(payload?.error || payload?.details || payload?.message || fallbackError || 'Falha na requisicao.');
    }
    return payload;
  }

  async function runMagicGenerationForBook(bookId, coverPrompt, backgroundPrompt, bookName) {
    const key = normalizeBookKey(bookId);
    if (!key || state.magicProcessingBookIds.has(key)) return;
    state.magicProcessingBookIds.add(key);
    renderCards();

    setStatus(`Gerando imagens para "${bookName || 'Livro'}"...`, null);
    try {
      const coverGenerated = await postJsonWithSuccess('/api/admin/minibooks/generate-cover', {
        bookId,
        prompt: coverPrompt
      }, 'Nao foi possivel gerar a capa.');

      const backgroundGenerated = await postJsonWithSuccess('/api/admin/minibooks/generate-background', {
        bookId,
        prompt: backgroundPrompt
      }, 'Nao foi possivel gerar o background.');

      await postJsonWithSuccess('/api/admin/minibooks/save-cover', {
        bookId,
        imageDataUrl: safeText(coverGenerated?.dataUrl),
        prompt: coverPrompt
      }, 'Nao foi possivel salvar a capa no R2.');

      await postJsonWithSuccess('/api/admin/minibooks/save-background', {
        bookId,
        desktopDataUrl: safeText(backgroundGenerated?.desktopDataUrl),
        mobileDataUrl: safeText(backgroundGenerated?.mobileDataUrl),
        prompt: backgroundPrompt
      }, 'Nao foi possivel salvar o background no R2.');

      state.books = await fetchStories();
      setStatus(`"${bookName || 'Livro'}" atualizado com capa e background no R2.`, 'success');
    } catch (error) {
      setStatus(error?.message || `Falha na geracao do livro "${bookName || 'Livro'}".`, 'error');
    } finally {
      state.magicProcessingBookIds.delete(key);
      renderCards();
    }
  }

  function generateAndSaveMagicForBook() {
    if (!state.isAdmin) return;
    const bookId = safeText(state.magicBookId);
    if (!bookId) return;
    if (isBookProcessingMagic(bookId)) {
      setStatus('Esse livro ja esta gerando imagens agora.', null);
      closeMagicModal();
      return;
    }

    const targetBook = state.books.find((entry) => safeText(entry?.bookId) === bookId);
    const bookName = safeText(targetBook?.nome || 'Livro');
    const coverPrompt = safeText(els.magicCoverPromptInput?.value || targetBook?.nome || '');
    const backgroundPrompt = safeText(els.magicBackgroundPromptInput?.value || targetBook?.nome || '');

    if (!coverPrompt || !backgroundPrompt) {
      setStatus('Preencha os dois campos de prompt antes de gerar.', 'error');
      return;
    }

    closeMagicModal();
    void runMagicGenerationForBook(bookId, coverPrompt, backgroundPrompt, bookName);
  }

  async function saveJsonForBook() {
    if (!state.isAdmin) return;
    const bookId = safeText(state.jsonBookId);
    if (!bookId) return;
    if (isBookProcessingMagic(bookId)) {
      setStatus('Esse livro esta processando. Aguarde terminar.', null);
      return;
    }

    const targetBook = state.books.find((entry) => safeText(entry?.bookId) === bookId);
    const bookName = safeText(targetBook?.nome || 'Livro');
    const jsonText = safeText(els.jsonInput?.value || '');
    if (!jsonText) {
      setStatus('Cole o JSON antes de salvar.', 'error');
      return;
    }

    try {
      JSON.parse(jsonText);
    } catch (_error) {
      setStatus('JSON invalido. Revise o formato e tente novamente.', 'error');
      return;
    }

    closeJsonModal();
    const key = normalizeBookKey(bookId);
    state.magicProcessingBookIds.add(key);
    renderCards();

    setStatus(`Salvando JSON de "${bookName}" no Postgres...`, null);
    try {
      await postJsonWithSuccess('/api/admin/minibooks/save-json', {
        bookId,
        jsonText
      }, 'Nao foi possivel salvar o JSON do livro.');
      state.books = await fetchStories();
      setStatus(`JSON do livro "${bookName}" salvo e publicado para todos.`, 'success');
    } catch (error) {
      setStatus(error?.message || `Falha ao salvar JSON de "${bookName}".`, 'error');
    } finally {
      state.magicProcessingBookIds.delete(key);
      renderCards();
    }
  }

  function setReaderVisible(visible) {
    state.readerOpen = Boolean(visible);
    if (els.reader) {
      els.reader.classList.toggle('is-visible', state.readerOpen);
    }
    document.body.classList.toggle('books-reader-open', state.readerOpen);
  }

  function chooseReaderBackgroundUrl(book) {
    const desktop = safeText(book?.backgroundDesktopUrl);
    const mobile = safeText(book?.backgroundMobileUrl);
    const isMobile = Boolean(window.matchMedia && window.matchMedia('(max-width: 900px)').matches);
    if (isMobile) {
      return mobile || desktop;
    }
    return desktop || mobile;
  }

  function applyReaderBackground(book) {
    if (!els.reader) return;
    const backgroundUrl = chooseReaderBackgroundUrl(book);
    if (!backgroundUrl) {
      els.reader.style.background = DEFAULT_READER_BACKGROUND;
      return;
    }

    els.reader.style.background = `linear-gradient(to top, rgba(2, 5, 10, 0.78) 0%, rgba(2, 5, 10, 0.38) 60%, rgba(2, 5, 10, 0.32) 100%), url(${safeCssUrl(backgroundUrl)}) center / cover no-repeat`;
  }

  function renderReader() {
    if (!els.readerEnglish || !els.readerCounter) return;
    const total = state.readerLines.length;
    const index = Math.max(0, Math.min(total - 1, state.readerIndex));
    state.readerIndex = index;
    const english = total ? safeText(state.readerLines[index]) : '';
    els.readerEnglish.textContent = english || 'Sem conteudo em ingles neste livro.';
    els.readerCounter.textContent = `${total ? index + 1 : 0} / ${total}`;
  }

  function closeReader() {
    setReaderVisible(false);
    state.readerBookId = '';
    state.readerLines = [];
    state.readerIndex = 0;
  }

  function stepReader(delta) {
    if (!state.readerOpen || !state.readerLines.length) return;
    const next = Math.max(0, Math.min(state.readerLines.length - 1, state.readerIndex + delta));
    if (next === state.readerIndex) return;
    state.readerIndex = next;
    renderReader();
  }

  async function fetchBookLines(book) {
    const storyId = safeText(book?.selectedStoryId || (Array.isArray(book?.storyIds) ? book.storyIds[0] : ''));
    if (!storyId) return [];
    const response = await fetch(buildApiUrl(`/api/speaking/cards?storyId=${encodeURIComponent(storyId)}`), {
      credentials: 'include',
      headers: buildAuthHeaders(),
      cache: 'no-store'
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.success || !Array.isArray(payload.cards)) {
      throw new Error(payload?.message || 'Nao foi possivel abrir o livro.');
    }
    return payload.cards
      .map((entry) => safeText(entry?.english))
      .filter(Boolean);
  }

  async function startBookReader(book) {
    if (!book) return;
    applyReaderBackground(book);
    setReaderVisible(true);
    state.readerBookId = safeText(book.bookId);
    state.readerLines = ['Carregando frases em ingles...'];
    state.readerIndex = 0;
    renderReader();
    try {
      const lines = await fetchBookLines(book);
      state.readerLines = lines.length ? lines : ['Este livro nao tem frases em ingles ainda.'];
      state.readerIndex = 0;
      renderReader();
      setStatus('', null);
    } catch (error) {
      closeReader();
      setStatus(error?.message || 'Nao foi possivel abrir o livro.', 'error');
    }
  }

  function bindEvents() {
    els.prevLevelBtn?.addEventListener('click', () => {
      setLevel(state.selectedLevel - 1);
    });

    els.nextLevelBtn?.addEventListener('click', () => {
      setLevel(state.selectedLevel + 1);
    });

    els.adminUiToggleBtn?.addEventListener('click', () => {
      state.forceAdminUi = !state.forceAdminUi;
      persistForceAdminUiFlag(state.forceAdminUi);
      renderAdminUiToggle();
      renderCards();
      if (isAdminUiEnabled()) {
        setStatus('Ferramentas admin visiveis. As APIs ainda validam permissao real.', null);
      } else {
        setStatus('', null);
      }
    });

    els.coverUploadInput?.addEventListener('change', (event) => {
      const file = event?.target?.files?.[0];
      if (!state.isAdmin || !file || !state.uploadTargetBookId) return;
      void uploadCoverForBook(state.uploadTargetBookId, file);
    });

    els.magicGenerateBtn?.addEventListener('click', () => {
      generateAndSaveMagicForBook();
    });

    els.magicCloseBtn?.addEventListener('click', () => {
      closeMagicModal();
    });

    els.magicModal?.addEventListener('click', (event) => {
      if (event.target === els.magicModal) {
        closeMagicModal();
      }
    });

    els.jsonSaveBtn?.addEventListener('click', () => {
      void saveJsonForBook();
    });

    els.jsonCloseBtn?.addEventListener('click', () => {
      closeJsonModal();
    });

    els.jsonModal?.addEventListener('click', (event) => {
      if (event.target === els.jsonModal) {
        closeJsonModal();
      }
    });

    els.readerBackBtn?.addEventListener('click', closeReader);

    els.readerContent?.addEventListener('touchstart', (event) => {
      const touch = event.touches?.[0];
      if (!touch) return;
      state.readerTouchStartX = Number(touch.clientX) || 0;
      state.readerTouchStartY = Number(touch.clientY) || 0;
    }, { passive: true });

    els.readerContent?.addEventListener('touchend', (event) => {
      const touch = event.changedTouches?.[0];
      if (!touch) return;
      const endX = Number(touch.clientX) || 0;
      const endY = Number(touch.clientY) || 0;
      const dx = endX - state.readerTouchStartX;
      const dy = endY - state.readerTouchStartY;
      if (Math.abs(dx) < 45 || Math.abs(dx) <= Math.abs(dy)) return;
      if (dx < 0) {
        stepReader(1);
      } else {
        stepReader(-1);
      }
    }, { passive: true });

    window.addEventListener('keydown', (event) => {
      if (!state.readerOpen) return;
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        stepReader(1);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        stepReader(-1);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        closeReader();
      }
    });

    window.addEventListener('resize', () => {
      if (!state.readerOpen || !state.readerBookId) return;
      const activeBook = state.books.find((entry) => safeText(entry?.bookId) === state.readerBookId);
      if (!activeBook) return;
      applyReaderBackground(activeBook);
    });
  }

  async function init() {
    bindEvents();
    state.gradients = buildGradientPool();
    state.forceAdminUi = readForceAdminUiFlag();
    renderLevelMenu();
    renderAdminUiToggle();
    state.localProfile = readLocalPlayerProfile();

    const [sessionUser, books] = await Promise.all([
      fetchSessionUser(),
      fetchStories()
    ]);

    state.user = sessionUser;
    state.isAdmin = Boolean(sessionUser?.isAdmin)
      || isAdminAlias(sessionUser?.username)
      || isAdminAlias(state.localProfile?.username);
    state.books = Array.isArray(books) ? books : [];

    renderAvatar();
    renderLevelMenu();
    renderAdminUiToggle();
    renderCards();

    if (state.isAdmin) {
      if (sessionUser?.isAdmin || isAdminAlias(sessionUser?.username)) {
        setStatus('Modo admin ativo: upload e varinha disponiveis no card.', null);
      } else {
        setStatus('Admin local detectado. Se o servidor bloquear upload/IA, faça login em /account e volte.', null);
      }
    } else {
      setStatus('', null);
    }
  }

  init();
})();
