<script lang="ts">
    import type { LabelTemplate } from '../../../model/doc';
    import type { Question } from '../../../model/questions';
    import LabelBuilder from './LabelBuilder.svelte';
    import GuideGraphic from './GuideGraphic.svelte';

    const { q, value, onchange, chartImage = null, autofocus = false }: { q: Question; value: unknown; onchange: (v: unknown) => void; chartImage?: string | null; autofocus?: boolean } = $props();

    const visuals = $derived(q.visuals);
    const trees = $derived(visuals.filter(v => v.variant.startsWith('tree-')));
    const labeled = $derived(visuals.filter(v => !v.variant.startsWith('tree-') && v.label));
    const charts = $derived(visuals.filter(v => !v.variant.startsWith('tree-') && !v.label));
    const showHeaders = $derived([!!chartImage, charts.length + labeled.length > 0, trees.length > 0].filter(Boolean).length >= 2);
    const list = $derived(Array.isArray(value) ? (value as string[]) : []);
    const options = $derived(q.options ?? []);
    let expandInfo = $state(false);
    let warning = $state('');
    let heading: HTMLElement;

    $effect(() => {
        if (autofocus) heading.focus();
    });

    function toggle(v: string) {
        if (!list.includes(v) && q.maxSelect && list.length >= q.maxSelect) {
            warning = `We recommend at most ${q.maxSelect} dimensions for accessibility. You can enable more later in the Editor.`;
            return;
        }
        warning = '';
        onchange(list.includes(v) ? list.filter(x => x !== v) : [...list, v]);
    }

    function move(i: number, delta: number) {
        const arr = [...list];
        [arr[i], arr[i + delta]] = [arr[i + delta], arr[i]];
        onchange(arr);
    }
</script>

{#snippet guide(v: { variant: string; showRoot?: boolean })}
    <GuideGraphic variant={v.variant as any} showRoot={v.showRoot ?? true} />
{/snippet}

<div class="qa-question">
    <p class="qa-question-text" tabindex="-1" bind:this={heading}>{q.question}</p>

    {#if q.input === 'info'}
        {#if q.hint}<p class="qa-hint">{q.hint}</p>{/if}
        <div class="qa-info-wrap">
            {#if visuals.length}
                <div class="qa-info-grid">
                    {#each visuals as v (v.variant)}{@render guide(v)}{/each}
                </div>
            {/if}
            {#if q.captions?.length}
                <div class="qa-info-captions">
                    {#each q.captions as caption}<p class="qa-info-caption">{caption}</p>{/each}
                </div>
            {/if}
        </div>
    {:else if visuals.length || chartImage || q.hint}
        <div class="qa-guide-area">
            {#if visuals.length || chartImage}
                <div class="qa-guide-cols">
                    {#if chartImage}
                        <div class="qa-guide-col">
                            {#if showHeaders}<span class="qa-guide-col-header">Your chart</span>{/if}
                            <img src={chartImage} alt="Your uploaded chart, shown as a reference alongside this question" class="qa-chart-image" />
                        </div>
                    {/if}
                    {#if charts.length}
                        <div class="qa-guide-col">
                            {#if showHeaders}<span class="qa-guide-col-header">Example chart</span>{/if}
                            <div class="qa-guide-col-items">{#each charts as v (v.variant)}{@render guide(v)}{/each}</div>
                        </div>
                    {/if}
                    {#each labeled as v (v.variant)}
                        <div class="qa-guide-col">
                            <span class="qa-guide-col-header">{v.label}</span>
                            {@render guide(v)}
                        </div>
                    {/each}
                    {#if trees.length}
                        <div class="qa-guide-col">
                            {#if showHeaders}<span class="qa-guide-col-header">Structure we are editing</span>{/if}
                            <div class="qa-guide-col-items">{#each trees as v (v.variant)}{@render guide(v)}{/each}</div>
                        </div>
                    {/if}
                </div>
            {/if}
            {#if q.hint}<p class="qa-hint">{q.hint}</p>{/if}
        </div>
    {/if}

    {#if q.expandable}
        <button class="qa-expand-btn" onclick={() => (expandInfo = !expandInfo)} aria-expanded={expandInfo}>{q.expandable.buttonLabel}</button>
        {#if expandInfo}<p class="qa-expand-content">{q.expandable.content}</p>{/if}
    {/if}

    {#if q.input !== 'info'}
        <div class="qa-input-area" aria-label="Answer input">
            {#if q.input === 'text'}
                <label class="visually-hidden" for="qa-{q.id}">Your answer</label>
                <input id="qa-{q.id}" type="text" class="qa-input" value={typeof value === 'string' ? value : ''} placeholder={q.placeholder ?? ''} oninput={e => onchange(e.currentTarget.value)} />
            {:else if q.input === 'textarea'}
                <label class="visually-hidden" for="qa-{q.id}">Your answer</label>
                <textarea id="qa-{q.id}" class="qa-textarea" class:qa-code={!!q.link} rows={q.link ? 10 : 4} placeholder={q.placeholder ?? ''} value={typeof value === 'string' ? value : ''} oninput={e => onchange(e.currentTarget.value)}></textarea>
                {#if q.link}<a href={q.link.href} target="_blank" rel="noopener noreferrer">{q.link.label} (opens in a new tab)</a>{/if}
                {#if q.check?.(value)}<p class="qa-multiselect-warning" role="status"><span aria-hidden="true">⚠ </span>{q.check(value)}</p>{/if}
            {:else if q.input === 'dropdown'}
                <label class="visually-hidden" for="qa-{q.id}">Choose one</label>
                <select id="qa-{q.id}" class="qa-select" value={value ?? ''} onchange={e => onchange(e.currentTarget.value)}>
                    <option value="" disabled>Choose one</option>
                    {#each options as opt (opt.value)}<option value={opt.value} disabled={opt.disabled}>{opt.label}</option>{/each}
                </select>
            {:else if q.input === 'radio' || q.input === 'multiselect'}
                {@const multi = q.input === 'multiselect'}
                <fieldset class={multi ? 'qa-checkbox-group' : 'qa-radio-group'}>
                    <legend class="visually-hidden">{multi ? 'Choose all that apply' : 'Choose one'}</legend>
                    {#each options as opt (opt.value)}
                        {@const checked = multi ? list.includes(opt.value) : value === opt.value}
                        <label class={multi ? 'qa-checkbox-label' : 'qa-radio-label'} class:qa-option-checked={checked} class:qa-option-disabled={opt.disabled} class:qa-option-suggested={opt.suggested && !checked}>
                            <input
                                type={multi ? 'checkbox' : 'radio'}
                                name="qa-{q.id}"
                                value={opt.value}
                                {checked}
                                disabled={opt.disabled}
                                onchange={() => (multi ? toggle(opt.value) : onchange(opt.value))}
                            />
                            <span class="qa-option-content">
                                <span class="qa-option-label-row">
                                    <span class="qa-option-label">{opt.label}</span>
                                    {#if opt.suggested}<span class="qa-notice-badge qa-notice-badge--suggest">★ Suggested</span>{/if}
                                    {#if opt.warn}<span class="qa-notice-badge qa-notice-badge--warn">{opt.warn}</span>{/if}
                                </span>
                                {#if opt.description}<span class="qa-option-desc">{opt.description}</span>{/if}
                            </span>
                        </label>
                    {/each}
                </fieldset>
                {#if warning}<p class="qa-multiselect-warning" role="alert">{warning}</p>{/if}
            {:else if q.input === 'label' && q.label}
                <LabelBuilder value={value as LabelTemplate} level={q.label.level} dimensionKey={q.label.dimensionKey} suggestedFields={q.label.suggestedFields} suggestedAggField={q.label.suggestedAggField} {onchange} />
            {:else if q.input === 'order'}
                <ul class="qa-drag-list" aria-label="Reorder with the up and down buttons">
                    {#each list as item, i (item)}
                        <li class="qa-drag-item">
                            <span class="qa-drag-position" aria-hidden="true">{i + 1}</span>
                            <span class="qa-drag-label">{item}</span>
                            <div class="qa-drag-btns" role="group" aria-label="Move {item}">
                                <button class="qa-drag-btn" onclick={() => move(i, -1)} disabled={i === 0} aria-label="Move {item} up">&#8593;</button>
                                <button class="qa-drag-btn" onclick={() => move(i, 1)} disabled={i === list.length - 1} aria-label="Move {item} down">&#8595;</button>
                            </div>
                        </li>
                    {/each}
                </ul>
            {/if}
        </div>
    {/if}
</div>

<style>
    .qa-question {
        display: flex;
        flex-direction: column;
        gap: calc(var(--dn-space) * 1.5);
    }

    .qa-question-text {
        margin: 0;
        font-size: 1.0625rem;
        font-weight: 600;
        color: var(--dn-text);
        line-height: 1.4;
    }

    /* ── Info screen: centered, responsive 4-column grid ── */

    .qa-info-wrap {
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 100%;
        gap: calc(var(--dn-space) * 0.75);
    }

    .qa-info-grid,
    .qa-info-captions {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 200px));
        gap: calc(var(--dn-space) * 0.75);
        width: 100%;
        max-width: calc(4 * 200px + 3 * (var(--dn-space) * 0.75));
    }

    /* SVGs fill their column; height scales to maintain aspect ratio.
       max-height caps structure diagrams so they don't grow too tall. */
    .qa-info-grid :global(figure) {
        margin: 0;
    }

    .qa-info-grid :global(svg) {
        display: block;
        width: 100%;
        height: auto;
        max-height: 150px;
    }

    .qa-info-caption {
        margin: 0;
        font-size: 0.75rem;
        color: var(--dn-text-muted);
        line-height: 1.45;
    }

    /* ── Guide area (columns + hint) ── */

    .qa-guide-area {
        display: flex;
        flex-direction: column;
        gap: calc(var(--dn-space) * 0.875);
    }

    .qa-guide-cols {
        display: flex;
        flex-wrap: wrap;
        gap: calc(var(--dn-space) * 1);
        align-items: flex-start;
    }

    .qa-guide-col {
        display: flex;
        flex-direction: column;
        gap: calc(var(--dn-space) * 0.375);
        flex-shrink: 0;
    }

    .qa-guide-col-header {
        font-size: 0.6875rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--dn-text-muted);
        white-space: nowrap;
    }

    .qa-guide-col-items {
        display: flex;
        flex-wrap: wrap;
        gap: calc(var(--dn-space) * 0.5);
        align-items: flex-start;
    }

    .qa-chart-image {
        max-width: 250px;
        max-height: 173px;
        object-fit: contain;
        border-radius: 4px;
        display: block;
    }

    .qa-hint {
        margin: 0;
        font-size: 0.8125rem;
        color: var(--dn-text-muted);
        line-height: 1.5;
    }

    .qa-input-area {
        display: flex;
        flex-direction: column;
        gap: calc(var(--dn-space) * 1);
    }

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

    /* ── Text / Select inputs ── */

    .qa-input,
    .qa-select,
    .qa-code {
        font-family: var(--dn-font-mono);
        font-size: 0.8125rem;
    }

    .qa-textarea {
        width: 100%;
        padding: calc(var(--dn-space) * 0.75) calc(var(--dn-space) * 1);
        border: 1px solid var(--dn-border);
        border-radius: var(--dn-radius);
        background: var(--dn-surface);
        color: var(--dn-text);
        font-size: 0.9375rem;
        font-family: var(--dn-font);
        box-sizing: border-box;
    }

    .qa-textarea {
        resize: vertical;
        min-height: 80px;
    }

    /* ── Shared option card styles ── */

    .qa-radio-group,
    .qa-checkbox-group {
        border: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: calc(var(--dn-space) * 0.75);
    }

    .qa-radio-label,
    .qa-checkbox-label {
        display: flex;
        align-items: flex-start;
        gap: calc(var(--dn-space) * 0.75);
        cursor: pointer;
        padding: calc(var(--dn-space) * 0.875) calc(var(--dn-space) * 1);
        border: 1px solid var(--dn-border);
        border-radius: var(--dn-radius);
        background: var(--dn-surface);
        transition: border-color 0.12s, background 0.12s;
    }

    .qa-radio-label input[type="radio"],
    .qa-checkbox-label input[type="checkbox"] {
        flex-shrink: 0;
        margin-top: 3px;
    }

    .qa-option-checked {
        border-color: var(--dn-accent);
        background: var(--dn-accent-soft);
    }

    .qa-option-disabled {
        opacity: 0.45;
        cursor: not-allowed;
    }

    .qa-option-suggested {
        border-color: var(--dn-accent);
    }

    .qa-option-content {
        display: flex;
        flex-direction: column;
        gap: 3px;
    }

    .qa-option-label-row {
        display: flex;
        align-items: center;
        gap: calc(var(--dn-space) * 0.5);
    }

    .qa-option-label {
        font-size: 0.9375rem;
        font-weight: 500;
        color: var(--dn-text);
    }

    .qa-notice-badge {
        display: inline-flex;
        align-items: center;
        padding: 1px 6px;
        border-radius: 10px;
        font-size: 0.6875rem;
        font-weight: 700;
        letter-spacing: 0.01em;
        flex-shrink: 0;
        white-space: nowrap;
    }

    .qa-notice-badge--suggest {
        color: var(--dn-accent);
        background: var(--dn-accent-soft);
        border: 1px solid var(--dn-accent-light);
    }

    .qa-notice-badge--warn {
        color: #b91c1c;
        background: #fef2f2;
        border: 1px solid #fca5a5;
    }
    :global(.dark) .qa-notice-badge--warn {
        color: #fca5a5;
        background: rgba(239, 68, 68, 0.08);
        border-color: rgba(239, 68, 68, 0.3);
    }

    .qa-option-desc {
        font-size: 0.8125rem;
        color: var(--dn-text-muted);
        line-height: 1.45;
    }

    /* ── Multiselect warning ── */

    .qa-multiselect-warning {
        margin: 0;
        padding: calc(var(--dn-space) * 0.75) calc(var(--dn-space) * 1);
        border: 1px solid #fca5a5;
        border-radius: var(--dn-radius);
        background: #fef2f2;
        color: #b91c1c;
        font-size: 0.8125rem;
        line-height: 1.5;
    }
    :global(.dark) .qa-multiselect-warning {
        background: rgba(239, 68, 68, 0.08);
        border-color: rgba(239, 68, 68, 0.3);
        color: #fca5a5;
    }

    /* ── Expandable info ── */

    .qa-expand-btn {
        align-self: flex-start;
        background: none;
        border: 1px solid var(--dn-control);
        border-radius: var(--dn-radius);
        padding: calc(var(--dn-space) * 0.375) calc(var(--dn-space) * 0.75);
        font-size: 0.8125rem;
        color: var(--dn-accent);
        cursor: pointer;
        font-family: var(--dn-font);
    }

    .qa-expand-btn:hover {
        background: var(--dn-accent-soft);
        border-color: var(--dn-accent);
    }

    .qa-expand-content {
        margin: 0;
        padding: calc(var(--dn-space) * 0.875) calc(var(--dn-space) * 1);
        border: 1px solid var(--dn-border);
        border-radius: var(--dn-radius);
        background: var(--dn-surface);
        font-size: 0.8125rem;
        color: var(--dn-text-muted);
        line-height: 1.55;
    }

    /* ── Suggestion box ── */

    /* ── Drag-order list ── */

    .qa-drag-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: calc(var(--dn-space) * 0.5);
    }

    .qa-drag-item {
        display: flex;
        align-items: center;
        gap: calc(var(--dn-space) * 0.75);
        padding: calc(var(--dn-space) * 0.75) calc(var(--dn-space) * 1);
        border: 1px solid var(--dn-control);
        border-radius: var(--dn-radius);
        background: var(--dn-surface);
    }

    .qa-drag-position {
        font-size: 0.75rem;
        font-weight: 700;
        font-family: var(--dn-font-mono);
        color: var(--dn-text-muted);
        min-width: 16px;
        text-align: right;
        flex-shrink: 0;
    }

    .qa-drag-label {
        font-size: 0.9375rem;
        font-family: var(--dn-font-mono);
        color: var(--dn-text);
        flex: 1;
    }

    .qa-drag-btns {
        display: flex;
        gap: calc(var(--dn-space) * 0.25);
        flex-shrink: 0;
    }

    .qa-drag-btn {
        background: var(--dn-surface);
        border: 1px solid var(--dn-control);
        border-radius: var(--dn-radius);
        padding: 2px 8px;
        cursor: pointer;
        font-size: 0.875rem;
        color: var(--dn-text);
        min-height: 0;
        min-width: 0;
        line-height: 1.4;
    }

    .qa-drag-btn:disabled {
        opacity: 0.3;
        cursor: not-allowed;
    }

    .qa-drag-btn:not(:disabled):hover {
        background: var(--dn-accent-soft);
        border-color: var(--dn-accent);
        color: var(--dn-accent);
    }
</style>
