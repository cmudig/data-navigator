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
    includeParentName: boolean; // append "in [parent]"
    omitKeyNames: boolean; // suppress {key:"..."} tokens in output; corresponds to DN's omitKeyNames
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
        level1NavBackwardKey: 'ArrowRight'
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
    prepState: null
};

export const appState = writable<AppState>({ ...DEFAULT_APP_STATE });
