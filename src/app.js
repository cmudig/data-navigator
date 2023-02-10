import { dataNavigator } from "./data-navigator";

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

rects.forEach(rect => {
    if (rect.id.includes('ref-')) {
        const x = rect.id.substring(4)
        console.log(x)
        const d = {
            category: x.substring(0,1),
            group: x.substring(1,2),
            series: x.substring(2,3),
            level: x.substring(3,4),
            id: rect.id
        }
        const findNeighbor = (id) => {
            return document.getElementById(`ref-${id}`)
        }
        
        console.log(dimensions.series.indexOf(d.series-1))
        console.log(x.replace(d.series, 
            dimensions.series.substring(dimensions.series.indexOf(d.series-1),dimensions.series.indexOf(d.series-1)+1)))

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
        dataUsedInChart[x] = {
            d,
            x: +rect.getAttribute('x') - 2,
            y: +rect.getAttribute('y') - 2,
            width: +rect.getAttribute('width'),
            height: +rect.getAttribute('height'),
            ref: "ref-" + x,
            id: x,
            cssClass: "dn-test-class",
            lr: [left, right], // left/right, left/right arrows
            ud: [up, down], // up/down, up/down arrows
            fb: [forward, backward], // backward/forward, comma/period
            pc: [parent, child], // first parent/first child, escape/enter
            description: dataNavigator.describe(d, descriptionOptions),
            semantics: "node", //  collection root, list root, list item, menu, button, hyperlink, toggle, multi-select?, search?
        }
        console.log(dataUsedInChart[x])
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
let buildOptions = {
    data: dataUsedInChart, // required
    firstNode: 'byj1',
    id: 'data-navigator-schema', // required
    rendering: "full", // "on-demand"
    style: "width: 100%,", // optional, css rules, anything goes
    manualEventHandling: false // default is false/undefined
}

// create data navigator
let dn = dataNavigator.build(buildOptions)

document.getElementById("root").appendChild(dn)