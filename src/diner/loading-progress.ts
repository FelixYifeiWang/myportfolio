export interface LoadingSnapshot { value: number; message: string }
export type AssetProgress = (name: string, event?: Pick<ProgressEvent, 'loaded' | 'total'>) => void;

/** Eleven room assets, then construction, lighting, and a prepared first frame. */
export class RoomLoadingProgress {
    private assets = new Map<string, number>();
    private value = 0;
    private message = 'Setting the tables…';
    private report: (state: LoadingSnapshot) => void;
    constructor(report: (state: LoadingSnapshot) => void) {
        this.report = report;
        report({ value: 0, message: this.message });
    }
    asset(name: string, event?: Pick<ProgressEvent, 'loaded' | 'total'>) {
        const fraction = event ? event.total > 0 ? Math.min(.95, event.loaded / event.total) : 0 : 1;
        this.assets.set(name, Math.max(this.assets.get(name) ?? 0, fraction));
        this.update(Math.min(80, [...this.assets.values()].reduce((sum, value) => sum + value, 0) / 11 * 80), this.message);
    }
    stage(stage: 'room' | 'lighting' | 'ready') {
        const stages = { room: [85, 'Warming up the room…'], lighting: [94, 'Turning on the lights…'], ready: [100, 'Come on in.'] } as const;
        const [value, message] = stages[stage];
        this.update(value, message);
    }
    private update(value: number, message: string) {
        value = Math.max(this.value, Math.round(value));
        if (value === this.value && message === this.message) return;
        this.value = value;
        this.message = message;
        this.report({ value, message });
    }
}
