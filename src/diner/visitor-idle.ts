/** Cooperative checkpoints: never force background work through an active gesture. */
export function waitForVisitorIdle(canRun: () => boolean, signal: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
        let timer: ReturnType<typeof setTimeout>;
        let idle: number | undefined;
        const cleanup = () => {
            clearTimeout(timer);
            if (idle !== undefined) cancelIdleCallback(idle);
            signal.removeEventListener('abort', abort);
        };
        const abort = () => { cleanup(); reject(signal.reason); };
        const done = () => { cleanup(); resolve(); };
        const check = () => {
            if (!canRun()) { timer = setTimeout(check, 150); return; }
            if (typeof requestIdleCallback === 'undefined') { done(); return; }
            idle = requestIdleCallback(deadline => {
                idle = undefined;
                if (canRun() && deadline.timeRemaining() >= 8) done();
                else timer = setTimeout(check, 150);
            });
        };
        if (signal.aborted) { reject(signal.reason); return; }
        signal.addEventListener('abort', abort, { once: true });
        // Yield even on browsers without requestIdleCallback.
        timer = setTimeout(check, 0);
    });
}
