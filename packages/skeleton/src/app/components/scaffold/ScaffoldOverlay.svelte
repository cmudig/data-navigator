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
    import type { ExtractedMark } from '../../../utils/scaffoldAdapter';
    import { buildVegaSpec } from '../../../utils/vegaBuilder';
    import { renderToHidden, extractMarksFromSVG } from '../../../utils/scaffoldAdapter';
    import type { VegaEmbedResult } from '../../../utils/scaffoldAdapter';

    // Expose the current Vega view so the parent can call extractValues()
    type Props = {
        onMarksUpdated?: (marks: ExtractedMark[]) => void;
        onViewReady?: (view: VegaEmbedResult['view'] | null) => void;
    };
    const { onMarksUpdated, onViewReady }: Props = $props();

    // ── Store sync ────────────────────────────────────────────────────────────
    let config = $state<ScaffoldConfig | null>(null);
    let uploadedData = $state<Record<string, unknown>[] | null>(null);

    const _unsub = appState.subscribe(s => {
        config = s.scaffoldConfig;
        uploadedData = s.uploadedData;
    });
    onDestroy(_unsub);

    // ── Vega lifecycle ────────────────────────────────────────────────────────
    let marks = $state<ExtractedMark[]>([]);
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
            const data = uploadedData ?? [];
            const spec = buildVegaSpec(cfg, data);
            const { container, view, cleanup } = await renderToHidden(spec);

            currentCleanup = cleanup;
            currentView = view;
            onViewReady?.(view);

            const extracted = extractMarksFromSVG(container, cfg);
            marks = extracted;
            onMarksUpdated?.(extracted);
        } catch (err) {
            renderError = String(err);
            marks = [];
            currentView = null;
            onViewReady?.(null);
        } finally {
            isRendering = false;
        }
    }

    // Re-render whenever scaffoldConfig changes
    $effect(() => {
        if (config) {
            triggerRender(config);
        } else {
            marks = [];
            currentView = null;
            onViewReady?.(null);
        }
    });

    onDestroy(() => {
        if (renderTimer) clearTimeout(renderTimer);
        if (currentCleanup) currentCleanup();
    });

    // ── Drag handle logic ─────────────────────────────────────────────────────
    // Drag handles: bounding box (moves offsetX/Y) + 4 padding edges
    type HandleType = 'move' | 'pad-left' | 'pad-top' | 'pad-right' | 'pad-bottom';

    let activeDrag = $state<{
        type: HandleType;
        startClientX: number;
        startClientY: number;
        startOffsetX: number;
        startOffsetY: number;
        startPad: number;
    } | null>(null);

    function onHandleMousedown(e: MouseEvent, type: HandleType) {
        e.stopPropagation();
        if (!config) return;
        activeDrag = {
            type,
            startClientX: e.clientX,
            startClientY: e.clientY,
            startOffsetX: config.offsetX,
            startOffsetY: config.offsetY,
            startPad:
                type === 'pad-left' ? config.paddingLeft
                : type === 'pad-top' ? config.paddingTop
                : type === 'pad-right' ? config.paddingRight
                : config.paddingBottom
        };
    }

    function onWindowMousemove(e: MouseEvent) {
        if (!activeDrag || !config) return;
        const dx = e.clientX - activeDrag.startClientX;
        const dy = e.clientY - activeDrag.startClientY;

        if (activeDrag.type === 'move') {
            appState.update(s => ({
                ...s,
                scaffoldConfig: s.scaffoldConfig
                    ? { ...s.scaffoldConfig, offsetX: activeDrag!.startOffsetX + dx, offsetY: activeDrag!.startOffsetY + dy }
                    : s.scaffoldConfig
            }));
        } else if (activeDrag.type === 'pad-left') {
            appState.update(s => ({
                ...s,
                scaffoldConfig: s.scaffoldConfig
                    ? { ...s.scaffoldConfig, paddingLeft: Math.max(0, activeDrag!.startPad + dx) }
                    : s.scaffoldConfig
            }));
        } else if (activeDrag.type === 'pad-top') {
            appState.update(s => ({
                ...s,
                scaffoldConfig: s.scaffoldConfig
                    ? { ...s.scaffoldConfig, paddingTop: Math.max(0, activeDrag!.startPad + dy) }
                    : s.scaffoldConfig
            }));
        } else if (activeDrag.type === 'pad-right') {
            appState.update(s => ({
                ...s,
                scaffoldConfig: s.scaffoldConfig
                    ? { ...s.scaffoldConfig, paddingRight: Math.max(0, activeDrag!.startPad - dx) }
                    : s.scaffoldConfig
            }));
        } else if (activeDrag.type === 'pad-bottom') {
            appState.update(s => ({
                ...s,
                scaffoldConfig: s.scaffoldConfig
                    ? { ...s.scaffoldConfig, paddingBottom: Math.max(0, activeDrag!.startPad - dy) }
                    : s.scaffoldConfig
            }));
        }
    }

    function onWindowMouseup() {
        activeDrag = null;
    }

    // ── Derived geometry ──────────────────────────────────────────────────────
    // Bounding box of the full scaffold area (plot + padding) in image space
    const totalW = $derived(config ? config.plotWidth + config.paddingLeft + config.paddingRight : 0);
    const totalH = $derived(config ? config.plotHeight + config.paddingTop + config.paddingBottom : 0);
    const ox = $derived(config?.offsetX ?? 0);
    const oy = $derived(config?.offsetY ?? 0);

    // Plot area corners (where data marks live)
    const plotX = $derived(ox + (config?.paddingLeft ?? 0));
    const plotY = $derived(oy + (config?.paddingTop ?? 0));
    const plotW = $derived(config?.plotWidth ?? 0);
    const plotH = $derived(config?.plotHeight ?? 0);

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

    <!-- Scaffold marks -->
    {#each marks as mark, i (i)}
        {#if mark.type === 'rect'}
            <rect
                x={mark.x} y={mark.y}
                width={mark.width} height={mark.height}
                fill="#6366f1"
                fill-opacity="0.35"
                stroke="#4338ca"
                stroke-width="1"
            />
        {:else if mark.type === 'ellipse'}
            <ellipse
                cx={mark.x + mark.width / 2}
                cy={mark.y + mark.height / 2}
                rx={mark.width / 2}
                ry={mark.height / 2}
                fill="#6366f1"
                fill-opacity="0.35"
                stroke="#4338ca"
                stroke-width="1"
            />
        {:else if mark.type === 'path' && mark.pathData}
            <path
                d={mark.pathData}
                fill="#6366f1"
                fill-opacity="0.2"
                stroke="#4338ca"
                stroke-width="1.5"
            />
        {/if}
    {/each}

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

    <!-- Move handle: top-left corner of bounding box -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <rect
        class="drag-handle move-handle"
        x={ox - HANDLE_SIZE / 2} y={oy - HANDLE_SIZE / 2}
        width={HANDLE_SIZE} height={HANDLE_SIZE}
        fill="#6366f1"
        stroke="white"
        stroke-width="1.5"
        style="cursor: move"
        role="presentation"
        onmousedown={(e) => onHandleMousedown(e, 'move')}
    />

    <!-- Padding edge handles -->
    <!-- Left padding -->
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
    <!-- Top padding -->
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
    <!-- Right padding -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <rect
        class="drag-handle pad-handle"
        x={ox + totalW - HANDLE_SIZE / 2} y={oy + totalH / 2 - HANDLE_SIZE / 2}
        width={HANDLE_SIZE} height={HANDLE_SIZE}
        fill="white"
        stroke="#6366f1"
        stroke-width="1.5"
        style="cursor: ew-resize"
        role="presentation"
        onmousedown={(e) => onHandleMousedown(e, 'pad-right')}
    />
    <!-- Bottom padding -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <rect
        class="drag-handle pad-handle"
        x={ox + totalW / 2 - HANDLE_SIZE / 2} y={oy + totalH - HANDLE_SIZE / 2}
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
