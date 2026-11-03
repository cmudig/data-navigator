import dataNavigator, { convexHullOfCircles } from 'data-navigator';
import { createCanvas, rectSpatial, circleSpatial, spatial, unionBox, fitWidth } from '../shared/canvas.js';
import { scatter, rangeStripe } from '../shared/charts.js';
import { cars } from '../data/cars.js';

const origins = ['USA', 'Europe', 'Japan'];
const alt =
    'Scatterplot of 60 cars, horsepower against miles per gallon, colored by origin. On average, USA cars have the most horsepower and the lowest MPG.';
const range = ([lo, hi]) => `${Math.round(lo)} to ${Math.round(hi)}`;

export default {
    alt,
    focusNote:
        'Same shapes as the iris chart. Origin groups overlap a lot here, so their hulls overlap too. That is a hint that origin alone does not split the plot.',
    commandLabels: {
        backward: 'back through origin',
        forward: 'forward through origin',
        left: 'less horsepower',
        right: 'more horsepower',
        down: 'lower MPG',
        up: 'higher MPG',
        'drill-in': 'drill in',
        'drill-out': 'back to the chart',
        'to-origin': 'up to the origin',
        'to-horsepower': 'up to the horsepower range',
        'to-mpg': 'up to the MPG range'
    },
    build(host) {
        const width = fitWidth(host);
        const height = 400;
        const { ctx, theme } = createCanvas(host, { width, height, alt });
        const { dots, boxes, x, y } = scatter(ctx, theme, {
            data: cars,
            xKey: 'horsepower',
            yKey: 'mpg',
            colorKey: 'origin',
            colors: origins,
            colorTitle: 'Origin',
            xDomain: [40, 240],
            yDomain: [10, 50],
            r: 4,
            width,
            height,
            xLabel: 'Horsepower',
            yLabel: 'Miles per gallon'
        });

        // #region structure
        const structure = dataNavigator.structure({
            data: cars,
            idKey: 'id',
            dimensions: {
                parentOptions: {
                    addLevel0: { id: 'chart', edges: [] },
                    level1Options: { order: ['origin', 'horsepower', 'mpg'], behavior: { extents: 'circular' } }
                },
                values: [
                    {
                        dimensionKey: 'origin',
                        nodeId: 'origin',
                        type: 'categorical',
                        divisionOptions: { divisionNodeIds: (key, value) => `origin-${value.toLowerCase()}` },
                        behavior: { extents: 'circular', childmostNavigation: 'within' },
                        navigationRules: {
                            sibling_sibling: ['backward', 'forward'],
                            parent_child: ['to-origin', 'drill-in']
                        }
                    },
                    {
                        dimensionKey: 'horsepower',
                        nodeId: 'horsepower',
                        type: 'numerical',
                        operations: { createNumericalSubdivisions: 4 },
                        divisionOptions: { divisionNodeIds: (key, value) => `hp-${Math.round(value)}` },
                        behavior: { extents: 'bridgedCousins', childmostNavigation: 'within' },
                        navigationRules: {
                            sibling_sibling: ['left', 'right'],
                            parent_child: ['to-horsepower', 'drill-in']
                        }
                    },
                    {
                        dimensionKey: 'mpg',
                        nodeId: 'mpg',
                        type: 'numerical',
                        operations: { createNumericalSubdivisions: 4 },
                        divisionOptions: { divisionNodeIds: (key, value) => `mpg-${Math.round(value)}` },
                        behavior: { extents: 'bridgedCousins', childmostNavigation: 'within' },
                        navigationRules: { sibling_sibling: ['down', 'up'], parent_child: ['to-mpg', 'drill-in'] }
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
                'drill-in': { key: 'Enter', direction: 'target' },
                'drill-out': { key: 'Backspace', direction: 'source' },
                'to-origin': { key: 'KeyW', direction: 'source' },
                'to-horsepower': { key: 'KeyJ', direction: 'source' },
                'to-mpg': { key: 'Backslash', direction: 'source' }
            }
        });
        // #endregion structure

        // #region labels
        const n = structure.nodes;
        n.chart.semantics = { label: `${alt} 3 groupings: origin, horsepower, MPG.` };
        n.origin.semantics = { label: 'Origin. 3 groups, 20 cars each.' };
        n.horsepower.semantics = { label: 'Horsepower. 4 ranges, 46 to 230.' };
        n.mpg.semantics = { label: 'Miles per gallon. 4 ranges, 11 to 46.6.' };
        origins.forEach(o => {
            n[`origin-${o.toLowerCase()}`].semantics = { label: `${o}. 20 cars.` };
        });
        [
            ['horsepower', 'Horsepower'],
            ['mpg', 'MPG']
        ].forEach(([key, name]) => {
            Object.values(structure.dimensions[key].divisions).forEach(div => {
                n[div.id].semantics = {
                    label: `${name} ${range(div.numericalExtents)}. ${Object.keys(div.values).length} car${Object.keys(div.values).length === 1 ? '' : 's'}.`
                };
            });
        });
        cars.forEach(d => {
            n[d.id].semantics = { label: `Horsepower ${d.horsepower}, MPG ${d.mpg}, ${d.origin}, ${d.name}` };
        });
        // #endregion labels

        // #region focus
        n.chart.spatialProperties = rectSpatial(boxes.plot, 12);
        n.origin.spatialProperties = rectSpatial(boxes.colorLegend.box, 4);
        n.horsepower.spatialProperties = rectSpatial(boxes.xAxis, 4);
        n.mpg.spatialProperties = rectSpatial(boxes.yAxis, 4);
        origins.forEach(o => {
            const set = cars.filter(d => d.origin === o).map(d => dots[d.id]);
            const box = unionBox(set.map(c => ({ x: c.x - 12, y: c.y - 12, width: 24, height: 24 })));
            n[`origin-${o.toLowerCase()}`].spatialProperties = spatial(box, convexHullOfCircles(set, 6));
        });
        Object.values(structure.dimensions.horsepower.divisions).forEach(div => {
            n[div.id].spatialProperties = rectSpatial(rangeStripe(x, div.numericalExtents, 'x', boxes.plot), 0);
        });
        Object.values(structure.dimensions.mpg.divisions).forEach(div => {
            n[div.id].spatialProperties = rectSpatial(rangeStripe(y, div.numericalExtents, 'y', boxes.plot), 0);
        });
        cars.forEach(d => {
            n[d.id].spatialProperties = circleSpatial(dots[d.id].x, dots[d.id].y, dots[d.id].r);
        });
        // #endregion focus

        return { structure };
    }
};
