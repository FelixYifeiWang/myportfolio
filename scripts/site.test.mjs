import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

const out = resolve('dist');
const pages = ['/', '/work/echo-of-mobius/', '/work/dreamin-engine/', '/work/relicvr/', '/work/orpheus/', '/work/undecimber/'];
for (const route of pages) {
  test(`${route} has readable content and an accessible document`, () => {
    const html = readFileSync(join(out, route, 'index.html'), 'utf8');
    assert.match(html, /<html[^>]*lang="en"/);
    assert.match(html, /<h1[ >]/);
    assert.match(html, /<main[ >]/);
    assert.match(html, /name="description"/);
    assert.ok(!html.includes('TODO'));
  });
}
test('every local link, image, stylesheet, and anchor has a destination', () => {
  const failures = [];
  const walk = dir => readdirSync(dir).flatMap(name => {
    const file = join(dir, name);
    return statSync(file).isDirectory() ? walk(file) : file.endsWith('.html') ? [file] : [];
  });
  for (const file of walk(out)) {
    const html = readFileSync(file, 'utf8');
    for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      const url = match[1];
      if (!url.startsWith('/') && !url.startsWith('#')) continue;
      const [path, hash] = url.split('#');
      let target = path ? join(out, path.split('?')[0]) : file;
      if (existsSync(target) && statSync(target).isDirectory()) target = join(target, 'index.html');
      if (!existsSync(target)) { failures.push(`${file}: ${url}`); continue; }
      if (hash && target.endsWith('.html') && !readFileSync(target, 'utf8').includes(`id="${hash}"`)) failures.push(`${file}: missing #${hash}`);
    }
    for (const image of html.matchAll(/<img\b[^>]*>/g)) {
      if (!/\balt=/.test(image[0])) failures.push(`${file}: image has no alternative text`);
    }
  }
  assert.deepEqual(failures, []);
});
