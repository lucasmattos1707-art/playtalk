(function initPlaytalkUsersPage() {
  const GUEST_ID_KEY = 'playtalk_guest_rank_id';
  const GUEST_PROGRESS_KEY = 'playtalk-flashcards-progress-v3';
  const GUEST_OWNED_KEY = 'playtalk-flashcards-owned-v2';
  const PRESENCE_PING_MS = 15000;
  const CHALLENGE_POLL_MS = 2500;
  const HAS_GLOBAL_CHALLENGE_POPUPS = Boolean(window.PlaytalkChallengePopups);
  const BANNER_CYCLE_MS = 14000;
  const BANNER_SLOT_COUNT = 4;
  const BANNER_SLOT_MS = BANNER_CYCLE_MS / BANNER_SLOT_COUNT;
  const BANNER_SLOT_CHECK_MS = 240;
  const RANKING_CACHE_TTL_MS = 25000;
  const USERS_STAGE_SLIDE_MS = 320;

  const RANKING_METRICS = [
    { slot: 1, key: 'flashcards', label: 'Flashcards', valueLabel: '' },
    { slot: 2, key: 'pronunciation', label: 'Pronuncia', valueLabel: '%' },
    { slot: 3, key: 'speed', label: 'Velocidade', valueLabel: '/h' },
    { slot: 4, key: 'battle', label: 'Batalhas vencidas', valueLabel: '' }
  ];

  const els = {
    usersStage: document.getElementById('usersStage'),
    usersList: document.getElementById('usersList'),
    usersStatus: document.getElementById('usersStatus'),
    rankingLabel: document.getElementById('rankingLabel'),
    adminModal: document.getElementById('usersAdminModal'),
    adminTitle: document.getElementById('usersAdminTitle'),
    adminCopy: document.getElementById('usersAdminCopy'),
    adminPanelTitle: document.getElementById('usersAdminPanelTitle'),
    adminPanelCopy: document.getElementById('usersAdminPanelCopy'),
    adminBotGrid: document.getElementById('usersAdminBotGrid'),
    adminStatus: document.getElementById('usersAdminStatus'),
    botLaunchBtn: document.getElementById('usersBotLaunchBtn'),
    botModal: document.getElementById('usersBotModal'),
    botForm: document.getElementById('usersBotForm'),
    botAvatarPreview: document.getElementById('usersBotAvatarPreview'),
    botPhotoInput: document.getElementById('usersBotPhotoInput'),
    botNameInput: document.getElementById('usersBotNameInput'),
    botFlashcardsInput: document.getElementById('usersBotFlashcardsInput'),
    botPronunciationInput: document.getElementById('usersBotPronunciationInput'),
    botSpeedInput: document.getElementById('usersBotSpeedInput'),
    botResponseInput: document.getElementById('usersBotResponseInput'),
    botHint: document.getElementById('usersBotHint'),
    botCreateBtn: document.getElementById('usersBotCreateBtn'),
    botCloseBtn: document.getElementById('usersBotCloseBtn'),
    botCloseTopBtn: document.getElementById('usersBotCloseTopBtn'),
    botStatus: document.getElementById('usersBotStatus'),
    deleteUserBtn: document.getElementById('deleteUserBtn'),
    closeAdminModalBtn: document.getElementById('closeAdminModalBtn'),
    closeAdminModalTopBtn: document.getElementById('closeAdminModalTopBtn'),
    challengeModal: document.getElementById('usersChallengeModal'),
    challengeAvatar: document.getElementById('usersChallengeAvatar'),
    challengeName: document.getElementById('usersChallengeName'),
    challengeCopy: document.getElementById('usersChallengeCopy'),
    challengeActionBtn: document.getElementById('usersChallengeActionBtn'),
    challengeCloseBtn: document.getElementById('usersChallengeCloseBtn'),
    challengeStatus: document.getElementById('usersChallengeStatus'),
    incomingModal: document.getElementById('incomingChallengeModal'),
    incomingAvatar: document.getElementById('incomingChallengeAvatar'),
    incomingName: document.getElementById('incomingChallengeName'),
    incomingCopy: document.getElementById('incomingChallengeCopy'),
    incomingAcceptBtn: document.getElementById('incomingChallengeAcceptBtn'),
    incomingRejectBtn: document.getElementById('incomingChallengeRejectBtn')
  };

  const state = {
    currentUser: null,
    viewer: null,
    rows: [],
    selectedUser: null,
    adminBusy: false,
    challengeTarget: null,
    challengeBusy: false,
    outgoingChallengeId: 0,
    outgoingTerminalNoticeKey: '',
    incomingChallengeId: 0,
    redirectedByChallenge: false,
    currentMetricKey: 'flashcards',
    currentMetricLabel: 'Flashcards',
    currentMetricValueLabel: '',
    bannerTrack: null,
    activeBannerSlot: 0,
    bannerClockStartedAtMs: Date.now(),
    loadRequestId: 0,
    rankingCache: new Map(),
    preloadInFlight: new Map(),
    stageAnimating: false,
    botBusy: false,
    botSourceImageDataUrl: ''
  };

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

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, (char) => (
      {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        '\'': '&#39;'
      }[char] || char
    ));
  }

  function safeText(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  function setUsersStatus(message) {
    if (!els.usersStatus) return;
    els.usersStatus.textContent = message || '';
  }

  function setRankingLabel(label) {
    if (!els.rankingLabel) return;
    const text = `Ranking: ${safeText(label) || 'Flashcards'}`;
    els.rankingLabel.innerHTML = `<span class="ranking-label__text">${escapeHtml(text)}</span>`;
    els.rankingLabel.style.opacity = '1';
    els.rankingLabel.style.visibility = 'visible';
  }

  function metricByKey(metricKey) {
    return RANKING_METRICS.find((metric) => metric.key === metricKey) || RANKING_METRICS[0];
  }

  function metricBySlot(slot) {
    return RANKING_METRICS.find((metric) => metric.slot === slot) || RANKING_METRICS[0];
  }

  function wait(ms) {
    return new Promise((resolve) => {
      window.setTimeout(resolve, Math.max(0, Number(ms) || 0));
    });
  }

  function metricValueFromEntry(entry, metricKey) {
    if (metricKey === 'pronunciation') return Number(entry?.pronunciationPercent) || 0;
    if (metricKey === 'speed') return Number(entry?.speedFlashcardsPerHour) || 0;
    if (metricKey === 'battle') return Number(entry?.battlesWon) || 0;
    return Number(entry?.flashcardsCount) || 0;
  }

  function formatMetricValue(entry, metricKey, metricValueLabel = '') {
    const value = metricValueFromEntry(entry, metricKey);
    if (metricKey === 'speed') {
      return `${value.toFixed(1)}${metricValueLabel || ''}`;
    }
    return `${Math.max(0, Math.round(value))}${metricValueLabel || ''}`;
  }

  function resolveBannerTrackElement() {
    if (state.bannerTrack && state.bannerTrack.isConnected) return state.bannerTrack;
    const track = document.querySelector('.banner-carousel__track');
    state.bannerTrack = track || null;
    return state.bannerTrack;
  }

  function readGuestName() {
    try {
      let id = localStorage.getItem(GUEST_ID_KEY);
      if (!id) {
        id = String(Math.floor(100000 + Math.random() * 900000));
        localStorage.setItem(GUEST_ID_KEY, id);
      }
      return `#user${id}`;
    } catch (_error) {
      return '#user000000';
    }
  }

  function readGuestFlashcardsCount() {
    const candidateKeys = [GUEST_PROGRESS_KEY, GUEST_OWNED_KEY];
    let bestCount = 0;
    try {
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (!key || !candidateKeys.some((baseKey) => key === baseKey || key.startsWith(`${baseKey}:`))) continue;
        const parsed = JSON.parse(localStorage.getItem(key) || 'null');
        const count = Array.isArray(parsed) ? parsed.length : 0;
        if (count > bestCount) bestCount = count;
      }
    } catch (_error) {
      return bestCount;
    }
    return bestCount;
  }

  function normalizeUser(user) {
    if (!user || typeof user !== 'object') return null;
    const id = Number(user.id) || 0;
    const username = safeText(user.username);
    if (!id || !username) return null;
    return {
      id,
      username,
      isAdmin: Boolean(user.is_admin)
    };
  }

  function normalizeUsers(payload) {
    const users = Array.isArray(payload?.users) ? payload.users : [];
    return users.map((entry) => ({
      userId: Number(entry?.userId) || 0,
      username: safeText(entry?.username || 'Usuario') || 'Usuario',
      rank: Number(entry?.rank) || 0,
      flashcardsCount: Number(entry?.flashcardsCount) || 0,
      pronunciationPercent: Number(entry?.pronunciationPercent) || 0,
      speedFlashcardsPerHour: Number(entry?.speedFlashcardsPerHour) || 0,
      battlesWon: Number(entry?.battlesWon) || 0,
      rankingValue: Number(entry?.rankingValue) || 0,
      avatarImage: safeText(entry?.avatarImage || 'Avatar/avatar-man-person-svgrepo-com.svg') || 'Avatar/avatar-man-person-svgrepo-com.svg',
      isAdmin: Boolean(entry?.isAdmin),
      isBot: Boolean(entry?.isBot),
      botAvatarStatus: safeText(entry?.botAvatarStatus || 'ready') || 'ready',
      botAvatarError: safeText(entry?.botAvatarError || ''),
      botConfig: entry?.botConfig && typeof entry.botConfig === 'object' ? {
        username: safeText(entry.botConfig.username || entry.username || 'Usuario') || 'Usuario',
        flashcardsCount: Number(entry.botConfig.flashcardsCount) || 0,
        pronunciationBase: Number(entry.botConfig.pronunciationBase) || 0,
        flashcardsPerHour: Number(entry.botConfig.flashcardsPerHour) || 0,
        responseSeconds: Number(entry.botConfig.responseSeconds) || 0
      } : null,
      premiumUntil: entry?.premiumUntil || null,
      premiumActive: Boolean(entry?.premiumActive),
      isOnline: Boolean(entry?.isOnline)
    }));
  }

  function normalizeViewer(entry) {
    if (!entry || typeof entry !== 'object') return null;
    return {
      userId: Number(entry?.userId) || 0,
      username: safeText(entry?.username || 'Usuario') || 'Usuario',
      rank: Number(entry?.rank) || 0,
      flashcardsCount: Number(entry?.flashcardsCount) || 0,
      pronunciationPercent: Number(entry?.pronunciationPercent) || 0,
      speedFlashcardsPerHour: Number(entry?.speedFlashcardsPerHour) || 0,
      battlesWon: Number(entry?.battlesWon) || 0,
      rankingValue: Number(entry?.rankingValue) || 0
    };
  }

  function isAdminViewer() {
    return Boolean(state.currentUser?.isAdmin);
  }

  function syncAdminViewerUi() {
    document.body.classList.toggle('is-admin-viewer', isAdminViewer());
  }

  function setBotStatus(message) {
    if (!els.botStatus) return;
    els.botStatus.textContent = message || '';
  }

  function setAdminStatus(message) {
    if (!els.adminStatus) return;
    els.adminStatus.textContent = message || '';
  }

  function renderAdminBotInfo(user) {
    if (!els.adminBotGrid || !els.adminPanelTitle || !els.adminPanelCopy) return;
    const botConfig = user?.botConfig && typeof user.botConfig === 'object' ? user.botConfig : null;
    if (!user?.isBot || !botConfig) {
      els.adminPanelTitle.textContent = 'Informacoes do usuario';
      els.adminPanelCopy.textContent = user?.isOnline
        ? 'Usuario online agora.'
        : 'Usuario offline no momento.';
      els.adminBotGrid.innerHTML = '';
      els.adminBotGrid.hidden = true;
      return;
    }

    const infoItems = [
      ['Nome', safeText(botConfig.username || user.username || 'Bot') || 'Bot'],
      ['Rank atual', String(Math.max(0, Number(user.rank) || 0))],
      ['Flashcards iniciais', String(Math.max(0, Number(botConfig.flashcardsCount) || 0))],
      ['Pronuncia media', `${Math.max(0, Number(botConfig.pronunciationBase) || 0)}%`],
      ['Flashcards por hora', String(Math.max(0, Number(botConfig.flashcardsPerHour) || 0))],
      ['Tempo medio por frase', `${Math.max(0, Number(botConfig.responseSeconds) || 0)} s`]
    ];

    els.adminPanelTitle.textContent = 'Configuracao do bot';
    els.adminPanelCopy.textContent = 'Esses sao os dados configurados quando o bot foi criado.';
    els.adminBotGrid.innerHTML = infoItems.map(([label, value]) => `
      <article class="users-admin-bot-item">
        <span class="users-admin-bot-label">${escapeHtml(label)}</span>
        <span class="users-admin-bot-value">${escapeHtml(value)}</span>
      </article>
    `).join('');
    els.adminBotGrid.hidden = false;
  }

  function syncAdminButtons() {
    const disabled = state.adminBusy || !state.selectedUser;
    [els.deleteUserBtn].forEach((button) => {
      if (!button) return;
      button.disabled = disabled;
    });
  }

  function closeAdminModal() {
    state.selectedUser = null;
    state.adminBusy = false;
    if (els.adminModal) els.adminModal.classList.remove('is-visible');
    setAdminStatus('');
    syncAdminButtons();
  }

  function updateBotHint() {
    if (!els.botHint) return;
    const flashcardsPerHour = Math.max(0, Number(els.botSpeedInput?.value) || 0);
    const estimatedGain = Math.max(0, Math.round(flashcardsPerHour / 12));
    els.botHint.textContent = `Treino diario: 5 minutos. Com ${flashcardsPerHour || 0} flashcards/hora, esse bot ganha ${estimatedGain} flashcard${estimatedGain === 1 ? '' : 's'} por atualizacao.`;
  }

  function closeBotModal() {
    state.botBusy = false;
    state.botSourceImageDataUrl = '';
    if (els.botModal) els.botModal.classList.remove('is-visible');
    if (els.botForm) els.botForm.reset();
    if (els.botAvatarPreview) {
      els.botAvatarPreview.src = '/Avatar/avatar-man-person-svgrepo-com.svg';
    }
    if (els.botCreateBtn) els.botCreateBtn.disabled = false;
    setBotStatus('');
    updateBotHint();
  }

  function openBotModal() {
    if (!isAdminViewer()) return;
    updateBotHint();
    setBotStatus('');
    if (els.botModal) els.botModal.classList.add('is-visible');
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Nao foi possivel ler a imagem.'));
      reader.readAsDataURL(file);
    });
  }

  function dataUrlToSquareWebpDataUrl(sourceDataUrl, size = 400) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          const context = canvas.getContext('2d');
          if (!context) {
            reject(new Error('Nao foi possivel preparar a imagem.'));
            return;
          }
          const sourceWidth = image.naturalWidth || image.width;
          const sourceHeight = image.naturalHeight || image.height;
          const sourceSide = Math.min(sourceWidth, sourceHeight);
          const sourceX = Math.max(0, Math.round((sourceWidth - sourceSide) / 2));
          const sourceY = Math.max(0, Math.round((sourceHeight - sourceSide) / 2));
          context.clearRect(0, 0, size, size);
          context.drawImage(image, sourceX, sourceY, sourceSide, sourceSide, 0, 0, size, size);
          resolve(canvas.toDataURL('image/webp', 0.86));
        } catch (error) {
          reject(error);
        }
      };
      image.onerror = () => reject(new Error('Nao foi possivel abrir a foto.'));
      image.src = sourceDataUrl;
    });
  }

  async function handleBotPhotoChange(event) {
    const file = event?.target?.files?.[0];
    if (!file) return;
    try {
      setBotStatus('Preparando foto...');
      const sourceDataUrl = await fileToDataUrl(file);
      const squareDataUrl = await dataUrlToSquareWebpDataUrl(sourceDataUrl, 400);
      state.botSourceImageDataUrl = squareDataUrl;
      if (els.botAvatarPreview) {
        els.botAvatarPreview.src = squareDataUrl;
      }
      setBotStatus('Foto pronta. O avatar final vai ser gerado em segundo plano.');
    } catch (error) {
      state.botSourceImageDataUrl = '';
      setBotStatus(error?.message || 'Nao foi possivel preparar a foto.');
    }
  }

  async function createBot() {
    if (!isAdminViewer() || state.botBusy) return;
    const username = safeText(els.botNameInput?.value);
    if (!username || !state.botSourceImageDataUrl) {
      setBotStatus('Preencha o nome e envie a foto base do bot.');
      return;
    }

    state.botBusy = true;
    if (els.botCreateBtn) els.botCreateBtn.disabled = true;
    setBotStatus('Criando bot e enviando avatar para a fila...');
    try {
      const response = await fetch(buildApiUrl('/api/admin/users/bots'), {
        method: 'POST',
        credentials: 'include',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          username,
          sourceImageDataUrl: state.botSourceImageDataUrl,
          flashcardsCount: Math.max(0, Number(els.botFlashcardsInput?.value) || 0),
          pronunciationBase: Math.max(0, Number(els.botPronunciationInput?.value) || 0),
          flashcardsPerHour: Math.max(0, Number(els.botSpeedInput?.value) || 0),
          responseSeconds: Math.max(1, Number(els.botResponseInput?.value) || 0)
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Nao foi possivel criar o bot.');
      }
      closeBotModal();
      await loadUsers('Bot criado. Atualizando ranking...', { metricKey: state.currentMetricKey, force: true });
    } catch (error) {
      setBotStatus(error?.message || 'Nao foi possivel criar o bot.');
      state.botBusy = false;
      if (els.botCreateBtn) els.botCreateBtn.disabled = false;
    }
  }

  function openAdminModal(user) {
    if (!isAdminViewer() || !user || user.userId === state.currentUser?.id) return;
    state.selectedUser = user;
    state.adminBusy = false;
    if (els.adminTitle) els.adminTitle.textContent = user.username;
    if (els.adminCopy) {
      els.adminCopy.textContent = `Rank ${user.rank || 0} | ${formatMetricValue(user, state.currentMetricKey, state.currentMetricValueLabel)} (${state.currentMetricLabel})`;
    }
    renderAdminBotInfo(user);
    if (els.adminModal) els.adminModal.classList.add('is-visible');
    setAdminStatus('');
    syncAdminButtons();
  }

  function setChallengeStatus(message) {
    if (!els.challengeStatus) return;
    els.challengeStatus.textContent = message || '';
  }

  function closeChallengeModal() {
    if (els.challengeModal) els.challengeModal.classList.remove('is-visible');
    state.challengeTarget = null;
    state.challengeBusy = false;
    setChallengeStatus('');
    if (els.challengeActionBtn) els.challengeActionBtn.disabled = false;
  }

  function openChallengeModal(user) {
    if (!user || !state.currentUser?.id || user.userId === state.currentUser.id) return;
    state.challengeTarget = user;
    state.challengeBusy = false;
    if (els.challengeAvatar) {
      els.challengeAvatar.src = user.avatarImage || '/Avatar/avatar-man-person-svgrepo-com.svg';
    }
    if (els.challengeName) els.challengeName.textContent = user.username;
    if (els.challengeCopy) {
      els.challengeCopy.textContent = user.isBot
        ? 'Bot aceita na hora e o duelo abre direto no speaking.'
        : user.isOnline
          ? 'Usuario online agora. Clique para enviar desafio speaking com 25 cartas.'
          : 'Usuario offline no momento. Quando ele ficar online voce consegue desafiar.';
    }
    if (els.challengeActionBtn) {
      els.challengeActionBtn.disabled = !user.isBot && !user.isOnline;
    }
    setChallengeStatus('');
    if (els.challengeModal) els.challengeModal.classList.add('is-visible');
  }

  function currentViewerEntry(rows) {
    if (state.currentUser?.id) {
      return state.viewer || rows.find((entry) => entry.userId === state.currentUser.id) || null;
    }

    if (state.currentMetricKey !== 'flashcards') {
      return null;
    }

    const guestCount = readGuestFlashcardsCount();
    const higherCount = rows.filter((entry) => entry.flashcardsCount > guestCount).length;
    return {
      userId: 0,
      username: readGuestName(),
      rank: higherCount + 1,
      flashcardsCount: guestCount,
      premiumActive: false
    };
  }

  function rowMetaText(entry) {
    const parts = [];
    parts.push(entry.isBot ? 'Bot' : (entry.premiumActive ? 'Premium ativo' : 'Free'));
    if (entry.isBot && entry.botAvatarStatus === 'processing') {
      parts.push('Avatar gerando');
    } else if (entry.isBot && entry.botAvatarStatus === 'error') {
      parts.push('Avatar com erro');
    } else {
      parts.push(entry.isOnline ? 'Online' : 'Offline');
    }
    return parts.join(' | ');
  }

  function renderRows(rows) {
    if (!rows.length) {
      els.usersList.innerHTML = `
        <div class="users-row is-empty">
          <span>Nenhum usuario cadastrado apareceu ainda.</span>
        </div>
      `;
      return;
    }

    const displayRows = rows
      .slice(0, 50)
      .sort((left, right) => (left.rank || 999999) - (right.rank || 999999));

    const rowMarkup = displayRows.map((entry) => `
      <div class="users-row${entry.isOnline ? ' is-online' : ''}${isAdminViewer() && entry.userId !== state.currentUser?.id ? ' is-admin-target' : ''}" data-user-id="${entry.userId}">
        <div class="users-avatar${entry.botAvatarStatus === 'processing' ? ' is-processing' : ''}">
          <img src="${escapeHtml(entry.avatarImage || 'Avatar/avatar-man-person-svgrepo-com.svg')}" alt="${escapeHtml(entry.username)}">
          <span class="users-rank-badge">${escapeHtml(entry.rank || 0)}</span>
        </div>
        <div class="users-main">
          <span class="users-name">${escapeHtml(entry.username)}</span>
          <span class="users-meta">${escapeHtml(rowMetaText(entry))}</span>
        </div>
        <div
          class="users-count"
          style="color:#ffffff !important;-webkit-text-fill-color:#ffffff !important;opacity:1 !important;visibility:visible !important;text-shadow:0 2px 10px rgba(6,20,42,.65);background:transparent;"
        >${escapeHtml(formatMetricValue(entry, state.currentMetricKey, state.currentMetricValueLabel))}</div>
      </div>
    `).join('');

    els.usersList.innerHTML = rowMarkup;
    Array.from(els.usersList.querySelectorAll('.users-count')).forEach((countEl) => {
      countEl.style.color = '#ffffff';
      countEl.style.webkitTextFillColor = '#ffffff';
      countEl.style.background = 'transparent';
      countEl.style.opacity = '1';
      countEl.style.visibility = 'visible';
    });
    Array.from(els.usersList.querySelectorAll('[data-user-id]')).forEach((rowEl) => {
      rowEl.addEventListener('click', () => {
        const userId = Number(rowEl.getAttribute('data-user-id')) || 0;
        const user = state.rows.find((entry) => entry.userId === userId);
        if (!user || user.userId === state.currentUser?.id) return;
        if (isAdminViewer()) {
          openAdminModal(user);
          return;
        }
        openChallengeModal(user);
      });
    });
  }

  async function fetchSessionUser() {
    const response = await fetch(buildApiUrl('/auth/session'), {
      headers: buildAuthHeaders(),
      cache: 'no-store',
      credentials: 'include'
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.success) return null;
    return normalizeUser(payload.user);
  }

  async function fetchUsersMetric(metricKey, options = {}) {
    const normalizedMetricKey = safeText(metricKey || state.currentMetricKey || 'flashcards') || 'flashcards';
    const force = Boolean(options.force);
    const cached = state.rankingCache.get(normalizedMetricKey);
    if (!force && cached && (Date.now() - cached.fetchedAt) < RANKING_CACHE_TTL_MS) {
      return cached.data;
    }
    try {
      const response = await fetch(buildApiUrl(`/api/users/flashcards?limit=50&metric=${encodeURIComponent(normalizedMetricKey)}`), {
        headers: buildAuthHeaders(),
        cache: 'no-store',
        credentials: 'include'
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Falha ao carregar usuarios.');
      }

      const selectedMetric = metricByKey(payload?.metric || normalizedMetricKey);
      const data = {
        metricKey: selectedMetric.key,
        metricLabel: safeText(payload?.metricLabel || selectedMetric.label) || selectedMetric.label,
        metricValueLabel: safeText(payload?.metricValueLabel || selectedMetric.valueLabel || ''),
        rows: normalizeUsers(payload),
        viewer: normalizeViewer(payload.viewer)
      };
      state.rankingCache.set(normalizedMetricKey, {
        fetchedAt: Date.now(),
        data
      });
      return data;
    } catch (_error) {
      return null;
    }
  }

  async function preloadMetric(metricKey, options = {}) {
    const normalizedMetricKey = safeText(metricKey) || 'flashcards';
    const force = Boolean(options.force);
    if (!force) {
      const cached = state.rankingCache.get(normalizedMetricKey);
      if (cached && (Date.now() - cached.fetchedAt) < RANKING_CACHE_TTL_MS) {
        return cached.data;
      }
    }
    const existing = state.preloadInFlight.get(normalizedMetricKey);
    if (existing) return existing;
    const promise = fetchUsersMetric(normalizedMetricKey, { force })
      .finally(() => {
        state.preloadInFlight.delete(normalizedMetricKey);
      });
    state.preloadInFlight.set(normalizedMetricKey, promise);
    return promise;
  }

  async function animateUsersStageSlide() {
    if (!els.usersStage || state.stageAnimating) return;
    state.stageAnimating = true;
    els.usersStage.classList.remove('is-sliding-in');
    els.usersStage.classList.add('is-sliding-out');
    await wait(USERS_STAGE_SLIDE_MS);
  }

  async function settleUsersStageSlide() {
    if (!els.usersStage || !state.stageAnimating) return;
    els.usersStage.classList.remove('is-sliding-out');
    els.usersStage.classList.add('is-sliding-in');
    void els.usersStage.offsetWidth;
    els.usersStage.classList.remove('is-sliding-in');
    await wait(USERS_STAGE_SLIDE_MS);
    state.stageAnimating = false;
  }

  function applyUsersData(data, options = {}) {
    if (!data) return;
    state.currentMetricKey = data.metricKey;
    state.currentMetricLabel = data.metricLabel;
    state.currentMetricValueLabel = data.metricValueLabel;
    setRankingLabel(state.currentMetricLabel);
    state.rows = Array.isArray(data.rows) ? data.rows : [];
    state.viewer = data.viewer || null;
    renderRows(state.rows);
    const viewer = currentViewerEntry(state.rows);
    if (options.statusMessage != null) {
      setUsersStatus(options.statusMessage);
      return;
    }
    setUsersStatus(viewer?.rank ? `Voce esta em ${viewer.rank} lugar` : 'Ranking carregado.');
  }

  function nextMetricKeyForSlot(slot) {
    const nextSlot = (Number(slot) || 1) >= BANNER_SLOT_COUNT ? 1 : (Number(slot) || 1) + 1;
    return metricBySlot(nextSlot).key;
  }

  async function ensureUpcomingRankingPreloaded(slot) {
    const nextMetricKey = nextMetricKeyForSlot(slot);
    await preloadMetric(nextMetricKey);
  }

  async function loadUsers(message, options = {}) {
    const metricKey = safeText(options.metricKey || state.currentMetricKey || 'flashcards') || 'flashcards';
    const force = Boolean(options.force);
    const animate = options.animate !== false;
    const requestId = state.loadRequestId + 1;
    state.loadRequestId = requestId;

    if (message) {
      setUsersStatus(message);
    }

    const data = await preloadMetric(metricKey, { force });
    if (requestId !== state.loadRequestId) return;
    if (!data) {
      renderRows([]);
      state.rows = [];
      setUsersStatus('Nao consegui carregar o ranking agora.');
      return;
    }

    const metricChanged = state.currentMetricKey !== data.metricKey;
    if (animate && metricChanged) {
      await animateUsersStageSlide();
      if (requestId !== state.loadRequestId) {
        state.stageAnimating = false;
        return;
      }
    }
    applyUsersData(data);
    if (animate && metricChanged) {
      await settleUsersStageSlide();
    }
    void ensureUpcomingRankingPreloaded(metricByKey(data.metricKey).slot);
  }

  function currentBannerSlot() {
    const track = resolveBannerTrackElement();
    if (track) {
      const computedStyle = window.getComputedStyle(track);
      const transform = computedStyle?.transform || '';
      if (transform && transform !== 'none') {
        const matrix3dMatch = transform.match(/^matrix3d\((.+)\)$/);
        const matrix2dMatch = transform.match(/^matrix\((.+)\)$/);
        let translateX = 0;
        if (matrix3dMatch) {
          const parts = matrix3dMatch[1].split(',').map((part) => Number(part.trim()));
          translateX = Number(parts[12]) || 0;
        } else if (matrix2dMatch) {
          const parts = matrix2dMatch[1].split(',').map((part) => Number(part.trim()));
          translateX = Number(parts[4]) || 0;
        }
        const trackWidth = Math.max(1, track.getBoundingClientRect().width || 1);
        const progress = Math.max(0, Math.min(3, Math.round((-translateX / trackWidth) * 4)));
        return progress + 1;
      }
    }

    const elapsed = Math.max(0, Date.now() - state.bannerClockStartedAtMs);
    const cycleProgress = elapsed % BANNER_CYCLE_MS;
    return Math.floor(cycleProgress / BANNER_SLOT_MS) + 1;
  }

  async function syncRankingWithBanner(force) {
    const slot = currentBannerSlot();
    const metric = metricBySlot(slot);
    if (!metric) return;
    if (!force && state.activeBannerSlot === slot && state.currentMetricKey === metric.key) return;
    state.activeBannerSlot = slot;
    if (!force) {
      void ensureUpcomingRankingPreloaded(slot);
    }
    await loadUsers('', { metricKey: metric.key, force, animate: !force });
  }

  function startBannerLinkedRankingLoop() {
    window.setInterval(() => {
      void syncRankingWithBanner(false);
    }, BANNER_SLOT_CHECK_MS);
  }

  async function pingPresence() {
    if (!state.currentUser?.id) return;
    try {
      await fetch(buildApiUrl('/api/speaking/presence/ping'), {
        method: 'POST',
        credentials: 'include',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        body: '{}'
      });
    } catch (_error) {
      // ignore
    }
  }

  function closeIncomingModal() {
    state.incomingChallengeId = 0;
    if (els.incomingModal) els.incomingModal.classList.remove('is-visible');
  }

  function openIncomingModal(challenge) {
    if (HAS_GLOBAL_CHALLENGE_POPUPS) return;
    const challengeId = Number(challenge?.challengeId) || 0;
    if (!challengeId || state.incomingChallengeId === challengeId) return;
    state.incomingChallengeId = challengeId;
    if (els.incomingAvatar) {
      els.incomingAvatar.src = challenge?.challenger?.avatarImage || 'Avatar/avatar-man-person-svgrepo-com.svg';
    }
    if (els.incomingName) {
      els.incomingName.textContent = challenge?.challenger?.username || 'Usuario';
    }
    if (els.incomingCopy) {
      const username = challenge?.challenger?.username || 'Usuario';
      els.incomingCopy.textContent = `${username} te desafiou pra um speaking`;
    }
    if (els.incomingModal) els.incomingModal.classList.add('is-visible');
  }

  async function respondIncomingChallenge(action) {
    if (HAS_GLOBAL_CHALLENGE_POPUPS) return;
    if (!state.incomingChallengeId) return;
    const challengeId = state.incomingChallengeId;
    els.incomingAcceptBtn.disabled = true;
    els.incomingRejectBtn.disabled = true;
    try {
      const response = await fetch(buildApiUrl('/api/speaking/challenges/respond'), {
        method: 'POST',
        credentials: 'include',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ challengeId, action })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Falha ao responder desafio.');
      }
      closeIncomingModal();
      if (action === 'accept' && payload?.sessionId) {
        window.location.href = `/speaking?session=${encodeURIComponent(payload.sessionId)}`;
      } else {
        setUsersStatus('Desafio recusado.');
      }
    } catch (error) {
      setUsersStatus(error?.message || 'Falha ao responder desafio.');
    } finally {
      els.incomingAcceptBtn.disabled = false;
      els.incomingRejectBtn.disabled = false;
    }
  }

  async function pollChallenges() {
    if (HAS_GLOBAL_CHALLENGE_POPUPS) return;
    if (!state.currentUser?.id || state.redirectedByChallenge) return;
    try {
      const response = await fetch(buildApiUrl('/api/speaking/challenges/poll'), {
        headers: buildAuthHeaders(),
        cache: 'no-store',
        credentials: 'include'
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) return;

      const incoming = payload.incomingChallenge || null;
      if (incoming && incoming.status === 'pending') {
        openIncomingModal(incoming);
      } else {
        closeIncomingModal();
      }

      const outgoing = payload.outgoingChallenge || null;
      if (!outgoing) {
        state.outgoingTerminalNoticeKey = '';
        return;
      }
      state.outgoingChallengeId = Number(outgoing.challengeId) || 0;
      if (outgoing.status === 'accepted' && outgoing.sessionId && !state.redirectedByChallenge) {
        state.redirectedByChallenge = true;
        window.location.href = `/speaking?session=${encodeURIComponent(outgoing.sessionId)}`;
        return;
      }
      if (outgoing.status === 'rejected') {
        const noticeKey = `${state.outgoingChallengeId}:rejected`;
        if (state.outgoingTerminalNoticeKey !== noticeKey) {
          state.outgoingTerminalNoticeKey = noticeKey;
          setUsersStatus('Usuario recusou seu pedido.');
        }
      } else if (outgoing.status === 'expired') {
        const noticeKey = `${state.outgoingChallengeId}:expired`;
        if (state.outgoingTerminalNoticeKey !== noticeKey) {
          state.outgoingTerminalNoticeKey = noticeKey;
          setUsersStatus('Seu desafio expirou.');
        }
      } else if (outgoing.status === 'pending') {
        state.outgoingTerminalNoticeKey = '';
        const opponentName = outgoing?.opponent?.username || 'Usuario';
        setUsersStatus(`Aguardando resposta de ${opponentName}...`);
      }
    } catch (_error) {
      // ignore polling errors
    }
  }

  async function sendChallenge() {
    if (!state.challengeTarget || state.challengeBusy) return;
    state.challengeBusy = true;
    if (els.challengeActionBtn) els.challengeActionBtn.disabled = true;
    setChallengeStatus('Enviando desafio...');
    try {
      const response = await fetch(buildApiUrl('/api/speaking/challenges/send'), {
        method: 'POST',
        credentials: 'include',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          opponentUserId: state.challengeTarget.userId
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Nao foi possivel enviar o desafio.');
      }
      if (payload?.sessionId) {
        window.location.href = `/speaking?session=${encodeURIComponent(payload.sessionId)}`;
        return;
      }
      setChallengeStatus('Desafio enviado. Aguardando resposta...');
      closeChallengeModal();
      if (window.PlaytalkChallengePopups && typeof window.PlaytalkChallengePopups.forcePoll === 'function') {
        window.PlaytalkChallengePopups.forcePoll();
      } else {
        await pollChallenges();
      }
    } catch (error) {
      setChallengeStatus(error?.message || 'Nao foi possivel enviar o desafio.');
      if (els.challengeActionBtn) els.challengeActionBtn.disabled = false;
    } finally {
      state.challengeBusy = false;
    }
  }

  async function deleteUser() {
    if (!state.selectedUser || state.adminBusy) return;
    const confirmed = window.confirm(`Excluir ${state.selectedUser.username} e todos os dados dele?`);
    if (!confirmed) return;
    state.adminBusy = true;
    syncAdminButtons();
    setAdminStatus('Excluindo usuario...');
    try {
      const response = await fetch(buildApiUrl(`/api/admin/users/${state.selectedUser.userId}`), {
        method: 'DELETE',
        headers: buildAuthHeaders(),
        credentials: 'include'
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Erro ao excluir usuario.');
      }
      closeAdminModal();
      await loadUsers('Usuario excluido. Atualizando...', { metricKey: state.currentMetricKey, force: true });
    } catch (error) {
      setAdminStatus(error?.message || 'Erro ao excluir usuario.');
      state.adminBusy = false;
      syncAdminButtons();
    }
  }

  function startBackgroundLoops() {
    window.setInterval(() => {
      void pingPresence();
    }, PRESENCE_PING_MS);
    startBannerLinkedRankingLoop();
    if (!HAS_GLOBAL_CHALLENGE_POPUPS) {
      window.setInterval(() => {
        void pollChallenges();
      }, CHALLENGE_POLL_MS);
    }
  }

  (async () => {
    state.currentUser = await fetchSessionUser();
    syncAdminViewerUi();
    updateBotHint();
    await pingPresence();
    await syncRankingWithBanner(true);
    if (!HAS_GLOBAL_CHALLENGE_POPUPS) {
      await pollChallenges();
    }
    startBackgroundLoops();
  })();

  window.addEventListener('keydown', (event) => {
    if (!isAdminViewer()) return;
    if (event.defaultPrevented) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const target = event.target;
    const typing = target instanceof HTMLElement
      && (
        target.tagName === 'INPUT'
        || target.tagName === 'TEXTAREA'
        || target.tagName === 'SELECT'
        || target.isContentEditable
      );
    if (typing) return;
    if (String(event.key || '').toLowerCase() !== 'c') return;
    event.preventDefault();
    if (els.botModal?.classList.contains('is-visible')) {
      void createBot();
      return;
    }
    openBotModal();
  });

  els.closeAdminModalBtn?.addEventListener('click', closeAdminModal);
  els.botLaunchBtn?.addEventListener('click', openBotModal);
  els.botCloseBtn?.addEventListener('click', closeBotModal);
  els.botCloseTopBtn?.addEventListener('click', closeBotModal);
  els.botPhotoInput?.addEventListener('change', (event) => { void handleBotPhotoChange(event); });
  els.botCreateBtn?.addEventListener('click', () => { void createBot(); });
  els.botForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    void createBot();
  });
  els.botSpeedInput?.addEventListener('input', updateBotHint);
  els.botModal?.addEventListener('click', (event) => {
    if (event.target === els.botModal) closeBotModal();
  });
  els.deleteUserBtn?.addEventListener('click', () => { void deleteUser(); });
  els.closeAdminModalTopBtn?.addEventListener('click', closeAdminModal);
  els.challengeActionBtn?.addEventListener('click', () => { void sendChallenge(); });
  els.challengeCloseBtn?.addEventListener('click', closeChallengeModal);
  els.incomingAcceptBtn?.addEventListener('click', () => { void respondIncomingChallenge('accept'); });
  els.incomingRejectBtn?.addEventListener('click', () => { void respondIncomingChallenge('reject'); });
})();
