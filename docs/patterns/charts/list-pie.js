import dataNavigator from 'data-navigator';
import { createCanvas, drawText, measureText, arcSpatial, circleSpatial, fitWidth } from '../shared/canvas.js';
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
        // largest first, so the slices shrink clockwise from 12 o'clock
        const sorted = [...fruit].sort((a, b) => b.count - a.count);
        const total = sorted.reduce((s, d) => s + d.count, 0);
        // five colors, then grey for the smallest slice
        const colorOf = i => theme.series[i] || theme.grey;
        const name = d => `${d.fruit} (${d.count})`;
        const labelW = Math.max(...sorted.map(d => measureText(ctx, name(d), { size: 12 })));
        const r = Math.max(50, Math.min(110, (width - 2 * (labelW + 20)) / 2));
        const cx = width / 2;
        const cy = height / 2;
        let a = 0;
        const slices = {};
        sorted.forEach((d, i) => {
            const color = colorOf(i);
            const a0 = a;
            const a1 = a + (d.count / total) * Math.PI * 2;
            slices[d.id] = [a0, a1];
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, r, a0 - Math.PI / 2, a1 - Math.PI / 2);
            ctx.closePath();
            ctx.fillStyle = color.fill;
            ctx.fill();
            ctx.strokeStyle = color.stroke;
            ctx.lineWidth = 1;
            ctx.lineJoin = 'round';
            ctx.stroke();
            const mid = (a0 + a1) / 2;
            drawText(ctx, name(d), cx + (r + 10) * Math.sin(mid), cy - (r + 10) * Math.cos(mid) + 4, {
                size: 12,
                color: theme.text,
                align: Math.sin(mid) >= 0 ? 'left' : 'right'
            });
            a = a1;
        });

        // #region structure
        const structure = dataNavigator.structure({
            data: sorted,
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
        sorted.forEach(d => {
            structure.nodes[d.id].semantics = { label: `${d.count}, ${d.fruit}` };
        });
        // #endregion labels

        // #region focus
        structure.nodes.fruit.spatialProperties = circleSpatial(cx, cy, r, 6);
        sorted.forEach(d => {
            const [a0, a1] = slices[d.id];
            structure.nodes[d.id].spatialProperties = arcSpatial(cx, cy, 0, r, a0, a1);
        });
        // #endregion focus

        return { structure };
    }
};
