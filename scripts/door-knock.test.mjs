import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DoorKnock } from '../src/diner/door-knock.ts';
function fixture(t) {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const audio = new EventTarget();
  Object.assign(audio, { currentTime: 0, starts: 0, pauses: 0, play() { this.starts++; return Promise.resolve(); }, pause() { this.pauses++; } });
  const knock = new DoorKnock(() => audio);
  t.after(() => knock.dispose());
  return { knock, audio };
}
test('recorded knock plays for every visit and resolves only when finished', async t => {
  const { knock, audio } = fixture(t);
  assert.equal(audio.starts, 0);
  for (let visit = 0; visit < 2; visit++) {
    let finished = false;
    const playback = knock.play().then(() => { finished = true; });
    await Promise.resolve();
    assert.equal(finished, false);
    audio.dispatchEvent(new Event('ended'));
    await playback;
  }
  assert.equal(audio.starts, 2);
});
test('cancel stops the knock and resolves the pending encounter', async t => {
  const { knock, audio } = fixture(t);
  const pending = knock.play();
  knock.stop(); await pending;
  assert.equal(audio.pauses, 1);
});
test('unavailable audio does not block the door', async t => {
  const { knock, audio } = fixture(t);
  audio.play = () => Promise.reject(new DOMException('blocked', 'NotAllowedError'));
  await knock.play();
});
test('stalled audio cannot leave the door waiting forever', async t => {
  const { knock } = fixture(t);
  const pending = knock.play();
  t.mock.timers.tick(4000); await pending;
});
test('dispose stops playback and prevents future sound', async t => {
  const { knock, audio } = fixture(t);
  const pending = knock.play();
  knock.dispose(); await pending; await knock.play();
  assert.equal(audio.starts, 1);
});

test('a late rejection from a cancelled cue cannot stop the next knock', async t => {
  const { knock, audio } = fixture(t);
  let reject;
  audio.play = () => new Promise((_, fail) => { reject = fail; });
  const first = knock.play(); knock.stop(); await first;
  audio.play = () => Promise.resolve();
  const second = knock.play();
  const pauses = audio.pauses;
  reject(new DOMException('cancelled', 'AbortError')); await Promise.resolve();
  assert.equal(audio.pauses, pauses);
  audio.dispatchEvent(new Event('ended')); await second;
});
