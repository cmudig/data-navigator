<script lang="ts">
    import { app, edit } from '../../model/state.svelte';

    const { onclose, onconfirm }: { onclose: () => void; onconfirm: () => void } = $props();

    let dialog: HTMLDialogElement;
    let chosen = $state<string | null>(null);
    let query = $state('');
    const candidates = $derived([...app.graph.nodes.values()].filter(n => n.kind !== 'leaf'));
    const list = $derived(candidates.filter(n => n.name.toLowerCase().includes(query.toLowerCase())).slice(0, 200));

    $effect(() => dialog.showModal());

    function confirm() {
        if (!chosen) return;
        const id = chosen;
        edit('Set entry node', d => (d.entry = id));
        onconfirm();
    }
</script>

<dialog class="modal" bind:this={dialog} aria-labelledby="entry-modal-title" onclose={onclose} onclick={e => e.target === dialog && dialog.close()}>
    <h2 id="entry-modal-title" class="modal-title">Set an entry node before continuing</h2>
    <p class="modal-desc">The entry node is where keyboard navigation begins. It is the first element a user reaches when they enter the chart.</p>
    {#if candidates.length > 8}
        <label>
            <span class="visually-hidden">Filter nodes</span>
            <input class="search" type="search" placeholder="Filter nodes" bind:value={query} />
        </label>
    {/if}
    <div class="node-list" role="radiogroup" aria-label="Select entry node">
        {#each list as node (node.id)}
            <label class="radio-row">
                <input type="radio" name="entry-node-modal" value={node.id} bind:group={chosen} />
                <span class="radio-label">{node.name}</span>
            </label>
        {:else}
            <p class="empty-msg">No nodes yet. Add dimensions or draw nodes in the Editor first.</p>
        {/each}
    </div>
    <div class="modal-actions">
        <button class="btn-ghost" type="button" onclick={() => dialog.close()}>Cancel</button>
        <button class="btn-primary" type="button" disabled={!chosen} onclick={confirm}>Set entry node</button>
    </div>
</dialog>

<style>
    .modal {
        background: var(--dn-bg);
        color: var(--dn-text);
        border: 1px solid var(--dn-border);
        border-radius: var(--dn-radius);
        padding: calc(var(--dn-space) * 3);
        width: min(480px, calc(100vw - var(--dn-space) * 4));
        max-height: 80dvh;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
    }

    .modal[open] {
        display: flex;
        flex-direction: column;
        gap: calc(var(--dn-space) * 2);
    }

    .modal::backdrop {
        background: rgba(0, 0, 0, 0.45);
    }

    .search {
        width: 100%;
    }

    .modal-title {
        margin: 0;
        font-size: 1.125rem;
        font-weight: 600;
        color: var(--dn-text);
    }

    .modal-desc {
        margin: 0;
        font-size: 0.9375rem;
        color: var(--dn-text-muted);
        line-height: 1.6;
    }

    .node-list {
        overflow-y: auto;
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
        gap: calc(var(--dn-space) * 0.5);
        border: 1px solid var(--dn-border);
        border-radius: var(--dn-radius);
        padding: calc(var(--dn-space) * 1);
        max-height: 240px;
    }

    .radio-row {
        display: flex;
        align-items: center;
        gap: calc(var(--dn-space) * 1);
        padding: calc(var(--dn-space) * 0.75) calc(var(--dn-space) * 1);
        border-radius: calc(var(--dn-radius) * 0.5);
        cursor: pointer;
        transition: background 0.12s;
    }

    .radio-row:hover {
        background: var(--dn-accent-soft);
    }

    .radio-row input[type="radio"] {
        margin: 0;
        accent-color: var(--dn-accent);
        width: 16px;
        height: 16px;
        flex-shrink: 0;
    }

    .radio-label {
        font-size: 0.9375rem;
        color: var(--dn-text);
    }

    .empty-msg {
        margin: 0;
        padding: calc(var(--dn-space) * 1);
        font-size: 0.875rem;
        color: var(--dn-text-muted);
        font-style: italic;
    }

    .modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: calc(var(--dn-space) * 1);
    }

    .btn-primary:disabled {
        opacity: 0.45;
        cursor: not-allowed;
    }
</style>
