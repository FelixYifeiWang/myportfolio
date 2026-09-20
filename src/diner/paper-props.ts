import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/** A lightly curled sheet, with its central area resting on the supporting surface. */
export function paperGeometry(width: number, depth: number, curl = .012) {
    const geometry = new THREE.PlaneGeometry(width, depth, 16, 20);
    geometry.rotateX(-Math.PI / 2);
    const positions = geometry.getAttribute('position');
    for (let i = 0; i < positions.count; i++) {
        const u = positions.getX(i) / width + .5;
        const v = positions.getZ(i) / depth + .5;
        const corner = Math.pow(u, 7) * Math.pow(v, 6);
        positions.setY(i, curl * corner + .0015 * Math.sin(u * Math.PI) * Math.sin(v * Math.PI));
    }
    geometry.computeVertexNormals();
    return geometry;
}

/** A folded linen square with a soft hem and two shallow, irregular creases. */
export function linenGeometry(width: number, depth: number) {
    const geometry = new THREE.PlaneGeometry(width, depth, 16, 16);
    geometry.rotateX(-Math.PI / 2);
    const positions = geometry.getAttribute('position');
    for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i), z = positions.getZ(i);
        const edge = Math.max(Math.abs(x) / (width / 2), Math.abs(z) / (depth / 2));
        const crease = Math.exp(-Math.pow((x + z * .30 - .16) / .04, 2));
        const corner = Math.pow(Math.max(0, x / width + .5), 8) * Math.pow(Math.max(0, .5 - z / depth), 7);
        positions.setY(i, .004 + .005 * Math.pow(edge, 10) + .006 * crease + .012 * corner);
    }
    geometry.computeVertexNormals();
    return geometry;
}

export function createNotebook(coverTexture: THREE.Texture, grain: THREE.Texture) {
    const group = new THREE.Group();
    group.name = 'Bound cloth notebook';
    const cover = new THREE.MeshStandardMaterial({ color: '#314944', roughness: .85, bumpMap: grain, bumpScale: .0015 });
    const pages = new THREE.MeshStandardMaterial({ color: '#d5c9ac', roughness: .97 });
    const seams = new THREE.MeshStandardMaterial({ color: '#b9ac92', roughness: 1 });
    const elastic = new THREE.MeshStandardMaterial({ color: '#ac9060', roughness: .95 });
    function box(width: number, height: number, depth: number, material: THREE.Material, x: number, y: number, z: number, radius = .008) {
        const object = new THREE.Mesh(new RoundedBoxGeometry(width, height, depth, 2, radius), material);
        object.position.set(x, y, z);
        object.castShadow = object.receiveShadow = true;
        group.add(object);
        return object;
    }
    box(.76, .014, 1.02, cover, 0, -.020, 0);
    box(.716, .046, .968, pages, .006, .010, 0, .004);
    for (let i = 0; i < 4; i++) {
        box(.002, .0012, .95, seams, .365, -.006 + i * .010, .002, 0);
        box(.694, .0012, .002, seams, .012, -.006 + i * .010, .485, 0);
    }
    box(.76, .014, 1.02, cover, 0, .042, 0);
    box(.035, .083, 1.02, cover, -.365, .007, 0, .012);
    const coverFace = new THREE.Mesh(paperGeometry(.733, .996, .001), new THREE.MeshStandardMaterial({ map: coverTexture, roughness: .86, bumpMap: grain, bumpScale: .001 }));
    coverFace.position.y = .0492;
    coverFace.receiveShadow = true;
    group.add(coverFace);
    box(.019, .003, 1.01, elastic, .258, .055, 0, .001);
    for (const z of [-.51, .51]) box(.019, .08, .004, elastic, .258, .014, z, .001);
    // A short fabric bookmark peeks out under the page block.
    box(.027, .0015, .11, elastic, -.18, -.011, .515, .0005);
    return group;
}
