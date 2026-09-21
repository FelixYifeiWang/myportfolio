import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { VisitorLibrary, prepareVisitor } from '../src/diner/visitor-assets.ts';

const spec = { id: 'a', name: 'Test', url: '/a.glb', height: 1.4, rotation: Math.PI / 2 };
function model() { const root = new THREE.Group(); root.add(new THREE.Mesh(new THREE.BoxGeometry(1, 2, .5), new THREE.MeshStandardMaterial())); return root; }

test('visitor fitting rests feet on the threshold and respects the doorway width', () => {
  const asset = prepareVisitor(model(), spec);
  const bounds = new THREE.Box3().setFromObject(asset);
  assert.ok(Math.abs(bounds.min.y) < 1e-5);
  assert.ok(Math.abs(bounds.max.y - 1.4) < 1e-5);
  assert.ok(bounds.getSize(new THREE.Vector3()).z <= 1.42);
});
test('repeated and simultaneous requests reuse a single prepared model', async () => {
  let loads = 0;
  const library = new VisitorLibrary([spec], async () => { loads++; return model(); });
  const [a, b] = await Promise.all([library.load('a'), library.load('a')]);
  assert.equal(a, b);
  assert.equal(await library.load('a'), a);
  assert.equal(loads, 1);
  library.dispose();
});
test('failed downloads can be retried', async () => {
  let loads = 0;
  const library = new VisitorLibrary([spec], async () => { if (!loads++) throw new Error('offline'); return model(); });
  await assert.rejects(library.load('a'), /offline/);
  assert.ok(await library.load('a'));
  library.dispose();
});
test('cache retires old models while keeping the attached visitor alive', async () => {
  const library = new VisitorLibrary(['a','b','c'].map(id => ({ ...spec,id })), async () => model());
  const a = await library.load('a');
  let retired = false;
  a.traverse(o => { if (o.isMesh) o.geometry.addEventListener('dispose', () => { retired = true; }); });
  new THREE.Group().add(a);
  await library.load('b'); await library.load('c');
  assert.equal(retired, false);
  library.dispose();
  assert.equal(retired, true);
});
test('disposing during a download releases its result and prevents future loads', async () => {
  let resolve;
  const root = model(); let retired = false;
  root.children[0].geometry.addEventListener('dispose', () => { retired = true; });
  const library = new VisitorLibrary([spec], () => new Promise(done => { resolve = done; }));
  const pending = library.load('a'); library.dispose(); resolve(root);
  await assert.rejects(pending, /disposed/);
  assert.equal(retired, true);
  await assert.rejects(library.load('a'), /disposed/);
});

test('fitting preserves an imported model origin and nonzero root transform', () => {
  const source = model(); source.position.set(10, 8, -5); source.rotation.x = .2;
  const asset = prepareVisitor(source, spec);
  const bounds = new THREE.Box3().setFromObject(asset, true);
  assert.ok(Math.abs(bounds.min.y) < 1e-5);
  assert.ok(Math.abs(bounds.getCenter(new THREE.Vector3()).x) < 1e-5);
  assert.ok(Math.abs(bounds.getCenter(new THREE.Vector3()).z) < 1e-5);
});
test('floating visitors retain their configured ground clearance', () => {
  const asset = prepareVisitor(model(), { ...spec, elevation: 1.25 });
  assert.ok(Math.abs(new THREE.Box3().setFromObject(asset).min.y - 1.25) < 1e-5);
});

test('oversized source requests are capped at human height without stretching', () => {
  const source = new THREE.Group();
  source.add(new THREE.Mesh(new THREE.BoxGeometry(.4, 10, .3), new THREE.MeshStandardMaterial()));
  const asset = prepareVisitor(source, { ...spec, height: 10, rotation: 0 });
  const size = new THREE.Box3().setFromObject(asset).getSize(new THREE.Vector3());
  assert.ok(Math.abs(size.y - 2.8) < 1e-5);
  assert.ok(Math.abs(size.x / size.y - .04) < 1e-5);
});

test('departed visitors release geometry, material and texture exactly once', async () => {
  const source = model(), mesh = source.children[0];
  mesh.material.map = new THREE.Texture();
  const retired = { geometry: 0, material: 0, texture: 0 };
  mesh.geometry.addEventListener('dispose', () => retired.geometry++);
  mesh.material.addEventListener('dispose', () => retired.material++);
  mesh.material.map.addEventListener('dispose', () => retired.texture++);
  const library = new VisitorLibrary([spec], async () => source);
  const visitor = await library.load('a');
  new THREE.Group().add(visitor);
  library.release(visitor);
  assert.equal(visitor.parent, null);
  library.release(visitor); library.dispose();
  assert.deepEqual(retired, { geometry: 1, material: 1, texture: 1 });
});

test('decoded visitors wait for idle and are released if disposed while waiting', async () => {
  let resume;
  const source = model(); let retired = false;
  source.children[0].geometry.addEventListener('dispose', () => { retired = true; });
  const library = new VisitorLibrary([spec], async () => source, { checkpoint: () => new Promise(resolve => { resume = resolve; }) });
  const pending = library.load('a');
  await Promise.resolve();
  library.dispose();
  resume();
  await assert.rejects(pending, /disposed/);
  assert.equal(retired, true);
});
