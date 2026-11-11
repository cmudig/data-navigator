import { firstValue } from '../runtime/dn-runtime.js';
import { newId, type Doc, type Geo } from './doc';
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

export function addNode(geo: Geo, level?: number) {
    const id = newId('node', app.structure.nodes);
    edit('Added node', d => {
        d.overrides.added.nodes[id] = { label: '', geo, ...(level !== undefined ? { level } : {}) };
        if (!app.entry) d.entry = id;
    });
    select([id]);
    say(`Added ${id}. It has no description yet.`);
    return id;
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

export const chain = (ids: string[], pair: string[], wrap: boolean, level: number | null = null) =>
    addEdges('Created dimension', links(ids, pair, wrap), [], d => setLevel(d, ids, level));

export function makeFamily(parent: string, kids: string[], pair: string[] | null, level: number | null, wrap = true) {
    edit('Created parent grouping', d => {
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
        else fan(hub, [...sel], hub === a);
    } else if (drills()) app.ui.family = { parent: b, kids: [a] };
    else connect(a, b);
}
