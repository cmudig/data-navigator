import dataNavigator, { convexHullOfCircles } from 'data-navigator';
import { createCanvas, rectSpatial, circleSpatial, spatial, unionBox, fitWidth } from '../shared/canvas.js';
import { scatter, rangeStripe } from '../shared/charts.js';
import { iris } from '../data/iris.js';

const species = ['setosa', 'versicolor', 'virginica'];
const alt =
    'Scatterplot of 15 iris flowers, sepal length against petal length, colored by species. Setosa has short petals. Virginica has the longest.';
const r2 = v => Math.round(v * 100) / 100;

export default {
    alt,
    focusNote:
        'A flower gets a circle. A species gets a hull around its flowers. Sepal ranges are vertical bands and petal ranges are horizontal bands. The root outlines the whole plot.',
    commandLabels: {
        backward: 'back through species',
        forward: 'forward through species',
        left: 'shorter sepal',
        right: 'longer sepal',
        down: 'shorter petal',
        up: 'longer petal',
        'drill in': 'drill in',
        'drill out to species': 'up to the species',
        'drill out to sepal_length': 'up to the sepal range',
        'drill out to petal_length': 'up to the petal range'
    },
    build(host) {
        const width = fitWidth(host);
        const height = 400;
        const { ctx, theme } = createCanvas(host, { width, height, alt });
        const { dots, boxes, x, y } = scatter(ctx, theme, {
            data: iris.map(d => ({ ...d, id: d.pt })),
            xKey: 'sepal_length',
            yKey: 'petal_length',
            colorKey: 'species',
            colors: species,
            colorTitle: 'Species',
            xDomain: [4.5, 7.5],
            yDomain: [0, 7],
            r: 6,
            width,
            height,
            xLabel: 'Sepal length (cm)',
            yLabel: 'Petal length (cm)'
        });

        // #region structure
        // The Skeleton app's pre-built scatterplot, as exported.
        const structure = dataNavigator.structure({
            data: iris,
            idKey: 'pt',
            dimensions: {
                parentOptions: {
                    addLevel0: { id: 'root', edges: [] },
                    level1Options: {
                        order: ['species', 'sepal_length', 'petal_length'],
                        behavior: { extents: 'circular' },
                        navigationRules: {
                            sibling_sibling: ['left', 'right'],
                            parent_child: ['drill in', 'drill out to species']
                        }
                    }
                },
                values: [
                    {
                        dimensionKey: 'species',
                        nodeId: 'species',
                        type: 'categorical',
                        divisionOptions: { divisionNodeIds: (key, value) => `species-${value}` },
                        behavior: { extents: 'circular', childmostNavigation: 'within' },
                        operations: { compressSparseDivisions: true },
                        navigationRules: {
                            sibling_sibling: ['backward', 'forward'],
                            parent_child: ['drill in', 'drill out to species']
                        }
                    },
                    {
                        dimensionKey: 'sepal_length',
                        nodeId: 'sepal_length',
                        type: 'numerical',
                        divisionOptions: { divisionNodeIds: (key, value) => `sepal-${Math.round(value * 100)}` },
                        behavior: { extents: 'bridgedCousins', childmostNavigation: 'within' },
                        operations: { compressSparseDivisions: true, createNumericalSubdivisions: 5 },
                        navigationRules: {
                            sibling_sibling: ['left', 'right'],
                            parent_child: ['drill in', 'drill out to sepal_length']
                        }
                    },
                    {
                        dimensionKey: 'petal_length',
                        nodeId: 'petal_length',
                        type: 'numerical',
                        divisionOptions: { divisionNodeIds: (key, value) => `petal-${Math.round(value * 100)}` },
                        behavior: { extents: 'bridgedCousins', childmostNavigation: 'within' },
                        operations: { compressSparseDivisions: true, createNumericalSubdivisions: 5 },
                        navigationRules: {
                            sibling_sibling: ['down', 'up'],
                            parent_child: ['drill in', 'drill out to petal_length']
                        }
                    }
                ]
            },
            navigationRules: {
                backward: { key: 'BracketLeft', direction: 'source' },
                forward: { key: 'BracketRight', direction: 'target' },
                left: { key: 'ArrowLeft', direction: 'source' },
                right: { key: 'ArrowRight', direction: 'target' },
                down: { key: 'ArrowDown', direction: 'source' },
                up: { key: 'ArrowUp', direction: 'target' },
                'drill in': { key: 'Enter', direction: 'target' },
                'drill out to species': { key: 'KeyW', direction: 'source' },
                'drill out to sepal_length': { key: 'KeyJ', direction: 'source' },
                'drill out to petal_length': { key: 'Backslash', direction: 'source' }
            }
        });
        // #endregion structure

        // #region labels
        const n = structure.nodes;
        n.root.semantics = {
            label: 'Iris: sepal length vs petal length. Scatter plot. 3 groupings: species, sepal length, petal length.'
        };
        n.species.semantics = { label: 'Species. 3 groups.' };
        n.sepal_length.semantics = { label: 'Sepal length. 5 ranges, 4.7 to 7.1 cm.' };
        n.petal_length.semantics = { label: 'Petal length. 5 ranges, 1 to 6 cm.' };
        species.forEach(s => {
            n[`species-${s}`].semantics = { label: `${s}. 5 flowers.` };
        });
        [
            ['sepal_length', 'Sepal'],
            ['petal_length', 'Petal']
        ].forEach(([key, name]) => {
            Object.values(structure.dimensions[key].divisions).forEach(div => {
                const [lo, hi] = div.numericalExtents.map(r2);
                n[div.id].semantics = {
                    label: `${name} ${lo} to ${hi} cm. ${Object.keys(div.values).length} flower${Object.keys(div.values).length === 1 ? '' : 's'}.`
                };
            });
        });
        iris.forEach(d => {
            n[d.pt].semantics = { label: `Sepal ${d.sepal_length}, petal ${d.petal_length}, ${d.species}` };
        });
        // #endregion labels

        // #region focus
        n.root.spatialProperties = rectSpatial(boxes.plot, 16);
        n.species.spatialProperties = rectSpatial(boxes.colorLegend.box, 4);
        n.sepal_length.spatialProperties = rectSpatial(boxes.xAxis, 4);
        n.petal_length.spatialProperties = rectSpatial(boxes.yAxis, 4);
        species.forEach(s => {
            const set = iris.filter(d => d.species === s).map(d => dots[d.pt]);
            const box = unionBox(set.map(c => ({ x: c.x - 16, y: c.y - 16, width: 32, height: 32 })));
            n[`species-${s}`].spatialProperties = spatial(box, convexHullOfCircles(set, 10));
        });
        Object.values(structure.dimensions.sepal_length.divisions).forEach(div => {
            n[div.id].spatialProperties = rectSpatial(rangeStripe(x, div.numericalExtents, 'x', boxes.plot), 0);
        });
        Object.values(structure.dimensions.petal_length.divisions).forEach(div => {
            n[div.id].spatialProperties = rectSpatial(rangeStripe(y, div.numericalExtents, 'y', boxes.plot), 0);
        });
        iris.forEach(d => {
            n[d.pt].spatialProperties = circleSpatial(dots[d.pt].x, dots[d.pt].y, dots[d.pt].r);
        });
        // #endregion focus

        return { structure };
    }
};
