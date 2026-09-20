import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSeatedSideWall } from '../src/diner/side-wall.ts';
import { batchStaticMeshes } from '../src/diner/optimize.ts';

const create = () => createSeatedSideWall(new THREE.Texture(), new THREE.Texture(), new THREE.Texture());

test('right interior closes the cutaway within a small rendering budget', () => {
  const wall = create();
  const bounds = new THREE.Box3().setFromObject(wall.group);
  assert.ok(bounds.min.x >= 4.65 && bounds.max.x <= 5.15);
  assert.ok(bounds.min.y >= -1e-6 && bounds.max.y <= 5.4);
  assert.ok(bounds.min.z >= -4.12 && bounds.max.z <= 4.12);
  let triangles = 0, draws = 0;
  wall.group.traverse(object => {
    assert.ok(!object.isLight && !object.castShadow);
    if (!object.isMesh) return;
    draws++;
    triangles += (object.geometry.index?.count ?? object.geometry.attributes.position.count) / 3;
  });
  assert.ok(draws <= 8);
  assert.ok(triangles < 2000);
});

test('side wall fades in for the interior and disappears completely in overview', () => {
  const wall = create();
  assert.equal(wall.group.visible, false);
  wall.update(.1, true);
  assert.equal(wall.group.visible, true);
  for (let i = 0; i < 40; i++) wall.update(.05, false);
  assert.equal(wall.group.visible, false);
  assert.equal(wall.update(.05, false), false);
});

test('reduced motion and room batching preserve the removable cutaway', () => {
  const wall = create(), room = new THREE.Group();
  wall.update(0, true, true);
  room.add(wall.group);
  const meshes = [...wall.group.children];
  batchStaticMeshes(room, [wall.group]);
  assert.deepEqual(wall.group.children, meshes);
  wall.update(0, false, true);
  assert.equal(wall.group.visible, false);
});
