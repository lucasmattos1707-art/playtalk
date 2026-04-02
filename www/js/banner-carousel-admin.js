(function initPlaytalkBannerCarouselAdmin() {
  const carousels = Array.from(document.querySelectorAll('[data-banner-carousel]'));
  if (!carousels.length) return;

  const state = {
    isAdmin: false,
    busy: false,
    activeEditSlot: 0,
    focusedSlot: 1,
    slotCount: 4,
    defaultPrompt: '',
    viewMode: 'desktop',
    banners: new Map(),
    controls: {
      root: null,
      modeBtn: null,
      prevBtn: null,
      nextBtn: null,
      saveBtn: null,
      uploadBtn: null,
      uploadInput: null,
      status: null
    }
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

  function getSlotCount() {
    return Math.max(1, toInteger(state.slotCount, 4));
  }

  function isMobileViewport() {
    return window.matchMedia('(max-width: 640px)').matches;
  }

  function normalizeVariant(value) {
    const normalized = String(value || '').trim().toLowerCase();
    return normalized === 'mobile' ? 'mobile' : 'desktop';
  }

  function resolveDisplayVariant() {
    if (state.isAdmin) return normalizeVariant(state.viewMode);
    return isMobileViewport() ? 'mobile' : 'desktop';
  }

  function applyBodyVariantClass() {
    const variant = resolveDisplayVariant();
    document.body.classList.toggle('banner-view-desktop', variant === 'desktop');
    document.body.classList.toggle('banner-view-mobile', variant === 'mobile');
  }

  function normalizeSlot(slot, fallback = 1) {
    const total = getSlotCount();
    const normalized = toInteger(slot, fallback);
    if (!Number.isFinite(normalized) || normalized < 1 || normalized > total) {
      return Math.max(1, Math.min(total, fallback));
    }
    return normalized;
  }

  function wrapSlot(slot) {
    const total = getSlotCount();
    const normalized = toInteger(slot, 1);
    return ((normalized - 1 + total) % total) + 1;
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
      desktop: { imageUrl: '', prompt: '', offsetX: 0, offsetY: 0, sizeAdjustPx: 0 },
      mobile: { imageUrl: '', prompt: '', offsetX: 0, offsetY: 0, sizeAdjustPx: 0 }
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
    if (state.controls.status) {
      state.controls.status.textContent = text;
    }
  }

  function setSlotBusy(slot, isBusy) {
    slotElements(slot).forEach((item) => {
      item.classList.toggle('is-busy', Boolean(isBusy));
    });
  }

  function syncEditingClass() {
    const activeSlot = normalizeSlot(state.activeEditSlot || state.focusedSlot || 1, 1);
    carousels.forEach((carousel) => {
      const items = carousel.querySelectorAll('[data-banner-slot]');
      items.forEach((item) => {
        const slot = toInteger(item.getAttribute('data-banner-slot'), 0);
        item.classList.toggle('is-editing', slot === activeSlot);
      });
    });
  }

  function entryForVariant(entry, variant) {
    return entry?.[variant] || {};
  }

  function applyBannerToDom(slot, entry) {
    const variant = resolveDisplayVariant();
    const selected = entryForVariant(entry, variant);
    slotElements(slot).forEach((item) => {
      const image = item.querySelector('.banner-carousel__media-image');
      if (!image) return;

      const imageUrl = typeof selected?.imageUrl === 'string' ? selected.imageUrl.trim() : '';
      if (imageUrl) {
        if (image.getAttribute('src') !== imageUrl) {
          image.setAttribute('src', imageUrl);
        }
        item.classList.add('has-image');
      } else {
        image.removeAttribute('src');
        item.classList.remove('has-image');
      }

      image.style.setProperty('--banner-offset-x', `${toInteger(selected?.offsetX, 0)}px`);
      image.style.setProperty('--banner-offset-y', `${toInteger(selected?.offsetY, 0)}px`);
      image.style.setProperty('--banner-size-adjust', `${toInteger(selected?.sizeAdjustPx, 0)}px`);
    });
  }

  function renderAllSlots() {
    state.banners.forEach((entry, slot) => {
      applyBannerToDom(slot, entry);
    });
  }

  function moveToSlot(slot) {
    const normalized = normalizeSlot(slot, 1);
    state.focusedSlot = normalized;
    state.activeEditSlot = normalized;

    carousels.forEach((carousel) => {
      carousel.classList.add('is-admin-paused');
      carousel.style.setProperty('--admin-focus-index', String(normalized - 1));
      const track = carousel.querySelector('.banner-carousel__track');
      if (!track) return;
      track.style.animation = 'none';
      track.style.transform = `translateX(-${(normalized - 1) * 25}%)`;
      track.style.transition = 'transform 220ms ease';
    });

    syncEditingClass();
  }

  function stepSlot(delta) {
    if (!state.isAdmin || state.busy) return;
    const target = wrapSlot((state.focusedSlot || 1) + delta);
    moveToSlot(target);
    setCarouselStatus(`Banner ${target} selecionado.`);
  }

  function modeIconMarkup(mode) {
    if (mode === 'mobile') {
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8 2a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8Zm3 17h2a1 1 0 1 1-2 0Z"/></svg>';
    }
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-5v2h3a1 1 0 1 1 0 2H8a1 1 0 1 1 0-2h3v-2H6a2 2 0 0 1-2-2V5Z"/></svg>';
  }

  function syncModeButtonUi() {
    if (!state.controls.modeBtn) return;
    const mode = normalizeVariant(state.viewMode);
    state.controls.modeBtn.innerHTML = modeIconMarkup(mode);
    state.controls.modeBtn.setAttribute('aria-label', mode === 'desktop' ? 'Modo desktop ativo' : 'Modo mobile ativo');
    state.controls.modeBtn.title = mode === 'desktop' ? 'Desktop' : 'Mobile';
    state.controls.modeBtn.dataset.mode = mode;
  }

  function setMode(mode) {
    state.viewMode = normalizeVariant(mode);
    applyBodyVariantClass();
    syncModeButtonUi();
    renderAllSlots();
    syncEditingClass();
    setCarouselStatus(`Modo ${state.viewMode === 'desktop' ? 'desktop' : 'mobile'} ativo.`);
  }

  function toggleMode() {
    if (!state.isAdmin || state.busy) return;
    setMode(state.viewMode === 'desktop' ? 'mobile' : 'desktop');
  }

  function syncControlsDisabled() {
    const disabled = !state.isAdmin || state.busy;
    [state.controls.modeBtn, state.controls.prevBtn, state.controls.nextBtn, state.controls.saveBtn, state.controls.uploadBtn].forEach((button) => {
      if (!button) return;
      button.disabled = disabled;
    });
  }

  function onUploadFileSelected(event) {
    const input = event?.target;
    const file = input?.files?.[0];
    if (!file) return;
    if (!/^image\//i.test(file.type || '')) {
      setCarouselStatus('Arquivo invalido. Envie uma imagem.');
      input.value = '';
      return;
    }

    const slot = normalizeSlot(state.focusedSlot || 1, 1);
    const variant = normalizeVariant(state.viewMode);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!dataUrl.startsWith('data:image/')) {
        setCarouselStatus('Nao consegui ler a imagem enviada.');
        input.value = '';
        return;
      }

      const current = getBannerEntry(slot);
      const nextEntry = {
        ...current,
        [variant]: {
          ...current[variant],
          imageUrl: dataUrl
        }
      };
      state.banners.set(slot, nextEntry);
      state.activeEditSlot = slot;
      applyBannerToDom(slot, nextEntry);
      syncEditingClass();
      setCarouselStatus(`Imagem carregada no Banner ${slot} (${variant}). Clique em aprovar para subir no R2.`);
      input.value = '';
    };
    reader.onerror = () => {
      setCarouselStatus('Falha ao carregar imagem do dispositivo.');
      input.value = '';
    };
    reader.readAsDataURL(file);
  }

  function buildFallbackControls() {
    const controls = document.createElement('section');
    controls.className = 'banner-admin-controls';
    controls.id = 'bannerAdminControls';
    controls.hidden = true;
    controls.setAttribute('aria-label', 'Controles dos banners do admin');
    controls.innerHTML = `
      <div class="banner-admin-controls__row">
        <button type="button" class="banner-admin-controls__btn" data-banner-action="mode" aria-label="Alternar desktop e mobile"></button>
        <button type="button" class="banner-admin-controls__btn" data-banner-action="next" aria-label="Proximo banner">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M14.3 5.3a1 1 0 0 1 1.4 1.4L10.41 12l5.3 5.3a1 1 0 0 1-1.42 1.4l-6-6a1 1 0 0 1 0-1.4l6-6Z"/></svg>
        </button>
        <button type="button" class="banner-admin-controls__btn" data-banner-action="previous" aria-label="Banner anterior">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M9.7 5.3a1 1 0 0 0-1.4 1.4L13.59 12l-5.3 5.3a1 1 0 1 0 1.42 1.4l6-6a1 1 0 0 0 0-1.4l-6-6Z"/></svg>
        </button>
        <button type="button" class="banner-admin-controls__btn" data-banner-action="approve" aria-label="Aprovar e salvar banner">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M9.55 16.2 5.8 12.45a1 1 0 1 0-1.4 1.42l4.46 4.45a1 1 0 0 0 1.41 0l9.33-9.32a1 1 0 1 0-1.41-1.42L9.55 16.2Z"/></svg>
        </button>
        <button type="button" class="banner-admin-controls__btn" data-banner-action="upload" aria-label="Enviar banner do dispositivo">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3a1 1 0 0 1 1 1v8.59l2.3-2.29a1 1 0 1 1 1.4 1.41l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 1.4-1.41L11 12.59V4a1 1 0 0 1 1-1Zm-7 14a1 1 0 0 1 1 1v1h12v-1a1 1 0 1 1 2 0v2a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1Z"/></svg>
        </button>
      </div>
      <input id="bannerAdminUploadInput" type="file" accept="image/*" hidden>
      <p class="banner-admin-controls__status" data-banner-admin-status aria-live="polite"></p>
    `;

    const reference = document.getElementById('usersStatus') || document.querySelector('.ranking-label');
    if (reference?.parentElement) {
      reference.insertAdjacentElement('afterend', controls);
    } else {
      const firstCarousel = carousels[0];
      firstCarousel?.insertAdjacentElement('afterend', controls);
    }
    return controls;
  }

  function setupControls() {
    const root = document.getElementById('bannerAdminControls') || buildFallbackControls();
    state.controls.root = root;
    state.controls.modeBtn = root.querySelector('[data-banner-action="mode"]');
    state.controls.prevBtn = root.querySelector('[data-banner-action="previous"]');
    state.controls.nextBtn = root.querySelector('[data-banner-action="next"]');
    state.controls.saveBtn = root.querySelector('[data-banner-action="approve"]');
    state.controls.uploadBtn = root.querySelector('[data-banner-action="upload"]');
    state.controls.uploadInput = root.querySelector('#bannerAdminUploadInput');
    state.controls.status = root.querySelector('[data-banner-admin-status]');

    state.controls.modeBtn?.addEventListener('click', toggleMode);
    state.controls.nextBtn?.addEventListener('click', () => stepSlot(1));
    state.controls.prevBtn?.addEventListener('click', () => stepSlot(-1));
    state.controls.saveBtn?.addEventListener('click', () => { void saveActiveBanner(); });
    state.controls.uploadBtn?.addEventListener('click', () => {
      if (!state.controls.uploadInput || state.busy) return;
      state.controls.uploadInput.click();
    });
    state.controls.uploadInput?.addEventListener('change', onUploadFileSelected);
    syncModeButtonUi();
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
    state.slotCount = Math.max(1, toInteger(payload?.slotCount, 4));

    const banners = Array.isArray(payload?.banners) ? payload.banners : [];
    for (const banner of banners) {
      const slot = toInteger(banner?.slot, 0);
      if (slot < 1) continue;

      const desktopImage = typeof banner?.imageUrlDesktop === 'string'
        ? banner.imageUrlDesktop.trim()
        : (typeof banner?.imageUrl === 'string' ? banner.imageUrl.trim() : '');
      const desktopPrompt = typeof banner?.promptDesktop === 'string'
        ? banner.promptDesktop.trim()
        : (typeof banner?.prompt === 'string' ? banner.prompt.trim() : '');
      const desktopOffsetX = toInteger(banner?.offsetXDesktop ?? banner?.offsetX, 0);
      const desktopOffsetY = toInteger(banner?.offsetYDesktop ?? banner?.offsetY, 0);
      const desktopSizeAdjust = toInteger(banner?.sizeAdjustPxDesktop ?? banner?.sizeAdjustPx, 0);

      const mobileImageRaw = typeof banner?.imageUrlMobile === 'string' ? banner.imageUrlMobile.trim() : '';
      const nextEntry = {
        slot,
        desktop: {
          imageUrl: desktopImage,
          prompt: desktopPrompt,
          offsetX: desktopOffsetX,
          offsetY: desktopOffsetY,
          sizeAdjustPx: desktopSizeAdjust
        },
        mobile: {
          imageUrl: mobileImageRaw,
          prompt: typeof banner?.promptMobile === 'string' ? banner.promptMobile.trim() : '',
          offsetX: toInteger(banner?.offsetXMobile, 0),
          offsetY: toInteger(banner?.offsetYMobile, 0),
          sizeAdjustPx: toInteger(banner?.sizeAdjustPxMobile, 0)
        }
      };
      state.banners.set(slot, nextEntry);
      applyBannerToDom(slot, nextEntry);
    }
  }

  async function generateBanner(slot, prompt) {
    state.busy = true;
    syncControlsDisabled();
    state.activeEditSlot = normalizeSlot(slot, 1);
    syncEditingClass();
    setSlotBusy(slot, true);
    setCarouselStatus(`Gerando Banner ${slot} (${state.viewMode})...`);
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

      const variant = normalizeVariant(state.viewMode);
      const current = getBannerEntry(slot);
      const nextEntry = {
        ...current,
        [variant]: {
          ...current[variant],
          imageUrl: typeof payload?.dataUrl === 'string' ? payload.dataUrl : '',
          prompt: typeof payload?.promptUsed === 'string' ? payload.promptUsed : prompt
        }
      };
      state.banners.set(slot, nextEntry);
      applyBannerToDom(slot, nextEntry);
      state.activeEditSlot = slot;
      moveToSlot(slot);
      setCarouselStatus(`Banner ${slot} pronto no modo ${variant}. Clique em aprovar para salvar.`);
    } catch (error) {
      setCarouselStatus(error?.message || 'Falha ao gerar banner.');
    } finally {
      state.busy = false;
      setSlotBusy(slot, false);
      syncControlsDisabled();
    }
  }

  async function saveActiveBanner() {
    const slot = normalizeSlot(state.activeEditSlot || state.focusedSlot || 1, 1);
    if (!slot || state.busy) return;

    const variant = normalizeVariant(state.viewMode);
    const entry = getBannerEntry(slot);
    const selected = entryForVariant(entry, variant);
    if (!selected.imageUrl || !selected.imageUrl.startsWith('data:image/')) {
      setCarouselStatus(`Selecione ou gere uma imagem (${variant}) antes de aprovar.`);
      return;
    }

    state.busy = true;
    syncControlsDisabled();
    setSlotBusy(slot, true);
    setCarouselStatus(`Salvando Banner ${slot} (${variant}) no R2...`);
    try {
      const response = await fetch(buildApiUrl('/api/admin/banners/save'), {
        method: 'POST',
        credentials: 'include',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          slot,
          variant,
          imageDataUrl: selected.imageUrl,
          prompt: selected.prompt || state.defaultPrompt,
          offsetX: toInteger(selected.offsetX, 0),
          offsetY: toInteger(selected.offsetY, 0),
          sizeAdjustPx: toInteger(selected.sizeAdjustPx, 0)
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success || !payload?.banner) {
        throw new Error(payload?.error || payload?.details || 'Falha ao salvar banner.');
      }

      const saved = payload.banner;
      const nextEntry = {
        slot,
        desktop: {
          imageUrl: typeof saved?.imageUrlDesktop === 'string' ? saved.imageUrlDesktop.trim() : (typeof saved?.imageUrl === 'string' ? saved.imageUrl.trim() : ''),
          prompt: typeof saved?.promptDesktop === 'string' ? saved.promptDesktop.trim() : (typeof saved?.prompt === 'string' ? saved.prompt.trim() : ''),
          offsetX: toInteger(saved?.offsetXDesktop ?? saved?.offsetX, 0),
          offsetY: toInteger(saved?.offsetYDesktop ?? saved?.offsetY, 0),
          sizeAdjustPx: toInteger(saved?.sizeAdjustPxDesktop ?? saved?.sizeAdjustPx, 0)
        },
        mobile: {
          imageUrl: typeof saved?.imageUrlMobile === 'string' ? saved.imageUrlMobile.trim() : '',
          prompt: typeof saved?.promptMobile === 'string' ? saved.promptMobile.trim() : '',
          offsetX: toInteger(saved?.offsetXMobile, 0),
          offsetY: toInteger(saved?.offsetYMobile, 0),
          sizeAdjustPx: toInteger(saved?.sizeAdjustPxMobile, 0)
        }
      };
      state.banners.set(slot, nextEntry);
      applyBannerToDom(slot, nextEntry);
      state.activeEditSlot = slot;
      moveToSlot(slot);
      setCarouselStatus(`Banner ${slot} salvo no modo ${variant}.`);
    } catch (error) {
      setCarouselStatus(error?.message || 'Falha ao salvar banner.');
    } finally {
      state.busy = false;
      setSlotBusy(slot, false);
      syncControlsDisabled();
    }
  }

  function adjustActiveBanner(patch) {
    const slot = normalizeSlot(state.activeEditSlot || state.focusedSlot || 1, 1);
    if (!slot || state.busy) return;
    const variant = normalizeVariant(state.viewMode);
    const current = getBannerEntry(slot);
    const selected = entryForVariant(current, variant);
    const nextEntry = {
      ...current,
      [variant]: {
        ...selected,
        offsetX: toInteger(selected.offsetX, 0) + toInteger(patch.offsetX, 0),
        offsetY: toInteger(selected.offsetY, 0) + toInteger(patch.offsetY, 0),
        sizeAdjustPx: toInteger(selected.sizeAdjustPx, 0) + toInteger(patch.sizeAdjustPx, 0)
      }
    };
    state.banners.set(slot, nextEntry);
    applyBannerToDom(slot, nextEntry);
    syncEditingClass();
  }

  function onWindowKeyDown(event) {
    if (!state.isAdmin) return;
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

  function onBannerClick(slot) {
    if (!state.isAdmin || state.busy) return;
    moveToSlot(slot);
    const current = getBannerEntry(slot);
    const variant = normalizeVariant(state.viewMode);
    const selected = entryForVariant(current, variant);
    const defaultPrompt = selected.prompt || state.defaultPrompt;
    const typedPrompt = window.prompt(`Prompt do Banner ${slot} (${variant})`, defaultPrompt);
    if (typedPrompt === null) return;
    const finalPrompt = typedPrompt.trim() || state.defaultPrompt || defaultPrompt;
    if (!finalPrompt) {
      setCarouselStatus('Digite um prompt valido para gerar o banner.');
      return;
    }
    void generateBanner(slot, finalPrompt);
  }

  function enableAdminUi() {
    document.body.classList.add('is-admin-banner');
    setupControls();
    if (state.controls.root) {
      state.controls.root.hidden = false;
    }

    setMode('desktop');
    moveToSlot(1);
    syncControlsDisabled();
    setCarouselStatus('Admin: escolha desktop/mobile, use setas, upload e aprovar. Toque no banner para gerar com IA.');

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
      applyBodyVariantClass();
      renderAllSlots();
      if (state.isAdmin) {
        enableAdminUi();
      } else {
        window.addEventListener('resize', () => {
          applyBodyVariantClass();
          renderAllSlots();
        });
      }
    } catch (_error) {
      state.isAdmin = false;
      applyBodyVariantClass();
      renderAllSlots();
    }
  })();
})();
