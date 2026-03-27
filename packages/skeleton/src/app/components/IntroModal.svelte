<script lang="ts">
    type Props = { onclose: () => void };
    const { onclose }: Props = $props();

    const INTRO_KEY = 'dn-skeleton-intro-seen';
    let dialogEl: HTMLElement | undefined = $state();

    function dismiss() { onclose(); }

    function dismissPermanently() {
        localStorage.setItem(INTRO_KEY, 'true');
        onclose();
    }

    $effect(() => {
        if (dialogEl) {
            dialogEl.querySelector<HTMLElement>(
                'button:not([disabled]), a[href], input, [tabindex]:not([tabindex="-1"])'
            )?.focus();
        }
    });

    function onKeydown(e: KeyboardEvent) {
        if (e.key === 'Escape') { dismiss(); return; }
        if (e.key === 'Tab' && dialogEl) {
            const focusables = [...dialogEl.querySelectorAll<HTMLElement>(
                'button:not([disabled]), a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            )];
            if (!focusables.length) return;
            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
    }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="modal-backdrop" role="presentation" onclick={dismiss}>
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div
        class="modal intro-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="intro-modal-title"
        tabindex="-1"
        bind:this={dialogEl}
        onkeydown={onKeydown}
        onclick={(e) => e.stopPropagation()}
    >

        <!-- ── Header ── -->
        <div class="modal-header">
            <h2 id="intro-modal-title" class="modal-title">What is Skeleton?</h2>
            <button class="btn-ghost btn-sm close-btn" type="button" onclick={dismiss} aria-label="Close intro">✕</button>
        </div>

        <!-- ── Skip bar (always visible at top) ── -->
        <!-- <div class="intro-skip-bar">
            <label class="intro-checkbox-label">
                <input type="checkbox" onchange={dismissPermanently} />
                Skip this intro — don't show at startup again
            </label>
            <span class="intro-help-note">You can always find this intro in the Help menu.</span>
        </div> -->

        <!-- ── Scrollable body ── -->
        <div class="intro-body">

            <!-- Section 1: Hook -->
            <section class="intro-section" aria-labelledby="intro-s1">
                <p>
                    <strong>Skeleton</strong> is a tool for making interactive data interfaces more accessible to users who leverage assistive technologies.
                </p>
                <h3 id="intro-s1">Making data accessible is harder than it looks.</h3>
                <p>
                    Most data visualization tools are built around two assumptions: that users can see the screen, and that they can use a mouse. But millions of people access computers and the web in fundamentally different ways — and data tools fail them, often completely.
                </p>
                <p>
                    This problem is widespread: it affects analysts, scientists, journalists, finance professionals, students, and researchers who happen to use assistive technology. <strong>Skeleton</strong> helps you close that gap.
                </p>
            </section>

            <!-- Section 2: The humans behind AT -->
            <section class="intro-section" aria-labelledby="intro-s2">
                <h3 id="intro-s2">The people behind assistive technology</h3>
                <p>
                    "Assistive technology" is a broad term. The people who use these technologies have vastly different lives and experiences. Here are a few examples:
                </p>
                <ul class="intro-person-list">
                    <li>
                        <strong>Someone who can't use their hands or who doesn't have any.</strong> They might navigate with a keyboard using their feet, control a cursor with their head, or use voice navigation software to drive their entire computer. For them, interactions that require clicking or hovering might pose a barrier.
                    </li>
                    <li>
                        <strong>Someone who is blind or has low vision.</strong> They might use a <em>screen reader</em> — software like VoiceOver, NVDA, or JAWS — that reads content aloud and lets them navigate page structure. Importantly, "blind" doesn't mean "totally blind": many people use screen readers and have partial sight. Screen readers are also commonly used by people with cognitive and learning disabilities who are sighted.
                    </li>
                    <li>
                        <strong>Someone who is paralyzed.</strong> They might navigate their entire computer using a single-button switch device — held in their mouth, activated by a breath, or controlled by a blink. Every interaction is carefully timed. A poorly structured interface can exhausting or impossible to use.
                    </li>
                </ul>
                <p>
                    These are real people doing real work. Mouse-only and vision-only access to data is not enough. We need robust, multiple ways for users to accomplish goals — and that's what Skeleton helps you build.
                </p>
            </section>

            <!-- Section 3: When to navigate vs. when not to -->
            <section class="intro-section" aria-labelledby="intro-s3">
                <h3 id="intro-s3">When is navigation the right choice?</h3>
                <p>
                    Not every graphic needs navigable data points. Sometimes simpler accessibility approaches are better (these can each be used with the preceding option, in combination!):
                </p>
                <ul>
                    <li>A <strong>short text description</strong> as visible or invisible <strong>alt text</strong> in combination with a caption may fully explain a chart's key insight. Amy Cesal has a great guide on <a href="https://nightingaledvs.com/writing-alt-text-for-data-visualization/">how to write clear alternative text for charts</a>.</li>
                    <li>A <strong>data table</strong> underneath a visualization lets AT users access the underlying numbers directly, at a low level of detail. <a href="https://umwelt-data.github.io/olli/">Some software can do this automatically</a>, with a bit of coding.</li>
                    <li>An <strong>longer description</strong> alongside the image may help cover everything that matters. These are best in scientific and data-intensive contexts contexts, <a href="https://science.nasa.gov/asset/webb/exoplanet-wasp-96-b-niriss-transmission-spectrum/#:~:text=Graphic%20titled%20%E2%80%9CHot%20Gas%20Giant%20Exoplanet%20WASP%2D96%20b%20Atmosphere%20Composition%2C%20NIRISS%20Single%2DObject%20Slitless%20Spectroscopy.%E2%80%9D">like NASA uses</a>.</li>
                </ul>
                <p>
                    These are great solutions! But they aren't always enough. In-location, point-by-point navigation becomes the right choice when:
                </p>
                <ul>
                    <li>Elements in your graphic are <strong>interactive</strong> — users can click, hover, or trigger actions on them.</li>
                    <li>Your users need to <strong>interrogate data</strong> — analysts and researchers exploring values, comparing data points, or drilling into detail.</li>
                    <li>The <strong>spatial location</strong> of a data point is itself meaningful — when <em>where</em> something appears in the visualization is part of the information.</li>
                </ul>
                <p>
                    In these situations, a table or alt text won't cut it. That's what <strong>Data Navigator</strong> is built for.
                </p>
            </section>

            <!-- Section 4: What data navigator and Skeleton are -->
            <section class="intro-section" aria-labelledby="intro-s4">
                <h3 id="intro-s4">What are Data Navigator and Skeleton?</h3>
                <p>
                    <strong>Data Navigator</strong> is a JavaScript library that builds a navigable, keyboard- and AT-accessible structure on top of a rendered graphic. It also adds additional interactivity that mimics clicks and hovers, but can work with AT!
                </p>
                <p>
                    <strong>Skeleton</strong> is the visual tool you're using right now. This tool helps you build that Data Navigator structure <em>without writing code</em>, by walking you through a guided workflow.
                </p>
                <p>
                    Key concepts: <strong>nodes</strong> and <strong>edges</strong>. In Skeleton, a node represents a single navigable location — a data point, a chart element, or a region of the graphic. Nodes are drawn on top of your visualization as focus indicators, so both sighted and non-sighted users can see where navigation is happening. <strong>Edges</strong> connect nodes, defining the paths a user can travel between them (that's how the navigation magic happens). The nodes and their edges are what add an interactive <em>skeleton</em> to your graphic!
                </p>
            </section>

            <!-- Section 5: Step overview -->
            <section class="intro-section intro-steps" aria-labelledby="intro-s5">
                <h3 id="intro-s5">How Skeleton works: a step-by-step overview</h3>
                <p>Skeleton guides you through five steps. Here's what each one does:</p>

                <div class="intro-step-cards">

                    <!-- Step 0: Upload -->
                    <div class="intro-step-card">
                        <div class="step-card-diagram" aria-hidden="true">
                            <svg viewBox="0 0 220 130" width="220" height="130" focusable="false" aria-hidden="true">
                                <rect class="dg-bg" x="0" y="0" width="220" height="130" rx="4"/>
                                <!-- Zone 1: image (first section) -->
                                <rect class="dg-surface dg-accent-dash" x="8" y="8" width="96" height="76" rx="3"/>
                                <!-- Upload arrow -->
                                <path class="dg-muted-stroke" d="M56 36 L56 52 M50 42 L56 36 L62 42" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                                <!-- Zone 1 text lines -->
                                <rect class="dg-muted-fill" x="24" y="60" width="60" height="4" rx="2" opacity="0.45"/>
                                <rect class="dg-muted-fill" x="30" y="68" width="48" height="3" rx="1.5" opacity="0.25"/>
                                <!-- Zone 2: data (second section) -->
                                <rect class="dg-surface dg-accent-dash" x="116" y="8" width="96" height="76" rx="3"/>
                                <!-- Table icon -->
                                <rect class="dg-accent-soft-fill" x="134" y="22" width="60" height="7" rx="2"/>
                                <rect class="dg-border-stroke" x="134" y="32" width="60" height="5" rx="1" stroke-width="1"/>
                                <rect class="dg-border-stroke" x="134" y="40" width="60" height="5" rx="1" stroke-width="1"/>
                                <rect class="dg-border-stroke" x="134" y="48" width="60" height="5" rx="1" stroke-width="1"/>
                                <!-- Zone 2 text lines -->
                                <rect class="dg-muted-fill" x="132" y="60" width="60" height="4" rx="2" opacity="0.45"/>
                                <rect class="dg-muted-fill" x="138" y="68" width="48" height="3" rx="1.5" opacity="0.25"/>
                                <!-- Continue button -->
                                <rect class="dg-accent-fill" x="140" y="94" width="72" height="24" rx="4"/>
                                <rect x="152" y="102" width="48" height="8" rx="2" fill="rgba(255,255,255,0.35)"/>
                            </svg>
                        </div>
                        <div class="step-card-label">
                            <span class="step-number">Step 0</span>
                            <strong>Upload</strong>
                        </div>
                        <p class="step-card-caption">
                            Upload your graphic (first section) and your data file (second section). After both are loaded, a preview of your data appears. This is "Step 0" because it is completely optional! You can progress with only an image, only data, or nothing at all. Continue when you're ready.
                        </p>
                    </div>

                    <!-- Step 1: Prep -->
                    <div class="intro-step-card">
                        <div class="step-card-diagram" aria-hidden="true">
                            <svg viewBox="0 0 220 130" width="220" height="130" focusable="false" aria-hidden="true">
                                <rect class="dg-bg" x="0" y="0" width="220" height="130" rx="4"/>
                                <!-- Variable panel (first section) -->
                                <rect class="dg-surface dg-border-stroke" x="8" y="8" width="70" height="52" rx="3" stroke-width="1"/>
                                <rect class="dg-muted-fill" x="14" y="14" width="40" height="4" rx="2" opacity="0.5"/>
                                <rect class="dg-border-fill" x="14" y="22" width="56" height="5" rx="2" opacity="0.5"/>
                                <rect class="dg-border-fill" x="14" y="30" width="56" height="5" rx="2" opacity="0.5"/>
                                <rect class="dg-border-fill" x="14" y="38" width="56" height="5" rx="2" opacity="0.5"/>
                                <rect class="dg-border-fill" x="14" y="46" width="40" height="5" rx="2" opacity="0.3"/>
                                <!-- QA engine (second section, tall) -->
                                <rect class="dg-surface dg-accent-stroke" x="86" y="8" width="126" height="114" rx="3" stroke-width="1.5"/>
                                <rect class="dg-muted-fill" x="94" y="15" width="70" height="5" rx="2" opacity="0.5"/>
                                <!-- Q bubble 1 -->
                                <rect class="dg-accent-soft-fill dg-accent-light-stroke" x="94" y="26" width="88" height="18" rx="4" stroke-width="1"/>
                                <rect class="dg-accent-light-fill" x="100" y="31" width="60" height="4" rx="2" opacity="0.6"/>
                                <rect class="dg-muted-fill" x="100" y="38" width="40" height="3" rx="1.5" opacity="0.3"/>
                                <!-- A bubble -->
                                <rect class="dg-surface dg-border-stroke" x="120" y="50" width="80" height="14" rx="4" stroke-width="1"/>
                                <rect class="dg-muted-fill" x="128" y="55" width="50" height="4" rx="2" opacity="0.4"/>
                                <!-- Q bubble 2 -->
                                <rect class="dg-accent-soft-fill dg-accent-light-stroke" x="94" y="70" width="88" height="18" rx="4" stroke-width="1"/>
                                <rect class="dg-accent-light-fill" x="100" y="75" width="55" height="4" rx="2" opacity="0.6"/>
                                <rect class="dg-muted-fill" x="100" y="82" width="35" height="3" rx="1.5" opacity="0.3"/>
                                <!-- Complete prep button -->
                                <rect class="dg-accent-fill" x="94" y="105" width="80" height="11" rx="3"/>
                                <!-- Data table (third section) -->
                                <rect class="dg-surface dg-border-stroke" x="8" y="68" width="70" height="54" rx="3" stroke-width="1"/>
                                <rect class="dg-accent-soft-fill" x="14" y="74" width="56" height="6" rx="2"/>
                                <rect class="dg-border-fill" x="14" y="84" width="56" height="4" rx="2" opacity="0.4"/>
                                <rect class="dg-border-fill" x="14" y="92" width="56" height="4" rx="2" opacity="0.4"/>
                                <rect class="dg-border-fill" x="14" y="100" width="56" height="4" rx="2" opacity="0.4"/>
                                <rect class="dg-border-fill" x="14" y="108" width="40" height="4" rx="2" opacity="0.3"/>
                            </svg>
                        </div>
                        <div class="step-card-label">
                            <span class="step-number">Step 1</span>
                            <strong>Prep</strong>
                        </div>
                        <p class="step-card-caption">
                            If you uploaded data: inspect and clean up your data columns. If not, you can make a dataset here. Then answer guided questions about your data's structure — the Q&amp;A wizard (the second, larger section you encounter) guides you through creating "dimensions" and your automatic descriptions. This becomes the backbone of your accessible structure.
                        </p>
                    </div>

                    <!-- Step 2: Editor (wide card) -->
                    <div class="intro-step-card intro-step-card--wide">
                        <div class="step-card-diagram" aria-hidden="true">
                            <svg viewBox="0 0 220 130" width="220" height="130" focusable="false" aria-hidden="true">
                                <rect class="dg-bg" x="0" y="0" width="220" height="130" rx="4"/>
                                <!-- Scaffold toggle button (at top of step, before canvas) -->
                                <rect class="dg-surface dg-accent-stroke" x="8" y="8" width="60" height="14" rx="3" stroke-width="1"/>
                                <rect class="dg-accent-soft-fill" x="12" y="11" width="40" height="8" rx="2"/>
                                <!-- Canvas (first major section) -->
                                <rect class="dg-surface dg-border-stroke" x="8" y="26" width="154" height="96" rx="3" stroke-width="1"/>
                                <!-- Image placeholder -->
                                <rect class="dg-border-fill" x="12" y="30" width="146" height="52" rx="2" opacity="0.2"/>
                                <!-- Edges (drawn before nodes so nodes appear on top) -->
                                <line class="dg-accent-light-stroke" x1="50" y1="56" x2="90" y2="56" stroke-width="1.5"/>
                                <line class="dg-accent-light-stroke" x1="90" y1="56" x2="130" y2="56" stroke-width="1.5"/>
                                <line class="dg-accent-light-stroke" x1="70" y1="56" x2="70" y2="74" stroke-width="1"/>
                                <line class="dg-accent-light-stroke" x1="110" y1="56" x2="110" y2="74" stroke-width="1"/>
                                <!-- Nodes -->
                                <circle class="dg-accent-fill" cx="50" cy="56" r="6"/>
                                <circle class="dg-accent-fill" cx="90" cy="56" r="6"/>
                                <circle class="dg-accent-fill" cx="130" cy="56" r="6"/>
                                <circle class="dg-accent-light-fill" cx="70" cy="74" r="5"/>
                                <circle class="dg-accent-light-fill" cx="110" cy="74" r="5"/>
                                <!-- Continue button -->
                                <rect class="dg-accent-fill" x="80" y="108" width="76" height="10" rx="3" opacity="0.8"/>
                                <!-- Properties panel (second section) -->
                                <rect class="dg-surface dg-border-stroke" x="170" y="8" width="42" height="114" rx="3" stroke-width="1"/>
                                <rect class="dg-muted-fill" x="175" y="16" width="28" height="4" rx="2" opacity="0.5"/>
                                <rect class="dg-border-fill" x="175" y="24" width="32" height="3" rx="1.5" opacity="0.5"/>
                                <rect class="dg-border-fill" x="175" y="30" width="28" height="3" rx="1.5" opacity="0.5"/>
                                <rect class="dg-border-fill" x="175" y="36" width="32" height="3" rx="1.5" opacity="0.5"/>
                                <rect class="dg-border-fill" x="175" y="42" width="24" height="3" rx="1.5" opacity="0.5"/>
                                <rect class="dg-border-fill" x="175" y="50" width="30" height="3" rx="1.5" opacity="0.5"/>
                                <rect class="dg-border-fill" x="175" y="56" width="26" height="3" rx="1.5" opacity="0.5"/>
                            </svg>
                        </div>
                        <div class="step-card-content">
                            <div class="step-card-label">
                                <span class="step-number">Step 2</span>
                                <strong>Editor</strong>
                            </div>
                            <p class="step-card-caption">
                                Draw your navigation structure on the canvas (the first major section). Add nodes that represent accessible elements in your graphic and connect them with edges. The properties panel (the section after the canvas) lets you configure each selected node.
                            </p>
                        </div>
                    </div>

                    <!-- Skeleton diagram section (full width, between step 2 and step 3) -->
                    <div class="intro-skeleton-section">
                        <p class="skeleton-intro-text">
                            Each node you create becomes a visible outline drawn on top of your chart — a navigation stop that both sighted and non-sighted users can see and reach. Edges connect nodes, defining the paths between them. Together they form the accessible <em>skeleton</em> of your visualization. Here are four ways to structure the same stacked bar chart:
                        </p>
                        <div class="skeleton-diagrams" aria-hidden="true">

                            <div class="skeleton-diagram-item">
                                <div class="step-card-diagram">
                                    <svg viewBox="0 0 160 100" width="160" height="100" focusable="false" aria-hidden="true">
                                        <rect class="dg-chart-bg" x="0" y="0" width="160" height="100"/>
                                        <rect class="dg-bar" x="10" y="68" width="28" height="22"/>
                                        <rect class="dg-bar" x="10" y="40" width="28" height="28"/>
                                        <rect class="dg-bar" x="10" y="14" width="28" height="26"/>
                                        <rect class="dg-bar" x="46" y="72" width="28" height="18"/>
                                        <rect class="dg-bar" x="46" y="34" width="28" height="38"/>
                                        <rect class="dg-bar" x="46" y="16" width="28" height="18"/>
                                        <rect class="dg-bar" x="82" y="64" width="28" height="26"/>
                                        <rect class="dg-bar" x="82" y="42" width="28" height="22"/>
                                        <rect class="dg-bar" x="82" y="12" width="28" height="30"/>
                                        <rect class="dg-bar" x="118" y="70" width="28" height="20"/>
                                        <rect class="dg-bar" x="118" y="46" width="28" height="24"/>
                                        <rect class="dg-bar" x="118" y="24" width="28" height="22"/>
                                        <line class="dg-baseline" x1="4" y1="90" x2="156" y2="90"/>
                                    </svg>
                                </div>
                                <p class="skeleton-diagram-caption"><strong>No structure</strong>: A screen reader or keyboard user cannot navigate any element.</p>
                            </div>

                            <div class="skeleton-diagram-item">
                                <div class="step-card-diagram">
                                    <svg viewBox="0 0 160 100" width="160" height="100" focusable="false" aria-hidden="true">
                                        <rect class="dg-chart-bg" x="0" y="0" width="160" height="100"/>
                                        <line class="dg-baseline" x1="4" y1="90" x2="156" y2="90"/>
                                        <rect class="dg-bar" x="10" y="68" width="28" height="22"/>
                                        <rect class="dg-bar" x="10" y="40" width="28" height="28"/>
                                        <rect class="dg-bar" x="10" y="14" width="28" height="26"/>
                                        <rect class="dg-bar" x="46" y="72" width="28" height="18"/>
                                        <rect class="dg-bar" x="46" y="34" width="28" height="38"/>
                                        <rect class="dg-bar" x="46" y="16" width="28" height="18"/>
                                        <rect class="dg-bar" x="82" y="64" width="28" height="26"/>
                                        <rect class="dg-bar" x="82" y="42" width="28" height="22"/>
                                        <rect class="dg-bar" x="82" y="12" width="28" height="30"/>
                                        <rect class="dg-bar" x="118" y="70" width="28" height="20"/>
                                        <rect class="dg-bar" x="118" y="46" width="28" height="24"/>
                                        <rect class="dg-bar" x="118" y="24" width="28" height="22"/>
                                        <!-- Stack-level outlines (one per full column) -->
                                        <rect class="dg-outline-stack" x="8" y="12" width="32" height="80"/>
                                        <rect class="dg-outline-stack" x="44" y="14" width="32" height="78"/>
                                        <rect class="dg-outline-stack" x="80" y="10" width="32" height="82"/>
                                        <rect class="dg-outline-stack" x="116" y="22" width="32" height="70"/>
                                    </svg>
                                </div>
                                <p class="skeleton-diagram-caption"><strong>Column (stack) nodes</strong>: Users can navigate left and right between whole stacks as groups.</p>
                            </div>

                            <div class="skeleton-diagram-item">
                                <div class="step-card-diagram">
                                    <svg viewBox="0 0 160 100" width="160" height="100" focusable="false" aria-hidden="true">
                                        <rect class="dg-chart-bg" x="0" y="0" width="160" height="100"/>
                                        <line class="dg-baseline" x1="4" y1="90" x2="156" y2="90"/>
                                        <rect class="dg-bar" x="10" y="68" width="28" height="22"/>
                                        <rect class="dg-bar" x="10" y="40" width="28" height="28"/>
                                        <rect class="dg-bar" x="10" y="14" width="28" height="26"/>
                                        <rect class="dg-bar" x="46" y="72" width="28" height="18"/>
                                        <rect class="dg-bar" x="46" y="34" width="28" height="38"/>
                                        <rect class="dg-bar" x="46" y="16" width="28" height="18"/>
                                        <rect class="dg-bar" x="82" y="64" width="28" height="26"/>
                                        <rect class="dg-bar" x="82" y="42" width="28" height="22"/>
                                        <rect class="dg-bar" x="82" y="12" width="28" height="30"/>
                                        <rect class="dg-bar" x="118" y="70" width="28" height="20"/>
                                        <rect class="dg-bar" x="118" y="46" width="28" height="24"/>
                                        <rect class="dg-bar" x="118" y="24" width="28" height="22"/>
                                        <!-- Cross-stack hull: bottom group (Seg A) -->
                                        <polygon class="dg-hull" points="9,91 9,67 39,67 45,71 75,71 81,63 111,63 117,69 147,69 147,91"/>
                                        <!-- Cross-stack hull: middle group (Seg B) -->
                                        <polygon class="dg-hull" points="9,69 9,39 39,39 45,33 75,33 81,41 111,41 117,45 147,45 147,71 117,71 111,65 81,65 75,73 45,73 39,69"/>
                                        <!-- Cross-stack hull: top group (Seg C) -->
                                        <polygon class="dg-hull" points="9,41 9,13 39,13 45,15 75,15 81,11 111,11 117,23 147,23 147,47 117,47 111,43 81,43 75,35 45,35 39,41"/>
                                    </svg>
                                </div>
                                <p class="skeleton-diagram-caption"><strong>Cross-stack groups</strong>: This outline spans same-layer bars across all columns and users can navigate up and down.</p>
                            </div>

                            <div class="skeleton-diagram-item">
                                <div class="step-card-diagram">
                                    <svg viewBox="0 0 160 100" width="160" height="100" focusable="false" aria-hidden="true">
                                        <rect class="dg-chart-bg" x="0" y="0" width="160" height="100"/>
                                        <line class="dg-baseline" x1="4" y1="90" x2="156" y2="90"/>
                                        <rect class="dg-bar" x="10" y="68" width="28" height="22"/>
                                        <rect class="dg-bar" x="10" y="40" width="28" height="28"/>
                                        <rect class="dg-bar" x="10" y="14" width="28" height="26"/>
                                        <rect class="dg-bar" x="46" y="72" width="28" height="18"/>
                                        <rect class="dg-bar" x="46" y="34" width="28" height="38"/>
                                        <rect class="dg-bar" x="46" y="16" width="28" height="18"/>
                                        <rect class="dg-bar" x="82" y="64" width="28" height="26"/>
                                        <rect class="dg-bar" x="82" y="42" width="28" height="22"/>
                                        <rect class="dg-bar" x="82" y="12" width="28" height="30"/>
                                        <rect class="dg-bar" x="118" y="70" width="28" height="20"/>
                                        <rect class="dg-bar" x="118" y="46" width="28" height="24"/>
                                        <rect class="dg-bar" x="118" y="24" width="28" height="22"/>
                                        <!-- Individual leaf outlines (one per bar segment) -->
                                        <rect class="dg-outline-leaf" x="9" y="67" width="30" height="24"/>
                                        <rect class="dg-outline-leaf" x="9" y="39" width="30" height="30"/>
                                        <rect class="dg-outline-leaf" x="9" y="13" width="30" height="28"/>
                                        <rect class="dg-outline-leaf" x="45" y="71" width="30" height="20"/>
                                        <rect class="dg-outline-leaf" x="45" y="33" width="30" height="40"/>
                                        <rect class="dg-outline-leaf" x="45" y="15" width="30" height="20"/>
                                        <rect class="dg-outline-leaf" x="81" y="63" width="30" height="28"/>
                                        <rect class="dg-outline-leaf" x="81" y="41" width="30" height="24"/>
                                        <rect class="dg-outline-leaf" x="81" y="11" width="30" height="32"/>
                                        <rect class="dg-outline-leaf" x="117" y="69" width="30" height="22"/>
                                        <rect class="dg-outline-leaf" x="117" y="45" width="30" height="26"/>
                                        <rect class="dg-outline-leaf" x="117" y="23" width="30" height="24"/>
                                    </svg>
                                </div>
                                <p class="skeleton-diagram-caption"><strong>Leaf nodes</strong>: each individual bar segment gets its own outline and navigation stop. Users can navigate up, down, left, and right among them.</p>
                            </div>

                        </div>
                        <div class="intro-callout">
                            <strong>The Scaffold tool</strong> — toggled by a button at the top of Step 2 — automatically builds these structures from your data. It uses your data's coordinate system to place nodes precisely on your canvas, then lets you choose between stack-level, cross-group, and leaf-level outlines, fine-tune padding, and adjust groupings. For structured chart types (bar, scatter, line, and more), it's by far the fastest way to build a complete navigation structure.
                        </div>
                    </div>

                    <!-- Step 3: Testing -->
                    <div class="intro-step-card">
                        <div class="step-card-diagram" aria-hidden="true">
                            <svg viewBox="0 0 220 130" width="220" height="130" focusable="false" aria-hidden="true">
                                <rect class="dg-bg" x="0" y="0" width="220" height="130" rx="4"/>
                                <!-- Inspector (first section) -->
                                <rect class="dg-surface dg-border-stroke" x="8" y="8" width="48" height="114" rx="3" stroke-width="1"/>
                                <!-- Mini hierarchy graph -->
                                <circle class="dg-accent-fill" cx="32" cy="32" r="5" opacity="0.8"/>
                                <line class="dg-border-stroke" x1="32" y1="37" x2="20" y2="52" stroke-width="1"/>
                                <line class="dg-border-stroke" x1="32" y1="37" x2="44" y2="52" stroke-width="1"/>
                                <circle class="dg-accent-light-fill" cx="20" cy="55" r="4" opacity="0.75"/>
                                <circle class="dg-accent-light-fill" cx="44" cy="55" r="4" opacity="0.75"/>
                                <line class="dg-border-stroke" x1="20" y1="59" x2="20" y2="72" stroke-width="1"/>
                                <line class="dg-border-stroke" x1="44" y1="59" x2="44" y2="72" stroke-width="1"/>
                                <circle class="dg-muted-fill" cx="20" cy="75" r="3" opacity="0.5"/>
                                <circle class="dg-muted-fill" cx="44" cy="75" r="3" opacity="0.5"/>
                                <!-- Canvas (second, main section) -->
                                <rect class="dg-surface dg-border-stroke" x="64" y="8" width="96" height="114" rx="3" stroke-width="1"/>
                                <!-- Image placeholder -->
                                <rect class="dg-border-fill" x="68" y="12" width="88" height="56" rx="2" opacity="0.2"/>
                                <!-- Node overlays on canvas -->
                                <circle class="dg-accent-stroke" cx="90" cy="38" r="7" stroke-width="2"/>
                                <circle class="dg-accent-stroke" cx="112" cy="38" r="7" stroke-width="2"/>
                                <circle class="dg-accent-stroke" cx="134" cy="38" r="7" stroke-width="2"/>
                                <!-- Focused node highlight -->
                                <circle class="dg-accent-fill" cx="112" cy="38" r="7" opacity="0.35"/>
                                <!-- SR announcement area -->
                                <rect class="dg-accent-soft-fill" x="68" y="76" width="88" height="20" rx="2"/>
                                <rect class="dg-accent-light-fill" x="74" y="81" width="60" height="4" rx="2" opacity="0.6"/>
                                <rect class="dg-muted-fill" x="74" y="88" width="40" height="3" rx="1.5" opacity="0.4"/>
                                <!-- Nav controls -->
                                <rect class="dg-border-fill" x="68" y="100" width="40" height="18" rx="2" opacity="0.4"/>
                                <rect class="dg-muted-fill" x="72" y="106" width="28" height="6" rx="2" opacity="0.5"/>
                                <!-- Log panel (third section) -->
                                <rect class="dg-surface dg-border-stroke" x="168" y="8" width="44" height="114" rx="3" stroke-width="1"/>
                                <rect class="dg-muted-fill" x="173" y="15" width="30" height="4" rx="2" opacity="0.5"/>
                                <rect class="dg-border-fill" x="173" y="24" width="34" height="5" rx="2" opacity="0.45"/>
                                <rect class="dg-border-fill" x="173" y="34" width="28" height="3" rx="1.5" opacity="0.35"/>
                                <rect class="dg-border-fill" x="173" y="40" width="34" height="3" rx="1.5" opacity="0.35"/>
                                <rect class="dg-muted-fill" x="173" y="54" width="26" height="4" rx="2" opacity="0.45"/>
                                <rect class="dg-border-fill" x="173" y="62" width="34" height="3" rx="1.5" opacity="0.3"/>
                                <rect class="dg-border-fill" x="173" y="68" width="28" height="3" rx="1.5" opacity="0.3"/>
                                <rect class="dg-border-fill" x="173" y="74" width="32" height="3" rx="1.5" opacity="0.3"/>
                                <rect class="dg-border-fill" x="173" y="80" width="26" height="3" rx="1.5" opacity="0.25"/>
                            </svg>
                        </div>
                        <div class="step-card-label">
                            <span class="step-number">Step 3</span>
                            <strong>Testing</strong>
                        </div>
                        <p class="step-card-caption">
                            The first section shows a graph of your navigation hierarchy. The second section shows your graphic with navigation node indicators drawn on top — the currently focused node is highlighted. The third section is the navigation and event log panel, where you can enable keyboard navigation, use a text interface to navigate, and watch a live event log.
                        </p>
                    </div>

                    <!-- Step 4: Export -->
                    <div class="intro-step-card">
                        <div class="step-card-diagram" aria-hidden="true">
                            <svg viewBox="0 0 220 130" width="220" height="130" focusable="false" aria-hidden="true">
                                <rect class="dg-bg" x="0" y="0" width="220" height="130" rx="4"/>
                                <!-- Tab row (first section you encounter at the top) -->
                                <rect class="dg-surface dg-border-stroke" x="8" y="8" width="204" height="28" rx="3" stroke-width="1"/>
                                <!-- Active tab -->
                                <rect class="dg-accent-fill" x="14" y="13" width="38" height="18" rx="2" opacity="0.9"/>
                                <rect x="18" y="19" width="28" height="5" rx="2" fill="rgba(255,255,255,0.55)"/>
                                <!-- Inactive tabs -->
                                <rect class="dg-surface dg-border-stroke" x="56" y="13" width="36" height="18" rx="2" stroke-width="0.5"/>
                                <rect class="dg-border-fill" x="60" y="19" width="26" height="5" rx="2" opacity="0.5"/>
                                <rect class="dg-surface dg-border-stroke" x="96" y="13" width="36" height="18" rx="2" stroke-width="0.5"/>
                                <rect class="dg-border-fill" x="100" y="19" width="26" height="5" rx="2" opacity="0.5"/>
                                <rect class="dg-surface dg-border-stroke" x="136" y="13" width="36" height="18" rx="2" stroke-width="0.5"/>
                                <rect class="dg-border-fill" x="140" y="19" width="26" height="5" rx="2" opacity="0.5"/>
                                <!-- Content area (after the tab row) -->
                                <rect class="dg-surface dg-border-stroke" x="8" y="44" width="204" height="78" rx="3" stroke-width="1"/>
                                <!-- Code-like lines -->
                                <rect class="dg-accent-fill" x="16" y="54" width="60" height="5" rx="2" opacity="0.5"/>
                                <rect class="dg-border-fill" x="24" y="64" width="120" height="4" rx="2" opacity="0.5"/>
                                <rect class="dg-border-fill" x="24" y="72" width="90" height="4" rx="2" opacity="0.4"/>
                                <rect class="dg-border-fill" x="24" y="80" width="140" height="4" rx="2" opacity="0.5"/>
                                <rect class="dg-border-fill" x="24" y="88" width="80" height="4" rx="2" opacity="0.4"/>
                                <rect class="dg-accent-light-fill" x="16" y="98" width="40" height="4" rx="2" opacity="0.55"/>
                                <!-- Under construction notice -->
                                <rect class="dg-accent-soft-fill dg-accent-light-stroke" x="126" y="88" width="76" height="24" rx="4" stroke-width="1"/>
                                <rect class="dg-accent-light-fill" x="132" y="94" width="50" height="4" rx="2" opacity="0.65"/>
                                <rect class="dg-muted-fill" x="136" y="102" width="38" height="3" rx="1.5" opacity="0.4"/>
                            </svg>
                        </div>
                        <div class="step-card-label">
                            <span class="step-number">Step 4</span>
                            <strong>Export</strong>
                        </div>
                        <p class="step-card-caption">
                            Export your navigation structure as embeddable code. The tab row at the top of this step lets you choose from HTML, CSS, JavaScript, or a combined preview. Copy or download the output to integrate into your project. <em>This step is still under construction.</em>
                        </p>
                    </div>

                </div>
            </section>

        </div>

        <!-- ── Footer ── -->
        <div class="intro-footer">
            <div class="intro-footer-left">
                <label class="intro-checkbox-label">
                    <input type="checkbox" onchange={dismissPermanently} />
                    Don't show this intro again
                </label>
                <span class="intro-help-note">You can always find this intro in the Help menu.</span>
            </div>
            <button class="btn-primary" type="button" onclick={dismiss}>
                Get started →
            </button>
        </div>

    </div>
</div>

<style>
    .modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: calc(var(--dn-space) * 2);
    }

    .intro-modal {
        background: var(--dn-bg);
        border: 1px solid var(--dn-border);
        border-radius: var(--dn-radius);
        width: 100%;
        max-width: 820px;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        overflow: hidden;
    }

    /* ── Header ── */
    .modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: calc(var(--dn-space) * 2) calc(var(--dn-space) * 3);
        border-bottom: 1px solid var(--dn-border);
        flex-shrink: 0;
    }

    .modal-title {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 700;
        color: var(--dn-text);
    }

    .close-btn {
        flex-shrink: 0;
    }

    /* ── Skip bar ── */
    .intro-skip-bar {
        display: flex;
        align-items: center;
        gap: calc(var(--dn-space) * 2);
        padding: calc(var(--dn-space) * 1.25) calc(var(--dn-space) * 3);
        background: var(--dn-surface);
        border-bottom: 1px solid var(--dn-border);
        flex-shrink: 0;
        flex-wrap: wrap;
    }

    /* ── Scrollable body ── */
    .intro-body {
        flex: 1;
        overflow-y: auto;
        padding: calc(var(--dn-space) * 3);
        display: flex;
        flex-direction: column;
        gap: calc(var(--dn-space) * 4);
    }

    /* ── Sections ── */
    .intro-section {
        display: flex;
        flex-direction: column;
        gap: calc(var(--dn-space) * 1.5);
    }

    .intro-section h3 {
        margin: 0;
        font-size: 1.0625rem;
        font-weight: 700;
        color: var(--dn-text);
    }

    .intro-section p {
        margin: 0;
        line-height: 1.65;
        color: var(--dn-text);
    }

    .intro-section ul {
        margin: 0;
        padding-left: calc(var(--dn-space) * 3);
        display: flex;
        flex-direction: column;
        gap: calc(var(--dn-space) * 1);
    }

    .intro-section li {
        line-height: 1.65;
        color: var(--dn-text);
    }

    .intro-person-list {
        list-style: none !important;
        padding: 0 !important;
        gap: calc(var(--dn-space) * 1.5) !important;
    }

    .intro-person-list li {
        padding: calc(var(--dn-space) * 1.5) calc(var(--dn-space) * 2);
        background: var(--dn-surface);
        border-radius: var(--dn-radius);
        border-left: 3px solid var(--dn-accent);
    }

    /* ── Step cards ── */
    .intro-steps {
        border-top: 1px solid var(--dn-border);
        padding-top: calc(var(--dn-space) * 3);
    }

    .intro-step-cards {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: calc(var(--dn-space) * 2);
    }

    .intro-step-card {
        border: 1px solid var(--dn-border);
        border-radius: var(--dn-radius);
        padding: calc(var(--dn-space) * 1.5);
        background: var(--dn-surface);
        display: flex;
        flex-direction: column;
        gap: calc(var(--dn-space) * 1);
    }

    .intro-step-card--wide {
        grid-column: 1 / -1;
        flex-direction: row;
        align-items: flex-start;
        flex-wrap: wrap;
        gap: calc(var(--dn-space) * 2);
    }

    .step-card-content {
        flex: 1;
        min-width: 220px;
        display: flex;
        flex-direction: column;
        gap: calc(var(--dn-space) * 1);
    }

    .step-card-diagram {
        border-radius: calc(var(--dn-radius) - 2px);
        overflow: hidden;
        background: var(--dn-bg);
        border: 1px solid var(--dn-border);
        line-height: 0;
        flex-shrink: 0;
    }

    .step-card-diagram svg {
        display: block;
        width: 100%;
        height: auto;
    }

    .step-card-label {
        display: flex;
        align-items: baseline;
        gap: calc(var(--dn-space) * 1);
    }

    .step-number {
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--dn-text-muted);
        text-transform: uppercase;
        letter-spacing: 0.04em;
    }

    .step-card-label strong {
        font-size: 0.9375rem;
        color: var(--dn-text);
    }

    .step-card-caption {
        margin: 0;
        font-size: 0.8125rem;
        line-height: 1.6;
        color: var(--dn-text-muted);
    }

    .intro-callout {
        background: var(--dn-accent-soft);
        border: 1px solid var(--dn-accent-light);
        border-radius: calc(var(--dn-radius) - 2px);
        padding: calc(var(--dn-space) * 1.5);
        font-size: 0.8125rem;
        line-height: 1.6;
        color: var(--dn-text);
    }

    /* ── Footer ── */
    .intro-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: calc(var(--dn-space) * 2);
        padding: calc(var(--dn-space) * 2) calc(var(--dn-space) * 3);
        border-top: 1px solid var(--dn-border);
        background: var(--dn-surface);
        flex-shrink: 0;
        flex-wrap: wrap;
    }

    .intro-footer-left {
        display: flex;
        flex-direction: column;
        gap: calc(var(--dn-space) * 0.5);
    }

    /* ── Shared: checkbox label + help note ── */
    .intro-checkbox-label {
        display: flex;
        align-items: center;
        gap: calc(var(--dn-space) * 1);
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--dn-text);
        cursor: pointer;
        user-select: none;
    }

    .intro-checkbox-label input[type="checkbox"] {
        width: 16px;
        height: 16px;
        min-width: 16px;
        min-height: 16px;
        cursor: pointer;
        accent-color: var(--dn-accent);
        flex-shrink: 0;
    }

    .intro-help-note {
        font-size: 0.8125rem;
        color: var(--dn-text-muted);
    }

    /* ── SVG diagram CSS classes ── */

    .dg-bg                { fill: var(--dn-bg); }
    .dg-surface           { fill: var(--dn-surface); }
    .dg-border-fill       { fill: var(--dn-border); }
    .dg-border-stroke     { stroke: var(--dn-border); fill: none; }
    .dg-accent-fill       { fill: var(--dn-accent); }
    .dg-accent-stroke     { stroke: var(--dn-accent); fill: none; }
    .dg-accent-light-fill { fill: var(--dn-accent-light); }
    .dg-accent-light-stroke { stroke: var(--dn-accent-light); fill: none; }
    .dg-accent-soft-fill  { fill: var(--dn-accent-soft); }
    .dg-muted-fill        { fill: var(--dn-text-muted); }
    .dg-muted-stroke      { stroke: var(--dn-text-muted); fill: none; }

    /* Dashed stroke for upload zones */
    .dg-accent-dash {
        stroke: var(--dn-accent-light);
        stroke-width: 1.5;
        stroke-dasharray: 5 3;
    }

    /* ── Bar chart diagram classes ── */

    .dg-chart-bg  { fill: var(--dn-surface); }
    .dg-baseline  { stroke: var(--dn-text-muted); stroke-width: 1; }
    .dg-bar       {
        fill: var(--dn-accent-light); 
        fill-opacity: 0.72; 
        stroke: white;
    }

    /* Stack-level outlines */
    .dg-outline-stack {
        fill: none;
        stroke: var(--dn-text);
        stroke-width: 2;
        stroke-linejoin: round;
    }

    /* Cross-stack group hull outlines */
    .dg-hull {
        fill: var(--dn-accent);
        fill-opacity: 0.1;
        stroke: var(--dn-accent);
        stroke-width: 1.5;
        stroke-linejoin: round;
    }

    /* Leaf node outlines */
    .dg-outline-leaf {
        fill: none;
        stroke: var(--dn-accent);
        stroke-width: 1.5;
        stroke-linejoin: round;
    }

    /* ── Skeleton diagram section ── */

    .intro-skeleton-section {
        grid-column: 1 / -1;
        display: flex;
        flex-direction: column;
        gap: calc(var(--dn-space) * 1.5);
        border: 1px solid var(--dn-border);
        border-radius: var(--dn-radius);
        padding: calc(var(--dn-space) * 2);
        background: var(--dn-surface);
    }

    .skeleton-intro-text {
        margin: 0;
        font-size: 0.875rem;
        line-height: 1.65;
        color: var(--dn-text);
    }

    .skeleton-diagrams {
        display: flex;
        flex-wrap: wrap;
        gap: calc(var(--dn-space) * 1.5);
    }

    .skeleton-diagram-item {
        display: flex;
        flex-direction: column;
        gap: calc(var(--dn-space) * 0.75);
        flex: 1;
        min-width: 140px;
    }

    .skeleton-diagram-caption {
        margin: 0;
        font-size: 0.75rem;
        line-height: 1.5;
        color: var(--dn-text-muted);
    }
</style>
