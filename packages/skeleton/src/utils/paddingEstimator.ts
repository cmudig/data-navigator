import type { Geo, ScaffoldConfig } from '../model/doc';
import { app, commit, undo } from '../model/state.svelte';
import { detectMarks, type DetectedComponent } from './markDetection';

// A mark edge or centre at inner fraction f lands at offset + padLo + f * inner, and f does not change with padding.
// Points anchor on centres, rects on edges (stacked segments merge into one blob), lines on their long strokes.
const MIN_DF = 0.15;
type Span = { lo: number; hi: number };
type Box = { x: number; y: number; width: number; height: number };
export interface Fit {
    patch: Partial<ScaffoldConfig> | null;
    warnings: string[];
    target: { x: Span; y: Span } | null;
    points: boolean;
}

export function solveAxisPadding(
    fLo: number,
    fHi: number,
    detLo: number,
    detHi: number,
    offset: number,
    outer: number
) {
    const df = fHi - fLo;
    if (Math.abs(df) < MIN_DF) return 'the marks are too close together on this axis';
    const inner = (detHi - detLo) / df;
    if (!isFinite(inner) || inner <= 0) return 'the marks found in the image do not match the scaffold';
    if (inner > outer) return 'the marks need a wider box than the scaffold has; enlarge the width or height first';
    let lo = detLo - offset - fLo * inner;
    let hi = outer - inner - lo;
    if (lo < 0 && hi < 0) return 'both paddings came out negative; move or resize the box first';
    if (lo < 0) [lo, hi] = [0, outer - inner];
    else if (hi < 0) [lo, hi] = [outer - inner, 0];
    return [Math.round(lo), Math.round(hi)] as [number, number];
}

const median = (v: number[]) => [...v].sort((a, b) => a - b)[v.length >> 1];
const spread = (v: number[]) => (Math.max(...v) - Math.min(...v)) / (median(v) || 1);
const shrink = (g: Box, p: number) => ({ x: g.x + p, y: g.y + p, width: g.width - 2 * p, height: g.height - 2 * p });

function extents(boxes: Box[], centres: boolean) {
    const ax = (k: 'x' | 'y', size: 'width' | 'height'): Span =>
        centres
            ? {
                  lo: Math.min(...boxes.map(b => b[k] + b[size] / 2)),
                  hi: Math.max(...boxes.map(b => b[k] + b[size] / 2))
              }
            : { lo: Math.min(...boxes.map(b => b[k])), hi: Math.max(...boxes.map(b => b[k] + b[size])) };
    return { x: ax('x', 'width'), y: ax('y', 'height') };
}

function keepLike(marks: DetectedComponent[], leaves: Box[], points: boolean) {
    const fits = (v: number, want: number) => v >= want * 0.35 && v <= want * 2.8;
    const w = median(leaves.map(g => g.width));
    const h = median(leaves.map(g => g.height));
    const kept = points
        ? marks.filter(m => fits(Math.max(m.bbox.width, m.bbox.height), Math.max(w, h)))
        : spread(leaves.map(g => g.width)) <= spread(leaves.map(g => g.height))
          ? marks.filter(m => fits(m.bbox.width, w))
          : marks.filter(m => fits(m.bbox.height, h));
    return kept.length >= 2 ? kept : marks;
}

const isLine = (c: ScaffoldConfig) => c.chartType === 'line' || c.chartType === 'area';
const isPoints = (leaves: Geo[]) => leaves.every(g => g.path?.includes('A'));
const anchors = (c: ScaffoldConfig, leaves: Geo[], pad: number) => {
    const points = isPoints(leaves);
    return extents(points ? leaves : leaves.map(g => shrink(g, pad)), points || isLine(c));
};

export async function estimatePadding(
    c: ScaffoldConfig,
    leaves: Geo[],
    image: { url: string; width: number; height: number },
    pad = 0
): Promise<Fit> {
    const fail = (w: string): Fit => ({ patch: null, warnings: [w], target: null, points: false });
    const innerW = c.plotWidth - c.paddingLeft - c.paddingRight;
    const innerH = c.plotHeight - c.paddingTop - c.paddingBottom;
    if (leaves.length < 2 || innerW <= 0 || innerH <= 0)
        return fail('The scaffold needs at least two data marks and a positive plot area.');
    const points = isPoints(leaves);
    const line = isLine(c);
    const plot = { x: c.offsetX, y: c.offsetY, width: c.plotWidth, height: c.plotHeight };
    const detected = await detectMarks(image.url, image.width, image.height, plot, c.chartType);
    const want = anchors(c, leaves, pad);
    const all = detected.all.filter(m => m.klass === 'mark');
    const widest = Math.max(0, ...all.map(m => m.bbox.width));
    const marks = line
        ? all.filter(m => m.bbox.width >= widest * 0.3)
        : keepLike(
              all,
              leaves.map(g => shrink(g, points ? 0 : pad)),
              points
          );
    if (marks.length < (line ? 1 : 2)) return fail('Could not find enough data marks in the image.');
    const got = extents(
        marks.map(m => m.bbox),
        points && !line
    );
    const fx = (v: number) => (v - c.offsetX - c.paddingLeft) / innerW;
    const fy = (v: number) => (v - c.offsetY - c.paddingTop) / innerH;
    const rx = solveAxisPadding(fx(want.x.lo), fx(want.x.hi), got.x.lo, got.x.hi, c.offsetX, c.plotWidth);
    const ry = solveAxisPadding(fy(want.y.lo), fy(want.y.hi), got.y.lo, got.y.hi, c.offsetY, c.plotHeight);
    const patch: Partial<ScaffoldConfig> = {};
    const warnings: string[] = [];
    if (typeof rx === 'string') warnings.push(`Left and right: ${rx}.`);
    else [patch.paddingLeft, patch.paddingRight] = rx;
    if (typeof ry === 'string') warnings.push(`Top and bottom: ${ry}.`);
    else [patch.paddingTop, patch.paddingBottom] = ry;
    return { patch: Object.keys(patch).length ? patch : null, warnings, target: got, points };
}

export function residual(c: ScaffoldConfig, fit: Fit, leaves: Geo[], pad = 0) {
    if (!fit.target) return Infinity;
    const now = anchors(c, leaves, pad);
    const t = fit.target;
    const axes = (['x', 'y'] as const).filter(a => fit.patch?.[a === 'x' ? 'paddingLeft' : 'paddingTop'] !== undefined);
    return Math.max(0, ...axes.flatMap(a => [Math.abs(now[a].lo - t[a].lo), Math.abs(now[a].hi - t[a].hi)]));
}

const leafGeos = () => [...app.graph.nodes.values()].filter(n => n.kind === 'leaf' && !n.pinned).map(n => n.geo);
const leafPad = () => app.pattern.recipe.groups.leafPadding ?? 0;
const fitKey = (c: ScaffoldConfig) =>
    JSON.stringify([
        c.chartType,
        c.xField,
        c.yField,
        c.colorField,
        c.offsetX,
        c.offsetY,
        c.plotWidth,
        c.plotHeight,
        app.doc.image?.width,
        app.doc.image?.url.length
    ]);

export async function runFit(force = false) {
    const c = app.scaffold;
    const image = app.doc.image;
    if (!c || !image || image.built || !c.xField || !c.yField) return;
    const key = fitKey(c);
    const prev = app.ui.fit;
    if (!force && (prev?.key === key || prev?.state === 'running')) return;
    const leaves = leafGeos();
    if (leaves.length < 2) return;
    app.ui.fit = { key, state: 'running', message: 'Fitting the scaffold to the image…' };
    const fit = await estimatePadding(c, leaves, image, leafPad());
    if (!fit.patch) {
        app.ui.fit = {
            key,
            state: 'failed',
            message: `Could not fit the scaffold to the image. ${fit.warnings.join(' ')}`
        };
        return;
    }
    const before = {
        paddingLeft: c.paddingLeft,
        paddingRight: c.paddingRight,
        paddingTop: c.paddingTop,
        paddingBottom: c.paddingBottom
    };
    commit('Fitted padding to image', d => ({ ...d, scaffold: { ...d.scaffold!, ...fit.patch } }));
    app.ui.fit = { key, state: 'checking', message: 'Checking the fit…', fit, before, partial: fit.warnings.join(' ') };
}

export function checkFit() {
    const f = app.ui.fit;
    const c = app.scaffold;
    if (f?.state !== 'checking' || !f.fit || !c) return;
    const r = residual(c, f.fit, leafGeos(), leafPad());
    const limit = Math.max(4, 0.01 * Math.max(c.plotWidth, c.plotHeight));
    if (r > limit) {
        if (app.past.at(-1)?.label === 'Fitted padding to image') undo();
        else commit('Undid padding fit', d => ({ ...d, scaffold: { ...d.scaffold!, ...f.before } }));
        app.ui.fit = {
            key: f.key,
            state: 'failed',
            message: `The fit missed the marks by ${Math.round(r)} px, so it was undone. Adjust the padding by hand, or try again after fixing the fields.`
        };
    } else
        app.ui.fit = {
            key: f.key,
            state: 'ok',
            message: `Fitted to the image within ${Math.max(1, Math.round(r))} px. ${f.partial ?? ''}`.trim()
        };
}
