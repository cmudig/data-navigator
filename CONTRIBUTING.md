# Contributing

## Dependencies
Check the [package.json](./package.json) for dev dependencies. Currently data-navigator does not use external dependencies. It is a vanilla library.

## Getting started

- Fork or clone and branch
- Install stuff: `yarn`
- Look at our types: [data-navigator.d.ts](./data-navigator.d.ts)
- Look at our scripts and things: [package.json](./package.json)
- Look at our current plan: [plan.md](./plan.md)

## After making changes

- Get stuff looking good: `yarn prettier-all`
- Build it: `yarn build`
- Serve: `yarn server`
- Test with different assistive technologies
- Once it looks good, open a PR

## Releasing
(only from main branch, only core dev team can do this)
- Bump version: `npm version` and specify `major|minor|patch`
- Get it out there: `npm publish`
- Update repo: `git push`
- Update repo tags: `git push --tags`
- Create github release