/** Keep panel changes cancellable so closing the paper never reopens stale content. */
export class PanelTransition {
    private revision = 0;
    private animations: Animation[] = [];
    private dialog: HTMLElement;
    private content: HTMLElement;
    private reduced: () => boolean;
    constructor(dialog: HTMLElement, content: HTMLElement, reduced: () => boolean) {
        this.dialog = dialog;
        this.content = content;
        this.reduced = reduced;
    }

    cancel() {
        this.revision++;
        this.animations.forEach(animation => animation.cancel());
        this.animations = [];
    }

    async run(update: () => void, backwards = false) {
        this.cancel();
        const revision = this.revision;
        if (this.reduced()) { update(); return; }
        const direction = backwards ? -1 : 1;
        const before = { width: `${this.dialog.offsetWidth}px`, height: `${this.dialog.offsetHeight}px`, transform: getComputedStyle(this.dialog).transform };
        const leaving = this.content.animate([
            { opacity: 1, transform: 'translateX(0)' },
            { opacity: 0, transform: `translateX(${-direction * 8}px)` },
        ], { duration: 120, easing: 'ease-in', fill: 'forwards' });
        this.animations.push(leaving);
        try { await leaving.finished; }
        catch { return; } // Cancellation is expected when closing or choosing another panel.
        if (revision !== this.revision) return;
        update();
        const after = { width: `${this.dialog.offsetWidth}px`, height: `${this.dialog.offsetHeight}px`, transform: getComputedStyle(this.dialog).transform };
        const paper = this.dialog.animate([before, after], { duration: 380, easing: 'cubic-bezier(.22, 1, .36, 1)' });
        leaving.cancel();
        const entering = this.content.animate([
            { opacity: 0, transform: `translateX(${direction * 12}px)` },
            { opacity: 1, transform: 'translateX(0)' },
        ], { duration: 280, delay: 60, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'both' });
        this.animations.push(paper, entering);
        try { await Promise.all([paper.finished, entering.finished]); }
        catch { return; }
        if (revision === this.revision) this.cancel();
    }
}
