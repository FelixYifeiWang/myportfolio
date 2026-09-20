import { synthesizePurr } from './purr-synthesis';
self.onmessage = (event: MessageEvent<number>) => {
    const samples = synthesizePurr(event.data);
    self.postMessage(samples, { transfer: [samples.buffer] });
};
