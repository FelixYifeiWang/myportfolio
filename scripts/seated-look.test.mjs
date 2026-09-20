import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { SeatedLook } from '../src/diner/seated-look.ts';

const eye = new THREE.Vector3(1, 2.85, 2.75);
const forward = new THREE.Vector3(-.15, 2.1, -2.7);
const makeLook = () => new SeatedLook(eye, forward);

test('looking around stays at the seat instead of orbiting the counter', () => {
  const look = makeLook(), camera = new THREE.PerspectiveCamera();
  look.drag(260, 100, 900);
  for (let i = 0; i < 120; i++) {
    look.update(1 / 60);
    look.apply(camera);
    assert.ok(camera.position.distanceTo(eye) < 1e-10);
  }
  assert.ok(look.target.distanceTo(forward) > 1);
});

test('extreme drags cannot turn behind the seat or flip the view', () => {
  for (const [x, y] of [[1e6, 1e6], [-1e6, -1e6]]) {
    const look = makeLook();
    look.drag(x, y, 900);
    look.update(0, true);
    const direction = look.target.clone().sub(eye).normalize();
    assert.ok(direction.z < 0);
    assert.ok(direction.y > -.75 && direction.y < .4);
  }
});

test('restoring a heading preserves it and clears pending drag motion', () => {
  const look = makeLook();
  look.drag(180, -50, 900);
  look.update(0, true);
  const saved = look.target.clone();
  look.drag(-300, 80, 900);
  look.reset(saved);
  assert.equal(look.update(1), false);
  assert.ok(look.target.distanceTo(saved) < 1e-10);
});

test('smooth motion settles at the same heading across frame rates', () => {
  const sixty = makeLook(), thirty = makeLook();
  sixty.drag(100, 60, 900);
  thirty.drag(100, 60, 900);
  for (let i = 0; i < 60; i++) sixty.update(1 / 60);
  for (let i = 0; i < 30; i++) thirty.update(1 / 30);
  assert.ok(sixty.target.distanceTo(thirty.target) < 1e-6);
  for (let i = 0; i < 120; i++) sixty.update(1 / 60);
  assert.equal(sixty.update(1 / 60), false);
});

test('reduced motion responds immediately without continuing to drift', () => {
  const look = makeLook();
  look.drag(100, 60, 900);
  assert.equal(look.update(0, true), true);
  assert.equal(look.update(1 / 60, true), false);
  assert.ok(look.target.distanceTo(forward) > .5);
});

test('focusing a counter object turns toward it without moving any seat', () => {
  for (const x of [-3, -1, 1, 3]) {
    const seatEye = new THREE.Vector3(x, 2.85, 2.75);
    const look = new SeatedLook(seatEye, new THREE.Vector3(x * .65, 2.1, -2.7));
    const camera = new THREE.PerspectiveCamera();
    for (const point of [new THREE.Vector3(.1, 1.93, .15), new THREE.Vector3(-1.5, 1.93, .16), new THREE.Vector3(-.65, 1.92, -3.15), new THREE.Vector3(-3.25, 2.51, .12)]) {
      const heading = look.target.clone();
      look.reset(look.targetFor(point));
      look.apply(camera);
      const actual = camera.getWorldDirection(new THREE.Vector3());
      assert.ok(actual.distanceTo(point.clone().sub(seatEye).normalize()) < 1e-6);
      assert.ok(camera.position.distanceTo(seatEye) < 1e-10);
      look.reset(heading);
      assert.ok(look.target.distanceTo(heading) < 1e-10);
    }
  }
});
