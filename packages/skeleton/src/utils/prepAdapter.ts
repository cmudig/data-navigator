import type { PrepState, SchemaState, ScaffoldConfig } from '../store/appState';

/**
 * Final-sync: re-derive key schemaState fields from saved Q/A answers.
 *
 * Called once at step transition (Prep → Editor). Most schemaState fields are
 * already correct — they are written incrementally by QAEngine's schemaPatch
 * callbacks per question. This function is a safety-net reconciliation: if a
 * user re-answered Chapter 1 without re-running later chapters, this ensures
 * level0Enabled and level0Id reflect the canonical Chapter 1 answers.
 *
 * Does NOT touch dimensions, nav keys, extents, childmostNavigation, or
 * level1 settings — those are owned by QAEngine incremental writes.
 */
export function applyPrepToSchema(prep: PrepState, current: SchemaState): SchemaState {
    const ch1 = prep.qaProgress.chapters.find(c => c.id === 'top-level-access')?.answers ?? {};

    const level0Enabled = ch1['root-node'] === 'yes';
    const level0Id = ((ch1['root-label'] as string) || '').trim() || current.level0Id || 'root';

    return {
        ...current,
        level0Enabled,
        level0Id,
        // Copy label templates from prep so SchemaPanel can edit them independently.
        // If the user then edits labels in SchemaPanel, those edits stay in schemaState.labelConfig
        // and do not write back to prepState.
        labelConfig: prep.labelConfig
    };
}

/**
 * Seed a default ScaffoldConfig when transitioning from Prep → Editor.
 *
 * If a ScaffoldConfig already exists (user re-entered Editor after configuring scaffold),
 * it is returned unchanged so user adjustments are not lost.
 *
 * Chart type is read from the Q/A answer for 'chart-type' in chapter 1.
 * Plot dimensions default to ~65% of the image size, centered in the image.
 */
export function seedScaffoldConfig(
    prep: PrepState,
    existing: ScaffoldConfig | null,
    imageWidth: number | null,
    imageHeight: number | null,
    hasData: boolean,
    schemaState?: SchemaState | null
): ScaffoldConfig {
    // If existing config already has field mappings, preserve it entirely.
    // If fields are missing (e.g. config was seeded before this feature), patch them in.
    if (existing) {
        if (existing.xField && existing.yField) return existing;
        if (hasData && schemaState) {
            const includedDims = schemaState.dimensions.filter(d => d.included);
            const xField = existing.xField ?? includedDims.find(d => d.type === 'categorical')?.key;
            const yField = existing.yField ?? includedDims.find(d => d.type === 'numerical')?.key;
            if (xField || yField) return { ...existing, xField, yField };
        }
        return existing;
    }

    const ch1 = prep.qaProgress.chapters.find(c => c.id === 'top-level-access')?.answers ?? {};
    const rawChartType = (ch1['chart-type'] as string | undefined) ?? 'bar';
    // Normalise custom entries to 'bar' as fallback
    const SUPPORTED = ['bar', 'stacked-bar', 'clustered-bar', 'scatter', 'line', 'area'] as const;
    type SupportedType = (typeof SUPPORTED)[number];
    const chartType: SupportedType = (SUPPORTED as readonly string[]).includes(rawChartType)
        ? (rawChartType as SupportedType)
        : 'bar';

    const imgW = imageWidth ?? 800;
    const imgH = imageHeight ?? 600;

    // Padding: top/right are minimal; left/bottom reserve space for axis labels.
    // If the image is very small, collapse all padding to 0 to avoid negative plot area.
    const TOO_SMALL = 200;
    let paddingTop: number, paddingRight: number, paddingLeft: number, paddingBottom: number;
    if (imgW < TOO_SMALL || imgH < TOO_SMALL) {
        paddingTop = paddingRight = paddingLeft = paddingBottom = 0;
    } else {
        paddingTop = 10;
        paddingRight = 10;
        paddingLeft = Math.round(Math.max(50, imgW * 0.07));
        paddingBottom = Math.round(Math.max(50, imgH * 0.07));
    }

    // plotWidth/plotHeight are the OUTER box (border-box model): full image dimensions.
    // vegaBuilder subtracts padding internally to get the inner mark area.
    const plotWidth = imgW;
    const plotHeight = imgH;
    const offsetX = 0;
    const offsetY = 0;

    // Auto-detect field names from schema dimensions when using CSV data
    let xField: string | undefined;
    let yField: string | undefined;
    if (hasData && schemaState) {
        const includedDims = schemaState.dimensions.filter(d => d.included);
        xField = includedDims.find(d => d.type === 'categorical')?.key;
        yField = includedDims.find(d => d.type === 'numerical')?.key;
    }

    return {
        chartType,
        offsetX,
        offsetY,
        plotWidth,
        plotHeight,
        paddingLeft,
        paddingTop,
        paddingRight,
        paddingBottom,
        markParams: {},
        dataMode: hasData ? 'csv' : 'synthetic',
        xField,
        yField,
        syntheticConfig: hasData
            ? undefined
            : {
                  categories: ['A', 'B', 'C', 'D'],
                  seriesNames:
                      chartType === 'stacked-bar' || chartType === 'clustered-bar'
                          ? ['Series 1', 'Series 2']
                          : undefined,
                  xField: 'category',
                  yField: 'value',
                  colorField: chartType === 'stacked-bar' || chartType === 'clustered-bar' ? 'series' : undefined
              }
    };
}
