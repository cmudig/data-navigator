import { defaultKeyBindings } from "./keycodes";

export const dataNavigator = (options) => {
    // local variables
    let dn = {}
    let currentFocus = null
    let entryPoint = null
    let keyBindings = defaultKeyBindings
    let root = null
    let directions = {
        down: {
            axis: "upDown",
            keyCode: "",
            direction: 1
        },
        left: {
            axis: "leftRight",
            keyCode: "",
            direction: -1
        },
        right: {
            axis: "leftRight",
            keyCode: "",
            direction: 1
        },
        up: {
            axis: "upDown",
            keyCode: "",
            direction: -1
        },
        backward: {
            axis: "backwardForward",
            keyCode: "",
            direction: -1
        },
        child: {
            axis: "parentChild",
            keyCode: "",
            direction: 1
        },
        parent: {
            axis: "parentChild",
            keyCode: "",
            direction: -1
        },
        forward: {
            axis: "backwardForward",
            keyCode: "",
            direction: 1
        }
    }

    // local methods
    const handleKeydownInteraction = (e) => {
        const direction = keyBindings[e.code]
        if (direction) {
            e.preventDefault()
            dn.move(direction)
        }
    }
    const handleFocusInteraction = (e) => {
        console.log('focus', e)
        /* On focus:
            remove events from previous location 
            calculate x/y/width/height on focus
            add events to focused element
        */
    }
    const buildNode = (id) => {
        // const options = dn.currentOptions
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
        node.addEventListener('keydown',handleKeydownInteraction)
        node.addEventListener('focus',handleFocusInteraction)

        const nodeText = document.createElement('div')
        nodeText.setAttribute('role','img') // subject to change based on new props
        nodeText.classList.add('dn-node-text')
        if (options.showText) {
            nodeText.innerText = options.data[id].description
        }
        
        nodeText.setAttribute('aria-label',options.data[id].description)

        node.appendChild(nodeText)
        root.appendChild(node)
        return node
    }

    const focusNode = id => {
        const node = document.getElementById(id)
        if (node) {
            currentFocus = id
            console.log("focusing",id,node)
            node.focus()
        }
    }

    const deleteNode = id => {
        const node = document.getElementById(id)
        if (node) {
            node.removeEventListener('keydown',handleKeydownInteraction)
            node.removeEventListener('focus',handleFocusInteraction)
            node.remove()
        }
    }

    const initiateNodeLifeCycle = (newId, oldId) => {
        buildNode(newId)
        focusNode(newId)
        deleteNode(oldId)
    }

    // exported methods with dn object
    // organized by: getCurrentFocus, setNavigationKeyBindings, build, move, and then events (hooks)
    dn.getCurrentFocus = () => {
        return currentFocus
    }
    
    dn.setNavigationKeyBindings = (navKeyBindings) => {
        Object.keys(keyBindings).forEach(key=> {
            // directions = {
            //     down: "",
            //     left: "",
            //     right: "",
            //     up: "",
            //     backward: "",
            //     child: "",
            //     parent: "",
            //     forward: ""
            // }
            directions[keyBindings[key]].keyCode = key
        })
        if (navKeyBindings) {
            Object.keys(navKeyBindings).forEach(navKey => {
                const navOption = navKeyBindings[navKey]
                if (navOption.rebindKeycodes) {
                    Object.keys(navOption.rebindKeycodes).forEach(rebind => {
                        directions[rebind].keyCode = navOption.rebindKeycodes[rebind]
                    })
                }
            })
        }
        keyBindings = {}
        Object.keys(directions).forEach(key=> {
            keyBindings[directions[key].keyCode] = key
        })
    }

    dn.build = () => {
        // to-do: remove any elements from previous build? lifecycle stuff?

        // NOTE: the keys are based on insertion order EXCEPT when keys are number-like (or parse to ints)
        // so if someone passes ids in that are "1" or "2", then those go first in numerical order
        if (options.data) {
            // dn.currentOptions = options
            if (options.firstNode) {
                entryPoint = options.firstNode
            } else {
                entryPoint = Object.keys(options.data)[0]
            }
        } else {
            console.error("No data found, cannot enter: options.data must contain a valid hash object of data for dn.build")
            return
        }

        if (options.id) {
            console.log("building navigator!",options)

            // build root
            root = document.createElement("div")
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
            entry.addEventListener('click',dn.enter)
            root.appendChild(entry)

            dn.setNavigationKeyBindings(options.navigation)

            // build the whole structure, if props sent
            // buildNode(entryPoint)

        return root
        } else {
            console.error("No id found: options.id must be specified for dataNavigator.build")
            return
        }

    }

    dn.move = (direction) => {
        if (currentFocus) {
            const d = options.data[currentFocus] // dn.currentOptions.data[currentFocus]
            // const target = direction === 'left' ? d.lr[0] :
            //     direction === 'right' ? d.lr[1] :
            //     direction === 'up' ? d.ud[0] :
            //     direction === 'down' ? d.ud[1] :
            //     direction === 'forward' ? d.fb[0] :
            //     direction === 'backward' ? d.fb[1] :
            //     direction === 'parent' ? d.pc[0] :
            //     direction === 'child' ? d.pc[1] : null
            if (d.edges) {
                let target = null
                let i = 0
                const x = directions[direction]
                const axis = x.axis
                const hasNavigationRules = options.navigation[axis] // dn.currentOptions.navigation[axis]

                if (hasNavigationRules) {
                    const dimension = hasNavigationRules.key
                    for (i = 0; i < d.edges.length; i++) {
                        const edge = d.edges[i]
                        if (dimension === edge.dimension && edge.direction === x.direction) {
                            target = edge.id
                            break
                        }
                    }
                    if (target) {
                        initiateNodeLifeCycle(target, currentFocus)
                    }
                }
            }
        }
    }
    dn.moveTo = (id) => {
        const target = document.getElementById(id)
        if (target) {
            currentFocus = id
            target.focus()
        } else {
            initiateNodeLifeCycle(id, currentFocus)
        }
    }
    dn.enter = () => {
        dn.moveTo(entryPoint)
    }

    // dn.select = () => {}
    // dn.escape = () => {}
    // dn.undo = () => {}
    // dn.redo = () => {}
    dn.hooks = {}
    dn.hooks.navigation = () => {}
    dn.hooks.focus = () => {}
    dn.hooks.selection = () => {}
    dn.hooks.keydown = () => {}
    dn.hooks.pointerClick = () => {}
    return dn
}

export const describeNode = (d, descriptionOptions) => {
    const keys = Object.keys(d)
    let description = ""
    keys.forEach(key => {
        description += `${descriptionOptions.omitKeyNames ? '' : key + ': '}${d[key]}. `
    })
    description += descriptionOptions.semanticLabel || "Data point."
    return description
}

export const transformData = (options) => {
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
    //     description: d => { return dn.describe(d, descriptionOptions) }, // by default will throw an error if unspecified
    //     x: "", // if no refVariable, then x can be specified
    //     y: "", // if no refVariable, then y can be specified
    //     width: "", // if no refVariable, then width can be specified
    //     height: "", // if no refVariable, then height can be specified
    //     idPrefix: ""
    // }
    return {}
}
