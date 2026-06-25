/**
 * Offline test harness for the mark-detection CV core.
 *
 * Decodes the example PNGs (RGBA, 8-bit) with a minimal zlib-based PNG decoder,
 * transpiles markDetection.ts via esbuild, and runs analyzePlotPixels() against
 * the full image (mirroring the app, whose default scaffold "outer box" is the
 * whole image). Prints the classified components and chosen corner candidates.
 *
 *   node scripts/test-detection.mjs            # all examples
 *   node scripts/test-detection.mjs bar        # one
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ── Minimal PNG decoder (8-bit, colorType 6 = RGBA) ───────────────────────────
function decodePng(buf) {
    if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    const bitDepth = buf[24];
    const colorType = buf[25];
    if (bitDepth !== 8 || colorType !== 6) throw new Error(`unsupported PNG bd=${bitDepth} ct=${colorType}`);
    const channels = 4;

    // Concatenate IDAT chunks.
    let off = 8;
    const idat = [];
    while (off < buf.length) {
        const len = buf.readUInt32BE(off);
        const type = buf.toString('ascii', off + 4, off + 8);
        const dataStart = off + 8;
        if (type === 'IDAT') idat.push(buf.subarray(dataStart, dataStart + len));
        if (type === 'IEND') break;
        off = dataStart + len + 4; // skip CRC
    }
    const raw = zlib.inflateSync(Buffer.concat(idat));

    // Un-filter scanlines into an RGBA buffer.
    const stride = width * channels;
    const out = new Uint8ClampedArray(width * height * channels);
    let pos = 0;
    for (let y = 0; y < height; y++) {
        const filter = raw[pos++];
        const rowStart = y * stride;
        for (let x = 0; x < stride; x++) {
            const rawByte = raw[pos++];
            const a = x >= channels ? out[rowStart + x - channels] : 0; // left
            const b = y > 0 ? out[rowStart - stride + x] : 0; // up
            const c = x >= channels && y > 0 ? out[rowStart - stride + x - channels] : 0; // up-left
            let val;
            switch (filter) {
                case 0: val = rawByte; break;
                case 1: val = rawByte + a; break;
                case 2: val = rawByte + b; break;
                case 3: val = rawByte + ((a + b) >> 1); break;
                case 4: val = rawByte + paeth(a, b, c); break;
                default: throw new Error('bad filter ' + filter);
            }
            out[rowStart + x] = val & 0xff;
        }
    }
    return { width, height, data: out };
}
function paeth(a, b, c) {
    const p = a + b - c;
    const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
    if (pa <= pb && pa <= pc) return a;
    if (pb <= pc) return b;
    return c;
}

// ── Load the detection core from TS via esbuild ───────────────────────────────
async function loadDetector() {
    const res = await esbuild.build({
        entryPoints: [path.join(ROOT, 'src/utils/markDetection.ts')],
        bundle: true,
        format: 'esm',
        write: false,
        platform: 'node',
        logLevel: 'silent'
    });
    const code = res.outputFiles[0].text;
    const mod = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
    return mod;
}

// ── Run ────────────────────────────────────────────────────────────────────────
const EXAMPLES = {
    bar: 'skeleton_starter.png',
    stacked: 'stack.png',
    line: 'line.png',
    scatter: 'scatter.png'
};
const CHART_TYPE = { bar: 'bar', stacked: 'stacked-bar', line: 'line', scatter: 'scatter' };

const only = process.argv[2];
const detector = await loadDetector();

for (const [name, file] of Object.entries(EXAMPLES)) {
    if (only && only !== name) continue;
    const png = decodePng(fs.readFileSync(path.join(ROOT, 'public', file)));
    // Mirror the app: outer box = whole image, scale to <=1000 longer side.
    const MAX_DIM = 1000;
    const scale = Math.min(1, MAX_DIM / Math.max(png.width, png.height));
    const dw = Math.max(1, Math.round(png.width * scale));
    const dh = Math.max(1, Math.round(png.height * scale));
    const scaled = downscale(png, dw, dh);

    const result = detector.analyzePlotPixels(scaled, dw, dh, scale, 0, 0, CHART_TYPE[name]);

    const counts = {};
    for (const c of result.all) counts[c.klass] = (counts[c.klass] ?? 0) + 1;
    console.log(`\n=== ${name} (${file}) ${png.width}x${png.height} → ${dw}x${dh} ===`);
    console.log('component classes:', counts, 'total:', result.all.length);
    const marks = result.all.filter(c => c.klass === 'mark').sort((a, b) => b.area - a.area);
    console.log(`marks (${marks.length}), top 12 by area:`);
    for (const m of marks.slice(0, 12)) {
        console.log(
            `  area=${Math.round(m.area).toString().padStart(7)} bbox=[${r(m.bbox.x)},${r(m.bbox.y)} ${r(m.bbox.width)}x${r(m.bbox.height)}] fill=${m.fillRatio.toFixed(2)} aspect=${m.aspect.toFixed(1)} rgb=(${m.color.join(',')}) border=${m.touchesBorder}`
        );
    }
    console.log('corners x:', fmtCorner(result.x), ' y:', fmtCorner(result.y));
}

function r(n) { return Math.round(n); }
function fmtCorner(c) {
    if (!c) return 'null';
    return `lo=(${r(c.lo.x)},${r(c.lo.y)}) hi=(${r(c.hi.x)},${r(c.hi.y)})`;
}

// Nearest-neighbour downscale (good enough for detection testing).
function downscale(png, dw, dh) {
    if (dw === png.width && dh === png.height) return png.data;
    const out = new Uint8ClampedArray(dw * dh * 4);
    for (let y = 0; y < dh; y++) {
        const sy = Math.min(png.height - 1, Math.floor((y / dh) * png.height));
        for (let x = 0; x < dw; x++) {
            const sx = Math.min(png.width - 1, Math.floor((x / dw) * png.width));
            const si = (sy * png.width + sx) * 4;
            const di = (y * dw + x) * 4;
            out[di] = png.data[si];
            out[di + 1] = png.data[si + 1];
            out[di + 2] = png.data[si + 2];
            out[di + 3] = png.data[si + 3];
        }
    }
    return out;
}
