import * as THREE from 'three';

/** Draw the outside only through the real opening, never outside the cutaway room. */
export function createDoorwayMask() {
    const material = new THREE.MeshBasicMaterial({
        colorWrite: false, depthWrite: false, side: THREE.DoubleSide,
        stencilWrite: true, stencilRef: 1, stencilFunc: THREE.AlwaysStencilFunc,
        stencilZPass: THREE.ReplaceStencilOp,
    });
    const mask = new THREE.Mesh(new THREE.PlaneGeometry(1.70, 3.66), material);
    mask.name = 'Doorway aperture';
    mask.rotation.y = Math.PI / 2;
    mask.position.set(-5.025, 1.85, 2.65);
    mask.renderOrder = 10;
    return mask;
}

export function maskDoorwayContent(content: THREE.Object3D) {
    content.traverse(object => {
        if (!(object instanceof THREE.Mesh)) return;
        object.renderOrder = 11;
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
            material.stencilWrite = true;
            material.stencilRef = 1;
            material.stencilFunc = THREE.EqualStencilFunc;
            material.stencilWriteMask = 0;
        }
    });
}

/** Align the nearest surface, including accessories, safely behind the closed leaf. */
export function placeDoorwayVisitor(visitor: THREE.Group) {
    visitor.position.set(0, 0, 0);
    const bounds = new THREE.Box3().setFromObject(visitor, true);
    const peekOffset = visitor.userData.peekOffset ?? 0;
    // Keep a small porch gap; lateral framing accommodates each source pose.
    visitor.position.set(-5.40 - bounds.max.x, .04, 3.25 + peekOffset - bounds.max.z);
    maskDoorwayContent(visitor);
}

/** A quiet night gradient, clipped to the opening. No skyline or texture download. */
export function createDoorwayNight() {
    const geometry = new THREE.PlaneGeometry(20, 12, 20, 12);
    const positions = geometry.getAttribute('position');
    const colors = new Float32Array(positions.count * 3);
    const low = new THREE.Color('#111e23'), high = new THREE.Color('#344b53');
    const warm = new THREE.Color('#594b37');
    for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i), y = positions.getY(i);
        const haze = Math.exp(-(x * x / 24 + (y - 1) ** 2 / 14));
        const lamp = Math.exp(-((x + 2) ** 2 / 3 + (y - 3) ** 2 / 5));
        const color = low.clone().lerp(high, haze * .65).lerp(warm, lamp * .30);
        color.toArray(colors, i * 3);
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const night = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ vertexColors: true }));
    night.name = 'Quiet night beyond the door';
    night.rotation.y = Math.PI / 2;
    night.position.set(-8.3, 3, 2.65);
    maskDoorwayContent(night);
    return night;
}

/** Broad porch bounce aimed outwards: readable faces without another shadow map. */
export function createDoorwayLight() {
    const light = new THREE.RectAreaLight('#ffe8ca', 2.7, 2.6, 3.2);
    light.name = 'Warm doorway bounce';
    light.position.set(-5.24, 2.55, 3.15);
    light.lookAt(-6.5, 2.55, 3.15);
    return light;
}

/** Solid porch return separates the entrance from the window's miniature scenery. */
export function createDoorwaySideWall(grain?: THREE.Texture) {
    const wall = new THREE.Group();
    wall.name = 'Window-side porch wall';
    const plaster = new THREE.MeshStandardMaterial({ color: '#58605a', roughness: .94, bumpMap: grain, bumpScale: .022 });
    const base = new THREE.MeshStandardMaterial({ color: '#303b37', roughness: .82 });
    const panel = new THREE.Mesh(new THREE.BoxGeometry(3.6, 4.8, .20), plaster);
    panel.position.set(-6.84, 2.4, 1.70);
    const skirting = new THREE.Mesh(new THREE.BoxGeometry(3.6, .35, .22), base);
    skirting.position.set(-6.84, .18, 1.70);
    wall.add(panel, skirting);
    maskDoorwayContent(wall);
    return wall;
}
