import { dataNavigator } from "./data-navigator";

// input data
let dataUsedInChart = [
    // {
    //     category: "b",
    //     group: "y",
    //     series: "j",
    //     level: "1",
    //     id: "ref-byj1"
    // }
]

const rects = document.querySelectorAll('rect')

rects.forEach(rect => {
    if (rect.id.includes('ref-')) {
        const x = rect.id.substring(4)
        console.log(x)
        dataUsedInChart.push({
            category: x.substring(0,1),
            group: x.substring(1,2),
            series: x.substring(2,3),
            level: x.substring(3,4),
            id: rect.id
        })
    }
})

// options for element descriptions
const descriptionOptions = {
    omitKeyNames: false,
}

// options for transforming
let transformOptions = {
    data: dataUsedInChart,
    lrVariable: "series", // left/right
    udVariable: "category", // up/down
    fbVariable: "group", // back/forward
    pcVariable: "level", // parent/child
    refVariable: "id", // if an element exists
    flow: "sequential", // "circular"
    cssClass: "dn-node",
    // htmlAddition: "<div class=''></div>",
    description: d => { return dataNavigator.describe(d, descriptionOptions) }, // by default will throw an error if unspecified
    x: "", // if no refVariable, then x can be specified
    y: "", // if no refVariable, then y can be specified
    width: "", // if no refVariable, then width can be specified
    height: "", // if no refVariable, then height can be specified
    idPrefix: ""
}
// create transformed data
console.log(dataNavigator)
const transformedData = dataNavigator.transformData(transformOptions)

// options for building
let buildOptions = {
    data: transformedData, // required
    id: 'data-navigator-schema', // required
    rendering: "full", // "on-demand"
    style: "width: 100%,", // optional, css rules, anything goes
    manualEventHandling: false // default is false/undefined
}

// create data navigator
let dn = dataNavigator.build(buildOptions)

document.getElementById("root").appendChild(dn)