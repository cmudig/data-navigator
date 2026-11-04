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
    measureText,
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

// Push labels apart so none overlap, keeping them between lo and hi.
const spread = (items, gap, lo, hi) => {
    const list = [...items].sort((a, b) => a.y - b.y);
    for (let i = 1; i < list.length; i++) list[i].y = Math.max(list[i].y, list[i - 1].y + gap);
    if (list.length && list[list.length - 1].y > hi) {
        list[list.length - 1].y = hi;
        for (let i = list.length - 2; i >= 0; i--) list[i].y = Math.min(list[i].y, list[i + 1].y - gap);
    }
    list.forEach(d => (d.y = Math.max(lo, d.y)));
    return list;
};

// Each line is named at its end. boxes.labels holds the names.
export const multiLine = (ctx, theme, o) => {
    const colorOf = s => theme.series[o.series.indexOf(s)];
    const { boxes, top } = header(ctx, theme, o);
    const labelW = Math.max(...o.series.map(s => measureText(ctx, s, { size: 11 })));
    const m = { top, right: labelW + 24, bottom: 48, left: 56 };
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
    const ends = [];
    o.series.forEach(s => {
        const rows = o.data.filter(d => d[o.seriesKey] === s);
        lines[s] = rows.map(d => (points[d.id] = { x: x(d[o.xKey]), y: y(d[o.yKey]) }));
        drawLine(ctx, lines[s], colorOf(s));
        lines[s].forEach(p => drawDot(ctx, p.x, p.y, 3, colorOf(s)));
        const end = lines[s][lines[s].length - 1];
        ends.push({ s, x: end.x + 8, y: end.y });
    });
    const labels = spread(ends, 14, m.top, o.height - m.bottom).map(l =>
        drawText(ctx, l.s, l.x, l.y + 4, { size: 11, color: theme.text })
    );
    boxes.labels = unionBox(labels);
    boxes.plot = plotBox(m, o.width, o.height);
    return { points, lines, boxes, x, y, colorOf };
};

// Stacks are listed bottom to top. Each stack is named beside the last column.
export const stackedBars = (ctx, theme, o) => {
    const colorOf = s => theme.series[o.stacks.indexOf(s)];
    const { boxes, top } = header(ctx, theme, o);
    const labelW = Math.max(...o.stacks.map(s => measureText(ctx, s, { size: 11 })));
    const m = { top, right: labelW + 24, bottom: 48, left: 56 };
    const x = scaleBand(o.xDomain, [m.left, o.width - m.right]).padding(0.3);
    const y = scaleLinear([0, o.yMax], [o.height - m.bottom, m.top]);
    boxes.yAxis = axisLeft(ctx, y, { x: m.left, ticks: 5, label: o.yLabel, grid: [m.left, o.width - m.right] });
    boxes.xAxis = axisBottom(ctx, x, { y: o.height - m.bottom, label: o.xLabel });
    const bars = {};
    const ends = [];
    const last = o.xDomain[o.xDomain.length - 1];
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
            if (xv === last) ends.push({ s, y: rect.y + rect.height / 2 });
        });
    });
    const lx = x(last) + x.bandwidth() + 8;
    const labels = spread(ends, 14, m.top, o.height - m.bottom).map(l =>
        drawText(ctx, l.s, lx, l.y + 4, { size: 11, color: theme.text })
    );
    boxes.labels = unionBox(labels);
    boxes.plot = plotBox(m, o.width, o.height);
    return { bars, boxes, x, y, colorOf };
};

// Bars in the first cluster are named above their tops, reading upward. Leave headroom in yMax.
export const clusteredBars = (ctx, theme, o) => {
    const colorOf = s => theme.series[o.groups.indexOf(s)];
    const { boxes, top } = header(ctx, theme, o);
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
    const labels = o.groups.map(g => {
        const d = o.data.find(r => r[o.xKey] === o.xDomain[0] && r[o.groupKey] === g);
        const b = bars[d.id];
        const lx = b.x + b.width / 2 + 4;
        const ly = b.y - 6;
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(-Math.PI / 2);
        const t = drawText(ctx, g, 0, 0, { size: 11, color: theme.text });
        ctx.restore();
        return { x: lx - t.height, y: ly - t.width, width: t.height, height: t.width };
    });
    boxes.labels = unionBox(labels);
    boxes.plot = plotBox(m, o.width, o.height);
    return { bars, boxes, x, y, colorOf };
};

// Scatter or bubble chart. Optional color (categorical) and size (numerical) encodings.
// Name groups with groupLabels ({ text, x, y, align } in data units) when they sit apart.
// When groups overlap, set highlight to one value: it is drawn in the accent color and the rest in grey.
export const scatter = (ctx, theme, o) => {
    const colorOf = o.highlight
        ? v => (v === o.highlight ? theme.accent : theme.grey)
        : o.colorKey
          ? v => theme.series[o.colors.indexOf(v)]
          : () => theme.series[0];
    const radius = o.sizeKey ? scaleSqrt(o.sizeDomain, o.sizeRange || [3, 12]) : () => o.r || 5;
    const legends = [];
    if (o.highlight)
        legends.push({
            title: o.colorTitle,
            items: [
                { label: o.highlight, color: theme.accent },
                { label: o.colors.filter(c => c !== o.highlight).join(' and '), color: theme.grey }
            ],
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
    if (o.highlight) boxes.colorLegend = boxes.legends[0];
    if (o.sizeKey) boxes.sizeLegend = boxes.legends[legends.length - 1];
    const dots = {};
    // the highlighted group last so it stays on top, and big marks before small ones
    const lift = d => (o.highlight && d[o.colorKey] === o.highlight ? 1 : 0);
    [...o.data]
        .sort((a, b) => lift(a) - lift(b) || (o.sizeKey ? b[o.sizeKey] - a[o.sizeKey] : 0))
        .forEach(d => {
            const dot = { x: x(d[o.xKey]), y: y(d[o.yKey]), r: radius(o.sizeKey ? d[o.sizeKey] : 0) };
            dots[d.id] = dot;
            drawDot(ctx, dot.x, dot.y, dot.r, colorOf(d[o.colorKey]));
        });
    if (o.groupLabels) {
        const labels = o.groupLabels.map(l =>
            drawText(ctx, l.text, x(l.x), y(l.y), { size: 11, color: theme.text, align: l.align || 'center' })
        );
        boxes.labels = unionBox(labels);
    }
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
