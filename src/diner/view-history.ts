import type { Vector3 } from 'three';
import type { ObjectName } from './models';

export type View = ObjectName | 'room';
type Focus = 'cat' | 'panel' | null;
export interface ViewSnapshot {
    position: Vector3;
    target: Vector3;
    view: View;
    manual: boolean;
    exploring: boolean;
}
/** Nested item visits unwind to the actual prior view, including a turned seat. */
export class ViewHistory {
    focus: Focus = null;
    private stack: (ViewSnapshot & { focus: Focus })[] = [];
    get returnView() { return this.stack.at(-1)?.view; }
    enter(focus: Exclude<Focus, null>, snapshot: ViewSnapshot) {
        if (this.focus !== focus && this.focus !== 'panel') {
            this.stack.push({ ...snapshot, position: snapshot.position.clone(), target: snapshot.target.clone(), focus: this.focus });
        }
        this.focus = focus;
    }
    back() {
        const previous = this.stack.pop();
        this.focus = previous?.focus ?? null;
        return previous;
    }
    clear() { this.stack = []; this.focus = null; }
}
