<script lang="ts">
    import { app } from '../../model/state.svelte';
    import { joinRow, spatialOrder } from '../../model/edits';
    import Modal from './Modal.svelte';

    let dialog = $state<HTMLDialogElement>();
    const { row, ids, plain } = app.ui.join!;
    const name = (id: string) => app.graph.nodes.get(id)?.name ?? id;
    const names = (list: string[]) => (list.length > 3 ? `${list.slice(0, 2).map(name).join(', ')} and ${list.length - 2} more` : list.map(name).join(list.length > 2 ? ', ' : ' and '));
    const rest = row.ids.filter(k => !ids.includes(k));
    const what = names(ids);
    const slots = rest.map((k, i) => (i ? `After ${name(rest[i - 1])}` : `First, before ${name(k)}`)).concat(`Last, after ${name(rest.at(-1)!)}`);
    let at = $state(String(spatialOrder([...rest, ids[0]]).indexOf(ids[0])));
    const parent = row.parent ? name(row.parent) : '';
    const level = rest.map(k => app.tree.level[k]).find(l => l !== undefined);

    const close = () => dialog?.close();
</script>

<Modal title="Add {what} to the row with {names(rest)}?" onclose={() => (app.ui.join = null)} bind:dialog>
    <p class="modal-desc">
        {names(rest)} {rest.length > 1 ? 'already step to each other' : 'already has a row'} with {row.pair.join(' and ')}{parent ? `, under ${parent}` : ''}. A separate
        edge would leave {ids.length > 1 ? 'the new nodes' : what} unreachable, so the row is relinked to include {ids.length > 1 ? 'them' : 'it'}{row.wrap && rest.length > 1 ? ', still wrapping from last to first' : ''}.
    </p>
    <label class="where">
        Where in the row?
        <select bind:value={at}>
            {#each slots as label, i (i)}<option value={String(i)}>{label}</option>{/each}
        </select>
    </label>
    {#if parent || level !== undefined}
        <p class="modal-desc">
            {#if parent}{ids.length > 1 ? 'They also get' : 'It also gets'} a drill-out edge up to {parent}{at === '0' ? `, and drilling in from ${parent} lands on ${name(ids[0])}` : ''}.{/if}
            {#if level !== undefined}{ids.length > 1 ? 'They join' : 'It joins'} level {level}.{/if}
        </p>
    {/if}
    {#snippet actions()}
        <button class="btn-ghost" type="button" onclick={() => (plain(), close())}>Just add the {ids.length > 1 ? 'edges' : 'edge'}</button>
        <button class="btn-primary" type="button" onclick={() => (joinRow(row, ids, +at), close())}>Add to row</button>
    {/snippet}
</Modal>

<style>
    .where {
        display: flex;
        align-items: center;
        gap: var(--dn-space);
        font-size: 0.875rem;
    }
</style>
