import type { ChartBuild, Doc, Dim, Field, Row, ScaffoldConfig } from '../model/doc';

export type VegaLiteSpec = Record<string, unknown>;
export const CHART_TYPES = ['bar', 'stacked-bar', 'clustered-bar', 'scatter', 'line', 'area'];

export function detectFields(chartType: string, dims: Pick<Dim, 'key' | 'type'>[], fields: Field[]) {
    const pick = (type: string, used: Set<string>) =>
        dims.find(d => d.type === type && !used.has(d.key))?.key ??
        fields.find(f => f.type === type && !f.removed && !used.has(f.key))?.key;
    const used = new Set<string>();
    const take = (k?: string) => (k && used.add(k), k);
    if (chartType === 'scatter') {
        const xField = take(pick('numerical', used));
        return { xField, yField: take(pick('numerical', used)), colorField: pick('categorical', used) };
    }
    const xField = take(pick('categorical', used));
    const value = fields.find(f => f.type === 'numerical' && !f.removed && !dims.some(d => d.key === f.key))?.key;
    const yField = take(value ?? pick('numerical', used));
    const series = ['stacked-bar', 'clustered-bar', 'line', 'area'].includes(chartType);
    return { xField, yField, colorField: series ? pick('categorical', used) : undefined };
}

export function resolveFields(cfg: ScaffoldConfig, doc: Doc): ScaffoldConfig {
    const d = detectFields(cfg.chartType, doc.recipe.dimensions, doc.data.fields);
    return {
        ...cfg,
        xField: cfg.xField ?? d.xField,
        yField: cfg.yField ?? d.yField,
        colorField: cfg.colorField ?? d.colorField
    };
}

export function seedScaffold(doc: Doc, view?: any): ScaffoldConfig {
    const chartType = CHART_TYPES.includes(doc.chart.type) ? doc.chart.type : 'bar';
    const w = doc.image?.width ?? 800;
    const h = doc.image?.height ?? 600;
    const small = w < 200 || h < 200;
    const series = ['stacked-bar', 'clustered-bar', 'line', 'area'].includes(chartType);
    const hasData = !!doc.data.rows?.length;
    const b = doc.chart.build;
    if (view && b?.mode === 'encode') {
        const [ox, oy] = view.origin();
        const p = view.padding();
        const left = Math.round(ox + p.left);
        const top = Math.round(oy + p.top);
        return {
            chartType: specType(b) || chartType,
            offsetX: 0,
            offsetY: 0,
            plotWidth: w,
            plotHeight: h,
            paddingLeft: left,
            paddingTop: top,
            paddingRight: Math.round(w - left - view.width()),
            paddingBottom: Math.round(h - top - view.height()),
            markParams: {},
            dataMode: 'csv',
            xField: b.x,
            yField: b.y,
            colorField: b.color ?? ''
        };
    }
    return {
        chartType,
        offsetX: 0,
        offsetY: 0,
        plotWidth: w,
        plotHeight: h,
        paddingLeft: small ? 0 : Math.round(Math.max(50, w * 0.07)),
        paddingTop: small ? 0 : 10,
        paddingRight: small ? 0 : 10,
        paddingBottom: small ? 0 : Math.round(Math.max(50, h * 0.07)),
        markParams: {},
        dataMode: hasData ? 'csv' : 'synthetic',
        ...(hasData
            ? {}
            : {
                  syntheticConfig: {
                      categories: ['A', 'B', 'C', 'D'],
                      seriesNames: series ? ['Series 1', 'Series 2'] : undefined,
                      xField: 'category',
                      yField: 'value',
                      colorField: series ? 'series' : undefined
                  }
              })
    };
}

export function buildSyntheticData(cfg: NonNullable<ScaffoldConfig['syntheticConfig']>): Row[] {
    const series = cfg.seriesNames?.length && cfg.colorField ? cfg.seriesNames : [null];
    return cfg.categories.flatMap(cat =>
        series.map(s => ({ [cfg.xField]: cat, [cfg.yField]: 1, ...(s ? { [cfg.colorField!]: s } : {}) }))
    );
}

export function buildVegaSpec(c: ScaffoldConfig, data: Row[], size = 900): VegaLiteSpec {
    const mp = c.markParams;
    const x = c.xField ?? 'x';
    const y = c.yField ?? 'value';
    const sort = c.sortX && c.sortX !== 'none' ? c.sortX : null;
    const band = { paddingInner: mp.barInnerPadding ?? 0.1, paddingOuter: mp.barOuterPadding ?? 0.05 };
    const color = c.colorField ? { color: { field: c.colorField, type: 'nominal' } } : {};
    const horizontal = c.barOrientation === 'horizontal';
    const domain = (lo?: number, hi?: number) => ({
        zero: false,
        ...(lo != null || hi != null ? { domain: [lo ?? null, hi ?? null] } : {})
    });
    const cat = { field: x, type: 'ordinal', sort };
    const bar = (extra: Record<string, unknown>, stack?: string) => {
        const [a, b] = horizontal ? ['y', 'x'] : ['x', 'y'];
        return {
            [a]: { ...cat, scale: band },
            [b]: { field: y, type: 'quantitative', ...(stack ? { stack } : {}) },
            ...extra
        };
    };
    const encodings: Record<string, [unknown, unknown]> = {
        bar: [{ type: 'bar', color: '#6366f1' }, bar({})],
        'stacked-bar': [
            { type: 'bar' },
            bar(
                {
                    ...color,
                    ...(c.colorField ? { color: { field: c.colorField, type: 'nominal', sort: null } } : {}),
                    order: { field: '_dn_row', type: 'quantitative' }
                },
                'zero'
            )
        ],
        'clustered-bar': [
            { type: 'bar' },
            bar({
                ...color,
                [horizontal ? 'yOffset' : 'xOffset']: {
                    field: c.colorField ?? 'series',
                    type: 'nominal',
                    scale: { paddingInner: mp.groupPadding ?? 0.05 }
                }
            })
        ],
        scatter: [
            { type: 'point', color: '#6366f1', ...(mp.pointSizeField ? {} : { size: mp.pointSize ?? size }) },
            {
                x: { field: x, type: 'quantitative', scale: domain(c.xDomainMin, c.xDomainMax) },
                y: { field: y, type: 'quantitative', scale: domain(c.yDomainMin, c.yDomainMax) },
                ...(mp.pointSizeField ? { size: { field: mp.pointSizeField, type: 'quantitative' } } : {}),
                ...color
            }
        ],
        line: [
            { type: 'line', strokeWidth: mp.strokeWidth ?? 2, point: { size: mp.pointSize ?? size } },
            { x: cat, y: { field: y, type: 'quantitative' }, ...color }
        ],
        area: [
            {
                type: 'area',
                fillOpacity: mp.fillOpacity ?? 0.4,
                strokeWidth: mp.strokeWidth ?? 1.5,
                point: { size: mp.pointSize ?? size }
            },
            { x: cat, y: { field: y, type: 'quantitative' }, ...color }
        ]
    };
    const [mark, encoding] = encodings[c.chartType] ?? encodings.bar;
    return {
        $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
        width: Math.max(1, c.plotWidth - c.paddingLeft - c.paddingRight),
        height: Math.max(1, c.plotHeight - c.paddingTop - c.paddingBottom),
        padding: { left: c.paddingLeft, top: c.paddingTop, right: c.paddingRight, bottom: c.paddingBottom },
        autosize: { type: 'none' },
        background: 'transparent',
        config: {
            axis: { title: null, grid: false, ticks: false, labels: false, domain: false },
            view: { stroke: null }
        },
        data: {
            values: c.dataMode === 'synthetic' && c.syntheticConfig ? buildSyntheticData(c.syntheticConfig) : data
        },
        mark,
        encoding
    };
}

const TIME = /^(\d{4}([-/]\d{1,2})*|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i;

export const ordinalLike = (rows: Row[], key: string) => {
    const vals = new Set(rows.map(r => r[key]));
    return vals.size <= 12 && vals.size < rows.length / 2 && [...vals].every(v => Number.isInteger(Number(v)));
};

export function guessBuild(fields: Field[], rows: Row[]): ChartBuild {
    const live = fields.filter(f => !f.removed);
    const uniq = (k: string) => new Set(rows.map(r => String(r[k]))).size;
    const cat = (f: Field) => f.type === 'categorical' || ordinalLike(rows, f.key);
    const nums = live.filter(f => !cat(f) && uniq(f.key) > 1).map(f => f.key);
    const cats = live
        .filter(f => cat(f) && uniq(f.key) > 1)
        .map(f => f.key)
        .sort(
            (a, b) =>
                (TIME.test(String(rows[0]?.[b])) ? 1 : 0) - (TIME.test(String(rows[0]?.[a])) ? 1 : 0) ||
                uniq(b) - uniq(a)
        );
    if (!cats.length && nums.length >= 2) return { mode: 'encode', type: 'scatter', x: nums[0], y: nums[1] };
    const x = cats[0] ?? nums[0];
    const y = nums.find(k => k !== x);
    const pairs = (k: string) => new Set(rows.map(r => `${r[x]}\u0001${r[k]}`)).size === rows.length;
    const color =
        uniq(x) < rows.length
            ? cats
                  .slice(1)
                  .sort((a, b) => uniq(a) - uniq(b))
                  .find(k => uniq(k) <= 10 && pairs(k))
            : undefined;
    if (!color && nums.length >= 2 && cats.length)
        return { mode: 'encode', type: 'scatter', x: nums[0], y: nums[1], color: cats.at(-1) };
    const time = rows.slice(0, 5).every(r => TIME.test(String(r[x])) && !/^\d{4}$/.test(String(r[x])));
    return { mode: 'encode', type: time ? 'line' : color ? 'stacked-bar' : 'bar', x, y, color };
}

const parse = (text = '') => {
    try {
        const v = JSON.parse(text);
        return v && typeof v === 'object' ? (v as VegaLiteSpec) : null;
    } catch {
        return null;
    }
};

export function chartSpec(
    b: ChartBuild | undefined,
    fields: Field[],
    rows: Row[],
    measure = false
): VegaLiteSpec | null {
    if (!b || b.mode === 'none') return null;
    let spec: VegaLiteSpec | null;
    if (b.mode === 'spec') {
        spec = parse(b.spec);
        if (!spec) return null;
        const { data, datasets, $schema, ...rest } = spec;
        spec = rest;
    } else {
        if (!b.x || !b.y) return null;
        const num = (k: string) => fields.find(f => f.key === k)?.type === 'numerical';
        const scatter = b.type === 'scatter';
        const zero = scatter ? { scale: { zero: false } } : {};
        const x = { field: b.x, type: scatter && num(b.x) ? 'quantitative' : 'ordinal', sort: null, ...zero };
        const y = { field: b.y, type: num(b.y) ? 'quantitative' : 'ordinal', ...zero };
        const color = b.color ? { color: { field: b.color, type: 'nominal', sort: null } } : {};
        const marks: Record<string, unknown> = {
            bar: 'bar',
            'stacked-bar': 'bar',
            'clustered-bar': 'bar',
            scatter: { type: 'point', filled: true, size: measure ? 900 : 60 },
            line: { type: 'line', point: true },
            area: { type: 'area', line: true, point: true, fillOpacity: 0.4 }
        };
        spec = {
            mark: marks[b.type ?? 'bar'] ?? 'bar',
            encoding: {
                x,
                y,
                ...color,
                ...(b.type === 'clustered-bar' && b.color ? { xOffset: { field: b.color, type: 'nominal' } } : {}),
                ...((b.type === 'stacked-bar' || b.type === 'bar') && b.color
                    ? { order: { field: '_dn_row', type: 'quantitative' } }
                    : {})
            }
        };
    }
    return {
        $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
        width: 640,
        height: 400,
        autosize: { type: 'fit', contains: 'padding' },
        background: 'white',
        ...spec,
        data: { values: rows }
    };
}

export function specType(b: ChartBuild | undefined) {
    if (!b || b.mode === 'none') return '';
    if (b.mode === 'encode') return b.type === 'bar' && b.color ? 'stacked-bar' : (b.type ?? '');
    const spec = parse(b.spec);
    const m = spec?.mark as string | { type: string } | undefined;
    const mark = typeof m === 'string' ? m : m?.type;
    const enc = (spec?.encoding ?? {}) as Record<string, unknown>;
    if (mark === 'bar') return enc.xOffset || enc.yOffset ? 'clustered-bar' : enc.color ? 'stacked-bar' : 'bar';
    return mark && ['point', 'circle', 'square'].includes(mark) ? 'scatter' : (mark ?? '');
}

export function specWarning(b: ChartBuild | undefined) {
    if (b?.mode !== 'spec' || !b.spec?.trim()) return '';
    const spec = parse(b.spec);
    if (!spec) return 'This is not valid JSON yet.';
    if (!spec.mark && !spec.layer) return 'Add a "mark" so there is something to draw.';
    return /"(transform|aggregate|bin|timeUnit)"/.test(b.spec)
        ? 'This spec transforms the data, so some marks may not line up with rows. Navigation falls back to a plain layout for those.'
        : '';
}

export async function toImage(spec: VegaLiteSpec) {
    const { view, cleanup } = await renderHidden(spec);
    try {
        const url = await view.toImageURL('png', 2);
        const img = new Image();
        img.src = url;
        await img.decode();
        return { url, width: img.naturalWidth / 2, height: img.naturalHeight / 2 };
    } finally {
        cleanup();
    }
}

export async function renderHidden(spec: VegaLiteSpec) {
    const embed = (await import('vega-embed')).default;
    const el = document.createElement('div');
    el.style.cssText = 'position:absolute;left:-9999px;top:-9999px;visibility:hidden;pointer-events:none';
    document.body.appendChild(el);
    const result = await embed(el, spec as never, { renderer: 'svg', actions: false, tooltip: false });
    return {
        view: result.view,
        cleanup: () => {
            result.finalize();
            el.remove();
        }
    };
}
