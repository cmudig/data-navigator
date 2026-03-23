<script lang="ts">
    import { untrack } from 'svelte';
    import type { LabelTemplate } from '../../../store/appState';
    import {
        calcCount, calcSubcount, calcMin, calcMax, calcSum, calcAvg,
        calcTrend, calcR2, normalizeTemplate, stripNaturalLanguage, formatNum,
    } from './aggregateUtils';

    interface ParentDimension {
        key: string;
        label: string;        // e.g. "Use Age division name" or "Use Category name"
        isReduced: boolean;   // true = no sub-divisions (show dim name, not division name)
        exampleLabel: string; // e.g. "170–180" or "Electronics"
    }

    interface SuggestedField {
        key: string;
        rank?: '1st' | '2nd' | '3rd';
    }

    interface Props {
        fields: string[];
        nodeType: 'level0' | 'level1' | 'level2' | 'level3';
        value: LabelTemplate;
        sampleData: Record<string, unknown>;
        onchange: (v: LabelTemplate) => void;
        dimensionName?: string;          // division builders: the parent dim key
        parentDimensions?: ParentDimension[]; // leaf builders: per-dim parent name checkboxes
        suggestedFields?: SuggestedField[];   // fields to highlight with ★ badges
        // aggregate extras (level1 and level2 only)
        aggregateFields?: string[];      // numerical fields available for agg selection
        trendXFields?: string[];         // all fields eligible as trend X variable (cat + num)
        suggestedAggField?: string;      // pre-highlighted field for min/max (divisions)
        dimensionCount?: number;         // how many dimensions selected (for position checkbox)
        hasDivisions?: boolean;          // level1 only: whether this dim has sub-divisions
        rawData?: Record<string, unknown>[];  // full dataset for real aggregate previews
        dimensionKey?: string;           // level1 only: the dimension's field key (for subcount)
    }

    let {
        fields,
        nodeType,
        value,
        sampleData,
        onchange,
        dimensionName = undefined,
        parentDimensions = [],
        suggestedFields = [],
        aggregateFields = [],
        trendXFields = undefined,
        suggestedAggField = undefined,
        dimensionCount = 1,
        hasDivisions = false,
        rawData = [],
        dimensionKey = undefined,
    }: Props = $props();

    const effectiveTrendXFields = $derived(trendXFields ?? aggregateFields);


    // ── Live preview ─────────────────────────────────────────────────────────
    const preview = $derived(buildPreview(value, sampleData));

    function buildPreview(tmpl: LabelTemplate, data: Record<string, unknown>): string {
        let resolved = tmpl.template;

        // Aggregate tokens (resolve before key/value tokens) — use real data when available
        resolved = resolved.replace(/\{subcount\}/g, () =>
            (rawData.length > 0 && dimensionKey)
                ? String(calcSubcount(rawData, dimensionKey))
                : '[subcount]'
        );
        resolved = resolved.replace(/\{count\}/g, () =>
            rawData.length > 0 ? String(calcCount(rawData)) : '[count]'
        );
        resolved = resolved.replace(/\{min:"([^"]+)"\}/g, (_: string, f: string) =>
            rawData.length > 0 ? formatNum(calcMin(rawData, f)) : `[min ${f}]`
        );
        resolved = resolved.replace(/\{max:"([^"]+)"\}/g, (_: string, f: string) =>
            rawData.length > 0 ? formatNum(calcMax(rawData, f)) : `[max ${f}]`
        );
        resolved = resolved.replace(/\{sum:"([^"]+)"\}/g, (_: string, f: string) =>
            rawData.length > 0 ? formatNum(calcSum(rawData, f)) : `[sum ${f}]`
        );
        resolved = resolved.replace(/\{avg:"([^"]+)"\}/g, (_: string, f: string) =>
            rawData.length > 0 ? formatNum(calcAvg(rawData, f)) : `[avg ${f}]`
        );
        resolved = resolved.replace(/\{trend:"([^"]+)":"([^"]+)"\}/g, (_: string, x: string, y: string) =>
            rawData.length > 0 ? calcTrend(rawData, x, y) : 'slightly increasing'
        );
        resolved = resolved.replace(/\{r2:"([^"]+)":"([^"]+)"\}/g, (_: string, x: string, y: string) =>
            rawData.length > 0 ? formatNum(calcR2(rawData, x, y)) : '0.82'
        );

        if (tmpl.omitKeyNames) {
            // Strip "{key:"..."}:" patterns (with following colon + optional space),
            // then strip any remaining bare {key:"..."} tokens.
            resolved = resolved.replace(/\{key:"[^"]+"\}:\s*/g, '');
            resolved = resolved.replace(/\{key:"[^"]+"\}/g, '');
        } else {
            resolved = resolved.replace(/\{key:"([^"]+)"\}/g, (_: string, key: string) => key);
        }

        resolved = resolved.replace(/\{value:"([^"]+)"\}/g, (_: string, key: string) => {
            const val = data[key];
            return val !== undefined ? String(val) : `[${key}]`;
        });

        // Division builders: prepend dimension name when checked
        if (tmpl.includeDimensionName && dimensionName) {
            resolved = resolved ? `${dimensionName}: ${resolved}` : dimensionName;
        }

        const name = tmpl.name || (nodeType === 'level1' ? 'group' : nodeType === 'level2' ? 'subgroup' : 'data point');
        const cap = name.charAt(0).toUpperCase() + name.slice(1);
        let suffix = cap;
        if (tmpl.includeIndex) {
            suffix += nodeType === 'level1' ? ` 1 of ${dimensionCount ?? 2}` : ` 3 of 8`;
        }

        // Leaf builders: per-dimension parent names
        if (tmpl.includeParentNames && tmpl.includeParentNames.length > 0) {
            const clauses = tmpl.includeParentNames
                .map(k => parentDimensions.find(p => p.key === k)?.exampleLabel ?? '(example)')
                .join(' / ');
            suffix += ` in ${clauses}`;
        } else if (tmpl.includeParentName) {
            // Backward compat for non-leaf builders (dim/div labels)
            suffix += ` in Example Group`;
        }

        suffix += '.';

        return resolved ? `${resolved} ${suffix}` : suffix;
    }

    // ── Node type labels ─────────────────────────────────────────────────────
    const NODE_TYPE_LABELS: Record<string, string> = {
        level0: 'entry point (root)',
        level1: 'dimension header',
        level2: 'division header',
        level3: 'individual data point',
    };

    // ── Selected fields (derived from template) ───────────────────────────────
    const selectedFields = $derived(
        new Set([...value.template.matchAll(/\{value:"([^"]+)"\}/g)].map(m => m[1]))
    );

    // ── Mutations ────────────────────────────────────────────────────────────

    function removeField(fieldName: string): string {
        let t = value.template;
        // Try exact token removal first (both forms)
        const withKey = ` {key:"${fieldName}"}: {value:"${fieldName}"}, `;
        const valueOnly = ` {value:"${fieldName}"}, `;
        if (t.includes(withKey)) return t.replace(withKey, '');
        if (t.includes(valueOnly)) return t.replace(valueOnly, '');
        // Fallback: strip any remaining {key:"field"} and {value:"field"} tokens
        t = t.replace(new RegExp(`\\{key:"${fieldName}"\\}:\\s*`, 'g'), '');
        t = t.replace(new RegExp(`\\{value:"${fieldName}"\\}`, 'g'), '');
        return t;
    }

    // Click a field pill: toggles the field in/out of the template.
    function toggleField(fieldName: string) {
        if (selectedFields.has(fieldName)) {
            onchange({ ...value, template: removeField(fieldName) });
        } else {
            const token = value.omitKeyNames
                ? ` {value:"${fieldName}"}, `
                : ` {key:"${fieldName}"}: {value:"${fieldName}"}, `;
            onchange({ ...value, template: value.template + token });
        }
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

    function handleOmitKeyNames(e: Event) {
        const checked = (e.target as HTMLInputElement).checked;
        if (nodeType === 'level1' && checked) {
            // Strip natural language wrappers from existing template
            onchange({ ...value, omitKeyNames: checked, template: stripNaturalLanguage(value.template) });
        } else {
            onchange({ ...value, omitKeyNames: checked });
        }
    }

    // ── Aggregate state (level1 and level2 only) ──────────────────────────────

    const showAggregates = $derived(nodeType === 'level1' || nodeType === 'level2');

    // Count
    const countInTemplate = $derived(value.template.includes('{count}'));

    // Min/Max (combined — one field picker for both)
    const minMaxFieldFromTemplate = $derived(value.template.match(/\{min:"([^"]+)"\}/)?.[1] ?? null);
    const hasMinMax = $derived(
        value.template.includes('{min:') || value.template.includes('{max:')
    );
    let minMaxField = $state<string>('');
    $effect(() => {
        const fromTmpl = minMaxFieldFromTemplate;
        const fields = aggregateFields;
        const suggested = suggestedAggField;
        const cur = untrack(() => minMaxField);
        if (fromTmpl !== null && fields.includes(fromTmpl)) {
            minMaxField = fromTmpl;
        } else if (!cur || !fields.includes(cur)) {
            minMaxField = (suggested && fields.includes(suggested)) ? suggested : (fields[0] ?? '');
        }
    });

    // Sum
    const sumFieldFromTemplate = $derived(value.template.match(/\{sum:"([^"]+)"\}/)?.[1] ?? null);
    const hasSumInTemplate = $derived(sumFieldFromTemplate !== null);
    let sumField = $state<string>('');
    $effect(() => {
        const fromTmpl = sumFieldFromTemplate;
        const fields = aggregateFields;
        const cur = untrack(() => sumField);
        if (fromTmpl !== null && fields.includes(fromTmpl)) {
            sumField = fromTmpl;
        } else if (!cur || !fields.includes(cur)) {
            sumField = fields[0] ?? '';
        }
    });

    // Average
    const avgFieldFromTemplate = $derived(value.template.match(/\{avg:"([^"]+)"\}/)?.[1] ?? null);
    const hasAvgInTemplate = $derived(avgFieldFromTemplate !== null);
    let avgField = $state<string>('');
    $effect(() => {
        const fromTmpl = avgFieldFromTemplate;
        const fields = aggregateFields;
        const cur = untrack(() => avgField);
        if (fromTmpl !== null && fields.includes(fromTmpl)) {
            avgField = fromTmpl;
        } else if (!cur || !fields.includes(cur)) {
            avgField = fields[0] ?? '';
        }
    });

    // Trend + R² (shared field pickers)
    const trendMatchResult = $derived(value.template.match(/\{trend:"([^"]+)":"([^"]+)"\}/));
    const r2MatchResult = $derived(value.template.match(/\{r2:"([^"]+)":"([^"]+)"\}/));
    const hasTrendInTemplate = $derived(trendMatchResult !== null);
    const hasR2InTemplate = $derived(r2MatchResult !== null);
    let trendXField = $state<string>('');
    let trendYField = $state<string>('');
    $effect(() => {
        const tm = trendMatchResult;
        const rm = r2MatchResult;
        const xFields = effectiveTrendXFields;
        const yFields = aggregateFields;
        const tx = tm?.[1] ?? rm?.[1];
        const ty = tm?.[2] ?? rm?.[2];
        const curX = untrack(() => trendXField);
        const curY = untrack(() => trendYField);
        if (tx && xFields.includes(tx)) {
            trendXField = tx;
        } else if (!curX || !xFields.includes(curX)) {
            trendXField = xFields[0] ?? '';
        }
        if (ty && yFields.includes(ty)) {
            trendYField = ty;
        } else if (!curY || !yFields.includes(curY)) {
            trendYField = yFields.length > 1 ? yFields[1] : (yFields[0] ?? '');
        }
    });

    // ── Aggregate toggle functions ────────────────────────────────────────────

    function toggleCount() {
        if (countInTemplate) {
            let t = value.template;
            // Remove full natural language phrases first
            t = t.replace(/ contains \{subcount\} subgroups and \{count\} total child data points/g, '');
            t = t.replace(/ contains \{count\} total child data points/g, '');
            // Fallback: remove bare tokens
            t = t.replace(/ \{subcount\},?\s*/g, ' ').replace(/\{subcount\}/g, '');
            t = t.replace(/ \{count\},?\s*/g, ' ').replace(/\{count\}/g, '');
            onchange({ ...value, template: normalizeTemplate(t) });
        } else if (nodeType === 'level1' && !value.omitKeyNames) {
            const phrase = hasDivisions
                ? ' contains {subcount} subgroups and {count} total child data points'
                : ' contains {count} total child data points';
            onchange({ ...value, template: normalizeTemplate(value.template + phrase) });
        } else {
            onchange({ ...value, template: normalizeTemplate(value.template + ' {count}') });
        }
    }

    function toggleMinMax() {
        if (hasMinMax) {
            let t = value.template;
            // Remove natural language phrase first
            t = t.replace(/, ranging from \{min:"[^"]+"\} to \{max:"[^"]+"\}/g, '');
            // Fallback: remove bare tokens
            t = t.replace(/\{min:"[^"]+"\}/g, '').replace(/\{max:"[^"]+"\}/g, '');
            onchange({ ...value, template: normalizeTemplate(t) });
        } else if (minMaxField) {
            const phrase = (nodeType === 'level1' && !value.omitKeyNames)
                ? `, ranging from {min:"${minMaxField}"} to {max:"${minMaxField}"}`
                : ` {min:"${minMaxField}"}, {max:"${minMaxField}"}`;
            onchange({ ...value, template: normalizeTemplate(value.template + phrase) });
        }
    }

    function toggleSum() {
        if (hasSumInTemplate) {
            let t = value.template;
            t = t.replace(/, total: \{sum:"[^"]+"\}/g, '');
            t = t.replace(/\{sum:"[^"]+"\}/g, '');
            onchange({ ...value, template: normalizeTemplate(t) });
        } else if (sumField) {
            const phrase = (nodeType === 'level1' && !value.omitKeyNames)
                ? `, total: {sum:"${sumField}"}`
                : ` {sum:"${sumField}"}`;
            onchange({ ...value, template: normalizeTemplate(value.template + phrase) });
        }
    }

    function toggleAvg() {
        if (hasAvgInTemplate) {
            let t = value.template;
            t = t.replace(/, average: \{avg:"[^"]+"\}/g, '');
            t = t.replace(/\{avg:"[^"]+"\}/g, '');
            onchange({ ...value, template: normalizeTemplate(t) });
        } else if (avgField) {
            const phrase = (nodeType === 'level1' && !value.omitKeyNames)
                ? `, average: {avg:"${avgField}"}`
                : ` {avg:"${avgField}"}`;
            onchange({ ...value, template: normalizeTemplate(value.template + phrase) });
        }
    }

    function toggleTrend() {
        if (hasTrendInTemplate) {
            let t = value.template;
            t = t.replace(/, trend: \{trend:"[^"]+":"[^"]+"\}/g, '');
            t = t.replace(/\{trend:"[^"]+":"[^"]+"\}/g, '');
            onchange({ ...value, template: normalizeTemplate(t) });
        } else if (trendXField && trendYField) {
            const phrase = (nodeType === 'level1' && !value.omitKeyNames)
                ? `, trend: {trend:"${trendXField}":"${trendYField}"}`
                : ` {trend:"${trendXField}":"${trendYField}"}`;
            onchange({ ...value, template: normalizeTemplate(value.template + phrase) });
        }
    }

    function toggleR2() {
        if (hasR2InTemplate) {
            let t = value.template;
            t = t.replace(/, R²: \{r2:"[^"]+":"[^"]+"\}/g, '');
            t = t.replace(/\{r2:"[^"]+":"[^"]+"\}/g, '');
            onchange({ ...value, template: normalizeTemplate(t) });
        } else if (trendXField && trendYField) {
            const phrase = (nodeType === 'level1' && !value.omitKeyNames)
                ? `, R²: {r2:"${trendXField}":"${trendYField}"}`
                : ` {r2:"${trendXField}":"${trendYField}"}`;
            onchange({ ...value, template: normalizeTemplate(value.template + phrase) });
        }
    }
</script>

<div class="label-builder">
    <p class="lb-context">
        Building label for: <strong>{NODE_TYPE_LABELS[nodeType] ?? nodeType}</strong>
    </p>
    <p class="lb-instruction">
        Click a field pill to add it to your label.
        {#if value.omitKeyNames}
            Each click adds the field's value only (e.g., <code>42</code>).
        {:else}
            Each click adds the field name and value together (e.g., <code>Score: 42</code>).
        {/if}
        You can also type directly in the template box below.
    </p>

    {#if fields.length > 0}
        <div class="lb-pills-area" aria-label="Available fields — click to add to label">
            {#each fields as field (field)}
                {@const selected = selectedFields.has(field)}
                {@const suggestion = suggestedFields.find(s => s.key === field)}
                <button
                    class="lb-pill"
                    class:lb-pill-selected={selected}
                    onclick={() => toggleField(field)}
                    aria-pressed={selected}
                    aria-label={selected
                        ? `Remove "${field}" from label`
                        : value.omitKeyNames
                            ? `Add value of "${field}" to label`
                            : `Add "${field}" name and value to label`}
                >
                    {#if selected}<span class="lb-pill-check" aria-hidden="true">✓</span>{/if}{field}{#if suggestion}<span class="lb-pill-suggested" aria-label={suggestion.rank ? `Suggested: ${suggestion.rank}` : 'Suggested'}>★{suggestion.rank ? ` ${suggestion.rank}` : ''}</span>{/if}
                </button>
            {/each}
        </div>
    {/if}

    {#if showAggregates}
        <div class="lb-agg-section">
            <p class="lb-agg-heading">Aggregate summaries from children</p>

            <!-- Count of children (no field selector needed) -->
            <div class="lb-agg-row">
                <button
                    class="lb-agg-pill"
                    class:lb-agg-pill-active={countInTemplate}
                    onclick={toggleCount}
                    aria-pressed={countInTemplate}
                    aria-label={countInTemplate ? 'Remove count of children from label' : 'Add count of children to label'}
                >
                    <span class="lb-agg-pill-icon" aria-hidden="true">{countInTemplate ? '✓' : '+'}</span>
                    Count of children
                </button>
            </div>

            {#if aggregateFields.length > 0}
                <!-- Min and Max (combined) -->
                <div class="lb-agg-row">
                    <button
                        class="lb-agg-pill"
                        class:lb-agg-pill-active={hasMinMax}
                        onclick={toggleMinMax}
                        aria-pressed={hasMinMax}
                        aria-label={hasMinMax ? 'Remove min and max from label' : `Add min and max of ${minMaxField} to label`}
                    >
                        <span class="lb-agg-pill-icon" aria-hidden="true">{hasMinMax ? '✓' : '+'}</span>
                        Min and Max of
                    </button>
                    <label class="lb-agg-field-label">
                        <span class="visually-hidden">Field for min and max</span>
                        <select
                            class="lb-agg-select"
                            bind:value={minMaxField}
                        >
                            {#each aggregateFields as f (f)}
                                <option value={f}>{f}{suggestedAggField === f ? ' ★' : ''}</option>
                            {/each}
                        </select>
                    </label>
                </div>

                <!-- Sum -->
                <div class="lb-agg-row">
                    <button
                        class="lb-agg-pill"
                        class:lb-agg-pill-active={hasSumInTemplate}
                        onclick={toggleSum}
                        aria-pressed={hasSumInTemplate}
                        aria-label={hasSumInTemplate ? 'Remove sum from label' : `Add sum of ${sumField} to label`}
                    >
                        <span class="lb-agg-pill-icon" aria-hidden="true">{hasSumInTemplate ? '✓' : '+'}</span>
                        Sum of
                    </button>
                    <label class="lb-agg-field-label">
                        <span class="visually-hidden">Field for sum</span>
                        <select
                            class="lb-agg-select"
                            bind:value={sumField}
                        >
                            {#each aggregateFields as f (f)}
                                <option value={f}>{f}</option>
                            {/each}
                        </select>
                    </label>
                </div>

                <!-- Average -->
                <div class="lb-agg-row">
                    <button
                        class="lb-agg-pill"
                        class:lb-agg-pill-active={hasAvgInTemplate}
                        onclick={toggleAvg}
                        aria-pressed={hasAvgInTemplate}
                        aria-label={hasAvgInTemplate ? 'Remove average from label' : `Add average of ${avgField} to label`}
                    >
                        <span class="lb-agg-pill-icon" aria-hidden="true">{hasAvgInTemplate ? '✓' : '+'}</span>
                        Average of
                    </button>
                    <label class="lb-agg-field-label">
                        <span class="visually-hidden">Field for average</span>
                        <select
                            class="lb-agg-select"
                            bind:value={avgField}
                        >
                            {#each aggregateFields as f (f)}
                                <option value={f}>{f}</option>
                            {/each}
                        </select>
                    </label>
                </div>

                <!-- Trend direction + R² (shared field pickers) -->
                <div class="lb-agg-trend">
                    <p class="lb-agg-trend-label">Trend direction and R²</p>
                    <div class="lb-agg-trend-fields">
                        <label class="lb-agg-trend-field">
                            <span class="lb-agg-trend-field-name">X variable</span>
                            <select class="lb-agg-select" bind:value={trendXField}>
                                {#each effectiveTrendXFields as f (f)}
                                    <option value={f}>{f}</option>
                                {/each}
                            </select>
                        </label>
                        <label class="lb-agg-trend-field">
                            <span class="lb-agg-trend-field-name">Y variable</span>
                            <select class="lb-agg-select" bind:value={trendYField}>
                                {#each aggregateFields as f (f)}
                                    <option value={f}>{f}</option>
                                {/each}
                            </select>
                        </label>
                    </div>
                    <div class="lb-agg-trend-toggles">
                        <button
                            class="lb-agg-pill"
                            class:lb-agg-pill-active={hasTrendInTemplate}
                            onclick={toggleTrend}
                            aria-pressed={hasTrendInTemplate}
                            aria-label={hasTrendInTemplate ? 'Remove trend direction from label' : 'Add trend direction to label'}
                        >
                            <span class="lb-agg-pill-icon" aria-hidden="true">{hasTrendInTemplate ? '✓' : '+'}</span>
                            Trend direction
                        </button>
                        <button
                            class="lb-agg-pill"
                            class:lb-agg-pill-active={hasR2InTemplate}
                            onclick={toggleR2}
                            aria-pressed={hasR2InTemplate}
                            aria-label={hasR2InTemplate ? 'Remove R² from label' : 'Add R² to label'}
                        >
                            <span class="lb-agg-pill-icon" aria-hidden="true">{hasR2InTemplate ? '✓' : '+'}</span>
                            R² value
                        </button>
                    </div>
                </div>
            {/if}
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
                placeholder={nodeType === 'level1' ? 'group' : nodeType === 'level2' ? 'range' : 'data point'}
            />
        </div>

        {#if nodeType === 'level1' && dimensionCount > 1}
            <!-- Dimension builders: show "position among dimensions" only when multiple dims selected -->
            <label class="lb-checkbox-label">
                <input
                    type="checkbox"
                    checked={value.includeIndex}
                    onchange={handleIncludeIndex}
                />
                Include position among dimensions?
                <span class="lb-checkbox-example">(e.g., dimension 1 of {dimensionCount})</span>
            </label>
        {:else if nodeType !== 'level1'}
            <!-- All other builders (level0, level2, level3): standard "position in group" -->
            <label class="lb-checkbox-label">
                <input
                    type="checkbox"
                    checked={value.includeIndex}
                    onchange={handleIncludeIndex}
                />
                Include position in group?
                <span class="lb-checkbox-example">(e.g., item 3 of 8)</span>
            </label>
        {/if}

        {#if dimensionName}
            <!-- Division builders: prepend the dimension's name to this sub-group label -->
            <label class="lb-checkbox-label">
                <input
                    type="checkbox"
                    checked={value.includeDimensionName ?? false}
                    onchange={(e) => onchange({ ...value, includeDimensionName: (e.target as HTMLInputElement).checked })}
                />
                Include dimension name
                <span class="lb-checkbox-example">(e.g., {dimensionName}: {String(sampleData['range'] ?? '10–20')})</span>
            </label>
        {:else if parentDimensions.length > 0}
            <!-- Leaf builders: one checkbox per dimension, using real examples -->
            {#each parentDimensions as pd (pd.key)}
                <label class="lb-checkbox-label">
                    <input
                        type="checkbox"
                        checked={(value.includeParentNames ?? []).includes(pd.key)}
                        onchange={(e) => {
                            const cur = value.includeParentNames ?? [];
                            const next = (e.target as HTMLInputElement).checked
                                ? [...cur, pd.key]
                                : cur.filter(k => k !== pd.key);
                            onchange({ ...value, includeParentNames: next });
                        }}
                    />
                    {pd.label}
                    <span class="lb-checkbox-example">(e.g., in {pd.exampleLabel})</span>
                </label>
            {/each}
        {:else if nodeType === 'level0'}
            <!-- Level 0 only: include parent name (root has no parent so this is a fallback for custom use) -->
            <label class="lb-checkbox-label">
                <input
                    type="checkbox"
                    checked={value.includeParentName}
                    onchange={handleIncludeParentName}
                />
                Include the name of the group?
                <span class="lb-checkbox-example">(e.g., in North region)</span>
            </label>
        {/if}

        {#if nodeType === 'level1'}
            <label class="lb-checkbox-label lb-omit-toggle">
                <input
                    type="checkbox"
                    checked={value.omitKeyNames}
                    onchange={handleOmitKeyNames}
                />
                Hide natural language
                <span class="lb-checkbox-example">(strip descriptive phrases, keep only tokens)</span>
            </label>
        {:else}
            <label class="lb-checkbox-label lb-omit-toggle">
                <input
                    type="checkbox"
                    checked={value.omitKeyNames}
                    onchange={handleOmitKeyNames}
                />
                Hide field names
                <span class="lb-checkbox-example">(show values only — e.g., "42" instead of "Score: 42")</span>
            </label>
        {/if}
    </div>

    <!-- Preview is last so it can stick to the bottom of the scroll container -->
    <div class="lb-preview-box" aria-live="polite">
        <span class="lb-preview-label">label preview:</span>
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

    /* ── Field pills (one per field, inserts name+value or value-only) ── */

    .lb-pills-area {
        display: flex;
        flex-wrap: wrap;
        gap: calc(var(--dn-space) * 0.5);
    }

    .lb-pill {
        display: inline-flex;
        align-items: center;
        padding: 4px 14px;
        border-radius: 20px;
        font-size: 0.8125rem;
        font-family: var(--dn-font-mono);
        cursor: pointer;
        background: var(--dn-accent-soft);
        color: var(--dn-accent);
        border: 1px solid var(--dn-accent-light);
        min-height: 0;
        min-width: 0;
        transition: background 0.1s, border-color 0.1s, color 0.1s;
    }

    .lb-pill:hover {
        background: var(--dn-accent);
        color: #fff;
        border-color: var(--dn-accent);
    }

    .lb-pill-selected {
        background: var(--dn-accent);
        color: #fff;
        border-color: var(--dn-accent);
    }

    .lb-pill-selected:hover {
        background: var(--dn-accent-dark, color-mix(in srgb, var(--dn-accent) 80%, #000));
        border-color: var(--dn-accent-dark, color-mix(in srgb, var(--dn-accent) 80%, #000));
    }

    .lb-pill-check {
        margin-right: 5px;
        font-size: 0.75rem;
    }

    .lb-pill-suggested {
        margin-left: 5px;
        font-size: 0.7rem;
        font-family: var(--dn-font);
        opacity: 0.85;
    }

    .lb-pill-selected .lb-pill-suggested {
        opacity: 0.9;
    }

    /* ── Aggregate section ── */

    .lb-agg-section {
        display: flex;
        flex-direction: column;
        gap: calc(var(--dn-space) * 0.625);
        padding: calc(var(--dn-space) * 1);
        border: 1px solid var(--dn-border);
        border-radius: var(--dn-radius);
        background: var(--dn-surface);
    }

    .lb-agg-heading {
        margin: 0 0 calc(var(--dn-space) * 0.25);
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--dn-text-muted);
    }

    .lb-agg-row {
        display: flex;
        align-items: center;
        gap: calc(var(--dn-space) * 0.5);
        flex-wrap: wrap;
    }

    .lb-agg-pill {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 0.8125rem;
        font-family: var(--dn-font);
        cursor: pointer;
        background: var(--dn-accent-soft);
        color: var(--dn-accent);
        border: 1px solid var(--dn-accent-light);
        min-height: 0;
        min-width: 0;
        transition: background 0.1s, border-color 0.1s, color 0.1s;
        white-space: nowrap;
    }

    .lb-agg-pill:hover {
        background: var(--dn-accent);
        color: #fff;
        border-color: var(--dn-accent);
    }

    .lb-agg-pill-active {
        background: var(--dn-accent);
        color: #fff;
        border-color: var(--dn-accent);
    }

    .lb-agg-pill-active:hover {
        background: var(--dn-accent-dark, color-mix(in srgb, var(--dn-accent) 80%, #000));
        border-color: var(--dn-accent-dark, color-mix(in srgb, var(--dn-accent) 80%, #000));
    }

    .lb-agg-pill-icon {
        font-size: 0.75rem;
        font-weight: 700;
    }

    .lb-agg-field-label {
        display: contents; /* keeps select inline */
    }

    .lb-agg-select {
        padding: 3px 6px;
        border: 1px solid var(--dn-border);
        border-radius: var(--dn-radius);
        background: var(--dn-surface);
        color: var(--dn-text);
        font-size: 0.8125rem;
        font-family: var(--dn-font-mono);
        cursor: pointer;
    }

    /* Trend + R² sub-section */

    .lb-agg-trend {
        display: flex;
        flex-direction: column;
        gap: calc(var(--dn-space) * 0.5);
        padding-top: calc(var(--dn-space) * 0.5);
        border-top: 1px solid var(--dn-border);
        margin-top: calc(var(--dn-space) * 0.25);
    }

    .lb-agg-trend-label {
        margin: 0;
        font-size: 0.8125rem;
        font-weight: 600;
        color: var(--dn-text);
    }

    .lb-agg-trend-fields {
        display: flex;
        gap: calc(var(--dn-space) * 1);
        flex-wrap: wrap;
    }

    .lb-agg-trend-field {
        display: flex;
        flex-direction: column;
        gap: 3px;
    }

    .lb-agg-trend-field-name {
        font-size: 0.75rem;
        color: var(--dn-text-muted);
        font-weight: 600;
    }

    .lb-agg-trend-toggles {
        display: flex;
        gap: calc(var(--dn-space) * 0.5);
        flex-wrap: wrap;
    }

    /* visually-hidden for screen reader labels on select elements */
    .visually-hidden {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
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
        padding: calc(var(--dn-space) * 0.625) calc(var(--dn-space) * 1.25);
        border-radius: var(--dn-radius);
        /* Light green — kept in dark mode too so text is always readable */
        background: #f0fdf4;
        border: 1px solid #86efac;
        box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.12);
        display: flex;
        flex-direction: row;
        align-items: baseline;
        gap: calc(var(--dn-space) * 0.75);
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

    /* "Hide field names" sits below a divider to signal it affects chip behavior */
    .lb-omit-toggle {
        padding-top: calc(var(--dn-space) * 0.75);
        border-top: 1px solid var(--dn-border);
        margin-top: calc(var(--dn-space) * 0.25);
    }

    /* Inline code style for the instruction examples */
    .lb-instruction code {
        font-family: var(--dn-font-mono);
        font-size: 0.8125rem;
        background: var(--dn-surface);
        border: 1px solid var(--dn-border);
        border-radius: 3px;
        padding: 1px 5px;
    }
</style>
