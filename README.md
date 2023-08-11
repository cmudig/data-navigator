# Data-Navigator

![Data Navigator provides visualization toolkits with rich, accessible navigation structures, robust input handling, and flexible, semantic rendering.](https://raw.githubusercontent.com/cmudig/data-navigator/main/assets/data_navigator.png)

Data Navigator is a JavaScript library that allows for navigation of data structures. Data Navigator makes png, svg, canvas, and even webgl graphics accessible to a wide array of assistive technologies and input modalities.

Data Navigator has abstracted navigation into commands, which enables it to easily receive input from screen readers and keyboards to more interesting modalities like touch and mouse swiping, spoken commands, hand gestures, and even fabricated or totally novel interfaces, like bananas.

![Image in two parts. First part: Inputs: A. Hand swiping. B: Speaking "left." C. A hand gesture on camera. D. Bananas. Second part: Output: (focus moves left) A focus indicator has moved on a bar chart from one stacked bar to another on its left.](https://raw.githubusercontent.com/cmudig/data-navigator/main/assets/inputs.png)

Data Navigator is expressive for builders and enables entire toolkits or ecosystems to become more accessible. The system provides low-level control over narratives, interaction paths, and journeys a user might want to take through an image or graphic.

Developers can build schemas that scale to work with any chart in a charting library or a single, bespoke implemetation for use in story-telling contexts like journalism, reports, presentations, and interactive infographics.

![Image in two parts. First part: A schema for navigation that works with any stacked bar chart. Great for libraries! A complex schema is shown over a stacked bar chart with up, down, left, and right directions. Second part: A bespoke, guided journey through a visual. Great for storytelling! A simple navigation path is shown going through the image.](https://raw.githubusercontent.com/cmudig/data-navigator/main/assets/journey.png)

Not only are paths through an image customizeable but so are the visual indications that are rendered alongside those journeys. These visual indications use semantically rich, native HTML elements for maximized accessibility.

![Code used to render a path that looks like an outline and then place that outline over visual elements on a data visualization.](https://raw.githubusercontent.com/cmudig/data-navigator/main/assets/path.png)

Visit [our landing page](http://dig.cmu.edu/data-navigator/) to try our demo, which shows a png image made into navigable experience. A variety of input modalities are enabled, including touch and mouse swiping, keyboard, screen reader, text input, voice control, and hand gesture recognition.

We also have [a vega-lite demo online](https://dig.cmu.edu/data-navigator/vega-lite.html), which (under the hood) shows how someone could write one schema that serves any chart in an ecosystem.

## Approach

Data Navigator is organized into 3 separately composable modules: the first is a graph-based _structure_ of nodes and edges, the second handles _input_ and navigation logic, and the third _renders_ the structure. These may be leveraged together or independently. Read our paper to learn more!

## Getting started

You can install or use both esm and cjs modules in a variety of ways, in addition to importing all of data-navigator or just one part.

```
# to install into a project
npm install data-navigator
```

```js
// to use it in a .js or .ts file
import { default as dataNavigator } from 'data-navigator';
console.log(dataNavigator);
```

```html
<!-- and even as a script tag module loaded from a cdn -->
<script type="module">
    import dataNavigator from 'https://cdn.jsdelivr.net/npm/data-navigator@1.0.0/dist/index.mjs';
    console.log(dataNavigator);
</script>
```

## Credit

Data-Navigator was developed at CMU's [Data Interaction Group](https://dig.cmu.edu/) (CMU DIG), primarily by [Frank Elavsky](https://frank.computer).

## Citing Data-Navigator

```bib
@article{2023-data-navigator,
  year = {2023},
  author = {Frank Elavsky and Lucas Nadolskis and Dominik Moritz},
  title = {{Data Navigator:} An Accessibility-Centered Data Navigation Toolkit},
  journal = {{IEEE} {VIS}}
}
```
