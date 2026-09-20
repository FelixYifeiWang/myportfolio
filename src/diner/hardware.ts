import * as THREE from 'three';

function mesh(geometry: THREE.BufferGeometry, material: THREE.Material, parent: THREE.Group) {
    const object = new THREE.Mesh(geometry, material);
    object.castShadow = object.receiveShadow = true;
    parent.add(object);
    return object;
}

/** A shelf support whose top arm meets the underside and whose back meets the wall. */
export function createShelfBracket(material: THREE.Material) {
    const group = new THREE.Group();
    group.name = 'Shelf support';
    const upright = mesh(new THREE.BoxGeometry(.04, .32, .04), material, group);
    upright.position.set(0, -.145, .008);
    const arm = mesh(new THREE.BoxGeometry(.04, .034, .54), material, group);
    arm.position.set(0, -.017, .26);
    const brace = new THREE.LineCurve3(new THREE.Vector3(0, -.28, .027), new THREE.Vector3(0, -.028, .49));
    mesh(new THREE.TubeGeometry(brace, 1, .012, 6, false), material, group);
    return group;
}

/** Straight central rail, rounded end returns, and mounts that meet the same rail axis. */
export function createFootRail(material: THREE.Material) {
    const group = new THREE.Group();
    group.name = 'Counter foot rail';
    const path = new THREE.CurvePath<THREE.Vector3>();
    const point = (x: number, z: number) => new THREE.Vector3(x, .32, z);
    path.add(new THREE.LineCurve3(point(-4.25, .42), point(-4.25, .80)));
    path.add(new THREE.QuadraticBezierCurve3(point(-4.25, .80), point(-4.25, .92), point(-4.13, .92)));
    path.add(new THREE.LineCurve3(point(-4.13, .92), point(4.13, .92)));
    path.add(new THREE.QuadraticBezierCurve3(point(4.13, .92), point(4.25, .92), point(4.25, .80)));
    path.add(new THREE.LineCurve3(point(4.25, .80), point(4.25, .42)));
    // Separate segments retain smooth corners without subdividing the long straight section.
    path.curves.forEach(curve => mesh(new THREE.TubeGeometry(curve, curve instanceof THREE.LineCurve3 ? 1 : 8, .036, 10, false), material, group));
    for (const x of [-3, 0, 3]) {
        const flange = mesh(new THREE.CylinderGeometry(.055, .055, .025, 16), material, group);
        flange.rotation.x = Math.PI / 2;
        flange.position.set(x, .27, .435);
        const mount = new THREE.LineCurve3(new THREE.Vector3(x, .27, .44), point(x, .92));
        mesh(new THREE.TubeGeometry(mount, 1, .018, 8, false), material, group);
        const collar = mesh(new THREE.CylinderGeometry(.044, .044, .06, 12), material, group);
        collar.rotation.z = Math.PI / 2;
        collar.position.set(x, .32, .92);
    }
    return group;
}
