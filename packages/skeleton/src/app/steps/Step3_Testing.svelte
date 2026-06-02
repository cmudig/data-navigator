<script lang="ts">
    import { onDestroy } from 'svelte';
    import dataNavigator from 'data-navigator';
    import 'data-navigator/text-chat.css';
    import { Inspector } from '@data-navigator/inspector';
    import '@data-navigator/inspector/style.css';
    import { appState, type RenderConfig } from '../../store/appState';
    import type { SkeletonNode, SkeletonEdge } from '../../store/types';
    import { toStructure, validateStructure, type DNStructure, type StructureInput } from '../../utils/dnAdapter';

    // ─── Store mirrors ──────────────────────────────────────────────────────────
    let nodes        = $state(new Map<string, SkeletonNode>());
    let edges        = $state(new Map<string, SkeletonEdge>());
    let entryNodeId  = $state<string | null>(null);
    let imageDataUrl = $state<string | null>(null);
    let imageWidth   = $state<number | null>(null);
    let imageHeight  = $state<number | null>(null);
    let uploadedData = $state.raw<Record<string, unknown>[] | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let renderConfig = $state<RenderConfig>({ positionUnit: 'px', showOverlay: false, semanticNames: [] });
    // Raw DN result from SchemaPanel — canonical navigation structure with correct
    // per-node edge membership. null when no schema has been built yet.
    let appDnStructure = $state<Record<string, unknown> | null>(null);

    let graphMode    = $state<'force' | 'tree'>('force');

    // Last-seen references to avoid proxy churn on unchanged Maps
    let _lastNodes = new Map<string, SkeletonNode>();
    let _lastEdges = new Map<string, SkeletonEdge>();

    const _unsub = appState.subscribe(s => {
        if (s.nodes !== _lastNodes) { _lastNodes = s.nodes; nodes = s.nodes; }
        if (s.edges !== _lastEdges) { _lastEdges = s.edges; edges = s.edges; }
        entryNodeId    = s.entryNodeId;
        imageDataUrl   = s.imageDataUrl;
        imageWidth     = s.imageWidth;
        imageHeight    = s.imageHeight;
        uploadedData   = s.uploadedData;
        renderConfig   = s.renderConfig;
        graphMode      = s.schemaState.graphMode as 'force' | 'tree';
        appDnStructure = s.dnStructure;
    });
    onDestroy(_unsub);

    // ─── UI control state ───────────────────────────────────────────────────────
    let navMode       = $state<'text' | 'keyboard'>('text');
    let showAllNodes  = $state(false);
    let showAllEdges  = $state(false);

    // ─── Navigation state ───────────────────────────────────────────────────────
    let currentNodeId    = $state<string | null>(null);
    let focusedNodeData  = $state<Record<string, unknown> | null>(null);
    let focusedNodeLabel = $state<string>('');

    interface NavDirection { rule: string; key: string; destLabel: string; }
    let focusedNodeDirections = $state<NavDirection[]>([]);

    type EventKind = 'enter' | 'navigate' | 'exit' | 'select' | 'hover' | 'keypress';
    interface EventLogEntry {
        id: number; kind: EventKind; timestamp: number;
        nodeLabel?: string; key?: string; direction?: string; navigated?: boolean;
    }
    let eventLog: EventLogEntry[] = $state([]);
    let _logCounter = 0;

    function logEvent(entry: Omit<EventLogEntry, 'id' | 'timestamp'>) {
        const e: EventLogEntry = { ...entry, id: _logCounter++, timestamp: Date.now() };
        eventLog = [e, ...eventLog].slice(0, 50);
    }

    // ─── Imperative DN handles (non-reactive) ───────────────────────────────────
    let dnRenderer: ReturnType<typeof dataNavigator.rendering> | null = null;
    let dnInput:    ReturnType<typeof dataNavigator.input> | null = null;
    let dnTextChat: { destroy: () => void } | null = null;
    let dnInspector: ReturnType<typeof Inspector> | null = null;
    const nodeElements = new Map<string, HTMLElement>();
    let renderedNodeId: string | null = null;

    // ─── Derived ────────────────────────────────────────────────────────────────
    const canvasWidth  = $derived(imageWidth  ?? 800);
    const canvasHeight = $derived(imageHeight ?? 600);

    let canvasScalerWidth = $state(0);
    const canvasScale = $derived(
        canvasScalerWidth > 0 && canvasWidth > 0
            ? Math.min(1, canvasScalerWidth / canvasWidth)
            : 1
    );

    const dnStructure = $derived.by<DNStructure | null>(() => {
        if (nodes.size === 0) return null;
        // Always call toStructure() to get elementData (spatial positions for the
        // rendering overlay). We need it even when appDnStructure is present.
        const skelStructure = toStructure({ nodes, edges } satisfies StructureInput);
        if (!skelStructure) return null;
        // Prefer the raw DN result stored by SchemaPanel — it has correct per-node
        // edge membership set by addEdgeToNode() in the DN library. The skeleton
        // reconstruction in toStructure() cannot reproduce this correctly.
        // Fall back to the skeleton-reconstructed structure for purely manual graphs.
        if (appDnStructure) {
            return {
                ...appDnStructure,
                elementData: skelStructure.elementData,
            } as DNStructure;
        }
        return skelStructure;
    });

    const warnings = $derived.by(() =>
        validateStructure({ nodes, edges, entryNodeId } satisfies StructureInput)
    );

    const edgeLines = $derived.by(() => {
        if (!showAllEdges) return [];
        // A bidirectional edge has 2+ navigationRuleNames — it renders as 2 arrows.
        // This matches GraphCanvas: one edge ID, two visual curves (forward + reverse).
        return [...edges.values()].flatMap(e => {
            const src = nodes.get(e.sourceId);
            const tgt = nodes.get(e.targetId);
            if (!src || !tgt) return [];
            const sc = { x: src.x + src.width / 2, y: src.y + src.height / 2 };
            const tc = { x: tgt.x + tgt.width / 2, y: tgt.y + tgt.height / 2 };
            const dx = tc.x - sc.x, dy = tc.y - sc.y;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            const mx = (sc.x + tc.x) / 2, my = (sc.y + tc.y) / 2;
            const isPaired = (e.navigationRuleNames?.length ?? 0) > 1;
            const cpx = isPaired ? mx + (dy / len) * 30 : mx;
            const cpy = isPaired ? my + (-dx / len) * 30 : my;
            const lx = isPaired ? (sc.x + 2 * cpx + tc.x) / 4 : mx;
            const ly = isPaired ? (sc.y + 2 * cpy + tc.y) / 4 : my;
            const fwd = { id: e.id, isPaired, sc, tc, cpx, cpy, lx, ly,
                          label: e.navigationRuleNames?.[0] ?? e.direction };
            if (!isPaired) return [fwd];
            // Reverse arrow for the bidirectional edge (tgt → src, opposite offset)
            const cpx_bwd = mx - (dy / len) * 30;
            const cpy_bwd = my + (dx / len) * 30;
            const lx_bwd = (tc.x + 2 * cpx_bwd + sc.x) / 4;
            const ly_bwd = (tc.y + 2 * cpy_bwd + sc.y) / 4;
            const bwd = { id: `${e.id}__bwd`, isPaired, sc: tc, tc: sc,
                          cpx: cpx_bwd, cpy: cpy_bwd, lx: lx_bwd, ly: ly_bwd,
                          label: e.navigationRuleNames?.[1] ?? e.direction };
            return [fwd, bwd];
        });
    });

    const keyboardInstructions = $derived.by(() => {
        if (!dnStructure?.navigationRules) return [];
        const grouped = new Map<string, string[]>();
        for (const [rule, obj] of Object.entries(dnStructure.navigationRules)) {
            const key = (obj as { key?: string }).key ?? rule;
            if (!grouped.has(key)) grouped.set(key, []);
            grouped.get(key)!.push(rule);
        }
        return [...grouped.entries()].map(([key, rules]) => ({
            key,
            rule: rules.join(' / ')
        }));
    });

    // ─── Navigation callbacks ───────────────────────────────────────────────────
    function setFocusedElement(nodeId: string | null, renderId?: string) {
        for (const el of nodeElements.values()) el.classList.remove('nav-focused');
        if (nodeId && renderId) {
            const el = nodeElements.get(nodeId) ?? document.getElementById(renderId) as HTMLElement | null;
            el?.classList.add('nav-focused');
        }
    }

    function handleNavigate(node: Record<string, unknown>) {
        const id  = node.id as string;
        // Use || (not ??) so both "" (leaf default) and undefined (root) fall back to id
        const rId = ((node.renderId as string) || id);
        // Read the pre-resolved label from elementData — raw DN nodes have no semantics
        const label = dnStructure?.elementData?.[rId]?.semantics?.label
            ?? (node.semantics as { label?: string })?.label
            ?? id;

        // Remove previously rendered node (on-demand lifecycle)
        if (renderedNodeId && renderedNodeId !== rId) {
            try { dnRenderer?.remove?.(renderedNodeId); } catch { /* ignore */ }
        }
        renderedNodeId = rId;

        // Render new node on-demand — ensure renderId is correct on the node object
        const nodeForRenderer = (node.renderId as string) === rId
            ? node
            : { ...node, renderId: rId };
        try { dnRenderer?.render?.(nodeForRenderer as Parameters<NonNullable<typeof dnRenderer>['render']>[0]); } catch { /* ignore */ }

        // Focus it in keyboard mode
        if (navMode === 'keyboard') {
            dnInput?.focus(rId);
        }

        currentNodeId    = id;
        focusedNodeData  = (node.data as Record<string, unknown>) ?? null;
        focusedNodeLabel = label;

        // Build per-direction navigation targets. Mirror input.ts: first valid edge
        // per rule wins (input.ts breaks after the first match, so later edges for
        // the same rule — e.g. the far side of a circular sibling ring — are never
        // reached and must not appear here either).
        const edgeIds = (node.edges as string[] | undefined) ?? [];
        const dirs: NavDirection[] = [];
        const seenRules = new Set<string>();
        const edgeMap = dnStructure?.edges as Record<string, { source: string; target: string; navigationRules: string[] }> | undefined;
        const navRuleMap = dnStructure?.navigationRules as Record<string, { key: string; direction: string }> | undefined;
        const nodeMap = dnStructure?.nodes as Record<string, { renderId?: string }> | undefined;
        for (const edgeId of edgeIds) {
            const edge = edgeMap?.[edgeId];
            if (!edge) continue;
            for (const ruleName of edge.navigationRules) {
                if (seenRules.has(ruleName)) continue; // first match wins
                const navRule = navRuleMap?.[ruleName];
                if (!navRule) continue;
                // DN logic: resolvedNodes[navRule.direction] is the destination,
                // but only when that node is NOT the current focus.
                // direction='target' → dest = edge.target (valid when current = source)
                // direction='source' → dest = edge.source (valid when current = target)
                let destId: string | null = null;
                if (navRule.direction === 'target' && edge.target !== id) destId = edge.target;
                else if (navRule.direction === 'source' && edge.source !== id) destId = edge.source;
                if (!destId) continue;
                seenRules.add(ruleName);
                const destRenderId = (nodeMap?.[destId]?.renderId as string) || destId;
                const destLabel = dnStructure?.elementData?.[destRenderId]?.semantics?.label ?? destId;
                dirs.push({ rule: ruleName, key: navRule.key, destLabel });
            }
        }
        focusedNodeDirections = dirs;

        setFocusedElement(id, rId);
        dnInspector?.highlight(rId);
        logEvent({ kind: 'navigate', nodeLabel: label });
    }

    function handleExit() {
        // Remove currently rendered node
        if (renderedNodeId) {
            try { dnRenderer?.remove?.(renderedNodeId); } catch { /* ignore */ }
            renderedNodeId = null;
        }
        currentNodeId    = null;
        focusedNodeData  = null;
        focusedNodeLabel = '';
        focusedNodeDirections = [];
        setFocusedElement(null);
        dnInspector?.clear();
        if (dnRenderer?.exitElement) {
            dnRenderer.exitElement.style.display = 'block';
            dnInput?.focus(dnRenderer.exitElement.id);
        }
        logEvent({ kind: 'exit' });
    }

    function handleSelect(node: Record<string, unknown>) {
        const id  = node.id as string;
        const rId = ((node.renderId as string) || id);
        const label = dnStructure?.elementData?.[rId]?.semantics?.label
            ?? (node.semantics as { label?: string })?.label
            ?? id;
        focusedNodeData  = (node.data as Record<string, unknown>) ?? null;
        focusedNodeLabel = label;
        logEvent({ kind: 'select', nodeLabel: label });
    }

    function handleHover(node: Record<string, unknown>) {
        const id  = node.id as string;
        const rId = ((node.renderId as string) || id);
        const label = dnStructure?.elementData?.[rId]?.semantics?.label
            ?? (node.semantics as { label?: string })?.label
            ?? id;
        logEvent({ kind: 'hover', nodeLabel: label });
    }

    function enterNavigation() {
        if (!dnInput || !dnStructure) return;
        const entryNode = dnInput.enter() as Record<string, unknown> | undefined;
        if (!entryNode) return;
        handleNavigate(entryNode);
        if (navMode === 'keyboard') {
            const entryRId = ((entryNode.renderId as string) || (entryNode.id as string));
            dnInput.focus(entryRId);
        }
        const entryRId = ((entryNode.renderId as string) || (entryNode.id as string));
        const entryLabel = dnStructure?.elementData?.[entryRId]?.semantics?.label
            ?? (entryNode.semantics as { label?: string })?.label;
        logEvent({ kind: 'enter', nodeLabel: entryLabel });
    }

    function handleKeydown(e: KeyboardEvent) {
        if (!dnInput || !dnStructure) return;
        const direction = dnInput.keydownValidator(e) as string | undefined;

        if (direction) {
            e.preventDefault();
            if (!currentNodeId) {
                if (e.key === 'Enter') enterNavigation();
                logEvent({ kind: 'keypress', key: e.key, direction, navigated: false });
                return;
            }
            const next = dnInput.move(currentNodeId, direction) as Record<string, unknown> | undefined;
            logEvent({ kind: 'keypress', key: e.key, direction, navigated: !!next });
            if (next) {
                handleNavigate(next);
                dnInput.focus((next.renderId as string) ?? (next.id as string));
            } else if (direction === 'exit') {
                handleExit();
            }
        } else {
            // Non-navigation key — log it so the user can see all keypresses
            logEvent({ kind: 'keypress', key: e.key, direction: undefined, navigated: false });
        }
    }

    function resetNavigation() {
        if (renderedNodeId) {
            try { dnRenderer?.remove?.(renderedNodeId); } catch { /* ignore */ }
            renderedNodeId = null;
        }
        currentNodeId    = null;
        focusedNodeData  = null;
        focusedNodeLabel = '';
        focusedNodeDirections = [];
        eventLog         = [];
        setFocusedElement(null);
        dnInspector?.clear();
    }

    // ─── DN helpers ─────────────────────────────────────────────────────────────
    function initTextChat(structure: DNStructure) {
        if (!entryNodeId) return;
        const chatEl = document.getElementById('dn-test-chat');
        if (chatEl) chatEl.innerHTML = '';
        try {
            dnTextChat = dataNavigator.textChat({
                structure: structure as any,
                container: 'dn-test-chat',
                entryPoint: entryNodeId,
                onNavigate: handleNavigate as (n: unknown) => void,
                onExit:     handleExit,
                onClick:    handleSelect as (n: unknown) => void,
                onHover:    handleHover as (n: unknown) => void,
                data: uploadedData ?? undefined,
            });
        } catch (err) {
            console.error('[Step3] textChat init failed:', err);
        }
    }

    function initInspector(structure: DNStructure, mode: 'force' | 'tree') {
        const container = document.getElementById('dn-test-inspector');
        if (!container) return;
        container.innerHTML = '';
        console.log('[Testing] Inspector input — nodes:', Object.keys(structure.nodes).length, 'edges:', Object.keys(structure.edges ?? {}).length);
        console.log('[Testing] Inspector input (full):', structure);
        try {
            dnInspector = Inspector({
                structure: structure as any,
                container,
                size: { width: 340, height: 280 },
                colorBy: 'dimensionLevel',
                mode,
                nodeRadius: 6,
                showConsoleMenu: { data: uploadedData ?? [] },
            } as any);
        } catch (err) {
            console.error('[Step3] Inspector init failed:', err);
        }
    }

    // ─── Full lifecycle effect (runs on structure change) ───────────────────────
    $effect(() => {
        const structure = dnStructure;

        // Teardown
        dnTextChat?.destroy();
        dnInspector?.destroy();
        dnTextChat    = null;
        dnInspector   = null;
        dnRenderer    = null;
        dnInput       = null;
        renderedNodeId = null;
        nodeElements.clear();
        currentNodeId    = null;
        focusedNodeData  = null;
        focusedNodeLabel = '';
        focusedNodeDirections = [];

        const canvasEl = document.getElementById('dn-test-canvas-root');
        if (canvasEl) {
            canvasEl.querySelectorAll('.dn-wrapper, .dn-exit-position').forEach(el => el.remove());
        }

        if (!structure || !entryNodeId) return;

        // 1. Renderer — no entry button (keyboard mode has its own button in the right panel)
        try {
            dnRenderer = dataNavigator.rendering({
                elementData: structure.elementData as Parameters<typeof dataNavigator.rendering>[0]['elementData'],
                suffixId: 'test-0',
                root: {
                    id: 'dn-test-canvas-root',
                    description: 'Navigate the data structure',
                    width:  `${canvasWidth}px`,
                    height: `${canvasHeight}px`,
                },
                defaults: { cssClass: 'dn-node-overlay' },
                entryButton: { include: false },
                exitElement:  { include: true },
            });
            dnRenderer.initialize();
            // No pre-render — nodes are rendered on-demand as user navigates
        } catch (err) {
            console.error('[Step3] Renderer init failed:', err);
            return;
        }

        // 2. Input handler
        try {
            dnInput = dataNavigator.input({
                structure: structure as any,
                navigationRules: structure.navigationRules as Parameters<typeof dataNavigator.input>[0]['navigationRules'],
                entryPoint: entryNodeId,
                exitPoint:  dnRenderer?.exitElement?.id,
            });
        } catch (err) {
            console.error('[Step3] Input handler init failed:', err);
        }

        // 3. Text chat (text mode only)
        if (navMode === 'text') initTextChat(structure);

        // 4. Inspector
        initInspector(structure, graphMode);
    });

    // ─── Mode-switch effect (no full reinit) ────────────────────────────────────
    $effect(() => {
        const mode = navMode;
        if (!dnStructure || !entryNodeId || !dnRenderer) return;
        if (mode === 'text') {
            if (!dnTextChat) initTextChat(dnStructure);
        } else {
            dnTextChat?.destroy();
            dnTextChat = null;
            const chatEl = document.getElementById('dn-test-chat');
            if (chatEl) chatEl.innerHTML = '';
        }
    });

    // ─── Document keydown listener (keyboard mode only) ─────────────────────────
    $effect(() => {
        if (navMode !== 'keyboard') return;
        document.addEventListener('keydown', handleKeydown);
        return () => document.removeEventListener('keydown', handleKeydown);
    });

    onDestroy(() => {
        dnTextChat?.destroy();
        dnInspector?.destroy();
    });

    function formatTime(ts: number): string {
        return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
</script>

<!-- LEFT: Inspector -->
<aside class="inspector-panel" aria-label="Structure inspector">
    <div class="inspector-header">
        <span class="inspector-title">Schema</span>
    </div>
    <div class="inspector-graph-section">
        <div id="dn-test-inspector" class="inspector-container"></div>
    </div>
</aside>

<!-- CENTER: Output + Canvas -->
<div class="workspace-canvas--mild center-content">
    <!-- Warnings bar (entry node only) -->
    {#if warnings.length > 0}
        <div class="warnings-bar" role="alert" aria-live="polite">
            {#each warnings as w}
                <span class="warning-chip">{w.message}</span>
            {/each}
        </div>
    {/if}
            <!-- Canvas visibility controls + screen reader output -->
            <div class="canvas-controls">
                <label class="check-label">
                    <input type="checkbox" bind:checked={showAllNodes} /> Show nodes
                </label>
                <label class="check-label">
                    <input type="checkbox" bind:checked={showAllEdges} /> Show edges
                </label>
            </div>

            <div
                class="canvas-scaler"
                bind:clientWidth={canvasScalerWidth}
                style="height: {canvasHeight * canvasScale}px;"
            >
            <div
                id="dn-test-canvas-root"
                class="canvas-root"
                style="width:{canvasWidth}px; height:{canvasHeight}px; --canvas-scale:{canvasScale}; transform: scale({canvasScale}); transform-origin: top left;"
            >
                {#if imageDataUrl}
                    <img
                        src={imageDataUrl}
                        alt=""
                        aria-hidden="true"
                        class="canvas-bg"
                        width={canvasWidth}
                        height={canvasHeight}
                    />
                {:else}
                    <div class="canvas-placeholder">
                        <span>No image uploaded</span>
                    </div>
                {/if}

                <!-- SVG shapes overlay — matches editor rendering (show-nodes toggle) -->
                {#if showAllNodes}
                    <svg class="shapes-overlay" width={canvasWidth} height={canvasHeight} aria-hidden="true">
                        {#each [...nodes.values()] as node (node.id)}
                            {#if node.renderProperties.shape === 'rect'}
                                <rect
                                    x={node.x} y={node.y}
                                    width={node.width} height={node.height}
                                    rx="4"
                                    fill={node.renderProperties.fillEnabled ? node.renderProperties.fill : 'none'}
                                    fill-opacity={node.renderProperties.opacity}
                                    stroke={node.renderProperties.strokeColor}
                                    stroke-width={node.renderProperties.strokeWidth}
                                    stroke-dasharray={node.renderProperties.strokeDash === 'dashed' ? '6,3'
                                                    : node.renderProperties.strokeDash === 'dotted' ? '2,2'
                                                    : undefined}
                                />
                            {:else if node.renderProperties.shape === 'ellipse'}
                                <ellipse
                                    cx={node.x + node.width / 2} cy={node.y + node.height / 2}
                                    rx={node.width / 2} ry={node.height / 2}
                                    fill={node.renderProperties.fillEnabled ? node.renderProperties.fill : 'none'}
                                    fill-opacity={node.renderProperties.opacity}
                                    stroke={node.renderProperties.strokeColor}
                                    stroke-width={node.renderProperties.strokeWidth}
                                    stroke-dasharray={node.renderProperties.strokeDash === 'dashed' ? '6,3'
                                                    : node.renderProperties.strokeDash === 'dotted' ? '2,2'
                                                    : undefined}
                                />
                            {:else if node.renderProperties.shape === 'path' && node.pathData}
                                <path
                                    d={node.pathData}
                                    fill={node.renderProperties.fillEnabled ? node.renderProperties.fill : 'none'}
                                    fill-opacity={node.renderProperties.opacity}
                                    stroke={node.renderProperties.strokeColor}
                                    stroke-width={node.renderProperties.strokeWidth}
                                />
                            {/if}
                        {/each}
                    </svg>
                {/if}

                <!-- Edge SVG overlay -->
                {#if showAllEdges && edgeLines.length > 0}
                    <svg class="edge-overlay" width={canvasWidth} height={canvasHeight} aria-hidden="true">
                        <defs>
                            <marker id="dn-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                                <path d="M0,0 L0,6 L6,3 z" fill="var(--dn-accent)" opacity="0.7" />
                            </marker>
                        </defs>
                        {#each edgeLines as edge (edge.id)}
                            {#if edge.isPaired}
                                <path
                                    d="M {edge.sc.x} {edge.sc.y} Q {edge.cpx} {edge.cpy} {edge.tc.x} {edge.tc.y}"
                                    fill="none" stroke="var(--dn-accent)" stroke-width="1.5" opacity="0.5"
                                    marker-end="url(#dn-arrow)"
                                />
                            {:else}
                                <line
                                    x1={edge.sc.x} y1={edge.sc.y} x2={edge.tc.x} y2={edge.tc.y}
                                    stroke="var(--dn-accent)" stroke-width="1.5" opacity="0.5"
                                    marker-end="url(#dn-arrow)"
                                />
                            {/if}
                            <text
                                x={edge.lx} y={edge.ly - 5}
                                font-size="10" fill="var(--dn-accent)" text-anchor="middle"
                                paint-order="stroke" stroke="var(--dn-bg, white)" stroke-width="3"
                            >{edge.label}</text>
                        {/each}
                    </svg>
                {/if}

                <!-- DN wrapper + nodes appended by renderer.initialize() -->
            </div>
            </div><!-- /.canvas-scaler -->

            <!-- Screen reader announcement (above canvas) -->
            {#if focusedNodeLabel || focusedNodeData || focusedNodeDirections.length > 0}
                <div class="sr-announcement">
                    <div class="sr-section">
                        <span class="sr-label">Screen reader announcement:</span>
                        <span class="sr-value">{focusedNodeLabel || '—'}</span>
                    </div>
                    {#if focusedNodeDirections.length > 0 || (focusedNodeData && Object.entries(focusedNodeData).filter(([k]) => !k.startsWith('_')).length > 0)}
                        <details>
                            <summary>Info for current node</summary>
                            {#if focusedNodeDirections.length > 0}
                                <h4 class="sr-subheading">Navigation</h4>
                                <table class="output-table">
                                    <tbody>
                                        {#each focusedNodeDirections as dir}
                                            <tr>
                                                <th scope="row">{dir.rule} (<kbd>{dir.key}</kbd>)</th>
                                                <td>→ {dir.destLabel}</td>
                                            </tr>
                                        {/each}
                                    </tbody>
                                </table>
                            {/if}
                            {#if focusedNodeData && Object.entries(focusedNodeData).filter(([k]) => !k.startsWith('_')).length > 0}
                                <h4 class="sr-subheading">Node data</h4>
                                <table class="output-table">
                                    <tbody>
                                        {#each Object.entries(focusedNodeData).filter(([k]) => !k.startsWith('_')) as [key, val]}
                                            <tr>
                                                <th scope="row">{key}</th>
                                                <td>{typeof val === 'object' && val !== null ? JSON.stringify(val) : String(val)}</td>
                                            </tr>
                                        {/each}
                                    </tbody>
                                </table>
                            {/if}
                        </details>
                    {/if}
                </div>
            {/if}

    {#if nodes.size === 0}
        <p class="empty-hint">Build your node graph in the Editor step, then return here to test.</p>
    {/if}
</div>

<!-- RIGHT: Mode toggle + Chat or Keyboard + Events -->
<aside class="log-panel" aria-label="Navigation log and output">
            <!-- Keyboard mode toggle -->
            <label class="kbd-toggle-label check-label">
                <input
                    type="checkbox"
                    checked={navMode === 'keyboard'}
                    onchange={(e) => { navMode = (e.currentTarget as HTMLInputElement).checked ? 'keyboard' : 'text'; }}
                />
                Enable keyboard navigation
            </label>

            {#if navMode === 'text'}
                <div class="panel-heading">Text navigation</div>
                <div id="dn-test-chat" class="chat-container"></div>
            {:else}
                <div class="panel-heading">Keyboard navigation</div>
                <div class="kbd-enter-area">
                    <button
                        class="btn-primary"
                        type="button"
                        onclick={enterNavigation}
                        disabled={!dnStructure || !entryNodeId}
                    >
                        Enter navigation area
                    </button>
                </div>
                {#if keyboardInstructions.length > 0}
                    <table class="keys-table">
                        <thead><tr><th>Key</th><th>Direction / Rule</th></tr></thead>
                        <tbody>
                            {#each keyboardInstructions as item}
                                <tr><td><kbd>{item.key}</kbd></td><td>{item.rule}</td></tr>
                            {/each}
                        </tbody>
                    </table>
                {:else}
                    <p class="keys-empty">No navigation rules. Add edges with directions in the Editor.</p>
                {/if}
            {/if}

            <div class="panel-heading">Events</div>
            <div class="event-log" aria-live="off" aria-label="Navigation events">
                {#if eventLog.length === 0}
                    <p class="log-empty">No events yet. Start navigating to see events here.</p>
                {:else}
                    {#each eventLog as entry (entry.id)}
                        <div class="log-entry log-{entry.kind}">
                            <span class="log-kind">{entry.kind}</span>
                            {#if entry.nodeLabel}
                                <span class="log-label" title={entry.nodeLabel}>{entry.nodeLabel}</span>
                            {/if}
                            {#if entry.key}
                                <kbd class="log-key">{entry.key}</kbd>
                            {/if}
                            {#if entry.kind === 'keypress'}
                                <span class="log-navigated" class:yes={entry.navigated} class:no={!entry.navigated}>
                                    {entry.navigated ? '✓' : '✗'}
                                </span>
                            {/if}
                            <time class="log-time" datetime={new Date(entry.timestamp).toISOString()}>
                                {formatTime(entry.timestamp)}
                            </time>
                        </div>
                    {/each}
                {/if}
        </div>
</aside>

<style>
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
        width: 360px;
        flex-shrink: 0;
        border-right: 1px solid var(--dn-border);
        display: flex;
        flex-direction: column;
        overflow: hidden;
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
        flex: 1;
        overflow-y: auto;
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
    :global(#dn-test-canvas-root .dn-node.nav-focused) {
        opacity: 1;
        pointer-events: auto;
        /* Divide by --canvas-scale so the outline stays ~2px wide visually at any zoom */
        /* outline: calc(2px / var(--canvas-scale, 1)) solid var(--dn-accent); */
        outline-offset: calc(2px / var(--canvas-scale, 1));
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
        border-left-color: var(--dn-border);
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
        border-color: var(--dn-border);
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
