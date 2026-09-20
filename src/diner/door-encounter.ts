type Phase = 'closed' | 'loading' | 'opening' | 'holding' | 'closing';
interface EncounterHooks<T> {
    load: (id: string) => Promise<T>;
    show: (asset: T) => void;
    hide: () => void;
    angle: (openness: number) => void;
    changed: () => void;
    error: (error: unknown) => void;
}
/** Rendering-independent timing; the closed door conceals loading and removal. */
export class DoorEncounter<T> {
    phase: Phase = 'closed';
    private roster: readonly string[];
    private hooks: EncounterHooks<T>;
    private random: () => number;
    private previous: string | null = null;
    private request = 0;
    private time = 0;
    private openness = 0;
    private closeFrom = 0;
    private disposed = false;

    constructor(roster: readonly string[], hooks: EncounterHooks<T>, random = Math.random) {
        this.roster = roster;
        this.hooks = hooks;
        this.random = random;
    }
    async open() {
        if (this.disposed || this.phase !== 'closed' || !this.roster.length) return;
        const choices = this.roster.filter(id => id !== this.previous);
        const candidates = choices.length ? choices : this.roster;
        const id = candidates[Math.min(candidates.length - 1, Math.floor(this.random() * candidates.length))];
        const request = ++this.request;
        this.phase = 'loading';
        this.hooks.changed();
        try {
            const asset = await this.hooks.load(id);
            if (request !== this.request || this.disposed) return;
            this.hooks.show(asset);
            this.previous = id;
            this.time = 0;
            this.phase = 'opening';
        }
        catch (error) {
            if (request !== this.request || this.disposed) return;
            this.phase = 'closed';
            this.hooks.error(error);
        }
        this.hooks.changed();
    }
    close() {
        if (this.disposed || this.phase === 'closed' || this.phase === 'closing') return;
        this.request++;
        if (this.phase === 'loading') this.phase = 'closed';
        else {
            this.closeFrom = this.openness;
            this.phase = 'closing';
            this.time = 0;
        }
        this.hooks.changed();
    }
    update(delta: number, reduced = false) {
        if (this.disposed || this.phase === 'closed' || this.phase === 'loading') return false;
        this.time += Math.max(0, delta);
        if (this.phase === 'holding') {
            if (this.time >= 6) this.close();
            return true;
        }
        const progress = reduced ? 1 : Math.min(this.time / 1.3, 1);
        const eased = progress * progress * (3 - 2 * progress);
        this.openness = this.phase === 'opening' ? eased : this.closeFrom * (1 - eased);
        this.hooks.angle(this.openness);
        if (progress === 1) {
            if (this.phase === 'opening') this.phase = 'holding';
            else { this.phase = 'closed'; this.hooks.hide(); }
            this.time = 0;
            this.hooks.changed();
        }
        return this.phase !== 'closed';
    }
    dispose() {
        this.request++;
        this.disposed = true;
        this.phase = 'closed';
        this.hooks.angle(0);
        this.hooks.hide();
    }
}
