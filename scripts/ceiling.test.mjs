import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSeatedCeiling } from '../src/diner/ceiling.ts';
import { batchStaticMeshes } from '../src/diner/optimize.ts';

const create = () => createSeatedCeiling(new THREE.Texture(), new THREE.Texture());

test('ceiling fits the existing walls with a small rendering budget', () => {
  const ceiling = create();
  const bounds = new THREE.Box3().setFromObject(ceiling.group);
  assert.ok(bounds.min.x >= -5.12 && bounds.max.x <= 5.12);
  assert.ok(bounds.min.z >= -4.12 && bounds.max.z <= 4.12);
  assert.ok(bounds.min.y >= 5.08 && bounds.max.y <= 5.4);
  let triangles = 0, draws = 0;
  ceiling.group.traverse(object => {
    assert.ok(!object.isLight && !object.castShadow);
    if (!object.isMesh) return;
    draws++;
    triangles += (object.geometry.index?.count ?? object.geometry.attributes.position.count) / 3;
  });
  assert.ok(draws <= 5);
  assert.ok(triangles < 800);
});

test('ceiling is absent from the overview and fades independently', () => {
  const ceiling = create();
  assert.equal(ceiling.group.visible, false);
  assert.equal(ceiling.update(.1, true), true);
  assert.equal(ceiling.group.visible, true);
  for (let i = 0; i < 40; i++) ceiling.update(.05, false);
  assert.equal(ceiling.group.visible, false);
  assert.equal(ceiling.update(.05, false), false);
});

test('reduced motion reveals and hides the ceiling immediately', () => {
  const ceiling = create();
  ceiling.update(0, true, true);
  assert.equal(ceiling.group.visible, true);
  ceiling.update(0, false, true);
  assert.equal(ceiling.group.visible, false);
});

test('room batching cannot detach the separately controlled ceiling', () => {
  const ceiling = create(), room = new THREE.Group();
  ceiling.update(0, true, true);
  room.add(ceiling.group);
  const meshes = [...ceiling.group.children];
  batchStaticMeshes(room, [ceiling.group]);
  assert.deepEqual(ceiling.group.children, meshes);
  ceiling.update(0, false, true);
  assert.ok(meshes.every(mesh => mesh.parent === ceiling.group));
});
