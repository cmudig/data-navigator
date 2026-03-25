/**
 * valueExtractor — Reverse-engineers data values from scaffold node pixel positions
 * using Vega's view scale API.
 *
 * Workflow:
 *   1. After committing scaffold nodes, user clicks one node and types its known value.
 *   2. extractValues() uses the Vega view's y-scale to invert each node's pixel height
 *      into a data value, normalized against the calibration point.
 *   3. Returns updated nodes with data[yField] populated.
 *
 * For synthetic data only — CSV-data scaffolds already have real values in their rows.
 */

import type { SkeletonNode } from '../store/types';
import type { ScaffoldConfig } from '../store/appState';
import type { VegaEmbedResult } from './scaffoldAdapter';

/**
 * Given a Vega view (from renderToHidden), the scaffold nodes, and a single
 * calibration point (one node ID + its known real value), compute estimated
 * data values for all scaffold nodes via scale inversion and normalization.
 *
 * Returns a new array of nodes with data[yField] updated.
 */
export function extractValues(
    view: VegaEmbedResult['view'],
    nodes: SkeletonNode[],
    config: ScaffoldConfig,
    calibrationNodeId: string,
    calibrationValue: number
): SkeletonNode[] {
    const yField = config.yField ?? config.syntheticConfig?.yField ?? 'value';
    const scaffoldNodes = nodes.filter(n => n.source === 'scaffold' && n.renderProperties.shape !== 'path');

    // Try to get the y scale from the Vega view
    let yScale: ((px: number) => number) | null = null;
    try {
        const rawScale = view.scale('y') as { invert?: (px: number) => number };
        if (rawScale && typeof rawScale.invert === 'function') {
            yScale = rawScale.invert.bind(rawScale);
        }
    } catch {
        // view.scale() may throw if the signal doesn't exist
    }

    // Find the calibration node to get its pixel dimensions
    const calNode = scaffoldNodes.find(n => n.id === calibrationNodeId);
    if (!calNode) return nodes;

    // Compute values via scale inversion or pixel-ratio normalization
    return nodes.map(node => {
        if (node.source !== 'scaffold' || node.renderProperties.shape === 'path') return node;

        let estimatedValue: number;

        if (yScale) {
            // Use Vega scale inversion: invert the y position of the mark's bottom edge
            // (bottom of bar = y + height in SVG coords, adjusted for padding)
            const bottomPx = node.y + node.height - config.offsetY - config.paddingTop;
            estimatedValue = yScale(bottomPx);
            // Vega's y origin is top; inversion may produce negative values for top-heavy scales
            if (typeof estimatedValue !== 'number' || isNaN(estimatedValue)) {
                estimatedValue = pixelRatioEstimate(node, calNode, calibrationValue);
            }
        } else {
            // Fallback: height-ratio normalization
            // Assumes taller bar = larger value (valid for non-stacked bar charts)
            estimatedValue = pixelRatioEstimate(node, calNode, calibrationValue);
        }

        return {
            ...node,
            data: { ...node.data, [yField]: Math.round(estimatedValue * 100) / 100 }
        };
    });
}

/**
 * Estimate a node's value by comparing its height to the calibration node's height.
 * Simple linear normalization: value = (nodeHeight / calNodeHeight) * calibrationValue
 */
function pixelRatioEstimate(node: SkeletonNode, calNode: SkeletonNode, calibrationValue: number): number {
    if (calNode.height === 0) return calibrationValue;
    return (node.height / calNode.height) * calibrationValue;
}

/**
 * For scatter/point charts: estimate x and y values from the node's x,y position
 * using the Vega view's x and y scales.
 */
export function extractXYValues(
    view: VegaEmbedResult['view'],
    nodes: SkeletonNode[],
    config: ScaffoldConfig
): SkeletonNode[] {
    const xField = config.xField ?? config.syntheticConfig?.xField ?? 'x';
    const yField = config.yField ?? config.syntheticConfig?.yField ?? 'y';

    let xInvert: ((px: number) => unknown) | null = null;
    let yInvert: ((px: number) => unknown) | null = null;

    try {
        const xs = view.scale('x') as { invert?: (px: number) => unknown };
        if (xs?.invert) xInvert = xs.invert.bind(xs);
    } catch {
        /* ignored */
    }
    try {
        const ys = view.scale('y') as { invert?: (px: number) => unknown };
        if (ys?.invert) yInvert = ys.invert.bind(ys);
    } catch {
        /* ignored */
    }

    return nodes.map(node => {
        if (node.source !== 'scaffold' || node.renderProperties.shape === 'path') return node;

        const cx = node.x + node.width / 2 - config.offsetX - config.paddingLeft;
        const cy = node.y + node.height / 2 - config.offsetY - config.paddingTop;

        const xVal = xInvert ? xInvert(cx) : cx;
        const yVal = yInvert ? yInvert(cy) : cy;

        return {
            ...node,
            data: { ...node.data, [xField]: xVal, [yField]: yVal }
        };
    });
}
