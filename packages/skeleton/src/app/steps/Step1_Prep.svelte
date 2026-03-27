<script lang="ts">
    import VariablePanel from '../components/prep/VariablePanel.svelte';
    import DataTablePreview from '../components/prep/DataTablePreview.svelte';
    import QAEngine from '../components/prep/QAEngine.svelte';
    import { appState } from '../../store/appState';
    import { applyPrepToSchema, seedScaffoldConfig } from '../../utils/prepAdapter';
    import { logAction } from '../../store/historyStore';

    let activePreviewTab = $state(0);
    let tabListEl: HTMLElement | undefined = $state();

    function continueToEditor() {
        appState.update(s => ({
            ...s,
            schemaState: applyPrepToSchema(s.prepState!, s.schemaState),
            scaffoldConfig: seedScaffoldConfig(
                s.prepState!,
                s.scaffoldConfig,
                s.imageWidth,
                s.imageHeight,
                s.uploadedData !== null && s.uploadedData.length > 0,
                s.schemaState
            ),
            currentStep: 2,
        }));
        logAction('Completed Prep — entered Editor');
    }

    function focusPreviewTab(index: number) {
        const id = index === 0 ? 'preview-tab-data' : 'preview-tab-image';
        tabListEl?.querySelector<HTMLElement>(`#${id}`)?.focus();
    }

    function onPreviewTabKeydown(e: KeyboardEvent) {
        const target = e.target as HTMLElement;
        if (target.getAttribute('role') !== 'tab') return;
        if (e.key === 'ArrowRight') {
            e.preventDefault();
            activePreviewTab = Math.min(activePreviewTab + 1, 1);
            focusPreviewTab(activePreviewTab);
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            activePreviewTab = Math.max(activePreviewTab - 1, 0);
            focusPreviewTab(activePreviewTab);
        } else if (e.key === 'Home') {
            e.preventDefault();
            activePreviewTab = 0;
            focusPreviewTab(0);
        } else if (e.key === 'End') {
            e.preventDefault();
            activePreviewTab = 1;
            focusPreviewTab(1);
        }
    }
</script>

<!-- Step heading receives focus on step transition (see App.svelte focusStepHeading) -->
<h2 id="step-heading-1" tabindex="-1" class="visually-hidden">Prep</h2>

<div class="prep-layout">
    <div class="prep-panel prep-top-left">
        <VariablePanel />
    </div>
    <div class="prep-panel prep-top-right">
        <QAEngine onComplete={continueToEditor} />
    </div>
    <div class="prep-panel prep-bottom-left">
        {#if $appState.imageDataUrl}
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
                    >Image</button>
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
                    <img src={$appState.imageDataUrl} alt="Uploaded chart" class="image-preview" />
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
