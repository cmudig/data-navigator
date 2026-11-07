<script lang="ts">
    import { MODELS, ask, chat, clear, saveKey, write } from '../../assistant/assistant.svelte';

    let open = $state(false);
    let draft = $state('');
    let edits = $state<Record<number, string>>({});
    let editError = $state<Record<number, string>>({});
    const show = (v: unknown) => (v === undefined ? '(not set)' : JSON.stringify(v, null, 1));

    type Line = { kind: 'you' | 'model' | 'tool'; text: string };
    const lines = $derived(
        chat.messages.flatMap((m): Line[] =>
            typeof m.content === 'string'
                ? [{ kind: 'you', text: m.content }]
                : m.content.flatMap((b): Line[] =>
                      b.type === 'text' && b.text
                          ? [{ kind: 'model', text: b.text }]
                          : b.type === 'tool_use'
                            ? [{ kind: 'tool', text: `${b.name} ${b.input?.path || '(overview)'}` }]
                            : []
                  )
        )
    );

    function send() {
        const text = draft;
        draft = '';
        ask(text);
    }

    function apply(id: number, path: string) {
        try {
            const value = JSON.parse(edits[id]);
            const msg = write(path, value, false, 'Edited by hand', 'you');
            editError[id] = msg.startsWith('Done') ? '' : msg;
        } catch {
            editError[id] = 'That is not valid JSON.';
        }
    }
</script>

<details class="assistant" bind:open>
    <summary>Ask an assistant</summary>
    {#if open}
        <div class="body">
            <details class="settings" open={!chat.key}>
                <summary>Settings</summary>
                <label>
                    Anthropic API key
                    <input type="password" autocomplete="off" bind:value={chat.key} onchange={saveKey} placeholder="sk-ant-…" />
                </label>
                <label class="row"><input type="checkbox" bind:checked={chat.remember} onchange={saveKey} /> Remember on this device</label>
                <p class="hint">The key stays in this browser and is sent only to api.anthropic.com. Usage is billed to your account.</p>
                <label>
                    Model
                    <select bind:value={chat.model}>
                        {#each MODELS as [id, label] (id)}<option value={id}>{label}</option>{/each}
                    </select>
                </label>
            </details>

            <p class="hint">It can read your structure and change the recipe, labels, keys, outlines and manual edits. It cannot change your data. Every change is logged below and can be undone.</p>

            <div class="transcript" aria-live="polite">
                {#each lines as l, i (i)}
                    <p class="line {l.kind}"><span class="who">{l.kind === 'you' ? 'You' : l.kind === 'model' ? 'Assistant' : '↳'}</span> {l.text}</p>
                {/each}
                {#if chat.busy}<p class="line tool">Working…</p>{/if}
                {#if chat.error}<p class="line error" role="alert"><span aria-hidden="true">⚠</span> {chat.error}</p>{/if}
            </div>

            <form onsubmit={e => (e.preventDefault(), send())}>
                <label class="visually-hidden" for="assistant-input">Message</label>
                <textarea id="assistant-input" rows="3" bind:value={draft} placeholder="For example: the arrow keys feel backwards on this line chart" onkeydown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}></textarea>
                <div class="row">
                    <button class="btn-primary btn-sm" type="submit" disabled={chat.busy || !chat.key || !draft.trim()}>Send</button>
                    <button class="btn-ghost btn-sm" type="button" onclick={clear} disabled={chat.busy}>Clear chat</button>
                </div>
            </form>

            <h4>Changes ({chat.log.length})</h4>
            {#each chat.log as c (c.id)}
                <details class="change">
                    <summary><code>{c.path}</code> <span class="by">{c.by}</span> {c.reason}</summary>
                    <p class="label">Before</p>
                    <pre>{show(c.before)}</pre>
                    <label class="label" for="change-{c.id}">After (edit and apply)</label>
                    <textarea id="change-{c.id}" rows="4" value={edits[c.id] ?? show(c.after)} oninput={e => (edits[c.id] = e.currentTarget.value)}></textarea>
                    <button class="btn-ghost btn-sm" type="button" disabled={edits[c.id] === undefined} onclick={() => apply(c.id, c.path)}>Apply</button>
                    {#if editError[c.id]}<p class="line error" role="alert">{editError[c.id]}</p>{/if}
                </details>
            {:else}
                <p class="hint">No changes yet.</p>
            {/each}
        </div>
    {/if}
</details>

<style>
    .assistant {
        border-top: 1px solid var(--dn-border);
        padding: var(--dn-space) calc(var(--dn-space) * 1.5);
        font-size: 0.8125rem;
    }

    .assistant > summary {
        font-weight: 600;
        cursor: pointer;
    }

    .body {
        display: flex;
        flex-direction: column;
        gap: var(--dn-space);
        margin-top: var(--dn-space);
    }

    label {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .row {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 6px;
    }

    .hint {
        margin: 0;
        color: var(--dn-text-muted);
        font-size: 0.75rem;
    }

    .transcript {
        max-height: 260px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .line {
        margin: 0;
        white-space: pre-wrap;
    }

    .who {
        font-weight: 700;
    }

    .tool {
        color: var(--dn-text-muted);
        font-family: var(--dn-font-mono);
        font-size: 0.75rem;
    }

    .error {
        color: #b71c1c;
        font-weight: 600;
    }

    :global(.dark) .error {
        color: #ff8a80;
    }

    textarea,
    pre {
        width: 100%;
        box-sizing: border-box;
        font-family: var(--dn-font-mono);
        font-size: 0.75rem;
    }

    form textarea {
        font-family: var(--dn-font);
        font-size: 0.8125rem;
    }

    pre {
        margin: 0;
        max-height: 120px;
        overflow: auto;
        background: var(--dn-surface);
        padding: 4px;
    }

    h4 {
        margin: var(--dn-space) 0 0;
        font-size: 0.8125rem;
    }

    .change {
        border: 1px solid var(--dn-border);
        border-radius: var(--dn-radius);
        padding: 4px 6px;
    }

    .change summary {
        cursor: pointer;
        overflow-wrap: anywhere;
    }

    .by {
        font-size: 0.6875rem;
        text-transform: uppercase;
        color: var(--dn-text-muted);
    }

    .label {
        margin: 4px 0 0;
        font-size: 0.75rem;
        font-weight: 600;
    }
</style>
