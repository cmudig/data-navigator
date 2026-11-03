import dataNavigator from 'data-navigator';
import { createCanvas, rectSpatial, circleSpatial, fitWidth } from '../shared/canvas.js';
import { scatter, rangeStripe } from '../shared/charts.js';
import { cars } from '../data/cars.js';

const alt = 'Scatterplot of 60 cars, horsepower against miles per gallon. As horsepower goes up, MPG goes down.';
const range = ([lo, hi]) => `${Math.round(lo)} to ${Math.round(hi)}`;

export default {
    alt,
    focusNote:
        'A car gets a circle. A horsepower range is a vertical band. An MPG range is a horizontal band. Each dimension outlines its axis.',
    commandLabels: {
        left: 'less horsepower',
        right: 'more horsepower',
        up: 'higher MPG',
        down: 'lower MPG',
        'drill-in': 'drill in',
        'drill-out': 'back to the chart',
        'to-horsepower': 'up to the horsepower range',
        'to-mpg': 'up to the MPG range'
    },
    build(host) {
        const width = fitWidth(host);
        const height = 380;
        const { ctx, theme } = createCanvas(host, { width, height, alt });
        const { dots, boxes, x, y } = scatter(ctx, theme, {
            data: cars,
            xKey: 'horsepower',
            yKey: 'mpg',
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
                parentOptions: { addLevel0: { id: 'chart', edges: [] } },
                values: [
                    {
                        dimensionKey: 'horsepower',
                        nodeId: 'horsepower',
                        type: 'numerical',
                        operations: { createNumericalSubdivisions: 4 },
                        divisionOptions: { divisionNodeIds: (key, value) => `hp-${Math.round(value)}` },
                        // bridgedCousins: Left and Right walk every car in x order, across ranges
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
            // ranges run low to high, so Up moves toward the target (higher MPG)
            navigationRules: {
                left: { key: 'ArrowLeft', direction: 'source' },
                right: { key: 'ArrowRight', direction: 'target' },
                down: { key: 'ArrowDown', direction: 'source' },
                up: { key: 'ArrowUp', direction: 'target' },
                'drill-in': { key: 'Enter', direction: 'target' },
                'drill-out': { key: 'Backspace', direction: 'source' },
                'to-horsepower': { key: 'KeyW', direction: 'source' },
                'to-mpg': { key: 'KeyJ', direction: 'source' }
            }
        });
        // #endregion structure

        // #region labels
        const n = structure.nodes;
        n.chart.semantics = { label: `${alt} Two groupings: horsepower ranges and MPG ranges.` };
        n.horsepower.semantics = { label: 'Horsepower. 4 ranges, 46 to 230.' };
        n.mpg.semantics = { label: 'Miles per gallon. 4 ranges, 11 to 46.6.' };
        ['horsepower', 'mpg'].forEach(key => {
            Object.values(structure.dimensions[key].divisions).forEach(div => {
                const count = Object.keys(div.values).length;
                const name = key === 'mpg' ? 'MPG' : 'Horsepower';
                n[div.id].semantics = {
                    label: `${name} ${range(div.numericalExtents)}. ${count} car${count === 1 ? '' : 's'}.`
                };
            });
        });
        cars.forEach(d => {
            n[d.id].semantics = { label: `Horsepower ${d.horsepower}, MPG ${d.mpg}, ${d.name}` };
        });
        // #endregion labels

        // #region focus
        n.chart.spatialProperties = rectSpatial({ x: 6, y: 6, width: width - 12, height: height - 12 }, 0);
        n.horsepower.spatialProperties = rectSpatial(boxes.xAxis, 4);
        n.mpg.spatialProperties = rectSpatial(boxes.yAxis, 4);
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
