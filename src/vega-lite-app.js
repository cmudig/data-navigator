import { dataNavigator, describeNode } from './data-navigator';
console.log('yo');

// vega-lite
// {
//     "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
//     "description": "A scatterplot showing horsepower and miles per gallons for various cars.",
//     "data": {"url": "data/cars.json"},
//     "mark": "point",
//     "encoding": {
//       "x": {"field": "Horsepower", "type": "quantitative"},
//       "y": {"field": "Miles_per_Gallon", "type": "quantitative"}
//     },
//     "config": {}
//   }

// input data
let dataUsedInChart = {};
// dataUsedInChart[x] = {
//     d,
//     x: +rect.getAttribute('x') - 2,
//     y: +rect.getAttribute('y') - 2,
//     width: +rect.getAttribute('width'),
//     height: +rect.getAttribute('height'),
//     ref: "ref-" + x,
//     id: x,
//     cssClass: "dn-test-class",
//     edges,
//     // lr: [left, right], // left/right, left/right arrows
//     // ud: [up, down], // up/down, up/down arrows
//     // fb: [forward, backward], // backward/forward, comma/period
//     // pc: [parent, child], // first parent/first child, escape/enter
//     description: describeNode(d, descriptionOptions),
//     // semantics: "node", //  collection root, list root, list item, menu, button, hyperlink, toggle, multi-select?, search?
// }

// // options for element descriptions
// const descriptionOptions = {
//     omitKeyNames: false,
// }

let buildOptions = {
  data: dataUsedInChart, // required
  id: 'data-navigator-schema', // required
  firstNode: 'byj1',
  rendering: 'on-demand', // "full"
  manualEventHandling: false, // default is false/undefined
  root: {
    cssClass: '',
    width: '100%',
    height: 0
  },
  navigation: {
    leftRight: {
      key: 'series',
      // flow: "terminal", // could also have circular here (defaults to terminal)
      rebindKeycodes: {
        left: 'KeyA',
        right: 'KeyD'
      }
    },
    upDown: {
      key: 'category',
      // flow: "terminal", // could also have circular here (defaults to terminal)
      rebindKeycodes: {
        up: 'KeyW',
        down: 'KeyS'
      }
    },
    backwardForward: {
      key: 'group',
      // flow: "terminal", // could also have circular here (defaults to terminal)
      rebindKeycodes: {
        forward: 'KeyE',
        backward: 'KeyQ'
      }
    },
    parentChild: {
      key: 'level'
      // flow: "terminal", // could also have circular here (defaults to terminal)
    }
  },
  hooks: {
    navigation: d => {
      // either a valid keypress is about to trigger navigation (before)
      // or navigation has just finished
      // provide another function to interrupt? hmmm...
      console.log('navigating', d);
    },
    focus: d => {
      // focus has just finished
      console.log('focus', d);
    },
    selection: d => {
      // selection event has just finished
      console.log('selection', d);
    },
    keydown: d => {
      // a keydown event has just happened (most expensive hook)
      console.log('keydown', d);
    },
    pointerClick: d => {
      // the whole nav region has received a click
      // ideally, we could send the previous focus point and maybe an x/y coord for the mouse?
      console.log('clicked', d);
    }
  }
};

// create data navigator
const dn = dataNavigator(buildOptions);

document.getElementById('root').appendChild(dn.build());

window.dn = dn;

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
