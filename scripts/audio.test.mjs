import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DinerAudio } from '../src/diner/audio.ts';

class Param {
  value = 0;
  setValueAtTime(value) { this.value = value; }
  linearRampToValueAtTime(value) { this.value = value; }
  exponentialRampToValueAtTime(value) { this.value = value; }
  setTargetAtTime(value) { this.value = value; }
  cancelScheduledValues() {}
}
class Node {
  gain = new Param(); frequency = new Param(); Q = new Param();
  connected = false; started = false; stopped = false;
  connect() { this.connected = true; }
  disconnect() { this.connected = false; }
  start() { this.started = true; }
  stop() { this.stopped = true; }
}
class Context {
  state = 'suspended'; currentTime = 0; sampleRate = 8000; destination = new Node();
  sources = []; gains = [];
  createGain() { const n = new Node(); this.gains.push(n); return n; }
  createBiquadFilter() { return new Node(); }
  createMediaElementSource() { return new Node(); }
  createOscillator() { const n = new Node(); this.sources.push(n); return n; }
  createBufferSource() { const n = new Node(); this.sources.push(n); return n; }
  createBuffer(channels, length) { const data = new Float32Array(length); return { getChannelData: () => data }; }
  async resume() { this.state = 'running'; }
  async suspend() { this.state = 'suspended'; }
  async close() { this.state = 'closed'; }
}
class Media {
  src = ''; currentTime = 0; paused = true; loads = 0; plays = 0; ended = false; onended = null;
  load() { this.loads++; this.currentTime = 0; this.ended = false; }
  async play() { this.paused = false; this.plays++; }
  pause() { this.paused = true; }
  removeAttribute(name) { if (name === 'src') this.src = ''; }
  remove() {}
}
function fixture(t) {
  const contexts = [], media = new Media();
  t.mock.method(globalThis, 'setInterval', () => 1);
  t.mock.method(globalThis, 'clearInterval', () => {});
  t.mock.method(globalThis, 'setTimeout', () => 1);
  t.mock.method(globalThis, 'clearTimeout', () => {});
  const audio = new DinerAudio(() => { const ctx = new Context(); contexts.push(ctx); return ctx; }, () => media);
  t.after(() => audio.dispose());
  return { audio, contexts, media };
}

test('records follow the requested order, then silence, then start again', async t => {
  const { audio } = fixture(t);
  const names = [];
  for (let i = 0; i < 10; i++) {
    await audio.nextTrack();
    names.push(audio.trackName);
    assert.equal(audio.playing, i !== 8);
  }
  assert.deepEqual(names, ['Last light', 'Take Five', '我只在乎你', 'Bohemian Rhapsody', 'みずいろの雨', 'luther', 'DRAMA', 'Comfortably Numb', 'Sound off', 'Last light']);
});

test('recordings load only on selection and pause resumes the same position', async t => {
  const { audio, media } = fixture(t);
  await audio.nextTrack();
  assert.equal(media.loads, 0);
  await audio.nextTrack();
  assert.equal(media.src, '/audio/take-five.m4a');
  assert.equal(media.loads, 1);
  media.currentTime = 42;
  await audio.toggle();
  assert.equal(media.paused, true);
  await audio.toggle();
  assert.equal(media.currentTime, 42);
  assert.equal(media.loads, 1);
  assert.equal(audio.trackName, 'Take Five');
});

test('rapid record clicks preserve order and do not start stale audio', async t => {
  const { audio, media } = fixture(t);
  await Promise.all([audio.nextTrack(), audio.nextTrack(), audio.nextTrack()]);
  assert.equal(globalThis.setInterval.mock.callCount(), 0);
  assert.equal(media.plays, 1);
  assert.equal(audio.trackName, '我只在乎你');
});

test('music button starts the first track after the silent step', async t => {
  const { audio } = fixture(t);
  for (let i = 0; i < 9; i++) await audio.nextTrack();
  await audio.toggle();
  assert.equal(audio.trackName, 'Last light');
  assert.equal(audio.playing, true);
});

test('a finished recording advances to the next song and updates the player', async t => {
  const { audio, media } = fixture(t);
  await audio.nextTrack(); await audio.nextTrack();
  let changes = 0; audio.onChange = () => changes++;
  assert.equal(media.loop, false);
  media.ended = true;
  await media.onended();
  assert.equal(audio.trackName, '我只在乎你');
  assert.equal(media.src, '/audio/wo-zhi-zai-hu-ni.m4a');
  assert.equal(changes, 1);
});

test('the final song automatically wraps to the opening track without silence', async t => {
  const { audio, media } = fixture(t);
  for (let i = 0; i < 8; i++) await audio.nextTrack();
  media.ended = true; await media.onended();
  assert.equal(audio.trackName, 'Last light');
  assert.equal(audio.playing, true);
});

test('the original lounge track has an ending and advances after its final bar', async t => {
  const { audio } = fixture(t);
  await audio.nextTrack();
  const tick = globalThis.setInterval.mock.calls[0].arguments[0];
  for (let i = 0; i < 31; i++) tick();
  assert.equal(audio.trackName, 'Last light');
  await tick();
  assert.equal(audio.trackName, 'Take Five');
});

test('late ended events cannot restart paused or disposed music', async t => {
  const { audio, media } = fixture(t);
  await audio.nextTrack(); await audio.nextTrack();
  await audio.toggle(); media.ended = true;
  await media.onended();
  assert.equal(audio.trackName, 'Take Five');
  assert.equal(audio.playing, false);
  audio.dispose();
  assert.equal(media.onended, null);
});

test('purring loops independently and repeated cat clicks keep one continuous source', async t => {
  const { audio, contexts } = fixture(t);
  await audio.purr();
  assert.equal(audio.playing, false);
  const first = contexts[0].sources.filter(n => n.buffer).at(-1);
  assert.ok(first?.started);
  await audio.purr();
  assert.equal(first.stopped, false);
  assert.equal(first.loop, true);
  assert.equal(contexts[0].sources.filter(n => n.buffer).length, 2);
  audio.stopPurr();
  assert.equal(first.stopped, true);
  assert.equal(audio.playing, false);
});

test('purr breaths have audible bodies, soft edges, and quiet pauses', async t => {
  const { audio, contexts } = fixture(t);
  await audio.purr();
  const ctx = contexts[0];
  const samples = ctx.sources.filter(n => n.buffer).at(-1).buffer.getChannelData(0);
  const rms = (start, end) => {
    const segment = samples.slice(Math.round(start * ctx.sampleRate), Math.round(end * ctx.sampleRate));
    return Math.sqrt(segment.reduce((sum, value) => sum + value * value, 0) / segment.length);
  };
  for (const start of [0, 2.4]) {
    const body = rms(start + .7, start + 1.3);
    assert.ok(body > .07 && body < .11, 'each breath retains its audible level');
    assert.ok(rms(start + 1.8, start + 2.4) < .00001, 'at least 600ms of silence between breaths');
    assert.ok(rms(start, start + .05) < body * .1, 'breath fades in gently');
    assert.ok(rms(start + 1.7, start + 1.75) < body * .1, 'breath fades out gently');
  }
  assert.equal(Math.abs(samples[0]), 0);
  assert.equal(Math.abs(samples.at(-1)), 0);
});

test('hidden tabs suspend audio and becoming visible resumes active music', async t => {
  const { audio, contexts } = fixture(t);
  await audio.nextTrack();
  audio.setHidden(true);
  assert.equal(contexts[0].state, 'suspended');
  audio.setHidden(false);
  assert.equal(contexts[0].state, 'running');
});

test('disposing during an audio start cannot resurrect the player', async t => {
  const { audio, contexts } = fixture(t);
  const pending = audio.nextTrack();
  audio.dispose();
  await pending;
  assert.equal(audio.playing, false);
  assert.equal(contexts[0].state, 'closed');
  assert.equal(globalThis.setInterval.mock.callCount(), 0);
});

 test('leaving cat focus during audio activation prevents a late purr', async t => {
  const { audio, contexts } = fixture(t);
  const pending = audio.purr();
  audio.stopPurr();
  await pending;
  assert.equal(contexts[0].sources.filter(n => n.buffer).length, 1);
});
 test('cat focus survives tab suspension and ends on exit', async t => {
  const { audio, contexts } = fixture(t);
  await audio.purr();
  const purr = contexts[0].sources.at(-1);
  audio.setHidden(true);
  assert.equal(contexts[0].state, 'suspended');
  assert.equal(purr.stopped, false);
  audio.setHidden(false);
  assert.equal(contexts[0].state, 'running');
  audio.stopPurr();
  assert.equal(purr.stopped, true);
});

test('cat focus gently lowers music and restores it when leaving', async t => {
  const { audio, contexts } = fixture(t);
  await audio.nextTrack();
  const music = contexts[0].gains[0], rain = contexts[0].gains[1];
  const normal = music.gain.value, rainLevel = rain.gain.value;
  await audio.purr();
  assert.ok(music.gain.value < normal && music.gain.value > normal / 2);
  assert.equal(rain.gain.value, rainLevel);
  const samples = contexts[0].sources.filter(n => n.buffer).at(-1).buffer.getChannelData(0);
  const rms = Math.sqrt(samples.reduce((sum, value) => sum + value * value, 0) / samples.length);
  assert.ok(rms > .04 && rms < .08);
  assert.ok(samples.every(value => Math.abs(value) < 1));
  audio.stopPurr();
  assert.equal(music.gain.value, normal);
});

test('recordings pause in a hidden tab without losing their position', async t => {
  const { audio, media } = fixture(t);
  await audio.nextTrack();
  await audio.nextTrack();
  media.currentTime = 25;
  audio.setHidden(true);
  assert.equal(media.paused, true);
  audio.setHidden(false);
  await Promise.resolve();
  assert.equal(media.paused, false);
  assert.equal(media.currentTime, 25);
});

test('failed recordings leave playback off and can be advanced past', async t => {
  const { audio, media } = fixture(t);
  await audio.nextTrack();
  const play = media.play.bind(media);
  media.play = async () => { throw new Error('Failed to load'); };
  await assert.rejects(audio.nextTrack(), /Failed to load/);
  assert.equal(audio.playing, false);
  media.play = play;
  await audio.nextTrack();
  assert.equal(audio.playing, true);
  assert.equal(audio.trackName, '我只在乎你');
});

test('hiding the tab during a recording start preserves playback intent', async t => {
  const { audio, media } = fixture(t);
  await audio.nextTrack();
  const play = media.play.bind(media);
  let reject;
  media.play = () => new Promise((resolve, no) => { reject = no; });
  const pending = audio.nextTrack();
  await Promise.resolve();
  audio.setHidden(true);
  reject(new DOMException('Playback was interrupted', 'AbortError'));
  await pending;
  assert.equal(audio.playing, true);
  media.play = play;
  audio.setHidden(false);
  await Promise.resolve();
  assert.equal(media.paused, false);
});
