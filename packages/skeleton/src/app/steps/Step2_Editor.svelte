<script lang="ts">
    import { onDestroy } from 'svelte';
    import { appState, type PrepState } from '../../store/appState';
    import GraphCanvas from '../components/GraphCanvas.svelte';
    import ScaffoldPanel from '../components/scaffold/ScaffoldPanel.svelte';
    import { logAction } from '../../store/historyStore';
    import { marksToNodes } from '../../utils/scaffoldAdapter';
    import { extractValues, extractXYValues } from '../../utils/valueExtractor';
    import type { ExtractedMark, VegaEmbedResult } from '../../utils/scaffoldAdapter';
    import type { SkeletonNode, SkeletonEdge } from '../../store/types';

    let selectedNodeIds = $state<string[]>([]);
    let selectedEdgeIds = $state<string[]>([]);
    let prep = $state<PrepState | null>(null);
    let scaffoldModeActive = $state(false);
    let allNodes = $state<Map<string, SkeletonNode>>(new Map());

    // Latest scaffold state from ScaffoldOverlay (passed up via callbacks)
    let latestMarks = $state<ExtractedMark[]>([]);
    let latestView = $state<VegaEmbedResult['view'] | null>(null);

    const _unsub = appState.subscribe(s => {
        prep = s.prepState;
        scaffoldModeActive = s.scaffoldModeActive;
        allNodes = s.nodes;
    });
    onDestroy(_unsub);

    function continueToTesting() {
        appState.update(s => ({ ...s, currentStep: 3 }));
    }

    // ── Scaffold mode toggle ──────────────────────────────────────────────────

    function toggleScaffold() {
        appState.update(s => ({ ...s, scaffoldModeActive: !s.scaffoldModeActive }));
    }

    // ── Derived: committed scaffold nodes (for extract values UI) ─────────────

    const committedScaffoldNodes = $derived([...allNodes.values()].filter(n => n.source === 'scaffold'));

    // ── Commit flow ───────────────────────────────────────────────────────────

    function handleCommit() {
        const cfg = appState;
        let s = (() => { let val: import('../../store/appState').AppState; appState.subscribe(v => val = v)(); return val!; })();

        const scaffoldCfg = s.scaffoldConfig;
        if (!scaffoldCfg) return;

        const manualNodes = [...s.nodes.values()].filter(n => n.source === 'manual');
        const hasManual = manualNodes.length > 0;

        let keepManual = true;
        if (hasManual) {
            keepManual = window.confirm(
                `Keep ${manualNodes.length} manually-added node${manualNodes.length !== 1 ? 's' : ''}?\n\n` +
                `OK = Keep manual nodes alongside scaffold nodes\n` +
                `Cancel = Replace all nodes with scaffold nodes`
            );
        }

        // Generate new scaffold nodes from latest marks
        const { nodes: newNodes, edges: newEdges } = marksToNodes(latestMarks, scaffoldCfg);

        appState.update(state => {
            const nextNodes = new Map<string, SkeletonNode>();
            const nextEdges = new Map<string, SkeletonEdge>(state.edges);

            // Keep existing non-scaffold nodes if requested
            if (keepManual) {
                state.nodes.forEach((node, id) => {
                    if (node.source !== 'scaffold') nextNodes.set(id, node);
                });
            } else {
                state.nodes.forEach((node, id) => {
                    // Always keep schema-derived nodes (from Prep)
                    if (node.source === 'schema') nextNodes.set(id, node);
                });
            }

            // Remove old scaffold edges
            state.edges.forEach((edge, id) => {
                const src = state.nodes.get(edge.sourceId);
                const tgt = state.nodes.get(edge.targetId);
                if (src?.source === 'scaffold' || tgt?.source === 'scaffold') {
                    nextEdges.delete(id);
                }
            });

            // Add new scaffold nodes + edges
            for (const node of newNodes) nextNodes.set(node.id, node);
            for (const edge of newEdges) nextEdges.set(edge.id, edge);

            return { ...state, nodes: nextNodes, edges: nextEdges };
        });

        logAction('Committed scaffold to nodes');
    }

    // ── Extract values ────────────────────────────────────────────────────────

    function handleExtractValues(calibNodeId: string, calibValue: number) {
        if (!latestView) {
            window.alert('No scaffold render available. Try re-entering scaffold mode to regenerate the chart.');
            return;
        }

        const state = (() => { let val: import('../../store/appState').AppState; appState.subscribe(v => val = v)(); return val!; })();
        const cfg = state.scaffoldConfig;
        if (!cfg) return;

        const nodes = [...state.nodes.values()];
        let updated: SkeletonNode[];

        if (cfg.chartType === 'scatter') {
            updated = extractXYValues(latestView, nodes, cfg);
        } else {
            updated = extractValues(latestView, nodes, cfg, calibNodeId, calibValue);
        }

        appState.update(s => {
            const nextNodes = new Map(s.nodes);
            for (const node of updated) nextNodes.set(node.id, node);
            return { ...s, nodes: nextNodes };
        });

        logAction('Extracted values from scaffold');
    }
</script>

<div class="editor-step" class:scaffold-open={scaffoldModeActive}>
    <div class="step-header">
        <div class="header-row">
            <h2 id="step-heading-2" tabindex="-1">Editor</h2>
            <button
                class="btn-ghost btn-sm scaffold-toggle"
                class:active={scaffoldModeActive}
                type="button"
                aria-pressed={scaffoldModeActive}
                onclick={toggleScaffold}
            >
                {scaffoldModeActive ? '✕ Close Scaffold' : '⊡ Scaffold'}
            </button>
        </div>
        {#if prep?.hasRun}
            <p class="step-desc">
                Your navigation structure was configured in Prep. Review the structure below, adjust any settings in the Schema panel, and continue to testing when ready.
            </p>
            <p class="prep-status-banner" role="status" aria-live="polite">
                ✓ Structure configured by Prep
            </p>
        {:else}
            <p class="step-desc">
                Draw nodes and edges to define the navigation graph.
                Nodes represent elements users can navigate to; edges define movement between them.
            </p>
        {/if}
    </div>

    <div class="editor-body">
        {#if scaffoldModeActive}
            <ScaffoldPanel
                onCommit={handleCommit}
                onExtractValues={handleExtractValues}
                {committedScaffoldNodes}
            />
        {/if}

        <GraphCanvas
            selectNodes={(ids) => { selectedNodeIds = ids; }}
            selectEdges={(ids) => { selectedEdgeIds = ids; }}
            onScaffoldMarksUpdated={(marks) => { latestMarks = marks; }}
            onScaffoldViewReady={(view) => { latestView = view; }}
        />
    </div>

    <div class="step-actions">
        <button class="btn-primary" type="button" onclick={continueToTesting}>
            Continue to Testing →
        </button>
    </div>
</div>

<style>
    .editor-step {
        display: flex;
        flex-direction: column;
        height: 100%;
        min-height: 0;
        gap: 0;
    }

    .step-header {
        flex-shrink: 0;
        padding-bottom: calc(var(--dn-space) * 2);
    }

    .header-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: calc(var(--dn-space) * 2);
        margin-bottom: calc(var(--dn-space) * 0.5);
    }

    .step-header h2 {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 600;
        color: var(--dn-text);
    }

    .scaffold-toggle {
        flex-shrink: 0;
        font-size: 0.875rem;
    }

    .scaffold-toggle.active {
        background: var(--dn-accent-soft);
        color: var(--dn-accent);
        border-color: var(--dn-accent-light);
    }

    .step-desc {
        margin: 0;
        color: var(--dn-text-muted);
        font-size: 0.9375rem;
    }

    .prep-status-banner {
        margin: calc(var(--dn-space) * 0.75) 0 0;
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--dn-accent);
    }

    .editor-body {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: row;
        overflow: hidden;
    }

    .step-actions {
        flex-shrink: 0;
        display: flex;
        justify-content: flex-end;
        padding-top: calc(var(--dn-space) * 2);
    }
</style>
