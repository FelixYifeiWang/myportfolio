import { Vector3 } from 'three';

function seat(x: number) {
    return {
        stool: new Vector3(x, .025, 1.75),
        position: new Vector3(x, 2.85, 2.75),
        target: new Vector3(x * .65, 2.1, -2.7),
    };
}

export const seats = {
    'seat-1': seat(-3),
    'seat-2': seat(-1),
    'seat-3': seat(1),
    'seat-4': seat(3),
};
export type SeatName = keyof typeof seats;
export function isSeat(name: string): name is SeatName {
    return Object.hasOwn(seats, name);
}
