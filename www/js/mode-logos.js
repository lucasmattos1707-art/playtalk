(function() {
  const DEFAULT_THEME = 'happy';
  const GAMEHUB_ICON_PATHS = {
    1: 'SVG/gamehub/planting.svg',
    2: 'SVG/gamehub/connecting.svg',
    3: 'SVG/gamehub/reading.svg',
    4: 'SVG/gamehub/sequence.svg',
    5: 'SVG/gamehub/listening.svg',
    6: 'SVG/gamehub/meaning.svg',
    7: 'SVG/gamehub/memory.svg',
    8: 'SVG/gamehub/building.svg',
    9: 'SVG/gamehub/typing.svg',
    10: 'SVG/gamehub/blocks.svg',
    11: 'SVG/gamehub/watching.svg',
    12: 'SVG/gamehub/talking.svg'
  };
  const DEFAULT_ICON_MARKUP = `
    <g transform="translate(6.4 6.4) scale(0.8)">
      <path d="M12 18c0-5.523 4.477-10 10-10h20c5.523 0 10 4.477 10 10v8c0 5.523-4.477 10-10 10H28l-8 8v-8h-6c-5.523 0-10-4.477-10-10Z" opacity="0.92" />
      <path d="M22 20h10v4H22zm14 0h10v4H36zM22 28h18v4H22z" />
    </g>
  `;

  const MODE_ICONS = {
    1: { number: '01' },
    2: { number: '02' },
    3: { number: '03' },
    4: { number: '04' },
    5: { number: '05' },
    6: { number: '06' },
    7: { number: '07' },
    8: { number: '08' },
    9: { number: '09' },
    10: { number: '10' },
    11: { number: '11' },
    12: { number: '12' }
  };

  function normalizeTheme(theme) {
    const normalized = String(theme || '').trim().toLowerCase();
    return normalized || DEFAULT_THEME;
  }

  function normalizeMode(mode) {
    const parsedMode = Number.parseInt(mode, 10);
    if (Number.isFinite(parsedMode) && MODE_ICONS[parsedMode]) {
      return parsedMode;
    }
    return 1;
  }

  function getCurrentTheme() {
    const radioApi = window.playtalkGlobalRadio;
    const stateTheme = radioApi && typeof radioApi.getStation === 'function'
      ? radioApi.getStation()
      : document.documentElement.dataset.globalRadioStation;
    return normalizeTheme(stateTheme);
  }

  function getModeIconNumber(mode) {
    const safeMode = normalizeMode(mode);
    return MODE_ICONS[safeMode].number;
  }

  function buildModeIconUrl(mode, theme = getCurrentTheme()) {
    const safeMode = normalizeMode(mode);
    void theme;
    return GAMEHUB_ICON_PATHS[safeMode] || GAMEHUB_ICON_PATHS[1];
  }

  function renderModeLogo(element, mode) {
    if (!element) {
      return;
    }
    const safeMode = normalizeMode(mode);
    element.dataset.mode = String(safeMode);
    element.classList.add('mode-logo');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 64 64');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.classList.add('mode-logo__icon');
    const sourceHref = buildModeIconUrl(safeMode);
    svg.innerHTML = '';
    if (sourceHref) {
      const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
      image.setAttribute('href', sourceHref);
      image.setAttributeNS('http://www.w3.org/1999/xlink', 'href', sourceHref);
      image.setAttribute('x', '0');
      image.setAttribute('y', '0');
      image.setAttribute('width', '100%');
      image.setAttribute('height', '100%');
      image.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      svg.appendChild(image);
    } else {
      svg.innerHTML = DEFAULT_ICON_MARKUP;
    }
    element.innerHTML = '';
    element.appendChild(svg);
  }

  function renderThemedModeImages(root = document) {
    const scope = root || document;
    scope.querySelectorAll('img[data-mode-icon]').forEach((image) => {
      const mode = image.dataset.modeIcon || image.closest('[data-phase]')?.dataset.phase || 1;
      const nextSrc = buildModeIconUrl(mode);
      if (image.getAttribute('src') !== nextSrc) {
        image.setAttribute('src', nextSrc);
      }
    });
  }

  function renderAllModeLogos(root = document) {
    const scope = root || document;
    scope.querySelectorAll('.mode-logo').forEach((logo) => {
      const closestMode = logo.closest('.menu-mode[data-mode], .mode-btn[data-mode]');
      const inherited = closestMode ? Number(closestMode.dataset.mode) : null;
      const mode = Number(logo.dataset.mode) || inherited || 1;
      renderModeLogo(logo, mode);
    });
    renderThemedModeImages(scope);
  }

  function createModeLogoElement(mode, extraClass = '') {
    const el = document.createElement('div');
    el.className = ['mode-logo', extraClass].filter(Boolean).join(' ');
    renderModeLogo(el, mode);
    return el;
  }

  function refreshAllModeIcons() {
    renderAllModeLogos(document);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', refreshAllModeIcons, { once: true });
  } else {
    refreshAllModeIcons();
  }

  document.addEventListener('playtalk:global-radio-change', refreshAllModeIcons);

  window.playtalkModeLogos = {
    ICONS: MODE_ICONS,
    normalizeTheme,
    getCurrentTheme,
    getModeIconNumber,
    buildModeIconUrl,
    renderModeLogo,
    renderThemedModeImages,
    renderAllModeLogos,
    createModeLogoElement,
    refreshAllModeIcons
  };
})();
