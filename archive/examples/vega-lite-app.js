import { default as dataNavigator } from '../src/index.ts';
import { describeNode } from '../src/utilities.ts';

let view;
let spec;
let dn;
let entered;
let current;
let previous;
const getCurrent = () => current;
const getPrevious = () => previous;
const groupInclusionCriteria = (item, _i, _spec) => {
    return item.marktype && !(item.marktype === 'text'); // item.marktype !== 'group' && item.marktype !== 'text'
};
const itemInclusionCriteria = (_item, _i, group, _spec) => {
    return !(group.role === 'axis' || group.role === 'legend'); // true
};
const datumInclusionCriteria = (_key, _value, _d, _level, _spec) => {
    return true;
};
const nodeDescriber = (d, item, level) => {
    if (Object.keys(d).length) {
        return describeNode(d, {});
    } else {
        d.role = item.role;
        if (item.role === 'axis') {
            const ticks = item.items[0].items[0].items;
            const type =
                item.items[0].datum.scale === 'yscale' ? 'Y ' : item.items[0].datum.scale === 'xscale' ? 'X ' : '';
            return `${type}Axis. Values range from ${ticks[0].datum.label} to ${ticks[ticks.length - 1].datum.label}.`;
        } else if (item.role === 'mark') {
            return `${item.items.length} navigable data elements. Group. Enter using Enter Key.`;
        } else if (item.role === 'legend') {
            const labels = item.items[0].items[0].items[0].items[0].items;
            return `Legend: ${spec.legends[0].title}. Showing values from ${
                labels[0].items[1].items[0].datum.label
            } to ${labels[labels.length - 1].items[1].items[0].datum.label}.`;
        } else {
            return `${level}.`;
        }
    }
};

const initiateLifecycle = nextNode => {
    const node = dn.rendering.render({
        renderId: nextNode.renderId,
        datum: nextNode
    });
    node.addEventListener('keydown', e => {
        // myFunction(e) // could run whatever here, of course
        const direction = dn.input.keydownValidator(e);
        if (direction) {
            e.preventDefault();
            move(direction);
        }
    });
    node.addEventListener('blur', () => {
        entered = false;
    });
    // showTooltip(nextNode)
    dn.input.focus(nextNode.renderId); // actually focuses the element
    entered = true;
    previous = current;
    current = nextNode.id;
    if (previous) {
        dn.rendering.remove(dn.structure.nodes[previous].renderId);
    }
};

const enter = () => {
    const nextNode = dn.input.enter();
    if (nextNode) {
        entered = true;
        initiateLifecycle(nextNode);
    }
};

const move = direction => {
    const nextNode = dn.input.move(current, direction); // .moveTo does the same thing but only uses NodeId
    if (nextNode) {
        initiateLifecycle(nextNode);
    }
};

const exit = () => {
    entered = false;
    dn.rendering.exitElement.style.display = 'block';
    dn.input.focus(dn.rendering.exitElement.id); // actually focuses the element
    previous = current;
    current = null;
    dn.rendering.remove(previous);
};

fetch('https://vega.github.io/vega/examples/scatter-plot.vg.json')
    // fetch('https://vega.github.io/vega/examples/bar-chart.vg.json')
    .then(res => {
        return res.json();
    })
    .then(specification => {
        spec = specification;
        return render(specification);
    })
    .then(v => {
        const structure = dataNavigator.structure({
            dataType: 'vega-lite',
            vegaLiteView: v,
            vegaLiteSpec: spec,
            groupInclusionCriteria,
            itemInclusionCriteria,
            datumInclusionCriteria,
            keyRenamingHash: {},
            nodeDescriber,
            getCurrent,
            getPrevious,
            exitFunction: exit
        });

        const rendering = dataNavigator.rendering({
            elementData: structure.elementData,
            suffixId: 'data-navigator-schema',
            root: {
                id: 'view',
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
            structure: {
                nodes: structure.nodes,
                edges: structure.edges
            },
            navigationRules: structure.navigationRules,
            entryPoint: Object.keys(structure.nodes)[0],
            exitPoint: rendering.exitElement.id
        });

        dn = {
            structure,
            input,
            rendering
        };
        // window.dn = dn
        return dn;
    })
    .catch(err => console.error(err));

const render = spec => {
    view = new vega.View(vega.parse(spec), {
        renderer: 'canvas', // renderer (canvas or svg)
        container: '#view', // parent DOM container
        hover: true // enable hover processing
    });
    return view.runAsync();
};

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
