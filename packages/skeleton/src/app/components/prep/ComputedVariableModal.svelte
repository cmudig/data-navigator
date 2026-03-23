<script lang="ts">
    import { appState, type PrepState, type VariableMeta, type FormulaToken, type ComputedVariable } from '../../../store/appState';
    import { logAction } from '../../../store/historyStore';

    type Props = { onclose: () => void };
    const { onclose }: Props = $props();

    // ─── Store snapshot ──────────────────────────────────────────────────────
    // appState.subscribe calls the callback synchronously on first call, so prep
    // is correctly initialized before any reactive reads.
    import { onDestroy } from 'svelte';
    let prep = $state<PrepState | null>(null);
    const unsub = appState.subscribe(s => { prep = s.prepState; });
    onDestroy(unsub);

    // ─── Derived helpers ─────────────────────────────────────────────────────
    const activeVars = $derived(prep?.variables.filter(v => !v.removed) ?? []);
    const numVars = $derived(activeVars.filter(v => v.type === 'numerical'));
    const hasId = $derived(activeVars.some(v => v.isId));

    // Working dataset: uploaded or custom
    let workingData = $state<Record<string, unknown>[]>([]);
    const unsubData = appState.subscribe(s => {
        workingData = s.uploadedData ?? s.prepState?.customData ?? [];
    });
    onDestroy(unsubData);

    // ─── Step state ──────────────────────────────────────────────────────────
    // Step A: ID check (skipped if ID already exists)
    // Step B: variable name
    // Step C: formula editor
    type Step = 'id-check' | 'name' | 'formula';
    // Compute initial step from the synchronous prep snapshot — avoids referencing
    // $derived hasId during $state initialization (captures only initial value).
    const initHasId = prep?.variables?.filter(v => !v.removed).some(v => v.isId) ?? false;
    let step = $state<Step>(initHasId ? 'name' : 'id-check');

    // Step A choice
    let idChoice = $state<'auto' | 'manual' | null>(null);

    // Step B
    let varName = $state('');
    let varNameError = $state('');

    // Step C
    let tokens = $state<FormulaToken[]>([]);

    // Literal number input
    let literalNum = $state('');

    // If-cond sub-editor
    let ifField = $state('');
    let ifOp = $state('>');
    let ifThreshold = $state('');
    let ifThenField = $state('');
    let ifElseField = $state('');

    // ─── Focus trap ──────────────────────────────────────────────────────────
    let dialogEl: HTMLElement | undefined = $state();

    $effect(() => {
        if (dialogEl) {
            const first = dialogEl.querySelector<HTMLElement>(
                'button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            first?.focus();
        }
    });

    function onKeydown(e: KeyboardEvent) {
        if (e.key === 'Escape') { onclose(); return; }
        if (e.key === 'Tab' && dialogEl) {
            const focusables = [...dialogEl.querySelectorAll<HTMLElement>(
                'button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
            )];
            if (focusables.length === 0) return;
            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            if (e.shiftKey) {
                if (document.activeElement === first) { e.preventDefault(); last.focus(); }
            } else {
                if (document.activeElement === last) { e.preventDefault(); first.focus(); }
            }
        }
    }

    // ─── Step A: Create auto-ID ───────────────────────────────────────────────
    function createAutoId() {
        appState.update(s => {
            if (!s.prepState) return s;
            const idVar: VariableMeta = {
                key: '_id',
                type: 'numerical',
                isId: true,
                isDimension: false,
                removed: false,
            };
            // Add _id column to customData or uploadedData rows
            const base = s.uploadedData ?? s.prepState.customData ?? [];
            const withId = base.map((row, i) => ({ _id: i, ...row }));
            return {
                ...s,
                prepState: {
                    ...s.prepState,
                    variables: [idVar, ...s.prepState.variables],
                    customData: s.uploadedData ? s.prepState.customData : withId,
                },
                ...(s.uploadedData ? { uploadedData: withId } : {}),
            };
        });
        logAction('Prep: auto-created _id column');
        step = 'name';
    }

    // ─── Step B: Validate name ────────────────────────────────────────────────
    function validateAndAdvance() {
        const name = varName.trim();
        if (!name) { varNameError = 'Please enter a name for your new variable.'; return; }
        const taken = activeVars.some(v => v.key === name);
        if (taken) { varNameError = `A variable named "${name}" already exists. Choose a different name.`; return; }
        varNameError = '';
        step = 'formula';
    }

    // ─── Step C: Token building ───────────────────────────────────────────────
    function addToken(token: FormulaToken) {
        tokens = [...tokens, token];
    }

    function removeToken(index: number) {
        tokens = tokens.filter((_, i) => i !== index);
    }

    function addOp(op: string) {
        addToken({ kind: 'op', value: op });
    }

    function addFieldRow(fieldName: string) {
        addToken({ kind: 'field_row', value: fieldName });
    }

    function addFieldSum(fieldName: string) {
        addToken({ kind: 'field_sum', value: fieldName });
    }

    function addFieldMean(fieldName: string) {
        addToken({ kind: 'field_mean', value: fieldName });
    }

    function addCountAll() {
        addToken({ kind: 'count_all', value: 'count_all' });
    }

    function addLiteralNum() {
        const n = String(literalNum).trim();
        if (!n || isNaN(Number(n))) return;
        addToken({ kind: 'literal_num', value: n });
        literalNum = '';
    }

    function addIfCond() {
        if (!ifField || !ifThreshold) return;
        // Encode as a single if_cond token: value encodes "field op threshold"
        // then/else are follow-up tokens. We encode the whole condition as a
        // structured string so the evaluator can parse it.
        const condStr = `${ifField} ${ifOp} ${ifThreshold} ? ${ifThenField || '0'} : ${ifElseField || '0'}`;
        addToken({ kind: 'if_cond', value: condStr });
        ifField = '';
        ifOp = '>';
        ifThreshold = '';
        ifThenField = '';
        ifElseField = '';
    }

    // ─── Token label helper ───────────────────────────────────────────────────
    function tokenLabel(t: FormulaToken): string {
        switch (t.kind) {
            case 'field_row':   return `[${t.value}]`;
            case 'field_sum':   return `sum(${t.value})`;
            case 'field_mean':  return `mean(${t.value})`;
            case 'count_all':   return `count(all rows)`;
            case 'literal_num': return t.value;
            case 'op':          return t.value;
            case 'if_cond':     return `if(${t.value})`;
            default:            return t.value;
        }
    }

    // ─── Live preview evaluator (first 5 rows) ────────────────────────────────
    function evaluateTokens(row: Record<string, unknown>, allRows: Record<string, unknown>[]): unknown {
        if (tokens.length === 0) return '';

        // Build a simple left-to-right reducer
        // Supports: field_row, field_sum, field_mean, count_all, count_cat,
        //           literal_num, literal_str, op (applied between adjacent values),
        //           if_cond (evaluated inline)
        const values: unknown[] = [];
        const ops: string[] = [];

        for (const token of tokens) {
            switch (token.kind) {
                case 'field_row':
                    values.push(row[token.value] ?? '');
                    break;
                case 'field_sum': {
                    const sum = allRows.reduce((acc, r) => acc + (Number(r[token.value]) || 0), 0);
                    values.push(sum);
                    break;
                }
                case 'field_mean': {
                    const total = allRows.reduce((acc, r) => acc + (Number(r[token.value]) || 0), 0);
                    values.push(allRows.length > 0 ? total / allRows.length : 0);
                    break;
                }
                case 'count_all':
                    values.push(allRows.length);
                    break;
                case 'literal_num':
                    values.push(Number(token.value));
                    break;
                case 'op':
                    ops.push(token.value);
                    break;
                case 'if_cond': {
                    // Parse: "field op threshold ? thenVal : elseVal"
                    const match = token.value.match(/^(.+?)\s*(>|<|>=|<=|===|!=)\s*(.+?)\s*\?\s*(.+?)\s*:\s*(.+)$/);
                    if (match) {
                        const [, field, op2, thresh, thenV, elseV] = match;
                        const fieldVal = Number(row[field.trim()] ?? 0);
                        const threshVal = Number(thresh.trim());
                        let condition = false;
                        if (op2 === '>')  condition = fieldVal > threshVal;
                        if (op2 === '<')  condition = fieldVal < threshVal;
                        if (op2 === '>=') condition = fieldVal >= threshVal;
                        if (op2 === '<=') condition = fieldVal <= threshVal;
                        if (op2 === '===') condition = fieldVal === threshVal;
                        if (op2 === '!=') condition = fieldVal !== threshVal;
                        const result = condition
                            ? (isNaN(Number(thenV)) ? thenV.trim() : Number(thenV.trim()))
                            : (isNaN(Number(elseV)) ? elseV.trim() : Number(elseV.trim()));
                        values.push(result);
                    } else {
                        values.push(0);
                    }
                    break;
                }
            }
        }

        // Apply ops left-to-right (interleaved between values)
        if (values.length === 0) return '';
        let result = values[0];
        for (let i = 0; i < ops.length && i + 1 < values.length; i++) {
            const a = Number(result);
            const b = Number(values[i + 1]);
            switch (ops[i]) {
                case '+': result = a + b; break;
                case '-': result = a - b; break;
                case '*': result = a * b; break;
                case '/': result = b !== 0 ? a / b : 'Division by zero'; break;
                default:  result = `${result} ${ops[i]} ${values[i + 1]}`;
            }
        }
        return result;
    }

    const livePreview = $derived(
        workingData.slice(0, 5).map(row => {
            try {
                const val = evaluateTokens(row, workingData);
                return typeof val === 'number' ? val.toFixed(4).replace(/\.?0+$/, '') : String(val);
            } catch {
                return '(error)';
            }
        })
    );

    // ─── Finish: save computed variable ──────────────────────────────────────
    function addVariable() {
        const name = varName.trim();
        if (!name) return;

        const newVar: VariableMeta = {
            key: name,
            type: 'numerical', // computed variables are numerical by default
            isId: false,
            isDimension: false,
            removed: false,
        };

        const computedVar: ComputedVariable = {
            key: name,
            tokens: [...tokens],
        };

        appState.update(s => {
            if (!s.prepState) return s;

            // Synthesize computed column values into working dataset
            const base = s.uploadedData ?? s.prepState.customData ?? [];
            const withCol = base.map(row => ({
                ...row,
                [name]: (() => {
                    try { return evaluateTokens(row, base); } catch { return null; }
                })(),
            }));

            return {
                ...s,
                prepState: {
                    ...s.prepState,
                    variables: [...s.prepState.variables, newVar],
                    customVariables: [...s.prepState.customVariables, computedVar],
                    customData: s.uploadedData ? s.prepState.customData : withCol,
                },
                ...(s.uploadedData ? { uploadedData: withCol } : {}),
            };
        });
        logAction(`Prep: added computed variable — ${name}`);

        onclose();
    }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="modal-backdrop" role="presentation" onclick={onclose}>
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div
        class="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cvm-title"
        tabindex="-1"
        bind:this={dialogEl}
        onkeydown={onKeydown}
        onclick={(e) => e.stopPropagation()}
    >
        <div class="modal-header">
            <h2 id="cvm-title" class="modal-title">Add a variable</h2>
            <button class="btn-close" onclick={onclose} aria-label="Close dialog">&times;</button>
        </div>

        <div class="modal-body">

            {#if step === 'id-check'}
                <!-- ── Step A: ID check ── -->
                <div class="step-section">
                    <p class="step-question">
                        Before creating a computed variable, your dataset needs a unique identifier for each row.
                    </p>
                    <p class="step-hint">
                        A unique ID lets the tool keep track of each individual data point accurately.
                    </p>
                    <div class="id-choice-btns">
                        <button
                            class="btn-choice"
                            class:btn-choice-selected={idChoice === 'auto'}
                            onclick={() => { idChoice = 'auto'; }}
                            aria-pressed={idChoice === 'auto'}
                        >
                            <span class="choice-label">Yes, create one automatically</span>
                            <span class="choice-desc">Adds a column called "_id" with numbers 0, 1, 2… for each row.</span>
                        </button>
                        <button
                            class="btn-choice"
                            class:btn-choice-selected={idChoice === 'manual'}
                            onclick={() => { idChoice = 'manual'; }}
                            aria-pressed={idChoice === 'manual'}
                        >
                            <span class="choice-label">No, I'll handle it myself</span>
                            <span class="choice-desc">Close this dialog and add an ID column manually.</span>
                        </button>
                    </div>
                </div>

                <div class="modal-footer-inline">
                    <button class="btn-secondary" onclick={onclose}>Cancel</button>
                    <button
                        class="btn-primary"
                        disabled={idChoice === null}
                        onclick={() => {
                            if (idChoice === 'auto') createAutoId();
                            else onclose();
                        }}
                    >
                        Continue
                    </button>
                </div>

            {:else if step === 'name'}
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
                    <button class="btn-secondary" onclick={onclose}>Cancel</button>
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
                                        onclick={() => removeToken(i)}
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
                                {#each activeVars as v}
                                    <button
                                        class="chip chip-field"
                                        onclick={() => addFieldRow(v.key)}
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
                                    {#each numVars as v}
                                        <button
                                            class="chip chip-agg"
                                            onclick={() => addFieldSum(v.key)}
                                            aria-label="Add sum of {v.key}"
                                        >
                                            sum({v.key})
                                        </button>
                                        <button
                                            class="chip chip-agg"
                                            onclick={() => addFieldMean(v.key)}
                                            aria-label="Add mean of {v.key}"
                                        >
                                            mean({v.key})
                                        </button>
                                    {/each}
                                    <button
                                        class="chip chip-agg"
                                        onclick={addCountAll}
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
                                        onclick={() => addOp(op)}
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
                                    {#each numVars as v}
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

                                <label class="picker-label" for="if-then">then result</label>
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
    </div>
</div>

<style>
    /* ── Backdrop ── */
    .modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    }

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
