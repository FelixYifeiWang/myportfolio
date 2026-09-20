import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createDoorwayNight, createDoorwayLight, createDoorwaySideWall } from '../src/diner/doorway.ts';

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
  assert.ok(outward.x < -.999, 'Light must face directly outwards so it cannot illuminate through the room wall');
  assert.equal(light.castShadow, false);
});

test('the window-side return wall hides the window scenery from the entrance', () => {
  const wall = createDoorwaySideWall(); wall.updateMatrixWorld(true);
  for (const x of [-5.4, -5.7, -7.5]) {
    const ray = new THREE.Raycaster(new THREE.Vector3(x, 2.5, 2.6), new THREE.Vector3(0, 0, -1), 0, 4);
    assert.ok(ray.intersectObject(wall, true).length > 0);
  }
  const bounds = new THREE.Box3().setFromObject(wall);
  assert.ok(bounds.max.z <= 1.81);
  wall.traverse(mesh => { if (mesh.isMesh) assert.equal(mesh.material.stencilFunc, THREE.EqualStencilFunc); });
});
