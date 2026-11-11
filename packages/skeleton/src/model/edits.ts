import { firstValue, shiftPath } from '../runtime/dn-runtime.js';
import { newId, type Doc, type Geo, type Style } from './doc';
import { app, edit, select } from './state.svelte';

const say = (msg: string) => (app.ui.live = msg);
const center = (g: Geo) => ({ x: g.x + g.width / 2, y: g.y + g.height / 2 });
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

function newEdges(d: Doc, pairs: [string, string, string[]][]) {
    const taken = { ...app.structure.edges };
    return pairs.map(([source, target, rules]) => {
        const id = newId('edge', { ...taken, ...d.overrides.added.edges });
        d.overrides.added.edges[id] = { source, target, rules };
        return id;
    });
}

function addEdges(label: string, pairs: [string, string, string[]][], drop: string[] = [], also?: (d: Doc) => void) {
    let ids: string[] = [];
    edit(label, d => {
        removeEdges(d, drop);
        ids = newEdges(d, pairs);
        also?.(d);
    });
    select([], ids);
    say(`Created ${plural(ids.length, 'edge')}. They are selected.`);
    return ids;
}

function removeEdges(d: Doc, ids: string[]) {
    const ov = d.overrides;
    for (const id of ids)
        if (ov.added.edges[id]) delete ov.added.edges[id];
        else ov.edges[id] = { ...ov.edges[id], removed: true };
}

export function deleteSelection(nodes: string[], edges: string[]) {
    if (!nodes.length && !edges.length) return;
    edit(`Deleted ${plural(nodes.length, 'node')} and ${plural(edges.length, 'edge')}`, d => {
        const ov = d.overrides;
        for (const id of nodes) {
            if (ov.added.nodes[id]) {
                delete ov.added.nodes[id];
                for (const [eid, e] of Object.entries(ov.added.edges))
                    if (e.source === id || e.target === id) delete ov.added.edges[eid];
                for (const k in ov.order) ov.order[k] = ov.order[k].filter(x => x !== id);
                delete ov.order[id];
            } else ov.nodes[id] = { ...ov.nodes[id], removed: true };
            if (d.entry === id) d.entry = null;
        }
        removeEdges(d, edges);
    });
    select();
    say(`Deleted ${plural(nodes.length, 'node')} and ${plural(edges.length, 'edge')}.`);
}

// New nodes are sized from the editor canvas, not the image, so they look the same on any image and from either view.
export function newGeo(center?: { x: number; y: number }): Geo {
    const { w, h } = app.ui.view;
    const { width: W, height: H } = app.size;
    const fit = w && h ? Math.min(w / W, h / H) * 0.95 : 1;
    const width = Math.round((w ? Math.min(Math.max(w * 0.084, 45), 112) : W * 0.084) / fit);
    const height = Math.round(width / 2);
    let c = center ?? { x: W / 2, y: H / 2 };
    const taken = (q: { x: number; y: number }) =>
        Object.values(app.doc.overrides.added.nodes).some(
            n =>
                n.geo && Math.abs(n.geo.x + n.geo.width / 2 - q.x) < 2 && Math.abs(n.geo.y + n.geo.height / 2 - q.y) < 2
        );
    if (!center) while (taken(c)) c = { x: c.x + height / 2, y: c.y + height / 2 };
    return { x: c.x - width / 2, y: c.y - height / 2, width, height };
}

export function addNode(geo: Geo = newGeo(), level?: number) {
    const id = newId('node', app.structure.nodes);
    edit('Added node', d => {
        d.overrides.added.nodes[id] = { label: '', geo, ...(level !== undefined ? { level } : {}) };
        if (!app.entry) d.entry = id;
    });
    select([id]);
    say(`Added ${id}. It has no description yet.`);
    return id;
}

export function writeGeo(d: Doc, id: string, geo: Geo) {
    if (d.overrides.added.nodes[id]) d.overrides.added.nodes[id].geo = geo;
    else d.overrides.nodes[id] = { ...d.overrides.nodes[id], geo };
}

export function setStyles(ids: string[], patch: Partial<Style>) {
    edit(
        ids.length > 1 ? `Edited style of ${ids.length} nodes` : 'Edited node style',
        d => {
            for (const id of ids)
                d.overrides.nodes[id] = {
                    ...d.overrides.nodes[id],
                    style: { ...d.overrides.nodes[id]?.style, ...patch }
                };
        },
        true
    );
}

export function setGeos(ids: string[], patch: (g: Geo) => Partial<Geo>, label = 'Resized node') {
    edit(
        ids.length > 1 ? `${label} (${ids.length} nodes)` : label,
        d => {
            for (const id of ids) {
                const g = app.graph.nodes.get(id)!.geo;
                const geo = { ...g, ...patch(g) };
                if (!geo.path) delete geo.path;
                writeGeo(d, id, geo);
            }
        },
        true
    );
}

// Measures a path in the browser. Returns null when the path data cannot be read.
export function pathBox(d: string) {
    if (!/^\s*[Mm]/.test(d)) return null;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('style', 'position:absolute;width:0;height:0;visibility:hidden');
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', d);
    svg.append(p);
    document.body.append(svg);
    const b = p.getBBox();
    const len = p.getTotalLength();
    svg.remove();
    const r = (v: number) => Math.round(v * 100) / 100;
    return len > 0 ? { x: r(b.x), y: r(b.y), width: r(b.width), height: r(b.height) } : null;
}

// Paths are stored in absolute positions; relative paths are offset by each node's x and y.
export const toAbsolute = (d: string, g: Geo, relative: boolean) => (relative ? shiftPath(d, g.x, g.y) : d);
export const toShown = (g: Geo, relative: boolean) =>
    g.path ? (relative ? shiftPath(g.path, -g.x, -g.y) : g.path) : '';

export function setPaths(paths: Record<string, string>, label = 'Edited path') {
    edit(Object.keys(paths).length > 1 ? `${label} (${Object.keys(paths).length} nodes)` : label, d => {
        for (const [id, path] of Object.entries(paths)) {
            const b = pathBox(path);
            if (!b) continue;
            writeGeo(d, id, { ...b, path });
            d.overrides.nodes[id] = {
                ...d.overrides.nodes[id],
                style: { ...d.overrides.nodes[id]?.style, shape: 'path' }
            };
        }
    });
}

export const connect = (a: string, b: string) => addEdges('Added edge', [[a, b, [...app.ui.edgeRules]]]);

export const fan = (hub: string, ids: string[], hubIsSource: boolean) =>
    addEdges(
        `Added ${ids.length} edges`,
        ids.map(id => (hubIsSource ? [hub, id, [...app.ui.edgeRules]] : [id, hub, [...app.ui.edgeRules]]))
    );

export const clique = (ids: string[], pair: string[]) =>
    addEdges(
        'Connected every node',
        ids.flatMap((a, i) => ids.slice(i + 1).map(b => [a, b, [...pair]] as [string, string, string[]]))
    );

const links = (ids: string[], pair: string[], wrap = false) => [
    ...ids.slice(1).map((id, i) => [ids[i], id, [...pair]] as [string, string, string[]]),
    ...(wrap && ids.length > 1 ? [[ids.at(-1)!, ids[0], [...pair]] as [string, string, string[]]] : [])
];

// Only hand-made nodes take a level here; generated nodes keep the one the data gives them.
function setLevel(d: Doc, ids: string[], level: number | null) {
    for (const id of ids)
        if (level !== null && level >= 0 && d.overrides.added.nodes[id]) d.overrides.added.nodes[id].level = level;
}

export const levelsInUse = () => [...new Set(Object.values(app.tree.level))].sort((a, b) => a - b);

const below = (id: string, seen = new Set<string>()): string[] =>
    (app.tree.children[id] ?? []).filter(k => !seen.has(k) && seen.add(k)).flatMap(k => [k, ...below(k, seen)]);

// Plans a level change for a hand-made node. 'level' shifts every hand-made node on its level and below; 'branch' shifts it and the nodes under it.
export function levelPlan(id: string, to: number, scope: 'level' | 'branch') {
    const t = app.tree;
    const added = app.doc.overrides.added.nodes;
    const from = t.level[id];
    const moved =
        from === undefined
            ? [id]
            : scope === 'level'
              ? Object.keys(t.level).filter(k => t.level[k] >= from)
              : [id, ...below(id)];
    const next: Record<string, number> = {};
    for (const k of moved) if (added[k]) next[k] = from === undefined ? to : t.level[k] + to - from;
    const at = (k: string) => next[k] ?? t.level[k];
    const seen = new Set<string>();
    const keepBelow = (k: string) => {
        if (seen.has(k)) return;
        seen.add(k);
        for (const kid of t.children[k] ?? [])
            if (added[kid] && at(kid) <= at(k)) ((next[kid] = at(k) + 1), keepBelow(kid));
    };
    Object.keys(next).forEach(keepBelow);
    const name = (k: string) => app.graph.nodes.get(k)?.name ?? k;
    const roots = [...new Set([...Object.keys(t.level), ...Object.keys(next)])].filter(k => at(k) === 0);
    const up = Object.keys(next).find(
        k =>
            t.parent[k] !== undefined &&
            !(t.parent[k] in next) &&
            at(t.parent[k]) !== undefined &&
            at(t.parent[k]) >= next[k]
    );
    const problem =
        roots.length > 1
            ? `That would put ${roots.map(name).join(' and ')} all at level 0, and only one root is allowed.`
            : up
              ? `${name(up)} would sit at or above its parent ${name(t.parent[up])} (level ${at(t.parent[up])}).`
              : '';
    return { next, problem, skipped: moved.filter(k => !added[k]).length };
}

export function applyLevels(next: Record<string, number>) {
    edit('Changed level', d => {
        for (const [k, l] of Object.entries(next)) if (d.overrides.added.nodes[k]) d.overrides.added.nodes[k].level = l;
        const root = Object.keys(next).find(k => next[k] === 0);
        if (root) d.entry = root;
    });
    say(`Changed the level of ${plural(Object.keys(next).length, 'node')}.`);
}

export const clearLevel = (id: string) => edit('Cleared level', d => delete d.overrides.added.nodes[id]?.level);

const isDrill = (r: string) => r.startsWith('drill');

// Edges between these nodes that step with any of these keys. Edges inside a group are left to the group's order.
const sibEdges = (ids: string[], pair: string[]) => {
    const set = new Set(ids);
    return Object.keys(app.structure.edges).filter(k => {
        const e = app.structure.edges[k];
        return (
            set.has(e.source) &&
            set.has(e.target) &&
            !e.navigationRules.some(isDrill) &&
            pair.some(r => e.navigationRules.includes(r))
        );
    });
};

function strip(d: Doc, ids: string[], pair: string[]) {
    for (const id of ids) {
        const rest = app.structure.edges[id].navigationRules.filter((r: string) => !pair.includes(r));
        if (!rest.length) removeEdges(d, [id]);
        else if (d.overrides.added.edges[id]) d.overrides.added.edges[id].rules = rest;
        else d.overrides.edges[id] = { ...d.overrides.edges[id], rules: rest };
    }
}

export const chain = (ids: string[], pair: string[], wrap: boolean, level: number | null = null) =>
    addEdges('Created dimension', links(ids, pair, wrap), [], d => {
        strip(
            d,
            sibEdges(
                ids.filter(id => app.tree.group(id) === undefined),
                pair
            ),
            pair
        );
        setLevel(d, ids, level);
    });

export type SiblingRow = { parent?: string; ids: string[]; pair: string[]; wrap: boolean };

// The row of siblings a node steps through with these keys: its group, or a chain of hand-drawn edges.
export function rowOf(id: string, keys: string[]): SiblingRow | null {
    const t = app.tree;
    const edges = Object.values<any>(app.structure.edges).filter(e => !e.navigationRules.some(isDrill));
    const parent = t.group(id);
    let ids = parent !== undefined ? groupKids(parent) : [id];
    if (parent === undefined) {
        const set = new Set(ids);
        const loose = (e: any) =>
            keys.some(r => e.navigationRules.includes(r)) &&
            t.group(e.source) === undefined &&
            t.group(e.target) === undefined;
        for (let grew = true; grew; ) {
            grew = false;
            for (const e of edges)
                if (loose(e) && set.has(e.source) !== set.has(e.target))
                    (set.add(e.source).add(e.target), (grew = true));
        }
        if (set.size < 2) return null;
        ids = [...set];
    } else if (ids.length < 2 && !parent) return null;
    const set = new Set(ids);
    const inner = edges.filter(e => set.has(e.source) && set.has(e.target));
    const pair = inner[0]?.navigationRules.slice(0, 2) ?? keys;
    if (!pair.some((r: string) => keys.includes(r))) return null;
    const next: Record<string, string> = {};
    for (const e of inner) next[e.source] ??= e.target;
    const hasPrev = new Set(inner.map(e => e.target));
    if (parent === undefined) {
        const out: string[] = [];
        for (
            let cur: string | undefined = ids.find(k => !hasPrev.has(k)) ?? structureOrder(ids)[0];
            cur && !out.includes(cur);
            cur = next[cur]
        )
            out.push(cur);
        ids = out.length === ids.length ? out : structureOrder(ids);
    }
    const linked = new Set(inner.flatMap(e => [e.source, e.target]));
    return { parent, ids, pair, wrap: !inner.length || (linked.size > 1 && [...linked].every(k => hasPrev.has(k))) };
}

// Adds nodes to an existing row at one position, relinking the siblings so every node stays reachable.
export function joinRow(row: SiblingRow, ids: string[], index: number) {
    const list = row.ids.filter(k => !ids.includes(k));
    list.splice(index, 0, ...ids);
    const lv = row.ids.map(k => app.tree.level[k]).find(l => l !== undefined);
    edit(`Added ${plural(ids.length, 'node')} to a row`, d => {
        if (row.parent === undefined) strip(d, sibEdges(row.ids, row.pair), row.pair);
        if (row.parent === undefined || row.ids.length < 2) newEdges(d, links(list, row.pair, row.wrap));
        if (row.parent !== undefined) d.overrides.order[row.parent] = list;
        setLevel(d, ids, lv ?? null);
    });
    select(ids);
    say(`Added ${plural(ids.length, 'node')} to the row. It now has ${list.length} nodes.`);
}

export function makeFamily(parent: string, kids: string[], pair: string[] | null, level: number | null, wrap = true) {
    const had = groupKids(parent).filter(k => !kids.includes(k));
    if (had.length) return addKids(parent, had, kids, pair, wrap);
    edit('Created parent grouping', d => {
        if (pair)
            strip(
                d,
                sibEdges(
                    kids.filter(k => app.tree.group(k) === undefined),
                    pair
                ),
                pair
            );
        newEdges(d, [
            ...kids.map(
                (k, i) => [parent, k, i ? ['drill-out'] : ['drill-out', 'drill-in']] as [string, string, string[]]
            ),
            ...(pair ? links(kids, pair, wrap) : [])
        ]);
        setLevel(d, [parent], level === 0 && app.tree.root && app.tree.root !== parent ? null : level);
        setLevel(d, kids, level === null ? null : Math.max(1, level + 1));
        if (level === 0) d.entry = parent;
    });
    select([parent]);
    say(`${app.graph.nodes.get(parent)?.name ?? parent} is now the parent of ${plural(kids.length, 'node')}.`);
}

// A parent keeps one row of children, so new children join the end of it instead of starting a second row.
function addKids(parent: string, had: string[], kids: string[], pair: string[] | null, wrap: boolean) {
    const list = [...had, ...kids];
    edit('Added children', d => {
        newEdges(d, [
            ...kids.map(k => [parent, k, ['drill-out']] as [string, string, string[]]),
            ...(had.length < 2 && pair ? links(list, pair, wrap) : [])
        ]);
        d.overrides.order[parent] = list;
        setLevel(d, kids, app.tree.level[had[0]] ?? null);
    });
    select([parent]);
    say(`${app.graph.nodes.get(parent)?.name ?? parent} now has ${plural(list.length, 'child')}.`);
}

export const parentGroup = (edges: string[], hub: string, kids: string[], first: string) =>
    addEdges(
        'Created parent grouping',
        [first, ...kids.filter(k => k !== first)].map((k, i) => [
            hub,
            k,
            i ? ['drill-out'] : ['drill-out', 'drill-in']
        ]),
        edges
    );

export const edgesOf = (id: string) =>
    Object.keys(app.structure.edges).filter(k =>
        [app.structure.edges[k].source, app.structure.edges[k].target].includes(id)
    );

export const groupKids = (parent: string) => app.tree.children[parent] ?? [];

export const groupLevel = (parent: string) => (parent ? (app.tree.level[parent] ?? 0) + 1 : 1);

function place(d: Doc, parent: string, id: string, index?: number) {
    const list = groupKids(parent).filter(k => k !== id);
    list.splice(index ?? list.length, 0, id);
    d.overrides.order[parent] = list;
    const n = d.overrides.added.nodes[id];
    if (n) n.level = groupLevel(parent);
}

function selectAround(id: string) {
    const ids = app.structure.nodes[id]?.edges ?? [];
    select([], ids);
    say(`Connected ${id} with ${plural(ids.length, 'edge')}. They are selected.`);
}

export function insertAt(parent: string, id: string, index?: number) {
    edit('Added to group', d => place(d, parent, id, index));
    selectAround(id);
}

export function asParentOf(target: string, id: string) {
    const p = app.tree.parent[target];
    const gp = p === undefined ? undefined : app.tree.group(p);
    edit('Added as parent', d => {
        newEdges(d, [[id, target, ['drill-out', 'drill-in']]]);
        if (gp !== undefined) place(d, gp, id);
        const n = d.overrides.added.nodes[id];
        if (n) n.level = Math.max(1, (app.tree.level[target] ?? 2) - 1);
    });
    selectAround(id);
}

export function reorder(parent: string, ids: string[]) {
    const s = app.structure;
    const r = app.doc.recipe;
    const dimKey = (id: string) => s.nodes[id]?.dimensionLevel === 1 && s.nodes[id].derivedNode;
    const pdim = r.dimensions.find(d => d.key === s.nodes[parent]?.derivedNode && s.nodes[parent].dimensionLevel === 1);
    const divs = pdim ? s.dimensions[pdim.key].divisions : {};
    edit('Reordered group', d => {
        if (ids.every(dimKey)) {
            const keys = ids.map(dimKey);
            d.recipe.dimensions.sort((a, b) => keys.indexOf(a.key) - keys.indexOf(b.key));
        } else if (pdim?.type === 'categorical' && ids.every(id => divs[id])) {
            d.recipe.dimensions.find(x => x.key === pdim.key)!.order = ids.map(id => firstValue(divs[id], pdim.key));
            delete d.overrides.order[parent];
        } else d.overrides.order[parent] = ids;
    });
    say('Moved. The group order is updated.');
}

// Nodes that change level lose every edge. Nodes that only change group lose the links to their old parent and siblings.
export function moveInto(group: string, index: number, ids: string[]) {
    const t = app.tree;
    const s = app.structure;
    const lv = groupLevel(group);
    const moving = new Set(ids);
    const kids = groupKids(group);
    const list = kids.filter(k => !moving.has(k));
    list.splice(kids.slice(0, index).filter(k => !moving.has(k)).length, 0, ...ids);
    if (ids.every(id => kids.includes(id))) return reorder(group, list);
    edit(ids.length > 1 ? `Moved ${ids.length} nodes` : 'Moved node', d => {
        const ov = d.overrides;
        for (const id of ids) {
            const from = t.group(id);
            if (from === group) continue;
            const all = t.level[id] !== undefined && t.level[id] !== lv;
            const near = new Set([t.parent[id], ...(from !== undefined ? groupKids(from) : [])]);
            for (const eid of edgesOf(id)) {
                const e = s.edges[eid];
                if (!all && !near.has(e.source === id ? e.target : e.source)) continue;
                if (ov.added.edges[eid]) delete ov.added.edges[eid];
                else ov.edges[eid] = { ...ov.edges[eid], detached: true };
            }
            for (const k in ov.order) ov.order[k] = ov.order[k].filter(x => !moving.has(x));
            if (from !== undefined) ov.order[from] = groupKids(from).filter(k => !moving.has(k));
            if (ov.added.nodes[id]) ov.added.nodes[id].level = lv;
            else if (lv !== s.nodes[id].dimensionLevel) ov.nodes[id] = { ...ov.nodes[id], level: lv };
            else if (ov.nodes[id]) delete ov.nodes[id].level;
        }
        ov.order[group] = list;
    });
    select(ids);
    say(`Moved ${plural(ids.length, 'node')} into ${app.graph.nodes.get(group)?.name ?? 'the top level'}.`);
}

export const reorderable = (parent: string | undefined) => {
    if (parent === undefined) return false;
    const kids = groupKids(parent);
    if (kids.length < 2 || kids.some(k => (app.tree.level[k] ?? 3) >= 3)) return false;
    const p = app.structure.nodes[parent];
    const dim = p?.dimensionLevel === 1 && app.doc.recipe.dimensions.find(d => d.key === p.derivedNode);
    return !(dim && dim.type === 'numerical');
};

export function structureOrder(ids: string[]) {
    const keys = Object.keys(app.structure.nodes);
    const lv = (id: string) => app.tree.level[id] ?? 9;
    return [...ids].sort((a, b) => lv(a) - lv(b) || keys.indexOf(a) - keys.indexOf(b));
}

export function spatialOrder(ids: string[]) {
    const pts = ids.map(id => ({ id, ...center(app.graph.nodes.get(id)!.geo) }));
    const xs = pts.map(p => p.x);
    const ys = pts.map(p => p.y);
    const wide = Math.max(...xs) - Math.min(...xs) >= Math.max(...ys) - Math.min(...ys);
    return pts.sort((a, b) => (wide ? a.x - b.x : b.y - a.y)).map(p => p.id);
}

const drills = () => app.ui.edgeRules.some(r => r.startsWith('drill'));

export function drawEdge(a: string, b: string) {
    if (a === b) return;
    const sel = new Set(app.ui.selected);
    if (sel.size > 1 && sel.has(a) && sel.has(b)) {
        const ids = [...sel];
        app.ui.ordering = { ids, order: spatialOrder(ids), mode: 'spatial', ask: true };
    } else if (sel.size > 1 && sel.has(a) !== sel.has(b)) {
        const hub = sel.has(a) ? b : a;
        if (drills()) app.ui.family = { parent: hub, kids: [...sel] };
        else if (!askJoin(hub, [...sel], () => fan(hub, [...sel], hub === a))) fan(hub, [...sel], hub === a);
    } else if (drills()) app.ui.family = { parent: b, kids: [a] };
    else if (!askJoin(b, [a], () => connect(a, b)) && !askJoin(a, [b], () => connect(a, b))) connect(a, b);
}

// Drawing a sibling edge from loose nodes to a node in a row asks whether they should join that row.
function askJoin(target: string, ids: string[], plain: () => void) {
    const keys = app.ui.edgeRules;
    if (ids.some(id => rowOf(id, keys))) return false;
    const row = rowOf(target, keys);
    if (!row || ids.some(id => row.ids.includes(id))) return false;
    app.ui.join = { row, ids: spatialOrder(ids), target, plain };
    return true;
}
