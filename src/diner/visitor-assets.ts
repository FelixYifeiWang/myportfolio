import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

export interface VisitorSpec {
    id: string;
    name: string;
    url: string;
    height: number;
    rotation: number;
    elevation?: number;
    peekOffset?: number;
}
export const visitors: readonly VisitorSpec[] = [
    { id: 'eye', name: 'Eye of Cthulhu', url: '/models/visitors/eye.glb', height: 1.10, rotation: Math.PI * .34, elevation: 1.35 },
    { id: 'link', name: 'Link', url: '/models/visitors/link.glb', height: 2.75, rotation: Math.PI * .37 },
    { id: 'pikachu', name: 'Pikachu', url: '/models/visitors/pikachu.glb', height: 1.4, rotation: Math.PI / 2 },
    { id: 'chamber', name: 'Chamber', url: '/models/visitors/chamber.glb', height: 2.8, rotation: -Math.PI * .13 },
    { id: 'arthas', name: 'Arthas', url: '/models/visitors/arthas.glb', height: 2.8, rotation: Math.PI * .37, peekOffset: .02 },
    { id: 'joker', name: 'Joker', url: '/models/visitors/joker.glb', height: 2.8, rotation: Math.PI * .37 },
    { id: 'azir', name: 'Azir', url: '/models/visitors/azir.glb', height: 2.6, rotation: Math.PI * .37, peekOffset: .15 },
    { id: 'ranni', name: 'Ranni', url: '/models/visitors/ranni.glb', height: 2.8, rotation: Math.PI * .37, peekOffset: .15 },
    { id: 'byleth', name: 'Byleth', url: '/models/visitors/byleth.glb', height: 2.8, rotation: Math.PI * .37 },
    { id: 'jackie', name: 'Jackie Welles', url: '/models/visitors/jackie.glb', height: 2.8, rotation: Math.PI * .37 },
    { id: 'kim', name: 'Kim Kitsuragi', url: '/models/visitors/kim.glb', height: 2.8, rotation: Math.PI * .37 },
    { id: 'astarion', name: 'Astarion', url: '/models/visitors/astarion.glb', height: 1.9, rotation: Math.PI * .37 },
    { id: 'wolf', name: 'Wolf', url: '/models/visitors/wolf.glb', height: 2.7, rotation: Math.PI * .37 },
    { id: 'esquie', name: 'Esquie', url: '/models/visitors/esquie.glb', height: 2.8, rotation: Math.PI * .37, peekOffset: .15 },
];

/** Preserve the artist's pose; fit the whole silhouette inside the entrance. */
export function prepareVisitor(model: THREE.Group, spec: VisitorSpec) {
    const placement = new THREE.Group();
    const orientation = new THREE.Group();
    placement.name = spec.name;
    placement.userData.peekOffset = spec.peekOffset ?? 0;
    placement.add(orientation);
    orientation.add(model);
    orientation.rotation.y = spec.rotation;
    placement.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(orientation, true);
    const size = bounds.getSize(new THREE.Vector3());
    if (!Number.isFinite(size.y) || size.y <= 0) throw new Error(`Visitor ${spec.id} has empty geometry.`);
    // A single height ceiling preserves human scale without stretching proportions.
    const scale = Math.min(spec.height, 2.8) / size.y;
    const fittedScale = Math.min(scale, 1.42 / size.z);
    orientation.scale.multiplyScalar(fittedScale);
    orientation.position.copy(new THREE.Vector3(-(bounds.min.x + bounds.max.x) / 2, -bounds.min.y, -(bounds.min.z + bounds.max.z) / 2).multiplyScalar(fittedScale));
    orientation.position.y += spec.elevation ?? 0;
    model.traverse(object => {
        if (!(object instanceof THREE.Mesh)) return;
        object.castShadow = object.receiveShadow = true;
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) {
            for (const value of Object.values(material)) if (value instanceof THREE.Texture) value.anisotropy = 4;
        }
    });
    return placement;
}
function disposeVisitor(model: THREE.Group) {
    model.removeFromParent();
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
    model.traverse(object => {
        if (!(object instanceof THREE.Mesh)) return;
        geometries.add(object.geometry);
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
        if (object instanceof THREE.SkinnedMesh) object.skeleton.dispose();
    });
    for (const material of materials) {
        for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
        material.dispose();
    }
    geometries.forEach(geometry => geometry.dispose());
    textures.forEach(texture => texture.dispose());
}

/** On-demand downloads, deduplicated in flight, with a two-model GPU cache. */
export class VisitorLibrary {
    private assets = new Map<string, THREE.Group>();
    private pending = new Map<string, Promise<THREE.Group>>();
    private disposed = false;
    private specs: readonly VisitorSpec[];
    private download: (url: string) => Promise<THREE.Group>;
    constructor(specs: readonly VisitorSpec[] = visitors, download?: (url: string) => Promise<THREE.Group>) {
        this.specs = specs;
        const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
        this.download = download ?? (async url => (await loader.loadAsync(url)).scene);
    }
    async load(id: string): Promise<THREE.Group> {
        if (this.disposed) throw new Error('Visitor library is disposed.');
        const cached = this.assets.get(id);
        if (cached) { this.assets.delete(id); this.assets.set(id, cached); return cached; }
        const pending = this.pending.get(id);
        if (pending) return pending;
        const spec = this.specs.find(visitor => visitor.id === id);
        if (!spec) throw new Error(`Unknown visitor: ${id}`);
        const request = this.download(spec.url).then(model => {
            if (this.disposed) { disposeVisitor(model); throw new Error('Visitor library is disposed.'); }
            let asset: THREE.Group;
            try { asset = prepareVisitor(model, spec); }
            catch (error) { disposeVisitor(model); throw error; }
            this.assets.set(id, asset);
            for (const [key, old] of this.assets) {
                if (this.assets.size <= 2) break;
                if (key === id || old.parent) continue;
                this.assets.delete(key);
                disposeVisitor(old);
            }
            return asset;
        }).finally(() => this.pending.delete(id));
        this.pending.set(id, request);
        return request;
    }
    dispose() {
        this.disposed = true;
        this.assets.forEach(disposeVisitor);
        this.assets.clear();
    }
}
