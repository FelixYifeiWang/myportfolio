type Phase = 'closed' | 'loading' | 'opening' | 'holding' | 'closing';
interface EncounterHooks<T> {
    load: (id: string) => Promise<T>;
    knock?: () => Promise<void>;
    stopKnock?: () => void;
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
    private seen = new Set<string>();
    private next: { id: string; asset: Promise<T> } | null = null;
    private request = 0;
    private time = 0;
    private openness = 0;
    private closeFrom = 0;
    private disposed = false;

    constructor(roster: readonly string[], hooks: EncounterHooks<T>, random = Math.random) {
        this.roster = [...new Set(roster)];
        this.hooks = hooks;
        this.random = random;
    }
    get remaining() { return this.roster.length - this.seen.size; }
    private reserve() {
        if (this.next) return this.next;
        const candidates = this.roster.filter(id => !this.seen.has(id));
        if (!candidates.length) return null;
        const id = candidates[Math.min(candidates.length - 1, Math.floor(this.random() * candidates.length))];
        const next = { id, asset: this.hooks.load(id) };
        next.asset = next.asset.catch(error => {
            if (this.next === next) this.next = null;
            throw error;
        });
        this.next = next;
        return next;
    }
    /** One silent reservation, shared with a click even while still preparing. */
    async preload() {
        if (this.disposed || this.phase !== 'closed') return;
        await this.reserve()?.asset;
    }
    async open() {
        if (this.disposed || this.phase !== 'closed' || !this.remaining) return;
        const request = ++this.request;
        this.phase = 'loading';
        this.hooks.changed();
        try {
            // Begin audio while the original click still grants playback permission.
            const knock = this.hooks.knock?.();
            const next = this.reserve()!;
            const [asset] = await Promise.all([next.asset, knock]);
            if (request !== this.request || this.disposed) return;
            this.hooks.show(asset);
            this.seen.add(next.id);
            this.next = null;
            this.time = 0;
            this.phase = 'opening';
        }
        catch (error) {
            if (request !== this.request || this.disposed) return;
            this.phase = 'closed';
            this.hooks.stopKnock?.();
            this.hooks.error(error);
        }
        this.hooks.changed();
    }
    close() {
        if (this.disposed || this.phase === 'closed' || this.phase === 'closing') return;
        this.request++;
        this.hooks.stopKnock?.();
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
            if (this.time >= 2.5) this.close();
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
        this.hooks.stopKnock?.();
        this.disposed = true;
        this.next = null;
        this.phase = 'closed';
        this.hooks.angle(0);
        this.hooks.hide();
    }
}
