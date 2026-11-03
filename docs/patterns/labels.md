---
title: Text Labels
---

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { getSettings, setSettings, pointLabel, groupLabel } from './shared/labels.js';

const keys = ref('auto');
const order = ref('value-first');
const groups = ref('short');
onMounted(() => {
    const s = getSettings();
    keys.value = s.keys;
    order.value = s.order;
    groups.value = s.groups;
});
watch([keys, order, groups], () => setSettings({ keys: keys.value, order: order.value, groups: groups.value }));

const settings = computed(() => ({ keys: keys.value, order: order.value, groups: groups.value }));
const preview = computed(() => [
    ['Bar', pointLabel({ values: [{ key: 'Count', value: 5 }], categories: [{ key: 'Fruit', value: 'Apple' }] }, settings.value)],
    [
        'Stacked bar',
        pointLabel(
            {
                values: [{ key: 'Count', value: 5 }],
                categories: [
                    { key: 'Fruit', value: 'Apple' },
                    { key: 'Store', value: 'B', bare: 'Store B' }
                ]
            },
            settings.value
        )
    ],
    [
        'Scatterplot',
        pointLabel(
            {
                values: [
                    { key: 'Horsepower', value: 130 },
                    { key: 'MPG', value: 18 }
                ],
                keysByDefault: true
            },
            settings.value
        )
    ],
    ['Group', groupLabel({ name: 'Apple', short: '3 stores.', detail: 'Total 12. Store B is highest at 5.' }, settings.value)]
]);

const charts = [
    { id: 'bar', label: 'Bar', load: () => import('./charts/labels-bar.js') },
    { id: 'stacked', label: 'Stacked bar', load: () => import('./charts/labels-stacked.js') },
    { id: 'scatter', label: 'Scatterplot', load: () => import('./charts/labels-scatter.js') }
];
</script>

# Text Labels

A label is what a screen reader says, and what the text chat prints, when someone lands on a node. Good labels are short, lead with the data, and say just enough to tell one node from another.

## Guidelines

**Lead with the value.** People navigate to find numbers. Put the number first, then name what it belongs to.

| Chart       | Good                | Also fine                   | Too wordy                             |
| ----------- | ------------------- | --------------------------- | ------------------------------------- |
| Bar         | `5, Apple`          | `5, Fruit: Apple`           | `Count: 5, Fruit: Apple. Data point.` |
| Stacked bar | `5, Apple, Store B` | `5, Fruit: Apple, Store: B` | `Count: 5, Fruit: Apple, Store: B`    |

**Keep group names descriptive.** A bare `B` could mean anything, so say `Store B`. Short key names are fine: `Store: B` works too.

**Skip the key for the value when it is obvious.** In a bar chart of counts, `5` is clearly the count. Naming it adds words without adding meaning.

**Scatterplots are the exception.** Two bare numbers are easy to mix up, so name both by default: `Horsepower: 130, MPG: 18`. Experts who know the chart may prefer `130, 18`. Let them choose.

**Groups name themselves, then summarize.** `Apple. 3 stores.` A longer version can add what matters most: `Apple. 3 stores. Total 12. Store B is highest at 5.`

**Alt text for the whole chart** follows one formula: what kind of chart, what it shows, and one key takeaway. `Bar chart of fruit counts. Strawberries are highest at 6.` Use it as the root node's label too.

## Let people choose

No one label style suits everyone. In ["Customization is Key"](https://vis.mit.edu/pubs/customization) (Jones, Pedraza Pineros, Hajas, Zong, and Satyanarayan, CHI 2024), blind and low-vision participants found charts easier to use when they could customize the text. The paper names four things to let people control. The settings below cover each one:

| Goal from the paper | Setting here                         |
| ------------------- | ------------------------------------ |
| Presence            | Key names: none, groups only, or all |
| Verbosity           | Groups: short or detailed            |
| Ordering            | Order: value first or value last     |
| Duration            | Settings are saved in this browser   |

Novices tend to want keys. Experts tend to want speed. The settings change every label in the demo.

<fieldset class="label-settings">
    <legend>Label settings</legend>
    <div class="label-setting" role="radiogroup" aria-labelledby="keys-label">
        <span id="keys-label" class="label-setting-name">Key names</span>
        <label><input type="radio" value="auto" v-model="keys" /> Chart default</label>
        <label><input type="radio" value="never" v-model="keys" /> None</label>
        <label><input type="radio" value="groups" v-model="keys" /> Groups only</label>
        <label><input type="radio" value="always" v-model="keys" /> All</label>
    </div>
    <div class="label-setting" role="radiogroup" aria-labelledby="order-label">
        <span id="order-label" class="label-setting-name">Order</span>
        <label><input type="radio" value="value-first" v-model="order" /> Value first</label>
        <label><input type="radio" value="value-last" v-model="order" /> Value last</label>
    </div>
    <div class="label-setting" role="radiogroup" aria-labelledby="groups-label">
        <span id="groups-label" class="label-setting-name">Groups</span>
        <label><input type="radio" value="short" v-model="groups" /> Short</label>
        <label><input type="radio" value="detailed" v-model="groups" /> Detailed</label>
    </div>
</fieldset>

<table class="label-preview">
    <caption>Preview</caption>
    <tbody>
        <tr v-for="[name, text] in preview" :key="name"><th scope="row">{{ name }}</th><td><code>{{ text }}</code></td></tr>
    </tbody>
</table>

<PatternDemo id="labels" :charts="charts" />

## How it is built

Labels are functions. Data Navigator calls `semantics.label` each time it announces a node, so a function can read the current settings and build the label then. No rebuild is needed.

::: code-group

<<< @/patterns/shared/labels.js{js} [labels.js]

<<< @/patterns/charts/labels-stacked.js#labels{js} [Stacked bar labels]

<<< @/patterns/charts/labels-scatter.js#labels{js} [Scatterplot labels]

:::

Each part of a data point label carries its key, its value, and an optional `bare` form. `bare` is how the part reads with no key, so `Store B` stays clear even when key names are off.

<style>
.label-settings {
    border: 1px solid var(--vp-c-divider);
    border-radius: 8px;
    padding: 0.75rem 1rem;
    margin: 1rem 0;
}
.label-settings legend {
    font-weight: 600;
    padding: 0 0.25rem;
}
.label-setting {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.25rem 1rem;
    margin: 0.4rem 0;
}
.label-setting-name {
    font-weight: 600;
    min-width: 6rem;
}
.label-setting label {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    min-height: 44px;
}
.label-preview caption {
    text-align: left;
    font-weight: 600;
}
</style>
