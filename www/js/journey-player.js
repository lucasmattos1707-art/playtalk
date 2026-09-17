(function initJourneyPlayer() {
  'use strict';
  const api = () => window.PlaytalkApi;
  async function request(path, options = {}) {
    const response = await fetch(api()?.url(path) || path, {
      ...options, credentials: 'include', cache: 'no-store',
      headers: api()?.authHeaders({ 'Content-Type': 'application/json', ...options.headers }) || { 'Content-Type': 'application/json', ...options.headers }
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.success) throw new Error(payload.error || 'Não foi possível carregar a jornada. Tente novamente.');
    return payload;
  }
  const post = (path, body, signal) => request(path, { method: 'POST', body: JSON.stringify(body), signal });
  function dataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Não foi possível ler a gravação.'));
      reader.readAsDataURL(blob);
    });
  }
  const localAsset = path => new URL(path, document.baseURI).href;
  const explorerModeNames = {
    1: 'Ouvir e falar', 2: 'Ouvir e falar no idioma nativo', 3: 'Falar',
    4: 'Escrever', 5: 'Falar sem ajuda', 6: 'Teclado de 9 letras'
  };

  class OggCapture {
    constructor(onPause) { this.onPause = onPause; this.cancelled = false; this.running = false; }
    async start() {
      if (!window.Recorder || !navigator.mediaDevices?.getUserMedia) throw new Error('O microfone não está disponível neste navegador.');
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.context = new AudioContext();
      await this.context.resume();
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      if (this.cancelled) { this.destroy(); throw new DOMException('Gravação cancelada.', 'AbortError'); }
      this.source = this.context.createMediaStreamSource(this.stream);
      this.analyser = this.context.createAnalyser();
      this.analyser.fftSize = 2048;
      this.source.connect(this.analyser);
      this.recorder = new window.Recorder({
        sourceNode: this.source, encoderPath: localAsset('js/vendor/opus-recorder/encoderWorker.min.js'),
        numberOfChannels: 1, encoderApplication: 2048, encoderBitRate: 24000, streamPages: false
      });
      this.result = new Promise((resolve, reject) => { this.resolve = resolve; this.reject = reject; });
      // Rejection on navigation is expected even when no submission awaits this promise.
      this.result.catch(() => {});
      this.recorder.ondataavailable = bytes => {
        if (this.cancelled) return;
        const view = new Uint8Array(bytes);
        if (String.fromCharCode(...view.slice(0, 4)) !== 'OggS') { this.reject(new Error('Não foi possível gerar a gravação Ogg.')); return; }
        this.resolve(new Blob([bytes], { type: 'audio/ogg' }));
      };
      await this.recorder.start();
      if (this.cancelled) { this.destroy(); throw new DOMException('Gravação cancelada.', 'AbortError'); }
      this.running = true;
      this.started = this.lastVoice = Date.now();
      const samples = new Float32Array(this.analyser.fftSize);
      this.timer = window.setInterval(() => {
        if (!this.running || this.cancelled) return;
        this.analyser.getFloatTimeDomainData(samples);
        const rms = Math.sqrt(samples.reduce((sum, x) => sum + x * x, 0) / samples.length);
        const now = Date.now();
        if (rms > .012) { this.heardVoice = true; this.lastVoice = now; }
        if ((this.heardVoice && now - this.lastVoice > 2200) || (!this.heardVoice && now - this.lastVoice > 10000) || now - this.started > 120000) {
          this.pause(); this.onPause(!this.heardVoice);
        }
      }, 100);
    }
    pause() { if (this.running) { this.running = false; this.recorder.pause(); } }
    resume() { this.lastVoice = Date.now(); this.started = Date.now(); this.recorder.resume(); this.running = true; }
    async finish() {
      this.running = false;
      clearInterval(this.timer);
      this.recorder.stop();
      this.stream?.getTracks().forEach(track => track.stop());
      const timeout = setTimeout(() => this.reject(new Error('A gravação demorou para finalizar. Tente novamente.')), 15000);
      try { return await this.result; }
      finally { clearTimeout(timeout); this.release(); }
    }
    release() {
      clearInterval(this.timer);
      this.stream?.getTracks().forEach(track => track.stop());
      try { this.recorder?.close(); } catch (_) {}
      try { this.source?.disconnect(); } catch (_) {}
      this.context?.close().catch(() => {});
    }
    destroy() { this.cancelled = true; this.running = false; this.reject?.(new DOMException('Gravação cancelada.', 'AbortError')); this.release(); }
  }

  let active = null, startInFlight = false, phaseLauncher = null;

  class JourneyPlayer {
    constructor(plan, progress, options = {}) {
      this.plan = plan; this.progress = progress; this.preview = Boolean(options.preview);
      this.index = this.preview ? Number(options.index || 0) : progress.currentIndex;
      this.urls = []; this.generation = 0; this.previewStage = 0;
      this.onClose = options.onClose;
    }
    async open() {
      this.previousFocus = document.activeElement;
      this.root = document.createElement('section');
      this.root.className = 'journey-modal';
      this.root.setAttribute('role', 'dialog'); this.root.setAttribute('aria-modal', 'true');
      this.root.setAttribute('aria-labelledby', 'journey-modal-title');
      this.root.tabIndex = -1;
      document.body.append(this.root);
      this.inertNodes = [...document.body.children].filter(n => n !== this.root && !['SCRIPT', 'LINK', 'STYLE'].includes(n.tagName))
        .map(node => ({ node, inert: node.inert }));
      this.inertNodes.forEach(({ node }) => { node.inert = true; });
      document.body.classList.add('journey-open');
      document.body.classList.add('journey-modal-visible');
      this.keyHandler = event => {
        if (event.key === 'Escape') { event.preventDefault(); this.close(); }
        if (event.key !== 'Tab') return;
        const nodes = [...this.root.querySelectorAll('button:not(:disabled),audio[controls],a[href]')].filter(n => !n.hidden && n.getClientRects().length);
        if (!nodes.length) { event.preventDefault(); this.root.focus(); return; }
        const first = nodes[0], last = nodes[nodes.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === this.root)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      };
      this.root.addEventListener('keydown', this.keyHandler);
      this.root.focus();
      await this.render();
    }
    create(tag, className, text, parent) {
      const node = document.createElement(tag);
      if (className) node.className = className;
      if (text !== undefined) node.textContent = text;
      parent?.append(node); return node;
    }
    button(text, action, parent, className = 'journey-button') {
      const node = this.create('button', className, text, parent); node.type = 'button';
      node.addEventListener('click', () => this.run(action)); return node;
    }
    async run(action) {
      try { await action(); }
      catch (error) { if (!this.closed && error.name !== 'AbortError') this.message(error.message, true); }
    }
    message(text, error = false) { if (this.status) { this.status.textContent = text; this.status.classList.toggle('is-error', error); } }
    stage() { return this.preview ? this.previewStage : Number(this.progress.steps.find(s => s.id === this.step?.id)?.stage || 0); }
    async asset(id, signal) {
      const response = await fetch(api()?.url(`/api/journey/assets/${id}`) || `/api/journey/assets/${id}`, {
        credentials: 'include', headers: api()?.authHeaders() || {}, signal, cache: 'no-store'
      });
      if (!response.ok) throw new Error('Não foi possível carregar o áudio ou a imagem desta etapa.');
      const blob = await response.blob();
      if (signal.aborted || this.closed) throw new DOMException('Tela fechada.', 'AbortError');
      const url = URL.createObjectURL(blob); this.urls.push(url); return url;
    }
    disposeScreen() {
      this.generation++;
      this.abort?.abort(); this.abort = new AbortController();
      this.capture?.destroy(); this.capture = null;
      this.root?.querySelectorAll('audio').forEach(a => { a.pause(); a.removeAttribute('src'); a.load(); });
      this.audio?.pause(); if (this.audio) { this.audio.removeAttribute('src'); this.audio.load(); }
      this.urls.forEach(url => URL.revokeObjectURL(url)); this.urls = [];
      this.recordingBlob = null; this.userAudioUrl = null; this.audio = null;
      this.busy = false; this.recording = false; this.paused = false; this.resultVisible = false;
    }
    async render() {
      this.disposeScreen();
      const generation = this.generation, signal = this.abort.signal;
      this.root.replaceChildren();
      const header = this.create('header', 'journey-header', undefined, this.root);
      this.create('span', 'journey-eyebrow', this.preview ? 'PRÉVIA DA JORNADA' : `ETAPA ${Math.min(this.index + 1, this.plan.steps.length)} DE ${this.plan.steps.length}`, header);
      this.button('Fechar', () => this.close(), header, 'journey-close');
      this.step = this.plan.steps[this.index];
      this.create('h1', 'journey-title', this.step?.title || 'Jornada concluída!', this.root).id = 'journey-modal-title';
      this.content = this.create('div', 'journey-content', undefined, this.root);
      this.status = this.create('p', 'journey-status', '', this.root); this.status.setAttribute('role', 'status'); this.status.setAttribute('aria-live', 'polite');
      this.footer = this.create('footer', 'journey-footer', undefined, this.root);
      if (!this.step) {
        this.create('div', 'journey-complete-mark', '✓', this.content);
        this.create('p', '', `Você completou a jornada e conquistou ${this.progress.points} pontos.`, this.content);
        this.button('Voltar', () => this.close(), this.footer); return;
      }
      if (this.step.type === 'phase1') {
        const mode = explorerModeNames[Number(this.step.explorerMode) || 1];
        this.create('p', 'journey-body-text', `Vamos praticar ${this.step.cards} ${this.step.cards === 1 ? 'carta' : 'cartas'} do nível ${this.step.level} no modo “${mode}”. Cada carta precisa das cinco estrelas.`, this.content);
        this.create('p', 'journey-status', 'Esta etapa não concede cartas, moedas ou XP.', this.content);
        this.button('Iniciar jogo', () => this.launchPhase(), this.footer); return;
      }
      this.message('Carregando…');
      try {
        const audioUrl = await this.asset(this.step.audioAsset, signal);
        if (this.closed || generation !== this.generation) return;
        this.audio = this.create('audio', '', undefined, this.root); this.audio.src = audioUrl; this.audio.preload = 'auto';
        this.audio.addEventListener('timeupdate', () => this.updateProgress());
        this.audio.addEventListener('error', () => { this.busy = false; this.message('O áudio não pôde ser reproduzido. Feche e tente novamente.', true); this.syncIcons(); });
        this.audio.addEventListener('ended', () => this.run(() => this.audioEnded()));
        if (this.step.type === 'tutorial') {
          const imageUrl = await this.asset(this.step.imageAsset, signal);
          if (this.closed || generation !== this.generation) return;
          this.ring = this.create('div', 'journey-ring', undefined, this.content);
          const image = this.create('img', 'journey-tutorial-image', undefined, this.ring); image.src = imageUrl; image.alt = this.step.title;
          this.playTutorial = this.button('Ouvir tutorial', () => this.toggleTutorial(), this.footer);
          this.nextButton = this.button('Avançar', () => this.advance(), this.footer); this.nextButton.disabled = true;
          this.tutorialEnded = false;
          this.message('Ouça o tutorial completo para continuar.');
        } else {
          this.text = this.create('p', 'journey-body-text', this.stage() >= 1 ? this.step.english : this.step.portuguese, this.content);
          this.text.lang = this.stage() >= 1 ? 'en' : 'pt-BR';
          this.meter = this.create('progress', 'journey-audio-progress', undefined, this.content); this.meter.max = 1; this.meter.value = 0;
          this.meter.setAttribute('aria-label', 'Progresso do áudio');
          this.pauseActions = this.create('div', 'journey-actions', undefined, this.content); this.pauseActions.hidden = true;
          this.sendButton = this.button('Enviar Texto', () => this.submit(), this.pauseActions);
          this.continueButton = this.button('Continuar gravação', () => this.resume(), this.pauseActions, 'journey-button journey-button-secondary');
          const names = ['Ouvir com texto em português', 'Ouvir com texto em inglês', 'Ler e falar em inglês'];
          this.icons = ['headphone', 'play', 'mic'].map((icon, i) => {
            const button = this.button('', () => i === 2 ? this.microphone() : this.listen(i), this.footer, 'journey-icon-button');
            button.setAttribute('aria-label', names[i]); button.title = names[i];
            const img = this.create('img', '', undefined, button); img.src = localAsset(`assets/journey/${icon}.svg`); img.alt = '';
            this.create('span', 'journey-icon-label', ['Ouvir · PT', 'Ouvir · EN', 'Falar · EN'][i], button);
            return button;
          });
          this.message(this.stage() < 2 ? 'Complete os três passos na ordem para avançar.' : 'Leia em inglês e toque no microfone para falar.');
          this.syncIcons();
        }
      } catch (error) { if (error.name !== 'AbortError') { this.message(error.message, true); this.button('Tentar carregar de novo', () => this.render(), this.footer); } }
    }
    updateProgress() {
      const ratio = this.audio?.duration ? Math.min(1, this.audio.currentTime / this.audio.duration) : 0;
      if (this.ring) this.ring.style.setProperty('--journey-progress', `${ratio * 100}%`);
      if (this.meter) this.meter.value = ratio;
    }
    syncIcons() {
      this.icons?.forEach((button, i) => {
        button.classList.toggle('is-complete', this.stage() > i);
        button.classList.toggle('is-recording', i === 2 && this.recording && !this.paused);
        button.disabled = this.stage() < i || this.busy || this.resultVisible || (this.recording && i !== 2);
        button.setAttribute('aria-pressed', String(i === 2 && this.recording && !this.paused));
      });
    }
    async action(action, extra = {}) {
      if (this.preview) {
        if (action === 'speak') return post('/api/admin/journey/preview/evaluate', { english: this.step.english, textSize: this.step.textSize, ...extra }, this.abort.signal);
        if (action === 'listenPt') this.previewStage = 1;
        if (action === 'listenEn') this.previewStage = 2;
        return { stage: this.previewStage, earnedPoints: 0 };
      }
      const result = await post(`/api/journey/steps/${this.step.id}/action`, { revision: this.plan.revision, action, ...extra }, this.abort.signal);
      if (!this.closed) this.progress = result.progress;
      return result;
    }
    async listen(index) {
      if (this.busy || this.recording || this.stage() < index) return;
      this.listenIndex = index; this.text.textContent = index === 0 ? this.step.portuguese : this.step.english; this.text.lang = index === 0 ? 'pt-BR' : 'en';
      this.audio.currentTime = 0; this.busy = true; this.syncIcons();
      this.message('Ouça o áudio inteiro.');
      try { await this.audio.play(); }
      catch (error) { this.busy = false; this.syncIcons(); throw error; }
    }
    async toggleTutorial() {
      if (this.audio.paused) { await this.audio.play(); this.playTutorial.textContent = 'Pausar áudio'; }
      else { this.audio.pause(); this.playTutorial.textContent = 'Continuar áudio'; }
    }
    async audioEnded() {
      if (this.closed) return;
      if (this.step.type === 'tutorial') {
        this.tutorialEnded = true; this.nextButton.disabled = false; this.playTutorial.textContent = 'Ouvir novamente';
        this.message('Tutorial concluído. Você pode avançar.'); return;
      }
      try {
        if (this.stage() === this.listenIndex) await this.action(this.listenIndex === 0 ? 'listenPt' : 'listenEn');
        this.message(this.stage() === 1 ? 'Agora ouça acompanhando o texto em inglês.' : 'Agora leia e fale o texto em inglês.');
      } finally { this.busy = false; this.syncIcons(); }
    }
    async microphone() {
      if (this.stage() < 2 || this.busy || this.resultVisible) return;
      if (this.recording) { if (this.paused) this.resume(); else this.pause(); return; }
      this.text.textContent = this.step.english; this.text.lang = 'en';
      this.audio.pause(); this.busy = true; this.syncIcons();
      const generation = this.generation;
      this.capture = new OggCapture(noVoice => this.pause(noVoice));
      try {
        await this.capture.start();
        if (this.closed || generation !== this.generation) return;
        this.recording = true; this.paused = false;
        this.message('Gravando… Fale em inglês. Toque no microfone para pausar.');
      } catch (error) {
        this.capture?.destroy(); this.capture = null;
        throw new Error(error.name === 'NotAllowedError' ? 'Permita o microfone no navegador para falar.' : error.message);
      } finally { this.busy = false; this.syncIcons(); }
    }
    pause(noVoice = false) {
      if (!this.recording || this.closed) return;
      this.capture.pause(); this.paused = true; this.pauseActions.hidden = false;
      this.message(noVoice ? 'Não ouvimos sua voz. Confira o microfone e continue a gravação.' : 'Gravação pausada. Envie o texto ou continue gravando.');
      this.syncIcons();
    }
    resume() {
      if (!this.paused || this.busy) return;
      this.capture.resume(); this.paused = false; this.pauseActions.hidden = true;
      this.message('Gravando… Toque no microfone para pausar.'); this.syncIcons();
    }
    async submit() {
      if (this.busy || !this.paused) return;
      this.busy = true; this.sendButton.disabled = this.continueButton.disabled = true; this.syncIcons();
      const generation = this.generation;
      this.message('Avaliando sua fala…');
      try {
        if (!this.recordingBlob) { this.recordingBlob = await this.capture.finish(); this.capture = null; }
        this.recording = false;
        const audioDataUrl = await dataUrl(this.recordingBlob);
        const result = await this.action('speak', { audioDataUrl });
        if (this.closed || generation !== this.generation) return;
        if (this.preview && result.passed) this.previewStage = 3;
        this.showResult(result);
      } catch (error) {
        if (!this.closed && generation === this.generation) {
          this.continueButton.hidden = true;
          this.button('Tentar de novo', () => this.retry(), this.pauseActions, 'journey-button journey-button-secondary');
          this.message(error.message, true);
        }
      } finally {
        if (!this.closed && generation === this.generation) { this.busy = false; this.sendButton.disabled = false; this.continueButton.disabled = false; this.syncIcons(); }
      }
    }
    showResult(result) {
      // The result and both comparison players belong to the SAME screen as this recording.
      this.resultVisible = true;
      this.content.replaceChildren(); this.footer.replaceChildren(); this.icons = null;
      this.create('div', `journey-score ${result.passed ? 'is-pass' : ''}`, `${result.accuracy}%`, this.content);
      this.create('p', 'journey-body-text', result.passed ? 'Muito bem! Você completou os três passos.' : 'Você precisa de 70% para avançar. Vamos tentar de novo?', this.content);
      this.create('p', 'journey-transcript', `Você falou: ${result.transcript}`, this.content);
      const players = this.create('div', 'journey-comparison', undefined, this.content);
      this.userAudioUrl = URL.createObjectURL(this.recordingBlob); this.urls.push(this.userAudioUrl);
      for (const [label, src] of [['Ouvir meu áudio', this.userAudioUrl], ['Áudio original — Harry', this.audio.src]]) {
        const panel = this.create('div', 'journey-player-card', undefined, players);
        this.create('p', '', label, panel);
        const player = this.create('audio', '', undefined, panel); player.controls = true; player.src = src;
        player.setAttribute('aria-label', label);
        player.addEventListener('play', () => { this.root.querySelectorAll('audio').forEach(other => { if (other !== player) other.pause(); }); });
      }
      if (result.passed) this.button('Avançar', () => this.advance(), this.footer);
      this.button('Tentar de novo', () => this.retry(), this.footer, 'journey-button journey-button-secondary');
      this.message(result.earnedPoints ? `+${result.earnedPoints} pontos na jornada!` : 'Compare sua gravação com o áudio original.');
    }
    async retry() {
      if (this.preview) this.previewStage = 2;
      await this.render();
    }
    async advance() {
      if (this.step.type === 'tutorial') { if (!this.tutorialEnded) return; await this.action('tutorial'); }
      if (this.preview) { this.close(); return; }
      this.index = this.progress.currentIndex;
      await this.render();
    }
    async launchPhase() {
      if (!phaseLauncher) {
        if (this.preview) { window.location.href = `${api()?.baseUrl || ''}/play?journeyPreview=${encodeURIComponent(this.step.id)}`; return; }
        throw new Error('Não foi possível abrir a fase 1. Feche e abra o jogo novamente.');
      }
      this.root.hidden = true;
      document.body.classList.remove('journey-modal-visible');
      this.inertNodes.forEach(({ node, inert }) => { node.inert = inert; });
      try {
        const completed = await phaseLauncher(this.step, { preview: this.preview });
        if (this.closed) return;
        this.inertNodes.forEach(({ node }) => { node.inert = true; }); this.root.hidden = false; document.body.classList.add('journey-modal-visible');
        if (completed) { await this.action('phase1'); await this.advance(); }
        else this.message('A fase foi pausada. Toque em Iniciar fase 1 para continuar.');
      } catch (error) {
        if (!this.closed) { this.inertNodes.forEach(({ node }) => { node.inert = true; }); this.root.hidden = false; document.body.classList.add('journey-modal-visible'); throw error; }
      }
    }
    close() {
      if (this.closed) return;
      this.closed = true; this.disposeScreen(); this.root.remove();
      this.inertNodes.forEach(({ node, inert }) => { node.inert = inert; });
      document.body.classList.remove('journey-open', 'journey-modal-visible'); this.previousFocus?.focus?.();
      if (active === this) active = null;
      this.onClose?.();
    }
  }

  async function tryStart(options = {}) {
    if (startInFlight || active) return true;
    startInFlight = true;
    try {
      const payload = await request('/api/journey');
      if (!payload.plan.steps.length) return false;
      active = new JourneyPlayer(payload.plan, payload.progress, options);
      await active.open(); return true;
    } finally { startInFlight = false; }
  }
  async function preview(plan, index = 0) {
    active?.close(); active = new JourneyPlayer(plan, { steps: [], currentIndex: index, points: 0 }, { preview: true, index });
    await active.open();
  }
  window.addEventListener('pagehide', () => active?.close());
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden || !active) return;
    active.audio?.pause(); if (active.recording) active.pause();
  });
  window.PlaytalkJourney = { request, post, tryStart, preview, setPhaseLauncher(fn) { phaseLauncher = fn; }, close() { active?.close(); } };
})();
