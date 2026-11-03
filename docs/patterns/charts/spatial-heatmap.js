import dataNavigator from 'data-navigator';
import { scaleLinear } from 'd3-scale';
import { createCanvas, axisBottom, axisLeft, rectSpatial, fitWidth } from '../shared/canvas.js';
import { seattleHeat } from '../data/seattle-heat.js';

const alt =
    'Heatmap of 1,461 days in Seattle by daily high and daily low. Highs and lows rise together. The most common cell, 162 days, has a high of 9 to 13.5 degrees and a low of 6 to 9.5.';
const HIGH = v => v * 4.5; // high bins are 4.5 degrees wide, starting at 0
const LOW = v => -8 + v * 3.5; // low bins are 3.5 degrees wide, starting at -8
const deg = v => `${Math.round(v * 10) / 10}`;

export default {
    alt,
    focusNote:
        'Every node is a box. At the top level the boxes are quarters of the plot. Each zoom level splits a box into four, down to single cells.',
    commandLabels: {
        left: 'region to the left',
        right: 'region to the right',
        up: 'region above',
        down: 'region below',
        'drill-in': 'zoom in',
        'drill-out': 'zoom out'
    },
    build(host) {
        const width = fitWidth(host);
        const size = Math.min(width - 90, 380);
        const height = size + 70;
        const { ctx, theme } = createCanvas(host, { width, height, alt });
        const plot = { x: 70, y: 12, width: size, height: size };
        const x = scaleLinear([0, 8], [plot.x, plot.x + plot.width]);
        const y = scaleLinear([0, 8], [plot.y + plot.height, plot.y]);
        const maxDays = Math.max(...seattleHeat.map(d => d.days));
        const color = d => theme.sequential[Math.min(6, Math.floor((d.days / (maxDays + 1)) * 7))];
        const cells = {};
        seattleHeat.forEach(d => {
            cells[d.id] = { x: x(d.highBin), y: y(d.lowBin + 1), width: x(1) - x(0), height: y(0) - y(1) };
            ctx.fillStyle = color(d);
            ctx.fillRect(cells[d.id].x + 1, cells[d.id].y + 1, cells[d.id].width - 2, cells[d.id].height - 2);
        });
        // light lines for each zoom level
        [4, 2].forEach((n, i) => {
            ctx.strokeStyle = theme.axis;
            ctx.lineWidth = i ? 2 : 1;
            ctx.setLineDash(i ? [] : [3, 3]);
            for (let k = 1; k < n; k++) {
                const v = (k * 8) / n;
                ctx.beginPath();
                ctx.moveTo(x(v), plot.y);
                ctx.lineTo(x(v), plot.y + plot.height);
                ctx.moveTo(plot.x, y(v));
                ctx.lineTo(plot.x + plot.width, y(v));
                ctx.stroke();
            }
        });
        ctx.setLineDash([]);
        axisBottom(ctx, x, { y: plot.y + plot.height, ticks: 4, format: v => deg(HIGH(v)), label: 'Daily high (°C)' });
        axisLeft(ctx, y, { x: plot.x, ticks: 4, format: v => deg(LOW(v)), label: 'Daily low (°C)' });

        // #region structure
        const structure = dataNavigator.structure({
            data: seattleHeat,
            idKey: 'id',
            spatialGrid: {
                xKey: 'highBin',
                yKey: 'lowBin',
                xExtent: [0, 8],
                yExtent: [0, 8],
                levels: [2, 4], // 2x2 regions, then 4x4, then the 8x8 cells
                leaves: 'cells', // each row is already a heatmap cell
                levelNavigation: 'across', // arrows cross region borders at every zoom level
                root: { id: 'grid', edges: [] }
            }
        });
        // #endregion structure

        // #region labels
        const n = structure.nodes;
        n.grid.semantics = {
            label: `All days. ${seattleHeat.length} filled cells in ${structure.spatialGrid.cellsByLevel[0].length} regions.`
        };
        structure.spatialGrid.cellsByLevel.flat().forEach(id => {
            const d = n[id].data;
            const [h0, h1] = d.xExtent.map(HIGH);
            const [l0, l1] = d.yExtent.map(LOW);
            n[id].semantics = {
                label: `${d.count} day${d.count === 1 ? '' : 's'}, highs ${deg(h0)} to ${deg(h1)}, lows ${deg(l0)} to ${deg(l1)}. Region.`
            };
        });
        seattleHeat.forEach(d => {
            n[d.id].semantics = {
                label: `${d.days} day${d.days === 1 ? '' : 's'}, high ${deg(d.highFrom)} to ${deg(d.highTo)}, low ${deg(d.lowFrom)} to ${deg(d.lowTo)}`
            };
        });
        // #endregion labels

        // #region focus
        n.grid.spatialProperties = rectSpatial(plot, 4);
        structure.spatialGrid.cellsByLevel.flat().forEach(id => {
            const { xExtent, yExtent } = n[id].data;
            const box = {
                x: x(xExtent[0]),
                y: y(yExtent[1]),
                width: x(xExtent[1]) - x(xExtent[0]),
                height: y(yExtent[0]) - y(yExtent[1])
            };
            n[id].spatialProperties = rectSpatial(box, 1);
        });
        seattleHeat.forEach(d => {
            n[d.id].spatialProperties = rectSpatial(cells[d.id], 1);
        });
        // #endregion focus

        return { structure };
    }
};
