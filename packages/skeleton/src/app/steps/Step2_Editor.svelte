<script lang="ts">
    import { onDestroy } from 'svelte';
    import { get } from 'svelte/store';
    import { appState, type PrepState } from '../../store/appState';
    import { logAction } from '../../store/historyStore';
    import GraphCanvas from '../components/GraphCanvas.svelte';

    let selectedNodeIds = $state<string[]>([]);
    let selectedEdgeIds = $state<string[]>([]);
    let prep = $state<PrepState | null>(null);
    let scaffoldModeActive = $state(false);

    const _unsub = appState.subscribe(s => {
        prep = s.prepState;
        scaffoldModeActive = s.scaffoldModeActive;
    });
    onDestroy(_unsub);

    function continueToTesting() {
        appState.update(s => ({ ...s, currentStep: 3 }));
    }

    function toggleScaffold() {
        const s = get(appState);
        if (!s.scaffoldModeActive) {
            logAction('Entered scaffold mode'); // snapshot before positions change
        }
        appState.update(st => ({ ...st, scaffoldModeActive: !st.scaffoldModeActive }));
    }
</script>

<div class="editor-step">
    <div class="step-header">
        <div class="header-row">
            <h2 id="step-heading-2" tabindex="-1">Editor</h2>
            <div class="header-actions">
                {#if prep?.hasRun}
                    <span class="prep-status-badge" role="status" aria-live="polite">✓ Prep</span>
                {/if}
                <button
                    class="btn-ghost btn-sm scaffold-toggle"
                    class:active={scaffoldModeActive}
                    type="button"
                    aria-pressed={scaffoldModeActive}
                    onclick={toggleScaffold}
                >
                    {scaffoldModeActive ? '✕ Close Scaffold' : '⊡ Scaffold'}
                </button>
            </div>
        </div>
        {#if !prep?.hasRun}
            <p class="step-desc">
                Draw nodes and edges to define the navigation graph.
            </p>
        {/if}
    </div>

    <div class="editor-body">
        <div class="canvas-wrapper">
            <GraphCanvas
                selectNodes={(ids) => { selectedNodeIds = ids; }}
                selectEdges={(ids) => { selectedEdgeIds = ids; }}
            />
        </div>
    </div>

    <div class="step-actions">
        <button class="btn-primary" type="button" onclick={continueToTesting}>
            Continue to Testing →
        </button>
    </div>
</div>

<style>
    .editor-step {
        display: flex;
        flex-direction: column;
        height: 100%;
        min-height: 0;
        gap: 0;
    }

    .step-header {
        flex-shrink: 0;
        padding-bottom: calc(var(--dn-space) * 1.5);
    }

    .header-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: calc(var(--dn-space) * 2);
    }

    .step-header h2 {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 600;
        color: var(--dn-text);
    }

    .header-actions {
        display: flex;
        align-items: center;
        gap: calc(var(--dn-space) * 1);
        flex-shrink: 0;
    }

    .prep-status-badge {
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--dn-accent);
        background: var(--dn-accent-soft);
        border: 1px solid color-mix(in srgb, var(--dn-accent) 30%, transparent);
        border-radius: 4px;
        padding: 2px 7px;
        white-space: nowrap;
    }

    .scaffold-toggle {
        font-size: 0.875rem;
    }

    .scaffold-toggle.active {
        background: var(--dn-accent-soft);
        color: var(--dn-accent);
        border-color: var(--dn-accent-light);
    }

    .step-desc {
        margin: calc(var(--dn-space) * 0.75) 0 0;
        color: var(--dn-text-muted);
        font-size: 0.875rem;
    }

    .editor-body {
        flex: 1;
        min-height: 0;
        overflow: hidden;
    }

    .canvas-wrapper {
        display: flex;
        flex-direction: column;
        height: 100%;
        min-height: 0;
    }

    .step-actions {
        flex-shrink: 0;
        display: flex;
        justify-content: flex-end;
        padding-top: calc(var(--dn-space) * 1.5);
    }
</style>
