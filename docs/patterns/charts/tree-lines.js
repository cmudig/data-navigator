import dataNavigator, { offsetLinePath } from 'data-navigator';
import { createCanvas, rectSpatial, circleSpatial, spatial, pointsBox, unionBox, fitWidth } from '../shared/canvas.js';
import { multiLine } from '../shared/charts.js';
import { cities } from '../data/cities.js';

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const cityOrder = ['New York', 'London', 'Sydney'];
const alt =
    'Line chart of average monthly temperature in three cities. New York swings from 0 to 27 degrees. Sydney is warmest in January and coolest in July.';
const slug = s => s.toLowerCase().replace(/\s+/g, '-');

export default {
    alt,
    focusNote: 'A point gets a circle. A city gets a band along its line. The top node outlines all three lines.',
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
        const { points, lines } = multiLine(ctx, theme, {
            data: cities,
            xKey: 'month',
            yKey: 'temp',
            seriesKey: 'city',
            series: cityOrder,
            xDomain: months,
            yDomain: [0, 30],
            width,
            height,
            xLabel: 'Month',
            yLabel: 'Temperature (°C)',
            legendTitle: 'City'
        });

        // #region structure
        const structure = dataNavigator.structure({
            data: cities,
            idKey: 'id',
            dimensions: {
                values: [
                    {
                        dimensionKey: 'city',
                        nodeId: 'cities',
                        type: 'categorical',
                        divisionOptions: { divisionNodeIds: (key, value) => `city-${slug(value)}` },
                        // 'within' keeps Left and Right on one line at the data point level
                        behavior: { extents: 'circular', childmostNavigation: 'within' },
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
        const n = structure.nodes;
        n.cities.semantics = { label: 'Cities. 3 lines: New York, London, Sydney.' };
        cityOrder.forEach(c => {
            const t = cities.filter(d => d.city === c).map(d => d.temp);
            n[`city-${slug(c)}`].semantics = {
                label: `${c}. 12 months, ${Math.min(...t)} to ${Math.max(...t)} degrees.`
            };
        });
        cities.forEach(d => {
            n[d.id].semantics = { label: `${d.temp} degrees, ${d.month}, ${d.city}` };
        });
        // #endregion labels

        // #region focus
        n.cities.spatialProperties = rectSpatial(unionBox(cityOrder.map(c => pointsBox(lines[c]))), 10);
        cityOrder.forEach(c => {
            n[`city-${slug(c)}`].spatialProperties = spatial(pointsBox(lines[c]), offsetLinePath(lines[c], 7));
        });
        cities.forEach(d => {
            n[d.id].spatialProperties = circleSpatial(points[d.id].x, points[d.id].y, 4);
        });
        // #endregion focus

        return { structure };
    }
};
