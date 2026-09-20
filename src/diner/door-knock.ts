/** Recorded wooden-door cue, started directly by the visitor's click. */
export class DoorKnock {
    private audio: HTMLAudioElement | null = null;
    private finish: (() => void) | null = null;
    private disposed = false;
    private createAudio: () => HTMLAudioElement;

    constructor(createAudio: () => HTMLAudioElement = () => new Audio('/audio/door-knock.m4a')) {
        this.createAudio = createAudio;
    }
    play(): Promise<void> {
        if (this.disposed) return Promise.resolve();
        this.stop();
        return new Promise(resolve => {
            try {
                const audio = this.audio ??= this.createAudio();
                audio.volume = .65;
                audio.currentTime = 0;
                let finished = false;
                const finish = () => {
                    if (finished) return;
                    finished = true;
                    clearTimeout(timeout);
                    audio.removeEventListener('ended', finish);
                    audio.removeEventListener('error', failed);
                    if (this.finish === finish) this.finish = null;
                    audio.pause();
                    resolve();
                };
                const failed = () => {
                    console.warn('Wooden door knock could not play.');
                    finish();
                };
                const timeout = setTimeout(failed, 4000);
                this.finish = finish;
                audio.addEventListener('ended', finish);
                audio.addEventListener('error', failed);
                // Keep this synchronous with the click for browser audio permission.
                void audio.play().catch(error => {
                    if (error?.name !== 'NotAllowedError' && error?.name !== 'AbortError') console.warn('Door knock unavailable:', error);
                    finish();
                });
            } catch (error) {
                console.warn('Door knock unavailable:', error);
                this.finish?.();
                resolve();
            }
        });
    }
    stop() { this.finish?.(); }
    dispose() { this.disposed = true; this.stop(); }
}
