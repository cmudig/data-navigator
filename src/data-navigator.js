import { defaultKeyBindings } from "./keycodes";

dataNavigator.transformData = (options) => {
    console.log("transforming!", options)
    // need to convert to a graph structure!
    // https://adrianmejia.com/data-structures-for-beginners-graphs-time-complexity-tutorial/
    // should probably save each item as a hash? array? hmmm....
    
    // options:
    // {
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
    const hashes = {}
    let outputData = {
        "byj1": { 
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
            cssClass: "dn-node",
            lr: ["byi1", "byk1"], // left/right, left/right arrows
            ud: ["ayj1", "cyj1"], // up/down, up/down arrows
            fb: ["bxj1", "bzj1"], // backward/forward, comma/period
            pc: ["byj0", "byj2"], // first parent/first child, escape/enter
            semantics: "node", //  collection root, list root, list item, menu, button, hyperlink, toggle, multi-select?, search?
            // also: control/command + z to undo last movement and control/command + shift + z to redo last movement
            // f1: menu or help button to pull up directions
            // spacebar: select
        }
    }

    return outputData
}

dataNavigator.build = (options) => {
    // to-do: remove any elements from previous build? lifecycle stuff?

    // NOTE: the keys are based on insertion order EXCEPT when keys are number-like (or parse to ints)
    // so if someone passes ids in that are "1" or "2", then those go first in numerical order
    let entryPoint = null
    if (options.data) {
        dataNavigator.currentOptions = options
        if (options.firstNode) {
            entryPoint = options.firstNode
        } else {
            entryPoint = Object.keys(options.data)[0]
        }
    } else {
        console.error("No data found, cannot enter: options.data must contain a valid hash object of data for dataNavigator.build")
        return
    }

    const enterSchema = ()=>{
        console.log("entry button clicked!", options)
        dataNavigator.move.to(entryPoint)
    }

    if (options.id) {
        // iterate over data? draw structure?
        console.log("building navigator!",options)

        // build root
        const root = document.createElement("div")
        root.id = "dn-root-" + options.id
        root.classList.add("dn-root")
        root.style.width = options.width || "100%"
        root.style.height = options.height

        // TO-DO: build interaction instructions/menu
        
        // build entry button
        const entry = document.createElement("button")
        entry.id = "dn-entry-button-" + options.id
        entry.classList.add("dn-entry-button")
        entry.innerText = `Enter navigation area`
        entry.addEventListener('click',enterSchema)
        root.appendChild(entry)

        // build the first node
        dataNavigator.prepNode(entryPoint)

       return root
    } else {
        console.error("No id found: options.id must be specified for dataNavigator.build")
        return
    }

}

dataNavigator.prepNode = (id, previousId) => {
    const options = dataNavigator.currentOptions
    const node = document.createElement('figure') // subject to change based on new props
    node.setAttribute('role','figure')
    node.id = id
    node.classList.add('dn-node')
    if (options.data[id].cssClass) {
        node.classList.add(options.data[id].cssClass)
    }
    node.style.width = parseFloat(options.data[id].width || "0") + "px"
    node.style.height = parseFloat(options.data[id].height || "0") + "px"
    node.style.left = parseFloat(options.data[id].x || "0") + "px"
    node.style.top = parseFloat(options.data[id].y || "0") + "px"
    node.setAttribute('tabindex','-1')
    node.addEventListener('keydown',dataNavigator.handleKeydownInteraction)
    node.addEventListener('focus',dataNavigator.handleFocusInteraction)

    const nodeText = document.createElement('div')
    console.log(id)
    nodeText.setAttribute('role','img') // subject to change based on new props
    nodeText.classList.add('dn-node-text')
    if (options.showText) {
        nodeText.innerText = options.data[id].description
    }
    
    nodeText.setAttribute('aria-label',options.data[id].description)

    node.appendChild(nodeText)
    root.appendChild(node)

    if (previousId) {
        const oldNode = document.getElementById(previousId)
        dataNavigator.currentFocus = id
        node.focus()

        oldNode.removeEventListener('keydown',dataNavigator.handleKeydownInteraction)
        oldNode.removeEventListener('focus',dataNavigator.handleFocusInteraction)
        oldNode.remove()
    }
}

dataNavigator.listeners = {}
dataNavigator.move = {}

dataNavigator.listeners.key = () => {}
dataNavigator.listeners.touch = () => {}

dataNavigator.describe = (d, options) => {
    console.log("describing", d)
    console.log("describe options", options)
    const keys = Object.keys(d)
    let description = ""
    keys.forEach(key => {
        description += `${options.omitKeyNames ? '' : key + ': '}${d[key]}.`
    })
    description += options.semanticLabel || " Data point."
    return description
}
dataNavigator.move.to = (id) => {
    const target = document.getElementById(id)
    if (target) {
        console.log("moving to target!", target)
        dataNavigator.currentFocus = id
        target.focus()
    }
}
dataNavigator.move.inDirection = (direction) => {
    if (dataNavigator.currentFocus) {
        const d = dataNavigator.currentOptions.data[dataNavigator.currentFocus]
        const target = direction === 'left' ? d.lr[0] :
            direction === 'right' ? d.lr[1] :
            direction === 'up' ? d.ud[0] :
            direction === 'down' ? d.ud[1] :
            direction === 'forward' ? d.fb[0] :
            direction === 'backward' ? d.fb[1] :
            direction === 'parent' ? d.pc[0] :
            direction === 'child' ? d.pc[1] : null
        console.log("currentFocus",dataNavigator.currentFocus)
        console.log("direction",direction)
        console.log('d',d)
        console.log('target',target)
        if (target) {
            dataNavigator.prepNode(target, dataNavigator.currentFocus)
        }
    }
}
dataNavigator.move.left = () => {
    dataNavigator.move.inDirection('left')
}
dataNavigator.move.right = () => {
    dataNavigator.move.inDirection('right')
}
dataNavigator.move.up = () => {
    dataNavigator.move.inDirection('up')
}
dataNavigator.move.down = () => {
    dataNavigator.move.inDirection('down')
}
dataNavigator.move.forward = () => {
    dataNavigator.move.inDirection('forward')
}
dataNavigator.move.backward = () => {
    dataNavigator.move.inDirection('backward')
}
dataNavigator.move.toParent = () => {
    dataNavigator.move.inDirection('parent')
}
dataNavigator.move.toFirstChild = () => {
    dataNavigator.move.inDirection('child')
}
dataNavigator.currentFocus = null
dataNavigator.currentOptions = null
dataNavigator.handleKeydownInteraction = (e) => {
    console.log('key down', e)
    const direction = dataNavigator.keyBindings[e.code]
    if (direction) {
        e.preventDefault()
        dataNavigator.move.inDirection(direction)
    }
}
dataNavigator.handleFocusInteraction = (e) => {
    console.log('focus', e)
    /* On focus:
        remove events from previous location 
        calculate x/y/width/height on focus
        add events to focused element
    */
}
dataNavigator.select = () => {}
dataNavigator.escape = () => {}
dataNavigator.undo = () => {}
dataNavigator.redo = () => {}
dataNavigator.keyBindings = defaultKeyBindings
window.dn = dataNavigator

