<script lang="ts">
    import { onDestroy } from 'svelte';
    import { appState } from '../../../store/appState';
    import type { ScaffoldConfig, SyntheticDataConfig, PrepState } from '../../../store/appState';
    import type { SkeletonNode } from '../../../store/types';
    import { extractValues, extractXYValues } from '../../../utils/valueExtractor';
    import { latestView } from '../../../store/scaffoldRuntime';
    import { logAction } from '../../../store/historyStore';

    // ── Store sync ────────────────────────────────────────────────────────────
    let config = $state<ScaffoldConfig | null>(null);
    let prepState = $state<PrepState | null>(null);
    let committedScaffoldNodes = $state<SkeletonNode[]>([]);

    const _unsub = appState.subscribe(s => {
        config = s.scaffoldConfig;
        prepState = s.prepState;
        committedScaffoldNodes = [...s.nodes.values()].filter(n => n.source === 'scaffold');
    });
    onDestroy(_unsub);

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
    }

    function patchMarkParams(patch: Partial<ScaffoldConfig['markParams']>) {
        appState.update(s => ({
            ...s,
            scaffoldConfig: s.scaffoldConfig
                ? { ...s.scaffoldConfig, markParams: { ...s.scaffoldConfig.markParams, ...patch } }
                : s.scaffoldConfig
        }));
    }

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

    <!-- Field mapping (CSV mode only) -->
    {#if config.dataMode === 'csv'}
    <section class="param-section">
        <h3 class="section-heading">Field mapping</h3>
        <div class="param-grid">
            <label class="param-row">
                <span class="param-label">X field</span>
                <input type="text" class="param-input field-input"
                    value={config.xField ?? ''}
                    oninput={(e) => patchConfig({ xField: e.currentTarget.value || undefined })}
                    placeholder="column name"
                />
            </label>
            <label class="param-row">
                <span class="param-label">Y field</span>
                <input type="text" class="param-input field-input"
                    value={config.yField ?? ''}
                    oninput={(e) => patchConfig({ yField: e.currentTarget.value || undefined })}
                    placeholder="column name"
                />
            </label>
            <label class="param-row">
                <span class="param-label">X sort</span>
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
    {/if}

    <!-- Mark params (chart-type-specific) -->
    <section class="param-section">
        <h3 class="section-heading">Mark params</h3>
        <div class="param-grid">
            {#if config.chartType === 'bar' || config.chartType === 'stacked-bar' || config.chartType === 'clustered-bar'}
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
</style>
