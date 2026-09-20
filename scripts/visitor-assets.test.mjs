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
