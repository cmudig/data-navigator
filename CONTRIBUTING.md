# Contributing

## Project Structure

This is a monorepo using Yarn workspaces:

- `packages/data-navigator/` — the core library (published to npm)
- `packages/inspector/` — optional structure inspector companion (in development)
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

## After Making Changes

- Format code and make it look good: `yarn prettier-all`
- Build the library: `yarn build`
- Test the docs: `yarn docs:dev`
- Test with different assistive technologies
- Once it looks good, open a PR

## Releasing

(only from main branch, only core dev team can do this)

1. Navigate to the package: `cd packages/data-navigator`
2. Build: `yarn build`
3. Publish: `yarn publish` — this will prompt you to bump the version, create a git tag, and publish to npm
4. Push the commit and tag: `git push && git push --tags`
5. Create a GitHub release from the new tag
