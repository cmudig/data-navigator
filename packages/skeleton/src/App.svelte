<script lang="ts">
    import './styles/global.css';
    import { app, goTo, undo, redo, load, stepFor } from './model/state.svelte';
    import { saveDoc, loadDoc } from './utils/saveLoad';
    import StepNav from './app/components/StepNav.svelte';
    import PropertiesPanel from './app/components/PropertiesPanel.svelte';
    import SchemaPanel from './app/components/SchemaPanel.svelte';
    import ScaffoldPanel from './app/components/scaffold/ScaffoldPanel.svelte';
    import { buildVegaSpec, renderHidden, toImage } from './utils/vegaBuilder';
    import { vega } from './runtime/adapters.js';
    import EntryNodeModal from './app/components/EntryNodeModal.svelte';
    import SkipPrepModal from './app/components/SkipPrepModal.svelte';
    import Step0_Upload from './app/steps/Step0_Upload.svelte';
    import Step1_Prep from './app/steps/Step1_Prep.svelte';
    import Step2_Editor from './app/steps/Step2_Editor.svelte';
    import Step3_Testing from './app/steps/Step3_Testing.svelte';
    import Step4_Export from './app/steps/Step4_Export.svelte';
    import HelpModal from './app/components/HelpModal.svelte';
    import IntroModal from './app/components/IntroModal.svelte';

    const steps = [Step0_Upload, Step1_Prep, Step2_Editor, Step3_Testing, Step4_Export];
    const step = $derived(app.ui.step);
    const ActiveStep = $derived(steps[step]);
    const isFullWidth = $derived(step !== 2);
    const scaffoldModeActive = $derived(app.ui.scaffoldMode);
    const showSchemaPanel = $derived(step === 2);
    let historyOpen = $state(false);

    let builtKey = '';
    $effect(() => {
        const spec = app.chartSpec;
        const img = app.doc.image;
        if (img && !img.built) return;
        const key = spec ? JSON.stringify(spec) : '';
        if (key === builtKey && (!!img) === !!spec) return;
        builtKey = key;
        if (!spec) {
            if (img) app.doc = { ...app.doc, image: null };
            return;
        }
        let stale = false;
        const timer = setTimeout(async () => {
            try {
                const image = await toImage(spec);
                if (!stale) app.doc = { ...app.doc, image: { ...image, built: true } };
            } catch (e) {
                builtKey = '';
                app.error = String(e);
            }
        }, 200);
        return () => {
            stale = true;
            clearTimeout(timer);
        };
    });

    let release: (() => void) | null = null;
    $effect(() => {
        const cfg = app.scaffold;
        const built = app.built;
        const rows = app.vegaRows;
        const spec = built ? app.chartSpec! : cfg && buildVegaSpec(cfg, rows);
        if (!spec) {
            app.measure = app.view = null;
            return;
        }
        const offset = built || !cfg ? [0, 0] : [cfg.offsetX, cfg.offsetY];
        let stale = false;
        const timer = setTimeout(async () => {
            try {
                const { view, cleanup } = await renderHidden(spec);
                if (stale) return cleanup();
                release?.();
                release = cleanup;
                app.view = view;
                app.measure = vega(view, { key: (d: any) => d._dn_row, offset })();
                app.error = '';
            } catch (e) {
                app.error = String(e);
            }
        }, 150);
        return () => {
            stale = true;
            clearTimeout(timer);
        };
    });

    const formatTime = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    function jump(offset: number) {
        for (let i = 0; i < Math.abs(offset); i++) offset < 0 ? undo() : redo();
    }

    function handleKeyDown(e: KeyboardEvent) {
        const t = e.target as HTMLElement;
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) || t.isContentEditable) return;
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            e.shiftKey ? redo() : undo();
        }
    }

    const THEME_KEY = 'dn-skeleton-theme';
    const stored = (() => { try { return localStorage.getItem(THEME_KEY); } catch { return null; } })();
    let isDark = $state(stored ? stored === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches);
    $effect(() => {
        document.documentElement.classList.toggle('dark', isDark);
    });

    function toggleTheme() {
        isDark = !isDark;
        try { localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light'); } catch {}
    }

    let showHelp = $state(false);
    let helpButtonEl: HTMLButtonElement | undefined = $state();
    const INTRO_KEY = 'dn-skeleton-intro-seen';
    let showIntro = $state((() => { try { return localStorage.getItem(INTRO_KEY) !== 'true'; } catch { return true; } })());

    let loadFileInput: HTMLInputElement;
    let saveLoadStatus = $state('');
    let statusTimer: ReturnType<typeof setTimeout>;

    function showStatus(msg: string) {
        saveLoadStatus = msg;
        clearTimeout(statusTimer);
        statusTimer = setTimeout(() => (saveLoadStatus = ''), 5000);
    }

    function handleSave() {
        try {
            saveDoc(app.doc);
            showStatus('Session saved.');
        } catch (e) {
            showStatus(`Save failed: ${(e as Error).message}`);
        }
    }

    async function handleLoadFile(file: File) {
        try {
            load(await loadDoc(file));
            goTo(stepFor(app.doc), true);
            showStatus(`Loaded ${file.name}.`);
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
                History{#if app.past.length > 0}&nbsp;({app.past.length}){/if}
            </summary>
            <div class="history-panel" role="listbox" aria-label="Action history">
                {#if app.past.length === 0 && app.future.length === 0}
                    <p class="history-empty">No actions logged yet.</p>
                {:else}
                    {#each app.future.toReversed() as entry, ri}
                        <button class="history-item history-future" type="button" role="option" aria-selected="false" onclick={() => { jump(app.future.length - ri); historyOpen = false; }}>
                            <span class="history-label">Redo: {entry.label}</span>
                        </button>
                    {/each}
                    <button class="history-item history-current" type="button" role="option" aria-selected="true" onclick={() => (historyOpen = false)}>
                        <span class="history-label">Current state</span>
                    </button>
                    {#each app.past.toReversed() as entry, ri}
                        <button class="history-item" type="button" role="option" aria-selected="false" onclick={() => { jump(-(ri + 1)); historyOpen = false; }}>
                            <span class="history-label">Undo: {entry.label}</span>
                            <span class="history-time">{formatTime(entry.time)}</span>
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
<StepNav />

<!-- Main workspace -->
<main id="main-content">
    <div
        class="workspace"
        class:full-width={isFullWidth}
        role="tabpanel"
        aria-labelledby="tab-{step}"
        id="step-panel-{step}"
    >
        {#if showSchemaPanel}
            <aside aria-label="Schema">
                <SchemaPanel />
            </aside>
        {/if}

        {#if step !== 3}
            <div class="workspace-canvas" class:workspace-canvas--fill={step === 2}>
                <ActiveStep />
            </div>
        {:else}
            <ActiveStep />
        {/if}

        {#if !isFullWidth}
            <aside class="workspace-panel" aria-label={scaffoldModeActive ? 'Scaffold' : 'Properties'}>
                {#if scaffoldModeActive}
                    <ScaffoldPanel />
                {:else}
                    <PropertiesPanel />
                {/if}
            </aside>
        {/if}
    </div>
</main>

{#if showIntro}
    <IntroModal onclose={() => (showIntro = false)} />
{/if}

{#if showHelp}
    <HelpModal
        onclose={() => { showHelp = false; helpButtonEl?.focus(); }}
        onOpenIntro={() => { showHelp = false; showIntro = true; }}
    />
{/if}

{#if app.ui.skipPrep !== null}
    <SkipPrepModal onclose={() => (app.ui.skipPrep = null)} />
{/if}

{#if app.ui.entryGate}
    <EntryNodeModal
        onclose={() => (app.ui.entryGate = false)}
        onconfirm={() => { app.ui.entryGate = false; goTo(3); }}
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

    .history-future {
        color: var(--dn-text-muted);
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
    }

    :global(.workspace > aside:not(.workspace-panel)) {
        overflow: hidden;
    }
</style>
