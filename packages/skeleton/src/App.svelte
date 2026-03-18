<script lang="ts">
    import './styles/global.css';
    import { tick } from 'svelte';
    import { get } from 'svelte/store';
    import { appState } from './store/appState';
    import { saveState, loadState } from './utils/saveLoad';
    import StepNav from './app/components/StepNav.svelte';
    import PropertiesPanel from './app/components/PropertiesPanel.svelte';
    import SchemaPanel from './app/components/SchemaPanel.svelte';
    import EntryNodeModal from './app/components/EntryNodeModal.svelte';
    import Step0_Upload from './app/steps/Step0_Upload.svelte';
    import Step1_Structure from './app/steps/Step1_Structure.svelte';
    import Step2_Input from './app/steps/Step2_Input.svelte';
    import Step3_Render from './app/steps/Step3_Render.svelte';
    import Step4_Debug from './app/steps/Step4_Debug.svelte';
    import Step5_Accessibility from './app/steps/Step5_Accessibility.svelte';
    import Step6_Export from './app/steps/Step6_Export.svelte';

    const stepComponents = [
        Step0_Upload,
        Step1_Structure,
        Step2_Input,
        Step3_Render,
        Step4_Debug,
        Step5_Accessibility,
        Step6_Export,
    ] as const;

    // Steps that should be full-width (no properties panel)
    // Step 2 is full-width because it manages its own two-column layout internally
    const fullWidthSteps = new Set([0, 2, 4, 5, 6]);

    let currentStep = $state(0);
    let hasUploadedData = $state(false);
    let showEntryGate = $state(false);

    let _lastStep = -1;
    appState.subscribe(async s => {
        const stepChanged = s.currentStep !== _lastStep;
        _lastStep = s.currentStep;
        currentStep = s.currentStep;
        hasUploadedData = s.uploadedData !== null;
        // Move focus to the new step heading only when the step actually changes
        if (stepChanged) {
            await tick();
            const heading = document.getElementById(`step-heading-${s.currentStep}`);
            heading?.focus();
        }
    });

    function beforeStepNavigate(targetStep: number): boolean {
        if (targetStep === 3) {
            const s = get(appState);
            if (!s.entryNodeId) {
                showEntryGate = true;
                return false;
            }
        }
        return true;
    }

    const ActiveStep = $derived(stepComponents[currentStep]);
    const isFullWidth = $derived(fullWidthSteps.has(currentStep));
    const showSchemaPanel = $derived(currentStep === 1 && hasUploadedData);

    // ── Save / Load ───────────────────────────────────────────────────────────
    let loadFileInput: HTMLInputElement;
    let saveLoadStatus = $state('');
    let saveLoadStatusTimeout: ReturnType<typeof setTimeout> | null = null;

    function showStatus(msg: string) {
        saveLoadStatus = msg;
        if (saveLoadStatusTimeout) clearTimeout(saveLoadStatusTimeout);
        saveLoadStatusTimeout = setTimeout(() => { saveLoadStatus = ''; }, 5000);
    }

    function handleSave() {
        try {
            saveState();
            showStatus('Session saved.');
        } catch (e) {
            showStatus(`Save failed: ${(e as Error).message}`);
        }
    }

    async function handleLoadFile(file: File) {
        try {
            const summary = await loadState(file);
            showStatus(summary);
        } catch (e) {
            showStatus(`Load failed: ${(e as Error).message}`);
        }
    }
</script>

<!-- Skip to main content -->
<a class="skip-link" href="#main-content">Skip to main content</a>

<!-- App header -->
<header class="app-header">
    <img
        src="/data-navigator/skeleton/logo.svg"
        alt="Data Navigator"
        height="24"
        width="auto"
    />
    <h1 class="app-header-title">Skeleton</h1>

    <div class="app-header-actions">
        <!-- Hidden file input for loading a session ZIP -->
        <input
            bind:this={loadFileInput}
            type="file"
            accept=".zip"
            class="visually-hidden"
            aria-hidden="true"
            tabindex="-1"
            onchange={(e) => {
                const f = (e.target as HTMLInputElement).files?.[0];
                if (f) handleLoadFile(f);
                (e.target as HTMLInputElement).value = '';
            }}
        />

        <button
            class="btn-ghost btn-sm"
            type="button"
            onclick={() => loadFileInput.click()}
            title="Load a previously saved session (.zip)"
        >
            Load session
        </button>

        <button
            class="btn-ghost btn-sm"
            type="button"
            onclick={handleSave}
            title="Save the current session as a .zip file"
        >
            Save session
        </button>

        {#if saveLoadStatus}
            <span class="save-load-status" aria-live="polite" aria-atomic="true">
                {saveLoadStatus}
            </span>
        {/if}
    </div>
</header>

<!-- Step navigation -->
<StepNav beforeNavigate={beforeStepNavigate} />

<!-- Main workspace -->
<main id="main-content">
    <div
        class="workspace"
        class:full-width={isFullWidth}
        role="tabpanel"
        aria-labelledby="tab-{currentStep}"
        id="step-panel-{currentStep}"
    >
        {#if showSchemaPanel}
            <aside aria-label="Schema">
                <SchemaPanel />
            </aside>
        {/if}

        <div class="workspace-canvas">
            <ActiveStep />
        </div>

        {#if !isFullWidth}
            <aside class="workspace-panel" aria-label="Properties">
                <PropertiesPanel />
            </aside>
        {/if}
    </div>
</main>

{#if showEntryGate}
    <EntryNodeModal
        onclose={() => { showEntryGate = false; }}
        onconfirm={() => {
            showEntryGate = false;
            appState.update(s => ({ ...s, currentStep: 3 }));
        }}
    />
{/if}

<style>
    .app-header-actions {
        display: flex;
        align-items: center;
        gap: calc(var(--dn-space) * 1);
        margin-left: auto;
        flex-wrap: wrap;
    }

    .save-load-status {
        font-size: 0.8125rem;
        color: var(--dn-text-muted);
        white-space: nowrap;
    }

    :global(body) {
        display: flex;
        flex-direction: column;
        min-height: 100dvh;
        margin: 0;
    }

    main {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-height: 0;
    }

    main > :global(.workspace) {
        flex: 1;
        display: flex;
        min-height: 0;
        overflow: hidden;
    }
</style>
