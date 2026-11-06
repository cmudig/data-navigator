import { createValidId } from 'data-navigator';
import { dimId, divId } from '../runtime/dn-runtime.js';

export type Row = Record<string, unknown>;
export type FieldType = 'numerical' | 'categorical';
export type Extents = 'circular' | 'terminal' | 'bridgedCousins';
export type Pair = [string, string];

export interface FormulaToken {
    kind: 'field_row' | 'field_sum' | 'field_mean' | 'count_all' | 'literal_num' | 'op' | 'if_cond';
    value: string;
}
export interface Field {
    key: string;
    type: FieldType;
    removed?: boolean;
    formula?: FormulaToken[];
}

export interface LabelTemplate {
    template: string;
    name: string;
    includeIndex: boolean;
    includeParentName: boolean;
    omitKeyNames: boolean;
    includeDimensionName?: boolean;
    includeParentNames?: string[];
    includeParentDivisions?: string[];
}
export interface LabelConfig {
    level0: LabelTemplate;
    perDimension: Record<string, LabelTemplate>;
    perDivision: Record<string, LabelTemplate>;
    leaves: LabelTemplate;
}

export interface Dim {
    key: string;
    type: FieldType;
    subdivisions: number;
    sort: 'ascending' | 'descending' | 'none';
    compress: boolean;
    extents: Extents;
    nav: { sibling: Pair; drill: Pair };
    divisionIds?: Record<string, string>;
}
export interface NavKey {
    key: string;
    direction: 'source' | 'target';
}

export interface BonusRect {
    enabled: boolean;
    x: number;
    y: number;
    width: number;
    height: number;
}
export interface DimensionGroupConfig {
    strategy: 'convexHull' | 'unionOfAll';
    padding: number;
    divisionStrategy: 'convexHull' | 'unionOfAll' | 'rangeBounds' | 'rangeRect';
    divisionPadding: number;
}
export interface GroupShapeConfig {
    rootEnabled: boolean;
    rootStrategy: 'convexHull' | 'unionOfAll' | 'boundingRect';
    rootPadding: number;
    dimensionEnabled: boolean;
    divisionEnabled: boolean;
    perDimension: Record<string, DimensionGroupConfig>;
    dimensionBonusRects: Record<string, BonusRect>;
    divisionBonusRects: Record<string, BonusRect>;
}

export interface Recipe {
    root: { enabled: boolean; id: string };
    dimensions: Dim[];
    childmost: 'within' | 'across';
    level1: { extents: 'circular' | 'terminal'; nav: Pair };
    keys: Record<string, NavKey>;
    labels: LabelConfig;
    groups: GroupShapeConfig;
}

export interface ScaffoldMarkParams {
    barInnerPadding?: number;
    barOuterPadding?: number;
    groupPadding?: number;
    pointSize?: number;
    pointSizeField?: string;
    strokeWidth?: number;
    showPoints?: boolean;
    fillOpacity?: number;
}
export interface SyntheticDataConfig {
    categories: string[];
    seriesNames?: string[];
    xField: string;
    yField: string;
    colorField?: string;
}
export interface ScaffoldConfig {
    chartType: string;
    offsetX: number;
    offsetY: number;
    plotWidth: number;
    plotHeight: number;
    paddingLeft: number;
    paddingTop: number;
    paddingRight: number;
    paddingBottom: number;
    markParams: ScaffoldMarkParams;
    dataMode: 'csv' | 'synthetic';
    syntheticConfig?: SyntheticDataConfig;
    xField?: string;
    yField?: string;
    colorField?: string;
    sortX?: 'none' | 'ascending' | 'descending';
    xDomainMin?: number;
    xDomainMax?: number;
    yDomainMin?: number;
    yDomainMax?: number;
    barOrientation?: 'vertical' | 'horizontal';
}

export interface Geo {
    x: number;
    y: number;
    width: number;
    height: number;
    path?: string;
}
export interface Style {
    shape: 'rect' | 'ellipse' | 'path';
    fillEnabled: boolean;
    fill: string;
    opacity: number;
    strokeWidth: number;
    strokeColor: string;
    strokeDash: 'solid' | 'dashed' | 'dotted';
    ariaRole: string;
    customClass: string;
}
export interface NodeOverride {
    removed?: true;
    semantics?: Partial<LabelTemplate>;
    geo?: Geo;
    style?: Partial<Style>;
}
export interface AddedNode {
    label: string;
    geo: Geo;
    data?: Row;
}
export interface AddedEdge {
    source: string;
    target: string;
    rules: string[];
}
export interface Overrides {
    nodes: Record<string, NodeOverride>;
    edges: Record<string, { removed?: true; rules?: string[] }>;
    added: { nodes: Record<string, AddedNode>; edges: Record<string, AddedEdge> };
}

export interface Doc {
    v: 2;
    image: { url: string; width: number; height: number } | null;
    data: { rows: Row[] | null; name: string; fields: Field[]; idKey: string | null };
    chart: { type: string; description: string };
    recipe: Recipe;
    scaffold: ScaffoldConfig | null;
    overrides: Overrides;
    entry: string | null;
    meta: { seen: string[]; prepDone: boolean };
}

export const template = (t: Partial<LabelTemplate> = {}): LabelTemplate => ({
    template: '',
    name: 'data point',
    includeIndex: false,
    includeParentName: false,
    omitKeyNames: false,
    ...t
});

export const defaultStyle = (): Style => ({
    shape: 'rect',
    fillEnabled: false,
    fill: '#f6f6f7',
    opacity: 1,
    strokeWidth: 2,
    strokeColor: '#000000',
    strokeDash: 'solid',
    ariaRole: 'img',
    customClass: ''
});

export const defaultGroups = (): GroupShapeConfig => ({
    rootEnabled: true,
    rootStrategy: 'boundingRect',
    rootPadding: 16,
    dimensionEnabled: true,
    divisionEnabled: true,
    perDimension: {},
    dimensionBonusRects: {},
    divisionBonusRects: {}
});

export const emptyRecipe = (): Recipe => ({
    root: { enabled: false, id: 'root' },
    dimensions: [],
    childmost: 'within',
    level1: { extents: 'terminal', nav: ['left', 'right'] },
    keys: {},
    labels: { level0: template({ name: 'root' }), perDimension: {}, perDivision: {}, leaves: template() },
    groups: defaultGroups()
});

export const emptyDoc = (): Doc => ({
    v: 2,
    image: null,
    data: { rows: null, name: '', fields: [], idKey: null },
    chart: { type: '', description: '' },
    recipe: emptyRecipe(),
    scaffold: null,
    overrides: { nodes: {}, edges: {}, added: { nodes: {}, edges: {} } },
    entry: null,
    meta: { seen: [], prepDone: false }
});

export const SIBLING_PRESETS = [
    { id: 'updown', label: '↑ / ↓ arrow keys', names: ['up', 'down'] as Pair, keys: ['ArrowUp', 'ArrowDown'] },
    { id: 'leftright', label: '← / → arrow keys', names: ['left', 'right'] as Pair, keys: ['ArrowLeft', 'ArrowRight'] },
    {
        id: 'brackets',
        label: '[ / ] bracket keys',
        names: ['backward', 'forward'] as Pair,
        keys: ['BracketLeft', 'BracketRight']
    }
];
const DRILL_OUT_KEYS = ['KeyW', 'KeyJ', 'Backslash'];
const DEFAULT_KEYS: Record<string, string> = {
    left: 'ArrowLeft',
    right: 'ArrowRight',
    up: 'ArrowUp',
    down: 'ArrowDown',
    backward: 'BracketLeft',
    forward: 'BracketRight',
    'drill-in': 'Enter',
    'drill-out': 'Backspace'
};

export const presetOf = (nav: Pair) => SIBLING_PRESETS.find(p => p.names[0] === nav[0] && p.names[1] === nav[1]);

export function inferType(rows: Row[], key: string): FieldType {
    const vals = rows.map(r => r[key]).filter(v => v !== null && v !== undefined && v !== '');
    return vals.length && vals.every(v => !isNaN(Number(v))) ? 'numerical' : 'categorical';
}

export function inferFields(rows: Row[]): Field[] {
    return Object.keys(rows[0] ?? {}).map(key => ({ key, type: inferType(rows, key) }));
}

export function guessId(rows: Row[], fields: Field[]): string | null {
    const unique = fields.filter(f => new Set(rows.map(r => String(r[f.key]))).size === rows.length).map(f => f.key);
    return unique.find(k => /^(_?id|key|index)$/i.test(k)) ?? unique[0] ?? null;
}

export function newDim(key: string, type: FieldType, index: number, rows: Row[] = []): Dim {
    const unique = new Set(rows.map(r => String(r[key]))).size;
    return {
        key,
        type,
        subdivisions: 4,
        sort: type === 'numerical' ? 'ascending' : 'none',
        compress: type === 'categorical' && rows.length > 0 && unique === rows.length,
        extents: type === 'categorical' ? 'circular' : 'bridgedCousins',
        nav: { sibling: [...SIBLING_PRESETS[index % 3].names] as Pair, drill: ['drill-out', 'drill-in'] }
    };
}

export function syncKeys(r: Recipe): Recipe {
    const multi = r.dimensions.length > 1;
    const dimensions = r.dimensions.map(d => ({
        ...d,
        nav: { ...d.nav, drill: [multi ? `drill-out-${d.key}` : 'drill-out', 'drill-in'] as Pair }
    }));
    const used: [string, 'source' | 'target', string][] = [];
    dimensions.forEach((d, i) => {
        used.push([d.nav.sibling[0], 'source', DEFAULT_KEYS[d.nav.sibling[0]] ?? '']);
        used.push([d.nav.sibling[1], 'target', DEFAULT_KEYS[d.nav.sibling[1]] ?? '']);
        used.push([d.nav.drill[0], 'source', multi ? (DRILL_OUT_KEYS[i] ?? '') : 'Backspace']);
        used.push([d.nav.drill[1], 'target', 'Enter']);
    });
    if (multi) {
        used.push([r.level1.nav[0], 'source', DEFAULT_KEYS[r.level1.nav[0]] ?? '']);
        used.push([r.level1.nav[1], 'target', DEFAULT_KEYS[r.level1.nav[1]] ?? '']);
    }
    const keys = { ...r.keys };
    for (const [name, direction, key] of used) keys[name] = { key: r.keys[name]?.key ?? key, direction };
    return { ...r, dimensions, keys };
}

export function keyConflicts(keys: Record<string, NavKey>): Record<string, string[]> {
    const byKey: Record<string, string[]> = {};
    for (const [name, k] of Object.entries(keys)) if (k.key && name !== 'exit') (byKey[k.key] ??= []).push(name);
    return Object.fromEntries(Object.entries(byKey).filter(([, names]) => names.length > 1));
}

export const patternOf = (d: Doc) => ({
    v: 2,
    idKey: d.data.idKey,
    fields: d.data.fields.filter(f => f.formula),
    recipe: d.recipe,
    overrides: d.overrides,
    entry: d.entry,
    chart: { type: d.chart.type }
});
export type Pattern = ReturnType<typeof patternOf> & { fieldMap?: Record<string, string> };

const ruleName = (n: string) =>
    n === 'drill in' ? 'drill-in' : n === 'drill out' ? 'drill-out' : n.replace(/^drill out to /, 'drill-out-');

export function migrate(v1: any, imageUrl: string | null): Doc {
    const doc = emptyDoc();
    const ss = v1.schemaState ?? {};
    const prep = v1.prepState ?? null;
    const rows: Row[] | null = v1.uploadedData ?? prep?.customData ?? null;
    const answers = Object.assign({}, ...(prep?.qaProgress?.chapters ?? []).map((c: any) => c.answers ?? {}));
    if (imageUrl && v1.imageWidth) doc.image = { url: imageUrl, width: v1.imageWidth, height: v1.imageHeight };
    doc.data = {
        rows,
        name: v1.uploadedDataRaw?.filename ?? '',
        fields: prep?.variables?.length
            ? prep.variables.map((v: any) => ({
                  key: v.key,
                  type: v.type,
                  ...(v.removed ? { removed: true } : {}),
                  ...(prep.customVariables?.find((c: any) => c.key === v.key)
                      ? { formula: prep.customVariables.find((c: any) => c.key === v.key).tokens }
                      : {})
              }))
            : inferFields(rows ?? []),
        idKey: prep?.variables?.find((v: any) => v.isId && !v.removed)?.key ?? null
    };
    doc.chart = {
        type: String(answers['chart-type'] ?? v1.scaffoldConfig?.chartType ?? ''),
        description: String(answers['dataset-description'] ?? '')
    };
    const r = doc.recipe;
    const dims = (ss.dimensions ?? [])
        .filter((d: any) => d.included)
        .sort((a: any, b: any) => (a.navIndex ?? 99) - (b.navIndex ?? 99));
    r.root = { enabled: !!ss.level0Enabled, id: ss.level0Id || 'root' };
    r.childmost = ss.childmostNavigation ?? 'within';
    r.level1 = {
        extents: ss.level1Extents ?? 'terminal',
        nav: [ss.level1NavForwardName || 'left', ss.level1NavBackwardName || 'right']
    };
    r.dimensions = dims.map((d: any, i: number) => {
        const base = newDim(d.key, d.type, i);
        const ids = Object.fromEntries(
            (d.divisions ?? [])
                .filter((x: any) => d.type === 'categorical' && x.id !== divId(d.key, x.originalValue))
                .map((x: any) => [x.originalValue, x.id])
        );
        return {
            ...base,
            subdivisions: d.subdivisions ?? 4,
            sort: d.sortMethod ?? base.sort,
            compress: !!d.compressSparseDivisions,
            extents: d.extents ?? base.extents,
            nav: {
                sibling: [d.forwardName || base.nav.sibling[0], d.backwardName || base.nav.sibling[1]],
                drill: base.nav.drill
            },
            ...(Object.keys(ids).length ? { divisionIds: ids } : {})
        };
    });
    const oldKeys: Record<string, NavKey> = {};
    dims.forEach((d: any) => {
        if (d.forwardName) oldKeys[d.forwardName] = { key: d.forwardKey, direction: 'source' };
        if (d.backwardName) oldKeys[d.backwardName] = { key: d.backwardKey, direction: 'target' };
        if (d.drillOutName) oldKeys[ruleName(d.drillOutName)] = { key: d.drillOutKey, direction: 'source' };
    });
    if (ss.level1NavForwardKey) oldKeys[r.level1.nav[0]] = { key: ss.level1NavForwardKey, direction: 'source' };
    if (ss.level1NavBackwardKey) oldKeys[r.level1.nav[1]] = { key: ss.level1NavBackwardKey, direction: 'target' };
    r.keys = oldKeys;
    Object.assign(r, syncKeys(r));
    const lc = { ...(prep?.labelConfig ?? {}), ...(ss.labelConfig ?? {}) };
    r.labels = {
        level0: template({ name: 'root', ...lc.level0 }),
        perDimension: lc.perDimension ?? {},
        perDivision: lc.perDivision ?? {},
        leaves: template(lc.leaves)
    };
    if (v1.scaffoldConfig) {
        const { groupShapes, ...scaffold } = v1.scaffoldConfig;
        doc.scaffold = scaffold;
        if (groupShapes) {
            const { rootBoundingRectOverride, ...g } = groupShapes;
            r.groups = { ...defaultGroups(), ...g };
            if (rootBoundingRectOverride) doc.overrides.nodes[r.root.id] = { geo: rootBoundingRectOverride };
        }
    }
    const nodes: [string, any][] = v1.nodes ?? [];
    const manual = new Set(nodes.filter(([, n]) => n.source === 'manual').map(([id]) => id));
    for (const [id, n] of nodes) {
        if (!manual.has(id)) continue;
        doc.overrides.added.nodes[id] = {
            label: n.semantics?.template || n.label || id,
            geo: { x: n.x, y: n.y, width: n.width, height: n.height, ...(n.pathData ? { path: n.pathData } : {}) },
            ...(Object.keys(n.data ?? {}).length ? { data: n.data } : {})
        };
    }
    for (const [id, e] of (v1.edges ?? []) as [string, any][]) {
        if (!manual.has(e.sourceId) && !manual.has(e.targetId)) continue;
        doc.overrides.added.edges[id] = {
            source: e.sourceId,
            target: e.targetId,
            rules: e.navigationRuleNames?.length ? e.navigationRuleNames : [e.direction]
        };
    }
    doc.entry = v1.entryNodeId ?? null;
    doc.meta = { seen: [], prepDone: !!prep?.hasRun };
    return doc;
}

export const newId = (prefix: string, taken: Record<string, unknown>) => {
    let i = Object.keys(taken).length + 1;
    while (taken[createValidId(`${prefix} ${i}`)]) i++;
    return createValidId(`${prefix} ${i}`);
};

export { dimId, divId };
