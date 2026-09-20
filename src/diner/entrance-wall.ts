import * as THREE from 'three';

/** Left wall infill leaves the existing window and the new doorway genuinely open. */
export function createEntranceWall(plaster: THREE.Material, walnut: THREE.Material, darkwood: THREE.Material) {
    const group = new THREE.Group();
    group.name = 'Left wall with window and entrance openings';
    function box(w: number, h: number, d: number, material: THREE.Material, x: number, y: number, z: number) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
        mesh.position.set(x, y, z);
        mesh.castShadow = mesh.receiveShadow = true;
        group.add(mesh);
    }
    const doorMin = 1.79, doorMax = 3.51;
    for (const [min, max] of [[-4.1, doorMin], [doorMax, 4.1]]) {
        box(.2, 1.7, max - min, plaster, -5.12, .82, (max + min) / 2);
        box(.15, 1.7, max - min, walnut, -4.99, .83, (max + min) / 2);
    }
    box(.2, 1, 8.2, plaster, -5.12, 5, 0);
    box(.2, 2.8, 1.6, plaster, -5.12, 3.1, -3.35);
    for (const [min, max] of [[1.15, doorMin], [doorMax, 4.15]])
        box(.2, 2.8, max - min, plaster, -5.12, 3.1, (max + min) / 2);
    box(.2, .8, doorMax - doorMin, plaster, -5.12, 4.1, 2.65);
    for (let z = -3.8; z < 4; z += .25) {
        if (z > doorMin - .03 && z < doorMax + .03) continue;
        box(.045, 1.65, .04, darkwood, -4.89, .82, z);
    }
    return group;
}
