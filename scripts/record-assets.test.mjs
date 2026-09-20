import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { records } from '../src/diner/records.ts';

const files = records.filter(record => record.src);
test('all seven supplied recordings have compact playable M4A delivery files', () => {
    assert.equal(files.length, 7);
    let total = 0;
    for (const record of files) {
        const path = `public${record.src}`;
        const size = statSync(path).size;
        const header = readFileSync(path).subarray(4, 8).toString();
        assert.equal(header, 'ftyp', `${record.name} must be an MP4 audio container`);
        assert.ok(size > 1_000_000 && size < 9_000_000, `${record.name} stays within its delivery budget`);
        total += size;
    }
    assert.ok(total < 42_000_000);
});
if (process.env.SITE_PREVIEW_URL) {
    test('each recording can be streamed with byte-range requests', async () => {
        for (const record of files) {
            const response = await fetch(new URL(record.src, process.env.SITE_PREVIEW_URL), { headers: { Range: 'bytes=0-31' } });
            assert.equal(response.status, 206, record.name);
            assert.equal((await response.arrayBuffer()).byteLength, 32);
        }
    });
}

test('the delivered recordings match their measured and balanced loudness report', async () => {
    const { createHash } = await import('node:crypto');
    const report = JSON.parse(readFileSync('scripts/record-assets.json', 'utf8'));
    assert.equal(report.length, files.length);
    for (const record of report) {
        assert.equal(createHash('sha256').update(readFileSync(`public/audio/${record.file}`)).digest('hex'), record.sha256);
    }
    const levels = report.map(record => record.encoded_lufs);
    assert.ok(Math.max(...levels) - Math.min(...levels) < .1);
});
