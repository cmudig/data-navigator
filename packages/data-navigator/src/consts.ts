import type { DatumObject, CommandObject, NavigationRules, RenderObject, NavId } from './data-navigator';

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
    Escape: 'drill-out',
    Enter: 'drill-in'
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
    'drill-in': {
        key: 'Enter',
        direction: 'target'
    },
    'drill-out': {
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
    'drill-out': ['drill-out', 'drill-in'],
    'drill-in': ['drill-out', 'drill-in'],
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
    'drill-in': {
        key: 'Enter',
        direction: 'target'
    },
    'drill-out': {
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

export const GenericNavigationRuleCommands: Record<NavId, CommandObject> = {
    'drill-in': { label: 'Enter', description: 'Drill in' },
    'drill-out': { label: 'Backspace', description: 'Drill out' },
    exit: { label: 'Esc', description: 'Exit' },
    left: { label: '←', description: 'Previous data point' },
    right: { label: '→', description: 'Next data point' },
    up: { label: '↑', description: 'Previous data point' },
    down: { label: '↓', description: 'Next data point' },
    backward: { label: ',', description: 'Move backward' },
    forward: { label: '.', description: 'Move forward' },
    previous: { label: ';', description: 'Previous' },
    next: { label: "'", description: 'Next' },
    undo: { label: 'Z', description: 'Undo' },
    help: { label: 'Y', description: 'Help' },
    legend: { label: 'L', description: 'Legend' }
};

export const commandsTableDefaultColumns = [
    { label: 'Command', id: 'description' },
    { label: 'Key', id: 'label' }
];
