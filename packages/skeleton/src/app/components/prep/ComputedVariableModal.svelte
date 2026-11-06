<script lang="ts">
    import { app, edit } from '../../../model/state.svelte';
    import type { FormulaToken } from '../../../model/doc';
    import { evalFormula } from '../../../runtime/dn-runtime.js';

    const { onclose }: { onclose: () => void } = $props();

    let dialog: HTMLDialogElement;
    $effect(() => dialog.showModal());
    $effect(() => {
        step;
        dialog.querySelector<HTMLElement>('.modal-body input, .modal-body button')?.focus();
    });

    const activeVars = $derived(app.doc.data.fields.filter(f => !f.removed));
    const numVars = $derived(activeVars.filter(v => v.type === 'numerical'));
    const rows = $derived(app.prepared);
    let step = $state<'name' | 'formula'>('name');
    let varName = $state('');
    let varNameError = $state('');
    let tokens = $state<FormulaToken[]>([]);
    let literalNum = $state('');
    let ifField = $state('');
    let ifOp = $state('>');
    let ifThreshold = $state('');
    let ifThenField = $state('');
    let ifElseField = $state('');

    function validateAndAdvance() {
        const name = varName.trim();
        varNameError = !name ? 'Please enter a name for your new variable.' : app.doc.data.fields.some(f => f.key === name) ? `A variable named "${name}" already exists. Choose a different name.` : '';
        if (!varNameError) step = 'formula';
    }

    const add = (kind: FormulaToken['kind'], value: string) => (tokens = [...tokens, { kind, value }]);
    function addLiteralNum() {
        if (literalNum === '' || isNaN(Number(literalNum))) return;
        add('literal_num', String(literalNum));
        literalNum = '';
    }
    function addIfCond() {
        if (!ifField || ifThreshold === '') return;
        add('if_cond', `${ifField} ${ifOp} ${ifThreshold} ? ${ifThenField || '0'} : ${ifElseField || '0'}`);
        ifField = ifThreshold = ifThenField = ifElseField = '';
        ifOp = '>';
    }
    const LABELS: Partial<Record<FormulaToken['kind'], (v: string) => string>> = { field_row: v => `[${v}]`, field_sum: v => `sum(${v})`, field_mean: v => `mean(${v})`, count_all: () => 'count(all rows)', if_cond: v => `if(${v})` };
    const tokenLabel = (t: FormulaToken) => LABELS[t.kind]?.(t.value) ?? t.value;
    const show = (v: unknown) => (typeof v === 'number' ? String(+v.toFixed(4)) : v == null ? '(empty)' : String(v));
    const results = $derived(tokens.length ? rows.map(r => evalFormula($state.snapshot(tokens), r, rows)) : []);
    const livePreview = $derived(results.slice(0, 5).map(show));

    function close() {
        if (tokens.length && !confirm('Discard this variable?')) return;
        dialog.close();
    }

    function addVariable() {
        const key = varName.trim();
        const formula = $state.snapshot(tokens);
        const type = results.every(v => v === null || v === '' || !isNaN(Number(v))) ? 'numerical' : 'categorical';
        edit(`Prep: added computed variable ${key}`, d => d.data.fields.push({ key, type, formula }));
        tokens = [];
        dialog.close();
    }
</script>

<dialog class="modal" bind:this={dialog} aria-labelledby="cvm-title" onclose={onclose} oncancel={e => tokens.length && !confirm('Discard this variable?') && e.preventDefault()}>
    <div class="modal-header">
        <h2 id="cvm-title" class="modal-title">Add a variable</h2>
        <button class="btn-close" onclick={close} aria-label="Close dialog">&times;</button>
    </div>

    <div class="modal-body">
            {#if step === 'name'}
                <!-- ── Step B: Variable name ── -->
                <div class="step-section">
                    <label class="step-question" for="cvm-var-name">
                        What do you want to call this new variable?
                    </label>
                    <p class="step-hint">
                        Choose a short, descriptive name. Example: "price_per_unit", "score_rank", "is_above_average".
                    </p>
                    <input
                        id="cvm-var-name"
                        type="text"
                        class="name-input"
                        placeholder="Variable name"
                        bind:value={varName}
                        onkeydown={(e) => { if (e.key === 'Enter') validateAndAdvance(); }}
                    />
                    {#if varNameError}
                        <p class="error-msg" role="alert">{varNameError}</p>
                    {/if}
                </div>

                <div class="modal-footer-inline">
                    <button class="btn-secondary" onclick={close}>Cancel</button>
                    <button class="btn-primary" onclick={validateAndAdvance}>
                        Next: build formula
                    </button>
                </div>

            {:else}
                <!-- ── Step C: Formula editor ── -->
                <div class="formula-editor">

                    <!-- Formula strip -->
                    <div class="formula-strip-label" id="formula-strip-label">
                        Your formula — click ✕ to remove a piece
                    </div>
                    <div
                        class="formula-strip"
                        role="list"
                        aria-labelledby="formula-strip-label"
                        aria-live="polite"
                    >
                        {#if tokens.length === 0}
                            <span class="formula-empty">No pieces yet — add some below</span>
                        {:else}
                            {#each tokens as token, i (i)}
                                <span class="token-chip token-chip-{token.kind}" role="listitem">
                                    {tokenLabel(token)}
                                    <button
                                        class="token-remove"
                                        onclick={() => (tokens = tokens.filter((_, j) => j !== i))}
                                        aria-label="Remove {tokenLabel(token)} from formula"
                                    >&#x2715;</button>
                                </span>
                            {/each}
                        {/if}
                    </div>

                    <!-- Live preview -->
                    {#if tokens.length > 0}
                        <div class="live-preview" aria-live="polite" aria-label="Live preview of formula result">
                            <span class="preview-label">Preview on first {livePreview.length} rows:</span>
                            <span class="preview-values">{livePreview.join(', ')}</span>
                        </div>
                    {/if}

                    <!-- Building blocks -->
                    <div class="blocks-area">

                        <!-- Data values per row -->
                        <section class="block-section" aria-labelledby="block-row-label">
                            <h4 class="block-section-label" id="block-row-label">Data values (current row)</h4>
                            <div class="chip-group">
                                {#each activeVars as v (v.key)}
                                    <button
                                        class="chip chip-field"
                                        onclick={() => add('field_row', v.key)}
                                        aria-label="Add {v.key} (current row value)"
                                    >
                                        [{v.key}]
                                    </button>
                                {/each}
                            </div>
                        </section>

                        <!-- Aggregate values -->
                        {#if numVars.length > 0}
                            <section class="block-section" aria-labelledby="block-agg-label">
                                <h4 class="block-section-label" id="block-agg-label">Aggregate values (across all rows)</h4>
                                <div class="chip-group">
                                    {#each numVars as v (v.key)}
                                        <button
                                            class="chip chip-agg"
                                            onclick={() => add('field_sum', v.key)}
                                            aria-label="Add sum of {v.key}"
                                        >
                                            sum({v.key})
                                        </button>
                                        <button
                                            class="chip chip-agg"
                                            onclick={() => add('field_mean', v.key)}
                                            aria-label="Add mean of {v.key}"
                                        >
                                            mean({v.key})
                                        </button>
                                    {/each}
                                    <button
                                        class="chip chip-agg"
                                        onclick={() => add('count_all', 'count_all')}
                                        aria-label="Add total row count"
                                    >
                                        count(all rows)
                                    </button>
                                </div>
                            </section>
                        {/if}

                        <!-- Math operators -->
                        <section class="block-section" aria-labelledby="block-ops-label">
                            <h4 class="block-section-label" id="block-ops-label">Math operators</h4>
                            <div class="chip-group">
                                {#each ['+', '-', '/', '*'] as op}
                                    <button
                                        class="chip chip-op"
                                        onclick={() => add('op', op)}
                                        aria-label="Add operator {op}"
                                    >
                                        {op}
                                    </button>
                                {/each}
                            </div>
                        </section>

                        <!-- If/then/else -->
                        <section class="block-section" aria-labelledby="block-if-label">
                            <h4 class="block-section-label" id="block-if-label">Logic: if / then / else</h4>
                            <div class="if-picker">
                                <label class="picker-label" for="if-field">If column</label>
                                <select id="if-field" class="picker-select" bind:value={ifField}>
                                    <option value="">— pick a column —</option>
                                    {#each numVars as v (v.key)}
                                        <option value={v.key}>{v.key}</option>
                                    {/each}
                                </select>

                                <label class="picker-label" for="if-op">is</label>
                                <select id="if-op" class="picker-select picker-select-narrow" bind:value={ifOp}>
                                    <option value=">">greater than (&gt;)</option>
                                    <option value="<">less than (&lt;)</option>
                                    <option value=">=">at least (&gt;=)</option>
                                    <option value="<=">at most (&lt;=)</option>
                                    <option value="===">exactly equal (=)</option>
                                    <option value="!=">not equal (≠)</option>
                                </select>

                                <label class="picker-label" for="if-thresh">value</label>
                                <input
                                    id="if-thresh"
                                    type="number"
                                    class="picker-input"
                                    placeholder="0"
                                    bind:value={ifThreshold}
                                />

                                <label class="picker-label" for="if-then">then result <span class="step-hint">(a column name or a value)</span></label>
                                <input
                                    id="if-then"
                                    type="text"
                                    class="picker-input"
                                    placeholder="value if true"
                                    bind:value={ifThenField}
                                />

                                <label class="picker-label" for="if-else">else result</label>
                                <input
                                    id="if-else"
                                    type="text"
                                    class="picker-input"
                                    placeholder="value if false"
                                    bind:value={ifElseField}
                                />

                                <button
                                    class="chip chip-if"
                                    onclick={addIfCond}
                                    disabled={!ifField || !ifThreshold}
                                    aria-label="Add if-then-else condition"
                                >
                                    + add condition
                                </button>
                            </div>
                        </section>

                        <!-- Literal number -->
                        <section class="block-section" aria-labelledby="block-literal-label">
                            <h4 class="block-section-label" id="block-literal-label">Literal number</h4>
                            <div class="inline-picker">
                                <label class="picker-label" for="literal-num">Number</label>
                                <input
                                    id="literal-num"
                                    type="number"
                                    class="picker-input"
                                    placeholder="e.g. 100"
                                    bind:value={literalNum}
                                    onkeydown={(e) => { if (e.key === 'Enter') addLiteralNum(); }}
                                />
                                <button
                                    class="chip chip-literal"
                                    onclick={addLiteralNum}
                                    disabled={!literalNum || isNaN(Number(literalNum))}
                                    aria-label="Add number {literalNum}"
                                >+ add</button>
                            </div>
                        </section>

                    </div>
                </div>

                <div class="modal-footer-inline">
                    <button class="btn-secondary" onclick={() => { step = 'name'; }}>Back</button>
                    <button
                        class="btn-primary"
                        onclick={addVariable}
                        disabled={tokens.length === 0}
                        aria-disabled={tokens.length === 0}
                    >
                        Add variable "{varName}"
                    </button>
                </div>
            {/if}

    </div>
</dialog>

<style>
    /* ── Modal shell ── */
    .modal {
        background: var(--dn-bg);
        border: 1px solid var(--dn-border);
        border-radius: var(--dn-radius);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        width: min(680px, 94vw);
        max-height: 88vh;
        display: flex;
        flex-direction: column;
        outline: none;
    }

    /* ── Header ── */
    .modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: calc(var(--dn-space) * 2) calc(var(--dn-space) * 2.5);
        border-bottom: 1px solid var(--dn-border);
        flex-shrink: 0;
    }

    .modal-title {
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
        color: var(--dn-text);
    }

    .btn-close {
        background: none;
        border: none;
        font-size: 1.25rem;
        line-height: 1;
        color: var(--dn-text-muted);
        cursor: pointer;
        padding: 4px;
        min-height: 0;
        min-width: 0;
        border-radius: 4px;
    }

    .btn-close:hover {
        color: var(--dn-text);
        background: var(--dn-surface);
    }

    /* ── Body ── */
    .modal-body {
        padding: calc(var(--dn-space) * 2) calc(var(--dn-space) * 2.5);
        overflow-y: auto;
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: calc(var(--dn-space) * 2);
    }

    /* ── Step sections ── */
    .step-section {
        display: flex;
        flex-direction: column;
        gap: calc(var(--dn-space) * 1);
    }

    .step-question {
        margin: 0;
        font-size: 0.9375rem;
        font-weight: 600;
        color: var(--dn-text);
        line-height: 1.4;
    }

    .step-hint {
        margin: 0;
        font-size: 0.8125rem;
        color: var(--dn-text-muted);
        line-height: 1.5;
    }

    /* ── ID choice buttons ── */
    .id-choice-btns {
        display: flex;
        flex-direction: column;
        gap: calc(var(--dn-space) * 0.75);
    }

    .btn-choice {
        background: var(--dn-surface);
        border: 2px solid var(--dn-border);
        border-radius: var(--dn-radius);
        padding: calc(var(--dn-space) * 1.25) calc(var(--dn-space) * 1.5);
        text-align: left;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        gap: calc(var(--dn-space) * 0.25);
        min-height: 0;
        font-family: var(--dn-font);
        transition: border-color 0.15s;
    }

    .btn-choice:hover {
        border-color: var(--dn-accent);
    }

    .btn-choice-selected {
        border-color: var(--dn-accent);
        background: var(--dn-accent-soft);
    }

    .choice-label {
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--dn-text);
    }

    .choice-desc {
        font-size: 0.8125rem;
        color: var(--dn-text-muted);
    }

    /* ── Name input ── */
    .name-input {
        padding: calc(var(--dn-space) * 0.75) calc(var(--dn-space) * 1.25);
        border: 1px solid var(--dn-border);
        border-radius: var(--dn-radius);
        background: var(--dn-bg);
        color: var(--dn-text);
        font-size: 0.9375rem;
        font-family: var(--dn-font-mono);
        min-height: 0;
        width: 100%;
    }

    .name-input:focus {
        outline: 2px solid var(--dn-accent);
        outline-offset: 1px;
    }

    .error-msg {
        margin: 0;
        font-size: 0.8125rem;
        color: #dc2626;
    }

    /* ── Formula editor ── */
    .formula-editor {
        display: flex;
        flex-direction: column;
        gap: calc(var(--dn-space) * 1.25);
    }

    .formula-strip-label {
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--dn-text-muted);
        text-transform: uppercase;
        letter-spacing: 0.04em;
    }

    .formula-strip {
        display: flex;
        flex-wrap: wrap;
        gap: calc(var(--dn-space) * 0.5);
        min-height: 44px;
        padding: calc(var(--dn-space) * 0.75);
        border: 1px solid var(--dn-border);
        border-radius: var(--dn-radius);
        background: var(--dn-surface);
        align-items: center;
    }

    .formula-empty {
        font-size: 0.8125rem;
        color: var(--dn-text-muted);
        font-style: italic;
    }

    /* ── Token chips ── */
    .token-chip {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 0.75rem;
        font-family: var(--dn-font-mono);
        font-weight: 500;
        background: var(--dn-accent-soft);
        color: var(--dn-accent);
        border: 1px solid var(--dn-accent-light);
    }

    .token-chip-op {
        background: #fef3c7;
        color: #92400e;
        border-color: #fcd34d;
    }

    .token-chip-literal_num,
    .token-chip-literal_str {
        background: #f0fdf4;
        color: #166534;
        border-color: #86efac;
    }

    .token-chip-if_cond {
        background: #fdf4ff;
        color: #7c3aed;
        border-color: #e9d5ff;
    }

    .token-remove {
        background: none;
        border: none;
        padding: 0 2px;
        cursor: pointer;
        font-size: 0.6875rem;
        color: inherit;
        opacity: 0.6;
        min-height: 0;
        min-width: 0;
        line-height: 1;
        border-radius: 2px;
    }

    .token-remove:hover {
        opacity: 1;
    }

    /* ── Live preview ── */
    .live-preview {
        display: flex;
        align-items: baseline;
        gap: calc(var(--dn-space) * 0.75);
        padding: calc(var(--dn-space) * 0.75) calc(var(--dn-space) * 1.25);
        background: #f0fdf4;
        border: 1px solid #86efac;
        border-radius: var(--dn-radius);
        font-size: 0.8125rem;
    }

    .preview-label {
        color: #166534;
        font-weight: 600;
        white-space: nowrap;
        flex-shrink: 0;
    }

    .preview-values {
        color: #166534;
        font-family: var(--dn-font-mono);
    }

    /* ── Building blocks area ── */
    .blocks-area {
        display: flex;
        flex-direction: column;
        gap: calc(var(--dn-space) * 1.25);
        padding-top: calc(var(--dn-space) * 0.5);
        border-top: 1px solid var(--dn-border);
    }

    .block-section {
        display: flex;
        flex-direction: column;
        gap: calc(var(--dn-space) * 0.5);
    }

    .block-section-label {
        margin: 0;
        font-size: 0.6875rem;
        font-weight: 600;
        color: var(--dn-text-muted);
        text-transform: uppercase;
        letter-spacing: 0.04em;
    }

    .chip-group {
        display: flex;
        flex-wrap: wrap;
        gap: calc(var(--dn-space) * 0.5);
    }

    /* ── Chips ── */
    .chip {
        padding: 3px 10px;
        border-radius: 4px;
        font-size: 0.75rem;
        font-family: var(--dn-font-mono);
        font-weight: 500;
        cursor: pointer;
        border: 1px solid;
        min-height: 0;
        min-width: 0;
        transition: opacity 0.1s;
    }

    .chip:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }

    .chip-field {
        background: var(--dn-accent-soft);
        color: var(--dn-accent);
        border-color: var(--dn-accent-light);
    }

    .chip-field:hover:not(:disabled) {
        background: var(--dn-accent);
        color: #fff;
    }

    .chip-agg {
        background: #ede9fe;
        color: #6d28d9;
        border-color: #c4b5fd;
    }

    .chip-agg:hover:not(:disabled) {
        background: #6d28d9;
        color: #fff;
    }

    .chip-op {
        background: #fef3c7;
        color: #92400e;
        border-color: #fcd34d;
        min-width: 36px;
        text-align: center;
    }

    .chip-op:hover:not(:disabled) {
        background: #f59e0b;
        color: #fff;
        border-color: #f59e0b;
    }

    .chip-if {
        background: #fdf4ff;
        color: #7c3aed;
        border-color: #e9d5ff;
    }

    .chip-if:hover:not(:disabled) {
        background: #7c3aed;
        color: #fff;
    }

    .chip-literal {
        background: #f0fdf4;
        color: #166534;
        border-color: #86efac;
    }

    .chip-literal:hover:not(:disabled) {
        background: #16a34a;
        color: #fff;
    }

    /* ── Inline pickers ── */
    .inline-picker,
    .if-picker {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: calc(var(--dn-space) * 0.5);
    }

    .picker-label {
        font-size: 0.75rem;
        color: var(--dn-text-muted);
        white-space: nowrap;
    }

    .picker-select,
    .picker-input {
        padding: 3px 8px;
        border: 1px solid var(--dn-border);
        border-radius: var(--dn-radius);
        background: var(--dn-bg);
        color: var(--dn-text);
        font-size: 0.8125rem;
        font-family: var(--dn-font);
        min-height: 0;
    }

    .picker-select:focus,
    .picker-input:focus {
        outline: 2px solid var(--dn-accent);
        outline-offset: 1px;
    }

    .picker-select-narrow {
        max-width: 180px;
    }

    .picker-input {
        width: 100px;
        font-family: var(--dn-font-mono);
    }

    /* ── Literal group ── */
    .literal-group {
        display: flex;
        flex-direction: column;
        gap: calc(var(--dn-space) * 0.5);
    }

    .literal-row {
        display: flex;
        align-items: center;
        gap: calc(var(--dn-space) * 0.5);
    }

    /* ── Footer (inline, at bottom of body) ── */
    .modal-footer-inline {
        display: flex;
        justify-content: flex-end;
        gap: calc(var(--dn-space) * 1);
        padding-top: calc(var(--dn-space) * 1.5);
        border-top: 1px solid var(--dn-border);
        flex-shrink: 0;
    }

    .btn-primary {
        background: var(--dn-accent);
        color: #fff;
        border: none;
        padding: calc(var(--dn-space) * 0.75) calc(var(--dn-space) * 2);
        border-radius: var(--dn-radius);
        font-size: 0.875rem;
        font-family: var(--dn-font);
        font-weight: 500;
        cursor: pointer;
        min-height: 0;
    }

    .btn-primary:hover:not(:disabled) {
        background: var(--dn-accent-hover);
    }

    .btn-primary:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }

    .btn-secondary {
        background: var(--dn-surface);
        color: var(--dn-text);
        border: 1px solid var(--dn-border);
        padding: calc(var(--dn-space) * 0.75) calc(var(--dn-space) * 2);
        border-radius: var(--dn-radius);
        font-size: 0.875rem;
        font-family: var(--dn-font);
        font-weight: 500;
        cursor: pointer;
        min-height: 0;
    }

    .btn-secondary:hover {
        background: var(--dn-border);
    }
</style>
