<script lang="ts">
    import { onDestroy, untrack } from 'svelte';
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
    import { logAction } from '../../../store/historyStore';

    // ── Props ─────────────────────────────────────────────────────────────────
    let { onComplete }: { onComplete?: () => void } = $props();

    // ── Types (used by Tasks 11–14 to define chapter content) ─────────────────
    type Row = Record<string, unknown>;

    interface QAOption {
        value: string;
        label: string;
        description?: string;
        disabled?: boolean;
        suggested?: boolean; // highlights the option as a chart-type-aware recommendation
        notice?: { type: 'suggest' | 'warn'; message: string };
    }

    interface StoreUpdate {
        prepPatch?: (prev: PrepState) => PrepState;
        schemaPatch?: (prev: SchemaState) => SchemaState;
        overrideCursor?: string; // if set, skip auto-advance and jump to this question id
    }

    interface ParentDimension {
        key: string;
        isReduced: boolean;
        dimNoun: string;       // noun from LabelTemplate.name (e.g., "group")
        hasDivisions: boolean; // whether this dim has meaningful divisions
        divNoun?: string;      // noun from division LabelTemplate.name (e.g., "subgroup")
        divTotal?: number;     // dim.subdivisions — for "of N" in subgroup preview
    }

    interface SuggestedField {
        key: string;
        rank?: '1st' | '2nd' | '3rd';
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
        // label-builder extras
        dimensionName?: string;
        parentDimensions?: ParentDimension[];
        suggestedFields?: SuggestedField[];
        // aggregate label-builder extras (level1 and level2 only)
        getAggregateFields?: (prep: PrepState, data: Row[] | null) => string[];
        getTrendXFields?: (prep: PrepState) => string[];
        suggestedAggField?: string;
        dimensionCount?: number;
        hasDivisions?: boolean;
        parentDimNoun?: string;   // level2: noun of parent dimension (for suffix preview)
        onAnswer: (value: unknown, prep: PrepState, schema: SchemaState, data: Row[] | null) => StoreUpdate;
    }

    interface QAChapterDef {
        id: QAChapterId;
        label: string;
        getQuestions: (prep: PrepState, schema: SchemaState, data: Row[] | null) => QAQuestionDef[];
    }

    // ── Nav slot constants (mirrors SchemaPanel.NAV_SLOTS / DRILL_OUT_KEYS) ─────
    const NAV_SLOTS_QA = [
        { forwardName: 'up',       forwardKey: 'ArrowUp',      backwardName: 'down',    backwardKey: 'ArrowDown'    },
        { forwardName: 'left',     forwardKey: 'ArrowLeft',    backwardName: 'right',   backwardKey: 'ArrowRight'   },
        { forwardName: 'backward', forwardKey: 'BracketLeft',  backwardName: 'forward', backwardKey: 'BracketRight' },
    ] as const;
    const DRILL_OUT_KEYS_QA = ['KeyW', 'KeyJ', 'Backslash'] as const;

    function makeValidId(s: string): string {
        return '_' + s.replace(/[^a-zA-Z0-9_-]+/g, '_');
    }

    // ── Navigation helpers (used by Chapter 3) ────────────────────────────────

    // "Reduced" = no meaningful divisions: all-unique categorical, or numerical with ≤1 bucket
    function isReducedDimension(dim: DimensionSchema, d: Row[] | null): boolean {
        if (dim.type === 'numerical') return dim.subdivisions <= 1;
        const vals = (d ?? []).map(r => r[dim.key]).filter(x => x != null);
        const unique = [...new Set(vals.map(String))];
        return unique.length === vals.length && vals.length > 0;
    }

    // ── Label-building helpers (used by Chapter 4) ────────────────────────────

    // Lightweight template resolver — strips key tokens, resolves value tokens.
    // Used to compute example labels from already-saved templates.
    function resolveTemplateToString(template: string, sampleRow: Row): string {
        let r = template;
        r = r.replace(/\{key:"[^"]+"\}:\s*/g, '');
        r = r.replace(/\{key:"[^"]+"\}/g, (_: string, k: string) => k);
        r = r.replace(/\{value:"([^"]+)"\}/g, (_: string, k: string) => {
            const v = sampleRow[k];
            return v !== undefined ? String(v) : `[${k}]`;
        });
        return r.trim();
    }

    // Build sample row for the first numerical bucket of a dimension.
    function buildDivisionSampleRow(dim: DimensionSchema, d: Row[] | null): Row {
        const numVals = (d ?? []).map(row => Number(row[dim.key])).filter(n => !isNaN(n)).sort((a, b) => a - b);
        if (numVals.length === 0) return { range: '(example)', count: 0 };
        const min = numVals[0], max = numVals[numVals.length - 1];
        const bucket = (max - min) / Math.max(dim.subdivisions, 1);
        const bMin = min, bMax = Math.round((min + bucket) * 100) / 100;
        const exampleRange = `${Math.round(bMin * 100) / 100}–${bMax}`;
        const exampleCount = numVals.filter(n => n >= bMin && n < bMin + bucket).length;
        return { range: exampleRange, count: exampleCount, [dim.key]: bMin };
    }

    // Compute the best available example label for a dimension (for leaf parentDimensions).
    // Tier 1: apply saved label template to sample data.
    // Tier 2: fall back to raw first value / first range.
    function computeExampleLabel(dim: DimensionSchema, prep: PrepState, d: Row[] | null): string {
        if (dim.type === 'numerical' && dim.subdivisions > 1 && !isReducedDimension(dim, d)) {
            const savedTemplate = prep.labelConfig.perDivision[dim.key]?.template;
            if (savedTemplate) {
                const sampleRow = buildDivisionSampleRow(dim, d);
                const resolved = resolveTemplateToString(savedTemplate, sampleRow);
                if (resolved) return resolved;
            }
            // Fallback: raw first range
            const sampleRow = buildDivisionSampleRow(dim, d);
            return String(sampleRow['range'] ?? '(example)');
        } else {
            const savedTemplate = prep.labelConfig.perDimension[dim.key]?.template;
            if (savedTemplate) {
                const vals = (d ?? []).map(r => r[dim.key]).filter(x => x != null);
                const unique = [...new Set(vals.map(String))];
                const firstVal = unique[0] ?? '(example)';
                const resolved = resolveTemplateToString(savedTemplate, { [dim.key]: firstVal });
                if (resolved) return resolved;
            }
            // Fallback: raw first unique value
            const vals = (d ?? []).map(r => r[dim.key]).filter(x => x != null);
            const unique = [...new Set(vals.map(String))];
            return unique[0] ?? '(example)';
        }
    }

    // Build the auto-suggested default template for leaf labels.
    // Numerical dimensions first (they carry the actual data values), then categorical.
    function buildLeafDefaultTemplate(dims: DimensionSchema[]): string {
        const numerical = dims.filter(d => d.type === 'numerical').sort((a, b) => (a.navIndex ?? 99) - (b.navIndex ?? 99));
        const categorical = dims.filter(d => d.type === 'categorical').sort((a, b) => (a.navIndex ?? 99) - (b.navIndex ?? 99));
        const ordered = [...numerical, ...categorical];
        if (ordered.length === 0) return '';
        return ordered.map(d => ` {key:"${d.key}"}: {value:"${d.key}"},`).join('').trim().replace(/,\s*$/, '');
    }

    // Build the suggestedFields array. Numerical dims get ranked ('1st','2nd','3rd');
    // categorical dims are marked suggested but unranked.
    function buildSuggestedFields(dims: DimensionSchema[]): SuggestedField[] {
        const RANKS = ['1st', '2nd', '3rd'] as const;
        const numerical = dims.filter(d => d.type === 'numerical').sort((a, b) => (a.navIndex ?? 99) - (b.navIndex ?? 99));
        const categorical = dims.filter(d => d.type === 'categorical').sort((a, b) => (a.navIndex ?? 99) - (b.navIndex ?? 99));
        const result: SuggestedField[] = [];
        for (let i = 0; i < numerical.length; i++) {
            result.push({ key: numerical[i].key, rank: RANKS[i] });
        }
        for (const d of categorical) {
            result.push({ key: d.key });
        }
        return result;
    }

    // "Help me build a good label" guidance text (based on accessibility research).
    const LABEL_HELP_TEXT =
        'Screen readers announce text in order, left to right. ' +
        'Put the most important value first (usually a number or name), and less critical context after.\n\n' +
        'Shorter labels are easier to remember. Aim for what you would say out loud, not a full sentence. ' +
        'Users exploring a chart repeatedly will hear these labels many times — every unnecessary word adds up.\n\n' +
        'If your chart shows information in a tooltip on hover, include that same information here. ' +
        'Screen reader users will never see tooltips — labels are their equivalent.';

    // Infer which preset a dimension is using from its forwardKey
    function getDimPreset(dim: DimensionSchema): 'updown' | 'leftright' | 'brackets' | null {
        if (dim.forwardKey === 'ArrowUp')   return 'updown';
        if (dim.forwardKey === 'ArrowLeft') return 'leftright';
        if (dim.forwardKey === '[')         return 'brackets';
        return null;
    }

    // Returns { preset: dimKey } for all included dims except excludeKey
    function getTakenPresets(dims: DimensionSchema[], excludeKey: string): Record<string, string> {
        const taken: Record<string, string> = {};
        for (const d of dims) {
            if (d.key === excludeKey || !d.included) continue;
            const p = getDimPreset(d);
            if (p) taken[p] = d.key;
        }
        return taken;
    }

    // Build partial nav fields for a dim from a preset string
    function applyNavPreset(preset: string, dim: DimensionSchema, allDims: DimensionSchema[]): Partial<DimensionSchema> {
        const MAP: Record<string, number> = { updown: 0, leftright: 1, brackets: 2 };
        const slot = NAV_SLOTS_QA[MAP[preset] ?? 0];
        const drillOutKey = allDims.length > 1
            ? (DRILL_OUT_KEYS_QA[dim.navIndex ?? 0] ?? 'Backspace')
            : 'Backspace';
        return {
            forwardName: slot.forwardName, forwardKey: slot.forwardKey,
            backwardName: slot.backwardName, backwardKey: slot.backwardKey,
            drillInName: 'drill in', drillInKey: 'Enter',
            drillOutName: allDims.length > 1 ? `drill out to ${dim.key}` : 'drill out',
            drillOutKey,
        };
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

    // ── Guide visuals helper ──────────────────────────────────────────────────
    // Returns an array of { variant, showRoot? } objects for the current question.
    // Called reactively via currentVisuals derived value below.
    function getGuideVisuals(
        questionId: string,
        sch: SchemaState
    ): { variant: string; showRoot?: boolean }[] {
        const hasRoot = sch.level0Enabled;
        const dims = sch.dimensions.filter(d => d.included);
        const hasNumerical = dims.some(d => d.type === 'numerical');
        const hasDivisions = dims.some(d => d.type === 'numerical' && d.subdivisions > 1);

        const chartFam: 'scatter' | 'stack' = hasNumerical ? 'scatter' : 'stack';

        const staticMap: Record<string, { variant: string; showRoot?: boolean }[]> = {
            'root-node':            [{ variant: 'stack' }, { variant: 'tree-root', showRoot: false }],
            'chart-type':           [],
            'chart-type-custom':    [],
            'confirm-id-variable':  [],
            'id-creator-prompt':    [],
            'dataset-description':  [{ variant: `${chartFam}-root` }, { variant: 'tree-root', showRoot: hasRoot }],
            'root-label':           [{ variant: 'tree-root', showRoot: hasRoot }],
            'interactive-elements': [{ variant: 'tree-root', showRoot: hasRoot }],
            'root-announcement':    [{ variant: 'tree-root', showRoot: hasRoot }],
            'choose-dimensions':    hasNumerical
                ? [{ variant: 'scatter-dim-num' }, { variant: 'scatter-dim-row' }, { variant: 'scatter-dim-cat' }, { variant: 'tree-dim', showRoot: hasRoot }]
                : [{ variant: 'stack-dim-cat' }, { variant: 'stack-dim-col' }, { variant: 'tree-dim', showRoot: hasRoot }],
            'dim-order':            [{ variant: 'tree-dim', showRoot: hasRoot }],
            'nav-between-dims':     [{ variant: 'tree-dim', showRoot: hasRoot }],
            'top-level-extents':    [{ variant: 'tree-dim', showRoot: hasRoot }],
            'cross-group-nav':      [{ variant: 'tree-dim', showRoot: hasRoot }],
            'leaf-label':           [{ variant: `${chartFam}-leaf` }, { variant: 'tree-leaf', showRoot: hasRoot }],
            'leaf-interactive':     [],
        };

        if (questionId in staticMap) return staticMap[questionId];

        if (questionId.startsWith('dim-type-'))
            return hasNumerical
                ? [{ variant: 'scatter-dim-num' }, { variant: 'scatter-dim-cat' }]
                : [{ variant: 'stack-dim-cat' }, { variant: 'stack-dim-col' }];
        if (questionId.startsWith('dim-subdivisions-'))
            return [{ variant: 'scatter-dim-num' }, { variant: hasDivisions ? 'tree-div' : 'tree-dim', showRoot: hasRoot }];
        if (questionId.startsWith('dim-sort-'))
            return hasNumerical
                ? [{ variant: 'scatter-dim-row' }, { variant: 'tree-dim', showRoot: hasRoot }]
                : [{ variant: 'stack-dim-col' }, { variant: 'tree-dim', showRoot: hasRoot }];

        // Label chapter
        if (questionId.startsWith('dim-') && questionId.endsWith('-label'))
            return hasNumerical
                ? [{ variant: 'scatter-dim-num' }, { variant: 'tree-dim', showRoot: hasRoot }]
                : [{ variant: 'stack-dim-col' }, { variant: 'tree-dim', showRoot: hasRoot }];
        if (questionId.startsWith('division-') && questionId.endsWith('-label'))
            return hasNumerical
                ? [{ variant: 'scatter-div-num' }, { variant: 'scatter-div-row' }, { variant: 'scatter-div-cat' }, { variant: 'tree-div', showRoot: hasRoot }]
                : [{ variant: 'stack-div-row' }, { variant: 'stack-div-col' }, { variant: 'tree-div', showRoot: hasRoot }];
        if (questionId.endsWith('-interactive'))
            return [];

        // Navigation chapter per-dim questions
        if (questionId.startsWith('dim-forward-') || questionId.startsWith('dim-extent-'))
            return [{ variant: 'tree-div', showRoot: hasRoot }];

        return [];
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
                        question: 'Does your visualization have an overview or a single starting point that everything else branches from?',
                        hint: 'What is this? This question will make the first thing users navigate to an overview or high-level point, before diving in to other parts of the graphic. A starting point or overview might something like the chart itself, the chart\'s title, or some other high level view. Think of this starting point like a home page — a place where navigation begins before drilling into any specific dimension.',
                        inputType: 'radio',
                        options: [
                            { value: 'yes', label: 'Yes — I want to start with an overview', description: 'Great for guided, hierarchical navigation. Recommended for most datasets.', notice: { type: 'suggest' as const, message: '★ Suggested' } },
                            { value: 'no',  label: 'No — let users start at the first data dimension directly', description: 'Navigation begins at the first dimension in the data without a big picture. Recommended if you already have a high-level description elsewhere or only plan to have a single dimension to navigate through (such as in a regular bar chart).' },
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
                        question: 'What does this chart or dataset represent, in clear, concise language?',
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
                    ? `Dimensions become the main paths through your data. Pick no more than 3. Variables marked ★ Suggested are recommended for a ${chartLabelForHint}. The diagrams show how numeric dimensions group data into vertical stripes, and how categorical dimensions group them into labeled clusters.`
                    : 'Dimensions become the main paths through your data. Pick no more than 3. Skip variables that are only used for IDs, labels, or raw signal values. The diagrams show how numeric dimensions group data into vertical stripes, and how categorical dimensions group them into labeled clusters.';

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
                                            divisionExtents: null,
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
                        hint: 'Choosing "Yes" will add a sequential numeric ID column called "_id" (1, 2, 3…) to your dataset. You can rename it later using the computed variable tool.',
                        inputType: 'radio',
                        options: [
                            { value: 'yes', label: 'Yes, add a sequential ID column' },
                            { value: 'no', label: 'No, use randomly generated IDs' },
                        ],
                        onAnswer: (value, _p, _s, d) => {
                            if (value !== 'yes') return {};
                            // Stamp _id: 1, 2, 3… onto each row as a side effect
                            if (d && d.length > 0) {
                                queueMicrotask(() => {
                                    appState.update(s => {
                                        if (s.uploadedData) {
                                            return {
                                                ...s,
                                                uploadedData: s.uploadedData.map((row, i) => ({ _id: i + 1, ...row })),
                                            };
                                        }
                                        if (s.prepState?.customData) {
                                            return {
                                                ...s,
                                                prepState: {
                                                    ...s.prepState,
                                                    customData: s.prepState.customData.map((row, i) => ({ _id: i + 1, ...row })),
                                                },
                                            };
                                        }
                                        return s;
                                    });
                                    logAction('Prep: stamped _id column onto data');
                                });
                            }
                            return {
                                prepPatch: (p) => ({
                                    ...p,
                                    variables: [
                                        { key: '_id', type: 'numerical' as const, isId: true, isDimension: false, removed: false },
                                        ...p.variables.filter(v => v.key !== '_id').map(v => ({ ...v, isId: false })),
                                    ],
                                }),
                            };
                        },
                    });
                }

                // Per-dimension questions (Q2.2, Q2.3, Q2.4)
                for (const dim of includedDims) {
                    // Q2.2 — Confirm type
                    questions.push({
                        id: `dim-type-${dim.key}`,
                        question: `We think "${dim.key}" contains ${dim.type === 'categorical' ? 'categorical' : 'numerical'} values. Does that sound right?`,
                        hint: dim.type === 'categorical'
                            ? 'Categorical means the values are labels or names — like "North", "South", "East". The two diagrams show the difference: vertical stripes indicate numeric ranges, polygon outlines indicate labeled categories.'
                            : 'Numerical means the values are numbers — like prices, counts, or measurements. The two diagrams show the difference: vertical stripes indicate numeric ranges, polygon outlines indicate labeled categories.',
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
                                { value: '1', label: 'No grouping (treat each value individually)' },
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
                        question: `In what order should values in the "${dim.key}" dimension appear?`,
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
                        question: 'In what order should your dimensions be layered? Use the up/down buttons to reorder.',
                        hint: 'The first dimension is what a user encounters first. Dimensions appear to a user in the following order as they navigate:',
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

        // ── Chapter 3: Navigation ────────────────────────────────────────────
        {
            id: 'navigation',
            label: 'Navigation',
            getQuestions: (prep, schema, data): QAQuestionDef[] => {
                const dims = schema.dimensions
                    .filter(d => d.included)
                    .sort((a, b) => (a.navIndex ?? 99) - (b.navIndex ?? 99));

                const ch3Ans = prep.qaProgress.chapters.find(c => c.id === 'navigation')?.answers ?? {};
                const replacementQueue: string[] = Array.isArray(ch3Ans['nav-replacement-queue'])
                    ? (ch3Ans['nav-replacement-queue'] as string[])
                    : [];

                const NAV_PRESET_OPTIONS: QAOption[] = [
                    { value: 'updown',    label: 'Up/Down arrows (↑/↓ + W to drill out)',    description: 'Press ↑/↓ to move through items. Press Enter to drill in. Press W to drill out.' },
                    { value: 'leftright', label: 'Left/Right arrows (←/→ + J to drill out)', description: 'Press ←/→ to move through items. Press Enter to drill in. Press J to drill out.' },
                    { value: 'brackets',  label: '[ and ] brackets (\\ to drill out)',        description: 'Press [ or ] to move through items. Press Enter to drill in. Press \\ to drill out.' },
                ];

                const NAV_PRESET_OPTIONS_HIGH: QAOption[] = [
                    { value: 'leftright', label: 'Left/Right arrows (←/→ + J to drill out)', description: 'Press ←/→ to move through items. Press Enter to drill in. Press Escape to exit the chart', notice: { type: 'suggest', message: '★ Suggested' } },
                    { value: 'updown',    label: 'Up/Down arrows (↑/↓ + W to drill out)',    description: 'Press ↑/↓ to move through items. Press Enter to drill in. Press Escape to exit the chart' },
                    { value: 'brackets',  label: '[ and ] brackets (\\ to drill out)',        description: 'Press [ or ] to move through items. Press Enter to drill in. Press Escape to exit the chart.' },
                ];

                const questions: QAQuestionDef[] = [];

                // Q3.A — Navigation between top-level groups (only if 2+ dimensions)
                if (dims.length >= 2) {
                    questions.push({
                        id: 'nav-between-dims',
                        question: 'How should keyboard users move between top-level dimensions in your visualization?',
                        hint: "The 'top level' is where your dimensions live — e.g., 'date', 'value', and 'region'. Choosing a key layout here doesn't prevent using those same keys within a dimension.",
                        inputType: 'radio',
                        options: NAV_PRESET_OPTIONS_HIGH,
                        onAnswer: (value, _p, _s, _d) => {
                            const MAP: Record<string, number> = { updown: 0, leftright: 1, brackets: 2 };
                            const slot = NAV_SLOTS_QA[MAP[value as string] ?? 1];
                            return {
                                schemaPatch: (sch) => ({
                                    ...sch,
                                    level1NavForwardName: slot.forwardName,
                                    level1NavForwardKey: slot.forwardKey,
                                    level1NavBackwardName: slot.backwardName,
                                    level1NavBackwardKey: slot.backwardKey,
                                }),
                            };
                        },
                    });
                    // Q3.A2 — Top-level extent
                    questions.push({
                        id: 'top-level-extents',
                        question: 'When a user reaches the last dimension at the top level, what should happen?',
                        hint: "This decides what happens after a user reaches the last dimension.",
                        inputType: 'radio',
                        options: [
                            { value: 'circular', label: 'Loop back to the first dimension', notice: { type: 'suggest' as const, message: '★ Suggested' } },
                            { value: 'terminal', label: 'Stop at the last dimension' },
                        ],
                        onAnswer: (value, _p, _s, _d) => ({
                            schemaPatch: (sch) => ({
                                ...sch,
                                level1Extents: value as SchemaState['level1Extents'],
                            }),
                        }),
                    });
                }

                // Per-dimension questions (B, C, D, E)
                for (const dim of dims) {
                    const reduced = isReducedDimension(dim, data);

                    // Q3.B — Navigation within this dimension
                    questions.push({
                        id: `nav-within-${dim.key}`,
                        question: reduced
                            ? `How would you like users to navigate between datapoints in "${dim.key}"?`
                            : `Your dimension "${dim.key}" will be divided into subgroups, called "divisions." How would you like users to navigate within "${dim.key}"?`,
                        hint: reduced
                            ? undefined
                            : 'Within each division, users move forward and backward between data points. Drilling in takes them inside a division. Drilling out returns them to the parent level.',
                        inputType: 'radio',
                        getDynamicOptions: (_p, sch, _d) => {
                            const taken = getTakenPresets(sch.dimensions, dim.key);
                            return NAV_PRESET_OPTIONS.map(opt => ({
                                ...opt,
                                notice: taken[opt.value]
                                    ? { type: 'warn' as const, message: `❌ Already chosen by "${taken[opt.value]}"` }
                                    : undefined,
                            }));
                        },
                        onAnswer: (value, _p, _s, _d) => {
                            const preset = value as string;
                            return {
                                schemaPatch: (sch) => {
                                    const allIncluded = sch.dimensions.filter(d => d.included);
                                    const navFields = applyNavPreset(preset, dim, allIncluded);
                                    const MAP: Record<string, number> = { updown: 0, leftright: 1, brackets: 2 };
                                    const slot = NAV_SLOTS_QA[MAP[preset] ?? 0];
                                    const updatedDims = sch.dimensions.map(d =>
                                        d.key === dim.key ? { ...d, ...navFields } : d
                                    );
                                    // For single-dim setups, mirror this dim's keys to level1Nav too
                                    if (allIncluded.length === 1) {
                                        return {
                                            ...sch,
                                            dimensions: updatedDims,
                                            level1NavForwardName: slot.forwardName,
                                            level1NavForwardKey: slot.forwardKey,
                                            level1NavBackwardName: slot.backwardName,
                                            level1NavBackwardKey: slot.backwardKey,
                                        };
                                    }
                                    return { ...sch, dimensions: updatedDims };
                                },
                            };
                        },
                    });

                    // Q3.C — Conflict confirmation (only if this dim's saved preset conflicts with another)
                    const savedNavWithin = ch3Ans[`nav-within-${dim.key}`] as string | undefined;
                    if (savedNavWithin) {
                        const taken = getTakenPresets(dims, dim.key);
                        const conflictingDimKey = taken[savedNavWithin];
                        if (conflictingDimKey) {
                            questions.push({
                                id: `nav-conflict-confirm-${dim.key}`,
                                question: `You chose the same navigation keys as "${conflictingDimKey}". Would you like to reassign "${conflictingDimKey}"'s navigation? You'll choose new keys for it after this step.`,
                                inputType: 'radio',
                                options: [
                                    { value: 'yes', label: `Yes, reassign "${conflictingDimKey}"` },
                                    { value: 'no',  label: 'No, go back and pick different keys' },
                                ],
                                onAnswer: (value, _p, _s, _d) => {
                                    if (value === 'yes') {
                                        return {
                                            schemaPatch: (sch) => ({
                                                ...sch,
                                                dimensions: sch.dimensions.map(d =>
                                                    d.key === conflictingDimKey
                                                        ? { ...d, forwardName: '', forwardKey: '', backwardName: '', backwardKey: '' }
                                                        : d
                                                ),
                                            }),
                                            prepPatch: (p) => {
                                                const ch = p.qaProgress.chapters.find(c => c.id === 'navigation');
                                                const current: string[] = Array.isArray(ch?.answers?.['nav-replacement-queue'])
                                                    ? (ch!.answers['nav-replacement-queue'] as string[])
                                                    : [];
                                                const next = current.includes(conflictingDimKey)
                                                    ? current
                                                    : [...current, conflictingDimKey];
                                                return {
                                                    ...p,
                                                    qaProgress: {
                                                        ...p.qaProgress,
                                                        chapters: p.qaProgress.chapters.map(c =>
                                                            c.id === 'navigation'
                                                                ? { ...c, answers: { ...c.answers, 'nav-replacement-queue': next } }
                                                                : c
                                                        ),
                                                    },
                                                };
                                            },
                                        };
                                    }
                                    // 'no' — clear this dim's nav-within answer and send cursor back
                                    return {
                                        overrideCursor: `nav-within-${dim.key}`,
                                        prepPatch: (p) => ({
                                            ...p,
                                            qaProgress: {
                                                ...p.qaProgress,
                                                chapters: p.qaProgress.chapters.map(c =>
                                                    c.id === 'navigation'
                                                        ? { ...c, answers: { ...c.answers, [`nav-within-${dim.key}`]: undefined } }
                                                        : c
                                                ),
                                            },
                                        }),
                                    };
                                },
                            });
                        }
                    }

                    // Q3.D — Data-point endpoint behavior (replaces old Q3.2)
                    questions.push({
                        id: `dim-endpoint-data-${dim.key}`,
                        question: reduced
                            ? `When the user reaches the last data point in "${dim.key}", how do you want to navigate?`
                            : `When the user reaches the end of data points within a division in "${dim.key}", how do you want to navigate?`,
                        hint: 'Think about what feels natural for your data. If items represent a continuous cycle, looping makes sense. If they have a clear endpoint, stopping there is cleaner.',
                        inputType: 'radio',
                        options: [
                            { value: 'circular', label: 'Loop back to the beginning',    description: 'After the last item, navigation wraps around to the first.', notice: dim.type === 'categorical' ? { type: 'suggest' as const, message: '★ Suggested' } : undefined },
                            { value: 'terminal', label: 'Stop at the last item',          description: 'Navigation stops at the final item.' },
                            ...(dim.type === 'numerical' ? [{ value: 'bridgedCousins', label: 'Skip empty groups', description: 'If some buckets have no data, navigation skips over them to the next one that has data. Only available for number ranges.', notice: { type: 'suggest' as const, message: '★ Suggested' } }] : []),
                        ],
                        onAnswer: (value, _p, _s, _d) => ({
                            schemaPatch: (sch) => ({
                                ...sch,
                                dimensions: sch.dimensions.map(d =>
                                    d.key === dim.key ? { ...d, extents: value as DimensionSchema['extents'] } : d
                                ),
                            }),
                        }),
                    });

                    // Q3.E — Division endpoint behavior (only for non-reduced dims)
                    if (!reduced) {
                        const savedDataExtent = ch3Ans[`dim-endpoint-data-${dim.key}`] as string | undefined;
                        questions.push({
                            id: `dim-endpoint-divs-${dim.key}`,
                            question: `When the user reaches the last division in "${dim.key}", how do you want to navigate?`,
                            hint: 'This controls what happens after the user reaches the last division in this dimension.',
                            inputType: 'radio',
                            options: [
                                {
                                    value: 'circular',
                                    label: 'Loop back to the first division',
                                    description: 'After the last division, navigation wraps to the first.',
                                    notice: (savedDataExtent === 'circular' || savedDataExtent === 'bridgedCousins') ? { type: 'suggest' as const, message: '★ Suggested' } : undefined,
                                },
                                {
                                    value: 'terminal',
                                    label: 'Stop at the last division',
                                    description: 'Navigation stops at the final division.',
                                    notice: savedDataExtent === 'terminal' ? { type: 'suggest' as const, message: '★ Suggested' } : undefined,
                                },
                            ],
                            onAnswer: (value, _p, _s, _d) => ({
                                schemaPatch: (sch) => ({
                                    ...sch,
                                    dimensions: sch.dimensions.map(d =>
                                        d.key === dim.key
                                            ? { ...d, divisionExtents: value as 'circular' | 'terminal' }
                                            : d
                                    ),
                                }),
                            }),
                        });
                    }
                }

                // Nav replacement questions — for dims whose preset was displaced by a conflict resolution
                for (const replaceDimKey of replacementQueue) {
                    const replaceDim = dims.find(d => d.key === replaceDimKey);
                    if (!replaceDim) continue;
                    questions.push({
                        id: `nav-replacement-${replaceDimKey}`,
                        question: `Choose new navigation keys for "${replaceDimKey}" — its previous selection was replaced.`,
                        inputType: 'radio',
                        getDynamicOptions: (_p, sch, _d) => {
                            const taken = getTakenPresets(sch.dimensions, replaceDimKey);
                            return NAV_PRESET_OPTIONS.map(opt => ({
                                ...opt,
                                notice: taken[opt.value]
                                    ? { type: 'warn' as const, message: `❌ Already chosen by "${taken[opt.value]}"` }
                                    : undefined,
                            }));
                        },
                        onAnswer: (value, _p, _s, _d) => {
                            const preset = value as string;
                            return {
                                schemaPatch: (sch) => {
                                    const allIncluded = sch.dimensions.filter(d => d.included);
                                    const navFields = applyNavPreset(preset, replaceDim, allIncluded);
                                    return {
                                        ...sch,
                                        dimensions: sch.dimensions.map(d =>
                                            d.key === replaceDimKey ? { ...d, ...navFields } : d
                                        ),
                                    };
                                },
                                prepPatch: (p) => {
                                    const ch = p.qaProgress.chapters.find(c => c.id === 'navigation');
                                    const current: string[] = Array.isArray(ch?.answers?.['nav-replacement-queue'])
                                        ? (ch!.answers['nav-replacement-queue'] as string[])
                                        : [];
                                    return {
                                        ...p,
                                        qaProgress: {
                                            ...p.qaProgress,
                                            chapters: p.qaProgress.chapters.map(c =>
                                                c.id === 'navigation'
                                                    ? { ...c, answers: { ...c.answers, 'nav-replacement-queue': current.filter(k => k !== replaceDimKey) } }
                                                    : c
                                            ),
                                        },
                                    };
                                },
                            };
                        },
                    });
                }

                // Q3.G2 — Cross-group nav at data level (only if 2+ dimensions)
                if (dims.length >= 2) {
                    questions.push({
                        id: 'cross-group-nav',
                        question: 'When a user is looking at an individual data point, can they jump directly to the same position in a neighboring dimension?',
                        hint: 'Example: If your data is grouped by region AND by year, "jump to same position" means: while viewing "2020, North", the user can press a key to jump to "2020, South" — without going back up and drilling down again. This works best when dimensions have matching items in the same position.',
                        inputType: 'radio',
                        getDynamicOptions: (p, _s, _d) => {
                            const chartType = p.qaProgress.chapters
                                .find(c => c.id === 'top-level-access')?.answers?.['chart-type'] as string | undefined;
                            const acrossTypes = new Set(['line', 'area', 'stacked-bar', 'clustered-bar']);
                            const suggestAcross = chartType ? acrossTypes.has(chartType) : false;
                            return [
                                {
                                    value: 'within',
                                    label: 'No — keep them within their current dimension',
                                    description: 'Best when dimensions are independent (e.g., mixing categorical and numerical dimensions, having different categories with different numbers of items, etc.).',
                                    notice: !suggestAcross ? { type: 'suggest' as const, message: '★ Suggested' } : undefined,
                                },
                                {
                                    value: 'across',
                                    label: 'Yes — let them jump across dimensions',
                                    description: 'Best when dimensions have the same number of items in the same order (e.g., stacked bar charts, line charts with multiple series).',
                                    notice: suggestAcross ? { type: 'suggest' as const, message: '★ Suggested' } : undefined,
                                },
                            ];
                        },
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

                const questions: QAQuestionDef[] = [];

                // ── Phases 1 + 2 merged: per-dimension (+ per-division) questions ─
                for (const dim of dims) {
                    const firstUniqueVal = (() => {
                        const vals = (data ?? []).map(row => row[dim.key]);
                        const unique = [...new Set(vals.map(x => String(x)))];
                        return unique[0] ?? '(example)';
                    })();
                    const countForFirst = (data ?? []).filter(row => String(row[dim.key]) === firstUniqueVal).length;

                    // Q4.A — Dimension header label
                    const dimHasDivisions = dim.type === 'numerical' && dim.subdivisions > 1 && !isReducedDimension(dim, data);
                    questions.push({
                        id: `dim-label-${dim.key}`,
                        question: `Let's set up a label for "${dim.key}" — what a screen reader says when a user arrives at this dimension.`,
                        hint: `Users will often want to know what the dimension is and what is inside. The options below can help you build aggregate summaries.`,
                        inputType: 'label-builder',
                        nodeType: 'level1',
                        getFields: (_p) => [dim.key],
                        getSampleData: (_d, _p) => ({ [dim.key]: dim.key }),
                        defaultValue: {
                            template: `{value:"${dim.key}"}`,
                            name: 'group',
                            includeIndex: false, includeParentName: false, omitKeyNames: false,
                            includeDimensionName: false, includeParentNames: [],
                        } as LabelTemplate,
                        suggestedFields: [{ key: dim.key }],
                        getAggregateFields: (p, _d) => p.variables.filter(v => !v.removed && v.type === 'numerical').map(v => v.key),
                        getTrendXFields: (p) => p.variables.filter(v => !v.removed).map(v => v.key),
                        dimensionCount: dims.length,
                        hasDivisions: dimHasDivisions,
                        expandableInfo: { buttonLabel: 'Help me build a good label', content: LABEL_HELP_TEXT },
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

                    // Q4.A interactive — are dimension-header nodes interactive?
                    questions.push({
                        id: `dim-interactive-${dim.key}`,
                        question: `Are "${dim.key}" dimension header elements interactive? For example, can users select or click on them?`,
                        hint: 'If yes, screen readers will announce "button" after the label for these dimension headers. This comes from the element\'s role — not the label text.',
                        inputType: 'radio',
                        options: INTERACTIVE_OPTIONS,
                        onAnswer: (value, _p, _s, _d) => ({
                            prepPatch: (p) => value === 'yes' ? appendInteractiveToRoot(p, _s) : p,
                        }),
                    });

                    // Q4.B — Division label + interactive (only for numerical dims with meaningful divisions)
                    if (dim.type === 'numerical' && dim.subdivisions > 1 && !isReducedDimension(dim, data)) {
                        const divSampleRow = buildDivisionSampleRow(dim, data);
                        const exampleRange = String(divSampleRow['range'] ?? '(example range)');

                        const parentDimNoun = prep.labelConfig.perDimension[dim.key]?.name ?? 'group';

                        questions.push({
                            id: `div-label-${dim.key}`,
                            question: `For "${dim.key}" divisions, what should a screen reader say when a user arrives at a specific range or subset?`,
                            hint: `This template applies to each division (numeric range) within "${dim.key}". The {value:"range"} placeholder is replaced with the actual range label (e.g., '10–20') for each bucket. You can also check "Include dimension name" below to prefix each division with "${dim.key}:".`,
                            inputType: 'label-builder',
                            nodeType: 'level2',
                            getFields: (_p) => ['range'],
                            getSampleData: (_d, _p) => ({ range: exampleRange }),
                            defaultValue: {
                                template: '{key:"range"}: {value:"range"}', name: 'subgroup',
                                includeIndex: false, includeParentName: false, omitKeyNames: false,
                                includeDimensionName: false, includeParentNames: [],
                            } as LabelTemplate,
                            dimensionName: dim.key,
                            parentDimNoun,
                            suggestedFields: [{ key: 'range' }],
                            getAggregateFields: (p, _d) => p.variables.filter(v => !v.removed && v.type === 'numerical').map(v => v.key),
                            getTrendXFields: (p) => p.variables.filter(v => !v.removed).map(v => v.key),
                            suggestedAggField: dim.key,
                            expandableInfo: { buttonLabel: 'Help me build a good label', content: LABEL_HELP_TEXT },
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

                        questions.push({
                            id: `div-interactive-${dim.key}`,
                            question: `Are "${dim.key}" division elements interactive? For example, can users select or click on them?`,
                            hint: 'If yes, screen readers will announce "button" after the label for these division elements. This comes from the element\'s role — not the label text.',
                            inputType: 'radio',
                            options: INTERACTIVE_OPTIONS,
                            onAnswer: (value, _p, _s, _d) => ({
                                prepPatch: (p) => value === 'yes' ? appendInteractiveToRoot(p, _s) : p,
                            }),
                        });
                    }
                }

                // ── Phase 3: Leaf (individual data point) label ───────────────
                // Build per-dimension parent checkboxes for the leaf label builder
                const leafParentDimensions: ParentDimension[] = dims.map(dim => {
                    const reduced = isReducedDimension(dim, data);
                    const hasDivisions = dim.type === 'numerical' && dim.subdivisions > 1 && !reduced;
                    return {
                        key: dim.key,
                        isReduced: reduced,
                        dimNoun: prep.labelConfig.perDimension[dim.key]?.name ?? 'group',
                        hasDivisions,
                        divNoun: hasDivisions
                            ? (prep.labelConfig.perDivision[dim.key]?.name ?? 'subgroup')
                            : undefined,
                        divTotal: hasDivisions ? dim.subdivisions : undefined,
                    };
                });

                // Q4.C — Leaf label template
                questions.push({
                    id: 'leaf-label',
                    question: "Now let's set up a template for individual data points — what a screen reader says when a user navigates to one.",
                    hint: "Use the field buttons below to build your template. The ★ suggested variables are the ones that became dimensions — these are most important to include. You are welcome to include more, if it is important to understanding the data. The preview shows what it will sound like for one example row.",
                    inputType: 'label-builder',
                    nodeType: 'level3',
                    getFields: (p) => p.variables.filter(v => !v.removed).map(v => v.key),
                    getSampleData: (d, _p) => d?.[0] ?? {},
                    defaultValue: {
                        template: buildLeafDefaultTemplate(dims),
                        name: 'data point',
                        includeIndex: false, includeParentName: false, omitKeyNames: false,
                        includeDimensionName: false, includeParentNames: [], includeParentDivisions: [],
                    } as LabelTemplate,
                    parentDimensions: leafParentDimensions,
                    suggestedFields: buildSuggestedFields(dims),
                    expandableInfo: { buttonLabel: 'Help me build a good label', content: LABEL_HELP_TEXT },
                    onAnswer: (value, _p, _s, _d) => ({
                        prepPatch: (p) => ({
                            ...p,
                            labelConfig: { ...p.labelConfig, leaves: value as LabelTemplate },
                        }),
                    }),
                });

                // Q4.C interactive — are individual data points interactive?
                questions.push({
                    id: 'leaf-interactive',
                    question: 'Are individual data points interactive? For example, can users select, click, or otherwise interact with them?',
                    hint: 'If yes, these elements will be given an interactive role (like a button) so screen readers announce them as actionable. Screen readers will say "button" after the label — this comes from the role, not from the label text itself.',
                    inputType: 'radio',
                    options: INTERACTIVE_OPTIONS,
                    onAnswer: (value, _p, _s, _d) => ({
                        prepPatch: (p) => value === 'yes' ? appendInteractiveToRoot(p, _s) : p,
                    }),
                });

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

    const resolvedAggregateFields = $derived.by((): string[] => {
        if (!currentQuestion?.getAggregateFields || !prep) return [];
        return currentQuestion.getAggregateFields(prep, data);
    });

    const resolvedTrendXFields = $derived.by((): string[] => {
        if (!currentQuestion?.getTrendXFields || !prep) return resolvedAggregateFields;
        return currentQuestion.getTrendXFields(prep);
    });

    const currentVisuals = $derived.by((): { variant: string; showRoot?: boolean }[] => {
        if (!currentQuestion || !schema) return [];
        return getGuideVisuals(currentQuestion.id, schema);
    });

    // ── Pending answer (local; committed to store on Next) ────────────────────
    let pendingValue = $state<unknown>('');

    function defaultValue(inputType: string): unknown {
        if (inputType === 'multiselect' || inputType === 'drag-order') return [];
        if (inputType === 'label-builder') {
            const tmpl: LabelTemplate = { template: '', name: 'data point', includeIndex: false, includeParentName: false, omitKeyNames: false, includeDimensionName: false, includeParentNames: [] };
            return tmpl;
        }
        return '';
    }

    // Preload saved answer when the active question ID changes.
    // Tracks questionId (a stable string) rather than currentQuestion (a new object on each
    // getQuestions() call) to prevent resetting pendingValue mid-interaction (e.g. drag-order).
    // currentQuestion is read via untrack so object-reference churn doesn't retrigger the effect.
    $effect(() => {
        if (!questionId || !prep) return;
        const chapter = prep.qaProgress.chapters.find(c => c.id === chapterId);
        const saved = chapter?.answers[questionId];
        const q = untrack(() => currentQuestion);
        if (saved !== undefined) {
            pendingValue = saved;
        } else if (q?.defaultValue !== undefined) {
            pendingValue = q.defaultValue;
        } else if (q?.inputType === 'radio') {
            // Auto-select: prefer first suggested/noticed option, then first non-disabled option.
            // Use untrack for schema/data so their changes don't re-trigger this effect.
            const opts = untrack(() => {
                if (q.getDynamicOptions && schema && prep) return q.getDynamicOptions(prep, schema, data);
                return q.options ?? [];
            });
            const suggested = opts.find(o => !o.disabled && (o.notice?.type === 'suggest' || o.suggested));
            const first = opts.find(o => !o.disabled);
            pendingValue = (suggested ?? first)?.value ?? '';
        } else {
            pendingValue = defaultValue(q?.inputType ?? 'text');
        }
    });

    // ── Navigation ────────────────────────────────────────────────────────────
    function handleNext() {
        if (!prep || !schema || !currentQuestion) return;

        const qId = currentQuestion.id;
        const pv = pendingValue;
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

            // Override cursor — used by conflict-confirm "no" path to send user backward
            if (update.overrideCursor) {
                p = { ...p, qaProgress: { ...p.qaProgress, currentQuestionId: update.overrideCursor } };
                return { ...s, prepState: p, schemaState: sch };
            }

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

        const qLabel = qId.replace(/-/g, ' ');
        const aLabel = Array.isArray(pv)
            ? (pv as string[]).slice(0, 3).join(', ') + ((pv as string[]).length > 3 ? '…' : '')
            : typeof pv === 'object' && pv !== null
                ? 'label template'
                : String(pv).slice(0, 40);
        logAction(`Prep: ${qLabel} — ${aLabel}`);
    }

    function handleContinueToEditor() {
        handleNext();
        onComplete?.();
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
            {#key questionId}
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
                dimensionName={currentQuestion.dimensionName}
                parentDimensions={currentQuestion.parentDimensions}
                suggestedFields={currentQuestion.suggestedFields}
                aggregateFields={resolvedAggregateFields}
                trendXFields={resolvedTrendXFields}
                suggestedAggField={currentQuestion.suggestedAggField}
                dimensionCount={currentQuestion.dimensionCount}
                hasDivisions={currentQuestion.hasDivisions ?? false}
                rawData={data ?? []}
                dimensionKey={currentQuestion.nodeType === 'level1' ? currentQuestion.getFields?.(prep!) ?.[0] : undefined}
                parentDimNoun={currentQuestion.parentDimNoun}
                visuals={currentVisuals}
            />
            {/key}
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
                <span class="qa-done-label">Done!</span>
                <button
                    class="qa-btn qa-btn-next"
                    onclick={handleContinueToEditor}
                    aria-label="Continue to editor"
                >
                    Continue to Editor &#8594;
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
