import * as d3 from 'd3';
import {
    boundingRectPath,
    unionOfRectPaths,
    convexHullOfRects,
    convexHullOfCircles,
    offsetLinePath
} from 'data-navigator';

const W = 320;
const H = 200;
const M = { top: 16, right: 16, bottom: 28, left: 16 };

const figure = (host, alt) =>
    d3
        .select(host)
        .append('svg')
        .attr('class', 'fi-svg')
        .attr('viewBox', `0 0 ${W} ${H}`)
        .attr('role', 'img')
        .attr('aria-label', alt);

const rects = (svg, list, color = i => i) =>
    svg
        .append('g')
        .selectAll('rect')
        .data(list)
        .join('rect')
        .attr('class', (d, i) => `fi-mark fi-c${color(d, i)}`)
        .attr('x', d => d.x)
        .attr('y', d => d.y)
        .attr('width', d => d.width)
        .attr('height', d => d.height);

const baseline = svg =>
    svg
        .append('line')
        .attr('class', 'fi-axis')
        .attr('x1', M.left)
        .attr('x2', W - M.right)
        .attr('y1', H - M.bottom)
        .attr('y2', H - M.bottom);

const indicator = (svg, path) => {
    svg.append('path').attr('class', 'fi-halo').attr('d', path);
    svg.append('path').attr('class', 'fi-indicator').attr('d', path);
};

const bandBars = (values, { inner = 0.3 } = {}) => {
    const x = d3.scaleBand(d3.range(values.length), [M.left, W - M.right]).padding(inner);
    const y = d3.scaleLinear([0, d3.max(values)], [H - M.bottom, M.top]);
    return values.map((v, i) => ({ x: x(i), y: y(v), width: x.bandwidth(), height: y(0) - y(v) }));
};

const stackedColumns = () => {
    const columns = [
        [50, 20, 15, 10],
        [55, 18, 12, 10],
        [60, 15, 12, 8]
    ];
    const x = d3.scaleBand(d3.range(columns.length), [M.left, W - M.right]).padding(0.35);
    const y = d3.scaleLinear([0, 100], [H - M.bottom, M.top]);
    return columns.flatMap((values, c) => {
        let total = 0;
        return values.map((v, s) => {
            const rect = { x: x(c), y: y(total + v), width: x.bandwidth(), height: y(total) - y(total + v), c, s };
            total += v;
            return rect;
        });
    });
};

export const figures = {
    bar(host) {
        const bars = bandBars([4, 7, 9, 5, 6]);
        const svg = figure(host, 'Bar chart of five bars. The middle bar has a box drawn just outside its edges.');
        rects(svg, bars, () => 0);
        baseline(svg);
        // #region bar
        const path = boundingRectPath([bars[2]], 3);
        // #endregion bar
        indicator(svg, path);
    },

    column(host) {
        const segments = stackedColumns();
        const svg = figure(
            host,
            'Stacked bar chart with three columns. The first column, all four segments, has one box around it.'
        );
        rects(svg, segments, d => d.s);
        baseline(svg);
        // #region column
        const column = segments.filter(d => d.c === 0);
        const path = boundingRectPath(column, 4);
        // #endregion column
        indicator(svg, path);
    },

    series(host) {
        const segments = stackedColumns();
        const svg = figure(
            host,
            'Stacked bar chart with three columns. The bottom segment of each column has its own outline.'
        );
        rects(svg, segments, d => d.s);
        baseline(svg);
        // #region series
        const series = segments.filter(d => d.s === 0);
        const path = unionOfRectPaths(series, 3);
        // #endregion series
        indicator(svg, path);
    },

    cluster(host) {
        const bars = bandBars([3, 8, 5, 9, 4, 7, 6, 2, 5], { inner: 0.15 }).map((b, i) => ({
            ...b,
            group: Math.floor(i / 3),
            x: b.x + Math.floor(i / 3) * 6 - 6
        }));
        const svg = figure(
            host,
            'Clustered bar chart with three groups of three bars. The middle group has an outline that follows the tops of its bars.'
        );
        rects(svg, bars, (d, i) => i % 3);
        baseline(svg);
        // #region cluster
        const cluster = bars.filter(d => d.group === 1);
        const path = convexHullOfRects(cluster, 4);
        // #endregion cluster
        indicator(svg, path);
    },

    scatter(host) {
        const random = d3.randomNormal.source(d3.randomLcg(7));
        const groups = [
            { cx: 90, cy: 120, color: 0 },
            { cx: 210, cy: 70, color: 1 }
        ];
        const points = groups.flatMap((g, group) => {
            const rx = random(g.cx, 22);
            const ry = random(g.cy, 18);
            return d3.range(10).map(() => ({ x: rx(), y: ry(), r: 5, group, color: g.color }));
        });
        const svg = figure(
            host,
            'Scatterplot with two groups of points. The lower left group has an outline wrapped around all of its points.'
        );
        svg.append('g')
            .selectAll('circle')
            .data(points)
            .join('circle')
            .attr('class', d => `fi-mark fi-c${d.color}`)
            .attr('cx', d => d.x)
            .attr('cy', d => d.y)
            .attr('r', d => d.r);
        // #region scatter
        const group = points.filter(d => d.group === 0);
        const path = convexHullOfCircles(group, 4);
        // #endregion scatter
        indicator(svg, path);
    },

    line(host) {
        const x = d3.scalePoint(d3.range(7), [M.left + 8, W - M.right - 8]);
        const y = d3.scaleLinear([0, 10], [H - M.bottom, M.top]);
        const lines = [
            [2, 4, 3, 6, 5, 8, 7],
            [6, 5, 7, 4, 6, 3, 4]
        ].map(values => values.map((v, i) => ({ x: x(i), y: y(v) })));
        const svg = figure(host, 'Line chart with two lines. The rising line has a band drawn around its full length.');
        svg.append('g')
            .selectAll('path')
            .data(lines)
            .join('path')
            .attr('class', (d, i) => `fi-line fi-s${i}`)
            .attr(
                'd',
                d3.line(
                    d => d.x,
                    d => d.y
                )
            );
        baseline(svg);
        // #region line
        const path = offsetLinePath(lines[0], 7);
        // #endregion line
        indicator(svg, path);
    },

    legend(host) {
        const names = ['Chrome', 'Firefox', 'Safari', 'Other'];
        const svg = figure(host, 'Legend with four colored swatches. The whole legend has one box around it.');
        const legend = svg.append('g');
        names.forEach((name, i) => {
            const y = 56 + i * 24;
            legend
                .append('rect')
                .attr('class', `fi-mark fi-c${i}`)
                .attr('x', 110)
                .attr('y', y)
                .attr('width', 14)
                .attr('height', 14)
                .attr('rx', 2);
            legend
                .append('text')
                .attr('class', 'fi-text')
                .attr('x', 132)
                .attr('y', y + 12)
                .text(name);
        });
        // #region legend
        const box = legend.node().getBBox();
        const path = boundingRectPath([box], 6);
        // #endregion legend
        indicator(svg, path);
    }
};

export const drawFigures = root =>
    Object.entries(figures).forEach(([id, draw]) => {
        const host = root.querySelector(`#fi-${id}`);
        if (host && !host.firstChild) draw(host);
    });
