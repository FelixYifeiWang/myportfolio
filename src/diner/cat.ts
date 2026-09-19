import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { surfaceTexture } from './textures';
import { configureAsset } from './assets';

export interface DinerCat {
    root: THREE.Group;
    body: THREE.Group;
}

/** The finished textured sculpture is generated and compressed offline. */
export async function loadDinerCat(): Promise<DinerCat> {
    const { scene: model } = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync('/models/diner-cat.glb');
    const root = new THREE.Group();
    root.name = 'DinerCat';
    const body = new THREE.Group();
    body.name = 'CatBreathingBody';
    root.add(body);
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const scale = 1.27 / Math.max(size.x, size.z);
    model.scale.multiplyScalar(scale);
    model.position.set(-center.x * scale, .065 - bounds.min.y * scale, -center.z * scale);
    body.add(model);
    body.rotation.y = -.65;
    configureAsset(model);
    const grain = surfaceTexture();
    grain.repeat.set(20, 20);
    const velvet = new THREE.MeshStandardMaterial({ color: '#765d50', roughness: .95, bumpMap: grain, bumpScale: .0015 });
    const cushion = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 20), velvet);
    cushion.name = 'Cushion';
    cushion.scale.set(.74, .085, .58);
    cushion.position.y = -.012;
    cushion.castShadow = cushion.receiveShadow = true;
    root.add(cushion);
    const points = Array.from({length: 65}, (_, i) => {
        const angle = i / 64 * Math.PI * 2;
        return new THREE.Vector3(Math.cos(angle) * .732, -.015, Math.sin(angle) * .574);
    });
    const piping = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 64, .004, 4, false), velvet);
    root.add(piping);
    return { root, body };
}
