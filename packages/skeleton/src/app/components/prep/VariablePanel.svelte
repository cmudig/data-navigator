<script lang="ts">
    import { onDestroy } from 'svelte';
    import {
        appState,
        type PrepState,
        type VariableMeta,
        type QAChapterId,
    } from '../../../store/appState';
    import ComputedVariableModal from './ComputedVariableModal.svelte';

    // ─── Store mirrors ────────────────────────────────────────────────────────
    let data = $state<Record<string, unknown>[] | null>(null);
    let prep = $state<PrepState | null>(null);

    const unsub = appState.subscribe(s => {
        data = s.uploadedData;
        prep = s.prepState;
    });
    onDestroy(unsub);

    // ─── Derived lists ────────────────────────────────────────────────────────
    const activeVars = $derived(prep?.variables.filter(v => !v.removed) ?? []);
    const removedVars = $derived(prep?.variables.filter(v => v.removed) ?? []);

    // ─── Initialization ───────────────────────────────────────────────────────
    // When uploadedData arrives and no prepState exists yet, create initial state.
    $effect(() => {
        if (data && !prep) {
            const vars = buildInitialVariables(data);
            const initial: PrepState = {
                hasRun: false,
                variables: vars,
                customVariables: [],
                customData: null,
                qaProgress: {
                    currentChapterId: 'top-level-access',
                    currentQuestionId: '',
                    chapters: [
                        { id: 'top-level-access', completed: false, answers: {}, invalidated: false },
                        { id: 'dimensions',        completed: false, answers: {}, invalidated: false },
                        { id: 'navigation',        completed: false, answers: {}, invalidated: false },
                        { id: 'leaf-node-patterns', completed: false, answers: {}, invalidated: false },
                    ],
                    invalidatedQuestions: [],
                },
                labelConfig: {
                    level0: { template: '', name: 'root', includeIndex: false, includeParentName: false, omitKeyNames: false },
                    perDimension: {},
                    perDivision: {},
                    leaves: { template: '', name: 'data point', includeIndex: false, includeParentName: false, omitKeyNames: false },
                },
            };
            appState.update(s => ({ ...s, prepState: initial }));
        }
    });

    // ─── Type inference (mirrors SchemaPanel.inferType) ───────────────────────
    function inferType(values: unknown[]): 'numerical' | 'categorical' {
        const valid = values.filter(v => v !== null && v !== undefined && v !== '');
        if (valid.length === 0) return 'categorical';
        return valid.every(v => !isNaN(Number(v))) ? 'numerical' : 'categorical';
    }

    // ─── Variable initialization ──────────────────────────────────────────────
    function buildInitialVariables(rows: Record<string, unknown>[]): VariableMeta[] {
        if (!rows.length) return [];
        const keys = Object.keys(rows[0]);
        const total = rows.length;
        const ID_NAMES = new Set(['id', '_id', 'key', 'index']);

        const metas: VariableMeta[] = keys.map(key => {
            const values = rows.map(r => r[key]);
            const type = inferType(values);
            const uniqueCount = new Set(values.map(v => String(v))).size;
            const allUnique = uniqueCount === total && total > 1;
            const isId = allUnique && ID_NAMES.has(key.toLowerCase());
            return { key, type, isId, isDimension: false, removed: false };
        });

        // If no name-matched ID found, mark the first all-unique column as ID
        if (!metas.some(m => m.isId)) {
            const firstUnique = metas.find(m => {
                const values = rows.map(r => r[m.key]);
                return new Set(values.map(v => String(v))).size === total && total > 1;
            });
            if (firstUnique) firstUnique.isId = true;
        }

        return metas;
    }

    // ─── Mutations ────────────────────────────────────────────────────────────
    function toggleType(key: string) {
        appState.update(s => {
            if (!s.prepState) return s;
            const variables = s.prepState.variables.map(v =>
                v.key === key
                    ? { ...v, type: (v.type === 'numerical' ? 'categorical' : 'numerical') as VariableMeta['type'] }
                    : v
            );
            // Invalidate downstream Q/A answers that depended on this variable's type
            const qaProgress = {
                ...s.prepState.qaProgress,
                chapters: s.prepState.qaProgress.chapters.map(ch =>
                    ch.id === 'dimensions' || ch.id === 'navigation'
                        ? { ...ch, invalidated: true }
                        : ch
                ),
            };
            return { ...s, prepState: { ...s.prepState, variables, qaProgress } };
        });
    }

    function removeVariable(key: string) {
        appState.update(s => {
            if (!s.prepState) return s;
            const variables = s.prepState.variables.map(v =>
                v.key === key ? { ...v, removed: true, isDimension: false } : v
            );
            return { ...s, prepState: { ...s.prepState, variables } };
        });
    }

    function restoreVariable(key: string) {
        appState.update(s => {
            if (!s.prepState) return s;
            const variables = s.prepState.variables.map(v =>
                v.key === key ? { ...v, removed: false } : v
            );
            return { ...s, prepState: { ...s.prepState, variables } };
        });
    }

    // Triggers the Q/A engine to navigate to the Dimensions chapter for this variable.
    // QAEngine (Task 8) will read qaProgress.currentChapterId to know where to navigate.
    function createDimension(key: string) {
        appState.update(s => {
            if (!s.prepState) return s;
            return {
                ...s,
                prepState: {
                    ...s.prepState,
                    qaProgress: {
                        ...s.prepState.qaProgress,
                        currentChapterId: 'dimensions' as QAChapterId,
                        currentQuestionId: `dim-setup-${key}`,
                    },
                },
            };
        });
    }

    // ─── Modal state ──────────────────────────────────────────────────────────
    let showComputedVariableModal = $state(false);

    function openComputedVariableModal() {
        showComputedVariableModal = true;
    }
</script>

<div class="var-panel">
    <h3 class="panel-heading">Variables (metadata)</h3>

    {#if data === null && !prep}
        <p class="var-placeholder">
            Upload a dataset in Step 0, or
            <button class="link-btn" onclick={openComputedVariableModal}>create data manually</button>.
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
                    {#if v.isId}
                        <span class="var-id-badge" aria-label="Unique identifier column">ID</span>
                    {/if}
                    <div class="var-actions">
                        <button
                            class="link-btn"
                            onclick={() => removeVariable(v.key)}
                            aria-label="Remove variable {v.key}"
                        >
                            remove variable
                        </button>
                        {#if v.isDimension}
                            <span class="var-dim-done" aria-label="{v.key} is set up as a browsing group">
                                &#x2713; added
                            </span>
                        {:else}
                            <button
                                class="var-dim-btn"
                                onclick={() => createDimension(v.key)}
                                aria-label="Set up {v.key} as a browsing group"
                                title="This will guide you through setting up {v.key} as a browsing group."
                            >
                                Create dimension &#x2192;
                            </button>
                        {/if}
                    </div>
                </li>
            {/each}
        </ul>

        <button class="btn-add-var" onclick={openComputedVariableModal}>
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
                                onclick={() => restoreVariable(v.key)}
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

{#if showComputedVariableModal}
    <ComputedVariableModal onclose={() => { showComputedVariableModal = false; }} />
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

    .dark .var-badge-num {
        background: rgba(30, 64, 175, 0.25);
        color: #93c5fd;
        border-color: #1e40af;
    }

    .var-badge-cat {
        background: #fce7f3;
        color: #9d174d;
        border-color: #f9a8d4;
    }

    .dark .var-badge-cat {
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
