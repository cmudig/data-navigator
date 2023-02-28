import { dataNavigator, describeNode } from "./data-navigator";

const dimensions = {
    category: "abc",
    group: "xyz",
    series: "ijk",
    level: "012"
}

// input data
let dataUsedInChart = {}

// options for element descriptions
const descriptionOptions = {
    omitKeyNames: false,
}

const rects = document.querySelectorAll('rect')
const prepDatum = rect => {
    if (rect) {
        const x = rect.id.substring(4)
        return {
            x,
            d: {
                category: x.substring(0,1),
                group: x.substring(1,2),
                series: x.substring(2,3),
                level: x.substring(3,4),
                id: rect.id
            }
        }
    }
    return
}
rects.forEach(rect => {
    if (rect.id.includes('ref-')) {
        const prepped = prepDatum(rect)
        const x = prepped.x
        const d = prepped.d
        const findNeighbor = (id) => {
            return document.getElementById(`ref-${id}`)
        }

        const moveValue = (key, change) => {
            const i = dimensions[key].indexOf(d[key])
            let newCode = ''
            if (i + change > -1 && i + change < 3) {
                const newValue = dimensions[key].substring(
                    i + change,
                    i + change + 1
                )

                newCode = x.replace(d[key], newValue)
            }
            return findNeighbor(newCode) ? newCode : ''
        }
        const left = moveValue('series', -1)
        const right = moveValue('series', +1)
        const up = moveValue('category', -1)
        const down = moveValue('category', +1)
        const forward = moveValue('group', -1)
        const backward = moveValue('group', +1)
        const parent = x === 'byj1' || x === 'byj2' ? moveValue('level', -1) : '' // x === 'byj0' ? 'dn-entry-button-data-navigator-schema'  : ''
        const child = x === 'byj1' || x === 'byj0' ? moveValue('level', +1) : ''
        const edges = []
        if (left) {
            edges.push({
                direction: -1,
                dimension: "series",
                id: left,
                d: {
                    ...prepDatum(findNeighbor(left)).d,
                },
            })
        }
        if (right) {
            edges.push({
                direction: 1,
                dimension: "series",
                id: right,
                d: {
                    ...prepDatum(findNeighbor(right)).d,
                },
            })
        }
        if (up) {
            edges.push({
                direction: -1,
                dimension: "category",
                id: up,
                d: {
                    ...prepDatum(findNeighbor(up)).d,
                },
            })
        }
        if (down) {
            edges.push({
                direction: 1,
                dimension: "category",
                id: down,
                d: {
                    ...prepDatum(findNeighbor(down)).d,
                },
            })
        }
        if (forward) {
            edges.push({
                direction: 1,
                dimension: "group",
                id: forward,
                d: {
                    ...prepDatum(findNeighbor(forward)).d,
                },
            })
        }
        if (backward) {
            edges.push({
                direction: -1,
                dimension: "group",
                id: backward,
                d: {
                    ...prepDatum(findNeighbor(backward)).d,
                },
            })
        }
        if (parent) {
            edges.push({
                direction: -1,
                dimension: "level",
                id: parent,
                d: {
                    ...prepDatum(findNeighbor(parent)).d,
                },
            })
        }
        if (child) {
            edges.push({
                direction: 1,
                dimension: "level",
                id: child,
                d: {
                    ...prepDatum(findNeighbor(child)).d,
                },
            })
        }
        dataUsedInChart[x] = {
            d,
            x: +rect.getAttribute('x') - 2,
            y: +rect.getAttribute('y') - 2,
            width: +rect.getAttribute('width'),
            height: +rect.getAttribute('height'),
            ref: "ref-" + x,
            id: x,
            cssClass: "dn-test-class",
            edges,
            // lr: [left, right], // left/right, left/right arrows
            // ud: [up, down], // up/down, up/down arrows
            // fb: [forward, backward], // backward/forward, comma/period
            // pc: [parent, child], // first parent/first child, escape/enter
            description: describeNode(d, descriptionOptions),
            // semantics: "node", //  collection root, list root, list item, menu, button, hyperlink, toggle, multi-select?, search?
        }
    }
})
console.log("dataUsedInChart",dataUsedInChart)
console.log("keys",Object.keys(dataUsedInChart))

// options for transforming
// let transformOptions = {
//     data: dataUsedInChart,
//     lrVariable: "series", // left/right
//     udVariable: "category", // up/down
//     fbVariable: "group", // back/forward
//     pcVariable: "level", // parent/child
//     refVariable: "id", // if an element exists
//     flow: "sequential", // "circular"
//     cssClass: "dn-node",
//     // htmlAddition: "<div class=''></div>",
//     description: d => { return dataNavigator.describe(d, descriptionOptions) }, // by default will throw an error if unspecified
//     x: "", // if no refVariable, then x can be specified
//     y: "", // if no refVariable, then y can be specified
//     width: "", // if no refVariable, then width can be specified
//     height: "", // if no refVariable, then height can be specified
//     idPrefix: ""
// }
// create transformed data
// const transformedData = dataNavigator.transformData(transformOptions)

// options for building
// {
//     data: dataUsedInChart, // required
//     id: 'data-navigator-schema', // required
//     root: {
//         cssClass: "",
//         width: 0,
//         height: 0,
//     },
//     node: {
//         cssClass: "",
//     },
//     options: {
//         rendering: "full", // "on-demand"
//         manualEventHandling: false // default is false/undefined
//         firstNode: 'byj1',
//     },
//     navigation: {
//         x
//     }
// }
let buildOptions = {
    data: dataUsedInChart, // required
    id: 'data-navigator-schema', // required
    firstNode: 'byj1',
    rendering: "on-demand", // "full"
    manualEventHandling: false, // default is false/undefined
    root: {
        cssClass: "",
        width: "100%",
        height: 0,
    },
    navigation: {
        leftRight: {
            key: "series",
            // flow: "terminal", // could also have circular here (defaults to terminal)
            rebindKeycodes: {
                left: "KeyA",
                right: "KeyD"
            },
        },
        upDown: {
            key: "category",
            // flow: "terminal", // could also have circular here (defaults to terminal)
            rebindKeycodes: {
                up: "KeyW",
                down: "KeyS"
            }
        },
        backwardForward: {
            key: "group",
            // flow: "terminal", // could also have circular here (defaults to terminal)
            rebindKeycodes: {
                forward: "KeyE",
                backward: "KeyQ"
            }
        },
        parentChild: {
            key: "level",
            // flow: "terminal", // could also have circular here (defaults to terminal)
        }
    },
    hooks: {
        navigation: d => {
            // either a valid keypress is about to trigger navigation (before)
            // or navigation has just finished
            // provide another function to interrupt? hmmm...
            console.log("navigating",d)
        },
        focus: d => {
            // focus has just finished
            console.log("focus",d)
        },
        selection: d => {
            // selection event has just finished
            console.log("selection",d)
        },
        keydown: d => {
            // a keydown event has just happened (most expensive hook)
            console.log("keydown",d)
        },
        pointerClick: d => {
            // the whole nav region has received a click
            // ideally, we could send the previous focus point and maybe an x/y coord for the mouse?
            console.log("clicked",d)
        }
    }
}

// category: "abc",
// group: "xyz",
// series: "ijk",
// level: "012"

// create data navigator
const dn = dataNavigator(buildOptions)
console.log(dn)

document.getElementById("root").appendChild(dn.build())

window.dn = dn

const touchHandler = new Hammer(document.body, {});
touchHandler.get('pinch').set({ enable: false });
touchHandler.get('rotate').set({ enable: false });
touchHandler.get('pan').set({ enable: false });
touchHandler.get('swipe').set({ direction: Hammer.DIRECTION_ALL, velocity: 0.2 });

touchHandler.on('press', (ev) => {
    // console.log("pressing!", ev)
    // dn.enter()
})
touchHandler.on('pressup', (ev) => {
    // console.log("pressed!", ev)
    dn.enter()
})
touchHandler.on('swipe', (ev) => {
	// console.log(ev);
	// console.log(ev.direction);
    // two finger scrub to escape?
    // press and hold to escape?
    // press and hold for single button menu?
    // exit, repeat, select, move (right/left, up/down, forward/backward, parent/child)
    // left
    // right
    // up
    // down
    // backward
    // forward
    // parent
    // child
    const larger = Math.abs(ev.deltaX) > Math.abs(ev.deltaY) ? "X" : "Y"
    // const smaller = ev.deltaX <= ev.deltaY ? ev.deltaX : ev.deltaY
    const ratio = (Math.abs(ev["delta" + larger]) + 0.000000001) / (Math.abs(ev["delta" + (larger === "X" ? "Y" : "X")]) + 0.000000001)
    const left = ev.deltaX < 0
    const right = ev.deltaX > 0
    const up = ev.deltaY < 0
    const down = ev.deltaY > 0
    const direction = ratio > 0.99 && ratio <= 2 ?
        (right && up ? "forward" :
        right && down ? "child" :
        left && down ? "backward" :
        left && up ? "parent" : null) :
        right && larger === 'X' ? "right" :
        down && larger === 'Y' ? "down" :
        left && larger === 'X' ? "left" :
        up && larger === 'Y' ? "up" :
        null
    if (dn.getCurrentFocus() && direction) {
        dn.move(direction)
    }
});