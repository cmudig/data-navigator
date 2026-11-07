<script lang="ts">
    import { app, edit } from '../../model/state.svelte';
    import { SIBLING_PRESETS, presetOf, syncKeys, type Pair } from '../../model/doc';

    const dims = $derived(app.doc.recipe.dimensions);

    function choose(key: string, id: string) {
        const names = [...SIBLING_PRESETS.find(p => p.id === id)!.names] as Pair;
        edit(`Keys for ${key}`, d => {
            const r = d.recipe;
            const me = r.dimensions.find(x => x.key === key)!;
            const other = r.dimensions.find(x => x.key !== key && presetOf(x.nav.sibling)?.id === id);
            if (other) other.nav.sibling = [...me.nav.sibling] as Pair;
            me.nav.sibling = names;
            Object.assign(r, syncKeys(r));
        });
        app.ui.live = `${key} now uses ${SIBLING_PRESETS.find(p => p.id === id)!.label}.`;
    }
</script>

<section class="nav-keys" aria-labelledby="nav-keys-heading">
    <h3 id="nav-keys-heading">Keys for each dimension</h3>
    <p class="hint">Picking keys another dimension uses swaps the two.</p>
    {#each dims as d (d.key)}
        {@const cur = presetOf(d.nav.sibling)?.id}
        <fieldset>
            <legend>{d.key}</legend>
            {#each SIBLING_PRESETS as p (p.id)}
                <label class:on={cur === p.id}>
                    <input type="radio" name="keys-{d.key}" checked={cur === p.id} onchange={() => choose(d.key, p.id)} />
                    {p.label.replace(/ (arrow|bracket) keys/, '')}
                </label>
            {/each}
        </fieldset>
    {:else}
        <p class="hint">No dimensions yet.</p>
    {/each}
</section>

<style>
    .nav-keys {
        padding: var(--dn-space) calc(var(--dn-space) * 1.5);
        border-top: 1px solid var(--dn-border);
    }

    h3 {
        margin: 0 0 4px;
        font-size: 0.8125rem;
    }

    .hint {
        margin: 0 0 var(--dn-space);
        font-size: 0.75rem;
        color: var(--dn-text-muted);
    }

    fieldset {
        display: flex;
        align-items: center;
        gap: 4px;
        border: none;
        padding: 0;
        margin: 0 0 6px;
    }

    legend {
        float: left;
        width: 7rem;
        font-size: 0.8125rem;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    label {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px 8px;
        border: 1px solid var(--dn-control);
        border-radius: 999px;
        font-size: 0.8125rem;
        cursor: pointer;
    }

    label.on {
        background: var(--dn-accent-soft);
        border-color: var(--dn-accent);
        font-weight: 600;
    }

    input {
        margin: 0;
        accent-color: var(--dn-accent);
    }
</style>
