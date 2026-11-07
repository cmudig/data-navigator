<script lang="ts">
    import { app, edit } from '../../model/state.svelte';
    import { SIBLING_PRESETS, newDim, presetOf, syncKeys, template, type Dim, type Doc, type LabelTemplate } from '../../model/doc';
    import LabelBuilder from './prep/LabelBuilder.svelte';
    import SpatialView from './SpatialView.svelte';
    import StructureView from './StructureView.svelte';

    const ui = $derived(app.ui.schema);
    const r = $derived(app.doc.recipe);
    const fields = $derived(app.doc.data.fields.filter(f => !f.removed));
    const s = $derived(app.structure);
    const conflicts = $derived(app.conflicts);
    let allowMore = $state(false);

    const recipe = (label: string, mutate: (r: Doc['recipe']) => void, coalesce = false) =>
        edit(label, d => {
            mutate(d.recipe);
            Object.assign(d.recipe, syncKeys(d.recipe));
        }, coalesce);
    const setDim = (key: string, patch: Partial<Dim>, coalesce = false) =>
        recipe(`Updated dimension: ${key}`, rr => Object.assign(rr.dimensions.find(d => d.key === key)!, patch), coalesce);
    const setKey = (name: string, key: string) => recipe('Updated key', rr => (rr.keys[name] = { ...rr.keys[name], key }), true);
    const setLabel = (kind: 'perDimension' | 'perDivision', key: string, v: LabelTemplate) => recipe('Updated label', rr => (rr.labels[kind][key] = v), true);

    function toggleDim(key: string, type: Dim['type']) {
        recipe(`Toggled dimension: ${key}`, rr => {
            const i = rr.dimensions.findIndex(d => d.key === key);
            if (i >= 0) rr.dimensions.splice(i, 1);
            else {
                const used = new Set(rr.dimensions.map(d => d.nav.sibling[0]));
                const free = SIBLING_PRESETS.findIndex(p => !used.has(p.names[0]));
                rr.dimensions.push(newDim(key, type, free >= 0 ? free : rr.dimensions.length, app.rows));
            }
            rr.childmost = rr.dimensions.filter(d => d.type === 'categorical').length >= 2 ? 'across' : 'within';
        });
    }
    const move = (i: number, delta: number) =>
        recipe('Reordered dimensions', rr => {
            const [d] = rr.dimensions.splice(i, 1);
            rr.dimensions.splice(i + delta, 0, d);
        });
    const setPreset = (nav: [string, string], id: string, apply: (names: [string, string]) => void) => {
        const p = SIBLING_PRESETS.find(x => x.id === id);
        if (p) apply([...p.names] as [string, string]);
    };
    const divisionsOf = (key: string) => {
        const dim = s.dimensions?.[key];
        return dim ? Object.values<any>(dim.divisions).filter(div => s.context.info[div.id]) : [];
    };
    const divValue = (key: string, div: any) => String(Object.values<any>(div.values)[0]?.[key] ?? div.id);

</script>

{#snippet keyInput(name: string, label: string)}
    <div class="nav-rule-row">
        <span class="nav-dir-label">{label}</span>
        <span class="nav-name-input" title="Rule name, also used in text chat">{name}</span>
        <input type="text" class="nav-key-input" value={r.keys[name]?.key ?? ''} aria-label="Key for {name}" aria-invalid={!!conflicts[r.keys[name]?.key]} oninput={e => setKey(name, e.currentTarget.value)} />
    </div>
    {#if conflicts[r.keys[name]?.key]}
        <p class="compressed-hint" role="status">{r.keys[name].key} is shared by {conflicts[r.keys[name].key].join(', ')}.</p>
    {/if}
{/snippet}

{#snippet presetSelect(nav: [string, string], label: string, apply: (names: [string, string]) => void)}
    <label class="field-label">
        {label}
        <select value={presetOf(nav)?.id ?? ''} onchange={e => setPreset(nav, e.currentTarget.value, apply)}>
            {#each SIBLING_PRESETS as p (p.id)}<option value={p.id}>{p.label}</option>{/each}
            {#if !presetOf(nav)}<option value="">{nav.join(' / ')}</option>{/if}
        </select>
    </label>
{/snippet}

<div class="schema-panel" class:collapsed={ui.collapsed} aria-label="Schema panel">
    <div class="schema-header">
        {#if !ui.collapsed}<span class="schema-title">Schema</span>{/if}
        <button class="collapse-btn" type="button" onclick={() => (app.ui.schema.collapsed = !ui.collapsed)} aria-label={ui.collapsed ? 'Expand schema panel' : 'Collapse schema panel'}>
            <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points={ui.collapsed ? '6 4 10 8 6 12' : '10 4 6 8 10 12'} /></svg>
        </button>
    </div>

    {#if !ui.collapsed}
        <div class="schema-graph-section">
            <div class="viewer-canvas" role="region" aria-label="Viewer canvas: {app.ui.swapped ? 'spatial' : 'structure'} view. Selection only.">
                {#key app.ui.swapped}
                    {#if app.ui.swapped}<SpatialView canvas="viewer" />{:else}<StructureView canvas="viewer" />{/if}
                {/key}
                <button class="btn-ghost btn-sm swap" type="button" aria-pressed={app.ui.swapped} onclick={() => (app.ui.swapped = !app.ui.swapped)} title="Swap the editor and viewer canvases">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 5 H13 L10 2 M14 11 H3 L6 14" /></svg>
                    Swap
                </button>
            </div>
        </div>

        <div class="schema-builder-section">
            <section class="schema-section">
                <h3 class="section-heading">Level 0</h3>
                <label class="checkbox-field section-toggle">
                    <input type="checkbox" checked={r.root.enabled} onchange={e => recipe('Toggled root node', rr => (rr.root.enabled = e.currentTarget.checked))} />
                    <span class="section-toggle-label">Add level 0 node <span class="badge-entry">entry</span></span>
                </label>
                {#if r.root.enabled}
                    <details class="dim-options">
                        <summary class="dim-options-summary">Options</summary>
                        <div class="dim-options-body">
                            <label class="field-label">
                                ID
                                <input type="text" class="text-input" value={r.root.id} aria-label="Level 0 node ID" onchange={e => e.currentTarget.value.trim() && recipe('Renamed root', rr => (rr.root.id = e.currentTarget.value.trim()))} />
                            </label>
                            <LabelBuilder level={0} value={r.labels.level0} onchange={v => recipe('Updated label', rr => (rr.labels.level0 = v), true)} />
                        </div>
                    </details>
                {/if}
            </section>

            {#if r.dimensions.length > 1}
                <section class="schema-section">
                    <h3 class="section-heading">Between dimensions (level 1)</h3>
                    <details class="dim-options">
                        <summary class="dim-options-summary">Options</summary>
                        <div class="dim-options-body">
                            <label class="field-label">
                                Extents
                                <select value={r.level1.extents} onchange={e => recipe('Updated level 1', rr => (rr.level1.extents = e.currentTarget.value as 'terminal'))}>
                                    <option value="terminal">Terminal</option>
                                    <option value="circular">Circular</option>
                                </select>
                            </label>
                            {@render presetSelect(r.level1.nav, 'Keys', names => recipe('Updated level 1', rr => (rr.level1.nav = names)))}
                            {@render keyInput(r.level1.nav[0], 'Previous')}
                            {@render keyInput(r.level1.nav[1], 'Next')}
                        </div>
                    </details>
                </section>
                <section class="schema-section">
                    <label class="field-label" for="childmost-nav">
                        Childmost navigation
                        <select id="childmost-nav" value={r.childmost} onchange={e => recipe('Updated childmost navigation', rr => (rr.childmost = e.currentTarget.value as 'within'))}>
                            <option value="within">Within</option>
                            <option value="across">Across</option>
                        </select>
                    </label>
                </section>
            {/if}

            {#if fields.length === 0}
                <p class="schema-empty">Upload data to see dimensions.</p>
            {:else}
                <ul class="dimensions-list" aria-label="Dimensions">
                    {#each fields as field (field.key)}
                        {@const i = r.dimensions.findIndex(d => d.key === field.key)}
                        {@const dim = r.dimensions[i]}
                        <li class="dimension-item" class:included={!!dim}>
                            <div class="dimension-header">
                                <input type="checkbox" id="dim-check-{field.key}" checked={!!dim} disabled={!dim && !allowMore && r.dimensions.length >= 3} onchange={() => toggleDim(field.key, field.type)} />
                                <label for="dim-check-{field.key}" class="dimension-label">
                                    {#if dim}<span class="nav-slot-badge" aria-label="Position {i + 1}">{i + 1}</span>{/if}
                                    <span class="dim-key">{field.key}</span>
                                    <span class="dim-type-badge" class:numerical={field.type === 'numerical'}>{field.type === 'numerical' ? 'num' : 'cat'}</span>
                                </label>
                                {#if dim && r.dimensions.length > 1}
                                    <button class="btn-ghost btn-sm" type="button" disabled={i === 0} aria-label="Move {field.key} up" onclick={() => move(i, -1)}>↑</button>
                                    <button class="btn-ghost btn-sm" type="button" disabled={i === r.dimensions.length - 1} aria-label="Move {field.key} down" onclick={() => move(i, 1)}>↓</button>
                                {/if}
                            </div>
                            {#if dim}
                                {@const divs = divisionsOf(dim.key)}
                                <details class="dim-options">
                                    <summary class="dim-options-summary">Options</summary>
                                    <div class="dim-options-body">
                                        <label class="field-label">
                                            Extents
                                            <select value={dim.extents} onchange={e => setDim(dim.key, { extents: e.currentTarget.value as Dim['extents'] })}>
                                                <option value="circular">Circular</option>
                                                <option value="terminal">Terminal</option>
                                                <option value="bridgedCousins">Bridged cousins</option>
                                            </select>
                                        </label>
                                        <label class="field-label">
                                            Sort
                                            <select value={dim.sort} onchange={e => setDim(dim.key, { sort: e.currentTarget.value as Dim['sort'] })}>
                                                <option value="none">None (data order)</option>
                                                <option value="ascending">Ascending</option>
                                                <option value="descending">Descending</option>
                                            </select>
                                        </label>
                                        {#if dim.type === 'numerical'}
                                            <label class="field-label">
                                                Subdivisions
                                                <input type="number" class="number-input" value={dim.subdivisions} min="1" max="12" aria-label="Number of subdivisions for {dim.key}" oninput={e => setDim(dim.key, { subdivisions: Math.max(1, Math.min(12, parseInt(e.currentTarget.value) || 1)) }, true)} />
                                            </label>
                                        {:else}
                                            <label class="checkbox-field">
                                                <input type="checkbox" checked={dim.compress} onchange={e => setDim(dim.key, { compress: e.currentTarget.checked })} />
                                                Compress sparse divisions
                                            </label>
                                        {/if}
                                        <fieldset class="nav-fieldset">
                                            <legend>Navigation within group</legend>
                                            {@render presetSelect(dim.nav.sibling, 'Keys', names => setDim(dim.key, { nav: { ...dim.nav, sibling: names } }))}
                                            {@render keyInput(dim.nav.sibling[0], 'Previous')}
                                            {@render keyInput(dim.nav.sibling[1], 'Next')}
                                        </fieldset>
                                        <fieldset class="nav-fieldset">
                                            <legend>Navigation into and out of group</legend>
                                            {@render keyInput(dim.nav.drill[1], 'In')}
                                            {@render keyInput(dim.nav.drill[0], 'Out')}
                                        </fieldset>
                                        {#if divs.length && dim.type === 'categorical'}
                                            <fieldset class="nav-fieldset divisions-fieldset">
                                                <legend>Division IDs</legend>
                                                <ul class="divisions-list" aria-label="Divisions for {dim.key}">
                                                    {#each divs as div (div.id)}
                                                        {@const v = divValue(dim.key, div)}
                                                        <li class="division-row">
                                                            <span class="division-original" title={v}>{v}</span>
                                                            <input type="text" class="division-id-input" value={div.id} aria-label="ID for division {v} of {dim.key}" onchange={e => setDim(dim.key, { divisionIds: { ...dim.divisionIds, [v]: e.currentTarget.value.trim() } })} />
                                                        </li>
                                                    {/each}
                                                </ul>
                                            </fieldset>
                                        {/if}
                                        <details class="dim-options label-subsection" open>
                                            <summary class="dim-options-summary">Dimension label (level 1)</summary>
                                            <div class="dim-options-body">
                                                <LabelBuilder level={1} value={r.labels.perDimension[dim.key] ?? template({ template: `{key:"${dim.key}"}`, name: 'group' })} dimensionKey={dim.key} onchange={v => setLabel('perDimension', dim.key, v)} />
                                            </div>
                                        </details>
                                        {#if divs.length}
                                            <details class="dim-options label-subsection">
                                                <summary class="dim-options-summary">Division label (level 2)</summary>
                                                <div class="dim-options-body">
                                                    <LabelBuilder level={2} value={r.labels.perDivision[dim.key] ?? template({ template: `{value:"${dim.key}"}`, name: 'subgroup' })} dimensionKey={dim.key} onchange={v => setLabel('perDivision', dim.key, v)} />
                                                </div>
                                            </details>
                                        {/if}
                                    </div>
                                </details>
                            {/if}
                        </li>
                    {/each}
                </ul>

                <section class="schema-section leaf-label-section">
                    <h3 class="section-heading">Leaf Node Labels</h3>
                    <details class="dim-options">
                        <summary class="dim-options-summary">Edit label template</summary>
                        <div class="dim-options-body">
                            <LabelBuilder level={3} value={r.labels.leaves} onchange={v => recipe('Updated label', rr => (rr.labels.leaves = v), true)} />
                        </div>
                    </details>
                </section>

                <label class="checkbox-field allow-more">
                    <input type="checkbox" bind:checked={allowMore} />
                    Allow more than 3 dimensions (I know what I am doing)
                </label>
                <label class="checkbox-field allow-more">
                    <input type="checkbox" checked={ui.hideLeafNodes} onchange={e => (app.ui.schema.hideLeafNodes = e.currentTarget.checked)} />
                    Hide data points in the graph
                </label>
                <label class="field-label allow-more">
                    Graph layout
                    <select value={ui.graphMode} onchange={e => (app.ui.schema.graphMode = e.currentTarget.value as 'tree')}>
                        <option value="tree">Tree</option>
                        <option value="force">Force</option>
                    </select>
                </label>
            {/if}
        </div>
    {/if}
</div>

<style>
    /* ── Panel shell ── */
    .schema-panel {
        display: flex;
        flex-direction: column;
        width: 360px;
        flex-shrink: 0;
        border-right: 1px solid var(--dn-border);
        background: var(--dn-surface);
        overflow: hidden;
        transition: width 0.2s ease;
        height: 100%;
    }
    .schema-panel.collapsed { width: 44px; }

    /* ── Header ── */
    .schema-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-shrink: 0;
        padding: calc(var(--dn-space) * 1.25) calc(var(--dn-space) * 1.5);
        border-bottom: 1px solid var(--dn-border);
        background: var(--dn-surface);
        gap: calc(var(--dn-space) * 1);
    }
    .collapsed .schema-header { justify-content: center; padding: calc(var(--dn-space) * 1.25) 0; }

    .schema-title {
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--dn-text);
        white-space: nowrap;
        flex: 1;
    }

    .collapse-btn {
        flex-shrink: 0;
        width: 28px; height: 28px;
        min-width: 28px; min-height: 28px;
        display: flex; align-items: center; justify-content: center;
        padding: 0;
        background: transparent;
        border: 1px solid var(--dn-control);
        border-radius: calc(var(--dn-radius) / 2);
        color: var(--dn-text-muted);
        cursor: pointer;
        transition: background 0.15s, color 0.15s;
    }
    .collapse-btn:hover { background: var(--dn-accent-soft); color: var(--dn-text); }
    .collapse-btn svg { width: 14px; height: 14px; }

    /* ── Graph section ── */
    .schema-graph-section {
        flex: 0 0 auto;
        display: flex;
        flex-direction: column;
        border-bottom: 1px solid var(--dn-border);
        background: var(--dn-bg);
    }
    .viewer-canvas {
        position: relative;
        display: flex;
        height: 350px;
    }

    .swap {
        position: absolute;
        right: 6px;
        bottom: 6px;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        background: var(--dn-bg);
    }

    .swap[aria-pressed='true'] {
        color: var(--dn-accent);
        border-color: var(--dn-accent);
    }

    :global(.viewer-canvas .dn-inspector-tooltip) {
        display: none;
    }

    /* ── Builder section ── */
    .schema-builder-section {
        flex: 1;
        overflow-y: auto;
        padding: calc(var(--dn-space) * 1.5);
        display: flex;
        flex-direction: column;
        gap: 0;
        min-height: 0;
        padding-top: 0;
    }
    .schema-empty { margin: 0; font-size: 0.8125rem; color: var(--dn-text-muted); }

    /* ── Sections ── */
    .schema-section {
        padding: calc(var(--dn-space) * 1) 0;
        border-bottom: 1px solid var(--dn-border);
        display: flex;
        flex-direction: column;
        gap: calc(var(--dn-space) * 0.75);
    }
    .section-heading {
        margin: 0 0 calc(var(--dn-space) * 0.25);
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--dn-text-muted);
    }
    .section-toggle { font-size: 0.8125rem; }
    .section-toggle-label { display: flex; align-items: center; gap: calc(var(--dn-space) * 0.5); }
    .badge-entry {
        font-size: 0.625rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;
        padding: 1px 5px; border-radius: 3px;
        background: rgba(192, 85, 85, 0.15); color: #c05555;
    }
    /* ── Shared form fields ── */
    .field-label {
        display: flex; align-items: center; justify-content: space-between;
        gap: calc(var(--dn-space) * 1);
        font-size: 0.8125rem; color: var(--dn-text-muted);
    }
    .field-label select, .field-label .text-input {
        font-family: var(--dn-font); font-size: 0.8125rem;
        padding: calc(var(--dn-space) * 0.5) calc(var(--dn-space) * 1);
        border: 1px solid var(--dn-border); border-radius: calc(var(--dn-radius) / 2);
        background: var(--dn-bg); color: var(--dn-text);
        min-height: 32px;
    }
    .field-label .text-input { flex: 1; min-width: 0; }
    .number-input {
        font-family: var(--dn-font); font-size: 0.8125rem;
        padding: calc(var(--dn-space) * 0.5) calc(var(--dn-space) * 0.75);
        border: 1px solid var(--dn-border); border-radius: calc(var(--dn-radius) / 2);
        background: var(--dn-bg); color: var(--dn-text);
        min-height: 32px; width: 64px; text-align: center;
    }
    .checkbox-field {
        display: flex; align-items: center; gap: calc(var(--dn-space) * 0.75);
        font-size: 0.8125rem; color: var(--dn-text-muted); cursor: pointer;
    }
    .checkbox-field input { accent-color: var(--dn-accent); cursor: pointer; flex-shrink: 0; }

    /* ── Dimensions list ── */
    .dimensions-list {
        list-style: none; margin: calc(var(--dn-space) * 1) 0 0;
        padding: 0; display: flex; flex-direction: column; gap: 2px;
    }
    .dimension-item {
        border: 1px solid var(--dn-border);
        border-radius: calc(var(--dn-radius) / 2);
        background: var(--dn-bg); overflow: hidden;
    }
    .dimension-item.included { border-color: var(--dn-accent-light); }

    .dimension-header {
        display: flex; align-items: center; gap: calc(var(--dn-space) * 1);
        padding: calc(var(--dn-space) * 0.75) calc(var(--dn-space) * 1);
    }
    .dimension-header input[type="checkbox"] {
        flex-shrink: 0; accent-color: var(--dn-accent); width: 16px; height: 16px; cursor: pointer;
    }
    .dimension-header input[type="checkbox"]:disabled { opacity: 0.4; cursor: not-allowed; }

    .dimension-label {
        display: flex; align-items: center; gap: calc(var(--dn-space) * 0.5);
        font-size: 0.8125rem; cursor: pointer; flex: 1; min-width: 0;
    }
    .nav-slot-badge {
        display: inline-flex; align-items: center; justify-content: center;
        width: 18px; height: 18px; border-radius: 50%;
        background: var(--dn-accent); color: #fff;
        font-size: 0.6875rem; font-weight: 700; flex-shrink: 0;
    }
    .dim-key {
        font-weight: 600; color: var(--dn-text);
        overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;
    }
    .dim-type-badge {
        font-size: 0.625rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em;
        padding: 1px 5px; border-radius: 3px;
        background: var(--dn-accent-soft); color: var(--dn-accent); flex-shrink: 0;
    }
    .dim-type-badge.numerical { background: rgba(103,128,192,0.15); color: var(--dn-accent-mid); }
    /* ── Options disclosure ── */
    .dim-options { border-top: 1px solid var(--dn-border); }
    .dim-options-summary {
        padding: calc(var(--dn-space) * 0.5) calc(var(--dn-space) * 1);
        font-size: 0.75rem; color: var(--dn-text-muted);
        cursor: pointer; user-select: none; list-style: none;
        display: flex; align-items: center; gap: calc(var(--dn-space) * 0.5);
    }
    .dim-options-summary::-webkit-details-marker { display: none; }
    .dim-options-summary::before {
        content: '▶'; font-size: 0.625rem; transition: transform 0.15s; display: inline-block;
    }
    details[open] .dim-options-summary::before { transform: rotate(90deg); }

    .dim-options-body {
        padding: calc(var(--dn-space) * 1);
        display: flex; flex-direction: column; gap: calc(var(--dn-space) * 1.25);
    }

    /* ── Label subsections ── */
    .label-subsection {
        border: 1px solid var(--dn-border);
        border-radius: calc(var(--dn-radius) / 2);
        margin-top: calc(var(--dn-space) * 0.5);
    }
    .leaf-label-section {
        margin-top: calc(var(--dn-space) * 1.5);
        border-top: 2px solid var(--dn-border);
        padding-top: calc(var(--dn-space) * 1);
    }

    /* ── Nav fieldsets ── */
    .nav-fieldset {
        border: 1px solid var(--dn-border); border-radius: calc(var(--dn-radius) / 2);
        padding: calc(var(--dn-space) * 0.75) calc(var(--dn-space) * 1);
        margin: 0;
        display: flex; flex-direction: column; gap: calc(var(--dn-space) * 0.75);
    }
    .nav-fieldset legend {
        font-size: 0.75rem; font-weight: 600; color: var(--dn-text-muted);
        padding: 0 calc(var(--dn-space) * 0.5);
        display: flex; align-items: center; gap: calc(var(--dn-space) * 0.5);
    }
    .compressed-hint {
        font-size: 0.625rem; font-weight: 400; color: var(--dn-text-muted); font-style: italic;
    }

    .nav-rule-row {
        display: grid; grid-template-columns: 48px 1fr 72px;
        align-items: center; gap: calc(var(--dn-space) * 0.5);
    }
    .nav-dir-label { font-size: 0.75rem; color: var(--dn-text-muted); white-space: nowrap; }
    .nav-name-input, .nav-key-input {
        font-family: var(--dn-font); font-size: 0.75rem;
        padding: calc(var(--dn-space) * 0.5);
        border: 1px solid var(--dn-border); border-radius: calc(var(--dn-radius) / 2);
        background: var(--dn-bg); color: var(--dn-text);
        min-height: 28px; width: 100%;
    }
    .nav-key-input { font-family: var(--dn-font-mono); font-size: 0.7rem; }
    .nav-name-input:focus, .nav-key-input:focus, .number-input:focus {
        outline: 2px solid var(--dn-accent); outline-offset: 1px;
    }

    /* ── Divisions list ── */
    .divisions-fieldset { gap: calc(var(--dn-space) * 0.5); }
    .divisions-list {
        list-style: none; margin: 0; padding: 0;
        display: flex; flex-direction: column; gap: 3px;
        max-height: 180px; overflow-y: auto;
    }
    .division-row {
        display: grid; grid-template-columns: 1fr 1fr;
        align-items: center; gap: calc(var(--dn-space) * 0.5);
    }
    .division-original {
        font-size: 0.75rem; color: var(--dn-text-muted);
        overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .division-id-input {
        font-family: var(--dn-font-mono); font-size: 0.7rem;
        padding: calc(var(--dn-space) * 0.4) calc(var(--dn-space) * 0.6);
        border: 1px solid var(--dn-border); border-radius: calc(var(--dn-radius) / 2);
        background: var(--dn-bg); color: var(--dn-text);
        min-height: 26px; width: 100%;
    }
    .division-id-input:focus { outline: 2px solid var(--dn-accent); outline-offset: 1px; }

    /* ── Allow-more ── */
    .allow-more {
        margin-top: calc(var(--dn-space) * 1.5);
        padding-top: calc(var(--dn-space) * 1);
        border-top: 1px solid var(--dn-border);
        font-size: 0.75rem;
    }
</style>
