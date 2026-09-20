export const roomAssetNames = ['cat', 'plant', 'kettle', 'espresso', 'ramen', 'stool'] as const;
export const touchAssetMedia = '(pointer: coarse)';
export const roomTextureNames = ['walnut-color', 'walnut-normal', 'walnut-roughness', 'frame-art', 'frame-portrait'] as const;

export function roomAssetUrl(name: typeof roomAssetNames[number], touch = false) {
    return `/models/${touch ? 'touch/' : ''}diner-${name}.glb`;
}

export function woodTextureUrl(name: string, touch = false) {
    return roomTextureUrl(`walnut-${name}`, touch);
}

export function roomTextureUrl(name: string, touch = false) {
    return `/textures/${touch ? 'touch/' : ''}${name}.webp`;
}
