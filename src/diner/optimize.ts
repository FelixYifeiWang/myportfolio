import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
/** Bake static pieces into material batches, leaving interactive/animated subtrees intact. */
export function batchStaticMeshes(root: THREE.Group, excluded: THREE.Object3D[]) {
    const excludedSet = new Set(excluded);
    const batches = new Map<string, THREE.Mesh<THREE.BufferGeometry, THREE.Material>[]>();
    let before = 0;
    root.traverse(object => { if (object instanceof THREE.Mesh)
        before++; });
    root.updateWorldMatrix(true, true);
    const inverseRoot = root.matrixWorld.clone().invert();
    function collect(object: THREE.Object3D) {
        if (excludedSet.has(object) || object instanceof THREE.LOD || !object.visible)
            return;
        if (object instanceof THREE.Mesh && !(object instanceof THREE.SkinnedMesh) &&
            !Array.isArray(object.material) && !object.material.transparent &&
            !Object.keys(object.geometry.morphAttributes).length) {
            const key = `${object.material.uuid}:${object.castShadow}:${object.receiveShadow}:${object.renderOrder}`;
            const batch = batches.get(key) ?? [];
            batch.push(object);
            batches.set(key, batch);
        }
        object.children.forEach(collect);
    }
    collect(root);
    const retired = new Set<THREE.BufferGeometry>();
    for (const objects of batches.values()) {
        if (objects.length < 2)
            continue;
        const pieces = objects.map(object => {
            const geometry = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
            // Quantized attributes cannot store baked world coordinates beyond [-1, 1].
            // Expand before transforming, otherwise repeated GLB props wrap or disappear.
            for (const name of ['position', 'normal']) {
                const attribute = geometry.getAttribute(name);
                if (!attribute || attribute.array instanceof Float32Array) continue;
                const values = new Float32Array(attribute.count * attribute.itemSize);
                for (let i = 0; i < attribute.count; i++) {
                    values[i * 3] = attribute.getX(i);
                    values[i * 3 + 1] = attribute.getY(i);
                    values[i * 3 + 2] = attribute.getZ(i);
                }
                geometry.setAttribute(name, new THREE.BufferAttribute(values, attribute.itemSize));
            }
            return geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverseRoot, object.matrixWorld));
        });
        const merged = mergeGeometries(pieces, false);
        pieces.forEach(piece => piece.dispose());
        if (!merged)
            throw new Error('Could not combine compatible diner geometry.');
        const indexed = mergeVertices(merged);
        merged.dispose();
        const batch = new THREE.Mesh(indexed, objects[0].material);
        batch.castShadow = objects[0].castShadow;
        batch.receiveShadow = objects[0].receiveShadow;
        batch.renderOrder = objects[0].renderOrder;
        batch.name = 'Static room batch';
        indexed.computeBoundingSphere();
        root.add(batch);
        objects.forEach(object => { retired.add(object.geometry); object.removeFromParent(); });
    }
    // An interactive object may share a geometry with a static object.
    root.traverse(object => { if (object instanceof THREE.Mesh)
        retired.delete(object.geometry); });
    retired.forEach(geometry => geometry.dispose());
    let after = 0;
    root.traverse(object => { if (object instanceof THREE.Mesh)
        after++; });
    return { before, after };
}
