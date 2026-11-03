import dataNavigator, { unionOfRectPaths } from 'data-navigator';
import { createCanvas, rectSpatial, spatial, unionBox, fitWidth } from '../shared/canvas.js';
import { stackedBars } from '../shared/charts.js';
import { browsers } from '../data/browsers.js';

const years = ['2015', '2016', '2017'];
const stacks = ['Chrome', 'Firefox', 'Safari', 'Edge', 'Other']; // bottom to top
const alt =
    'Stacked bar chart of browser share from 2015 to 2017. Chrome holds most of each year, rising from 62 to 65 percent.';

export default {
    alt,
    focusNote:
        'A segment gets a box. A year outlines its whole column. A browser outlines its segments in every year. The Browser dimension outlines the legend, where browsers are named.',
    commandLabels: {
        left: 'previous year',
        right: 'next year',
        up: 'browser above',
        down: 'browser below',
        'drill-in': 'drill in',
        'drill-out': 'back to the chart',
        'to-year': 'up to the year',
        'to-browser': 'up to the browser'
    },
    build(host) {
        const width = fitWidth(host);
        const height = 360;
        const { ctx, theme } = createCanvas(host, { width, height, alt });
        const { bars, boxes } = stackedBars(ctx, theme, {
            data: browsers,
            xKey: 'year',
            stackKey: 'browser',
            valueKey: 'share',
            stacks,
            xDomain: years,
            yMax: 100,
            width,
            height,
            xLabel: 'Year',
            yLabel: 'Share (%)',
            legendTitle: 'Browser'
        });

        // #region structure
        const topToBottom = [...stacks].reverse();
        const firstRow = division => Object.values(division.values)[0];
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
                        navigationRules: { sibling_sibling: ['left', 'right'], parent_child: ['to-year', 'drill-in'] }
                    },
                    {
                        dimensionKey: 'browser',
                        nodeId: 'browsers',
                        type: 'categorical',
                        divisionOptions: { divisionNodeIds: (key, value) => `browser-${value.toLowerCase()}` },
                        // order browsers top to bottom, so Down moves down the stack
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
        stacks.forEach(s => {
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
        n.browsers.spatialProperties = rectSpatial(boxes.legends[0].box, 4);
        years.forEach(y => {
            const col = browsers.filter(d => d.year === y).map(d => bars[d.id]);
            n[`year-${y}`].spatialProperties = rectSpatial(unionBox(col), 4);
        });
        stacks.forEach(s => {
            const segs = browsers.filter(d => d.browser === s).map(d => bars[d.id]);
            n[`browser-${s.toLowerCase()}`].spatialProperties = spatial(unionBox(segs), unionOfRectPaths(segs, 3));
        });
        browsers.forEach(d => {
            n[d.id].spatialProperties = rectSpatial(bars[d.id], 2);
        });
        // #endregion focus

        return { structure };
    }
};
