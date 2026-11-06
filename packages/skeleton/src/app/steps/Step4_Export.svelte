<script lang="ts">
    import 'data-navigator/text-chat.css';
    import { app } from '../../model/state.svelte';
    import { VERSIONS, generalize, literalFiles, patternFiles, type Framework, type Target } from '../../export/exporters';
    import { connect, matchKey } from '../../runtime/dn-runtime.js';
    import { vega } from '../../runtime/adapters.js';
    import { buildVegaSpec, renderHidden } from '../../utils/vegaBuilder';
    import { download, zip } from '../../utils/saveLoad';

    let mode = $state<'literal' | 'pattern'>('literal');
    let target = $state<Target>(app.doc.scaffold ? 'vega' : 'dom');
    let framework = $state<Framework>('none');
    let sameKeys = $state(true);
    let fieldMap = $state<Record<string, string>>({});
    let selector = $state('[data-dn-key]');
    let resize = $state(true);
    let tab = $state('');

    const TARGETS: { id: Target; label: string; hint: string }[] = [
        { id: 'dom', label: 'SVG chart (d3, Observable Plot, Recharts, LayerCake…)', hint: `Finds marks in the SVG by bound data or a data-dn-key attribute. Tested with d3 ${VERSIONS.d3}.` },
        { id: 'scales', label: 'Canvas or your own scales', hint: 'Computes boxes from the x and y scales your chart already uses. Works with any library that exposes them.' },
        { id: 'vega', label: 'Vega-Lite or Vega', hint: `Reads exact mark bounds from the public scenegraph. Tested with vega ${VERSIONS.vega}, vega-lite ${VERSIONS['vega-lite']}, vega-embed ${VERSIONS['vega-embed']}.` },
        { id: 'bokeh', label: 'Bokeh', hint: `Maps glyph fields through the plot's scales. Written for BokehJS ${VERSIONS.bokeh}.` }
    ];

    const usedFields = $derived.by(() => {
        const d = app.doc;
        const keys = new Set<string>([...(d.data.idKey ? [d.data.idKey] : []), ...d.recipe.dimensions.map(x => x.key)]);
        const labels = [d.recipe.labels.level0, d.recipe.labels.leaves, ...Object.values(d.recipe.labels.perDimension), ...Object.values(d.recipe.labels.perDivision)];
        for (const t of labels) for (const m of t.template.matchAll(/"([^"]+)"/g)) if (d.data.fields.some(f => f.key === m[1] && !f.formula)) keys.add(m[1]);
        return [...keys];
    });

    const out = $derived.by(() => {
        if (mode === 'literal') return { files: literalFiles(app.doc, app.structure, app.entry), dropped: [] as string[] };
        return patternFiles(app.doc, app.structure, { target, framework, fieldMap: sameKeys ? {} : fieldMap, selector, resize });
    });
    const names = $derived(Object.keys(out.files).filter(n => typeof out.files[n] === 'string'));
    const active = $derived(names.includes(tab) ? tab : names.find(n => n.endsWith('.html') || n.endsWith('.jsx') || n.endsWith('.svelte')) ?? names[0]);
    let copied = $state('');

    async function copy() {
        await navigator.clipboard.writeText(out.files[active] as string);
        copied = `Copied ${active}.`;
    }
    const save = () => download(`skeleton-${mode}-${mode === 'pattern' ? `${target}-${framework}` : 'chart'}.zip`, zip(out.files), 'application/zip');

    function onTabKey(e: KeyboardEvent, i: number) {
        const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: names.length - 1 }[e.key];
        if (next === undefined) return;
        e.preventDefault();
        tab = names[(next + names.length) % names.length];
        document.getElementById(`export-tab-${tab}`)?.focus();
    }

    let previewEl: HTMLDivElement | undefined = $state();
    let chatEl: HTMLDivElement | undefined = $state();
    let previewNote = $state('');
    let stopPreview: (() => void) | null = null;

    async function preview() {
        stopPreview?.();
        const cfg = app.scaffold;
        if (!cfg || !previewEl || !chatEl) return;
        const { pattern } = generalize(app.doc, app.structure, {});
        const rows = app.rows.filter((_, i) => i % 5 !== 4).map(r => {
            const v = Number(r[cfg.yField ?? '']);
            return isNaN(v) ? r : { ...r, [cfg.yField!]: Math.round(v * (0.6 + Math.random() * 0.8) * 100) / 100 };
        });
        const spec = buildVegaSpec({ ...cfg, offsetX: 0, offsetY: 0 }, rows);
        delete spec.config;
        const { view, cleanup } = await renderHidden(spec);
        previewEl.innerHTML = '';
        const svg = await view.toSVG();
        previewEl.insertAdjacentHTML('beforeend', svg);
        chatEl.innerHTML = '';
        const nav = connect({ pattern, rows, container: previewEl, chat: chatEl, suffix: 'preview', resize: false, measure: vega(view, { key: matchKey(pattern) }) });
        previewNote = `Rebuilt from the pattern with ${rows.length} of ${app.rows.length} rows and new values for ${cfg.yField}.`;
        stopPreview = () => {
            nav.destroy();
            cleanup();
        };
    }
    $effect(() => () => stopPreview?.());
</script>

<div class="export-step">
    <h2 id="step-heading-4" tabindex="-1">Export</h2>

    <fieldset class="export-group">
        <legend>What do you want to export?</legend>
        <label class="export-choice"><input type="radio" bind:group={mode} value="literal" /> <span><strong>This chart</strong>: the structure exactly as built, positioned over your image.</span></label>
        <label class="export-choice"><input type="radio" bind:group={mode} value="pattern" /> <span><strong>A pattern</strong>: the recipe, rebuilt from new data and measured from your live chart.</span></label>
    </fieldset>

    {#if mode === 'pattern'}
        <fieldset class="export-group">
            <legend>Will new data use the same column names?</legend>
            <label class="export-choice"><input type="radio" bind:group={sameKeys} value={true} /> Yes</label>
            <label class="export-choice"><input type="radio" bind:group={sameKeys} value={false} /> No, map them</label>
            {#if !sameKeys}
                <table class="field-map">
                    <thead><tr><th scope="col">Column here</th><th scope="col">Column in new data</th></tr></thead>
                    <tbody>
                        {#each usedFields as key (key)}
                            <tr>
                                <th scope="row">{key}</th>
                                <td><input type="text" aria-label="New column name for {key}" placeholder={key} value={fieldMap[key] ?? ''} oninput={e => (fieldMap[key] = e.currentTarget.value.trim())} /></td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            {/if}
        </fieldset>

        <fieldset class="export-group">
            <legend>How is the chart rendered?</legend>
            {#each TARGETS as t (t.id)}
                <label class="export-choice">
                    <input type="radio" bind:group={target} value={t.id} />
                    <span><strong>{t.label}</strong><br /><span class="export-hint">{t.hint}</span></span>
                </label>
            {/each}
            {#if target === 'dom'}
                <label class="export-field">
                    CSS selector for the marks
                    <input type="text" bind:value={selector} />
                </label>
            {/if}
        </fieldset>

        <fieldset class="export-group">
            <legend>Which framework?</legend>
            {#each [['none', 'None (plain HTML)'], ['react', `React ${VERSIONS.react} hook`], ['svelte', `Svelte action (works in Svelte 3 to ${VERSIONS.svelte})`]] as [id, label] (id)}
                <label class="export-choice"><input type="radio" bind:group={framework} value={id} /> {label}</label>
            {/each}
            <label class="export-choice"><input type="checkbox" bind:checked={resize} /> Re-measure when the chart resizes</label>
        </fieldset>

        {#if out.dropped.length}
            <details class="export-group">
                <summary>{out.dropped.length} edit{out.dropped.length > 1 ? 's do' : ' does'} not carry over to new data</summary>
                <ul>{#each out.dropped as d (d)}<li>{d}</li>{/each}</ul>
            </details>
        {/if}
    {/if}

    {#if app.warnings.length}
        <ul class="export-warnings" aria-label="Structure warnings">{#each app.warnings as w (w)}<li>{w}</li>{/each}</ul>
    {/if}

    <div class="export-files">
        <div class="export-tabs" role="tablist" aria-label="Exported files">
            {#each names as name, i (name)}
                <button id="export-tab-{name}" role="tab" type="button" aria-selected={name === active} aria-controls="export-panel" tabindex={name === active ? 0 : -1} class="export-tab" onclick={() => (tab = name)} onkeydown={e => onTabKey(e, i)}>{name}</button>
            {/each}
        </div>
        <div id="export-panel" role="tabpanel" aria-labelledby="export-tab-{active}" class="export-code">
            <pre><code>{out.files[active]}</code></pre>
        </div>
        <div class="export-actions">
            <button class="btn-ghost btn-sm" type="button" onclick={copy}>Copy {active}</button>
            <button class="btn-primary" type="button" onclick={save}>Download all files (.zip)</button>
            <span class="visually-hidden" aria-live="polite">{copied}</span>
        </div>
    </div>

    {#if mode === 'pattern' && target === 'vega' && app.scaffold}
        <section class="export-group">
            <h3>Try the pattern on different data</h3>
            <button class="btn-ghost btn-sm" type="button" onclick={preview}>Render with changed data</button>
            <p class="export-hint" aria-live="polite">{previewNote}</p>
            <div class="preview-row">
                <div bind:this={previewEl} id="export-preview" class="preview-chart"></div>
                <div bind:this={chatEl} class="preview-chat"></div>
            </div>
        </section>
    {/if}
</div>

<style>
    .export-step {
        display: flex;
        flex-direction: column;
        gap: calc(var(--dn-space) * 2);
        max-width: 1000px;
    }
    .export-step h2 {
        margin: 0;
        font-size: 1.5rem;
    }
    .export-group {
        border: 1px solid var(--dn-border);
        border-radius: var(--dn-radius);
        padding: calc(var(--dn-space) * 1.5);
        display: flex;
        flex-direction: column;
        gap: calc(var(--dn-space) * 0.75);
    }
    .export-group legend,
    .export-group summary,
    .export-group h3 {
        font-weight: 600;
        font-size: 0.9375rem;
        margin: 0;
    }
    .export-choice,
    .export-field {
        display: flex;
        gap: calc(var(--dn-space) * 1);
        align-items: flex-start;
        font-size: 0.875rem;
    }
    .export-field {
        flex-direction: column;
    }
    .export-hint {
        color: var(--dn-text-muted);
        font-size: 0.8125rem;
    }
    .field-map input {
        width: 100%;
    }
    .export-warnings {
        margin: 0;
        color: var(--dn-text-muted);
        font-size: 0.8125rem;
    }
    .export-tabs {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
    }
    .export-tab {
        font: inherit;
        font-size: 0.8125rem;
        padding: 4px 10px;
        border: 1px solid var(--dn-border);
        background: var(--dn-surface);
        color: var(--dn-text);
        border-radius: var(--dn-radius) var(--dn-radius) 0 0;
        cursor: pointer;
    }
    .export-tab[aria-selected='true'] {
        background: var(--dn-accent-soft);
        border-color: var(--dn-accent);
        color: var(--dn-accent);
    }
    .export-code {
        border: 1px solid var(--dn-border);
        max-height: 420px;
        overflow: auto;
        background: var(--dn-surface);
    }
    .export-code pre {
        margin: 0;
        padding: calc(var(--dn-space) * 1.5);
        font-size: 0.75rem;
        line-height: 1.5;
    }
    .export-actions {
        display: flex;
        gap: calc(var(--dn-space) * 1);
        margin-top: calc(var(--dn-space) * 1);
    }
    .preview-row {
        display: flex;
        gap: calc(var(--dn-space) * 2);
        flex-wrap: wrap;
    }
    .preview-chart {
        position: relative;
    }
    .preview-chat {
        flex: 1;
        min-width: 260px;
    }
    :global(#export-preview .dn-wrapper) {
        position: absolute;
        top: 0;
        left: 0;
        pointer-events: none;
    }
    :global(#export-preview .dn-node) {
        position: absolute;
        opacity: 0;
        pointer-events: none;
        outline: none;
    }
    :global(#export-preview .dn-node:focus),
    :global(#export-preview .dn-node.dn-current) {
        opacity: 1;
        pointer-events: auto;
    }
    :global(#export-preview .dn-node-svg) {
        position: absolute;
        overflow: visible;
    }
    :global(#export-preview .dn-node-path) {
        fill: none;
        stroke: #1b1b1b;
        stroke-width: 3;
    }
</style>
