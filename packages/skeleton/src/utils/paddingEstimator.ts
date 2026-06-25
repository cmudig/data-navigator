/**
 * paddingEstimator — turns "where are the real marks in the image" (from
 * markDetection) plus "where are the scaffold marks right now" (from the leaf
 * nodes positioned by the Vega render) into a new `padding{Left,Right,Top,Bottom}`
 * for the scaffold, holding offsetX/offsetY/plotWidth/plotHeight fixed.
 *
 * Coordinate model (see appState.ScaffoldConfig): a scaffold mark at normalized
 * inner fraction f lands at image-x = offsetX + paddingLeft + f * innerW, where
 * innerW = plotWidth - paddingLeft - paddingRight (and analogously for y, which
 * is image-y-down). f is invariant to padding changes, so we:
 *   1. snapshot the two extreme scaffold marks per axis and their f BEFORE
 *      touching the config,
 *   2. detect the corresponding extreme marks in the image,
 *   3. solve, per axis, for the padding that maps fLo↦detLo and fHi↦detHi.
 *
 * Why bbox centroids work for every chart type (incl. the bar value axis):
 * under a padding change the value→pixel mapping rescales by the same factor as
 * the inner size, so a mark's centroid fraction f = centroid / inner depends only
 * on the data, not on padding. Degenerate axes (all marks at one value) collapse
 * fLo≈fHi and are rejected by the |Δf| guard rather than producing garbage.
 */

import type { ScaffoldConfig } from '../store/appState';
import type { SkeletonNode } from '../store/types';
import { appState } from '../store/appState';
import {
    setPendingPaddingVerification,
    setPaddingEstimateInFlight,
    type PaddingVerificationTargets
} from '../store/scaffoldRuntime';
import { detectMarks } from './markDetection';

const MIN_DF = 0.15; // minimum |fHi - fLo| for a well-conditioned axis solve

// ── Scaffold-side snapshot ────────────────────────────────────────────────────

export interface AxisExtremes {
    fLo: number; // normalized inner fraction of the "low" extreme mark
    fHi: number; // ...of the "high" extreme mark
    loCenter: number; // current image-space centre of the low extreme (for verify/logging)
    hiCenter: number; // ...of the high extreme
}

export interface ScaffoldExtremes {
    x: AxisExtremes | null; // leftmost / rightmost (by centre x)
    y: AxisExtremes | null; // topmost / bottommost (by centre y)
    innerW0: number;
    innerH0: number;
    leafCount: number;
}

/**
 * Snapshot the extreme leaf marks (dnLevel === 3) per axis and their padding-
 * invariant fractions, using the CURRENT config. Call this BEFORE patching.
 */
export function scaffoldExtremeAnchors(config: ScaffoldConfig, nodes: SkeletonNode[]): ScaffoldExtremes {
    const innerW0 = config.plotWidth - config.paddingLeft - config.paddingRight;
    const innerH0 = config.plotHeight - config.paddingTop - config.paddingBottom;
    const leaves = nodes.filter(n => n.dnLevel === 3);

    if (leaves.length < 2 || innerW0 <= 0 || innerH0 <= 0) {
        return { x: null, y: null, innerW0, innerH0, leafCount: leaves.length };
    }

    const items = leaves.map(n => ({ cx: n.x + n.width / 2, cy: n.y + n.height / 2 }));
    let minXi = 0;
    let maxXi = 0;
    let minYi = 0;
    let maxYi = 0;
    items.forEach((it, i) => {
        if (it.cx < items[minXi].cx) minXi = i;
        if (it.cx > items[maxXi].cx) maxXi = i;
        if (it.cy < items[minYi].cy) minYi = i;
        if (it.cy > items[maxYi].cy) maxYi = i;
    });

    const fx = (cx: number) => (cx - config.offsetX - config.paddingLeft) / innerW0;
    const fy = (cy: number) => (cy - config.offsetY - config.paddingTop) / innerH0;

    return {
        x: {
            fLo: fx(items[minXi].cx),
            fHi: fx(items[maxXi].cx),
            loCenter: items[minXi].cx,
            hiCenter: items[maxXi].cx
        },
        y: {
            fLo: fy(items[minYi].cy),
            fHi: fy(items[maxYi].cy),
            loCenter: items[minYi].cy,
            hiCenter: items[maxYi].cy
        },
        innerW0,
        innerH0,
        leafCount: leaves.length
    };
}

// ── Pure axis solver ──────────────────────────────────────────────────────────

export interface AxisSolve {
    ok: boolean;
    padLo?: number;
    padHi?: number;
    warnings: string[];
}

/**
 * Solve one axis. `offset`/`outer` are offsetX/plotWidth (x) or offsetY/plotHeight (y);
 * `padLo`/`padHi` map to left/right or top/bottom respectively.
 */
export function solveAxisPadding(
    label: 'x' | 'y',
    fLo: number,
    fHi: number,
    detLo: number,
    detHi: number,
    offset: number,
    outer: number
): AxisSolve {
    const warnings: string[] = [];
    const df = fHi - fLo;
    if (Math.abs(df) < MIN_DF) {
        warnings.push(`${label}: ill-conditioned (|Δf|=${df.toFixed(3)} < ${MIN_DF}) — skipped`);
        return { ok: false, warnings };
    }

    const innerNew = (detHi - detLo) / df;
    if (!isFinite(innerNew) || innerNew <= 0) {
        warnings.push(`${label}: invalid inner size (${innerNew.toFixed(1)}) — skipped`);
        return { ok: false, warnings };
    }
    if (innerNew > outer) {
        warnings.push(
            `${label}: detected spread needs inner=${innerNew.toFixed(0)} > outer=${outer} — resize the outer box first`
        );
        return { ok: false, warnings };
    }

    let padLo = detLo - offset - fLo * innerNew;
    let padHi = outer - innerNew - padLo;

    if (padLo < 0 && padHi < 0) {
        warnings.push(`${label}: both paddings negative — resize the outer box first`);
        return { ok: false, warnings };
    }
    if (padLo < 0) {
        padLo = 0;
        padHi = outer - innerNew;
        warnings.push(`${label}: clamped low padding to 0`);
    } else if (padHi < 0) {
        padHi = 0;
        padLo = outer - innerNew;
        warnings.push(`${label}: clamped high padding to 0`);
    }

    return { ok: true, padLo: Math.round(padLo), padHi: Math.round(padHi), warnings };
}

// ── Orchestration ─────────────────────────────────────────────────────────────

export interface ImageRef {
    dataUrl: string;
    width: number;
    height: number;
}

export interface EstimateResult {
    patch: Partial<ScaffoldConfig> | null;
    warnings: string[];
    verification: PaddingVerificationTargets | null;
}

/**
 * Full estimate: snapshot scaffold anchors → detect image marks → solve both axes.
 * Returns a config patch (or null if nothing solvable) and the detected targets
 * to verify against after re-render. Does NOT mutate state.
 */
export async function estimatePadding(
    config: ScaffoldConfig,
    nodes: SkeletonNode[],
    image: ImageRef
): Promise<EstimateResult> {
    const warnings: string[] = [];

    const scaffold = scaffoldExtremeAnchors(config, nodes);
    console.log('[padding] scaffold anchors', {
        innerW0: scaffold.innerW0,
        innerH0: scaffold.innerH0,
        leafCount: scaffold.leafCount,
        x: scaffold.x,
        y: scaffold.y
    });
    if (!scaffold.x && !scaffold.y) {
        warnings.push('Not enough scaffold marks (need ≥2 leaves) or invalid inner size');
        return { patch: null, warnings, verification: null };
    }

    const plotRect = {
        x: config.offsetX,
        y: config.offsetY,
        width: config.plotWidth,
        height: config.plotHeight
    };
    const detected = await detectMarks(image.dataUrl, image.width, image.height, plotRect, config.chartType);
    console.log('[detect] components', detected.all);
    console.log('[detect] corners', { x: detected.x, y: detected.y });

    if (!detected.x && !detected.y) {
        console.log('[detect] STOP: no mark candidates for either axis');
        warnings.push('No mark candidates detected for either axis — stopping');
        return { patch: null, warnings, verification: null };
    }

    const patch: Partial<ScaffoldConfig> = {};
    const verification: PaddingVerificationTargets = { x: null, y: null };

    if (scaffold.x && detected.x) {
        const r = solveAxisPadding(
            'x',
            scaffold.x.fLo,
            scaffold.x.fHi,
            detected.x.lo.x,
            detected.x.hi.x,
            config.offsetX,
            config.plotWidth
        );
        warnings.push(...r.warnings);
        if (r.ok) {
            patch.paddingLeft = r.padLo;
            patch.paddingRight = r.padHi;
            verification.x = { detLo: detected.x.lo.x, detHi: detected.x.hi.x };
        }
    } else {
        warnings.push('x: missing scaffold or detected corner — skipped');
    }

    if (scaffold.y && detected.y) {
        const r = solveAxisPadding(
            'y',
            scaffold.y.fLo,
            scaffold.y.fHi,
            detected.y.lo.y,
            detected.y.hi.y,
            config.offsetY,
            config.plotHeight
        );
        warnings.push(...r.warnings);
        if (r.ok) {
            patch.paddingTop = r.padLo;
            patch.paddingBottom = r.padHi;
            verification.y = { detLo: detected.y.lo.y, detHi: detected.y.hi.y };
        }
    } else {
        warnings.push('y: missing scaffold or detected corner — skipped');
    }

    if (Object.keys(patch).length === 0) {
        console.log('[padding] no solvable axis — no patch applied');
        return { patch: null, warnings, verification: null };
    }

    console.log('[padding] solved patch', patch);
    return {
        patch,
        warnings,
        verification: verification.x || verification.y ? verification : null
    };
}

/**
 * Shared core for both the auto-trigger (ScaffoldOverlay) and the manual button
 * (ScaffoldPanel): run the estimate, then — if solvable — stash the verification
 * targets and apply the padding patch. Applying the patch triggers exactly one
 * re-render, whose completion consumes `pendingPaddingVerification` to log the
 * residual. Returns the warnings for the caller to surface.
 */
export async function runEstimateAndApply(
    config: ScaffoldConfig,
    nodes: SkeletonNode[],
    image: ImageRef
): Promise<string[]> {
    setPaddingEstimateInFlight(true);
    try {
        const { patch, warnings, verification } = await estimatePadding(config, nodes, image);
        warnings.forEach(w => console.warn('[padding]', w));
        if (!patch) return warnings;

        // Set verification BEFORE patching so the render the patch triggers can consume it.
        setPendingPaddingVerification(verification);
        appState.update(s => ({
            ...s,
            scaffoldConfig: s.scaffoldConfig ? { ...s.scaffoldConfig, ...patch } : s.scaffoldConfig
        }));
        return warnings;
    } catch (err) {
        // Detection failures (e.g. image load) must not throw into the render
        // pipeline or leave an unhandled rejection — log and stop.
        console.warn('[padding] estimate failed:', err);
        return [`estimate failed: ${String(err)}`];
    } finally {
        setPaddingEstimateInFlight(false);
    }
}

/**
 * One-shot verification, called from the render that follows a padding patch.
 * Re-reads the extreme scaffold marks (now repositioned with the new padding)
 * and logs how far they land from the detected targets.
 */
export function verifyPadding(
    targets: PaddingVerificationTargets,
    config: ScaffoldConfig,
    nodes: SkeletonNode[]
): void {
    const scaffold = scaffoldExtremeAnchors(config, nodes);
    const threshold = Math.max(3, 0.01 * Math.max(config.plotWidth, config.plotHeight));

    if (targets.x && scaffold.x) {
        const loErr = Math.abs(scaffold.x.loCenter - targets.x.detLo);
        const hiErr = Math.abs(scaffold.x.hiCenter - targets.x.detHi);
        const pass = loErr <= threshold && hiErr <= threshold;
        console.log(
            `[verify] residual x: lo=${loErr.toFixed(1)}px hi=${hiErr.toFixed(1)}px — ${pass ? 'PASS' : 'FAIL'} (threshold ${threshold.toFixed(1)}px)`
        );
    }
    if (targets.y && scaffold.y) {
        const loErr = Math.abs(scaffold.y.loCenter - targets.y.detLo);
        const hiErr = Math.abs(scaffold.y.hiCenter - targets.y.detHi);
        const pass = loErr <= threshold && hiErr <= threshold;
        console.log(
            `[verify] residual y: lo=${loErr.toFixed(1)}px hi=${hiErr.toFixed(1)}px — ${pass ? 'PASS' : 'FAIL'} (threshold ${threshold.toFixed(1)}px)`
        );
    }
}
