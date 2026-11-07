<script lang="ts">
    import { app, edit, goTo } from '../../model/state.svelte';
    import { prepDefaults } from '../../model/questions';
    import Modal from './Modal.svelte';

    const { onclose }: { onclose: () => void } = $props();
    let dialog = $state<HTMLDialogElement>();
    const target = app.ui.skipPrep ?? 2;
    const preview = prepDefaults(structuredClone($state.snapshot(app.doc)) as typeof app.doc);

    function go(defaults: boolean) {
        if (defaults) edit('Skipped prep with defaults', d => void prepDefaults(d));
        else app.doc = { ...app.doc, meta: { ...app.doc.meta, prepDone: true } };
        dialog?.close();
        goTo(target, true);
    }
</script>

<Modal title="Skip the rest of prep?" {onclose} bind:dialog>
    {#if preview.length}
        <p class="modal-desc">Some questions are still unanswered. Skeleton can fill them in with its best guesses, and you can change any of them later:</p>
        <ul>
            {#each preview as note (note)}<li>{note}</li>{/each}
        </ul>
    {:else}
        <p class="modal-desc">Everything prep needs is already answered.</p>
    {/if}
    {#snippet actions()}
        <button class="btn-ghost" type="button" onclick={() => dialog?.close()}>Cancel</button>
        {#if preview.length}
            <button class="btn-ghost" type="button" onclick={() => go(false)}>Continue without defaults</button>
        {/if}
        <button class="btn-primary" type="button" onclick={() => go(true)}>{preview.length ? 'Use defaults and continue' : 'Continue'}</button>
    {/snippet}
</Modal>
