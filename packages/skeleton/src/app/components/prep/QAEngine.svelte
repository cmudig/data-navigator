<script lang="ts">
    import { onDestroy } from 'svelte';
    import {
        appState,
        type PrepState,
        type SchemaState,
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
        onAnswer: (value: unknown, prep: PrepState, schema: SchemaState, data: Row[] | null) => StoreUpdate;
    }

    interface QAChapterDef {
        id: QAChapterId;
        label: string;
        getQuestions: (prep: PrepState, schema: SchemaState, data: Row[] | null) => QAQuestionDef[];
    }

    // ── Chapter definitions (stubs — content replaced in Session 5, Tasks 11–14) ──
    // Each chapter has one placeholder question. Full question scripts come next session.
    const CHAPTERS: QAChapterDef[] = [
        {
            id: 'top-level-access',
            label: 'Top-level access',
            getQuestions: (_prep, _schema, _data) => [
                {
                    id: 'ch1-placeholder',
                    question: 'Chapter 1 questions are coming in the next session.',
                    hint: 'This chapter will ask about how users first arrive at your data — whether there\'s a single entry point, what it\'s called, and what a screen reader should say.',
                    inputType: 'text',
                    onAnswer: (_value, _prep, _schema, _data) => ({}),
                },
            ],
        },
        {
            id: 'dimensions',
            label: 'Browsing groups',
            getQuestions: (_prep, _schema, _data) => [
                {
                    id: 'ch2-placeholder',
                    question: 'Chapter 2 questions are coming in the next session.',
                    hint: 'This chapter will ask which columns should become navigable browsing groups, their type, sort order, and layering.',
                    inputType: 'text',
                    onAnswer: (_value, _prep, _schema, _data) => ({}),
                },
            ],
        },
        {
            id: 'navigation',
            label: 'Navigation',
            getQuestions: (_prep, _schema, _data) => [
                {
                    id: 'ch3-placeholder',
                    question: 'Chapter 3 questions are coming in the next session.',
                    hint: 'This chapter will ask which keyboard layout to use and what happens when users reach the ends of groups.',
                    inputType: 'text',
                    onAnswer: (_value, _prep, _schema, _data) => ({}),
                },
            ],
        },
        {
            id: 'leaf-node-patterns',
            label: 'Individual data points',
            getQuestions: (prep, _schema, _data) => [
                {
                    id: 'ch4-placeholder',
                    question: 'Chapter 4 questions are coming in the next session.',
                    hint: 'This chapter helps you create a reusable template — a pattern — for how individual data points are announced. You set it up once, and it automatically applies to every data point in your visualization. The preview below shows what it will sound like for one example row.',
                    inputType: 'label-builder',
                    nodeType: 'level3',
                    getFields: (p: PrepState) => p.variables.filter(v => !v.removed).map(v => v.key),
                    getSampleData: (data: Row[] | null, _p: PrepState) => data?.[0] ?? {},
                    onAnswer: (_value, _prep, _schema, _data) => ({}),
                },
            ],
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
            const tmpl: LabelTemplate = { template: '', name: 'data point', includeIndex: false, includeParentName: false };
            return tmpl;
        }
        return '';
    }

    // Preload saved answer whenever the active question changes
    $effect(() => {
        if (!currentQuestion || !prep) return;
        const chapter = prep.qaProgress.chapters.find(c => c.id === chapterId);
        const saved = chapter?.answers[currentQuestion.id];
        pendingValue = saved !== undefined ? saved : defaultValue(currentQuestion.inputType);
    });

    // ── Navigation ────────────────────────────────────────────────────────────
    function handleNext() {
        if (!prep || !schema || !currentQuestion) return;

        const update = currentQuestion.onAnswer(pendingValue, prep, schema, data);
        const snapshotQId = currentQuestion.id;
        const snapshotChId = chapterId;
        const snapshotChIdx = chapterIndex;
        const snapshotQIdx = currentQuestionIndex;
        const snapshotTotalQs = currentQuestions.length;
        // Capture question list at this moment for next-id lookup
        const snapshotQuestions = currentQuestions;

        appState.update(s => {
            if (!s.prepState) return s;
            let p: PrepState = s.prepState;
            let sch: SchemaState = s.schemaState;

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

            if (snapshotQIdx < snapshotTotalQs - 1) {
                // Next question in same chapter
                p = { ...p, qaProgress: { ...p.qaProgress, currentQuestionId: snapshotQuestions[snapshotQIdx + 1].id } };
            } else {
                // Last question in chapter — mark chapter complete
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
                    const nextQs = nextChapter.getQuestions(p, sch, data);
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
