<script lang="ts">
    import type { LabelTemplate } from '../../../store/appState';
    import LabelBuilder from './LabelBuilder.svelte';
    import GuideGraphic from './GuideGraphic.svelte';

    interface SelectOption {
        value: string;
        label: string;
        description?: string;
        disabled?: boolean;
        suggested?: boolean;
        notice?: { type: 'suggest' | 'warn'; message: string };
    }

    interface ParentDimension {
        key: string;
        isReduced: boolean;
        dimNoun: string;
        hasDivisions: boolean;
        divNoun?: string;
        divTotal?: number;
    }

    interface SuggestedField {
        key: string;
        rank?: '1st' | '2nd' | '3rd';
    }

    interface Props {
        question: string;
        hint?: string;
        inputType: 'text' | 'textarea' | 'dropdown' | 'multiselect' | 'radio' | 'label-builder' | 'drag-order' | 'info';
        options?: SelectOption[];
        value: unknown;
        onchange: (v: unknown) => void;
        // label-builder specific
        fields?: string[];
        sampleData?: Record<string, unknown>;
        nodeType?: 'level0' | 'level1' | 'level2' | 'level3';
        dimensionName?: string;
        parentDimensions?: ParentDimension[];
        suggestedFields?: SuggestedField[];
        // aggregate label-builder extras (level1 and level2 only)
        aggregateFields?: string[];
        trendXFields?: string[];
        suggestedAggField?: string;
        dimensionCount?: number;
        hasDivisions?: boolean;
        rawData?: Record<string, unknown>[];
        dimensionKey?: string;
        // level2 parent dimension info
        parentDimNoun?: string;
        // multiselect limit
        maxSelect?: number;
        // expandable info panel (e.g. "What are dimensions?")
        expandableInfo?: { buttonLabel: string; content: string };
        // smart suggestion box
        suggestionBox?: { message: string; applyLabel: string; applyValue: unknown };
        // contextual visual guide graphics
        visuals?: { variant: string; showRoot?: boolean; label?: string }[];
        // user's uploaded chart image (shown as first column when present)
        chartImage?: string | null;
        // placeholder for text / textarea inputs
        placeholder?: string;
        // caption labels for info-grid third row (one per column)
        captions?: string[];
    }

    let {
        question,
        hint,
        inputType,
        options = [],
        value,
        onchange,
        fields = [],
        sampleData = {},
        nodeType = 'level3',
        dimensionName = undefined,
        parentDimensions = [],
        suggestedFields = [],
        aggregateFields = [],
        trendXFields = undefined,
        suggestedAggField = undefined,
        dimensionCount = 1,
        hasDivisions = false,
        rawData = [],
        dimensionKey = undefined,
        parentDimNoun = undefined,
        maxSelect,
        expandableInfo,
        suggestionBox,
        visuals,
        chartImage = null,
        placeholder = undefined,
        captions = undefined,
    }: Props = $props();

    // ── Guide column derived state ────────────────────────────────────────────
    const treeVisuals = $derived(visuals?.filter(v => v.variant.startsWith('tree-')) ?? []);
    const labeledChartVisuals = $derived(visuals?.filter(v => !v.variant.startsWith('tree-') && v.label) ?? []);
    const unlabeledChartVisuals = $derived(visuals?.filter(v => !v.variant.startsWith('tree-') && !v.label) ?? []);
    const hasImage = $derived(!!chartImage);
    const hasExampleCharts = $derived(unlabeledChartVisuals.length > 0 || labeledChartVisuals.length > 0);
    const hasStructure = $derived(treeVisuals.length > 0);
    // Show category headers when ≥2 of the 3 column types are present
    const showCategoryHeaders = $derived([hasImage, hasExampleCharts, hasStructure].filter(Boolean).length >= 2);

    let expandInfo = $state(false);

    // ── Multiselect helpers ───────────────────────────────────────────────────
    function isChecked(optValue: string): boolean {
        return Array.isArray(value) && (value as string[]).includes(optValue);
    }

    let multiselectWarning = $state('');

    function toggleMultiselect(optValue: string) {
        const current = Array.isArray(value) ? (value as string[]) : [];
        if (!isChecked(optValue) && maxSelect !== undefined && current.length >= maxSelect) {
            multiselectWarning = `We recommend using at most ${maxSelect} dimensions for accessibility reasons. You can enable more later in advanced settings.`;
            return;
        }
        multiselectWarning = '';
        const next = isChecked(optValue)
            ? current.filter(v => v !== optValue)
            : [...current, optValue];
        onchange(next);
    }

    // ── Drag-order helpers ────────────────────────────────────────────────────
    // Use $state (not $derived) so button clicks update the list immediately without
    // relying on the prop round-trip. The $effect syncs from the prop when the parent
    // loads a saved answer (e.g. on question navigation).
    let orderedItems = $state<string[]>([]);

    $effect(() => {
        orderedItems = Array.isArray(value) ? [...(value as string[])] : [];
    });

    function moveUp(index: number) {
        if (index === 0) return;
        const arr = [...orderedItems];
        [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
        orderedItems = arr;
        onchange(arr);
    }

    function moveDown(index: number) {
        if (index >= orderedItems.length - 1) return;
        const arr = [...orderedItems];
        [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
        orderedItems = arr;
        onchange(arr);
    }

    // ── Label builder helpers ─────────────────────────────────────────────────
    const DEFAULT_LABEL_TEMPLATE: LabelTemplate = {
        template: '', name: 'data point', includeIndex: false, includeParentName: false, omitKeyNames: false,
    };

    const labelValue = $derived(
        (value !== null && value !== undefined && typeof value === 'object' && 'template' in (value as object))
            ? (value as LabelTemplate)
            : DEFAULT_LABEL_TEMPLATE
    );
</script>

<div class="qa-question">
    <p class="qa-question-text">{question}</p>

    {#if inputType === 'info'}
        {#if hint}<p class="qa-hint">{hint}</p>{/if}

        {#if (visuals && visuals.length > 0) || (captions && captions.length > 0)}
            <div class="qa-info-wrap">
                {#if visuals && visuals.length > 0}
                    <!-- Info screen: 4-column grid — row 1: charts, row 2: structure diagrams -->
                    <div class="qa-info-grid">
                        {#each visuals as v (v.variant)}
                            <!-- eslint-disable-next-line @typescript-eslint/no-explicit-any -->
                            <GuideGraphic variant={v.variant as any} showRoot={v.showRoot ?? true} />
                        {/each}
                    </div>
                {/if}

                {#if captions && captions.length > 0}
                    <!-- Row 3: brief text caption per column -->
                    <div class="qa-info-captions">
                        {#each captions as caption}
                            <p class="qa-info-caption">{caption}</p>
                        {/each}
                    </div>
                {/if}
            </div>
        {/if}

    {:else if (visuals && visuals.length > 0) || chartImage || hint}
        <div class="qa-guide-area">

            {#if (visuals && visuals.length > 0) || chartImage}
                <div class="qa-guide-cols">

                    <!-- Column 1: user's uploaded chart -->
                    {#if chartImage}
                        <div class="qa-guide-col">
                            {#if showCategoryHeaders}<span class="qa-guide-col-header">Your chart</span>{/if}
                            <img src={chartImage} alt="Your uploaded chart, shown as a reference alongside this question" class="qa-chart-image" />
                        </div>
                    {/if}

                    <!-- Column group: unlabeled example charts (all in one col-group) -->
                    {#if unlabeledChartVisuals.length > 0}
                        <div class="qa-guide-col">
                            {#if showCategoryHeaders}<span class="qa-guide-col-header">Example chart</span>{/if}
                            <div class="qa-guide-col-items">
                                {#each unlabeledChartVisuals as v (v.variant)}
                                    <!-- eslint-disable-next-line @typescript-eslint/no-explicit-any -->
                                    <GuideGraphic variant={v.variant as any} showRoot={v.showRoot ?? true} />
                                {/each}
                            </div>
                        </div>
                    {/if}

                    <!-- Individually labeled charts (each gets its own column with its own header) -->
                    {#each labeledChartVisuals as v (v.variant)}
                        <div class="qa-guide-col">
                            <span class="qa-guide-col-header">{v.label}</span>
                            <!-- eslint-disable-next-line @typescript-eslint/no-explicit-any -->
                            <GuideGraphic variant={v.variant as any} showRoot={v.showRoot ?? true} />
                        </div>
                    {/each}

                    <!-- Structure tree column (always last) -->
                    {#if treeVisuals.length > 0}
                        <div class="qa-guide-col">
                            {#if showCategoryHeaders}<span class="qa-guide-col-header">Structure we are editing</span>{/if}
                            <div class="qa-guide-col-items">
                                {#each treeVisuals as v (v.variant)}
                                    <!-- eslint-disable-next-line @typescript-eslint/no-explicit-any -->
                                    <GuideGraphic variant={v.variant as any} showRoot={v.showRoot ?? true} />
                                {/each}
                            </div>
                        </div>
                    {/if}

                </div>
            {/if}

            {#if hint}<p class="qa-hint">{hint}</p>{/if}
        </div>
    {/if}

    {#if expandableInfo}
        <button
            class="qa-expand-btn"
            onclick={() => (expandInfo = !expandInfo)}
            aria-expanded={expandInfo}
        >{expandableInfo.buttonLabel}</button>
        {#if expandInfo}
            <p class="qa-expand-content">{expandableInfo.content}</p>
        {/if}
    {/if}

    {#if suggestionBox}
        <div class="qa-suggestion-box" role="note">
            <p class="qa-suggestion-msg">{suggestionBox.message}</p>
            <button
                class="qa-suggestion-apply"
                onclick={() => onchange(suggestionBox!.applyValue)}
            >{suggestionBox.applyLabel}</button>
        </div>
    {/if}

    {#if inputType !== 'info'}
    <div class="qa-input-area" aria-label="Answer input">
        {#if inputType === 'text'}
            <label class="visually-hidden" for="qa-text-input">Your answer</label>
            <input
                id="qa-text-input"
                type="text"
                class="qa-input"
                value={typeof value === 'string' ? value : ''}
                placeholder={placeholder ?? ''}
                oninput={(e) => onchange((e.target as HTMLInputElement).value)}
            />

        {:else if inputType === 'textarea'}
            <label class="visually-hidden" for="qa-textarea-input">Your answer</label>
            <textarea
                id="qa-textarea-input"
                class="qa-textarea"
                rows={4}
                placeholder={placeholder ?? ''}
                oninput={(e) => onchange((e.target as HTMLTextAreaElement).value)}
            >{typeof value === 'string' ? value : ''}</textarea>

        {:else if inputType === 'dropdown'}
            <label class="visually-hidden" for="qa-select-input">Choose one</label>
            <select
                id="qa-select-input"
                class="qa-select"
                onchange={(e) => onchange((e.target as HTMLSelectElement).value)}
            >
                <option value="" disabled selected={!value}>— Choose one —</option>
                {#each options as opt (opt.value)}
                    <option
                        value={opt.value}
                        disabled={opt.disabled ?? false}
                        selected={value === opt.value}
                    >{opt.label}</option>
                {/each}
            </select>

        {:else if inputType === 'radio'}
            <fieldset class="qa-radio-group">
                <legend class="visually-hidden">Choose one</legend>
                {#each options as opt (opt.value)}
                    <label
                        class="qa-radio-label"
                        class:qa-option-checked={value === opt.value}
                        class:qa-option-disabled={opt.disabled}
                        class:qa-option-suggested={(opt.suggested || opt.notice?.type === 'suggest') && value !== opt.value}
                    >
                        <input
                            type="radio"
                            name="qa-radio"
                            value={opt.value}
                            checked={value === opt.value}
                            disabled={opt.disabled ?? false}
                            onchange={() => { if (!opt.disabled) onchange(opt.value); }}
                        />
                        <span class="qa-option-content">
                            <span class="qa-option-label-row">
                                <span class="qa-option-label">{opt.label}</span>
                                {#if opt.notice}
                                    <span class="qa-notice-badge qa-notice-badge--{opt.notice.type}">{opt.notice.message}</span>
                                {/if}
                            </span>
                            {#if opt.description}
                                <span class="qa-option-desc">{opt.description}</span>
                            {/if}
                        </span>
                    </label>
                {/each}
            </fieldset>

        {:else if inputType === 'multiselect'}
            <fieldset class="qa-checkbox-group">
                <legend class="visually-hidden">Choose all that apply</legend>
                {#each options as opt (opt.value)}
                    <label
                        class="qa-checkbox-label"
                        class:qa-option-checked={isChecked(opt.value)}
                        class:qa-option-disabled={opt.disabled}
                        class:qa-option-suggested={opt.suggested && !isChecked(opt.value)}
                    >
                        <input
                            type="checkbox"
                            checked={isChecked(opt.value)}
                            disabled={opt.disabled ?? false}
                            onchange={() => { if (!opt.disabled) toggleMultiselect(opt.value); }}
                        />
                        <span class="qa-option-content">
                            <span class="qa-option-label-row">
                                <span class="qa-option-label">{opt.label}</span>
                                {#if opt.suggested}
                                    <span class="qa-suggested-badge">★ Suggested</span>
                                {/if}
                            </span>
                            {#if opt.description}
                                <span class="qa-option-desc">{opt.description}</span>
                            {/if}
                        </span>
                    </label>
                {/each}
            </fieldset>
            {#if multiselectWarning}
                <p class="qa-multiselect-warning" role="alert">{multiselectWarning}</p>
            {/if}

        {:else if inputType === 'label-builder'}
            <LabelBuilder
                {fields}
                {nodeType}
                value={labelValue}
                {sampleData}
                {dimensionName}
                {parentDimensions}
                {suggestedFields}
                {aggregateFields}
                {trendXFields}
                {suggestedAggField}
                {dimensionCount}
                {hasDivisions}
                {rawData}
                {dimensionKey}
                {parentDimNoun}
                onchange={(v) => onchange(v)}
            />

        {:else if inputType === 'drag-order'}
            <ul class="qa-drag-list" role="list" aria-label="Drag to reorder (use up/down buttons)">
                {#each orderedItems as item, i (item)}
                    <li class="qa-drag-item">
                        <span class="qa-drag-position" aria-hidden="true">{i + 1}</span>
                        <span class="qa-drag-label">{item}</span>
                        <div class="qa-drag-btns" role="group" aria-label="Move {item}">
                            <button
                                class="qa-drag-btn"
                                onclick={() => moveUp(i)}
                                disabled={i === 0}
                                aria-label="Move {item} up"
                            >&#8593;</button>
                            <button
                                class="qa-drag-btn"
                                onclick={() => moveDown(i)}
                                disabled={i === orderedItems.length - 1}
                                aria-label="Move {item} down"
                            >&#8595;</button>
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

    .qa-suggested-badge {
        display: inline-flex;
        align-items: center;
        padding: 1px 6px;
        border-radius: 10px;
        font-size: 0.6875rem;
        font-weight: 700;
        color: var(--dn-accent);
        background: var(--dn-accent-soft);
        border: 1px solid var(--dn-accent-light);
        letter-spacing: 0.01em;
        flex-shrink: 0;
        white-space: nowrap;
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
    .dark .qa-notice-badge--warn {
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
    .dark .qa-multiselect-warning {
        background: rgba(239, 68, 68, 0.08);
        border-color: rgba(239, 68, 68, 0.3);
        color: #fca5a5;
    }

    /* ── Expandable info ── */

    .qa-expand-btn {
        align-self: flex-start;
        background: none;
        border: 1px solid var(--dn-border);
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

    .qa-suggestion-box {
        display: flex;
        flex-direction: column;
        gap: calc(var(--dn-space) * 0.75);
        padding: calc(var(--dn-space) * 0.875) calc(var(--dn-space) * 1);
        border: 1px solid var(--dn-accent);
        border-radius: var(--dn-radius);
        background: var(--dn-accent-soft);
    }

    .qa-suggestion-msg {
        margin: 0;
        font-size: 0.8125rem;
        color: var(--dn-text);
        line-height: 1.5;
    }

    .qa-suggestion-apply {
        align-self: flex-start;
        background: var(--dn-accent);
        border: none;
        border-radius: var(--dn-radius);
        padding: calc(var(--dn-space) * 0.375) calc(var(--dn-space) * 0.875);
        font-size: 0.8125rem;
        font-family: var(--dn-font);
        color: #fff;
        cursor: pointer;
    }

    .qa-suggestion-apply:hover {
        opacity: 0.88;
    }

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
        border: 1px solid var(--dn-border);
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
        border: 1px solid var(--dn-border);
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
