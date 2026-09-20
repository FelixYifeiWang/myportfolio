import * as THREE from 'three';
function canvasTexture(width: number, height: number, paint: (ctx: CanvasRenderingContext2D) => void) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    paint(ctx);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
}
export function tileTexture() {
    const texture = canvasTexture(512, 512, ctx => {
        ctx.fillStyle = '#172d2b';
        ctx.fillRect(0, 0, 512, 512);
        for (let row = 0; row < 4; row++)
            for (let col = -1; col < 4; col++) {
                const x = col * 171 + (row % 2) * 85;
                const y = row * 128;
                ctx.fillStyle = ['#34504a', '#3b5650', '#304d48', '#38524b'][(row + col + 5) % 4];
                ctx.fillRect(x + 3, y + 3, 165, 122);
                ctx.fillStyle = '#9aab8629';
                ctx.fillRect(x + 4, y + 4, 163, 2);
                ctx.fillStyle = '#0003';
                ctx.fillRect(x + 4, y + 122, 163, 2);
            }
    });
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 2);
    return texture;
}
export function floorTexture() {
    const texture = canvasTexture(512, 512, ctx => {
        ctx.fillStyle = '#362f29';
        ctx.fillRect(0, 0, 512, 512);
        for (let y = 0; y < 4; y++)
            for (let x = 0; x < 4; x++) {
                ctx.fillStyle = (x + y) % 2 ? '#716858' : '#a39882';
                ctx.fillRect(x * 128 + 2, y * 128 + 2, 124, 124);
            }
        for (let i = 0; i < 16000; i++) {
            ctx.fillStyle = i % 2 ? '#fff1' : '#0001';
            ctx.fillRect((i * 73.61) % 512, (i * 29.19) % 512, 1, 1);
        }
    });
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 3);
    return texture;
}
export function menuTexture() {
    return canvasTexture(768, 1024, ctx => {
        ctx.fillStyle = '#e5d5b5';
        ctx.fillRect(0, 0, 768, 1024);
        ctx.strokeStyle = '#816747';
        ctx.lineWidth = 2;
        ctx.strokeRect(30, 30, 708, 964);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#723e2b';
        ctx.font = '24px "DM Mono", monospace';
        ctx.fillText('FELIX WANG’S', 384, 105);
        ctx.font = 'italic 98px "Instrument Serif", Georgia';
        ctx.fillText('after hours', 384, 217);
        ctx.font = '23px "DM Mono", monospace';
        ctx.fillText('THE MIDNIGHT MENU', 384, 290);
        ctx.fillRect(90, 336, 588, 1);
        ctx.font = '48px "Instrument Serif", Georgia';
        ctx.fillText('House specials', 384, 425);
        ctx.textAlign = 'left';
        const rows = ['01  Echo of Mobius', '02  DreamIn Engine', '03  RelicVR', '04  Orpheus', '05  Undecimber'];
        rows.forEach((name, i) => { ctx.font = '31px "Instrument Serif", Georgia'; ctx.fillText(name, 100, 510 + i * 69); });
        ctx.textAlign = 'center';
        ctx.font = '20px "DM Mono", monospace';
        ctx.fillText('TECH · GAMES · ART', 384, 920);
    });
}
export function signTexture() {
    return canvasTexture(1536, 512, ctx => {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'italic 225px "Instrument Serif", Georgia';
        ctx.shadowColor = '#ed8a46';
        ctx.shadowBlur = 26;
        ctx.fillStyle = '#ffd0a0';
        ctx.fillText('after hours', 768, 238);
        // Warm illuminated edges surround dark letter faces.
        ctx.strokeStyle = '#ffd0a0';
        ctx.fillStyle = '#483b30';
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';
        ctx.font = '500 52px "DM Mono", monospace';
        const byline = 'BY FELIX WANG';
        const tracking = 5;
        const widths = [...byline].map(letter => ctx.measureText(letter).width);
        let x = 768 - (widths.reduce((sum, width) => sum + width, 0) + tracking * (byline.length - 1)) / 2;
        ctx.textAlign = 'left';
        [...byline].forEach((letter, index) => {
            ctx.shadowBlur = 8;
            ctx.strokeText(letter, x, 416);
            ctx.shadowBlur = 0;
            ctx.fillText(letter, x, 416);
            x += widths[index] + tracking;
        });
    });
}
export function labelTexture(title: string, subtitle: string, color = '#dbcba8', ink = '#604735') {
    return canvasTexture(512, 512, ctx => {
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 512, 512);
        ctx.strokeStyle = ink;
        ctx.lineWidth = 2;
        ctx.strokeRect(25, 25, 462, 462);
        ctx.fillStyle = ink;
        ctx.textAlign = 'center';
        ctx.font = 'italic 76px "Instrument Serif", Georgia';
        title.split('\n').forEach((line, index) => ctx.fillText(line, 256, 160 + index * 90));
        ctx.font = '18px "DM Mono", monospace';
        ctx.fillText(subtitle, 256, 428);
    });
}
export function softTexture() {
    return canvasTexture(128, 128, ctx => {
        const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
        gradient.addColorStop(0, '#fff');
        gradient.addColorStop(.3, '#ffffff70');
        gradient.addColorStop(1, '#ffffff00');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 128, 128);
    });
}
export function surfaceTexture() {
    const texture = canvasTexture(256, 256, ctx => {
        ctx.fillStyle = '#808080';
        ctx.fillRect(0, 0, 256, 256);
        let seed = 17;
        for (let i = 0; i < 20000; i++) {
            seed = (seed * 16807) % 2147483647;
            const shade = 100 + seed % 55;
            ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
            ctx.fillRect(seed % 256, Math.floor(seed / 256) % 256, 1, 1);
        }
    });
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(5, 3);
    return texture;
}
export function coffeeTexture() {
    return canvasTexture(256, 256, ctx => {
        const base = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
        base.addColorStop(0, '#9a5e31');
        base.addColorStop(.86, '#b98248');
        base.addColorStop(1, '#61331c');
        ctx.fillStyle = base;
        ctx.fillRect(0, 0, 256, 256);
        ctx.strokeStyle = '#edcf97';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(128, 128, 117, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#f2dfb9';
        for (let i = 0; i < 7; i++) {
            const y = 75 + i * 16, w = 43 - i * 4;
            ctx.beginPath();
            ctx.ellipse(128 - w * .4, y, w, 9, .3, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(128 + w * .4, y, w, 9, -.3, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.lineWidth = 5;
        ctx.strokeStyle = '#f2dfb9';
        ctx.beginPath();
        ctx.moveTo(128, 60);
        ctx.quadraticCurveTo(120, 130, 130, 202);
        ctx.stroke();
    });
}
export function bottleLabelTexture() {
    return canvasTexture(512, 256, ctx => {
        ctx.fillStyle = '#d7c5a2';
        ctx.fillRect(0, 0, 512, 256);
        ctx.fillStyle = '#786343';
        ctx.fillRect(0, 18, 512, 3);
        ctx.fillRect(0, 232, 512, 3);
        ctx.textAlign = 'center';
        ctx.font = '54px "Instrument Serif",Georgia';
        ctx.fillText('AFTER HOURS', 256, 108);
        ctx.font = '19px "DM Mono",monospace';
        ctx.fillText('HOUSE RESERVE', 256, 162);
        ctx.fillText('EST. 2024', 256, 197);
    });
}

/** Unlettered ribbed privacy glass. */
export function doorGlassTexture() {
    return canvasTexture(384, 512, ctx => {
        const sky = ctx.createLinearGradient(0, 0, 0, 512);
        sky.addColorStop(0, '#263c3d');
        sky.addColorStop(1, '#627267');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, 384, 512);
        for (let x = 0; x < 384; x += 16) {
            ctx.fillStyle = '#d4d6b815';
            ctx.fillRect(x, 0, 3, 512);
            ctx.fillStyle = '#0b25221a';
            ctx.fillRect(x + 11, 0, 2, 512);
        }
    });
}

/** Sparse, static water beads catch the room light without screen-space effects. */
export function windowBeadsTexture() {
    return canvasTexture(768, 576, ctx => {
        let seed = 93;
        const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
        for (let i = 0; i < 190; i++) {
            const x = 8 + random() * 752, y = 8 + random() * 560;
            const radius = .6 + random() * 1.5;
            ctx.fillStyle = '#09242b45';
            ctx.beginPath();
            ctx.ellipse(x, y, radius, radius * 1.5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#d3e6dc9a';
            ctx.lineWidth = .65;
            ctx.beginPath();
            ctx.ellipse(x - .3, y + .4, radius * .75, radius * 1.15, 0, .1, 2.0);
            ctx.stroke();
            if (i % 14 === 0) {
                const length = 9 + random() * 27;
                const trail = ctx.createLinearGradient(0, y - length, 0, y);
                trail.addColorStop(0, '#aac7cf00');
                trail.addColorStop(1, '#aac7cf60');
                ctx.strokeStyle = trail;
                ctx.lineWidth = .8;
                ctx.beginPath();
                ctx.moveTo(x + 1, y - length);
                ctx.bezierCurveTo(x - 1, y - length * .7, x + 1.5, y - 5, x, y);
                ctx.stroke();
            }
        }
    });
}
