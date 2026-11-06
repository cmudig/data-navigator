import type { Geo, ScaffoldConfig } from '../model/doc';
import { detectMarks } from './markDetection';

// A mark at inner fraction f lands at offset + padLo + f * inner, and f does not change with padding.
// So we snapshot the extreme marks' fractions, detect the matching marks in the image, and solve each axis.
const MIN_DF = 0.15;

export function solveAxisPadding(
    fLo: number,
    fHi: number,
    detLo: number,
    detHi: number,
    offset: number,
    outer: number
) {
    const df = fHi - fLo;
    if (Math.abs(df) < MIN_DF) return null;
    const inner = (detHi - detLo) / df;
    if (!isFinite(inner) || inner <= 0 || inner > outer) return null;
    let lo = detLo - offset - fLo * inner;
    let hi = outer - inner - lo;
    if (lo < 0 && hi < 0) return null;
    if (lo < 0) [lo, hi] = [0, outer - inner];
    else if (hi < 0) [lo, hi] = [outer - inner, 0];
    return [Math.round(lo), Math.round(hi)];
}

export async function estimatePadding(
    c: ScaffoldConfig,
    leaves: Geo[],
    image: { url: string; width: number; height: number }
) {
    const innerW = c.plotWidth - c.paddingLeft - c.paddingRight;
    const innerH = c.plotHeight - c.paddingTop - c.paddingBottom;
    if (leaves.length < 2 || innerW <= 0 || innerH <= 0) return null;
    const cx = leaves.map(g => g.x + g.width / 2);
    const cy = leaves.map(g => g.y + g.height / 2);
    const detected = await detectMarks(
        image.url,
        image.width,
        image.height,
        { x: c.offsetX, y: c.offsetY, width: c.plotWidth, height: c.plotHeight },
        c.chartType
    );
    const patch: Partial<ScaffoldConfig> = {};
    if (detected.x) {
        const f = (v: number) => (v - c.offsetX - c.paddingLeft) / innerW;
        const r = solveAxisPadding(
            f(Math.min(...cx)),
            f(Math.max(...cx)),
            detected.x.lo.x,
            detected.x.hi.x,
            c.offsetX,
            c.plotWidth
        );
        if (r) [patch.paddingLeft, patch.paddingRight] = r;
    }
    if (detected.y) {
        const f = (v: number) => (v - c.offsetY - c.paddingTop) / innerH;
        const r = solveAxisPadding(
            f(Math.min(...cy)),
            f(Math.max(...cy)),
            detected.y.lo.y,
            detected.y.hi.y,
            c.offsetY,
            c.plotHeight
        );
        if (r) [patch.paddingTop, patch.paddingBottom] = r;
    }
    return Object.keys(patch).length ? patch : null;
}
