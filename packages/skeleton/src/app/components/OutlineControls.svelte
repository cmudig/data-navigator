<script lang="ts">
    import { app, edit } from '../../model/state.svelte';
    import type { Dim, DimensionGroupConfig } from '../../model/doc';

    const { part, dim }: { part: 'root' | 'dimension' | 'division' | 'leaf'; dim?: Dim } = $props();
    const uid = Math.random().toString(36).slice(2, 7);
    const STYLES = [
        ['boundingRect', 'Bounding rect'],
        ['convexHull', 'Convex hull'],
        ['unionOfAll', 'Union of parts'],
        ['line', 'Follow the line'],
        ['rangeRect', 'Range rect'],
        ['rangeBounds', 'Range bounds']
    ];
    const g = $derived(app.pattern.recipe.groups);
    const cfg = $derived(dim ? g.perDimension[dim.key] : null);
    const styles = $derived(STYLES.filter(([v]) => (part === 'root' ? v !== 'line' && !v.startsWith('range') : !v.startsWith('range') || (part === 'division' && dim?.type === 'numerical'))));
    const style = $derived(part === 'root' ? g.rootStrategy : part === 'dimension' ? cfg?.strategy : cfg?.divisionStrategy);
    const pad = $derived(part === 'root' ? g.rootPadding : part === 'dimension' ? cfg?.padding : part === 'division' ? cfg?.divisionPadding : g.leafPadding);
    const custom = $derived(
        part === 'root' ? app.doc.recipe.groups.rootStrategy !== undefined || app.doc.recipe.groups.rootPadding !== undefined : part === 'leaf' ? app.doc.recipe.groups.leafPadding !== undefined : !!dim && !!app.doc.recipe.groups.perDimension[dim.key]
    );
    const name = $derived(part === 'root' ? 'Overview' : part === 'leaf' ? 'Data points' : part === 'dimension' ? `${dim?.key} group` : `${dim?.key} subgroups`);

    function set(patch: { style?: string; pad?: number }) {
        edit('Outline changed', d => {
            const gs = d.recipe.groups;
            if (part === 'root') {
                if (patch.style) gs.rootStrategy = patch.style as never;
                if (patch.pad !== undefined) gs.rootPadding = patch.pad;
            } else if (part === 'leaf') gs.leafPadding = patch.pad;
            else if (dim && cfg) {
                const keys = part === 'dimension' ? (['strategy', 'padding'] as const) : (['divisionStrategy', 'divisionPadding'] as const);
                const next: DimensionGroupConfig = { ...cfg };
                if (patch.style) (next as any)[keys[0]] = patch.style;
                if (patch.pad !== undefined) next[keys[1]] = patch.pad;
                gs.perDimension[dim.key] = next;
            }
        }, true);
    }

    const reset = () =>
        edit('Outline reset', d => {
            const gs = d.recipe.groups;
            if (part === 'root') delete gs.rootStrategy, delete gs.rootPadding;
            else if (part === 'leaf') delete gs.leafPadding;
            else if (dim) delete gs.perDimension[dim.key];
        });
</script>

<div class="outline-row" role="group" aria-label="{name} outline">
    <span class="name">{name}</span>
    {#if part !== 'leaf'}
        <label>
            <span class="visually-hidden">{name} outline style</span>
            <select value={style} onchange={e => set({ style: e.currentTarget.value })}>
                {#each styles as [v, label] (v)}<option value={v}>{label}</option>{/each}
            </select>
        </label>
    {/if}
    <label class="pad" for="pad-{uid}">
        Padding
        <input id="pad-{uid}" type="number" min="0" step="2" value={pad ?? 0} oninput={e => set({ pad: Math.max(0, Number(e.currentTarget.value) || 0) })} />
    </label>
    {#if custom}<button class="link" type="button" onclick={reset}>Use defaults</button>{/if}
</div>

<style>
    .outline-row {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 6px;
        font-size: 0.8125rem;
        margin: 4px 0;
    }

    .name {
        min-width: 7rem;
        font-weight: 600;
    }

    .pad {
        display: inline-flex;
        align-items: center;
        gap: 4px;
    }

    .pad input {
        width: 4rem;
    }

    .link {
        min-height: 0;
        min-width: 0;
        padding: 0;
        border: none;
        background: none;
        color: var(--dn-accent);
        text-decoration: underline;
        font-size: 0.75rem;
    }
</style>
