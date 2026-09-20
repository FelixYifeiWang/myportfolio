import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** The open side of the diorama becomes a finished wall when viewed from a stool. */
export function createSeatedSideWall(wood: THREE.Texture, grain: THREE.Texture, softGlow: THREE.Texture) {
    const group = new THREE.Group();
    group.name = 'Seated shoji wall';
    group.visible = false;
    const plaster = new THREE.MeshStandardMaterial({ color: '#bba582', roughness: 1, bumpMap: grain, bumpScale: .025 });
    const green = new THREE.MeshStandardMaterial({ color: '#30483c', roughness: .82 });
    const timber = new THREE.MeshStandardMaterial({ map: wood, color: '#71553b', roughness: .84 });
    const brass = new THREE.MeshStandardMaterial({ color: '#a58755', metalness: .55, roughness: .48 });
    const paper = new THREE.MeshStandardMaterial({ color: '#bcb397', roughness: 1, bumpMap: grain, bumpScale: .014, emissive: '#a58a57', emissiveIntensity: .15 });
    const opal = new THREE.MeshBasicMaterial({ color: '#f0d6a0', toneMapped: false });
    const glow = new THREE.MeshBasicMaterial({ map: softGlow, color: '#eeb366', transparent: true, opacity: .19, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    const materials = [plaster, green, timber, brass, paper, opal, glow];
    const baseOpacities = materials.map(material => material.opacity);
    const pieces = new Map<THREE.Material, THREE.BufferGeometry[]>();
    function add(geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number) {
        geometry.translate(x, y, z);
        const bucket = pieces.get(material) ?? [];
        bucket.push(geometry);
        pieces.set(material, bucket);
    }
    function box(depth: number, height: number, width: number, material: THREE.Material, x: number, y: number, z: number) {
        add(new THREE.BoxGeometry(depth, height, width), material, x, y, z);
    }
    // A single inward-facing surface avoids an exterior shell or silhouette in the overview.
    add(new THREE.PlaneGeometry(8.2, 5.35).rotateY(-Math.PI / 2), plaster, 5.04, 2.675, 0);
    box(.035, 1.7, 8.16, green, 5.008, .85, 0);
    for (const y of [.12, 1.7, 5.27]) box(.10, .12, 8.2, timber, 4.97, y, 0);
    for (let z = -3.9; z < 4; z += .65) box(.065, 1.47, .035, timber, 4.965, .90, z);
    for (const z of [-4.04, 4.04]) box(.12, 5.35, .12, timber, 4.96, 2.675, z);

    // Two sliding paper screens, recessed behind fine lattice and a shallow sill.
    const center = .25, bottom = 1.94, top = 4.46;
    for (const z of [center - .95, center + .95]) {
        box(.025, top - bottom, 1.83, paper, 5.005, (top + bottom) / 2, z);
        for (const edge of [-.93, .93]) box(.085, top - bottom + .12, .065, timber, 4.94, (top + bottom) / 2, z + edge);
        for (const offset of [-.31, .31]) box(.04, top - bottom, .026, timber, 4.956, (top + bottom) / 2, z + offset);
        for (const y of [2.57, 3.2, 3.83]) box(.04, .026, 1.82, timber, 4.955, y, z);
        box(.018, .15, .035, brass, 4.889, 2.84, z + (z < center ? .82 : -.82));
    }
    for (const y of [bottom, top]) box(.12, .075, 3.91, timber, 4.93, y, center);
    box(.25, .075, 4.04, timber, 4.87, bottom - .055, center);

    // Opal wall lamps reuse the room's glow texture; no new shadow maps or lights.
    for (const z of [-2.85, 3.13]) {
        add(new THREE.CylinderGeometry(.17, .17, .035, 24).rotateZ(Math.PI / 2), brass, 4.998, 3.48, z);
        add(new THREE.SphereGeometry(1, 20, 12).scale(.12, .22, .16), opal, 4.79, 3.48, z);
        for (const y of [3.27, 3.69]) box(.22, .035, .29, brass, 4.87, y, z);
        add(new THREE.PlaneGeometry(1.5, 1.9).rotateY(-Math.PI / 2), glow, 5.014, 3.48, z);
    }
    for (const [material, geometries] of pieces) {
        const geometry = mergeGeometries(geometries, false);
        geometries.forEach(piece => piece.dispose());
        if (!geometry) throw new Error('Could not combine the seated side wall geometry.');
        geometry.computeBoundingSphere();
        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = 'Side wall material batch';
        group.add(mesh);
    }
    materials.forEach(material => { material.transparent = true; material.opacity = 0; });
    let opacity = 0;
    return {
        group,
        update(delta: number, visible: boolean, immediate = false) {
            const target = visible ? 1 : 0;
            if (opacity === target) return false;
            opacity = immediate ? target : THREE.MathUtils.lerp(opacity, target, 1 - Math.exp(-12 * delta));
            if (Math.abs(opacity - target) < .005) opacity = target;
            group.visible = opacity > 0;
            materials.forEach((material, index) => { material.opacity = opacity * baseOpacities[index]; });
            return true;
        },
    };
}
