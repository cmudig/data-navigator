<script lang="ts">
    import { onDestroy } from 'svelte';
    import { appState, type PrepState } from '../../../store/appState';

    // ─── Store mirrors ────────────────────────────────────────────────────────
    let data = $state<Record<string, unknown>[] | null>(null);
    let prep = $state<PrepState | null>(null);

    const unsub = appState.subscribe(s => {
        data = s.uploadedData;
        prep = s.prepState;
    });
    onDestroy(unsub);

    // ─── Derived ──────────────────────────────────────────────────────────────
    // Active (non-removed) column keys, falling back to raw data keys if prep not initialized
    const activeKeys = $derived(
        prep?.variables.filter(v => !v.removed).map(v => v.key)
        ?? (data ? Object.keys(data[0] ?? {}) : [])
    );

    // First 10 rows from uploaded data
    const previewRows = $derived(data?.slice(0, 10) ?? []);

    // ─── Draft rows (manually added by user) ─────────────────────────────────
    let draftRows = $state<Record<string, string>[]>([]);

    function addDraftRow() {
        const blank: Record<string, string> = {};
        for (const key of activeKeys) blank[key] = '';
        draftRows = [...draftRows, blank];
    }

    function updateDraftCell(rowIndex: number, key: string, value: string) {
        draftRows = draftRows.map((r, i) =>
            i === rowIndex ? { ...r, [key]: value } : r
        );
    }

    // Stubs for future tasks
    function openCreateDataWizard() {
        // TODO Task 6: open CreateDataWizard
    }

    function openComputedVariableModal() {
        // TODO Task 7: open ComputedVariableModal
    }
</script>

<div class="data-table-preview">
    <h3 class="panel-heading">Data table preview</h3>

    {#if data !== null}
        <div class="table-scroll" role="region" aria-label="Data table preview, first {previewRows.length} rows">
            <table class="data-table">
                <thead>
                    <tr>
                        {#each activeKeys as key}
                            {@const varMeta = prep?.variables.find(v => v.key === key)}
                            <th scope="col">
                                {#if varMeta}
                                    <span
                                        class="col-badge col-badge-{varMeta.type === 'numerical' ? 'num' : 'cat'}"
                                        aria-label="{varMeta.type === 'numerical' ? 'Numerical' : 'Categorical'}"
                                    >
                                        {varMeta.type === 'numerical' ? 'NUM' : 'CAT'}
                                    </span>
                                {/if}
                                <span class="col-name">{key}</span>
                            </th>
                        {/each}
                        <th scope="col" class="col-add">
                            <button
                                class="btn-add-col"
                                onclick={openComputedVariableModal}
                                aria-label="Add a computed variable column"
                                title="Add a computed variable"
                            >+</button>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {#each previewRows as row, ri}
                        <tr>
                            {#each activeKeys as key}
                                <td>{String(row[key] ?? '')}</td>
                            {/each}
                            <td></td>
                        </tr>
                    {/each}

                    {#each draftRows as row, di}
                        <tr class="draft-row">
                            {#each activeKeys as key, ki}
                                <td>
                                    <input
                                        type="text"
                                        class="draft-cell"
                                        value={row[key]}
                                        aria-label="{key}, row {previewRows.length + di + 1}"
                                        oninput={(e) => updateDraftCell(di, key, (e.target as HTMLInputElement).value)}
                                    />
                                </td>
                            {/each}
                            <td></td>
                        </tr>
                    {/each}

                    <!-- Add row button -->
                    <tr class="add-row-row">
                        <td colspan={activeKeys.length + 1}>
                            <button
                                class="btn-add-row"
                                onclick={addDraftRow}
                                aria-label="Add a new data row"
                            >
                                + row
                            </button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    {:else}
        <div class="no-data-state">
            <button class="btn-create-data btn-primary" onclick={openCreateDataWizard}>
                + Create data
            </button>
            <p class="no-data-hint">
                Or upload a CSV / JSON file in Step 0.
            </p>
        </div>
    {/if}
</div>

<style>
    .data-table-preview {
        display: flex;
        flex-direction: column;
        gap: calc(var(--dn-space) * 1.5);
        padding: calc(var(--dn-space) * 2);
        height: 100%;
        overflow: hidden;
    }

    .panel-heading {
        margin: 0;
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--dn-text);
        text-transform: uppercase;
        letter-spacing: 0.04em;
        flex-shrink: 0;
    }

    /* ── Table scroll container ── */

    .table-scroll {
        flex: 1;
        overflow: auto;
        min-height: 0;
        border: 1px solid var(--dn-border);
        border-radius: var(--dn-radius);
    }

    /* ── Data table ── */

    .data-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.8125rem;
        font-family: var(--dn-font-mono);
        table-layout: auto;
    }

    .data-table th,
    .data-table td {
        padding: calc(var(--dn-space) * 0.5) calc(var(--dn-space) * 1);
        border-bottom: 1px solid var(--dn-border);
        text-align: left;
        white-space: nowrap;
        vertical-align: middle;
    }

    .data-table th {
        position: sticky;
        top: 0;
        background: var(--dn-surface);
        z-index: 1;
        font-weight: 600;
        color: var(--dn-text);
        border-bottom: 2px solid var(--dn-border);
    }

    .data-table td {
        color: var(--dn-text);
    }

    .data-table tbody tr:hover {
        background: var(--dn-accent-soft);
    }

    /* ── Column header badge ── */

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

    .col-badge-num {
        background: #dbeafe;
        color: #1e40af;
    }

    .dark .col-badge-num {
        background: rgba(30, 64, 175, 0.25);
        color: #93c5fd;
    }

    .col-badge-cat {
        background: #fce7f3;
        color: #9d174d;
    }

    .dark .col-badge-cat {
        background: rgba(157, 23, 77, 0.25);
        color: #f9a8d4;
    }

    .col-name {
        vertical-align: middle;
    }

    /* ── Add column button ── */

    .col-add {
        width: 44px;
        text-align: center;
    }

    .btn-add-col {
        background: none;
        border: 1px dashed var(--dn-border);
        border-radius: 4px;
        width: 28px;
        height: 28px;
        min-height: 0;
        min-width: 0;
        padding: 0;
        font-size: 1rem;
        line-height: 1;
        color: var(--dn-text-muted);
        cursor: pointer;
        font-family: var(--dn-font);
    }

    .btn-add-col:hover {
        border-color: var(--dn-accent);
        color: var(--dn-accent);
    }

    /* ── Draft rows ── */

    .draft-row {
        background: var(--dn-accent-soft);
    }

    .draft-cell {
        width: 100%;
        min-width: 80px;
        background: var(--dn-bg);
        border: 1px solid var(--dn-border);
        border-radius: 3px;
        padding: 2px 4px;
        font-size: 0.8125rem;
        font-family: var(--dn-font-mono);
        color: var(--dn-text);
        min-height: 0;
    }

    /* ── Add row ── */

    .add-row-row td {
        border-bottom: none;
        padding: calc(var(--dn-space) * 0.5) calc(var(--dn-space) * 1);
    }

    .btn-add-row {
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

    /* ── No data state ── */

    .no-data-state {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: calc(var(--dn-space) * 2);
    }

    .no-data-hint {
        margin: 0;
        font-size: 0.8125rem;
        color: var(--dn-text-muted);
        text-align: center;
    }
</style>
