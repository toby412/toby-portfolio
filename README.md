# Toby Yu Portfolio

Static portfolio site for Toby Yu, built for a Vercel-friendly one-page workflow.

## Preview

Open `index.html` directly in a browser.

## Edit Content

- Main page copy: `index.html`
- Project cards and Vimeo links: `src/main.js`
- Visual design and responsive layout: `src/styles.css`
- Reference screenshots and copied section code: `for codex/`

## Replace Placeholder Videos

In `src/main.js`, update each project's `video` value:

```js
video: "https://player.vimeo.com/video/YOUR_VIDEO_ID"
```

The current links are placeholders.

## Deploy To Vercel

Import this folder as a new Vercel project. The site can be deployed as a Vite project, or served as a static site from the root.
