import { defaultKeyBindings } from "./keycodes";

export const dataNavigator = (options) => {
    let dn = {}
    let currentFocus = null
    let keyBindings = defaultKeyBindings
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
    /*
        new ideal api format:
        {
            data: { // required
                "id": {
                    d: {},
                    edges: [
                        {
                            source: "id",
                            target: "id",
                            weight: 1,
                            direction: "target"
                        }
                    ],
                    refVariable: "id", // if an element exists
                    x: "", // if no refVariable, then x can be specified
                    y: "", // if no refVariable, then y can be specified
                    width: "", // if no refVariable, then width can be specified
                    height: "", // if no refVariable, then height can be specified
                    cssClass: "",
                    description: d => { return dn.describe(d, descriptionOptions) } // defaults to describing all the keys with navigation rules set
                }
            },
            id: 'data-navigator-schema', // required
            root: {
                cssClass: "",
                width: 0,
                height: 0
            },
            node: {
                cssClass: "",
            },
            options: {
                rendering: "full", // "on-demand"
                manualEventHandling: false // default is false/undefined
                firstNode: 'byj1',
            },
            navigation: {
                leftRight: {
                    key: "series",
                    flow: "terminal", // could also have circular here (dhefaults to terminal)
                    rebindKeycodes: {
                        left: "",
                        right: ""
                    },
                    hooks: {
                        start: () => {},
                        complete: () => {}
                    }
                },
                upDown: {
                    key: "category",
                    flow: "terminal", // could also have circular here (dhefaults to terminal)
                    rebindKeycodes: {
                        up: "",
                        down: ""
                    },
                    hooks: {
                        start: () => {},
                        complete: () => {}
                    }
                },
                backwardForward: {
                    key: "group",
                    flow: "terminal", // could also have circular here (dhefaults to terminal)
                    rebindKeycodes: {
                        forward: "",
                        backward: ""
                    },
                    hooks: {
                        start: () => {},
                        complete: () => {}
                    }
                },
                parentChild: {
                    key: "level",
                    flow: "terminal", // could also have circular here (dhefaults to terminal)
                    rebindKeycodes: {
                        parent: "",
                        child: ""
                    },
                    hooks: {
                        start: () => {},
                        complete: () => {}
                    }
                }
            }
        }

    */

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
    //     rendering: "full", // "on-demand"
    //     manualEventHandling: false // default is false/undefined
    //     firstNode: 'byj1',
    //     navigation: {
    //         parentChild: {
    //             key: "level",
    //             flow: "terminal", // could also have circular here (dhefaults to terminal)
    //             rebindKeycodes: {
    //                 parent: "",
    //                 child: ""
    //             },
    //             hooks: {
    //                 start: () => {},
    //                 complete: () => {}
    //             }
    //         }
    //     }
    // }

    dn.transformData = (options) => {
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
        //     description: d => { return dn.describe(d, descriptionOptions) }, // by default will throw an error if unspecified
        //     x: "", // if no refVariable, then x can be specified
        //     y: "", // if no refVariable, then y can be specified
        //     width: "", // if no refVariable, then width can be specified
        //     height: "", // if no refVariable, then height can be specified
        //     idPrefix: ""
        // }
        return outputData
    }

    dn.build = () => {
        // to-do: remove any elements from previous build? lifecycle stuff?

        // NOTE: the keys are based on insertion order EXCEPT when keys are number-like (or parse to ints)
        // so if someone passes ids in that are "1" or "2", then those go first in numerical order
        let entryPoint = null
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

        const enterSchema = ()=>{
            console.log("entry button clicked!", options)
            dn.move.to(entryPoint)
        }

        if (options.id) {
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

            console.log("keyBindings",keyBindings)
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
            console.log("directions",directions)
            if (options.navigation) {
                Object.keys(options.navigation).forEach(navKey => {
                    const navOption = options.navigation[navKey]
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
            console.log("keybinds", keyBindings)

            // build the first node
            dn.prepNode(entryPoint)

        return root
        } else {
            console.error("No id found: options.id must be specified for dataNavigator.build")
            return
        }

    }

    dn.prepNode = (id, previousId) => {
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
        node.addEventListener('keydown',dn.handleKeydownInteraction)
        node.addEventListener('focus',dn.handleFocusInteraction)

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
            currentFocus = id
            node.focus()

            oldNode.removeEventListener('keydown',dn.handleKeydownInteraction)
            oldNode.removeEventListener('focus',dn.handleFocusInteraction)
            oldNode.remove()
        }
    }

    dn.listeners = {}
    dn.move = {}

    dn.listeners.key = () => {}
    dn.listeners.touch = () => {}

    dn.move.to = (id) => {
        const target = document.getElementById(id)
        if (target) {
            console.log("moving to target!", target)
            currentFocus = id
            target.focus()
        }
    }
    dn.move.inDirection = (direction) => {
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
                    console.log("dimension", dimension)
                    for (i = 0; i < d.edges.length; i++) {
                        const edge = d.edges[i]
                        console.log("edge",edge)
                        console.log("d",d)
                        // if (!(d.d[dimension] === edge[dimension]) && edge.direction === x.direction) {
                        if (dimension === edge.dimension && edge.direction === x.direction) {
                            target = edge.id
                            break
                        }
                    }
                    console.log("currentFocus",currentFocus)
                    console.log("direction",direction)
                    console.log('d',d)
                    console.log('target',target)
                    if (target) {
                        dn.prepNode(target, currentFocus)
                    }
                }
            }
        }
    }
    dn.move.left = () => {
        dn.move.inDirection('left')
    }
    dn.move.right = () => {
        dn.move.inDirection('right')
    }
    dn.move.up = () => {
        dn.move.inDirection('up')
    }
    dn.move.down = () => {
        dn.move.inDirection('down')
    }
    dn.move.forward = () => {
        dn.move.inDirection('forward')
    }
    dn.move.backward = () => {
        dn.move.inDirection('backward')
    }
    dn.move.toParent = () => {
        dn.move.inDirection('parent')
    }
    dn.move.toFirstChild = () => {
        dn.move.inDirection('child')
    }
    dn.handleKeydownInteraction = (e) => {
        const direction = keyBindings[e.code]
        if (direction) {
            e.preventDefault()
            dn.move.inDirection(direction)
        }
    }
    dn.handleFocusInteraction = (e) => {
        console.log('focus', e)
        /* On focus:
            remove events from previous location 
            calculate x/y/width/height on focus
            add events to focused element
        */
    }
    dn.select = () => {}
    dn.escape = () => {}
    dn.undo = () => {}
    dn.redo = () => {}
    return dn
}

export const describeNode = (d, descriptionOptions) => {
    console.log("describing", d)
    console.log("describe options", descriptionOptions)
    const keys = Object.keys(d)
    let description = ""
    keys.forEach(key => {
        description += `${descriptionOptions.omitKeyNames ? '' : key + ': '}${d[key]}.`
    })
    description += descriptionOptions.semanticLabel || " Data point."
    return description
}