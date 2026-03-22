<script lang="ts">
    import type { LabelTemplate } from '../../../store/appState';
    import LabelBuilder from './LabelBuilder.svelte';

    interface SelectOption {
        value: string;
        label: string;
        description?: string;
        disabled?: boolean;
    }

    interface Props {
        question: string;
        hint?: string;
        inputType: 'text' | 'textarea' | 'dropdown' | 'multiselect' | 'radio' | 'label-builder' | 'drag-order';
        options?: SelectOption[];
        value: unknown;
        onchange: (v: unknown) => void;
        // label-builder specific
        fields?: string[];
        sampleData?: Record<string, unknown>;
        nodeType?: 'level0' | 'level1' | 'level2' | 'level3';
        // multiselect limit
        maxSelect?: number;
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
        maxSelect,
    }: Props = $props();

    // ── Multiselect helpers ───────────────────────────────────────────────────
    function isChecked(optValue: string): boolean {
        return Array.isArray(value) && (value as string[]).includes(optValue);
    }

    let multiselectWarning = $state('');

    function toggleMultiselect(optValue: string) {
        const current = Array.isArray(value) ? (value as string[]) : [];
        if (!isChecked(optValue) && maxSelect !== undefined && current.length >= maxSelect) {
            multiselectWarning = `We recommend using at most ${maxSelect} browsing groups for accessibility reasons. You can enable more later in advanced settings.`;
            return;
        }
        multiselectWarning = '';
        const next = isChecked(optValue)
            ? current.filter(v => v !== optValue)
            : [...current, optValue];
        onchange(next);
    }

    // ── Drag-order helpers ────────────────────────────────────────────────────
    const orderedItems = $derived(Array.isArray(value) ? (value as string[]) : []);

    function moveUp(index: number) {
        if (index === 0) return;
        const arr = [...orderedItems];
        [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
        onchange(arr);
    }

    function moveDown(index: number) {
        if (index >= orderedItems.length - 1) return;
        const arr = [...orderedItems];
        [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
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

    {#if hint}
        <p class="qa-hint">{hint}</p>
    {/if}

    <div class="qa-input-area" aria-label="Answer input">
        {#if inputType === 'text'}
            <label class="visually-hidden" for="qa-text-input">Your answer</label>
            <input
                id="qa-text-input"
                type="text"
                class="qa-input"
                value={typeof value === 'string' ? value : ''}
                oninput={(e) => onchange((e.target as HTMLInputElement).value)}
            />

        {:else if inputType === 'textarea'}
            <label class="visually-hidden" for="qa-textarea-input">Your answer</label>
            <textarea
                id="qa-textarea-input"
                class="qa-textarea"
                rows={4}
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
                            <span class="qa-option-label">{opt.label}</span>
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
                    >
                        <input
                            type="checkbox"
                            checked={isChecked(opt.value)}
                            disabled={opt.disabled ?? false}
                            onchange={() => { if (!opt.disabled) toggleMultiselect(opt.value); }}
                        />
                        <span class="qa-option-content">
                            <span class="qa-option-label">{opt.label}</span>
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

    .qa-option-content {
        display: flex;
        flex-direction: column;
        gap: 3px;
    }

    .qa-option-label {
        font-size: 0.9375rem;
        font-weight: 500;
        color: var(--dn-text);
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
