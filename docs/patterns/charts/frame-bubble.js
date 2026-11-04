import dataNavigator from 'data-navigator';
import { createCanvas, rectSpatial, circleSpatial, fitWidth } from '../shared/canvas.js';
import { scatter } from '../shared/charts.js';
import { cars } from '../data/cars.js';

const origins = ['USA', 'Europe', 'Japan'];
const alt =
    'Bubble chart of 60 cars, horsepower against miles per gallon. USA cars are blue and the rest are grey. Size shows weight. Heavy, powerful cars get the lowest MPG.';
const range = ([lo, hi]) => `${Math.round(lo)} to ${Math.round(hi)}`;

export default {
    alt,
    focusNote:
        'Two legends, two boxes: one around the color key, one around the size key. Inside Data it is a 2D grid of regions, then cars.',
    commandLabels: {
        left: 'left',
        right: 'right',
        up: 'up',
        down: 'down',
        'drill-in': 'drill in',
        'drill-out': 'drill out'
    },
    build(host) {
        const width = fitWidth(host);
        const height = 460;
        const { ctx, theme } = createCanvas(host, { width, height, alt });
        const { dots, boxes, x, y } = scatter(ctx, theme, {
            data: cars,
            xKey: 'horsepower',
            yKey: 'mpg',
            colorKey: 'origin',
            colors: origins,
            colorTitle: 'Origin',
            highlight: 'USA',
            sizeKey: 'weight',
            sizeDomain: [1500, 5000],
            sizeRange: [3, 11],
            sizeValues: [2000, 3500, 5000],
            sizeTitle: 'Weight (lb)',
            sizeFormat: v => v.toLocaleString('en-US'),
            xDomain: [40, 240],
            yDomain: [10, 50],
            width,
            height,
            title: 'Power and fuel economy',
            subtitle: '60 cars from 1970 to 1982',
            xLabel: 'Horsepower',
            yLabel: 'Miles per gallon'
        });

        // #region structure
        const structure = dataNavigator.structure({
            data: cars,
            idKey: 'id',
            frame: {
                root: { id: 'chart', semantics: { label: alt } },
                elements: [
                    { id: 'title', semantics: { label: 'Title: Power and fuel economy.' } },
                    { id: 'subtitle', semantics: { label: 'Subtitle: 60 cars from 1970 to 1982.' } },
                    { id: 'y-axis', semantics: { label: 'Y axis: Miles per gallon, 10 to 50.' } },
                    { id: 'x-axis', semantics: { label: 'X axis: Horsepower, 40 to 240.' } },
                    {
                        id: 'color-legend',
                        semantics: { label: 'Legend, color: Origin. USA in blue, Europe and Japan in grey.' }
                    },
                    {
                        id: 'size-legend',
                        semantics: { label: 'Legend, size: Weight, 2,000 to 5,000 pounds. Bigger circles are heavier.' }
                    }
                ]
            },
            spatialGrid: {
                xKey: 'horsepower',
                yKey: 'mpg',
                xExtent: [40, 240],
                yExtent: [10, 50],
                levels: [2],
                root: { id: 'data', edges: [] }
            }
        });
        // #endregion structure

        // #region labels
        const n = structure.nodes;
        n.data.semantics = { label: `Data: 60 cars in ${structure.spatialGrid.cellsByLevel[0].length} regions.` };
        structure.spatialGrid.cellsByLevel.flat().forEach(id => {
            const d = n[id].data;
            n[id].semantics = {
                label: `${d.count} car${d.count === 1 ? '' : 's'}, horsepower ${range(d.xExtent)}, MPG ${range(d.yExtent)}. Region.`
            };
        });
        cars.forEach(d => {
            n[d.id].semantics = {
                label: `Horsepower ${d.horsepower}, MPG ${d.mpg}, ${d.weight.toLocaleString('en-US')} lb, ${d.origin}, ${d.name}`
            };
        });
        // #endregion labels

        // #region focus
        n.chart.spatialProperties = rectSpatial({ x: 6, y: 6, width: width - 12, height: height - 12 }, 0);
        n.title.spatialProperties = rectSpatial(boxes.title, 4);
        n.subtitle.spatialProperties = rectSpatial(boxes.subtitle, 4);
        n['y-axis'].spatialProperties = rectSpatial(boxes.yAxis, 4);
        n['x-axis'].spatialProperties = rectSpatial(boxes.xAxis, 4);
        n['color-legend'].spatialProperties = rectSpatial(boxes.colorLegend.box, 4);
        n['size-legend'].spatialProperties = rectSpatial(boxes.sizeLegend.box, 4);
        n.data.spatialProperties = rectSpatial(boxes.plot, 4);
        structure.spatialGrid.cellsByLevel.flat().forEach(id => {
            const { xExtent, yExtent } = n[id].data;
            const box = {
                x: x(xExtent[0]),
                y: y(yExtent[1]),
                width: x(xExtent[1]) - x(xExtent[0]),
                height: y(yExtent[0]) - y(yExtent[1])
            };
            n[id].spatialProperties = rectSpatial(box, 0);
        });
        cars.forEach(d => {
            n[d.id].spatialProperties = circleSpatial(dots[d.id].x, dots[d.id].y, dots[d.id].r);
        });
        // #endregion focus

        return { structure };
    }
};
