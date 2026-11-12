'use strict';

function createTypingAttemptClock() {
  return {
    elapsedMs: 0,
    activeKey: '',
    startedAt: 0,
    closedKeys: []
  };
}

function startTypingAttempt(clock, key, now) {
  const attemptKey = String(key || '');
  const timestamp = Number(now);
  if (!clock || !attemptKey || !Number.isFinite(timestamp) || clock.closedKeys.includes(attemptKey)) return false;
  if (clock.activeKey) return clock.activeKey === attemptKey;
  clock.activeKey = attemptKey;
  clock.startedAt = timestamp;
  return true;
}

function finishTypingAttempt(clock, key, now) {
  const attemptKey = String(key || '');
  const timestamp = Number(now);
  if (!clock || !attemptKey || clock.activeKey !== attemptKey || !Number.isFinite(timestamp)) return 0;
  const elapsed = Math.max(0, timestamp - Number(clock.startedAt || 0));
  clock.elapsedMs = Math.max(0, Number(clock.elapsedMs) || 0) + elapsed;
  clock.closedKeys.push(attemptKey);
  clock.activeKey = '';
  clock.startedAt = 0;
  return elapsed;
}

function pauseTypingAttempt(clock, key, now) {
  const attemptKey = String(key || '');
  const timestamp = Number(now);
  if (!clock || !attemptKey || clock.activeKey !== attemptKey || !Number.isFinite(timestamp)) return 0;
  const elapsed = Math.max(0, timestamp - Number(clock.startedAt || 0));
  clock.elapsedMs = Math.max(0, Number(clock.elapsedMs) || 0) + elapsed;
  clock.activeKey = '';
  clock.startedAt = 0;
  return elapsed;
}

function stopTypingAttemptClock(clock, now) {
  if (!clock?.activeKey) return 0;
  return finishTypingAttempt(clock, clock.activeKey, now);
}

const typingAttemptClockApi = {
  createTypingAttemptClock,
  startTypingAttempt,
  finishTypingAttempt,
  pauseTypingAttempt,
  stopTypingAttemptClock
};

if (typeof module !== 'undefined' && module.exports) module.exports = typingAttemptClockApi;
if (typeof window !== 'undefined') window.PlaytalkTypingAttemptClock = typingAttemptClockApi;
