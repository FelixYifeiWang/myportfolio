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
  createOscillator() { const n = new Node(); this.sources.push(n); return n; }
  createBufferSource() { const n = new Node(); this.sources.push(n); return n; }
  createBuffer(channels, length) { const data = new Float32Array(length); return { getChannelData: () => data }; }
  async resume() { this.state = 'running'; }
  async suspend() { this.state = 'suspended'; }
  async close() { this.state = 'closed'; }
}
function fixture(t) {
  const contexts = [];
  t.mock.method(globalThis, 'setInterval', () => 1);
  t.mock.method(globalThis, 'clearInterval', () => {});
  t.mock.method(globalThis, 'setTimeout', () => 1);
  t.mock.method(globalThis, 'clearTimeout', () => {});
  const audio = new DinerAudio(() => { const ctx = new Context(); contexts.push(ctx); return ctx; });
  t.after(() => audio.dispose());
  return { audio, contexts };
}

test('record clicks cycle three tracks and the music toggle resumes the same track', async t => {
  const { audio } = fixture(t);
  const names = [];
  for (let i = 0; i < 4; i++) { await audio.nextTrack(); names.push(audio.trackName); }
  assert.equal(new Set(names.slice(0, 3)).size, 3);
  assert.equal(names[0], names[3]);
  await audio.toggle();
  assert.equal(audio.playing, false);
  await audio.toggle();
  assert.equal(audio.trackName, names[3]);
  assert.equal(audio.playing, true);
});

test('rapid record clicks preserve order and start only one music scheduler', async t => {
  const { audio } = fixture(t);
  await Promise.all([audio.nextTrack(), audio.nextTrack(), audio.nextTrack()]);
  assert.equal(globalThis.setInterval.mock.callCount(), 1);
  assert.equal(audio.trackName, 'One more cup');
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
  const music = contexts[0].gains[0];
  const normal = music.gain.value;
  await audio.purr();
  assert.ok(music.gain.value < normal && music.gain.value > normal / 2);
  const samples = contexts[0].sources.filter(n => n.buffer).at(-1).buffer.getChannelData(0);
  const rms = Math.sqrt(samples.reduce((sum, value) => sum + value * value, 0) / samples.length);
  assert.ok(rms > .06 && rms < .08);
  assert.ok(samples.every(value => Math.abs(value) < 1));
  audio.stopPurr();
  assert.equal(music.gain.value, normal);
});
