import skill from './SKILL.md?raw';
import { app, edit, undo } from '../model/state.svelte';
import { syncKeys, type Doc } from '../model/doc';

const WRITABLE = ['recipe', 'overrides', 'entry', 'chart.description', 'chart.type', 'scaffold'];
export const MODELS = [
    ['claude-opus-5-5', 'Claude Opus 5.5'],
    ['claude-sonnet-5-5', 'Claude Sonnet 5.5'],
    ['claude-haiku-5-5', 'Claude Haiku 5.5']
];
const KEY = 'dn-skeleton-anthropic-key';

export interface Change {
    id: number;
    path: string;
    before: unknown;
    after: unknown;
    reason: string;
    time: number;
    by: 'assistant' | 'you';
}
type Block = { type: string; text?: string; id?: string; name?: string; input?: any; [k: string]: unknown };
type Message = { role: 'user' | 'assistant'; content: string | Block[] };

const stored = () => {
    try {
        return localStorage.getItem(KEY) ?? '';
    } catch {
        return '';
    }
};

export const chat = $state({
    key: stored(),
    remember: !!stored(),
    model: MODELS[0][0],
    messages: [] as Message[],
    busy: false,
    error: '',
    log: [] as Change[]
});

export function saveKey() {
    try {
        if (chat.remember) localStorage.setItem(KEY, chat.key);
        else localStorage.removeItem(KEY);
    } catch {}
}

const parts = (path: string) => path.split('.').filter(Boolean);
export function getAt(root: unknown, path: string) {
    return parts(path).reduce<any>((o, k) => (o == null ? undefined : o[k]), root);
}
function setAt(doc: Doc, path: string, value: unknown, remove: boolean) {
    const ks = parts(path);
    let o: any = doc;
    for (const k of ks.slice(0, -1)) o = o[k] ??= /^\d+$/.test(k) ? [] : {};
    const last = ks.at(-1)!;
    if (remove) Array.isArray(o) ? o.splice(+last, 1) : delete o[last];
    else o[last] = value;
    if (ks[0] === 'recipe') Object.assign(doc.recipe, syncKeys(doc.recipe));
}

const clip = (v: unknown) => {
    const text = JSON.stringify(v, null, 1) ?? 'undefined';
    return text.length > 20000 ? text.slice(0, 20000) + '\n…(truncated, read a narrower path)' : text;
};

function overview() {
    const s = app.structure;
    const { rows, ...data } = app.doc.data;
    return {
        doc: {
            ...app.doc,
            image: app.doc.image && { width: app.doc.image.width, height: app.doc.image.height },
            data: { ...data, rowCount: rows?.length ?? 0, sampleRows: rows?.slice(0, 3) }
        },
        structure: {
            nodeCount: Object.keys(s.nodes).length,
            edgeCount: Object.keys(s.edges).length,
            entry: app.entry,
            missingDescriptions: [...app.missing],
            warnings: app.warnings,
            navigationRules: s.navigationRules
        }
    };
}

function read(path: string) {
    if (!path) return clip(overview());
    const [root, ...rest] = parts(path);
    if (root === 'structure') return clip(getAt(app.structure, rest.join('.')));
    if (root !== 'doc') return 'Paths start with "doc." or "structure.".';
    const p = rest.join('.');
    if (p.startsWith('data.rows')) {
        const rows = app.doc.data.rows ?? [];
        return clip({ rowCount: rows.length, rows: rows.slice(0, 20) });
    }
    if (p.startsWith('image')) return clip({ width: app.doc.image?.width, height: app.doc.image?.height });
    return clip(getAt(app.doc, p));
}

export function write(path: string, value: unknown, remove: boolean, reason: string, by: Change['by']) {
    const p = path.replace(/^doc\./, '');
    if (!WRITABLE.some(w => p === w || p.startsWith(w + '.')))
        return `Not allowed. You can write under: ${WRITABLE.join(', ')}.`;
    const before = structuredClone($state.snapshot(getAt(app.doc, p)));
    const had = Object.keys(app.structure.nodes).length;
    try {
        edit(`${by === 'assistant' ? 'Assistant' : 'You'}: ${p}`, d => setAt(d, p, value, remove));
    } catch (e) {
        return `Write failed: ${(e as Error).message}`;
    }
    if (had && !Object.keys(app.structure.nodes).length) {
        undo();
        return 'That change broke the structure, so it was undone.';
    }
    chat.log.unshift({
        id: Date.now() + Math.random(),
        path: p,
        before,
        after: remove ? undefined : value,
        reason,
        time: Date.now(),
        by
    });
    return `Done. ${p} is now ${clip(getAt(app.doc, p))}`;
}

const TOOLS = [
    {
        name: 'read',
        description:
            'Read JSON at a dot path. "" gives an overview. "doc.recipe.dimensions" reads the document; "structure.nodes.<id>" reads the built structure.',
        input_schema: {
            type: 'object',
            properties: { path: { type: 'string' } },
            required: ['path'],
            additionalProperties: false
        }
    },
    {
        name: 'write',
        description: `Set or remove one value at a document dot path such as "doc.recipe.dimensions.0.nav.sibling". Allowed roots: ${WRITABLE.join(', ')}. Give a short reason the person will see in the change log.`,
        input_schema: {
            type: 'object',
            properties: {
                path: { type: 'string' },
                value: { description: 'Any JSON value. Omit when removing.' },
                remove: { type: 'boolean' },
                reason: { type: 'string' }
            },
            required: ['path', 'reason'],
            additionalProperties: false
        }
    }
];

function run(block: Block) {
    const i = block.input ?? {};
    if (typeof i.path !== 'string') return { text: 'Missing "path".', error: true };
    if (block.name === 'read') return { text: read(i.path), error: false };
    if (block.name === 'write') {
        if (!i.remove && !('value' in i)) return { text: 'Missing "value".', error: true };
        const text = write(i.path, i.value, !!i.remove, String(i.reason ?? ''), 'assistant');
        return { text, error: !text.startsWith('Done') };
    }
    return { text: `Unknown tool ${block.name}.`, error: true };
}

async function call() {
    const fallback = chat.model !== 'claude-haiku-5-5';
    const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'x-api-key': chat.key,
            'anthropic-version': '2026-10-21',
            'anthropic-dangerous-direct-browser-access': 'true',
            ...(fallback ? { 'anthropic-beta': 'server-side-fallback-2026-07-01' } : {})
        },
        body: JSON.stringify({
            model: chat.model,
            max_tokens: 16000,
            output_config: { effort: 'medium' },
            ...(fallback ? { fallbacks: 'default' } : {}),
            system: [{ type: 'text', text: skill, cache_control: { type: 'ephemeral' } }],
            tools: TOOLS,
            messages: $state.snapshot(chat.messages)
        })
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body?.error?.message ?? `HTTP ${res.status}`);
    return body as { content: Block[]; stop_reason: string };
}

export async function ask(text: string) {
    if (!text.trim() || chat.busy) return;
    chat.error = '';
    chat.busy = true;
    chat.messages.push({ role: 'user', content: text });
    try {
        for (let turn = 0; turn < 12; turn++) {
            const r = await call();
            chat.messages.push({ role: 'assistant', content: r.content });
            if (r.stop_reason === 'refusal') return void (chat.error = 'The model declined this request.');
            if (r.stop_reason === 'max_tokens')
                return void (chat.error = 'The reply was cut off. Try a narrower request.');
            if (r.stop_reason !== 'tool_use') return;
            const results = r.content
                .filter(b => b.type === 'tool_use')
                .map(b => {
                    const out = run(b);
                    return {
                        type: 'tool_result',
                        tool_use_id: b.id,
                        content: out.text,
                        ...(out.error ? { is_error: true } : {})
                    };
                });
            chat.messages.push({ role: 'user', content: results });
        }
        chat.error = 'Stopped after 12 steps. Ask again to continue.';
    } catch (e) {
        chat.error = (e as Error).message;
    } finally {
        chat.busy = false;
    }
}

export const clear = () => ((chat.messages = []), (chat.error = ''));
