import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createEntrance } from '../src/diner/furnishings.ts';
import { createEntranceWall } from '../src/diner/entrance-wall.ts';
import { batchStaticMeshes } from '../src/diner/optimize.ts';
const palette = Object.fromEntries(['wood','walnut','darkwood','brass','cream','green','black','metal','glow'].map(key => [key,new THREE.MeshStandardMaterial()]));

test('the hinge opens inward while the sconce and threshold remain fixed', () => {
  const door = createEntrance(palette, new THREE.Texture());
  door.group.updateMatrixWorld(true);
  const fixed = door.group.children.filter(child => child !== door.hinge);
  const before = fixed.map(child => child.matrixWorld.clone());
  const center = new THREE.Vector3();
  door.leaf.getWorldPosition(center);
  door.setOpen(1); door.group.updateMatrixWorld(true);
  const opened = door.leaf.getWorldPosition(new THREE.Vector3());
  assert.ok(opened.x > center.x + .7);
  assert.ok(fixed.every((child,index) => child.matrixWorld.equals(before[index])));
  door.setOpen(0); door.group.updateMatrixWorld(true);
  assert.ok(door.leaf.getWorldPosition(new THREE.Vector3()).distanceTo(center) < 1e-8);
});

test('wall opening is clear at both small and human visitor heights', () => {
  const wall = createEntranceWall(palette.cream, palette.walnut, palette.darkwood);
  wall.updateMatrixWorld(true);
  for (const y of [.3,1.5,3.3]) {
    const ray = new THREE.Raycaster(new THREE.Vector3(-3,y,2.65), new THREE.Vector3(-1,0,0));
    assert.equal(ray.intersectObject(wall,true).length,0);
  }
  for (const z of [1.5,3.8]) {
    const ray = new THREE.Raycaster(new THREE.Vector3(-3,1,z), new THREE.Vector3(-1,0,0));
    assert.ok(ray.intersectObject(wall,true).length > 0);
  }
});

test('room optimization preserves the animated leaf', () => {
  const door = createEntrance(palette,new THREE.Texture());
  const children = [...door.leaf.children];
  batchStaticMeshes(door.group,[door.hinge]);
  assert.deepEqual(door.leaf.children,children);
});
