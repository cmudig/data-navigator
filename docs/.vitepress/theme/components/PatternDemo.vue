<script setup lang="ts">
// One demo per pattern page: a chart switcher, the chart with keyboard navigation,
// text chat, the inspector in tree view, and a table of keys.
// Chart modules load on the client only, since data-navigator needs the DOM.
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import 'data-navigator/text-chat.css';

type ChartEntry = { id: string; label: string; load: () => Promise<any> };
const props = defineProps<{ id: string; charts: ChartEntry[] }>();

const selected = ref(props.charts[0]?.id);
const modules = ref<Record<string, any>>({});
const current = computed(() => modules.value[selected.value]?.default);
const focused = ref<string>('');

const chartHost = ref<HTMLElement | null>(null);
const chatHost = ref<HTMLElement | null>(null);
const inspectorHost = ref<HTMLElement | null>(null);
const keysHost = ref<HTMLElement | null>(null);

let instance: any = null;
let observer: MutationObserver | null = null;

const clear = (el: HTMLElement | null) => {
    if (el) el.innerHTML = '';
};

let mountToken = 0;
const mount = async () => {
    const token = ++mountToken;
    const entry = props.charts.find(c => c.id === selected.value);
    if (!entry) return;
    if (!modules.value[entry.id]) {
        modules.value = { ...modules.value, [entry.id]: await entry.load() };
    }
    const { mountPattern } = await import('../../../patterns/shared/mount.js');
    await nextTick();
    // a newer mount started while this one was loading
    if (token !== mountToken) return;
    instance?.destroy();
    instance = null;
    [chartHost, chatHost, inspectorHost, keysHost].forEach(r => clear(r.value));
    focused.value = '';
    const chart = modules.value[entry.id].default;
    const built = chart.build(chartHost.value);
    const inspectorWidth = Math.min(480, Math.max(280, inspectorHost.value?.clientWidth || 420));
    instance = mountPattern({
        id: `${props.id}-${entry.id}`,
        structure: built.structure,
        entryPoint: built.entryPoint,
        description: chart.alt,
        chartHost: chartHost.value,
        chatHost: chatHost.value,
        inspectorHost: inspectorHost.value,
        instructionsHost: keysHost.value,
        commandLabels: chart.commandLabels || {},
        inspectorSize: { width: inspectorWidth, height: Math.round(inspectorWidth * 0.75) },
        onFocus: node => {
            focused.value = node ? node.id : '';
            built.onFocus?.(node);
        }
    });
};

onMounted(() => {
    mount();
    // redraw the canvas when the site theme changes
    let wasDark = document.documentElement.classList.contains('dark');
    observer = new MutationObserver(() => {
        const isDark = document.documentElement.classList.contains('dark');
        if (isDark !== wasDark) {
            wasDark = isDark;
            mount();
        }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
});
onBeforeUnmount(() => {
    observer?.disconnect();
    instance?.destroy();
});
watch(selected, () => mount());
</script>

<template>
    <div class="pattern-demo">
        <fieldset v-if="charts.length > 1" class="pattern-switcher">
            <legend>Chart</legend>
            <label v-for="c in charts" :key="c.id" :class="{ active: selected === c.id }">
                <input type="radio" :name="`${id}-chart`" :value="c.id" v-model="selected" />
                {{ c.label }}
            </label>
        </fieldset>

        <div class="pattern-chart-col">
            <div :id="`${id}-chart`" ref="chartHost" class="pattern-chart"></div>
            <dl v-if="current" class="pattern-notes">
                <dt>Alt text</dt>
                <dd>{{ current.alt }}</dd>
                <dt>Focus indicator</dt>
                <dd>{{ current.focusNote }}</dd>
            </dl>
        </div>

        <div class="pattern-lower">
            <div class="pattern-chat-col">
                <p class="pattern-label" :id="`${id}-chat-label`">Text chat (works on touch screens)</p>
                <div ref="chatHost" class="pattern-chat" role="group" :aria-labelledby="`${id}-chat-label`"></div>
            </div>
            <div class="pattern-inspector-col">
                <p class="pattern-label">Inspector (tree view)</p>
                <div :id="`${id}-inspector`" ref="inspectorHost" class="pattern-inspector"></div>
                <p class="pattern-current">
                    Current node: <code>{{ focused || 'none' }}</code>
                </p>
            </div>
        </div>
        <div :id="`${id}-keys`" ref="keysHost" class="pattern-keys-col"></div>
    </div>
</template>

<style>
.pattern-demo {
    margin: 1.5rem 0 2rem;
    padding: 1rem;
    border: 1px solid var(--vp-c-divider);
    border-radius: 8px;
    background: var(--vp-c-bg-soft);
}
.pattern-switcher {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    border: 0;
    padding: 0;
    margin: 0 0 1rem;
}
.pattern-switcher legend {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--vp-c-text-2);
    margin-bottom: 0.4rem;
    padding: 0;
}
.pattern-switcher label {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    min-height: 44px;
    padding: 0.3rem 0.8rem;
    border: 1px solid var(--vp-c-border);
    border-radius: 999px;
    font-size: 0.85rem;
    cursor: pointer;
    background: var(--vp-c-bg);
}
.pattern-switcher label.active {
    border-color: var(--vp-c-brand-1);
    color: var(--vp-c-brand-1);
    font-weight: 600;
}
.pattern-switcher label:focus-within {
    outline: 3px solid var(--vp-c-brand-1);
    outline-offset: 2px;
}
.pattern-lower {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    margin-top: 1rem;
}
.pattern-chat-col {
    flex: 1 1 240px;
    min-width: 0;
}
.pattern-inspector-col {
    flex: 1 1 280px;
    min-width: 0;
}
.pattern-keys-col {
    margin-top: 1rem;
}
.pattern-chart {
    max-width: 100%;
}
.pattern-chart canvas {
    border-radius: 6px;
    max-width: 100%;
}
.pattern-chart .dn-entry-button {
    margin-top: 0.5rem;
}
.pattern-chart .dn-exit-position {
    position: static;
    margin-top: 0.5rem;
}
.pattern-chart .dn-node.is-current .dn-node-path {
    stroke: var(--vp-c-brand-1);
    stroke-width: 3px;
}
.pattern-label {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--vp-c-text-2);
    margin: 0 0 0.4rem !important;
}
.pattern-notes {
    margin: 0.75rem 0 0;
    font-size: 0.875rem;
}
.pattern-notes dt {
    font-weight: 600;
    margin-top: 0.4rem;
}
.pattern-notes dd {
    margin: 0;
    color: var(--vp-c-text-2);
}
.pattern-chat .dn-text-chat {
    max-width: 100%;
}
.pattern-inspector svg {
    background: var(--vp-c-bg);
    border-radius: 6px;
    max-width: 100%;
    height: auto;
}
.pattern-inspector .dn-inspector-tooltip {
    background: var(--vp-c-bg) !important;
    color: var(--vp-c-text-1) !important;
    position: static !important;
    transform: none !important;
    max-width: 100%;
    margin-top: 0.4rem;
    font-size: 0.8rem;
}
.pattern-current {
    font-size: 0.8rem;
    color: var(--vp-c-text-2);
    margin: 0.4rem 0 0 !important;
}
.pattern-keys-col .dn-commands-table {
    width: 100%;
    font-size: 0.85rem;
    display: table;
    margin: 0 !important;
}
.pattern-keys-col .dn-commands-table-caption {
    text-align: left;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--vp-c-text-2);
    padding-bottom: 0.4rem;
}
.pattern-keys-col .dn-commands-table th,
.pattern-keys-col .dn-commands-table td {
    padding: 4px 8px !important;
}
.pattern-keys-col .dn-commands-table td:last-child {
    font-family: var(--vp-font-family-mono);
    font-size: 0.8rem;
}
</style>
