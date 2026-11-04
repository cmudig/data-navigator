// Canvas drawing helpers for the pattern examples.
// Every helper that draws text returns the bounding box of what it drew,
// so title, axis, and legend nodes can get real focus indicators.
import { boundingRectPath } from 'data-navigator';

const FONT = 'Inter, ui-sans-serif, system-ui, -apple-system, sans-serif';

// Up to 5 categorical slots, each a light fill with an outline in the same hue.
// Every outline passes 3:1 against the surface and its own fill.
// grey and accent highlight one category when the rest can't be labeled directly.
const THEMES = {
    light: {
        surface: '#fcfcfb',
        text: '#0b0b0b',
        muted: '#52514e',
        grid: '#e6e5e0',
        axis: '#a3a29b',
        series: [
            { fill: '#f4f8fd', stroke: '#2a78d6' },
            { fill: '#fdf4f8', stroke: '#e46293' },
            { fill: '#f4fdfa', stroke: '#1aa674' },
            { fill: '#fffbf2', stroke: '#c48500' },
            { fill: '#fef6f3', stroke: '#eb6834' }
        ],
        grey: { fill: '#f5f5f5', stroke: '#767676' },
        accent: { fill: '#2a78d6', stroke: '#2a78d6' },
        sequential: ['#cde2fb', '#9ec5f4', '#3987e5', '#184f95', '#0d366b']
    },
    dark: {
        surface: '#1a1a19',
        text: '#f0efec',
        muted: '#c3c2b7',
        grid: '#2e2e2c',
        axis: '#6b6a64',
        series: [
            { fill: '#134c90', stroke: '#5c9cea' },
            { fill: '#832044', stroke: '#dc7097' },
            { fill: '#116a4b', stroke: '#1fc78d' },
            { fill: '#a36c00', stroke: '#ffcd6b' },
            { fill: '#8b3918', stroke: '#e48a66' }
        ],
        grey: { fill: '#2e2e2c', stroke: '#8c8c88' },
        accent: { fill: '#3987e5', stroke: '#3987e5' },
        sequential: ['#0d366b', '#104281', '#1c5cab', '#5598e7', '#86b6ef']
    }
};

export const getTheme = () => {
    const dark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
    return { dark, ...(dark ? THEMES.dark : THEMES.light) };
};

// Creates a crisp canvas. The canvas is one image to assistive tech, described by its alt text.
export const createCanvas = (host, { width, height, alt }) => {
    const canvas = document.createElement('canvas');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    canvas.style.display = 'block';
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', alt);
    host.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    const theme = getTheme();
    ctx.fillStyle = theme.surface;
    ctx.fillRect(0, 0, width, height);
    return { canvas, ctx, width, height, theme };
};

// ── Boxes and focus paths ──────────────────────────────────────────────────

export const unionBox = (...boxes) => {
    const list = boxes.flat().filter(Boolean);
    const x0 = Math.min(...list.map(b => b.x));
    const y0 = Math.min(...list.map(b => b.y));
    const x1 = Math.max(...list.map(b => b.x + b.width));
    const y1 = Math.max(...list.map(b => b.y + b.height));
    return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
};

export const pointsBox = points => {
    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
};

// spatialProperties for a node: the element covers the box, the path draws the indicator.
export const spatial = (box, path) => ({
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
    path: path || boundingRectPath([box], 0)
});

export const rectSpatial = (box, pad = 3) => {
    const padded = { x: box.x - pad, y: box.y - pad, width: box.width + pad * 2, height: box.height + pad * 2 };
    return spatial(padded, boundingRectPath([box], pad));
};

export const circlePath = (cx, cy, r) => `M${cx - r},${cy}a${r},${r} 0 1,0 ${r * 2},0a${r},${r} 0 1,0 ${-r * 2},0Z`;

export const circleSpatial = (cx, cy, r, pad = 3) => {
    const R = r + pad;
    return spatial({ x: cx - R, y: cy - R, width: R * 2, height: R * 2 }, circlePath(cx, cy, R));
};

// A pie slice as a polygon in chart coordinates (angles in radians, 0 at 12 o'clock, clockwise).
export const arcSpatial = (cx, cy, r0, r1, a0, a1, pad = 3) => {
    const pts = [];
    const steps = Math.max(8, Math.ceil(((a1 - a0) / Math.PI) * 24));
    const at = (r, a) => ({ x: cx + r * Math.sin(a), y: cy - r * Math.cos(a) });
    for (let i = 0; i <= steps; i++) pts.push(at(r1 + pad, a0 + ((a1 - a0) * i) / steps));
    if (r0 > 0) {
        for (let i = steps; i >= 0; i--) pts.push(at(Math.max(0, r0 - pad), a0 + ((a1 - a0) * i) / steps));
    } else {
        pts.push({ x: cx, y: cy });
    }
    const path = 'M' + pts.map(p => `${p.x},${p.y}`).join('L') + 'Z';
    return spatial(pointsBox(pts), path);
};

// ── Text ──────────────────────────────────────────────────────────────────

export const drawText = (
    ctx,
    str,
    x,
    y,
    { size = 12, weight = 400, color, align = 'left', baseline = 'alphabetic' } = {}
) => {
    ctx.font = `${weight} ${size}px ${FONT}`;
    ctx.fillStyle = color || getTheme().text;
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    ctx.fillText(str, x, y);
    const m = ctx.measureText(str);
    const left = x - m.actualBoundingBoxLeft;
    const top = y - m.actualBoundingBoxAscent;
    return {
        x: left,
        y: top,
        width: m.actualBoundingBoxLeft + m.actualBoundingBoxRight,
        height: m.actualBoundingBoxAscent + m.actualBoundingBoxDescent
    };
};

export const measureText = (ctx, str, { size = 12, weight = 400 } = {}) => {
    ctx.font = `${weight} ${size}px ${FONT}`;
    return ctx.measureText(str).width;
};

// Title and optional subtitle, top left. Returns { title, subtitle } boxes.
export const drawTitle = (ctx, { title, subtitle, x = 16, y = 24 }) => {
    const t = getTheme();
    const titleBox = drawText(ctx, title, x, y, { size: 16, weight: 600, color: t.text });
    const subtitleBox = subtitle ? drawText(ctx, subtitle, x, y + 20, { size: 12, color: t.muted }) : null;
    return { title: titleBox, subtitle: subtitleBox };
};

// ── Axes ──────────────────────────────────────────────────────────────────

const tickValues = (scale, count) =>
    scale.bandwidth ? scale.domain() : scale.ticks ? scale.ticks(count) : scale.domain();
const tickPos = (scale, v) => (scale.bandwidth ? scale(v) + scale.bandwidth() / 2 : scale(v));

// Bottom axis. Returns the box around the baseline, tick labels, and axis label.
export const axisBottom = (ctx, scale, { y, ticks = 5, format = v => v, label, baseline = true }) => {
    const t = getTheme();
    const [r0, r1] = scale.range();
    const boxes = [];
    if (baseline) {
        ctx.strokeStyle = t.axis;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(Math.min(r0, r1), y + 0.5);
        ctx.lineTo(Math.max(r0, r1), y + 0.5);
        ctx.stroke();
        boxes.push({ x: Math.min(r0, r1), y, width: Math.abs(r1 - r0), height: 1 });
    }
    // band labels that do not fit their slot are shortened
    let fmt = format;
    if (scale.bandwidth) {
        ctx.font = `400 11px ${FONT}`;
        const room = scale.step() - 4;
        if (scale.domain().some(v => ctx.measureText(String(format(v))).width > room)) {
            fmt = v => String(format(v)).slice(0, 3);
        }
    }
    tickValues(scale, ticks).forEach(v => {
        boxes.push(
            drawText(ctx, String(fmt(v)), tickPos(scale, v), y + 16, { size: 11, color: t.muted, align: 'center' })
        );
    });
    if (label) {
        boxes.push(
            drawText(ctx, label, (r0 + r1) / 2, y + 36, { size: 12, weight: 500, color: t.muted, align: 'center' })
        );
    }
    return unionBox(boxes);
};

// Left axis with light horizontal gridlines. Returns the box around tick labels and axis label.
export const axisLeft = (ctx, scale, { x, ticks = 5, format = v => v, label, grid }) => {
    const t = getTheme();
    const boxes = [];
    tickValues(scale, ticks).forEach(v => {
        const py = tickPos(scale, v);
        if (grid && !scale.bandwidth) {
            ctx.strokeStyle = t.grid;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(grid[0], Math.round(py) + 0.5);
            ctx.lineTo(grid[1], Math.round(py) + 0.5);
            ctx.stroke();
        }
        boxes.push(drawText(ctx, String(format(v)), x - 6, py + 4, { size: 11, color: t.muted, align: 'right' }));
    });
    if (label) {
        const [r0, r1] = scale.range();
        const cy = (r0 + r1) / 2;
        const lx = Math.min(...boxes.map(b => b.x)) - 12;
        ctx.save();
        ctx.translate(lx, cy);
        ctx.rotate(-Math.PI / 2);
        const b = drawText(ctx, label, 0, 0, { size: 12, weight: 500, color: t.muted, align: 'center' });
        ctx.restore();
        boxes.push({ x: lx - b.height, y: cy - b.width / 2, width: b.height + 2, height: b.width });
    }
    return unionBox(boxes);
};

// ── Legends ───────────────────────────────────────────────────────────────

// Color legend in one row. Returns { box, items }.
export const legendSwatches = (ctx, items, { x, y, title, shape = 'square' }) => {
    const t = getTheme();
    const boxes = [];
    let cx = x;
    if (title) {
        const tb = drawText(ctx, title, cx, y + 4, { size: 11, weight: 600, color: t.muted });
        boxes.push(tb);
        cx = tb.x + tb.width + 10;
    }
    const itemBoxes = items.map(({ label, color }) => {
        if (shape === 'circle') {
            drawDot(ctx, cx + 5, y, 5, color);
        } else if (shape === 'line') {
            ctx.fillStyle = color.stroke;
            ctx.fillRect(cx, y - 1, 14, 2);
        } else {
            ctx.fillStyle = color.fill;
            ctx.strokeStyle = color.stroke;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(cx + 0.5, y - 4.5, 9, 9, 2);
            ctx.fill();
            ctx.stroke();
        }
        const swatchW = shape === 'line' ? 14 : 10;
        const lb = drawText(ctx, label, cx + swatchW + 5, y + 4, { size: 11, color: t.text });
        const box = unionBox({ x: cx, y: y - 5, width: swatchW, height: 10 }, lb);
        cx = lb.x + lb.width + 14;
        boxes.push(box);
        return box;
    });
    return { box: unionBox(boxes), items: itemBoxes };
};

// Size legend: circles for a few values. Returns { box }.
export const legendSizes = (ctx, values, radius, { x, y, title, format = v => v }) => {
    const t = getTheme();
    const boxes = [];
    let cx = x;
    if (title) {
        const tb = drawText(ctx, title, cx, y + 4, { size: 11, weight: 600, color: t.muted });
        boxes.push(tb);
        cx = tb.x + tb.width + 10;
    }
    values.forEach(v => {
        const r = radius(v);
        ctx.strokeStyle = t.muted;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx + r, y, r, 0, Math.PI * 2);
        ctx.stroke();
        boxes.push({ x: cx, y: y - r, width: r * 2, height: r * 2 });
        const lb = drawText(ctx, String(format(v)), cx + r * 2 + 4, y + 4, { size: 11, color: t.text });
        boxes.push(lb);
        cx = lb.x + lb.width + 12;
    });
    return { box: unionBox(boxes) };
};

// ── Marks ─────────────────────────────────────────────────────────────────

// Bar with a 4px rounded data end and a 1px outline. Direction is where the data end points.
export const drawBar = (ctx, box, color, end = 'top') => {
    const x = box.x + 0.5;
    const y = box.y + 0.5;
    const width = Math.max(0, box.width - 1);
    const height = Math.max(0, box.height - 1);
    const r = Math.min(4, width / 2, height / 2);
    const radii =
        end === 'top'
            ? [r, r, 0, 0]
            : end === 'right'
              ? [0, r, r, 0]
              : end === 'bottom'
                ? [0, 0, r, r]
                : end === 'left'
                  ? [r, 0, 0, r]
                  : [0, 0, 0, 0];
    ctx.fillStyle = color.fill;
    ctx.strokeStyle = color.stroke;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radii);
    ctx.fill();
    ctx.stroke();
};

export const drawDot = (ctx, cx, cy, r, color) => {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = color.fill;
    ctx.fill();
    ctx.lineWidth = 1.25;
    ctx.strokeStyle = color.stroke;
    ctx.stroke();
};

// Lines have no fill, so they use the outline color.
export const drawLine = (ctx, points, color, width = 2) => {
    ctx.strokeStyle = color.stroke;
    ctx.lineWidth = width;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();
};

// Plot width that fits the host, so phones get a narrower chart instead of a scroll bar.
export const fitWidth = (host, max = 640) => Math.max(280, Math.min(max, host.clientWidth || max));
