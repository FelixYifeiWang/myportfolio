import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { roomAssetUrl, woodTextureUrl } from './asset-urls';

export interface DinerProps {
    plant: THREE.Group;
    kettle: THREE.Group;
    espresso: THREE.Group;
    ramen: THREE.Group;
    stool: THREE.Group;
    wood: { color: THREE.Texture; normal: THREE.Texture; roughness: THREE.Texture };
}

export async function loadDinerProps(touch = false): Promise<DinerProps> {
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const names = ['plant', 'kettle', 'espresso', 'ramen', 'stool'] as const;
    const textures = new THREE.TextureLoader();
    const [loaded, wood] = await Promise.all([
        Promise.all(names.map(name => loader.loadAsync(roomAssetUrl(name, touch)))),
        Promise.all(['color', 'normal', 'roughness'].map(name => textures.loadAsync(woodTextureUrl(name, touch)))),
    ]);
    const props = {} as DinerProps;
    loaded.forEach(({scene}, index) => {
        props[names[index]] = scene;
        configureAsset(scene);
    });
    wood[0].colorSpace = THREE.SRGBColorSpace;
    for (const texture of wood) { texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.anisotropy = 4; }
    props.wood = { color: wood[0], normal: wood[1], roughness: wood[2] };
    return props;
}

/** Fit to a real shelf footprint, with the model's lowest point resting on it. */
export function placeProp(source: THREE.Group, height: number, position: THREE.Vector3, rotation: number, parent: THREE.Object3D) {
    const model = source.clone(true);
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const scale = height / (box.max.y - box.min.y);
    model.scale.multiplyScalar(scale);
    model.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
    const placement = new THREE.Group();
    placement.add(model);
    placement.position.copy(position);
    placement.rotation.y = rotation;
    parent.add(placement);
    return placement;
}

/** Both mesh levels share textures; only one level is drawn at a time. */
export function configureAsset(root: THREE.Group) {
    const parents: THREE.Object3D[] = [];
    root.traverse(object => {
        if (object.userData.webLOD) parents.push(object);
        if (!(object instanceof THREE.Mesh)) return;
        object.castShadow = object.receiveShadow = true;
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) {
            for (const value of Object.values(material)) if (value instanceof THREE.Texture) value.anisotropy = 4;
        }
    });
    for (const parent of parents) {
        const [high, low] = [...parent.children];
        if (!high || !low) throw new Error('A diner model is missing a detail level.');
        const lod = new THREE.LOD();
        lod.name = 'Adaptive model detail';
        lod.addLevel(high, 0);
        lod.addLevel(low, 7, .12);
        low.visible = false;
        parent.add(lod);
    }
}
