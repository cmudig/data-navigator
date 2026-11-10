<script lang="ts">
    import { untrack } from 'svelte';
    import { drawInspector } from '../../utils/inspectorLayout';
    import { app, fitView, select, undo } from '../../model/state.svelte';
    import { addNode, deleteSelection, drawEdge, edgesOf, groupKids, groupLevel, insertAt, moveInto, reorderable } from '../../model/edits';
    import Modal from './Modal.svelte';

    const { canvas }: { canvas: 'editor' | 'viewer' } = $props();
    const editor = $derived(canvas === 'editor');
    const R = $derived(editor ? 9 : 6);
    type Pt = { x: number; y: number };
    type Gesture =
        | { kind: 'pan'; sx: number; sy: number; tx: number; ty: number }
        | { kind: 'lasso'; a: Pt; b: Pt; add: boolean }
        | { kind: 'move'; id: string; ids: string[]; at: Pt; moved: boolean; add: boolean }
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
    type Slot = { group: string; i: number; x: number; y: number; label: string };
    let pending = $state<{ group: string; i: number; ids: string[]; shift: string[] } | null>(null);
    let moveDialog = $state<HTMLDialogElement>();
    let undoTip = $state.raw<{ doc: unknown; text: string } | null>(null);

    const s = $derived(app.structure);
    const t = $derived(app.tree);
    const tool = $derived(app.ui.space ? 'pan' : app.ui.tool);
    const selected = $derived(new Set(app.ui.selected));
    const selectedEdges = $derived(new Set(app.ui.selectedEdges));
    const ordering = $derived(editor ? app.ui.ordering : null);
    const hideLeaves = $derived(app.ui.schema.hideLeafNodes);
    const mode = $derived(editor ? 'tree' : app.ui.schema.graphMode);
    const sig = $derived(Object.keys(s.nodes).join() + '|' + Object.entries<any>(s.edges).map(([k, e]) => k + e.navigationRules).join() + mode + hideLeaves);

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
                const out = drawInspector(el, s, t, { width: w, height: h, mode, radius: R, hideLeaves });
                size = { w, h };
                pos = out.pos;
                edgePaths = out.paths;
                if (!editor) wireViewer(el);
                if (editor) {
                    Object.assign(app.ui.view, { w: boxW, h: boxH, cw: w, ch: h });
                    if (!fitted) (fitted = true), fitView();
                }
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

    function slotsFor(group: string, moving: string[] = []): Slot[] {
        const kids = groupKids(group).filter(k => pos[k]);
        if (!kids.length) return [];
        const gap = R * 3;
        const xs = kids.map(k => pos[k].x);
        const at = (i: number) => (i === 0 ? xs[0] - gap / 1.5 : i === kids.length ? xs[i - 1] + gap / 1.5 : (xs[i - 1] + xs[i]) / 2);
        const idx = moving.length === 1 ? kids.indexOf(moving[0]) : -1;
        return Array.from({ length: kids.length + 1 }, (_, i) => ({ group, i, x: at(i), y: pos[kids[0]].y, label: i < kids.length ? `before ${name(kids[i])}` : `after ${name(kids.at(-1)!)}` })).filter(
            sl => idx < 0 || (sl.i !== idx && sl.i !== idx + 1)
        );
    }
    const draggable = (id: string) => !!s.nodes[id] && (s.nodes[id].manual || s.nodes[id].dimensionLevel > 0);
    const inView = (list: string[]) => list.filter(id => pos[id]).sort((a, b) => pos[a].y - pos[b].y || pos[a].x - pos[b].x);
    const groupName = (grp: string) => (grp ? name(grp) : 'the top level');
    const dragging = $derived(g?.kind === 'move' && g.moved && g.ids.length ? g.ids : null);
    const dropSlots = $derived(
        dragging
            ? Object.keys(t.children)
                  .filter(grp => !dragging.includes(grp))
                  .flatMap(grp => {
                      const list = slotsFor(grp, dragging);
                      return (t.level[groupKids(grp)[0]] ?? 3) >= 3 ? list.slice(-1) : list;
                  })
            : []
    );
    const hot = $derived.by(() => {
        if (g?.kind !== 'move' || !dropSlots.length) return null;
        const at = g.at;
        let best: Slot | null = null;
        let bd = R * 4;
        for (const sl of dropSlots) {
            const d = Math.hypot(sl.x - at.x, sl.y - at.y);
            if (d < bd) (best = sl), (bd = d);
        }
        return best;
    });
    const moveGroup = $derived.by(() => {
        const sel = app.ui.selected;
        const grp = sel.length ? t.group(sel[0]) : undefined;
        return editor && tool === 'selectNodes' && grp !== undefined && reorderable(grp) && sel.every(id => t.group(id) === grp) ? grp : null;
    });
    const slots = $derived(adding ? slotsFor(adding.group) : dragging ? dropSlots : moveGroup !== null ? slotsFor(moveGroup, app.ui.selected) : []);
    const moving = $derived(dragging ?? app.ui.selected);

    function drop(group: string, i: number, list: string[]) {
        if (list.every(id => t.group(id) === group) && !reorderable(group)) return void (app.ui.live = 'This group keeps its own order.');
        const lv = groupLevel(group);
        const shift = list.filter(id => t.level[id] !== undefined && t.level[id] !== lv && t.group(id) !== group);
        if (shift.length) pending = { group, i, ids: list, shift };
        else finish(group, i, list);
    }

    function finish(group: string, i: number, list: string[]) {
        const cross = list.some(id => t.group(id) !== group);
        moveInto(group, i, list);
        if (cross) undoTip = { doc: app.doc, text: app.ui.live };
    }

    function useSlot(sl: Slot) {
        const i = sl.i;
        if (adding) {
            const a = adding;
            const kids = groupKids(a.group);
            const ref = pos[kids[Math.min(i, kids.length - 1)]] ? app.graph.nodes.get(kids[Math.min(i, kids.length - 1)])?.geo : null;
            const id = addNode(ref ? { x: ref.x + ref.width + 10, y: ref.y, width: 80, height: 40 } : { x: 40, y: 40, width: 80, height: 40 }, a.level);
            insertAt(a.group, id, i);
            adding = null;
            return;
        }
        if (moveGroup !== null) drop(moveGroup, i, inView(app.ui.selected));
    }

    function startAdd(group: string, level: number) {
        rowPick = null;
        adding = { group, level };
        if (level >= 3) useSlot({ group, i: groupKids(group).length, x: 0, y: 0, label: '' });
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
        if (tool === 'selectNodes' && hit) {
            const list = (selected.has(hit) && !e.shiftKey ? app.ui.selected : [hit]).filter(draggable);
            return void (g = { kind: 'move', id: hit, ids: list, at: p, moved: false, add: e.shiftKey });
        }
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
        const target = hot;
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
            if (!cur.ids.length) return void (app.ui.live = 'The root and data points cannot be moved.');
            if (target) drop(target.group, target.i, inView([...cur.ids]));
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

                {#each slots as sl (sl.group + ':' + sl.i)}
                    <rect
                        class="slot"
                        x={sl.x - R * 0.8}
                        y={sl.y - R * 2}
                        width={R * 1.6}
                        height={R * 4}
                        rx={R * 0.8}
                        role="button"
                        tabindex="0"
                        class:hot={hot === sl}
                        aria-label="{adding ? 'Add new node' : `Move ${moving.length === 1 ? name(moving[0]) : `${moving.length} nodes`}`} {sl.label}{sl.group !== moveGroup ? ` in ${groupName(sl.group)}` : ''}"
                        onpointerdown={e => (e.stopPropagation(), useSlot(sl))}
                        onkeydown={e => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), useSlot(sl))}
                    />
                {/each}

                {#if g?.kind === 'edge' && g.moved}
                    <line class="draft" x1={pos[g.from].x} y1={pos[g.from].y} x2={g.at.x} y2={g.at.y} />
                {/if}
                {#if g?.kind === 'move' && g.moved}
                    <circle class="ghost" cx={g.at.x} cy={g.at.y} r={R} />
                    {#if g.ids.length > 1}<g class="badge"><circle cx={g.at.x + R} cy={g.at.y - R} r={R} /><text x={g.at.x + R} y={g.at.y - R}>{g.ids.length}</text></g>{/if}
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
    {#if undoTip && undoTip.doc === app.doc}
        <div class="undo-tip" role="status">
            {undoTip.text}
            <button class="btn-ghost btn-sm" type="button" onclick={() => (undo(), (undoTip = null))}>Undo</button>
        </div>
    {/if}
    {#if !Object.keys(s.nodes).length}
        <p class="empty">{app.rows.length ? 'Choose a dimension to build the structure.' : 'Add data or nodes to see the structure.'}</p>
    {/if}
</div>

{#if pending}
    {@const m = pending}
    {@const lv = groupLevel(m.group)}
    <Modal title="Move {m.ids.length > 1 ? `${m.ids.length} nodes` : name(m.ids[0])} into {groupName(m.group)}?" onclose={() => (pending = null)} bind:dialog={moveDialog}>
        <p class="modal-desc">
            {m.shift.length > 1 ? 'These nodes change' : 'This node changes'} level. To keep the structure clear, {m.shift.length > 1 ? 'they lose' : 'it loses'} every edge,
            including links to children, and then {m.shift.length > 1 ? 'join' : 'joins'} {groupName(m.group)} as {m.shift.length > 1 ? 'siblings' : 'a sibling'}.
        </p>
        <ul class="modal-desc">
            {#each m.shift as id (id)}
                {@const n = edgesOf(id).length}
                <li>{name(id)}: level {t.level[id]} to level {lv}, {n} edge{n === 1 ? '' : 's'} removed</li>
            {/each}
        </ul>
        <p class="modal-desc">You can undo this right after.</p>
        {#snippet actions()}
            <button class="btn-ghost" type="button" onclick={() => moveDialog?.close()}>Cancel</button>
            <button class="btn-primary" type="button" onclick={() => (finish(m.group, m.i, m.ids), moveDialog?.close())}>Move and remove edges</button>
        {/snippet}
    </Modal>
{/if}

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
    .slot:hover, .slot:focus-visible, .slot.hot {
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

    .undo-tip {
        position: absolute;
        left: 50%;
        bottom: var(--dn-space);
        transform: translateX(-50%);
        display: flex;
        align-items: center;
        gap: var(--dn-space);
        padding: 4px 4px 4px calc(var(--dn-space) * 1.5);
        background: var(--dn-bg);
        border: 1px solid var(--dn-border);
        border-radius: var(--dn-radius);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        font-size: 0.8125rem;
    }

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
