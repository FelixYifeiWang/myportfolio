import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DoorEncounter } from '../src/diner/door-encounter.ts';

function fixture(load = async id => ({ id })) {
  const events = [];
  const encounter = new DoorEncounter(['pikachu', 'kim', 'ranni'], {
    load, show: asset => events.push(['show', asset.id]),
    hide: () => events.push(['hide']), angle: value => events.push(['angle', value]),
    changed: () => {}, error: () => events.push(['error']),
  }, () => 0);
  return { encounter, events };
}
function tick(encounter, seconds, reduced = false) {
  for (let time = 0; time < seconds; time += .05) encounter.update(.05, reduced);
}

test('visitor is ready before the door opens and disappears only after it closes', async () => {
  const { encounter, events } = fixture();
  await encounter.open();
  assert.deepEqual(events[0], ['show', 'pikachu']);
  tick(encounter, 1.4);
  assert.equal(encounter.phase, 'holding');
  tick(encounter, 2.5);
  assert.equal(encounter.phase, 'closing');
  assert.ok(!events.some(([event]) => event === 'hide'));
  tick(encounter, 1.4);
  assert.equal(encounter.phase, 'closed');
  assert.deepEqual(events.at(-1), ['hide']);
});

test('repeated clicks do not load additional visitors and consecutive visits differ', async () => {
  let loads = 0;
  const { encounter, events } = fixture(async id => { loads++; return { id }; });
  await Promise.all([encounter.open(), encounter.open(), encounter.open()]);
  assert.equal(loads, 1);
  tick(encounter, 10);
  await encounter.open();
  assert.deepEqual(events.filter(([event]) => event === 'show'), [['show', 'pikachu'], ['show', 'kim']]);
});

test('leaving during a download cannot reveal a late visitor', async () => {
  let resolve;
  const { encounter, events } = fixture(() => new Promise(done => { resolve = done; }));
  const pending = encounter.open();
  encounter.close();
  resolve({ id: 'pikachu' });
  await pending;
  assert.equal(encounter.phase, 'closed');
  assert.ok(!events.some(([event]) => event === 'show'));
});

test('failed downloads leave a closed door and allow another attempt', async () => {
  const { encounter, events } = fixture(async () => { throw new Error('offline'); });
  await encounter.open();
  assert.equal(encounter.phase, 'closed');
  assert.deepEqual(events, [['error']]);
});

test('reduced motion keeps the encounter duration without swinging animation', async () => {
  const { encounter, events } = fixture();
  await encounter.open();
  encounter.update(.05, true);
  assert.equal(encounter.phase, 'holding');
  assert.deepEqual(events.at(-1), ['angle', 1]);
  encounter.close();
  encounter.update(.05, true);
  assert.equal(encounter.phase, 'closed');
  assert.deepEqual(events.at(-1), ['hide']);
});

test('disposal cancels pending loads and all later interactions', async () => {
  let resolve;
  const { encounter, events } = fixture(() => new Promise(done => { resolve = done; }));
  const pending = encounter.open();
  encounter.dispose();
  const count = events.length;
  resolve({ id: 'pikachu' });
  await pending;
  await encounter.open();
  tick(encounter, 10);
  assert.equal(events.length, count);
});

test('each accepted visit knocks before opening; busy clicks do not knock again', async () => {
  let finishKnock, knocks = 0;
  const encounter = new DoorEncounter(['link'], {
    load: async id => id,
    knock: () => { knocks++; return new Promise(resolve => { finishKnock = resolve; }); },
    stopKnock() {}, show() {}, hide() {}, angle() {}, changed() {}, error: assert.fail,
  });
  const pending = encounter.open();
  await encounter.open();
  await Promise.resolve();
  assert.equal(encounter.phase, 'loading');
  assert.equal(knocks, 1);
  finishKnock(); await pending;
  assert.equal(encounter.phase, 'opening');
  tick(encounter, 10);
  const second = encounter.open();
  assert.equal(knocks, 2);
  finishKnock(); await second;
});
test('escape during the knock cancels sound and cannot open a late visitor', async () => {
  let finishKnock, stopped = false, shown = false;
  const encounter = new DoorEncounter(['link'], {
    load: async id => id,
    knock: () => new Promise(resolve => { finishKnock = resolve; }),
    stopKnock() { stopped = true; finishKnock(); },
    show() { shown = true; }, hide() {}, angle() {}, changed() {}, error: assert.fail,
  });
  const pending = encounter.open();
  encounter.close(); await pending;
  assert.equal(stopped, true);
  assert.equal(shown, false);
  assert.equal(encounter.phase, 'closed');
});
