import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createFootRail, createShelfBracket } from '../src/diner/hardware.ts';
const material = new THREE.MeshStandardMaterial();
test('foot rail stays straight at every mounting point instead of bowing away', () => {
    const rail = createFootRail(material);
    rail.updateMatrixWorld(true);
    const bar = rail.children[2];
    const bounds = new THREE.Box3().setFromObject(bar);
    assert.ok(Math.abs(bounds.min.z - (.92 - .036)) < 1e-6);
    assert.ok(Math.abs(bounds.max.z - (.92 + .036)) < 1e-6);
    for (const x of [-3, 0, 3]) {
        const ray = new THREE.Raycaster(new THREE.Vector3(x, 1, .92), new THREE.Vector3(0, -1, 0));
        assert.ok(ray.intersectObject(bar).length > 0);
    }
});
test('shelf support reaches the shelf underside and the wall', () => {
    const bracket = createShelfBracket(material);
    bracket.updateMatrixWorld(true);
    const arm = new THREE.Box3().setFromObject(bracket.children[1]);
    const wall = new THREE.Box3().setFromObject(bracket.children[0]);
    assert.ok(Math.abs(arm.max.y) < 1e-6);
    assert.ok(wall.min.z < 0 && arm.min.z < wall.max.z);
});
test('connected hardware stays within a small geometry budget', () => {
    let triangles = 0;
    for (const group of [createFootRail(material), createShelfBracket(material)]) {
        group.traverse(object => { if (object.isMesh) triangles += object.geometry.index.count / 3; });
    }
    assert.ok(triangles < 1200);
});
