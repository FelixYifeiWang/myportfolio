import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

type Palette = Record<'wood' | 'walnut' | 'darkwood' | 'brass' | 'cream' | 'green' | 'black' | 'metal' | 'glow', THREE.MeshStandardMaterial>;

/** A continuous wooden worktop with a genuine opening for the basin. */
export function createBackCounter(material: THREE.Material) {
    const shape = rectangle(9.3, 1.1);
    const hole = roundedRectangle(.80, .51, .08, 2.39);
    shape.holes.push(new THREE.Path(hole.getPoints()));
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: .09, bevelEnabled: true, bevelThickness: .015, bevelSize: .015, bevelSegments: 1, steps: 1 });
    geometry.rotateX(-Math.PI / 2);
    const counter = new THREE.Mesh(geometry, material);
    counter.position.set(0, 1.375, -3.28);
    counter.castShadow = counter.receiveShadow = true;
    counter.name = 'Back counter with basin opening';
    return counter;
}

function rectangle(width: number, height: number, x = 0) {
    const shape = new THREE.Shape();
    shape.moveTo(x - width / 2, -height / 2);
    shape.lineTo(x + width / 2, -height / 2);
    shape.lineTo(x + width / 2, height / 2);
    shape.lineTo(x - width / 2, height / 2);
    shape.closePath();
    return shape;
}

/** Original entrance styling, with a separate hinged leaf for visitor encounters. */
export function createEntrance(palette: Palette, doorTexture: THREE.Texture,
    painted = new THREE.MeshStandardMaterial({ color: '#344a40', roughness: .72 }),
    linen = new THREE.MeshStandardMaterial({ color: '#b5ad94', roughness: 1 })) {
    const door = new THREE.Group();
    door.name = 'Entrance';
    door.position.set(-4.86, 0, 2.65);
    door.rotation.y = Math.PI / 2;

    // Fixed jambs conceal the cutaway plaster edges when the leaf is open.
    for (const x of [-.90, .90]) box(.09, 3.78, .26, palette.darkwood, x, 1.90, -.06, door);
    box(1.89, .10, .26, palette.darkwood, 0, 3.76, -.06, door);
    const hinge = new THREE.Group();
    hinge.position.set(.81, 0, .18);
    door.add(hinge);
    const leaf = new THREE.Group();
    leaf.position.set(-.81, 0, -.18);
    hinge.add(leaf);
    box(1.62, 3.62, .20, palette.darkwood, 0, 1.875, -.05, leaf);
    box(1.53, 3.48, .12, painted, 0, 1.80, .055, leaf);
    for (const x of [-.69, .69]) box(.055, 3.39, .035, palette.walnut, x, 1.8, .129, leaf);
    box(1.18, 1.50, .04, palette.brass, 0, 2.48, .132, leaf);
    const glass = new THREE.MeshStandardMaterial({ map: doorTexture, roughness: .4, emissive: '#8ba59b', emissiveIntensity: .12 });
    box(1.10, 1.42, .03, glass, 0, 2.48, .16, leaf, 0);
    for (const y of [.63, 1.27]) {
        box(1.17, .48, .04, palette.darkwood, 0, y, .131, leaf);
        box(1.10, .41, .044, painted, 0, y, .147, leaf);
    }
    box(.12, .40, .03, palette.brass, -.55, 1.49, .15, leaf);
    const handle = tube([[-.55, 1.37, .19], [-.55, 1.39, .25], [-.55, 1.61, .25], [-.55, 1.63, .19]], .025, palette.brass, leaf);
    handle.name = 'Door pull';
    box(1.36, .10, .025, palette.brass, 0, .21, .133, leaf);
    box(1.64, .035, .28, palette.walnut, 0, .035, .13, door);
    const mat = new THREE.MeshStandardMaterial({ color: '#414338', roughness: 1 });
    box(1.35, .025, .73, mat, 0, .03, .61, door);
    for (const x of [-.57, .57]) box(.022, .002, .60, linen, x, .044, .61, door, 0);
    // A shaded opal sconce; emissive glass costs no additional dynamic light.
    box(.25, .42, .08, palette.brass, 0, 4.07, -.13, door);
    tube([[0, 3.99, -.09], [0, 4.0, .28], [0, 4.19, .32]], .024, palette.brass, door);
    sphere(.14, .19, .14, palette.glow, 0, 4.08, .32, door);
    lathe([[0, .12], [.08, .12], [.20, 0], [.21, -.025]], palette.brass, 0, 4.24, .32, door);

    return { group: door, hinge, leaf, setOpen(openness: number) {
        hinge.rotation.y = Math.max(0, Math.min(1, openness)) * Math.PI * 35 / 180;
    } };
}

/** Small environmental pieces share the room palette and are batched with its shell. */
export function addFurnishings(parent: THREE.Group, palette: Palette, doorTexture: THREE.Texture) {
    const painted = new THREE.MeshStandardMaterial({ color: '#344a40', roughness: .72 });
    const linen = new THREE.MeshStandardMaterial({ color: '#b5ad94', roughness: 1 });
    const clay = new THREE.MeshStandardMaterial({ color: '#a46c49', roughness: .85 });
    const entrance = createEntrance(palette, doorTexture, painted, linen);
    parent.add(entrance.group);

    // Deliberately varied shelf groups: storage ceramics, bowls and a few bottles.
    for (const [x, height] of [[2.05, .42], [2.56, .56]]) {
        lathe([[0, 0], [.16, 0], [.19, .04], [.19, height - .05], [.16, height], [0, height]], x === 2.05 ? palette.cream : clay, x, 3.60, -3.65, parent);
        cylinder(.20, .055, palette.walnut, x, 3.61 + height, -3.65, parent);
        sphere(.035, .035, .035, palette.brass, x, 3.66 + height, -3.65, parent);
    }
    for (let i = 0; i < 4; i++) {
        lathe([[.09, 0], [.12, .02], [.23, .13], [.235, .15], [.218, .15], [.105, .027]], palette.cream, 3.47, 2.71 + i * .045, -3.65, parent);
    }
    for (const x of [3.99, 4.30]) {
        lathe([[.07, 0], [.095, 0], [.10, .21], [.085, .22], [.079, .02], [.07, .02]], palette.cream, x, 2.705, -3.63, parent);
        tube([[x + .09, 2.87, -3.63], [x + .17, 2.87, -3.63], [x + .17, 2.76, -3.63], [x + .09, 2.75, -3.63]], .014, palette.cream, parent);
    }

    // The basin sits below a real opening in the wooden worktop.
    const sink = new THREE.Group();
    sink.name = 'Prep station';
    sink.position.set(2.39, 1.48, -3.28);
    parent.add(sink);
    const rim = rectangle(.98, .68);
    rim.holes.push(new THREE.Path(roundedRectangle(.80, .51, .08).getPoints()));
    const rimGeometry = new THREE.ExtrudeGeometry(rim, { depth: .018, bevelEnabled: false, steps: 1 });
    rimGeometry.rotateX(-Math.PI / 2);
    mesh(rimGeometry, palette.metal, 0, .004, 0, sink);
    const basinMaterial = palette.metal.clone();
    basinMaterial.side = THREE.DoubleSide;
    basinMaterial.roughness = .36;
    const basin = createSinkBasin(basinMaterial);
    sink.add(basin);
    cylinder(.043, .006, palette.metal, 0, -.164, 0, sink);
    cylinder(.031, .007, palette.black, 0, -.163, 0, sink);
    for (const z of [-.016, 0, .016]) box(.047, .003, .005, palette.metal, 0, -.158, z, sink, .001);
    tube([[0, .04, -.37], [0, .41, -.37], [0, .48, -.29], [0, .46, -.08], [0, .36, -.05]], .025, palette.metal, sink);
    for (const x of [-.16, .16]) {
        cylinder(.042, .09, palette.metal, x, .07, -.37, sink);
        box(.10, .018, .024, palette.brass, x, .12, -.37, sink);
    }
    // One folded towel and a board suggest use without filling the work surface.
    const board = box(.44, .035, .63, palette.walnut, 3.26, 1.50, -3.19, parent);
    board.rotation.y = -.12;
    box(.29, .025, .37, linen, 3.24, 1.535, -3.17, parent);
    for (const x of [3.15, 3.19]) box(.012, .001, .34, painted, x, 1.549, -3.17, parent, 0);
    const towel = box(.32, .40, .022, linen, 3.66, 1.25, -2.786, parent);
    towel.rotation.z = -.07;
    for (const x of [3.54, 3.59]) box(.016, .37, .003, painted, x, 1.25, -2.77, parent, 0);
    // Two small cookbooks give the coffee corner a personal, lived-in touch.
    for (const [i, material] of [clay, painted].entries()) {
        box(.56, .09, .34, material, -1.32, 1.535 + i * .10, -3.28, parent);
        box(.47, .052, .005, linen, -1.32, 1.535 + i * .10, -3.105, parent);
    }
    return entrance;
}

function roundedRectangle(width: number, depth: number, radius: number, x = 0) {
    const shape = new THREE.Shape();
    const w = width / 2, d = depth / 2;
    shape.moveTo(x + w, -d + radius);
    shape.lineTo(x + w, d - radius);
    shape.absarc(x + w - radius, d - radius, radius, 0, Math.PI / 2, false);
    shape.lineTo(x - w + radius, d);
    shape.absarc(x - w + radius, d - radius, radius, Math.PI / 2, Math.PI, false);
    shape.lineTo(x - w, -d + radius);
    shape.absarc(x - w + radius, -d + radius, radius, Math.PI, Math.PI * 1.5, false);
    shape.lineTo(x + w - radius, -d);
    shape.absarc(x + w - radius, -d + radius, radius, Math.PI * 1.5, Math.PI * 2, false);
    shape.closePath();
    return shape;
}

/** A rectangular pressed-metal basin with a closed floor and rounded internal corners. */
export function createSinkBasin(material: THREE.Material) {
    const profiles = [[.80, .51, .08, .003], [.786, .496, .08, -.012], [.758, .468, .09, -.046], [.676, .386, .10, -.131], [.612, .322, .095, -.160], [.57, .28, .085, -.168]];
    const positions: number[] = [], indices: number[] = [], uv: number[] = [];
    const segments = 8, ringSize = (segments + 1) * 4;
    for (const [width, depth, radius, y] of profiles) {
        for (let corner = 0; corner < 4; corner++) {
            const cx = (corner === 0 || corner === 3 ? 1 : -1) * (width / 2 - radius);
            const cz = (corner < 2 ? 1 : -1) * (depth / 2 - radius);
            for (let i = 0; i <= segments; i++) {
                const angle = (corner + i / segments) * Math.PI / 2;
                const x = cx + Math.cos(angle) * radius, z = cz + Math.sin(angle) * radius;
                positions.push(x, y, z);
                uv.push(x / .8 + .5, z / .51 + .5);
            }
        }
    }
    for (let row = 0; row < profiles.length - 1; row++) {
        for (let i = 0; i < ringSize; i++) {
            const a = row * ringSize + i, next = row * ringSize + (i + 1) % ringSize;
            indices.push(a, a + ringSize, next, next, a + ringSize, next + ringSize);
        }
    }
    const center = positions.length / 3;
    positions.push(0, -.168, 0); uv.push(.5, .5);
    const last = (profiles.length - 1) * ringSize;
    for (let i = 0; i < ringSize; i++) indices.push(last + i, center, last + (i + 1) % ringSize);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const basin = new THREE.Mesh(geometry, material);
    basin.name = 'Recessed sink basin';
    basin.castShadow = basin.receiveShadow = true;
    return basin;
}

/** One shared translucent batch gives furniture a soft contact footprint. */
export function addContactShadows(parent: THREE.Group, texture: THREE.Texture) {
    const pieces: THREE.BufferGeometry[] = [];
    function footprint(x: number, y: number, z: number, width: number, depth: number) {
        const plane = new THREE.PlaneGeometry(width, depth);
        plane.rotateX(-Math.PI / 2);
        plane.translate(x, y, z);
        pieces.push(plane);
    }
    for (const x of [-3, -1, 1, 3]) footprint(x, .017, 1.75, 1.35, 1.25);
    footprint(0, .018, -.05, 9.9, 2.65);
    footprint(0, .018, -3.30, 9.9, 1.95);
    footprint(-3.28, 1.841, .02, 1.75, 1.38);
    footprint(3.03, 1.841, .03, 1.65, 1.32);
    const geometry = mergeGeometries(pieces, false);
    pieces.forEach(piece => piece.dispose());
    if (!geometry) throw new Error('Could not build the diner contact shadows.');
    const material = new THREE.MeshBasicMaterial({ map: texture, color: '#20180f', transparent: true, opacity: .31, depthWrite: false, toneMapped: false });
    const shadows = new THREE.Mesh(geometry, material);
    shadows.name = 'Furniture contact shadows';
    shadows.renderOrder = 1;
    parent.add(shadows);
    return shadows;
}

function mesh(geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D) {
    const object = new THREE.Mesh(geometry, material);
    object.position.set(x, y, z);
    object.castShadow = object.receiveShadow = true;
    parent.add(object);
    return object;
}
function box(w: number, h: number, d: number, material: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D, radius = .015) {
    return mesh(radius ? new RoundedBoxGeometry(w, h, d, 1, Math.min(radius, w / 3, h / 3, d / 3)) : new THREE.BoxGeometry(w, h, d), material, x, y, z, parent);
}
function cylinder(radius: number, height: number, material: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D) {
    return mesh(new THREE.CylinderGeometry(radius, radius, height, 20), material, x, y, z, parent);
}
function sphere(xScale: number, yScale: number, zScale: number, material: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D) {
    const object = mesh(new THREE.SphereGeometry(1, 16, 12), material, x, y, z, parent);
    object.scale.set(xScale, yScale, zScale);
    return object;
}
function lathe(points: number[][], material: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D) {
    return mesh(new THREE.LatheGeometry(points.map(([r, h]) => new THREE.Vector2(r, h)), 24), material, x, y, z, parent);
}
function tube(points: number[][], radius: number, material: THREE.Material, parent: THREE.Object3D) {
    const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
    return mesh(new THREE.TubeGeometry(curve, 16, radius, 6, false), material, 0, 0, 0, parent);
}
