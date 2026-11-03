import dataNavigator from 'data-navigator';
import { createCanvas, drawText, arcSpatial, circleSpatial, fitWidth } from '../shared/canvas.js';
import { fruit } from '../data/fruit.js';

const alt = 'Pie chart of fruit counts. Strawberries are the largest slice at 6 of 24. Plums are the smallest at 2.';

export default {
    alt,
    focusNote: 'Each slice gets an outline that follows its arc. The parent node is a circle around the whole pie.',
    commandLabels: {
        left: 'previous slice',
        right: 'next slice (clockwise)',
        'drill-in': 'go into the slices',
        'drill-out': 'back to all fruit'
    },
    build(host) {
        const width = fitWidth(host);
        const height = 300;
        const { ctx, theme } = createCanvas(host, { width, height, alt });
        const total = fruit.reduce((s, d) => s + d.count, 0);
        const r = width < 440 ? 80 : 110;
        const cx = r + 24;
        const cy = height / 2;
        // slices start at 12 o'clock and go clockwise, with a 2px gap between them
        let a = 0;
        const slices = {};
        fruit.forEach((d, i) => {
            const a0 = a;
            const a1 = a + (d.count / total) * Math.PI * 2;
            slices[d.id] = [a0, a1];
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, r, a0 - Math.PI / 2, a1 - Math.PI / 2);
            ctx.closePath();
            ctx.fillStyle = theme.series[i];
            ctx.fill();
            ctx.strokeStyle = theme.surface;
            ctx.lineWidth = 2;
            ctx.stroke();
            a = a1;
        });
        // legend with values, so color is never the only cue
        fruit.forEach((d, i) => {
            const ly = cy - 60 + i * 22;
            const lx = cx + r + 24;
            ctx.fillStyle = theme.series[i];
            ctx.beginPath();
            ctx.roundRect(lx, ly - 9, 10, 10, 2);
            ctx.fill();
            drawText(ctx, `${d.fruit} (${d.count})`, lx + 16, ly, { size: 12, color: theme.text });
        });

        // #region structure
        const structure = dataNavigator.structure({
            data: fruit,
            idKey: 'id',
            dimensions: {
                values: [
                    {
                        dimensionKey: 'fruit',
                        nodeId: 'fruit',
                        type: 'categorical',
                        behavior: { extents: 'circular' },
                        operations: { compressSparseDivisions: true },
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
        structure.nodes.fruit.semantics = { label: `Fruit. 6 slices, ${total} total.` };
        fruit.forEach(d => {
            structure.nodes[d.id].semantics = { label: `${d.count}, ${d.fruit}` };
        });
        // #endregion labels

        // #region focus
        structure.nodes.fruit.spatialProperties = circleSpatial(cx, cy, r, 6);
        fruit.forEach(d => {
            const [a0, a1] = slices[d.id];
            structure.nodes[d.id].spatialProperties = arcSpatial(cx, cy, 0, r, a0, a1);
        });
        // #endregion focus

        return { structure };
    }
};
