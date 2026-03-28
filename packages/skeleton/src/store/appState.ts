import { writable } from 'svelte/store';
import type { SkeletonNode, SkeletonEdge } from './types';

export type { SkeletonNode, SkeletonEdge };

export interface DivisionEntry {
    id: string; // editable — used as DN division ID
    originalValue: string; // original data value or range label (read-only display)
}

export interface DimensionSchema {
    key: string;
    type: 'numerical' | 'categorical';
    included: boolean;
    navIndex: number | null; // 0/1/2 when selected
    // Behavior
    extents: 'circular' | 'terminal' | 'bridgedCousins';
    divisionExtents: 'circular' | 'terminal' | null; // null = reduced dim (no divisions)
    compressSparseDivisions: boolean;
    sortMethod: 'ascending' | 'descending' | 'none';
    subdivisions: number; // numerical only, 1–12, default 4
    // Computed divisions (editable IDs)
    divisions: DivisionEntry[];
    // Sibling nav (forward/backward within dimension)
    forwardName: string;
    forwardKey: string;
    backwardName: string;
    backwardKey: string;
    // Drill nav (parent/child between levels)
    drillInName: string;
    drillInKey: string;
    drillOutName: string;
    drillOutKey: string;
}

export interface SchemaState {
    dimensions: DimensionSchema[];
    childmostNavigation: 'within' | 'across';
    allowMoreThan3: boolean;
    collapsed: boolean;
    graphMode: 'tree' | 'force';
    hideLeafNodes: boolean; // graph only — hides data rows from graph preview
    // Level 0 (optional root entry node)
    level0Enabled: boolean;
    level0Id: string;
    // Level 1 options (navigation between dimension nodes, via parentOptions.level1Options)
    level1Extents: 'circular' | 'terminal';
    level1NavForwardName: string;
    level1NavForwardKey: string;
    level1NavBackwardName: string;
    level1NavBackwardKey: string;
    // Label templates for all levels — editable in SchemaPanel; copied from prepState on Prep→Editor transition
    labelConfig: LabelConfig;
}

export interface UploadedDataRaw {
    filename: string;
    content: string;
}

export interface InputConfig {
    enableKeyboard: boolean; // default: true
    enableSwitch: boolean; // default: false
    enableTextInput: boolean; // default: false
}

export interface RenderConfig {
    positionUnit: 'px' | '%';
    showOverlay: boolean;
    semanticNames: string[]; // user-defined name options for the name dropdown
}

export interface ToolOptions {
    showNodeLabels: boolean;
    nodeLabelColor: string;
    nodeLabelOutlineColor: string;
    showEdgeLabels: boolean;
    edgeLabelColor: string;
    edgeLabelOutlineColor: string;
    showLevel0Node: boolean;
    showLevel1Nodes: boolean;
    showLevel2Nodes: boolean;
    showEdges: boolean;
    edgeColor: string;
    edgeTypeColors: Record<string, string>;
    hiddenEdgeTypes: string[];
    showAllNodes: boolean;
    nodeBackfillColor: string;
    level0BackfillColor: string;
    level1BackfillColor: string;
    level2BackfillColor: string;
    showLevel3Nodes: boolean;
    level3BackfillColor: string;
}

export interface VariableMeta {
    key: string;
    type: 'numerical' | 'categorical';
    isId: boolean; // true if this is the unique ID column
    isDimension: boolean; // true once "Create dimension" is confirmed via Q/A
    removed: boolean; // true if user clicked "remove variable"
}

export interface FormulaToken {
    kind:
        | 'field_row'
        | 'field_sum'
        | 'field_mean'
        | 'count_all'
        | 'count_cat'
        | 'literal_num'
        | 'literal_str'
        | 'op'
        | 'if_cond';
    value: string; // field name, operator symbol, or literal value
    catValue?: string; // only for 'count_cat': the specific CAT value being counted
}

export interface ComputedVariable {
    key: string; // new column name
    tokens: FormulaToken[]; // formula as flat token array (evaluate left-to-right; if_cond splits into condition/then/else)
}

export interface LabelTemplate {
    template: string; // {key:"fieldName"} / {value:"fieldName"} syntax (same as PropertiesPanel)
    name: string; // noun: "data point", "bar", etc.
    includeIndex: boolean; // append "X of Y"
    includeParentName: boolean; // append "in [parent]" (used by dim/div builders)
    omitKeyNames: boolean; // suppress {key:"..."} tokens in output; corresponds to DN's omitKeyNames
    includeDimensionName?: boolean; // division (level2): append "in {dimKey} {dimNoun}" to label suffix
    includeParentNames?: string[]; // leaf (level3): dimension keys whose "dim name" to append to suffix
    includeParentDivisions?: string[]; // leaf (level3): dimension keys whose "subgroup position" to append to suffix
}

export interface LabelConfig {
    level0: LabelTemplate;
    perDimension: Record<string, LabelTemplate>; // key = dimension column name, for level1 labels
    perDivision: Record<string, LabelTemplate>; // key = dimension column name, for level2 labels
    leaves: LabelTemplate;
}

export type QAChapterId = 'top-level-access' | 'dimensions' | 'navigation' | 'leaf-node-patterns';

export interface QAChapterState {
    id: QAChapterId;
    completed: boolean;
    answers: Record<string, unknown>; // questionId → answer value
    invalidated: boolean; // true if a parent answer changed and this chapter needs re-validation
}

export interface QAProgress {
    currentChapterId: QAChapterId;
    currentQuestionId: string;
    chapters: QAChapterState[];
    invalidatedQuestions: string[]; // ids of downstream Q's that need re-answering (shown with ❌)
}

export interface PrepState {
    hasRun: boolean; // true once user has answered at least Chapter 1 fully
    variables: VariableMeta[];
    customVariables: ComputedVariable[];
    customData: Record<string, unknown>[] | null; // rows created via CreateDataWizard
    qaProgress: QAProgress;
    labelConfig: LabelConfig;
}

// --- Group shape types ---

export interface BonusRect {
    enabled: boolean;
    x: number;
    y: number;
    width: number;
    height: number;
}

/**
 * Per-dimension outline configuration. Covers the dimension node's own path
 * AND the strategy for all of its division nodes.
 * When absent for a given dimensionKey, groupShapes.ts fills in type-based defaults.
 */
export interface DimensionGroupConfig {
    strategy: 'convexHull' | 'unionOfAll';
    padding: number;
    divisionStrategy: 'convexHull' | 'unionOfAll' | 'rangeBounds' | 'rangeRect';
    divisionPadding: number;
}

export interface GroupShapeConfig {
    // Root node (level 0)
    rootEnabled: boolean;
    rootStrategy: 'convexHull' | 'unionOfAll' | 'boundingRect';
    rootPadding: number; // px — ignored when rootBoundingRectOverride is set
    // Manual override: when set, used directly instead of auto-computing from leaves.
    // Set by drag handles or x/y/w/h inputs. Clear to revert to auto.
    rootBoundingRectOverride?: { x: number; y: number; width: number; height: number };

    // Global enable toggles for dimension / division levels
    dimensionEnabled: boolean;
    divisionEnabled: boolean;

    // Per-dimension config — key is dimensionKey (field name, e.g. 'species').
    // Falls back to type-based defaults when absent for a key.
    perDimension: Record<string, DimensionGroupConfig>;

    // Bonus rects — keyed by dimensionKey (dimension) and division node id (division)
    dimensionBonusRects: Record<string, BonusRect>;
    divisionBonusRects: Record<string, BonusRect>;
}

// --- Scaffold mode types ---

export interface ScaffoldMarkParams {
    // Bar / stacked-bar / clustered-bar
    barInnerPadding?: number; // 0–1, maps to Vega-Lite bandPaddingInner
    barOuterPadding?: number; // 0–1
    groupPadding?: number; // clustered-bar only: spacing between cluster groups
    // Scatter / line points
    pointSize?: number; // mark area in px², maps to Vega-Lite size (default 30)
    pointSizeField?: string; // if set, Vega uses this column for size encoding (scatter only)
    // Line / area
    strokeWidth?: number; // px
    showPoints?: boolean; // render point marks at each data point
    fillOpacity?: number; // area only: fill opacity 0–1
}

export interface SyntheticDataConfig {
    categories: string[]; // category values for the primary x-axis dimension
    seriesNames?: string[]; // for stacked / clustered / line (multiple series)
    xField: string; // field name used for x channel in the Vega-Lite spec
    yField: string; // field name used for y channel (all values = 1 in synthetic data)
    colorField?: string; // field name for series/color channel
}

export interface ScaffoldConfig {
    chartType: string; // matches Q/A engine chart-type values (e.g. 'bar', 'scatter', 'line')

    // Chart origin in image coordinate space — dragging the bounding box handle updates these
    offsetX: number;
    offsetY: number;

    // Plot area dimensions → Vega-Lite width/height
    plotWidth: number;
    plotHeight: number;

    // Axis space → Vega-Lite padding object (space reserved for axis labels/ticks)
    paddingLeft: number;
    paddingTop: number;
    paddingRight: number;
    paddingBottom: number;

    // Chart-type specific mark rendering params
    markParams: ScaffoldMarkParams;

    // Data source
    dataMode: 'csv' | 'synthetic';
    syntheticConfig?: SyntheticDataConfig; // populated when dataMode === 'synthetic'
    // When dataMode === 'csv', vegaBuilder reads appState.uploadedData

    // Channel field mappings — seeded from schemaState.dimensions on scaffold init,
    // stored here so the user can later override them without changing the schema.
    xField?: string; // column name for x channel
    yField?: string; // column name for y channel (quantitative value)
    colorField?: string; // column name for color/series channel (stacked, clustered, line)

    // Visual sort order for the categorical axis — independent of navigation order set in Prep.
    // 'none' = data insertion order, 'ascending' = A→Z / low→high, 'descending' = Z→A / high→low
    sortX?: 'none' | 'ascending' | 'descending';

    // Scatter axis domain overrides — when set, Vega uses these as the scale extent instead of
    // computing from the data. Useful when the image's axis range differs from the data extent
    // (e.g. the chart is padded to 4.0–8.5 but data only spans 4.3–7.9). zero is always false
    // for scatter regardless of these settings.
    xDomainMin?: number;
    xDomainMax?: number;
    yDomainMin?: number;
    yDomainMax?: number;

    // Bar chart orientation (bar / stacked-bar / clustered-bar only). Default: 'vertical'.
    barOrientation?: 'vertical' | 'horizontal';

    // Group shape outlines for level 0/1/2 nodes — computed from leaf node positions
    groupShapes?: GroupShapeConfig;
}

export interface AppState {
    currentStep: number; // 0–4
    // Step 0 — Upload
    imageDataUrl: string | null;
    imageWidth: number | null;
    imageHeight: number | null;
    uploadedData: Record<string, unknown>[] | null;
    uploadedDataRaw: UploadedDataRaw | null;
    // Step 2 — Editor
    nodes: Map<string, SkeletonNode>;
    edges: Map<string, SkeletonEdge>;
    selectedNodeIds: Set<string>;
    selectedEdgeIds: Set<string>;
    entryNodeId: string | null;
    hoveredNodeId: string | null; // linked hover between schema and canvas
    hoveredEdgeId: string | null;
    // Step 2 — Editor schema (data-driven graph)
    schemaState: SchemaState;
    // Archived (Input / Render steps) — retained for save-file compatibility
    inputConfig: InputConfig;
    renderConfig: RenderConfig;
    // Tool options (canvas visibility controls)
    toolOptions: ToolOptions;
    // Step 1 — Prep
    prepState: PrepState | null; // null = prep hasn't been started
    // Conflict tracking
    hasManualNodeEdits: boolean; // true once user has manually edited any schema-generated node/edge
    // Scaffold mode (Step 2 — Editor)
    scaffoldConfig: ScaffoldConfig | null; // null until first scaffold setup
    scaffoldModeActive: boolean; // true when scaffold toolbar panel is open
    // Raw DN structure from SchemaPanel — stored as the canonical navigation structure.
    // The testing page reads this directly rather than reconstructing via toStructure(),
    // which cannot reproduce the per-node edge membership set by the DN library.
    dnStructure: Record<string, unknown> | null;
}

export const DEFAULT_APP_STATE: AppState = {
    currentStep: 0,
    imageDataUrl: null,
    imageWidth: null,
    imageHeight: null,
    uploadedData: null,
    uploadedDataRaw: null,
    nodes: new Map<string, SkeletonNode>(),
    edges: new Map<string, SkeletonEdge>(),
    selectedNodeIds: new Set<string>(),
    selectedEdgeIds: new Set<string>(),
    entryNodeId: null,
    hoveredNodeId: null,
    hoveredEdgeId: null,
    schemaState: {
        dimensions: [],
        childmostNavigation: 'within',
        allowMoreThan3: false,
        collapsed: false,
        graphMode: 'tree',
        hideLeafNodes: false,
        level0Enabled: false,
        level0Id: 'root',
        level1Extents: 'terminal',
        level1NavForwardName: 'left',
        level1NavForwardKey: 'ArrowLeft',
        level1NavBackwardName: 'right',
        level1NavBackwardKey: 'ArrowRight',
        labelConfig: {
            level0: { template: '', name: 'root', includeIndex: false, includeParentName: false, omitKeyNames: false },
            perDimension: {},
            perDivision: {},
            leaves: {
                template: '',
                name: 'data point',
                includeIndex: false,
                includeParentName: false,
                omitKeyNames: false
            }
        }
    },
    inputConfig: {
        enableKeyboard: true,
        enableSwitch: false,
        enableTextInput: false
    },
    renderConfig: {
        positionUnit: 'px',
        showOverlay: false,
        semanticNames: ['data point', 'node']
    },
    toolOptions: {
        showNodeLabels: true,
        nodeLabelColor: '#000000',
        nodeLabelOutlineColor: '#ffffff',
        showEdgeLabels: false,
        edgeLabelColor: '#000000',
        edgeLabelOutlineColor: '#ffffff',
        showLevel0Node: true,
        showLevel1Nodes: true,
        showLevel2Nodes: true,
        showEdges: true,
        edgeColor: '#949494',
        edgeTypeColors: {},
        hiddenEdgeTypes: [],
        showAllNodes: true,
        nodeBackfillColor: '#ffffff',
        level0BackfillColor: '#ffffff',
        level1BackfillColor: '#ffffff',
        level2BackfillColor: '#ffffff',
        showLevel3Nodes: true,
        level3BackfillColor: '#ffffff'
    },
    prepState: null,
    hasManualNodeEdits: false,
    scaffoldConfig: null,
    scaffoldModeActive: false,
    dnStructure: null
};

export const appState = writable<AppState>({ ...DEFAULT_APP_STATE });
