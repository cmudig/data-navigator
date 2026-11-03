// Chart drawers shared by the pattern examples. Each one draws on a canvas and returns
// the geometry of every mark plus boxes for the title, axes, and legends.
import { scaleBand, scaleLinear, scalePoint, scaleSqrt } from 'd3-scale';
import {
    axisBottom,
    axisLeft,
    drawBar,
    drawDot,
    drawLine,
    drawText,
    drawTitle,
    legendSizes,
    legendSwatches,
    unionBox
} from './canvas.js';

// Title, subtitle, and legend rows above the plot. Returns boxes and where the plot can start.
const header = (ctx, theme, { title, subtitle, legends = [], width }) => {
    const boxes = {};
    let y = 12;
    if (title) {
        const t = drawTitle(ctx, { title, subtitle, x: 16, y: 26 });
        boxes.title = t.title;
        boxes.subtitle = t.subtitle;
        const last = t.subtitle || t.title;
        y = last.y + last.height + 10;
    }
    boxes.legends = legends.map(l => {
        const row = y + 10;
        y += 24;
        if (l.sizes) {
            return legendSizes(ctx, l.sizes.values, l.sizes.radius, {
                x: 16,
                y: row + (l.sizes.pad || 0),
                title: l.title,
                format: l.sizes.format
            });
        }
        return legendSwatches(ctx, l.items, { x: 16, y: row, title: l.title, shape: l.shape });
    });
    if (legends.some(l => l.sizes)) y += 10;
    return { boxes, top: y + 8 };
};

const plotBox = (m, width, height) => ({
    x: m.left,
    y: m.top,
    width: width - m.left - m.right,
    height: height - m.top - m.bottom
});

export const barChart = (ctx, theme, o) => {
    const { boxes, top } = header(ctx, theme, o);
    const m = { top, right: 16, bottom: 48, left: 56 };
    const x = scaleBand(
        o.data.map(d => d[o.xKey]),
        [m.left, o.width - m.right]
    ).padding(0.25);
    const y = scaleLinear([0, o.yMax], [o.height - m.bottom, m.top]);
    boxes.yAxis = axisLeft(ctx, y, {
        x: m.left,
        ticks: o.yTicks || 5,
        label: o.yLabel,
        grid: [m.left, o.width - m.right]
    });
    boxes.xAxis = axisBottom(ctx, x, { y: o.height - m.bottom, label: o.xLabel });
    const bars = {};
    o.data.forEach(d => {
        bars[d.id] = { x: x(d[o.xKey]), y: y(d[o.yKey]), width: x.bandwidth(), height: y(0) - y(d[o.yKey]) };
        drawBar(ctx, bars[d.id], theme.series[0], 'top');
    });
    boxes.plot = plotBox(m, o.width, o.height);
    return { bars, boxes, x, y };
};

export const multiLine = (ctx, theme, o) => {
    const colorOf = s => theme.series[o.series.indexOf(s)];
    const { boxes, top } = header(ctx, theme, {
        ...o,
        legends:
            o.legend === false
                ? []
                : [{ title: o.legendTitle, items: o.series.map(s => ({ label: s, color: colorOf(s) })), shape: 'line' }]
    });
    const m = { top, right: 72, bottom: 48, left: 56 };
    const x = scalePoint(o.xDomain, [m.left + 8, o.width - m.right]);
    const y = scaleLinear(o.yDomain, [o.height - m.bottom, m.top]);
    boxes.yAxis = axisLeft(ctx, y, { x: m.left, ticks: 5, label: o.yLabel, grid: [m.left, o.width - m.right] });
    boxes.xAxis = axisBottom(ctx, x, {
        y: o.height - m.bottom,
        label: o.xLabel,
        format: v => (o.width < 480 ? String(v)[0] : v)
    });
    const points = {};
    const lines = {};
    o.series.forEach(s => {
        const rows = o.data.filter(d => d[o.seriesKey] === s);
        lines[s] = rows.map(d => (points[d.id] = { x: x(d[o.xKey]), y: y(d[o.yKey]) }));
        drawLine(ctx, lines[s], colorOf(s));
        lines[s].forEach(p => drawDot(ctx, p.x, p.y, 3, colorOf(s)));
        const end = lines[s][lines[s].length - 1];
        drawText(ctx, s, end.x + 8, end.y + 4, { size: 11, color: theme.text });
    });
    boxes.plot = plotBox(m, o.width, o.height);
    return { points, lines, boxes, x, y, colorOf };
};

// Stacks are listed bottom to top.
export const stackedBars = (ctx, theme, o) => {
    const colorOf = s => theme.series[o.stacks.indexOf(s)];
    const { boxes, top } = header(ctx, theme, {
        ...o,
        legends: [{ title: o.legendTitle, items: [...o.stacks].reverse().map(s => ({ label: s, color: colorOf(s) })) }]
    });
    const m = { top, right: 16, bottom: 48, left: 56 };
    const x = scaleBand(o.xDomain, [m.left, o.width - m.right]).padding(0.3);
    const y = scaleLinear([0, o.yMax], [o.height - m.bottom, m.top]);
    boxes.yAxis = axisLeft(ctx, y, { x: m.left, ticks: 5, label: o.yLabel, grid: [m.left, o.width - m.right] });
    boxes.xAxis = axisBottom(ctx, x, { y: o.height - m.bottom, label: o.xLabel });
    const bars = {};
    o.xDomain.forEach(xv => {
        let base = 0;
        o.stacks.forEach((s, i) => {
            const d = o.data.find(r => r[o.xKey] === xv && r[o.stackKey] === s);
            if (!d) return;
            const y0 = y(base);
            const y1 = y(base + d[o.valueKey]);
            base += d[o.valueKey];
            // 2px surface gap between segments
            const rect = { x: x(xv), y: y1, width: x.bandwidth(), height: Math.max(1, y0 - y1 - (i ? 2 : 0)) };
            bars[d.id] = rect;
            drawBar(ctx, rect, colorOf(s), i === o.stacks.length - 1 ? 'top' : 'none');
        });
    });
    boxes.plot = plotBox(m, o.width, o.height);
    return { bars, boxes, x, y, colorOf };
};

export const clusteredBars = (ctx, theme, o) => {
    const colorOf = s => theme.series[o.groups.indexOf(s)];
    const { boxes, top } = header(ctx, theme, {
        ...o,
        legends: [{ title: o.legendTitle, items: o.groups.map(s => ({ label: s, color: colorOf(s) })) }]
    });
    const m = { top, right: 16, bottom: 48, left: 56 };
    const x = scaleBand(o.xDomain, [m.left, o.width - m.right]).padding(0.2);
    const inner = scaleBand(o.groups, [0, x.bandwidth()]).padding(0.08);
    const y = scaleLinear([0, o.yMax], [o.height - m.bottom, m.top]);
    boxes.yAxis = axisLeft(ctx, y, { x: m.left, ticks: 5, label: o.yLabel, grid: [m.left, o.width - m.right] });
    boxes.xAxis = axisBottom(ctx, x, { y: o.height - m.bottom, label: o.xLabel });
    const bars = {};
    o.data.forEach(d => {
        const rect = {
            x: x(d[o.xKey]) + inner(d[o.groupKey]),
            y: y(d[o.valueKey]),
            width: inner.bandwidth(),
            height: y(0) - y(d[o.valueKey])
        };
        bars[d.id] = rect;
        drawBar(ctx, rect, colorOf(d[o.groupKey]), 'top');
    });
    boxes.plot = plotBox(m, o.width, o.height);
    return { bars, boxes, x, y, colorOf };
};

// Scatter or bubble chart. Optional color (categorical) and size (numerical) encodings.
export const scatter = (ctx, theme, o) => {
    const colorOf = o.colorKey ? v => theme.series[o.colors.indexOf(v)] : () => theme.series[0];
    const radius = o.sizeKey ? scaleSqrt(o.sizeDomain, o.sizeRange || [3, 12]) : () => o.r || 5;
    const legends = [];
    if (o.colorKey)
        legends.push({
            title: o.colorTitle,
            items: o.colors.map(c => ({ label: c, color: colorOf(c) })),
            shape: 'circle'
        });
    if (o.sizeKey)
        legends.push({ title: o.sizeTitle, sizes: { values: o.sizeValues, radius, format: o.sizeFormat, pad: 4 } });
    const { boxes, top } = header(ctx, theme, { ...o, legends });
    const m = { top: top + (o.sizeKey ? 8 : 0), right: 20, bottom: 48, left: 56 };
    const x = scaleLinear(o.xDomain, [m.left, o.width - m.right]);
    const y = scaleLinear(o.yDomain, [o.height - m.bottom, m.top]);
    boxes.yAxis = axisLeft(ctx, y, { x: m.left, ticks: 5, label: o.yLabel, grid: [m.left, o.width - m.right] });
    boxes.xAxis = axisBottom(ctx, x, { y: o.height - m.bottom, ticks: 6, label: o.xLabel });
    if (boxes.legends[0] && o.colorKey) boxes.colorLegend = boxes.legends[0];
    if (o.sizeKey) boxes.sizeLegend = boxes.legends[o.colorKey ? 1 : 0];
    const dots = {};
    // big marks first so small ones stay visible, with a surface ring where marks overlap
    [...o.data]
        .sort((a, b) => (o.sizeKey ? b[o.sizeKey] - a[o.sizeKey] : 0))
        .forEach(d => {
            const dot = { x: x(d[o.xKey]), y: y(d[o.yKey]), r: radius(o.sizeKey ? d[o.sizeKey] : 0) };
            dots[d.id] = dot;
            ctx.globalAlpha = o.sizeKey ? 0.85 : 1;
            drawDot(ctx, dot.x, dot.y, dot.r, colorOf(d[o.colorKey]), theme.surface);
            ctx.globalAlpha = 1;
        });
    boxes.plot = plotBox(m, o.width, o.height);
    return { dots, boxes, x, y, colorOf, radius };
};

// A band across the plot for a numerical range, for x bins or y bins.
export const rangeStripe = (scale, [lo, hi], axis, plot) => {
    if (axis === 'x') {
        const x0 = scale(lo);
        return { x: x0, y: plot.y, width: scale(hi) - x0, height: plot.height };
    }
    const y0 = scale(hi);
    return { x: plot.x, y: y0, width: plot.width, height: scale(lo) - y0 };
};

export { unionBox };
