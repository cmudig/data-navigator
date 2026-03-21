<script lang="ts">
    import { appState, type VariableMeta, type PrepState, type QAChapterId } from '../../../store/appState';

    type Props = { onclose: () => void };
    const { onclose }: Props = $props();

    // ─── Local column definition for Stage 1 ─────────────────────────────────
    interface ColDef {
        name: string;
        type: 'numerical' | 'categorical';
    }

    let stage = $state<1 | 2>(1);
    let columns = $state<ColDef[]>([{ name: '', type: 'categorical' }]);

    // Stage 2 draft rows
    let draftRows = $state<Record<string, string>[]>([]);

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

    // ─── Stage 1 helpers ─────────────────────────────────────────────────────
    const namedColumns = $derived(columns.filter(c => c.name.trim() !== ''));
    const canAdvance = $derived(namedColumns.length > 0);

    function addColumn() {
        columns = [...columns, { name: '', type: 'categorical' }];
    }

    function removeColumn(index: number) {
        columns = columns.filter((_, i) => i !== index);
    }

    function updateColumnName(index: number, value: string) {
        columns = columns.map((c, i) => i === index ? { ...c, name: value } : c);
    }

    function toggleColumnType(index: number) {
        columns = columns.map((c, i) =>
            i === index ? { ...c, type: c.type === 'numerical' ? 'categorical' : 'numerical' } : c
        );
    }

    function goToStage2() {
        if (!canAdvance) return;
        // Initialize blank draft row
        const blank: Record<string, string> = {};
        for (const col of namedColumns) blank[col.name] = '';
        draftRows = [blank];
        stage = 2;
    }

    // ─── Stage 2 helpers ─────────────────────────────────────────────────────
    function addRow() {
        const blank: Record<string, string> = {};
        for (const col of namedColumns) blank[col.name] = '';
        draftRows = [...draftRows, blank];
    }

    function updateCell(rowIndex: number, col: string, value: string) {
        draftRows = draftRows.map((r, i) => i === rowIndex ? { ...r, [col]: value } : r);
    }

    // ─── Finish: write to store ───────────────────────────────────────────────
    function finish() {
        const vars: VariableMeta[] = namedColumns.map((col, i) => ({
            key: col.name,
            type: col.type,
            isId: i === 0, // first column is treated as ID by default
            isDimension: false,
            removed: false,
        }));

        // Convert draft rows to Record<string, unknown>[]
        const customData: Record<string, unknown>[] = draftRows.map(row => {
            const out: Record<string, unknown> = {};
            for (const col of namedColumns) {
                const raw = row[col.name] ?? '';
                out[col.name] = col.type === 'numerical' && raw !== '' ? Number(raw) : raw;
            }
            return out;
        });

        appState.update(s => {
            const existing = s.prepState;
            const initial: PrepState = existing ?? {
                hasRun: false,
                variables: [],
                customVariables: [],
                customData: null,
                qaProgress: {
                    currentChapterId: 'top-level-access' as QAChapterId,
                    currentQuestionId: '',
                    chapters: [
                        { id: 'top-level-access', completed: false, answers: {}, invalidated: false },
                        { id: 'dimensions',        completed: false, answers: {}, invalidated: false },
                        { id: 'navigation',        completed: false, answers: {}, invalidated: false },
                        { id: 'leaf-node-patterns', completed: false, answers: {}, invalidated: false },
                    ],
                    invalidatedQuestions: [],
                },
                labelConfig: {
                    level0: { template: '', name: 'root', includeIndex: false, includeParentName: false },
                    perDimension: {},
                    perDivision: {},
                    leaves: { template: '', name: 'data point', includeIndex: false, includeParentName: false },
                },
            };
            return {
                ...s,
                prepState: {
                    ...initial,
                    variables: vars,
                    customData: customData.length > 0 ? customData : null,
                },
            };
        });

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
        aria-labelledby="cdw-title"
        tabindex="-1"
        bind:this={dialogEl}
        onkeydown={onKeydown}
        onclick={(e) => e.stopPropagation()}
    >
        <div class="modal-header">
            <h2 id="cdw-title" class="modal-title">
                {stage === 1 ? 'Set up your data table' : 'Add rows to your data'}
            </h2>
            <button class="btn-close" onclick={onclose} aria-label="Close dialog">&times;</button>
        </div>

        {#if stage === 1}
            <!-- ── Stage 1: Define columns ── -->
            <div class="modal-body">
                <p class="stage-hint">
                    Let's set up your data table. First, what columns (variables) will your data have?
                </p>

                <div class="col-list" role="list" aria-label="Column definitions">
                    {#each columns as col, i (i)}
                        <div class="col-row" role="listitem">
                            <label class="visually-hidden" for="col-name-{i}">Column {i + 1} name</label>
                            <input
                                id="col-name-{i}"
                                type="text"
                                class="col-name-input"
                                placeholder="Column name"
                                value={col.name}
                                oninput={(e) => updateColumnName(i, (e.target as HTMLInputElement).value)}
                            />

                            <button
                                class="type-toggle"
                                class:type-toggle-num={col.type === 'numerical'}
                                class:type-toggle-cat={col.type === 'categorical'}
                                onclick={() => toggleColumnType(i)}
                                aria-label="Type: {col.type === 'numerical' ? 'Numerical' : 'Categorical'} — click to toggle"
                                title="Toggle between numerical and categorical"
                            >
                                {col.type === 'numerical' ? 'NUM' : 'CAT'}
                            </button>

                            <button
                                class="btn-remove-col"
                                onclick={() => removeColumn(i)}
                                aria-label="Remove column {col.name || i + 1}"
                                disabled={columns.length === 1}
                            >
                                &#x2715;
                            </button>
                        </div>
                    {/each}
                </div>

                <button class="btn-add-col" onclick={addColumn}>
                    + Add a column
                </button>
            </div>

            <div class="modal-footer">
                <button class="btn-secondary" onclick={onclose}>Cancel</button>
                <button
                    class="btn-primary"
                    onclick={goToStage2}
                    disabled={!canAdvance}
                    aria-disabled={!canAdvance}
                >
                    Next: add rows
                </button>
            </div>

        {:else}
            <!-- ── Stage 2: Add rows ── -->
            <div class="modal-body modal-body-table">
                <p class="stage-hint">
                    Now add some rows to your data table. You can also add more rows later.
                </p>

                <div class="table-scroll" role="region" aria-label="Data entry table">
                    <table class="entry-table">
                        <thead>
                            <tr>
                                {#each namedColumns as col}
                                    <th scope="col">
                                        <span
                                            class="col-badge col-badge-{col.type === 'numerical' ? 'num' : 'cat'}"
                                            aria-label="{col.type === 'numerical' ? 'Numerical' : 'Categorical'}"
                                        >
                                            {col.type === 'numerical' ? 'NUM' : 'CAT'}
                                        </span>
                                        {col.name}
                                    </th>
                                {/each}
                            </tr>
                        </thead>
                        <tbody>
                            {#each draftRows as row, ri}
                                <tr>
                                    {#each namedColumns as col}
                                        <td>
                                            <input
                                                type={col.type === 'numerical' ? 'number' : 'text'}
                                                class="entry-cell"
                                                value={row[col.name]}
                                                aria-label="{col.name}, row {ri + 1}"
                                                oninput={(e) => updateCell(ri, col.name, (e.target as HTMLInputElement).value)}
                                            />
                                        </td>
                                    {/each}
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>

                <button class="btn-add-row" onclick={addRow}>
                    + Add a row
                </button>
            </div>

            <div class="modal-footer">
                <button class="btn-secondary" onclick={() => { stage = 1; }}>Back</button>
                <button class="btn-primary" onclick={finish}>
                    Done — use this data
                </button>
            </div>
        {/if}
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
        width: min(560px, 90vw);
        max-height: 80vh;
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
        gap: calc(var(--dn-space) * 1.5);
    }

    .modal-body-table {
        overflow: hidden;
    }

    .stage-hint {
        margin: 0;
        font-size: 0.875rem;
        color: var(--dn-text);
        line-height: 1.5;
    }

    /* ── Column list (Stage 1) ── */
    .col-list {
        display: flex;
        flex-direction: column;
        gap: calc(var(--dn-space) * 0.75);
    }

    .col-row {
        display: flex;
        align-items: center;
        gap: calc(var(--dn-space) * 0.75);
    }

    .col-name-input {
        flex: 1;
        padding: calc(var(--dn-space) * 0.5) calc(var(--dn-space) * 1);
        border: 1px solid var(--dn-border);
        border-radius: var(--dn-radius);
        background: var(--dn-bg);
        color: var(--dn-text);
        font-size: 0.875rem;
        font-family: var(--dn-font);
        min-height: 0;
    }

    .col-name-input:focus {
        outline: 2px solid var(--dn-accent);
        outline-offset: 1px;
    }

    .type-toggle {
        padding: 3px 8px;
        border-radius: 4px;
        font-size: 0.6875rem;
        font-weight: 700;
        font-family: var(--dn-font-mono);
        letter-spacing: 0.05em;
        border: 2px solid transparent;
        cursor: pointer;
        flex-shrink: 0;
        min-height: 0;
        min-width: 44px;
    }

    .type-toggle-num {
        background: #dbeafe;
        color: #1e40af;
        border-color: #93c5fd;
    }

    .type-toggle-cat {
        background: #fce7f3;
        color: #9d174d;
        border-color: #f9a8d4;
    }

    .btn-remove-col {
        background: none;
        border: none;
        color: var(--dn-text-muted);
        cursor: pointer;
        font-size: 0.875rem;
        padding: 4px 8px;
        border-radius: 4px;
        min-height: 0;
        min-width: 0;
        flex-shrink: 0;
    }

    .btn-remove-col:hover:not(:disabled) {
        color: var(--dn-text);
        background: var(--dn-surface);
    }

    .btn-remove-col:disabled {
        opacity: 0.3;
        cursor: not-allowed;
    }

    .btn-add-col {
        align-self: flex-start;
        background: none;
        border: 1px dashed var(--dn-border);
        padding: calc(var(--dn-space) * 0.5) calc(var(--dn-space) * 1.5);
        font-size: 0.8125rem;
        font-family: var(--dn-font);
        color: var(--dn-text-muted);
        cursor: pointer;
        border-radius: var(--dn-radius);
        min-height: 0;
        transition: border-color 0.15s, color 0.15s;
    }

    .btn-add-col:hover {
        border-color: var(--dn-accent);
        color: var(--dn-accent);
    }

    /* ── Table (Stage 2) ── */
    .table-scroll {
        flex: 1;
        overflow: auto;
        border: 1px solid var(--dn-border);
        border-radius: var(--dn-radius);
        min-height: 0;
    }

    .entry-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.8125rem;
        font-family: var(--dn-font-mono);
    }

    .entry-table th,
    .entry-table td {
        padding: calc(var(--dn-space) * 0.5) calc(var(--dn-space) * 1);
        border-bottom: 1px solid var(--dn-border);
        text-align: left;
        white-space: nowrap;
    }

    .entry-table th {
        position: sticky;
        top: 0;
        background: var(--dn-surface);
        font-weight: 600;
        color: var(--dn-text);
        border-bottom: 2px solid var(--dn-border);
    }

    .col-badge {
        display: inline-block;
        padding: 1px 4px;
        border-radius: 3px;
        font-size: 0.6rem;
        font-weight: 700;
        letter-spacing: 0.05em;
        margin-right: calc(var(--dn-space) * 0.5);
        vertical-align: middle;
    }

    .col-badge-num { background: #dbeafe; color: #1e40af; }
    .col-badge-cat { background: #fce7f3; color: #9d174d; }

    .entry-cell {
        width: 100%;
        min-width: 80px;
        background: var(--dn-bg);
        border: 1px solid var(--dn-border);
        border-radius: 3px;
        padding: 2px 6px;
        font-size: 0.8125rem;
        font-family: var(--dn-font-mono);
        color: var(--dn-text);
        min-height: 0;
    }

    .entry-cell:focus {
        outline: 2px solid var(--dn-accent);
        outline-offset: 1px;
    }

    .btn-add-row {
        align-self: flex-start;
        background: none;
        border: none;
        padding: 0;
        font-size: 0.8125rem;
        font-family: var(--dn-font);
        color: var(--dn-accent);
        cursor: pointer;
        text-decoration: underline;
        text-underline-offset: 2px;
        min-height: 0;
        min-width: 0;
        border-radius: 0;
    }

    .btn-add-row:hover {
        color: var(--dn-accent-hover);
    }

    /* ── Footer ── */
    .modal-footer {
        display: flex;
        justify-content: flex-end;
        gap: calc(var(--dn-space) * 1);
        padding: calc(var(--dn-space) * 1.5) calc(var(--dn-space) * 2.5);
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

    /* ── Visually hidden ── */
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
</style>
