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
    hasData: boolean
): ScaffoldConfig {
    if (existing) return existing;

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

    // Plot area = 65% of image, centered
    const plotWidth = Math.round(imgW * 0.65);
    const plotHeight = Math.round(imgH * 0.55);
    const paddingLeft = Math.round(imgW * 0.12);
    const paddingTop = Math.round(imgH * 0.08);
    const paddingRight = Math.round(imgW * 0.05);
    const paddingBottom = Math.round(imgH * 0.12);
    const offsetX = Math.round((imgW - plotWidth - paddingLeft - paddingRight) / 2);
    const offsetY = Math.round((imgH - plotHeight - paddingTop - paddingBottom) / 2);

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
