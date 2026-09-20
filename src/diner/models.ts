import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { batchStaticMeshes } from './optimize';
import { createDoorwayMask, maskDoorwayContent } from './doorway';
import { createEntranceWall } from './entrance-wall';
import { addFurnishings, addContactShadows, createBackCounter } from './furnishings';
import type { DinerCat } from './cat';
import { createWindowRain, type WindowRain } from './rain';
import { createSeatedCeiling } from './ceiling';
import { createSeatedSideWall } from './side-wall';
import { placeProp, type DinerProps } from './assets';
import { tileTexture, floorTexture, menuTexture, signTexture, labelTexture, softTexture, surfaceTexture, coffeeTexture, bottleLabelTexture, doorGlassTexture, doorwayNightTexture, windowBeadsTexture, ceramicTexture } from './textures';
import { seats, type SeatName } from './seats';
import { createVaseArrangement, createUtensilHolder } from './counter-props';
import { createShelfBracket, createFootRail } from './hardware';
import { paperGeometry, linenGeometry, createNotebook } from './paper-props';
export type ObjectName = 'menu' | 'notebook' | 'cat' | 'record' | 'about' | 'door' | SeatName;
export interface DinerWorld {
    group: THREE.Group;
    targets: Record<ObjectName, THREE.Vector3>;
    interactives: THREE.Object3D[];
    cat: THREE.Group;
    vinyl: THREE.Group;
    steam: THREE.Sprite[];
    rain: WindowRain;
    ceiling: ReturnType<typeof createSeatedCeiling>;
    sideWall: ReturnType<typeof createSeatedSideWall>;
    lights: THREE.Light[];
    entrance: ReturnType<typeof addFurnishings>;
    doorstep: THREE.Group;
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
    wood: new THREE.MeshStandardMaterial({ color: '#d4a87b', roughness: .43 }),
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
    const profile = [[0, 0], [.075, 0], [.086, .018], [.09, .06], [.09, .59], [.084, .65], [.066, .70], [.041, .75], [.035, .81], [.035, .98], [.038, 1]];
    mesh(new THREE.LatheGeometry(profile.map(([radius, h]) => new THREE.Vector2(radius, h * height)), 20), glass, [x, y, z], parent);
    cylinder(.038, .038, .045, palette.brass, x, y + height, z, parent, 16);
    const paper = bottlePaper;
    cylinder(.093, .093, height * .25, paper, x, y + height * .35, z, parent, 20);
}
function coffee(x: number, y: number, z: number, parent: THREE.Object3D) {
    const saucer = [[.07, .012], [.14, .012], [.20, .019], [.247, .041], [.25, .049], [.242, .057], [.195, .033], [.13, .027], [.07, .027]];
    mesh(new THREE.LatheGeometry(saucer.map(([r, h]) => new THREE.Vector2(r, h)), 40), palette.cream, [x, y, z], parent);
    const shape = [new THREE.Vector2(.10, 0), new THREE.Vector2(.115, .025), new THREE.Vector2(.145, .20), new THREE.Vector2(.147, .22), new THREE.Vector2(.129, .22), new THREE.Vector2(.12, .04)];
    mesh(new THREE.LatheGeometry(shape, 40), palette.cream, [x, y + .04, z], parent);
    cylinder(.126, .126, .012, surface('#3c2110', .25), x, y + .242, z, parent);
    const crema = mesh(new THREE.CircleGeometry(.124, 32), coffeeMaterial, [x, y + .249, z], parent);
    crema.rotation.x = -Math.PI / 2;
    const lip = mesh(new THREE.TorusGeometry(.139, .009, 8, 40), palette.cream, [x, y + .26, z], parent);
    lip.rotation.x = Math.PI / 2;
    line([[x + .137, y + .222, z], [x + .208, y + .23, z], [x + .242, y + .187, z], [x + .235, y + .124, z], [x + .197, y + .094, z], [x + .119, y + .105, z]], .019, palette.cream, parent);
    const spoon = new THREE.Group();
    spoon.position.set(x + .12, y + .065, z + .13);
    spoon.rotation.y = .65;
    parent.add(spoon);
    line([[0, 0, -.13], [0, -.003, .01], [0, .008, .075]], .008, palette.metal, spoon);
    const bowl = new THREE.LatheGeometry([[0, -.8], [.4, -.7], [.8, -.35], [1, 0], [.97, .12], [.75, -.18], [.35, -.52], [0, -.6]].map(([r, h]) => new THREE.Vector2(r, h)), 24);
    const bowlMesh = mesh(bowl, palette.metal, [0, .01, .10], spoon);
    bowlMesh.scale.set(.03, .012, .044);
    const spoonRim = mesh(new THREE.TorusGeometry(1, .05, 5, 24), palette.metal, [0, .01, .10], spoon);
    spoonRim.rotation.x = Math.PI / 2;
    spoonRim.scale.set(.03, .044, .03);
}
function pendant(x: number, y: number, z: number, parent: THREE.Object3D) {
    cylinder(.012, .012, 5.3 - y, palette.black, x, (5.3 + y) / 2, z, parent, 8);
    const shade = pendantMaterial;
    const profile = [new THREE.Vector2(.03, .27), new THREE.Vector2(.10, .25), new THREE.Vector2(.26, .13), new THREE.Vector2(.47, -.09), new THREE.Vector2(.49, -.13)];
    mesh(new THREE.LatheGeometry(profile, 48), shade, [x, y, z], parent);
    cylinder(.455, .455, .016, palette.glow, x, y - .12, z, parent, 48);
    cylinder(.07, .06, .10, palette.brass, x, y + .3, z, parent, 20);
}
export function buildDiner(catModel: DinerCat, props: DinerProps): DinerWorld {
    const group = new THREE.Group();
    for (const material of [palette.wood, palette.walnut]) {
        material.map = props.wood.color;
        material.normalMap = props.wood.normal;
        material.normalScale.set(.22, .22);
        material.roughnessMap = props.wood.roughness;
        material.needsUpdate = true;
    }
    palette.walnut.color.set('#a88260');
    const interactives: THREE.Object3D[] = [];
    const targets = {} as Record<ObjectName, THREE.Vector3>;
    function interactive(name: ObjectName, object: THREE.Object3D, point: THREE.Vector3) {
        object.userData.action = name;
        object.traverse(child => { child.userData.action = name; });
        interactives.push(object);
        targets[name] = point;
    }
    const plasterGrain = surfaceTexture();
    palette.leather.bumpMap = plasterGrain;
    palette.leather.bumpScale = .006;
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
    group.add(createEntranceWall(plaster, palette.walnut, palette.darkwood));
    for (const z of [-2.58, 1.18])
        box(.22, 2.9, .12, palette.darkwood, -5, 3.07, z, group);
    for (const y of [1.64, 4.5])
        box(.22, .12, 3.86, palette.darkwood, -5, y, -.7, group);
    box(.24, .08, 3.8, palette.darkwood, -4.98, 3.1, -.7, group);
    box(.24, 2.8, .08, palette.darkwood, -4.98, 3.05, -.7, group);
    box(.72, .1, 4.02, palette.wood, -4.76, 1.63, -.7, group);
    const glass = new THREE.MeshStandardMaterial({ color: '#24434c', emissive: '#1a3444', emissiveIntensity: .4, roughness: .22, transparent: true, opacity: .43, side: THREE.DoubleSide });
    const window = mesh(new THREE.PlaneGeometry(3.72, 2.77), glass, [-5.04, 3.07, -.7], group);
    window.rotation.y = Math.PI / 2;
    window.castShadow = false;
    const beads = mesh(new THREE.PlaneGeometry(3.72, 2.77), new THREE.MeshBasicMaterial({ map: windowBeadsTexture(), transparent: true, opacity: .30, depthWrite: false }), [-5.028, 3.07, -.7], group);
    beads.rotation.y = Math.PI / 2;
    beads.castShadow = false;
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
    // The wall-top timber trim belongs to the seated-only ceiling.
    // Back bar: cabinetry, tile backsplash, open shelves, and a working-looking coffee station.
    box(9.15, 1.22, .95, palette.darkwood, 0, .64, -3.36, group, .025);
    box(9.15, .15, .065, palette.darkwood, 0, 1.30, -2.854, group);
    for (const x of [-4.54, 4.54])
        box(.07, .15, .95, palette.darkwood, x, 1.30, -3.36, group);
    group.add(createBackCounter(palette.wood));
    for (let i = 0; i < 8; i++) {
        box(1.07, 1.12, .06, palette.walnut, -3.96 + i * 1.13, .72, -2.854, group, .008);
        box(.23, .025, .075, palette.brass, -3.96 + i * 1.13, 1.09, -2.80, group, .006);
    }
    for (const y of [2.65, 3.55]) {
        box(2.65, .095, .5, palette.wood, 3.08, y, -3.67, group);
        for (const x of [2.02, 4.1]) {
            const bracket = createShelfBracket(palette.brass);
            bracket.position.set(x, y - .095 / 2, y > 3 ? -4.01 : -3.965);
            group.add(bracket);
        }
        for (let i = 0; i < 3; i++)
            bottle((y > 3 ? 3.24 : 2.02) + i * .39, y + .05, -3.66, .40 + (i % 3) * .09, ['#314c32', '#653b25', '#617060'][i % 3], group);
    }
    placeProp(props.espresso, .95, new THREE.Vector3(-3.25, 1.48, -3.25), -Math.PI / 2, group);
    // Milk pitcher: a hollow spun profile, pinched pouring lip and bent handle.
    const pitcher = new THREE.Group();
    pitcher.position.set(-2.33, 1.48, -2.98);
    group.add(pitcher);
    const pitcherProfile = [[.07, 0], [.105, .018], [.10, .24], [.095, .25], [.086, .24], [.092, .025], [.07, .017]];
    mesh(new THREE.LatheGeometry(pitcherProfile.map(([r, h]) => new THREE.Vector2(r, h)), 32), palette.metal, [0, 0, 0], pitcher);
    line([[.088, .21, 0], [.16, .20, 0], [.17, .08, 0], [.102, .064, 0]], .009, palette.metal, pitcher);
    line([[-.03, .246, .089], [0, .253, .126], [.03, .246, .089]], .007, palette.metal, pitcher);
    for (let i = 0; i < 5; i++)
        cylinder(.22, .21, .03, palette.cream, -2.02, 1.52 + i * .032, -3.15, group);
    const sign = texturePlane(signTexture(), 4.2, 1.4, -.45, 3.57, -3.96, group, true);
    sign.renderOrder = 2;
    // Frame the canvas itself, correcting the perspective of the studio photograph.
    const loader = new THREE.TextureLoader();
    const art = loader.load('/images/ow02.webp');
    art.colorSpace = THREE.SRGBColorSpace;
    box(1.34, 1.34, .07, palette.darkwood, -3.4, 3.5, -3.92, group);
    box(1.22, 1.22, .008, surface('#d1c4a8', .95), -3.4, 3.5, -3.879, group, 0);
    const canvasGeometry = new THREE.PlaneGeometry(1.08, 1.08, 8, 8);
    const artUV = canvasGeometry.getAttribute('uv');
    // Inset corners exclude the easel and canvas edges; subdivision keeps the crop smooth.
    const topLeft = new THREE.Vector2(300 / 1600, 1 - 99 / 1260);
    const topRight = new THREE.Vector2(1268 / 1600, 1 - 80 / 1260);
    const bottomLeft = new THREE.Vector2(344 / 1600, 1 - 1040 / 1260);
    const bottomRight = new THREE.Vector2(1271 / 1600, 1 - 1018 / 1260);
    for (let i = 0; i < artUV.count; i++) {
        const u = artUV.getX(i), v = artUV.getY(i);
        const top = topLeft.clone().lerp(topRight, u);
        const bottom = bottomLeft.clone().lerp(bottomRight, u);
        const source = bottom.lerp(top, v);
        artUV.setXY(i, source.x, source.y);
    }
    const canvasPrint = mesh(canvasGeometry, new THREE.MeshStandardMaterial({ map: art, roughness: .94 }), [-3.4, 3.5, -3.873], group);
    canvasPrint.castShadow = false;
    const pottery = {
        ceramic: new THREE.MeshStandardMaterial({ map: ceramicTexture(), roughness: .38, bumpMap: plasterGrain, bumpScale: .0012 }),
        clay: surface('#947456', .95),
        wood: palette.walnut,
    };
    const arrangement = createVaseArrangement(pottery);
    arrangement.position.set(1.08, 1.48, -3.30);
    group.add(arrangement);
    // The counter is a thick oak slab over a fluted, moss-green base.
    const baseMaterial = new THREE.MeshStandardMaterial({ color: '#354238', roughness: .72 });
    box(8.6, 1.65, 1.08, baseMaterial, 0, .82, -.15, group, .025);
    for (let x = -4.13; x < 4.2; x += .17)
        box(.07, 1.53, .06, palette.walnut, x, .82, .412, group, .014);
    box(8.95, .18, 1.75, palette.wood, 0, 1.75, -.12, group, .07);
    box(8.91, .018, 1.70, palette.brass, 0, 1.657, -.12, group, .009);
    group.add(createFootRail(palette.brass));
    for (const [name, seat] of Object.entries(seats)) {
        const stool = placeProp(props.stool, 1.16, seat.stool, seat.stool.x * .06, group);
        interactive(name as SeatName, stool, new THREE.Vector3(seat.stool.x, 1.2, seat.stool.z));
    }
    for (const x of [-2.8, 0, 3.35])
        pendant(x, 4.38, -.15, group);
    // A real menu on the counter. Both raycasting and keyboard controls can pick it up.
    const menu = new THREE.Group();
    menu.position.set(.12, 1.86, .05);
    menu.rotation.set(0, -.16, 0);
    group.add(menu);
    box(1.12, .040, 1.43, palette.leather, 0, 0, 0, menu, .016);
    const paper = mesh(paperGeometry(1.05, 1.36), new THREE.MeshStandardMaterial({ map: menuTexture(), roughness: .94, side: THREE.DoubleSide }), [0, .024, 0], menu);
    paper.castShadow = true;
    for (const z of [-.58, .58]) {
        box(.092, .008, .037, palette.brass, -.49, .032, z, menu, .003);
        box(.008, .045, .037, palette.brass, -.535, .013, z, menu, .002);
        cylinder(.008, .008, .004, palette.brass, -.514, .038, z, menu, 12);
    }
    interactive('menu', menu, new THREE.Vector3(.1, 1.93, .15));
    const notebookLabel = labelTexture('Little\nideas', 'SKETCHES & SIDE QUESTS', '#314944', '#cbb893');
    const notebook = createNotebook(notebookLabel, plasterGrain);
    notebook.position.set(-1.5, 1.86, .16);
    notebook.rotation.y = .22;
    group.add(notebook);
    const pencil = new THREE.Group();
    pencil.position.set(.47, .045, 0);
    pencil.rotation.set(Math.PI / 2, 0, .12);
    notebook.add(pencil);
    cylinder(.014, .014, .59, surface('#ba914f', .78), 0, .025, 0, pencil, 6);
    cylinder(.014, .0025, .085, surface('#c3a578', .93), 0, -.3125, 0, pencil, 6);
    cylinder(.003, 0, .023, surface('#393c37', .7), 0, -.3665, 0, pencil, 6);
    interactive('notebook', notebook, new THREE.Vector3(-1.5, 1.93, .16));
    coffee(1.25, 1.84, .22, group);
    // Record player: wood plinth, grooved vinyl, center label, and a metal tonearm.
    const record = new THREE.Group();
    record.position.set(3.03, 1.86, .03);
    record.rotation.y = -.08;
    group.add(record);
    box(1.18, .16, .92, palette.walnut, 0, .04, 0, record, .045);
    box(1.10, .028, .85, palette.black, 0, .132, 0, record, .025);
    for (const x of [-.46, .46])
        for (const z of [-.32, .32])
            cylinder(.055, .06, .045, palette.black, x, -.057, z, record, 16);
    cylinder(.382, .382, .034, palette.metal, -.10, .155, 0, record, 64);
    for (let i = 0; i < 64; i++) {
        const a = i / 64 * Math.PI * 2;
        box(.011, .012, .008, palette.black, -.10 + Math.cos(a) * .38, .16, Math.sin(a) * .38, record, 0).rotation.y = -a;
    }
    const vinyl = new THREE.Group();
    vinyl.position.set(-.10, .184, 0);
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
    cylinder(.062, .076, .036, palette.metal, .42, .168, -.29, record, 24);
    cylinder(.038, .04, .095, palette.black, .42, .22, -.29, record, 20);
    const counterweight = cylinder(.045, .045, .10, palette.metal, .435, .277, -.355, record, 24);
    counterweight.rotation.x = Math.PI / 2;
    line([[.435, .277, -.39], [.42, .277, -.27], [.29, .277, .18], [.14, .254, .22]], .012, palette.metal, record);
    box(.067, .029, .093, palette.black, .14, .247, .24, record, .008);
    box(.045, .016, .043, palette.cream, .14, .225, .265, record, .003);
    line([[.157, .259, .23], [.21, .271, .245], [.22, .29, .25]], .004, palette.metal, record);
    cylinder(.018, .025, .05, palette.black, .345, .18, .05, record, 12);
    line([[.345, .21, .05], [.325, .245, .07]], .004, palette.metal, record);
    for (let i = 0; i < 3; i++)
        cylinder(.027, .027, .018, palette.brass, .33 + i * .08, .16, .33, record, 16);
    for (const x of [-.46, .46])
        for (const z of [-.32, .32]) {
            cylinder(.013, .013, .003, palette.metal, x, .15, z, record, 12);
            box(.014, .002, .003, palette.black, x, .153, z, record, 0);
        }
    box(.16, .003, .055, palette.brass, -.37, .15, .355, record, .002);
    interactive('record', record, new THREE.Vector3(3.03, 2, .03));
    const cat = catModel.root;
    cat.position.set(-3.28, 1.94, .02);
    cat.rotation.y = -.1;
    group.add(cat);
    interactive('cat', cat, new THREE.Vector3(-3.25, 2.51, .12));
    // Personal postcard, utensils, condiments, flowers, and a small warm lamp.
    const about = new THREE.Group();
    about.position.set(-.65, 1.5, -3.2);
    about.rotation.y = .12;
    group.add(about);
    box(.65, .53, .07, palette.brass, 0, .26, 0, about, .015);
    const portrait = loader.load('/images/profile.webp', texture => {
        // Cover the frame without squeezing the landscape photo; keep Felix centered.
        const image = texture.image as HTMLImageElement;
        texture.repeat.x = (.56 / .44) / (image.width / image.height);
        texture.offset.x = .53 - texture.repeat.x / 2;
    });
    portrait.colorSpace = THREE.SRGBColorSpace;
    texturePlane(portrait, .56, .44, 0, .26, .045, about);
    interactive('about', about, new THREE.Vector3(-.65, 1.92, -3.15));
    const utensils = createUtensilHolder(pottery);
    utensils.position.set(1.95, 1.84, -.54);
    utensils.rotation.y = .3;
    group.add(utensils);
    bottle(1.65, 1.84, -.56, .30, '#4c3925', group);
    placeProp(props.plant, .98, new THREE.Vector3(-4.83, 1.68, -.2), .25, group);
    placeProp(props.plant, .96, new THREE.Vector3(4.28, 1.48, -3.1), 2.2, group);
    placeProp(props.kettle, .65, new THREE.Vector3(.42, 1.48, -3.15), -.45, group);
    const lamp = new THREE.Group();
    lamp.position.set(-4.04, 1.5, -3.2);
    group.add(lamp);
    cylinder(.20, .23, .04, palette.brass, 0, .02, 0, lamp);
    cylinder(.045, .075, .54, palette.brass, 0, .3, 0, lamp);
    const shadeProfile = [new THREE.Vector2(0, .20), new THREE.Vector2(.1, .19), new THREE.Vector2(.26, .1), new THREE.Vector2(.33, 0)];
    mesh(new THREE.LatheGeometry(shadeProfile, 40), palette.leather, [0, .62, 0], lamp);
    cylinder(.30, .30, .015, palette.glow, 0, .62, 0, lamp);
    addCounterDetails(group, props);
    const entrance = addFurnishings(group, palette, doorGlassTexture());
    interactive('door', entrance.leaf, new THREE.Vector3(-4.69, 1.5, 3.20));
    // An aperture mask keeps the exterior recess inside the real doorway silhouette.
    const doorstep = new THREE.Group();
    doorstep.name = 'Doorstep';
    const night = new THREE.MeshBasicMaterial({ map: doorwayNightTexture(), side: THREE.BackSide, toneMapped: false });
    const street = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 6, 32, 1, true, Math.PI, Math.PI), night);
    street.name = 'Distant night street';
    street.position.set(-5.025, 3, 2.65);
    doorstep.add(street);
    box(3, .08, 6, surface('#303b39', .48), -6.525, -.005, 2.65, doorstep, 0);
    doorstep.visible = false;
    group.add(doorstep);
    // Floating steam is rendered inside the room, not layered onto the page.
    const soft = softTexture();
    const doorstepShadow = new THREE.Mesh(new THREE.PlaneGeometry(.85, .72), new THREE.MeshBasicMaterial({ map: soft, color: '#0b1315', transparent: true, opacity: .56, depthWrite: false }));
    doorstepShadow.rotation.x = -Math.PI / 2;
    doorstepShadow.position.set(-5.60, .038, 2.65);
    doorstep.add(doorstepShadow);
    maskDoorwayContent(doorstep);
    doorstep.add(createDoorwayMask());
    const ceiling = createSeatedCeiling(props.wood.color, soft);
    const sideWall = createSeatedSideWall(props.wood.color, plasterGrain, soft);
    group.add(ceiling.group, sideWall.group);
    addContactShadows(group, soft);
    const sconceGlow = mesh(new THREE.PlaneGeometry(1.55, 1.6), new THREE.MeshBasicMaterial({ map: soft, color: '#ffbd78', transparent: true, opacity: .16, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), [-5.005, 4.03, 2.65], group);
    sconceGlow.rotation.y = Math.PI / 2;
    sconceGlow.castShadow = false;
    const steam: THREE.Sprite[] = [];
    for (let i = 0; i < 4; i++) {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft, color: '#d6c6b0', transparent: true, opacity: .12, depthWrite: false }));
        s.position.set(1.25, 2.15 + i * .085, .22);
        s.scale.set(.11 + i * .012, .19 + i * .015, 1);
        group.add(s);
        steam.push(s);
    }
    const rain = createWindowRain();
    group.add(rain.mesh);
    const lights: THREE.Light[] = [];
    const ambient = new THREE.HemisphereLight('#f0dcc0', '#4c3930', .65);
    group.add(ambient);
    for (const x of [-2.8, 0, 3.35]) {
        const light = new THREE.SpotLight('#ffd092', 15, 12, Math.PI * .34, .72, 1.5);
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
    const softFront = new THREE.RectAreaLight('#efdbbf', 1.1, 8, 5);
    softFront.position.set(0, 4, 5);
    softFront.lookAt(0, 1, 0);
    group.add(softFront);
    const signGlow = new THREE.PointLight('#f3a46c', 1.1, 5, 2);
    signGlow.position.set(-.5, 3.45, -3.6);
    group.add(signGlow);
    // Batch the rigid pieces inside clickable props too. Only the record spins;
    // the independently animated cat already arrives in material batches.
    batchStaticMeshes(vinyl, []);
    for (const object of interactives) {
        if (object === cat)
            continue;
        batchStaticMeshes(object as THREE.Group, [vinyl]);
        object.traverse(child => { child.userData.action = object.userData.action; });
    }
    return { group, targets, interactives, cat: catModel.body, vinyl, steam, rain, ceiling, sideWall, lights, entrance, doorstep };
}
function addCounterDetails(parent: THREE.Object3D, props: DinerProps) {
    const bowl = placeProp(props.ramen, .34, new THREE.Vector3(-1.63, 1.85, -.59), .3, parent);
    for (const offset of [-.035, .035]) {
        const stick = cylinder(.007, .01, .79, palette.walnut, offset, .32, 0, bowl, 6);
        stick.rotation.set(Math.PI / 2, 0, .7);
    }
    // Folded linen under the cup; deliberately tiny geometry instead of simulated cloth.
    const cloth = surface('#b5a58a', .96);
    cloth.side = THREE.DoubleSide;
    const napkin = mesh(linenGeometry(.56, .47), cloth, [1.28, 1.843, .20], parent);
    napkin.rotation.y = .2;
    const receipt = new THREE.Group();
    receipt.position.set(2.14, 1.85, .29);
    receipt.rotation.y = -.24;
    parent.add(receipt);
    mesh(paperGeometry(.31, .45, .008), new THREE.MeshStandardMaterial({ map: labelTexture('Good\ncompany.', 'NO RESERVATION NEEDED', '#ddcfb2', '#826c4e'), roughness: .96, side: THREE.DoubleSide }), [0, .002, 0], receipt);
}
