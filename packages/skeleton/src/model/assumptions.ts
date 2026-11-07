import A from './assumptions.json';
import type { Dim, DimensionGroupConfig, Doc, GroupShapeConfig } from './doc';

type Shape = { strategy?: string; padding?: number };
type Part = {
    root?: Shape;
    dimension?: Shape;
    division?: Shape;
    leaf?: { padding?: number; pointSize?: number };
    nav?: Record<string, string[]>;
};
type Chart = Part & { mark?: string; channels?: Record<string, Part> };

const marks = A.marks as Record<string, Part>;
const groupings = A.groupings as Record<string, Part>;
const charts = A.charts as Record<string, Chart>;

const merge = (parts: (Part | undefined)[]) =>
    parts.reduce<Required<Part>>(
        (o, p) =>
            p
                ? {
                      root: { ...o.root, ...p.root },
                      dimension: { ...o.dimension, ...p.dimension },
                      division: { ...o.division, ...p.division },
                      leaf: { ...o.leaf, ...p.leaf },
                      nav: { ...o.nav, ...p.nav }
                  }
                : o,
        { root: {}, dimension: {}, division: {}, leaf: {}, nav: {} }
    );

export const PATTERN_LABELS: Record<string, string> = {
    list: 'list',
    tree: 'tree',
    dualTree: 'dual tree',
    spatial: '2D spatial',
    spatialPlus: 'spatial plus',
    custom: 'custom'
};

export function patternName(dims: Dim[]) {
    const cats = dims.filter(x => x.type === 'categorical').length;
    const nums = dims.length - cats;
    if (dims.length === 1) return dims[0].compress ? 'list' : 'tree';
    if (cats === 2 && !nums) return 'dualTree';
    if (nums === 2 && !cats) return 'spatial';
    if (nums === 2 && cats === 1) return 'spatialPlus';
    return 'custom';
}

const SERIES_KIND: Record<string, string> = { 'stacked-bar': 'stack', 'clustered-bar': 'cluster' };

function kinds(d: Dim, chart: string) {
    if (d.type === 'numerical') return ['numericBins'];
    if (d.compress) return ['list'];
    if (d.channel === 'color') return ['series', SERIES_KIND[chart]].filter(Boolean) as string[];
    return [d.channel === 'x' && /line|area/.test(chart) ? 'ordinal' : 'category'];
}

export function markOf(doc: Doc) {
    const spec =
        doc.chart.build?.mode === 'spec'
            ? (() => {
                  try {
                      return JSON.parse(doc.chart.build!.spec ?? '');
                  } catch {
                      return null;
                  }
              })()
            : null;
    const m = spec?.mark;
    return charts[doc.chart.type]?.mark ?? (typeof m === 'string' ? m : m?.type) ?? 'bar';
}

export function assume(doc: Doc, d?: Dim) {
    const chart = charts[doc.chart.type];
    const dims = doc.recipe.dimensions;
    const channel =
        d && (d.channel ?? (dims.indexOf(d) === 0 ? 'x' : /bar|line|area/.test(doc.chart.type) ? 'color' : 'y'));
    return merge([
        A.defaults as Part,
        marks[markOf(doc)],
        groupings[`pattern:${patternName(dims)}`],
        ...(d ? kinds(d, doc.chart.type).map(k => groupings[k]) : []),
        chart,
        channel ? chart?.channels?.[channel] : undefined
    ]);
}

export function resolveGroups(doc: Doc): GroupShapeConfig {
    const g = doc.recipe.groups;
    const base = assume(doc);
    const perDimension: Record<string, DimensionGroupConfig> = {};
    for (const d of doc.recipe.dimensions) {
        const a = assume(doc, d);
        perDimension[d.key] = g.perDimension[d.key] ?? {
            strategy: a.dimension.strategy as DimensionGroupConfig['strategy'],
            padding: a.dimension.padding ?? 0,
            divisionStrategy: a.division.strategy as DimensionGroupConfig['divisionStrategy'],
            divisionPadding: a.division.padding ?? 0
        };
    }
    return {
        ...g,
        rootStrategy: g.rootStrategy ?? (base.root.strategy as GroupShapeConfig['rootStrategy']),
        rootPadding: g.rootPadding ?? base.root.padding,
        leafPadding: g.leafPadding ?? base.leaf.padding ?? 0,
        perDimension
    };
}

export const navPrefs = () => A.defaults.nav as Record<string, string[]>;
export const pointSize = (doc: Doc) => assume(doc).leaf.pointSize ?? 900;
