import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** A separately batched interior roof; it never casts shadows onto the cutaway room. */
export function createSeatedCeiling(wood: THREE.Texture, softGlow: THREE.Texture) {
    const group = new THREE.Group();
    group.name = 'Seated timber ceiling';
    group.visible = false;
    const timber = new THREE.MeshStandardMaterial({ map: wood, color: '#9c8062', roughness: .91, emissive: '#38281d', emissiveIntensity: .18 });
    const beams = new THREE.MeshStandardMaterial({ map: wood, color: '#624530', roughness: .86, emissive: '#271b13', emissiveIntensity: .15 });
    const brass = new THREE.MeshStandardMaterial({ color: '#94734b', metalness: .58, roughness: .48 });
    const mountLight = new THREE.MeshBasicMaterial({ color: '#d3a16a', toneMapped: false });
    const bounce = new THREE.MeshBasicMaterial({ map: softGlow, color: '#e8ab67', opacity: .14, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    const materials = [timber, beams, brass, mountLight, bounce];
    const baseOpacities = materials.map(material => material.opacity);
    const pieces = new Map<THREE.Material, THREE.BufferGeometry[]>();
    function add(geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number) {
        geometry.translate(x, y, z);
        const bucket = pieces.get(material) ?? [];
        bucket.push(geometry);
        pieces.set(material, bucket);
    }
    const panel = new THREE.PlaneGeometry(10.2, 8.2).rotateX(Math.PI / 2);
    const uv = panel.getAttribute('uv');
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 3, uv.getY(i) * 2);
    add(panel, timber, 0, 5.35, 0);
    // Fine joints and three structural beams give the broad surface a readable scale.
    for (let x = -4.25; x <= 4.25; x += .85)
        add(new THREE.BoxGeometry(.012, .014, 8.16), beams, x, 5.338, 0);
    for (const z of [-2.65, -.15, 2.65])
        add(new THREE.BoxGeometry(10.2, .18, .16), beams, 0, 5.26, z);
    add(new THREE.BoxGeometry(10.2, .12, .12), beams, 0, 5.28, -4.04);
    add(new THREE.BoxGeometry(.12, .12, 8.2), beams, -5.04, 5.28, 0);
    for (const x of [-2.8, 0, 3.35]) {
        add(new THREE.CylinderGeometry(.11, .11, .04, 20), brass, x, 5.145, -.15);
        add(new THREE.RingGeometry(.112, .145, 24).rotateX(Math.PI / 2), mountLight, x, 5.123, -.15);
        // Baked-looking warmth reuses the existing soft texture instead of adding lights.
        add(new THREE.PlaneGeometry(1.4, 1.4).rotateX(Math.PI / 2), bounce, x, 5.332, -.15);
    }
    for (const [material, geometries] of pieces) {
        const geometry = mergeGeometries(geometries, false);
        geometries.forEach(piece => piece.dispose());
        if (!geometry) throw new Error('Could not combine the seated ceiling geometry.');
        geometry.computeBoundingSphere();
        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = 'Ceiling material batch';
        group.add(mesh);
    }
    // Keep the blend mode stable while fading to avoid shader work during camera moves.
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
