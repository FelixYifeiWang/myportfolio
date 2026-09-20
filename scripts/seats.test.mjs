import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { seats, isSeat } from '../src/diner/seats.ts';
import { SeatedLook } from '../src/diner/seated-look.ts';

test('four distinct seats line up with the stools at a comfortable counter distance', () => {
  const entries = Object.entries(seats);
  assert.equal(entries.length, 4);
  assert.equal(new Set(entries.map(([, seat]) => seat.position.x)).size, 4);
  for (const [name, seat] of entries) {
    assert.ok(isSeat(name));
    assert.equal(seat.position.x, seat.stool.x);
    assert.ok(seat.position.z - seat.stool.z >= .9);
    assert.ok(seat.position.z < 3.9 && Math.abs(seat.position.x) < 4.9);
    assert.ok(seat.target.z < seat.position.z);
  }
  assert.equal(isSeat('menu'), false);
  assert.equal(isSeat('seat-5'), false);
});

test('every seat keeps its own fixed eye and restores its saved heading', () => {
  for (const seat of Object.values(seats)) {
    const look = new SeatedLook(seat.position, seat.target);
    const camera = new THREE.PerspectiveCamera();
    look.drag(120, 40, 900);
    look.update(0, true);
    const saved = look.target.clone();
    look.drag(-250, -80, 900);
    look.update(0, true);
    look.reset(saved);
    look.apply(camera);
    assert.ok(camera.position.distanceTo(seat.position) < 1e-10);
    assert.ok(look.target.distanceTo(saved) < 1e-10);
    assert.equal(look.update(1), false);
  }
});
