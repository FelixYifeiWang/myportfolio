import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DisclosureMotion, DisclosureGroup } from '../src/diner/disclosure-motion.ts';
globalThis.getComputedStyle = () => ({ opacity: '0.5', borderBottomWidth: '1px' });

function fixture(reduced = false) {
    const animations = [];
    const animate = (frames) => {
        const animation = { frames, onfinish: null, cancel() {}, finish() { this.onfinish?.(); } };
        animations.push(animation);
        return animation;
    };
    const content = { animate, inert: false };
    const details = {
        open: false, dataset: {}, style: { overflow: '' }, animate,
        getBoundingClientRect() { return { height: this.open ? 400 : 64 }; },
    };
    const summary = { getBoundingClientRect: () => ({ height: 63 }) };
    return { details, content, animations, motion: new DisclosureMotion(details, summary, content, () => reduced) };
}

test('opening reveals content and releases temporary clipping after expansion', () => {
    const { motion, details, animations } = fixture();
    motion.toggle();
    assert.equal(details.open, true);
    assert.equal(details.style.overflow, 'hidden');
    animations[0].finish();
    assert.equal(details.style.overflow, '');
});

test('closing retains the content until the collapse finishes', () => {
    const { motion, details, content, animations } = fixture();
    motion.toggle(); animations[0].finish();
    motion.toggle();
    assert.equal(details.open, true);
    assert.equal(content.inert, true);
    animations[2].finish();
    assert.equal(details.open, false);
});

test('rapid toggles follow the latest intent and cannot finish an obsolete animation', () => {
    const { motion, details, animations } = fixture();
    motion.toggle(); motion.toggle(); motion.toggle();
    animations[2].finish();
    assert.equal(details.open, true);
    animations[4].finish();
    assert.equal(details.dataset.expanding, undefined);
    assert.equal(details.style.overflow, '');
});

test('reduced motion opens and closes immediately without animation', () => {
    const { motion, details, animations } = fixture(true);
    motion.toggle(); assert.equal(details.open, true);
    motion.toggle(); assert.equal(details.open, false);
    assert.equal(animations.length, 0);
});

test('choosing a different entry closes the previous entry with its normal motion', () => {
    const first = fixture(), second = fixture();
    const group = new DisclosureGroup([first.motion, second.motion]);
    group.toggle(first.motion); first.animations[0].finish();
    group.toggle(second.motion);
    assert.equal(first.content.inert, true);
    first.animations[2].finish(); second.animations[0].finish();
    assert.deepEqual([first.details.open, second.details.open], [false, true]);
});

test('choosing the active entry again leaves the group collapsed', () => {
    const first = fixture(true), second = fixture(true);
    const group = new DisclosureGroup([first.motion, second.motion]);
    group.toggle(first.motion); group.toggle(first.motion);
    assert.deepEqual([first.details.open, second.details.open], [false, false]);
});

test('rapid choices across entries settle on only the final selection', () => {
    const entries = [fixture(), fixture(), fixture()];
    const group = new DisclosureGroup(entries.map(entry => entry.motion));
    for (const index of [0, 1, 2, 0]) group.toggle(entries[index].motion);
    entries.forEach(entry => entry.animations.forEach(animation => animation.finish()));
    assert.deepEqual(entries.map(entry => entry.details.open), [true, false, false]);
});

test('reduced-motion groups switch exclusively without creating animations', () => {
    const first = fixture(true), second = fixture(true);
    const group = new DisclosureGroup([first.motion, second.motion]);
    group.toggle(first.motion); group.toggle(second.motion);
    assert.deepEqual([first.details.open, second.details.open], [false, true]);
    assert.equal(first.animations.length + second.animations.length, 0);
});
