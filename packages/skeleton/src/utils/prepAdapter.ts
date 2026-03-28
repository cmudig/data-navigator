import type { PrepState, SchemaState, ScaffoldConfig } from '../store/appState';

/**
 * Extract the wizard nav-direction answer ('leftright' | 'updown' | 'brackets') for a dimension.
 * Stored in the 'navigation' chapter answers as 'nav-within-${dimKey}'.
 */
function getNavPreset(prep: PrepState, dimKey: string): string | undefined {
    const ch = prep.qaProgress.chapters.find(c => c.id === 'navigation')?.answers ?? {};
    const val = ch[`nav-within-${dimKey}`];
    return typeof val === 'string' ? val : undefined;
}

/**
 * Detect appropriate xField / yField / colorField for a given chart type.
 *
 * Heuristic priority order (stacked-bar / clustered-bar):
 *   1. Nav-direction wizard answer: categorical with navPreset='leftright' → x-axis
 *      (user chose left/right spatial navigation = left/right visual axis)
 *   2. User-confirmed dim type: numerical → y; remaining categorical → color
 *   3. Data column scan (allColumns, insertion order): fills any still-undefined field
 *      from the first unused column of the right type. Covers BOTH categoricals and
 *      numericals — needed when a user only declared 1 dimension in prep.
 *
 * Other chart types use simpler rules; the full heuristic system will be extended
 * to them as each is validated (scatter / line / area are next).
 */
export function detectFieldsForChartType(
    chartType: string,
    dims: {
        key: string;
        type: 'categorical' | 'numerical';
        navIndex?: number | null;
        navPreset?: string; // wizard answer: 'leftright' | 'updown' | 'brackets'
    }[],
    allColumns?: { key: string; type: 'categorical' | 'numerical' }[]
): { xField?: string; yField?: string; colorField?: string } {
    const cats = dims.filter(d => d.type === 'categorical').map(d => d.key);
    const nums = dims.filter(d => d.type === 'numerical').map(d => d.key);

    if (chartType === 'scatter') {
        const assigned = new Set<string>();

        // Step 1: xField — numerical with left/right nav
        let xField: string | undefined =
            dims.find(d => d.type === 'numerical' && d.navPreset === 'leftright')?.key ??
            dims.find(d => d.type === 'numerical')?.key ??
            allColumns?.find(c => c.type === 'numerical')?.key;
        if (xField) assigned.add(xField);

        // Step 2: yField — first unused numerical (no navPreset assumption)
        let yField: string | undefined =
            dims.find(d => d.type === 'numerical' && !assigned.has(d.key))?.key ??
            allColumns?.find(c => c.type === 'numerical' && !assigned.has(c.key))?.key;
        if (yField) assigned.add(yField);

        // Step 3: colorField — first categorical (no navPreset assumption)
        const colorField: string | undefined =
            dims.find(d => d.type === 'categorical')?.key ?? allColumns?.find(c => c.type === 'categorical')?.key;

        return { xField, yField, colorField };
    }

    if (chartType === 'stacked-bar' || chartType === 'clustered-bar') {
        const assigned = new Set<string>();

        // Step 1: xField — categorical configured with left/right wizard nav
        let xField: string | undefined =
            dims.find(d => d.type === 'categorical' && d.navPreset === 'leftright')?.key ??
            dims.find(d => d.type === 'categorical')?.key ?? // fallback: first cat dim
            allColumns?.find(c => c.type === 'categorical')?.key; // fallback: first cat column
        if (xField) assigned.add(xField);

        // Step 2: yField — numerical dim, then column scan
        let yField: string | undefined =
            dims.find(d => d.type === 'numerical')?.key ??
            allColumns?.find(c => c.type === 'numerical' && !assigned.has(c.key))?.key;
        if (yField) assigned.add(yField);

        // Step 3: colorField — remaining categorical dim, then column scan
        const colorField: string | undefined =
            dims.find(d => d.type === 'categorical' && !assigned.has(d.key))?.key ??
            allColumns?.find(c => c.type === 'categorical' && !assigned.has(c.key))?.key;

        return { xField, yField, colorField };
    }

    if (chartType === 'line' || chartType === 'area') {
        return { xField: cats[0], yField: nums[0], colorField: cats[1] };
    }
    // bar (and any unknown type)
    return { xField: cats[0], yField: nums[0] };
}

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
            const includedDims = schemaState.dimensions
                .filter(d => d.included)
                .map(d => ({
                    key: d.key,
                    type: d.type,
                    navIndex: d.navIndex,
                    navPreset: getNavPreset(prep, d.key)
                }));
            const allColumns = prep.variables.filter(v => !v.removed).map(v => ({ key: v.key, type: v.type }));
            const detected = detectFieldsForChartType(
                (existing.chartType as string) ?? 'bar',
                includedDims,
                allColumns
            );
            const xField = existing.xField ?? detected.xField;
            const yField = existing.yField ?? detected.yField;
            const colorField = existing.colorField ?? detected.colorField;
            if (xField || yField) return { ...existing, xField, yField, colorField };
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
    let colorField: string | undefined;
    if (hasData && schemaState) {
        const includedDims = schemaState.dimensions
            .filter(d => d.included)
            .map(d => ({
                key: d.key,
                type: d.type,
                navIndex: d.navIndex,
                navPreset: getNavPreset(prep, d.key)
            }));
        const allColumns = prep.variables.filter(v => !v.removed).map(v => ({ key: v.key, type: v.type }));
        const detected = detectFieldsForChartType(chartType, includedDims, allColumns);
        xField = detected.xField;
        yField = detected.yField;
        colorField = detected.colorField;
    }

    const needsSeries =
        chartType === 'stacked-bar' || chartType === 'clustered-bar' || chartType === 'line' || chartType === 'area';

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
        colorField,
        syntheticConfig: hasData
            ? undefined
            : {
                  categories: ['A', 'B', 'C', 'D'],
                  seriesNames: needsSeries ? ['Series 1', 'Series 2'] : undefined,
                  xField: 'category',
                  yField: 'value',
                  colorField: needsSeries ? 'series' : undefined
              }
    };
}
