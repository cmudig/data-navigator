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
    import type { ScaffoldConfig } from '../../../store/appState';
    import { buildVegaSpec } from '../../../utils/vegaBuilder';
    import { get } from 'svelte/store';
    import { renderToHidden, positionNodesFromVegaScales } from '../../../utils/scaffoldAdapter';
    import type { VegaEmbedResult } from '../../../utils/scaffoldAdapter';
    import { setScaffoldView } from '../../../store/scaffoldRuntime';

    // ── Store sync ────────────────────────────────────────────────────────────
    let config = $state<ScaffoldConfig | null>(null);
    let uploadedData = $state<Record<string, unknown>[] | null>(null);

    const _unsub = appState.subscribe(s => {
        config = s.scaffoldConfig;
        uploadedData = s.uploadedData;
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
        if (currentCleanup) {
            currentCleanup();
            currentCleanup = null;
        }

        isRendering = true;
        renderError = null;

        try {
            // If field mappings are missing, auto-detect them
            if (!cfg.xField || !cfg.yField) {
                const s = get(appState);
                let xField = cfg.xField;
                let yField = cfg.yField;

                // First try: included schemaState dimensions
                const includedDims = s.schemaState.dimensions.filter(d => d.included);
                xField = xField ?? includedDims.find(d => d.type === 'categorical')?.key;
                yField = yField ?? includedDims.find(d => d.type === 'numerical')?.key;

                // Fallback: all schemaState dimensions (included or not)
                if (!xField || !yField) {
                    const allDims = s.schemaState.dimensions;
                    xField = xField ?? allDims.find(d => d.type === 'categorical')?.key;
                    yField = yField ?? allDims.find(d => d.type === 'numerical')?.key;
                }

                // Last resort: scan first data row for string vs number columns
                if ((!xField || !yField) && s.uploadedData?.[0]) {
                    const row = s.uploadedData[0];
                    xField = xField ?? Object.keys(row).find(k => typeof row[k] === 'string');
                    yField = yField ?? Object.keys(row).find(k => typeof row[k] === 'number');
                }

                if (xField || yField) {
                    cfg = { ...cfg, xField, yField };
                    appState.update(st => ({ ...st, scaffoldConfig: cfg }));
                }
            }

            const data = uploadedData ?? [];
            const spec = buildVegaSpec(cfg, data);
            const { view, cleanup } = await renderToHidden(spec);

            currentCleanup = cleanup;
            currentView = view;
            setScaffoldView(view);

            // Reposition existing leaf nodes using Vega scale functions
            const s = get(appState);
            const allNodes = [...s.nodes.values()];
            const posUpdates = positionNodesFromVegaScales(view, allNodes, cfg);
            if (posUpdates.size > 0) {
                appState.update(st => {
                    const nextNodes = new Map(st.nodes);
                    for (const [id, pos] of posUpdates) {
                        const n = nextNodes.get(id);
                        if (n) nextNodes.set(id, { ...n, ...pos });
                    }
                    return { ...st, nodes: nextNodes };
                });
            }
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

    function onWindowMouseup() {
        activeDrag = null;
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
