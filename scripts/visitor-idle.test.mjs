import {test} from 'node:test';
import assert from 'node:assert/strict';
import {waitForVisitorIdle} from '../src/diner/visitor-idle.ts';

test('visitor preparation waits for interaction to settle', async t => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const controller = new AbortController();
    let quiet = false, finished = false;
    const pending = waitForVisitorIdle(() => quiet, controller.signal).then(() => { finished = true; });
    t.mock.timers.tick(20);
    assert.equal(finished, false);
    quiet = true;
    t.mock.timers.tick(150);
    await pending;
    assert.equal(finished, true);
});

test('disposal cancels a visitor waiting for idle', async () => {
    const controller = new AbortController();
    const pending = waitForVisitorIdle(() => false, controller.signal);
    controller.abort();
    await assert.rejects(pending, { name: 'AbortError' });
    await assert.rejects(waitForVisitorIdle(() => true, controller.signal), { name: 'AbortError' });
});


test('idle budget and interaction are checked again before preparation starts', async t => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    let callback, quiet = true, finished = false;
    globalThis.requestIdleCallback = fn => { callback = fn; return 1; };
    globalThis.cancelIdleCallback = () => {};
    t.after(() => { delete globalThis.requestIdleCallback; delete globalThis.cancelIdleCallback; });
    const controller = new AbortController();
    const pending = waitForVisitorIdle(() => quiet, controller.signal).then(() => { finished = true; });
    t.mock.timers.tick(1);
    callback({timeRemaining: () => 2});
    await Promise.resolve();
    assert.equal(finished, false);
    t.mock.timers.tick(150);
    quiet = false;
    callback({timeRemaining: () => 30});
    await Promise.resolve();
    assert.equal(finished, false);
    quiet = true;
    t.mock.timers.tick(150);
    callback({timeRemaining: () => 30});
    await pending;
    assert.equal(finished, true);
});
