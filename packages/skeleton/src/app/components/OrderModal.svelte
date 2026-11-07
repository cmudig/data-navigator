<script lang="ts">
    import { tick } from 'svelte';
    import { app } from '../../model/state.svelte';
    import { SIBLING_PRESETS } from '../../model/doc';
    import { chain, clique, spatialOrder, structureOrder } from '../../model/edits';
    import Modal from './Modal.svelte';

    let dialog = $state<HTMLDialogElement>();
    let preset = $state('leftright');
    let wrap = $state(false);
    let listEl = $state<HTMLOListElement>();
    const o = app.ui.ordering!;
    const METHODS = [
        ['structure', 'Structure order', 'Higher groupings first, then the order nodes were added.'],
        ['spatial', 'Spatial order', 'Left to right when the selection is wide, bottom to top when it is tall.'],
        ['click', 'Click through', 'Click each node on the canvas in order.'],
        ['draw', 'Draw a line', 'Drag a line through every node on the canvas, in order.']
    ] as const;
    const name = (id: string) => app.graph.nodes.get(id)?.name ?? id;
    const ordered = $derived(app.ui.ordering?.order ?? []);
    const rest = $derived(o.ids.filter(id => !ordered.includes(id)));
    const full = $derived([...ordered, ...rest]);

    function method(m: (typeof METHODS)[number][0]) {
        const cur = app.ui.ordering!;
        cur.mode = m;
        cur.order = m === 'structure' ? structureOrder(o.ids) : m === 'spatial' ? spatialOrder(o.ids) : [];
    }

    async function shift(i: number, by: number) {
        const j = i + by;
        if (j < 0 || j >= full.length) return;
        const next = [...full];
        [next[i], next[j]] = [next[j], next[i]];
        app.ui.ordering!.order = next;
        await tick();
        listEl?.querySelectorAll<HTMLElement>('li')[j]?.focus();
    }

    const close = () => dialog?.close();
    function submit() {
        const names = SIBLING_PRESETS.find(p => p.id === preset)!.names;
        chain(full, [...names], wrap);
        close();
    }
    function connectAll() {
        clique(o.ids, app.ui.edgeRules.length > 1 ? app.ui.edgeRules : ['left', 'right']);
        close();
    }
</script>

<Modal title={o.ask ? 'Create a dimension?' : 'Order the new dimension'} modal={false} docked onclose={() => (app.ui.ordering = null)} bind:dialog>
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="body" onkeydown={e => e.key === 'Escape' && close()}>
        {#if o.ask}
            <p class="modal-desc">
                You drew an edge between two of the {o.ids.length} selected nodes. A dimension links them in a row users can step through. Otherwise every
                selected node gets an edge to every other one.
            </p>
        {:else}
            <fieldset>
                <legend>How should the order be set?</legend>
                {#each METHODS as [value, label, desc] (value)}
                    <label class="radio-row">
                        <input type="radio" name="order-method" {value} checked={app.ui.ordering?.mode === value} onchange={() => method(value)} />
                        <span><strong>{label}</strong><br /><span class="desc">{desc}</span></span>
                    </label>
                {/each}
            </fieldset>
            <ol class="order-list" bind:this={listEl} aria-label="Order. Focus an item and use the up and down arrow keys to move it.">
                {#each full as id, i (id)}
                    {@const done = i < ordered.length}
                    <!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
                    <li
                        tabindex="0"
                        class:unordered={!done}
                        aria-label="{done ? i + 1 : 'Unordered'}: {name(id)}"
                        onkeydown={e => (e.key === 'ArrowUp' || e.key === 'ArrowDown') && (e.preventDefault(), shift(i, e.key === 'ArrowUp' ? -1 : 1))}
                    >
                        <span class="num" aria-hidden="true">{done ? i + 1 : '–'}</span>
                        <span class="nm">{name(id)}</span>
                        {#if !done}<span class="tag">unordered</span>{/if}
                        <button class="btn-ghost mini" type="button" tabindex="-1" aria-label="Move {name(id)} up" onclick={() => shift(i, -1)}>↑</button>
                        <button class="btn-ghost mini" type="button" tabindex="-1" aria-label="Move {name(id)} down" onclick={() => shift(i, 1)}>↓</button>
                    </li>
                {/each}
            </ol>
            <div class="row">
                <label>
                    Keys
                    <select bind:value={preset}>
                        {#each SIBLING_PRESETS as p (p.id)}<option value={p.id}>{p.label}</option>{/each}
                    </select>
                </label>
                <label><input type="checkbox" bind:checked={wrap} /> Wrap from last to first</label>
            </div>
        {/if}
    </div>
    {#snippet actions()}
        {#if o.ask}
            <button class="btn-ghost" type="button" onclick={connectAll}>No, connect every node</button>
            <button class="btn-primary" type="button" onclick={() => (app.ui.ordering!.ask = false)}>Yes, create a dimension</button>
        {:else}
            <button class="btn-ghost" type="button" onclick={close}>Cancel</button>
            <button class="btn-primary" type="button" onclick={submit}>Submit</button>
        {/if}
    {/snippet}
</Modal>

<style>
    .body {
        display: flex;
        flex-direction: column;
        gap: calc(var(--dn-space) * 1.5);
    }

    .desc {
        font-size: 0.8125rem;
        color: var(--dn-text-muted);
    }

    .order-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
        max-height: 220px;
        overflow-y: auto;
    }

    .order-list li {
        display: flex;
        align-items: center;
        gap: var(--dn-space);
        padding: 2px 4px;
        border: 1px solid var(--dn-border);
        border-radius: 4px;
    }

    .order-list li.unordered {
        border-style: dashed;
        color: var(--dn-text-muted);
    }

    .num {
        min-width: 1.5em;
        font-weight: 700;
        text-align: center;
    }

    .nm {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .tag {
        font-size: 0.75rem;
        font-style: italic;
    }

    .mini {
        min-width: 28px;
        min-height: 28px;
        padding: 0;
    }

    .row {
        display: flex;
        flex-wrap: wrap;
        gap: calc(var(--dn-space) * 2);
        font-size: 0.875rem;
    }
</style>
