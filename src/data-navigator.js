import { keyCodes } from "./keycodes";

console.log("keyCodes",keyCodes)

export const dataNavigator = {}

dataNavigator.transformData = (options) => {
    console.log("transforming!", options)
    // stuff happens! (we change input to output)
    let outputData = [
        { 
            d: {
                value: 5,
                category: "b",
                group: "y",
                series: "j",
                level: "1",
                id: "ref-byj1"
            },
            // x: 40, // these should all be calculated on focus
            // y: 0,
            // width: 
            // height: 
            ref: "ref-byj1",
            id: "byj1",
            lr: ["byi1", "byk1"], // left/right, left/right arrows
            ud: ["ayj1", "cyj1"], // up/down, up/down arrows
            fb: ["bxj1", "bzj1"], // backward/forward, comma/period
            pc: ["byj0", "byj2"], // first parent/first child, escape/enter
            semantics: "node", //  collection root, list root, list item, menu, button, hyperlink, toggle, multi-select?, search?
            // also: control/command + z to undo last movement and control/command + shift + z to redo last movement
            // f1: menu or help button to pull up directions
            // spacebar: select
        }//,
        // { 
        //     d: {
        //         value: 2,
        //         category: "b",
        //         group: "y",
        //         series: "k",
        //         level: "1",
        //         id: "ref-byk1"
        //     },
        //     ref: "ref-byk1",
        //     id: "byk1",
        //     lr: ["byj1", ""],
        //     ud: ["", ""],
        //     fb: ["", ""],
        //     pc: ["", ""],
        //     semantics: "node"
        // }
    ]

    return outputData
}

dataNavigator.build = (options) => {
    // remove any elements from previous build? lifecycle stuff?

    const enterSchema = ()=>{
        console.log("entry button clicked!", options)
        if (options.data) {
            dataNavigator.move.to(options.data[0].id)
        } else {
            console.error("No data found, cannot enter: options.data must contain a valid array of data for dataNavigator.build")
        }
    }

    if (options.id) {
        // iterate over data? draw structure?
        console.log("building navigator!",options)

        // build root
        const root = document.createElement("div")
        root.id = "dn-root-" + options.id
        root.classList.add("dn-root")

        // TO-DO: build interaction instructions/menu
        
        // build entry point (button)
        const entry = document.createElement("button")
        entry.id = "dn-entry-button-" + options.id
        entry.classList.add("dn-entry-button")
        entry.innerText = `Enter navigation area`
        entry.addEventListener('click',enterSchema)
        root.appendChild(entry)

        // build the first node


        // add interactivity to it

        /* On focus (if on-demand):
            remove events from previous location 
            calculate x/y/width/height on focus
            add events to focused element
        */
        /* Else:
            render everything, add listeners to every element
        */
       return root
    } else {
        console.error("No id found: options.id must be specified for dataNavigator.build")
        return
    }

}

dataNavigator.listeners = {}
dataNavigator.move = {}

dataNavigator.listeners.key = () => {}
dataNavigator.listeners.touch = () => {}

dataNavigator.describe = (d, options) => {
    console.log("describing", d)
    console.log("describe options", options)
}
dataNavigator.move.to = (id) => {
    const target = document.getElementById(id)
    if (target) {
        console.log("moving to target!", target)
        dataNavigator.currentFocus = id
        target.focus()
    }
}
dataNavigator.move.left = () => {}
dataNavigator.move.right = () => {}
dataNavigator.move.up = () => {}
dataNavigator.move.down = () => {}
dataNavigator.move.forward = () => {}
dataNavigator.move.backward = () => {}
dataNavigator.move.toParent = () => {}
dataNavigator.move.toFirstChild = () => {}
dataNavigator.currentFocus = null
dataNavigator.select = () => {}
dataNavigator.escape = () => {}
dataNavigator.undo = () => {}
dataNavigator.redo = () => {}

