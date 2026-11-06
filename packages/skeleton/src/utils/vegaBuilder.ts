import type { Doc, Dim, Field, Row, ScaffoldConfig } from '../model/doc';

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

export function seedScaffold(doc: Doc): ScaffoldConfig {
    const chartType = CHART_TYPES.includes(doc.chart.type) ? doc.chart.type : 'bar';
    const w = doc.image?.width ?? 800;
    const h = doc.image?.height ?? 600;
    const small = w < 200 || h < 200;
    const series = ['stacked-bar', 'clustered-bar', 'line', 'area'].includes(chartType);
    const hasData = !!doc.data.rows?.length;
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

export function buildVegaSpec(c: ScaffoldConfig, data: Row[]): VegaLiteSpec {
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
            { type: 'point', color: '#6366f1', ...(mp.pointSizeField ? {} : { size: mp.pointSize ?? 30 }) },
            {
                x: { field: x, type: 'quantitative', scale: domain(c.xDomainMin, c.xDomainMax) },
                y: { field: y, type: 'quantitative', scale: domain(c.yDomainMin, c.yDomainMax) },
                ...(mp.pointSizeField ? { size: { field: mp.pointSizeField, type: 'quantitative' } } : {}),
                ...color
            }
        ],
        line: [
            { type: 'line', strokeWidth: mp.strokeWidth ?? 2, point: { size: mp.pointSize ?? 300 } },
            { x: cat, y: { field: y, type: 'quantitative' }, ...color }
        ],
        area: [
            {
                type: 'area',
                fillOpacity: mp.fillOpacity ?? 0.4,
                strokeWidth: mp.strokeWidth ?? 1.5,
                point: { size: mp.pointSize ?? 300 }
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
