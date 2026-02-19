export type StructureOptions = {
    data: GenericDataset;
    idKey: DynamicNodeIdKey;
    renderIdKey?: DynamicRenderIdKey;
    dimensions?: DimensionOptions;
    genericEdges?: EdgeOptions;
    useDirectedEdges?: boolean;
    dataType?: DataType;
    addIds?: boolean;
    keysForIdGeneration?: KeyList;
    navigationRules?: NavigationRules;
};

export type InputOptions = {
    structure: Structure;
    navigationRules: NavigationRules;
    entryPoint?: NodeId;
    exitPoint?: RenderId;
};

export type RenderingOptions = {
    elementData: ElementData | Nodes;
    suffixId: string;
    root: RootObject;
    defaults?: RenderObject;
    entryButton?: EntryObject;
    exitElement?: ExitObject;
};

export type DimensionOptions = {
    values: DimensionList;
    parentOptions?: {
        level1Options?: {
            order: AddOrReferenceNodeList;
            behavior?: Level1Behavior;
            navigationRules?: DimensionNavigationRules;
        };
        addLevel0?: NodeObject;
    };
    adjustDimensions?: AdjustingFunction;
};

export type Structure = {
    nodes: Nodes;
    edges: Edges;
    dimensions?: Dimensions;
    navigationRules?: NavigationRules;
    elementData?: ElementData;
};

export type Nodes = Record<NodeId, NodeObject>;
export type Edges = Record<EdgeId, EdgeObject>;
export type Dimensions = Record<DimensionKey, DimensionObject>;
export type NavigationRules = Record<NavId, NavObject>;
export type ElementData = Record<RenderId, RenderObject>;
export type DimensionDivisions = Record<NodeId, DivisionObject>;

export type AddOrReferenceNodeList = Array<NodeToAddOrReference>;
export type EdgeList = Array<EdgeId>;
export type GenericDataset = Array<DatumObject>;
export type NavigationList = Array<NavId>;
export type DimensionNavigationPair = [NavId, NavId];
export type NumericalExtentsPair = [number, number];
export type DimensionList = Array<DimensionDatum>;
export type EdgeOptions = Array<EdgeDatum>;
export type KeyList = Array<string>;

export type Semantics = ((RenderObject?, DatumObject?) => SemanticsObject) | SemanticsObject;
export type SpatialProperties = ((RenderObject?, DatumObject?) => SpatialObject) | SpatialObject;
export type Attributes = ((RenderObject?, DatumObject?) => AttributesObject) | AttributesObject;

export type NodeObject = {
    id: NodeId;
    edges: EdgeList;
    renderId?: RenderId;
    renderingStrategy?: RenderingStrategy;
    derivedNode?: DerivedNode;
    dimensionLevel?: DimensionLevel;
    [key: string | number]: any; // NodeObjects can be lazily used as generic objects (like ElementObjects) too
};

export type EdgeObject = {
    source: (() => NodeId) | NodeId;
    target: (() => NodeId) | NodeId;
    navigationRules: NavigationList;
    edgeId?: EdgeId;
};

export type EdgeDatum = {
    edgeId: EdgeId;
    edge: EdgeObject;
    conditional?: ConditionalFunction;
};

// output
export type DimensionObject = {
    nodeId: NodeId;
    dimensionKey: DimensionKey;
    divisions: DimensionDivisions;
    operations: {
        compressSparseDivisions: boolean; // if no division more than 1 child, create 1 division with all children, runs after filtering and sorting
        sortFunction?: SortingFunction; // by default sorts numerical in ascending, does not sort categorical
    };
    behavior?: DimensionBehavior;
    navigationRules?: DimensionNavigationRules;
    type?: DimensionType;
    numericalExtents?: NumericalExtentsPair;
    subdivisions?: NumericallySubdivide;
    divisionOptions?: DivisionOptions;
};

// input
export type DimensionDatum = {
    dimensionKey: DimensionKey;
    behavior?: DimensionBehavior;
    navigationRules?: DimensionNavigationRules;
    type?: DimensionType;
    operations?: DimensionOperations;
    nodeId?: DynamicDimensionId;
    renderId?: DynamicDimensionRenderId;
    renderingStrategy?: RenderingStrategy;
    divisionOptions?: DivisionOptions;
};

export type DimensionNavigationRules = {
    sibling_sibling: DimensionNavigationPair;
    parent_child: DimensionNavigationPair;
};

export type DivisionOptions = {
    sortFunction?: SortingFunction; // by default does not sort
    divisionNodeIds?: (dimensionKey: DimensionKey, keyValue: any, i: number) => string;
    divisionRenderIds?: (dimensionKey: DimensionKey, keyValue: any, i: number) => string;
    renderingStrategy?: RenderingStrategy;
};

export type DimensionOperations = {
    filterFunction?: FilteringFunction;
    sortFunction?: SortingFunction; // by default sorts numerical in ascending, does not sort categorical
    createNumericalSubdivisions?: NumericallySubdivide; // (if not set, defaults to 1)
    compressSparseDivisions?: boolean; // if no division more than 1 child, create 1 division with all children, runs after filtering and sorting
};

export type DivisionObject = {
    id: NodeId;
    values: Nodes;
    sortFunction?: SortingFunction; // by default does not sort
};

export type NavObject = {
    direction: Direction;
    key?: string;
};

export type RenderObject = {
    cssClass?: DynamicString;
    spatialProperties?: SpatialProperties;
    semantics?: Semantics;
    parentSemantics?: Semantics;
    existingElement?: ExistingElement;
    showText?: boolean;
};

export type RootObject = {
    id: string;
    cssClass?: string;
    description?: string;
    width?: string | number;
    height?: string | number;
};

export type EntryObject = {
    include: boolean;
    callbacks?: EntryCallbacks;
};

export type ExitObject = {
    include: boolean;
    callbacks?: ExitCallbacks;
};

export type SemanticsObject = {
    label?: DynamicString;
    elementType?: DynamicString;
    role?: DynamicString;
    attributes?: Attributes;
};

export type SpatialObject = {
    x?: DynamicNumber;
    y?: DynamicNumber;
    width?: DynamicNumber;
    height?: DynamicNumber;
    path?: DynamicString;
};

export type DimensionBehavior = {
    extents: ExtentType;
    customBridgePrevious?: NodeId;
    customBridgePost?: NodeId;
    childmostNavigation?: ChildmostNavigationStrategy;
    childmostMatching?: ChildmostMatchingStrategy;
};

export type Level1Behavior = {
    extents: Level0ExtentType;
    customBridgePrevious?: NodeId;
    customBridgePost?: NodeId;
};

export type DescriptionOptions = {
    omitKeyNames?: boolean;
    semanticLabel?: string;
};

export type ExistingElement = {
    useForSpatialProperties: boolean;
    spatialProperties?: SpatialProperties;
};

export type EntryCallbacks = {
    focus?: Function;
    click?: Function;
};

export type ExitCallbacks = {
    focus?: Function;
    blur?: Function;
};

export type DatumObject = {
    [key: string | number]: any;
};

export type AttributesObject = {
    [key: string]: string;
};

export type DynamicNumber = ((r?: RenderObject, d?: DatumObject) => number) | number;

export type DynamicString = ((r?: RenderObject, d?: DatumObject) => string) | string;

export type DynamicNodeId = ((d?: DatumObject, dim?: DimensionDatum) => NodeId) | NodeId;

export type DynamicRenderId = ((d?: DatumObject) => RenderId) | RenderId;

export type DynamicNodeIdKey = ((d?: DatumObject) => string) | string;

export type DynamicRenderIdKey = ((d?: DatumObject) => string) | string;

export type DynamicDimensionId = ((d?: DimensionDatum, a?: GenericDataset) => NodeId) | NodeId;

export type DynamicDimensionRenderId = ((d?: DimensionDatum, a?: GenericDataset) => RenderId) | RenderId;

export type NumericallySubdivide = ((d?: DimensionKey, n?: Nodes) => number) | number;

export type ChildmostMatchingStrategy = (
    index?: number,
    currentDivisionChild?: DatumObject,
    currentDivision?: DivisionObject,
    nextDivision?: DivisionObject
) => DatumObject | undefined;

export type AdjustingFunction = (d: Dimensions) => Dimensions;

export type SortingFunction = (a: DatumObject, b: DatumObject, c?: any) => number;

export type FilteringFunction = (a: DatumObject, b?: any) => boolean;

export type ConditionalFunction = (n: NodeObject, d: EdgeDatum) => boolean;

export type NodeId = string;

export type EdgeId = string;

export type RenderId = string;

export type NavId = string;

export type DimensionId = string;

export type DimensionKey = string;

export type NodeToAddOrReference = NodeObject | NodeId;

export type Direction = 'target' | 'source';

export type RenderingStrategy = 'outlineEach' | 'convexHull' | 'singleSquare' | 'custom'; // this has yet to be implemented!

export type DimensionType = 'numerical' | 'categorical';

export type ExtentType = 'circular' | 'terminal' | 'bridgedCousins' | 'bridgedCustom';

export type ChildmostNavigationStrategy = 'within' | 'across';

export type Level0ExtentType = 'circular' | 'terminal' | 'bridgedCustom';

export type DataType = 'vega-lite' | 'vl' | 'Vega-Lite' | 'generic' | 'default';

export type DimensionLevel = 0 | 1 | 2 | 3;

export type DerivedNode = string;

export type LLMMessage = {
    role: 'user' | 'assistant' | 'system';
    content: string;
};

export type TextChatOptions = {
    structure: Structure;
    container: string | HTMLElement;
    entryPoint?: NodeId;
    describeNode?: (node: NodeObject) => string;
    commandLabels?: Record<string, string>;
    onNavigate?: (node: NodeObject) => void;
    onExit?: () => void;
    llm?: (messages: LLMMessage[]) => Promise<string | null>;
    data?: Record<string, unknown>[];
};

export type TextChatInstance = {
    destroy: () => void;
    getCurrentNode: () => NodeObject | null;
};
