# Installation

## Package Manager

Install Data Navigator using your preferred package manager:

::: code-group

```sh [npm]
npm install data-navigator
```

```sh [yarn]
yarn add data-navigator
```

```sh [pnpm]
pnpm add data-navigator
```

:::

## Usage

Import the entire library:

```js
import dataNavigator from 'data-navigator';

console.log(dataNavigator.structure);
console.log(dataNavigator.input);
console.log(dataNavigator.rendering);
```

Or import individual modules:

```js
import { structure, input, rendering } from 'data-navigator';
```

## CDN

For quick prototyping:

```html
<script type="module">
    import dataNavigator from 'https://cdn.jsdelivr.net/npm/data-navigator@2.2.0/dist/index.mjs';
</script>
```

::: warning Version Pinning
Always pin to a specific version when using CDN imports.
:::

## TypeScript

Data Navigator includes type definitions. No additional `@types` package needed.

## Next Steps

With Data Navigator installed, let's look at the [example dataset](/getting-started/dataset) we'll use.
