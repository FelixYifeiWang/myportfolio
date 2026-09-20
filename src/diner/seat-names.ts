export const seatNames = ['seat-1', 'seat-2', 'seat-3', 'seat-4'] as const;
export type SeatName = typeof seatNames[number];
export function isSeat(name: string): name is SeatName {
    return (seatNames as readonly string[]).includes(name);
}
