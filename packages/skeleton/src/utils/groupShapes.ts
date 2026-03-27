/**
 * groupShapes — Compute SVG pathData strings for level 0/1/2 nodes (root,
 * dimension, division) based on the current positions of their descendant
 * leaf nodes (level 3).
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
import type { ScaffoldConfig, GroupShapeConfig, BonusRect } from '../store/appState';

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
    return Math.sqrt((config.markParams.pointSize ?? 100) / Math.PI);
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
 * The bonus rect is always a plain rectangle (not padded — padding only applies
 * to the primary algorithm path).
 */
function appendBonusRect(pathD: string, br: BonusRect): string {
    const { x, y, width: w, height: h } = br;
    const rectPath = `M${x},${y}L${x + w},${y}L${x + w},${y + h}L${x},${y + h}Z`;
    return pathD + rectPath;
}

// ── Strategy dispatcher ───────────────────────────────────────────────────────

type RectStrategy = 'convexHull' | 'unionOfAll' | 'boundingRect';
type HullStrategy = 'convexHull' | 'unionOfAll';

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

function applyCircleStrategy(strategy: HullStrategy, circles: Circle[], pad: number): string {
    if (circles.length === 0) return '';
    // For circles: union = hull (each circle approximated by arc points); pad already baked into convexHullOfCircles
    return convexHullOfCircles(circles, pad);
}

function applyLineSeriesStrategy(leaves: SkeletonNode[], pad: number): string {
    if (leaves.length === 0) return '';
    const sorted = sortByX(leaves);
    const centers = leafCenters(sorted);
    return offsetLinePath(centers, pad);
}

// ── Bounding box helper ───────────────────────────────────────────────────────

export interface GroupPathResult {
    pathData: string;
    bbox: { x: number; y: number; width: number; height: number };
}

function leafBbox(leaves: SkeletonNode[]): { x: number; y: number; width: number; height: number } {
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

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Compute SVG pathData strings and chart-space bounding boxes for all enabled
 * group-shape levels.
 *
 * Returns Map<nodeId, GroupPathResult> — caller writes pathData and bbox
 * (as x/y/width/height) to appState nodes so the DN renderer positions the
 * focus overlay correctly in chart coordinates.
 *
 * The `edges` param should be all edges from appState.edges.values().
 */
export function computeGroupPaths(
    nodes: SkeletonNode[],
    edges: SkeletonEdge[],
    config: ScaffoldConfig
): Map<string, GroupPathResult> {
    const result = new Map<string, GroupPathResult>();
    const gs = config.groupShapes;
    if (!gs) return result;

    const nodeMap = new Map<string, SkeletonNode>(nodes.map(n => [n.id, n]));
    const adj = buildAdjacency(edges);

    const isLineArea = config.chartType === 'line' || config.chartType === 'area';
    const isScatter = config.chartType === 'scatter';
    const pR = isScatter || isLineArea ? pointRadius(config) : 0;

    // ── Root (level 0) ───────────────────────────────────────────────────────
    if (gs.rootEnabled) {
        const rootNode = nodes.find(n => n.dnLevel === 0);
        if (rootNode) {
            const leaves = nodes.filter(n => n.dnLevel === 3);
            let pathD = '';
            if (isScatter) {
                pathD = applyCircleStrategy(
                    'convexHull',
                    leaves.map(n => nodeToCircle(n, pR)),
                    gs.rootPadding
                );
            } else if (isLineArea) {
                pathD = applyLineSeriesStrategy(leaves, gs.rootPadding);
            } else {
                pathD = applyRectStrategy(gs.rootStrategy, leaves.map(nodeToRect), gs.rootPadding);
            }
            if (pathD) result.set(rootNode.id, { pathData: pathD, bbox: leafBbox(leaves) });
        }
    }

    // ── Dimensions (level 1) ─────────────────────────────────────────────────
    if (gs.dimensionEnabled) {
        const dimNodes = nodes.filter(n => n.dnLevel === 1);
        for (const dimNode of dimNodes) {
            const leaves = collectLeaves(dimNode.id, nodeMap, adj);
            if (leaves.length === 0) continue;

            let pathD = '';
            if (isScatter) {
                pathD = applyCircleStrategy(
                    gs.dimensionStrategy,
                    leaves.map(n => nodeToCircle(n, pR)),
                    gs.dimensionPadding
                );
            } else if (isLineArea) {
                // Dimension node spans all its series' leaves → treat as a single line series
                pathD = applyLineSeriesStrategy(leaves, gs.dimensionPadding);
            } else {
                pathD = applyRectStrategy(gs.dimensionStrategy, leaves.map(nodeToRect), gs.dimensionPadding);
            }

            // Append bonus rect if enabled
            const dimKey = dimNode.dimensionKey ?? '';
            const br = gs.dimensionBonusRects[dimKey];
            let bbox = leafBbox(leaves);
            if (br?.enabled && pathD) {
                pathD = appendBonusRect(pathD, br);
                bbox = extendBboxForBonusRect(bbox, br);
            }

            if (pathD) result.set(dimNode.id, { pathData: pathD, bbox });
        }
    }

    // ── Divisions (level 2) ──────────────────────────────────────────────────
    if (gs.divisionEnabled) {
        const divNodes = nodes.filter(n => n.dnLevel === 2);
        for (const divNode of divNodes) {
            const leaves = collectLeaves(divNode.id, nodeMap, adj);
            if (leaves.length === 0) continue;

            let pathD = '';
            if (isScatter) {
                pathD = applyCircleStrategy(
                    gs.divisionStrategy,
                    leaves.map(n => nodeToCircle(n, pR)),
                    gs.divisionPadding
                );
            } else if (isLineArea) {
                // Heuristic: if leaves span multiple x positions → series grouping (offset line)
                //            if leaves share an x position → interval grouping (circle hull)
                if (isSeriesGrouping(leaves)) {
                    pathD = applyLineSeriesStrategy(leaves, gs.divisionPadding);
                } else {
                    pathD = applyCircleStrategy(
                        gs.divisionStrategy,
                        leaves.map(n => nodeToCircle(n, pR)),
                        gs.divisionPadding
                    );
                }
            } else {
                pathD = applyRectStrategy(gs.divisionStrategy, leaves.map(nodeToRect), gs.divisionPadding);
            }

            // Append bonus rect if enabled (keyed by division node id)
            const br = gs.divisionBonusRects[divNode.id];
            let bbox = leafBbox(leaves);
            if (br?.enabled && pathD) {
                pathD = appendBonusRect(pathD, br);
                bbox = extendBboxForBonusRect(bbox, br);
            }

            if (pathD) result.set(divNode.id, { pathData: pathD, bbox });
        }
    }

    return result;
}
