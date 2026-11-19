import { initializeAnalytics } from "./analytics.js";
// Video registry. Edit it with editor.html (open it in Chrome/Edge) or by hand.
// Fields: id, title, category, meta, video, tone, client, role, year, tools, concept.
import projects from "./projects.json";

initializeAnalytics();

const modal = document.querySelector(".video-modal");
const player = document.querySelector("[data-player]");
const modalAudioToggle = document.querySelector("[data-modal-audio]");
const videoInfo = document.querySelector("[data-video-info]");
const videoInfoTitle = videoInfo.querySelector("[data-info-title]");
const videoInfoMeta = videoInfo.querySelector("[data-info-meta]");
const videoInfoTools = videoInfo.querySelector("[data-info-tools]");
const videoInfoConcept = videoInfo.querySelector("[data-info-concept]");
const videoInfoCta = videoInfo.querySelector("[data-info-cta]");
const hero = document.querySelector(".hero");
const heroMedia = document.querySelector(".hero-media");
const heroPlayCursor = document.querySelector(".hero-play-cursor");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const thumbnailCache = new Map();

if (window.location.protocol === "file:") {
  console.warn(
    "YouTube embeds may fail when index.html is opened through file:// because the page has no valid web origin. Test through a local server or deployed URL instead."
  );
}

function getVimeoVideoId(videoUrl) {
  return videoUrl.match(/vimeo\.com\/(?:video\/)?(\d+)/)?.[1];
}

function getYouTubeVideoId(videoUrl) {
  try {
    const url = new URL(videoUrl);
    if (url.hostname === "youtu.be") return url.pathname.slice(1).split("/")[0];
    return url.searchParams.get("v") ?? url.pathname.match(/\/(?:embed|shorts)\/([^/?]+)/)?.[1];
  } catch {
    return null;
  }
}

function getVideoProvider(videoUrl) {
  return getYouTubeVideoId(videoUrl) ? "youtube" : "vimeo";
}

function getVimeoThumbnail(videoUrl) {
  const videoId = getVimeoVideoId(videoUrl);
  if (!videoId) return Promise.reject(new Error("Invalid Vimeo video URL"));
  if (thumbnailCache.has(videoId)) return thumbnailCache.get(videoId);

  const vimeoPageUrl = `https://vimeo.com/${videoId}`;
  const oEmbedUrl = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(vimeoPageUrl)}&width=1280`;
  const thumbnailRequest = fetch(oEmbedUrl)
    .then((response) => {
      if (!response.ok) throw new Error(`Vimeo oEmbed request failed: ${response.status}`);
      return response.json();
    })
    .then((data) => {
      if (!data.thumbnail_url) throw new Error("Vimeo thumbnail is unavailable");
      return data.thumbnail_url;
    });

  thumbnailCache.set(videoId, thumbnailRequest);
  return thumbnailRequest;
}

function getProjectThumbnail(videoUrl) {
  if (getVideoProvider(videoUrl) === "youtube") {
    const videoId = getYouTubeVideoId(videoUrl);
    return Promise.resolve({
      url: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
      fallback: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    });
  }

  return getVimeoThumbnail(videoUrl).then((url) => ({ url }));
}

function getVideoEmbedUrl(videoUrl) {
  if (getVideoProvider(videoUrl) === "youtube") {
    const videoId = getYouTubeVideoId(videoUrl);
    const parameters = new URLSearchParams({
      autoplay: "1",
      playsinline: "1",
      rel: "0",
    });
    const pageOrigin = window.location.origin;
    if (pageOrigin && pageOrigin !== "null") parameters.set("origin", pageOrigin);
    return `https://www.youtube-nocookie.com/embed/${videoId}?${parameters.toString()}`;
  }

  const videoId = getVimeoVideoId(videoUrl);
  return `https://player.vimeo.com/video/${videoId}?autoplay=1&title=0&byline=0&portrait=0`;
}

// Sets a project's thumbnail on an <img>, falling back to YouTube's smaller
// image when maxresdefault does not exist; calls onFail if none can be found.
function applyThumbnail(image, project, onFail) {
  getProjectThumbnail(project.video)
    .then(({ url, fallback }) => {
      if (fallback) {
        image.addEventListener(
          "error",
          () => {
            image.src = fallback;
          },
          { once: true }
        );
      }
      image.src = url;
    })
    .catch(onFail);
}

function projectCard(project) {
  const button = document.createElement("button");
  button.className = `project-card tone-${project.tone}`;
  button.type = "button";
  button.dataset.video = project.id;
  button.setAttribute("aria-label", `Play ${project.title}`);
  button.innerHTML = `
    <span class="project-visual" aria-hidden="true">
      <img class="project-thumbnail" alt="" loading="lazy" decoding="async" />
      <svg class="project-play-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 5 20 12 8 19Z"></path>
      </svg>
    </span>
  `;

  const thumbnail = button.querySelector(".project-thumbnail");
  applyThumbnail(thumbnail, project, () => thumbnail.remove());

  return button;
}

/* ---------------------------------------------------------------------------
   Unified video showcase
   Every work category renders the same component: one ambient featured player
   with an audio toggle, plus a finite click-to-play rail of the remaining
   videos. Categories differ only in markup modifiers and CSS, never here.
   --------------------------------------------------------------------------- */

// Both providers are driven the same way: an autoplaying, looping, chrome-less
// embed whose src is rebuilt to flip the mute flag. Reloading the src keeps the
// providers' own reliable autoplay path instead of layering a player SDK on top.
function getFeatureEmbedUrl(videoUrl, isMuted) {
  if (getVideoProvider(videoUrl) === "youtube") {
    const videoId = getYouTubeVideoId(videoUrl);
    const parameters = new URLSearchParams({
      autoplay: "1",
      mute: isMuted ? "1" : "0",
      // YouTube only loops a single video when it is its own one-item playlist.
      loop: "1",
      playlist: videoId,
      controls: "0",
      disablekb: "1",
      modestbranding: "1",
      iv_load_policy: "3",
      playsinline: "1",
      rel: "0",
      // Lets setPlayerMuted() unmute the live player when it is expanded.
      enablejsapi: "1",
    });
    const pageOrigin = window.location.origin;
    if (pageOrigin && pageOrigin !== "null") parameters.set("origin", pageOrigin);
    return `https://www.youtube-nocookie.com/embed/${videoId}?${parameters.toString()}`;
  }

  const videoId = getVimeoVideoId(videoUrl);
  const parameters = new URLSearchParams({
    background: "1",
    autoplay: "1",
    loop: "1",
    muted: isMuted ? "1" : "0",
    autopause: "0",
    playsinline: "1",
    quality: "1080p",
    title: "0",
    byline: "0",
    portrait: "0",
  });
  return `https://player.vimeo.com/video/${videoId}?${parameters.toString()}`;
}

/* ---------------------------------------------------------------------------
   Ambient players load only near the viewport
   The featured players and every Short autoplay and loop, but only while they
   are on (or about to come on) screen. Off screen, the iframe is removed, which
   stops playback and network use; a thumbnail poster covers the gap while the
   next iframe loads. The iframe is replaced, never re-pointed: changing an
   iframe's src adds a browser-history entry, so scrolling would otherwise break
   the Back button. Leaving the screen also turns that player's audio back off.
   --------------------------------------------------------------------------- */

const ambientPlayers = new Map(); // container element -> project
const posterTimers = new WeakMap();
// Time from the iframe's load event to the provider actually painting frames.
const POSTER_FADE_DELAY = 700;

function createAmbientFrame(project, isMuted) {
  const isYouTube = getVideoProvider(project.video) === "youtube";
  const frame = document.createElement("iframe");
  frame.title = project.title;
  frame.allow = isYouTube
    ? "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    : "autoplay; encrypted-media; fullscreen; picture-in-picture";
  if (isYouTube) frame.referrerPolicy = "strict-origin-when-cross-origin";
  frame.setAttribute("allowfullscreen", "");
  frame.setAttribute("tabindex", "-1");
  // Vimeo background embeds are muted, inline, autoplaying and looping;
  // autopause=0 lets several of them play at once.
  frame.src = getFeatureEmbedUrl(project.video, isMuted);
  return frame;
}

// Mutes or unmutes a running embed in place through the providers' own
// postMessage interfaces (no SDK), so the clip keeps playing without a reload.
function setPlayerMuted(frame, project, isMuted) {
  const target = frame.contentWindow;
  if (!target) return;
  if (getVideoProvider(project.video) === "youtube") {
    const send = (func, args = []) =>
      target.postMessage(
        JSON.stringify({ event: "command", func, args }),
        "https://www.youtube-nocookie.com"
      );
    if (isMuted) {
      send("mute");
    } else {
      send("unMute");
      send("setVolume", [100]);
    }
    return;
  }
  const send = (method, value) =>
    target.postMessage(JSON.stringify({ method, value }), "https://player.vimeo.com");
  send("setMuted", isMuted);
  send("setVolume", isMuted ? 0 : 1);
}

// Element.moveBefore() moves an iframe without reloading it (Chrome/Edge 133+).
// Elsewhere the modal falls back to building a fresh player.
const canMoveLivePlayer = typeof Element.prototype.moveBefore === "function";

function loadAmbientPlayer(element) {
  if (element.querySelector("iframe")) return;
  const project = ambientPlayers.get(element);
  const frame = createAmbientFrame(project, element.dataset.muted !== "false");
  frame.addEventListener("load", () => {
    window.clearTimeout(posterTimers.get(element));
    posterTimers.set(
      element,
      window.setTimeout(() => element.classList.add("is-playing"), POSTER_FADE_DELAY)
    );
  });
  element.prepend(frame);
}

function unloadAmbientPlayer(element) {
  window.clearTimeout(posterTimers.get(element));
  element.classList.remove("is-playing");
  element.querySelector("iframe")?.remove();
  if (element.dataset.muted === "false") {
    element.dataset.muted = "true";
    const toggle = element.querySelector(".feature-audio-toggle");
    if (toggle) updateAudioToggle(toggle, ambientPlayers.get(element), true);
  }
}

const ambientObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach(({ target, isIntersecting }) => {
      // While the modal is open the page is scroll-locked; the expanded video
      // owns playback and closeVideo() restores its source player.
      if (modal.open) return;
      if (isIntersecting) loadAmbientPlayer(target);
      else unloadAmbientPlayer(target);
    });
  },
  // Start loading a little before a player scrolls into view.
  { rootMargin: "250px 0px" }
);

function registerAmbientPlayer(element, project) {
  ambientPlayers.set(element, project);
  element.classList.add("ambient-player");
  element.dataset.muted = "true";

  const poster = document.createElement("img");
  poster.className = "ambient-poster";
  poster.alt = "";
  poster.decoding = "async";
  poster.setAttribute("aria-hidden", "true");
  applyThumbnail(poster, project, () => poster.remove());
  element.prepend(poster);

  ambientObserver.observe(element);
}

function initializeFeature(featureElement) {
  const project = projects.find((item) => item.id === featureElement.dataset.feature);
  if (!project) return;

  registerAmbientPlayer(featureElement, project);

  const expandTrigger = document.createElement("button");
  expandTrigger.className = "video-expand-trigger";
  expandTrigger.type = "button";
  expandTrigger.setAttribute("aria-label", `Expand ${project.title}`);
  expandTrigger.addEventListener("click", () => openLoopingVideo(project, featureElement));
  featureElement.append(expandTrigger);

  const toggle = featureElement.querySelector(".feature-audio-toggle");
  if (!toggle) return;
  toggle.addEventListener("click", () => {
    const isMuted = featureElement.dataset.muted !== "false";
    updateAmbientVideoSource(featureElement, project, !isMuted);
  });
}

document.querySelectorAll(".showcase-feature").forEach(initializeFeature);

// The hero is an ambient player too: thumbnail poster while it loads, and the
// same live-iframe hand-off into the modal when it is clicked (openShowreel).
const showreelProject = projects.find((project) => project.id === "showreel");
if (showreelProject) registerAmbientPlayer(heroMedia, showreelProject);

function shortVideoCard(project) {
  const card = document.createElement("div");
  card.className = `project-card short-video-card tone-${project.tone}`;

  const controls = document.createElement("div");
  controls.className = "showcase-feature-controls";
  const toggle = document.createElement("button");
  toggle.className = "feature-audio-toggle";
  toggle.type = "button";
  toggle.setAttribute("aria-pressed", "false");
  toggle.setAttribute("aria-label", `Turn ${project.title} audio on`);
  toggle.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 10v4h4l5 4V6l-5 4H4Z"></path>
      <path class="icon-muted" d="m17 9 4 6M21 9l-4 6"></path>
      <path class="icon-waves" d="M16.5 8.5a5 5 0 0 1 0 7M19.5 6a8.5 8.5 0 0 1 0 12"></path>
    </svg>
  `;

  toggle.addEventListener("click", () => {
    const isMuted = card.dataset.muted !== "false";
    updateAmbientVideoSource(card, project, !isMuted);
  });

  const expandTrigger = document.createElement("button");
  expandTrigger.className = "video-expand-trigger";
  expandTrigger.type = "button";
  expandTrigger.setAttribute("aria-label", `Expand ${project.title}`);
  expandTrigger.addEventListener("click", () => openLoopingVideo(project, card));
  controls.append(toggle);
  card.append(expandTrigger, controls);
  registerAmbientPlayer(card, project);

  return card;
}

const shortProjectOrder = ["short-01", "short-04", "short-02", "short-03", "short-05"];

document.querySelectorAll(".shorts-video-list").forEach((list) => {
  shortProjectOrder
    .map((projectId) => projects.find((project) => project.id === projectId))
    .filter(Boolean)
    .forEach((project) => list.append(shortVideoCard(project)));
});

// Desktop only (matches the min-width: 581px CSS block): vertical mouse-wheel
// movement scrolls the Shorts row sideways. The row is row-reverse, so the
// first Short sits on the right and wheeling down moves left toward later
// Shorts. At either end the wheel falls through to normal page scrolling.
// Phones keep their native touch rail; this handler never runs there.
const desktopShorts = window.matchMedia("(min-width: 581px)");

document.querySelectorAll(".shorts-video-list").forEach((list) => {
  list.addEventListener(
    "wheel",
    (event) => {
      if (!desktopShorts.matches) return;
      if (event.ctrlKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
      const maxScroll = list.scrollWidth - list.clientWidth;
      if (maxScroll <= 1) return;

      const unit =
        event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? list.clientWidth : 1;
      const delta = -event.deltaY * unit;
      // row-reverse overflow: scrollLeft runs from 0 (right end) to -maxScroll.
      const position = list.scrollLeft;
      const atStart = position >= -1 && delta > 0;
      const atEnd = position <= -maxScroll + 1 && delta < 0;
      if (atStart || atEnd) return;

      event.preventDefault();
      list.scrollLeft = Math.max(-maxScroll, Math.min(0, position + delta));
    },
    { passive: false }
  );
});

// The rails are deliberately finite click-to-play strips rather than looping
// carousels: each holds only the two videos left over after the featured one,
// a count at which a cloned infinite loop reads as broken.
document.querySelectorAll(".showcase-secondary").forEach((rail) => {
  const excludedProjectId = rail.dataset.exclude;
  projects
    .filter(
      (project) =>
        project.category === rail.dataset.category && project.id !== excludedProjectId
    )
    .forEach((project) => rail.append(projectCard(project)));
});

document.querySelectorAll(".showcase-secondary-shell").forEach((shell) => {
  const rail = shell.querySelector(".showcase-secondary");
  const previousButton = shell.querySelector(".carousel-arrow--previous");
  const nextButton = shell.querySelector(".carousel-arrow--next");

  function updateArrowState() {
    previousButton.disabled = rail.scrollLeft <= 1;
    nextButton.disabled = rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 1;
  }

  function scrollRail(direction) {
    const card = rail.querySelector(".project-card");
    const gap = parseFloat(getComputedStyle(rail).columnGap) || 0;
    const distance = (card?.getBoundingClientRect().width || rail.clientWidth) + gap;
    rail.scrollBy({
      left: direction * distance,
      behavior: reducedMotion.matches ? "auto" : "smooth",
    });
  }

  previousButton.addEventListener("click", () => scrollRail(-1));
  nextButton.addEventListener("click", () => scrollRail(1));
  rail.addEventListener("scroll", updateArrowState, { passive: true });
  new ResizeObserver(updateArrowState).observe(rail);
  requestAnimationFrame(updateArrowState);
});

let activeLoopingVideo = null;

function updateAudioToggle(toggle, project, isMuted) {
  toggle.setAttribute("aria-pressed", String(!isMuted));
  toggle.setAttribute(
    "aria-label",
    `Turn ${project.title} audio ${isMuted ? "on" : "off"}`
  );
  toggle.classList.toggle("is-audio-on", !isMuted);
}

// Flipping audio rebuilds the player with the new mute flag (see EDIT_LOG §3.2).
// A player that is scrolled away has no iframe; it just picks up the new state
// when it next loads.
function updateAmbientVideoSource(sourceElement, project, isMuted) {
  const wasMuted = sourceElement.dataset.muted !== "false";
  sourceElement.dataset.muted = String(isMuted);
  const toggle = sourceElement.querySelector(".feature-audio-toggle"); // the hero has none
  if (toggle) updateAudioToggle(toggle, project, isMuted);
  if (wasMuted === isMuted || !sourceElement.querySelector("iframe")) return;

  window.clearTimeout(posterTimers.get(sourceElement));
  sourceElement.classList.remove("is-playing");
  sourceElement.querySelector("iframe").remove();
  loadAmbientPlayer(sourceElement);
}

function updateModalAudio(project, isMuted) {
  const movedFrame = activeLoopingVideo?.movedFrame;
  if (movedFrame) {
    setPlayerMuted(movedFrame, project, isMuted);
  } else if (player.querySelector("iframe")) {
    const frame = createAmbientFrame(project, isMuted);
    frame.removeAttribute("tabindex");
    player.replaceChildren(frame);
  }
  updateAudioToggle(modalAudioToggle, project, isMuted);
}

// Expanding a looping player opens it with sound on. When the browser supports
// it and the player is already running, the live iframe itself is moved into
// the modal, so there is no reload; closeVideo() moves it back and restores the
// card's own audio setting. Otherwise a fresh player is built (a short load).
function openLoopingVideo(project, sourceElement) {
  const sourceMuted = sourceElement.dataset.muted !== "false";
  const liveFrame = sourceElement.querySelector("iframe");
  const canMove =
    canMoveLivePlayer && liveFrame && sourceElement.classList.contains("is-playing");

  activeLoopingVideo = {
    project,
    sourceElement,
    sourceMuted,
    isMuted: false,
    movedFrame: canMove ? liveFrame : null,
  };

  if (canMove) {
    window.clearTimeout(posterTimers.get(sourceElement));
    sourceElement.classList.remove("is-playing"); // poster fills the card meanwhile
    openVideo(project.id, { looping: true, isMuted: false, liveFrame });
    setPlayerMuted(liveFrame, project, false);
    return;
  }

  // Fallback: keep one audible instance only. The card is restored after the
  // modal iframe is removed, so closing never leaves overlapping audio behind.
  if (!sourceMuted) updateAmbientVideoSource(sourceElement, project, true);
  openVideo(project.id, { looping: true, isMuted: false });
}

// Fills the modal's project panel. Every value goes in through textContent, so
// anything typed in projects.json renders as plain text. The panel appears only
// when there is something beyond the title to say; otherwise the modal looks
// exactly as it did before the panel existed.
function fillVideoInfo(project) {
  const clean = (value) => String(value ?? "").trim();
  const metaParts = [project.client, project.role, project.year].map(clean).filter(Boolean);
  const tools = clean(project.tools);
  const concept = clean(project.concept);
  const hasInfo = metaParts.length > 0 || tools !== "" || concept !== "";

  videoInfoTitle.textContent = hasInfo ? clean(project.title) : "";
  videoInfoMeta.textContent = metaParts.join(" · ");
  videoInfoMeta.hidden = metaParts.length === 0;
  videoInfoTools.textContent = tools;
  videoInfoTools.hidden = tools === "";
  videoInfoConcept.textContent = concept;
  videoInfoConcept.hidden = concept === "";
  videoInfo.hidden = !hasInfo;
  videoInfo.querySelector(".video-info-body").scrollTop = 0;
  modal.classList.toggle("has-info", hasInfo);
}

function clearVideoInfo() {
  videoInfo.hidden = true;
  modal.classList.remove("has-info");
  [videoInfoTitle, videoInfoMeta, videoInfoTools, videoInfoConcept].forEach((element) => {
    element.textContent = "";
  });
}

function openVideo(projectId, options = {}) {
  const { looping = false, isMuted = true, liveFrame = null } = options;
  const project = projects.find((item) => item.id === projectId) ?? projects[0];

  if (liveFrame) {
    player.replaceChildren();
    player.moveBefore(liveFrame, null);
  } else {
    const isYouTube = getVideoProvider(project.video) === "youtube";
    const embedUrl = looping
      ? getFeatureEmbedUrl(project.video, isMuted)
      : getVideoEmbedUrl(project.video);
    // Built with DOM APIs, not an HTML string: titles are editable content now,
    // and a quote in one must not break the iframe markup.
    const frame = document.createElement("iframe");
    frame.title = project.title;
    frame.src = embedUrl;
    frame.allow = isYouTube
      ? "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      : "autoplay; encrypted-media; fullscreen; picture-in-picture";
    if (isYouTube) frame.referrerPolicy = "strict-origin-when-cross-origin";
    frame.setAttribute("allowfullscreen", "");
    player.replaceChildren(frame);
  }
  modal.classList.toggle("is-portrait", project.category === "Shorts & Reels");
  fillVideoInfo(project);
  modalAudioToggle.hidden = !looping;
  if (looping) updateAudioToggle(modalAudioToggle, project, isMuted);
  modal.classList.remove("is-visible", "is-closing");
  modal.classList.add("is-opening");
  modal.showModal();
  document.body.classList.add("modal-open");

  if (reducedMotion.matches) {
    modal.classList.add("is-visible");
    modal.classList.remove("is-opening");
    return;
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (!modal.open || modal.classList.contains("is-closing")) return;
      modal.classList.add("is-visible");
      modal.classList.remove("is-opening");
    });
  });
}

modalAudioToggle.addEventListener("click", () => {
  if (!activeLoopingVideo) return;
  activeLoopingVideo.isMuted = !activeLoopingVideo.isMuted;
  updateModalAudio(activeLoopingVideo.project, activeLoopingVideo.isMuted);
});

const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
let cursorTargetX = 0;
let cursorTargetY = 0;
let cursorCurrentX = 0;
let cursorCurrentY = 0;
let cursorFrame = null;

function renderPlayCursor() {
  const ease = reducedMotion.matches ? 1 : 0.16;
  cursorCurrentX += (cursorTargetX - cursorCurrentX) * ease;
  cursorCurrentY += (cursorTargetY - cursorCurrentY) * ease;
  heroPlayCursor.style.transform = `translate3d(${cursorCurrentX}px, ${cursorCurrentY}px, 0)`;

  const movingX = Math.abs(cursorTargetX - cursorCurrentX) > 0.1;
  const movingY = Math.abs(cursorTargetY - cursorCurrentY) > 0.1;
  cursorFrame = movingX || movingY ? requestAnimationFrame(renderPlayCursor) : null;
}

function queuePlayCursorFrame() {
  if (cursorFrame === null) cursorFrame = requestAnimationFrame(renderPlayCursor);
}

hero.addEventListener("pointerenter", (event) => {
  if (!finePointer.matches) return;
  cursorTargetX = event.clientX;
  cursorTargetY = event.clientY;
  cursorCurrentX = event.clientX;
  cursorCurrentY = event.clientY;
  heroPlayCursor.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
  hero.classList.add("is-play-cursor-visible");
});

hero.addEventListener("pointermove", (event) => {
  if (!finePointer.matches) return;
  cursorTargetX = event.clientX;
  cursorTargetY = event.clientY;
  queuePlayCursorFrame();
});

hero.addEventListener("pointerleave", () => {
  hero.classList.remove("is-play-cursor-visible");
});

let parallaxTargetX = 0;
let parallaxTargetY = 0;
let parallaxCurrentX = 0;
let parallaxCurrentY = 0;
let parallaxFrame = null;

function renderHeroParallax() {
  if (!finePointer.matches || reducedMotion.matches) {
    parallaxFrame = null;
    return;
  }

  parallaxCurrentX += (parallaxTargetX - parallaxCurrentX) * 0.07;
  parallaxCurrentY += (parallaxTargetY - parallaxCurrentY) * 0.07;
  heroMedia.style.setProperty("--hero-parallax-x", `${parallaxCurrentX}px`);
  heroMedia.style.setProperty("--hero-parallax-y", `${parallaxCurrentY}px`);

  const movingX = Math.abs(parallaxTargetX - parallaxCurrentX) > 0.01;
  const movingY = Math.abs(parallaxTargetY - parallaxCurrentY) > 0.01;
  parallaxFrame = movingX || movingY ? requestAnimationFrame(renderHeroParallax) : null;
}

function queueHeroParallaxFrame() {
  if (parallaxFrame === null) parallaxFrame = requestAnimationFrame(renderHeroParallax);
}

hero.addEventListener("pointermove", (event) => {
  if (!finePointer.matches || reducedMotion.matches) return;
  const bounds = hero.getBoundingClientRect();
  const relativeX = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
  const relativeY = ((event.clientY - bounds.top) / bounds.height) * 2 - 1;
  parallaxTargetX = -relativeX * 18;
  parallaxTargetY = -relativeY * 14;
  queueHeroParallaxFrame();
});

hero.addEventListener("pointerleave", () => {
  if (!finePointer.matches || reducedMotion.matches) return;
  parallaxTargetX = 0;
  parallaxTargetY = 0;
  queueHeroParallaxFrame();
});

// Clicking the hero expands the showreel the same way as any looping player:
// instantly (the live background iframe moves into the modal) and with sound.
function openShowreel() {
  if (showreelProject) openLoopingVideo(showreelProject, heroMedia);
  else openVideo("showreel");
}

hero.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  openShowreel();
});

function closeVideo(onClosed) {
  if (!modal.open || modal.classList.contains("is-closing")) return;

  function finishClose() {
    const looping = activeLoopingVideo;
    activeLoopingVideo = null;

    // A live player borrowed from its card goes back without reloading, and the
    // card returns to its own audio setting (not the modal's).
    if (looping?.movedFrame && looping.sourceElement.isConnected) {
      const { project, sourceElement, movedFrame, sourceMuted } = looping;
      sourceElement.moveBefore(movedFrame, sourceElement.firstChild);
      setPlayerMuted(movedFrame, project, sourceMuted);
      sourceElement.classList.add("is-playing");
    }

    modal.classList.remove("is-visible", "is-opening", "is-closing");
    modal.close();
    player.innerHTML = "";
    modalAudioToggle.hidden = true;
    modal.classList.remove("is-portrait");
    clearVideoInfo();
    if (looping && !looping.movedFrame) {
      const { project, sourceElement, sourceMuted } = looping;
      updateAmbientVideoSource(sourceElement, project, sourceMuted);
    }
    document.body.classList.remove("modal-open");
    if (typeof onClosed === "function") onClosed();
  }

  if (reducedMotion.matches) {
    finishClose();
    return;
  }

  modal.classList.remove("is-visible", "is-opening");
  modal.classList.add("is-closing");
  window.setTimeout(finishClose, 320);
}

document.addEventListener("click", (event) => {
  const trigger = event.target.closest("[data-video]");
  if (!trigger) return;
  if (trigger === hero) openShowreel();
  else openVideo(trigger.dataset.video);
});

// No × button by design: the modal closes on a backdrop click or Esc only.
// "Work with me" in the project panel: close the player, bring the contact
// section into view, and open the message form if it is not already showing.
videoInfoCta.addEventListener("click", () => {
  closeVideo(() => {
    const contactSection = document.querySelector("#contact");
    contactSection.scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth" });
    if (!contactSwitcher.classList.contains("is-form")) contactToggle.click();
  });
});
modal.addEventListener("click", (event) => {
  if (event.target === modal) closeVideo();
});
modal.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeVideo();
});

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.18 }
);

document
  .querySelectorAll(".reveal:not(.about-copy):not(.workflow)")
  .forEach((element) => observer.observe(element));

const aboutRevealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      aboutRevealObserver.unobserve(entry.target);
    });
  },
  { threshold: 0.35, rootMargin: "0px 0px -25% 0px" }
);

document
  .querySelectorAll(".about-copy.reveal, .workflow.reveal")
  .forEach((element) => aboutRevealObserver.observe(element));

const navigationLinks = [...document.querySelectorAll('.site-header nav a[href^="#"]')];
const navigationSections = navigationLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);

function setActiveNavigation(sectionId) {
  navigationLinks.forEach((link) => {
    const isActive = link.getAttribute("href") === `#${sectionId}`;
    if (isActive) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

function updateActiveNavigation() {
  const viewportAnchor = window.innerHeight * 0.4;
  const activeSection = navigationSections.find((section) => {
    const bounds = section.getBoundingClientRect();
    return bounds.top <= viewportAnchor && bounds.bottom > viewportAnchor;
  });
  setActiveNavigation(activeSection?.id);
}

const navigationObserver = new IntersectionObserver(updateActiveNavigation, {
  rootMargin: "-35% 0px -55% 0px",
  threshold: 0,
});

navigationSections.forEach((section) => navigationObserver.observe(section));
navigationLinks.forEach((link) => {
  link.addEventListener("click", () => {
    setActiveNavigation(link.getAttribute("href").slice(1));
  });
});
updateActiveNavigation();

const stats = document.querySelector(".stats");
const statCounters = [...document.querySelectorAll("[data-counter]")];

function formatStatValue(element, value, isFinal = false) {
  if (element.dataset.format === "views") {
    if (isFinal) return "3M";
    if (value < 1000000) {
      const thousands = Math.min(990, Math.round(value / 10000) * 10);
      return `${thousands}K`;
    }
    return `${(value / 1000000).toFixed(1).replace(/\.0$/, "")}M`;
  }

  return `${Math.floor(value)}${element.dataset.suffix ?? ""}`;
}

function showFinalStats() {
  statCounters.forEach((element) => {
    element.textContent = formatStatValue(element, Number(element.dataset.target), true);
  });
}

function animateStats() {
  if (reducedMotion.matches) {
    showFinalStats();
    return;
  }

  const duration = 1400;
  const staggerDelay = 150;
  const startTime = performance.now();

  function updateStats(now) {
    const elapsed = now - startTime;

    statCounters.forEach((element, index) => {
      const progress = Math.min(
        Math.max((elapsed - index * staggerDelay) / duration, 0),
        1
      );
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const start = Number(element.dataset.start);
      const target = Number(element.dataset.target);
      const value = start + (target - start) * easedProgress;
      element.textContent = formatStatValue(element, value, progress === 1);
    });

    const totalDuration = duration + (statCounters.length - 1) * staggerDelay;
    if (elapsed < totalDuration) requestAnimationFrame(updateStats);
  }

  requestAnimationFrame(updateStats);
}

if (reducedMotion.matches) {
  showFinalStats();
} else {
  statCounters.forEach((element) => {
    element.textContent = formatStatValue(element, Number(element.dataset.start));
  });

  const statsObserver = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) return;
      statsObserver.unobserve(stats);
      animateStats();
    },
    { threshold: 0.45, rootMargin: "0px 0px -25% 0px" }
  );
  statsObserver.observe(stats);
}

const workflow = document.querySelector(".workflow");

if (!reducedMotion.matches) {
  workflow.classList.add("has-card-stagger");

  const workflowObserver = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) return;
      workflowObserver.unobserve(workflow);
      workflow.classList.add("is-card-staggered");

      window.setTimeout(() => {
        workflow.classList.remove("has-card-stagger", "is-card-staggered");
      }, 800);
    },
    { threshold: 0.35, rootMargin: "0px 0px -25% 0px" }
  );

  workflowObserver.observe(workflow);
}

// EmailJS public key (safe to ship: it only allows sending through the
// configured template). The SDK loads with `defer` from index.html, and in the
// production build this module can run before it, so the key is passed on each
// send instead of through emailjs.init() at startup.
const EMAILJS_PUBLIC_KEY = "PSLVaeR7Fv7l-KVyg";

const contactToggle = document.querySelector(".contact-toggle");
const contactSwitcher = document.querySelector(".contact-switcher");
const contactSocials = document.querySelector(".contact-socials");
const contactForm = document.querySelector(".contact-form");
const formStatus = document.querySelector(".form-status");
const formSubmitButton = contactForm.querySelector(".form-submit");
const formSubmitLabel = formSubmitButton.querySelector("span");
const successTitle = contactForm.querySelector("[data-success-title]");
const successCopy = contactForm.querySelector("[data-success-copy]");
let successResetTimer = null;

function sizeContactPanel() {
  const activePanel = contactSwitcher.classList.contains("is-form")
    ? contactForm
    : contactSocials;
  const panelHeight = Math.ceil(activePanel.getBoundingClientRect().height);
  contactSwitcher.style.setProperty("--contact-panel-height", `${panelHeight}px`);
}

contactToggle.addEventListener("click", () => {
  const showForm = !contactSwitcher.classList.contains("is-form");
  contactSwitcher.classList.toggle("is-form", showForm);
  contactToggle.setAttribute("aria-expanded", String(showForm));
  contactSocials.setAttribute("aria-hidden", String(showForm));
  contactForm.setAttribute("aria-hidden", String(!showForm));
  contactToggle.querySelector("span").textContent = showForm ? "Back to Socials" : "Get in Touch";
  requestAnimationFrame(sizeContactPanel);

  if (showForm) contactForm.querySelector("input").focus({ preventScroll: true });
});

contactForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!contactForm.reportValidity()) return;

  const data = new FormData(contactForm);
  const templateParams = {
    from_name: String(data.get("from_name") ?? "").trim(),
    from_email: String(data.get("from_email") ?? "").trim(),
    budget: String(data.get("budget") ?? "").trim(),
    message: String(data.get("message") ?? "").trim(),
  };

  formStatus.textContent = "Sending...";
  formSubmitLabel.textContent = "Sending...";
  formSubmitButton.disabled = true;
  formSubmitButton.setAttribute("aria-busy", "true");

  try {
    if (!window.emailjs) throw new Error("EmailJS SDK failed to load");
    await window.emailjs.send("service_portfolio", "template_pm58y13", templateParams, {
      publicKey: EMAILJS_PUBLIC_KEY,
    });
    contactForm.reset();
    formStatus.textContent = "";
    successTitle.textContent = `Thanks, ${templateParams.from_name}.`;
    successCopy.textContent = "Your message has been sent successfully.";
    contactForm.classList.add("is-success");

    window.clearTimeout(successResetTimer);
    successResetTimer = window.setTimeout(() => {
      contactForm.classList.remove("is-success");
      window.setTimeout(() => {
        successTitle.textContent = "";
        successCopy.textContent = "";
      }, 360);
    }, 5000);
  } catch (error) {
    console.error("EmailJS send failed:", error);
    formStatus.textContent = "Something went wrong. Please try again or email me directly.";
  } finally {
    formSubmitButton.disabled = false;
    formSubmitLabel.textContent = "Send Message";
    formSubmitButton.removeAttribute("aria-busy");
    requestAnimationFrame(sizeContactPanel);
  }
});

const contactPanelObserver = new ResizeObserver(() => sizeContactPanel());
contactPanelObserver.observe(contactSocials);
contactPanelObserver.observe(contactForm);

window.addEventListener("resize", () => requestAnimationFrame(sizeContactPanel));
requestAnimationFrame(sizeContactPanel);

/* ---------------------------------------------------------------------------
   VideoObject structured data (for search engines, invisible to visitors)
   Built from projects.json at load. Google requires name, description,
   thumbnailUrl and uploadDate, so only videos with a concept and a 4-digit
   year are described; others are skipped rather than published half-empty.
   --------------------------------------------------------------------------- */
(function addVideoStructuredData() {
  const describable = projects.filter(
    (project) =>
      project.id !== "showreel" &&
      String(project.concept ?? "").trim() !== "" &&
      /^\d{4}$/.test(String(project.year ?? "").trim())
  );
  if (describable.length === 0) return;

  Promise.all(
    describable.map((project) =>
      getProjectThumbnail(project.video)
        .then(({ url }) => ({
          "@type": "VideoObject",
          name: String(project.title).trim(),
          description: String(project.concept).trim(),
          thumbnailUrl: url,
          uploadDate: `${String(project.year).trim()}-01-01`,
          embedUrl: getVideoEmbedUrl(project.video).split("?")[0],
        }))
        .catch(() => null)
    )
  ).then((videos) => {
    const items = videos.filter(Boolean);
    if (items.length === 0) return;
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.textContent = JSON.stringify({ "@context": "https://schema.org", "@graph": items });
    document.head.append(script);
  });
})();
