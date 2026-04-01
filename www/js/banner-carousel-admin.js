(function initPlaytalkBannerCarouselAdmin() {
  const carousels = Array.from(document.querySelectorAll('[data-banner-carousel]'));
  if (!carousels.length) return;

  const state = {
    isAdmin: false,
    busy: false,
    activeEditSlot: 0,
    defaultPrompt: '',
    banners: new Map()
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

  function toInteger(value, fallback) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return fallback;
    return parsed;
  }

  function slotElements(slot) {
    return carousels
      .map((carousel) => carousel.querySelector(`[data-banner-slot="${slot}"]`))
      .filter(Boolean);
  }

  function getBannerEntry(slot) {
    const existing = state.banners.get(slot);
    if (existing) return existing;
    const fallback = {
      slot,
      imageUrl: '',
      prompt: '',
      offsetX: 0,
      offsetY: 0,
      sizeAdjustPx: 0
    };
    state.banners.set(slot, fallback);
    return fallback;
  }

  function setCarouselStatus(message) {
    const text = typeof message === 'string' ? message : '';
    carousels.forEach((carousel) => {
      const status = carousel.querySelector('.banner-carousel__status');
      if (!status) return;
      status.textContent = text;
    });
  }

  function setSlotBusy(slot, isBusy) {
    slotElements(slot).forEach((item) => {
      item.classList.toggle('is-busy', Boolean(isBusy));
    });
  }

  function syncEditingClass() {
    const activeSlot = state.activeEditSlot;
    carousels.forEach((carousel) => {
      const items = carousel.querySelectorAll('[data-banner-slot]');
      items.forEach((item) => {
        const slot = toInteger(item.getAttribute('data-banner-slot'), 0);
        item.classList.toggle('is-editing', activeSlot > 0 && slot === activeSlot);
      });
    });
  }

  function applyBannerToDom(slot, entry) {
    slotElements(slot).forEach((item) => {
      const image = item.querySelector('.banner-carousel__media-image');
      if (!image) return;

      const imageUrl = typeof entry?.imageUrl === 'string' ? entry.imageUrl.trim() : '';
      if (imageUrl) {
        if (image.getAttribute('src') !== imageUrl) {
          image.setAttribute('src', imageUrl);
        }
        item.classList.add('has-image');
      } else {
        image.removeAttribute('src');
        item.classList.remove('has-image');
      }

      image.style.setProperty('--banner-offset-x', `${toInteger(entry?.offsetX, 0)}px`);
      image.style.setProperty('--banner-offset-y', `${toInteger(entry?.offsetY, 0)}px`);
      image.style.setProperty('--banner-size-adjust', `${toInteger(entry?.sizeAdjustPx, 0)}px`);
    });
  }

  async function fetchSessionUser() {
    const response = await fetch(buildApiUrl('/auth/session'), {
      headers: buildAuthHeaders(),
      credentials: 'include',
      cache: 'no-store'
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.success || !payload?.user) return null;
    return payload.user;
  }

  async function loadBannersFromApi() {
    const response = await fetch(buildApiUrl('/api/public/banners'), {
      credentials: 'include',
      headers: buildAuthHeaders(),
      cache: 'no-store'
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.success) {
      throw new Error(payload?.error || 'Falha ao carregar banners.');
    }

    state.defaultPrompt = typeof payload?.defaultPrompt === 'string'
      ? payload.defaultPrompt.trim()
      : '';

    const banners = Array.isArray(payload?.banners) ? payload.banners : [];
    for (const banner of banners) {
      const slot = toInteger(banner?.slot, 0);
      if (slot < 1) continue;
      const nextEntry = {
        slot,
        imageUrl: typeof banner?.imageUrl === 'string' ? banner.imageUrl.trim() : '',
        prompt: typeof banner?.prompt === 'string' ? banner.prompt.trim() : '',
        offsetX: toInteger(banner?.offsetX, 0),
        offsetY: toInteger(banner?.offsetY, 0),
        sizeAdjustPx: toInteger(banner?.sizeAdjustPx, 0)
      };
      state.banners.set(slot, nextEntry);
      applyBannerToDom(slot, nextEntry);
    }
  }

  async function generateBanner(slot, prompt) {
    state.busy = true;
    state.activeEditSlot = 0;
    syncEditingClass();
    setSlotBusy(slot, true);
    setCarouselStatus(`Gerando Banner ${slot}...`);
    try {
      const response = await fetch(buildApiUrl('/api/admin/banners/generate'), {
        method: 'POST',
        credentials: 'include',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          slot,
          prompt
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || payload?.details || 'Falha ao gerar banner.');
      }

      const current = getBannerEntry(slot);
      const nextEntry = {
        ...current,
        imageUrl: typeof payload?.dataUrl === 'string' ? payload.dataUrl : '',
        prompt: typeof payload?.promptUsed === 'string' ? payload.promptUsed : prompt
      };
      state.banners.set(slot, nextEntry);
      applyBannerToDom(slot, nextEntry);
      state.activeEditSlot = slot;
      syncEditingClass();
      setCarouselStatus(`Banner ${slot} pronto. Use +, -, setas e espaco para salvar.`);
    } catch (error) {
      setCarouselStatus(error?.message || 'Falha ao gerar banner.');
    } finally {
      state.busy = false;
      setSlotBusy(slot, false);
    }
  }

  async function saveActiveBanner() {
    const slot = state.activeEditSlot;
    if (!slot || state.busy) return;
    const entry = getBannerEntry(slot);
    if (!entry.imageUrl || !entry.imageUrl.startsWith('data:image/')) {
      setCarouselStatus('Gere uma imagem antes de salvar.');
      return;
    }

    state.busy = true;
    setSlotBusy(slot, true);
    setCarouselStatus(`Salvando Banner ${slot} no R2...`);
    try {
      const response = await fetch(buildApiUrl('/api/admin/banners/save'), {
        method: 'POST',
        credentials: 'include',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          slot,
          imageDataUrl: entry.imageUrl,
          prompt: entry.prompt || state.defaultPrompt,
          offsetX: toInteger(entry.offsetX, 0),
          offsetY: toInteger(entry.offsetY, 0),
          sizeAdjustPx: toInteger(entry.sizeAdjustPx, 0)
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success || !payload?.banner) {
        throw new Error(payload?.error || payload?.details || 'Falha ao salvar banner.');
      }

      const saved = payload.banner;
      const nextEntry = {
        slot,
        imageUrl: typeof saved?.imageUrl === 'string' ? saved.imageUrl.trim() : '',
        prompt: typeof saved?.prompt === 'string' ? saved.prompt.trim() : entry.prompt,
        offsetX: toInteger(saved?.offsetX, 0),
        offsetY: toInteger(saved?.offsetY, 0),
        sizeAdjustPx: toInteger(saved?.sizeAdjustPx, 0)
      };
      state.banners.set(slot, nextEntry);
      applyBannerToDom(slot, nextEntry);
      state.activeEditSlot = 0;
      syncEditingClass();
      setCarouselStatus(`Banner ${slot} salvo no R2.`);
    } catch (error) {
      setCarouselStatus(error?.message || 'Falha ao salvar banner.');
    } finally {
      state.busy = false;
      setSlotBusy(slot, false);
    }
  }

  function adjustActiveBanner(patch) {
    const slot = state.activeEditSlot;
    if (!slot || state.busy) return;
    const current = getBannerEntry(slot);
    const nextEntry = {
      ...current,
      offsetX: toInteger(current.offsetX, 0) + toInteger(patch.offsetX, 0),
      offsetY: toInteger(current.offsetY, 0) + toInteger(patch.offsetY, 0),
      sizeAdjustPx: toInteger(current.sizeAdjustPx, 0) + toInteger(patch.sizeAdjustPx, 0)
    };
    state.banners.set(slot, nextEntry);
    applyBannerToDom(slot, nextEntry);
  }

  function onBannerClick(slot) {
    if (!state.isAdmin || state.busy) return;
    const current = getBannerEntry(slot);
    const defaultPrompt = current.prompt || state.defaultPrompt;
    const typedPrompt = window.prompt(`Prompt do Banner ${slot}`, defaultPrompt);
    if (typedPrompt === null) return;
    const finalPrompt = typedPrompt.trim() || state.defaultPrompt || defaultPrompt;
    if (!finalPrompt) {
      setCarouselStatus('Digite um prompt valido para gerar o banner.');
      return;
    }
    void generateBanner(slot, finalPrompt);
  }

  function onWindowKeyDown(event) {
    if (!state.isAdmin || !state.activeEditSlot) return;
    if (event.target && (
      event.target.tagName === 'INPUT'
      || event.target.tagName === 'TEXTAREA'
      || event.target.isContentEditable
    )) {
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      adjustActiveBanner({ offsetX: -10 });
      return;
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      adjustActiveBanner({ offsetX: 10 });
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      adjustActiveBanner({ offsetY: -10 });
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      adjustActiveBanner({ offsetY: 10 });
      return;
    }

    if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      adjustActiveBanner({ sizeAdjustPx: 10 });
      return;
    }

    if (event.key === '-') {
      event.preventDefault();
      adjustActiveBanner({ sizeAdjustPx: -10 });
      return;
    }

    if (event.key === ' ') {
      event.preventDefault();
      void saveActiveBanner();
    }
  }

  function enableAdminUi() {
    document.body.classList.add('is-admin-banner');
    setCarouselStatus('Admin: clique no banner para gerar com IA.');
    carousels.forEach((carousel) => {
      const items = carousel.querySelectorAll('[data-banner-slot]');
      items.forEach((item) => {
        const slot = toInteger(item.getAttribute('data-banner-slot'), 0);
        if (!slot) return;
        item.addEventListener('click', () => onBannerClick(slot));
      });
    });
    window.addEventListener('keydown', onWindowKeyDown);
  }

  (async () => {
    try {
      await loadBannersFromApi();
    } catch (_error) {
      setCarouselStatus('Nao foi possivel carregar os banners.');
    }

    try {
      const sessionUser = await fetchSessionUser();
      const identity = String(sessionUser?.username || sessionUser?.email || '').trim().toLowerCase();
      state.isAdmin = Boolean(sessionUser?.is_admin) || identity === 'admin' || identity === 'adm' || identity === 'adminst';
      if (state.isAdmin) {
        enableAdminUi();
      }
    } catch (_error) {
      state.isAdmin = false;
    }
  })();
})();
