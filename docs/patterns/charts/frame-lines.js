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
    focusNote:
        'Same frame boxes as the bar chart, plus a box around the legend. Inside Data it is a tree: lines, then points.',
    commandLabels: {
        left: 'previous',
        right: 'next',
        'drill-in': 'drill in',
        'drill-out': 'drill out'
    },
    build(host) {
        const width = fitWidth(host);
        const height = 400;
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
            title: 'Monthly temperature',
            subtitle: 'Average in degrees Celsius',
            xLabel: 'Month',
            yLabel: 'Temperature (°C)',
            legendTitle: 'City'
        });

        // #region structure
        const structure = dataNavigator.structure({
            data: cities,
            idKey: 'id',
            frame: {
                root: { id: 'chart', semantics: { label: alt } },
                elements: [
                    { id: 'title', semantics: { label: 'Title: Monthly temperature.' } },
                    { id: 'subtitle', semantics: { label: 'Subtitle: Average in degrees Celsius.' } },
                    { id: 'y-axis', semantics: { label: 'Y axis: Temperature, 0 to 30 degrees.' } },
                    { id: 'x-axis', semantics: { label: 'X axis: Month, January to December.' } },
                    { id: 'legend', semantics: { label: 'Legend, color: City. New York, London, Sydney.' } }
                ]
            },
            dimensions: {
                values: [
                    {
                        dimensionKey: 'city',
                        nodeId: 'cities',
                        type: 'categorical',
                        divisionOptions: { divisionNodeIds: (key, value) => `city-${slug(value)}` },
                        behavior: { extents: 'circular', childmostNavigation: 'within' },
                        navigationRules: { sibling_sibling: ['left', 'right'], parent_child: ['drill-out', 'drill-in'] }
                    }
                ]
            }
        });
        // #endregion structure

        // #region labels
        const n = structure.nodes;
        n.cities.semantics = { label: 'Data: 3 lines.' };
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
        n.title.spatialProperties = rectSpatial(boxes.title, 4);
        n.subtitle.spatialProperties = rectSpatial(boxes.subtitle, 4);
        n['y-axis'].spatialProperties = rectSpatial(boxes.yAxis, 4);
        n['x-axis'].spatialProperties = rectSpatial(boxes.xAxis, 4);
        n.legend.spatialProperties = rectSpatial(boxes.legends[0].box, 4);
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
