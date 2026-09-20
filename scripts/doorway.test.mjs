import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createDoorwayNight, createDoorwayLight } from '../src/diner/doorway.ts';

test('night background stays behind all visitors and is clipped to the aperture', () => {
  const night = createDoorwayNight();
  const bounds = new THREE.Box3().setFromObject(night);
  assert.ok(bounds.max.x < -7.24);
  assert.equal(night.material.stencilFunc, THREE.EqualStencilFunc);
  assert.equal(night.material.stencilWriteMask, 0);
  assert.equal(night.material.map, null);
  assert.ok(night.geometry.index.count / 3 <= 500);
});
test('porch lighting faces outside and adds no shadow rendering', () => {
  const light = createDoorwayLight();
  const outward = new THREE.Vector3(0, 0, -1).applyQuaternion(light.quaternion);
  assert.ok(outward.x < 0);
  assert.equal(light.castShadow, false);
});
