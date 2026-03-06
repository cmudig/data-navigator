<script lang="ts">
    import './styles/global.css';
    import { tick } from 'svelte';
    import { appState } from './store/appState';
    import StepNav from './app/components/StepNav.svelte';
    import PropertiesPanel from './app/components/PropertiesPanel.svelte';
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
    const fullWidthSteps = new Set([0, 4, 5, 6]);

    let currentStep = $state(0);

    appState.subscribe(async s => {
        currentStep = s.currentStep;
        // After the DOM updates, move focus to the new step heading
        await tick();
        const heading = document.getElementById(`step-heading-${s.currentStep}`);
        heading?.focus();
    });

    const ActiveStep = $derived(stepComponents[currentStep]);
    const isFullWidth = $derived(fullWidthSteps.has(currentStep));
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
</header>

<!-- Step navigation -->
<StepNav />

<!-- Main workspace -->
<main id="main-content">
    <div
        class="workspace"
        class:full-width={isFullWidth}
        role="tabpanel"
        aria-labelledby="tab-{currentStep}"
        id="step-panel-{currentStep}"
    >
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

<style>
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
