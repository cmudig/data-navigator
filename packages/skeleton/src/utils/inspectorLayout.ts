import { Inspector } from '@data-navigator/inspector';

type Pt = { x: number; y: number };
type Tree = {
    parent: Record<string, string>;
    children: Record<string, string[]>;
    level: Record<string, number>;
    group: (id: string) => string | undefined;
};
interface Opts {
    width: number;
    height: number;
    mode: string;
    radius: number;
    hideLeaves?: boolean;
    extra?: Record<string, unknown>;
}

// The Inspector lays out generated nodes itself. Hand-made or moved nodes get the level and parent dimension they sit under,
// so it can place and color them too; any it still cannot place are moved next to their siblings afterwards.
const offTree = (s: any, t: Tree, id: string) => {
    const n = s.nodes[id];
    if (n.manual) return true;
    const lv = n.dimensionLevel ?? 3;
    return t.level[id] !== lv || (lv === 2 && s.nodes[t.parent[id]]?.derivedNode !== n.derivedNode);
};

function forInspector(s: any, t: Tree, hideLeaves = false) {
    const native = new Set<string>();
    const rank: Record<string, number> = {};
    for (const kids of Object.values(t.children)) kids.forEach((k, i) => (rank[k] = i));
    const dims: Record<string, any> = { ...s.dimensions };
    const entries = Object.entries<any>(s.nodes)
        .filter(([, n]) => !hideLeaves || n.dimensionLevel !== undefined || n.manual)
        .map(([id, n]) => {
            if (!offTree(s, t, id)) return [id, n] as const;
            const lv = t.level[id];
            const pn = s.nodes[t.parent[id]];
            const div =
                lv >= 3 &&
                pn?.dimensionLevel === 2 &&
                Object.keys(dims).length === 1 &&
                dims[pn.derivedNode]?.divisions[pn.id];
            if (div) {
                const dim = dims[pn.derivedNode];
                dims[pn.derivedNode] = {
                    ...dim,
                    divisions: { ...dim.divisions, [pn.id]: { ...div, values: { ...div.values, [id]: {} } } }
                };
            }
            const as =
                lv === 1 && !pn
                    ? { dimensionLevel: 1 }
                    : lv === 1 && pn?.dimensionLevel === 0
                      ? { dimensionLevel: 1 }
                      : lv === 2 && pn?.dimensionLevel === 1
                        ? { dimensionLevel: 2, derivedNode: pn.derivedNode }
                        : div
                          ? { data: n.data ?? {} }
                          : null;
            if (as) native.add(id);
            return [id, { ...n, data: undefined, dimensionLevel: undefined, derivedNode: undefined, ...as }] as const;
        })
        .sort((a, b) => (rank[a[0]] ?? 0) - (rank[b[0]] ?? 0));
    return { structure: { ...s, dimensions: dims, nodes: Object.fromEntries(entries) }, native };
}

function place(
    svg: SVGSVGElement,
    prefix: string,
    s: any,
    t: Tree,
    native: Set<string>,
    R: number,
    width: number,
    hideLeaves = false
) {
    const out: Record<string, Pt> = {};
    const fill: Record<number, string> = {};
    svg.querySelectorAll('circle').forEach(c => {
        const d = (c as any).__data__;
        if (!d?.id || !s.nodes[d.id] || (offTree(s, t, d.id) && !native.has(d.id))) return;
        out[d.id] = { x: d.x, y: d.y };
        fill[t.level[d.id] ?? 3] ??= c.getAttribute('fill') ?? '';
    });
    const rows: Record<number, number[]> = {};
    for (const id in out) (rows[t.level[id] ?? 3] ??= []).push(out[id].y);
    const rowY = (l: number): number =>
        rows[l]?.length ? rows[l].sort((a, b) => a - b)[rows[l].length >> 1] : l <= 0 ? 30 : rowY(l - 1) + 60;
    const gap = R * 3;
    const manual = Object.keys(s.nodes).filter(
        id => offTree(s, t, id) && !native.has(id) && (!hideLeaves || (t.level[id] ?? 0) < 3)
    );
    for (let pass = 0; pass < 3; pass++)
        for (const id of manual) {
            if (out[id] && pass) continue;
            const grp = t.group(id);
            const sib = grp !== undefined ? t.children[grp] : [];
            const i = sib.indexOf(id);
            const prev = sib
                .slice(0, Math.max(0, i))
                .reverse()
                .find(k => out[k]);
            const next = sib.slice(i + 1).find(k => out[k]);
            const level = t.level[id] ?? 1;
            const rowXs = Object.keys(out)
                .filter(k => k !== id && Math.abs(out[k].y - rowY(level)) < 1)
                .map(k => out[k].x);
            out[id] = prev
                ? { x: out[prev].x + gap, y: out[prev].y }
                : next
                  ? { x: out[next].x - gap, y: out[next].y }
                  : { x: (rowXs.length ? Math.max(...rowXs) : width / 2 - gap) + gap, y: rowY(level) };
        }
    for (const id of manual) {
        const c = svg.ownerDocument.getElementById(`${prefix}svg${id}`);
        c?.setAttribute('cx', String(out[id].x));
        c?.setAttribute('cy', String(out[id].y));
        if (fill[t.level[id] ?? 1]) c?.setAttribute('fill', fill[t.level[id] ?? 1]);
    }
    const paths: Record<string, { d: string; w: number }> = {};
    for (const [id, e] of Object.entries<any>(s.edges)) {
        const a = out[e.source];
        const b = out[e.target];
        if (!a || !b) continue;
        const line = svg.ownerDocument.getElementById(`${prefix}svgedge${e.source}-${e.target}`);
        const arc = e.navigationRules
            .map((r: string) => svg.ownerDocument.getElementById(`${prefix}svgedge${e.source}-${e.target}-${r}`))
            .find(Boolean);
        const patched = manual.includes(e.source) || manual.includes(e.target);
        if (line && patched)
            for (const [k, v] of [
                ['x1', a.x],
                ['y1', a.y],
                ['x2', b.x],
                ['y2', b.y]
            ] as const)
                line.setAttribute(k, String(v));
        if (arc && patched)
            arc.setAttribute('d', `M ${a.x} ${a.y} Q ${(a.x + b.x) / 2} ${Math.min(a.y, b.y) - 18} ${b.x} ${b.y}`);
        const el = line ?? arc;
        const w =
            parseFloat(el?.getAttribute('stroke-width') ?? (el ? getComputedStyle(el).strokeWidth : '') ?? '') || 1.5;
        paths[id] = { d: arc && !line ? arc.getAttribute('d')! : `M ${a.x} ${a.y} L ${b.x} ${b.y}`, w };
    }
    return { pos: out, paths };
}

export function drawInspector(el: HTMLElement, s: any, t: Tree, o: Opts) {
    el.innerHTML = '';
    const { structure, native } = forInspector(s, t, o.hideLeaves);
    const ins = Inspector({
        structure,
        container: el,
        size: { width: o.width, height: o.height },
        mode: o.mode,
        colorBy: 'dimensionLevel',
        nodeRadius: o.radius,
        ...o.extra
    } as any);
    const svg = el.querySelector('svg') as SVGSVGElement;
    const laid =
        o.mode === 'tree' && svg
            ? place(svg, el.id + '-', s, t, native, o.radius, o.width, o.hideLeaves)
            : { pos: {} as Record<string, Pt>, paths: {} as Record<string, { d: string; w: number }> };
    return { ins, ...laid };
}
