// StructureOptions is still under development!
// Our next major step is to build functions to automatically produce Structure
export type StructureOptions = {
    data: GenericDataset;
    idKey: DynamicNodeIdKey;
    keys: KeyList;
    renderIdKey?: DynamicRenderIdKey;
    dimensions?: DimensionOptions;
    genericEdges?: EdgeOptions;
    dataType?: DataType;
    addIds?: boolean;
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

export type NodeArray = Array<NodeObject>;
export type EdgeList = Array<EdgeId>;
export type GenericDataset = Array<DatumObject>;
export type NavigationList = Array<NavId>;
export type DimensionOptions = Array<DimensionDatum>;
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
    derivedNode?: boolean;
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

export type DimensionObject = {
    values: NodeArray;
    dimensionKey: DimensionKey;
    type?: DimensionType;
    behavior?: DimensionBehavior;
    navigationRules?: NavigationList;
    sortingFunction?: SortingFunction;
};

export type DimensionDatum = {
    dimensionKey: DimensionKey;
    nestedSettings: NestedSettings;
    type?: DimensionType;
    behavior?: DimensionBehavior;
    navigationRules?: NavigationList;
    sortingFunction?: SortingFunction;
};

export type NestedSettings = {
    nested: boolean;
    derivedParent?: boolean;
    parentNode?: NestedParent;
};

export type NestedParent = {
    id: DynamicNodeId;
    rendering: ParentRendering;
};

export type ParentRendering = {
    renderId: RenderId;
    strategy: RenderingStrategy;
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
    bridgePrevious?: NodeId;
    bridgePost?: NodeId;
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

export type SortingFunction = (a: DatumObject, b: DatumObject, c?: DimensionObject) => boolean;

export type ConditionalFunction = (n: NodeObject, d: EdgeDatum) => boolean;

export type NodeId = string;

export type EdgeId = string;

export type RenderId = string;

export type NavId = string;

export type DimensionKey = string;

export type Direction = 'target' | 'source';

export type RenderingStrategy = 'outlineEach' | 'convexHull' | 'singleSquare' | 'custom'; // this has yet to be implemented!

export type DimensionType = 'numerical' | 'categorical';

export type ExtentType = 'circular' | 'terminal' | 'bridged';

export type DataType = 'vega-lite' | 'vl' | 'Vega-Lite' | 'generic' | 'default';
