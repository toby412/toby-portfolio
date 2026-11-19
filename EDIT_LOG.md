# EDIT_LOG.md — Toby Yu Portfolio

Shared change log for **all** coding tools working on this repo (Claude Code, Codex, Cursor, human edits).

**Read this file before making changes.** It records what the current implementation is, why it is
shaped that way, and which past decisions were deliberate — so a later session does not "fix"
something that was already fixed on purpose.

**Update this file after making changes.** Add a new entry at the top of
[Change History](#change-history) using the entry template at the bottom.

---

## 1. Project Snapshot

| | |
|---|---|
| **Project** | Single-page portfolio for Toby Yu (freelance video editor / motion graphics designer) |
| **Stack** | Vanilla HTML + CSS + ES modules, bundled by Vite 7. No framework, no CSS preprocessor. |
| **Repo** | `https://github.com/toby412/toby-portfolio.git` (branch `main`) |
| **Live URL** | `https://toby412.github.io/toby-portfolio/` |
| **Deploy** | GitHub Actions → GitHub Pages (`.github/workflows/deploy-pages.yml`), on every push to `main` |
| **Vite base** | `/toby-portfolio/` (set in `vite.config.js`; required for the Pages subpath) |
| **Analytics** | GA4 `G-ZWM4MR7ZGT` via `src/analytics.js` |
| **Contact form** | EmailJS (`service_portfolio` / `template_pm58y13`, public key `EMAILJS_PUBLIC_KEY` in `src/main.js`, passed on each `send`) |

### File map

| File | Role |
|---|---|
| `index.html` | All page markup, SEO meta + Person JSON-LD, the `<dialog>` video modal (+ project details panel), EmailJS bootstrap |
| `src/projects.json` | **Video registry** — every video's URL, title, category and project details (client, role, year, tools, concept) |
| `src/main.js` | **Video showcase system**: thumbnails, carousels, modal player + details panel, hero, stats, contact form |
| `editor.html` | Local editor for `src/projects.json`. Double-click → opens in Chrome/Edge; saves via the File System Access API. **Not part of the build** (Vite only bundles `index.html`). |
| `src/styles.css` | All styling and responsive layout (breakpoints at 1100px / 900px / 580px) |
| `src/analytics.js` | GA4 loader + SPA-style page-view tracking |
| `public/` | Files copied verbatim to the build root (Google Search Console verification) |
| `dist/` | Build output — **git-ignored, never edit by hand** |

### Commands

```bash
npm install
npm run dev      # vite dev server on 127.0.0.1
npm run build    # → dist/
npm run preview  # serve the built dist/
```

> **Do not test video embeds by opening `index.html` over `file://`.** YouTube embeds fail without a
> real web origin. `src/main.js` prints a console warning when it detects `file://`. Use `npm run dev`.

---

## 2. Video Showcase System — Current State

This is the heart of the site. Four surfaces play video, and they behave differently on purpose.

### 2.1 Video registry

All clips are declared in one file — [src/projects.json](src/projects.json), imported by `src/main.js`.
Nothing else hardcodes a video URL **except** the hero background embed noted below.
The owner edits titles and project details through [editor.html](editor.html); structural changes
(adding/removing/reordering videos, changing categories) are still done by hand in the JSON.

| `id` | Title | `category` | Provider | Video | Where it appears |
|---|---|---|---|---|---|
| `showreel` | Toby Yu Showreel | Showreel | Vimeo | `1165378554` | Hero background + hero click-to-play |
| `commercial-03` | Commercial Reel 3 | Commercial | Vimeo | `1195101228` | **Featured** — Brand & Commercial |
| `commercial-02` | Commercial Reel 2 | Commercial | Vimeo | `1191103532` | Brand & Commercial rail |
| `commercial-01` | Commercial Reel | Commercial | Vimeo | `1180459302` | Brand & Commercial rail |
| `short-01` | Reel 01 | Shorts & Reels | Vimeo | `1165586227` | Shorts direct row — rightmost |
| `short-04` | Reel 04 | Shorts & Reels | Vimeo | `1234598390` | Shorts direct row — second from right |
| `short-02` | Reel 02 | Shorts & Reels | Vimeo | `1165590282` | Shorts direct row — third from right |
| `short-03` | Reel 03 | Shorts & Reels | Vimeo | `1167277734` | Shorts direct row — fourth from right |
| `short-05` | Reel 05 | Shorts & Reels | YouTube | `DPhvVgVLi04` | Shorts direct row — leftmost |
| `documentary-01` | Film 01 | Documentary | YouTube | `NnY4RRX-n_0` | **Featured** — Films & Documentary |
| `documentary-02` | Film 02 | Documentary | Vimeo | `1194363662` | Films & Documentary rail |
| `documentary-03` | Film 03 | Documentary | YouTube | `ivhIMTe7Mu8` | Films & Documentary rail |

**The registry is now the single source of truth for every video URL except the hero.**
Each showcase names its featured clip by project id in the markup
(`<div class="showcase-feature" data-feature="commercial-03">`) and JS builds the embed from the
registry, so a featured clip is changed by editing `projects` alone. The one remaining hardcoded
embed is the hero background `<iframe src>` in [index.html](index.html#L75) → Vimeo `1165378554`.

`tone` and `meta` are legacy fields: `tone` only sets a `tone-*` CSS class on the card; `meta` is
currently not rendered. Keep them populated for consistency; neither is load-bearing.

`client`, `role`, `year`, `tools`, `concept` (all strings, may be empty) feed the modal's project
details panel. The panel only appears when at least one of them is non-empty; `title` alone does
not trigger it. `concept` keeps line breaks (`white-space: pre-line`).

### 2.2 How sections are populated

Brand & Commercial and Films & Documentary render the shared `.video-showcase`: one ambient
featured player plus a finite rail of that category's remaining videos. Shorts & Reels uses its
own `.shorts-video-list` so all five ambient embeds can be visible without carousel controls.

```html
<div class="video-showcase">                      <!-- + --shorts modifier -->
  <div class="showcase-feature" data-feature="commercial-03">…audio toggle…</div>
  <div class="showcase-secondary-panel">
    <div class="showcase-more">More →</div>
    <div class="showcase-secondary" data-category="Commercial" data-exclude="commercial-03"></div>
  </div>
</div>
```

- `data-feature="<projectId>"` — JS injects the featured iframe and wires its audio toggle.
- `data-category` / `data-exclude` — JS fills the Brand and Documentary rails with their remaining clips.
- `shortProjectOrder` — JS fills the direct Short list in its explicit right-to-left visual order.

**To add a video:** append an object to `src/projects.json` with a matching `category` (include the
five detail fields as empty strings); it appears in that section's rail automatically. **To change a featured video:** point `data-feature` at another id in
the same category and update that section's `data-exclude` to match.

### 2.3 Provider handling (Vimeo + YouTube)

`getVideoProvider()` returns `"youtube"` if a YouTube ID can be parsed from the URL, otherwise
`"vimeo"`. Both parsers accept several URL shapes:

- Vimeo: `vimeo.com/ID`, `player.vimeo.com/video/ID`, trailing query strings (`?fl=ip&fe=ec`) are fine.
- YouTube: `watch?v=ID`, `youtu.be/ID`, `/embed/ID`.

| Concern | Vimeo | YouTube |
|---|---|---|
| **Thumbnail** | oEmbed API `vimeo.com/api/oembed.json` (async fetch, cached in a `Map` by video ID) | `i.ytimg.com/vi/<id>/maxresdefault.jpg`, falling back to `hqdefault.jpg` on a one-shot `error` listener |
| **Modal embed** | `player.vimeo.com/video/<id>?autoplay=1&title=0&byline=0&portrait=0` | `youtube-nocookie.com/embed/<id>?autoplay=1&playsinline=1&rel=0` + `origin` param |
| **iframe `allow`** | `autoplay; encrypted-media; fullscreen; picture-in-picture` | `accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share` + `referrerpolicy="strict-origin-when-cross-origin"` |

If a thumbnail fetch fails entirely the `<img>` is removed, leaving the card's tone background —
the card stays clickable. Vimeo thumbnails are network-dependent, so a card can briefly render empty.

### 2.4 Layout & interaction, per surface

**Hero — `.hero`** ([index.html](index.html#L66))
- Muted, looping, autoplaying Vimeo *background* embed, `aria-hidden`, `tabindex="-1"`.
- The whole section is `role="button"` — click or Enter/Space opens `showreel` in the modal.
- Custom follow-cursor play badge and iframe parallax (±18px / ±14px), fine pointers only, both
  disabled under `prefers-reduced-motion`.

**Ambient players load only near the viewport** (featured players + every Short; the hero is exempt)
- `registerAmbientPlayer()` gives each container a thumbnail `.ambient-poster` and an
  `IntersectionObserver` (`rootMargin: 250px 0px`). In range → `loadAmbientPlayer()` creates the
  iframe; out of range → `unloadAmbientPlayer()` removes it and resets that player's audio to Off.
- The poster fades out 700ms after the iframe's `load` event (`.is-playing`) and is back whenever
  the player is unloaded, so there is no black flash.
- Iframes are **replaced, never re-pointed**: setting an existing iframe's `src` adds a session
  history entry, so scrolling (and audio toggles) used to stack up Back-button steps. Verified:
  `history.length` stays 2 after scrolling the whole page down and up.
- The observer ignores entries while the modal is open; `closeVideo()` restores the source player.
- **Expanding a looping player is instant and opens with sound on.** In browsers with
  `Element.moveBefore()` (Chrome/Edge 133+) and once the card is `.is-playing`,
  `openLoopingVideo()` moves the *live* iframe into the modal (no reload) and unmutes it with
  `setPlayerMuted()` — Vimeo `{method:"setMuted"/"setVolume"}` / YouTube
  `{event:"command",func:"unMute"}` postMessages (YouTube ambient URLs carry `enablejsapi=1` for
  this). The modal's audio toggle uses the same messages. `closeVideo()` moves the iframe back and
  re-applies the card's own audio setting (`sourceMuted`), not the modal's. Other browsers build a
  fresh player with `muted=0` (a short load).
- Effect: at page load only the hero iframe loads (previously 8 iframes at once).

**Brand & Commercial and Films & Documentary — `.video-showcase`**
- Two-column grid, `1.42fr / 0.78fr`, capped at `1000px`, gap `clamp(18px, 2.6vw, 34px)`.
- **Featured player:** autoplays muted, loops forever, no player chrome, `pointer-events: none`.
  Its audio toggle stays pinned bottom-right; a separate transparent layer opens the expanded modal
  without intercepting the toggle.
- **Rail:** the category's remaining videos as click-to-play cards, horizontally scrollable,
  with prev/next arrows that disable at each end and a "More →" label above.
- Aspect ratios come from two custom properties, `--feature-ratio` and `--card-ratio`, so a
  category changes shape without forking the component.

| Showcase | Feature | Ratios | Alignment |
|---|---|---|---|
| Brand & Commercial | Vimeo `commercial-03` | 16:9 feature, 16:9 cards | left-oriented, centred in the shell |
| Films & Documentary | YouTube `documentary-01` | 16:9 feature, 16:9 cards | left-oriented, centred in the shell |

**Shorts & Reels direct row** (`.shorts-video-list`)
- All five 9:16 embeds (four Vimeo, one YouTube Short) are direct, muted, autoplaying, looping cards — no featured player,
  rail, or carousel arrows. Each card has its own Audio ON/OFF control.
- The list uses `row-reverse`, placing `short-01`, `short-04`, `short-02`, `short-03`, and `short-05` from
  right to left while retaining that semantic source order.
- Clips use 225px desktop width (75% of the prior size) and responsive 157.5px/195px widths at
  the existing breakpoints. The list is right-aligned to the Short heading.
- Above 580px (desktop/tablet) the list never wraps: it is a one-row horizontal carousel with a
  hidden scrollbar, and `main.js` maps vertical mouse-wheel movement to horizontal scrolling
  (wheel down → toward later Shorts, i.e. leftward; at either end the wheel falls through to page
  scroll). This lives in a separate `@media (min-width: 581px)` block at the end of `styles.css`.
- At ≤580px the phone rail (full-bleed, touch scroll, snap) in the `max-width: 580px` block is
  unchanged; the wheel handler is gated by the same 581px media query and never runs on phones.
- Clicking any Short, Commercial, or Documentary looping player opens the same expanded modal.

**Modal player — `<dialog class="video-modal">`**
- Opened by rail cards, the hero, or the transparent expand layer on every looping player. Looping
  videos preserve their 9:16 or 16:9 ratio in the modal and gain a matching audio control.
- Native `<dialog>.showModal()`, animated via `is-opening` → `is-visible` → `is-closing`.
- Close = backdrop click or Esc (through the dialog's **`cancel` event**). There is **no × button**
  (removed 2026-11-19 at the owner's request). `.modal-panel` has `tabindex="-1" autofocus` so
  `showModal()` focuses the panel rather than the video iframe — a focused cross-origin player
  swallows Esc.
- Close waits `320ms`, then sets `player.innerHTML = ""`. **That teardown is what stops playback.**
  A temporarily muted source player restores its audio state only after this teardown.
- The iframe is built with `createElement` (not an HTML string) because titles are editable content.
- **Project details panel** (`.video-info`, filled by `fillVideoInfo()`, cleared in `closeVideo()`):
  - Desktop (>900px): two columns, video left, details right (`--info-width: clamp(280px, 27vw, 360px)`).
    The details column uses `contain: size` so the video alone sets the height; only
    `.video-info-body` scrolls, keeping "Work with me" pinned at the bottom.
  - ≤900px: details stack under the video, capped at `40svh`; portrait videos shrink to `42svh` tall.
  - "Work with me" closes the modal (via `closeVideo(onClosed)`), scrolls to `#contact`, and opens the form.
- Modal size is capped by viewport height (`--modal-max-h: 100svh - 140px`) so there is always
  backdrop above and below it to tap (the only close control on phones).

### 2.5 Accessibility & motion conventions

- `prefers-reduced-motion: reduce` is respected everywhere: modal transitions, carousel easing,
  hero parallax/cursor, stat counters, and workflow stagger all degrade to instant.
- Cloned carousel cards are hidden from assistive tech; every real card has `aria-label="Play <title>"`.
- Carousel arrows carry `aria-controls` pointing at their rail's `id`.
- The audio toggle maintains `aria-pressed` and swaps its `aria-label` and visible label.

---

## 3. Deliberate Decisions — Do Not "Fix" These

These look like bugs or omissions. They are not. Changing them re-opens a solved problem.

1. **All three rails are finite, not infinite.**
   Each holds only the two videos left after the featured one. The old shorts/films carousels
   rendered every project three times and loop-normalised `scrollLeft` to fake an infinite rail;
   at a count of two that reads as broken, and it was already the reason the commercial rail was
   built finite. The clone system was removed, not disabled — do not reintroduce it without a
   much larger library.

2. **The audio toggle rebuilds the player instead of using a player SDK.**
   Both providers autoplay and loop reliably from URL parameters alone. Rebuilding the embed with the
   mute flag flipped preserves that path at the cost of restarting the clip. Since 2026-11-19 the
   iframe element is replaced rather than its `src` changed, to keep browser history clean (§2.4). Loading the Vimeo
   Player SDK or YouTube IFrame API would avoid the restart but re-introduces the autoplay-policy
   edge cases this replaced. Applies to all three showcases.

3. **Featured iframes have `pointer-events: none`.**
   They are ambient players whose only control is the audio toggle (a sibling above them in the
   stacking order, so it still receives clicks). This is also what suppresses YouTube's title bar,
   hover chrome and end-screen overlays, which `controls=0` alone does not remove — without it the
   Films feature does not match the two Vimeo ones.

4. **The YouTube featured embed carries `playlist=<its own id>`.**
   YouTube ignores `loop=1` for a single video unless the video is its own one-item playlist.
   Removing the `playlist` parameter silently stops the Films feature from looping.

5. **Looping players use a dedicated transparent expand layer.**
   This makes the visual media clickable while keeping the Audio ON/OFF button above it, avoiding
   accidental modal opens when the user changes audio.

6. **Esc is handled via the dialog `cancel` event, not `document.keydown`.**
   Changed in `49553d2`. The global listener bypassed the close animation and left the iframe
   mounted, so audio kept playing. Do not revert to a keydown handler.

7. **Contact form uses EmailJS, not `mailto:`.**
   The original `mailto:` handoff (`ce62b7b`) was replaced in `428a3ed` because it depended on a
   configured desktop mail client. `company` and `project_type` were added and then **intentionally
   removed** in `5575af2`; the EmailJS template expects only `from_name`, `from_email`, `budget`,
   `message`.

10. **`vite.config.js` `base: "/toby-portfolio/"` must stay** while the site is served from GitHub
    Pages under that subpath. Removing it breaks every asset URL in production.

11. **The video modal has no × button, on purpose.** It closes on a backdrop click or Esc. Do not
    remove `tabindex="-1" autofocus` from `.modal-panel`: without a focusable control, `showModal()`
    focuses the video iframe and Esc stops working. Known trade-off: after the viewer clicks inside
    the player itself, the player holds keyboard focus and Esc does nothing until they click the
    backdrop.

12. **`src/projects.json` is written by `editor.html`** as `JSON.stringify(data, null, 2)` plus a
    trailing newline. Keep that exact format when editing by hand, or the next editor save produces
    a noisy diff. Do not move the registry back into `main.js` — the editor can only edit the JSON.

## 4. Known Open Items

Recorded, not yet acted on. None is currently breaking the site.

- **The original Safari "featured video renders at ~327px" report was never reproduced.** Measured
  in Playwright's WebKit (Safari's engine) across 600–1700px in 20px steps: the featured player
  never renders narrower than its grid track. The likeliest explanation is that the 327px was
  measured while an intermediate layout experiment was in the working tree, not against the
  committed CSS. `.showcase-feature` carries `align-self: start; height: auto` as a cheap guard
  against the grid/`aspect-ratio` circularity that could produce it — an A/B test showed the guard
  changes nothing in this WebKit build, so it is precautionary, not a verified fix.
  **If it recurs in real Safari, capture `getComputedStyle(el).gridTemplateColumns` (used track
  sizes) alongside the feature's `getBoundingClientRect().width`** — if they match, the track is
  wrong; if they differ, the item is shrinking inside a correct track.
- **Headless/automated Chrome cannot play the Vimeo embeds** (Vimeo shows "We couldn't verify the
  security of your connection" and logs a 401). That is Vimeo's bot protection, not a site bug —
  automated checks can verify loading/unloading and DOM state, but playback must be eyeballed in a
  normal browser.
- **Vimeo thumbnails depend on a live oEmbed fetch** with no placeholder state, so cards can flash
  empty on a slow network. Rail thumbnails are `loading="lazy"`, so they only fetch once scrolled
  into view — expected, not a bug.
- **`.vercelignore` remains** from the original Vercel-oriented setup though the active pipeline is
  GitHub Pages. Harmless.

## 5. Change History

Newest first. Dates are the commit/authoring date.

### 2026-11-19 — Instant expand with sound

- **Section affected:** Modal; Brand & Commercial, Shorts & Reels, Films & Documentary featured/short players.
- **What changed:** Expanding a looping player no longer reloads it (Chrome/Edge): the live iframe is
  moved into the modal with `moveBefore()` and unmuted via postMessage. The expanded video now
  always starts with sound on; closing returns the card to its previous audio state.
- **Videos:** none. YouTube ambient embed URLs gained `enablejsapi=1`.
- **Layout/interaction:** The card shows its thumbnail poster while its player is in the modal.
- **Implementation notes:** Verified headlessly that the same iframe element travels to the modal
  and back, the card's audio label/state are restored, `history.length` is unchanged, and the
  no-`moveBefore` fallback builds a `muted=0` player. **Not verifiable headlessly:** that the
  postMessage unmute is audible (Vimeo blocks automated browsers) — check by ear in Chrome.
- **Fixed / reverted:** Previously closing the modal carried the modal's audio choice back to the
  card; it now restores the card's own setting.

### 2026-11-19 — Performance: viewport-loaded ambient players, debug code removed

- **Section affected:** Brand & Commercial, Shorts & Reels, Films & Documentary, modal, `<head>`, contact form.
- **What changed:** The two featured players and five Shorts no longer all start at page load. Each
  loads when it comes within 250px of the viewport and is removed when it leaves, with a thumbnail
  poster covering the load. Removed the YouTube debug instrumentation (`logEnvironmentDebug`,
  `logYouTubeDebug`, `youtubeDebugProject`, `window.testYouTubeEmbed`); the `file://` warning stays.
  EmailJS SDK now loads with `defer`; the public key is passed to each `emailjs.send` (the
  production build hoists the module script into `<head>`, so it can run before the SDK).
  Added `dns-prefetch` for vimeo.com, i.vimeocdn.com, youtube-nocookie.com, i.ytimg.com.
- **Videos:** none changed. Embed URLs and parameters (autoplay, loop, muted, playlist, quality) unchanged.
- **Layout/interaction:** Same look. Leaving the screen turns a player's audio back Off. Audio
  toggles (on cards and in the modal) replace the iframe instead of changing its `src`.
- **Implementation notes:** Shared `createAmbientFrame()` replaces the two duplicated iframe
  builders; `applyThumbnail()` is shared by rail cards and posters. Verified on the production build
  (`vite preview`) at 1440×900 and 390×844: 1 iframe at load (was 8), players load/unload while
  scrolling, `history.length` constant, audio resets off-screen, modal expand/close restores the
  source player, contact form succeeds with an intercepted EmailJS request carrying the key, no
  page errors. Playback itself could not be checked headlessly (see §4).
- **Fixed / reverted:** Removed the "debug instrumentation ships to production" open item.

### 2026-11-19 — Project details in the video modal + local editor

- **Section affected:** Modal; video registry; new `editor.html`.
- **What changed:** The `projects` array moved out of `src/main.js` into `src/projects.json` (same
  data, plus empty `client` / `role` / `year` / `tools` / `concept` fields). The modal now shows a
  project details panel with a "Work with me" button when any of those fields is filled. New
  `editor.html` lets the owner edit those fields (and title / video URL) in Chrome/Edge with
  thumbnails, a live preview of the panel, unsaved-change tracking and ⌘S save.
- **Videos:** none added or removed; no IDs changed.
- **Layout/interaction:** Desktop modal widens to up to 1280px (portrait: video ≤460px + details
  column) only when details exist; videos without details look as before. On ≤900px the details
  stack under the video. Modal width is now also capped by viewport height so the × never leaves the
  screen. See §2.4 Modal player.
- **Implementation notes:** Panel text is set via `textContent` only. The editor stores the folder
  handle in IndexedDB (Chrome asks for permission again per visit), refuses to save an
  unrecognised video URL, and warns before overwriting a `projects.json` that changed on disk
  after it was opened. Publishing is still `git add src/projects.json && git commit && git push`.
  Verified in headless Chrome at 1440×900, 1100×700, 390×844, 375×667 (panel layout, × position,
  Work-with-me flow, no console errors) and an editor round-trip against a copy of the JSON
  (diff limited to the edited lines).
- **Fixed / reverted:** The modal × close button had been invisible all along (clipped by the
  dialog's default `overflow: auto`). It was briefly made visible, then **removed** at the owner's
  request; the modal now closes on backdrop click or Esc only — see §3.11.

### 2026-11-19 — Desktop Shorts carousel with wheel scrolling

- **Section affected:** Shorts & Reels, desktop/tablet only (>580px).
- **What changed:** With five Shorts, the desktop row wrapped the fifth clip to a second line. Above 580px the list is now a single non-wrapping horizontal carousel.
- **Videos:** none.
- **Layout/interaction:** `flex-wrap: nowrap`, `overflow-x: auto`, inline scroll snap, hidden scrollbar. Vertical mouse wheel over the row scrolls it horizontally; at the ends the page scrolls normally. Horizontal trackpad swipes and ctrl+wheel zoom are left native.
- **Implementation notes:** The row is `row-reverse`, so `scrollLeft` runs from 0 (rightmost, first Short) to negative values. The CSS is a new `@media (min-width: 581px)` block appended to `styles.css`; the JS handler checks the same media query. Mobile CSS was not edited. A headless check at 390px showed identical computed styles and card positions before and after.
- **Fixed / reverted:** Do not move these rules into the base `.shorts-video-list` rule. That would leak into the phone rail.

### 2026-11-19 — Fifth Short (YouTube)

- **Section affected:** Shorts & Reels only.
- **What changed:** Added `short-05` (Reel 05) as the fifth Short, appended to `shortProjectOrder` so it sits leftmost in the right-to-left row.
- **Videos:** Added YouTube Short `DPhvVgVLi04` (`https://www.youtube.com/shorts/DPhvVgVLi04`).
- **Layout/interaction:** Same 9:16 ambient card, muted autoplay loop, per-clip Audio ON/OFF and expand-to-modal as the other Shorts. The row wraps at narrower widths as before.
- **Implementation notes:** `getYouTubeVideoId` now also parses `/shorts/<id>` URLs. `shortVideoCard` now applies the YouTube `allow` list and `referrerPolicy` when the clip is YouTube (previously Vimeo-only).
- **Fixed / reverted:** None.

### 2026-10-10 — Expanded playback for looping videos

- **Section affected:** Shorts & Reels, Brand & Commercial, Films & Documentary, and the shared modal.
- **What changed:** Added an invisible, accessible expand trigger over every looping player; clicking it opens the existing modal at the video's native portrait or landscape ratio.
- **Videos:** No IDs, order, dimensions, autoplay, or loop parameters changed.
- **Layout/interaction:** The existing Audio ON/OFF buttons stay above the expand layer. The modal adds a matching audio button for looping players and still closes with X, backdrop click, or Esc.
- **Implementation notes:** While an unmuted looping player is expanded, its source iframe is temporarily muted to prevent duplicate audio. The source's current audio setting is restored only after the modal iframe is removed. The modal reuses the established URL-based embeds rather than adding a provider SDK.
- **Fixed / reverted:** No carousel or layout behavior was restored or changed.

### 2026-10-10 — Short scale, alignment, and per-clip audio

- **Section affected:** Shorts & Reels only.
- **What changed:** Reduced every Short embed to 75% of its previous dimensions and right-aligned the direct video row to the Short heading's right edge.
- **Videos:** No IDs or right-to-left order changed.
- **Layout/interaction:** Desktop clips are 225×400px (9:16); responsive clip dimensions are also 75% of their prior values. Each Short now has an independent Audio ON/OFF button in its lower-right corner. The button rebuilds only its own Vimeo URL with the muted flag changed, matching the established featured-player audio behavior.
- **Implementation notes:** The direct row remains carousel-free and preserves the existing autoplay, loop, inline-playback, and `autopause=0` parameters.
- **Fixed / reverted:** Restored audio controls for direct Short embeds without restoring a featured-player or carousel structure.

### 2026-10-10 — Shorts direct video row

- **Section affected:** Shorts & Reels only.
- **What changed:** Replaced the Shorts featured-player-plus-carousel pattern with one direct Vimeo video list. The commercial and documentary showcase carousels are unchanged.
- **Videos:** Four Vimeo clips are explicitly ordered as `1165586227`, `1234598390`, `1165590282`, then `1167277734` from right to left.
- **Layout/interaction:** Desktop uses a direct right-to-left flex row; each clip preserves the existing 300px-wide 9:16 presentation. At narrower breakpoints, clips retain the existing responsive dimensions and wrap (then stack on mobile) rather than becoming a scroll rail. Shorts has no carousel controls or scrolling container.
- **Implementation notes:** The Short list is populated from a small ordered ID list against the central project registry, so provider parsing and the existing muted/autoplay/loop Vimeo URL parameters remain shared.
- **Fixed / reverted:** Removed the Short carousel arrows and `More` affordance because all Short clips play as ambient embeds in the same display area.

### 2026-09-09 — Featured-video system extended to all three work categories

- **Sections affected:** Brand & Commercial, Shorts & Reels, Films & Documentary. Hero, About,
  Contact, footer, analytics and the modal player are untouched.
- **What changed:** The Brand & Commercial concept was generalised into one component,
  `.video-showcase`, and applied to all three categories. Shorts & Reels and Films & Documentary
  previously used a different pattern — a looping carousel of equal-sized cards with no featured
  player and no audio control — and now match Commercial. `.commercial-*` classes were renamed to
  `.showcase-*` / `.video-showcase`; every visual value (spacing, radius, shadows, arrow styling,
  typography, the "More →" mark) was carried across unchanged.
- **Videos:**
  - Shorts & Reels featured → Vimeo `1165590282` (`short-02`), promoted out of the rail.
  - Films & Documentary featured → YouTube `NnY4RRX-n_0` (`documentary-01`), promoted out of the rail.
  - Brand & Commercial featured → Vimeo `1195101228` (`commercial-03`), unchanged.
  - No video was added or removed; three moved from rail to featured position.
- **Layout/interaction:**
  - Each section: one ambient featured player (autoplay, muted, infinite loop, no chrome) with an
    Audio ON/OFF toggle, beside a finite scrollable rail with prev/next arrows and a "More →" label.
  - Shorts & Reels is right-anchored: narrower block pushed to the shell's right edge, columns
    swapped so the featured reel sits far right, heading right-aligned. Arrow directions are not
    mirrored. The mirror is dropped below 580px.
  - Aspect ratios moved to `--feature-ratio` / `--card-ratio` custom properties; Shorts uses 9:16
    for both, the other two use 16:9.
  - The infinite-loop carousel was **removed**: the 3×-clone rendering, `measureLoop()`,
    `normalizeLoopPosition()` and the custom rAF easing scroll are gone, along with the
    `.carousel-shell` / `.project-grid` / `.two-up` / `.three-up` CSS. All three rails now share the
    one finite implementation. Net −335/+345 lines across the three files.
- **Implementation notes:**
  - Featured clips are now declared as `data-feature="<projectId>"` and built from the `projects`
    registry, replacing the previous hardcoded-iframe-src approach. This removes the HTML↔JS video-ID
    duplication that the earlier version of this log flagged as a sync hazard; only the hero still
    hardcodes an embed. The trade-off is that featured players no longer start loading before JS
    runs — acceptable because all three sit below the fold.
  - YouTube needed three things Vimeo did not: `playlist=<id>` for looping, `controls=0` +
    `pointer-events: none` to match the chrome-less Vimeo look, and its own `allow` /
    `referrerpolicy` attributes. See §3.3 and §3.4.
  - **Verified in Playwright's WebKit (Safari's engine), not by CSS arithmetic:** featured players
    render at their full grid-track width (624×351 at 1440px, matching the 623.5px track — not the
    ~327px previously reported); all three featured embeds carry `autoplay=1`, `loop=1`, `muted=1`;
    all three audio toggles flip mute, label, `aria-pressed` and styling; the modal still opens from
    rail cards and Esc still tears the player down; all three rails scroll with live arrows at
    1440/1200/1000/860/700/520/390px; hero, contact form, stats and nav are unaffected. Screenshots
    reviewed at 1440px and 520px. A 20px-step sweep from 600–1700px found no width at which a
    featured player renders narrower than its track.
- **Fixed / reverted:** Two defects were caught by measurement and fixed before finishing —
  the Shorts rail was initially non-scrollable with permanently disabled arrows (`minmax(0, 160px)`
  let the cards shrink to fit; now a fixed track, §3.7), and the Films featured YouTube player
  showed its title bar, logo and pause overlay (fixed with `pointer-events: none`, §3.3).

### 2026-09-09 — Shared change log added

- **Section affected:** Project documentation (no runtime code touched).
- **What changed:** Created this `EDIT_LOG.md`. Audited `index.html`, `src/main.js`,
  `src/styles.css`, `src/analytics.js`, the Pages workflow, and the full git history, then recorded
  the current video showcase implementation, the video-ID → section mapping, the layout and
  interaction rules per surface, and the deliberate decisions listed in §3.
- **Videos:** none changed. Registry documented as-is.
- **Layout/interaction:** unchanged.
- **Implementation notes:** No `AGENTS.md`, `CLAUDE.md`, or prior change log existed — only
  `README.md`. Rather than create a competing document, `README.md` was kept as the short
  human-facing quick start and given a pointer to this file; `EDIT_LOG.md` is the single source of
  truth for implementation state and history.
- **Superseded by:** the entry above, which replaced the layout this session documented.
- **Fixed / reverted:** Corrected three statements in `README.md` that no longer matched the code and
  would have misled the next reader: it claimed the video links were still placeholders, described
  deployment as Vercel (the active pipeline is GitHub Pages), and documented only Vimeo. Added the
  `file://` embed-testing caveat and the duplicated-video-ID warning. No runtime code was touched.

### 2026-09-09 — `1bf29f0` "Update portfolio" — Brand & Commercial showcase rebuilt

The largest video-showcase change to date. `index.html` +60, `src/main.js` +87, `src/styles.css` +203.

- **Section affected:** Brand & Commercial (`.work-category--commercial`).
- **What changed:** Replaced the plain commercial carousel with a two-column showcase — one large
  featured player plus a compact "More" rail of the remaining commercial cards.
- **Videos:** Vimeo `1195101228` (`commercial-03`, "Commercial Reel 3") promoted to featured;
  Vimeo `1191103532` and `1180459302` remain in the rail.
- **Layout/interaction:**
  - `.commercial-showcase` grid `minmax(0,1.42fr) / minmax(220px,0.78fr)`, max width `1000px`,
    collapsing to a single column at 900px.
  - Featured 16:9 player autoplays muted, looping, via a `background=1` Vimeo embed.
  - New pill-shaped audio toggle (`.commercial-audio-toggle`), bottom-right, blurred backdrop,
    amber when active, `aria-pressed` maintained.
  - New `data-exclude` attribute on `[data-category]` containers so the featured clip is not
    repeated in the rail.
  - Rail arrows disable at each end (`updateArrowState` on scroll + `ResizeObserver`).
- **Implementation notes:** The rail's finite behaviour and the src-reload unmute were both marked
  with in-code comments — see §3.1 and §3.2.

### 2026-07-05 — `53e943d` + `b1ae80e` — GitHub Pages deployment

- **Section affected:** Build/deploy.
- **What changed:** Added `.github/workflows/deploy-pages.yml` (Node 22, `npm ci`, `npm run build`,
  `upload-pages-artifact` on `dist`, `deploy-pages`) and `vite.config.js` with
  `base: "/toby-portfolio/"`. Site moved from a Vercel-style static host to GitHub Pages.
- **Videos:** none.
- **Implementation notes:** Concurrency group `pages`, `cancel-in-progress: false`.

### 2026-07-05 — `34ce287` — GA4 analytics

- **Section affected:** Analytics.
- **What changed:** Added `src/analytics.js` (GA4 `G-ZWM4MR7ZGT`), initialised at the top of
  `main.js`. Configured with `send_page_view: false` and a manual `trackPageView()`, plus
  monkey-patched `history.pushState`/`replaceState` and `popstate`/`hashchange` listeners so
  in-page hash navigation registers as page views.
- **Videos:** none. **Note:** video opens are *not* currently tracked as GA events.

### 2026-06-29 — `7913e26` — Person schema for SEO

- **Section affected:** `<head>` of `index.html`.
- **What changed:** Added a `schema.org/Person` JSON-LD block (job titles, `knowsAbout`,
  Instagram/LinkedIn `sameAs`, canonical URL `https://toby412.github.io/toby-portfolio/`).

### 2026-06-22 — `5575af2` — Contact form success state

- **Section affected:** Contact.
- **What changed:** Replaced the plain status-text confirmation with an animated in-panel success
  state (`is-success`, personalised "Thanks, <name>.", auto-reset after 5s). Submit button now
  swaps its label to "Sending...".
- **Fixed / reverted:** **Removed** the `company` and `project_type` fields added days earlier —
  a deliberate simplification, see §3.7.

### 2026-06-22 — `428a3ed` — EmailJS contact form

- **Section affected:** Contact.
- **What changed:** Replaced the `mailto:` handoff with an async EmailJS `send()` to
  `service_portfolio` / `template_pm58y13`, with `reportValidity()` gating, a disabled/`aria-busy`
  submit state, and an error fallback message.

### 2026-06-22 — `b56eb7c` … `022a913` — Google Search Console verification

- **Section affected:** Static assets.
- **What changed:** Verification file added at repo root, deleted, then re-added under `public/`
  so Vite copies it to the build root. **The `public/` location is the correct one** — a root-level
  copy does not survive `npm run build`.

### 2026-06-22 — `7b8b30c` — Third documentary added

- **Section affected:** Films & Documentary.
- **Videos:** added `documentary-03` "Film 03" — YouTube `ivhIMTe7Mu8`.
- **Implementation notes:** Registry-only change; the carousel picked it up automatically.

### 2026-06-22 — `49553d2` — Design & interaction polish

- **Sections affected:** Modal, hero, About, navigation, stats.
- **What changed:**
  - Modal gained the `is-opening` / `is-visible` / `is-closing` animation states and a `320ms`
    delayed teardown before `player.innerHTML = ""`.
  - **Esc handling moved from `document.keydown` to the dialog `cancel` event** — see §3.5.
  - Hero parallax strengthened from ±8/±6px to ±18/±14px.
  - About/workflow given their own `IntersectionObserver` (threshold `0.35`, `-25%` bottom margin).
  - Scroll-spy nav (`aria-current`) and staggered stat counters (150ms per item) added.
  - Added `favicon.svg`.

### 2026-06-21 — `ce62b7b` — Initial portfolio

- One-page site: hero, About + workflow, three work categories, contact, footer.
- Video showcase established here: the `projects` registry, `data-category` population,
  Vimeo oEmbed thumbnails, the 3×-clone infinite carousel, and the `<dialog>` modal player.
- YouTube support (ID parsing, `youtube-nocookie` embeds, `i.ytimg.com` thumbnails with fallback,
  and the `file://` origin warning) was part of this same foundation.

---

## 6. Entry Template

Copy this block to the top of §5 when you finish a change.

```markdown
### YYYY-MM-DD — <short title> (<commit hash, if known>)

- **Section affected:** <Hero / Brand & Commercial / Shorts & Reels / Films & Documentary / Modal / Contact / Build>
- **What changed:** <what a reader needs to know, not a diff restatement>
- **Videos:** <Vimeo/YouTube IDs added, removed, or swapped — or "none">
- **Layout/interaction:** <grid, aspect ratio, scroll/loop behaviour, controls, breakpoints>
- **Implementation notes:** <constraints, trade-offs, anything non-obvious>
- **Fixed / reverted:** <intentional fixes or reverts — also add to §3 if it must not be undone>
```

### Rules for updating this file

1. Add new entries at the **top** of §5. Never rewrite history entries.
2. If a decision must survive future sessions, also add it to **§3 Deliberate Decisions** with the reason.
3. If you change a video, update the **§2.1 registry table** too — and check whether the ID is one of
   the two duplicated in `index.html`.
4. If you resolve something in **§4 Open Items**, remove it there and log it in §5.
5. Keep §2 describing the *current* state. §5 is the only append-only section.
