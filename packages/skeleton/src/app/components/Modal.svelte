<script lang="ts">
    import type { Snippet } from 'svelte';

    let {
        title,
        onclose,
        modal = true,
        docked = false,
        dialog = $bindable(),
        children,
        actions
    }: {
        title: string;
        onclose: () => void;
        modal?: boolean;
        docked?: boolean;
        dialog?: HTMLDialogElement;
        children: Snippet;
        actions?: Snippet;
    } = $props();

    const id = `modal-${Math.random().toString(36).slice(2, 8)}`;
    const opener = document.activeElement as HTMLElement | null;

    $effect(() => {
        modal ? dialog!.showModal() : dialog!.show();
        dialog!.querySelector<HTMLElement>('.modal-body input, .modal-body button, .modal-body select, .modal-body textarea')?.focus();
        return () => opener?.isConnected && opener.focus();
    });
</script>

<dialog
    class="modal"
    class:docked
    bind:this={dialog}
    aria-labelledby={id}
    {onclose}
    onclick={e => modal && e.target === dialog && dialog.close()}
>
    <h2 {id} class="modal-title">{title}</h2>
    <div class="modal-body">{@render children()}</div>
    {#if actions}<div class="modal-actions">{@render actions()}</div>{/if}
</dialog>

<style>
    .modal {
        background: var(--dn-bg);
        border: 1px solid var(--dn-border);
        border-radius: var(--dn-radius);
        padding: calc(var(--dn-space) * 3);
        width: min(520px, calc(100vw - var(--dn-space) * 4));
        max-height: 85dvh;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
    }

    .modal[open] {
        display: flex;
        flex-direction: column;
        gap: calc(var(--dn-space) * 2);
    }

    .modal.docked {
        position: fixed;
        inset: auto calc(var(--dn-panel-width) + var(--dn-space) * 3) calc(var(--dn-space) * 3) auto;
        margin: 0;
        width: min(380px, calc(100vw - var(--dn-space) * 4));
        max-height: 70dvh;
        z-index: 300;
    }

    .modal-title {
        margin: 0;
        font-size: 1.125rem;
        font-weight: 600;
    }

    .modal-body {
        display: flex;
        flex-direction: column;
        gap: calc(var(--dn-space) * 1.5);
        overflow-y: auto;
        min-height: 0;
    }

    .modal-actions {
        display: flex;
        justify-content: flex-end;
        flex-wrap: wrap;
        gap: calc(var(--dn-space) * 1);
    }

    .modal :global(.modal-desc) {
        margin: 0;
        font-size: 0.9375rem;
        color: var(--dn-text-muted);
        line-height: 1.6;
    }

    .modal :global(fieldset) {
        border: 1px solid var(--dn-border);
        border-radius: var(--dn-radius);
        padding: calc(var(--dn-space) * 1.25);
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: calc(var(--dn-space) * 0.5);
    }

    .modal :global(fieldset:disabled) {
        opacity: 0.5;
    }

    .modal :global(legend) {
        font-weight: 600;
        padding: 0 calc(var(--dn-space) * 0.5);
    }

    .modal :global(.radio-row) {
        display: flex;
        align-items: center;
        gap: calc(var(--dn-space) * 1);
        padding: calc(var(--dn-space) * 0.5) calc(var(--dn-space) * 0.75);
        border-radius: calc(var(--dn-radius) * 0.5);
        cursor: pointer;
    }

    .modal :global(.radio-row:hover) {
        background: var(--dn-accent-soft);
    }

    .modal :global(.radio-row input) {
        margin: 0;
        accent-color: var(--dn-accent);
        flex-shrink: 0;
    }

    .modal :global(.btn-primary:disabled) {
        opacity: 0.45;
        cursor: not-allowed;
    }
</style>
