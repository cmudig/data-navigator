<script lang="ts">
    import { onDestroy } from 'svelte';
    import { appState } from '../../../store/appState';
    import type { ScaffoldConfig, SyntheticDataConfig, PrepState, SchemaState, VariableMeta } from '../../../store/appState';
    import type { SkeletonNode } from '../../../store/types';
    import { extractValues, extractXYValues } from '../../../utils/valueExtractor';
    import { latestView } from '../../../store/scaffoldRuntime';
    import { logAction, logActionDebounced } from '../../../store/historyStore';
    import type { GroupShapeConfig, BonusRect } from '../../../store/appState';
    import { detectFieldsForChartType } from '../../../utils/prepAdapter';

    // ── Store sync ────────────────────────────────────────────────────────────
    let config = $state<ScaffoldConfig | null>(null);
    let prepState = $state<PrepState | null>(null);
    let schemaState = $state<SchemaState | null>(null);
    let committedScaffoldNodes = $state<SkeletonNode[]>([]);
    let allNodes = $state<SkeletonNode[]>([]);
    let uploadedData = $state<Record<string, unknown>[] | null>(null);

    const _unsub = appState.subscribe(s => {
        config = s.scaffoldConfig;
        prepState = s.prepState;
        schemaState = s.schemaState;
        committedScaffoldNodes = [...s.nodes.values()].filter(n => n.source === 'scaffold');
        allNodes = [...s.nodes.values()];
        uploadedData = s.uploadedData;
    });
    onDestroy(_unsub);

    // Derived node lists for Group Shapes panel
    const dimensionNodes = $derived(allNodes.filter(n => n.dnLevel === 1));
    const divisionNodes  = $derived(allNodes.filter(n => n.dnLevel === 2));
    const divisionsByDimension = $derived(() => {
        const map = new Map<string, SkeletonNode[]>();
        for (const n of divisionNodes) {
            const key = n.dimensionKey ?? 'unknown';
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(n);
        }
        return map;
    });

    // ── Done ──────────────────────────────────────────────────────────────────
    function handleDone() {
        logAction('Applied scaffold positions');
        appState.update(s => ({ ...s, scaffoldModeActive: false }));
    }

    // ── Extract values ────────────────────────────────────────────────────────
    function handleExtractValues() {
        if (!latestView) {
            window.alert('No scaffold render available. Try re-entering scaffold mode to regenerate the chart.');
            return;
        }
        const s = (() => { let val: import('../../../store/appState').AppState; appState.subscribe(v => val = v)(); return val!; })();
        const cfg = s.scaffoldConfig;
        if (!cfg) return;

        const nodes = [...s.nodes.values()];
        const updated = cfg.chartType === 'scatter'
            ? extractXYValues(latestView, nodes, cfg)
            : extractValues(latestView, nodes, cfg, extractCalibNodeId, extractCalibValue);

        appState.update(st => {
            const nextNodes = new Map(st.nodes);
            for (const node of updated) nextNodes.set(node.id, node);
            return { ...st, nodes: nextNodes };
        });

        logAction('Extracted values from scaffold');
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    const chartTypeLabel = $derived.by(() => {
        const ct = config?.chartType ?? prepState?.qaProgress?.chapters?.[0]?.answers?.['chart-type'];
        return ct ? String(ct) : 'unknown';
    });

    const showSeriesFields = $derived(
        config?.chartType === 'stacked-bar' ||
        config?.chartType === 'clustered-bar' ||
        config?.chartType === 'line' ||
        config?.chartType === 'area'
    );

    // Available column names for field mapping dropdowns.
    // CSV mode: derived from the first uploaded data row.
    // Synthetic mode: the field names used in the generated data.
    const availableColumns = $derived.by(() => {
        if (config?.dataMode === 'csv') {
            return uploadedData?.[0] ? Object.keys(uploadedData[0]) : [];
        }
        const sc = config?.syntheticConfig;
        if (!sc) return [];
        return [sc.xField, sc.yField, ...(sc.colorField ? [sc.colorField] : [])];
    });

    // ── Extract values state ──────────────────────────────────────────────────
    let extractCalibNodeId = $state('');
    let extractCalibValue = $state<number>(0);
    const showExtractForm = $derived(committedScaffoldNodes.length > 0 && config?.dataMode === 'synthetic');

    // ── Param updaters ────────────────────────────────────────────────────────
    function patchConfig(patch: Partial<ScaffoldConfig>) {
        appState.update(s => ({
            ...s,
            scaffoldConfig: s.scaffoldConfig ? { ...s.scaffoldConfig, ...patch } : s.scaffoldConfig
        }));
        logActionDebounced('Scaffold config changed');
    }

    function patchMarkParams(patch: Partial<ScaffoldConfig['markParams']>) {
        appState.update(s => ({
            ...s,
            scaffoldConfig: s.scaffoldConfig
                ? { ...s.scaffoldConfig, markParams: { ...s.scaffoldConfig.markParams, ...patch } }
                : s.scaffoldConfig
        }));
        logActionDebounced('Scaffold config changed');
    }

    // ── Chart type change ─────────────────────────────────────────────────────
    function handleChartTypeChange(newType: string) {
        const navAnswers = prepState?.qaProgress?.chapters.find(c => c.id === 'navigation')?.answers ?? {};

        // Build allColumns from user-confirmed variable types in insertion order.
        // Falls back to row-scan (CSV) or syntheticConfig fields when prep hasn't been run.
        let allColumns: { key: string; type: 'categorical' | 'numerical' }[] =
            (prepState?.variables ?? [])
                .filter((v: VariableMeta) => !v.removed)
                .map((v: VariableMeta) => ({ key: v.key, type: v.type }));

        if (allColumns.length === 0 && config?.dataMode === 'csv' && uploadedData?.[0]) {
            const row = uploadedData[0];
            allColumns = Object.keys(row).map(k => ({
                key: k,
                type: (typeof row[k] === 'number' ? 'numerical' : 'categorical') as 'categorical' | 'numerical'
            }));
        } else if (allColumns.length === 0 && config?.syntheticConfig) {
            const sc = config.syntheticConfig;
            allColumns = [
                { key: sc.xField, type: 'categorical' },
                { key: sc.yField, type: 'numerical' },
                ...(sc.colorField ? [{ key: sc.colorField, type: 'categorical' as const }] : [])
            ];
        }

        // Build enriched dims from included schema dimensions with wizard nav-direction answers
        let dims: { key: string; type: 'categorical' | 'numerical'; navIndex?: number | null; navPreset?: string }[] = [];
        if (schemaState) {
            const includedDims = schemaState.dimensions.filter(d => d.included);
            dims = (includedDims.length > 0 ? includedDims : schemaState.dimensions).map(d => ({
                key: d.key,
                type: d.type,
                navIndex: d.navIndex,
                navPreset: typeof navAnswers[`nav-within-${d.key}`] === 'string'
                    ? (navAnswers[`nav-within-${d.key}`] as string)
                    : undefined
            }));
        }

        const detected = detectFieldsForChartType(newType, dims, allColumns);
        patchConfig({ chartType: newType, ...detected });
        logAction(`Chart type changed to ${newType}`);
    }

    // ── Group shape helpers ───────────────────────────────────────────────────

    function defaultGroupShapeConfig(): GroupShapeConfig {
        return {
            rootEnabled: false, rootStrategy: 'convexHull', rootPadding: 8,
            dimensionEnabled: false, dimensionStrategy: 'convexHull', dimensionPadding: 6,
            dimensionBonusRects: {},
            divisionEnabled: false, divisionStrategy: 'convexHull', divisionPadding: 4,
            divisionBonusRects: {}
        };
    }

    function patchGroupShapes(patch: Partial<GroupShapeConfig>) {
        appState.update(s => {
            if (!s.scaffoldConfig) return s;
            const prev = s.scaffoldConfig.groupShapes ?? defaultGroupShapeConfig();
            return {
                ...s,
                scaffoldConfig: { ...s.scaffoldConfig, groupShapes: { ...prev, ...patch } }
            };
        });
        logActionDebounced('Group shapes changed');
    }

    function toggleBonusRect(
        level: 'dimension' | 'division',
        key: string,
        enabled: boolean,
        fallbackX: number,
        fallbackY: number
    ) {
        appState.update(s => {
            if (!s.scaffoldConfig) return s;
            const prev = s.scaffoldConfig.groupShapes ?? defaultGroupShapeConfig();
            const field = level === 'dimension' ? 'dimensionBonusRects' : 'divisionBonusRects';
            const existing = prev[field][key];
            const updated: BonusRect = existing
                ? { ...existing, enabled }
                : { enabled, x: fallbackX, y: fallbackY, width: 80, height: 40 };
            return {
                ...s,
                scaffoldConfig: {
                    ...s.scaffoldConfig,
                    groupShapes: { ...prev, [field]: { ...prev[field], [key]: updated } }
                }
            };
        });
        logActionDebounced('Group shapes changed');
    }

    function patchBonusRect(
        level: 'dimension' | 'division',
        key: string,
        patch: Partial<BonusRect>
    ) {
        appState.update(s => {
            if (!s.scaffoldConfig) return s;
            const prev = s.scaffoldConfig.groupShapes ?? defaultGroupShapeConfig();
            const field = level === 'dimension' ? 'dimensionBonusRects' : 'divisionBonusRects';
            const existing = prev[field][key] ?? { enabled: true, x: 0, y: 0, width: 80, height: 40 };
            return {
                ...s,
                scaffoldConfig: {
                    ...s.scaffoldConfig,
                    groupShapes: { ...prev, [field]: { ...prev[field], [key]: { ...existing, ...patch } } }
                }
            };
        });
        logActionDebounced('Group shapes changed');
    }

    // Convenience getter so template can reference gs without null checks
    const gs = $derived(
        config?.groupShapes ?? {
            rootEnabled: false, rootStrategy: 'convexHull' as const, rootPadding: 8,
            dimensionEnabled: false, dimensionStrategy: 'convexHull' as const, dimensionPadding: 6,
            dimensionBonusRects: {},
            divisionEnabled: false, divisionStrategy: 'convexHull' as const, divisionPadding: 4,
            divisionBonusRects: {}
        }
    );

    function patchSyntheticConfig(patch: Partial<SyntheticDataConfig>) {
        appState.update(s => {
            if (!s.scaffoldConfig) return s;
            const prev = s.scaffoldConfig.syntheticConfig ?? {
                categories: [], xField: 'category', yField: 'value', seriesNames: [], colorField: 'series'
            };
            return {
                ...s,
                scaffoldConfig: { ...s.scaffoldConfig, syntheticConfig: { ...prev, ...patch } }
            };
        });
        logActionDebounced('Scaffold config changed');
    }

    function updateCategories(raw: string) {
        const cats = raw.split(',').map(s => s.trim()).filter(Boolean);
        patchSyntheticConfig({ categories: cats });
    }

    function updateSeriesNames(raw: string) {
        const names = raw.split(',').map(s => s.trim()).filter(Boolean);
        patchSyntheticConfig({ seriesNames: names });
    }

    function applyExtractValues() {
        if (!extractCalibNodeId || extractCalibValue <= 0) return;
        handleExtractValues();
    }
</script>

{#if config}
<aside class="scaffold-panel" aria-label="Scaffold mode controls">

    <!-- Header -->
    <div class="panel-header">
        <span class="panel-title">Scaffold</span>
        <span class="chart-type-badge">{chartTypeLabel}</span>
        <span class="data-mode-badge" class:synthetic={config.dataMode === 'synthetic'}>
            {config.dataMode === 'synthetic' ? 'No data' : 'CSV data'}
        </span>
    </div>

    <!-- Chart type override -->
    <section class="param-section">
        <h3 class="section-heading">Chart type</h3>
        <div class="param-grid">
            <label class="param-row">
                <span class="param-label">Type</span>
                <select class="param-select"
                    value={config.chartType}
                    onchange={(e) => handleChartTypeChange(e.currentTarget.value)}
                >
                    <option value="bar">Bar</option>
                    <option value="stacked-bar">Stacked bar</option>
                    <option value="clustered-bar">Clustered bar</option>
                    <option value="scatter">Scatter</option>
                    <option value="line">Line</option>
                    <option value="area">Area</option>
                </select>
            </label>
        </div>
    </section>

    <!-- Chart position & size -->
    <section class="param-section">
        <h3 class="section-heading">Position &amp; size</h3>
        <div class="param-grid">
            <label class="param-row">
                <span class="param-label">Offset X</span>
                <input type="number" class="param-input" step="1"
                    value={config.offsetX}
                    oninput={(e) => patchConfig({ offsetX: +e.currentTarget.value })}
                />
            </label>
            <label class="param-row">
                <span class="param-label">Offset Y</span>
                <input type="number" class="param-input" step="1"
                    value={config.offsetY}
                    oninput={(e) => patchConfig({ offsetY: +e.currentTarget.value })}
                />
            </label>
            <label class="param-row">
                <span class="param-label">Width</span>
                <input type="number" class="param-input" step="10" min="50"
                    value={config.plotWidth}
                    oninput={(e) => patchConfig({ plotWidth: +e.currentTarget.value })}
                />
            </label>
            <label class="param-row">
                <span class="param-label">Height</span>
                <input type="number" class="param-input" step="10" min="50"
                    value={config.plotHeight}
                    oninput={(e) => patchConfig({ plotHeight: +e.currentTarget.value })}
                />
            </label>
        </div>
    </section>

    <!-- Axis padding -->
    <section class="param-section">
        <h3 class="section-heading">Axis padding</h3>
        <div class="param-grid">
            <label class="param-row">
                <span class="param-label">Left</span>
                <input type="number" class="param-input" step="5" min="0"
                    value={config.paddingLeft}
                    oninput={(e) => patchConfig({ paddingLeft: +e.currentTarget.value })}
                />
            </label>
            <label class="param-row">
                <span class="param-label">Top</span>
                <input type="number" class="param-input" step="5" min="0"
                    value={config.paddingTop}
                    oninput={(e) => patchConfig({ paddingTop: +e.currentTarget.value })}
                />
            </label>
            <label class="param-row">
                <span class="param-label">Right</span>
                <input type="number" class="param-input" step="5" min="0"
                    value={config.paddingRight}
                    oninput={(e) => patchConfig({ paddingRight: +e.currentTarget.value })}
                />
            </label>
            <label class="param-row">
                <span class="param-label">Bottom</span>
                <input type="number" class="param-input" step="5" min="0"
                    value={config.paddingBottom}
                    oninput={(e) => patchConfig({ paddingBottom: +e.currentTarget.value })}
                />
            </label>
        </div>
    </section>

    <!-- Field mapping (Vega encoding channels) -->
    <section class="param-section">
        <h3 class="section-heading">Field mapping</h3>
        <div class="param-grid">
            <label class="param-row">
                <span class="param-label">x</span>
                <select class="param-select"
                    value={config.xField ?? ''}
                    onchange={(e) => patchConfig({ xField: e.currentTarget.value || undefined })}
                >
                    <option value="">— auto —</option>
                    {#each availableColumns as col}
                        <option value={col}>{col}</option>
                    {/each}
                </select>
            </label>
            <label class="param-row">
                <span class="param-label">y</span>
                <select class="param-select"
                    value={config.yField ?? ''}
                    onchange={(e) => patchConfig({ yField: e.currentTarget.value || undefined })}
                >
                    <option value="">— auto —</option>
                    {#each availableColumns as col}
                        <option value={col}>{col}</option>
                    {/each}
                </select>
            </label>
            <label class="param-row">
                <span class="param-label">color</span>
                <select class="param-select"
                    value={config.colorField ?? ''}
                    onchange={(e) => patchConfig({ colorField: e.currentTarget.value || undefined })}
                >
                    <option value="">— none —</option>
                    {#each availableColumns as col}
                        <option value={col}>{col}</option>
                    {/each}
                </select>
            </label>
            <label class="param-row">
                <span class="param-label">Sort</span>
                <select class="param-select"
                    value={config.sortX ?? 'none'}
                    onchange={(e) => patchConfig({ sortX: e.currentTarget.value as 'none' | 'ascending' | 'descending' })}
                >
                    <option value="none">Data order</option>
                    <option value="ascending">Ascending</option>
                    <option value="descending">Descending</option>
                </select>
            </label>
        </div>
    </section>

    <!-- Mark params (chart-type-specific) -->
    <section class="param-section">
        <h3 class="section-heading">Mark params</h3>
        <div class="param-grid">
            {#if config.chartType === 'bar' || config.chartType === 'stacked-bar' || config.chartType === 'clustered-bar'}
                <label class="param-row">
                    <span class="param-label">Orientation</span>
                    <select class="param-select"
                        value={config.barOrientation ?? 'vertical'}
                        onchange={(e) => {
                            const next = e.currentTarget.value as 'vertical' | 'horizontal';
                            if (next !== (config.barOrientation ?? 'vertical')) {
                                patchConfig({ barOrientation: next });
                            }
                        }}
                    >
                        <option value="vertical">Vertical</option>
                        <option value="horizontal">Horizontal</option>
                    </select>
                </label>
                <label class="param-row">
                    <span class="param-label">Bar spacing</span>
                    <input type="range" class="param-slider" min="0" max="0.9" step="0.05"
                        value={config.markParams.barInnerPadding ?? 0.1}
                        oninput={(e) => patchMarkParams({ barInnerPadding: +e.currentTarget.value })}
                    />
                    <span class="param-val">{(config.markParams.barInnerPadding ?? 0.1).toFixed(2)}</span>
                </label>
                {#if config.chartType === 'clustered-bar'}
                    <label class="param-row">
                        <span class="param-label">Group spacing</span>
                        <input type="range" class="param-slider" min="0" max="0.9" step="0.05"
                            value={config.markParams.groupPadding ?? 0.05}
                            oninput={(e) => patchMarkParams({ groupPadding: +e.currentTarget.value })}
                        />
                        <span class="param-val">{(config.markParams.groupPadding ?? 0.05).toFixed(2)}</span>
                    </label>
                {/if}
            {/if}
            {#if config.chartType === 'scatter'}
                <label class="param-row">
                    <span class="param-label">Point size</span>
                    <input type="number" class="param-input" step="10" min="10" max="500"
                        value={config.markParams.pointSize ?? 100}
                        oninput={(e) => patchMarkParams({ pointSize: +e.currentTarget.value })}
                    />
                </label>
            {/if}
            {#if config.chartType === 'line' || config.chartType === 'area'}
                <label class="param-row">
                    <span class="param-label">Stroke width</span>
                    <input type="number" class="param-input" step="0.5" min="0.5" max="10"
                        value={config.markParams.strokeWidth ?? 2}
                        oninput={(e) => patchMarkParams({ strokeWidth: +e.currentTarget.value })}
                    />
                </label>
                <label class="param-row">
                    <span class="param-label">Show points</span>
                    <input type="checkbox"
                        checked={config.markParams.showPoints !== false}
                        onchange={(e) => patchMarkParams({ showPoints: e.currentTarget.checked })}
                    />
                </label>
                {#if config.markParams.showPoints !== false}
                    <label class="param-row">
                        <span class="param-label">Point size</span>
                        <input type="number" class="param-input" step="10" min="10" max="200"
                            value={config.markParams.pointSize ?? 50}
                            oninput={(e) => patchMarkParams({ pointSize: +e.currentTarget.value })}
                        />
                    </label>
                {/if}
            {/if}
            {#if config.chartType === 'area'}
                <label class="param-row">
                    <span class="param-label">Fill opacity</span>
                    <input type="range" class="param-slider" min="0.05" max="1" step="0.05"
                        value={config.markParams.fillOpacity ?? 0.4}
                        oninput={(e) => patchMarkParams({ fillOpacity: +e.currentTarget.value })}
                    />
                    <span class="param-val">{(config.markParams.fillOpacity ?? 0.4).toFixed(2)}</span>
                </label>
            {/if}
        </div>
    </section>

    <!-- Synthetic data fields (no-data path) -->
    {#if config.dataMode === 'synthetic'}
        <section class="param-section">
            <h3 class="section-heading">Categories</h3>
            <p class="section-hint">Comma-separated list</p>
            <textarea class="categories-input"
                rows="2"
                placeholder="A, B, C"
                value={config.syntheticConfig?.categories?.join(', ') ?? ''}
                oninput={(e) => updateCategories(e.currentTarget.value)}
            ></textarea>
            {#if showSeriesFields}
                <h3 class="section-heading" style="margin-top: 8px">Series names</h3>
                <textarea class="categories-input"
                    rows="2"
                    placeholder="Series 1, Series 2"
                    value={config.syntheticConfig?.seriesNames?.join(', ') ?? ''}
                    oninput={(e) => updateSeriesNames(e.currentTarget.value)}
                ></textarea>
            {/if}
        </section>
    {/if}

    <!-- Group Shapes -->
    <section class="param-section">
        <h3 class="section-heading">Group Shapes</h3>
        <p class="section-hint">Compute SVG paths for root, dimension, and division nodes.</p>

        <!-- Root node -->
        <div class="group-subsection">
            <label class="subsection-toggle">
                <input type="checkbox"
                    checked={gs.rootEnabled}
                    onchange={(e) => patchGroupShapes({ rootEnabled: e.currentTarget.checked })}
                />
                <span class="subsection-label">Root node</span>
            </label>
            {#if gs.rootEnabled}
                <div class="param-grid gs-indent">
                    <label class="param-row">
                        <span class="param-label">Strategy</span>
                        <select class="param-select"
                            value={gs.rootStrategy}
                            onchange={(e) => patchGroupShapes({ rootStrategy: e.currentTarget.value as GroupShapeConfig['rootStrategy'] })}
                        >
                            <option value="convexHull">Convex hull</option>
                            <option value="unionOfAll">Union of all</option>
                            <option value="boundingRect">Bounding rect</option>
                        </select>
                    </label>
                    <label class="param-row">
                        <span class="param-label">Padding</span>
                        <input type="number" class="param-input" min="0" step="2"
                            value={gs.rootPadding}
                            oninput={(e) => patchGroupShapes({ rootPadding: +e.currentTarget.value })}
                        />
                        <span class="param-val">px</span>
                    </label>
                </div>
            {/if}
        </div>

        <!-- Dimensions -->
        <div class="group-subsection">
            <label class="subsection-toggle">
                <input type="checkbox"
                    checked={gs.dimensionEnabled}
                    onchange={(e) => patchGroupShapes({ dimensionEnabled: e.currentTarget.checked })}
                />
                <span class="subsection-label">Dimensions</span>
            </label>
            {#if gs.dimensionEnabled}
                <div class="param-grid gs-indent">
                    <label class="param-row">
                        <span class="param-label">Strategy</span>
                        <select class="param-select"
                            value={gs.dimensionStrategy}
                            onchange={(e) => patchGroupShapes({ dimensionStrategy: e.currentTarget.value as GroupShapeConfig['dimensionStrategy'] })}
                        >
                            <option value="convexHull">Convex hull</option>
                            <option value="unionOfAll">Union of all</option>
                        </select>
                    </label>
                    <label class="param-row">
                        <span class="param-label">Padding</span>
                        <input type="number" class="param-input" min="0" step="2"
                            value={gs.dimensionPadding}
                            oninput={(e) => patchGroupShapes({ dimensionPadding: +e.currentTarget.value })}
                        />
                        <span class="param-val">px</span>
                    </label>
                </div>
                {#if dimensionNodes.length > 0}
                    <div class="bonus-rect-list">
                        {#each dimensionNodes as dimNode (dimNode.id)}
                            {@const dimKey = dimNode.dimensionKey ?? dimNode.id}
                            {@const br = gs.dimensionBonusRects[dimKey]}
                            <div class="bonus-rect-item">
                                <label class="bonus-rect-toggle">
                                    <input type="checkbox"
                                        checked={br?.enabled ?? false}
                                        onchange={(e) => toggleBonusRect('dimension', dimKey, e.currentTarget.checked, (config?.offsetX ?? 0) + 10, (config?.offsetY ?? 0) + 10)}
                                    />
                                    <span class="bonus-rect-label">{dimNode.label}</span>
                                    <span class="bonus-rect-hint">add a bonus rect</span>
                                </label>
                                {#if br?.enabled}
                                    <div class="bonus-rect-inputs">
                                        <label class="param-row">
                                            <span class="param-label xs">X</span>
                                            <input type="number" class="param-input sm" step="1"
                                                value={br.x}
                                                oninput={(e) => patchBonusRect('dimension', dimKey, { x: +e.currentTarget.value })}
                                            />
                                        </label>
                                        <label class="param-row">
                                            <span class="param-label xs">Y</span>
                                            <input type="number" class="param-input sm" step="1"
                                                value={br.y}
                                                oninput={(e) => patchBonusRect('dimension', dimKey, { y: +e.currentTarget.value })}
                                            />
                                        </label>
                                        <label class="param-row">
                                            <span class="param-label xs">W</span>
                                            <input type="number" class="param-input sm" step="1" min="1"
                                                value={br.width}
                                                oninput={(e) => patchBonusRect('dimension', dimKey, { width: +e.currentTarget.value })}
                                            />
                                        </label>
                                        <label class="param-row">
                                            <span class="param-label xs">H</span>
                                            <input type="number" class="param-input sm" step="1" min="1"
                                                value={br.height}
                                                oninput={(e) => patchBonusRect('dimension', dimKey, { height: +e.currentTarget.value })}
                                            />
                                        </label>
                                    </div>
                                {/if}
                            </div>
                        {/each}
                    </div>
                {:else}
                    <p class="section-hint gs-indent">No dimension nodes found. Apply scaffold first.</p>
                {/if}
            {/if}
        </div>

        <!-- Divisions -->
        <div class="group-subsection">
            <label class="subsection-toggle">
                <input type="checkbox"
                    checked={gs.divisionEnabled}
                    onchange={(e) => patchGroupShapes({ divisionEnabled: e.currentTarget.checked })}
                />
                <span class="subsection-label">Divisions</span>
            </label>
            {#if gs.divisionEnabled}
                <div class="param-grid gs-indent">
                    <label class="param-row">
                        <span class="param-label">Strategy</span>
                        <select class="param-select"
                            value={gs.divisionStrategy}
                            onchange={(e) => patchGroupShapes({ divisionStrategy: e.currentTarget.value as GroupShapeConfig['divisionStrategy'] })}
                        >
                            <option value="convexHull">Convex hull</option>
                            <option value="unionOfAll">Union of all</option>
                        </select>
                    </label>
                    <label class="param-row">
                        <span class="param-label">Padding</span>
                        <input type="number" class="param-input" min="0" step="2"
                            value={gs.divisionPadding}
                            oninput={(e) => patchGroupShapes({ divisionPadding: +e.currentTarget.value })}
                        />
                        <span class="param-val">px</span>
                    </label>
                </div>
                {#if divisionNodes.length > 0}
                    <div class="bonus-rect-list">
                        {#each [...divisionsByDimension()] as [dimKey, divs]}
                            <p class="dim-heading">{dimKey}</p>
                            {#each divs as divNode (divNode.id)}
                                {@const br = gs.divisionBonusRects[divNode.id]}
                                <div class="bonus-rect-item">
                                    <label class="bonus-rect-toggle">
                                        <input type="checkbox"
                                            checked={br?.enabled ?? false}
                                            onchange={(e) => toggleBonusRect('division', divNode.id, e.currentTarget.checked, divNode.x, divNode.y)}
                                        />
                                        <span class="bonus-rect-label">{divNode.label}</span>
                                        <span class="bonus-rect-hint">add a bonus rect</span>
                                    </label>
                                    {#if br?.enabled}
                                        <div class="bonus-rect-inputs">
                                            <label class="param-row">
                                                <span class="param-label xs">X</span>
                                                <input type="number" class="param-input sm" step="1"
                                                    value={br.x}
                                                    oninput={(e) => patchBonusRect('division', divNode.id, { x: +e.currentTarget.value })}
                                                />
                                            </label>
                                            <label class="param-row">
                                                <span class="param-label xs">Y</span>
                                                <input type="number" class="param-input sm" step="1"
                                                    value={br.y}
                                                    oninput={(e) => patchBonusRect('division', divNode.id, { y: +e.currentTarget.value })}
                                                />
                                            </label>
                                            <label class="param-row">
                                                <span class="param-label xs">W</span>
                                                <input type="number" class="param-input sm" step="1" min="1"
                                                    value={br.width}
                                                    oninput={(e) => patchBonusRect('division', divNode.id, { width: +e.currentTarget.value })}
                                                />
                                            </label>
                                            <label class="param-row">
                                                <span class="param-label xs">H</span>
                                                <input type="number" class="param-input sm" step="1" min="1"
                                                    value={br.height}
                                                    oninput={(e) => patchBonusRect('division', divNode.id, { height: +e.currentTarget.value })}
                                                />
                                            </label>
                                        </div>
                                    {/if}
                                </div>
                            {/each}
                        {/each}
                    </div>
                {:else}
                    <p class="section-hint gs-indent">No division nodes found. Apply scaffold first.</p>
                {/if}
            {/if}
        </div>
    </section>

    <!-- Done button -->
    <div class="panel-actions">
        <button class="btn-primary" type="button" onclick={handleDone}>
            Done
        </button>
    </div>

    <!-- Extract values (post-commit, synthetic only) -->
    {#if showExtractForm}
        <section class="param-section extract-section">
            <h3 class="section-heading">Extract values</h3>
            <p class="section-hint">
                Provide one known value to calibrate all marks.
            </p>
            <label class="param-row">
                <span class="param-label">Node</span>
                <select class="param-select"
                    bind:value={extractCalibNodeId}
                >
                    <option value="">— choose —</option>
                    {#each committedScaffoldNodes.filter(n => n.renderProperties.shape !== 'path') as node (node.id)}
                        <option value={node.id}>{node.label}</option>
                    {/each}
                </select>
            </label>
            <label class="param-row">
                <span class="param-label">Known value</span>
                <input type="number" class="param-input" step="any"
                    bind:value={extractCalibValue}
                    placeholder="e.g. 42"
                />
            </label>
            <button class="btn-ghost btn-sm" type="button"
                disabled={!extractCalibNodeId || extractCalibValue <= 0}
                onclick={applyExtractValues}
            >
                Apply
            </button>
        </section>
    {/if}

</aside>
{/if}

<style>
    .scaffold-panel {
        display: flex;
        flex-direction: column;
        gap: 0;
        height: 100%;
        min-height: 0;
        overflow-y: auto;
    }

    .panel-header {
        display: flex;
        align-items: center;
        gap: calc(var(--dn-space) * 1);
        padding: calc(var(--dn-space) * 1.5) calc(var(--dn-space) * 2);
        border-bottom: 1px solid var(--dn-border);
        flex-shrink: 0;
    }

    .panel-title {
        font-weight: 600;
        font-size: 0.875rem;
        color: var(--dn-text);
    }

    .chart-type-badge {
        font-size: 0.75rem;
        background: var(--dn-accent-soft);
        color: var(--dn-accent);
        padding: 2px 6px;
        border-radius: 4px;
        font-weight: 500;
        text-transform: lowercase;
    }

    .data-mode-badge {
        font-size: 0.7rem;
        background: var(--dn-border);
        color: var(--dn-text-muted);
        padding: 2px 5px;
        border-radius: 4px;
        margin-left: auto;
    }

    .data-mode-badge.synthetic {
        background: #f0fdf4;
        color: #166534;
    }

    .param-section {
        padding: calc(var(--dn-space) * 1.5) calc(var(--dn-space) * 2);
        border-bottom: 1px solid var(--dn-border);
    }

    .section-heading {
        margin: 0 0 calc(var(--dn-space) * 1);
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--dn-text-muted);
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .section-hint {
        margin: calc(var(--dn-space) * -0.5) 0 calc(var(--dn-space) * 1);
        font-size: 0.75rem;
        color: var(--dn-text-muted);
    }

    .param-grid {
        display: flex;
        flex-direction: column;
        gap: calc(var(--dn-space) * 0.75);
    }

    .param-row {
        display: flex;
        align-items: center;
        gap: calc(var(--dn-space) * 1);
        font-size: 0.8125rem;
        color: var(--dn-text);
        cursor: default;
    }

    .param-label {
        flex: 0 0 80px;
        font-size: 0.8125rem;
        color: var(--dn-text-muted);
    }

    .param-input {
        width: 68px;
        padding: 2px 4px;
        font-size: 0.8125rem;
        border: 1px solid var(--dn-border);
        border-radius: 3px;
        background: var(--dn-bg);
        color: var(--dn-text);
        text-align: right;
    }

    .param-slider {
        flex: 1;
        cursor: pointer;
    }

    .param-val {
        font-size: 0.75rem;
        color: var(--dn-text-muted);
        min-width: 28px;
        text-align: right;
    }

    .param-select {
        flex: 1;
        padding: 2px 4px;
        font-size: 0.8125rem;
        border: 1px solid var(--dn-border);
        border-radius: 3px;
        background: var(--dn-bg);
        color: var(--dn-text);
    }

    .field-input {
        width: 110px;
        font-family: var(--dn-font-mono);
        font-size: 0.75rem;
    }

    .categories-input {
        width: 100%;
        box-sizing: border-box;
        padding: calc(var(--dn-space) * 0.75);
        font-size: 0.8125rem;
        border: 1px solid var(--dn-border);
        border-radius: 4px;
        background: var(--dn-bg);
        color: var(--dn-text);
        resize: vertical;
        font-family: var(--dn-font-mono);
    }

    .panel-actions {
        padding: calc(var(--dn-space) * 1.5) calc(var(--dn-space) * 2);
        border-bottom: 1px solid var(--dn-border);
    }

    .panel-actions .btn-primary {
        width: 100%;
        justify-content: center;
    }

    .extract-section {
        background: #f0fdf4;
    }

    /* Group Shapes section */
    .group-subsection {
        margin-bottom: calc(var(--dn-space) * 1.25);
        padding-bottom: calc(var(--dn-space) * 1);
        border-bottom: 1px dashed var(--dn-border);
    }
    .group-subsection:last-child {
        border-bottom: none;
        margin-bottom: 0;
    }

    .subsection-toggle {
        display: flex;
        align-items: center;
        gap: calc(var(--dn-space) * 0.75);
        cursor: pointer;
        font-size: 0.8125rem;
        font-weight: 500;
        color: var(--dn-text);
        margin-bottom: calc(var(--dn-space) * 0.75);
    }
    .subsection-label {
        flex: 1;
    }

    .gs-indent {
        margin-left: calc(var(--dn-space) * 1.5);
    }

    .bonus-rect-list {
        margin-left: calc(var(--dn-space) * 1.5);
        margin-top: calc(var(--dn-space) * 0.75);
        display: flex;
        flex-direction: column;
        gap: calc(var(--dn-space) * 0.5);
    }

    .bonus-rect-item {
        display: flex;
        flex-direction: column;
        gap: calc(var(--dn-space) * 0.5);
    }

    .bonus-rect-toggle {
        display: flex;
        align-items: center;
        gap: calc(var(--dn-space) * 0.5);
        cursor: pointer;
        font-size: 0.8125rem;
        color: var(--dn-text);
    }
    .bonus-rect-label {
        flex: 1;
        font-size: 0.8125rem;
    }
    .bonus-rect-hint {
        font-size: 0.7rem;
        color: var(--dn-text-muted);
        background: var(--dn-accent-soft);
        padding: 1px 5px;
        border-radius: 3px;
    }

    .bonus-rect-inputs {
        margin-left: calc(var(--dn-space) * 1.5);
        display: flex;
        flex-direction: column;
        gap: calc(var(--dn-space) * 0.4);
    }

    .param-label.xs {
        flex: 0 0 20px;
        font-size: 0.75rem;
    }

    .param-input.sm {
        width: 54px;
    }

    .dim-heading {
        margin: calc(var(--dn-space) * 0.5) 0 calc(var(--dn-space) * 0.25);
        font-size: 0.7rem;
        font-weight: 600;
        color: var(--dn-text-muted);
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }
</style>
