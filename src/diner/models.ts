import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { woodTexture, tileTexture, floorTexture, menuTexture, signTexture, labelTexture, softTexture, surfaceTexture, furTexture, coffeeTexture, bottleLabelTexture } from './textures';
export type ObjectName = 'menu' | 'notebook' | 'cat' | 'record' | 'about';
export interface DinerWorld {
    group: THREE.Group;
    targets: Record<ObjectName, THREE.Vector3>;
    interactives: THREE.Object3D[];
    cat: THREE.Group;
    catHead: THREE.Group;
    vinyl: THREE.Group;
    steam: THREE.Sprite[];
    rain: THREE.LineSegments;
    rainPositions: Float32Array;
    lights: THREE.Light[];
}
const materialCache = new Map<string, THREE.MeshStandardMaterial>();
function surface(color: string, roughness = .7, metalness = 0) {
    const key = `${color}:${roughness}:${metalness}`;
    if (!materialCache.has(key))
        materialCache.set(key, new THREE.MeshStandardMaterial({ color, roughness, metalness }));
    return materialCache.get(key)!;
}
const cityMaterials = ['#15232b', '#20303a', '#a88e62', '#698590'].map(color => new THREE.MeshBasicMaterial({ color }));
const palette = {
    wood: new THREE.MeshStandardMaterial({ map: woodTexture(), color: '#d1a87c', roughness: .43 }),
    darkwood: new THREE.MeshStandardMaterial({ color: '#38291f', roughness: .7 }),
    walnut: new THREE.MeshStandardMaterial({ color: '#705039', roughness: .6 }),
    brass: new THREE.MeshStandardMaterial({ color: '#b4935b', roughness: .32, metalness: .78 }),
    black: new THREE.MeshStandardMaterial({ color: '#1f2421', roughness: .5, metalness: .15 }),
    cream: new THREE.MeshStandardMaterial({ color: '#e1d4b8', roughness: .27 }),
    green: new THREE.MeshStandardMaterial({ color: '#21433b', roughness: .3, metalness: .25 }),
    leather: new THREE.MeshStandardMaterial({ color: '#60342c', roughness: .62 }),
    metal: new THREE.MeshStandardMaterial({ color: '#adaba0', roughness: .23, metalness: .9 }),
    glow: new THREE.MeshStandardMaterial({ color: '#ffdfa0', emissive: '#ffbe70', emissiveIntensity: 2.4, roughness: .3 }),
};
const bottlePaper = new THREE.MeshStandardMaterial({ map: bottleLabelTexture(), roughness: .92 });
const coffeeMaterial = new THREE.MeshStandardMaterial({ map: coffeeTexture(), roughness: .32 });
const pendantMaterial = new THREE.MeshStandardMaterial({ color: '#b8763c', roughness: .32, metalness: .35, side: THREE.DoubleSide });
const leafMaterial = new THREE.MeshStandardMaterial({ color: '#48613b', roughness: .76, side: THREE.DoubleSide });
const leafGeometry = new THREE.PlaneGeometry(1, 1, 2, 8);
const leafVertices = leafGeometry.attributes.position;
for (let i = 0; i < leafVertices.count; i++) {
    const y = leafVertices.getY(i), x = leafVertices.getX(i);
    leafVertices.setXYZ(i, x * Math.sin((y + .5) * Math.PI), y, .2 * Math.sin((y + .5) * Math.PI) - Math.abs(x) * .13);
}
leafGeometry.computeVertexNormals();
function mesh(geometry: THREE.BufferGeometry, material: THREE.Material, position = [0, 0, 0], parent?: THREE.Object3D) {
    const object = new THREE.Mesh(geometry, material);
    object.position.set(position[0], position[1], position[2]);
    object.castShadow = true;
    object.receiveShadow = true;
    parent?.add(object);
    return object;
}
function box(w: number, h: number, d: number, material: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D, radius = .02) {
    return mesh(radius ? new RoundedBoxGeometry(w, h, d, 2, Math.min(radius, w / 3, h / 3, d / 3)) : new THREE.BoxGeometry(w, h, d), material, [x, y, z], parent);
}
function cylinder(top: number, bottom: number, h: number, material: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D, segments = 32) {
    return mesh(new THREE.CylinderGeometry(top, bottom, h, segments), material, [x, y, z], parent);
}
function ball(x: number, y: number, z: number, sx: number, sy: number, sz: number, material: THREE.Material, parent: THREE.Object3D) {
    const b = mesh(new THREE.SphereGeometry(1, 28, 20), material, [x, y, z], parent);
    b.scale.set(sx, sy, sz);
    return b;
}
function line(points: number[][], radius: number, material: THREE.Material, parent: THREE.Object3D) {
    const path = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p as [
        number,
        number,
        number
    ])));
    return mesh(new THREE.TubeGeometry(path, radius < .01 ? 12 : 24, radius, radius < .01 ? 5 : 8, false), material, [0, 0, 0], parent);
}
function texturePlane(texture: THREE.Texture, w: number, h: number, x: number, y: number, z: number, parent: THREE.Object3D, unlit = false) {
    const material = unlit ? new THREE.MeshBasicMaterial({ map: texture, transparent: true, toneMapped: false }) : new THREE.MeshStandardMaterial({ map: texture, roughness: .84, side: THREE.DoubleSide });
    const plane = mesh(new THREE.PlaneGeometry(w, h), material, [x, y, z], parent);
    plane.castShadow = false;
    return plane;
}
function bottle(x: number, y: number, z: number, height: number, color: string, parent: THREE.Object3D) {
    const glass = surface(color, .18, .15);
    cylinder(.08, .09, height * .65, glass, x, y + height * .325, z, parent, 16);
    const shoulder = mesh(new THREE.CylinderGeometry(.035, .08, height * .15, 16), glass, [x, y + height * .725, z], parent);
    cylinder(.035, .035, height * .2, glass, x, y + height * .9, z, parent, 16);
    cylinder(.038, .038, .045, palette.brass, x, y + height, z, parent, 16);
    const paper = bottlePaper;
    cylinder(.091, .091, height * .25, paper, x, y + height * .35, z, parent, 16);
    return shoulder;
}
function coffee(x: number, y: number, z: number, parent: THREE.Object3D) {
    cylinder(.25, .21, .045, palette.cream, x, y + .022, z, parent);
    const shape = [new THREE.Vector2(.10, 0), new THREE.Vector2(.115, .025), new THREE.Vector2(.145, .20), new THREE.Vector2(.147, .22), new THREE.Vector2(.129, .22), new THREE.Vector2(.12, .04)];
    mesh(new THREE.LatheGeometry(shape, 40), palette.cream, [x, y + .04, z], parent);
    cylinder(.126, .126, .012, surface('#3c2110', .25), x, y + .242, z, parent);
    const crema = mesh(new THREE.CircleGeometry(.124, 32), coffeeMaterial, [x, y + .249, z], parent);
    crema.rotation.x = -Math.PI / 2;
    const lip = mesh(new THREE.TorusGeometry(.139, .009, 8, 40), palette.cream, [x, y + .26, z], parent);
    lip.rotation.x = Math.PI / 2;
    const handle = mesh(new THREE.TorusGeometry(.082, .022, 10, 24), palette.cream, [x + .16, y + .16, z], parent);
    handle.scale.set(.85, 1.05, 1);
    const spoon = box(.028, .012, .33, palette.metal, x + .15, y + .07, z + .12, parent, .006);
    spoon.rotation.y = .6;
}
function stool(x: number, z: number, parent: THREE.Object3D) {
    const cushion = [new THREE.Vector2(0, .12), new THREE.Vector2(.18, .12), new THREE.Vector2(.31, .10), new THREE.Vector2(.36, .065), new THREE.Vector2(.37, 0), new THREE.Vector2(.35, -.07), new THREE.Vector2(0, -.07)];
    mesh(new THREE.LatheGeometry(cushion.reverse(), 40), palette.leather, [x, 1.04, z], parent);
    const piping = mesh(new THREE.TorusGeometry(.363, .009, 8, 40), surface('#a26748', .8), [x, 1.055, z], parent);
    piping.rotation.x = Math.PI / 2;
    cylinder(.37, .36, .04, palette.brass, x, .95, z, parent);
    for (const dx of [-.20, .20])
        for (const dz of [-.20, .20]) {
            const leg = cylinder(.025, .036, .93, palette.black, x + dx, .475, z + dz, parent, 12);
            leg.rotation.z = -dx * .12;
            leg.rotation.x = dz * .12;
        }
    const ring = mesh(new THREE.TorusGeometry(.275, .018, 8, 48), palette.brass, [x, .37, z], parent);
    ring.rotation.x = Math.PI / 2;
}
function pendant(x: number, y: number, z: number, parent: THREE.Object3D) {
    cylinder(.012, .012, 5.3 - y, palette.black, x, (5.3 + y) / 2, z, parent, 8);
    const shade = pendantMaterial;
    const profile = [new THREE.Vector2(.03, .27), new THREE.Vector2(.10, .25), new THREE.Vector2(.26, .13), new THREE.Vector2(.47, -.09), new THREE.Vector2(.49, -.13)];
    mesh(new THREE.LatheGeometry(profile, 48), shade, [x, y, z], parent);
    cylinder(.455, .455, .016, palette.glow, x, y - .12, z, parent, 48);
    cylinder(.07, .06, .10, palette.brass, x, y + .3, z, parent, 20);
}
function plant(x: number, y: number, z: number, parent: THREE.Object3D) {
    const pot = surface('#95674b', .91);
    cylinder(.24, .16, .35, pot, x, y + .175, z, parent);
    cylinder(.213, .213, .014, palette.darkwood, x, y + .35, z, parent);
    const leaf = leafMaterial;
    for (let i = 0; i < 10; i++) {
        const a = i * 2.4, length = .45 + (i % 3) * .16;
        const stem = line([[x, y + .3, z], [x + Math.sin(a) * .08, y + .65, z + Math.cos(a) * .08], [x + Math.sin(a) * .25, y + .3 + length, z + Math.cos(a) * .25]], .009, leaf, parent);
        const l = mesh(leafGeometry, leaf, [x + Math.sin(a) * .23, y + .3 + length, z + Math.cos(a) * .23], parent);
        l.scale.set(.18, .54 + (i % 3) * .06, .18);
        l.rotation.set(Math.cos(a) * .55, a, Math.sin(a) * .7);
        stem.castShadow = false;
    }
}
export function buildDiner(): DinerWorld {
    const group = new THREE.Group();
    const interactives: THREE.Object3D[] = [];
    const targets = {} as Record<ObjectName, THREE.Vector3>;
    function interactive(name: ObjectName, object: THREE.Object3D, point: THREE.Vector3) {
        object.userData.action = name;
        object.traverse(child => { child.userData.action = name; });
        interactives.push(object);
        targets[name] = point;
    }
    const plasterGrain = surfaceTexture();
    const plaster = new THREE.MeshStandardMaterial({ color: '#bba582', roughness: 1, bumpMap: plasterGrain, bumpScale: .035 });
    const tileMap = tileTexture();
    const tiles = new THREE.MeshStandardMaterial({ map: tileMap, roughness: .25, metalness: .05, bumpMap: tileMap, bumpScale: .025 });
    const floor = new THREE.MeshStandardMaterial({ map: floorTexture(), roughness: .6 });
    box(10.6, .26, 8.6, palette.darkwood, 0, -.16, 0, group, .09);
    box(10.1, .05, 8.1, floor, 0, -.01, 0, group, 0);
    box(10.3, 5.5, .2, plaster, 0, 2.7, -4.12, group);
    box(10, 2.2, .04, tiles, 0, 1.35, -3.99, group, 0);
    box(10, .13, .08, palette.darkwood, 0, 2.51, -3.94, group);
    box(10, .10, .1, palette.darkwood, 0, .1, -3.91, group);
    // Window openings are built into the left wall rather than painted on it.
    box(.2, 1.7, 8.2, plaster, -5.12, .82, 0, group);
    box(.2, 1.0, 8.2, plaster, -5.12, 5, 0, group);
    box(.2, 2.8, 1.6, plaster, -5.12, 3.1, -3.35, group);
    box(.2, 2.8, 3, plaster, -5.12, 3.1, 2.65, group);
    box(.15, 1.7, 8.1, palette.walnut, -4.99, .83, 0, group);
    for (let z = -3.8; z < 4; z += .25)
        box(.045, 1.65, .04, palette.darkwood, -4.89, .82, z, group, 0);
    for (const z of [-2.58, 1.18])
        box(.22, 2.9, .12, palette.darkwood, -5, 3.07, z, group);
    for (const y of [1.64, 4.5])
        box(.22, .12, 3.86, palette.darkwood, -5, y, -.7, group);
    box(.24, .08, 3.8, palette.darkwood, -4.98, 3.1, -.7, group);
    box(.24, 2.8, .08, palette.darkwood, -4.98, 3.05, -.7, group);
    box(.5, .1, 4.02, palette.wood, -4.84, 1.63, -.7, group);
    const glass = new THREE.MeshStandardMaterial({ color: '#24434c', emissive: '#1a3444', emissiveIntensity: .4, roughness: .18, transparent: true, opacity: .68, side: THREE.DoubleSide });
    const window = mesh(new THREE.PlaneGeometry(3.72, 2.77), glass, [-5.04, 3.07, -.7], group);
    window.rotation.y = Math.PI / 2;
    window.castShadow = false;
    const sky = new THREE.MeshBasicMaterial({ color: '#14232c' });
    box(.03, 4.1, 5, sky, -5.9, 3, -.7, group, 0);
    for (let i = 0; i < 8; i++) {
        const z = -2.6 + i * .54, height = 1.2 + (i % 3) * .5;
        box(.1, height, .42, cityMaterials[i % 2], -5.7, 2 + height / 2, z, group, 0);
        for (let j = 0; j < 4; j++)
            for (let k = 0; k < 2; k++)
                if ((i + j + k) % 3 !== 0)
                    box(.015, .10, .07, cityMaterials[2 + (i + j) % 2], -5.63, 2.3 + j * .3, z - .1 + k * .2, group, 0);
    }
    box(.13, 5.4, .15, palette.darkwood, 5, 2.7, -4, group);
    box(10.3, .16, .22, palette.darkwood, 0, 5.31, -4, group);
    box(.2, .15, 8.2, palette.darkwood, -5, 5.32, 0, group);
    // Back bar: cabinetry, tile backsplash, open shelves, and a working-looking coffee station.
    box(9.15, 1.34, .95, palette.darkwood, 0, .70, -3.36, group, .025);
    box(9.3, .12, 1.1, palette.wood, 0, 1.42, -3.28, group, .04);
    for (let i = 0; i < 8; i++) {
        box(1.07, 1.12, .06, palette.walnut, -3.96 + i * 1.13, .72, -2.854, group, .008);
        box(.23, .025, .075, palette.brass, -3.96 + i * 1.13, 1.09, -2.80, group, .006);
    }
    for (const y of [2.65, 3.55]) {
        box(2.65, .095, .5, palette.wood, 3.08, y, -3.67, group);
        for (const x of [2.02, 4.1]) {
            box(.035, .35, .035, palette.brass, x, y - .19, -3.85, group);
            box(.035, .035, .4, palette.brass, x, y - .35, -3.68, group);
        }
        for (let i = 0; i < 7; i++)
            bottle(2 + i * .35, y + .05, -3.66, .44 + (i % 3) * .11, ['#314c32', '#653b25', '#617060'][i % 3], group);
    }
    const machine = new THREE.Group();
    machine.position.set(-3.3, 1.48, -3.26);
    group.add(machine);
    box(1.3, .73, .65, palette.green, 0, .43, 0, machine, .07);
    box(1.18, .21, .13, palette.metal, 0, .35, .365, machine, .035);
    box(1.34, .07, .82, palette.metal, 0, .045, .07, machine, .015);
    for (const x of [-.30, .3]) {
        cylinder(.09, .07, .13, palette.metal, x, .30, .39, machine);
        box(.06, .06, .28, palette.black, x, .29, .56, machine);
        coffee(x, .81, 0, machine);
    }
    for (let i = 0; i < 12; i++)
        box(.018, .012, .24, palette.black, -.52 + i * .09, .086, .26, machine, 0);
    const pressure = texturePlane(labelTexture('9', 'BAR', '#e3d5b6', '#40392d'), .13, .13, 0, .60, .373, machine);
    for (const x of [-.35, .35]) {
        const dial = cylinder(.055, .055, .035, palette.cream, x, .6, .35, machine);
        dial.rotation.x = Math.PI / 2;
    }
    line([[.54, .45, .3], [.65, .45, .45], [.65, .17, .5]], .019, palette.metal, machine);
    for (let i = 0; i < 5; i++)
        cylinder(.22, .21, .03, palette.cream, -1.9, 1.52 + i * .032, -3.15, group);
    const sign = texturePlane(signTexture(), 4.2, 1.4, -.45, 3.57, -3.96, group, true);
    sign.renderOrder = 2;
    // A framed print introduces the user's own art into the actual room.
    const loader = new THREE.TextureLoader();
    const art = loader.load('/images/ow02.webp');
    art.colorSpace = THREE.SRGBColorSpace;
    box(1.36, 1.16, .07, palette.darkwood, -3.4, 3.5, -3.92, group);
    texturePlane(art, 1.18, .98, -3.4, 3.5, -3.873, group);
    const chalk = labelTexture('Stay\ncurious.', 'GOOD THINGS TAKE TIME', '#263c35', '#d7cbae');
    const chalkGroup = new THREE.Group();
    chalkGroup.position.set(1, 1.49, -3.2);
    chalkGroup.rotation.x = -.08;
    group.add(chalkGroup);
    box(.74, .86, .055, palette.darkwood, 0, .43, 0, chalkGroup);
    texturePlane(chalk, .65, .77, 0, .43, .034, chalkGroup);
    // The counter is a thick oak slab over a fluted, moss-green base.
    const baseMaterial = new THREE.MeshStandardMaterial({ color: '#354238', roughness: .72 });
    box(8.6, 1.65, 1.08, baseMaterial, 0, .82, -.15, group, .025);
    for (let x = -4.13; x < 4.2; x += .17)
        box(.07, 1.53, .06, palette.walnut, x, .82, .412, group, .014);
    box(8.95, .18, 1.75, palette.wood, 0, 1.75, -.12, group, .07);
    box(8.91, .018, 1.70, palette.brass, 0, 1.657, -.12, group, .009);
    line([[-4.25, .32, .74], [-4.25, .32, .92], [4.25, .32, .92], [4.25, .32, .74]], .036, palette.brass, group);
    for (const x of [-3, -1, 1, 3])
        stool(x, 1.75, group);
    for (const x of [-2.8, 0, 2.8])
        pendant(x, 4.38, -.15, group);
    // A real menu on the counter. Both raycasting and keyboard controls can pick it up.
    const menu = new THREE.Group();
    menu.position.set(.12, 1.86, .05);
    menu.rotation.set(-.08, -.16, 0);
    group.add(menu);
    box(1.12, .055, 1.43, palette.leather, 0, 0, 0, menu, .025);
    const paper = texturePlane(menuTexture(), 1.05, 1.36, 0, .032, 0, menu);
    paper.rotation.x = -Math.PI / 2;
    for (const z of [-.58, .58])
        box(.10, .012, .038, palette.brass, -.49, .038, z, menu, .004);
    interactive('menu', menu, new THREE.Vector3(.1, 1.93, .15));
    const notebook = new THREE.Group();
    notebook.position.set(-1.5, 1.86, .16);
    notebook.rotation.y = .22;
    group.add(notebook);
    box(.76, .07, 1.02, new THREE.MeshStandardMaterial({ color: '#314944', roughness: .92 }), 0, 0, 0, notebook, .015);
    box(.71, .025, .95, palette.cream, 0, .036, 0, notebook, .006);
    for (let i = 0; i < 4; i++)
        box(.70, .002, .94, surface('#bdad8e', 1), 0, .025 + i * .005, 0, notebook, 0);
    box(.022, .003, .96, palette.brass, .25, .055, 0, notebook, .001);
    const notebookLabel = labelTexture('Little\nideas', 'SKETCHES & SIDE QUESTS', '#314944', '#cbb893');
    const noteCover = texturePlane(notebookLabel, .72, .99, 0, .052, 0, notebook);
    noteCover.rotation.x = -Math.PI / 2;
    const pencil = cylinder(.014, .014, .7, new THREE.MeshStandardMaterial({ color: '#b98739', roughness: .7 }), .47, .045, 0, notebook, 6);
    pencil.rotation.x = Math.PI / 2;
    pencil.rotation.z = .12;
    interactive('notebook', notebook, new THREE.Vector3(-1.5, 1.93, .16));
    coffee(1.25, 1.84, .22, group);
    // Record player: wood plinth, grooved vinyl, center label, and a metal tonearm.
    const record = new THREE.Group();
    record.position.set(3.03, 1.86, .03);
    record.rotation.y = -.08;
    group.add(record);
    box(1.18, .16, .92, palette.walnut, 0, .04, 0, record, .045);
    box(1.10, .028, .85, palette.black, 0, .132, 0, record, .025);
    const vinyl = new THREE.Group();
    vinyl.position.set(-.10, .16, 0);
    record.add(vinyl);
    cylinder(.365, .365, .018, palette.black, 0, 0, 0, vinyl, 64);
    const groove = new THREE.MeshStandardMaterial({ color: '#42413d', roughness: .38, metalness: .3 });
    for (let r = .14; r < .34; r += .018) {
        const ring = mesh(new THREE.TorusGeometry(r, .0018, 4, 64), groove, [0, .011, 0], vinyl);
        ring.rotation.x = Math.PI / 2;
    }
    cylinder(.115, .115, .021, new THREE.MeshStandardMaterial({ color: '#b97545', roughness: .8 }), 0, .001, 0, vinyl, 40);
    box(.06, .004, .025, palette.cream, .035, .015, .028, vinyl, .002);
    cylinder(.012, .012, .045, palette.metal, 0, .028, 0, vinyl, 12);
    line([[.42, .19, -.29], [.41, .26, -.26], [.29, .26, .18], [.14, .235, .22]], .012, palette.metal, record);
    box(.07, .04, .11, palette.black, .14, .23, .24, record, .01);
    for (let i = 0; i < 3; i++)
        cylinder(.027, .027, .018, palette.brass, .33 + i * .08, .16, .33, record, 16);
    interactive('record', record, new THREE.Vector3(3.03, 2, .03));
    // A sculpted, sleeping cat on a cushion, with a breathing body and a movable head.
    const cat = new THREE.Group();
    cat.position.set(-3.28, 1.94, .02);
    cat.rotation.y = -.2;
    group.add(cat);
    const fur = new THREE.MeshStandardMaterial({ color: '#ba7945', roughness: 1 });
    const pale = new THREE.MeshStandardMaterial({ color: '#dbc9a9', roughness: 1 });
    const stripe = new THREE.MeshStandardMaterial({ color: '#895332', roughness: 1 });
    ball(0, -.03, 0, .65, .10, .45, new THREE.MeshStandardMaterial({ color: '#8a533c', roughness: 1 }), cat);
    const tabby = new THREE.MeshStandardMaterial({ map: furTexture(), roughness: 1 });
    ball(.10, .19, 0, .48, .245, .32, tabby, cat);
    ball(-.19, .13, .21, .21, .11, .15, pale, cat);
    const cushionSeam = mesh(new THREE.TorusGeometry(1, .012, 6, 64), surface('#b97955', .9), [0, -.02, 0], cat);
    cushionSeam.rotation.x = Math.PI / 2;
    cushionSeam.scale.set(.62, .42, 1);
    const catHead = new THREE.Group();
    catHead.position.set(-.34, .24, .21);
    catHead.rotation.y = .26;
    cat.add(catHead);
    ball(0, 0, 0, .22, .19, .19, fur, catHead);
    ball(-.018, -.07, .125, .15, .095, .08, pale, catHead);
    for (const x of [-.14, .14]) {
        const ear = mesh(new THREE.ConeGeometry(.095, .21, 3), fur, [x, .165, 0], catHead);
        ear.rotation.z = -x * 1.6;
        ear.rotation.y = .6;
        const inner = mesh(new THREE.ConeGeometry(.054, .13, 3), new THREE.MeshStandardMaterial({ color: '#b97e6b', roughness: 1 }), [x, .17, .024], catHead);
        inner.rotation.copy(ear.rotation);
    }
    ball(-.005, -.04, .19, .025, .017, .011, stripe, catHead);
    for (const x of [-.085, .085])
        line([[x - .032, .015, .169], [x, .002, .183], [x + .032, .015, .175]], .008, stripe, catHead);
    ball(-.33, .025, .34, .16, .07, .095, pale, cat);
    ball(-.06, .025, .34, .15, .07, .08, fur, cat);
    line([[.44, .15, -.17], [.57, .1, .06], [.48, .045, .34], [.13, .035, .43], [-.05, .035, .35]], .048, fur, cat);
    for (const side of [-1, 1]) {
        for (let i = 0; i < 3; i++) {
            line([[side * .085, -.065, .19], [side * .18, -.06 + i * .018, .22], [side * .29, -.085 + i * .039, .23]], .0025, pale, catHead);
        }
        line([[0, -.057, .196], [side * .025, -.082, .19], [side * .049, -.076, .177]], .004, stripe, catHead);
        for (let i = 0; i < 2; i++)
            line([[side * .033, -.006, .18], [side * .033 + .009, .008, .175]], .003, stripe, catHead);
    }
    interactive('cat', cat, new THREE.Vector3(-3.25, 2.35, .12));
    // Personal postcard, utensils, condiments, flowers, and a small warm lamp.
    const about = new THREE.Group();
    about.position.set(-.65, 1.5, -3.2);
    about.rotation.y = .12;
    group.add(about);
    box(.65, .53, .07, palette.brass, 0, .26, 0, about, .015);
    const portrait = loader.load('/images/profile.webp');
    portrait.colorSpace = THREE.SRGBColorSpace;
    texturePlane(portrait, .56, .44, 0, .26, .045, about);
    interactive('about', about, new THREE.Vector3(-.65, 1.92, -3.15));
    cylinder(.105, .095, .24, palette.cream, 1.95, 1.96, -.54, group);
    for (let i = 0; i < 8; i++) {
        const stick = cylinder(.009, .009, .51, palette.walnut, 1.91 + (i % 3) * .033, 2.11, -.55 + Math.floor(i / 3) * .03, group, 6);
        stick.rotation.z = (i - 3) * .04;
    }
    bottle(1.65, 1.84, -.56, .30, '#4c3925', group);
    plant(-4.62, 1.7, .37, group);
    plant(4.28, 1.48, -3.1, group);
    const lamp = new THREE.Group();
    lamp.position.set(-4.04, 1.5, -3.2);
    group.add(lamp);
    cylinder(.20, .23, .04, palette.brass, 0, .02, 0, lamp);
    cylinder(.045, .075, .54, palette.brass, 0, .3, 0, lamp);
    const shadeProfile = [new THREE.Vector2(0, .20), new THREE.Vector2(.1, .19), new THREE.Vector2(.26, .1), new THREE.Vector2(.33, 0)];
    mesh(new THREE.LatheGeometry(shadeProfile, 40), palette.leather, [0, .62, 0], lamp);
    cylinder(.30, .30, .015, palette.glow, 0, .62, 0, lamp);
    addCounterDetails(group);
    // Floating steam is rendered inside the room, not layered onto the page.
    const soft = softTexture();
    const steam: THREE.Sprite[] = [];
    for (let i = 0; i < 9; i++) {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft, color: '#d6c6b0', transparent: true, opacity: .12, depthWrite: false }));
        s.position.set(1.25, 2.15 + i * .085, .22);
        s.scale.set(.11 + i * .012, .19 + i * .015, 1);
        group.add(s);
        steam.push(s);
    }
    const rainPositions = new Float32Array(100 * 6);
    for (let i = 0; i < 100; i++) {
        const y = 1.78 + (i * .173) % 2.6, z = -2.5 + (i * .719) % 3.6;
        rainPositions.set([-4.97, y, z, -4.97, y - .09, z + .009], i * 6);
    }
    const rainGeometry = new THREE.BufferGeometry();
    rainGeometry.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
    const rain = new THREE.LineSegments(rainGeometry, new THREE.LineBasicMaterial({ color: '#b6cfcb', transparent: true, opacity: .24 }));
    group.add(rain);
    const lights: THREE.Light[] = [];
    const ambient = new THREE.HemisphereLight('#ebd5a7', '#5c4633', .9);
    group.add(ambient);
    for (const x of [-2.8, 0, 2.8]) {
        const light = new THREE.SpotLight('#ffd092', 13, 12, Math.PI * .34, .72, 1.5);
        light.position.set(x, 4.19, -.15);
        light.target.position.set(x, 1, .1);
        group.add(light, light.target);
        light.castShadow = true;
        light.shadow.mapSize.set(1024, 1024);
        light.shadow.bias = -.0005;
        light.shadow.normalBias = .025;
        light.shadow.radius = 3;
        lights.push(light);
    }
    const glow = new THREE.PointLight('#f4a256', 2, 5, 2);
    glow.position.set(-4.04, 2.12, -3.1);
    group.add(glow);
    lights.push(glow);
    const windowLight = new THREE.RectAreaLight('#779cab', 3.7, 3.7, 2.8);
    windowLight.position.set(-4.85, 3.1, -.7);
    windowLight.lookAt(0, 1.5, 0);
    group.add(windowLight);
    const softFront = new THREE.RectAreaLight('#dfb683', 1.4, 8, 5);
    softFront.position.set(0, 4, 5);
    softFront.lookAt(0, 1, 0);
    group.add(softFront);
    const signGlow = new THREE.PointLight('#f3a46c', .45, 5, 2);
    signGlow.position.set(-.5, 3.45, -3.6);
    group.add(signGlow);
    return { group, targets, interactives, cat, catHead, vinyl, steam, rain, rainPositions, lights };
}
function addCounterDetails(parent: THREE.Object3D) {
    // A little supper, set just behind the notebook: handmade ceramic and chopsticks.
    const bowl = new THREE.Group();
    bowl.position.set(-1.66, 1.85, -.62);
    parent.add(bowl);
    const ceramic = surface('#88917c', .4);
    const profile = [new THREE.Vector2(.08, 0), new THREE.Vector2(.18, .035), new THREE.Vector2(.25, .14), new THREE.Vector2(.27, .22), new THREE.Vector2(.25, .22), new THREE.Vector2(.21, .09), new THREE.Vector2(.08, .035)];
    mesh(new THREE.LatheGeometry(profile, 32), ceramic, [0, 0, 0], bowl);
    cylinder(.238, .23, .015, surface('#53311c', .32), 0, .175, 0, bowl, 32);
    const noodle = surface('#d1b47c', .8);
    for (let i = 0; i < 5; i++)
        line([[-.15, .19, -.12 + i * .048], [-.05, .195, -.1 + i * .048], [.08, .192, -.14 + i * .048], [.16, .19, -.1 + i * .048]], .009, noodle, bowl);
    const egg = ball(.09, .197, .015, .082, .017, .102, palette.cream, bowl);
    ball(.10, .213, .018, .036, .008, .045, surface('#cf9135', .7), bowl);
    for (let i = 0; i < 5; i++) {
        const scallion = cylinder(.014, .01, .008, surface('#54713b', .9), -.07 + i * .026, .208, .05 + (i % 2) * .03, bowl, 8);
        scallion.rotation.z = .15;
    }
    for (const offset of [-.035, .035]) {
        const stick = cylinder(.007, .01, .79, palette.walnut, offset, .27, 0, bowl, 6);
        stick.rotation.set(Math.PI / 2, 0, .7);
    }
    // Folded linen under the cup; deliberately tiny geometry instead of simulated cloth.
    const cloth = surface('#b5a58a', .96);
    const napkin = box(.51, .015, .43, cloth, 1.28, 1.85, .20, parent, .009);
    napkin.rotation.y = .2;
    const receipt = new THREE.Group();
    receipt.position.set(2.14, 1.85, .29);
    receipt.rotation.y = -.24;
    parent.add(receipt);
    const paper = texturePlane(labelTexture('Good\ncompany.', 'NO RESERVATION NEEDED', '#ddcfb2', '#826c4e'), .31, .45, 0, .014, 0, receipt);
    paper.rotation.x = -Math.PI / 2;
    // Small feet and mounting details make furniture feel assembled rather than extruded.
    for (const x of [-3, -1, 1, 3])
        for (const dx of [-.2, .2])
            for (const dz of [-.2, .2])
                cylinder(.038, .04, .06, palette.brass, x + dx, .045, 1.75 + dz, parent, 10);
}
