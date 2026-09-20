import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { OBB } from 'three/addons/math/OBB.js';
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
  assert.ok(opened.x > center.x + .4);
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

test('the limited door swing leaves clearance around the left stool', () => {
  const door = createEntrance(palette, new THREE.Texture());
  for (let opening = 0; opening <= 1; opening += .05) {
    door.setOpen(opening);
    door.group.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(door.leaf);
    assert.ok(bounds.max.x < -3.45, `Door entered the stool footprint at ${opening}`);
  }
});

test('the door opens only far enough for a peek', () => {
  const door = createEntrance(palette, new THREE.Texture());
  door.setOpen(1);
  assert.ok(door.hinge.rotation.y <= Math.PI * 35 / 180 + 1e-8);
  assert.ok(door.hinge.rotation.y >= Math.PI * 34 / 180);
});

test('the leaf clears the hinge jamb, threshold, and mat throughout its swing', () => {
  const door = createEntrance(palette, new THREE.Texture());
  for (let step = 0; step <= 20; step++) {
    door.setOpen(step / 20);
    door.group.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(door.leaf, true);
    assert.ok(bounds.min.y > .0525, 'Leaf catches the threshold or mat');
    assert.ok(bounds.min.z > 1.795, 'Hinge heel passes through the rear jamb');
    const toOBB = mesh => {
      mesh.geometry.computeBoundingBox();
      return new OBB().fromBox3(mesh.geometry.boundingBox).applyMatrix4(mesh.matrixWorld);
    };
    const jambs = door.group.children.slice(0, 3).map(toOBB);
    door.leaf.traverse(mesh => {
      if (mesh.isMesh) assert.ok(jambs.every(jamb => !jamb.intersectsOBB(toOBB(mesh))), 'Leaf intersects the frame');
    });
  }
});

test('exposed plaster and walnut end faces never overlap beside the door', () => {
  const wall = createEntranceWall(palette.cream, palette.walnut, palette.darkwood);
  wall.updateMatrixWorld(true);
  const boundsFor = material => wall.children.filter(mesh => mesh.material === material).map(mesh => new THREE.Box3().setFromObject(mesh));
  const plaster = boundsFor(palette.cream), panels = boundsFor(palette.walnut);
  for (const panel of panels) {
    const backing = plaster.find(wall => Math.abs(wall.max.z - panel.max.z) < 1e-5 && wall.min.y < .1);
    assert.ok(backing, 'Every lower panel has a plaster backing');
    assert.ok(panel.min.x >= backing.max.x - 1e-6, 'Overlapping coplanar end caps cause flicker at oblique angles');
  }
});
