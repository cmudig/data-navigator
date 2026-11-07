<script lang="ts">
    import { app, edit } from '../../model/state.svelte';
    import type { LabelTemplate } from '../../model/doc';
    import { templateFor } from '../../runtime/dn-runtime.js';
    import NavKeysPanel from './NavKeysPanel.svelte';
    import OutlineControls from './OutlineControls.svelte';
    import LabelBuilder from './prep/LabelBuilder.svelte';

    const { node }: { node: any } = $props();
    const s = $derived(app.structure);
    const n = $derived(s.nodes[node.id] ?? node);
    const role = $derived(n.manual ? 'manual' : n.dimensionLevel === 0 ? 'root' : n.dimensionLevel === 1 ? 'dimension' : n.dimensionLevel === 2 ? 'division' : 'leaf');
    const keys = $derived<string[]>(
        role === 'dimension' || role === 'division' ? [n.derivedNode] : role === 'leaf' ? [...new Set<string>((s.context?.parents[n.id] ?? []).map((p: any) => p.key))] : []
    );
    const dims = $derived(app.doc.recipe.dimensions.filter(d => keys.includes(d.key)));
    const level = $derived(({ root: 0, dimension: 1, division: 2, leaf: 3, manual: 3 } as const)[role]);
    const own = $derived(!!app.doc.overrides.nodes[n.id]?.semantics);
    let scope = $state<'shared' | 'node'>('shared');
    $effect(() => {
        scope = own ? 'node' : 'shared';
    });
    const value = $derived(templateFor(n, app.pattern, s.context) as LabelTemplate);
    const noun = $derived(value.name || ['overview', 'group', 'subgroup', 'data point'][level]);
    const placed = $derived(!!app.doc.scaffold || app.built);

    function setLabel(t: LabelTemplate) {
        const id = n.id;
        const key = n.derivedNode;
        edit(
            'Edited announcement',
            d => {
                const L = d.recipe.labels;
                if (role === 'manual') d.overrides.added.nodes[id].label = t.template;
                else if (scope === 'node') d.overrides.nodes[id] = { ...d.overrides.nodes[id], semantics: t };
                else if (role === 'root') L.level0 = t;
                else if (role === 'dimension') L.perDimension[key] = t;
                else if (role === 'division') L.perDivision[key] = t;
                else L.leaves = t;
            },
            true
        );
    }
    const shareAgain = () => edit('Use the shared label', d => delete d.overrides.nodes[n.id].semantics);
</script>

<section class="node-editor" aria-label="Edit structure at this node">
    <p class="hint">Changes apply right away. Use “Re-focus last element” or the chat to keep navigating from here.</p>

    {#if role !== 'manual'}
        <h5>Keys</h5>
        <NavKeysPanel only={keys} between={role === 'root' || role === 'dimension'} title={role === 'leaf' ? 'Keys for the dimensions this point belongs to' : 'Keys for this part of the structure'} />
    {/if}

    <h5>Outline</h5>
    {#if !placed}<p class="hint">Outlines appear once nodes are placed over the chart (Scaffold in the Editor).</p>{/if}
    {#if role === 'root'}
        <OutlineControls part="root" />
    {:else if role === 'dimension' && dims[0]}
        <OutlineControls part="dimension" dim={dims[0]} />
        <OutlineControls part="division" dim={dims[0]} />
    {:else if role === 'division' && dims[0]}
        <OutlineControls part="division" dim={dims[0]} />
    {:else if role === 'leaf'}
        <OutlineControls part="leaf" />
    {:else}
        <p class="hint">Hand-drawn nodes keep the shape you drew. Edit it in the Editor.</p>
    {/if}

    <h5>Announcement</h5>
    {#if role !== 'manual'}
        <fieldset class="scope">
            <legend class="visually-hidden">Apply announcement changes to</legend>
            <label><input type="radio" name="scope-{n.id}" value="shared" bind:group={scope} /> Every {noun} at this level</label>
            <label><input type="radio" name="scope-{n.id}" value="node" bind:group={scope} /> Just this node</label>
        </fieldset>
        {#if own}<button class="btn-ghost btn-sm" type="button" onclick={shareAgain}>Use the shared label</button>{/if}
    {/if}
    {#key n.id + scope}
        <LabelBuilder {value} {level} dimensionKey={n.derivedNode} nodeId={n.id} onchange={setLabel} preview={false} />
    {/key}
    <p class="hint">The announcement above shows the result.</p>
</section>

<style>
    .node-editor {
        margin-top: 4px;
    }

    h5 {
        margin: calc(var(--dn-space) * 1.5) 0 4px;
        font-size: 0.8125rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--dn-text-muted);
    }

    .hint {
        margin: 2px 0 6px;
        font-size: 0.75rem;
        color: var(--dn-text-muted);
    }

    .scope {
        display: flex;
        gap: calc(var(--dn-space) * 2);
        border: none;
        padding: 0;
        margin: 0 0 6px;
        font-size: 0.8125rem;
    }

    .node-editor :global(.nav-keys) {
        padding: 0;
        border-top: none;
    }
</style>
