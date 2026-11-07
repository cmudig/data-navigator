<script lang="ts">
    import { app, fitView, goTo, zoomTo } from '../../model/state.svelte';
    import CanvasToolbar from '../components/CanvasToolbar.svelte';
    import SpatialView from '../components/SpatialView.svelte';
    import StructureView from '../components/StructureView.svelte';
    import OrderModal from '../components/OrderModal.svelte';
    import ConnectModal from '../components/ConnectModal.svelte';

    let zoomInput = $state(100);
    $effect(() => {
        zoomInput = Math.round(app.ui.view.scale * 100);
    });

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
        {#if app.built}<span class="badge" role="status">Chart built from your data.</span>{/if}
        {#if app.ui.fit && !app.ui.scaffoldMode}<span class="badge" class:failed={app.ui.fit.state === 'failed'} role="status">{app.ui.fit.state === 'failed' ? '⚠ ' : ''}{app.ui.fit.message}</span>{/if}
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
        <div class="view-controls" role="group" aria-label="View">
            <button class="btn-ghost btn-sm" class:active={app.ui.tool === 'pan'} type="button" aria-pressed={app.ui.tool === 'pan'} onclick={() => (app.ui.tool = 'pan')}>
                <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M9 1.5 V16.5 M1.5 9 H16.5 M9 1.5 L7 3.5 M9 1.5 L11 3.5 M9 16.5 L7 14.5 M9 16.5 L11 14.5 M1.5 9 L3.5 7 M1.5 9 L3.5 11 M16.5 9 L14.5 7 M16.5 9 L14.5 11" /></svg>
                Pan
            </button>
            <button class="btn-ghost btn-sm" type="button" aria-label="Zoom out" onclick={() => zoomTo(app.ui.view.scale / 1.25)}>−</button>
            <label class="zoom">
                <span class="visually-hidden">Zoom percentage</span>
                <input type="number" min="10" max="800" step="10" bind:value={zoomInput} onchange={() => zoomTo(zoomInput / 100)} />%
            </label>
            <button class="btn-ghost btn-sm" type="button" aria-label="Zoom in" onclick={() => zoomTo(app.ui.view.scale * 1.25)}>+</button>
            <button class="btn-ghost btn-sm" type="button" onclick={fitView}>Fit</button>
        </div>
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



    .badge.failed {
        color: #b71c1c;
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

    .view-controls {
        position: absolute;
        top: 8px;
        right: 8px;
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 4px;
        background: var(--dn-bg);
        border: 1px solid var(--dn-border);
        border-radius: var(--dn-radius);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }

    .view-controls .btn-sm {
        min-width: 32px;
        padding: 4px 8px;
    }

    .view-controls .active {
        background: var(--dn-accent-soft);
        color: var(--dn-accent);
        border-color: var(--dn-accent);
    }

    .zoom {
        display: inline-flex;
        align-items: center;
        gap: 2px;
        font-size: 0.8125rem;
    }

    .zoom input {
        width: 3.25rem;
        text-align: right;
    }

    .step-actions {
        display: flex;
        justify-content: flex-end;
        padding-top: calc(var(--dn-space) * 1.5);
    }
</style>
