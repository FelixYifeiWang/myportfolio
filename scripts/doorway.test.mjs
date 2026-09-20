import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createDoorwayNight, createDoorwayLight, createDoorwaySideWall } from '../src/diner/doorway.ts';

test('night background stays behind all visitors and is clipped to the aperture', () => {
  const night = createDoorwayNight();
  const bounds = new THREE.Box3().setFromObject(night);
  assert.ok(bounds.max.x < -11);
  assert.equal(night.material.stencilFunc, THREE.EqualStencilFunc);
  assert.equal(night.material.stencilWriteMask, 0);
  assert.equal(night.material.map, null);
  assert.ok(night.geometry.index.count / 3 <= 500);
});
test('porch light casts face shadows without spilling into the room', () => {
  const light = createDoorwayLight();
  const outward = light.target.position.clone().sub(light.position).normalize();
  assert.ok(outward.x < -Math.sin(light.angle), 'The entire light cone must point outside');
  assert.equal(light.castShadow, true);
  assert.ok(light.shadow.mapSize.x <= 512 && light.shadow.mapSize.y <= 512);
  assert.equal(light.shadow.autoUpdate, false, 'A static visitor should not redraw its shadow every frame');
});

test('the window-side return wall hides the window scenery from the entrance', () => {
  const wall = createDoorwaySideWall(); wall.updateMatrixWorld(true);
  for (const x of [-5.3, -5.7, -7.5, -10.0, -13.0]) {
    for (const height of [2.5, 5.2]) {
      const ray = new THREE.Raycaster(new THREE.Vector3(x, height, 2.6), new THREE.Vector3(0, 0, -1), 0, 4);
      assert.ok(ray.intersectObject(wall, true).length > 0);
    }
  }
  const bounds = new THREE.Box3().setFromObject(wall);
  assert.ok(bounds.max.z <= 1.81);
  wall.traverse(mesh => { if (mesh.isMesh) assert.equal(mesh.material.stencilFunc, THREE.EqualStencilFunc); });
});
