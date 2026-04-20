(function initPlaytalkUsersPage() {
  const GUEST_ID_KEY = 'playtalk_guest_rank_id';
  const GUEST_PROGRESS_KEY = 'playtalk-flashcards-progress-v3';
  const GUEST_OWNED_KEY = 'playtalk-flashcards-owned-v2';
  const USER_HIDDEN_STORAGE_KEY = 'playtalk-flashcards-hidden-v1';
  const USER_STATS_STORAGE_KEY = 'playtalk-flashcards-stats-v1';
  const PRESENCE_PING_MS = 15000;
  const CHALLENGE_POLL_MS = 2500;
  const HAS_GLOBAL_CHALLENGE_POPUPS = Boolean(window.PlaytalkChallengePopups);
  const RANKING_CACHE_TTL_MS = 25000;
  const USERS_STAGE_SLIDE_MS = 320;
  const RANKING_ROTATE_MS = 3200;

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
    premiumUserBtn: document.getElementById('premiumUserBtn'),
    deleteUserBtn: document.getElementById('deleteUserBtn'),
    closeAdminModalBtn: document.getElementById('closeAdminModalBtn'),
    closeAdminModalTopBtn: document.getElementById('closeAdminModalTopBtn'),
    challengeModal: document.getElementById('usersChallengeModal'),
    challengeAvatar: document.getElementById('usersChallengeAvatar'),
    challengeName: document.getElementById('usersChallengeName'),
    challengeCopy: document.getElementById('usersChallengeCopy'),
    challengeActionBtn: document.getElementById('usersChallengeActionBtn'),
    challengeSmartbooksBtn: document.getElementById('usersChallengeSmartbooksBtn'),
    challengeCardsBtn: document.getElementById('usersChallengeCardsBtn'),
    challengeCloseBtn: document.getElementById('usersChallengeCloseBtn'),
    challengeCloseTopBtn: document.getElementById('usersChallengeCloseTopBtn'),
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
    challengeModePickerOpen: false,
    outgoingChallengeId: 0,
    outgoingTerminalNoticeKey: '',
    incomingChallengeId: 0,
    redirectedByChallenge: false,
    currentMetricKey: 'flashcards',
    currentMetricLabel: 'Flashcards',
    currentMetricValueLabel: '',
    loadRequestId: 0,
    rankingCache: new Map(),
    preloadInFlight: new Map(),
    stageAnimating: false,
    metricRotationTimer: 0,
    metricRotationIndex: 0,
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

  function resolveRouteHref(target, options = {}) {
    if (window.PlaytalkNative && typeof window.PlaytalkNative.resolveRouteHref === 'function') {
      return window.PlaytalkNative.resolveRouteHref(target, options);
    }
    if (typeof options.search === 'string' && options.search) {
      const safeTarget = safeText(target) || '/users';
      return `${safeTarget}${options.search}`;
    }
    return target;
  }

  function navigateToSpeakingSession(sessionId, options = {}) {
    const normalizedSessionId = safeText(sessionId);
    if (!normalizedSessionId) return;
    const nextHref = resolveRouteHref('/speaking', {
      ...options,
      search: `?session=${encodeURIComponent(normalizedSessionId)}`
    });
    window.location.href = nextHref;
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

  function isNativeRuntime() {
    try {
      if (window.PlaytalkNative && typeof window.PlaytalkNative.isNativeRuntime === 'function') {
        return Boolean(window.PlaytalkNative.isNativeRuntime());
      }
    } catch (_error) {
      // ignore
    }

    const protocol = String(window.location?.protocol || '').toLowerCase();
    const hostname = String(window.location?.hostname || '').toLowerCase();
    const port = String(window.location?.port || '').trim();
    return protocol === 'file:' || ((hostname === 'localhost' || hostname === '127.0.0.1') && !port);
  }

  function setUsersStatus(message) {
    if (!els.usersStatus) return;
    els.usersStatus.textContent = message || '';
  }

  function setRankingLabel(label) {
    if (!els.rankingLabel) return;
    const text = safeText(label) || 'Flashcards';
    els.rankingLabel.innerHTML = `<span class="ranking-label__text">${escapeHtml(text)}</span>`;
    els.rankingLabel.style.opacity = '1';
    els.rankingLabel.style.visibility = 'visible';
  }

  function metricByKey(metricKey) {
    return RANKING_METRICS.find((metric) => metric.key === metricKey) || RANKING_METRICS[0];
  }

  function wait(ms) {
    return new Promise((resolve) => {
      window.setTimeout(resolve, Math.max(0, Number(ms) || 0));
    });
  }

  function storageKeyForUser(baseKey, userId) {
    const normalizedUserId = Number(userId) || 0;
    return normalizedUserId ? `${baseKey}:${normalizedUserId}` : baseKey;
  }

  function readStoredJson(key, fallbackValue) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || 'null');
      return parsed == null ? fallbackValue : parsed;
    } catch (_error) {
      return fallbackValue;
    }
  }

  function readLocalProgressForUser(userId) {
    const records = readStoredJson(storageKeyForUser(GUEST_PROGRESS_KEY, userId), []);
    if (!Array.isArray(records)) return [];
    return records.filter((record) => safeText(record?.cardId));
  }

  function readLocalHiddenCardIdsForUser(userId) {
    const ids = readStoredJson(storageKeyForUser(USER_HIDDEN_STORAGE_KEY, userId), []);
    if (!Array.isArray(ids)) return [];
    return ids.map((cardId) => safeText(cardId)).filter(Boolean);
  }

  function readLocalStatsForUser(userId) {
    const stats = readStoredJson(storageKeyForUser(USER_STATS_STORAGE_KEY, userId), {});
    return stats && typeof stats === 'object' ? stats : {};
  }

  async function bootstrapViewerFlashcardsFromLocal() {
    const userId = Number(state.currentUser?.id) || 0;
    if (!userId) return false;

    const localProgress = readLocalProgressForUser(userId);
    if (!localProgress.length) return false;

    try {
      const stateResponse = await fetch(buildApiUrl('/api/flashcards/state'), {
        headers: buildAuthHeaders(),
        cache: 'no-store',
        credentials: 'include'
      });
      const statePayload = await stateResponse.json().catch(() => ({}));
      if (!stateResponse.ok || !statePayload?.success) {
        return false;
      }

      const serverProgressCount = Array.isArray(statePayload?.progress) ? statePayload.progress.length : 0;
      if (serverProgressCount >= localProgress.length) {
        return false;
      }

      const syncResponse = await fetch(buildApiUrl('/api/flashcards/state'), {
        method: 'PUT',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({
          progress: localProgress,
          stats: readLocalStatsForUser(userId),
          hiddenCardIds: readLocalHiddenCardIdsForUser(userId)
        })
      });
      const syncPayload = await syncResponse.json().catch(() => ({}));
      return Boolean(syncResponse.ok && syncPayload?.success);
    } catch (_error) {
      return false;
    }
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
      isAdmin: Boolean(user.is_admin),
      premiumFullAccess: Boolean(user.premium_full_access || user.premiumFullAccess),
      premiumUntil: user.premium_until || user.premiumUntil || null
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

  async function guardEnergyAndRedirect() {
    if (!window.PlaytalkEnergy || typeof window.PlaytalkEnergy.guardEnergy !== 'function') {
      return true;
    }
    const result = await window.PlaytalkEnergy.guardEnergy({
      user: state.currentUser
    });
    return Boolean(result?.allowed);
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
      const onlineText = user?.isOnline ? 'Usuario online agora.' : 'Usuario offline no momento.';
      const premiumText = user?.premiumActive ? 'Premium ativo.' : 'Free.';
      els.adminPanelCopy.textContent = `${onlineText} ${premiumText}`;
      els.adminBotGrid.innerHTML = '';
      els.adminBotGrid.setAttribute('hidden', '');
      return;
    }

    const infoItems = [
      ['Nome', safeText(botConfig.username || user.username || 'Bot') || 'Bot'],
      ['Flashcards iniciais', String(Math.max(0, Number(botConfig.flashcardsCount) || 0))],
      ['Pronuncia media', `${Math.max(0, Number(botConfig.pronunciationBase) || 0)}%`],
      ['Flashcards por hora', String(Math.max(0, Number(botConfig.flashcardsPerHour) || 0))],
      ['Tempo medio por frase', `${Math.max(0, Number(botConfig.responseSeconds) || 0)} s`]
    ];

    els.adminPanelTitle.textContent = 'Informacoes do bot';
    els.adminPanelCopy.textContent = 'Esses sao os dados que o admin preencheu ao criar esse bot.';
    els.adminBotGrid.innerHTML = infoItems.map(([label, value]) => `
      <article class="users-admin-bot-item">
        <span class="users-admin-bot-label">${escapeHtml(label)}</span>
        <span class="users-admin-bot-value">${escapeHtml(value)}</span>
      </article>
    `).join('');
    els.adminBotGrid.removeAttribute('hidden');
  }

  function syncAdminButtons() {
    const disabled = state.adminBusy || !state.selectedUser;
    [els.premiumUserBtn, els.deleteUserBtn].forEach((button) => {
      if (!button) return;
      button.disabled = disabled;
    });
    if (els.premiumUserBtn) {
      els.premiumUserBtn.textContent = state.selectedUser?.premiumActive
        ? 'Cancelar premium'
        : 'Atribuir premium';
    }
  }

  function syncModalOverlayState() {
    const open = Boolean(
      els.adminModal?.classList.contains('is-visible')
      || els.botModal?.classList.contains('is-visible')
      || els.challengeModal?.classList.contains('is-visible')
      || els.incomingModal?.classList.contains('is-visible')
    );
    document.body.classList.toggle('users-modal-open', open);
  }

  function openFullscreenModal(modal) {
    if (!modal) return;
    if (modal.parentElement !== document.body) {
      document.body.appendChild(modal);
    }
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    modal.classList.add('is-visible');
    syncModalOverlayState();
  }

  function closeFullscreenModal(modal) {
    if (!modal) return;
    modal.classList.remove('is-visible');
    modal.setAttribute('aria-hidden', 'true');
    modal.hidden = true;
    syncModalOverlayState();
  }

  function closeAdminModal() {
    state.selectedUser = null;
    state.adminBusy = false;
    closeFullscreenModal(els.adminModal);
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
    closeFullscreenModal(els.botModal);
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
    openFullscreenModal(els.botModal);
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
      const botLogin = payload?.botLogin && typeof payload.botLogin === 'object'
        ? {
            username: safeText(payload.botLogin.username),
            password: safeText(payload.botLogin.password)
          }
        : null;
      closeBotModal();
      await loadUsers('Bot criado. Atualizando ranking...', { metricKey: state.currentMetricKey, force: true });
      if (botLogin?.username && botLogin?.password) {
        setUsersStatus(`Bot ${username} criado. Login: ${botLogin.username} | senha: ${botLogin.password}`);
      }
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
    openFullscreenModal(els.adminModal);
    setAdminStatus('');
    syncAdminButtons();
  }

  function setChallengeStatus(message) {
    if (!els.challengeStatus) return;
    els.challengeStatus.textContent = message || '';
  }

  function syncChallengeButtons() {
    const canChallenge = Boolean(
      state.challengeTarget
      && (state.challengeTarget.isBot || state.challengeTarget.isOnline)
      && !state.challengeBusy
    );
    if (els.challengeActionBtn) {
      els.challengeActionBtn.hidden = state.challengeModePickerOpen;
      els.challengeActionBtn.disabled = !canChallenge;
    }
    if (els.challengeSmartbooksBtn) {
      els.challengeSmartbooksBtn.hidden = !state.challengeModePickerOpen;
      els.challengeSmartbooksBtn.disabled = !canChallenge;
    }
    if (els.challengeCardsBtn) {
      els.challengeCardsBtn.hidden = !state.challengeModePickerOpen;
      els.challengeCardsBtn.disabled = !canChallenge;
    }
  }

  function closeChallengeModal() {
    closeFullscreenModal(els.challengeModal);
    state.challengeTarget = null;
    state.challengeBusy = false;
    state.challengeModePickerOpen = false;
    setChallengeStatus('');
    syncChallengeButtons();
  }

  function openChallengeModal(user) {
    if (!user || !state.currentUser?.id || user.userId === state.currentUser.id) return;
    state.challengeTarget = user;
    state.challengeBusy = false;
    state.challengeModePickerOpen = false;
    if (els.challengeAvatar) {
      els.challengeAvatar.src = user.avatarImage || '/Avatar/avatar-man-person-svgrepo-com.svg';
    }
    if (els.challengeName) els.challengeName.textContent = user.username;
    if (els.challengeCopy) {
      els.challengeCopy.textContent = user.isBot
        ? 'Bot aceita na hora e o duelo abre direto no speaking.'
        : user.isOnline
          ? 'Usuario online agora. Clique em desafiar e escolha SmartBooks ou FluentCards.'
          : 'Usuario offline no momento. Quando ele ficar online voce consegue desafiar.';
    }
    syncChallengeButtons();
    setChallengeStatus('');
    openFullscreenModal(els.challengeModal);
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
      rowEl.addEventListener('click', async () => {
        const userId = Number(rowEl.getAttribute('data-user-id')) || 0;
        const user = state.rows.find((entry) => entry.userId === userId);
        if (!user || user.userId === state.currentUser?.id) return;
        if (isAdminViewer()) {
          openAdminModal(user);
          return;
        }
        if (!(await guardEnergyAndRedirect())) return;
        openChallengeModal(user);
      });
    });
  }

  function stopRankingRotation() {
    if (!state.metricRotationTimer) return;
    window.clearInterval(state.metricRotationTimer);
    state.metricRotationTimer = 0;
  }

  async function rotateToNextMetric() {
    if (state.stageAnimating) return;
    const currentIndex = RANKING_METRICS.findIndex((metric) => metric.key === state.currentMetricKey);
    const safeIndex = currentIndex >= 0 ? currentIndex : state.metricRotationIndex;
    const nextIndex = (safeIndex + 1) % RANKING_METRICS.length;
    state.metricRotationIndex = nextIndex;
    const nextMetric = RANKING_METRICS[nextIndex] || RANKING_METRICS[0];
    await loadUsers('', { metricKey: nextMetric.key, animate: true });
  }

  function startRankingRotation() {
    stopRankingRotation();
    if (RANKING_METRICS.length <= 1) return;
    state.metricRotationTimer = window.setInterval(() => {
      void rotateToNextMetric();
    }, RANKING_ROTATE_MS);
  }

  async function fetchSessionUser() {
    if (window.PlaytalkApi && typeof window.PlaytalkApi.fetchSessionUser === 'function') {
      const user = await window.PlaytalkApi.fetchSessionUser({
        attempts: 3,
        retryDelayMs: 450
      });
      return normalizeUser(user);
    }
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
    state.metricRotationIndex = Math.max(0, RANKING_METRICS.findIndex((metric) => metric.key === data.metricKey));
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
    closeFullscreenModal(els.incomingModal);
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
      const challengeMode = safeText(challenge?.challengeMode);
      const challengeLabel = challengeMode === 'battle-cards' ? 'FluentCards' : 'Smart Books';
      els.incomingCopy.textContent = `${username} te desafiou para ${challengeLabel}`;
    }
    openFullscreenModal(els.incomingModal);
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
        navigateToSpeakingSession(payload.sessionId);
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
        navigateToSpeakingSession(outgoing.sessionId);
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
        const label = safeText(outgoing?.challengeMode) === 'battle-cards' ? 'FluentCards' : 'Smart Books';
        setUsersStatus(`Aguardando resposta de ${opponentName} em ${label}...`);
      }
    } catch (_error) {
      // ignore polling errors
    }
  }

  async function sendChallenge(mode) {
    if (!state.challengeTarget || state.challengeBusy) return;
    if (!(await guardEnergyAndRedirect())) return;
    state.challengeBusy = true;
    syncChallengeButtons();
    const normalizedMode = mode === 'battle-cards' ? 'battle-cards' : 'smartbooks';
    setChallengeStatus(`Enviando desafio ${normalizedMode === 'battle-cards' ? 'FluentCards' : 'Smart Books'}...`);
    try {
      const response = await fetch(buildApiUrl('/api/speaking/challenges/send'), {
        method: 'POST',
        credentials: 'include',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          opponentUserId: state.challengeTarget.userId,
          mode: normalizedMode
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Nao foi possivel enviar o desafio.');
      }
      if (payload?.sessionId) {
        navigateToSpeakingSession(payload.sessionId);
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
      syncChallengeButtons();
    } finally {
      state.challengeBusy = false;
      syncChallengeButtons();
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

  async function toggleSelectedUserPremium() {
    if (!state.selectedUser || state.adminBusy) return;
    state.adminBusy = true;
    syncAdminButtons();
    const shouldCancel = Boolean(state.selectedUser.premiumActive);
    setAdminStatus(shouldCancel ? 'Cancelando premium...' : 'Atribuindo premium...');
    try {
      const response = await fetch(buildApiUrl(`/api/admin/users/${state.selectedUser.userId}/premium`), {
        method: 'POST',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({ action: shouldCancel ? 'cancel' : 'grant' })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Nao foi possivel atualizar premium.');
      }
      state.selectedUser = {
        ...state.selectedUser,
        premiumActive: Boolean(payload?.premium?.fullAccess ?? !shouldCancel),
        premiumUntil: payload?.user?.premium_until || payload?.user?.premiumUntil || null
      };
      renderAdminBotInfo(state.selectedUser);
      setAdminStatus(payload?.message || (shouldCancel ? 'Premium cancelado.' : 'Premium atribuido.'));
      syncAdminButtons();
      await loadUsers('', { metricKey: state.currentMetricKey, force: true });
    } catch (error) {
      setAdminStatus(error?.message || 'Nao foi possivel atualizar premium.');
    } finally {
      state.adminBusy = false;
      syncAdminButtons();
    }
  }

  function startBackgroundLoops() {
    window.setInterval(() => {
      void pingPresence();
    }, PRESENCE_PING_MS);
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
    if (await bootstrapViewerFlashcardsFromLocal()) {
      state.rankingCache.clear();
    }
    await loadUsers('', { metricKey: 'flashcards', force: true, animate: false });
    RANKING_METRICS.forEach((metric) => {
      if (metric.key !== 'flashcards') {
        void preloadMetric(metric.key);
      }
    });
    if (!HAS_GLOBAL_CHALLENGE_POPUPS) {
      await pollChallenges();
    }
    startBackgroundLoops();
    startRankingRotation();
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
  els.challengeModal?.addEventListener('click', (event) => {
    if (event.target === els.challengeModal) closeChallengeModal();
  });
  els.premiumUserBtn?.addEventListener('click', () => { void toggleSelectedUserPremium(); });
  els.deleteUserBtn?.addEventListener('click', () => { void deleteUser(); });
  els.closeAdminModalTopBtn?.addEventListener('click', closeAdminModal);
  els.challengeActionBtn?.addEventListener('click', () => {
    state.challengeModePickerOpen = true;
    syncChallengeButtons();
    setChallengeStatus('Escolha o tipo de desafio.');
  });
  els.challengeSmartbooksBtn?.addEventListener('click', () => { void sendChallenge('smartbooks'); });
  els.challengeCardsBtn?.addEventListener('click', () => { void sendChallenge('battle-cards'); });
  els.challengeCloseTopBtn?.addEventListener('click', closeChallengeModal);
  els.challengeCloseBtn?.addEventListener('click', closeChallengeModal);
  els.incomingAcceptBtn?.addEventListener('click', () => { void respondIncomingChallenge('accept'); });
  els.incomingRejectBtn?.addEventListener('click', () => { void respondIncomingChallenge('reject'); });
})();
