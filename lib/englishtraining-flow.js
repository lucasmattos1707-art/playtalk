'use strict';

function buildEnglishTrainingFlowExcerpts(project, audioUrlFor) {
  const makeAudioUrl = typeof audioUrlFor === 'function' ? audioUrlFor : () => '';
  const excerpts = [];
  const cards = Array.isArray(project?.cards) ? project.cards : [];
  cards.forEach((card) => {
    if (!card || card.parentCardId) return;
    const audio = card.audio || (Array.isArray(card.audioTracks) ? card.audioTracks[0] : null);
    const audioUrl = makeAudioUrl(audio?.fileName || '', card);
    if (!audioUrl) return;
    if (card?.lyrics?.mode !== 'timesync' || !Array.isArray(card?.lyrics?.lines)) return;
    card.lyrics.lines.forEach((line, index) => {
      const text = String(line?.text || '').trim();
      const start = Number(line?.start);
      const end = Number(line?.end);
      if (!text || !Number.isFinite(start) || start < 0 || !Number.isFinite(end) || end <= start) return;
      const id = `flow-${String(card.id || 'track').trim()}-${String(line.id || index + 1).trim()}`;
      excerpts.push({
        id,
        trackId: String(card.id || ''),
        trackTitle: String(card.title || 'Faixa').trim(),
        english: text,
        portuguese: String(line?.textPt || '').trim(),
        start,
        end,
        audioUrl
      });
    });
  });
  return excerpts;
}

module.exports = { buildEnglishTrainingFlowExcerpts };
