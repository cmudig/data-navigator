import dataNavigator, {
    boundingRectPath,
    convexHullOfCircles,
    convexHullOfRects,
    createValidId,
    offsetLinePath,
    unionOfRectPaths
} from 'data-navigator';

const GENERIC_KEYS = Object.fromEntries(
    [
        ['left', 'ArrowLeft', 'source'],
        ['right', 'ArrowRight', 'target'],
        ['up', 'ArrowUp', 'source'],
        ['down', 'ArrowDown', 'target'],
        ['backward', 'BracketLeft', 'source'],
        ['forward', 'BracketRight', 'target'],
        ['drill-out', 'Backspace', 'source'],
        ['drill-in', 'Enter', 'target']
    ].map(([name, key, direction]) => [name, { key, direction }])
);

export const dimId = key => createValidId('dim_' + key);
export const divId = (key, value) => createValidId(dimId(key) + '_' + value);
const isNum = v => v !== null && v !== undefined && v !== '' && !isNaN(Number(v));
const nums = (rows, f) => rows.map(r => Number(r[f])).filter(n => !isNaN(n));
const sum = a => a.reduce((s, v) => s + v, 0);
export const fmt = n => (isNaN(n) ? '' : Number.isInteger(n) ? String(n) : String(parseFloat(n.toFixed(2))));
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

export function regression(xs, ys) {
    const n = xs.length;
    if (n < 2) return { slope: 0, intercept: ys[0] ?? 0, r2: 0 };
    const mx = sum(xs) / n;
    const my = sum(ys) / n;
    let xx = 0;
    let xy = 0;
    let yy = 0;
    xs.forEach((x, i) => {
        xx += (x - mx) ** 2;
        xy += (x - mx) * (ys[i] - my);
        yy += (ys[i] - my) ** 2;
    });
    if (!xx) return { slope: 0, intercept: my, r2: 0 };
    return { slope: xy / xx, intercept: my - (xy / xx) * mx, r2: yy ? (xy * xy) / (xx * yy) : 1 };
}

const encode = (rows, f) => {
    const cats = new Map();
    return rows.map(r => (isNum(r[f]) ? Number(r[f]) : (cats.get(r[f]) ?? cats.set(r[f], cats.size).get(r[f]))));
};

export const aggregate = {
    count: rows => rows.length,
    min: (rows, f) => Math.min(...nums(rows, f)),
    max: (rows, f) => Math.max(...nums(rows, f)),
    sum: (rows, f) => sum(nums(rows, f)),
    avg: (rows, f) => sum(nums(rows, f)) / nums(rows, f).length,
    r2: (rows, x, y) => regression(encode(rows, x), encode(rows, y)).r2,
    trend: (rows, x, y) => {
        const { slope, r2 } = regression(encode(rows, x), encode(rows, y));
        const r = Math.sqrt(r2);
        if (rows.length < 2 || r < 0.3) return 'flat';
        return `${r >= 0.7 ? 'strongly' : 'slightly'} ${slope > 0 ? 'increasing' : 'decreasing'}`;
    }
};

const compare = {
    '>=': (a, b) => a >= b,
    '<=': (a, b) => a <= b,
    '!=': (a, b) => a != b,
    '===': (a, b) => a == b,
    '>': (a, b) => a > b,
    '<': (a, b) => a < b
};

export function evalFormula(tokens, row, rows) {
    const ref = v => (v in row ? row[v] : isNum(v) ? Number(v) : v);
    const vals = [];
    const ops = [];
    for (const t of tokens) {
        if (t.kind === 'op') {
            if (!vals.length) vals.push(0);
            ops.push(t.value);
            continue;
        }
        if (t.kind === 'if_cond') {
            const m = t.value.match(/^(.+?)\s*(>=|<=|===|!=|>|<)\s*(.+?)\s*\?\s*(.+?)\s*:\s*(.+)$/);
            vals.push(m ? (compare[m[2]](Number(row[m[1]]), Number(m[3])) ? ref(m[4]) : ref(m[5])) : null);
            continue;
        }
        vals.push(
            t.kind === 'field_row'
                ? row[t.value]
                : t.kind === 'field_sum'
                  ? aggregate.sum(rows, t.value)
                  : t.kind === 'field_mean'
                    ? aggregate.avg(rows, t.value)
                    : t.kind === 'count_all'
                      ? rows.length
                      : t.kind === 'literal_num'
                        ? Number(t.value)
                        : t.value
        );
    }
    return ops.reduce((acc, op, i) => {
        const b = Number(vals[i + 1]);
        const a = Number(acc);
        return op === '+' ? a + b : op === '-' ? a - b : op === '*' ? a * b : op === '/' ? (b ? a / b : null) : acc;
    }, vals[0] ?? null);
}

export function prepareRows(pattern, rows) {
    const map = pattern.fieldMap || {};
    let out = rows.map(r => {
        const o = { ...r };
        for (const k in map) o[k] = r[map[k]];
        return o;
    });
    for (const f of pattern.fields || []) {
        if (!f.formula) continue;
        const base = out;
        out = base.map(r => ({ ...r, [f.key]: evalFormula(f.formula, r, base) }));
    }
    return out;
}

export const matchKey = pattern => {
    const src = k => pattern.fieldMap?.[k] ?? k;
    const keys = pattern.idKey ? [pattern.idKey] : pattern.recipe.dimensions.map(d => d.key);
    return r => keys.map(k => String(r[src(k)] ?? r[k])).join('\u0001');
};

export function stamp(pattern, rows) {
    const r = pattern.recipe;
    const numeric = r.dimensions.filter(d => d.type === 'numerical').map(d => d.key);
    const reserved = new Set([
        r.root.id,
        ...r.dimensions.map(d => dimId(d.key)),
        ...Object.keys(pattern.overrides?.added?.nodes || {})
    ]);
    return rows.map((row, i) => {
        const v =
            pattern.idKey && row[pattern.idKey] != null && row[pattern.idKey] !== '' ? row[pattern.idKey] : 'row ' + i;
        let id = createValidId(String(v));
        while (reserved.has(id) || id.startsWith('__dim')) id += '_';
        reserved.add(id);
        const out = { ...row, _dn_id: id, _dn_row: i };
        for (const k of numeric) if (isNum(out[k])) out[k] = Number(out[k]);
        return out;
    });
}

export function toOptions(pattern, rows) {
    const r = pattern.recipe;
    const values = r.dimensions.map(d => {
        const operations = { compressSparseDivisions: d.compress };
        if (d.type === 'numerical') {
            operations.createNumericalSubdivisions = d.subdivisions || 1;
        } else if (d.sort !== 'none') {
            const first = div => String(Object.values(div.values || {})[0]?.[d.key] ?? '');
            operations.sortFunction = (a, b) => (d.sort === 'ascending' ? 1 : -1) * first(a).localeCompare(first(b));
        }
        return {
            dimensionKey: d.key,
            type: d.type,
            nodeId: dimId(d.key),
            behavior: { extents: d.extents, childmostNavigation: r.childmost },
            navigationRules: { sibling_sibling: d.nav.sibling, parent_child: d.nav.drill },
            operations,
            divisionOptions:
                d.type === 'categorical'
                    ? { divisionNodeIds: (k, v) => d.divisionIds?.[String(v)] || divId(k, v) }
                    : undefined
        };
    });
    return {
        data: stamp(pattern, rows),
        idKey: '_dn_id',
        renderIdKey: '_dn_id',
        navigationRules: { ...r.keys, exit: { key: 'Escape', direction: 'target' } },
        dimensions: {
            values,
            adjustDimensions: dims => {
                for (const d of r.dimensions) {
                    const dim = dims[d.key];
                    if (d.type !== 'numerical' || d.sort !== 'descending' || !dim) continue;
                    const divs = Object.entries(dim.divisions).reverse();
                    divs.forEach(([, div]) => (div.values = Object.fromEntries(Object.entries(div.values).reverse())));
                    dim.divisions = Object.fromEntries(divs);
                }
                return dims;
            },
            parentOptions: {
                ...(r.root.enabled ? { addLevel0: { id: r.root.id, renderId: r.root.id, edges: [] } } : {}),
                level1Options: {
                    order: values.map(v => v.nodeId),
                    behavior: { extents: r.level1.extents },
                    navigationRules: { sibling_sibling: r.level1.nav, parent_child: r.dimensions[0].nav.drill }
                }
            }
        }
    };
}

const unlink = (s, edgeId) => {
    const e = s.edges[edgeId];
    if (!e) return;
    [e.source, e.target].forEach(n => s.nodes[n] && (s.nodes[n].edges = s.nodes[n].edges.filter(id => id !== edgeId)));
    delete s.edges[edgeId];
};

export function buildStructure(pattern, rows) {
    const r = pattern.recipe;
    const ov = pattern.overrides || {};
    const data = prepareRows(pattern, rows);
    const s = r.dimensions.length
        ? dataNavigator.structure(toOptions(pattern, data))
        : { nodes: {}, edges: {}, dimensions: {}, navigationRules: { ...r.keys } };
    for (const [id, n] of Object.entries(ov.added?.nodes || {}))
        s.nodes[id] = { id, renderId: id, edges: [], manual: true, data: n.data || {} };
    for (const [id, e] of Object.entries(ov.added?.edges || {})) {
        if (!s.nodes[e.source] || !s.nodes[e.target]) continue;
        s.edges[id] = { edgeId: id, source: e.source, target: e.target, navigationRules: e.rules, manual: true };
        s.nodes[e.source].edges.push(id);
        if (e.source !== e.target) s.nodes[e.target].edges.push(id);
    }
    for (const [id, e] of Object.entries(ov.edges || {})) {
        if (!s.edges[id]) continue;
        if (e.removed) unlink(s, id);
        else if (e.rules) s.edges[id].navigationRules = e.rules;
    }
    for (const [id, n] of Object.entries(ov.nodes || {})) {
        if (!n.removed || !s.nodes[id]) continue;
        s.nodes[id].edges.slice().forEach(e => unlink(s, e));
        delete s.nodes[id];
    }
    const rules = { exit: { key: 'Escape', direction: 'target' } };
    for (const e of Object.values(s.edges))
        for (const rule of e.navigationRules)
            rules[rule] ??= r.keys[rule] ?? GENERIC_KEYS[rule] ?? { key: '', direction: 'target' };
    s.navigationRules = rules;
    describe(s, pattern, data);
    return s;
}

export function context(s, pattern) {
    const parents = {};
    const info = {};
    const dims = pattern.recipe.dimensions.map(d => s.dimensions?.[d.key]).filter(Boolean);
    const rowsOf = div => Object.values(div.values);
    dims.forEach((dim, di) => {
        const divs = Object.values(dim.divisions);
        const real = !(divs.length === 1 && divs[0].id === dim.nodeId);
        info[dim.nodeId] = {
            level: 1,
            key: dim.dimensionKey,
            index: di,
            total: dims.length,
            rows: divs.flatMap(rowsOf),
            count: real ? divs.length : 0
        };
        divs.forEach((div, i) => {
            const leaves = Object.keys(div.values);
            if (real)
                info[div.id] = {
                    level: 2,
                    key: dim.dimensionKey,
                    index: i,
                    total: divs.length,
                    rows: rowsOf(div),
                    leaves,
                    extents: div.numericalExtents
                };
            leaves.forEach((leaf, li) => {
                (parents[leaf] ??= []).push({
                    key: dim.dimensionKey,
                    div: real ? div.id : null,
                    index: i,
                    total: divs.length,
                    leafIndex: li,
                    leafTotal: leaves.length
                });
            });
        });
    });
    return { parents, info, dims };
}

const DEFAULT_NAMES = { 0: 'root', 1: 'group', 2: 'subgroup', 3: 'data point' };

export function templateFor(node, pattern, c) {
    const L = pattern.recipe.labels;
    const ov = pattern.overrides?.nodes?.[node.id]?.semantics;
    const i = c.info[node.id];
    const base = node.manual
        ? { template: pattern.overrides.added.nodes[node.id].label ?? node.id, name: '' }
        : node.dimensionLevel === 0
          ? L.level0
          : i?.level === 1
            ? (L.perDimension[i.key] ?? { template: `{key:"${i.key}"}`, name: 'group' })
            : i?.level === 2
              ? (L.perDivision[i.key] ?? { template: `{value:"${i.key}"}`, name: 'subgroup' })
              : L.leaves;
    return ov ? { ...base, ...ov } : base;
}

export function label(t, node, pattern, c, allRows) {
    const i = c.info[node.id];
    const level = node.manual ? -1 : (node.dimensionLevel ?? 3);
    const rows = level === 0 ? allRows : i ? i.rows : node.data ? [node.data] : [];
    const data = node.data || {};
    let text =
        t.template ||
        (level === 3
            ? Object.keys(data)
                  .filter(k => !k.startsWith('_'))
                  .map(k => `{key:"${k}"}: {value:"${k}"}`)
                  .join(', ')
            : '');
    text = text
        .replace(/\{count\}/g, () => String(rows.length))
        .replace(/\{subcount\}/g, () => String(level === 0 ? c.dims.length : (i?.count ?? 0)))
        .replace(/\{(min|max|sum|avg):"([^"]+)"\}/g, (_, a, f) => fmt(aggregate[a](rows, f)))
        .replace(/\{(trend|r2):"([^"]+)":"([^"]+)"\}/g, (_, a, x, y) =>
            a === 'r2' ? fmt(aggregate.r2(rows, x, y)) : aggregate.trend(rows, x, y)
        )
        .replace(/\{key:"([^"]+)"\}(:\s*)?/g, (_, f, colon = '') => (t.omitKeyNames ? '' : f + colon))
        .replace(/\{value:"([^"]+)"\}/g, (_, f) => {
            if (f === 'range' && i?.extents) return `${fmt(i.extents[0])} to ${fmt(i.extents[1])}`;
            if (level === 2 && f === i?.key && i.extents) return `${fmt(i.extents[0])} to ${fmt(i.extents[1])}`;
            if (level === 1 && f === i?.key) return f;
            return data[f] === undefined ? '' : String(data[f]);
        })
        .replace(/\s+([,.;:])/g, '$1')
        .replace(/\s{2,}/g, ' ')
        .replace(/^[,;:\s]+|[,;:\s]+$/g, '');
    const L = pattern.recipe.labels;
    const name = t.name ?? DEFAULT_NAMES[level] ?? '';
    let suffix = name ? cap(name) : '';
    if (t.includeIndex && i) suffix += ` ${i.index + 1} of ${i.total}`;
    if (t.includeIndex && level === 3 && c.parents[node.id]) {
        const p = c.parents[node.id][0];
        suffix += ` ${p.leafIndex + 1} of ${p.leafTotal}`;
    }
    if (t.includeDimensionName && level === 2) suffix += ` in ${i.key} ${L.perDimension[i.key]?.name ?? 'group'}`;
    if (level === 3) {
        const clauses = (c.parents[node.id] || [])
            .map(p => {
                const dim = (t.includeParentNames || []).includes(p.key);
                const div = (t.includeParentDivisions || []).includes(p.key) && p.div;
                const noun = L.perDivision[p.key]?.name ?? 'subgroup';
                return div && dim
                    ? `in ${noun} ${p.index + 1} of ${p.total} in ${p.key}`
                    : div
                      ? `in ${noun} ${p.index + 1} of ${p.total}`
                      : dim
                        ? `in ${p.key} ${L.perDimension[p.key]?.name ?? 'group'}`
                        : '';
            })
            .filter(Boolean);
        if (clauses.length) suffix += ' ' + clauses.join(' and ');
    }
    suffix = suffix.trim();
    const out = [text, suffix && suffix + '.'].filter(Boolean).join(text && !/[.!?]$/.test(text) ? '. ' : ' ');
    return out || node.id;
}

export function describe(s, pattern, rows) {
    const c = context(s, pattern);
    const all =
        rows ??
        Object.values(s.nodes)
            .filter(n => n.dimensionLevel === undefined && !n.manual)
            .map(n => n.data);
    for (const node of Object.values(s.nodes)) {
        const t = templateFor(node, pattern, c);
        const style = pattern.overrides?.nodes?.[node.id]?.style || {};
        node.semantics = { label: label(t, node, pattern, c, all), elementType: 'div', role: style.ariaRole || 'img' };
        if (style.customClass) node.cssClass = style.customClass;
    }
    s.context = c;
    return s;
}

export const circlePath = ({ x, y, r }) =>
    `M${x - r},${y}A${r},${r},0,0,1,${x + r},${y}A${r},${r},0,0,1,${x - r},${y}Z`;
const rectPath = ({ x, y, width: w, height: h }) => `M${x},${y}L${x + w},${y}L${x + w},${y + h}L${x},${y + h}Z`;
const boxOf = list => {
    if (!list.length) return null;
    const x = Math.min(...list.map(b => b.x));
    const y = Math.min(...list.map(b => b.y));
    return {
        x,
        y,
        width: Math.max(...list.map(b => b.x + b.width)) - x,
        height: Math.max(...list.map(b => b.y + b.height)) - y
    };
};
const grow = (b, p) => b && { x: b.x - p, y: b.y - p, width: b.width + 2 * p, height: b.height + 2 * p };

export function toGeometry(g) {
    if (!g) return null;
    if (g.r !== undefined)
        return { x: g.x - g.r, y: g.y - g.r, width: 2 * g.r, height: 2 * g.r, path: circlePath(g), circle: g };
    return { x: g.x, y: g.y, width: g.width, height: g.height, ...(g.path ? { path: g.path } : {}) };
}

export function shiftPath(d, dx, dy) {
    let i = 0;
    let cmd = 'M';
    return d.replace(/([MLHVAZmlhvaz])|(-?\d*\.?\d+(?:e-?\d+)?)/g, (tok, c, n) => {
        if (c) {
            cmd = c;
            i = 0;
            return c;
        }
        const v = Number(n);
        const idx = i++;
        if (cmd === 'H') return String(v + dx);
        if (cmd === 'V') return String(v + dy);
        if (cmd === 'A') return idx % 7 === 5 ? String(v + dx) : idx % 7 === 6 ? String(v + dy) : n;
        if (cmd === cmd.toLowerCase()) return n;
        return String(idx % 2 ? v + dy : v + dx);
    });
}

export const groupDefaults = type =>
    type === 'numerical'
        ? { strategy: 'unionOfAll', padding: 8, divisionStrategy: 'rangeRect', divisionPadding: 0 }
        : { strategy: 'unionOfAll', padding: 8, divisionStrategy: 'convexHull', divisionPadding: 0 };

function axisFit(leaves, key) {
    const pts = leaves.filter(l => isNum(l.row[key]));
    const vs = pts.map(l => Number(l.row[key]));
    const fit = a =>
        regression(
            vs,
            pts.map(l => l.g[a] + l.g[a === 'x' ? 'width' : 'height'] / 2)
        );
    const fx = fit('x');
    const fy = fit('y');
    return fx.r2 >= fy.r2 ? { axis: 'x', ...fx } : { axis: 'y', ...fy };
}

function shapeFor(strategy, leaves, pad, line) {
    if (!leaves.length) return '';
    const gs = leaves.map(l => l.g);
    if (line)
        return offsetLinePath(
            [...gs].sort((a, b) => a.x - b.x).map(g => ({ x: g.x + g.width / 2, y: g.y + g.height / 2 })),
            pad
        );
    if (strategy === 'boundingRect') return boundingRectPath(gs, pad);
    if (gs.every(g => g.circle))
        return convexHullOfCircles(
            gs.map(g => g.circle),
            pad
        );
    return strategy === 'unionOfAll' ? unionOfRectPaths(gs, pad) : convexHullOfRects(gs, pad);
}

export function applyGeometry(s, pattern, measure, frame) {
    const r = pattern.recipe;
    const gc = r.groups;
    for (const [id, a] of Object.entries(pattern.overrides?.added?.nodes || {})) {
        const g = a.geo;
        if (!s.nodes[id] || !g) continue;
        s.nodes[id].spatialProperties =
            g.unit === 'fraction' && frame
                ? {
                      x: g.x * frame.width,
                      y: g.y * frame.height,
                      width: g.width * frame.width,
                      height: g.height * frame.height
                  }
                : g;
    }
    const line = ['line', 'area'].includes(pattern.chart?.type);
    const c = s.context || context(s, pattern);
    const leaves = {};
    for (const n of Object.values(s.nodes)) {
        if (n.manual || n.dimensionLevel !== undefined || c.info[n.id]) continue;
        const g = measure && toGeometry(measure(n.data, n.id));
        if (g) leaves[n.id] = { row: n.data, g };
    }
    const all = Object.values(leaves);
    const plot = boxOf(all.map(l => l.g));
    const set = (id, path, box) => path && s.nodes[id] && (s.nodes[id].spatialProperties = { ...box, path });
    for (const n of Object.values(s.nodes)) if (leaves[n.id]) n.spatialProperties = leaves[n.id].g;
    if (!plot || !gc) return s;
    const divPaths = {};
    for (const dim of c.dims) {
        const d = r.dimensions.find(x => x.key === dim.dimensionKey);
        const cfg = gc.perDimension[d.key] ?? groupDefaults(d.type);
        const fit = d.type === 'numerical' && cfg.divisionStrategy.startsWith('range') ? axisFit(all, d.key) : null;
        for (const div of Object.values(dim.divisions)) {
            if (!c.info[div.id] || !gc.divisionEnabled) continue;
            const ls = c.info[div.id].leaves.map(id => leaves[id]).filter(Boolean);
            let path;
            let box = grow(boxOf(ls.map(l => l.g)), cfg.divisionPadding);
            if (fit && div.numericalExtents) {
                const [a, b] = div.numericalExtents.map(v => fit.intercept + fit.slope * v).sort((p, q) => p - q);
                box =
                    fit.axis === 'x'
                        ? { x: a, y: plot.y, width: b - a, height: plot.height }
                        : { x: plot.x, y: a, width: plot.width, height: b - a };
                path =
                    cfg.divisionStrategy === 'rangeRect'
                        ? rectPath(box)
                        : fit.axis === 'x'
                          ? `M${a},${plot.y}L${a},${plot.y + plot.height}M${b},${plot.y}L${b},${plot.y + plot.height}`
                          : `M${plot.x},${a}L${plot.x + plot.width},${a}M${plot.x},${b}L${plot.x + plot.width},${b}`;
            } else
                path = shapeFor(
                    cfg.divisionStrategy,
                    ls,
                    cfg.divisionPadding,
                    line && ls.length > 1 && new Set(ls.map(l => Math.round(l.g.x))).size > 1
                );
            const bonus = gc.divisionBonusRects[div.id];
            if (bonus?.enabled && path) {
                path += rectPath(bonus);
                box = boxOf([box, bonus]);
            }
            if (path) divPaths[div.id] = { path, box };
            set(div.id, path, box);
        }
        if (!gc.dimensionEnabled) continue;
        const own = Object.keys(dim.divisions)
            .map(id => divPaths[id])
            .filter(Boolean);
        const ls = c.info[dim.nodeId].rows.map(row => leaves[row._dn_id]).filter(Boolean);
        let path =
            cfg.strategy === 'unionOfAll' && own.length
                ? own.map(p => p.path).join(' ')
                : shapeFor('convexHull', ls, cfg.padding, line);
        let box =
            cfg.strategy === 'unionOfAll' && own.length
                ? boxOf(own.map(p => p.box))
                : grow(boxOf(ls.map(l => l.g)), cfg.padding);
        const bonus = gc.dimensionBonusRects[d.key];
        if (bonus?.enabled && path) {
            path += rectPath(bonus);
            box = boxOf([box, bonus]);
        }
        set(dim.nodeId, path, box);
    }
    if (gc.rootEnabled && r.root.enabled)
        set(r.root.id, shapeFor(gc.rootStrategy, all, gc.rootPadding, line), grow(plot, gc.rootPadding));
    return s;
}

export function mount(options) {
    const {
        structure,
        container,
        chat,
        description = 'Data navigation',
        commandLabels = {},
        suffix = 'dn',
        chatOptions = {}
    } = options;
    const { onFocus = () => {}, onExit = () => {}, onKey = () => {} } = options;
    const { entry } = options;
    if (!container.id) container.id = suffix + '-root';
    const s = { ...structure };
    let current = null;
    const elementData = {};
    const index = () => {
        for (const k in elementData) delete elementData[k];
        Object.values(s.nodes).forEach(n => {
            const sp = n.spatialProperties;
            if (sp && !sp.path) n.spatialProperties = { ...sp, path: rectPath(sp) };
            elementData[(n.renderId ||= n.id)] = n;
        });
    };
    index();
    const rendering = dataNavigator.rendering({
        elementData,
        suffixId: suffix,
        root: { id: container.id, description, width: '100%', height: 0 },
        defaults: { cssClass: 'dn-node' },
        exitElement: { include: true }
    });
    rendering.initialize();
    const input = dataNavigator.input({
        structure: s,
        navigationRules: s.navigationRules,
        entryPoint: entry,
        exitPoint: rendering.exitElement?.id
    });
    const onKeydown = e => {
        const rule = input.keydownValidator(e);
        if (!rule) return;
        e.preventDefault();
        if (rule === 'exit') return api.exit();
        const next = input.move(current, rule);
        onKey(e, rule, next);
        if (next) api.focus(next.id, true);
    };
    const show = (id, focus) => {
        const node = s.nodes[id];
        if (!node) return;
        if (current && current !== id) rendering.remove(s.nodes[current]?.renderId || current);
        current = id;
        let el = document.getElementById(node.renderId);
        if (!el) {
            el = rendering.render(node);
            el?.addEventListener('keydown', onKeydown);
        }
        el?.classList.add('dn-current');
        if (focus) input.focus(node.renderId);
        onFocus(node);
    };
    const chatApi = chat
        ? dataNavigator.textChat({
              ...chatOptions,
              structure: s,
              container: chat,
              entryPoint: entry,
              commandLabels,
              onNavigate: n => show(n.id, false),
              onExit: () => api.exit(true)
          })
        : null;
    const api = {
        rendering,
        input,
        structure: s,
        get current() {
            return current;
        },
        enter: () => api.focus(entry, true),
        focus(id, focus = true) {
            show(id, focus);
            chatApi?.setCurrentNode(id);
        },
        exit(quiet) {
            const prev = current;
            current = null;
            rendering.clearStructure();
            if (!quiet) chatApi?.setCurrentNode(null);
            onExit(prev);
            if (!quiet && rendering.exitElement) {
                rendering.exitElement.style.display = 'block';
                input.focus(rendering.exitElement.id);
            }
        },
        update(next) {
            const id = current;
            const hadFocus = !!document.activeElement?.closest?.('.dn-wrapper');
            if (id) rendering.remove(s.nodes[id]?.renderId || id);
            current = null;
            Object.assign(s, next);
            index();
            input.setNavigationKeyBindings(s.navigationRules);
            if (id && s.nodes[id]) show(id, hadFocus);
            else if (id) api.exit(true);
        },
        destroy() {
            chatApi?.destroy();
            rendering.wrapper?.remove();
            rendering.exitElement?.remove();
        }
    };
    return api;
}

export function connect(options) {
    const { pattern, rows, container, measure, chat, entry, resize = true, ...rest } = options;
    const frame = () => ({ width: container.clientWidth, height: container.clientHeight });
    const build = data => applyGeometry(buildStructure(pattern, data), pattern, measure && measure(), frame());
    let data = rows;
    const nav = mount({ structure: build(data), container, chat, entry: entry ?? pattern.entry, ...rest });
    const observer =
        resize && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => nav.update(build(data))) : null;
    observer?.observe(container);
    return {
        ...nav,
        refresh: () => nav.update(build(data)),
        setData: next => nav.update(build((data = next))),
        destroy() {
            observer?.disconnect();
            nav.destroy();
        }
    };
}
