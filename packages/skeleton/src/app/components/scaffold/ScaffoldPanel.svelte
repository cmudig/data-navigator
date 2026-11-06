<script lang="ts">
    import { app, commit, edit } from '../../../model/state.svelte';
    import type { DimensionGroupConfig, Doc, GroupShapeConfig, ScaffoldConfig } from '../../../model/doc';
    import { groupDefaults } from '../../../runtime/dn-runtime.js';
    import { CHART_TYPES, detectFields } from '../../../utils/vegaBuilder';
    import { estimatePadding } from '../../../utils/paddingEstimator';

    const raw = $derived(app.doc.scaffold);
    const config = $derived(app.scaffold);
    const gs = $derived(app.doc.recipe.groups);
    const dims = $derived(app.doc.recipe.dimensions);
    const rootId = $derived(app.doc.recipe.root.id);
    const rootPin = $derived(app.doc.overrides.nodes[rootId]?.geo);
    const nodes = $derived([...app.graph.nodes.values()]);
    const series = $derived(['stacked-bar', 'clustered-bar', 'line', 'area'].includes(config?.chartType ?? ''));
    const columns = $derived(
        config?.dataMode === 'synthetic' && config.syntheticConfig
            ? [config.syntheticConfig.xField, config.syntheticConfig.yField, config.syntheticConfig.colorField].filter(Boolean) as string[]
            : app.doc.data.fields.filter(f => !f.removed).map(f => f.key)
    );
    const syntheticKeys = $derived((series ? ['categories', 'seriesNames'] : ['categories']) as ('categories' | 'seriesNames')[]);
    const barKeys = $derived((config?.chartType === 'clustered-bar' ? ['barInnerPadding', 'groupPadding'] : ['barInnerPadding']) as ('barInnerPadding' | 'groupPadding')[]);
    const numericalColumns = $derived(app.doc.data.fields.filter(f => !f.removed && f.type === 'numerical').map(f => f.key));
    const extent = (field: string | undefined, fn: (...v: number[]) => number) => {
        const vals = app.rows.map(r => Number(r[field ?? ''])).filter(n => !isNaN(n));
        return vals.length ? String(fn(...vals)) : 'auto';
    };

    const set = (label: string, mutate: (c: ScaffoldConfig, d: Doc) => void) => edit(label, d => mutate(d.scaffold!, d), true);
    const num = (v: string) => (v === '' ? undefined : Number(v));
    const setGroups = (patch: Partial<GroupShapeConfig>) => edit('Group shapes changed', d => Object.assign(d.recipe.groups, patch), true);
    const dimConfig = (key: string, type: 'categorical' | 'numerical'): DimensionGroupConfig => gs.perDimension[key] ?? groupDefaults(type);
    const setDim = (key: string, type: 'categorical' | 'numerical', patch: Partial<DimensionGroupConfig>) =>
        edit('Group shapes changed', d => (d.recipe.groups.perDimension[key] = { ...dimConfig(key, type), ...patch }), true);
    const bonus = (field: 'dimensionBonusRects' | 'divisionBonusRects', key: string, patch: Partial<GroupShapeConfig['divisionBonusRects'][string]>, at = { x: 10, y: 10 }) =>
        edit('Group shapes changed', d => {
            const prev = d.recipe.groups[field][key] ?? { enabled: true, ...at, width: 80, height: 40 };
            d.recipe.groups[field][key] = { ...prev, ...patch };
        }, true);

    function changeChartType(chartType: string) {
        const f = detectFields(chartType, dims, app.doc.data.fields);
        commit(`Chart type changed to ${chartType}`, d => ({ ...d, scaffold: { ...d.scaffold!, chartType, xField: f.xField, yField: f.yField, colorField: f.colorField } }));
    }

    let estimating = $state(false);
    async function handleEstimatePadding() {
        if (!config || !app.doc.image) return alert('Need a rendered scaffold and an uploaded image first.');
        estimating = true;
        try {
            const patch = await estimatePadding(config, nodes.filter(n => n.kind === 'leaf').map(n => n.geo), app.doc.image);
            if (patch) commit('Estimated padding', d => ({ ...d, scaffold: { ...d.scaffold!, ...patch } }));
            else alert('Could not find enough marks in the image to fit the padding.');
        } finally {
            estimating = false;
        }
    }
</script>

{#snippet numberRow(label: string, value: number | undefined, onset: (v: number | undefined) => void, attrs: { xs?: boolean; step?: number | string; min?: number; placeholder?: string; unit?: string } = {})}
    <label class="param-row">
        <span class="param-label" class:xs={attrs.xs}>{label}</span>
        <input type="number" class="param-input" class:sm={attrs.xs} step={attrs.step ?? 1} min={attrs.min} placeholder={attrs.placeholder} value={value ?? ''} oninput={e => onset(num(e.currentTarget.value))} />
        {#if attrs.unit}<span class="param-val">{attrs.unit}</span>{/if}
    </label>
{/snippet}

{#snippet fieldSelect(label: string, value: string | undefined, onset: (v: string | undefined) => void, allowNone = false)}
    <label class="param-row">
        <span class="param-label">{label}</span>
        <select class="param-select" value={value === undefined ? '__auto' : value} onchange={e => onset(e.currentTarget.value === '__auto' ? undefined : e.currentTarget.value)}>
            <option value="__auto">Auto</option>
            {#if allowNone}<option value="">None</option>{/if}
            {#each columns as col (col)}<option value={col}>{col}</option>{/each}
        </select>
    </label>
{/snippet}

{#snippet rectInputs(r: { x: number; y: number; width: number; height: number }, onset: (patch: Record<string, number>) => void)}
    <div class="bonus-rect-inputs">
        {#each [['X', 'x'], ['Y', 'y'], ['W', 'width'], ['H', 'height']] as [label, k] (k)}
            {@render numberRow(label, r[k as 'x'], v => v !== undefined && onset({ [k]: v }), { xs: true })}
        {/each}
    </div>
{/snippet}

{#if config && raw}
    <aside class="scaffold-panel" aria-label="Scaffold mode controls">
        <div class="panel-header">
            <span class="panel-title">Scaffold</span>
            <span class="chart-type-badge">{config.chartType}</span>
            <span class="data-mode-badge" class:synthetic={config.dataMode === 'synthetic'}>{config.dataMode === 'synthetic' ? 'No data' : 'CSV data'}</span>
        </div>

        <section class="param-section">
            <h3 class="section-heading">Chart type</h3>
            <div class="param-grid">
                <label class="param-row">
                    <span class="param-label">Type</span>
                    <select class="param-select" value={config.chartType} onchange={e => changeChartType(e.currentTarget.value)}>
                        {#each CHART_TYPES as t (t)}<option value={t}>{t.replace('-', ' ')}</option>{/each}
                    </select>
                </label>
            </div>
        </section>

        <section class="param-section">
            <h3 class="section-heading">Position &amp; size</h3>
            <div class="param-grid">
                {#each [['Offset X', 'offsetX'], ['Offset Y', 'offsetY'], ['Width', 'plotWidth'], ['Height', 'plotHeight']] as const as [label, k] (k)}
                    {@render numberRow(label, config[k], v => set('Scaffold config changed', c => (c[k] = v ?? 0)))}
                {/each}
            </div>
        </section>

        <section class="param-section">
            <h3 class="section-heading">Axis padding</h3>
            <div class="param-grid">
                {#each ['Left', 'Top', 'Right', 'Bottom'] as const as side (side)}
                    {@render numberRow(side, config[`padding${side}`], v => set('Scaffold config changed', c => (c[`padding${side}`] = Math.max(0, v ?? 0))), { step: 5, min: 0 })}
                {/each}
            </div>
            <button type="button" class="estimate-padding-btn" onclick={handleEstimatePadding} disabled={estimating} title="Detect the chart marks in the image and align the scaffold padding to them">
                {estimating ? 'Estimating…' : 'Estimate padding'}
            </button>
        </section>

        <section class="param-section">
            <h3 class="section-heading">Field mapping</h3>
            <p class="section-note">Auto shows {config.xField ?? 'nothing'} / {config.yField ?? 'nothing'}{series ? ` / ${config.colorField || 'none'}` : ''}.</p>
            <div class="param-grid">
                {@render fieldSelect('x', raw.xField, v => set('Scaffold fields changed', c => (c.xField = v)))}
                {@render fieldSelect('y', raw.yField, v => set('Scaffold fields changed', c => (c.yField = v)))}
                {@render fieldSelect('color', raw.colorField, v => set('Scaffold fields changed', c => (c.colorField = v)), true)}
                <label class="param-row">
                    <span class="param-label">Sort</span>
                    <select class="param-select" value={config.sortX ?? 'none'} onchange={e => set('Scaffold config changed', c => (c.sortX = e.currentTarget.value as ScaffoldConfig['sortX']))}>
                        <option value="none">Data order</option>
                        <option value="ascending">Ascending</option>
                        <option value="descending">Descending</option>
                    </select>
                </label>
            </div>
        </section>

        {#if config.chartType === 'scatter'}
            <section class="param-section">
                <h3 class="section-heading">Axis domain</h3>
                <p class="section-note">Leave blank to use data extent. Override if the image's axes differ from the data range.</p>
                <div class="param-grid">
                    {@render numberRow('x min', config.xDomainMin, v => set('Scaffold config changed', c => (c.xDomainMin = v)), { placeholder: extent(config.xField, Math.min), step: 'any' })}
                    {@render numberRow('x max', config.xDomainMax, v => set('Scaffold config changed', c => (c.xDomainMax = v)), { placeholder: extent(config.xField, Math.max), step: 'any' })}
                    {@render numberRow('y min', config.yDomainMin, v => set('Scaffold config changed', c => (c.yDomainMin = v)), { placeholder: extent(config.yField, Math.min), step: 'any' })}
                    {@render numberRow('y max', config.yDomainMax, v => set('Scaffold config changed', c => (c.yDomainMax = v)), { placeholder: extent(config.yField, Math.max), step: 'any' })}
                </div>
            </section>
        {/if}

        <section class="param-section">
            <h3 class="section-heading">Mark params</h3>
            <div class="param-grid">
                {#if config.chartType.includes('bar')}
                    <label class="param-row">
                        <span class="param-label">Orientation</span>
                        <select class="param-select" value={config.barOrientation ?? 'vertical'} onchange={e => set('Scaffold config changed', c => (c.barOrientation = e.currentTarget.value as 'vertical'))}>
                            <option value="vertical">Vertical</option>
                            <option value="horizontal">Horizontal</option>
                        </select>
                    </label>
                    {#each barKeys as k (k)}
                        {@const v = config.markParams[k] ?? (k === 'groupPadding' ? 0.05 : 0.1)}
                        <label class="param-row">
                            <span class="param-label">{k === 'groupPadding' ? 'Group spacing' : 'Bar spacing'}</span>
                            <input type="range" class="param-slider" min="0" max="0.9" step="0.05" value={v} oninput={e => set('Scaffold config changed', c => (c.markParams[k] = +e.currentTarget.value))} />
                            <span class="param-val">{v.toFixed(2)}</span>
                        </label>
                    {/each}
                {/if}
                {#if config.chartType === 'scatter'}
                    {@render numberRow('Point size', config.markParams.pointSize ?? 30, v => v && v > 0 && set('Scaffold config changed', c => (c.markParams.pointSize = v)), { step: 10, min: 1 })}
                    {#if numericalColumns.length}
                        <label class="param-row">
                            <span class="param-label">Scale by</span>
                            <select class="param-select" value={config.markParams.pointSizeField ?? ''} onchange={e => set('Scaffold config changed', c => (c.markParams.pointSizeField = e.currentTarget.value || undefined))}>
                                <option value="">Static</option>
                                {#each numericalColumns as col (col)}<option value={col}>{col}</option>{/each}
                            </select>
                        </label>
                    {/if}
                {/if}
                {#if config.chartType === 'line' || config.chartType === 'area'}
                    {@render numberRow('Stroke width', config.markParams.strokeWidth ?? 2, v => set('Scaffold config changed', c => (c.markParams.strokeWidth = v)), { step: 0.5, min: 0.5 })}
                    {@render numberRow('Point size', config.markParams.pointSize ?? 300, v => set('Scaffold config changed', c => (c.markParams.pointSize = v)), { step: 10, min: 10 })}
                {/if}
                {#if config.chartType === 'area'}
                    <label class="param-row">
                        <span class="param-label">Fill opacity</span>
                        <input type="range" class="param-slider" min="0.05" max="1" step="0.05" value={config.markParams.fillOpacity ?? 0.4} oninput={e => set('Scaffold config changed', c => (c.markParams.fillOpacity = +e.currentTarget.value))} />
                        <span class="param-val">{(config.markParams.fillOpacity ?? 0.4).toFixed(2)}</span>
                    </label>
                {/if}
            </div>
        </section>

        {#if config.dataMode === 'synthetic'}
            <section class="param-section">
                <h3 class="section-heading">Categories</h3>
                <p class="section-hint">Comma-separated list</p>
                {#each syntheticKeys as k (k)}
                    <textarea
                        class="categories-input"
                        rows="2"
                        aria-label={k === 'categories' ? 'Categories' : 'Series names'}
                        placeholder={k === 'categories' ? 'A, B, C' : 'Series 1, Series 2'}
                        value={config.syntheticConfig?.[k]?.join(', ') ?? ''}
                        oninput={e => set('Scaffold config changed', c => (c.syntheticConfig![k] = e.currentTarget.value.split(',').map(s => s.trim()).filter(Boolean)))}
                    ></textarea>
                {/each}
            </section>
        {/if}

        <section class="param-section">
            <h3 class="section-heading">Group Shapes</h3>
            <p class="section-hint">Outlines for root, dimension, and division nodes, computed from the data marks.</p>

            {#if app.doc.recipe.root.enabled}
                <div class="group-subsection">
                    <label class="subsection-toggle">
                        <input type="checkbox" checked={gs.rootEnabled} onchange={e => setGroups({ rootEnabled: e.currentTarget.checked })} />
                        <span class="subsection-label">Root node</span>
                    </label>
                    {#if gs.rootEnabled}
                        <div class="param-grid gs-indent">
                            <label class="param-row">
                                <span class="param-label">Strategy</span>
                                <select class="param-select" value={gs.rootStrategy} onchange={e => setGroups({ rootStrategy: e.currentTarget.value as GroupShapeConfig['rootStrategy'] })}>
                                    <option value="convexHull">Convex hull</option>
                                    <option value="unionOfAll">Union of all</option>
                                    <option value="boundingRect">Bounding rect</option>
                                </select>
                            </label>
                            {@render numberRow('Padding', gs.rootPadding, v => setGroups({ rootPadding: v ?? 0 }), { step: 2, min: 0, unit: 'px' })}
                            {#if rootPin}
                                {@render rectInputs(rootPin, patch => edit('Resized root outline', d => (d.overrides.nodes[rootId].geo = { ...rootPin, ...patch }), true))}
                                <button class="btn-xs" type="button" onclick={() => edit('Reset root outline', d => delete d.overrides.nodes[rootId].geo)}>Reset to auto</button>
                            {/if}
                        </div>
                    {/if}
                </div>
            {/if}

            <div class="group-subsection">
                <div class="subsection-row">
                    <label class="subsection-toggle">
                        <input type="checkbox" checked={gs.dimensionEnabled} onchange={e => setGroups({ dimensionEnabled: e.currentTarget.checked })} />
                        <span class="subsection-label">Dimensions</span>
                    </label>
                    <label class="subsection-toggle subsection-toggle-secondary">
                        <input type="checkbox" checked={gs.divisionEnabled} onchange={e => setGroups({ divisionEnabled: e.currentTarget.checked })} />
                        <span class="subsection-label">Divisions</span>
                    </label>
                </div>
                {#if gs.dimensionEnabled || gs.divisionEnabled}
                    {#each dims as dim (dim.key)}
                        {@const cfg = dimConfig(dim.key, dim.type)}
                        {@const divs = nodes.filter(n => n.kind === 'division' && n.dimensionKey === dim.key)}
                        <div class="per-dim-section">
                            <p class="dim-heading"><span>{dim.key}</span><span class="dim-type-badge">{dim.type}</span></p>
                            {#each [['dimensionEnabled', 'strategy', 'padding', ''], ['divisionEnabled', 'divisionStrategy', 'divisionPadding', 'Divisions: ']] as const as [on, sk, pk, prefix] (sk)}
                                {#if gs[on]}
                                    {#if prefix}<p class="divisions-heading gs-indent">Divisions:</p>{/if}
                                    <div class="param-grid gs-indent">
                                        <label class="param-row">
                                            <span class="param-label">Style</span>
                                            <select class="param-select" aria-label="{prefix}Style" value={cfg[sk]} onchange={e => setDim(dim.key, dim.type, { [sk]: e.currentTarget.value })}>
                                                <option value="convexHull">Convex hull</option>
                                                <option value="unionOfAll">Union of all</option>
                                                {#if prefix && dim.type === 'numerical'}
                                                    <option value="rangeBounds">Range bounds</option>
                                                    <option value="rangeRect">Range rect</option>
                                                {/if}
                                            </select>
                                        </label>
                                        {@render numberRow('Padding', cfg[pk], v => setDim(dim.key, dim.type, { [pk]: v ?? 0 }), { step: 2, min: 0, unit: 'px' })}
                                    </div>
                                {/if}
                            {/each}
                            <details class="bonus-rect-disclosure gs-indent">
                                <summary>add extra geometries</summary>
                                <div class="bonus-rect-list">
                                    {#each [...(gs.dimensionEnabled ? [['dimensionBonusRects', dim.key, dim.key]] : []), ...(gs.divisionEnabled ? divs.map(n => ['divisionBonusRects', n.id, n.name]) : [])] as [field, key, name] (key)}
                                        {@const br = gs[field as 'divisionBonusRects'][key]}
                                        <div class="bonus-rect-item">
                                            <label class="bonus-rect-toggle">
                                                <input type="checkbox" checked={br?.enabled ?? false} onchange={e => bonus(field as 'divisionBonusRects', key, { enabled: e.currentTarget.checked }, { x: config.offsetX + 10, y: config.offsetY + 10 })} />
                                                <span class="bonus-rect-label">{name}</span>
                                                <span class="bonus-rect-hint">bonus rect</span>
                                            </label>
                                            {#if br?.enabled}
                                                {@render rectInputs(br, patch => bonus(field as 'divisionBonusRects', key, patch))}
                                            {/if}
                                        </div>
                                    {/each}
                                </div>
                            </details>
                        </div>
                    {:else}
                        <p class="section-hint gs-indent">No dimensions yet. Add some in the schema panel.</p>
                    {/each}
                {/if}
            </div>
        </section>

        <div class="panel-actions">
            <button class="btn-primary" type="button" onclick={() => (app.ui.scaffoldMode = false)}>Done</button>
        </div>
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

    .section-note {
        font-size: 0.75rem;
        color: var(--dn-text-muted);
        margin: 0 0 calc(var(--dn-space) * 0.75) 0;
        line-height: 1.4;
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

    .bonus-rect-disclosure {
        margin-top: calc(var(--dn-space) * 0.75);
    }
    .bonus-rect-disclosure > summary {
        font-size: 0.8rem;
        color: var(--dn-text-muted);
        cursor: pointer;
        user-select: none;
    }

    .bonus-rect-list {
        margin-top: calc(var(--dn-space) * 0.5);
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

    .divisions-heading {
        margin-bottom: 0;
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--dn-text-muted);
    }

    .dim-heading {
        margin: calc(var(--dn-space) * 0.5) 0 calc(var(--dn-space) * 0.25);
        font-size: 0.7rem;
        font-weight: 600;
        color: var(--dn-text-muted);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        display: flex;
        align-items: center;
        gap: calc(var(--dn-space) * 0.5);
    }

    .dim-type-badge {
        font-size: 0.65rem;
        font-weight: 400;
        text-transform: none;
        letter-spacing: 0;
        background: var(--dn-border);
        color: var(--dn-text-muted);
        padding: 1px 4px;
        border-radius: 3px;
    }

    .per-dim-section {
        margin-top: calc(var(--dn-space) * 0.75);
        padding-top: calc(var(--dn-space) * 0.75);
        border-top: 1px dashed var(--dn-border);
    }
    .per-dim-section:first-child {
        border-top: none;
        padding-top: 0;
        margin-top: calc(var(--dn-space) * 0.5);
    }

    .subsection-row {
        display: flex;
        align-items: center;
        gap: calc(var(--dn-space) * 1.5);
    }

    .subsection-toggle-secondary {
        font-weight: 400;
        color: var(--dn-text-muted);
    }

    .btn-xs {
        font-size: 0.7rem;
        padding: 2px 8px;
        border: 1px solid var(--dn-border);
        border-radius: 3px;
        background: var(--dn-bg);
        color: var(--dn-text-muted);
        cursor: pointer;
    }
    .btn-xs:hover {
        background: var(--dn-border);
    }
    .estimate-padding-btn {
        margin-top: 8px;
        width: 100%;
        font-size: 0.75rem;
        padding: 5px 10px;
        border: 1px solid var(--dn-border);
        border-radius: 4px;
        background: var(--dn-bg);
        color: var(--dn-text);
        cursor: pointer;
    }
    .estimate-padding-btn:hover:not(:disabled) {
        background: var(--dn-border);
    }
    .estimate-padding-btn:disabled {
        opacity: 0.6;
        cursor: default;
    }
</style>
