import { dataNavigator, describeNode } from './data-navigator';

// input data
// extracted from https://www.highcharts.com/demo/column-stacked
let nodes = {
    title: {
        d: {
            title: 'Major Trophies for some English teams'
        },
        x: 12,
        y: 9,
        width: 686,
        height: 56,
        id: 'title',
        cssClass: 'dn-test-class',
        edges: ['any-return', 'any-exit', 'title-legend'],
        description: 'Major Trophies for some English teams'
    },
    legend: {
        d: {
            legend: 'Contests Included: BPL, FA Cup, CL'
        },
        x: 160,
        y: 162,
        width: 398,
        height: 49,
        id: 'legend',
        cssClass: 'dn-test-class',
        edges: ['any-return', 'any-exit', 'title-legend', 'legend-y_axis', 'legend-bpl'],
        description: 'Legend. Contests Included: BPL, FA Cup, CL. Press Enter to explore these contests.'
    },
    y_axis: {
        d: {
            'Y Axis': 'Label: Count trophies. Values range from 0 to 30 on a numerical scale.'
        },
        x: 21,
        y: 311,
        width: 39,
        height: 194,
        id: 'y_axis',
        cssClass: 'dn-test-class',
        edges: ['any-return', 'any-exit', 'legend-y_axis', 'y_axis-x_axis'],
        description: 'Y Axis. Label: Count trophies. Values range from 0 to 30 on a numerical scale.'
    },
    x_axis: {
        d: {
            'X Axis': 'Teams included: Arsenal, Chelsea, Liverpool, Manchester United.'
        },
        x: 191,
        y: 736,
        width: 969,
        height: 44,
        id: 'x_axis',
        cssClass: 'dn-test-class',
        edges: ['any-return', 'any-exit', 'y_axis-x_axis', 'x_axis-arsenal'],
        description: 'Teams included: Arsenal, Chelsea, Liverpool, Manchester United.'
    },
    arsenal: {
        d: {
            team: 'Arsenal',
            'total trophies': 17
        },
        x: 194,
        y: 370,
        width: 122,
        height: 357,
        id: 'arsenal',
        cssClass: 'dn-test-class',
        edges: [
            'any-return',
            'any-exit',
            'x_axis-arsenal',
            'any-x_axis',
            'arsenal-bpl1',
            'arsenal-chelsea',
            'manchester-arsenal',
            'any-legend'
        ],
        description: describeNode(
            {
                team: 'Arsenal',
                'total trophies': 17,
                contains: '3 contests'
            },
            {}
        )
    },
    chelsea: {
        d: {
            team: 'Chelsea',
            'total trophies': 15
        },
        x: 458,
        y: 414,
        width: 122,
        height: 312,
        id: 'chelsea',
        cssClass: 'dn-test-class',
        edges: [
            'any-return',
            'any-exit',
            'any-x_axis',
            'arsenal-chelsea',
            'chelsea-bpl2',
            'chelsea-liverpool',
            'any-legend'
        ],
        description: describeNode(
            {
                team: 'Chelsea',
                'total trophies': 15,
                contains: '3 contests'
            },
            {}
        )
    },
    liverpool: {
        d: {
            team: 'Liverpool',
            'total trophies': 15
        },
        x: 722,
        y: 414,
        width: 122,
        height: 312,
        id: 'liverpool',
        cssClass: 'dn-test-class',
        edges: [
            'any-return',
            'any-exit',
            'any-x_axis',
            'chelsea-liverpool',
            'liverpool-bpl3',
            'liverpool-manchester',
            'any-legend'
        ],
        description: describeNode(
            {
                team: 'Liverpool',
                'total trophies': 15,
                contains: '3 contests'
            },
            {}
        )
    },
    manchester: {
        d: {
            team: 'Manchester United',
            'total trophies': 28
        },
        x: 986,
        y: 138,
        width: 122,
        height: 589,
        id: 'manchester',
        cssClass: 'dn-test-class',
        edges: [
            'any-return',
            'any-exit',
            'any-x_axis',
            'liverpool-manchester',
            'manchester-bpl4',
            'manchester-arsenal',
            'any-legend'
        ],
        description: describeNode(
            {
                team: 'Manchester',
                'total trophies': 28,
                contains: '3 contests'
            },
            {}
        )
    },
    bpl: {
        d: {
            contest: 'BPL',
            'total trophies': 22
        },
        x: 194,
        y: 138,
        width: 918,
        height: 378,
        path: 'M987 136H985.762L985.21 137.108L848.762 411H720H584H457.309L321.603 368.093L321.309 368H321H196H194V370V430V432H196H320.431L458.948 517.701L459.431 518H460H584H584.579L585.069 517.69L720.579 432H850H850.152L850.303 431.977L987.152 411H1112H1114V409V138V136H1112H987Z',
        id: 'bpl',
        cssClass: 'dn-test-path',
        edges: ['any-return', 'any-exit', 'legend-bpl', 'any-legend', 'bpl-bpl1', 'bpl-fa', 'cl-bpl'],
        description: describeNode(
            {
                contest: 'BPL',
                'total trophies': 22,
                contains: '4 teams'
            },
            {}
        )
    },
    fa: {
        d: {
            contest: 'FA Cup',
            'total trophies': 42
        },
        x: 194,
        y: 414,
        width: 918,
        height: 311,
        path: 'M987.407 412H987.263L987.119 412.021L849.712 432H722.274H721.698L721.211 432.306L586.141 517H459.707L324.059 432.304L323.573 432H323H196H194V434V725V727H196H323H323.288L323.564 726.919L459.421 687H586.717H587.298L587.788 686.689L722.855 601H849.414L986.563 664.813L986.965 665H987.407H1112H1114V663V414V412H1112H987.407Z',
        id: 'fa',
        cssClass: 'dn-test-path',
        edges: ['any-return', 'any-exit', 'any-legend', 'bpl-fa', 'fa-fa1', 'fa-cl'],
        description: describeNode(
            {
                contest: 'FA Cup',
                'total trophies': 42,
                contains: '4 teams'
            },
            {}
        )
    },
    cl: {
        d: {
            contest: 'CL',
            'total trophies': 11
        },
        x: 194,
        y: 609,
        width: 918,
        height: 116,
        path: 'M321.731 723H191V727H322H457H585H721H849H987H1112H1114V725V666V664H1112H987.441L849.841 600.186L849.441 600H849H721H720.421L719.931 600.31L584.421 686H457H456.731L456.471 686.071L321.731 723Z',
        id: 'cl',
        cssClass: 'dn-test-path',
        edges: ['any-return', 'any-exit', 'any-legend', 'fa-cl', 'cl-cl1', 'cl-bpl'],
        description: describeNode(
            {
                contest: 'CL',
                'total trophies': 11,
                contains: '4 teams'
            },
            {}
        )
    },
    bpl1: {
        d: {
            contest: 'BPL',
            team: 'Arsenal',
            trophies: 3
        },
        x: 194,
        y: 370,
        width: 122,
        height: 62,
        id: 'bpl1',
        cssClass: 'dn-test-class',
        edges: [
            'any-return',
            'any-exit',
            'any-legend',
            'arsenal-bpl1',
            'bpl-bpl1',
            'bpl1-fa1',
            'cl1-bpl1',
            'bpl1-bpl2',
            'bpl4-bpl1'
        ],
        description: describeNode(
            {
                contest: 'BPL',
                team: 'Arsenal',
                trophies: 3
            },
            {}
        )
    },
    fa1: {
        d: {
            contest: 'FA Cup',
            team: 'Arsenal',
            trophies: 14
        },
        x: 194,
        y: 436,
        width: 122,
        height: 291,
        id: 'fa1',
        cssClass: 'dn-test-class',
        edges: ['any-return', 'any-exit', 'any-legend', 'fa-fa1', 'bpl1-fa1', 'fa1-cl1', 'fa1-fa2', 'fa4-fa1'],
        description: describeNode(
            {
                contest: 'FA Cup',
                team: 'Arsenal',
                trophies: 14
            },
            {}
        )
    },
    cl1: {
        d: {
            contest: 'CL',
            team: 'Arsenal',
            trophies: 0
        },
        x: 194,
        y: 727,
        width: 122,
        height: 0,
        id: 'cl1',
        cssClass: 'dn-test-class',
        edges: ['any-return', 'any-exit', 'any-legend', 'cl-cl1', 'fa1-cl1', 'cl1-bpl1', 'cl1-cl2', 'cl4-cl1'],
        description: describeNode(
            {
                contest: 'CL',
                team: 'Arsenal',
                trophies: 0
            },
            {}
        )
    },
    bpl2: {
        d: {
            contest: 'BPL',
            team: 'Chelsea',
            trophies: 5
        },
        x: 458,
        y: 414,
        width: 122,
        height: 103,
        id: 'bpl2',
        cssClass: 'dn-test-class',
        edges: [
            'any-return',
            'any-exit',
            'any-legend',
            'chelsea-bpl2',
            'bpl2-fa2',
            'cl2-bpl2',
            'bpl1-bpl2',
            'bpl2-bpl3'
        ],
        description: describeNode(
            {
                contest: 'BPL',
                team: 'Chelsea',
                trophies: 5
            },
            {}
        )
    },
    fa2: {
        d: {
            contest: 'FA Cup',
            team: 'Chelsea',
            trophies: 8
        },
        x: 458,
        y: 521,
        width: 122,
        height: 165,
        id: 'fa2',
        cssClass: 'dn-test-class',
        edges: ['any-return', 'any-exit', 'any-legend', 'bpl2-fa2', 'fa2-cl2', 'fa1-fa2', 'fa2-fa3'],
        description: describeNode(
            {
                contest: 'FA Cup',
                team: 'Chelsea',
                trophies: 8
            },
            {}
        )
    },
    cl2: {
        d: {
            contest: 'CL',
            team: 'Chelsea',
            trophies: 2
        },
        x: 458,
        y: 691,
        width: 122,
        height: 35,
        id: 'cl2',
        cssClass: 'dn-test-class',
        edges: ['any-return', 'any-exit', 'any-legend', 'fa2-cl2', 'cl2-bpl2', 'cl1-cl2', 'cl2-cl3'],
        description: describeNode(
            {
                contest: 'CL',
                team: 'Chelsea',
                trophies: 2
            },
            {}
        )
    },
    bpl3: {
        d: {
            contest: 'BPL',
            team: 'Liverpool',
            trophies: 1
        },
        x: 722,
        y: 414,
        width: 122,
        height: 18,
        id: 'bpl3',
        cssClass: 'dn-test-class',
        edges: [
            'any-return',
            'any-exit',
            'any-legend',
            'liverpool-bpl3',
            'bpl3-fa3',
            'cl3-bpl3',
            'bpl2-bpl3',
            'bpl3-bpl4'
        ],
        description: describeNode(
            {
                contest: 'BPL',
                team: 'Liverpool',
                trophies: 1
            },
            {}
        )
    },
    fa3: {
        d: {
            contest: 'FA Cup',
            team: 'Liverpool',
            trophies: 8
        },
        x: 722,
        y: 437,
        width: 122,
        height: 165,
        id: 'fa3',
        cssClass: 'dn-test-class',
        edges: ['any-return', 'any-exit', 'any-legend', 'bpl3-fa3', 'fa3-cl3', 'fa2-fa3', 'fa3-fa4'],
        description: describeNode(
            {
                contest: 'FA Cup',
                team: 'Liverpool',
                trophies: 8
            },
            {}
        )
    },
    cl3: {
        d: {
            contest: 'CL',
            team: 'Liverpool',
            trophies: 6
        },
        x: 722,
        y: 607,
        width: 122,
        height: 119,
        id: 'cl3',
        cssClass: 'dn-test-class',
        edges: ['any-return', 'any-exit', 'any-legend', 'fa3-cl3', 'cl3-bpl3', 'cl2-cl3', 'cl3-cl4'],
        description: describeNode(
            {
                contest: 'CL',
                team: 'Liverpool',
                trophies: 6
            },
            {}
        )
    },
    bpl4: {
        d: {
            contest: 'BPL',
            team: 'Manchester United',
            trophies: 13
        },
        x: 986,
        y: 138,
        width: 122,
        height: 273,
        id: 'bpl4',
        cssClass: 'dn-test-class',
        edges: [
            'any-return',
            'any-exit',
            'any-legend',
            'manchester-bpl4',
            'bpl4-fa4',
            'cl4-bpl4',
            'bpl3-bpl4',
            'bpl4-bpl1'
        ],
        description: describeNode(
            {
                contest: 'BPL',
                team: 'Manchester United',
                trophies: 13
            },
            {}
        )
    },
    fa4: {
        d: {
            contest: 'FA Cup',
            team: 'Manchester United',
            trophies: 12
        },
        x: 986,
        y: 414,
        width: 122,
        height: 250,
        id: 'fa4',
        cssClass: 'dn-test-class',
        edges: ['any-return', 'any-exit', 'any-legend', 'bpl4-fa4', 'fa4-cl4', 'fa3-fa4', 'fa4-fa1'],
        description: describeNode(
            {
                contest: 'FA Cup',
                team: 'Manchester United',
                trophies: 12
            },
            {}
        )
    },
    cl4: {
        d: {
            contest: 'CL',
            team: 'Manchester United',
            trophies: 3
        },
        x: 986,
        y: 667,
        width: 122,
        height: 58,
        id: 'cl4',
        cssClass: 'dn-test-class',
        edges: ['any-return', 'any-exit', 'any-legend', 'fa4-cl4', 'cl4-bpl4', 'cl3-cl4', 'cl4-cl1'],
        description: describeNode(
            {
                contest: 'CL',
                team: 'Manchester United',
                trophies: 3
            },
            {}
        )
    }
};
let edges = {
    'any-legend': {
        source: (_d, current, _previous) => current,
        target: (_d, current, _previous) => {
            const hasParent = !!+current.substring(current.length - 1);
            console.log(
                'hasParent ? current.substring(0,current.length-1) : "legend"',
                hasParent ? current.substring(0, current.length - 1) : 'legend'
            );
            return hasParent ? current.substring(0, current.length - 1) : 'legend';
        },
        type: 'legend'
    },
    'any-return': {
        source: (_d, current, _previous) => current,
        target: (_d, _current, previous) => previous,
        type: 'returnTo'
    },
    'any-x_axis': {
        source: (_d, current, _previous) => current,
        target: 'x_axis',
        type: 'parent'
    },
    'any-exit': {
        source: (_d, current, _previous) => current,
        target: () => {
            dn.exit();
            return '';
        }, // need something clever here
        type: 'exit'
    },
    'x_axis-exit': {
        source: 'x_axis',
        target: () => {
            dn.exit();
            return '';
        },
        type: 'exit'
    },
    'x_axis-arsenal': {
        source: 'x_axis',
        target: 'arsenal',
        type: 'child'
    },
    'arsenal-bpl1': {
        source: 'arsenal',
        target: 'bpl1',
        type: 'child'
    },
    'arsenal-chelsea': {
        source: 'arsenal',
        target: 'chelsea',
        type: 'team'
    },
    'manchester-arsenal': {
        source: 'manchester',
        target: 'arsenal',
        type: 'team'
    },
    'title-legend': {
        source: 'title',
        target: 'legend',
        type: 'chart'
    },
    'legend-y_axis': {
        source: 'legend',
        target: 'y_axis',
        type: 'chart'
    },
    'legend-bpl': {
        source: 'legend',
        target: 'bpl',
        type: 'child'
    },
    'y_axis-x_axis': {
        source: 'y_axis',
        target: 'x_axis',
        type: 'chart'
    },
    'chelsea-bpl2': {
        source: 'chelsea',
        target: 'bpl2',
        type: 'child'
    },
    'chelsea-liverpool': {
        source: 'chelsea',
        target: 'liverpool',
        type: 'team'
    },
    'liverpool-bpl3': {
        source: 'liverpool',
        target: 'bpl3',
        type: 'child'
    },
    'liverpool-manchester': {
        source: 'liverpool',
        target: 'manchester',
        type: 'team'
    },
    'manchester-bpl4': {
        source: 'manchester',
        target: 'bpl4',
        type: 'child'
    },
    'bpl-bpl1': {
        source: 'bpl',
        target: 'bpl1',
        type: 'child'
    },
    'bpl-fa': {
        source: 'bpl',
        target: 'fa',
        type: 'contest'
    },
    'cl-bpl': {
        source: 'cl',
        target: 'bpl',
        type: 'contest'
    },
    'fa-fa1': {
        source: 'fa',
        target: 'fa1',
        type: 'child'
    },
    'fa-cl': {
        source: 'fa',
        target: 'cl',
        type: 'contest'
    },
    'cl-cl1': {
        source: 'cl',
        target: 'cl1',
        type: 'child'
    },
    'bpl1-fa1': {
        source: 'bpl1',
        target: 'fa1',
        type: 'contest'
    },
    'cl1-bpl1': {
        source: 'cl1',
        target: 'bpl1',
        type: 'contest'
    },
    'bpl1-bpl2': {
        source: 'bpl1',
        target: 'bpl2',
        type: 'team'
    },
    'bpl4-bpl1': {
        source: 'bpl4',
        target: 'bpl1',
        type: 'team'
    },
    'fa1-cl1': {
        source: 'fa1',
        target: 'cl1',
        type: 'contest'
    },
    'fa1-fa2': {
        source: 'fa1',
        target: 'fa2',
        type: 'team'
    },
    'fa4-fa1': {
        source: 'fa4',
        target: 'fa1',
        type: 'team'
    },
    'cl1-cl2': {
        source: 'cl1',
        target: 'cl2',
        type: 'team'
    },
    'cl4-cl1': {
        source: 'cl4',
        target: 'cl1',
        type: 'team'
    },
    'bpl2-fa2': {
        source: 'bpl2',
        target: 'fa2',
        type: 'contest'
    },
    'cl2-bpl2': {
        source: 'cl2',
        target: 'bpl2',
        type: 'contest'
    },
    'bpl2-bpl3': {
        source: 'bpl2',
        target: 'bpl3',
        type: 'team'
    },
    'fa2-cl2': {
        source: 'fa2',
        target: 'cl2',
        type: 'contest'
    },
    'fa2-fa3': {
        source: 'fa2',
        target: 'fa3',
        type: 'team'
    },
    'cl2-cl3': {
        source: 'cl2',
        target: 'cl3',
        type: 'team'
    },
    'bpl3-fa3': {
        source: 'bpl3',
        target: 'fa3',
        type: 'contest'
    },
    'cl3-bpl3': {
        source: 'cl3',
        target: 'bpl3',
        type: 'contest'
    },
    'bpl3-bpl4': {
        source: 'bpl3',
        target: 'bpl4',
        type: 'team'
    },
    'fa3-cl3': {
        source: 'fa3',
        target: 'cl3',
        type: 'contest'
    },
    'fa3-fa4': {
        source: 'fa3',
        target: 'fa4',
        type: 'team'
    },
    'cl3-cl4': {
        source: 'cl3',
        target: 'cl4',
        type: 'team'
    },
    'bpl4-fa4': {
        source: 'bpl4',
        target: 'fa4',
        type: 'contest'
    },
    'cl4-bpl4': {
        source: 'cl4',
        target: 'bpl4',
        type: 'contest'
    },
    'fa4-cl4': {
        source: 'fa4',
        target: 'cl4',
        type: 'contest'
    }
};
let navRules = {
    // user presses arrowright, we are on a node,
    // now we look for edges that have a "team" type
    // if we find one, we look for edges where source !== edge.source
    // if true, we move to edge.target
    // else we keep looking, including across "chart" type
    right: {
        types: ['team'],
        key: 'ArrowRight',
        direction: 1
    },
    // user presses arrowleft, we are on a node,
    // now we look for edges that have a "team" type
    // if we find one, we look for edges where source !== edge.target
    // if true, we move to edge.source
    // else we keep looking, including across "chart" type
    left: {
        types: ['team'],
        key: 'ArrowLeft',
        direction: -1
    },
    down: {
        types: ['contest', 'chart', 'x_axis-exit'],
        key: 'ArrowDown',
        direction: 1
    },
    up: {
        types: ['contest', 'chart'],
        key: 'ArrowUp',
        direction: -1
    },
    child: {
        types: ['child'],
        key: 'Enter',
        direction: 1
    },
    parent: {
        types: ['child'],
        key: 'Backspace',
        direction: -1
    },
    exit: {
        types: ['exit'],
        key: 'Escape',
        direction: 1
    },
    'previous position': {
        types: ['returnTo'],
        key: 'Period',
        direction: 1
    },
    // user presses KeyL, we are on a node,
    // now we look for edges that have a "legend" type
    // if we find one, we look for edges where source !== edge.source
    // if true, we move to edge.target
    // else we keep looking, including across "chart" type
    legend: {
        types: ['legend'],
        key: 'KeyL',
        direction: 1
    }
};
// nodes[x] = {
//     d,
//     x: +rect.getAttribute('x') - 2,
//     y: +rect.getAttribute('y') - 2,
//     width: +rect.getAttribute('width'),
//     height: +rect.getAttribute('height'),
//     ref: "ref-" + x,
//     id: x,
//     cssClass: "dn-test-class",
//     edges,
//     // lr: [left, right], // left/right, left/right arrows
//     // ud: [up, down], // up/down, up/down arrows
//     // fb: [forward, backward], // backward/forward, comma/period
//     // pc: [parent, child], // first parent/first child, escape/enter
//     description: describeNode(d, descriptionOptions),
//     // semantics: "node", //  collection root, list root, list item, menu, button, hyperlink, toggle, multi-select?, search?
// }

// // options for element descriptions
// const descriptionOptions = {
//     omitKeyNames: false,
// }

let buildOptions = {
    data: {
        nodes,
        edges // required
    },
    id: 'data-navigator-schema', // required
    entryPoint: 'title',
    rendering: 'on-demand', // "full"
    manualEventHandling: false, // default is false/undefined
    width: 1200,
    height: 800,
    root: {
        cssClass: '',
        width: '100%',
        height: 0
    },
    navigation: navRules,
    hooks: {
        navigation: d => {
            // either a valid keypress is about to trigger navigation (before)
            // or navigation has just finished
            // provide another function to interrupt? hmmm...
            console.log('navigating', d);
        },
        focus: d => {
            // focus has just finished
            console.log('focus', d);
        },
        selection: d => {
            // selection event has just finished
            console.log('selection', d);
        },
        keydown: d => {
            // a keydown event has just happened (most expensive hook)
            console.log('keydown', d);
        },
        pointerClick: d => {
            // the whole nav region has received a click
            // ideally, we could send the previous focus point and maybe an x/y coord for the mouse?
            console.log('clicked', d);
        }
    }
};

// create data navigator
const dn = dataNavigator(buildOptions);

document.getElementById('root').appendChild(dn.build());

window.dn = dn;

const touchHandler = new Hammer(document.body, {});
touchHandler.get('pinch').set({ enable: false });
touchHandler.get('rotate').set({ enable: false });
touchHandler.get('pan').set({ enable: false });
touchHandler.get('swipe').set({ direction: Hammer.DIRECTION_ALL, velocity: 0.2 });

touchHandler.on('press', ev => {
    // dn.enter()
});
touchHandler.on('pressup', ev => {
    dn.enter();
});
touchHandler.on('swipe', ev => {
    const larger = Math.abs(ev.deltaX) > Math.abs(ev.deltaY) ? 'X' : 'Y';
    // const smaller = ev.deltaX <= ev.deltaY ? ev.deltaX : ev.deltaY
    const ratio =
        (Math.abs(ev['delta' + larger]) + 0.000000001) /
        (Math.abs(ev['delta' + (larger === 'X' ? 'Y' : 'X')]) + 0.000000001);
    const left = ev.deltaX < 0;
    const right = ev.deltaX > 0;
    const up = ev.deltaY < 0;
    const down = ev.deltaY > 0;
    const direction =
        ratio > 0.99 && ratio <= 2
            ? right && up
                ? 'forward'
                : right && down
                ? 'child'
                : left && down
                ? 'backward'
                : left && up
                ? 'parent'
                : null
            : right && larger === 'X'
            ? 'right'
            : down && larger === 'Y'
            ? 'down'
            : left && larger === 'X'
            ? 'left'
            : up && larger === 'Y'
            ? 'up'
            : null;
    if (dn.getCurrentFocus() && direction) {
        dn.move(direction);
    }
});
