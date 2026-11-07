<script lang="ts">
    import { app, edit } from '../../../model/state.svelte';
    import type { Doc, Geo } from '../../../model/doc';

    const { scale = 1 }: { scale?: number } = $props();
    const H = 10;
    type Dir = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
    const DIRS: Dir[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
    const CURSOR: Record<string, string> = { n: 'ns', s: 'ns', e: 'ew', w: 'ew', nw: 'nwse', se: 'nwse', ne: 'nesw', sw: 'nesw' };

    const config = $derived(app.scaffold);
    const groups = $derived(app.doc.recipe.groups);
    const rootId = $derived(app.doc.recipe.root.id);
    const rootGeo = $derived(app.doc.recipe.root.enabled && groups.rootEnabled && groups.rootStrategy === 'boundingRect' ? app.graph.nodes.get(rootId)?.geo : undefined);
    const box = $derived(config ? { x: config.offsetX, y: config.offsetY, width: config.plotWidth, height: config.plotHeight } : null);
    const plot = $derived(
        config && box ? { x: box.x + config.paddingLeft, y: box.y + config.paddingTop, width: box.width - config.paddingLeft - config.paddingRight, height: box.height - config.paddingTop - config.paddingBottom } : null
    );

    function resized(s: Geo, dir: string, dx: number, dy: number): Geo {
        const g = { ...s };
        if (dir.includes('w')) (g.width = Math.max(10, s.width - dx)), (g.x = s.x + s.width - g.width);
        if (dir.includes('e')) g.width = Math.max(10, s.width + dx);
        if (dir.includes('n')) (g.height = Math.max(10, s.height - dy)), (g.y = s.y + s.height - g.height);
        if (dir.includes('s')) g.height = Math.max(10, s.height + dy);
        return g;
    }
    const at = (g: Geo, dir: string) => ({
        x: dir.includes('w') ? g.x : dir.includes('e') ? g.x + g.width : g.x + g.width / 2,
        y: dir.includes('n') ? g.y : dir.includes('s') ? g.y + g.height : g.y + g.height / 2
    });

    let drag: { sx: number; sy: number; k: number; label: string; apply: (dx: number, dy: number) => (d: Doc) => void } | null = null;

    function start(e: MouseEvent, label: string, apply: NonNullable<typeof drag>['apply']) {
        e.stopPropagation();
        const k = ((e.currentTarget as SVGGraphicsElement).ownerSVGElement?.getScreenCTM()?.a ?? 1) * scale;
        drag = { sx: e.clientX, sy: e.clientY, k, label, apply };
    }

    function onMove(e: MouseEvent) {
        if (!drag) return;
        edit(drag.label, drag.apply((e.clientX - drag.sx) / drag.k, (e.clientY - drag.sy) / drag.k), true);
    }

    const boxHandle = (dir: Dir) => (dx: number, dy: number) => (d: Doc) => {
        const g = resized(box!, dir, dx, dy);
        Object.assign(d.scaffold!, { offsetX: g.x, offsetY: g.y, plotWidth: g.width, plotHeight: g.height });
    };
    const padHandle = (side: 'Left' | 'Top' | 'Right' | 'Bottom') => {
        const s = config![`padding${side}`];
        const sign = side === 'Left' || side === 'Top' ? 1 : -1;
        return (dx: number, dy: number) => (d: Doc) => (d.scaffold![`padding${side}`] = Math.max(0, s + sign * (side === 'Left' || side === 'Right' ? dx : dy)));
    };
    const rootHandle = (dir: Dir) => {
        const s = rootGeo!;
        return (dx: number, dy: number) => (d: Doc) => (d.overrides.nodes[rootId] = { ...d.overrides.nodes[rootId], geo: resized({ x: s.x, y: s.y, width: s.width, height: s.height }, dir, dx, dy) });
    };
    const bonusHandle = (field: 'dimensionBonusRects' | 'divisionBonusRects', key: string, mode: 'move' | 'se') => {
        const s = groups[field][key];
        return (dx: number, dy: number) => (d: Doc) =>
            (d.recipe.groups[field][key] = mode === 'move' ? { ...s, x: s.x + dx, y: s.y + dy } : { ...s, ...resized(s, 'se', dx, dy) });
    };

    const bonusRects = $derived(
        (['dimensionBonusRects', 'divisionBonusRects'] as const).flatMap(field => Object.entries(groups[field]).filter(([, r]) => r.enabled).map(([key, r]) => ({ field, key, r })))
    );
</script>

<svelte:window onmousemove={onMove} onmouseup={() => (drag = null)} />

{#if config && box && plot}
    <g class="scaffold-overlay" aria-hidden="true" pointer-events="none">
        <rect {...box} fill="none" stroke="#6366f1" stroke-width="1" stroke-dasharray="6 3" opacity="0.5" />
        <rect {...plot} fill="rgba(99,102,241,0.04)" stroke="#6366f1" stroke-width="1" opacity="0.7" />
        {#if app.error}
            <text x={box.x + 4} y={box.y - 6} font-size="10" fill="#dc2626">Error: {app.error}</text>
        {:else if !app.measure}
            <text x={box.x + 4} y={box.y - 6} font-size="10" fill="#6366f1" opacity="0.8">Rendering…</text>
        {/if}
        {#each bonusRects as b (b.field + b.key)}
            <rect {...b.r} fill="rgba(99,102,241,0.1)" stroke="#818cf8" stroke-width="1.5" stroke-dasharray="5 3" />
        {/each}
    </g>

    <g class="scaffold-handles" pointer-events="all">
        {#each DIRS as dir (dir)}
            {@const p = at(box, dir)}
            <rect class="drag-handle" x={p.x - H / 2} y={p.y - H / 2} width={H} height={H} fill="#6366f1" stroke="white" stroke-width="1.5" style="cursor: {CURSOR[dir]}-resize" role="presentation" onmousedown={e => start(e, 'Resized scaffold', boxHandle(dir))} />
        {/each}
        {#each [['Left', 'w'], ['Top', 'n'], ['Right', 'e'], ['Bottom', 's']] as const as [side, dir] (side)}
            {@const p = at(plot, dir)}
            <rect class="drag-handle" x={p.x - H / 2} y={p.y - H / 2} width={H} height={H} fill="white" stroke="#6366f1" stroke-width="1.5" style="cursor: {CURSOR[dir]}-resize" role="presentation" onmousedown={e => start(e, 'Adjusted padding', padHandle(side))} />
        {/each}
        {#if rootGeo}
            {#each ['nw', 'ne', 'sw', 'se'] as const as dir (dir)}
                {@const p = at(rootGeo, dir)}
                <rect class="drag-handle" x={p.x - H / 2} y={p.y - H / 2} width={H} height={H} fill="#6366f1" stroke="white" stroke-width="1.5" style="cursor: {CURSOR[dir]}-resize" role="presentation" onmousedown={e => start(e, 'Resized root outline', rootHandle(dir))} />
            {/each}
        {/if}
        {#each bonusRects as b (b.field + b.key)}
            {#each [['move', at(b.r, 'c')], ['se', at(b.r, 'se')]] as const as [mode, p] (mode)}
                <rect class="drag-handle" x={p.x - H / 2} y={p.y - H / 2} width={H} height={H} fill="#a5b4fc" stroke="white" stroke-width="1.5" style="cursor: {mode === 'move' ? 'move' : 'nwse-resize'}" role="presentation" onmousedown={e => start(e, 'Adjusted extra outline', bonusHandle(b.field, b.key, mode))} />
            {/each}
        {/each}
    </g>
{/if}

<style>
    .drag-handle {
        rx: 2px;
    }
</style>
