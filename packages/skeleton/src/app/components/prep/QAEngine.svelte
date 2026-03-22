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

    // ── Types (used by Tasks 11–14 to define chapter content) ─────────────────
    type Row = Record<string, unknown>;

    interface QAOption {
        value: string;
        label: string;
        description?: string;
        disabled?: boolean;
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

    // ── Chapter definitions (Tasks 11–14) ────────────────────────────────────
    const CHAPTERS: QAChapterDef[] = [

        // ── Chapter 1: Top-level access (Task 11) ────────────────────────────
        {
            id: 'top-level-access',
            label: 'Top-level access',
            getQuestions: (prep, _schema, _data): QAQuestionDef[] => {
                const ch1Ans = prep.qaProgress.chapters.find(c => c.id === 'top-level-access')?.answers ?? {};
                const questions: QAQuestionDef[] = [
                    {
                        id: 'dataset-description',
                        question: 'What does this dataset represent, in plain English?',
                        hint: 'Example: "Monthly sales figures for each product and region." This helps screen readers introduce the data.',
                        inputType: 'text',
                        onAnswer: (value, _p, _s, _d) => ({
                            prepPatch: (p) => ({
                                ...p,
                                labelConfig: {
                                    ...p.labelConfig,
                                    level0: { ...p.labelConfig.level0, template: value as string },
                                },
                            }),
                        }),
                    },
                    {
                        id: 'root-node',
                        question: 'Does your visualization have a single starting point that everything else branches from?',
                        hint: 'Think of it like a home page — a place where navigation begins before drilling into any specific group.',
                        inputType: 'radio',
                        options: [
                            { value: 'yes', label: 'Yes — there is a clear entry point', description: 'Great for guided, hierarchical navigation. Recommended for most datasets.' },
                            { value: 'no', label: 'No — let users start at the first group directly', description: 'Navigation begins at the first browsing group without a parent node.' },
                        ],
                        onAnswer: (value, _p, _s, _d) => ({
                            schemaPatch: (sch) => ({ ...sch, level0Enabled: value === 'yes' }),
                        }),
                    },
                ];
                // Q1.3 and Q1.4 appear only when Q1.2 = 'yes'
                if (ch1Ans['root-node'] === 'yes') {
                    questions.push({
                        id: 'root-label',
                        question: 'What should we call this starting point?',
                        hint: 'Keep it short and descriptive. Example: "Sales Overview", "Chart Start", or "All Products".',
                        inputType: 'text',
                        onAnswer: (value, _p, _s, _d) => ({
                            schemaPatch: (sch) => ({ ...sch, level0Id: makeValidId(value as string) || 'root' }),
                            prepPatch: (p) => ({
                                ...p,
                                labelConfig: {
                                    ...p.labelConfig,
                                    level0: { ...p.labelConfig.level0, name: value as string },
                                },
                            }),
                        }),
                    });
                    questions.push({
                        id: 'root-semantic-label',
                        question: 'What should a screen reader say when a user arrives at this starting point?',
                        hint: 'Example: "You are at the chart overview. Press Enter to begin exploring." Try to orient the user clearly.',
                        inputType: 'textarea',
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

                const questions: QAQuestionDef[] = [
                    {
                        id: 'choose-dimensions',
                        question: 'Which columns in your data should users be able to browse through?',
                        hint: 'These become the main groups in your navigation — like chapters in a book. Pick up to 3. Examples: "Category", "Year", "Region". Skip columns that are only used for IDs, labels, or raw signal values.',
                        inputType: 'multiselect',
                        maxSelect: 3,
                        getDynamicOptions: (p, _s, d) => p.variables
                            .filter(v => !v.removed)
                            .map(v => {
                                const vals = (d ?? []).map(row => row[v.key]).filter(x => x != null);
                                const unique = [...new Set(vals.map(x => String(x)))];
                                const desc = v.type === 'numerical'
                                    ? (() => {
                                        const nums = vals.map(x => Number(x)).filter(x => !isNaN(x));
                                        return nums.length > 0
                                            ? `NUM — range: ${Math.min(...nums)}–${Math.max(...nums)}`
                                            : 'NUM';
                                    })()
                                    : `CAT — ${unique.length} unique value${unique.length !== 1 ? 's' : ''}`;
                                return { value: v.key, label: v.key, description: desc };
                            }),
                        onAnswer: (value, prepAtCall, _s, _d) => {
                            const selected = Array.isArray(value) ? (value as string[]) : [];
                            return {
                                prepPatch: (p) => ({
                                    ...p,
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
                                            compressSparseDivisions: false,
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
                            { value: 'no-cat', label: 'No — these are categories (names or labels)' },
                            { value: 'no-num', label: 'No — these are numbers' },
                        ],
                        onAnswer: (value, _p, _s, _d) => {
                            const newType: 'numerical' | 'categorical' =
                                value === 'no-num' ? 'numerical' :
                                value === 'no-cat' ? 'categorical' :
                                dim.type;
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
                ];

                // Q4.2 — Group header label (per dimension)
                for (const dim of dims) {
                    const firstUniqueVal = (() => {
                        const vals = (data ?? []).map(row => row[dim.key]);
                        const unique = [...new Set(vals.map(x => String(x)))];
                        return unique[0] ?? '(example)';
                    })();
                    const countForFirst = (data ?? []).filter(row => String(row[dim.key]) === firstUniqueVal).length;
                    const suggestedTemplate = `{key:"${dim.key}"}: {value:"${dim.key}"}`;

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
                // Set hasRun when Chapter 1 is completed
                if (snapshotChId === 'top-level-access') p = { ...p, hasRun: true };

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
                <span class="qa-seg-icon" aria-hidden="true">
                    {#if status === 'complete'}&#x2713;{:else if status === 'invalidated'}&#x2717;{:else if status === 'active'}&bull;{:else}&circ;{/if}
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
