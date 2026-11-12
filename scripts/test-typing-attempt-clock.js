'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createTypingAttemptClock,
  startTypingAttempt,
  finishTypingAttempt,
  pauseTypingAttempt,
  stopTypingAttemptClock
} = require('../www/js/typing-attempt-clock');

test('timer ignores preload delay and begins only on effective playback', () => {
  const clock = createTypingAttemptClock();
  assert.equal(clock.elapsedMs, 0);
  assert.equal(startTypingAttempt(clock, 'card-a', 5000), true);
  assert.equal(finishTypingAttempt(clock, 'card-a', 5600), 600);
  assert.equal(clock.elapsedMs, 600);
});

test('rapid card changes reject a late playback event from the previous card', () => {
  const clock = createTypingAttemptClock();
  assert.equal(startTypingAttempt(clock, 'card-a', 100), true);
  assert.equal(finishTypingAttempt(clock, 'card-a', 180), 80);
  assert.equal(startTypingAttempt(clock, 'card-b', 300), true);
  assert.equal(startTypingAttempt(clock, 'card-a', 310), false);
  assert.equal(finishTypingAttempt(clock, 'card-b', 500), 200);
  assert.equal(clock.elapsedMs, 280);
});

test('first word and error clicks close an attempt exactly once', () => {
  const clock = createTypingAttemptClock();
  assert.equal(startTypingAttempt(clock, 'short-phrase', 1000), true);
  assert.equal(finishTypingAttempt(clock, 'short-phrase', 1010), 10);
  assert.equal(finishTypingAttempt(clock, 'short-phrase', 5000), 0);
  assert.equal(clock.elapsedMs, 10);
});

test('manual audio replay does not restart an active attempt clock', () => {
  const clock = createTypingAttemptClock();
  assert.equal(startTypingAttempt(clock, 'long-phrase', 200), true);
  assert.equal(startTypingAttempt(clock, 'long-phrase', 700), true);
  assert.equal(stopTypingAttemptClock(clock, 1200), 1000);
  assert.equal(clock.elapsedMs, 1000);
});

test('a playback failure adds no time and a retry starts a fresh attempt', () => {
  const clock = createTypingAttemptClock();
  assert.equal(startTypingAttempt(clock, 'blocked-playback', 100), true);
  assert.equal(finishTypingAttempt(clock, 'blocked-playback', 100), 0);
  assert.equal(startTypingAttempt(clock, 'retry-after-block', 250), true);
  assert.equal(finishTypingAttempt(clock, 'retry-after-block', 450), 200);
  assert.equal(clock.elapsedMs, 200);
});

test('a mid-playback failure pauses elapsed time while a user retries', () => {
  const clock = createTypingAttemptClock();
  assert.equal(startTypingAttempt(clock, 'retryable-phrase', 100), true);
  assert.equal(pauseTypingAttempt(clock, 'retryable-phrase', 500), 400);
  assert.equal(startTypingAttempt(clock, 'retryable-phrase', 2000), true);
  assert.equal(finishTypingAttempt(clock, 'retryable-phrase', 2400), 400);
  assert.equal(clock.elapsedMs, 800);
});
