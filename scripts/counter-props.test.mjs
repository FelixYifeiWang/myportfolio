import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createVaseArrangement, createUtensilHolder } from '../src/diner/counter-props.ts';
import { batchStaticMeshes } from '../src/diner/optimize.ts';

const materials = () => ({
  ceramic: new THREE.MeshStandardMaterial(),
  clay: new THREE.MeshStandardMaterial(),
  wood: new THREE.MeshStandardMaterial(),
});

test('vase and holder have real recessed interiors, not solid caps', () => {
  for (const prop of [createVaseArrangement(materials()), createUtensilHolder(materials())]) {
    prop.updateMatrixWorld(true);
    const vessel = prop.getObjectByName('Open ceramic vessel');
    const ray = new THREE.Raycaster(new THREE.Vector3(0, 2, 0), new THREE.Vector3(0, -1, 0));
    const hits = ray.intersectObject(vessel);
    assert.ok(hits.length && hits[0].point.y < .06, 'The center ray should reach the inside floor');
  }
});

test('arrangement has thin curved leaves rather than solid ellipsoids', () => {
  const vase = createVaseArrangement(materials());
  const leaves = [];
  vase.traverse(node => { if (node.name === 'Olive leaf') leaves.push(node); });
  assert.ok(leaves.length >= 14 && leaves.length <= 28);
  assert.ok(leaves.every(leaf => leaf.geometry.attributes.color && leaf.material.side === THREE.DoubleSide));
});

test('counter props fit their footprints and remain inexpensive after batching', () => {
  const root = new THREE.Group();
  for (const [prop, height, width] of [[createVaseArrangement(materials()), 1.16, .75], [createUtensilHolder(materials()), .62, .4]]) {
    const bounds = new THREE.Box3().setFromObject(prop);
    const size = bounds.getSize(new THREE.Vector3());
    assert.ok(bounds.min.y >= -.001 && size.y <= height && size.x <= width && size.z <= width);
    root.add(prop);
  }
  let triangles = 0;
  root.traverse(node => { if (node.isMesh) triangles += (node.geometry.index?.count ?? node.geometry.attributes.position.count) / 3; });
  assert.ok(triangles < 13_000, `${triangles} triangles`);
  assert.ok(batchStaticMeshes(root, []).after <= 9);
});
