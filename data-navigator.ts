// StructureOptions is still under development!
// Our next major step is to build functions to automatically produce Structure
type StructureOptions = {
    [key: string | number]: any
}

type InputOptions = {
    structure: Structure,
    navigationRules: NavigationRules,
    entryPoint?: NodeId,
    exitPoint?: RenderId
}

type RenderingOptions = {
    elementData: ElementData | Nodes,
    suffixId: string,
    root: RootObject,
    defaults?: RenderObject,
    entryButton?: EntryObject,
    exitElement?: ExitObject
}

type Structure = {
    nodes: Nodes,
    edges: Edges,
    navigationRules?: NavigationRules,
    elementData?: ElementData
}

type Nodes = Record<NodeId, NodeObject>
type Edges = Record<EdgeId, EdgeObject>
type NavigationRules = Record<NavId, NavObject>
type ElementData = Record<RenderId, RenderObject>

type EdgeList = Array<EdgeId>
type NavigationList = Array<NavId>

type Semantics = ((RenderObject?,DatumObject?) => SemanticsObject) | SemanticsObject
type Dimensions = ((RenderObject?,DatumObject?) => DimensionsObject) | DimensionsObject
type Attributes = ((RenderObject?,DatumObject?) => AttributesObject) | AttributesObject

type NodeObject = {
    id: NodeId,
    edges: EdgeList,
    renderId?: RenderId,
    [key: string | number]: any // NodeObjects can be lazily used as generic objects (like ElementObjects) too
}

type EdgeObject = {
    source: (() => EdgeId) | EdgeId;
    target: (() => EdgeId) | EdgeId;
    navigationRules: NavigationList;
}

type NavObject = {
    direction: Direction;
    key?: string;
}

type RenderObject = {
    cssClass?: DynamicString,
    dimensions?: Dimensions,
    semantics?: Semantics,
    parentSemantics?: Semantics,
    existingElement?: ExistingElement,
    showText?: boolean
}

type RootObject = {
    id: string,
    cssClass?: string,
    description?: string,
    width?: string | number,
    height?: string | number
}

type EntryObject = {
    include: boolean,
    callbacks?: EntryCallbacks
}

type ExitObject = {
    include: boolean,
    callbacks?: ExitCallbacks
}

type SemanticsObject = {
    label?: DynamicString,
    elementType?: DynamicString,
    role?: DynamicString,
    attributes?: Attributes
}

type DimensionsObject = {
    x?: DynamicNumber,
    y?: DynamicNumber,
    width?: DynamicNumber,
    height?: DynamicNumber,
    path?: DynamicString
}

type DescriptionOptions = {
    omitKeyNames?: boolean,
    semanticLabel?: string
}

type ExistingElement = {
    useForDimensions: boolean,
    dimensions?: Dimensions
}

type EntryCallbacks = {
    focus?: Function,
    click?: Function
}

type ExitCallbacks = {
    focus?: Function,
    blur?: Function
}

type DatumObject = {
    [key: string | number]: any
}

type AttributesObject = {
    [key: string]: string
}

type DynamicNumber = ((RenderObject?,DatumObject?) => number) | number

type DynamicString = ((RenderObject?,DatumObject?) => string) | string

type NodeId = string

type EdgeId = string

type RenderId = string

type NavId = string

type Direction = "target" | "source"
