// StructureOptions is still under development!
// Our next major step is to build functions to automatically produce Structure
export type StructureOptions = {
    [key: string | number]: any
}

export type InputOptions = {
    structure: Structure,
    navigationRules: NavigationRules,
    entryPoint?: NodeId,
    exitPoint?: RenderId
}

export type RenderingOptions = {
    elementData: ElementData | Nodes,
    suffixId: string,
    root: RootObject,
    defaults?: RenderObject,
    entryButton?: EntryObject,
    exitElement?: ExitObject
}

export type Structure = {
    nodes: Nodes,
    edges: Edges,
    navigationRules?: NavigationRules,
    elementData?: ElementData
}

export type Nodes = Record<NodeId, NodeObject>
export type Edges = Record<EdgeId, EdgeObject>
export type NavigationRules = Record<NavId, NavObject>
export type ElementData = Record<RenderId, RenderObject>

export type EdgeList = Array<EdgeId>
export type NavigationList = Array<NavId>

export type Semantics = ((RenderObject?,DatumObject?) => SemanticsObject) | SemanticsObject
export type Dimensions = ((RenderObject?,DatumObject?) => DimensionsObject) | DimensionsObject
export type Attributes = ((RenderObject?,DatumObject?) => AttributesObject) | AttributesObject

export type NodeObject = {
    id: NodeId,
    edges: EdgeList,
    renderId?: RenderId,
    [key: string | number]: any // NodeObjects can be lazily used as generic objects (like ElementObjects) too
}

export type EdgeObject = {
    source: (() => EdgeId) | EdgeId;
    target: (() => EdgeId) | EdgeId;
    navigationRules: NavigationList;
}

export type NavObject = {
    direction: Direction;
    key?: string;
}

export type RenderObject = {
    cssClass?: DynamicString,
    dimensions?: Dimensions,
    semantics?: Semantics,
    parentSemantics?: Semantics,
    existingElement?: ExistingElement,
    showText?: boolean
}

export type RootObject = {
    id: string,
    cssClass?: string,
    description?: string,
    width?: string | number,
    height?: string | number
}

export type EntryObject = {
    include: boolean,
    callbacks?: EntryCallbacks
}

export type ExitObject = {
    include: boolean,
    callbacks?: ExitCallbacks
}

export type SemanticsObject = {
    label?: DynamicString,
    elementType?: DynamicString,
    role?: DynamicString,
    attributes?: Attributes
}

export type DimensionsObject = {
    x?: DynamicNumber,
    y?: DynamicNumber,
    width?: DynamicNumber,
    height?: DynamicNumber,
    path?: DynamicString
}

export type DescriptionOptions = {
    omitKeyNames?: boolean,
    semanticLabel?: string
}

export type ExistingElement = {
    useForDimensions: boolean,
    dimensions?: Dimensions
}

export type EntryCallbacks = {
    focus?: Function,
    click?: Function
}

export type ExitCallbacks = {
    focus?: Function,
    blur?: Function
}

export type DatumObject = {
    [key: string | number]: any
}

export type AttributesObject = {
    [key: string]: string
}

export type DynamicNumber = ((RenderObject?,DatumObject?) => number) | number

export type DynamicString = ((RenderObject?,DatumObject?) => string) | string

export type NodeId = string

export type EdgeId = string

export type RenderId = string

export type NavId = string

export type Direction = "target" | "source"
