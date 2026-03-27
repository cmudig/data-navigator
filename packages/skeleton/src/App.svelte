<script lang="ts">
    import './styles/global.css';
    import { tick } from 'svelte';
    import { get } from 'svelte/store';
    import { appState } from './store/appState';
    import { saveState, loadState } from './utils/saveLoad';
    import { historyStore, undo, redo, jumpTo, resetHistory, logAction } from './store/historyStore';
    import type { HistoryEntry } from './store/historyStore';
    import StepNav from './app/components/StepNav.svelte';
    import PropertiesPanel from './app/components/PropertiesPanel.svelte';
    import SchemaPanel from './app/components/SchemaPanel.svelte';
    import ScaffoldPanel from './app/components/scaffold/ScaffoldPanel.svelte';
    import EntryNodeModal from './app/components/EntryNodeModal.svelte';
    import Step0_Upload from './app/steps/Step0_Upload.svelte';
    import Step1_Prep from './app/steps/Step1_Prep.svelte';
    import Step2_Editor from './app/steps/Step2_Editor.svelte';
    import Step3_Testing from './app/steps/Step3_Testing.svelte';
    import Step4_Export from './app/steps/Step4_Export.svelte';
    import HelpModal from './app/components/HelpModal.svelte';
    import IntroModal from './app/components/IntroModal.svelte';

    const stepComponents = [
        Step0_Upload,
        Step1_Prep,
        Step2_Editor,
        Step3_Testing,
        Step4_Export,
    ] as const;

    // Steps that should be full-width (no properties panel)
    // Editor (step 2) shows the properties panel; all others are full-width
    const fullWidthSteps = new Set([0, 1, 3, 4]);

    let currentStep = $state(0);
    let hasUploadedData = $state(false);
    let showEntryGate = $state(false);
    let scaffoldModeActive = $state(false);

    let _lastStep = -1;
    appState.subscribe(async s => {
        const stepChanged = s.currentStep !== _lastStep;
        _lastStep = s.currentStep;
        currentStep = s.currentStep;
        hasUploadedData = s.uploadedData !== null;
        scaffoldModeActive = s.scaffoldModeActive;
        // Move focus to the new step heading only when the step actually changes
        if (stepChanged) {
            await tick();
            const heading = document.getElementById(`step-heading-${s.currentStep}`);
            heading?.focus();
        }
    });

    function beforeStepNavigate(targetStep: number): boolean {
        const s = get(appState);
        if (targetStep === 2 && s.currentStep === 1) {
            if (!s.prepState?.hasRun) {
                const confirmed = window.confirm(
                    "You haven't finished prepping your data yet.\n\n" +
                    "The Editor will try to auto-build a structure, but labels and descriptions " +
                    "won't be set up. You can always come back to Prep later.\n\n" +
                    "Continue anyway?"
                );
                if (!confirmed) return false;
            }
        }
        // Warn when navigating upstream from the Editor if the user has manual node/edge edits.
        // Going back to Prep (step 1) or Upload (step 0) and then back to the Editor could
        // trigger a schema rebuild that overwrites those changes.
        if (targetStep < 2 && s.currentStep >= 2 && s.hasManualNodeEdits) {
            const confirmed = window.confirm(
                "You've manually edited individual nodes or edges in the Editor.\n\n" +
                "Going back to an earlier step and re-running setup may rebuild the graph " +
                "structure and override those changes.\n\n" +
                "Continue?"
            );
            if (!confirmed) return false;
        }
        if (targetStep === 3) {
            if (!s.entryNodeId) {
                showEntryGate = true;
                return false;
            }
        }
        return true;
    }

    const ActiveStep = $derived(stepComponents[currentStep]);
    const isFullWidth = $derived(fullWidthSteps.has(currentStep));
    const showSchemaPanel = $derived(currentStep === 2 && hasUploadedData);

    // ── History ───────────────────────────────────────────────────────────────
    let historyEntries = $state<HistoryEntry[]>([]);
    let historyPointer = $state(-1);
    let historyOpen = $state(false);

    historyStore.subscribe(h => {
        historyEntries = h.entries;
        historyPointer = h.pointer;
    });

    function formatTime(ts: number): string {
        const d = new Date(ts);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }

    function handleKeyDown(e: KeyboardEvent) {
        const t = e.target as HTMLElement;
        if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable) return;
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
            e.preventDefault();
            e.shiftKey ? redo() : undo();
        }
    }

    // ── Theme toggle ──────────────────────────────────────────────────────────
    const THEME_KEY = 'dn-skeleton-theme';

    function resolveInitialDark(): boolean {
        const stored = localStorage.getItem(THEME_KEY);
        if (stored === 'dark') return true;
        if (stored === 'light') return false;
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    const initialDark = resolveInitialDark();
    document.documentElement.classList.toggle('dark', initialDark);
    let isDark = $state(initialDark);

    function toggleTheme() {
        isDark = !isDark;
        document.documentElement.classList.toggle('dark', isDark);
        localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
    }

    // ── Help modal ────────────────────────────────────────────────────────────
    let showHelp = $state(false);
    let helpButtonEl: HTMLButtonElement | undefined = $state();

    // ── Intro modal ───────────────────────────────────────────────────────────
    const INTRO_KEY = 'dn-skeleton-intro-seen';
    let showIntro = $state(localStorage.getItem(INTRO_KEY) !== 'true');

    function openIntroFromHelp() {
        showHelp = false;
        showIntro = true;
    }

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
            resetHistory();
            logAction('Loaded session');
            showStatus(summary);
        } catch (e) {
            showStatus(`Load failed: ${(e as Error).message}`);
        }
    }
</script>

<svelte:window onkeydown={handleKeyDown} />

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
        <!-- Theme toggle -->
        <button
            class="btn-ghost btn-sm theme-toggle"
            type="button"
            onclick={toggleTheme}
            title="Switch to {isDark ? 'light' : 'dark'} mode"
            aria-label="Switch to {isDark ? 'light' : 'dark'} mode"
        >
            {#if isDark}
                <!-- Moon: currently dark, switch to light -->
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
                </svg>
            {:else}
                <!-- Sun: currently light, switch to dark -->
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="4"/>
                    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
                </svg>
            {/if}
        </button>

        <!-- Help button -->
        <button
            bind:this={helpButtonEl}
            class="btn-ghost btn-sm"
            type="button"
            onclick={() => { showHelp = true; }}
            title="Show help and documentation"
        >Help</button>

        <!-- History dropdown -->
        <details class="history-dropdown" bind:open={historyOpen}>
            <summary class="btn-ghost btn-sm" title="View and navigate action history">
                History{#if historyEntries.length > 0}&nbsp;({historyEntries.length}){/if}
            </summary>
            <div class="history-panel" role="listbox" aria-label="Action history">
                {#if historyEntries.length === 0}
                    <p class="history-empty">No actions logged yet.</p>
                {:else}
                    {#each [...historyEntries].reverse() as entry, ri}
                        {@const i = historyEntries.length - 1 - ri}
                        <button
                            class="history-item"
                            class:history-current={i === historyPointer}
                            type="button"
                            role="option"
                            aria-selected={i === historyPointer}
                            onclick={() => { jumpTo(i); historyOpen = false; }}
                        >
                            <span class="history-label">{entry.label}</span>
                            <span class="history-time">{formatTime(entry.timestamp)}</span>
                        </button>
                    {/each}
                {/if}
            </div>
        </details>

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

        {#if currentStep !== 3}
            <div class="workspace-canvas" class:workspace-canvas--fill={currentStep === 2}>
                <ActiveStep />
            </div>
        {:else}
            <ActiveStep />
        {/if}

        {#if !isFullWidth}
            <aside class="workspace-panel" aria-label={currentStep === 2 && scaffoldModeActive ? 'Scaffold' : 'Properties'}>
                {#if currentStep === 2 && scaffoldModeActive}
                    <ScaffoldPanel />
                {:else}
                    <PropertiesPanel />
                {/if}
            </aside>
        {/if}
    </div>
</main>

{#if showIntro}
    <IntroModal onclose={() => { showIntro = false; }} />
{/if}

{#if showHelp}
    <HelpModal
        onclose={() => { showHelp = false; helpButtonEl?.focus(); }}
        onOpenIntro={openIntroFromHelp}
    />
{/if}

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

    .theme-toggle {
        padding: calc(var(--dn-space) * 0.5);
        min-width: 32px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
    }

    .save-load-status {
        font-size: 0.8125rem;
        color: var(--dn-text-muted);
        white-space: nowrap;
    }

    /* ── History dropdown ───────────────────────────────────────────────────── */
    .history-dropdown {
        position: relative;
    }

    .history-dropdown summary {
        list-style: none;
        cursor: pointer;
    }

    .history-dropdown summary::-webkit-details-marker {
        display: none;
    }

    .history-panel {
        position: absolute;
        top: calc(100% + 4px);
        right: 0;
        z-index: 200;
        min-width: 240px;
        max-height: 280px;
        overflow-y: auto;
        background: var(--dn-surface, #fff);
        border: 1px solid var(--dn-border, #e2e2e2);
        border-radius: var(--dn-radius, 6px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
        padding: calc(var(--dn-space) * 0.5) 0;
    }

    .history-empty {
        margin: 0;
        padding: calc(var(--dn-space) * 0.75) calc(var(--dn-space) * 1);
        font-size: 0.8125rem;
        color: var(--dn-text-muted);
    }

    .history-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        padding: calc(var(--dn-space) * 0.5) calc(var(--dn-space) * 1);
        border: none;
        background: transparent;
        text-align: left;
        font-size: 0.8125rem;
        color: var(--dn-text);
        cursor: pointer;
        gap: calc(var(--dn-space) * 1);
    }

    .history-item:hover {
        background: transparent;
        outline: 2px dashed var(--dn-text, currentColor);
        outline-offset: -2px;
    }

    .history-item.history-current {
        background: transparent;
        font-weight: 700;
        outline: 3px solid var(--dn-text, currentColor);
        outline-offset: -3px;
    }

    .history-label {
        flex: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .history-time {
        font-size: 0.75rem;
        color: var(--dn-text-muted);
        white-space: nowrap;
        flex-shrink: 0;
    }

    :global(body) {
        display: flex;
        flex-direction: column;
        height: 100dvh;
        overflow: hidden;
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

    :global(.workspace > aside) {
        min-height: 0;
        overflow: hidden;
    }
</style>
