# Toby Yu Portfolio

Static one-page portfolio site for Toby Yu, built with Vite.

> **Working on this project with an AI coding tool?** Read [EDIT_LOG.md](EDIT_LOG.md) first — it
> documents the current video showcase implementation, past decisions, and things that must not be
> reverted. Update it when you finish a change.

## Develop

```bash
npm install
npm run dev      # local dev server
npm run build    # → dist/
npm run preview  # serve the built output
```

Do not test video embeds by opening `index.html` over `file://` — YouTube embeds need a real web
origin. Use `npm run dev`.

## Edit Content

- Main page copy: `index.html`
- Project videos (Vimeo + YouTube): the `projects` array at the top of `src/main.js`
- Visual design and responsive layout: `src/styles.css`

## Swap A Video

Update the project's `video` value in `src/main.js`. Both providers are supported:

```js
video: "https://vimeo.com/VIDEO_ID"
video: "https://www.youtube.com/watch?v=VIDEO_ID"
```

Each section's large featured video is chosen by project id in `index.html`
(`<div class="showcase-feature" data-feature="commercial-03">`); its URL still comes from the
registry. The only hardcoded embed left is the hero background — see [EDIT_LOG.md](EDIT_LOG.md) §2.1.

## Deploy

Pushing to `main` builds and publishes to GitHub Pages via
`.github/workflows/deploy-pages.yml`. Live at https://toby412.github.io/toby-portfolio/

The `base` option in `vite.config.js` must match the Pages subpath.
