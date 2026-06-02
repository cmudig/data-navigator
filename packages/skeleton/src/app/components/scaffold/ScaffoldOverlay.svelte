<script lang="ts">
    /**
     * ScaffoldOverlay — SVG group rendered inside GraphCanvas's scene <g>.
     * Manages the Vega-Lite render lifecycle and draws scaffold marks + drag handles.
     *
     * Coordinate system: marks are in image-space (same as SkeletonNodes).
     * The parent GraphCanvas scene transform (translate/scale) handles pan/zoom automatically.
     */
    import { onDestroy } from 'svelte';
    import { appState } from '../../../store/appState';
    import type { ScaffoldConfig, SchemaState } from '../../../store/appState';
    import { buildVegaSpec, buildSyntheticData } from '../../../utils/vegaBuilder';
    import { get } from 'svelte/store';
    import { renderToHidden, positionNodesFromVegaScales } from '../../../utils/scaffoldAdapter';
    import { detectFieldsForChartType } from '../../../utils/prepAdapter';
    import type { VegaEmbedResult } from '../../../utils/scaffoldAdapter';
    import { setScaffoldView } from '../../../store/scaffoldRuntime';
    import { computeGroupPaths } from '../../../utils/groupShapes';
    import type { DivisionExtents } from '../../../utils/groupShapes';
    import type { BonusRect, GroupShapeConfig } from '../../../store/appState';

    // ── Store sync ────────────────────────────────────────────────────────────
    // $state.raw prevents Svelte 5 from wrapping these in a reactive proxy on each
    // subscriber assignment. Without .raw, every appState.update() (even node-only
    // changes) creates a new proxy object → dirtied signal → Vega $effect re-runs → loop.
    let config = $state.raw<ScaffoldConfig | null>(null);
    let gs = $state.raw<GroupShapeConfig | null>(null);
    let uploadedData = $state.raw<Record<string, unknown>[] | null>(null);
    let schemaState = $state.raw<SchemaState | null>(null);

    const _unsub = appState.subscribe(s => {
        config = s.scaffoldConfig;
        gs = s.scaffoldConfig?.groupShapes ?? null;
        uploadedData = s.uploadedData;
        schemaState = s.schemaState;
    });
    onDestroy(_unsub);

    // ── Vega lifecycle ────────────────────────────────────────────────────────
    let isRendering = $state(false);
    let renderError = $state<string | null>(null);
    let currentView = $state<VegaEmbedResult['view'] | null>(null);
    let currentCleanup: (() => void) | null = null;

    // Debounce Vega re-renders to avoid hammering while user adjusts sliders
    let renderTimer: ReturnType<typeof setTimeout> | null = null;

    async function triggerRender(cfg: ScaffoldConfig) {
        if (renderTimer) clearTimeout(renderTimer);
        renderTimer = setTimeout(() => doRender(cfg), 150);
    }

    async function doRender(cfg: ScaffoldConfig) {
        console.log('[scaffold] doRender');
        if (currentCleanup) {
            currentCleanup();
            currentCleanup = null;
        }

        isRendering = true;
        renderError = null;

        try {
            // If any field mappings are missing, auto-detect them using chart-type-aware logic
            if (!cfg.xField || !cfg.yField || !cfg.colorField) {
                const s = get(appState);
                const prepState = s.prepState;
                const navAnswers = prepState?.qaProgress.chapters.find(c => c.id === 'navigation')?.answers ?? {};

                // Build allColumns fallback: user-confirmed types in insertion order.
                // Falls back to scanning the first data row when no prep has been run.
                let allColumns: { key: string; type: 'categorical' | 'numerical' }[] =
                    (prepState?.variables ?? [])
                        .filter((v: { removed: boolean }) => !v.removed)
                        .map((v: { key: string; type: 'categorical' | 'numerical' }) => ({ key: v.key, type: v.type }));

                if (allColumns.length === 0 && s.uploadedData?.[0]) {
                    const row = s.uploadedData[0];
                    allColumns = Object.keys(row).map(k => ({
                        key: k,
                        type: (typeof row[k] === 'number' ? 'numerical' : 'categorical') as 'categorical' | 'numerical'
                    }));
                }

                // Build enriched dims from schema, adding wizard nav-direction answers
                const buildDims = (dimList: typeof s.schemaState.dimensions) =>
                    dimList.map(d => ({
                        key: d.key,
                        type: d.type,
                        navIndex: d.navIndex,
                        navPreset: typeof navAnswers[`nav-within-${d.key}`] === 'string'
                            ? (navAnswers[`nav-within-${d.key}`] as string)
                            : undefined
                    }));

                let dims = buildDims(s.schemaState.dimensions.filter(d => d.included));
                if (dims.length === 0) {
                    dims = buildDims(s.schemaState.dimensions);
                }

                const detected = detectFieldsForChartType(cfg.chartType, dims, allColumns);
                const xField = cfg.xField ?? detected.xField;
                const yField = cfg.yField ?? detected.yField;
                const colorField = cfg.colorField ?? detected.colorField;

                if (xField !== cfg.xField || yField !== cfg.yField || colorField !== cfg.colorField) {
                    cfg = { ...cfg, xField, yField, colorField };
                    appState.update(st => ({ ...st, scaffoldConfig: cfg }));
                }
            }

            const rawData = uploadedData ?? [];
            // Resolve synthetic data so positionNodesFromVegaScales has real rows
            // for stacked-bar stack-offset computation.
            const resolvedData = cfg.dataMode === 'synthetic' && cfg.syntheticConfig
                ? buildSyntheticData(cfg.syntheticConfig)
                : rawData;

            const spec = buildVegaSpec(cfg, rawData);
            const { view, cleanup } = await renderToHidden(spec);

            currentCleanup = cleanup;
            currentView = view;
            setScaffoldView(view);

            // Reposition existing leaf nodes using Vega scale functions
            const s = get(appState);
            const allNodes = [...s.nodes.values()];
            const posUpdates = positionNodesFromVegaScales(view, allNodes, cfg, resolvedData);
            if (posUpdates.size > 0) {
                appState.update(st => {
                    const nextNodes = new Map(st.nodes);
                    for (const [id, pos] of posUpdates) {
                        const n = nextNodes.get(id);
                        if (n) {
                            let updated = { ...n, x: pos.x, y: pos.y, width: pos.width, height: pos.height };
                            if (pos.pathData !== undefined) updated = { ...updated, pathData: pos.pathData };
                            if (pos.shape !== undefined) updated = { ...updated, renderProperties: { ...n.renderProperties, shape: pos.shape } };
                            nextNodes.set(id, updated);
                        }
                    }
                    return { ...st, nodes: nextNodes };
                });
            }

            // Recompute group paths now that leaf positions are updated
            applyGroupPaths();
        } catch (err) {
            renderError = String(err);
            currentView = null;
            setScaffoldView(null);
        } finally {
            isRendering = false;
        }
    }

    // Re-render whenever scaffoldConfig changes
    $effect(() => {
        if (config) {
            triggerRender(config);
        } else {
            currentView = null;
            setScaffoldView(null);
        }
    });

    onDestroy(() => {
        if (renderTimer) clearTimeout(renderTimer);
        if (currentCleanup) currentCleanup();
    });

    // ── Group path computation ─────────────────────────────────────────────────
    // Separate effect: recomputes group paths whenever groupShapes config changes.
    // Also triggered explicitly from doRender() after leaf positions update.

    let computedRootBbox = $state<{ x: number; y: number; width: number; height: number } | null>(null);

    function applyGroupPaths() {
        const cfg = get(appState).scaffoldConfig;
        if (!cfg?.groupShapes) return;
        const gsCfg = cfg.groupShapes;
        if (!gsCfg.rootEnabled && !gsCfg.dimensionEnabled && !gsCfg.divisionEnabled) return;

        const s = get(appState);
        const allNodes = [...s.nodes.values()];

        // Build dimTypes from schemaState for type-aware defaults in computeGroupPaths
        const dimTypes: Record<string, 'categorical' | 'numerical'> = {};
        for (const dim of (s.schemaState?.dimensions ?? [])) {
            dimTypes[dim.key] = dim.type;
        }

        // Build pixel-extents map for numerical divisions.
        // Reads numericalExtents from the authoritative dnStructure (same source as the
        // inspector), then converts data-space values → pixel positions via Vega scales.
        // This gives computeGroupPaths exact bin-boundary coordinates instead of
        // inferring them from the positions of leaf data points.
        const divisionExtentsMap = new Map<string, DivisionExtents>();
        if (currentView) {
            const dnStr = s.dnStructure as { nodes?: Record<string, { data?: Record<string, unknown> }> } | null;
            type AnyScale = ((v: unknown) => number) & { bandwidth?: () => number };
            const xScale = currentView.scale('x') as AnyScale | undefined;
            const yScale = currentView.scale('y') as AnyScale | undefined;

            for (const node of allNodes) {
                if (node.dnLevel !== 2) continue;
                const dimKey = node.dimensionKey;
                if (!dimKey || dimTypes[dimKey] !== 'numerical') continue;

                const extents = dnStr?.nodes?.[node.id]?.data?.numericalExtents as [number, number] | undefined;
                if (!extents) continue;

                const [dataMin, dataMax] = extents;
                const isXDim = dimKey === cfg.xField;

                if (isXDim && xScale) {
                    const lo = (xScale(dataMin) as number) + cfg.paddingLeft + cfg.offsetX;
                    const hi = (xScale(dataMax) as number) + cfg.paddingLeft + cfg.offsetX;
                    divisionExtentsMap.set(node.id, { dataMin, dataMax, pixelLo: lo, pixelHi: hi });
                } else if (!isXDim && yScale) {
                    // y-axis is inverted: higher data value → smaller pixel y (top of chart)
                    const lo = (yScale(dataMax) as number) + cfg.paddingTop + cfg.offsetY;
                    const hi = (yScale(dataMin) as number) + cfg.paddingTop + cfg.offsetY;
                    divisionExtentsMap.set(node.id, { dataMin, dataMax, pixelLo: lo, pixelHi: hi });
                }
            }
        }

        const paths = computeGroupPaths(allNodes, cfg, dimTypes, divisionExtentsMap);

        // Update computedRootBbox so drag handles work before user overrides anything
        const rootEntry = [...paths.entries()].find(([id]) => allNodes.find(n => n.id === id)?.dnLevel === 0);
        if (rootEntry) computedRootBbox = rootEntry[1].bbox;

        appState.update(st => {
            const nextNodes = new Map(st.nodes);
            // Clear level 0/1/2 path nodes that are no longer in the computed set (disabled levels)
            for (const [id, n] of nextNodes) {
                if ((n.dnLevel === 0 || n.dnLevel === 1 || n.dnLevel === 2)
                    && n.renderProperties.shape === 'path'
                    && !paths.has(id)) {
                    nextNodes.set(id, {
                        ...n,
                        pathData: undefined,
                        renderProperties: { ...n.renderProperties, shape: 'rect' }
                    });
                }
            }
            // Apply computed paths
            for (const [id, { pathData, bbox }] of paths) {
                const n = nextNodes.get(id);
                if (n) {
                    nextNodes.set(id, {
                        ...n,
                        x: bbox.x,
                        y: bbox.y,
                        width: bbox.width,
                        height: bbox.height,
                        pathData,
                        renderProperties: { ...n.renderProperties, shape: 'path' }
                    });
                }
            }
            return { ...st, nodes: nextNodes };
        });
    }

    $effect(() => {
        // React to groupShapes config changes (strategy, padding, bonus rects, per-dim config).
        // Uses `gs` ($state.raw, reference-equality) so layout-only changes (offsetX etc.)
        // that spread config but keep the same groupShapes object do NOT re-fire this effect.
        if (!gs) return;
        gs.rootEnabled; gs.rootStrategy; gs.rootPadding;
        gs.dimensionEnabled;
        gs.divisionEnabled;
        // Stringify to catch nested changes in perDimension and bonus rects
        JSON.stringify(gs.perDimension);
        JSON.stringify(gs.dimensionBonusRects);
        JSON.stringify(gs.divisionBonusRects);
        // rootBoundingRectOverride changes (from drag handles or panel inputs)
        JSON.stringify(gs.rootBoundingRectOverride);

        applyGroupPaths();
    });

    // ── Drag handle logic ─────────────────────────────────────────────────────
    // ── Drag handle logic ─────────────────────────────────────────────────────
    // 4 padding inner-boundary handles + 8 resize handles (4 edges + 4 corners).
    // Left/top resize handles also shift offsetX/Y so the opposite edge stays fixed.
    type HandleType =
        | 'pad-left' | 'pad-top' | 'pad-right' | 'pad-bottom'
        | 'resize-left' | 'resize-top' | 'resize-right' | 'resize-bottom'
        | 'resize-tl' | 'resize-tr' | 'resize-bl' | 'resize-br';

    let activeDrag = $state<{
        type: HandleType;
        startClientX: number;
        startClientY: number;
        startPad: number;
        startW: number;
        startH: number;
        startOX: number;
        startOY: number;
    } | null>(null);

    function onHandleMousedown(e: MouseEvent, type: HandleType) {
        e.stopPropagation();
        if (!config) return;
        activeDrag = {
            type,
            startClientX: e.clientX,
            startClientY: e.clientY,
            startPad:
                type === 'pad-left' ? config.paddingLeft
                : type === 'pad-top' ? config.paddingTop
                : type === 'pad-right' ? config.paddingRight
                : config.paddingBottom,
            startW: config.plotWidth,
            startH: config.plotHeight,
            startOX: config.offsetX,
            startOY: config.offsetY
        };
    }

    function onWindowMousemove(e: MouseEvent) {
        // Handle root bounding rect corner drag
        if (activeRootRectDrag) {
            const { corner, startClientX, startClientY, startRect: sr } = activeRootRectDrag;
            const dx = e.clientX - startClientX;
            const dy = e.clientY - startClientY;
            let { x, y, width, height } = sr;
            if (corner === 'tl') {
                x = sr.x + dx; y = sr.y + dy;
                width = Math.max(10, sr.width - dx); height = Math.max(10, sr.height - dy);
            } else if (corner === 'tr') {
                y = sr.y + dy;
                width = Math.max(10, sr.width + dx); height = Math.max(10, sr.height - dy);
            } else if (corner === 'bl') {
                x = sr.x + dx;
                width = Math.max(10, sr.width - dx); height = Math.max(10, sr.height + dy);
            } else { // br
                width = Math.max(10, sr.width + dx); height = Math.max(10, sr.height + dy);
            }
            appState.update(s => {
                if (!s.scaffoldConfig?.groupShapes) return s;
                return {
                    ...s,
                    scaffoldConfig: {
                        ...s.scaffoldConfig,
                        groupShapes: { ...s.scaffoldConfig.groupShapes, rootBoundingRectOverride: { x, y, width, height } }
                    }
                };
            });
            return;
        }

        // Handle bonus rect drag
        if (activeBonusDrag) {
            const { level, key, mode, startClientX, startClientY, startRect } = activeBonusDrag;
            const dx = e.clientX - startClientX;
            const dy = e.clientY - startClientY;
            const updated: BonusRect = mode === 'move'
                ? { ...startRect, x: startRect.x + dx, y: startRect.y + dy }
                : { ...startRect,
                    width: Math.max(10, startRect.width + dx),
                    height: Math.max(10, startRect.height + dy) };
            appState.update(s => {
                if (!s.scaffoldConfig?.groupShapes) return s;
                const gs = s.scaffoldConfig.groupShapes;
                const field = level === 'dimension' ? 'dimensionBonusRects' : 'divisionBonusRects';
                return {
                    ...s,
                    scaffoldConfig: {
                        ...s.scaffoldConfig,
                        groupShapes: { ...gs, [field]: { ...gs[field], [key]: updated } }
                    }
                };
            });
            return;
        }

        if (!activeDrag || !config) return;
        const dx = e.clientX - activeDrag.startClientX;
        const dy = e.clientY - activeDrag.startClientY;
        const { startPad, startW, startH, startOX, startOY } = activeDrag;

        // Padding handles — adjust padding, outer box stays fixed
        if (activeDrag.type === 'pad-left') {
            appState.update(s => ({
                ...s,
                scaffoldConfig: s.scaffoldConfig
                    ? { ...s.scaffoldConfig, paddingLeft: Math.max(0, startPad + dx) }
                    : s.scaffoldConfig
            }));
        } else if (activeDrag.type === 'pad-top') {
            appState.update(s => ({
                ...s,
                scaffoldConfig: s.scaffoldConfig
                    ? { ...s.scaffoldConfig, paddingTop: Math.max(0, startPad + dy) }
                    : s.scaffoldConfig
            }));
        } else if (activeDrag.type === 'pad-right') {
            appState.update(s => ({
                ...s,
                scaffoldConfig: s.scaffoldConfig
                    ? { ...s.scaffoldConfig, paddingRight: Math.max(0, startPad - dx) }
                    : s.scaffoldConfig
            }));
        } else if (activeDrag.type === 'pad-bottom') {
            appState.update(s => ({
                ...s,
                scaffoldConfig: s.scaffoldConfig
                    ? { ...s.scaffoldConfig, paddingBottom: Math.max(0, startPad - dy) }
                    : s.scaffoldConfig
            }));

        // Resize handles — right/bottom grow in place; left/top also shift offset
        } else if (activeDrag.type === 'resize-right') {
            appState.update(s => ({ ...s, scaffoldConfig: s.scaffoldConfig
                ? { ...s.scaffoldConfig, plotWidth: Math.max(10, startW + dx) }
                : s.scaffoldConfig }));
        } else if (activeDrag.type === 'resize-bottom') {
            appState.update(s => ({ ...s, scaffoldConfig: s.scaffoldConfig
                ? { ...s.scaffoldConfig, plotHeight: Math.max(10, startH + dy) }
                : s.scaffoldConfig }));
        } else if (activeDrag.type === 'resize-left') {
            const newW = Math.max(10, startW - dx);
            appState.update(s => ({ ...s, scaffoldConfig: s.scaffoldConfig
                ? { ...s.scaffoldConfig, plotWidth: newW, offsetX: startOX + startW - newW }
                : s.scaffoldConfig }));
        } else if (activeDrag.type === 'resize-top') {
            const newH = Math.max(10, startH - dy);
            appState.update(s => ({ ...s, scaffoldConfig: s.scaffoldConfig
                ? { ...s.scaffoldConfig, plotHeight: newH, offsetY: startOY + startH - newH }
                : s.scaffoldConfig }));

        // Corner handles
        } else if (activeDrag.type === 'resize-br') {
            appState.update(s => ({ ...s, scaffoldConfig: s.scaffoldConfig
                ? { ...s.scaffoldConfig, plotWidth: Math.max(10, startW + dx), plotHeight: Math.max(10, startH + dy) }
                : s.scaffoldConfig }));
        } else if (activeDrag.type === 'resize-tl') {
            const newW = Math.max(10, startW - dx);
            const newH = Math.max(10, startH - dy);
            appState.update(s => ({ ...s, scaffoldConfig: s.scaffoldConfig
                ? { ...s.scaffoldConfig, plotWidth: newW, plotHeight: newH,
                    offsetX: startOX + startW - newW, offsetY: startOY + startH - newH }
                : s.scaffoldConfig }));
        } else if (activeDrag.type === 'resize-tr') {
            const newH = Math.max(10, startH - dy);
            appState.update(s => ({ ...s, scaffoldConfig: s.scaffoldConfig
                ? { ...s.scaffoldConfig, plotWidth: Math.max(10, startW + dx), plotHeight: newH,
                    offsetY: startOY + startH - newH }
                : s.scaffoldConfig }));
        } else if (activeDrag.type === 'resize-bl') {
            const newW = Math.max(10, startW - dx);
            appState.update(s => ({ ...s, scaffoldConfig: s.scaffoldConfig
                ? { ...s.scaffoldConfig, plotWidth: newW, plotHeight: Math.max(10, startH + dy),
                    offsetX: startOX + startW - newW }
                : s.scaffoldConfig }));
        }
    }

    // ── Root bounding rect drag ───────────────────────────────────────────────
    type RootRectDrag = {
        corner: 'tl' | 'tr' | 'bl' | 'br';
        startClientX: number;
        startClientY: number;
        startRect: { x: number; y: number; width: number; height: number };
    };
    let activeRootRectDrag = $state<RootRectDrag | null>(null);

    function onRootRectCornerMousedown(e: MouseEvent, corner: 'tl' | 'tr' | 'bl' | 'br') {
        e.stopPropagation();
        const rr = config?.groupShapes?.rootBoundingRectOverride ?? computedRootBbox;
        if (!rr) return;
        activeRootRectDrag = {
            corner,
            startClientX: e.clientX,
            startClientY: e.clientY,
            startRect: { ...rr }
        };
    }

    // ── Bonus rect drag ───────────────────────────────────────────────────────
    type BonusRectDrag = {
        level: 'dimension' | 'division';
        key: string;
        mode: 'move' | 'resize';
        startClientX: number;
        startClientY: number;
        startRect: BonusRect;
    };
    let activeBonusDrag = $state<BonusRectDrag | null>(null);

    function onBonusRectMousedown(
        e: MouseEvent,
        level: 'dimension' | 'division',
        key: string,
        mode: 'move' | 'resize',
        br: BonusRect
    ) {
        e.stopPropagation();
        activeBonusDrag = {
            level, key, mode,
            startClientX: e.clientX,
            startClientY: e.clientY,
            startRect: { ...br }
        };
    }

    function onWindowMouseup() {
        activeDrag = null;
        activeBonusDrag = null;
        activeRootRectDrag = null;
    }

    // ── Derived geometry ──────────────────────────────────────────────────────
    // plotWidth/plotHeight are the OUTER box (border-box model).
    // Padding is inside that box; the mark area is the inner region.
    const totalW = $derived(config?.plotWidth ?? 0);
    const totalH = $derived(config?.plotHeight ?? 0);
    const ox = $derived(config?.offsetX ?? 0);
    const oy = $derived(config?.offsetY ?? 0);

    // Mark area corners (where data marks live = outer minus padding)
    const plotX = $derived(ox + (config?.paddingLeft ?? 0));
    const plotY = $derived(oy + (config?.paddingTop ?? 0));
    const plotW = $derived(config ? config.plotWidth - config.paddingLeft - config.paddingRight : 0);
    const plotH = $derived(config ? config.plotHeight - config.paddingTop - config.paddingBottom : 0);

    // Handle size (in image pixels; parent scale handles zoom)
    const HANDLE_SIZE = 10;
</script>

<!-- Attach global mouse events for drag -->
<svelte:window onmousemove={onWindowMousemove} onmouseup={onWindowMouseup} />

<!-- SVG group — rendered inside GraphCanvas's scene <g>, inherits transform -->
<g class="scaffold-overlay" aria-label="Scaffold overlay" aria-hidden="true" pointer-events="none">

    <!-- Outer bounding box (full chart area including axis space) -->
    <rect
        x={ox} y={oy}
        width={totalW} height={totalH}
        fill="none"
        stroke="#6366f1"
        stroke-width="1"
        stroke-dasharray="6 3"
        opacity="0.5"
    />

    <!-- Plot area (where marks live) -->
    <rect
        x={plotX} y={plotY}
        width={plotW} height={plotH}
        fill="rgba(99,102,241,0.04)"
        stroke="#6366f1"
        stroke-width="1"
        opacity="0.7"
    />

    <!-- Status indicator -->
    {#if isRendering}
        <text x={ox + 4} y={oy - 6} font-size="10" fill="#6366f1" opacity="0.8">Rendering…</text>
    {/if}
    {#if renderError}
        <text x={ox + 4} y={oy - 6} font-size="10" fill="#dc2626">Error: {renderError}</text>
    {/if}

</g>

<!-- Drag handles — pointer-events: all (need interaction) -->
<!-- Placed outside the aria-hidden group so they can receive pointer events -->
<g class="scaffold-handles" pointer-events="all">

    <!-- Resize handles on outer box edges -->
    <!-- Left edge — resize width + shift offsetX -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <rect
        class="drag-handle resize-handle"
        x={ox - HANDLE_SIZE / 2} y={oy + totalH / 2 - HANDLE_SIZE / 2}
        width={HANDLE_SIZE} height={HANDLE_SIZE}
        fill="#6366f1"
        stroke="white"
        stroke-width="1.5"
        style="cursor: ew-resize"
        role="presentation"
        onmousedown={(e) => onHandleMousedown(e, 'resize-left')}
    />
    <!-- Right edge — resize width -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <rect
        class="drag-handle resize-handle"
        x={ox + totalW - HANDLE_SIZE / 2} y={oy + totalH / 2 - HANDLE_SIZE / 2}
        width={HANDLE_SIZE} height={HANDLE_SIZE}
        fill="#6366f1"
        stroke="white"
        stroke-width="1.5"
        style="cursor: ew-resize"
        role="presentation"
        onmousedown={(e) => onHandleMousedown(e, 'resize-right')}
    />
    <!-- Top edge — resize height + shift offsetY -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <rect
        class="drag-handle resize-handle"
        x={ox + totalW / 2 - HANDLE_SIZE / 2} y={oy - HANDLE_SIZE / 2}
        width={HANDLE_SIZE} height={HANDLE_SIZE}
        fill="#6366f1"
        stroke="white"
        stroke-width="1.5"
        style="cursor: ns-resize"
        role="presentation"
        onmousedown={(e) => onHandleMousedown(e, 'resize-top')}
    />
    <!-- Bottom edge — resize height -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <rect
        class="drag-handle resize-handle"
        x={ox + totalW / 2 - HANDLE_SIZE / 2} y={oy + totalH - HANDLE_SIZE / 2}
        width={HANDLE_SIZE} height={HANDLE_SIZE}
        fill="#6366f1"
        stroke="white"
        stroke-width="1.5"
        style="cursor: ns-resize"
        role="presentation"
        onmousedown={(e) => onHandleMousedown(e, 'resize-bottom')}
    />
    <!-- Top-left corner — resize both + shift offset -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <rect
        class="drag-handle resize-handle"
        x={ox - HANDLE_SIZE / 2} y={oy - HANDLE_SIZE / 2}
        width={HANDLE_SIZE} height={HANDLE_SIZE}
        fill="#6366f1"
        stroke="white"
        stroke-width="1.5"
        style="cursor: nwse-resize"
        role="presentation"
        onmousedown={(e) => onHandleMousedown(e, 'resize-tl')}
    />
    <!-- Top-right corner — resize width + shift offsetY -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <rect
        class="drag-handle resize-handle"
        x={ox + totalW - HANDLE_SIZE / 2} y={oy - HANDLE_SIZE / 2}
        width={HANDLE_SIZE} height={HANDLE_SIZE}
        fill="#6366f1"
        stroke="white"
        stroke-width="1.5"
        style="cursor: nesw-resize"
        role="presentation"
        onmousedown={(e) => onHandleMousedown(e, 'resize-tr')}
    />
    <!-- Bottom-left corner — resize height + shift offsetX -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <rect
        class="drag-handle resize-handle"
        x={ox - HANDLE_SIZE / 2} y={oy + totalH - HANDLE_SIZE / 2}
        width={HANDLE_SIZE} height={HANDLE_SIZE}
        fill="#6366f1"
        stroke="white"
        stroke-width="1.5"
        style="cursor: nesw-resize"
        role="presentation"
        onmousedown={(e) => onHandleMousedown(e, 'resize-bl')}
    />
    <!-- Bottom-right corner — resize both -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <rect
        class="drag-handle resize-handle"
        x={ox + totalW - HANDLE_SIZE / 2} y={oy + totalH - HANDLE_SIZE / 2}
        width={HANDLE_SIZE} height={HANDLE_SIZE}
        fill="#6366f1"
        stroke="white"
        stroke-width="1.5"
        style="cursor: nwse-resize"
        role="presentation"
        onmousedown={(e) => onHandleMousedown(e, 'resize-br')}
    />

    <!-- Root bounding rect resize handles (4 corners) -->
    {#if config?.groupShapes?.rootEnabled && config.groupShapes.rootStrategy === 'boundingRect' && (config.groupShapes.rootBoundingRectOverride ?? computedRootBbox)}
        {@const rr = config.groupShapes.rootBoundingRectOverride ?? computedRootBbox!}
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <rect class="drag-handle resize-handle"
            x={rr.x - HANDLE_SIZE / 2} y={rr.y - HANDLE_SIZE / 2}
            width={HANDLE_SIZE} height={HANDLE_SIZE}
            fill="#6366f1" stroke="white" stroke-width="1.5"
            style="cursor: nwse-resize" role="presentation"
            onmousedown={(e) => onRootRectCornerMousedown(e, 'tl')}
        />
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <rect class="drag-handle resize-handle"
            x={rr.x + rr.width - HANDLE_SIZE / 2} y={rr.y - HANDLE_SIZE / 2}
            width={HANDLE_SIZE} height={HANDLE_SIZE}
            fill="#6366f1" stroke="white" stroke-width="1.5"
            style="cursor: nesw-resize" role="presentation"
            onmousedown={(e) => onRootRectCornerMousedown(e, 'tr')}
        />
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <rect class="drag-handle resize-handle"
            x={rr.x - HANDLE_SIZE / 2} y={rr.y + rr.height - HANDLE_SIZE / 2}
            width={HANDLE_SIZE} height={HANDLE_SIZE}
            fill="#6366f1" stroke="white" stroke-width="1.5"
            style="cursor: nesw-resize" role="presentation"
            onmousedown={(e) => onRootRectCornerMousedown(e, 'bl')}
        />
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <rect class="drag-handle resize-handle"
            x={rr.x + rr.width - HANDLE_SIZE / 2} y={rr.y + rr.height - HANDLE_SIZE / 2}
            width={HANDLE_SIZE} height={HANDLE_SIZE}
            fill="#6366f1" stroke="white" stroke-width="1.5"
            style="cursor: nwse-resize" role="presentation"
            onmousedown={(e) => onRootRectCornerMousedown(e, 'br')}
        />
    {/if}

    <!-- Bonus rect ghost nodes (dimension + division) -->
    {#if config?.groupShapes}
        {#each Object.entries(config.groupShapes.dimensionBonusRects) as [dimKey, br] (dimKey)}
            {#if br.enabled}
                <rect
                    x={br.x} y={br.y} width={br.width} height={br.height}
                    fill="rgba(99,102,241,0.1)"
                    stroke="#818cf8"
                    stroke-width="1.5"
                    stroke-dasharray="5 3"
                    pointer-events="none"
                />
                <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                <rect
                    class="drag-handle bonus-handle"
                    x={br.x + br.width / 2 - HANDLE_SIZE / 2}
                    y={br.y + br.height / 2 - HANDLE_SIZE / 2}
                    width={HANDLE_SIZE} height={HANDLE_SIZE}
                    fill="#818cf8" stroke="white" stroke-width="1.5"
                    style="cursor: move"
                    role="presentation"
                    onmousedown={(e) => onBonusRectMousedown(e, 'dimension', dimKey, 'move', br)}
                />
                <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                <rect
                    class="drag-handle bonus-handle"
                    x={br.x + br.width - HANDLE_SIZE / 2}
                    y={br.y + br.height - HANDLE_SIZE / 2}
                    width={HANDLE_SIZE} height={HANDLE_SIZE}
                    fill="#818cf8" stroke="white" stroke-width="1.5"
                    style="cursor: nwse-resize"
                    role="presentation"
                    onmousedown={(e) => onBonusRectMousedown(e, 'dimension', dimKey, 'resize', br)}
                />
            {/if}
        {/each}
        {#each Object.entries(config.groupShapes.divisionBonusRects) as [divId, br] (divId)}
            {#if br.enabled}
                <rect
                    x={br.x} y={br.y} width={br.width} height={br.height}
                    fill="rgba(99,102,241,0.1)"
                    stroke="#a5b4fc"
                    stroke-width="1.5"
                    stroke-dasharray="5 3"
                    pointer-events="none"
                />
                <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                <rect
                    class="drag-handle bonus-handle"
                    x={br.x + br.width / 2 - HANDLE_SIZE / 2}
                    y={br.y + br.height / 2 - HANDLE_SIZE / 2}
                    width={HANDLE_SIZE} height={HANDLE_SIZE}
                    fill="#a5b4fc" stroke="white" stroke-width="1.5"
                    style="cursor: move"
                    role="presentation"
                    onmousedown={(e) => onBonusRectMousedown(e, 'division', divId, 'move', br)}
                />
                <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                <rect
                    class="drag-handle bonus-handle"
                    x={br.x + br.width - HANDLE_SIZE / 2}
                    y={br.y + br.height - HANDLE_SIZE / 2}
                    width={HANDLE_SIZE} height={HANDLE_SIZE}
                    fill="#a5b4fc" stroke="white" stroke-width="1.5"
                    style="cursor: nwse-resize"
                    role="presentation"
                    onmousedown={(e) => onBonusRectMousedown(e, 'division', divId, 'resize', br)}
                />
            {/if}
        {/each}
    {/if}

    <!-- Padding inner boundary handles -->
    <!-- Left padding — handle sits on the inner left boundary of the mark area -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <rect
        class="drag-handle pad-handle"
        x={plotX - HANDLE_SIZE / 2} y={oy + totalH / 2 - HANDLE_SIZE / 2}
        width={HANDLE_SIZE} height={HANDLE_SIZE}
        fill="white"
        stroke="#6366f1"
        stroke-width="1.5"
        style="cursor: ew-resize"
        role="presentation"
        onmousedown={(e) => onHandleMousedown(e, 'pad-left')}
    />
    <!-- Top padding — handle sits on the inner top boundary of the mark area -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <rect
        class="drag-handle pad-handle"
        x={ox + totalW / 2 - HANDLE_SIZE / 2} y={plotY - HANDLE_SIZE / 2}
        width={HANDLE_SIZE} height={HANDLE_SIZE}
        fill="white"
        stroke="#6366f1"
        stroke-width="1.5"
        style="cursor: ns-resize"
        role="presentation"
        onmousedown={(e) => onHandleMousedown(e, 'pad-top')}
    />
    <!-- Right padding — handle sits on the inner right boundary of the mark area -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <rect
        class="drag-handle pad-handle"
        x={plotX + plotW - HANDLE_SIZE / 2} y={oy + totalH / 2 - HANDLE_SIZE / 2}
        width={HANDLE_SIZE} height={HANDLE_SIZE}
        fill="white"
        stroke="#6366f1"
        stroke-width="1.5"
        style="cursor: ew-resize"
        role="presentation"
        onmousedown={(e) => onHandleMousedown(e, 'pad-right')}
    />
    <!-- Bottom padding — handle sits on the inner bottom boundary of the mark area -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <rect
        class="drag-handle pad-handle"
        x={ox + totalW / 2 - HANDLE_SIZE / 2} y={plotY + plotH - HANDLE_SIZE / 2}
        width={HANDLE_SIZE} height={HANDLE_SIZE}
        fill="white"
        stroke="#6366f1"
        stroke-width="1.5"
        style="cursor: ns-resize"
        role="presentation"
        onmousedown={(e) => onHandleMousedown(e, 'pad-bottom')}
    />

</g>

<style>
    .drag-handle {
        rx: 2px;
    }
</style>
