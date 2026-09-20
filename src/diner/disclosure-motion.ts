/** Animate native details without removing their keyboard or no-script behavior. */
export class DisclosureMotion {
    private details: HTMLDetailsElement;
    private summary: HTMLElement;
    private content: HTMLElement;
    private reduced: () => boolean;
    private expanded: boolean;
    private animations: Animation[] = [];

    constructor(details: HTMLDetailsElement, summary: HTMLElement, content: HTMLElement, reduced: () => boolean) {
        this.details = details;
        this.summary = summary;
        this.content = content;
        this.reduced = reduced;
        this.expanded = details.open;
    }

    toggle() {
        const start = this.details.getBoundingClientRect().height;
        const opacity = this.animations.length ? getComputedStyle(this.content).opacity : this.details.open ? '1' : '0';
        this.clear();
        this.expanded = !this.expanded;
        this.content.inert = !this.expanded;
        if (this.reduced()) {
            this.details.open = this.expanded;
            return;
        }

        this.details.open = true;
        this.details.dataset.expanding = String(this.expanded);
        // The row has a one-pixel divider, except for the last item in a course.
        const border = parseFloat(getComputedStyle(this.details).borderBottomWidth) || 0;
        const end = this.expanded ? this.details.getBoundingClientRect().height : this.summary.getBoundingClientRect().height + border;
        this.details.style.overflow = 'hidden';
        const duration = this.expanded ? 420 : 320;
        const size = this.details.animate([{ height: `${start}px` }, { height: `${end}px` }], {
            duration, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'both',
        });
        const fade = this.content.animate([{ opacity }, { opacity: this.expanded ? 1 : 0 }], {
            duration: this.expanded ? 300 : 180, easing: 'ease-out', fill: 'both',
        });
        this.animations = [size, fade];
        size.onfinish = () => {
            this.details.open = this.expanded;
            this.clear();
        };
    }

    private clear() {
        for (const animation of this.animations) {
            animation.onfinish = null;
            animation.cancel();
        }
        this.animations = [];
        this.details.style.overflow = '';
        delete this.details.dataset.expanding;
    }
}
