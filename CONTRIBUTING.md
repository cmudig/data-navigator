# Contributing

## Project Structure

This is a monorepo using Yarn workspaces:

- `packages/data-navigator/` — the core library (published to npm)
- `packages/inspector/` — optional structure inspector companion (published to npm as `@data-navigator/inspector`)
- `packages/bokeh-wrapper/` — Bokeh chart wrapper (published to npm as `@data-navigator/bokeh-wrapper`)
- `packages/skeleton/` — GUI-based project using data-navigator and inspector (planned)
- `docs/` — the VitePress documentation site

## Getting Started

- Fork or clone and branch
- Install dependencies: `yarn`
- Look at our types: [data-navigator.ts](./packages/data-navigator/src/data-navigator.ts)
- Look at our scripts: [package.json](./package.json)
- Look at our current plan: [plan.md](./plan.md)

## Working on the Core Library

The core library lives in `packages/data-navigator/`. It is a vanilla JavaScript/TypeScript library with no external dependencies.

- Build: `yarn build`
- Clean: `yarn clean`
- Types are in [data-navigator.ts](./packages/data-navigator/src/data-navigator.ts)

The library produces both ESM and CJS outputs via tsup.

## Working on the Docs Site

The documentation site lives in `docs/` and uses VitePress. During development, it imports directly from the library's TypeScript source (via a Vite alias), so changes to the library are reflected immediately.

- Dev server: `yarn docs:dev`
- Build: `yarn docs:build`
- Preview: `yarn docs:preview`

## Working on the Inspector

The inspector lives in `packages/inspector/` and has its own VitePress test site. It uses modular D3 imports and depends on data-navigator as a workspace dependency.

- Dev server: `yarn inspector:dev`

## Working on the Bokeh Wrapper

The Bokeh wrapper lives in `packages/bokeh-wrapper/`. It is a TypeScript package built with tsup that wraps data-navigator's core modules with smart defaults for Bokeh charts. It also has its own VitePress docs site at `packages/bokeh-wrapper/docs/`.

Context and motivation: the wrapper is informed by the [Bokeh Accessibility Audit](https://bokeh-a11y-audit.readthedocs.io/), which documents known accessibility issues in Bokeh and is a companion project. When contributing to the wrapper, please check the audit to understand what problems exist in Bokeh itself versus what the wrapper can reasonably address.

- Dev server (docs): `yarn bokeh-wrapper:dev`
- Build package: `yarn workspace @data-navigator/bokeh-wrapper build`
- Build docs: `yarn bokeh-wrapper:build:docs`

The wrapper depends on `data-navigator` (peer + dev) but has no other runtime dependencies. When adding new chart-type support, update `src/structure-builder.ts` and add a corresponding example page in `docs/examples/`.

Publishing the Bokeh wrapper follows the same process as the Inspector — use `--no-git-tag-version` to avoid tag collisions with the core library:

1. Navigate to the package: `cd packages/bokeh-wrapper`
2. Build: `yarn build`
3. Bump the version: `npm version <patch|minor|major> --no-git-tag-version`
4. Commit the version bump: `git add package.json && git commit -m "bokeh-wrapper v<new-version>"`
5. Publish: `npm publish --access public`
6. Push: `git push`

## After Making Changes

- Format code and make it look good: `yarn prettier-all`
- Build the library: `yarn build`
- Test the docs: `yarn docs:dev`
- Test with different assistive technologies
- Once it looks good, open a PR

## Releasing

(only from main branch, only core dev team can do this)

### Core Library (`data-navigator`)

1. Navigate to the package: `cd packages/data-navigator`
2. Build: `yarn build`
3. Publish: `yarn publish` — this will prompt you to bump the version, create a git tag, and publish to npm
4. Push the commit and tag: `git push && git push --tags`
5. Create a GitHub release from the new tag

### Inspector (`@data-navigator/inspector`)

The inspector is published separately from the core library. Use `--no-git-tag-version` to avoid creating git tags that collide with core library version tags.

1. Navigate to the package: `cd packages/inspector`
2. Bump the version: `npm version <patch|minor|major> --no-git-tag-version`
3. Commit the version bump: `git add package.json && git commit -m "inspector v<new-version>"`
4. Publish: `npm publish --access public`
5. Push: `git push`

### Bokeh Wrapper (`@data-navigator/bokeh-wrapper`)

Same approach as the inspector.

1. Navigate to the package: `cd packages/bokeh-wrapper`
2. Build: `yarn build`
3. Bump the version: `npm version <patch|minor|major> --no-git-tag-version`
4. Commit the version bump: `git add package.json && git commit -m "bokeh-wrapper v<new-version>"`
5. Publish: `npm publish --access public`
6. Push: `git push`
