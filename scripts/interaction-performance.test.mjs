import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {pickVisibleObject, freezeStaticTransforms, createShadowWarmup} from '../src/diner/render-preparation.ts';

test('picking tests the visible LOD only, once, and ignores hidden meshes', () => {
    const root = new THREE.Group(), lod = new THREE.LOD();
    const high = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
    const low = high.clone();
    high.userData.action = low.userData.action = 'cat';
    let highCalls = 0, lowCalls = 0;
    const raycast = high.raycast;
    high.raycast = function (...args) { highCalls++; raycast.apply(this, args); };
    low.raycast = function (...args) { lowCalls++; raycast.apply(this, args); };
    lod.addLevel(high, 0); lod.addLevel(low, 7); high.visible = false; low.visible = true;
    root.add(lod); root.updateMatrixWorld(true);
    const ray = new THREE.Raycaster(new THREE.Vector3(0,0,10),new THREE.Vector3(0,0,-1));
    assert.equal(pickVisibleObject(ray,[root]), 'cat');
    assert.deepEqual([highCalls,lowCalls],[0,1]);
});

test('static transforms stay cached while animated parents still move their descendants', () => {
    const root = new THREE.Group(), animated = new THREE.Group(), child = new THREE.Mesh(new THREE.BoxGeometry());
    animated.add(child); root.add(animated);
    freezeStaticTransforms(root, [animated]); root.updateMatrixWorld(true);
    assert.equal(root.matrixAutoUpdate,false);assert.equal(child.matrixAutoUpdate,false);
    animated.position.x = 3; root.updateMatrixWorld();
    assert.equal(child.matrixWorld.elements[12],3);
});

test('visitor shadow warmup preserves cutout maps and the renderer’s back-face shadow convention', () => {
    const material = new THREE.MeshStandardMaterial({map:new THREE.Texture(),alphaTest:.5});
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(),material);mesh.castShadow=true;
    const warmup = createShadowWarmup(mesh);
    assert.equal(mesh.customDepthMaterial.map,material.map);
    assert.equal(mesh.customDepthMaterial.alphaTest,.5);
    assert.equal(mesh.customDepthMaterial.side,THREE.BackSide);
    assert.equal(warmup.children[0].geometry,mesh.geometry);
    assert.equal(warmup.children[0].material,mesh.customDepthMaterial);
    assert.equal(createShadowWarmup(mesh).children[0].material,warmup.children[0].material);
});
