import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import * as THREE from 'three';
import { placeDoorwayVisitor } from '../src/diner/doorway.ts';
import { visitors, prepareVisitor } from '../src/diner/visitor-assets.ts';

for (const visitor of visitors) {
  test(`${visitor.name} has a small, static, fully textured delivery model`, async () => {
    const path = `public${visitor.url}`;
    const document = await new NodeIO().registerExtensions(ALL_EXTENSIONS).read(path);
    const root = document.getRoot();
    const triangles = root.listMeshes().reduce((sum, mesh) => sum + mesh.listPrimitives().reduce((n, p) => n + (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3, 0), 0);
    assert.ok((await fs.stat(path)).size < 2 * 1024 * 1024);
    assert.ok(triangles > 100 && triangles < 50000);
    assert.equal(root.listSkins().length, 0);
    assert.ok(!root.listExtensionsUsed().some(extension => extension.extensionName === 'KHR_materials_pbrSpecularGlossiness'));
    assert.ok(root.listMaterials().some(material => material.getBaseColorTexture()));
    assert.ok(root.listTextures().every(texture => texture.getSize().every(size => size <= 1024)));
  });
}

for (const visitor of visitors) {
  test(`${visitor.name} fits behind the door without intersecting the exterior walls`, async () => {
    const document = await new NodeIO().registerExtensions(ALL_EXTENSIONS).read(`public${visitor.url}`);
    const source = new THREE.Group();
    for (const node of document.getRoot().listNodes()) {
      if (!node.getMesh()) continue;
      const group = new THREE.Group();
      new THREE.Matrix4().fromArray(node.getWorldMatrix()).decompose(group.position, group.quaternion, group.scale);
      for (const primitive of node.getMesh().listPrimitives()) {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(primitive.getAttribute('POSITION').getArray(), 3));
        group.add(new THREE.Mesh(geometry));
      }
      source.add(group);
    }
    const prepared = prepareVisitor(source, visitor);
    placeDoorwayVisitor(prepared);
    const bounds = new THREE.Box3().setFromObject(prepared, true);
    assert.ok(bounds.max.x <= -5.119, 'Face or accessory intersects the closed leaf');
    assert.ok(bounds.min.x > -7.24, 'Visitor intersects the back wall');
    assert.ok(bounds.min.z > 1.80 && bounds.max.z < 3.50, 'Visitor intersects a jamb');
    assert.ok(bounds.min.y >= .039 && bounds.max.y < 3.67, 'Visitor intersects floor or lintel');
    const firstPosition = prepared.position.clone();
    placeDoorwayVisitor(prepared);
    assert.ok(prepared.position.distanceTo(firstPosition) < 1e-8, 'Cached visitor drifts on repeat visits');
  });
}
