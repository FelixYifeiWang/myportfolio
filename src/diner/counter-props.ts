import * as THREE from 'three';

type Materials = { ceramic: THREE.MeshStandardMaterial; clay: THREE.MeshStandardMaterial; wood: THREE.MeshStandardMaterial };
const up = new THREE.Vector3(0, 1, 0);

function add(parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, name: string) {
    const object = new THREE.Mesh(geometry, material);
    object.name = name;
    object.castShadow = object.receiveShadow = true;
    parent.add(object);
    return object;
}

function vessel(parent: THREE.Group, profile: number[][], material: THREE.Material) {
    const geometry = new THREE.LatheGeometry(profile.map(([radius, y]) => new THREE.Vector2(radius, y)), 48);
    return add(parent, geometry, material, 'Open ceramic vessel');
}

/** A softly thrown bottle vase; the profile continues over the lip and down the inside. */
export function createVaseArrangement(materials: Materials) {
    const group = new THREE.Group();
    group.name = 'Ceramic vase and olive cuttings';
    vessel(group, [
        [0, .012], [.105, .012], [.126, .018], [.145, .038], [.160, .07],
        [.173, .12], [.179, .18], [.176, .24], [.162, .30], [.138, .354],
        [.106, .395], [.077, .427], [.063, .451], [.060, .479], [.061, .511],
        [.064, .522], [.062, .530], [.056, .533], [.050, .529], [.048, .521],
        [.048, .480], [.052, .452], [.067, .425], [.094, .391], [.128, .347],
        [.148, .294], [.161, .234], [.162, .175], [.151, .107], [.128, .052], [.10, .034], [0, .034],
    ], materials.ceramic);
    add(group, new THREE.LatheGeometry([[.10, 0], [.119, 0], [.127, .008], [.127, .020], [.113, .025], [.10, .025]].map(([r, y]) => new THREE.Vector2(r, y)), 48), materials.clay, 'Unglazed foot');

    const stem = new THREE.MeshStandardMaterial({ color: '#656044', roughness: .94 });
    const foliage = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .82, side: THREE.DoubleSide, vertexColors: true });
    const branches = [
        [[-.021, .10, -.008], [-.025, .53, -.006], [-.10, .78, -.03], [-.22, 1.06, -.015]],
        [[.014, .10, .008], [.016, .53, .009], [.12, .77, .025], [.20, .98, .075]],
        [[.0, .10, -.018], [.006, .53, -.015], [.043, .83, -.08], [.09, 1.12, -.10]],
    ];
    branches.forEach((points, branchIndex) => {
        const curve = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point as [number, number, number])));
        add(group, new THREE.TubeGeometry(curve, 20, .0032, 5, false), stem, 'Olive stem');
        // Leaves grow alternately along the stem, with open space between their silhouettes.
        for (let i = 0; i < 7; i++) {
            const t = .51 + i * .069;
            const base = curve.getPoint(t);
            const side = i % 2 ? 1 : -1;
            const angle = branchIndex * 1.2 + (i % 3 - 1) * .32;
            const direction = new THREE.Vector3(side * Math.cos(angle), .28 + .07 * (i % 3), Math.sin(angle) * side).normalize();
            const length = .205 - i * .012 + branchIndex * .009;
            const width = length * .21;
            const petioleEnd = base.clone().addScaledVector(direction, .018);
            add(group, new THREE.TubeGeometry(new THREE.LineCurve3(base, petioleEnd), 1, .0017, 4, false), stem, 'Leaf petiole');
            const leaf = add(group, leafGeometry(length, width, branchIndex + i), foliage, 'Olive leaf');
            leaf.position.copy(petioleEnd);
            leaf.quaternion.setFromUnitVectors(up, direction);
            leaf.rotateY((i % 3 - 1) * .5);
        }
    });
    return group;
}

/** A pointed blade with a center fold and a slight curl, colored across the surface. */
function leafGeometry(length: number, halfWidth: number, variation: number) {
    const positions: number[] = [], colors: number[] = [], indices: number[] = [], uv: number[] = [];
    const rows = 10, columns = 4;
    const dark = new THREE.Color('#4b654f'), light = new THREE.Color('#829176');
    for (let row = 0; row <= rows; row++) {
        const t = row / rows;
        const width = Math.pow(Math.sin(Math.PI * t), .8) * halfWidth;
        for (let column = 0; column <= columns; column++) {
            const across = column / columns * 2 - 1;
            const curl = length * (.12 * Math.sin(t * Math.PI) - .20 * t * t);
            positions.push(across * width, t * length, curl + Math.abs(across) * width * .28);
            const tone = .24 + (1 - Math.abs(across)) * .24 + t * .19 + (variation % 3) * .035;
            const color = dark.clone().lerp(light, tone);
            colors.push(color.r, color.g, color.b);
            uv.push(column / columns, t);
            if (row < rows && column < columns) {
                const a = row * (columns + 1) + column, b = a + columns + 1;
                indices.push(a, b, a + 1, a + 1, b, b + 1);
            }
        }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
}

/** A hollow glazed crock and a restrained fan of tapered, rounded wooden chopsticks. */
export function createUtensilHolder(materials: Materials) {
    const group = new THREE.Group();
    group.name = 'Ceramic chopstick crock';
    vessel(group, [
        [0, .006], [.075, .006], [.091, .011], [.100, .025], [.105, .055],
        [.108, .13], [.111, .218], [.115, .248], [.116, .258], [.112, .266],
        [.104, .269], [.097, .265], [.094, .258], [.094, .248], [.092, .218],
        [.089, .13], [.085, .050], [.078, .033], [0, .033],
    ], materials.ceramic);
    add(group, new THREE.LatheGeometry([[.073, 0], [.086, 0], [.093, .009], [.093, .018], [.08, .021]].map(([r, y]) => new THREE.Vector2(r, y)), 40), materials.clay, 'Unglazed foot');
    const tips = [
        [-.082, .558, -.025], [-.055, .586, -.053], [-.019, .568, -.045],
        [.023, .580, -.056], [.062, .55, -.025], [.083, .571, .015],
        [.021, .537, .039], [-.038, .545, .04],
    ];
    tips.forEach(([x, y, z], index) => {
        const bottom = new THREE.Vector3(x * .23, .035, z * .23);
        const top = new THREE.Vector3(x, y, z);
        const length = bottom.distanceTo(top);
        const profile = [[0, 0], [.0038, .002], [.0047, .012], [.0068, length - .03], [.007, length - .006], [.0059, length - .001], [0, length]];
        const stick = add(group, new THREE.LatheGeometry(profile.map(([r, h]) => new THREE.Vector2(r, h)), 8), materials.wood, 'Tapered chopstick');
        stick.position.copy(bottom);
        stick.quaternion.setFromUnitVectors(up, top.clone().sub(bottom).normalize());
        stick.rotateY(index * .37);
    });
    return group;
}
