<script lang="ts">
    import { app, edit } from '../../model/state.svelte';
    import Modal from './Modal.svelte';

    const { onclose, onconfirm }: { onclose: () => void; onconfirm: () => void } = $props();

    let dialog = $state<HTMLDialogElement>();
    let chosen = $state<string | null>(null);
    let query = $state('');
    const candidates = $derived([...app.graph.nodes.values()].filter(n => n.kind !== 'leaf'));
    const list = $derived(candidates.filter(n => n.name.toLowerCase().includes(query.toLowerCase())).slice(0, 200));

    function confirm() {
        if (!chosen) return;
        const id = chosen;
        edit('Set entry node', d => (d.entry = id));
        onconfirm();
    }
</script>

<Modal title="Set an entry node before continuing" {onclose} bind:dialog>
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
                {node.name}
            </label>
        {:else}
            <p class="empty-msg">No nodes yet. Add dimensions or draw nodes in the Editor first.</p>
        {/each}
    </div>
    {#snippet actions()}
        <button class="btn-ghost" type="button" onclick={() => dialog?.close()}>Cancel</button>
        <button class="btn-primary" type="button" disabled={!chosen} onclick={confirm}>Set entry node</button>
    {/snippet}
</Modal>

<style>
    .search {
        width: 100%;
    }

    .node-list {
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: calc(var(--dn-space) * 0.5);
        border: 1px solid var(--dn-border);
        border-radius: var(--dn-radius);
        padding: calc(var(--dn-space) * 1);
        max-height: 240px;
    }

    .empty-msg {
        margin: 0;
        padding: calc(var(--dn-space) * 1);
        font-size: 0.875rem;
        color: var(--dn-text-muted);
        font-style: italic;
    }
</style>
