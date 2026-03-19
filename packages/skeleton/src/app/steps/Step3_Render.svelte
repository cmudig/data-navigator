<script lang="ts">
    import { appState } from '../../store/appState';
    import type { RenderConfig } from '../../store/appState';
    import GraphCanvas from '../components/GraphCanvas.svelte';

    let renderConfig = $state<RenderConfig>({ positionUnit: 'px', showOverlay: false });

    $effect(() => {
        return appState.subscribe(s => {
            renderConfig = s.renderConfig;
        });
    });

    function setPositionUnit(unit: 'px' | '%') {
        appState.update(s => ({ ...s, renderConfig: { ...s.renderConfig, positionUnit: unit } }));
    }

    function toggleOverlay(show: boolean) {
        appState.update(s => ({ ...s, renderConfig: { ...s.renderConfig, showOverlay: show } }));
    }

    function continueToDebug() {
        appState.update(s => ({ ...s, currentStep: 4 }));
    }
</script>

<div class="render-step">
    <div class="step-header">
        <h2 id="step-heading-3" tabindex="-1">Render</h2>
        <p class="step-desc">
            Set rendering and placement rules: how nodes are positioned, sized, and styled in the DOM.
        </p>
    </div>

    <!-- Controls above canvas -->
    <div class="render-controls" role="group" aria-label="Render configuration">
        <fieldset class="unit-toggle">
            <legend>Position units</legend>
            <label class="radio-label">
                <input
                    type="radio"
                    name="render-pos-unit"
                    value="px"
                    checked={renderConfig.positionUnit === 'px'}
                    onchange={() => setPositionUnit('px')}
                />
                px
            </label>
            <label class="radio-label">
                <input
                    type="radio"
                    name="render-pos-unit"
                    value="%"
                    checked={renderConfig.positionUnit === '%'}
                    onchange={() => setPositionUnit('%')}
                />
                %
            </label>
        </fieldset>

        <label class="overlay-label">
            <input
                type="checkbox"
                checked={renderConfig.showOverlay}
                onchange={(e) => toggleOverlay(e.currentTarget.checked)}
            />
            Preview rendered overlay
        </label>
    </div>

    <GraphCanvas readonly />

    <div class="step-actions">
        <button class="btn-primary" type="button" onclick={continueToDebug}>
            Continue to Debug →
        </button>
    </div>
</div>

<style>
    .render-step {
        display: flex;
        flex-direction: column;
        height: 100%;
        min-height: 0;
        gap: 0;
    }

    .step-header {
        flex-shrink: 0;
        padding-bottom: calc(var(--dn-space) * 2);
    }

    .step-header h2 {
        margin: 0 0 calc(var(--dn-space) * 0.5);
        font-size: 1.5rem;
        font-weight: 600;
        color: var(--dn-text);
    }

    .step-desc {
        margin: 0;
        color: var(--dn-text-muted);
        font-size: 0.9375rem;
    }

    .render-controls {
        flex-shrink: 0;
        display: flex;
        align-items: center;
        gap: calc(var(--dn-space) * 3);
        padding-bottom: calc(var(--dn-space) * 1.5);
        flex-wrap: wrap;
    }

    .unit-toggle {
        border: none;
        padding: 0;
        margin: 0;
        display: flex;
        align-items: center;
        gap: calc(var(--dn-space) * 1.5);
    }

    .unit-toggle legend {
        font-size: 0.8125rem;
        font-weight: 500;
        color: var(--dn-text);
        float: left;
        margin-right: calc(var(--dn-space) * 1);
    }

    .radio-label {
        display: flex;
        align-items: center;
        gap: calc(var(--dn-space) * 0.5);
        font-size: 0.875rem;
        cursor: pointer;
    }

    .radio-label input[type='radio'] {
        accent-color: var(--dn-accent);
        cursor: pointer;
    }

    .overlay-label {
        display: flex;
        align-items: center;
        gap: calc(var(--dn-space) * 0.75);
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--dn-text);
        cursor: pointer;
    }

    .overlay-label input[type='checkbox'] {
        width: 18px;
        height: 18px;
        accent-color: var(--dn-accent);
        cursor: pointer;
        flex-shrink: 0;
    }

    .step-actions {
        flex-shrink: 0;
        display: flex;
        justify-content: flex-end;
        padding-top: calc(var(--dn-space) * 2);
    }
</style>
