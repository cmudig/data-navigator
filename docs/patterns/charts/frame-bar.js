import dataNavigator from 'data-navigator';
import { createCanvas, rectSpatial, unionBox, fitWidth } from '../shared/canvas.js';
import { barChart } from '../shared/charts.js';
import { fruit } from '../data/fruit.js';

const alt = 'Bar chart of fruit in a basket. Strawberries are highest at 6. Plums are lowest at 2.';

export default {
    alt,
    focusNote:
        'The title and subtitle get a box around their text. Each axis gets a box around its line, ticks, and name. Data outlines every bar. Inside Data it is a plain list.',
    commandLabels: {
        left: 'previous',
        right: 'next',
        'drill-in': 'drill in',
        'drill-out': 'drill out'
    },
    build(host) {
        const width = fitWidth(host);
        const height = 340;
        const { ctx, theme } = createCanvas(host, { width, height, alt });
        const { bars, boxes } = barChart(ctx, theme, {
            data: fruit,
            xKey: 'fruit',
            yKey: 'count',
            yMax: 7,
            yTicks: 7,
            width,
            height,
            title: 'Fruit in the basket',
            subtitle: 'Count of each fruit',
            xLabel: 'Fruit',
            yLabel: 'Count'
        });

        // #region structure
        const structure = dataNavigator.structure({
            data: fruit,
            idKey: 'id',
            frame: {
                root: { id: 'chart', semantics: { label: alt } },
                elements: [
                    { id: 'title', semantics: { label: 'Title: Fruit in the basket.' } },
                    { id: 'subtitle', semantics: { label: 'Subtitle: Count of each fruit.' } },
                    { id: 'y-axis', semantics: { label: 'Y axis: Count, 0 to 7.' } },
                    { id: 'x-axis', semantics: { label: 'X axis: Fruit, 6 categories, Apples to Strawberries.' } }
                ]
                // no data node given, so the list's parent node is the last element
            },
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
        // #endregion structure

        // #region labels
        const n = structure.nodes;
        n.fruit.semantics = { label: 'Data: 6 bars. Strawberries are highest at 6.' };
        fruit.forEach(d => {
            n[d.id].semantics = { label: `${d.count}, ${d.fruit}` };
        });
        // #endregion labels

        // #region focus
        n.chart.spatialProperties = rectSpatial({ x: 6, y: 6, width: width - 12, height: height - 12 }, 0);
        n.title.spatialProperties = rectSpatial(boxes.title, 4);
        n.subtitle.spatialProperties = rectSpatial(boxes.subtitle, 4);
        n['y-axis'].spatialProperties = rectSpatial(boxes.yAxis, 4);
        n['x-axis'].spatialProperties = rectSpatial(boxes.xAxis, 4);
        n.fruit.spatialProperties = rectSpatial(unionBox(Object.values(bars)), 6);
        fruit.forEach(d => {
            n[d.id].spatialProperties = rectSpatial(bars[d.id]);
        });
        // #endregion focus

        return { structure };
    }
};
