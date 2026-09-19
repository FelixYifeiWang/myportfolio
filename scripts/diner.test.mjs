import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { batchStaticMeshes } from '../src/diner/optimize.ts';

test('batching preserves the bounds of nested, transformed room geometry', () => {
  const root = new THREE.Group();
  root.position.set(3, 0, -2);
  const shelf = new THREE.Group();
  shelf.position.set(2, 3, 1);
  shelf.rotation.y = .4;
  root.add(shelf);
  const wood = new THREE.MeshStandardMaterial();
  for (const x of [-1, 1]) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, .2, 2), wood);
    mesh.position.x = x;
    shelf.add(mesh);
  }
  const before = new THREE.Box3().setFromObject(root);
  const result = batchStaticMeshes(root, []);
  const after = new THREE.Box3().setFromObject(root);
  assert.ok(before.min.distanceTo(after.min) < 1e-6 && before.max.distanceTo(after.max) < 1e-6);
  assert.equal(result.before - result.after, 1);
});

test('animated and clickable objects retain their own geometry and local transforms', () => {
  const root = new THREE.Group();
  const material = new THREE.MeshStandardMaterial();
  const cat = new THREE.Group();
  const shared = new THREE.BoxGeometry();
  const body = new THREE.Mesh(shared, material);
  cat.add(body); root.add(cat);
  root.add(new THREE.Mesh(shared, material), new THREE.Mesh(new THREE.BoxGeometry(), material));
  let disposed = false;
  shared.addEventListener('dispose', () => { disposed = true; });
  batchStaticMeshes(root, [cat]);
  assert.equal(body.parent, cat);
  assert.equal(body.geometry, shared);
  assert.equal(disposed, false);
});

test('transparent surfaces and different shadow settings are not merged together', () => {
  const root = new THREE.Group();
  const solid = new THREE.MeshStandardMaterial();
  const glass = new THREE.MeshStandardMaterial({transparent:true,opacity:.4});
  const window = new THREE.Mesh(new THREE.PlaneGeometry(), glass);
  root.add(window);
  for (let i=0;i<4;i++) {
    const object = new THREE.Mesh(new THREE.BoxGeometry(),solid);
    object.castShadow = i<2;
    root.add(object);
  }
  const result=batchStaticMeshes(root,[]);
  assert.equal(window.parent,root);
  assert.equal(result.after,3);
  assert.equal(root.children.filter(item=>item.castShadow).length,1);
});

test('compressed model instances keep their positions outside the quantization range', () => {
  const root = new THREE.Group();
  const material = new THREE.MeshStandardMaterial();
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const positions = geometry.attributes.position;
  geometry.setAttribute('position', new THREE.BufferAttribute(Int16Array.from(positions.array, value => Math.round(value * 32767)), 3, true));
  for (const x of [-3, -1, 1, 3]) {
    const object = new THREE.Mesh(geometry, material);
    object.position.set(x, 1, 1.75);
    root.add(object);
  }
  const before = new THREE.Box3().setFromObject(root);
  batchStaticMeshes(root, []);
  const after = new THREE.Box3().setFromObject(root);
  assert.ok(before.min.distanceTo(after.min) < 1e-5 && before.max.distanceTo(after.max) < 1e-5);
});

test('distance detail levels stay separate so only the selected level renders', () => {
  const root = new THREE.Group();
  const material = new THREE.MeshStandardMaterial();
  const lod = new THREE.LOD();
  const high = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), material);
  const low = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), material);
  lod.addLevel(high, 0); lod.addLevel(low, 7);
  root.add(lod, new THREE.Mesh(new THREE.BoxGeometry(), material));
  batchStaticMeshes(root, []);
  const camera = new THREE.PerspectiveCamera();
  camera.position.z = 12; camera.updateMatrixWorld(); lod.update(camera);
  assert.ok(high.parent === lod && low.parent === lod && !high.visible && low.visible);
  camera.position.z = 3; camera.updateMatrixWorld(); lod.update(camera);
  assert.ok(high.visible && !low.visible);
});
