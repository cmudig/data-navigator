import { default as dataNavigator } from '../src/index.ts';
import { describeNode } from '../src/utilities.ts';
let commandsList = '';
let scale;
const hideTooltip = () => {
    document.getElementById('tooltip').classList.add('hidden');
};

const showTooltip = e => {
    const tooltip = document.getElementById('tooltip');
    tooltip.classList.remove('hidden');
    tooltip.innerText = e.semantics.label;
    const bbox = tooltip.getBoundingClientRect();
    const offset = 5 * scale;
    const yOffset = bbox.height + offset;
    if (!(e.d.team === 'Manchester United' || e.d.team === 'Liverpool' || (!e.d.team && e.d.contest === 'BPL'))) {
        tooltip.style.textAlign = 'left';
        tooltip.style.transform = `translate(${e.spatialProperties.x * scale - offset + 1}px,${
            e.spatialProperties.y * scale - yOffset
        }px)`;
    } else {
        tooltip.style.textAlign = 'right';
        const xOffset = bbox.width;
        tooltip.style.transform = `translate(${
            (e.spatialProperties.x + e.spatialProperties.width) * scale + offset - xOffset + 1
        }px,${e.spatialProperties.y * scale - yOffset}px)`;
    }
};

let entered;
let previous;
let current;
// input data
// extracted from https://www.highcharts.com/demo/column-stacked
let nodes = {
    title: {
        d: {
            title: 'Major Trophies for some English teams'
        },
        spatialProperties: { x: 12, y: 9, width: 686, height: 56 },
        id: 'title',
        renderId: 'title',
        edges: ['any-return', 'any-exit', 'title-legend'],
        semantics: { label: 'Major Trophies for some English teams' }
    },
    legend: {
        d: {
            legend: 'Contests Included: BPL, FA Cup, CL'
        },
        spatialProperties: { x: 160, y: 162, width: 398, height: 49 },
        id: 'legend',
        renderId: 'legend',
        edges: ['any-return', 'any-exit', 'title-legend', 'legend-y_axis', 'legend-bpl'],
        semantics: { label: 'Legend. Contests Included: BPL, FA Cup, CL. Press Enter to explore these contests.' }
    },
    y_axis: {
        d: {
            'Y Axis': 'Label: Count trophies. Values range from 0 to 30 on a numerical scale.'
        },
        spatialProperties: { x: 21, y: 311, width: 39, height: 194 },
        id: 'y_axis',
        renderId: 'y_axis',
        edges: ['any-return', 'any-exit', 'legend-y_axis', 'y_axis-x_axis'],
        semantics: { label: 'Y Axis. Label: Count trophies. Values range from 0 to 30 on a numerical scale.' }
    },
    x_axis: {
        d: {
            'X Axis': 'Teams included: Arsenal, Chelsea, Liverpool, Manchester United.'
        },
        spatialProperties: { x: 191, y: 736, width: 969, height: 44 },
        id: 'x_axis',
        renderId: 'x_axis',
        edges: ['any-return', 'any-exit', 'y_axis-x_axis', 'x_axis-arsenal'],
        semantics: {
            label: 'X Axis. Arsenal, Chelsea, Liverpool, Manchester United. Press Enter to explore these teams.'
        }
    },
    arsenal: {
        d: {
            team: 'Arsenal',
            'total trophies': 17
        },
        spatialProperties: { x: 194, y: 370, width: 122, height: 357 },
        id: 'arsenal',
        renderId: 'arsenal',
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
        semantics: {
            label: describeNode(
                {
                    team: 'Arsenal',
                    'total trophies': 17,
                    contains: '3 contests'
                },
                {}
            )
        }
    },
    chelsea: {
        d: {
            team: 'Chelsea',
            'total trophies': 15
        },
        spatialProperties: { x: 458, y: 414, width: 122, height: 312 },
        id: 'chelsea',
        renderId: 'chelsea',
        edges: [
            'any-return',
            'any-exit',
            'any-x_axis',
            'arsenal-chelsea',
            'chelsea-bpl2',
            'chelsea-liverpool',
            'any-legend'
        ],
        semantics: {
            label: describeNode(
                {
                    team: 'Chelsea',
                    'total trophies': 15,
                    contains: '3 contests'
                },
                {}
            )
        }
    },
    liverpool: {
        d: {
            team: 'Liverpool',
            'total trophies': 15
        },
        spatialProperties: { x: 722, y: 414, width: 122, height: 312 },
        id: 'liverpool',
        renderId: 'liverpool',
        edges: [
            'any-return',
            'any-exit',
            'any-x_axis',
            'chelsea-liverpool',
            'liverpool-bpl3',
            'liverpool-manchester',
            'any-legend'
        ],
        semantics: {
            label: describeNode(
                {
                    team: 'Liverpool',
                    'total trophies': 15,
                    contains: '3 contests'
                },
                {}
            )
        }
    },
    manchester: {
        d: {
            team: 'Manchester United',
            'total trophies': 28
        },
        spatialProperties: { x: 986, y: 138, width: 122, height: 589 },
        id: 'manchester',
        renderId: 'manchester',
        edges: [
            'any-return',
            'any-exit',
            'any-x_axis',
            'liverpool-manchester',
            'manchester-bpl4',
            'manchester-arsenal',
            'any-legend'
        ],
        semantics: {
            label: describeNode(
                {
                    team: 'Manchester',
                    'total trophies': 28,
                    contains: '3 contests'
                },
                {}
            )
        }
    },
    bpl: {
        d: {
            contest: 'BPL',
            'total trophies': 22
        },
        spatialProperties: {
            x: 194,
            y: 138,
            width: 918,
            height: 378,
            path: 'M987 136H985.762L985.21 137.108L848.762 411H720H584H457.309L321.603 368.093L321.309 368H321H196H194V370V430V432H196H320.431L458.948 517.701L459.431 518H460H584H584.579L585.069 517.69L720.579 432H850H850.152L850.303 431.977L987.152 411H1112H1114V409V138V136H1112H987Z'
        },
        id: 'bpl',
        renderId: 'bpl',
        edges: ['any-return', 'any-exit', 'legend-bpl', 'any-legend', 'bpl-bpl1', 'bpl-fa', 'cl-bpl'],
        semantics: {
            label: describeNode(
                {
                    contest: 'BPL',
                    'total trophies': 22,
                    contains: '4 teams'
                },
                {}
            )
        }
    },
    fa: {
        d: {
            contest: 'FA Cup',
            'total trophies': 42
        },
        spatialProperties: {
            x: 194,
            y: 414,
            width: 918,
            height: 311,
            path: 'M987.407 412H987.263L987.119 412.021L849.712 432H722.274H721.698L721.211 432.306L586.141 517H459.707L324.059 432.304L323.573 432H323H196H194V434V725V727H196H323H323.288L323.564 726.919L459.421 687H586.717H587.298L587.788 686.689L722.855 601H849.414L986.563 664.813L986.965 665H987.407H1112H1114V663V414V412H1112H987.407Z'
        },
        id: 'fa',
        renderId: 'fa',
        edges: ['any-return', 'any-exit', 'any-legend', 'bpl-fa', 'fa-fa1', 'fa-cl'],
        semantics: {
            label: describeNode(
                {
                    contest: 'FA Cup',
                    'total trophies': 42,
                    contains: '4 teams'
                },
                {}
            )
        }
    },
    cl: {
        d: {
            contest: 'CL',
            'total trophies': 11
        },
        spatialProperties: {
            x: 194,
            y: 609,
            width: 918,
            height: 116,
            path: 'M321.731 723H191V727H322H457H585H721H849H987H1112H1114V725V666V664H1112H987.441L849.841 600.186L849.441 600H849H721H720.421L719.931 600.31L584.421 686H457H456.731L456.471 686.071L321.731 723Z'
        },
        id: 'cl',
        renderId: 'cl',
        edges: ['any-return', 'any-exit', 'any-legend', 'fa-cl', 'cl-cl1', 'cl-bpl'],
        semantics: {
            label: describeNode(
                {
                    contest: 'CL',
                    'total trophies': 11,
                    contains: '4 teams'
                },
                {}
            )
        }
    },
    bpl1: {
        d: {
            contest: 'BPL',
            team: 'Arsenal',
            trophies: 3
        },
        spatialProperties: { x: 194, y: 370, width: 122, height: 62 },
        id: 'bpl1',
        renderId: 'bpl1',
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
        semantics: {
            label: describeNode(
                {
                    contest: 'BPL',
                    team: 'Arsenal',
                    trophies: 3
                },
                {}
            )
        }
    },
    fa1: {
        d: {
            contest: 'FA Cup',
            team: 'Arsenal',
            trophies: 14
        },
        spatialProperties: { x: 194, y: 436, width: 122, height: 291 },
        id: 'fa1',
        renderId: 'fa1',
        edges: [
            'any-return',
            'any-exit',
            'any-legend',
            'arsenal-fa1',
            'fa-fa1',
            'bpl1-fa1',
            'fa1-cl1',
            'fa1-fa2',
            'fa4-fa1'
        ],
        semantics: {
            label: describeNode(
                {
                    contest: 'FA Cup',
                    team: 'Arsenal',
                    trophies: 14
                },
                {}
            )
        }
    },
    cl1: {
        d: {
            contest: 'CL',
            team: 'Arsenal',
            trophies: 0
        },
        spatialProperties: { x: 194, y: 727, width: 122, height: 0 },
        id: 'cl1',
        renderId: 'cl1',
        edges: [
            'any-return',
            'any-exit',
            'arsenal-cl1',
            'any-legend',
            'cl-cl1',
            'fa1-cl1',
            'cl1-bpl1',
            'cl1-cl2',
            'cl4-cl1'
        ],
        semantics: {
            label: describeNode(
                {
                    contest: 'CL',
                    team: 'Arsenal',
                    trophies: 0
                },
                {}
            )
        }
    },
    bpl2: {
        d: {
            contest: 'BPL',
            team: 'Chelsea',
            trophies: 5
        },
        spatialProperties: { x: 458, y: 414, width: 122, height: 103 },
        id: 'bpl2',
        renderId: 'bpl2',
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
        semantics: {
            label: describeNode(
                {
                    contest: 'BPL',
                    team: 'Chelsea',
                    trophies: 5
                },
                {}
            )
        }
    },
    fa2: {
        d: {
            contest: 'FA Cup',
            team: 'Chelsea',
            trophies: 8
        },
        spatialProperties: { x: 458, y: 521, width: 122, height: 165 },
        id: 'fa2',
        renderId: 'fa2',
        edges: ['any-return', 'chelsea-fa2', 'any-exit', 'any-legend', 'bpl2-fa2', 'fa2-cl2', 'fa1-fa2', 'fa2-fa3'],
        semantics: {
            label: describeNode(
                {
                    contest: 'FA Cup',
                    team: 'Chelsea',
                    trophies: 8
                },
                {}
            )
        }
    },
    cl2: {
        d: {
            contest: 'CL',
            team: 'Chelsea',
            trophies: 2
        },
        spatialProperties: { x: 458, y: 691, width: 122, height: 35 },
        id: 'cl2',
        renderId: 'cl2',
        edges: ['any-return', 'any-exit', 'any-legend', 'chelsea-cl2', 'fa2-cl2', 'cl2-bpl2', 'cl1-cl2', 'cl2-cl3'],
        semantics: {
            label: describeNode(
                {
                    contest: 'CL',
                    team: 'Chelsea',
                    trophies: 2
                },
                {}
            )
        }
    },
    bpl3: {
        d: {
            contest: 'BPL',
            team: 'Liverpool',
            trophies: 1
        },
        spatialProperties: { x: 722, y: 414, width: 122, height: 18 },
        id: 'bpl3',
        renderId: 'bpl3',
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
        semantics: {
            label: describeNode(
                {
                    contest: 'BPL',
                    team: 'Liverpool',
                    trophies: 1
                },
                {}
            )
        }
    },
    fa3: {
        d: {
            contest: 'FA Cup',
            team: 'Liverpool',
            trophies: 8
        },
        spatialProperties: { x: 722, y: 437, width: 122, height: 165 },
        id: 'fa3',
        renderId: 'fa3',
        edges: ['any-return', 'any-exit', 'any-legend', 'liverpool-fa3', 'bpl3-fa3', 'fa3-cl3', 'fa2-fa3', 'fa3-fa4'],
        semantics: {
            label: describeNode(
                {
                    contest: 'FA Cup',
                    team: 'Liverpool',
                    trophies: 8
                },
                {}
            )
        }
    },
    cl3: {
        d: {
            contest: 'CL',
            team: 'Liverpool',
            trophies: 6
        },
        spatialProperties: { x: 722, y: 607, width: 122, height: 119 },
        id: 'cl3',
        renderId: 'cl3',
        edges: ['any-return', 'any-exit', 'any-legend', 'liverpool-cl3', 'fa3-cl3', 'cl3-bpl3', 'cl2-cl3', 'cl3-cl4'],
        semantics: {
            label: describeNode(
                {
                    contest: 'CL',
                    team: 'Liverpool',
                    trophies: 6
                },
                {}
            )
        }
    },
    bpl4: {
        d: {
            contest: 'BPL',
            team: 'Manchester United',
            trophies: 13
        },
        spatialProperties: { x: 986, y: 138, width: 122, height: 273 },
        id: 'bpl4',
        renderId: 'bpl4',
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
        semantics: {
            label: describeNode(
                {
                    contest: 'BPL',
                    team: 'Manchester United',
                    trophies: 13
                },
                {}
            )
        }
    },
    fa4: {
        d: {
            contest: 'FA Cup',
            team: 'Manchester United',
            trophies: 12
        },
        spatialProperties: { x: 986, y: 414, width: 122, height: 250 },
        id: 'fa4',
        renderId: 'fa4',
        edges: ['any-return', 'any-exit', 'any-legend', 'manchester-fa4', 'bpl4-fa4', 'fa4-cl4', 'fa3-fa4', 'fa4-fa1'],
        semantics: {
            label: describeNode(
                {
                    contest: 'FA Cup',
                    team: 'Manchester United',
                    trophies: 12
                },
                {}
            )
        }
    },
    cl4: {
        d: {
            contest: 'CL',
            team: 'Manchester United',
            trophies: 3
        },
        spatialProperties: { x: 986, y: 667, width: 122, height: 58 },
        id: 'cl4',
        renderId: 'cl4',
        edges: ['any-return', 'any-exit', 'any-legend', 'manchester-cl4', 'fa4-cl4', 'cl4-bpl4', 'cl3-cl4', 'cl4-cl1'],
        semantics: {
            label: describeNode(
                {
                    contest: 'CL',
                    team: 'Manchester United',
                    trophies: 3
                },
                {}
            )
        }
    }
};
let edges = {
    'any-legend': {
        source: () => current,
        target: () => {
            const hasParent = !!+current.substring(current.length - 1);
            return hasParent ? current.substring(0, current.length - 1) : 'legend';
        },
        navigationRules: ['legend']
    },
    'any-x_axis': {
        source: 'x_axis',
        target: () => current, // this is because 'parent' moves backwards or towards the source!
        navigationRules: ['parent'] // we could have optionally made a new rule just for this, but went with parent instead
    },
    'any-return': {
        source: () => current,
        target: () => previous,
        navigationRules: ['undo']
    },
    'any-exit': {
        source: () => current,
        target: () => {
            exit();
            return '';
        },
        navigationRules: ['exit']
    },
    'x_axis-exit': {
        source: 'x_axis',
        target: () => {
            exit();
            return '';
        },
        navigationRules: ['down']
    },
    'x_axis-arsenal': {
        source: 'x_axis',
        target: 'arsenal',
        navigationRules: ['child', 'parent']
    },
    'arsenal-bpl1': {
        source: 'arsenal',
        target: 'bpl1',
        navigationRules: ['child', 'parent']
    },
    'arsenal-fa1': {
        source: 'arsenal',
        target: 'fa1',
        navigationRules: ['child', 'parent']
    },
    'arsenal-cl1': {
        source: 'arsenal',
        target: 'cl1',
        navigationRules: ['child', 'parent']
    },
    'chelsea-fa2': {
        source: 'chelsea',
        target: 'fa2',
        navigationRules: ['child', 'parent']
    },
    'chelsea-cl2': {
        source: 'chelsea',
        target: 'cl2',
        navigationRules: ['child', 'parent']
    },
    'liverpool-fa3': {
        source: 'liverpool',
        target: 'fa3',
        navigationRules: ['child', 'parent']
    },
    'liverpool-cl3': {
        source: 'liverpool',
        target: 'cl3',
        navigationRules: ['child', 'parent']
    },
    'manchester-fa4': {
        source: 'manchester',
        target: 'fa4',
        navigationRules: ['child', 'parent']
    },
    'manchester-cl4': {
        source: 'manchester',
        target: 'cl4',
        navigationRules: ['child', 'parent']
    },
    'arsenal-chelsea': {
        source: 'arsenal',
        target: 'chelsea',
        navigationRules: ['left', 'right']
    },
    'manchester-arsenal': {
        source: 'manchester',
        target: 'arsenal',
        navigationRules: ['left', 'right']
    },
    'title-legend': {
        source: 'title',
        target: 'legend',
        navigationRules: ['up', 'down']
    },
    'legend-y_axis': {
        source: 'legend',
        target: 'y_axis',
        navigationRules: ['up', 'down']
    },
    'legend-bpl': {
        source: 'legend',
        target: 'bpl',
        navigationRules: ['child', 'parent']
    },
    'y_axis-x_axis': {
        source: 'y_axis',
        target: 'x_axis',
        navigationRules: ['up', 'down']
    },
    'chelsea-bpl2': {
        source: 'chelsea',
        target: 'bpl2',
        navigationRules: ['child', 'parent']
    },
    'chelsea-liverpool': {
        source: 'chelsea',
        target: 'liverpool',
        navigationRules: ['left', 'right']
    },
    'liverpool-bpl3': {
        source: 'liverpool',
        target: 'bpl3',
        navigationRules: ['child', 'parent']
    },
    'liverpool-manchester': {
        source: 'liverpool',
        target: 'manchester',
        navigationRules: ['left', 'right']
    },
    'manchester-bpl4': {
        source: 'manchester',
        target: 'bpl4',
        navigationRules: ['child', 'parent']
    },
    'bpl-bpl1': {
        source: 'bpl',
        target: 'bpl1',
        navigationRules: ['child', 'parent']
    },
    'bpl-fa': {
        source: 'bpl',
        target: 'fa',
        navigationRules: ['up', 'down']
    },
    'cl-bpl': {
        source: 'cl',
        target: 'bpl',
        navigationRules: ['up', 'down']
    },
    'fa-fa1': {
        source: 'fa',
        target: 'fa1',
        navigationRules: ['child', 'parent']
    },
    'fa-cl': {
        source: 'fa',
        target: 'cl',
        navigationRules: ['up', 'down']
    },
    'cl-cl1': {
        source: 'cl',
        target: 'cl1',
        navigationRules: ['child', 'parent']
    },
    'bpl1-fa1': {
        source: 'bpl1',
        target: 'fa1',
        navigationRules: ['up', 'down']
    },
    'cl1-bpl1': {
        source: 'cl1',
        target: 'bpl1',
        navigationRules: ['up', 'down']
    },
    'bpl1-bpl2': {
        source: 'bpl1',
        target: 'bpl2',
        navigationRules: ['left', 'right']
    },
    'bpl4-bpl1': {
        source: 'bpl4',
        target: 'bpl1',
        navigationRules: ['left', 'right']
    },
    'fa1-cl1': {
        source: 'fa1',
        target: 'cl1',
        navigationRules: ['up', 'down']
    },
    'fa1-fa2': {
        source: 'fa1',
        target: 'fa2',
        navigationRules: ['left', 'right']
    },
    'fa4-fa1': {
        source: 'fa4',
        target: 'fa1',
        navigationRules: ['left', 'right']
    },
    'cl1-cl2': {
        source: 'cl1',
        target: 'cl2',
        navigationRules: ['left', 'right']
    },
    'cl4-cl1': {
        source: 'cl4',
        target: 'cl1',
        navigationRules: ['left', 'right']
    },
    'bpl2-fa2': {
        source: 'bpl2',
        target: 'fa2',
        navigationRules: ['up', 'down']
    },
    'cl2-bpl2': {
        source: 'cl2',
        target: 'bpl2',
        navigationRules: ['up', 'down']
    },
    'bpl2-bpl3': {
        source: 'bpl2',
        target: 'bpl3',
        navigationRules: ['left', 'right']
    },
    'fa2-cl2': {
        source: 'fa2',
        target: 'cl2',
        navigationRules: ['up', 'down']
    },
    'fa2-fa3': {
        source: 'fa2',
        target: 'fa3',
        navigationRules: ['left', 'right']
    },
    'cl2-cl3': {
        source: 'cl2',
        target: 'cl3',
        navigationRules: ['left', 'right']
    },
    'bpl3-fa3': {
        source: 'bpl3',
        target: 'fa3',
        navigationRules: ['up', 'down']
    },
    'cl3-bpl3': {
        source: 'cl3',
        target: 'bpl3',
        navigationRules: ['up', 'down']
    },
    'bpl3-bpl4': {
        source: 'bpl3',
        target: 'bpl4',
        navigationRules: ['left', 'right']
    },
    'fa3-cl3': {
        source: 'fa3',
        target: 'cl3',
        navigationRules: ['up', 'down']
    },
    'fa3-fa4': {
        source: 'fa3',
        target: 'fa4',
        navigationRules: ['left', 'right']
    },
    'cl3-cl4': {
        source: 'cl3',
        target: 'cl4',
        navigationRules: ['left', 'right']
    },
    'bpl4-fa4': {
        source: 'bpl4',
        target: 'fa4',
        navigationRules: ['up', 'down']
    },
    'cl4-bpl4': {
        source: 'cl4',
        target: 'bpl4',
        navigationRules: ['up', 'down']
    },
    'fa4-cl4': {
        source: 'fa4',
        target: 'cl4',
        navigationRules: ['up', 'down']
    }
};
let navigationRules = {
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
};

const structure = {
    nodes,
    edges
};

const rendering = dataNavigator.rendering({
    elementData: structure.nodes,
    defaults: {
        cssClass: (a, _b) => {
            if (!a.spatialProperties.path) {
                return 'dn-test-class';
            }
            return 'dn-test-path';
        }
    },
    suffixId: 'data-navigator-schema',
    root: {
        id: 'root',
        cssClass: '',
        width: '100%',
        height: 0
    },
    entryButton: {
        include: true,
        callbacks: {
            click: () => {
                enter();
            }
        }
    },
    exitElement: {
        include: true
    }
});

// create data navigator
rendering.initialize();

const input = dataNavigator.input({
    structure,
    navigationRules,
    entryPoint: 'title',
    exitPoint: rendering.exitElement.id
});

const initiateLifecycle = nextNode => {
    const node = rendering.render({
        renderId: nextNode.renderId,
        datum: nextNode
    });
    node.addEventListener('keydown', e => {
        const direction = input.keydownValidator(e);
        if (direction) {
            e.preventDefault();
            move(direction);
        }
    });
    showTooltip(nextNode);
    input.focus(nextNode.renderId);
    entered = true;
    previous = current;
    current = nextNode.id;
    rendering.remove(previous);
};

const enter = () => {
    const nextNode = input.enter();
    if (nextNode) {
        initiateLifecycle(nextNode);
    }
};

const move = direction => {
    const nextNode = input.move(current, direction);
    if (nextNode) {
        initiateLifecycle(nextNode);
    }
};

const exit = () => {
    entered = false;
    rendering.exitElement.style.display = 'block';
    input.focus(rendering.exitElement.id);
    previous = current;
    current = null;
    rendering.remove(previous);
    hideTooltip();
};

const handleMovement = ev => {
    const larger = Math.abs(ev.deltaX) > Math.abs(ev.deltaY) ? 'X' : 'Y';
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
                ? 'legend'
                : right && down
                ? 'child'
                : left && down
                ? 'undo'
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
    if (current && direction) {
        move(direction);
    }
};
const touchHandler = new Hammer(document.getElementById('root'), {});
touchHandler.get('pinch').set({ enable: false });
touchHandler.get('rotate').set({ enable: false });
touchHandler.get('pan').set({ enable: false });
touchHandler.get('swipe').set({ direction: Hammer.DIRECTION_ALL, velocity: 0.2 });

touchHandler.on('press', ev => {});
touchHandler.on('pressup', ev => {
    if (entered) {
        exit();
    } else {
        enter();
    }
});
touchHandler.on('swipe', ev => {
    handleMovement(ev);
});

let model;
let isVideo = false;
let ready = false;
let timer;
let command = null;
let center = null;
let frames = [];
const video = document.getElementById('feed');
const canvas = document.getElementById('canvas');
const context = canvas.getContext('2d');
const modelParams = {
    flipHorizontal: true,
    // outputStride: 16,
    // imageScaleFactor: 1,
    iouThreshold: 0.5,
    scoreThreshold: 0.45,
    modelType: 'ssd320fpnlite',
    modelSize: 'small'
    // bboxLineWidth: "2",
    // fontSize: 17,
};

const openCam = () => {
    document.getElementById('openWebcam').disabled = true;
    document.getElementById('closeWebcam').disabled = false;
    document.getElementById('ready').innerText = 'No. Loading video feed...';
    handTrack.startVideo(video).then(status => {
        document.getElementById('ready').innerText = 'Feed ready. Close your hand to prepare for gesture commands.';
        if (status) {
            isVideo = true;
            document.getElementById('status').classList.remove('hidden');
            document.getElementById('canvas').classList.remove('hidden');
            runDetection();
        }
    });
};

const runDetection = () => {
    model.detect(video).then(predictions => {
        if (predictions.length) {
            model.renderPredictions(predictions, canvas, context, video);
            predictions.forEach(pred => {
                if (ready && (pred.label === 'point' || pred.label === 'open') && pred.score >= 0.6) {
                    frames.push(pred);
                } else if (!ready && pred.label === 'closed' && pred.score >= 0.6) {
                    frames.push(pred);
                }
            });
            // check when frames >= 30
            if (frames.length >= 8) {
                // attempt aggregate analysis
                if (!ready) {
                    let total = [0, 0, 0, 0];
                    // find average center of fist, set ready
                    frames.forEach(frame => {
                        total[0] += frame.bbox[0];
                        total[1] += frame.bbox[1];
                        total[2] += frame.bbox[2];
                        total[3] += frame.bbox[3];
                    });
                    setReady([
                        total[0] / frames.length,
                        total[1] / frames.length,
                        total[2] / frames.length,
                        total[3] / frames.length
                    ]);
                } else {
                    // find dominant score, find average center, attempt command
                    let totals = {};
                    frames.forEach(frame => {
                        if (!totals[frame.label]) {
                            totals[frame.label] = {};
                            totals[frame.label].bbox = [0, 0, 0, 0];
                            totals[frame.label].count = 0;
                            totals[frame.label].total = 0;
                        }
                        let total = totals[frame.label];
                        total.count++;
                        total.total += frame.score;
                        total.bbox[0] += frame.bbox[0];
                        total.bbox[1] += frame.bbox[1];
                        total.bbox[2] += frame.bbox[2];
                        total.bbox[3] += frame.bbox[3];
                    });
                    let highest = {
                        score: 0,
                        label: ''
                    };
                    Object.keys(totals).forEach(key => {
                        if (!highest.label || highest.score < totals[key].total) {
                            highest.label = key;
                            highest.score = totals[key].total;
                        }
                    });
                    let h = totals[highest.label];
                    let c = h.count;
                    let prediction = {
                        bbox: [h.bbox[0] / c, h.bbox[1] / c, h.bbox[2] / c, h.bbox[3] / c],
                        label: highest.label,
                        score: highest.score / c
                    };
                    attemptCommand(prediction);
                }
                frames = [];
            }
        }
        if (isVideo) {
            requestAnimationFrame(runDetection);
        }
    });
};

const closeCam = () => {
    isVideo = false;
    handTrack.stopVideo(video);
    document.getElementById('openWebcam').remove();
    document.getElementById('canvas').remove();
    document.getElementById('loadModel').remove();
    document.getElementById('closeWebcam').disabled = true;
    document.getElementById('status').innerText =
        'Video feed disabled. Model disposed! Reload page to try model again.';
    model.dispose();
};

const setReady = bbox => {
    ready = bbox;
    document.getElementById('ready').innerText = 'Yes!';
    document.getElementById('fist').style.left = (ready[0] + ready[2]) / 2 - 16 + 'px';
    document.getElementById('fist').style.top = (ready[1] + ready[3]) / 2 - 5 + 'px';
    document.getElementById('fist').style.display = 'block';
};
const setNotReady = () => {
    ready = false;
    document.getElementById('ready').innerText = 'No.';
    document.getElementById('fist').style.display = 'none';
};
const attemptCommand = pred => {
    if (ready) {
        if (pred.label === 'point') {
            const ev = {
                deltaX: ready[2] - ready[0] - (pred.bbox[2] - pred.bbox[0]),
                deltaY: ready[3] - ready[1] - (pred.bbox[3] - pred.bbox[1])
            };
            handleMovement(ev);
        }
        if (pred.label === 'open' && !entered) {
            enter();
        } else if (pred.label === 'open' && entered) {
            exit();
        }
        setNotReady();
    }
};

const loadModel = () => {
    document.getElementById('loadModel').disabled = true;
    document.getElementById('status').classList.remove('hidden');
    document.getElementById('ready').innerText = 'No. Loading model...';
    handTrack.load(modelParams).then(lmodel => {
        // detect objects in the image.
        model = lmodel;
        document.getElementById('openWebcam').disabled = false;
        document.getElementById('ready').innerText = 'No. Model loaded but webcam feed required.';
    });
};

document.getElementById('loadModel').addEventListener('click', loadModel);
document.getElementById('openWebcam').addEventListener('click', openCam);
document.getElementById('closeWebcam').addEventListener('click', closeCam);

const attemptSubmission = e => {
    e.preventDefault();
    const command = document.getElementById('textCommand').value.toLowerCase();
    commandHandler(command);
};

const commandHandler = command => {
    if (navigationRules[command]) {
        validCommand(command);
        move(command);
    } else if (command === 'enter' && !entered) {
        validCommand(command);
        enter();
    } else if (command === 'exit' && entered) {
        validCommand(command);
        exit();
    } else {
        if (command === 'exit' || command === 'enter') {
            invalidCommand(command, true);
        } else {
            invalidCommand(command);
        }
    }
};

const validCommand = command => {
    document.getElementById('alert').classList.remove('alert');
    document.getElementById('alert').innerText = `Command valid. Attempting "${command}."`;
};

const invalidCommand = (command, already) => {
    document.getElementById('alert').classList.add('alert');
    const alert = already ? `"${command}" already issued as a command!` : `"${command}" not recognized as a command!`;
    document.getElementById('alert').innerText = `${alert} Try another. (Commands are: ${commandsList}.)`;
};

const lowConfidence = command => {
    document.getElementById('alert').classList.add('alert');
    document.getElementById(
        'alert'
    ).innerText = `We thought we heard "${command}" but aren't sure. Please try again! Possible commands are: ${commandsList}.`;
};

document.getElementById('form').addEventListener('submit', attemptSubmission);

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const SpeechGrammarList = window.SpeechGrammarList || window.webkitSpeechGrammarList;
const SpeechRecognitionEvent = window.SpeechRecognitionEvent || window.webkitSpeechRecognitionEvent;

if (!SpeechRecognition) {
    document.getElementById('enableSpeech').setAttribute('disabled', true);
    document.getElementById(
        'alert'
    ).innerText = `Speech recognition is disabled on your browser or device. (A default on Firefox). You may need to enable Web Speech API's "SpeechRecognition" in your browser settings to continue.`;
} else {
    const commands = Object.keys(navigationRules);
    commands.push('enter');
    commandsList = commands.join(', ');

    const recognition = new SpeechRecognition();
    if (SpeechGrammarList) {
        const speechRecognitionList = new SpeechGrammarList();
        const grammar = '#JSGF V1.0; grammar colors; public <color> = ' + commands.join(' | ') + ' ;';
        speechRecognitionList.addFromString(grammar, 1);
        recognition.grammars = speechRecognitionList;
    }
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    const enableSpeech = () => {
        recognition.start();
        document.getElementById('alert').classList.remove('alert');
        document.getElementById('alert').innerText = `Ready! Please speak a command.`;
    };

    document.getElementById('enableSpeech').addEventListener('click', enableSpeech);

    recognition.onresult = event => {
        const command = event.results[0][0].transcript;
        if (+event.results[0][0].confidence >= 0.65) {
            commandHandler(command);
        } else {
            lowConfidence(command);
        }
    };

    recognition.onspeechend = function () {
        recognition.stop();
    };
}

const setGeometryData = () => {
    const currentWidth = +document.getElementById('chart').getBoundingClientRect().width;
    scale = currentWidth / 1200;
    const xAdjust = (1200 - currentWidth) / 2;
    const entryButton = document.querySelector('.dn-entry-button');
    const buttonRect = entryButton.getBoundingClientRect();
    const yAdjust = +buttonRect.height / (scale * 2) - 9;
    const buttonXAdjust = (buttonRect.width * scale * (1 / scale) - buttonRect.width * scale) / 2;
    document.querySelector('.dn-wrapper').style.transform = `scale(${scale}) translate(${-xAdjust}px,${-yAdjust}px)`;
    entryButton.style.transform = `scale(${1 / scale}) translate(${buttonXAdjust}px,0px)`;
};

let resizeTimer;
window.onresize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(setGeometryData, 50);
};

setGeometryData();
