import { test } from 'node:test';
import assert from 'node:assert/strict';
import { statSync } from 'node:fs';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { roomAssetNames, roomAssetUrl, woodTextureUrl } from '../src/diner/asset-urls.ts';

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
function detail(document) {
  return document.getRoot().listMeshes().map(mesh => mesh.listPrimitives().map(primitive => ({
    vertices: primitive.getAttribute('POSITION').getCount(),
    indices: primitive.getIndices().getCount(),
    minimum: primitive.getAttribute('POSITION').getMin([]),
    maximum: primitive.getAttribute('POSITION').getMax([]),
  })));
}
for (const name of roomAssetNames) {
  test(`touch ${name} retains full model geometry and both detail levels`, async () => {
    const [original, touch] = await Promise.all([
      io.read(`public${roomAssetUrl(name)}`), io.read(`public${roomAssetUrl(name, true)}`),
    ]);
    assert.deepEqual(detail(touch), detail(original));
    assert.equal(touch.getRoot().listNodes().filter(node => node.getExtras().webLOD).length,
      original.getRoot().listNodes().filter(node => node.getExtras().webLOD).length);
    assert.ok(statSync(`public${roomAssetUrl(name, true)}`).size < statSync(`public${roomAssetUrl(name)}`).size);
    for (const texture of touch.getRoot().listTextures()) {
      assert.ok(Math.max(...texture.getSize()) <= (name === 'cat' ? 1024 : 512));
    }
  });
}

test('touch room models and wood textures reduce startup payload by at least forty percent', () => {
  const bytes = touch => [...roomAssetNames.map(name => roomAssetUrl(name, touch)),
    ...['color', 'normal', 'roughness'].map(name => woodTextureUrl(name, touch))]
    .reduce((total, url) => total + statSync(`public${url}`).size, 0);
  assert.ok(bytes(true) < bytes(false) * .6);
});
