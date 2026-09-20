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
    // A broad visitor can peek beside the jamb, entirely outside the wall thickness.
    visitor.position.set((peekOffset ? -5.25 : -5.12) - bounds.max.x, .04, 3.43 + peekOffset - bounds.max.z);
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
    const light = new THREE.RectAreaLight('#f5d7ae', 2.2, 2.2, 2.8);
    light.name = 'Warm doorway bounce';
    light.position.set(-4.95, 3.2, 4.2);
    light.lookAt(-5.9, 1.65, 2.65);
    return light;
}
