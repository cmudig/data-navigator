<script lang="ts">
    import VariablePanel from '../components/prep/VariablePanel.svelte';
    import DataTablePreview from '../components/prep/DataTablePreview.svelte';
    import QAEngine from '../components/prep/QAEngine.svelte';
    import StructureSummary from '../components/prep/StructureSummary.svelte';
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
    <div class="prep-panel prep-bottom-right">
        <StructureSummary />
    </div>
</div>

<style>
    .prep-layout {
        display: grid;
        /* Left column ~35%, right column ~65% */
        grid-template-columns: 35% 65%;
        /* Top row ~40% of viewport height minus chrome, bottom ~60% */
        grid-template-rows: 40vh 55vh;
        grid-template-areas:
            "top-left    top-right"
            "bottom-left bottom-right";
        gap: 0;
        /* Escape the workspace-canvas padding so panels bleed to the edges */
        margin: calc(var(--dn-space) * -3);
    }

    .prep-top-left    { grid-area: top-left; }
    .prep-top-right   { grid-area: top-right; }
    .prep-bottom-left { grid-area: bottom-left; }
    .prep-bottom-right { grid-area: bottom-right; }

    .prep-panel {
        overflow: hidden;
        border-right: 1px solid var(--dn-border);
        border-bottom: 1px solid var(--dn-border);
    }

    /* Remove right border on right-column panels */
    .prep-top-right,
    .prep-bottom-right {
        border-right: none;
    }

    /* Remove bottom border on bottom-row panels */
    .prep-bottom-left,
    .prep-bottom-right {
        border-bottom: none;
    }
</style>
