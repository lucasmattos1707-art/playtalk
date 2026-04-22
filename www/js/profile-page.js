(function () {
  const GAME_STATS_STORAGE_KEY = 'playtalk-game-stats-v1';
  const LIVE_STATS_STORAGE_KEY = 'playtalk-game-stats-live-v1';
  const PROGRESS_STORAGE_KEY = 'vocabulary-progress';
  const COMPLETION_STORAGE_KEY = 'vocabulary-last-complete';
  const STICKY_PERCENT_STORAGE_KEY = 'playtalk-home-journey-percent-sticky-v1';
  const DAY_MS = 24 * 60 * 60 * 1000;
  const RING_CIRC = 326.73;
  const DEFAULT_PROFILE_AVATAR = '/Avatar/profile-neon-blue.svg';
  const ICONS = {
    pronunciation: 'SVG/codex-icons/post-results/pronuncia.svg',
    tempo: 'SVG/codex-icons/post-results/clock.svg',
    constancy: 'SVG/codex-icons/star.svg'
  };
  const LEVEL_BADGES = [
    { min: 1, max: 5, tier: 'Nivel 1', name: 'Iniciante', icon: 'selos/1iniciante.svg', gradient: 'linear-gradient(135deg, #d8ffb0 0%, #89e46a 100%)', text: '#ffffff' },
    { min: 6, max: 10, tier: 'Nivel 2', name: 'Aprendiz', icon: 'selos/2aprendiz.svg', gradient: 'linear-gradient(135deg, #d9f4ff 0%, #74c7ff 100%)', text: '#ffffff' },
    { min: 11, max: 20, tier: 'Nivel 3', name: 'Estudante', icon: 'selos/3estudante.svg', gradient: 'linear-gradient(135deg, #7fd2ff 0%, #58e1cf 100%)', text: '#ffffff' },
    { min: 21, max: 40, tier: 'Nivel 4', name: 'Explorador', icon: 'selos/4explorador.svg', gradient: 'linear-gradient(135deg, #64f5ea 0%, #1fc7c0 100%)', text: '#ffffff' },
    { min: 41, max: 60, tier: 'Nivel 5', name: 'Comunicador', icon: 'selos/5estudante.svg', gradient: 'linear-gradient(135deg, #4ba8ff 0%, #12347f 100%)', text: '#ffffff' },
    { min: 61, max: 80, tier: 'Nivel 6', name: 'Conversador', icon: 'selos/6comunicador.svg', gradient: 'linear-gradient(135deg, #14357f 0%, #6c173e 100%)', text: '#ffffff' },
    { min: 81, max: 100, tier: 'Nivel 7', name: 'Independente', icon: 'selos/7conversador.svg', gradient: 'linear-gradient(135deg, #7a27d6 0%, #080808 100%)', text: '#ffffff' },
    { min: 101, max: 130, tier: 'Nivel 8', name: 'Avancado', icon: 'selos/8independente.svg.svg', gradient: 'linear-gradient(135deg, #ff5fd1 0%, #ce1ba9 100%)', text: '#ffffff' },
    { min: 131, max: 160, tier: 'Nivel 9', name: 'Especialista', icon: 'selos/9avançado.svg', gradient: 'linear-gradient(135deg, #ff6666 0%, #d51111 100%)', text: '#ffffff' },
    { min: 161, max: 190, tier: 'Nivel 10', name: 'Fluente', icon: 'selos/10especialista.svg', gradient: 'linear-gradient(135deg, #ffbf63 0%, #ff7e16 100%)', text: '#ffffff' },
    { min: 191, max: 220, tier: 'Nivel 11', name: 'Mestre', icon: 'selos/11mestre.svg', gradient: 'linear-gradient(135deg, #f4de72 0%, #cf980d 100%)', text: '#ffffff' },
    { min: 221, max: 9999, tier: 'Nivel 12', name: 'Nativo', icon: 'selos/12nativo.svg', gradient: 'linear-gradient(135deg, #fdfdfd 0%, #e8f8ff 48%, #ffffff 100%)', text: '#ffffff' }
  ];

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : fallback;
    } catch (_error) {
      return fallback;
    }
  }

  function clampPercent(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0;
    return Math.max(0, Math.min(100, Math.round(numeric)));
  }

  function avgPercent(sum, count) {
    if (!count) return null;
    return clampPercent(sum / count);
  }

  function ringOffset(percent) {
    const clamped = clampPercent(percent);
    return RING_CIRC * (1 - clamped / 100);
  }

  function mergeMetric(baseValue, liveValue) {
    return {
      sum: (Number(baseValue?.sum) || 0) + (Number(liveValue?.sum) || 0),
      count: (Number(baseValue?.count) || 0) + (Number(liveValue?.count) || 0)
    };
  }

  function readGameStats() {
    const raw = readJson(GAME_STATS_STORAGE_KEY, {});
    const persisted = {
      speakingsTotal: Number(raw.speakingsTotal) || 0,
      listeningsTotal: Number(raw.listeningsTotal) || 0,
      pronunciationSum: Number(raw.pronunciationSum) || 0,
      pronunciationCount: Number(raw.pronunciationCount) || 0,
      typingPercentSum: Number(raw.typingPercentSum) || 0,
      typingPercentCount: Number(raw.typingPercentCount) || 0,
      timePlayedMsTotal: Number(raw.timePlayedMsTotal) || 0,
      timeExpectedMsTotal: Number(raw.timeExpectedMsTotal) || 0,
      coinsEarnedTotal: Number(raw.coinsEarnedTotal) || 0,
      progressPercentSum: Number(raw.progressPercentSum) || 0,
      progressPercentCount: Number(raw.progressPercentCount) || 0,
      aspectMetrics: {
        pronunciation: {
          sum: Number(raw.aspectMetrics?.pronunciation?.sum) || 0,
          count: Number(raw.aspectMetrics?.pronunciation?.count) || 0
        },
        tempo: {
          sum: Number(raw.aspectMetrics?.tempo?.sum) || 0,
          count: Number(raw.aspectMetrics?.tempo?.count) || 0
        }
      }
    };

    const live = readJson(LIVE_STATS_STORAGE_KEY, null);
    if (!live || typeof live !== 'object') {
      return persisted;
    }

    return {
      ...persisted,
      speakingsTotal: persisted.speakingsTotal + (Number(live.speakingsTotal) || 0),
      listeningsTotal: persisted.listeningsTotal + (Number(live.listeningsTotal) || 0),
      pronunciationSum: persisted.pronunciationSum + (Number(live.pronunciationSum) || 0),
      pronunciationCount: persisted.pronunciationCount + (Number(live.pronunciationCount) || 0),
      typingPercentSum: persisted.typingPercentSum + (Number(live.typingPercentSum) || 0),
      typingPercentCount: persisted.typingPercentCount + (Number(live.typingPercentCount) || 0),
      timePlayedMsTotal: persisted.timePlayedMsTotal + (Number(live.timePlayedMsTotal) || 0),
      timeExpectedMsTotal: persisted.timeExpectedMsTotal + (Number(live.timeExpectedMsTotal) || 0),
      coinsEarnedTotal: persisted.coinsEarnedTotal + (Number(live.coinsEarnedTotal) || 0),
      progressPercentSum: persisted.progressPercentSum + (Number(live.progressPercentSum) || 0),
      progressPercentCount: persisted.progressPercentCount + (Number(live.progressPercentCount) || 0),
      aspectMetrics: {
        pronunciation: mergeMetric(persisted.aspectMetrics?.pronunciation, live.aspectMetrics?.pronunciation),
        tempo: mergeMetric(persisted.aspectMetrics?.tempo, live.aspectMetrics?.tempo)
      }
    };
  }

  function readJourneyPercentForConstancy() {
    const progress = readJson(PROGRESS_STORAGE_KEY, {});
    const completion = readJson(COMPLETION_STORAGE_KEY, {});

    const totalSteps = Number(progress.journeyTotalSteps);
    const completedSteps = Number(progress.journeyCompletedSteps);

    let percent = 0;
    if (Number.isFinite(totalSteps) && totalSteps > 0 && Number.isFinite(completedSteps)) {
      percent = clampPercent((completedSteps / totalSteps) * 100);
    }

    if (Number.isFinite(Number(completion.completedLevel)) && Number(completion.completedLevel) > 0) {
      percent = 100;
    }

    const stickyPercent = Number(localStorage.getItem(STICKY_PERCENT_STORAGE_KEY));
    if (Number.isFinite(stickyPercent) && stickyPercent > percent) {
      percent = clampPercent(stickyPercent);
    }

    return percent;
  }

  function getPlatformDays(state) {
    const createdAt = Number(state?.createdAt);
    if (!Number.isFinite(createdAt) || createdAt <= 0) return 1;
    const elapsed = Math.max(0, Date.now() - createdAt);
    return Math.max(1, Math.floor(elapsed / DAY_MS) + 1);
  }

  function normalizeCoins(value) {
    const parsed = Number.parseFloat(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return 0;
    return Math.floor(parsed);
  }

  function getPlayerLevel(state) {
    return Math.max(1, Math.floor(normalizeCoins(state?.coins) / 1000) + 1);
  }

  function getLevelBadge(level) {
    return LEVEL_BADGES.find((badge) => level >= badge.min && level <= badge.max) || LEVEL_BADGES[LEVEL_BADGES.length - 1];
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function renderProfile() {
    const page = document.getElementById('profile-page');
    if (!page) return;

    const stateApi = window.playtalkPlayerState;
    const state = stateApi && typeof stateApi.get === 'function' ? stateApi.get() : {};
    const stats = readGameStats();

    const username = String(state?.username || '').trim() || 'Jogador';
    const avatar = String(state?.avatar || '').trim();
    const hasAvatar = Boolean(avatar) && avatar !== 'Avatar/avatar-boy-male-svgrepo-com.svg';
    const displayAvatar = hasAvatar ? avatar : DEFAULT_PROFILE_AVATAR;
    const levelNumber = getPlayerLevel(state);
    const levelBadge = getLevelBadge(levelNumber);

    const pronunciationPercent = avgPercent(stats.pronunciationSum, stats.pronunciationCount);
    const speedPercent = avgPercent(stats.aspectMetrics?.tempo?.sum, stats.aspectMetrics?.tempo?.count);
    const fallbackSpeed = stats.timePlayedMsTotal > 0
      ? clampPercent((stats.timePlayedMsTotal / Math.max(1, stats.timeExpectedMsTotal || stats.timePlayedMsTotal)) * 100)
      : null;
    const resolvedSpeed = speedPercent == null ? fallbackSpeed : speedPercent;

    const journeyPercent = readJourneyPercentForConstancy();
    const platformDays = getPlatformDays(state);
    const constancyPercent = clampPercent(journeyPercent / Math.max(1, platformDays));

    const aspects = [
      {
        value: pronunciationPercent == null ? '--' : `${pronunciationPercent}%`,
        icon: ICONS.pronunciation,
        alt: 'Pronuncia'
      },
      {
        value: resolvedSpeed == null ? '--' : `${resolvedSpeed}%`,
        icon: ICONS.tempo,
        alt: 'Velocidade'
      },
      {
        value: `${constancyPercent}%`,
        icon: ICONS.constancy,
        alt: 'Constancia'
      }
    ];

    page.classList.add('profile-dashboard');
    page.innerHTML = `
      <h1 class="profile-dashboard__name">${escapeHtml(username)}</h1>
      <div class="profile-dashboard__ring-photo-wrap">
        <svg class="profile-dashboard__ring profile-dashboard__ring--photo" viewBox="0 0 120 120" aria-hidden="true">
          <circle class="profile-dashboard__ring-track" cx="60" cy="60" r="52"></circle>
          <circle class="profile-dashboard__ring-progress" id="profile-ring-progress" cx="60" cy="60" r="52"></circle>
        </svg>
        <div class="profile-dashboard__photo">
          <img id="profile-photo-image" src="${escapeHtml(displayAvatar)}" alt="Foto do jogador">
          <span id="profile-photo-fallback"></span>
        </div>
      </div>
      <div id="selos-nivel" class="profile-level-badge" style="--level-badge-bg:${escapeHtml(levelBadge.gradient)};--level-badge-color:${escapeHtml(levelBadge.text)};">
        <img class="profile-level-badge__icon" src="${escapeHtml(levelBadge.icon)}" alt="">
        <span class="profile-level-badge__text">${escapeHtml(levelBadge.name)}</span>
      </div>
      <section class="profile-dashboard__aspects" aria-label="Aspectos do jogador">
        ${aspects.map((aspect) => `
          <article class="profile-dashboard__aspect" aria-label="${aspect.alt}">
            <img class="profile-dashboard__aspect-icon" src="${aspect.icon}" alt="${aspect.alt}">
            <strong>${aspect.value}</strong>
          </article>
        `).join('')}
      </section>
    `;

    const imageEl = document.getElementById('profile-photo-image');
    const fallbackEl = document.getElementById('profile-photo-fallback');
    if (imageEl) imageEl.style.display = 'block';
    if (fallbackEl) fallbackEl.style.display = 'none';

    const ringEl = document.getElementById('profile-ring-progress');
    if (ringEl) {
      ringEl.style.strokeDasharray = `${RING_CIRC}`;
      ringEl.style.strokeDashoffset = `${ringOffset(pronunciationPercent == null ? 0 : pronunciationPercent)}`;
    }
  }

  function init() {
    renderProfile();
    document.addEventListener('playtalk:player-state-change', renderProfile);
    document.addEventListener('playtalk:journey-progress', renderProfile);
    window.addEventListener('playtalk:journey-stats-update', renderProfile);
    window.addEventListener('storage', renderProfile);
    return () => {
      document.removeEventListener('playtalk:player-state-change', renderProfile);
      document.removeEventListener('playtalk:journey-progress', renderProfile);
      window.removeEventListener('playtalk:journey-stats-update', renderProfile);
      window.removeEventListener('storage', renderProfile);
    };
  }

  if (typeof window !== 'undefined' && typeof window.registerPlaytalkPage === 'function') {
    window.registerPlaytalkPage('page-profile', init);
    return;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();

