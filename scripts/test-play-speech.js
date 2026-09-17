// Run with: node --test scripts/test-play-speech.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const playSource = fs.readFileSync(path.join(root, 'www/play.html'), 'utf8');
const sttSource = fs.readFileSync(path.join(root, 'www/js/openai-stt.js'), 'utf8');

test('all inline scripts in the game parse successfully', () => {
  let checked = 0;
  for (const match of playSource.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
    if (!match[1].trim()) continue;
    new vm.Script(match[1], { filename: `play.html:inline-${++checked}` });
  }
  assert.ok(checked > 0);
});

function readFunction(name) {
  const match = new RegExp(`(?:async )?function ${name}\\(`).exec(playSource);
  assert.ok(match, `Missing function ${name}`);
  const end = playSource.indexOf('\n      }', match.index);
  return playSource.slice(match.index, end + '\n      }'.length);
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function element() {
  const classes = new Set();
  return { disabled: false, classList: {
    add: (...names) => names.forEach(name => classes.add(name)),
    remove: (...names) => names.forEach(name => classes.delete(name)),
    contains: name => classes.has(name)
  } };
}

function gameplay({ web = true, fallback = true, native = null, capture, startError } = {}) {
  const timers = new Map();
  const recognizers = [];
  const transcripts = [];
  const statuses = [];
  const captures = [];
  const steps = [];
  let timerId = 0;
  let micCompleted = 0;
  const entry = { id: 'card-1', stage: 1 };
  const state = {
    ui: { micCheckOpen: true, micCheckBusy: false, micCheckRecognition: null },
    game: { active: true, currentId: entry.id, entries: new Map([[entry.id, entry]]),
      canListen: true, listening: false, recognition: null }
  };
  class Recognition {
    constructor() { recognizers.push(this); }
    start() {
      if (startError) throw startError;
      this.onstart?.();
    }
    stop() { this.onend?.(); }
    abort() {
      this.aborted = true;
      this.onerror?.({ error: 'aborted' });
      this.onend?.();
    }
  }
  const els = { micTestPlayBtn: element(), gameTouchBtn: element(), gameCard: element(), gameVisual: element() };
  const context = {
    state, els, AbortController,
    console: { warn() {} },
    window: {
      setTimeout(fn) { timers.set(++timerId, fn); return timerId; },
      clearTimeout(id) { timers.delete(id); }
    },
    recognitionCtor: web ? Recognition : null,
    safeText: text => String(text || '').trim(),
    getNativeSpeechRecognition: () => native,
    getOpenAiSpeechRecognition: () => fallback ? {
      async captureAndTranscribe(options) {
        captures.push(options);
        options.onRecordingStart?.();
        const transcript = capture ? await capture(options) : 'hello';
        options.onRecordingStop?.();
        return transcript;
      }
    } : null,
    setMicCheckStatus: text => statuses.push(text),
    setMicCheckStepComplete: (...step) => steps.push(step),
    async completeMicCheck() {
      micCompleted++;
      state.ui.micCheckOpen = false;
      state.ui.micCheckBusy = false;
      context.stopMicCheckRecognition();
    },
    setGameStatus: text => statuses.push(text),
    handleRecognitionResult: async text => transcripts.push(text),
    currentTargetSpeechCode: () => 'en-US',
    isLevelTextModeActive: () => false,
    isTypingStage: () => false,
    isFifthStarEntry: () => false,
    shouldShowStageHintLoop: () => false,
    resolveGameStageConfig: () => ({}),
    cleanupGameRecognition() {
      const current = state.game.recognition;
      state.game.recognition = null;
      if (current) { current.onresult = current.onerror = current.onend = null; current.abort(); }
      state.game.listening = false;
    }
  };
  for (const name of ['hideGameStageTutorial', 'clearStageHintLoop', 'clearFirstStageIdleTimer',
    'clearFirstStageMicHint', 'stopActiveAudio', 'renderGameTouchButton', 'setGameVisualNeonState',
    'renderFirstStarSeals', 'updateGuestFirstStarResultsBanner', 'scheduleFirstStageMicHint', 'startStageHintLoop']) {
    context[name] = () => {};
  }
  vm.createContext(context);
  for (const name of ['speechCaptureErrorMessage', 'canFallbackSpeechCapture', 'stopMicCheckRecognition',
    'resolveMicCheckTranscript', 'startMicCheckCapture', 'startRecognition']) {
    vm.runInContext(readFunction(name), context);
  }
  return { context, state, els, timers, recognizers, captures, transcripts, statuses, steps,
    micCompleted: () => micCompleted };
}

test('mic activation records when the browser has no SpeechRecognition', async () => {
  const h = gameplay({ web: false });
  await h.context.startMicCheckCapture();
  assert.equal(h.micCompleted(), 1);
  assert.equal(h.captures[0].language, 'pt-BR');
  assert.ok(h.steps.some(([name]) => name === 'permit'));
  assert.equal(h.state.ui.micCheckBusy, false);
});

for (const error of ['network', 'service-not-allowed', 'audio-capture', 'no-speech']) {
  test(`mic activation recovers from ${error}`, async () => {
    const h = gameplay();
    await h.context.startMicCheckCapture();
    const recognition = h.recognizers[0];
    await recognition.onerror({ error });
    assert.equal(h.micCompleted(), 1);
    assert.equal(h.captures.length, 1);
    assert.equal(recognition.aborted, true);
  });
}

test('mic activation shows permission guidance without opening another capture', async () => {
  const h = gameplay();
  await h.context.startMicCheckCapture();
  await h.recognizers[0].onerror({ error: 'not-allowed' });
  assert.equal(h.captures.length, 0);
  assert.match(h.statuses.at(-1), /Permita o microfone/);
  assert.equal(h.els.micTestPlayBtn.disabled, false);
});

test('mic activation recovers from an empty end and a synchronous start error', async () => {
  const empty = gameplay();
  await empty.context.startMicCheckCapture();
  await empty.recognizers[0].onend();
  assert.equal(empty.micCompleted(), 1);
  const failed = gameplay({ startError: new Error('start failed') });
  await failed.context.startMicCheckCapture();
  assert.equal(failed.micCompleted(), 1);
});

test('mic activation releases a stalled browser and starts recorded capture', async () => {
  const h = gameplay();
  await h.context.startMicCheckCapture();
  for (const fn of [...h.timers.values()]) fn();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.micCompleted(), 1);
  assert.equal(h.recognizers[0].aborted, true);
});

test('mic activation keeps fallback busy and ignores the previous browser end', async () => {
  const pending = deferred();
  const h = gameplay({ capture: () => pending.promise });
  await h.context.startMicCheckCapture();
  const lateEnd = h.recognizers[0].onend;
  const recovery = h.recognizers[0].onerror({ error: 'network' });
  await lateEnd();
  await h.context.startMicCheckCapture();
  assert.equal(h.state.ui.micCheckBusy, true);
  assert.equal(h.els.micTestPlayBtn.disabled, true);
  assert.equal(h.captures.length, 1);
  pending.resolve('hello');
  await recovery;
  assert.equal(h.micCompleted(), 1);
  assert.equal(h.els.micTestPlayBtn.disabled, false);
});

test('closing mic activation cancels fallback and ignores its late result', async () => {
  const pending = deferred();
  const h = gameplay({ web: false, capture: () => pending.promise });
  const task = h.context.startMicCheckCapture();
  h.state.ui.micCheckOpen = false;
  h.context.stopMicCheckRecognition();
  assert.equal(h.captures[0].signal.aborted, true);
  pending.resolve('late speech');
  await task;
  assert.equal(h.micCompleted(), 0);
});

test('game records directly when browser speech recognition is absent', async () => {
  const h = gameplay({ web: false });
  await h.context.startRecognition();
  assert.deepEqual(h.transcripts, ['hello']);
  assert.equal(h.state.game.listening, false);
  assert.equal(h.state.game.recognition, null);
});

for (const error of ['network', 'service-not-allowed', 'audio-capture', 'no-speech']) {
  test(`game keeps capture busy during ${error} fallback and ignores late browser end`, async () => {
    const pending = deferred();
    const h = gameplay({ capture: () => pending.promise });
    await h.context.startRecognition();
    const recognition = h.recognizers[0];
    const lateEnd = recognition.onend;
    const recovery = recognition.onerror({ error });
    assert.equal(h.state.game.listening, true);
    assert.equal(h.els.gameTouchBtn.classList.contains('is-busy'), true);
    await lateEnd();
    await h.context.startRecognition();
    assert.equal(h.recognizers.length, 1);
    assert.equal(h.captures.length, 1);
    pending.resolve('hello');
    await recovery;
    assert.deepEqual(h.transcripts, ['hello']);
    assert.equal(h.state.game.listening, false);
    assert.equal(h.state.game.recognition, null);
    assert.equal(h.els.gameTouchBtn.classList.contains('is-busy'), false);
  });
}

test('game permission rejection shows guidance and never starts fallback', async () => {
  const h = gameplay();
  await h.context.startRecognition();
  await h.recognizers[0].onerror({ error: 'not-allowed' });
  assert.equal(h.captures.length, 0);
  assert.match(h.statuses.at(-1), /Permita o microfone/);
  assert.equal(h.state.game.listening, false);
});

test('fallback reports a missing input device', async () => {
  const h = gameplay({ web: false, capture: async () => { throw new DOMException('missing', 'NotFoundError'); } });
  await h.context.startRecognition();
  assert.match(h.statuses.at(-1), /Microfone nao encontrado/);
  assert.equal(h.state.game.listening, false);
});

test('game preserves native capture and recovers a native service failure', async () => {
  const normal = gameplay({ native: { captureForGameplay: async () => 'native speech' } });
  await normal.context.startRecognition();
  assert.deepEqual(normal.transcripts, ['native speech']);
  assert.equal(normal.captures.length, 0);
  const failed = gameplay({ native: { captureForGameplay: async () => { throw { code: 'NETWORK' }; } } });
  await failed.context.startRecognition();
  assert.deepEqual(failed.transcripts, ['hello']);
  assert.equal(failed.state.game.listening, false);
});

test('game handles normal browser results without fallback', async () => {
  const h = gameplay();
  await h.context.startRecognition();
  const result = [{ transcript: 'browser speech' }];
  result.isFinal = true;
  await h.recognizers[0].onresult({ results: [result] });
  assert.deepEqual(h.transcripts, ['browser speech']);
  assert.equal(h.captures.length, 0);
});

test('game recovers when browser recognition start throws', async () => {
  const h = gameplay({ startError: new Error('start failed') });
  await h.context.startRecognition();
  assert.deepEqual(h.transcripts, ['hello']);
  assert.equal(h.state.game.listening, false);
});

test('game recovers stalled recognition and empty results', async () => {
  const stalled = gameplay();
  await stalled.context.startRecognition();
  for (const fn of [...stalled.timers.values()]) fn();
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(stalled.transcripts, ['hello']);
  assert.equal(stalled.recognizers[0].aborted, true);
  const empty = gameplay();
  await empty.context.startRecognition();
  await empty.recognizers[0].onend();
  assert.deepEqual(empty.transcripts, ['hello']);
});

test('cancelled game fallback cannot deliver a result or reset a newer capture', async () => {
  const pending = deferred();
  const h = gameplay({ web: false, capture: () => pending.promise });
  const task = h.context.startRecognition();
  h.context.cleanupGameRecognition();
  assert.equal(h.captures[0].signal.aborted, true);
  const nextCapture = {};
  h.state.game.recognition = nextCapture;
  h.state.game.listening = true;
  pending.resolve('late speech');
  await task;
  assert.deepEqual(h.transcripts, []);
  assert.equal(h.state.game.recognition, nextCapture);
  assert.equal(h.state.game.listening, true);
});

function recorderHarness(getStream) {
  let trackStops = 0;
  let recorderStops = 0;
  const timers = new Map();
  const stream = { getTracks: () => [{ stop: () => trackStops++ }] };
  class Recorder {
    static isTypeSupported() { return true; }
    constructor() { this.state = 'inactive'; this.mimeType = 'audio/webm'; }
    start() { this.state = 'recording'; }
    stop() {
      recorderStops++;
      this.state = 'inactive';
      this.ondataavailable?.({ data: new Blob(['audio']) });
      this.onstop?.();
    }
  }
  const context = {
    window: { MediaRecorder: Recorder, setTimeout(fn) { timers.set(1, fn); return 1; }, clearTimeout(id) { timers.delete(id); } },
    navigator: { mediaDevices: { getUserMedia: () => getStream ? getStream(stream) : Promise.resolve(stream) } },
    MediaRecorder: Recorder, DOMException, Blob
  };
  vm.runInNewContext(sttSource, context);
  return { api: context.window.PlaytalkOpenAiStt, timers, trackStops: () => trackStops, recorderStops: () => recorderStops };
}

test('cancelling recorded capture immediately releases the microphone and timer', async () => {
  const h = recorderHarness();
  const controller = new AbortController();
  const task = h.api.recordAudio({ signal: controller.signal });
  await new Promise(resolve => setImmediate(resolve));
  controller.abort();
  await assert.rejects(task, { name: 'AbortError' });
  assert.equal(h.trackStops(), 1);
  assert.equal(h.recorderStops(), 1);
  assert.equal(h.timers.size, 0);
});

test('cancellation while microphone permission is pending releases the acquired stream', async () => {
  const pending = deferred();
  const h = recorderHarness(stream => pending.promise.then(() => stream));
  const controller = new AbortController();
  const task = h.api.recordAudio({ signal: controller.signal });
  controller.abort();
  pending.resolve();
  await assert.rejects(task, { name: 'AbortError' });
  assert.equal(h.trackStops(), 1);
  assert.equal(h.recorderStops(), 0);
});

test('normal recording returns audio and releases the microphone', async () => {
  const h = recorderHarness();
  const task = h.api.recordAudio();
  await new Promise(resolve => setImmediate(resolve));
  for (const fn of [...h.timers.values()]) fn();
  const blob = await task;
  assert.ok(blob.size > 0);
  assert.equal(h.trackStops(), 1);
  assert.equal(h.timers.size, 0);
});

test('cancellation inside recording start leaves no delayed stop timer', async () => {
  const h = recorderHarness();
  const controller = new AbortController();
  await assert.rejects(h.api.recordAudio({
    signal: controller.signal,
    onRecordingStart: () => controller.abort()
  }), { name: 'AbortError' });
  assert.equal(h.trackStops(), 1);
  assert.equal(h.timers.size, 0);
});
