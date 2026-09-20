import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { projects, featuredProjects, otherProjects } from '../src/data/projects.ts';
import { additionalWorks } from '../src/data/other-work.ts';

test('featured stories lead with the requested ventures while VR and Orpheus move to other work', () => {
    assert.deepEqual(featuredProjects.map(project => project.slug), ['dreamin-engine', 'echo-of-mobius', 'undecimber', 'notion-ai-meeting-notes', 'sixth']);
    assert.deepEqual(otherProjects.map(project => project.slug), ['relicvr', 'orpheus', ...additionalWorks.map(work => work.slug)]);
    assert.equal(new Set(projects.map(project => project.slug)).size, projects.length);
});

test('the diner and simple portfolio share the same five-entry hierarchy', () => {
    for (const path of ['dist/index.html', 'dist/work/index.html']) {
        const html = readFileSync(path, 'utf8');
        const menu = html.slice(html.indexOf('class="diner-menu-items"'));
        const names = ['DreamIn Engine', 'Echo of Mobius', 'Undecimber', 'Notion AI Meeting Notes', 'SIXTH', 'Other work.'];
        const positions = names.map(name => menu.indexOf(name));
        assert.ok(positions.every((position, index) => position >= 0 && (!index || position > positions[index - 1])), path);
        assert.ok(menu.includes('href="/work/other/"'));
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


test('other work offers every contribution as a readable direct link without nested disclosures', () => {
    const page = readFileSync('dist/work/other/index.html', 'utf8');
    assert.ok(!page.includes('<details'));
    for (const project of otherProjects) {
        assert.ok(page.includes(`href="/work/${project.slug}/"`));
        assert.ok(page.includes((project.brief ? project.intro : project.description).replaceAll('&', '&amp;')));
        assert.ok(existsSync(`dist/work/${project.slug}/index.html`));
    }
});

test('new featured stories distinguish shipped work and prototype scope, with lightweight imagery', () => {
    const notion = readFileSync('dist/work/notion-ai-meeting-notes/index.html', 'utf8');
    const sixth = readFileSync('dist/work/sixth/index.html', 'utf8');
    assert.ok(notion.includes('playback was rolling out'));
    assert.ok(sixth.includes('field validation remains future work'));
    assert.ok(sixth.includes('AI architecture &amp; offline decision logic'));
    for (const name of ['sixth-fabric', 'sixth-personalization']) {
        assert.ok(statSync(`public/images/${name}.webp`).size < 250000);
    }
});
