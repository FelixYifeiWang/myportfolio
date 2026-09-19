import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWindowRain } from '../src/diner/rain.ts';

test('rain stays outside the glass and inside the window across long frame intervals', () => {
  const rain = createWindowRain();
  for (const delta of [0, .016, .042, .25, 10, 100]) {
    rain.update(delta);
    const p = rain.mesh.geometry.getAttribute('position');
    for (let i = 0; i < p.count; i++) {
      assert.ok(p.getX(i) < -5.04 && p.getX(i) > -5.6);
      assert.ok(p.getY(i) >= 1.72 - 1e-5 && p.getY(i) <= 4.42 + 1e-5);
      assert.ok(p.getZ(i) >= -2.5 - 1e-5 && p.getZ(i) <= 1.1 + 1e-5);
    }
  }
});

test('rain has deterministic varied streaks and reuses one geometry buffer', () => {
  const first = createWindowRain(), second = createWindowRain();
  assert.deepEqual(first.mesh.geometry.attributes.position.array, second.mesh.geometry.attributes.position.array);
  const buffer = first.mesh.geometry.attributes.position.array;
  const initial = buffer.slice();
  first.update(.05);
  assert.equal(first.mesh.geometry.attributes.position.array, buffer);
  assert.notDeepEqual(buffer, initial);
  const lengths = new Set();
  for (let i = 0; i < buffer.length; i += 6) lengths.add(Math.round((buffer[i + 4] - buffer[i + 1]) * 1000));
  assert.ok(lengths.size > 20);
  assert.ok(first.mesh.geometry.attributes.position.count <= 320);
  assert.equal(first.mesh.material.depthWrite, false);
});
