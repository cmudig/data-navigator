// Each adapter returns measure(): call it after the chart renders to get row => geometry.
// Geometry is { x, y, width, height } or { x, y, r }, in pixels relative to the navigation container.

const relative = (container, el) => {
    const a = container.getBoundingClientRect();
    const b = el.getBoundingClientRect();
    return { x: b.left - a.left, y: b.top - a.top, width: b.width, height: b.height };
};

// Any SVG library that binds data (d3, Observable Plot, Recharts with data-* props, LayerCake).
export const dom = (root, options) => () => {
    const {
        container = root,
        selector = '[data-dn-key]',
        key,
        keyOf = el => el.__data__ ?? el.dataset.dnKey,
        circles = 'circle'
    } = options || {};
    const index = new Map();
    root.querySelectorAll(selector).forEach(el => {
        const d = keyOf(el);
        if (d === undefined) return;
        const box = relative(container, el);
        const k = typeof d === 'object' && key ? key(d) : String(d);
        index.set(
            k,
            el.matches(circles) ? { x: box.x + box.width / 2, y: box.y + box.height / 2, r: box.width / 2 } : box
        );
    });
    return row => index.get(key ? key(row) : String(row.id)) ?? null;
};

// Your own d3-compatible scales: works for canvas, ECharts, Chart.js or anything that exposes value-to-pixel functions.
export const scales = options => () => row => {
    const { x, y, xKey, yKey, mark = 'bar', r = 4, y0Key, x0Key, offset = [0, 0] } = options;
    const [ox, oy] = offset;
    const vx = x(row[xKey]);
    const vy = y(row[yKey]);
    if (vx === undefined || vy === undefined || isNaN(vx) || isNaN(vy)) return null;
    if (mark === 'point') return { x: ox + vx + (x.bandwidth?.() ?? 0) / 2, y: oy + vy, r };
    if (mark === 'hbar') {
        const base = x(x0Key ? row[x0Key] : 0);
        const y1 = y(row[yKey]);
        return {
            x: ox + Math.min(base, x(row[xKey])),
            y: oy + y1,
            width: Math.abs(x(row[xKey]) - base),
            height: y.bandwidth()
        };
    }
    const base = y(y0Key ? row[y0Key] : 0);
    return { x: ox + vx, y: oy + Math.min(vy, base), width: x.bandwidth(), height: Math.abs(base - vy) };
};

// Vega and Vega-Lite (vega 6, vega-embed 7): reads exact mark bounds from the public scenegraph.
export const vega = (view, options) => () => {
    const { key, offset = [0, 0], r = 6 } = options;
    const [ox, oy] = view.origin();
    const pad = view.padding();
    const index = new Map();
    const rank = { symbol: 3, rect: 3, arc: 3, line: 1, area: 1 };
    const walk = (mark, x, y) => {
        for (const item of mark.items || []) {
            if (mark.marktype === 'group') {
                (item.items || []).forEach(m => walk(m, x + (item.x || 0), y + (item.y || 0)));
                continue;
            }
            if (mark.role !== 'mark' || !item.datum || !(mark.marktype in rank)) continue;
            const k = key(item.datum);
            const prev = index.get(k);
            if (prev && prev.rank > rank[mark.marktype]) continue;
            const b = item.bounds;
            const g =
                mark.marktype === 'line' || mark.marktype === 'area'
                    ? { x: x + item.x, y: y + item.y, r }
                    : mark.marktype === 'symbol'
                      ? { x: x + item.x, y: y + item.y, r: Math.sqrt((item.size ?? 64) / Math.PI) }
                      : { x: x + b.x1, y: y + b.y1, width: b.x2 - b.x1, height: b.y2 - b.y1 };
            index.set(k, { rank: rank[mark.marktype], g });
        }
    };
    walk(view.scenegraph().root, ox + (pad.left ?? 0) + offset[0], oy + (pad.top ?? 0) + offset[1]);
    return row => index.get(key(row))?.g ?? null;
};

// BokehJS 3.x: maps glyph fields through the plot frame's scales. plotView = Bokeh.index[plot.id].
export const bokeh = (plotView, options) => () => {
    const { container, x, y, width, top, bottom = 0, r = 5 } = options;
    const f = plotView.frame;
    const at = (range, v) => (typeof v === 'string' && range.synthetic ? range.synthetic(v) : v);
    const sx = v => f.x_scale.compute(at(f.x_range, v));
    const sy = v => f.y_scale.compute(at(f.y_range, v));
    const canvas = plotView.canvas_view?.el ?? plotView.el;
    const shift = container ? relative(container, canvas) : { x: 0, y: 0 };
    return row => {
        if (width) {
            const cx = at(f.x_range, row[x]);
            const left = f.x_scale.compute(cx - width / 2);
            const right = f.x_scale.compute(cx + width / 2);
            const t = sy(row[top ?? y]);
            const b = sy(typeof bottom === 'string' ? row[bottom] : bottom);
            return {
                x: shift.x + Math.min(left, right),
                y: shift.y + Math.min(t, b),
                width: Math.abs(right - left),
                height: Math.abs(b - t)
            };
        }
        return { x: shift.x + sx(row[x]), y: shift.y + sy(row[y]), r };
    };
};
