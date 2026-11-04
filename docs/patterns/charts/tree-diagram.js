import dataNavigator, { convexHullOfCircles } from 'data-navigator';
import { stratify, tree } from 'd3-hierarchy';
import { createCanvas, drawDot, drawText, rectSpatial, spatial, unionBox, fitWidth } from '../shared/canvas.js';
import { flare } from '../data/flare.js';

const alt =
    'Tree diagram of part of the flare code library. Three packages, analytics, animate, and display, hold 23 classes.';

export default {
    alt,
    focusNote:
        'A class outlines its dot and name. A package outlines its whole branch with a hull, so you can see everything inside it.',
    commandLabels: {
        up: 'node above (same depth)',
        down: 'node below (same depth)',
        left: 'go to the parent',
        right: 'go to the first child'
    },
    build(host) {
        const width = fitWidth(host);
        const height = 420;
        const { ctx, theme } = createCanvas(host, { width, height, alt });

        // a left to right tidy tree, laid out with d3
        const root = stratify()
            .id(d => d.id)
            .parentId(d => d.parent || null)(flare);
        const labelRoom = width < 480 ? 110 : 150;
        tree().size([height - 32, width - labelRoom - 72])(root);
        const pos = node => ({ x: node.y + 56, y: node.x + 16 });
        ctx.strokeStyle = theme.axis;
        ctx.lineWidth = 1;
        root.links().forEach(({ source, target }) => {
            const s = pos(source);
            const t = pos(target);
            const mx = (s.x + t.x) / 2;
            ctx.beginPath();
            ctx.moveTo(s.x, s.y);
            ctx.bezierCurveTo(mx, s.y, mx, t.y, t.x, t.y);
            ctx.stroke();
        });
        const dots = {};
        const labels = {};
        root.descendants().forEach(node => {
            const p = pos(node);
            dots[node.id] = { x: p.x, y: p.y, r: 4 };
            drawDot(ctx, p.x, p.y, 4, node.children ? theme.grey : theme.series[0]);
            labels[node.id] = node.children
                ? drawText(ctx, node.data.name, p.x - 8, p.y - 6, {
                      size: 11,
                      weight: 600,
                      color: theme.text,
                      align: 'right'
                  })
                : drawText(ctx, node.data.name, p.x + 8, p.y + 4, { size: 10, color: theme.text });
        });

        // #region structure
        const structure = dataNavigator.structure({
            data: flare,
            idKey: 'id',
            hierarchy: {
                parentKey: 'parent',
                // 'across' links every node at the same depth, even across branches
                levelNavigation: 'across',
                extents: 'terminal',
                // the tree grows to the right, so Left and Right move between parent and child
                navigationRules: {
                    sibling_sibling: ['up', 'down'],
                    parent_child: ['left', 'right']
                }
            }
        });
        // #endregion structure

        // #region labels
        flare.forEach(d => {
            const node = structure.nodes[d.id];
            node.semantics = {
                label: d.size
                    ? `${d.size.toLocaleString('en-US')} bytes, ${d.name}`
                    : `${d.name}. ${node.childCount} items, level ${node.depth + 1}.`
            };
        });
        // #endregion labels

        // #region focus
        const byId = {};
        root.descendants().forEach(node => (byId[node.id] = node));
        flare.forEach(d => {
            const node = byId[d.id];
            if (node.children) {
                const branch = node.descendants().map(k => dots[k.id]);
                const box = unionBox(branch.map(c => ({ x: c.x - 12, y: c.y - 12, width: 24, height: 24 })));
                structure.nodes[d.id].spatialProperties = spatial(box, convexHullOfCircles(branch, 6));
            } else {
                const c = dots[d.id];
                structure.nodes[d.id].spatialProperties = rectSpatial(
                    unionBox({ x: c.x - 4, y: c.y - 4, width: 8, height: 8 }, labels[d.id]),
                    3
                );
            }
        });
        // #endregion focus

        return { structure };
    }
};
