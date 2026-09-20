import fs from 'node:fs/promises';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { metalRough, dedup, prune, join, weld, textureCompress, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';

const [id, source, destination] = process.argv.slice(2);
if (!id || !/^[a-z-]+$/.test(id) || !source || !destination) throw new Error('Usage: node scripts/prepare-visitor.mjs <id> <source.glb> <output.glb>');
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
if ((id === 'mime-raw' || id === 'jar-raw') && gltf.animations.length) {
    const pose = new THREE.AnimationMixer(gltf.scene);
    pose.clipAction(gltf.animations[0]).play();
    pose.setTime(id === 'mime-raw' ? 1.0 : .1);
    gltf.scene.updateMatrixWorld(true);
}
if (id === 'link') {
    gltf.scene.traverse(object => {
        if (!/^Arm_1_[LR]_\d+$/.test(object.name) || !object.parent) return;
        const turn = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), object.name.includes('_L_') ? -1.20 : 1.20);
        const world = object.getWorldQuaternion(new THREE.Quaternion());
        object.quaternion.copy(object.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(turn.multiply(world)));
        gltf.scene.updateMatrixWorld(true);
    });
}
if (id === 'joker' || id === 'kim' || id === 'jinx') {
    const shoulders = id === 'jinx' ? [['upperarm_l_26', -.58], ['upperarm_r_55', .58]] : id === 'joker' ? [['bone_18_019', -.55], ['bone_19_020', .55]] : [['mixamorigLeftArm_08', -.36], ['mixamorigRightArm_020', .36]];
    for (const [name, angle] of shoulders) {
        const bone = gltf.scene.getObjectByName(name);
        if (!bone?.parent) throw new Error(`Missing visitor shoulder: ${name}`);
        const turn = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), angle);
        const world = bone.getWorldQuaternion(new THREE.Quaternion());
        bone.quaternion.copy(bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(turn.multiply(world)));
        gltf.scene.updateMatrixWorld(true);
    }
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
    // Chamber includes both a static character and a second rigged copy.
    if (id === 'chamber' && ref.meshes >= 5) return;
    // Keep Azir and his staff; omit the separate display sun disc.
    if (id === 'azir' && ref.meshes === 0) return;
    // His outstretched hammer pushes the face too far behind the door leaf.
    if (id === 'arthas' && ref.meshes === 1) return;
    const mesh = originalMeshes[ref.meshes];
    const sourcePrimitive = mesh.listPrimitives()[ref.primitives];
    // Remove the display plinth; the visitor stands directly on the doorstep.
    if (id === 'astarion' && sourcePrimitive.getMaterial()?.getName() === 'Base.002') return;
    const primitive = sourcePrimitive.clone();
    // The exporter made the cornea opaque, covering the entire iris.
    if (id === 'eye' && primitive.getMaterial()?.getName() === 'boss_eye_cthulhu_glass_v2') return;
    const geometry = object.geometry;
    if (!geometry.getAttribute('normal')) geometry.computeVertexNormals();
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
    // GLTFLoader splits multi-material meshes into one object per primitive.
    // Bake only that primitive, otherwise every material duplicates the full mesh.
    const bakedMesh = document.createMesh(object.name).addPrimitive(primitive);
    baked.push(document.createNode(object.name).setMesh(bakedMesh));
});
for (const scene of root.listScenes()) if (scene !== bakedScene) scene.dispose();
for (const node of root.listNodes()) if (!baked.includes(node)) { node.setMesh(null); node.setSkin(null); }
for (const node of baked) bakedScene.addChild(node);
root.setDefaultScene(bakedScene);
for (const animation of root.listAnimations()) animation.dispose();
// Retain float positions: this source's closely layered clothing flickers when quantized.
await document.transform(prune(), dedup(), weld(), join(), textureCompress({ encoder: sharp, targetFormat: 'webp', resize: ['chamber', 'ranni', 'esquie', 'wolf', 'mime'].includes(id) ? [768, 768] : [1024, 1024], quality: ['chamber', 'ranni', 'esquie', 'wolf', 'mime'].includes(id) ? 82 : 88 }));
if (['ranni', 'jackie', 'esquie', 'shadowheart', 'wolf', 'astarion', 'jinx', 'mime', 'murloc', 'jar'].includes(id)) await document.transform(meshopt({ encoder: MeshoptEncoder, level: 'high', quantizePosition: 16, quantizeNormal: 10, quantizeTexcoord: 14 }));
await io.write(destination, document);
console.log(`${id}: ${(await fs.stat(destination)).size} bytes; ${root.listMeshes().reduce((n,m) => n + m.listPrimitives().length, 0)} material batches; ${root.listSkins().length} skins`);
