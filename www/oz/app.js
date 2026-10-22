(() => {
  'use strict';

  const STORAGE_KEY = 'fluentlevelup:oz:opened-categories:v1';
  const MEMBER_KEY = 'fluentlevelup:oz:member:v1';
  const COUNTDOWN_KEY_PREFIX = 'fluentlevelup:oz:show-countdown:v1';
  const MUSICAL_LOCAL_CUTS_KEY = 'fluentlevelup:oz:musical-local-cuts:v1';
  const loginScreen = document.getElementById('loginScreen');
  const checklistApp = document.getElementById('checklistApp');
  const pageLoginForm = document.getElementById('pageLoginForm');
  const list = document.getElementById('categoryList');
  const dialog = document.getElementById('categoryDialog');
  const teamDialog = document.getElementById('teamDialog');
  const assignMenu = document.getElementById('taskAssignMenu');
  const statusDialog = document.getElementById('statusDialog');
  const statusOptions = document.getElementById('statusOptions');
  const subtaskDialog = document.getElementById('subtaskDialog');
  const subtaskForm = document.getElementById('newSubtaskForm');
  const notesDialog = document.getElementById('notesDialog');
  const microtaskNotesDialog = document.getElementById('microtaskNotesDialog');
  const starCelebrationDialog = document.getElementById('starCelebrationDialog');
  const starCelebrationAudio = document.getElementById('starCelebrationAudio');
  const badgeAlbumDialog = document.getElementById('badgeAlbumDialog');
  const badgeInfoDialog = document.getElementById('badgeInfoDialog');
  const badgeCelebrationDialog = document.getElementById('badgeCelebrationDialog');
  const badgeCelebrationAudio = document.getElementById('badgeCelebrationAudio');
  const categoryBadgeCelebrationAudio = document.getElementById('categoryBadgeCelebrationAudio');
  const profileAvatarDialog = document.getElementById('profileAvatarDialog');
  const profileAvatarInput = document.getElementById('profileAvatarInput');
  const profileAvatarPreview = document.getElementById('profileAvatarPreview');
  const profileAvatarError = document.getElementById('profileAvatarError');
  const saveProfileAvatar = document.getElementById('saveProfileAvatar');
  const musicalDialog = document.getElementById('ozMusicalDialog');
  const musicalAudio = document.getElementById('ozMusicalAudio');
  const musicalCover = document.getElementById('ozMusicalCover');
  const musicalCoverFallback = document.getElementById('ozMusicalCoverFallback');
  const musicalStatus = document.getElementById('ozMusicalStatus');
  const musicalTrackTitle = document.getElementById('ozMusicalTrackTitle');
  const musicalTrackNumber = document.getElementById('ozMusicalTrackNumber');
  const musicalCaption = document.getElementById('ozMusicalCaption');
  const musicalSeek = document.getElementById('ozMusicalSeek');
  const musicalCurrentTime = document.getElementById('ozMusicalCurrentTime');
  const musicalDuration = document.getElementById('ozMusicalDuration');
  const musicalPlay = document.getElementById('ozMusicalPlay');
  const musicalTrackList = document.getElementById('ozMusicalTrackList');
  const musicalListDialog = document.getElementById('ozMusicalListDialog');
  const musicalNotesButton = document.getElementById('ozMusicalNotes');
  const musicalNoteMarkers = document.getElementById('ozMusicalNoteMarkers');
  const musicalCutDialog = document.getElementById('ozMusicalCutDialog');
  const musicalNoteDialog = document.getElementById('ozMusicalNoteDialog');
  const musicalNoteList = document.getElementById('ozMusicalNoteList');
  const musicalNoteCurrent = document.getElementById('ozMusicalNoteCurrent');
  const musicalNoteTime = document.getElementById('ozMusicalNoteTime');
  const musicalNoteText = document.getElementById('ozMusicalNoteText');
  const musicalNoteEditor = document.getElementById('ozMusicalNoteEditor');
  const musicalNoteEmpty = document.getElementById('ozMusicalNoteEmpty');
  const musicalNoteActions = document.getElementById('ozMusicalNoteActions');
  const addMenu = document.getElementById('addMenu');
  const accountMenu = document.getElementById('accountMenu');
  const headerOptionsButton = document.getElementById('headerOptionsButton');
  const headerOptionsMenu = document.getElementById('headerOptionsMenu');
  const taskOptionsMenu = document.getElementById('taskOptionsMenu');
  let state = { categories: [], stars: 0, badges: [] };
  let members = [];
  let activeMember = null;
  let mutationQueue = Promise.resolve();
  let pendingMutations = 0;
  let holdTimer = 0;
  let holdStart = null;
  let ignoreLongPressClick = false;
  let assignTaskId = '';
  let statusTaskId = '';
  let subtaskParentId = '';
  let notesTaskId = '';
  let notesDraft = [];
  let notesIndex = 0;
  let notesMode = 'view';
  let notesSuccessTimer = 0;
  let starCelebrationTimer = 0;
  let badgeCelebrationTimer = 0;
  let badgeCelebrationQueue = [];
  let badgeCelebrationRunning = false;
  let profileAvatarDraft = '';
  let lastPayload = '';
  let musicalTracks = [];
  let musicalTrackIndex = 0;
  let musicalProjectLoaded = false;
  let musicalProjectLoading = false;
  let musicalNotes = [];
  let musicalNotesTrackId = '';
  let musicalLocalCuts = [];
  let musicalLocalPendingCut = null;
  let musicalReferenceCuts = [];
  let musicalLocalPendingReferenceCut = null;
  let musicalSourceWasEdited = false;
  let musicalCutDialogTimer = 0;
  let musicalNoteId = '';
  let musicalNoteMode = 'view';
  let musicalNoteDraftPosition = 0;
  const musicalTrackTitleOverrides = [
    'Abertura',
    'Além do arco íris',
    'Dorethy e pintinhos',
    'Dorethy e ovelinhas',
    'Furacão e Oz',
    'Dorothy e os Munchkins',
    'Fada e Dorothy',
    'Espantalho e Dorothy',
    'Homem de Lata',
    'Dorethy e o Leão',
    'Bruxa do Oeste'
  ];

  const readOpened = () => {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return new Set(Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : []);
    } catch (_error) {
      return new Set();
    }
  };
  const openedCategories = readOpened();
  let savedMemberId = '';
  try {
    const savedMember = JSON.parse(localStorage.getItem(MEMBER_KEY) || 'null');
    if (savedMember && typeof savedMember.id === 'string') savedMemberId = savedMember.id;
  } catch (_error) {}
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
  const persistOpened = () => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...openedCategories])); } catch (_error) {}
  };

  function stateFromPayload(payload) {
    return {
      categories: Array.isArray(payload.categories) ? payload.categories : [],
      stars: Number(payload.stars) || 0,
      badges: Array.isArray(payload.badges) ? payload.badges : []
    };
  }

  function countdownPreferenceKey() {
    return activeMember?.id ? `${COUNTDOWN_KEY_PREFIX}:${activeMember.id}` : '';
  }

  function isCountdownVisible() {
    const key = countdownPreferenceKey();
    if (!key) return true;
    try { return localStorage.getItem(key) !== 'hidden'; } catch (_error) { return true; }
  }

  function setCountdownVisible(visible) {
    const countdown = document.getElementById('eventCountdown');
    countdown.hidden = !visible;
    const key = countdownPreferenceKey();
    try {
      if (key) localStorage.setItem(key, visible ? 'visible' : 'hidden');
    } catch (_error) {}
    renderHeaderOptions();
  }

  function renderHeaderOptions() {
    const countdownVisible = isCountdownVisible();
    headerOptionsMenu.innerHTML = `
      <button type="button" role="menuitem" data-header-option="badges"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2.8 2.1 2.1 3-.1.8 2.9 2.6 1.5-1 2.8 1 2.8-2.6 1.5-.8 2.9-3-.1L12 21.2l-2.1-2.1-3 .1-.8-2.9-2.6-1.5 1-2.8-1-2.8 2.6-1.5.8-2.9 3 .1z"></path><path d="m8.7 12.1 2.1 2.1 4.6-4.6"></path></svg><span>Selos</span></button>
      <button type="button" role="menuitem" data-header-option="musical"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V5l10-2v13"></path><path d="M9 9l10-2M6.5 21A2.5 2.5 0 1 0 6.5 16a2.5 2.5 0 0 0 0 5ZM16.5 19a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"></path></svg><span>Musical</span></button>
      <button type="button" role="menuitem" data-header-option="countdown"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.3"></circle><path d="M12 7.5v5l3.2 1.8"></path></svg><span>${countdownVisible ? 'Ocultar contagem' : 'Mostrar contagem'}</span></button>`;
  }

  function musicalTime(seconds) {
    const total = Math.max(0, Math.floor(Number(seconds) || 0));
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
  }

  function showMusicalCutProgress() {
    if (!musicalCutDialog) return;
    window.clearTimeout(musicalCutDialogTimer);
    if (!musicalCutDialog.open) musicalCutDialog.showModal();
    musicalCutDialogTimer = window.setTimeout(() => {
      if (musicalCutDialog.open) musicalCutDialog.close();
    }, 900);
  }

  async function copyMusicalCutMarks() {
    const lines = musicalReferenceCuts
      .slice()
      .sort((left, right) => left.startSeconds - right.startSeconds)
      .map((cut, index) => `${index + 1}. ${musicalTime(cut.startSeconds)} - ${musicalTime(cut.endSeconds)}`);
    if (Number.isFinite(musicalLocalPendingReferenceCut)) {
      lines.push(`${lines.length + 1}. ${musicalTime(musicalLocalPendingReferenceCut)} - ponto aberto`);
    }
    const text = lines.length
      ? `Cortes da faixa (tempo original)\n${lines.join('\n')}`
      : 'Cortes da faixa (tempo original)\nNenhum corte marcado.';
    try {
      await navigator.clipboard.writeText(text);
    } catch (_error) {
      const helper = document.createElement('textarea');
      helper.value = text;
      helper.setAttribute('readonly', '');
      helper.style.position = 'fixed';
      helper.style.opacity = '0';
      document.body.appendChild(helper);
      helper.select();
      document.execCommand('copy');
      helper.remove();
    }
  }

  function musicalLocalCutStorage() {
    try {
      const value = JSON.parse(localStorage.getItem(MUSICAL_LOCAL_CUTS_KEY) || '{}');
      return value && typeof value === 'object' ? value : {};
    } catch (_error) { return {}; }
  }

  function musicalLocalCutKey(trackId) {
    return `${activeMember?.id || 'local'}:${trackId || ''}`;
  }

  function saveMusicalLocalCuts(trackId) {
    try {
      const storage = musicalLocalCutStorage();
      const track = musicalTracks.find((entry) => entry?.id === trackId);
      storage[musicalLocalCutKey(trackId)] = {
        sourceUpdatedAt: String(musicalTrackAudio(track)?.updatedAt || ''),
        cuts: musicalLocalCuts.slice(0, 5),
        referenceCuts: musicalReferenceCuts.slice(0, 5),
        history: musicalReferenceCuts.slice(0, 5),
        sourceWasEdited: musicalSourceWasEdited,
        pendingStartSeconds: Number.isFinite(musicalLocalPendingCut) ? musicalLocalPendingCut : null,
        pendingReferenceSeconds: Number.isFinite(musicalLocalPendingReferenceCut) ? musicalLocalPendingReferenceCut : null
      };
      localStorage.setItem(MUSICAL_LOCAL_CUTS_KEY, JSON.stringify(storage));
    } catch (_error) {}
  }

  function loadMusicalLocalCuts(trackId) {
    const storage = musicalLocalCutStorage();
    const storedValue = storage[musicalLocalCutKey(trackId)];
    const track = musicalTracks.find((entry) => entry?.id === trackId);
    const sourceUpdatedAt = String(musicalTrackAudio(track)?.updatedAt || '');
    const sourceChanged = !Array.isArray(storedValue)
      && storedValue?.sourceUpdatedAt
      && sourceUpdatedAt
      && storedValue.sourceUpdatedAt !== sourceUpdatedAt;
    const stored = (Array.isArray(storedValue)
      ? storedValue
      : (sourceChanged ? [] : storedValue?.cuts)) || [];
    musicalLocalCuts = stored
      .map((entry) => ({ startSeconds: Number(entry?.startSeconds), endSeconds: Number(entry?.endSeconds), timestamp: String(entry?.timestamp || '') }))
      .filter((entry) => Number.isFinite(entry.startSeconds) && Number.isFinite(entry.endSeconds) && entry.endSeconds > entry.startSeconds)
      .sort((left, right) => left.startSeconds - right.startSeconds);
    const references = Array.isArray(storedValue?.history)
      ? storedValue.history
      : (Array.isArray(storedValue?.referenceCuts) ? storedValue.referenceCuts : stored);
    musicalReferenceCuts = references
      .map((entry) => ({ startSeconds: Number(entry?.startSeconds), endSeconds: Number(entry?.endSeconds), timestamp: String(entry?.timestamp || '') }))
      .filter((entry) => Number.isFinite(entry.startSeconds) && Number.isFinite(entry.endSeconds) && entry.endSeconds > entry.startSeconds)
      .sort((left, right) => left.startSeconds - right.startSeconds)
      .slice(-5);
    musicalSourceWasEdited = Boolean(sourceChanged || storedValue?.sourceWasEdited);
    const pending = storedValue && !Array.isArray(storedValue) ? Number(storedValue.pendingStartSeconds) : NaN;
    const pendingReference = storedValue && !Array.isArray(storedValue) ? Number(storedValue.pendingReferenceSeconds) : NaN;
    musicalLocalPendingCut = Number.isFinite(pending) && pending >= 0 ? pending : null;
    musicalLocalPendingReferenceCut = Number.isFinite(pendingReference) && pendingReference >= 0
      ? pendingReference
      : musicalLocalPendingCut;
  }

  function musicalEditedDuration(originalDuration) {
    return Math.max(0, Number(originalDuration) - musicalLocalCuts.reduce((total, cut) => total + (cut.endSeconds - cut.startSeconds), 0));
  }

  function musicalAppliedReferenceCuts() {
    const localTimestamps = new Set(musicalLocalCuts.map((cut) => cut.timestamp).filter(Boolean));
    return musicalReferenceCuts.filter((cut) => !cut.timestamp || !localTimestamps.has(cut.timestamp));
  }

  function musicalOriginalToEditedWithCuts(seconds, cuts) {
    const original = Math.max(0, Number(seconds) || 0);
    let edited = original;
    for (const cut of cuts) {
      if (original <= cut.startSeconds) break;
      if (original < cut.endSeconds) return Math.max(0, cut.startSeconds - cuts.slice(0, cuts.indexOf(cut)).reduce((sum, item) => sum + (item.endSeconds - item.startSeconds), 0));
      edited -= cut.endSeconds - cut.startSeconds;
    }
    return Math.max(0, edited);
  }

  function musicalOriginalToEdited(seconds) {
    return musicalOriginalToEditedWithCuts(seconds, musicalLocalCuts);
  }

  function musicalEditedToOriginal(seconds, cuts = musicalLocalCuts) {
    let remaining = Math.max(0, Number(seconds) || 0);
    let original = 0;
    for (const cut of cuts) {
      const segment = Math.max(0, cut.startSeconds - original);
      if (remaining <= segment) return original + remaining;
      remaining -= segment;
      original = cut.endSeconds;
    }
    return original + remaining;
  }

  function musicalSkipLocalCut() {
    const current = Number(musicalAudio.currentTime) || 0;
    const cut = musicalLocalCuts.find((entry) => current >= entry.startSeconds && current < entry.endSeconds);
    if (cut) musicalAudio.currentTime = cut.endSeconds;
  }

  function ensureMusicalLocalPendingMarker() {
    if (!Number.isFinite(musicalLocalPendingCut)) return;
    const exists = musicalNotes.some((note) => Math.abs(Number(note.positionSeconds) - musicalLocalPendingCut) < 0.05
      && (Boolean(note.isCut) || /^corte$/i.test(String(note.text || '').trim())));
    if (!exists) {
      musicalNotes.push({
        id: `local-cut-${musicalNotesTrackId}-${musicalLocalPendingCut}`,
        cardId: musicalNotesTrackId,
        positionSeconds: musicalLocalPendingCut,
        text: 'Corte',
        isCut: true,
        createdAt: '',
        updatedAt: ''
      });
    }
  }

  function registerMusicalLocalCutMarker(positionSeconds) {
    const position = Math.max(0, Number(positionSeconds) || 0);
    const referencePosition = musicalSourceWasEdited
      ? musicalEditedToOriginal(position, musicalAppliedReferenceCuts())
      : position;
    if (!Number.isFinite(musicalLocalPendingCut)) {
      musicalLocalPendingCut = position;
      musicalLocalPendingReferenceCut = referencePosition;
      ensureMusicalLocalPendingMarker();
      saveMusicalLocalCuts(musicalNotesTrackId);
      return false;
    }
    const startSeconds = Math.min(musicalLocalPendingCut, position);
    const endSeconds = Math.max(musicalLocalPendingCut, position);
    if (endSeconds - startSeconds < 0.05) return false;
    const timestamp = new Date().toISOString();
    musicalLocalCuts.push({ startSeconds, endSeconds, timestamp });
    musicalLocalCuts.sort((left, right) => left.startSeconds - right.startSeconds);
    musicalLocalCuts = musicalLocalCuts.slice(-5);
    const referenceStart = Math.min(musicalLocalPendingReferenceCut, referencePosition);
    const referenceEnd = Math.max(musicalLocalPendingReferenceCut, referencePosition);
    musicalReferenceCuts.push({ startSeconds: referenceStart, endSeconds: referenceEnd, timestamp });
    musicalReferenceCuts.sort((left, right) => left.startSeconds - right.startSeconds);
    musicalReferenceCuts = musicalReferenceCuts.slice(-5);
    musicalLocalPendingCut = null;
    musicalLocalPendingReferenceCut = null;
    musicalNotes = musicalNotes.filter((note) => {
      const isCut = Boolean(note.isCut) || /^corte$/i.test(String(note.text || '').trim());
      return !isCut && !String(note.id || '').startsWith('local-cut-');
    });
    saveMusicalLocalCuts(musicalNotesTrackId);
    return true;
  }

  function undoMusicalLocalCut(trackId) {
    if (!musicalLocalCuts.length && !musicalReferenceCuts.length) return false;
    const lastCut = musicalLocalCuts.length ? musicalLocalCuts.pop() : null;
    const referenceIndex = lastCut
      ? musicalReferenceCuts.findIndex((entry) => entry.timestamp && entry.timestamp === lastCut.timestamp)
      : musicalReferenceCuts.length - 1;
    const referenceCut = referenceIndex >= 0 ? musicalReferenceCuts[referenceIndex] : null;
    if (referenceIndex >= 0) musicalReferenceCuts.splice(referenceIndex, 1);
    const matchingMarkers = musicalNotes
      .filter((note) => Boolean(note.isCut) || /^corte$/i.test(String(note.text || '').trim()))
      .sort((left, right) => Number(right.positionSeconds) - Number(left.positionSeconds));
    const markerToRemove = lastCut
      ? matchingMarkers.find((note) => Math.abs(Number(note.positionSeconds) - lastCut.endSeconds) < 0.05)
      : null;
    if (markerToRemove) musicalNotes = musicalNotes.filter((note) => note.id !== markerToRemove.id);
    const pendingReference = referenceCut?.startSeconds ?? lastCut?.startSeconds;
    if (!Number.isFinite(pendingReference)) return false;
    musicalLocalPendingReferenceCut = pendingReference;
    musicalLocalPendingCut = lastCut
      ? lastCut.startSeconds
      : musicalOriginalToEditedWithCuts(pendingReference, musicalReferenceCuts);
    ensureMusicalLocalPendingMarker();
    saveMusicalLocalCuts(trackId);
    renderMusicalNoteMarkers();
    updateMusicalPlayer();
    return true;
  }

  function musicalAssetUrl(url, fallback = '') {
    const value = String(url || fallback || '').trim();
    if (!value) return '';
    try { return new URL(value, window.location.origin).href; } catch (_error) { return value; }
  }

  function musicalTrackAudio(track) {
    if (track?.audio?.url) return track.audio;
    return Array.isArray(track?.audioTracks) ? track.audioTracks.find((entry) => entry?.url) || null : null;
  }

  function getMusicalTrackTitle(track, index) {
    return musicalTrackTitleOverrides[index] || String(track?.title || `Faixa ${index + 1}`).trim();
  }

  function setMusicalCaptionText(value) {
    const next = String(value || 'Legenda ainda não disponível.').trim();
    if (musicalCaption.textContent === next) return;
    musicalCaption.classList.remove('is-dissolving');
    void musicalCaption.offsetWidth;
    musicalCaption.textContent = next;
    musicalCaption.classList.add('is-dissolving');
  }

  function renderMusicalCaption() {
    const track = musicalTracks[musicalTrackIndex];
    const lines = Array.isArray(track?.lyrics?.lines)
      ? track.lyrics.lines.filter((line) => String(line?.text || line?.textPt || '').trim())
      : [];
    if (!lines.length) {
      setMusicalCaptionText('Legenda ainda não disponível.');
      return;
    }
    const time = Number(musicalAudio.currentTime) || 0;
    let active = lines.findIndex((line) => Number.isFinite(Number(line.start)) && Number(line.start) <= time && (line.end == null || time < Number(line.end)));
    if (active < 0) {
      active = lines.reduce((last, line, index) => Number.isFinite(Number(line.start)) && Number(line.start) <= time ? index : last, -1);
    }
    const text = lines[Math.max(0, active)]?.text || lines[Math.max(0, active)]?.textPt || lines[0]?.text || lines[0]?.textPt;
    setMusicalCaptionText(text);
  }

  function updateMusicalPlayer() {
    const track = musicalTracks[musicalTrackIndex];
    musicalSkipLocalCut();
    const originalDuration = Number.isFinite(musicalAudio.duration) ? musicalAudio.duration : 0;
    const duration = musicalEditedDuration(originalDuration);
    const position = musicalOriginalToEdited(Number(musicalAudio.currentTime) || 0);
    musicalSeek.max = String(Math.max(0, duration));
    musicalSeek.value = String(Math.min(position, duration || position));
    musicalCurrentTime.textContent = musicalTime(position);
    musicalDuration.textContent = musicalTime(duration);
    musicalPlay.classList.toggle('is-playing', !musicalAudio.paused && Boolean(track));
    musicalPlay.setAttribute('aria-label', musicalAudio.paused ? 'Reproduzir' : 'Pausar');
    musicalPlay.title = musicalAudio.paused ? 'Reproduzir' : 'Pausar';
    renderMusicalCaption();
  }

  function renderMusicalTrackList() {
    musicalTrackList.innerHTML = musicalTracks.length
      ? musicalTracks.map((track, index) => {
        const image = musicalAssetUrl(track.image?.url, '/oz/oz-musical-cover.webp');
        const title = getMusicalTrackTitle(track, index);
        const active = index === musicalTrackIndex;
        return `<button class="oz-musical-track-option ${active ? 'is-active' : ''} ${active && !musicalAudio.paused ? 'is-playing' : ''}" type="button" role="option" aria-selected="${active}" data-musical-index="${index}"><img src="${escapeHtml(image)}" alt=""><span><strong>${escapeHtml(title)}</strong><small>Faixa ${index + 1}</small></span><span aria-hidden="true">${active && !musicalAudio.paused ? '▶' : ''}</span></button>`;
      }).join('')
      : '<p class="oz-musical-empty">Nenhuma faixa disponível.</p>';
  }

  function renderMusicalNoteMarkers() {
    const duration = musicalEditedDuration(Number.isFinite(musicalAudio.duration) ? musicalAudio.duration : 0);
    const visibleNotes = musicalNotes.filter((note) => {
      const isCut = Boolean(note.isCut) || /^corte$/i.test(String(note.text || '').trim());
      return !isCut || String(note.id || '').startsWith('local-cut-');
    });
    musicalNoteMarkers.innerHTML = duration > 0
      ? visibleNotes.map((note) => {
        const position = Math.min(100, Math.max(0, (musicalOriginalToEdited(Number(note.positionSeconds)) / duration) * 100));
        const isCut = Boolean(note.isCut) || /^corte$/i.test(String(note.text || '').trim());
        return `<button class="oz-musical-note-marker ${isCut ? 'is-cut' : ''}" type="button" data-musical-note-id="${escapeHtml(note.id)}" style="left:${position}%" aria-label="Abrir nota em ${musicalTime(note.positionSeconds)}" title="${isCut ? 'Corte' : 'Nota'} em ${musicalTime(note.positionSeconds)}"></button>`;
      }).join('')
      : '';
    musicalNotesButton.classList.toggle('has-notes', visibleNotes.length > 0);
  }

  async function loadMusicalNotes(trackId) {
    musicalNotes = [];
    musicalNotesTrackId = trackId || '';
    renderMusicalNoteMarkers();
    if (!trackId || !activeMember?.id || (!activeMember.isKelly && String(activeMember.name || '').trim().toLocaleLowerCase('pt-BR') !== 'lucas')) return;
    try {
      const response = await fetch(`/api/oz/musical/notes/${encodeURIComponent(trackId)}`, {
        headers: { Accept: 'application/json', 'x-oz-member-id': activeMember.id },
        cache: 'no-store'
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.success === false) throw new Error(payload.message || 'Não foi possível carregar as notas.');
      if (musicalNotesTrackId !== trackId) return;
      musicalNotes = Array.isArray(payload.notes) ? payload.notes : [];
      ensureMusicalLocalPendingMarker();
      renderMusicalNoteMarkers();
    } catch (_error) {
      musicalNotes = [];
      renderMusicalNoteMarkers();
    }
  }

  function musicalNoteById(noteId) {
    return musicalNotes.find((note) => note.id === noteId) || null;
  }

  function renderMusicalNotesDialog() {
    const selected = musicalNoteById(musicalNoteId);
    const editing = musicalNoteMode === 'new' || musicalNoteMode === 'edit';
    musicalNoteList.innerHTML = '';
    musicalNoteList.hidden = true;
    musicalNoteCurrent.hidden = !selected && !editing;
    musicalNoteEmpty.textContent = 'Toque em um tracinho amarelo para ver a nota.';
    musicalNoteEmpty.hidden = Boolean(selected || editing);
    musicalNoteTime.textContent = selected ? `Marcada em ${musicalTime(musicalOriginalToEdited(selected.positionSeconds))}` : `Nova nota em ${musicalTime(musicalOriginalToEdited(musicalNoteDraftPosition))}`;
    musicalNoteText.textContent = selected?.text || '';
    musicalNoteText.hidden = editing;
    musicalNoteEditor.hidden = !editing;
    musicalNoteEditor.value = editing ? (selected?.text || '') : '';
    if (editing) musicalNoteEditor.focus();
    if (editing) {
      musicalNoteActions.innerHTML = '<button type="button" data-musical-note-action="cancel">Cancelar</button><button class="is-primary" type="button" data-musical-note-action="save" aria-label="Salvar nota" title="Salvar nota"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"></circle><path d="m8 12.2 2.6 2.6 5.5-5.5"></path></svg></button>';
    } else if (selected && activeMember?.isKelly) {
      musicalNoteActions.innerHTML = '<button type="button" data-musical-note-action="edit">Editar</button><button class="is-danger" type="button" data-musical-note-action="delete">Apagar</button>';
    } else if (activeMember?.isKelly) {
      musicalNoteActions.innerHTML = '<button class="is-primary" type="button" data-musical-note-action="add">Adicionar nota</button>';
    } else {
      musicalNoteActions.innerHTML = '';
    }
  }

  function openMusicalNotes(noteId = '') {
    const currentTime = Number(musicalAudio.currentTime) || 0;
    const nearby = !noteId && activeMember?.isKelly
      ? musicalNotes.find((note) => Math.abs(Number(note.positionSeconds) - currentTime) < 1)
      : null;
    musicalNoteId = noteId || nearby?.id || '';
    musicalNoteDraftPosition = nearby ? Number(nearby.positionSeconds) : currentTime;
    musicalNoteMode = nearby && activeMember?.isKelly ? 'edit' : 'view';
    if (!musicalNoteId && activeMember?.isKelly) musicalNoteMode = 'new';
    renderMusicalNotesDialog();
    if (!musicalNoteDialog.open) musicalNoteDialog.showModal();
  }

  async function saveMusicalNote() {
    if (!activeMember?.isKelly || !musicalNotesTrackId) return;
    const text = musicalNoteEditor.value.trim();
    if (!text) return;
    const isCutNote = /^corte$/i.test(text);
    const isUndoNote = /^desfazer$/i.test(text);
    const isCopyCommand = /^copiar$/i.test(text);
    if (isCopyCommand) {
      await copyMusicalCutMarks();
      musicalNoteId = '';
      musicalNoteMode = 'view';
      musicalNoteDialog.close();
      return;
    }
    if (isUndoNote) {
      if (!undoMusicalLocalCut(musicalNotesTrackId)) throw new Error('Não há um corte local recente para desfazer.');
      fetch(`/api/oz/musical/notes/${encodeURIComponent(musicalNotesTrackId)}`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'x-oz-member-id': activeMember.id },
        body: JSON.stringify({ text: 'desfazer', positionSeconds: Number(musicalAudio.currentTime) || 0 })
      }).catch(() => {});
      musicalNoteId = '';
      musicalNoteMode = 'view';
      musicalNoteDialog.close();
      return;
    }
    const noteId = musicalNoteId;
    const method = noteId ? 'PATCH' : 'POST';
    const endpoint = noteId
      ? `/api/oz/musical/notes/${encodeURIComponent(musicalNotesTrackId)}/${encodeURIComponent(noteId)}`
      : `/api/oz/musical/notes/${encodeURIComponent(musicalNotesTrackId)}`;
    const response = await fetch(endpoint, {
      method,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'x-oz-member-id': activeMember.id },
      body: JSON.stringify({ text, positionSeconds: noteId ? Number(musicalNoteById(noteId)?.positionSeconds || musicalNoteDraftPosition) : musicalNoteDraftPosition })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.success === false) throw new Error(payload.message || 'Não foi possível salvar a nota.');
    musicalNotes = Array.isArray(payload.notes) ? payload.notes : musicalNotes;
    const saved = noteId
      ? musicalNoteById(noteId)
      : musicalNotes.reduce((closest, note) => !closest || Math.abs(Number(note.positionSeconds) - musicalNoteDraftPosition) < Math.abs(Number(closest.positionSeconds) - musicalNoteDraftPosition) ? note : closest, null);
    musicalNoteId = saved?.id || '';
    musicalNoteMode = 'view';
    if (isCutNote) {
      const markerPosition = noteId
        ? Number(musicalNoteById(noteId)?.positionSeconds || musicalNoteDraftPosition)
        : musicalNoteDraftPosition;
      registerMusicalLocalCutMarker(markerPosition);
      ensureMusicalLocalPendingMarker();
      if (musicalLocalPendingCut === null) {
        showMusicalCutProgress();
        updateMusicalPlayer();
      }
    }
    renderMusicalNoteMarkers();
    musicalNoteDialog.close();
  }

  async function deleteMusicalNote() {
    if (!activeMember?.isKelly || !musicalNotesTrackId || !musicalNoteId) return;
    if (!window.confirm('Apagar esta nota da faixa?')) return;
    const response = await fetch(`/api/oz/musical/notes/${encodeURIComponent(musicalNotesTrackId)}/${encodeURIComponent(musicalNoteId)}`, {
      method: 'DELETE', headers: { Accept: 'application/json', 'x-oz-member-id': activeMember.id }
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.success === false) throw new Error(payload.message || 'Não foi possível apagar a nota.');
    musicalNotes = Array.isArray(payload.notes) ? payload.notes : [];
    musicalNoteId = musicalNotes[0]?.id || '';
    musicalNoteMode = 'view';
    renderMusicalNoteMarkers();
    renderMusicalNotesDialog();
  }

  function setMusicalTrack(index, { autoplay = false } = {}) {
    if (!musicalTracks.length) return;
    musicalTrackIndex = (Number(index) + musicalTracks.length) % musicalTracks.length;
    const track = musicalTracks[musicalTrackIndex];
    loadMusicalLocalCuts(track.id);
    const audio = musicalTrackAudio(track);
    const title = getMusicalTrackTitle(track, musicalTrackIndex);
    musicalAudio.pause();
    musicalAudio.removeAttribute('src');
    musicalAudio.load();
    musicalTrackTitle.textContent = title;
    musicalTrackNumber.textContent = `Faixa ${musicalTrackIndex + 1} de ${musicalTracks.length}`;
    musicalStatus.textContent = audio?.url ? 'Espetáculo Arabesque' : 'Áudio indisponível';
    musicalCurrentTime.textContent = '0:00';
    musicalDuration.textContent = '0:00';
    musicalSeek.value = '0';
    musicalSeek.max = '0';
    const imageUrl = '/oz/oz-musical-cover.webp';
    musicalCover.classList.remove('is-ready');
    musicalCoverFallback.hidden = false;
    if (imageUrl) {
      musicalCover.onload = () => { musicalCover.classList.add('is-ready'); musicalCoverFallback.hidden = true; };
      musicalCover.onerror = () => { musicalCover.classList.remove('is-ready'); musicalCoverFallback.hidden = false; };
      musicalCover.src = imageUrl;
    } else {
      musicalCover.removeAttribute('src');
    }
    if (audio?.url) {
      musicalAudio.src = musicalAssetUrl(audio.url);
      musicalAudio.load();
    }
    loadMusicalNotes(track.id).catch(() => {});
    renderMusicalTrackList();
    renderMusicalNoteMarkers();
    updateMusicalPlayer();
    if (autoplay && audio?.url) {
      const playback = musicalAudio.play();
      if (playback?.catch) playback.catch(() => {});
    }
  }

  async function loadMusicalProject() {
    if (musicalProjectLoaded || musicalProjectLoading) return;
    musicalProjectLoading = true;
    musicalStatus.textContent = 'Carregando faixas…';
    try {
      const response = await fetch('/api/musical-kelly/project', { headers: { Accept: 'application/json' }, cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.success === false) throw new Error(payload.message || 'Não foi possível carregar o musical.');
      musicalTracks = Array.isArray(payload.project?.cards)
        ? payload.project.cards.filter((track) => musicalTrackAudio(track)?.url)
        : [];
      musicalProjectLoaded = true;
      if (musicalTracks.length) setMusicalTrack(0);
      else musicalStatus.textContent = 'Nenhuma faixa disponível.';
    } catch (error) {
      musicalStatus.textContent = error.message || 'Não foi possível carregar o musical.';
      setMusicalCaptionText('Tente novamente em instantes.');
    } finally {
      musicalProjectLoading = false;
    }
  }

  function openMusical() {
    if (!musicalDialog.open) musicalDialog.showModal();
    loadMusicalProject().catch(() => {});
  }

  function sortBadgesForAlbum(badges) {
    return [...(Array.isArray(badges) ? badges : [])].sort((left, right) => {
      const leftMission = left?.group === 'missao';
      const rightMission = right?.group === 'missao';
      if (leftMission !== rightMission) return leftMission ? -1 : 1;
      if (leftMission && rightMission) return Number(left.threshold || 0) - Number(right.threshold || 0);
      return 0;
    });
  }

  function renderBadgeAlbum() {
    const badges = sortBadgesForAlbum(state.badges);
    const unlocked = badges.filter((badge) => badge.unlocked).length;
    document.getElementById('badgeAlbumCount').textContent = `${unlocked}/${badges.length || 40}`;
    document.getElementById('badgeAlbumGrid').innerHTML = badges.map((badge) => `
      <article class="badge-card ${badge.unlocked ? 'is-unlocked' : ''}">
        <button class="badge-info" type="button" data-badge-info="${escapeHtml(badge.id)}" aria-label="Como desbloquear ${escapeHtml(badge.title)}">i</button>
        <span class="badge-card-seal"><img src="${escapeHtml(badge.image)}" alt=""></span>
        <strong>${escapeHtml(badge.title)}</strong>
        <span>${escapeHtml(badge.description)}</span>
      </article>`).join('');
  }

  function getBadgeProgress(badge) {
    const items = state.categories.flatMap((category) => flattenItems(category.items || []));
    const completed = items.filter((item) => getItemStatus(item) === 'completed').length;
    if (badge.group === 'categoria') {
      const category = state.categories.find((entry) => entry.id === badge.categoryId);
      const categoryItems = category ? flattenItems(category.items || []) : [];
      return { value: categoryItems.filter((item) => getItemStatus(item) === 'completed').length, max: categoryItems.length };
    }
    if (badge.group === 'delegacao') {
      const delegated = items.filter((item) => item.assigneeId && item.assigneeId !== activeMember?.id).length;
      return { value: delegated, max: badge.threshold };
    }
    if (badge.group === 'missao') return { value: completed, max: badge.threshold };
    if (badge.id === 'finale:show-completo') return { value: completed, max: items.length };
    if (badge.id === 'finale:lenda-de-oz') {
      const delegated = items.filter((item) => item.assigneeId && item.assigneeId !== activeMember?.id).length;
      return { value: Math.min(completed, delegated), max: Math.max(items.length, 50) };
    }
    return { value: badge.unlocked ? 1 : 0, max: 1 };
  }

  function openBadgeInfo(badge) {
    const progress = getBadgeProgress(badge);
    const percent = progress.max ? Math.min(100, Math.round((progress.value / progress.max) * 100)) : 0;
    const image = document.getElementById('badgeInfoImage');
    image.src = badge.image;
    image.alt = `Selo ${badge.title}`;
    image.classList.toggle('is-unlocked', Boolean(badge.unlocked));
    document.getElementById('badgeInfoTitle').textContent = badge.title;
    document.getElementById('badgeInfoProgressBar').style.width = `${percent}%`;
    const progressbar = document.querySelector('.badge-info-progress');
    progressbar.setAttribute('aria-valuenow', String(percent));
    document.getElementById('badgeInfoProgressLabel').textContent = badge.unlocked ? 'Selo desbloqueado' : 'Progresso do selo';
    document.getElementById('badgeInfoInstruction').textContent = badge.unlockText;
    if (!badgeInfoDialog.open) badgeInfoDialog.showModal();
  }

  function openBadgeAlbum() {
    renderBadgeAlbum();
    if (!badgeAlbumDialog.open) badgeAlbumDialog.showModal();
  }

  function playBadgeCelebrationAudio(badge) {
    const audio = badge.group === 'categoria' ? categoryBadgeCelebrationAudio : badgeCelebrationAudio;
    audio.currentTime = 0;
    const playback = audio.play();
    if (playback && typeof playback.catch === 'function') playback.catch(() => {});
  }

  function playNextBadgeCelebration() {
    if (badgeCelebrationRunning || !badgeCelebrationQueue.length) return;
    const badge = badgeCelebrationQueue.shift();
    badgeCelebrationRunning = true;
    document.getElementById('badgeCelebrationTitle').textContent = badge.title;
    document.getElementById('badgeCelebrationDescription').textContent = badge.description;
    const image = document.getElementById('badgeCelebrationImage');
    image.src = badge.image;
    image.alt = `Selo ${badge.title}`;
    if (badgeCelebrationDialog.open) badgeCelebrationDialog.close();
    badgeCelebrationDialog.showModal();
    badgeCelebrationDialog.classList.remove('is-animating');
    void badgeCelebrationDialog.offsetWidth;
    badgeCelebrationDialog.classList.add('is-animating');
    playBadgeCelebrationAudio(badge);
    window.clearTimeout(badgeCelebrationTimer);
    badgeCelebrationTimer = window.setTimeout(() => {
      badgeCelebrationDialog.classList.remove('is-animating');
      if (badgeCelebrationDialog.open) badgeCelebrationDialog.close();
      badgeCelebrationRunning = false;
      playNextBadgeCelebration();
    }, 2400);
  }

  function queueBadgeCelebrations(badges, delay = 0) {
    const next = (Array.isArray(badges) ? badges : []).filter((badge) => badge?.id);
    if (!next.length) return;
    window.setTimeout(() => {
      badgeCelebrationQueue.push(...next);
      playNextBadgeCelebration();
    }, delay);
  }

  function updateOverview() {
    const items = state.categories.flatMap((category) => flattenItems(category.items || []));
    const done = items.filter((item) => item.completed).length;
    const rate = items.length ? Math.round((done / items.length) * 100) : 0;
    document.getElementById('overallPercent').textContent = `${rate}%`;
    document.getElementById('overallBar').style.width = `${rate}%`;
    document.getElementById('overallSummary').textContent = `${done} de ${items.length} tarefas concluídas`;
    document.getElementById('starCount').textContent = String(Math.max(0, Number(state.stars) || 0));
  }

  function showStarCelebration(stars) {
    const count = Math.max(0, Number(stars) || 0);
    if (!count) return;
    window.clearTimeout(starCelebrationTimer);
    document.getElementById('awardedStars').textContent = `${count} ${count === 1 ? 'estrela' : 'estrelas'}`;
    document.getElementById('starCelebrationEarned').innerHTML = Array.from({ length: count }, (_, index) => `<img src="/oz/icons/star.svg" alt="" style="--star-index:${index}">`).join('');
    if (starCelebrationDialog.open) starCelebrationDialog.close();
    starCelebrationDialog.showModal();
    starCelebrationDialog.classList.remove('is-animating');
    void starCelebrationDialog.offsetWidth;
    starCelebrationDialog.classList.add('is-animating');
    starCelebrationAudio.currentTime = 0;
    const playback = starCelebrationAudio.play();
    if (playback && typeof playback.catch === 'function') playback.catch(() => {});
    starCelebrationTimer = window.setTimeout(() => {
      starCelebrationDialog.classList.remove('is-animating');
      if (starCelebrationDialog.open) starCelebrationDialog.close();
    }, 1800);
  }

  function getItemStatus(item) {
    if (['pending', 'completed', 'in_progress'].includes(item.status)) return item.status;
    return item.completed ? 'completed' : 'pending';
  }

  function statusLabel(status) {
    return ({ pending: 'Pendente', completed: 'Concluído', in_progress: 'Em andamento' })[status] || 'Pendente';
  }

  function statusIcon(status) {
    if (status === 'completed') return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.3"></circle><path d="m8.3 12.2 2.4 2.4 5-5"></path></svg>';
    if (status === 'in_progress') return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.3"></circle><path d="M12 7.5v5l3.2 1.8"></path></svg>';
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.3"></circle></svg>';
  }

  function flattenItems(items) {
    return items.flatMap((item) => [item, ...flattenItems(Array.isArray(item.subtasks) ? item.subtasks : [])]);
  }

  function findItemById(itemId) {
    return state.categories
      .flatMap((category) => flattenItems(category.items || []))
      .find((item) => item.id === itemId) || null;
  }

  function renderTask(item, { flat = false, urgentReplica = false } = {}) {
    const itemStatus = getItemStatus(item);
    const subtasks = flat ? [] : (Array.isArray(item.subtasks) ? item.subtasks : []);
    const taskOpenKey = `task:${item.id}`;
    const isOpen = openedCategories.has(taskOpenKey);
    const hasSubtasks = subtasks.length > 0;
    const hasNotes = Array.isArray(item.notes) && item.notes.length > 0;
    const assigneeMarkup = item.assigneeName
      ? `<button class="task-assignee-toggle" type="button" data-action="open-task-assign" data-id="${escapeHtml(item.id)}" aria-label="Responsável: ${escapeHtml(item.assigneeName)}. Abrir opções de delegação" title="Opções de delegação">${avatarSvg()}</button>`
      : '';
    return `<div class="task-node">
      <div class="task-row ${urgentReplica ? 'task-row--urgent' : ''} ${itemStatus === 'completed' ? 'is-done' : ''} ${itemStatus === 'in_progress' ? 'is-in-progress' : ''}" data-task-id="${escapeHtml(item.id)}">
        <span class="task-controls">
          <button class="item-status status-${itemStatus}" type="button" aria-label="${statusLabel(itemStatus)}" title="${statusLabel(itemStatus)}">${statusIcon(itemStatus)}</button>
          <button class="task-options-toggle ${hasNotes ? 'has-notes' : ''}" type="button" data-action="open-task-options" data-id="${escapeHtml(item.id)}" aria-haspopup="menu" aria-expanded="false" aria-label="Opções da tarefa${hasNotes ? ' — possui notas' : ''}" title="Opções da tarefa"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="1.7"></circle><circle cx="12" cy="12" r="1.7"></circle><circle cx="12" cy="19" r="1.7"></circle></svg></button>
        </span>
        <span class="task-copy"><span class="task-title-line ${item.assigneeName ? 'has-assignee' : ''}"><span class="task-title">${escapeHtml(item.title)}</span>${assigneeMarkup}</span></span>
        ${hasSubtasks ? `<button class="task-toggle ${isOpen ? 'is-open' : ''}" type="button" data-action="toggle-subtasks" data-id="${escapeHtml(item.id)}" aria-expanded="${isOpen}" aria-controls="subtasks-${escapeHtml(item.id)}" aria-label="${isOpen ? 'Recolher' : 'Abrir'} sub tarefas"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"></path></svg></button>` : ''}
        ${hasNotes ? `<button class="task-note-indicator" type="button" data-action="open-task-notes-scroll" data-id="${escapeHtml(item.id)}" aria-label="Abrir notas da tarefa" title="Abrir notas"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3.75h8l4 4V20.25H6z"></path><path d="M14 3.75v4h4M9 12h6M9 15.5h6"></path></svg></button>` : ''}
      </div>
      ${hasSubtasks ? `<div class="subtask-list" id="subtasks-${escapeHtml(item.id)}" ${isOpen ? '' : 'hidden'}>${subtasks.map((subtask) => renderTask(subtask)).join('')}</div>` : ''}
    </div>`;
  }

  function renderCategory(category) {
    const items = Array.isArray(category.items) ? category.items : [];
    const categoryTitle = String(category.title || category.name || category.id || 'Categoria').trim();
    const allItems = flattenItems(items);
    const doneCount = allItems.filter((item) => getItemStatus(item) === 'completed').length;
    const itemRate = allItems.length ? Math.round((doneCount / allItems.length) * 100) : 0;
    const isOpen = openedCategories.has(category.id);
    const categoryComplete = Boolean(category.completed);
    const cardClasses = ['category-card', isOpen ? 'is-open' : '', categoryComplete ? 'is-complete' : ''].filter(Boolean).join(' ');
    const grouped = new Map();
    const names = [...(Array.isArray(category.groups) ? category.groups : [])];
    for (const item of items) if (item.group && !names.includes(item.group)) names.push(item.group);
    if (names.some(Boolean)) grouped.set('', items.filter((item) => !item.group));
    for (const name of names) grouped.set(name, items.filter((item) => item.group === name));
    if (!grouped.size) grouped.set('', items);

    const groupMarkup = [...grouped.entries()].map(([name, groupItems]) => {
      const taskMarkup = groupItems.map((item) => renderTask(item)).join('');
      return `<section class="group-block">${name ? `<h3 class="group-title">${escapeHtml(name)}</h3>` : ''}<div class="task-list">${taskMarkup || '<div class="task-row task-row--empty"><span class="task-title">Adicione o primeiro item desta etapa.</span></div>'}</div></section>`;
    }).join('');
    return `<article class="${cardClasses}" data-category="${escapeHtml(category.id)}">
      <div class="category-head">
        <button class="category-title-button" type="button" data-action="open-category" data-id="${escapeHtml(category.id)}" aria-expanded="${isOpen}" aria-controls="panel-${escapeHtml(category.id)}">
          <span class="category-titleline"><span class="category-emoji" aria-hidden="true">${escapeHtml(category.icon || '✨')}</span><span class="category-title">${escapeHtml(categoryTitle)}</span><span class="chevron" aria-hidden="true">›</span></span>
        </button>
        <div class="category-progress" role="img" aria-label="Progresso da categoria"><div class="progress-track"><span style="width:${itemRate}%"></span></div></div>
      </div>
      <div class="category-content" id="panel-${escapeHtml(category.id)}" ${isOpen ? '' : 'hidden'}>
        ${groupMarkup}
        ${activeMember?.isKelly ? `<div class="add-area"><button class="add-item" type="button" data-action="show-add-item" data-id="${escapeHtml(category.id)}"><span aria-hidden="true">+</span> Adicionar item</button></div>` : ''}
      </div>
    </article>`;
  }

  function render() {
    updateOverview();
    const urgentItems = state.categories.flatMap((category) => flattenItems(category.items || []))
      .filter((item) => item.urgent && getItemStatus(item) !== 'completed');
    const urgentMarkup = urgentItems.length
      ? `<section class="urgent-panel" aria-labelledby="urgentHeading"><h2 id="urgentHeading"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.75 5.58 6.16.9-4.46 4.34 1.05 6.13L12 17.06l-5.5 2.89 1.05-6.13L3.1 9.48l6.16-.9L12 3z"></path></svg>Urgente</h2><div class="urgent-list">${urgentItems.map((item) => renderTask(item, { flat: true, urgentReplica: true })).join('')}</div></section>`
      : '';
    list.innerHTML = urgentMarkup + (state.categories.length
      ? state.categories.map(renderCategory).join('')
      : '<div class="loading-state">Nenhuma categoria encontrada.</div>');
    lastPayload = JSON.stringify(state);
  }

  async function requestJson(url, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (activeMember?.id) headers['X-Oz-Member-Id'] = activeMember.id;
    const response = await fetch(url, {
      ...options,
      headers,
      cache: 'no-store'
    });
    let payload = {};
    try { payload = await response.json(); } catch (_error) {}
    if (!response.ok || payload.success === false) {
      const error = new Error(payload.message || 'Não foi possível salvar a alteração.');
      error.status = response.status;
      if (response.status === 401 && activeMember) exitUser();
      throw error;
    }
    return payload;
  }

  async function loadChecklist() {
    const payload = await requestJson('/api/oz/checklist');
    const next = stateFromPayload(payload);
    if (JSON.stringify(next) !== lastPayload) {
      state = next;
      render();
    }
  }

  function mutate(url, method, body) {
    pendingMutations += 1;
    mutationQueue = mutationQueue.then(async () => {
      try {
        const payload = await requestJson(url, { method, body: JSON.stringify(body) });
        state = stateFromPayload(payload);
        render();
        if (Number(payload.starsAwarded) > 0) showStarCelebration(payload.starsAwarded);
        queueBadgeCelebrations(payload.badgesAwarded, Number(payload.starsAwarded) > 0 ? 1850 : 0);
      } catch (error) {
        if (error.status === 401) exitUser();
        try { await loadChecklist(); } catch (_refreshError) {}
      } finally {
        pendingMutations = Math.max(0, pendingMutations - 1);
      }
    });
    return mutationQueue;
  }

  function revealAddForm(card) {
    const area = card?.querySelector('.add-area');
    if (!area) return;
    const existing = area.querySelector('form');
    if (existing) {
      existing.querySelector('input')?.focus();
      return;
    }
    const id = card.dataset.category;
    const category = state.categories.find((entry) => entry.id === id);
    if (!category) return;
    const groupNames = (category.groups || []).filter(Boolean);
    const groupSelect = groupNames.length > 1
      ? `<select name="group" aria-label="Grupo do novo item"><option value="">Sem grupo</option>${groupNames.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join('')}</select>`
      : '';
    area.innerHTML = `<form class="inline-add" data-category-id="${escapeHtml(id)}"><input name="title" maxlength="240" placeholder="O que falta incluir?" aria-label="Novo item" required>${groupSelect}<button type="submit">Adicionar</button><button type="button" class="cancel-add" data-action="cancel-add-item" aria-label="Cancelar">×</button></form>`;
    area.querySelector('input')?.focus();
  }

  function updateIdentity() {
    document.getElementById('currentMemberLabel').textContent = activeMember?.name || '';
    setProfileAvatar(document.getElementById('profileAvatarButton'), activeMember?.avatarImage);
    document.querySelector('.list-actions').hidden = !activeMember?.isKelly;
    document.getElementById('eventCountdown').hidden = !isCountdownVisible();
    renderHeaderOptions();
  }

  function avatarSvg() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.1"></circle><path d="M5.8 20c.25-3.8 2.35-5.7 6.2-5.7s5.95 1.9 6.2 5.7"></path></svg>';
  }

  function setProfileAvatar(element, avatarImage) {
    if (!element) return;
    const image = element.querySelector('img');
    const value = String(avatarImage || '').trim();
    if (image) {
      image.src = value;
      image.alt = activeMember?.name ? `Foto de ${activeMember.name}` : 'Foto de perfil';
    }
    element.classList.toggle('has-image', Boolean(value));
  }

  function setProfileAvatarPreview(avatarImage) {
    setProfileAvatar(profileAvatarPreview, avatarImage);
  }

  function readProfileAvatar(file) {
    return new Promise((resolve, reject) => {
      if (!file || !/^image\/(?:png|jpe?g|webp|gif)$/i.test(file.type)) {
        reject(new Error('Escolha uma imagem PNG, JPG, WEBP ou GIF.'));
        return;
      }
      if (file.size > 12 * 1024 * 1024) {
        reject(new Error('A imagem precisa ter até 12 MB.'));
        return;
      }
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Não foi possível ler essa imagem.'));
      reader.onload = () => {
        const image = new Image();
        image.onerror = () => reject(new Error('Não foi possível abrir essa imagem.'));
        image.onload = () => {
          const size = 512;
          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          const context = canvas.getContext('2d');
          const scale = Math.max(size / image.width, size / image.height);
          const width = image.width * scale;
          const height = image.height * scale;
          context.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
          resolve(canvas.toDataURL('image/webp', .84));
        };
        image.src = String(reader.result || '');
      };
      reader.readAsDataURL(file);
    });
  }

  function setProfileAvatarError(message = '') {
    profileAvatarError.textContent = message;
    profileAvatarError.hidden = !message;
  }

  function openProfileAvatar() {
    profileAvatarDraft = '';
    profileAvatarInput.value = '';
    setProfileAvatarError('');
    setProfileAvatarPreview(activeMember?.avatarImage);
    saveProfileAvatar.disabled = true;
    if (!profileAvatarDialog.open) profileAvatarDialog.showModal();
  }

  function setActiveMember(member) {
    activeMember = member ? { id: member.id, name: member.name, avatarImage: String(member.avatarImage || '').trim(), isKelly: Boolean(member.isKelly) } : null;
    try {
      if (activeMember) localStorage.setItem(MEMBER_KEY, JSON.stringify(activeMember));
      else localStorage.removeItem(MEMBER_KEY);
    } catch (_error) {}
    updateIdentity();
  }

  async function resolveMember(id) {
    const response = await fetch('/api/oz/team/session', { headers: { 'X-Oz-Member-Id': id }, cache: 'no-store' });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.member) throw new Error('Sessão expirada. Entre novamente.');
    return payload.member;
  }

  async function loadTeam() {
    if (!activeMember?.isKelly) { members = []; return; }
    const payload = await requestJson('/api/oz/team');
    members = Array.isArray(payload.members) ? payload.members : [];
  }

  function setTeamError(message = '') {
    const error = document.getElementById('teamError');
    error.textContent = message;
    error.hidden = !message;
  }

  async function openTeam() {
    if (!activeMember?.isKelly) return;
    addMenu.hidden = true;
    document.getElementById('toggleAddMenu').setAttribute('aria-expanded', 'false');
    setTeamError('');
    document.getElementById('newMemberForm').reset();
    teamDialog.showModal();
    document.getElementById('newMemberName').focus();
  }

  function exitUser() {
    setActiveMember(null);
    members = [];
    state = { categories: [], stars: 0, badges: [] };
    lastPayload = '';
    checklistApp.hidden = true;
    loginScreen.hidden = false;
    accountMenu.hidden = true;
    headerOptionsMenu.hidden = true;
    document.getElementById('accountButton').setAttribute('aria-expanded', 'false');
    if (teamDialog.open) teamDialog.close();
    document.getElementById('loginError').hidden = true;
    document.getElementById('pageLoginName').value = '';
    list.innerHTML = '<div class="loading-state"><span class="loader"></span><span>Entre para carregar suas tarefas.</span></div>';
    document.getElementById('pageLoginName').focus();
  }

  async function enterApp() {
    loginScreen.hidden = true;
    checklistApp.hidden = false;
    updateIdentity();
    try { await loadChecklist(); } catch (_error) {}
    try { await loadTeam(); } catch (_error) { members = []; }
  }

  function openStatusMenu(row) {
    const itemId = row?.dataset.taskId;
    const item = findItemById(itemId);
    if (!item) return;
    const currentStatus = getItemStatus(item);
    statusTaskId = itemId;
    document.getElementById('statusTaskTitle').textContent = item.title;
    statusOptions.innerHTML = ['pending', 'completed', 'in_progress']
      .filter((status) => status !== currentStatus)
      .map((status) => `<button class="status-choice status-choice--${status}" type="button" data-next-status="${status}">${statusIcon(status)}<span>${statusLabel(status)}</span></button>`)
      .join('');
    statusDialog.showModal();
  }

  function renderNotesDialog(slideDirection = 0) {
    const item = findItemById(notesTaskId);
    if (!item) return;
    const title = document.getElementById('notesTaskTitle');
    const heading = document.getElementById('notesHeading');
    const text = document.getElementById('notesText');
    const editor = document.getElementById('notesEditor');
    const dots = document.getElementById('notesDots');
    const counter = document.getElementById('notesCounter');
    const toolbar = document.getElementById('notesToolbar');
    const note = notesDraft[notesIndex] || '';
    title.textContent = item.title;
    const editing = notesMode === 'new' || notesMode === 'edit';
    heading.textContent = editing ? (notesMode === 'new' ? 'Nova nota' : 'Editar nota') : (notesDraft.length ? '' : 'Adicione uma nota');
    heading.hidden = !notesDraft.length && !editing;
    text.textContent = notesDraft.length ? note : 'Adicione uma nota';
    text.hidden = editing;
    text.classList.remove('note-slide-next', 'note-slide-previous');
    if (slideDirection && !editing) {
      void text.offsetWidth;
      text.classList.add(slideDirection > 0 ? 'note-slide-next' : 'note-slide-previous');
    }
    editor.value = editing ? (notesMode === 'new' ? '' : note) : '';
    editor.hidden = !editing;
    dots.innerHTML = notesDraft.map((_entry, index) => `<button type="button" class="notes-dot ${index === notesIndex && !editing ? 'is-current' : ''}" data-note-index="${index}" aria-label="Nota ${index + 1}" ${editing ? 'disabled' : ''}></button>`).join('');
    dots.hidden = notesDraft.length < 2;
    counter.textContent = notesDraft.length ? `Nota ${notesIndex + 1} de ${notesDraft.length}` : '';
    counter.hidden = !notesDraft.length || editing;
    toolbar.innerHTML = editing
      ? '<button type="button" data-notes-action="cancel" aria-label="Cancelar edição" title="Cancelar"><svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"></path></svg></button><button type="button" data-notes-action="save" aria-label="Salvar nota" title="Salvar"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"></circle><path d="m8.5 12.2 2.3 2.3 4.8-5"></path></svg></button>'
      : `<button type="button" data-notes-action="add" aria-label="Adicionar nota" title="Adicionar nota"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"></path></svg></button><button type="button" data-notes-action="edit" aria-label="Editar nota" title="Editar nota" ${notesDraft.length ? '' : 'disabled'}><svg viewBox="0 0 24 24"><path d="m4 16.5-.8 4.3 4.3-.8L19.6 7.9a2.5 2.5 0 0 0-3.5-3.5zM14.8 5.7l3.5 3.5"></path></svg></button><button type="button" data-notes-action="delete" aria-label="Excluir nota" title="Excluir nota" ${notesDraft.length ? '' : 'disabled'}><svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4.5h6V7m3 0-.8 13H6.8L6 7m3 3.2v6.5m6-6.5v6.5"></path></svg></button>`;
    document.getElementById('notesError').hidden = true;
    document.getElementById('notesSuccess').hidden = true;
  }

  function openNotes(item) {
    notesTaskId = item.id;
    notesDraft = (Array.isArray(item.notes) ? item.notes : []).slice();
    notesIndex = 0;
    notesMode = 'view';
    renderNotesDialog();
    notesDialog.showModal();
  }

  function openTaskNotesScroll(item) {
    const entries = Array.isArray(item.notes) ? item.notes : [];
    document.getElementById('microtaskNotesTitle').textContent = item.title;
    document.getElementById('microtaskNotesList').innerHTML = entries.length
      ? entries.map((note, index) => `<article class="microtask-note"><h3>Nota ${index + 1}</h3><p>${escapeHtml(note)}</p></article>`).join('')
      : '<p class="microtask-notes-empty">Adicione uma nota</p>';
    microtaskNotesDialog.showModal();
  }

  async function saveTaskNotes() {
    const error = document.getElementById('notesError');
    const success = document.getElementById('notesSuccess');
    error.hidden = true;
    success.hidden = true;
    window.clearTimeout(notesSuccessTimer);
    try {
      await mutationQueue;
      const payload = await requestJson(`/api/oz/checklist/items/${encodeURIComponent(notesTaskId)}/notes`, {
        method: 'PUT', body: JSON.stringify({ notes: notesDraft })
      });
      state = stateFromPayload(payload);
      render();
      renderNotesDialog();
      success.hidden = false;
      notesSuccessTimer = window.setTimeout(() => { success.hidden = true; }, 2400);
    } catch (saveError) {
      error.textContent = saveError.message || 'Não foi possível salvar as notas.';
      error.hidden = false;
      success.hidden = true;
      try { await loadChecklist(); } catch (_refreshError) {}
    }
  }

  function closeStatusMenu() {
    statusTaskId = '';
    if (statusDialog.open) statusDialog.close();
  }

  pageLoginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = String(new FormData(pageLoginForm).get('name') || '').trim();
    const error = document.getElementById('loginError');
    error.hidden = true;
    try {
      const payload = await requestJson('/api/oz/team/login', { method: 'POST', body: JSON.stringify({ name }) });
      setActiveMember(payload.member);
      await enterApp();
    } catch (problem) {
      error.textContent = problem.message || 'Não foi possível entrar.';
      error.hidden = false;
    }
  });

  function closeAssignMenu() {
    assignMenu.hidden = true;
    assignTaskId = '';
  }

  function closeTaskOptions() {
    taskOptionsMenu.hidden = true;
    const toggle = list.querySelector('.task-options-toggle[aria-expanded="true"]');
    toggle?.setAttribute('aria-expanded', 'false');
  }

  function openTaskOptions(row, toggle) {
    if (!row || !toggle) return;
    if (!taskOptionsMenu.hidden && taskOptionsMenu.dataset.taskId === row.dataset.taskId) {
      closeTaskOptions();
      return;
    }
    closeAssignMenu();
    const canManage = Boolean(activeMember?.isKelly);
    const item = findItemById(row.dataset.taskId);
    const urgentMarkup = item && getItemStatus(item) !== 'completed'
      ? `<button type="button" role="menuitem" data-task-option="urgent" aria-pressed="${Boolean(item.urgent)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.75 5.58 6.16.9-4.46 4.34 1.05 6.13L12 17.06l-5.5 2.89 1.05-6.13L3.1 9.48l6.16-.9L12 3z"></path></svg><span>${item.urgent ? 'Remover de urgentes' : 'Urgente'}</span></button>`
      : '';
    const optionMarkup = `
      <button type="button" role="menuitem" data-task-option="notes"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3.75h8l4 4V20.25H6z"></path><path d="M14 3.75v4h4M9 12h6M9 15.5h6"></path></svg><span>Adicionar nota</span></button>
      ${urgentMarkup}
      ${canManage ? `<button type="button" role="menuitem" data-task-option="subtask"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5.5h5l2 2h7v11H5z"></path><path d="M12 10v6m-3-3h6"></path></svg><span>Adicionar subtarefa</span></button><button type="button" role="menuitem" data-task-option="delegate"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"></circle><path d="M3.5 19c.2-3.5 2.05-5.25 5.5-5.25 1.15 0 2.1.2 2.85.6M15 10h5m-2.5-2.5L20 10l-2.5 2.5"></path></svg><span>${item?.assigneeId ? 'Desatribuir' : 'Delegar'}</span></button><button type="button" role="menuitem" data-task-option="delete"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4.5h6V7m3 0-.8 13H6.8L6 7m3 3.2v6.5m6-6.5v6.5"></path></svg><span>Excluir</span></button>` : ''}`;
    taskOptionsMenu.innerHTML = optionMarkup;
    taskOptionsMenu.dataset.taskId = row.dataset.taskId;
    taskOptionsMenu.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    const bounds = toggle.getBoundingClientRect();
    const menuBounds = taskOptionsMenu.getBoundingClientRect();
    const left = Math.max(12, Math.min(bounds.left, window.innerWidth - menuBounds.width - 12));
    const below = bounds.bottom + 6;
    const top = below + menuBounds.height <= window.innerHeight - 12 ? below : Math.max(12, bounds.top - menuBounds.height - 6);
    taskOptionsMenu.style.left = `${left}px`;
    taskOptionsMenu.style.top = `${top}px`;
  }

  function openAssignMenu(row) {
    if (!activeMember?.isKelly) return;
    closeTaskOptions();
    assignTaskId = row.dataset.taskId;
    const currentItem = findItemById(assignTaskId);
    const people = members.map((member) => `<button type="button" class="assign-person" data-assign-id="${escapeHtml(member.id)}">${avatarSvg()}<span>${escapeHtml(member.name)}</span>${currentItem?.assigneeId === member.id ? '<span class="assigned-check">✓</span>' : ''}</button>`).join('');
    assignMenu.innerHTML = `<div class="assign-menu-title">Delegar tarefa</div>${people || '<div class="assign-empty">Ainda não há integrantes.</div>'}${currentItem?.assigneeId ? '<button type="button" class="assign-clear" data-assign-id="">Remover responsável</button>' : ''}${!members.length ? '<button type="button" class="assign-add-person" data-assign-open-team>Adicionar integrante</button>' : ''}`;
    assignMenu.hidden = false;
    const bounds = row.getBoundingClientRect();
    const menuBounds = assignMenu.getBoundingClientRect();
    const left = Math.max(12, Math.min(bounds.left, window.innerWidth - menuBounds.width - 12));
    const below = bounds.bottom + 6;
    const top = below + menuBounds.height <= window.innerHeight - 12 ? below : Math.max(12, bounds.top - menuBounds.height - 6);
    assignMenu.style.left = `${left}px`;
    assignMenu.style.top = `${top}px`;
  }

  function clearHold() {
    window.clearTimeout(holdTimer);
    holdTimer = 0;
    holdStart = null;
  }

  list.addEventListener('pointerdown', (event) => {
    const row = event.target.closest('.task-row[data-task-id]');
    if (!row || event.target.closest('.item-status, .delete-task, .task-options-toggle, .task-assignee-toggle, .task-toggle, .task-note-indicator') || (event.button !== undefined && event.button !== 0)) return;
    const item = findItemById(row.dataset.taskId);
    if (!item) return;
    holdStart = { x: event.clientX, y: event.clientY, row };
    holdTimer = window.setTimeout(() => {
      openTaskNotesScroll(item);
      holdStart = null;
      ignoreLongPressClick = true;
      window.setTimeout(() => { ignoreLongPressClick = false; }, 1000);
    }, 550);
  });
  list.addEventListener('pointermove', (event) => {
    if (holdStart && Math.hypot(event.clientX - holdStart.x, event.clientY - holdStart.y) > 10) clearHold();
  });
  document.addEventListener('pointerup', clearHold);
  document.addEventListener('pointercancel', clearHold);
  list.addEventListener('contextmenu', (event) => {
    if (event.target.closest('.task-row[data-task-id]')) event.preventDefault();
  });

  list.addEventListener('click', (event) => {
    if (ignoreLongPressClick && event.target.closest('.task-row[data-task-id]')) {
      event.preventDefault();
      return;
    }
    const taskRow = event.target.closest('.task-row[data-task-id]');
    if (taskRow && !event.target.closest('.delete-task, .task-options-toggle, .task-assignee-toggle, .task-toggle, .task-note-indicator')) {
      openStatusMenu(taskRow);
      return;
    }
    const control = event.target.closest('[data-action]');
    if (!control) return;
    const action = control.dataset.action;
    const id = control.dataset.id;
    const card = control.closest('.category-card');
    if (action === 'open-task-options' && id) {
      openTaskOptions(taskRow, control);
      return;
    }
    if (action === 'open-task-assign' && id) {
      if (activeMember?.isKelly) openAssignMenu(taskRow);
      return;
    }
    if (action === 'open-task-notes-scroll' && id) {
      const item = findItemById(id);
      if (item) openTaskNotesScroll(item);
      return;
    }
    if (action === 'open-category' && id) {
      const opening = !openedCategories.has(id);
      if (opening) openedCategories.add(id);
      else openedCategories.delete(id);
      persistOpened();
      control.setAttribute('aria-expanded', String(opening));
      card?.classList.toggle('is-open', opening);
      const panel = card?.querySelector('.category-content');
      if (panel) panel.hidden = !opening;
      return;
    }
    if (action === 'toggle-subtasks' && id) {
      const openKey = `task:${id}`;
      const opening = !openedCategories.has(openKey);
      if (opening) openedCategories.add(openKey);
      else openedCategories.delete(openKey);
      persistOpened();
      control.setAttribute('aria-expanded', String(opening));
      control.setAttribute('aria-label', `${opening ? 'Recolher' : 'Abrir'} sub tarefas`);
      control.classList.toggle('is-open', opening);
      const panel = document.getElementById(control.getAttribute('aria-controls'));
      if (panel) panel.hidden = !opening;
      return;
    }
    if (action === 'add-subfolder' && id && activeMember?.isKelly) {
      subtaskParentId = id;
      subtaskForm.reset();
      subtaskDialog.showModal();
      document.getElementById('newSubtaskTitle').focus();
      return;
    }
    if (action === 'open-notes' && id) {
      const item = findItemById(id);
      if (item) openNotes(item);
      return;
    }
    if (action === 'delete-item' && id && activeMember?.isKelly) {
      const item = findItemById(id);
      if (item && window.confirm(`Excluir a tarefa "${item.title}"?`)) mutate(`/api/oz/checklist/items/${encodeURIComponent(id)}`, 'DELETE');
      return;
    }
    if (action === 'show-add-item') revealAddForm(card);
    if (action === 'cancel-add-item') {
      const category = state.categories.find((entry) => entry.id === card?.dataset.category);
      if (category) render();
    }
  });

  list.addEventListener('submit', (event) => {
    const form = event.target.closest('.inline-add');
    if (!form) return;
    event.preventDefault();
    const formData = new FormData(form);
    const title = String(formData.get('title') || '').trim();
    const group = String(formData.get('group') || '').trim();
    if (!title) return;
    const categoryId = form.dataset.categoryId;
    if (activeMember?.isKelly) mutate(`/api/oz/checklist/categories/${encodeURIComponent(categoryId)}/items`, 'POST', { title, group });
  });

  document.getElementById('toggleAddMenu').addEventListener('click', () => {
    const opening = addMenu.hidden;
    addMenu.hidden = !opening;
    document.getElementById('toggleAddMenu').setAttribute('aria-expanded', String(opening));
  });
  addMenu.addEventListener('click', (event) => {
    const option = event.target.closest('[data-menu-action]');
    if (!option) return;
    addMenu.hidden = true;
    document.getElementById('toggleAddMenu').setAttribute('aria-expanded', 'false');
    if (option.dataset.menuAction === 'category') {
      document.getElementById('newCategoryForm').reset();
      dialog.showModal();
      document.getElementById('newCategoryTitle').focus();
    } else if (option.dataset.menuAction === 'team') openTeam();
  });
  document.getElementById('closeTeamDialog').addEventListener('click', () => teamDialog.close());
  teamDialog.addEventListener('cancel', () => {});
  teamDialog.addEventListener('click', (event) => { if (event.target === teamDialog) teamDialog.close(); });
  document.getElementById('profileAvatarButton').addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    openProfileAvatar();
  });
  document.getElementById('profileAvatarButton').addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    event.stopPropagation();
    openProfileAvatar();
  });
  document.getElementById('closeProfileAvatar').addEventListener('click', () => profileAvatarDialog.close());
  document.getElementById('cancelProfileAvatar').addEventListener('click', () => profileAvatarDialog.close());
  profileAvatarDialog.addEventListener('click', (event) => { if (event.target === profileAvatarDialog) profileAvatarDialog.close(); });
  profileAvatarInput.addEventListener('change', async () => {
    setProfileAvatarError('');
    saveProfileAvatar.disabled = true;
    try {
      profileAvatarDraft = await readProfileAvatar(profileAvatarInput.files?.[0]);
      setProfileAvatarPreview(profileAvatarDraft);
      saveProfileAvatar.disabled = false;
    } catch (error) {
      profileAvatarDraft = '';
      setProfileAvatarPreview(activeMember?.avatarImage);
      setProfileAvatarError(error.message || 'Não foi possível preparar a imagem.');
    }
  });
  saveProfileAvatar.addEventListener('click', async () => {
    if (!profileAvatarDraft || !activeMember?.id) return;
    saveProfileAvatar.disabled = true;
    setProfileAvatarError('');
    try {
      const payload = await requestJson('/api/oz/team/profile', { method: 'PATCH', body: JSON.stringify({ avatarImage: profileAvatarDraft }) });
      setActiveMember(payload.member);
      profileAvatarDialog.close();
    } catch (error) {
      setProfileAvatarError(error.message || 'Não foi possível salvar a foto.');
      saveProfileAvatar.disabled = false;
    }
  });
  document.getElementById('accountButton').addEventListener('click', () => {
    headerOptionsMenu.hidden = true;
    headerOptionsButton.setAttribute('aria-expanded', 'false');
    const opening = accountMenu.hidden;
    accountMenu.hidden = !opening;
    document.getElementById('accountButton').setAttribute('aria-expanded', String(opening));
  });
  accountMenu.addEventListener('click', (event) => {
    if (event.target.closest('[data-account-action="logout"]')) exitUser();
  });
  headerOptionsButton.addEventListener('click', () => {
    accountMenu.hidden = true;
    document.getElementById('accountButton').setAttribute('aria-expanded', 'false');
    const opening = headerOptionsMenu.hidden;
    headerOptionsMenu.hidden = !opening;
    headerOptionsButton.setAttribute('aria-expanded', String(opening));
  });
  headerOptionsMenu.addEventListener('click', (event) => {
    const option = event.target.closest('[data-header-option]');
    if (!option) return;
    headerOptionsMenu.hidden = true;
    headerOptionsButton.setAttribute('aria-expanded', 'false');
    if (option.dataset.headerOption === 'badges') openBadgeAlbum();
    if (option.dataset.headerOption === 'musical') openMusical();
    if (option.dataset.headerOption === 'countdown') setCountdownVisible(!isCountdownVisible());
  });
  document.getElementById('closeOzMusical').addEventListener('click', () => musicalDialog.close());
  musicalDialog.addEventListener('click', (event) => { if (event.target === musicalDialog) musicalDialog.close(); });
  musicalDialog.addEventListener('close', () => { musicalAudio.pause(); });
  document.getElementById('ozMusicalNotes').addEventListener('click', () => openMusicalNotes());
  musicalNoteMarkers.addEventListener('click', (event) => {
    const marker = event.target.closest('[data-musical-note-id]');
    if (!marker) return;
    event.preventDefault();
    event.stopPropagation();
    openMusicalNotes(marker.dataset.musicalNoteId);
  });
  musicalPlay.addEventListener('click', () => {
    if (!musicalTracks.length) return;
    if (musicalAudio.paused) {
      const playback = musicalAudio.play();
      if (playback?.catch) playback.catch(() => {});
    } else musicalAudio.pause();
  });
  musicalAudio.addEventListener('timeupdate', updateMusicalPlayer);
  musicalAudio.addEventListener('loadedmetadata', () => { updateMusicalPlayer(); renderMusicalNoteMarkers(); });
  musicalAudio.addEventListener('play', () => { renderMusicalTrackList(); updateMusicalPlayer(); });
  musicalAudio.addEventListener('pause', () => { renderMusicalTrackList(); updateMusicalPlayer(); });
  musicalAudio.addEventListener('ended', updateMusicalPlayer);
  musicalSeek.addEventListener('input', () => {
    if (!Number.isFinite(musicalAudio.duration)) return;
    musicalAudio.currentTime = Math.min(Number(musicalAudio.duration), musicalEditedToOriginal(Number(musicalSeek.value) || 0));
    updateMusicalPlayer();
  });
  document.getElementById('ozMusicalPrevious').addEventListener('click', () => setMusicalTrack(musicalTrackIndex - 1, { autoplay: true }));
  document.getElementById('ozMusicalNext').addEventListener('click', () => setMusicalTrack(musicalTrackIndex + 1, { autoplay: true }));
  document.getElementById('ozMusicalListToggle').addEventListener('click', (event) => {
    const opening = !musicalListDialog.open;
    if (opening) musicalListDialog.showModal();
    else musicalListDialog.close();
    event.currentTarget.setAttribute('aria-expanded', String(opening));
  });
  document.getElementById('closeOzMusicalList').addEventListener('click', () => {
    musicalListDialog.close();
    document.getElementById('ozMusicalListToggle').setAttribute('aria-expanded', 'false');
  });
  musicalListDialog.addEventListener('close', () => {
    document.getElementById('ozMusicalListToggle').setAttribute('aria-expanded', 'false');
  });
  musicalListDialog.addEventListener('click', (event) => {
    if (event.target === musicalListDialog) musicalListDialog.close();
  });
  musicalTrackList.addEventListener('click', (event) => {
    const option = event.target.closest('[data-musical-index]');
    if (!option) return;
    setMusicalTrack(Number(option.dataset.musicalIndex), { autoplay: true });
  });
  document.getElementById('closeOzMusicalNote').addEventListener('click', () => musicalNoteDialog.close());
  musicalNoteDialog.addEventListener('click', (event) => { if (event.target === musicalNoteDialog) musicalNoteDialog.close(); });
  musicalNoteList.addEventListener('click', (event) => {
    const option = event.target.closest('[data-musical-note-select]');
    if (!option || musicalNoteMode === 'new' || musicalNoteMode === 'edit') return;
    musicalNoteId = option.dataset.musicalNoteSelect;
    musicalNoteMode = 'view';
    renderMusicalNotesDialog();
  });
  musicalNoteActions.addEventListener('click', async (event) => {
    const action = event.target.closest('[data-musical-note-action]')?.dataset.musicalNoteAction;
    if (!action) return;
    if (action === 'cancel') {
      musicalNoteMode = 'view';
      renderMusicalNotesDialog();
      return;
    }
    if (action === 'add') {
      musicalNoteId = '';
      musicalNoteDraftPosition = Number(musicalAudio.currentTime) || 0;
      musicalNoteMode = 'new';
      renderMusicalNotesDialog();
      return;
    }
    if (action === 'edit') {
      musicalNoteMode = 'edit';
      renderMusicalNotesDialog();
      return;
    }
    try {
      if (action === 'save') await saveMusicalNote();
      if (action === 'delete') await deleteMusicalNote();
    } catch (error) {
      musicalNoteText.textContent = error.message || 'Não foi possível atualizar a nota.';
      musicalNoteText.hidden = false;
    }
  });
  document.getElementById('closeBadgeAlbum').addEventListener('click', () => badgeAlbumDialog.close());
  badgeAlbumDialog.addEventListener('click', (event) => { if (event.target === badgeAlbumDialog) badgeAlbumDialog.close(); });
  document.getElementById('badgeAlbumGrid').addEventListener('click', (event) => {
    const info = event.target.closest('[data-badge-info]');
    if (!info) return;
    const badge = state.badges.find((entry) => entry.id === info.dataset.badgeInfo);
    if (!badge) return;
    openBadgeInfo(badge);
  });
  document.getElementById('closeBadgeInfo').addEventListener('click', () => badgeInfoDialog.close());
  badgeInfoDialog.addEventListener('click', (event) => { if (event.target === badgeInfoDialog) badgeInfoDialog.close(); });
  document.getElementById('newMemberForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const name = String(new FormData(form).get('name') || '').trim();
    try {
      const payload = await requestJson('/api/oz/team/members', { method: 'POST', body: JSON.stringify({ name }) });
      members = [...members, payload.member];
      form.reset();
      setTeamError('Integrante adicionado à equipe.');
    } catch (error) { setTeamError(error.message); }
  });
  assignMenu.addEventListener('click', (event) => {
    if (event.target.closest('[data-assign-open-team]')) {
      closeAssignMenu();
      openTeam();
      return;
    }
    const button = event.target.closest('[data-assign-id]');
    if (!button || !assignTaskId) return;
    const id = assignTaskId;
    const assigneeId = button.dataset.assignId || null;
    closeAssignMenu();
    mutate(`/api/oz/checklist/items/${encodeURIComponent(id)}`, 'PATCH', { assigneeId });
  });
  taskOptionsMenu.addEventListener('click', (event) => {
    const option = event.target.closest('[data-task-option]');
    if (!option) return;
    const id = taskOptionsMenu.dataset.taskId;
    const row = [...list.querySelectorAll('.task-row[data-task-id]')].find((entry) => entry.dataset.taskId === id);
    closeTaskOptions();
    if (option.dataset.taskOption === 'notes') {
      const item = findItemById(id);
      if (item) openNotes(item);
    } else if (option.dataset.taskOption === 'urgent' && id) {
      const item = findItemById(id);
      if (item && getItemStatus(item) !== 'completed') mutate(`/api/oz/checklist/items/${encodeURIComponent(id)}`, 'PATCH', { urgent: !item.urgent });
    } else if (option.dataset.taskOption === 'subtask' && activeMember?.isKelly && id) {
      subtaskParentId = id;
      subtaskForm.reset();
      subtaskDialog.showModal();
      document.getElementById('newSubtaskTitle').focus();
    } else if (option.dataset.taskOption === 'delegate' && activeMember?.isKelly && row) {
      const item = findItemById(id);
      if (item?.assigneeId) mutate(`/api/oz/checklist/items/${encodeURIComponent(id)}`, 'PATCH', { assigneeId: null });
      else openAssignMenu(row);
    } else if (option.dataset.taskOption === 'delete' && activeMember?.isKelly && id) {
      const item = findItemById(id);
      if (item && window.confirm(`Excluir a tarefa "${item.title}"?`)) mutate(`/api/oz/checklist/items/${encodeURIComponent(id)}`, 'DELETE');
    }
  });
  document.addEventListener('click', (event) => {
    if (ignoreLongPressClick && event.target.closest('.task-row[data-task-id]')) {
      ignoreLongPressClick = false;
      return;
    }
    if (!event.target.closest('.add-menu-wrap')) {
      addMenu.hidden = true;
      document.getElementById('toggleAddMenu').setAttribute('aria-expanded', 'false');
    }
    if (!event.target.closest('.header-options-wrap')) {
      headerOptionsMenu.hidden = true;
      headerOptionsButton.setAttribute('aria-expanded', 'false');
    }
    if (!event.target.closest('#accountButton, #accountMenu')) {
      accountMenu.hidden = true;
      document.getElementById('accountButton').setAttribute('aria-expanded', 'false');
    }
    if (!event.target.closest('#taskAssignMenu, #taskOptionsMenu, .task-assignee-toggle')) closeAssignMenu();
    if (!event.target.closest('#taskOptionsMenu, #taskAssignMenu, .task-options-toggle')) closeTaskOptions();
  });

  document.getElementById('closeCategoryDialog').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
  document.getElementById('closeStatusDialog').addEventListener('click', closeStatusMenu);
  statusDialog.addEventListener('click', (event) => { if (event.target === statusDialog) closeStatusMenu(); });
  statusDialog.addEventListener('close', () => { statusTaskId = ''; });
  statusOptions.addEventListener('click', (event) => {
    const option = event.target.closest('[data-next-status]');
    if (!option || !statusTaskId) return;
    const itemId = statusTaskId;
    const status = option.dataset.nextStatus;
    closeStatusMenu();
    mutate(`/api/oz/checklist/items/${encodeURIComponent(itemId)}`, 'PATCH', { status });
  });
  document.getElementById('closeNotesDialog').addEventListener('click', () => notesDialog.close());
  notesDialog.addEventListener('click', (event) => { if (event.target === notesDialog) notesDialog.close(); });
  document.getElementById('closeMicrotaskNotesDialog').addEventListener('click', () => microtaskNotesDialog.close());
  microtaskNotesDialog.addEventListener('click', (event) => { if (event.target === microtaskNotesDialog) microtaskNotesDialog.close(); });
  starCelebrationDialog.addEventListener('cancel', (event) => event.preventDefault());
  badgeCelebrationDialog.addEventListener('cancel', (event) => event.preventDefault());
  let notesSwipeStartX = null;
  document.getElementById('notesCard').addEventListener('touchstart', (event) => {
    notesSwipeStartX = event.changedTouches[0]?.clientX ?? null;
  }, { passive: true });
  document.getElementById('notesCard').addEventListener('touchend', (event) => {
    if (notesSwipeStartX === null || notesDraft.length < 2 || notesMode !== 'view') return;
    const delta = event.changedTouches[0].clientX - notesSwipeStartX;
    if (Math.abs(delta) > 45) {
      const direction = delta < 0 ? 1 : -1;
      notesIndex = (notesIndex + direction + notesDraft.length) % notesDraft.length;
      renderNotesDialog(direction);
    }
    notesSwipeStartX = null;
  }, { passive: true });
  document.getElementById('notesDots').addEventListener('click', (event) => {
    const dot = event.target.closest('[data-note-index]');
    if (!dot || notesMode !== 'view') return;
    const nextIndex = Number(dot.dataset.noteIndex) || 0;
    const direction = nextIndex >= notesIndex ? 1 : -1;
    notesIndex = nextIndex;
    renderNotesDialog(direction);
  });
  document.getElementById('notesNav').addEventListener('click', (event) => {
    const button = event.target.closest('[data-note-step]');
    if (!button || notesDraft.length < 2 || notesMode !== 'view') return;
    const direction = Number(button.dataset.noteStep);
    notesIndex = (notesIndex + direction + notesDraft.length) % notesDraft.length;
    renderNotesDialog(direction);
  });
  document.getElementById('notesToolbar').addEventListener('click', async (event) => {
    const button = event.target.closest('[data-notes-action]');
    if (!button) return;
    const action = button.dataset.notesAction;
    if (action === 'add') { notesMode = 'new'; renderNotesDialog(); document.getElementById('notesEditor').focus(); return; }
    if (action === 'edit') {
      if (!notesDraft.length) return;
      notesMode = 'edit';
      renderNotesDialog();
      document.getElementById('notesEditor').focus();
      return;
    }
    if (action === 'cancel') {
      notesMode = 'view';
      renderNotesDialog();
      return;
    }
    if (action === 'delete' && notesDraft.length) {
      notesDraft.splice(notesIndex, 1);
      notesIndex = Math.max(0, Math.min(notesIndex, notesDraft.length - 1));
      notesMode = 'view';
      await saveTaskNotes();
      return;
    }
    if (action === 'save') {
      const value = document.getElementById('notesEditor').value.trim();
      if (!value) {
        const error = document.getElementById('notesError');
        error.textContent = 'Escreva o texto da nota antes de salvar.';
        error.hidden = false;
        return;
      }
      if (value.length > 4000) {
        const error = document.getElementById('notesError');
        error.textContent = 'Cada nota pode ter até 4.000 caracteres.';
        error.hidden = false;
        return;
      }
      if (notesMode === 'new') {
        if (notesDraft.length >= 20) {
          const error = document.getElementById('notesError');
          error.textContent = 'Cada tarefa pode ter até 20 notas.';
          error.hidden = false;
          return;
        }
        notesDraft.push(value);
        notesIndex = notesDraft.length - 1;
      } else notesDraft[notesIndex] = value;
      notesMode = 'view';
      await saveTaskNotes();
    }
  });
  notesDialog.addEventListener('close', () => { notesTaskId = ''; });
  document.getElementById('closeSubtaskDialog').addEventListener('click', () => {
    subtaskParentId = '';
    subtaskDialog.close();
  });
  subtaskDialog.addEventListener('click', (event) => {
    if (event.target === subtaskDialog) {
      subtaskParentId = '';
      subtaskDialog.close();
    }
  });
  subtaskForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!activeMember?.isKelly || !subtaskParentId) return;
    const titles = String(new FormData(subtaskForm).get('titles') || '')
      .split(/\r?\n/)
      .map((title) => title.trim())
      .filter(Boolean);
    const error = document.getElementById('subtaskError');
    const showError = (message) => {
      error.textContent = message;
      error.hidden = false;
    };
    error.textContent = '';
    error.hidden = true;
    if (!titles.length) return showError('Digite pelo menos uma subtarefa.');
    if (titles.length > 100) return showError('Adicione até 100 subtarefas por vez.');
    if (titles.some((title) => title.length > 240)) return showError('Cada subtarefa pode ter até 240 caracteres.');
    const parentId = subtaskParentId;
    subtaskParentId = '';
    subtaskDialog.close();
    openedCategories.add(`task:${parentId}`);
    persistOpened();
    mutate(`/api/oz/checklist/items/${encodeURIComponent(parentId)}/subtasks`, 'POST', { titles });
  });
  document.getElementById('newCategoryForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const title = String(formData.get('title') || '').trim();
    const icon = String(formData.get('icon') || '✨');
    if (!title) return;
    dialog.close();
    mutate('/api/oz/checklist/categories', 'POST', { title, icon });
  });

  updateIdentity();
  if (savedMemberId) resolveMember(savedMemberId).then(async (member) => {
    setActiveMember(member);
    await enterApp();
  }).catch(() => exitUser());
  const eventAt = new Date('2026-11-29T16:00:00-03:00').getTime();
  const updateCountdown = () => {
    const remainingHours = Math.max(0, Math.floor((eventAt - Date.now()) / 3600000));
    const days = Math.floor(remainingHours / 24);
    const hours = remainingHours % 24;
    const label = `${days} DIAS · ${String(hours).padStart(2, '0')} HORAS`;
    const countdown = document.getElementById('eventCountdown');
    countdown.textContent = label;
    countdown.setAttribute('aria-label', label.toLocaleLowerCase('pt-BR'));
  };
  updateCountdown();
  window.setInterval(updateCountdown, 60000);
  window.setInterval(() => {
    if (!activeMember) return;
    if (document.hidden || pendingMutations || document.activeElement?.closest('.inline-add, .category-dialog, .team-dialog')) return;
    loadChecklist().catch(() => {});
    if (activeMember?.isKelly) loadTeam().catch(() => {});
  }, 10000);
})();
