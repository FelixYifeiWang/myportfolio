import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { addFurnishings, addContactShadows, createBackCounter, createSinkBasin } from '../src/diner/furnishings.ts';
import { batchStaticMeshes } from '../src/diner/optimize.ts';

test('environment finishing stays inside the room and a modest geometry budget', () => {
  const root = new THREE.Group();
  const palette = Object.fromEntries(['wood', 'walnut', 'darkwood', 'brass', 'cream', 'green', 'black', 'metal', 'glow'].map(name => [name, new THREE.MeshStandardMaterial()]));
  addFurnishings(root, palette, new THREE.Texture());
  const bounds = new THREE.Box3().setFromObject(root);
  assert.ok(bounds.min.x >= -5.15 && bounds.max.x <= 5.1 && bounds.min.y >= 0 && bounds.max.y <= 5.4 && bounds.min.z >= -4.0 && bounds.max.z <= 4.0);
  const result = batchStaticMeshes(root, []);
  assert.ok(result.after <= 14, `Finishing uses ${result.after} material batches`);
  let triangles = 0;
  root.traverse(object => { if (object.isMesh) triangles += (object.geometry.index?.count ?? object.geometry.attributes.position.count) / 3; });
  assert.ok(triangles < 15_000, `Finishing uses ${triangles} triangles`);
});

test('contact shadows share one lightweight surface and cannot cast or write depth', () => {
  const root = new THREE.Group();
  const shadow = addContactShadows(root, new THREE.Texture());
  batchStaticMeshes(root, []);
  assert.equal(root.children.filter(object => object.isMesh).length, 1);
  assert.ok(shadow.geometry.index.count / 3 < 30);
  assert.ok(shadow.material.transparent && !shadow.material.depthWrite && !shadow.castShadow);
  assert.ok([...shadow.geometry.attributes.position.array].every(Number.isFinite));
});

test('the sink has a real opening while the surrounding counter stays solid', () => {
  const counter = createBackCounter(new THREE.MeshStandardMaterial());
  counter.updateMatrixWorld();
  const ray = new THREE.Raycaster(new THREE.Vector3(2.39, 3, -3.28), new THREE.Vector3(0, -1, 0));
  assert.equal(ray.intersectObject(counter).length, 0);
  ray.ray.origin.x = 1.4;
  assert.ok(ray.intersectObject(counter).length > 0);
});


test('sink has a closed recessed floor rather than exposing cabinetry beneath it', () => {
  const basin = createSinkBasin(new THREE.MeshStandardMaterial({side: THREE.DoubleSide}));
  basin.updateMatrixWorld();
  for (const [x,z] of [[0,0],[.20,.08],[-.20,-.08]]) {
    const hits = new THREE.Raycaster(new THREE.Vector3(x, 1, z), new THREE.Vector3(0,-1,0)).intersectObject(basin);
    assert.ok(hits.length && Math.abs(hits[0].point.y + .168) < .003);
  }
});
