/**
 * scaffoldAdapter — Renders a Vega-Lite spec to a hidden container, extracts
 * mark positions from the SVG output, and converts them into SkeletonNodes
 * and SkeletonEdges ready to be committed to the editor.
 *
 * Vega-Lite is dynamically imported (lazy) so it does not bloat the initial bundle.
 */

import type { ScaffoldConfig } from '../store/appState';
import type { SkeletonNode, SkeletonEdge } from '../store/types';
import type { VegaLiteSpec, Row } from './vegaBuilder';
import { defaultRenderProperties, defaultSemantics } from '../store/nodeFactory';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ExtractedMark {
    type: 'rect' | 'ellipse' | 'path';
    // Image-space position (Vega SVG coords + offsetX/Y)
    x: number;
    y: number;
    width: number;
    height: number;
    pathData?: string; // SVG d attribute, only for path marks
    datum: Record<string, unknown>; // the original data row for this mark
    seriesKey?: string; // series/color field value — used to group line/area marks
    markIndex?: number; // ordinal index within its series
}

export interface VegaEmbedResult {
    view: import('vega').View;
    finalize: () => void;
}

// ── Lazy Vega-embed loader ─────────────────────────────────────────────────────

let _vegaEmbed: ((el: HTMLElement, spec: unknown, opts: unknown) => Promise<VegaEmbedResult>) | null = null;

export async function getVegaEmbed(): Promise<
    (el: HTMLElement, spec: unknown, opts: unknown) => Promise<VegaEmbedResult>
> {
    if (!_vegaEmbed) {
        const mod = await import('vega-embed');
        _vegaEmbed = mod.default as (el: HTMLElement, spec: unknown, opts: unknown) => Promise<VegaEmbedResult>;
    }
    return _vegaEmbed!;
}

// ── SVG rendering + mark extraction ──────────────────────────────────────────

/**
 * Render a Vega-Lite spec to a hidden off-screen container, extract mark
 * positions from the SVG output, and return the Vega view (for scale access).
 *
 * The caller is responsible for calling cleanup() when done.
 */
export async function renderToHidden(spec: VegaLiteSpec): Promise<{
    container: HTMLDivElement;
    view: import('vega').View;
    cleanup: () => void;
}> {
    const embed = await getVegaEmbed();

    const container = document.createElement('div');
    container.style.cssText = 'position:absolute;left:-9999px;top:-9999px;visibility:hidden;pointer-events:none';
    document.body.appendChild(container);

    const result = await embed(container, spec as never, {
        renderer: 'svg',
        actions: false,
        tooltip: false
    });

    return {
        container,
        view: result.view,
        cleanup: () => {
            result.finalize();
            if (container.parentNode) container.parentNode.removeChild(container);
        }
    };
}

/**
 * Extract mark positions from a rendered Vega SVG container.
 * Positions are returned in Vega's coordinate space (relative to the SVG origin).
 * The caller must add config.offsetX/Y to translate to image space.
 */
export function extractMarksFromSVG(container: HTMLDivElement, config: ScaffoldConfig): ExtractedMark[] {
    const svg = container.querySelector('svg');
    if (!svg) return [];

    const svgRect = svg.getBoundingClientRect();
    const marks: ExtractedMark[] = [];

    // Vega renders mark groups with role="mark" aria attributes.
    // We target rect, circle, and path elements within mark groups,
    // excluding axes, legends, and background elements.
    const markGroups = svg.querySelectorAll('[role="graphics-symbol"],[role="mark"]');

    // Fallback: if role attributes aren't present, select by element type inside
    // the plot area (exclude axis/legend groups by checking parent hierarchy)
    const candidates =
        markGroups.length > 0
            ? Array.from(markGroups)
            : Array.from(svg.querySelectorAll('rect, circle, path')).filter(el => isPlotMark(el as SVGElement));

    for (const el of candidates) {
        const tag = el.tagName.toLowerCase();
        if (tag === 'rect') {
            const r = el as SVGRectElement;
            const box = r.getBoundingClientRect();
            if (box.width < 2 || box.height < 2) continue; // skip degenerate rects
            marks.push({
                type: 'rect',
                x: box.left - svgRect.left + config.offsetX,
                y: box.top - svgRect.top + config.offsetY,
                width: box.width,
                height: box.height,
                datum: {},
                seriesKey: getSeriesKey(el as SVGElement, config)
            });
        } else if (tag === 'circle') {
            const c = el as SVGCircleElement;
            const box = c.getBoundingClientRect();
            if (box.width < 2) continue;
            marks.push({
                type: 'ellipse',
                x: box.left - svgRect.left + config.offsetX,
                y: box.top - svgRect.top + config.offsetY,
                width: box.width,
                height: box.height,
                datum: {},
                seriesKey: getSeriesKey(el as SVGElement, config)
            });
        } else if (tag === 'path') {
            const p = el as SVGPathElement;
            const d = p.getAttribute('d');
            if (!d || d === 'M0,0') continue;
            const box = p.getBoundingClientRect();
            if (box.width < 2 && box.height < 2) continue;
            // Translate path coordinates from screen space to image space
            const translatedD = translatePathData(d, -svgRect.left + config.offsetX, -svgRect.top + config.offsetY);
            marks.push({
                type: 'path',
                x: box.left - svgRect.left + config.offsetX,
                y: box.top - svgRect.top + config.offsetY,
                width: box.width,
                height: box.height,
                pathData: translatedD,
                datum: {},
                seriesKey: getSeriesKey(el as SVGElement, config)
            });
        }
    }

    return marks;
}

/** True if an SVG element is a data mark (not axis/legend/background). */
function isPlotMark(el: SVGElement): boolean {
    let node: Element | null = el;
    while (node) {
        const role = node.getAttribute('aria-label') ?? '';
        if (role.includes('axis') || role.includes('legend') || role.includes('title')) return false;
        const cls = node.getAttribute('class') ?? '';
        if (cls.includes('background') || cls.includes('axis') || cls.includes('legend')) return false;
        node = node.parentElement;
    }
    return true;
}

/** Extract the series key from an SVG element by checking fill/class siblings. */
function getSeriesKey(el: SVGElement, config: ScaffoldConfig): string | undefined {
    // Vega groups marks by series in <g> elements with aria-label attributes
    const parent = el.parentElement;
    if (!parent) return undefined;
    const label = parent.getAttribute('aria-label') ?? parent.getAttribute('description') ?? '';
    // Return the content as a rough series key; refined in marksToNodes
    return label || undefined;
}

/**
 * Translate SVG path d string coordinates by (dx, dy).
 * Only handles absolute M, L, C, Q, Z commands — sufficient for Vega's output.
 */
function translatePathData(d: string, dx: number, dy: number): string {
    if (dx === 0 && dy === 0) return d;
    return d.replace(/([MLCQSZml])\s*([-\d.,\s]+)?/g, (match, cmd, coords) => {
        if (!coords) return cmd;
        const upperCmd = cmd.toUpperCase();
        // Only translate absolute commands; relative commands don't need translation
        if (cmd === cmd.toLowerCase()) return match;
        const nums = coords
            .trim()
            .split(/[\s,]+/)
            .map(Number);
        const translated: number[] = [];
        for (let i = 0; i < nums.length; i++) {
            // For M and L: pairs of x,y
            // For C: triplets of x1,y1,x2,y2,x,y
            // Simple heuristic: even indices are x, odd are y (works for M, L, C, Q)
            if (upperCmd === 'Z') {
                translated.push(nums[i]);
            } else if (i % 2 === 0) {
                translated.push(nums[i] + dx);
            } else {
                translated.push(nums[i] + dy);
            }
        }
        return `${cmd}${translated.join(',')}`;
    });
}

// ── Scale-based node repositioning ────────────────────────────────────────────

/**
 * Compute position updates for existing leaf nodes using Vega's scale API.
 * Returns a Map<nodeId, {x,y,width,height}> — does NOT write to appState.
 *
 * This is the primary positioning mechanism. It works for hidden containers
 * because view.scale() uses the internal scale functions, not DOM layout.
 *
 * Supports: bar, stacked-bar, clustered-bar, scatter.
 *
 * @param data - The resolved data rows (same rows passed to buildVegaSpec).
 *               Required for stacked-bar to compute per-segment cumulative offsets.
 */
export function positionNodesFromVegaScales(
    view: import('vega').View,
    nodes: SkeletonNode[],
    config: ScaffoldConfig,
    data: Row[] = []
): Map<string, { x: number; y: number; width: number; height: number; pathData?: string; shape?: 'path' }> {
    const updates = new Map<
        string,
        { x: number; y: number; width: number; height: number; pathData?: string; shape?: 'path' }
    >();
    const xField = config.xField;
    const yField = config.yField;
    if (!xField || !yField) return updates;

    type BandScale = ((v: unknown) => number) & { bandwidth?: () => number };
    const xScale = view.scale('x') as BandScale | undefined;
    const yScale = view.scale('y') as ((v: unknown) => number) | undefined;

    if (!xScale || !yScale) return updates;

    const leafNodes = nodes.filter(n => n.dnLevel === 3);

    if (config.chartType === 'bar' || config.chartType === 'clustered-bar') {
        if (config.barOrientation === 'horizontal') {
            type BandScaleH = ((v: unknown) => number) & { bandwidth?: () => number };
            const yBandScale = view.scale('y') as BandScaleH | undefined;
            const xLinScale = view.scale('x') as ((v: unknown) => number) | undefined;
            if (!yBandScale || !xLinScale) return updates;
            const bh = yBandScale.bandwidth ? yBandScale.bandwidth() : 20;
            const xZero = xLinScale(0) ?? 0;
            for (const node of leafNodes) {
                const catVal = node.data[xField];
                const numVal = Number(node.data[yField] ?? 0);
                const scaledY = yBandScale(catVal);
                if (scaledY === undefined || isNaN(scaledY as number)) continue;
                const barRight = xLinScale(numVal);
                updates.set(node.id, {
                    x: (xZero as number) + config.paddingLeft + config.offsetX,
                    y: (scaledY as number) + config.paddingTop + config.offsetY,
                    width: Math.max(1, (barRight as number) - (xZero as number)),
                    height: bh
                });
            }
        } else {
            const bw = xScale.bandwidth ? xScale.bandwidth() : 20;
            const yZero = yScale(0) ?? config.plotHeight;
            for (const node of leafNodes) {
                const catVal = node.data[xField];
                const numVal = Number(node.data[yField] ?? 0);
                const scaledX = xScale(catVal);
                if (scaledX === undefined || isNaN(scaledX as number)) continue;
                const barTop = yScale(numVal);
                updates.set(node.id, {
                    x: (scaledX as number) + config.paddingLeft + config.offsetX,
                    y: barTop + config.paddingTop + config.offsetY,
                    width: bw,
                    height: Math.max(1, (yZero as number) - barTop)
                });
            }
        }
    } else if (config.chartType === 'stacked-bar') {
        // Stacked bars: each segment's y position depends on the cumulative sum of
        // all segments below it. We compute stack offsets from the data ourselves so
        // we don't need to reach into Vega's internal transform state.
        const colorField = config.colorField;
        if (!colorField) {
            // No series field — fall back to plain-bar positioning
            if (config.barOrientation === 'horizontal') {
                type BandScaleH = ((v: unknown) => number) & { bandwidth?: () => number };
                const yBandScale = view.scale('y') as BandScaleH | undefined;
                const xLinScale = view.scale('x') as ((v: unknown) => number) | undefined;
                if (!yBandScale || !xLinScale) return updates;
                const bh = yBandScale.bandwidth ? yBandScale.bandwidth() : 20;
                const xZero = xLinScale(0) ?? 0;
                for (const node of leafNodes) {
                    const catVal = node.data[xField];
                    const numVal = Number(node.data[yField] ?? 0);
                    const scaledY = yBandScale(catVal);
                    if (scaledY === undefined || isNaN(scaledY as number)) continue;
                    const barRight = xLinScale(numVal);
                    updates.set(node.id, {
                        x: (xZero as number) + config.paddingLeft + config.offsetX,
                        y: (scaledY as number) + config.paddingTop + config.offsetY,
                        width: Math.max(1, (barRight as number) - (xZero as number)),
                        height: bh
                    });
                }
            } else {
                const bw = xScale.bandwidth ? xScale.bandwidth() : 20;
                const yZero = yScale(0) ?? config.plotHeight;
                for (const node of leafNodes) {
                    const catVal = node.data[xField];
                    const numVal = Number(node.data[yField] ?? 0);
                    const scaledX = xScale(catVal);
                    if (scaledX === undefined || isNaN(scaledX as number)) continue;
                    const barTop = yScale(numVal);
                    updates.set(node.id, {
                        x: (scaledX as number) + config.paddingLeft + config.offsetX,
                        y: barTop + config.paddingTop + config.offsetY,
                        width: bw,
                        height: Math.max(1, (yZero as number) - barTop)
                    });
                }
            }
            return updates;
        }

        // Build a stack-offset map: Map<catVal, Map<colorVal, {y0, y1}>>
        // Groups rows by xField; preserves data insertion order within each group
        // (Vega-Lite stacks in data order by default — do NOT sort here).
        const stackMap = new Map<unknown, Map<unknown, { y0: number; y1: number }>>();
        const groupedData = new Map<unknown, Row[]>();
        for (const row of data) {
            const cat = row[xField];
            if (!groupedData.has(cat)) groupedData.set(cat, []);
            groupedData.get(cat)!.push(row);
        }
        for (const [cat, rows] of groupedData) {
            const seriesMap = new Map<unknown, { y0: number; y1: number }>();
            let cumulative = 0;
            for (const row of rows) {
                const val = Number(row[yField] ?? 0);
                seriesMap.set(row[colorField], { y0: cumulative, y1: cumulative + val });
                cumulative += val;
            }
            stackMap.set(cat, seriesMap);
        }

        if (config.barOrientation === 'horizontal') {
            type BandScaleH = ((v: unknown) => number) & { bandwidth?: () => number };
            const yBandScale = view.scale('y') as BandScaleH | undefined;
            const xLinScale = view.scale('x') as ((v: unknown) => number) | undefined;
            if (!yBandScale || !xLinScale) return updates;
            const bh = yBandScale.bandwidth ? yBandScale.bandwidth() : 20;
            for (const node of leafNodes) {
                const catVal = node.data[xField];
                const colorVal = node.data[colorField];
                const offsets = stackMap.get(catVal)?.get(colorVal);
                if (!offsets) continue;
                const scaledY = yBandScale(catVal);
                if (scaledY === undefined || isNaN(scaledY as number)) continue;
                const x0 = xLinScale(offsets.y0) as number;
                const x1 = xLinScale(offsets.y1) as number;
                updates.set(node.id, {
                    x: x0 + config.paddingLeft + config.offsetX,
                    y: (scaledY as number) + config.paddingTop + config.offsetY,
                    width: Math.max(1, x1 - x0),
                    height: bh
                });
            }
        } else {
            const bw = xScale.bandwidth ? xScale.bandwidth() : 20;
            for (const node of leafNodes) {
                const catVal = node.data[xField];
                const colorVal = node.data[colorField];
                const offsets = stackMap.get(catVal)?.get(colorVal);
                if (!offsets) continue;
                const scaledX = xScale(catVal);
                if (scaledX === undefined || isNaN(scaledX as number)) continue;
                // y1 is the stack top (higher value = lower pixel Y in screen coords)
                const pixY1 = yScale(offsets.y1);
                const pixY0 = yScale(offsets.y0);
                updates.set(node.id, {
                    x: (scaledX as number) + config.paddingLeft + config.offsetX,
                    y: pixY1 + config.paddingTop + config.offsetY,
                    width: bw,
                    height: Math.max(1, pixY0 - pixY1)
                });
            }
        }
    } else if (config.chartType === 'scatter') {
        const pointR = Math.sqrt((config.markParams.pointSize ?? 300) / Math.PI);
        for (const node of leafNodes) {
            const xVal = Number(node.data[xField] ?? 0);
            const yVal = Number(node.data[yField] ?? 0);
            const px = xScale(xVal) as number;
            const py = yScale(yVal) as number;
            const cx = px + config.paddingLeft + config.offsetX;
            const cy = py + config.paddingTop + config.offsetY;
            updates.set(node.id, {
                x: cx - pointR,
                y: cy - pointR,
                width: pointR * 2,
                height: pointR * 2,
                pathData: `M ${cx - pointR},${cy} A ${pointR},${pointR},0,0,1,${cx + pointR},${cy} A ${pointR},${pointR},0,0,1,${cx - pointR},${cy} Z`,
                shape: 'path'
            });
        }
    }

    return updates;
}

// ── Nodes + Edges generation ──────────────────────────────────────────────────

function makeId(): string {
    return crypto.randomUUID();
}

/**
 * Convert extracted marks into SkeletonNodes and SkeletonEdges.
 *
 * Output per chart type:
 * - bar, scatter: one rect/ellipse node per mark
 * - stacked-bar, clustered-bar: one rect node per segment
 * - line, area: one path node per series (parent) + one ellipse per data point (child)
 */
export function marksToNodes(
    marks: ExtractedMark[],
    config: ScaffoldConfig
): { nodes: SkeletonNode[]; edges: SkeletonEdge[] } {
    const nodes: SkeletonNode[] = [];
    const edges: SkeletonEdge[] = [];

    if (config.chartType === 'line' || config.chartType === 'area') {
        return buildLineAreaNodes(marks, config);
    }

    // For all rect/ellipse chart types: one node per mark
    for (let i = 0; i < marks.length; i++) {
        const m = marks[i];
        const node = makeScaffoldNode(m, config, i);
        nodes.push(node);
    }

    return { nodes, edges };
}

function buildLineAreaNodes(
    marks: ExtractedMark[],
    config: ScaffoldConfig
): { nodes: SkeletonNode[]; edges: SkeletonEdge[] } {
    const nodes: SkeletonNode[] = [];
    const edges: SkeletonEdge[] = [];

    // Separate path marks (series) from point marks (data points)
    const pathMarks = marks.filter(m => m.type === 'path');
    const pointMarks = marks.filter(m => m.type !== 'path');

    // Group point marks by seriesKey
    const pointsBySeries = new Map<string, ExtractedMark[]>();
    for (const pm of pointMarks) {
        const key = pm.seriesKey ?? '__default__';
        if (!pointsBySeries.has(key)) pointsBySeries.set(key, []);
        pointsBySeries.get(key)!.push(pm);
    }

    if (pathMarks.length > 0) {
        // Create one path node per series path
        for (let si = 0; si < pathMarks.length; si++) {
            const pm = pathMarks[si];
            const seriesNodeId = makeId();
            const seriesNode: SkeletonNode = {
                id: seriesNodeId,
                label: pm.seriesKey ? `Series: ${pm.seriesKey}` : `Series ${si + 1}`,
                source: 'scaffold',
                dnLevel: 2,
                x: pm.x,
                y: pm.y,
                width: pm.width,
                height: pm.height,
                pathData: pm.pathData,
                pathBounds: { x: pm.x, y: pm.y, width: pm.width, height: pm.height },
                isEntry: false,
                isCluster: false,
                semantics: { ...defaultSemantics(), name: 'series' },
                data: { series: pm.seriesKey ?? si },
                renderProperties: {
                    ...defaultRenderProperties(),
                    shape: 'path',
                    fill: '#6366f1',
                    fillEnabled: true,
                    opacity: 0.3,
                    strokeWidth: 2,
                    strokeColor: '#6366f1'
                }
            };
            nodes.push(seriesNode);

            // Find point marks for this series
            const seriesKey = pm.seriesKey ?? '__default__';
            const pts = pointsBySeries.get(seriesKey) ?? [];
            for (let pi = 0; pi < pts.length; pi++) {
                const pt = pts[pi];
                const pointNodeId = makeId();
                const pointNode = makeScaffoldNode(pt, config, pi);
                pointNode.id = pointNodeId;
                pointNode.dnLevel = 3;
                pointNode.semantics = { ...defaultSemantics(), name: 'data point' };
                nodes.push(pointNode);

                // Edge: series → point (down)
                edges.push({
                    id: makeId(),
                    sourceId: seriesNodeId,
                    targetId: pointNodeId,
                    direction: 'down',
                    label: 'contains',
                    dnProperties: {}
                });
            }
        }
    } else {
        // No path marks extracted (e.g. area without visible path SVG element)
        // Fall back to just creating point nodes
        for (let i = 0; i < pointMarks.length; i++) {
            nodes.push(makeScaffoldNode(pointMarks[i], config, i));
        }
    }

    return { nodes, edges };
}

function makeScaffoldNode(mark: ExtractedMark, config: ScaffoldConfig, index: number): SkeletonNode {
    let shape: 'rect' | 'ellipse' | 'path' =
        mark.type === 'ellipse' ? 'ellipse' : mark.type === 'path' ? 'path' : 'rect';
    let pathData = mark.pathData;
    const id = makeId();

    // Convert scatter circles to SVG arc paths for consistent rendering
    if (config.chartType === 'scatter' && shape === 'ellipse') {
        shape = 'path';
        const cx = mark.x + mark.width / 2;
        const cy = mark.y + mark.height / 2;
        const r = mark.width / 2;
        pathData = `M ${cx - r},${cy} A ${r},${r},0,0,1,${cx + r},${cy} A ${r},${r},0,0,1,${cx - r},${cy} Z`;
    }

    const node: SkeletonNode = {
        id,
        label: `Mark ${index + 1}`,
        source: 'scaffold',
        dnLevel: 3,
        x: mark.x,
        y: mark.y,
        width: mark.width,
        height: mark.height,
        isEntry: false,
        isCluster: false,
        semantics: defaultSemantics(),
        data: { ...mark.datum },
        renderProperties: {
            ...defaultRenderProperties(),
            shape,
            fill: '#6366f1',
            fillEnabled: true,
            opacity: 0.85,
            strokeColor: '#4338ca',
            strokeWidth: 1
        }
    };

    if (shape === 'path' && pathData) {
        node.pathData = pathData;
        node.pathBounds = { x: mark.x, y: mark.y, width: mark.width, height: mark.height };
    }

    return node;
}
