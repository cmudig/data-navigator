import { structure } from './structure';
import { input } from './input';
import { rendering } from './rendering';

export const stateHandler = stateOptions => {
    let currentFocus;
    let previousFocus;
    dn.getCurrentFocus = () => {
        return currentFocus;
    };

    dn.getPreviousFocus = () => {
        return previousFocus;
    };
};

export const dataNavigator = {
    structure,
    input,
    rendering
};

// {
//     data: {
//         nodes,
//         edges // required
//     },
//     entryPoint: 'title',
//     id: 'data-navigator-schema', // required
//     rendering: 'on-demand', // "full"
//     manualEventHandling: false, // default is false/undefined
//     root: {
//         id: 'root',
//         cssClass: '',
//         width: '100%',
//         height: 0
//     },
//     navigation: navRules,
//     hooks: {}
// }
// --------------------------
// New stuff:
//
// the navigation abstraction
// (the graph i.e. nodes and edges, and navigation rules), the input abstraction
// (dn.move()), and the rendering / overlay abstraction (x / y / width / height /
// path).

// structure = dn.structure({
//     data: [],
//     ...options
// })

// input = dn.input({
//     structure,
//     rules: {},
//     entryPoint: "",
//     exitPoint: ""
// })

// rendering = dn.rendering({
//     elementData: {},
//     defaults: (elementData, visualElement) => {} || {
//         dimensions: {
//             x: () => {},
//             y: {},
//             width: {},
//             height: {},
//             path: ""
//         },
//         cssClass: "",
//         semantics: {
//             label: "",
//             elementType: {},
//             attributes: {}
//         },
//         parentSemantics: {
//             includeWrapper: bool,
//             label: "",
//             elementType: "",
//             attributes: {}
//         },
//         visualId: ""
//     },
//     id: 'data-navigator-schema', // what is this?
//     rootStyling: {
//         cssClass: '',
//         width: '100%',
//         height: 0
//     }
// })
