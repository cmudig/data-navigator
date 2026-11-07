<script lang="ts">
    import VariablePanel from '../components/prep/VariablePanel.svelte';
    import DataTablePreview from '../components/prep/DataTablePreview.svelte';
    import QAEngine from '../components/prep/QAEngine.svelte';
    import { app } from '../../model/state.svelte';

    let activePreviewTab = $state(0);
    let tabListEl: HTMLElement | undefined = $state();

    function onPreviewTabKeydown(e: KeyboardEvent) {
        if ((e.target as HTMLElement).getAttribute('role') !== 'tab') return;
        const next = { ArrowRight: 1, End: 1, ArrowLeft: 0, Home: 0 }[e.key];
        if (next === undefined) return;
        e.preventDefault();
        activePreviewTab = next;
        tabListEl?.querySelector<HTMLElement>(next ? '#preview-tab-image' : '#preview-tab-data')?.focus();
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
        {#if app.doc.data.rows || app.doc.image}
            {@const img = app.doc.image}
            <div class="preview-tab-container">
                <div
                    class="preview-tab-list"
                    role="tablist"
                    aria-label="Preview"
                    bind:this={tabListEl}
                    onkeydown={onPreviewTabKeydown}
                >
                    <button
                        id="preview-tab-data"
                        class="preview-tab-btn"
                        role="tab"
                        aria-selected={activePreviewTab === 0}
                        aria-controls="preview-panel-data"
                        tabindex={activePreviewTab === 0 ? 0 : -1}
                        onclick={() => activePreviewTab = 0}
                    >Data table</button>
                    <button
                        id="preview-tab-image"
                        class="preview-tab-btn"
                        role="tab"
                        aria-selected={activePreviewTab === 1}
                        aria-controls="preview-panel-image"
                        tabindex={activePreviewTab === 1 ? 0 : -1}
                        onclick={() => activePreviewTab = 1}
                    >{img && !img.built ? 'Image' : 'Built chart'}</button>
                </div>
                <div
                    id="preview-panel-data"
                    class="preview-tab-panel"
                    role="tabpanel"
                    aria-labelledby="preview-tab-data"
                    hidden={activePreviewTab !== 0}
                >
                    <DataTablePreview />
                </div>
                <div
                    id="preview-panel-image"
                    class="preview-tab-panel"
                    role="tabpanel"
                    aria-labelledby="preview-tab-image"
                    hidden={activePreviewTab !== 1}
                >
                    {#if img}
                        <img src={img.url} alt={img.built ? 'Chart built from your data' : 'Uploaded chart'} class="image-preview" />
                    {:else}
                        <p class="preview-note">No chart yet. Answer the first prep question to build one from your data.</p>
                    {/if}
                </div>
            </div>
        {:else}
            <DataTablePreview />
        {/if}
    </div>
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

    /* Preview tabs */
    .preview-tab-container {
        display: flex;
        flex-direction: column;
        height: 100%;
    }

    .preview-tab-list {
        display: flex;
        flex-shrink: 0;
        padding: 8px;
        padding-bottom: 0px;
    }

    .preview-tab-btn {
        flex: 1;
        padding: 0 var(--dn-space);
        height: 36px;
        background: none;
        border: none;
        cursor: pointer;
        font: inherit;
        font-size: 0.8rem;
        color: var(--dn-text-muted);
        transition: color 0.15s, border-color 0.15s, background 0.15s;
    }

    .preview-tab-btn:hover {
        background: var(--dn-hover);
        color: var(--dn-text);
    }

    .preview-tab-btn[aria-selected="true"] {
        background: var(--dn-accent-soft);
        border-color: var(--dn-accent);
        border: 1px solid;
        color: var(--dn-accent);
    }

    .preview-tab-panel {
        flex: 1;
        overflow: auto;
        min-height: 0;
    }

    .preview-note {
        padding: var(--dn-space) calc(var(--dn-space) * 2);
        color: var(--dn-text-muted);
        font-size: 0.875rem;
    }

    .image-preview {
        display: block;
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
        margin: auto;
        padding: var(--dn-space);
        box-sizing: border-box;
    }

</style>
