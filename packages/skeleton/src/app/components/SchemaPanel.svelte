<script lang="ts">
    import { onDestroy } from 'svelte';
    import dataNavigator from 'data-navigator';
    import { Inspector } from '@data-navigator/inspector';
    import { appState, type DimensionSchema, type DivisionEntry, type SchemaState } from '../../store/appState';
    import type { SkeletonNode, SkeletonEdge } from '../../store/types';

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
        collapsed: false, graphMode: 'tree', hideLeafNodes: false,
        level0Enabled: false, level0Id: 'root',
        level1Extents: 'terminal',
        level1NavForwardName: 'left',  level1NavForwardKey: 'ArrowLeft',
        level1NavBackwardName: 'right', level1NavBackwardKey: 'ArrowRight',
    });
    let initialized = $state(false);
    let selectedNodeIds = $state<Set<string>>(new Set());
    let hoveredNodeId = $state<string | null>(null);
    let imageWidth = $state<number | null>(null);
    let imageHeight = $state<number | null>(null);
    // DN structure result — drives the schema graph viewer (independent of canvas positions).
    // Stored as a plain (non-reactive) let so that D3 mutations to node objects (x, y, vx, vy
    // added by force simulation) do not write back through a Svelte 5 proxy and re-trigger
    // the Inspector effect in an infinite loop. The Inspector effect instead tracks _dnTick,
    // which is incremented explicitly only when the structure itself changes.
    let dnResult: any = null;
    let _dnHasResult = $state(false); // reactive mirror of (dnResult !== null) for the template
    let _dnTick = $state(0);
    let _dnCounter = 0; // plain (non-reactive) counter — used to write _dnTick without reading it
    let schemaGraphContainer: HTMLDivElement | undefined = $state();
    let _inspector: ReturnType<typeof Inspector> | null = null;
    // Mirrored separately from schema so the Inspector effect only re-runs when
    // these values actually change, not on every schema proxy replacement.
    let _graphMode = $state<'tree' | 'force'>('tree');
    let _hideLeafNodes = $state(false);

    // Track the last schemaState reference so we only reassign `schema` (and re-trigger effects)
    // when schemaState actually changed. This prevents nodes/edges updates from re-running the
    // DN-build effect via the subscribe → schema reassignment path.
    let _lastSchemaRef: SchemaState | null = null;
    // Same guard for uploadedData: Svelte 5 $state wraps arrays in a reactive proxy, so
    // assigning the same plain array reference each time appState changes creates a new proxy,
    // which Svelte treats as a change and re-triggers the DN build effect (infinite loop).
    let _lastUploadedDataRef: Record<string, unknown>[] | null = null;

    // Set to true by syncDivisionsFromDN before it calls appState.update, so the next
    // $effect re-run (caused by the division update) skips rebuilding the DN structure.
    // This prevents a double build on first load: build → syncDivisions updates schema →
    // effect re-runs → build again (unnecessarily).
    let _skipNextDivisionTrigger = false;

    const _unsubscribeAppState = appState.subscribe(s => {
        if (s.uploadedData !== _lastUploadedDataRef) {
            _lastUploadedDataRef = s.uploadedData;
            uploadedData = s.uploadedData;
        }
        // Only reassign schema when the schemaState object reference changed.
        // This prevents the DN-build effect from looping when divisions are synced back.
        if (s.schemaState !== _lastSchemaRef) {
            _lastSchemaRef = s.schemaState;
            if (s.schemaState.graphMode !== _graphMode) _graphMode = s.schemaState.graphMode;
            if (s.schemaState.hideLeafNodes !== _hideLeafNodes) _hideLeafNodes = s.schemaState.hideLeafNodes;
            schema = s.schemaState;
        }
        // Sync selection/hover state so schema graph and canvas share the same UX model.
        // The schema graph viewer (Inspector) and GraphCanvas both read these to highlight nodes.
        selectedNodeIds = s.selectedNodeIds;
        hoveredNodeId = s.hoveredNodeId;
        imageWidth = s.imageWidth;
        imageHeight = s.imageHeight;
        if (s.uploadedData && !initialized) {
            initialized = true;
            const inferred = buildInitialSchema(s.uploadedData);
            // Use queueMicrotask to avoid synchronous re-entrancy: calling appState.update
            // synchronously here would re-enter this subscribe callback with the NEW state
            // while the outer callback is still running with the OLD state. When the outer
            // callback resumes it would see _lastSchemaRef pointing to the NEW schemaState
            // and incorrectly overwrite schema back to the old (empty) value.
            queueMicrotask(() => appState.update(st => ({ ...st, schemaState: inferred })));
        }
        if (!s.uploadedData) initialized = false;
    });
    onDestroy(_unsubscribeAppState);

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
            const extents: 'circular' | 'terminal' | 'bridgedCousins' = type === 'categorical' ? 'circular' : 'bridgedCousins';
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

    function syncDivisionsFromDN(included: DimensionSchema[], structure: any) {
        const updates: { key: string; divisions: DivisionEntry[] }[] = [];

        included.forEach(dim => {
            const dnDim = structure.dimensions?.[dim.key];
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
                        const node = structure.nodes[divId];
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
            // Signal the main $effect to skip its next re-run caused by this update.
            // Without this, the effect would rebuild the DN structure a second time even
            // though the structure hasn't meaningfully changed (divisions are a DN output).
            _skipNextDivisionTrigger = true;
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

    // ─── Canvas node initialization from schema ───────────────────────────────
    // Creates rectangular SkeletonNode objects in GraphCanvas for each hierarchy node
    // (level 0 / dimensions / divisions) the first time they appear. Existing nodes are
    // never moved — the user can freely reposition them. Nodes no longer present in the
    // current DN structure (e.g. a deselected dimension) are cleaned up.
    //
    // IMPORTANT: The initial x/y positions here are for the CANVAS OVERLAY, not for the
    // schema graph viewer. The Inspector uses its own independent layout.

    function initCanvasNodesFromSchema(structure: any, schemaSnap: SchemaState) {
        const canvasW = imageWidth ?? 1200;
        const canvasH = imageHeight ?? 800;
        const nodeW = 140, nodeH = 52;
        const padX = 80, padY = 80;
        const usableW = canvasW - padX * 2;

        // Collect hierarchy node IDs grouped by level
        const level0Ids: string[] = [];
        const level1Ids: string[] = [];
        const level2ByDim = new Map<string, string[]>();
        // level3ByDiv: divisionId → leaf node IDs (actual data rows)
        const level3ByDiv = new Map<string, string[]>();

        if (schemaSnap.level0Enabled && schemaSnap.level0Id) {
            level0Ids.push(schemaSnap.level0Id);
        }
        Object.values(structure.dimensions as Record<string, any>).forEach((dim: any) => {
            level1Ids.push(dim.nodeId);
            level2ByDim.set(dim.nodeId, Object.keys(dim.divisions));
            Object.entries(dim.divisions as Record<string, any>).forEach(([divId, div]: [string, any]) => {
                const leafIds = Object.keys(div.values || {});
                if (leafIds.length > 0) level3ByDiv.set(divId, leafIds);
            });
        });

        const allHierarchyIds = new Set<string>([
            ...level0Ids,
            ...level1Ids,
            ...([...level2ByDim.values()].flat()),
            ...([...level3ByDiv.values()].flat()),
        ]);

        // Compute y positions for each level
        const hasLeafLevel = level3ByDiv.size > 0;
        const numLevels = (level0Ids.length > 0 ? 1 : 0) + 2 + (hasLeafLevel ? 1 : 0);
        const vSpacing = (canvasH - padY * 2) / Math.max(numLevels - 1, 1);
        let currentY = padY;

        const positions = new Map<string, { x: number; y: number }>();

        // Level 0
        if (level0Ids.length > 0) {
            positions.set(level0Ids[0], { x: canvasW / 2 - nodeW / 2, y: currentY });
            currentY += vSpacing;
        }

        // Level 1 — dimensions, evenly spaced
        const l1 = level1Ids.length;
        level1Ids.forEach((id, i) => {
            const x = l1 === 1
                ? canvasW / 2 - nodeW / 2
                : padX + (i / (l1 - 1)) * usableW - nodeW / 2;
            positions.set(id, { x: Math.max(padX, x), y: currentY });
        });
        currentY += vSpacing;

        // Level 2 — divisions, grouped under their parent dimension
        level1Ids.forEach((dimId, dimIdx) => {
            const divIds = level2ByDim.get(dimId) || [];
            if (divIds.length === 0) return;
            const rangeW = l1 > 0 ? usableW / l1 : usableW;
            const rangeStart = padX + dimIdx * rangeW;
            divIds.forEach((divId, divIdx) => {
                const x = divIds.length === 1
                    ? (positions.get(dimId)?.x ?? rangeStart + rangeW / 2 - nodeW / 2)
                    : rangeStart + (divIdx / (divIds.length - 1)) * rangeW - nodeW / 2;
                positions.set(divId, { x: Math.max(padX, x), y: currentY });
            });
        });

        // Level 3 — leaf data row nodes, grouped under their parent division
        if (hasLeafLevel) {
            currentY += vSpacing;
            level1Ids.forEach((dimId, dimIdx) => {
                const divIds = level2ByDim.get(dimId) || [];
                const rangeW = l1 > 0 ? usableW / l1 : usableW;
                const rangeStart = padX + dimIdx * rangeW;
                divIds.forEach((divId, divIdx) => {
                    const leafIds = level3ByDiv.get(divId) || [];
                    if (leafIds.length === 0) return;
                    const subRangeW = divIds.length > 0 ? rangeW / divIds.length : rangeW;
                    const subRangeStart = rangeStart + divIdx * subRangeW;
                    leafIds.forEach((leafId, leafIdx) => {
                        const x = leafIds.length === 1
                            ? subRangeStart + subRangeW / 2 - nodeW / 2
                            : subRangeStart + (leafIdx / (leafIds.length - 1)) * subRangeW - nodeW / 2;
                        positions.set(leafId, { x: Math.max(padX, x), y: currentY });
                    });
                });
            });
        }

        appState.update(s => {
            // Check if update is needed: any new hierarchy nodes, or any stale schema nodes
            const existingSchemaIds = new Set(
                [...s.nodes.values()].filter(n => n.source === 'schema').map(n => n.id)
            );
            const hasNew = [...allHierarchyIds].some(id => !existingSchemaIds.has(id));
            const hasStale = [...existingSchemaIds].some(id => !allHierarchyIds.has(id));
            if (!hasNew && !hasStale) return s;

            const newNodes = new Map<string, SkeletonNode>();
            // Keep manual nodes unchanged; keep schema nodes still in hierarchy
            s.nodes.forEach((node, id) => {
                if (node.source !== 'schema' || allHierarchyIds.has(id)) {
                    newNodes.set(id, node);
                }
            });

            // Add newly-seen hierarchy nodes with initial canvas positions
            allHierarchyIds.forEach(nodeId => {
                if (newNodes.has(nodeId)) return; // preserve existing
                const pos = positions.get(nodeId) ?? { x: padX, y: padY };
                const dnNode = structure.nodes[nodeId];
                let label = nodeId;
                if (dnNode) {
                    const key = dnNode.dimensionKey;
                    if (dnNode.dimensionLevel === 1 && key) label = key;
                    else if (dnNode.dimensionLevel === 2 && key) {
                        label = String(dnNode.data?.[key] ?? nodeId);
                    } else if (dnNode.dimensionLevel === 0) {
                        label = schemaSnap.level0Id || 'root';
                    } else if (dnNode.dimensionLevel === undefined && dnNode.data) {
                        // Leaf data row — use the first included dimension's value
                        const firstIncluded = schemaSnap.dimensions.find(d => d.included);
                        if (firstIncluded) {
                            label = String(dnNode.data[firstIncluded.key] ?? nodeId);
                        } else {
                            const firstKey = Object.keys(dnNode.data).find((k: string) => !k.startsWith('_'));
                            if (firstKey) label = String(dnNode.data[firstKey] ?? nodeId);
                        }
                    }
                }
                newNodes.set(nodeId, {
                    id: nodeId,
                    label: label.length > 24 ? label.substring(0, 24) + '…' : label,
                    x: pos.x, y: pos.y,
                    width: nodeW, height: nodeH,
                    isEntry: nodeId === (schemaSnap.level0Enabled ? schemaSnap.level0Id : null),
                    isCluster: false,
                    source: 'schema',
                    semantics: { label: nodeId, name: 'node', includeParentName: false, includeIndex: false },
                    data: dnNode?.data ?? {},
                    renderProperties: { shape: 'rect', fill: 'var(--dn-surface)', opacity: 1, ariaRole: 'button', customClass: '' },
                } as SkeletonNode);
            });

            // Rebuild edges: keep non-schema edges, rebuild schema edges
            const newEdges = new Map<string, SkeletonEdge>();
            s.edges.forEach((edge, id) => {
                const srcSchema = s.nodes.get(edge.sourceId)?.source === 'schema';
                const tgtSchema = s.nodes.get(edge.targetId)?.source === 'schema';
                if (!srcSchema && !tgtSchema) newEdges.set(id, edge);
            });
            const addedPairs = new Set<string>();
            let edgeIdx = 0;
            const addEdge = (srcId: string, tgtId: string) => {
                const key = `${srcId}→${tgtId}`;
                if (addedPairs.has(key) || !newNodes.has(srcId) || !newNodes.has(tgtId)) return;
                addedPairs.add(key);
                const id = `schema_edge_${edgeIdx++}`;
                newEdges.set(id, { id, sourceId: srcId, targetId: tgtId, direction: 'down', label: '', dnProperties: {} });
            };
            if (schemaSnap.level0Enabled && schemaSnap.level0Id) {
                level1Ids.forEach(dimId => addEdge(schemaSnap.level0Id!, dimId));
            }
            level1Ids.forEach(dimId => {
                (level2ByDim.get(dimId) || []).forEach(divId => addEdge(dimId, divId));
            });
            level3ByDiv.forEach((leafIds, divId) => {
                leafIds.forEach(leafId => addEdge(divId, leafId));
            });

            const newEntryId = schemaSnap.level0Enabled && schemaSnap.level0Id
                ? schemaSnap.level0Id
                : s.entryNodeId;

            return { ...s, nodes: newNodes, edges: newEdges, entryNodeId: newEntryId };
        });
    }

    // ─── Debug: reactive trigger inspection ──────────────────────────────────
    // Remove these once the loop is identified.

    // DN build effect deps
    $inspect(uploadedData).with((t, v) =>
        console.log('[SP:DN] uploadedData', t, !!v));
    $inspect(schema).with((t) => {
        console.log('[SP:DN] schema', t);
        console.trace();
    });

    // Inspector effect deps
    $inspect(_dnTick).with((t, v) =>
        console.log('[SP:Inspector] _dnTick', t, v));
    $inspect(_graphMode).with((t, v) =>
        console.log('[SP:Inspector] _graphMode', t, v));
    $inspect(_hideLeafNodes).with((t, v) =>
        console.log('[SP:Inspector] _hideLeafNodes', t, v));
    $inspect(schemaGraphContainer).with((t, v) =>
        console.log('[SP:Inspector] schemaGraphContainer', t, !!v));

    // Visual sync effect deps
    $inspect(selectedNodeIds).with((t, v) =>
        console.log('[SP:VisualSync] selectedNodeIds', t, v?.size));
    $inspect(hoveredNodeId).with((t, v) =>
        console.log('[SP:VisualSync] hoveredNodeId', t, v));

    // ─── DN structure effect ──────────────────────────────────────────────────
    // Builds DN structure when schema changes; updates dnResult for the schema graph viewer.
    // The schema graph viewer (Inspector) is independent of the GraphCanvas coordinate space.

    $effect(() => {
        if (!uploadedData || schema.collapsed) { dnResult = null; _dnHasResult = false; _dnTick = ++_dnCounter; return; }

        // Track all reactive schema fields BEFORE any early return so that Svelte 5 always
        // records the correct dependency set for this effect. If we returned early before
        // reading schema.dimensions, the effect would lose those dependencies and would
        // not re-run when the user edits dimensions.
        const _dims = schema.dimensions;
        const _l0 = schema.level0Enabled;
        const _l0id = schema.level0Id;
        const _l1ext = schema.level1Extents;
        const _l1fwd = schema.level1NavForwardName;
        const _childmost = schema.childmostNavigation;

        const included = _dims.filter(d => d.included)
            .sort((a, b) => (a.navIndex ?? 99) - (b.navIndex ?? 99));

        if (included.length === 0) { dnResult = null; _dnHasResult = false; _dnTick = ++_dnCounter; return; }

        // If this re-run was triggered by syncDivisionsFromDN updating the schema, skip the
        // rebuild. The DN structure hasn't changed — only the division IDs were populated as
        // outputs. Rebuilding here would call dataNavigator.structure() a second time and
        // recreate the Inspector unnecessarily. Dependency tracking above is still correct:
        // the next user-driven schema change will re-run this effect normally.
        if (_skipNextDivisionTrigger) {
            _skipNextDivisionTrigger = false;
            return;
        }

        const result = buildDNStructure(uploadedData, schema);
        if (!result) { dnResult = null; _dnHasResult = false; _dnTick = ++_dnCounter; return; }

        // Defer side-effects — both have no-op guards so repeated calls are cheap.
        const capturedInc = [...included];
        const capturedSchema = { ...schema, dimensions: [...schema.dimensions] };
        queueMicrotask(() => {
            syncDivisionsFromDN(capturedInc, result);
            // Initialize canvas nodes after divisions are known, so labels are correct.
            // Uses a tree-like layout as the initial x/y; the user can reposition freely.
            queueMicrotask(() => initCanvasNodesFromSchema(result, capturedSchema));
        });

        // Expose the DN structure for the schema graph viewer (Inspector).
        // The Inspector renders its own abstract layout — no x/y bleed into GraphCanvas.
        dnResult = result;
        _dnHasResult = true;
        _dnTick = ++_dnCounter;
    });

    // ─── Inspector graph (schema structure visualization) ─────────────────────
    // The Inspector renders an abstract tree/force graph of the DN structure.
    // It uses its own layout — positions here are INDEPENDENT of GraphCanvas x/y.
    // Hover and selection state is shared via appState (same node IDs), enabling
    // cross-view highlighting without coupling the two coordinate spaces.

    $effect(() => {
        // Track _dnTick (not dnResult directly) so D3 mutations to node objects don't
        // re-trigger this effect. dnResult is a plain let; only _dnTick drives re-runs.
        const _v = _dnTick;
        const result = dnResult;
        const mode = _graphMode;
        const hideLeafs = _hideLeafNodes;
        const container = schemaGraphContainer;

        if (!result || !container) {
            if (_inspector) { _inspector.destroy(); _inspector = null; }
            return;
        }

        if (_inspector) { _inspector.destroy(); _inspector = null; }

        // Optionally omit leaf data rows — they are usually too numerous to be useful
        const filteredNodes = hideLeafs
            ? Object.fromEntries(
                Object.entries(result.nodes as Record<string, any>).filter(
                    ([, node]: [string, any]) =>
                        node.dimensionLevel !== undefined || node.derivedNode !== undefined
                )
              )
            : result.nodes;
        const filteredStructure = hideLeafs ? { ...result, nodes: filteredNodes } : result;

        try {
            _inspector = Inspector({
                structure: filteredStructure,
                container,
                size: 280,
                mode,
                colorBy: 'dimensionLevel',
                nodeRadius: 6,
            });

            // Attach click/hover handlers so schema interactions sync to appState
            // (which GraphCanvas also reads for its own hover/selection highlight).
            container.querySelectorAll('circle').forEach(el => {
                const c = el as SVGCircleElement & { __data__?: { id: string } };
                const nodeId = c.__data__?.id;
                if (!nodeId) return;
                c.style.cursor = 'pointer';
                c.addEventListener('click', (e: Event) => {
                    const me = e as MouseEvent;
                    const additive = me.metaKey || me.ctrlKey || me.shiftKey;
                    appState.update(s => {
                        if (additive) {
                            const ids = new Set(s.selectedNodeIds);
                            if (ids.has(nodeId)) ids.delete(nodeId);
                            else ids.add(nodeId);
                            return { ...s, selectedNodeIds: ids, selectedEdgeIds: new Set() };
                        }
                        return { ...s, selectedNodeIds: new Set([nodeId]), selectedEdgeIds: new Set() };
                    });
                });
                c.addEventListener('mouseenter', () => {
                    appState.update(s => ({ ...s, hoveredNodeId: nodeId }));
                });
                c.addEventListener('mouseleave', () => {
                    appState.update(s => ({ ...s, hoveredNodeId: null }));
                });
            });
        } catch (err) {
            console.error('[SchemaPanel] Inspector failed:', err);
        }

        return () => {
            if (_inspector) { _inspector.destroy(); _inspector = null; }
        };
    });

    // ─── Visual sync: reflect appState hover/selection in the schema graph ────
    // When the user hovers or selects a node in GraphCanvas, the Inspector circles
    // update their stroke color to show the cross-view link.

    $effect(() => {
        const selIds = selectedNodeIds;
        const hovId = hoveredNodeId;
        const container = schemaGraphContainer;
        if (!container) return;

        container.querySelectorAll('circle').forEach(el => {
            const c = el as SVGCircleElement & { __data__?: { id: string } };
            const nodeId = c.__data__?.id;
            if (!nodeId) return; // skip focus indicator
            const isSel = selIds.has(nodeId);
            const isHov = hovId === nodeId;
            if (isSel) {
                c.setAttribute('stroke', 'var(--dn-accent)');
                c.setAttribute('stroke-width', '3');
                c.setAttribute('stroke-opacity', '1');
            } else if (isHov) {
                c.setAttribute('stroke', 'var(--dn-accent-mid)');
                c.setAttribute('stroke-width', '2.5');
                c.setAttribute('stroke-opacity', '1');
            } else {
                c.setAttribute('stroke', '#fff');
                c.setAttribute('stroke-width', '1.5');
                c.setAttribute('stroke-opacity', '1');
            }
        });
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
        <!-- ── Top half: structure graph (abstract, Inspector-based) ── -->
        <!-- The schema graph shows an abstract view of the DN navigation structure.
             It uses the inspector's tree/force layout — positions here are INDEPENDENT
             of x/y coordinates in GraphCanvas. The two views share node IDs so that
             hover and selection highlight the same node in both views. -->
        <div class="schema-graph-section">
            <div class="graph-mode-bar" role="group" aria-label="Graph layout mode">
                <button
                    class="graph-mode-btn"
                    class:active={schema.graphMode === 'tree'}
                    type="button"
                    aria-pressed={schema.graphMode === 'tree'}
                    onclick={() => setSchemaField('graphMode', 'tree')}
                >Tree</button>
                <button
                    class="graph-mode-btn"
                    class:active={schema.graphMode === 'force'}
                    type="button"
                    aria-pressed={schema.graphMode === 'force'}
                    onclick={() => setSchemaField('graphMode', 'force')}
                >Force</button>
            </div>
            {#if _dnHasResult}
                <!-- Inspector mounts here — its layout is self-contained -->
                <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                <div
                    class="schema-inspector-container"
                    bind:this={schemaGraphContainer}
                    role="img"
                    aria-label="Structure graph. Click nodes to select in canvas."
                ></div>
            {:else}
                <div class="graph-empty-state">
                    <p class="graph-empty">
                        {uploadedData
                            ? 'Select a dimension below to build the structure.'
                            : 'Upload data to see the navigation structure.'}
                    </p>
                </div>
            {/if}
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
                                                <option value="bridgedCousins">Bridged cousins</option>
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
        background: var(--dn-bg);
    }
    /* ── Graph mode toggle bar ── */
    .graph-mode-bar {
        display: flex;
        gap: 4px;
        padding: calc(var(--dn-space) * 0.625) calc(var(--dn-space) * 1.25);
        border-bottom: 1px solid var(--dn-border);
        flex-shrink: 0;
    }
    .graph-mode-btn {
        font-size: 0.75rem;
        font-family: var(--dn-font);
        padding: 2px calc(var(--dn-space) * 0.875);
        border: 1px solid var(--dn-border);
        border-radius: calc(var(--dn-radius) / 2);
        background: var(--dn-bg);
        color: var(--dn-text-muted);
        cursor: pointer;
        transition: background 0.1s, color 0.1s;
    }
    .graph-mode-btn.active {
        background: var(--dn-accent-soft);
        color: var(--dn-accent);
        border-color: var(--dn-accent-light);
    }

    /* ── Inspector container ── */
    .schema-inspector-container {
        width: 100%;
        min-height: 220px;
        overflow: hidden;
        position: relative;
    }
    :global(.schema-inspector-container .dn-inspector-wrapper) {
        width: 100%;
    }
    :global(.schema-inspector-container svg) {
        width: 100%;
        height: auto;
        display: block;
    }
    :global(.schema-inspector-container .dn-inspector-tooltip) {
        font-size: 0.75rem;
        font-family: var(--dn-font);
        background: var(--dn-bg);
        border: 1px solid var(--dn-border);
        border-radius: var(--dn-radius);
        color: var(--dn-text);
        padding: calc(var(--dn-space) * 0.75) calc(var(--dn-space) * 1);
        width: 160px;
    }

    .graph-empty { margin: 0; font-size: 0.8125rem; color: var(--dn-text-muted); }
    .graph-empty-state {
        height: 220px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: calc(var(--dn-space) * 2);
    }

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
