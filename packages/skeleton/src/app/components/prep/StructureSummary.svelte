<script lang="ts">
    import { onDestroy } from 'svelte';
    import { appState, type PrepState } from '../../../store/appState';

    let prep = $state<PrepState | null>(null);

    const unsub = appState.subscribe(s => { prep = s.prepState; });
    onDestroy(unsub);
</script>

<div class="structure-summary">
    <h3 class="panel-heading">Structure summary</h3>
    <p class="summary-placeholder">
        A summary of your data structure will appear here as you answer questions.
        (Coming in a future session.)
    </p>
</div>

<style>
    .structure-summary {
        display: flex;
        flex-direction: column;
        gap: calc(var(--dn-space) * 1.5);
        padding: calc(var(--dn-space) * 2);
        height: 100%;
    }

    .panel-heading {
        margin: 0;
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--dn-text);
        text-transform: uppercase;
        letter-spacing: 0.04em;
    }

    .summary-placeholder {
        margin: 0;
        font-size: 0.875rem;
        color: var(--dn-text-muted);
    }
</style>
