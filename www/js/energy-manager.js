(function initPlaytalkEnergyManager() {
  const DAILY_FREE_ENERGY = 5000;
  const ENERGY_EXHAUSTED_STATUS = 402;

  function safeNumber(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  }

  function isPremiumActive(user) {
    if (!user || typeof user !== 'object') return false;
    if (Boolean(user.premiumFullAccess || user.premium_full_access)) return true;
    const premiumUntilMs = Date.parse(user.premiumUntil || user.premium_until || '');
    return Number.isFinite(premiumUntilMs) && premiumUntilMs > Date.now();
  }

  function formatResetCountdown(nextResetAt) {
    const targetMs = Date.parse(nextResetAt || '');
    const diffMs = Math.max(0, (Number.isFinite(targetMs) ? targetMs : Date.now()) - Date.now());
    const totalMinutes = Math.ceil(diffMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}min`;
  }

  function resolveAccountHref() {
    if (window.PlaytalkNative && typeof window.PlaytalkNative.resolveRouteHref === 'function') {
      return window.PlaytalkNative.resolveRouteHref('/account');
    }
    return '/account';
  }

  async function fetchBooksStats() {
    if (!window.PlaytalkApi || typeof window.PlaytalkApi.buildApiUrl !== 'function') {
      return null;
    }
    try {
      const response = await fetch(window.PlaytalkApi.buildApiUrl('/api/books/stats'), {
        headers: typeof window.PlaytalkApi.buildAuthHeaders === 'function'
          ? window.PlaytalkApi.buildAuthHeaders()
          : {},
        cache: 'no-store',
        credentials: 'include'
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) return null;
      return payload.stats || null;
    } catch (_error) {
      return null;
    }
  }

  function buildEnergyStatus({ user, stats } = {}) {
    const premium = isPremiumActive(user) || Boolean(stats?.unlimited);
    const nextResetAt = String(stats?.nextEnergyResetAt || '').trim();
    const remaining = premium
      ? Number.POSITIVE_INFINITY
      : Math.max(0, Math.round(safeNumber(stats?.remainingEnergy)));
    const usedToday = premium ? 0 : Math.max(0, Math.round(safeNumber(stats?.dailyEnergyUsed)));
    return {
      loggedIn: Boolean(user?.id),
      premium,
      unlimited: premium,
      remaining,
      usedToday,
      blocked: !premium && remaining <= 0,
      nextResetAt: nextResetAt || null,
      countdownText: nextResetAt ? formatResetCountdown(nextResetAt) : '0h 0min',
      message: premium
        ? 'Energia infinita'
        : remaining <= 0
          ? `Mais energia em ${nextResetAt ? formatResetCountdown(nextResetAt) : '0h 0min'}`
          : `${remaining} energias restantes`,
      dailyEnergyLimit: Math.max(0, Math.round(safeNumber(stats?.dailyEnergyLimit))) || DAILY_FREE_ENERGY
    };
  }

  async function getEnergyStatus(options = {}) {
    const user = options.user && typeof options.user === 'object' ? options.user : null;
    const stats = options.stats && typeof options.stats === 'object'
      ? options.stats
      : await fetchBooksStats();
    return buildEnergyStatus({ user, stats });
  }

  async function guardEnergy(options = {}) {
    const status = await getEnergyStatus(options);
    if (status.loggedIn && status.blocked) {
      window.location.href = resolveAccountHref();
      return { allowed: false, status };
    }
    return { allowed: true, status };
  }

  function isEnergyErrorPayload(payload, statusCode) {
    return Number(statusCode) === ENERGY_EXHAUSTED_STATUS || Boolean(payload?.energy);
  }

  window.PlaytalkEnergy = {
    DAILY_FREE_ENERGY,
    ENERGY_EXHAUSTED_STATUS,
    buildEnergyStatus,
    fetchBooksStats,
    formatResetCountdown,
    getEnergyStatus,
    guardEnergy,
    isEnergyErrorPayload,
    isPremiumActive,
    resolveAccountHref
  };
})();
