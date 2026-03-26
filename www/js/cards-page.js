(function () {
  const PLAYER_STORAGE_KEY = 'playtalk_player_profile';
  const LAST_COMPLETED_DAY_STORAGE_KEY = 'playtalk-home-last-completed-day-v1';
  const LOCAL_LEVEL_API_PATH = '/api/local-level/day/{day}/phase/{phase}';
  const LOCAL_WORDS_DECKS_API_PATH = '/api/local-level/words';
  const LOCAL_LEVEL_FILES_MANIFEST_PATH = 'data/local-level-files.json';
  const PUBLIC_LEVEL_ASSET_BASE_URL = 'https://pub-1208463a3c774431bf7e0ddcbd3cf670.r2.dev/Niveis';
  const PLAY_DESTINATION_TEMPLATE = 'index.html?phase={phase}&day={day}&source=cards#home';
  const CARDS_STATE_STORAGE_KEY = 'playtalk-cards-view-state-v1';
  const FLASHCARD_DECK_IMAGE_POOL = [
    'https://pub-1208463a3c774431bf7e0ddcbd3cf670.r2.dev/cardsfolder/01.png',
    'https://pub-1208463a3c774431bf7e0ddcbd3cf670.r2.dev/cardsfolder/02.png',
    'https://pub-1208463a3c774431bf7e0ddcbd3cf670.r2.dev/cardsfolder/03.png'
  ];
  const JOURNEY_FLASHCARD_DECKS = [];
  const WORDS_DECKS = Array.from({ length: 25 }, (_, index) => {
    const deckNumber = String(index + 1).padStart(3, '0');
    return {
      id: `words-${deckNumber}`,
      day: index + 1,
      badge: `Deck ${deckNumber}`,
      title: `Deck ${deckNumber}`,
      filePath: `Niveis/words/${deckNumber}.json`,
      image: ''
    };
  });
  const TAB_CONFIG = {
    flashcards: {
      title: 'FlashCards',
      copy: 'Todos os flashcards desbloqueados na jornada aparecem aqui em uma lista unica.',
      load: loadFlashcardsView
    },
    palavras: {
      title: 'Palavras',
      copy: 'Todos os decks da pasta Niveis/words aparecem aqui com o mesmo formato dos FlashCards.',
      load: loadWordsView
    },
    minibooks: {
      title: 'Minibooks',
      copy: 'Cada minibook abre o reading do dia correspondente.',
      load: (days) => loadLibraryView(days, {
        phase: 3,
        actionLabel: 'Ler agora',
        fallback: 'MB'
      })
    },
    cenas: {
      title: 'Cenas',
      copy: 'Cada cena abre o talking do dia correspondente.',
      load: (days) => loadLibraryView(days, {
        phase: 12,
        actionLabel: 'Atuar agora',
        fallback: 'SC'
      })
    },
    filmes: {
      title: 'Filmes',
      copy: 'Cada filme abre o watching do dia correspondente.',
      load: (days) => loadLibraryView(days, {
        phase: 11,
        actionLabel: 'Assistir agora',
        fallback: 'MV'
      })
    }
  };

  function safeText(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  function getPhaseFolderCode(phaseNumber) {
    if (Number(phaseNumber) === 11) return '011';
    if (Number(phaseNumber) === 12) return '012';
    return '001';
  }

  function extractAssetFileName(assetName = '') {
    const trimmed = safeText(assetName);
    if (!trimmed) return '';
    const normalized = trimmed.replace(/\\/g, '/').replace(/^\/+/, '');
    const segments = normalized.split('/').filter(Boolean);
    return segments.length ? segments[segments.length - 1] : '';
  }

  function buildPublicLevelAssetUrl(assetName = '', dayNumber = 1, phaseNumber = 1) {
    const trimmed = safeText(assetName);
    if (!trimmed) return '';
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    const fileName = extractAssetFileName(trimmed);
    if (!fileName) return '';
    const dayFolder = String(Math.max(1, Number(dayNumber) || 1)).padStart(3, '0');
    const phaseFolder = getPhaseFolderCode(Number(phaseNumber) || 1);
    return `${PUBLIC_LEVEL_ASSET_BASE_URL}/${dayFolder}/${phaseFolder}/${encodeURIComponent(fileName)}`;
  }

  function entriesFromData(data) {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.items)) return data.items;
    if (data && Array.isArray(data.entries)) return data.entries;
    return [];
  }

  async function loadJson(path) {
    const response = await fetch(path, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Falha ao carregar ${path}`);
    }
    return response.json();
  }

  async function loadPhaseData(day, phase) {
    const candidates = [
      LOCAL_LEVEL_API_PATH
        .replace('{day}', encodeURIComponent(String(day)))
        .replace('{phase}', encodeURIComponent(String(phase)))
    ];

    let lastError = null;
    for (const candidate of candidates) {
      try {
        return await loadJson(candidate);
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error(`Falha ao carregar dados da fase ${phase} do dia ${day}.`);
  }

  async function loadLocalLevelFilesManifest() {
    const payload = await loadJson(LOCAL_LEVEL_FILES_MANIFEST_PATH);
    return Array.isArray(payload?.files) ? payload.files : [];
  }

  function readCardsViewState() {
    try {
      const raw = sessionStorage.getItem(CARDS_STATE_STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (_error) {
      return {};
    }
  }

  function writeCardsViewState(nextState) {
    try {
      sessionStorage.setItem(CARDS_STATE_STORAGE_KEY, JSON.stringify(nextState || {}));
    } catch (_error) {
      // ignore storage issues
    }
  }

  function readPlayerState() {
    try {
      if (window.playtalkPlayerState && typeof window.playtalkPlayerState.get === 'function') {
        return window.playtalkPlayerState.get() || {};
      }
      return JSON.parse(localStorage.getItem(PLAYER_STORAGE_KEY) || '{}') || {};
    } catch (_error) {
      return {};
    }
  }

  function getUnlockedDayCount() {
    const player = readPlayerState();
    const username = safeText(player?.username).toLowerCase();
    const storedDay = Number(localStorage.getItem(LAST_COMPLETED_DAY_STORAGE_KEY));
    const completedDay = Number.isFinite(storedDay) && storedDay > 0 ? storedDay : 0;
    if (username === 'adm') {
      return Math.max(1, completedDay);
    }
    return completedDay;
  }

  function getUnlockedDays() {
    const dayCount = Math.max(0, getUnlockedDayCount());
    return Array.from({ length: dayCount }, (_, index) => index + 1);
  }

  function resolveCoverImage(value, day, phase) {
    const image = safeText(value);
    if (!image || image.toLowerCase() === 'none') {
      return null;
    }
    return buildPublicLevelAssetUrl(image, day, phase);
  }

  function resolveEntryEnglish(entry) {
    return safeText(entry?.nomeIngles || entry?.english || entry?.text || entry?.word);
  }

  function resolveEntryPortuguese(entry) {
    return safeText(entry?.nomePortugues || entry?.portuguese || entry?.translation || entry?.pt);
  }

  function resolveEntryAudio(entry, day, phase) {
    return buildPublicLevelAssetUrl(entry?.audio || entry?.audioUrl || '', day, phase);
  }

  function resolveEntryImage(entry, day, phase) {
    return buildPublicLevelAssetUrl(entry?.imagem || entry?.image || entry?.coverImage || '', day, phase);
  }

  function tokenizeWords(text) {
    return String(text || '').match(/[A-Za-z]+(?:'[A-Za-z]+)?/g) || [];
  }

  function inferWordsDeckDay(value) {
    const match = String(value || '').match(/(\d+)\.json$/i);
    const parsed = match ? Number(match[1]) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  }

  function buildLocalWordsDeckApiPath(fileName) {
    return `/api/local-level/words/${encodeURIComponent(String(fileName || ''))}`;
  }

  async function loadDeckJson(deck) {
    const data = await loadJson(deck.filePath);
    return normalizeDeckPayload(deck, data);
  }

  function normalizeDeckEntries(deck, entries) {
    const deckKey = safeText(deck.id) || `deck-${safeText(deck.filePath).replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;
    const assetDay = Number(deck.day) || 1;
    return entries.map((entry, index) => ({
      id: `flashcard-${deckKey}-${index}`,
      image: resolveEntryImage(entry, assetDay, 1),
      label: resolveEntryEnglish(entry),
      portuguese: resolveEntryPortuguese(entry),
      audio: resolveEntryAudio(entry, assetDay, 1)
    })).filter((entry) => entry.image || entry.label);
  }

  function normalizeDeckPayload(deck, data) {
    const entries = entriesFromData(data);
    return {
      ...deck,
      title: safeText(data?.title) || deck.title,
      image: safeText(data?.coverImage) || deck.image,
      entries: normalizeDeckEntries(deck, entries)
    };
  }

  async function loadFlashcardsView() {
    return { kind: 'deck-library', items: await loadDeckCollection(JOURNEY_FLASHCARD_DECKS) };
  }

  async function loadWordsView() {
    try {
      const payload = await loadJson(LOCAL_WORDS_DECKS_API_PATH);
      if (Array.isArray(payload?.files)) {
        const decks = payload.files.map((deck, index) => normalizeWordsDeckListItem(deck, index));
        return {
          kind: 'deck-library',
          items: await loadDeckCollection(decks)
        };
      }
    } catch (error) {
      console.warn('Falha ao listar decks de palavras pela API local. Usando manifesto estatico.', error);
    }

    try {
      const manifestFiles = await loadLocalLevelFilesManifest();
      const decks = manifestFiles
        .filter((entry) => safeText(entry?.folder).toLowerCase() === 'words' || /^Niveis\/words\/.+\.json$/i.test(safeText(entry?.path)))
        .map((entry, index) => normalizeWordsDeckManifestItem(entry, index));

      if (decks.length) {
        return { kind: 'deck-library', items: await loadDeckCollection(decks) };
      }
    } catch (error) {
      console.warn('Falha ao listar decks de palavras pelo manifesto. Usando fallback estatico.', error);
    }

    return { kind: 'deck-library', items: await loadDeckCollection(WORDS_DECKS) };
  }

  function normalizeWordsDeckListItem(deck, index) {
    const fileName = safeText(deck?.name);
    const filePath = safeText(deck?.path) || (fileName ? `Niveis/words/${fileName}` : '');
    const day = inferWordsDeckDay(filePath || fileName) || index + 1;
    const deckNumber = String(day).padStart(3, '0');
    return {
      id: safeText(deck?.id) || `words-${deckNumber}`,
      day,
      badge: `Deck ${deckNumber}`,
      title: safeText(deck?.title) || `Deck ${deckNumber}`,
      fileName,
      filePath: fileName ? buildLocalWordsDeckApiPath(fileName) : filePath,
      image: safeText(deck?.coverImage)
    };
  }

  function normalizeWordsDeckManifestItem(entry, index) {
    const filePath = safeText(entry?.path);
    const fileName = safeText(entry?.name) || extractAssetFileName(filePath);
    const day = inferWordsDeckDay(filePath || fileName) || Number(entry?.day) || index + 1;
    const deckNumber = String(day).padStart(3, '0');
    return {
      id: `words-${deckNumber}`,
      day,
      badge: `Deck ${deckNumber}`,
      title: `Deck ${deckNumber}`,
      fileName,
      filePath,
      image: ''
    };
  }

  async function loadDeckCollection(decks) {
    const items = [];
    for (const deck of decks) {
      try {
        items.push(await loadDeckJson(deck));
      } catch (_error) {
        items.push({
          ...deck,
          entries: []
        });
      }
    }
    return items;
  }

  async function loadLibraryView(days, config) {
    const items = [];
    for (const day of days) {
      const data = await loadPhaseData(day, config.phase);
      items.push({
        day,
        phase: config.phase,
        title: safeText(data?.title) || `Day ${day}`,
        image: resolveCoverImage(data?.coverImage, day, config.phase),
        fallback: config.fallback,
        actionLabel: config.actionLabel
      });
    }
    return { kind: 'library', items };
  }

  function launchPhase(phase, day, cardsState) {
    const destination = PLAY_DESTINATION_TEMPLATE
      .replace('{phase}', encodeURIComponent(String(phase)))
      .replace('{day}', encodeURIComponent(String(day)));
    try {
      if (cardsState && typeof cardsState === 'object') {
        writeCardsViewState(cardsState);
      }
      sessionStorage.setItem('playtalk-play-launch', JSON.stringify({
        iconSrc: '',
        phase,
        day,
        source: 'cards',
        createdAt: Date.now()
      }));
    } catch (_error) {
      // ignore storage issues
    }
    window.location.href = destination;
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function initCardsPage() {
    const page = document.getElementById('cards-page');
    const tabs = Array.from(document.querySelectorAll('[data-cards-tab]'));
    const selectedTitle = document.getElementById('cards-selected-title');
    const selectedCopy = document.getElementById('cards-selected-copy');
    const dynamicSection = document.getElementById('cards-section-dynamic');
    const titleSection = document.getElementById('title-section');
    const descriptionSection = document.getElementById('description-section');
    const spotlight = document.getElementById('cards-selected-spotlight');
    const spotlightCover = document.getElementById('cards-selected-cover');
    const spotlightTitle = document.getElementById('cards-selected-block-title');
    const spotlightAction = document.getElementById('cards-selected-action');
    const contentSection = document.getElementById('content-section');
    const grid = document.getElementById('cards-collection-grid');
    const emptyState = document.getElementById('cards-empty-state');
    const backButton = document.getElementById('cards-back-button');

    if (!page || !tabs.length || !selectedTitle || !selectedCopy || !dynamicSection || !titleSection || !descriptionSection || !spotlight || !spotlightCover || !spotlightTitle || !spotlightAction || !contentSection || !grid || !emptyState || !backButton) {
      return;
    }

    if (document.body) {
      document.body.classList.add('page-cards');
      document.body.style.setProperty('overflow-y', 'auto', 'important');
      document.body.style.setProperty('max-height', 'none', 'important');
      document.body.style.setProperty('touch-action', 'pan-y', 'important');
    }
    if (document.documentElement) {
      document.documentElement.style.setProperty('overflow-y', 'auto', 'important');
      document.documentElement.style.setProperty('max-height', 'none', 'important');
      document.documentElement.style.setProperty('overscroll-behavior-y', 'auto', 'important');
    }
    if (typeof window.__playtalkSyncScrollLock === 'function') {
      window.__playtalkSyncScrollLock();
    }

    const restoredState = readCardsViewState();
    let activeTab = TAB_CONFIG[restoredState.activeTab] ? restoredState.activeTab : (page.dataset.cardsActiveTab || 'flashcards');
    let selectedLibrarySnapshot = restoredState.selectedItem && typeof restoredState.selectedItem === 'object'
      ? restoredState.selectedItem
      : null;
    let pendingRestoreScrollY = Number.isFinite(Number(restoredState.scrollY)) ? Number(restoredState.scrollY) : null;
    let scrollRestoreDone = false;
    let selectedLibraryItem = null;
    let libraryItems = [];
    let libraryIndex = 0;
    let libraryConfig = null;
    let flashcardDecks = [];
    let selectedDeckId = safeText(restoredState.selectedDeckId);
    let activeFlashcardAudio = null;

    function stopActiveFlashcardAudio() {
      if (activeFlashcardAudio && typeof activeFlashcardAudio.pause === 'function') {
        try {
          activeFlashcardAudio.pause();
          activeFlashcardAudio.currentTime = 0;
        } catch (_error) {
          // no-op
        }
      }
      activeFlashcardAudio = null;
      if (window.speechSynthesis) {
        try {
          window.speechSynthesis.cancel();
        } catch (_error) {
          // no-op
        }
      }
    }

    function playFlashcardEnglish(item, card, labelEl, imageWrapEl) {
      if (!item || !card || !labelEl || !imageWrapEl) return;
      stopActiveFlashcardAudio();

      const englishLabel = item.label || '';
      const portugueseLabel = item.portuguese || englishLabel;
      labelEl.textContent = portugueseLabel;
      card.classList.add('is-speaking');
      imageWrapEl.classList.remove('is-flashing');
      void imageWrapEl.offsetWidth;
      imageWrapEl.classList.add('is-flashing');

      const restoreLabel = () => {
        if (!labelEl.isConnected) return;
        labelEl.textContent = englishLabel;
        card.classList.remove('is-speaking');
      };

      if (item.audio) {
        const audio = new Audio(item.audio);
        activeFlashcardAudio = audio;
        const finalize = () => {
          if (activeFlashcardAudio === audio) {
            activeFlashcardAudio = null;
          }
          restoreLabel();
        };
        audio.addEventListener('ended', finalize, { once: true });
        audio.addEventListener('error', finalize, { once: true });
        audio.play().catch(() => {
          finalize();
        });
        return;
      }

      if (window.speechSynthesis && englishLabel) {
        const utterance = new SpeechSynthesisUtterance(englishLabel);
        utterance.lang = 'en-US';
        utterance.rate = 0.95;
        utterance.onend = () => {
          if (activeFlashcardAudio === utterance) {
            activeFlashcardAudio = null;
          }
          restoreLabel();
        };
        utterance.onerror = utterance.onend;
        activeFlashcardAudio = utterance;
        try {
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(utterance);
          return;
        } catch (_error) {
          restoreLabel();
          activeFlashcardAudio = null;
        }
      } else {
        window.setTimeout(restoreLabel, 900);
      }
    }

    function buildCardsState() {
      return {
        activeTab,
        selectedItem: selectedLibraryItem
          ? { phase: selectedLibraryItem.phase, day: selectedLibraryItem.day }
          : null,
        selectedDeckId: activeTab === 'flashcards' || activeTab === 'palavras' ? selectedDeckId : '',
        scrollY: Math.max(0, Math.round(window.scrollY || 0))
      };
    }

    function persistCardsState() {
      writeCardsViewState(buildCardsState());
    }

    function queueScrollRestore() {
      if (scrollRestoreDone || pendingRestoreScrollY == null) return;
      scrollRestoreDone = true;
      const nextY = pendingRestoreScrollY;
      pendingRestoreScrollY = null;
      window.requestAnimationFrame(() => {
        window.scrollTo(0, nextY);
      });
    }

    function renderSpotlightCover(item) {
      spotlightCover.innerHTML = item && item.image
        ? `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}">`
        : `<div class="cards-selected-spotlight__cover-fallback">${escapeHtml(item?.fallback || 'PT')}</div>`;
    }

    function disableLibraryCycling() {
      spotlightCover.style.cursor = '';
      spotlightCover.onclick = null;
      spotlightCover.onkeydown = null;
      spotlightCover.removeAttribute('role');
      spotlightCover.removeAttribute('tabindex');
      spotlightCover.removeAttribute('aria-label');
      spotlightTitle.style.cursor = '';
      spotlightTitle.onclick = null;
    }

    function switchDynamicState(renderer) {
      dynamicSection.classList.add('is-switching');
      window.setTimeout(() => {
        renderer();
        dynamicSection.classList.remove('is-switching');
      }, 140);
    }

    function applyLayoutMode(mode) {
      page.dataset.cardsLayout = mode;
      titleSection.hidden = false;
      descriptionSection.hidden = mode !== 'cards';
      spotlight.hidden = mode !== 'play';
      contentSection.hidden = mode !== 'cards' && mode !== 'deck';
      emptyState.hidden = true;
      backButton.hidden = mode !== 'deck';
    }

    function showOverview(config) {
      switchDynamicState(() => {
        applyLayoutMode('cards');
        selectedTitle.textContent = config.title;
        selectedCopy.textContent = config.copy;
        spotlightAction.hidden = true;
        spotlightAction.onclick = null;
        spotlightCover.innerHTML = '';
        spotlightTitle.textContent = '';
      });
    }

    function showDeckLibrary(config, decks) {
      stopActiveFlashcardAudio();
      selectedDeckId = '';
      flashcardDecks = decks.slice();
      persistCardsState();
      switchDynamicState(() => {
        applyLayoutMode('cards');
        selectedTitle.textContent = config.title;
        selectedCopy.textContent = 'Toque em um deck para abrir as imagens dele.';
        grid.hidden = false;
        grid.dataset.view = 'deck-library';
        grid.innerHTML = decks.map((deck) => `
          <button class="cards-library-card cards-library-card--launch" type="button" data-deck-id="${escapeHtml(deck.id)}" role="listitem" aria-label="Abrir deck ${escapeHtml(deck.title)}">
            <div class="cards-library-card__cover">
              <img src="${escapeHtml(deck.image)}" alt="${escapeHtml(deck.title)}">
            </div>
            <p class="cards-library-card__day">${escapeHtml(deck.badge || 'Deck')}</p>
            <h3 class="cards-library-card__title">${escapeHtml(deck.title)}</h3>
            <p class="cards-library-card__meta">${deck.entries.length} cards</p>
          </button>
        `).join('');
        Array.from(grid.querySelectorAll('[data-deck-id]')).forEach((button) => {
          button.addEventListener('click', () => {
            const deckId = safeText(button.dataset.deckId);
            const deck = flashcardDecks.find((entry) => entry.id === deckId);
            if (!deck) return;
            showFlashcardDeck(config, deck);
          });
        });
      });
    }

    function showFlashcardDeck(config, deck) {
      if (!deck) return;
      stopActiveFlashcardAudio();
      selectedDeckId = safeText(deck.id);
      persistCardsState();
      switchDynamicState(() => {
        applyLayoutMode('deck');
        selectedTitle.textContent = deck.title;
        selectedCopy.textContent = '';
        spotlight.hidden = true;
        spotlightCover.innerHTML = '';
        spotlightTitle.textContent = '';
        spotlightAction.hidden = true;
        spotlightAction.onclick = null;
        emptyState.hidden = true;
        emptyState.textContent = '';
        grid.hidden = false;
        grid.dataset.view = 'flashcards';
        grid.innerHTML = deck.entries.map((item) => `
          <article class="cards-flashcard-item" data-flashcard-id="${escapeHtml(item.id)}" role="button" tabindex="0" aria-label="Ouvir ${escapeHtml(item.label || deck.title)}">
            <div class="cards-flashcard-item__image-wrap">
              <img class="cards-flashcard-item__image" src="${escapeHtml(item.image)}" alt="${escapeHtml(item.label || deck.title)}">
            </div>
            <p class="cards-flashcard-item__label">${escapeHtml(item.label || deck.title)}</p>
          </article>
        `).join('');
        Array.from(grid.querySelectorAll('[data-flashcard-id]')).forEach((cardEl) => {
          const flashcardId = cardEl.getAttribute('data-flashcard-id');
          const item = deck.entries.find((entry) => entry.id === flashcardId);
          const labelEl = cardEl.querySelector('.cards-flashcard-item__label');
          const imageWrapEl = cardEl.querySelector('.cards-flashcard-item__image-wrap');
          if (!item || !labelEl || !imageWrapEl) return;
          const trigger = () => playFlashcardEnglish(item, cardEl, labelEl, imageWrapEl);
          cardEl.addEventListener('click', trigger);
          cardEl.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              trigger();
            }
          });
        });
        backButton.onclick = () => showDeckLibrary(config, flashcardDecks);
      });
    }

    function showDetail(config, item) {
      if (!item) return;
      switchDynamicState(() => {
        applyLayoutMode('play');
        selectedTitle.textContent = config.title;
        selectedCopy.textContent = '';
        spotlight.hidden = false;
        renderSpotlightCover(item);
        spotlightTitle.textContent = item.title;
        spotlightAction.hidden = false;
        spotlightAction.textContent = item.actionLabel;
        spotlightAction.onclick = () => launchPhase(item.phase, item.day, buildCardsState());
      });
    }

    function showLibraryDetailAt(index) {
      if (!libraryItems.length || !libraryConfig) return;
      libraryIndex = ((index % libraryItems.length) + libraryItems.length) % libraryItems.length;
      const item = libraryItems[libraryIndex];
      selectedLibraryItem = item;
      selectedLibrarySnapshot = { phase: item.phase, day: item.day };
      persistCardsState();
      showDetail(libraryConfig, item);
    }

    function enableLibraryCycling() {
      if (!libraryItems.length) {
        disableLibraryCycling();
        return;
      }
      const cycleLibraryItem = () => {
        showLibraryDetailAt(libraryIndex + 1);
      };
      spotlightCover.style.cursor = 'pointer';
      spotlightCover.setAttribute('role', 'button');
      spotlightCover.setAttribute('tabindex', '0');
      spotlightCover.setAttribute('aria-label', 'Trocar item da biblioteca');
      spotlightCover.onclick = cycleLibraryItem;
      spotlightCover.onkeydown = (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          cycleLibraryItem();
        }
      };
      spotlightTitle.style.cursor = 'pointer';
      spotlightTitle.onclick = cycleLibraryItem;
    }

    function renderFlashcards(items) {
      grid.hidden = false;
      grid.dataset.view = 'flashcards';
      grid.innerHTML = items.map((item) => `
        <article class="cards-flashcard-item" role="listitem">
          <div class="cards-flashcard-item__image-wrap">
            <img class="cards-flashcard-item__image" src="${escapeHtml(item.image)}" alt="${escapeHtml(item.label)}">
          </div>
          <p class="cards-flashcard-item__label">${escapeHtml(item.label)}</p>
        </article>
      `).join('');
    }

    function renderWords(items) {
      grid.hidden = false;
      grid.dataset.view = 'words';
      grid.innerHTML = items.map((item) => `
        <article class="cards-word-item" role="listitem">
          <span class="cards-word-item__label">${escapeHtml(item.label)}</span>
        </article>
      `).join('');
    }

    function renderLibrary(items, config) {
      libraryItems = items.slice();
      libraryConfig = config;
      grid.hidden = true;
      grid.dataset.view = 'library';
      grid.innerHTML = '';

      const restoredIndex = selectedLibrarySnapshot
        ? libraryItems.findIndex((item) => item.phase === Number(selectedLibrarySnapshot.phase) && item.day === Number(selectedLibrarySnapshot.day))
        : -1;
      libraryIndex = restoredIndex >= 0 ? restoredIndex : 0;
      showLibraryDetailAt(libraryIndex);
      enableLibraryCycling();
    }

    async function renderActiveTab() {
      const config = TAB_CONFIG[activeTab] || TAB_CONFIG.flashcards;
      if (activeTab === 'flashcards' || activeTab === 'palavras') {
        const view = await config.load([]);
        if (!view.items.length) {
          flashcardDecks = [];
          selectedDeckId = '';
          applyLayoutMode('cards');
          selectedTitle.textContent = config.title;
          selectedCopy.textContent = config.copy;
          grid.hidden = true;
          emptyState.hidden = false;
          emptyState.textContent = activeTab === 'flashcards'
            ? 'Nenhum deck encontrado nas pastas Niveis/others e Niveis/words.'
            : 'Nenhum deck encontrado na pasta Niveis/words.';
          persistCardsState();
          queueScrollRestore();
          return;
        }

        const selectedDeck = selectedDeckId
          ? view.items.find((item) => item.id === selectedDeckId)
          : null;
        if (selectedDeck) {
          flashcardDecks = view.items.slice();
          showFlashcardDeck(config, selectedDeck);
        } else {
          showDeckLibrary(config, view.items);
        }
        persistCardsState();
        queueScrollRestore();
        return;
      }

      const unlockedDays = getUnlockedDays();
      selectedLibraryItem = null;

      if (!unlockedDays.length) {
        libraryItems = [];
        libraryConfig = null;
        disableLibraryCycling();
        grid.hidden = true;
        grid.innerHTML = '';
        grid.dataset.view = 'empty';
        spotlight.hidden = true;
        spotlightAction.hidden = true;
        spotlightAction.onclick = null;
        applyLayoutMode(activeTab === 'flashcards' || activeTab === 'palavras' ? 'cards' : 'play');
        selectedTitle.textContent = config.title;
        selectedCopy.textContent = activeTab === 'flashcards' || activeTab === 'palavras' ? config.copy : '';
        if (activeTab === 'flashcards' || activeTab === 'palavras') {
          emptyState.hidden = false;
          emptyState.textContent = 'Complete um dia inteiro da Jornada da Fluencia em /#home para comecar a abastecer esta biblioteca.';
        } else {
          spotlight.hidden = false;
          spotlightCover.innerHTML = '<div class="cards-selected-spotlight__cover-fallback">PT</div>';
          spotlightTitle.textContent = 'Sem conteudo liberado ainda';
        }
        persistCardsState();
        queueScrollRestore();
        return;
      }

      const view = await config.load(unlockedDays);
      if (!view.items.length) {
        libraryItems = [];
        libraryConfig = null;
        disableLibraryCycling();
        grid.hidden = true;
        grid.innerHTML = '';
        grid.dataset.view = 'empty';
        spotlight.hidden = true;
        spotlightAction.hidden = true;
        spotlightAction.onclick = null;
        applyLayoutMode(activeTab === 'flashcards' || activeTab === 'palavras' ? 'cards' : 'play');
        if (activeTab === 'flashcards' || activeTab === 'palavras') {
          emptyState.hidden = false;
          emptyState.textContent = 'Este conteudo ainda nao tem dados prontos para aparecer aqui.';
        } else {
          spotlight.hidden = false;
          spotlightCover.innerHTML = '<div class="cards-selected-spotlight__cover-fallback">PT</div>';
          spotlightTitle.textContent = 'Este conteudo ainda nao tem dados prontos para aparecer aqui.';
        }
        persistCardsState();
        queueScrollRestore();
        return;
      }

      emptyState.hidden = true;
      if (view.kind === 'flashcards') {
        libraryItems = [];
        libraryConfig = null;
        disableLibraryCycling();
        showOverview(config, null);
        renderFlashcards(view.items);
        persistCardsState();
        queueScrollRestore();
        return;
      }

      if (view.kind === 'words') {
        libraryItems = [];
        libraryConfig = null;
        disableLibraryCycling();
        showOverview(config, null);
        renderWords(view.items);
        persistCardsState();
        queueScrollRestore();
        return;
      }

      renderLibrary(view.items, config);
      persistCardsState();
      queueScrollRestore();
    }

    function setActiveTab(tabName) {
      activeTab = TAB_CONFIG[tabName] ? tabName : 'flashcards';
      page.dataset.cardsActiveTab = activeTab;
      if (activeTab === 'flashcards' || activeTab === 'palavras') {
        selectedLibrarySnapshot = null;
        selectedLibraryItem = null;
        libraryItems = [];
        libraryConfig = null;
      }
      if (activeTab !== 'flashcards' && activeTab !== 'palavras') {
        selectedDeckId = '';
      }
      tabs.forEach((tab) => {
        const isActive = tab.dataset.cardsTab === activeTab;
        tab.classList.toggle('is-active', isActive);
        if (isActive) {
          tab.setAttribute('aria-current', 'true');
        } else {
          tab.removeAttribute('aria-current');
        }
      });
      renderActiveTab().catch(() => {
        applyLayoutMode('cards');
        selectedTitle.textContent = TAB_CONFIG[activeTab]?.title || 'Cards';
        selectedCopy.textContent = TAB_CONFIG[activeTab]?.copy || '';
        grid.hidden = true;
        grid.innerHTML = '';
        emptyState.hidden = false;
        emptyState.textContent = 'Nao foi possivel carregar esta sessao agora.';
      });
    }

    if (!page.dataset.cardsBound) {
      tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
          setActiveTab(tab.dataset.cardsTab || 'flashcards');
        });
      });
      window.addEventListener('scroll', persistCardsState, { passive: true });
      window.addEventListener('storage', renderActiveTab);
      document.addEventListener('playtalk:player-state-change', renderActiveTab);
      document.addEventListener('playtalk:journey-progress', renderActiveTab);
      page.dataset.cardsBound = 'true';
    }

    setActiveTab(activeTab);
  }

  if (typeof window !== 'undefined' && typeof window.registerPlaytalkPage === 'function') {
    window.registerPlaytalkPage('page-cards', initCardsPage);
    return;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCardsPage, { once: true });
  } else {
    initCardsPage();
  }
})();



