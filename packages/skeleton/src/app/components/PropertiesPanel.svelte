<script lang="ts">
    import { appState } from '../../store/appState';
    import type { RenderConfig, SchemaState } from '../../store/appState';
    import type { SkeletonNode, SkeletonEdge } from '../../store/types';
    import LabelBuilder from './prep/LabelBuilder.svelte';

    // ── Store sync ────────────────────────────────────────────────────────────
    let nodes = $state<Map<string, SkeletonNode>>(new Map());
    let edges = $state<Map<string, SkeletonEdge>>(new Map());
    let selectedNodeIds = $state<Set<string>>(new Set());
    let selectedEdgeIds = $state<Set<string>>(new Set());
    let entryNodeId = $state<string | null>(null);
    let imageWidth = $state<number | null>(null);
    let imageHeight = $state<number | null>(null);
    let currentStep = $state(0);
    let renderConfig = $state<RenderConfig>({ positionUnit: 'px', showOverlay: false, semanticNames: ['data point', 'node'] });
    let schemaState = $state<SchemaState | null>(null);
    let uploadedData = $state<Record<string, unknown>[] | null>(null);

    $effect(() => {
        return appState.subscribe(s => {
            nodes = s.nodes;
            edges = s.edges;
            selectedNodeIds = s.selectedNodeIds;
            selectedEdgeIds = s.selectedEdgeIds;
            entryNodeId = s.entryNodeId;
            imageWidth = s.imageWidth;
            imageHeight = s.imageHeight;
            currentStep = s.currentStep;
            renderConfig = s.renderConfig;
            schemaState = s.schemaState;
            uploadedData = s.uploadedData;
        });
    });

    // ── Conflict tracking: mark appState when schema-generated nodes are edited ──
    function markManualEdit(node: SkeletonNode) {
        if (node.source === 'schema') {
            appState.update(s => ({ ...s, hasManualNodeEdits: true }));
        }
    }

    // ── Selection derivations ─────────────────────────────────────────────────
    const selNodeCount = $derived(selectedNodeIds.size);
    const selEdgeCount = $derived(selectedEdgeIds.size);
    const selType = $derived(
        selNodeCount === 1 && selEdgeCount === 0 ? 'singleNode' :
        selNodeCount === 0 && selEdgeCount === 1 ? 'singleEdge' :
        selNodeCount > 1 ? 'multiNode' :
        selEdgeCount > 1 ? 'multiEdge' :
        'none'
    );

    const selectedNode = $derived(
        selType === 'singleNode' ? nodes.get([...selectedNodeIds][0]) : undefined
    );
    const selectedEdge = $derived(
        selType === 'singleEdge' ? edges.get([...selectedEdgeIds][0]) : undefined
    );
    const selectedNodesList = $derived(
        [...selectedNodeIds].map(id => nodes.get(id)).filter((n): n is SkeletonNode => !!n)
    );

    // ── Position unit toggle ──────────────────────────────────────────────────
    let posUnit = $state<'px' | '%'>('px');

    function toDisplayCoord(px: number, axis: 'x' | 'y'): number {
        if (posUnit === '%') {
            const dim = axis === 'x' ? imageWidth : imageHeight;
            if (dim && dim > 0) return Math.round((px / dim) * 10000) / 100;
        }
        return Math.round(px);
    }

    function fromDisplayCoord(val: number, axis: 'x' | 'y'): number {
        if (posUnit === '%') {
            const dim = axis === 'x' ? imageWidth : imageHeight;
            if (dim && dim > 0) return (val / 100) * dim;
        }
        return val;
    }

    // ── KV editor state ───────────────────────────────────────────────────────
    type KVEntry = { id: string; key: string; value: string };

    let dataEntries = $state<KVEntry[]>([]);
    let dnPropEntries = $state<KVEntry[]>([]);

    // Plain (non-reactive) vars to track which node/edge is loaded into the local KV lists
    let loadedNodeId: string | null = null;
    let loadedEdgeId: string | null = null;

    $effect(() => {
        const node = selectedNode;
        if (node?.id !== loadedNodeId) {
            loadedNodeId = node?.id ?? null;
            dataEntries = Object.entries(node?.data ?? {}).map(([key, value]) => ({
                id: crypto.randomUUID(),
                key,
                value: String(value),
            }));
        }
    });

    $effect(() => {
        const edge = selectedEdge;
        if (edge?.id !== loadedEdgeId) {
            loadedEdgeId = edge?.id ?? null;
            dnPropEntries = Object.entries(edge?.dnProperties ?? {}).map(([key, value]) => ({
                id: crypto.randomUUID(),
                key,
                value: String(value),
            }));
        }
    });

    function flushDataEntries(nodeId: string) {
        const data: Record<string, unknown> = {};
        for (const { key, value } of dataEntries) {
            if (key.trim()) data[key.trim()] = value;
        }
        appState.update(s => {
            const n = s.nodes.get(nodeId);
            if (!n) return s;
            return { ...s, nodes: new Map(s.nodes).set(nodeId, { ...n, data }) };
        });
    }

    function flushDnPropEntries(edgeId: string) {
        const dnProperties: Record<string, unknown> = {};
        for (const { key, value } of dnPropEntries) {
            if (key.trim()) dnProperties[key.trim()] = value;
        }
        appState.update(s => {
            const e = s.edges.get(edgeId);
            if (!e) return s;
            return { ...s, edges: new Map(s.edges).set(edgeId, { ...e, dnProperties }) };
        });
    }

    // ── Apply live messages ───────────────────────────────────────────────────
    let applyMsg = $state('');

    // ── Multi-node bulk state ─────────────────────────────────────────────────
    let bulkSemanticLabel = $state('');
    let bulkEdgeDirection = $state<SkeletonEdge['direction']>('down');

    // ── Multi-edge bulk state ─────────────────────────────────────────────────
    let bulkDirection = $state<SkeletonEdge['direction']>('down');

    // ── Single node updaters ──────────────────────────────────────────────────
    function updateNode(patch: Partial<SkeletonNode>) {
        const id = selectedNode?.id;
        if (!id) return;
        appState.update(s => {
            const n = s.nodes.get(id);
            if (!n) return s;
            const updated = { ...n, ...patch };
            markManualEdit(n);
            return { ...s, nodes: new Map(s.nodes).set(id, updated) };
        });
    }

    function updateNodeId(oldId: string, newId: string) {
        if (!newId.trim() || newId === oldId) return;
        appState.update(s => {
            const n = s.nodes.get(oldId);
            if (!n) return s;
            const newNodes = new Map(s.nodes);
            newNodes.delete(oldId);
            newNodes.set(newId, { ...n, id: newId });
            markManualEdit(n);
            // Remap edges that reference the old ID
            const newEdges = new Map<string, SkeletonEdge>();
            s.edges.forEach((e, eid) => {
                newEdges.set(eid, {
                    ...e,
                    sourceId: e.sourceId === oldId ? newId : e.sourceId,
                    targetId: e.targetId === oldId ? newId : e.targetId,
                });
            });
            return {
                ...s,
                nodes: newNodes,
                edges: newEdges,
                entryNodeId: s.entryNodeId === oldId ? newId : s.entryNodeId,
                selectedNodeIds: new Set([...s.selectedNodeIds].map(id => id === oldId ? newId : id)),
            };
        });
    }

    function updateNodeRender(patch: Partial<SkeletonNode['renderProperties']>) {
        const id = selectedNode?.id;
        if (!id) return;
        appState.update(s => {
            const n = s.nodes.get(id);
            if (!n) return s;
            markManualEdit(n);
            return {
                ...s,
                nodes: new Map(s.nodes).set(id, {
                    ...n,
                    renderProperties: { ...n.renderProperties, ...patch },
                }),
            };
        });
    }

    function updateNodeSemantics(patch: Partial<SkeletonNode['semantics']>) {
        const id = selectedNode?.id;
        if (!id) return;
        appState.update(s => {
            const n = s.nodes.get(id);
            if (!n) return s;
            markManualEdit(n);
            return {
                ...s,
                nodes: new Map(s.nodes).set(id, {
                    ...n,
                    semantics: { ...n.semantics, ...patch },
                }),
            };
        });
    }

    // Svelte-friendly: update semantics via LabelBuilder onchange
    function updateNodeSemanticsFromTemplate(tmpl: import('../../store/appState').LabelTemplate) {
        updateNodeSemantics({
            label: tmpl.template,
            name: tmpl.name,
            includeIndex: tmpl.includeIndex,
            includeParentName: tmpl.includeParentName,
            omitKeyNames: tmpl.omitKeyNames,
            includeDimensionName: tmpl.includeDimensionName,
            includeParentNames: tmpl.includeParentNames,
            includeParentDivisions: tmpl.includeParentDivisions,
        });
    }

    // ── Semantic name management ──────────────────────────────────────────────
    let newNameInput = $state('');

    function addSemanticName() {
        const trimmed = newNameInput.trim();
        if (!trimmed || renderConfig.semanticNames.includes(trimmed)) return;
        appState.update(s => ({
            ...s,
            renderConfig: {
                ...s.renderConfig,
                semanticNames: [...s.renderConfig.semanticNames, trimmed],
            },
        }));
        newNameInput = '';
    }

    // ── Semantic preview ──────────────────────────────────────────────────────
    function buildSemanticOutput(node: SkeletonNode): string {
        // 1. Resolve label template
        // Aggregate tokens resolve from node.data when available, else show [placeholder]
        let resolved = node.semantics.label;
        resolved = resolved.replace(/\{count\}/g, () => {
            const v = node.data['count'];
            return v !== undefined ? String(v) : '[count]';
        });
        resolved = resolved.replace(/\{subcount\}/g, () => {
            const v = node.data['subcount'];
            return v !== undefined ? String(v) : '[subcount]';
        });
        resolved = resolved.replace(/\{min:"([^"]+)"\}/g, (_: string, f: string) => `[min ${f}]`);
        resolved = resolved.replace(/\{max:"([^"]+)"\}/g, (_: string, f: string) => `[max ${f}]`);
        resolved = resolved.replace(/\{sum:"([^"]+)"\}/g, (_: string, f: string) => `[sum ${f}]`);
        resolved = resolved.replace(/\{avg:"([^"]+)"\}/g, (_: string, f: string) => `[avg ${f}]`);
        resolved = resolved.replace(/\{trend:"[^"]+":"[^"]+"\}/g, () => '[trend]');
        resolved = resolved.replace(/\{r2:"[^"]+":"[^"]+"\}/g, () => '[r²]');
        if (node.semantics.omitKeyNames) {
            resolved = resolved.replace(/\{key:"([^"]+)"\}/g, '');
        } else {
            resolved = resolved.replace(/\{key:"([^"]+)"\}/g, (_, key) => key);
        }
        resolved = resolved.replace(/\{value:"([^"]+)"\}/g, (_, key) => {
                const val = node.data[key];
                return val !== undefined ? String(val) : `[${key}]`;
            });

        // 2. Build name + group suffix
        const name = node.semantics.name || 'data point';
        const capitalized = name.charAt(0).toUpperCase() + name.slice(1);

        let groupSuffix = '';
        if (node.semantics.includeParentName || node.semantics.includeIndex) {
            const parentEdge = [...edges.values()].find(e => e.targetId === node.id);
            const parent = parentEdge ? nodes.get(parentEdge.sourceId) : null;
            if (parent) {
                if (node.semantics.includeIndex) {
                    const siblings = [...edges.values()]
                        .filter(e => e.sourceId === parent.id)
                        .map(e => nodes.get(e.targetId))
                        .filter((n): n is SkeletonNode => !!n);
                    const idx = siblings.findIndex(n => n.id === node.id) + 1;
                    groupSuffix += ` ${idx} of ${siblings.length}`;
                }
                if (node.semantics.includeParentName) {
                    groupSuffix += ` in ${parent.label}`;
                }
            }
        }

        const suffix = capitalized + groupSuffix + '.';
        return resolved ? `${resolved} ${suffix}` : suffix;
    }

    const semanticPreview = $derived(
        selectedNode ? buildSemanticOutput(selectedNode) : ''
    );

    // Derived helpers for LabelBuilder in the properties panel
    const nodeDataFields = $derived(
        selectedNode ? Object.keys(selectedNode.data) : []
    );
    const allDataFields = $derived(
        uploadedData?.[0] ? Object.keys(uploadedData[0]) : nodeDataFields
    );
    const numericalFields = $derived(
        schemaState?.dimensions.filter(d => d.type === 'numerical').map(d => d.key) ?? []
    );
    const selectedDim = $derived(
        selectedNode?.dimensionKey
            ? schemaState?.dimensions.find(d => d.key === selectedNode!.dimensionKey)
            : undefined
    );
    const leafParentDimensions = $derived(
        schemaState?.dimensions.filter(d => d.included).map(d => ({
            key: d.key,
            isReduced: d.divisionExtents === null,
            dimNoun: schemaState!.labelConfig.perDimension[d.key]?.name ?? 'group',
            hasDivisions: d.type === 'numerical' && (d.subdivisions ?? 1) > 1,
            divNoun: schemaState!.labelConfig.perDivision[d.key]?.name ?? 'subgroup',
            divTotal: d.subdivisions ?? 1,
        })) ?? []
    );
    // Build a LabelTemplate from the selected node's semantics for LabelBuilder
    const nodeAsLabelTemplate = $derived(
        selectedNode
            ? {
                template: selectedNode.semantics.label,
                name: selectedNode.semantics.name,
                includeIndex: selectedNode.semantics.includeIndex,
                includeParentName: selectedNode.semantics.includeParentName,
                omitKeyNames: selectedNode.semantics.omitKeyNames,
                includeDimensionName: selectedNode.semantics.includeDimensionName,
                includeParentNames: selectedNode.semantics.includeParentNames,
                includeParentDivisions: selectedNode.semantics.includeParentDivisions,
            }
            : null
    );
    // Node level for LabelBuilder nodeType
    const nodeLevelType = $derived((): 'level0' | 'level1' | 'level2' | 'level3' => {
        if (!selectedNode) return 'level3';
        const lvl = selectedNode.dnLevel;
        if (lvl === 0) return 'level0';
        if (lvl === 1) return 'level1';
        if (lvl === 2) return 'level2';
        return 'level3';
    });

    function setEntryNode(nodeId: string, makeEntry: boolean) {
        appState.update(s => ({
            ...s,
            entryNodeId: makeEntry ? nodeId : (s.entryNodeId === nodeId ? null : s.entryNodeId),
        }));
    }

    // ── Single edge updaters ──────────────────────────────────────────────────
    function updateEdge(patch: Partial<SkeletonEdge>) {
        const id = selectedEdge?.id;
        if (!id) return;
        appState.update(s => {
            const e = s.edges.get(id);
            if (!e) return s;
            // Mark manual edit if either endpoint belongs to a schema node
            const srcSchema = s.nodes.get(e.sourceId)?.source === 'schema';
            const tgtSchema = s.nodes.get(e.targetId)?.source === 'schema';
            const hasManual = srcSchema || tgtSchema ? true : s.hasManualNodeEdits;
            return { ...s, hasManualNodeEdits: hasManual, edges: new Map(s.edges).set(id, { ...e, ...patch }) };
        });
    }

    // ── Navigation rule names editor ─────────────────────────────────────────
    let navRuleInput = $state('');

    $effect(() => {
        const edge = selectedEdge;
        if (edge) {
            navRuleInput = (edge.navigationRuleNames ?? []).join(', ');
        }
    });

    function flushNavRuleNames(edgeId: string) {
        const names = navRuleInput.split(/[\s,]+/).map(s => s.trim()).filter(Boolean);
        appState.update(s => {
            const e = s.edges.get(edgeId);
            if (!e) return s;
            return { ...s, edges: new Map(s.edges).set(edgeId, { ...e, navigationRuleNames: names.length ? names : undefined }) };
        });
    }

    // ── Bulk operations ───────────────────────────────────────────────────────
    function applyBulkSemanticLabel() {
        const label = bulkSemanticLabel;
        const ids = [...selectedNodeIds];
        appState.update(s => {
            const newNodes = new Map(s.nodes);
            ids.forEach(id => {
                const n = newNodes.get(id);
                if (n) newNodes.set(id, { ...n, semantics: { ...n.semantics, label } });
            });
            return { ...s, nodes: newNodes };
        });
        applyMsg = `Applied to ${ids.length} node${ids.length !== 1 ? 's' : ''}.`;
    }

    function applyBulkEdgeDirection() {
        const dir = bulkEdgeDirection;
        const nodeIdSet = new Set(selectedNodeIds);
        let count = 0;
        appState.update(s => {
            const newEdges = new Map(s.edges);
            s.edges.forEach((e, eid) => {
                if (nodeIdSet.has(e.sourceId) || nodeIdSet.has(e.targetId)) {
                    newEdges.set(eid, { ...e, direction: dir });
                    count++;
                }
            });
            return { ...s, edges: newEdges };
        });
        applyMsg = `Applied to ${count} edge${count !== 1 ? 's' : ''}.`;
    }

    function applyBulkDirection() {
        const dir = bulkDirection;
        const ids = [...selectedEdgeIds];
        appState.update(s => {
            const newEdges = new Map(s.edges);
            ids.forEach(id => {
                const e = newEdges.get(id);
                if (e) newEdges.set(id, { ...e, direction: dir });
            });
            return { ...s, edges: newEdges };
        });
        applyMsg = `Applied to ${ids.length} edge${ids.length !== 1 ? 's' : ''}.`;
    }

    function navigateToNode(id: string) {
        appState.update(s => ({
            ...s,
            selectedNodeIds: new Set([id]),
            selectedEdgeIds: new Set(),
        }));
    }
</script>

<!-- Polite live region for Apply feedback -->
<div class="visually-hidden" aria-live="polite" aria-atomic="true">{applyMsg}</div>

<!-- ── EMPTY STATE ── -->
{#if selType === 'none'}
    <p class="panel-empty">Select a node or edge on the canvas to edit its properties.</p>

<!-- ── SINGLE NODE ── -->
{:else if selType === 'singleNode' && selectedNode}
    {@const node = selectedNode}
    {@const isEntry = node.id === entryNodeId}

    <!-- IDENTITY -->
    <section class="panel-section" aria-labelledby="section-identity">
        <h3 id="section-identity" class="section-heading">
            Identity
            {#if node.source}<span class="badge-source badge-source-{node.source}">{node.source}</span>{/if}
            {#if node.dnLevel !== undefined}<span class="badge-level">L{node.dnLevel}</span>{/if}
        </h3>

        <div class="field">
            <label for="node-label">Display label</label>
            <input
                id="node-label"
                type="text"
                value={node.label}
                oninput={(e) => updateNode({ label: e.currentTarget.value })}
            />
        </div>

        <div class="field">
            <label for="node-id">Node ID <span class="field-sub">(used in DN structure)</span></label>
            <input
                id="node-id"
                type="text"
                value={node.id}
                onblur={(e) => updateNodeId(node.id, e.currentTarget.value)}
                onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); updateNodeId(node.id, (e.target as HTMLInputElement).value); } }}
            />
        </div>

        <div class="field">
            <label for="node-render-id">Render ID <span class="field-sub">(links to DOM element; defaults to node ID)</span></label>
            <input
                id="node-render-id"
                type="text"
                placeholder={node.id}
                value={node.renderId ?? ''}
                oninput={(e) => updateNode({ renderId: e.currentTarget.value || undefined })}
            />
        </div>

        <div class="field field-inline">
            <label for="node-is-entry">
                Is Entry Node
                {#if isEntry}<span class="badge-entry" aria-label="(entry node)">★</span>{/if}
            </label>
            <input
                id="node-is-entry"
                type="checkbox"
                checked={isEntry}
                onchange={(e) => setEntryNode(node.id, e.currentTarget.checked)}
            />
        </div>

        <div class="field field-inline">
            <label for="node-is-cluster">Is Cluster</label>
            <input
                id="node-is-cluster"
                type="checkbox"
                checked={node.isCluster}
                onchange={(e) => updateNode({ isCluster: e.currentTarget.checked })}
            />
        </div>

        {#if node.isCluster}
            <div class="field">
                <label for="node-cluster-count">Cluster Count</label>
                <input
                    id="node-cluster-count"
                    type="number"
                    min="1"
                    step="1"
                    value={node.clusterCount ?? 2}
                    oninput={(e) => updateNode({ clusterCount: Math.max(1, parseInt(e.currentTarget.value, 10) || 2) })}
                />
            </div>
        {/if}
    </section>

    <!-- POSITION & SIZE -->
    <details class="panel-section">
        <summary class="section-heading">Position &amp; Size</summary>

        <div class="field-group">
            <fieldset class="unit-toggle">
                <legend>Coordinate unit</legend>
                <label class="radio-label">
                    <input type="radio" name="pos-unit" value="px" bind:group={posUnit} />
                    px
                </label>
                <label class="radio-label">
                    <input type="radio" name="pos-unit" value="%" bind:group={posUnit} />
                    %
                </label>
            </fieldset>

            <div class="field-pair">
                <div class="field">
                    <label for="node-x">X ({posUnit})</label>
                    <input
                        id="node-x"
                        type="number"
                        step={posUnit === '%' ? 0.1 : 1}
                        value={toDisplayCoord(node.x, 'x')}
                        oninput={(e) => updateNode({ x: fromDisplayCoord(parseFloat(e.currentTarget.value) || 0, 'x') })}
                    />
                </div>
                <div class="field">
                    <label for="node-y">Y ({posUnit})</label>
                    <input
                        id="node-y"
                        type="number"
                        step={posUnit === '%' ? 0.1 : 1}
                        value={toDisplayCoord(node.y, 'y')}
                        oninput={(e) => updateNode({ y: fromDisplayCoord(parseFloat(e.currentTarget.value) || 0, 'y') })}
                    />
                </div>
            </div>

            <div class="field-pair">
                <div class="field">
                    <label for="node-width">Width (px)</label>
                    <input
                        id="node-width"
                        type="number"
                        step="1"
                        value={Math.round(node.width)}
                        oninput={(e) => updateNode({ width: parseFloat(e.currentTarget.value) || 0 })}
                    />
                </div>
                <div class="field">
                    <label for="node-height">Height (px)</label>
                    <input
                        id="node-height"
                        type="number"
                        step="1"
                        value={Math.round(node.height)}
                        oninput={(e) => updateNode({ height: parseFloat(e.currentTarget.value) || 0 })}
                    />
                </div>
            </div>
        </div>
    </details>

    <!-- SEMANTICS -->
    <section class="panel-section" aria-labelledby="section-semantics">
        <h3 id="section-semantics" class="section-heading">Semantics</h3>

        {#if nodeAsLabelTemplate}
            <LabelBuilder
                nodeType={nodeLevelType()}
                value={nodeAsLabelTemplate}
                fields={allDataFields}
                sampleData={node.data}
                rawData={uploadedData ?? []}
                aggregateFields={numericalFields}
                trendXFields={allDataFields}
                dimensionKey={node.dimensionKey}
                hasDivisions={selectedDim ? (selectedDim.type === 'numerical' && (selectedDim.subdivisions ?? 1) > 1) : false}
                parentDimensions={nodeLevelType() === 'level3' ? leafParentDimensions : []}
                parentDimNoun={nodeLevelType() === 'level2' ? (schemaState?.labelConfig.perDimension[node.dimensionKey ?? '']?.name ?? 'group') : undefined}
                onchange={updateNodeSemanticsFromTemplate}
            />
        {/if}
    </section>

    <!-- DATA -->
    <section class="panel-section" aria-labelledby="section-data">
        <h3 id="section-data" class="section-heading">Data</h3>

        <ul class="kv-list" aria-label="Data properties">
            {#each dataEntries as entry, i (entry.id)}
                <li class="kv-row">
                    <label class="visually-hidden" for="data-key-{entry.id}">Key {i + 1}</label>
                    <input
                        id="data-key-{entry.id}"
                        type="text"
                        class="kv-input"
                        placeholder="key"
                        value={entry.key}
                        oninput={(e) => {
                            dataEntries[i] = { ...dataEntries[i], key: e.currentTarget.value };
                            flushDataEntries(node.id);
                        }}
                    />
                    <label class="visually-hidden" for="data-val-{entry.id}">Value {i + 1}</label>
                    <input
                        id="data-val-{entry.id}"
                        type="text"
                        class="kv-input"
                        placeholder="value"
                        value={entry.value}
                        oninput={(e) => {
                            dataEntries[i] = { ...dataEntries[i], value: e.currentTarget.value };
                            flushDataEntries(node.id);
                        }}
                    />
                    <button
                        class="btn-ghost btn-sm kv-delete"
                        type="button"
                        aria-label="Delete property {entry.key || String(i + 1)}"
                        onclick={() => {
                            dataEntries = dataEntries.filter((_, j) => j !== i);
                            flushDataEntries(node.id);
                        }}
                    >×</button>
                </li>
            {/each}
        </ul>

        <button
            class="btn-ghost btn-sm"
            type="button"
            onclick={() => { dataEntries = [...dataEntries, { id: crypto.randomUUID(), key: '', value: '' }]; }}
        >
            + Add property
        </button>
    </section>

    <!-- RENDERING -->
    <details class="panel-section" open={currentStep >= 3}>
        <summary class="section-heading">Rendering</summary>

        <div class="field">
            <label for="node-shape">Shape</label>
            <select
                id="node-shape"
                value={node.renderProperties.shape}
                onchange={(e) => updateNodeRender({ shape: e.currentTarget.value as SkeletonNode['renderProperties']['shape'] })}
            >
                <option value="rect">rect</option>
                <option value="ellipse">ellipse</option>
                <option value="custom">custom</option>
            </select>
        </div>

        <div class="field">
            <label for="node-rendering-strategy">Rendering strategy <span class="field-sub">(DN group rendering)</span></label>
            <select
                id="node-rendering-strategy"
                value={node.renderingStrategy ?? ''}
                onchange={(e) => updateNode({ renderingStrategy: (e.currentTarget.value || undefined) as SkeletonNode['renderingStrategy'] })}
            >
                <option value="">(none / inherited)</option>
                <option value="outlineEach">outlineEach</option>
                <option value="convexHull">convexHull</option>
                <option value="singleSquare">singleSquare</option>
                <option value="custom">custom</option>
            </select>
        </div>

        <div class="field field-inline">
            <label for="node-fill-enabled">Fill color</label>
            <div class="fill-row">
                <input
                    id="node-fill-enabled"
                    type="checkbox"
                    checked={node.renderProperties.fillEnabled}
                    onchange={(e) => updateNodeRender({ fillEnabled: e.currentTarget.checked })}
                    aria-label="Enable fill color"
                />
                <input
                    id="node-fill"
                    type="color"
                    disabled={!node.renderProperties.fillEnabled}
                    value={node.renderProperties.fill.startsWith('#') ? node.renderProperties.fill : '#f6f6f7'}
                    oninput={(e) => updateNodeRender({ fill: e.currentTarget.value })}
                    aria-label="Fill color"
                />
            </div>
        </div>

        <fieldset class="panel-fieldset">
            <legend class="fieldset-legend">Stroke</legend>

            <div class="field field-inline">
                <label for="node-stroke-color">Color</label>
                <input
                    id="node-stroke-color"
                    type="color"
                    value={node.renderProperties.strokeColor ?? '#000000'}
                    oninput={(e) => updateNodeRender({ strokeColor: e.currentTarget.value })}
                />
            </div>

            <div class="field">
                <label for="node-stroke-width">
                    Width (px)
                    <span class="value-hint" aria-hidden="true">{node.renderProperties.strokeWidth ?? 2}</span>
                </label>
                <input
                    id="node-stroke-width"
                    type="number"
                    min="0"
                    max="20"
                    step="0.5"
                    value={node.renderProperties.strokeWidth ?? 2}
                    oninput={(e) => updateNodeRender({ strokeWidth: parseFloat(e.currentTarget.value) || 0 })}
                />
            </div>

            <div class="field">
                <label for="node-stroke-dash">Dash pattern</label>
                <select
                    id="node-stroke-dash"
                    value={node.renderProperties.strokeDash ?? 'solid'}
                    onchange={(e) => updateNodeRender({ strokeDash: e.currentTarget.value as 'solid' | 'dashed' | 'dotted' })}
                >
                    <option value="solid">Solid</option>
                    <option value="dashed">Dashed</option>
                    <option value="dotted">Dotted</option>
                </select>
            </div>
        </fieldset>

        <div class="field">
            <label for="node-opacity">
                Opacity
                <span class="value-hint" aria-hidden="true">{node.renderProperties.opacity.toFixed(2)}</span>
            </label>
            <input
                id="node-opacity"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={node.renderProperties.opacity}
                oninput={(e) => updateNodeRender({ opacity: parseFloat(e.currentTarget.value) })}
            />
        </div>

        <div class="field">
            <label for="node-aria-role">Aria Role</label>
            <input
                id="node-aria-role"
                type="text"
                placeholder="img"
                value={node.renderProperties.ariaRole}
                oninput={(e) => updateNodeRender({ ariaRole: e.currentTarget.value })}
            />
        </div>

        <div class="field">
            <label for="node-custom-class">Custom CSS class</label>
            <input
                id="node-custom-class"
                type="text"
                value={node.renderProperties.customClass}
                oninput={(e) => updateNodeRender({ customClass: e.currentTarget.value })}
            />
        </div>
    </details>

<!-- ── SINGLE EDGE ── -->
{:else if selType === 'singleEdge' && selectedEdge}
    {@const edge = selectedEdge}
    {@const src = nodes.get(edge.sourceId)}
    {@const tgt = nodes.get(edge.targetId)}

    <section class="panel-section" aria-labelledby="section-edge">
        <h3 id="section-edge" class="section-heading">Edge Properties</h3>

        <div class="field">
            <label for="edge-label">Label</label>
            <input
                id="edge-label"
                type="text"
                value={edge.label}
                oninput={(e) => updateEdge({ label: e.currentTarget.value })}
            />
        </div>

        <div class="field">
            <label for="edge-direction">Direction</label>
            <select
                id="edge-direction"
                value={edge.direction}
                onchange={(e) => updateEdge({ direction: e.currentTarget.value as SkeletonEdge['direction'] })}
            >
                <option value="up">up</option>
                <option value="down">down</option>
                <option value="left">left</option>
                <option value="right">right</option>
                <option value="exit">exit</option>
                <option value="custom">custom</option>
            </select>
        </div>

        <div class="field">
            <label for="edge-nav-rules">Navigation rule names <span class="field-sub">(comma-separated, e.g. left, right)</span></label>
            <input
                id="edge-nav-rules"
                type="text"
                placeholder="e.g. left, right"
                value={navRuleInput}
                oninput={(e) => { navRuleInput = e.currentTarget.value; }}
                onblur={() => flushNavRuleNames(edge.id)}
                onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); flushNavRuleNames(edge.id); } }}
            />
        </div>

        <div class="field">
            <label for="edge-source">Source node</label>
            <input
                id="edge-source"
                type="text"
                value={src?.label ?? edge.sourceId}
                readonly
                aria-readonly="true"
            />
        </div>

        <div class="field">
            <label for="edge-target">Target node</label>
            <input
                id="edge-target"
                type="text"
                value={tgt?.label ?? edge.targetId}
                readonly
                aria-readonly="true"
            />
        </div>
    </section>

    <section class="panel-section" aria-labelledby="section-dn-props">
        <h3 id="section-dn-props" class="section-heading">DN Properties</h3>

        <ul class="kv-list" aria-label="DN properties">
            {#each dnPropEntries as entry, i (entry.id)}
                <li class="kv-row">
                    <label class="visually-hidden" for="dnp-key-{entry.id}">Key {i + 1}</label>
                    <input
                        id="dnp-key-{entry.id}"
                        type="text"
                        class="kv-input"
                        placeholder="key"
                        value={entry.key}
                        oninput={(e) => {
                            dnPropEntries[i] = { ...dnPropEntries[i], key: e.currentTarget.value };
                            flushDnPropEntries(edge.id);
                        }}
                    />
                    <label class="visually-hidden" for="dnp-val-{entry.id}">Value {i + 1}</label>
                    <input
                        id="dnp-val-{entry.id}"
                        type="text"
                        class="kv-input"
                        placeholder="value"
                        value={entry.value}
                        oninput={(e) => {
                            dnPropEntries[i] = { ...dnPropEntries[i], value: e.currentTarget.value };
                            flushDnPropEntries(edge.id);
                        }}
                    />
                    <button
                        class="btn-ghost btn-sm kv-delete"
                        type="button"
                        aria-label="Delete property {entry.key || String(i + 1)}"
                        onclick={() => {
                            dnPropEntries = dnPropEntries.filter((_, j) => j !== i);
                            flushDnPropEntries(edge.id);
                        }}
                    >×</button>
                </li>
            {/each}
        </ul>

        <button
            class="btn-ghost btn-sm"
            type="button"
            onclick={() => { dnPropEntries = [...dnPropEntries, { id: crypto.randomUUID(), key: '', value: '' }]; }}
        >
            + Add property
        </button>
    </section>

<!-- ── MULTIPLE NODES ── -->
{:else if selType === 'multiNode'}
    <section class="panel-section" aria-labelledby="section-multi-node">
        <h3 id="section-multi-node" class="section-heading">
            {selNodeCount} Nodes Selected
        </h3>

        <ul class="node-label-list" aria-label="Selected nodes — click to inspect individually">
            {#each selectedNodesList as node (node.id)}
                <li>
                    <button
                        class="btn-ghost btn-sm node-label-btn"
                        type="button"
                        onclick={() => navigateToNode(node.id)}
                    >
                        {node.label}
                        {#if node.id === entryNodeId}
                            <span class="badge-entry" aria-label="(entry node)">★</span>
                        {/if}
                    </button>
                </li>
            {/each}
        </ul>
    </section>

    <section class="panel-section" aria-labelledby="section-bulk-node">
        <h3 id="section-bulk-node" class="section-heading">Bulk Edit</h3>

        <div class="field">
            <label for="bulk-sem-label">Set semantic label for all</label>
            <textarea id="bulk-sem-label" rows="3" bind:value={bulkSemanticLabel}></textarea>
            <button class="btn-primary btn-sm" type="button" onclick={applyBulkSemanticLabel}>
                Apply
            </button>
        </div>

        <div class="field">
            <label for="bulk-edge-dir">Set direction for all connected edges</label>
            <select id="bulk-edge-dir" bind:value={bulkEdgeDirection}>
                <option value="up">up</option>
                <option value="down">down</option>
                <option value="left">left</option>
                <option value="right">right</option>
                <option value="exit">exit</option>
                <option value="custom">custom</option>
            </select>
            <button class="btn-primary btn-sm" type="button" onclick={applyBulkEdgeDirection}>
                Apply
            </button>
        </div>
    </section>

<!-- ── MULTIPLE EDGES ── -->
{:else if selType === 'multiEdge'}
    <section class="panel-section" aria-labelledby="section-multi-edge">
        <h3 id="section-multi-edge" class="section-heading">
            {selEdgeCount} Edges Selected
        </h3>

        <div class="field">
            <label for="bulk-direction">Set direction for all</label>
            <select id="bulk-direction" bind:value={bulkDirection}>
                <option value="up">up</option>
                <option value="down">down</option>
                <option value="left">left</option>
                <option value="right">right</option>
                <option value="exit">exit</option>
                <option value="custom">custom</option>
            </select>
            <button class="btn-primary btn-sm" type="button" onclick={applyBulkDirection}>
                Apply
            </button>
        </div>
    </section>
{/if}

<style>
    /* ── Section layout ── */
    .panel-section {
        padding: calc(var(--dn-space) * 1.5) 0;
        border-bottom: 1px solid var(--dn-border);
    }

    .panel-section:last-child {
        border-bottom: none;
    }

    .section-heading {
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--dn-text-muted);
        margin: 0 0 calc(var(--dn-space) * 1.25);
        padding: 0;
        cursor: default;
    }

    /* <details> summary resets */
    details > summary.section-heading {
        list-style: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: calc(var(--dn-space) * 0.5);
        user-select: none;
    }

    details > summary.section-heading::before {
        content: '▶';
        font-size: 0.6rem;
        transition: transform 0.15s;
        display: inline-block;
    }

    details[open] > summary.section-heading::before {
        transform: rotate(90deg);
    }

    details > summary::-webkit-details-marker {
        display: none;
    }

    /* ── Empty state ── */
    .panel-empty {
        margin: calc(var(--dn-space) * 3) 0;
        color: var(--dn-text-muted);
        font-size: 0.875rem;
        text-align: center;
        line-height: 1.6;
    }

    /* ── Field layouts ── */
    .field {
        display: flex;
        flex-direction: column;
        gap: calc(var(--dn-space) * 0.5);
        margin-bottom: calc(var(--dn-space) * 1.25);
    }

    .field:last-child {
        margin-bottom: 0;
    }

    /* Inline: label on left, control on right */
    .field.field-inline {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
    }

    .field.field-inline label {
        flex: 1;
    }

    .field-group {
        display: flex;
        flex-direction: column;
        gap: calc(var(--dn-space) * 1.25);
        margin-top: calc(var(--dn-space) * 1);
    }

    .field-pair {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: calc(var(--dn-space) * 1);
    }

    /* ── Label styling ── */
    label {
        font-size: 0.8125rem;
        font-weight: 500;
        color: var(--dn-text);
    }

    /* ── Input / select / textarea base ── */
    input[type='text'],
    input[type='number'],
    select,
    textarea {
        font-family: var(--dn-font);
        font-size: 0.875rem;
        color: var(--dn-text);
        background: var(--dn-bg);
        border: 1px solid var(--dn-border);
        border-radius: calc(var(--dn-radius) / 2);
        padding: calc(var(--dn-space) * 0.625) calc(var(--dn-space) * 1);
        width: 100%;
        min-height: 36px;
        transition: border-color 0.15s;
    }

    input[type='text']:focus,
    input[type='number']:focus,
    select:focus,
    textarea:focus {
        border-color: var(--dn-accent);
        outline: none;
    }

    input[readonly] {
        background: var(--dn-surface);
        color: var(--dn-text-muted);
        cursor: default;
    }

    textarea {
        resize: vertical;
        min-height: 72px;
    }

    input[type='range'] {
        width: 100%;
        accent-color: var(--dn-accent);
        cursor: pointer;
    }

    input[type='color'] {
        width: 40px;
        height: 36px;
        padding: 2px;
        border: 1px solid var(--dn-border);
        border-radius: calc(var(--dn-radius) / 2);
        cursor: pointer;
        background: var(--dn-bg);
        flex-shrink: 0;
    }

    input[type='color']:disabled {
        opacity: 0.35;
        cursor: not-allowed;
    }

    .fill-row {
        display: flex;
        align-items: center;
        gap: calc(var(--dn-space) * 0.75);
    }

    input[type='checkbox'] {
        width: 18px;
        height: 18px;
        accent-color: var(--dn-accent);
        cursor: pointer;
        flex-shrink: 0;
    }

    /* ── Unit toggle (radio group) ── */
    .unit-toggle {
        border: none;
        padding: 0;
        margin: 0;
        display: flex;
        align-items: center;
        gap: calc(var(--dn-space) * 1.5);
    }

    .unit-toggle legend {
        font-size: 0.8125rem;
        font-weight: 500;
        color: var(--dn-text);
        float: left;
        margin-right: calc(var(--dn-space) * 1);
    }

    .radio-label {
        display: flex;
        align-items: center;
        gap: calc(var(--dn-space) * 0.5);
        font-size: 0.875rem;
        font-weight: 400;
        cursor: pointer;
    }

    .radio-label input[type='radio'] {
        accent-color: var(--dn-accent);
        cursor: pointer;
    }

    /* ── KV editor ── */
    .kv-list {
        list-style: none;
        padding: 0;
        margin: 0 0 calc(var(--dn-space) * 1);
        display: flex;
        flex-direction: column;
        gap: calc(var(--dn-space) * 0.75);
    }

    .kv-row {
        display: flex;
        gap: calc(var(--dn-space) * 0.5);
        align-items: center;
    }

    .kv-input {
        flex: 1;
        min-width: 0;
    }

    .kv-delete {
        flex-shrink: 0;
        min-width: 32px;
        min-height: 32px;
        padding: 0;
        font-size: 1rem;
        line-height: 1;
        color: var(--dn-text-muted);
    }

    .kv-delete:hover {
        color: var(--dn-text);
    }

    /* ── Entry node badge ── */
    .badge-entry {
        color: var(--dn-accent);
        font-size: 0.875rem;
        margin-left: calc(var(--dn-space) * 0.5);
    }

    /* ── Source / level badges ── */
    .badge-source,
    .badge-level {
        display: inline-block;
        font-size: 0.65rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        padding: 1px 5px;
        border-radius: 3px;
        margin-left: calc(var(--dn-space) * 0.5);
        vertical-align: middle;
        line-height: 1.6;
    }

    .badge-source-schema {
        background: color-mix(in srgb, var(--dn-accent) 15%, transparent);
        color: var(--dn-accent);
        border: 1px solid color-mix(in srgb, var(--dn-accent) 30%, transparent);
    }

    .badge-source-manual {
        background: color-mix(in srgb, var(--dn-text-muted) 12%, transparent);
        color: var(--dn-text-muted);
        border: 1px solid color-mix(in srgb, var(--dn-text-muted) 25%, transparent);
    }

    .badge-level {
        background: var(--dn-surface);
        color: var(--dn-text-muted);
        border: 1px solid var(--dn-border);
    }

    /* ── Field sub-label ── */
    .field-sub {
        font-size: 0.7rem;
        font-weight: 400;
        color: var(--dn-text-muted);
        margin-left: calc(var(--dn-space) * 0.25);
    }

    /* ── AI Suggest hint ── */
    .field-hint {
        margin: 0;
        font-size: 0.75rem;
        color: var(--dn-text-muted);
        line-height: 1.4;
    }

    /* ── Value hint (inline) ── */
    .value-hint {
        font-weight: 400;
        color: var(--dn-text-muted);
        font-family: var(--dn-font-mono);
        font-size: 0.75rem;
        margin-left: calc(var(--dn-space) * 0.5);
    }

    /* ── Node label list (multi-select) ── */
    .node-label-list {
        list-style: none;
        padding: 0;
        margin: 0 0 calc(var(--dn-space) * 1);
        max-height: 160px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: calc(var(--dn-space) * 0.5);
        border: 1px solid var(--dn-border);
        border-radius: calc(var(--dn-radius) / 2);
        padding: calc(var(--dn-space) * 0.75);
    }

    .node-label-btn {
        width: 100%;
        justify-content: flex-start;
        text-align: left;
        min-height: 32px;
        padding: calc(var(--dn-space) * 0.375) calc(var(--dn-space) * 0.75);
        font-size: 0.8125rem;
    }

    /* ── Visually hidden (from global.css pattern) ── */
    .visually-hidden {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
    }

    /* ── Name row (select + new input + add button) ── */
    .name-row {
        display: flex;
        gap: calc(var(--dn-space) * 0.5);
        align-items: center;
    }

    .name-row select {
        flex: 1;
        min-width: 0;
    }

    .name-new-input {
        flex: 1;
        min-width: 0;
    }

    /* ── Panel fieldset (group info) ── */
    .panel-fieldset {
        border: 1px solid var(--dn-border);
        border-radius: calc(var(--dn-radius) / 2);
        padding: calc(var(--dn-space) * 1) calc(var(--dn-space) * 1.25);
        margin: 0 0 calc(var(--dn-space) * 1.25);
    }

    .fieldset-legend {
        font-size: 0.8125rem;
        font-weight: 500;
        color: var(--dn-text-muted);
        padding: 0 calc(var(--dn-space) * 0.5);
    }

    .panel-fieldset .field {
        margin-bottom: calc(var(--dn-space) * 0.75);
    }

    .panel-fieldset .field:last-child {
        margin-bottom: 0;
    }

    /* ── Semantic preview ── */
    .sem-preview {
        background: var(--dn-surface);
        border: 1px solid var(--dn-border);
        border-radius: calc(var(--dn-radius) / 2);
        padding: calc(var(--dn-space) * 1) calc(var(--dn-space) * 1.25);
        margin-bottom: calc(var(--dn-space) * 1.25);
    }

    .sem-preview-text {
        margin: calc(var(--dn-space) * 0.375) 0 0;
        font-size: 0.875rem;
        color: var(--dn-text);
        line-height: 1.5;
        font-style: italic;
    }

    code {
        font-family: var(--dn-font-mono);
        font-size: 0.75rem;
        background: var(--dn-surface);
        border: 1px solid var(--dn-border);
        border-radius: 3px;
        padding: 1px 4px;
    }
</style>
