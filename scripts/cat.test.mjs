import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const asset = readFileSync(new URL('../public/models/diner-cat.glb', import.meta.url));
const { scene } = await new GLTFLoader().parseAsync(asset.buffer.slice(asset.byteOffset, asset.byteOffset + asset.byteLength), '');
const meshes = [];
scene.traverse(object => { if (object.isMesh) meshes.push(object); });

test('the complete cat stays within its download and rendering budgets', () => {
  const textures = ['cat-coat.webp', 'cat-face.webp', 'cat-fur.webp'];
  const bytes = textures.reduce((total, name) => total + statSync(new URL(`../public/models/${name}`, import.meta.url)).size, asset.length);
  const triangles = meshes.reduce((total, mesh) => total + mesh.geometry.index.count / 3, 0);
  assert.ok(bytes < 1_100_000, `Cat and textures use ${bytes} bytes`);
  assert.ok(triangles < 45_000, `Cat uses ${triangles} triangles`);
  assert.ok(meshes.length <= 10, `Cat needs ${meshes.length} draw calls`);
});

test('the cat decodes into finite, shaded geometry with a correctly sized silhouette', () => {
  for (const mesh of meshes) {
    const geometry = mesh.geometry;
    for (const attribute of Object.values(geometry.attributes))
      assert.ok([...attribute.array].every(Number.isFinite), `${mesh.name} contains invalid attributes`);
    const positions = geometry.attributes.position;
    assert.ok([...geometry.index.array].every(index => index < positions.count));
    geometry.computeBoundingSphere();
    assert.ok(geometry.boundingSphere.radius > 0 && geometry.boundingSphere.radius < 2);
  }
  const size = new THREE.Box3().setFromObject(scene).getSize(new THREE.Vector3());
  assert.ok(size.x > 1.3 && size.x < 1.6 && size.y > .5 && size.y < .8 && size.z > .8 && size.z < 1.1);
});

test('breathing and greeting animate separately without moving the cushion', () => {
  const body = scene.getObjectByName('CatBreathingBody');
  const head = scene.getObjectByName('CatHead');
  const cushion = scene.getObjectByName('Cushion');
  assert.ok(body && head && cushion);
  assert.ok(head.getObjectByName('EarLeft') && head.getObjectByName('EarRight'));
  const before = new THREE.Box3().setFromObject(cushion);
  body.scale.y = 1.02; head.rotation.x += .1;
  const after = new THREE.Box3().setFromObject(cushion);
  assert.ok(before.equals(after));
  body.scale.y = 1; head.rotation.x -= .1;
});

test('the coat and face have independent white materials and usable texture coordinates', () => {
  for (const name of ['White coat', 'White face']) {
    const mesh = meshes.find(object => object.material.name === name);
    assert.ok(mesh, `${name} is missing`);
    const uv = mesh.geometry.attributes.uv;
    assert.ok(uv && Math.max(...uv.array) - Math.min(...uv.array) > .5);
  }
});
