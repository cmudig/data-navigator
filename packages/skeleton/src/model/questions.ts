import {
    SIBLING_PRESETS,
    newDim,
    presetOf,
    syncKeys,
    template,
    type Dim,
    type Doc,
    type LabelTemplate,
    type Row
} from './doc';
import { computeDimensionSuggestion } from '../app/components/prep/dimensionSuggestions';

export type Input = 'info' | 'radio' | 'dropdown' | 'text' | 'textarea' | 'multiselect' | 'order' | 'label';
export interface Option {
    value: string;
    label: string;
    description?: string;
    disabled?: boolean;
    suggested?: boolean;
    warn?: string;
}
export interface Visual {
    variant: string;
    showRoot?: boolean;
    label?: string;
}
export interface Question {
    id: string;
    chapter: number;
    input: Input;
    question: string;
    hint?: string;
    options?: Option[];
    placeholder?: string;
    captions?: string[];
    maxSelect?: number;
    required?: boolean;
    expandable?: { buttonLabel: string; content: string };
    label?: {
        level: 0 | 1 | 2 | 3;
        dimensionKey?: string;
        suggestedFields?: { key: string; rank?: string }[];
        suggestedAggField?: string;
    };
    visuals: Visual[];
    hideImage?: boolean;
    get: (d: Doc) => unknown;
    set?: (d: Doc, v: any) => void;
}

export const CHAPTERS = ['Top-level access', 'Browsing groups', 'Navigation', 'Labels & announcements'];

const CHART_TYPES: Record<string, string> = {
    bar: 'Bar chart',
    'stacked-bar': 'Stacked bar chart',
    'clustered-bar': 'Clustered bar chart',
    line: 'Line chart',
    area: 'Area chart',
    scatter: 'Scatter plot',
    pie: 'Pie chart',
    donut: 'Donut chart',
    heatmap: 'Heatmap',
    treemap: 'Treemap',
    network: 'Network or relationship diagram',
    map: 'Map or geographic chart'
};

const LABEL_HELP = {
    buttonLabel: 'Help me build a good label',
    content:
        'Screen readers announce text in order, left to right. Put the most important value first (usually a number or name), and less critical context after.\n\nShorter labels are easier to remember. Aim for what you would say out loud, not a full sentence. Users exploring a chart repeatedly will hear these labels many times, so every unnecessary word adds up.\n\nIf your chart shows information in a tooltip on hover, include that same information here. Screen reader users will never see tooltips, so labels are their equivalent.'
};

const dimOf = (d: Doc, key: string) => d.recipe.dimensions.find(x => x.key === key)!;
const unique = (rows: Row[], key: string) => new Set(rows.map(r => String(r[key]))).size;
const chartLabel = (d: Doc) => (d.chart.type === 'custom' ? '' : (CHART_TYPES[d.chart.type] ?? d.chart.type));
const hasDivisions = (rows: Row[], dim: Dim) =>
    dim.type === 'numerical' ? dim.subdivisions > 1 : !dim.compress || unique(rows, dim.key) < rows.length;
const finish = (d: Doc) => Object.assign(d.recipe, syncKeys(d.recipe));

function rootDefault(d: Doc) {
    const parts = [d.chart.description.trim(), chartLabel(d)]
        .filter(Boolean)
        .map(s => (/[.!?]$/.test(s) ? s : s + '.'));
    return parts.join(' ');
}

function leafDefault(d: Doc) {
    const dims = d.recipe.dimensions;
    return [...dims.filter(x => x.type === 'numerical'), ...dims.filter(x => x.type === 'categorical')]
        .map(x => `{key:"${x.key}"}: {value:"${x.key}"}`)
        .join(', ');
}

function dimVariant(d: Doc, dim: Dim) {
    const same = d.recipe.dimensions.filter(x => x.type === dim.type);
    const i = same.indexOf(dim);
    return dim.type === 'numerical'
        ? (['scatter-dim-num', 'scatter-dim-row'][i] ?? 'scatter-dim-cat')
        : (['stack-dim-cat', 'stack-dim-col'][i] ?? 'scatter-dim-cat');
}
const DIM_TO_DIV: Record<string, string> = {
    'stack-dim-cat': 'stack-div-row',
    'stack-dim-col': 'stack-div-col',
    'scatter-dim-num': 'scatter-div-num',
    'scatter-dim-row': 'scatter-div-row',
    'scatter-dim-cat': 'scatter-div-cat'
};

const navOptions = (d: Doc, self?: string): Option[] =>
    SIBLING_PRESETS.map(p => {
        const other = d.recipe.dimensions.find(x => x.key !== self && x.nav.sibling[0] === p.names[0]);
        return {
            value: p.id,
            label: p.label,
            description: `Press ${p.label.split(' ').slice(0, 3).join(' ')} to move through items. Press Enter to drill in.`,
            warn:
                self && other ? `Also used by "${other.key}". Pick a different set so keys do not collide.` : undefined
        };
    });

export function questions(d: Doc): Question[] {
    const rows = d.data.rows ?? [];
    const dims = d.recipe.dimensions;
    const root = d.recipe.root.enabled;
    const scatter = d.chart.type === 'scatter';
    const fam = scatter ? 'scatter' : 'stack';
    const tree = (level: string) => ({ variant: `tree-${level}`, showRoot: root });
    const fields = d.data.fields.filter(f => !f.removed);
    const qs: Question[] = [];
    const add = (q: Omit<Question, 'visuals'> & { visuals?: Visual[] }) => qs.push({ visuals: [], ...q });

    add({
        id: 'welcome',
        chapter: 0,
        input: 'info',
        question: 'Welcome to Skeleton!',
        hint: 'Skeleton helps you make data visualizations navigable for people who use assistive technologies, using an "overview first, details on demand" approach. In prep, you craft an overview for your chart, then prepare groupings (dimensions) users can browse, and finally decide how groups and data points are labeled. After prep, you refine the structure of nodes and edges and make sure they line up with how your graphic looks.',
        captions: [
            "The root is your chart's entry point: a single overview users land on before exploring any dimension.",
            'Next, users navigate dimensions, or high-level groups like regions or years. These give users a path through your graphic.',
            'Users can also drill in to the divisions of a dimension: sub-ranges, buckets, or collections, like one line in a line chart or one stack in a stacked bar.',
            'Lastly, users reach the leaf level, usually individual data points. Your dimensions decide how users move among them.'
        ],
        visuals: [
            'stack-root',
            'stack-dim-col',
            'stack-div-col',
            'stack-leaf',
            'tree-root',
            'tree-dim',
            'tree-div',
            'tree-leaf'
        ].map(variant => ({ variant })),
        get: () => null
    });
    add({
        id: 'root-node',
        chapter: 0,
        input: 'radio',
        question:
            'Does your visualization have an overview or a single starting point that everything else branches from?',
        hint: 'A starting point might be the chart itself, its title, or some other high level view. Think of it like a home page: navigation begins here before drilling into any dimension.',
        options: [
            {
                value: 'yes',
                label: 'Yes, start with an overview',
                description: 'Great for guided, hierarchical navigation. Recommended for most datasets.',
                suggested: true
            },
            {
                value: 'no',
                label: 'No, start at the first dimension',
                description:
                    'Good when a description already exists elsewhere, or for a single dimension like a regular bar chart.'
            }
        ],
        visuals: [{ variant: 'stack-root' }, { variant: 'tree-root', showRoot: false }],
        get: x => (x.recipe.root.enabled ? 'yes' : 'no'),
        set: (x, v) => (x.recipe.root.enabled = v === 'yes')
    });
    const known = d.chart.type in CHART_TYPES;
    add({
        id: 'chart-type',
        chapter: 0,
        input: 'dropdown',
        question: 'What type of chart or visualization is this?',
        hint: root
            ? 'This is announced in the opening description so screen reader users know what kind of chart they are exploring.'
            : 'This helps us suggest options later.',
        options: [
            ...Object.entries(CHART_TYPES).map(([value, label]) => ({ value, label })),
            { value: 'custom', label: 'Custom...' }
        ],
        hideImage: true,
        get: x => (!x.chart.type ? '' : x.chart.type in CHART_TYPES ? x.chart.type : 'custom'),
        set: (x, v) =>
            (x.chart.type = v === 'custom' && !(x.chart.type in CHART_TYPES) && x.chart.type ? x.chart.type : v)
    });
    if (d.chart.type && !known)
        add({
            id: 'chart-type-custom',
            chapter: 0,
            input: 'text',
            question: 'What would you call this type of visualization?',
            hint: 'Describe it in plain terms, since users will hear this. For example: "bubble chart", "timeline".',
            hideImage: true,
            get: x => (x.chart.type === 'custom' ? '' : x.chart.type),
            set: (x, v) => (x.chart.type = String(v).trim() || 'custom')
        });
    if (root) {
        add({
            id: 'dataset-description',
            chapter: 0,
            input: 'text',
            question: 'What does your chart or dataset represent, in clear, concise language?',
            hint: 'For example: "Monthly sales figures for each product and region." This becomes the opening description that screen readers use to introduce the data.',
            placeholder: 'Your answer here...',
            visuals: [{ variant: `${fam}-root` }, tree('root')],
            get: x => x.chart.description,
            set: (x, v) => {
                const old = rootDefault(x);
                x.chart.description = String(v);
                if (!x.recipe.labels.level0.template || x.recipe.labels.level0.template === old)
                    x.recipe.labels.level0.template = rootDefault(x);
            }
        });
        add({
            id: 'root-announcement',
            chapter: 0,
            input: 'textarea',
            question: 'This is what your starting point will announce to users. Feel free to edit it:',
            hint: 'Screen readers read this text when users arrive at the entry point of your visualization.',
            visuals: [tree('root')],
            get: x => x.recipe.labels.level0.template || rootDefault(x),
            set: (x, v) => (x.recipe.labels.level0.template = String(v))
        });
    }

    const uniqueCols = fields.filter(f => rows.length > 1 && unique(rows, f.key) === rows.length);
    add({
        id: 'id-column',
        chapter: 1,
        input: 'radio',
        question: 'Which column uniquely identifies each row?',
        hint: 'IDs keep each data point stable when the data changes. Only columns where every value is different can be used.',
        options: [
            ...uniqueCols.map(f => ({ value: f.key, label: f.key, suggested: f.key === uniqueCols[0]?.key })),
            ...(fields.some(f => f.key === '_id')
                ? []
                : [{ value: '__create', label: 'Add a numbered "_id" column (1, 2, 3…)' }]),
            {
                value: '__none',
                label: 'None. Number the rows behind the scenes.',
                description: 'Works fine, but the IDs will not be readable and will change if rows are reordered.'
            }
        ],
        hideImage: true,
        get: x => x.data.idKey ?? '__none',
        set: (x, v) => {
            if (v === '__create') {
                x.data.rows = (x.data.rows ?? []).map((r, i) => ({ _id: i + 1, ...r }));
                x.data.fields = [{ key: '_id', type: 'numerical' }, ...x.data.fields];
                x.data.idKey = '_id';
            } else x.data.idKey = v === '__none' ? null : v;
        }
    });
    const suggestions = d.chart.type ? computeDimensionSuggestion(d.chart.type, fields, d.data.idKey, rows) : null;
    add({
        id: 'choose-dimensions',
        chapter: 1,
        input: 'multiselect',
        maxSelect: 3,
        required: true,
        question: 'Which variables should structure how users navigate and browse your chart?',
        hint: `Dimensions become the main paths through your data. Pick no more than 3.${chartLabel(d) ? ` Variables marked ★ Suggested are recommended for a ${chartLabel(d)}.` : ' Skip variables only used for IDs or labels.'}`,
        expandable: {
            buttonLabel: 'What are dimensions?',
            content:
                "Dimensions are paths through the data. The best ones are usually the variables that build the chart's visual structure. Every variable can still be read later in labels, so choose the ones that decide how users get around and what matters most."
        },
        options: fields.map(f => {
            const nums = rows.map(r => Number(r[f.key])).filter(n => !isNaN(n));
            const base =
                f.type === 'numerical'
                    ? `NUM, range ${nums.length ? `${Math.min(...nums)} to ${Math.max(...nums)}` : 'unknown'}`
                    : `CAT, ${unique(rows, f.key)} unique values`;
            const s = suggestions?.[f.key];
            return { value: f.key, label: f.key, description: s ? `${base}. ${s.note}` : base, suggested: s?.primary };
        }),
        visuals: scatter
            ? [{ variant: 'scatter-dim-num' }, { variant: 'scatter-dim-cat' }, tree('dim')]
            : [{ variant: 'stack-dim-cat' }, { variant: 'stack-dim-col' }, tree('dim')],
        get: x => x.recipe.dimensions.map(dd => dd.key),
        set: (x, keys: string[]) => {
            const r = x.recipe;
            const kept = r.dimensions.filter(dd => keys.includes(dd.key));
            for (const key of keys.filter(k => !kept.some(dd => dd.key === k))) {
                const used = new Set(kept.map(dd => dd.nav.sibling[0]));
                const free = SIBLING_PRESETS.findIndex(p => !used.has(p.names[0]));
                kept.push(
                    newDim(
                        key,
                        x.data.fields.find(f => f.key === key)!.type,
                        free >= 0 ? free : kept.length,
                        x.data.rows ?? []
                    )
                );
            }
            r.dimensions = kept;
            r.childmost = kept.filter(dd => dd.type === 'categorical').length >= 2 ? 'across' : 'within';
            x.meta.prepDone = true;
            finish(x);
        }
    });
    for (const dim of dims) {
        add({
            id: `dim-type-${dim.key}`,
            chapter: 1,
            input: 'radio',
            question: `What kind of values does "${dim.key}" contain?`,
            options: [
                {
                    value: 'categorical',
                    label: 'Categories (names or labels)',
                    description:
                        'Users move from one thing to another, like "North", "South", "East". Years or months often work best here too.'
                },
                {
                    value: 'numerical',
                    label: 'Numbers',
                    description: 'Values are split into equal ranges and navigated in numerical order.'
                }
            ],
            visuals:
                dim.type === 'numerical'
                    ? [{ variant: 'scatter-dim-num' }, { variant: 'scatter-dim-row' }]
                    : scatter
                      ? [{ variant: 'scatter-dim-cat' }]
                      : [{ variant: 'stack-dim-cat' }, { variant: 'stack-dim-col' }],
            get: x => dimOf(x, dim.key).type,
            set: (x, v) => {
                if (dimOf(x, dim.key).type === v) return;
                const i = x.recipe.dimensions.findIndex(dd => dd.key === dim.key);
                const fresh = newDim(dim.key, v, 0, x.data.rows ?? []);
                x.recipe.dimensions[i] = { ...fresh, nav: x.recipe.dimensions[i].nav };
                x.data.fields = x.data.fields.map(f => (f.key === dim.key ? { ...f, type: v } : f));
                delete x.recipe.labels.perDivision[dim.key];
            }
        });
        if (dim.type === 'numerical')
            add({
                id: `dim-subdivisions-${dim.key}`,
                chapter: 1,
                input: 'dropdown',
                question: `For "${dim.key}", how many ranges should we split the numbers into?`,
                hint: 'If values range from 0 to 100 and you pick 4, users move through 0 to 25, 25 to 50, 50 to 75 and 75 to 100. Fewer ranges are easier to navigate. 4 is a good start.',
                options: [1, 2, 3, 4, 5, 6, 8, 10, 12].map(n => ({
                    value: String(n),
                    label: n === 1 ? 'No grouping' : `${n} ranges${n === 4 ? ' (recommended)' : ''}`
                })),
                visuals: [
                    { variant: 'scatter-div-num', label: 'This navs left/right' },
                    { variant: 'scatter-div-row', label: 'This navs up/down' },
                    tree('div')
                ],
                get: x => String(dimOf(x, dim.key).subdivisions),
                set: (x, v) => (dimOf(x, dim.key).subdivisions = Number(v))
            });
        add({
            id: `dim-sort-${dim.key}`,
            chapter: 1,
            input: 'radio',
            question: `In what order should values in "${dim.key}" appear?`,
            options:
                dim.type === 'categorical'
                    ? [
                          { value: 'none', label: 'Original order (as they appear in the data)' },
                          { value: 'ascending', label: 'Alphabetical (A to Z)' },
                          { value: 'descending', label: 'Reverse alphabetical (Z to A)' }
                      ]
                    : [
                          { value: 'ascending', label: 'Lowest to highest' },
                          { value: 'descending', label: 'Highest to lowest' }
                      ],
            visuals: [{ variant: scatter ? 'scatter-dim-row' : 'stack-dim-col' }, tree('dim')],
            get: x => dimOf(x, dim.key).sort,
            set: (x, v) => (dimOf(x, dim.key).sort = v)
        });
    }
    if (dims.length > 1)
        add({
            id: 'dim-order',
            chapter: 1,
            input: 'order',
            question: 'In what order should your dimensions be discovered?',
            hint: 'The first dimension is the grouping users meet first. Show the most important grouping first. If they are equal, many people start with the x axis.',
            visuals: [...dims.map(dd => ({ variant: dimVariant(d, dd) })), tree('dim')],
            get: x => x.recipe.dimensions.map(dd => dd.key),
            set: (x, keys: string[]) => {
                x.recipe.dimensions = keys.map(k => dimOf(x, k));
                finish(x);
            }
        });

    if (dims.length > 1) {
        add({
            id: 'nav-between-dims',
            chapter: 2,
            input: 'radio',
            question: 'How should keyboard users move between top-level dimensions?',
            hint: 'Pick a direction that matches how the dimensions sit visually. Choosing keys here does not stop you from using the same keys within a dimension.',
            options: navOptions(d),
            visuals: [tree('dim')],
            get: x => presetOf(x.recipe.level1.nav)?.id ?? '',
            set: (x, v) => {
                x.recipe.level1.nav = [...SIBLING_PRESETS.find(p => p.id === v)!.names];
                finish(x);
            }
        });
        add({
            id: 'top-level-extents',
            chapter: 2,
            input: 'radio',
            question: 'When a user reaches the last dimension at the top level, what should happen?',
            options: [
                { value: 'circular', label: 'Loop back to the first dimension', suggested: true },
                { value: 'terminal', label: 'Stop at the last dimension' }
            ],
            visuals: [tree('dim')],
            get: x => x.recipe.level1.extents,
            set: (x, v) => (x.recipe.level1.extents = v)
        });
    }
    for (const dim of dims) {
        const divs = hasDivisions(rows, dim);
        add({
            id: `nav-within-${dim.key}`,
            chapter: 2,
            input: 'radio',
            question: divs
                ? `"${dim.key}" is divided into groups called divisions. How should users move within "${dim.key}"?`
                : `How should users move between data points in "${dim.key}"?`,
            hint: divs
                ? 'Within each division, users move forward and backward between data points. Drilling in goes inside a division, and drilling out returns to the parent.'
                : undefined,
            options: navOptions(d, dim.key),
            visuals: [{ variant: DIM_TO_DIV[dimVariant(d, dim)] }, tree('div')],
            get: x => presetOf(dimOf(x, dim.key).nav.sibling)?.id ?? '',
            set: (x, v) => {
                dimOf(x, dim.key).nav.sibling = [...SIBLING_PRESETS.find(p => p.id === v)!.names];
                finish(x);
            }
        });
        add({
            id: `dim-endpoint-data-${dim.key}`,
            chapter: 2,
            input: 'radio',
            question: divs
                ? `When the user reaches the end of a division in "${dim.key}", what should happen?`
                : `When the user reaches the last data point in "${dim.key}", what should happen?`,
            hint: 'If items form a cycle, looping feels natural. If they have a clear end, stopping is cleaner.',
            options: [
                { value: 'circular', label: 'Loop back to the beginning', suggested: dim.type === 'categorical' },
                { value: 'terminal', label: 'Stop at the last item' },
                ...(dim.type === 'numerical'
                    ? [
                          {
                              value: 'bridgedCousins',
                              label: 'Continue into the next range',
                              description:
                                  'Moving past the end of one range continues into the next range that has data.',
                              suggested: true
                          }
                      ]
                    : [])
            ],
            visuals: [tree(divs ? 'div' : 'dim')],
            get: x => dimOf(x, dim.key).extents,
            set: (x, v) => (dimOf(x, dim.key).extents = v)
        });
    }
    if (dims.length > 1) {
        const across = ['line', 'area', 'stacked-bar', 'clustered-bar'].includes(d.chart.type);
        add({
            id: 'cross-group-nav',
            chapter: 2,
            input: 'radio',
            question: 'At an individual data point, can users jump to the same position in a neighboring dimension?',
            hint: 'If data is grouped by region and by year, jumping lets a user go from "2020, North" to "2020, South" without going up and back down.',
            options: [
                {
                    value: 'within',
                    label: 'No, keep them within their dimension',
                    description: 'Best when dimensions are independent or have different numbers of items.',
                    suggested: !across
                },
                {
                    value: 'across',
                    label: 'Yes, let them jump across dimensions',
                    description: 'Best when dimensions line up, like stacked bars or multi-series lines.',
                    suggested: across
                }
            ],
            visuals: [{ variant: `${fam}-leaf` }, tree('dim')],
            get: x => x.recipe.childmost,
            set: (x, v) => (x.recipe.childmost = v)
        });
    }

    const numeric = fields.filter(f => f.type === 'numerical').map(f => f.key);
    for (const dim of dims) {
        add({
            id: `dim-label-${dim.key}`,
            chapter: 3,
            input: 'label',
            question: `What should a screen reader say when a user arrives at the "${dim.key}" dimension?`,
            hint: 'Users often want to know what the dimension is and what is inside. The options below help you build summaries.',
            expandable: LABEL_HELP,
            label: { level: 1, dimensionKey: dim.key, suggestedFields: [{ key: dim.key }] },
            visuals: [{ variant: dimVariant(d, dim) }, tree('dim')],
            get: x =>
                x.recipe.labels.perDimension[dim.key] ?? template({ template: `{key:"${dim.key}"}`, name: 'group' }),
            set: (x, v: LabelTemplate) => (x.recipe.labels.perDimension[dim.key] = v)
        });
        if (hasDivisions(rows, dim))
            add({
                id: `div-label-${dim.key}`,
                chapter: 3,
                input: 'label',
                question: `What should a screen reader say at each ${dim.type === 'numerical' ? 'range' : 'group'} of "${dim.key}"?`,
                hint: `This template applies to every division of "${dim.key}". {value:"${dim.key}"} becomes the ${dim.type === 'numerical' ? 'range, like "10 to 20"' : 'category value'}.`,
                expandable: LABEL_HELP,
                label: {
                    level: 2,
                    dimensionKey: dim.key,
                    suggestedFields: [{ key: dim.key }],
                    suggestedAggField: dim.type === 'numerical' ? dim.key : numeric[0]
                },
                visuals: [{ variant: scatter ? 'scatter-div-num' : 'stack-div-col' }, tree('div')],
                get: x =>
                    x.recipe.labels.perDivision[dim.key] ??
                    template({ template: `{value:"${dim.key}"}`, name: dim.type === 'numerical' ? 'range' : 'group' }),
                set: (x, v: LabelTemplate) => (x.recipe.labels.perDivision[dim.key] = v)
            });
    }
    const ranks = ['1st', '2nd', '3rd'];
    add({
        id: 'leaf-label',
        chapter: 3,
        input: 'label',
        question: 'What should a screen reader say at an individual data point?',
        hint: 'The ★ suggested fields became dimensions, so they matter most. Include more if it helps people understand the data.',
        expandable: LABEL_HELP,
        label: {
            level: 3,
            suggestedFields: [
                ...dims.filter(x => x.type === 'numerical').map((x, i) => ({ key: x.key, rank: ranks[i] })),
                ...dims.filter(x => x.type === 'categorical').map(x => ({ key: x.key }))
            ]
        },
        visuals: [{ variant: `${fam}-leaf` }, tree('leaf')],
        get: x =>
            x.recipe.labels.leaves.template
                ? x.recipe.labels.leaves
                : { ...x.recipe.labels.leaves, template: leafDefault(x) },
        set: (x, v: LabelTemplate) => (x.recipe.labels.leaves = v)
    });
    return qs;
}
