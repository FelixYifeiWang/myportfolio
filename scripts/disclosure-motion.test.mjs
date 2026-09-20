import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DisclosureMotion } from '../src/diner/disclosure-motion.ts';
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
