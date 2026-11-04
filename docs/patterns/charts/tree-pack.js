import dataNavigator from 'data-navigator';
import { stratify, pack } from 'd3-hierarchy';
import { createCanvas, circleSpatial, drawDot, drawText, fitWidth } from '../shared/canvas.js';
import { flare } from '../data/flare.js';

const alt =
    'Circle packing of part of the flare code library, sized by bytes. Analytics is the largest package at 48,716 bytes. Easing is the largest class at 17,010 bytes.';
const fmt = v => v.toLocaleString('en-US');

export default {
    alt,
    focusNote:
        'Every node is a circle, so every indicator is a circle. Inner circles sit inside their parent, and the outline grows as you drill out.',
    commandLabels: {
        left: 'previous sibling',
        right: 'next sibling',
        'drill-in': 'go inside',
        'drill-out': 'go to the parent'
    },
    build(host) {
        const width = fitWidth(host);
        const size = Math.min(width, 480);
        const { ctx, theme } = createCanvas(host, { width, height: size, alt });

        // lay out the circles with d3, then copy each total onto its row
        const root = stratify()
            .id(d => d.id)
            .parentId(d => d.parent || null)(flare)
            .sum(d => d.size || 0)
            .sort((a, b) => b.value - a.value);
        pack()
            .size([size - 8, size - 8])
            .padding(4)(root);
        const rows = root.descendants().map(node => ({ ...node.data, value: node.value, depth: node.depth }));
        const circles = {};
        root.descendants().forEach(node => {
            const c = { x: node.x + 4 + (width - size) / 2, y: node.y + 4, r: node.r };
            circles[node.id] = c;
            drawDot(ctx, c.x, c.y, c.r, node.children ? theme.grey : theme.series[0]);
            if (!node.children && c.r > 22) {
                const name =
                    node.data.name.length > c.r / 3.4
                        ? node.data.name.slice(0, Math.floor(c.r / 3.4)) + '.'
                        : node.data.name;
                drawText(ctx, name, c.x, c.y + 3, { size: 10, color: theme.text, align: 'center' });
            }
        });

        // #region structure
        const structure = dataNavigator.structure({
            data: rows,
            idKey: 'id',
            hierarchy: {
                parentKey: 'parent',
                // biggest first, the same order the packing uses
                sortFunction: (a, b) => b.value - a.value,
                levelNavigation: 'within',
                extents: 'circular',
                navigationRules: {
                    sibling_sibling: ['left', 'right'],
                    parent_child: ['drill-out', 'drill-in']
                }
            }
        });
        // #endregion structure

        // #region labels
        rows.forEach(d => {
            const node = structure.nodes[d.id];
            node.semantics = {
                label: d.size
                    ? `${fmt(d.size)} bytes, ${d.name}`
                    : `${d.name}. ${node.childCount} items, ${fmt(d.value)} bytes.`
            };
        });
        // #endregion labels

        // #region focus
        rows.forEach(d => {
            const c = circles[d.id];
            structure.nodes[d.id].spatialProperties = circleSpatial(c.x, c.y, c.r, 2);
        });
        // #endregion focus

        return { structure };
    }
};
