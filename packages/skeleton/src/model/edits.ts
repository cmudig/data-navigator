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

function addEdges(label: string, pairs: [string, string, string[]][], drop: string[] = []) {
    let ids: string[] = [];
    edit(label, d => {
        removeEdges(d, drop);
        ids = newEdges(d, pairs);
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

export const chain = (ids: string[], pair: string[], wrap: boolean) =>
    addEdges('Created dimension', [
        ...ids.slice(1).map((id, i) => [ids[i], id, [...pair]] as [string, string, string[]]),
        ...(wrap && ids.length > 2 ? [[ids.at(-1)!, ids[0], [...pair]] as [string, string, string[]]] : [])
    ]);

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

export const groupKids = (parent: string) => app.tree.children[parent] ?? [];

const groupLevel = (parent: string) => (parent ? (app.tree.level[parent] ?? 0) + 1 : 1);

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
    edit('Reordered group', d => {
        if (ids.every(dimKey)) {
            const keys = ids.map(dimKey);
            d.recipe.dimensions.sort((a, b) => keys.indexOf(a.key) - keys.indexOf(b.key));
        } else if (pdim?.type === 'categorical' && ids.every(id => s.nodes[id]?.dimensionLevel === 2)) {
            const divs = s.dimensions[pdim.key].divisions;
            d.recipe.dimensions.find(x => x.key === pdim.key)!.order = ids.map(id => firstValue(divs[id], pdim.key));
            delete d.overrides.order[parent];
        } else d.overrides.order[parent] = ids;
    });
    say('Moved. The group order is updated.');
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

export function drawEdge(a: string, b: string) {
    if (a === b) return;
    const sel = new Set(app.ui.selected);
    if (sel.size > 1 && sel.has(a) && sel.has(b)) {
        const ids = [...sel];
        app.ui.ordering = { ids, order: spatialOrder(ids), mode: 'spatial', ask: true };
    } else if (sel.size > 1 && sel.has(a) !== sel.has(b)) {
        const hub = sel.has(a) ? b : a;
        fan(hub, [...sel], hub === a);
    } else connect(a, b);
}
