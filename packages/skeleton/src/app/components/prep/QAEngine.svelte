<script lang="ts">
    import { onDestroy } from 'svelte';
    import {
        appState,
        type PrepState,
        type SchemaState,
        type DimensionSchema,
        type LabelTemplate,
        type QAChapterId,
    } from '../../../store/appState';
    import QAQuestion from './QAQuestion.svelte';
    import { computeDimensionSuggestion } from './dimensionSuggestions';

    // ── Types (used by Tasks 11–14 to define chapter content) ─────────────────
    type Row = Record<string, unknown>;

    interface QAOption {
        value: string;
        label: string;
        description?: string;
        disabled?: boolean;
        suggested?: boolean; // highlights the option as a chart-type-aware recommendation
    }

    interface StoreUpdate {
        prepPatch?: (prev: PrepState) => PrepState;
        schemaPatch?: (prev: SchemaState) => SchemaState;
    }

    interface QAQuestionDef {
        id: string;
        question: string;
        hint?: string;
        inputType: 'text' | 'textarea' | 'dropdown' | 'multiselect' | 'radio' | 'label-builder' | 'drag-order';
        options?: QAOption[];
        getDynamicOptions?: (prep: PrepState, schema: SchemaState, data: Row[] | null) => QAOption[];
        nodeType?: 'level0' | 'level1' | 'level2' | 'level3';
        getFields?: (prep: PrepState) => string[];
        getSampleData?: (data: Row[] | null, prep: PrepState) => Row;
        defaultValue?: unknown; // overrides generic defaultValue() when no saved answer exists
        maxSelect?: number; // multiselect only — limits selection count
        expandableInfo?: { buttonLabel: string; content: string };
        suggestionBox?: { message: string; applyLabel: string; applyValue: unknown };
        onAnswer: (value: unknown, prep: PrepState, schema: SchemaState, data: Row[] | null) => StoreUpdate;
    }

    interface QAChapterDef {
        id: QAChapterId;
        label: string;
        getQuestions: (prep: PrepState, schema: SchemaState, data: Row[] | null) => QAQuestionDef[];
    }

    // ── Nav slot constants (mirrors SchemaPanel.NAV_SLOTS / DRILL_OUT_KEYS) ─────
    const NAV_SLOTS_QA = [
        { forwardName: 'up',      forwardKey: 'ArrowUp',    backwardName: 'down',     backwardKey: 'ArrowDown'  },
        { forwardName: 'left',    forwardKey: 'ArrowLeft',  backwardName: 'right',    backwardKey: 'ArrowRight' },
        { forwardName: 'forward', forwardKey: '[',          backwardName: 'backward', backwardKey: ']'          },
    ] as const;
    const DRILL_OUT_KEYS_QA = ['w', 'j', '\\'] as const;

    function makeValidId(s: string): string {
        return '_' + s.replace(/[^a-zA-Z0-9_-]+/g, '_');
    }

    // ── Chart type label map (used in Chapter 1 root-announcement composition) ─
    const CHART_TYPE_LABELS: Readonly<Record<string, string>> = {
        'bar':           'Bar chart',
        'stacked-bar':   'Stacked bar chart',
        'clustered-bar': 'Clustered bar chart',
        'line':          'Line chart',
        'area':          'Area chart',
        'scatter':       'Scatter plot',
        'pie':           'Pie chart',
        'donut':         'Donut chart',
        'heatmap':       'Heatmap',
        'treemap':       'Treemap',
        'network':       'Network or relationship diagram',
        'map':           'Map or geographic chart',
    };


    // ── Helper: append "Contains interactive elements." to root announcement ──
    // Called inside prepPatch closures for any question that marks elements interactive.
    // Only modifies state if level0 is enabled and the string isn't already there.
    function appendInteractiveToRoot(p: PrepState, schAtCall: SchemaState): PrepState {
        if (!schAtCall.level0Enabled) return p;
        const rootCh = p.qaProgress.chapters.find(c => c.id === 'top-level-access');
        const current = ((rootCh?.answers?.['root-announcement']) as string | undefined) ?? '';
        if (current.toLowerCase().includes('interactive')) return p;
        const updated = (current.trim() ? current.trimEnd() + ' ' : '') + 'Contains interactive elements.';
        return {
            ...p,
            labelConfig: { ...p.labelConfig, level0: { ...p.labelConfig.level0, template: updated } },
            qaProgress: {
                ...p.qaProgress,
                chapters: p.qaProgress.chapters.map(ch =>
                    ch.id === 'top-level-access'
                        ? { ...ch, answers: { ...ch.answers, 'root-announcement': updated } }
                        : ch
                ),
            },
        };
    }

    // ── Chapter definitions (Tasks 11–14) ────────────────────────────────────
    const CHAPTERS: QAChapterDef[] = [

        // ── Chapter 1: Top-level access (Task 11) ────────────────────────────
        {
            id: 'top-level-access',
            label: 'Top-level access',
            getQuestions: (prep, _schema, _data): QAQuestionDef[] => {
                const ch1Ans = prep.qaProgress.chapters.find(c => c.id === 'top-level-access')?.answers ?? {};

                // Q1.1 — Root node: the first question asked
                const questions: QAQuestionDef[] = [
                    {
                        id: 'root-node',
                        question: 'Does your visualization have a single starting point that everything else branches from?',
                        hint: 'Think of it like a home page — a place where navigation begins before drilling into any specific group.',
                        inputType: 'radio',
                        options: [
                            { value: 'yes', label: 'Yes — there is a clear entry point', description: 'Great for guided, hierarchical navigation. Recommended for most datasets.' },
                            { value: 'no',  label: 'No — let users start at the first group directly', description: 'Navigation begins at the first browsing group without a parent node. Recommended if you already have a high-level description elsewhere.' },
                        ],
                        onAnswer: (value, _p, _s, _d) => ({
                            schemaPatch: (sch) => ({ ...sch, level0Enabled: value === 'yes' }),
                        }),
                    },
                ];

                // Q1.4 — Chart type dropdown (always shown; hint adapts to root-node choice)
                questions.push({
                    id: 'chart-type',
                    question: 'What type of chart or visualization is this?',
                    hint: ch1Ans['root-node'] === 'yes'
                        ? 'This is announced in the opening description so screen reader users know what kind of chart they are exploring.'
                        : 'This helps us suggest some options later.',
                    inputType: 'dropdown',
                    options: [
                        { value: 'bar',           label: 'Bar chart' },
                        { value: 'stacked-bar',   label: 'Stacked bar chart' },
                        { value: 'clustered-bar', label: 'Clustered bar chart' },
                        { value: 'line',          label: 'Line chart' },
                        { value: 'area',          label: 'Area chart' },
                        { value: 'scatter',       label: 'Scatter plot' },
                        { value: 'pie',           label: 'Pie chart' },
                        { value: 'donut',         label: 'Donut chart' },
                        { value: 'heatmap',       label: 'Heatmap' },
                        { value: 'treemap',       label: 'Treemap' },
                        { value: 'network',       label: 'Network or relationship diagram' },
                        { value: 'map',           label: 'Map or geographic chart' },
                        { value: 'custom',        label: 'Custom...' },
                    ],
                    onAnswer: (_value, _p, _s, _d) => ({}),
                });

                // Q1.4b — Custom chart type (only when Q1.4 = 'custom')
                if (ch1Ans['chart-type'] === 'custom') {
                    questions.push({
                        id: 'chart-type-custom',
                        question: 'What would you call this type of visualization?',
                        hint: 'Describe it in plain terms — users will hear this. Example: "bubble chart", "timeline", "network diagram".',
                        inputType: 'text',
                        defaultValue: 'chart',
                        onAnswer: (_value, _p, _s, _d) => ({}),
                    });
                }

                // Q1.2–Q1.3, Q1.5–Q1.6 only appear when Q1.1 = 'yes'
                if (ch1Ans['root-node'] === 'yes') {

                    // Q1.2 — Dataset description (alt text for the root node)
                    questions.push({
                        id: 'dataset-description',
                        question: 'What does this chart or dataset represent, in plain English?',
                        hint: 'Example: "Monthly sales figures for each product and region." This becomes the opening description that screen readers use to introduce the data.',
                        inputType: 'text',
                        onAnswer: (_value, _p, _s, _d) => ({}),
                    });

                    // Q1.3 — Root label (optional rename; internal only)
                    questions.push({
                        id: 'root-label',
                        question: 'We call this starting point the "root" node. Do you want to give it another name?',
                        hint: 'This name is only used for building the structure — it is not something that end users will encounter. You can leave it as "root" if you\'d like.',
                        inputType: 'text',
                        defaultValue: 'root',
                        onAnswer: (value, _p, _s, _d) => ({
                            schemaPatch: (sch) => ({ ...sch, level0Id: makeValidId((value as string) || 'root') }),
                            prepPatch: (p) => ({
                                ...p,
                                labelConfig: {
                                    ...p.labelConfig,
                                    level0: { ...p.labelConfig.level0, name: (value as string) || 'root' },
                                },
                            }),
                        }),
                    });

                    // Q1.5 — Interactive elements checkbox
                    questions.push({
                        id: 'interactive-elements',
                        question: 'Does this visualization contain interactive elements that users can select, click, or otherwise interact with?',
                        hint: 'This will be mentioned in the opening description so screen reader users know what to expect before they start exploring.',
                        inputType: 'radio',
                        options: [
                            { value: 'yes', label: 'Yes — users can interact with elements in this chart' },
                            { value: 'no',  label: 'No — this is a display-only visualization' },
                        ],
                        onAnswer: (_value, _p, _s, _d) => ({}),
                    });

                    // Q1.6 — Root announcement (pre-composed, user-editable)
                    // Build the suggested text from answers accumulated so far in this chapter.
                    const desc         = ((ch1Ans['dataset-description'] as string | undefined) ?? '').trim();
                    const chartTypeVal = (ch1Ans['chart-type'] as string | undefined) ?? '';
                    const customChart  = ((ch1Ans['chart-type-custom'] as string | undefined) ?? 'chart').trim() || 'chart';
                    const resolvedChart = chartTypeVal === 'custom'
                        ? customChart
                        : (CHART_TYPE_LABELS[chartTypeVal] ?? '');
                    const isInteractive = ch1Ans['interactive-elements'] === 'yes';
                    const parts: string[] = [];
                    if (desc)           parts.push(desc.endsWith('.')           ? desc           : desc + '.');
                    if (resolvedChart)  parts.push(resolvedChart.endsWith('.')  ? resolvedChart  : resolvedChart + '.');
                    if (isInteractive)  parts.push('This chart contains interactive elements.');
                    const suggestedAnnouncement = parts.join(' ');

                    questions.push({
                        id: 'root-announcement',
                        question: 'This is what your starting point will announce to users. Feel free to edit it:',
                        hint: 'Screen readers will read this text when users arrive at the entry point of your visualization.',
                        inputType: 'textarea',
                        defaultValue: suggestedAnnouncement,
                        onAnswer: (value, _p, _s, _d) => ({
                            prepPatch: (p) => ({
                                ...p,
                                labelConfig: {
                                    ...p.labelConfig,
                                    level0: { ...p.labelConfig.level0, template: value as string },
                                },
                            }),
                        }),
                    });
                }

                return questions;
            },
        },

        // ── Chapter 2: Dimensions (Task 12) ──────────────────────────────────
        {
            id: 'dimensions',
            label: 'Browsing groups',
            getQuestions: (prep, schema, data): QAQuestionDef[] => {
                const includedDims = schema.dimensions
                    .filter(d => d.included)
                    .sort((a, b) => (a.navIndex ?? 99) - (b.navIndex ?? 99));

                const ch1Ans = prep.qaProgress.chapters.find(c => c.id === 'top-level-access')?.answers ?? {};
                const chartTypeForHint = (ch1Ans['chart-type'] as string | undefined) ?? '';
                const chartLabelForHint = chartTypeForHint ? (CHART_TYPE_LABELS[chartTypeForHint] ?? '') : '';
                const chooseDimHint = chartLabelForHint
                    ? `These become the main paths through your data. Pick no more than 3. Variables marked ★ Suggested are recommended for a ${chartLabelForHint}.`
                    : 'These become the main paths through your data. Pick no more than 3. Skip variables that are only used for IDs, labels, or raw signal values.';

                const ch2Ans = prep.qaProgress.chapters.find(c => c.id === 'dimensions')?.answers ?? {};
                const idConfirmAnswer = ch2Ans['confirm-id-variable'] as string | undefined;
                const idVar = prep.variables.find(v => v.isId);

                const questions: QAQuestionDef[] = [
                    {
                        id: 'choose-dimensions',
                        question: 'Which variables in your data should be used to structure how users navigate and browse dimensions in your chart?',
                        hint: chooseDimHint,
                        inputType: 'multiselect',
                        maxSelect: 3,
                        expandableInfo: {
                            buttonLabel: 'What are dimensions?',
                            content: 'This step helps us to create what we call "dimensions," which are like paths, through the data. The best dimensions to choose are typically the ones that are used to create the chart\'s visual structure. And don\'t worry if all of your data is useful to your end user, we can make sure they can read any of it later when we create labels. But choose the dimensions here that determine how they should get around and what is most important.',
                        },
                        getDynamicOptions: (p, _s, d) => {
                            // Compute per-variable suggestions based on chart type answer
                            const ch1Ans = p.qaProgress.chapters.find(c => c.id === 'top-level-access')?.answers ?? {};
                            const chartType = (ch1Ans['chart-type'] as string | undefined) ?? '';
                            const suggestions = chartType ? computeDimensionSuggestion(chartType, p.variables, d) : null;

                            return p.variables
                                .filter(v => !v.removed)
                                .map(v => {
                                    const vals = (d ?? []).map(row => row[v.key]).filter(x => x != null);
                                    const unique = [...new Set(vals.map(x => String(x)))];
                                    const baseDesc = v.type === 'numerical'
                                        ? (() => {
                                            const nums = vals.map(x => Number(x)).filter(x => !isNaN(x));
                                            return nums.length > 0
                                                ? `NUM — range: ${Math.min(...nums)}–${Math.max(...nums)}`
                                                : 'NUM';
                                        })()
                                        : `CAT — ${unique.length} unique value${unique.length !== 1 ? 's' : ''}`;
                                    const s = suggestions?.[v.key];
                                    return {
                                        value: v.key,
                                        label: v.key,
                                        description: s ? `${baseDesc} · ${s.note}` : baseDesc,
                                        suggested: s?.primary ?? false,
                                    };
                                });
                        },
                        onAnswer: (value, prepAtCall, _s, _d) => {
                            const selected = Array.isArray(value) ? (value as string[]) : [];
                            return {
                                prepPatch: (p) => ({
                                    ...p,
                                    hasRun: true, // user has now configured dimensions — lock in their schema choices
                                    variables: p.variables.map(v => ({
                                        ...v,
                                        isDimension: selected.includes(v.key),
                                    })),
                                }),
                                schemaPatch: (sch) => {
                                    const existing = sch.dimensions;
                                    const newDims: DimensionSchema[] = selected.map((key, idx) => {
                                        const prev = existing.find(d => d.key === key);
                                        const varMeta = prepAtCall.variables.find(v => v.key === key);
                                        const type = varMeta?.type ?? prev?.type ?? 'categorical';
                                        if (prev) return { ...prev, included: true, navIndex: idx, type };
                                        return {
                                            key, type, included: true, navIndex: idx,
                                            extents: (type === 'categorical' ? 'circular' : 'bridgedCousins') as DimensionSchema['extents'],
                                            compressSparseDivisions: true,
                                            sortMethod: (type === 'numerical' ? 'ascending' : 'none') as DimensionSchema['sortMethod'],
                                            subdivisions: 4, divisions: [],
                                            forwardName: '', forwardKey: '',
                                            backwardName: '', backwardKey: '',
                                            drillInName: 'drill in', drillInKey: 'Enter',
                                            drillOutName: 'drill out', drillOutKey: 'Backspace',
                                        };
                                    });
                                    const unselected = existing
                                        .filter(d => !selected.includes(d.key))
                                        .map(d => ({ ...d, included: false, navIndex: null }));
                                    return { ...sch, dimensions: [...newDims, ...unselected] };
                                },
                            };
                        },
                    },
                ];

                // Q2.0 — Confirm ID variable (inserted before choose-dimensions)
                if (idVar || idConfirmAnswer !== undefined) {
                    questions.unshift({
                        id: 'confirm-id-variable',
                        question: idVar
                            ? `We identified "${idVar.key}" as containing only unique values. Will this variable always remain full of unique values? If so, can we use this for IDs?`
                            : `We previously identified a potential ID variable. Can we use it as the unique row identifier?`,
                        inputType: 'radio',
                        options: [
                            { value: 'yes', label: 'Yes, use it as the ID column', suggested: true },
                            { value: 'no', label: 'No, don\'t use this as the ID' },
                        ],
                        onAnswer: (value, prepAtCall, _s, _d) => {
                            if (value === 'no') {
                                const currentIdVar = prepAtCall.variables.find(v => v.isId);
                                if (currentIdVar) {
                                    return {
                                        prepPatch: (p) => ({
                                            ...p,
                                            variables: p.variables.map(v =>
                                                v.key === currentIdVar.key ? { ...v, isId: false } : v
                                            ),
                                        }),
                                    };
                                }
                            }
                            return {};
                        },
                    });
                }

                // Q2.0b — ID creator prompt (only if user rejected auto-detected ID)
                if (idConfirmAnswer === 'no') {
                    // Insert after confirm-id-variable, before choose-dimensions
                    questions.splice(1, 0, {
                        id: 'id-creator-prompt',
                        question: 'IDs will be generated randomly during structure creation. Would you like to create your own IDs now instead?',
                        inputType: 'radio',
                        options: [
                            { value: 'yes', label: 'Yes, I\'ll create IDs now' },
                            { value: 'no', label: 'No, use randomly generated IDs' },
                        ],
                        onAnswer: (_value, _p, _s, _d) => ({}),
                    });
                }

                // Per-dimension questions (Q2.2, Q2.3, Q2.4)
                for (const dim of includedDims) {
                    // Q2.2 — Confirm type
                    questions.push({
                        id: `dim-type-${dim.key}`,
                        question: `We think "${dim.key}" contains ${dim.type === 'categorical' ? 'categorical' : 'numerical'} values. Does that sound right?`,
                        hint: dim.type === 'categorical'
                            ? 'Categorical means the values are labels or names — like "North", "South", "East".'
                            : 'Numerical means the values are numbers — like prices, counts, or measurements.',
                        inputType: 'radio',
                        options: [
                            { value: 'yes', label: 'Yes, that\'s right' },
                            dim.type === 'categorical'
                                ? { value: 'no', label: 'No — these are numbers' }
                                : { value: 'no', label: 'No — these are categories (names or labels)' },
                        ],
                        onAnswer: (value, _p, _s, _d) => {
                            const newType: 'numerical' | 'categorical' =
                                value === 'yes' ? dim.type :
                                dim.type === 'categorical' ? 'numerical' : 'categorical';
                            return {
                                prepPatch: (p) => ({
                                    ...p,
                                    variables: p.variables.map(v =>
                                        v.key === dim.key ? { ...v, type: newType } : v
                                    ),
                                }),
                                schemaPatch: (sch) => ({
                                    ...sch,
                                    dimensions: sch.dimensions.map(d =>
                                        d.key === dim.key ? {
                                            ...d, type: newType,
                                            sortMethod: (newType === 'numerical' ? 'ascending' : 'none') as DimensionSchema['sortMethod'],
                                            extents: (newType === 'categorical' ? 'circular' : 'bridgedCousins') as DimensionSchema['extents'],
                                        } : d
                                    ),
                                }),
                            };
                        },
                    });

                    // Q2.3 — Subdivisions (numerical only)
                    if (dim.type === 'numerical') {
                        questions.push({
                            id: `dim-subdivisions-${dim.key}`,
                            question: `For "${dim.key}", how many buckets should we split the number range into?`,
                            hint: 'For example, if values range from 0–100 and you pick 4 buckets, users navigate through 4 ranges: 0–25, 25–50, 50–75, 75–100. Fewer buckets = easier to navigate; more = more precision. 4 is a good starting point.',
                            inputType: 'dropdown',
                            options: [
                                { value: '2', label: '2 buckets' },
                                { value: '3', label: '3 buckets' },
                                { value: '4', label: '4 buckets (recommended)' },
                                { value: '5', label: '5 buckets' },
                                { value: '6', label: '6 buckets' },
                                { value: '8', label: '8 buckets' },
                                { value: '10', label: '10 buckets' },
                                { value: '12', label: '12 buckets' },
                            ],
                            defaultValue: '4',
                            onAnswer: (value, _p, _s, _d) => ({
                                schemaPatch: (sch) => ({
                                    ...sch,
                                    dimensions: sch.dimensions.map(d =>
                                        d.key === dim.key ? { ...d, subdivisions: Number(value) } : d
                                    ),
                                }),
                            }),
                        });
                    }

                    // Q2.4 — Sort order
                    questions.push({
                        id: `dim-sort-${dim.key}`,
                        question: `In what order should "${dim.key}" groups appear?`,
                        inputType: 'radio',
                        options: dim.type === 'categorical'
                            ? [
                                { value: 'none', label: 'Original order (as they appear in the data)' },
                                { value: 'ascending', label: 'Alphabetical (A → Z)' },
                                { value: 'descending', label: 'Reverse alphabetical (Z → A)' },
                            ]
                            : [
                                { value: 'ascending', label: 'Lowest to highest' },
                                { value: 'descending', label: 'Highest to lowest' },
                            ],
                        onAnswer: (value, _p, _s, _d) => ({
                            schemaPatch: (sch) => ({
                                ...sch,
                                dimensions: sch.dimensions.map(d =>
                                    d.key === dim.key
                                        ? { ...d, sortMethod: value as DimensionSchema['sortMethod'] }
                                        : d
                                ),
                            }),
                        }),
                    });
                }

                // Q2.5 — Dimension order (only if 2+ dimensions selected)
                if (includedDims.length >= 2) {
                    questions.push({
                        id: 'dim-order',
                        question: 'In what order should your browsing groups be layered? Use the up/down buttons to reorder.',
                        hint: 'The first group is the outermost layer — users navigate into it first. Later groups are nested deeper inside.',
                        inputType: 'drag-order',
                        options: includedDims.map(d => ({ value: d.key, label: d.key })),
                        defaultValue: includedDims.map(d => d.key),
                        onAnswer: (value, _p, _s, _d) => {
                            const newOrder = Array.isArray(value) ? (value as string[]) : [];
                            return {
                                schemaPatch: (sch) => ({
                                    ...sch,
                                    dimensions: sch.dimensions.map(d => {
                                        const newIdx = newOrder.indexOf(d.key);
                                        return newIdx === -1 ? d : { ...d, navIndex: newIdx };
                                    }),
                                }),
                            };
                        },
                    });
                }

                return questions;
            },
        },

        // ── Chapter 3: Navigation (Task 13) ──────────────────────────────────
        {
            id: 'navigation',
            label: 'Navigation',
            getQuestions: (prep, schema, _data): QAQuestionDef[] => {
                const dims = schema.dimensions
                    .filter(d => d.included)
                    .sort((a, b) => (a.navIndex ?? 99) - (b.navIndex ?? 99));

                // Slot assignment per preset: index = dim position (by navIndex), value = which NAV_SLOTS_QA entry to use
                const SLOT_ORDER: Record<string, number[]> = {
                    updown:    [0, 1, 2],
                    leftright: [1, 0, 2],
                    brackets:  [2, 0, 1],
                };

                const questions: QAQuestionDef[] = [
                    {
                        id: 'nav-preset',
                        question: 'How should keyboard users move between groups in your data? Pick the key layout that fits your visualization.',
                        hint: "There's no wrong answer — these are just defaults that users can customize later.",
                        inputType: 'radio',
                        options: [
                            { value: 'updown',    label: 'Up/Down arrows (+ W to go back up)',       description: 'Press ↑/↓ to move between groups. Press Enter to go inside a group. Press W to return to the parent level.' },
                            { value: 'leftright', label: 'Left/Right arrows (+ J to go back up)',    description: 'Press ←/→ to move between groups. Press Enter to go inside a group. Press J to return to the parent level.' },
                            { value: 'brackets',  label: '[ and ] brackets (+ \\ to go back up)',   description: 'Press [ or ] to move between groups. Press Enter to go inside a group. Press \\ to return to the parent level.' },
                        ],
                        onAnswer: (value, _p, _s, _d) => {
                            const preset = value as string;
                            return {
                                schemaPatch: (sch) => {
                                    const sortedDims = sch.dimensions
                                        .filter(d => d.included)
                                        .sort((a, b) => (a.navIndex ?? 99) - (b.navIndex ?? 99));
                                    const slotOrder = SLOT_ORDER[preset] ?? [0, 1, 2];
                                    const updatedDims = sch.dimensions.map(d => {
                                        if (!d.included) return d;
                                        const dimIdx = sortedDims.findIndex(sd => sd.key === d.key);
                                        if (dimIdx < 0) return d;
                                        const slotIdx = slotOrder[dimIdx] ?? dimIdx;
                                        const slot = NAV_SLOTS_QA[slotIdx] ?? NAV_SLOTS_QA[0];
                                        const drillOutKey = sortedDims.length > 1
                                            ? (DRILL_OUT_KEYS_QA[d.navIndex ?? 0] ?? 'Backspace')
                                            : 'Backspace';
                                        return {
                                            ...d,
                                            forwardName: slot.forwardName,
                                            forwardKey: slot.forwardKey,
                                            backwardName: slot.backwardName,
                                            backwardKey: slot.backwardKey,
                                            drillInName: 'drill in',
                                            drillInKey: 'Enter',
                                            drillOutName: sortedDims.length > 1 ? `drill out to ${d.key}` : 'drill out',
                                            drillOutKey,
                                        };
                                    });
                                    const firstSlotIdx = slotOrder[0] ?? 1;
                                    const firstSlot = NAV_SLOTS_QA[firstSlotIdx] ?? NAV_SLOTS_QA[1];
                                    return {
                                        ...sch,
                                        dimensions: updatedDims,
                                        level1NavForwardName: firstSlot.forwardName,
                                        level1NavForwardKey: firstSlot.forwardKey,
                                        level1NavBackwardName: firstSlot.backwardName,
                                        level1NavBackwardKey: firstSlot.backwardKey,
                                    };
                                },
                            };
                        },
                    },
                ];

                // Q3.2 — Per-dimension extent behavior
                for (const dim of dims) {
                    questions.push({
                        id: `dim-extents-${dim.key}`,
                        question: `When a user reaches the last group in "${dim.key}", what should happen?`,
                        hint: 'Think about what feels natural for your data. If groups represent a continuous cycle (like months of the year), looping makes sense. If they represent distinct categories with clear endpoints, stopping there is cleaner.',
                        inputType: 'radio',
                        options: [
                            { value: 'circular',       label: 'Loop back to the beginning',       description: 'After the last group, navigation wraps around to the first group. Good for cyclical data (months, days of week).' },
                            { value: 'terminal',       label: 'Stop at the last group',            description: 'Navigation stops at the final group. Good for ordered data with a clear start and end.' },
                            ...(dim.type === 'numerical' ? [{ value: 'bridgedCousins', label: 'Skip empty groups (numerical only)', description: 'If some buckets have no data, navigation skips over them to the next group that has data. Only available for number ranges.' }] : []),
                        ],
                        onAnswer: (value, _p, _s, _d) => ({
                            schemaPatch: (sch) => ({
                                ...sch,
                                dimensions: sch.dimensions.map(d =>
                                    d.key === dim.key
                                        ? { ...d, extents: value as DimensionSchema['extents'] }
                                        : d
                                ),
                            }),
                        }),
                    });
                }

                // Q3.3 — Top-level extent (only if no root/level0 node)
                if (!schema.level0Enabled) {
                    questions.push({
                        id: 'top-level-extents',
                        question: 'When a user reaches the last browsing group at the top level, what should happen?',
                        hint: "The 'top level' is where your main groups live — e.g., 'Category A', 'Category B', 'Category C'. This decides what happens after the last one.",
                        inputType: 'radio',
                        options: [
                            { value: 'circular', label: 'Loop back to the first group' },
                            { value: 'terminal', label: 'Stop at the last group' },
                        ],
                        onAnswer: (value, _p, _s, _d) => ({
                            schemaPatch: (sch) => ({
                                ...sch,
                                level1Extents: value as SchemaState['level1Extents'],
                            }),
                        }),
                    });
                }

                // Q3.4 — Cross-group nav at data level (only if 2+ dimensions)
                if (dims.length >= 2) {
                    questions.push({
                        id: 'cross-group-nav',
                        question: 'When a user is looking at an individual data point, can they jump directly to the same position in a neighboring group?',
                        hint: 'Example: If your data is grouped by region AND by year, "jump to same position" means: while viewing "2020, North", the user can press a key to jump to "2020, South" — without going back up and drilling down again. This works best when groups have matching items in the same position.',
                        inputType: 'radio',
                        options: [
                            { value: 'across', label: 'Yes — let them jump across groups',      description: 'Best when groups have the same number of items in the same order (e.g., stacked bar charts, line charts with multiple series).' },
                            { value: 'within', label: 'No — keep them within their current group', description: 'Best when groups are independent (e.g., different categories with different numbers of items).' },
                        ],
                        onAnswer: (value, _p, _s, _d) => ({
                            schemaPatch: (sch) => ({
                                ...sch,
                                childmostNavigation: value as SchemaState['childmostNavigation'],
                            }),
                        }),
                    });
                }

                return questions;
            },
        },

        // ── Chapter 4: Labels & announcements (Task 14) ──────────────────────
        {
            id: 'leaf-node-patterns',
            label: 'Labels & announcements',
            getQuestions: (prep, schema, data): QAQuestionDef[] => {
                const dims = schema.dimensions
                    .filter(d => d.included)
                    .sort((a, b) => (a.navIndex ?? 99) - (b.navIndex ?? 99));

                const INTERACTIVE_OPTIONS: QAOption[] = [
                    { value: 'yes', label: 'Yes — users can interact with these elements' },
                    { value: 'no',  label: 'No — these are display only' },
                ];

                const questions: QAQuestionDef[] = [
                    // Q4.1 — Leaf label template
                    {
                        id: 'leaf-label',
                        question: "Let's set up a template for how individual data points are announced. When a user navigates to one, what should a screen reader say?",
                        hint: "Use the field buttons below to build your template. The placeholders like {value:\"score\"} are automatically replaced with real data from each row. You're setting this up once — it will apply to every data point in your visualization. The preview shows what it will sound like for one example row.",
                        inputType: 'label-builder',
                        nodeType: 'level3',
                        getFields: (p) => p.variables.filter(v => !v.removed).map(v => v.key),
                        getSampleData: (d, _p) => d?.[0] ?? {},
                        onAnswer: (value, _p, _s, _d) => ({
                            prepPatch: (p) => ({
                                ...p,
                                labelConfig: { ...p.labelConfig, leaves: value as LabelTemplate },
                            }),
                        }),
                    },
                    // Q4.1b — Are individual data points interactive?
                    {
                        id: 'leaf-interactive',
                        question: 'Are individual data points interactive? For example, can users select, click, or otherwise interact with them?',
                        hint: 'If yes, these elements will be given an interactive role (like a button) so screen readers announce them as actionable. Screen readers will say "button" after the label — this comes from the role, not from the label text itself.',
                        inputType: 'radio',
                        options: INTERACTIVE_OPTIONS,
                        onAnswer: (value, _p, _s, _d) => ({
                            prepPatch: (p) => value === 'yes' ? appendInteractiveToRoot(p, _s) : p,
                        }),
                    },
                ];

                // Q4.2 — Group header label + interactive (per dimension)
                for (const dim of dims) {
                    const firstUniqueVal = (() => {
                        const vals = (data ?? []).map(row => row[dim.key]);
                        const unique = [...new Set(vals.map(x => String(x)))];
                        return unique[0] ?? '(example)';
                    })();
                    const countForFirst = (data ?? []).filter(row => String(row[dim.key]) === firstUniqueVal).length;
                    const suggestedTemplate = `{key:"${dim.key}"}: {value:"${dim.key}"}`;

                    // Q4.2a — Group header label
                    questions.push({
                        id: `dim-label-${dim.key}`,
                        question: `Now let's set up a template for "${dim.key}" group headers — what a screen reader says when a user arrives at this type of group.`,
                        hint: `You're writing one template that applies to every group in this browsing layer. The {value:"${dim.key}"} placeholder is replaced with the actual group value for each group. Example: "${dim.key}: Electronics" or "${dim.key}: 2020".`,
                        inputType: 'label-builder',
                        nodeType: 'level1',
                        getFields: (_p) => [dim.key, 'count'],
                        getSampleData: (_d, _p) => ({ [dim.key]: firstUniqueVal, count: countForFirst }),
                        defaultValue: {
                            template: suggestedTemplate, name: dim.key.toLowerCase(),
                            includeIndex: false, includeParentName: false, omitKeyNames: false,
                        } as LabelTemplate,
                        onAnswer: (value, _p, _s, _d) => ({
                            prepPatch: (p) => ({
                                ...p,
                                labelConfig: {
                                    ...p.labelConfig,
                                    perDimension: { ...p.labelConfig.perDimension, [dim.key]: value as LabelTemplate },
                                },
                            }),
                        }),
                    });

                    // Q4.2b — Are group-header nodes interactive?
                    questions.push({
                        id: `dim-interactive-${dim.key}`,
                        question: `Are "${dim.key}" group elements interactive? For example, can users select or click on them?`,
                        hint: 'If yes, screen readers will announce "button" after the label for these groups. This comes from the element\'s role — not the label text.',
                        inputType: 'radio',
                        options: INTERACTIVE_OPTIONS,
                        onAnswer: (value, _p, _s, _d) => ({
                            prepPatch: (p) => value === 'yes' ? appendInteractiveToRoot(p, _s) : p,
                        }),
                    });

                    // Q4.3 — Sub-group label (numerical dims with subdivisions > 1 only)
                    if (dim.type === 'numerical' && dim.subdivisions > 1) {
                        const numVals = (data ?? [])
                            .map(row => Number(row[dim.key]))
                            .filter(n => !isNaN(n))
                            .sort((a, b) => a - b);
                        let exampleRange = '(example range)';
                        let exampleCount = 0;
                        if (numVals.length > 0) {
                            const min = numVals[0];
                            const max = numVals[numVals.length - 1];
                            const bucket = (max - min) / dim.subdivisions;
                            const bMin = min;
                            const bMax = Math.round((min + bucket) * 100) / 100;
                            exampleRange = `${Math.round(bMin * 100) / 100}–${bMax}`;
                            exampleCount = numVals.filter(n => n >= bMin && n < bMin + bucket).length;
                        }

                        // Q4.3a — Sub-group label
                        questions.push({
                            id: `div-label-${dim.key}`,
                            question: `For "${dim.key}" sub-groups, what should a screen reader say when a user arrives at a specific range or subset?`,
                            hint: `This template applies to each sub-group (numeric range) within "${dim.key}". The {value:"range"} placeholder is replaced with the actual range label (e.g., '10–20') for each bucket.`,
                            inputType: 'label-builder',
                            nodeType: 'level2',
                            getFields: (_p) => ['range', 'count'],
                            getSampleData: (_d, _p) => ({ range: exampleRange, count: exampleCount }),
                            defaultValue: {
                                template: '{value:"range"}', name: 'range',
                                includeIndex: false, includeParentName: false, omitKeyNames: false,
                            } as LabelTemplate,
                            onAnswer: (value, _p, _s, _d) => ({
                                prepPatch: (p) => ({
                                    ...p,
                                    labelConfig: {
                                        ...p.labelConfig,
                                        perDivision: { ...p.labelConfig.perDivision, [dim.key]: value as LabelTemplate },
                                    },
                                }),
                            }),
                        });

                        // Q4.3b — Are sub-group nodes interactive?
                        questions.push({
                            id: `div-interactive-${dim.key}`,
                            question: `Are "${dim.key}" sub-group elements interactive? For example, can users select or click on them?`,
                            hint: 'If yes, screen readers will announce "button" after the label for these sub-groups. This comes from the element\'s role — not the label text.',
                            inputType: 'radio',
                            options: INTERACTIVE_OPTIONS,
                            onAnswer: (value, _p, _s, _d) => ({
                                prepPatch: (p) => value === 'yes' ? appendInteractiveToRoot(p, _s) : p,
                            }),
                        });
                    }
                }

                return questions;
            },
        },

    ];

    // ── Store mirrors ─────────────────────────────────────────────────────────
    let prep = $state<PrepState | null>(null);
    let schema = $state<SchemaState | null>(null);
    let data = $state<Row[] | null>(null);

    const unsub = appState.subscribe(s => {
        prep = s.prepState;
        schema = s.schemaState;
        data = s.uploadedData ?? s.prepState?.customData ?? null;
    });
    onDestroy(unsub);

    // ── Derived: current question cursor ──────────────────────────────────────
    const chapterId = $derived<QAChapterId>(
        prep?.qaProgress.currentChapterId ?? 'top-level-access'
    );
    const questionId = $derived(prep?.qaProgress.currentQuestionId ?? '');

    const chapterIndex = $derived(CHAPTERS.findIndex(c => c.id === chapterId));
    const currentChapterDef = $derived(CHAPTERS[chapterIndex] ?? CHAPTERS[0]);

    const currentQuestions = $derived.by((): QAQuestionDef[] => {
        if (!prep || !schema) return [];
        return currentChapterDef.getQuestions(prep, schema, data);
    });

    const currentQuestion = $derived(
        currentQuestions.find(q => q.id === questionId) ?? currentQuestions[0]
    );

    const currentQuestionIndex = $derived(
        currentQuestion ? currentQuestions.findIndex(q => q.id === currentQuestion.id) : 0
    );

    const isAtStart = $derived(chapterIndex === 0 && currentQuestionIndex <= 0);
    const isAtEnd = $derived(
        chapterIndex === CHAPTERS.length - 1 &&
        currentQuestionIndex >= currentQuestions.length - 1
    );

    const resolvedOptions = $derived.by((): QAOption[] => {
        if (!currentQuestion) return [];
        if (currentQuestion.getDynamicOptions && prep && schema) {
            return currentQuestion.getDynamicOptions(prep, schema, data);
        }
        return currentQuestion.options ?? [];
    });

    const resolvedFields = $derived.by((): string[] => {
        if (!currentQuestion?.getFields || !prep) return [];
        return currentQuestion.getFields(prep);
    });

    const resolvedSampleData = $derived.by((): Row => {
        if (!currentQuestion?.getSampleData || !prep) return {};
        return currentQuestion.getSampleData(data, prep);
    });

    // ── Pending answer (local; committed to store on Next) ────────────────────
    let pendingValue = $state<unknown>('');

    function defaultValue(inputType: string): unknown {
        if (inputType === 'multiselect' || inputType === 'drag-order') return [];
        if (inputType === 'label-builder') {
            const tmpl: LabelTemplate = { template: '', name: 'data point', includeIndex: false, includeParentName: false, omitKeyNames: false };
            return tmpl;
        }
        return '';
    }

    // Preload saved answer whenever the active question changes.
    // Falls back to question-specific defaultValue, then generic defaultValue().
    $effect(() => {
        if (!currentQuestion || !prep) return;
        const chapter = prep.qaProgress.chapters.find(c => c.id === chapterId);
        const saved = chapter?.answers[currentQuestion.id];
        if (saved !== undefined) {
            pendingValue = saved;
        } else if (currentQuestion.defaultValue !== undefined) {
            pendingValue = currentQuestion.defaultValue;
        } else {
            pendingValue = defaultValue(currentQuestion.inputType);
        }
    });

    // ── Navigation ────────────────────────────────────────────────────────────
    function handleNext() {
        if (!prep || !schema || !currentQuestion) return;

        const update = currentQuestion.onAnswer(pendingValue, prep, schema, data);
        const snapshotQId = currentQuestion.id;
        const snapshotChId = chapterId;
        const snapshotChIdx = chapterIndex;
        // Snapshot the chapter def so we can re-evaluate questions inside appState.update
        const snapshotChapterDef = currentChapterDef;

        appState.update(s => {
            if (!s.prepState) return s;
            let p: PrepState = s.prepState;
            let sch: SchemaState = s.schemaState;
            const d = s.uploadedData ?? s.prepState?.customData ?? null;

            // Apply patches from onAnswer
            if (update.schemaPatch) sch = update.schemaPatch(sch);
            if (update.prepPatch) p = update.prepPatch(p);

            // Save answer to chapter answers record
            p = {
                ...p,
                qaProgress: {
                    ...p.qaProgress,
                    chapters: p.qaProgress.chapters.map(ch =>
                        ch.id === snapshotChId
                            ? { ...ch, answers: { ...ch.answers, [snapshotQId]: pendingValue } }
                            : ch
                    ),
                },
            };

            // Re-evaluate the chapter's question list with updated state.
            // This handles conditional questions (e.g. Q1.3/Q1.4 appear only after Q1.2='yes',
            // and per-dim Q2.3 appears only for numerical dims).
            const updatedQs = snapshotChapterDef.getQuestions(p, sch, d);
            const idxInUpdated = updatedQs.findIndex(q => q.id === snapshotQId);

            if (idxInUpdated >= 0 && idxInUpdated < updatedQs.length - 1) {
                // More questions in this chapter after re-evaluation — advance to next
                p = { ...p, qaProgress: { ...p.qaProgress, currentQuestionId: updatedQs[idxInUpdated + 1].id } };
            } else {
                // Last visible question in chapter — mark chapter complete
                p = {
                    ...p,
                    qaProgress: {
                        ...p.qaProgress,
                        chapters: p.qaProgress.chapters.map(ch =>
                            ch.id === snapshotChId ? { ...ch, completed: true } : ch
                        ),
                    },
                };
                // hasRun is set when choose-dimensions (Chapter 2) is answered —
                // not here — so SchemaPanel can still auto-build until dimensions are configured.

                // Advance to next chapter if not at the end
                if (snapshotChIdx < CHAPTERS.length - 1) {
                    const nextChapter = CHAPTERS[snapshotChIdx + 1];
                    const nextQs = nextChapter.getQuestions(p, sch, d);
                    p = {
                        ...p,
                        qaProgress: {
                            ...p.qaProgress,
                            currentChapterId: nextChapter.id,
                            currentQuestionId: nextQs[0]?.id ?? '',
                        },
                    };
                }
            }

            return { ...s, prepState: p, schemaState: sch };
        });
    }

    function handleBack() {
        if (!prep) return;

        const snapshotChIdx = chapterIndex;
        const snapshotQIdx = currentQuestionIndex;
        const snapshotQuestions = currentQuestions;

        appState.update(s => {
            if (!s.prepState) return s;
            let p = s.prepState;

            if (snapshotQIdx > 0) {
                p = { ...p, qaProgress: { ...p.qaProgress, currentQuestionId: snapshotQuestions[snapshotQIdx - 1].id } };
            } else if (snapshotChIdx > 0) {
                const prevChapter = CHAPTERS[snapshotChIdx - 1];
                const prevQs = prevChapter.getQuestions(p, s.schemaState, data);
                p = {
                    ...p,
                    qaProgress: {
                        ...p.qaProgress,
                        currentChapterId: prevChapter.id,
                        currentQuestionId: prevQs[prevQs.length - 1]?.id ?? '',
                    },
                };
            }

            return { ...s, prepState: p };
        });
    }

    function jumpToChapter(targetChId: QAChapterId) {
        if (!prep || !schema) return;
        const chDef = CHAPTERS.find(c => c.id === targetChId);
        if (!chDef) return;
        const qs = chDef.getQuestions(prep, schema, data);
        const firstQId = qs[0]?.id ?? '';
        appState.update(s => {
            if (!s.prepState) return s;
            return {
                ...s,
                prepState: {
                    ...s.prepState,
                    qaProgress: {
                        ...s.prepState.qaProgress,
                        currentChapterId: targetChId,
                        currentQuestionId: firstQId,
                    },
                },
            };
        });
    }

    // ── Progress bar helpers ──────────────────────────────────────────────────
    function getChapterStatus(chId: QAChapterId): 'complete' | 'invalidated' | 'active' | 'upcoming' {
        if (!prep) return 'upcoming';
        const ch = prep.qaProgress.chapters.find(c => c.id === chId);
        if (!ch) return 'upcoming';
        if (ch.completed && ch.invalidated) return 'invalidated';
        if (ch.completed) return 'complete';
        if (chId === chapterId) return 'active';
        return 'upcoming';
    }
</script>

<div class="qa-engine">

    <!-- ── Progress bar ── -->
    <nav class="qa-progress" aria-label="Setup chapters">
        {#each CHAPTERS as ch (ch.id)}
            {@const status = getChapterStatus(ch.id)}
            <button
                class="qa-seg"
                class:qa-seg-complete={status === 'complete'}
                class:qa-seg-invalidated={status === 'invalidated'}
                class:qa-seg-active={status === 'active'}
                class:qa-seg-upcoming={status === 'upcoming'}
                onclick={() => jumpToChapter(ch.id)}
                aria-label="{ch.label}{status === 'complete' ? ' — complete' : status === 'invalidated' ? ' — needs review' : status === 'active' ? ' — current' : ''}"
                aria-current={ch.id === chapterId ? 'step' : undefined}
            >
                <span class="qa-seg-icon" aria-label={status === 'complete' ? 'completed' : status === 'upcoming' ? 'incomplete' : undefined} aria-hidden={status === 'complete' || status === 'upcoming' ? undefined : true}>
                    {#if status === 'complete'}&#x2713;{:else if status === 'invalidated'}&#x2717;{:else if status === 'active'}&bull;{:else}&#x274C;{/if}
                </span>
                <span class="qa-seg-label">{ch.label}</span>
            </button>
        {/each}
    </nav>

    <!-- ── Question area ── -->
    <div class="qa-content">
        {#if !prep}
            <p class="qa-empty">
                Upload a dataset (or create one) to begin setting up your structure.
            </p>
        {:else if currentQuestion}
            <QAQuestion
                question={currentQuestion.question}
                hint={currentQuestion.hint}
                inputType={currentQuestion.inputType}
                options={resolvedOptions}
                value={pendingValue}
                onchange={(v) => { pendingValue = v; }}
                fields={resolvedFields}
                sampleData={resolvedSampleData}
                nodeType={currentQuestion.nodeType ?? 'level3'}
                maxSelect={currentQuestion.maxSelect}
                expandableInfo={currentQuestion.expandableInfo}
                suggestionBox={currentQuestion.suggestionBox}
            />
        {:else}
            <p class="qa-empty">No questions available for this chapter yet.</p>
        {/if}
    </div>

    <!-- ── Navigation ── -->
    {#if prep}
        <div class="qa-nav" role="group" aria-label="Question navigation">
            <button
                class="qa-btn qa-btn-back"
                onclick={handleBack}
                disabled={isAtStart}
                aria-label="Back to previous question"
            >
                &#8592; Back
            </button>

            <span class="qa-nav-pos" aria-live="polite" aria-atomic="true">
                {#if currentQuestions.length > 1}
                    {currentQuestionIndex + 1} / {currentQuestions.length}
                {/if}
            </span>

            {#if isAtEnd}
                <button
                    class="qa-btn qa-btn-done"
                    onclick={handleNext}
                    aria-label="Finish setup"
                >
                    Done &#x2713;
                </button>
            {:else}
                <button
                    class="qa-btn qa-btn-next"
                    onclick={handleNext}
                    aria-label="Next question"
                >
                    Next &#8594;
                </button>
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
    .dark .qa-seg-complete .qa-seg-icon { color: #86efac; }

    .qa-seg-invalidated {
        background: #fef2f2;
        border-color: #fca5a5;
    }
    .dark .qa-seg-invalidated {
        background: rgba(239, 68, 68, 0.08);
        border-color: rgba(239, 68, 68, 0.3);
    }
    .qa-seg-invalidated .qa-seg-icon { color: #b91c1c; }
    .qa-seg-invalidated .qa-seg-label { color: #b91c1c; }

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

    .qa-btn-done {
        background: #166534;
        border: 1px solid #166534;
        color: #fff;
        font-weight: 500;
        margin-left: auto;
    }
    .qa-btn-done:hover { background: #14532d; border-color: #14532d; }

    .qa-nav-pos {
        flex: 1;
        text-align: center;
        font-size: 0.8125rem;
        color: var(--dn-text-muted);
    }
</style>
