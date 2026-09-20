import fs from 'node:fs/promises';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { metalRough, dedup, prune, join, weld, textureCompress } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';

const [id, source, destination] = process.argv.slice(2);
if (!['link', 'pikachu', 'eye'].includes(id) || !source || !destination) throw new Error('Usage: node scripts/prepare-visitor.mjs <link|pikachu|eye> <source.glb> <output.glb>');
await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const document = await io.read(source);
await document.transform(metalRough());
// Three's parser is used only for pose/skinning math. Textures stay in the
// original document, avoiding image decoding or a browser during conversion.
const bytes = Buffer.from(await io.writeBinary(document));
const jsonLength = bytes.readUInt32LE(12);
const json = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString());
json.images = []; json.textures = []; json.materials = json.materials.map(() => ({}));
delete json.extensionsUsed; delete json.extensionsRequired;
const encoded = Buffer.from(JSON.stringify(json));
const chunk = Buffer.alloc(Math.ceil(encoded.length / 4) * 4, 32); encoded.copy(chunk);
const temporary = Buffer.alloc(20 + chunk.length + bytes.length - 20 - jsonLength);
bytes.copy(temporary, 0, 0, 12); temporary.writeUInt32LE(temporary.length, 8);
temporary.writeUInt32LE(chunk.length, 12); temporary.writeUInt32LE(0x4e4f534a, 16);
chunk.copy(temporary, 20); bytes.copy(temporary, 20 + chunk.length, 20 + jsonLength);
const gltf = await new GLTFLoader().parseAsync(temporary.buffer.slice(temporary.byteOffset, temporary.byteOffset + temporary.byteLength), '');
gltf.scene.updateMatrixWorld(true);
if (id === 'link') {
    gltf.scene.traverse(object => {
        if (!/^Arm_1_[LR]_\d+$/.test(object.name) || !object.parent) return;
        const turn = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), object.name.includes('_L_') ? -1.20 : 1.20);
        const world = object.getWorldQuaternion(new THREE.Quaternion());
        object.quaternion.copy(object.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(turn.multiply(world)));
        gltf.scene.updateMatrixWorld(true);
    });
}
const root = document.getRoot();
const originalMeshes = root.listMeshes();
const bakedScene = document.createScene('Doorway visitor');
const buffer = root.listBuffers()[0];
const position = new THREE.Vector3(), normal = new THREE.Vector3();
const skinMatrix = new THREE.Matrix4(), boneMatrix = new THREE.Matrix4();
const skinIndices = new THREE.Vector4(), skinWeights = new THREE.Vector4();
const baked = [];
gltf.scene.traverse(object => {
    if (!object.isMesh) return;
    const ref = gltf.parser.associations.get(object);
    // The source includes a spare sword and shield floating beside the hands.
    // Keep the carried gear on Link's back; omit those unattached duplicates.
    if (id === 'link' && ref.meshes >= 38) return;
    const mesh = originalMeshes[ref.meshes];
    const primitive = mesh.listPrimitives()[ref.primitives];
    // The exporter made the cornea opaque, covering the entire iris.
    if (id === 'eye' && primitive.getMaterial()?.getName() === 'boss_eye_cthulhu_glass_v2') return;
    const geometry = object.geometry;
    const count = geometry.getAttribute('position').count;
    const positions = new Float32Array(count * 3), normals = new Float32Array(count * 3);
    if (object.isSkinnedMesh) object.skeleton.update();
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(object.matrixWorld);
    for (let index = 0; index < count; index++) {
        object.getVertexPosition(index, position).applyMatrix4(object.matrixWorld).toArray(positions, index * 3);
        normal.fromBufferAttribute(geometry.getAttribute('normal'), index);
        if (object.isSkinnedMesh) {
            skinIndices.fromBufferAttribute(geometry.getAttribute('skinIndex'), index);
            skinWeights.fromBufferAttribute(geometry.getAttribute('skinWeight'), index);
            skinMatrix.elements.fill(0);
            for (let joint = 0; joint < 4; joint++) {
                boneMatrix.fromArray(object.skeleton.boneMatrices, skinIndices.getComponent(joint) * 16);
                const weight = skinWeights.getComponent(joint);
                for (let n = 0; n < 16; n++) skinMatrix.elements[n] += boneMatrix.elements[n] * weight;
            }
            skinMatrix.premultiply(object.bindMatrixInverse).multiply(object.bindMatrix);
            normal.transformDirection(skinMatrix);
        }
        normal.applyNormalMatrix(normalMatrix).toArray(normals, index * 3);
    }
    primitive.setAttribute('POSITION', document.createAccessor().setType('VEC3').setArray(positions).setBuffer(buffer));
    primitive.setAttribute('NORMAL', document.createAccessor().setType('VEC3').setArray(normals).setBuffer(buffer));
    for (const semantic of ['JOINTS_0', 'WEIGHTS_0', 'TANGENT']) primitive.setAttribute(semantic, null);
    baked.push(document.createNode(object.name).setMesh(mesh));
});
for (const scene of root.listScenes()) if (scene !== bakedScene) scene.dispose();
for (const node of root.listNodes()) if (!baked.includes(node)) { node.setMesh(null); node.setSkin(null); }
for (const node of baked) bakedScene.addChild(node);
root.setDefaultScene(bakedScene);
for (const animation of root.listAnimations()) animation.dispose();
// Retain float positions: this source's closely layered clothing flickers when quantized.
await document.transform(prune(), dedup(), weld(), join(), textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024], quality: 88 }));
await io.write(destination, document);
console.log(`${id}: ${(await fs.stat(destination)).size} bytes; ${root.listMeshes().reduce((n,m) => n + m.listPrimitives().length, 0)} material batches; ${root.listSkins().length} skins`);
