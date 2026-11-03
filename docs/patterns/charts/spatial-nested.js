import dataNavigator from 'data-navigator';
import { createCanvas, rectSpatial, circleSpatial, fitWidth } from '../shared/canvas.js';
import { scatter } from '../shared/charts.js';
import { cars } from '../data/cars.js';

const alt =
    'Scatterplot of 60 cars, horsepower against miles per gallon, split into a grid. As horsepower goes up, MPG goes down.';
const range = ([lo, hi]) => `${Math.round(lo)} to ${Math.round(hi)}`;

export default {
    alt,
    focusNote:
        'A region is a box over part of the plot. A car is a circle. Arrow keys move between boxes of the same size, even across bigger boxes.',
    commandLabels: {
        left: 'left',
        right: 'right',
        up: 'up',
        down: 'down',
        'drill-in': 'zoom in',
        'drill-out': 'zoom out'
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
        // dashed lines show the 2x2 grid
        ctx.strokeStyle = theme.axis;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(x(140), boxes.plot.y);
        ctx.lineTo(x(140), boxes.plot.y + boxes.plot.height);
        ctx.moveTo(boxes.plot.x, y(30));
        ctx.lineTo(boxes.plot.x + boxes.plot.width, y(30));
        ctx.stroke();
        ctx.setLineDash([]);

        // #region structure
        const structure = dataNavigator.structure({
            data: cars,
            idKey: 'id',
            spatialGrid: {
                xKey: 'horsepower',
                yKey: 'mpg',
                xExtent: [40, 240],
                yExtent: [10, 50],
                levels: [2, 4], // 4 regions, then 16 smaller ones, then the cars
                leaves: 'points',
                levelNavigation: 'across',
                skipEmpty: true, // empty regions are skipped
                root: { id: 'grid', edges: [] }
            }
        });
        // #endregion structure

        // #region labels
        const n = structure.nodes;
        n.grid.semantics = { label: `${alt} ${structure.spatialGrid.cellsByLevel[0].length} regions with cars.` };
        structure.spatialGrid.cellsByLevel.flat().forEach(id => {
            const d = n[id].data;
            n[id].semantics = {
                label: `${d.count} car${d.count === 1 ? '' : 's'}, horsepower ${range(d.xExtent)}, MPG ${range(d.yExtent)}. Region.`
            };
        });
        cars.forEach(d => {
            n[d.id].semantics = { label: `Horsepower ${d.horsepower}, MPG ${d.mpg}, ${d.name}` };
        });
        // #endregion labels

        // #region focus
        n.grid.spatialProperties = rectSpatial(boxes.plot, 4);
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
