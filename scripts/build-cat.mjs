/** Original diner cat sculpt. Run with `npm run build:cat`; no browser work at runtime. */
import * as T from 'three';
import { MarchingCubes } from 'three/addons/objects/MarchingCubes.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';
// GLTFExporter needs only this FileReader operation when exporting geometry without images.
globalThis.FileReader = class {
    readAsArrayBuffer(blob) { blob.arrayBuffer().then(buffer => { this.result = buffer; this.onloadend?.(); }); }
};
const root = new T.Group();
root.name = 'DinerCat';
const body = new T.Group();
body.name = 'CatBreathingBody';
root.add(body);
const head = new T.Group();
head.name = 'CatHead';
head.position.set(-.405, .285, .235);
head.rotation.set(.11, .19, -.09);
root.add(head);
const fur = new T.MeshStandardMaterial({ name: 'Painted short fur', vertexColors: true, roughness: .92 });
const coatMaterial = new T.MeshStandardMaterial({ name: 'White coat', roughness: .92 });
const faceMaterial = new T.MeshStandardMaterial({ name: 'White face', roughness: .92 });
const fabric = new T.MeshStandardMaterial({ name: 'Woven velvet', vertexColors: true, roughness: 1 });
const features = new T.MeshStandardMaterial({ name: 'Nose and eyelids', vertexColors: true, roughness: .48 });
const warm = new T.Color('#e0ded8'), cream = new T.Color('#eeeae2');
const clamp = T.MathUtils.clamp;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a.clone().lerp(b, clamp(t, 0, 1));
function ell(x, y, z, c, r) {
    const q = [(x - c[0]) / r[0], (y - c[1]) / r[1], (z - c[2]) / r[2]];
    const k0 = Math.hypot(...q), k1 = Math.hypot(q[0] / r[0], q[1] / r[1], q[2] / r[2]);
    return k1 === 0 ? -Math.min(...r) : k0 * (k0 - 1) / k1;
}
function union(a, b, k = .05) { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * .25; }
function sculpt(name, res, bounds, sdf, paint, parent = body) {
    const mc = new MarchingCubes(res, fur, false, false, 100000);
    mc.isolation = 0;
    const size = bounds[1].map((v, i) => v - bounds[0][i]);
    for (let z = 0; z < res; z++)
        for (let y = 0; y < res; y++)
            for (let x = 0; x < res; x++) {
                const px = bounds[0][0] + x / res * size[0], py = bounds[0][1] + y / res * size[1], pz = bounds[0][2] + z / res * size[2];
                mc.field[x + y * res + z * res * res] = -sdf(px, py, pz);
            }
    mc.update();
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(mc.positionArray.slice(0, mc.count * 3), 3));
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++)
        p.setXYZ(i, bounds[0][0] + (p.getX(i) + 1) * .5 * size[0], bounds[0][1] + (p.getY(i) + 1) * .5 * size[1], bounds[0][2] + (p.getZ(i) + 1) * .5 * size[2]);
    // Weld first, then average normals; the surface remains smooth across cube boundaries.
    const welded = mergeVertices(geo, 1e-5);
    geo.dispose();
    mc.geometry.dispose();
    welded.computeVertexNormals();
    colorGeometry(welded, paint);
    const mesh = new T.Mesh(welded, fur);
    mesh.name = name;
    parent.add(mesh);
    return mesh;
}
function colorGeometry(geo, paint) {
    const p = geo.attributes.position, colors = new Uint8Array(p.count * 3), uv = new Float32Array(p.count * 2);
    for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i), c = typeof paint === 'function' ? paint(x, y, z) : new T.Color(paint);
        colors[i * 3] = Math.round(clamp(c.r, 0, 1) * 255);
        colors[i * 3 + 1] = Math.round(clamp(c.g, 0, 1) * 255);
        colors[i * 3 + 2] = Math.round(clamp(c.b, 0, 1) * 255);
        uv[i * 2] = .5 + x * .5 + z * .15;
        uv[i * 2 + 1] = .5 + y * .5 + z * .2;
    }
    geo.setAttribute('color', new T.BufferAttribute(colors, 3, true));
    geo.setAttribute('uv', new T.BufferAttribute(uv, 2));
    return geo;
}
function bodyPaint(x, y, z) {
    const c = warm.clone();
    const underside = (1 - smooth(.08, .24, y)) * .16;
    c.lerp(new T.Color('#bfc1bf'), underside);
    const chest = (1 - smooth(-.35, -.1, x)) * smooth(.03, .2, z);
    c.lerp(cream, chest * .45);
    return c.multiplyScalar(1 + Math.sin(x * 81 + y * 27 + z * 40) * .006);
}
const torso = sculpt('Sculpted torso', 42, [[-.53, -.03, -.43], [.66, .57, .40]], (x, y, z) => {
    let d = ell(x, y, z, [.08, .235, -.045], [.42, .205, .285]);
    d = union(d, ell(x, y, z, [.32, .228, -.04], [.255, .232, .285]), .105);
    d = union(d, ell(x, y, z, [-.22, .25, .025], [.215, .185, .235]), .10);
    d = union(d, ell(x, y, z, [.30, .12, .205], [.22, .10, .15]), .055);
    d = union(d, ell(x, y, z, [-.325, .205, .15], [.13, .14, .13]), .065);
    return Math.max(d, -y + .045);
}, bodyPaint);
function headPaint(x, y, z) {
    const c = warm.clone();
    c.lerp(cream, smooth(.08, .19, z) * (1 - smooth(-.08, .04, y)) * .6);
    c.lerp(new T.Color('#c7c9c7'), smooth(.12, .21, Math.abs(x)) * .08);
    return c;
}
function headSdf(x, y, z) {
    let d = ell(x, y, z, [0, .02, 0], [.222, .185, .185]);
    d = union(d, ell(x, y, z, [-.13, -.046, .067], [.104, .092, .119]), .045);
    d = union(d, ell(x, y, z, [.13, -.046, .067], [.104, .092, .119]), .045);
    for (const side of [-1, 1])
        d = union(d, ell(x, y, z, [side * .047, -.071, .173], [.065, .049, .069]), .032);
    d = union(d, ell(x, y, z, [0, -.12, .137], [.071, .027, .065]), .025);
    return d;
}
const face = sculpt('Sculpted face', 46, [[-.31, -.18, -.24], [.31, .26, .29]], headSdf, headPaint, head);
function faceDepth(x, y) {
    let inside = 0, outside = .30;
    for (let i = 0; i < 18; i++) {
        const z = (inside + outside) * .5;
        if (headSdf(x, y, z) > 0)
            outside = z;
        else
            inside = z;
    }
    return (inside + outside) * .5;
}
// Texture coordinates follow the torso and skull, independent of mesh density.
function surfaceUV(mesh, project, axis) {
    const g = mesh.geometry.toNonIndexed(), p = g.attributes.position, uv = new Float32Array(p.count * 2);
    for (let i = 0; i < p.count; i++) {
        const v = project(p.getX(i), p.getY(i), p.getZ(i));
        uv[i * 2] = v[0];
        uv[i * 2 + 1] = v[1];
    }
    for (let i = 0; i < p.count; i += 3) {
        const a = uv[i * 2 + axis], b = uv[(i + 1) * 2 + axis], c = uv[(i + 2) * 2 + axis];
        if (Math.max(a, b, c) - Math.min(a, b, c) > .5) {
            for (let j = 0; j < 3; j++)
                if (uv[(i + j) * 2 + axis] < .5)
                    uv[(i + j) * 2 + axis] += 1;
        }
    }
    g.setAttribute('uv', new T.BufferAttribute(uv, 2));
    mesh.geometry.dispose();
    mesh.geometry = g;
}
torso.material = coatMaterial;
surfaceUV(torso, (x, y, z) => [(x + .6) / 1.4, (Math.atan2(z + .045, y - .245) + Math.PI) / (Math.PI * 2)], 1);
face.material = faceMaterial;
surfaceUV(face, (x, y, z) => [.5 + Math.atan2(x, z) / (Math.PI * 2), .5 + Math.asin(clamp((y - .015) / Math.hypot(x, y - .015, z), -1, 1)) / Math.PI], 0);
// Forelegs settle into the cushion; the toes are part of their sculpted surface.
for (const side of [-1, 1]) {
    const cx = side === -1 ? -.395 : -.185, cz = side === -1 ? .29 : .315;
    sculpt(`Front paw ${side}`, 24, [[cx - .14, .012, cz - .16], [cx + .14, .19, cz + .15]], (x, y, z) => {
        let d = ell(x, y, z, [cx, .079, cz], [.103, .050, .112]);
        d = union(d, ell(x, y, z, [cx + .025, .112, cz - .065], [.073, .052, .078]), .03);
        for (let i = -1; i <= 1; i++)
            d = union(d, ell(x, y, z, [cx + i * .04, .061, cz + .08], [.027, .028, .043]), .012);
        return d;
    }, (x, y, z) => mix(cream, warm, smooth(.10, .17, y) * .8));
}
function paintedMesh(name, geo, color, parent = head, material = fur) { colorGeometry(geo, color); const m = new T.Mesh(geo, material); m.name = name; parent.add(m); return m; }
function tube(name, points, radius, color, parent = head, material = fur, segments = 24) {
    const path = new T.CatmullRomCurve3(points.map(p => new T.Vector3(...p)));
    return paintedMesh(name, new T.TubeGeometry(path, segments, radius, 5, false), color, parent, material);
}
// A variable-radius sweep gives the tail a natural taper and a tucked tip.
const tailPath = new T.CatmullRomCurve3([[.41, .15, -.17], [.60, .10, -.015], [.55, .075, .235], [.31, .067, .375], [.055, .059, .405], [-.125, .073, .337]].map(p => new T.Vector3(...p)));
const tailGeo = new T.TubeGeometry(tailPath, 72, .075, 10, false);
const tailPos = tailGeo.attributes.position;
for (let i = 0; i <= 72; i++) {
    const t = i / 72, center = tailPath.getPointAt(t), r = 1 - .70 * t * t;
    for (let j = 0; j <= 10; j++) {
        const k = i * 11 + j;
        tailPos.setXYZ(k, center.x + (tailPos.getX(k) - center.x) * r, center.y + (tailPos.getY(k) - center.y) * r, center.z + (tailPos.getZ(k) - center.z) * r);
    }
}
tailGeo.computeVertexNormals();
for (const [t, r] of [[0, .075], [1, .0225]]) {
    const cap = paintedMesh('Rounded tail end', new T.SphereGeometry(r, 16, 10), t ? cream : warm, root);
    cap.position.copy(tailPath.getPointAt(t));
}
paintedMesh('Tapered curled tail', tailGeo, (x, y, z) => {
    return mix(warm, cream, smooth(-.05, -.2, x) * .45);
}, root);
// Curved, concave ear cups with a real rim and a softly rounded triangular outline.
for (const side of [-1, 1]) {
    const earGroup = new T.Group();
    earGroup.name = side < 0 ? 'EarLeft' : 'EarRight';
    head.add(earGroup);
    const outline = new T.Shape();
    outline.moveTo(.095, .125);
    outline.bezierCurveTo(.115, .17, .174, .325, .199, .338);
    outline.bezierCurveTo(.225, .34, .254, .215, .251, .159);
    outline.bezierCurveTo(.245, .117, .15, .107, .095, .125);
    const contour = outline.getPoints(10), n = contour.length - 1, rings = 6;
    const pos = [], cols = [], indices = [];
    const center = new T.Vector2(.187, .205);
    const pink = new T.Color('#b58178');
    for (let back = 0; back < 2; back++)
        for (let ring = 0; ring <= rings; ring++)
            for (let j = 0; j < n; j++) {
                const t = ring / rings, p = center.clone().lerp(contour[j], t);
                const z = back ? -.045 + .012 * (1 - t * t) : .012 - .041 * (1 - t * t);
                pos.push(side * p.x, .125 + (p.y - .125) * .9, z);
                const inside = (1 - smooth(.66, .95, t)) * (1 - back);
                const color = mix(warm, pink, inside * .9);
                cols.push(Math.round(color.r * 255), Math.round(color.g * 255), Math.round(color.b * 255));
            }
    const frontSize = (rings + 1) * n;
    for (let back = 0; back < 2; back++)
        for (let r = 0; r < rings; r++)
            for (let j = 0; j < n; j++) {
                const a = back * frontSize + r * n + j, b = back * frontSize + r * n + (j + 1) % n, c = a + n, d = b + n;
                if ((side > 0) !== !!back)
                    indices.push(a, b, c, b, d, c);
                else
                    indices.push(a, c, b, b, c, d);
            }
    for (let j = 0; j < n; j++) {
        const a = rings * n + j, b = rings * n + (j + 1) % n;
        indices.push(a, b, a + frontSize, b, b + frontSize, a + frontSize);
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new T.BufferAttribute(new Uint8Array(cols), 3, true));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    const uv = new Float32Array(pos.length / 3 * 2);
    geo.setAttribute('uv', new T.BufferAttribute(uv, 2));
    const mesh = new T.Mesh(geo, fur);
    mesh.name = 'Sculpted ear';
    earGroup.add(mesh);
    for (let i = 0; i < 3; i++)
        tube('Ear furnishings', [[side * (.142 + i * .025), .149, .021], [side * (.163 + i * .014), .205 + i * .018, .008], [side * .192, .27 + i * .014, -.014]], .0011, '#f2eee5', earGroup, fur, 10);
}
for (const side of [-1, 1]) {
    const x = side * .095;
    const eyelid = [[-.052, .019], [-.023, .002], [.023, .001], [.052, .019]].map(([dx, y]) => {
        const px = x + side * dx;
        return [px, y, faceDepth(px, y) + .0017];
    });
    tube('Sleeping eyelid', eyelid, .0026, '#81716a', head, features, 24);
    // The cheek flecks and fine whiskers stay part of the same rigid head.
    for (let i = 0; i < 3; i++) {
        const dot = paintedMesh('Whisker follicle', new T.SphereGeometry(.0019, 8, 6), '#b39e97', head);
        dot.position.set(side * (.055 + i * .02), -.073 + (i % 2) * .013, .224 - i * .009);
        tube('Fine whisker', [[side * .062, -.070, .229], [side * .16, -.072 + i * .018, .239], [side * .295, -.1 + i * .036, .218]], .00085, '#f0ece2', head, fur, 14);
    }
    tube('Muzzle crease', [[0, -.078, .242], [0, -.092, .241], [side * .024, -.103, .234], [side * .046, -.093, .228]], .0021, '#8c6551', head, features, 14);
}
const noseShape = new T.Shape();
noseShape.moveTo(-.022, 0);
noseShape.quadraticCurveTo(-.027, .013, -.008, .013);
noseShape.lineTo(.017, .013);
noseShape.quadraticCurveTo(.027, .011, .019, -.002);
noseShape.lineTo(.004, -.017);
noseShape.quadraticCurveTo(0, -.022, -.007, -.014);
noseShape.closePath();
const nose = paintedMesh('Soft triangular nose', new T.ExtrudeGeometry(noseShape, { depth: .011, bevelEnabled: true, bevelThickness: .004, bevelSize: .003, bevelSegments: 2, steps: 1, curveSegments: 8 }), '#c88c8b', head, features);
nose.position.set(0, -.06, .23);
// A tailored cushion with a compressed top and sewn piping.
const cushion = new T.Group();
cushion.name = 'Cushion';
root.add(cushion);
const cg = new T.SphereGeometry(1, 64, 24), cp = cg.attributes.position;
for (let i = 0; i < cp.count; i++) {
    const x = cp.getX(i), y = cp.getY(i), z = cp.getZ(i), angle = Math.atan2(z, x);
    const fold = Math.sin(angle * 18) * .003 * (1 - y * y);
    cp.setXYZ(i, x * (.715 + fold), -.025 + y * .072, z * (.485 + fold));
}
cg.computeVertexNormals();
paintedMesh('Tailored velvet cushion', cg, (x, y, z) => new T.Color('#715044').multiplyScalar(1 + Math.sin(x * 360 + z * 72) * .018), cushion, fabric);
const seam = [];
for (let i = 0; i <= 80; i++) {
    const a = i / 80 * Math.PI * 2;
    seam.push([Math.cos(a) * .697, -.023, Math.sin(a) * .473]);
}
tube('Cushion piping', seam, .005, '#ad8166', cushion, fabric, 100);
// Batch rigid parts within each animated group; keep body, head and ears independent.
function batch(parent) {
    const groups = new Map();
    for (const object of [...parent.children]) {
        if (object.isGroup)
            batch(object);
        if (!object.isMesh)
            continue;
        object.updateMatrix();
        const geometry = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
        geometry.applyMatrix4(object.matrix);
        if (!geometry.attributes.uv)
            geometry.setAttribute('uv', new T.Float32BufferAttribute(new Float32Array(geometry.attributes.position.count * 2), 2));
        const list = groups.get(object.material) || [];
        list.push(geometry);
        groups.set(object.material, list);
        parent.remove(object);
    }
    for (const [material, geometries] of groups) {
        const merged = mergeGeometries(geometries, false), indexed = mergeVertices(merged, 1e-5);
        indexed.computeBoundingBox();
        indexed.computeBoundingSphere();
        const mesh = new T.Mesh(indexed, material);
        mesh.name = `${parent.name} surface`;
        parent.add(mesh);
        geometries.forEach(g => g.dispose());
        merged.dispose();
    }
}
batch(root);
let triangles = 0, vertices = 0, draws = 0;
root.traverse(o => { if (o.isMesh) {
    triangles += (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3;
    vertices += o.geometry.attributes.position.count;
    draws++;
} });
// glTF's standard quantized attributes preserve sub-millimeter detail at this scale.
root.traverse(o => {
    if (!o.isMesh)
        return;
    for (const key of ['position', 'normal']) {
        const a = o.geometry.attributes[key], data = new Int16Array(a.array.length), range = 32767;
        for (let i = 0; i < data.length; i++)
            data[i] = Math.round(clamp(a.array[i], -1, 1) * range);
        o.geometry.setAttribute(key, new T.BufferAttribute(data, a.itemSize, true));
    }
});
root.userData = { author: 'Original After Hours portfolio asset', triangles, vertices, draws };
// Bake high-resolution coat detail to compact textures, rather than adding hair geometry.
async function bakeTexture(path, width, height, sample) {
    const pixels = new Uint8Array(width * height * 3);
    for (let y = 0; y < height; y++)
        for (let x = 0; x < width; x++) {
            const u = x / width, v = 1 - y / height, c = sample(u, v);
            const fiber = Math.sin(x * 1.7 + Math.sin(y * .09) * 2.1) * Math.sin(y * 2.31 + x * .05) * .025;
            c.multiplyScalar(1 + fiber).convertLinearToSRGB();
            const i = (x + y * width) * 3;
            pixels[i] = clamp(c.r * 255, 0, 255);
            pixels[i + 1] = clamp(c.g * 255, 0, 255);
            pixels[i + 2] = clamp(c.b * 255, 0, 255);
        }
    await sharp(pixels, { raw: { width, height, channels: 3 } }).webp({ quality: 92 }).toFile(path);
}
mkdirSync('public/models', { recursive: true });
await bakeTexture('public/models/cat-coat.webp', 1536, 768, (u, v) => {
    const theta = v * Math.PI * 2 - Math.PI, x = u * 1.4 - .6;
    return bodyPaint(x, .245 + Math.cos(theta) * .23, -.045 + Math.sin(theta) * .31);
});
await bakeTexture('public/models/cat-face.webp', 1024, 1024, (u, v) => {
    const theta = (u - .5) * Math.PI * 2, phi = (v - .5) * Math.PI;
    return headPaint(Math.sin(theta) * Math.cos(phi) * .222, Math.sin(phi) * .19 + .015, Math.cos(theta) * Math.cos(phi) * .20);
});
const furSize = 512, furHeight = new Uint8Array(furSize * furSize);
for (let y = 0; y < furSize; y++)
    for (let x = 0; x < furSize; x++) {
        const flow = y + 3 * Math.sin(x * .024) + Math.sin(x * .077 + y * .037);
        const strand = Math.pow(Math.max(0, Math.cos(flow * Math.PI * .63)), 10);
        const length = .45 + .55 * Math.pow(Math.sin(x * .087 + y * 1.72), 2);
        furHeight[y * furSize + x] = Math.round(104 + strand * length * 78 + Math.sin(x * 2.1 + y * .41) * 5);
    }
await sharp(furHeight, { raw: { width: furSize, height: furSize, channels: 1 } }).webp({ quality: 92 }).toFile('public/models/cat-fur.webp');
const binary = await new GLTFExporter().parseAsync(root, { binary: true, onlyVisible: true });
mkdirSync('public/models', { recursive: true });
writeFileSync('public/models/diner-cat.glb', Buffer.from(binary));
writeFileSync('public/models/diner-cat.manifest.json', JSON.stringify({ triangles, vertices, draws, bytes: binary.byteLength }, null, 2) + '\n');
console.log({ triangles, vertices, draws, bytes: binary.byteLength });
