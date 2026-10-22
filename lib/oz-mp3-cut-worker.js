const { parentPort } = require('node:worker_threads');

global.MPEGMode = require('lamejs/src/js/MPEGMode.js');
global.Lame = require('lamejs/src/js/Lame.js');
global.BitStream = require('lamejs/src/js/BitStream.js');
const lamejs = require('lamejs');

async function encodeMp3(channelData, sampleRate) {
  const channels = Math.max(1, Math.min(2, channelData.length));
  const length = Number(channelData[0]?.length) || 0;
  if (!length || !sampleRate) throw new Error('Não foi possível preparar o áudio para o corte.');
  const encoder = new lamejs.Mp3Encoder(channels, sampleRate, 128);
  const chunks = [];
  const frameSize = 1152;
  const toInt16 = (source, start, end) => {
    const result = new Int16Array(end - start);
    for (let index = start; index < end; index += 1) {
      const value = Math.max(-1, Math.min(1, Number(source[index]) || 0));
      result[index - start] = value < 0 ? Math.round(value * 32768) : Math.round(value * 32767);
    }
    return result;
  };
  for (let start = 0; start < length; start += frameSize) {
    const end = Math.min(length, start + frameSize);
    const left = toInt16(channelData[0], start, end);
    const right = channels > 1 ? toInt16(channelData[1], start, end) : undefined;
    const encoded = right ? encoder.encodeBuffer(left, right) : encoder.encodeBuffer(left);
    if (encoded.length) chunks.push(Buffer.from(encoded));
  }
  const flushed = encoder.flush();
  if (flushed.length) chunks.push(Buffer.from(flushed));
  return Buffer.concat(chunks);
}

async function cut(sourceBuffer, startSeconds, endSeconds) {
  const decoder = await import('@audio/decode-mp3');
  const decoded = await decoder.default(new Uint8Array(sourceBuffer));
  const sampleRate = Number(decoded?.sampleRate) || 0;
  const channels = (Array.isArray(decoded?.channelData) ? decoded.channelData : []).slice(0, 2);
  const totalFrames = Number(channels[0]?.length) || 0;
  if (!sampleRate || !totalFrames || !channels.length) throw new Error('Não foi possível ler o MP3 para o corte.');
  const startFrame = Math.max(0, Math.min(totalFrames, Math.round(startSeconds * sampleRate)));
  const endFrame = Math.max(startFrame, Math.min(totalFrames, Math.round(endSeconds * sampleRate)));
  if (endFrame - startFrame < Math.max(1, Math.round(sampleRate * 0.05))) {
    const error = new Error('Os dois pontos de corte precisam estar separados por pelo menos 0,05 segundo.');
    error.statusCode = 400;
    throw error;
  }
  const keptFrames = totalFrames - (endFrame - startFrame);
  const outputChannels = channels.map((source) => {
    const output = new Float32Array(keptFrames);
    output.set(source.subarray(0, startFrame), 0);
    output.set(source.subarray(endFrame), startFrame);
    return output;
  });
  return encodeMp3(outputChannels, sampleRate);
}

parentPort.on('message', async ({ sourceBuffer, startSeconds, endSeconds }) => {
  try {
    const result = await cut(sourceBuffer, Number(startSeconds) || 0, Number(endSeconds) || 0);
    const transferable = result.buffer.slice(result.byteOffset, result.byteOffset + result.byteLength);
    parentPort.postMessage({ ok: true, buffer: transferable }, [transferable]);
  } catch (error) {
    parentPort.postMessage({ ok: false, message: error?.message || 'Não foi possível cortar o áudio.', statusCode: error?.statusCode || 500 });
  }
});
