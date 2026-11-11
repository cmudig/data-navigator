<script lang="ts">
    import { app, edit, fitView, levelTools, select, shapeOf } from '../../model/state.svelte';
    import type { GNode } from '../../model/state.svelte';
    import type { Geo } from '../../model/doc';
    import { addNode, deleteSelection, drawEdge, newGeo, setPaths } from '../../model/edits';
    import { shiftPath } from '../../runtime/dn-runtime.js';
    import ScaffoldOverlay from './scaffold/ScaffoldOverlay.svelte';

    const { canvas }: { canvas: 'editor' | 'viewer' } = $props();
    const editor = $derived(canvas === 'editor');

    type Dir = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
    type Pt = { x: number; y: number };
    type Gesture =
        | { kind: 'pan'; sx: number; sy: number; tx: number; ty: number }
        | { kind: 'lasso'; a: Pt; b: Pt; add: boolean }
        | { kind: 'drag'; ids: string[]; s: Pt; dx: number; dy: number; moved: boolean; clicked: string; add: boolean }
        | { kind: 'resize'; id: string; dir: Dir; s: Pt; start: Geo; geo: Geo }
        | { kind: 'edge'; from: string; at: Pt; moved: boolean }
        | { kind: 'pen'; pts: Pt[] };
    const DIRS: Dir[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

    let svgEl = $state<SVGSVGElement>();
    let sceneEl = $state<SVGGElement>();
    let svgW = $state(0);
    let svgH = $state(0);
    let g = $state<Gesture | null>(null);
    let edgeSource = $state<string | null>(null);
    let targets = $state<string[]>([]);

    const tools = $derived(app.ui.tools);
    const tool = $derived(editor ? (app.ui.space ? 'pan' : app.ui.tool) : 'view');
    const vbW = $derived(app.size.width);
    const vbH = $derived(app.size.height);
    const fit = $derived(Math.min(svgW / vbW, svgH / vbH) || 1);
    const t = $derived(editor ? app.ui.view : { tx: (svgW - vbW * fit) / 2, ty: (svgH - vbH * fit) / 2, scale: fit });
    const selected = $derived(new Set(app.ui.selected));
    const selectedEdges = $derived(new Set(app.ui.selectedEdges));
    const ordering = $derived(editor ? app.ui.ordering : null);
    const pen = $derived(editor ? app.ui.pen : null);
    let penAt = $state<Pt | null>(null);
    const backfill = (id: string) => tools[levelTools(app.tree.level[id])?.[1] ?? 'nodeBackfillColor'];

    $effect(() => {
        if (!editor) return;
        Object.assign(app.ui.view, { w: svgW, h: svgH, cw: vbW, ch: vbH });
    });
    let fitted = false;
    $effect(() => {
        if (editor && svgW > 0 && svgH > 0 && !fitted) (fitted = true), fitView();
    });

    const geoOf = (n: GNode): Geo => {
        if (g?.kind === 'resize' && g.id === n.id) return g.geo;
        if (g?.kind === 'drag' && g.moved && g.ids.includes(n.id))
            return { ...n.geo, x: n.geo.x + g.dx, y: n.geo.y + g.dy, ...(n.geo.path ? { path: shiftPath(n.geo.path, g.dx, g.dy) } : {}) };
        return n.geo;
    };
    const nodeList = $derived([...app.graph.nodes.values()].map(n => ({ ...n, geo: geoOf(n) })));
    const byId = $derived(new Map(nodeList.map(n => [n.id, n])));
    const hidden = $derived(new Set(nodeList.filter(n => !tools.showAllNodes || !(tools[levelTools(app.tree.level[n.id])?.[0] ?? 'showAllNodes'])).map(n => n.id)));
    const visible = $derived(nodeList.filter(n => !hidden.has(n.id)));
    // Containers paint first so their fill never covers the nodes inside them.
    const painted = $derived([...visible].sort((a, b) => (app.tree.level[a.id] ?? 9) - (app.tree.level[b.id] ?? 9)));
    const edgeList = $derived(
        [...app.graph.edges.values()].filter(e => tools.showEdges && !tools.hiddenEdgeTypes.includes(e.rules[0]) && !hidden.has(e.source) && !hidden.has(e.target))
    );

    const center = (q: Geo) => ({ x: q.x + q.width / 2, y: q.y + q.height / 2 });
    const inside = (p: Pt, q: Geo) => p.x >= q.x && p.x <= q.x + q.width && p.y >= q.y && p.y <= q.y + q.height;
    const overlaps = (a: Geo, b: Geo) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
    const area = (q: Geo) => q.width * q.height;
    // Edges are hit-tested under the nodes but painted above them, so filled nodes never hide an edge.
    const edgeShapes = $derived(
        edgeList.flatMap(edge => {
            const src = byId.get(edge.source);
            const tgt = byId.get(edge.target);
            if (!src || !tgt) return [];
            const [a, b] = [center(src.geo), center(tgt.geo)];
            const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
            const mx = (a.x + b.x) / 2 + ((b.y - a.y) / len) * 30;
            const my = (a.y + b.y) / 2 - ((b.x - a.x) / len) * 30;
            const curved = edge.rules.length > 1;
            const sel = selectedEdges.has(edge.id);
            return [{ edge, src, tgt, sel, curved, d: curved ? `M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}` : `M ${a.x} ${a.y} L ${b.x} ${b.y}`, lx: (a.x + 2 * mx + b.x) / 4, ly: (a.y + 2 * my + b.y) / 4, col: sel ? 'var(--dn-accent)' : (tools.edgeTypeColors[edge.rules[0]] ?? tools.edgeColor) }];
        })
    );
    const within = (p: Pt, id: string) => {
        const el = svgEl?.querySelector<SVGGeometryElement>(`[data-node="${CSS.escape(id)}"] .shape`);
        return el ? el.isPointInFill(new DOMPoint(p.x, p.y)) || el.isPointInStroke(new DOMPoint(p.x, p.y)) : false;
    };
    const under = (p: Pt, skip: string[] = []) =>
        visible.filter(n => !skip.includes(n.id) && inside(p, n.geo) && within(p, n.id)).sort((a, b) => area(a.geo) - area(b.geo));
    const nodeAt = (p: Pt, skip: string[] = []) => under(p, skip)[0]?.id ?? null;
    const box = (a: Pt, b: Pt) => ({ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.abs(b.x - a.x), height: Math.abs(b.y - a.y) });
    const toggle = (cur: Set<string>, ids: string[]) => {
        const out = new Set(cur);
        for (const id of ids) out.has(id) ? out.delete(id) : out.add(id);
        return [...out];
    };

    function toScene(e: { clientX: number; clientY: number }): Pt {
        const ctm = sceneEl?.getScreenCTM();
        if (!svgEl || !ctm) return { x: 0, y: 0 };
        const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
        return { x: p.x, y: p.y };
    }
    const delta = (dx: number, dy: number) => {
        const a = (svgEl?.getScreenCTM()?.a ?? 1) * t.scale;
        return { dx: dx / a, dy: dy / a };
    };

    function setGeo(d: Parameters<Parameters<typeof edit>[1]>[0], id: string, geo: Geo) {
        if (d.overrides.added.nodes[id]) d.overrides.added.nodes[id].geo = geo;
        else d.overrides.nodes[id] = { ...d.overrides.nodes[id], geo };
    }

    // The pen adds a point per click. Clicking the first point closes the shape; Escape keeps it open. Both save it.
    const nearStart = (p: Pt) => !!pen && pen.pts.length > 2 && Math.hypot(p.x - pen.pts[0].x, p.y - pen.pts[0].y) <= 8 * k;
    function finishPen(closed: boolean) {
        const cur = app.ui.pen;
        app.ui.pen = null;
        penAt = null;
        if (!cur || cur.pts.length < 2) return void (app.ui.live = 'Pen off. A path needs at least two points.');
        const r = (v: number) => Math.round(v * 10) / 10;
        setPaths({ [cur.id]: cur.pts.map((q, i) => `${i ? 'L' : 'M'} ${r(q.x)} ${r(q.y)}`).join(' ') + (closed ? ' Z' : '') }, 'Drew path');
        app.ui.absolute = [...new Set([...app.ui.absolute, cur.id])];
        select([cur.id]);
        app.ui.live = `Saved a ${closed ? 'closed' : 'open'} path with ${cur.pts.length} points.`;
    }

    function down(e: PointerEvent, id: string | null = null, edgeId: string | null = null) {
        if (e.button === 2) return;
        e.stopPropagation();
        svgEl?.focus({ preventScroll: true, focusVisible: false } as FocusOptions);
        const p = toScene(e);
        if (!editor) {
            if (edgeId) select([], e.shiftKey ? toggle(selectedEdges, [edgeId]) : [edgeId]);
            else if (id) select(e.shiftKey ? toggle(selected, [id]) : [id], e.shiftKey ? [...selectedEdges] : []);
            return;
        }
        svgEl?.setPointerCapture(e.pointerId);
        if (ordering?.mode === 'draw') return void (g = { kind: 'pen', pts: [p] });
        if (ordering?.mode === 'click') {
            const hit = nodeAt(p);
            if (hit && ordering.ids.includes(hit) && !ordering.order.includes(hit)) ordering.order = [...ordering.order, hit];
            return;
        }
        if (e.button === 1 || tool === 'pan') return void (g = { kind: 'pan', sx: e.clientX, sy: e.clientY, tx: t.tx, ty: t.ty });
        if (pen) return void (nearStart(p) ? finishPen(true) : (app.ui.pen!.pts = [...pen.pts, p]));
        if (tool === 'addNode') return void addNode(newGeo(p));
        if (tool === 'addEdge') {
            const from = id ?? nodeAt(p);
            if (from) g = { kind: 'edge', from, at: p, moved: false };
            else edgeSource = null;
            return;
        }
        if (tool === 'selectEdges' && edgeId) return select([], e.shiftKey ? toggle(selectedEdges, [edgeId]) : [edgeId]);
        if (tool === 'selectNodes' && id) {
            const ids = selected.has(id) && !e.shiftKey ? [...selected] : [id];
            return void (g = { kind: 'drag', ids, s: { x: e.clientX, y: e.clientY }, dx: 0, dy: 0, moved: false, clicked: id, add: e.shiftKey });
        }
        g = { kind: 'lasso', a: p, b: p, add: e.shiftKey };
    }

    function move(e: PointerEvent) {
        if (pen) penAt = toScene(e);
        if (!g) return;
        const p = toScene(e);
        if (g.kind === 'pan') {
            const a = svgEl?.getScreenCTM()?.a ?? 1;
            app.ui.view.tx = g.tx + (e.clientX - g.sx) / a;
            app.ui.view.ty = g.ty + (e.clientY - g.sy) / a;
        } else if (g.kind === 'lasso') g.b = p;
        else if (g.kind === 'pen') g.pts = [...g.pts, p];
        else if (g.kind === 'edge') (g.at = p), (g.moved = true);
        else if (g.kind === 'resize') {
            const { dx, dy } = delta(e.clientX - g.s.x, e.clientY - g.s.y);
            const s = g.start;
            const q = { ...s };
            if (g.dir.includes('w')) (q.width = Math.max(20, s.width - dx)), (q.x = s.x + s.width - q.width);
            if (g.dir.includes('e')) q.width = Math.max(20, s.width + dx);
            if (g.dir.includes('n')) (q.height = Math.max(20, s.height - dy)), (q.y = s.y + s.height - q.height);
            if (g.dir.includes('s')) q.height = Math.max(20, s.height + dy);
            g.geo = q;
        } else if (g.kind === 'drag') {
            if (!g.moved && Math.hypot(e.clientX - g.s.x, e.clientY - g.s.y) < 4) return;
            Object.assign(g, delta(e.clientX - g.s.x, e.clientY - g.s.y), { moved: true });
            const id = g.ids[0];
            const solo = g.ids.length === 1 && app.graph.nodes.get(id)?.kind === 'manual';
            targets = solo ? under(p, [id]).map(n => n.id) : [];
        }
    }

    function up(e: PointerEvent) {
        const cur = g;
        g = null;
        if (!cur) return;
        const p = toScene(e);
        if (cur.kind === 'lasso') {
            const b = box(cur.a, cur.b);
            if (b.width < 3 && b.height < 3) return cur.add || select();
            const ns = tool === 'selectNodes' ? visible.filter(n => overlaps(b, n.geo)).map(n => n.id) : [];
            const es = tool === 'selectEdges' ? edgeList.filter(x => {
                const s = byId.get(x.source);
                const d = byId.get(x.target);
                return s && d && inside({ x: (center(s.geo).x + center(d.geo).x) / 2, y: (center(s.geo).y + center(d.geo).y) / 2 }, b);
            }).map(x => x.id) : [];
            if (cur.add) select(toggle(selected, ns), toggle(selectedEdges, es));
            else select(ns, es);
            app.ui.live = `Selected ${app.ui.selected.length} nodes and ${app.ui.selectedEdges.length} edges.`;
        } else if (cur.kind === 'pen' && ordering) {
            const hits: string[] = [];
            for (const q of cur.pts) {
                const id = ordering.ids.find(i => !hits.includes(i) && inside(q, byId.get(i)!.geo));
                if (id) hits.push(id);
            }
            if (hits.length === ordering.ids.length) ordering.order = hits;
            else app.ui.live = `The line missed ${ordering.ids.length - hits.length} of the nodes. Draw through every selected node.`;
        } else if (cur.kind === 'edge') {
            const to = nodeAt(p, [cur.from]);
            if (cur.moved && to) drawEdge(cur.from, to);
            else if (!cur.moved && edgeSource && edgeSource !== cur.from) {
                drawEdge(edgeSource, cur.from);
                edgeSource = null;
            } else if (!cur.moved) edgeSource = cur.from;
        } else if (cur.kind === 'resize') {
            if (cur.geo !== cur.start) edit('Resized node', d => setGeo(d, cur.id, { ...cur.geo }));
        } else if (cur.kind === 'drag') {
            const hits = targets;
            targets = [];
            if (!cur.moved) return select(cur.add ? toggle(selected, [cur.clicked]) : [cur.clicked]);
            edit(cur.ids.length > 1 ? `Moved ${cur.ids.length} nodes` : 'Moved node', d => {
                for (const id of cur.ids) {
                    const q = app.graph.nodes.get(id)!.geo;
                    setGeo(d, id, { ...q, x: q.x + cur.dx, y: q.y + cur.dy, ...(q.path ? { path: shiftPath(q.path, cur.dx, cur.dy) } : {}) });
                }
            });
            if (hits.length) app.ui.connect = { id: cur.ids[0], targets: hits };
        }
    }

    function cycle(step: number) {
        if (!visible.length) return;
        const i = visible.findIndex(n => n.id === app.ui.selected.at(-1));
        const next = visible[(i + step + visible.length) % visible.length].id;
        select(tool === 'addEdge' && edgeSource ? [edgeSource, next] : [next]);
        app.ui.hovered = next;
        app.ui.live = `${byId.get(next)?.name}${app.missing.has(next) ? ', missing description' : ''}`;
    }

    function key(e: KeyboardEvent) {
        if (!editor) return;
        if (e.key === 'Escape' && pen) finishPen(false);
        else if (e.key === 'Escape') {
            if (g || edgeSource || targets.length) (g = null), (edgeSource = null), (targets = []);
            else select();
        } else if (e.key.toLowerCase() === 'a' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            select(visible.map(n => n.id), edgeList.map(x => x.id));
        } else if (e.key === 'Delete' || e.key === 'Backspace') deleteSelection(app.ui.selected, app.ui.selectedEdges);
        else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') (e.preventDefault(), cycle(1));
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') (e.preventDefault(), cycle(-1));
        else if (e.key === 'Enter' && tool === 'addNode') {
            addNode(newGeo({ x: (svgW / 2 - t.tx) / t.scale, y: (svgH / 2 - t.ty) / t.scale }));
        } else if (e.key === 'Enter' && tool === 'addEdge') {
            const cur = app.ui.selected.at(-1);
            if (!edgeSource) (edgeSource = cur ?? null), (app.ui.live = cur ? `Edge starts at ${byId.get(cur)?.name}. Use arrow keys to pick the target, then press Enter.` : 'Select a node first.');
            else if (cur && cur !== edgeSource) (drawEdge(edgeSource, cur), (edgeSource = null));
        }
    }

    const handles = (q: Geo) => {
        const at: Record<Dir, Pt> = { nw: { x: q.x, y: q.y }, n: { x: q.x + q.width / 2, y: q.y }, ne: { x: q.x + q.width, y: q.y }, e: { x: q.x + q.width, y: q.y + q.height / 2 }, se: { x: q.x + q.width, y: q.y + q.height }, s: { x: q.x + q.width / 2, y: q.y + q.height }, sw: { x: q.x, y: q.y + q.height }, w: { x: q.x, y: q.y + q.height / 2 } };
        return DIRS.map(dir => ({ dir, ...at[dir] }));
    };
    const dash = (d: string) => (d === 'dashed' ? '6 3' : d === 'dotted' ? '2 2' : undefined);
    const star = (x: number, y: number, r: number) =>
        Array.from({ length: 10 }, (_, i) => {
            const a = (Math.PI / 5) * i - Math.PI / 2;
            const rr = i % 2 ? r * 0.45 : r;
            return `${x + rr * Math.cos(a)},${y + rr * Math.sin(a)}`;
        }).join(' ');
    const edgeOn = $derived(!editor || tool === 'selectEdges');
    const k = $derived(1 / t.scale);
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions, a11y_no_noninteractive_tabindex -->
<svg
    bind:this={svgEl}
    bind:clientWidth={svgW}
    bind:clientHeight={svgH}
    viewBox="0 0 {svgW || vbW} {svgH || vbH}"
    role="application"
    tabindex="0"
    aria-label={editor ? 'Spatial view. Arrow keys move between nodes, Enter uses the current tool, Delete removes the selection.' : 'Spatial view preview. Click a node to select it.'}
    class="spatial"
    class:viewer={!editor}
    class:penning={!!pen}
    data-tool={tool}
    style={g?.kind === 'resize' ? `cursor: ${g.dir}-resize` : ''}
    onpointerdown={e => down(e)}
    onpointermove={move}
    onpointerup={up}
    onpointercancel={() => (g = null)}
    onkeydown={key}
>
    <defs>
        <marker id="dn-arrow-{canvas}" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="context-stroke" /></marker>
    </defs>
    <g bind:this={sceneEl} transform="translate({t.tx} {t.ty}) scale({t.scale})">
        {#if app.doc.image}
            <image href={app.doc.image.url} x="0" y="0" width={vbW} height={vbH} opacity={tools.imageOpacity} preserveAspectRatio="xMidYMid meet" aria-hidden="true" />
        {:else}
            <rect class="canvas-bg" x="0" y="0" width={vbW} height={vbH} />
        {/if}

        <g class="edge-layer" class:inert={!edgeOn}>
            {#each edgeShapes as { edge, src, tgt, sel, d } (edge.id)}
                <g
                    class="edge"
                    role="button"
                    tabindex="-1"
                    aria-label="Edge {edge.rules.join(' and ')} from {src.name} to {tgt.name}{sel ? ', selected' : ''}"
                    onpointerdown={e => edgeOn && down(e, null, edge.id)}
                    onpointerenter={() => (app.ui.hoveredEdge = edge.id)}
                    onpointerleave={() => (app.ui.hoveredEdge = null)}
                >
                    <path {d} fill="none" stroke="transparent" stroke-width={12 * k} />
                </g>
            {/each}
        </g>

        <g class="node-layer">
            {#each painted as node (node.id)}
                {@const q = node.geo}
                {@const st = node.style}
                {@const isSel = selected.has(node.id)}
                {@const shape = shapeOf(node)}
                {@const cx = q.x + q.width / 2}
                {@const cy = q.y + q.height / 2}
                {@const fill = st.fillEnabled ? st.fill : backfill(node.id)}
                {@const stroke = isSel ? 'var(--dn-select)' : st.strokeColor}
                {@const sw = (isSel ? 4 : st.strokeWidth) * (editor ? 1 : k)}
                {@const missing = editor && app.missing.has(node.id)}
                {@const halo = isSel && selected.size > 1 ? sw + 4 * (editor ? 1 : k) : 0}
                <g
                    class="node"
                    data-node={node.id}
                    class:hovered={app.ui.hovered === node.id && !isSel}
                    class:source={edgeSource === node.id}
                    role="button"
                    tabindex="-1"
                    aria-label="{node.name}{node.id === app.entry ? ', entry node' : ''}{missing ? ', missing description' : ''}{isSel ? ', selected' : ''}"
                    onpointerdown={e => down(e, node.id)}
                    onpointerenter={() => (app.ui.hovered = node.id)}
                    onpointerleave={() => (app.ui.hovered = null)}
                >
                    {#if halo && shape === 'ellipse'}<ellipse class="halo" {cx} {cy} rx={q.width / 2} ry={q.height / 2} stroke-width={halo} />
                    {:else if halo && shape === 'path'}<path class="halo" d={q.path} stroke-width={halo} />
                    {:else if halo}<rect class="halo" x={q.x} y={q.y} width={q.width} height={q.height} rx="4" stroke-width={halo} />{/if}
                    {#if shape === 'ellipse'}
                        <ellipse class="shape" {cx} {cy} rx={q.width / 2} ry={q.height / 2} {fill} fill-opacity={tools.nodeFillOpacity} {stroke} stroke-width={sw} stroke-dasharray={dash(st.strokeDash)} opacity={st.opacity} />
                    {:else if shape === 'path'}
                        <path class="shape" d={q.path} {fill} fill-opacity={tools.nodeFillOpacity} pointer-events={node.kind === 'manual' ? 'visiblePainted' : 'visibleStroke'} {stroke} stroke-width={sw} stroke-dasharray={dash(st.strokeDash)} opacity={st.opacity} />
                    {:else}
                        <rect class="shape" x={q.x} y={q.y} width={q.width} height={q.height} {fill} fill-opacity={tools.nodeFillOpacity} {stroke} stroke-width={sw} stroke-dasharray={dash(st.strokeDash)} rx="4" opacity={st.opacity} />
                    {/if}
                    {#if targets.includes(node.id)}
                        {@const pad = 6 * k}
                        {#if shape === 'path'}
                            <path
                                class="drop-target"
                                d={q.path ?? ''}
                                transform="translate({cx} {cy}) scale({(q.width + 2 * pad) / q.width} {(q.height + 2 * pad) / q.height}) translate({-cx} {-cy})"
                                vector-effect="non-scaling-stroke" stroke-dasharray="{4 * k} {3 * k}"
                            />
                        {:else if shape === 'ellipse'}
                            <ellipse class="drop-target" {cx} {cy} rx={q.width / 2 + pad} ry={q.height / 2 + pad} vector-effect="non-scaling-stroke" stroke-dasharray="{4 * k} {3 * k}" />
                        {:else}
                            <rect class="drop-target" x={q.x - pad} y={q.y - pad} width={q.width + 2 * pad} height={q.height + 2 * pad} rx="6" vector-effect="non-scaling-stroke" stroke-dasharray="{4 * k} {3 * k}" />
                        {/if}
                    {/if}
                    {#if missing}
                        <polygon class="missing" points={star(q.x + q.width, q.y, 8 * k)} stroke-width={1.5 * k} aria-hidden="true" />
                    {/if}
                    {#if ordering?.order.includes(node.id)}
                        <g class="badge" aria-hidden="true">
                            <circle cx={cx} cy={q.y - 14 * k} r={10 * k} />
                            <text x={cx} y={q.y - 14 * k} font-size={11 * k}>{ordering.order.indexOf(node.id) + 1}</text>
                        </g>
                    {/if}
                    {#if editor && !pen && tool === 'selectNodes' && isSel && selected.size === 1 && shape !== 'path'}
                        {#each handles(q) as h (h.dir)}
                            <rect
                                class="resize-handle"
                                x={h.x - 4 * k}
                                y={h.y - 4 * k}
                                width={8 * k}
                                height={8 * k}
                                stroke-width={1.5 * k}
                                style="cursor: {h.dir}-resize"
                                aria-hidden="true"
                                onpointerdown={e => {
                                    e.stopPropagation();
                                    svgEl?.setPointerCapture(e.pointerId);
                                    g = { kind: 'resize', id: node.id, dir: h.dir, s: { x: e.clientX, y: e.clientY }, start: node.geo, geo: node.geo };
                                }}
                            />
                        {/each}
                    {/if}
                </g>
            {/each}
        </g>

        <g class="paint" aria-hidden="true">
            {#each edgeShapes as { edge, sel, curved, d, lx, ly, col } (edge.id)}
                <path {d} class:hovered={app.ui.hoveredEdge === edge.id} fill="none" stroke={col} stroke-width={(sel ? 3 : 1.5) * k} stroke-dasharray={curved ? undefined : `${4 * k} ${2 * k}`} marker-end="url(#dn-arrow-{canvas})" />
                {#if tools.showEdgeLabels}<text x={lx} y={ly} class="edge-label" font-size={11 * k} fill={col}>{edge.rules.join(' / ')}</text>{/if}
            {/each}
            {#each visible as node (node.id)}
                {@const q = node.geo}
                {#if tools.showNodeLabels}
                    <text x={q.x + q.width / 2} y={q.y + q.height / 2} class="node-label" font-size={12 * (editor ? 1 : k)} fill={tools.nodeLabelColor} stroke={tools.nodeLabelOutlineColor}>{node.name}</text>
                {/if}
                {#if node.id === app.entry}<text x={q.x + 2} y={q.y - 4 * k} font-size={11 * k} fill="var(--dn-accent)">▶ entry</text>{/if}
            {/each}
        </g>

        {#if pen}
            {@const pts = penAt ? [...pen.pts, penAt] : pen.pts}
            {#if pts.length > 1}<polyline class="pen-line" points={pts.map(q => `${q.x},${q.y}`).join(' ')} stroke-width={2 * k} />{/if}
            {#each pen.pts as q, i (i)}
                <circle class="pen-pt" class:hot={i === 0 && !!penAt && nearStart(penAt)} cx={q.x} cy={q.y} r={(i ? 3 : 5) * k} stroke-width={1.5 * k} />
            {/each}
        {/if}

        {#if g?.kind === 'edge' && g.moved && byId.get(g.from)}
            {@const c = center(byId.get(g.from)!.geo)}
            <line x1={c.x} y1={c.y} x2={g.at.x} y2={g.at.y} class="draft" stroke-width={1.5 * k} pointer-events="none" />
        {/if}
        {#if g?.kind === 'lasso'}
            {@const b = box(g.a, g.b)}
            <rect class="lasso" x={b.x} y={b.y} width={b.width} height={b.height} stroke-width={1.5 * k} pointer-events="none" />
        {/if}
        {#if g?.kind === 'pen'}
            <polyline class="pen" points={g.pts.map(p => `${p.x},${p.y}`).join(' ')} stroke-width={3 * k} pointer-events="none" />
        {/if}
        {#if editor && app.ui.scaffoldMode}
            <ScaffoldOverlay scale={t.scale} />
        {/if}
    </g>
</svg>

<style>
    .spatial {
        width: 100%;
        height: 100%;
        min-height: 0;
        flex: 1;
        display: block;
        background: var(--dn-surface);
        border: 1px solid var(--dn-border);
        border-radius: var(--dn-radius);
        user-select: none;
        touch-action: none;
    }

    .spatial[data-tool='addNode'] { cursor: crosshair; }
    .spatial[data-tool='addEdge'] { cursor: cell; }
    .spatial[data-tool='pan'] { cursor: grab; }
    .spatial[data-tool='pan']:active { cursor: grabbing; }
    .spatial.viewer { border: none; border-radius: 0; }

    .inert {
        pointer-events: none;
    }

    :global(.canvas-bg) {
        fill: var(--dn-surface);
    }

    .node,
    .edge {
        cursor: pointer;
        outline: none;
    }

    .spatial[data-tool='addNode'] .node,
    .spatial[data-tool='pan'] .node {
        cursor: inherit;
    }

    .node.hovered .shape {
        stroke: var(--dn-accent-mid);
    }

    .node.source .shape {
        stroke: var(--dn-accent);
        stroke-dasharray: 6 3;
    }

    .paint,
    .halo,
    .pen-line,
    .pen-pt {
        pointer-events: none;
    }

    .halo {
        fill: none;
        stroke: var(--dn-select-halo);
    }

    .spatial.penning,
    .spatial.penning .node,
    .spatial.penning .edge {
        cursor: crosshair;
    }

    .pen-line {
        fill: none;
        stroke: var(--dn-accent);
    }

    .pen-pt {
        fill: var(--dn-bg);
        stroke: var(--dn-accent);
    }

    .pen-pt.hot {
        fill: var(--dn-accent);
    }

    .paint path.hovered {
        stroke: var(--dn-accent-mid);
    }

    .node-label {
        text-anchor: middle;
        dominant-baseline: middle;
        font-family: var(--dn-font);
        font-weight: 700;
        stroke-width: 3px;
        stroke-linejoin: round;
        paint-order: stroke;
        pointer-events: none;
    }

    .edge-label {
        text-anchor: middle;
        font-family: var(--dn-font);
        paint-order: stroke;
        stroke: var(--dn-bg);
        stroke-width: 2px;
    }

    .drop-target {
        fill: none;
        stroke: var(--dn-text);
        stroke-width: 1px;
        pointer-events: none;
    }

    .missing {
        fill: #c62828;
        stroke: #fff;
        pointer-events: none;
    }

    .badge circle {
        fill: var(--dn-accent);
    }

    .badge text {
        fill: #fff;
        text-anchor: middle;
        dominant-baseline: central;
        font-weight: 700;
        font-family: var(--dn-font);
    }

    .draft,
    .pen {
        stroke: var(--dn-accent);
        fill: none;
        stroke-dasharray: 6 3;
    }

    .pen {
        stroke-dasharray: none;
        stroke-linecap: round;
        stroke-linejoin: round;
        opacity: 0.7;
    }

    .lasso {
        fill: rgba(52, 81, 178, 0.08);
        stroke: var(--dn-accent);
        stroke-dasharray: 4 2;
    }

    .resize-handle {
        fill: var(--dn-bg);
        stroke: var(--dn-accent);
    }
</style>
