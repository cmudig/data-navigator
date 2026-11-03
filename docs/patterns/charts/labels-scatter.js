import dataNavigator from 'data-navigator';
import { createCanvas, rectSpatial, circleSpatial, fitWidth } from '../shared/canvas.js';
import { scatter, rangeStripe } from '../shared/charts.js';
import { pointLabel, groupLabel } from '../shared/labels.js';
import { cars } from '../data/cars.js';

const alt = 'Scatterplot of 60 cars, horsepower against miles per gallon. As horsepower goes up, MPG goes down.';
const range = ([lo, hi]) => `${Math.round(lo)} to ${Math.round(hi)}`;

export default {
    alt,
    focusNote: 'Same as the 2D spatial pattern. Labels here follow the settings above the demo.',
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
        const height = 360;
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

        const dim = (key, rules, parent) => ({
            dimensionKey: key,
            nodeId: key,
            type: 'numerical',
            operations: { createNumericalSubdivisions: 4 },
            divisionOptions: { divisionNodeIds: (k, v) => `${k}-${Math.round(v)}` },
            behavior: { extents: 'bridgedCousins', childmostNavigation: 'within' },
            navigationRules: { sibling_sibling: rules, parent_child: [parent, 'drill-in'] }
        });
        const structure = dataNavigator.structure({
            data: cars,
            idKey: 'id',
            dimensions: {
                parentOptions: { addLevel0: { id: 'chart', edges: [] } },
                values: [dim('horsepower', ['left', 'right'], 'to-horsepower'), dim('mpg', ['down', 'up'], 'to-mpg')]
            },
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

        // #region labels
        const n = structure.nodes;
        n.chart.semantics = { label: alt };
        n.horsepower.semantics = {
            label: () => groupLabel({ name: 'Horsepower', short: '4 ranges.', detail: '46 to 230.' })
        };
        n.mpg.semantics = {
            label: () => groupLabel({ name: 'Miles per gallon', short: '4 ranges.', detail: '11 to 46.6.' })
        };
        [
            ['horsepower', 'Horsepower', 'mpg', 'MPG'],
            ['mpg', 'MPG', 'horsepower', 'horsepower']
        ].forEach(([key, name, other, otherName]) => {
            Object.values(structure.dimensions[key].divisions).forEach(div => {
                const rows = Object.values(div.values);
                const vals = rows.map(d => d[other]);
                n[div.id].semantics = {
                    label: () =>
                        groupLabel({
                            name: `${name} ${range(div.numericalExtents)}`,
                            short: `${rows.length} car${rows.length === 1 ? '' : 's'}.`,
                            detail: rows.length ? `${otherName} ${Math.min(...vals)} to ${Math.max(...vals)}.` : ''
                        })
                };
            });
        });
        cars.forEach(d => {
            n[d.id].semantics = {
                label: () =>
                    pointLabel({
                        values: [
                            { key: 'Horsepower', value: d.horsepower },
                            { key: 'MPG', value: d.mpg }
                        ],
                        // two bare numbers are easy to mix up, so keys are on by default here
                        keysByDefault: true
                    })
            };
        });
        // #endregion labels

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
        return { structure };
    }
};
