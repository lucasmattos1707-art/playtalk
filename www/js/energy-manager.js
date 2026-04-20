(function initPlaytalkEnergyManager() {
  const DAILY_FREE_ENERGY = 5000;
  const BASELINE_STORAGE_PREFIX = 'playtalk_daily_energy_baseline_v1';

  function safeNumber(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  }

  function pad2(value) {
    return String(Math.max(0, Math.floor(safeNumber(value)))).padStart(2, '0');
  }

  function getLocalDateKey(now = new Date()) {
    const date = now instanceof Date ? now : new Date(now);
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
  }

  function getNextResetDate(now = new Date()) {
    const date = now instanceof Date ? new Date(now.getTime()) : new Date(now);
    date.setHours(24, 0, 0, 0);
    return date;
  }

  function buildBaselineStorageKey(userId, dateKey) {
    return `${BASELINE_STORAGE_PREFIX}:${Math.max(0, Number(userId) || 0)}:${dateKey}`;
  }

  function readBaseline(userId, dateKey) {
    if (!userId || !window.localStorage) return null;
    try {
      const raw = window.localStorage.getItem(buildBaselineStorageKey(userId, dateKey));
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const baselineTotal = Math.max(0, Math.round(safeNumber(parsed?.baselineTotal)));
      return { baselineTotal };
    } catch (_error) {
      return null;
    }
  }

  function writeBaseline(userId, dateKey, baselineTotal) {
    if (!userId || !window.localStorage) return;
    try {
      window.localStorage.setItem(buildBaselineStorageKey(userId, dateKey), JSON.stringify({
        baselineTotal: Math.max(0, Math.round(safeNumber(baselineTotal))),
        updatedAt: new Date().toISOString()
      }));
    } catch (_error) {
      // ignore storage issues
    }
  }

  function sumEnergyStats(stats) {
    const source = stats && typeof stats === 'object' ? stats : {};
    const readingChars = Math.max(0, Math.round(safeNumber(source.readingChars)));
    const listeningChars = Math.max(0, Math.round(safeNumber(source.listeningChars)));
    const speakingChars = Math.max(0, Math.round(safeNumber(source.speakingChars)));
    return {
      readingChars,
      listeningChars,
      speakingChars,
      totalUsed: readingChars + listeningChars + speakingChars
    };
  }

  function isPremiumActive(user) {
    if (!user || typeof user !== 'object') return false;
    if (Boolean(user.premiumFullAccess || user.premium_full_access)) return true;
    const premiumUntilMs = Date.parse(user.premiumUntil || user.premium_until || '');
    return Number.isFinite(premiumUntilMs) && premiumUntilMs > Date.now();
  }

  function formatResetCountdown(now = new Date()) {
    const diffMs = Math.max(0, getNextResetDate(now).getTime() - (now instanceof Date ? now.getTime() : new Date(now).getTime()));
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

  function buildEnergyStatus({ user, stats, persistBaseline = true } = {}) {
    const userId = Math.max(0, Number(user?.id) || 0);
    const totals = sumEnergyStats(stats);
    const premium = isPremiumActive(user);
    const now = new Date();
    const nextResetAt = getNextResetDate(now);

    if (!userId) {
      return {
        loggedIn: false,
        premium: false,
        unlimited: false,
        totalUsed: totals.totalUsed,
        usedToday: 0,
        remaining: DAILY_FREE_ENERGY,
        blocked: false,
        nextResetAt,
        countdownText: formatResetCountdown(now),
        message: `${DAILY_FREE_ENERGY} energias restantes`
      };
    }

    if (premium) {
      return {
        loggedIn: true,
        premium: true,
        unlimited: true,
        totalUsed: totals.totalUsed,
        usedToday: 0,
        remaining: Number.POSITIVE_INFINITY,
        blocked: false,
        nextResetAt,
        countdownText: formatResetCountdown(now),
        message: 'Energia infinita'
      };
    }

    const dateKey = getLocalDateKey(now);
    const currentTotal = totals.totalUsed;
    const stored = readBaseline(userId, dateKey);
    let baselineTotal = Math.max(0, currentTotal);
    if (stored && Number.isFinite(stored.baselineTotal)) {
      baselineTotal = Math.max(0, Math.min(currentTotal, stored.baselineTotal));
    }
    if (persistBaseline) {
      writeBaseline(userId, dateKey, baselineTotal);
    }

    const usedToday = Math.max(0, currentTotal - baselineTotal);
    const remaining = Math.max(0, DAILY_FREE_ENERGY - usedToday);
    const blocked = remaining <= 0;
    return {
      loggedIn: true,
      premium: false,
      unlimited: false,
      totalUsed: currentTotal,
      usedToday,
      remaining,
      blocked,
      nextResetAt,
      countdownText: formatResetCountdown(now),
      message: blocked
        ? `Mais energia em ${formatResetCountdown(now)}`
        : `${remaining} energias restantes`
    };
  }

  async function getEnergyStatus(options = {}) {
    const user = options.user && typeof options.user === 'object' ? options.user : null;
    if (!user?.id) {
      return buildEnergyStatus({ user, stats: options.stats || null, persistBaseline: false });
    }
    const stats = options.stats && typeof options.stats === 'object'
      ? options.stats
      : await fetchBooksStats();
    return buildEnergyStatus({
      user,
      stats,
      persistBaseline: options.persistBaseline !== false
    });
  }

  async function guardEnergy(options = {}) {
    const status = await getEnergyStatus(options);
    if (status.loggedIn && status.blocked) {
      window.location.href = resolveAccountHref();
      return { allowed: false, status };
    }
    return { allowed: true, status };
  }

  window.PlaytalkEnergy = {
    DAILY_FREE_ENERGY,
    buildEnergyStatus,
    fetchBooksStats,
    formatResetCountdown,
    getEnergyStatus,
    guardEnergy,
    isPremiumActive,
    resolveAccountHref,
    sumEnergyStats
  };
})();
