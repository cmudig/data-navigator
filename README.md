# Data Navigator

![Data Navigator provides visualization toolkits with rich, accessible navigation structures, robust input handling, and flexible, semantic rendering.](https://raw.githubusercontent.com/cmudig/data-navigator/main/assets/data_navigator.png)

Data Navigator is a JavaScript library that enables keyboard, screen reader, and multi-modal navigation of data structures and visualizations. It works with any rendering technology — SVG, Canvas, images, or WebGL — by creating a semantic, accessible HTML layer on top of your graphics.

**[Documentation](https://dig.cmu.edu/data-navigator/)** · **[Getting Started](https://dig.cmu.edu/data-navigator/getting-started/)** · **[Demo](https://dig.cmu.edu/data-navigator/demo)** · **[npm](https://www.npmjs.com/package/data-navigator)**

## Install

```
npm install data-navigator
```

```js
import dataNavigator from 'data-navigator';
```

## How it works

Data Navigator is organized into 3 composable modules:

1. **Structure** — a graph of nodes and edges that defines navigation paths through your data
2. **Input** — handles keyboard, touch, voice, gesture, and custom input modalities
3. **Rendering** — creates semantic HTML elements overlaid on your visualization

These modules can be used together or independently. Visit [the docs](https://dig.cmu.edu/data-navigator/getting-started/) for a step-by-step guide to building your first navigable chart.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup instructions and development workflow.

## Credit

Data Navigator was developed at CMU's [Data Interaction Group](https://dig.cmu.edu/) (CMU DIG), primarily by [Frank Elavsky](https://frank.computer).

## Citing Data Navigator

```bib
@article{2023-data-navigator,
  title = {{Data Navigator}: An Accessibility-Centered Data Navigation Toolkit},
  publisher = {{IEEE}},
  author = {Frank Elavsky and Lucas Nadolskis and Dominik Moritz},
  journal = {{IEEE} Transactions on Visualization and Computer Graphics},
  year = {2023},
  url = {http://dig.cmu.edu/data-navigator/}
}
```
