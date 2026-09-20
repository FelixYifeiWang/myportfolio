import {test} from 'node:test';
import assert from 'node:assert/strict';
import {AdaptiveQuality} from '../src/diner/adaptive-quality.ts';

test('idle cadence and the first wake frame do not reduce image quality', () => {
    const quality = new AdaptiveQuality();
    for (let i=0;i<100;i++) { quality.sample(45,false,i*50); quality.sample(100,true,i*50+10); }
    assert.equal(quality.scale,1);
});
test('sustained slow motion lowers resolution within one second, with a fixed floor', () => {
    const quality = new AdaptiveQuality();
    for(let i=0;i<32;i++)quality.sample(32,true,i*32);
    assert.equal(quality.scale,.9);
    for(let i=32;i<400;i++)quality.sample(32,true,i*32);
    assert.equal(quality.scale,.7);
});
test('a single long task leaves quality intact and sustained smooth frames recover it', () => {
    const quality = new AdaptiveQuality();
    quality.sample(16,true,0);quality.sample(500,true,500);
    for(let i=0;i<35;i++)quality.sample(16,true,516+i*16);
    assert.equal(quality.scale,1);
    for(let i=0;i<35;i++)quality.sample(34,true,1200+i*34);
    assert.equal(quality.scale,.9);
    for(let i=0;i<400;i++)quality.sample(16,true,2500+i*16);
    assert.equal(quality.scale,1);
});
