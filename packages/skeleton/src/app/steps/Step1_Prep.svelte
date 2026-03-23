<script lang="ts">
    import { onDestroy } from 'svelte';
    import VariablePanel from '../components/prep/VariablePanel.svelte';
    import DataTablePreview from '../components/prep/DataTablePreview.svelte';
    import QAEngine from '../components/prep/QAEngine.svelte';
    import { appState, type PrepState } from '../../store/appState';
    import { applyPrepToSchema } from '../../utils/prepAdapter';
    import { logAction } from '../../store/historyStore';

    let prep = $state<PrepState | null>(null);
    let showSkipWarning = $state(false);

    const _unsub = appState.subscribe(s => { prep = s.prepState; });
    onDestroy(_unsub);

    function continueToEditor() {
        if (prep?.hasRun) {
            appState.update(s => ({
                ...s,
                schemaState: applyPrepToSchema(s.prepState!, s.schemaState),
                currentStep: 2,
            }));
            logAction('Completed Prep — entered Editor');
        } else {
            showSkipWarning = true;
        }
    }

    function continueAnyway() {
        showSkipWarning = false;
        appState.update(s => ({ ...s, currentStep: 2 }));
        logAction('Skipped Prep — entered Editor');
    }
</script>

<!-- Step heading receives focus on step transition (see App.svelte focusStepHeading) -->
<h2 id="step-heading-1" tabindex="-1" class="visually-hidden">Prep</h2>

<div class="prep-layout">
    <div class="prep-panel prep-top-left">
        <VariablePanel />
    </div>
    <div class="prep-panel prep-top-right">
        <QAEngine />
    </div>
    <div class="prep-panel prep-bottom-left">
        <DataTablePreview />
    </div>
</div>

<div class="prep-footer">
    {#if showSkipWarning}
        <p class="prep-skip-warning" role="status">
            You haven't finished setting up your data yet. The editor can still auto-build a starting structure,
            but your labels and descriptions won't be configured. You can come back to prep at any time.
        </p>
        <div class="prep-footer-actions">
            <button class="btn-secondary" type="button" onclick={() => { showSkipWarning = false; }}>
                Keep going
            </button>
            <button class="btn-primary" type="button" onclick={continueAnyway}>
                Continue anyway →
            </button>
        </div>
    {:else}
        <div class="prep-footer-actions">
            <button class="btn-primary" type="button" onclick={continueToEditor}>
                Continue to Editor →
            </button>
        </div>
    {/if}
</div>

<style>
    .prep-layout {
        display: grid;
        /* Left column ~35%, right column ~65% */
        grid-template-columns: 35% 65%;
        /* Two rows for the left column; right column spans both */
        grid-template-rows: 40vh 45vh;
        grid-template-areas:
            "top-left    top-right"
            "bottom-left top-right";
        gap: 0;
        /* Escape the workspace-canvas padding so panels bleed to the edges */
        margin: calc(var(--dn-space) * -3);
    }

    .prep-top-left    { grid-area: top-left; }
    .prep-top-right   { grid-area: top-right; }
    .prep-bottom-left { grid-area: bottom-left; }

    .prep-panel {
        overflow: hidden;
        border-right: 1px solid var(--dn-border);
        border-bottom: 1px solid var(--dn-border);
    }

    /* Remove right border on right-column panel */
    .prep-top-right {
        border-right: none;
    }

    /* Remove bottom border on bottom-row panels */
    .prep-bottom-left,
    .prep-top-right {
        border-bottom: none;
    }

    .prep-footer {
        padding: calc(var(--dn-space) * 2) calc(var(--dn-space) * 3);
        border-top: 1px solid var(--dn-border);
        background: var(--dn-surface);
    }

    .prep-footer-actions {
        display: flex;
        justify-content: flex-end;
        gap: calc(var(--dn-space) * 1.5);
    }

    .prep-skip-warning {
        margin: 0 0 calc(var(--dn-space) * 1.5);
        color: var(--dn-text-muted);
        font-size: 0.9rem;
    }
</style>
