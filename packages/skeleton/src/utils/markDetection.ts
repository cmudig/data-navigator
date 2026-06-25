/**
 * markDetection — lightweight, dependency-free computer vision for finding the
 * data marks (bars / scatter points / line vertices) inside an uploaded chart
 * image, and returning the extreme marks per axis as image-space pixel points.
 *
 * Pipeline (all in the browser, runs in a few tens of ms on a downscaled crop):
 *   1. Draw the plot region of the image into an offscreen canvas, downscaled so
 *      the longer side is <= MAX_DIM px (tracked via `scale`).
 *   2. Build a binary foreground mask: a pixel is "ink" if it is notably darker
 *      than the background OR notably saturated. The dual test keeps dark line
 *      charts and pastel coloured bars while rejecting light-grey gridlines.
 *   3. Connected-component labeling (8-connectivity, iterative flood fill).
 *   4. Classify each component as mark | gridline | axis | label | noise using
 *      geometry heuristics (thin-and-long → gridline/axis, tiny → noise, edge-
 *      hugging-and-small → label).
 *   5. Among the surviving marks, pick the extreme components per axis (leftmost
 *      & rightmost for x; topmost & bottommost for y) and return their centroids
 *      mapped back to full-image pixel coordinates.
 *
 * Everything is `console.log`ged for inspection. If an axis has fewer than two
 * usable mark candidates it returns `null` for that axis; the caller stops when
 * both axes are null.
 *
 * The detector is intentionally behind a single `detectMarks()` entry point so a
 * heavier engine (e.g. OpenCV.js) could be swapped in later without touching the
 * padding estimator.
 */

// ── Types ───────────────────────────────────────────────────────────────────

export type MarkClass = 'mark' | 'gridline' | 'axis' | 'label' | 'noise';

export interface DetectedComponent {
    /** Bounding box in full-image pixels. */
    bbox: { x: number; y: number; width: number; height: number };
    /** Centroid (mean of foreground pixels) in full-image pixels. */
    centroid: { x: number; y: number };
    /** Foreground pixel count, in full-image px² (un-scaled). */
    area: number;
    /** area / (bbox area) — solid rects ~1, thin/sparse shapes lower. */
    fillRatio: number;
    /** max(w,h) / min(w,h). */
    aspect: number;
    /** Mean RGB colour, 0–255. */
    color: [number, number, number];
    /** True if the bbox touches the crop edge (titles/labels/clipped marks). */
    touchesBorder: boolean;
    klass: MarkClass;
}

export interface Corner {
    x: number;
    y: number;
}

export interface CornerCandidates {
    /** Leftmost & rightmost mark centroids (image px), or null if < 2 candidates. */
    x: { lo: Corner; hi: Corner } | null;
    /** Topmost & bottommost mark centroids (image px), or null if < 2 candidates. */
    y: { lo: Corner; hi: Corner } | null;
    /** Every detected component (for inspection / console logging). */
    all: DetectedComponent[];
}

export interface PlotRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

// ── Tunables ────────────────────────────────────────────────────────────────

const MAX_DIM = 1000; // longer side of the working canvas, px
const DARK_T = 40; // luminance below (bg - DARK_T) counts as ink (monochrome fallback)
const SAT_T = 0.18; // HSV saturation above this counts as a coloured mark pixel
const COLOR_COVERAGE_MIN = 0.002; // if saturated pixels cover < this fraction, fall back to dark mask
const NOISE_AREA = 12; // components below this many scaled px² are noise
const GRID_THIN = 3; // <= this many scaled px on the short side → candidate gridline
const GRID_SPAN = 0.5; // ...and spanning >= this fraction of the plot dim → gridline/axis
const LABEL_MAXDIM = 0.15; // edge-hugging components smaller than this fraction → label

// ── Entry point ──────────────────────────────────────────────────────────────

export async function detectMarks(
    imageDataUrl: string,
    imageWidth: number,
    imageHeight: number,
    plotRect: PlotRect,
    chartType: string
): Promise<CornerCandidates> {
    const img = await loadImage(imageDataUrl);

    // Clamp the crop to the image bounds. We crop to the OUTER plot box (not the
    // inner area) so that real marks remain inside the crop even when the current
    // padding is wrong — that is exactly the case this feature exists to fix.
    const cropX = clamp(plotRect.x, 0, imageWidth);
    const cropY = clamp(plotRect.y, 0, imageHeight);
    const cropW = clamp(plotRect.width, 1, imageWidth - cropX);
    const cropH = clamp(plotRect.height, 1, imageHeight - cropY);

    const scale = Math.min(1, MAX_DIM / Math.max(cropW, cropH));
    const dw = Math.max(1, Math.round(cropW * scale));
    const dh = Math.max(1, Math.round(cropH * scale));

    const canvas = document.createElement('canvas');
    canvas.width = dw;
    canvas.height = dh;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
        console.warn('[detect] no 2d canvas context');
        return { x: null, y: null, all: [] };
    }
    ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, dw, dh);
    const { data } = ctx.getImageData(0, 0, dw, dh);

    return analyzePlotPixels(data, dw, dh, scale, cropX, cropY, chartType);
}

/**
 * Pure pixel-analysis core — no DOM. Takes the (already cropped + downscaled)
 * RGBA buffer plus the mapping back to full-image space, and returns the
 * classified components + extreme corner candidates. Exposed separately so it
 * can be unit-tested in Node against real chart images.
 *
 * @param data   RGBA bytes of the working buffer, length dw*dh*4.
 * @param scale  working-px → image-px factor used during downscale (1 if none).
 * @param cropX  crop origin in full-image px (added back after un-scaling).
 */
export function analyzePlotPixels(
    data: Uint8ClampedArray | Uint8Array,
    dw: number,
    dh: number,
    scale: number,
    cropX: number,
    cropY: number,
    chartType: string
): CornerCandidates {
    // 1. Background luminance from the crop border pixels (median ≈ modal).
    const bg = estimateBackgroundLuminance(data, dw, dh);

    // 2. Foreground mask. Charts almost always render data marks in colour while
    // the chrome (axis lines, gridlines, tick labels, title, legend text) is
    // grayscale. A saturation mask therefore isolates the marks AND prevents the
    // black axis line from bridging neighbouring bars into one blob. If the image
    // has very little colour (a monochrome chart) we fall back to a dark-ink mask.
    const npx = dw * dh;
    const mask = new Uint8Array(npx);
    let coloured = 0;
    for (let i = 0; i < npx; i++) {
        if (data[i * 4 + 3] >= 16 && saturation(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]) > SAT_T) {
            coloured++;
        }
    }
    const useColour = coloured / npx >= COLOR_COVERAGE_MIN;
    if (useColour) {
        for (let i = 0; i < npx; i++) {
            if (data[i * 4 + 3] >= 16 && saturation(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]) > SAT_T) {
                mask[i] = 1;
            }
        }
    } else {
        for (let i = 0; i < npx; i++) {
            if (data[i * 4 + 3] >= 16 && luminance(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]) < bg - DARK_T) {
                mask[i] = 1;
            }
        }
    }

    // 3. Connected components.
    const raw = labelComponents(mask, data, dw, dh);

    const toImg = (lx: number, ly: number): Corner => ({ x: cropX + lx / scale, y: cropY + ly / scale });

    // 4 + 5. Classify + map back to image space (keeping raw for endpoint use).
    const tagged = raw.map(c => {
        const bw = c.maxX - c.minX + 1;
        const bh = c.maxY - c.minY + 1;
        const touchesBorder = c.minX === 0 || c.minY === 0 || c.maxX === dw - 1 || c.maxY === dh - 1;
        const fillRatio = c.area / (bw * bh);
        const aspect = Math.max(bw, bh) / Math.max(1, Math.min(bw, bh));
        const klass = classify(bw, bh, c.area, fillRatio, aspect, touchesBorder, c, dw, dh);
        const bboxTL = toImg(c.minX, c.minY);
        const comp: DetectedComponent = {
            bbox: { x: bboxTL.x, y: bboxTL.y, width: bw / scale, height: bh / scale },
            centroid: toImg(c.sumX / c.area, c.sumY / c.area),
            area: c.area / (scale * scale),
            fillRatio,
            aspect,
            color: [Math.round(c.sumR / c.area), Math.round(c.sumG / c.area), Math.round(c.sumB / c.area)],
            touchesBorder,
            klass
        };
        return { comp, raw: c };
    });

    const components = tagged.map(t => t.comp);
    const markPairs = tagged.filter(t => t.comp.klass === 'mark');

    const isLineLike = chartType === 'line' || chartType === 'area';

    let x: { lo: Corner; hi: Corner } | null;
    let y: { lo: Corner; hi: Corner } | null;

    if (isLineLike && markPairs.length >= 1) {
        // The line/area mark is one long connected stroke. Use its extreme pixels
        // as the first/last (x) and top/bottom (y) data anchors.
        const dom = markPairs.reduce((a, b) => (b.comp.area > a.comp.area ? b : a)).raw;
        x = { lo: toImg(dom.minX, dom.xLoY), hi: toImg(dom.maxX, dom.xHiY) };
        y = { lo: toImg(dom.yLoX, dom.minY), hi: toImg(dom.yHiX, dom.maxY) };
    } else {
        // Discrete marks (bar/scatter/…): correspond by centroid extremes, after
        // dropping marks far smaller than the typical mark — these are almost
        // always legend colour swatches, which are much smaller than data marks.
        const markComps = dropSmallMarks(markPairs.map(t => t.comp));
        const ex = pickExtremes(markComps, m => m.centroid.x);
        const ey = pickExtremes(markComps, m => m.centroid.y);
        x = ex ? { lo: ex.lo.centroid, hi: ex.hi.centroid } : null;
        y = ey ? { lo: ey.lo.centroid, hi: ey.hi.centroid } : null;
    }

    return { x, y, all: components };
}

const LEGEND_AREA_FRAC = 0.15; // marks smaller than this × median area are dropped

/**
 * Remove marks far smaller than the median mark area. Data marks within a chart
 * are similar in size, whereas a legend's swatches are notably smaller — this
 * cleanly removes legend swatches (e.g. on a stacked bar) without touching the
 * data marks, and is a no-op when every mark is the same size (e.g. scatter).
 */
function dropSmallMarks(marks: DetectedComponent[]): DetectedComponent[] {
    if (marks.length < 3) return marks;
    const areas = marks.map(m => m.area).sort((a, b) => a - b);
    const median = areas[Math.floor(areas.length / 2)];
    const filtered = marks.filter(m => m.area >= LEGEND_AREA_FRAC * median);
    return filtered.length >= 2 ? filtered : marks;
}

// ── Classification ────────────────────────────────────────────────────────────

function classify(
    bw: number,
    bh: number,
    area: number,
    fillRatio: number,
    aspect: number,
    touchesBorder: boolean,
    c: RawComponent,
    dw: number,
    dh: number
): MarkClass {
    if (area < NOISE_AREA) return 'noise';

    // Thin-and-long → axis line or gridline.
    const thin = Math.min(bw, bh) <= GRID_THIN;
    const spansX = bw >= GRID_SPAN * dw;
    const spansY = bh >= GRID_SPAN * dh;
    if (thin && (spansX || spansY)) {
        const touchesEdge = c.minX === 0 || c.minY === 0 || c.maxX === dw - 1 || c.maxY === dh - 1;
        return touchesEdge ? 'axis' : 'gridline';
    }

    // Edge-hugging small blobs → axis labels / tick text / titles.
    if (touchesBorder && Math.max(bw, bh) < LABEL_MAXDIM * Math.max(dw, dh)) return 'label';

    // Extreme aspect ratios that are not full-span are usually text runs.
    if (aspect > 12 && fillRatio < 0.4) return 'label';

    return 'mark';
}

// ── Extreme selection ────────────────────────────────────────────────────────

function pickExtremes(
    marks: DetectedComponent[],
    key: (m: DetectedComponent) => number
): { lo: DetectedComponent; hi: DetectedComponent } | null {
    if (marks.length < 2) return null;
    let lo = marks[0];
    let hi = marks[0];
    for (const m of marks) {
        if (key(m) < key(lo)) lo = m;
        if (key(m) > key(hi)) hi = m;
    }
    if (lo === hi) return null;
    return { lo, hi };
}

// ── Connected-component labeling (8-connectivity, iterative flood fill) ────────

interface RawComponent {
    area: number;
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    sumX: number;
    sumY: number;
    sumR: number;
    sumG: number;
    sumB: number;
    // Coordinates of the extreme pixels (used for line/area endpoints).
    xLoY: number; // y at the leftmost pixel
    xHiY: number; // y at the rightmost pixel
    yLoX: number; // x at the topmost pixel
    yHiX: number; // x at the bottommost pixel
}

function labelComponents(mask: Uint8Array, data: Uint8ClampedArray | Uint8Array, w: number, h: number): RawComponent[] {
    const visited = new Uint8Array(w * h);
    const comps: RawComponent[] = [];
    const stack: number[] = [];

    for (let start = 0; start < w * h; start++) {
        if (mask[start] === 0 || visited[start]) continue;
        stack.length = 0;
        stack.push(start);
        visited[start] = 1;
        const comp: RawComponent = {
            area: 0,
            minX: w,
            minY: h,
            maxX: 0,
            maxY: 0,
            sumX: 0,
            sumY: 0,
            sumR: 0,
            sumG: 0,
            sumB: 0,
            xLoY: 0,
            xHiY: 0,
            yLoX: 0,
            yHiX: 0
        };

        while (stack.length) {
            const idx = stack.pop()!;
            const x = idx % w;
            const y = (idx - x) / w;
            comp.area++;
            comp.sumX += x;
            comp.sumY += y;
            comp.sumR += data[idx * 4];
            comp.sumG += data[idx * 4 + 1];
            comp.sumB += data[idx * 4 + 2];
            if (x < comp.minX) {
                comp.minX = x;
                comp.xLoY = y;
            }
            if (x > comp.maxX) {
                comp.maxX = x;
                comp.xHiY = y;
            }
            if (y < comp.minY) {
                comp.minY = y;
                comp.yLoX = x;
            }
            if (y > comp.maxY) {
                comp.maxY = y;
                comp.yHiX = x;
            }

            // 8-connected neighbours
            for (let dy = -1; dy <= 1; dy++) {
                const ny = y + dy;
                if (ny < 0 || ny >= h) continue;
                for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    const nx = x + dx;
                    if (nx < 0 || nx >= w) continue;
                    const nidx = ny * w + nx;
                    if (mask[nidx] === 1 && !visited[nidx]) {
                        visited[nidx] = 1;
                        stack.push(nidx);
                    }
                }
            }
        }
        comps.push(comp);
    }

    return comps;
}

// ── Pixel helpers ─────────────────────────────────────────────────────────────

function luminance(r: number, g: number, b: number): number {
    return 0.299 * r + 0.587 * g + 0.114 * b;
}

function saturation(r: number, g: number, b: number): number {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (max === 0) return 0;
    return (max - min) / max;
}

function estimateBackgroundLuminance(data: Uint8ClampedArray | Uint8Array, w: number, h: number): number {
    const lums: number[] = [];
    const push = (i: number) => lums.push(luminance(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]));
    for (let x = 0; x < w; x++) {
        push(x); // top row
        push((h - 1) * w + x); // bottom row
    }
    for (let y = 0; y < h; y++) {
        push(y * w); // left col
        push(y * w + (w - 1)); // right col
    }
    lums.sort((a, b) => a - b);
    return lums[Math.floor(lums.length / 2)] ?? 255;
}

function clamp(v: number, lo: number, hi: number): number {
    return Math.max(lo, Math.min(hi, v));
}

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('failed to load image for mark detection'));
        img.src = src;
    });
}
