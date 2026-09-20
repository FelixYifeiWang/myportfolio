import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { visitors } from '../src/diner/visitor-assets.ts';

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
