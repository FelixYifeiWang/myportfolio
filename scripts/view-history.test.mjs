import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from 'three';
import { ViewHistory } from '../src/diner/view-history.ts';
const snapshot = view => ({ view, position: new Vector3(1, 2.85, 2.75), target: new Vector3(-2, 2.2, -1), manual: true, exploring: true });

test('repeated cat visits from the room have only one return step', () => {
    const history = new ViewHistory();
    history.enter('cat', snapshot('room'));
    history.enter('cat', snapshot('cat'));
    assert.equal(history.back().view, 'room');
    assert.equal(history.focus, null);
    assert.equal(history.returnView, undefined);
    assert.equal(history.back(), undefined);
});

test('cat and panel visits unwind to the exact previous seated heading', () => {
    for (const seat of ['seat-1', 'seat-2', 'seat-3', 'seat-4']) {
        const history = new ViewHistory(), saved = snapshot(seat);
        history.enter('cat', saved);
        history.enter('cat', snapshot(seat));
        history.enter('panel', snapshot(seat));
        assert.equal(history.back().focus, 'cat');
        const restored = history.back();
        assert.deepEqual(restored.target, saved.target);
        assert.equal(restored.view, seat);
        assert.equal(history.focus, null);
        assert.equal(history.back(), undefined);
    }
});
test('changing a pending panel does not accumulate return steps', () => {
    const history = new ViewHistory();
    history.enter('panel', snapshot('room'));
    history.enter('panel', snapshot('menu'));
    history.enter('cat', snapshot('notebook'));
    assert.equal(history.back().view, 'room');
    assert.equal(history.back(), undefined);
});
test('explicit seat or room navigation clears old focus history', () => {
    const history = new ViewHistory();
    history.enter('cat', snapshot('seat-2'));
    history.clear();
    assert.equal(history.returnView, undefined);
    assert.equal(history.focus, null);
});
