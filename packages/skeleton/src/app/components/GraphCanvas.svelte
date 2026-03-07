<script lang="ts">
    import { get } from 'svelte/store';
    import { appState } from '../../store/appState';
    import type { SkeletonNode, SkeletonEdge } from '../../store/types';
    import type { RenderConfig } from '../../store/appState';

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

    // ── View transform (in SVG viewBox coordinates) ───────────────────────────
    let tx = $state(0);
    let ty = $state(0);
    let scale = $state(1);

    // ── Interaction mode ──────────────────────────────────────────────────────
    type Mode = 'select' | 'addNode' | 'addEdge' | 'lasso';
    let mode = $state<Mode>('select');

    // ── Pan state ─────────────────────────────────────────────────────────────
    let isPanning = $state(false);
    let spaceDown = $state(false);
    let panStartClient = $state({ x: 0, y: 0 });
    let panStartTransform = $state({ tx: 0, ty: 0 });

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
    let activeTouchId = $state<number | null>(null);

    // ── Edge draw state ───────────────────────────────────────────────────────
    let edgeSourceId = $state<string | null>(null);
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
    let imageDataUrl = $state<string | null>(initial.imageDataUrl);
    let imageWidth = $state<number | null>(initial.imageWidth);
    let imageHeight = $state<number | null>(initial.imageHeight);
    let renderConfig = $state<RenderConfig>(initial.renderConfig);

    $effect(() => {
        return appState.subscribe(s => {
            nodes = s.nodes;
            edges = s.edges;
            selectedNodeIds = s.selectedNodeIds;
            selectedEdgeIds = s.selectedEdgeIds;
            entryNodeId = s.entryNodeId;
            imageDataUrl = s.imageDataUrl;
            imageWidth = s.imageWidth;
            imageHeight = s.imageHeight;
            renderConfig = s.renderConfig;
        });
    });

    // ── Derived ───────────────────────────────────────────────────────────────
    const vbW = $derived(imageWidth ?? 1200);
    const vbH = $derived(imageHeight ?? 800);
    const viewBox = $derived(`0 0 ${vbW} ${vbH}`);
    const nodeList = $derived([...nodes.values()]);

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
            semantics: { label: `Node ${nodes.size + 1}`, name: 'data point', includeParentName: false, includeIndex: false },
            data: {},
            renderProperties: {
                shape: 'rect',
                fill: 'var(--dn-surface)',
                opacity: 1,
                ariaRole: 'button',
                customClass: '',
            },
        };
        appState.update(s => ({
            ...s,
            nodes: new Map(s.nodes).set(id, node),
            entryNodeId: isFirst ? id : s.entryNodeId,
        }));
        setSelection([id], []);
        mode = 'select';
    }

    // ── Add edge ──────────────────────────────────────────────────────────────

    function addEdgeBetween(sourceId: string, targetId: string) {
        const id = crypto.randomUUID();
        const edge: SkeletonEdge = {
            id,
            sourceId,
            targetId,
            direction: 'down',
            label: '',
            dnProperties: {},
        };
        appState.update(s => ({
            ...s,
            edges: new Map(s.edges).set(id, edge),
        }));
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
        if (lw > 2 || lh > 2) {
            const hitNodeIds = nodeList
                .filter(n => rectsOverlap(lx, ly, lw, lh, n.x, n.y, n.width, n.height))
                .map(n => n.id);
            const hitNodeSet = new Set(hitNodeIds);
            const hitEdgeIds = [...edges.values()]
                .filter(e => hitNodeSet.has(e.sourceId) && hitNodeSet.has(e.targetId))
                .map(e => e.id);
            setSelection(hitNodeIds, hitEdgeIds);
            liveMsg = `Selected ${hitNodeIds.length} node(s) and ${hitEdgeIds.length} edge(s).`;
        }
        lassoRect = null;
    }

    // ── Wheel zoom ────────────────────────────────────────────────────────────

    function onWheel(e: WheelEvent) {
        e.preventDefault();
        if (!svgEl) return;
        const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
        const svgPt = mouseToSVGViewBox(e as unknown as MouseEvent);
        const newScale = Math.max(0.25, Math.min(8, scale * factor));
        const actual = newScale / scale;
        tx = svgPt.x - (svgPt.x - tx) * actual;
        ty = svgPt.y - (svgPt.y - ty) * actual;
        scale = newScale;
    }

    // ── SVG mouse events ──────────────────────────────────────────────────────

    function onSvgMousedown(e: MouseEvent) {
        // Middle mouse or space+left = pan
        if (e.button === 1 || (e.button === 0 && spaceDown)) {
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
        } else if (mode === 'lasso') {
            const pt = mouseToScene(e);
            lassoRect = { x0: pt.x, y0: pt.y, x1: pt.x, y1: pt.y };
        } else {
            setSelection([], []);
            focusedNodeIdx = -1;
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
                if (e.shiftKey) {
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
            }
            drag = null;
        }
    }

    function onSvgMouseleave() {
        isPanning = false;
        if (resize?.moved) {
            const node = nodes.get(resize.nodeId);
            if (node) nodesMoved?.([{ nodeId: resize.nodeId, x: node.x, y: node.y }]);
        }
        resize = null;
        if (drag?.moved) {
            const node = nodes.get(drag.nodeId);
            if (node) nodesMoved?.([{ nodeId: drag.nodeId, x: node.x, y: node.y }]);
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

        // In lasso mode, clicks on nodes select immediately without dragging
        if (mode === 'lasso') {
            if (e.shiftKey) {
                const ids = new Set(selectedNodeIds);
                if (ids.has(nodeId)) ids.delete(nodeId);
                else ids.add(nodeId);
                setSelection([...ids], [...selectedEdgeIds]);
            } else {
                setSelection([nodeId], []);
            }
            return;
        }

        if (spaceDown) return; // space+drag pans, don't start node drag
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
                } else if (mode === 'addNode' || mode === 'addEdge' || edgeSourceId) {
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
        if (mode === 'lasso') {
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
        tx = 0;
        ty = 0;
        scale = 1;
    }

    function toggleAddNode() {
        mode = mode === 'addNode' ? 'select' : 'addNode';
        if (mode === 'addNode') edgeSourceId = null;
    }

    function toggleAddEdge() {
        mode = mode === 'addEdge' ? 'select' : 'addEdge';
        if (mode !== 'addEdge') edgeSourceId = null;
    }

    function toggleLasso() {
        mode = mode === 'lasso' ? 'select' : 'lasso';
        edgeSourceId = null;
        lassoRect = null;
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
            class:active={mode === 'lasso'}
            type="button"
            aria-pressed={mode === 'lasso'}
            onclick={toggleLasso}
        >
            Select
        </button>
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
        <span class="toolbar-sep" aria-hidden="true"></span>
    {/if}
    <button class="btn-ghost btn-sm" type="button" onclick={resetView}>
        Reset View
    </button>
    {#if mode === 'addNode'}
        <span class="mode-hint" aria-live="polite">Click canvas to place node — Escape to cancel</span>
    {:else if mode === 'addEdge'}
        <span class="mode-hint" aria-live="polite">
            {edgeSourceId ? 'Click target node — Escape to cancel' : 'Click source node — Escape to cancel'}
        </span>
    {:else if mode === 'lasso'}
        <span class="mode-hint" aria-live="polite">Drag to select multiple nodes — Ctrl+A selects all — Escape to clear</span>
    {/if}
</div>

<!-- SVG Canvas: role="application" makes this interactive; svelte a11y lint doesn't recognize it -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<svg
    bind:this={svgEl}
    {viewBox}
    role="application"
    aria-label="Graph editor canvas. Use arrow keys to cycle nodes, Enter to open properties, Delete to remove selection."
    tabindex="0"
    class="graph-canvas"
    class:cursor-crosshair={mode === 'addNode'}
    class:cursor-lasso={mode === 'lasso'}
    class:cursor-cell={mode === 'addEdge'}
    class:cursor-grab={spaceDown && !isPanning}
    class:cursor-grabbing={isPanning}
    style={resize ? `cursor: ${resize.dir}-resize` : ''}
    onwheel={onWheel}
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
            <path d="M0,0 L0,6 L8,3 z" fill="var(--dn-text-muted)" />
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
                {#if src && tgt}
                    {@const sc = nodeCenter(src)}
                    {@const tc = nodeCenter(tgt)}
                    {@const mx = (sc.x + tc.x) / 2}
                    {@const my = (sc.y + tc.y) / 2}
                    {@const isSel = selectedEdgeIds.has(edge.id)}
                    <g
                        class="edge"
                        class:selected={isSel}
                        role="button"
                        tabindex="-1"
                        aria-label="Edge {edge.label || edge.direction} from {src.label} to {tgt.label}{isSel ? ', selected' : ''}"
                        onmousedown={(e) => onEdgeMousedown(e, edge.id)}
                    >
                        <!-- Invisible wide hit target -->
                        <line
                            x1={sc.x} y1={sc.y} x2={tc.x} y2={tc.y}
                            stroke="transparent" stroke-width="12"
                        />
                        <line
                            x1={sc.x} y1={sc.y} x2={tc.x} y2={tc.y}
                            stroke={isSel ? 'var(--dn-accent)' : 'var(--dn-text-muted)'}
                            stroke-width={isSel ? 2.5 : 1.5}
                            marker-end={isSel ? 'url(#dn-arrow-sel)' : 'url(#dn-arrow)'}
                        />
                        {#if edge.direction || edge.label}
                            <text
                                x={mx} y={my - 6}
                                class="edge-label"
                                text-anchor="middle"
                                fill={isSel ? 'var(--dn-accent)' : 'var(--dn-text-muted)'}
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
                {@const isSel = selectedNodeIds.has(node.id)}
                {@const isEntry = node.id === entryNodeId}
                {@const cx = node.x + node.width / 2}
                {@const cy = node.y + node.height / 2}
                <g
                    class="node"
                    class:selected={isSel}
                    role="button"
                    tabindex="-1"
                    aria-label="{node.label}{isEntry ? ', entry node' : ''}{node.isCluster ? ', cluster node' : ''}{isSel ? ', selected' : ''}"
                    onmousedown={(e) => onNodeMousedown(e, node.id)}
                >
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
                        <rect
                            x={node.x + 5} y={node.y + 5}
                            width={node.width} height={node.height}
                            fill={node.renderProperties.fill}
                            stroke="var(--dn-border)"
                            stroke-width="1.5"
                            rx="4"
                            opacity="0.5"
                        />
                    {/if}

                    <!-- Main shape -->
                    {#if node.renderProperties.shape === 'ellipse'}
                        <ellipse
                            {cx} {cy}
                            rx={node.width / 2} ry={node.height / 2}
                            fill={node.renderProperties.fill}
                            stroke={isSel ? 'var(--dn-accent)' : 'var(--dn-border)'}
                            stroke-width="1.5"
                            opacity={node.renderProperties.opacity}
                        />
                    {:else}
                        <rect
                            x={node.x} y={node.y}
                            width={node.width} height={node.height}
                            fill={node.renderProperties.fill}
                            stroke={isSel ? 'var(--dn-accent)' : 'var(--dn-border)'}
                            stroke-width="1.5"
                            rx="4"
                            opacity={node.renderProperties.opacity}
                        />
                    {/if}

                    <!-- Label -->
                    <text
                        x={cx} y={cy}
                        text-anchor="middle"
                        dominant-baseline="middle"
                        font-size="13"
                        font-family="var(--dn-font)"
                        font-weight="500"
                        fill="var(--dn-text)"
                        pointer-events="none"
                    >
                        {node.label}{node.isCluster && node.clusterCount != null ? ` (${node.clusterCount})` : ''}
                    </text>

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

    .mode-hint {
        font-size: 0.8125rem;
        color: var(--dn-accent);
        font-style: italic;
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

    :global(.edge) {
        cursor: pointer;
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
        position: fixed;
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
        color: var(--dn-text-muted);
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
        color: var(--dn-text-muted);
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
        color: var(--dn-text-muted);
        text-align: center;
        font-family: var(--dn-font-mono);
        letter-spacing: 0.03em;
    }
</style>
