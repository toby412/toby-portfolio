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
| **Contact form** | EmailJS (`service_portfolio` / `template_pm58y13`, public key in `index.html`) |

### File map

| File | Role |
|---|---|
| `index.html` | All page markup, SEO meta + Person JSON-LD, the `<dialog>` video modal, EmailJS bootstrap |
| `src/main.js` | **Video showcase system**: project registry, thumbnails, carousels, modal player, hero, stats, contact form |
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

All clips are declared in one array — `projects` at the top of [src/main.js](src/main.js#L5).
Nothing else hardcodes a video URL **except** the two background embeds noted below.

| `id` | Title | `category` | Provider | Video | Where it appears |
|---|---|---|---|---|---|
| `showreel` | Toby Yu Showreel | Showreel | Vimeo | `1165378554` | Hero background + hero click-to-play |
| `commercial-03` | Commercial Reel 3 | Commercial | Vimeo | `1195101228` | **Featured** — Brand & Commercial |
| `commercial-02` | Commercial Reel 2 | Commercial | Vimeo | `1191103532` | Brand & Commercial rail |
| `commercial-01` | Commercial Reel | Commercial | Vimeo | `1180459302` | Brand & Commercial rail |
| `short-02` | Reel 02 | Shorts & Reels | Vimeo | `1165590282` | **Featured** — Shorts & Reels |
| `short-01` | Reel 01 | Shorts & Reels | Vimeo | `1165586227` | Shorts & Reels rail |
| `short-03` | Reel 03 | Shorts & Reels | Vimeo | `1167277734` | Shorts & Reels rail |
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

### 2.2 How sections are populated

All three work categories render the **same component**, `.video-showcase`: one ambient featured
player plus a finite rail of that category's remaining videos.

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
- `data-category` / `data-exclude` — JS fills the rail with that category minus the featured clip.

**To add a video:** append an object to `projects` with a matching `category`; it appears in that
section's rail automatically. **To change a featured video:** point `data-feature` at another id in
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

**All three work showcases — `.video-showcase`**
- Two-column grid, `1.42fr / 0.78fr`, capped at `1000px`, gap `clamp(18px, 2.6vw, 34px)`.
- **Featured player:** autoplays muted, loops forever, no player chrome, `pointer-events: none`.
  Its only control is the audio toggle pinned bottom-right.
- **Rail:** the category's remaining videos as click-to-play cards, horizontally scrollable,
  with prev/next arrows that disable at each end and a "More →" label above.
- Aspect ratios come from two custom properties, `--feature-ratio` and `--card-ratio`, so a
  category changes shape without forking the component.

| Showcase | Feature | Ratios | Alignment |
|---|---|---|---|
| Brand & Commercial | Vimeo `commercial-03` | 16:9 feature, 16:9 cards | left-oriented, centred in the shell |
| Shorts & Reels | Vimeo `short-02` | **9:16** feature, **9:16** cards | **right-anchored** (see below) |
| Films & Documentary | YouTube `documentary-01` | 16:9 feature, 16:9 cards | left-oriented, centred in the shell |

**Shorts & Reels right-alignment** (`.video-showcase--shorts`)
- The block is narrower (`min(700px, 100%)`) and pushed to the shell's right edge with
  `margin-left: auto`; the heading matches (`.category-heading--right`).
- The columns are swapped via `grid-column`, so the featured reel sits on the far right and the
  rail to its left — a genuinely right-oriented composition rather than the same layout nudged over.
- **Not mirrored:** the "More →" arrow still points right and the prev/next arrows keep their
  conventional directions. Mirroring those made the section read as broken rather than intentional.
- Below 580px the mirror is dropped: columns fall back to document order (feature first) and the
  heading returns to left-aligned, because a right-anchored composition has no room to read at that
  width.

**Modal player — `<dialog class="video-modal">`**
- Opened by *any* click on `[data-video]` (one delegated listener), keyed by project `id`.
  Rail cards open it; featured players do not — they are ambient.
- Native `<dialog>.showModal()`, animated via `is-opening` → `is-visible` → `is-closing`.
- Close = X button, backdrop click, or Esc (through the dialog's **`cancel` event**).
- Close waits `320ms`, then sets `player.innerHTML = ""`. **That teardown is what stops playback.**

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

2. **The audio toggle reloads the iframe `src` instead of using a player SDK.**
   Both providers autoplay and loop reliably from URL parameters alone. Rebuilding the src with the
   mute flag flipped preserves that path at the cost of restarting the clip. Loading the Vimeo
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

5. **Featured players are not click-to-open.**
   Only rail cards carry `data-video`. The featured player is ambient by design; adding a modal
   trigger to it would also conflict with the audio toggle sitting on top of it.

6. **Shorts & Reels is mirrored, but its arrows are not.**
   See §2.4. The "More →" and prev/next arrows deliberately keep their normal direction.

7. **`.video-showcase--shorts .showcase-secondary` uses a fixed track, not `minmax(0, …)`.**
   With only two cards, a `minmax(0, …)` track lets them shrink to fit the rail, which leaves the
   rail non-scrollable and both arrows permanently disabled — inconsistent with the other two
   sections. A fixed track forces the overflow that keeps the arrows live. Verified at 1440 / 1200 /
   1000 / 860 / 700 / 520 / 390px.

8. **Esc is handled via the dialog `cancel` event, not `document.keydown`.**
   Changed in `49553d2`. The global listener bypassed the close animation and left the iframe
   mounted, so audio kept playing. Do not revert to a keydown handler.

9. **Contact form uses EmailJS, not `mailto:`.**
   The original `mailto:` handoff (`ce62b7b`) was replaced in `428a3ed` because it depended on a
   configured desktop mail client. `company` and `project_type` were added and then **intentionally
   removed** in `5575af2`; the EmailJS template expects only `from_name`, `from_email`, `budget`,
   `message`.

10. **`vite.config.js` `base: "/toby-portfolio/"` must stay** while the site is served from GitHub
    Pages under that subpath. Removing it breaks every asset URL in production.

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
- **YouTube debug instrumentation still ships to production.** `logEnvironmentDebug()`,
  `logYouTubeDebug()` and the `youtubeDebugProject` / `window.testYouTubeEmbed()` helper in
  [src/main.js](src/main.js#L88) run on every page load and print console groups. Harmless but
  noisy; left in place because it is the documented debug entry point for the YouTube path.
- **Vimeo thumbnails depend on a live oEmbed fetch** with no placeholder state, so cards can flash
  empty on a slow network. Rail thumbnails are `loading="lazy"`, so they only fetch once scrolled
  into view — expected, not a bug.
- **`.vercelignore` remains** from the original Vercel-oriented setup though the active pipeline is
  GitHub Pages. Harmless.

## 5. Change History

Newest first. Dates are the commit/authoring date.

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
