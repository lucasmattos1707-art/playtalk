(function initPlaytalkAdminPage() {
  const els = {
    energyForm: document.getElementById('adminEnergyForm'),
    multiplierInput: document.getElementById('adminEnergyMultiplierInput'),
    limitInput: document.getElementById('adminEnergyLimitInput'),
    energySaveBtn: document.getElementById('adminEnergySaveBtn'),
    energyStatus: document.getElementById('adminEnergyStatus'),
    preview100: document.getElementById('adminPreview100'),
    preview250: document.getElementById('adminPreview250'),
    previewLimit: document.getElementById('adminPreviewLimit'),
    factMultiplier: document.getElementById('adminFactMultiplier'),
    factLimit: document.getElementById('adminFactLimit'),
    welcomeModesForm: document.getElementById('adminWelcomeModesForm'),
    welcomeModesUsersEnabled: document.getElementById('adminWelcomeModesUsersEnabled'),
    welcomeModesSaveBtn: document.getElementById('adminWelcomeModesSaveBtn'),
    welcomeModesStatus: document.getElementById('adminWelcomeModesStatus'),
    factWelcomeModes: document.getElementById('adminFactWelcomeModes'),
    flashcardsPhaseForm: document.getElementById('adminFlashcardsPhaseForm'),
    fourthStarUsesSecondStarBlocks: document.getElementById('adminFourthStarUsesSecondStarBlocks'),
    flashcardsPhaseSaveBtn: document.getElementById('adminFlashcardsPhaseSaveBtn'),
    flashcardsPhaseStatus: document.getElementById('adminFlashcardsPhaseStatus'),
    factFourthStarBlocks: document.getElementById('adminFactFourthStarBlocks'),
    flashcardsLevelRulesForm: document.getElementById('adminFlashcardsLevelRulesForm'),
    flashcardsLevelRulesTableBody: document.getElementById('adminFlashcardsLevelRulesTableBody'),
    flashcardsLevelRulesSaveBtn: document.getElementById('adminFlashcardsLevelRulesSaveBtn'),
    flashcardsLevelRulesStatus: document.getElementById('adminFlashcardsLevelRulesStatus'),
    speedCurveForm: document.getElementById('adminSpeedCurveForm'),
    speedCurveChars6: document.getElementById('adminSpeedCurveChars6'),
    speedCurveChars15: document.getElementById('adminSpeedCurveChars15'),
    speedCurveChars30: document.getElementById('adminSpeedCurveChars30'),
    speedCurveChars60: document.getElementById('adminSpeedCurveChars60'),
    speedCurveSaveBtn: document.getElementById('adminSpeedCurveSaveBtn'),
    speedCurveStatus: document.getElementById('adminSpeedCurveStatus'),
    levelDynamicsForm: document.getElementById('adminLevelDynamicsForm'),
    speedGainRulesTableBody: document.getElementById('adminSpeedGainRulesTableBody'),
    firstStagePenaltyRulesTableBody: document.getElementById('adminFirstStagePenaltyRulesTableBody'),
    levelDynamicsSaveBtn: document.getElementById('adminLevelDynamicsSaveBtn'),
    levelDynamicsStatus: document.getElementById('adminLevelDynamicsStatus'),
    levelWindowForm: document.getElementById('adminLevelWindowForm'),
    levelWindowRulesTableBody: document.getElementById('adminLevelWindowRulesTableBody'),
    levelWindowSaveBtn: document.getElementById('adminLevelWindowSaveBtn'),
    levelWindowStatus: document.getElementById('adminLevelWindowStatus'),
    xpLevelCurveForm: document.getElementById('adminXpLevelCurveForm'),
    xpLevelCurveTableBody: document.getElementById('adminXpLevelCurveTableBody'),
    xpLevelCurveSaveBtn: document.getElementById('adminXpLevelCurveSaveBtn'),
    xpLevelCurveStatus: document.getElementById('adminXpLevelCurveStatus'),
    factXpMax: document.getElementById('adminFactXpMax')
  };

  const state = {
    user: null,
    energyBusy: false,
    welcomeModesBusy: false,
    settings: {
      dailyFreeEnergyLimit: 5000,
      energyCostMultiplier: 1,
      energyCostMultiplierMilli: 1000,
      energyCostMultiplierDisplay: '1.00x'
    },
    welcomeModes: {
      usersEnabled: false
    },
    flashcardsPhaseBusy: false,
    flashcardsPhase: {
      fourthStarUsesSecondStarBlocks: false
    },
    flashcardsLevelRulesBusy: false,
    flashcardsLevelRules: {
      levels: []
    },
    speedCurveBusy: false,
    speedCurve: {
      anchors: []
    },
    levelDynamicsBusy: false,
    levelDynamics: {
      speedLevelGainRules: [],
      firstStageMissPenaltyRules: []
    },
    levelWindowBusy: false,
    levelWindow: {
      rules: []
    },
    xpLevelCurveBusy: false,
    xpLevelCurve: {
      anchors: []
    }
  };

  function buildApiUrl(path) {
    if (window.PlaytalkApi && typeof window.PlaytalkApi.buildApiUrl === 'function') {
      return window.PlaytalkApi.buildApiUrl(path);
    }
    return path;
  }

  function buildAuthHeaders(extraHeaders) {
    if (window.PlaytalkApi && typeof window.PlaytalkApi.buildAuthHeaders === 'function') {
      return window.PlaytalkApi.buildAuthHeaders(extraHeaders);
    }
    return { ...(extraHeaders || {}) };
  }

  function navigateTo(target, options = {}) {
    if (window.PlaytalkNative && typeof window.PlaytalkNative.navigate === 'function') {
      window.PlaytalkNative.navigate(target, options);
      return;
    }
    if (options.replace) {
      window.location.replace(target);
      return;
    }
    window.location.href = target;
  }

  function safeNumber(value, fallback = 0) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
  }

  function parseLocaleDecimal(value, fallback = 0) {
    const normalized = String(value ?? '').trim().replace(',', '.');
    const numeric = Number(normalized);
    return Number.isFinite(numeric) ? numeric : fallback;
  }

  function formatInteger(value) {
    return new Intl.NumberFormat('pt-BR').format(Math.max(0, Math.round(safeNumber(value))));
  }

  function formatMultiplier(value) {
    const numeric = Math.max(0.01, Math.min(10, safeNumber(value, 1)));
    return `${numeric.toFixed(2)}x`;
  }

  function formatWelcomeModesState(usersEnabled) {
    return usersEnabled ? 'Ligados' : 'Desligados';
  }

  function formatFourthStarBlocksState(enabled) {
    return enabled ? 'Ligado' : 'Desligado';
  }

  function applyMultiplier(chars, multiplier) {
    const normalizedChars = Math.max(0, Math.round(safeNumber(chars)));
    const normalizedMultiplier = Math.max(0.01, Math.min(10, safeNumber(multiplier, 1)));
    return Math.ceil(normalizedChars * normalizedMultiplier);
  }

  function setStatus(target, message, tone) {
    if (!target) return;
    target.textContent = message || '';
    target.className = 'admin-status';
    if (tone) target.classList.add(`is-${tone}`);
  }

  function syncEnergyBusyState() {
    if (els.energySaveBtn) {
      els.energySaveBtn.disabled = state.energyBusy;
      els.energySaveBtn.textContent = state.energyBusy ? 'Salvando...' : 'Salvar energia';
    }
    if (els.multiplierInput) els.multiplierInput.disabled = state.energyBusy;
    if (els.limitInput) els.limitInput.disabled = state.energyBusy;
  }

  function syncWelcomeModesBusyState() {
    if (els.welcomeModesSaveBtn) {
      els.welcomeModesSaveBtn.disabled = state.welcomeModesBusy;
      els.welcomeModesSaveBtn.textContent = state.welcomeModesBusy ? 'Salvando...' : 'Salvar modos';
    }
    if (els.welcomeModesUsersEnabled) els.welcomeModesUsersEnabled.disabled = state.welcomeModesBusy;
  }

  function syncFlashcardsPhaseBusyState() {
    if (els.flashcardsPhaseSaveBtn) {
      els.flashcardsPhaseSaveBtn.disabled = state.flashcardsPhaseBusy;
      els.flashcardsPhaseSaveBtn.textContent = state.flashcardsPhaseBusy ? 'Salvando...' : 'Salvar fase';
    }
    if (els.fourthStarUsesSecondStarBlocks) {
      els.fourthStarUsesSecondStarBlocks.disabled = state.flashcardsPhaseBusy;
    }
  }

  function syncFlashcardsLevelRulesBusyState() {
    if (els.flashcardsLevelRulesSaveBtn) {
      els.flashcardsLevelRulesSaveBtn.disabled = state.flashcardsLevelRulesBusy;
      els.flashcardsLevelRulesSaveBtn.textContent = state.flashcardsLevelRulesBusy ? 'Salvando...' : 'Salvar tabela de niveis';
    }
    Array.from(els.flashcardsLevelRulesForm?.querySelectorAll('input[type="number"]') || []).forEach((input) => {
      input.disabled = state.flashcardsLevelRulesBusy;
    });
  }

  function syncSpeedCurveBusyState() {
    if (els.speedCurveSaveBtn) {
      els.speedCurveSaveBtn.disabled = state.speedCurveBusy;
      els.speedCurveSaveBtn.textContent = state.speedCurveBusy ? 'Salvando...' : 'Salvar curva da velocidade';
    }
    [
      els.speedCurveChars6,
      els.speedCurveChars15,
      els.speedCurveChars30,
      els.speedCurveChars60
    ].forEach((input) => {
      if (!input) return;
      input.disabled = state.speedCurveBusy;
    });
  }

  function syncLevelDynamicsBusyState() {
    if (els.levelDynamicsSaveBtn) {
      els.levelDynamicsSaveBtn.disabled = state.levelDynamicsBusy;
      els.levelDynamicsSaveBtn.textContent = state.levelDynamicsBusy ? 'Salvando...' : 'Salvar dinamicas de nivel';
    }
    Array.from(els.levelDynamicsForm?.querySelectorAll('input[type="number"]') || []).forEach((input) => {
      input.disabled = state.levelDynamicsBusy;
    });
  }

  function syncLevelWindowBusyState() {
    if (els.levelWindowSaveBtn) {
      els.levelWindowSaveBtn.disabled = state.levelWindowBusy;
      els.levelWindowSaveBtn.textContent = state.levelWindowBusy ? 'Salvando...' : 'Salvar janela de decks';
    }
    Array.from(els.levelWindowForm?.querySelectorAll('input[type="number"]') || []).forEach((input) => {
      input.disabled = state.levelWindowBusy;
    });
  }

  function syncXpLevelCurveBusyState() {
    if (els.xpLevelCurveSaveBtn) {
      els.xpLevelCurveSaveBtn.disabled = state.xpLevelCurveBusy;
      els.xpLevelCurveSaveBtn.textContent = state.xpLevelCurveBusy ? 'Salvando...' : 'Salvar curva de XP';
    }
    Array.from(els.xpLevelCurveForm?.querySelectorAll('input[type="number"]') || []).forEach((input) => {
      input.disabled = state.xpLevelCurveBusy;
    });
  }

  function readDraftSettings() {
    return {
      energyCostMultiplier: Math.max(0.01, Math.min(10, safeNumber(els.multiplierInput?.value, state.settings.energyCostMultiplier))),
      dailyFreeEnergyLimit: Math.max(0, Math.min(1000000, Math.round(safeNumber(els.limitInput?.value, state.settings.dailyFreeEnergyLimit))))
    };
  }

  function readDraftWelcomeModes() {
    return {
      usersEnabled: Boolean(els.welcomeModesUsersEnabled?.checked)
    };
  }

  function readDraftFlashcardsPhase() {
    return {
      fourthStarUsesSecondStarBlocks: Boolean(els.fourthStarUsesSecondStarBlocks?.checked)
    };
  }

  function anchorValue(input, fallback) {
    return Math.max(0.01, Math.min(10, Number((safeNumber(input?.value, fallback)).toFixed(2))));
  }

  function readDraftSpeedCurve() {
    return {
      anchors: [
        { chars: 6, multiplier: anchorValue(els.speedCurveChars6, 2) },
        { chars: 15, multiplier: anchorValue(els.speedCurveChars15, 1) },
        { chars: 30, multiplier: anchorValue(els.speedCurveChars30, 0.5) },
        { chars: 60, multiplier: anchorValue(els.speedCurveChars60, 0.3) }
      ]
    };
  }

  function buildDefaultLevelDynamicsSettings() {
    return {
      speedLevelGainRules: [
        { minSpeed: 0, maxSpeed: 799, levelGainPerMinute: 0 },
        { minSpeed: 800, maxSpeed: 899, levelGainPerMinute: 1 },
        { minSpeed: 900, maxSpeed: 999, levelGainPerMinute: 1 },
        { minSpeed: 1000, maxSpeed: 1099, levelGainPerMinute: 2 },
        { minSpeed: 1100, maxSpeed: 1199, levelGainPerMinute: 2 },
        { minSpeed: 1200, maxSpeed: 1299, levelGainPerMinute: 3 },
        { minSpeed: 1300, maxSpeed: 1399, levelGainPerMinute: 3 },
        { minSpeed: 1400, maxSpeed: 1499, levelGainPerMinute: 4 },
        { minSpeed: 1500, maxSpeed: 1599, levelGainPerMinute: 4 },
        { minSpeed: 1600, maxSpeed: null, levelGainPerMinute: 4 }
      ],
      firstStageMissPenaltyRules: [
        { minLevel: 80, levelLoss: 7 },
        { minLevel: 70, levelLoss: 6 },
        { minLevel: 60, levelLoss: 5 },
        { minLevel: 50, levelLoss: 4 },
        { minLevel: 40, levelLoss: 3 },
        { minLevel: 30, levelLoss: 2 }
      ]
    };
  }

  function normalizeLevelDynamicsSettings(settings) {
    const defaults = buildDefaultLevelDynamicsSettings();
    const source = settings && typeof settings === 'object' ? settings : {};
    const speedLevelGainRules = Array.isArray(source.speedLevelGainRules)
      ? source.speedLevelGainRules.map((entry) => {
          const minSpeed = Math.max(0, Math.floor(Number(entry?.minSpeed) || 0));
          const hasMax = entry?.maxSpeed === null || entry?.maxSpeed === '' || Number.isFinite(Number(entry?.maxSpeed));
          if (!hasMax) return null;
          const maxSpeed = entry?.maxSpeed === null || entry?.maxSpeed === ''
            ? null
            : Math.max(minSpeed, Math.floor(Number(entry?.maxSpeed) || minSpeed));
          return {
            minSpeed,
            maxSpeed,
            levelGainPerMinute: Math.max(0, Math.min(20, Number(parseLocaleDecimal(entry?.levelGainPerMinute, 0).toFixed(2))))
          };
        }).filter(Boolean)
      : defaults.speedLevelGainRules.slice();

    const firstStageMissPenaltyRules = Array.isArray(source.firstStageMissPenaltyRules)
      ? source.firstStageMissPenaltyRules.map((entry) => ({
          minLevel: Math.max(1, Math.min(200, Math.floor(Number(entry?.minLevel) || 1))),
          levelLoss: Math.max(0, Math.min(50, Number(parseLocaleDecimal(entry?.levelLoss, 0).toFixed(2))))
        })).filter((entry) => entry.levelLoss > 0)
      : defaults.firstStageMissPenaltyRules.slice();

    return {
      speedLevelGainRules: speedLevelGainRules.length ? speedLevelGainRules.sort((a, b) => a.minSpeed - b.minSpeed) : defaults.speedLevelGainRules.slice(),
      firstStageMissPenaltyRules: firstStageMissPenaltyRules.length ? firstStageMissPenaltyRules.sort((a, b) => b.minLevel - a.minLevel) : defaults.firstStageMissPenaltyRules.slice()
    };
  }

  function renderPreview() {
    const draft = readDraftSettings();
    const preview100 = applyMultiplier(100, draft.energyCostMultiplier);
    const preview250 = applyMultiplier(250, draft.energyCostMultiplier);
    if (els.preview100) els.preview100.textContent = `${formatInteger(preview100)} energias`;
    if (els.preview250) els.preview250.textContent = `${formatInteger(preview250)} energias`;
    if (els.previewLimit) els.previewLimit.textContent = `${formatInteger(draft.dailyFreeEnergyLimit)} energias`;
    if (els.factMultiplier) els.factMultiplier.textContent = formatMultiplier(draft.energyCostMultiplier);
    if (els.factLimit) els.factLimit.textContent = `${formatInteger(draft.dailyFreeEnergyLimit)} energias`;
  }

  function renderWelcomeModesFact() {
    if (els.factWelcomeModes) {
      els.factWelcomeModes.textContent = formatWelcomeModesState(state.welcomeModes.usersEnabled);
    }
  }

  function renderFlashcardsPhaseFact() {
    if (els.factFourthStarBlocks) {
      els.factFourthStarBlocks.textContent = formatFourthStarBlocksState(state.flashcardsPhase.fourthStarUsesSecondStarBlocks);
    }
  }

  function applySpeedCurve(settings) {
    const anchors = Array.isArray(settings?.anchors) ? settings.anchors : [];
    const byChars = new Map(anchors.map((entry) => [Number(entry?.chars), Number(entry?.multiplier)]));
    const safe6 = Math.max(0.01, Math.min(10, Number(byChars.get(6)) || 2));
    const safe15 = Math.max(0.01, Math.min(10, Number(byChars.get(15)) || 1));
    const safe30 = Math.max(0.01, Math.min(10, Number(byChars.get(30)) || 0.5));
    const safe60 = Math.max(0.01, Math.min(10, Number(byChars.get(60)) || 0.3));
    state.speedCurve = {
      anchors: [
        { chars: 6, multiplier: safe6 },
        { chars: 15, multiplier: safe15 },
        { chars: 30, multiplier: safe30 },
        { chars: 60, multiplier: safe60 }
      ]
    };
    if (els.speedCurveChars6) els.speedCurveChars6.value = safe6.toFixed(2);
    if (els.speedCurveChars15) els.speedCurveChars15.value = safe15.toFixed(2);
    if (els.speedCurveChars30) els.speedCurveChars30.value = safe30.toFixed(2);
    if (els.speedCurveChars60) els.speedCurveChars60.value = safe60.toFixed(2);
  }

  function applySettings(settings) {
    state.settings = {
      dailyFreeEnergyLimit: Math.max(0, Math.min(1000000, Math.round(safeNumber(settings?.dailyFreeEnergyLimit, 5000)))),
      energyCostMultiplier: Math.max(0.01, Math.min(10, safeNumber(settings?.energyCostMultiplier, 1))),
      energyCostMultiplierMilli: Math.max(1, Math.round(safeNumber(settings?.energyCostMultiplierMilli, 1000))),
      energyCostMultiplierDisplay: String(settings?.energyCostMultiplierDisplay || formatMultiplier(settings?.energyCostMultiplier || 1))
    };
    if (els.multiplierInput) els.multiplierInput.value = state.settings.energyCostMultiplier.toFixed(2);
    if (els.limitInput) els.limitInput.value = String(state.settings.dailyFreeEnergyLimit);
    renderPreview();
  }

  function applyWelcomeModes(settings) {
    state.welcomeModes = {
      usersEnabled: Boolean(settings?.usersEnabled)
    };
    if (els.welcomeModesUsersEnabled) {
      els.welcomeModesUsersEnabled.checked = state.welcomeModes.usersEnabled;
    }
    renderWelcomeModesFact();
  }

  function applyFlashcardsPhase(settings) {
    state.flashcardsPhase = {
      fourthStarUsesSecondStarBlocks: Boolean(settings?.fourthStarUsesSecondStarBlocks)
    };
    if (els.fourthStarUsesSecondStarBlocks) {
      els.fourthStarUsesSecondStarBlocks.checked = state.flashcardsPhase.fourthStarUsesSecondStarBlocks;
    }
    renderFlashcardsPhaseFact();
  }

  function applyFlashcardsLevelRules(settings) {
    const levels = Array.isArray(settings?.levels) ? settings.levels : [];
    state.flashcardsLevelRules = { levels };
    if (els.flashcardsLevelRulesTableBody) {
      const rows = levels
        .slice()
        .sort((a, b) => (Number(a?.level) || 0) - (Number(b?.level) || 0))
        .map((entry) => {
          const level = Math.max(1, Math.min(100, Number.parseInt(entry?.level, 10) || 1));
          const minChars = Math.max(0, Math.round(Number(entry?.minChars) || 0));
          const maxChars = Math.max(1, Math.round(Number(entry?.maxChars) || 1));
          const hitThreshold = Math.max(1, Math.min(100, Math.round(Number(entry?.hitThreshold) || 1)));
          return `
            <tr data-level-row="${level}">
              <td><strong>${level}</strong></td>
              <td><input type="number" min="0" max="300" step="1" value="${minChars}" data-level-field="minChars"></td>
              <td><input type="number" min="1" max="300" step="1" value="${maxChars}" data-level-field="maxChars"></td>
              <td><input type="number" min="1" max="100" step="1" value="${hitThreshold}" data-level-field="hitThreshold"></td>
            </tr>
          `;
        });
      els.flashcardsLevelRulesTableBody.innerHTML = rows.join('');
    }
  }

  function readDraftFlashcardsLevelRules() {
    const levels = Array.from(els.flashcardsLevelRulesTableBody?.querySelectorAll('tr[data-level-row]') || []).map((row) => {
      const level = Math.max(1, Math.min(100, Number.parseInt(row.getAttribute('data-level-row') || '0', 10) || 1));
      const minChars = Math.max(0, Math.round(Number(row.querySelector('[data-level-field="minChars"]')?.value) || 0));
      const maxChars = Math.max(1, Math.round(Number(row.querySelector('[data-level-field="maxChars"]')?.value) || 1));
      const hitThreshold = Math.max(1, Math.min(100, Math.round(Number(row.querySelector('[data-level-field="hitThreshold"]')?.value) || 1)));
      return { level, minChars, maxChars, hitThreshold };
    });

    if (!levels.length) {
      throw new Error('Nao ha linhas para salvar na tabela de niveis.');
    }
    levels.forEach((entry) => {
      if (entry.maxChars < entry.minChars) {
        throw new Error(`Nivel ${entry.level}: maxChars nao pode ser menor que minChars.`);
      }
    });
    return { levels };
  }

  function applyLevelDynamicsSettings(settings) {
    const snapshot = normalizeLevelDynamicsSettings(settings);
    state.levelDynamics = snapshot;

    if (els.speedGainRulesTableBody) {
      const rows = snapshot.speedLevelGainRules.map((entry, index) => {
        const minSpeed = Math.max(0, Math.floor(Number(entry?.minSpeed) || 0));
        const maxSpeed = entry?.maxSpeed === null ? '' : Math.max(minSpeed, Math.floor(Number(entry?.maxSpeed) || minSpeed));
        const levelGainPerMinute = Math.max(0, Math.min(20, Number(parseLocaleDecimal(entry?.levelGainPerMinute, 0).toFixed(2))));
        return `
          <tr data-speed-gain-row="${index}">
            <td><input type="number" min="0" max="100000" step="1" value="${minSpeed}" data-speed-gain-field="minSpeed"></td>
            <td><input type="number" min="0" max="100000" step="1" value="${maxSpeed}" data-speed-gain-field="maxSpeed" placeholder="sem limite"></td>
            <td><input type="text" inputmode="decimal" value="${levelGainPerMinute}" data-speed-gain-field="levelGainPerMinute"></td>
          </tr>
        `;
      });
      els.speedGainRulesTableBody.innerHTML = rows.join('');
    }

    if (els.firstStagePenaltyRulesTableBody) {
      const rows = snapshot.firstStageMissPenaltyRules.map((entry, index) => {
        const minLevel = Math.max(1, Math.min(200, Math.floor(Number(entry?.minLevel) || 1)));
        const levelLoss = Math.max(0, Math.min(50, Number(parseLocaleDecimal(entry?.levelLoss, 0).toFixed(2))));
        return `
          <tr data-first-stage-penalty-row="${index}">
            <td><input type="number" min="1" max="200" step="1" value="${minLevel}" data-first-stage-penalty-field="minLevel"></td>
            <td><input type="text" inputmode="decimal" value="${levelLoss}" data-first-stage-penalty-field="levelLoss"></td>
          </tr>
        `;
      });
      els.firstStagePenaltyRulesTableBody.innerHTML = rows.join('');
    }
  }

  function readDraftLevelDynamicsSettings() {
    const speedLevelGainRules = Array.from(els.speedGainRulesTableBody?.querySelectorAll('tr[data-speed-gain-row]') || []).map((row) => {
      const minSpeed = Math.max(0, Math.floor(Number(row.querySelector('[data-speed-gain-field="minSpeed"]')?.value) || 0));
      const maxRaw = row.querySelector('[data-speed-gain-field="maxSpeed"]')?.value;
      const maxSpeed = String(maxRaw || '').trim() === ''
        ? null
        : Math.max(minSpeed, Math.floor(Number(maxRaw) || minSpeed));
      const levelGainPerMinute = Math.max(0, Math.min(20, Number(parseLocaleDecimal(row.querySelector('[data-speed-gain-field="levelGainPerMinute"]')?.value, 0).toFixed(2))));
      return { minSpeed, maxSpeed, levelGainPerMinute };
    });

    const firstStageMissPenaltyRules = Array.from(els.firstStagePenaltyRulesTableBody?.querySelectorAll('tr[data-first-stage-penalty-row]') || []).map((row) => {
      const minLevel = Math.max(1, Math.min(200, Math.floor(Number(row.querySelector('[data-first-stage-penalty-field="minLevel"]')?.value) || 1)));
      const levelLoss = Math.max(0, Math.min(50, Number(parseLocaleDecimal(row.querySelector('[data-first-stage-penalty-field="levelLoss"]')?.value, 0).toFixed(2))));
      return { minLevel, levelLoss };
    }).filter((entry) => entry.levelLoss > 0);

    if (!speedLevelGainRules.length) {
      throw new Error('Adicione ao menos uma linha de ganho por minuto.');
    }
    if (!firstStageMissPenaltyRules.length) {
      throw new Error('Adicione ao menos uma linha de perda por erro na first-star.');
    }

    return normalizeLevelDynamicsSettings({
      speedLevelGainRules,
      firstStageMissPenaltyRules
    });
  }

  function buildDefaultLevelWindowSettings() {
    return {
      rules: [
        { minLevel: 1, maxLevel: 20, windowSize: 5 },
        { minLevel: 21, maxLevel: 30, windowSize: 6 },
        { minLevel: 31, maxLevel: 40, windowSize: 8 },
        { minLevel: 41, maxLevel: 50, windowSize: 12 },
        { minLevel: 51, maxLevel: 60, windowSize: 15 },
        { minLevel: 61, maxLevel: 70, windowSize: 20 },
        { minLevel: 71, maxLevel: 80, windowSize: 25 },
        { minLevel: 81, maxLevel: 90, windowSize: 30 },
        { minLevel: 91, maxLevel: 200, windowSize: 40 }
      ]
    };
  }

  function normalizeLevelWindowSettings(settings) {
    const defaults = buildDefaultLevelWindowSettings();
    const source = settings && typeof settings === 'object' ? settings : {};
    const rawRules = Array.isArray(source.rules)
      ? source.rules
      : Array.isArray(source.levelWindowRules)
        ? source.levelWindowRules
        : defaults.rules;
    const rules = rawRules
      .map((entry) => {
        const minLevel = Math.max(1, Math.min(200, Math.floor(Number(entry?.minLevel) || 1)));
        const maxRaw = entry?.maxLevel;
        const maxLevel = maxRaw === null || maxRaw === ''
          ? 200
          : Math.max(minLevel, Math.min(200, Math.floor(Number(maxRaw) || minLevel)));
        const windowSize = Math.max(1, Math.min(200, Math.floor(Number(entry?.windowSize) || 0)));
        if (!windowSize) return null;
        return { minLevel, maxLevel, windowSize };
      })
      .filter(Boolean)
      .sort((a, b) => a.minLevel - b.minLevel);
    return { rules: rules.length ? rules : defaults.rules.slice() };
  }

  function applyLevelWindowSettings(settings) {
    const snapshot = normalizeLevelWindowSettings(settings);
    state.levelWindow = snapshot;
    if (!els.levelWindowRulesTableBody) return;
    const rows = snapshot.rules.map((entry, index) => {
      const minLevel = Math.max(1, Math.min(200, Math.floor(Number(entry?.minLevel) || 1)));
      const maxLevel = Math.max(minLevel, Math.min(200, Math.floor(Number(entry?.maxLevel) || minLevel)));
      const windowSize = Math.max(1, Math.min(200, Math.floor(Number(entry?.windowSize) || 1)));
      return `
        <tr data-level-window-row="${index}">
          <td><input type="number" min="1" max="200" step="1" value="${minLevel}" data-level-window-field="minLevel"></td>
          <td><input type="number" min="1" max="200" step="1" value="${maxLevel}" data-level-window-field="maxLevel"></td>
          <td><input type="number" min="1" max="200" step="1" value="${windowSize}" data-level-window-field="windowSize"></td>
        </tr>
      `;
    });
    els.levelWindowRulesTableBody.innerHTML = rows.join('');
  }

  function buildDefaultXpLevelCurveAnchors() {
    return [
      { level: 2, xp: 50 }, { level: 5, xp: 300 }, { level: 10, xp: 1500 }, { level: 15, xp: 4000 },
      { level: 20, xp: 8000 }, { level: 25, xp: 15000 }, { level: 30, xp: 30000 }, { level: 35, xp: 55000 },
      { level: 40, xp: 90000 }, { level: 45, xp: 140000 }, { level: 50, xp: 220000 }, { level: 55, xp: 320000 },
      { level: 60, xp: 450000 }, { level: 65, xp: 580000 }, { level: 70, xp: 700000 }, { level: 75, xp: 820000 },
      { level: 80, xp: 900000 }, { level: 85, xp: 950000 }, { level: 90, xp: 980000 }, { level: 100, xp: 1000000 },
      { level: 120, xp: 1400000 }, { level: 140, xp: 1800000 }, { level: 160, xp: 2200000 }, { level: 180, xp: 2600000 },
      { level: 200, xp: 3000000 }, { level: 250, xp: 5500000 }, { level: 300, xp: 9000000 }, { level: 400, xp: 16000000 },
      { level: 500, xp: 25000000 }
    ];
  }

  function normalizeXpLevelCurveSettings(settings) {
    const defaults = buildDefaultXpLevelCurveAnchors();
    const source = Array.isArray(settings?.anchors) ? settings.anchors : defaults;
    const anchors = source
      .map((entry) => ({
        level: Math.max(2, Math.min(500, Math.floor(Number(entry?.level) || 0))),
        xp: Math.max(1, Math.floor(Number(entry?.xp) || 0))
      }))
      .filter((entry) => Number.isFinite(entry.level) && Number.isFinite(entry.xp))
      .sort((a, b) => a.level - b.level);
    if (!anchors.length || anchors[0].level !== 2 || anchors[anchors.length - 1].level !== 500) {
      return { anchors: defaults };
    }
    return { anchors };
  }

  function applyXpLevelCurveSettings(settings) {
    const snapshot = normalizeXpLevelCurveSettings(settings);
    state.xpLevelCurve = snapshot;
    if (els.xpLevelCurveTableBody) {
      const rows = snapshot.anchors.map((entry, index) => `
        <tr data-xp-anchor-row="${index}">
          <td><input type="number" min="2" max="500" step="1" value="${entry.level}" data-xp-anchor-field="level"></td>
          <td><input type="number" min="1" max="1000000000" step="1" value="${entry.xp}" data-xp-anchor-field="xp"></td>
        </tr>
      `);
      els.xpLevelCurveTableBody.innerHTML = rows.join('');
    }
    if (els.factXpMax) {
      const max = snapshot.anchors[snapshot.anchors.length - 1];
      els.factXpMax.textContent = `${formatInteger(max?.xp || 0)} XP`;
    }
  }

  function readDraftXpLevelCurveSettings() {
    const anchors = Array.from(els.xpLevelCurveTableBody?.querySelectorAll('tr[data-xp-anchor-row]') || []).map((row) => ({
      level: Math.max(2, Math.min(500, Math.floor(Number(row.querySelector('[data-xp-anchor-field="level"]')?.value) || 0))),
      xp: Math.max(1, Math.floor(Number(row.querySelector('[data-xp-anchor-field="xp"]')?.value) || 0))
    })).sort((a, b) => a.level - b.level);
    if (!anchors.length || anchors[0].level !== 2 || anchors[anchors.length - 1].level !== 500) {
      throw new Error('A tabela precisa comecar no nivel 2 e terminar no nivel 500.');
    }
    for (let i = 1; i < anchors.length; i += 1) {
      if (anchors[i].level === anchors[i - 1].level) {
        throw new Error(`Nivel duplicado encontrado: ${anchors[i].level}.`);
      }
      if (anchors[i].xp < anchors[i - 1].xp) {
        throw new Error(`XP deve ser crescente. Nivel ${anchors[i].level} ficou menor que o anterior.`);
      }
    }
    return { anchors };
  }

  function readDraftLevelWindowSettings() {
    const rules = Array.from(els.levelWindowRulesTableBody?.querySelectorAll('tr[data-level-window-row]') || []).map((row) => {
      const minLevel = Math.max(1, Math.min(200, Math.floor(Number(row.querySelector('[data-level-window-field="minLevel"]')?.value) || 1)));
      const maxLevel = Math.max(minLevel, Math.min(200, Math.floor(Number(row.querySelector('[data-level-window-field="maxLevel"]')?.value) || minLevel)));
      const windowSize = Math.max(1, Math.min(200, Math.floor(Number(row.querySelector('[data-level-window-field="windowSize"]')?.value) || 1)));
      return { minLevel, maxLevel, windowSize };
    });
    if (!rules.length) {
      throw new Error('Adicione ao menos uma linha na janela de decks.');
    }
    return normalizeLevelWindowSettings({ rules });
  }

  async function fetchSessionUser() {
    if (window.PlaytalkApi && typeof window.PlaytalkApi.fetchSessionUser === 'function') {
      return window.PlaytalkApi.fetchSessionUser({ attempts: 2, timeoutMs: 3500 });
    }
    const response = await fetch(buildApiUrl('/auth/session'), {
      headers: buildAuthHeaders(),
      credentials: 'include',
      cache: 'no-store'
    });
    const payload = await response.json().catch(() => ({}));
    return response.ok && payload?.success ? payload.user : null;
  }

  async function loadEnergySettings() {
    const response = await fetch(buildApiUrl('/api/admin/energy-settings'), {
      headers: buildAuthHeaders(),
      credentials: 'include',
      cache: 'no-store'
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.success || !payload?.settings) {
      throw new Error(payload?.message || 'Nao foi possivel carregar as configuracoes de energia.');
    }
    applySettings(payload.settings);
  }

  async function loadWelcomeModeSettings() {
    const response = await fetch(buildApiUrl('/api/admin/welcome-mode-settings'), {
      headers: buildAuthHeaders(),
      credentials: 'include',
      cache: 'no-store'
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.success || !payload?.settings) {
      throw new Error(payload?.message || 'Nao foi possivel carregar as configuracoes dos modos extras.');
    }
    applyWelcomeModes(payload.settings);
  }

  async function loadFlashcardsPhaseSettings() {
    const response = await fetch(buildApiUrl('/api/admin/flashcards/phase-settings'), {
      headers: buildAuthHeaders(),
      credentials: 'include',
      cache: 'no-store'
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.success || !payload?.settings) {
      throw new Error(payload?.message || 'Nao foi possivel carregar a configuracao da fourth-star.');
    }
    applyFlashcardsPhase(payload.settings);
  }

  async function loadFlashcardsLevelRulesSettings() {
    const response = await fetch(buildApiUrl('/api/admin/flashcards/level-rules'), {
      headers: buildAuthHeaders(),
      credentials: 'include',
      cache: 'no-store'
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.success || !payload?.settings) {
      throw new Error(payload?.message || 'Nao foi possivel carregar as regras de nivel.');
    }
    applyFlashcardsLevelRules(payload.settings);
  }

  async function loadSpeedCurveSettings() {
    const response = await fetch(buildApiUrl('/api/admin/flashcards/speed-curve-settings'), {
      headers: buildAuthHeaders(),
      credentials: 'include',
      cache: 'no-store'
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.success || !payload?.settings) {
      throw new Error(payload?.message || 'Nao foi possivel carregar a curva da velocidade.');
    }
    applySpeedCurve(payload.settings);
  }

  async function loadLevelDynamicsSettings() {
    const response = await fetch(buildApiUrl('/api/admin/flashcards/level-dynamics-settings'), {
      headers: buildAuthHeaders(),
      credentials: 'include',
      cache: 'no-store'
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.success || !payload?.settings) {
      throw new Error(payload?.message || 'Nao foi possivel carregar as dinamicas de nivel.');
    }
    applyLevelDynamicsSettings(payload.settings);
  }

  async function loadLevelWindowSettings() {
    const response = await fetch(buildApiUrl('/api/admin/flashcards/level-window-settings'), {
      headers: buildAuthHeaders(),
      credentials: 'include',
      cache: 'no-store'
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.success || !payload?.settings) {
      throw new Error(payload?.message || 'Nao foi possivel carregar a janela de niveis dos decks.');
    }
    applyLevelWindowSettings(payload.settings);
  }

  async function loadXpLevelCurveSettings() {
    const response = await fetch(buildApiUrl('/api/admin/flashcards/xp-level-settings'), {
      headers: buildAuthHeaders(),
      credentials: 'include',
      cache: 'no-store'
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.success || !payload?.settings) {
      throw new Error(payload?.message || 'Nao foi possivel carregar a curva de XP por nivel.');
    }
    applyXpLevelCurveSettings(payload.settings);
  }

  async function submitEnergySettings(event) {
    event.preventDefault();
    state.energyBusy = true;
    syncEnergyBusyState();
    setStatus(els.energyStatus, 'Salvando configuracoes de energia...');
    try {
      const draft = readDraftSettings();
      const response = await fetch(buildApiUrl('/api/admin/energy-settings'), {
        method: 'POST',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify(draft)
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success || !payload?.settings) {
        throw new Error(payload?.message || 'Nao foi possivel salvar as configuracoes de energia.');
      }
      applySettings(payload.settings);
      setStatus(els.energyStatus, payload?.message || 'Configuracoes de energia atualizadas.', 'success');
    } catch (error) {
      setStatus(els.energyStatus, error?.message || 'Nao foi possivel salvar as configuracoes de energia.', 'error');
    } finally {
      state.energyBusy = false;
      syncEnergyBusyState();
    }
  }

  async function submitWelcomeModeSettings(event) {
    event.preventDefault();
    state.welcomeModesBusy = true;
    syncWelcomeModesBusyState();
    setStatus(els.welcomeModesStatus, 'Salvando configuracoes dos modos extras...');
    try {
      const draft = readDraftWelcomeModes();
      const response = await fetch(buildApiUrl('/api/admin/welcome-mode-settings'), {
        method: 'POST',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify(draft)
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success || !payload?.settings) {
        throw new Error(payload?.message || 'Nao foi possivel salvar as configuracoes dos modos extras.');
      }
      applyWelcomeModes(payload.settings);
      setStatus(els.welcomeModesStatus, payload?.message || 'Configuracoes dos modos extras atualizadas.', 'success');
    } catch (error) {
      setStatus(els.welcomeModesStatus, error?.message || 'Nao foi possivel salvar as configuracoes dos modos extras.', 'error');
    } finally {
      state.welcomeModesBusy = false;
      syncWelcomeModesBusyState();
    }
  }

  async function submitFlashcardsPhaseSettings(event) {
    event.preventDefault();
    state.flashcardsPhaseBusy = true;
    syncFlashcardsPhaseBusyState();
    setStatus(els.flashcardsPhaseStatus, 'Salvando configuracao da fourth-star...');
    try {
      const draft = readDraftFlashcardsPhase();
      const response = await fetch(buildApiUrl('/api/admin/flashcards/phase-settings'), {
        method: 'POST',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify(draft)
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success || !payload?.settings) {
        throw new Error(payload?.message || 'Nao foi possivel salvar a configuracao da fourth-star.');
      }
      applyFlashcardsPhase(payload.settings);
      setStatus(els.flashcardsPhaseStatus, payload?.message || 'Configuracao da fourth-star atualizada.', 'success');
    } catch (error) {
      setStatus(els.flashcardsPhaseStatus, error?.message || 'Nao foi possivel salvar a configuracao da fourth-star.', 'error');
    } finally {
      state.flashcardsPhaseBusy = false;
      syncFlashcardsPhaseBusyState();
    }
  }

  async function submitFlashcardsLevelRulesSettings(event) {
    event.preventDefault();
    state.flashcardsLevelRulesBusy = true;
    syncFlashcardsLevelRulesBusyState();
    setStatus(els.flashcardsLevelRulesStatus, 'Salvando tabela de niveis...');
    try {
      const draft = readDraftFlashcardsLevelRules();
      const response = await fetch(buildApiUrl('/api/admin/flashcards/level-rules'), {
        method: 'POST',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify(draft)
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success || !payload?.settings) {
        throw new Error(payload?.message || 'Nao foi possivel salvar as regras de nivel.');
      }
      applyFlashcardsLevelRules(payload.settings);
      setStatus(els.flashcardsLevelRulesStatus, payload?.message || 'Regras de nivel atualizadas.', 'success');
    } catch (error) {
      setStatus(els.flashcardsLevelRulesStatus, error?.message || 'Nao foi possivel salvar as regras de nivel.', 'error');
    } finally {
      state.flashcardsLevelRulesBusy = false;
      syncFlashcardsLevelRulesBusyState();
    }
  }

  async function submitSpeedCurveSettings(event) {
    event.preventDefault();
    state.speedCurveBusy = true;
    syncSpeedCurveBusyState();
    setStatus(els.speedCurveStatus, 'Salvando curva da velocidade...');
    try {
      const draft = readDraftSpeedCurve();
      const response = await fetch(buildApiUrl('/api/admin/flashcards/speed-curve-settings'), {
        method: 'POST',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify(draft)
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success || !payload?.settings) {
        throw new Error(payload?.message || 'Nao foi possivel salvar a curva da velocidade.');
      }
      applySpeedCurve(payload.settings);
      setStatus(els.speedCurveStatus, payload?.message || 'Curva da velocidade atualizada.', 'success');
    } catch (error) {
      setStatus(els.speedCurveStatus, error?.message || 'Nao foi possivel salvar a curva da velocidade.', 'error');
    } finally {
      state.speedCurveBusy = false;
      syncSpeedCurveBusyState();
    }
  }

  async function submitLevelDynamicsSettings(event) {
    event.preventDefault();
    state.levelDynamicsBusy = true;
    syncLevelDynamicsBusyState();
    setStatus(els.levelDynamicsStatus, 'Salvando dinamicas de nivel...');
    try {
      const draft = readDraftLevelDynamicsSettings();
      const response = await fetch(buildApiUrl('/api/admin/flashcards/level-dynamics-settings'), {
        method: 'POST',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify(draft)
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success || !payload?.settings) {
        throw new Error(payload?.message || 'Nao foi possivel salvar as dinamicas de nivel.');
      }
      applyLevelDynamicsSettings(payload.settings);
      setStatus(els.levelDynamicsStatus, payload?.message || 'Dinamicas de nivel atualizadas.', 'success');
    } catch (error) {
      setStatus(els.levelDynamicsStatus, error?.message || 'Nao foi possivel salvar as dinamicas de nivel.', 'error');
    } finally {
      state.levelDynamicsBusy = false;
      syncLevelDynamicsBusyState();
    }
  }

  async function submitLevelWindowSettings(event) {
    event.preventDefault();
    state.levelWindowBusy = true;
    syncLevelWindowBusyState();
    setStatus(els.levelWindowStatus, 'Salvando janela de decks...');
    try {
      const draft = readDraftLevelWindowSettings();
      const response = await fetch(buildApiUrl('/api/admin/flashcards/level-window-settings'), {
        method: 'POST',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify(draft)
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success || !payload?.settings) {
        throw new Error(payload?.message || 'Nao foi possivel salvar a janela de niveis dos decks.');
      }
      applyLevelWindowSettings(payload.settings);
      setStatus(els.levelWindowStatus, payload?.message || 'Janela de niveis dos decks atualizada.', 'success');
    } catch (error) {
      setStatus(els.levelWindowStatus, error?.message || 'Nao foi possivel salvar a janela de niveis dos decks.', 'error');
    } finally {
      state.levelWindowBusy = false;
      syncLevelWindowBusyState();
    }
  }

  async function submitXpLevelCurveSettings(event) {
    event.preventDefault();
    state.xpLevelCurveBusy = true;
    syncXpLevelCurveBusyState();
    setStatus(els.xpLevelCurveStatus, 'Salvando curva de XP...');
    try {
      const draft = readDraftXpLevelCurveSettings();
      const response = await fetch(buildApiUrl('/api/admin/flashcards/xp-level-settings'), {
        method: 'POST',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify(draft)
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success || !payload?.settings) {
        throw new Error(payload?.message || 'Nao foi possivel salvar a curva de XP por nivel.');
      }
      applyXpLevelCurveSettings(payload.settings);
      setStatus(els.xpLevelCurveStatus, payload?.message || 'Curva de XP por nivel atualizada.', 'success');
    } catch (error) {
      setStatus(els.xpLevelCurveStatus, error?.message || 'Nao foi possivel salvar a curva de XP por nivel.', 'error');
    } finally {
      state.xpLevelCurveBusy = false;
      syncXpLevelCurveBusyState();
    }
  }

  function bindEvents() {
    els.energyForm?.addEventListener('submit', submitEnergySettings);
    els.multiplierInput?.addEventListener('input', renderPreview);
    els.limitInput?.addEventListener('input', renderPreview);
    els.welcomeModesForm?.addEventListener('submit', submitWelcomeModeSettings);
    els.flashcardsPhaseForm?.addEventListener('submit', submitFlashcardsPhaseSettings);
    els.flashcardsLevelRulesForm?.addEventListener('submit', submitFlashcardsLevelRulesSettings);
    els.speedCurveForm?.addEventListener('submit', submitSpeedCurveSettings);
    els.levelDynamicsForm?.addEventListener('submit', submitLevelDynamicsSettings);
    els.levelWindowForm?.addEventListener('submit', submitLevelWindowSettings);
    els.xpLevelCurveForm?.addEventListener('submit', submitXpLevelCurveSettings);
  }

  (async () => {
    bindEvents();
    syncEnergyBusyState();
    syncWelcomeModesBusyState();
    syncFlashcardsPhaseBusyState();
    syncFlashcardsLevelRulesBusyState();
    syncSpeedCurveBusyState();
    syncLevelDynamicsBusyState();
    syncLevelWindowBusyState();
    syncXpLevelCurveBusyState();
    renderPreview();
    renderWelcomeModesFact();
    renderFlashcardsPhaseFact();
    state.user = await fetchSessionUser().catch(() => null);
    if (!state.user?.id || !state.user?.is_admin) {
      setStatus(els.energyStatus, 'Acesso restrito ao administrador.', 'error');
      setStatus(els.welcomeModesStatus, 'Acesso restrito ao administrador.', 'error');
      setStatus(els.flashcardsPhaseStatus, 'Acesso restrito ao administrador.', 'error');
      setStatus(els.flashcardsLevelRulesStatus, 'Acesso restrito ao administrador.', 'error');
      setStatus(els.speedCurveStatus, 'Acesso restrito ao administrador.', 'error');
      setStatus(els.levelDynamicsStatus, 'Acesso restrito ao administrador.', 'error');
      setStatus(els.levelWindowStatus, 'Acesso restrito ao administrador.', 'error');
      setStatus(els.xpLevelCurveStatus, 'Acesso restrito ao administrador.', 'error');
      window.setTimeout(() => navigateTo('/account', { replace: true }), 900);
      return;
    }
    try {
      await Promise.all([
        loadEnergySettings(),
        loadWelcomeModeSettings(),
        loadFlashcardsPhaseSettings(),
        loadFlashcardsLevelRulesSettings(),
        loadSpeedCurveSettings(),
        loadLevelDynamicsSettings(),
        loadLevelWindowSettings(),
        loadXpLevelCurveSettings()
      ]);
      setStatus(els.energyStatus, 'Configuracoes carregadas.');
      setStatus(els.welcomeModesStatus, 'Modos extras sincronizados.');
      setStatus(els.flashcardsPhaseStatus, 'Fase fourth-star sincronizada.');
      setStatus(els.flashcardsLevelRulesStatus, 'Tabela de niveis sincronizada.');
      setStatus(els.speedCurveStatus, 'Curva da velocidade sincronizada.');
      setStatus(els.levelDynamicsStatus, 'Dinamicas de nivel sincronizadas.');
      setStatus(els.levelWindowStatus, 'Janela de niveis dos decks sincronizada.');
      setStatus(els.xpLevelCurveStatus, 'Curva de XP por nivel sincronizada.');
    } catch (error) {
      const message = error?.message || 'Nao foi possivel carregar as configuracoes do admin.';
      setStatus(els.energyStatus, message, 'error');
      setStatus(els.welcomeModesStatus, message, 'error');
      setStatus(els.flashcardsPhaseStatus, message, 'error');
      setStatus(els.flashcardsLevelRulesStatus, message, 'error');
      setStatus(els.speedCurveStatus, message, 'error');
      setStatus(els.levelDynamicsStatus, message, 'error');
      setStatus(els.levelWindowStatus, message, 'error');
      setStatus(els.xpLevelCurveStatus, message, 'error');
    }
  })();
})();
