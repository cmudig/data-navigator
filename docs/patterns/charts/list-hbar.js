import dataNavigator from 'data-navigator';
import { scaleBand, scaleLinear } from 'd3-scale';
import { createCanvas, axisBottom, drawBar, drawText, rectSpatial, unionBox, fitWidth } from '../shared/canvas.js';
import { fruit } from '../data/fruit.js';

const alt = 'Horizontal bar chart of fruit counts. Strawberries are highest at 6. Plums are lowest at 2.';

export default {
    alt,
    focusNote: 'Same boxes as the vertical bar chart. The bars run top to bottom, so Up and Down move between them.',
    commandLabels: {
        up: 'previous bar',
        down: 'next bar',
        'drill-in': 'go into the bars',
        'drill-out': 'back to all fruit'
    },
    build(host) {
        const width = fitWidth(host);
        const height = 280;
        const { ctx, theme } = createCanvas(host, { width, height, alt });
        const m = { top: 12, right: 24, bottom: 48, left: 96 };
        const y = scaleBand(
            fruit.map(d => d.fruit),
            [m.top, height - m.bottom]
        ).padding(0.25);
        const x = scaleLinear([0, 7], [m.left, width - m.right]);
        axisBottom(ctx, x, { y: height - m.bottom, ticks: 7, label: 'Count' });
        const bars = {};
        fruit.forEach(d => {
            drawText(ctx, d.fruit, m.left - 8, y(d.fruit) + y.bandwidth() / 2 + 4, {
                size: 11,
                color: theme.muted,
                align: 'right'
            });
            bars[d.id] = { x: x(0), y: y(d.fruit), width: x(d.count) - x(0), height: y.bandwidth() };
            drawBar(ctx, bars[d.id], theme.series[0], 'right');
        });

        // #region structure
        const structure = dataNavigator.structure({
            data: fruit,
            idKey: 'id',
            dimensions: {
                values: [
                    {
                        dimensionKey: 'fruit',
                        nodeId: 'fruit',
                        type: 'categorical',
                        behavior: { extents: 'circular' },
                        operations: { compressSparseDivisions: true },
                        navigationRules: {
                            // vertical layout, so Up and Down walk the list
                            sibling_sibling: ['up', 'down'],
                            parent_child: ['drill-out', 'drill-in']
                        }
                    }
                ]
            }
        });
        // #endregion structure

        // #region labels
        structure.nodes.fruit.semantics = { label: 'Fruit. 6 bars, Apples to Strawberries.' };
        fruit.forEach(d => {
            structure.nodes[d.id].semantics = { label: `${d.count}, ${d.fruit}` };
        });
        // #endregion labels

        // #region focus
        structure.nodes.fruit.spatialProperties = rectSpatial(unionBox(Object.values(bars)), 6);
        fruit.forEach(d => {
            structure.nodes[d.id].spatialProperties = rectSpatial(bars[d.id]);
        });
        // #endregion focus

        return { structure };
    }
};
