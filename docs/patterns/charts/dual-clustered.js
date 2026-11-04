import dataNavigator, { unionOfRectPaths } from 'data-navigator';
import { createCanvas, rectSpatial, spatial, unionBox, fitWidth } from '../shared/canvas.js';
import { clusteredBars } from '../shared/charts.js';
import { browsers } from '../data/browsers.js';

const years = ['2015', '2016', '2017'];
const groups = ['Chrome', 'Firefox', 'Safari', 'Edge', 'Other']; // left to right in each cluster
const alt =
    'Clustered bar chart of browser share from 2015 to 2017. Chrome is far ahead every year. Edge stays at 4 percent.';

export default {
    alt,
    focusNote:
        'Same tree as the stacked bar, different shapes. A year outlines its cluster. A browser outlines its bar in every cluster. The Browser dimension outlines the browser names above the first cluster.',
    commandLabels: {
        left: 'browser to the left',
        right: 'browser to the right',
        backward: 'previous year',
        forward: 'next year',
        'drill-in': 'drill in',
        'drill-out': 'back to the chart',
        'to-year': 'up to the year',
        'to-browser': 'up to the browser'
    },
    build(host) {
        const width = fitWidth(host);
        const height = 360;
        const { ctx, theme } = createCanvas(host, { width, height, alt });
        const { bars, boxes } = clusteredBars(ctx, theme, {
            data: browsers,
            xKey: 'year',
            groupKey: 'browser',
            valueKey: 'share',
            groups,
            xDomain: years,
            yMax: 80,
            width,
            height,
            xLabel: 'Year',
            yLabel: 'Share (%)'
        });

        // #region structure
        const structure = dataNavigator.structure({
            data: browsers,
            idKey: 'id',
            dimensions: {
                parentOptions: { addLevel0: { id: 'chart', edges: [] } },
                values: [
                    {
                        dimensionKey: 'year',
                        nodeId: 'years',
                        type: 'categorical',
                        divisionOptions: { divisionNodeIds: (key, value) => `year-${value}` },
                        behavior: { extents: 'circular', childmostNavigation: 'across' },
                        // years are far apart in a clustered chart, so they get [ and ]
                        navigationRules: {
                            sibling_sibling: ['backward', 'forward'],
                            parent_child: ['to-year', 'drill-in']
                        }
                    },
                    {
                        dimensionKey: 'browser',
                        nodeId: 'browsers',
                        type: 'categorical',
                        divisionOptions: { divisionNodeIds: (key, value) => `browser-${value.toLowerCase()}` },
                        behavior: { extents: 'circular', childmostNavigation: 'across' },
                        // neighboring bars in a cluster are different browsers, so Left and Right
                        navigationRules: {
                            sibling_sibling: ['left', 'right'],
                            parent_child: ['to-browser', 'drill-in']
                        }
                    }
                ]
            },
            navigationRules: {
                left: { key: 'ArrowLeft', direction: 'source' },
                right: { key: 'ArrowRight', direction: 'target' },
                backward: { key: 'BracketLeft', direction: 'source' },
                forward: { key: 'BracketRight', direction: 'target' },
                'drill-in': { key: 'Enter', direction: 'target' },
                'drill-out': { key: 'Backspace', direction: 'source' },
                'to-year': { key: 'KeyW', direction: 'source' },
                'to-browser': { key: 'KeyJ', direction: 'source' }
            }
        });
        // #endregion structure

        // #region labels
        const n = structure.nodes;
        n.chart.semantics = { label: `${alt} Two groupings: year and browser.` };
        n.years.semantics = { label: 'Year. 3 years, 2015 to 2017.' };
        n.browsers.semantics = { label: 'Browser. 5 browsers, Chrome to Other.' };
        years.forEach(y => {
            const top = browsers.filter(d => d.year === y).sort((a, b) => b.share - a.share)[0];
            n[`year-${y}`].semantics = { label: `${y}. 5 browsers. ${top.browser} leads with ${top.share}%.` };
        });
        groups.forEach(s => {
            const rows = browsers.filter(d => d.browser === s);
            const lo = Math.min(...rows.map(d => d.share));
            const hi = Math.max(...rows.map(d => d.share));
            n[`browser-${s.toLowerCase()}`].semantics = {
                label: `${s}. 3 years, ${lo === hi ? `${lo}% each year` : `${lo}% to ${hi}%`}.`
            };
        });
        browsers.forEach(d => {
            n[d.id].semantics = { label: `${d.share}%, ${d.browser}, ${d.year}` };
        });
        // #endregion labels

        // #region focus
        const all = Object.values(bars);
        n.chart.spatialProperties = rectSpatial({ x: 6, y: 6, width: width - 12, height: height - 12 }, 0);
        n.years.spatialProperties = rectSpatial(unionBox(all, boxes.xAxis), 4);
        n.browsers.spatialProperties = rectSpatial(boxes.labels, 4);
        years.forEach(y => {
            const cluster = browsers.filter(d => d.year === y).map(d => bars[d.id]);
            n[`year-${y}`].spatialProperties = rectSpatial(unionBox(cluster), 4);
        });
        groups.forEach(s => {
            const set = browsers.filter(d => d.browser === s).map(d => bars[d.id]);
            n[`browser-${s.toLowerCase()}`].spatialProperties = spatial(unionBox(set), unionOfRectPaths(set, 3));
        });
        browsers.forEach(d => {
            n[d.id].spatialProperties = rectSpatial(bars[d.id], 2);
        });
        // #endregion focus

        return { structure };
    }
};
