<script lang="ts">
    import { app, fitView, zoomTo, type Tool, type ToolOptions } from '../../model/state.svelte';

    const TOOLS: [Tool, string][] = [
        ['selectNodes', 'Select nodes'],
        ['selectEdges', 'Select edges'],
        ['addNode', 'Add node'],
        ['addEdge', 'Add edge']
    ];
    const RULES: [string, string[]][] = [
        ['↑ / ↓ pair', ['up', 'down']],
        ['← / → pair', ['left', 'right']],
        ['[ / ] pair', ['backward', 'forward']],
        ['Drill out / in', ['drill-out', 'drill-in']],
        ['One way (↓ only)', ['down']]
    ];
    const HINTS: Record<Tool, string> = {
        selectNodes: 'Click or drag a box to select nodes. Shift adds or removes.',
        selectEdges: 'Click or drag a box to select edges. Shift adds or removes.',
        addNode: 'Click to place a node. The tool stays on until you pick another.',
        addEdge: 'Drag from one node to another. With nodes selected, edges fan out to the whole selection.',
        pan: 'Drag to move around. Hold Space to pan with any tool.'
    };

    const tools = $derived(app.ui.tools);
    const spatial = $derived(!app.ui.swapped);
    const edgeTypes = $derived([...new Set([...app.graph.edges.values()].map(e => e.rules[0]).filter(Boolean))]);
    const levelShown: Record<string, keyof ToolOptions> = { root: 'showLevel0Node', dimension: 'showLevel1Nodes', division: 'showLevel2Nodes', leaf: 'showLevel3Nodes' };
    const levelFill: Record<string, keyof ToolOptions> = { root: 'level0BackfillColor', dimension: 'level1BackfillColor', division: 'level2BackfillColor', leaf: 'level3BackfillColor' };
    let zoomInput = $state(100);
    $effect(() => {
        zoomInput = Math.round(app.ui.view.scale * 100);
    });

    function setTool<K extends keyof ToolOptions>(key: K, value: ToolOptions[K]) {
        const t = app.ui.tools;
        if (key === 'nodeBackfillColor')
            for (const k of ['level0BackfillColor', 'level1BackfillColor', 'level2BackfillColor', 'level3BackfillColor'] as const)
                if (t[k] === t.nodeBackfillColor) t[k] = value as string;
        t[key] = value;
    }
    const toggleEdgeType = (type: string) =>
        (app.ui.tools.hiddenEdgeTypes = tools.hiddenEdgeTypes.includes(type) ? tools.hiddenEdgeTypes.filter(t => t !== type) : [...tools.hiddenEdgeTypes, type]);
</script>

{#snippet icon(t: Tool)}
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true">
        {#if t === 'selectNodes' || t === 'selectEdges'}
            <path d="M2 1.5 L2 11 L4.6 8.6 L6.4 12.4 L8 11.7 L6.3 7.9 L9.6 7.9 Z" fill="currentColor" stroke="none" />
            {#if t === 'selectNodes'}
                <circle cx="11" cy="14" r="2" /><circle cx="15" cy="10" r="2" /><circle cx="15.5" cy="15.5" r="1.6" />
            {:else}
                <path d="M9.5 16.5 L16.5 9.5 M11.5 17 L17 11.5 M9 13.5 L13.5 9" />
            {/if}
        {:else if t === 'addNode'}
            <circle cx="9" cy="9" r="6.5" /><path d="M9 5.5 V12.5 M5.5 9 H12.5" />
        {:else if t === 'addEdge'}
            <circle cx="3.5" cy="14.5" r="2" /><circle cx="14.5" cy="3.5" r="2" /><path d="M5 13 L13 5" /><path d="M12 13 H17 M14.5 10.5 V15.5" />
        {:else}
            <path d="M9 1.5 V16.5 M1.5 9 H16.5 M9 1.5 L7 3.5 M9 1.5 L11 3.5 M9 16.5 L7 14.5 M9 16.5 L11 14.5 M1.5 9 L3.5 7 M1.5 9 L3.5 11 M16.5 9 L14.5 7 M16.5 9 L14.5 11" />
        {/if}
    </svg>
{/snippet}

<div class="canvas-toolbar" role="toolbar" aria-label="Editor canvas tools">
    {#each TOOLS as [t, label] (t)}
        <button class="btn-ghost btn-sm tool" class:active={app.ui.tool === t} type="button" aria-pressed={app.ui.tool === t} onclick={() => (app.ui.tool = t)}>
            {@render icon(t)}{label}
        </button>
    {/each}
    <label class="toolbar-option">
        Edge rules
        <select value={JSON.stringify(app.ui.edgeRules)} onchange={e => (app.ui.edgeRules = JSON.parse(e.currentTarget.value))}>
            {#each RULES as [label, rules] (label)}<option value={JSON.stringify(rules)}>{label}</option>{/each}
        </select>
    </label>
    {#if spatial}
        <details class="tool-options">
            <summary class="btn-ghost btn-sm">Display</summary>
            <div class="tool-options-panel">
                <label><input type="checkbox" checked={tools.showNodeLabels} onchange={e => setTool('showNodeLabels', e.currentTarget.checked)} /> Node labels</label>
                <label><input type="checkbox" checked={tools.showEdgeLabels} onchange={e => setTool('showEdgeLabels', e.currentTarget.checked)} /> Edge labels</label>
                <label class="slider">
                    Fill opacity {tools.nodeFillOpacity.toFixed(2)}
                    <input type="range" min="0" max="1" step="0.05" value={tools.nodeFillOpacity} oninput={e => setTool('nodeFillOpacity', parseFloat(e.currentTarget.value))} />
                </label>
                <label><input type="checkbox" checked={tools.showAllNodes} onchange={e => setTool('showAllNodes', e.currentTarget.checked)} /> All nodes <input type="color" title="Node backfill" value={tools.nodeBackfillColor} oninput={e => setTool('nodeBackfillColor', e.currentTarget.value)} /></label>
                {#each ['root', 'dimension', 'division', 'leaf'] as kind, i (kind)}
                    <label class="indent">
                        <input type="checkbox" disabled={kind === 'root' && !app.doc.recipe.root.enabled} checked={!!tools[levelShown[kind]]} onchange={e => setTool(levelShown[kind], e.currentTarget.checked as never)} />
                        Level {i}
                        <input type="color" title="Level {i} backfill" value={tools[levelFill[kind]]} oninput={e => setTool(levelFill[kind], e.currentTarget.value as never)} />
                    </label>
                {/each}
                <label><input type="checkbox" checked={tools.showEdges} onchange={e => setTool('showEdges', e.currentTarget.checked)} /> All edges <input type="color" title="Edge color" value={tools.edgeColor} oninput={e => setTool('edgeColor', e.currentTarget.value)} /></label>
                {#each edgeTypes as type (type)}
                    <label class="indent">
                        <input type="checkbox" checked={!tools.hiddenEdgeTypes.includes(type)} onchange={() => toggleEdgeType(type)} />
                        "{type}"
                        <input type="color" title="Color for {type} edges" value={tools.edgeTypeColors[type] ?? tools.edgeColor} oninput={e => (app.ui.tools.edgeTypeColors = { ...tools.edgeTypeColors, [type]: e.currentTarget.value })} />
                    </label>
                {/each}
            </div>
        </details>
    {/if}
    <span class="spacer"></span>
    <button class="btn-ghost btn-sm tool" class:active={app.ui.tool === 'pan'} type="button" aria-pressed={app.ui.tool === 'pan'} onclick={() => (app.ui.tool = 'pan')}>
        {@render icon('pan')}Pan
    </button>
    <button class="btn-ghost btn-sm" type="button" aria-label="Zoom out" onclick={() => zoomTo(app.ui.view.scale / 1.25)}>−</button>
    <label class="zoom">
        <span class="visually-hidden">Zoom percentage</span>
        <input type="number" min="10" max="800" step="10" bind:value={zoomInput} onchange={() => zoomTo(zoomInput / 100)} />%
    </label>
    <button class="btn-ghost btn-sm" type="button" aria-label="Zoom in" onclick={() => zoomTo(app.ui.view.scale * 1.25)}>+</button>
    <button class="btn-ghost btn-sm" type="button" onclick={fitView}>Fit</button>
</div>
<p class="tool-hint" aria-live="polite">{HINTS[app.ui.space ? 'pan' : app.ui.tool]}</p>

<style>
    .canvas-toolbar {
        display: flex;
        align-items: center;
        gap: calc(var(--dn-space) * 0.5);
        flex-wrap: wrap;
        flex-shrink: 0;
    }

    .tool {
        display: inline-flex;
        align-items: center;
        gap: 6px;
    }

    .tool.active {
        background: var(--dn-accent-soft);
        color: var(--dn-accent);
        border-color: var(--dn-accent);
        box-shadow: inset 0 -2px 0 var(--dn-accent);
    }

    .spacer {
        flex: 1;
    }

    .toolbar-option,
    .zoom {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 0.8125rem;
        color: var(--dn-text-muted);
    }

    .zoom input {
        width: 4rem;
        text-align: right;
    }

    .tool-hint {
        margin: calc(var(--dn-space) * 0.5) 0 calc(var(--dn-space) * 0.75);
        font-size: 0.8125rem;
        color: var(--dn-text-muted);
    }

    .tool-options {
        position: relative;
    }

    .tool-options > summary {
        list-style: none;
        cursor: pointer;
    }

    .tool-options-panel {
        position: absolute;
        top: calc(100% + 4px);
        left: 0;
        z-index: 100;
        background: var(--dn-bg);
        border: 1px solid var(--dn-border);
        border-radius: var(--dn-radius);
        padding: var(--dn-space);
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 220px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        font-size: 0.8125rem;
    }

    .tool-options-panel label {
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .tool-options-panel .indent {
        padding-left: calc(var(--dn-space) * 2);
    }

    .tool-options-panel .slider {
        flex-direction: column;
        align-items: stretch;
    }

    .tool-options-panel input[type='color'] {
        margin-left: auto;
        width: 22px;
        height: 18px;
        padding: 1px;
    }
</style>
