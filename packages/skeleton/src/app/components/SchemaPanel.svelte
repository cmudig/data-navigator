<script lang="ts">
    import { appState, type DimensionSchema, type SchemaState } from '../../store/appState';
    import { TreeGraph } from '@data-navigator/inspector';
    import { ForceGraph } from '@data-navigator/inspector';

    // ─── Nav slot defaults ────────────────────────────────────────────────────
    const NAV_SLOTS = [
        { forwardName: 'up', forwardKey: 'ArrowUp', backwardName: 'down', backwardKey: 'ArrowDown' },
        { forwardName: 'left', forwardKey: 'ArrowLeft', backwardName: 'right', backwardKey: 'ArrowRight' },
        { forwardName: 'forward', forwardKey: '[', backwardName: 'backward', backwardKey: ']' },
    ] as const;
    const DRILL_UP_KEYS = ['w', 'j', '\\'] as const;

    // ─── Store state mirrors ──────────────────────────────────────────────────
    let uploadedData: Record<string, unknown>[] | null = $state(null);
    let schema: SchemaState = $state({
        dimensions: [],
        childmostNavigation: 'within',
        allowMoreThan3: false,
        collapsed: false,
        graphMode: 'tree',
    });
    let initialized = $state(false);

    appState.subscribe(s => {
        uploadedData = s.uploadedData;
        schema = s.schemaState;
        // Auto-initialize schema whenever fresh data arrives (after no data or first load)
        if (s.uploadedData && !initialized) {
            initialized = true;
            const inferred = buildInitialSchema(s.uploadedData);
            appState.update(st => ({ ...st, schemaState: inferred }));
        }
        // Reset so next upload triggers re-initialization
        if (!s.uploadedData) initialized = false;
    });

    // ─── Schema inference ─────────────────────────────────────────────────────
    function inferType(values: unknown[]): 'numerical' | 'categorical' {
        const valid = values.filter(v => v !== null && v !== undefined && v !== '');
        if (valid.length === 0) return 'categorical';
        return valid.every(v => !isNaN(Number(v))) ? 'numerical' : 'categorical';
    }

    function buildInitialSchema(data: Record<string, unknown>[]): SchemaState {
        if (!data.length) return { ...schema };
        const keys = Object.keys(data[0]);
        const dims: DimensionSchema[] = keys.map(key => {
            const values = data.map(row => row[key]);
            const type = inferType(values);
            let compressSparseDivisions = false;
            if (type === 'categorical') {
                const unique = new Set(values.map(v => String(v)));
                compressSparseDivisions = unique.size === values.length;
            }
            return {
                key, type, included: false, navIndex: null,
                compressSparseDivisions,
                forwardName: '', forwardKey: '',
                backwardName: '', backwardKey: '',
                drillInName: 'drill in', drillInKey: 'Enter',
                drillUpName: 'drill up', drillUpKey: 'Backspace',
            };
        });

        // Select first 3 and assign nav slots
        const toSelect = dims.slice(0, 3);
        toSelect.forEach((dim, i) => {
            dim.included = true;
            dim.navIndex = i;
            Object.assign(dim, NAV_SLOTS[i]);
        });
        assignDrillRules(dims);

        // childmostNavigation default
        const catCount = toSelect.filter(d => d.type === 'categorical').length;
        const childmostNavigation: 'within' | 'across' = catCount >= 2 ? 'across' : 'within';

        return { dimensions: dims, childmostNavigation, allowMoreThan3: false, collapsed: false, graphMode: 'tree' };
    }

    function assignDrillRules(dims: DimensionSchema[]) {
        const selected = dims.filter(d => d.included).sort((a, b) => (a.navIndex ?? 99) - (b.navIndex ?? 99));
        selected.forEach(dim => {
            dim.drillInName = 'drill in';
            dim.drillInKey = 'Enter';
            if (selected.length <= 1) {
                dim.drillUpName = 'drill up';
                dim.drillUpKey = 'Backspace';
            } else {
                const idx = dim.navIndex ?? 0;
                dim.drillUpName = `drill up to ${dim.key}`;
                dim.drillUpKey = DRILL_UP_KEYS[idx] ?? 'Backspace';
            }
        });
    }

    // ─── Derived ──────────────────────────────────────────────────────────────
    const includedCount = $derived(schema.dimensions.filter(d => d.included).length);

    // ─── Mutations ────────────────────────────────────────────────────────────
    function toggleCollapse() {
        appState.update(s => ({
            ...s,
            schemaState: { ...s.schemaState, collapsed: !s.schemaState.collapsed }
        }));
    }

    function toggleDimension(key: string) {
        appState.update(s => {
            const dims = s.schemaState.dimensions.map(d => ({ ...d }));
            const dim = dims.find(d => d.key === key);
            if (!dim) return s;

            if (dim.included) {
                // Uncheck: release the nav slot
                const freed = dim.navIndex;
                dim.included = false;
                dim.navIndex = null;
                dim.forwardName = ''; dim.forwardKey = '';
                dim.backwardName = ''; dim.backwardKey = '';
                // Compact: shift remaining dims up if there's a gap
                if (freed !== null) {
                    dims.filter(d => d.included && d.navIndex !== null && d.navIndex > freed)
                        .forEach(d => { d.navIndex = d.navIndex! - 1; });
                }
            } else {
                // Check: assign next available slot
                const usedSlots = new Set(dims.filter(d => d.included).map(d => d.navIndex));
                let nextSlot = 0;
                while (usedSlots.has(nextSlot)) nextSlot++;
                if (!s.schemaState.allowMoreThan3 && nextSlot >= 3) return s; // shouldn't happen (button disabled)
                dim.included = true;
                dim.navIndex = nextSlot;
                if (nextSlot < NAV_SLOTS.length) {
                    Object.assign(dim, NAV_SLOTS[nextSlot]);
                }
            }

            assignDrillRules(dims);
            const catCount = dims.filter(d => d.included && d.type === 'categorical').length;
            const childmostNavigation: 'within' | 'across' = catCount >= 2 ? 'across' : 'within';

            return {
                ...s,
                schemaState: { ...s.schemaState, dimensions: dims, childmostNavigation }
            };
        });
    }

    function updateDim<K extends keyof DimensionSchema>(key: string, field: K, value: DimensionSchema[K]) {
        appState.update(s => ({
            ...s,
            schemaState: {
                ...s.schemaState,
                dimensions: s.schemaState.dimensions.map(d => d.key === key ? { ...d, [field]: value } : d)
            }
        }));
    }

    function setChildmostNavigation(val: 'within' | 'across') {
        appState.update(s => ({ ...s, schemaState: { ...s.schemaState, childmostNavigation: val } }));
    }

    function setAllowMore(val: boolean) {
        appState.update(s => ({ ...s, schemaState: { ...s.schemaState, allowMoreThan3: val } }));
    }

    function setGraphMode(val: 'tree' | 'force') {
        appState.update(s => ({ ...s, schemaState: { ...s.schemaState, graphMode: val } }));
    }

    // ─── Graph building ───────────────────────────────────────────────────────
    type GraphNode = { id: string; dimensionLevel?: number; derivedNode?: string; data?: Record<string, unknown> };
    type GraphLink = { source: string; target: string; navigationRules?: string[] };

    function buildGraphData(data: Record<string, unknown>[], dims: DimensionSchema[]) {
        const included = dims.filter(d => d.included).sort((a, b) => (a.navIndex ?? 99) - (b.navIndex ?? 99));
        const nodes: GraphNode[] = [];
        const links: GraphLink[] = [];

        if (included.length === 0) {
            // Show all dimension keys as flat nodes
            dims.forEach(d => nodes.push({ id: d.key }));
            return { nodes, links, dimensions: undefined };
        }

        const dimensionsParam: Record<string, { nodeId: string; divisions: Record<string, { values: Record<string, boolean> }>; navigationRules?: { sibling_sibling?: string[] } }> = {};

        included.forEach(dim => {
            nodes.push({ id: `dim_${dim.key}`, dimensionLevel: 1 });
            const rawVals = data.map(row => row[dim.key]);
            const uniqueVals = [...new Set(rawVals.map(v => String(v)))].slice(0, 10);

            const divisions: Record<string, { values: Record<string, boolean> }> = {};
            uniqueVals.forEach(val => {
                const divId = `div__${dim.key}__${val}`.replace(/[^a-zA-Z0-9_-]/g, '_');
                nodes.push({ id: divId, dimensionLevel: 2, derivedNode: `dim_${dim.key}` });
                links.push({ source: `dim_${dim.key}`, target: divId, navigationRules: ['child'] });
                divisions[divId] = { values: {} };
            });

            // Sibling links between adjacent divisions
            const divNodes = uniqueVals.map((val) => `div__${dim.key}__${val}`.replace(/[^a-zA-Z0-9_-]/g, '_'));
            for (let i = 0; i < divNodes.length - 1; i++) {
                links.push({ source: divNodes[i], target: divNodes[i + 1], navigationRules: [dim.forwardName || 'forward'] });
            }
            if (divNodes.length > 1) {
                links.push({ source: divNodes[divNodes.length - 1], target: divNodes[0], navigationRules: [dim.forwardName || 'forward'] });
            }

            dimensionsParam[`dim_${dim.key}`] = {
                nodeId: `dim_${dim.key}`,
                divisions,
                navigationRules: { sibling_sibling: [dim.forwardName || 'forward', dim.backwardName || 'backward'] }
            };
        });

        return { nodes, links, dimensions: dimensionsParam };
    }

    // ─── Graph mounting ───────────────────────────────────────────────────────
    let graphContainer: HTMLDivElement = $state()!;

    $effect(() => {
        if (!graphContainer || !uploadedData || schema.collapsed) return;
        const { nodes, links, dimensions } = buildGraphData(uploadedData, schema.dimensions);
        graphContainer.innerHTML = '';

        const w = graphContainer.clientWidth || 320;
        const h = 220;

        let svgEl: SVGSVGElement;
        if (schema.graphMode === 'tree') {
            svgEl = TreeGraph({ nodes, links }, {
                width: w, height: h,
                dimensions,
                nodeRadius: 5,
                nodeGroup: (d: GraphNode) => {
                    if (d.dimensionLevel === 1) return 'dimension';
                    if (d.dimensionLevel === 2) return 'division';
                    return 'leaf';
                },
                nodeGroups: ['dimension', 'division', 'leaf'],
                colors: ['#1e3369', '#6780c0', '#adbac7'],
                hide: false,
                description: `Tree layout of data structure with ${schema.dimensions.filter(d => d.included).length} dimension(s).`
            }) as unknown as SVGSVGElement;
        } else {
            svgEl = ForceGraph({ nodes, links }, {
                width: w, height: h,
                nodeRadius: 5,
                nodeGroup: (d: GraphNode) => {
                    if (d.dimensionLevel === 1) return 'dimension';
                    if (d.dimensionLevel === 2) return 'division';
                    return 'leaf';
                },
                nodeGroups: ['dimension', 'division', 'leaf'],
                colors: ['#1e3369', '#6780c0', '#adbac7'],
                nodeTitle: (d: GraphNode) => d.id,
                hide: false,
                description: `Force graph of data structure with ${schema.dimensions.filter(d => d.included).length} dimension(s).`
            }) as unknown as SVGSVGElement;
        }

        if (svgEl) graphContainer.appendChild(svgEl);
    });
</script>

<div class="schema-panel" class:collapsed={schema.collapsed} aria-label="Schema panel">
    <!-- Header -->
    <div class="schema-header">
        {#if !schema.collapsed}
            <span class="schema-title">Schema</span>
        {/if}
        <button
            class="collapse-btn btn-icon"
            type="button"
            onclick={toggleCollapse}
            aria-label={schema.collapsed ? 'Expand schema panel' : 'Collapse schema panel'}
            title={schema.collapsed ? 'Expand' : 'Collapse'}
        >
            {#if schema.collapsed}
                <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 4 10 8 6 12"/></svg>
            {:else}
                <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="10 4 6 8 10 12"/></svg>
            {/if}
        </button>
    </div>

    {#if !schema.collapsed}
        <!-- Top half: Graph visualization -->
        <div class="schema-graph-section">
            <div class="graph-toolbar" role="group" aria-label="Graph view mode">
                <label class="radio-label">
                    <input type="radio" name="graphMode" value="tree" checked={schema.graphMode === 'tree'}
                        onchange={() => setGraphMode('tree')} />
                    Tree
                </label>
                <label class="radio-label">
                    <input type="radio" name="graphMode" value="force" checked={schema.graphMode === 'force'}
                        onchange={() => setGraphMode('force')} />
                    Force
                </label>
            </div>
            <div class="graph-container" bind:this={graphContainer} aria-label="Data structure graph">
                {#if !uploadedData}
                    <p class="graph-empty">No data loaded.</p>
                {/if}
            </div>
        </div>

        <div class="schema-divider" role="separator" aria-hidden="true"></div>

        <!-- Bottom half: Schema builder -->
        <div class="schema-builder-section">
            <!-- Global settings -->
            <div class="schema-global">
                <label class="field-label" for="childmost-nav">
                    Childmost navigation
                    <select
                        id="childmost-nav"
                        value={schema.childmostNavigation}
                        onchange={(e) => setChildmostNavigation((e.target as HTMLSelectElement).value as 'within' | 'across')}
                    >
                        <option value="within">Within</option>
                        <option value="across">Across</option>
                    </select>
                </label>
            </div>

            <!-- Dimensions list -->
            {#if schema.dimensions.length === 0}
                <p class="schema-empty">Upload data to see dimensions.</p>
            {:else}
                <ul class="dimensions-list" aria-label="Dimensions">
                    {#each schema.dimensions as dim (dim.key)}
                        {@const canCheck = dim.included || schema.allowMoreThan3 || includedCount < 3}
                        <li class="dimension-item" class:included={dim.included}>
                            <div class="dimension-header">
                                <input
                                    type="checkbox"
                                    id="dim-check-{dim.key}"
                                    checked={dim.included}
                                    disabled={!canCheck}
                                    onchange={() => toggleDimension(dim.key)}
                                    aria-describedby="dim-label-{dim.key}"
                                />
                                <label id="dim-label-{dim.key}" for="dim-check-{dim.key}" class="dimension-label">
                                    {#if dim.navIndex !== null}
                                        <span class="nav-slot-badge" aria-label="Navigation slot {dim.navIndex + 1}">
                                            {dim.navIndex + 1}
                                        </span>
                                    {/if}
                                    <span class="dim-key">{dim.key}</span>
                                    <span class="dim-type-badge" class:numerical={dim.type === 'numerical'}>
                                        {dim.type === 'numerical' ? 'num' : 'cat'}
                                    </span>
                                </label>
                            </div>

                            {#if dim.included}
                                <details class="dim-options">
                                    <summary class="dim-options-summary">Options</summary>
                                    <div class="dim-options-body">

                                        {#if dim.type === 'categorical'}
                                            <label class="checkbox-field">
                                                <input
                                                    type="checkbox"
                                                    checked={dim.compressSparseDivisions}
                                                    onchange={(e) => updateDim(dim.key, 'compressSparseDivisions', (e.target as HTMLInputElement).checked)}
                                                />
                                                Compress sparse divisions
                                            </label>
                                        {/if}

                                        <fieldset class="nav-fieldset">
                                            <legend>Navigation</legend>
                                            <div class="nav-rule-row">
                                                <span class="nav-dir-label">Forward</span>
                                                <input
                                                    type="text"
                                                    class="nav-name-input"
                                                    value={dim.forwardName}
                                                    aria-label="Forward command name for {dim.key}"
                                                    oninput={(e) => updateDim(dim.key, 'forwardName', (e.target as HTMLInputElement).value)}
                                                />
                                                <input
                                                    type="text"
                                                    class="nav-key-input"
                                                    value={dim.forwardKey}
                                                    aria-label="Forward key for {dim.key}"
                                                    oninput={(e) => updateDim(dim.key, 'forwardKey', (e.target as HTMLInputElement).value)}
                                                />
                                            </div>
                                            <div class="nav-rule-row">
                                                <span class="nav-dir-label">Backward</span>
                                                <input
                                                    type="text"
                                                    class="nav-name-input"
                                                    value={dim.backwardName}
                                                    aria-label="Backward command name for {dim.key}"
                                                    oninput={(e) => updateDim(dim.key, 'backwardName', (e.target as HTMLInputElement).value)}
                                                />
                                                <input
                                                    type="text"
                                                    class="nav-key-input"
                                                    value={dim.backwardKey}
                                                    aria-label="Backward key for {dim.key}"
                                                    oninput={(e) => updateDim(dim.key, 'backwardKey', (e.target as HTMLInputElement).value)}
                                                />
                                            </div>
                                        </fieldset>

                                        <fieldset class="nav-fieldset">
                                            <legend>Drill</legend>
                                            <div class="nav-rule-row">
                                                <span class="nav-dir-label">In</span>
                                                <input
                                                    type="text"
                                                    class="nav-name-input"
                                                    value={dim.drillInName}
                                                    aria-label="Drill in command name for {dim.key}"
                                                    oninput={(e) => updateDim(dim.key, 'drillInName', (e.target as HTMLInputElement).value)}
                                                />
                                                <input
                                                    type="text"
                                                    class="nav-key-input"
                                                    value={dim.drillInKey}
                                                    aria-label="Drill in key for {dim.key}"
                                                    oninput={(e) => updateDim(dim.key, 'drillInKey', (e.target as HTMLInputElement).value)}
                                                />
                                            </div>
                                            <div class="nav-rule-row">
                                                <span class="nav-dir-label">Up</span>
                                                <input
                                                    type="text"
                                                    class="nav-name-input"
                                                    value={dim.drillUpName}
                                                    aria-label="Drill up command name for {dim.key}"
                                                    oninput={(e) => updateDim(dim.key, 'drillUpName', (e.target as HTMLInputElement).value)}
                                                />
                                                <input
                                                    type="text"
                                                    class="nav-key-input"
                                                    value={dim.drillUpKey}
                                                    aria-label="Drill up key for {dim.key}"
                                                    oninput={(e) => updateDim(dim.key, 'drillUpKey', (e.target as HTMLInputElement).value)}
                                                />
                                            </div>
                                        </fieldset>
                                    </div>
                                </details>
                            {/if}
                        </li>
                    {/each}
                </ul>

                <label class="checkbox-field allow-more">
                    <input
                        type="checkbox"
                        checked={schema.allowMoreThan3}
                        onchange={(e) => setAllowMore((e.target as HTMLInputElement).checked)}
                    />
                    Allow more than 3 dimensions (I know what I am doing)
                </label>
            {/if}
        </div>
    {/if}
</div>

<style>
    /* ── Panel shell ── */
    .schema-panel {
        display: flex;
        flex-direction: column;
        width: 360px;
        flex-shrink: 0;
        border-right: 1px solid var(--dn-border);
        background: var(--dn-surface);
        overflow: hidden;
        transition: width 0.2s ease;
        height: 100%;
    }

    .schema-panel.collapsed {
        width: 44px;
    }

    /* ── Header ── */
    .schema-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-shrink: 0;
        padding: calc(var(--dn-space) * 1.25) calc(var(--dn-space) * 1.5);
        border-bottom: 1px solid var(--dn-border);
        background: var(--dn-surface);
        gap: calc(var(--dn-space) * 1);
    }

    .collapsed .schema-header {
        justify-content: center;
        padding: calc(var(--dn-space) * 1.25) 0;
    }

    .schema-title {
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--dn-text);
        white-space: nowrap;
        overflow: hidden;
        flex: 1;
    }

    .collapse-btn {
        flex-shrink: 0;
        width: 28px;
        height: 28px;
        min-width: 28px;
        min-height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        background: transparent;
        border: 1px solid var(--dn-border);
        border-radius: calc(var(--dn-radius) / 2);
        color: var(--dn-text-muted);
        cursor: pointer;
        transition: background 0.15s, color 0.15s;
    }

    .collapse-btn:hover {
        background: var(--dn-accent-soft);
        color: var(--dn-text);
    }

    .collapse-btn svg {
        width: 14px;
        height: 14px;
    }

    /* ── Graph section ── */
    .schema-graph-section {
        flex: 0 0 auto;
        display: flex;
        flex-direction: column;
        border-bottom: 1px solid var(--dn-border);
    }

    .graph-toolbar {
        display: flex;
        gap: calc(var(--dn-space) * 2);
        padding: calc(var(--dn-space) * 1) calc(var(--dn-space) * 1.5);
        border-bottom: 1px solid var(--dn-border);
        flex-shrink: 0;
    }

    .radio-label {
        display: flex;
        align-items: center;
        gap: calc(var(--dn-space) * 0.5);
        font-size: 0.8125rem;
        color: var(--dn-text-muted);
        cursor: pointer;
        user-select: none;
    }

    .radio-label input {
        accent-color: var(--dn-accent);
        cursor: pointer;
    }

    .graph-container {
        height: 220px;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--dn-bg);
    }

    .graph-container :global(svg) {
        max-width: 100%;
        height: auto;
        display: block;
    }

    .graph-empty {
        margin: 0;
        font-size: 0.8125rem;
        color: var(--dn-text-muted);
    }

    /* ── Divider ── */
    .schema-divider {
        height: 0;
        border: none;
        margin: 0;
    }

    /* ── Builder section ── */
    .schema-builder-section {
        flex: 1;
        overflow-y: auto;
        padding: calc(var(--dn-space) * 1.5);
        display: flex;
        flex-direction: column;
        gap: calc(var(--dn-space) * 1.5);
        min-height: 0;
    }

    .schema-global {
        display: flex;
        flex-direction: column;
        gap: calc(var(--dn-space) * 1);
    }

    .field-label {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: calc(var(--dn-space) * 1);
        font-size: 0.8125rem;
        color: var(--dn-text-muted);
    }

    .field-label select {
        font-family: var(--dn-font);
        font-size: 0.8125rem;
        padding: calc(var(--dn-space) * 0.5) calc(var(--dn-space) * 1);
        border: 1px solid var(--dn-border);
        border-radius: calc(var(--dn-radius) / 2);
        background: var(--dn-bg);
        color: var(--dn-text);
        min-height: 32px;
    }

    .schema-empty {
        margin: 0;
        font-size: 0.8125rem;
        color: var(--dn-text-muted);
    }

    /* ── Dimensions list ── */
    .dimensions-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .dimension-item {
        border: 1px solid var(--dn-border);
        border-radius: calc(var(--dn-radius) / 2);
        background: var(--dn-bg);
        overflow: hidden;
    }

    .dimension-item.included {
        border-color: var(--dn-accent-light);
    }

    .dimension-header {
        display: flex;
        align-items: center;
        gap: calc(var(--dn-space) * 1);
        padding: calc(var(--dn-space) * 0.75) calc(var(--dn-space) * 1);
    }

    .dimension-header input[type="checkbox"] {
        flex-shrink: 0;
        accent-color: var(--dn-accent);
        width: 16px;
        height: 16px;
        cursor: pointer;
    }

    .dimension-header input[type="checkbox"]:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }

    .dimension-label {
        display: flex;
        align-items: center;
        gap: calc(var(--dn-space) * 0.5);
        font-size: 0.8125rem;
        cursor: pointer;
        flex: 1;
        min-width: 0;
    }

    .nav-slot-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: var(--dn-accent);
        color: #fff;
        font-size: 0.6875rem;
        font-weight: 700;
        flex-shrink: 0;
    }

    .dim-key {
        font-weight: 600;
        color: var(--dn-text);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        flex: 1;
    }

    .dim-type-badge {
        font-size: 0.625rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        padding: 1px 5px;
        border-radius: 3px;
        background: var(--dn-accent-soft);
        color: var(--dn-accent);
        flex-shrink: 0;
    }

    .dim-type-badge.numerical {
        background: rgba(103, 128, 192, 0.15);
        color: var(--dn-accent-mid);
    }

    /* ── Options disclosure ── */
    .dim-options {
        border-top: 1px solid var(--dn-border);
    }

    .dim-options-summary {
        padding: calc(var(--dn-space) * 0.5) calc(var(--dn-space) * 1);
        font-size: 0.75rem;
        color: var(--dn-text-muted);
        cursor: pointer;
        user-select: none;
        list-style: none;
        display: flex;
        align-items: center;
        gap: calc(var(--dn-space) * 0.5);
    }

    .dim-options-summary::-webkit-details-marker { display: none; }

    .dim-options-summary::before {
        content: '▶';
        font-size: 0.625rem;
        transition: transform 0.15s;
        display: inline-block;
    }

    details[open] .dim-options-summary::before {
        transform: rotate(90deg);
    }

    .dim-options-body {
        padding: calc(var(--dn-space) * 1);
        display: flex;
        flex-direction: column;
        gap: calc(var(--dn-space) * 1.25);
    }

    .checkbox-field {
        display: flex;
        align-items: center;
        gap: calc(var(--dn-space) * 0.75);
        font-size: 0.8125rem;
        color: var(--dn-text-muted);
        cursor: pointer;
    }

    .checkbox-field input {
        accent-color: var(--dn-accent);
        cursor: pointer;
        flex-shrink: 0;
    }

    /* ── Nav fieldsets ── */
    .nav-fieldset {
        border: 1px solid var(--dn-border);
        border-radius: calc(var(--dn-radius) / 2);
        padding: calc(var(--dn-space) * 0.75) calc(var(--dn-space) * 1);
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: calc(var(--dn-space) * 0.75);
    }

    .nav-fieldset legend {
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--dn-text-muted);
        padding: 0 calc(var(--dn-space) * 0.5);
    }

    .nav-rule-row {
        display: grid;
        grid-template-columns: 48px 1fr 72px;
        align-items: center;
        gap: calc(var(--dn-space) * 0.5);
    }

    .nav-dir-label {
        font-size: 0.75rem;
        color: var(--dn-text-muted);
        white-space: nowrap;
    }

    .nav-name-input,
    .nav-key-input {
        font-family: var(--dn-font);
        font-size: 0.75rem;
        padding: calc(var(--dn-space) * 0.5);
        border: 1px solid var(--dn-border);
        border-radius: calc(var(--dn-radius) / 2);
        background: var(--dn-bg);
        color: var(--dn-text);
        min-height: 28px;
        width: 100%;
    }

    .nav-key-input {
        font-family: var(--dn-font-mono);
        font-size: 0.7rem;
    }

    .nav-name-input:focus,
    .nav-key-input:focus {
        outline: 2px solid var(--dn-accent);
        outline-offset: 1px;
    }

    /* ── Allow-more checkbox ── */
    .allow-more {
        padding-top: calc(var(--dn-space) * 0.5);
        border-top: 1px solid var(--dn-border);
        font-size: 0.75rem;
    }
</style>
