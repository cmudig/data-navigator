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
    const horizontal = config.barOrientation === 'horizontal';
    const bandScale = { paddingInner: mp.barInnerPadding ?? 0.1, paddingOuter: mp.barOuterPadding ?? 0.05 };
    return {
        ...baseSpec(config),
        data: { values: getData(config, data) },
        mark: { type: 'bar', color: '#6366f1' },
        encoding: horizontal
            ? {
                  y: { field: xField, type: 'ordinal', sort: vegaSortX(config), scale: bandScale },
                  x: { field: yField, type: 'quantitative' }
              }
            : {
                  x: { field: xField, type: 'ordinal', sort: vegaSortX(config), scale: bandScale },
                  y: { field: yField, type: 'quantitative' }
              }
    };
}

function buildStackedBarSpec(config: ScaffoldConfig, data: Row[]): VegaLiteSpec {
    const xField = config.xField ?? 'x';
    const yField = config.yField ?? 'value';
    const colorField = config.colorField ?? 'series';
    const mp = config.markParams;
    const horizontal = config.barOrientation === 'horizontal';
    const bandScale = { paddingInner: mp.barInnerPadding ?? 0.1, paddingOuter: mp.barOuterPadding ?? 0.05 };
    return {
        ...baseSpec(config),
        data: { values: getData(config, data) },
        mark: { type: 'bar' },
        encoding: horizontal
            ? {
                  y: { field: xField, type: 'ordinal', sort: vegaSortX(config), scale: bandScale },
                  x: { field: yField, type: 'quantitative', stack: 'zero' },
                  color: { field: colorField, type: 'nominal' }
              }
            : {
                  x: { field: xField, type: 'ordinal', sort: vegaSortX(config), scale: bandScale },
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
    const horizontal = config.barOrientation === 'horizontal';
    const bandScale = { paddingInner: mp.barInnerPadding ?? 0.1, paddingOuter: mp.barOuterPadding ?? 0.05 };
    const offsetScale = { paddingInner: mp.groupPadding ?? 0.05 };
    return {
        ...baseSpec(config),
        data: { values: getData(config, data) },
        mark: { type: 'bar' },
        encoding: horizontal
            ? {
                  y: { field: xField, type: 'ordinal', sort: vegaSortX(config), scale: bandScale },
                  yOffset: { field: colorField, type: 'nominal', scale: offsetScale },
                  x: { field: yField, type: 'quantitative' },
                  color: { field: colorField, type: 'nominal' }
              }
            : {
                  x: { field: xField, type: 'ordinal', sort: vegaSortX(config), scale: bandScale },
                  xOffset: { field: colorField, type: 'nominal', scale: offsetScale },
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

    // zero: false — scatter axes should start from data extent, not 0.
    // Domain overrides let users match an image's axis range when it differs from the data extent.
    const xScale: Record<string, unknown> = { zero: false };
    if (config.xDomainMin != null || config.xDomainMax != null) {
        xScale.domain = [config.xDomainMin ?? null, config.xDomainMax ?? null];
    }
    const yScale: Record<string, unknown> = { zero: false };
    if (config.yDomainMin != null || config.yDomainMax != null) {
        yScale.domain = [config.yDomainMin ?? null, config.yDomainMax ?? null];
    }

    // Size: data-driven field OR static value (default 30)
    const sizeEnc = mp.pointSizeField ? { size: { field: mp.pointSizeField, type: 'quantitative' } } : {};
    const markSize = mp.pointSizeField ? undefined : (mp.pointSize ?? 30);

    return {
        ...baseSpec(config),
        data: { values: getData(config, data) },
        mark: { type: 'point', ...(markSize != null ? { size: markSize } : {}), color: '#6366f1' },
        encoding: {
            x: { field: xField, type: 'quantitative', scale: xScale },
            y: { field: yField, type: 'quantitative', scale: yScale },
            ...sizeEnc,
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
        x: { field: xField, type: 'ordinal', sort: vegaSortX(config) },
        y: { field: yField, type: 'quantitative' },
        ...colorEnc
    };
    return {
        ...baseSpec(config),
        data: { values: getData(config, data) },
        mark: { type: 'line', strokeWidth: mp.strokeWidth ?? 2, point: { size: mp.pointSize ?? 300 } },
        encoding: sharedEncoding
    };
}

function buildAreaSpec(config: ScaffoldConfig, data: Row[]): VegaLiteSpec {
    const xField = config.xField ?? 'x';
    const yField = config.yField ?? 'value';
    const colorField = config.colorField;
    const mp = config.markParams;
    const colorEnc = colorField ? { color: { field: colorField, type: 'nominal' } } : {};
    const sharedEncoding = {
        x: { field: xField, type: 'ordinal', sort: vegaSortX(config) },
        y: { field: yField, type: 'quantitative' },
        ...colorEnc
    };
    return {
        ...baseSpec(config),
        data: { values: getData(config, data) },
        mark: {
            type: 'area',
            fillOpacity: mp.fillOpacity ?? 0.4,
            strokeWidth: mp.strokeWidth ?? 1.5,
            point: { size: mp.pointSize ?? 300 }
        },
        encoding: sharedEncoding
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

/*
 * ── FUTURE CHART TYPE CHANNEL REQUIREMENTS ────────────────────────────────────
 *
 * When adding new chart types, each will need the following Vega-Lite channels,
 * auto-detect logic in detectFieldsForChartType (prepAdapter.ts), and possibly
 * new ScaffoldConfig fields.
 *
 * CHART TYPE      REQUIRED CHANNELS                     AUTO-DETECT FROM           SCAFFOLDCONFIG CHANGES NEEDED
 * ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
 * pie / donut     theta (NUM), color (CAT)               first NUM → thetaField     Add thetaField; x/y not used.
 *                                                        first CAT → colorField     positionNodesFromVegaScales:
 *                                                                                   arc marks need arc centroid math
 *                                                                                   (no band/linear scales); use SVG extraction.
 *
 * heatmap         x (ordinal CAT), y (ordinal CAT),      first CAT → xField         No new fields needed.
 *                 color (quant NUM)                      second CAT → yField        positionNodesFromVegaScales:
 *                                                        first NUM → colorField     both x/y are band scales;
 *                                                                                   positioning is straightforward (like clustered-bar).
 *                                                                                   Note: colorField encodes value, not series.
 *
 * treemap         size (NUM), category hierarchy         first NUM → sizeField      Add sizeField + optional parentField.
 *                 (1–2 CAT levels for outer/inner)       first CAT → outer group    Vega-Lite has NO treemap mark — requires
 *                                                        second CAT → inner group   a raw Vega spec with a treemap transform,
 *                                                                                   or a pre-computed layout. SVG extraction
 *                                                                                   is the only viable positioning path.
 *
 * ── SMARTER PREP → SCAFFOLD FIELD MAPPING (pre-work for the above) ────────────
 *
 * Before implementing pie/heatmap/treemap scaffolding, the prep Q/A flow and
 * dimension suggestions (dimensionSuggestions.ts) need to surface:
 *
 * - pie/donut:   Single-level structure (1 CAT as labels, 1 NUM as angle/size).
 *                No x/y axis concept. Scaffold should skip axis padding UI.
 *
 * - heatmap:     Exactly 2 CAT dimensions (forming a grid) + 1 NUM (fill color).
 *                Both categorical axes are ordinal — detect via 2 included CAT dims.
 *
 * - treemap:     Hierarchical data: either parent-child rows with an explicit
 *                parent key, or 2 CAT dimensions (outer group + inner group) + 1 NUM.
 *                Requires raw Vega (not Vega-Lite) for the layout transform.
 *                positionNodesFromVegaScales cannot be used; fall back to extractMarksFromSVG.
 */
