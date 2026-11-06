<script lang="ts">
    import { app, edit } from '../../../model/state.svelte';
    import { newDim, syncKeys, type Doc } from '../../../model/doc';
    import ComputedVariableModal from './ComputedVariableModal.svelte';
    import CreateDataWizard from './CreateDataWizard.svelte';
    import { computeDimensionSuggestion } from './dimensionSuggestions';

    const data = $derived(app.doc.data.rows);
    const fields = $derived(app.doc.data.fields);
    const activeVars = $derived(fields.filter(f => !f.removed));
    const removedVars = $derived(fields.filter(f => f.removed));
    const dimKeys = $derived(new Set(app.doc.recipe.dimensions.map(d => d.key)));
    const suggestedKeys = $derived.by(() => {
        if (app.ui.qa !== 'choose-dimensions' || !app.doc.chart.type) return new Set<string>();
        const s = computeDimensionSuggestion(app.doc.chart.type, fields, app.doc.data.idKey, data);
        return new Set(Object.entries(s ?? {}).filter(([, v]) => v.primary).map(([k]) => k));
    });

    const change = (label: string, fn: (d: Doc) => void) =>
        edit(label, d => {
            fn(d);
            Object.assign(d.recipe, syncKeys(d.recipe));
        });

    function toggleType(key: string) {
        change(`Prep: changed type of ${key}`, d => {
            const f = d.data.fields.find(f => f.key === key)!;
            f.type = f.type === 'numerical' ? 'categorical' : 'numerical';
            const i = d.recipe.dimensions.findIndex(x => x.key === key);
            if (i >= 0) d.recipe.dimensions[i] = { ...newDim(key, f.type, 0, d.data.rows ?? []), nav: d.recipe.dimensions[i].nav };
            delete d.recipe.labels.perDivision[key];
        });
    }

    const setRemoved = (key: string, removed: boolean) =>
        change(`Prep: ${removed ? 'removed' : 'restored'} variable ${key}`, d => {
            d.data.fields = d.data.fields.map(f => (f.key === key ? { ...f, removed: removed || undefined } : f));
            if (removed) d.recipe.dimensions = d.recipe.dimensions.filter(x => x.key !== key);
            if (removed && d.data.idKey === key) d.data.idKey = null;
        });

    function createDimension(key: string) {
        change(`Prep: added dimension ${key}`, d => {
            if (!d.recipe.dimensions.some(x => x.key === key)) d.recipe.dimensions.push(newDim(key, d.data.fields.find(f => f.key === key)!.type, d.recipe.dimensions.length, d.data.rows ?? []));
        });
        app.ui.qa = `dim-type-${key}`;
    }

    let showComputed = $state(false);
    let showCreate = $state(false);
</script>


<div class="var-panel">
    <h3 class="panel-heading">Variables (metadata)</h3>

    {#if data === null}
        <p class="var-placeholder">
            Upload a dataset in Step 0, or
            <button class="link-btn" onclick={() => (showCreate = true)}>create data manually</button>.
        </p>
    {:else}
        <!-- Active variables -->
        <ul class="var-list" role="list">
            {#each activeVars as v (v.key)}
                <li class="var-item">
                    <button
                        class="var-badge"
                        class:var-badge-num={v.type === 'numerical'}
                        class:var-badge-cat={v.type === 'categorical'}
                        onclick={() => toggleType(v.key)}
                        aria-label="{v.type === 'numerical' ? 'Numerical' : 'Categorical'} — click to toggle type for {v.key}"
                        title="Click to toggle type"
                    >
                        {v.type === 'numerical' ? 'NUM' : 'CAT'}
                    </button>
                    <span class="var-name">"{v.key}"</span>
                    {#if v.key === app.doc.data.idKey}
                        <span class="var-id-badge" aria-label="Unique identifier column">ID</span>
                    {/if}
                    {#if suggestedKeys.has(v.key)}
                        <span class="var-suggested-badge" aria-label="{v.key} is suggested for this chart type">★ Suggested</span>
                    {/if}
                    <div class="var-actions">
                        <button
                            class="link-btn"
                            onclick={() => setRemoved(v.key, true)}
                            aria-label="Remove variable {v.key}"
                        >
                            remove variable
                        </button>
                        {#if dimKeys.has(v.key)}
                            <span class="var-dim-done" aria-label="{v.key} is set up as a dimension">
                                &#x2713; added
                            </span>
                        {:else}
                            <button
                                class="var-dim-btn"
                                onclick={() => createDimension(v.key)}
                                aria-label="Set up {v.key} as a dimension"
                                title="This will guide you through setting up {v.key} as a dimension."
                            >
                                Create dimension &#x2192;
                            </button>
                        {/if}
                    </div>
                </li>
            {/each}
        </ul>

        <button class="btn-add-var" onclick={() => (showComputed = true)}>
            + add variable
        </button>

        <!-- Removed variables -->
        {#if removedVars.length > 0}
            <section class="var-removed-section" aria-label="Removed variables">
                <h4 class="var-removed-heading">Removed variables</h4>
                <ul role="list">
                    {#each removedVars as v (v.key)}
                        <li class="var-item var-item-removed">
                            <span
                                class="var-badge var-badge-muted"
                                aria-label="{v.type === 'numerical' ? 'Numerical' : 'Categorical'}"
                            >
                                {v.type === 'numerical' ? 'NUM' : 'CAT'}
                            </span>
                            <span class="var-name var-name-muted">"{v.key}"</span>
                            <button
                                class="link-btn"
                                onclick={() => setRemoved(v.key, false)}
                                aria-label="Add {v.key} back to active variables"
                            >
                                add variable back
                            </button>
                        </li>
                    {/each}
                </ul>
            </section>
        {/if}
    {/if}
</div>

{#if showComputed}
    <ComputedVariableModal onclose={() => (showComputed = false)} />
{/if}
{#if showCreate}
    <CreateDataWizard onclose={() => (showCreate = false)} />
{/if}

<style>
    .var-panel {
        display: flex;
        flex-direction: column;
        gap: calc(var(--dn-space) * 1.5);
        padding: calc(var(--dn-space) * 2);
        height: 100%;
        overflow-y: auto;
    }

    .panel-heading {
        margin: 0;
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--dn-text);
        text-transform: uppercase;
        letter-spacing: 0.04em;
        flex-shrink: 0;
    }

    .var-placeholder {
        margin: 0;
        font-size: 0.875rem;
        color: var(--dn-text-muted);
    }

    /* ── Variable list ── */

    .var-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: calc(var(--dn-space) * 0.5);
    }

    .var-item {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: calc(var(--dn-space) * 0.75);
        padding: calc(var(--dn-space) * 0.5) 0;
        border-bottom: 1px solid var(--dn-border);
    }

    .var-item:last-child {
        border-bottom: none;
    }

    /* ── Type badge ── */

    .var-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 44px;
        min-height: 26px;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 0.6875rem;
        font-weight: 700;
        font-family: var(--dn-font-mono);
        letter-spacing: 0.05em;
        border: 2px solid transparent;
        cursor: pointer;
        flex-shrink: 0;
        /* Override global button min-height for this compact badge */
        min-height: 26px !important;
    }

    .var-badge-num {
        background: #dbeafe;
        color: #1e40af;
        border-color: #93c5fd;
    }

    :global(.dark) .var-badge-num {
        background: rgba(30, 64, 175, 0.25);
        color: #93c5fd;
        border-color: #1e40af;
    }

    .var-badge-cat {
        background: #fce7f3;
        color: #9d174d;
        border-color: #f9a8d4;
    }

    :global(.dark) .var-badge-cat {
        background: rgba(157, 23, 77, 0.25);
        color: #f9a8d4;
        border-color: #9d174d;
    }

    .var-badge-muted {
        background: var(--dn-surface);
        color: var(--dn-text-muted);
        border-color: var(--dn-border);
        cursor: default;
    }

    /* ── Variable name ── */

    .var-name {
        font-family: var(--dn-font-mono);
        font-size: 0.8125rem;
        color: var(--dn-text);
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .var-name-muted {
        color: var(--dn-text-muted);
        text-decoration: line-through;
    }

    /* ── ID badge ── */

    .var-id-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 1px 5px;
        border-radius: 3px;
        font-size: 0.625rem;
        font-weight: 700;
        font-family: var(--dn-font-mono);
        letter-spacing: 0.05em;
        background: var(--dn-accent-soft);
        color: var(--dn-accent);
        border: 1px solid var(--dn-accent-light);
        flex-shrink: 0;
    }

    /* ── Suggested badge (shown during choose-dimensions question) ── */

    .var-suggested-badge {
        display: inline-flex;
        align-items: center;
        padding: 1px 6px;
        border-radius: 10px;
        font-size: 0.6875rem;
        font-weight: 700;
        color: var(--dn-accent);
        background: var(--dn-accent-soft);
        border: 1px solid var(--dn-accent-light);
        letter-spacing: 0.01em;
        flex-shrink: 0;
        white-space: nowrap;
    }

    /* ── Actions inline group ── */

    .var-actions {
        display: flex;
        align-items: center;
        gap: calc(var(--dn-space) * 0.75);
        flex-shrink: 0;
        margin-left: auto;
    }

    /* ── Link-style buttons ── */

    .link-btn {
        background: none;
        border: none;
        padding: 0;
        font-size: 0.8125rem;
        color: var(--dn-accent);
        cursor: pointer;
        text-decoration: underline;
        text-underline-offset: 2px;
        min-height: 0;
        min-width: 0;
        border-radius: 0;
        font-family: var(--dn-font);
    }

    .link-btn:hover {
        color: var(--dn-accent-hover);
    }

    /* ── Dimension button / done indicator ── */

    .var-dim-btn {
        background: none;
        border: 1px solid var(--dn-accent);
        padding: 2px 8px;
        font-size: 0.75rem;
        font-family: var(--dn-font);
        color: var(--dn-accent);
        cursor: pointer;
        border-radius: 4px;
        min-height: 0;
        min-width: 0;
        white-space: nowrap;
    }

    .var-dim-btn:hover {
        background: var(--dn-accent-soft);
    }

    .var-dim-done {
        font-size: 0.75rem;
        color: var(--dn-text-muted);
        white-space: nowrap;
    }

    /* ── Add variable button ── */

    .btn-add-var {
        align-self: flex-start;
        background: none;
        border: 1px dashed var(--dn-border);
        padding: calc(var(--dn-space) * 0.5) calc(var(--dn-space) * 1.5);
        font-size: 0.8125rem;
        font-family: var(--dn-font);
        color: var(--dn-text-muted);
        cursor: pointer;
        border-radius: var(--dn-radius);
        min-height: 0;
        transition: border-color 0.15s, color 0.15s;
    }

    .btn-add-var:hover {
        border-color: var(--dn-accent);
        color: var(--dn-accent);
    }

    /* ── Removed variables section ── */

    .var-removed-section {
        padding-top: calc(var(--dn-space) * 1);
        border-top: 1px solid var(--dn-border);
    }

    .var-removed-heading {
        margin: 0 0 calc(var(--dn-space) * 0.75);
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--dn-text-muted);
        text-transform: uppercase;
        letter-spacing: 0.04em;
    }

    .var-removed-section ul {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: calc(var(--dn-space) * 0.25);
    }

    .var-item-removed {
        opacity: 0.7;
    }
</style>
