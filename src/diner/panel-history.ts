/** Navigation within the paper menu, independent of the room camera. */
export class PanelHistory {
    private panels: string[] = [];

    reset(panel: string) { this.panels = [panel]; }
    visit(panel: string) {
        if (this.panels.at(-1) !== panel) this.panels.push(panel);
    }
    get previous() { return this.panels.at(-2) ?? null; }
    back() {
        if (this.panels.length < 2) return null;
        this.panels.pop();
        return this.panels.at(-1)!;
    }
}
