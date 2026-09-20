import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { projects, featuredProjects, otherProjects } from '../src/data/projects.ts';
import { additionalWorks } from '../src/data/other-work.ts';

test('featured stories lead with the requested ventures while VR and Orpheus move to other work', () => {
    assert.deepEqual(featuredProjects.map(project => project.slug), ['dreamin-engine', 'echo-of-mobius', 'undecimber']);
    assert.deepEqual(otherProjects.map(project => project.slug), ['relicvr', 'orpheus']);
    assert.equal(new Set(projects.map(project => project.slug)).size, projects.length);
});

test('the diner and simple portfolio share the same four-entry hierarchy', () => {
    for (const path of ['dist/index.html', 'dist/work/index.html']) {
        const html = readFileSync(path, 'utf8');
        const menu = html.slice(html.indexOf('class="diner-menu-items"'));
        const names = ['DreamIn Engine', 'Echo of Mobius', 'Undecimber', 'Notion AI Meeting Notes', 'Other work.'];
        const positions = names.map(name => menu.indexOf(name));
        assert.ok(positions.every((position, index) => position >= 0 && (!index || position > positions[index - 1])), path);
        assert.ok(menu.indexOf('RelicVR') > positions.at(-1));
        assert.ok(menu.indexOf('Orpheus') > positions.at(-1));
    }
});

test('all original additional professional contributions have usable lightweight images', () => {
    assert.deepEqual(additionalWorks.map(work => work.organization), ['Driver AI', 'JJE', 'PixAI', 'Amazon', 'Inkheart', 'Brown University', 'Brown University', 'RPG']);
    for (const work of additionalWorks) {
        assert.ok(work.description && work.tools && work.year);
        const path = `public/images/${work.image}.webp`;
        assert.ok(existsSync(path), path);
        assert.ok(statSync(path).size < 250000, path);
    }
});

test('the featured ventures include concise outcome evidence in both presentations', () => {
    const diner = readFileSync('dist/index.html', 'utf8');
    for (const project of featuredProjects) {
        const page = readFileSync(`dist/work/${project.slug}/index.html`, 'utf8');
        assert.equal(project.outcomes.length, 3);
        for (const outcome of project.outcomes) {
            assert.ok(diner.includes(outcome.value));
            assert.ok(page.includes(outcome.value));
        }
    }
});
