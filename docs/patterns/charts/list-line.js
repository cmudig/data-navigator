import dataNavigator, { offsetLinePath } from 'data-navigator';
import { scalePoint, scaleLinear } from 'd3-scale';
import {
    createCanvas,
    axisBottom,
    axisLeft,
    drawLine,
    drawDot,
    circleSpatial,
    spatial,
    pointsBox,
    fitWidth
} from '../shared/canvas.js';
import { seattleMonthly } from '../data/seattle-monthly.js';

const alt =
    'Line chart of the average daily high in Seattle by month. It peaks at 26.1 degrees in August and is lowest at 8.2 in December and January.';

export default {
    alt,
    focusNote: 'Each point gets a small circle. The parent node is a band that follows the whole line.',
    commandLabels: {
        left: 'previous month',
        right: 'next month',
        'drill-in': 'go into the months',
        'drill-out': 'back to the line'
    },
    build(host) {
        const width = fitWidth(host);
        const height = 300;
        const { ctx, theme } = createCanvas(host, { width, height, alt });
        const m = { top: 16, right: 20, bottom: 48, left: 52 };
        const x = scalePoint(
            seattleMonthly.map(d => d.month),
            [m.left + 8, width - m.right - 8]
        );
        const y = scaleLinear([0, 30], [height - m.bottom, m.top]);
        axisLeft(ctx, y, { x: m.left, ticks: 6, label: 'High (°C)', grid: [m.left, width - m.right] });
        axisBottom(ctx, x, { y: height - m.bottom, label: 'Month', format: v => (width < 420 ? v[0] : v) });
        const points = seattleMonthly.map(d => ({ id: d.id, x: x(d.month), y: y(d.high) }));
        drawLine(ctx, points, theme.series[0]);
        points.forEach(p => drawDot(ctx, p.x, p.y, 4, theme.series[0]));

        // #region structure
        const structure = dataNavigator.structure({
            data: seattleMonthly,
            idKey: 'id',
            dimensions: {
                values: [
                    {
                        dimensionKey: 'month',
                        nodeId: 'line',
                        type: 'categorical',
                        behavior: { extents: 'circular' },
                        operations: { compressSparseDivisions: true },
                        navigationRules: {
                            sibling_sibling: ['left', 'right'],
                            parent_child: ['drill-out', 'drill-in']
                        }
                    }
                ]
            }
        });
        // #endregion structure

        // #region labels
        structure.nodes.line.semantics = { label: 'Seattle daily high. 12 months, 8.2 to 26.1 degrees.' };
        seattleMonthly.forEach(d => {
            structure.nodes[d.id].semantics = { label: `${d.high} degrees, ${d.month}` };
        });
        // #endregion labels

        // #region focus
        const band = offsetLinePath(points, 8);
        structure.nodes.line.spatialProperties = spatial(pointsBox(points), band);
        points.forEach(p => {
            structure.nodes[p.id].spatialProperties = circleSpatial(p.x, p.y, 4);
        });
        // #endregion focus

        return { structure };
    }
};
