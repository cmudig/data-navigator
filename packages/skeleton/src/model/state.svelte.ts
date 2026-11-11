import { tick } from 'svelte';
import {
    applyGeometry,
    buildStructure,
    prepareRows,
    stamp,
    templateFor,
    toGeometry,
    tree
} from '../runtime/dn-runtime.js';
import { chartSpec, resolveFields } from '../utils/vegaBuilder';
import { defaultStyle, emptyDoc, keyConflicts, patternOf, type Doc, type Geo, type Row, type Style } from './doc';

export type Kind = 'root' | 'dimension' | 'division' | 'leaf' | 'manual';
export interface GNode {
    id: string;
    kind: Kind;
    level: number;
    dimensionKey?: string;
    name: string;
    label: string;
    data: Row;
    geo: Geo;
    style: Style;
    pinned: boolean;
}
export interface GEdge {
    id: string;
    source: string;
    target: string;
    rules: string[];
    manual: boolean;
}
type Measure = (
    row: Row
) => { x: number; y: number; width?: number; height?: number; r?: number; path?: string } | null;
interface Entry {
    label: string;
    doc: Doc;
    time: number;
}

export type Tool = 'selectNodes' | 'selectEdges' | 'addNode' | 'addEdge' | 'pan';
export interface Ordering {
    ids: string[];
    order: string[];
    mode: 'structure' | 'spatial' | 'click' | 'draw' | null;
    ask: boolean;
}

export const defaultTools = () => ({
    showNodeLabels: true,
    nodeLabelColor: '#000000',
    nodeLabelOutlineColor: '#ffffff',
    showEdgeLabels: false,
    edgeLabelColor: '#000000',
    edgeLabelOutlineColor: '#ffffff',
    showLevel0Node: true,
    showLevel1Nodes: true,
    showLevel2Nodes: true,
    showLevel3Nodes: true,
    showEdges: true,
    edgeColor: '#949494',
    edgeTypeColors: {} as Record<string, string>,
    hiddenEdgeTypes: [] as string[],
    showAllNodes: true,
    nodeBackfillColor: '#ffffff',
    level0BackfillColor: '#ffffff',
    level1BackfillColor: '#ffffff',
    level2BackfillColor: '#ffffff',
    level3BackfillColor: '#ffffff',
    nodeFillOpacity: 0.25,
    imageOpacity: 1
});
export type ToolOptions = ReturnType<typeof defaultTools>;
// Display settings per level. Levels deeper than 3 use the level 3 settings.
export const LEVEL_TOOLS = [
    ['showLevel0Node', 'level0BackfillColor'],
    ['showLevel1Nodes', 'level1BackfillColor'],
    ['showLevel2Nodes', 'level2BackfillColor'],
    ['showLevel3Nodes', 'level3BackfillColor']
] as const;
export const levelTools = (level: number | undefined) => (level === undefined ? null : LEVEL_TOOLS[Math.min(level, 3)]);
export const shapeOf = (n: { geo: Geo; style: Style }) =>
    n.geo.path ? 'path' : n.style.shape === 'ellipse' ? 'ellipse' : 'rect';

const KIND_LEVEL: Record<Kind, number> = { root: 0, dimension: 1, division: 2, leaf: 3, manual: -1 };
const shorten = (s: string) => (s.length > 24 ? s.slice(0, 24) + '…' : s);

function layout(s: any, kinds: Record<string, Kind>, w: number, h: number) {
    const rows: string[][] = [[], [], [], []];
    for (const id in s.nodes)
        if (!s.nodes[id].spatialProperties && kinds[id] !== 'manual') rows[KIND_LEVEL[kinds[id]]].push(id);
    const used = rows.filter(r => r.length);
    const nw = 110;
    const nh = 52;
    const pad = 80;
    used.forEach((ids, row) => {
        const y = pad + (used.length > 1 ? (row * (h - pad * 2 - nh)) / (used.length - 1) : 0);
        ids.forEach((id, i) => {
            const x = ids.length === 1 ? w / 2 - nw / 2 : pad + (i * (w - pad * 2 - nw)) / (ids.length - 1);
            s.nodes[id].spatialProperties = { x, y, width: nw, height: nh };
        });
    });
}

class Store {
    doc = $state.raw<Doc>(emptyDoc());
    past = $state.raw<Entry[]>([]);
    future = $state.raw<Entry[]>([]);
    measure = $state.raw<Measure | null>(null);
    view = $state.raw<any>(null);
    error = $state('');
    ui = $state({
        step: 0,
        selected: [] as string[],
        selectedEdges: [] as string[],
        hovered: null as string | null,
        hoveredEdge: null as string | null,
        scaffoldMode: false,
        entryGate: false,
        qa: '',
        schema: { collapsed: false, graphMode: 'tree' as 'tree' | 'force', hideLeafNodes: false },
        tools: defaultTools(),
        tool: 'selectNodes' as Tool,
        edgeRules: ['up', 'down'] as string[],
        swapped: false,
        view: { tx: 0, ty: 0, scale: 1, w: 0, h: 0, cw: 0, ch: 0 },
        space: false,
        ordering: null as Ordering | null,
        connect: null as { id: string; targets: string[] } | null,
        family: null as { parent: string; kids: string[] } | null,
        join: null as { row: import('./edits').SiblingRow; ids: string[]; target: string; plain: () => void } | null,
        skipPrep: null as number | null,
        fit: null as {
            key: string;
            state: 'running' | 'checking' | 'ok' | 'failed';
            message: string;
            fit?: any;
            before?: any;
            partial?: string;
        } | null,
        live: ''
    });

    pattern = $derived(patternOf(this.doc));
    rows = $derived(this.doc.data.rows ?? []);
    scaffold = $derived(this.doc.scaffold && resolveFields(this.doc.scaffold, this.doc));
    prepared = $derived<Row[]>(prepareRows(this.pattern, this.rows));
    vegaRows = $derived(stamp(this.pattern, this.prepared));
    chartSpec = $derived(chartSpec(this.doc.chart.build, this.doc.data.fields, this.vegaRows));
    built = $derived(!!this.chartSpec && !!this.doc.image?.built);
    measureSpec = $derived(
        this.built ? chartSpec(this.doc.chart.build, this.doc.data.fields, this.vegaRows, true) : null
    );
    size = $derived({ width: this.doc.image?.width ?? 1200, height: this.doc.image?.height ?? 800 });

    structure = $derived.by(() => {
        const p = this.pattern;
        const pins = p.overrides.nodes;
        const m = this.doc.scaffold || this.built ? this.measure : null;
        let s: any;
        try {
            s = buildStructure(p, this.rows);
            applyGeometry(
                s,
                m ? p : { ...p, recipe: { ...p.recipe, groups: null } },
                (row: Row, id: string) => pins[id]?.geo ?? m?.(row) ?? null
            );
        } catch (e) {
            console.error(e);
            s = {
                nodes: {},
                edges: {},
                dimensions: {},
                navigationRules: {},
                context: { info: {}, parents: {}, dims: [] }
            };
        }
        for (const [id, o] of Object.entries(pins))
            if (o.geo && s.nodes[id]) s.nodes[id].spatialProperties = toGeometry(o.geo);
        for (const [id, a] of Object.entries(p.overrides.added.nodes))
            if (s.nodes[id]) s.nodes[id].spatialProperties = a.geo;
        layout(s, this.kinds(s), this.size.width, this.size.height);
        return s;
    });

    kinds(s: any): Record<string, Kind> {
        const out: Record<string, Kind> = {};
        for (const [id, n] of Object.entries<any>(s.nodes))
            out[id] = n.manual
                ? 'manual'
                : n.dimensionLevel === 0
                  ? 'root'
                  : n.dimensionLevel === 1
                    ? 'dimension'
                    : n.dimensionLevel === 2
                      ? 'division'
                      : 'leaf';
        return out;
    }

    graph = $derived.by(() => {
        const s = this.structure;
        const kinds = this.kinds(s);
        const ov = this.doc.overrides;
        const first = this.doc.recipe.dimensions[0]?.key;
        const nodes = new Map<string, GNode>();
        for (const [id, n] of Object.entries<any>(s.nodes)) {
            const kind = kinds[id];
            const info = s.context.info[id];
            const ext = info?.extents;
            const name =
                kind === 'manual'
                    ? ov.added.nodes[id].label || id
                    : kind === 'root'
                      ? id
                      : kind === 'dimension'
                        ? n.derivedNode
                        : kind === 'division'
                          ? ext
                              ? `${+ext[0].toFixed(2)}–${+ext[1].toFixed(2)}`
                              : String(n.data?.[n.derivedNode] ?? id)
                          : String(n.data?.[first] ?? id);
            const sp = n.spatialProperties;
            const style = { ...defaultStyle(), ...(sp.path ? { shape: 'path' as const } : {}), ...ov.nodes[id]?.style };
            nodes.set(id, {
                id,
                kind,
                level: KIND_LEVEL[kind],
                dimensionKey: n.derivedNode ?? info?.key,
                name: shorten(name),
                label: n.semantics?.label ?? id,
                data: n.data ?? {},
                geo: { x: sp.x, y: sp.y, width: sp.width, height: sp.height, ...(sp.path ? { path: sp.path } : {}) },
                style,
                pinned: kind === 'manual' || !!ov.nodes[id]?.geo
            });
        }
        const edges = new Map<string, GEdge>();
        for (const [id, e] of Object.entries<any>(s.edges))
            if (typeof e.source === 'string' && typeof e.target === 'string')
                edges.set(id, { id, source: e.source, target: e.target, rules: e.navigationRules, manual: !!e.manual });
        return { nodes, edges };
    });

    tree = $derived.by(() => {
        const s = this.structure;
        const t = tree(s);
        const level: Record<string, number> = {};
        const added = this.doc.overrides.added.nodes;
        // Only one node may sit at level 0: the data's root first, then the first hand-made node set there.
        let root = Object.values<any>(s.nodes).find(n => !n.manual && n.dimensionLevel === 0)?.id as string | undefined;
        const extraRoots: string[] = [];
        const put = (id: string, l: number | undefined) => {
            if (l === undefined || isNaN(l) || l < 0) return;
            if (l === 0 && root && root !== id) return void extraRoots.push(id);
            if (l === 0) root = id;
            level[id] = l;
        };
        for (const n of Object.values<any>(s.nodes)) {
            if (n.manual) continue;
            const l = this.doc.overrides.nodes[n.id]?.level ?? n.dimensionLevel ?? 3;
            level[n.id] = l === 0 && n.id !== root ? (n.dimensionLevel ?? 3) : l;
        }
        for (const id in added) if (s.nodes[id] && added[id].level !== undefined) put(id, added[id].level);
        for (let pass = 0; pass < 4; pass++)
            for (const id in added) {
                if (!s.nodes[id] || level[id] !== undefined || added[id].level !== undefined) continue;
                const p = t.parent[id];
                const kid = t.children[id]?.find(k => level[k] !== undefined);
                const l = p ? level[p] + 1 : kid ? level[kid] - 1 : undefined;
                if (l !== 0) put(id, l);
            }
        const group = (id: string) => t.parent[id] ?? (t.children['']?.includes(id) ? '' : undefined);
        return { ...t, level, group, extraRoots, root };
    });

    leveled = $derived(Object.keys(this.tree.level).length > 0);
    graphMode = $derived(this.leveled ? this.ui.schema.graphMode : 'force');

    missing = $derived.by(() => {
        const s = this.structure;
        const p = this.pattern;
        const out = new Set<string>();
        if (!s.context) return out;
        for (const n of Object.values<any>(s.nodes)) {
            const lv = n.manual ? -1 : (n.dimensionLevel ?? 3);
            if (lv === 3 || (lv > 0 && !p.overrides.nodes[n.id]?.semantics)) continue;
            if (!String(templateFor(n, p, s.context).template ?? '').trim()) out.add(n.id);
        }
        return out;
    });

    conflicts = $derived(keyConflicts(this.structure.navigationRules));

    orphans = $derived.by(() => {
        const s = this.structure;
        const ov = this.doc.overrides;
        return [
            ...Object.keys(ov.nodes).filter(id => !ov.nodes[id].removed && !s.nodes[id]),
            ...Object.keys(ov.edges).filter(id => !ov.edges[id].removed && !ov.edges[id].detached && !s.edges[id]),
            // A group's saved order rebuilds its sibling edges, so only edges to missing nodes are stale.
            ...Object.keys(ov.added.edges).filter(
                id => !s.nodes[ov.added.edges[id].source] || !s.nodes[ov.added.edges[id].target]
            )
        ];
    });

    warnings = $derived.by(() => {
        const out: string[] = [];
        const s = this.structure;
        const chosen = this.doc.entry;
        if (chosen && !s.nodes[chosen])
            out.push(`Entry node "${chosen}" no longer exists${this.entry ? `, using "${this.entry}" instead` : ''}.`);
        if (!this.entry) out.push('No entry node. Pick one in the Editor before testing.');
        for (const [key, names] of Object.entries(this.conflicts))
            out.push(`Key ${key} is used by ${names.join(', ')}.`);
        for (const id of this.tree.extraRoots)
            out.push(
                `"${id}" is set as a root, but "${this.tree.root}" already is. It has no level until you move it.`
            );
        const isolated = Object.values<any>(s.nodes).filter(n => !n.edges.length).length;
        if (isolated && Object.keys(s.nodes).length > 1)
            out.push(`${isolated} node${isolated > 1 ? 's have' : ' has'} no edges.`);
        return out;
    });

    entry = $derived.by(() => {
        const s = this.structure;
        const e = this.doc.entry;
        if (e && s.nodes[e]) return e;
        const r = this.doc.recipe;
        if (r.root.enabled && s.nodes[r.root.id]) return r.root.id;
        return Object.values<any>(s.dimensions ?? {})[0]?.nodeId ?? (e || null);
    });
}

export const app = new Store();

export function commit(label: string, fn: (d: Doc) => Doc, coalesce = false) {
    const next = fn(app.doc);
    if (next === app.doc) return;
    const now = Date.now();
    const last = app.past.at(-1);
    if (coalesce && last && last.label === label && now - last.time < 1000) last.time = now;
    else app.past = [...app.past.slice(-49), { label, doc: app.doc, time: now }];
    app.future = [];
    app.doc = next;
}

export function edit(label: string, mutate: (d: Doc) => void, coalesce = false) {
    commit(
        label,
        doc => {
            const d = $state.snapshot({ ...doc, data: { ...doc.data, rows: null }, image: null }) as Doc;
            d.data.rows = doc.data.rows;
            d.image = doc.image;
            mutate(d);
            return d;
        },
        coalesce
    );
}

export function load(doc: Doc) {
    app.doc = doc;
    app.past = [];
    app.future = [];
    app.ui.selected = [];
    app.ui.selectedEdges = [];
    app.ui.fit = null;
}

export function undo() {
    const e = app.past.at(-1);
    if (!e) return;
    app.past = app.past.slice(0, -1);
    app.future = [{ ...e, doc: app.doc }, ...app.future];
    app.doc = e.doc;
}

export function redo() {
    const e = app.future[0];
    if (!e) return;
    app.future = app.future.slice(1);
    app.past = [...app.past, { ...e, doc: app.doc }];
    app.doc = e.doc;
}

export function select(nodes: string[] = [], edges: string[] = []) {
    app.ui.selected = nodes;
    app.ui.selectedEdges = edges;
}

export const stepFor = (d: Doc) => (!d.data.rows && !d.image ? 0 : d.meta.prepDone ? 2 : 1);

export async function goTo(step: number, force = false) {
    const ui = app.ui;
    if (step === ui.step) return;
    if (!force && step >= 2 && ui.step === 1 && !app.doc.meta.prepDone && app.doc.data.rows) {
        ui.skipPrep = step;
        return;
    }
    if (step >= 3 && !app.entry) {
        ui.entryGate = true;
        return;
    }
    ui.step = step;
    ui.scaffoldMode = ui.scaffoldMode && step === 2;
    await tick();
    document.getElementById(`step-heading-${step}`)?.focus();
}

export function zoomTo(scale: number) {
    const v = app.ui.view;
    const next = Math.max(0.1, Math.min(8, scale));
    v.tx = v.w / 2 - (v.w / 2 - v.tx) * (next / v.scale);
    v.ty = v.h / 2 - (v.h / 2 - v.ty) * (next / v.scale);
    v.scale = next;
}

export function fitView() {
    const v = app.ui.view;
    if (!v.w || !v.h || !v.cw || !v.ch) return;
    v.scale = Math.min(v.w / v.cw, v.h / v.ch) * 0.95;
    v.tx = (v.w - v.cw * v.scale) / 2;
    v.ty = (v.h - v.ch * v.scale) / 2;
}
