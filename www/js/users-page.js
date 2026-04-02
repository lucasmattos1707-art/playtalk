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

  const RANKING_METRICS = [
    { slot: 1, key: 'flashcards', label: 'Flashcards', valueLabel: '' },
    { slot: 2, key: 'pronunciation', label: 'Pronuncia', valueLabel: '%' },
    { slot: 3, key: 'speed', label: 'Velocidade', valueLabel: '/h' },
    { slot: 4, key: 'battle', label: 'Batalhas vencidas', valueLabel: '' }
  ];

  const els = {
    usersList: document.getElementById('usersList'),
    usersStatus: document.getElementById('usersStatus'),
    rankingLabel: document.getElementById('rankingLabel'),
    adminModal: document.getElementById('usersAdminModal'),
    adminTitle: document.getElementById('usersAdminTitle'),
    adminCopy: document.getElementById('usersAdminCopy'),
    adminStatus: document.getElementById('usersAdminStatus'),
    grant7Btn: document.getElementById('grant7Btn'),
    grant30Btn: document.getElementById('grant30Btn'),
    grant365Btn: document.getElementById('grant365Btn'),
    deleteUserBtn: document.getElementById('deleteUserBtn'),
    closeAdminModalBtn: document.getElementById('closeAdminModalBtn'),
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
    loadRequestId: 0
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

  function setAdminStatus(message) {
    if (!els.adminStatus) return;
    els.adminStatus.textContent = message || '';
  }

  function syncAdminButtons() {
    const disabled = state.adminBusy || !state.selectedUser;
    [els.grant7Btn, els.grant30Btn, els.grant365Btn, els.deleteUserBtn].forEach((button) => {
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

  function openAdminModal(user) {
    if (!isAdminViewer() || !user || user.userId === state.currentUser?.id) return;
    state.selectedUser = user;
    state.adminBusy = false;
    if (els.adminTitle) els.adminTitle.textContent = user.username;
    if (els.adminCopy) {
      els.adminCopy.textContent = `Rank ${user.rank || 0} | ${formatMetricValue(user, state.currentMetricKey, state.currentMetricValueLabel)} (${state.currentMetricLabel})`;
    }
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
      els.challengeCopy.textContent = user.isOnline
        ? 'Usuario online agora. Clique para enviar desafio speaking com 25 cartas.'
        : 'Usuario offline no momento. Quando ele ficar online voce consegue desafiar.';
    }
    if (els.challengeActionBtn) {
      els.challengeActionBtn.disabled = !user.isOnline;
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
    parts.push(entry.premiumActive ? 'Premium ativo' : 'Free');
    parts.push(entry.isOnline ? 'Online' : 'Offline');
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
        <div class="users-avatar">
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

  async function loadUsers(message, options = {}) {
    const metricKey = safeText(options.metricKey || state.currentMetricKey || 'flashcards') || 'flashcards';
    const force = Boolean(options.force);
    const requestId = state.loadRequestId + 1;
    state.loadRequestId = requestId;

    if (message) {
      setUsersStatus(message);
    } else if (force) {
      setUsersStatus('Atualizando ranking...');
    }

    try {
      const response = await fetch(buildApiUrl(`/api/users/flashcards?limit=50&metric=${encodeURIComponent(metricKey)}`), {
        headers: buildAuthHeaders(),
        cache: 'no-store',
        credentials: 'include'
      });
      const payload = await response.json().catch(() => ({}));
      if (requestId !== state.loadRequestId) return;
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Falha ao carregar usuarios.');
      }

      const selectedMetric = metricByKey(payload?.metric || metricKey);
      state.currentMetricKey = selectedMetric.key;
      state.currentMetricLabel = safeText(payload?.metricLabel || selectedMetric.label) || selectedMetric.label;
      state.currentMetricValueLabel = safeText(payload?.metricValueLabel || selectedMetric.valueLabel || '');
      setRankingLabel(state.currentMetricLabel);

      const users = normalizeUsers(payload);
      state.rows = users;
      state.viewer = normalizeViewer(payload.viewer);
      renderRows(users);
      const viewer = currentViewerEntry(users);
      setUsersStatus(viewer?.rank ? `Voce esta em ${viewer.rank} lugar` : 'Ranking carregado.');
    } catch (_error) {
      if (requestId !== state.loadRequestId) return;
      renderRows([]);
      state.rows = [];
      setUsersStatus('Nao consegui carregar o ranking agora.');
    }
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
    await loadUsers('', { metricKey: metric.key, force: true });
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

  async function grantPremium(durationDays) {
    if (!state.selectedUser || state.adminBusy) return;
    state.adminBusy = true;
    syncAdminButtons();
    setAdminStatus('Liberando premium...');
    try {
      const response = await fetch(buildApiUrl(`/api/admin/users/${state.selectedUser.userId}/premium`), {
        method: 'POST',
        credentials: 'include',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ durationDays })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Erro ao atribuir premium.');
      }
      setAdminStatus('Premium atualizado.');
      await loadUsers('Atualizando ranking...', { metricKey: state.currentMetricKey, force: true });
    } catch (error) {
      setAdminStatus(error?.message || 'Erro ao atribuir premium.');
    } finally {
      state.adminBusy = false;
      syncAdminButtons();
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
    await pingPresence();
    await syncRankingWithBanner(true);
    if (!HAS_GLOBAL_CHALLENGE_POPUPS) {
      await pollChallenges();
    }
    startBackgroundLoops();
  })();

  els.closeAdminModalBtn?.addEventListener('click', closeAdminModal);
  els.grant7Btn?.addEventListener('click', () => { void grantPremium(7); });
  els.grant30Btn?.addEventListener('click', () => { void grantPremium(30); });
  els.grant365Btn?.addEventListener('click', () => { void grantPremium(365); });
  els.deleteUserBtn?.addEventListener('click', () => { void deleteUser(); });
  els.challengeActionBtn?.addEventListener('click', () => { void sendChallenge(); });
  els.challengeCloseBtn?.addEventListener('click', closeChallengeModal);
  els.incomingAcceptBtn?.addEventListener('click', () => { void respondIncomingChallenge('accept'); });
  els.incomingRejectBtn?.addEventListener('click', () => { void respondIncomingChallenge('reject'); });
})();
