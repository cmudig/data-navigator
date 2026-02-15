import type { DatumObject, NavigationRules, RenderObject } from './data-navigator';

export const SemanticKeys = {
    Escape: true,
    Enter: true,
    Backspace: true,
    ArrowLeft: true,
    ArrowRight: true,
    ArrowUp: true,
    ArrowDown: true
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
} as DatumObject;

export const TypicallyUnreservedKeys = ['KeyW', 'KeyJ', 'LeftBracket', 'RightBracket', 'Slash', 'Backslash'];

export const TypicallyUnreservedSoloKeys = ['KeyW', 'KeyJ'];

export const TypicallyUnreservedKeyPairs = [
    ['LeftBracket', 'RightBracket'],
    ['Slash', 'Backslash']
];

export const GenericFullNavigationRules = {
    left: {
        key: 'ArrowLeft',
        direction: 'source'
    },
    right: {
        key: 'ArrowRight',
        direction: 'target'
    },
    up: {
        key: 'ArrowUp',
        direction: 'source'
    },
    down: {
        key: 'ArrowDown',
        direction: 'target'
    },
    child: {
        key: 'Enter',
        direction: 'target'
    },
    parent: {
        key: 'Backspace',
        direction: 'source'
    },
    backward: {
        key: 'Comma',
        direction: 'source'
    },
    forward: {
        key: 'Period',
        direction: 'target'
    },
    previous: {
        key: 'Semicolon',
        direction: 'source'
    },
    next: {
        key: 'Quote',
        direction: 'target'
    },
    exit: {
        key: 'Escape',
        direction: 'target'
    },
    help: {
        key: 'KeyY',
        direction: 'target'
    },
    undo: {
        key: 'KeyZ',
        direction: 'target'
    }
} as NavigationRules;

export const GenericFullNavigationDimensions = [
    ['left', 'right'],
    ['up', 'down'],
    ['backward', 'forward'],
    ['previous', 'next']
];
export const GenericFullNavigationPairs = {
    left: ['left', 'right'],
    right: ['left', 'right'],
    up: ['up', 'down'],
    down: ['up', 'down'],
    backward: ['backward', 'forward'],
    forward: ['backward', 'forward'],
    previous: ['previous', 'next'],
    next: ['previous', 'next'],
    parent: ['parent', 'child'],
    child: ['parent', 'child'],
    exit: ['exit', 'undo'],
    undo: ['undo', 'undo']
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
} as NavigationRules;

export const NodeElementDefaults = {
    cssClass: undefined,
    spatialProperties: {
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
        useForSpatialProperties: false,
        spatialProperties: undefined
    }
} as RenderObject;
