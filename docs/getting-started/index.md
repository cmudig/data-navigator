# Introduction to Data Navigator

Data Navigator is a library for making data structures navigable using a keyboard, screen reader, or other navigational input device or modality.

This documentation will guide you through:

1. **Installing** Data Navigator in your project
2. **Understanding** the core concepts (structure, input, rendering)
3. **Building** your first navigable chart

## What You'll Learn

By the end of this guide, you'll be able to take any data visualization—whether it's a PNG image, an SVG chart, a Canvas rendering, or anything else—and make it fully navigable and accessible.

## Prerequisites

This guide assumes you have:

- Basic familiarity with JavaScript
- A project with a module bundler (Vite, Webpack, etc.) or the ability to use ES modules
- A data visualization you want to make accessible (we'll provide one for the tutorial)

::: tip No Framework Required
Data Navigator is framework-agnostic. While this documentation uses vanilla JavaScript, the same concepts apply whether you're using React, Vue, Svelte, or any other framework.
:::

## Core Concepts

Data Navigator has three modularized subsystems:

### Structure

The **structure** module defines the navigable graph of your data—nodes (elements) and edges (connections).

### Input

The **input** module handles user interaction—validates keyboard events and converts them to navigation commands.

### Rendering

The **rendering** module creates the accessible HTML layer—generates focusable elements with proper ARIA attributes.

## Next Steps

Ready to get started? Head to the [Installation](/getting-started/installation) page.

## Additional Resources

- [Read the Paper](https://www.frank.computer/data-navigator/)
- [GitHub Repository](https://github.com/cmudig/data-navigator)
- [npm Package](https://www.npmjs.com/package/data-navigator)

::: tip Using Bokeh?
If your visualization is built with [Bokeh](https://bokeh.org/), you don't need to wire things up from scratch. The **[@data-navigator/bokeh-wrapper](https://dig.cmu.edu/data-navigator/bokeh-wrapper/)** handles structure-building, navigation setup, and the text-chat interface for you with one function call.
:::
