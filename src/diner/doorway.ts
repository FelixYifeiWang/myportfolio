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
