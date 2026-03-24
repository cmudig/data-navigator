/**
 * vegaBuilder — Builds Vega-Lite specs from a ScaffoldConfig + data rows.
 *
 * Vega-Lite is used as a pure layout engine: the spec is rendered to a
 * hidden container to extract mark positions and scales. It is never shown
 * as-is to the user; our ScaffoldOverlay SVG layer handles the interactive display.
 */

import type { ScaffoldConfig, SyntheticDataConfig } from '../store/appState';

export type Row = Record<string, unknown>;

// Vega-Lite spec (typed loosely — the full vega-lite TopLevelSpec is large
// and we only need the subset we construct here).
export type VegaLiteSpec = Record<string, unknown>;

// ── Shared spec scaffolding ────────────────────────────────────────────────────

function baseSpec(config: ScaffoldConfig): Record<string, unknown> {
    // plotWidth/plotHeight are the OUTER box dimensions (border-box model).
    // Vega-Lite's width/height are the inner mark area; padding is outside that area.
    // So: vega_width = outer - left_pad - right_pad, and the total SVG = vega_width + pads = outer. ✓
    const innerW = Math.max(1, config.plotWidth - config.paddingLeft - config.paddingRight);
    const innerH = Math.max(1, config.plotHeight - config.paddingTop - config.paddingBottom);
    return {
        $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
        width: innerW,
        height: innerH,
        padding: {
            left: config.paddingLeft,
            top: config.paddingTop,
            right: config.paddingRight,
            bottom: config.paddingBottom
        },
        autosize: { type: 'none' },
        background: 'transparent',
        config: {
            // Suppress axis titles and grid lines to keep the overlay clean
            axis: { title: null, grid: false, ticks: false, labels: false, domain: false },
            view: { stroke: null }
        }
    };
}

function getData(config: ScaffoldConfig, data: Row[]): Row[] {
    if (config.dataMode === 'synthetic' && config.syntheticConfig) {
        return buildSyntheticData(config.syntheticConfig);
    }
    return data;
}

// ── Synthetic data generation ──────────────────────────────────────────────────

/**
 * Build synthetic rows where every quantitative value is 1.
 * For series chart types: cross-product of categories × seriesNames.
 */
export function buildSyntheticData(cfg: SyntheticDataConfig): Row[] {
    const rows: Row[] = [];
    if (cfg.seriesNames && cfg.seriesNames.length > 0 && cfg.colorField) {
        for (const cat of cfg.categories) {
            for (const series of cfg.seriesNames) {
                rows.push({ [cfg.xField]: cat, [cfg.yField]: 1, [cfg.colorField]: series });
            }
        }
    } else {
        for (const cat of cfg.categories) {
            rows.push({ [cfg.xField]: cat, [cfg.yField]: 1 });
        }
    }
    return rows;
}

// ── Chart-type spec builders ───────────────────────────────────────────────────

function vegaSortX(config: ScaffoldConfig): unknown {
    if (config.sortX === 'ascending') return 'ascending';
    if (config.sortX === 'descending') return 'descending';
    return null; // 'none' or unset → preserve data insertion order
}

function buildBarSpec(config: ScaffoldConfig, data: Row[]): VegaLiteSpec {
    const xField = config.xField ?? 'x';
    const yField = config.yField ?? 'value';
    const mp = config.markParams;
    return {
        ...baseSpec(config),
        data: { values: getData(config, data) },
        mark: { type: 'bar', color: '#6366f1' },
        encoding: {
            x: {
                field: xField,
                type: 'ordinal',
                sort: vegaSortX(config),
                bandPaddingInner: mp.barInnerPadding ?? 0.1,
                bandPaddingOuter: mp.barOuterPadding ?? 0.05
            },
            y: { field: yField, type: 'quantitative' }
        }
    };
}

function buildStackedBarSpec(config: ScaffoldConfig, data: Row[]): VegaLiteSpec {
    const xField = config.xField ?? 'x';
    const yField = config.yField ?? 'value';
    const colorField = config.colorField ?? 'series';
    const mp = config.markParams;
    return {
        ...baseSpec(config),
        data: { values: getData(config, data) },
        mark: { type: 'bar' },
        encoding: {
            x: {
                field: xField,
                type: 'ordinal',
                sort: vegaSortX(config),
                bandPaddingInner: mp.barInnerPadding ?? 0.1,
                bandPaddingOuter: mp.barOuterPadding ?? 0.05
            },
            y: { field: yField, type: 'quantitative', stack: 'zero' },
            color: { field: colorField, type: 'nominal' }
        }
    };
}

function buildClusteredBarSpec(config: ScaffoldConfig, data: Row[]): VegaLiteSpec {
    const xField = config.xField ?? 'x';
    const yField = config.yField ?? 'value';
    const colorField = config.colorField ?? 'series';
    const mp = config.markParams;
    return {
        ...baseSpec(config),
        data: { values: getData(config, data) },
        mark: { type: 'bar' },
        encoding: {
            x: {
                field: xField,
                type: 'ordinal',
                sort: vegaSortX(config),
                bandPaddingInner: mp.barInnerPadding ?? 0.1,
                bandPaddingOuter: mp.barOuterPadding ?? 0.05
            },
            xOffset: { field: colorField, type: 'nominal', bandPaddingInner: mp.groupPadding ?? 0.05 },
            y: { field: yField, type: 'quantitative' },
            color: { field: colorField, type: 'nominal' }
        }
    };
}

function buildScatterSpec(config: ScaffoldConfig, data: Row[]): VegaLiteSpec {
    const xField = config.xField ?? 'x';
    const yField = config.yField ?? 'y';
    const colorField = config.colorField;
    const mp = config.markParams;
    const colorEnc = colorField ? { color: { field: colorField, type: 'nominal' } } : {};
    return {
        ...baseSpec(config),
        data: { values: getData(config, data) },
        mark: { type: 'point', size: mp.pointSize ?? 100, color: '#6366f1' },
        encoding: {
            x: { field: xField, type: 'quantitative' },
            y: { field: yField, type: 'quantitative' },
            ...colorEnc
        }
    };
}

function buildLineSpec(config: ScaffoldConfig, data: Row[]): VegaLiteSpec {
    const xField = config.xField ?? 'x';
    const yField = config.yField ?? 'value';
    const colorField = config.colorField;
    const mp = config.markParams;
    const colorEnc = colorField ? { color: { field: colorField, type: 'nominal' } } : {};
    const sharedEncoding = {
        x: { field: xField, type: 'ordinal' },
        y: { field: yField, type: 'quantitative' },
        ...colorEnc
    };
    const layers: unknown[] = [{ mark: { type: 'line', strokeWidth: mp.strokeWidth ?? 2 } }];
    if (mp.showPoints !== false) {
        layers.push({ mark: { type: 'point', size: mp.pointSize ?? 50 } });
    }
    return {
        ...baseSpec(config),
        data: { values: getData(config, data) },
        encoding: sharedEncoding,
        layer: layers
    };
}

function buildAreaSpec(config: ScaffoldConfig, data: Row[]): VegaLiteSpec {
    const xField = config.xField ?? 'x';
    const yField = config.yField ?? 'value';
    const colorField = config.colorField;
    const mp = config.markParams;
    const colorEnc = colorField ? { color: { field: colorField, type: 'nominal' } } : {};
    const sharedEncoding = {
        x: { field: xField, type: 'ordinal' },
        y: { field: yField, type: 'quantitative' },
        ...colorEnc
    };
    const layers: unknown[] = [
        { mark: { type: 'area', fillOpacity: mp.fillOpacity ?? 0.4, strokeWidth: mp.strokeWidth ?? 1.5 } }
    ];
    if (mp.showPoints) {
        layers.push({ mark: { type: 'point', size: mp.pointSize ?? 50 } });
    }
    return {
        ...baseSpec(config),
        data: { values: getData(config, data) },
        encoding: sharedEncoding,
        layer: layers
    };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Build a Vega-Lite spec from the scaffold config + data rows.
 * For synthetic data (dataMode === 'synthetic'), the rows arg is ignored.
 */
export function buildVegaSpec(config: ScaffoldConfig, data: Row[]): VegaLiteSpec {
    switch (config.chartType) {
        case 'bar':
            return buildBarSpec(config, data);
        case 'stacked-bar':
            return buildStackedBarSpec(config, data);
        case 'clustered-bar':
            return buildClusteredBarSpec(config, data);
        case 'scatter':
            return buildScatterSpec(config, data);
        case 'line':
            return buildLineSpec(config, data);
        case 'area':
            return buildAreaSpec(config, data);
        default:
            // Fallback: render as a bar chart so something is always shown
            return buildBarSpec(config, data);
    }
}
