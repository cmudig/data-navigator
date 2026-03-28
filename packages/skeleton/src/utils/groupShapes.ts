/**
 * groupShapes — Compute SVG pathData strings for level 0/1/2 nodes (root,
 * dimension, division) based on the current positions of their descendant
 * leaf nodes (level 3).
 *
 * Computation order: divisions → dimensions → root.
 * This allows dimension 'unionOfAll' to re-use division paths instead of
 * recomputing from raw leaf positions.
 *
 * Algorithms live in the core data-navigator geometry utilities; this module
 * handles the Skeleton-specific graph traversal and chart-type dispatching.
 */

import {
    convexHullOfRects,
    unionOfRectPaths,
    boundingRectPath,
    convexHullOfCircles,
    offsetLinePath
} from 'data-navigator';
import type { Rect, Point, Circle } from 'data-navigator';
import type { SkeletonNode, SkeletonEdge } from '../store/types';
import type { ScaffoldConfig, GroupShapeConfig, DimensionGroupConfig, BonusRect } from '../store/appState';

// ── Adjacency traversal ───────────────────────────────────────────────────────

/** Build a Map<sourceId, targetId[]> from all edges for fast BFS. */
function buildAdjacency(edges: SkeletonEdge[]): Map<string, string[]> {
    const adj = new Map<string, string[]>();
    for (const edge of edges) {
        if (!adj.has(edge.sourceId)) adj.set(edge.sourceId, []);
        adj.get(edge.sourceId)!.push(edge.targetId);
    }
    return adj;
}

/**
 * BFS from `startId` to collect all level-3 leaf node descendants.
 * Avoids cycles via a visited set.
 */
function collectLeaves(
    startId: string,
    nodeMap: Map<string, SkeletonNode>,
    adj: Map<string, string[]>
): SkeletonNode[] {
    const leaves: SkeletonNode[] = [];
    const visited = new Set<string>();
    const queue: string[] = [startId];
    while (queue.length > 0) {
        const id = queue.shift()!;
        if (visited.has(id)) continue;
        visited.add(id);
        const node = nodeMap.get(id);
        if (!node) continue;
        if (node.dnLevel === 3) {
            leaves.push(node);
        } else {
            const children = adj.get(id) ?? [];
            queue.push(...children);
        }
    }
    return leaves;
}

// ── Geometry helpers ──────────────────────────────────────────────────────────

function nodeToRect(n: SkeletonNode): Rect {
    return { x: n.x, y: n.y, width: n.width, height: n.height };
}

function nodeToCircle(n: SkeletonNode, r: number): Circle {
    return { x: n.x + n.width / 2, y: n.y + n.height / 2, r };
}

function pointRadius(config: ScaffoldConfig): number {
    return Math.sqrt((config.markParams.pointSize ?? 30) / Math.PI);
}

/** True when the leaf nodes span multiple distinct x-positions (series grouping). */
function isSeriesGrouping(leaves: SkeletonNode[]): boolean {
    const xs = new Set(leaves.map(n => Math.round(n.x)));
    return xs.size > 1;
}

/** Sort leaves by ascending x-center for line path ordering. */
function sortByX(leaves: SkeletonNode[]): SkeletonNode[] {
    return [...leaves].sort((a, b) => a.x + a.width / 2 - (b.x + b.width / 2));
}

function leafCenters(leaves: SkeletonNode[]): Point[] {
    return leaves.map(n => ({ x: n.x + n.width / 2, y: n.y + n.height / 2 }));
}

// ── Bonus rect path suffix ────────────────────────────────────────────────────

/**
 * Append a bonus rect as an additional M…Z subpath to an existing path string.
 */
function appendBonusRect(pathD: string, br: BonusRect): string {
    const { x, y, width: w, height: h } = br;
    const rectPath = `M${x},${y}L${x + w},${y}L${x + w},${y + h}L${x},${y + h}Z`;
    return pathD + rectPath;
}

// ── Strategy dispatchers ──────────────────────────────────────────────────────

type RectStrategy = 'convexHull' | 'unionOfAll' | 'boundingRect';

function applyRectStrategy(strategy: RectStrategy, rects: Rect[], pad: number): string {
    if (rects.length === 0) return '';
    switch (strategy) {
        case 'convexHull':
            return convexHullOfRects(rects, pad);
        case 'unionOfAll':
            return unionOfRectPaths(rects, pad);
        case 'boundingRect':
            return boundingRectPath(rects, pad);
    }
}

/**
 * Apply a strategy to a set of circles.
 * 'boundingRect' requires a pre-computed bbox (used for scatter root).
 * 'convexHull' and 'unionOfAll' both produce a convex hull (circle sets have
 * no meaningful union-of-arcs distinct from hull).
 */
function applyCircleStrategy(
    strategy: string,
    circles: Circle[],
    pad: number,
    bbox?: { x: number; y: number; width: number; height: number }
): string {
    if (circles.length === 0) return '';
    if (strategy === 'boundingRect') {
        if (!bbox) return convexHullOfCircles(circles, pad);
        return boundingRectPath([{ x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height }], pad);
    }
    return convexHullOfCircles(circles, pad);
}

function applyLineSeriesStrategy(leaves: SkeletonNode[], pad: number): string {
    if (leaves.length === 0) return '';
    const sorted = sortByX(leaves);
    const centers = leafCenters(sorted);
    return offsetLinePath(centers, pad);
}

/**
 * Range bounds / range rect — for numerical divisions on a scatter axis.
 * Produces spanning lines (rangeBounds) or a filled rectangle (rangeRect)
 * across the full chart height or width.
 */
function applyRangeStrategy(
    strategy: 'rangeBounds' | 'rangeRect',
    leaves: SkeletonNode[],
    dimKey: string,
    config: ScaffoldConfig
): string {
    if (leaves.length === 0) return '';
    const centers = leaves.map(n => ({ x: n.x + n.width / 2, y: n.y + n.height / 2 }));

    const plotLeft = config.offsetX + config.paddingLeft;
    const plotRight = plotLeft + (config.plotWidth - config.paddingLeft - config.paddingRight);
    const plotTop = config.offsetY + config.paddingTop;
    const plotBottom = plotTop + (config.plotHeight - config.paddingTop - config.paddingBottom);

    const isXDim = dimKey === config.xField;

    if (isXDim) {
        // Numerical x-axis dimension — range bounds run vertically
        const rMin = Math.min(...centers.map(c => c.x));
        const rMax = Math.max(...centers.map(c => c.x));
        if (strategy === 'rangeBounds') {
            return `M${rMin},${plotTop}L${rMin},${plotBottom} M${rMax},${plotTop}L${rMax},${plotBottom}`;
        }
        return `M${rMin},${plotTop}L${rMax},${plotTop}L${rMax},${plotBottom}L${rMin},${plotBottom}Z`;
    } else {
        // Numerical y-axis dimension — range bounds run horizontally
        const rMin = Math.min(...centers.map(c => c.y));
        const rMax = Math.max(...centers.map(c => c.y));
        if (strategy === 'rangeBounds') {
            return `M${plotLeft},${rMin}L${plotRight},${rMin} M${plotLeft},${rMax}L${plotRight},${rMax}`;
        }
        return `M${plotLeft},${rMin}L${plotRight},${rMin}L${plotRight},${rMax}L${plotLeft},${rMax}Z`;
    }
}

// ── Bounding box helpers ──────────────────────────────────────────────────────

export interface GroupPathResult {
    pathData: string;
    bbox: { x: number; y: number; width: number; height: number };
}

function leafBbox(leaves: SkeletonNode[]): { x: number; y: number; width: number; height: number } {
    if (leaves.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
    const xs = leaves.map(n => n.x);
    const ys = leaves.map(n => n.y);
    const x2s = leaves.map(n => n.x + n.width);
    const y2s = leaves.map(n => n.y + n.height);
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    return { x, y, width: Math.max(...x2s) - x, height: Math.max(...y2s) - y };
}

function extendBboxForBonusRect(
    bbox: { x: number; y: number; width: number; height: number },
    br: BonusRect
): { x: number; y: number; width: number; height: number } {
    const x = Math.min(bbox.x, br.x);
    const y = Math.min(bbox.y, br.y);
    const x2 = Math.max(bbox.x + bbox.width, br.x + br.width);
    const y2 = Math.max(bbox.y + bbox.height, br.y + br.height);
    return { x, y, width: x2 - x, height: y2 - y };
}

function unionBboxes(boxes: { x: number; y: number; width: number; height: number }[]): {
    x: number;
    y: number;
    width: number;
    height: number;
} {
    if (boxes.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
    const x = Math.min(...boxes.map(b => b.x));
    const y = Math.min(...boxes.map(b => b.y));
    const x2 = Math.max(...boxes.map(b => b.x + b.width));
    const y2 = Math.max(...boxes.map(b => b.y + b.height));
    return { x, y, width: x2 - x, height: y2 - y };
}

// ── Per-dimension config helper ───────────────────────────────────────────────

/**
 * Return the DimensionGroupConfig for a given dimension key, falling back to
 * type-appropriate defaults when the user hasn't customised it yet.
 */
export function getDimConfig(
    gs: GroupShapeConfig,
    dimKey: string,
    dimType: 'categorical' | 'numerical' = 'categorical'
): DimensionGroupConfig {
    if (gs.perDimension[dimKey]) return gs.perDimension[dimKey];
    return dimType === 'numerical'
        ? { strategy: 'unionOfAll', padding: 8, divisionStrategy: 'rangeRect', divisionPadding: 0 }
        : { strategy: 'unionOfAll', padding: 8, divisionStrategy: 'convexHull', divisionPadding: 0 };
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Compute SVG pathData strings and chart-space bounding boxes for all enabled
 * group-shape levels.
 *
 * Computation order: divisions first, then dimensions (so dimension 'unionOfAll'
 * can re-use division paths), then root.
 *
 * @param dimTypes  Optional map of dimensionKey → 'categorical'|'numerical'.
 *                  Used to select type-appropriate defaults for unconfigured dims.
 */
export function computeGroupPaths(
    nodes: SkeletonNode[],
    edges: SkeletonEdge[],
    config: ScaffoldConfig,
    dimTypes?: Record<string, 'categorical' | 'numerical'>
): Map<string, GroupPathResult> {
    const result = new Map<string, GroupPathResult>();
    const gs = config.groupShapes;
    if (!gs) return result;

    const nodeMap = new Map<string, SkeletonNode>(nodes.map(n => [n.id, n]));
    const adj = buildAdjacency(edges);

    const isLineArea = config.chartType === 'line' || config.chartType === 'area';
    const isScatter = config.chartType === 'scatter';
    const pR = isScatter || isLineArea ? pointRadius(config) : 0;

    // ── Pass 1: Divisions (level 2) ──────────────────────────────────────────
    // Must run before dimensions so 'unionOfAll' at dimension level can reuse
    // division paths.
    const divisionPaths = new Map<string, string>(); // divNodeId → pathD
    const divisionBboxes = new Map<string, ReturnType<typeof leafBbox>>();

    if (gs.divisionEnabled) {
        const divNodes = nodes.filter(n => n.dnLevel === 2);
        for (const divNode of divNodes) {
            const leaves = collectLeaves(divNode.id, nodeMap, adj);
            if (leaves.length === 0) continue;

            const dimKey = divNode.dimensionKey ?? '';
            const dimType = dimTypes?.[dimKey] ?? 'categorical';
            const dc = getDimConfig(gs, dimKey, dimType);

            let pathD = '';
            if (isScatter) {
                if (dc.divisionStrategy === 'rangeBounds' || dc.divisionStrategy === 'rangeRect') {
                    pathD = applyRangeStrategy(dc.divisionStrategy, leaves, dimKey, config);
                } else {
                    pathD = applyCircleStrategy(
                        dc.divisionStrategy,
                        leaves.map(n => nodeToCircle(n, pR)),
                        dc.divisionPadding
                    );
                }
            } else if (isLineArea) {
                if (isSeriesGrouping(leaves)) {
                    pathD = applyLineSeriesStrategy(leaves, dc.divisionPadding);
                } else {
                    pathD = applyCircleStrategy(
                        dc.divisionStrategy,
                        leaves.map(n => nodeToCircle(n, pR)),
                        dc.divisionPadding
                    );
                }
            } else {
                pathD = applyRectStrategy(
                    dc.divisionStrategy as RectStrategy,
                    leaves.map(nodeToRect),
                    dc.divisionPadding
                );
            }

            // Append bonus rect if enabled (keyed by division node id)
            const br = gs.divisionBonusRects[divNode.id];
            let bbox = leafBbox(leaves);
            if (br?.enabled && pathD) {
                pathD = appendBonusRect(pathD, br);
                bbox = extendBboxForBonusRect(bbox, br);
            }

            if (pathD) {
                divisionPaths.set(divNode.id, pathD);
                divisionBboxes.set(divNode.id, bbox);
                result.set(divNode.id, { pathData: pathD, bbox });
            }
        }
    }

    // ── Pass 2: Dimensions (level 1) ─────────────────────────────────────────
    if (gs.dimensionEnabled) {
        const dimNodes = nodes.filter(n => n.dnLevel === 1);
        for (const dimNode of dimNodes) {
            const leaves = collectLeaves(dimNode.id, nodeMap, adj);
            if (leaves.length === 0) continue;

            const dimKey = dimNode.dimensionKey ?? '';
            const dimType = dimTypes?.[dimKey] ?? 'categorical';
            const dc = getDimConfig(gs, dimKey, dimType);

            let pathD = '';
            let bbox = leafBbox(leaves);

            if (dc.strategy === 'unionOfAll') {
                // Re-use division paths if available, otherwise fall back to leaf hull
                const myDivNodes = nodes.filter(n => n.dnLevel === 2 && n.dimensionKey === dimKey);
                const divPathStrings = myDivNodes.map(d => divisionPaths.get(d.id) ?? '').filter(Boolean);
                const divBboxEntries = myDivNodes.map(d => divisionBboxes.get(d.id)).filter(Boolean) as ReturnType<
                    typeof leafBbox
                >[];

                if (divPathStrings.length > 0) {
                    pathD = divPathStrings.join(' ');
                    bbox = divBboxEntries.length > 0 ? unionBboxes(divBboxEntries) : bbox;
                } else {
                    // No computed division paths — fall back to convex hull of leaves
                    pathD = isScatter
                        ? applyCircleStrategy(
                              'convexHull',
                              leaves.map(n => nodeToCircle(n, pR)),
                              dc.padding
                          )
                        : isLineArea
                          ? applyLineSeriesStrategy(leaves, dc.padding)
                          : applyRectStrategy('convexHull', leaves.map(nodeToRect), dc.padding);
                }
            } else {
                // 'convexHull'
                if (isScatter) {
                    pathD = applyCircleStrategy(
                        dc.strategy,
                        leaves.map(n => nodeToCircle(n, pR)),
                        dc.padding
                    );
                } else if (isLineArea) {
                    pathD = applyLineSeriesStrategy(leaves, dc.padding);
                } else {
                    pathD = applyRectStrategy(dc.strategy as RectStrategy, leaves.map(nodeToRect), dc.padding);
                }
            }

            // Append dimension bonus rect
            const br = gs.dimensionBonusRects[dimKey];
            if (br?.enabled && pathD) {
                pathD = appendBonusRect(pathD, br);
                bbox = extendBboxForBonusRect(bbox, br);
            }

            if (pathD) result.set(dimNode.id, { pathData: pathD, bbox });
        }
    }

    // ── Pass 3: Root (level 0) ────────────────────────────────────────────────
    if (gs.rootEnabled) {
        const rootNode = nodes.find(n => n.dnLevel === 0);
        if (rootNode) {
            const leaves = nodes.filter(n => n.dnLevel === 3);
            let pathD = '';
            let bbox = leafBbox(leaves);

            // Manual override takes precedence for bounding rect
            if (gs.rootStrategy === 'boundingRect' && gs.rootBoundingRectOverride) {
                const r = gs.rootBoundingRectOverride;
                pathD = `M${r.x},${r.y}L${r.x + r.width},${r.y}L${r.x + r.width},${r.y + r.height}L${r.x},${r.y + r.height}Z`;
                bbox = { ...r };
            } else if (isScatter) {
                pathD = applyCircleStrategy(
                    gs.rootStrategy,
                    leaves.map(n => nodeToCircle(n, pR)),
                    gs.rootPadding,
                    bbox
                );
            } else if (isLineArea) {
                pathD = applyLineSeriesStrategy(leaves, gs.rootPadding);
            } else {
                pathD = applyRectStrategy(gs.rootStrategy, leaves.map(nodeToRect), gs.rootPadding);
            }

            if (pathD) result.set(rootNode.id, { pathData: pathD, bbox });
        }
    }

    return result;
}
