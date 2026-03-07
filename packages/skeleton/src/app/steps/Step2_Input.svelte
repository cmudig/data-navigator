<script lang="ts">
    import { get } from 'svelte/store';
    import { appState } from '../../store/appState';
    import type { SkeletonEdge } from '../../store/types';
    import GraphCanvas from '../components/GraphCanvas.svelte';
    import EntryNodeModal from '../components/EntryNodeModal.svelte';

    const initial = get(appState);
    let nodes = $state(initial.nodes);
    let edges = $state(initial.edges);
    let selectedEdgeIds = $state(initial.selectedEdgeIds);
    let entryNodeId = $state(initial.entryNodeId);
    let inputConfig = $state({ ...initial.inputConfig });

    $effect(() => {
        return appState.subscribe(s => {
            nodes = s.nodes;
            edges = s.edges;
            selectedEdgeIds = s.selectedEdgeIds;
            entryNodeId = s.entryNodeId;
            // Update local inputConfig only from store if it differs (avoid loop)
            inputConfig = { ...s.inputConfig };
        });
    });

    let editingEnabled = $state(false);
    let showEntryModal = $state(false);
    let bulkDirection = $state<SkeletonEdge['direction']>('down');

    const AXIS_BUCKETS: Array<{ dir: SkeletonEdge['direction']; label: string; icon: string }> = [
        { dir: 'up',     label: 'Up',     icon: '↑' },
        { dir: 'down',   label: 'Down',   icon: '↓' },
        { dir: 'left',   label: 'Left',   icon: '←' },
        { dir: 'right',  label: 'Right',  icon: '→' },
        { dir: 'exit',   label: 'Exit',   icon: '⎋' },
        { dir: 'custom', label: 'Custom', icon: '✱' },
    ];

    const edgeList = $derived([...edges.values()]);
    const selectedEdgeList = $derived(edgeList.filter(e => selectedEdgeIds.has(e.id)));

    function getNodeLabel(id: string): string {
        return nodes.get(id)?.label ?? id;
    }

    function setInputConfig(key: keyof typeof inputConfig, value: boolean) {
        appState.update(s => ({
            ...s,
            inputConfig: { ...s.inputConfig, [key]: value },
        }));
    }

    function setEdgeDirection(edgeId: string, direction: SkeletonEdge['direction']) {
        appState.update(s => {
            const edge = s.edges.get(edgeId);
            if (!edge) return s;
            const newEdges = new Map(s.edges);
            newEdges.set(edgeId, { ...edge, direction });
            return { ...s, edges: newEdges };
        });
    }

    function applyBulkDirection() {
        if (selectedEdgeList.length === 0) return;
        appState.update(s => {
            const newEdges = new Map(s.edges);
            selectedEdgeIds.forEach(id => {
                const edge = newEdges.get(id);
                if (edge) newEdges.set(id, { ...edge, direction: bulkDirection });
            });
            return { ...s, edges: newEdges };
        });
    }

    function handleContinue() {
        if (!entryNodeId) {
            showEntryModal = true;
            return;
        }
        appState.update(s => ({ ...s, currentStep: 3 }));
    }
</script>

<div class="step2-layout">
    <!-- Left: canvas area -->
    <div class="step2-canvas-area">
        <div class="step2-canvas-header">
            <h2 id="step-heading-2" tabindex="-1">Input</h2>
            <label class="edit-toggle">
                <input type="checkbox" bind:checked={editingEnabled} />
                <span>Enable editing</span>
            </label>
        </div>

        <div class="step2-canvas-body">
            <GraphCanvas
                readonly={!editingEnabled}
                selectNodes={() => {}}
                selectEdges={() => {}}
            />
        </div>

        <div class="step2-canvas-footer">
            <button class="btn-primary" type="button" onclick={handleContinue}>
                Continue to Render →
            </button>
        </div>
    </div>

    <!-- Right: input configuration panel -->
    <aside class="step2-panel" aria-label="Input configuration">

        <!-- Global settings -->
        <section class="config-section">
            <h3 class="config-section-title">Global settings</h3>
            <label class="config-toggle">
                <input
                    type="checkbox"
                    checked={inputConfig.enableKeyboard}
                    onchange={(e) => setInputConfig('enableKeyboard', (e.target as HTMLInputElement).checked)}
                />
                <span>Enable keyboard</span>
            </label>
            <!-- Switch access: omitted pending more thorough testing
            <label class="config-toggle">
                <input
                    type="checkbox"
                    checked={inputConfig.enableSwitch}
                    onchange={(e) => setInputConfig('enableSwitch', (e.target as HTMLInputElement).checked)}
                />
                <span>Enable switch access</span>
            </label>
            -->
            <label class="config-toggle">
                <input
                    type="checkbox"
                    checked={inputConfig.enableTextInput}
                    onchange={(e) => setInputConfig('enableTextInput', (e.target as HTMLInputElement).checked)}
                />
                <span>Enable text input</span>
            </label>
        </section>

        <!-- Edge axis buckets -->
        <section class="config-section">
            <h3 class="config-section-title">Edge navigation axes</h3>
            {#if edgeList.length === 0}
                <p class="config-empty">No edges defined. Add edges in Step 1.</p>
            {:else}
                <div class="axis-buckets">
                    {#each AXIS_BUCKETS as bucket}
                        {@const bucketEdges = edgeList.filter(e => e.direction === bucket.dir)}
                        <div class="axis-bucket">
                            <div class="axis-bucket-header">
                                <span class="axis-icon" aria-hidden="true">{bucket.icon}</span>
                                <span class="axis-label">{bucket.label}</span>
                                <span class="axis-count" aria-label="{bucketEdges.length} edges">
                                    ({bucketEdges.length})
                                </span>
                            </div>
                            {#if bucketEdges.length > 0}
                                <ul class="edge-list" aria-label="{bucket.label} edges">
                                    {#each bucketEdges as edge}
                                        <li class="edge-row">
                                            <span class="edge-path">
                                                {getNodeLabel(edge.sourceId)} → {getNodeLabel(edge.targetId)}
                                            </span>
                                            <select
                                                class="direction-select"
                                                aria-label="Direction for edge {getNodeLabel(edge.sourceId)} to {getNodeLabel(edge.targetId)}"
                                                value={edge.direction}
                                                onchange={(e) => setEdgeDirection(edge.id, (e.target as HTMLSelectElement).value as SkeletonEdge['direction'])}
                                            >
                                                {#each AXIS_BUCKETS as opt}
                                                    <option value={opt.dir}>{opt.icon} {opt.label}</option>
                                                {/each}
                                            </select>
                                        </li>
                                    {/each}
                                </ul>
                            {/if}
                        </div>
                    {/each}
                </div>
            {/if}
        </section>

        <!-- Bulk assign (only when edges are selected on canvas) -->
        {#if selectedEdgeList.length > 0}
            <section class="config-section">
                <h3 class="config-section-title">Bulk assign</h3>
                <p class="config-desc">{selectedEdgeList.length} edge(s) selected on canvas</p>
                <div class="bulk-assign-row">
                    <select
                        class="direction-select"
                        bind:value={bulkDirection}
                        aria-label="Direction to apply to selected edges"
                    >
                        {#each AXIS_BUCKETS as opt}
                            <option value={opt.dir}>{opt.icon} {opt.label}</option>
                        {/each}
                    </select>
                    <button class="btn-ghost btn-sm" type="button" onclick={applyBulkDirection}>
                        Apply
                    </button>
                </div>
            </section>
        {/if}

    </aside>
</div>

{#if showEntryModal}
    <EntryNodeModal
        onclose={() => { showEntryModal = false; }}
        onconfirm={() => {
            showEntryModal = false;
            appState.update(s => ({ ...s, currentStep: 3 }));
        }}
    />
{/if}

<style>
    .step2-layout {
        display: flex;
        height: 100%;
        min-height: 0;
        overflow: hidden;
    }

    /* ── Canvas area (left) ── */

    .step2-canvas-area {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-width: 0;
        min-height: 0;
    }

    .step2-canvas-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-shrink: 0;
        padding-bottom: calc(var(--dn-space) * 2);
    }

    .step2-canvas-header h2 {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 600;
        color: var(--dn-text);
    }

    .step2-canvas-body {
        flex: 1;
        min-height: 0;
        overflow: hidden;
    }

    .step2-canvas-footer {
        flex-shrink: 0;
        display: flex;
        justify-content: flex-end;
        padding-top: calc(var(--dn-space) * 2);
    }

    /* ── Edit toggle ── */

    .edit-toggle {
        display: flex;
        align-items: center;
        gap: calc(var(--dn-space) * 0.75);
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--dn-text-muted);
        cursor: pointer;
        user-select: none;
    }

    .edit-toggle input[type="checkbox"] {
        accent-color: var(--dn-accent);
        width: 16px;
        height: 16px;
        margin: 0;
    }

    /* ── Config panel (right) ── */

    .step2-panel {
        width: var(--dn-panel-width);
        flex-shrink: 0;
        border-left: 1px solid var(--dn-border);
        background: var(--dn-surface);
        overflow-y: auto;
        padding: calc(var(--dn-space) * 2);
        display: flex;
        flex-direction: column;
        gap: calc(var(--dn-space) * 0.5);
    }

    .config-section {
        display: flex;
        flex-direction: column;
        gap: calc(var(--dn-space) * 0.75);
        padding-bottom: calc(var(--dn-space) * 2);
        border-bottom: 1px solid var(--dn-border);
    }

    .config-section:last-child {
        border-bottom: none;
    }

    .config-section-title {
        margin: 0;
        font-size: 0.8125rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--dn-text-muted);
        padding-top: calc(var(--dn-space) * 1);
    }

    .config-toggle {
        display: flex;
        align-items: center;
        gap: calc(var(--dn-space) * 1);
        font-size: 0.9375rem;
        color: var(--dn-text);
        cursor: pointer;
        padding: calc(var(--dn-space) * 0.5) 0;
    }

    .config-toggle input[type="checkbox"] {
        accent-color: var(--dn-accent);
        width: 16px;
        height: 16px;
        margin: 0;
        flex-shrink: 0;
    }

    .config-empty {
        margin: 0;
        font-size: 0.875rem;
        color: var(--dn-text-muted);
        font-style: italic;
    }

    .config-desc {
        margin: 0;
        font-size: 0.875rem;
        color: var(--dn-text-muted);
    }

    /* ── Axis buckets ── */

    .axis-buckets {
        display: flex;
        flex-direction: column;
        gap: calc(var(--dn-space) * 0.5);
    }

    .axis-bucket {
        border: 1px solid var(--dn-border);
        border-radius: var(--dn-radius);
        overflow: hidden;
    }

    .axis-bucket-header {
        display: flex;
        align-items: center;
        gap: calc(var(--dn-space) * 0.75);
        padding: calc(var(--dn-space) * 0.75) calc(var(--dn-space) * 1.25);
        background: var(--dn-bg);
        font-size: 0.875rem;
        font-weight: 600;
    }

    .axis-icon {
        font-size: 1rem;
        width: 18px;
        text-align: center;
    }

    .axis-label {
        flex: 1;
        color: var(--dn-text);
    }

    .axis-count {
        color: var(--dn-text-muted);
        font-weight: 400;
        font-size: 0.8125rem;
    }

    .edge-list {
        margin: 0;
        padding: 0;
        list-style: none;
        border-top: 1px solid var(--dn-border);
    }

    .edge-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: calc(var(--dn-space) * 1);
        padding: calc(var(--dn-space) * 0.625) calc(var(--dn-space) * 1.25);
        background: var(--dn-surface);
        font-size: 0.8125rem;
        border-bottom: 1px solid var(--dn-border);
    }

    .edge-row:last-child {
        border-bottom: none;
    }

    .edge-path {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: var(--dn-text);
        font-family: var(--dn-font-mono);
        font-size: 0.75rem;
    }

    .direction-select {
        font-family: var(--dn-font);
        font-size: 0.8125rem;
        padding: calc(var(--dn-space) * 0.375) calc(var(--dn-space) * 0.75);
        border: 1px solid var(--dn-border);
        border-radius: calc(var(--dn-radius) * 0.5);
        background: var(--dn-bg);
        color: var(--dn-text);
        cursor: pointer;
        min-height: 0;
        min-width: 0;
    }

    /* ── Bulk assign ── */

    .bulk-assign-row {
        display: flex;
        align-items: center;
        gap: calc(var(--dn-space) * 1);
    }

    .bulk-assign-row .direction-select {
        flex: 1;
    }
</style>
