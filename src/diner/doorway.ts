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
    const low = new THREE.Color('#080e11'), high = new THREE.Color('#18252a');
    const warm = new THREE.Color('#282820');
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
    night.position.set(-11.3, 3, 2.65);
    maskDoorwayContent(night);
    return night;
}

/** Dim overhead porch light: directional modelling and a cached face shadow. */
export function createDoorwayLight() {
    const light = new THREE.SpotLight('#f3ddc0', 2.6, 7, .40, .9, 2);
    light.name = 'Porch downlight';
    light.position.set(-5.30, 3.8, 3.5);
    light.target.position.set(-6.3, 1.8, 2.6);
    light.castShadow = true;
    light.shadow.mapSize.set(512, 512);
    light.shadow.camera.near = .1;
    light.shadow.camera.far = 7;
    light.shadow.bias = -.0002;
    light.shadow.normalBias = .008;
    light.shadow.radius = 3;
    // Only rebuild when a new visitor arrives; the porch and visitor stay still.
    light.shadow.autoUpdate = false;
    light.shadow.needsUpdate = true;
    return light;
}

/** Solid porch return separates the entrance from the window's miniature scenery. */
export function createDoorwaySideWall(grain?: THREE.Texture) {
    const wall = new THREE.Group();
    wall.name = 'Window-side porch wall';
    const plaster = new THREE.MeshStandardMaterial({ color: '#151d1b', roughness: .94, bumpMap: grain ?? null, bumpScale: .022 });
    const base = new THREE.MeshStandardMaterial({ color: '#101613', roughness: .82 });
    const panel = new THREE.Mesh(new THREE.BoxGeometry(9, 5.6, .20), plaster);
    panel.position.set(-9.52, 2.8, 1.70);
    const skirting = new THREE.Mesh(new THREE.BoxGeometry(9, .35, .22), base);
    skirting.position.set(-9.52, .18, 1.70);
    wall.add(panel, skirting);
    maskDoorwayContent(wall);
    return wall;
}
