import { synthesizePurr } from './purr-synthesis.ts';

export function createPurrJob(sampleRate: number) {
    // Non-browser hosts use the same waveform for deterministic audio tests.
    if (typeof Worker === 'undefined') return { result: Promise.resolve(synthesizePurr(sampleRate)), cancel() {} };
    const worker = new Worker(new URL('./purr-worker.ts', import.meta.url), { type: 'module' });
    let cancel = () => {};
    const result = new Promise<Float32Array>((resolve, reject) => {
        worker.onmessage = (event: MessageEvent<Float32Array>) => { worker.terminate(); resolve(event.data); };
        worker.onerror = event => { worker.terminate(); reject(new Error(`Purr preparation failed: ${event.message}`)); };
        cancel = () => { worker.terminate(); resolve(new Float32Array()); };
        worker.postMessage(sampleRate);
    });
    return { result, cancel: () => cancel() };
}
