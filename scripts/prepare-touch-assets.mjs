/** Smaller texture delivery for phones; retain both authored geometry levels. */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { textureCompress, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';
import { mkdirSync, statSync } from 'node:fs';
import { roomAssetNames } from '../src/diner/asset-urls.ts';

await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder,
});
mkdirSync('public/models/touch', { recursive: true });
mkdirSync('public/textures/touch', { recursive: true });
for (const name of roomAssetNames) {
  const input = `public/models/diner-${name}.glb`;
  const output = `public/models/touch/diner-${name}.glb`;
  const document = await io.read(input);
  const size = name === 'cat' ? 1024 : name === 'plant' || name === 'kettle' ? 256 : 512;
  await document.transform(
    textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [size, size], quality: 85 }),
    meshopt({ encoder: MeshoptEncoder, level: 'high', quantizePosition: 14, quantizeTexcoord: 12 }),
  );
  await io.write(output, document);
  console.log(name, statSync(input).size, '→', statSync(output).size);
}
for (const name of ['color', 'normal', 'roughness']) {
  await sharp(`public/textures/walnut-${name}.webp`).resize(512, 512).webp({ quality: 85 })
    .toFile(`public/textures/touch/walnut-${name}.webp`);
}
