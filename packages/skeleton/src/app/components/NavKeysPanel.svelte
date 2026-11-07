<script lang="ts">
    import { app, edit } from '../../model/state.svelte';
    import { SIBLING_PRESETS, presetOf, syncKeys, type Pair, type Recipe } from '../../model/doc';

    const { only, between, title = 'Keys for each dimension' }: { only?: string[]; between?: boolean; title?: string } = $props();
    const uid = Math.random().toString(36).slice(2, 7);
    const BETWEEN = '__between';
    const r = $derived(app.doc.recipe);
    const rows = $derived([
        ...((between ?? r.dimensions.length > 1) ? [{ id: BETWEEN, label: 'Between dimensions', nav: r.level1.nav }] : []),
        ...r.dimensions.filter(d => !only || only.includes(d.key)).map(d => ({ id: d.key, label: d.key, nav: d.nav.sibling }))
    ]);

    const flipped = (nav: Pair) => {
        const p = presetOf(nav);
        return !!p && nav[0] !== p.names[0];
    };
    const orient = (names: readonly string[], back: boolean) => (back ? [names[1], names[0]] : [names[0], names[1]]) as Pair;
    const short = (label: string, back: boolean) => {
        const parts = label.replace(/ (arrow|bracket) keys/, '').split(' / ');
        return (back ? parts.reverse() : parts).join(' / ');
    };
    const navOf = (rr: Recipe, id: string) => (id === BETWEEN ? rr.level1.nav : rr.dimensions.find(x => x.key === id)!.nav.sibling);

    function set(id: string, label: string, next: (nav: Pair, rr: Recipe) => Pair) {
        edit(label, d => {
            const rr = d.recipe;
            const nav = next(navOf(rr, id), rr);
            if (id === BETWEEN) rr.level1.nav = nav;
            else rr.dimensions.find(x => x.key === id)!.nav.sibling = nav;
            Object.assign(rr, syncKeys(rr));
        });
    }

    function choose(id: string, label: string, preset: string) {
        const p = SIBLING_PRESETS.find(x => x.id === preset)!;
        set(id, `Keys for ${label}`, (nav, rr) => {
            const other = id === BETWEEN ? null : rr.dimensions.find(x => x.key !== id && presetOf(x.nav.sibling)?.id === preset);
            const mine = presetOf(nav);
            if (other) other.nav.sibling = mine ? orient(mine.names, flipped(other.nav.sibling)) : ([...nav] as Pair);
            return orient(p.names, flipped(nav));
        });
        app.ui.live = `${label} now uses ${p.label}.`;
    }

    function reverse(id: string, label: string) {
        set(id, `Reversed ${label}`, nav => [nav[1], nav[0]]);
        const nav = navOf(app.doc.recipe, id);
        app.ui.live = `${label}: ${nav[1]} moves forward, ${nav[0]} moves back.`;
    }
</script>

<section class="nav-keys" aria-labelledby="nav-keys-{uid}">
    <h3 id="nav-keys-{uid}">{title}</h3>
    <p class="hint">Picking keys another dimension uses swaps the two. ⇄ flips which key moves forward.</p>
    {#each rows as row (row.id)}
        {@const cur = presetOf(row.nav)?.id}
        {@const back = flipped(row.nav)}
        <fieldset>
            <legend>{row.label}</legend>
            <button class="reverse" type="button" aria-pressed={back} aria-label="Reverse direction for {row.label}" title="Reverse direction" onclick={() => reverse(row.id, row.label)}>⇄</button>
            {#each SIBLING_PRESETS as p (p.id)}
                <label class:on={cur === p.id}>
                    <input type="radio" name="keys-{uid}-{row.id}" checked={cur === p.id} onchange={() => choose(row.id, row.label, p.id)} />
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
