<script lang="ts">
    import { get } from 'svelte/store';
    import { appState } from '../../store/appState';
    import type { SkeletonNode } from '../../store/types';

    type Props = {
        onclose: () => void;
        onconfirm: () => void;
    };
    const { onclose, onconfirm }: Props = $props();

    const initial = get(appState);
    let nodes = $state<Map<string, SkeletonNode>>(initial.nodes);
    let selectedNodeId = $state<string | null>(null);

    $effect(() => {
        return appState.subscribe(s => { nodes = s.nodes; });
    });

    const nodeList = $derived([...nodes.values()]);

    let dialogEl: HTMLElement | undefined = $state();

    $effect(() => {
        if (dialogEl) {
            const first = dialogEl.querySelector<HTMLElement>(
                'button, input, [tabindex]:not([tabindex="-1"])'
            );
            first?.focus();
        }
    });

    function handleSetEntry() {
        if (!selectedNodeId) return;
        appState.update(s => ({ ...s, entryNodeId: selectedNodeId }));
        onconfirm();
    }

    function onKeydown(e: KeyboardEvent) {
        if (e.key === 'Escape') {
            onclose();
            return;
        }
        if (e.key === 'Tab' && dialogEl) {
            const focusables = [...dialogEl.querySelectorAll<HTMLElement>(
                'button:not([disabled]), input, [tabindex]:not([tabindex="-1"])'
            )];
            if (focusables.length === 0) return;
            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            if (e.shiftKey) {
                if (document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                }
            } else {
                if (document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        }
    }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="modal-backdrop" role="presentation" onclick={onclose}>
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div
        class="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="entry-modal-title"
        tabindex="-1"
        bind:this={dialogEl}
        onkeydown={onKeydown}
        onclick={(e) => e.stopPropagation()}
    >
        <h2 id="entry-modal-title" class="modal-title">Set an entry node before continuing</h2>
        <p class="modal-desc">
            The entry node is where keyboard navigation begins — it's the first element
            a user reaches when they enter the navigable region of your interface.
        </p>

        <div class="node-list" role="radiogroup" aria-label="Select entry node">
            {#each nodeList as node}
                <label class="radio-row">
                    <input
                        type="radio"
                        name="entry-node-modal"
                        value={node.id}
                        bind:group={selectedNodeId}
                    />
                    <span class="radio-label">{node.label}</span>
                </label>
            {/each}
            {#if nodeList.length === 0}
                <p class="empty-msg">No nodes have been created yet. Go back to Step 1 to add nodes.</p>
            {/if}
        </div>

        <div class="modal-actions">
            <button class="btn-ghost" type="button" onclick={onclose}>Cancel</button>
            <button
                class="btn-primary"
                type="button"
                disabled={!selectedNodeId || nodeList.length === 0}
                onclick={handleSetEntry}
            >
                Set entry node
            </button>
        </div>
    </div>
</div>

<style>
    .modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.45);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    }

    .modal {
        background: var(--dn-bg);
        border: 1px solid var(--dn-border);
        border-radius: var(--dn-radius);
        padding: calc(var(--dn-space) * 3);
        width: min(480px, calc(100vw - var(--dn-space) * 4));
        max-height: 80dvh;
        display: flex;
        flex-direction: column;
        gap: calc(var(--dn-space) * 2);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
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
