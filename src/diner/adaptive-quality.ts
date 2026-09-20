/** Adapt only to sustained motion, never to the deliberately slower idle loop. */
export class AdaptiveQuality {
    scale = 1;
    private active = false;
    private frames = 0;
    private slow = 0;
    private smooth = 0;
    private changedAt = -Infinity;
    sample(frameMs: number, moving: boolean, now: number) {
        const continuous = this.active && moving;
        this.active = moving;
        if (!continuous) { this.frames = this.slow = this.smooth = 0; return this.scale; }
        this.frames++;
        if (frameMs > 27) { this.slow++; this.smooth = 0; }
        else this.smooth++;
        if (this.frames >= 30) {
            if (this.slow >= 18 && this.scale > .7 && now - this.changedAt > 1200) {
                this.scale = Math.max(.7, Math.round((this.scale - .1) * 10) / 10);
                this.changedAt = now;
            }
            this.frames = this.slow = 0;
        }
        if (this.smooth >= 180 && this.scale < 1 && now - this.changedAt > 5000) {
            this.scale = Math.min(1, Math.round((this.scale + .1) * 10) / 10);
            this.smooth = 0;
            this.changedAt = now;
        }
        return this.scale;
    }
}
