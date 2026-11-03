import dataNavigator from 'data-navigator';
import { scaleBand, scaleLinear } from 'd3-scale';
import { createCanvas, axisBottom, axisLeft, drawBar, rectSpatial, unionBox, fitWidth } from '../shared/canvas.js';
import { fruit } from '../data/fruit.js';

const alt = 'Bar chart of fruit counts. Strawberries are highest at 6. Plums are lowest at 2.';

export default {
    alt,
    focusNote: 'Each bar gets a box that hugs the bar. The parent node, Fruit, outlines every bar at once.',
    commandLabels: {
        left: 'previous bar',
        right: 'next bar',
        'drill-in': 'go into the bars',
        'drill-out': 'back to all fruit'
    },
    build(host) {
        // draw the chart on a canvas
        const width = fitWidth(host);
        const height = 300;
        const { ctx, theme } = createCanvas(host, { width, height, alt });
        const m = { top: 16, right: 16, bottom: 48, left: 52 };
        const x = scaleBand(
            fruit.map(d => d.fruit),
            [m.left, width - m.right]
        ).padding(0.25);
        const y = scaleLinear([0, 7], [height - m.bottom, m.top]);
        axisLeft(ctx, y, { x: m.left, ticks: 7, label: 'Count', grid: [m.left, width - m.right] });
        axisBottom(ctx, x, { y: height - m.bottom, label: 'Fruit' });
        const bars = {};
        fruit.forEach(d => {
            bars[d.id] = { x: x(d.fruit), y: y(d.count), width: x.bandwidth(), height: y(0) - y(d.count) };
            drawBar(ctx, bars[d.id], theme.series[0], 'top');
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
                            sibling_sibling: ['left', 'right'],
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
