export const defaultKeyBindings = {
    ArrowLeft: 'left',
    ArrowRight: 'right',
    ArrowUp: 'up',
    ArrowDown: 'down',
    Period: 'forward',
    Comma: 'backward',
    Escape: 'parent',
    Enter: 'child'
} as DatumObject;

export const GenericFullNavigationRules = {
    down: {
        keyCode: 'ArrowDown',
        direction: 'target'
    },
    left: {
        keyCode: 'ArrowLeft',
        direction: 'source'
    },
    right: {
        keyCode: 'ArrowRight',
        direction: 'target'
    },
    up: {
        keyCode: 'ArrowUp',
        direction: 'source'
    },
    backward: {
        keyCode: 'Comma',
        direction: 'source'
    },
    child: {
        keyCode: 'Enter',
        direction: 'target'
    },
    parent: {
        keyCode: 'Backspace',
        direction: 'source'
    },
    forward: {
        keyCode: 'Period',
        direction: 'target'
    },
    exit: {
        keyCode: 'Escape',
        direction: 'target'
    }
} as NavigationRules;

export const GenericLimitedNavigationRules = {
    right: {
        key: 'ArrowRight',
        direction: 'target'
    },
    left: {
        key: 'ArrowLeft',
        direction: 'source'
    },
    down: {
        key: 'ArrowDown',
        direction: 'target'
    },
    up: {
        key: 'ArrowUp',
        direction: 'source'
    },
    child: {
        key: 'Enter',
        direction: 'target'
    },
    parent: {
        key: 'Backspace',
        direction: 'source'
    },
    exit: {
        key: 'Escape',
        direction: 'target'
    },
    undo: {
        key: 'Period',
        direction: 'target'
    },
    legend: {
        key: 'KeyL',
        direction: 'target'
    }
} as NavigationRules;

export const NodeElementDefaults = {
    cssClass: '',
    dimensions: {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        path: ''
    },
    semantics: {
        label: '',
        elementType: 'div',
        role: 'image',
        attributes: undefined
    },
    parentSemantics: {
        label: '',
        elementType: 'figure',
        role: 'figure',
        attributes: undefined
    },
    existingElement: {
        useForDimensions: false,
        dimensions: undefined
    }
} as RenderObject;
