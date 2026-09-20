import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { paperGeometry, linenGeometry, createNotebook } from '../src/diner/paper-props.ts';
import { batchStaticMeshes } from '../src/diner/optimize.ts';

test('paper and linen sit on their support and keep curls small enough for the counter', () => {
  for (const geometry of [paperGeometry(1.05, 1.36), linenGeometry(.56, .47)]) {
    geometry.computeBoundingBox();
    assert.ok(geometry.boundingBox.min.y >= -1e-6 && geometry.boundingBox.max.y <= .03);
    assert.ok(geometry.index.count / 3 <= 650);
    assert.ok([...geometry.attributes.normal.array].every(Number.isFinite));
  }
});

test('bound notebook retains its footprint and a small material budget', () => {
  const notebook = createNotebook(new THREE.Texture(), new THREE.Texture());
  const bounds = new THREE.Box3().setFromObject(notebook);
  assert.ok(bounds.min.x >= -.39 && bounds.max.x <= .39 && bounds.min.y >= -.04 && bounds.max.y <= .06 && bounds.max.z <= .58);
  assert.ok(batchStaticMeshes(notebook, []).after <= 6);
});
