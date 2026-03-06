<script lang="ts">
    import { appState } from '../../store/appState';

    const steps = [
        { label: 'Upload',        index: 0 },
        { label: 'Structure',     index: 1 },
        { label: 'Input',         index: 2 },
        { label: 'Render',        index: 3 },
        { label: 'Debug',         index: 4 },
        { label: 'Accessibility', index: 5 },
        { label: 'Export',        index: 6 },
    ];

    let currentStep = $state(0);
    appState.subscribe(s => { currentStep = s.currentStep; });

    function goTo(index: number) {
        appState.update(s => ({ ...s, currentStep: index }));
    }

    function onKeydown(e: KeyboardEvent, index: number) {
        if (e.key === 'ArrowRight') {
            e.preventDefault();
            const next = Math.min(index + 1, steps.length - 1);
            goTo(next);
            focusTab(next);
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            const prev = Math.max(index - 1, 0);
            goTo(prev);
            focusTab(prev);
        } else if (e.key === 'Home') {
            e.preventDefault();
            goTo(0);
            focusTab(0);
        } else if (e.key === 'End') {
            e.preventDefault();
            goTo(steps.length - 1);
            focusTab(steps.length - 1);
        }
    }

    function focusTab(index: number) {
        const el = document.getElementById(`tab-${index}`);
        el?.focus();
    }
</script>

<nav class="step-nav" aria-label="Workflow steps">
    <div class="step-nav-inner" role="tablist">
        {#each steps as step}
            <button
                id="tab-{step.index}"
                role="tab"
                aria-selected={currentStep === step.index}
                aria-controls="step-panel-{step.index}"
                tabindex={currentStep === step.index ? 0 : -1}
                class="step-tab"
                class:active={currentStep === step.index}
                onclick={() => goTo(step.index)}
                onkeydown={(e) => onKeydown(e, step.index)}
            >
                <span class="step-number" aria-hidden="true">{step.index}</span>
                <span class="step-label">{step.label}</span>
            </button>
        {/each}
    </div>
</nav>

<style>
    .step-nav {
        background: var(--dn-surface);
        border-bottom: 1px solid var(--dn-border);
        padding: 0 calc(var(--dn-space) * 3);
    }

    .step-nav-inner {
        display: flex;
        gap: calc(var(--dn-space) * 0.5);
        overflow-x: auto;
        scrollbar-width: none;
        padding: calc(var(--dn-space) * 1) 0;
        /* Keyboard arrow navigation: roving tabindex pattern */
    }

    .step-nav-inner::-webkit-scrollbar {
        display: none;
    }

    .step-tab {
        display: flex;
        align-items: center;
        gap: calc(var(--dn-space) * 0.75);
        padding: calc(var(--dn-space) * 0.625) calc(var(--dn-space) * 1.75);
        border: 2px solid transparent;
        background: transparent;
        color: var(--dn-text-muted);
        font-size: 0.875rem;
        font-weight: 500;
        border-radius: 20px;
        white-space: nowrap;
        cursor: pointer;
        min-height: 36px;
        /* override global min-height for compact tabs */
        transition: background 0.15s, color 0.15s;
    }

    .step-tab:hover:not(.active) {
        background: var(--dn-accent-soft);
        color: var(--dn-text);
    }

    .step-tab.active {
        background: var(--dn-accent);
        color: #fff;
        border-color: transparent;
    }

    .step-tab:focus-visible {
        outline: 3px solid var(--dn-accent);
        outline-offset: 2px;
    }

    .step-number {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        font-size: 0.75rem;
        font-weight: 700;
        background: rgba(0, 0, 0, 0.12);
        flex-shrink: 0;
    }

    .step-tab.active .step-number {
        background: rgba(255, 255, 255, 0.25);
    }

    @media (max-width: 640px) {
        .step-nav {
            padding: 0 calc(var(--dn-space) * 1.5);
        }

        .step-tab {
            padding: calc(var(--dn-space) * 0.5) calc(var(--dn-space) * 1.25);
            font-size: 0.8125rem;
        }
    }
</style>
