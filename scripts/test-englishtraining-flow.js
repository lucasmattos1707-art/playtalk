'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildEnglishTrainingFlowExcerpts } = require('../lib/englishtraining-flow');

test('Flow exposes only EnglishTraining excerpts with complete audio timing', () => {
  const excerpts = buildEnglishTrainingFlowExcerpts({ cards: [
    {
      id: 'track-a',
      title: 'Track A',
      audio: { fileName: 'track-a.mp3' },
      lyrics: { mode: 'timesync', lines: [
        { id: 'line-a', text: 'I think', textPt: 'Eu acho', start: 3.25, end: 4.1 },
        { id: 'line-b', text: 'Untimed', start: null, end: null },
        { id: 'line-c', text: 'Broken', start: 4.1, end: 4.1 }
      ] }
    },
    {
      id: 'plain-track', audio: { fileName: 'plain.mp3' },
      lyrics: { mode: 'plain', lines: [{ text: 'No timing', start: 0, end: 2 }] }
    },
    {
      id: 'child-track', parentCardId: 'track-a', audio: { fileName: 'child.mp3' },
      lyrics: { mode: 'timesync', lines: [{ text: 'Not a track', start: 0, end: 1 }] }
    }
  ] }, (fileName) => `/api/englishtraining/assets/audio/${fileName}`);

  assert.deepEqual(excerpts, [{
    id: 'flow-track-a-line-a',
    trackId: 'track-a',
    trackTitle: 'Track A',
    english: 'I think',
    portuguese: 'Eu acho',
    start: 3.25,
    end: 4.1,
    audioUrl: '/api/englishtraining/assets/audio/track-a.mp3'
  }]);
});

test('Flow falls back to the first audio part when the main audio field is absent', () => {
  const excerpts = buildEnglishTrainingFlowExcerpts({ cards: [{
    id: 'track-b',
    audioTracks: [{ fileName: 'part-1.mp3' }],
    lyrics: { mode: 'timesync', lines: [{ id: 'l1', text: 'Hello', start: 0, end: 1 }] }
  }] }, (fileName) => `/audio/${fileName}`);
  assert.equal(excerpts[0]?.audioUrl, '/audio/part-1.mp3');
});
