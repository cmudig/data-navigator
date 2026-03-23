<script lang="ts">
    import { get } from 'svelte/store';
    import { untrack } from 'svelte';
    import { appState } from '../../store/appState';
    import { logAction, logActionDebounced } from '../../store/historyStore';
    import type { SkeletonNode, SkeletonEdge } from '../../store/types';
    import type { RenderConfig, SchemaState, ToolOptions } from '../../store/appState';
    import { defaultRenderProperties } from '../../store/nodeFactory';

    // ── Callback props (Svelte 5 style) ───────────────────────────────────────
    type Props = {
        selectNodes?: (ids: string[]) => void;
        selectEdges?: (ids: string[]) => void;
        nodesMoved?: (moves: Array<{ nodeId: string; x: number; y: number }>) => void;
        readonly?: boolean;
    };
    const { selectNodes, selectEdges, nodesMoved, readonly = false }: Props = $props();

    // ── DOM refs ──────────────────────────────────────────────────────────────
    let svgEl: SVGSVGElement | undefined = $state();
    let sceneEl: SVGGElement | undefined = $state();

    // ── SVG element pixel dimensions (bound via bind:clientWidth/Height) ──────
    let svgW = $state(0);
    let svgH = $state(0);

    // ── View transform (in SVG viewBox coordinates) ───────────────────────────
    let tx = $state(0);
    let ty = $state(0);
    let scale = $state(1);

    // ── Interaction mode ──────────────────────────────────────────────────────
    type Mode = 'select' | 'addNode' | 'addEdge' | 'pan';
    let mode = $state<Mode>('select');

    // ── Pan state ─────────────────────────────────────────────────────────────
    let isPanning = $state(false);
    let spaceDown = $state(false);
    let panStartClient = $state({ x: 0, y: 0 });
    let panStartTransform = $state({ tx: 0, ty: 0 });

    // ── Zoom input ────────────────────────────────────────────────────────────
    let zoomInput = $state(100);

    // ── Drag state ────────────────────────────────────────────────────────────
    let drag = $state<{
        nodeId: string;
        startClientX: number;
        startClientY: number;
        startNodeX: number;
        startNodeY: number;
        moved: boolean;
    } | null>(null);

    // ── Resize state ──────────────────────────────────────────────────────────
    type HandleDir = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
    let resize = $state<{
        nodeId: string;
        dir: HandleDir;
        startClientX: number;
        startClientY: number;
        startNodeX: number;
        startNodeY: number;
        startNodeW: number;
        startNodeH: number;
        moved: boolean;
    } | null>(null);

    // ── Lasso state ───────────────────────────────────────────────────────────
    let lassoRect = $state<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
    let lassoAdditive = $state(false); // true when Cmd/Ctrl held at lasso start
    let activeTouchId = $state<number | null>(null);

    // ── Select filter ─────────────────────────────────────────────────────────
    let selectFilter = $state<'nodes' | 'edges'>('nodes');

    // ── Edge draw state ───────────────────────────────────────────────────────
    let edgeSourceId = $state<string | null>(null);
    let addEdgePairs = $state(true);
    let edgeCursorX = $state(0);
    let edgeCursorY = $state(0);

    // ── Keyboard focus ────────────────────────────────────────────────────────
    let focusedNodeIdx = $state(-1);

    // ── Live region ───────────────────────────────────────────────────────────
    let liveMsg = $state('');

    // ── Store sync ────────────────────────────────────────────────────────────
    const initial = get(appState);
    let nodes = $state<Map<string, SkeletonNode>>(initial.nodes);
    let edges = $state<Map<string, SkeletonEdge>>(initial.edges);
    let selectedNodeIds = $state<Set<string>>(initial.selectedNodeIds);
    let selectedEdgeIds = $state<Set<string>>(initial.selectedEdgeIds);
    let entryNodeId = $state<string | null>(initial.entryNodeId);
    let hoveredNodeId = $state<string | null>(initial.hoveredNodeId);
    let hoveredEdgeId = $state<string | null>(initial.hoveredEdgeId);
    let imageDataUrl = $state<string | null>(initial.imageDataUrl);
    let imageWidth = $state<number | null>(initial.imageWidth);
    let imageHeight = $state<number | null>(initial.imageHeight);
    let renderConfig = $state<RenderConfig>(initial.renderConfig);
    let toolOptions = $state<ToolOptions>(initial.toolOptions);
    let schemaState = $state<SchemaState>(initial.schemaState);
    let uploadedData = $state.raw<Record<string, unknown>[] | null>(initial.uploadedData);

    $effect(() => {
        return appState.subscribe(s => {
            nodes = s.nodes;
            edges = s.edges;
            selectedNodeIds = s.selectedNodeIds;
            selectedEdgeIds = s.selectedEdgeIds;
            entryNodeId = s.entryNodeId;
            hoveredNodeId = s.hoveredNodeId;
            hoveredEdgeId = s.hoveredEdgeId;
            imageDataUrl = s.imageDataUrl;
            imageWidth = s.imageWidth;
            imageHeight = s.imageHeight;
            renderConfig = s.renderConfig;
            toolOptions = s.toolOptions;
            schemaState = s.schemaState;
            if (s.uploadedData !== uploadedData) uploadedData = s.uploadedData;
        });
    });

    // ── Derived ───────────────────────────────────────────────────────────────
    const vbW = $derived(imageWidth ?? 1200);
    const vbH = $derived(imageHeight ?? 800);
    // Use the SVG element's actual pixel dimensions as the viewBox so the
    // coordinate system is always 1:1 with CSS pixels. This eliminates the
    // xMidYMid centering offset that shifts canvas content when the element resizes.
    const viewBox = $derived(
        svgW > 0 && svgH > 0 ? `0 0 ${svgW} ${svgH}` : `0 0 ${vbW} ${vbH}`
    );
    const nodeList = $derived([...nodes.values()]);

    // ── Tool options derivations ──────────────────────────────────────────────
    const isSchemaMode = $derived(
        uploadedData !== null && schemaState.dimensions.some(d => d.included)
    );

    // Derive unique edge types from schema navigation rules (when in schema mode)
    const schemaEdgeTypes = $derived.by((): string[] => {
        if (!isSchemaMode) return [];
        const seen = new Set<string>();
        const types: string[] = [];
        const add = (s: string) => { if (s && !seen.has(s)) { seen.add(s); types.push(s); } };
        schemaState.dimensions.filter(d => d.included).forEach(d => {
            add(d.drillInName);
            add(d.drillOutName);
            add(d.forwardName);
            add(d.backwardName);
        });
        add(schemaState.level1NavForwardName);
        add(schemaState.level1NavBackwardName);
        return types;
    });

    // Compute which schema nodes are hidden by level filters
    const hiddenNodeIds = $derived.by((): Set<string> => {
        const hidden = new Set<string>();
        const makeDimNodeId = (key: string) => '_' + ('dim_' + key).replace(/[^a-zA-Z0-9_-]+/g, '_');
        const level1Ids = new Set(schemaState.dimensions.filter(d => d.included).map(d => makeDimNodeId(d.key)));
        const level0Id = schemaState.level0Enabled ? schemaState.level0Id : null;
        const level2Ids = new Set(schemaState.dimensions.flatMap(d => d.divisions.map(div => div.id)));
        nodes.forEach((node, id) => {
            if (!toolOptions.showAllNodes) { hidden.add(id); return; }
            if (node.source !== 'schema') return;
            if (!isSchemaMode) return;
            if (id === level0Id) {
                if (!toolOptions.showLevel0Node) hidden.add(id);
            } else if (level1Ids.has(id)) {
                if (!toolOptions.showLevel1Nodes) hidden.add(id);
            } else if (level2Ids.has(id)) {
                if (!toolOptions.showLevel2Nodes) hidden.add(id);
            } else {
                if (!toolOptions.showLevel3Nodes) hidden.add(id);
            }
        });
        return hidden;
    });

    // Compute backfill color per node (manual nodes use nodeBackfillColor; schema nodes by level)
    const nodeBackfillColorMap = $derived.by((): Map<string, string> => {
        const map = new Map<string, string>();
        const makeDimNodeId = (key: string) => '_' + ('dim_' + key).replace(/[^a-zA-Z0-9_-]+/g, '_');
        const level1Ids = new Set(schemaState.dimensions.filter(d => d.included).map(d => makeDimNodeId(d.key)));
        const level0Id = schemaState.level0Enabled ? schemaState.level0Id : null;
        const level2Ids = new Set(schemaState.dimensions.flatMap(d => d.divisions.map(div => div.id)));
        nodes.forEach((node, id) => {
            if (node.source !== 'schema') {
                map.set(id, toolOptions.nodeBackfillColor);
                return;
            }
            if (!isSchemaMode) return;
            if (id === level0Id) {
                map.set(id, toolOptions.level0BackfillColor);
            } else if (level1Ids.has(id)) {
                map.set(id, toolOptions.level1BackfillColor);
            } else if (level2Ids.has(id)) {
                map.set(id, toolOptions.level2BackfillColor);
            } else {
                map.set(id, toolOptions.level3BackfillColor);
            }
        });
        return map;
    });

    // Compute which edges have a reverse-direction counterpart (for bezier curves)
    const pairedEdgeIds = $derived.by((): Set<string> => {
        const paired = new Set<string>();
        const reverseKey = new Map<string, string>();
        edges.forEach((edge) => {
            reverseKey.set(`${edge.targetId}→${edge.sourceId}`, edge.id);
        });
        edges.forEach((edge) => {
            if (reverseKey.has(`${edge.sourceId}→${edge.targetId}`)) {
                paired.add(edge.id);
            }
        });
        return paired;
    });

    // Compute which edges are hidden
    const hiddenEdgeIds = $derived.by((): Set<string> => {
        const hidden = new Set<string>();
        edges.forEach((edge, id) => {
            if (!toolOptions.showEdges) { hidden.add(id); return; }
            if (edge.label && toolOptions.hiddenEdgeTypes.includes(edge.label)) { hidden.add(id); return; }
            if (hiddenNodeIds.has(edge.sourceId) || hiddenNodeIds.has(edge.targetId)) { hidden.add(id); return; }
        });
        return hidden;
    });

    // ── Tool options helpers ──────────────────────────────────────────────────
    function setToolOption<K extends keyof ToolOptions>(key: K, value: ToolOptions[K]) {
        appState.update(s => {
            const updated: ToolOptions = { ...s.toolOptions, [key]: value };
            // When changing the master node backfill, cascade to any level that hasn't diverged
            if (key === 'nodeBackfillColor') {
                const prev = s.toolOptions.nodeBackfillColor;
                const next = value as string;
                const levelKeys = ['level0BackfillColor', 'level1BackfillColor', 'level2BackfillColor', 'level3BackfillColor'] as const;
                for (const lk of levelKeys) {
                    if (s.toolOptions[lk] === prev) updated[lk] = next;
                }
            }
            return { ...s, toolOptions: updated };
        });
        if (typeof value === 'boolean') {
            logAction('Updated display options');
        } else {
            logActionDebounced('Updated display options');
        }
    }

    function toggleEdgeType(type: string) {
        appState.update(s => {
            const hidden = s.toolOptions.hiddenEdgeTypes;
            const next = hidden.includes(type) ? hidden.filter(t => t !== type) : [...hidden, type];
            return { ...s, toolOptions: { ...s.toolOptions, hiddenEdgeTypes: next } };
        });
    }

    function setEdgeTypeColor(type: string, color: string) {
        appState.update(s => ({
            ...s,
            toolOptions: {
                ...s.toolOptions,
                edgeTypeColors: { ...s.toolOptions.edgeTypeColors, [type]: color }
            }
        }));
    }


    // ── Coordinate helpers ────────────────────────────────────────────────────

    function clientToScene(clientX: number, clientY: number): { x: number; y: number } {
        if (!svgEl || !sceneEl) return { x: 0, y: 0 };
        const pt = svgEl.createSVGPoint();
        pt.x = clientX;
        pt.y = clientY;
        const ctm = sceneEl.getScreenCTM();
        if (!ctm) return { x: 0, y: 0 };
        const r = pt.matrixTransform(ctm.inverse());
        return { x: r.x, y: r.y };
    }

    /** Convert mouse event to scene (image-space) coordinates. */
    function mouseToScene(e: MouseEvent): { x: number; y: number } {
        return clientToScene(e.clientX, e.clientY);
    }

    /** Convert mouse event to SVG viewBox coordinates. */
    function mouseToSVGViewBox(e: MouseEvent): { x: number; y: number } {
        if (!svgEl) return { x: 0, y: 0 };
        const pt = svgEl.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const ctm = svgEl.getScreenCTM();
        if (!ctm) return { x: 0, y: 0 };
        const r = pt.matrixTransform(ctm.inverse());
        return { x: r.x, y: r.y };
    }

    function nodeCenter(node: SkeletonNode) {
        return { x: node.x + node.width / 2, y: node.y + node.height / 2 };
    }

    function getHandlePositions(node: SkeletonNode): Array<{ dir: HandleDir; x: number; y: number }> {
        const { x, y, width, height } = node;
        const mx = x + width / 2;
        const my = y + height / 2;
        const r = x + width;
        const b = y + height;
        return [
            { dir: 'nw', x, y },
            { dir: 'n',  x: mx, y },
            { dir: 'ne', x: r, y },
            { dir: 'e',  x: r, y: my },
            { dir: 'se', x: r, y: b },
            { dir: 's',  x: mx, y: b },
            { dir: 'sw', x, y: b },
            { dir: 'w',  x, y: my },
        ];
    }

    function rectsOverlap(
        ax: number, ay: number, aw: number, ah: number,
        bx: number, by: number, bw: number, bh: number,
    ): boolean {
        return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
    }

    // ── Store mutators ────────────────────────────────────────────────────────

    function setSelection(nodeIds: string[], edgeIds: string[]) {
        appState.update(s => ({
            ...s,
            selectedNodeIds: new Set(nodeIds),
            selectedEdgeIds: new Set(edgeIds),
        }));
        selectNodes?.(nodeIds);
        selectEdges?.(edgeIds);
    }

    function setHoveredNode(id: string | null) {
        appState.update(s => ({ ...s, hoveredNodeId: id }));
    }

    function setHoveredEdge(id: string | null) {
        appState.update(s => ({ ...s, hoveredEdgeId: id }));
    }

    // Keyboard focus → hover: sync focusedNodeIdx to shared hoveredNodeId.
    // Guard reads hoveredNodeId via untrack so it doesn't become a reactive dependency —
    // otherwise the effect would loop: write hoveredNodeId → re-run → write again.
    $effect(() => {
        const id = focusedNodeIdx >= 0 && focusedNodeIdx < nodeList.length
            ? nodeList[focusedNodeIdx].id
            : null;
        if (id !== untrack(() => hoveredNodeId)) setHoveredNode(id);
    });

    // ── Add node ──────────────────────────────────────────────────────────────

    function addNodeAt(pt: { x: number; y: number }) {
        const id = crypto.randomUUID();
        const isFirst = nodes.size === 0;
        const node: SkeletonNode = {
            id,
            label: `Node ${nodes.size + 1}`,
            x: pt.x - 60,
            y: pt.y - 30,
            width: 120,
            height: 60,
            isEntry: isFirst,
            isCluster: false,
            source: 'manual',
            semantics: { label: `Node ${nodes.size + 1}`, name: 'data point', includeParentName: false, includeIndex: false },
            data: {},
            renderProperties: defaultRenderProperties(),
        };
        appState.update(s => ({
            ...s,
            nodes: new Map(s.nodes).set(id, node),
            entryNodeId: isFirst ? id : s.entryNodeId,
        }));
        logAction('Added node');
        setSelection([id], []);
        mode = 'select';
    }

    // ── Add edge ──────────────────────────────────────────────────────────────

    function addEdgeBetween(sourceId: string, targetId: string) {
        appState.update(s => {
            const newEdges = new Map(s.edges);
            const fwdId = crypto.randomUUID();
            newEdges.set(fwdId, { id: fwdId, sourceId, targetId, direction: 'down', label: '', dnProperties: {} });
            if (addEdgePairs) {
                const bwdId = crypto.randomUUID();
                newEdges.set(bwdId, { id: bwdId, sourceId: targetId, targetId: sourceId, direction: 'up', label: '', dnProperties: {} });
            }
            return { ...s, edges: newEdges };
        });
        logAction(addEdgePairs ? 'Added edge pair' : 'Added edge');
        edgeSourceId = null;
        mode = 'select';
    }

    // ── Delete selection ──────────────────────────────────────────────────────

    function deleteSelection() {
        const nodeIds = [...selectedNodeIds];
        const edgeIds = [...selectedEdgeIds];
        const connectedEdgeIds = [...edges.values()]
            .filter(e => selectedNodeIds.has(e.sourceId) || selectedNodeIds.has(e.targetId))
            .map(e => e.id);
        const allEdgeIds = new Set([...edgeIds, ...connectedEdgeIds]);
        if (nodeIds.length === 0 && allEdgeIds.size === 0) return;

        appState.update(s => {
            const newNodes = new Map(s.nodes);
            nodeIds.forEach(id => newNodes.delete(id));
            const newEdges = new Map(s.edges);
            allEdgeIds.forEach(id => newEdges.delete(id));
            let newEntryId = s.entryNodeId;
            if (newEntryId && selectedNodeIds.has(newEntryId)) {
                newEntryId = newNodes.size > 0 ? [...newNodes.keys()][0] : null;
            }
            return {
                ...s,
                nodes: newNodes,
                edges: newEdges,
                selectedNodeIds: new Set<string>(),
                selectedEdgeIds: new Set<string>(),
                entryNodeId: newEntryId,
            };
        });
        logAction(`Deleted ${nodeIds.length} node(s) and ${allEdgeIds.size} edge(s)`);
        liveMsg = `Deleted ${nodeIds.length} node(s) and ${allEdgeIds.size} edge(s).`;
        selectNodes?.([]);
        selectEdges?.([]);
    }

    // ── Lasso commit ──────────────────────────────────────────────────────────

    function commitLasso() {
        if (!lassoRect) return;
        const lx = Math.min(lassoRect.x0, lassoRect.x1);
        const ly = Math.min(lassoRect.y0, lassoRect.y1);
        const lw = Math.abs(lassoRect.x1 - lassoRect.x0);
        const lh = Math.abs(lassoRect.y1 - lassoRect.y0);
        if (lw <= 2 && lh <= 2) {
            // Click without drag on empty canvas → deselect all
            setSelection([], []);
            focusedNodeIdx = -1;
        } else if (selectFilter === 'nodes') {
            const hitNodeIds = nodeList
                .filter(n => rectsOverlap(lx, ly, lw, lh, n.x, n.y, n.width, n.height))
                .map(n => n.id);
            const hitNodeSet = new Set(hitNodeIds);
            const hitEdgeIds = [...edges.values()]
                .filter(e => hitNodeSet.has(e.sourceId) && hitNodeSet.has(e.targetId))
                .map(e => e.id);

            if (lassoAdditive) {
                const newNodeIds = hitNodeIds.filter(id => !selectedNodeIds.has(id));
                if (newNodeIds.length > 0) {
                    const merged = new Set([...selectedNodeIds, ...hitNodeIds]);
                    const mergedEdges = new Set([...selectedEdgeIds, ...hitEdgeIds]);
                    setSelection([...merged], [...mergedEdges]);
                    liveMsg = `Added ${newNodeIds.length} node(s) to selection.`;
                } else {
                    const remaining = [...selectedNodeIds].filter(id => !hitNodeSet.has(id));
                    const removedEdgeSet = new Set(hitEdgeIds);
                    const remainingEdges = [...selectedEdgeIds].filter(id => !removedEdgeSet.has(id));
                    setSelection(remaining, remainingEdges);
                    liveMsg = `Removed ${hitNodeIds.length} node(s) from selection.`;
                }
            } else {
                setSelection(hitNodeIds, hitEdgeIds);
                liveMsg = `Selected ${hitNodeIds.length} node(s) and ${hitEdgeIds.length} edge(s).`;
            }
        } else {
            // Edge filter: select edges whose midpoint falls in lasso rect
            const hitEdgeIds = [...edges.values()]
                .filter(e => {
                    const src = nodes.get(e.sourceId);
                    const tgt = nodes.get(e.targetId);
                    if (!src || !tgt) return false;
                    const mx = (src.x + src.width / 2 + tgt.x + tgt.width / 2) / 2;
                    const my = (src.y + src.height / 2 + tgt.y + tgt.height / 2) / 2;
                    return mx >= lx && mx <= lx + lw && my >= ly && my <= ly + lh;
                })
                .map(e => e.id);
            const hitEdgeSet = new Set(hitEdgeIds);

            if (lassoAdditive) {
                const newEdgeIds = hitEdgeIds.filter(id => !selectedEdgeIds.has(id));
                if (newEdgeIds.length > 0) {
                    const merged = new Set([...selectedEdgeIds, ...hitEdgeIds]);
                    setSelection([...selectedNodeIds], [...merged]);
                    liveMsg = `Added ${newEdgeIds.length} edge(s) to selection.`;
                } else {
                    const remaining = [...selectedEdgeIds].filter(id => !hitEdgeSet.has(id));
                    setSelection([...selectedNodeIds], remaining);
                    liveMsg = `Removed ${hitEdgeIds.length} edge(s) from selection.`;
                }
            } else {
                setSelection([], hitEdgeIds);
                liveMsg = `Selected ${hitEdgeIds.length} edge(s).`;
            }
        }
        lassoRect = null;
        lassoAdditive = false;
    }

    // ── SVG mouse events ──────────────────────────────────────────────────────

    function onSvgMousedown(e: MouseEvent) {
        // Middle mouse, space+left, or pan mode = pan
        if (e.button === 1 || (e.button === 0 && spaceDown) || (e.button === 0 && mode === 'pan')) {
            isPanning = true;
            panStartClient = { x: e.clientX, y: e.clientY };
            panStartTransform = { tx, ty };
            e.preventDefault();
            return;
        }
        if (e.button !== 0) return;

        // Left click on empty canvas (nodes/edges stop propagation)
        if (mode === 'addNode') {
            addNodeAt(mouseToScene(e));
        } else if (mode === 'addEdge' && edgeSourceId) {
            edgeSourceId = null;
            mode = 'select';
        } else if (mode === 'select') {
            // Start a potential lasso; deselect fires in commitLasso if no drag occurred
            const pt = mouseToScene(e);
            lassoRect = { x0: pt.x, y0: pt.y, x1: pt.x, y1: pt.y };
            lassoAdditive = e.metaKey || e.ctrlKey;
        }
    }

    function onSvgMousemove(e: MouseEvent) {
        if (isPanning) {
            if (!svgEl) return;
            const ctm = svgEl.getScreenCTM();
            if (!ctm) return;
            // ctm.a = screen px per SVG viewBox px
            tx = panStartTransform.tx + (e.clientX - panStartClient.x) / ctm.a;
            ty = panStartTransform.ty + (e.clientY - panStartClient.y) / ctm.d;
            return;
        }

        if (lassoRect) {
            const pt = mouseToScene(e);
            lassoRect = { ...lassoRect, x1: pt.x, y1: pt.y };
            return;
        }

        if (resize) {
            if (!svgEl) return;
            const ctm = svgEl.getScreenCTM();
            if (!ctm) return;
            const dx = (e.clientX - resize.startClientX) / ctm.a / scale;
            const dy = (e.clientY - resize.startClientY) / ctm.d / scale;
            const MIN = 20;
            let nx = resize.startNodeX, ny = resize.startNodeY;
            let nw = resize.startNodeW, nh = resize.startNodeH;
            // West handles: move x, shrink width
            if (resize.dir === 'nw' || resize.dir === 'sw' || resize.dir === 'w') {
                nw = Math.max(MIN, resize.startNodeW - dx);
                nx = resize.startNodeX + resize.startNodeW - nw;
            }
            // East handles: grow width
            if (resize.dir === 'ne' || resize.dir === 'se' || resize.dir === 'e') {
                nw = Math.max(MIN, resize.startNodeW + dx);
            }
            // North handles: move y, shrink height
            if (resize.dir === 'nw' || resize.dir === 'n' || resize.dir === 'ne') {
                nh = Math.max(MIN, resize.startNodeH - dy);
                ny = resize.startNodeY + resize.startNodeH - nh;
            }
            // South handles: grow height
            if (resize.dir === 'sw' || resize.dir === 's' || resize.dir === 'se') {
                nh = Math.max(MIN, resize.startNodeH + dy);
            }
            resize.moved = true;
            appState.update(s => {
                const n = s.nodes.get(resize!.nodeId);
                if (!n) return s;
                return { ...s, nodes: new Map(s.nodes).set(resize!.nodeId, { ...n, x: nx, y: ny, width: nw, height: nh }) };
            });
            return;
        }

        if (drag) {
            const dx = e.clientX - drag.startClientX;
            const dy = e.clientY - drag.startClientY;
            if (!drag.moved && Math.hypot(dx, dy) < 4) return;
            drag.moved = true;
            if (!svgEl) return;
            const ctm = svgEl.getScreenCTM();
            if (!ctm) return;
            // screen delta → viewBox delta → image space delta
            const imgDx = dx / ctm.a / scale;
            const imgDy = dy / ctm.d / scale;
            const newX = drag.startNodeX + imgDx;
            const newY = drag.startNodeY + imgDy;
            appState.update(s => {
                const n = s.nodes.get(drag!.nodeId);
                if (!n) return s;
                return { ...s, nodes: new Map(s.nodes).set(drag!.nodeId, { ...n, x: newX, y: newY }) };
            });
            return;
        }

        if (mode === 'addEdge' && edgeSourceId) {
            const pt = mouseToScene(e);
            edgeCursorX = pt.x;
            edgeCursorY = pt.y;
        }
    }

    function onSvgMouseup(e: MouseEvent) {
        if (isPanning) {
            isPanning = false;
            return;
        }
        if (resize) {
            if (resize.moved) {
                const node = nodes.get(resize.nodeId);
                if (node) nodesMoved?.([{ nodeId: resize.nodeId, x: node.x, y: node.y }]);
                logAction('Resized node');
            }
            resize = null;
            return;
        }
        if (lassoRect) {
            commitLasso();
            return;
        }
        if (drag) {
            if (!drag.moved) {
                // Treat as node click: select
                if (e.metaKey || e.ctrlKey || e.shiftKey) {
                    // Additive/subtractive toggle
                    const ids = new Set(selectedNodeIds);
                    if (ids.has(drag.nodeId)) ids.delete(drag.nodeId);
                    else ids.add(drag.nodeId);
                    setSelection([...ids], [...selectedEdgeIds]);
                } else {
                    setSelection([drag.nodeId], []);
                }
                focusedNodeIdx = nodeList.findIndex(n => n.id === drag!.nodeId);
            } else {
                const node = nodes.get(drag.nodeId);
                if (node) nodesMoved?.([{ nodeId: drag.nodeId, x: node.x, y: node.y }]);
                logAction('Moved node');
            }
            drag = null;
        }
    }

    function onSvgMouseleave() {
        isPanning = false;
        if (resize?.moved) {
            const node = nodes.get(resize.nodeId);
            if (node) nodesMoved?.([{ nodeId: resize.nodeId, x: node.x, y: node.y }]);
            logAction('Resized node');
        }
        resize = null;
        if (drag?.moved) {
            const node = nodes.get(drag.nodeId);
            if (node) nodesMoved?.([{ nodeId: drag.nodeId, x: node.x, y: node.y }]);
            logAction('Moved node');
        }
        drag = null;
        lassoRect = null;
    }

    // ── Node mouse events ─────────────────────────────────────────────────────

    function onNodeMousedown(e: MouseEvent, nodeId: string) {
        if (e.button !== 0) return;
        e.stopPropagation();

        if (mode === 'addEdge') {
            if (!edgeSourceId) {
                edgeSourceId = nodeId;
                const n = nodes.get(nodeId);
                if (n) { edgeCursorX = n.x + n.width / 2; edgeCursorY = n.y + n.height / 2; }
            } else if (edgeSourceId !== nodeId) {
                addEdgeBetween(edgeSourceId, nodeId);
            }
            return;
        }

        if (spaceDown || mode === 'pan') return; // space+drag or pan mode pans, don't start node drag
        if (readonly) return; // no dragging in read-only mode

        const node = nodes.get(nodeId);
        if (!node) return;
        drag = {
            nodeId,
            startClientX: e.clientX,
            startClientY: e.clientY,
            startNodeX: node.x,
            startNodeY: node.y,
            moved: false,
        };
    }

    // ── Handle (resize) mouse events ─────────────────────────────────────────

    function onHandleMousedown(e: MouseEvent, nodeId: string, dir: HandleDir) {
        if (e.button !== 0 || readonly) return;
        e.stopPropagation();
        const node = nodes.get(nodeId);
        if (!node) return;
        resize = {
            nodeId,
            dir,
            startClientX: e.clientX,
            startClientY: e.clientY,
            startNodeX: node.x,
            startNodeY: node.y,
            startNodeW: node.width,
            startNodeH: node.height,
            moved: false,
        };
    }

    // ── Edge mouse events ─────────────────────────────────────────────────────

    function onEdgeMousedown(e: MouseEvent, edgeId: string) {
        e.stopPropagation();
        if (mode === 'addEdge') return; // don't select edges while drawing
        if (e.button !== 0) return;
        if (e.shiftKey) {
            const ids = new Set(selectedEdgeIds);
            if (ids.has(edgeId)) ids.delete(edgeId);
            else ids.add(edgeId);
            setSelection([...selectedNodeIds], [...ids]);
        } else {
            setSelection([], [edgeId]);
        }
    }

    // ── Keyboard ──────────────────────────────────────────────────────────────

    function onSvgKeydown(e: KeyboardEvent) {
        switch (e.key) {
            case ' ':
                e.preventDefault();
                spaceDown = true;
                break;
            case 'Escape':
                if (lassoRect) {
                    lassoRect = null;
                } else if (mode === 'addNode' || mode === 'addEdge' || mode === 'pan' || edgeSourceId) {
                    mode = 'select';
                    edgeSourceId = null;
                } else {
                    setSelection([], []);
                    focusedNodeIdx = -1;
                }
                break;
            case 'a':
            case 'A':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    setSelection(nodeList.map(n => n.id), [...edges.keys()]);
                    liveMsg = `Selected all ${nodeList.length} node(s) and ${edges.size} edge(s).`;
                }
                break;
            case 'Delete':
            case 'Backspace':
                if (!readonly) deleteSelection();
                break;
            case 'ArrowRight':
            case 'ArrowDown':
                e.preventDefault();
                if (nodeList.length > 0) {
                    focusedNodeIdx = (focusedNodeIdx + 1) % nodeList.length;
                    setSelection([nodeList[focusedNodeIdx].id], []);
                }
                break;
            case 'ArrowLeft':
            case 'ArrowUp':
                e.preventDefault();
                if (nodeList.length > 0) {
                    focusedNodeIdx = (focusedNodeIdx - 1 + nodeList.length) % nodeList.length;
                    setSelection([nodeList[focusedNodeIdx].id], []);
                }
                break;
            case 'Enter':
                if (focusedNodeIdx >= 0 && focusedNodeIdx < nodeList.length) {
                    selectNodes?.([nodeList[focusedNodeIdx].id]);
                }
                break;
        }
    }

    function onSvgKeyup(e: KeyboardEvent) {
        if (e.key === ' ') spaceDown = false;
    }

    // ── Touch events ──────────────────────────────────────────────────────────

    function onTouchStart(e: TouchEvent) {
        if (e.touches.length !== 1) return;
        const touch = e.touches[0];
        activeTouchId = touch.identifier;
        if (mode === 'select') {
            e.preventDefault();
            const pt = clientToScene(touch.clientX, touch.clientY);
            lassoRect = { x0: pt.x, y0: pt.y, x1: pt.x, y1: pt.y };
        }
    }

    function onTouchMove(e: TouchEvent) {
        if (activeTouchId === null || !lassoRect) return;
        const touch = [...e.changedTouches].find(t => t.identifier === activeTouchId);
        if (!touch) return;
        e.preventDefault();
        const pt = clientToScene(touch.clientX, touch.clientY);
        lassoRect = { ...lassoRect, x1: pt.x, y1: pt.y };
    }

    function onTouchEnd(e: TouchEvent) {
        if (activeTouchId === null) return;
        const touch = [...e.changedTouches].find(t => t.identifier === activeTouchId);
        if (!touch) return;
        activeTouchId = null;
        commitLasso();
    }

    // ── View controls ─────────────────────────────────────────────────────────

    function resetView() {
        if (svgW > 0 && svgH > 0) {
            // Fit the image/canvas into the SVG element, centered — what xMidYMid meet
            // was doing implicitly. Now explicit so the view is stable on element resize.
            const fitScale = Math.min(svgW / vbW, svgH / vbH);
            tx = (svgW - vbW * fitScale) / 2;
            ty = (svgH - vbH * fitScale) / 2;
            scale = fitScale;
            zoomInput = Math.round(fitScale * 100);
        } else {
            tx = 0;
            ty = 0;
            scale = 1;
            zoomInput = 100;
        }
    }

    // Initialize the view once the SVG element is first measured.
    let _viewInitialized = false;
    $effect(() => {
        if (svgW > 0 && svgH > 0 && !_viewInitialized) {
            _viewInitialized = true;
            untrack(resetView);
        }
    });

    function applyZoom(percent: number) {
        const newScale = Math.max(10, Math.min(800, percent)) / 100;
        // zoom around canvas center
        if (svgEl) {
            const { width, height } = svgEl.getBoundingClientRect();
            const cx = width / 2;
            const cy = height / 2;
            const ctm = svgEl.getScreenCTM();
            if (ctm) {
                const svgPt = { x: cx / ctm.a, y: cy / ctm.d };
                const actual = newScale / scale;
                tx = svgPt.x - (svgPt.x - tx) * actual;
                ty = svgPt.y - (svgPt.y - ty) * actual;
            }
        }
        scale = newScale;
        zoomInput = Math.round(newScale * 100);
    }

    function activateSelect() {
        mode = 'select';
        edgeSourceId = null;
        lassoRect = null;
    }

    function togglePan() {
        mode = mode === 'pan' ? 'select' : 'pan';
        edgeSourceId = null;
        lassoRect = null;
    }

    function toggleAddNode() {
        mode = mode === 'addNode' ? 'select' : 'addNode';
        if (mode === 'addNode') edgeSourceId = null;
    }

    function toggleAddEdge() {
        mode = mode === 'addEdge' ? 'select' : 'addEdge';
        if (mode !== 'addEdge') edgeSourceId = null;
    }

    // ── Resize tooltip ────────────────────────────────────────────────────────

    const tooltipNode = $derived(
        !readonly && selectedNodeIds.size === 1
            ? (nodes.get([...selectedNodeIds][0]) ?? null)
            : null
    );

    let tipX = $state(0);
    let tipY = $state(0);

    $effect(() => {
        if (!svgEl || !tooltipNode) return;
        const cx = tooltipNode.x + tooltipNode.width / 2;
        const cy = tooltipNode.y;
        const pt = svgEl.createSVGPoint();
        pt.x = tx + cx * scale;
        pt.y = ty + cy * scale;
        const ctm = svgEl.getScreenCTM();
        if (!ctm) return;
        const screen = pt.matrixTransform(ctm);
        tipX = screen.x;
        tipY = screen.y;
    });

    const tipStep = $derived(renderConfig.positionUnit === '%' ? 0.1 : 1);

    function toDisplayW(node: SkeletonNode): number {
        if (renderConfig.positionUnit === '%' && imageWidth && imageWidth > 0)
            return Math.round((node.width / imageWidth) * 1000) / 10;
        return Math.round(node.width);
    }

    function toDisplayH(node: SkeletonNode): number {
        if (renderConfig.positionUnit === '%' && imageHeight && imageHeight > 0)
            return Math.round((node.height / imageHeight) * 1000) / 10;
        return Math.round(node.height);
    }

    function tipSetWidth(nodeId: string, displayVal: number) {
        if (isNaN(displayVal)) return;
        const px = renderConfig.positionUnit === '%' && imageWidth
            ? (displayVal / 100) * imageWidth
            : displayVal;
        appState.update(s => {
            const n = s.nodes.get(nodeId);
            if (!n) return s;
            return { ...s, nodes: new Map(s.nodes).set(nodeId, { ...n, width: px }) };
        });
    }

    function tipSetHeight(nodeId: string, displayVal: number) {
        if (isNaN(displayVal)) return;
        const px = renderConfig.positionUnit === '%' && imageHeight
            ? (displayVal / 100) * imageHeight
            : displayVal;
        appState.update(s => {
            const n = s.nodes.get(nodeId);
            if (!n) return s;
            return { ...s, nodes: new Map(s.nodes).set(nodeId, { ...n, height: px }) };
        });
    }
</script>

<!-- aria-live for screen-reader announcements -->
<div class="visually-hidden" aria-live="polite" aria-atomic="true">{liveMsg}</div>

<!-- Toolbar -->
<div class="canvas-toolbar" role="toolbar" aria-label="Canvas tools">
    {#if !readonly}
        <button
            class="btn-ghost btn-sm"
            class:active={mode === 'pan'}
            type="button"
            aria-pressed={mode === 'pan'}
            onclick={togglePan}
        >
            Pan
        </button>
        <button
            class="btn-ghost btn-sm"
            class:active={mode === 'select'}
            type="button"
            aria-pressed={mode === 'select'}
            onclick={activateSelect}
        >
            Select
        </button>
        <span class="select-filter" role="group" aria-label="Selection target">
            <label class="filter-label" class:active={selectFilter === 'nodes'}>
                <input type="radio" name="selectFilter" value="nodes" bind:group={selectFilter} />
                Nodes
            </label>
            <label class="filter-label" class:active={selectFilter === 'edges'}>
                <input type="radio" name="selectFilter" value="edges" bind:group={selectFilter} />
                Edges
            </label>
        </span>
        <span class="toolbar-sep" aria-hidden="true"></span>
        <button
            class="btn-ghost btn-sm"
            class:active={mode === 'addNode'}
            type="button"
            aria-pressed={mode === 'addNode'}
            onclick={toggleAddNode}
        >
            + Node
        </button>
        <button
            class="btn-ghost btn-sm"
            class:active={mode === 'addEdge'}
            type="button"
            aria-pressed={mode === 'addEdge'}
            onclick={toggleAddEdge}
        >
            + Edge
        </button>
        <label class="toolbar-option">
            <input type="checkbox" bind:checked={addEdgePairs} />
            Add pairs
        </label>
        <span class="toolbar-sep" aria-hidden="true"></span>
    {/if}
    <label class="zoom-label" aria-label="Zoom level">
        <input
            type="number"
            class="zoom-input"
            min="10"
            max="800"
            step="10"
            bind:value={zoomInput}
            aria-label="Zoom percentage"
            onchange={() => applyZoom(zoomInput)}
            onkeydown={(e) => { if (e.key === 'Enter') applyZoom(zoomInput); }}
        />%
    </label>
    <button class="btn-ghost btn-sm" type="button" onclick={resetView}>
        Reset View
    </button>
    <span class="toolbar-sep" aria-hidden="true"></span>
    <div class="tool-options-wrapper">
        <details class="tool-options-dropdown">
            <summary class="btn-ghost btn-sm">Tool options</summary>
            <div class="tool-options-panel">
                <!-- Labels -->
                <p class="tool-opt-heading">Labels</p>
                <table class="tool-opt-table">
                    <tbody>
                        <tr>
                            <td><input type="checkbox" checked={toolOptions.showNodeLabels}
                                onchange={() => setToolOption('showNodeLabels', !toolOptions.showNodeLabels)} /></td>
                            <td>Node labels</td>
                            <td>
                                <div class="color-pair">
                                    <input type="color" class="tool-opt-color" title="Text color"
                                        value={toolOptions.nodeLabelColor}
                                        oninput={(e) => setToolOption('nodeLabelColor', (e.target as HTMLInputElement).value)} />
                                    <input type="color" class="tool-opt-color" title="Outline color"
                                        value={toolOptions.nodeLabelOutlineColor}
                                        oninput={(e) => setToolOption('nodeLabelOutlineColor', (e.target as HTMLInputElement).value)} />
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td><input type="checkbox" checked={toolOptions.showEdgeLabels}
                                onchange={() => setToolOption('showEdgeLabels', !toolOptions.showEdgeLabels)} /></td>
                            <td>Edge labels</td>
                            <td>
                                <div class="color-pair">
                                    <input type="color" class="tool-opt-color" title="Text color"
                                        value={toolOptions.edgeLabelColor}
                                        oninput={(e) => setToolOption('edgeLabelColor', (e.target as HTMLInputElement).value)} />
                                    <input type="color" class="tool-opt-color" title="Outline color"
                                        value={toolOptions.edgeLabelOutlineColor}
                                        oninput={(e) => setToolOption('edgeLabelOutlineColor', (e.target as HTMLInputElement).value)} />
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>

                <!-- Nodes -->
                <p class="tool-opt-heading">Nodes</p>
                <p class="tool-opt-subtext">Fill is in the properties panel. Backfill color shown here does not appear in the rendered output.</p>
                <table class="tool-opt-table">
                    <tbody>
                        <tr>
                            <td><input type="checkbox" checked={toolOptions.showAllNodes}
                                onchange={() => setToolOption('showAllNodes', !toolOptions.showAllNodes)} /></td>
                            <td>All nodes</td>
                            <td>
                                <input type="color" class="tool-opt-color" title="Node backfill color"
                                    value={toolOptions.nodeBackfillColor}
                                    oninput={(e) => setToolOption('nodeBackfillColor', (e.target as HTMLInputElement).value)} />
                            </td>
                        </tr>
                        {#if isSchemaMode}
                            <tr class:opt-disabled={!schemaState.level0Enabled}>
                                <td class="tool-opt-indent-cell"><input type="checkbox" checked={toolOptions.showLevel0Node}
                                    disabled={!schemaState.level0Enabled}
                                    onchange={() => setToolOption('showLevel0Node', !toolOptions.showLevel0Node)} /></td>
                                <td>Level 0 node</td>
                                <td>
                                    <input type="color" class="tool-opt-color" title="Level 0 backfill color"
                                        value={toolOptions.level0BackfillColor}
                                        oninput={(e) => setToolOption('level0BackfillColor', (e.target as HTMLInputElement).value)} />
                                </td>
                            </tr>
                            <tr>
                                <td class="tool-opt-indent-cell"><input type="checkbox" checked={toolOptions.showLevel1Nodes}
                                    onchange={() => setToolOption('showLevel1Nodes', !toolOptions.showLevel1Nodes)} /></td>
                                <td>Level 1 nodes</td>
                                <td>
                                    <input type="color" class="tool-opt-color" title="Level 1 backfill color"
                                        value={toolOptions.level1BackfillColor}
                                        oninput={(e) => setToolOption('level1BackfillColor', (e.target as HTMLInputElement).value)} />
                                </td>
                            </tr>
                            <tr>
                                <td class="tool-opt-indent-cell"><input type="checkbox" checked={toolOptions.showLevel2Nodes}
                                    onchange={() => setToolOption('showLevel2Nodes', !toolOptions.showLevel2Nodes)} /></td>
                                <td>Level 2 nodes</td>
                                <td>
                                    <input type="color" class="tool-opt-color" title="Level 2 backfill color"
                                        value={toolOptions.level2BackfillColor}
                                        oninput={(e) => setToolOption('level2BackfillColor', (e.target as HTMLInputElement).value)} />
                                </td>
                            </tr>
                            <tr>
                                <td class="tool-opt-indent-cell"><input type="checkbox" checked={toolOptions.showLevel3Nodes}
                                    onchange={() => setToolOption('showLevel3Nodes', !toolOptions.showLevel3Nodes)} /></td>
                                <td>Level 3 nodes</td>
                                <td>
                                    <input type="color" class="tool-opt-color" title="Level 3 backfill color"
                                        value={toolOptions.level3BackfillColor}
                                        oninput={(e) => setToolOption('level3BackfillColor', (e.target as HTMLInputElement).value)} />
                                </td>
                            </tr>
                        {/if}
                    </tbody>
                </table>

                <!-- Edges -->
                <p class="tool-opt-heading">Edges</p>
                <table class="tool-opt-table">
                    <tbody>
                        <tr>
                            <td><input type="checkbox" checked={toolOptions.showEdges}
                                onchange={() => setToolOption('showEdges', !toolOptions.showEdges)} /></td>
                            <td>All edges</td>
                            <td>
                                <input type="color" class="tool-opt-color" title="Edge color"
                                    value={toolOptions.edgeColor}
                                    oninput={(e) => setToolOption('edgeColor', (e.target as HTMLInputElement).value)} />
                            </td>
                        </tr>
                        {#if isSchemaMode && schemaEdgeTypes.length > 0}
                            {#each schemaEdgeTypes as edgeType (edgeType)}
                                <tr>
                                    <td class="tool-opt-indent-cell">
                                        <input type="checkbox"
                                            checked={!toolOptions.hiddenEdgeTypes.includes(edgeType)}
                                            onchange={() => toggleEdgeType(edgeType)} />
                                    </td>
                                    <td>"{edgeType}"</td>
                                    <td>
                                        <input type="color" class="tool-opt-color"
                                            title="Color for {edgeType} edges"
                                            value={toolOptions.edgeTypeColors[edgeType] ?? toolOptions.edgeColor}
                                            oninput={(e) => setEdgeTypeColor(edgeType, (e.target as HTMLInputElement).value)} />
                                    </td>
                                </tr>
                            {/each}
                        {/if}
                    </tbody>
                </table>
            </div>
        </details>
    </div>
    {#if mode === 'addNode'}
        <span class="mode-hint" aria-live="polite">Click canvas to place node — Escape to cancel</span>
    {:else if mode === 'addEdge'}
        <span class="mode-hint" aria-live="polite">
            {edgeSourceId ? 'Click target node — Escape to cancel' : 'Click source node — Escape to cancel'}
        </span>
    {:else if mode === 'pan'}
        <span class="mode-hint" aria-live="polite">Click and drag to pan the canvas — Escape to exit</span>
    {/if}
</div>

<!-- SVG Canvas: role="application" makes this interactive; svelte a11y lint doesn't recognize it -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<svg
    bind:this={svgEl}
    bind:clientWidth={svgW}
    bind:clientHeight={svgH}
    {viewBox}
    role="application"
    aria-label="Graph editor canvas. Use arrow keys to cycle nodes, Enter to open properties, Delete to remove selection."
    class="graph-canvas"
    class:cursor-crosshair={mode === 'addNode'}
    class:cursor-lasso={!!lassoRect}
    class:cursor-cell={mode === 'addEdge'}
    class:cursor-grab={(spaceDown || mode === 'pan') && !isPanning}
    class:cursor-grabbing={isPanning}
    style={resize ? `cursor: ${resize.dir}-resize` : ''}
    onmousedown={onSvgMousedown}
    onmousemove={onSvgMousemove}
    onmouseup={onSvgMouseup}
    onmouseleave={onSvgMouseleave}
    onkeydown={onSvgKeydown}
    onkeyup={onSvgKeyup}
    ontouchstart={onTouchStart}
    ontouchmove={onTouchMove}
    ontouchend={onTouchEnd}
>
    <defs>
        <marker id="dn-arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="currentColor" />
        </marker>
        <marker id="dn-arrow-sel" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="var(--dn-accent)" />
        </marker>
    </defs>

    <g id="scene" bind:this={sceneEl} transform="translate({tx} {ty}) scale({scale})">

        <!-- Layer 1: Background -->
        {#if imageDataUrl}
            <image
                href={imageDataUrl}
                x="0" y="0"
                width={vbW} height={vbH}
                preserveAspectRatio="xMidYMid meet"
                aria-hidden="true"
            />
        {:else}
            <rect class="canvas-bg" x="0" y="0" width={vbW} height={vbH} />
        {/if}

        <!-- Layer 2: Edges -->
        <g class="edge-layer">
            {#each [...edges.values()] as edge (edge.id)}
                {@const src = nodes.get(edge.sourceId)}
                {@const tgt = nodes.get(edge.targetId)}
                {#if src && tgt && !hiddenEdgeIds.has(edge.id)}
                    {@const sc = nodeCenter(src)}
                    {@const tc = nodeCenter(tgt)}
                    {@const dx = tc.x - sc.x}
                    {@const dy = tc.y - sc.y}
                    {@const len = Math.sqrt(dx * dx + dy * dy) || 1}
                    {@const mx = (sc.x + tc.x) / 2}
                    {@const my = (sc.y + tc.y) / 2}
                    {@const isPaired = pairedEdgeIds.has(edge.id)}
                    {@const cpx = isPaired ? mx + (dy / len) * 30 : mx}
                    {@const cpy = isPaired ? my + (-dx / len) * 30 : my}
                    {@const lx = isPaired ? (sc.x + 2 * cpx + tc.x) / 4 : mx}
                    {@const ly = isPaired ? (sc.y + 2 * cpy + tc.y) / 4 : my}
                    {@const isSel = selectedEdgeIds.has(edge.id)}
                    {@const isEdgeHov = hoveredEdgeId === edge.id && !isSel}
                    {@const edgeCol = isSel ? 'var(--dn-accent)' : (toolOptions.edgeTypeColors[edge.label ?? ''] ?? toolOptions.edgeColor)}
                    <g
                        class="edge"
                        class:selected={isSel}
                        class:hovered={isEdgeHov}
                        role="button"
                        tabindex="-1"
                        aria-label="Edge {edge.label || edge.direction} from {src.label} to {tgt.label}{isSel ? ', selected' : ''}"
                        onmousedown={(e) => onEdgeMousedown(e, edge.id)}
                        onmouseenter={() => setHoveredEdge(edge.id)}
                        onmouseleave={() => setHoveredEdge(null)}
                    >
                        <!-- Invisible wide hit target -->
                        {#if isPaired}
                            <path
                                d="M {sc.x} {sc.y} Q {cpx} {cpy} {tc.x} {tc.y}"
                                fill="none" stroke="transparent" stroke-width="12"
                            />
                        {:else}
                            <line
                                x1={sc.x} y1={sc.y} x2={tc.x} y2={tc.y}
                                stroke="transparent" stroke-width="12"
                            />
                        {/if}
                        {#if isPaired}
                            <path
                                d="M {sc.x} {sc.y} Q {cpx} {cpy} {tc.x} {tc.y}"
                                fill="none"
                                color={edgeCol}
                                stroke={edgeCol}
                                stroke-width={isSel ? 2.5 : 1.5}
                                marker-end={isSel ? 'url(#dn-arrow-sel)' : 'url(#dn-arrow)'}
                            />
                        {:else}
                            <line
                                x1={sc.x} y1={sc.y} x2={tc.x} y2={tc.y}
                                color={edgeCol}
                                stroke={edgeCol}
                                stroke-width={isSel ? 2.5 : 1.5}
                                marker-end={isSel ? 'url(#dn-arrow-sel)' : 'url(#dn-arrow)'}
                            />
                        {/if}
                        {#if toolOptions.showEdgeLabels && (edge.direction || edge.label)}
                            <text
                                x={lx} y={ly - 6}
                                class="edge-label"
                                text-anchor="middle"
                                fill={isSel ? 'var(--dn-accent)' : toolOptions.edgeLabelColor}
                                stroke={toolOptions.edgeLabelOutlineColor}
                                stroke-width="2"
                                paint-order="stroke"
                                font-size="11"
                                font-family="var(--dn-font)"
                            >{edge.label || edge.direction}</text>
                        {/if}
                    </g>
                {/if}
            {/each}
        </g>

        <!-- Layer 3: Nodes -->
        <g class="node-layer">
            {#each nodeList as node (node.id)}
                {#if !hiddenNodeIds.has(node.id)}
                {@const isSel = selectedNodeIds.has(node.id)}
                {@const isHov = hoveredNodeId === node.id && !isSel}
                {@const isEntry = node.id === entryNodeId}
                {@const cx = node.x + node.width / 2}
                {@const cy = node.y + node.height / 2}
                <g
                    class="node"
                    class:selected={isSel}
                    class:hovered={isHov}
                    role="button"
                    tabindex="-1"
                    aria-label="{node.label}{isEntry ? ', entry node' : ''}{node.isCluster ? ', cluster node' : ''}{isSel ? ', selected' : ''}"
                    onmousedown={(e) => onNodeMousedown(e, node.id)}
                    onmouseenter={() => setHoveredNode(node.id)}
                    onmouseleave={() => setHoveredNode(null)}
                >
                    <!-- Hover ring (linked from schema or keyboard focus) -->
                    {#if isHov}
                        {#if node.renderProperties.shape === 'ellipse'}
                            <ellipse
                                {cx} {cy}
                                rx={node.width / 2 + 4} ry={node.height / 2 + 4}
                                fill="none"
                                stroke="var(--dn-accent-mid)"
                                stroke-width="1.5"
                                stroke-dasharray="3 2"
                                opacity="0.7"
                            />
                        {:else}
                            <rect
                                x={node.x - 4} y={node.y - 4}
                                width={node.width + 8} height={node.height + 8}
                                fill="none"
                                stroke="var(--dn-accent-mid)"
                                stroke-width="1.5"
                                stroke-dasharray="3 2"
                                rx="6"
                                opacity="0.7"
                            />
                        {/if}
                    {/if}

                    <!-- Selection ring -->
                    {#if isSel}
                        {#if node.renderProperties.shape === 'ellipse'}
                            <ellipse
                                {cx} {cy}
                                rx={node.width / 2 + 5} ry={node.height / 2 + 5}
                                fill="none"
                                stroke="var(--dn-accent)"
                                stroke-width="2"
                                stroke-dasharray="5 2"
                            />
                        {:else}
                            <rect
                                x={node.x - 5} y={node.y - 5}
                                width={node.width + 10} height={node.height + 10}
                                fill="none"
                                stroke="var(--dn-accent)"
                                stroke-width="2"
                                stroke-dasharray="5 2"
                                rx="7"
                            />
                        {/if}
                    {/if}

                    <!-- Cluster shadow rect -->
                    {#if node.isCluster && node.renderProperties.shape !== 'ellipse'}
                        {@const shadowFill = node.renderProperties.fillEnabled ? node.renderProperties.fill : 'none'}
                        <rect
                            x={node.x + 5} y={node.y + 5}
                            width={node.width} height={node.height}
                            fill={shadowFill}
                            stroke={node.renderProperties.strokeColor ?? '#000000'}
                            stroke-width={node.renderProperties.strokeWidth ?? 2}
                            rx="4"
                            opacity="0.5"
                        />
                    {/if}

                    <!-- Backfill (tool-only visual, not exported) -->
                    {#if nodeBackfillColorMap.has(node.id)}
                        {@const bfColor = nodeBackfillColorMap.get(node.id)!}
                        {#if node.renderProperties.shape === 'ellipse'}
                            <ellipse
                                {cx} {cy}
                                rx={node.width / 2} ry={node.height / 2}
                                fill={bfColor}
                                fill-opacity="0.4"
                                stroke="none"
                                pointer-events="none"
                            />
                        {:else}
                            <rect
                                x={node.x} y={node.y}
                                width={node.width} height={node.height}
                                fill={bfColor}
                                fill-opacity="0.4"
                                stroke="none"
                                rx="4"
                                pointer-events="none"
                            />
                        {/if}
                    {/if}

                    <!-- Main shape -->
                    {#if node.renderProperties.shape === 'ellipse'}
                        {@const nodeFill = node.renderProperties.fillEnabled ? node.renderProperties.fill : 'white'}
                        {@const nodeFillOpacity = node.renderProperties.fillEnabled ? node.renderProperties.opacity : 0}
                        {@const nodeStroke = isSel ? 'var(--dn-accent)' : (node.renderProperties.strokeColor ?? '#000000')}
                        {@const nodeStrokeWidth = isSel ? 2 : (node.renderProperties.strokeWidth ?? 2)}
                        {@const nodeDashArray = node.renderProperties.strokeDash === 'dashed' ? '6 3' : node.renderProperties.strokeDash === 'dotted' ? '2 2' : undefined}
                        <ellipse
                            {cx} {cy}
                            rx={node.width / 2} ry={node.height / 2}
                            fill={nodeFill}
                            fill-opacity={nodeFillOpacity}
                            stroke={nodeStroke}
                            stroke-width={nodeStrokeWidth}
                            stroke-dasharray={nodeDashArray}
                            opacity={node.renderProperties.opacity}
                        />
                    {:else}
                        {@const nodeFill = node.renderProperties.fillEnabled ? node.renderProperties.fill : 'white'}
                        {@const nodeFillOpacity = node.renderProperties.fillEnabled ? node.renderProperties.opacity : 0}
                        {@const nodeStroke = isSel ? 'var(--dn-accent)' : (node.renderProperties.strokeColor ?? '#000000')}
                        {@const nodeStrokeWidth = isSel ? 2 : (node.renderProperties.strokeWidth ?? 2)}
                        {@const nodeDashArray = node.renderProperties.strokeDash === 'dashed' ? '6 3' : node.renderProperties.strokeDash === 'dotted' ? '2 2' : undefined}
                        <rect
                            x={node.x} y={node.y}
                            width={node.width} height={node.height}
                            fill={nodeFill}
                            fill-opacity={nodeFillOpacity}
                            stroke={nodeStroke}
                            stroke-width={nodeStrokeWidth}
                            stroke-dasharray={nodeDashArray}
                            rx="4"
                            opacity={node.renderProperties.opacity}
                        />
                    {/if}

                    <!-- Label (white halo pass + black text pass for legibility) -->
                    {#if toolOptions.showNodeLabels}
                    <text
                        x={cx} y={cy}
                        text-anchor="middle"
                        dominant-baseline="middle"
                        font-size="12"
                        font-family="var(--dn-font)"
                        font-weight="700"
                        fill="none"
                        stroke={toolOptions.nodeLabelOutlineColor}
                        stroke-width="3"
                        stroke-linejoin="round"
                        paint-order="stroke"
                        pointer-events="none"
                        aria-hidden="true"
                    >
                        {node.label}{node.isCluster && node.clusterCount != null ? ` (${node.clusterCount})` : ''}
                    </text>
                    <text
                        x={cx} y={cy}
                        text-anchor="middle"
                        dominant-baseline="middle"
                        font-size="12"
                        font-family="var(--dn-font)"
                        font-weight="700"
                        fill={toolOptions.nodeLabelColor}
                        pointer-events="none"
                    >
                        {node.label}{node.isCluster && node.clusterCount != null ? ` (${node.clusterCount})` : ''}
                    </text>
                    {/if}

                    <!-- Entry marker ★ -->
                    {#if isEntry}
                        <text
                            x={node.x + 4}
                            y={node.y - 3}
                            font-size="11"
                            fill="var(--dn-accent)"
                            pointer-events="none"
                            aria-hidden="true"
                        >★</text>
                    {/if}

                    <!-- Resize handles (single selection, editable) -->
                    {#if isSel && selectedNodeIds.size === 1 && !readonly}
                        {@const hs = 8 / scale}
                        {@const hhs = hs / 2}
                        {#each getHandlePositions(node) as h (h.dir)}
                            <rect
                                class="resize-handle"
                                x={h.x - hhs} y={h.y - hhs}
                                width={hs} height={hs}
                                stroke-width={1.5 / scale}
                                style="cursor: {h.dir}-resize"
                                aria-hidden="true"
                                onmousedown={(e) => onHandleMousedown(e, node.id, h.dir)}
                            />
                        {/each}
                    {/if}
                </g>
                {/if}
            {/each}
        </g>

        <!-- Layer 4: Interaction overlay -->
        {#if mode === 'addEdge' && edgeSourceId}
            {@const srcNode = nodes.get(edgeSourceId)}
            {#if srcNode}
                <line
                    x1={srcNode.x + srcNode.width / 2}
                    y1={srcNode.y + srcNode.height / 2}
                    x2={edgeCursorX}
                    y2={edgeCursorY}
                    stroke="var(--dn-accent)"
                    stroke-width="1.5"
                    stroke-dasharray="6 3"
                    pointer-events="none"
                />
            {/if}
        {/if}

        <!-- Layer 5: Placement preview overlay -->
        {#if renderConfig.showOverlay}
            <g class="overlay-layer" aria-hidden="true" pointer-events="none">
                {#each nodeList as node (node.id)}
                    <rect
                        class="overlay-rect"
                        x={node.x} y={node.y}
                        width={node.width} height={node.height}
                        rx="4"
                        pointer-events="none"
                    />
                {/each}
            </g>
        {/if}

        <!-- Layer 6: Lasso rect -->
        {#if lassoRect}
            {@const lx = Math.min(lassoRect.x0, lassoRect.x1)}
            {@const ly = Math.min(lassoRect.y0, lassoRect.y1)}
            {@const lw = Math.abs(lassoRect.x1 - lassoRect.x0)}
            {@const lh = Math.abs(lassoRect.y1 - lassoRect.y0)}
            <rect
                class="lasso-rect"
                x={lx} y={ly}
                width={lw} height={lh}
                pointer-events="none"
            />
        {/if}

    </g>
</svg>

<!-- Resize tooltip: shown when a single node is selected in edit mode -->
{#if tooltipNode}
    {@const tn = tooltipNode}
    <div
        class="resize-tooltip"
        style="left: {tipX}px; top: {tipY}px"
        aria-label="Size of {tn.label}"
        onmousedown={(e) => e.stopPropagation()}
    >
        <div class="rtip-row">
            <span class="rtip-label">W</span>
            <button
                class="rtip-btn"
                type="button"
                aria-label="Decrease width"
                onmousedown={(e) => e.stopPropagation()}
                onclick={() => tipSetWidth(tn.id, toDisplayW(tn) - tipStep)}
            >−</button>
            <input
                type="number"
                class="rtip-input"
                step={tipStep}
                value={toDisplayW(tn)}
                aria-label="Width"
                onmousedown={(e) => e.stopPropagation()}
                oninput={(e) => tipSetWidth(tn.id, parseFloat(e.currentTarget.value))}
            />
            <button
                class="rtip-btn"
                type="button"
                aria-label="Increase width"
                onmousedown={(e) => e.stopPropagation()}
                onclick={() => tipSetWidth(tn.id, toDisplayW(tn) + tipStep)}
            >+</button>
        </div>
        <div class="rtip-row">
            <span class="rtip-label">H</span>
            <button
                class="rtip-btn"
                type="button"
                aria-label="Decrease height"
                onmousedown={(e) => e.stopPropagation()}
                onclick={() => tipSetHeight(tn.id, toDisplayH(tn) - tipStep)}
            >−</button>
            <input
                type="number"
                class="rtip-input"
                step={tipStep}
                value={toDisplayH(tn)}
                aria-label="Height"
                onmousedown={(e) => e.stopPropagation()}
                oninput={(e) => tipSetHeight(tn.id, parseFloat(e.currentTarget.value))}
            />
            <button
                class="rtip-btn"
                type="button"
                aria-label="Increase height"
                onmousedown={(e) => e.stopPropagation()}
                onclick={() => tipSetHeight(tn.id, toDisplayH(tn) + tipStep)}
            >+</button>
        </div>
        <span class="rtip-unit">{renderConfig.positionUnit}</span>
    </div>
{/if}

<style>
    .canvas-toolbar {
        display: flex;
        align-items: center;
        gap: var(--dn-space);
        padding-bottom: calc(var(--dn-space) * 1.5);
        flex-shrink: 0;
        flex-wrap: wrap;
    }

    .toolbar-sep {
        width: 1px;
        height: 20px;
        background: var(--dn-border);
        margin: 0 calc(var(--dn-space) * 0.5);
        flex-shrink: 0;
    }

    .select-filter {
        display: flex;
        align-items: center;
        gap: 2px;
        border: 1px solid var(--dn-border);
        border-radius: calc(var(--dn-radius) / 2);
        overflow: hidden;
        flex-shrink: 0;
    }

    .filter-label {
        display: flex;
        align-items: center;
        gap: calc(var(--dn-space) * 0.4);
        padding: 3px calc(var(--dn-space) * 0.75);
        font-size: 0.75rem;
        color: #949494;
        cursor: pointer;
        user-select: none;
        transition: background 0.1s, color 0.1s;
    }
    .filter-label.active {
        background: var(--dn-accent-soft);
        color: var(--dn-accent);
    }
    .filter-label input { display: none; }

    .mode-hint {
        font-size: 0.8125rem;
        color: var(--dn-accent);
        font-style: italic;
    }

    .zoom-label {
        display: flex;
        align-items: center;
        gap: 2px;
        font-size: 0.75rem;
        color: #949494;
        flex-shrink: 0;
    }

    .zoom-input {
        width: 4.5rem;
        padding: 2px 4px;
        font-size: 0.75rem;
        border: 1px solid var(--dn-border);
        border-radius: calc(var(--dn-radius) / 2);
        background: var(--dn-bg);
        color: var(--dn-text);
        text-align: right;
    }

    .toolbar-option {
        display: flex;
        align-items: center;
        gap: calc(var(--dn-space) * 0.4);
        font-size: 0.75rem;
        color: #949494;
        cursor: pointer;
        user-select: none;
        -webkit-user-select: none;
        white-space: nowrap;
        flex-shrink: 0;
    }

    .zoom-input:focus {
        outline: 2px solid var(--dn-accent);
        outline-offset: 1px;
    }

    /* Active mode button */
    :global(.canvas-toolbar .btn-ghost.active) {
        background: var(--dn-accent-soft);
        color: var(--dn-accent);
        border-color: var(--dn-accent-light);
    }

    .graph-canvas {
        width: 100%;
        min-height: 480px;
        flex: 1;
        display: block;
        background: var(--dn-surface);
        border: 1px solid var(--dn-border);
        border-radius: var(--dn-radius);
        cursor: default;
        user-select: none;
        -webkit-user-select: none;
        touch-action: none;
    }

    .graph-canvas:focus-visible {
        outline: 3px solid var(--dn-accent);
        outline-offset: 2px;
    }

    .graph-canvas.cursor-crosshair { cursor: crosshair; }
    .graph-canvas.cursor-lasso     { cursor: crosshair; }
    .graph-canvas.cursor-cell      { cursor: cell; }
    .graph-canvas.cursor-grab      { cursor: grab; }
    .graph-canvas.cursor-grabbing  { cursor: grabbing; }

    :global(.canvas-bg) {
        fill: var(--dn-surface);
    }

    :global(.node) {
        cursor: pointer;
    }

    :global(.node.hovered) {
        filter: brightness(0.97);
    }

    :global(.edge) {
        cursor: pointer;
    }

    :global(.edge.hovered line:last-of-type) {
        stroke: var(--dn-accent-mid) !important;
        opacity: 0.7;
    }

    :global(.lasso-rect) {
        fill: rgba(52, 81, 178, 0.08);
        stroke: var(--dn-accent);
        stroke-width: 1.5;
        stroke-dasharray: 4 2;
    }

    :global(.overlay-rect) {
        fill: rgba(20, 184, 166, 0.25);
        stroke: rgba(13, 148, 136, 0.7);
        stroke-width: 1.5;
    }

    :global(.resize-handle) {
        fill: var(--dn-bg);
        stroke: var(--dn-accent);
    }

    :global(.resize-handle:hover) {
        fill: var(--dn-accent-soft);
    }

    /* ── Resize tooltip ── */
    .resize-tooltip {
        position: absolute;
        transform: translate(-50%, calc(-100% - 10px));
        background: var(--dn-bg);
        border: 1px solid var(--dn-border);
        border-radius: var(--dn-radius);
        padding: calc(var(--dn-space) * 0.625) calc(var(--dn-space) * 0.875);
        display: flex;
        flex-direction: column;
        gap: calc(var(--dn-space) * 0.375);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
        z-index: 50;
        pointer-events: auto;
        user-select: none;
        -webkit-user-select: none;
    }

    .rtip-row {
        display: flex;
        align-items: center;
        gap: calc(var(--dn-space) * 0.375);
    }

    .rtip-label {
        font-size: 0.6875rem;
        font-weight: 700;
        color: #949494;
        width: 10px;
        font-family: var(--dn-font-mono);
        text-transform: uppercase;
    }

    .rtip-input {
        font-family: var(--dn-font-mono);
        font-size: 0.8125rem;
        color: var(--dn-text);
        background: var(--dn-surface);
        border: 1px solid var(--dn-border);
        border-radius: 3px;
        padding: 2px 4px;
        width: 58px;
        text-align: right;
        -moz-appearance: textfield;
        appearance: textfield;
    }

    .rtip-input::-webkit-outer-spin-button,
    .rtip-input::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
    }

    .rtip-input:focus {
        border-color: var(--dn-accent);
        outline: none;
    }

    .rtip-btn {
        background: none;
        border: 1px solid var(--dn-border);
        border-radius: 3px;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 0.9375rem;
        color: #949494;
        padding: 0;
        line-height: 1;
        font-family: var(--dn-font-mono);
        flex-shrink: 0;
    }

    .rtip-btn:hover {
        background: var(--dn-accent-soft);
        color: var(--dn-accent);
        border-color: var(--dn-accent-light);
    }

    .rtip-unit {
        font-size: 0.625rem;
        color: #949494;
        text-align: center;
        font-family: var(--dn-font-mono);
        letter-spacing: 0.03em;
    }

    /* ── Tool options dropdown ── */
    .tool-options-wrapper {
        position: relative;
        flex-shrink: 0;
    }

    .tool-options-dropdown > summary {
        list-style: none;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 4px;
    }

    .tool-options-dropdown > summary::marker,
    .tool-options-dropdown > summary::-webkit-details-marker {
        display: none;
    }

    .tool-options-dropdown > summary::after {
        content: '▾';
        font-size: 0.6875rem;
        opacity: 0.6;
    }

    .tool-options-dropdown[open] > summary::after {
        content: '▴';
    }

    .tool-options-panel {
        position: absolute;
        top: calc(100% + 4px);
        left: 0;
        z-index: 100;
        background: var(--dn-bg);
        border: 1px solid var(--dn-border);
        border-radius: var(--dn-radius);
        padding: calc(var(--dn-space) * 0.5) calc(var(--dn-space) * 0.75);
        display: flex;
        flex-direction: column;
        gap: 0;
        min-width: 240px;
        max-width: 250px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        white-space: nowrap;
    }

    .tool-opt-heading {
        font-weight: 700;
        font-size: 0.6875rem;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--dn-text-muted);
        margin: calc(var(--dn-space) * 0.5) 0 2px;
        padding: 0;
    }
    .tool-opt-heading:first-child { margin-top: 2px; }

    .tool-opt-subtext {
        font-size: 0.625rem;
        color: var(--dn-fg-mid, #666);
        margin: 0 0 4px;
        padding: 0;
        line-height: 1.3;
        white-space: normal;
    }

    .tool-opt-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.8125rem;
        color: var(--dn-text);
    }

    .tool-opt-table td {
        padding: 2px 4px;
        vertical-align: middle;
    }
    .tool-opt-table td:first-child { padding-left: 0; width: 1px; }
    .tool-opt-table td:last-child { text-align: right; }

    .tool-opt-table tr.opt-disabled { opacity: 0.45; }
    .tool-opt-table tr.opt-disabled input { cursor: not-allowed; }

    .tool-opt-indent-cell { padding-left: calc(var(--dn-space) * 1.25) !important; }

    .tool-opt-note {
        font-size: 0.7rem;
        color: var(--dn-text-muted);
        font-style: italic;
        text-align: right;
        line-height: 1.3;
        vertical-align: middle;
    }

    .color-pair {
        display: flex;
        gap: 3px;
        justify-content: flex-end;
    }

    .tool-opt-color {
        width: 22px;
        height: 18px;
        padding: 1px;
        border: 1px solid var(--dn-border);
        border-radius: 3px;
        cursor: pointer;
        background: none;
    }
</style>
