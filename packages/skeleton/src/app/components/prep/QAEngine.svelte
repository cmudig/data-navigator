<script lang="ts">
    import { untrack } from 'svelte';
    import { app, edit, goTo } from '../../../model/state.svelte';
    import { CHAPTERS, questions } from '../../../model/questions';
    import QAQuestion from './QAQuestion.svelte';

    const list = $derived(app.doc.data.rows ? questions(app.doc) : []);
    const index = $derived(Math.max(0, list.findIndex(q => q.id === app.ui.qa)));
    const q = $derived(list[index]);
    const qid = $derived(q?.id);
    let pending = $state<unknown>(null);
    let moved = $state(false);
    const seen = $derived(new Set(app.doc.meta.seen));

    const initial = (question: NonNullable<typeof q>) => {
        const v = question.get(app.doc);
        if ((question.input !== 'radio' && question.input !== 'dropdown') || v) return v;
        const opts = question.options ?? [];
        const pick = opts.find(o => o.suggested && !o.disabled) ?? (question.input === 'radio' ? opts.find(o => !o.disabled) : null);
        return pick?.value ?? '';
    };
    $effect.pre(() => {
        qid;
        untrack(() => {
            pending = q ? structuredClone(initial(q)) : null;
        });
    });

    const empty = $derived(Array.isArray(pending) ? pending.length === 0 : !pending);
    const blocked = $derived(!!q?.required && empty);

    function markSeen(id: string) {
        if (!seen.has(id)) app.doc = { ...app.doc, meta: { ...app.doc.meta, seen: [...app.doc.meta.seen, id] } };
    }

    function next() {
        if (!q || blocked) return;
        const value = $state.snapshot(pending);
        const question = q;
        if (question.set && JSON.stringify(value) !== JSON.stringify(question.get(app.doc))) edit(`Prep: ${question.id.replace(/-/g, ' ')}`, d => question.set!(d, value));
        markSeen(question.id);
        const after = questions(app.doc);
        const i = after.findIndex(x => x.id === question.id);
        app.ui.qa = after[i + 1]?.id ?? question.id;
        moved = true;
        return i === after.length - 1;
    }

    function finish() {
        next();
        if (!app.doc.meta.prepDone) app.doc = { ...app.doc, meta: { ...app.doc.meta, prepDone: true } };
        goTo(2);
    }

    function back() {
        if (index > 0) app.ui.qa = list[index - 1].id;
        moved = true;
    }

    function jump(chapter: number) {
        const first = list.find(x => x.chapter === chapter);
        if (first) app.ui.qa = first.id;
        moved = true;
    }

    function status(chapter: number) {
        if (q?.chapter === chapter) return 'active';
        const items = list.filter(x => x.chapter === chapter);
        return items.length && items.every(x => seen.has(x.id)) ? 'complete' : 'upcoming';
    }
</script>

<div class="qa-engine">
    <nav class="qa-progress" aria-label="Setup chapters">
        {#each CHAPTERS as label, c (label)}
            {@const st = status(c)}
            <button
                class="qa-seg"
                class:qa-seg-complete={st === 'complete'}
                class:qa-seg-active={st === 'active'}
                class:qa-seg-upcoming={st === 'upcoming'}
                disabled={!list.some(x => x.chapter === c)}
                onclick={() => jump(c)}
                aria-label="{label}{st === 'complete' ? ', complete' : st === 'active' ? ', current' : ''}"
                aria-current={st === 'active' ? 'step' : undefined}
            >
                <span class="qa-seg-icon" aria-hidden="true">{st === 'complete' ? '✓' : st === 'active' ? '•' : '○'}</span>
                <span class="qa-seg-label">{label}</span>
            </button>
        {/each}
    </nav>

    <div class="qa-content">
        {#if !app.doc.data.rows}
            <p class="qa-empty">No data{app.doc.image ? '' : ' or image'} loaded yet. Upload a dataset (or create one) to set up your structure, or skip prep and draw nodes by hand in the Editor.</p>
            <div class="qa-empty-actions">
                <button class="btn-ghost" type="button" onclick={() => goTo(0)}>Go to Upload</button>
                <button class="btn-primary" type="button" onclick={() => goTo(2, true)}>Skip prep</button>
            </div>
        {:else if q}
            {#key q.id}
                <QAQuestion {q} value={pending} onchange={v => (pending = v)} chartImage={q.hideImage ? null : (app.doc.image?.url ?? null)} autofocus={moved} />
            {/key}
            {#if blocked}<p class="qa-hint" role="status">Choose at least one option to continue.</p>{/if}
        {/if}
    </div>

    {#if q}
        <div class="qa-nav" role="group" aria-label="Question navigation">
            <button class="qa-btn qa-btn-back" onclick={back} disabled={index === 0} aria-label="Back to previous question">&#8592; Back</button>
            <span class="qa-nav-pos" aria-live="polite" aria-atomic="true">{index + 1} / {list.length}</span>
            {#if !app.doc.meta.prepDone}
                <button class="qa-btn qa-btn-skip" onclick={() => (app.ui.skipPrep = 2)}>Skip prep</button>
            {/if}
            {#if index === list.length - 1}
                <span class="qa-done-label">Done!</span>
                <button class="qa-btn qa-btn-next" onclick={finish} disabled={blocked} aria-label="Continue to editor">Continue to Editor &#8594;</button>
            {:else}
                <button class="qa-btn qa-btn-next" onclick={next} disabled={blocked} aria-label="Next question">Next &#8594;</button>
            {/if}
        </div>
    {/if}
</div>

<style>
    .qa-engine {
        display: flex;
        flex-direction: column;
        gap: calc(var(--dn-space) * 2);
        padding: calc(var(--dn-space) * 2);
        height: 100%;
        overflow-y: auto;
        box-sizing: border-box;
    }

    /* ── Progress bar ── */

    .qa-progress {
        display: flex;
        gap: calc(var(--dn-space) * 0.5);
        flex-shrink: 0;
    }

    .qa-seg {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: calc(var(--dn-space) * 0.4);
        padding: calc(var(--dn-space) * 0.625) calc(var(--dn-space) * 0.5);
        border-radius: var(--dn-radius);
        border: 1px solid var(--dn-border);
        background: none;
        cursor: pointer;
        font-family: var(--dn-font);
        min-height: 0;
        min-width: 0;
        transition: border-color 0.12s, background 0.12s;
    }

    .qa-seg:hover {
        border-color: var(--dn-accent);
        background: var(--dn-accent-soft);
    }

    .qa-seg-icon {
        font-size: 1rem;
        line-height: 1;
    }

    .qa-seg-label {
        font-size: 0.625rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        text-align: center;
        line-height: 1.3;
        color: var(--dn-text-muted);
    }

    /* Segment state variants */

    .qa-seg-complete .qa-seg-icon { color: #166534; }
    .qa-seg-complete .qa-seg-label { color: var(--dn-text); }
    :global(.dark) .qa-seg-complete .qa-seg-icon { color: #86efac; }

    .qa-seg-active {
        background: var(--dn-accent-soft);
        border-color: var(--dn-accent);
    }
    .qa-seg-active .qa-seg-icon { color: var(--dn-accent); }
    .qa-seg-active .qa-seg-label { color: var(--dn-accent); }

    .qa-seg-upcoming .qa-seg-icon { color: var(--dn-text-muted); opacity: 0.5; }

    /* ── Question content ── */

    .qa-content {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
    }

    .qa-empty {
        margin: 0;
        font-size: 0.875rem;
        color: var(--dn-text-muted);
        line-height: 1.5;
    }

    /* ── Navigation row ── */

    .qa-nav {
        display: flex;
        align-items: center;
        gap: calc(var(--dn-space) * 1);
        flex-shrink: 0;
        border-top: 1px solid var(--dn-border);
        padding-top: calc(var(--dn-space) * 1.5);
    }

    .qa-btn {
        padding: calc(var(--dn-space) * 0.625) calc(var(--dn-space) * 1.5);
        border-radius: var(--dn-radius);
        font-family: var(--dn-font);
        font-size: 0.875rem;
        cursor: pointer;
        min-height: 0;
        transition: background 0.12s, border-color 0.12s, color 0.12s;
    }

    .qa-btn-back {
        background: none;
        border: 1px solid var(--dn-border);
        color: var(--dn-text-muted);
    }
    .qa-btn-back:not(:disabled):hover {
        border-color: var(--dn-accent);
        color: var(--dn-accent);
    }
    .qa-btn-back:disabled { opacity: 0.3; cursor: not-allowed; }

    .qa-btn-skip {
        margin-left: auto;
        background: transparent;
        border: 1px solid var(--dn-border);
        color: var(--dn-text);
    }

    .qa-btn-skip ~ .qa-btn-next {
        margin-left: 0;
    }

    .qa-empty-actions {
        display: flex;
        gap: var(--dn-space);
        margin-top: calc(var(--dn-space) * 1.5);
    }

    .qa-btn-next {
        background: var(--dn-accent);
        border: 1px solid var(--dn-accent);
        color: #fff;
        font-weight: 500;
        margin-left: auto;
    }
    .qa-btn-next:hover {
        background: var(--dn-accent-hover);
        border-color: var(--dn-accent-hover);
    }

    .qa-done-label {
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--dn-accent);
        align-self: center;
    }

    .qa-nav-pos {
        flex: 1;
        text-align: center;
        font-size: 0.8125rem;
        color: var(--dn-text-muted);
    }
</style>
