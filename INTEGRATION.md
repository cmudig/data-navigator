# Data Navigator Documentation - VitePress Migration

This folder contains the new VitePress-based documentation for Data Navigator.

## Integration Steps

To integrate this into your existing `data-navigator` repository:

### 1. Copy the `docs/` folder

Copy the entire `docs/` directory to your repository root (replacing or merging with any existing docs).

### 2. Update your `package.json`

Add these scripts and devDependencies to your main `package.json`:

```json
{
  "scripts": {
    "docs:dev": "vitepress dev docs",
    "docs:build": "vitepress build docs",
    "docs:preview": "vitepress preview docs"
  },
  "devDependencies": {
    "vitepress": "^1.4.0",
    "vue": "^3.5.0"
  }
}
```

### 3. Copy the GitHub Actions workflow

Copy `.github/workflows/deploy-docs.yml` to your repository.

### 4. Update VitePress config for local imports

In `docs/.vitepress/config.ts`, update the Vite alias to point to your actual source:

```ts
vite: {
  resolve: {
    alias: {
      'data-navigator': process.env.NODE_ENV === 'production' 
        ? 'data-navigator' 
        : path.resolve(__dirname, '../../src/index.ts')
    }
  }
}
```

### 5. Install dependencies and test

```bash
npm install
npm run docs:dev
```

Visit `http://localhost:5173/data-navigator/` to verify everything works.

### 6. Configure GitHub Pages

In your GitHub repository settings:
1. Go to Settings → Pages
2. Set Source to "GitHub Actions"

The deployment workflow will handle the rest.

## File Structure Overview

```
data-navigator/           # Your existing repo
├── src/                  # Your existing source
├── dist/                 # Your existing build output
├── docs/                 # NEW - VitePress documentation
│   ├── .vitepress/
│   │   ├── config.ts
│   │   └── theme/
│   ├── public/
│   ├── index.md
│   ├── getting-started/
│   ├── examples/
│   └── api/
├── .github/
│   └── workflows/
│       └── deploy-docs.yml  # NEW - Docs deployment
└── package.json          # UPDATED - Add docs scripts
```

## Notes

### External Dependencies

The documentation examples load Bokeh and D3 from CDNs (configured in `docs/.vitepress/config.ts` under `head`). These load on every page.

If you want to limit external script loading to only pages that need them, you can move the script tags to individual page frontmatter or use dynamic loading in the example code.

### Data Navigator Import

During development (`npm run docs:dev`), examples import directly from your source files.

In production builds (`npm run docs:build`), examples import from the published npm package. Make sure `data-navigator` is published and the version matches.

### Custom Domain

The current config uses `base: '/data-navigator/'` for GitHub Pages deployment to `dig.cmu.edu/data-navigator/`.

If deploying to a different URL, update the `base` option in `docs/.vitepress/config.ts`.
