import * as THREE from 'three';

/** Keep animation roots live while avoiding redundant local matrix composition. */
export function freezeStaticTransforms(root: THREE.Object3D, animated: THREE.Object3D[] = []) {
    const dynamic = new Set(animated);
    root.traverse(object => {
        object.updateMatrix();
        object.matrixAutoUpdate = dynamic.has(object);
    });
}

/** LOD.raycast plus recursive raycasting visits both hidden and visible levels. */
export function pickVisibleObject(raycaster: THREE.Raycaster, roots: THREE.Object3D[]) {
    const hits: THREE.Intersection[] = [];
    for (const root of roots) root.traverseVisible(object => {
        if (!(object instanceof THREE.Mesh)) return;
        if (!object.geometry.boundingBox) object.geometry.computeBoundingBox();
        raycaster.intersectObject(object, false, hits);
    });
    let closest: THREE.Intersection | undefined;
    for (const hit of hits) if (!closest || hit.distance < closest.distance) closest = hit;
    return closest?.object.userData.action as string | undefined;
}

/** Prepare the same depth variants that the spotlight shadow pass will use. */
export function createShadowWarmup(root: THREE.Object3D) {
    const warmup = new THREE.Group();
    root.traverse(object => {
        if (!(object instanceof THREE.Mesh) || !object.castShadow || Array.isArray(object.material)) return;
        if (object.customDepthMaterial) {
            warmup.add(new THREE.Mesh(object.geometry, object.customDepthMaterial));
            return;
        }
        const source = object.material as THREE.MeshStandardMaterial;
        const depth = new THREE.MeshDepthMaterial({
            depthPacking: THREE.RGBADepthPacking,
            map: source.map ?? null, alphaMap: source.alphaMap ?? null, alphaTest: source.alphaToCoverage ? .5 : source.alphaTest,
            side: source.shadowSide ?? (source.side === THREE.DoubleSide ? THREE.DoubleSide : source.side === THREE.FrontSide ? THREE.BackSide : THREE.FrontSide),
            displacementMap: source.displacementMap ?? null, displacementScale: source.displacementScale ?? 1, displacementBias: source.displacementBias ?? 0,
        });
        object.customDepthMaterial = depth;
        warmup.add(new THREE.Mesh(object.geometry, depth));
    });
    return warmup;
}

/** Spread texture uploads across frames before revealing a newly loaded visitor. */
export async function warmTextures(renderer: THREE.WebGLRenderer, root: THREE.Object3D, active: () => boolean) {
    const textures = new Set<THREE.Texture>();
    root.traverse(object => {
        if (!(object instanceof THREE.Mesh)) return;
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
            for (const value of Object.values(material)) if (value instanceof THREE.Texture && value.image) textures.add(value);
        }
    });
    for (const texture of textures) {
        if (!active()) return;
        renderer.initTexture(texture);
        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    }
}
