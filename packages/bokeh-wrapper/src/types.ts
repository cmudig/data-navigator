import type {
    Structure,
    StructureOptions,
    RenderingOptions,
    NodeObject,
    LLMMessage
} from 'data-navigator';

/**
 * Supported Bokeh chart types for smart defaults.
 * Use 'auto' to let the wrapper infer the type from your data.
 */
export type BokehChartType =
    | 'bar'
    | 'hbar'
    | 'scatter'
    | 'cartesian'
    | 'line'
    | 'multiline'
    | 'crossline'
    | 'stacked_bar'
    | 'auto';

/**
 * Navigation interface mode.
 * - 'text'     — text-chat menu only (default, best for broad accessibility)
 * - 'keyboard' — keyboard navigation only (arrow keys, no text chat)
 * - 'both'     — both interfaces simultaneously
 */
export type BokehWrapperMode = 'text' | 'keyboard' | 'both';

export type BokehWrapperOptions = {
    /**
     * The element containing the rendered Bokeh plot.
     * The wrapper sets this to `inert` so assistive technologies
     * skip Bokeh's inaccessible canvas/SVG output.
     */
    plotContainer: string | HTMLElement;

    /**
     * The dataset used to generate the chart — plain JSON array of objects.
     */
    data: Record<string, unknown>[];

    /**
     * Chart type for smart defaults. Defaults to 'auto'.
     */
    type?: BokehChartType;

    /**
     * Field name used as the horizontal / category axis.
     */
    xField?: string;

    /**
     * Field name used as the vertical / value axis.
     */
    yField?: string;

    /**
     * Field name used to group data (series, stack layer, etc.).
     */
    groupField?: string;

    /**
     * Override the field used to generate node IDs.
     * By default the wrapper derives IDs from the data.
     */
    idField?: string;

    /**
     * Chart title used as the opening of the accessible chart description
     * announced when a user first enters the navigation structure.
     * If omitted, the description opens with the x and y field names instead.
     * Example: "Fruit counts"
     */
    title?: string;

    /**
     * Override the auto-generated accessible description for the chart's root node.
     * Pass a string for a static description, or a function that receives the
     * wrapper options and returns a string.
     *
     * Single-dimension charts (bar, multiline, stacked_bar): the description is set
     * as `semantics.label` on the dimension root node.
     * Multi-dimension charts: it becomes the `semantics.label` of an injected
     * Level 0 node added via the data-navigator `dimensions.parentOptions.addLevel0` API.
     */
    describeRoot?: string | ((options: BokehWrapperOptions) => string);

    /**
     * Interface mode. Defaults to 'text' (text-chat menu).
     */
    mode?: BokehWrapperMode;

    /**
     * Container element for the text-chat UI.
     * If omitted, the wrapper creates a `<div>` and inserts it
     * immediately after `plotContainer`.
     */
    chatContainer?: string | HTMLElement;

    /**
     * Called every time the user navigates to a new node.
     * Use this to sync Bokeh chart highlights or tooltips.
     */
    onNavigate?: (node: NodeObject) => void;

    /**
     * Called when the user exits the navigation structure.
     */
    onExit?: () => void;

    /**
     * Called when the user types "click" or "select" in text mode.
     * Receives the currently focused node. Use this to programmatically
     * trigger Bokeh hit-testing or selection logic.
     */
    onClick?: (node: NodeObject) => void;

    /**
     * Called when the user types "hover" or "inspect" in text mode.
     * Receives the currently focused node. Use this to programmatically
     * trigger Bokeh hover / tooltip display.
     */
    onHover?: (node: NodeObject) => void;

    /**
     * Optional LLM callback for AI-assisted data Q&A in text mode.
     * Receives a message array and should return a response string.
     */
    llm?: (messages: LLMMessage[]) => Promise<string | null>;

    /**
     * Override the default human-readable labels for navigation commands
     * shown in the text-chat interface (e.g. { left: 'Previous bar' }).
     */
    commandLabels?: Record<string, string>;

    /**
     * Advanced: merge additional options into the generated StructureOptions
     * before calling `data-navigator`'s structure builder.
     */
    structureOptions?: Partial<StructureOptions>;

    /**
     * Advanced: override rendering options used in keyboard mode.
     */
    renderingOptions?: Partial<RenderingOptions>;

    /**
     * Advanced: adds "compressSparseDivisions" to all dimensions of the chart.
     */
    compressSparseDivisions?: boolean;
};

export type BokehWrapperInstance = {
    /** Remove all DOM nodes added by the wrapper and restore `plotContainer`. */
    destroy: () => void;
    /** Returns the node currently focused in the navigation structure. */
    getCurrentNode: () => NodeObject | null;
    /** The data-navigator Structure, e.g. for use with @data-navigator/inspector. */
    structure: Structure;
};
