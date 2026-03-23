<script lang="ts">
    import { onDestroy } from 'svelte';
    import { appState, type PrepState } from '../../store/appState';
    import GraphCanvas from '../components/GraphCanvas.svelte';

    let selectedNodeIds = $state<string[]>([]);
    let selectedEdgeIds = $state<string[]>([]);
    let prep = $state<PrepState | null>(null);

    const _unsub = appState.subscribe(s => { prep = s.prepState; });
    onDestroy(_unsub);

    function continueToTesting() {
        appState.update(s => ({ ...s, currentStep: 3 }));
    }
</script>

<div class="editor-step">
    <div class="step-header">
        <h2 id="step-heading-2" tabindex="-1">Editor</h2>
        {#if prep?.hasRun}
            <p class="step-desc">
                Your navigation structure was configured in Prep. Review the structure below, adjust any settings in the Schema panel, and continue to testing when ready.
            </p>
            <p class="prep-status-banner" role="status" aria-live="polite">
                ✓ Structure configured by Prep
            </p>
        {:else}
            <p class="step-desc">
                Draw nodes and edges to define the navigation graph.
                Nodes represent elements users can navigate to; edges define movement between them.
            </p>
        {/if}
    </div>

    <GraphCanvas
        selectNodes={(ids) => { selectedNodeIds = ids; }}
        selectEdges={(ids) => { selectedEdgeIds = ids; }}
    />

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
        padding-bottom: calc(var(--dn-space) * 2);
    }

    .step-header h2 {
        margin: 0 0 calc(var(--dn-space) * 0.5);
        font-size: 1.5rem;
        font-weight: 600;
        color: var(--dn-text);
    }

    .step-desc {
        margin: 0;
        color: var(--dn-text-muted);
        font-size: 0.9375rem;
    }

    .prep-status-banner {
        margin: calc(var(--dn-space) * 0.75) 0 0;
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--dn-accent);
    }

    .step-actions {
        flex-shrink: 0;
        display: flex;
        justify-content: flex-end;
        padding-top: calc(var(--dn-space) * 2);
    }
</style>
