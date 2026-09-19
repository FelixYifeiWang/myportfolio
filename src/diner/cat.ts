import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { surfaceTexture } from './textures';
/** The sculpt is generated offline. Runtime work is one compact asset decode. */
export async function loadDinerCat() {
    const loader = new THREE.TextureLoader();
    const [{ scene: root }, coat, face, fur] = await Promise.all([
        new GLTFLoader().loadAsync('/models/diner-cat.glb'),
        loader.loadAsync('/models/cat-coat.webp'),
        loader.loadAsync('/models/cat-face.webp'),
        loader.loadAsync('/models/cat-fur.webp'),
    ]);
    const body = root.getObjectByName('CatBreathingBody') as THREE.Group;
    const head = root.getObjectByName('CatHead') as THREE.Group;
    if (!body || !head)
        throw new Error('The diner cat is missing its animation groups.');
    for (const texture of [coat, face, fur]) {
        texture.flipY = false;
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.anisotropy = 4;
    }
    coat.colorSpace = face.colorSpace = THREE.SRGBColorSpace;
    fur.repeat.set(5, 4);
    const grain = surfaceTexture();
    grain.repeat.set(18, 18);
    const materials = new Set<THREE.Material>();
    root.traverse(object => {
        if (!(object instanceof THREE.Mesh))
            return;
        object.castShadow = true;
        object.receiveShadow = true;
        const material = object.material as THREE.MeshStandardMaterial;
        if (materials.has(material))
            return;
        materials.add(material);
        if (material.name === 'White coat' || material.name === 'White face') {
            material.map = material.name === 'White coat' ? coat : face;
            material.vertexColors = false;
            material.bumpMap = fur;
            material.bumpScale = .0013;
        }
        if (material.name === 'Painted short fur') {
            material.bumpMap = fur;
            material.bumpScale = .0013;
        }
        if (material.name === 'Woven velvet') {
            material.bumpMap = grain;
            material.bumpScale = .002;
        }
    });
    return { root, body, head };
}
