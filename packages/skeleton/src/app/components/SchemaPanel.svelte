<script lang="ts">
    import dataNavigator from 'data-navigator';
    import { appState, type DimensionSchema, type DivisionEntry, type SchemaState } from '../../store/appState';
    import { TreeGraph } from '@data-navigator/inspector';
    import { ForceGraph } from '@data-navigator/inspector';

    // ─── Nav slot defaults ────────────────────────────────────────────────────
    const NAV_SLOTS = [
        { forwardName: 'up',      forwardKey: 'ArrowUp',    backwardName: 'down',     backwardKey: 'ArrowDown'  },
        { forwardName: 'left',    forwardKey: 'ArrowLeft',  backwardName: 'right',    backwardKey: 'ArrowRight' },
        { forwardName: 'forward', forwardKey: '[',          backwardName: 'backward', backwardKey: ']'          },
    ] as const;
    const DRILL_UP_KEYS = ['w', 'j', '\\'] as const;

    // ─── Store state mirrors ──────────────────────────────────────────────────
    let uploadedData: Record<string, unknown>[] | null = $state(null);
    let schema: SchemaState = $state({
        dimensions: [], childmostNavigation: 'within', allowMoreThan3: false,
        collapsed: false, graphMode: 'tree', hideLeafNodes: true,
        level0Enabled: false, level0Id: 'root',
        level1Extents: 'terminal',
        level1NavForwardName: 'left',  level1NavForwardKey: 'ArrowLeft',
        level1NavBackwardName: 'right', level1NavBackwardKey: 'ArrowRight',
    });
    let initialized = $state(false);

    appState.subscribe(s => {
        uploadedData = s.uploadedData;
        schema = s.schemaState;
        if (s.uploadedData && !initialized) {
            initialized = true;
            const inferred = buildInitialSchema(s.uploadedData);
            appState.update(st => ({ ...st, schemaState: inferred }));
        }
        if (!s.uploadedData) initialized = false;
    });

    // ─── ID helpers (mirrors data-navigator's createValidId) ─────────────────
    function makeValidId(s: string): string {
        return '_' + s.replace(/[^a-zA-Z0-9_-]+/g, '_');
    }
    function dimNodeId(key: string): string {
        return makeValidId('dim_' + key);
    }

    // ─── Schema inference (config only — divisions populated by DN) ───────────
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
            const sortMethod: 'ascending' | 'descending' | 'none' = type === 'numerical' ? 'ascending' : 'none';
            const subdivisions = 4;
            const extents: 'circular' | 'terminal' = type === 'categorical' ? 'circular' : 'terminal';
            // divisions start empty — populated by syncDivisionsFromDN after first DN call
            return {
                key, type, included: false, navIndex: null,
                extents, compressSparseDivisions, sortMethod, subdivisions, divisions: [],
                forwardName: '', forwardKey: '', backwardName: '', backwardKey: '',
                drillInName: 'drill in', drillInKey: 'Enter',
                drillUpName: 'drill up', drillUpKey: 'Backspace',
            };
        });

        const toSelect = dims.slice(0, 3);
        toSelect.forEach((dim, i) => {
            dim.included = true;
            dim.navIndex = i;
            Object.assign(dim, NAV_SLOTS[i]);
        });
        assignDrillRules(dims);

        const catCount = toSelect.filter(d => d.type === 'categorical').length;
        const childmostNavigation: 'within' | 'across' = catCount >= 2 ? 'across' : 'within';

        return {
            dimensions: dims, childmostNavigation, allowMoreThan3: false,
            collapsed: false, graphMode: 'tree', hideLeafNodes: false,
            level0Enabled: false, level0Id: 'root',
            level1Extents: 'terminal',
            level1NavForwardName: 'left',  level1NavForwardKey: 'ArrowLeft',
            level1NavBackwardName: 'right', level1NavBackwardKey: 'ArrowRight',
        };
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
        appState.update(s => ({ ...s, schemaState: { ...s.schemaState, collapsed: !s.schemaState.collapsed } }));
    }

    function toggleDimension(key: string) {
        appState.update(s => {
            const dims = s.schemaState.dimensions.map(d => ({ ...d, divisions: [...d.divisions] }));
            const dim = dims.find(d => d.key === key);
            if (!dim) return s;

            if (dim.included) {
                const freed = dim.navIndex;
                dim.included = false;
                dim.navIndex = null;
                dim.forwardName = ''; dim.forwardKey = '';
                dim.backwardName = ''; dim.backwardKey = '';
                if (freed !== null) {
                    dims.filter(d => d.included && d.navIndex !== null && d.navIndex > freed)
                        .forEach(d => { d.navIndex = d.navIndex! - 1; });
                }
            } else {
                const usedSlots = new Set(dims.filter(d => d.included).map(d => d.navIndex));
                let nextSlot = 0;
                while (usedSlots.has(nextSlot)) nextSlot++;
                if (!s.schemaState.allowMoreThan3 && nextSlot >= 3) return s;
                dim.included = true;
                dim.navIndex = nextSlot;
                if (nextSlot < NAV_SLOTS.length) Object.assign(dim, NAV_SLOTS[nextSlot]);
            }

            assignDrillRules(dims);
            const catCount = dims.filter(d => d.included && d.type === 'categorical').length;
            const childmostNavigation: 'within' | 'across' = catCount >= 2 ? 'across' : 'within';

            return { ...s, schemaState: { ...s.schemaState, dimensions: dims, childmostNavigation } };
        });
    }

    function updateDim<K extends keyof DimensionSchema>(key: string, field: K, value: DimensionSchema[K]) {
        appState.update(s => {
            const dims = s.schemaState.dimensions.map(d => {
                if (d.key !== key) return d;
                return { ...d, [field]: value };
            });
            return { ...s, schemaState: { ...s.schemaState, dimensions: dims } };
        });
    }

    function updateDivisionId(dimKey: string, divIndex: number, newId: string) {
        appState.update(s => ({
            ...s,
            schemaState: {
                ...s.schemaState,
                dimensions: s.schemaState.dimensions.map(d => {
                    if (d.key !== dimKey) return d;
                    const divisions = d.divisions.map((div, i) => i === divIndex ? { ...div, id: newId } : div);
                    return { ...d, divisions };
                })
            }
        }));
    }

    function setSchemaField<K extends keyof SchemaState>(field: K, value: SchemaState[K]) {
        appState.update(s => ({ ...s, schemaState: { ...s.schemaState, [field]: value } }));
    }

    // ─── DN structure building ────────────────────────────────────────────────
    function buildDNStructure(data: Record<string, unknown>[], s: SchemaState) {
        const included = s.dimensions.filter(d => d.included)
            .sort((a, b) => (a.navIndex ?? 99) - (b.navIndex ?? 99));
        if (included.length === 0) return null;

        // Stamp a copy of the data with stable row IDs so we don't mutate uploadedData
        const stampedData = data.map((d, i) => ({ ...d, '_dn_id': `row_${i}` }));

        const dimensionValues = included.map(dim => {
            // Build lookup: originalValue → user-edited ID (for passing custom IDs back to DN)
            const idLookup = new Map(dim.divisions.map(d => [d.originalValue, d.id]));

            const datum: Record<string, unknown> = {
                dimensionKey: dim.key,
                type: dim.type,
                // Explicit node ID so we can reference it in level1Options.order
                nodeId: dimNodeId(dim.key),
                behavior: {
                    extents: dim.extents,
                    childmostNavigation: s.childmostNavigation,
                },
                navigationRules: {
                    sibling_sibling: [dim.forwardName || 'forward', dim.backwardName || 'backward'],
                    parent_child: [dim.drillInName || 'drill in', dim.drillUpName || 'drill up'],
                },
                operations: {
                    compressSparseDivisions: dim.compressSparseDivisions,
                    // Numerical: pass subdivision count to DN for auto-binning
                    ...(dim.type === 'numerical' && dim.subdivisions > 1
                        ? { createNumericalSubdivisions: dim.subdivisions }
                        : {}),
                    // Categorical sort: sort DivisionObjects by their first row's category value
                    ...(dim.type === 'categorical' && dim.sortMethod !== 'none'
                        ? {
                            sortFunction: (a: any, b: any) => {
                                const aVal = String(Object.values(a.values || {})[0]?.[dim.key] ?? '');
                                const bVal = String(Object.values(b.values || {})[0]?.[dim.key] ?? '');
                                return dim.sortMethod === 'ascending'
                                    ? aVal.localeCompare(bVal)
                                    : bVal.localeCompare(aVal);
                            }
                        }
                        : {}),
                    // Numerical sort: sort data rows by the field value before binning
                    ...(dim.type === 'numerical' && dim.sortMethod === 'descending'
                        ? {
                            sortFunction: (a: any, b: any) =>
                                Number(b[dim.key] ?? 0) - Number(a[dim.key] ?? 0)
                        }
                        : {}),
                },
                // Pass user-edited division IDs back to DN via divisionNodeIds.
                // Falls back to a stable default ID when no user override exists.
                divisionOptions: {
                    divisionNodeIds: (_dimKey: string, value: unknown, _i: number) => {
                        const origVal = String(value);
                        return idLookup.get(origVal)
                            ?? makeValidId(dimNodeId(dim.key) + '_' + origVal);
                    }
                },
            };
            return datum;
        });

        const opts: Record<string, unknown> = {
            data: stampedData,
            idKey: '_dn_id',
            dimensions: {
                values: dimensionValues,
                parentOptions: {
                    // Optional level-0 root node
                    ...(s.level0Enabled ? { addLevel0: { id: s.level0Id || 'root', edges: [] } } : {}),
                    // Level-1 navigation: sibling order, extents, nav rules between dimension nodes
                    level1Options: {
                        order: included.map(d => dimNodeId(d.key)),
                        behavior: { extents: s.level1Extents },
                        navigationRules: {
                            sibling_sibling: [
                                s.level1NavForwardName || 'left',
                                s.level1NavBackwardName || 'right',
                            ],
                            parent_child: ['parent', 'child'],
                        },
                    },
                },
            },
        };

        try {
            return dataNavigator.structure(opts as any);
        } catch (e) {
            console.error('[SchemaPanel] dataNavigator.structure() failed:', e);
            return null;
        }
    }

    // ─── Division sync: read DN result → update schemaState.divisions ─────────
    // Keeps user-edited IDs when originalValue matches; only updates when changed.
    function r2(n: number) { return Math.round(n * 100) / 100; }

    function syncDivisionsFromDN(included: DimensionSchema[], dnResult: any) {
        const updates: { key: string; divisions: DivisionEntry[] }[] = [];

        included.forEach(dim => {
            const dnDim = dnResult.dimensions?.[dim.key];
            if (!dnDim) return;

            const divKeys = Object.keys(dnDim.divisions);
            // Compressed case: DN collapses all sparse divisions to a single division
            // whose ID equals the dimension's own nodeId.
            const isCompressed =
                dim.compressSparseDivisions &&
                divKeys.length === 1 &&
                divKeys[0] === dnDim.nodeId;

            let newDivisions: DivisionEntry[];

            if (isCompressed) {
                newDivisions = [{ id: dnDim.nodeId, originalValue: '(compressed)' }];
            } else {
                newDivisions = divKeys.map(divId => {
                    const div = dnDim.divisions[divId];
                    let originalValue: string;

                    if (dim.type === 'categorical') {
                        // The category value is stored on the division's node data
                        const node = dnResult.nodes[divId];
                        originalValue = String(node?.data?.[dim.key] ?? divId);
                    } else {
                        // Numerical: reconstruct the range label from the bin extents
                        const extents = div.numericalExtents;
                        originalValue = extents
                            ? `${r2(extents[0])}–${r2(extents[1])}`
                            : divId;
                    }

                    // Preserve any ID the user has already edited for this division
                    const existing = dim.divisions.find(d => d.originalValue === originalValue);
                    return { id: existing?.id ?? divId, originalValue };
                });
            }

            // Only write back when the division list has actually changed
            const oldSig = JSON.stringify(dim.divisions);
            const newSig = JSON.stringify(newDivisions);
            if (oldSig !== newSig) {
                updates.push({ key: dim.key, divisions: newDivisions });
            }
        });

        if (updates.length > 0) {
            appState.update(s => ({
                ...s,
                schemaState: {
                    ...s.schemaState,
                    dimensions: s.schemaState.dimensions.map(d => {
                        const u = updates.find(u => u.key === d.key);
                        return u ? { ...d, divisions: u.divisions } : d;
                    }),
                },
            }));
        }
    }

    // ─── Graph mounting ───────────────────────────────────────────────────────
    let graphContainer: HTMLDivElement = $state()!;

    $effect(() => {
        if (!graphContainer || !uploadedData || schema.collapsed) return;

        // Track all reactive schema fields so the effect re-runs on any change
        const _dims = schema.dimensions;
        const _mode = schema.graphMode;
        const _l0 = schema.level0Enabled;
        const _l0id = schema.level0Id;
        const _l1ext = schema.level1Extents;
        const _l1fwd = schema.level1NavForwardName;
        const _hideLeaves = schema.hideLeafNodes;
        const _childmost = schema.childmostNavigation;

        const included = _dims.filter(d => d.included)
            .sort((a, b) => (a.navIndex ?? 99) - (b.navIndex ?? 99));

        graphContainer.innerHTML = '';

        if (included.length === 0) return;

        const dnResult = buildDNStructure(uploadedData, schema);
        if (!dnResult) return;

        // Sync divisions from DN result back to schema state (stable — no loop)
        syncDivisionsFromDN(included, dnResult);

        // Collect the node IDs that belong to the hierarchy (not leaf data rows)
        const hierarchyIds = new Set<string>();
        if (_l0 && _l0id) hierarchyIds.add(_l0id);
        Object.values(dnResult.dimensions as Record<string, any>).forEach((dim: any) => {
            hierarchyIds.add(dim.nodeId);
            Object.keys(dim.divisions).forEach((divId: string) => hierarchyIds.add(divId));
        });

        // Convert DN node/edge records to arrays for the inspector
        let visNodes = Object.values(dnResult.nodes as Record<string, any>);
        let visLinks = Object.values(dnResult.edges as Record<string, any>);

        // When hiding leaf nodes, restrict to hierarchy nodes only
        if (_hideLeaves) {
            visNodes = visNodes.filter((n: any) => hierarchyIds.has(n.id));
            visLinks = visLinks.filter((l: any) =>
                hierarchyIds.has(l.source) && hierarchyIds.has(l.target)
            );
        }

        const w = graphContainer.clientWidth || 320;
        const h = 220;

        const nodeGroupFn = (d: any) => {
            if (d.dimensionLevel === 0) return 'root';
            if (d.dimensionLevel === 1) return 'dimension';
            if (d.dimensionLevel === 2) return 'division';
            return 'leaf';
        };

        let svgEl: SVGSVGElement;
        if (_mode === 'tree') {
            svgEl = TreeGraph({ nodes: visNodes, links: visLinks }, {
                width: w, height: h,
                // Pass DN dimensions directly — inspector uses them for layout + nav rule classification
                dimensions: dnResult.dimensions,
                nodeRadius: 5,
                nodeGroup: nodeGroupFn,
                nodeGroups: ['root', 'dimension', 'division', 'leaf'],
                colors: ['#c05555', '#1e3369', '#6780c0', '#adbac7'],
                hide: false,
                description: `Tree layout — ${included.length} dimension(s)${_hideLeaves ? '' : ', with data rows'}.`
            }) as unknown as SVGSVGElement;
        } else {
            svgEl = ForceGraph({ nodes: visNodes, links: visLinks }, {
                width: w, height: h,
                nodeRadius: 5,
                nodeGroup: nodeGroupFn,
                nodeGroups: ['root', 'dimension', 'division', 'leaf'],
                colors: ['#c05555', '#1e3369', '#6780c0', '#adbac7'],
                nodeTitle: (d: any) => d.id,
                hide: false,
                description: `Force graph — ${included.length} dimension(s).`
            }) as unknown as SVGSVGElement;
        }
        if (svgEl) graphContainer.appendChild(svgEl);
    });
</script>

<div class="schema-panel" class:collapsed={schema.collapsed} aria-label="Schema panel">
    <!-- ── Header ── -->
    <div class="schema-header">
        {#if !schema.collapsed}
            <span class="schema-title">Schema</span>
        {/if}
        <button class="collapse-btn" type="button" onclick={toggleCollapse}
            aria-label={schema.collapsed ? 'Expand schema panel' : 'Collapse schema panel'}>
            {#if schema.collapsed}
                <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 4 10 8 6 12"/></svg>
            {:else}
                <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="10 4 6 8 10 12"/></svg>
            {/if}
        </button>
    </div>

    {#if !schema.collapsed}
        <!-- ── Top half: graph ── -->
        <div class="schema-graph-section">
            <div class="graph-toolbar" role="group" aria-label="Graph view mode">
                <label class="radio-label">
                    <input type="radio" name="graphMode" value="tree" checked={schema.graphMode === 'tree'}
                        onchange={() => setSchemaField('graphMode', 'tree')} />
                    Tree
                </label>
                <label class="radio-label">
                    <input type="radio" name="graphMode" value="force" checked={schema.graphMode === 'force'}
                        onchange={() => setSchemaField('graphMode', 'force')} />
                    Force
                </label>
            </div>
            <div class="graph-container" bind:this={graphContainer} aria-label="Data structure graph">
                {#if !uploadedData}<p class="graph-empty">No data loaded.</p>{/if}
            </div>
            <div class="graph-footer">
                <label class="graph-toggle">
                    <input type="checkbox" checked={schema.hideLeafNodes}
                        onchange={(e) => setSchemaField('hideLeafNodes', (e.target as HTMLInputElement).checked)} />
                    Hide child nodes
                </label>
            </div>
        </div>

        <!-- ── Bottom half: schema builder ── -->
        <div class="schema-builder-section">

            <!-- Level 0 -->
            <section class="schema-section">
                <label class="checkbox-field section-toggle">
                    <input type="checkbox" checked={schema.level0Enabled}
                        onchange={(e) => setSchemaField('level0Enabled', (e.target as HTMLInputElement).checked)} />
                    <span class="section-toggle-label">Add level 0 node <span class="badge-entry">entry</span></span>
                </label>
                {#if schema.level0Enabled}
                    <div class="indented">
                        <label class="field-label">
                            ID
                            <input type="text" class="text-input" value={schema.level0Id}
                                aria-label="Level 0 node ID"
                                oninput={(e) => setSchemaField('level0Id', (e.target as HTMLInputElement).value)} />
                        </label>
                    </div>
                {/if}
            </section>

            <!-- Level 1 options -->
            <section class="schema-section">
                <h3 class="section-heading">Dimensions (level 1)</h3>
                <label class="field-label">
                    Extents
                    <select value={schema.level1Extents}
                        onchange={(e) => setSchemaField('level1Extents', (e.target as HTMLSelectElement).value as 'circular' | 'terminal')}>
                        <option value="terminal">Terminal</option>
                        <option value="circular">Circular</option>
                    </select>
                </label>
                <div class="nav-rule-row">
                    <span class="nav-dir-label">Forward</span>
                    <input type="text" class="nav-name-input" value={schema.level1NavForwardName}
                        aria-label="Level 1 forward nav name"
                        oninput={(e) => setSchemaField('level1NavForwardName', (e.target as HTMLInputElement).value)} />
                    <input type="text" class="nav-key-input" value={schema.level1NavForwardKey}
                        aria-label="Level 1 forward nav key"
                        oninput={(e) => setSchemaField('level1NavForwardKey', (e.target as HTMLInputElement).value)} />
                </div>
                <div class="nav-rule-row">
                    <span class="nav-dir-label">Backward</span>
                    <input type="text" class="nav-name-input" value={schema.level1NavBackwardName}
                        aria-label="Level 1 backward nav name"
                        oninput={(e) => setSchemaField('level1NavBackwardName', (e.target as HTMLInputElement).value)} />
                    <input type="text" class="nav-key-input" value={schema.level1NavBackwardKey}
                        aria-label="Level 1 backward nav key"
                        oninput={(e) => setSchemaField('level1NavBackwardKey', (e.target as HTMLInputElement).value)} />
                </div>
            </section>

            <!-- Global childmost + allow-more -->
            <section class="schema-section">
                <label class="field-label" for="childmost-nav">
                    Childmost navigation
                    <select id="childmost-nav" value={schema.childmostNavigation}
                        onchange={(e) => setSchemaField('childmostNavigation', (e.target as HTMLSelectElement).value as 'within' | 'across')}>
                        <option value="within">Within</option>
                        <option value="across">Across</option>
                    </select>
                </label>
            </section>

            <!-- Dimensions list -->
            {#if schema.dimensions.length === 0}
                <p class="schema-empty">Upload data to see dimensions.</p>
            {:else}
                <ul class="dimensions-list" aria-label="Dimensions">
                    {#each schema.dimensions as dim (dim.key)}
                        {@const canCheck = dim.included || schema.allowMoreThan3 || includedCount < 3}
                        <li class="dimension-item" class:included={dim.included}>
                            <div class="dimension-header">
                                <input type="checkbox" id="dim-check-{dim.key}"
                                    checked={dim.included} disabled={!canCheck}
                                    onchange={() => toggleDimension(dim.key)}
                                    aria-describedby="dim-label-{dim.key}" />
                                <label id="dim-label-{dim.key}" for="dim-check-{dim.key}" class="dimension-label">
                                    {#if dim.navIndex !== null}
                                        <span class="nav-slot-badge" aria-label="Slot {dim.navIndex + 1}">{dim.navIndex + 1}</span>
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

                                        <!-- Extents -->
                                        <label class="field-label">
                                            Extents
                                            <select value={dim.extents}
                                                onchange={(e) => updateDim(dim.key, 'extents', (e.target as HTMLSelectElement).value as DimensionSchema['extents'])}>
                                                <option value="circular">Circular</option>
                                                <option value="terminal">Terminal</option>
                                                <!-- <option value="bridgedCousins">Bridged cousins</option> -->
                                            </select>
                                        </label>

                                        <!-- Sort method -->
                                        <label class="field-label">
                                            Sort
                                            <select value={dim.sortMethod}
                                                onchange={(e) => updateDim(dim.key, 'sortMethod', (e.target as HTMLSelectElement).value as DimensionSchema['sortMethod'])}>
                                                <option value="none">None (data order)</option>
                                                <option value="ascending">Ascending</option>
                                                <option value="descending">Descending</option>
                                            </select>
                                        </label>

                                        <!-- Subdivisions (numerical only) -->
                                        {#if dim.type === 'numerical'}
                                            <label class="field-label">
                                                Subdivisions
                                                <input type="number" class="number-input"
                                                    value={dim.subdivisions} min="1" max="12"
                                                    aria-label="Number of subdivisions for {dim.key}"
                                                    oninput={(e) => {
                                                        const v = Math.max(1, Math.min(12, parseInt((e.target as HTMLInputElement).value) || 4));
                                                        updateDim(dim.key, 'subdivisions', v);
                                                    }} />
                                            </label>
                                        {/if}

                                        <!-- Compress sparse (categorical only) -->
                                        {#if dim.type === 'categorical'}
                                            <label class="checkbox-field">
                                                <input type="checkbox" checked={dim.compressSparseDivisions}
                                                    onchange={(e) => updateDim(dim.key, 'compressSparseDivisions', (e.target as HTMLInputElement).checked)} />
                                                Compress sparse divisions
                                            </label>
                                        {/if}

                                        <!-- Navigation rules -->
                                        <fieldset class="nav-fieldset">
                                            <legend>Navigation</legend>
                                            <div class="nav-rule-row">
                                                <span class="nav-dir-label">Forward</span>
                                                <input type="text" class="nav-name-input" value={dim.forwardName}
                                                    aria-label="Forward name for {dim.key}"
                                                    oninput={(e) => updateDim(dim.key, 'forwardName', (e.target as HTMLInputElement).value)} />
                                                <input type="text" class="nav-key-input" value={dim.forwardKey}
                                                    aria-label="Forward key for {dim.key}"
                                                    oninput={(e) => updateDim(dim.key, 'forwardKey', (e.target as HTMLInputElement).value)} />
                                            </div>
                                            <div class="nav-rule-row">
                                                <span class="nav-dir-label">Backward</span>
                                                <input type="text" class="nav-name-input" value={dim.backwardName}
                                                    aria-label="Backward name for {dim.key}"
                                                    oninput={(e) => updateDim(dim.key, 'backwardName', (e.target as HTMLInputElement).value)} />
                                                <input type="text" class="nav-key-input" value={dim.backwardKey}
                                                    aria-label="Backward key for {dim.key}"
                                                    oninput={(e) => updateDim(dim.key, 'backwardKey', (e.target as HTMLInputElement).value)} />
                                            </div>
                                        </fieldset>

                                        <!-- Drill rules -->
                                        <fieldset class="nav-fieldset">
                                            <legend>Drill</legend>
                                            <div class="nav-rule-row">
                                                <span class="nav-dir-label">In</span>
                                                <input type="text" class="nav-name-input" value={dim.drillInName}
                                                    aria-label="Drill in name for {dim.key}"
                                                    oninput={(e) => updateDim(dim.key, 'drillInName', (e.target as HTMLInputElement).value)} />
                                                <input type="text" class="nav-key-input" value={dim.drillInKey}
                                                    aria-label="Drill in key for {dim.key}"
                                                    oninput={(e) => updateDim(dim.key, 'drillInKey', (e.target as HTMLInputElement).value)} />
                                            </div>
                                            <div class="nav-rule-row">
                                                <span class="nav-dir-label">Up</span>
                                                <input type="text" class="nav-name-input" value={dim.drillUpName}
                                                    aria-label="Drill up name for {dim.key}"
                                                    oninput={(e) => updateDim(dim.key, 'drillUpName', (e.target as HTMLInputElement).value)} />
                                                <input type="text" class="nav-key-input" value={dim.drillUpKey}
                                                    aria-label="Drill up key for {dim.key}"
                                                    oninput={(e) => updateDim(dim.key, 'drillUpKey', (e.target as HTMLInputElement).value)} />
                                            </div>
                                        </fieldset>

                                        <!-- Divisions list -->
                                        {#if dim.divisions.length > 0}
                                            <fieldset class="nav-fieldset divisions-fieldset">
                                                <legend>
                                                    Divisions
                                                    {#if dim.compressSparseDivisions}
                                                        <span class="compressed-hint">(compressed)</span>
                                                    {/if}
                                                </legend>
                                                <ul class="divisions-list" aria-label="Divisions for {dim.key}">
                                                    {#each dim.divisions as div, di}
                                                        <li class="division-row">
                                                            <span class="division-original" title={div.originalValue}>{div.originalValue}</span>
                                                            <input type="text" class="division-id-input"
                                                                value={div.id}
                                                                aria-label="ID for division {div.originalValue} of {dim.key}"
                                                                oninput={(e) => updateDivisionId(dim.key, di, (e.target as HTMLInputElement).value)} />
                                                        </li>
                                                    {/each}
                                                </ul>
                                            </fieldset>
                                        {/if}

                                    </div>
                                </details>
                            {/if}
                        </li>
                    {/each}
                </ul>

                <label class="checkbox-field allow-more">
                    <input type="checkbox" checked={schema.allowMoreThan3}
                        onchange={(e) => setSchemaField('allowMoreThan3', (e.target as HTMLInputElement).checked)} />
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
    .schema-panel.collapsed { width: 44px; }

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
    .collapsed .schema-header { justify-content: center; padding: calc(var(--dn-space) * 1.25) 0; }

    .schema-title {
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--dn-text);
        white-space: nowrap;
        flex: 1;
    }

    .collapse-btn {
        flex-shrink: 0;
        width: 28px; height: 28px;
        min-width: 28px; min-height: 28px;
        display: flex; align-items: center; justify-content: center;
        padding: 0;
        background: transparent;
        border: 1px solid var(--dn-border);
        border-radius: calc(var(--dn-radius) / 2);
        color: var(--dn-text-muted);
        cursor: pointer;
        transition: background 0.15s, color 0.15s;
    }
    .collapse-btn:hover { background: var(--dn-accent-soft); color: var(--dn-text); }
    .collapse-btn svg { width: 14px; height: 14px; }

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
        display: flex; align-items: center; gap: calc(var(--dn-space) * 0.5);
        font-size: 0.8125rem; color: var(--dn-text-muted); cursor: pointer; user-select: none;
    }
    .radio-label input { accent-color: var(--dn-accent); cursor: pointer; }
    .graph-container {
        height: 220px; overflow: hidden;
        display: flex; align-items: center; justify-content: center;
        background: var(--dn-bg);
    }
    .graph-container :global(svg) { max-width: 100%; height: auto; display: block; }
    .graph-empty { margin: 0; font-size: 0.8125rem; color: var(--dn-text-muted); }
    .graph-footer {
        padding: calc(var(--dn-space) * 0.75) calc(var(--dn-space) * 1.5);
        border-top: 1px solid var(--dn-border);
        flex-shrink: 0;
    }
    .graph-toggle {
        display: flex; align-items: center; gap: calc(var(--dn-space) * 0.75);
        font-size: 0.8125rem; color: var(--dn-text-muted); cursor: pointer;
    }
    .graph-toggle input { accent-color: var(--dn-accent); cursor: pointer; flex-shrink: 0; }

    /* ── Builder section ── */
    .schema-builder-section {
        flex: 1;
        overflow-y: auto;
        padding: calc(var(--dn-space) * 1.5);
        display: flex;
        flex-direction: column;
        gap: 0;
        min-height: 0;
    }
    .schema-empty { margin: 0; font-size: 0.8125rem; color: var(--dn-text-muted); }

    /* ── Sections ── */
    .schema-section {
        padding: calc(var(--dn-space) * 1) 0;
        border-bottom: 1px solid var(--dn-border);
        display: flex;
        flex-direction: column;
        gap: calc(var(--dn-space) * 0.75);
    }
    .section-heading {
        margin: 0 0 calc(var(--dn-space) * 0.25);
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--dn-text-muted);
    }
    .section-toggle { font-size: 0.8125rem; }
    .section-toggle-label { display: flex; align-items: center; gap: calc(var(--dn-space) * 0.5); }
    .badge-entry {
        font-size: 0.625rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;
        padding: 1px 5px; border-radius: 3px;
        background: rgba(192, 85, 85, 0.15); color: #c05555;
    }
    .indented { padding-left: calc(var(--dn-space) * 2.5); }

    /* ── Shared form fields ── */
    .field-label {
        display: flex; align-items: center; justify-content: space-between;
        gap: calc(var(--dn-space) * 1);
        font-size: 0.8125rem; color: var(--dn-text-muted);
    }
    .field-label select, .field-label .text-input {
        font-family: var(--dn-font); font-size: 0.8125rem;
        padding: calc(var(--dn-space) * 0.5) calc(var(--dn-space) * 1);
        border: 1px solid var(--dn-border); border-radius: calc(var(--dn-radius) / 2);
        background: var(--dn-bg); color: var(--dn-text);
        min-height: 32px;
    }
    .field-label .text-input { flex: 1; min-width: 0; }
    .number-input {
        font-family: var(--dn-font); font-size: 0.8125rem;
        padding: calc(var(--dn-space) * 0.5) calc(var(--dn-space) * 0.75);
        border: 1px solid var(--dn-border); border-radius: calc(var(--dn-radius) / 2);
        background: var(--dn-bg); color: var(--dn-text);
        min-height: 32px; width: 64px; text-align: center;
    }
    .checkbox-field {
        display: flex; align-items: center; gap: calc(var(--dn-space) * 0.75);
        font-size: 0.8125rem; color: var(--dn-text-muted); cursor: pointer;
    }
    .checkbox-field input { accent-color: var(--dn-accent); cursor: pointer; flex-shrink: 0; }

    /* ── Dimensions list ── */
    .dimensions-list {
        list-style: none; margin: calc(var(--dn-space) * 1) 0 0;
        padding: 0; display: flex; flex-direction: column; gap: 2px;
    }
    .dimension-item {
        border: 1px solid var(--dn-border);
        border-radius: calc(var(--dn-radius) / 2);
        background: var(--dn-bg); overflow: hidden;
    }
    .dimension-item.included { border-color: var(--dn-accent-light); }

    .dimension-header {
        display: flex; align-items: center; gap: calc(var(--dn-space) * 1);
        padding: calc(var(--dn-space) * 0.75) calc(var(--dn-space) * 1);
    }
    .dimension-header input[type="checkbox"] {
        flex-shrink: 0; accent-color: var(--dn-accent); width: 16px; height: 16px; cursor: pointer;
    }
    .dimension-header input[type="checkbox"]:disabled { opacity: 0.4; cursor: not-allowed; }

    .dimension-label {
        display: flex; align-items: center; gap: calc(var(--dn-space) * 0.5);
        font-size: 0.8125rem; cursor: pointer; flex: 1; min-width: 0;
    }
    .nav-slot-badge {
        display: inline-flex; align-items: center; justify-content: center;
        width: 18px; height: 18px; border-radius: 50%;
        background: var(--dn-accent); color: #fff;
        font-size: 0.6875rem; font-weight: 700; flex-shrink: 0;
    }
    .dim-key {
        font-weight: 600; color: var(--dn-text);
        overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;
    }
    .dim-type-badge {
        font-size: 0.625rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em;
        padding: 1px 5px; border-radius: 3px;
        background: var(--dn-accent-soft); color: var(--dn-accent); flex-shrink: 0;
    }
    .dim-type-badge.numerical { background: rgba(103,128,192,0.15); color: var(--dn-accent-mid); }

    /* ── Options disclosure ── */
    .dim-options { border-top: 1px solid var(--dn-border); }
    .dim-options-summary {
        padding: calc(var(--dn-space) * 0.5) calc(var(--dn-space) * 1);
        font-size: 0.75rem; color: var(--dn-text-muted);
        cursor: pointer; user-select: none; list-style: none;
        display: flex; align-items: center; gap: calc(var(--dn-space) * 0.5);
    }
    .dim-options-summary::-webkit-details-marker { display: none; }
    .dim-options-summary::before {
        content: '▶'; font-size: 0.625rem; transition: transform 0.15s; display: inline-block;
    }
    details[open] .dim-options-summary::before { transform: rotate(90deg); }

    .dim-options-body {
        padding: calc(var(--dn-space) * 1);
        display: flex; flex-direction: column; gap: calc(var(--dn-space) * 1.25);
    }

    /* ── Nav fieldsets ── */
    .nav-fieldset {
        border: 1px solid var(--dn-border); border-radius: calc(var(--dn-radius) / 2);
        padding: calc(var(--dn-space) * 0.75) calc(var(--dn-space) * 1);
        margin: 0;
        display: flex; flex-direction: column; gap: calc(var(--dn-space) * 0.75);
    }
    .nav-fieldset legend {
        font-size: 0.75rem; font-weight: 600; color: var(--dn-text-muted);
        padding: 0 calc(var(--dn-space) * 0.5);
        display: flex; align-items: center; gap: calc(var(--dn-space) * 0.5);
    }
    .compressed-hint {
        font-size: 0.625rem; font-weight: 400; color: var(--dn-text-muted); font-style: italic;
    }

    .nav-rule-row {
        display: grid; grid-template-columns: 48px 1fr 72px;
        align-items: center; gap: calc(var(--dn-space) * 0.5);
    }
    .nav-dir-label { font-size: 0.75rem; color: var(--dn-text-muted); white-space: nowrap; }
    .nav-name-input, .nav-key-input {
        font-family: var(--dn-font); font-size: 0.75rem;
        padding: calc(var(--dn-space) * 0.5);
        border: 1px solid var(--dn-border); border-radius: calc(var(--dn-radius) / 2);
        background: var(--dn-bg); color: var(--dn-text);
        min-height: 28px; width: 100%;
    }
    .nav-key-input { font-family: var(--dn-font-mono); font-size: 0.7rem; }
    .nav-name-input:focus, .nav-key-input:focus, .number-input:focus {
        outline: 2px solid var(--dn-accent); outline-offset: 1px;
    }

    /* ── Divisions list ── */
    .divisions-fieldset { gap: calc(var(--dn-space) * 0.5); }
    .divisions-list {
        list-style: none; margin: 0; padding: 0;
        display: flex; flex-direction: column; gap: 3px;
        max-height: 180px; overflow-y: auto;
    }
    .division-row {
        display: grid; grid-template-columns: 1fr 1fr;
        align-items: center; gap: calc(var(--dn-space) * 0.5);
    }
    .division-original {
        font-size: 0.75rem; color: var(--dn-text-muted);
        overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .division-id-input {
        font-family: var(--dn-font-mono); font-size: 0.7rem;
        padding: calc(var(--dn-space) * 0.4) calc(var(--dn-space) * 0.6);
        border: 1px solid var(--dn-border); border-radius: calc(var(--dn-radius) / 2);
        background: var(--dn-bg); color: var(--dn-text);
        min-height: 26px; width: 100%;
    }
    .division-id-input:focus { outline: 2px solid var(--dn-accent); outline-offset: 1px; }

    /* ── Allow-more ── */
    .allow-more {
        margin-top: calc(var(--dn-space) * 1.5);
        padding-top: calc(var(--dn-space) * 1);
        border-top: 1px solid var(--dn-border);
        font-size: 0.75rem;
    }
</style>
