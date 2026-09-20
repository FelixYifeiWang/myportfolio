import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PanelTransition } from '../src/diner/panel-transition.ts';

function fixture(t, reduced = false) {
    const original = globalThis.getComputedStyle;
    globalThis.getComputedStyle = () => ({ transform: 'none' });
    t.after(() => { if (original) globalThis.getComputedStyle = original; else delete globalThis.getComputedStyle; });
    const animations = [];
    const element = () => ({
        offsetWidth: 580, offsetHeight: 640,
        animate(frames, options) {
            let resolve, reject;
            const finished = new Promise((yes, no) => { resolve = yes; reject = no; });
            const animation = { frames, options, finished, finish: resolve, cancelled: false,
                cancel() { this.cancelled = true; reject(new Error('Cancelled')); },
            };
            animations.push(animation);
            return animation;
        },
    });
    const dialog = element(), content = element();
    return { motion: new PanelTransition(dialog, content, () => reduced), dialog, animations };
}

test('panel content fades out before the paper expands and the story enters', async t => {
    const { motion, dialog, animations } = fixture(t);
    let updated = false;
    const pending = motion.run(() => { updated = true; dialog.offsetWidth = 900; });
    assert.equal(updated, false);
    animations[0].finish();
    await Promise.resolve();
    assert.equal(updated, true);
    assert.deepEqual(animations[1].frames.map(frame => frame.width), ['580px', '900px']);
    animations[1].finish();
    animations[2].finish();
    await pending;
    assert.ok(animations.every(animation => animation.cancelled), 'temporary styles are released');
});

test('closing during the fade cannot switch to stale project content', async t => {
    const { motion } = fixture(t);
    let updated = false;
    const pending = motion.run(() => { updated = true; });
    motion.cancel();
    await pending;
    assert.equal(updated, false);
});

test('a newer project choice replaces a pending transition', async t => {
    const { motion, animations } = fixture(t);
    const selected = [];
    const first = motion.run(() => selected.push('first'));
    const second = motion.run(() => selected.push('second'));
    animations[1].finish();
    await Promise.resolve();
    animations[2].finish();
    animations[3].finish();
    await Promise.all([first, second]);
    assert.deepEqual(selected, ['second']);
});

test('returning to the menu reverses the motion and remains cancellable', async t => {
    const { motion, animations } = fixture(t);
    const pending = motion.run(() => {}, true);
    assert.equal(animations[0].frames[1].transform, 'translateX(8px)');
    animations[0].finish();
    await Promise.resolve();
    assert.equal(animations[2].frames[0].transform, 'translateX(-12px)');
    motion.cancel();
    await pending;
    assert.ok(animations.every(animation => animation.cancelled));
});

test('reduced motion switches content immediately without animations', async t => {
    const { motion, animations } = fixture(t, true);
    let updated = false;
    await motion.run(() => { updated = true; });
    assert.equal(updated, true);
    assert.equal(animations.length, 0);
});
