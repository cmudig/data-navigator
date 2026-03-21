<script lang="ts">
    import type { LabelTemplate } from '../../../store/appState';

    interface Props {
        fields: string[];
        nodeType: 'level0' | 'level1' | 'level2' | 'level3';
        value: LabelTemplate;
        sampleData: Record<string, unknown>;
        onchange: (v: LabelTemplate) => void;
    }

    let { fields, nodeType, value, sampleData, onchange }: Props = $props();


    // ── Live preview ─────────────────────────────────────────────────────────
    const preview = $derived(buildPreview(value, sampleData));

    function buildPreview(tmpl: LabelTemplate, data: Record<string, unknown>): string {
        let resolved = tmpl.template
            .replace(/\{key:"([^"]+)"\}/g, (_: string, key: string) => key)
            .replace(/\{value:"([^"]+)"\}/g, (_: string, key: string) => {
                const val = data[key];
                return val !== undefined ? String(val) : `[${key}]`;
            });

        const name = tmpl.name || 'data point';
        const cap = name.charAt(0).toUpperCase() + name.slice(1);
        let suffix = cap;
        if (tmpl.includeIndex) suffix += ` 3 of 8`;
        if (tmpl.includeParentName) suffix += ` in Example Group`;
        suffix += '.';

        return resolved ? `${resolved} ${suffix}` : suffix;
    }

    // ── Node type labels ─────────────────────────────────────────────────────
    const NODE_TYPE_LABELS: Record<string, string> = {
        level0: 'entry point (root)',
        level1: 'group header',
        level2: 'sub-group header',
        level3: 'individual data point',
    };

    // ── Mutations ────────────────────────────────────────────────────────────
    function appendToken(token: string) {
        onchange({ ...value, template: value.template + token });
    }

    function clearTemplate() {
        onchange({ ...value, template: '' });
    }

    function handleTemplateInput(e: Event) {
        onchange({ ...value, template: (e.target as HTMLInputElement).value });
    }

    function handleNameInput(e: Event) {
        onchange({ ...value, name: (e.target as HTMLInputElement).value });
    }

    function handleIncludeIndex(e: Event) {
        onchange({ ...value, includeIndex: (e.target as HTMLInputElement).checked });
    }

    function handleIncludeParentName(e: Event) {
        onchange({ ...value, includeParentName: (e.target as HTMLInputElement).checked });
    }
</script>

<div class="label-builder">
    <p class="lb-context">
        Building label for: <strong>{NODE_TYPE_LABELS[nodeType] ?? nodeType}</strong>
    </p>
    <p class="lb-instruction">
        Click a field name to add it to your label. You can add the field's name (as text),
        or its actual value from your data.
    </p>

    {#if fields.length > 0}
        <div class="lb-chips-area" aria-label="Available fields">
            {#each fields as field (field)}
                <div class="lb-chip-pair">
                    <button
                        class="lb-chip lb-chip-key"
                        onclick={() => appendToken(`{key:"${field}"}`)}
                        aria-label={`Add field name "${field}" to label`}
                    >
                        name: {field}
                    </button>
                    <button
                        class="lb-chip lb-chip-value"
                        onclick={() => appendToken(`{value:"${field}"}`)}
                        aria-label={`Add value of "${field}" to label`}
                    >
                        value: {field}
                    </button>
                </div>
            {/each}
        </div>
    {/if}

    <div class="lb-template-row">
        <label class="lb-label" for="lb-template-input">Label template</label>
        <div class="lb-template-controls">
            <input
                id="lb-template-input"
                type="text"
                class="lb-template-input"
                value={value.template}
                oninput={handleTemplateInput}
                placeholder={`e.g. {value:"name"}: {value:"score"}`}
            />
            <button
                class="lb-clear-btn"
                onclick={clearTemplate}
                aria-label="Clear label template"
            >
                Clear
            </button>
        </div>
    </div>

    <div class="lb-options">
        <div class="lb-noun-row">
            <label class="lb-label" for="lb-noun-input">What is each item called?</label>
            <input
                id="lb-noun-input"
                type="text"
                class="lb-noun-input"
                value={value.name}
                oninput={handleNameInput}
                placeholder="data point"
            />
        </div>

        <label class="lb-checkbox-label">
            <input
                type="checkbox"
                checked={value.includeIndex}
                onchange={handleIncludeIndex}
            />
            Include position in group?
            <span class="lb-checkbox-example">(e.g., item 3 of 8)</span>
        </label>

        <label class="lb-checkbox-label">
            <input
                type="checkbox"
                checked={value.includeParentName}
                onchange={handleIncludeParentName}
            />
            Include the name of the group?
            <span class="lb-checkbox-example">(e.g., in North region)</span>
        </label>
    </div>

    <!-- Preview is last so it can stick to the bottom of the scroll container -->
    <div class="lb-preview-box" aria-live="polite" aria-label="Label preview">
        <span class="lb-preview-label">Preview</span>
        <span class="lb-preview-text">{preview}</span>
    </div>
</div>

<style>
    .label-builder {
        display: flex;
        flex-direction: column;
        gap: calc(var(--dn-space) * 1.5);
    }

    .lb-context {
        margin: 0;
        font-size: 0.8125rem;
        color: var(--dn-text-muted);
    }

    .lb-instruction {
        margin: 0;
        font-size: 0.875rem;
        color: var(--dn-text);
        line-height: 1.5;
    }

    /* ── Field chips ── */

    .lb-chips-area {
        display: flex;
        flex-wrap: wrap;
        gap: calc(var(--dn-space) * 0.5);
    }

    .lb-chip-pair {
        display: flex;
        gap: 2px;
    }

    .lb-chip {
        display: inline-flex;
        align-items: center;
        padding: 3px 10px;
        border-radius: 20px;
        font-size: 0.8125rem;
        font-family: var(--dn-font-mono);
        cursor: pointer;
        border: 1px solid transparent;
        min-height: 0;
        min-width: 0;
        transition: background 0.1s, border-color 0.1s, color 0.1s;
    }

    .lb-chip-key {
        background: var(--dn-surface);
        color: var(--dn-text);
        border-color: var(--dn-border);
    }

    .lb-chip-key:hover {
        background: var(--dn-accent-soft);
        border-color: var(--dn-accent);
        color: var(--dn-accent);
    }

    .lb-chip-value {
        background: var(--dn-accent-soft);
        color: var(--dn-accent);
        border-color: var(--dn-accent-light);
    }

    .lb-chip-value:hover {
        background: var(--dn-accent);
        color: #fff;
    }

    /* ── Template row ── */

    .lb-label {
        display: block;
        font-size: 0.8125rem;
        font-weight: 600;
        color: var(--dn-text);
        margin-bottom: calc(var(--dn-space) * 0.5);
    }

    .lb-template-controls {
        display: flex;
        gap: calc(var(--dn-space) * 0.75);
        align-items: center;
    }

    .lb-template-input {
        flex: 1;
        padding: calc(var(--dn-space) * 0.6) calc(var(--dn-space) * 1);
        border: 1px solid var(--dn-border);
        border-radius: var(--dn-radius);
        background: var(--dn-surface);
        color: var(--dn-text);
        font-size: 0.875rem;
        font-family: var(--dn-font-mono);
        box-sizing: border-box;
    }

    .lb-clear-btn {
        padding: calc(var(--dn-space) * 0.5) calc(var(--dn-space) * 1);
        font-size: 0.8125rem;
        font-family: var(--dn-font);
        background: none;
        border: 1px solid var(--dn-border);
        border-radius: var(--dn-radius);
        color: var(--dn-text-muted);
        cursor: pointer;
        min-height: 0;
        white-space: nowrap;
    }

    .lb-clear-btn:hover {
        border-color: var(--dn-accent);
        color: var(--dn-accent);
    }

    /* ── Preview box — sticky at bottom of scroll container ── */
    /* Always uses light-green background regardless of dark mode so the
       preview text stays dark and readable. The box acts as a "light island"
       pinned to the bottom while the user scrolls through fields/options. */

    .lb-preview-box {
        position: sticky;
        bottom: 0;
        z-index: 1;
        padding: calc(var(--dn-space) * 1) calc(var(--dn-space) * 1.5);
        border-radius: var(--dn-radius);
        /* Light green — kept in dark mode too so text is always readable */
        background: #f0fdf4;
        border: 1px solid #86efac;
        box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.12);
        display: flex;
        flex-direction: column;
        gap: calc(var(--dn-space) * 0.25);
    }

    /* Dark mode: keep the box light so dark text stays readable */
    .dark .lb-preview-box {
        background: #f0fdf4;
        border-color: #86efac;
        box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.35);
    }

    .lb-preview-label {
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: #166534;
    }

    /* Keep label text dark always — readable on the always-light green bg */
    .dark .lb-preview-label {
        color: #166534;
    }

    .lb-preview-text {
        font-size: 0.9375rem;
        /* Always dark — must be readable on the light-green background */
        color: #14532d;
        line-height: 1.5;
    }

    /* ── Options ── */

    .lb-options {
        display: flex;
        flex-direction: column;
        gap: calc(var(--dn-space) * 1);
    }

    .lb-noun-row {
        display: flex;
        flex-direction: column;
    }

    .lb-noun-input {
        padding: calc(var(--dn-space) * 0.6) calc(var(--dn-space) * 1);
        border: 1px solid var(--dn-border);
        border-radius: var(--dn-radius);
        background: var(--dn-surface);
        color: var(--dn-text);
        font-size: 0.875rem;
        font-family: var(--dn-font);
        width: 200px;
        box-sizing: border-box;
    }

    .lb-checkbox-label {
        display: flex;
        align-items: center;
        gap: calc(var(--dn-space) * 0.75);
        font-size: 0.875rem;
        color: var(--dn-text);
        cursor: pointer;
    }

    .lb-checkbox-label input[type="checkbox"] {
        flex-shrink: 0;
    }

    .lb-checkbox-example {
        color: var(--dn-text-muted);
        font-size: 0.8125rem;
    }
</style>
