/** Offline delivery pass; original source models stay in ignored work/. */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, weld, meshopt, textureCompress, simplifyPrimitive } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import { readFileSync, writeFileSync, statSync } from 'node:fs';

const sources = {
  cat: { task: 'cat-v1', textureSize: 2048, normalScale: .65 },
  espresso: { task: 'espresso-v2', textureSize: 1024, normalScale: .25 },
  ramen: { task: 'ramen-v1', textureSize: 1024, normalScale: .5 },
  stool: { task: 'stool-v1', textureSize: 1024, normalScale: .35 },
  plant: { textureSize: 512, normalScale: .6 },
  kettle: { textureSize: 512, normalScale: .4 },
};
const names = process.argv.slice(2);
if (!names.length || names.some(name => !sources[name])) {
  throw new Error('Specify supported assets: cat espresso ramen stool plant kettle');
}

await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready, MeshoptSimplifier.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.encoder': MeshoptEncoder,
  'meshopt.decoder': MeshoptDecoder,
});

for (const name of names) {
  const { task, textureSize, normalScale } = sources[name];
  const input = task ? `work/tripo/${task}.glb` : `work/${name}.glb`;
  const output = `public/models/diner-${name}.glb`;
  const document = await io.read(input);
  const root = document.getRoot();

  for (const material of root.listMaterials()) {
    material.setDoubleSided(false).setNormalScale(normalScale);
    if (name === 'cat') material.setMetallicFactor(0).setRoughnessFactor(1);
    if (name === 'espresso') material.setMetallicFactor(.55).setRoughnessFactor(1);
  }
  await document.transform(dedup(), weld(), prune());

  // Detail is reserved for close views. Both levels reuse the same materials.
  let roomTriangles = 0;
  for (const node of [...root.listNodes()]) {
    const high = node.getMesh();
    if (!high) continue;
    const low = document.createMesh(`${name} room detail`);
    for (const primitive of high.listPrimitives()) {
      const reduced = primitive.clone();
      simplifyPrimitive(reduced, { simplifier: MeshoptSimplifier, ratio: name === 'plant' ? .22 : .34, error: name === 'plant' ? .015 : .005, lockBorder: false });
      low.addPrimitive(reduced);
      roomTriangles += triangleCount(reduced);
    }
    node.setMesh(null).setExtras({ ...node.getExtras(), webLOD: true });
    node.addChild(document.createNode('Detailed view').setMesh(high));
    node.addChild(document.createNode('Room view').setMesh(low));
  }

  await document.transform(
    textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [textureSize, textureSize], quality: 88 }),
    meshopt({ encoder: MeshoptEncoder, level: 'high', quantizePosition: 14, quantizeTexcoord: 12 }),
  );
  const stats = {
    source: task ? 'Tripo image-to-3D v3.1' : 'Poly Haven CC0',
    reference: task ? `assets/references/${name}.png` : null,
    roomTriangles, triangles: 0, vertices: 0, draws: 0, textures: root.listTextures().length,
  };
  for (const mesh of root.listMeshes()) for (const primitive of mesh.listPrimitives()) {
    stats.triangles += triangleCount(primitive);
    stats.vertices += primitive.getAttribute('POSITION').getCount();
    stats.draws++;
  }
  const taskId = task ? JSON.parse(readFileSync(`work/tripo/${task}.json`)).task_id : undefined;
  for (const scene of root.listScenes()) scene.setExtras({ source: stats.source, asset: name, ...(taskId ? { taskId } : {}) });
  await io.write(output, document);
  stats.triangles -= roomTriangles;
  stats.draws /= 2;
  stats.bytes = statSync(output).size;
  stats.sourceBytes = statSync(input).size;
  writeFileSync(`public/models/diner-${name}.manifest.json`, JSON.stringify(stats, null, 2) + '\n');
  console.log(name, stats);
}

function triangleCount(primitive) {
  return (primitive.getIndices()?.getCount() ?? primitive.getAttribute('POSITION').getCount()) / 3;
}
