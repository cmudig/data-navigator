<script lang="ts">
    import 'data-navigator/text-chat.css';
    import { keyLabel } from 'data-navigator';
    import { Inspector } from '@data-navigator/inspector';
    import '@data-navigator/inspector/style.css';
    import { untrack } from 'svelte';
    import { app } from '../../model/state.svelte';
    import { mount } from '../../runtime/dn-runtime.js';
    import NavKeysPanel from '../components/NavKeysPanel.svelte';
    import AssistantPanel from '../components/AssistantPanel.svelte';
    import NodeEditor from '../components/NodeEditor.svelte';

    const structure = $derived.by(() => {
        const s = app.structure;
        if (!app.missing.size) return s;
        const nodes = { ...s.nodes };
        for (const id of app.missing)
            nodes[id] = { ...nodes[id], semantics: { ...nodes[id].semantics, label: `Missing description: ${app.graph.nodes.get(id)?.name ?? id} has no descriptive text yet.` } };
        return { ...s, nodes };
    });
    const nodes = $derived([...app.graph.nodes.values()]);
    const edges = $derived([...app.graph.edges.values()]);
    const canvasWidth = $derived(app.size.width);
    const canvasHeight = $derived(app.size.height);
    const imageDataUrl = $derived(app.doc.image?.url ?? null);
    let scalerWidth = $state(0);
    let innerHeight = $state(900);
    const canvasScale = $derived(scalerWidth > 0 ? Math.min(1, scalerWidth / canvasWidth, Math.max(160, innerHeight - 460) / canvasHeight) : 1);

    let navMode = $state<'text' | 'keyboard'>('text');
    let showAllNodes = $state(false);
    let showAllEdges = $state(false);
    let current = $state.raw<any>(null);
    let eventLog = $state<{ id: number; kind: string; time: number; label?: string; key?: string; moved?: boolean }[]>([]);
    let counter = 0;
    const log = (e: Omit<(typeof eventLog)[number], 'id' | 'time'>) => (eventLog = [{ ...e, id: counter++, time: Date.now() }, ...eventLog].slice(0, 50));

    let root: HTMLDivElement | undefined = $state();
    let chatEl: HTMLDivElement | undefined = $state();
    let inspectorEl: HTMLDivElement | undefined = $state();
    let nav: ReturnType<typeof mount> | null = $state.raw(null);
    let inspector: ReturnType<typeof Inspector> | null = null;

    let lastId = $state<string | null>(null);
    let updating = false;
    let chartFocused = $state(false);
    const entryOk = $derived(!!app.entry && !!structure.nodes[app.entry]);

    function drawInspector(s: any) {
        if (!inspectorEl) return;
        inspectorEl.innerHTML = '';
        inspector = Inspector({ structure: s, container: inspectorEl, size: { width: 340, height: 280 }, colorBy: 'dimensionLevel', mode: app.ui.schema.graphMode, nodeRadius: 6, showConsoleMenu: { data: app.rows } } as any);
        if (current) inspector.highlight(current.renderId || current.id);
    }

    $effect(() => {
        const entry = app.entry;
        const chat = navMode === 'text' ? chatEl : undefined;
        if (!root || !entryOk || !entry) return;
        const m = untrack(() =>
            mount({
                structure,
                container: root!,
                entry,
                chat,
                suffix: 'test',
                description: 'Navigate the data structure',
                onFocus: (n: any) => {
                    current = n;
                    lastId = n.id;
                    inspector?.highlight(n.renderId || n.id);
                    if (!updating) log({ kind: 'navigate', label: n.semantics?.label });
                },
                onExit: () => {
                    current = null;
                    inspector?.clear();
                    log({ kind: 'exit' });
                },
                onKey: (e: KeyboardEvent, _rule: string, next: unknown) => log({ kind: 'keypress', key: e.key, moved: !!next }),
                chatOptions: {
                    data: app.rows,
                    onClick: (n: any) => log({ kind: 'select', label: n.semantics?.label }),
                    onHover: (n: any) => log({ kind: 'hover', label: n.semantics?.label })
                }
            })
        );
        nav = m;
        untrack(() => drawInspector(structure));
        return () => {
            m.destroy();
            inspector?.destroy();
            nav = null;
            current = null;
            lastId = null;
        };
    });

    $effect(() => {
        const s = structure;
        untrack(() => {
            if (!nav) return;
            updating = true;
            nav.update(s);
            updating = false;
            if (current && !s.nodes[current.id]) current = null;
            drawInspector(s);
        });
    });

    function refocus() {
        if (!nav || !lastId || !structure.nodes[lastId]) return;
        nav.focus(lastId, true);
        log({ kind: 'refocus' });
    }

    const directions = $derived(
        current && nav
            ? Object.entries<any>(structure.navigationRules)
                  .map(([rule, k]) => ({ rule, key: keyLabel(k.key), dest: nav!.input.move(current.id, rule) }))
                  .filter(d => d.dest && d.rule !== 'exit')
            : []
    );
    const keyboardInstructions = $derived(Object.entries<any>(structure.navigationRules).map(([rule, k]) => ({ rule, key: keyLabel(k.key) })));
    const dash = (d: string) => (d === 'dashed' ? '6,3' : d === 'dotted' ? '2,2' : undefined);
    const center = (g: { x: number; y: number; width: number; height: number }) => ({ x: g.x + g.width / 2, y: g.y + g.height / 2 });
    const formatTime = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
</script>

<aside class="inspector-panel" aria-label="Structure inspector">
    <div class="inspector-header"><span class="inspector-title">Schema</span></div>
    <div class="inspector-graph-section"><div bind:this={inspectorEl} class="inspector-container"></div></div>
    <NavKeysPanel />
    <AssistantPanel />
</aside>

<svelte:window bind:innerHeight onfocusin={() => (chartFocused = !!root?.contains(document.activeElement))} onfocusout={() => queueMicrotask(() => (chartFocused = !!root?.contains(document.activeElement)))} />

<div class="workspace-canvas--mild center-content">
    <h2 id="step-heading-3" class="visually-hidden" tabindex="-1">Testing</h2>
    {#if app.warnings.length}
        <div class="warnings-bar" role="alert" aria-live="polite">
            {#each app.warnings as w (w)}<span class="warning-chip">{w}</span>{/each}
        </div>
    {/if}
    <div class="canvas-controls">
        <label class="check-label"><input type="checkbox" bind:checked={showAllNodes} /> Show nodes</label>
        <label class="check-label"><input type="checkbox" bind:checked={showAllEdges} /> Show edges</label>
    </div>

    <div class="canvas-scaler" bind:clientWidth={scalerWidth} style="height: {canvasHeight * canvasScale}px;">
        <div bind:this={root} id="dn-test-canvas-root" class="canvas-root" style="width:{canvasWidth}px; height:{canvasHeight}px; --canvas-scale:{canvasScale}; transform: scale({canvasScale}); transform-origin: top left;">
            {#if imageDataUrl}
                <img src={imageDataUrl} alt="" aria-hidden="true" class="canvas-bg" width={canvasWidth} height={canvasHeight} />
            {:else}
                <div class="canvas-placeholder"><span>No image uploaded</span></div>
            {/if}
            {#if showAllNodes}
                <svg class="shapes-overlay" width={canvasWidth} height={canvasHeight} aria-hidden="true">
                    {#each nodes as n (n.id)}
                        {@const fill = n.style.fillEnabled ? n.style.fill : 'none'}
                        {#if n.geo.path}
                            <path d={n.geo.path} {fill} fill-opacity={app.ui.tools.nodeFillOpacity} stroke={n.style.strokeColor} stroke-width={n.style.strokeWidth} stroke-dasharray={dash(n.style.strokeDash)} />
                        {:else if n.style.shape === 'ellipse'}
                            <ellipse cx={center(n.geo).x} cy={center(n.geo).y} rx={n.geo.width / 2} ry={n.geo.height / 2} {fill} fill-opacity={app.ui.tools.nodeFillOpacity} stroke={n.style.strokeColor} stroke-width={n.style.strokeWidth} stroke-dasharray={dash(n.style.strokeDash)} />
                        {:else}
                            <rect {...n.geo} rx="4" {fill} fill-opacity={app.ui.tools.nodeFillOpacity} stroke={n.style.strokeColor} stroke-width={n.style.strokeWidth} stroke-dasharray={dash(n.style.strokeDash)} />
                        {/if}
                    {/each}
                </svg>
            {/if}
            {#if showAllEdges}
                <svg class="edge-overlay" width={canvasWidth} height={canvasHeight} aria-hidden="true">
                    <defs>
                        <marker id="dn-test-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                            <path d="M0,0 L0,6 L6,3 z" fill="var(--dn-accent)" opacity="0.7" />
                        </marker>
                    </defs>
                    {#each edges as e (e.id)}
                        {@const a = app.graph.nodes.get(e.source)}
                        {@const b = app.graph.nodes.get(e.target)}
                        {#if a && b}
                            {@const sc = center(a.geo)}
                            {@const tc = center(b.geo)}
                            <line x1={sc.x} y1={sc.y} x2={tc.x} y2={tc.y} stroke="var(--dn-accent)" stroke-width="1.5" opacity="0.5" marker-end="url(#dn-test-arrow)" />
                            <text x={(sc.x + tc.x) / 2} y={(sc.y + tc.y) / 2 - 5} font-size="10" fill="var(--dn-accent)" text-anchor="middle" paint-order="stroke" stroke="var(--dn-bg, white)" stroke-width="3">{e.rules.join(' / ')}</text>
                        {/if}
                    {/each}
                </svg>
            {/if}
        </div>
    </div>

    {#if current}
        <div class="sr-announcement">
            <div class="sr-section" class:sr-warn={app.missing.has(current.id)}>
                <span class="sr-label">{#if app.missing.has(current.id)}<span aria-hidden="true">⚠ </span>Warning. {/if}Screen reader announcement:</span>
                <span class="sr-value">{current.semantics?.label}</span>
            </div>
            <div class="node-panels">
            <details class="node-panel">
                <summary>Info for current node</summary>
                {#if directions.length}
                    <h4 class="sr-subheading">Navigation</h4>
                    <table class="output-table">
                        <tbody>
                            {#each directions as d (d.rule)}
                                <tr><th scope="row">{d.rule} (<kbd>{d.key}</kbd>)</th><td>→ {d.dest.semantics?.label}</td></tr>
                            {/each}
                        </tbody>
                    </table>
                {/if}
                {#if current.dimensionLevel === undefined && !current.manual}
                    <h4 class="sr-subheading">Node data</h4>
                    <table class="output-table">
                        <tbody>
                            {#each Object.entries(current.data ?? {}).filter(([k]) => !k.startsWith('_')) as [key, val] (key)}
                                <tr><th scope="row">{key}</th><td>{String(val)}</td></tr>
                            {/each}
                        </tbody>
                    </table>
                {/if}
            </details>
            <details class="node-panel">
                <summary>Edit structure at this node</summary>
                <NodeEditor node={current} />
            </details>
            </div>
        </div>
    {/if}

    {#if nodes.length === 0}
        <p class="empty-hint">Build your node graph in the Editor step, then return here to test.</p>
    {/if}
</div>

<aside class="log-panel" aria-label="Navigation log and output">
    <label class="kbd-toggle-label check-label">
        <input type="checkbox" checked={navMode === 'keyboard'} onchange={e => (navMode = e.currentTarget.checked ? 'keyboard' : 'text')} />
        Enable keyboard navigation
    </label>
    {#if navMode === 'text'}
        <div class="panel-heading">Text navigation</div>
        <div bind:this={chatEl} id="dn-test-chat" class="chat-container"></div>
    {:else}
        <div class="panel-heading">Keyboard navigation</div>
        <div class="kbd-enter-area">
            <button class="btn-primary" type="button" onclick={() => (nav?.enter(), log({ kind: 'enter' }))} disabled={!nav}>Enter navigation area</button>
            <button class="btn-ghost" type="button" onclick={refocus} disabled={chartFocused || !lastId || !nav}>Re-focus last element</button>
        </div>
        <table class="keys-table">
            <thead><tr><th>Key</th><th>Rule</th></tr></thead>
            <tbody>
                {#each keyboardInstructions as item (item.rule)}<tr><td><kbd>{item.key}</kbd></td><td>{item.rule}</td></tr>{/each}
            </tbody>
        </table>
    {/if}

    <div class="panel-heading">Events</div>
    <div class="event-log" aria-live="off" aria-label="Navigation events">
        {#each eventLog as entry (entry.id)}
            <div class="log-entry log-{entry.kind}">
                <span class="log-kind">{entry.kind}</span>
                {#if entry.label}<span class="log-label" title={entry.label}>{entry.label}</span>{/if}
                {#if entry.key}<kbd class="log-key">{entry.key}</kbd>{/if}
                {#if entry.kind === 'keypress'}<span class="log-navigated" class:yes={entry.moved} class:no={!entry.moved}>{entry.moved ? '✓' : '✗'}</span>{/if}
                <time class="log-time" datetime={new Date(entry.time).toISOString()}>{formatTime(entry.time)}</time>
            </div>
        {:else}
            <p class="log-empty">No events yet. Start navigating to see events here.</p>
        {/each}
    </div>
</aside>

<style>
    .sr-section.sr-warn {
        background: #fff4f2;
        border-color: #c62828;
        border-style: dashed;
        color: #8e1b1b;
    }

    .sr-warn .sr-label,
    .sr-warn .sr-value {
        color: inherit;
    }

    :global(.dark) .sr-section.sr-warn {
        background: #3a1513;
        color: #ffb4a9;
    }

    /* ─── Canvas controls (show nodes/edges, above canvas) ─────────── */
    .canvas-controls {
        display: flex;
        gap: 10px;
        align-items: center;
        font-size: 0.8rem;
    }

    .check-label {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.8rem;
        cursor: pointer;
        white-space: nowrap;
    }

    .check-label input[type='checkbox'] {
        width: 24px;
        height: 24px;
        min-width: 24px;
        min-height: 24px;
        flex-shrink: 0;
        cursor: pointer;
    }

    /* ─── Inspector panel (left) ─────────────────────────────────────────────── */
    .inspector-panel {
        width: 390px;
        flex-shrink: 0;
        border-right: 1px solid var(--dn-border);
        display: flex;
        flex-direction: column;
        overflow-y: auto;
        background: var(--dn-surface);
        height: 100%;
        font-size: 0.875rem;
    }

    :global(.inspector-panel .dn-inspector-tooltip) {
        display: none;
    }

    .inspector-header {
        display: flex;
        align-items: center;
        flex-shrink: 0;
        padding: calc(var(--dn-space) * 1.25) calc(var(--dn-space) * 1.5);
        border-bottom: 1px solid var(--dn-border);
        background: var(--dn-surface);
        gap: calc(var(--dn-space) * 1);
    }

    .inspector-title {
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--dn-text);
        white-space: nowrap;
        flex: 1;
    }

    .inspector-graph-section {
        flex: none;
        background: var(--dn-bg);
        min-height: 0;
    }

    .inspector-container {
        padding: 0;
    }

    /* ─── Center panel ───────────────────────────────────────────────────────── */
    .center-content {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
        font-size: 0.875rem;
    }

    /* ─── Screen reader announcement (below canvas) ──────────────────────────── */
    .node-panels {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        align-items: start;
    }

    @media (max-width: 1100px) {
        .node-panels {
            grid-template-columns: 1fr;
        }
    }

    .node-panel {
        min-width: 0;
    }

    .node-panel > summary {
        cursor: pointer;
        font-weight: 600;
    }

    .sr-announcement {
        width: 100%;
        padding: 8px 10px;
        /* background: var(--dn-surface); */
        border: 1px solid var(--dn-border);
        border-radius: 4px;
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .sr-section {
        display: flex;
        gap: 6px;
        align-items: baseline;
        flex-wrap: wrap;
        background: #f0fdf4;
        border: 1px solid #86efac;
        padding: 6px;
        border-radius: 4px;
        color: #166534;
    }

    .sr-label {
        font-size: 0.65rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        white-space: nowrap;
        flex-shrink: 0;
    }

    .sr-value {
        font-size: 0.8rem;
        line-height: 1.4;
    }

    .sr-subheading {
        font-size: 0.65rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--dn-muted);
        margin: 8px 0 2px;
    }

    .output-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.75rem;
        margin-top: 4px;
    }

    .output-table th,
    .output-table td {
        padding: 3px 6px;
        text-align: left;
        border-bottom: 1px solid var(--dn-border);
    }

    .output-table th {
        font-weight: 600;
        color: var(--dn-text-muted);
        white-space: nowrap;
        width: 1%;
    }

    /* Wrapper that measures available width and sizes to the scaled visual height */
    .canvas-scaler {
        width: 100%;
        position: relative;
        flex-shrink: 0;
        /* overflow: visible so focus outlines on edge nodes aren't clipped */
    }

    .canvas-root {
        /* Absolute so the scaler (not canvas-root) controls layout height */
        position: absolute;
        top: 0;
        left: 0;
        border: 1px solid var(--dn-border);
        border-radius: 4px;
        overflow: visible;
    }

    .output-table kbd {
        font-size: 0.72rem;
        padding: 1px 5px;
        margin: 0px 2px;
        background: var(--dn-surface);
        border: 1px solid var(--dn-border);
        border-radius: 3px;
        color: var(--dn-text);
    }

    .canvas-bg {
        display: block;
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        user-select: none;
        z-index: 0;
    }

    .canvas-placeholder {
        width: 100%;
        height: 100%;
        background: var(--dn-surface);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--dn-text-muted);
        font-size: 0.8rem;
    }

    .shapes-overlay {
        position: absolute;
        top: 0;
        left: 0;
        pointer-events: none;
        z-index: 1;
    }

    .edge-overlay {
        position: absolute;
        top: 0;
        left: 0;
        pointer-events: none;
        z-index: 4;
    }

    .empty-hint {
        color: var(--dn-text-muted);
        font-size: 0.8rem;
        margin: 0;
    }

    /* ─── Right panel ────────────────────────────────────────────────────────── */
    .log-panel {
        width: 360px;
        flex-shrink: 0;
        border-left: 1px solid var(--dn-border);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        font-size: 0.875rem;
    }

    /* Keyboard nav toggle at top of right panel */
    .kbd-toggle-label {
        padding: 6px 10px;
        border-bottom: 1px solid var(--dn-border);
        flex-shrink: 0;
        font-weight: 500;
    }

    .panel-heading {
        font-size: 0.7rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--dn-text-muted);
        padding: 5px 10px 4px;
        border-bottom: 1px solid var(--dn-border);
        flex-shrink: 0;
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .chat-container {
        flex-shrink: 0;
        max-height: 260px;
        overflow-y: auto;
        border-bottom: 1px solid var(--dn-border);
    }

    /* Keyboard mode: enter button area */
    .kbd-enter-area {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        padding: 10px;
        flex-shrink: 0;
        border-bottom: 1px solid var(--dn-border);
    }

    .btn-primary {
        display: inline-flex;
        align-items: center;
        padding: 6px 14px;
        font-size: 0.8rem;
        font-weight: 600;
        background: var(--dn-accent);
        color: #fff;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        transition: opacity 0.1s;
    }

    .btn-primary:disabled {
        opacity: 0.45;
        cursor: not-allowed;
    }

    /* Keyboard instructions table (inside right panel keyboard mode) */
    .keys-table {
        margin: 6px 10px 8px;
        border-collapse: collapse;
        font-size: 0.8rem;
        color: var(--dn-text);
    }

    .keys-table th {
        font-size: 0.7rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--dn-text-muted);
        padding: 2px 16px 2px 0;
        font-weight: 600;
    }

    .keys-table td { padding: 2px 16px 2px 0; color: var(--dn-text); }

    .keys-table kbd {
        font-size: 0.72rem;
        padding: 1px 5px;
        background: var(--dn-surface);
        border: 1px solid var(--dn-border);
        border-radius: 3px;
        color: var(--dn-text);
    }

    .keys-empty {
        padding: 6px 10px;
        font-size: 0.8rem;
        color: var(--dn-text-muted);
        font-style: italic;
        margin: 0;
    }

    /* ─── Event log ──────────────────────────────────────────────────────────── */
    .event-log {
        overflow-y: auto;
        min-height: 80px;
        flex: 1;
        padding: 2px;
        font-family: var(--dn-font-mono, monospace);
        font-size: 0.75rem;
    }

    .log-empty {
        color: var(--dn-text-muted);
        font-style: italic;
        padding: 4px 6px;
        margin: 0;
        font-size: 0.75rem;
        font-family: inherit;
    }

    .log-entry {
        display: flex;
        align-items: baseline;
        gap: 5px;
        padding: 2px 4px;
        border-bottom: 1px solid var(--dn-border);
        overflow: hidden;
    }

    .log-kind {
        font-weight: 700;
        flex-shrink: 0;
        min-width: 54px;
        font-size: 0.7rem;
    }

    /* Light mode log colors */
    :global(.log-navigate .log-kind) { color: #3451b2; }
    :global(.log-enter    .log-kind) { color: #059669; }
    :global(.log-exit     .log-kind) { color: #dc2626; }
    :global(.log-select   .log-kind) { color: #d97706; }
    :global(.log-hover    .log-kind) { color: #7c3aed; }
    :global(.log-keypress .log-kind) { color: #475569; }

    /* Dark mode log colors */
    :global(.dark .log-navigate .log-kind) { color: #7aa2f7; }
    :global(.dark .log-enter    .log-kind) { color: #73daca; }
    :global(.dark .log-exit     .log-kind) { color: #f7768e; }
    :global(.dark .log-select   .log-kind) { color: #ff9e64; }
    :global(.dark .log-hover    .log-kind) { color: #bb9af7; }
    :global(.dark .log-keypress .log-kind) { color: #a9b1d6; }

    .log-label {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: var(--dn-text);
        font-size: 0.7rem;
    }

    .log-key {
        font-size: 0.65rem;
        padding: 1px 4px;
        background: var(--dn-surface);
        border: 1px solid var(--dn-border);
        border-radius: 3px;
        white-space: nowrap;
        flex-shrink: 0;
        color: var(--dn-text);
    }

    .log-navigated {
        font-size: 0.7rem;
        flex-shrink: 0;
        font-weight: 700;
    }
    .log-navigated.yes { color: #059669; }
    .log-navigated.no  { color: #dc2626; }
    :global(.dark) .log-navigated.yes { color: #73daca; }
    :global(.dark) .log-navigated.no  { color: #f7768e; }

    .log-time {
        font-size: 0.65rem;
        color: var(--dn-text-muted);
        white-space: nowrap;
        flex-shrink: 0;
    }

    /* ─── Warnings ───────────────────────────────────────────────────────────── */
    .warnings-bar {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        padding: 6px 16px;
        background: var(--dn-surface);
        border-bottom: 1px solid var(--dn-border);
        flex-shrink: 0;
    }

    .warning-chip {
        font-size: 0.75rem;
        padding: 2px 8px;
        background: var(--dn-surface);
        border: 1px solid var(--dn-accent);
        border-radius: 12px;
        color: var(--dn-text-muted);
    }

    /* ─── Accessibility ──────────────────────────────────────────────────────── */
    .visually-hidden {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip: rect(0 0 0 0);
        white-space: nowrap;
    }

    /* ─── DN overlay rendering ───────────────────────────────────────────────── */
    :global(#dn-test-canvas-root .dn-wrapper) {
        position: absolute !important;
        top: 0;
        left: 0;
        z-index: 2;
        overflow: visible;
        pointer-events: none;
    }

    :global(#dn-test-canvas-root .dn-node) {
        position: absolute;
        margin: 0;
        background: transparent;
        border: 2px solid transparent;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.1s, border-color 0.1s;
        box-sizing: border-box;
        cursor: pointer;
    }

    :global(#dn-test-canvas-root .dn-node:focus),
    :global(#dn-test-canvas-root .dn-node.dn-current) {
        opacity: 1;
        pointer-events: auto;
        outline: none;
    }

    :global(#dn-test-canvas-root .dn-node-svg) {
        position: absolute;
        overflow: visible;
    }

    :global(#dn-test-canvas-root .dn-node-path) {
        fill: none;
        stroke: #333;
        stroke-width: calc(3px / var(--canvas-scale, 1));
    }

    :global(#dn-test-canvas-root .dn-exit-position) {
        position: absolute;
        bottom: 8px;
        left: 8px;
        z-index: 3;
        padding: 6px 10px;
        font-size: 0.8rem;
        background: var(--dn-bg);
        border: 1px solid var(--dn-border);
        border-radius: 4px;
        color: var(--dn-text-muted);
    }

    /* ─── Text chat width override ───────────────────────────────────────────── */
    :global(#dn-test-chat .dn-text-chat) {
        max-width: 100%;
        width: 100%;
        box-sizing: border-box;
    }

    :global(#dn-test-chat .dn-text-chat-log) {
        max-height: 160px;
    }

    /* ─── Text chat: replace hardcoded #ccc borders with CSS vars (both modes) ── */
    :global(#dn-test-chat .dn-text-chat-log) {
        border-color: var(--dn-border);
    }

    :global(#dn-test-chat .dn-text-chat-controls) {
        border-color: var(--dn-border);
    }

    :global(#dn-test-chat .dn-text-chat-form) {
        border-color: var(--dn-border);
    }

    :global(#dn-test-chat .dn-text-chat-form button) {
        border-left-color: var(--dn-control);
    }

    /* ─── Text chat dark mode ────────────────────────────────────────────────── */
    :global(.dark #dn-test-chat .dn-text-chat-log) {
        color: var(--dn-text);
    }

    :global(.dark #dn-test-chat .dn-text-chat-system) {
        color: var(--dn-text-muted);
    }

    :global(.dark #dn-test-chat .dn-text-chat-input-echo) {
        color: var(--dn-text);
    }

    :global(.dark #dn-test-chat .dn-text-chat-response) {
        color: var(--dn-text);
    }

    :global(.dark #dn-test-chat .dn-text-chat-controls) {
        color: var(--dn-text-muted);
        background: var(--dn-surface);
    }

    :global(.dark #dn-test-chat .dn-text-chat-form input[type='text']) {
        background: var(--dn-bg);
        color: var(--dn-text);
    }

    :global(.dark #dn-test-chat .dn-text-chat-form button) {
        background: var(--dn-surface);
        color: var(--dn-text);
    }

    /* ─── Text chat: auto-announce checkbox size ─────────────────────────────── */
    :global(#dn-test-chat .dn-text-chat-controls input[type='checkbox']) {
        width: 24px;
        height: 24px;
        min-width: 24px;
        min-height: 24px;
        flex-shrink: 0;
        cursor: pointer;
    }

    /* ─── Inspector dark mode overrides ─────────────────────────────────────── */
    /* inspector/style.css has no dark mode — override key rules here */
    :global(.dark .dn-inspector-tooltip) {
        background: var(--dn-surface);
        color: var(--dn-text);
        border-color: var(--dn-border);
    }

    /* ─── Inspector menu: constrain width and dark mode ─────────────────────── */
    :global(#dn-test-inspector .dn-inspector-menu) {
        min-width: 0;
        width: 100%;
        box-sizing: border-box;
    }

    :global(.dark #dn-test-inspector .dn-inspector-menu) {
        border-color: var(--dn-border);
        color: var(--dn-text);
    }

    :global(.dark #dn-test-inspector .dn-menu-item:hover) {
        background: var(--dn-accent-soft);
    }

    :global(.dark #dn-test-inspector .dn-menu-log-btn) {
        background: var(--dn-surface);
        border-color: var(--dn-control);
        color: var(--dn-text-muted);
    }

    :global(.dark #dn-test-inspector .dn-menu-log-btn:hover) {
        background: var(--dn-accent-soft);
        color: var(--dn-text);
    }

    :global(.dark #dn-test-inspector .dn-menu-pre) {
        background: var(--dn-surface);
        border-color: var(--dn-border);
    }

    :global(.dark #dn-test-inspector .dn-menu-empty) {
        color: var(--dn-text-muted);
    }

    :global(.dark #dn-test-inspector .dn-menu-array-toggle) {
        color: var(--dn-text-muted);
    }

    :global(.dark #dn-test-inspector .dn-menu-console-entry) {
        border-bottom-color: var(--dn-border);
    }
</style>
