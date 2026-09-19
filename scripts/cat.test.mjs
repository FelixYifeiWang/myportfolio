import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { NodeIO, getBounds } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';

await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
const budgets = {
  cat: [1_000_000, 41_000, 15_000],
  espresso: [500_000, 13_000, 5_000],
  ramen: [500_000, 20_000, 7_000],
  stool: [500_000, 13_000, 5_000],
  plant: [600_000, 26_000, 10_000],
  kettle: [400_000, 16_000, 6_000],
};
const triangles = mesh => mesh.listPrimitives().reduce((total, primitive) => total + primitive.getIndices().getCount() / 3, 0);
for (const [name, [bytes, highLimit, lowLimit]] of Object.entries(budgets)) {
  test(`${name}: web model decodes, preserves detail levels, and fits delivery budgets`, async () => {
    const path = new URL(`../public/models/diner-${name}.glb`, import.meta.url);
    const doc = await io.read(path.pathname);
    const root = doc.getRoot();
    const lods = root.listNodes().filter(node => node.getExtras().webLOD);
    assert.ok(lods.length > 0, 'Missing distance detail levels');
    let high = 0, low = 0;
    for (const node of lods) {
      const levels = node.listChildren();
      assert.equal(levels.length, 2);
      high += triangles(levels[0].getMesh());
      low += triangles(levels[1].getMesh());
      for (const level of levels) for (const primitive of level.getMesh().listPrimitives()) {
        const positions = primitive.getAttribute('POSITION');
        assert.ok([...primitive.getIndices().getArray()].every(index => index < positions.getCount()));
        assert.ok(primitive.getAttribute('NORMAL') && primitive.getAttribute('TEXCOORD_0'));
        assert.ok(primitive.getMaterial().getBaseColorTexture());
      }
    }
    for (const accessor of root.listAccessors()) assert.ok([...accessor.getArray()].every(Number.isFinite));
    assert.ok(high <= highLimit && low <= lowLimit && low < high);
    assert.ok(statSync(path).size < bytes);
    const bounds = getBounds(root.listScenes()[0]);
    assert.ok(bounds.min.every(Number.isFinite) && bounds.max.every((value, i) => value > bounds.min[i]));
    const manifest = JSON.parse(readFileSync(new URL(`../public/models/diner-${name}.manifest.json`, import.meta.url)));
    assert.equal(high, manifest.triangles);
    assert.equal(low, manifest.roomTriangles);
  });
}

test('the full imported model set stays below three megabytes', () => {
  const bytes = Object.keys(budgets).reduce((total, name) => total + statSync(new URL(`../public/models/diner-${name}.glb`, import.meta.url)).size, 0);
  assert.ok(bytes < 3_000_000, `${bytes} model bytes`);
});
