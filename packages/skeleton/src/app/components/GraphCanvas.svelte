<script lang="ts">
    import { untrack } from 'svelte';
    import { app, edit, select } from '../../model/state.svelte';
    import type { GNode, ToolOptions } from '../../model/state.svelte';
    import { newId, type Geo } from '../../model/doc';
    import { shiftPath } from '../../runtime/dn-runtime.js';
    import ScaffoldOverlay from './scaffold/ScaffoldOverlay.svelte';

    type Mode = 'select' | 'addNode' | 'addEdge' | 'pan';
    type HandleDir = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
    const HANDLES: HandleDir[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

    let svgEl: SVGSVGElement | undefined = $state();
    let sceneEl: SVGGElement | undefined = $state();
    let svgW = $state(0);
    let svgH = $state(0);
    let tx = $state(0);
    let ty = $state(0);
    let scale = $state(1);
    let zoomInput = $state(100);
    let mode = $state<Mode>('select');
    let isPanning = $state(false);
    let spaceDown = $state(false);
    let panStart = { x: 0, y: 0, tx: 0, ty: 0 };
    let drag = $state<{ ids: string[]; sx: number; sy: number; dx: number; dy: number; moved: boolean; clicked: string } | null>(null);
    let resize = $state<{ id: string; dir: HandleDir; sx: number; sy: number; start: Geo; geo: Geo } | null>(null);
    let lassoRect = $state<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
    let lassoAdditive = false;
    let activeTouchId: number | null = null;
    let selectFilter = $state<'nodes' | 'edges'>('nodes');
    let edgeSourceId = $state<string | null>(null);
    let addEdgePairs = $state(true);
    let edgeCursor = $state({ x: 0, y: 0 });
    let liveMsg = $state('');

    const tools = $derived(app.ui.tools);
    const nodes = $derived(app.graph.nodes);
    const edges = $derived(app.graph.edges);
    const selected = $derived(new Set(app.ui.selected));
    const selectedEdges = $derived(new Set(app.ui.selectedEdges));
    const imageDataUrl = $derived(app.doc.image?.url ?? null);
    const vbW = $derived(app.size.width);
    const vbH = $derived(app.size.height);
    const viewBox = $derived(svgW > 0 && svgH > 0 ? `0 0 ${svgW} ${svgH}` : `0 0 ${vbW} ${vbH}`);
    const hasLevels = $derived(app.doc.recipe.dimensions.length > 0);
    const levelShown: Record<string, keyof ToolOptions> = { root: 'showLevel0Node', dimension: 'showLevel1Nodes', division: 'showLevel2Nodes', leaf: 'showLevel3Nodes' };
    const levelFill: Record<string, keyof ToolOptions> = { root: 'level0BackfillColor', dimension: 'level1BackfillColor', division: 'level2BackfillColor', leaf: 'level3BackfillColor', manual: 'nodeBackfillColor' };

    const geoOf = (n: GNode): Geo => {
        if (resize?.id === n.id) return resize.geo;
        if (drag?.moved && drag.ids.includes(n.id)) {
            const g = n.geo;
            return { ...g, x: g.x + drag.dx, y: g.y + drag.dy, ...(g.path ? { path: shiftPath(g.path, drag.dx, drag.dy) } : {}) };
        }
        return n.geo;
    };
    const nodeList = $derived([...nodes.values()].map(n => ({ ...n, geo: geoOf(n) })));
    const byId = $derived(new Map(nodeList.map(n => [n.id, n])));
    const hidden = $derived(new Set(nodeList.filter(n => !tools.showAllNodes || (n.kind !== 'manual' && !tools[levelShown[n.kind]])).map(n => n.id)));
    const edgeTypes = $derived([...new Set([...edges.values()].map(e => e.rules[0]).filter(Boolean))]);
    const edgeList = $derived(
        [...edges.values()].filter(e => tools.showEdges && !tools.hiddenEdgeTypes.includes(e.rules[0]) && !hidden.has(e.source) && !hidden.has(e.target))
    );

    function setTool<K extends keyof ToolOptions>(key: K, value: ToolOptions[K]) {
        const t = app.ui.tools;
        if (key === 'nodeBackfillColor')
            for (const k of ['level0BackfillColor', 'level1BackfillColor', 'level2BackfillColor', 'level3BackfillColor'] as const)
                if (t[k] === t.nodeBackfillColor) t[k] = value as string;
        t[key] = value;
    }

    const toggleEdgeType = (type: string) =>
        (app.ui.tools.hiddenEdgeTypes = tools.hiddenEdgeTypes.includes(type) ? tools.hiddenEdgeTypes.filter(t => t !== type) : [...tools.hiddenEdgeTypes, type]);

    function clientToScene(x: number, y: number) {
        const ctm = sceneEl?.getScreenCTM();
        if (!svgEl || !ctm) return { x: 0, y: 0 };
        const pt = svgEl.createSVGPoint();
        pt.x = x;
        pt.y = y;
        const r = pt.matrixTransform(ctm.inverse());
        return { x: r.x, y: r.y };
    }
    const sceneDelta = (dx: number, dy: number) => {
        const a = svgEl?.getScreenCTM()?.a ?? 1;
        return { dx: dx / a / scale, dy: dy / a / scale };
    };
    const center = (g: Geo) => ({ x: g.x + g.width / 2, y: g.y + g.height / 2 });
    const overlaps = (a: Geo, b: Geo) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

    function handlePositions(g: Geo) {
        const { x, y, width: w, height: h } = g;
        const pos: Record<HandleDir, [number, number]> = { nw: [x, y], n: [x + w / 2, y], ne: [x + w, y], e: [x + w, y + h / 2], se: [x + w, y + h], s: [x + w / 2, y + h], sw: [x, y + h], w: [x, y + h / 2] };
        return HANDLES.map(dir => ({ dir, x: pos[dir][0], y: pos[dir][1] }));
    }

    function setGeo(d: Parameters<Parameters<typeof edit>[1]>[0], id: string, geo: Geo) {
        if (d.overrides.added.nodes[id]) d.overrides.added.nodes[id].geo = geo;
        else d.overrides.nodes[id] = { ...d.overrides.nodes[id], geo };
    }

    function addNodeAt(pt: { x: number; y: number }) {
        const id = newId('node', app.structure.nodes);
        const label = `Node ${Object.keys(app.doc.overrides.added.nodes).length + 1}`;
        edit('Added node', d => {
            d.overrides.added.nodes[id] = { label, geo: { x: pt.x - 60, y: pt.y - 30, width: 120, height: 60 } };
            if (!app.entry) d.entry = id;
        });
        select([id]);
        mode = 'select';
    }

    function addEdgeBetween(source: string, target: string) {
        const rules = addEdgePairs ? ['down', 'up'] : ['down'];
        const id = newId('edge', app.structure.edges);
        edit(addEdgePairs ? 'Added edge pair' : 'Added edge', d => {
            d.overrides.added.edges[id] = { source, target, rules };
        });
        edgeSourceId = null;
        mode = 'select';
    }

    function deleteSelection() {
        const ns = [...selected];
        const es = [...selectedEdges];
        if (!ns.length && !es.length) return;
        edit(`Deleted ${ns.length} node(s) and ${es.length} edge(s)`, d => {
            const ov = d.overrides;
            for (const id of ns) {
                if (ov.added.nodes[id]) {
                    delete ov.added.nodes[id];
                    for (const [eid, e] of Object.entries(ov.added.edges)) if (e.source === id || e.target === id) delete ov.added.edges[eid];
                } else ov.nodes[id] = { ...ov.nodes[id], removed: true };
                if (d.entry === id) d.entry = null;
            }
            for (const id of es) {
                if (ov.added.edges[id]) delete ov.added.edges[id];
                else ov.edges[id] = { ...ov.edges[id], removed: true };
            }
        });
        liveMsg = `Deleted ${ns.length} node(s) and ${es.length} edge(s).`;
        select();
    }

    function commitLasso() {
        if (!lassoRect) return;
        const box = { x: Math.min(lassoRect.x0, lassoRect.x1), y: Math.min(lassoRect.y0, lassoRect.y1), width: Math.abs(lassoRect.x1 - lassoRect.x0), height: Math.abs(lassoRect.y1 - lassoRect.y0) };
        lassoRect = null;
        if (box.width <= 2 && box.height <= 2) return select();
        const visible = nodeList.filter(n => !hidden.has(n.id));
        let ns: string[] = [];
        let es: string[] = [];
        if (selectFilter === 'nodes') {
            ns = visible.filter(n => overlaps(box, n.geo)).map(n => n.id);
            const hit = new Set(ns);
            es = edgeList.filter(e => hit.has(e.source) && hit.has(e.target)).map(e => e.id);
        } else {
            es = edgeList
                .filter(e => {
                    const a = byId.get(e.source);
                    const b = byId.get(e.target);
                    if (!a || !b) return false;
                    const m = { x: (center(a.geo).x + center(b.geo).x) / 2, y: (center(a.geo).y + center(b.geo).y) / 2 };
                    return m.x >= box.x && m.x <= box.x + box.width && m.y >= box.y && m.y <= box.y + box.height;
                })
                .map(e => e.id);
        }
        if (lassoAdditive) {
            const fresh = ns.some(id => !selected.has(id)) || es.some(id => !selectedEdges.has(id));
            const toggle = (cur: Set<string>, hit: string[]) => (fresh ? [...new Set([...cur, ...hit])] : [...cur].filter(id => !hit.includes(id)));
            select(toggle(selected, ns), toggle(selectedEdges, es));
        } else select(ns, es);
        liveMsg = `Selected ${app.ui.selected.length} node(s) and ${app.ui.selectedEdges.length} edge(s).`;
    }

    function onSvgMousedown(e: MouseEvent) {
        if (e.button === 1 || (e.button === 0 && (spaceDown || mode === 'pan'))) {
            isPanning = true;
            panStart = { x: e.clientX, y: e.clientY, tx, ty };
            e.preventDefault();
            return;
        }
        if (e.button !== 0) return;
        if (mode === 'addNode') addNodeAt(clientToScene(e.clientX, e.clientY));
        else if (mode === 'addEdge') {
            edgeSourceId = null;
            mode = 'select';
        } else if (mode === 'select') {
            const pt = clientToScene(e.clientX, e.clientY);
            lassoRect = { x0: pt.x, y0: pt.y, x1: pt.x, y1: pt.y };
            lassoAdditive = e.metaKey || e.ctrlKey;
        }
    }

    function onSvgMousemove(e: MouseEvent) {
        if (isPanning) {
            const a = svgEl?.getScreenCTM()?.a ?? 1;
            tx = panStart.tx + (e.clientX - panStart.x) / a;
            ty = panStart.ty + (e.clientY - panStart.y) / a;
        } else if (lassoRect) {
            const pt = clientToScene(e.clientX, e.clientY);
            lassoRect = { ...lassoRect, x1: pt.x, y1: pt.y };
        } else if (resize) {
            const { dx, dy } = sceneDelta(e.clientX - resize.sx, e.clientY - resize.sy);
            const s = resize.start;
            const g = { ...s };
            if (resize.dir.includes('w')) (g.width = Math.max(20, s.width - dx)), (g.x = s.x + s.width - g.width);
            if (resize.dir.includes('e')) g.width = Math.max(20, s.width + dx);
            if (resize.dir.includes('n')) (g.height = Math.max(20, s.height - dy)), (g.y = s.y + s.height - g.height);
            if (resize.dir.includes('s')) g.height = Math.max(20, s.height + dy);
            resize.geo = g;
        } else if (drag) {
            if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 4) return;
            const d = sceneDelta(e.clientX - drag.sx, e.clientY - drag.sy);
            drag.moved = true;
            drag.dx = d.dx;
            drag.dy = d.dy;
        } else if (mode === 'addEdge' && edgeSourceId) edgeCursor = clientToScene(e.clientX, e.clientY);
    }

    function finishPointer(e?: MouseEvent) {
        isPanning = false;
        if (resize) {
            const r = resize;
            resize = null;
            if (r.geo !== r.start) edit('Resized node', d => setGeo(d, r.id, r.geo));
        }
        if (lassoRect) commitLasso();
        if (!drag) return;
        const dr = drag;
        drag = null;
        if (dr.moved) {
            edit(dr.ids.length > 1 ? `Moved ${dr.ids.length} nodes` : 'Moved node', d => {
                for (const id of dr.ids) {
                    const g = nodes.get(id)!.geo;
                    setGeo(d, id, { ...g, x: g.x + dr.dx, y: g.y + dr.dy, ...(g.path ? { path: shiftPath(g.path, dr.dx, dr.dy) } : {}) });
                }
            });
        } else if (e && (e.metaKey || e.ctrlKey || e.shiftKey)) {
            const ids = new Set(selected);
            ids.has(dr.clicked) ? ids.delete(dr.clicked) : ids.add(dr.clicked);
            select([...ids], [...selectedEdges]);
        } else if (e) select([dr.clicked]);
    }

    function onNodeMousedown(e: MouseEvent, id: string) {
        if (e.button !== 0) return;
        e.stopPropagation();
        if (mode === 'addEdge') {
            if (!edgeSourceId) {
                edgeSourceId = id;
                edgeCursor = center(nodes.get(id)!.geo);
            } else if (edgeSourceId !== id) addEdgeBetween(edgeSourceId, id);
            return;
        }
        if (spaceDown || mode === 'pan') return;
        drag = { ids: selected.has(id) ? [...selected] : [id], sx: e.clientX, sy: e.clientY, dx: 0, dy: 0, moved: false, clicked: id };
    }

    function onHandleMousedown(e: MouseEvent, id: string, dir: HandleDir) {
        if (e.button !== 0) return;
        e.stopPropagation();
        const g = nodes.get(id)!.geo;
        resize = { id, dir, sx: e.clientX, sy: e.clientY, start: g, geo: g };
    }

    function onEdgeMousedown(e: MouseEvent, id: string) {
        e.stopPropagation();
        if (mode === 'addEdge' || e.button !== 0) return;
        if (!e.shiftKey) return select([], [id]);
        const ids = new Set(selectedEdges);
        ids.has(id) ? ids.delete(id) : ids.add(id);
        select([...selected], [...ids]);
    }

    function cycle(step: number) {
        const list = nodeList.filter(n => !hidden.has(n.id));
        if (!list.length) return;
        const i = list.findIndex(n => n.id === app.ui.selected[0]);
        const next = list[(i + step + list.length) % list.length].id;
        select([next]);
        app.ui.hovered = next;
    }

    function onSvgKeydown(e: KeyboardEvent) {
        if (e.key === ' ') {
            e.preventDefault();
            spaceDown = true;
        } else if (e.key === 'Escape') {
            if (lassoRect) lassoRect = null;
            else if (mode !== 'select' || edgeSourceId) (mode = 'select'), (edgeSourceId = null);
            else select();
        } else if (e.key.toLowerCase() === 'a' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            select(nodeList.filter(n => !hidden.has(n.id)).map(n => n.id), edgeList.map(e => e.id));
            liveMsg = `Selected all ${app.ui.selected.length} node(s) and ${app.ui.selectedEdges.length} edge(s).`;
        } else if (e.key === 'Delete' || e.key === 'Backspace') deleteSelection();
        else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') (e.preventDefault(), cycle(1));
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') (e.preventDefault(), cycle(-1));
    }

    function onTouchStart(e: TouchEvent) {
        if (e.touches.length !== 1 || mode !== 'select' || (e.target as Element).closest('.node, .edge')) return;
        const t = e.touches[0];
        activeTouchId = t.identifier;
        e.preventDefault();
        const pt = clientToScene(t.clientX, t.clientY);
        lassoRect = { x0: pt.x, y0: pt.y, x1: pt.x, y1: pt.y };
    }
    function onTouchMove(e: TouchEvent) {
        const t = [...e.changedTouches].find(t => t.identifier === activeTouchId);
        if (!t || !lassoRect) return;
        e.preventDefault();
        const pt = clientToScene(t.clientX, t.clientY);
        lassoRect = { ...lassoRect, x1: pt.x, y1: pt.y };
    }
    function onTouchEnd(e: TouchEvent) {
        if (![...e.changedTouches].some(t => t.identifier === activeTouchId)) return;
        activeTouchId = null;
        commitLasso();
    }

    function resetView() {
        const fit = svgW > 0 && svgH > 0 ? Math.min(svgW / vbW, svgH / vbH) : 1;
        tx = svgW > 0 ? (svgW - vbW * fit) / 2 : 0;
        ty = svgH > 0 ? (svgH - vbH * fit) / 2 : 0;
        scale = fit;
        zoomInput = Math.round(fit * 100);
    }
    let viewReady = false;
    $effect(() => {
        if (svgW > 0 && svgH > 0 && !viewReady) {
            viewReady = true;
            untrack(resetView);
        }
    });

    function applyZoom(percent: number) {
        const next = Math.max(10, Math.min(800, percent)) / 100;
        const r = svgEl?.getBoundingClientRect();
        const a = svgEl?.getScreenCTM()?.a ?? 1;
        if (r) {
            const c = { x: r.width / 2 / a, y: r.height / 2 / a };
            tx = c.x - (c.x - tx) * (next / scale);
            ty = c.y - (c.y - ty) * (next / scale);
        }
        scale = next;
        zoomInput = Math.round(next * 100);
    }

    function setMode(next: Mode) {
        mode = mode === next && next !== 'select' ? 'select' : next;
        edgeSourceId = null;
        lassoRect = null;
    }

    const dash = (d: string) => (d === 'dashed' ? '6 3' : d === 'dotted' ? '2 2' : undefined);
</script>

<div class="visually-hidden" aria-live="polite" aria-atomic="true">{liveMsg}</div>

<div class="canvas-toolbar" role="toolbar" aria-label="Canvas tools">
    {#each [['pan', 'Pan'], ['select', 'Select']] as [m, label] (m)}
        <button class="btn-ghost btn-sm" class:active={mode === m} type="button" aria-pressed={mode === m} onclick={() => setMode(m as Mode)}>{label}</button>
    {/each}
    <span class="select-filter" role="group" aria-label="Selection target">
        {#each ['nodes', 'edges'] as f (f)}
            <label class="filter-label" class:active={selectFilter === f}>
                <input type="radio" name="selectFilter" value={f} bind:group={selectFilter} />
                {f === 'nodes' ? 'Nodes' : 'Edges'}
            </label>
        {/each}
    </span>
    <span class="toolbar-sep" aria-hidden="true"></span>
    {#each [['addNode', '+ Node'], ['addEdge', '+ Edge']] as [m, label] (m)}
        <button class="btn-ghost btn-sm" class:active={mode === m} type="button" aria-pressed={mode === m} onclick={() => setMode(m as Mode)}>{label}</button>
    {/each}
    <label class="toolbar-option">
        <input type="checkbox" bind:checked={addEdgePairs} />
        Add pairs
    </label>
    <span class="toolbar-sep" aria-hidden="true"></span>
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
            onkeydown={e => e.key === 'Enter' && applyZoom(zoomInput)}
        />%
    </label>
    <button class="btn-ghost btn-sm" type="button" onclick={resetView}>Reset View</button>
    <span class="toolbar-sep" aria-hidden="true"></span>
    <div class="tool-options-wrapper">
        <details class="tool-options-dropdown">
            <summary class="btn-ghost btn-sm">Tool options</summary>
            <div class="tool-options-panel">
                <p class="tool-opt-heading">Labels</p>
                <table class="tool-opt-table">
                    <tbody>
                        {#each [['showNodeLabels', 'Node labels', 'nodeLabelColor', 'nodeLabelOutlineColor'], ['showEdgeLabels', 'Edge labels', 'edgeLabelColor', 'edgeLabelOutlineColor']] as [show, label, fg, outline] (show)}
                            <tr>
                                <td><input type="checkbox" checked={tools[show as 'showNodeLabels']} onchange={e => setTool(show as 'showNodeLabels', e.currentTarget.checked)} /></td>
                                <td>{label}</td>
                                <td>
                                    <div class="color-pair">
                                        <input type="color" class="tool-opt-color" title="Text color" value={tools[fg as 'nodeLabelColor']} oninput={e => setTool(fg as 'nodeLabelColor', e.currentTarget.value)} />
                                        <input type="color" class="tool-opt-color" title="Outline color" value={tools[outline as 'nodeLabelColor']} oninput={e => setTool(outline as 'nodeLabelColor', e.currentTarget.value)} />
                                    </div>
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>

                <p class="tool-opt-heading">Nodes</p>
                <p class="tool-opt-subtext">Fill is in the properties panel. Backfill color shown here does not appear in the rendered output.</p>
                <div class="tool-opt-slider-row">
                    <label for="tool-node-fill-opacity">
                        Fill opacity
                        <span class="tool-opt-note" aria-hidden="true">{tools.nodeFillOpacity.toFixed(2)}</span>
                    </label>
                    <input id="tool-node-fill-opacity" type="range" min="0" max="1" step="0.05" value={tools.nodeFillOpacity} oninput={e => setTool('nodeFillOpacity', parseFloat(e.currentTarget.value))} />
                </div>
                <table class="tool-opt-table">
                    <tbody>
                        <tr>
                            <td><input type="checkbox" checked={tools.showAllNodes} onchange={e => setTool('showAllNodes', e.currentTarget.checked)} /></td>
                            <td>All nodes</td>
                            <td><input type="color" class="tool-opt-color" title="Node backfill color" value={tools.nodeBackfillColor} oninput={e => setTool('nodeBackfillColor', e.currentTarget.value)} /></td>
                        </tr>
                        {#if hasLevels}
                            {#each ['root', 'dimension', 'division', 'leaf'] as kind, i (kind)}
                                {@const disabled = kind === 'root' && !app.doc.recipe.root.enabled}
                                <tr class:opt-disabled={disabled}>
                                    <td class="tool-opt-indent-cell"><input type="checkbox" {disabled} checked={!!tools[levelShown[kind]]} onchange={e => setTool(levelShown[kind], e.currentTarget.checked as never)} /></td>
                                    <td>Level {i} node{i ? 's' : ''}</td>
                                    <td><input type="color" class="tool-opt-color" title="Level {i} backfill color" value={tools[levelFill[kind]]} oninput={e => setTool(levelFill[kind], e.currentTarget.value as never)} /></td>
                                </tr>
                            {/each}
                        {/if}
                    </tbody>
                </table>

                <p class="tool-opt-heading">Edges</p>
                <table class="tool-opt-table">
                    <tbody>
                        <tr>
                            <td><input type="checkbox" checked={tools.showEdges} onchange={e => setTool('showEdges', e.currentTarget.checked)} /></td>
                            <td>All edges</td>
                            <td><input type="color" class="tool-opt-color" title="Edge color" value={tools.edgeColor} oninput={e => setTool('edgeColor', e.currentTarget.value)} /></td>
                        </tr>
                        {#each edgeTypes as type (type)}
                            <tr>
                                <td class="tool-opt-indent-cell"><input type="checkbox" checked={!tools.hiddenEdgeTypes.includes(type)} onchange={() => toggleEdgeType(type)} /></td>
                                <td>"{type}"</td>
                                <td>
                                    <input
                                        type="color"
                                        class="tool-opt-color"
                                        title="Color for {type} edges"
                                        value={tools.edgeTypeColors[type] ?? tools.edgeColor}
                                        oninput={e => (app.ui.tools.edgeTypeColors = { ...tools.edgeTypeColors, [type]: e.currentTarget.value })}
                                    />
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        </details>
    </div>
    {#if mode !== 'select'}
        <span class="mode-hint" aria-live="polite">
            {mode === 'addNode' ? 'Click canvas to place node' : mode === 'pan' ? 'Click and drag to pan the canvas' : edgeSourceId ? 'Click target node' : 'Click source node'}. Escape to cancel.
        </span>
    {/if}
</div>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions, a11y_no_noninteractive_tabindex -->
<svg
    bind:this={svgEl}
    bind:clientWidth={svgW}
    bind:clientHeight={svgH}
    {viewBox}
    role="application"
    tabindex="0"
    aria-label="Graph editor canvas. Use arrow keys to cycle nodes and Delete to remove the selection."
    class="graph-canvas"
    class:cursor-crosshair={mode === 'addNode'}
    class:cursor-lasso={!!lassoRect}
    class:cursor-cell={mode === 'addEdge'}
    class:cursor-grab={(spaceDown || mode === 'pan') && !isPanning}
    class:cursor-grabbing={isPanning}
    style={resize ? `cursor: ${resize.dir}-resize` : ''}
    onmousedown={onSvgMousedown}
    onmousemove={onSvgMousemove}
    onmouseup={finishPointer}
    onmouseleave={() => finishPointer()}
    onkeydown={onSvgKeydown}
    onkeyup={e => e.key === ' ' && (spaceDown = false)}
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
        {#if imageDataUrl}
            <image href={imageDataUrl} x="0" y="0" width={vbW} height={vbH} preserveAspectRatio="xMidYMid meet" aria-hidden="true" />
        {:else}
            <rect class="canvas-bg" x="0" y="0" width={vbW} height={vbH} />
        {/if}

        <g class="edge-layer">
            {#each edgeList as edge (edge.id)}
                {@const src = byId.get(edge.source)}
                {@const tgt = byId.get(edge.target)}
                {#if src && tgt}
                    {@const sc = center(src.geo)}
                    {@const tc = center(tgt.geo)}
                    {@const dx = tc.x - sc.x}
                    {@const dy = tc.y - sc.y}
                    {@const len = Math.hypot(dx, dy) || 1}
                    {@const mx = (sc.x + tc.x) / 2}
                    {@const my = (sc.y + tc.y) / 2}
                    {@const paired = edge.rules.length > 1}
                    {@const fwd = paired ? `M ${sc.x} ${sc.y} Q ${mx + (dy / len) * 30} ${my - (dx / len) * 30} ${tc.x} ${tc.y}` : `M ${sc.x} ${sc.y} L ${tc.x} ${tc.y}`}
                    {@const bwd = `M ${tc.x} ${tc.y} Q ${mx - (dy / len) * 30} ${my + (dx / len) * 30} ${sc.x} ${sc.y}`}
                    {@const isSel = selectedEdges.has(edge.id)}
                    {@const col = isSel ? 'var(--dn-accent)' : (tools.edgeTypeColors[edge.rules[0]] ?? tools.edgeColor)}
                    {@const marker = isSel ? 'url(#dn-arrow-sel)' : 'url(#dn-arrow)'}
                    <g
                        class="edge"
                        class:selected={isSel}
                        class:hovered={app.ui.hoveredEdge === edge.id && !isSel}
                        role="button"
                        tabindex="-1"
                        aria-label="Edge {edge.rules.join(' and ')} from {src.name} to {tgt.name}{isSel ? ', selected' : ''}"
                        onmousedown={e => onEdgeMousedown(e, edge.id)}
                        onmouseenter={() => (app.ui.hoveredEdge = edge.id)}
                        onmouseleave={() => (app.ui.hoveredEdge = null)}
                    >
                        <path d={fwd} fill="none" stroke="transparent" stroke-width="12" />
                        {#if paired}<path d={bwd} fill="none" stroke="transparent" stroke-width="12" />{/if}
                        <path d={fwd} fill="none" color={col} stroke={col} stroke-width={isSel ? 2.5 : 1.5} marker-end={marker} />
                        {#if paired}<path d={bwd} fill="none" color={col} stroke={col} stroke-width={isSel ? 2.5 : 1.5} marker-end={marker} />{/if}
                        {#if tools.showEdgeLabels}
                            <text
                                x={paired ? (sc.x + 2 * (mx + (dy / len) * 30) + tc.x) / 4 : mx}
                                y={(paired ? (sc.y + 2 * (my - (dx / len) * 30) + tc.y) / 4 : my) - 6}
                                class="edge-label"
                                text-anchor="middle"
                                fill={isSel ? 'var(--dn-accent)' : tools.edgeLabelColor}
                                stroke={tools.edgeLabelOutlineColor}
                                stroke-width="2"
                                paint-order="stroke"
                                font-size="11"
                                font-family="var(--dn-font)">{edge.rules.join(' / ')}</text
                            >
                        {/if}
                    </g>
                {/if}
            {/each}
        </g>

        <g class="node-layer">
            {#each nodeList as node (node.id)}
                {#if !hidden.has(node.id)}
                    {@const g = node.geo}
                    {@const st = node.style}
                    {@const isSel = selected.has(node.id)}
                    {@const isHov = app.ui.hovered === node.id && !isSel}
                    {@const isEntry = node.id === app.entry}
                    {@const shape = g.path ? 'path' : st.shape}
                    {@const cx = g.x + g.width / 2}
                    {@const cy = g.y + g.height / 2}
                    {@const back = tools[levelFill[node.kind]] as string}
                        {@const fill = st.fillEnabled ? st.fill : shape === 'path' ? 'none' : 'white'}
                        {@const fillOpacity = st.fillEnabled ? tools.nodeFillOpacity : 0}
                        {@const stroke = isSel ? 'var(--dn-accent)' : st.strokeColor}
                        {@const strokeWidth = isSel ? 2 : st.strokeWidth}
                    <g
                        class="node"
                        class:selected={isSel}
                        class:hovered={isHov}
                        role="button"
                        tabindex="-1"
                        aria-label="{node.name}{isEntry ? ', entry node' : ''}{isSel ? ', selected' : ''}"
                        onmousedown={e => onNodeMousedown(e, node.id)}
                        onmouseenter={() => (app.ui.hovered = node.id)}
                        onmouseleave={() => (app.ui.hovered = null)}
                    >
                        {#each [[isHov, 4, 'var(--dn-accent-mid)', '3 2', 1.5], [isSel, 5, 'var(--dn-accent)', '5 2', 2]] as [on, pad, stroke, dashes, width]}
                            {#if on}
                                {#if shape === 'ellipse'}
                                    <ellipse {cx} {cy} rx={g.width / 2 + +pad} ry={g.height / 2 + +pad} fill="none" stroke={String(stroke)} stroke-width={+width} stroke-dasharray={String(dashes)} />
                                {:else}
                                    <rect x={g.x - +pad} y={g.y - +pad} width={g.width + 2 * +pad} height={g.height + 2 * +pad} fill="none" stroke={String(stroke)} stroke-width={+width} stroke-dasharray={String(dashes)} rx="6" />
                                {/if}
                            {/if}
                        {/each}
                        {#if shape === 'ellipse'}
                            <ellipse {cx} {cy} rx={g.width / 2} ry={g.height / 2} fill={back} fill-opacity={tools.nodeFillOpacity} stroke="none" pointer-events="none" />
                        {:else if shape !== 'path'}
                            <rect x={g.x} y={g.y} width={g.width} height={g.height} fill={back} fill-opacity={tools.nodeFillOpacity} stroke="none" rx="4" pointer-events="none" />
                        {/if}
                        {#if shape === 'ellipse'}
                            <ellipse {cx} {cy} rx={g.width / 2} ry={g.height / 2} {fill} fill-opacity={fillOpacity} {stroke} stroke-width={strokeWidth} stroke-dasharray={dash(st.strokeDash)} opacity={st.opacity} />
                        {:else if shape === 'path'}
                            <path d={g.path ?? ''} {fill} fill-opacity={fillOpacity} {stroke} stroke-width={strokeWidth} stroke-dasharray={dash(st.strokeDash)} opacity={st.opacity} />
                        {:else}
                            <rect x={g.x} y={g.y} width={g.width} height={g.height} {fill} fill-opacity={fillOpacity} {stroke} stroke-width={strokeWidth} stroke-dasharray={dash(st.strokeDash)} rx="4" opacity={st.opacity} />
                        {/if}
                        {#if tools.showNodeLabels}
                            <text x={cx} y={cy} text-anchor="middle" dominant-baseline="middle" font-size="12" font-family="var(--dn-font)" font-weight="700" fill={tools.nodeLabelColor} stroke={tools.nodeLabelOutlineColor} stroke-width="3" stroke-linejoin="round" paint-order="stroke" pointer-events="none">{node.name}</text>
                        {/if}
                        {#if isEntry}
                            <text x={g.x + 4} y={g.y - 3} font-size="11" fill="var(--dn-accent)" pointer-events="none" aria-hidden="true">★</text>
                        {/if}
                        {#if isSel && selected.size === 1 && shape !== 'path'}
                            {@const hs = 8 / scale}
                            {#each handlePositions(g) as h (h.dir)}
                                <rect
                                    class="resize-handle"
                                    x={h.x - hs / 2}
                                    y={h.y - hs / 2}
                                    width={hs}
                                    height={hs}
                                    stroke-width={1.5 / scale}
                                    style="cursor: {h.dir}-resize"
                                    aria-hidden="true"
                                    onmousedown={e => onHandleMousedown(e, node.id, h.dir)}
                                />
                            {/each}
                        {/if}
                    </g>
                {/if}
            {/each}
        </g>

        {#if mode === 'addEdge' && edgeSourceId && byId.get(edgeSourceId)}
            {@const c = center(byId.get(edgeSourceId)!.geo)}
            <line x1={c.x} y1={c.y} x2={edgeCursor.x} y2={edgeCursor.y} stroke="var(--dn-accent)" stroke-width="1.5" stroke-dasharray="6 3" pointer-events="none" />
        {/if}

        {#if lassoRect}
            <rect
                class="lasso-rect"
                x={Math.min(lassoRect.x0, lassoRect.x1)}
                y={Math.min(lassoRect.y0, lassoRect.y1)}
                width={Math.abs(lassoRect.x1 - lassoRect.x0)}
                height={Math.abs(lassoRect.y1 - lassoRect.y0)}
                pointer-events="none"
            />
        {/if}

        {#if app.ui.scaffoldMode}
            <ScaffoldOverlay {scale} />
        {/if}
    </g>
</svg>

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
        min-height: 0;
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

    :global(.resize-handle) {
        fill: var(--dn-bg);
        stroke: var(--dn-accent);
    }

    :global(.resize-handle:hover) {
        fill: var(--dn-accent-soft);
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

    .tool-opt-slider-row {
        display: flex;
        flex-direction: column;
        gap: 2px;
        margin-bottom: 4px;
    }
    .tool-opt-slider-row label {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.8125rem;
        color: var(--dn-text);
    }
    .tool-opt-slider-row input[type="range"] {
        width: 100%;
        margin: 0;
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
