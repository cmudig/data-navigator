<script lang="ts">
    import { app, edit } from '../../model/state.svelte';
    import { SIBLING_PRESETS, presetOf, syncKeys, type Pair } from '../../model/doc';

    const dims = $derived(app.doc.recipe.dimensions);

    const flipped = (nav: Pair) => {
        const p = presetOf(nav);
        return !!p && nav[0] !== p.names[0];
    };
    const short = (label: string, back: boolean) => {
        const parts = label.replace(/ (arrow|bracket) keys/, '').split(' / ');
        return (back ? parts.reverse() : parts).join(' / ');
    };

    function set(key: string, label: string, mutate: (me: { nav: { sibling: Pair } }, dims: { key: string; nav: { sibling: Pair } }[]) => void) {
        edit(label, d => {
            const r = d.recipe;
            mutate(r.dimensions.find(x => x.key === key)!, r.dimensions);
            Object.assign(r, syncKeys(r));
        });
    }

    function choose(key: string, id: string) {
        const p = SIBLING_PRESETS.find(x => x.id === id)!;
        set(key, `Keys for ${key}`, (me, all) => {
            const back = flipped(me.nav.sibling);
            const other = all.find(x => x.key !== key && presetOf(x.nav.sibling)?.id === id);
            if (other) other.nav.sibling = [...me.nav.sibling] as Pair;
            me.nav.sibling = (back ? [p.names[1], p.names[0]] : [...p.names]) as Pair;
        });
        app.ui.live = `${key} now uses ${p.label}.`;
    }

    function reverse(key: string) {
        set(key, `Reversed ${key}`, me => (me.nav.sibling = [me.nav.sibling[1], me.nav.sibling[0]]));
        const nav = dims.find(x => x.key === key)!.nav.sibling;
        app.ui.live = `${key}: ${nav[1]} moves forward, ${nav[0]} moves back.`;
    }
</script>

<section class="nav-keys" aria-labelledby="nav-keys-heading">
    <h3 id="nav-keys-heading">Keys for each dimension</h3>
    <p class="hint">Picking keys another dimension uses swaps the two. ⇄ flips which key moves forward.</p>
    {#each dims as d (d.key)}
        {@const cur = presetOf(d.nav.sibling)?.id}
        {@const back = flipped(d.nav.sibling)}
        <fieldset>
            <legend>{d.key}</legend>
            <button class="reverse" type="button" aria-pressed={back} aria-label="Reverse direction for {d.key}" title="Reverse direction" onclick={() => reverse(d.key)}>⇄</button>
            {#each SIBLING_PRESETS as p (p.id)}
                <label class:on={cur === p.id}>
                    <input type="radio" name="keys-{d.key}" checked={cur === p.id} onchange={() => choose(d.key, p.id)} />
                    {short(p.label, back)}
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
        min-width: 65px;
        justify-content: center;
        box-sizing: border-box;
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

    .reverse {
        min-width: 28px;
        min-height: 26px;
        padding: 0 7px;
        border: 1px solid var(--dn-control);
        border-radius: 999px;
        background: transparent;
        color: var(--dn-text);
    }

    .reverse[aria-pressed='true'] {
        background: var(--dn-accent-soft);
        border-color: var(--dn-accent);
        padding: 0 6px;
        border: 2px solid var(--dn-control-darker);
    }

    input {
        margin: 0;
        accent-color: var(--dn-accent);
    }
</style>
