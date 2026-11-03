import dataNavigator from 'data-navigator';
import { createCanvas, rectSpatial, unionBox, fitWidth } from '../shared/canvas.js';
import { barChart } from '../shared/charts.js';
import { pointLabel, groupLabel } from '../shared/labels.js';
import { fruit } from '../data/fruit.js';

const alt = 'Bar chart of fruit counts. Strawberries are highest at 6. Plums are lowest at 2.';

export default {
    alt,
    focusNote: 'Same as the list pattern. Labels here follow the settings above the demo.',
    commandLabels: { left: 'previous bar', right: 'next bar', 'drill-in': 'drill in', 'drill-out': 'drill out' },
    build(host) {
        const width = fitWidth(host);
        const height = 300;
        const { ctx, theme } = createCanvas(host, { width, height, alt });
        const { bars } = barChart(ctx, theme, {
            data: fruit,
            xKey: 'fruit',
            yKey: 'count',
            yMax: 7,
            yTicks: 7,
            width,
            height,
            xLabel: 'Fruit',
            yLabel: 'Count'
        });

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
                        navigationRules: { sibling_sibling: ['left', 'right'], parent_child: ['drill-out', 'drill-in'] }
                    }
                ]
            }
        });

        // #region labels
        // Labels are functions, so they read the current settings every time
        structure.nodes.fruit.semantics = {
            label: () => groupLabel({ name: 'Fruit', short: '6 bars.', detail: 'Total 24. Highest: Strawberries, 6.' })
        };
        fruit.forEach(d => {
            structure.nodes[d.id].semantics = {
                label: () =>
                    pointLabel({
                        values: [{ key: 'Count', value: d.count }],
                        categories: [{ key: 'Fruit', value: d.fruit }]
                    })
            };
        });
        // #endregion labels

        structure.nodes.fruit.spatialProperties = rectSpatial(unionBox(Object.values(bars)), 6);
        fruit.forEach(d => {
            structure.nodes[d.id].spatialProperties = rectSpatial(bars[d.id]);
        });
        return { structure };
    }
};
