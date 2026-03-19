<script lang="ts">
    import { appState } from '../../store/appState';
    import GraphCanvas from '../components/GraphCanvas.svelte';

    let selectedNodeIds = $state<string[]>([]);
    let selectedEdgeIds = $state<string[]>([]);

    function continueToInput() {
        appState.update(s => ({ ...s, currentStep: 2 }));
    }
</script>

<div class="structure-step">
    <div class="step-header">
        <h2 id="step-heading-1" tabindex="-1">Structure</h2>
        <p class="step-desc">
            Draw nodes and edges to define the navigation graph.
            Nodes represent elements users can navigate to; edges define movement between them.
        </p>
    </div>

    <GraphCanvas
        selectNodes={(ids) => { selectedNodeIds = ids; }}
        selectEdges={(ids) => { selectedEdgeIds = ids; }}
    />

    <div class="step-actions">
        <button class="btn-primary" type="button" onclick={continueToInput}>
            Continue to Input →
        </button>
    </div>
</div>

<style>
    .structure-step {
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

    .step-actions {
        flex-shrink: 0;
        display: flex;
        justify-content: flex-end;
        padding-top: calc(var(--dn-space) * 2);
    }
</style>
