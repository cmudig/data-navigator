<script lang="ts">
    import { app } from '../../model/state.svelte';
    import { asParentOf, connect, insertAt } from '../../model/edits';
    import Modal from './Modal.svelte';

    let dialog = $state<HTMLDialogElement>();
    const { id, targets } = app.ui.connect!;
    const t = app.tree;
    const name = (n: string) => app.graph.nodes.get(n)?.name ?? n;
    let yes = $state(false);
    let target = $state(targets.length === 1 ? targets[0] : '');
    let how = $state<'sibling' | 'parent'>('sibling');

    const nearest = (n: string) => {
        let p = t.parent[n];
        while (p !== undefined && !targets.includes(p)) p = t.parent[p];
        return p;
    };
    const kids = (p: string | undefined) => targets.filter(n => nearest(n) === p);
    const isGroup = (n: string) => !!t.children[n]?.length;
    const structured = $derived(!!target && (t.group(target) !== undefined || isGroup(target)));
    const p = $derived(target ? t.parent[target] : undefined);
    const canParent = $derived(!!p && app.tree.level[p] !== 0);
    const kind = $derived(target && isGroup(target) ? 'group' : 'node');

    function submit() {
        if (yes && target) {
            if (!structured) connect(id, target);
            else if (how === 'parent' && canParent) asParentOf(target, id);
            else insertAt(isGroup(target) ? target : t.group(target)!, id);
        }
        dialog?.close();
    }
</script>

{#snippet list(parent: string | undefined)}
    <ul>
        {#each kids(parent) as n (n)}
            <li>
                <label class="radio-row">
                    <input type="radio" name="connect-target" value={n} bind:group={target} />
                    {name(n)} <span class="kind">{isGroup(n) ? 'group' : 'node'}</span>
                </label>
                {#if kids(n).length}{@render list(n)}{/if}
            </li>
        {/each}
    </ul>
{/snippet}

<Modal title="Connect {name(id)}?" onclose={() => (app.ui.connect = null)} bind:dialog>
    <fieldset>
        <legend>Do you want to connect this node to others?</legend>
        <label class="radio-row"><input type="radio" name="connect-yes" value={true} bind:group={yes} /> Yes</label>
        <label class="radio-row"><input type="radio" name="connect-yes" value={false} bind:group={yes} /> No, just move it</label>
    </fieldset>
    <fieldset disabled={!yes}>
        <legend>Create edges between {name(id)} and:</legend>
        <div class="targets">{@render list(undefined)}</div>
    </fieldset>
    {#if yes && structured}
        <fieldset>
            <legend>How should it connect?</legend>
            <label class="radio-row">
                <input type="radio" name="connect-how" value="sibling" bind:group={how} />
                Add to this {name(target)} {kind} as a sibling
            </label>
            {#if canParent}
                <label class="radio-row">
                    <input type="radio" name="connect-how" value="parent" bind:group={how} />
                    Add to this {name(target)} {kind} as a parent
                </label>
            {/if}
        </fieldset>
    {/if}
    {#snippet actions()}
        <button class="btn-ghost" type="button" onclick={() => dialog?.close()}>Cancel</button>
        <button class="btn-primary" type="button" disabled={yes && !target} onclick={submit}>Submit</button>
    {/snippet}
</Modal>

<style>
    .targets {
        max-height: 240px;
        overflow-y: auto;
    }

    ul {
        list-style: none;
        margin: 0;
        padding-left: calc(var(--dn-space) * 2);
    }

    .targets > ul {
        padding-left: 0;
    }

    .kind {
        font-size: 0.75rem;
        color: var(--dn-text-muted);
    }
</style>
