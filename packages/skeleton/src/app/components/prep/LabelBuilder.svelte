<script lang="ts">
    import { app } from '../../../model/state.svelte';
    import type { LabelTemplate } from '../../../model/doc';
    import { label as resolve } from '../../../runtime/dn-runtime.js';

    interface Props {
        value: LabelTemplate;
        level: 0 | 1 | 2 | 3;
        onchange: (v: LabelTemplate) => void;
        dimensionKey?: string;
        nodeId?: string;
        suggestedFields?: { key: string; rank?: string }[];
        suggestedAggField?: string;
        missing?: string;
        preview?: boolean;
    }
    const { value, level, onchange, dimensionKey, nodeId, suggestedFields = [], suggestedAggField, missing, preview: showPreview = true }: Props = $props();

    const fields = $derived(app.doc.data.fields.filter(f => !f.removed).map(f => f.key));
    const numeric = $derived(app.doc.data.fields.filter(f => !f.removed && f.type === 'numerical').map(f => f.key));
    const s = $derived(app.structure);
    const ctx = $derived(s.context);
    const sample = $derived.by(() => {
        if (nodeId && s.nodes[nodeId]) return s.nodes[nodeId];
        const nodes = Object.values<any>(s.nodes);
        if (level === 0) return nodes.find(n => n.dimensionLevel === 0);
        if (level === 3) return nodes.find(n => n.dimensionLevel === undefined && !n.manual);
        return nodes.find(n => n.dimensionLevel === level && n.derivedNode === dimensionKey);
    });
    const preview = $derived(sample ? resolve(value, sample, app.pattern, ctx, app.prepared) : 'Add data and dimensions to preview this label.');
    const dims = $derived(
        app.doc.recipe.dimensions.map(d => ({
            key: d.key,
            divisions: ctx.dims.some((x: any) => x.dimensionKey === d.key && Object.keys(x.divisions).some(id => ctx.info[id])),
            dimNoun: app.doc.recipe.labels.perDimension[d.key]?.name ?? 'group',
            divNoun: app.doc.recipe.labels.perDivision[d.key]?.name ?? 'subgroup'
        }))
    );
    const KIND = ['entry point (root)', 'dimension header', 'division header', 'individual data point'];

    const set = (patch: Partial<LabelTemplate>) => onchange({ ...value, ...patch });
    const tidy = (t: string) => t.replace(/\s{2,}/g, ' ').replace(/^[\s,]+|[\s,]+$/g, '');
    const esc = (f: string) => f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const selected = $derived(new Set([...value.template.matchAll(/\{value:"([^"]+)"\}/g)].map(m => m[1])));
    function toggleField(f: string) {
        const t = value.template;
        if (selected.has(f)) set({ template: tidy(t.replace(new RegExp(`(\\{key:"${esc(f)}"\\}:\\s*)?\\{value:"${esc(f)}"\\},?`, 'g'), '')) });
        else set({ template: tidy(`${t}${t ? ', ' : ''}${value.omitKeyNames ? '' : `{key:"${f}"}: `}{value:"${f}"}`) });
    }

    type Agg = { id: string; label: string; pair?: boolean; test: RegExp; phrase: (a: string, b: string) => string };
    const AGGS: Agg[] = [
        { id: 'min', label: 'Min and Max of', test: /\{min:"([^"]+)"\}/, phrase: f => `, {key:"${f}"} ranging from {min:"${f}"} to {max:"${f}"}` },
        { id: 'sum', label: 'Sum of', test: /\{sum:"([^"]+)"\}/, phrase: f => `, total {key:"${f}"}: {sum:"${f}"}` },
        { id: 'avg', label: 'Average of', test: /\{avg:"([^"]+)"\}/, phrase: f => `, average {key:"${f}"}: {avg:"${f}"}` },
        { id: 'trend', label: 'Trend direction', pair: true, test: /\{trend:"([^"]+)":"([^"]+)"\}/, phrase: (x, y) => `, trend {key:"${x}"}/{key:"${y}"}: {trend:"${x}":"${y}"}` },
        { id: 'r2', label: 'R² value', pair: true, test: /\{r2:"([^"]+)":"([^"]+)"\}/, phrase: (x, y) => `, R² {key:"${x}"}/{key:"${y}"}: {r2:"${x}":"${y}"}` }
    ];
    let picked = $state<Record<string, string>>({});
    const pick = (id: string, fallback: string) => picked[id] ?? fallback;
    const fieldA = (a: Agg) => value.template.match(a.test)?.[1] ?? pick(a.pair ? 'x' : a.id, a.pair ? fields[0] : (suggestedAggField && numeric.includes(suggestedAggField) ? suggestedAggField : numeric[0]));
    const fieldB = (a: Agg) => value.template.match(a.test)?.[2] ?? pick('y', numeric[1] ?? numeric[0]);
    const strip = (t: string, a: Agg) => t.replace(new RegExp(`,?[^,{]*(\\{key:"[^"]+"\\}[^,{]*)*` + a.test.source.replace(/\(\[\^"\]\+\)/g, '[^"]+') + `(\\s*to \\{max:"[^"]+"\\})?`, 'g'), '');
    function toggleAgg(a: Agg) {
        if (a.test.test(value.template)) set({ template: tidy(strip(value.template, a)) });
        else set({ template: tidy(value.template + a.phrase(fieldA(a), fieldB(a))) });
    }
    function repick(key: string, f: string) {
        picked[key] = f;
        let t = value.template;
        for (const a of AGGS)
            if (a.test.test(t) && (key === a.id || (a.pair && (key === 'x' || key === 'y'))))
                t = tidy(strip(t, a) + a.phrase(key === 'y' ? fieldA(a) : f, key === 'y' ? f : fieldB(a)));
        if (t !== value.template) set({ template: t });
    }
    const COUNT = $derived(level === 1 ? (dims.find(d => d.key === dimensionKey)?.divisions ? ' contains {subcount} subgroups and {count} total child data points' : ' contains {count} total child data points') : ' contains {count} data points');
    const toggleCount = () =>
        set({ template: tidy(value.template.includes('{count}') ? value.template.replace(/ contains (\{subcount\} subgroups and )?\{count\} (total child )?data points/g, '').replace(/\{(sub)?count\}/g, '') : value.template + COUNT) });
    const toggleIn = (list: 'includeParentNames' | 'includeParentDivisions', key: string, on: boolean) =>
        set({ [list]: on ? [...(value[list] ?? []), key] : (value[list] ?? []).filter(k => k !== key) });
</script>

<div class="label-builder">
    <p class="lb-context">Building label for: <strong>{KIND[level]}</strong></p>
    <p class="lb-instruction">
        Check a field to add it to your label. {value.omitKeyNames ? "Each field adds its value only (e.g., 42)." : 'Each field adds its name and value (e.g., Score: 42).'} You can also type in the template box below.
    </p>

    {#if fields.length}
        <fieldset class="lb-fields-area">
            <legend class="visually-hidden">Fields to include in the label</legend>
            {#each fields as field (field)}
                {@const s = suggestedFields.find(x => x.key === field)}
                <label class="lb-field">
                    <input type="checkbox" checked={selected.has(field)} onchange={() => toggleField(field)} />
                    {field}{#if s}<span class="lb-field-suggested" aria-label={s.rank ? `Suggested: ${s.rank}` : 'Suggested'}>★{s.rank ? ` ${s.rank}` : ''}</span>{/if}
                </label>
            {/each}
        </fieldset>
    {/if}

    {#if level === 1 || level === 2}
        <div class="lb-agg-section">
            <p class="lb-agg-heading">Aggregate summaries from children</p>
            <div class="lb-agg-row">
                <label class="lb-agg-check"><input type="checkbox" checked={value.template.includes('{count}')} onchange={toggleCount} /> Count of children</label>
            </div>
            {#if numeric.length}
                {#each AGGS.filter(a => !a.pair) as a (a.id)}
                    <div class="lb-agg-row">
                        <label class="lb-agg-check"><input type="checkbox" checked={a.test.test(value.template)} onchange={() => toggleAgg(a)} /> {a.label}</label>
                        <label class="lb-agg-field-label">
                            <span class="visually-hidden">Field for {a.label}</span>
                            <select class="lb-agg-select" value={fieldA(a)} onchange={e => repick(a.id, e.currentTarget.value)}>
                                {#each numeric as f (f)}<option value={f}>{f}{suggestedAggField === f ? ' ★' : ''}</option>{/each}
                            </select>
                        </label>
                    </div>
                {/each}
                <div class="lb-agg-trend">
                    <p class="lb-agg-trend-label">Trend direction and R²</p>
                    <div class="lb-agg-trend-fields">
                        {#each [['x', 'X variable', fields], ['y', 'Y variable', numeric]] as const as [key, text, options] (key)}
                            <label class="lb-agg-trend-field">
                                <span class="lb-agg-trend-field-name">{text}</span>
                                <select class="lb-agg-select" value={key === 'x' ? fieldA(AGGS[3]) : fieldB(AGGS[3])} onchange={e => repick(key, e.currentTarget.value)}>
                                    {#each options as f (f)}<option value={f}>{f}</option>{/each}
                                </select>
                            </label>
                        {/each}
                    </div>
                    <div class="lb-agg-trend-toggles">
                        {#each AGGS.filter(a => a.pair) as a (a.id)}
                            <label class="lb-agg-check"><input type="checkbox" checked={a.test.test(value.template)} onchange={() => toggleAgg(a)} /> {a.label}</label>
                        {/each}
                    </div>
                </div>
            {/if}
        </div>
    {/if}

    <div class="lb-template-row">
        <label class="lb-label" for="lb-template-input-{level}-{dimensionKey ?? nodeId ?? ''}">Label template{#if missing && !value.template}<span class="req" aria-hidden="true"> *</span>{/if}</label>
        <div class="lb-template-controls">
            <input id="lb-template-input-{level}-{dimensionKey ?? nodeId ?? ''}" type="text" class="lb-template-input" aria-invalid={!!missing && !value.template} aria-describedby={missing && !value.template ? missing : undefined} value={value.template} oninput={e => set({ template: e.currentTarget.value })} placeholder={'e.g. {value:"name"}: {value:"score"}'} />
            <button class="lb-clear-btn" type="button" onclick={() => set({ template: '' })} aria-label="Clear label template">Clear</button>
        </div>
    </div>

    <div class="lb-options">
        <div class="lb-noun-row">
            <label class="lb-label" for="lb-noun-input-{level}-{dimensionKey ?? nodeId ?? ''}">What is this item called?{#if missing && !value.name}<span class="req" aria-hidden="true"> *</span>{/if}</label>
            <input id="lb-noun-input-{level}-{dimensionKey ?? nodeId ?? ''}" type="text" class="lb-noun-input" aria-invalid={!!missing && !value.name} aria-describedby={missing && !value.name ? missing : undefined} value={value.name} oninput={e => set({ name: e.currentTarget.value })} placeholder={['root', 'group', 'subgroup', 'data point'][level]} />
        </div>
        {#if level === 2 || level === 3 || (level === 1 && dims.length > 1)}
            <label class="lb-checkbox-label">
                <input type="checkbox" checked={value.includeIndex} onchange={e => set({ includeIndex: e.currentTarget.checked })} />
                {level === 1 ? 'Include position among dimensions?' : 'Include position in group?'}
                <span class="lb-checkbox-example">(e.g., {level === 1 ? `dimension 1 of ${dims.length}` : 'item 3 of 8'})</span>
            </label>
        {/if}
        {#if level === 2 && dimensionKey}
            <label class="lb-checkbox-label">
                <input type="checkbox" checked={value.includeDimensionName ?? false} onchange={e => set({ includeDimensionName: e.currentTarget.checked })} />
                Include parent {dimensionKey} dimension
                <span class="lb-checkbox-example">(e.g., in {dimensionKey} {dims.find(d => d.key === dimensionKey)?.dimNoun})</span>
            </label>
        {/if}
        {#if level === 3}
            {#each dims as pd (pd.key)}
                <label class="lb-checkbox-label">
                    <input type="checkbox" checked={(value.includeParentNames ?? []).includes(pd.key)} onchange={e => toggleIn('includeParentNames', pd.key, e.currentTarget.checked)} />
                    Include parent {pd.key} dimension
                    <span class="lb-checkbox-example">(e.g., in {pd.key} {pd.dimNoun})</span>
                </label>
                {#if pd.divisions}
                    <label class="lb-checkbox-label">
                        <input type="checkbox" checked={(value.includeParentDivisions ?? []).includes(pd.key)} onchange={e => toggleIn('includeParentDivisions', pd.key, e.currentTarget.checked)} />
                        Include parent subgroup of dimension {pd.key}
                        <span class="lb-checkbox-example">(e.g., in {pd.divNoun} 1 of 4)</span>
                    </label>
                {/if}
            {/each}
        {/if}
        <label class="lb-checkbox-label lb-omit-toggle">
            <input type="checkbox" checked={value.omitKeyNames} onchange={e => set({ omitKeyNames: e.currentTarget.checked })} />
            Hide field names
            <span class="lb-checkbox-example">(show values only, e.g., "42" instead of "Score: 42")</span>
        </label>
    </div>

{#if showPreview}
        <div class="lb-preview-box" aria-live="polite">
        <span class="lb-preview-label">label preview:</span>
        <span class="lb-preview-text">{preview}</span>
    </div>
    {/if}
</div>

<style>
    .req {
        color: #c62828;
        font-weight: 700;
    }

    [aria-invalid='true'] {
        border-color: #c62828 !important;
    }

    .label-builder {
        display: flex;
        flex-direction: column;
        gap: calc(var(--dn-space) * 1.5);
    }

    .lb-context {
        margin: 0;
        font-size: 0.8125rem;
        color: var(--dn-text-muted);
    }

    .lb-instruction {
        margin: 0;
        font-size: 0.875rem;
        color: var(--dn-text);
        line-height: 1.5;
    }

    /* ── Field checkboxes (one per field, inserts name+value or value-only) ── */

    .lb-fields-area {
        display: flex;
        flex-wrap: wrap;
        gap: calc(var(--dn-space) * 0.5);
        border: none;
        padding: 0;
        margin: 0;
    }

    .lb-field {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-size: 0.8125rem;
        font-family: var(--dn-font-mono);
        cursor: pointer;
    }

    .lb-field input[type='checkbox'] {
        width: 24px;
        height: 24px;
        accent-color: var(--dn-accent);
        cursor: pointer;
        flex-shrink: 0;
    }

    .lb-field-suggested {
        font-size: 0.7rem;
        font-family: var(--dn-font);
        opacity: 0.85;
    }

    /* ── Aggregate section ── */

    .lb-agg-section {
        display: flex;
        flex-direction: column;
        gap: calc(var(--dn-space) * 0.625);
        padding: calc(var(--dn-space) * 1);
        border: 1px solid var(--dn-border);
        border-radius: var(--dn-radius);
        background: var(--dn-surface);
    }

    .lb-agg-heading {
        margin: 0 0 calc(var(--dn-space) * 0.25);
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--dn-text-muted);
    }

    .lb-agg-row {
        display: flex;
        align-items: center;
        gap: calc(var(--dn-space) * 0.5);
        flex-wrap: wrap;
    }

    .lb-agg-check {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-size: 0.8125rem;
        font-family: var(--dn-font);
        cursor: pointer;
        white-space: nowrap;
    }

    .lb-agg-check input[type='checkbox'] {
        width: 24px;
        height: 24px;
        accent-color: var(--dn-accent);
        cursor: pointer;
        flex-shrink: 0;
    }

    .lb-agg-field-label {
        display: contents; /* keeps select inline */
    }

    .lb-agg-select {
        padding: 3px 6px;
        border: 1px solid var(--dn-border);
        border-radius: var(--dn-radius);
        background: var(--dn-surface);
        color: var(--dn-text);
        font-size: 0.8125rem;
        font-family: var(--dn-font-mono);
        cursor: pointer;
    }

    /* Trend + R² sub-section */

    .lb-agg-trend {
        display: flex;
        flex-direction: column;
        gap: calc(var(--dn-space) * 0.5);
        padding-top: calc(var(--dn-space) * 0.5);
        border-top: 1px solid var(--dn-border);
        margin-top: calc(var(--dn-space) * 0.25);
    }

    .lb-agg-trend-label {
        margin: 0;
        font-size: 0.8125rem;
        font-weight: 600;
        color: var(--dn-text);
    }

    .lb-agg-trend-fields {
        display: flex;
        gap: calc(var(--dn-space) * 1);
        flex-wrap: wrap;
    }

    .lb-agg-trend-field {
        display: flex;
        flex-direction: column;
        gap: 3px;
    }

    .lb-agg-trend-field-name {
        font-size: 0.75rem;
        color: var(--dn-text-muted);
        font-weight: 600;
    }

    .lb-agg-trend-toggles {
        display: flex;
        gap: calc(var(--dn-space) * 0.5);
        flex-wrap: wrap;
    }

    /* visually-hidden for screen reader labels on select elements */
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

    /* ── Template row ── */

    .lb-label {
        display: block;
        font-size: 0.8125rem;
        font-weight: 600;
        color: var(--dn-text);
        margin-bottom: calc(var(--dn-space) * 0.5);
    }

    .lb-template-controls {
        display: flex;
        gap: calc(var(--dn-space) * 0.75);
        align-items: center;
    }

    .lb-template-input {
        flex: 1;
        padding: calc(var(--dn-space) * 0.6) calc(var(--dn-space) * 1);
        border: 1px solid var(--dn-border);
        border-radius: var(--dn-radius);
        background: var(--dn-surface);
        color: var(--dn-text);
        font-size: 0.875rem;
        font-family: var(--dn-font-mono);
        box-sizing: border-box;
    }

    .lb-clear-btn {
        padding: calc(var(--dn-space) * 0.5) calc(var(--dn-space) * 1);
        font-size: 0.8125rem;
        font-family: var(--dn-font);
        background: none;
        border: 1px solid var(--dn-control);
        border-radius: var(--dn-radius);
        color: var(--dn-text-muted);
        cursor: pointer;
        min-height: 0;
        white-space: nowrap;
    }

    .lb-clear-btn:hover {
        border-color: var(--dn-accent);
        color: var(--dn-accent);
    }

    /* ── Preview box — sticky at bottom of scroll container ── */
    /* Always uses light-green background regardless of dark mode so the
       preview text stays dark and readable. The box acts as a "light island"
       pinned to the bottom while the user scrolls through fields/options. */

    .lb-preview-box {
        position: sticky;
        bottom: 0;
        z-index: 1;
        padding: calc(var(--dn-space) * 0.625) calc(var(--dn-space) * 1.25);
        border-radius: var(--dn-radius);
        /* Light green — kept in dark mode too so text is always readable */
        background: #f0fdf4;
        border: 1px solid #86efac;
        box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.12);
        display: flex;
        flex-direction: row;
        align-items: baseline;
        gap: calc(var(--dn-space) * 0.75);
    }

    /* Dark mode: keep the box light so dark text stays readable */
    :global(.dark) .lb-preview-box {
        background: #f0fdf4;
        border-color: #86efac;
        box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.35);
    }

    .lb-preview-label {
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: #166534;
    }

    /* Keep label text dark always — readable on the always-light green bg */
    :global(.dark) .lb-preview-label {
        color: #166534;
    }

    .lb-preview-text {
        font-size: 0.9375rem;
        /* Always dark — must be readable on the light-green background */
        color: #14532d;
        line-height: 1.5;
    }

    /* ── Options ── */

    .lb-options {
        display: flex;
        flex-direction: column;
        gap: calc(var(--dn-space) * 1);
    }

    .lb-noun-row {
        display: flex;
        flex-direction: column;
    }

    .lb-noun-input {
        padding: calc(var(--dn-space) * 0.6) calc(var(--dn-space) * 1);
        border: 1px solid var(--dn-border);
        border-radius: var(--dn-radius);
        background: var(--dn-surface);
        color: var(--dn-text);
        font-size: 0.875rem;
        font-family: var(--dn-font);
        width: 200px;
        box-sizing: border-box;
    }

    .lb-checkbox-label {
        display: flex;
        align-items: center;
        gap: calc(var(--dn-space) * 0.75);
        font-size: 0.875rem;
        color: var(--dn-text);
        cursor: pointer;
    }

    .lb-checkbox-label input[type="checkbox"] {
        flex-shrink: 0;
    }

    .lb-checkbox-example {
        color: var(--dn-text-muted);
        font-size: 0.8125rem;
    }

    /* "Hide field names" sits below a divider to signal it affects chip behavior */
    .lb-omit-toggle {
        padding-top: calc(var(--dn-space) * 0.75);
        border-top: 1px solid var(--dn-control);
        margin-top: calc(var(--dn-space) * 0.25);
    }

    /* Inline code style for the instruction examples */
</style>
