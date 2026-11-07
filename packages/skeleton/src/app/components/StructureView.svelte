<script lang="ts">
    import { untrack } from 'svelte';
    import { Inspector } from '@data-navigator/inspector';
    import { app, fitView, select } from '../../model/state.svelte';
    import { addNode, deleteSelection, drawEdge, groupKids, insertAt, reorder, reorderable } from '../../model/edits';

    const { canvas }: { canvas: 'editor' | 'viewer' } = $props();
    const editor = $derived(canvas === 'editor');
    const R = $derived(editor ? 9 : 6);
    type Pt = { x: number; y: number };
    type Gesture =
        | { kind: 'pan'; sx: number; sy: number; tx: number; ty: number }
        | { kind: 'lasso'; a: Pt; b: Pt; add: boolean }
        | { kind: 'move'; id: string; at: Pt; moved: boolean; add: boolean }
        | { kind: 'edge'; from: string; at: Pt; moved: boolean }
        | { kind: 'pen'; pts: Pt[] };

    let host = $state<HTMLDivElement>();
    let overlay = $state<SVGSVGElement>();
    let boxW = $state(0);
    let boxH = $state(0);
    let size = $state({ w: 0, h: 0 });
    let pos = $state<Record<string, Pt>>({});
    let edgePaths = $state<Record<string, { d: string; w: number }>>({});
    let g = $state<Gesture | null>(null);
    let hoverRow = $state<{ level: number; group?: string } | null>(null);
    let rowPick = $state<number | null>(null);
    let adding = $state<{ group: string; level: number } | null>(null);

    const s = $derived(app.structure);
    const t = $derived(app.tree);
    const tool = $derived(app.ui.space ? 'pan' : app.ui.tool);
    const selected = $derived(new Set(app.ui.selected));
    const selectedEdges = $derived(new Set(app.ui.selectedEdges));
    const ordering = $derived(editor ? app.ui.ordering : null);
    const hideLeaves = $derived(app.ui.schema.hideLeafNodes);
    const mode = $derived(editor ? 'tree' : app.ui.schema.graphMode);
    const sig = $derived(Object.keys(s.nodes).join() + '|' + Object.entries<any>(s.edges).map(([k, e]) => k + e.navigationRules).join() + mode + hideLeaves);

    let native = new Set<string>();

    function forInspector() {
        const rank: Record<string, number> = {};
        for (const kids of Object.values(t.children)) kids.forEach((k, i) => (rank[k] = i));
        const dims: Record<string, any> = { ...s.dimensions };
        native = new Set();
        const entries = Object.entries<any>(s.nodes)
            .filter(([, n]) => !hideLeaves || n.dimensionLevel !== undefined || n.manual)
            .map(([id, n]) => {
                if (!n.manual) return [id, n] as const;
                const lv = t.level[id];
                const pn = s.nodes[t.parent[id]];
                const div = lv >= 3 && pn?.dimensionLevel === 2 && Object.keys(dims).length === 1 && dims[pn.derivedNode]?.divisions[pn.id];
                if (div) {
                    const dim = dims[pn.derivedNode];
                    dims[pn.derivedNode] = { ...dim, divisions: { ...dim.divisions, [pn.id]: { ...div, values: { ...div.values, [id]: {} } } } };
                }
                const as =
                    lv === 1 && !pn
                        ? { dimensionLevel: 1 }
                        : lv === 1 && pn?.dimensionLevel === 0
                          ? { dimensionLevel: 1 }
                          : lv === 2 && pn?.dimensionLevel === 1
                            ? { dimensionLevel: 2, derivedNode: pn.derivedNode }
                            : div
                              ? { data: n.data ?? {} }
                              : null;
                if (as) native.add(id);
                return [id, { ...n, data: undefined, ...as }] as const;
            })
            .sort((a, b) => (rank[a[0]] ?? 0) - (rank[b[0]] ?? 0));
        return { ...s, dimensions: dims, nodes: Object.fromEntries(entries) };
    }

    function place(svg: SVGSVGElement, prefix: string) {
        const out: Record<string, Pt> = {};
        const fill: Record<number, string> = {};
        svg.querySelectorAll('circle').forEach(c => {
            const d = (c as any).__data__;
            if (!d?.id || !s.nodes[d.id] || (s.nodes[d.id].manual && !native.has(d.id))) return;
            out[d.id] = { x: d.x, y: d.y };
            fill[t.level[d.id] ?? 3] ??= c.getAttribute('fill') ?? '';
        });
        const rows: Record<number, number[]> = {};
        for (const id in out) (rows[t.level[id] ?? 3] ??= []).push(out[id].y);
        const rowY = (l: number): number => (rows[l]?.length ? rows[l].sort((a, b) => a - b)[rows[l].length >> 1] : l <= 0 ? 30 : rowY(l - 1) + 60);
        const gap = R * 3;
        const manual = Object.keys(s.nodes).filter(id => s.nodes[id].manual && !native.has(id) && (!hideLeaves || (t.level[id] ?? 0) < 3));
        for (let pass = 0; pass < 3; pass++)
            for (const id of manual) {
                if (out[id] && pass) continue;
                const grp = t.group(id);
                const sib = grp !== undefined ? t.children[grp] : [];
                const i = sib.indexOf(id);
                const prev = sib.slice(0, Math.max(0, i)).reverse().find(k => out[k]);
                const next = sib.slice(i + 1).find(k => out[k]);
                const level = t.level[id] ?? 1;
                const rowXs = Object.keys(out).filter(k => k !== id && Math.abs(out[k].y - rowY(level)) < 1).map(k => out[k].x);
                out[id] = prev
                    ? { x: out[prev].x + gap, y: out[prev].y }
                    : next
                      ? { x: out[next].x - gap, y: out[next].y }
                      : { x: (rowXs.length ? Math.max(...rowXs) : size.w / 2 - gap) + gap, y: rowY(level) };
            }
        for (const id of manual) {
            const c = svg.ownerDocument.getElementById(`${prefix}svg${id}`);
            c?.setAttribute('cx', String(out[id].x));
            c?.setAttribute('cy', String(out[id].y));
            if (fill[t.level[id] ?? 1]) c?.setAttribute('fill', fill[t.level[id] ?? 1]);
        }
        const paths: Record<string, { d: string; w: number }> = {};
        for (const [id, e] of Object.entries<any>(s.edges)) {
            const a = out[e.source];
            const b = out[e.target];
            if (!a || !b) continue;
            const line = svg.ownerDocument.getElementById(`${prefix}svgedge${e.source}-${e.target}`);
            const arc = e.navigationRules.map((r: string) => svg.ownerDocument.getElementById(`${prefix}svgedge${e.source}-${e.target}-${r}`)).find(Boolean);
            const patched = manual.includes(e.source) || manual.includes(e.target);
            if (line && patched) for (const [k, v] of [['x1', a.x], ['y1', a.y], ['x2', b.x], ['y2', b.y]] as const) line.setAttribute(k, String(v));
            if (arc && patched) arc.setAttribute('d', `M ${a.x} ${a.y} Q ${(a.x + b.x) / 2} ${Math.min(a.y, b.y) - 18} ${b.x} ${b.y}`);
            const el = line ?? arc;
            const w = parseFloat(el?.getAttribute('stroke-width') ?? (el ? getComputedStyle(el).strokeWidth : '') ?? '') || 1.5;
            paths[id] = { d: arc && !line ? arc.getAttribute('d')! : `M ${a.x} ${a.y} L ${b.x} ${b.y}`, w };
        }
        pos = out;
        edgePaths = paths;
    }

    let timer: ReturnType<typeof setTimeout>;
    $effect(() => {
        sig;
        const w = Math.round(boxW);
        const h = Math.round(boxH);
        const el = host;
        if (!el || w < 50 || h < 50) return;
        clearTimeout(timer);
        timer = setTimeout(() =>
            untrack(() => {
                el.innerHTML = '';
                if (!Object.keys(s.nodes).length) return;
                const ins = Inspector({ structure: forInspector(), container: el, size: { width: w, height: h }, mode, colorBy: 'dimensionLevel', nodeRadius: R });
                size = { w, h };
                const svg = el.querySelector('svg') as SVGSVGElement;
                if (mode === 'tree') place(svg, el.id + '-');
                if (!editor) wireViewer(el);
                if (editor) {
                    Object.assign(app.ui.view, { w: boxW, h: boxH, cw: w, ch: h });
                    if (!fitted) (fitted = true), fitView();
                }
                return ins;
            }), 60);
        return () => clearTimeout(timer);
    });
    let fitted = false;

    function wireViewer(el: HTMLElement) {
        el.querySelectorAll('circle').forEach(c => {
            const id = (c as any).__data__?.id;
            if (!id) return;
            (c as SVGElement).style.cursor = 'pointer';
            c.addEventListener('click', e => {
                const me = e as MouseEvent;
                if (!me.shiftKey && !me.metaKey && !me.ctrlKey) return select([id]);
                const ids = new Set(app.ui.selected);
                ids.has(id) ? ids.delete(id) : ids.add(id);
                select([...ids]);
            });
            c.addEventListener('mouseenter', () => (app.ui.hovered = id));
            c.addEventListener('mouseleave', () => (app.ui.hovered = null));
        });
    }

    $effect(() => {
        if (editor) return;
        const sel = selected;
        const hov = app.ui.hovered;
        sig;
        host?.querySelectorAll('circle').forEach(c => {
            const id = (c as any).__data__?.id;
            if (!id) return;
            const [stroke, width] = sel.has(id) ? ['var(--dn-accent)', '3'] : hov === id ? ['var(--dn-accent-mid)', '2.5'] : ['#fff', '1.5'];
            c.setAttribute('stroke', stroke);
            c.setAttribute('stroke-width', width);
        });
    });

    const ids = $derived(Object.keys(pos));
    const name = (id: string) => app.graph.nodes.get(id)?.name ?? id;
    const toggle = (cur: Set<string>, list: string[]) => {
        const out = new Set(cur);
        for (const id of list) out.has(id) ? out.delete(id) : out.add(id);
        return [...out];
    };
    const nodeAt = (p: Pt, skip?: string) => ids.find(id => id !== skip && Math.hypot(pos[id].x - p.x, pos[id].y - p.y) <= R + 4) ?? null;
    const box = (a: Pt, b: Pt) => ({ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) });

    const rows = $derived.by(() => {
        const out: Record<number, { y: number; groups: Record<string, [number, number]> }> = {};
        for (const id of ids) {
            const l = t.level[id];
            if (l === undefined || l < 1) continue;
            const row = (out[l] ??= { y: pos[id].y, groups: {} });
            const grp = t.group(id);
            if (grp === undefined) continue;
            const span = (row.groups[grp] ??= [pos[id].x, pos[id].x]);
            span[0] = Math.min(span[0], pos[id].x);
            span[1] = Math.max(span[1], pos[id].x);
        }
        return out;
    });

    function slotsFor(group: string, moving?: string) {
        const kids = groupKids(group).filter(k => pos[k]);
        if (!kids.length) return [];
        const gap = R * 3;
        const xs = kids.map(k => pos[k].x);
        const at = (i: number) => (i === 0 ? xs[0] - gap / 1.5 : i === kids.length ? xs[i - 1] + gap / 1.5 : (xs[i - 1] + xs[i]) / 2);
        const idx = moving ? kids.indexOf(moving) : -1;
        return Array.from({ length: kids.length + 1 }, (_, i) => ({ i, x: at(i), y: pos[kids[0]].y, label: i < kids.length ? `before ${name(kids[i])}` : `after ${name(kids.at(-1)!)}` })).filter(
            sl => idx < 0 || (sl.i !== idx && sl.i !== idx + 1)
        );
    }
    const single = $derived(app.ui.selected.length === 1 ? app.ui.selected[0] : null);
    const moveGroup = $derived(editor && tool === 'selectNodes' && single && reorderable(t.group(single)) ? t.group(single)! : null);
    const slots = $derived(adding ? slotsFor(adding.group) : moveGroup !== null && single ? slotsFor(moveGroup, single) : []);

    function useSlot(i: number) {
        if (adding) {
            const a = adding;
            const kids = groupKids(a.group);
            const ref = pos[kids[Math.min(i, kids.length - 1)]] ? app.graph.nodes.get(kids[Math.min(i, kids.length - 1)])?.geo : null;
            const id = addNode(ref ? { x: ref.x + ref.width + 10, y: ref.y, width: 80, height: 40 } : { x: 40, y: 40, width: 80, height: 40 }, a.level);
            insertAt(a.group, id, i);
            adding = null;
            return;
        }
        if (moveGroup === null || !single) return;
        const kids = groupKids(moveGroup).filter(k => k !== single);
        const from = groupKids(moveGroup).indexOf(single);
        kids.splice(i > from ? i - 1 : i, 0, single);
        reorder(moveGroup, kids);
    }

    function startAdd(group: string, level: number) {
        rowPick = null;
        adding = { group, level };
        if (level >= 3) useSlot(groupKids(group).length);
    }

    function toScene(e: { clientX: number; clientY: number }): Pt {
        const ctm = overlay?.getScreenCTM();
        if (!ctm) return { x: 0, y: 0 };
        const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
        return { x: p.x, y: p.y };
    }

    function rowAt(p: Pt) {
        for (const [l, row] of Object.entries(rows))
            if (Math.abs(p.y - row.y) <= R * 2.2) {
                const inGroups = Object.entries(row.groups).filter(([, [a, b]]) => p.x >= a - R * 2 && p.x <= b + R * 2);
                return { level: +l, group: inGroups.length === 1 ? inGroups[0][0] : undefined };
            }
        return null;
    }

    function down(e: PointerEvent) {
        if (e.button === 2) return;
        overlay?.focus({ preventScroll: true, focusVisible: false } as FocusOptions);
        overlay?.setPointerCapture(e.pointerId);
        const p = toScene(e);
        const hit = nodeAt(p);
        if (ordering?.mode === 'draw') return void (g = { kind: 'pen', pts: [p] });
        if (ordering?.mode === 'click') {
            if (hit && ordering.ids.includes(hit) && !ordering.order.includes(hit)) ordering.order = [...ordering.order, hit];
            return;
        }
        if (e.button === 1 || tool === 'pan') return void (g = { kind: 'pan', sx: e.clientX, sy: e.clientY, tx: app.ui.view.tx, ty: app.ui.view.ty });
        if (tool === 'addEdge') return void (hit && (g = { kind: 'edge', from: hit, at: p, moved: false }));
        if (tool === 'addNode') {
            const row = rowAt(p);
            if (!row) return void (rowPick = null);
            if (row.group !== undefined) startAdd(row.group, row.level);
            else (rowPick = row.level), (adding = null);
            return;
        }
        if (tool === 'selectNodes' && hit) return void (g = { kind: 'move', id: hit, at: p, moved: false, add: e.shiftKey });
        if (tool === 'selectNodes' || tool === 'selectEdges') g = { kind: 'lasso', a: p, b: p, add: e.shiftKey };
    }

    function move(e: PointerEvent) {
        const p = toScene(e);
        if (!g) {
            hoverRow = editor && tool === 'addNode' && !adding && rowPick === null ? rowAt(p) : null;
            return;
        }
        if (g.kind === 'pan') {
            app.ui.view.tx = g.tx + e.clientX - g.sx;
            app.ui.view.ty = g.ty + e.clientY - g.sy;
        } else if (g.kind === 'lasso') g.b = p;
        else if (g.kind === 'pen') g.pts = [...g.pts, p];
        else if (g.kind === 'edge' || g.kind === 'move') {
            g.moved ||= Math.hypot(p.x - g.at.x, p.y - g.at.y) > 4;
            g.at = p;
        }
    }

    function up(e: PointerEvent) {
        const cur = g;
        g = null;
        if (!cur) return;
        const p = toScene(e);
        if (cur.kind === 'lasso') {
            const b = box(cur.a, cur.b);
            if (b.w < 3 && b.h < 3) {
                const edge = tool === 'selectEdges' && (e.target as Element).closest?.('[data-edge]')?.getAttribute('data-edge');
                if (edge) return select([], cur.add ? toggle(selectedEdges, [edge]) : [edge]);
                return cur.add || select();
            }
            const inside = (q: Pt) => q.x >= b.x && q.x <= b.x + b.w && q.y >= b.y && q.y <= b.y + b.h;
            const ns = tool === 'selectNodes' ? ids.filter(id => inside(pos[id])) : [];
            const es =
                tool === 'selectEdges'
                    ? Object.keys(edgePaths).filter(id => {
                          const ed = s.edges[id];
                          return inside({ x: (pos[ed.source].x + pos[ed.target].x) / 2, y: (pos[ed.source].y + pos[ed.target].y) / 2 });
                      })
                    : [];
            cur.add ? select(toggle(selected, ns), toggle(selectedEdges, es)) : select(ns, es);
        } else if (cur.kind === 'pen' && ordering) {
            const hits: string[] = [];
            for (const q of cur.pts) {
                const id = ordering.ids.find(i => !hits.includes(i) && pos[i] && Math.hypot(pos[i].x - q.x, pos[i].y - q.y) <= R + 6);
                if (id) hits.push(id);
            }
            if (hits.length === ordering.ids.length) ordering.order = hits;
            else app.ui.live = `The line missed ${ordering.ids.length - hits.length} of the nodes. Draw through every selected node.`;
        } else if (cur.kind === 'edge') {
            const to = nodeAt(p, cur.from);
            if (cur.moved && to) drawEdge(cur.from, to);
        } else if (cur.kind === 'move') {
            if (!cur.moved) return select(cur.add ? toggle(selected, [cur.id]) : [cur.id]);
            const grp = t.group(cur.id);
            if (grp === undefined || !reorderable(grp)) return void (app.ui.live = 'This node cannot be reordered.');
            const near = slotsFor(grp, cur.id).sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x))[0];
            if (!near || Math.abs(near.y - p.y) > R * 4) return;
            select([cur.id]);
            useSlot(near.i);
        }
    }

    function key(e: KeyboardEvent) {
        if (e.key === 'Escape') {
            if (adding || rowPick !== null || g) (adding = null), (rowPick = null), (g = null);
            else select();
        } else if (e.key === 'Delete' || e.key === 'Backspace') deleteSelection(app.ui.selected, app.ui.selectedEdges);
        else if (e.key.startsWith('Arrow')) {
            e.preventDefault();
            const list = ids.filter(id => pos[id]).sort((a, b) => pos[a].y - pos[b].y || pos[a].x - pos[b].x);
            const i = list.indexOf(app.ui.selected.at(-1) ?? '');
            const next = list[(i + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1) + list.length) % list.length];
            if (next) select([next]), (app.ui.live = `${name(next)}${app.missing.has(next) ? ', missing description' : ''}`);
        }
    }

    const star = (x: number, y: number, r: number) =>
        Array.from({ length: 10 }, (_, i) => {
            const a = (Math.PI / 5) * i - Math.PI / 2;
            const rr = i % 2 ? r * 0.45 : r;
            return `${x + rr * Math.cos(a)},${y + rr * Math.sin(a)}`;
        }).join(' ');
    const v = $derived(editor ? app.ui.view : { tx: 0, ty: 0, scale: 1 });
</script>

<div class="structure" class:viewer={!editor} bind:clientWidth={boxW} bind:clientHeight={boxH}>
    <div class="stage" style="width: {size.w}px; height: {size.h}px; transform: translate({v.tx}px, {v.ty}px) scale({v.scale})">
        <div class="host" bind:this={host} class:passive={editor}></div>
        {#if editor && size.w}
            <!-- svelte-ignore a11y_no_noninteractive_element_interactions, a11y_no_noninteractive_tabindex -->
            <svg
                bind:this={overlay}
                class="overlay"
                data-tool={tool}
                width={size.w}
                height={size.h}
                viewBox="0 0 {size.w} {size.h}"
                role="application"
                tabindex="0"
                aria-label="Structure view. Arrow keys move between nodes. With Add node, click a row to add a node to that level."
                onpointerdown={down}
                onpointermove={move}
                onpointerup={up}
                onpointerleave={() => (hoverRow = null)}
                onkeydown={key}
            >
                {#if tool === 'addNode'}
                    {#each Object.entries(rows) as [l, row] (l)}
                        {@const lv = +l}
                        {@const on = hoverRow?.level === lv || rowPick === lv}
                        {@const xs = Object.values(row.groups).flat()}
                        <rect class="row" class:on x={Math.min(...xs) - R * 3} y={row.y - R * 2.2} width={Math.max(...xs) - Math.min(...xs) + R * 6} height={R * 4.4} rx={R * 2.2} />
                        {#if on && hoverRow?.group !== undefined && !rowPick}
                            {@const sp = row.groups[hoverRow.group]}
                            <rect class="row on" x={sp[0] - R * 2} y={row.y - R * 2} width={sp[1] - sp[0] + R * 4} height={R * 4} rx={R * 2} />
                        {/if}
                        {#if hoverRow?.level === lv && rowPick === null && !adding}
                            <text class="prompt" x={Math.min(...xs) - R * 3} y={row.y - R * 3}>Click to add a new node {hoverRow.group !== undefined ? `to ${name(hoverRow.group)}` : 'at this level'}</text>
                        {/if}
                        {#if rowPick === lv}
                            <text class="prompt" x={Math.min(...xs) - R * 3} y={row.y - R * 3}>Select node location, or add a new group +</text>
                            {#each Object.entries(row.groups) as [grp, [a, b]] (grp)}
                                <rect
                                    class="pick"
                                    x={a - R * 1.6}
                                    y={row.y - R * 1.8}
                                    width={b - a + R * 3.2}
                                    height={R * 3.6}
                                    rx={R * 1.8}
                                    role="button"
                                    tabindex="0"
                                    aria-label="Add to {name(grp)}"
                                    onpointerdown={e => (e.stopPropagation(), startAdd(grp, lv))}
                                    onkeydown={e => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), startAdd(grp, lv))}
                                />
                            {/each}
                            {@const nx = Math.max(...xs) + R * 5}
                            <g
                                class="plus"
                                role="button"
                                tabindex="0"
                                aria-label="Add a new group at this level"
                                onpointerdown={e => {
                                    e.stopPropagation();
                                    addNode({ x: 40, y: 40, width: 80, height: 40 }, lv);
                                    rowPick = null;
                                }}
                                onkeydown={e => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), addNode({ x: 40, y: 40, width: 80, height: 40 }, lv), (rowPick = null))}
                            >
                                <circle cx={nx} cy={row.y} r={R * 1.4} />
                                <text x={nx} y={row.y}>+</text>
                            </g>
                        {/if}
                    {/each}
                {/if}

                {#each Object.entries(edgePaths) as [id, p] (id)}
                    {@const ed = s.edges[id]}
                    {@const touch = ed && (selected.has(ed.source) || selected.has(ed.target))}
                    {@const near = ed && (app.ui.hovered === ed.source || app.ui.hovered === ed.target)}
                    {#if touch || near}
                        <path class="edge-near" d={p.d} stroke-width={p.w + (touch ? 1 : 0)} />
                    {/if}
                    <path class="edge-hit" class:sel={selectedEdges.has(id)} class:live={tool === 'selectEdges'} data-edge={id} d={p.d} />
                {/each}

                {#each ids as id (id)}
                    {@const p = pos[id]}
                    <circle class="ring" class:sel={selected.has(id)} class:hov={app.ui.hovered === id} cx={p.x} cy={p.y} r={R + 3}>
                        <title>{name(id)}</title>
                    </circle>
                    {#if app.missing.has(id)}<polygon class="missing" points={star(p.x + R, p.y - R, R * 0.9)} />{/if}
                    {#if ordering?.order.includes(id)}
                        <g class="badge"><circle cx={p.x} cy={p.y - R * 2.4} r={R} /><text x={p.x} y={p.y - R * 2.4}>{ordering.order.indexOf(id) + 1}</text></g>
                    {/if}
                {/each}

                {#each slots as sl (sl.i)}
                    <rect
                        class="slot"
                        x={sl.x - R * 0.8}
                        y={sl.y - R * 2}
                        width={R * 1.6}
                        height={R * 4}
                        rx={R * 0.8}
                        role="button"
                        tabindex="0"
                        aria-label="{adding ? 'Add new node' : `Move ${name(single ?? '')}`} {sl.label}"
                        onpointerdown={e => (e.stopPropagation(), useSlot(sl.i))}
                        onkeydown={e => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), useSlot(sl.i))}
                    />
                {/each}

                {#if g?.kind === 'edge' && g.moved}
                    <line class="draft" x1={pos[g.from].x} y1={pos[g.from].y} x2={g.at.x} y2={g.at.y} />
                {/if}
                {#if g?.kind === 'move' && g.moved}
                    <circle class="ghost" cx={g.at.x} cy={g.at.y} r={R} />
                {/if}
                {#if g?.kind === 'lasso'}
                    {@const b = box(g.a, g.b)}
                    <rect class="lasso" x={b.x} y={b.y} width={b.w} height={b.h} />
                {/if}
                {#if g?.kind === 'pen'}
                    <polyline class="pen" points={g.pts.map(q => `${q.x},${q.y}`).join(' ')} />
                {/if}
            </svg>
        {/if}
    </div>
    {#if !Object.keys(s.nodes).length}
        <p class="empty">{app.rows.length ? 'Choose a dimension to build the structure.' : 'Add data or nodes to see the structure.'}</p>
    {/if}
</div>

<style>
    .structure {
        position: relative;
        flex: 1;
        min-height: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background: var(--dn-surface);
        border: 1px solid var(--dn-border);
        border-radius: var(--dn-radius);
    }

    .structure.viewer {
        border: none;
        border-radius: 0;
        background: transparent;
    }

    .stage {
        position: absolute;
        left: 0;
        top: 0;
        transform-origin: 0 0;
    }

    .host,
    .overlay {
        position: absolute;
        inset: 0;
    }

    .host.passive {
        pointer-events: none;
    }

    .overlay {
        touch-action: none;
        user-select: none;
    }

    .overlay[data-tool='addNode'] { cursor: crosshair; }
    .overlay[data-tool='addEdge'] { cursor: cell; }
    .overlay[data-tool='pan'] { cursor: grab; }

    .ring {
        fill: transparent;
        stroke: transparent;
        stroke-width: 3;
        cursor: pointer;
    }

    .ring.hov { stroke: var(--dn-accent-mid); }
    .ring.sel { stroke: var(--dn-accent); }

    .edge-hit {
        fill: none;
        stroke: transparent;
        stroke-width: 10;
        pointer-events: none;
    }

    .edge-near {
        fill: none;
        stroke: var(--dn-text);
        stroke-opacity: 0.85;
        pointer-events: none;
    }

    .edge-hit.live { pointer-events: stroke; cursor: pointer; }
    .edge-hit.sel { stroke: var(--dn-accent); stroke-width: 3; }

    .row {
        fill: transparent;
        stroke: none;
    }

    .row.on {
        fill: color-mix(in srgb, var(--dn-accent-soft) 70%, transparent);
        stroke: var(--dn-accent-mid);
        stroke-width: 1.5;
        stroke-dasharray: 5 3;
    }

    .pick,
    .slot {
        fill: color-mix(in srgb, var(--dn-accent-soft) 80%, transparent);
        stroke: var(--dn-accent-mid);
        stroke-width: 1.5;
        stroke-dasharray: 4 3;
        cursor: pointer;
    }

    .pick:hover, .pick:focus-visible,
    .slot:hover, .slot:focus-visible {
        stroke: var(--dn-accent);
        stroke-width: 2.5;
        outline: none;
    }

    .plus circle {
        fill: var(--dn-accent-soft);
        stroke: var(--dn-accent-mid);
        stroke-dasharray: 4 3;
        stroke-width: 1.5;
    }

    .plus text,
    .badge text {
        text-anchor: middle;
        dominant-baseline: central;
        font-weight: 700;
        font-family: var(--dn-font);
        pointer-events: none;
    }

    .plus:focus-visible circle { stroke: var(--dn-accent); stroke-width: 2.5; }
    .plus { cursor: pointer; outline: none; }

    .prompt {
        font-family: var(--dn-font);
        font-weight: 700;
        font-size: 14px;
        fill: var(--dn-text);
        paint-order: stroke;
        stroke: var(--dn-bg);
        stroke-width: 4px;
        pointer-events: none;
    }

    .missing { fill: #c62828; stroke: #fff; stroke-width: 1.5; pointer-events: none; }
    .badge circle { fill: var(--dn-accent); }
    .badge text { fill: #fff; font-size: 11px; }
    .ghost { fill: var(--dn-accent-soft); stroke: var(--dn-accent); stroke-dasharray: 3 2; pointer-events: none; }
    .draft, .pen { stroke: var(--dn-accent); fill: none; stroke-width: 2; pointer-events: none; }
    .draft { stroke-dasharray: 6 3; }
    .lasso { fill: rgba(52, 81, 178, 0.08); stroke: var(--dn-accent); stroke-dasharray: 4 2; pointer-events: none; }

    .empty {
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
        margin: 0;
        color: var(--dn-text-muted);
        font-size: 0.875rem;
    }
</style>
