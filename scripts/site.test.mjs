import { projects } from '../src/data/projects.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

const out = resolve('dist');
const pages = ['/', '/work/', ...projects.map(project => `/work/${project.slug}/`)];
if (process.env.SITE_PREVIEW_URL) {
  for (const route of pages) {
    test(`${route} responds successfully in the running preview`, async () => {
      const response = await fetch(new URL(route, process.env.SITE_PREVIEW_URL));
      assert.equal(response.status, 200);
    });
  }
}
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

test('landing navigation exposes clear portfolio routes without the 3D scene', () => {
  const html = readFileSync(join(out, 'index.html'), 'utf8');
  for (const [name, route] of [['Work', '/work/'], ['Notebook', '/work/#side-projects'], ['About', '/work/#about-felix']]) {
    const anchor = [...html.matchAll(/<a\b([^>]+)>([^<]+)<\/a>/g)].find(match => match[2].trim() === name);
    assert.ok(anchor && anchor[1].includes(`href="${route}"`), `${name} must remain a direct link`);
  }
});

test('icon-only landing utilities retain accessible names', () => {
  const html = readFileSync(join(out, 'index.html'), 'utf8');
  for (const id of ['sound-toggle', 'reset-view', 'view-options-toggle']) {
    const tag = [...html.matchAll(/<(?:button|summary)\b[^>]*>/g)].find(match => match[0].includes(`id="${id}"`));
    assert.ok(tag && /aria-label="[^"]+"/.test(tag[0]), `${id} needs an accessible name`);
  }
});


test('all four stools expose individually named keyboard controls', () => {
  const html = readFileSync(join(out, 'index.html'), 'utf8');
  for (let index = 1; index <= 4; index++) {
    const button = [...html.matchAll(/<button\b[^>]*>/g)].find(match => match[0].includes(`data-action="seat-${index}"`));
    assert.ok(button && button[0].includes(`aria-label="Sit at seat ${index},`));
  }
  assert.ok(!html.includes('id="take-seat"'));
});
