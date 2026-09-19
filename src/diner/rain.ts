import * as THREE from 'three';

export interface WindowRain {
    mesh: THREE.LineSegments;
    update: (delta: number) => void;
}

/** Wind-driven streaks occupy real space between the pane and the skyline. */
export function createWindowRain(): WindowRain {
    const count = 140;
    const positions = new Float32Array(count * 6);
    const colors = new Float32Array(count * 6);
    let seed = 1919;
    const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const drops = Array.from({ length: count }, () => {
        const depth = random();
        return { x: -5.08 - depth * .42, y: random() * 2.7, z: random() * 3.6,
            speed: 1.7 + random() * 1.7, length: .045 + random() * .13,
            wind: .12 + random() * .14, brightness: .30 + (1 - depth) * .5 };
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const material = new THREE.LineBasicMaterial({ color: '#a5bec7', vertexColors: true, transparent: true, opacity: .38, depthWrite: false });
    const mesh = new THREE.LineSegments(geometry, material);
    mesh.name = 'Rain beyond the window';
    for (const [i, drop] of drops.entries()) {
        // Softer tails and depth variation avoid a sheet of identical white dashes.
        colors.fill(drop.brightness, i * 6, i * 6 + 3);
        colors.fill(drop.brightness * .20, i * 6 + 3, i * 6 + 6);
    }
    function update(delta: number) {
        drops.forEach((drop, i) => {
            drop.y = ((drop.y - delta * drop.speed) % 2.7 + 2.7) % 2.7;
            drop.z = (drop.z + delta * drop.wind) % 3.6;
            const at = i * 6, y = 1.72 + drop.y, z = -2.5 + drop.z;
            positions[at] = positions[at + 3] = drop.x;
            positions[at + 1] = y;
            positions[at + 2] = z;
            positions[at + 4] = Math.min(4.42, y + drop.length);
            positions[at + 5] = Math.max(-2.5, z - drop.wind * drop.length / drop.speed);
        });
        geometry.attributes.position.needsUpdate = true;
    }
    update(0);
    // Fixed bounds cover every future streak, including after an orbit or wrap.
    geometry.boundingBox = new THREE.Box3(new THREE.Vector3(-5.51, 1.72, -2.5), new THREE.Vector3(-5.07, 4.42, 1.1));
    geometry.boundingSphere = geometry.boundingBox.getBoundingSphere(new THREE.Sphere());
    return { mesh, update };
}
