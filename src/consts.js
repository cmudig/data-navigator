export const keyCodes = {
    parent: 27, // ESCAPE
    child: 13, // ENTER
    select: 32, // SPACEBAR
    nextSibling: 39, // RIGHT ARROW
    previousSibling: 37, // LEFT ARROW
    nextCousin: 40, // DOWN ARROW
    previousCousin: 38, // UP ARROW
    nextCousinAlternate: 190, // PERIOD
    previousCousinAlternate: 188, // COMMA
    shift: 16, // SHIFT
    tab: 9 // TAB
};

export const defaultKeyBindings = {
    ArrowLeft: 'left',
    ArrowRight: 'right',
    ArrowUp: 'up',
    ArrowDown: 'down',
    Period: 'forward',
    Comma: 'backward',
    Escape: 'parent',
    Enter: 'child'
};

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
};

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
}

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
};
