<script lang="ts">
    type Props = { onclose: () => void; onOpenIntro?: () => void };
    const { onclose, onOpenIntro }: Props = $props();

    let dialogEl: HTMLElement | undefined = $state();
    let activeTab = $state(0);

    const tabs = [
        { id: 'help-tab-schema',    panelId: 'help-panel-schema',    label: 'Schema Panel'    },
        { id: 'help-tab-canvas',    panelId: 'help-panel-canvas',    label: 'Graph Canvas'    },
        { id: 'help-tab-inspector', panelId: 'help-panel-inspector', label: 'Inspector Panel' },
    ];

    $effect(() => {
        if (dialogEl) {
            const first = dialogEl.querySelector<HTMLElement>(
                'button, a[href], input, [tabindex]:not([tabindex="-1"])'
            );
            first?.focus();
        }
    });

    function focusTab(index: number) {
        if (!dialogEl) return;
        dialogEl.querySelector<HTMLElement>(`#${tabs[index].id}`)?.focus();
    }

    function onKeydown(e: KeyboardEvent) {
        if (e.key === 'Escape') {
            onclose();
            return;
        }

        const target = e.target as HTMLElement;
        if (target.getAttribute('role') === 'tab') {
            if (e.key === 'ArrowRight') {
                e.preventDefault();
                activeTab = Math.min(activeTab + 1, tabs.length - 1);
                focusTab(activeTab);
                return;
            }
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                activeTab = Math.max(activeTab - 1, 0);
                focusTab(activeTab);
                return;
            }
            if (e.key === 'Home') { e.preventDefault(); activeTab = 0; focusTab(0); return; }
            if (e.key === 'End')  { e.preventDefault(); activeTab = tabs.length - 1; focusTab(activeTab); return; }
        }

        if (e.key === 'Tab' && dialogEl) {
            const focusables = [...dialogEl.querySelectorAll<HTMLElement>(
                'button:not([disabled]), a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            )];
            if (focusables.length === 0) return;
            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            if (e.shiftKey) {
                if (document.activeElement === first) { e.preventDefault(); last.focus(); }
            } else {
                if (document.activeElement === last) { e.preventDefault(); first.focus(); }
            }
        }
    }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="modal-backdrop" role="presentation" onclick={onclose}>
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div
        class="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-modal-title"
        tabindex="-1"
        bind:this={dialogEl}
        onkeydown={onKeydown}
        onclick={(e) => e.stopPropagation()}
    >
        <!-- Header -->
        <div class="modal-header">
            <h2 id="help-modal-title" class="modal-title">Help</h2>
            <button class="btn-ghost btn-sm close-btn" type="button" onclick={onclose} aria-label="Close help">✕</button>
        </div>

        <!-- Preamble: always-visible intro -->
        <div class="modal-preamble">
            {#if onOpenIntro}
                <div class="preamble-intro-link">
                    <button class="btn-ghost btn-sm" type="button" onclick={onOpenIntro}>
                        ← View the "What is Skeleton?" intro again
                    </button>
                </div>
            {/if}
            <p>
                Interactive visualizations are powerful — but only if you can access them. <strong>Skeleton</strong> helps you build a navigable, interactive structure on
                top of your visualization, so that folks who use assistive technologies can harness that power too.
            </p>
            <p>
                Who this matters for: users of <strong>screen readers</strong>;
                users of <strong>keyboard, switch, or eye-tracking</strong> tech;
                users with <strong>cognitive disabilities</strong> who benefit from structured, predictable navigation;
                and users in any context where pointer access is unavailable. When built correctly, Data Navigator enables text and voice interaction and even AI and agent-driven interactivity, too.
                See a complex example of an <a href="https://dig.cmu.edu/data-navigator/examples/interactive-elements.html" target="_blank" rel="noopener noreferrer">interactive visualization made more accessible</a>.
            </p>
            <p>
                And learn more about accessible navigation strategies and techniques in our <a href="https://dig.cmu.edu/data-navigator/" target="_blank" rel="noopener noreferrer">docs for Data Navigator</a>.
            </p>
            <div class="preamble-scaffold-callout">
                <strong>Tip: the Scaffold tool</strong> — available in Step 2 (Editor) via a toggle button at the top of the step — automatically positions your navigation nodes based on your data. It renders a Vega-Lite visualization behind the scenes and uses its coordinate system to place nodes precisely on your canvas, with controls for fine-tuning position, padding, and group shapes. If you have structured chart data (bar, scatter, line, and more), try it first.
            </div>
        </div>

        <!-- Tab list -->
        <div class="tab-list" role="tablist" aria-label="Help topics">
            {#each tabs as tab, i}
                <button
                    id={tab.id}
                    role="tab"
                    aria-selected={i === activeTab}
                    aria-controls={tab.panelId}
                    tabindex={i === activeTab ? 0 : -1}
                    class="help-tab"
                    class:active={i === activeTab}
                    type="button"
                    onclick={() => { activeTab = i; }}
                >
                    {tab.label}
                </button>
            {/each}
        </div>

        <!-- Tab panels -->
        <div class="tab-panels">

            <!-- ── Schema Panel ── -->
            <div
                id="help-panel-schema"
                role="tabpanel"
                aria-labelledby="help-tab-schema"
                class="tab-panel"
                hidden={activeTab !== 0}
            >
                <div class="help-section">
                    <h3>What is the Schema Panel?</h3>
                    <p>
                        The Schema Panel appears as a left sidebar when you are on the <strong>Structure</strong> step
                        and have uploaded a data file. It analyzes your data's columns to automatically propose a
                        navigable hierarchy — you then configure, adjust, and preview the result before it becomes
                        your graph structure.
                    </p>
                </div>

                <div class="help-section">
                    <h3>What is the graph viewer in the Schema Panel?</h3>
                    <p>
                        The small graph inside the Schema Panel is powered by the
                        <a href="https://dig.cmu.edu/data-navigator/inspector/" target="_blank" rel="noopener noreferrer">@data-navigator/inspector</a>
                        library. It renders a force-directed or tree layout of the structure that Data Navigator will
                        actually use. Each <strong>circle</strong> is a navigable stopping point; each
                        <strong>line</strong> is a path a user can travel between them. This live preview updates as
                        you change your schema configuration.
                    </p>
                </div>

                <div class="help-section">
                    <h3>What are dimensions?</h3>
                    <p>
                        A dimension is one level of categorization in the navigation hierarchy — a
                        <em>way of grouping</em> your data. Think of it as answering the question: "group these data
                        points by what?" For example, a bar chart showing sales by region and year might have two
                        dimensions: <strong>Region</strong> and <strong>Year</strong>. Each dimension becomes a
                        navigable layer users can enter and exit.
                    </p>
                </div>

                <div class="help-section">
                    <h3>What are divisions?</h3>
                    <p>
                        Divisions are the individual groups <em>within</em> a dimension. If "Region" is a dimension,
                        then "North," "South," "East," and "West" are its divisions. Divisions become the navigable
                        nodes users move between — so choosing the right divisions directly shapes how users
                        experience traversing your chart.
                    </p>
                    <p>
                        Most divisions have multiple child nodes or data points, like a stacked bar chart that has a stack of bars as well as categories <i>across</i> bars. These are all divisions! However, some divisions end up only ever have 1 child (in a regular bar chart, the divisions of a category <i>are</i> the bars themselves!). In those cases, you can use the "compressSparseDivisions" option!
                    </p>
                </div>

                <div class="help-section">
                    <h3>What is "NUM" and "CAT"?</h3>
                    <p>
                        The Schema Panel classifies each data column as either <strong>CAT</strong> (categorical) or
                        <strong>NUM</strong> (numerical). These are broadly different types of data:
                    </p>
                    <ul>
                        <li>
                            <strong>CAT</strong> — discrete, named groups (e.g., categories, labels, regions). CAT
                            fields define navigable <em>groups</em>: each unique value becomes a division. In a
                            grammar of graphics sense, CAT often encodes grouping and color/fill channels.
                        </li>
                        <li>
                            <strong>NUM</strong> — ordered, continuous values (e.g., counts, prices, dates). NUM
                            fields define <em>ordered sequences</em>: items are often sorted by value. In a grammar of
                            graphics sense, NUM typically encodes position (x/y axes), size, area, and other quantitative spatial channels.
                        </li>
                    </ul>
                    <p>
                        Choosing CAT vs NUM tells Data Navigator whether to <em>group</em> your data into labeled
                        buckets or <em>sort</em> it into an ordered range and chop them into numerical subdivisions — which changes both the structure of the
                        navigation and the language used to describe it. Check out our default dataset (and corresponding default chart) in Step 0: "Upload" to see the difference in CAT and NUM.
                    </p>
                </div>

                <div class="help-section">
                    <h3>What are the navigation rules and names?</h3>
                    <p>
                        Navigation rules define which direction each edge travels. The built-in directions are:
                    </p>
                    <ul>
                        <li><strong>Between siblings:</strong>
                            <ul>
                                <li><strong>up / down</strong> — move vertically within a dimension (e.g., between items in a group). This is the default first navigation pairing added when you load data. It uses <kbd> ↑ </kbd> / <kbd> ↓ </kbd> keys by default.</li>
                                <li><strong>left / right</strong> — move laterally between siblings at the same level (this is added as a default for moving between dimensions, aka "level 1" nodes!).  It uses <kbd> ← </kbd> / <kbd> → </kbd> keys by default.</li>
                                <li><strong>forward / backward</strong> — this is a movement direction that is added if a third dimension is included. It uses <kbd> [ </kbd> / <kbd> ] </kbd> keys by default. You can see an example of this third navigation in our <a href="https://dig.cmu.edu/data-navigator/bokeh-wrapper/examples/scatter-grouped.html" target="_blank" rel="noopener noreferrer">Bokeh Wrapper docs</a>.</li>
                            </ul>
                        </li>
                        <li><strong>Into/out of a group:</strong>
                            <ul>
                                <li><strong>drill in</strong> — this is always used to drill down into a node's children (so from a dimension to divisions or from divisions to the leaf child nodes). This uses <kbd> ENTER </kbd> key by default.</li>
                                <li><strong>drill out to __</strong> — drilling out often depends on how many parents the current node has and which parent you want to travel to. If a structure only has 1 dimension, this uses <kbd> BACKSPACE </kbd> key by default. Otherwise, when there are multiple parents, <kbd> W </kbd> goes to the first, <kbd> J </kbd> to the second, and <kbd> \ </kbd> to the third. These were all chosen as keys because they have few conflicts with existing screen reader keybinds.</li>
                            </ul>
                        </li>
                        
                        <li><strong>exit</strong> — escape the navigable region entirely. This uses <kbd> ESC </kbd> key by default.</li>
                    </ul>
                    <p>
                        All of these mappings can be configured in the <strong>Input</strong> step. And note: keyboard navigation is only handled by default, but text navigation (and voice!), as well as gestures and many other inputs can all be used to map to a navigation rule.
                    </p>
                </div>

                <div class="help-section">
                    <h3>What do "bridged cousins," "terminal," and "circular" mean?</h3>
                    <p>
                        These terms describe how navigation behaves at boundaries:
                    </p>
                    <ul>
                        <li>
                            <strong>Terminal</strong> — movement stops at the edge. Pressing right on the last item
                            does nothing — like reaching the end of a ruler. Good for ordered numerical axes where
                            wrapping would be disorienting.
                        </li>
                        <li>
                            <strong>Circular</strong> — movement wraps around. Pressing right on the last item loops
                            back to the first — like a radio dial. Good for categorical dimensions where there's no
                            meaningful "end."
                        </li>
                        <li>
                            <strong>Bridged cousins</strong> — at the leaf (deepest) level, lateral movement can
                            cross dimension boundaries. Normally each dimension is isolated and you navigate
                            within it. With bridged cousins enabled (<code>childmostNavigation: 'across'</code>),
                            left/right jump across "cousin" nodes in adjacent groups — powerful for stacked bar or
                            grouped charts where left/right should always mean "previous/next data point" regardless
                            of which group you're in.
                        </li>
                    </ul>
                </div>

                <div class="help-section">
                    <h3>What makes a "good" navigation structure?</h3>
                    <p>
                        There is no single answer — it depends on your chart type and what users need to accomplish.
                        Some general principles:
                    </p>
                    <ul>
                        <li>Fewer dimensions means simpler navigation — don't add layers users don't need.</li>
                        <li>Match extents to your data: terminal for ordered scales, circular for unordered categories.</li>
                        <li>Use clear, informative labels so screen reader users always know where they are.</li>
                        <li>Think about the questions users are trying to answer, and structure navigation to support those paths.</li>
                    </ul>
                    <p>
                        The best way to learn is to explore examples.
                        Visit the <a href="https://dig.cmu.edu/data-navigator/examples/" target="_blank" rel="noopener noreferrer">Data Navigator examples</a>
                        to see patterns for bar charts, scatter plots, line charts, and more.
                    </p>
                </div>
            </div>

            <!-- ── Graph Canvas ── -->
            <div
                id="help-panel-canvas"
                role="tabpanel"
                aria-labelledby="help-tab-canvas"
                class="tab-panel"
                hidden={activeTab !== 1}
            >
                <div class="help-section">
                    <h3>What is the Graph Canvas?</h3>
                    <p>
                        The Graph Canvas is the central editing area of the <strong>Structure</strong> step. You use it
                        to manually draw <em>nodes</em> and <em>edges</em> — building the navigable structure of your
                        visualization by hand, rather than auto-generating it from data. The canvas is an infinite SVG
                        surface you can pan and zoom freely.
                    </p>
                </div>

                <div class="help-section">
                    <h3>Why does it matter to spatially lay out nodes?</h3>
                    <p>
                        <strong>This is critical for accessibility.</strong> The position you place each node on the
                        canvas maps directly to where the <em>focus indicator</em> (the visible "cursor" for keyboard
                        and assistive technology users) appears on your actual rendered chart.
                    </p>
                    <p>
                        When a screen reader or keyboard user navigates to a node, the focus ring appears at that
                        node's X/Y coordinates — overlaid on the chart image. If nodes are poorly placed, focus
                        jumps unpredictably around the screen, which is disorienting and makes the chart harder
                        to understand. Placing nodes to match the visual positions of chart elements ensures focus
                        moves in a logical, predictable pattern that mirrors what a sighted user sees.
                    </p>
                    <p>
                        Learn more about why this matters in our guide on
                        <a href="https://dig.cmu.edu/data-navigator/examples/interactive-elements.html" target="_blank" rel="noopener noreferrer">interactive elements and focus indication</a>.
                        Also see the <a href="https://chartability.github.io/POUR-CAF/" target="_blank" rel="noopener noreferrer">Chartability workbook</a>
                        for focus-related accessibility tests.
                    </p>
                </div>

                <div class="help-section">
                    <h3>How does panning and selection work?</h3>
                    <ul>
                        <li>
                            <strong>Select mode</strong> — click a node or edge to select it; hold Shift and click to
                            add to the selection; drag an empty area to draw a lasso and select everything inside.
                        </li>
                        <li>
                            <strong>Pan mode</strong> — drag the canvas to pan. You can also hold <kbd>Space</kbd> and
                            drag in any mode to pan without switching modes.
                        </li>
                        <li>
                            <strong>Zoom</strong> — use the zoom input in the toolbar, or pinch on a trackpad.
                            "Reset zoom" returns the view to 100%.
                        </li>
                        <li>
                            <strong>Add Node / Add Edge</strong> — click the toolbar buttons to enter drawing mode,
                            then click the canvas to place a node or click two nodes to connect them with an edge.
                        </li>
                    </ul>
                </div>

                <div class="help-section">
                    <h3>What are nodes and edges?</h3>
                    <p>
                        <strong>Nodes</strong> represent individual navigable elements — data points, group labels,
                        cluster containers, or other stopping points in your visualization. Each node has a label,
                        a shape, a position, and semantic properties that assistive technologies announce.
                    </p>
                    <p>
                        <strong>Edges</strong> represent the connections between nodes — the paths a user can
                        travel when navigating. Each edge has a <em>direction</em> (up, down, left, right, exit, or
                        custom) that determines which keyboard input triggers it. An edge from node A to node B with
                        direction "right" means: while at A, pressing the right key moves to B.
                    </p>
                </div>

                <div class="help-section">
                    <h3>Why would I want to "pair" edges?</h3>
                    <p>
                        When you add an edge, the toolbar offers an <strong>Add pairs</strong> checkbox. When
                        checked, adding an edge A → B also automatically creates the reverse edge B → A (with
                        the opposite direction). This ensures navigation works in both directions without you
                        needing to draw each edge twice.
                    </p>
                    <p>
                        Visually, edges that have a reverse counterpart are rendered as <em>curved bezier arcs</em>
                        rather than straight lines, so they don't overlap each other on the canvas. This makes it
                        easier to see bidirectional relationships in your structure.
                    </p>
                </div>

                <div class="help-section">
                    <h3>What do the tool options do?</h3>
                    <p>
                        The <strong>Tool Options</strong> dropdown in the canvas toolbar controls what's visible
                        while you edit:
                    </p>
                    <ul>
                        <li>
                            <strong>Labels</strong> — toggle node labels and edge labels on or off, and adjust their
                            text and outline colors for readability against your background image.
                        </li>
                        <li>
                            <strong>Nodes</strong> — toggle the display of all nodes. In schema mode (when a data
                            file is loaded), you can also control colors by level: Level 0 = root node, Level 1 =
                            dimension nodes, Level 2 = division nodes, Level 3 = data point nodes.
                        </li>
                        <li>
                            <strong>Edges</strong> — toggle the display of all edges. In schema mode, control
                            colors by edge type (parent/child, lateral, etc.) to distinguish different navigation
                            paths visually.
                        </li>
                        <li>
                            <strong>Backfill</strong> — fills node backgrounds with a color, making them visible
                            even when node shapes are transparent or when the background image is busy. Useful
                            for editing contrast.
                        </li>
                    </ul>
                    <p>
                        These options only affect the canvas editor view — they do not change your exported structure.
                    </p>
                </div>
            </div>

            <!-- ── Inspector Panel ── -->
            <div
                id="help-panel-inspector"
                role="tabpanel"
                aria-labelledby="help-tab-inspector"
                class="tab-panel"
                hidden={activeTab !== 2}
            >
                <div class="help-section">
                    <h3>What is the Inspector Panel?</h3>
                    <p>
                        The Inspector Panel is the right sidebar that shows the properties of whatever node or edge
                        you have selected on the canvas. <strong>Every field here directly affects how assistive
                        technologies experience your visualization.</strong> Getting these right is the core of
                        making a chart accessible — this is where you author the experience for screen reader users,
                        keyboard-only users, and others who can't rely on the visual display alone.
                    </p>
                </div>

                <div class="help-section">
                    <h3>Identity — Label</h3>
                    <p>
                        The node's <strong>Label</strong> is the primary text displayed on the canvas and used as
                        the default accessible name. Screen readers may announce this when focus arrives at the
                        node. Keep it concise and descriptive — it should tell a user <em>what this element is</em>.
                        (Note: the Semantics section gives you finer control over exactly what gets announced.)
                    </p>
                </div>

                <div class="help-section">
                    <h3>Identity — Is Entry Node</h3>
                    <p>
                        <strong>Is Entry Node</strong> marks this node as the starting point for keyboard navigation
                        into the visualization. Every accessible chart needs exactly one entry node — it's the first
                        element a user lands on when they tab into the navigable region. Choose a node that makes
                        sense as a "front door": typically a title node, a root group, or the first data point.
                    </p>
                </div>

                <div class="help-section">
                    <h3>Identity — Is Cluster</h3>
                    <p>
                        <strong>Is Cluster</strong> marks a node as a group container that logically owns child
                        nodes beneath it. Assistive technologies use this to communicate group membership — for
                        example, announcing "In the North region" before describing individual bars. The
                        <strong>Cluster Count</strong> field (visible when Is Cluster is on) tells the browser
                        how many items are in the group, enabling announcements like "group, 4 items."
                    </p>
                </div>

                <div class="help-section">
                    <h3>Position &amp; Size</h3>
                    <p>
                        <strong>X and Y</strong> define where the focus indicator appears on the rendered chart.
                        These should match the visual position of the chart element this node represents — so that
                        when a keyboard user reaches this node, the visible focus ring appears <em>on</em> the
                        corresponding bar, point, or region, not in empty space.
                    </p>
                    <p>
                        <strong>Width and Height</strong> define the size of the focus region. These should match
                        the visual size of the chart element so the focus ring wraps it accurately. An oversized
                        or undersized focus region is a common accessibility issue — it makes focus hard to
                        associate with the correct visual element.
                    </p>
                    <p>
                        Coordinates can be set in <strong>px</strong> (absolute pixels) or
                        <strong>%</strong> (relative to the chart image dimensions), which helps your structure
                        scale correctly if the chart is resized.
                    </p>
                </div>

                <div class="help-section">
                    <h3>Rendering — Shape, Fill, and Stroke</h3>
                    <p>
                        <strong>Shape</strong> sets the geometric shape of the focus indicator: rect (rectangle),
                        ellipse, or custom. Match this to the visual shape of the chart element — a circular
                        data point gets an ellipse focus ring; a rectangular bar gets a rect.
                    </p>
                    <p>
                        <strong>Fill</strong> and <strong>Stroke</strong> control the appearance of the focus
                        indicator. The stroke color and width are especially important: focus indicators must be
                        visually perceivable against the chart background (WCAG 2.4.11 Focus Appearance). Use
                        a high-contrast color and sufficient stroke width. See the
                        <a href="https://chartability.github.io/POUR-CAF/" target="_blank" rel="noopener noreferrer">Chartability workbook</a>
                        for specific focus-related accessibility tests.
                    </p>
                </div>

                <div class="help-section">
                    <h3>Rendering — Opacity and ARIA Role</h3>
                    <p>
                        <strong>Opacity</strong> controls how transparent the focus indicator is. Never set this
                        to fully transparent — the focus indicator must be visible to sighted keyboard users. A
                        partially transparent fill can work if the stroke remains opaque.
                    </p>
                    <p>
                        <strong>ARIA Role</strong> is the semantic role announced to assistive technologies —
                        for example, <code>img</code>, <code>figure</code>, <code>listitem</code>, or
                        <code>button</code>. Choose the role that best describes what this element <em>is</em>
                        in context. For most data points, <code>img</code> or <code>listitem</code> are common
                        choices. See
                        <a href="https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles" target="_blank" rel="noopener noreferrer">MDN ARIA Roles</a>
                        for the full list and guidance on when to use each.
                    </p>
                </div>

                <div class="help-section">
                    <h3>Semantics — Label Template</h3>
                    <p>
                        The <strong>Semantics Label</strong> is a template for the text a screen reader announces
                        when focus reaches this node. It supports dynamic placeholders:
                    </p>
                    <ul>
                        <li><code>{'{key:"fieldName"}'}</code> — inserts the field's <em>name</em> (the column key)</li>
                        <li><code>{'{value:"fieldName"}'}</code> — inserts the field's <em>value</em> from the node's Data</li>
                    </ul>
                    <p>
                        For example, the template <code>Sales in {'{key:"region"}'}: {'{value:"amount"}'} million</code>
                        might announce <em>"Sales in region: 42 million"</em>.
                        A live preview of the announcement is shown below the template field.
                    </p>
                </div>

                <div class="help-section">
                    <h3>Semantics — Name, Group Info</h3>
                    <p>
                        <strong>Name</strong> is the semantic type of this element — what kind of thing it is
                        (e.g., "data point," "bar," "marker"). This is appended to the label announcement, helping
                        users understand the element's role in context.
                    </p>
                    <p>
                        <strong>Include index (X of Y)</strong> adds a positional announcement such as
                        "3 of 8" — helping users understand where they are within a group.
                        <strong>Include parent name</strong> prepends the parent node's label to the announcement,
                        providing contextual orientation (e.g., "in North region, bar 3 of 8").
                        Both are especially useful in charts with many similar items.
                    </p>
                </div>

                <div class="help-section">
                    <h3>Data</h3>
                    <p>
                        The <strong>Data</strong> section holds key-value pairs attached to this node.
                        These values are referenced in the Semantics label template using
                        <code>{'{value:"key"}'}</code> placeholders. Use this to store the actual data values
                        (e.g., a bar's height, a point's y-coordinate) so that screen readers can announce them
                        dynamically and informatively — turning a generic "bar" into "Sales, North region: 42 million."
                    </p>
                </div>

                <div class="help-section">
                    <h3>Edge — Direction</h3>
                    <p>
                        When an edge is selected, its <strong>Direction</strong> determines which navigation input
                        triggers it: <code>up</code>, <code>down</code>, <code>left</code>, <code>right</code>,
                        <code>exit</code>, or <code>custom</code>. The direction maps to keyboard keys as
                        configured in the <strong>Input</strong> step. An edge from A to B with direction
                        <code>right</code> means: while focused on A, the "right" input moves focus to B.
                        <code>exit</code> is a special direction for leaving the navigable region entirely.
                    </p>
                </div>
            </div>

        </div><!-- /tab-panels -->

        <!-- Footer -->
        <div class="modal-footer">
            <a
                class="footer-link"
                href="https://dig.cmu.edu/data-navigator/examples/"
                target="_blank"
                rel="noopener noreferrer"
            >Examples &amp; docs ↗</a>
            <a
                class="footer-link"
                href="https://chartability.github.io/POUR-CAF/"
                target="_blank"
                rel="noopener noreferrer"
            >Chartability workbook ↗</a>
            <button class="btn-ghost btn-sm" type="button" onclick={onclose}>Close</button>
        </div>
    </div>
</div>

<style>
    .modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.45);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        padding: 1rem;
    }

    .modal {
        background: var(--dn-bg);
        border: 1px solid var(--dn-border);
        border-radius: var(--dn-radius);
        width: min(860px, 100%);
        max-height: 85dvh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
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
        font-size: 1.125rem;
        font-weight: 600;
        color: var(--dn-text);
    }

    .close-btn {
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }

    /* ── Preamble ── */
    .modal-preamble {
        padding: calc(var(--dn-space) * 2) calc(var(--dn-space) * 3);
        border-bottom: 1px solid var(--dn-border);
        flex-shrink: 0;
        background: var(--dn-surface);
        display: flex;
        flex-direction: column;
        gap: calc(var(--dn-space) * 1);
    }

    .preamble-intro-link {
        margin-bottom: calc(var(--dn-space) * 0.5);
    }

    .preamble-scaffold-callout {
        background: var(--dn-accent-soft);
        border: 1px solid var(--dn-accent-light);
        border-radius: calc(var(--dn-radius) - 2px);
        padding: calc(var(--dn-space) * 1.25) calc(var(--dn-space) * 1.5);
        font-size: 0.875rem;
        line-height: 1.6;
        color: var(--dn-text);
        margin-top: calc(var(--dn-space) * 0.5);
    }

    .modal-preamble p {
        margin: 0;
        font-size: 0.9rem;
        color: var(--dn-text-muted);
        line-height: 1.65;
    }

    .modal-preamble a {
        color: var(--dn-accent);
        text-decoration: underline;
    }

    .modal-preamble a:hover {
        color: var(--dn-accent-hover);
    }

    /* ── Tab list ── */
    .tab-list {
        display: flex;
        border-bottom: 1px solid var(--dn-border);
        flex-shrink: 0;
        overflow-x: auto;
        scrollbar-width: none;
        padding: 0 calc(var(--dn-space) * 2);
        gap: 0;
    }

    .tab-list::-webkit-scrollbar {
        display: none;
    }

    .help-tab {
        padding: calc(var(--dn-space) * 1.25) calc(var(--dn-space) * 2);
        border: none;
        border-bottom: 3px solid transparent;
        background: transparent;
        color: var(--dn-text-muted);
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        border-radius: 0;
        min-height: 44px;
        white-space: nowrap;
        transition: color 0.12s, border-color 0.12s;
        margin-bottom: -1px;
    }

    .help-tab:hover:not(.active) {
        color: var(--dn-text);
        background: var(--dn-accent-soft);
    }

    .help-tab.active {
        color: var(--dn-accent);
        border-bottom-color: var(--dn-accent);
        font-weight: 600;
    }

    /* ── Tab panels ── */
    .tab-panels {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        padding: calc(var(--dn-space) * 3);
    }

    .tab-panel {
        display: flex;
        flex-direction: column;
        gap: calc(var(--dn-space) * 2.5);
    }

    .tab-panel[hidden] {
        display: none;
    }

    /* ── Content sections ── */
    .help-section {
        display: flex;
        flex-direction: column;
        gap: calc(var(--dn-space) * 0.75);
    }

    .help-section h3 {
        margin: 0;
        font-size: 0.9375rem;
        font-weight: 600;
        color: var(--dn-text);
    }

    .help-section p,
    .help-section ul {
        margin: 0;
        font-size: 0.9rem;
        color: var(--dn-text-muted);
        line-height: 1.7;
    }

    .help-section ul {
        padding-left: calc(var(--dn-space) * 2.5);
        display: flex;
        flex-direction: column;
        gap: calc(var(--dn-space) * 0.5);
    }

    .help-section a {
        color: var(--dn-accent);
        text-decoration: underline;
    }

    .help-section a:hover {
        color: var(--dn-accent-hover);
    }

    .help-section code {
        font-family: var(--dn-font-mono, ui-monospace, monospace);
        font-size: 0.8125em;
        background: var(--dn-surface);
        border: 1px solid var(--dn-border);
        border-radius: calc(var(--dn-radius) * 0.5);
        padding: 0.1em 0.35em;
        color: var(--dn-text);
    }

    .help-section kbd {
        font-family: var(--dn-font-mono, ui-monospace, monospace);
        font-size: 0.8125em;
        background: var(--dn-surface);
        border: 1px solid var(--dn-border);
        border-radius: calc(var(--dn-radius) * 0.5);
        padding: 0.1em 0.4em;
        color: var(--dn-text);
        box-shadow: 0 1px 0 var(--dn-border);
    }

    /* ── Footer ── */
    .modal-footer {
        display: flex;
        align-items: center;
        gap: calc(var(--dn-space) * 2);
        padding: calc(var(--dn-space) * 1.5) calc(var(--dn-space) * 3);
        border-top: 1px solid var(--dn-border);
        flex-shrink: 0;
    }

    .footer-link {
        font-size: 0.8125rem;
        color: var(--dn-accent);
        text-decoration: underline;
        margin-right: auto;
    }

    .footer-link:first-of-type {
        margin-right: 0;
    }

    .footer-link:hover {
        color: var(--dn-accent-hover);
    }

    .modal-footer button {
        margin-left: auto;
    }
</style>
