<script lang="ts">
    import { tick } from 'svelte';
    import { app, edit, select, shapeOf } from '../../model/state.svelte';
    import type { Geo, LabelTemplate, Style } from '../../model/doc';
    import { shiftPath, templateFor } from '../../runtime/dn-runtime.js';
    import LabelBuilder from './prep/LabelBuilder.svelte';
    import { applyLevels, clearLevel, levelPlan, levelsInUse, parentGroup, pathBox, setGeos, setPaths, setStyles, structureOrder, toAbsolute, toShown, writeGeo } from '../../model/edits';
    import LevelModal from './LevelModal.svelte';

    const LEVEL: Record<string, 0 | 1 | 2 | 3> = { root: 0, dimension: 1, division: 2, leaf: 3, manual: 3 };
    const nodes = $derived(app.graph.nodes);
    const edges = $derived(app.graph.edges);
    const selNodes = $derived(app.ui.selected.map(id => nodes.get(id)).filter(n => !!n));
    const selEdges = $derived(app.ui.selectedEdges.map(id => edges.get(id)).filter(e => !!e));
    const maxLevel = $derived(Math.max(0, ...levelsInUse()));
    let levelAsk = $state<{ id: string; to: number } | null>(null);

    function askLevel(id: string, v: string) {
        if (v === 'none') return clearLevel(id);
        const plan = levelPlan(id, +v, 'level');
        if (Object.keys(plan.next).length > 1 || plan.skipped || plan.problem) levelAsk = { id, to: +v };
        else applyLevels(plan.next);
    }
    const node = $derived(selNodes.length === 1 && !selEdges.length ? selNodes[0] : undefined);
    const edge = $derived(selEdges.length === 1 && !selNodes.length ? selEdges[0] : undefined);
    const ov = $derived(app.doc.overrides);
    const keys = $derived(app.structure.navigationRules);
    let posUnit = $state<'px' | '%'>('px');
    let bulkTemplate = $state('');
    let addRule = $state('');
    let firstChild = $state('');
    let applyMsg = $state('');

    const toUnit = (v: number, axis: 'width' | 'height') => (posUnit === '%' ? Math.round((v / app.size[axis]) * 10000) / 100 : Math.round(v));
    const fromUnit = (v: number, axis: 'width' | 'height') => (posUnit === '%' ? (v / 100) * app.size[axis] : v);

    const template = $derived(node ? (templateFor(app.structure.nodes[node.id], app.pattern, app.structure.context) as LabelTemplate) : null);
    const isManual = $derived(node?.kind === 'manual');

    function setGeo(patch: Partial<Geo>) {
        const id = node!.id;
        const g = node!.geo;
        const geo = { ...g, ...patch };
        if (g.path && patch.path === undefined) geo.path = shiftPath(g.path, geo.x - g.x, geo.y - g.y);
        if (!geo.path) delete geo.path;
        edit('Moved node', d => (d.overrides.added.nodes[id] ? (d.overrides.added.nodes[id].geo = geo) : (d.overrides.nodes[id] = { ...d.overrides.nodes[id], geo })), true);
    }
    const unpin = (id: string) => edit('Reset node position', d => delete d.overrides.nodes[id].geo);

    // Rendering fields edit every selected node at once.
    const ids = $derived(selNodes.map(n => n.id));
    const list = $derived(selNodes);
    const one = $derived(list.length === 1 ? list[0] : null);
    const many = $derived(list.length > 1);
    const same = <T,>(f: (n: (typeof list)[number]) => T): T | undefined => {
        const v = list.map(f);
        return v.every(x => x === v[0]) ? v[0] : undefined;
    };
    const style = <K extends keyof Style>(k: K) => same(n => n.style[k]);
    const shape = $derived(list.every(n => n.geo.path || n.style.shape === 'path') ? 'path' : same(shapeOf));
    const relative = $derived(!ids.every(id => app.ui.absolute.includes(id)));
    const shown = $derived(same(n => toShown(n.geo, relative)) ?? '');
    let note = $state('');
    $effect(() => void (ids.join(), (note = '')));

    function setShapes(s: Style['shape']) {
        edit(many ? `Changed shape of ${ids.length} nodes` : 'Changed shape', d => {
            for (const n of list) {
                // A box keeps the path's bounds and drops the path, so the export matches the canvas.
                if (s !== 'path' && n.geo.path) writeGeo(d, n.id, { x: n.geo.x, y: n.geo.y, width: n.geo.width, height: n.geo.height });
                d.overrides.nodes[n.id] = { ...d.overrides.nodes[n.id], style: { ...d.overrides.nodes[n.id]?.style, shape: s } };
            }
        });
    }

    const setRelative = (on: boolean) => (app.ui.absolute = on ? app.ui.absolute.filter(id => !ids.includes(id)) : [...new Set([...app.ui.absolute, ...ids])]);
    const fits = (b: ReturnType<typeof pathBox>) => !!b && b.x >= -1 && b.y >= -1 && b.x + b.width <= app.size.width + 1 && b.y + b.height <= app.size.height + 1;

    function commitPath(text: string) {
        text = text.trim();
        note = '';
        if (!text) return setGeos(ids, () => ({ path: '' }), 'Cleared path');
        let rel = relative;
        // With one node, read the path whichever way lands it on the image.
        if (one && !fits(pathBox(toAbsolute(text, one.geo, rel))) && fits(pathBox(toAbsolute(text, one.geo, !rel)))) {
            rel = !rel;
            setRelative(rel);
            note = rel ? "Read as relative to the node's x and y, since that keeps it on the image." : 'Read as positions on the image, since that keeps it on the image.';
        }
        const paths = Object.fromEntries(list.map(n => [n.id, toAbsolute(text, n.geo, rel)]));
        if (Object.values(paths).some(p => !pathBox(p))) return void (note = 'This path data could not be read. Check that it starts with M.');
        setPaths(paths);
    }

    async function draw() {
        app.ui.swapped = false;
        app.ui.pen = { id: one!.id, pts: [] };
        app.ui.live = 'Pen on. Click the canvas to add points. Click the first point to close the shape, or press Escape to finish.';
        await tick();
        document.querySelector<SVGElement>('.editor-canvas svg.spatial')?.focus();
    }
    function setTemplate(t: LabelTemplate) {
        const id = node!.id;
        edit('Edited node label', d => (d.overrides.added.nodes[id] ? (d.overrides.added.nodes[id].label = t.template) : (d.overrides.nodes[id] = { ...d.overrides.nodes[id], semantics: t })), true);
    }
    const resetTemplate = (id: string) => edit('Reset node label', d => delete d.overrides.nodes[id].semantics);
    const setEntry = (id: string, on: boolean) => edit('Set entry node', d => (d.entry = on ? id : d.entry === id ? null : d.entry));

    let idError = $state('');
    function rename(oldId: string, next: string) {
        next = next.trim();
        idError = '';
        if (!next || next === oldId) return;
        if (app.structure.nodes[next]) return (idError = `"${next}" is already used by another node.`);
        edit('Renamed node', d => {
            const a = d.overrides.added;
            a.nodes[next] = a.nodes[oldId];
            delete a.nodes[oldId];
            for (const e of Object.values(a.edges)) {
                if (e.source === oldId) e.source = next;
                if (e.target === oldId) e.target = next;
            }
            if (d.entry === oldId) d.entry = next;
        });
        select([next]);
    }

    function setData(id: string, data: Record<string, unknown>) {
        edit('Edited node data', d => (d.overrides.added.nodes[id].data = data), true);
    }

    const parseRules = (s: string) => s.split(/[\s,]+/).map(r => r.trim()).filter(Boolean);
    function setRules(ids: string[], rules: string[]) {
        if (!rules.length) return;
        edit(ids.length > 1 ? `Set rules on ${ids.length} edges` : 'Edited edge rules', d => {
            for (const id of ids) {
                if (d.overrides.added.edges[id]) d.overrides.added.edges[id].rules = rules;
                else d.overrides.edges[id] = { ...d.overrides.edges[id], rules };
            }
        });
        applyMsg = `Applied to ${ids.length} edge${ids.length > 1 ? 's' : ''}.`;
    }
    const groups = $derived(Object.entries(Object.groupBy(selEdges, e => e.rules.join(', '))).map(([sig, es]) => ({ sig, ids: es!.map(e => e.id), rules: es![0].rules })));
    const fan = $derived.by(() => {
        if (selEdges.length < 2 || selNodes.length) return null;
        const side = selEdges.every(e => e.source === selEdges[0].source) ? 0 : selEdges.every(e => e.target === selEdges[0].target) ? 1 : -1;
        if (side < 0) return null;
        const hub = side ? selEdges[0].target : selEdges[0].source;
        const kids = selEdges.map(e => (side ? e.source : e.target));
        return new Set(kids).size === kids.length ? { hub, kids: structureOrder(kids) } : null;
    });
    const setKey = (name: string, patch: Partial<{ key: string; direction: 'source' | 'target' }>) =>
        edit('Updated key', d => (d.recipe.keys[name] = { key: keys[name]?.key ?? '', direction: keys[name]?.direction ?? 'target', ...patch }), true);
    function appendRule(ids: string[], rule: string) {
        if (!rule.trim()) return;
        edit(`Added rule to ${ids.length} edges`, d => {
            for (const id of ids) {
                const rules = [...new Set([...edges.get(id)!.rules, rule.trim()])];
                if (d.overrides.added.edges[id]) d.overrides.added.edges[id].rules = rules;
                else d.overrides.edges[id] = { ...d.overrides.edges[id], rules };
            }
        });
        addRule = '';
        applyMsg = `Added "${rule}" to ${ids.length} edges.`;
    }
    const connectTo = (id: string) =>
        (app.ui.connect = { id, targets: [...nodes.values()].filter(n => n.id !== id && n.kind !== 'leaf').map(n => n.id) });

    function bulkLabel() {
        const ids = selNodes.map(n => n.id);
        edit(`Set label on ${ids.length} nodes`, d => {
            for (const id of ids) {
                if (d.overrides.added.nodes[id]) d.overrides.added.nodes[id].label = bulkTemplate;
                else d.overrides.nodes[id] = { ...d.overrides.nodes[id], semantics: { ...d.overrides.nodes[id]?.semantics, template: bulkTemplate } };
            }
        });
        applyMsg = `Applied to ${ids.length} nodes.`;
    }
    const clearOrphans = () =>
        edit('Cleared stale edits', d => {
            for (const id of app.orphans) {
                delete d.overrides.nodes[id];
                delete d.overrides.edges[id];
                delete d.overrides.added.edges[id];
            }
        });
</script>

{#snippet rulesEditor(ids: string[], rules: string[], uid: string)}
    {@const first = edges.get(ids[0])}
    <div class="field">
        <label for="rules-{uid}">Navigation rules <span class="field-sub">(comma-separated)</span></label>
        {#key ids.join() + rules.join()}
            <input id="rules-{uid}" type="text" value={rules.join(', ')} onchange={e => setRules(ids, parseRules(e.currentTarget.value))} />
        {/key}
    </div>
    <ul class="kv-list" aria-label="Keys for these rules">
        {#each rules as r (r)}
            <li class="kv-row rule-row">
                <span class="kv-input">{r}</span>
                <label class="visually-hidden" for="key-{uid}-{r}">Key for {r}</label>
                <input id="key-{uid}-{r}" class="kv-input" type="text" placeholder="no key" value={keys[r]?.key ?? ''} aria-invalid={!keys[r]?.key} onchange={e => setKey(r, { key: e.currentTarget.value })} />
                <label class="visually-hidden" for="dir-{uid}-{r}">Where {r} goes</label>
                <select id="dir-{uid}-{r}" value={keys[r]?.direction ?? 'target'} onchange={e => setKey(r, { direction: e.currentTarget.value as 'source' | 'target' })}>
                    <option value="target">to {ids.length > 1 ? 'target' : nodes.get(first!.target)?.name}</option>
                    <option value="source">to {ids.length > 1 ? 'source' : nodes.get(first!.source)?.name}</option>
                </select>
            </li>
            {#if !keys[r]?.key}<li class="field-sub">⚠ "{r}" has no key yet, so keyboard users cannot follow it.</li>{/if}
        {/each}
    </ul>
{/snippet}

{#snippet renderingFields()}
    <div class="field">
        <label for="node-shape">Shape</label>
        <select id="node-shape" value={shape ?? 'mixed'} onchange={e => setShapes(e.currentTarget.value as Style['shape'])}>
            {#if !shape}<option value="mixed" disabled>Mixed</option>{/if}
            <option value="rect">rect</option>
            <option value="ellipse">ellipse</option>
            <option value="path">path</option>
        </select>
    </div>
    {#if shape === 'rect' || shape === 'ellipse' || (!shape && list.every(n => !n.geo.path))}
        <div class="field-pair">
            {#each [['width', 'Width'], ['height', 'Height']] as const as [k, label] (k)}
                {@const v = same(n => toUnit(n.geo[k], k))}
                <div class="field">
                    <label for="node-{k}">{label} ({posUnit})</label>
                    <input id="node-{k}" type="number" min="1" step={posUnit === '%' ? 0.1 : 1} value={v ?? ''} placeholder="Mixed" oninput={e => e.currentTarget.value && setGeos(ids, () => ({ [k]: Math.max(1, fromUnit(parseFloat(e.currentTarget.value), k)) }))} />
                </div>
            {/each}
        </div>
    {:else if shape === 'path'}
        {#if one}
            <button class="btn-ghost btn-sm" type="button" onclick={draw} disabled={app.ui.pen?.id === one.id}>{app.ui.pen?.id === one.id ? 'Drawing on the canvas…' : one.geo.path ? 'Redraw path' : 'Draw path'}</button>
        {:else}
            <p class="field-sub">Drawing works with one node selected. Type path data to set it on all {list.length}.</p>
        {/if}
        <label class="toggle"><input type="checkbox" checked={relative} onchange={e => setRelative(e.currentTarget.checked)} /> Relative to {one ? "the node's" : "each node's"} x and y</label>
        <div class="field">
            <label for="node-path-data">SVG path data <span class="field-sub">(d attribute)</span></label>
            <textarea
                id="node-path-data"
                class="path-data-textarea"
                rows="4"
                spellcheck="false"
                value={shown}
                placeholder={many && same(n => n.geo.path ?? '') === undefined ? 'Mixed. New path data replaces every path.' : 'M 0 0 L 40 0 L 40 40 Z'}
                onchange={e => commitPath(e.currentTarget.value)}
                aria-describedby="path-note"
            ></textarea>
            <p id="path-note" class="field-sub" aria-live="polite">
                {note || (one && !one.geo.path ? 'Until you add path data, the node draws as a rectangle.' : one ? `Size comes from the path: ${Math.round(one.geo.width)} × ${Math.round(one.geo.height)} px.` : '')}
            </p>
        </div>
    {/if}
    <div class="field field-inline">
        <label for="node-fill-enabled">Fill color</label>
        <div class="fill-row">
            <input id="node-fill-enabled" type="checkbox" checked={!!style('fillEnabled')} indeterminate={style('fillEnabled') === undefined} onchange={e => setStyles(ids, { fillEnabled: e.currentTarget.checked })} aria-label="Enable fill color" />
            <input id="node-fill" type="color" disabled={style('fillEnabled') === false} value={style('fill') ?? list[0].style.fill} oninput={e => setStyles(ids, { fill: e.currentTarget.value })} aria-label="Fill color" />
        </div>
    </div>
    <fieldset class="panel-fieldset">
        <legend class="fieldset-legend">Stroke</legend>
        <div class="field field-inline">
            <label for="node-stroke-color">Color{style('strokeColor') === undefined ? ' (mixed)' : ''}</label>
            <input id="node-stroke-color" type="color" value={style('strokeColor') ?? list[0].style.strokeColor} oninput={e => setStyles(ids, { strokeColor: e.currentTarget.value })} />
        </div>
        <div class="field">
            <label for="node-stroke-width">Width (px)</label>
            <input id="node-stroke-width" type="number" min="0" max="20" step="0.5" value={style('strokeWidth') ?? ''} placeholder="Mixed" oninput={e => e.currentTarget.value && setStyles(ids, { strokeWidth: parseFloat(e.currentTarget.value) || 0 })} />
        </div>
        <div class="field">
            <label for="node-stroke-dash">Dash pattern</label>
            <select id="node-stroke-dash" value={style('strokeDash') ?? 'mixed'} onchange={e => setStyles(ids, { strokeDash: e.currentTarget.value as Style['strokeDash'] })}>
                {#if style('strokeDash') === undefined}<option value="mixed" disabled>Mixed</option>{/if}
                <option value="solid">Solid</option>
                <option value="dashed">Dashed</option>
                <option value="dotted">Dotted</option>
            </select>
        </div>
    </fieldset>
    <div class="field">
        <label for="node-opacity">Opacity <span class="value-hint" aria-hidden="true">{style('opacity')?.toFixed(2) ?? 'mixed'}</span></label>
        <input id="node-opacity" type="range" min="0" max="1" step="0.05" value={style('opacity') ?? list[0].style.opacity} oninput={e => setStyles(ids, { opacity: parseFloat(e.currentTarget.value) })} />
    </div>
    <div class="field">
        <label for="node-aria-role">Aria role</label>
        <input id="node-aria-role" type="text" placeholder={style('ariaRole') === undefined ? 'Mixed' : 'img'} value={style('ariaRole') ?? ''} onchange={e => setStyles(ids, { ariaRole: e.currentTarget.value })} />
    </div>
    <div class="field">
        <label for="node-custom-class">Custom CSS class</label>
        <input id="node-custom-class" type="text" placeholder={style('customClass') === undefined ? 'Mixed' : ''} value={style('customClass') ?? ''} onchange={e => setStyles(ids, { customClass: e.currentTarget.value })} />
    </div>
{/snippet}

<div class="visually-hidden" aria-live="polite" aria-atomic="true">{applyMsg}</div>

{#if app.orphans.length}
    <section class="panel-section">
        <p class="panel-empty">{app.orphans.length} saved edit{app.orphans.length > 1 ? 's point' : ' points'} at nodes or edges that no longer exist. They come back if the structure does.</p>
        <button class="btn-ghost btn-sm" type="button" onclick={clearOrphans}>Clear stale edits</button>
    </section>
{/if}

{#if !selNodes.length && !selEdges.length}
    <p class="panel-empty">Select a node or edge on the canvas to edit it, or open the scaffold to fit nodes to the chart.</p>
{:else if node && template}
    {@const isEntry = node.id === app.entry}
    {@const nov = ov.nodes[node.id]}
    <section class="panel-section" aria-labelledby="section-identity">
        <h3 id="section-identity" class="section-heading">
            Identity
            <span class="badge-source badge-source-{isManual ? 'manual' : 'schema'}">{node.kind}</span>
        </h3>
        <div class="field">
            <label for="node-id">Node ID</label>
            {#if isManual}
                <input id="node-id" type="text" value={node.id} onchange={e => rename(node.id, e.currentTarget.value)} aria-describedby="node-id-error" />
                {#if idError}<p id="node-id-error" class="field-sub">{idError}</p>{/if}
            {:else}
                <input id="node-id" type="text" value={node.id} readonly aria-describedby="node-id-note" />
                <p id="node-id-note" class="field-sub">Generated from the data. Rename the root or divisions in the schema panel.</p>
            {/if}
        </div>
        <div class="field field-inline">
            <label for="node-is-entry">Is entry node {#if isEntry}<span class="badge-entry" aria-hidden="true">★</span>{/if}</label>
            <input id="node-is-entry" type="checkbox" checked={isEntry} onchange={e => setEntry(node.id, e.currentTarget.checked)} />
        </div>
        {#if isManual}
            {@const lv = app.tree.level[node.id]}
            <div class="field field-inline">
                <label for="node-level">Level</label>
                <select
                    id="node-level"
                    value={String(lv ?? 'none')}
                    onchange={e => {
                        askLevel(node.id, e.currentTarget.value);
                        e.currentTarget.value = String(app.tree.level[node.id] ?? 'none');
                    }}
                >
                    <option value="none">No level</option>
                    {#each Array.from({ length: maxLevel + 2 }, (_, i) => i) as i (i)}
                        <option value={String(i)} disabled={i === 0 && app.tree.root !== undefined && app.tree.root !== node.id}>
                            {i}{i === 0 ? ' (root)' : i > maxLevel ? ' (new)' : ''}
                        </option>
                    {/each}
                </select>
            </div>
        {:else if app.tree.level[node.id] !== undefined}
            <p class="field-sub">Level {app.tree.level[node.id]}, set by the data.</p>
        {/if}
        <p class="field-sub">Announced as: {node.label}</p>
        {#if isManual}
            <button class="btn-ghost btn-sm" type="button" onclick={() => connectTo(node.id)}>Connect to…</button>
        {/if}
    </section>

    <details class="panel-section">
        <summary class="section-heading">Position</summary>
        <div class="field-group">
            <fieldset class="unit-toggle">
                <legend>Coordinate unit</legend>
                {#each ['px', '%'] as u (u)}
                    <label class="radio-label"><input type="radio" name="pos-unit" value={u} bind:group={posUnit} /> {u}</label>
                {/each}
            </fieldset>
            <div class="field-pair">
                {#each [['x', 'X', 'width'], ['y', 'Y', 'height']] as const as [k, label, axis] (k)}
                    <div class="field">
                        <label for="node-{k}">{label} ({posUnit})</label>
                        <input id="node-{k}" type="number" step={posUnit === '%' ? 0.1 : 1} value={toUnit(node.geo[k], axis)} oninput={e => setGeo({ [k]: fromUnit(parseFloat(e.currentTarget.value) || 0, axis) })} />
                    </div>
                {/each}
            </div>
            {#if nov?.geo}
                <button class="btn-ghost btn-sm" type="button" onclick={() => unpin(node.id)}>Reset to computed position</button>
            {/if}
        </div>
    </details>

    {@const missing = app.missing.has(node.id)}
    <section class="panel-section" class:missing aria-labelledby="section-semantics">
        <h3 id="section-semantics" class="section-heading">Semantics</h3>
        {#if missing}
            <p id="missing-note" class="missing-note"><span aria-hidden="true">⚠</span> Important descriptive text has not yet been set.</p>
        {/if}
        <LabelBuilder level={LEVEL[node.kind]} value={template} nodeId={node.id} dimensionKey={node.dimensionKey} onchange={setTemplate} missing={missing ? 'missing-note' : undefined} />
        {#if nov?.semantics}
            <button class="btn-ghost btn-sm" type="button" onclick={() => resetTemplate(node.id)}>Use the shared label for this level</button>
        {/if}
    </section>

    <section class="panel-section" aria-labelledby="section-data">
        <h3 id="section-data" class="section-heading">Data</h3>
        {#if isManual}
            {@const data = ov.added.nodes[node.id].data ?? {}}
            <ul class="kv-list" aria-label="Data properties">
                {#each Object.entries(data) as [key, value], i (i)}
                    <li class="kv-row">
                        <label class="visually-hidden" for="data-key-{i}">Key {i + 1}</label>
                        <input id="data-key-{i}" type="text" class="kv-input" value={key} onchange={e => setData(node.id, Object.fromEntries(Object.entries(data).map(([k, v]) => [k === key ? e.currentTarget.value : k, v])))} />
                        <label class="visually-hidden" for="data-val-{i}">Value {i + 1}</label>
                        <input id="data-val-{i}" type="text" class="kv-input" value={String(value)} oninput={e => setData(node.id, { ...data, [key]: e.currentTarget.value })} />
                        <button class="btn-ghost btn-sm kv-delete" type="button" aria-label="Delete property {key}" onclick={() => setData(node.id, Object.fromEntries(Object.entries(data).filter(([k]) => k !== key)))}>×</button>
                    </li>
                {/each}
            </ul>
            <button class="btn-ghost btn-sm" type="button" onclick={() => setData(node.id, { ...data, [`key${Object.keys(data).length + 1}`]: '' })}>+ Add property</button>
        {:else}
            <ul class="kv-list" aria-label="Data properties">
                {#each Object.entries(node.kind === 'leaf' ? node.data : {}).filter(([k]) => !k.startsWith('_')) as [k, v] (k)}
                    <li class="kv-row"><span class="kv-input">{k}</span><span class="kv-input">{String(v)}</span></li>
                {:else}
                    <li class="field-sub">Summarizes {app.structure.context.info[node.id]?.rows.length ?? app.rows.length} rows.</li>
                {/each}
            </ul>
        {/if}
    </section>

    <details class="panel-section">
        <summary class="section-heading">Rendering &amp; Size</summary>
        {@render renderingFields()}
    </details>
{:else if edge}
    <section class="panel-section" aria-labelledby="section-edge">
        <h3 id="section-edge" class="section-heading">Edge</h3>
        {@render rulesEditor([edge.id], edge.rules, 'one')}
        <div class="field">
            <span class="field-label-only">From</span>
            <button class="btn-ghost btn-sm" type="button" onclick={() => select([edge.source])}>{nodes.get(edge.source)?.name ?? edge.source}</button>
            <span class="field-label-only">To</span>
            <button class="btn-ghost btn-sm" type="button" onclick={() => select([edge.target])}>{nodes.get(edge.target)?.name ?? edge.target}</button>
        </div>
    </section>
{:else}
    {#if selNodes.length}
        <section class="panel-section" aria-labelledby="section-multi-node">
            <h3 id="section-multi-node" class="section-heading">{selNodes.length} Nodes Selected</h3>
            <ul class="node-label-list" aria-label="Selected nodes. Choose one to inspect it.">
                {#each selNodes as n (n.id)}
                    <li><button class="btn-ghost btn-sm node-label-btn" type="button" onclick={() => select([n.id])}>{n.name}{#if n.id === app.entry}<span class="badge-entry" aria-label="(entry node)">★</span>{/if}</button></li>
                {/each}
            </ul>
            <div class="field">
                <label for="bulk-sem-label">Set label template for all</label>
                <textarea id="bulk-sem-label" rows="3" bind:value={bulkTemplate}></textarea>
                <button class="btn-primary btn-sm" type="button" onclick={bulkLabel}>Apply</button>
            </div>
        </section>
        <details class="panel-section">
            <summary class="section-heading">Rendering &amp; Size</summary>
            <p class="field-sub">Changes apply to all {selNodes.length} nodes.</p>
            {@render renderingFields()}
        </details>
    {/if}
    {#if selEdges.length}
        <section class="panel-section" aria-labelledby="section-multi-edge">
            <h3 id="section-multi-edge" class="section-heading">{selEdges.length} Edges Selected</h3>
            {#if groups.length === 1}
                <p class="field-sub">All selected edges share the same rules. Edits apply to every one.</p>
                {@render rulesEditor(groups[0].ids, groups[0].rules, 'all')}
            {:else}
                <p class="missing-note" role="status"><span aria-hidden="true">⚠</span> These edges use {groups.length} different sets of rules, so they can't be overwritten together. Edit each set below, or add a rule to all.</p>
                <div class="field">
                    <label for="add-rule-all">Add a rule to all {selEdges.length} edges</label>
                    <input id="add-rule-all" type="text" placeholder="e.g. forward" bind:value={addRule} onkeydown={e => e.key === 'Enter' && appendRule(selEdges.map(x => x.id), addRule)} />
                    <button class="btn-primary btn-sm" type="button" onclick={() => appendRule(selEdges.map(x => x.id), addRule)}>Add</button>
                </div>
                {#each groups as grp, i (grp.sig)}
                    <details class="rule-group" open={i === 0}>
                        <summary>{grp.sig || 'no rules'} ({grp.ids.length} edge{grp.ids.length > 1 ? 's' : ''})</summary>
                        {@render rulesEditor(grp.ids, grp.rules, `g${i}`)}
                        <button class="btn-ghost btn-sm" type="button" onclick={() => select([], grp.ids)}>Select only these</button>
                    </details>
                {/each}
            {/if}
            {#if fan}
                {@const first = fan.kids.includes(firstChild) ? firstChild : fan.kids[0]}
                <div class="field fan">
                    <p class="field-sub">These edges all meet at {nodes.get(fan.hub)?.name}. Turn them into a parent group: {nodes.get(fan.hub)?.name} drills in to the first child, and every child drills out to it.</p>
                    <label for="first-child">First child</label>
                    <select id="first-child" value={first} onchange={e => (firstChild = e.currentTarget.value)}>
                        {#each fan.kids as k (k)}<option value={k}>{nodes.get(k)?.name ?? k}</option>{/each}
                    </select>
                    <button class="btn-primary btn-sm" type="button" onclick={() => parentGroup(selEdges.map(x => x.id), fan.hub, fan.kids, first)}>Create parent grouping</button>
                </div>
            {/if}
        </section>
    {/if}
{/if}

{#if levelAsk}<LevelModal id={levelAsk.id} to={levelAsk.to} onclose={() => (levelAsk = null)} />{/if}

<style>
    .missing {
        outline: 1px solid #c62828;
        outline-offset: 4px;
        border-radius: 2px;
    }

    .missing-note {
        margin: 0 0 var(--dn-space);
        font-size: 0.8125rem;
        font-weight: 600;
        color: #b71c1c;
    }

    :global(.dark) .missing-note {
        color: #ff8a80;
    }

    .kv-row.rule-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 4px;
        padding: 4px 0;
        border-top: 1px solid var(--dn-border);
    }

    .rule-row select {
        grid-column: 1 / -1;
        font-size: 0.75rem;
    }

    .rule-group {
        border: 1px solid var(--dn-border);
        border-radius: var(--dn-radius);
        padding: var(--dn-space);
        margin-top: var(--dn-space);
    }

    .fan {
        margin-top: calc(var(--dn-space) * 1.5);
    }

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
    .badge-source {
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

    /* ── Field sub-label ── */
    .field-sub {
        font-size: 0.7rem;
        font-weight: 400;
        color: var(--dn-text-muted);
        margin-left: calc(var(--dn-space) * 0.25);
    }

    /* ── AI Suggest hint ── */
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
    /* ── Scaffold source badge ── */
    /* ── Path node editor ── */
    .field-label-only {
        font-size: 0.8125rem;
        font-weight: 500;
        color: var(--dn-text);
        display: block;
        margin-bottom: calc(var(--dn-space) * 0.5);
    }

    .toggle {
        display: flex;
        align-items: center;
        gap: var(--dn-space);
        font-size: 0.875rem;
    }

    .path-data-textarea {
        font-family: var(--dn-font-mono);
        font-size: 0.75rem;
        resize: vertical;
        min-height: 80px;
    }

</style>
