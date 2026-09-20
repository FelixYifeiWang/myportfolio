export const roomAssetNames = ['cat', 'plant', 'kettle', 'espresso', 'ramen', 'stool'] as const;
export const touchAssetMedia = '(pointer: coarse)';

export function roomAssetUrl(name: typeof roomAssetNames[number], touch = false) {
    return `/models/${touch ? 'touch/' : ''}diner-${name}.glb`;
}

export function woodTextureUrl(name: string, touch = false) {
    return `/textures/${touch ? 'touch/' : ''}walnut-${name}.webp`;
}
