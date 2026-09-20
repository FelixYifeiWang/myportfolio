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
  sources = [];
  createGain() { return new Node(); }
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

test('purring is independent of music and repeated cat clicks replace the previous purr', async t => {
  const { audio, contexts } = fixture(t);
  await audio.purr();
  assert.equal(audio.playing, false);
  const first = contexts[0].sources.filter(n => n.buffer && !n.loop).at(-1);
  assert.ok(first?.started);
  await audio.purr();
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
