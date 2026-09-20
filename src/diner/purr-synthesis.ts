/** Preserve the established sound and breathing envelope; safe to run in a worker. */
export function synthesizePurr(sampleRate: number) {
    const duration = 4.8;
    const data = new Float32Array(Math.round(sampleRate * duration));
    let noise = 0, energy = 0;
    for (let i = 0; i < data.length; i++) {
        const t = i / sampleRate;
        noise = noise * .96 + (Math.random() * 2 - 1) * .04;
        const breath = .35 + .65 * Math.sin(Math.PI * t / 2.4) ** 2;
        const pulse = (.5 + .5 * Math.sin(2 * Math.PI * 25 * t + .4 * Math.sin(2 * Math.PI * t / duration))) ** 2;
        const body = .5 * Math.sin(2 * Math.PI * 70 * t) + Math.sin(2 * Math.PI * 140 * t) + .3 * Math.sin(2 * Math.PI * 210 * t);
        data[i] = (noise * .4 + body * .12) * (.3 + pulse * .7) * breath;
        energy += data[i] * data[i];
    }
    const level = .07 / Math.max(Math.sqrt(energy / data.length), .001);
    for (let i = 0; i < data.length; i++) {
        const time = (i / sampleRate) % 2.4;
        data[i] *= level * (time < 1.8 ? Math.sin(Math.PI * time / 1.8) ** 2 : 0);
    }
    return data;
}
