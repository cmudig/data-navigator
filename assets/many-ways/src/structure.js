import dataNavigator, { boundingRectPath, unionOfRectPaths } from 'data-navigator';
import { navigationRules, addAliases } from './commands.js';
import { years, stacks, alt } from './chart.js';

const box = (rect, pad) => ({
    x: rect.x - pad,
    y: rect.y - pad,
    width: rect.width + pad * 2,
    height: rect.height + pad * 2,
    path: boundingRectPath([rect], pad)
});

const union = rects => {
    const x = Math.min(...rects.map(r => r.x));
    const y = Math.min(...rects.map(r => r.y));
    const width = Math.max(...rects.map(r => r.x + r.width)) - x;
    const height = Math.max(...rects.map(r => r.y + r.height)) - y;
    return { x, y, width, height };
};

export function buildStructure(data, { bars, boxes }) {
    // #region structure
    const topToBottom = [...stacks].reverse();
    const firstRow = division => Object.values(division.values)[0];
    const structure = dataNavigator.structure({
        data,
        idKey: 'id',
        navigationRules,
        dimensions: {
            parentOptions: { addLevel0: { id: 'chart', edges: [] } },
            values: [
                {
                    dimensionKey: 'year',
                    nodeId: 'years',
                    type: 'categorical',
                    divisionOptions: { divisionNodeIds: (key, value) => `year-${value}` },
                    behavior: { extents: 'circular', childmostNavigation: 'across' },
                    navigationRules: { sibling_sibling: ['left', 'right'], parent_child: ['to-year', 'drill-in'] }
                },
                {
                    dimensionKey: 'browser',
                    nodeId: 'browsers',
                    type: 'categorical',
                    divisionOptions: { divisionNodeIds: (key, value) => `browser-${value.toLowerCase()}` },
                    operations: {
                        sortFunction: (a, b) =>
                            topToBottom.indexOf(firstRow(a).browser) - topToBottom.indexOf(firstRow(b).browser)
                    },
                    behavior: { extents: 'circular', childmostNavigation: 'across' },
                    navigationRules: { sibling_sibling: ['up', 'down'], parent_child: ['to-browser', 'drill-in'] }
                }
            ]
        }
    });
    addAliases(structure);
    // #endregion structure

    // #region labels
    const n = structure.nodes;
    n.chart.semantics = { label: `${alt} Two groupings: year and browser.` };
    n.years.semantics = { label: 'Year. 3 years, 2015 to 2017.' };
    n.browsers.semantics = { label: 'Browser. 5 browsers, Chrome to Other.' };
    years.forEach(y => {
        const top = data.filter(d => d.year === y).sort((a, b) => b.share - a.share)[0];
        n[`year-${y}`].semantics = { label: `${y}. 5 browsers. ${top.browser} leads with ${top.share}%.` };
    });
    stacks.forEach(s => {
        const shares = data.filter(d => d.browser === s).map(d => d.share);
        const lo = Math.min(...shares);
        const hi = Math.max(...shares);
        n[`browser-${s.toLowerCase()}`].semantics = {
            label: `${s}. 3 years, ${lo === hi ? `${lo}% each year` : `${lo}% to ${hi}%`}.`
        };
    });
    data.forEach(d => {
        n[d.id].semantics = { label: `${d.share}%, ${d.browser}, ${d.year}` };
    });
    // #endregion labels

    // #region focus
    const all = Object.values(bars);
    n.chart.spatialProperties = box(boxes.chart, 0);
    n.years.spatialProperties = box(union([...all, boxes.xAxis]), 4);
    n.browsers.spatialProperties = box(boxes.labels, 4);
    years.forEach(y => {
        n[`year-${y}`].spatialProperties = box(union(data.filter(d => d.year === y).map(d => bars[d.id])), 4);
    });
    stacks.forEach(s => {
        const segments = data.filter(d => d.browser === s).map(d => bars[d.id]);
        n[`browser-${s.toLowerCase()}`].spatialProperties = {
            ...union(segments),
            path: unionOfRectPaths(segments, 3)
        };
    });
    data.forEach(d => {
        n[d.id].spatialProperties = box(bars[d.id], 2);
    });
    // #endregion focus

    return structure;
}
