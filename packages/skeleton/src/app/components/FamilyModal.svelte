<script lang="ts">
    import { app } from '../../model/state.svelte';
    import { SIBLING_PRESETS } from '../../model/doc';
    import { connect, fan, groupKids, levelsInUse, makeFamily, spatialOrder } from '../../model/edits';
    import Modal from './Modal.svelte';

    let dialog = $state<HTMLDialogElement>();
    const f = app.ui.family!;
    const pair = f.kids.length === 1;
    const name = (id: string) => app.graph.nodes.get(id)?.name ?? id;
    const used = levelsInUse();
    const max = used.at(-1) ?? -1;
    const choices = [...(used.includes(0) ? [] : [0]), ...Array.from({ length: max + 1 }, (_, i) => i + 1)];

    let rel = $state<'kids' | 'flip' | 'none'>('kids');
    let siblings = $state(true);
    let loop = $state(true);
    let preset = $state('leftright');
    let level = $state(used.includes(0) ? 'none' : '0');
    const parent = $derived(rel === 'flip' ? f.kids[0] : f.parent);
    const kids = $derived(rel === 'flip' ? [f.parent] : f.kids);
    const fixed = $derived(app.tree.level[parent]);
    const had = $derived(groupKids(parent).filter(k => !kids.includes(k)));
    const label = (l: number) =>
        `${l === 0 ? `Make ${name(parent)} the root (level 0) and entry point` : used.includes(l) ? `Level ${l}` : l > max ? `New level ${l}` : `Empty level ${l}`}, ${pair ? 'child' : 'children'} at level ${l + 1}`;

    function submit() {
        if (rel === 'none') pair ? connect(f.kids[0], f.parent) : fan(f.parent, f.kids, false);
        else {
            const names = SIBLING_PRESETS.find(p => p.id === preset)!.names;
            makeFamily(parent, spatialOrder(kids), (!pair && siblings) || had.length ? [...names] : null, fixed ?? (level === 'none' ? null : +level), loop);
        }
        dialog?.close();
    }
</script>

<Modal title={pair ? 'Make these a parent and child?' : `Make ${name(f.parent)} the parent of ${f.kids.length} nodes?`} onclose={() => (app.ui.family = null)} bind:dialog>
    <fieldset>
        <legend>{pair ? 'Which one is the parent?' : 'Drill edges usually mean a parent and its children'}</legend>
        <label class="radio-row">
            <input type="radio" name="family-rel" value="kids" bind:group={rel} />
            {pair ? `${name(f.parent)} is the parent of ${name(f.kids[0])}` : `Yes, ${name(f.parent)} is their parent`}
        </label>
        {#if pair}
            <label class="radio-row"><input type="radio" name="family-rel" value="flip" bind:group={rel} /> {name(f.kids[0])} is the parent of {name(f.parent)}</label>
        {/if}
        <label class="radio-row"><input type="radio" name="family-rel" value="none" bind:group={rel} /> {pair ? 'Neither, just add the edge' : 'No, just add the edges'}</label>
    </fieldset>
    {#if rel !== 'none' && had.length}
        <p class="modal-desc">
            {name(parent)} already has {had.length === 1 ? 'a child' : `${had.length} children`}, so {pair || rel === 'flip' ? 'the new child joins' : 'the new children join'} the end of that row{had.length > 1
                ? ' using its keys'
                : ''}{app.tree.level[had[0]] !== undefined ? ` at level ${app.tree.level[had[0]]}` : ''}. Only the first child is reached by drilling in.
        </p>
        {#if had.length < 2}
            <label class="keys">
                Sibling keys
                <select bind:value={preset}>
                    {#each SIBLING_PRESETS as p (p.id)}<option value={p.id}>{p.label}</option>{/each}
                </select>
            </label>
        {/if}
    {:else if rel !== 'none'}
        {#if !pair}
            <fieldset>
                <legend>Siblings</legend>
                <label class="radio-row"><input type="checkbox" bind:checked={siblings} /> Also link the {f.kids.length} children as siblings, in on-screen order</label>
                {#if siblings}
                    <label class="keys">
                        Keys
                        <select bind:value={preset}>
                            {#each SIBLING_PRESETS as p (p.id)}<option value={p.id}>{p.label}</option>{/each}
                        </select>
                    </label>
                    <label class="keys"><input type="checkbox" bind:checked={loop} /> Wrap from last to first</label>
                {/if}
            </fieldset>
        {/if}
        <fieldset>
            <legend>Level</legend>
            {#if fixed !== undefined}
                <p class="modal-desc">{name(parent)} is at level {fixed}, so the {pair ? 'child joins' : 'children join'} level {fixed + 1}.</p>
            {:else}
                {#each choices as l (l)}
                    <label class="radio-row"><input type="radio" name="family-level" value={String(l)} bind:group={level} /> {label(l)}</label>
                {/each}
                <label class="radio-row"><input type="radio" name="family-level" value="none" bind:group={level} /> No level for now</label>
            {/if}
        </fieldset>
    {/if}
    {#snippet actions()}
        <button class="btn-ghost" type="button" onclick={() => dialog?.close()}>Cancel</button>
        <button class="btn-primary" type="button" onclick={submit}>{rel === 'none' ? 'Add edges' : 'Create'}</button>
    {/snippet}
</Modal>

<style>
    .keys {
        display: flex;
        align-items: center;
        gap: var(--dn-space);
        padding-left: calc(var(--dn-space) * 3.5);
        font-size: 0.875rem;
    }
</style>
