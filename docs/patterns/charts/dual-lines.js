import dataNavigator, { offsetLinePath, boundingRectPath } from 'data-navigator';
import { createCanvas, rectSpatial, circleSpatial, spatial, pointsBox, fitWidth } from '../shared/canvas.js';
import { multiLine } from '../shared/charts.js';
import { cities } from '../data/cities.js';

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const cityOrder = ['New York', 'London', 'Sydney'];
const alt =
    'Line chart of average monthly temperature in three cities. New York swings from 0 to 27 degrees. Sydney is warmest in January and coolest in July.';
const slug = s => s.toLowerCase().replace(/\s+/g, '-');

export default {
    alt,
    focusNote:
        'A point gets a circle. A month outlines its three points. A city gets a band along its line. The City dimension outlines the legend.',
    commandLabels: {
        left: 'previous month',
        right: 'next month',
        up: 'previous city',
        down: 'next city',
        'drill-in': 'drill in',
        'drill-out': 'back to the chart',
        'to-month': 'up to the month',
        'to-city': 'up to the city'
    },
    build(host) {
        const width = fitWidth(host);
        const height = 360;
        const { ctx, theme } = createCanvas(host, { width, height, alt });
        const { points, lines, boxes } = multiLine(ctx, theme, {
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
                parentOptions: { addLevel0: { id: 'chart', edges: [] } },
                values: [
                    {
                        dimensionKey: 'month',
                        nodeId: 'months',
                        type: 'categorical',
                        divisionOptions: { divisionNodeIds: (key, value) => `month-${value.toLowerCase()}` },
                        behavior: { extents: 'circular', childmostNavigation: 'across' },
                        navigationRules: { sibling_sibling: ['left', 'right'], parent_child: ['to-month', 'drill-in'] }
                    },
                    {
                        dimensionKey: 'city',
                        nodeId: 'cities',
                        type: 'categorical',
                        divisionOptions: { divisionNodeIds: (key, value) => `city-${slug(value)}` },
                        behavior: { extents: 'circular', childmostNavigation: 'across' },
                        // lines cross, so Up and Down follow the legend order
                        navigationRules: { sibling_sibling: ['up', 'down'], parent_child: ['to-city', 'drill-in'] }
                    }
                ]
            }
        });
        // #endregion structure

        // #region labels
        const n = structure.nodes;
        n.chart.semantics = { label: `${alt} Two groupings: month and city.` };
        n.months.semantics = { label: 'Month. 12 months, January to December.' };
        n.cities.semantics = { label: 'City. 3 lines: New York, London, Sydney.' };
        months.forEach(m => {
            const rows = cities.filter(d => d.month === m);
            const parts = rows.map(d => `${d.city} ${d.temp}`).join(', ');
            n[`month-${m.toLowerCase()}`].semantics = { label: `${m}. ${parts}.` };
        });
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
        n.chart.spatialProperties = rectSpatial({ x: 6, y: 6, width: width - 12, height: height - 12 }, 0);
        n.months.spatialProperties = rectSpatial(boxes.xAxis, 4);
        n.cities.spatialProperties = rectSpatial(boxes.legends[0].box, 4);
        months.forEach(m => {
            const pts = cities.filter(d => d.month === m).map(d => points[d.id]);
            const box = pointsBox(pts);
            const padded = { x: box.x - 8, y: box.y - 8, width: box.width + 16, height: box.height + 16 };
            n[`month-${m.toLowerCase()}`].spatialProperties = spatial(padded, boundingRectPath([box], 8));
        });
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
