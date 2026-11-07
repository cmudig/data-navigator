<script lang="ts">
    import { app, commit, fitView, goTo, zoomTo } from '../../model/state.svelte';
    import { seedScaffold } from '../../utils/vegaBuilder';
    import CanvasToolbar from '../components/CanvasToolbar.svelte';
    import SpatialView from '../components/SpatialView.svelte';
    import StructureView from '../components/StructureView.svelte';
    import OrderModal from '../components/OrderModal.svelte';
    import ConnectModal from '../components/ConnectModal.svelte';

    const scaffoldOn = $derived(app.ui.scaffoldMode);

    function toggleScaffold() {
        if (!app.doc.scaffold) commit('Started scaffold', d => ({ ...d, scaffold: seedScaffold(d) }));
        app.ui.scaffoldMode = !app.ui.scaffoldMode;
    }

    const typing = (el: EventTarget | null) =>
        el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON|SUMMARY)$/.test(el.tagName));

    function keydown(e: KeyboardEvent) {
        if (e.key === ' ' && !typing(e.target) && !document.querySelector('dialog[open]:modal')) {
            e.preventDefault();
            app.ui.space = true;
        } else if ((e.metaKey || e.ctrlKey) && ['=', '+', '-', '0'].includes(e.key)) {
            e.preventDefault();
            if (e.key === '0') fitView();
            else zoomTo(app.ui.view.scale * (e.key === '-' ? 1 / 1.25 : 1.25));
        }
    }
</script>

<svelte:window onkeydown={keydown} onkeyup={e => e.key === ' ' && (app.ui.space = false)} onblur={() => (app.ui.space = false)} />

<div class="editor-step">
    <div class="step-header">
        <h2 id="step-heading-2" tabindex="-1">Editor</h2>
        <div class="header-actions">
            {#if app.built}
                <span class="badge" role="status">Chart built from your data. Nodes follow its marks.</span>
            {:else}
                <button class="btn-ghost btn-sm" class:active={scaffoldOn} type="button" aria-pressed={scaffoldOn} onclick={toggleScaffold}>
                    {scaffoldOn ? '✕ Close Scaffold' : '⊡ Scaffold'}
                </button>
            {/if}
        </div>
    </div>
    {#if app.warnings.length}
        <details class="editor-warnings">
            <summary><span aria-hidden="true">⚠</span> {app.warnings.length} structure warning{app.warnings.length > 1 ? 's' : ''}</summary>
            <ul>{#each app.warnings as w (w)}<li>{w}</li>{/each}</ul>
        </details>
    {/if}

    <CanvasToolbar />
    <div class="visually-hidden" aria-live="polite" aria-atomic="true">{app.ui.live}</div>

    <div class="editor-canvas" aria-label="Editor canvas: {app.ui.swapped ? 'structure' : 'spatial'} view" role="region">
        {#key app.ui.swapped}
            {#if app.ui.swapped}<StructureView canvas="editor" />{:else}<SpatialView canvas="editor" />{/if}
        {/key}
    </div>

    <div class="step-actions">
        <button class="btn-primary" type="button" onclick={() => goTo(3)}>Continue to Testing →</button>
    </div>
</div>

{#if app.ui.ordering}<OrderModal />{/if}
{#if app.ui.connect}<ConnectModal />{/if}

<style>
    .editor-step {
        display: flex;
        flex-direction: column;
        height: 100%;
        min-height: 0;
    }

    .step-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: calc(var(--dn-space) * 2);
        padding-bottom: var(--dn-space);
    }

    .step-header h2 {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 600;
    }

    .header-actions {
        display: flex;
        align-items: center;
        gap: var(--dn-space);
    }

    .header-actions .active {
        background: var(--dn-accent-soft);
        color: var(--dn-accent);
    }

    .badge {
        font-size: 0.8125rem;
        color: var(--dn-text-muted);
    }

    .editor-warnings {
        position: relative;
        margin-bottom: calc(var(--dn-space) * 0.5);
        font-size: 0.8125rem;
        color: var(--dn-text-muted);
    }

    .editor-warnings ul {
        position: absolute;
        z-index: 50;
        margin: 4px 0 0;
        padding: var(--dn-space) var(--dn-space) var(--dn-space) calc(var(--dn-space) * 3);
        background: var(--dn-bg);
        border: 1px solid var(--dn-border);
        border-radius: var(--dn-radius);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .editor-canvas {
        flex: 1;
        min-height: 0;
        display: flex;
        position: relative;
    }

    .step-actions {
        display: flex;
        justify-content: flex-end;
        padding-top: calc(var(--dn-space) * 1.5);
    }
</style>
