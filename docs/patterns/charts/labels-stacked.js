import dataNavigator, { unionOfRectPaths } from 'data-navigator';
import { createCanvas, rectSpatial, spatial, unionBox, fitWidth } from '../shared/canvas.js';
import { stackedBars } from '../shared/charts.js';
import { pointLabel, groupLabel } from '../shared/labels.js';
import { fruitStores } from '../data/fruit-stores.js';

const fruits = ['Apple', 'Banana', 'Cherry'];
const stores = ['A', 'B', 'C']; // bottom to top
const alt = 'Stacked bar chart of fruit at three stores. Apple has the most at 12. Cherry has the least at 7.';
const total = rows => rows.reduce((s, d) => s + d.count, 0);
const top = rows => [...rows].sort((a, b) => b.count - a.count)[0];

export default {
    alt,
    focusNote: 'Same as the dual tree pattern. Labels here follow the settings above the demo.',
    commandLabels: {
        left: 'previous fruit',
        right: 'next fruit',
        up: 'store above',
        down: 'store below',
        'drill-in': 'drill in',
        'drill-out': 'back to the chart',
        'to-fruit': 'up to the fruit',
        'to-store': 'up to the store'
    },
    build(host) {
        const width = fitWidth(host);
        const height = 340;
        const { ctx, theme } = createCanvas(host, { width, height, alt });
        const { bars, boxes } = stackedBars(ctx, theme, {
            data: fruitStores,
            xKey: 'fruit',
            stackKey: 'store',
            valueKey: 'count',
            stacks: stores.map(s => s),
            xDomain: fruits,
            yMax: 12,
            width,
            height,
            xLabel: 'Fruit',
            yLabel: 'Count'
        });

        const topToBottom = [...stores].reverse();
        const structure = dataNavigator.structure({
            data: fruitStores,
            idKey: 'id',
            dimensions: {
                parentOptions: { addLevel0: { id: 'chart', edges: [] } },
                values: [
                    {
                        dimensionKey: 'fruit',
                        nodeId: 'fruits',
                        type: 'categorical',
                        divisionOptions: { divisionNodeIds: (k, v) => `fruit-${v.toLowerCase()}` },
                        behavior: { extents: 'circular', childmostNavigation: 'across' },
                        navigationRules: { sibling_sibling: ['left', 'right'], parent_child: ['to-fruit', 'drill-in'] }
                    },
                    {
                        dimensionKey: 'store',
                        nodeId: 'stores',
                        type: 'categorical',
                        divisionOptions: { divisionNodeIds: (k, v) => `store-${v.toLowerCase()}` },
                        operations: {
                            sortFunction: (a, b) =>
                                topToBottom.indexOf(Object.values(a.values)[0].store) -
                                topToBottom.indexOf(Object.values(b.values)[0].store)
                        },
                        behavior: { extents: 'circular', childmostNavigation: 'across' },
                        navigationRules: { sibling_sibling: ['up', 'down'], parent_child: ['to-store', 'drill-in'] }
                    }
                ]
            }
        });

        // #region labels
        const n = structure.nodes;
        n.chart.semantics = { label: alt };
        n.fruits.semantics = {
            label: () => groupLabel({ name: 'Fruit', short: '3 fruits.', detail: 'Apple, Banana, Cherry.' })
        };
        n.stores.semantics = { label: () => groupLabel({ name: 'Store', short: '3 stores.', detail: 'A, B, C.' }) };
        fruits.forEach(f => {
            const rows = fruitStores.filter(d => d.fruit === f);
            n[`fruit-${f.toLowerCase()}`].semantics = {
                label: () =>
                    groupLabel({
                        name: f,
                        short: '3 stores.',
                        detail: `Total ${total(rows)}. Store ${top(rows).store} is highest at ${top(rows).count}.`
                    })
            };
        });
        stores.forEach(s => {
            const rows = fruitStores.filter(d => d.store === s);
            n[`store-${s.toLowerCase()}`].semantics = {
                label: () =>
                    groupLabel({
                        name: `Store ${s}`,
                        short: '3 fruits.',
                        detail: `Total ${total(rows)}. ${top(rows).fruit} is highest at ${top(rows).count}.`
                    })
            };
        });
        fruitStores.forEach(d => {
            n[d.id].semantics = {
                label: () =>
                    pointLabel({
                        values: [{ key: 'Count', value: d.count }],
                        // "B" alone is unclear, so with no key it reads "Store B"
                        categories: [
                            { key: 'Fruit', value: d.fruit },
                            { key: 'Store', value: d.store, bare: `Store ${d.store}` }
                        ]
                    })
            };
        });
        // #endregion labels

        const all = Object.values(bars);
        n.chart.spatialProperties = rectSpatial({ x: 6, y: 6, width: width - 12, height: height - 12 }, 0);
        n.fruits.spatialProperties = rectSpatial(unionBox(all, boxes.xAxis), 4);
        n.stores.spatialProperties = rectSpatial(boxes.labels, 4);
        fruits.forEach(f => {
            n[`fruit-${f.toLowerCase()}`].spatialProperties = rectSpatial(
                unionBox(fruitStores.filter(d => d.fruit === f).map(d => bars[d.id])),
                4
            );
        });
        stores.forEach(s => {
            const segs = fruitStores.filter(d => d.store === s).map(d => bars[d.id]);
            n[`store-${s.toLowerCase()}`].spatialProperties = spatial(unionBox(segs), unionOfRectPaths(segs, 3));
        });
        fruitStores.forEach(d => {
            n[d.id].spatialProperties = rectSpatial(bars[d.id], 2);
        });
        return { structure };
    }
};
