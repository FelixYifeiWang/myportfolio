import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RoomLoadingProgress } from '../src/diner/loading-progress.ts';

test('room progress is monotonic and reserves completion for the first prepared frame', () => {
    const states = [];
    const progress = new RoomLoadingProgress(state => states.push(state));
    progress.asset('cat', { loaded: 50, total: 100 });
    progress.asset('cat', { loaded: 10, total: 100 });
    for (const name of ['cat', 'plant', 'kettle', 'espresso', 'ramen', 'stool', 'wood-color', 'wood-normal', 'wood-roughness', 'art', 'portrait']) progress.asset(name);
    assert.equal(states.at(-1).value, 80);
    progress.stage('room'); progress.stage('lighting');
    assert.ok(states.at(-1).value < 100);
    progress.stage('ready');
    assert.equal(states.at(-1).value, 100);
    assert.ok(states.every((state, index) => !index || state.value >= states[index - 1].value));
});

test('unknown download size waits for completion instead of displaying a false percentage', () => {
    const states = [];
    const progress = new RoomLoadingProgress(state => states.push(state));
    progress.asset('cat', { loaded: 100, total: 0 });
    assert.equal(states.at(-1).value, 0);
    progress.asset('cat', { loaded: 200, total: 100 });
    assert.ok(states.at(-1).value < 80 / 11);
    progress.asset('cat');
    assert.equal(states.at(-1).value, Math.round(80 / 11));
});
