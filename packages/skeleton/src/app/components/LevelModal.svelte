<script lang="ts">
    import { untrack } from 'svelte';
    import { app } from '../../model/state.svelte';
    import { applyLevels, levelPlan } from '../../model/edits';
    import Modal from './Modal.svelte';

    const { id, to, onclose }: { id: string; to: number; onclose: () => void } = $props();
    let dialog = $state<HTMLDialogElement>();
    const name = (k: string) => app.graph.nodes.get(k)?.name ?? k;
    const { from, plans } = untrack(() => ({ from: app.tree.level[id], plans: { level: levelPlan(id, to, 'level'), branch: levelPlan(id, to, 'branch') } }));
    let scope = $state<'level' | 'branch'>(plans.level.problem && !plans.branch.problem ? 'branch' : 'level');
    const plan = $derived(plans[scope]);
    const count = (n: number) => `${n} node${n === 1 ? '' : 's'} move${n === 1 ? 's' : ''}`;
</script>

<Modal title="Move {name(id)} to level {to}?" {onclose} bind:dialog>
    {#if from === undefined}
        <p class="modal-desc">{name(id)} has no level yet. Nodes under it move down to stay below it.</p>
    {:else}
        <fieldset>
            <legend>What moves with it?</legend>
            <label class="radio-row">
                <input type="radio" name="level-scope" value="level" bind:group={scope} />
                <span>
                    All of level {from} and every level below it, so the structure keeps its shape
                    <br /><span class="desc">{plans.level.problem || count(Object.keys(plans.level.next).length)}</span>
                </span>
            </label>
            <label class="radio-row">
                <input type="radio" name="level-scope" value="branch" bind:group={scope} />
                <span>
                    Only {name(id)} and the nodes under it
                    <br /><span class="desc">{plans.branch.problem || count(Object.keys(plans.branch.next).length)}</span>
                </span>
            </label>
        </fieldset>
    {/if}
    {#if from === undefined && plan.problem}<p class="modal-desc">{plan.problem}</p>{/if}
    {#if plan.skipped}<p class="modal-desc">Nodes made from the data keep their levels.</p>{/if}
    {#snippet actions()}
        <button class="btn-ghost" type="button" onclick={() => dialog?.close()}>Cancel</button>
        <button class="btn-primary" type="button" disabled={!!plan.problem} onclick={() => (applyLevels(plan.next), dialog?.close())}>Move</button>
    {/snippet}
</Modal>

<style>
    .desc {
        font-size: 0.8125rem;
        color: var(--dn-text-muted);
    }
</style>
